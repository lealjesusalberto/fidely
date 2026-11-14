const fs = require('fs');

const targetFile = 'C:/laragon/www/my_barber_app/lib/fideli/fideli_cliente_screen.dart';
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Ensure import of fideli_store_card_widget.dart
if (!content.includes("import 'widgets/fideli_store_card_widget.dart';")) {
  content = content.replace(
    "import 'widgets/fideli_digital_card.dart';",
    "import 'widgets/fideli_digital_card.dart';\nimport 'widgets/fideli_store_card_widget.dart';"
  );
  console.log('1. Added import for fideli_store_card_widget.dart');
}

// 2. Update _openQrModal to accept optional storeCard
const oldOpenQr = `  void _openQrModal({
    required String name,
    required String docId,
    required int points,
    required double cash,
  }) {
    FideliQrModal.show(
      context,
      clientName: name,
      docId: docId,
      points: points,
      cashEquivalent: cash,
    );
  }`;

const newOpenQr = `  void _openQrModal({
    required String name,
    required String docId,
    required int points,
    required double cash,
    Map<String, dynamic>? storeCard,
  }) {
    FideliQrModal.show(
      context,
      clientName: name,
      docId: docId,
      points: points,
      cashEquivalent: cash,
      storeCard: storeCard,
    );
  }`;

if (content.includes(oldOpenQr)) {
  content = content.replace(oldOpenQr, newOpenQr);
  console.log('2. Updated _openQrModal with storeCard parameter');
}

// 3. Extract loyaltyCards in build() and pass to tabs
const oldBuildTabs = `                  _buildInicioTab(
                    uid: uid,
                    name: name,
                    docId: docId,
                    points: points,
                    cash: cash,
                    memberSince: memberSince,
                    hasConsumedWelcome: hasConsumedWelcome,
                  ),
                  _buildTiendasTab(),`;

const newBuildTabs = `                  _buildInicioTab(
                    uid: uid,
                    name: name,
                    docId: docId,
                    points: points,
                    cash: cash,
                    memberSince: memberSince,
                    hasConsumedWelcome: hasConsumedWelcome,
                    loyaltyCards: loyaltyCards,
                  ),
                  _buildTiendasTab(
                    loyaltyCards: loyaltyCards,
                    clientName: name,
                    clientDocId: docId,
                    points: points,
                    cash: cash,
                  ),`;

const oldDataExtraction = `final bool hasAcceptedRemote = (data['hasAcceptedWelcome'] as bool?) ?? false;`;
const newDataExtraction = `final bool hasAcceptedRemote = (data['hasAcceptedWelcome'] as bool?) ?? false;

        final rawCards = (data['loyaltyCards'] as List<dynamic>?) ?? [];
        final loyaltyCards = rawCards
            .map((c) => Map<String, dynamic>.from(c as Map))
            .toList();`;

if (content.includes(oldDataExtraction) && !content.includes('final rawCards = (data[\'loyaltyCards\']')) {
  content = content.replace(oldDataExtraction, newDataExtraction);
  console.log('3a. Extracted loyaltyCards from client snapshot data');
}

if (content.includes(oldBuildTabs)) {
  content = content.replace(oldBuildTabs, newBuildTabs);
  console.log('3b. Passed loyaltyCards to _buildInicioTab and _buildTiendasTab');
}

// 4. Update _buildInicioTab parameter signature
const oldInicioTabSig = `  Widget _buildInicioTab({
    required String uid,
    required String name,
    required String docId,
    required int points,
    required double cash,
    required String memberSince,
    required bool hasConsumedWelcome,
  }) {`;

const newInicioTabSig = `  Widget _buildInicioTab({
    required String uid,
    required String name,
    required String docId,
    required int points,
    required double cash,
    required String memberSince,
    required bool hasConsumedWelcome,
    required List<Map<String, dynamic>> loyaltyCards,
  }) {`;

