const fs = require('fs');

const targetFile = 'C:/laragon/www/my_barber_app/lib/fideli/fideli_cliente_screen.dart';
let content = fs.readFileSync(targetFile, 'utf8');

const oldCard = `  Widget _buildStoreCard(Map<String, dynamic> store) {
    final name = store['name'] ?? 'Comercio Aliado';
    final category = store['category'] ?? 'Tienda';
    final city = store['city'] ?? 'Caracas';
    final cashback = (store['cashbackPercent'] as num?)?.toDouble() ?? 5.0;
    final cashbackStr = cashback.truncateToDouble() == cashback
        ? '\${cashback.toInt()}%'
        : '\${cashback.toStringAsFixed(1)}%';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: FideliColors.borderSubtle),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: FideliColors.bgSecondarySoft,
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.storefront_rounded, color: FideliColors.primary, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: FideliColors.textMain)),
                const SizedBox(height: 2),
                Text('\$category • \$city', style: const TextStyle(fontSize: 12, color: FideliColors.textMuted)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFDCFCE7),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF86EFAC)),
            ),
            child: Text(
              '\$cashbackStr Retorno',
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF166534)),
            ),
          ),
        ],
      ),
    );
  }`;

const newCard = `  Widget _buildStoreCard(Map<String, dynamic> store) {
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

if (content.includes(oldCard)) {
  content = content.replace(oldCard, newCard);
  fs.writeFileSync(targetFile, content, 'utf8');
  fs.writeFileSync('fideli_cliente_screen.dart', content, 'utf8');
  console.log('Successfully updated _buildStoreCard with Stamps & Proximity distance!');
} else {
  console.log('Target _buildStoreCard not found or already modified.');
}
