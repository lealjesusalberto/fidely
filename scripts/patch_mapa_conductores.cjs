const fs = require('fs');

const file = 'C:/laragon/www/my_barber_app/lib/mapa_conductores_screen.dart';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes("import 'fideli/fideli_cliente_screen.dart';")) {
  content = "import 'fideli/fideli_cliente_screen.dart';\n" + content;
}

if (!content.includes('// Tab Fideli Club')) {
  const marker = "'Rentar',";
  const markerIdx = content.indexOf(marker);
  if (markerIdx !== -1) {
    const endRowIdx = content.indexOf('],', markerIdx);
    const endOfContainer = content.indexOf('),', endRowIdx);
    const endOfExpanded = content.indexOf('),', endOfContainer + 2);
    const endOfGest = content.indexOf('),', endOfExpanded + 2);

    const fideliTab = '\n            const SizedBox(width: 8),\n' +
      '            // Tab Fideli Club\n' +
      '            Expanded(\n' +
      '              child: GestureDetector(\n' +
      '                onTap: () {\n' +
      '                  Navigator.push(\n' +
      '                    context,\n' +
      '                    MaterialPageRoute(\n' +
      '                      builder: (context) => const FideliClienteScreen(\n' +
      "                        clientName: 'KIB',\n" +
      '                      ),\n' +
      '                    ),\n' +
      '                  );\n' +
      '                },\n' +
      '                child: Container(\n' +
      '                  padding: const EdgeInsets.symmetric(vertical: 10),\n' +
      '                  decoration: BoxDecoration(\n' +
      '                    color: const Color(0xFF9C382A),\n' +
      '                    borderRadius: BorderRadius.circular(25),\n' +
      '                  ),\n' +
      '                  child: Row(\n' +
      '                    mainAxisAlignment: MainAxisAlignment.center,\n' +
      '                    children: const [\n' +
      '                      Icon(Icons.card_giftcard, color: Colors.white, size: 16),\n' +
      '                      SizedBox(width: 4),\n' +
      '                      Text(\n' +
      "                        'Club',\n" +
      '                        style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),\n' +
      '                      ),\n' +
      '                    ],\n' +
      '                  ),\n' +
      '                ),\n' +
      '              ),\n' +
      '            ),';

    // Find the closing of Expanded for Rentar
    const rentarExpandedEnd = content.indexOf('            ),', markerIdx);
    if (rentarExpandedEnd !== -1) {
      const insertPos = rentarExpandedEnd + '            ),'.length;
      content = content.slice(0, insertPos) + fideliTab + content.slice(insertPos);
      fs.writeFileSync(file, content, 'utf8');
      console.log('Successfully added Fideli Club tab to mapa_conductores_screen.dart');
    }
  }
} else {
  console.log('Fideli Club tab already present');
}
