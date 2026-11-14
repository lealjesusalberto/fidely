const fs = require('fs');

// 1. Actualizar firebase_push_notification_service.dart
const pushServiceFile = 'C:/laragon/www/my_barber_app/lib/firebase_push_notification_service.dart';
let pushContent = fs.readFileSync(pushServiceFile, 'utf8');

if (!pushContent.includes("notificationType == 'fidelipro_proximity_sellos'")) {
  pushContent = pushContent.replace(
    "} else if (notificationType == 'admin_notification') {",
    `} else if (notificationType == 'fidelipro_proximity_sellos') {
    channelId = 'fidelipro_proximity_sellos';
    channelName = 'Avisos de Sellos por Proximidad';
  } else if (notificationType == 'admin_notification') {`
  );
  fs.writeFileSync(pushServiceFile, pushContent, 'utf8');
  console.log('Successfully updated firebase_push_notification_service.dart with fidelipro_proximity_sellos channel!');
}

// 2. Actualizar fideli_proximity_service.dart para activar el trigger de Cloud Functions
const proximityServiceFile = 'C:/laragon/www/my_barber_app/lib/fideli/fideli_proximity_service.dart';
let proxContent = fs.readFileSync(proximityServiceFile, 'utf8');

if (!proxContent.includes("import 'package:firebase_database/firebase_database.dart';")) {
  proxContent = "import 'package:firebase_database/firebase_database.dart';\n" + proxContent;
}

if (!proxContent.includes("notificaciones_proximidad_fideli")) {
  const oldMethod = `      await NotificationService.showNotification(
        id: notifId,
        title: match.notificationTitle,
        body: match.notificationBody,
        channelId: 'fidelipro_proximity_sellos',
        channelName: 'Avisos de Sellos por Proximidad',
      );`;

  const newMethod = `      // 1. Disparar Cloud Function a través de Realtime Database
      try {
        final rtdb = FirebaseDatabase.instance.ref();
        final currentUid = userId ?? 'guest';
        await rtdb.child('notificaciones_proximidad_fideli').child(currentUid).child(storeId).set({
          'distanceMeters': match.distanceMeters.round(),
          'timestamp': ServerValue.timestamp,
        });
        debugPrint('🚀 [FideliPro] Trigger de Cloud Function FCM activado en Realtime Database');
      } catch (dbErr) {
        debugPrint('⚠️ [FideliPro] Error al activar trigger de Cloud Function: \$dbErr');
      }

      // 2. Notificación local inmediata como respaldo
      await NotificationService.showNotification(
        id: notifId,
        title: match.notificationTitle,
        body: match.notificationBody,
        channelId: 'fidelipro_proximity_sellos',
        channelName: 'Avisos de Sellos por Proximidad',
      );`;

  proxContent = proxContent.replace(
    'static Future<bool> triggerProximityNotificationIfEligible(NearbyStoreMatch match) async {',
    'static Future<bool> triggerProximityNotificationIfEligible(NearbyStoreMatch match, {String? userId}) async {'
  );

  proxContent = proxContent.replace(oldMethod, newMethod);
  fs.writeFileSync(proximityServiceFile, proxContent, 'utf8');
  console.log('Successfully updated fideli_proximity_service.dart with Cloud Function trigger!');
}
