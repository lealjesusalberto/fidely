import React from 'react';
import {
  Store,
  ShoppingBag,
  Sparkles,
  Tag,
  Coffee,
  Heart,
  Dumbbell,
  Laptop,
  Pill,
  Home,
  Scissors
} from 'lucide-react';

export default function StoreLogoBadge({
  store = {},
  size = 56,
  borderRadius = '16px',
  showCategoryBadge = false,
  style = {}
}) {
  const name = store?.name || 'Comercio';
  const logo = store?.logo || store?.logoUrl || store?.storeLogo || store?.photoUrl;
  const category = store?.category || '';

  // Get initials (up to 2 letters)
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'TI';

  // Category specific gradients and icons
  const getCategoryTheme = (cat) => {
    const c = (cat || '').toLowerCase();
    if (c.includes('barber') || c.includes('peluquer') || c.includes('estilist')) {
      return {
        gradient: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
        textColor: '#FFFFFF',
        icon: Scissors,
        accent: '#38BDF8'
      };
    }
    if (c.includes('boutique') || c.includes('ropa') || c.includes('moda')) {
      return {
        gradient: 'linear-gradient(135deg, #DE8B76 0%, #9C382A 100%)',
        textColor: '#FFFFFF',
        icon: ShoppingBag,
        accent: '#FDE047'
      };
    }
    if (c.includes('calzado') || c.includes('zapato')) {
      return {
        gradient: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
        textColor: '#FFFFFF',
        icon: Tag,
        accent: '#C4B5FD'
      };
    }
    if (c.includes('electr') || c.includes('tecno')) {
      return {
        gradient: 'linear-gradient(135deg, #0EA5E9 0%, #0369A1 100%)',
        textColor: '#FFFFFF',
        icon: Laptop,
        accent: '#7DD3FC'
      };
    }
    if (c.includes('supermercado') || c.includes('alimento') || c.includes('viveres')) {
      return {
        gradient: 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
        textColor: '#FFFFFF',
        icon: ShoppingBag,
        accent: '#6EE7B7'
      };
    }
    if (c.includes('farmacia') || c.includes('salud') || c.includes('medicina')) {
      return {
        gradient: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
        textColor: '#FFFFFF',
        icon: Pill,
        accent: '#FCA5A5'
      };
    }
    if (c.includes('gym') || c.includes('fitness') || c.includes('suplemento')) {
      return {
        gradient: 'linear-gradient(135deg, #F97316 0%, #C2410C 100%)',
        textColor: '#FFFFFF',
        icon: Dumbbell,
        accent: '#FDBA74'
      };
    }
    if (c.includes('restaurante') || c.includes('caf') || c.includes('panader')) {
      return {
        gradient: 'linear-gradient(135deg, #D97706 0%, #92400E 100%)',
        textColor: '#FFFFFF',
        icon: Coffee,
        accent: '#FDE68A'
      };
    }
    if (c.includes('belleza') || c.includes('cosm')) {
      return {
        gradient: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)',
        textColor: '#FFFFFF',
        icon: Heart,
        accent: '#FBCFE8'
      };
    }
    if (c.includes('hogar') || c.includes('mueble')) {
      return {
        gradient: 'linear-gradient(135deg, #14B8A6 0%, #0F766E 100%)',
        textColor: '#FFFFFF',
        icon: Home,
        accent: '#99F6E4'
      };
    }
    return {
      gradient: 'linear-gradient(135deg, #DE8B76 0%, #9C382A 100%)',
      textColor: '#FFFFFF',
      icon: Store,
      accent: '#FDE047'
    };
  };

  const theme = getCategoryTheme(category);
  const IconComp = theme.icon;

  return (
    <div 
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        borderRadius,
        overflow: 'visible',
        ...style
      }}
    >
      <div style={{
        width: '100%',
        height: '100%',
        borderRadius,
        overflow: 'hidden',
        background: logo ? '#FFFFFF' : theme.gradient,
        border: '1.5px solid rgba(222, 139, 118, 0.35)',
        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {logo ? (
          <img 
            src={logo} 
            alt={name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block'
            }}
            onError={(e) => {
              // Fallback if image fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <span style={{
            fontFamily: 'var(--font-heading)',
            fontSize: `${Math.round(size * 0.38)}px`,
            fontWeight: 900,
            color: theme.textColor,
            letterSpacing: '0.03em'
          }}>
            {initials}
          </span>
        )}
      </div>

      {showCategoryBadge && (
        <div style={{
          position: 'absolute',
          bottom: '-3px',
          right: '-3px',
          width: `${Math.round(size * 0.38)}px`,
          height: `${Math.round(size * 0.38)}px`,
          borderRadius: '50%',
          background: '#FFFFFF',
          border: '1.5px solid #EDE2D5',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <IconComp size={Math.round(size * 0.22)} color="var(--c-primary)" />
        </div>
      )}
    </div>
  );
}
