import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  X,
  MapPin,
  Store,
  Search,
  ExternalLink,
  Navigation,
  Layers,
  Phone,
  Tag,
  CheckCircle2,
  Maximize2,
  Minimize2,
  RefreshCw,
  Printer
} from 'lucide-react';
import StoreLogoBadge from './StoreLogoBadge';

const GOOGLE_MAPS_API_KEY = "AIzaSyCQ1To4pW1cdkyEjOND_cBPZGGwQoFIqMs";

// Coordenadas de ciudades y estados de Venezuela para geocodificación de respaldo
const CITY_COORDINATES = {
  caracas: { lat: 10.4806, lng: -66.9036 },
  valencia: { lat: 10.1620, lng: -67.9972 },
  maracaibo: { lat: 10.6427, lng: -71.6125 },
  barquisimeto: { lat: 10.0647, lng: -69.3570 },
  maracay: { lat: 10.2469, lng: -67.5958 },
  "san cristóbal": { lat: 7.7669, lng: -72.2250 },
  sancristobal: { lat: 7.7669, lng: -72.2250 },
  lechería: { lat: 10.1901, lng: -64.6938 },
  lecheria: { lat: 10.1901, lng: -64.6938 },
  "puerto la cruz": { lat: 10.2138, lng: -64.6334 },
  merida: { lat: 8.5983, lng: -71.1450 },
  margarita: { lat: 10.9577, lng: -63.8697 },
  porlamar: { lat: 10.9577, lng: -63.8697 },
  guatire: { lat: 10.4740, lng: -66.5414 },
  guarenas: { lat: 10.4714, lng: -66.6111 },
  "los teques": { lat: 10.3444, lng: -67.0433 },
  chacao: { lat: 10.4938, lng: -66.8576 },
  baruta: { lat: 10.4350, lng: -66.8744 },
  hatillo: { lat: 10.4260, lng: -66.8250 },
  aragua: { lat: 10.2469, lng: -67.5958 },
  tejerias: { lat: 10.2542, lng: -67.1736 },
  lara: { lat: 10.0647, lng: -69.3570 },
  bolivar: { lat: 8.1221, lng: -63.5497 },
  "ciudad bolivar": { lat: 8.1221, lng: -63.5497 },
  "puerto ordaz": { lat: 8.2974, lng: -62.7303 },
  guayana: { lat: 8.2974, lng: -62.7303 },
  miranda: { lat: 10.3444, lng: -67.0433 },
  zulia: { lat: 10.6427, lng: -71.6125 },
  carabobo: { lat: 10.1620, lng: -67.9972 },
  falcon: { lat: 11.4045, lng: -69.6734 },
  coro: { lat: 11.4045, lng: -69.6734 },
  "punto fijo": { lat: 11.7061, lng: -70.1802 },
  anzoategui: { lat: 10.1444, lng: -64.6789 },
  monagas: { lat: 9.7469, lng: -63.1834 },
  maturin: { lat: 9.7469, lng: -63.1834 },
  tachira: { lat: 7.7669, lng: -72.2250 },
  cumana: { lat: 10.4539, lng: -64.1826 },
  sucre: { lat: 10.4539, lng: -64.1826 },
  "nueva esparta": { lat: 10.9577, lng: -63.8697 },
  venezuela: { lat: 10.4806, lng: -66.9036 }
};

