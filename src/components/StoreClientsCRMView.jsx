import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Award,
  Gift,
  Sparkles,
  Clock,
  Send,
  MessageCircle,
  CheckCircle2,
  Calendar,
  Star,
  Flame,
  X,
  Phone,
  Mail,
  PartyPopper
} from 'lucide-react';
import { db, rtdb } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { ref as dbRef, set as dbSet } from 'firebase/database';

/**
 * Helper para calcular estado del cumpleaños
 */
export function getBirthdayStatus(birthDateStr) {
  if (!birthDateStr || typeof birthDateStr !== 'string') return null;
  const clean = birthDateStr.trim();
  if (!clean) return null;

  let month = -1;
  let day = -1;

  // YYYY-MM-DD o YYYY/MM/DD
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(clean)) {
    const parts = clean.split(/[-/]/);
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2], 10);
  } else if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(clean)) {
    // DD/MM/YYYY o DD-MM-YYYY
    const parts = clean.split(/[-/]/);
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
  } else if (/^\d{1,2}[-/]\d{1,2}$/.test(clean)) {
    // DD/MM o MM-DD
    const parts = clean.split(/[-/]/);
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
  }

  if (month < 0 || month > 11 || day < 1 || day > 31) return null;

  const now = new Date();
  const currentYear = now.getFullYear();
  const today = new Date(currentYear, now.getMonth(), now.getDate());

  let bdayThisYear = new Date(currentYear, month, day);
  let diffDays = Math.round((bdayThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < -1) {
    const bdayNextYear = new Date(currentYear + 1, month, day);
    diffDays = Math.round((bdayNextYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  const isToday = diffDays === 0;
  const isUpcoming7Days = diffDays > 0 && diffDays <= 7;
  const isThisMonth = now.getMonth() === month;

  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const formattedDay = `${day} ${monthNames[month]}`;

  return {
    day,
    month,
    diffDays,
    isToday,
    isUpcoming7Days,
    isThisMonth,
    formattedDay,
    label: isToday
      ? '🎂 ¡Cumpleaños Hoy!'
      : (isUpcoming7Days ? `🎉 Cumple en ${diffDays} día${diffDays > 1 ? 's' : ''} (${formattedDay})` : formattedDay)
  };
}

export default function StoreClientsCRMView({
  store = {},
  clients = [],
  purchases = [],
  onNotify = () => { }
}) {
  const [filterMode, setFilterMode] = useState('ALL_STAMPS'); // 'ALL_STAMPS' | 'CLOSE_TO_REWARD' | 'BIRTHDAYS' | 'READY_TO_CLAIM' | 'ALL'
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de Notificación Push
  const [pushModalData, setPushModalData] = useState(null); // { target: 'INDIVIDUAL' | 'SEGMENT_CLOSE' | 'SEGMENT_BIRTHDAYS', client?: obj }
  const [pushTitle, setPushTitle] = useState('');
  const [pushMessage, setPushMessage] = useState('');
  const [isSendingPush, setIsSendingPush] = useState(false);

  // Mapear clientes con datos calculados para esta tienda
  const storeClientsData = useMemo(() => {
    if (!clients || !store?.id) return [];
    const storeIdStr = String(store.id).trim().toLowerCase();
    const storeNameStr = store.name ? String(store.name).trim().toLowerCase() : '';

    return clients.map(client => {
      const cards = client.loyaltyCards || [];
      const storeCard = cards.find(card => {
        const cId = String(card.storeId || card.id || '').trim().toLowerCase();
        const cName = card.storeName ? String(card.storeName).trim().toLowerCase() : '';
        return (cId && cId === storeIdStr) || (cName && storeNameStr && (cName === storeNameStr || cName.includes(storeNameStr)));
      });

      const currentStamps = storeCard ? Number(storeCard.currentStamps || 0) : 0;
      const targetStamps = storeCard
        ? (Number(storeCard.stampsTarget) || Number(store.stampsTarget) || Number(store.maxStamps) || 10)
        : (Number(store.stampsTarget) || Number(store.maxStamps) || 10);

      const hasStamps = currentStamps > 0;
      const remainingStamps = Math.max(0, targetStamps - currentStamps);
      const percentage = Math.min(100, Math.round((currentStamps / targetStamps) * 100));

      // Está por completar si le faltan 1 o 2 sellos, o tiene >= 70%
      const isCloseToReward = hasStamps && (remainingStamps <= 2 || percentage >= 70) && currentStamps < targetStamps;
      const isReadyToClaim = currentStamps >= targetStamps;
      const completedCycles = storeCard ? Number(storeCard.completedCycles || 0) : 0;

      const bdayStr = client.birthDate || client.fecha_nacimiento || '';
      const birthdayStatus = getBirthdayStatus(bdayStr);

      return {
        ...client,
        storeCard,
        currentStamps,
        targetStamps,
        hasStamps,
        remainingStamps,
        percentage,
        isCloseToReward,
        isReadyToClaim,
        completedCycles,
        birthdayStatus,
        lastStampAt: storeCard?.lastStampAt || storeCard?.updatedAt || client.updatedAt || client.createdAt
      };
    });
  }, [clients, store]);

  // Segmentos
  const clientsWithStamps = useMemo(() => {
    return storeClientsData.filter(c => c.hasStamps);
  }, [storeClientsData]);

  const clientsCloseToReward = useMemo(() => {
    return storeClientsData.filter(c => c.isCloseToReward);
  }, [storeClientsData]);

  const clientsBirthdayThisWeek = useMemo(() => {
    return storeClientsData.filter(c => c.birthdayStatus && (c.birthdayStatus.isToday || c.birthdayStatus.isUpcoming7Days));
  }, [storeClientsData]);

  const clientsReadyToClaim = useMemo(() => {
    return storeClientsData.filter(c => c.isReadyToClaim);
  }, [storeClientsData]);

  // Clientes filtrados por tab y buscador
  const filteredClients = useMemo(() => {
    let list = storeClientsData;

    if (filterMode === 'ALL_STAMPS') {
      list = clientsWithStamps;
    } else if (filterMode === 'CLOSE_TO_REWARD') {
      list = clientsCloseToReward;
    } else if (filterMode === 'BIRTHDAYS') {
      list = clientsBirthdayThisWeek;
    } else if (filterMode === 'READY_TO_CLAIM') {
      list = clientsReadyToClaim;
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;

    return list.filter(c => {
      const name = (c.name || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const doc = (c.documentId || c.cedula || c.docId || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || doc.includes(q) || email.includes(q);
    });
  }, [storeClientsData, filterMode, clientsWithStamps, clientsCloseToReward, clientsBirthdayThisWeek, clientsReadyToClaim, searchQuery]);

  // Abrir modal de push para un cliente individual
  const handleOpenIndividualPush = (client, templateType = 'STAMP') => {
    let defaultTitle = '';
    let defaultMessage = '';
    const storeName = store.name || 'nuestro local';

    if (templateType === 'BIRTHDAY') {
      defaultTitle = `🎂 ¡Feliz Cumpleaños de parte de ${storeName}!`;
      defaultMessage = `¡Hola ${client.name}! Hoy en tu día especial, te esperamos en ${storeName} con una sorpresa y sellos dobles. ¡Ven a celebrar!`;
    } else {
      defaultTitle = `🎁 ¡Te faltan solo ${client.remainingStamps} sellos para tu premio en ${storeName}!`;
      defaultMessage = `¡Hola ${client.name}! Estás muy cerca de completar tu tarjeta de fidelidad. Visítanos hoy, suma tu sello y reclama tu recompensa.`;
    }

    setPushTitle(defaultTitle);
    setPushMessage(defaultMessage);
    setPushModalData({
      target: 'INDIVIDUAL',
      client,
      badgeType: templateType === 'BIRTHDAY' ? 'CUMPLE' : 'PREMIO'
    });
  };

  // Abrir modal de push para todo un segmento
  const handleOpenSegmentPush = (segmentType) => {
    const storeName = store.name || 'nuestro local';

    if (segmentType === 'CLOSE_TO_REWARD') {
      setPushTitle(`🎁 ¡Completa tu tarjeta y reclama tu premio en ${storeName}!`);
      setPushMessage(`Estás a solo 1 o 2 sellos de llevarte tu recompensa gratis. Visítanos hoy mismo en ${storeName} y disfruta tu premio.`);
      setPushModalData({
        target: 'SEGMENT_CLOSE',
        recipientCount: clientsCloseToReward.length,
        badgeType: 'PREMIO'
      });
    } else if (segmentType === 'BIRTHDAYS') {
      setPushTitle(`🎂 ¡Semana de Cumpleaños en ${storeName}!`);
      setPushMessage(`A todos nuestros clientes cumpleañeros: vengan esta semana y disfruten de un regalo especial de fidelidad en su compra.`);
      setPushModalData({
        target: 'SEGMENT_BIRTHDAYS',
        recipientCount: clientsBirthdayThisWeek.length,
        badgeType: 'CUMPLE'
      });
    }
  };

  // Enviar Push a Firebase (Firestore + RTDB)
  const handleSendPushSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!pushTitle.trim() || !pushMessage.trim()) {
      onNotify('Por favor escribe un título y mensaje para la notificación push.', 'warning');
      return;
    }

    setIsSendingPush(true);
    try {
      const promoId = `push_crm_${Date.now()}`;
      const isIndiv = pushModalData.target === 'INDIVIDUAL';
      const targetClientId = isIndiv ? pushModalData.client.id : null;
      const targetClientName = isIndiv ? pushModalData.client.name : null;
      const targetClientIds = isIndiv
        ? [pushModalData.client.id]
        : (pushModalData.target === 'SEGMENT_CLOSE'
            ? clientsCloseToReward.map(c => c.id)
            : (pushModalData.target === 'SEGMENT_BIRTHDAYS'
                ? clientsBirthdayThisWeek.map(c => c.id)
                : null));

      const promoData = {
        id: promoId,
        storeId: store.id,
        storeName: store.name || 'Mi Comercio',
        storeLogo: store.logoUrl || store.logo || '',
        title: pushTitle.trim(),
        message: pushMessage.trim(),
        badgeType: pushModalData.badgeType || 'PROMO',
        targetAudience: isIndiv ? 'CLIENT' : 'SEGMENT',
        targetClientId: targetClientId || null,
        targetClientIds: targetClientIds || null,
        targetClientName: targetClientName || null,
        lastPushTrigger: Date.now(),
        totalDestinatarios: isIndiv ? 1 : (pushModalData.recipientCount || clientsWithStamps.length),
        status: 'ACTIVA',
        createdAt: new Date().toISOString(),
        timestamp: Date.now()
      };

      // 1. Guardar en Firestore store_promotions
      if (db) {
        await setDoc(doc(db, 'store_promotions', promoId), promoData);
      }

      // 2. Guardar en RTDB tiendas_promociones (dispara push web/móvil)
      if (rtdb) {
        const rtdbRef = dbRef(rtdb, `tiendas_promociones/${store.id}/${promoId}`);
        await dbSet(rtdbRef, promoData);

        // Si es cliente individual, registrar en su bandeja personal
        if (targetClientId) {
          const clientNotifRef = dbRef(rtdb, `notificaciones_cliente/${targetClientId}/${promoId}`);
          await dbSet(clientNotifRef, promoData);
        }
      }

      onNotify(`🚀 ¡Notificación push enviada con éxito!`, 'success');
      setPushModalData(null);
      setPushTitle('');
      setPushMessage('');
    } catch (err) {
      console.error('Error enviando push:', err);
      onNotify('Hubo un error al enviar la notificación: ' + (err.message || err), 'error');
    } finally {
      setIsSendingPush(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>

      {/* 1. Header & Hero */}
      <div className="glass-panel" style={{ padding: '24px', background: 'linear-gradient(135deg, #FAF8F5 0%, #FFFFFF 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(112, 9, 43, 0.08)', color: 'var(--c-primary)', fontWeight: 800, fontSize: '0.75rem', marginBottom: '8px' }}>
              <Users size={14} />
              <span>CRM & BASE DE CLIENTES FIDELIZADOS</span>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              Clientes de {store.name || 'Mi Comercio'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>
              Monitorea sellos acumulados, clientes por completar premios y cumpleañeros para enviarles notificaciones push personalizadas.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {clientsCloseToReward.length > 0 && (
              <button
                type="button"
                onClick={() => handleOpenSegmentPush('CLOSE_TO_REWARD')}
                className="btn btn-primary"
                style={{
                  padding: '8px 14px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.35)'
                }}
              >
                <Flame size={14} />
                <span>📢 Push a {clientsCloseToReward.length} por Completar</span>
              </button>
            )}

            {clientsBirthdayThisWeek.length > 0 && (
              <button
                type="button"
                onClick={() => handleOpenSegmentPush('BIRTHDAYS')}
                className="btn btn-emerald"
                style={{
                  padding: '8px 14px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                }}
              >
                <PartyPopper size={14} />
                <span>🎂 Push a {clientsBirthdayThisWeek.length} Cumpleañeros</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Tarjetas de Resumen Rápido */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px',
          marginTop: '20px',
          paddingTop: '20px',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          {/* Total con sellos */}
          <div
            onClick={() => setFilterMode('ALL_STAMPS')}
            style={{
              background: '#FFFFFF',
              padding: '16px',
              borderRadius: '12px',
              border: filterMode === 'ALL_STAMPS' ? '2px solid var(--c-primary)' : '1px solid var(--border-subtle)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              🎯 Clientes con Sellos
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--c-primary)', marginTop: '4px' }}>
              {clientsWithStamps.length} <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>activos</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '2px' }}>
              Tienen al menos 1 sello en tu tienda
            </div>
          </div>

          {/* Por completar premio */}
          <div
            onClick={() => setFilterMode('CLOSE_TO_REWARD')}
            style={{
              background: '#FFFFFF',
              padding: '16px',
              borderRadius: '12px',
              border: filterMode === 'CLOSE_TO_REWARD' ? '2px solid #D97706' : '1px solid var(--border-subtle)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#D97706', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Flame size={13} />
              <span>Por Completar Premio</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#B45309', marginTop: '4px' }}>
              {clientsCloseToReward.length} <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>clientes</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '2px' }}>
              A solo 1 o 2 sellos de su recompensa
            </div>
          </div>

          {/* Cumpleañeros */}
          <div
            onClick={() => setFilterMode('BIRTHDAYS')}
            style={{
              background: '#FFFFFF',
              padding: '16px',
              borderRadius: '12px',
              border: filterMode === 'BIRTHDAYS' ? '2px solid #059669' : '1px solid var(--border-subtle)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <PartyPopper size={13} />
              <span>Cumpleañeros</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#047857', marginTop: '4px' }}>
              {clientsBirthdayThisWeek.length} <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>esta semana</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '2px' }}>
              Hoy y próximos 7 días
            </div>
          </div>

          {/* Listos para reclamar */}
          <div
            onClick={() => setFilterMode('READY_TO_CLAIM')}
            style={{
              background: '#FFFFFF',
              padding: '16px',
              borderRadius: '12px',
              border: filterMode === 'READY_TO_CLAIM' ? '2px solid #8B5CF6' : '1px solid var(--border-subtle)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Gift size={13} />
              <span>Listos para Canjear</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#6D28D9', marginTop: '4px' }}>
              {clientsReadyToClaim.length} <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>tarjetas llenas</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '2px' }}>
              100% de sellos completados
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filtros y Búsqueda */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL_STAMPS', label: 'Con Sellos', count: clientsWithStamps.length },
            { id: 'CLOSE_TO_REWARD', label: '🔥 Por Completar', count: clientsCloseToReward.length, highlight: clientsCloseToReward.length > 0 },
            { id: 'BIRTHDAYS', label: '🎂 Cumpleañeros', count: clientsBirthdayThisWeek.length, highlightGreen: clientsBirthdayThisWeek.length > 0 },
            { id: 'READY_TO_CLAIM', label: '🎁 Listos para Premio', count: clientsReadyToClaim.length },
            { id: 'ALL', label: 'Todos los Clientes', count: storeClientsData.length }
          ].map(flt => (
            <button
              key={flt.id}
              type="button"
              onClick={() => setFilterMode(flt.id)}
              style={{
                padding: '7px 14px',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: filterMode === flt.id ? 'var(--c-primary)' : 'var(--border-subtle)',
                background: filterMode === flt.id ? 'var(--c-primary)' : '#FFFFFF',
                color: filterMode === flt.id ? '#FFFFFF' : 'var(--text-main)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{flt.label}</span>
              <span style={{
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '0.68rem',
                fontWeight: 800,
                background: flt.highlight
                  ? '#EF4444'
                  : (flt.highlightGreen ? '#10B981' : (filterMode === flt.id ? 'rgba(255,255,255,0.25)' : '#F1F5F9')),
                color: (flt.highlight || flt.highlightGreen) ? '#FFFFFF' : (filterMode === flt.id ? '#FFFFFF' : '#475569')
              }}>
                {flt.count}
              </span>
            </button>
          ))}
        </div>

        {/* Buscador */}
        <div style={{ position: 'relative', minWidth: '240px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o cédula..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.82rem',
              background: '#FFFFFF'
            }}
          />
        </div>
      </div>

      {/* 4. Lista de Clientes */}
      {filteredClients.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
          <Users size={42} style={{ margin: '0 auto 12px', opacity: 0.35, color: 'var(--c-primary)' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 6px', color: 'var(--text-main)' }}>
            No se encontraron clientes en este segmento
          </h3>
          <p style={{ fontSize: '0.82rem', margin: 0 }}>
            {searchQuery ? 'Prueba cambiando los términos de tu búsqueda.' : 'Los clientes aparecerán automáticamente al escanear su código QR o acumular sellos.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredClients.map(client => {
            const bday = client.birthdayStatus;
            const waPhone = (client.phone || '').replace(/\D/g, '');

            return (
              <div
                key={client.id}
                className="glass-panel"
                style={{
                  padding: '16px 20px',
                  background: '#FFFFFF',
                  borderRadius: '14px',
                  border: client.isCloseToReward
                    ? '1.5px solid #FDE68A'
                    : (bday?.isToday ? '1.5px solid #A7F3D0' : '1px solid var(--border-subtle)'),
                  boxShadow: client.isCloseToReward
                    ? '0 3px 12px rgba(245, 158, 11, 0.1)'
                    : (bday?.isToday ? '0 3px 12px rgba(16, 185, 129, 0.12)' : '0 2px 6px rgba(0,0,0,0.02)')
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>

                  {/* Info Cliente */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '240px', flex: '1 1 240px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-secondary) 100%)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '1rem',
                      flexShrink: 0
                    }}>
                      {(client.name || 'C').slice(0, 2).toUpperCase()}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: '0.98rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                          {client.name || 'Cliente sin nombre'}
                        </h4>

                        {/* Badge de Cumpleaños */}
                        {bday?.isToday && (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: '#D1FAE5',
                            color: '#059669',
                            border: '1px solid #A7F3D0',
                            fontSize: '0.70rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            🎂 ¡Cumpleaños Hoy!
                          </span>
                        )}

                        {bday?.isUpcoming7Days && !bday?.isToday && (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: '#EFF6FF',
                            color: '#2563EB',
                            border: '1px solid #BFDBFE',
                            fontSize: '0.70rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            🎉 Cumple en {bday.diffDays} días ({bday.formattedDay})
                          </span>
                        )}

                        {client.isCloseToReward && (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: '#FEF3C7',
                            color: '#D97706',
                            border: '1px solid #FDE68A',
                            fontSize: '0.70rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            <Flame size={11} />
                            <span>¡A {client.remainingStamps} sello{client.remainingStamps > 1 ? 's' : ''}!</span>
                          </span>
                        )}

                        {client.isReadyToClaim && (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: '#EDE9FE',
                            color: '#7C3AED',
                            border: '1px solid #DDD6FE',
                            fontSize: '0.70rem',
                            fontWeight: 800
                          }}>
                            🎁 ¡Listo para Canjear!
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.75rem', color: '#64748B', marginTop: '3px', flexWrap: 'wrap' }}>
                        {client.phone && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={11} />
                            <span>{client.phone}</span>
                          </span>
                        )}
                        {(client.documentId || client.cedula) && (
                          <span>C.I: {client.documentId || client.cedula}</span>
                        )}
                        {bday && !bday.isToday && !bday.isUpcoming7Days && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={11} />
                            <span>Cumple: {bday.formattedDay}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Barra de Progreso de Sellos */}
                  <div style={{ minWidth: '180px', flex: '1 1 180px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        {client.currentStamps} de {client.targetStamps} sellos
                      </span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B' }}>
                        {client.percentage}%
                      </span>
                    </div>

                    <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${client.percentage}%`,
                        height: '100%',
                        background: client.isReadyToClaim
                          ? 'linear-gradient(90deg, #10B981, #059669)'
                          : (client.isCloseToReward ? 'linear-gradient(90deg, #F59E0B, #D97706)' : 'linear-gradient(90deg, var(--c-primary), var(--c-secondary))'),
                        borderRadius: '4px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>

                    {client.completedCycles > 0 && (
                      <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Star size={10} color="#F59E0B" fill="#F59E0B" />
                        <span>{client.completedCycles} premio{client.completedCycles > 1 ? 's' : ''} reclamado{client.completedCycles > 1 ? 's' : ''} antes</span>
                      </div>
                    )}
                  </div>

                  {/* Acciones Rápidas */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>

                    {/* Botón WhatsApp Directo */}
                    {waPhone && (
                      <a
                        href={`https://wa.me/${waPhone.startsWith('58') ? waPhone : `58${waPhone.replace(/^0+/, '')}`}?text=${encodeURIComponent(
                          bday?.isToday
                            ? `¡Hola ${client.name}! 🎂 Te escribimos de ${store.name || 'tu tienda favorita'}. ¡Feliz cumpleaños! Hoy tenemos una sorpresa especial para ti.`
                            : (client.isCloseToReward
                              ? `¡Hola ${client.name}! 🎁 Te escribimos de ${store.name || 'tu tienda favorita'}. Vemos que te faltan solo ${client.remainingStamps} sello(s) para tu premio. ¡Te esperamos hoy!`
                              : `¡Hola ${client.name}! Te escribimos de ${store.name || 'tu tienda favorita'}. Tienes ${client.currentStamps} sellos acumulados en tu tarjeta de fidelidad.`
                            )
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: '1px solid #10B981',
                          background: '#ECFDF5',
                          color: '#047857',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          textDecoration: 'none'
                        }}
                        title="Abrir chat en WhatsApp con mensaje sugerido"
                      >
                        <MessageCircle size={13} />
                        <span>WhatsApp</span>
                      </a>
                    )}

                    {/* Botón Push Cumpleaños */}
                    {bday && (bday.isToday || bday.isUpcoming7Days) && (
                      <button
                        type="button"
                        onClick={() => handleOpenIndividualPush(client, 'BIRTHDAY')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid #10B981',
                          background: '#10B981',
                          color: '#FFFFFF',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <PartyPopper size={13} />
                        <span>Push Cumpleaños</span>
                      </button>
                    )}

                    {/* Botón Push Alerta de Premio / Sellos */}
                    <button
                      type="button"
                      onClick={() => handleOpenIndividualPush(client, 'STAMP')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--c-primary)',
                        background: client.isCloseToReward ? 'var(--c-primary)' : '#FFFFFF',
                        color: client.isCloseToReward ? '#FFFFFF' : 'var(--c-primary)',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                      title="Enviar notificación push personalizada a este cliente"
                    >
                      <Send size={12} />
                      <span>{client.isCloseToReward ? 'Push: Faltan Sellos' : 'Enviar Push'}</span>
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: REDACTAR Y ENVIAR NOTIFICACIÓN PUSH */}
      {pushModalData && (
        <div className="modal-overlay" onClick={() => setPushModalData(null)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px', padding: '24px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={18} color="var(--c-primary)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                  Enviar Notificación Push
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPushModalData(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Destinatario */}
            <div style={{
              background: '#F8FAFC',
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '16px',
              border: '1px solid #E2E8F0',
              fontSize: '0.78rem'
            }}>
              <span style={{ color: '#64748B' }}>Destinatario: </span>
              {pushModalData.target === 'INDIVIDUAL' ? (
                <strong>{pushModalData.client?.name} ({pushModalData.client?.phone || 'Cliente'})</strong>
              ) : (
                <strong>
                  {pushModalData.target === 'SEGMENT_CLOSE'
                    ? `Todos los clientes por completar premio (${pushModalData.recipientCount} clientes)`
                    : `Todos los cumpleañeros de la semana (${pushModalData.recipientCount} clientes)`
                  }
                </strong>
              )}
            </div>

            <form onSubmit={handleSendPushSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Título de la Notificación:
                  </label>
                  <input
                    type="text"
                    required
                    value={pushTitle}
                    onChange={(e) => setPushTitle(e.target.value)}
                    placeholder="Ej: ¡Estás a solo 2 sellos de tu premio!"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Mensaje:
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={pushMessage}
                    onChange={(e) => setPushMessage(e.target.value)}
                    placeholder="Escribe el mensaje que llegará al celular..."
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.84rem', resize: 'vertical' }}
                  />
                </div>

                {/* Previsualización en Mockup */}
                <div style={{
                  background: '#0F172A',
                  color: '#FFFFFF',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'var(--c-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Sparkles size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94A3B8' }}>
                      <span>{store.name || 'fidely CLUB'} • Ahora</span>
                    </div>
                    <div style={{ fontSize: '0.80rem', fontWeight: 800, marginTop: '2px', color: '#FFFFFF' }}>
                      {pushTitle || 'Título de notificación'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#CBD5E1', marginTop: '2px' }}>
                      {pushMessage || 'Cuerpo del mensaje en el teléfono...'}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setPushModalData(null)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '0.78rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSendingPush}
                  className="btn btn-primary"
                  style={{
                    padding: '8px 18px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Send size={13} />
                  <span>{isSendingPush ? 'Enviando...' : 'Enviar Notificación Push'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