if (content.includes(oldInicioTabSig)) {
  content = content.replace(oldInicioTabSig, newInicioTabSig);
  console.log('4. Updated _buildInicioTab signature');
}

// 5. In _buildInicioTab, add Mis Tarjetas section after FideliDigitalCard
const afterDigitalCard = `        KeyedSubtree(
          key: _tourTarjetaQrKey,
          child: FideliDigitalCard(
            clientName: name,
            docId: docId,
            points: points,
            cashEquivalent: cash,
            memberSince: memberSince,
            onExpandQr: () => _openQrModal(
              name: name,
              docId: docId,
              points: points,
              cash: cash,
            ),
          ),
        ),
        const SizedBox(height: 16),`;

const additionAfterDigitalCard = `        KeyedSubtree(
          key: _tourTarjetaQrKey,
          child: FideliDigitalCard(
            clientName: name,
            docId: docId,
            points: points,
            cashEquivalent: cash,
            memberSince: memberSince,
            onExpandQr: () => _openQrModal(
              name: name,
              docId: docId,
              points: points,
              cash: cash,
            ),
          ),
        ),
        const SizedBox(height: 16),

        // 4. TARJETAS DE FIDELIZACIÓN POR TIENDA (Sellos y recompensas exclusivas)
        _buildMisTarjetasFidelizacionSection(
          loyaltyCards: loyaltyCards,
          name: name,
          docId: docId,
          points: points,
          cash: cash,
        ),
        const SizedBox(height: 16),`;

if (content.includes(afterDigitalCard) && !content.includes('_buildMisTarjetasFidelizacionSection(')) {
  content = content.replace(afterDigitalCard, additionAfterDigitalCard);
  console.log('5. Added _buildMisTarjetasFidelizacionSection to _buildInicioTab');
}

// 6. Add _buildMisTarjetasFidelizacionSection method implementation
const sectionMethodCode = `  // ===========================================================================
  // MIS TARJETAS DE FIDELIZACIÓN POR TIENDA
  // ===========================================================================
  Widget _buildMisTarjetasFidelizacionSection({
    required List<Map<String, dynamic>> loyaltyCards,
    required String name,
    required String docId,
    required int points,
    required double cash,
  }) {
    if (loyaltyCards.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: FideliColors.borderSubtle),
          boxShadow: const [
            BoxShadow(
              color: Color(0x0A000000),
              blurRadius: 10,
              offset: Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: FideliColors.bgSecondarySoft,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(Icons.style_rounded, color: FideliColors.primary, size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'Tarjetas de Fidelización por Comercio',
                        style: TextStyle(
                          fontSize: 14.5,
                          fontWeight: FontWeight.w900,
                          color: FideliColors.textMain,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Cada tienda tiene sus propios sellos y premios',
                        style: TextStyle(fontSize: 11.5, color: FideliColors.textMuted),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Text(
              'Al hacer tu primera compra o escanear el QR de cualquier comercio aliado, se activará automáticamente tu tarjeta con el logo, colores oficiales y tu primer sello acreditado.',
              style: TextStyle(fontSize: 12, color: Color(0xFF57534E), height: 1.4),
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _openStoreScanModal(
                  name: name,
                  docId: docId,
                  points: points,
                  cash: cash,
                ),
                icon: const Icon(Icons.qr_code_scanner_rounded, size: 18),
                label: const Text(
                  'Escanear QR de Tienda',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: FideliColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 0,
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: const [
                Icon(Icons.style_rounded, color: FideliColors.primary, size: 20),
                SizedBox(width: 8),
                Text(
                  'Mis Tarjetas de Fidelización',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.3,
                    color: FideliColors.textMain,
                  ),
                ),
              ],
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: FideliColors.bgSecondarySoft,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: FideliColors.borderSubtle),
              ),
              child: Text(
                '\${loyaltyCards.length} \${loyaltyCards.length == 1 ? "tienda activa" : "tiendas activas"}',
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: FideliColors.primary,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        const Text(
          'Toca "Presentar Tarjeta en Caja" para mostrar tu QR vinculado al comercio y sumar sellos.',
          style: TextStyle(fontSize: 12, color: FideliColors.textMuted),
        ),
        const SizedBox(height: 12),
        ...loyaltyCards.map((card) {
          return FideliStoreCardWidget(
            card: card,
            onPresentCard: () => _openQrModal(
              name: name,
              docId: docId,
              points: points,
              cash: cash,
              storeCard: card,
            ),
          );
        }).toList(),
      ],
    );
  }
`;

