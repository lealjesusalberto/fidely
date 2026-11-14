import React, { useState, useEffect, useMemo } from 'react';
import { Search, Check, X, Tag, Sparkles } from 'lucide-react';

export const STORE_CATEGORIES = [
  { id: 'barberia', name: 'Barbería / Peluquería', icon: '💈', desc: 'Barberías, salones, cortes y estilistas' },
  { id: 'tattoo', name: 'Tattoo Estudio', icon: '🎨', desc: 'Estudios de tatuaje, tattoo, tatto estudio, piercing y arte corporal' },
  { id: 'panaderia', name: 'Panadería & Pastelería', icon: '🥖', desc: 'Panaderías, repostería, tortas y café' },
  { id: 'gym', name: 'Gimnasio & Fitness', icon: '🏋️', desc: 'Gimnasios, box, crossfit y entrenamiento' },
  { id: 'boutique', name: 'Boutique / Ropa & Moda', icon: '👗', desc: 'Ropa, prendas de vestir y accesorios' },
  { id: 'calzado', name: 'Calzado & Zapatos', icon: '👟', desc: 'Zapatos deportivos, casuales y calzado' },
  { id: 'restaurante', name: 'Restaurante / Gastronomía', icon: '🍽️', desc: 'Restaurantes, comida y gastronomía' },
  { id: 'cafe', name: 'Café & Heladería', icon: '☕', desc: 'Cafeterías, heladerías y postres' },
  { id: 'comida_rapida', name: 'Comida Rápida & Snacks', icon: '🍔', desc: 'Hamburguesas, pizzas, sushi y snacks' },
  { id: 'supermercado', name: 'Supermercado & Bodegón', icon: '🛒', desc: 'Víveres, alimentos y licores' },
  { id: 'farmacia', name: 'Farmacia & Salud', icon: '💊', desc: 'Medicamentos y cuidado de la salud' },
  { id: 'belleza', name: 'Belleza & Estética', icon: '💄', desc: 'Cosméticos, spa, uñas y cuidado facial' },
  { id: 'tecnologia', name: 'Electrónica & Tecnología', icon: '📱', desc: 'Smartphones, computación y gadgets' },
  { id: 'suplementos', name: 'Suplementos & Nutrición', icon: '🥤', desc: 'Proteínas y nutrición deportiva' },
  { id: 'mascotas', name: 'Mascotas & Veterinaria', icon: '🐾', desc: 'Pet shop, veterinaria y alimentos' },
  { id: 'taller', name: 'Taller Mecánico & Autolavado', icon: '🚗', desc: 'Mecánica, autolavados y repuestos' },
  { id: 'hogar', name: 'Hogar & Muebles', icon: '🏠', desc: 'Mobiliario, decoración y hogar' },
  { id: 'ferreteria', name: 'Ferretería & Construcción', icon: '🔧', desc: 'Herramientas, pinturas y materiales' },
  { id: 'libreria', name: 'Librería & Papelería', icon: '📚', desc: 'Libros, papelería y útiles' },
  { id: 'joyeria', name: 'Joyería & Accesorios', icon: '✨', desc: 'Joyería fina, relojes y accesorios' },
  { id: 'optica', name: 'Óptica & Visión', icon: '👓', desc: 'Lentes, monturas y salud visual' },
  { id: 'otro', name: 'Otro Comercio Aliado', icon: '🏬', desc: 'Servicios y otros rubros comerciales' }
];

export function getCategoryInfo(categoryName) {
  if (!categoryName) return STORE_CATEGORIES[0];
  const clean = categoryName.trim().toLowerCase();
  const exact = STORE_CATEGORIES.find(c => c.name.toLowerCase() === clean);
  if (exact) return exact;
  if (clean.includes('tatt') || clean.includes('tatuaj')) {
    return STORE_CATEGORIES.find(c => c.id === 'tattoo') || { id: 'tattoo', name: 'Tattoo Estudio', icon: '🎨', desc: 'Estudios de tatuaje, tatto y arte corporal' };
  }
  const partial = STORE_CATEGORIES.find(c => 
    clean.includes(c.id) ||
    clean.includes(c.name.toLowerCase().split('/')[0].trim()) ||
    c.name.toLowerCase().includes(clean)
  );
  return partial || { id: 'otro', name: categoryName, icon: '🏬', desc: 'Comercio aliado' };
}

