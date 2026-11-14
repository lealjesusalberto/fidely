const fs = require('fs');

// 1. PATCH fideli_proximity_service.dart
const proxFile = 'c:/laragon/www/my_barber_app/lib/fideli/fideli_proximity_service.dart';
let proxContent = fs.readFileSync(proxFile, 'utf8');

// A. Insert autoStartIfEnabled
if (!proxContent.includes('autoStartIfEnabled')) {
  const target = 'static Future<void> setProximityEnabled(bool enabled) async {';
  const autoStartMethod = `  /// Inicializa automáticamente el listener en segundo plano si estaba activado previamente
  static Future<void> autoStartIfEnabled() async {
    final enabled = await isProximityEnabled();
    if (!enabled) return;
    if (_isListening && _positionStreamSub != null) return;

    final prefs = await SharedPreferences.getInstance();
    final storesStr = prefs.getString(prefKeyCachedStores);
    final clientStr = prefs.getString(prefKeyCachedClient);
    final userId = prefs.getString(prefKeyCachedUserId) ?? '';

    if (storesStr != null && clientStr != null && userId.isNotEmpty) {
      try {
        final storesList = (jsonDecode(storesStr) as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
        final clientMap = Map<String, dynamic>.from(jsonDecode(clientStr) as Map);

        await startProximityListener(
          stores: storesList,
          clientData: clientMap,
          userId: userId,
          forceImmediateCheck: true,
        );
        debugPrint('🚀 [FideliProximityService] Auto-iniciado en segundo plano desde SharedPreferences');
      } catch (e) {
        debugPrint('⚠️ Error en autoStartIfEnabled: $e');
      }
    }
  }

  static Future<void> setProximityEnabled(bool enabled) async {`;
  proxContent = proxContent.replace(target, autoStartMethod);
}

// B. Improve AndroidSettings location tracking (lower distanceFilter to 10m for immediate home/store arrival trigger)
proxContent = proxContent.replace(
  'distanceFilter: 25, // Detección a 25m para no saturar al usuario\r\n          intervalDuration: const Duration(seconds: 15),',
  'distanceFilter: 10, // Detección a 10m para que al llegar a la tienda/casa dispare de inmediato\r\n          intervalDuration: const Duration(seconds: 10),'
);
proxContent = proxContent.replace(
  'distanceFilter: 25, // Detección a 25m para no saturar al usuario\n          intervalDuration: const Duration(seconds: 15),',
  'distanceFilter: 10, // Detección a 10m para que al llegar a la tienda/casa dispare de inmediato\n          intervalDuration: const Duration(seconds: 10),'
);

// C. Relax geofence check so test stores without explicit boolean true also trigger
proxContent = proxContent.replace(
  `      final isEnabled = store['geofenceEnabled'] == true ||\r\n          (store['location'] is Map && store['location']['enabled'] == true);`,
  `      final isEnabled = store['geofenceEnabled'] != false &&\r\n          (store['location'] is! Map || store['location']['enabled'] != false);`
);
proxContent = proxContent.replace(
  `      final isEnabled = store['geofenceEnabled'] == true ||\n          (store['location'] is Map && store['location']['enabled'] == true);`,
  `      final isEnabled = store['geofenceEnabled'] != false &&\n          (store['location'] is! Map || store['location']['enabled'] != false);`
);

// D. Reduce cooldown from 60min to 15min
proxContent = proxContent.replace(
  'const cooldownMs = 60 * 60 * 1000;',
  'const cooldownMs = 15 * 60 * 1000;'
);

fs.writeFileSync(proxFile, proxContent, 'utf8');
console.log('fideli_proximity_service.dart patched successfully.');

// 2. PATCH fideli_cliente_screen.dart
const clientFile = 'c:/laragon/www/my_barber_app/lib/fideli/fideli_cliente_screen.dart';
let clientContent = fs.readFileSync(clientFile, 'utf8');

// A. Improve _initStoresLiveSync to call updateStoresAndClient and setState
const oldInitStores = `  void _initStoresLiveSync() {
    _storesSubscription = FideliService.streamStores().listen((snapshot) {
      final stores = snapshot.docs.map((d) {
        final data = d.data();
        data['id'] = data['id'] ?? d.id;
        return data;
      }).toList();
      if (mounted) {
        setState(() {
          _cachedStores = stores;
        });
      }
    });
  }`;