if (!content.includes('Widget _buildMisTarjetasFidelizacionSection(')) {
  const insertMarker = "Widget _buildCardTusPuntosTotales(";
  content = content.replace(insertMarker, sectionMethodCode + "\n  " + insertMarker);
  console.log('6. Injected _buildMisTarjetasFidelizacionSection method');
}

// 7. Update _buildTiendasTab signature & map call
const oldTiendasTabSig = `  Widget _buildTiendasTab() {`;
const newTiendasTabSig = `  Widget _buildTiendasTab({
    List<Map<String, dynamic>> loyaltyCards = const [],
    String? clientName,
    String? clientDocId,
    int points = 0,
    double cash = 0.0,
  }) {`;

if (content.includes(oldTiendasTabSig)) {
  content = content.replace(oldTiendasTabSig, newTiendasTabSig);
  console.log('7a. Updated _buildTiendasTab signature');
}

const oldStoreMap = `            else
              ...filtered.map((s) => _buildStoreCard(s)).toList(),`;

const newStoreMap = `            else
              ...filtered.map((s) {
                final storeId = (s['id'] ?? '').toString();
                final userCard = loyaltyCards.firstWhere(
                  (c) => (c['storeId'] ?? '').toString() == storeId,
                  orElse: () => <String, dynamic>{},
                );
                final hasCard = userCard.isNotEmpty;
                return _buildStoreCard(
                  s,
                  userLoyaltyCard: hasCard ? userCard : null,
                  onOpenQr: () => _openQrModal(
                    name: clientName ?? '',
                    docId: clientDocId ?? '',
                    points: points,
                    cash: cash,
                    storeCard: hasCard ? userCard : null,
                  ),
                  onJoinClub: () => _openStoreScanModal(
                    name: clientName ?? '',
                    docId: clientDocId ?? '',
                    points: points,
                    cash: cash,
                  ),
                );
              }).toList(),`;

if (content.includes(oldStoreMap)) {
  content = content.replace(oldStoreMap, newStoreMap);
  console.log('7b. Connected loyaltyCards in _buildTiendasTab stream map');
}