export default function StoreCategoryModal({
  isOpen,
  onClose,
  selectedCategory,
  onSelectCategory
}) {
  const [search, setSearch] = useState('');
  const [activeSelection, setActiveSelection] = useState(selectedCategory || STORE_CATEGORIES[0].name);

  // Synchronize incoming category
  React.useEffect(() => {
    if (selectedCategory) {
      setActiveSelection(selectedCategory);
    }
  }, [selectedCategory, isOpen]);

  // Reset search when opening
  React.useEffect(() => {
    if (isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return STORE_CATEGORIES;
    return STORE_CATEGORIES.filter(cat => 
      cat.name.toLowerCase().includes(q) ||
      cat.desc.toLowerCase().includes(q) ||
      cat.id.toLowerCase().includes(q) ||
      (q.includes('tatt') && cat.id === 'tattoo')
    );
  }, [search]);

  if (!isOpen) return null;

  const handlePickCategory = (cat) => {
    setActiveSelection(cat.name);
    if (onSelectCategory) {
      onSelectCategory(cat.name);
    }
    if (onClose) {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (onSelectCategory && activeSelection) {
      onSelectCategory(activeSelection);
    }
    if (onClose) {
      onClose();
    }
  };

  const currentInfo = getCategoryInfo(activeSelection);

  return (
    <div 
      className="fidely-cat-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fidely-cat-modal-title"
    >
      <div 
        className="fidely-cat-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="fidely-cat-modal-header">
          <div className="fidely-cat-modal-header-info">
            <div className="fidely-cat-modal-badge">
              <Sparkles size={12} />
              <span>Rubro Comercial</span>
            </div>
            <h3 id="fidely-cat-modal-title" className="fidely-cat-modal-title">
              Categoría de tu Comercio
            </h3>
            <p className="fidely-cat-modal-subtitle">
              Selecciona el rubro que mejor identifique a tu tienda
            </p>
          </div>
          <button
            type="button"
            className="fidely-cat-modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar modal de categorías"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="fidely-cat-modal-search-wrap">
          <div className="fidely-cat-modal-search-box">
            <Search size={14} className="fidely-cat-modal-search-icon" />
            <input
              type="text"
              autoFocus
              className="fidely-cat-modal-search-input"
              placeholder="Buscar categoría (ej. barbería, tattoo, gym, panadería...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="fidely-cat-modal-search-clear"
                onClick={() => setSearch('')}
                aria-label="Limpiar búsqueda"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Categories Grid (Fit & Less font size) */}
        <div className="fidely-cat-modal-grid-wrap">
          {filteredCategories.length === 0 ? (
            <div className="fidely-cat-modal-empty">
              <Tag size={24} style={{ opacity: 0.4, marginBottom: '6px' }} />
              <p>No se encontraron categorías para "<strong>{search}</strong>"</p>
              <button 
                type="button"
                className="fidely-cat-modal-empty-btn"
                onClick={() => setSearch('')}
              >
                Ver todas las categorías
              </button>
            </div>
          ) : (
            <div className="fidely-cat-modal-grid">
              {filteredCategories.map((cat) => {
                const isSelected = activeSelection.toLowerCase() === cat.name.toLowerCase();
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handlePickCategory(cat)}
                    className={`fidely-cat-card ${isSelected ? 'selected' : ''}`}
                  >
                    <span className="fidely-cat-card-icon">{cat.icon}</span>
                    <div className="fidely-cat-card-content">
                      <div className="fidely-cat-card-name">{cat.name}</div>
                      <div className="fidely-cat-card-desc">{cat.desc}</div>
                    </div>
                    {isSelected && (
                      <div className="fidely-cat-card-check">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="fidely-cat-modal-footer">
          <div className="fidely-cat-modal-selected-pill">
            <span className="fidely-cat-pill-icon">{currentInfo.icon}</span>
            <span className="fidely-cat-pill-label">{currentInfo.name}</span>
          </div>

          <div className="fidely-cat-modal-actions">
            <button
              type="button"
              className="fidely-cat-cancel-btn"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="fidely-cat-confirm-btn"
              onClick={handleConfirm}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

