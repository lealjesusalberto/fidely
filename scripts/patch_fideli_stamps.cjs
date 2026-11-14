const fs = require('fs');

const targetFile = 'C:/laragon/www/my_barber_app/lib/fideli/fideli_cliente_screen.dart';
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Añadir imports de geolocator y fideli_proximity_service si no están
if (!content.includes("import 'package:geolocator/geolocator.dart';")) {
  content = content.replace(
    "import 'widgets/fideli_tour_overlay.dart';",
    "import 'widgets/fideli_tour_overlay.dart';\nimport 'package:geolocator/geolocator.dart';\nimport 'fideli_proximity_service.dart';"
  );
}

// 2. Añadir variables de estado para proximidad
if (!content.includes('Position? _currentPosition;')) {
  const marker = "String? _statusCheckMessage;";
  const addition = `String? _statusCheckMessage;

  // Estados de Geolocalización y Proximidad de Sellos (< 500m)
  Position? _currentPosition;
  NearbyStoreMatch? _nearbyStoreMatch;
  bool _isCheckingProximity = false;
  List<Map<String, dynamic>> _cachedStores = [];`;
  content = content.replace(marker, addition);
}

// 3. Añadir métodos de verificación de proximidad y banner de sellos
if (!content.includes('Future<void> _initProximityCheck(')) {
  const marker = "void initState() {";
  const addition = `Future<void> _initProximityCheck([Map<String, dynamic>? clientData]) async {
    if (_isCheckingProximity) return;
    _isCheckingProximity = true;
    try {
      final pos = await FideliProximityService.getCurrentPosition();
      if (!mounted) return;

      if (pos != null) {
        setState(() {
          _currentPosition = pos;
        });

        if (_cachedStores.isNotEmpty && clientData != null) {
          _evaluateProximityMatch(_cachedStores, clientData);
        }
      }
    } catch (e) {
      debugPrint('📍 Error en check de proximidad: \$e');
    } finally {
      if (mounted) {
        setState(() {
          _isCheckingProximity = false;
        });
      }
    }
  }

  void _evaluateProximityMatch(List<Map<String, dynamic>> stores, Map<String, dynamic> clientData) {
    if (_currentPosition == null || stores.isEmpty) return;

    final match = FideliProximityService.checkProximityAndFindStore(
      userPosition: _currentPosition!,
      stores: stores,
      clientData: clientData,
    );

    if (match != null) {
      if (_nearbyStoreMatch?.store['id'] != match.store['id'] ||
          _nearbyStoreMatch?.missingStamps != match.missingStamps) {
        setState(() {
          _nearbyStoreMatch = match;
        });

        // Dispara la notificación push en el teléfono si está a menos de 500m (con cooldown de 4h)
        FideliProximityService.triggerProximityNotificationIfEligible(match);
      }
    } else if (_nearbyStoreMatch != null) {
      setState(() {
        _nearbyStoreMatch = null;
      });
    }
  }

  void initState() {
    super.initState();
    _initClientProfile();
    _initProximityCheck();
  }`;

  content = content.replace(
    `void initState() {\n    super.initState();\n    _initClientProfile();\n  }`,
    addition
  );
}

// 4. Conectar tiendas y proximidad en _buildTiendasTab
if (!content.includes('_cachedStores = stores;')) {
  content = content.replace(
    'final stores = snapshot.data?.docs.map((d) => d.data()).toList() ?? [];',
    `final stores = snapshot.data?.docs.map((d) {
          final data = d.data();
          data['id'] = data['id'] ?? d.id;
          return data;
        }).toList() ?? [];
        _cachedStores = stores;`
  );
}

