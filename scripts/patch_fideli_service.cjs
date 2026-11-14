const fs = require('fs');

const targetFile = 'C:/laragon/www/my_barber_app/lib/fideli/fideli_service.dart';
let content = fs.readFileSync(targetFile, 'utf8');

const serviceMethods = `
  // ===========================================================================
  // TARJETAS DE FIDELIZACIÓN POR TIENDA (SELLOS, RECOMPENSAS, DISEÑO PERSONALIZADO)
  // ===========================================================================

  /// Asegura o crea la tarjeta de fidelización de la tienda para el cliente.
  /// Si es su primer escaneo o primera compra, se crea automáticamente con 1 sello de cortesía.
  static Future<Map<String, dynamic>> ensureStoreLoyaltyCard({
    required String uid,
    required String clientDocId,
    required Map<String, dynamic> store,
    int initialStamps = 1,
  }) async {
    try {
      final docRef = _db.collection('clients').doc(uid);
      final docSnap = await docRef.get();
      if (!docSnap.exists) {
        return {'isNew': false, 'card': null};
      }

      final data = docSnap.data() ?? {};
      final List<dynamic> rawCards = data['loyaltyCards'] as List<dynamic>? ?? [];
      final List<Map<String, dynamic>> cards =
          rawCards.map((c) => Map<String, dynamic>.from(c as Map)).toList();

      final storeId = (store['id'] ?? store['storeId'] ?? '').toString();
      final existingIndex =
          cards.indexWhere((c) => (c['storeId'] ?? '').toString() == storeId);

      if (existingIndex >= 0) {
        // Ya posee tarjeta para este comercio
        return {'isNew': false, 'card': cards[existingIndex]};
      }

      // Primera vez: Se crea la tarjeta de fidelización con el diseño propio de la tienda
      final target = (store['stampsTarget'] as num?)?.toInt() ??
          (store['targetStamps'] as num?)?.toInt() ??
          6;
      final current = initialStamps.clamp(0, target);
      final cleanDoc = clientDocId.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '');
      final shortDoc =
          cleanDoc.length >= 4 ? cleanDoc.substring(cleanDoc.length - 4) : cleanDoc;

      final newCard = <String, dynamic>{
        'id': 'CARD-$storeId-$shortDoc',
        'storeId': storeId,
        'storeName': store['name'] ?? 'Comercio Aliado',
        'storeCategory': store['category'] ?? 'Comercio Aliado',
        'cardColor':
            store['cardColor'] ?? store['design']?['cardColor'] ?? '#9C382A',
        'cardGradient':
            store['cardGradient'] ?? store['design']?['cardGradient'] ?? '#DE8B76',
        'logo': store['logo'] ?? store['photoUrl'],
        'stampIcon':
            store['stampIcon'] ?? store['design']?['stampIcon'] ?? 'star',
        'stampsTarget': target,
        'currentStamps': current,
        'rewardTitle': store['rewardTitle'] ??
            store['currentReward'] ??
            'Premio de Fidelidad en Tienda',
        'stampCondition':
            store['stampCondition'] ?? '1 sello por cada compra elegible',
        'status': 'ACTIVA',
        'createdAt': DateTime.now().toIso8601String(),
        'lastStampAt': DateTime.now().toIso8601String(),
      };

      cards.add(newCard);

      final updateData = <String, dynamic>{
        'loyaltyCards': cards,
      };

      if (data['favoriteStoreId'] == null || data['favoriteStoreId'] == 'ALL') {
        updateData['favoriteStoreId'] = storeId;
      }

      await docRef.update(updateData);

      return {'isNew': true, 'card': newCard};
    } catch (e) {
      print('⚠️ Error en ensureStoreLoyaltyCard: $e');
      return {'isNew': false, 'card': null, 'error': e.toString()};
    }
  }

  /// Suma sellos a la tarjeta de fidelización del cliente en la tienda
  static Future<bool> addStampToStoreCard({
    required String uid,
    required String storeId,
    int stampsToAdd = 1,
  }) async {
    try {
      final docRef = _db.collection('clients').doc(uid);
      final docSnap = await docRef.get();
      if (!docSnap.exists) return false;

      final data = docSnap.data() ?? {};
      final List<dynamic> rawCards = data['loyaltyCards'] as List<dynamic>? ?? [];
      final List<Map<String, dynamic>> cards =
          rawCards.map((c) => Map<String, dynamic>.from(c as Map)).toList();

      final idx = cards.indexWhere((c) => (c['storeId'] ?? '').toString() == storeId);
      if (idx < 0) return false;

      final target = (cards[idx]['stampsTarget'] as num?)?.toInt() ?? 6;
      final current = (cards[idx]['currentStamps'] as num?)?.toInt() ?? 0;
      final nextStamps = current + stampsToAdd;

      cards[idx]['currentStamps'] = nextStamps > target ? target : nextStamps;
      cards[idx]['lastStampAt'] = DateTime.now().toIso8601String();

      await docRef.update({'loyaltyCards': cards});
      return true;
    } catch (e) {
      print('⚠️ Error sumando sello: $e');
      return false;
    }
  }
`;

if (!content.includes('ensureStoreLoyaltyCard')) {
  const lastBraceIndex = content.lastIndexOf('}');
  content = content.slice(0, lastBraceIndex) + serviceMethods + '\n}\n';
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('Successfully updated fideli_service.dart with loyalty card logic!');
} else {
  console.log('fideli_service.dart already contains ensureStoreLoyaltyCard.');
}
