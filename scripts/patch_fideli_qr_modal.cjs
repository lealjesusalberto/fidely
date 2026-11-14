const fs = require('fs');

const targetFile = 'C:/laragon/www/my_barber_app/lib/fideli/widgets/fideli_qr_modal.dart';

const code = `import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../fideli_theme.dart';

class FideliQrModal extends StatelessWidget {
  final String clientName;
  final String docId;
  final int points;
  final double cashEquivalent;
  final Map<String, dynamic>? storeCard;

  const FideliQrModal({
    Key? key,
    required this.clientName,
    required this.docId,
    required this.points,
    required this.cashEquivalent,
    this.storeCard,
  }) : super(key: key);

  static void show(
    BuildContext context, {
    required String clientName,
    required String docId,
    required int points,
    required double cashEquivalent,
    Map<String, dynamic>? storeCard,
  }) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => FideliQrModal(
        clientName: clientName,
        docId: docId,
        points: points,
        cashEquivalent: cashEquivalent,
        storeCard: storeCard,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final qrData = 'FIDELY-\$docId';
    final hasStore = storeCard != null;
    final storeName = storeCard?['storeName'] ?? '';
    final cardColorHex = storeCard?['cardColor'];
    final cardGradientHex = storeCard?['cardGradient'];
    final stampIconKey = storeCard?['stampIcon'] as String?;
    final targetStamps = (storeCard?['stampsTarget'] as num?)?.toInt() ?? 6;
    final currentStamps = (storeCard?['currentStamps'] as num?)?.toInt() ?? 0;
    final rewardTitle = storeCard?['rewardTitle'] ?? 'Premio de Fidelidad';
    final isComplete = currentStamps >= targetStamps;

    final primaryColor = hasStore
        ? FideliColors.parseHexColor(cardColorHex, defaultColor: FideliColors.primary)
        : FideliColors.primary;
    final stampIcon = FideliColors.getStampIcon(stampIconKey);

    return Container(
      padding: const EdgeInsets.only(top: 14, left: 24, right: 24, bottom: 34),
      decoration: const BoxDecoration(
        color: FideliColors.bgSurface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
        boxShadow: [
          BoxShadow(
            color: Color(0x33000000),
            blurRadius: 30,
            offset: Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          Container(
            width: 44,
            height: 5,
            decoration: BoxDecoration(
              color: const Color(0xFFE5E7EB),
              borderRadius: BorderRadius.circular(10),
            ),
          ),
          const SizedBox(height: 18),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    hasStore ? 'Tarjeta: \$storeName' : 'Mi Tarjeta Digital QR',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: FideliColors.textMain,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '\$clientName • DNI: \$docId',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: primaryColor,
                    ),
                  ),
                ],
              ),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close_rounded, color: FideliColors.textMuted),
              ),
            ],
          ),

          // If store card context, show store card mini progress banner
          if (hasStore) ...[
            const SizedBox(height: 14),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                gradient: FideliColors.getStoreCardGradient(
                  cardColor: cardColorHex,
                  cardGradient: cardGradientHex,
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: primaryColor.withOpacity(0.25),
                    blurRadius: 10,
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
                      child: Icon(stampIcon, color: primaryColor, size: 20),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isComplete ? '🎉 ¡PREMIO DESBLOQUEADO!' : 'LLEVAS \$currentStamps DE \$targetStamps SELLOS',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Premio: \$rewardTitle',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.9),
                            fontSize: 11.5,
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 16),

          // Giant QR Box
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: hasStore ? primaryColor.withOpacity(0.4) : FideliColors.borderSubtle,
                width: 2,
              ),
              boxShadow: [
                BoxShadow(
                  color: primaryColor.withOpacity(0.12),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Column(
              children: [
                QrImageView(
                  data: qrData,
                  version: QrVersions.auto,
                  size: 220.0,
                  backgroundColor: Colors.white,
                  embeddedImage: const AssetImage('assets/fidely.png'),
                  embeddedImageStyle: const QrEmbeddedImageStyle(
                    size: Size(34, 34),
                  ),
                  eyeStyle: const QrEyeStyle(
                    eyeShape: QrEyeShape.square,
                    color: Color(0xFF1C1917),
                  ),
                  dataModuleStyle: const QrDataModuleStyle(
                    dataModuleShape: QrDataModuleShape.square,
                    color: Color(0xFF1C1917),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  qrData,
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 2,
                    color: Color(0xFF1C1917),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Puntos y saldo pill
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: FideliColors.bgSecondarySoft,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: FideliColors.borderSubtle),
            ),
            child: Text(
              '\$points pts acumulados • US\\\\\${\$cashEquivalent.toStringAsFixed(2)} disponibles',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: primaryColor,
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Instruction tip
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.qr_code_scanner_rounded, size: 16, color: FideliColors.textMuted),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  hasStore
                      ? 'Presenta este código en caja de \$storeName para sumar sellos y canjear saldo.'
                      : 'Presenta esta pantalla al cajero para sumar o canjear saldo en tu compra.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 12,
                    color: FideliColors.textMuted,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}
`.replace(/\\\\\${\$cashEquivalent\.toStringAsFixed\(2\)}/, '${cashEquivalent.toStringAsFixed(2)}');

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Successfully updated FideliQrModal with storeCard support!');
