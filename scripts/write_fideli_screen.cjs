const fs = require('fs');
const path = require('path');

const targetPath = 'C:/laragon/www/my_barber_app/lib/fideli/fideli_cliente_screen.dart';

const content = `import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'fideli_theme.dart';
import 'fideli_service.dart';
import 'widgets/fideli_digital_card.dart';
import 'widgets/fideli_qr_modal.dart';
import 'widgets/fideli_store_scan_modal.dart';
import 'widgets/fideli_bottom_nav.dart';

class FideliClienteScreen extends StatefulWidget {
  final String? clientName;
  final String? clientEmail;
  final String? clientPhone;
  final String? clientCedula;

  const FideliClienteScreen({
    Key? key,
    this.clientName,
    this.clientEmail,
    this.clientPhone,
    this.clientCedula,
  }) : super(key: key);

  @override
  State<FideliClienteScreen> createState() => _FideliClienteScreenState();
}

class _FideliClienteScreenState extends State<FideliClienteScreen> {
  int _activeTabIndex = 0; // 0: Inicio, 1: Tiendas, 2: Premios, 3: Actividad
  String _tiendaCategoryFilter = 'ALL';
  String _searchTiendaQuery = '';
  final TextEditingController _searchController = TextEditingController();

  String get uid => FideliService.currentUid;

  @override
  void initState() {
    super.initState();
    _initClientProfile();
  }

  Future<void> _initClientProfile() async {
    await FideliService.ensureClientProfile(
      uid: uid,
      name: widget.clientName ?? 'KIB',
      email: widget.clientEmail ?? FideliService.currentEmail,
      phone: widget.clientPhone,
      cedula: widget.clientCedula ?? '12890432',
    );
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _openQrModal({
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
  }

  void _openStoreScanModal({
    required String name,
    required String docId,
    required int points,
    required double cash,
  }) {
    FideliStoreScanModal.show(
      context,
      clientName: name,
      docId: docId,
      points: points,
      cashEquivalent: cash,
      onShowPersonalQr: () => _openQrModal(
        name: name,
        docId: docId,
        points: points,
        cash: cash,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
      stream: FideliService.streamClientProfile(uid),
      builder: (context, snapshot) {
        final data = snapshot.data?.data() ?? {};
        final name = (data['name'] as String?) ?? widget.clientName ?? 'KIB';
        final docId = (data['docId'] as String?) ?? widget.clientCedula ?? '12890432';
        final points = (data['pointsBalance'] as num?)?.toInt() ?? 100;
        final cash = points * 0.06; // 100 pts = $6.00
        final memberSince = (data['memberSince'] as String?) ?? '2026-10-23';
        final initial = name.isNotEmpty ? name[0].toUpperCase() : 'K';

        return Scaffold(
          backgroundColor: FideliColors.bgApp,
          appBar: _buildFideliAppBar(initial),
          body: IndexedStack(
            index: _activeTabIndex,
            children: [
              _buildInicioTab(name: name, docId: docId, points: points, cash: cash, memberSince: memberSince),
              _buildTiendasTab(),
              _buildPremiosTab(name: name, docId: docId, points: points),
              _buildActividadTab(uid: uid),
            ],
          ),
          bottomNavigationBar: FideliBottomNav(
            currentIndex: _activeTabIndex,
            onTabSelected: (index) {
              setState(() {
                _activeTabIndex = index;
              });
            },
            onCenterQrTap: () => _openStoreScanModal(
              name: name,
              docId: docId,
              points: points,
              cash: cash,
            ),
            premiosBadgeCount: 3,
          ),
        );
      },
    );
  }

  /// App Bar superior idéntico a las capturas
  PreferredSizeWidget _buildFideliAppBar(String initial) {
    return AppBar(
      backgroundColor: Colors.white,
      elevation: 0,
      scrolledUnderElevation: 1,
      surfaceTintColor: Colors.transparent,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: FideliColors.textMain),
        onPressed: () => Navigator.pop(context),
        tooltip: 'Regresar a Conecta2',
      ),
      titleSpacing: 0,
      title: Row(
        children: [
          // Icono fidely en espiral
          Container(
            width: 24,
            height: 24,
            decoration: const BoxDecoration(
              color: FideliColors.primary,
              shape: BoxShape.circle,
            ),
            child: const Center(
              child: Icon(Icons.all_inclusive_rounded, size: 14, color: Colors.white),
            ),
          ),
          const SizedBox(width: 8),
          const Text(
            'fidely',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.8,
              color: FideliColors.textMain,
            ),
          ),
          const SizedBox(width: 6),
          const Text(
            'CLUB',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.2,
              color: FideliColors.primary,
            ),
          ),
        ],
      ),
      actions: [
        // Avatar circle with initial (K)
        Padding(
          padding: const EdgeInsets.only(right: 16),
          child: Center(
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                border: Border.all(color: FideliColors.borderSubtle, width: 1.5),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x0D000000),
                    blurRadius: 6,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
              child: Center(
                child: Text(
                  initial,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w900,
                    color: FideliColors.textMain,
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(1),
        child: Container(color: FideliColors.borderSubtle, height: 1),
      ),
    );
  }

  // ===========================================================================
  // TAB 0: INICIO (Screenshots 2, 3 y 4)
  // ===========================================================================
  Widget _buildInicioTab({
    required String name,
    required String docId,
    required int points,
    required double cash,
    required String memberSince,
  }) {
    final nextTargetPts = 200;
    final remainingPts = (nextTargetPts - points).clamp(0, 200);
    final progress = (points / nextTargetPts).clamp(0.0, 1.0);

    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      children: [
        // Saludo Principal
        Text(
          'Hola, $name.',
          style: const TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.6,
            color: FideliColors.textMain,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'Tus compras mayores a US\\$25 en cada local acumulan puntos de saldo disponibles para tus compras.',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w400,
            color: FideliColors.textMuted,
            height: 1.4,
          ),
        ),
        const SizedBox(height: 16),

        // Tarjeta Puntos de Bienvenida (Screenshot 3)
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: FideliColors.borderSubtle),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: FideliColors.primary,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.card_giftcard_rounded, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Puntos de Bienvenida:',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: FideliColors.textMain),
                        ),
                        Text(
                          '$points pts',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: FideliColors.textMain),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: FideliColors.emerald,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      '≈ US\\$${cash.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              const Text(
                'Puntos listos para canjear en tiendas aliadas.',
                style: TextStyle(fontSize: 12, color: FideliColors.textMuted),
              ),
              const SizedBox(height: 12),
              GestureDetector(
                onTap: () {
                  setState(() => _activeTabIndex = 1);
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: FideliColors.primary,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: const [
                      Icon(Icons.auto_awesome, color: Colors.white, size: 14),
                      SizedBox(width: 6),
                      Text(
                        'Cambiar Tienda',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Local Comercial Seleccionado Pill
        Row(
          children: const [
            Icon(Icons.storefront_outlined, size: 16, color: FideliColors.primary),
            SizedBox(width: 6),
            Text(
              'LOCAL COMERCIAL SELECCIONADO:',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5, color: FideliColors.primary),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: FideliColors.primary, width: 1.2),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Todos los Locales',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: FideliColors.textMain),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: FideliColors.primary,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '$points pts • US\\$${cash.toStringAsFixed(2)}',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.white),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Tarjeta Digital QR (Screenshot 4)
        FideliDigitalCard(
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
        const SizedBox(height: 16),

        // Card Directorio de Tiendas Aliadas (Screenshot 3)
        GestureDetector(
          onTap: () => setState(() => _activeTabIndex = 1),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: FideliColors.borderSubtle),
            ),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: const Color(0xFFC47B6A),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(Icons.store_rounded, color: Colors.white, size: 24),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'Directorio de Tiendas Aliadas',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: FideliColors.textMain),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Explora los comercios con logo oficial, categoría y recompensas exclusivas',
                        style: TextStyle(fontSize: 11, color: FideliColors.textMuted),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Row(
                  children: const [
                    Text('Ver Locales', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: FideliColors.primary)),
                    Icon(Icons.chevron_right, size: 16, color: FideliColors.primary),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Card Tus Puntos Totales (Screenshot 2)
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: FideliColors.bgCardWarm,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: FideliColors.borderCard),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: const [
                  Text(
                    'TUS PUNTOS TOTALES',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.8,
                      color: FideliColors.primary,
                    ),
                  ),
                  Text(
                    '✻ Socia Esencial',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: FideliColors.primary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(
                    '$points',
                    style: const TextStyle(
                      fontSize: 44,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -1,
                      color: FideliColors.primary,
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Text(
                    'pts',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: FideliColors.primary,
                    ),
                  ),
                ],
              ),
              Text(
                '≈ US\\$${cash.toStringAsFixed(2)} en saldo disponible en tus comercios asociados',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: FideliColors.primaryDark,
                ),
              ),
              const SizedBox(height: 16),

              // Progreso próximo canje
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: const [
                  Flexible(
                    child: Text(
                      'Tu próximo canje: Saldo para Compra US\\$12.00 (200 pts)',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: FideliColors.textMain),
                    ),
                  ),
                  Icon(Icons.card_giftcard, size: 14, color: FideliColors.primary),
                ],
              ),
              const SizedBox(height: 6),
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: LinearProgressIndicator(
                  value: progress,
                  minHeight: 7,
                  backgroundColor: const Color(0xFFE5D5C5),
                  valueColor: const AlwaysStoppedAnimation<Color>(FideliColors.primary),
                ),
              ),
              const SizedBox(height: 6),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Te faltan $remainingPts puntos', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: FideliColors.textMuted)),
                  const Text('200 pts', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: FideliColors.textMuted)),
                ],
              ),
              const SizedBox(height: 14),
              GestureDetector(
                onTap: () => setState(() => _activeTabIndex = 3),
                child: Row(
                  children: const [
                    Text(
                      'Ver movimientos de compra',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: FideliColors.primary),
                    ),
                    SizedBox(width: 4),
                    Icon(Icons.north_east_rounded, size: 13, color: FideliColors.primary),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Cupones de Canje Listos (Screenshot 4)
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: const [
                Icon(Icons.confirmation_number_outlined, size: 16, color: FideliColors.primary),
                SizedBox(width: 6),
                Text(
                  'Cupones de Canje Listos',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: FideliColors.textMain),
                ),
              ],
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
              decoration: BoxDecoration(
                color: FideliColors.bgSecondarySoft,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: FideliColors.borderSubtle),
              ),
              child: const Text(
                '3 disponibles',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: FideliColors.primary),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),

        // Voucher 1
        _buildVoucherItem(
          title: 'Cupón Descuento US\\$6.00',
          code: 'FIDELY-53681',
          onTap: () => _openQrModal(name: name, docId: docId, points: points, cash: cash),
        ),
        const SizedBox(height: 8),

        // Voucher 2
        _buildVoucherItem(
          title: 'Cupón Descuento US\\$6.00',
          code: 'FIDELY-65448',
          onTap: () => _openQrModal(name: name, docId: docId, points: points, cash: cash),
        ),
        const SizedBox(height: 16),

        // Card Puntos de Saldo por Cada Local (Screenshot 2)
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: FideliColors.borderSubtle),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: const [
                      Icon(Icons.storefront_outlined, size: 18, color: FideliColors.primary),
                      SizedBox(width: 8),
                      Text(
                        'Tus Puntos de Saldo\\npor Cada Local',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: FideliColors.textMain),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: FideliColors.bgSecondarySoft,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text(
                      'Independientes',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: FideliColors.primary),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              const Text(
                'Tus compras mayores a US\\$25 acumulan puntos de saldo disponibles para sumar a tus compras en ese local.',
                style: TextStyle(fontSize: 12, color: FideliColors.textMuted, height: 1.35),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildVoucherItem({
    required String title,
    required String code,
    required VoidCallback onTap,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: FideliColors.borderSubtle),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: FideliColors.textMain)),
              const SizedBox(height: 2),
              Text(code, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: FideliColors.textMuted)),
            ],
          ),
          GestureDetector(
            onTap: onTap,
            child: Row(
              children: const [
                Text(
                  'Mostrar QR',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: FideliColors.primary),
                ),
                SizedBox(width: 4),
                Icon(Icons.arrow_forward_rounded, size: 14, color: FideliColors.primary),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // TAB 1: TIENDAS ALÍADAS (Screenshots 1 y 5)
  // ===========================================================================
  Widget _buildTiendasTab() {
    return StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
      stream: FideliService.streamStores(),
      builder: (context, snapshot) {
        final stores = snapshot.data?.docs.map((d) => d.data()).toList() ?? [];

        // Filtrar por categoría y búsqueda
        final filtered = stores.where((s) {
          final cat = (s['category'] as String?) ?? '';
          final name = (s['name'] as String?) ?? '';
          final matchesCat = _tiendaCategoryFilter == 'ALL' || cat.toLowerCase() == _tiendaCategoryFilter.toLowerCase();
          final matchesSearch = _searchTiendaQuery.isEmpty || name.toLowerCase().contains(_searchTiendaQuery.toLowerCase());
          return matchesCat && matchesSearch;
        }).toList();

        return ListView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
          children: [
            // Banner Comercios Verificados (Screenshot 1)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: FideliColors.borderSubtle),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: FideliColors.bgSecondarySoft,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Icon(Icons.auto_awesome, size: 12, color: FideliColors.primary),
                        SizedBox(width: 4),
                        Text(
                          'COMERCIOS VERIFICADOS • FIDELY CLUB',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.6,
                            color: FideliColors.primary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Directorio de Tiendas\\nAliadas',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.6,
                      color: FideliColors.textMain,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Explora las tiendas oficiales del Club. Cada compra mayor a US\\$25 acumula el 3% en saldo que puedes canjear de forma exclusiva en el catálogo de cada comercio participante.',
                    style: TextStyle(fontSize: 12.5, color: FideliColors.textMuted, height: 1.4),
                  ),
                  const SizedBox(height: 14),

                  // Regla RN-08
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: FideliColors.bgApp,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: FideliColors.borderSubtle),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text('💡', style: TextStyle(fontSize: 16)),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Regla RN-08: Tus puntos están particionados por local. El saldo acumulado en una tienda pertenece a esa sucursal para garantizar el retorno de beneficios.',
                            style: TextStyle(fontSize: 11, color: FideliColors.textMain, height: 1.35, fontWeight: FontWeight.w500),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Input de Búsqueda
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: FideliColors.borderSubtle),
              ),
              child: TextField(
                controller: _searchController,
                onChanged: (val) {
                  setState(() => _searchTiendaQuery = val);
                },
                decoration: const InputDecoration(
                  hintText: 'Buscar comercio por nombre, centro com...',
                  hintStyle: TextStyle(fontSize: 13, color: FideliColors.textDim),
                  prefixIcon: Icon(Icons.search, size: 20, color: FideliColors.primary),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Filtros de categoría en pastillas
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              child: Row(
                children: [
                  _buildCategoryFilterPill(
                    label: 'Todas las Tiendas',
                    count: stores.length,
                    icon: Icons.store,
                    categoryKey: 'ALL',
                  ),
                  const SizedBox(width: 8),
                  _buildCategoryFilterPill(
                    label: 'Boutique / Moda',
                    count: stores.where((s) => (s['category'] ?? '').toString().contains('Moda') || (s['category'] ?? '').toString().contains('Boutique')).length,
                    icon: Icons.checkroom_rounded,
                    categoryKey: 'Boutique / Moda',
                  ),
                  const SizedBox(width: 8),
                  _buildCategoryFilterPill(
                    label: 'Electrónica & Tech',
                    count: stores.where((s) => (s['category'] ?? '').toString().contains('Tech')).length,
                    icon: Icons.devices_rounded,
                    categoryKey: 'Electrónica & Tech',
                  ),
                  const SizedBox(width: 8),
                  _buildCategoryFilterPill(
                    label: 'Supermercados',
                    count: stores.where((s) => (s['category'] ?? '').toString().contains('Super')).length,
                    icon: Icons.shopping_cart_outlined,
                    categoryKey: 'Supermercados',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // Lista o Empty State (Screenshot 5)
            if (filtered.isEmpty)
              Container(
                padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: FideliColors.borderSubtle),
                ),
                child: Column(
                  children: [
                    Container(
                      width: 58,
                      height: 58,
                      decoration: const BoxDecoration(
                        color: FideliColors.bgSecondarySoft,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.storefront_outlined, color: FideliColors.primary, size: 28),
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      'No se encontraron tiendas',
                      style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: FideliColors.textMain),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'No hay comercios que coincidan con "\$_searchTiendaQuery" en la categoría seleccionada.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 12, color: FideliColors.textMuted),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () {
                        setState(() {
                          _tiendaCategoryFilter = 'ALL';
                          _searchTiendaQuery = '';
                          _searchController.clear();
                        });
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: FideliColors.bgSecondarySoft,
                        foregroundColor: FideliColors.primary,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                      ),
                      child: const Text('Restablecer filtros', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                    ),
                  ],
                ),
              )
            else
              ...filtered.map((s) => _buildStoreCard(s)).toList(),
          ],
        );
      },
    );
  }

  Widget _buildCategoryFilterPill({
    required String label,
    required int count,
    required IconData icon,
    required String categoryKey,
  }) {
    final bool isSelected = _tiendaCategoryFilter == categoryKey;

    return GestureDetector(
      onTap: () {
        setState(() => _tiendaCategoryFilter = categoryKey);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? FideliColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: isSelected ? FideliColors.primary : FideliColors.borderSubtle,
          ),
        ),
        child: Row(
          children: [
            Icon(icon, size: 14, color: isSelected ? Colors.white : FideliColors.primary),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: isSelected ? Colors.white : FideliColors.textMain,
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
              decoration: BoxDecoration(
                color: isSelected ? Colors.white.withOpacity(0.2) : FideliColors.bgApp,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '$count',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  color: isSelected ? Colors.white : FideliColors.textMuted,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStoreCard(Map<String, dynamic> store) {
    final name = store['name'] ?? 'Comercio Aliado';
    final category = store['category'] ?? 'Tienda';
    final city = store['city'] ?? 'Caracas';

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
                Text('$category • $city', style: const TextStyle(fontSize: 12, color: FideliColors.textMuted)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: FideliColors.bgSecondarySoft,
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Text('1 pt = $1', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: FideliColors.primary)),
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // TAB 2: PREMIOS Y CATÁLOGO
  // ===========================================================================
  Widget _buildPremiosTab({
    required String name,
    required String docId,
    required int points,
  }) {
    return StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
      stream: FideliService.streamRewards(),
      builder: (context, snapshot) {
        final docs = snapshot.data?.docs.map((d) => d.data()).toList() ?? [];

        // Recompensas fallback si aún no hay en Firestore
        final rewards = docs.isNotEmpty
            ? docs
            : [
                {
                  'id': 'REW-01',
                  'title': 'Puntos de Saldo US\\$6.00',
                  'description': 'Saldo directo a tu favor al momento de pagar en caja (Canje Mínimo).',
                  'pointsCost': 100,
                  'nominalValueUsd': 6.0,
                  'category': 'Saldo en Compra',
                },
                {
                  'id': 'REW-02',
                  'title': 'Puntos de Saldo US\\$12.00',
                  'description': 'Saldo directo para compras mayores en comercios oficiales.',
                  'pointsCost': 200,
                  'nominalValueUsd': 12.0,
                  'category': 'Saldo en Compra',
                },
                {
                  'id': 'REW-03',
                  'title': 'Gift Card Premium US\\$21.00',
                  'description': 'Cupón premium transferible o canjeable para consentirte.',
                  'pointsCost': 350,
                  'nominalValueUsd': 21.0,
                  'category': 'Gift Card',
                },
                {
                  'id': 'REW-04',
                  'title': 'Puntos de Saldo VIP US\\$30.00',
                  'description': 'Máximo saldo directo para compras grandes en tiendas aliadas.',
                  'pointsCost': 500,
                  'nominalValueUsd': 30.0,
                  'category': 'Saldo en Compra',
                },
              ];

        return ListView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
          children: [
            const Text(
              'Catálogo de Recompensas',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: FideliColors.textMain, letterSpacing: -0.6),
            ),
            const SizedBox(height: 4),
            Text(
              'Tienes $points pts acumulados para canjear de inmediato.',
              style: const TextStyle(fontSize: 13, color: FideliColors.textMuted),
            ),
            const SizedBox(height: 16),

            ...rewards.map((r) {
              final cost = (r['pointsCost'] as num?)?.toInt() ?? 100;
              final canRedeem = points >= cost;

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
                      child: const Icon(Icons.card_giftcard, color: FideliColors.primary, size: 24),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            r['title'] ?? 'Premio',
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: FideliColors.textMain),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            r['description'] ?? '',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 11, color: FideliColors.textMuted),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: canRedeem
                          ? () async {
                              final success = await FideliService.requestRedemption(
                                uid: uid,
                                clientName: name,
                                clientDocId: docId,
                                reward: r,
                                storeId: 'ALL',
                                storeName: 'fidely CLUB',
                                currentPoints: points,
                              );
                              if (success && mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('¡Cupón generado con éxito! Puedes verlo en tu pantalla de Inicio.'),
                                    backgroundColor: FideliColors.emerald,
                                  ),
                                );
                              }
                            }
                          : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: FideliColors.primary,
                        foregroundColor: Colors.white,
                        disabledBackgroundColor: FideliColors.bgApp,
                        disabledForegroundColor: FideliColors.textDim,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      child: Text('$cost pts', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
                    ),
                  ],
                ),
              );
            }).toList(),
          ],
        );
      },
    );
  }

  // ===========================================================================
  // TAB 3: ACTIVIDAD E HISTORIAL
  // ===========================================================================
  Widget _buildActividadTab({required String uid}) {
    return StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
      stream: FideliService.streamClientMovements(uid),
      builder: (context, snapshot) {
        final docs = snapshot.data?.docs.map((d) => d.data()).toList() ?? [];

        return ListView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
          children: [
            const Text(
              'Actividad y Movimientos',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: FideliColors.textMain, letterSpacing: -0.6),
            ),
            const SizedBox(height: 4),
            const Text(
              'Historial auditable de puntos acumulados y canjeados.',
              style: TextStyle(fontSize: 13, color: FideliColors.textMuted),
            ),
            const SizedBox(height: 16),

            if (docs.isEmpty)
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: FideliColors.borderSubtle),
                ),
                child: Column(
                  children: const [
                    Icon(Icons.history, size: 40, color: FideliColors.textMuted),
                    SizedBox(height: 10),
                    Text(
                      'Sin movimientos registrados',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: FideliColors.textMain),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Tus compras mayores a US\\$25 en tiendas aliadas aparecerán aquí.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12, color: FideliColors.textMuted),
                    ),
                  ],
                ),
              )
            else
              ...docs.map((m) {
                final pts = (m['points'] as num?)?.toInt() ?? 0;
                final isPositive = pts >= 0;
                final concept = m['concept'] ?? 'Movimiento de saldo';
                final store = m['storeName'] ?? 'fidely CLUB';
                final date = m['date'] ?? '';

                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: FideliColors.borderSubtle),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: isPositive ? FideliColors.emeraldBg : FideliColors.primarySoft,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          isPositive ? Icons.add_rounded : Icons.remove_rounded,
                          color: isPositive ? FideliColors.emerald : FideliColors.primary,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(concept, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: FideliColors.textMain)),
                            const SizedBox(height: 2),
                            Text('$store • $date', style: const TextStyle(fontSize: 11, color: FideliColors.textMuted)),
                          ],
                        ),
                      ),
                      Text(
                        '\${isPositive ? "+" : ""}\$pts pts',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: isPositive ? FideliColors.emerald : FideliColors.primary,
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
          ],
        );
      },
    );
  }
}
`;

fs.writeFileSync(targetPath, content, 'utf8');
console.log('fideli_cliente_screen.dart written successfully');
