const fs = require('fs');

const targetFile = 'C:/laragon/www/my_barber_app/lib/fideli/widgets/fideli_store_scan_modal.dart';
let content = fs.readFileSync(targetFile, 'utf8');

// Add import of fideli_qr_modal if not present
if (!content.includes("import 'fideli_qr_modal.dart';")) {
  content = content.replace(
    "import 'fideli_camera_scanner_screen.dart';",
    "import 'fideli_camera_scanner_screen.dart';\nimport 'fideli_qr_modal.dart';"
  );
}

// 1. Replace State variables & _handleStoreScanned
const oldStateVars = `class _FideliStoreScanModalState extends State<FideliStoreScanModal> {
  int _step = 1; // 1: Info & Escanear, 2: Saldo & Confirmar, 3: Enviado al POS
  Map<String, dynamic>? _selectedStore;

  void _handleStoreScanned(Map<String, dynamic> store) {
    setState(() {
      _selectedStore = store;
      _step = 2;
    });
  }`;

const newStateVars = `class _FideliStoreScanModalState extends State<FideliStoreScanModal> {
  int _step = 1; // 1: Info & Escanear, 2: Saldo & Confirmar, 3: Enviado al POS
  Map<String, dynamic>? _selectedStore;
  Map<String, dynamic>? _storeCard;
  bool _isCardNewlyCreated = false;
  bool _isCreatingCard = false;

  void _handleStoreScanned(Map<String, dynamic> store) async {
    setState(() {
      _selectedStore = store;
      _isCreatingCard = true;
      _step = 2;
    });

    try {
      final res = await FideliService.ensureStoreLoyaltyCard(
        uid: FideliService.currentUid,
        clientDocId: widget.clientDocId,
        store: store,
        initialStamps: 1,
      );
      if (mounted) {
        setState(() {
          _storeCard = res['card'] as Map<String, dynamic>?;
          _isCardNewlyCreated = res['isNew'] == true;
          _isCreatingCard = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isCreatingCard = false;
        });
      }
    }
  }`;

if (content.includes(oldStateVars)) {
  content = content.replace(oldStateVars, newStateVars);
}

// 2. In Step 2, inject celebration banner & store card preview right after verified store box
const step2Target = `            const SizedBox(height: 16),

            // Tarjeta de puntos de saldo`;

const step2Addition = `            const SizedBox(height: 12),

            // 🎁 Banner de Fidelización Creada / Existente
            if (_isCardNewlyCreated) ...[
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFFEF3C7), Color(0xFFFDE68A)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFF59E0B), width: 1.2),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x1F000000),
                      blurRadius: 8,
                      offset: Offset(0, 3),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    const Icon(Icons.stars_rounded, color: Color(0xFFB45309), size: 28),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            '🎉 ¡TARJETA DE FIDELIZACIÓN CREADA!',
                            style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF92400E),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Se ha activado tu tarjeta en \${_selectedStore?[\"name\"] ?? \"este comercio\"} con tu 1er sello acreditado.',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF78350F),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ],

            // Mini Card Preview si tiene tarjeta
            if (_storeCard != null) ...[
              Builder(
                builder: (context) {
                  final target = (_storeCard!['stampsTarget'] as num?)?.toInt() ?? 6;
                  final current = (_storeCard!['currentStamps'] as num?)?.toInt() ?? 1;
                  final reward = _storeCard!['rewardTitle'] ?? 'Premio de Fidelidad';
                  final stampIcon = FideliColors.getStampIcon(_storeCard!['stampIcon']);
                  final cardColor = FideliColors.parseHexColor(_storeCard!['cardColor']);

                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      gradient: FideliColors.getStoreCardGradient(
                        cardColor: _storeCard!['cardColor'],
                        cardGradient: _storeCard!['cardGradient'],
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: cardColor.withOpacity(0.25),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 38,
                          height: 38,
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                          ),
                          child: Center(
                            child: Icon(stampIcon, color: cardColor, size: 20),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'TU TARJETA: \$current DE \$target SELLOS',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0.5,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Premio: \$reward',
                                style: TextStyle(
                                  color: Colors.white.withOpacity(0.9),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        GestureDetector(
                          onTap: () {
                            Navigator.pop(context);
                            FideliQrModal.show(
                              context,
                              clientName: widget.clientName,
                              docId: widget.clientDocId,
                              points: widget.points,
                              cashEquivalent: widget.cashEquivalent,
                              storeCard: _storeCard,
                            );
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              'Ver QR',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w900,
                                color: cardColor,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
              const SizedBox(height: 14),
            ],

            // Tarjeta de puntos de saldo`;

if (!content.includes('Banner de Fidelización Creada') && content.includes(step2Target)) {
  content = content.replace(step2Target, step2Addition);
}

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Successfully updated fideli_store_scan_modal.dart!');
