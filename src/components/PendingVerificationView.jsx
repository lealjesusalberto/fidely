import React, { useState } from 'react';
import {
  Clock,
  ShieldCheck,
  Store,
  User,
  Sparkles,
  RefreshCw,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Tag,
  MapPin,
  Mail,
  ChevronRight,
  CreditCard
} from 'lucide-react';
import StoreOnboardingModal from './StoreOnboardingModal';
import StoreLogoBadge from './StoreLogoBadge';
import { saveClient } from '../firebase/firestoreService';

export default function PendingVerificationView({
  type = 'STORE', // 'STORE' | 'CLIENT'
  data = {},
  stores = [],
  clients = [],
  config = {},
  onUpdateClient,
  onNotify,
  onRefresh,
  onLogout,
  onProceed
}) {
  const isStore = type === 'STORE';
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState('');

  const name = data?.name || (isStore ? 'Comercio Aliado' : 'Socio fidely');
  const category = data?.category || 'Comercio General';
  const status = data?.status || 'PENDIENTE';
  const isRejected = status === 'RECHAZADO';

  const handleCheckStatus = () => {
    setIsChecking(true);
    setCheckMessage('');

    setTimeout(() => {
      setIsChecking(false);
      if (isStore) {
        const found = stores.find(s => s.id === data.id || s.email?.toLowerCase() === data.email?.toLowerCase());
        if (found && found.status === 'APROBADO') {
          setCheckMessage('¡Tu tienda ha sido APROBADA! Ingresando al terminal POS...');
          if (onProceed) onProceed(found);
        } else if (found && found.status === 'RECHAZADO') {
          setCheckMessage('Tu solicitud no fue aprobada por administración. Comunícate con soporte.');
        } else {
          setCheckMessage('Tu comercio continúa en lista de espera de verificación por el Administrador.');
        }
      } else {
        const found = clients.find(c => 
          c.id === data.id || 
          (data.firebaseUid && c.firebaseUid === data.firebaseUid) ||
          (data.email && c.email?.toLowerCase().trim() === data.email.toLowerCase().trim())
        );
        if (found && (found.status === 'APROBADO' || found.status === 'ACTIVO')) {
          setCheckMessage('¡Tu cuenta ha sido APROBADA! Ingresando a tu portal...');
          if (onProceed) onProceed(found);
        } else if (found && found.status === 'RECHAZADO') {
          setCheckMessage('Tu cuenta no fue aprobada. Por favor contacta al administrador.');
        } else {
          setCheckMessage('Tu cuenta continúa en proceso de activación.');
        }
      }
      if (onRefresh) onRefresh();
    }, 700);
  };

  return (
    <div style={{
      minHeight: '85vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      background: 'radial-gradient(ellipse at top, rgba(222, 139, 118, 0.12) 0%, #FAF8F5 70%)',
      fontFamily: 'var(--font-body)'
    }}>
      <div style={{
        maxWidth: '560px',
        width: '100%',
        background: '#FFFFFF',
        borderRadius: '24px',
        border: '1px solid #EDE2D5',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.08)',
        padding: '36px 32px',
        textAlign: 'center',
        position: 'relative'
      }}>

        {/* Animated Badge Icon */}
        <div style={{
          width: '76px',
          height: '76px',
          borderRadius: '50%',
          background: isRejected
            ? 'rgba(239, 68, 68, 0.12)'
            : 'linear-gradient(135deg, rgba(222, 139, 118, 0.22) 0%, rgba(156, 56, 42, 0.12) 100%)',
          border: `2px solid ${isRejected ? '#F87171' : '#DE8B76'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px auto',
          position: 'relative'
        }}>
          {isRejected ? (
            <AlertCircle size={38} color="#DC2626" />
          ) : (
            <Clock size={36} color="var(--c-primary)" />
          )}
          {!isRejected && (
            <span style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: '#F59E0B',
              border: '2px solid #FFFFFF'
            }} />
          )}
        </div>

        {/* Status Pill */}
        <div style={{ marginBottom: '14px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: isRejected ? '#FEE2E2' : '#FEF3C7',
            color: isRejected ? '#991B1B' : '#92400E',
            border: `1px solid ${isRejected ? '#FCA5A5' : '#FCD34D'}`,
            padding: '4px 14px',
            borderRadius: '9999px',
            fontSize: '0.74rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase'
          }}>
            {isRejected ? 'Solicitud Rechazada' : 'En Espera de Aprobación por Administración'}
          </span>
        </div>

        {/* Title & Copy */}
        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1.5rem',
          fontWeight: 800,
          color: 'var(--text-main)',
          marginBottom: '10px',
          letterSpacing: '-0.02em',
          lineHeight: 1.25
        }}>
          {isRejected
            ? 'Afiliación No Aprobada'
            : isStore
              ? 'Comercio en Proceso de Verificación'
              : 'Cuenta en Proceso de Activación'}
        </h1>

        <p style={{
          fontSize: '0.88rem',
          color: 'var(--text-muted)',
          lineHeight: 1.55,
          marginBottom: '24px'
        }}>
          {isRejected
            ? `Tu solicitud para "${name}" ha sido revisada por la administración y no fue aprobada para operar en fidely CLUB.`
            : isStore
              ? `Hola, "${name}". Tu registro como tienda aliada ha sido recibido exitosamente. Antes de habilitar la emisión de sellos y terminal POS en tu mostrador, el Administrador del sistema verificará tus datos comerciales por seguridad.`
              : `Hola, ${name}. Tu registro como nuevo socio de fidely CLUB ha sido recibido. El administrador activará tu cuenta en breve para que puedas comenzar a acumular sellos y premios.`}
        </p>

        {/* Summary Card */}
        <div style={{
          background: '#FAF8F5',
          border: '1px solid #EDE2D5',
          borderRadius: '16px',
          padding: '16px 20px',
          textAlign: 'left',
          marginBottom: '24px'
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
            {isStore ? 'Ficha del Comercio Registrado' : 'Ficha del Socio Registrado'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Nombre Oficial:</div>
              <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-main)' }}>{name}</div>
            </div>

            {isStore && (
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Categoría de Tienda:</div>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--c-primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Tag size={13} />
                  <span>{category}</span>
                </div>
              </div>
            )}

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {isStore ? 'Ubicación / Ciudad:' : 'Cédula / Documento:'}
              </div>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {isStore ? `${data?.city || 'Caracas'}${data?.address ? ` • ${data.address}` : ''}` : (data?.docId || 'N/A')}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {isStore ? 'Encargado / Contacto:' : 'Teléfono / Correo:'}
              </div>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {isStore ? (data?.manager || data?.email || 'N/A') : (data?.phone || data?.email || 'N/A')}
              </div>
            </div>
          </div>
        </div>

        {/* ONBOARDING EXPLORATION BANNER (For Stores) */}
        {isStore && (
          <div
            onClick={() => setShowOnboarding(true)}
            style={{
              background: 'linear-gradient(135deg, rgba(222, 139, 118, 0.18) 0%, rgba(156, 56, 42, 0.08) 100%)',
              border: '1.5px solid rgba(222, 139, 118, 0.45)',
              borderRadius: '16px',
              padding: '16px 18px',
              cursor: 'pointer',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              textAlign: 'left'
            }}
            title="Conoce cómo funciona tu tarjeta de sellos digital, aprobación de QR y beneficios"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'var(--c-primary)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(156, 56, 42, 0.25)'
              }}>
                <Sparkles size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.25 }}>
                  Explorar Onboarding y Tarjetas de Sellos
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--c-primary)', fontWeight: 600, marginTop: '2px' }}>
                  Aprende el flujo de sellos, aprobación QR y uso del POS mientras esperas ➔
                </div>
              </div>
            </div>
            <ChevronRight size={18} color="var(--c-primary)" />
          </div>
        )}

        {/* CLIENT INFO BANNER */}
        {!isStore && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(222, 139, 118, 0.15) 0%, rgba(156, 56, 42, 0.06) 100%)',
              border: '1.5px solid rgba(222, 139, 118, 0.35)',
              borderRadius: '16px',
              padding: '16px 18px',
              marginBottom: '24px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}
          >
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, var(--c-primary) 0%, #7E2D22 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 14px rgba(156, 56, 42, 0.28)'
            }}>
              <CreditCard size={22} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 900, color: 'var(--text-main)' }}>
                Tarjeta Digital de Socio Lista
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>
                Presenta tu código QR en el mostrador de comercios aliados para acumular sellos con tus consumos.
              </div>
            </div>
          </div>
        )}

        {/* Check Feedback Message */}
        {checkMessage && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '10px',
            background: checkMessage.includes('APROBADA') ? '#DCFCE7' : '#FEF3C7',
            border: `1px solid ${checkMessage.includes('APROBADA') ? '#86EFAC' : '#FCD34D'}`,
            color: checkMessage.includes('APROBADA') ? '#166534' : '#92400E',
            fontSize: '0.82rem',
            fontWeight: 700,
            marginBottom: '18px'
          }}>
            {checkMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleCheckStatus}
            disabled={isChecking}
            className="btn btn-primary"
            style={{
              padding: '10px 20px',
              fontSize: '0.84rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '12px'
            }}
          >
            <RefreshCw size={15} className={isChecking ? 'spin-animation' : ''} />
            <span>{isChecking ? 'Consultando...' : 'Consultar Estado'}</span>
          </button>

          {isStore && (
            <button
              type="button"
              onClick={() => setShowOnboarding(true)}
              className="btn btn-secondary"
              style={{
                padding: '10px 16px',
                fontSize: '0.84rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '12px'
              }}
            >
              <Sparkles size={14} color="var(--c-primary)" />
              <span>Ver Guía</span>
            </button>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="btn btn-secondary"
            style={{
              padding: '10px 16px',
              fontSize: '0.84rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '12px',
              color: '#DC2626'
            }}
          >
            <LogOut size={14} />
            <span>Cerrar Sesión</span>
          </button>
        </div>

        {/* Footnote */}
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '22px' }}>
          Mesa de Control & Auditoría Central • fidely CLUB Oficial
        </div>
      </div>

      {/* Store Onboarding Modal */}
      {isStore && (
        <StoreOnboardingModal
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          storeName={name}
          confirmButtonText="Entendido, volver a mi estado 🚀"
        />
      )}



      <style>{`
        .spin-animation {
          animation: spinVerify 1s linear infinite;
        }
        @keyframes spinVerify {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
