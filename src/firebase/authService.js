import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider
} from "firebase/auth";
import { ref, get, set } from "firebase/database";
import { auth, rtdb } from "./config";

/**
 * Consulta el perfil del usuario en Firebase Realtime Database (conecta2-drive)
 */
export async function getUserFromRealtimeDb(uid) {
  if (!uid || !rtdb) return null;
  try {
    const userRef = ref(rtdb, `users/${uid}`);
    const snap = await get(userRef);
    if (snap.exists()) {
      return snap.val();
    }
    const comRef = ref(rtdb, `user_comercio/${uid}`);
    const comSnap = await get(comRef);
    if (comSnap.exists()) {
      return { ...comSnap.val(), isComercio: true };
    }
  } catch (e) {
    console.warn("[RTDB] Consulta de usuario en Realtime Database:", e);
  }
  return null;
}

/**
 * Aprovisiona el perfil del cliente en Firebase Realtime Database (users/{uid})
 * para que cuentas creadas por QR en mostrador o registro web puedan iniciar sesión también en la App Móvil.
 */
export async function provisionUserInRealtimeDb({
  uid,
  email = "",
  name = "",
  phone = "",
  docId = "",
  birthDate = "",
  photoURL = "",
  registeredViaStoreId = null
}) {
  if (!uid || !rtdb) return false;
  try {
    // No sobrescribir si el usuario ya existe en users o user_comercio
    const existing = await getUserFromRealtimeDb(uid);
    if (existing) {
      if (birthDate && !existing.fecha_nacimiento && !existing.birthDate) {
        try {
          await set(ref(rtdb, `users/${uid}/fecha_nacimiento`), birthDate);
          await set(ref(rtdb, `users/${uid}/birthDate`), birthDate);
        } catch (_) {}
      }
      return true;
    }

    const nowIso = new Date().toISOString();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const userRef = ref(rtdb, `users/${uid}`);
    await set(userRef, {
      id: uid,
      email: cleanEmail,
      password: "",
      name: name || cleanEmail.split("@")[0] || "Socio Fideli",
      role: "cliente",
      photoUrl: photoURL || "",
      telefono: phone || "",
      pais: "Venezuela",
      placa_vehiculo: "",
      modelo_vehiculo: "",
      tipo_vehiculo: "",
      cedula_conductor: "",
      cedula_cliente: "",
      numero_cedula: docId || "",
      fecha_nacimiento: birthDate || "",
      birthDate: birthDate || "",
      permiso_conductor: "",
      edad: "",
      genero: "",
      estado_usuario: "activo",
      bonificacion: "0",
      ubicacion: "",
      isActiveMicrotrabajos: false,
      latitude: "",
      longitude: "",
      lastLocationUpdate: "",
      nivelTrabajador: "principiante",
      biografia: "",
      registration_source: registeredViaStoreId ? "fidely_qr" : "fidely_web",
      registered_via_store_id: registeredViaStoreId || "",
      created_at: nowIso,
      updated_at: nowIso
    });
    return true;
  } catch (e) {
    console.warn("[RTDB] Error aprovisionando usuario en Realtime Database:", e);
    return false;
  }
}

/**
 * Aprovisiona el perfil de un comercio en Firebase Realtime Database (user_comercio/{uid})
 * para mantener sincronizadas las tiendas creadas vía web con la base de datos de Conecta2 y Apps móviles.
 */
export async function provisionComercioInRealtimeDb({
  uid,
  email = "",
  name = "",
  category = "",
  city = "Caracas",
  address = "",
  phone = "",
  organizationName = "",
  organizationLogo = ""
}) {
  if (!uid || !rtdb) return false;
  try {
    const comRef = ref(rtdb, `user_comercio/${uid}`);
    const existing = await get(comRef);
    if (existing.exists()) {
      return true;
    }

    const nowIso = new Date().toISOString();
    const cleanEmail = String(email || "").trim().toLowerCase();
    await set(comRef, {
      id: uid,
      email: cleanEmail,
      name: name || organizationName || "Comercio",
      organization_name: organizationName || name || "Comercio",
      organization_logo: organizationLogo || "",
      categoria_comercio: category || "Otro",
      estado_venezuela: city || "Distrito Capital",
      direccion_exacta: address || `${city}, Venezuela`,
      estado_usuario: "activo",
      telefono: phone || "",
      role: "comercio",
      bonificacion: "0",
      created_at: nowIso,
      updated_at: nowIso
    });
    return true;
  } catch (e) {
    console.warn("[RTDB] Error aprovisionando comercio en Realtime Database:", e);
    return false;
  }
}

/**
 * Traduce códigos de error de Firebase Auth a mensajes comprensibles en español
 */