const newInitStores = `  void _initStoresLiveSync() {
    _storesSubscription = FideliService.streamStores().listen((snapshot) {
      final stores = snapshot.docs.map((d) {
        final data = d.data();
        data['id'] = data['id'] ?? d.id;
        return data;
      }).toList();
      FideliProximityService.updateStoresAndClient(stores: stores);
      if (mounted) {
        setState(() {
          _cachedStores = stores;
        });
      }
    });
  }`;
clientContent = clientContent.replace(oldInitStores, newInitStores);

// B. Improve _enrichLoyaltyCardsWithLiveStoreDesign to do case-insensitive match and copy stampRewards
const oldEnrich = `    final storesMap = {for (var s in stores) (s['id'] ?? '').toString(): s};

    return deduplicatedCards.map((c) {
      var storeId = (c['storeId'] ?? '').toString();
      if (storeId.isEmpty && (c['id'] ?? '').toString().startsWith('CARD-')) {
        final parts = (c['id'] as String).split('-');
        if (parts.length >= 2) storeId = parts[1];
      }

      var store = storesMap[storeId];
      if (store == null) {
        final name =
            (c['storeName'] ?? c['name'] ?? '').toString().trim().toLowerCase();
        if (name.isNotEmpty) {
          store = stores.firstWhere(
            (s) => (s['name'] ?? '').toString().trim().toLowerCase() == name,
            orElse: () => <String, dynamic>{},
          );
          if (store.isEmpty) store = null;
        }
      }
      if (store == null) return c;

      final enriched = Map<String, dynamic>.from(c);
      enriched['storeId'] = store['id'] ?? c['storeId'] ?? storeId;
      enriched['storeName'] = store['name'] ?? c['storeName'];
      enriched['storeCategory'] = store['category'] ?? c['storeCategory'];
      enriched['logo'] = store['logo'] ?? c['logo'];
      enriched['cardColor'] =
          store['cardColor'] ?? store['design']?['cardColor'] ?? c['cardColor'];
      enriched['cardGradient'] = store['cardGradient'] ??
          store['design']?['cardGradient'] ??
          c['cardGradient'];
      enriched['cardPattern'] = store['cardPattern'] ??
          store['design']?['cardPattern'] ??
          c['cardPattern'];
      enriched['cardBackgroundImage'] = store['cardBackgroundImage'] ??
          store['backgroundImage'] ??
          store['design']?['cardBackgroundImage'] ??
          c['cardBackgroundImage'];
      enriched['stampIcon'] =
          store['stampIcon'] ?? store['design']?['stampIcon'] ?? c['stampIcon'];
      enriched['stampsTarget'] = store['stampsTarget'] ??
          store['targetStamps'] ??
          store['design']?['stampsTarget'] ??
          c['stampsTarget'];
      enriched['rewardTitle'] = store['rewardTitle'] ??
          store['design']?['rewardTitle'] ??
          c['rewardTitle'];
      enriched['stampCondition'] = store['stampCondition'] ??
          store['design']?['stampCondition'] ??
          c['stampCondition'];
      return enriched;
    }).toList();`;

const newEnrich = `    final Map<String, Map<String, dynamic>> storesById = {};
    final Map<String, Map<String, dynamic>> storesByName = {};
    for (final s in stores) {
      final sId = (s['id'] ?? '').toString().trim().toLowerCase();
      if (sId.isNotEmpty) storesById[sId] = s;
      final sName = (s['name'] ?? '').toString().trim().toLowerCase();
      if (sName.isNotEmpty) storesByName[sName] = s;
    }

    return deduplicatedCards.map((c) {
      var storeId = (c['storeId'] ?? '').toString().trim();
      if (storeId.isEmpty && (c['id'] ?? '').toString().startsWith('CARD-')) {
        final parts = (c['id'] as String).split('-');
        if (parts.length >= 2) storeId = parts[1];
      }

      var store = storesById[storeId.toLowerCase()];
      if (store == null) {
        final name = (c['storeName'] ?? c['name'] ?? '').toString().trim().toLowerCase();
        if (name.isNotEmpty) {
          store = storesByName[name];
        }
      }
      if (store == null) return c;

      final enriched = Map<String, dynamic>.from(c);
      enriched['storeId'] = store['id'] ?? c['storeId'] ?? storeId;
      enriched['storeName'] = store['name'] ?? c['storeName'];
      enriched['storeCategory'] = store['category'] ?? c['storeCategory'];
      enriched['logo'] = store['logo'] ?? store['photoUrl'] ?? c['logo'];
      enriched['cardColor'] = store['cardColor'] ??
          store['design']?['cardColor'] ??
          c['cardColor'] ??
          '#9C382A';
      enriched['cardGradient'] = store['cardGradient'] ??
          store['design']?['cardGradient'] ??
          c['cardGradient'] ??
          '#DE8B76';
      enriched['cardPattern'] = store['cardPattern'] ??
          store['design']?['cardPattern'] ??
          c['cardPattern'] ??
          'radial';
      enriched['cardBackgroundImage'] = store['cardBackgroundImage'] ??
          store['backgroundImage'] ??
          store['design']?['cardBackgroundImage'] ??
          c['cardBackgroundImage'];
      enriched['stampIcon'] = store['stampIcon'] ??
          store['design']?['stampIcon'] ??
          c['stampIcon'] ??
          'star';
      enriched['stampsTarget'] = store['stampsTarget'] ??
          store['targetStamps'] ??
          store['design']?['stampsTarget'] ??
          c['stampsTarget'] ??
          6;
      enriched['rewardTitle'] = store['rewardTitle'] ??
          store['design']?['rewardTitle'] ??
          store['currentReward'] ??
          c['rewardTitle'] ??
          'Premio de Fidelidad';
      enriched['stampCondition'] = store['stampCondition'] ??
          store['design']?['stampCondition'] ??
          c['stampCondition'] ??
          '1 sello por cada compra elegible';
      enriched['stampRewards'] = store['stampRewards'] ??
          store['design']?['stampRewards'] ??
          c['stampRewards'];
      return enriched;
    }).toList();`;

