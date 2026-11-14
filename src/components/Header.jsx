import React from 'react';
import { 
  Store, 
  UserCheck, 
  LayoutDashboard, 
  Coins, 
  LogOut, 
  LogIn,
  Flame,
  RefreshCw,
  DollarSign,
  Smartphone
} from 'lucide-react';

export default function Header({ 
  currentRole, 
  setCurrentRole, 
  config,
  selectedStore,
  currentUser,
  onLogout,
  onOpenLogin,
  firebaseStatus = 'connected',
  onOpenFirebaseModal,
  isFetchingRate = false,
  onRefreshDolarRate,
  dolarRateInfo
}) {
  return (
    <header style={{
      background: '#FFFFFF',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)'
    }}>
      {/* Top Banner: Tasa Oficial en Vivo (Solo dentro de la app POS / Admin, no en la Landing) */}
      {currentRole !== 'LANDING' && (
        <div style={{
          background: 'var(--c-secondary-soft)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '5px 16px',
          fontSize: '0.78rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          {/* Tasa Oficial DolarApi */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#FFFFFF',
                border: '1px solid var(--border-subtle)',
                padding: '3px 10px',
                borderRadius: '20px',
                fontWeight: 700,
                color: 'var(--text-main)',
                fontSize: '0.76rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}
            >
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#16A34A',
                display: 'inline-block',
                boxShadow: '0 0 0 2px rgba(22, 163, 74, 0.25)'
              }} />
              <span style={{ color: 'var(--text-muted)' }}>Tasa Oficial (BCV):</span>
              <strong style={{ color: 'var(--c-primary)', fontSize: '0.82rem' }}>
                1 USD = {config?.vesExchangeRate ? config.vesExchangeRate.toFixed(2) : '...'} VES
              </strong>
              <span style={{ fontSize: '0.67rem', color: '#16A34A', background: '#DCFCE7', padding: '1px 6px', borderRadius: '10px', fontWeight: 800 }}>
                DolarApi En Vivo
              </span>
            </div>

            {onRefreshDolarRate && (
              <button
                type="button"
                onClick={onRefreshDolarRate}
                disabled={isFetchingRate}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '6px'
                }}
                title="Actualizar cotización oficial desde DolarApi.com"
              >
                <RefreshCw size={11} style={{ animation: isFetchingRate ? 'spin 1s linear infinite' : 'none' }} />
                <span>{isFetchingRate ? 'Actualizando...' : 'Actualizar'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Navbar: Logo on left, Role context in center, User profile / Login on right */}
      <div style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        {/* Brand Logo: ✻ fidely CLUB */}
        <div 
          className="header-logo-brand"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: !currentUser ? 'pointer' : 'default' }} 
          onClick={() => {
            if (!currentUser && setCurrentRole) setCurrentRole('LANDING');
          }}
          title={!currentUser ? "fidely CLUB • Inicio" : "fidely CLUB"}
        >
          <img 
            src="/fidely.png" 
            alt="fidely" 
            style={{ 
              width: '36px', 
              height: '36px', 
              objectFit: 'contain' 
            }} 
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.4rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                letterSpacing: '-0.03em'
              }}>
                fidely
              </span>
              <span style={{
                fontSize: '0.62rem',
                fontWeight: 800,
                color: 'var(--c-primary)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                alignSelf: 'flex-start',
                marginTop: '4px'
              }}>
                CLUB
              </span>
            </div>
          </div>
        </div>

        {/* Center: Context Badge for Active Role & Acceso POS Móvil */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {currentUser?.role === 'POS' && selectedStore && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--c-secondary-soft)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--border-subtle)',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--c-primary)'
              }}>
                <Store size={15} />
                <span>{selectedStore.name} • Terminal POS</span>
              </div>

              {/* Botón Acceso Rápido a POS Móvil */}
              <button
                type="button"
                onClick={() => {
                  try { localStorage.setItem('fidely_pos_mobile_mode', 'true'); } catch (e) {}
                  if (setCurrentRole) setCurrentRole('POS');
                }}
                className="btn-pill-wine"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #70092B 0%, #9C382A 100%)',
                  color: '#FFFFFF',
                  borderRadius: '9999px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(112, 9, 43, 0.25)'
                }}
                title="Abrir área de POS Móvil"
              >
                <Smartphone size={14} />
                <span>POS Móvil</span>
                <span style={{ opacity: 0.9 }}>→</span>
              </button>
            </div>
          )}

          {currentUser?.role === 'ADMIN' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {currentRole === 'POS' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (setCurrentRole) setCurrentRole('ADMIN');
                  }}
                  className="btn-pill-wine"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    fontSize: '0.80rem',
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #70092B 0%, #9C382A 100%)',
                    color: '#FFFFFF',
                    borderRadius: '9999px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(112, 9, 43, 0.25)'
                  }}
                  title="Volver a la consola de administración"
                >
                  <LayoutDashboard size={15} />
                  <span>← Volver al Panel Admin</span>
                </button>
              ) : (
                <div 
                  className="hide-on-mobile"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--c-secondary-soft)',
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--border-subtle)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: 'var(--c-primary)'
                  }}
                >
                  <LayoutDashboard size={15} />
                  <span>Consola Administrativa</span>
                </div>
              )}
            </div>
          )}

          {!currentUser && (
            <nav className="header-landing-nav" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <a href="#soluciones" className="header-nav-link">
                Soluciones
              </a>
              <a href="#simulador" className="header-nav-link">
                Simulador ROI
              </a>
              <a href="#reglas" className="header-nav-link">
                Reglas
              </a>
              <a href="#faq" className="header-nav-link">
                Preguntas
              </a>
            </nav>
          )}
        </div>

        {/* Right: User Profile or Login CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--c-secondary-soft)',
                padding: '5px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: 'var(--c-primary)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.78rem',
                  fontWeight: 800
                }}>
                  {currentUser.initials || currentUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ textAlign: 'left' }} className="hide-on-mobile">
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
                    {currentUser.name}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: 'var(--c-primary)', fontWeight: 700 }}>
                    {currentUser.role === 'CLIENT' ? 'Socio Club' : currentUser.role === 'POS' ? 'Cajero POS' : 'Administrador'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="btn btn-outline"
                style={{ padding: '7px 12px', fontSize: '0.8rem', gap: '5px', color: 'var(--c-rose)' }}
                title="Cerrar Sesión y volver al inicio"
              >
                <LogOut size={14} />
                <span className="hide-on-mobile">Cerrar Sesión</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={onOpenLogin}
                className="btn-pill-wine header-login-btn"
                style={{ padding: '8px 18px', fontSize: '0.82rem', cursor: 'pointer' }}
              >
                <span>Comenzar gratis</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>→</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .header-landing-nav {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
