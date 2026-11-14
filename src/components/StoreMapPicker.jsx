import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Navigation, Crosshair, MapPin, ZoomIn, ZoomOut } from 'lucide-react';

// Custom Pin Icon using HTML/SVG to avoid broken image assets
const createStorePinIcon = () => {
  return L.divIcon({
    className: 'custom-store-marker',
    html: `
      <div style="
        position: relative;
        width: 38px;
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 34px;
          height: 34px;
          background: #9C382A;
          border: 2.5px solid #FFFFFF;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 14px rgba(156, 56, 42, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <span style="transform: rotate(45deg); font-size: 15px; line-height: 1;">🏪</span>
        </div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 36],
    popupAnchor: [0, -36]
  });
};

export default function StoreMapPicker({
  latitude,
  longitude,
  radius = 500,
  onChangeLocation,
  storeName = 'Tu Comercio'
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Coordenadas por defecto (Caracas como centro neutro si no hay coordenadas)
  const parsedLat = parseFloat(latitude);
  const parsedLng = parseFloat(longitude);
  const hasValidCoords = !isNaN(parsedLat) && !isNaN(parsedLng) && parsedLat !== 0 && parsedLng !== 0;

  const defaultCenter = hasValidCoords ? [parsedLat, parsedLng] : [10.4806, -66.9036];
  const defaultZoom = hasValidCoords ? 16 : 13;

  // Inicializar mapa de Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    // Controles de zoom abajo a la derecha
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const pinIcon = createStorePinIcon();

    // Crear marcador si hay coordenadas o en centro por defecto
    const initialPos = defaultCenter;
    const marker = L.marker(initialPos, {
      icon: pinIcon,
      draggable: true
    }).addTo(map);

    marker.bindPopup(`<strong>${storeName}</strong><br/><span style="font-size:11px;color:#666;">Arrastra el pin o toca el mapa para fijar tu ubicación</span>`);

    // Radio de geocerca alrededor del local
    const circle = L.circle(initialPos, {
      radius: Number(radius) || 500,
      color: '#9C382A',
      fillColor: '#9C382A',
      fillOpacity: 0.12,
      weight: 1.5,
      dashArray: '4, 6'
    }).addTo(map);

    // Evento al arrastrar el marcador
    marker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      const lat = parseFloat(pos.lat.toFixed(6));
      const lng = parseFloat(pos.lng.toFixed(6));
      circle.setLatLng([lat, lng]);
      if (onChangeLocation) {
        onChangeLocation({ lat, lng });
      }
    });

    // Evento al hacer clic en cualquier punto del mapa
    map.on('click', (e) => {
      const lat = parseFloat(e.latlng.lat.toFixed(6));
      const lng = parseFloat(e.latlng.lng.toFixed(6));
      marker.setLatLng([lat, lng]);
      circle.setLatLng([lat, lng]);
      if (onChangeLocation) {
        onChangeLocation({ lat, lng });
      }
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;
    circleRef.current = circle;

    // Forzar redibujado correcto tras render inicial
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
  }, []);

  // Actualizar posición del marcador cuando cambian las coordenadas externas
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || !circleRef.current) return;
    if (hasValidCoords) {
      const newPos = [parsedLat, parsedLng];
      markerRef.current.setLatLng(newPos);
      circleRef.current.setLatLng(newPos);
      mapInstanceRef.current.panTo(newPos);
    }
  }, [latitude, longitude]);

  // Actualizar radio de la geocerca
  useEffect(() => {
    if (!circleRef.current) return;
    circleRef.current.setRadius(Number(radius) || 500);
  }, [radius]);

  // Búsqueda de dirección con Nominatim
  const handleSearchLocation = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(parseFloat(item.lat).toFixed(6));
        const lng = parseFloat(parseFloat(item.lon).toFixed(6));

        if (mapInstanceRef.current && markerRef.current && circleRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16);
          markerRef.current.setLatLng([lat, lng]);
          circleRef.current.setLatLng([lat, lng]);
        }

        if (onChangeLocation) {
          onChangeLocation({ lat, lng });
        }
      } else {
        alert('No se encontró la dirección. Intenta con un punto de referencia más conocido (ej. "Plaza Altamira, Caracas").');
      }
    } catch (err) {
      console.warn('Error buscando ubicación en mapa:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Geolocalización del navegador
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));

        if (mapInstanceRef.current && markerRef.current && circleRef.current) {
          mapInstanceRef.current.setView([lat, lng], 17);
          markerRef.current.setLatLng([lat, lng]);
          circleRef.current.setLatLng([lat, lng]);
        }

        if (onChangeLocation) {
          onChangeLocation({ lat, lng });
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        alert('No se pudo obtener la ubicación automáticamente desde tu navegador. Puedes mover el pin rojo directamente en el mapa.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1.5px solid #EEDCD5',
      borderRadius: '16px',
      overflow: 'hidden',
      marginBottom: '14px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.04)'
    }}>
      {/* Barra superior de herramientas del mapa */}
      <div style={{
        padding: '10px 12px',
        background: '#FAF8F5',
        borderBottom: '1px solid #EEDCD5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MapPin size={15} color="var(--c-primary)" />
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Fijar Ubicación en el Mapa
          </span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            (Haz clic o arrastra el pin)
          </span>
        </div>

        {/* Botón GPS */}
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: 'var(--c-primary)',
            color: '#FFFFFF',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '8px',
            fontSize: '0.72rem',
            fontWeight: 700,
            cursor: isLocating ? 'wait' : 'pointer'
          }}
          title="Centrar en mi posición actual"
        >
          <Navigation size={12} />
          <span>{isLocating ? 'Localizando...' : 'Mi Ubicación GPS'}</span>
        </button>
      </div>

      {/* Buscador de dirección en el mapa */}
      <form onSubmit={handleSearchLocation} style={{ display: 'flex', padding: '8px 10px', background: '#FFFFFF', borderBottom: '1px solid #F3EDE6', gap: '6px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input
            type="text"
            placeholder="Buscar ciudad, calle o punto de referencia en el mapa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px 6px 30px',
              borderRadius: '8px',
              border: '1px solid #EEDCD5',
              fontSize: '0.75rem',
              background: '#FAF8F5'
            }}
          />
        </div>
        <button
          type="submit"
          disabled={isSearching}
          className="btn btn-secondary"
          style={{ padding: '6px 12px', fontSize: '0.74rem', fontWeight: 700 }}
        >
          {isSearching ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {/* Contenedor del Mapa */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '280px',
          background: '#E5E7EB',
          position: 'relative',
          cursor: 'crosshair',
          zIndex: 1
        }}
      />

      {/* Footer del mapa con coordenadas actuales */}
      <div style={{
        padding: '8px 12px',
        background: '#FAF8F5',
        borderTop: '1px solid #EEDCD5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.72rem',
        color: 'var(--text-muted)',
        flexWrap: 'wrap',
        gap: '6px'
      }}>
        <div>
          {hasValidCoords ? (
            <span>
              📍 <strong>{parsedLat.toFixed(6)}, {parsedLng.toFixed(6)}</strong> • Radio: <strong>{radius}m</strong>
            </span>
          ) : (
            <span style={{ color: '#D97706' }}>
              ⚠️ Toca cualquier punto del mapa para fijar tu local.
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.68rem', color: '#166534', fontWeight: 700 }}>
          {hasValidCoords && '✓ Coordenadas sincronizadas con la geocerca'}
        </div>
      </div>
    </div>
  );
}