// 8. Update _buildStoreCard to display user card status & buttons
const oldBuildStoreCard = `  Widget _buildStoreCard(Map<String, dynamic> store) {
    final name = store['name'] ?? 'Comercio Aliado';
    final category = store['category'] ?? 'Tienda';
    final city = store['city'] ?? 'Caracas';
    final targetStamps = (store['stampsTarget'] as num?)?.toInt() ?? 6;
    final reward = (store['rewardTitle'] as String?)?.trim() ?? 'Premio';

    // Distancia GPS del cliente a la tienda
    double? distMeters;
    if (_currentPosition != null) {
      distMeters = FideliProximityService.calculateDistanceMeters(
        userPosition: _currentPosition!,
        store: store,
      );
    }

    final bool isNear = distMeters != null && distMeters <= 500;
    final String distText = distMeters != null
        ? (distMeters < 1000 ? '\${distMeters.round()} m' : '\${(distMeters / 1000.0).toStringAsFixed(1)} km')
        : '';

    final lat = FideliProximityService.extractLatitude(store);
    final lng = FideliProximityService.extractLongitude(store);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isNear ? const Color(0xFFDE8B76) : FideliColors.borderSubtle,
          width: isNear ? 1.5 : 1.0,
        ),
        boxShadow: isNear
            ? const [
                BoxShadow(
                  color: Color(0x149C382A),
                  blurRadius: 10,
                  offset: Offset(0, 4),
                )
              ]
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: isNear ? const Color(0xFFFFF1EE) : FideliColors.bgSecondarySoft,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  Icons.storefront_rounded,
                  color: isNear ? const Color(0xFF9C382A) : FideliColors.primary,
                  size: 24,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: FideliColors.textMain),
                    ),
                    const SizedBox(height: 2),
                    Text('\$category • \$city', style: const TextStyle(fontSize: 12, color: FideliColors.textMuted)),
                  ],
                ),
              ),
              if (distText.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: isNear ? const Color(0xFFFEF2F2) : FideliColors.bgApp,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isNear ? const Color(0xFFFECACA) : FideliColors.borderSubtle,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.location_on_rounded,
                        size: 11,
                        color: isNear ? const Color(0xFFDC2626) : FideliColors.textMuted,
                      ),
                      const SizedBox(width: 3),
                      Text(
                        distText,
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w800,
                          color: isNear ? const Color(0xFFDC2626) : FideliColors.textMain,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),

          // Fila de información de Sellos y botón de navegación
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.stars_rounded, size: 14, color: Color(0xFF9C382A)),
                  const SizedBox(width: 4),
                  Text(
                    '\$targetStamps sellos = \$reward',
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF78350F),
                    ),
                  ),
                ],
              ),
              if (lat != null && lng != null)
                GestureDetector(
                  onTap: () {
                    FideliProximityService.launchStoreNavigation(
                      latitude: lat,
                      longitude: lng,
                      storeName: name,
                    );
                  },
                  child: Row(
                    children: const [
                      Text(
                        'Cómo llegar',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: FideliColors.primary),
                      ),
                      SizedBox(width: 2),
                      Icon(Icons.directions_rounded, size: 14, color: FideliColors.primary),
                    ],
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }`;

