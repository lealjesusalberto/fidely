// Utilidades para Gestión de Suscripciones y Período de Prueba (Configurable por el Administrador)
// Regla: Las tiendas tienen N meses gratis según la configuración global (0 = sin prueba, 1 = 1 mes, 3 = 3 meses).
// Al vencerse la prueba se bloquea el terminal POS y deben pagar $5 USD mensuales a tasa oficial BCV.

export const SUBSCRIPTION_PRICE_USD = 5.0; // $5 USD mensual por defecto
export const TRIAL_MONTHS = 3; // 3 meses por defecto si no está configurado
export const TRIAL_DAYS = 90;

/**
 * Normaliza cualquier formato de fecha (Firestore Timestamp, ISO string, epoch) a Date.
 */
export function parseDateSafe(val) {
  if (!val) return null;
  if (typeof val?.toDate === 'function') {
    return val.toDate();
  }
  if (val?.seconds) {
    return new Date(val.seconds * 1000);
  }
  if (val?._seconds) {
    return new Date(val._seconds * 1000);
  }
  if (typeof val === 'number') {
    return new Date(val);
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Calcula el estado de suscripción y acceso al dashboard para una tienda.
 * 
 * @param {Object} store - Objeto de la tienda
 * @param {Object} config - Configuración global de la plataforma
 * @param {Object} dolarRateInfo - Información de tasa de cambio oficial
 * @returns {Object} Detalles de suscripción, estado y bloqueo
 */
export function getStoreSubscriptionDetails(store, config = {}, dolarRateInfo = null) {
  const configuredTrialMonths = config?.storeTrialMonths !== undefined 
    ? parseInt(config.storeTrialMonths, 10) 
    : TRIAL_MONTHS;
  const configuredTrialDays = Math.max(0, configuredTrialMonths * 30);
  const priceUsd = parseFloat(config?.subscriptionPriceUsd ?? SUBSCRIPTION_PRICE_USD) || 5.0;

  if (!store) {
    return {
      isBlocked: false,
      hasAccess: true,
      statusLabel: 'UNKNOWN',
      isInTrial: configuredTrialDays > 0,
      trialDaysRemaining: configuredTrialDays,
      trialMonths: configuredTrialMonths,
      isExempt: false,
      isPaidActive: false,
      priceUsd: priceUsd,
      rate: 1,
      priceVes: priceUsd,
      formattedVes: 'Bs. 0,00'
    };
  }

  const now = new Date();

  // 1. Fecha de Registro
  const createdAtDate = parseDateSafe(store.createdAt || store.registeredAt) || now;

  // 2. Fecha Límite de Prueba Gratuita:
  let trialEndsAtDate = parseDateSafe(store.trialEndsAt);

  // ¿La tienda fue registrada explícitamente sin prueba o requiere pago inmediato?
  const isExplicitZeroTrial = (store.trialMonths !== undefined && store.trialMonths !== null && parseInt(store.trialMonths, 10) === 0) ||
    (store.subscriptionStatus === 'UNPAID' && (!trialEndsAtDate || trialEndsAtDate.getTime() <= now.getTime()));

  // ¿La tienda cuenta con una fecha de prueba futura previamente asignada (tiendas ya existentes con prueba activa)?
  const hasValidFutureTrial = trialEndsAtDate && trialEndsAtDate.getTime() > now.getTime() && !isExplicitZeroTrial;

  // Determinar meses de prueba:
  const hasStoreTrialMonths = store.trialMonths !== undefined && store.trialMonths !== null && store.trialMonths !== '';
  const storeTrialMonths = isExplicitZeroTrial 
    ? 0 
    : (hasStoreTrialMonths ? Math.max(0, parseInt(store.trialMonths, 10) || 0) : configuredTrialMonths);

  if (isExplicitZeroTrial) {
    // Si la tienda fue registrada con 0 meses, NO tiene período de cortesía
    trialEndsAtDate = createdAtDate;
  } else if (hasValidFutureTrial) {
    // Tienda existente con prueba válida otorgada previamente: se preserva intacta su fecha de fin de prueba
  } else if (!store.customTrialEndsAt) {
    // Si la tienda debería tener prueba según la configuración global (> 0 meses) pero no la tiene o estaba corrupta:
    if (storeTrialMonths > 0) {
      const storeTrialDays = storeTrialMonths * 30;
      trialEndsAtDate = new Date(createdAtDate.getTime() + (storeTrialDays * 24 * 60 * 60 * 1000));
    } else {
      trialEndsAtDate = createdAtDate;
    }
  }

  // 3. Exención de Pago (Concedida manualmente por el Super Administrador)
  const isExempt = Boolean(store.subscriptionExempt);

  // 4. Pago Activo de Suscripción
  const paidUntilDate = parseDateSafe(store.subscriptionPaidUntil);
  const isPaidActive = Boolean(
    store.subscriptionStatus === 'ACTIVE' ||
    (paidUntilDate && paidUntilDate.getTime() > now.getTime())
  );

  // 5. Período de Prueba en Curso (se respeta la fecha individual calculada/almacenada)
  const msRemainingTrial = (trialEndsAtDate ? trialEndsAtDate.getTime() : createdAtDate.getTime()) - now.getTime();
  const isInTrial = !isPaidActive && !isExempt && !isExplicitZeroTrial && (msRemainingTrial > 0);
  const trialDaysRemaining = isInTrial
    ? Math.max(0, Math.ceil(msRemainingTrial / (1000 * 60 * 60 * 24)))
    : 0;

  // 6. Bloqueo de Dashboard / Acceso Operativo al Panel:
  // La tienda tiene ACCESO TOTAL a operaciones del terminal si:
  // - Está exenta (isExempt)
  // - O tiene suscripción pagada activa (isPaidActive)
  // - O está dentro de su período de prueba gratuito (isInTrial)
  // Si ninguna de las 3 se cumple, está BLOQUEADA / REQUIERE PAGO ($5 BCV)
  const isBlocked = !isExempt && !isPaidActive && !isInTrial;
  const hasAccess = !isBlocked;

  // 7. Etiqueta de Estado
  let statusLabel = 'BLOCKED';
  if (isExempt) statusLabel = 'EXEMPT';
  else if (isPaidActive) statusLabel = 'ACTIVE';
  else if (isInTrial) statusLabel = 'TRIAL';

  // 8. Cálculo de Monto en Bolívares (VES) a Tasa Oficial BCV
  const rate = parseFloat(
    dolarRateInfo?.rate ||
    config?.vesExchangeRate ||
    884.75
  ) || 1;

  const priceVes = priceUsd * rate;
  const formattedVes = new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(priceVes);

  // 9. Comprobante de pago pendiente de revisión
  const pendingPayment = store.pendingSubscriptionPayment || null;

  return {
    createdAt: createdAtDate,
    trialEndsAt: trialEndsAtDate,
    paidUntil: paidUntilDate,
    isExempt,
    isPaidActive,
    isInTrial,
    trialDaysRemaining,
    trialMonths: storeTrialMonths,
    isBlocked,
    hasAccess,
    statusLabel,
    priceUsd,
    rate,
    priceVes,
    formattedVes,
    pendingPayment
  };
}

/**
 * Determina si el terminal POS / Dashboard de la tienda debe ser bloqueado por falta de pago.
 */
export function isStoreSubscriptionBlocked(store, config = {}) {
  if (!store) return false;
  // Las tiendas con exención o sin ID válido nunca se bloquean
  if (store.subscriptionExempt) return false;
  
  const details = getStoreSubscriptionDetails(store, config);
  return details.isBlocked;
}