// Genera un pin SVG nativo limpio sin filtros que puedan fallar en Chrome
function createMarkerPinSvg(color = '#70092B', text = '★') {
  const safeText = (text || '★').slice(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="46" height="54" viewBox="0 0 46 54">
    <ellipse cx="23" cy="51" rx="13" ry="3" fill="rgba(0,0,0,0.28)"/>
    <path d="M23 2 C11.954 2 3 10.954 3 22 C3 34.5 23 48 23 48 C23 48 43 34.5 43 22 C43 10.954 34.046 2 23 2 Z" fill="${color}" stroke="#FFFFFF" stroke-width="2.2"/>
    <circle cx="23" cy="20" r="13" fill="#FFFFFF"/>
    <text x="23" y="25" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="900" fill="${color}" text-anchor="middle">${safeText}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export default function AdminStoresMapModal({
  stores = [],
  onClose,
  onOpenStoreModal = null,
  onOpenPrintStand = null
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersMapRef = useRef(new Map());
  const htmlOverlaysRef = useRef([]);
  const infoWindowRef = useRef(null);

  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapLoadError, setMapLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStore, setSelectedStore] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 1. Extraer categorías únicas
  const categories = useMemo(() => {
    const set = new Set();
    stores.forEach(s => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set);
  }, [stores]);

  // 2. Extraer y georreferenciar cada tienda
  const locatedStores = useMemo(() => {
    return stores.map((s, index) => {
      let lat = null;
      let lng = null;
      let isGpsExact = false;

      // Prioridad 1: locations array (primer local con coordenadas)
      if (Array.isArray(s.locations) && s.locations.length > 0) {
        for (const loc of s.locations) {
          if (loc && loc.latitude !== null && loc.latitude !== undefined && loc.latitude !== '' &&
              loc.longitude !== null && loc.longitude !== undefined && loc.longitude !== '') {
            const pLat = parseFloat(loc.latitude);
            const pLng = parseFloat(loc.longitude);
            if (!isNaN(pLat) && !isNaN(pLng)) {
              lat = pLat;
              lng = pLng;
              isGpsExact = true;
              break;
            }
          }
        }
      }

      // Prioridad 2: store.latitude / store.longitude
      if (lat === null && s.latitude !== null && s.latitude !== undefined && s.latitude !== '' &&
          s.longitude !== null && s.longitude !== undefined && s.longitude !== '') {
        const pLat = parseFloat(s.latitude);
        const pLng = parseFloat(s.longitude);
        if (!isNaN(pLat) && !isNaN(pLng)) {
          lat = pLat;
          lng = pLng;
          isGpsExact = true;
        }
      }

      // Prioridad 3: Geocodificación aproximada de ciudad / dirección
      if (lat === null) {
        const cityKey = (s.city || '').toLowerCase().trim();
        const addressKey = (s.address || '').toLowerCase().trim();
        let baseCoords = CITY_COORDINATES[cityKey];

        if (!baseCoords) {
          for (const [k, coords] of Object.entries(CITY_COORDINATES)) {
            if (cityKey.includes(k) || addressKey.includes(k)) {
              baseCoords = coords;
              break;
            }
          }
        }

        if (!baseCoords) {
          baseCoords = CITY_COORDINATES.caracas;
        }

        // Aplicar dispersión radial para que múltiples tiendas sin GPS exacto no se superpongan
        const angle = (index * 53) % 360;
        const radius = 0.007 + ((index % 6) * 0.0032);
        const rad = (angle * Math.PI) / 180;
        lat = baseCoords.lat + (radius * Math.sin(rad));
        lng = baseCoords.lng + (radius * Math.cos(rad));
        isGpsExact = false;
      }

      return {
        ...s,
        resolvedLat: lat,
        resolvedLng: lng,
        isGpsExact
      };
    });
  }, [stores]);

  // 3. Filtrar tiendas por búsqueda y categoría
  const filteredStores = useMemo(() => {
    return locatedStores.filter(s => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q ||
        (s.name || '').toLowerCase().includes(q) ||
        (s.city || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q) ||
        (s.address || '').toLowerCase().includes(q) ||
        (s.id || '').toLowerCase().includes(q);

      const matchCat = selectedCategory === 'ALL' || s.category === selectedCategory;
      return matchQuery && matchCat;
    });
  }, [locatedStores, searchQuery, selectedCategory]);

  // 4. Cargar Google Maps Script
  useEffect(() => {
    if (window.google && window.google.maps) {
      setIsApiLoaded(true);
      return;
    }

    const scriptId = 'google-maps-script';
    let script = document.getElementById(scriptId);

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const handleLoaded = () => setIsApiLoaded(true);
    const handleError = () => setMapLoadError('No se pudo conectar con el servicio de Google Maps.');

    script.addEventListener('load', handleLoaded);
    script.addEventListener('error', handleError);

    return () => {
      script.removeEventListener('load', handleLoaded);
      script.removeEventListener('error', handleError);
    };
  }, []);

  // 5. Inicializar el mapa cuando el script esté disponible
  useEffect(() => {
    if (!isApiLoaded || !mapContainerRef.current) return;

    try {
      const defaultCenter = { lat: 10.4806, lng: -66.9036 }; // Caracas, Venezuela
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 12,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: window.google.maps.MapTypeControlStyle.DROPDOWN_MENU,
          position: window.google.maps.ControlPosition.TOP_RIGHT
        },
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_BOTTOM
        },
        styles: [
          { featureType: 'poi.business', stylers: [{ visibility: 'off' }] }
        ]
      });

      infoWindowRef.current = new window.google.maps.InfoWindow();
      mapInstanceRef.current = map;
      setMapReady(true);

      // Redibujar una vez que el modal termine de animar
      setTimeout(() => {
        if (mapInstanceRef.current && window.google) {
          window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
        }
      }, 300);
    } catch (e) {
      console.error('Error inicializando Google Maps:', e);
      setMapLoadError('Error al inicializar el mapa.');
    }
  }, [isApiLoaded]);

  // Genera el contenido HTML para la ficha InfoWindow al hacer clic
  const buildInfoWindowHtml = useCallback((s) => {
    const pinColor = s.cardColor || '#70092B';
    const initials = (s.name || 'FC').split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();

    return `
      <div style="font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; padding: 10px; max-width: 290px; color: #1C1917;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: ${pinColor}; color: #FFF; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 14px; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.15); overflow: hidden;">
            ${s.logo ? `<img src="${s.logo}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none';" />` : initials}
          </div>
          <div>
            <div style="font-size: 14px; font-weight: 900; color: #1C1917; line-height: 1.25;">${s.name}</div>
            <div style="display: flex; align-items: center; gap: 5px; margin-top: 4px;">
              <span style="font-size: 10px; font-weight: 800; background: #FAF4F3; color: #70092B; padding: 2px 6px; border-radius: 4px; border: 1px solid #EADCDA;">
                ${s.category || 'Comercio'}
              </span>
              <span style="font-size: 10px; font-weight: 700; color: #78716C;">
                ${s.city || 'Venezuela'}
              </span>
            </div>
          </div>
        </div>

        <div style="font-size: 11.5px; color: #475569; margin-bottom: 8px; line-height: 1.4;">
          📍 <strong>Ubicación:</strong> ${s.address || s.city || 'Venezuela'}
        </div>

        ${s.phone ? `
          <div style="font-size: 11.5px; color: #166534; font-weight: 700; margin-bottom: 8px;">
            📞 WhatsApp: <a href="https://wa.me/${s.phone.replace(/[^0-9]/g, '')}" target="_blank" rel="noopener noreferrer" style="color: #166534; text-decoration: underline;">${s.phone}</a>
          </div>
        ` : ''}

        <div style="display: flex; gap: 6px; margin-top: 10px; border-top: 1px solid #F1F5F9; padding-top: 8px;">
          <a href="https://www.google.com/maps?q=${s.resolvedLat},${s.resolvedLng}" target="_blank" rel="noopener noreferrer" style="flex: 1; text-align: center; background: #F8FAFC; border: 1px solid #CBD5E1; color: #334155; padding: 6px 8px; border-radius: 8px; font-size: 11px; font-weight: 800; text-decoration: none;">
            Abrir Maps ↗
          </a>
          <a href="/?store=${s.id}&action=redeem" target="_blank" rel="noopener noreferrer" style="flex: 1; text-align: center; background: #70092B; color: #FFFFFF; padding: 6px 8px; border-radius: 8px; font-size: 11px; font-weight: 800; text-decoration: none;">
            Ver QR 📲
          </a>
        </div>
      </div>
    `;
  }, []);

  // 6. Actualizar marcadores con Nombre y Logo en el mapa
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!mapReady || !map || !window.google || !window.google.maps) return;

    // Limpiar marcadores y overlays previos
    markersMapRef.current.forEach(m => {
      if (typeof m.setMap === 'function') m.setMap(null);
    });
    markersMapRef.current.clear();

    htmlOverlaysRef.current.forEach(overlay => {
      if (typeof overlay.setMap === 'function') overlay.setMap(null);
    });
    htmlOverlaysRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();
    let hasValidPoints = false;

    // Clase para Marcador HTML con Logo y Nombre visible directamente en el mapa
    class StoreHtmlPinOverlay extends window.google.maps.OverlayView {
      constructor(store, position) {
        super();
        this.store = store;
        this.position = new window.google.maps.LatLng(position.lat, position.lng);
        this.div = null;
        this.setMap(map);
      }

      onAdd() {
        const div = document.createElement('div');
        div.className = 'fidely-store-map-pin';
        div.style.position = 'absolute';
        div.style.cursor = 'pointer';
        div.style.transform = 'translate(-50%, -100%)';
        div.style.zIndex = '100';
        div.style.userSelect = 'none';
        div.style.transition = 'transform 0.16s ease, filter 0.16s ease';

        const s = this.store;
        const pinColor = s.cardColor || '#70092B';
        const initials = (s.name || 'FC').split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();

        div.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.28));">
            <div style="display: flex; align-items: center; gap: 7px; background: #FFFFFF; border: 2.5px solid ${pinColor}; padding: 3px 10px 3px 4px; border-radius: 999px; max-width: 210px; white-space: nowrap;">
              <div style="width: 28px; height: 28px; border-radius: 50%; background: ${pinColor}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 900; overflow: hidden; flex-shrink: 0; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.12);">
                ${s.logo ? `<img src="${s.logo}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" /><span style="display:none;">${initials}</span>` : `<span>${initials}</span>`}
              </div>
              <span style="font-size: 11px; font-weight: 800; color: #0F172A; overflow: hidden; text-overflow: ellipsis; max-width: 135px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                ${s.name}
              </span>
            </div>
            <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 7px solid ${pinColor}; margin-top: -1px;"></div>
            <div style="width: 10px; height: 3px; border-radius: 50%; background: rgba(0,0,0,0.25); filter: blur(1px); margin-top: 1px;"></div>
          </div>
        `;

        div.addEventListener('mouseenter', () => {
          div.style.transform = 'translate(-50%, -106%) scale(1.08)';
          div.style.zIndex = '999';
        });

        div.addEventListener('mouseleave', () => {
          div.style.transform = 'translate(-50%, -100%) scale(1)';
          div.style.zIndex = '100';
        });

        div.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedStore(s);
          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(buildInfoWindowHtml(s));
            infoWindowRef.current.setPosition(this.position);
            infoWindowRef.current.open(map);
          }
        });

        this.div = div;
        const panes = this.getPanes();
        if (panes && panes.overlayMouseTarget) {
          panes.overlayMouseTarget.appendChild(div);
        }
      }

      draw() {
        const overlayProjection = this.getProjection();
        if (!overlayProjection || !this.div) return;
        const point = overlayProjection.fromLatLngToDivPixel(this.position);
        if (point) {
          this.div.style.left = point.x + 'px';
          this.div.style.top = point.y + 'px';
        }
      }

      onRemove() {
        if (this.div && this.div.parentNode) {
          this.div.parentNode.removeChild(this.div);
          this.div = null;
        }
      }
    }

    filteredStores.forEach(s => {
      const lat = s.resolvedLat;
      const lng = s.resolvedLng;
      if (lat === null || lng === null) return;

      const position = { lat, lng };
      bounds.extend(position);
      hasValidPoints = true;

      // 1. Crear el overlay HTML interactivo con Nombre y Logo
      try {
        const overlay = new StoreHtmlPinOverlay(s, position);
        htmlOverlaysRef.current.push(overlay);
        markersMapRef.current.set(s.id, overlay);
      } catch (err) {
        console.warn('Fallback a Marker estándar para', s.name, err);
        // Fallback: Google Maps Marker nativo con pin SVG
        const pinColor = s.cardColor || '#70092B';
        const initials = (s.name || 'FC').split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const marker = new window.google.maps.Marker({
          position,
          map,
          title: s.name,
          icon: {
            url: createMarkerPinSvg(pinColor, initials),
            scaledSize: new window.google.maps.Size(40, 48),
            anchor: new window.google.maps.Point(20, 48)
          }
        });

        marker.addListener('click', () => {
          setSelectedStore(s);
          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(buildInfoWindowHtml(s));
            infoWindowRef.current.open(map, marker);
          }
        });

        markersMapRef.current.set(s.id, marker);
      }
    });

    // Ajustar límites de zoom
    if (hasValidPoints) {
      if (filteredStores.length > 1) {
        map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
      } else if (filteredStores.length === 1 && filteredStores[0].resolvedLat) {
        map.setCenter({ lat: filteredStores[0].resolvedLat, lng: filteredStores[0].resolvedLng });
        map.setZoom(15);
      }
    }
  }, [mapReady, filteredStores, buildInfoWindowHtml]);

  // Centrar mapa al hacer clic en una tienda de la lista lateral
  const handleSelectStoreFromList = (st) => {
    setSelectedStore(st);
    const map = mapInstanceRef.current;
    if (!map || st.resolvedLat === null || st.resolvedLng === null) return;

    const targetPos = new window.google.maps.LatLng(st.resolvedLat, st.resolvedLng);
    map.panTo(targetPos);
    map.setZoom(16);

    if (infoWindowRef.current) {
      infoWindowRef.current.setContent(buildInfoWindowHtml(st));
      infoWindowRef.current.setPosition(targetPos);
      infoWindowRef.current.open(map);
    }
  };

  // Re-enfocar vista general de todas las tiendas
  const handleFitAll = () => {
    const map = mapInstanceRef.current;
    if (!map || filteredStores.length === 0 || !window.google) return;
    const bounds = new window.google.maps.LatLngBounds();
    filteredStores.forEach(s => {
      if (s.resolvedLat !== null && s.resolvedLng !== null) {
        bounds.extend({ lat: s.resolvedLat, lng: s.resolvedLng });
      }
    });
    map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 99999,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isFullscreen ? '0' : '16px',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: isFullscreen ? '100vw' : '1300px',
        height: isFullscreen ? '100vh' : '90vh',
        backgroundColor: '#FFFFFF',
        borderRadius: isFullscreen ? '0' : '20px',
        overflow: 'hidden',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* HEADER DEL MODAL */}
        <header style={{
          padding: '14px 20px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to right, #FFFFFF, #FAF8F5)',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 10px rgba(13, 148, 136, 0.25)'
            }}>
              <MapPin size={20} />
            </div>
            <div>
              <h2 style={{
                margin: 0,
                fontSize: '1.15rem',
                fontWeight: 900,
                color: '#0F172A',
                letterSpacing: '-0.02em',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                Mapa de Comercios Afiliados
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  background: '#CCFBF1',
                  color: '#0F766E',
                  padding: '2px 8px',
                  borderRadius: '999px'
                }}>
                  {filteredStores.length} de {stores.length} tiendas
                </span>
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748B' }}>
                Ubicaciones en tiempo real con logo, nombre y contacto directo
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleFitAll}
              className="btn btn-secondary"
              style={{
                padding: '7px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                borderRadius: '8px'
              }}
              title="Ajustar mapa para ver todas las tiendas"
            >
              <Navigation size={13} />
              <span>Ver Todas</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="btn btn-secondary"
              style={{
                padding: '7px 10px',
                fontSize: '0.75rem',
                borderRadius: '8px'
              }}
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Cerrar mapa"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* CUERPO: SIDEBAR DE BUSQUEDA + CONTENEDOR DE GOOGLE MAPS */}
        <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
          {/* PANEL LATERAL: BUSCADOR Y LISTA DE TIENDAS */}
          <aside style={{
            width: '320px',
            borderRight: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10,
            boxShadow: '4px 0 12px rgba(0,0,0,0.03)'
          }}>
            {/* Buscador de tiendas */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Buscar tienda, ciudad, rubro..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px 8px 32px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.78rem',
                    outline: 'none',
                    backgroundColor: '#F8FAFC'
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      fontSize: '11px'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filtros rápidos de categoría */}
              {categories.length > 0 && (
                <div style={{
                  display: 'flex',
                  gap: '4px',
                  overflowX: 'auto',
                  paddingTop: '8px',
                  paddingBottom: '2px',
                  scrollbarWidth: 'none'
                }}>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('ALL')}
                    style={{
                      padding: '3px 8px',
                      fontSize: '0.70rem',
                      fontWeight: selectedCategory === 'ALL' ? 800 : 600,
                      borderRadius: '999px',
                      border: '1px solid',
                      borderColor: selectedCategory === 'ALL' ? '#70092B' : '#E2E8F0',
                      backgroundColor: selectedCategory === 'ALL' ? '#70092B' : '#FFFFFF',
                      color: selectedCategory === 'ALL' ? '#FFFFFF' : '#64748B',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Todos
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      style={{
                        padding: '3px 8px',
                        fontSize: '0.70rem',
                        fontWeight: selectedCategory === cat ? 800 : 600,
                        borderRadius: '999px',
                        border: '1px solid',
                        borderColor: selectedCategory === cat ? '#70092B' : '#E2E8F0',
                        backgroundColor: selectedCategory === cat ? '#70092B' : '#FFFFFF',
                        color: selectedCategory === cat ? '#FFFFFF' : '#64748B',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Lista scrollable de tiendas */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {filteredStores.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 16px', color: '#94A3B8', fontSize: '0.80rem' }}>
                  <Store size={28} style={{ opacity: 0.4, margin: '0 auto 8px' }} />
                  <div>No se encontraron comercios con esa búsqueda.</div>
                </div>
              ) : (
                filteredStores.map(st => {
                  const isSelected = selectedStore?.id === st.id;
                  const pinColor = st.cardColor || '#70092B';

                  return (
                    <div
                      key={st.id}
                      onClick={() => handleSelectStoreFromList(st)}
                      style={{
                        padding: '9px 10px',
                        marginBottom: '6px',
                        borderRadius: '10px',
                        border: '1px solid',
                        borderColor: isSelected ? pinColor : '#F1F5F9',
                        backgroundColor: isSelected ? '#FAF4F3' : '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <StoreLogoBadge
                        store={st}
                        size={36}
                        fontSize={12}
                        borderRadius={8}
                        showBorder={true}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          color: '#1E293B',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {st.name}
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.70rem',
                          color: '#64748B',
                          marginTop: '2px'
                        }}>
                          <span style={{
                            background: '#F1F5F9',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontWeight: 700
                          }}>
                            {st.category || 'General'}
                          </span>
                          <span>•</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {st.city || 'Venezuela'}
                          </span>
                        </div>
                      </div>

                      {st.isGpsExact && (
                        <span
                          title="Ubicación GPS exacta verificada"
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            color: '#0F766E',
                            background: '#CCFBF1',
                            padding: '2px 5px',
                            borderRadius: '4px'
                          }}
                        >
                          GPS
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* CONTENEDOR PRINCIPAL DE GOOGLE MAPS */}
          <main style={{ flex: 1, position: 'relative', height: '100%' }}>
            <div
              ref={mapContainerRef}
              style={{ width: '100%', height: '100%', backgroundColor: '#E2E8F0' }}
            />

            {/* Spinner de carga si el mapa está cargando */}
            {!mapReady && !mapLoadError && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                zIndex: 20
              }}>
                <RefreshCw size={28} color="#0D9488" style={{ animation: 'spin 1s linear infinite' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                  Cargando Google Maps y ubicando comercios...
                </div>
              </div>
            )}

            {/* Mensaje de error si falla la API de Google Maps */}
            {mapLoadError && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#FFF1F2',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                textAlign: 'center',
                zIndex: 20
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⚠️</div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#E11D48', marginBottom: '4px' }}>
                  {mapLoadError}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', maxWidth: '380px' }}>
                  Verifica que la clave de API tenga habilitada la <strong>Maps JavaScript API</strong> en Google Cloud Console.
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (max-width: 768px) {
          aside {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
