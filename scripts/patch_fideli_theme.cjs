const fs = require('fs');

const targetFile = 'C:/laragon/www/my_barber_app/lib/fideli/fideli_theme.dart';
let content = fs.readFileSync(targetFile, 'utf8');

const helperMethods = `
  // ===========================================================================
  // STORE LOYALTY CARD HELPERS & STAMPS
  // ===========================================================================

  /// Parsea cualquier color hexadecimal (ej. '#9C382A', '9C382A', '#DE8B76', etc.)
  static Color parseHexColor(dynamic hex, {Color defaultColor = primary}) {
    if (hex == null) return defaultColor;
    if (hex is Color) return hex;
    String hexStr = hex.toString().trim().replaceAll('#', '');
    if (hexStr.length == 6) {
      hexStr = 'FF$hexStr';
    }
    if (hexStr.length == 8) {
      final val = int.tryParse(hexStr, radix: 16);
      if (val != null) return Color(val);
    }
    return defaultColor;
  }

  /// Retorna el icono segun el identificador de sello de la tienda
  static IconData getStampIcon(String? iconKey) {
    switch (iconKey?.toLowerCase().trim()) {
      case 'scissors':
        return Icons.content_cut_rounded;
      case 'coffee':
        return Icons.local_cafe_rounded;
      case 'utensils':
        return Icons.restaurant_rounded;
      case 'shopping-bag':
      case 'shopping_bag':
        return Icons.shopping_bag_rounded;
      case 'gem':
      case 'diamond':
        return Icons.diamond_rounded;
      case 'heart':
        return Icons.favorite_rounded;
      case 'crown':
        return Icons.workspace_premium_rounded;
      case 'gift':
        return Icons.card_giftcard_rounded;
      case 'star':
      default:
        return Icons.star_rounded;
    }
  }

  /// Construye un gradiente premium a partir de los colores de la tienda
  static LinearGradient getStoreCardGradient({dynamic cardColor, dynamic cardGradient}) {
    Color col1 = parseHexColor(cardColor, defaultColor: primary);
    Color col2 = parseHexColor(cardGradient, defaultColor: primaryLight);
    
    // Si ambos colores son iguales o muy similares, agregamos contraste
    if (col1.value == col2.value) {
      col2 = Color.alphaBlend(Colors.black.withOpacity(0.35), col1);
    }
    return LinearGradient(
      colors: [col1, col2],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    );
  }
`;

if (!content.includes('parseHexColor')) {
  // Insert before the last closing brace of FideliColors
  const lastBraceIndex = content.lastIndexOf('}');
  content = content.slice(0, lastBraceIndex) + helperMethods + '\n}\n';
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('Successfully updated fideli_theme.dart with store color and stamp helpers!');
} else {
  console.log('fideli_theme.dart already contains parseHexColor.');
}
