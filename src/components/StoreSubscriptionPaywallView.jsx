import React, { useState } from 'react';
import {
  Lock,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Send,
  LogOut,
  RefreshCw,
  Sparkles,
  Calendar,
  DollarSign,
  Building,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  Clock,
  ArrowLeft
} from 'lucide-react';
import {
  getStoreSubscriptionDetails,
  SUBSCRIPTION_PRICE_USD
} from '../utils/subscriptionUtils';
import { saveStore } from '../firebase/firestoreService';
import { db } from '../firebase/config';
import { collection, addDoc } from 'firebase/firestore';

const VENEZUELAN_BANKS = [
  '0102 - Banco de Venezuela',
  '0134 - Banesco',
  '0105 - Banco Mercantil',
  '0108 - Banco Provincial (BBVA)',
  '0191 - Banco Nacional de Crédito (BNC)',
  '0172 - Bancamiga',
  '0114 - Bancaribe',
  '0115 - Banco Exterior',
  '0163 - Banco del Tesoro',
  '0175 - Banco Digital Bicentenario',
  '0156 - 100% Banco',
  '0151 - Banco Fondo Común (BFC)',
  '0174 - Banplus',
  '0169 - Mi Banco',
  '0138 - Banco Plaza',
  '0157 - Banco del Sur',
  '0168 - Bancrecer',
  '0171 - Banco Activo',
  '0177 - Banco de la Fuerza Armada (BANFANB)',
  'Otro banco / Pago móvil'
];

