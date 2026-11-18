// Datos iniciales de la Plataforma de Fidelización fidely
// Producción limpia: Sin datos dummy de tiendas, clientes ni transacciones.
// Reglas Comerciales Oficiales (RN-01 a RN-13):
// - Compra mínima: US$25 (compras mayores a US$25 acumulan puntos de saldo)
// - Acumulación: 1 punto de saldo por cada US$1 elegible por local
// - Valor de saldo: 100 puntos = US$5 de saldo para tu compra (US$0.05 por punto)
// - Canje mínimo: 100 puntos

export const DEFAULT_CONFIG = {
  companyName: "fidely",
  minPurchaseUsd: 25.0, // RN-02: compras mayores a $25 acumulan puntos
  pointsPerUsd: 1.0,     // RN-03
  pointValueUsd: 0.05,   // RN-03 (100 pts = US$5 de saldo)
  defaultCashbackPercent: 5.0, // % de retorno por defecto en cada compra (5.0%)
  // Nota: El permiso para que una tienda modifique su % se activa individualmente por tienda en cada documento store (canEditPercent)
  minRedemptionPoints: 100, // RN-08
  pointsValidityMonths: 12, // RN-09
  vesExchangeRate: 884.75, // RN-04: Tasa de cambio oficial USD/VES (DolarApi BCV)
  allowPartialReturns: true,
  // Membresías de Tiendas & Período de Prueba
  storeTrialMonths: 0, // Meses de prueba gratis (configurable por el admin: 0 = sin prueba / pago inmediato, 1 = 1 mes, etc.)
  subscriptionPriceUsd: 5.0, // $5 USD mensual a tasa oficial BCV
  subscriptionPagoMovilBank: 'Banco de Venezuela (0102)',
  subscriptionPagoMovilPhone: '04242098250',
  subscriptionPagoMovilId: 'J410679891',
  subscriptionPagoMovilHolder: 'fidely CLUB / Conecta2',
  supportWhatsapp: '584242098250',
  requireStoreApproval: true // Control para requerir o no aprobación manual de nuevas tiendas
};

// Base limpia: sin datos dummy para producción
export const INITIAL_STORES = [];
export const INITIAL_CLIENTS = [];

export const INITIAL_REWARDS = [];

// Transacciones limpias para producción
export const INITIAL_PURCHASES = [];
export const INITIAL_MOVEMENTS = [];
export const INITIAL_REDEMPTIONS = [];
