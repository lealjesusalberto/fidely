import React, { useState } from 'react';
import { Smartphone, X, QrCode, ArrowUpRight } from 'lucide-react';

export default function AllianceFloatingBanner() {
  const [isOpen, setIsOpen] = useState(true);

  const googlePlayUrl = "https://play.google.com/store/apps/details?id=com.conecta2.services_app";

  if (!isOpen) {
    return (
      <aside 
        aria-label="Acceso App Clientes Conecta 2"
        className="alliance-floating-minimized"
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: 'linear-gradient(135deg, #1C1917 0%, #2A1713 100%)',
          border: '1px solid rgba(224, 138, 117, 0.45)',
          borderRadius: '9999px',
          padding: '6px 14px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35), 0 0 12px rgba(184, 93, 67, 0.2)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          cursor: 'pointer',
          color: '#FFFFFF',
          maxWidth: 'calc(100vw - 24px)',
          whiteSpace: 'nowrap',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <span style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#10B981',
          boxShadow: '0 0 6px #10B981',
          flexShrink: 0
        }} />
        <Smartphone size={13} color="#F2A691" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          App Móvil: Solo Clientes • Tiendas vía Web
        </span>
        <span style={{ fontSize: '9px', color: '#F2A691', flexShrink: 0 }}>▲</span>
      </aside>
    );
  }

  return (
    <aside 
      aria-label="Banner Alianza Conecta 2"
      className="alliance-floating-box"
      style={{
        position: 'fixed',
        bottom: '22px',
        right: '22px',
        zIndex: 9999,
        width: '350px',
        maxWidth: 'calc(100vw - 32px)',
        background: 'linear-gradient(145deg, rgba(28, 25, 23, 0.97) 0%, rgba(38, 20, 16, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1.5px solid rgba(224, 138, 117, 0.4)',
        borderRadius: '22px',
        padding: '18px 20px',
        boxShadow: '0 24px 50px -10px rgba(0, 0, 0, 0.55), 0 0 25px rgba(184, 93, 67, 0.2)',
        color: '#FFFFFF',
        overflow: 'hidden',
        boxSizing: 'border-box',
        animation: 'fadeInSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Ambient Glow in corner */}
      <div style={{
        position: 'absolute',
        top: '-40px',
        right: '-40px',
        width: '140px',
        height: '140px',
        background: 'radial-gradient(circle, rgba(184, 93, 67, 0.35) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* Header Row: Badge & Close Button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(184, 93, 67, 0.2)',
          border: '1px solid rgba(224, 138, 117, 0.35)',
          padding: '3px 10px',
          borderRadius: '9999px',
          fontSize: '0.68rem',
          fontWeight: 800,
          color: '#F2A691',
          letterSpacing: '0.04em',
          textTransform: 'uppercase'
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#10B981',
            boxShadow: '0 0 6px #10B981'
          }} />
          App Móvil • Solo Clientes
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(false)}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: '#A8A29E',
            cursor: 'pointer',
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease'
          }}
          title="Minimizar aviso"
          aria-label="Cerrar banner"
        >
          <X size={14} />
        </button>
      </div>

      {/* Title & Body */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: '14px' }}>
        <h4 style={{
          fontSize: '0.96rem',
          fontWeight: 800,
          lineHeight: 1.25,
          color: '#FFFFFF',
          margin: '0 0 6px',
          letterSpacing: '-0.01em'
        }}>
          App Móvil exclusiva para Clientes
        </h4>
        <p style={{
          fontSize: '0.78rem',
          color: '#D6D3D1',
          lineHeight: 1.45,
          margin: '0 0 10px 0'
        }}>
          La <strong style={{ color: '#FFFFFF' }}>App Móvil Conecta 2</strong> es únicamente para clientes (consultar puntos, sellos y presentar tu tarjeta QR).
        </p>

        {/* Nota para Tiendas */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(242, 166, 145, 0.3)',
          borderRadius: '10px',
          padding: '8px 10px',
          fontSize: '0.72rem',
          color: '#FED7AA',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          lineHeight: 1.35
        }}>
          <span style={{ fontSize: '1rem', flexShrink: 0 }}>🏪</span>
          <span>
            <strong>¿Eres Tienda / Comercio?</strong> Tu panel y terminal POS opera directamente <strong>por esta Web</strong>.
          </span>
        </div>
      </div>

      {/* CTA Button: Google Play Direct Link */}
      <a
        href={googlePlayUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, var(--c-primary) 0%, #872E22 100%)',
          color: '#FFFFFF',
          textDecoration: 'none',
          padding: '10px 14px',
          borderRadius: '14px',
          fontSize: '0.80rem',
          fontWeight: 800,
          boxShadow: '0 6px 18px rgba(156, 56, 42, 0.35)',
          position: 'relative',
          zIndex: 1,
          transition: 'transform 0.15s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Google Play Minimal Vector SVG */}
          <svg width="18" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3.609 1.814L13.793 12 3.61 22.186c-.378-.403-.61-.958-.61-1.586V3.4c0-.628.232-1.183.61-1.586z" fill="#00C1A6"/>
            <path d="M17.18 8.613L4.697.74C4.303.493 3.923.468 3.61.547L13.793 12l3.387-3.387z" fill="#00E676"/>
            <path d="M17.18 15.387L13.793 12 3.61 23.453c.313.079.693.054 1.087-.193l12.483-7.873z" fill="#FF3D00"/>
            <path d="M20.672 10.772l-3.492-2.159L13.793 12l3.387 3.387 3.492-2.159c.983-.607.983-1.849 0-2.456z" fill="#FFD600"/>
          </svg>
          <span>Descargar App Clientes (Play Store)</span>
        </div>
        <ArrowUpRight size={15} />
      </a>

      <style>{`
        @keyframes fadeInSlideUp {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @media (max-width: 600px) {
          .alliance-floating-box {
            left: 16px !important;
            right: 16px !important;
            bottom: 16px !important;
            width: auto !important;
          }
          .alliance-floating-minimized {
            right: 16px !important;
            bottom: 16px !important;
          }
        }
      `}</style>
    </aside>
  );
}
