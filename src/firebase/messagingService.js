// Servicio de notificaciones Push Web con Firebase Cloud Messaging
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { ref, set } from "firebase/database";
import { app, rtdb } from "./config";

export const VAPID_KEY = "BEvCec26N1plJlWOUS8wRAs7gHpFNq7h3mvT52H3_s70RWRnNBnXjmfejb6nlMVgCgkqdZiazMk4ikbep5UCA0Q";

let messagingInstance = null;
let foregroundUnsubscribe = null;

export async function getFideliMessaging() {
  if (typeof window === "undefined") return null;
  const supported = await isSupported().catch(() => false);
  if (!supported) return null;
  if (!messagingInstance) {
    messagingInstance = getMessaging(app);
  }
  return messagingInstance;
}

export function getWebPushPermissionState() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission; // 'granted' | 'denied' | 'default'
}

/**
 * Solicita permiso y registra el token FCM web en Realtime Database
 * @param {string} userId - ID del cliente
 * @param {function} [onMessageReceived] - Callback opcional para cuando llega un mensaje con la app en primer plano
 * @returns {Promise<{success: boolean, token?: string, error?: string}>}
 */
export async function requestFideliWebPush(userId, onMessageReceived = null) {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return { success: false, error: "Las notificaciones no están soportadas en este navegador." };
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { success: false, error: "Permiso de notificaciones denegado por el usuario." };
    }

    const messaging = await getFideliMessaging();
    if (!messaging) {
      return { success: false, error: "Firebase Messaging no es compatible con este entorno." };
    }

    // Registrar el Service Worker explícitamente si está disponible
    let registration = undefined;
    if ("serviceWorker" in navigator) {
      registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
        scope: "/",
      }).catch((err) => {
        console.warn("[FideliPush] Error registrando serviceWorker:", err);
      });
    }

    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!currentToken) {
      return { success: false, error: "No se pudo generar el token FCM web." };
    }

    console.log("🔔 [FideliPush] Token FCM Web obtenido con éxito:", currentToken);

    // Guardar en Realtime Database si hay userId
    if (userId) {
      const now = Date.now();
      await Promise.all([
        set(ref(rtdb, `fcm_tokens_web/${userId}`), {
          token: currentToken,
          updatedAt: now,
          platform: "web",
          userAgent: navigator.userAgent,
        }),
        set(ref(rtdb, `users/${userId}/fcm_token_web`), currentToken),
      ]).catch((err) => {
        console.warn("[FideliPush] Error guardando token en RTDB:", err);
      });
    }

    // Escuchar mensajes en primer plano (limpiando cualquier listener previo para evitar duplicados)
    if (onMessageReceived && typeof onMessageReceived === "function") {
      if (foregroundUnsubscribe) {
        try {
          foregroundUnsubscribe();
        } catch (_) {}
      }
      foregroundUnsubscribe = onMessage(messaging, (payload) => {
        console.log("🔔 [FideliPush] Notificación recibida en primer plano:", payload);
        onMessageReceived(payload);
      });
    }

    return { success: true, token: currentToken };
  } catch (error) {
    console.error("[FideliPush] Error al solicitar notificaciones:", error);
    return { success: false, error: error.message || "Error al activar notificaciones." };
  }
}

