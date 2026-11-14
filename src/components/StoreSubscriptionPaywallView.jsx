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
  Clock
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
  onLogout = () => { }
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

  return (
    <div style={{
      minHeight: '100vh',
      minHeight: '100dvh',
      background: 'linear-gradient(135deg, #FAF8F5 0%, #F5ECE3 100%)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-body)'
    }}>
      {/* Top Navbar */}
      <header style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #EDE2D5',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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

      {/* Main Content Container */}
      <main style={{
        flex: 1,
        maxWidth: '820px',
        width: '100%',
        margin: '28px auto',
        padding: '0 16px',
        boxSizing: 'border-box'
      }}>
        {/* Banner de Bloqueo / Aviso de Prueba Expirada */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '24px',
          border: '1.5px solid #EDE2D5',
          boxShadow: '0 10px 30px -10px rgba(156, 56, 42, 0.1)',
          overflow: 'hidden',
          marginBottom: '20px'
        }}>
          {/* Header decorativo de estado */}
          <div style={{
            background: 'linear-gradient(90deg, #9C382A 0%, #C2410C 100%)',
            padding: '24px 28px',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Lock size={26} color="#FFFFFF" />
              </div>
              <div>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  background: 'rgba(255, 255, 255, 0.25)',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  display: 'inline-block',
                  marginBottom: '4px'
                }}>
                  {details.trialMonths === 0
                    ? 'Membresía Mensual Requerida'
                    : `Período de Prueba Finalizado (${details.trialMonths} ${details.trialMonths === 1 ? 'Mes' : 'Meses'})`}
                </span>
                <h1 style={{ fontSize: '1.45rem', fontWeight: 900, margin: 0, lineHeight: 1.2 }}>
                  {details.trialMonths === 0 ? 'Membresía Básica POS Requerida' : 'Terminal POS Bloqueado'}
                </h1>
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '8px 16px',
              borderRadius: '12px',
              textAlign: 'right'
            }}>
              <div style={{ fontSize: '0.7rem', opacity: 0.85, fontWeight: 700 }}>Comercio Registrado</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>{store.name}</div>
              <div style={{ fontSize: '0.68rem', opacity: 0.75 }}>ID: {store.id}</div>
            </div>
          </div>

          {/* Cuerpo Informativo */}
          <div style={{ padding: '24px 28px' }}>
            <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.55, margin: '0 0 20px 0' }}>
              {details.trialMonths === 0
                ? 'Para activar tu terminal POS, registrar compras en mostrador, otorgar sellos y emitir promociones a tus clientes, adquiere tu membresía mensual básica.'
                : `Tu comercio disfrutó del período de cortesía gratuita (${details.trialMonths} ${details.trialMonths === 1 ? 'mes' : 'meses'}). Para reactivar de inmediato el acceso al panel POS, registrar compras y emitir promociones, renueva tu membresía mensual.`}
            </p>

            {/* Tarjeta de Tarifa / Cotización a Tasa BCV */}
            <div style={{
              background: '#FAF8F5',
              border: '2px solid #EDE2D5',
              borderRadius: '18px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
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
                <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#1E293B', lineHeight: 1.15 }}>
                  Bs. {details.formattedVes}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
                  Equivalente exacto a <strong>${details.priceUsd.toFixed(2)} USD</strong> (Tasa Oficial BCV: {details.rate.toFixed(2)} Bs/USD)
                </div>
              </div>

              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '12px 16px',
                fontSize: '0.78rem',
                color: '#334155',
                lineHeight: 1.45,
                maxWidth: '260px'
              }}>
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
              padding: '18px 20px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Smartphone size={18} color="var(--c-primary, #9C382A)" />
                <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                  Datos de Pago Móvil Oficial
                </h3>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px'
              }}>
                {/* Banco */}
                <div style={{
                  background: '#FAF8F5',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #EDE2D5',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700 }}>Banco</div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#1E293B' }}>{pagoMovilBank}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('0102', 'banco')}
                    style={{ background: 'none', border: 'none', color: 'var(--c-primary)', cursor: 'pointer' }}
                    title="Copiar código bancario"
                  >
                    {copiedField === 'banco' ? <Check size={16} color="#16A34A" /> : <Copy size={16} />}
                  </button>
                </div>

                {/* Teléfono */}
                <div style={{
                  background: '#FAF8F5',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #EDE2D5',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700 }}>Teléfono Celular</div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#1E293B' }}>{pagoMovilPhone}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(pagoMovilPhone.replace(/[^0-9]/g, ''), 'telefono')}
                    style={{ background: 'none', border: 'none', color: 'var(--c-primary)', cursor: 'pointer' }}
                    title="Copiar teléfono"
                  >
                    {copiedField === 'telefono' ? <Check size={16} color="#16A34A" /> : <Copy size={16} />}
                  </button>
                </div>

                {/* Cédula / RIF */}
                <div style={{
                  background: '#FAF8F5',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #EDE2D5',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700 }}>Cédula o RIF</div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#1E293B' }}>{pagoMovilId}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(pagoMovilId.replace(/[^0-9A-Za-z]/g, ''), 'rif')}
                    style={{ background: 'none', border: 'none', color: 'var(--c-primary)', cursor: 'pointer' }}
                    title="Copiar documento"
                  >
                    {copiedField === 'rif' ? <Check size={16} color="#16A34A" /> : <Copy size={16} />}
                  </button>
                </div>

                {/* Monto exacto */}
                <div style={{
                  background: '#FAF8F5',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #EDE2D5',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700 }}>Monto a Transferir</div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--c-primary, #9C382A)' }}>
                      Bs. {details.formattedVes}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(details.priceVes.toFixed(2), 'monto')}
                    style={{ background: 'none', border: 'none', color: 'var(--c-primary)', cursor: 'pointer' }}
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
                padding: '16px 18px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <Clock size={22} color="#B45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.84rem', color: '#92400E', lineHeight: 1.5, width: '100%' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.90rem', marginBottom: '4px' }}>
                    Comprobante de Pago en Proceso de Verificación
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                    gap: '6px',
                    margin: '8px 0',
                    background: '#FFFBEB',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #FDE68A'
                  }}>
                    <div><strong>🔢 Referencia:</strong> <code style={{ fontWeight: 800 }}>{store.pendingSubscriptionPayment.reference}</code></div>
                    <div><strong>🏦 Banco Emisor:</strong> {store.pendingSubscriptionPayment.bankOrigin || 'No especificado'}</div>
                    <div><strong>📱 Teléfono Emisor:</strong> {store.pendingSubscriptionPayment.payerPhone || store.phone || 'No especificado'}</div>
                    <div><strong>💵 Monto:</strong> Bs. {store.pendingSubscriptionPayment.amountVes}</div>
                  </div>
                  <div style={{ fontSize: '0.76rem' }}>
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
              padding: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                    Reportar Pago Móvil Realizado
                  </h3>
                  <p style={{ fontSize: '0.74rem', color: '#64748B', margin: '2px 0 0 0' }}>
                    Indica la referencia, el banco de origen y el teléfono desde donde pagaste para verificarlo de inmediato.
                  </p>
                </div>
                <span style={{ fontSize: '0.70rem', background: '#FEF3C7', color: '#92400E', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
                  Activación Rápida
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '14px',
                marginBottom: '16px'
              }}>
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
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      boxSizing: 'border-box'
                    }}
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
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      boxSizing: 'border-box'
                    }}
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
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      boxSizing: 'border-box'
                    }}
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
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '2px', display: 'block' }}>
                    Calculado a tasa oficial BCV: Bs. {details.formattedVes}
                  </span>
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{
                    padding: '10px 16px',
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
                    padding: '10px 22px',
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

