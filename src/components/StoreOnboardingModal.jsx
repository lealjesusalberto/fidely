import React, { useState, useEffect } from 'react';
import {
  Store,
  Receipt,
  QrCode,
  Gift,
  BarChart3,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  ShieldCheck,
  TrendingUp,
  Clock,
  DollarSign,
  Check,
  Award
} from 'lucide-react';

export default function StoreOnboardingModal({
  isOpen,
  onClose,
  storeName = 'Comercio Aliado',
  confirmButtonText = '🎨 Configurar mi Tarjeta de Fidelidad 🚀',
  onConfigureCard = null
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(true);
  const [touchStartX, setTouchStartX] = useState(null);

  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (diff > 45) {
      if (currentSlide < slides.length - 1) {
        setCurrentSlide(prev => prev + 1);
      } else {
        handleFinish();
      }
    } else if (diff < -45) {
      if (currentSlide > 0) {
        setCurrentSlide(prev => prev - 1);
      }
    }
    setTouchStartX(null);
  };

  const slides = [
    {
      id: 'WELCOME',
      categoryBadge: 'Fidelización por Sellos',
      icon: Store,
      title: 'Fideliza a tus clientes con tu propia Tarjeta Digital de Sellos',
      subtitle: `Bienvenido a fidely CLUB, el sistema oficial de sellos para ${storeName}.`,
      description: 'Olvídate de las tarjetas de cartón que se pierden o desgastan. Ahora cada cliente tiene en su teléfono la Tarjeta Digital oficial de tu tienda, donde acumula sellos en cada compra y desbloquea premios directos creados por ti.',
      bullets: [
        {
          title: '100% Digital y Siempre en el Móvil',
          desc: 'Tus clientes llevan tu tarjeta en su app sin cargar cartones ni sellos de tinta.',
          icon: Store
        },
        {
          title: 'Premios Directos sin Puntos Complicados',
          desc: '1 sello por cada compra elegible. Muy fácil de entender para clientes y cajeros.',
          icon: Award
        },
        {
          title: 'Diseño Exclusivo con tu Identidad',
          desc: 'Tus colores de marca, tu logo, el ícono del sello y la meta de visitas que tú elijas.',
          icon: Sparkles
        }
      ],
      image: '/hero_merchant.jpg',
      imageBadge: 'Tarjeta Digital • Sin Puntos',
      ruleTag: 'Cartilla Oficial de Tienda'
    },
    {
      id: 'REGISTER_SALE',
      categoryBadge: 'Módulo 1: Registrar Venta y Caja',
      icon: Receipt,
      title: 'Registra tus ventas y emite sellos con agilidad en caja',
      subtitle: 'Facturación en doble moneda (USD y Bs) a tasa oficial BCV en tiempo real.',
      description: 'Al cobrar, registra el monto de la compra y la referencia del ticket en tu terminal POS. El cliente escanea el código QR de tu mostrador con su app móvil para solicitar su sello de compra de forma instantánea.',
      bullets: [
        {
          title: 'Doble Moneda en Tiempo Real',
          desc: 'Cobros en USD y Bs sincronizados automáticamente con la tasa oficial BCV del día.',
          icon: Clock
        },
        {
          title: 'El Cliente Escanea tu QR en Caja',
          desc: 'El cliente apunta su cámara al QR de tu mostrador para solicitar su sello de compra.',
          icon: QrCode
        },
        {
          title: 'Historial Inmutable de Facturación',
          desc: 'Cada venta registrada queda archivada para tu control interno y cuadre diario de caja.',
          icon: Receipt
        }
      ],
      image: '/service_pos.jpg',
      imageBadge: 'Facturación USD y Bs Oficial',
      ruleTag: 'Registro de Ventas en Caja'
    },
    {
      id: 'QR_REDEMPTIONS',
      categoryBadge: 'Módulo 2: Solicitudes de Sellos en Vivo',
      icon: QrCode,
      title: 'Aprueba sellos en 1 solo clic al instante frente al cliente',
      subtitle: 'Tu terminal POS recibe las solicitudes de sellos de tus clientes en tiempo real.',
      description: 'Cuando el cliente escanea el QR en mostrador, tu terminal POS suena con una suave campanilla en vivo y muestra la solicitud en pantalla. Solo haces clic en "Aprobar Sello" y su cartilla digital se sella en menos de 2 segundos.',
      bullets: [
        {
          title: 'Alerta Sonora y Visual en Vivo',
          desc: 'Campanilla audible y aviso en pantalla cuando un cliente en mostrador solicita sello.',
          icon: Sparkles
        },
        {
          title: 'Aprobación Rápida con 1 Clic',
          desc: 'Verificas el ticket y apruebas el sello al instante frente al cliente en caja.',
          icon: CheckCircle2
        },
        {
          title: 'Seguridad Antifraude',
          desc: 'Cada sello requiere tu confirmación en pantalla, garantizando cero sellos duplicados.',
          icon: ShieldCheck
        }
      ],
      image: '/service_pass.jpg',
      imageBadge: 'Aprobación QR en Mostrador',
      ruleTag: 'Validación en Tiempo Real'
    },
    {
      id: 'CUSTOM_REWARDS',
      categoryBadge: 'Módulo 3: Premios y Recompensas',
      icon: Gift,
      title: 'Entrega premios cuando tus clientes completen su cartilla',
      subtitle: 'Crea incentivos que motiven a tus clientes a volver una y otra vez.',
      description: 'Tú decides cuántos sellos se requieren para cada premio (ej. 6 sellos para un café de cortesía, 10 sellos para un corte gratis o descuento especial). Cuando el cliente alcanza la meta, su app le indica "¡Listo para canjear!" y te muestra su QR para retirar su premio.',
      bullets: [
        {
          title: 'Premios Propios de tu Negocio',
          desc: 'Cortesías, productos estrella o servicios gratis que atraigan a tu clientela.',
          icon: Gift
        },
        {
          title: 'Canje Seguro en Mostrador',
          desc: 'Escaneas el carnet QR del cliente o apruebas el canje desde tu terminal para entregar el premio.',
          icon: ShieldCheck
        },
        {
          title: 'Reinicio Automático de Cartilla',
          desc: 'Al canjear el premio, la cartilla vuelve a 0 sellos para que el cliente siga comprando.',
          icon: TrendingUp
        }
      ],
      image: '/service_rewards.jpg',
      imageBadge: 'Premios por Fidelidad',
      ruleTag: 'Catálogo de tu Tienda'
    },
    {
      id: 'SHIFT_SUMMARY',
      categoryBadge: 'Módulos 4 y 5: Cuadre Diario y Métricas',
      icon: BarChart3,
      title: 'Cuadre diario de ventas y control de clientes fieles',
      subtitle: 'Historial transparente de facturación, sellos otorgados y premios canjeados.',
      description: 'Al terminar tu jornada comercial, consulta el balance total de ventas en dólares y bolívares, la cantidad de sellos emitidos y los premios entregados a tus clientes. Todo listo para exportar o imprimir para la administración.',
      bullets: [
        {
          title: 'Cierre de Turno por Sucursal',
          desc: 'Conciliación rápida de caja por turno, fecha y cajero.',
          icon: BarChart3
        },
        {
          title: 'Métricas de Sellos y Clientes',
          desc: 'Monitorea cuántos clientes sellaron su cartilla y cuántas recompensas entregaste en el día.',
          icon: TrendingUp
        },
        {
          title: 'Módulo de Devoluciones Auditado',
          desc: 'Permite anular o revertir tickets si un cliente devuelve productos o cancela una orden.',
          icon: Clock
        }
      ],
      image: '/banner_store.jpg',
      imageBadge: 'Auditoría y Cuadre de Caja',
      ruleTag: 'Control Diario de Operaciones'
    }
  ];

  // Keyboard navigation (arrows + Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        setCurrentSlide(prev => (prev < slides.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlide(prev => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Escape') {
        handleFinish();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, slides.length]);

  if (!isOpen) return null;

  const current = slides[currentSlide];
  const isLast = currentSlide === slides.length - 1;

  const handleFinish = (shouldConfigure = false) => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('fidely_store_onboarding_completed', 'true');
      } catch (e) { }
    }
    onClose();
    if (shouldConfigure && onConfigureCard) {
      onConfigureCard();
    }
  };

  const handleNext = () => {
    if (isLast) {
      handleFinish(Boolean(onConfigureCard));
    } else {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  return (
    <div
      className="onboarding-modal-overlay"
      onClick={handleFinish}
    >
      <div
        className="onboarding-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* 1. Header Bar */}
        <div className="onboarding-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <img
              src="/fidely.png"
              alt="fidely"
              style={{ width: '26px', height: '26px', objectFit: 'contain', flexShrink: 0 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                fidely
              </span>
              <span className="onboarding-guide-badge">
                GUÍA
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleFinish}
              className="onboarding-skip-btn"
            >
              Saltar
            </button>
            <span className="onboarding-step-counter">
              {currentSlide + 1} / {slides.length}
            </span>
            <button
              type="button"
              onClick={handleFinish}
              className="onboarding-close-btn"
              title="Cerrar tutorial"
              aria-label="Cerrar"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* 2. Top Progress Track */}
        <div style={{ width: '100%', height: '3px', background: '#EDE2D5', flexShrink: 0 }}>
          <div
            style={{
              width: `${((currentSlide + 1) / slides.length) * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #DE8B76 0%, #9C382A 100%)',
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
        </div>

        {/* 3. Main Slide Body */}
        <div className="onboarding-modal-body">
          <div className="onboarding-slide-layout">

            {/* Visual Image Card (On mobile displays above or alongside as a sleek visual) */}
            <div className="onboarding-image-card">
              <img
                src={current.image}
                alt={current.title}
                className="onboarding-image-element"
              />
              <div className="onboarding-image-overlay" />

              {/* Floating Badge on Image */}
              <div className="onboarding-image-badge">
                <Sparkles size={12} color="var(--c-primary)" />
                <span>{current.imageBadge}</span>
              </div>

              {/* Bottom Quote on Image */}
              <div className="onboarding-image-caption">
                <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.82)', fontWeight: 800, marginBottom: '2px' }}>
                  {storeName}
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, lineHeight: 1.25, color: '#FFFFFF' }}>
                  {current.subtitle}
                </div>
              </div>
            </div>

            {/* Text & Bullets Column */}
            <div className="onboarding-content-column">
              {/* Category Pill + Rule Tag */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span className="onboarding-category-pill">
                  <current.icon size={13} />
                  <span>{current.categoryBadge}</span>
                </span>

                <span className="onboarding-rule-pill">
                  {current.ruleTag}
                </span>
              </div>

              {/* Title */}
              <h2 className="onboarding-title">
                {current.title}
              </h2>

              <p className="onboarding-description">
                {current.description}
              </p>

              {/* 3 Key Benefits Bullets */}
              <div className="onboarding-bullets-list">
                {current.bullets.map((b, idx) => (
                  <div
                    key={idx}
                    className="onboarding-bullet-card"
                  >
                    <div className="onboarding-bullet-icon">
                      <b.icon size={13} color="var(--c-primary)" />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="onboarding-bullet-title">
                        {b.title}
                      </div>
                      <div className="onboarding-bullet-desc">
                        {b.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botón de Acción Directa: Configurar Tarjeta de Fidelidad */}
              {current.id === 'WELCOME' && onConfigureCard && (
                <div style={{
                  marginTop: '16px',
                  padding: '14px 16px',
                  background: 'var(--c-secondary-soft, #FAF4EE)',
                  border: '1.5px solid #EDE2D5',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--c-primary, #9C382A)' }}>
                      🎨 Paso 1 Indispensable: Personaliza tu Tarjeta
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                      Elige tus colores de marca, tu ícono de sello y tus premios.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleFinish(true);
                    }}
                    className="btn"
                    style={{
                      padding: '8px 16px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      background: 'var(--c-primary, #9C382A)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '10px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(156, 56, 42, 0.25)',
                      cursor: 'pointer'
                    }}
                  >
                    <span>Configurar Tarjeta Ahora</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* 4. Footer Navigation Bar */}
        <div className="onboarding-modal-footer">
          {/* Top row in mobile: Checkbox and Dots */}
          <div className="onboarding-footer-top-row">
            <label className="onboarding-checkbox-label">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                style={{ accentColor: 'var(--c-primary)', width: '15px', height: '15px', cursor: 'pointer' }}
              />
              <span>No volver a mostrar al ingresar</span>
            </label>

            {/* Dots */}
            <div className="onboarding-dots-container">
              {slides.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCurrentSlide(idx)}
                  className={`onboarding-dot ${currentSlide === idx ? 'is-active' : ''}`}
                  title={`Ir a paso ${idx + 1}`}
                  aria-label={`Paso ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="onboarding-footer-btn-row">
            {currentSlide > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="btn btn-secondary onboarding-btn-prev"
              >
                <ArrowLeft size={14} />
                <span>Anterior</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="btn btn-primary onboarding-btn-next"
            >
              <span>{isLast ? confirmButtonText : 'Siguiente Paso'}</span>
              {!isLast && <ArrowRight size={14} />}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .onboarding-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(12, 10, 9, 0.78);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          z-index: 10000;
          padding: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          animation: onboardingFadeIn 0.22s ease-out;
        }

        .onboarding-modal-dialog {
          max-width: 840px;
          width: 100%;
          border-radius: 24px;
          overflow: hidden;
          background: #FFFFFF;
          border: 1px solid rgba(222, 139, 118, 0.35);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
          display: flex;
          flex-direction: column;
          max-height: min(92vh, 760px);
          touch-action: pan-y;
          animation: onboardingScaleUp 0.26s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .onboarding-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          border-bottom: 1px solid #EDE2D5;
          background: #FAF8F5;
          flex-shrink: 0;
          gap: 10px;
        }

        .onboarding-guide-badge {
          background: linear-gradient(135deg, #DE8B76 0%, #9C382A 100%);
          color: #FFFFFF;
          font-size: 0.64rem;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 6px;
          letter-spacing: 0.05em;
          white-space: nowrap;
        }

        .onboarding-skip-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 0.76rem;
          font-weight: 700;
          cursor: pointer;
          padding: 4px 6px;
          border-radius: 6px;
        }

        .onboarding-step-counter {
          font-size: 0.74rem;
          color: var(--text-muted);
          font-weight: 750;
          background: #FFFFFF;
          border: 1px solid #EEDCD5;
          padding: 2px 8px;
          border-radius: 10px;
          white-space: nowrap;
        }

        .onboarding-close-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 50%;
          transition: background 0.15s ease;
        }

        .onboarding-modal-body {
          padding: 20px 24px;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          flex: 1;
        }

        .onboarding-slide-layout {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 22px;
          align-items: center;
        }

        .onboarding-content-column {
          display: flex;
          flex-direction: column;
        }

        .onboarding-category-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #FBF5F2;
          color: var(--c-primary);
          border: 1px solid #EEDCD5;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 0.72rem;
          font-weight: 800;
        }

        .onboarding-rule-pill {
          background: #FAF8F5;
          color: var(--text-muted);
          border: 1px solid #EDE2D5;
          padding: 2px 7px;
          border-radius: 8px;
          font-size: 0.68rem;
          font-weight: 600;
        }

        .onboarding-title {
          font-size: 1.35rem;
          font-weight: 800;
          line-height: 1.25;
          color: var(--text-main);
          letter-spacing: -0.02em;
          margin: 0 0 6px 0;
        }

        .onboarding-description {
          font-size: 0.84rem;
          color: var(--text-muted);
          line-height: 1.45;
          margin: 0 0 14px 0;
        }

        .onboarding-bullets-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .onboarding-bullet-card {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: #FAF8F5;
          border: 1px solid #EDE2D5;
          padding: 8px 12px;
          border-radius: 12px;
          transition: transform 0.15s ease;
        }

        .onboarding-bullet-icon {
          width: 26px;
          height: 26px;
          border-radius: 8px;
          background: #FBF5F2;
          border: 1px solid #EEDCD5;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .onboarding-bullet-title {
          font-size: 0.80rem;
          font-weight: 800;
          color: var(--text-main);
          line-height: 1.25;
        }

        .onboarding-bullet-desc {
          font-size: 0.74rem;
          color: var(--text-muted);
          line-height: 1.35;
          margin-top: 2px;
        }

        .onboarding-image-card {
          position: relative;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.10);
          border: 1px solid #EDE2D5;
          background: #FAF8F5;
          height: 320px;
        }

        .onboarding-image-element {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .onboarding-image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0,0,0,0.02) 0%, rgba(12,10,9,0.72) 100%);
        }

        .onboarding-image-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(8px);
          color: var(--c-primary);
          padding: 3px 9px;
          border-radius: 10px;
          font-size: 0.70rem;
          font-weight: 800;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .onboarding-image-caption {
          position: absolute;
          bottom: 14px;
          left: 14px;
          right: 14px;
          color: #FFFFFF;
        }

        .onboarding-modal-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          border-top: 1px solid #EDE2D5;
          background: #FAF8F5;
          gap: 12px;
          flex-shrink: 0;
        }

        .onboarding-footer-top-row {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .onboarding-checkbox-label {
          display: flex;
          align-items: center;
          gap: 7px;
          cursor: pointer;
          font-size: 0.76rem;
          color: var(--text-muted);
          user-select: none;
        }

        .onboarding-dots-container {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .onboarding-dot {
          width: 7px;
          height: 7px;
          border-radius: 4px;
          border: none;
          background: #EDE2D5;
          cursor: pointer;
          padding: 0;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .onboarding-dot.is-active {
          width: 20px;
          background: var(--c-primary);
        }

        .onboarding-footer-btn-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .onboarding-btn-prev {
          padding: 8px 13px;
          font-size: 0.80rem;
          display: flex;
          align-items: center;
          gap: 5px;
          border-radius: 10px;
        }

        .onboarding-btn-next {
          padding: 8px 18px;
          font-size: 0.80rem;
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 800;
          border-radius: 10px;
        }

        /* ================= MOBILE OPTIMIZATIONS ================= */
        @media (max-width: 767px) {
          .onboarding-modal-overlay {
            padding: 8px;
          }

          .onboarding-modal-dialog {
            max-height: 94dvh;
            border-radius: 20px;
          }

          .onboarding-modal-header {
            padding: 10px 14px;
          }

          .onboarding-modal-body {
            padding: 14px 14px 16px 14px;
          }

          .onboarding-slide-layout {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }

          /* Compact visual banner on mobile */
          .onboarding-image-card {
            height: 140px !important;
            order: -1;
            border-radius: 14px;
          }

          .onboarding-image-caption {
            bottom: 10px;
            left: 10px;
            right: 10px;
          }

          .onboarding-image-caption div:last-child {
            font-size: 0.80rem !important;
          }

          .onboarding-title {
            font-size: 1.15rem !important;
            line-height: 1.25 !important;
            margin-bottom: 6px !important;
          }

          .onboarding-description {
            font-size: 0.78rem !important;
            line-height: 1.4 !important;
            margin-bottom: 10px !important;
          }

          .onboarding-bullet-card {
            padding: 7px 10px !important;
            border-radius: 10px;
            gap: 8px !important;
          }

          .onboarding-bullet-title {
            font-size: 0.77rem !important;
          }

          .onboarding-bullet-desc {
            font-size: 0.71rem !important;
            line-height: 1.3 !important;
          }

          /* Footer splits into 2 clean rows */
          .onboarding-modal-footer {
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 10px 14px !important;
            gap: 10px !important;
          }

          .onboarding-footer-top-row {
            justify-content: space-between !important;
            width: 100% !important;
          }

          .onboarding-checkbox-label {
            font-size: 0.70rem !important;
          }

          .onboarding-footer-btn-row {
            width: 100% !important;
            display: flex !important;
          }

          .onboarding-btn-prev {
            flex: 0 0 auto !important;
            padding: 9px 12px !important;
          }

          .onboarding-btn-next {
            flex: 1 1 auto !important;
            justify-content: center !important;
            padding: 9px 16px !important;
          }
        }

        @keyframes onboardingFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes onboardingScaleUp {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