export function formatAuthError(error) {
  if (!error) return "Ocurrió un error inesperado de autenticación.";
  const code = error.code || "";
  
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Correo o contraseña incorrectos. Verifica tus datos o crea una cuenta.";
    case "auth/user-not-found":
      return "No existe una cuenta registrada con este correo electrónico.";
    case "auth/email-already-use":
    case "auth/email-already-in-use":
      return "Este correo electrónico ya está registrado en fidely CLUB. Inicia sesión directamente.";
    case "auth/weak-password":
      return "La contraseña es muy débil. Debe tener al menos 6 caracteres.";
    case "auth/invalid-email":
      return "El formato del correo electrónico no es válido (ej: nombre@correo.com).";
    case "auth/operation-not-allowed":
      return "El proveedor aún no está activado en tu consola de Firebase. Ve a Firebase Console > Authentication > Sign-in method y habilítalo.";
    case "auth/popup-closed-by-user":
      return "Ventana de Google cerrada antes de completar el inicio de sesión.";
    case "auth/too-many-requests":
      return "Acceso bloqueado temporalmente por demasiados intentos. Espera unos minutos.";
    case "auth/unauthorized-domain":
      return "El dominio actual no está en la lista de dominios autorizados de Firebase Auth. Agrega fidelyclub.net y fidelyclub-a70ea.web.app en Firebase Console > Authentication > Settings > Authorized domains.";
    case "auth/network-request-failed":
      return "Error de conexión de red al contactar con Firebase Authentication.";
    default:
      return error.message || "Error al autenticar con Firebase.";
  }
}

/**
 * Iniciar sesión con Google (con fallback a Redirect en caso de popups bloqueados)
 */
export async function loginWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    return { success: true, user: result.user };
  } catch (error) {
    console.warn("[Firebase Auth] Error en login con Google:", error.code, error.message);
    
    // Si el navegador bloqueó la ventana emergente (popup)
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
      try {
        console.log("[Firebase Auth] Popup bloqueado, cambiando a signInWithRedirect...");
        const provider = new GoogleAuthProvider();
        await signInWithRedirect(auth, provider);
        return { success: false, redirecting: true };
      } catch (redirectErr) {
        return {
          success: false,
          error: redirectErr,
          formattedMessage: formatAuthError(redirectErr)
        };
      }
    }

    return {
      success: false,
      error,
      formattedMessage: formatAuthError(error)
    };
  }
}

/**
 * Verifica si venimos de un inicio de sesión con Google por redirección
 */
export async function checkGoogleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      return { success: true, user: result.user };
    }
  } catch (error) {
    console.warn("[Firebase Auth] Error al verificar resultado de redirección:", error);
    return { success: false, error, formattedMessage: formatAuthError(error) };
  }
  return { success: false, noRedirect: true };
}

/**
 * Iniciar sesión con Firebase Auth (Correo y Contraseña)
 */
export async function loginWithEmailPassword(email, password) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = String(password);

    if (cleanPassword.length < 6) {
      return {
        success: false,
        error: { code: "auth/weak-password", message: "La contraseña debe tener al menos 6 caracteres." },
        formattedMessage: "La contraseña de Firebase debe tener al menos 6 caracteres."
      };
    }

    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.warn("[Firebase Auth] Error en inicio de sesión:", error.code, error.message);
    return { 
      success: false, 
      error, 
      formattedMessage: formatAuthError(error) 
    };
  }
}

/**
 * Registrar nuevo usuario con Firebase Auth (Correo y Contraseña)
 */
export async function registerWithEmailPassword(email, password, displayName = "") {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = String(password);

    if (cleanPassword.length < 6) {
      return {
        success: false,
        error: { code: "auth/weak-password", message: "La contraseña debe tener al menos 6 caracteres." },
        formattedMessage: "La contraseña para Firebase Auth debe tener al menos 6 caracteres."
      };
    }

    const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
    if (displayName && userCredential.user) {
      try {
        await updateProfile(userCredential.user, { displayName });
      } catch (profileErr) {
        console.warn("[Firebase Auth] Error al actualizar perfil:", profileErr);
      }
    }
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.warn("[Firebase Auth] Error en registro:", error.code, error.message);
    return { 
      success: false, 
      error, 
      formattedMessage: formatAuthError(error) 
    };
  }
}

/**
 * Inicio de sesión con fallback o auto-aprovisionamiento para cuentas demo
 */
export async function authenticateOrProvisionUser(email, password, displayName = "") {
  // 1. Intenta iniciar sesión
  const loginRes = await loginWithEmailPassword(email, password);
  if (loginRes.success) return loginRes;

  // 2. Si el usuario no existe en Firebase Auth y la contraseña es válida, lo registra automáticamente
  if (loginRes.error?.code === "auth/user-not-found" || loginRes.error?.code === "auth/invalid-credential") {
    const regRes = await registerWithEmailPassword(email, password, displayName);
    if (regRes.success) return regRes;
  }

  return loginRes;
}

/**
 * Cerrar sesión en Firebase Auth
 */
export async function logoutFromFirebase() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error("[Firebase Auth] Error al cerrar sesión:", error);
    return { success: false, error };
  }
}

/**
 * Escuchar cambios en la sesión de Firebase Auth
 */
export function subscribeAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}
