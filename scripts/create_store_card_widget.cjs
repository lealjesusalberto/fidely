const fs = require('fs');

const targetFile = 'C:/laragon/www/my_barber_app/lib/fideli/widgets/fideli_store_card_widget.dart';

const widgetCode = `import 'package:flutter/material.dart';
import '../fideli_theme.dart';

class FideliStoreCardWidget extends StatelessWidget {
  final Map<String, dynamic> card;
  final VoidCallback? onPresentCard;

  const FideliStoreCardWidget({
    Key? key,
    required this.card,
    this.onPresentCard,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final storeName = card['storeName'] ?? 'Comercio Aliado';
    final storeCategory = card['storeCategory'] ?? 'Tienda Aliada';
    final cardColorHex = card['cardColor'];
    final cardGradientHex = card['cardGradient'];
    final logoUrl = card['logo'] as String?;
    final stampIconKey = card['stampIcon'] as String?;
    final targetStamps = (card['stampsTarget'] as num?)?.toInt() ?? 6;
    final currentStamps = (card['currentStamps'] as num?)?.toInt() ?? 0;
    final rewardTitle = card['rewardTitle'] ?? 'Premio de Fidelidad';
    final missing = (targetStamps - currentStamps).clamp(0, targetStamps);
    final isComplete = currentStamps >= targetStamps;

    final primaryCardColor = FideliColors.parseHexColor(cardColorHex, defaultColor: FideliColors.primary);
    final gradient = FideliColors.getStoreCardGradient(
      cardColor: cardColorHex,
      cardGradient: cardGradientHex,
    );
    final stampIconData = FideliColors.getStampIcon(stampIconKey);

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withOpacity(0.25), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: primaryCardColor.withOpacity(0.35),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Stack(
          children: [
            // Decorative background stamp watermark
            Positioned(
              right: -25,
              bottom: -25,
              child: Opacity(
                opacity: 0.08,
                child: Icon(
                  stampIconData,
                  size: 160,
                  color: Colors.white,
                ),
              ),
            ),

            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top Row: Logo, Name & Badge
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // Store Logo / Avatar
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          boxShadow: const [
                            BoxShadow(
                              color: Colors.black26,
                              blurRadius: 6,
                              offset: Offset(0, 2),
                            ),
                          ],
                        ),
                        child: ClipOval(
                          child: logoUrl != null && logoUrl.isNotEmpty
                              ? Image.network(
                                  logoUrl,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => Center(
                                    child: Icon(stampIconData, color: primaryCardColor, size: 24),
                                  ),
                                )
                              : Center(
                                  child: Icon(stampIconData, color: primaryCardColor, size: 24),
                                ),
                        ),
                      ),
                      const SizedBox(width: 12),

                      // Store Title & Category
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              storeName,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.w900,
                                letterSpacing: -0.3,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              storeCategory.toUpperCase(),
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.85),
                                fontSize: 10.5,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.8,
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Status Pill
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: isComplete
                              ? const Color(0xFFDCFCE7)
                              : Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isComplete
                                ? const Color(0xFF86EFAC)
                                : Colors.white.withOpacity(0.35),
                          ),
                        ),
                        child: Text(
                          isComplete ? '🎉 ¡COMPLETA!' : '$currentStamps / $target SELLOS',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.4,
                            color: isComplete ? const Color(0xFF166534) : Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 18),

                  // STAMP GRID (Sellos dinámicos)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.18),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: Colors.white.withOpacity(0.15)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Cartilla de Sellos Digital',
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.9),
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            Text(
                              isComplete
                                  ? '¡Retira tu premio en caja!'
                                  : 'Faltan $missing para el premio',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),

                        // Stamps wrap
                        Wrap(
                          spacing: 10,
                          runSpacing: 10,
                          children: List.generate(targetStamps, (index) {
                            final isStamped = index < currentStamps;
                            return Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: isStamped ? Colors.white : Colors.white.withOpacity(0.12),
                                border: Border.all(
                                  color: isStamped ? Colors.white : Colors.white.withOpacity(0.35),
                                  width: isStamped ? 2 : 1.2,
                                ),
                                boxShadow: isStamped
                                    ? [
                                        BoxShadow(
                                          color: Colors.black.withOpacity(0.25),
                                          blurRadius: 6,
                                          offset: const Offset(0, 2),
                                        ),
                                      ]
                                    : null,
                              ),
                              child: Center(
                                child: isStamped
                                    ? Icon(
                                        stampIconData,
                                        size: 20,
                                        color: primaryCardColor,
                                      )
                                    : Text(
                                        '\${index + 1}',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          color: Colors.white.withOpacity(0.6),
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

                  // Premio Box
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.white.withOpacity(0.2)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.card_giftcard_rounded, color: Colors.white, size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Premio: $rewardTitle',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),

                  if (onPresentCard != null) ...[
                    const SizedBox(height: 14),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: onPresentCard,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: primaryCardColor,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.qr_code_2_rounded, size: 18, color: primaryCardColor),
                            const SizedBox(width: 6),
                            Text(
                              'Presentar Tarjeta en Caja',
                              style: TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w900,
                                color: primaryCardColor,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
`;

fs.writeFileSync(targetFile, widgetCode, 'utf8');
console.log('Successfully created FideliStoreCardWidget at ' + targetFile);