export default function StoreSubscriptionPaywallView({
  store = {},
  stores = [],
  config = {},
  dolarRateInfo = null,
  onRefresh,
  onNotify = () => { },
  onLogout = () => { },
  isEmbedded = false,
  onBack = null
}) {
  const details = getStoreSubscriptionDetails(store, config, dolarRateInfo);

  // Formulario de reporte de pago móvil
  const [reference, setReference] = useState('');
  const [bankOrigin, setBankOrigin] = useState('');
  const [payerPhone, setPayerPhone] = useState(store?.phone || '');
  const [paymentAmountVes, setPaymentAmountVes] = useState(details.priceVes.toFixed(2));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  // Datos de cobro de suscripción (obtenidos de config o valores por defecto para Venezuela)
  const pagoMovilBank = config.subscriptionPagoMovilBank || 'Banco de Venezuela (0102)';
  const pagoMovilPhone = config.subscriptionPagoMovilPhone || '04242098250';
  const pagoMovilId = config.subscriptionPagoMovilId || 'J410679891';
  const pagoMovilHolder = config.subscriptionPagoMovilHolder || 'fidely CLUB / Conecta2';
  const supportWhatsapp = (config.supportWhatsapp || '584242098250').replace(/[^0-9]/g, '');

  const copyToClipboard = (text, fieldKey) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 2000);
      onNotify('Dato copiado al portapapeles', 'info');
    } catch (e) {
      console.warn('Error copiando:', e);
    }
  };

  const handleRefreshStatus = async () => {
    setIsChecking(true);
    if (onRefresh) await onRefresh();
    setTimeout(() => {
      setIsChecking(false);
      onNotify('Datos actualizados. Comprobando activación...', 'info');
    }, 800);
  };

  const handleReportPayment = async (e) => {
    e.preventDefault();
    if (!reference.trim() || reference.trim().length < 4) {
      onNotify('Por favor ingresa los últimos 4 a 8 dígitos de tu referencia de pago', 'warning');
      return;
    }
    if (!bankOrigin.trim()) {
      onNotify('Por favor selecciona o indica el banco emisor de donde realizaste el pago', 'warning');
      return;
    }
    const cleanPhone = payerPhone.trim().replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      onNotify('Por favor ingresa el número telefónico completo desde donde realizaste el Pago Móvil (ej: 04241234567)', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const paymentRecord = {
        storeId: store.id,
        storeName: store.name,
        storeEmail: store.email || '',
        reference: reference.trim(),
        bankOrigin: bankOrigin.trim(),
        payerPhone: cleanPhone,
        amountUsd: details.priceUsd || SUBSCRIPTION_PRICE_USD,
        amountVes: parseFloat(paymentAmountVes) || details.priceVes,
        bcvRate: details.rate,
        status: 'PENDIENTE',
        reportedAt: nowIso
      };

      // 1. Guardar en Firestore colección `subscription_payments`
      if (db) {
        try {
          await addDoc(collection(db, 'subscription_payments'), paymentRecord);
        } catch (dbErr) {
          console.warn('[Firestore] Error registrando en subscription_payments:', dbErr);
        }
      }

      // 2. Guardar en el documento de la tienda
      const updatedStore = {
        ...store,
        pendingSubscriptionPayment: paymentRecord,
        updatedAt: nowIso
      };

      await saveStore(updatedStore);
      if (onRefresh) await onRefresh();

      onNotify('¡Comprobante de pago enviado con éxito! Tu terminal será activado tras la verificación.', 'success');
      setReference('');
    } catch (err) {
      console.error('Error reportando pago de suscripción:', err);
      onNotify('Error al registrar el reporte de pago: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentRef = reference.trim() || store.pendingSubscriptionPayment?.reference || '';
  const currentBank = bankOrigin.trim() || store.pendingSubscriptionPayment?.bankOrigin || '';
  const currentPhone = payerPhone.trim() || store.pendingSubscriptionPayment?.payerPhone || store.phone || '';
  const currentAmount = parseFloat(paymentAmountVes) || store.pendingSubscriptionPayment?.amountVes || details.priceVes;

  const whatsappMessage = encodeURIComponent(
    `Hola fidely CLUB, he realizado el pago de la membresía mensual de mi tienda "${store.name}" (ID: ${store.id}).\n\n` +
    `📋 Reporte de Pago Móvil:\n` +
    `• Referencia: ${currentRef || '(Adjunto captura)'}\n` +
    `• Banco Emisor: ${currentBank || 'No especificado'}\n` +
    `• Teléfono Emisor: ${currentPhone || 'No especificado'}\n` +
    `• Monto: Bs. ${currentAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ($${details.priceUsd.toFixed(2)} USD a tasa BCV)\n\n` +
    `Solicito la verificación y activación de mi terminal POS.`
  );
  const whatsappUrl = `https://wa.me/${supportWhatsapp}?text=${whatsappMessage}`;

  const isPaidActive = details.isPaidActive;
  const isInTrial = details.isInTrial;
  const isBlocked = details.isBlocked;

  return (
    <div style={isEmbedded ? {
      width: '100%',
      maxWidth: '880px',
      margin: '0 auto',
      padding: '4px 0 24px 0',
      fontFamily: 'var(--font-body)',
      boxSizing: 'border-box',
      overflowX: 'hidden'
    } : {
      minHeight: '100vh',
      minHeight: '100dvh',
      background: 'linear-gradient(135deg, #FAF8F5 0%, #F5ECE3 100%)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-body)',
      boxSizing: 'border-box',
      overflowX: 'hidden'
    }}>
      <style>{`
        .subpay-container {
          width: 100%;
          max-width: 820px;
          margin: 0 auto;
          box-sizing: border-box;
          padding: 0 16px;
        }
        .subpay-card {
          background: #FFFFFF;
          border-radius: 24px;
          border: 1.5px solid #EDE2D5;
          box-shadow: 0 10px 30px -10px rgba(156, 56, 42, 0.1);
          overflow: hidden;
          margin-bottom: 20px;
          width: 100%;
          box-sizing: border-box;
        }
        .subpay-header {
          padding: 24px 28px;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
          box-sizing: border-box;
        }
        .subpay-header-main {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
          flex: 1 1 260px;
        }
        .subpay-header-icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .subpay-header-title {
          font-size: 1.45rem;
          font-weight: 900;
          margin: 0;
          line-height: 1.2;
          word-break: break-word;
        }
        .subpay-header-store {
          background: rgba(255, 255, 255, 0.18);
          padding: 8px 16px;
          border-radius: 12px;
          text-align: right;
          box-sizing: border-box;
          min-width: 0;
        }
        .subpay-body {
          padding: 24px 28px;
          box-sizing: border-box;
          width: 100%;
        }
        .subpay-price-box {
          background: #FAF8F5;
          border: 2px solid #EDE2D5;
          border-radius: 18px;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
          box-sizing: border-box;
          width: 100%;
        }
        .subpay-price-amount {
          font-size: clamp(1.45rem, 4.5vw, 1.9rem);
          font-weight: 900;
          color: #1E293B;
          line-height: 1.15;
          word-break: break-word;
        }
        .subpay-price-notice {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 0.78rem;
          color: #334155;
          line-height: 1.45;
          max-width: 260px;
          box-sizing: border-box;
        }
        .subpay-pm-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          box-sizing: border-box;
          width: 100%;
        }
        .subpay-pm-item {
          background: #FAF8F5;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid #EDE2D5;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          min-width: 0;
          box-sizing: border-box;
        }
        .subpay-form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 14px;
          margin-bottom: 16px;
          box-sizing: border-box;
          width: 100%;
        }
        .subpay-input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1.5px solid #CBD5E1;
          font-size: 15px;
          font-weight: 700;
          box-sizing: border-box;
          background: #FFFFFF;
        }
        .subpay-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          width: 100%;
          box-sizing: border-box;
        }

        /* RESPONSIVE MOBILE TWEAKS (PANTALLAS CELULAR) */
        @media (max-width: 640px) {
          .subpay-container {
            padding: 0 4px !important;
          }
          .subpay-card {
            border-radius: 16px !important;
            margin-bottom: 14px !important;
          }
          .subpay-header {
            padding: 16px 14px !important;
            gap: 12px !important;
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .subpay-header-main {
            gap: 10px !important;
          }
          .subpay-header-icon {
            width: 42px !important;
            height: 42px !important;
            border-radius: 12px !important;
          }
          .subpay-header-title {
            font-size: 1.20rem !important;
          }
          .subpay-header-store {
            text-align: left !important;
            padding: 8px 12px !important;
            width: 100% !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
          .subpay-body {
            padding: 16px 14px !important;
          }
          .subpay-price-box {
            padding: 14px 12px !important;
            gap: 12px !important;
            flex-direction: column !important;
            align-items: stretch !important;
            margin-bottom: 16px !important;
          }
          .subpay-price-notice {
            max-width: 100% !important;
            width: 100% !important;
          }
          .subpay-pm-grid {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }
          .subpay-pm-item {
            padding: 8px 12px !important;
          }
          .subpay-form-grid {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
          .subpay-input {
            font-size: 16px !important; /* Evita auto-zoom de iOS */
          }
          .subpay-actions {
            flex-direction: column !important;
            gap: 10px !important;
          }
          .subpay-actions > * {
            width: 100% !important;
            justify-content: center !important;
            text-align: center !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>

      {/* Botón Volver al Terminal POS si está embebido */}
      {isEmbedded && onBack && (
        <div style={{ marginBottom: '10px', padding: '0 4px' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              background: '#FFFFFF',
              border: '1.5px solid #EDE2D5',
              color: '#334155',
              fontSize: '0.80rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
            }}
          >
            <ArrowLeft size={16} color="var(--c-primary, #9C382A)" />
            <span>← Volver al Terminal POS</span>
          </button>
        </div>
      )}

      {/* Top Navbar si no está embebido */}
      {!isEmbedded && (
        <header style={{
          background: '#FFFFFF',
          borderBottom: '1px solid #EDE2D5',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--c-primary, #9C382A)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.1rem'
            }}>
              f
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: '#1E293B', letterSpacing: '-0.3px' }}>
                fidely <span style={{ color: 'var(--c-primary, #9C382A)' }}>CLUB</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>
                Portal de Suscripciones Comercios
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleRefreshStatus}
              disabled={isChecking}
              className="btn btn-secondary"
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Verificar si la administración ya activó tu suscripción"
            >
              <RefreshCw size={14} className={isChecking ? 'animate-spin' : ''} />
              <span>Verificar Activación</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="btn btn-secondary"
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#DC2626',
                borderColor: '#FECDD3',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <LogOut size={14} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </header>
      )}

      {/* Main Content Container */}
      <main className="subpay-container" style={isEmbedded ? { padding: '0', maxWidth: '100%' } : { margin: '20px auto' }}>
        {/* Banner de Bloqueo / Aviso de Prueba Expirada */}
        <div className="subpay-card">
          {/* Header decorativo de estado */}
          <div className="subpay-header" style={{
            background: isPaidActive
              ? 'linear-gradient(90deg, #15803D 0%, #16A34A 100%)'
              : isInTrial
                ? 'linear-gradient(90deg, #0284C7 0%, #0369A1 100%)'
                : 'linear-gradient(90deg, #70092B 0%, #9C382A 100%)'
          }}>
            <div className="subpay-header-main">
              <div className="subpay-header-icon">
                {isPaidActive ? (
                  <CheckCircle2 size={24} color="#FFFFFF" />
                ) : isInTrial ? (
                  <Sparkles size={24} color="#FFFFFF" />
                ) : (
                  <CreditCard size={24} color="#FFFFFF" />
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <span style={{
                  fontSize: '0.70rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  background: 'rgba(255, 255, 255, 0.25)',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  display: 'inline-block',
                  marginBottom: '4px'
                }}>
                  {isPaidActive
                    ? '✓ Plan fidely PRO Activo'
                    : isInTrial
                      ? `🎁 Prueba Gratuita (${details.trialDaysRemaining} días restantes)`
                      : details.trialMonths === 0
                        ? 'Membresía Mensual Requerida'
                        : `Prueba Finalizada (${details.trialMonths} ${details.trialMonths === 1 ? 'Mes' : 'Meses'})`}
                </span>
                <h1 className="subpay-header-title">
                  {isPaidActive
                    ? 'Membresía Activa y Operativa'
                    : isInTrial
                      ? `Período Gratuito en Curso (${details.trialDaysRemaining} días)`
                      : 'Membresía Mensual fidely PRO'}
                </h1>
              </div>
            </div>

            <div className="subpay-header-store">
              <div>
                <div style={{ fontSize: '0.68rem', opacity: 0.85, fontWeight: 700 }}>Comercio</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800 }}>{store.name}</div>
              </div>
              <div style={{ fontSize: '0.68rem', opacity: 0.8, fontWeight: 700 }}>ID: {store.id}</div>
            </div>
          </div>

          {/* Cuerpo Informativo */}
          <div className="subpay-body">
            <p style={{ fontSize: '0.90rem', color: '#475569', lineHeight: 1.55, margin: '0 0 18px 0' }}>
              {isPaidActive
                ? 'Tu comercio cuenta con acceso completo a todas las funciones de venta, sellos digitales, canje de premios y fidelización de clientes de fidely PRO.'
                : isInTrial
                  ? `Tu comercio está disfrutando del período de cortesía gratuita (${details.trialMonths} mes(es)). Todas las funciones del panel están desbloqueadas. Al culminar el período de prueba podrás renovar tu plan por solo $5/mes.`
                  : 'Para disfrutar de todas las funciones operativas de fidely PRO (emitir sellos, canjear premios de clientes y registrar ventas en caja), adquiere tu membresía mensual básica de $5 USD al cambio oficial BCV.'}
            </p>

            {/* Tarjeta de Tarifa / Cotización a Tasa BCV */}
            <div className="subpay-price-box">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--c-primary, #9C382A)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Membresía Básica POS
                  </span>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    background: '#DCFCE7',
                    color: '#15803D',
                    padding: '2px 8px',
                    borderRadius: '999px'
                  }}>
                    Tasa Oficial BCV
                  </span>
                </div>
                <div className="subpay-price-amount">
                  Bs. {details.formattedVes}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
                  Equivalente exacto a <strong>${details.priceUsd.toFixed(2)} USD</strong> (Tasa Oficial BCV: {details.rate.toFixed(2)} Bs/USD)
                </div>
              </div>

              <div className="subpay-price-notice">
                <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: '2px' }}>
                  ⚡ Reactivación Rápida
                </div>
                Realiza el Pago Móvil o transferencia en Bs. y envía la referencia abajo para verificar.
              </div>
            </div>

            {/* Datos para Pago Móvil */}
            <div style={{
              background: '#FFFFFF',
              border: '1.5px solid #EDE2D5',
              borderRadius: '16px',
              padding: '16px 18px',
              marginBottom: '20px',
              boxSizing: 'border-box',
              width: '100%'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Smartphone size={18} color="var(--c-primary, #9C382A)" />
                <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                  Datos de Pago Móvil Oficial
                </h3>
              </div>

              <div className="subpay-pm-grid">
                {/* Banco */}
                <div className="subpay-pm-item">
                  <div className="subpay-pm-item-text">
                    <div style={{ fontSize: '0.66rem', color: '#64748B', fontWeight: 700 }}>Banco</div>
                    <div className="subpay-pm-item-val" title={pagoMovilBank}>{pagoMovilBank}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('0102', 'banco')}
                    style={{ background: 'none', border: 'none', color: 'var(--c-primary)', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center' }}
                    title="Copiar código bancario"
                  >
                    {copiedField === 'banco' ? <Check size={16} color="#16A34A" /> : <Copy size={16} />}
                  </button>
                </div>

                {/* Teléfono */}
                <div className="subpay-pm-item">
                  <div className="subpay-pm-item-text">
                    <div style={{ fontSize: '0.66rem', color: '#64748B', fontWeight: 700 }}>Teléfono Celular</div>
                    <div className="subpay-pm-item-val" title={pagoMovilPhone}>{pagoMovilPhone}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(pagoMovilPhone.replace(/[^0-9]/g, ''), 'telefono')}
                    style={{ background: 'none', border: 'none', color: 'var(--c-primary)', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center' }}
                    title="Copiar teléfono"
                  >
                    {copiedField === 'telefono' ? <Check size={16} color="#16A34A" /> : <Copy size={16} />}
                  </button>
                </div>

                {/* Cédula / RIF */}
                <div className="subpay-pm-item">
                  <div className="subpay-pm-item-text">
                    <div style={{ fontSize: '0.66rem', color: '#64748B', fontWeight: 700 }}>Cédula o RIF</div>
                    <div className="subpay-pm-item-val" title={pagoMovilId}>{pagoMovilId}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(pagoMovilId.replace(/[^0-9A-Za-z]/g, ''), 'rif')}
                    style={{ background: 'none', border: 'none', color: 'var(--c-primary)', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center' }}
                    title="Copiar documento"
                  >
                    {copiedField === 'rif' ? <Check size={16} color="#16A34A" /> : <Copy size={16} />}
                  </button>
                </div>

                {/* Monto exacto */}
                <div className="subpay-pm-item">
                  <div className="subpay-pm-item-text">
                    <div style={{ fontSize: '0.66rem', color: '#64748B', fontWeight: 700 }}>Monto a Transferir</div>
                    <div className="subpay-pm-item-val" style={{ color: 'var(--c-primary, #9C382A)' }}>
                      Bs. {details.formattedVes}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(details.priceVes.toFixed(2), 'monto')}
                    style={{ background: 'none', border: 'none', color: 'var(--c-primary)', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center' }}
                    title="Copiar monto exacto"
                  >
                    {copiedField === 'monto' ? <Check size={16} color="#16A34A" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Aviso si ya existe un pago pendiente de revisión */}
            {store.pendingSubscriptionPayment && (
              <div style={{
                background: '#FEF3C7',
                border: '1.5px solid #FCD34D',
                borderRadius: '14px',
                padding: '14px 16px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                boxSizing: 'border-box',
                width: '100%'
              }}>
                <Clock size={20} color="#B45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.82rem', color: '#92400E', lineHeight: 1.5, width: '100%', minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '4px' }}>
                    Comprobante de Pago en Proceso de Verificación
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '6px',
                    margin: '8px 0',
                    background: '#FFFBEB',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #FDE68A',
                    fontSize: '0.74rem'
                  }}>
                    <div><strong>🔢 Referencia:</strong> <code style={{ fontWeight: 800 }}>{store.pendingSubscriptionPayment.reference}</code></div>
                    <div><strong>🏦 Banco:</strong> {store.pendingSubscriptionPayment.bankOrigin || 'No especificado'}</div>
                    <div><strong>📱 Teléfono:</strong> {store.pendingSubscriptionPayment.payerPhone || store.phone || 'No especificado'}</div>
                    <div><strong>💵 Monto:</strong> Bs. {store.pendingSubscriptionPayment.amountVes}</div>
                  </div>
                  <div style={{ fontSize: '0.74rem' }}>
                    Nuestro equipo administrativo está validando la transacción. Si deseas agilizar la activación inmediata, puedes enviar el comprobante por WhatsApp con un solo clic.
                  </div>
                </div>
              </div>
            )}

            {/* Formulario de Reporte de Pago */}
            <form onSubmit={handleReportPayment} style={{
              background: '#FAF8F5',
              border: '1px solid #EDE2D5',
              borderRadius: '16px',
              padding: '16px 18px',
              boxSizing: 'border-box',
              width: '100%'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                    Reportar Pago Móvil Realizado
                  </h3>
                  <p style={{ fontSize: '0.74rem', color: '#64748B', margin: '2px 0 0 0' }}>
                    Indica la referencia, el banco de origen y el teléfono desde donde pagaste para verificarlo de inmediato.
                  </p>
                </div>
                <span style={{ fontSize: '0.68rem', background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                  Activación Rápida
                </span>
              </div>

              <div className="subpay-form-grid">
                {/* 1. Referencia */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Número de Referencia (Últimos dígitos o completa) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 748291"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="subpay-input"
                  />
                  <span style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '2px', display: 'block' }}>
                    Código numérico del comprobante bancario.
                  </span>
                </div>

                {/* 2. Banco Emisor */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Banco de donde Pagaste *
                  </label>
                  <input
                    type="text"
                    list="venezuelan-banks-list"
                    required
                    placeholder="Selecciona o escribe el banco"
                    value={bankOrigin}
                    onChange={(e) => setBankOrigin(e.target.value)}
                    className="subpay-input"
                  />
                  <datalist id="venezuelan-banks-list">
                    {VENEZUELAN_BANKS.map((b, idx) => (
                      <option key={idx} value={b} />
                    ))}
                  </datalist>
                  <span style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '2px', display: 'block' }}>
                    Banco de tu cuenta de donde salió el Pago Móvil.
                  </span>
                </div>

                {/* 3. Teléfono Emisor */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Teléfono desde donde Pagaste *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej. 04241234567"
                    value={payerPhone}
                    onChange={(e) => setPayerPhone(e.target.value)}
                    className="subpay-input"
                  />
                  <span style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '2px', display: 'block' }}>
                    Número telefónico emisor del Pago Móvil.
                  </span>
                </div>

                {/* 4. Monto Pagado */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Monto Pagado en Bs.
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmountVes}
                    onChange={(e) => setPaymentAmountVes(e.target.value)}
                    className="subpay-input"
                  />
                  <span style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '2px', display: 'block' }}>
                    Calculado a tasa oficial BCV: Bs. {details.formattedVes}
                  </span>
                </div>
              </div>

              <div className="subpay-actions">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{
                    padding: '11px 16px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    color: '#059669',
                    borderColor: '#A7F3D0',
                    background: '#ECFDF5',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    textDecoration: 'none'
                  }}
                >
                  <ExternalLink size={16} />
                  <span>Notificar por WhatsApp</span>
                </a>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn"
                  style={{
                    padding: '11px 22px',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    background: 'var(--c-primary, #9C382A)',
                    color: '#FFFFFF',
                    border: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(156, 56, 42, 0.3)',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Reportar Pago y Activar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