const newBuildStoreCard = `  Widget _buildStoreCard(
    Map<String, dynamic> store, {
    Map<String, dynamic>? userLoyaltyCard,
    VoidCallback? onOpenQr,
    VoidCallback? onJoinClub,
  }) {
    final name = store['name'] ?? 'Comercio Aliado';
    final category = store['category'] ?? 'Tienda';
    final city = store['city'] ?? 'Caracas';
    final targetStamps = (store['stampsTarget'] as num?)?.toInt() ?? 6;
    final reward = (store['rewardTitle'] as String?)?.trim() ?? 'Premio';
    final cardColorHex = store['cardColor'] ?? store['design']?['cardColor'];
    final stampIconKey = store['stampIcon'] ?? store['design']?['stampIcon'] ?? 'star';
    final storeColor = FideliColors.parseHexColor(cardColorHex, defaultColor: FideliColors.primary);
    final stampIcon = FideliColors.getStampIcon(stampIconKey);

    final bool hasCard = userLoyaltyCard != null;
    final userCurrentStamps = (userLoyaltyCard?['currentStamps'] as num?)?.toInt() ?? 0;

    // Distancia GPS del cliente a la tienda
    double? distMeters;
    if (_currentPosition != null) {
      distMeters = FideliProximityService.calculateDistanceMeters(
        userPosition: _currentPosition!,
        store: store,
      );
    }

    final bool isNear = distMeters != null && distMeters <= 500;
    final String distText = distMeters != null
        ? (distMeters < 1000 ? '\${distMeters.round()} m' : '\${(distMeters / 1000.0).toStringAsFixed(1)} km')
        : '';

    final lat = FideliProximityService.extractLatitude(store);
    final lng = FideliProximityService.extractLongitude(store);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: hasCard ? storeColor.withOpacity(0.4) : (isNear ? const Color(0xFFDE8B76) : FideliColors.borderSubtle),
          width: hasCard || isNear ? 1.5 : 1.0,
        ),
        boxShadow: [
          if (hasCard)
            BoxShadow(
              color: storeColor.withOpacity(0.08),
              blurRadius: 10,
              offset: const Offset(0, 4),
            )
          else if (isNear)
            const BoxShadow(
              color: Color(0x149C382A),
              blurRadius: 10,
              offset: Offset(0, 4),
            ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: hasCard
                      ? storeColor.withOpacity(0.12)
                      : (isNear ? const Color(0xFFFFF1EE) : FideliColors.bgSecondarySoft),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  stampIcon,
                  color: hasCard ? storeColor : (isNear ? const Color(0xFF9C382A) : FideliColors.primary),
                  size: 24,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: FideliColors.textMain),
                    ),
                    const SizedBox(height: 2),
                    Text('\$category • \$city', style: const TextStyle(fontSize: 12, color: FideliColors.textMuted)),
                  ],
                ),
              ),
              if (hasCard)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFDCFCE7),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF86EFAC)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(stampIcon, size: 11, color: const Color(0xFF166534)),
                      const SizedBox(width: 3),
                      Text(
                        '\$userCurrentStamps/\$targetStamps sellos',
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF166534),
                        ),
                      ),
                    ],
                  ),
                )
              else if (distText.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: isNear ? const Color(0xFFFEF2F2) : FideliColors.bgApp,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isNear ? const Color(0xFFFECACA) : FideliColors.borderSubtle,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.location_on_rounded,
                        size: 11,
                        color: isNear ? const Color(0xFFDC2626) : FideliColors.textMuted,
                      ),
                      const SizedBox(width: 3),
                      Text(
                        distText,
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w800,
                          color: isNear ? const Color(0xFFDC2626) : FideliColors.textMain,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),

          // Fila de información de Sellos y botón de acción
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    Icon(stampIcon, size: 14, color: storeColor),
                    const SizedBox(width: 4),
                    Flexible(
                      child: Text(
                        '\$targetStamps sellos = \$reward',
                        style: const TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF78350F),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              if (hasCard)
                GestureDetector(
                  onTap: onOpenQr,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: storeColor,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Icon(Icons.qr_code_2_rounded, size: 13, color: Colors.white),
                        SizedBox(width: 4),
                        Text(
                          'Ver Tarjeta',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.white),
                        ),
                      ],
                    ),
                  ),
                )
              else if (onJoinClub != null)
                GestureDetector(
                  onTap: onJoinClub,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: FideliColors.bgSecondarySoft,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: FideliColors.borderSubtle),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Icon(Icons.add_circle_outline_rounded, size: 13, color: FideliColors.primary),
                        SizedBox(width: 4),
                        Text(
                          'Obtener Tarjeta',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: FideliColors.primary),
                        ),
                      ],
                    ),
                  ),
                )
              else if (lat != null && lng != null)
                GestureDetector(
                  onTap: () {
                    FideliProximityService.launchStoreNavigation(
                      latitude: lat,
                      longitude: lng,
                      storeName: name,
                    );
                  },
                  child: Row(
                    children: const [
                      Text(
                        'Cómo llegar',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: FideliColors.primary),
                      ),
                      SizedBox(width: 2),
                      Icon(Icons.directions_rounded, size: 14, color: FideliColors.primary),
                    ],
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }`;

if (content.includes(oldBuildStoreCard)) {
  content = content.replace(oldBuildStoreCard, newBuildStoreCard);
  console.log('8. Updated _buildStoreCard with loyalty card status & QR buttons');
}

// Write to Laragon file
fs.writeFileSync(targetFile, content, 'utf8');
console.log('Successfully updated laragon fideli_cliente_screen.dart!');

// Write to workspace copy
fs.writeFileSync('fideli_cliente_screen.dart', content, 'utf8');
console.log('Successfully updated workspace fideli_cliente_screen.dart!');