clientContent = clientContent.replace(oldEnrich, newEnrich);

// C. In build(), make currentLiveStores directly available and pass it to _enrichLoyaltyCardsWithLiveStoreDesign
const oldBuildStores = `        if (storesSnapshot.hasData && storesSnapshot.data!.docs.isNotEmpty) {
          final liveStores = storesSnapshot.data!.docs.map((d) {
            final sData = d.data();
            sData['id'] = sData['id'] ?? d.id;
            return sData;
          }).toList();
          _cachedStores = liveStores;
        }`;

const newBuildStores = `        final currentLiveStores = (storesSnapshot.hasData && storesSnapshot.data!.docs.isNotEmpty)
            ? storesSnapshot.data!.docs.map((d) {
                final sData = d.data();
                sData['id'] = sData['id'] ?? d.id;
                return sData;
              }).toList()
            : _cachedStores;
        if (storesSnapshot.hasData && storesSnapshot.data!.docs.isNotEmpty) {
          _cachedStores = currentLiveStores;
        }`;

clientContent = clientContent.replace(oldBuildStores, newBuildStores);

clientContent = clientContent.replace(
  'final loyaltyCards = _enrichLoyaltyCardsWithLiveStoreDesign(\r\n                baseCards, _cachedStores);',
  'final loyaltyCards = _enrichLoyaltyCardsWithLiveStoreDesign(\r\n                baseCards, currentLiveStores);'
);
clientContent = clientContent.replace(
  'final loyaltyCards = _enrichLoyaltyCardsWithLiveStoreDesign(\n                baseCards, _cachedStores);',
  'final loyaltyCards = _enrichLoyaltyCardsWithLiveStoreDesign(\n                baseCards, currentLiveStores);'
);

fs.writeFileSync(clientFile, clientContent, 'utf8');
console.log('fideli_cliente_screen.dart patched successfully.');

// 3. PATCH main.dart to auto-start proximity service on app launch
const mainFile = 'c:/laragon/www/my_barber_app/lib/main.dart';
let mainContent = fs.readFileSync(mainFile, 'utf8');

if (!mainContent.includes('FideliProximityService.autoStartIfEnabled()')) {
  // Add import if missing
  if (!mainContent.includes("import 'fideli/fideli_proximity_service.dart';")) {
    mainContent = "import 'fideli/fideli_proximity_service.dart';\n" + mainContent;
  }
  const mainTarget = 'FirebasePushNotificationService.initialize().then((_) {';
  const autoStartCode = `// Auto-iniciar monitoreo de proximidad de comercios aliados en segundo plano si estaba habilitado
  try {
    FideliProximityService.autoStartIfEnabled().catchError((e) {
      debugPrint('Error auto-iniciando proximidad: \$e');
    });
  } catch (_) {}

  FirebasePushNotificationService.initialize().then((_) {`;
  mainContent = mainContent.replace(mainTarget, autoStartCode);
  fs.writeFileSync(mainFile, mainContent, 'utf8');
  console.log('main.dart patched with autoStartIfEnabled successfully.');
}

