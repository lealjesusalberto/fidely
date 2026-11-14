import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  Image,
  Store,
  Tag,
  DollarSign,
  MapPin,
  User,
  Phone,
  Mail,
  CheckCircle2,
  Trash2,
  Sparkles,
  Navigation,
  Compass,
  Crosshair,
  Bell,
  ExternalLink,
  Radio,
  Star,
  Scissors,
  Coffee,
  Utensils,
  ShoppingBag,
  Gem,
  Heart,
  Crown,
  Palette,
  Award,
  Gift,
  Percent,
  PawPrint,
  Wrench,
  Flame,
  Flower2,
  Layers,
  Plus,
  Edit3
} from 'lucide-react';
import { saveStore } from '../firebase/firestoreService';
import StoreMapPicker from './StoreMapPicker';

export default function StoreProfileModal({
  isOpen,
  onClose,
  store,
  stores,
  setStores,
  config,
  onNotify,
  initialTab = 'STAMPS',
  isMandatoryFirstTime = false
}) {
  const safeStore = store || {};

  const [name, setName] = useState(safeStore.name || '');
  const [category, setCategory] = useState(store.category || 'Boutique / Ropa & Moda');
  const [city, setCity] = useState(store.city || 'Caracas');
  const [address, setAddress] = useState(store.address || '');
  const [manager, setManager] = useState(store.manager || '');
  const [phone, setPhone] = useState(store.phone || '');
  const [logo, setLogo] = useState(store.logo || '');
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const [cashbackPercent, setCashbackPercent] = useState(store.cashbackPercent ?? config?.defaultCashbackPercent ?? 5.0);
  const [activeModalTab, setActiveModalTab] = useState(
    isMandatoryFirstTime ? 'STAMPS' : (initialTab || 'STAMPS')
  ); // 'PROFILE', 'STAMPS', 'LOCATION'
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      if (isMandatoryFirstTime) {
        setActiveModalTab('STAMPS');
      } else if (initialTab) {
        setActiveModalTab(initialTab);
      }
    }
  }, [isOpen, initialTab, isMandatoryFirstTime]);

  // Estados de Diseño de Tarjeta de Fidelización & Cartilla de Sellos
  const [cardColor, setCardColor] = useState(
    store.cardColor || store.design?.cardColor || '#18181B'
  );
  const [cardGradient, setCardGradient] = useState(
    store.cardGradient || store.design?.cardGradient || '#090D16'
  );
  const [stampIcon, setStampIcon] = useState(
    store.stampIcon || store.design?.stampIcon || 'star'
  );

  // Catálogo de Premios por Sellos (Múltiples hitos en una sola tarjeta)
  const [stampRewards, setStampRewards] = useState(() => {
    if (Array.isArray(store.stampRewards) && store.stampRewards.length > 0) {
      return [...store.stampRewards].map((r, i) => ({
        id: r.id || `rew_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 3)}`,
        stamps: Number(r.stamps) || 6,
        title: r.title || 'Premio de Fidelidad',
        icon: r.icon || '🎁'
      })).sort((a, b) => Number(a.stamps) - Number(b.stamps));
    }
    const initialTarget = Number(store.stampsTarget || store.targetStamps || 6);
    const initialTitle = store.rewardTitle || store.currentReward || 'Premio de Fidelidad';
    return [
      { id: 'rew_init', stamps: initialTarget, title: initialTitle, icon: '🎁' }
    ];
  });

  const [newRewardStamps, setNewRewardStamps] = useState(4);
  const [newRewardTitle, setNewRewardTitle] = useState('');
  const [newRewardIcon, setNewRewardIcon] = useState('🎁');
  const [showAddRewardForm, setShowAddRewardForm] = useState(false);
  const [editingRewardId, setEditingRewardId] = useState(null);

  const [stampsTarget, setStampsTarget] = useState(
    store.stampsTarget || store.targetStamps || 6
  );
  const [rewardTitle, setRewardTitle] = useState(
    store.rewardTitle || store.currentReward || 'Corte de Cabello o Producto Especial'
  );
  const [stampCondition, setStampCondition] = useState(
    store.stampCondition || '1 sello por cada compra mayor a US$10'
  );
  const [minPurchaseForStamp, setMinPurchaseForStamp] = useState(
    store.minPurchaseForStamp ?? store.minPurchaseUsd ?? config?.minPurchaseUsd ?? 5.0
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    store.cardTemplateId || store.design?.cardTemplateId || null
  );
  const [cardPattern, setCardPattern] = useState(
    store.cardPattern || store.design?.cardPattern || 'dots'
  );
  const [cardBackgroundImage, setCardBackgroundImage] = useState(
    store.cardBackgroundImage || store.design?.cardBackgroundImage || store.backgroundImage || ''
  );
  const [cardBgUrlInput, setCardBgUrlInput] = useState('');

  // Estados de Ubicación GPS y Geofencing (Soporte para hasta 2 sucursales / locales)
  const initialLocations = (() => {
    if (Array.isArray(store.locations) && store.locations.length > 0) {
      return store.locations.slice(0, 2).map((loc, idx) => ({
        id: loc.id || `loc_${idx + 1}`,
        name: loc.name || (idx === 0 ? 'Local 1 (Principal)' : 'Local 2 (Sucursal)'),
        address: loc.address || (idx === 0 ? store.address || '' : ''),
        latitude: loc.latitude !== null && loc.latitude !== undefined && loc.latitude !== '' ? loc.latitude : '',
        longitude: loc.longitude !== null && loc.longitude !== undefined && loc.longitude !== '' ? loc.longitude : '',
        radiusMeters: loc.radiusMeters || loc.geofenceRadius || 150
      }));
    }
    return [
      {
        id: 'loc_1',
        name: store.location?.name || 'Local 1 (Principal)',
        address: store.location?.address || store.address || '',
        latitude: store.location?.latitude ?? store.latitude ?? '',
        longitude: store.location?.longitude ?? store.longitude ?? '',
        radiusMeters: store.location?.radiusMeters ?? store.geofenceRadius ?? 150
      }
    ];
  })();

  const [locations, setLocations] = useState(initialLocations);
  const [activeLocationIndex, setActiveLocationIndex] = useState(0); // 0 = Local 1, 1 = Local 2

  const updateCurrentLocation = (fields) => {
    setLocations(prev => {
      const next = [...prev];
      if (next[activeLocationIndex]) {
        next[activeLocationIndex] = { ...next[activeLocationIndex], ...fields };
      }
      return next;
    });
  };

  const handleAddSecondLocation = () => {
    if (locations.length >= 2) return;
    setLocations(prev => [
      ...prev,
      {
        id: 'loc_2',
        name: 'Local 2 (Sucursal)',
        address: '',
        latitude: '',
        longitude: '',
        radiusMeters: 150
      }
    ]);
    setActiveLocationIndex(1);
    if (onNotify) onNotify('¡Segunda sucursal agregada! Configura su ubicación GPS y radio.', 'info');
  };

  const handleRemoveSecondLocation = () => {
    if (locations.length <= 1) return;
    setLocations(prev => [prev[0]]);
    setActiveLocationIndex(0);
    if (onNotify) onNotify('Segunda sucursal eliminada. Se mantendrá únicamente Local 1 (Principal).', 'info');
  };

  const [geofenceEnabled, setGeofenceEnabled] = useState(
    store.location?.enabled ?? store.geofenceEnabled ?? true
  );
  const [proximityMessage, setProximityMessage] = useState(
    store.proximityMessage || `¡Estás cerca de ${store.name || 'nuestro local'}! Pasa hoy, sella tu tarjeta y gana premios exclusivos.`
  );
  const [mapsUrlInput, setMapsUrlInput] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  // Estados del Cupón de Bienvenida / Primera Visita para Nuevos Clientes
  const [welcomeCouponEnabled, setWelcomeCouponEnabled] = useState(
    Boolean(store.welcomeCoupon?.enabled ?? store.welcomeCouponEnabled ?? false)
  );
  const [welcomeCouponTitle, setWelcomeCouponTitle] = useState(
    store.welcomeCoupon?.title || store.welcomeCouponTitle || '15% de Descuento en tu Primer Consumo'
  );
  const [welcomeCouponDescription, setWelcomeCouponDescription] = useState(
    store.welcomeCoupon?.description || store.welcomeCouponDescription || 'Válido exclusivamente para nuevos clientes en su primera visita mostrando este cupón en caja.'
  );
  const [welcomeCouponType, setWelcomeCouponType] = useState(
    store.welcomeCoupon?.type || 'PERCENT' // 'PERCENT', 'FIXED_USD', 'FREE_ITEM'
  );
  const [welcomeCouponValue, setWelcomeCouponValue] = useState(
    store.welcomeCoupon?.value ?? 15
  );
  const [welcomeCouponMinPurchase, setWelcomeCouponMinPurchase] = useState(
    store.welcomeCoupon?.minPurchase ?? 0
  );

  // Permiso estrictamente individual activado por el Admin por tienda (no global)
  const isPercentEditable = Boolean(store?.canEditPercent);

  // File Upload Handler (reads as Base64 data URL with automatic downscale)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      if (onNotify) onNotify('Por favor selecciona un archivo de imagen válido (PNG, JPG, WebP).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.onload = () => {
        // Create canvas to scale down logo if larger than 256x256 to save space in Firestore
        const canvas = document.createElement('canvas');
        const maxSize = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/png', 0.88);
        setLogo(dataUrl);
        if (onNotify) onNotify('Logo cargado exitosamente. Haz clic en "Guardar Cambios".', 'info');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleApplyLogoUrl = () => {
    if (!logoUrlInput.trim()) return;
    setLogo(logoUrlInput.trim());
    setLogoUrlInput('');
  };

  // Subir textura o imagen de fondo de tarjeta (Canva / PNG / JPG) con compresión automática
  const handleCardBgUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      if (onNotify) onNotify('Por favor selecciona un archivo de imagen válido (PNG, JPG, WebP).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 600;
        const maxH = 380;
        let width = img.width;
        let height = img.height;

        if (width / height > maxW / maxH) {
          if (width > maxW) {
            height *= maxW / width;
            width = maxW;
          }
        } else {
          if (height > maxH) {
            width *= maxH / height;
            height = maxH;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setCardBackgroundImage(dataUrl);
        if (onNotify) onNotify('Fondo o textura de tarjeta cargada con éxito.', 'info');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCardBgUrl = () => {
    if (!cardBgUrlInput.trim()) return;
    setCardBackgroundImage(cardBgUrlInput.trim());
    setCardBgUrlInput('');
    if (onNotify) onNotify('URL de fondo aplicada a la tarjeta.', 'info');
  };

  // Obtener ubicación GPS con 1 clic usando la API del navegador
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      if (onNotify) onNotify('Tu navegador no soporta geolocalización.', 'error');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        updateCurrentLocation({ latitude: lat, longitude: lng });
        if (onNotify) onNotify(`¡Ubicación GPS fijada para ${locations[activeLocationIndex]?.name || `Local ${activeLocationIndex + 1}`}! (${lat}, ${lng})`, 'success');
      },
      (err) => {
        setIsLocating(false);
        let msg = 'No se pudo obtener la ubicación actual.';
        if (err.code === 1) msg = 'Permiso denegado. Permite el acceso a tu ubicación en el navegador o introduce las coordenadas manualmente.';
        if (onNotify) onNotify(msg, 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Extraer latitud y longitud desde enlace o texto de Google Maps
  const handleParseMapsUrl = () => {
    if (!mapsUrlInput.trim()) return;
    const text = mapsUrlInput.trim();

    // 1. Enlace tipo @lat,lng (ej. google.com/maps/@10.480612,-66.903611,17z)
    const atMatch = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      updateCurrentLocation({
        latitude: parseFloat(atMatch[1]),
        longitude: parseFloat(atMatch[2])
      });
      setMapsUrlInput('');
      if (onNotify) onNotify(`¡Coordenadas extraídas para ${locations[activeLocationIndex]?.name || `Local ${activeLocationIndex + 1}`}!`, 'success');
      return;
    }

    // 2. Parámetros ?q=lat,lng o &ll=lat,lng
    const qMatch = text.match(/[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qMatch) {
      updateCurrentLocation({
        latitude: parseFloat(qMatch[1]),
        longitude: parseFloat(qMatch[2])
      });
      setMapsUrlInput('');
      if (onNotify) onNotify(`¡Coordenadas extraídas para ${locations[activeLocationIndex]?.name || `Local ${activeLocationIndex + 1}`}!`, 'success');
      return;
    }

    // 3. Coordenadas directas escritas "10.4806, -66.9036"
    const directMatch = text.match(/^(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)$/);
    if (directMatch) {
      updateCurrentLocation({
        latitude: parseFloat(directMatch[1]),
        longitude: parseFloat(directMatch[2])
      });
      setMapsUrlInput('');
      if (onNotify) onNotify(`¡Coordenadas cargadas para ${locations[activeLocationIndex]?.name || `Local ${activeLocationIndex + 1}`}!`, 'success');
      return;
    }

    if (onNotify) onNotify('No se detectaron coordenadas válidas. Pega un enlace de Google Maps o escribe ej. "10.4806, -66.9036".', 'warning');
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      if (onNotify) onNotify('El nombre del comercio es obligatorio.', 'error');
      setActiveModalTab('PROFILE');
      return;
    }
    if (!phone.trim()) {
      if (onNotify) onNotify('El teléfono de contacto de la tienda es obligatorio.', 'error');
      setActiveModalTab('PROFILE');
      return;
    }
    let effectiveLogo = logo ? logo.trim() : null;
    if (!effectiveLogo) {
      // Generar automáticamente un avatar con iniciales si no ha subido imagen
      effectiveLogo = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
          <rect width="120" height="120" rx="28" fill="${cardColor || '#70092B'}"/>
          <text x="60" y="72" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="900" fill="#FFFFFF" text-anchor="middle">${initials}</text>
        </svg>
      `)}`;
    }

    // Preparar lista de premios por sellos ordenada
    const cleanStampRewards = stampRewards
      .filter(r => r && r.title && r.title.trim())
      .map((r, idx) => ({
        id: r.id || `rew_${idx + 1}_${Date.now()}`,
        stamps: Number(r.stamps) || 6,
        title: r.title.trim(),
        icon: r.icon || '🎁'
      }))
      .sort((a, b) => Number(a.stamps) - Number(b.stamps));

    if (cleanStampRewards.length === 0) {
      if (onNotify) onNotify('Debes definir al menos 1 premio o hito en la cartilla antes de guardar tu tarjeta.', 'error');
      setActiveModalTab('STAMPS');
      setShowAddRewardForm(true);
      return;
    }

    setIsSaving(true);

    // Preparar lista de hasta 2 ubicaciones
    const cleanLocations = locations.slice(0, 2).map((loc, idx) => {
      const pLat = loc.latitude !== '' && loc.latitude !== null && !isNaN(parseFloat(loc.latitude)) ? parseFloat(loc.latitude) : null;
      const pLng = loc.longitude !== '' && loc.longitude !== null && !isNaN(parseFloat(loc.longitude)) ? parseFloat(loc.longitude) : null;
      return {
        id: loc.id || `loc_${idx + 1}`,
        name: (loc.name || (idx === 0 ? 'Local 1 (Principal)' : 'Local 2 (Sucursal)')).trim(),
        address: (loc.address || '').trim(),
        latitude: pLat,
        longitude: pLng,
        radiusMeters: parseInt(loc.radiusMeters, 10) || 150
      };
    });

    const primaryLoc = cleanLocations[0] || {};
    const hasAnyValidCoords = cleanLocations.some(l => l.latitude !== null && l.longitude !== null);
    const isGeofenceActive = Boolean(geofenceEnabled && hasAnyValidCoords);

    const calculatedMaxTarget = Math.max(...cleanStampRewards.map(r => Number(r.stamps) || 6), 6);
    const calculatedPrimaryReward = cleanStampRewards[cleanStampRewards.length - 1]?.title || rewardTitle.trim() || 'Premio de Fidelidad';

    const updatedStore = {
      ...store,
      name: name.trim(),
      category: category,
      city: city.trim(),
      address: address.trim(),
      manager: manager.trim(),
      phone: phone.trim(),
      logo: effectiveLogo,
      // Diseño de Tarjeta de Fidelización & Catálogo de Sellos
      stampRewards: cleanStampRewards,
      stampsTarget: calculatedMaxTarget,
      targetStamps: calculatedMaxTarget,
      rewardTitle: calculatedPrimaryReward,
      stampCondition: stampCondition.trim() || `1 sello por cada compra a partir de US${parseFloat(minPurchaseForStamp || 0).toFixed(2)}`,
      minPurchaseForStamp: parseFloat(minPurchaseForStamp) || 0,
      minPurchaseUsd: parseFloat(minPurchaseForStamp) || 0,
      cardColor: cardColor,
      cardGradient: cardGradient,
      stampIcon: stampIcon,
      cardPattern: cardPattern,
      cardTemplateId: selectedTemplateId,
      cardBackgroundImage: cardBackgroundImage || null,
      design: {
        cardColor,
        cardGradient,
        stampIcon,
        stampRewards: cleanStampRewards,
        stampsTarget: calculatedMaxTarget,
        rewardTitle: calculatedPrimaryReward,
        stampCondition: stampCondition.trim() || `1 sello por cada compra a partir de US${parseFloat(minPurchaseForStamp || 0).toFixed(2)}`,
        minPurchaseForStamp: parseFloat(minPurchaseForStamp) || 0,
        minPurchaseUsd: parseFloat(minPurchaseForStamp) || 0,
        cardPattern,
        cardTemplateId: selectedTemplateId,
        cardBackgroundImage: cardBackgroundImage || null
      },
      // Coordenadas y Geofencing para la App Móvil (hasta 2 locales)
      locations: cleanLocations,
      latitude: primaryLoc.latitude ?? null,
      longitude: primaryLoc.longitude ?? null,
      geofenceRadius: primaryLoc.radiusMeters ?? 150,
      geofenceEnabled: isGeofenceActive,
      location: {
        name: primaryLoc.name || 'Local 1 (Principal)',
        address: primaryLoc.address || address.trim(),
        latitude: primaryLoc.latitude ?? null,
        longitude: primaryLoc.longitude ?? null,
        radiusMeters: primaryLoc.radiusMeters ?? 150,
        enabled: isGeofenceActive
      },
      proximityMessage: proximityMessage.trim() || `¡Estás cerca de ${name.trim()}! Pasa hoy y sella tu tarjeta de premios.`,
      // Cupón de Bienvenida / Primera Visita (Nuevos Clientes)
      welcomeCoupon: {
        enabled: Boolean(welcomeCouponEnabled),
        title: (() => {
          const rawTitle = welcomeCouponTitle.trim();
          const numericVal = parseFloat(welcomeCouponValue) || 0;
          if (welcomeCouponType === 'PERCENT') {
            if (!rawTitle || /^\d+(\.\d+)?%\s+de\s+Descuento/i.test(rawTitle) || /^US\$/i.test(rawTitle)) {
              return `${numericVal}% de Descuento en tu Primer Consumo`;
            }
          } else if (welcomeCouponType === 'FIXED_USD') {
            if (!rawTitle || /^\d+(\.\d+)?%\s+de\s+Descuento/i.test(rawTitle) || /^US\$/i.test(rawTitle)) {
              return `US$ ${numericVal.toFixed(2)} de Descuento en tu Primer Consumo`;
            }
          }
          return rawTitle || (welcomeCouponType === 'PERCENT' ? `${numericVal}% de Descuento en tu Primer Consumo` : 'Descuento de Bienvenida');
        })(),
        description: welcomeCouponDescription.trim() || 'Válido exclusivamente para nuevos clientes en su primera visita mostrando este cupón en caja.',
        type: welcomeCouponType, // 'PERCENT', 'FIXED_USD', 'FREE_ITEM'
        value: parseFloat(welcomeCouponValue) || 0,
        minPurchase: parseFloat(welcomeCouponMinPurchase) || 0,
        storeId: store.id,
        storeName: name.trim(),
        storeLogo: logo || null,
        storeCategory: category || 'Tienda Aliada',
        cardColor: cardColor,
        cardGradient: cardGradient,
        updatedAt: new Date().toISOString()
      },
      welcomeCouponEnabled: Boolean(welcomeCouponEnabled),
      welcomeCouponTitle: (() => {
        const rawTitle = welcomeCouponTitle.trim();
        const numericVal = parseFloat(welcomeCouponValue) || 0;
        if (welcomeCouponType === 'PERCENT') {
          if (!rawTitle || /^\d+(\.\d+)?%\s+de\s+Descuento/i.test(rawTitle) || /^US\$/i.test(rawTitle)) {
            return `${numericVal}% de Descuento en tu Primer Consumo`;
          }
        } else if (welcomeCouponType === 'FIXED_USD') {
          if (!rawTitle || /^\d+(\.\d+)?%\s+de\s+Descuento/i.test(rawTitle) || /^US\$/i.test(rawTitle)) {
            return `US$ ${numericVal.toFixed(2)} de Descuento en tu Primer Consumo`;
          }
        }
        return rawTitle || (welcomeCouponType === 'PERCENT' ? `${numericVal}% de Descuento en tu Primer Consumo` : 'Descuento de Bienvenida');
      })(),
      welcomeCouponValue: parseFloat(welcomeCouponValue) || 0,
      welcomeCouponType: welcomeCouponType,
      hasConfiguredCard: true,
      cardConfiguredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await saveStore(updatedStore);
      try {
        localStorage.setItem(`fidely_card_configured_${store.id}`, 'true');
        localStorage.setItem(`fidely_welcome_dismissed_${store.id}`, 'true');
      } catch (e) { }
      if (setStores) {
        setStores(prev => prev.map(s => (s.id === store.id ? updatedStore : s)));
      }
      if (onNotify) onNotify(`¡Tarjeta de fidelidad y perfil de "${updatedStore.name}" guardados con éxito!`, 'success');
      setIsSaving(false);
      onClose();
    } catch (err) {
      console.error('Error saving store profile:', err);
      setIsSaving(false);
      if (onNotify) onNotify('Error al guardar cambios en el perfil de la tienda', 'error');
    }
  };

  // Generate category gradient fallback
  const initials = (name || 'FC').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();

  // Plantillas prediseñadas estilo Canva (1 clic aplica colores, sello, regla y patrón)
  const PREDEFINED_TEMPLATES = [
    {
      id: 'cafe_artisan',
      name: 'Café & Panadería',
      category: 'Cafetería / Bakery',
      cardColor: '#451A03',
      cardGradient: '#854D0E',
      stampIcon: 'coffee',
      stampsTarget: 8,
      rewardTitle: '1 Café de Especialidad + Croissant Gratis',
      stampRewards: [
        { id: 'ca_1', stamps: 4, title: '1 Café Espresso o Americano', icon: '☕' },
        { id: 'ca_2', stamps: 8, title: '1 Café de Especialidad + Croissant', icon: '🥐' },
        { id: 'ca_3', stamps: 12, title: 'Desayuno VIP con Jugo Natural', icon: '🥪' }
      ],
      stampCondition: '1 sello por cada café o postre consumido',
      pattern: 'radial',
      badge: 'Popular ☕'
    },
    {
      id: 'barber_gentleman',
      name: 'Barbería Gentleman',
      category: 'Barbería / Estilo',
      cardColor: '#18181B',
      cardGradient: '#3F3F46',
      stampIcon: 'scissors',
      stampsTarget: 6,
      rewardTitle: 'Corte de Cabello + Barba Gratis',
      stampRewards: [
        { id: 'bg_1', stamps: 3, title: 'Lavado y Perfilado de Barba', icon: '💈' },
        { id: 'bg_2', stamps: 6, title: 'Corte de Cabello Clásico', icon: '✂️' },
        { id: 'bg_3', stamps: 10, title: 'Corte VIP + Barba + Mascarilla Black', icon: '👑' }
      ],
      stampCondition: '1 sello por cada servicio de barbería',
      pattern: 'mesh',
      badge: 'Clásico ✂️'
    },
    {
      id: 'pet_friends',
      name: 'Mundo Mascotas',
      category: 'Veterinaria & Pet Shop',
      cardColor: '#B45309',
      cardGradient: '#F59E0B',
      stampIcon: 'paw',
      stampsTarget: 8,
      rewardTitle: '1 Baño Gratis o Snack Premium',
      stampRewards: [
        { id: 'pf_1', stamps: 4, title: '1 Snack Dental Premium', icon: '🐾' },
        { id: 'pf_2', stamps: 8, title: '1 Baño Gratis o Snack Premium', icon: '✨' }
      ],
      stampCondition: '1 sello por compras mayores a $15',
      pattern: 'dots',
      badge: 'Pets 🐾'
    },
    {
      id: 'coquette_boutique',
      name: 'Boutique Coquette',
      category: 'Moda / Spa / Belleza',
      cardColor: '#BE185D',
      cardGradient: '#F472B6',
      stampIcon: 'heart',
      stampsTarget: 8,
      rewardTitle: '20% OFF en tu prenda favorita o manicura',
      stampRewards: [
        { id: 'cb_1', stamps: 4, title: '1 Accesorio o Aretes de Regalo', icon: '✨' },
        { id: 'cb_2', stamps: 8, title: '20% OFF en tu prenda favorita o manicura', icon: '💖' }
      ],
      stampCondition: '1 sello por cada visita de compra',
      pattern: 'dots',
      badge: 'Chic 💖'
    },
    {
      id: 'organic_kitchen',
      name: 'Cocina Verde & Salud',
      category: 'Restaurante Saludable',
      cardColor: '#14532D',
      cardGradient: '#22C55E',
      stampIcon: 'flower',
      stampsTarget: 6,
      rewardTitle: '1 Bowl Saludable o Jugo Detox Gratis',
      stampRewards: [
        { id: 'ok_1', stamps: 3, title: '1 Jugo Detox o Té Especial', icon: '🥤' },
        { id: 'ok_2', stamps: 6, title: '1 Bowl Saludable Completo', icon: '🌿' }
      ],
      stampCondition: '1 sello por cada almuerzo o bowl',
      pattern: 'lines',
      badge: 'Organic 🌿'
    },
    {
      id: 'burger_grill',
      name: 'Burger & Street Food',
      category: 'Hamburguesas & Grill',
      cardColor: '#991B1B',
      cardGradient: '#EA580C',
      stampIcon: 'flame',
      stampsTarget: 8,
      rewardTitle: '1 Burger Especial + Papas Gratis',
      stampRewards: [
        { id: 'bug_1', stamps: 4, title: '1 Ración de Papas Especiales', icon: '🍟' },
        { id: 'bug_2', stamps: 8, title: '1 Burger Especial + Papas Gratis', icon: '🍔' }
      ],
      stampCondition: '1 sello por combo o burger consumida',
      pattern: 'radial',
      badge: 'Hot 🔥'
    },
    {
      id: 'auto_mechanic',
      name: 'Taller & Autolavado',
      category: 'Automotriz / Car Wash',
      cardColor: '#1E3A8A',
      cardGradient: '#0284C7',
      stampIcon: 'wrench',
      stampsTarget: 6,
      rewardTitle: '1 Lavado Completo + Cera Gratis',
      stampRewards: [
        { id: 'am_1', stamps: 3, title: '1 Aspirado y Ambientador Premium', icon: '✨' },
        { id: 'am_2', stamps: 6, title: '1 Lavado Completo + Cera Gratis', icon: '🚗' }
      ],
      stampCondition: '1 sello por servicio de lavado o afinación',
      pattern: 'mesh',
      badge: 'Auto 🚗'
    },
    {
      id: 'luxury_vip',
      name: 'Joyería & VIP Club',
      category: 'Lujo / Joyería / Relojería',
      cardColor: '#09090B',
      cardGradient: '#D97706',
      stampIcon: 'crown',
      stampsTarget: 10,
      rewardTitle: 'Bono de $50 USD en tu próxima joya',
      stampRewards: [
        { id: 'lv_1', stamps: 5, title: 'Limpieza y Pulitura de Joyas Gratis', icon: '✨' },
        { id: 'lv_2', stamps: 10, title: 'Bono de $50 USD en tu próxima joya', icon: '👑' }
      ],
      stampCondition: '1 sello por compras mayores a $30',
      pattern: 'mesh',
      badge: 'VIP 👑'
    },
    {
      id: 'retro_vintage',
      name: 'Retro 70s Pop',
      category: 'Heladería / Diner / Retro',
      cardColor: '#C2410C',
      cardGradient: '#F59E0B',
      stampIcon: 'sparkle',
      stampsTarget: 8,
      rewardTitle: '1 Helado Doble o Milkshake Gratis',
      stampRewards: [
        { id: 'rv_1', stamps: 4, title: '1 Cono Sencillo o Topping Extra', icon: '🍦' },
        { id: 'rv_2', stamps: 8, title: '1 Helado Doble o Milkshake Gratis', icon: '🍨' }
      ],
      stampCondition: '1 sello por cada visita de consumo',
      pattern: 'radial',
      badge: 'Retro ✨'
    },
    {
      id: 'fashion_minimal',
      name: 'Studio Moda Minimal',
      category: 'Boutique / Calzado',
      cardColor: '#78350F',
      cardGradient: '#A8A29E',
      stampIcon: 'shopping-bag',
      stampsTarget: 6,
      rewardTitle: '15% de Descuento en Calzado o Bolso',
      stampRewards: [
        { id: 'fm_1', stamps: 3, title: '1 Pañuelo o Accesorio de Moda', icon: '🛍️' },
        { id: 'fm_2', stamps: 6, title: '15% de Descuento en Calzado o Bolso', icon: '👗' }
      ],
      stampCondition: '1 sello por compra en tienda',
      pattern: 'lines',
      badge: 'Minimal 🛍️'
    }
  ];

  const handleApplyTemplate = (tmpl) => {
    setCardColor(tmpl.cardColor);
    setCardGradient(tmpl.cardGradient);
    setStampIcon(tmpl.stampIcon);
    if (tmpl.stampRewards && tmpl.stampRewards.length > 0) {
      setStampRewards(tmpl.stampRewards);
      const maxStamps = Math.max(...tmpl.stampRewards.map(r => Number(r.stamps)));
      setStampsTarget(maxStamps);
      setRewardTitle(tmpl.stampRewards[tmpl.stampRewards.length - 1].title);
    } else {
      setStampsTarget(tmpl.stampsTarget);
      setRewardTitle(tmpl.rewardTitle);
      setStampRewards([
        { id: `rew_${tmpl.id}_1`, stamps: tmpl.stampsTarget, title: tmpl.rewardTitle, icon: '🎁' }
      ]);
    }
    setStampCondition(tmpl.stampCondition);
    setCardPattern(tmpl.pattern || 'dots');
    setSelectedTemplateId(tmpl.id);
    if (onNotify) onNotify(`¡Plantilla "${tmpl.name}" aplicada!`, 'success');
  };

  const handleAddStampReward = (e) => {
    if (e) e.preventDefault();
    if (!newRewardTitle.trim()) {
      if (onNotify) onNotify('Por favor escribe el nombre del premio.', 'warning');
      return;
    }
    const reqStamps = Math.max(1, parseInt(newRewardStamps, 10) || 1);

    let updated;
    if (editingRewardId) {
      // Editar hito existente en la cartilla
      updated = stampRewards.map(r => {
        if (r.id === editingRewardId) {
          return {
            ...r,
            stamps: reqStamps,
            title: newRewardTitle.trim(),
            icon: newRewardIcon || '🎁'
          };
        }
        return r;
      });
      setEditingRewardId(null);
    } else {
      // Si ya existe premio con este número exacto de sellos, se actualiza
      const existingIndex = stampRewards.findIndex(r => Number(r.stamps) === reqStamps);
      if (existingIndex >= 0) {
        updated = [...stampRewards];
        updated[existingIndex] = {
          ...updated[existingIndex],
          title: newRewardTitle.trim(),
          icon: newRewardIcon || '🎁'
        };
      } else {
        const newReward = {
          id: `rew_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          stamps: reqStamps,
          title: newRewardTitle.trim(),
          icon: newRewardIcon || '🎁'
        };
        updated = [...stampRewards, newReward];
      }
    }

    updated.sort((a, b) => Number(a.stamps) - Number(b.stamps));
    setStampRewards(updated);

    const maxStamps = Math.max(...updated.map(r => Number(r.stamps)), 6);
    setStampsTarget(maxStamps);
    setRewardTitle(updated[updated.length - 1]?.title || newRewardTitle.trim());

    setNewRewardTitle('');
    setShowAddRewardForm(false);
    if (onNotify) onNotify(`¡Hito / premio guardado con éxito (${reqStamps} sellos)!`, 'success');
  };

  const handleDeleteStampReward = (idToDelete, indexToDelete) => {
    // Permite eliminar CUALQUIER hito (incluso los predefinidos o el único restante)
    const updated = stampRewards.filter((r, idx) => {
      if (idToDelete && r.id) return r.id !== idToDelete;
      return idx !== indexToDelete;
    });
    setStampRewards(updated);
    if (updated.length > 0) {
      const maxStamps = Math.max(...updated.map(r => Number(r.stamps)), 6);
      setStampsTarget(maxStamps);
      setRewardTitle(updated[updated.length - 1]?.title || 'Premio de Fidelidad');
    } else {
      setRewardTitle('');
    }
    if (editingRewardId === idToDelete) {
      setEditingRewardId(null);
      setShowAddRewardForm(false);
    }
    if (onNotify) onNotify('Hito eliminado de la cartilla.', 'info');
  };

  const handleClearAllStampRewards = () => {
    setStampRewards([]);
    setEditingRewardId(null);
    setShowAddRewardForm(true);
    setNewRewardStamps(6);
    setNewRewardTitle('');
    setNewRewardIcon('🎁');
    if (onNotify) onNotify('Se eliminaron todos los hitos predefinidos. Ahora puedes crear los tuyos propios.', 'info');
  };

  const getPatternStyle = (pattern) => {
    switch (pattern) {
      case 'dots':
        return {
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.22) 1.5px, transparent 1.5px)',
          backgroundSize: '16px 16px'
        };
      case 'lines':
        return {
          backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.06), rgba(255,255,255,0.06) 10px, transparent 10px, transparent 20px)'
        };
      case 'mesh':
        return {
          backgroundImage: 'radial-gradient(at 10% 20%, rgba(255,255,255,0.2) 0px, transparent 50%), radial-gradient(at 90% 80%, rgba(0,0,0,0.25) 0px, transparent 50%)'
        };
      case 'none':
        return {};
      case 'radial':
      default:
        return {
          backgroundImage: 'radial-gradient(circle at top right, rgba(255,255,255,0.28) 0%, transparent 65%)'
        };
    }
  };

  // Paletas de color elegantes para la tarjeta digital (Por defecto siempre oscura / Obsidian VIP)
  const CARD_PALETTES = [
    { name: 'Negro Obsidiana VIP', primary: '#18181B', gradient: '#090D16' },
    { name: 'Borgoña Fideli', primary: '#9C382A', gradient: '#DE8B76' },
    { name: 'Oro Imperial', primary: '#92400E', gradient: '#F59E0B' },
    { name: 'Esmeralda Lujo', primary: '#065F46', gradient: '#10B981' },
    { name: 'Zafiro Real', primary: '#1E3A8A', gradient: '#3B82F6' },
    { name: 'Ciruela Glam', primary: '#701A75', gradient: '#D946EF' },
    { name: 'Café & Chocolate', primary: '#451A03', gradient: '#92400E' },
    { name: 'Carmesí & Naranja', primary: '#991B1B', gradient: '#EA580C' },
    { name: 'Rosa Coquette', primary: '#BE185D', gradient: '#F472B6' },
  ];

  // Iconos disponibles para el sello
  const STAMP_ICON_OPTIONS = [
    { id: 'star', label: 'Estrella', Icon: Star },
    { id: 'scissors', label: 'Barbería', Icon: Scissors },
    { id: 'coffee', label: 'Café', Icon: Coffee },
    { id: 'paw', label: 'Mascotas', Icon: PawPrint },
    { id: 'heart', label: 'Belleza', Icon: Heart },
    { id: 'flower', label: 'Orgánico', Icon: Flower2 },
    { id: 'flame', label: 'Comida/Grill', Icon: Flame },
    { id: 'wrench', label: 'Taller/Auto', Icon: Wrench },
    { id: 'crown', label: 'VIP / Lujo', Icon: Crown },
    { id: 'gem', label: 'Joyería', Icon: Gem },
    { id: 'sparkle', label: 'Destello', Icon: Sparkles },
    { id: 'shopping-bag', label: 'Moda', Icon: ShoppingBag },
    { id: 'utensils', label: 'Restaurante', Icon: Utensils },
  ];

  const renderStampIcon = (id, size = 16, color = '#FFFFFF') => {
    switch (id) {
      case 'scissors': return <Scissors size={size} color={color} />;
      case 'coffee': return <Coffee size={size} color={color} />;
      case 'paw': case 'pets': return <PawPrint size={size} color={color} />;
      case 'heart': return <Heart size={size} color={color} />;
      case 'flower': case 'rose': return <Flower2 size={size} color={color} />;
      case 'flame': case 'fire': return <Flame size={size} color={color} />;
      case 'wrench': case 'tool': return <Wrench size={size} color={color} />;
      case 'utensils': return <Utensils size={size} color={color} />;
      case 'shopping-bag': return <ShoppingBag size={size} color={color} />;
      case 'gem': return <Gem size={size} color={color} />;
      case 'crown': return <Crown size={size} color={color} />;
      case 'sparkle': case 'sparkles': return <Sparkles size={size} color={color} />;
      case 'star':
      default:
        return <Star size={size} color={color} />;
    }
  };

  if (!isOpen || !store) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 9999,
        background: 'rgba(12, 10, 9, 0.76)',
        backdropFilter: 'blur(10px)',
        padding: 'min(24px, 3vw)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '1100px',
          width: '100%',
          borderRadius: '24px',
          background: '#FFFFFF',
          border: '1px solid #EDE2D5',
          boxShadow: '0 28px 70px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px min(26px, 4vw)',
          borderBottom: '1px solid #EDE2D5',
          background: '#FAF8F5'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #DE8B76 0%, #9C382A 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(156, 56, 42, 0.25)'
            }}>
              <Store size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 850, color: 'var(--text-main)', letterSpacing: '-0.025em' }}>
                Perfil & Logo de la Tienda
              </h3>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Configuración visual y comercial oficial en el Directorio fidely CLUB
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (isMandatoryFirstTime && !store?.hasConfiguredCard) {
                if (onNotify) onNotify('Debes guardar la configuración de tu tarjeta de fidelidad antes de comenzar a operar.', 'warning');
                return;
              }
              onClose();
            }}
            title={isMandatoryFirstTime ? "Completa la configuración para comenzar" : "Cerrar ventana (X)"}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              border: '1.5px solid #E5E7EB',
              background: '#FFFFFF',
              cursor: 'pointer',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#FEE2E2';
              e.currentTarget.style.color = '#DC2626';
              e.currentTarget.style.borderColor = '#FCA5A5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FFFFFF';
              e.currentTarget.style.color = '#374151';
              e.currentTarget.style.borderColor = '#E5E7EB';
            }}
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* BANNER OBLIGATORIO DE PRIMERA VEZ */}
        {isMandatoryFirstTime && (
          <div style={{
            background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
            borderBottom: '2px solid #F59E0B',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#F59E0B',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              flexShrink: 0
            }}>
              🎯
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 900, color: '#92400E' }}>
                ¡Paso 1 Obligatorio: Configura tu Tarjeta de Fidelidad!
              </div>
              <div style={{ fontSize: '0.72rem', color: '#B45309', marginTop: '2px', lineHeight: 1.35 }}>
                Para comenzar a recibir clientes y otorgar sellos en tu mostrador, define tus colores, meta de sellos y premios. Puedes eliminar los hitos de ejemplo y agregar los tuyos.
              </div>
            </div>
          </div>
        )}

        {/* Sub-Tabs de Navegación del Modal */}
        <div style={{
          display: 'flex',
          gap: '6px',
          padding: '8px min(16px, 3vw)',
          background: '#F8F6F2',
          borderBottom: '1px solid #EEDCD5',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          {[
            { id: 'PROFILE', label: '1. Datos & Logo', icon: Store },
            { id: 'STAMPS', label: '2. Tarjeta & Premios', icon: Sparkles },
            { id: 'LOCATION', label: '3. GPS & Avisos', icon: MapPin }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeModalTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveModalTab(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  border: isActive ? '1.5px solid var(--c-primary)' : '1px solid #EDE2D5',
                  background: isActive ? 'var(--c-primary)' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : 'var(--text-main)',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 2px 8px rgba(156, 56, 42, 0.2)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={13} color={isActive ? '#FFFFFF' : 'var(--c-primary)'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <form onSubmit={handleSave} style={{ padding: '14px min(18px, 3.5vw)', overflowY: 'auto', flex: 1, minWidth: 0 }}>
          {/* TAB 1: DATOS BÁSICOS & LOGO */}
          {activeModalTab === 'PROFILE' && (
            <div>
              {/* Logo Upload Section */}
              <div style={{
                background: '#FAF8F5',
                border: '1.5px dashed #DE8B76',
                borderRadius: '18px',
                padding: '18px',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  Logo Oficial del Comercio <span style={{ color: '#DC2626' }}>* (Obligatorio)</span>
                </div>

                {/* Logo Preview */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '18px', marginBottom: '14px' }}>
                  <div style={{
                    width: '74px',
                    height: '74px',
                    borderRadius: '18px',
                    overflow: 'hidden',
                    background: logo ? '#FFFFFF' : 'linear-gradient(135deg, #DE8B76 0%, #9C382A 100%)',
                    border: '2px solid #EEDCD5',
                    boxShadow: '0 6px 18px rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {logo ? (
                      <img
                        src={logo}
                        alt={name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.04em' }}>
                        {initials}
                      </span>
                    )}
                  </div>

                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {name || 'Tu Tienda'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--c-primary)', fontWeight: 700, marginTop: '2px' }}>
                      {category}
                    </div>
                    {logo ? (
                      <button
                        type="button"
                        onClick={() => setLogo('')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#DC2626',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 0',
                          marginTop: '4px'
                        }}
                      >
                        <Trash2 size={12} />
                        <span>Eliminar logo</span>
                      </button>
                    ) : (
                      <div style={{ fontSize: '0.72rem', color: '#DC2626', fontWeight: 800, marginTop: '2px', background: '#FEE2E2', padding: '3px 8px', borderRadius: '6px' }}>
                        ⚠️ Logo obligatorio para operar
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload Buttons */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <label style={{
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--c-primary)',
                    color: '#FFFFFF',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    boxShadow: '0 4px 12px rgba(156, 56, 42, 0.25)'
                  }}>
                    <Upload size={14} />
                    <span>Subir Logo (PNG/JPG)</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp, image/svg+xml"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>

                {/* URL Input alternative */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                  <input
                    type="url"
                    placeholder="O pegar URL de imagen: https://..."
                    value={logoUrlInput}
                    onChange={(e) => setLogoUrlInput(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: '7px 10px',
                      borderRadius: '10px',
                      border: '1px solid #EEDCD5',
                      fontSize: '0.74rem',
                      outline: 'none',
                      background: '#FFFFFF'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleApplyLogoUrl}
                    className="btn btn-secondary"
                    style={{ padding: '7px 12px', fontSize: '0.74rem', fontWeight: 700 }}
                  >
                    Aplicar
                  </button>
                </div>
              </div>

              {/* Form Fields Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Nombre del Comercio *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #EEDCD5', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Categoría Comercial *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #EEDCD5', fontSize: '0.82rem', fontWeight: 700 }}
                  >
                    <option value="Barbería / Peluquería">💈 Barbería / Peluquería</option>
                    <option value="Panadería & Pastelería">🥖 Panadería & Pastelería</option>
                    <option value="Gimnasio & Fitness">🏋️ Gimnasio & Fitness</option>
                    <option value="Boutique / Ropa & Moda">👗 Boutique / Ropa & Moda</option>
                    <option value="Calzado / Zapatos">👟 Calzado / Zapatos</option>
                    <option value="Restaurante / Gastronomía">🍽️ Restaurante / Gastronomía</option>
                    <option value="Café & Heladería">☕ Café & Heladería</option>
                    <option value="Comida Rápida & Snacks">🍔 Comida Rápida & Snacks</option>
                    <option value="Supermercado / Alimentos">🛒 Supermercado / Alimentos</option>
                    <option value="Farmacia / Salud">💊 Farmacia / Salud</option>
                    <option value="Belleza / Cosmética">💄 Belleza / Cosmética</option>
                    <option value="Electrónica / Tecnología">📱 Electrónica / Tecnología</option>
                    <option value="Suplementos de Gym / Fitness">🥤 Suplementos / Nutrición</option>
                    <option value="Mascotas & Veterinaria">🐾 Mascotas & Veterinaria</option>
                    <option value="Taller Mecánico & Autolavado">🚗 Taller & Autolavado</option>
                    <option value="Hogar / Muebles">🏠 Hogar / Muebles</option>
                    <option value="Ferretería & Construcción">🔧 Ferretería & Construcción</option>
                    <option value="Librería & Papelería">📚 Librería & Papelería</option>
                    <option value="Joyería & Accesorios">✨ Joyería & Accesorios</option>
                    <option value="Otro Comercio">🏬 Otro Comercio Aliado</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Ciudad *
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #EEDCD5', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Dirección del Local
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ej. C.C. Tolón, Nivel PB, Local 12"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #EEDCD5', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '12px', marginBottom: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Encargado / Cajero Principal
                  </label>
                  <input
                    type="text"
                    value={manager}
                    onChange={(e) => setManager(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #EEDCD5', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Teléfono de Contacto <span style={{ color: '#DC2626' }}>* (Obligatorio)</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej. 0412 1234567"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: !phone.trim() ? '1.5px solid #EF4444' : '1px solid #EEDCD5',
                      fontSize: '0.84rem'
                    }}
                  />
                  {!phone.trim() && (
                    <div style={{ fontSize: '0.70rem', color: '#DC2626', fontWeight: 700, marginTop: '3px' }}>
                      ⚠️ Teléfono obligatorio para la tienda y atención a clientes
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DISEÑO DE TARJETA & CARTILLA DE SELLOS */}
          {activeModalTab === 'STAMPS' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 430px), 1fr))',
              gap: '24px',
              alignItems: 'start'
            }}>
              {/* COLUMNA IZQUIERDA: LIVE PREVIEW STICKY */}
              <div style={{
                position: 'sticky',
                top: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--c-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={15} />
                    <span>Vista Previa en Vivo de la Cartilla</span>
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: '#FAF8F5', padding: '3px 9px', borderRadius: '999px', border: '1px solid #EEDCD5', fontWeight: 700 }}>
                    Así la verán tus clientes
                  </span>
                </div>

                {/* 1. PREVISUALIZACIÓN DE LA TARJETA DIGITAL */}
                <div style={{
                  background: `linear-gradient(135deg, ${cardColor} 0%, ${cardGradient} 100%)`,
                  borderRadius: '18px',
                  padding: '16px 14px',
                  color: '#FFFFFF',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.25)',
                  boxSizing: 'border-box',
                  maxWidth: '100%'
                }}>
                  {/* Patrón decorativo geométrico */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    ...getPatternStyle(cardPattern)
                  }} />

                  {/* Textura o imagen de fondo opcional */}
                  {cardBackgroundImage && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: `url(${cardBackgroundImage})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      opacity: 0.32,
                      pointerEvents: 'none'
                    }} />
                  )}

                  {/* Cabecera de la tarjeta: Logo + Nombre + Chip */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        background: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                        flexShrink: 0
                      }}>
                        {logo ? (
                          <img src={logo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '0.95rem', fontWeight: 900, color: cardColor }}>
                            {initials}
                          </span>
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 900, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {name || 'Tu Comercio'}
                        </div>
                        <div style={{ fontSize: '0.68rem', opacity: 0.9, fontWeight: 600 }}>
                          {category}
                        </div>
                      </div>
                    </div>

                    <span style={{
                      background: 'rgba(255,255,255,0.22)',
                      backdropFilter: 'blur(8px)',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '0.62rem',
                      fontWeight: 900,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      flexShrink: 0
                    }}>
                      Cartilla Digital
                    </span>
                  </div>

                  {/* Premios de la Cartilla (Multi-Hitos) */}
                  <div style={{
                    background: 'rgba(0,0,0,0.22)',
                    backdropFilter: 'blur(6px)',
                    borderRadius: '12px',
                    padding: '8px 10px',
                    marginBottom: '10px',
                    position: 'relative',
                    zIndex: 1
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.70rem', fontWeight: 800 }}>
                        <Award size={14} color="#FDE047" />
                        <span>Premios de tu Tarjeta ({stampRewards.length}):</span>
                      </div>
                      <span style={{ fontSize: '0.58rem', opacity: 0.85, background: 'rgba(255,255,255,0.18)', padding: '2px 5px', borderRadius: '4px', fontWeight: 800 }}>
                        El cliente elige
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      {stampRewards.map((rew, i) => (
                        <span key={rew.id || i} style={{
                          background: 'rgba(255,255,255,0.16)',
                          borderRadius: '6px',
                          padding: '2px 6px',
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          border: '1px solid rgba(255,255,255,0.2)'
                        }}>
                          <span>{rew.icon || '🎁'}</span>
                          <strong style={{ color: '#FDE047' }}>{rew.stamps} sellos:</strong>
                          <span>{rew.title}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Casillas de Sellos en Cuadrícula Fluida */}
                  <div style={{ marginBottom: '8px', position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: '0.66rem', opacity: 0.85, fontWeight: 700, marginBottom: '6px' }}>
                      Simulación ({Math.min(3, stampsTarget)} de {stampsTarget} sellos completados):
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(32px, 1fr))',
                      gap: '6px',
                      maxWidth: '100%'
                    }}>
                      {Array.from({ length: stampsTarget }).map((_, idx) => {
                        const isStamped = idx < Math.min(3, stampsTarget);
                        const matchingReward = stampRewards.find(r => Number(r.stamps) === (idx + 1));
                        return (
                          <div
                            key={idx}
                            style={{
                              height: '34px',
                              borderRadius: '50%',
                              background: isStamped ? '#FFFFFF' : 'rgba(255,255,255,0.15)',
                              border: matchingReward
                                ? '2px solid #FDE047'
                                : `1.5px solid ${isStamped ? '#FFFFFF' : 'rgba(255,255,255,0.38)'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                              boxShadow: matchingReward ? '0 0 8px rgba(253, 224, 71, 0.4)' : 'none'
                            }}
                            title={matchingReward ? `${matchingReward.stamps} sellos = ${matchingReward.title}` : `Sello ${idx + 1}`}
                          >
                            {matchingReward && (
                              <span style={{
                                position: 'absolute',
                                top: '-6px',
                                right: '-4px',
                                fontSize: '10px'
                              }}>
                                {matchingReward.icon || '🎁'}
                              </span>
                            )}
                            {isStamped ? (
                              renderStampIcon(stampIcon, 15, cardColor)
                            ) : (
                              <span style={{ fontSize: '0.68rem', opacity: 0.75, fontWeight: 800 }}>
                                {idx + 1}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pie de la tarjeta: Regla */}
                  <div style={{ fontSize: '0.66rem', opacity: 0.9, borderTop: '1px solid rgba(255,255,255,0.22)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%' }}>
                      📌 {stampCondition || '1 sello por cada compra elegible'}
                    </span>
                    <span style={{ opacity: 0.75, flexShrink: 0 }}>fidely CLUB</span>
                  </div>
                </div>

                {/* Helper Card */}
                <div style={{
                  background: '#FAF8F5',
                  border: '1px solid #EEDCD5',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  fontSize: '0.74rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.45,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <Award size={20} color="var(--c-primary)" style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>Diseño 100% reactivo:</strong> Cualquier cambio de color, plantilla, icono o meta que edites a la derecha se refleja al instante aquí.
                  </div>
                </div>
              </div>

              {/* COLUMNA DERECHA: HERRAMIENTAS Y CONTROLES DE PERSONALIZACIÓN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>

                {/* 2. ESTILOS PREDISEÑADOS (1 CLIC) */}
                <div style={{ background: '#FAF8F5', border: '1px solid #EEDCD5', borderRadius: '14px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '5px', margin: 0 }}>
                      <Layers size={13} color="var(--c-primary)" />
                      <span>Estilos Prediseñados (1 Clic)</span>
                    </label>
                    <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>
                      Conserva tu logo y nombre
                    </span>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 120px), 1fr))',
                    gap: '8px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    padding: '2px'
                  }}>
                    {PREDEFINED_TEMPLATES.map(tmpl => {
                      const isSelected = selectedTemplateId === tmpl.id || (cardColor === tmpl.cardColor && cardGradient === tmpl.cardGradient && stampIcon === tmpl.stampIcon);
                      return (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => handleApplyTemplate(tmpl)}
                          style={{
                            borderRadius: '10px',
                            border: isSelected ? '2px solid var(--c-primary)' : '1px solid #E5E7EB',
                            background: `linear-gradient(135deg, ${tmpl.cardColor} 0%, ${tmpl.cardGradient} 100%)`,
                            color: '#FFFFFF',
                            padding: '8px 7px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            minHeight: '66px',
                            overflow: 'hidden'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '2px' }}>
                            <span style={{ fontSize: '0.54rem', background: 'rgba(255,255,255,0.25)', padding: '1px 4px', borderRadius: '4px', fontWeight: 800 }}>
                              {tmpl.badge}
                            </span>
                            {isSelected && <CheckCircle2 size={12} color="#FFFFFF" />}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.70rem', fontWeight: 900, lineHeight: 1.2 }}>
                              {tmpl.name}
                            </div>
                            <div style={{ fontSize: '0.58rem', opacity: 0.85, marginTop: '1px' }}>
                              {tmpl.stampsTarget} sellos
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. PERSONALIZACIÓN DE COLORES, PATRÓN Y SELLO */}
                <div style={{ background: '#FAF8F5', border: '1px solid #EEDCD5', borderRadius: '14px', padding: '12px' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Palette size={13} color="var(--c-primary)" />
                    <span>Colores Corporativos & Icono de Sellado</span>
                  </div>

                  {/* Paletas de Colores */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {CARD_PALETTES.map(p => {
                      const isSelected = cardColor === p.primary && cardGradient === p.gradient;
                      return (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => {
                            setCardColor(p.primary);
                            setCardGradient(p.gradient);
                          }}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '8px',
                            border: isSelected ? '1.5px solid var(--c-primary)' : '1px solid #EEDCD5',
                            background: '#FFFFFF',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <div style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${p.primary} 0%, ${p.gradient} 100%)`
                          }} />
                          <span style={{ fontSize: '0.68rem', fontWeight: isSelected ? 800 : 600, color: isSelected ? 'var(--c-primary)' : 'var(--text-main)' }}>
                            {p.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Colores HEX */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', background: '#FFFFFF', padding: '6px 10px', borderRadius: '10px', border: '1px solid #EEDCD5', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)' }}>Color 1:</label>
                      <input
                        type="color"
                        value={cardColor}
                        onChange={(e) => setCardColor(e.target.value)}
                        style={{ width: '24px', height: '24px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: 'none' }}
                      />
                      <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 700 }}>{cardColor}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)' }}>Color 2:</label>
                      <input
                        type="color"
                        value={cardGradient}
                        onChange={(e) => setCardGradient(e.target.value)}
                        style={{ width: '24px', height: '24px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: 'none' }}
                      />
                      <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 700 }}>{cardGradient}</span>
                    </div>
                  </div>

                  {/* Iconos del Sello */}
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '5px' }}>
                      Icono a Estampar en Cada Visita:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: '5px' }}>
                      {STAMP_ICON_OPTIONS.map(opt => {
                        const isSelected = stampIcon === opt.id;
                        const IconComp = opt.Icon;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setStampIcon(opt.id)}
                            style={{
                              padding: '6px 4px',
                              borderRadius: '8px',
                              border: isSelected ? '1.5px solid var(--c-primary)' : '1px solid #EEDCD5',
                              background: isSelected ? 'rgba(222, 139, 118, 0.12)' : '#FFFFFF',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '3px',
                              justifyContent: 'center'
                            }}
                          >
                            <IconComp size={15} color={isSelected ? 'var(--c-primary)' : '#78716C'} />
                            <span style={{ fontSize: '0.64rem', fontWeight: isSelected ? 800 : 600, color: isSelected ? 'var(--c-primary)' : 'var(--text-main)', textAlign: 'center', lineHeight: 1.1 }}>
                              {opt.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Textura o Fondo Canva */}
                  <div style={{ background: '#FFFFFF', border: '1px solid #EEDCD5', borderRadius: '10px', padding: '8px 10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Image size={12} color="var(--c-primary)" /> Fondo de Canva (Opcional)
                      </span>
                      {cardBackgroundImage && (
                        <button
                          type="button"
                          onClick={() => setCardBackgroundImage('')}
                          style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: '0.66rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          ✕ Quitar fondo
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <label style={{
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '5px 10px',
                        borderRadius: '8px',
                        background: '#FAF8F5',
                        border: '1px dashed #DE8B76',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: 'var(--c-primary)',
                        flexShrink: 0
                      }}>
                        <Upload size={12} />
                        <span>Subir</span>
                        <input type="file" accept="image/*" onChange={handleCardBgUpload} style={{ display: 'none' }} />
                      </label>
                      <input
                        type="url"
                        value={cardBgUrlInput}
                        onChange={(e) => setCardBgUrlInput(e.target.value)}
                        placeholder="O URL de imagen (https://...)"
                        style={{ flex: 1, minWidth: 0, padding: '5px 8px', borderRadius: '8px', border: '1px solid #EEDCD5', fontSize: '0.70rem', background: '#FAF8F5' }}
                      />
                      <button
                        type="button"
                        onClick={handleApplyCardBgUrl}
                        disabled={!cardBgUrlInput.trim()}
                        className="btn btn-secondary"
                        style={{ padding: '5px 8px', fontSize: '0.68rem', fontWeight: 700 }}
                      >
                        OK
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. PREMIOS ESCALONADOS DE LA CARTILLA */}
                <div style={{ background: '#FAF8F5', border: '1.5px solid #EEDCD5', borderRadius: '14px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                        <Gift size={14} color="var(--c-primary)" />
                        <span>Premios por Sellos (Hitos Escalonados)</span>
                      </label>
                      <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                        Define qué gana tu cliente al acumular sellos en tu comercio. Puedes eliminar y editar cualquier hito.
                      </div>
                    </div>
                    {!showAddRewardForm && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {stampRewards.length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearAllStampRewards}
                            style={{
                              background: '#FEE2E2',
                              color: '#DC2626',
                              border: '1px solid #FCA5A5',
                              borderRadius: '8px',
                              padding: '5px 8px',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Eliminar todos los hitos y empezar de cero con tus propios premios"
                          >
                            <Trash2 size={11} />
                            <span>Limpiar todos</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRewardId(null);
                            setNewRewardStamps(stampRewards.length > 0 ? (Math.max(...stampRewards.map(r => Number(r.stamps))) + 2) : 6);
                            setNewRewardTitle('');
                            setNewRewardIcon('🎁');
                            setShowAddRewardForm(true);
                          }}
                          style={{
                            background: 'var(--c-primary)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '5px 10px',
                            fontSize: '0.70rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Plus size={12} />
                          <span>+ Agregar Premio</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Formulario nuevo o editar premio */}
                  {showAddRewardForm && (
                    <div style={{ background: '#FFFFFF', border: '1.5px dashed var(--c-primary)', borderRadius: '10px', padding: '10px', marginBottom: '10px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--c-primary)', marginBottom: '6px' }}>
                        {editingRewardId ? '✏️ Editar Hito de la Cartilla' : '✨ Nuevo Hito / Premio en la Cartilla'}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 100px), 1fr))', gap: '6px', marginBottom: '6px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.64rem', fontWeight: 700, color: '#4B5563', marginBottom: '2px' }}>
                            Sellos requeridos *
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={newRewardStamps}
                            onChange={(e) => setNewRewardStamps(e.target.value)}
                            style={{ width: '100%', boxSizing: 'border-box', padding: '5px 7px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.78rem', fontWeight: 800 }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.64rem', fontWeight: 700, color: '#4B5563', marginBottom: '2px' }}>
                            Icono
                          </label>
                          <select
                            value={newRewardIcon}
                            onChange={(e) => setNewRewardIcon(e.target.value)}
                            style={{ width: '100%', boxSizing: 'border-box', padding: '5px 4px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.78rem' }}
                          >
                            <option value="🎁">🎁 Regalo</option>
                            <option value="💈">💈 Barber</option>
                            <option value="✂️">✂️ Tijeras</option>
                            <option value="☕">☕ Café</option>
                            <option value="🥐">🥐 Croissant</option>
                            <option value="🥪">🥪 Sándwich</option>
                            <option value="🍔">🍔 Burger</option>
                            <option value="🍕">🍕 Pizza</option>
                            <option value="🍦">🍦 Helado</option>
                            <option value="🥤">🥤 Batido</option>
                            <option value="👗">👗 Ropa</option>
                            <option value="👟">👟 Calzado</option>
                            <option value="💅">💅 Belleza</option>
                            <option value="🐾">🐾 Pets</option>
                            <option value="🚗">🚗 Auto</option>
                            <option value="👑">👑 VIP</option>
                            <option value="✨">✨ Especial</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <label style={{ display: 'block', fontSize: '0.64rem', fontWeight: 700, color: '#4B5563', marginBottom: '2px' }}>
                          Nombre del Premio / Producto *
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. Corte de Cabello, 1 Café, Hamburguesa Gratis..."
                          value={newRewardTitle}
                          onChange={(e) => setNewRewardTitle(e.target.value)}
                          style={{ width: '100%', boxSizing: 'border-box', padding: '5px 8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.78rem' }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddRewardForm(false);
                            setNewRewardTitle('');
                            setEditingRewardId(null);
                          }}
                          style={{ background: 'none', border: '1px solid #D1D5DB', borderRadius: '6px', padding: '4px 8px', fontSize: '0.70rem', cursor: 'pointer' }}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleAddStampReward}
                          style={{ background: 'var(--c-primary)', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '0.70rem', fontWeight: 800, cursor: 'pointer' }}
                        >
                          {editingRewardId ? 'Actualizar Hito' : 'Guardar Hito'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Lista de premios configurados */}
                  {stampRewards.length === 0 ? (
                    <div style={{
                      padding: '16px',
                      background: '#FFFBEB',
                      border: '1.5px dashed #FCD34D',
                      borderRadius: '10px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#92400E', marginBottom: '4px' }}>
                        ⚠️ No tienes ningún hito de premio configurado
                      </div>
                      <div style={{ fontSize: '0.70rem', color: '#B45309', marginBottom: '10px' }}>
                        Debes agregar al menos un hito (ej. 6 sellos = Premio Gratis) para que tus clientes puedan acumular sellos.
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRewardId(null);
                          setNewRewardStamps(6);
                          setNewRewardTitle('');
                          setNewRewardIcon('🎁');
                          setShowAddRewardForm(true);
                        }}
                        style={{
                          background: 'var(--c-primary)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '6px 14px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        + Crear mi Primer Hito
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {stampRewards.map((rew, index) => {
                        const isTopReward = index === stampRewards.length - 1;
                        return (
                          <div
                            key={rew.id || index}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '7px 10px',
                              background: '#FFFFFF',
                              border: isTopReward ? '1.5px solid #F59E0B' : '1px solid #E5E7EB',
                              borderRadius: '8px',
                              gap: '8px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                              <span style={{
                                background: isTopReward ? '#FEF3C7' : '#F3F4F6',
                                color: isTopReward ? '#B45309' : '#374151',
                                padding: '2px 6px',
                                borderRadius: '6px',
                                fontSize: '0.70rem',
                                fontWeight: 900,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                flexShrink: 0
                              }}>
                                <span>{rew.icon || '🎁'}</span>
                                <span>{rew.stamps} sellos</span>
                              </span>
                              <span style={{ fontSize: '0.76rem', color: 'var(--text-main)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {rew.title}
                              </span>
                              {isTopReward && (
                                <span style={{ fontSize: '0.60rem', background: '#FEF3C7', color: '#92400E', padding: '1px 5px', borderRadius: '4px', fontWeight: 800, flexShrink: 0 }}>
                                  👑 Mayor
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRewardId(rew.id || rew.stamps);
                                  setNewRewardStamps(rew.stamps);
                                  setNewRewardTitle(rew.title);
                                  setNewRewardIcon(rew.icon || '🎁');
                                  setShowAddRewardForm(true);
                                }}
                                title="Editar este hito"
                                style={{
                                  background: '#F3F4F6',
                                  border: '1px solid #E5E7EB',
                                  borderRadius: '6px',
                                  color: '#374151',
                                  cursor: 'pointer',
                                  padding: '4px 7px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontSize: '0.68rem',
                                  fontWeight: 700
                                }}
                              >
                                <Edit3 size={11} />
                                <span>Editar</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteStampReward(rew.id, index)}
                                title="Eliminar este hito de la tarjeta"
                                style={{
                                  background: '#FEE2E2',
                                  border: '1px solid #FECACA',
                                  borderRadius: '6px',
                                  color: '#DC2626',
                                  cursor: 'pointer',
                                  padding: '4px 7px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontSize: '0.68rem',
                                  fontWeight: 700
                                }}
                              >
                                <Trash2 size={11} />
                                <span>Eliminar</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* MONTO MÍNIMO DE COMPRA PARA GENERAR SELLO (DEFINIDO POR LA TIENDA) */}
                <div style={{ background: '#FAF8F5', border: '1.5px solid #EEDCD5', borderRadius: '14px', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                      <DollarSign size={14} color="var(--c-primary)" />
                      <span>Compra Mínima para Generar Sello en este Local</span>
                    </label>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--c-primary)', background: 'var(--c-secondary-soft)', padding: '2px 8px', borderRadius: '6px' }}>
                      US${parseFloat(minPurchaseForStamp || 0).toFixed(2)}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 8px 0', lineHeight: 1.35 }}>
                    Tú como tienda defines qué monto mínimo de factura acredita <strong>+1 sello</strong> a tus clientes. Las compras menores a este valor no generan sello.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', width: '130px' }}>
                      <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: 'var(--text-muted)', fontSize: '0.82rem' }}>US$</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={minPurchaseForStamp}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMinPurchaseForStamp(val);
                          if (val && parseFloat(val) > 0) {
                            setStampCondition(`1 sello por cada compra a partir de US${parseFloat(val).toFixed(2)}`);
                          }
                        }}
                        placeholder="Ej. 10.00"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px 8px 36px', borderRadius: '10px', border: '1px solid #EEDCD5', fontSize: '0.86rem', fontWeight: 800, background: '#FFFFFF' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {[1, 5, 10, 15, 20, 25].map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setMinPurchaseForStamp(preset);
                            setStampCondition(`1 sello por cada compra a partir de US${preset}.00`);
                          }}
                          style={{
                            padding: '5px 8px',
                            borderRadius: '8px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            border: parseFloat(minPurchaseForStamp) === preset ? '1.5px solid var(--c-primary)' : '1px solid #E5E7EB',
                            background: parseFloat(minPurchaseForStamp) === preset ? 'var(--c-secondary-soft)' : '#FFFFFF',
                            color: parseFloat(minPurchaseForStamp) === preset ? 'var(--c-primary)' : 'var(--text-muted)'
                          }}
                        >
                          ${preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 5. CONDICIÓN PARA GANAR 1 SELLO */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '3px' }}>
                    Texto Explicativo en la Tarjeta
                  </label>
                  <input
                    type="text"
                    value={stampCondition}
                    onChange={(e) => setStampCondition(e.target.value)}
                    placeholder="Ej. 1 sello por cada compra mayor a US$10.00 o 1 sello por servicio"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '10px', border: '1px solid #EEDCD5', fontSize: '0.80rem', background: '#FFFFFF' }}
                  />
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: UBICACIÓN GPS & AVISOS (Hasta 2 locales / sucursales) */}
          {activeModalTab === 'LOCATION' && (() => {
            const currentLoc = locations[activeLocationIndex] || locations[0] || {};
            const hasCurrentCoords = currentLoc.latitude !== '' && currentLoc.longitude !== '' && currentLoc.latitude !== null && currentLoc.longitude !== null;

            return (
              <div>
                {/* Selector de Sucursales / Locales (Máx. 2) */}
                <div style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1.2px solid #EDE2D5',
                  padding: '14px 16px',
                  marginBottom: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Store size={15} color="var(--c-primary)" />
                        <span>Sucursales de este Comercio (Máximo 2 locales)</span>
                      </div>
                      <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Puedes configurar hasta 2 ubicaciones con geocerca independiente si tu comercio tiene dos locales.
                      </div>
                    </div>

                    {locations.length < 2 ? (
                      <button
                        type="button"
                        onClick={handleAddSecondLocation}
                        className="btn btn-secondary"
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          background: '#FAF0ED',
                          color: 'var(--c-primary)',
                          borderColor: '#F5DDD6',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <Plus size={14} />
                        <span>+ Agregar 2do Local</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRemoveSecondLocation}
                        style={{
                          background: '#FEF2F2',
                          border: '1px solid #FECACA',
                          borderRadius: '8px',
                          color: '#DC2626',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px'
                        }}
                        title="Eliminar la segunda sucursal"
                      >
                        <Trash2 size={13} />
                        <span>Quitar 2do Local</span>
                      </button>
                    )}
                  </div>

                  {/* Tabs de Selección entre Local 1 y Local 2 */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {locations.map((loc, idx) => {
                      const isSelected = activeLocationIndex === idx;
                      const hasLocCoords = loc.latitude !== '' && loc.longitude !== '' && loc.latitude !== null && loc.longitude !== null;
                      return (
                        <button
                          key={loc.id || idx}
                          type="button"
                          onClick={() => setActiveLocationIndex(idx)}
                          style={{
                            flex: 1,
                            padding: '9px 12px',
                            borderRadius: '12px',
                            border: isSelected ? '2px solid var(--c-primary)' : '1px solid #EEDCD5',
                            background: isSelected ? 'var(--c-primary)' : '#FAF8F5',
                            color: isSelected ? '#FFFFFF' : 'var(--text-main)',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '6px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span>{idx === 0 ? '🏢 Local 1 (Principal)' : '🏪 Local 2 (Sucursal)'}</span>
                          </span>
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            background: isSelected ? 'rgba(255,255,255,0.25)' : (hasLocCoords ? '#DCFCE7' : '#F5F5F4'),
                            color: isSelected ? '#FFFFFF' : (hasLocCoords ? '#15803D' : '#78716C'),
                            padding: '2px 6px',
                            borderRadius: '999px'
                          }}>
                            {hasLocCoords ? '✓ GPS Listo' : 'Sin GPS'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Configuración GPS & Geocerca de la Sucursal Seleccionada */}
                <div style={{
                  background: geofenceEnabled ? 'linear-gradient(135deg, rgba(222, 139, 118, 0.08) 0%, rgba(250, 248, 245, 0.9) 100%)' : '#FAF8F5',
                  border: `1.5px solid ${geofenceEnabled && hasCurrentCoords ? '#DE8B76' : '#EDE2D5'}`,
                  borderRadius: '18px',
                  padding: '18px',
                  marginBottom: '18px',
                  boxShadow: geofenceEnabled && hasCurrentCoords ? '0 4px 16px rgba(222, 139, 118, 0.12)' : 'none'
                }}>
                  {/* Header del bloque */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        background: geofenceEnabled && hasCurrentCoords ? 'var(--c-primary)' : '#78716C',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <MapPin size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          {activeLocationIndex === 0 ? 'Local 1: Sede Principal' : 'Local 2: Segunda Sucursal'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Avisa en el móvil a los clientes cuando pasen cerca de este punto
                        </div>
                      </div>
                    </div>

                    {/* Switch de activación de geocercas general */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={geofenceEnabled}
                        onChange={(e) => setGeofenceEnabled(e.target.checked)}
                        style={{ accentColor: 'var(--c-primary)', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        color: geofenceEnabled ? '#15803D' : '#78716C',
                        background: geofenceEnabled ? '#DCFCE7' : '#F5F5F4',
                        padding: '3px 8px',
                        borderRadius: '9999px',
                        border: `1px solid ${geofenceEnabled ? '#86EFAC' : '#E7E5E4'}`
                      }}>
                        {geofenceEnabled ? '🟢 Geocerca Activa' : '⚪ Inactiva'}
                      </span>
                    </label>
                  </div>

                  {/* Campos de Nombre y Dirección de este Local */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '10px', marginBottom: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '3px' }}>
                        Nombre / Identificador de la Sucursal
                      </label>
                      <input
                        type="text"
                        value={currentLoc.name || ''}
                        onChange={(e) => updateCurrentLocation({ name: e.target.value })}
                        placeholder={activeLocationIndex === 0 ? 'Ej. Sede Principal o Local Centro' : 'Ej. Sucursal Las Mercedes'}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '10px', border: '1px solid #EEDCD5', fontSize: '0.80rem', background: '#FFFFFF' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '3px' }}>
                        Dirección Específica de este Local
                      </label>
                      <input
                        type="text"
                        value={currentLoc.address || ''}
                        onChange={(e) => updateCurrentLocation({ address: e.target.value })}
                        placeholder="Ej. Av. Francisco de Miranda, Centro Comercial..."
                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '10px', border: '1px solid #EEDCD5', fontSize: '0.80rem', background: '#FFFFFF' }}
                      />
                    </div>
                  </div>

                  {/* Mapa Interactivo con Pin Arrastrable para fijar ubicación visualmente */}
                  <StoreMapPicker
                    key={`map_picker_${activeLocationIndex}`}
                    latitude={currentLoc.latitude}
                    longitude={currentLoc.longitude}
                    radius={currentLoc.radiusMeters || 150}
                    storeName={`${name || 'Tu Comercio'} - ${currentLoc.name || `Local ${activeLocationIndex + 1}`}`}
                    onChangeLocation={({ lat, lng }) => {
                      updateCurrentLocation({ latitude: lat, longitude: lng });
                      if (onNotify) onNotify(`¡Ubicación fijada para ${currentLoc.name || `Local ${activeLocationIndex + 1}`}: ${lat}, ${lng}!`, 'success');
                    }}
                  />

                  {/* Alternativa: Pegar enlace o coordenadas directas de Google Maps */}
                  <div style={{
                    background: '#FFFFFF',
                    border: '1px solid #EEDCD5',
                    borderRadius: '14px',
                    padding: '12px',
                    marginBottom: '14px'
                  }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Crosshair size={13} color="var(--c-primary)" />
                      <span>O pegar enlace o coordenadas de Google Maps para este local</span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="Pegar link de Google Maps o coords directas (ej. https://maps.app... o 10.4806, -66.9036)"
                        value={mapsUrlInput}
                        onChange={(e) => setMapsUrlInput(e.target.value)}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          padding: '7px 10px',
                          borderRadius: '8px',
                          border: '1px solid #EEDCD5',
                          fontSize: '0.74rem',
                          background: '#FAF8F5'
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleParseMapsUrl}
                        className="btn btn-secondary"
                        style={{ padding: '7px 12px', fontSize: '0.74rem', fontWeight: 700 }}
                      >
                        Extraer
                      </button>
                    </div>
                  </div>

                  {/* Inputs de Coordenadas de este local */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '3px' }}>
                        Latitud
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={currentLoc.latitude !== undefined && currentLoc.latitude !== null ? currentLoc.latitude : ''}
                        onChange={(e) => updateCurrentLocation({ latitude: e.target.value })}
                        placeholder="Ej. 10.480612"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '10px', border: '1px solid #EEDCD5', fontSize: '0.82rem', background: '#FFFFFF' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '3px' }}>
                        Longitud
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={currentLoc.longitude !== undefined && currentLoc.longitude !== null ? currentLoc.longitude : ''}
                        onChange={(e) => updateCurrentLocation({ longitude: e.target.value })}
                        placeholder="Ej. -66.903611"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '10px', border: '1px solid #EEDCD5', fontSize: '0.82rem', background: '#FFFFFF' }}
                      />
                    </div>
                  </div>

                  {/* Enlace para verificar en Google Maps si están las coordenadas */}
                  {hasCurrentCoords && (
                    <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                      <a
                        href={`https://www.google.com/maps?q=${currentLoc.latitude},${currentLoc.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--c-primary)',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <ExternalLink size={12} />
                        <span>Verificar {currentLoc.name || `Local ${activeLocationIndex + 1}`} en Google Maps</span>
                      </a>
                      <span style={{ fontSize: '0.70rem', color: '#15803D', fontWeight: 700 }}>
                        ✓ Coordenadas listas para geocerca
                      </span>
                    </div>
                  )}

                  {/* Radio de detección de este local */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                      Radio de Detección para {currentLoc.name || `Local ${activeLocationIndex + 1}`}
                    </label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[
                        { value: 100, label: '100 m (Local)' },
                        { value: 150, label: '150 m (Recomendado)' },
                        { value: 250, label: '250 m (Manzana)' },
                        { value: 500, label: '500 m (Amplio)' }
                      ].map(r => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => updateCurrentLocation({ radiusMeters: r.value })}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '8px',
                            border: Number(currentLoc.radiusMeters || 150) === r.value ? '1.5px solid var(--c-primary)' : '1px solid #EEDCD5',
                            background: Number(currentLoc.radiusMeters || 150) === r.value ? 'var(--c-primary)' : '#FFFFFF',
                            color: Number(currentLoc.radiusMeters || 150) === r.value ? '#FFFFFF' : 'var(--text-main)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mensaje de proximidad para el cliente (compartido para la marca) */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '3px' }}>
                      Mensaje de Notificación para el Teléfono del Cliente
                    </label>
                    <input
                      type="text"
                      value={proximityMessage}
                      onChange={(e) => setProximityMessage(e.target.value)}
                      placeholder={`¡Estás cerca de ${name || 'nuestra tienda'}! Pasa hoy a acumular sellos en tu tarjeta.`}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '8px 10px',
                        borderRadius: '10px',
                        border: '1px solid #EEDCD5',
                        fontSize: '0.80rem',
                        background: '#FFFFFF'
                      }}
                    />
                  </div>

                  {/* Simulación visual de Notificación Push en Teléfono */}
                  <div style={{
                    background: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '5px',
                          background: 'var(--c-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF'
                        }}>
                          <Bell size={10} />
                        </div>
                        <span style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          fidely CLUB • {name || 'Tu Tienda'}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>
                        A {currentLoc.radiusMeters || 150}m • Ahora
                      </span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#374151', lineHeight: 1.35 }}>
                      {proximityMessage || `¡Estás cerca de ${name || 'este local'}! Entra a sellar tu tarjeta y reclamar tus premios.`}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid #EDE2D5', alignItems: 'center' }}>
            {!isMandatoryFirstTime && (
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                style={{ padding: '9px 18px', fontSize: '0.82rem', borderRadius: '12px' }}
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary"
              style={{
                padding: isMandatoryFirstTime ? '11px 26px' : '9px 24px',
                fontSize: '0.85rem',
                fontWeight: 900,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #70092B 0%, #9C382A 100%)',
                boxShadow: '0 4px 14px rgba(112, 9, 43, 0.35)'
              }}
            >
              <CheckCircle2 size={16} />
              <span>{isSaving ? 'Guardando y Activando...' : (isMandatoryFirstTime ? '🚀 Guardar y Activar Tarjeta de Fidelidad' : 'Guardar Cambios')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
