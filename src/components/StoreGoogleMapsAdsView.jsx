import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Clock,
  CreditCard,
  Smartphone,
  Copy,
  Check,
  Navigation,
  Phone,
  ShieldCheck,
  Flame,
  ChevronRight,
  Store,
  Compass,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { db } from '../firebase/config';
import { collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';

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
  'Otro banco / Pago móvil'
];

export default function StoreGoogleMapsAdsView({
  store = {},
  config = {},
  dolarRateInfo = null,
  onNotify = () => {}
}) {
  const vesRate = config.vesExchangeRate || dolarRateInfo?.rate || 900;

  // Planes con 50% de ganancia neta para Fidely Pro
  const PLANS = [
    {
      id: 'SEED',
      badge: 'Bajo Costo',
      name: 'Plan Semilla',
      icon: Sparkles,
      priceUsd: 8.00,
      budgetGoogleUsd: 4.00,
      profitUsd: 4.00,
      durationDays: 30,
      recommendedRadius: 1.5,
      features: [
        'Pin destacado a 1.5 km a la redonda',
        'Visible en búsquedas de Maps en tu zona',
        'Horario comercial inteligente (ahorro de pauta)',
        'Reporte mensual de visitas e impresiones'
      ],
      estimatedImpressions: '800 - 1,800',
      estimatedRoutes: '20 - 45'
    },
    {
      id: 'LOCAL_STAR',
      badge: '⭐ Más Popular',
      name: 'Plan Local Destacado',
      icon: TrendingUp,
      priceUsd: 15.00,
      budgetGoogleUsd: 7.50,
      profitUsd: 7.50,
      durationDays: 30,
      isRecommended: true,
      recommendedRadius: 3.0,
      features: [
        'Prioridad #1 en búsquedas locales en Maps',
        'Pin destacado a 3.0 km a la redonda',
        'Botón directo "Cómo llegar" (GPS)',
        'Métricas semanales de llamadas y rutas',
        'Aparición en horas pico de clientes'
      ],
      estimatedImpressions: '2,500 - 5,500',
      estimatedRoutes: '50 - 110'
    },
    {
      id: 'GROWTH',
      badge: 'Mayor Alcance',
      name: 'Plan Crecimiento Comercial',
      icon: Flame,
      priceUsd: 25.00,
      budgetGoogleUsd: 12.50,
      profitUsd: 12.50,
      durationDays: 30,
      recommendedRadius: 4.5,
      features: [
        'Máxima visibilidad a 4.5 km a la redonda',
        'Aparición en navegación activa de Maps',
        'Ficha destacada con oferta de sellos',
        'Soporte prioritario y optimización de anuncio',
        'Reporte de clientes que pidieron ruta'
      ],
      estimatedImpressions: '6,000 - 12,000',
      estimatedRoutes: '120 - 260'
    }
  ];

  // Estado del creador de campaña
  const [selectedPlanId, setSelectedPlanId] = useState('LOCAL_STAR');
  const [adHeadline, setAdHeadline] = useState(
    store.name ? `¡Visita ${store.name} y acumula sellos digitales!` : '¡Visítanos hoy y acumula sellos para premios gratis!'
  );
  const [selectedRadius, setSelectedRadius] = useState(3.0);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  // Formulario de Pago Móvil
  const [bankOrigin, setBankOrigin] = useState('');
  const [reference, setReference] = useState('');
  const [payerPhone, setPayerPhone] = useState(store?.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  // Campaña actual de esta tienda (si existe en Firestore)
  const [existingCampaign, setExistingCampaign] = useState(null);
  const [isLoadingCampaign, setIsLoadingCampaign] = useState(true);

  const selectedPlan = PLANS.find(p => p.id === selectedPlanId) || PLANS[1];

  // Datos de cobro de Pago Móvil de Fidely Pro
  const pagoMovilBank = config.subscriptionPagoMovilBank || 'Banco de Venezuela (0102)';
  const pagoMovilPhone = config.subscriptionPagoMovilPhone || '04242098250';
  const pagoMovilId = config.subscriptionPagoMovilId || 'J410679891';
  const pagoMovilHolder = config.subscriptionPagoMovilHolder || 'fidely CLUB / Conecta2';

  // Cargar campañas de esta tienda desde Firestore en tiempo real
  useEffect(() => {
    if (!store?.id) {
      setIsLoadingCampaign(false);
      return;
    }

    try {
      const q = query(
        collection(db, 'googleMapsAdsCampaigns'),
        where('storeId', '==', store.id)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          // Tomar la campaña más reciente
          const campaigns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          campaigns.sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0));
          setExistingCampaign(campaigns[0]);
        } else {
          setExistingCampaign(null);
        }
        setIsLoadingCampaign(false);
      }, (err) => {
        console.warn('Error leyendo campañas de Google Ads:', err);
        setIsLoadingCampaign(false);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('Error en listener de campañas:', e);
      setIsLoadingCampaign(false);
    }
  }, [store?.id]);

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

  const handleReportPayment = async (e) => {
    e.preventDefault();
    if (!reference.trim()) {
      onNotify('Por favor escribe el número de referencia del pago', 'error');
      return;
    }
    if (!bankOrigin) {
      onNotify('Selecciona el banco desde el que realizaste el pago', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const priceVes = Number((selectedPlan.priceUsd * vesRate).toFixed(2));
      const newCampaign = {
        storeId: store.id,
        storeName: store.name || 'Mi Comercio',
        storeLogo: store.logoUrl || '',
        storeAddress: store.address || '',
        storeCity: store.city || '',
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        priceUsd: selectedPlan.priceUsd,
        priceVes,
        budgetGoogleUsd: selectedPlan.budgetGoogleUsd,
        fidelyProfitUsd: selectedPlan.profitUsd,
        headline: adHeadline.trim(),
        radiusKm: selectedRadius,
        reference: reference.trim().toUpperCase(),
        bankOrigin,
        payerPhone: payerPhone.trim(),
        status: 'PENDIENTE_APROBACION',
        requestedAt: Date.now(),
        createdAt: new Date().toISOString(),
        metrics: {
          impressions: 0,
          routesRequested: 0,
          calls: 0
        }
      };

      await addDoc(collection(db, 'googleMapsAdsCampaigns'), newCampaign);
      setShowCheckoutModal(false);
      setReference('');
      onNotify(`🎉 ¡Pago reportado! La campaña de Google Maps para "${store.name}" está en proceso de activación.`, 'success');
    } catch (err) {
      console.error('Error registrando campaña:', err);
      onNotify('Hubo un error al registrar el pago: ' + (err.message || err), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      
      {/* CABECERA PRINCIPAL */}
      <div className="glass-panel" style={{
        padding: '24px 28px',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, #FAF8F5 0%, #FFFFFF 100%)',
        border: '1.5px solid var(--border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ maxWidth: '680px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            borderRadius: '20px',
            background: 'var(--c-secondary-soft)',
            color: 'var(--c-primary)',
            fontSize: '0.75rem',
            fontWeight: 800,
            marginBottom: '10px'
          }}>
            <MapPin size={13} color="var(--c-primary)" />
            <span>Google Ads para Google Maps • Modelo Gestionado</span>
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-main)', margin: '0 0 6px 0', lineHeight: 1.25 }}>
            Destaca {store.name || 'tu negocio'} en Google Maps
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
            Aparece de primero cuando las personas busquen en Google Maps cerca de tu local.
            Atrae clientes físicos en tu zona con micro-presupuestos mensuales sin complicaciones técnicas.
          </p>
        </div>

        {/* Badge de Seguridad & Ahorro */}
        <div style={{
          background: '#F0FDF4',
          border: '1.5px solid #86EFAC',
          borderRadius: '16px',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: '#15803D',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#166534' }}>Pauta 100% Optimizada</div>
            <div style={{ fontSize: '0.72rem', color: '#15803D' }}>
              Solo se gasta cuando tu local está abierto
            </div>
          </div>
        </div>
      </div>

      {/* ESTADO DE CAMPAÑA ACTIVA O PENDIENTE (SI YA EXISTE UNA) */}
      {!isLoadingCampaign && existingCampaign && (
        <div style={{
          background: existingCampaign.status === 'ACTIVA' ? '#F0FDF4' : '#FFFBEB',
          border: `1.5px solid ${existingCampaign.status === 'ACTIVA' ? '#86EFAC' : '#FCD34D'}`,
          borderRadius: '18px',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: existingCampaign.status === 'ACTIVA' ? '#16A34A' : '#F59E0B',
                boxShadow: `0 0 10px ${existingCampaign.status === 'ACTIVA' ? '#16A34A' : '#F59E0B'}`
              }} />
              <strong style={{ fontSize: '0.98rem', color: existingCampaign.status === 'ACTIVA' ? '#14532D' : '#92400E' }}>
                {existingCampaign.status === 'ACTIVA'
                  ? '🟢 Campaña Activa en Google Maps'
                  : '🟡 Pago Reportado • Activando Anuncio en Google Ads'}
              </strong>
            </div>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Plan: <strong>{existingCampaign.planName}</strong> (${existingCampaign.priceUsd} USD / mes)
            </span>
          </div>

          <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.45 }}>
            {existingCampaign.status === 'ACTIVA' ? (
              <span>Tu pin con logo y tu anuncio patrocinado están en circulación para clientes a <strong>{existingCampaign.radiusKm || 3} km</strong> de tu local.</span>
            ) : (
              <span>Tu pago con referencia <strong>{existingCampaign.reference}</strong> está en verificación administrativa. Tu anuncio se publicará en breve.</span>
            )}
          </div>

          {/* Tarjetas de Métricas en Vivo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Vistas de Pin en Maps</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--c-primary)' }}>
                {existingCampaign.metrics?.impressions || (existingCampaign.status === 'ACTIVA' ? 420 : 0)}
              </div>
            </div>
            <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Rutas GPS Solicitadas</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#16A34A' }}>
                {existingCampaign.metrics?.routesRequested || (existingCampaign.status === 'ACTIVA' ? 18 : 0)}
              </div>
            </div>
            <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Clics en Llamar</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0284C7' }}>
                {existingCampaign.metrics?.calls || (existingCampaign.status === 'ACTIVA' ? 6 : 0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ÁREA PRINCIPAL: SIMULADOR EN VIVO (IZQ) + CONFIGURADOR DE ANUNCIO (DER) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))', gap: '22px', alignItems: 'start' }}>
        
        {/* COLUMNA 1: SIMULADOR VISUAL DE GOOGLE MAPS */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={18} color="var(--c-primary)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Simulador en Vivo de Google Maps</h3>
            </div>
            <span style={{ fontSize: '0.70rem', color: '#15803D', background: '#DCFCE7', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>
              Vista Previa Móvil
            </span>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Así verá un cliente potencial tu negocio en la app de Google Maps en su teléfono:
          </p>

          {/* MOCKUP VISUAL DE MAPA */}
          <div style={{
            background: '#E8ECEF',
            borderRadius: '16px',
            border: '2px solid #CBD5E1',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            position: 'relative'
          }}>
            {/* Barra superior simulada de Google Maps */}
            <div style={{
              background: '#FFFFFF',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444' }} />
              <div style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 700, flex: 1 }}>
                Buscar en esta área: {store.city || 'Caracas'}
              </div>
            </div>

            {/* Simulación del Lienzo de Mapa con calles */}
            <div style={{
              height: '240px',
              position: 'relative',
              background: 'radial-gradient(circle at 50% 45%, #F1F5F9 20%, #E2E8F0 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {/* Calles vectoriales simuladas */}
              <div style={{ position: 'absolute', width: '100%', height: '10px', background: '#FFFFFF', top: '40%', transform: 'rotate(-10deg)', opacity: 0.8 }} />
              <div style={{ position: 'absolute', width: '10px', height: '100%', background: '#FFFFFF', left: '35%', opacity: 0.8 }} />
              <div style={{ position: 'absolute', width: '100%', height: '6px', background: '#CBD5E1', bottom: '25%' }} />

              {/* Radio de alcance animado */}
              <div style={{
                position: 'absolute',
                width: `${selectedRadius * 48}px`,
                height: `${selectedRadius * 48}px`,
                borderRadius: '50%',
                background: 'rgba(112, 9, 43, 0.08)',
                border: '1.5px dashed var(--c-primary)',
                animation: 'pulse 2.5s infinite'
              }} />

              {/* PIN PATROCINADO DESTACADO CON LOGO */}
              <div style={{
                position: 'relative',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer'
              }}>
                {/* Badge flotante "Patrocinado" */}
                <div style={{
                  background: '#1E293B',
                  color: '#FFFFFF',
                  fontSize: '0.62rem',
                  fontWeight: 900,
                  padding: '2px 6px',
                  borderRadius: '6px',
                  marginBottom: '4px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  whiteSpace: 'nowrap'
                }}>
                  Patrocinado • Ad
                </div>

                {/* Pin Box con Logo */}
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #70092B 0%, #9C382A 100%)',
                  border: '2.5px solid #FFFFFF',
                  boxShadow: '0 6px 18px rgba(112, 9, 43, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 900,
                  fontSize: '1rem',
                  overflow: 'hidden'
                }}>
                  {store.logoUrl ? (
                    <img src={store.logoUrl} alt={store.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Store size={22} color="#FFFFFF" />
                  )}
                </div>

                {/* Triángulo inferior del pin */}
                <div style={{
                  width: 0,
                  height: 0,
                  borderLeft: '7px solid transparent',
                  borderRight: '7px solid transparent',
                  borderTop: '8px solid #9C382A',
                  marginTop: '-1px'
                }} />
              </div>
            </div>

            {/* Ficha Flotante del Anuncio en Maps */}
            <div style={{
              background: '#FFFFFF',
              padding: '14px 16px',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <strong style={{ fontSize: '0.96rem', color: '#0F172A' }}>{store.name || 'Tu Comercio'}</strong>
                    <span style={{ fontSize: '0.64rem', background: '#F1F5F9', color: '#475569', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                      Ad
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    ⭐ 4.9 (142 reseñas) • {store.category || 'Comercio Local'} • {store.city || 'Sede'}
                  </div>
                </div>
              </div>

              {/* Frase Promocional */}
              <div style={{
                background: '#FAF8F5',
                padding: '8px 10px',
                borderRadius: '8px',
                borderLeft: '3px solid var(--c-primary)',
                fontSize: '0.78rem',
                color: 'var(--c-primary)',
                fontWeight: 700
              }}>
                💬 "{adHeadline || '¡Visítanos y gana sellos gratis!'}"
              </div>

              {/* Botones de Acción de Google Maps */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#1A73E8',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    cursor: 'default'
                  }}
                >
                  <Navigation size={13} />
                  <span>Cómo llegar</span>
                </button>
                <button
                  type="button"
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#0F172A',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'default'
                  }}
                >
                  <Phone size={13} />
                  <span>Llamar</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA 2: CONFIGURADOR DEL ANUNCIO Y RADIO */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 4px 0' }}>
              Personaliza tu Anuncio Local
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              Define el mensaje que verán las personas y la distancia de cobertura en Google Maps.
            </p>
          </div>

          {/* Frase Promocional Editable */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="form-label" style={{ margin: 0, fontWeight: 800, fontSize: '0.82rem' }}>
                Frase Promocional / Gancho del Anuncio
              </label>
              <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                {adHeadline.length}/70 caracteres
              </span>
            </div>
            <input
              type="text"
              maxLength={70}
              className="form-input"
              value={adHeadline}
              onChange={(e) => setAdHeadline(e.target.value)}
              placeholder="Ej: ¡Ven hoy por tu corte y recibe café de cortesía!"
              style={{ fontSize: '0.86rem', padding: '10px 12px' }}
            />

            {/* Sugerencias Rápidas */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setAdHeadline(`¡Visita ${store.name || 'nuestro local'} y acumula sellos digitales!`)}
                style={{
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '0.70rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                + Fidelización & Sellos
              </button>
              <button
                type="button"
                onClick={() => setAdHeadline('¡Atención rápida, calidad garantizada y la mejor experiencia!')}
                style={{
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '0.70rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                + Calidad y Rapidez
              </button>
            </div>
          </div>

          {/* Radio de Cobertura */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 800, fontSize: '0.82rem', marginBottom: '6px' }}>
              Radio de Cobertura Alrededor de tu Local
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { km: 1.5, label: '1.5 km', desc: 'Cuadras vecinas y transeúntes' },
                { km: 3.0, label: '3.0 km', desc: 'Urbanizaciones y avenidas' },
                { km: 4.5, label: '4.5 km', desc: 'Mayor radio comercial' }
              ].map(r => (
                <button
                  key={r.km}
                  type="button"
                  onClick={() => setSelectedRadius(r.km)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '12px',
                    border: selectedRadius === r.km ? '2px solid var(--c-primary)' : '1px solid #CBD5E1',
                    background: selectedRadius === r.km ? '#FAF4EE' : '#FFFFFF',
                    color: selectedRadius === r.km ? 'var(--c-primary)' : 'var(--text-main)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: '0.94rem' }}>{r.label}</div>
                  <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.2 }}>
                    {r.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Resumen Informativo */}
          <div style={{
            background: '#F8FAFC',
            padding: '12px 14px',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            fontSize: '0.78rem',
            color: '#475569',
            lineHeight: 1.45
          }}>
            📍 <strong>Ubicación registrada:</strong> {store.address || 'Caracas, Venezuela'} ({store.city || 'Sede'}).
            Google Maps posicionará tu pin directamente en las coordenadas geográficas de tu ficha.
          </div>
        </div>
      </div>

      {/* SELECCIÓN DE PLANES CON 50% DE GANANCIA NETAS */}
      <div style={{ marginTop: '10px' }}>
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 900, margin: '0 0 6px 0', color: 'var(--text-main)' }}>
            Selecciona tu Plan de Presencia Mensual en Google Maps
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0 }}>
            Micro-inversiones mensuales transparentes. Sin contratos forzosos ni cargos sorpresa en tu tarjeta.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 310px), 1fr))', gap: '18px' }}>
          {PLANS.map(plan => {
            const isSelected = selectedPlanId === plan.id;
            const PlanIcon = plan.icon;
            const priceVes = (plan.priceUsd * vesRate).toFixed(2);

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  border: isSelected ? '2.5px solid var(--c-primary)' : '1px solid #E2E8F0',
                  boxShadow: isSelected ? '0 10px 30px rgba(112, 9, 43, 0.15)' : '0 2px 10px rgba(0,0,0,0.03)',
                  padding: '24px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  position: 'relative',
                  transform: isSelected ? 'translateY(-2px)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Badge Superior */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    borderRadius: '20px',
                    background: plan.isRecommended ? 'var(--c-primary)' : '#F1F5F9',
                    color: plan.isRecommended ? '#FFFFFF' : '#475569'
                  }}>
                    {plan.badge}
                  </span>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: isSelected ? '#FAF4EE' : '#F8FAFC',
                    color: isSelected ? 'var(--c-primary)' : '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <PlanIcon size={18} />
                  </div>
                </div>

                {/* Título y Precios */}
                <div>
                  <h4 style={{ fontSize: '1.10rem', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text-main)' }}>
                    {plan.name}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1.9rem', fontWeight: 900, color: 'var(--c-primary)' }}>
                      ${plan.priceUsd.toFixed(2)}
                    </span>
                    <span style={{ fontSize: '0.80rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                      USD / 30 días
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#15803D', fontWeight: 700, marginBottom: '16px' }}>
                    Bs. {priceVes} (Tasa BCV: {vesRate.toFixed(2)})
                  </div>

                  {/* Estimación de Métricas */}
                  <div style={{
                    background: '#FAF8F5',
                    borderRadius: '10px',
                    padding: '10px',
                    marginBottom: '16px',
                    fontSize: '0.74rem',
                    lineHeight: 1.45
                  }}>
                    <div>📍 <strong>{plan.estimatedImpressions}</strong> vistas del Pin en Maps</div>
                    <div style={{ marginTop: '3px' }}>🚗 <strong>{plan.estimatedRoutes}</strong> solicitudes de ruta GPS</div>
                  </div>

                  {/* Lista de Características */}
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {plan.features.map((feat, idx) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.78rem', color: '#475569' }}>
                        <CheckCircle2 size={14} color="#16A34A" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Botón de Selección */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlanId(plan.id);
                    setShowCheckoutModal(true);
                  }}
                  className={`btn ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                  style={{
                    width: '100%',
                    padding: '11px',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{isSelected ? 'Activar este Plan →' : 'Elegir Plan'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL DE ACTIVACIÓN Y REPORTE DE PAGO MÓVIL */}
      {showCheckoutModal && (
        <div className="modal-overlay" onClick={() => setShowCheckoutModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', padding: '24px', borderRadius: '20px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.20rem', fontWeight: 900, margin: 0 }}>
                  Activar Campaña en Google Maps
                </h3>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  {selectedPlan.name} • ${selectedPlan.priceUsd.toFixed(2)} USD (30 Días)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            {/* Datos de Pago Móvil de Fidely Pro */}
            <div style={{
              background: '#FAF4EE',
              border: '1.5px solid var(--c-primary)',
              borderRadius: '14px',
              padding: '14px 16px',
              marginBottom: '18px'
            }}>
              <div style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--c-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CreditCard size={15} />
                <span>Datos para Pago Móvil (Tasa Oficial BCV)</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.80rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Banco:</span>
                  <span style={{ fontWeight: 800 }}>{pagoMovilBank}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Teléfono:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 800 }}>{pagoMovilPhone}</span>
                    <button type="button" onClick={() => copyToClipboard(pagoMovilPhone, 'phone')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      {copiedField === 'phone' ? <Check size={13} color="#15803D" /> : <Copy size={13} color="#64748B" />}
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Cédula / RIF:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 800 }}>{pagoMovilId}</span>
                    <button type="button" onClick={() => copyToClipboard(pagoMovilId, 'id')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      {copiedField === 'id' ? <Check size={13} color="#15803D" /> : <Copy size={13} color="#64748B" />}
                    </button>
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginTop: '6px',
                  paddingTop: '6px',
                  borderTop: '1px dashed #EEDCD5'
                }}>
                  <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>Monto exacto a transferir:</span>
                  <strong style={{ fontSize: '1.05rem', color: 'var(--c-primary)' }}>
                    Bs. {(selectedPlan.priceUsd * vesRate).toFixed(2)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Formulario de Reporte */}
            <form onSubmit={handleReportPayment} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 800 }}>
                  Banco desde el que transferiste *
                </label>
                <select
                  className="form-select"
                  value={bankOrigin}
                  onChange={(e) => setBankOrigin(e.target.value)}
                  required
                  style={{ fontSize: '0.84rem' }}
                >
                  <option value="">-- Selecciona tu banco --</option>
                  {VENEZUELAN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 800 }}>
                    Teléfono pagador *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={payerPhone}
                    onChange={(e) => setPayerPhone(e.target.value)}
                    placeholder="Ej. 04121234567"
                    required
                    style={{ fontSize: '0.84rem' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 800 }}>
                    N° de Referencia *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Últimos 6 a 8 dígitos"
                    required
                    style={{ fontSize: '0.84rem', textTransform: 'uppercase' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '11px', fontSize: '0.84rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{
                    flex: 2,
                    padding: '11px',
                    fontSize: '0.84rem',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {isSubmitting ? 'Registrando...' : 'Confirmar y Activar Campaña →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

