const fs = require('fs');

const dartCode = `import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../notification_service.dart';

class NearbyStoreMatch {
  final Map<String, dynamic> store;
  final double distanceMeters;
  final bool isInsideGeofence;
  final int currentStamps;
  final int targetStamps;
  final int missingStamps;
  final String rewardTitle;

  NearbyStoreMatch({
    required this.store,
    required this.distanceMeters,
    required this.isInsideGeofence,
    required this.currentStamps,
    required this.targetStamps,
    required this.missingStamps,
    required this.rewardTitle,
  });

  String get formattedDistance {
    if (distanceMeters < 1000) {
      return '\${distanceMeters.round()} m';
    }
    final km = distanceMeters / 1000.0;
    return '\${km.toStringAsFixed(1)} km';
  }

  /// Mensaje personalizado de sellos para la notificación
  String get notificationTitle {
    final storeName = store['name'] ?? 'Comercio Aliado';
    if (missingStamps == 0) {
      return '🎉 ¡Premio listo en \$storeName!';
    }
    return '📍 ¡Estás a \$formattedDistance de \$storeName!';
  }

  String get notificationBody {
    if (missingStamps == 0) {
      return '¡Completaste tus \$targetStamps sellos! Pasa hoy y canjea tu "\$rewardTitle".';
    }
    final sellosText = missingStamps == 1 ? '1 sello' : '\$missingStamps sellos';
    return '¡Solo te faltan \$sellosText para tu "\$rewardTitle"! Pasa hoy, sella tu tarjeta y avanza hacia tu premio.';
  }
}

class FideliProximityService {
  /// Obtiene la posición GPS actual del cliente con verificación de permisos
  static Future<Position?> getCurrentPosition() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        debugPrint('📍 [FideliPro] Ubicación desactivada en el teléfono.');
        return null;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          debugPrint('📍 [FideliPro] Permiso de ubicación denegado.');
          return null;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        debugPrint('📍 [FideliPro] Permiso de ubicación denegado permanentemente.');
        return null;
      }

      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium,
        timeLimit: const Duration(seconds: 8),
      );
    } catch (e) {
      debugPrint('📍 [FideliPro] Error al consultar GPS: \$e');
      return null;
    }
  }

  /// Calcula la distancia en metros entre el usuario y la tienda
  static double? calculateDistanceMeters({
    required Position userPosition,
    required Map<String, dynamic> store,
  }) {
    final lat = extractLatitude(store);
    final lng = extractLongitude(store);

    if (lat == null || lng == null) return null;

    try {
      return Geolocator.distanceBetween(
        userPosition.latitude,
        userPosition.longitude,
        lat,
        lng,
      );
    } catch (e) {
      return null;
    }
  }

  /// Evalúa las tiendas y encuentra si el cliente está a menos de 500m de alguna con sellos pendientes
  static NearbyStoreMatch? checkProximityAndFindStore({
    required Position userPosition,
    required List<Map<String, dynamic>> stores,
    required Map<String, dynamic> clientData,
  }) {
    NearbyStoreMatch? bestMatch;

    for (final store in stores) {
      final isEnabled = store['geofenceEnabled'] == true ||
          (store['location'] is Map && store['location']['enabled'] == true);

      // Si la tienda desactivó la geocerca, saltar
      if (!isEnabled) continue;

      final dist = calculateDistanceMeters(userPosition: userPosition, store: store);
      if (dist == null) continue;

      final storeRadius = extractRadiusMeters(store);
      // Radio máximo permitido: menor de 500 metros
      final effectiveRadius = min(500.0, max(50.0, storeRadius));

      final isInside = dist <= effectiveRadius;
      if (!isInside) continue;

      final storeId = store['id']?.toString() ?? '';
      final storeBalances = (clientData['storeBalances'] as Map?) ?? {};
      final storeStampsMap = (clientData['storeStamps'] as Map?) ?? {};

      // Sellos actuales del cliente en esta tienda
      int currentStamps = 0;
      if (storeStampsMap.containsKey(storeId)) {
        currentStamps = (storeStampsMap[storeId] as num?)?.toInt() ?? 0;
      } else if (storeBalances.containsKey(storeId)) {
        // Fallback de transición: 20 pts = 1 sello
        final pts = (storeBalances[storeId] as num?)?.toInt() ?? 0;
        currentStamps = (pts / 20).floor();
      } else {
        // Sellos base iniciales
        currentStamps = (clientData['stamps'] as num?)?.toInt() ?? 2;
      }

      // Meta de sellos de la tienda (por defecto 6 sellos si no lo ha configurado)
      final targetStamps = (store['stampsTarget'] as num?)?.toInt() ??
          (store['targetStamps'] as num?)?.toInt() ??
          6;

      final missing = max(0, targetStamps - currentStamps);
      final reward = (store['rewardTitle'] as String?)?.trim() ??
          (store['currentReward'] as String?)?.trim() ??
          'Premio de Fidelidad';

      final match = NearbyStoreMatch(
        store: store,
        distanceMeters: dist,
        isInsideGeofence: true,
        currentStamps: currentStamps,
        targetStamps: targetStamps,
        missingStamps: missing,
        rewardTitle: reward.isNotEmpty ? reward : 'Premio Especial',
      );

      // Priorizar la más cercana
      if (bestMatch == null || dist < bestMatch.distanceMeters) {
        bestMatch = match;
      }
    }

    return bestMatch;
  }

  /// Dispara la notificación push local evitando spam continuo (Cooldown de 4 horas por tienda)
  static Future<bool> triggerProximityNotificationIfEligible(NearbyStoreMatch match) async {
    try {
      final storeId = match.store['id']?.toString() ?? 'store';
      final prefs = await SharedPreferences.getInstance();
      final key = 'fideli_last_notif_\$storeId';

      final lastTime = prefs.getInt(key) ?? 0;
      final now = DateTime.now().millisecondsSinceEpoch;
      const cooldownMs = 4 * 60 * 60 * 1000; // 4 horas de cooldown

      if (now - lastTime < cooldownMs) {
        debugPrint('⏳ [FideliPro] Notificación en cooldown para tienda \$storeId (\${((cooldownMs - (now - lastTime)) / 60000).round()} min restantes).');
        return false;
      }

      // Generar ID numérico único estable para la notificación basado en el storeId
      final notifId = storeId.hashCode.abs() % 100000;

      await NotificationService.showNotification(
        id: notifId,
        title: match.notificationTitle,
        body: match.notificationBody,
        channelId: 'fidelipro_proximity_sellos',
        channelName: 'Avisos de Sellos por Proximidad',
      );

      // Guardar marca de tiempo
      await prefs.setInt(key, now);
      debugPrint('🔔 [FideliPro] Notificación de sellos enviada exitosamente para \${match.store['name']}');
      return true;
    } catch (e) {
      debugPrint('⚠️ [FideliPro] Error al enviar notificación de proximidad: \$e');
      return false;
    }
  }

  /// Extrae la latitud soportando el formato plano o estructurado
  static double? extractLatitude(Map<String, dynamic> store) {
    if (store['latitude'] is num) return (store['latitude'] as num).toDouble();
    if (store['location'] is Map && store['location']['latitude'] is num) {
      return (store['location']['latitude'] as num).toDouble();
    }
    return null;
  }

  /// Extrae la longitud soportando el formato plano o estructurado
  static double? extractLongitude(Map<String, dynamic> store) {
    if (store['longitude'] is num) return (store['longitude'] as num).toDouble();
    if (store['location'] is Map && store['location']['longitude'] is num) {
      return (store['location']['longitude'] as num).toDouble();
    }
    return null;
  }

  /// Extrae el radio configurado en metros (por defecto 150m, máx 500m)
  static double extractRadiusMeters(Map<String, dynamic> store) {
    double r = 150.0;
    if (store['geofenceRadius'] is num) {
      r = (store['geofenceRadius'] as num).toDouble();
    } else if (store['location'] is Map && store['location']['radiusMeters'] is num) {
      r = (store['location']['radiusMeters'] as num).toDouble();
    }
    return min(500.0, max(50.0, r));
  }

  /// Abre la navegación hacia la tienda en Google Maps o app de mapas
  static Future<bool> launchStoreNavigation({
    required double latitude,
    required double longitude,
    String? storeName,
  }) async {
    final query = storeName != null ? Uri.encodeComponent(storeName) : '';
    final url = Uri.parse(
      'https://www.google.com/maps/dir/?api=1&destination=\$latitude,\$longitude&destination_place_id=\$query',
    );

    try {
      if (await canLaunchUrl(url)) {
        return await launchUrl(url, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      debugPrint('⚠️ Error abriendo navegación: \$e');
    }
    return false;
  }
}
`;

const targetPath = 'C:/laragon/www/my_barber_app/lib/fideli/fideli_proximity_service.dart';
fs.writeFileSync(targetPath, dartCode, 'utf8');
console.log('fideli_proximity_service.dart successfully created at:', targetPath);
