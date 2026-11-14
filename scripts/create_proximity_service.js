const fs = require('fs');

const dartCode = `import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';

class NearbyStoreMatch {
  final Map<String, dynamic> store;
  final double distanceMeters;
  final bool isInsideGeofence;

  NearbyStoreMatch({
    required this.store,
    required this.distanceMeters,
    required this.isInsideGeofence,
  });

  String get formattedDistance {
    if (distanceMeters < 1000) {
      return '\${distanceMeters.round()} m';
    }
    final km = distanceMeters / 1000.0;
    return '\${km.toStringAsFixed(1)} km';
  }
}

class FideliProximityService {
  /// Obtiene la posición actual del cliente con verificación de permisos
  static Future<Position?> getCurrentPosition() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        debugPrint('📍 [Fideli] Servicios de ubicación desactivados en el dispositivo.');
        return null;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          debugPrint('📍 [Fideli] Permiso de ubicación denegado.');
          return null;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        debugPrint('📍 [Fideli] Permiso de ubicación denegado permanentemente.');
        return null;
      }

      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium,
        timeLimit: const Duration(seconds: 8),
      );
    } catch (e) {
      debugPrint('📍 [Fideli] Error al obtener ubicación GPS: \$e');
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

  /// Evalúa la tienda más cercana y si está dentro de la geocerca activa
  static NearbyStoreMatch? findClosestNearbyStore({
    required Position userPosition,
    required List<Map<String, dynamic>> stores,
  }) {
    NearbyStoreMatch? closestInside;

    for (final store in stores) {
      final isEnabled = store['geofenceEnabled'] == true ||
          (store['location'] is Map && store['location']['enabled'] == true);

      if (!isEnabled) continue;

      final dist = calculateDistanceMeters(userPosition: userPosition, store: store);
      if (dist == null) continue;

      final radius = extractRadiusMeters(store);
      final isInside = dist <= radius;

      if (isInside) {
        if (closestInside == null || dist < closestInside.distanceMeters) {
          closestInside = NearbyStoreMatch(
            store: store,
            distanceMeters: dist,
            isInsideGeofence: true,
          );
        }
      }
    }

    return closestInside;
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

  /// Extrae el radio configurado en metros (por defecto 150m)
  static double extractRadiusMeters(Map<String, dynamic> store) {
    if (store['geofenceRadius'] is num) {
      return (store['geofenceRadius'] as num).toDouble();
    }
    if (store['location'] is Map && store['location']['radiusMeters'] is num) {
      return (store['location']['radiusMeters'] as num).toDouble();
    }
    return 150.0;
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