// 5. Inyectar widget del Banner de Sellos si no existe
if (!content.includes('Widget _buildProximityStampBanner(')) {
  const bannerWidgetCode = `  // ===========================================================================
  // BANNER DE PROXIMIDAD DE SELLOS (Menos de 500m)
  // ===========================================================================
  Widget _buildProximityStampBanner(NearbyStoreMatch match, VoidCallback onOpenQr) {
    final storeName = match.store['name'] ?? 'Comercio Aliado';
    final target = match.targetStamps;
    final current = match.currentStamps;
    final missing = match.missingStamps;
    final reward = match.rewardTitle;
    final dist = match.formattedDistance;

    final lat = FideliProximityService.extractLatitude(match.store);
    final lng = FideliProximityService.extractLongitude(match.store);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFFFFF9F5),
            Color(0xFFFAF2EC),
          ],
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFDE8B76), width: 1.5),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1F9C382A),
            blurRadius: 18,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF9C382A),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.location_on_rounded, size: 12, color: Colors.white),
                    const SizedBox(width: 4),
                    Text(
                      'ESTÁS A \$dist • MENOS DE 500M',
                      style: const TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
              if (missing == 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFDCFCE7),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFF86EFAC)),
                  ),
                  child: const Text(
                    '🎉 ¡PREMIO LISTO!',
                    style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w900, color: Color(0xFF166534)),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            storeName,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: FideliColors.textMain,
              letterSpacing: -0.4,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            missing == 0
                ? '¡Ya tienes tus \$target sellos completos! Pasa por caja a retirar tu "\$reward".'
                : '¡Solo te faltan \$missing \${missing == 1 ? "sello" : "sellos"} para tu "\$reward"! Pasa hoy y sella tu tarjeta.',
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: Color(0xFF4A3B32),
              height: 1.35,
            ),
          ),
          const SizedBox(height: 14),

          // Cartilla de sellos
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFEEDCD5)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Cartilla de Sellos Digital',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: FideliColors.textMain),
                    ),
                    Text(
                      '\$current de \$target Sellos',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF9C382A),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: List.generate(target, (index) {
                    final isStamped = index < current;
                    return Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isStamped ? const Color(0xFF9C382A) : const Color(0xFFFAF8F5),
                        border: Border.all(
                          color: isStamped ? const Color(0xFF9C382A) : const Color(0xFFD6C7C2),
                          width: isStamped ? 1.5 : 1.2,
                        ),
                        boxShadow: isStamped
                            ? const [
                                BoxShadow(
                                  color: Color(0x339C382A),
                                  blurRadius: 6,
                                  offset: Offset(0, 2),
                                )
                              ]
                            : null,
                      ),
                      child: Center(
                        child: isStamped
                            ? const Icon(Icons.star_rounded, size: 18, color: Colors.white)
                            : Text(
                                '\${index + 1}',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF9CA3AF),
                                ),
                              ),
                      ),
                    );
                  }),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Botones
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: onOpenQr,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF9C382A),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 11),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      Icon(Icons.qr_code_2_rounded, size: 18),
                      SizedBox(width: 6),
                      Text(
                        'Presentar Tarjeta en Caja',
                        style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800),
                      ),
                    ],
                  ),
                ),
              ),
              if (lat != null && lng != null) ...[
                const SizedBox(width: 8),
                IconButton(
                  onPressed: () {
                    FideliProximityService.launchStoreNavigation(
                      latitude: lat,
                      longitude: lng,
                      storeName: storeName,
                    );
                  },
                  icon: const Icon(Icons.directions_rounded, color: Color(0xFF9C382A)),
                  tooltip: 'Cómo llegar',
                  style: IconButton.styleFrom(
                    backgroundColor: Colors.white,
                    side: const BorderSide(color: Color(0xFFEEDCD5)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
`;
  const insertBefore = "Widget _buildCardTusPuntosTotales(";
  content = content.replace(insertBefore, bannerWidgetCode + "\n  " + insertBefore);
}

// 6. Colocar el banner en _buildInicioTab
if (!content.includes('_buildProximityStampBanner(_nearbyStoreMatch!')) {
  const inicioGreetingMarker = "const SizedBox(height: 16),\n\n        // 1. SECCIÓN DE TUS PUNTOS TOTALES";
  const bannerInjection = `const SizedBox(height: 16),

        // 🔔 BANNER DE PROXIMIDAD DE SELLOS (< 500m)
        if (_nearbyStoreMatch != null) ...[
          _buildProximityStampBanner(_nearbyStoreMatch!, () {
            _openQrModal(
              name: name,
              docId: docId,
              points: points,
              cash: cash,
            );
          }),
          const SizedBox(height: 16),
        ],

        // 1. SECCIÓN DE TUS PUNTOS TOTALES`;
  content = content.replace(inicioGreetingMarker, bannerInjection);
}

// 7. Evaluar proximidad en el StreamBuilder de build()
if (!content.includes('if (_cachedStores.isNotEmpty) {')) {
  const evalMarker = "final bool hasAcceptedRemote = (data['hasAcceptedWelcome'] as bool?) ?? false;";
  const evalInjection = `final bool hasAcceptedRemote = (data['hasAcceptedWelcome'] as bool?) ?? false;

        // Evaluar proximidad con tiendas y sellos
        if (_cachedStores.isNotEmpty) {
          _evaluateProximityMatch(_cachedStores, data);
        }`;
  content = content.replace(evalMarker, evalInjection);
}

// Guardar archivo
fs.writeFileSync(targetFile, content, 'utf8');
console.log('Successfully patched fideli_cliente_screen.dart with Stamp Proximity logic!');

// Copiar también a la copia de trabajo local
fs.writeFileSync('fideli_cliente_screen.dart', content, 'utf8');
console.log('Successfully synchronized local fideli_cliente_screen.dart');
