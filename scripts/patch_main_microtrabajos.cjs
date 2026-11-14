const fs = require('fs');

const file = 'C:/laragon/www/my_barber_app/lib/main_microtrabajos_screen.dart';
let content = fs.readFileSync(file, 'utf8');

// 1. Add import if not present
if (!content.includes("import 'fideli/fideli_cliente_screen.dart';")) {
  content = "import 'fideli/fideli_cliente_screen.dart';\n" + content;
}

// 2. Patch onServicioSeleccionado
const targetHandler = "onServicioSeleccionado: (servicio) {";
const replacementHandler = `onServicioSeleccionado: (servicio) {
                              if (servicio == 'FideliClub') {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => FideliClienteScreen(
                                      clientName: _currentUser?.name ?? 'KIB',
                                      clientEmail: _currentUser?.email,
                                      clientPhone: _currentUser?.telefono,
                                      clientCedula: _currentUser?.numeroCedula ?? _currentUser?.cedula,
                                    ),
                                  ),
                                );
                                return;
                              }`;

if (content.includes(targetHandler) && !content.includes("if (servicio == 'FideliClub')")) {
  content = content.replace(targetHandler, replacementHandler);
}

// 3. Also patch onGiftTap to open FideliClienteScreen
const targetGift = `onGiftTap: () {
                              if (_catalogoPremiosHabilitado) {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => CatalogoPremiosScreen(),
                                  ),
                                );
                              }
                            },`;

const replacementGift = `onGiftTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => FideliClienteScreen(
                                    clientName: _currentUser?.name ?? 'KIB',
                                    clientEmail: _currentUser?.email,
                                    clientPhone: _currentUser?.telefono,
                                    clientCedula: _currentUser?.numeroCedula ?? _currentUser?.cedula,
                                  ),
                                ),
                              );
                            },`;

if (content.includes(targetGift)) {
  content = content.replace(targetGift, replacementGift);
}

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully patched main_microtrabajos_screen.dart');
