import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Store,
  CheckCircle2,
  Gift,
  Plus,
  Minus,
  Star,
  Smartphone,
  Scan,
  Shield,
  Coffee,
  ArrowUpRight,
  Quote,
  MapPin,
  BellRing,
  RotateCcw
} from 'lucide-react';
import { fireRedemptionConfetti } from '../utils/confetti';
import HeroStoresMapMotion from './HeroStoresMapMotion';

export default function LandingPageView({ onNavigate }) {
  // Real-time Scroll Parallax & Scroll-Driven Observer
  const [scrollY, setScrollY] = useState(0);

  // Triple-Hero Auto-Carousel State (5 seconds cycle)
  const [activeHeroSlide, setActiveHeroSlide] = useState(0); // 0 = Laptop 3D (Comercio), 1 = Escaneo QR (Cliente), 2 = Tiendas Afiliadas & Mapa (Comunidades)
  const [isSlidePaused, setIsSlidePaused] = useState(false);

  useEffect(() => {
    if (isSlidePaused) return;

    const timer = setInterval(() => {
      setActiveHeroSlide((prev) => (prev === 2 ? 0 : prev + 1));
    }, 5000); // Rota garantizado cada 5 segundos

    return () => clearInterval(timer);
  }, [isSlidePaused, activeHeroSlide]);

  const handleSelectHeroSlide = (idx) => {
    setActiveHeroSlide(idx);
  };

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    // IntersectionObserver for robust, smooth viewport reveals
    const targets = document.querySelectorAll('.scroll-reveal-section, .scroll-reveal-card');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px'
      }
    );

    targets.forEach((el) => observer.observe(el));

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  // Interactive Stamp Simulator State
  const [simStampsTarget, setSimStampsTarget] = useState(6);
  const [simCurrentStamps, setSimCurrentStamps] = useState(3);
  const [simRewardTitle] = useState('Café Americano + Croissant de Cortesía');
  const [simStoreName] = useState('Café & Bakery Gourmet');
  const [simCardColor, setSimCardColor] = useState('#70092B');
  const [simCardGradient, setSimCardGradient] = useState('#B85D43');

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  // Add a stamp in the interactive simulator
  const handleAddStampSim = () => {
    if (simCurrentStamps < simStampsTarget) {
      const next = simCurrentStamps + 1;
      setSimCurrentStamps(next);
      if (next === simStampsTarget) {
        fireRedemptionConfetti();
      }
    }
  };

  const handleResetSim = () => {
    setSimCurrentStamps(0);
  };

  // FAQ Items tailored to Digital Stamp Loyalty Cards
  const faqItems = [
    {
      q: "¿Cómo funciona la tarjeta de fidelización con sellos digitales para mis clientes?",
      a: "Tus clientes acceden a su tarjeta de fidelización digital directamente desde su teléfono móvil o navegador web, sin necesidad de descargar aplicaciones pesadas ni llenar formularios en papel. En su tarjetero ven los sellos acumulados, cuántos le faltan para la meta y el premio que van a recibir."
    },
    {
      q: "¿Cómo se otorgan y validan los sellos en el mostrador del negocio?",
      a: "El cliente presenta su código QR en caja o escanea el QR del mostrador con la cámara de su celular para solicitar su sello. El cajero o dueño valida la compra con 1 solo clic desde la terminal POS web o app en 2 segundos, acreditando el sello de forma instantánea y segura."
    },
    {
      q: "¿Puedo personalizar la cantidad de sellos y los premios de mi local?",
      a: "Totalmente. Puedes configurar la meta de sellos que mejor se adapte a tu ticket de venta (por ejemplo 4, 6, 8 o 10 sellos), personalizar el color, degradado e ícono de tu tarjeta, y definir premios escalonados (por ejemplo una bebida de cortesía al sello 3 y un postre o almuerzo al sello 6)."
    },
    {
      q: "¿Cómo funcionan las notificaciones push por proximidad (< 500m)?",
      a: "Cuando un cliente que tiene tu tarjeta de fidelización transita a menos de 500 metros de tu negocio, su teléfono móvil y navegador web reciben una notificación push personalizada recordándole que está cerca y cuántos sellos le faltan para ganar su premio, atrayendo visitas espontáneas."
    },
    {
      q: "¿El cliente puede tener tarjetas de varios comercios aliados a la vez?",
      a: "Sí. Fidely Club es una red multitienda donde cada cliente tiene un tarjetero digital ordenado. Cada comercio aliado tiene su propia tarjeta independiente, con sus propios sellos y premios exclusivos que no se mezclan con los de otras tiendas."
    },
    {
      q: "¿Cómo se previene el fraude o los sellos duplicados?",
      a: "Ningún cliente puede autoasignarse sellos. Cada sello requiere estrictamente la aprobación del cajero en el punto de venta. Además, cada operación queda asentada con fecha, hora, tienda y usuario en un registro inmutable de auditoría para total tranquilidad contable."
    }
  ];

  return (
    <div style={{ background: '#FAF7F5', color: 'var(--text-main)', width: '100%', overflowX: 'hidden', position: 'relative' }} className="animate-fade-in">

      {/* Top Viewport Scroll Progress Bar */}
      <div className="scroll-progress-indicator" />

      {/* =========================================================================
          HERO SECTION (fidelyclub.net - Laptop + 3D Storefront + Search Capsule)
          ========================================================================= */}
      <section style={{
        position: 'relative',
        background: 'linear-gradient(180deg, #FAF7F5 0%, #FAF7F5 70%, #F5EAE8 100%)',
        padding: '36px 20px 60px',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>

        {/* Ambient Organic Curved Wave in Background (Matching image) */}
        <div style={{
          position: 'absolute',
          bottom: '-120px',
          right: '-10%',
          width: '720px',
          height: '420px',
          borderRadius: '50% 50% 0 0',
          background: 'radial-gradient(circle at 50% 50%, rgba(112, 9, 43, 0.12) 0%, rgba(112, 9, 43, 0.03) 70%, transparent 100%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
          zIndex: 0
        }} />

        {/* SLIDES CONTAINER WITH DUAL-HERO CROSS-FADE */}
        <div style={{ position: 'relative', minHeight: '520px', width: '100%' }}>

          {/* =========================================================================
              SLIDE 0: VISTA COMERCIO (Laptop 3D + Tiendita + Barra fidelyclub.net)
              ========================================================================= */}
          <div className={`hero-slide-pane ${activeHeroSlide === 0 ? 'hero-slide-active' : 'hero-slide-inactive'}`}>
            <div style={{
              maxWidth: '1240px',
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: '1.05fr 1.15fr',
              alignItems: 'center',
              gap: '40px',
              position: 'relative',
              zIndex: 1
            }} className="landing-hero-grid">

              {/* LEFT COLUMN: Typography & Direct Calls to Action */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }} className="anim-fade-up">

                {/* Top Hello Badge */}
                <div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#FFFFFF',
                    border: '1.5px solid #EADCDA',
                    padding: '6px 16px',
                    borderRadius: '9999px',
                    boxShadow: '0 2px 10px rgba(112, 9, 43, 0.05)'
                  }}>
                    <Sparkles size={14} color="#70092B" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1C1917', letterSpacing: '0.02em' }}>
                      Plataforma de Lealtad & Sellos Digitales • <span style={{ color: '#70092B' }}>fidely &gt;club&lt;</span>
                    </span>
                  </div>
                </div>

                {/* Main High-Impact Headline (Exact matching layout from photo) */}
                <h1 style={{
                  fontFamily: 'var(--font-main)',
                  fontSize: 'clamp(2.6rem, 5.2vw, 4.4rem)',
                  fontWeight: 800,
                  lineHeight: 1.08,
                  letterSpacing: '-0.035em',
                  color: '#1C1917',
                  margin: 0
                }}>
                  Premia la <br />
                  lealtad de tus <br />
                  <span style={{ color: '#70092B' }}>clientes</span>
                </h1>

                {/* Subtitle */}
                <p style={{
                  fontSize: 'clamp(1.05rem, 1.8vw, 1.22rem)',
                  color: '#57534E',
                  lineHeight: 1.5,
                  maxWidth: '520px',
                  margin: 0,
                  fontWeight: 500
                }}>
                  Con Fidely Club, convierte tus compras en beneficios. Reemplaza las tarjetas de cartón por un tarjetero digital interactivo con sellos QR en mostrador.
                </p>

                {/* Feature Pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#FFFFFF',
                    border: '1px solid #EADCDA',
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#292524'
                  }}>
                    <CheckCircle2 size={14} color="#70092B" />
                    <span>100% digital en celular (cero papel)</span>
                  </div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#FFFFFF',
                    border: '1px solid #EADCDA',
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#292524'
                  }}>
                    <CheckCircle2 size={14} color="#70092B" />
                    <span>Premios y sellos por local</span>
                  </div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#FFFFFF',
                    border: '1px solid #EADCDA',
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#292524'
                  }}>
                    <CheckCircle2 size={14} color="#70092B" />
                    <span>Avisos de proximidad (&lt; 500m)</span>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginTop: '10px' }} className="landing-hero-ctas">
                  <button
                    type="button"
                    onClick={() => onNavigate('LOGIN')}
                    className="btn-pill-wine"
                    title="Crear mi Tarjeta en fidely CLUB"
                  >
                    <span>Crear mi Tarjeta</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>→</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate('LOGIN')}
                    className="btn-pill-cream"
                    title="Ingresar como cliente o probar demo"
                  >
                    <span>Ingresar / Probar Demo</span>
                  </button>
                </div>

                {/* Social Proof */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                  <div style={{ display: 'flex', marginLeft: '6px' }}>
                    {['#70092B', '#881337', '#A21D4C', '#C2410C'].map((col, idx) => (
                      <div
                        key={idx}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: col,
                          border: '2px solid #FFFFFF',
                          marginLeft: idx === 0 ? '0' : '-8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF',
                          fontSize: '0.68rem',
                          fontWeight: 800
                        }}
                      >
                        ★
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#78716C', fontWeight: 600 }}>
                    <strong style={{ color: '#1C1917' }}>+400 clientes y comercios aliados</strong> acumulan y premian lealtad hoy
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: The 3D Composition (Laptop Mockup + 3D Store + Search Capsule) */}
              <div style={{ position: 'relative', width: '100%', minHeight: '440px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

                <div className="hero-scene-3d" style={{ width: '100%', maxWidth: '620px', position: 'relative' }}>

                  {/* Decorative Stars & Sparkles */}
                  <div className="hero-sparkle" style={{ position: 'absolute', top: '10px', right: '90px', fontSize: '24px', color: '#70092B', zIndex: 12 }}>
                    ✦
                  </div>
                  <div className="hero-sparkle" style={{ position: 'absolute', top: '40px', right: '40px', fontSize: '18px', color: '#A21D4C', zIndex: 12, animationDelay: '1.2s' }}>
                    ★
                  </div>
                  <div className="hero-sparkle" style={{ position: 'absolute', top: '90px', left: '10px', fontSize: '20px', color: '#70092B', zIndex: 12, animationDelay: '0.6s' }}>
                    ✦
                  </div>

                  {/* 1. THE LAPTOP MOCKUP RIG */}
                  <div className="hero-laptop-rig" style={{
                    width: '100%',
                    maxWidth: '510px',
                    position: 'relative',
                    transform: `rotateY(-8deg) rotateX(6deg) translateY(${Math.min(scrollY * 0.1, 45)}px)`
                  }}>

                    {/* Laptop Screen Body */}
                    <div style={{
                      background: '#18181B',
                      borderRadius: '16px 16px 4px 4px',
                      padding: '10px 10px 14px',
                      boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                      position: 'relative'
                    }}>

                      {/* Top Camera Notch Dot */}
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#27272A',
                        margin: '0 auto 8px',
                        border: '1px solid #3F3F46'
                      }} />

                      {/* Laptop Display (Inside Canvas) */}
                      <div style={{
                        background: '#FAF7F5',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid #E4E4E7',
                        position: 'relative',
                        aspectRatio: '16 / 10',
                        display: 'flex',
                        flexDirection: 'column'
                      }}>

                        {/* Mini Navbar inside Laptop */}
                        <div style={{
                          background: '#FFFFFF',
                          borderBottom: '1px solid #EADCDA',
                          padding: '8px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '5px',
                              background: '#70092B',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#FFFFFF',
                              fontSize: '11px',
                              fontWeight: 800
                            }}>
                              f
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#70092B', letterSpacing: '-0.02em' }}>
                              fidely <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#A21D4C' }}>&gt;club&lt;</span>
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#57534E' }}>Tiendas</span>
                            <div style={{
                              background: '#70092B',
                              color: '#FFFFFF',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '3px 9px',
                              borderRadius: '9999px'
                            }}>
                              Crear mi Tarjeta
                            </div>
                          </div>
                        </div>

                        {/* Inside Display Content Layout */}
                        <div style={{
                          padding: '16px 14px',
                          display: 'grid',
                          gridTemplateColumns: '1.2fr 1fr',
                          alignItems: 'center',
                          height: '100%',
                          boxSizing: 'border-box',
                          gap: '10px',
                          position: 'relative'
                        }}>

                          {/* Mini Left Copy inside Laptop */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{
                              fontSize: 'clamp(0.95rem, 1.4vw, 1.15rem)',
                              fontWeight: 800,
                              lineHeight: 1.15,
                              color: '#1C1917'
                            }}>
                              Premia la <br />
                              lealtad de tus <br />
                              <span style={{ color: '#70092B' }}>clientes</span>
                            </div>
                            <div style={{ fontSize: '0.62rem', color: '#78716C', lineHeight: 1.3 }}>
                              Con Fidely Club, convierte tus compras en beneficios.
                            </div>
                            <div style={{
                              background: '#70092B',
                              color: '#FFFFFF',
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              padding: '4px 10px',
                              borderRadius: '9999px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              width: 'fit-content',
                              marginTop: '4px'
                            }}>
                              <span>Crear mi Tarjeta</span>
                              <span>→</span>
                            </div>
                          </div>

                          {/* Mini Floating 3D Loyalty Card inside Laptop */}
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <div className="hero-card-floating-3d" style={{
                              width: '135px',
                              height: '84px',
                              borderRadius: '10px',
                              background: 'linear-gradient(135deg, #70092B 0%, #54061F 100%)',
                              color: '#FFFFFF',
                              padding: '10px',
                              boxSizing: 'border-box',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              position: 'relative',
                              overflow: 'hidden'
                            }}>
                              {/* Card Glare */}
                              <div style={{
                                position: 'absolute',
                                top: '-30%',
                                right: '-30%',
                                width: '100px',
                                height: '100px',
                                background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%)',
                                borderRadius: '50%'
                              }} />

                              {/* Top Card Monogram */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: 'rgba(255,255,255,0.18)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '14px',
                                  fontWeight: 900
                                }}>
                                  f
                                </div>
                              </div>

                              {/* Card Title */}
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>
                                  fidely
                                </div>
                                <div style={{ fontSize: '0.52rem', fontWeight: 700, opacity: 0.85, letterSpacing: '0.08em' }}>
                                  &gt;club&lt;
                                </div>
                              </div>
                            </div>
                          </div>

                        </div>

                      </div>

                    </div>

                    {/* Laptop Base / Keyboard Hinge & Surface in Perspective */}
                    <div style={{
                      height: '14px',
                      background: 'linear-gradient(180deg, #D4D4D8 0%, #A1A1AA 40%, #71717A 100%)',
                      borderRadius: '0 0 16px 16px',
                      boxShadow: '0 15px 30px rgba(0, 0, 0, 0.35)',
                      position: 'relative',
                      margin: '0 -20px',
                      display: 'flex',
                      justifyContent: 'center'
                    }}>
                      <div style={{
                        width: '60px',
                        height: '4px',
                        background: '#71717A',
                        borderRadius: '0 0 4px 4px'
                      }} />
                    </div>

                  </div>

                  {/* 2. THE 3D ISOMETRIC STOREFRONT (Next to laptop, right side) */}
                  <div className="hero-store-3d" style={{
                    position: 'absolute',
                    right: '-15px',
                    bottom: '30px',
                    width: '160px',
                    zIndex: 15,
                    filter: 'drop-shadow(0 18px 24px rgba(84, 6, 31, 0.35))',
                    transform: `translateY(${Math.min(scrollY * 0.16, 60)}px)`
                  }}>

                    {/* Roof Logo Emblem */}
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: '#70092B',
                      border: '2.5px solid #FFFFFF',
                      color: '#FFFFFF',
                      margin: '0 auto -12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: 900,
                      boxShadow: '0 4px 10px rgba(84, 6, 31, 0.4)',
                      position: 'relative',
                      zIndex: 2
                    }}>
                      f
                    </div>

                    {/* Red & White Striped Awning (Toldo) */}
                    <div style={{
                      height: '46px',
                      borderRadius: '12px 12px 6px 6px',
                      background: 'repeating-linear-gradient(90deg, #70092B 0, #70092B 14px, #FFFFFF 14px, #FFFFFF 28px)',
                      boxShadow: '0 6px 12px rgba(0,0,0,0.18)',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'flex-end',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: '100%',
                        height: '8px',
                        background: 'repeating-radial-gradient(circle at 7px bottom, transparent 0, transparent 7px, #FFFFFF 7px)',
                        opacity: 0.95
                      }} />
                    </div>

                    {/* Store Front Wall & Door / Windows */}
                    <div style={{
                      background: 'linear-gradient(180deg, #FFFFFF 0%, #F5EAE8 100%)',
                      borderRadius: '0 0 10px 10px',
                      padding: '10px',
                      border: '1.5px solid #EADCDA',
                      borderTop: 'none',
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'center',
                      alignItems: 'center',
                      boxShadow: '0 10px 20px rgba(0,0,0,0.08)'
                    }}>
                      <div style={{
                        width: '34px',
                        height: '40px',
                        background: 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)',
                        borderRadius: '4px',
                        border: '2px solid #70092B',
                        boxShadow: 'inset 0 0 6px rgba(0,0,0,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px'
                      }}>
                        🛒
                      </div>

                      <div style={{
                        width: '30px',
                        height: '48px',
                        background: '#70092B',
                        borderRadius: '4px 4px 0 0',
                        border: '1.5px solid #54061F',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}>
                        <div style={{ width: '16px', height: '14px', background: '#FDE68A', borderRadius: '2px' }} />
                        <div style={{ width: '4px', height: '4px', background: '#F59E0B', borderRadius: '50%', alignSelf: 'flex-start', marginLeft: '4px' }} />
                      </div>
                    </div>

                  </div>

                  {/* 3. THE SEARCH CAPSULE BAR (fidelyclub.net) */}
                  <div style={{
                    position: 'absolute',
                    bottom: '-28px',
                    left: '20px',
                    zIndex: 25
                  }}>
                    <div className="hero-search-capsule" onClick={() => onNavigate('LOGIN')} style={{
                      cursor: 'pointer',
                      transform: `translateY(${-Math.min(scrollY * 0.06, 25)}px)`
                    }}>
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: 'rgba(112, 9, 43, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#70092B',
                        fontSize: '15px'
                      }}>
                        🌐
                      </div>

                      <span style={{
                        fontSize: 'clamp(0.92rem, 1.4vw, 1.15rem)',
                        fontWeight: 800,
                        color: '#70092B',
                        letterSpacing: '-0.02em'
                      }}>
                        fidelyclub.net
                      </span>

                      <span style={{ color: '#D6D3D1', fontWeight: 300, fontSize: '1.2rem' }}>|</span>
                      <span style={{ color: '#70092B', fontSize: '15px' }}>🔍</span>
                    </div>

                    {/* 3D Mouse Cursor Arrow */}
                    <div className="hero-pointer-cursor" style={{ top: '22px', right: '-18px' }}>
                      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
                          fill="#FFFFFF"
                          stroke="#70092B"
                          strokeWidth="2"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>

          {/* =========================================================================
              SLIDE 1: ESCANEO QR EN TIENDA & TARJETA EN SMARTPHONE 3D (Vista Cliente)
              ========================================================================= */}
          <div className={`hero-slide-pane ${activeHeroSlide === 1 ? 'hero-slide-active' : 'hero-slide-inactive'}`}>
            <div style={{
              maxWidth: '1240px',
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: '1.05fr 1.15fr',
              alignItems: 'center',
              gap: '40px',
              position: 'relative',
              zIndex: 1
            }} className="landing-hero-grid">

              {/* LEFT COLUMN: Copy focused on customer scanning QR & accumulating rewards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }} className="anim-fade-up">

                {/* Top Badge */}
                <div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#FFFFFF',
                    border: '1.5px solid #EADCDA',
                    padding: '6px 16px',
                    borderRadius: '9999px',
                    boxShadow: '0 2px 10px rgba(112, 9, 43, 0.05)'
                  }}>
                    <Scan size={14} color="#70092B" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1C1917', letterSpacing: '0.02em' }}>
                      Escaneo QR en 2 Segundos • <span style={{ color: '#70092B' }}>fidely &gt;club&lt;</span>
                    </span>
                  </div>
                </div>

                {/* Main Headline */}
                <h1 style={{
                  fontFamily: 'var(--font-main)',
                  fontSize: 'clamp(2.5rem, 5vw, 4.2rem)',
                  fontWeight: 800,
                  lineHeight: 1.08,
                  letterSpacing: '-0.035em',
                  color: '#1C1917',
                  margin: 0
                }}>
                  Acumula sellos <br />
                  en cada compra <br />
                  <span style={{ color: '#70092B' }}>con solo un escaneo</span>
                </h1>

                {/* Subtitle */}
                <p style={{
                  fontSize: 'clamp(1.05rem, 1.8vw, 1.22rem)',
                  color: '#57534E',
                  lineHeight: 1.5,
                  maxWidth: '520px',
                  margin: 0,
                  fontWeight: 500
                }}>
                  Presenta tu código QR en caja o escanea el QR del local con tu celular. Gana sellos automáticos hacia premios reales sin apps pesadas ni papeles que se pierden.
                </p>

                {/* Feature Pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#FFFFFF',
                    border: '1px solid #EADCDA',
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#292524'
                  }}>
                    <CheckCircle2 size={14} color="#70092B" />
                    <span>Validación en mostrador en 2 seg</span>
                  </div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#FFFFFF',
                    border: '1px solid #EADCDA',
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#292524'
                  }}>
                    <CheckCircle2 size={14} color="#70092B" />
                    <span>Tarjeta siempre en tu celular</span>
                  </div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#FFFFFF',
                    border: '1px solid #EADCDA',
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#292524'
                  }}>
                    <CheckCircle2 size={14} color="#70092B" />
                    <span>Avisos de proximidad (&lt; 500m)</span>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginTop: '10px' }} className="landing-hero-ctas">
                  <button
                    type="button"
                    onClick={() => onNavigate('LOGIN')}
                    className="btn-pill-wine"
                    title="Probar tarjetero digital"
                  >
                    <span>Probar Tarjetero Digital</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>→</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate('LOGIN')}
                    className="btn-pill-cream"
                    title="Crear mi Tarjeta en fidely CLUB"
                  >
                    <span>Crear mi Tarjeta</span>
                  </button>
                </div>

                {/* Social Proof */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                  <div style={{ display: 'flex', marginLeft: '6px' }}>
                    {['#70092B', '#881337', '#A21D4C', '#C2410C'].map((col, idx) => (
                      <div
                        key={idx}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: col,
                          border: '2px solid #FFFFFF',
                          marginLeft: idx === 0 ? '0' : '-8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF',
                          fontSize: '0.68rem',
                          fontWeight: 800
                        }}
                      >
                        ★
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#78716C', fontWeight: 600 }}>
                    <strong style={{ color: '#1C1917' }}>Validación en 2 segundos</strong> comprobada en mostradores de tiendas aliadas
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: Visual Scene (Photo of person scanning QR at store + Floating 3D Smartphone) */}
              <div style={{ position: 'relative', width: '100%', minHeight: '460px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

                <div style={{ width: '100%', maxWidth: '580px', position: 'relative' }}>

                  {/* Background Frame: Store Counter QR Scene */}
                  <div style={{
                    width: '100%',
                    height: '380px',
                    borderRadius: '28px',
                    overflow: 'hidden',
                    position: 'relative',
                    boxShadow: '0 25px 60px -15px rgba(112, 9, 43, 0.25), 0 0 0 1px rgba(234, 220, 218, 0.8)',
                    background: '#1C1917'
                  }}>
                    <img
                      src="/service_pos.jpg"
                      alt="Cliente escaneando código QR en mostrador de tienda"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'center 20%',
                        display: 'block',
                        filter: 'brightness(0.92)'
                      }}
                    />

                    {/* Dark Gradient Overlay for Contrast */}
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, rgba(28,25,23,0.1) 0%, rgba(28,25,23,0.68) 100%)'
                    }} />

                    {/* Top Location Pill Badge on Image */}
                    <div style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      background: 'rgba(255, 255, 255, 0.94)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid #EADCDA',
                      padding: '5px 12px',
                      borderRadius: '9999px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      color: '#70092B',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>
                      <Scan size={13} color="#70092B" />
                      <span>Escaneando en Caja</span>
                    </div>

                    {/* Bottom Store Title Overlay */}
                    <div style={{
                      position: 'absolute',
                      bottom: '18px',
                      left: '20px',
                      color: '#FFFFFF'
                    }}>
                      <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#DE8B76', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Comercio Aliado
                      </div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                        Mostrador con Sellos QR en Vivo
                      </div>
                    </div>
                  </div>

                  {/* OVERLAPPING 3D SMARTPHONE MOCKUP WITH FIDELITY CARD */}
                  <div className="hero-phone-floating" style={{
                    position: 'absolute',
                    top: '-20px',
                    left: '-15px',
                    width: '270px',
                    zIndex: 20,
                    transform: `rotate(-4deg) translateY(${Math.min(scrollY * 0.12, 40)}px)`,
                    transition: 'transform 0.4s ease',
                    filter: 'drop-shadow(0 25px 45px rgba(84, 6, 31, 0.45))'
                  }}>

                    {/* Phone Body Bezel (iPhone 16 Pro styling) */}
                    <div style={{
                      background: '#18181B',
                      borderRadius: '34px',
                      padding: '9px',
                      border: '3px solid #3F3F46',
                      boxShadow: '0 0 0 1px rgba(255,255,255,0.15), inset 0 0 8px rgba(0,0,0,0.8)'
                    }}>

                      {/* Phone Screen Display */}
                      <div style={{
                        background: '#FAF7F5',
                        borderRadius: '26px',
                        padding: '14px 12px 18px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        position: 'relative'
                      }}>

                        {/* Dynamic Island Pill Notch */}
                        <div style={{
                          width: '74px',
                          height: '18px',
                          borderRadius: '12px',
                          background: '#000000',
                          margin: '0 auto 4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          padding: '0 6px'
                        }}>
                          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981' }} />
                        </div>

                        {/* Mini Brand Bar in Phone */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#70092B' }}>
                            fidely <span style={{ fontSize: '0.62rem', color: '#A21D4C' }}>&gt;club&lt;</span>
                          </span>
                          <span style={{ fontSize: '0.66rem', color: '#16A34A', background: '#DCFCE7', padding: '1px 6px', borderRadius: '6px', fontWeight: 800 }}>
                            ● En Vivo
                          </span>
                        </div>

                        {/* Digital Loyalty Card inside Phone */}
                        <div style={{
                          background: 'linear-gradient(135deg, #70092B 0%, #54061F 100%)',
                          borderRadius: '16px',
                          padding: '12px',
                          color: '#FFFFFF',
                          boxShadow: '0 8px 20px rgba(112, 9, 43, 0.35)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800 }}>Café & Bakery</span>
                            <span style={{ fontSize: '0.66rem', background: 'rgba(255,255,255,0.2)', padding: '2px 7px', borderRadius: '8px', fontWeight: 800 }}>
                              5/6 Sellos
                            </span>
                          </div>

                          {/* 6 Stamps Grid */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '6px',
                            marginBottom: '8px'
                          }}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <div key={s} style={{
                                height: '32px',
                                borderRadius: '8px',
                                background: '#FDE68A',
                                border: '1.5px solid #F59E0B',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#70092B',
                                fontSize: '13px',
                                fontWeight: 900
                              }}>
                                ✓
                              </div>
                            ))}
                            {/* 6th Stamp ready for reward! */}
                            <div style={{
                              height: '32px',
                              borderRadius: '8px',
                              background: 'rgba(255,255,255,0.15)',
                              border: '2px dashed #FDE68A',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '14px'
                            }}>
                              🎁
                            </div>
                          </div>

                          <div style={{ fontSize: '0.62rem', opacity: 0.9, textAlign: 'center', fontWeight: 600 }}>
                            Próxima compra: ☕ Café Americano Gratis
                          </div>
                        </div>

                        {/* QR Code Scanner Box with Laser Beam */}
                        <div style={{
                          background: '#FFFFFF',
                          borderRadius: '14px',
                          padding: '10px',
                          border: '1.5px solid #EADCDA',
                          position: 'relative',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          {/* Laser beam */}
                          <div className="hero-scan-laser" />

                          <div style={{
                            width: '70px',
                            height: '70px',
                            background: '#F5EAE8',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '34px'
                          }}>
                            📱
                          </div>

                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#DCFCE7',
                            color: '#15803D',
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            fontSize: '0.68rem',
                            fontWeight: 800
                          }}>
                            <span>✓ Sello Validado</span>
                          </div>
                        </div>

                      </div>

                    </div>

                  </div>

                  {/* Floating Proximity Pill Alert (Bottom Right) */}
                  <div style={{
                    position: 'absolute',
                    bottom: '-22px',
                    right: '10px',
                    background: '#FFFFFF',
                    borderRadius: '9999px',
                    padding: '10px 18px',
                    boxShadow: '0 16px 40px -8px rgba(112, 9, 43, 0.25)',
                    border: '1.5px solid #EADCDA',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    zIndex: 25
                  }}>
                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: '#DCFCE7',
                      color: '#16A34A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 900
                    }}>
                      🎉
                    </div>
                    <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1C1917' }}>
                      ¡Te falta 1 sello para tu premio!
                    </span>
                  </div>

                </div>

              </div>

            </div>
          </div>

          {/* =========================================================================
              SLIDE 2: TIENDAS REALES AFILIADAS & MAPA RADAR MOTION GRAPHICS
              ========================================================================= */}
          <div className={`hero-slide-pane ${activeHeroSlide === 2 ? 'hero-slide-active' : 'hero-slide-inactive'}`}>
            <div style={{
              maxWidth: '1240px',
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: '1.05fr 1.15fr',
              alignItems: 'center',
              gap: '40px',
              position: 'relative',
              zIndex: 1
            }} className="landing-hero-grid">

              {/* LEFT COLUMN: Focus on real stores, map & trust */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }} className="anim-fade-up">

                {/* Top Badge */}
                <div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#FFFFFF',
                    border: '1.5px solid #EADCDA',
                    padding: '6px 16px',
                    borderRadius: '9999px',
                    boxShadow: '0 2px 10px rgba(112, 9, 43, 0.05)'
                  }}>
                    <MapPin size={14} color="#70092B" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1C1917', letterSpacing: '0.02em' }}>
                      Red Oficial de Comercios • <span style={{ color: '#70092B' }}>fidely &gt;club&lt;</span>
                    </span>
                  </div>
                </div>

                {/* Main Headline */}
                <h1 style={{
                  fontFamily: 'var(--font-main)',
                  fontSize: 'clamp(2.5rem, 5vw, 4.2rem)',
                  fontWeight: 800,
                  lineHeight: 1.08,
                  letterSpacing: '-0.035em',
                  color: '#1C1917',
                  margin: 0
                }}>
                  Tiendas que ya <br />
                  confían en <br />
                  <span style={{ color: '#70092B' }}>nosotros</span>
                </h1>

                {/* Subtitle */}
                <p style={{
                  fontSize: 'clamp(1.05rem, 1.8vw, 1.22rem)',
                  color: '#57534E',
                  lineHeight: 1.5,
                  maxWidth: '520px',
                  margin: 0,
                  fontWeight: 500
                }}>
                  Cafeterías, barberías, pizzerías y calzado ya premian a sus clientes en Caracas, Lara y Bolívar. Comercios reales geolocalizados con alertas automáticas de proximidad.
                </p>

                {/* Feature Pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#FFFFFF',
                    border: '1px solid #EADCDA',
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#292524'
                  }}>
                    <CheckCircle2 size={14} color="#70092B" />
                    <span>+11 Tiendas Aliadas Activas</span>
                  </div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#FFFFFF',
                    border: '1px solid #EADCDA',
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#292524'
                  }}>
                    <CheckCircle2 size={14} color="#70092B" />
                    <span>100% Tarjetas en Celular</span>
                  </div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#FFFFFF',
                    border: '1px solid #EADCDA',
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#292524'
                  }}>
                    <CheckCircle2 size={14} color="#70092B" />
                    <span>Radar de Proximidad (&lt; 500m)</span>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginTop: '10px' }} className="landing-hero-ctas">
                  <button
                    type="button"
                    onClick={() => onNavigate('LOGIN', 'REGISTER_STORE')}
                    className="btn-pill-wine"
                    title="Sumar mi tienda a la red de comercios"
                  >
                    <span>Sumar mi tienda</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>→</span>
                  </button>

                  <a
                    href="https://fidely-video-promo.web.app/tiendas.html"
                    target="_blank"
                    rel="noreferrer"
                    className="btn-pill-cream"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    title="Ver showcase y video de tiendas reales"
                  >
                    <span>Ver Showcase de Tiendas</span>
                    <ArrowUpRight size={15} />
                  </a>
                </div>

                {/* Social Proof */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                  <div style={{ display: 'flex', marginLeft: '6px' }}>
                    {['#5C3A21', '#1E293B', '#111827', '#15803D'].map((col, idx) => (
                      <div
                        key={idx}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: col,
                          border: '2px solid #FFFFFF',
                          marginLeft: idx === 0 ? '0' : '-8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF',
                          fontSize: '0.68rem',
                          fontWeight: 800
                        }}
                      >
                        ✓
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#78716C', fontWeight: 600 }}>
                    <strong style={{ color: '#1C1917' }}>Comercios en vivo</strong> acumulando visitas y fidelizando clientes
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: The Motion Graphics Stores & Radar Map Component */}
              <div style={{ position: 'relative', width: '100%', minHeight: '460px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HeroStoresMapMotion onNavigate={onNavigate} />
              </div>

            </div>
          </div>

        </div>

        {/* =========================================================================
            SLIDE SWITCHER CONTROLS (10s Animated Progress Indicator & Manual Tabs)
            ========================================================================= */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginTop: '36px',
          position: 'relative',
          zIndex: 30
        }}
          onMouseEnter={() => setIsSlidePaused(true)}
          onMouseLeave={() => setIsSlidePaused(false)}
        >
          {/* Button Slide 0 */}
          <button
            type="button"
            onClick={() => handleSelectHeroSlide(0)}
            className={`hero-slide-dot ${activeHeroSlide === 0 ? 'active' : ''}`}
            title="Ver Hero 1: Vista Comercio (Laptop 3D)"
          >
            <span>💻 1. Vista Tienda (Laptop 3D)</span>
            {activeHeroSlide === 0 && (
              <div style={{
                width: '32px',
                height: '4px',
                borderRadius: '9999px',
                background: 'rgba(255,255,255,0.3)',
                overflow: 'hidden',
                marginLeft: '4px'
              }}>
                <div key={activeHeroSlide} className="hero-progress-fill" />
              </div>
            )}
          </button>

          {/* Button Slide 1 */}
          <button
            type="button"
            onClick={() => handleSelectHeroSlide(1)}
            className={`hero-slide-dot ${activeHeroSlide === 1 ? 'active' : ''}`}
            title="Ver Hero 2: Escaneo QR en Tienda (Smartphone 3D)"
          >
            <span>📱 2. Escaneo QR en Mostrador</span>
            {activeHeroSlide === 1 && (
              <div style={{
                width: '32px',
                height: '4px',
                borderRadius: '9999px',
                background: 'rgba(255,255,255,0.3)',
                overflow: 'hidden',
                marginLeft: '4px'
              }}>
                <div key={activeHeroSlide} className="hero-progress-fill" />
              </div>
            )}
          </button>

          {/* Button Slide 2 */}
          <button
            type="button"
            onClick={() => handleSelectHeroSlide(2)}
            className={`hero-slide-dot ${activeHeroSlide === 2 ? 'active' : ''}`}
            title="Ver Hero 3: Tiendas que ya confían (Mapa Radar Motion Graphics)"
          >
            <span>🗺️ 3. Tiendas Aliadas & Mapa</span>
            {activeHeroSlide === 2 && (
              <div style={{
                width: '32px',
                height: '4px',
                borderRadius: '9999px',
                background: 'rgba(255,255,255,0.3)',
                overflow: 'hidden',
                marginLeft: '4px'
              }}>
                <div key={activeHeroSlide} className="hero-progress-fill" />
              </div>
            )}
          </button>
        </div>

      </section>

      {/* =========================================================================
          INTERACTIVE DIGITAL STAMP CARD SIMULATOR (Hands-on Live Experience)
          ========================================================================= */}
      <section id="tarjetas-sellos" className="scroll-reveal-section css-scroll-driven" style={{ maxWidth: '1200px', margin: '60px auto', padding: '0 20px', boxSizing: 'border-box' }}>

        <div style={{
          background: '#FFFFFF',
          border: '2px solid var(--border-subtle)',
          borderRadius: '32px',
          padding: 'clamp(24px, 4.5vw, 46px)',
          boxShadow: '0 18px 45px rgba(112, 9, 43, 0.08)',
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))',
            gap: 'clamp(28px, 4.5vw, 48px)',
            alignItems: 'center',
            width: '100%',
            boxSizing: 'border-box'
          }}>

            {/* Left Column: Interactive Controls */}
            <div className="scroll-reveal-card stagger-1" style={{ width: '100%', boxSizing: 'border-box' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--c-secondary-soft)',
                padding: '4px 12px',
                borderRadius: '9999px',
                marginBottom: '12px'
              }}>
                <Sparkles size={13} color="var(--c-primary)" />
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--c-primary)', textTransform: 'uppercase' }}>
                  Simulador en Vivo de Tarjeta de Sellos
                </span>
              </div>

              <h2 style={{
                fontSize: 'clamp(1.6rem, 3.8vw, 2.3rem)',
                fontWeight: 800,
                color: '#1C1917',
                letterSpacing: '-0.025em',
                lineHeight: 1.18,
                marginBottom: '12px'
              }}>
                Pruébalo tú mismo: Así de fácil es sellar y premiar
              </h2>

              <p style={{ fontSize: '0.94rem', color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: '24px' }}>
                Configura los sellos que requiere tu tienda y presiona el botón para simular cómo tu cajero sella la tarjeta del cliente en mostrador.
              </p>

              {/* Target selector chips */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '8px' }}>
                  Meta de sellos para ganar el premio:
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[4, 6, 8, 10].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setSimStampsTarget(num);
                        if (simCurrentStamps > num) setSimCurrentStamps(num);
                      }}
                      className={`preset-chip ${simStampsTarget === num ? 'active' : ''}`}
                      style={{ padding: '7px 16px', fontSize: '0.88rem' }}
                    >
                      {num} Sellos
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Preset Chips */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '8px' }}>
                  Color corporativo de la tarjeta:
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {[
                    { color: '#70092B', gradient: '#B85D43', name: 'Vinotinto & Terracota' },
                    { color: '#1E3A8A', gradient: '#60A5FA', name: 'Azul Zafiro' },
                    { color: '#065F46', gradient: '#34D399', name: 'Esmeralda' },
                    { color: '#78350F', gradient: '#FBBF24', name: 'Café & Oro' },
                    { color: '#1F2937', gradient: '#6B7280', name: 'Titanio' }
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSimCardColor(p.color);
                        setSimCardGradient(p.gradient);
                      }}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${p.color} 0%, ${p.gradient} 100%)`,
                        border: simCardColor === p.color ? '3px solid #FFFFFF' : '2px solid transparent',
                        boxShadow: simCardColor === p.color ? '0 0 0 2px var(--c-primary)' : '0 2px 6px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease'
                      }}
                      title={p.name}
                    />
                  ))}
                </div>
              </div>

              {/* Interactive Stamp & Reset Actions */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleAddStampSim}
                  disabled={simCurrentStamps >= simStampsTarget}
                  className="btn btn-primary"
                  style={{
                    padding: '12px 24px',
                    fontSize: '0.94rem',
                    fontWeight: 800,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 16px rgba(156, 56, 42, 0.25)',
                    opacity: simCurrentStamps >= simStampsTarget ? 0.6 : 1,
                    cursor: simCurrentStamps >= simStampsTarget ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Plus size={18} />
                  <span>Sellar Tarjeta (+1 Sello)</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetSim}
                  className="btn btn-secondary"
                  style={{
                    padding: '12px 18px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <RotateCcw size={15} />
                  <span>Reiniciar</span>
                </button>
              </div>

              <div style={{ marginTop: '16px', fontSize: '0.80rem', color: 'var(--text-muted)' }}>
                💡 En la vida real, este sellado lo autoriza el cajero al escanear el código QR único del cliente en segundos.
              </div>
            </div>

            {/* Right Column: Live Interactive Digital Stamp Card */}
            <div className="scroll-reveal-card stagger-2 simulator-card-3d-wrap" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <div className="simulator-card-inner" style={{
                width: '100%',
                maxWidth: '380px',
                borderRadius: '26px',
                background: `linear-gradient(135deg, ${simCardColor} 0%, ${simCardGradient} 100%)`,
                color: '#FFFFFF',
                padding: '24px 22px',
                boxShadow: '0 20px 45px -10px rgba(0,0,0,0.25)',
                position: 'relative',
                boxSizing: 'border-box',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }}>
                {/* Store Header in Card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.2)',
                      backdropFilter: 'blur(8px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: '#FFFFFF'
                    }}>
                      <Coffee size={22} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.02rem', lineHeight: 1.2 }}>
                        {simStoreName}
                      </div>
                      <div style={{ fontSize: '0.74rem', opacity: 0.85, fontWeight: 600 }}>
                        Tarjeta de Fidelización Oficial
                      </div>
                    </div>
                  </div>

                  <span style={{
                    background: 'rgba(255,255,255,0.25)',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em'
                  }}>
                    {simCurrentStamps}/{simStampsTarget}
                  </span>
                </div>

                {/* Reward Banner Inside Card */}
                <div style={{
                  background: 'rgba(0,0,0,0.22)',
                  borderRadius: '14px',
                  padding: '10px 14px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  border: '1px solid rgba(255,255,255,0.15)'
                }}>
                  <Gift size={20} color="#FDE047" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.70rem', opacity: 0.85, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                      Premio a Desbloquear:
                    </div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800 }}>
                      {simRewardTitle}
                    </div>
                  </div>
                </div>

                {/* Stamp Circles Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: simStampsTarget <= 6 ? 'repeat(3, 1fr)' : simStampsTarget === 8 ? 'repeat(4, 1fr)' : 'repeat(5, 1fr)',
                  gap: '12px',
                  marginBottom: '20px',
                  justifyItems: 'center'
                }}>
                  {Array.from({ length: simStampsTarget }).map((_, idx) => {
                    const isStamped = idx < simCurrentStamps;
                    return (
                      <div
                        key={idx}
                        style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '50%',
                          background: isStamped
                            ? '#FFFFFF'
                            : 'rgba(255, 255, 255, 0.15)',
                          border: isStamped
                            ? '2px solid #FFFFFF'
                            : '1.5px dashed rgba(255, 255, 255, 0.45)',
                          color: isStamped ? simCardColor : 'rgba(255,255,255,0.6)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: isStamped ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                          transform: isStamped ? 'scale(1.05)' : 'scale(1)',
                          transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }}
                      >
                        {isStamped ? (
                          <Star size={24} fill={simCardColor} color={simCardColor} />
                        ) : (
                          <span style={{ fontSize: '0.84rem', fontWeight: 800 }}>{idx + 1}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Progress Footer / Completion State */}
                {simCurrentStamps >= simStampsTarget ? (
                  <div style={{
                    background: '#16A34A',
                    borderRadius: '14px',
                    padding: '12px',
                    textAlign: 'center',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
                    animation: 'pulse 1.5s infinite'
                  }}>
                    🎉 ¡Meta completada! Muestra este cupón en caja para retirar tu premio.
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', fontSize: '0.80rem', opacity: 0.9, fontWeight: 700 }}>
                    {simStampsTarget - simCurrentStamps === 1
                      ? '⚡ ¡Solo te falta 1 sello para tu premio!'
                      : `Faltan ${simStampsTarget - simCurrentStamps} sellos para desbloquear tu recompensa`}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          DARK SERVICES SECTION: The Complete Digital Stamp Ecosystem
          ========================================================================= */}
      <section id="soluciones" className="scroll-reveal-section css-scroll-driven" style={{ maxWidth: '1200px', margin: '60px auto 40px', padding: '0 20px', boxSizing: 'border-box' }}>

        <div style={{
          background: 'linear-gradient(180deg, #161211 0%, #1F1918 100%)',
          borderRadius: '36px',
          padding: 'clamp(32px, 5vw, 54px) clamp(20px, 4vw, 44px)',
          color: '#FFFFFF',
          boxShadow: '0 25px 60px -15px rgba(22, 18, 17, 0.45)',
          border: '1.5px solid #2D2523',
          position: 'relative',
          overflow: 'hidden'
        }}>

          <div className="glow-drift-1" style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '320px',
            height: '320px',
            background: 'radial-gradient(circle, rgba(184, 93, 67, 0.22) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          <div className="glow-drift-2" style={{
            position: 'absolute',
            bottom: '-40px',
            left: '-40px',
            width: '320px',
            height: '320px',
            background: 'radial-gradient(circle, rgba(156, 56, 42, 0.22) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          {/* Header Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '20px',
            marginBottom: '36px',
            position: 'relative',
            zIndex: 1
          }}>
            <div>
              <h2 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(2rem, 4.5vw, 3rem)',
                fontWeight: 900,
                letterSpacing: '-0.025em',
                lineHeight: 1.1,
                margin: 0,
                color: '#FFFFFF'
              }}>
                El Ecosistema <span style={{ color: '#D48B77' }}>Fidely</span>
              </h2>
            </div>

            <p style={{
              fontSize: '0.94rem',
              color: '#A8A29E',
              lineHeight: 1.55,
              maxWidth: '520px',
              margin: 0
            }}>
              Una suite completa que conecta el mostrador de ventas, el teléfono de tus compradores y las alertas de proximidad en tiempo real.
            </p>
          </div>

          {/* 3 Featured Service Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
            gap: '24px',
            position: 'relative',
            zIndex: 1
          }}>

            {/* Card 1: Terminal POS Mostrador */}
            <div className="scroll-reveal-card stagger-1" style={{
              background: '#231D1B',
              borderRadius: '24px',
              padding: '24px',
              border: '1px solid #382F2C',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{
                  width: '100%',
                  height: '180px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  marginBottom: '18px'
                }}>
                  <img
                    src="/service_pos.jpg"
                    alt="Terminal POS Mostrador"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(184, 93, 67, 0.2)',
                  color: '#DE8B76',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  marginBottom: '10px'
                }}>
                  <Scan size={13} />
                  <span>Cajero & Mostrador</span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px', color: '#FFFFFF' }}>
                  Terminal POS de Validación
                </h3>
                <p style={{ fontSize: '0.86rem', color: '#A8A29E', lineHeight: 1.5 }}>
                  Escanea el código QR del cliente desde cualquier tablet, teléfono o computador. Acredita sellos y valida entregas de premios con un toque.
                </p>
              </div>

              <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #382F2C', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.76rem', color: '#A8A29E' }}>100% Web sin descargas</span>
                <button
                  type="button"
                  onClick={() => onNavigate('LOGIN')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#DE8B76',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>Probar POS</span>
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </div>

            {/* Card 2: Tarjetero Digital del Cliente */}
            <div className="scroll-reveal-card stagger-2" style={{
              background: '#231D1B',
              borderRadius: '24px',
              padding: '24px',
              border: '1px solid #382F2C',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{
                  width: '100%',
                  height: '180px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  marginBottom: '18px'
                }}>
                  <img
                    src="/service_pass.jpg"
                    alt="Tarjetero Digital del Cliente"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(184, 93, 67, 0.2)',
                  color: '#DE8B76',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  marginBottom: '10px'
                }}>
                  <Smartphone size={13} />
                  <span>Portal del Cliente</span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px', color: '#FFFFFF' }}>
                  Tarjetero Móvil Inteligente
                </h3>
                <p style={{ fontSize: '0.86rem', color: '#A8A29E', lineHeight: 1.5 }}>
                  Tus compradores consultan sus tarjetas de sellos, su código QR personal y el catálogo de comercios aliados disponibles en la ciudad.
                </p>
              </div>

              <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #382F2C', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.76rem', color: '#A8A29E' }}>App PWA & Flutter</span>
                <button
                  type="button"
                  onClick={() => onNavigate('LOGIN')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#DE8B76',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>Ver Portal</span>
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </div>

            {/* Card 3: Avisos Push por Proximidad */}
            <div className="scroll-reveal-card stagger-3" style={{
              background: '#231D1B',
              borderRadius: '24px',
              padding: '24px',
              border: '1px solid #382F2C',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{
                  width: '100%',
                  height: '180px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  marginBottom: '18px'
                }}>
                  <img
                    src="/service_rewards.jpg"
                    alt="Avisos Push por Proximidad"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(184, 93, 67, 0.2)',
                  color: '#DE8B76',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  marginBottom: '10px'
                }}>
                  <BellRing size={13} />
                  <span>Geolocalización & Push</span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px', color: '#FFFFFF' }}>
                  Avisos de Proximidad (&lt;500m)
                </h3>
                <p style={{ fontSize: '0.86rem', color: '#A8A29E', lineHeight: 1.5 }}>
                  Fidely detecta cuando un cliente pasa cerca de tu tienda y le envía una notificación push en vivo: <em>"¡Estás a 150m! Te falta 1 sello para tu premio"</em>.
                </p>
              </div>

              <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #382F2C', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.76rem', color: '#A8A29E' }}>Android + Web VAPID</span>
                <button
                  type="button"
                  onClick={() => onNavigate('LOGIN')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#DE8B76',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>Conocer Más</span>
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* =========================================================================
          4 PILARES DEL SISTEMA DE SELLOS FIDELY
          ========================================================================= */}
      <section id="pilares" className="scroll-reveal-section css-scroll-driven" style={{ maxWidth: '1200px', margin: '70px auto', padding: '0 20px', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 36px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--c-secondary-soft)',
            padding: '5px 14px',
            borderRadius: '9999px',
            marginBottom: '12px'
          }}>
            <Shield size={14} color="var(--c-primary)" />
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--c-primary)', textTransform: 'uppercase' }}>
              Ventajas Comerciales
            </span>
          </div>

          <h2 style={{
            fontSize: 'clamp(1.85rem, 4.5vw, 2.9rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: '#1C1917',
            marginBottom: '12px'
          }}>
            Diseñado para garantizar retorno real y visitas recurrentes
          </h2>

          <p style={{ fontSize: '0.98rem', color: 'var(--text-muted)' }}>
            Un programa transparente donde tus clientes ven recompensada su lealtad de forma inmediata y tangible.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
          gap: '20px'
        }}>
          {[
            {
              icon: Star,
              title: 'Sellos Aprobados en Caja',
              desc: 'Cero fraudes. Cada sello requiere sí o sí la autorización del dueño o cajero escaneando el código QR en mostrador.'
            },
            {
              icon: Gift,
              title: 'Premios Escalonados',
              desc: 'Define metas intermedias y premios finales atractivos que motivan a tus compradores a volver una y otra vez.'
            },
            {
              icon: MapPin,
              title: 'Atracción por Proximidad',
              desc: 'Notificaciones automáticas en el celular cuando el cliente transita cerca de tu local, convirtiendo transeúntes en ventas.'
            },
            {
              icon: Smartphone,
              title: 'Siempre en su Bolsillo',
              desc: 'Las tarjetas de cartón se olvidan o se dañan; la tarjeta digital de Fidely está siempre disponible en su teléfono.'
            }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className={`bento-card scroll-reveal-card stagger-${idx + 1}`}
                style={{
                  background: '#FFFFFF',
                  border: '1.5px solid var(--border-subtle)',
                  borderRadius: '20px',
                  padding: '24px 20px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'var(--c-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--c-primary)',
                  marginBottom: '16px'
                }}>
                  <Icon size={20} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1C1917', marginBottom: '8px' }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          FAQ ACCORDION
          ========================================================================= */}
      <section id="faq" className="scroll-reveal-section css-scroll-driven" style={{ maxWidth: '840px', margin: '70px auto', padding: '0 20px', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--c-secondary-soft)',
            padding: '5px 14px',
            borderRadius: '9999px',
            marginBottom: '12px'
          }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--c-primary)', textTransform: 'uppercase' }}>
              Preguntas Frecuentes
            </span>
          </div>

          <h2 style={{
            fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: '#1C1917',
            marginBottom: '10px'
          }}>
            Todo lo que necesitas saber
          </h2>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.94rem' }}>
            Respuestas claras sobre cómo funcionan las tarjetas de sellos digitales para tu comercio aliado.
          </p>
        </div>

        {/* Accordion list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {faqItems.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className={`scroll-reveal-card stagger-${(index % 3) + 1}`}
                style={{
                  background: '#FFFFFF',
                  border: isOpen ? '1.5px solid var(--c-primary)' : '1px solid var(--border-subtle)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                  boxShadow: isOpen ? '0 4px 16px rgba(112, 9, 43, 0.08)' : 'none'
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? -1 : index)}
                  style={{
                    width: '100%',
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-heading)',
                    fontSize: '0.98rem',
                    fontWeight: 700,
                    color: isOpen ? 'var(--c-primary)' : '#1C1917'
                  }}
                >
                  <span style={{ paddingRight: '12px' }}>{faq.q}</span>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: isOpen ? 'var(--c-primary)' : '#FAF8F5',
                    border: isOpen ? 'none' : '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isOpen ? '#FFFFFF' : '#1C1917',
                    flexShrink: 0
                  }}>
                    {isOpen ? <Minus size={14} /> : <Plus size={14} />}
                  </div>
                </button>

                {isOpen && (
                  <div style={{
                    padding: '0 20px 20px',
                    fontSize: '0.88rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.6,
                    borderTop: '1px solid #FAF4EE',
                    paddingTop: '14px'
                  }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          FINAL HIGH-IMPACT CTA BANNER
          ========================================================================= */}
      <section className="scroll-reveal-section css-scroll-scale" style={{ maxWidth: '1200px', margin: '70px auto 40px', padding: '0 20px', boxSizing: 'border-box' }}>
        <div style={{
          position: 'relative',
          borderRadius: '32px',
          overflow: 'hidden',
          minHeight: '340px',
          background: 'linear-gradient(135deg, #1C1917 0%, #292524 100%)',
          boxShadow: '0 25px 60px -10px rgba(28, 25, 23, 0.4)',
          border: '1.5px solid #332B28',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '48px 24px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at center, rgba(156, 56, 42, 0.3) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          <div style={{ position: 'relative', zIndex: 1, maxWidth: '680px' }}>
            <span style={{
              display: 'inline-block',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#F5EBE1',
              padding: '6px 16px',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '18px'
            }}>
              Únete a la Red de Comercios Aliados
            </span>

            <h2 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2.2rem, 5.5vw, 3.6rem)',
              fontWeight: 900,
              letterSpacing: '-0.025em',
              lineHeight: 1.1,
              color: '#FFFFFF',
              marginBottom: '16px'
            }}>
              Empieza a sellar y fidelizar hoy mismo
            </h2>

            <p style={{ fontSize: '1.02rem', color: '#D6D3D1', lineHeight: 1.55, marginBottom: '32px' }}>
              Multiplica las visitas de tus compradores, elimina los cartones y dale a tu negocio una presencia digital de primer nivel.
            </p>

            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => onNavigate('LOGIN')}
                className="btn-pill-primary"
                style={{ fontSize: '1.02rem', padding: '14px 28px' }}
              >
                <span>Acceder a Mi Tarjetero</span>
                <span className="btn-pill-arrow">↗</span>
              </button>

              <button
                onClick={() => onNavigate('LOGIN')}
                className="btn-pill-secondary"
                style={{ fontSize: '0.98rem', padding: '14px 24px', background: 'transparent', color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.25)' }}
              >
                <Store size={17} />
                <span>Acceso POS Comercio</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          DARK MODERN FINTECH FOOTER
          ========================================================================= */}
      <footer style={{
        background: '#141110',
        color: '#A8A29E',
        padding: '50px 20px 32px',
        borderTop: '1px solid #292524',
        boxSizing: 'border-box'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '30px',
            paddingBottom: '36px',
            borderBottom: '1px solid #292524'
          }}>
            {/* Brand column */}
            <div style={{ maxWidth: '340px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <img src="/fidely.png" alt="fidely" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                  fidely <span style={{ color: 'var(--c-primary)', fontSize: '0.75rem', letterSpacing: '0.08em' }}>CLUB</span>
                </span>
              </div>
              <p style={{ fontSize: '0.84rem', lineHeight: 1.5, color: '#78716C', margin: 0 }}>
                La plataforma moderna de tarjetas de fidelización con sellos digitales y recompensas para comercios aliados.
              </p>
            </div>

            {/* Quick Links */}
            <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#FFFFFF', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Navegación
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.84rem' }}>
                  <a href="#soluciones" style={{ color: '#A8A29E', textDecoration: 'none' }}>Soluciones</a>
                  <a href="#tarjetas-sellos" style={{ color: '#A8A29E', textDecoration: 'none' }}>Simulador de Sellos</a>
                  <a href="#pilares" style={{ color: '#A8A29E', textDecoration: 'none' }}>Ventajas</a>
                  <a href="#faq" style={{ color: '#A8A29E', textDecoration: 'none' }}>Preguntas Frecuentes</a>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#FFFFFF', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Seguridad & Calidad
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.84rem' }}>
                  <span>Validación QR en Mostrador</span>
                  <span>Push Proximidad Geofence</span>
                  <span>Sellos Aprobados por Comercio</span>
                  <span>Cero Papel • 100% Digital</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Copyright & Status */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            paddingTop: '24px',
            fontSize: '0.78rem',
            color: '#78716C'
          }}>
            <div>
              © {new Date().getFullYear()} fidely CLUB. Plataforma oficial de tarjetas de sellos digitales.
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />
              <span>Sistemas operativos en línea • Notificaciones Push activas</span>
            </div>
          </div>

        </div>
      </footer>

      {/* Responsive Styles */}
      <style>{`
        @media (max-width: 820px) {
          .landing-hero-centerpiece {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
          .hero-side-quote {
            order: 2;
            align-items: center !important;
            text-align: center !important;
          }
          .hero-side-quote p {
            max-width: 100% !important;
          }
          .hero-side-metric {
            order: 3;
            align-items: center !important;
            text-align: center !important;
          }
        }
      `}</style>
    </div>
  );
}
