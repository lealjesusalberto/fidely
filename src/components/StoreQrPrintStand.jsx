import React, { useRef } from 'react';
import { 
  Printer, 
  X, 
  Copy, 
  ExternalLink, 
  Sparkles, 
  Smartphone, 
  CheckCircle2, 
  Store as StoreIcon,
  MapPin,
  Tag
} from 'lucide-react';
import QRCodeDisplay from './QRCodeDisplay';
import StoreLogoBadge from './StoreLogoBadge';

export default function StoreQrPrintStand({
  store,
  config,
  onClose = null,
  isModal = false
}) {
  const standRef = useRef(null);

  if (!store) return null;

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://fidelyclub.net';
  const qrUrl = `${originUrl}/?store=${store.id}&action=redeem`;

  const handlePrint = () => {
    if (!standRef.current) {
      window.print();
      return;
    }
    const printWindow = window.open('', '_blank', 'width=850,height=950');
    if (!printWindow) {
      window.print();
      return;
    }
    const htmlContent = standRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <base href="${originUrl}/">
          <title>Cartel QR de Mostrador - ${store.name}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
              margin: 0;
              padding: 24px;
              background: #FAF8F5;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print {
              display: block;
            }
            .fidely-print-stand {
              width: 100%;
              max-width: 440px;
              margin: 0 auto;
              background: #FFFFFF;
              border-radius: 26px;
              border: 3px solid #70092B;
              box-shadow: 0 16px 44px rgba(112, 9, 43, 0.12);
              overflow: hidden;
              text-align: center;
              padding-bottom: 24px;
              position: relative;
            }
            @media print {
              @page {
                size: auto;
                margin: 8mm;
              }
              body {
                background: #FFFFFF !important;
                padding: 0 !important;
                display: block !important;
              }
              .no-print {
                display: none !important;
              }
              .fidely-print-stand {
                max-width: 440px !important;
                margin: 0 auto !important;
                box-shadow: none !important;
                border: 3px solid #70092B !important;
                page-break-inside: avoid !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; text-align: center;">
            <button onclick="window.print()" style="background: linear-gradient(135deg, #70092B 0%, #9C382A 100%); color: #FFFFFF; border: none; padding: 12px 28px; border-radius: 99px; font-weight: 800; font-size: 15px; cursor: pointer; box-shadow: 0 4px 14px rgba(112, 9, 43, 0.35);">
              🖨️ Imprimir Cartel / Guardar en PDF
            </button>
            <div style="font-size: 12px; color: #64748B; margin-top: 6px;">
              Tip: En destino de impresora, selecciona "Guardar como PDF" o tu impresora a color.
            </div>
          </div>
          <div class="fidely-print-stand">
            ${htmlContent}
          </div>
          <script>
            function triggerPrint() {
              window.focus();
              window.print();
            }
            if (document.readyState === 'complete') {
              setTimeout(triggerPrint, 500);
            } else {
              window.addEventListener('load', function() {
                setTimeout(triggerPrint, 500);
              });
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(qrUrl);
    alert('¡Enlace de mostrador copiado al portapapeles!');
  };

  const content = (
    <div className="store-qr-stand-wrapper" style={{ width: '100%', maxWidth: '520px', margin: '0 auto' }}>
      {/* Botones de control en pantalla (Ocultos al Imprimir) */}
      <div className="no-print" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        padding: '10px 16px',
        background: '#FAF8F5',
        borderRadius: '14px',
        border: '1px solid var(--border-subtle)',
        gap: '10px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Printer size={16} color="var(--c-primary)" />
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Hablador / Cartel QR para Mostrador
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleCopy}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            title="Copiar enlace directo"
          >
            <Copy size={13} />
            <span>Copiar Enlace</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-primary"
            style={{
              padding: '7px 16px',
              fontSize: '0.78rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #70092B 0%, #9C382A 100%)',
              boxShadow: '0 2px 8px rgba(112, 9, 43, 0.28)'
            }}
          >
            <Printer size={15} />
            <span>Imprimir Cartel (PDF)</span>
          </button>

          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              style={{ padding: '6px 10px', fontSize: '0.74rem' }}
              title="Cerrar vista previa"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* DOCUMENTO / CARTEL DE MOSTRADOR PARA IMPRIMIR */}
      <div
        ref={standRef}
        className="fidely-print-stand"
        style={{
          background: '#FFFFFF',
          borderRadius: '26px',
          border: '3px solid #70092B',
          boxShadow: '0 16px 44px rgba(112, 9, 43, 0.12)',
          overflow: 'hidden',
          textAlign: 'center',
          position: 'relative',
          paddingBottom: '24px'
        }}
      >
        {/* 1. CABECERA BRANDING FIDELY CON MASCOTA */}
        <div style={{
          background: 'linear-gradient(135deg, #70092B 0%, #8E153D 50%, #9C382A 100%)',
          color: '#FFFFFF',
          padding: '20px 22px 18px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          textAlign: 'left'
        }}>
          <div style={{ flex: 1 }}>
            {/* Badge Alianza Oficial */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.70rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '8px'
            }}>
              <Sparkles size={12} color="#FDE047" />
              <span>Red Oficial fidely CLUB</span>
            </div>

            <h1 style={{
              margin: '0 0 4px',
              fontSize: '1.38rem',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              lineHeight: 1.2
            }}>
              ¡GANA PREMIOS AQUÍ!
            </h1>
            <p style={{
              margin: 0,
              fontSize: '0.80rem',
              opacity: 0.95,
              fontWeight: 600,
              letterSpacing: '0.01em',
              lineHeight: 1.3
            }}>
              Escanea en caja y acumula tus sellos digitales en cada visita
            </p>
          </div>

          {/* MASCOTA FIDELY SUPERHÉROE EN CABECERA (Totalmente separada del QR para escaneo perfecto) */}
          <div style={{
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '-6px'
          }}>
            <div style={{
              background: '#FFFFFF',
              color: '#70092B',
              fontSize: '0.62rem',
              fontWeight: 900,
              padding: '3px 8px',
              borderRadius: '8px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              marginBottom: '-6px',
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
              zIndex: 2
            }}>
              ¡Pide tu sello! 📲
            </div>
            <img
              src="/fidely_mascot.png"
              alt="Mascota Fidely"
              style={{
                width: '82px',
                height: 'auto',
                filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.30))'
              }}
            />
          </div>
        </div>

        {/* 2. IDENTIDAD DE LA TIENDA LOCAL */}
        <div style={{
          padding: '16px 20px 10px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          {/* Logo del Comercio */}
          <div style={{
            marginTop: '-36px',
            background: '#FFFFFF',
            padding: '5px',
            borderRadius: '18px',
            boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
            display: 'inline-block'
          }}>
            <StoreLogoBadge store={store} size={58} borderRadius="14px" />
          </div>

          {/* Nombre de la tienda */}
          <div style={{
            fontSize: '1.25rem',
            fontWeight: 900,
            color: '#1C1917',
            marginTop: '8px',
            letterSpacing: '-0.01em'
          }}>
            {store.name}
          </div>

          {/* Categoría y Ubicación */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '4px',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: '#FAF4F3',
              color: '#70092B',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 800,
              border: '1px solid #EADCDA'
            }}>
              <Tag size={11} color="#70092B" />
              <span>{store.category || 'Comercio Aliado'}</span>
            </span>

            {store.city && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#78716C'
              }}>
                <MapPin size={11} color="#70092B" />
                <span>{store.city}</span>
              </span>
            )}
          </div>
        </div>

        {/* 3. HERO QR SECTION (100% LIMPIO, SIN ELEMENTOS QUE INTERFIERAN) */}
        <div style={{
          position: 'relative',
          padding: '12px 24px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          {/* Marco blanco del Código QR con quiet-zone despejada */}
          <div style={{
            background: '#FFFFFF',
            padding: '16px',
            borderRadius: '22px',
            border: '2.5px solid #70092B',
            boxShadow: '0 8px 26px rgba(112, 9, 43, 0.14)',
            display: 'inline-block',
            position: 'relative'
          }}>
            <QRCodeDisplay
              value={qrUrl}
              size={210}
              darkColor="#70092B"
              lightColor="#FFFFFF"
            />

            <div style={{
              marginTop: '8px',
              fontSize: '0.74rem',
              fontWeight: 900,
              color: '#70092B',
              letterSpacing: '0.08em'
            }}>
              ESCANEAME EN CAJA
            </div>
            <div style={{
              fontSize: '0.64rem',
              fontWeight: 800,
              color: '#A8A29E',
              fontFamily: 'monospace'
            }}>
              ID: {store.id}
            </div>
          </div>
        </div>

        {/* 4. PASOS SIMPLES DE USO PARA EL CLIENTE */}
        <div style={{
          padding: '0 24px',
          marginTop: '4px'
        }}>
          <div style={{
            background: '#FAF8F5',
            borderRadius: '16px',
            border: '1.5px dashed #EADCDA',
            padding: '12px 14px'
          }}>
            <div style={{
              fontSize: '0.74rem',
              fontWeight: 900,
              color: '#70092B',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '8px'
            }}>
              ¿Cómo funciona? (Solo 3 pasos)
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '6px',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '1.1rem', marginBottom: '2px' }}>📷</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#1C1917' }}>1. Abre tu cámara</span>
                <span style={{ fontSize: '0.60rem', color: '#78716C' }}>O app de WhatsApp</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '1.1rem', marginBottom: '2px' }}>⚡</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#1C1917' }}>2. Escanea el QR</span>
                <span style={{ fontSize: '0.60rem', color: '#78716C' }}>Carga al instante</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '1.1rem', marginBottom: '2px' }}>🎁</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#1C1917' }}>3. Acumula & Gana</span>
                <span style={{ fontSize: '0.60rem', color: '#78716C' }}>Premios en este local</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. PIE DE PÁGINA OFICIAL */}
        <div style={{
          marginTop: '16px',
          padding: '0 20px',
          fontSize: '0.68rem',
          color: '#A8A29E',
          fontWeight: 600
        }}>
          <div>fidely CLUB • Red de Fidelización & Descuentos por Local</div>
          <div style={{ fontWeight: 800, color: '#70092B', marginTop: '2px' }}>
            fidelyclub.net
          </div>
          <div style={{ fontSize: '0.60rem', marginTop: '3px', color: '#A8A29E' }}>
            * No requiere descargar aplicaciones pesadas. Funciona directo en el navegador web del cliente.
          </div>
        </div>
      </div>

      {/* ESTILOS DE IMPRESIÓN PROFESIONAL */}
      <style>{`
        @media print {
          /* Ocultar todos los elementos de la interfaz */
          body * {
            visibility: hidden !important;
          }
          /* Mostrar únicamente el cartel de mostrador */
          .fidely-print-stand,
          .fidely-print-stand * {
            visibility: visible !important;
          }
          .fidely-print-stand {
            position: absolute !important;
            left: 50% !important;
            top: 20px !important;
            transform: translateX(-50%) !important;
            width: 100% !important;
            max-width: 440px !important;
            box-shadow: none !important;
            border: 3px solid #70092B !important;
            margin: 0 auto !important;
            page-break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .modal-overlay {
            background: transparent !important;
            position: static !important;
          }
        }
      `}</style>
    </div>
  );

  if (isModal) {
    return (
      <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
        <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px', padding: '16px' }}>
          {content}
        </div>
      </div>
    );
  }

  return content;
}

