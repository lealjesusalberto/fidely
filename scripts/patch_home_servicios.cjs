const fs = require('fs');

const file = 'C:/laragon/www/my_barber_app/lib/widgets/home_servicios_screen.dart';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('FideliClub')) {
  const rentarIdx = content.indexOf("servicioId: 'Renta',");
  if (rentarIdx !== -1) {
    const endOfRentar = content.indexOf('),', rentarIdx) + 2;
    const addition = '\n        const SizedBox(height: 14),\n' +
      '        _buildServiceCard(\n' +
      "          title: 'Fideli Club',\n" +
      "          badgeText: 'Puntos & Premios',\n" +
      '          badgeColorText: const Color(0xFF9C382A),\n' +
      '          badgeColorBg: const Color(0xFFFAF4EE),\n' +
      '          badgeColorBorder: const Color(0xFFEDE2D5),\n' +
      "          description: 'Acumula saldo en compras, canjea premios y presenta tu tarjeta digital QR.',\n" +
      "          imageUrl: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=500&auto=format&fit=crop&q=60',\n" +
      "          servicioId: 'FideliClub',\n" +
      '        ),';

    content = content.slice(0, endOfRentar) + addition + content.slice(endOfRentar);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Successfully added Fideli Club to home_servicios_screen.dart');
  } else {
    console.log('Could not find Rentar in home_servicios_screen.dart');
  }
} else {
  console.log('FideliClub already exists');
}
