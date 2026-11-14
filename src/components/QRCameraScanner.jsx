import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  Camera, 
  FlipHorizontal, 
  Image as ImageIcon, 
  AlertCircle, 
  RefreshCw, 
  Sparkles, 
  CheckCircle2, 
  X,
  UploadCloud,
  Zap,
  ZapOff
} from 'lucide-react';

/**
 * QRCameraScanner
 * Componente de escaneo de QR en tiempo real para navegadores móviles y de escritorio.
 * - Abre la cámara trasera ("environment") con video en vivo.
 * - Permite alternar cámara (frontal / trasera).
 * - Ofrece fallback de captura con foto nativa (<input capture="environment">) que funciona aún sin HTTPS.
 * - Emite sonido sutil y vibración háptica al detectar un QR.
 */
export default function QRCameraScanner({
  onScanSuccess,
  onClose,
  title = "Apunta al Código QR",
  subtitle = "Enfoca el código QR de mostrador con tu cámara",
  onNotify
}) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const isStoppingRef = useRef(false);
  const hasScannedRef = useRef(false);
  const regionId = useRef(`qr-video-${Math.random().toString(36).substring(2, 9)}`).current;

  // Reproduce un suave 'beep' de confirmación al escanear
  const playScanBeep = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12); // E6
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch (e) {}
  };

  // Manejo de éxito
  const handleSuccess = (decodedText) => {
    if (hasScannedRef.current) return;
    hasScannedRef.current = true;

    // 1. Vibración háptica en móvil
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([70, 30, 70]); } catch (e) {}
    }
    // 2. Beep suave
    playScanBeep();
    // 3. Callback
    if (onScanSuccess) {
      onScanSuccess(decodedText);
    }
  };

  // Iniciar el escáner de cámara
  useEffect(() => {
    let isCancelled = false;
    hasScannedRef.current = false;

    const startCamera = async () => {
      setCameraError(null);
      setCameraActive(false);

      // Esperar brevemente a que el elemento contenedor esté montado en el DOM
      await new Promise(r => setTimeout(r, 120));
      if (isCancelled) return;

      const element = document.getElementById(regionId);
      if (!element) return;

      try {
        // Detener instancia previa si existía
        if (scannerRef.current) {
          try {
            if (scannerRef.current.isScanning) {
              await scannerRef.current.stop();
            }
            await scannerRef.current.clear();
          } catch (e) {}
        }

        if (isCancelled) return;

        const scanner = new Html5Qrcode(regionId, { 
          verbose: false,
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        });
        scannerRef.current = scanner;

        const config = {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const boxSize = Math.max(200, Math.floor(minEdge * 0.8));
            return { width: boxSize, height: boxSize };
          },
          aspectRatio: 1.0,
          disableFlip: facingMode === 'environment'
        };

        await scanner.start(
          { facingMode: facingMode },
          config,
          (decodedText) => {
            if (!isCancelled) {
              handleSuccess(decodedText);
            }
          },
          () => {
            // Frame sin QR: comportamiento esperado
          }
        );

        if (!isCancelled) {
          setCameraActive(true);
          setCameraError(null);

          // Verificar si soporta linterna (torch)
          try {
            const capabilities = scanner.getRunningTrackCapabilities?.();
            if (capabilities && capabilities.torch) {
              setHasTorch(true);
            }
          } catch (e) {}
        }
      } catch (err) {
        console.warn('[QR Scanner] Error al encender la cámara:', err);
        if (isCancelled) return;
        setCameraActive(false);

        const msg = String(err?.message || err);
        if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
          setCameraError('Permiso de cámara no concedido. Habilita el acceso a la cámara en los permisos de tu navegador o usa el botón "Tomar Foto".');
        } else if (msg.includes('NotFoundError') || msg.includes('DevicesNotFoundError')) {
          setCameraError('No se encontró ninguna cámara en este dispositivo. Puedes subir una foto del código QR.');
        } else if (msg.includes('NotReadableError') || msg.includes('TrackStartError')) {
          setCameraError('La cámara está en uso por otra app. Ciérrala e intenta de nuevo.');
        } else if (typeof window !== 'undefined' && !window.isSecureContext && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
          setCameraError('Tu navegador requiere conexión segura (HTTPS) para transmitir video en vivo. Puedes presionar "Tomar Foto con Cámara" abajo.');
        } else {
          setCameraError('No pudimos acceder a la cámara en vivo. Puedes usar la opción de tomar foto para escanear el QR.');
        }
      }
    };

    startCamera();

    return () => {
      isCancelled = true;
      if (scannerRef.current && !isStoppingRef.current) {
        isStoppingRef.current = true;
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop()
              .then(() => scannerRef.current?.clear())
              .catch(() => {})
              .finally(() => { isStoppingRef.current = false; });
          } else {
            scannerRef.current.clear();
            isStoppingRef.current = false;
          }
        } catch (e) {
          isStoppingRef.current = false;
        }
      }
    };
  }, [facingMode, regionId]);

  // Alternar linterna si está disponible
  const handleToggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextState = !isTorchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState }]
      });
      setIsTorchOn(nextState);
    } catch (e) {
      console.warn('Torch error:', e);
    }
  };

  // Alternar cámara frontal/trasera
  const handleFlipCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Fallback infalible: tomar foto o subir archivo desde móvil
  const handleFileScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
      let scanner = scannerRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(regionId, { verbose: false });
        scannerRef.current = scanner;
      }

      if (scanner.isScanning) {
        try { await scanner.stop(); } catch (err) {}
      }

      const decodedText = await scanner.scanFile(file, true);
      handleSuccess(decodedText);
    } catch (err) {
      console.warn('[QR Scanner] Error al decodificar imagen:', err);
      if (onNotify) {
        onNotify('No se detectó un código QR nítido en la imagen. Intenta enfocarlo mejor.', 'warning');
      } else {
        alert('No se detectó un código QR nítido en la imagen. Intenta enfocarlo mejor.');
      }
    } finally {
      setIsProcessingFile(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* Input de archivo oculto para captura nativa (funciona en 100% de móviles) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileScan}
      />

      {/* Contenedor del Visor de Cámara */}
      <div style={{
        width: '100%',
        maxWidth: '380px',
        minHeight: '260px',
        background: '#09090b',
        borderRadius: '22px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
        border: '2px solid rgba(212, 175, 55, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '14px'
      }}>
        
        {/* Elemento raíz donde html5-qrcode monta el <video> */}
        <div 
          id={regionId} 
          style={{ 
            width: '100%', 
            minHeight: '260px',
            display: cameraActive ? 'block' : 'none' 
          }} 
        />

        {/* CSS para forzar que el video ocupe el visor limpiamente */}
        <style>{`
          #${regionId} video {
            width: 100% !important;
            height: 100% !important;
            min-height: 260px !important;
            object-fit: cover !important;
            border-radius: 20px !important;
          }
          #${regionId} img {
            display: none !important;
          }
          @keyframes scanLineGlow {
            0% { top: 12%; opacity: 0.85; }
            50% { opacity: 1; }
            100% { top: 88%; opacity: 0.85; }
          }
          @keyframes pulseCorners {
            0%, 100% { transform: scale(1); opacity: 0.9; }
            50% { transform: scale(1.03); opacity: 1; }
          }
        `}</style>

        {/* Retícula visual moderna superpuesta en el video */}
        {cameraActive && (
          <div style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Marco de enfoque */}
            <div style={{
              width: '200px',
              height: '200px',
              position: 'relative',
              animation: 'pulseCorners 2s infinite ease-in-out'
            }}>
              {/* Esquinas del marco */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '28px', height: '28px', borderTop: '4px solid #F5EBE1', borderLeft: '4px solid #F5EBE1', borderTopLeftRadius: '10px' }} />
              <div style={{ position: 'absolute', top: 0, right: 0, width: '28px', height: '28px', borderTop: '4px solid #F5EBE1', borderRight: '4px solid #F5EBE1', borderTopRightRadius: '10px' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '28px', height: '28px', borderBottom: '4px solid #F5EBE1', borderLeft: '4px solid #F5EBE1', borderBottomLeftRadius: '10px' }} />
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '28px', height: '28px', borderBottom: '4px solid #F5EBE1', borderRight: '4px solid #F5EBE1', borderBottomRightRadius: '10px' }} />

              {/* Láser de escaneo animado */}
              <div style={{
                position: 'absolute',
                left: '6px',
                right: '6px',
                height: '3px',
                background: 'linear-gradient(90deg, transparent, #22C55E, #4ADE80, transparent)',
                boxShadow: '0 0 14px #22C55E',
                animation: 'scanLineGlow 1.6s infinite alternate ease-in-out'
              }} />
            </div>

            {/* Badge indicador EN VIVO */}
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(6px)',
              padding: '4px 10px',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#FFFFFF',
              fontSize: '0.7rem',
              fontWeight: 700
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 8px #22C55E', display: 'inline-block' }} />
              <span>Cámara Activa</span>
            </div>

            {/* Controles de cámara flotantes */}
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              display: 'flex',
              gap: '6px',
              pointerEvents: 'auto'
            }}>
              {hasTorch && (
                <button
                  type="button"
                  onClick={handleToggleTorch}
                  style={{
                    background: isTorchOn ? '#EAB308' : 'rgba(0,0,0,0.6)',
                    color: isTorchOn ? '#000000' : '#FFFFFF',
                    border: '1px solid rgba(255,255,255,0.25)',
                    borderRadius: '50%',
                    width: '34px',
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  title="Linterna"
                >
                  {isTorchOn ? <Zap size={16} /> : <ZapOff size={16} />}
                </button>
              )}
              <button
                type="button"
                onClick={handleFlipCamera}
                style={{
                  background: 'rgba(0,0,0,0.6)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Cambiar Cámara Frontal/Trasera"
              >
                <FlipHorizontal size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Estado Cargando cámara */}
        {!cameraActive && !cameraError && (
          <div style={{ color: '#F5EBE1', textAlign: 'center', padding: '24px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: 'rgba(212, 175, 55, 0.15)',
              border: '2px solid rgba(212, 175, 55, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto'
            }}>
              <Camera size={26} color="#D4AF37" className="animate-pulse" />
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '4px' }}>
              Iniciando cámara del teléfono...
            </div>
            <div style={{ fontSize: '0.74rem', color: '#A8A29E' }}>
              Por favor concede permiso de acceso a la cámara si el navegador lo solicita
            </div>
          </div>
        )}

        {/* Estado de Error o Sin Permiso de Cámara */}
        {cameraError && (
          <div style={{ color: '#FAF8F5', textAlign: 'center', padding: '20px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '2px solid rgba(239, 68, 68, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 10px auto'
            }}>
              <AlertCircle size={24} color="#EF4444" />
            </div>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#FCA5A5', marginBottom: '6px' }}>
              Aviso de Cámara
            </div>
            <p style={{ fontSize: '0.74rem', color: '#D6D3D1', lineHeight: 1.4, margin: '0 0 12px 0' }}>
              {cameraError}
            </p>
            <button
              type="button"
              onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: '#FFFFFF',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.74rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <RefreshCw size={13} />
              <span>Reintentar con otra cámara</span>
            </button>
          </div>
        )}
      </div>

      {/* Botón de Captura Nativa (100% infalible en móviles / tablets) */}
      <div style={{ width: '100%', maxWidth: '380px', display: 'flex', gap: '8px' }}>
        <button
          type="button"
          disabled={isProcessingFile}
          onClick={() => fileInputRef.current?.click()}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '12px',
            border: '1.5px solid var(--c-primary)',
            background: 'var(--c-secondary-soft)',
            color: 'var(--c-primary)',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
          }}
        >
          <Camera size={16} />
          <span>{isProcessingFile ? 'Analizando...' : 'Tomar Foto del QR'}</span>
        </button>

        <button
          type="button"
          disabled={isProcessingFile}
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.removeAttribute('capture');
              fileInputRef.current.click();
              fileInputRef.current.setAttribute('capture', 'environment');
            }
          }}
          style={{
            padding: '10px 14px',
            borderRadius: '12px',
            border: '1px solid var(--border-light)',
            background: '#FFFFFF',
            color: 'var(--text-main)',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
          title="Subir imagen desde galería"
        >
          <ImageIcon size={16} />
          <span>Galería</span>
        </button>
      </div>

    </div>
  );
}
