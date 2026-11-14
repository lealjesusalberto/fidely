import React, { useState } from 'react';
import { 
  Sparkles, 
  Store, 
  CheckCircle2, 
  MapPin, 
  Tag, 
  Search, 
  Gift, 
  Coins, 
  ArrowRight,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import StoreLogoBadge from './StoreLogoBadge';

export default function WelcomeStoreSelectionModal({
  isOpen,
  onClose,
  client,
  stores = [],
  onSelectStore,
  config = {}
}) {
  const [selectedStoreId, setSelectedStoreId] = useState(() => {
    return client?.favoriteStoreId || stores[0]?.id || '';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const pointValueUsd = config?.pointValueUsd || 0.06;
  const welcomePoints = client?.pointsBalance || 100;
  const welcomeUsd = (welcomePoints * pointValueUsd).toFixed(2);
  const clientFirstName = client?.name ? client.name.split(' ')[0] : 'Socio';

  const filteredStores = stores.filter(st => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      st.name?.toLowerCase().includes(q) ||
      st.category?.toLowerCase().includes(q) ||
      st.city?.toLowerCase().includes(q) ||
      st.address?.toLowerCase().includes(q)
    );
  });

  const selectedStoreObj = stores.find(s => s.id === selectedStoreId) || stores[0];

  const handleConfirmSelection = () => {
    if (!selectedStoreId && stores.length > 0) return;
    setIsSubmitting(true);

    try {
      // Trigger festive confetti explosion
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#9C382A', '#DE8B76', '#FAF8F5', '#10B981', '#F59E0B']
      });
    } catch (e) {}

    setTimeout(() => {
      setIsSubmitting(false);
      if (onSelectStore) {
        onSelectStore(selectedStoreObj);
      }
      if (onClose) onClose();
    }, 450);
  };

  return (
    <div className="welcome-modal-backdrop" onClick={onClose}>
      <div 
        className="welcome-modal-card" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Top Accent Light */}
        <div className="welcome-modal-glow" />

        {/* Close button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="welcome-modal-close"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        )}

        {/* Header Celebration */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, rgba(222, 139, 118, 0.22) 0%, rgba(156, 56, 42, 0.12) 100%)',
            border: '1.5px solid rgba(222, 139, 118, 0.4)',
            padding: '6px 16px',
            borderRadius: '9999px',
            color: 'var(--c-primary)',
            fontSize: '0.78rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '12px'
          }}>
            <Sparkles size={15} color="var(--c-primary)" />
            <span>¡Bono de Bienvenida Activado!</span>
          </div>

          <h2 style={{
            fontSize: 'clamp(1.35rem, 3.5vw, 1.75rem)',
            fontWeight: 900,
            color: '#1C1917',
            letterSpacing: '-0.025em',
            margin: '0 0 6px',
            lineHeight: 1.2
          }}>
            ¡Felicidades, {clientFirstName}!
          </h2>

          <p style={{
            fontSize: '0.88rem',
            color: 'var(--text-muted)',
            maxWidth: '480px',
            margin: '0 auto',
            lineHeight: 1.45
          }}>
            Has recibido de regalo tu <strong>1er sello de bienvenida</strong> para tu tarjeta de fidelización.
          </p>
        </div>

        {/* Value Tag Box */}
        <div style={{
          background: 'linear-gradient(135deg, #FAF4EE 0%, #FFFFFF 100%)',
          border: '2px solid rgba(222, 139, 118, 0.45)',
          borderRadius: '18px',
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          boxShadow: '0 4px 16px rgba(156, 56, 42, 0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #9C382A 0%, #DE8B76 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(156, 56, 42, 0.25)',
              flexShrink: 0
            }}>
              <Gift size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.04em' }}>
                Tu Tarjeta de Fidelización
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--c-primary)', lineHeight: 1.15 }}>
                1er Sello Acreditado <span style={{ fontSize: '0.86rem', color: '#15803D', fontWeight: 800 }}>(Bienvenida)</span>
              </div>
            </div>
          </div>

          <div style={{
            background: '#ECFDF5',
            border: '1px solid #10B981',
            color: '#065F46',
            fontSize: '0.74rem',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: '10px'
          }}>
            ✓ 100% Gratis
          </div>
        </div>

        {/* Call To Action Instruction */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1C1917', marginBottom: '4px' }}>
            ¿En cuál de nuestros comercios aliados deseas activar tu tarjeta?
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            Selecciona la tienda de tu preferencia para recibir tu 1er sello y comenzar a acumular premios:
          </div>
        </div>

        {/* Optional Search Filter */}
        {stores.length > 3 && (
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Buscar tienda por nombre, categoría o ciudad..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{
                width: '100%',
                paddingLeft: '34px',
                paddingTop: '8px',
                paddingBottom: '8px',
                fontSize: '0.80rem',
                borderRadius: '12px',
                background: '#FAF8F5'
              }}
            />
          </div>
        )}

        {/* Store Selection Cards Container */}
        <div className="welcome-stores-list">
          {filteredStores.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              No se encontraron comercios con los términos de búsqueda.
            </div>
          ) : (
            filteredStores.map(store => {
              const isSelected = selectedStoreId === store.id;

              return (
                <div
                  key={store.id}
                  onClick={() => setSelectedStoreId(store.id)}
                  className={`welcome-store-card ${isSelected ? 'is-selected' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <StoreLogoBadge store={store} size={48} borderRadius="12px" />
                    
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontWeight: 800,
                        fontSize: '0.92rem',
                        color: 'var(--text-main)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {store.name}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '0.68rem',
                          background: isSelected ? 'rgba(156, 56, 42, 0.1)' : '#F5F5F4',
                          color: isSelected ? 'var(--c-primary)' : 'var(--text-muted)',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          fontWeight: 700
                        }}>
                          {store.category || 'Comercio Aliado'}
                        </span>

                        <span style={{ fontSize: '0.70rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <MapPin size={11} />
                          <span>{store.city || 'Caracas'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Radio / Check Indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, paddingLeft: '8px' }}>
                    <div style={{ textAlign: 'right', display: 'none' }} className="welcome-store-pts-tag">
                      <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--c-primary)' }}>
                        +{welcomePoints} pts
                      </span>
                    </div>

                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: isSelected ? '2px solid var(--c-primary)' : '2px solid #D6D3D1',
                      background: isSelected ? 'var(--c-primary)' : '#FFFFFF',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.18s ease'
                    }}>
                      {isSelected && <CheckCircle2 size={16} strokeWidth={2.8} />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Action Button */}
        <div style={{ marginTop: '20px' }}>
          <button
            type="button"
            disabled={isSubmitting || !selectedStoreObj}
            onClick={handleConfirmSelection}
            className="btn-pill-primary"
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '0.94rem',
              fontWeight: 800,
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(156, 56, 42, 0.28)'
            }}
          >
            <span>Activar mis {welcomePoints} Pts en {selectedStoreObj?.name ? selectedStoreObj.name.split(' ')[0] : 'mi Tienda'}</span>
            <ArrowRight size={17} />
          </button>

          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px', margin: '10px 0 0' }}>
            💡 Podrás acumular puntos en todas las tiendas de fidely CLUB en tus compras mayores a US$25.
          </p>
        </div>
      </div>

      <style>{`
        .welcome-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(12, 10, 9, 0.65);
          backdrop-filter: blur(8px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: welcomeFadeIn 0.22s ease-out;
        }

        .welcome-modal-card {
          width: 100%;
          max-width: 540px;
          background: #FFFFFF;
          border-radius: 28px;
          border: 1.5px solid #EDE2D5;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.22);
          padding: clamp(20px, 4vw, 32px);
          position: relative;
          box-sizing: border-box;
          overflow: hidden;
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          animation: welcomeScaleUp 0.26s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .welcome-modal-glow {
          position: absolute;
          top: -40px;
          left: 50%;
          transform: translateX(-50%);
          width: 220px;
          height: 120px;
          background: radial-gradient(ellipse, rgba(222, 139, 118, 0.45) 0%, rgba(255, 255, 255, 0) 70%);
          pointer-events: none;
        }

        .welcome-modal-close {
          position: absolute;
          top: 18px;
          right: 18px;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #FAF8F5;
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
          z-index: 10;
        }

        .welcome-modal-close:hover {
          background: #F5EBE6;
          color: var(--c-primary);
        }

        .welcome-stores-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 230px;
          overflow-y: auto;
          padding-right: 4px;
          margin-bottom: 4px;
        }

        .welcome-stores-list::-webkit-scrollbar {
          width: 5px;
        }
        .welcome-stores-list::-webkit-scrollbar-thumb {
          background: #E7E5E4;
          border-radius: 4px;
        }

        .welcome-store-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-radius: 16px;
          border: 1.5px solid #EDE2D5;
          background: #FAF8F5;
          cursor: pointer;
          transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .welcome-store-card:hover {
          background: #FFFFFF;
          border-color: var(--c-primary);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(156, 56, 42, 0.08);
        }

        .welcome-store-card.is-selected {
          background: #FFFFFF;
          border-color: var(--c-primary);
          border-width: 2px;
          box-shadow: 0 6px 18px rgba(156, 56, 42, 0.12);
        }

        @media (max-width: 640px) {
          .welcome-modal-backdrop {
            padding: 8px;
          }
          .welcome-modal-card {
            padding: 16px 14px;
            border-radius: 20px;
            max-height: 94dvh;
          }
          .welcome-modal-close {
            top: 12px;
            right: 12px;
            width: 30px;
            height: 30px;
          }
          .welcome-stores-list {
            max-height: 200px;
          }
          .welcome-store-card {
            padding: 8px 10px;
            border-radius: 12px;
          }
        }

        @keyframes welcomeFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes welcomeScaleUp {
          from { opacity: 0; transform: scale(0.94) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
