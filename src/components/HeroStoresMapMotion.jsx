import React, { useEffect, useRef, useState } from 'react';
import { LOGO_ASSETS, BRANDS } from '../data/storeAssets';

export default function HeroStoresMapMotion({ onNavigate }) {
  const canvasRef = useRef(null);
  const [motionMode, setMotionMode] = useState('MAP'); // 'MAP' | 'ORBIT'
  const [selectedBrandIndex, setSelectedBrandIndex] = useState(0);

  // Easing Functions
  const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
  const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t), 3);
  const easeInOutCubic = (t) => {
    t = clamp(t);
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };
  const easeOutBack = (t, s = 1.35) => {
    t = clamp(t);
    const c1 = s;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Preload logo images
    const loadedImages = {};
    Object.entries(LOGO_ASSETS).forEach(([key, src]) => {
      const img = new Image();
      img.src = src;
      loadedImages[key] = img;
    });

    let width = (canvas.width = canvas.parentElement?.clientWidth || 360);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 460);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    const startTime = performance.now();

    function drawBrandAvatar(targetCtx, b, cx, cy, size, radius = 9) {
      targetCtx.save();
      targetCtx.beginPath();
      targetCtx.roundRect(cx - size / 2, cy - size / 2, size, size, radius);
      targetCtx.clip();

      const img = b.logoKey ? loadedImages[b.logoKey] : null;
      if (img && img.complete && img.naturalWidth > 0) {
        targetCtx.fillStyle = '#FFFFFF';
        targetCtx.fillRect(cx - size / 2, cy - size / 2, size, size);
        targetCtx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
      } else {
        const grad = targetCtx.createLinearGradient(
          cx - size / 2,
          cy - size / 2,
          cx + size / 2,
          cy + size / 2
        );
        grad.addColorStop(0, b.color || '#70092B');
        grad.addColorStop(1, '#0f1117');
        targetCtx.fillStyle = grad;
        targetCtx.fillRect(cx - size / 2, cy - size / 2, size, size);

        targetCtx.fillStyle = '#FFFFFF';
        targetCtx.font = `800 ${Math.round(size * 0.42)}px 'Plus Jakarta Sans', sans-serif`;
        targetCtx.textAlign = 'center';
        targetCtx.textBaseline = 'middle';
        targetCtx.fillText(b.monogram, cx, cy + 1);
      }
      targetCtx.restore();

      targetCtx.strokeStyle = 'rgba(0,0,0,0.08)';
      targetCtx.lineWidth = 1;
      targetCtx.beginPath();
      targetCtx.roundRect(cx - size / 2, cy - size / 2, size, size, radius);
      targetCtx.stroke();
    }

    function render(now) {
      const time = (now - startTime) / 1000;
      ctx.clearRect(0, 0, width, height);

      // Subtle Background Glow
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        30,
        width / 2,
        height / 2,
        220
      );
      bgGrad.addColorStop(0, 'rgba(112, 9, 43, 0.05)');
      bgGrad.addColorStop(1, 'rgba(250, 247, 245, 0)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      if (motionMode === 'MAP') {
        renderMapMode(time);
      } else {
        renderOrbitMode(time);
      }

      animationFrameId = requestAnimationFrame(render);
    }

    function renderMapMode(t) {
      ctx.save();
      ctx.translate(width / 2, height / 2 - 10);

      const mapW = Math.min(width - 24, 330);
      const mapH = 340;

      // Base Canvas Card with Shadow
      ctx.fillStyle = '#F3ECEC';
      ctx.shadowColor = 'rgba(112, 9, 43, 0.16)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 8;
      ctx.beginPath();
      ctx.roundRect(-mapW / 2, -mapH / 2, mapW, mapH, 24);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-mapW / 2, -mapH / 2, mapW, mapH, 24);
      ctx.clip();

      // Streets Network
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 8;
      [-110, -40, 30, 100].forEach((y) => {
        ctx.beginPath();
        ctx.moveTo(-mapW / 2, y);
        ctx.bezierCurveTo(-50, y - 10, 50, y + 10, mapW / 2, y - 4);
        ctx.stroke();
      });
      [-90, -15, 70].forEach((x) => {
        ctx.beginPath();
        ctx.moveTo(x, -mapH / 2);
        ctx.bezierCurveTo(x + 10, -40, x - 10, 40, x + 6, mapH / 2);
        ctx.stroke();
      });

      // Park Areas
      ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
      ctx.beginPath();
      ctx.roundRect(-135, -145, 75, 50, 14);
      ctx.fill();

      ctx.beginPath();
      ctx.roundRect(50, 45, 60, 45, 12);
      ctx.fill();

      // Highlighted Store Index
      const activeIdx = Math.floor(t / 1.8) % BRANDS.length;
      if (activeIdx !== selectedBrandIndex) {
        setSelectedBrandIndex(activeIdx);
      }

      // Store Pins Dropping In
      BRANDS.forEach((b, i) => {
        const pinDelay = 0.2 + (i % 6) * 0.15;
        const pt = clamp((t - pinDelay) * 2.2);
        const appear = easeOutBack(pt, 1.45);
        const isSelected = i === activeIdx;

        ctx.save();
        ctx.translate(b.mx * 0.95, b.my * 0.88);
        ctx.scale(appear, appear);

        // Selected Pulse Halo
        if (isSelected) {
          const pulseR = 16 + ((t * 36) % 36);
          const pulseAlpha = Math.max(0, 0.45 * (1 - ((t * 36) % 36) / 36));
          ctx.fillStyle = `rgba(112, 9, 43, ${pulseAlpha * 0.35})`;
          ctx.strokeStyle = `rgba(112, 9, 43, ${pulseAlpha})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        const pinSize = isSelected ? 32 : 24;

        // Pin shadow
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath();
        ctx.ellipse(0, pinSize / 2 + 2, pinSize * 0.45, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pin tile
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0,0,0,0.22)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(-pinSize / 2 - 2, -pinSize / 2 - 2, pinSize + 4, pinSize + 4, 9);
        ctx.fill();
        ctx.shadowColor = 'transparent';

        drawBrandAvatar(ctx, b, 0, 0, pinSize, 7);

        if (isSelected) {
          ctx.strokeStyle = '#70092B';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(-pinSize / 2 - 2, -pinSize / 2 - 2, pinSize + 4, pinSize + 4, 9);
          ctx.stroke();
        }

        ctx.restore();
      });

      // User Position & Proximity Radar Waves
      const userX = Math.cos(t * 0.65) * 60;
      const userY = Math.sin(t * 0.82) * 45;

      [0, 0.5].forEach((off) => {
        const waveProg = (t * 1.3 + off) % 1;
        const waveR = 8 + waveProg * 40;
        ctx.strokeStyle = `rgba(59, 130, 246, ${0.4 * (1 - waveProg)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(userX, userY, waveR, 0, Math.PI * 2);
        ctx.stroke();
      });

      ctx.fillStyle = '#3B82F6';
      ctx.shadowColor = '#3B82F6';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(userX, userY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Bottom Store Floating Card with Elastic Pop
      const selBrand = BRANDS[activeIdx];
      const cardPop = easeOutBack(clamp((t % 1.8) / 0.35), 1.25);

      ctx.save();
      ctx.translate(0, mapH / 2 - 38);
      ctx.scale(cardPop, cardPop);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 4;
      ctx.beginPath();
      ctx.roundRect(-mapW / 2 + 10, -22, mapW - 20, 46, 14);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      drawBrandAvatar(ctx, selBrand, -mapW / 2 + 34, 1, 32, 8);

      ctx.fillStyle = '#1C1917';
      ctx.font = `800 12px 'Plus Jakarta Sans', sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(selBrand.short, -mapW / 2 + 58, -2);

      ctx.fillStyle = '#70092B';
      ctx.font = `700 9.5px 'Plus Jakarta Sans', sans-serif`;
      ctx.fillText(
        `📍 ${selBrand.zone} • ${selBrand.stamps} (${selBrand.premios})`,
        -mapW / 2 + 58,
        12
      );

      // Mini green badge
      ctx.fillStyle = '#ECFDF5';
      ctx.beginPath();
      ctx.roundRect(mapW / 2 - 76, -10, 58, 20, 10);
      ctx.fill();

      ctx.fillStyle = '#047857';
      ctx.font = `800 8.5px 'Plus Jakarta Sans', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('EN VIVO', mapW / 2 - 47, 3);

      ctx.restore();

      ctx.restore();
      ctx.restore();
    }

    function renderOrbitMode(t) {
      ctx.save();
      ctx.translate(width / 2, height / 2 - 10);

      // Dual Orbit Tracks
      [74, 122].forEach((r, idx) => {
        ctx.strokeStyle = `rgba(112, 9, 43, ${0.16 - idx * 0.05})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = -t * (idx === 0 ? 18 : -14);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Central Hub
      const hubScale = 1 + 0.025 * Math.sin(t * 3.2);
      ctx.save();
      ctx.scale(hubScale, hubScale);
      ctx.fillStyle = '#70092B';
      ctx.shadowColor = 'rgba(112, 9, 43, 0.45)';
      ctx.shadowBlur = 26;
      ctx.beginPath();
      ctx.roundRect(-34, -34, 68, 68, 20);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-34, -34, 68, 68, 20);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `900 32px 'Plus Jakarta Sans', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('F', 0, 11);
      ctx.restore();

      // Orbiting Brands
      const featured = BRANDS.slice(0, 8);
      featured.forEach((b, i) => {
        const orbitR = 112;
        const angle = (i / featured.length) * Math.PI * 2 + t * 0.35;
        const bx = Math.cos(angle) * orbitR;
        const by = Math.sin(angle) * orbitR;

        ctx.save();
        ctx.translate(bx, by);

        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0,0,0,0.16)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 3;
        ctx.beginPath();
        ctx.roundRect(-23, -23, 46, 46, 14);
        ctx.fill();
        ctx.shadowColor = 'transparent';

        drawBrandAvatar(ctx, b, 0, 0, 40, 12);
        ctx.restore();
      });

      // Bottom Pill
      ctx.save();
      ctx.translate(0, 160);
      ctx.fillStyle = '#70092B';
      ctx.shadowColor = 'rgba(112, 9, 43, 0.28)';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.roundRect(-115, -16, 230, 32, 16);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `700 11px 'Plus Jakarta Sans', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('✨ +11 comercios con tarjeta propia', 0, 4);
      ctx.restore();

      ctx.restore();
    }

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [motionMode]);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '580px', margin: '0 auto' }}>
      {/* 3D Modern Smartphone Bezel Frame */}
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          margin: '0 auto',
          background: '#18181B',
          borderRadius: '38px',
          padding: '10px',
          border: '3px solid #3F3F46',
          boxShadow: '0 25px 60px -12px rgba(112, 9, 43, 0.4), inset 0 0 10px rgba(0,0,0,0.8)',
          position: 'relative'
        }}
      >
        {/* Phone Glass Display */}
        <div
          style={{
            background: '#FAF7F5',
            borderRadius: '28px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            height: '460px'
          }}
        >
          {/* Top Dynamic Island Notch */}
          <div
            style={{
              width: '84px',
              height: '18px',
              borderRadius: '12px',
              background: '#000000',
              margin: '8px auto 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '0 8px',
              zIndex: 30
            }}
          >
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981' }} />
          </div>

          {/* Top Bar Switcher between MAP & ORBIT */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 14px 6px',
              borderBottom: '1px solid rgba(234, 220, 218, 0.6)',
              zIndex: 30
            }}
          >
            <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#70092B' }}>
              fidely <span style={{ fontSize: '0.65rem', color: '#A21D4C' }}>&gt;club&lt;</span>
            </span>

            <div style={{ display: 'flex', gap: '4px', background: '#F5EAE8', padding: '2px', borderRadius: '8px' }}>
              <button
                type="button"
                onClick={() => setMotionMode('MAP')}
                style={{
                  border: 'none',
                  background: motionMode === 'MAP' ? '#70092B' : 'transparent',
                  color: motionMode === 'MAP' ? '#FFFFFF' : '#78716C',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                🗺️ Mapa Radar
              </button>
              <button
                type="button"
                onClick={() => setMotionMode('ORBIT')}
                style={{
                  border: 'none',
                  background: motionMode === 'ORBIT' ? '#70092B' : 'transparent',
                  color: motionMode === 'ORBIT' ? '#FFFFFF' : '#78716C',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                🪐 Órbita Logos
              </button>
            </div>
          </div>

          {/* 60 FPS Motion Graphics Canvas */}
          <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
            <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
          </div>
        </div>
      </div>

      {/* Floating Trust Badge */}
      <div
        style={{
          position: 'absolute',
          bottom: '-20px',
          right: '15px',
          background: '#FFFFFF',
          borderRadius: '9999px',
          padding: '8px 16px',
          boxShadow: '0 16px 36px rgba(112, 9, 43, 0.2)',
          border: '1.5px solid #EADCDA',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 35
        }}
      >
        <span style={{ fontSize: '13px' }}>🏪</span>
        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1C1917' }}>
          {BRANDS.length} Comercios Afiliados Activos
        </span>
      </div>
    </div>
  );
}
