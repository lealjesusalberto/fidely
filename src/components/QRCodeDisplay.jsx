import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

/**
 * Resuelve variables CSS (ej: 'var(--c-primary)') a valores de color hexadecimales o RGB
 * válidos para la librería canvas 'qrcode'.
 */
function resolveHexColor(colorStr, fallback = '#1C1917') {
  if (!colorStr || typeof colorStr !== 'string') return fallback;
  const trimmed = colorStr.trim();
  if (trimmed.startsWith('#') || trimmed.startsWith('rgb')) return trimmed;
  if (trimmed.startsWith('var(')) {
    if (typeof window !== 'undefined' && document?.documentElement) {
      const varName = trimmed.replace(/^var\(\s*|\s*\)$/g, '');
      const computed = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      if (computed && (computed.startsWith('#') || computed.startsWith('rgb'))) {
        return computed;
      }
    }
    // Temas y paleta oficial de fidely
    if (trimmed.includes('primary')) return '#9C382A';
    if (trimmed.includes('secondary')) return '#D4AF37';
    if (trimmed.includes('text')) return '#1C1917';
    if (trimmed.includes('bg')) return '#FAF8F5';
  }
  return fallback;
}

/**
 * QRCodeDisplay
 * Generador de Códigos QR legítimos bajo estándar internacional ISO/IEC 18004.
 * Genera códigos QR reales y 100% legibles por cualquier escáner o cámara de teléfono.
 * Incluye resolución automática de variables CSS y respaldo a blanco/negro de alta tolerancia.
 */
export default function QRCodeDisplay({
  value = "FIDELY-PASS",
  size = 160,
  darkColor = "#09090b",
  lightColor = "#FFFFFF",
  showLabel = true,
  className = ""
}) {
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    let isCancelled = false;

    const generateQR = async () => {
      try {
        const cleanVal = String(value || 'FIDELY-CODE').trim();
        const safeDark = resolveHexColor(darkColor, '#09090b');
        const safeLight = resolveHexColor(lightColor, '#FFFFFF');

        let url;
        try {
          url = await QRCode.toDataURL(cleanVal, {
            width: size * 2, // 2x para resolución ultra nítida en pantallas Retina y AMOLED
            margin: 1,
            errorCorrectionLevel: 'M',
            color: {
              dark: safeDark,
              light: safeLight
            }
          });
        } catch (innerErr) {
          // Respaldo infalible con colores estándar de alto contraste
          url = await QRCode.toDataURL(cleanVal, {
            width: size * 2,
            margin: 1,
            errorCorrectionLevel: 'M',
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
        }

        if (!isCancelled) {
          setDataUrl(url);
          setError(null);
        }
      } catch (err) {
        console.error('[QRCodeDisplay] Error generando código QR:', err);
        if (!isCancelled) setError(err);
      }
    };

    generateQR();

    return () => {
      isCancelled = true;
    };
  }, [value, size, darkColor, lightColor]);

  if (error) {
    return (
      <div style={{ padding: '10px', color: '#EF4444', fontSize: '0.75rem', textAlign: 'center' }}>
        Error al generar QR
      </div>
    );
  }

  return (
    <div 
      className={className}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: resolveHexColor(lightColor, '#FFFFFF'),
        padding: '12px',
        borderRadius: '16px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        border: '1px solid rgba(0,0,0,0.06)'
      }}
    >
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={`Código QR: ${value}`}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            display: 'block',
            borderRadius: '6px'
          }}
        />
      ) : (
        <div 
          style={{
            width: `${size}px`,
            height: `${size}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.02)',
            borderRadius: '6px'
          }}
        >
          <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Generando QR...</span>
        </div>
      )}

      {showLabel && (
        <span 
          style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.05em',
            marginTop: '8px',
            color: resolveHexColor(darkColor, '#1C1917'),
            fontFamily: 'monospace',
            maxWidth: `${size + 20}px`,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {value}
        </span>
      )}
    </div>
  );
}
