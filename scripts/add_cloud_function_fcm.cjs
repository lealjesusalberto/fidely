const fs = require('fs');

const targetFile = 'C:/laragon/www/my_barber_app/functions/index.js';
let content = fs.readFileSync(targetFile, 'utf8');

if (content.includes('exports.onProximidadFideliPush')) {
  console.log('exports.onProximidadFideliPush already exists in functions/index.js');
} else {
  const functionCode = `

/**
 * ===========================================================================
 * NOTIFICACIÓN PUSH FCM DE SELLOS POR PROXIMIDAD (< 500m) - FIDELIPRO
 * ===========================================================================
 * Se activa automáticamente cuando un cliente entra en el radio (< 500m)
 * de un comercio aliado y calcula los sellos que le faltan para su premio.
 * Ref: /notificaciones_proximidad_fideli/{userId}/{storeId}
 */
exports.onProximidadFideliPush = onValueCreated(
    {
      ref: "/notificaciones_proximidad_fideli/{userId}/{storeId}",
      region: "us-central1",
    },
    async (event) => {
      const userId = (event.params.userId || "").toString().trim();
      const storeId = (event.params.storeId || "").toString().trim();
      const triggerData = event.data.val();

      if (!userId || !storeId || !triggerData) return null;

      logger.info("📍 [FideliPro FCM] Evento de proximidad recibido", {
        userId,
        storeId,
        triggerData,
      });

      try {
        // 1. Obtener Token FCM del cliente usando la función existente de la app
        const token = await obtenerFcmTokenParaCliente(userId);
        if (!token) {
          logger.warn("⚠️ [FideliPro FCM] Cliente sin token FCM válido", {userId, storeId});
          return null;
        }

        // 2. Control de Cooldown (4 horas) en Realtime Database para evitar repetición
        const rtdb = admin.database();
        const cooldownRef = rtdb.ref(\`fideli_cooldowns/\${userId}/\${storeId}\`);
        const cooldownSnap = await cooldownRef.once("value");
        const now = Date.now();
        const COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 horas

        if (cooldownSnap.exists() && cooldownSnap.val()?.timestamp) {
          const lastSent = Number(cooldownSnap.val().timestamp);
          if (now - lastSent < COOLDOWN_MS) {
            logger.info("⏳ [FideliPro FCM] Notificación en cooldown para este local", {
              userId,
              storeId,
              minutosRestantes: Math.round((COOLDOWN_MS - (now - lastSent)) / 60000),
            });
            return null;
          }
        }

        // 3. Consultar datos de la tienda en Firestore
        const firestore = admin.firestore();
        const storeDoc = await firestore.collection("stores").doc(storeId).get();

        if (!storeDoc.exists) {
          logger.warn("⚠️ [FideliPro FCM] Tienda no encontrada en Firestore", {storeId});
          return null;
        }

        const storeData = storeDoc.data() || {};
        const storeName = (storeData.name || "Comercio Aliado").toString().trim();
        const targetStamps = Number(storeData.stampsTarget || storeData.targetStamps || 6);
        const rewardTitle = (storeData.rewardTitle || storeData.currentReward || "Premio Especial").toString().trim();

        // 4. Consultar sellos acumulados del cliente en Firestore
        const clientDoc = await firestore.collection("clients").doc(userId).get();
        const clientData = clientDoc.exists ? clientDoc.data() || {} : {};

        const storeStampsMap = clientData.storeStamps || {};
        let currentStamps = 0;

        if (storeStampsMap && storeStampsMap[storeId] !== undefined) {
          currentStamps = Number(storeStampsMap[storeId]) || 0;
        } else if (clientData.storeBalances && clientData.storeBalances[storeId] !== undefined) {
          currentStamps = Math.floor((Number(clientData.storeBalances[storeId]) || 0) / 20);
        } else {
          currentStamps = Number(clientData.stamps) || 0;
        }

        const missingStamps = Math.max(0, targetStamps - currentStamps);

        // 5. Formatear distancia
        const distMeters = Number(triggerData.distanceMeters || 150);
        const distText = distMeters < 1000 ? \`\${Math.round(distMeters)} m\` : \`\${(distMeters / 1000).toFixed(1)} km\`;

        // 6. Construir Título y Mensaje Personalizado
        let title = "";
        let body = "";

        if (missingStamps === 0) {
          title = \`🎉 ¡Premio listo en \${storeName}!\`;
          body = \`¡Estás a \${distText}! Ya completaste tus \${targetStamps} sellos. Pasa hoy y retira tu "\${rewardTitle}".\`;
        } else {
          const sellosWord = missingStamps === 1 ? "1 sello" : \`\${missingStamps} sellos\`;
          title = \`📍 ¡Estás a \${distText} de \${storeName}!\`;
          body = \`¡Solo te faltan \${sellosWord} para tu "\${rewardTitle}"! Pasa hoy, sella tu tarjeta y avanza hacia tu premio.\`;
        }

        // 7. Enviar Notificación Push FCM nativa
        const message = {
          token: token,
          notification: {
            title: title,
            body: body,
          },
          data: {
            type: "fidelipro_proximity_sellos",
            action: "open_fideli",
            store_id: storeId,
            store_name: storeName,
            missing_stamps: String(missingStamps),
            target_stamps: String(targetStamps),
            reward_title: rewardTitle,
            dist_meters: String(distMeters),
          },
          android: {
            priority: "high",
            notification: {
              sound: "default",
              channelId: "fidelipro_proximity_sellos",
              clickAction: "FLUTTER_NOTIFICATION_CLICK",
            },
          },
          apns: {
            payload: {
              aps: {
                sound: "default",
                badge: 1,
              },
            },
          },
        };

        const response = await admin.messaging().send(message);
        logger.info("✅ [FideliPro FCM] Push enviado con éxito por Cloud Function", {
          messageId: response,
          userId,
          storeId,
          missingStamps,
        });

        // 8. Actualizar cooldown en Realtime Database
        await cooldownRef.set({
          timestamp: now,
          missingStamps,
          storeName,
          sentAt: new Date().toISOString(),
        });

        return {success: true, messageId: response};
      } catch (error) {
        logger.error("❌ [FideliPro FCM] Error enviando notificación push de proximidad", {
          error: error.message,
          userId,
          storeId,
        });
        return null;
      }
    },
);
`;

  content += functionCode;
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('Successfully added onProximidadFideliPush to functions/index.js!');
}
