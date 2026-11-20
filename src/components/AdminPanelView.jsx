import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  Users, 
  Coins, 
  Gift, 
  TrendingUp, 
  Settings, 
  ShieldCheck, 
  Store, 
  FileText, 
  Plus, 
  Edit3, 
  Sliders, 
  Search, 
  DollarSign, 
  ArrowUpRight, 
  BarChart3, 
  X,
  Flame,
  Cloud,
  UploadCloud,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  Copy,
  Trash2,
  Clock,
  Check,
  Tag,
  Palette,
  Megaphone,
  Lock,
  CreditCard,
  Sparkles,
  MapPin,
  Phone,
  Send,
  Radio,
  Eye,
  Percent,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronUp,
  Mail,
  MessageCircle,
  Smartphone,
  Printer
} from 'lucide-react';
import StoreLogoBadge from './StoreLogoBadge';
import StoreProfileModal from './StoreProfileModal';
import StoreQrPrintStand from './StoreQrPrintStand';
import AdminStoresMapModal from './AdminStoresMapModal';
import { getStoreSubscriptionDetails, parseDateSafe, SUBSCRIPTION_PRICE_USD } from '../utils/subscriptionUtils';
import { firebaseConfig, db, rtdb } from '../firebase/config';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc 
} from 'firebase/firestore';
import { 
  ref as dbRef, 
  set as dbSet, 
  update as dbUpdate, 
  remove as dbRemove 
} from 'firebase/database';
import { 
  seedDatabaseToFirebase, 
  checkFirebaseConnection, 
  cleanDatabaseForProduction, 
  saveStore, 
  saveReward,
  saveClient,
  removeStore,
  removeClient,
  registerDeletedUser,
  saveConfig,
  syncRtdbToFirestore
} from '../firebase/firestoreService';

function getStoreWhatsAppUrl(phone) {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('0')) {
    digits = '58' + digits.substring(1);
  } else if (!digits.startsWith('58') && digits.length === 10) {
    digits = '58' + digits;
  }
  return `https://wa.me/${digits}`;
}

function TablePagination({
  currentPage,
  totalItems,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  itemLabel = 'registros'
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endItem = Math.min(currentPage * rowsPerPage, totalItems);

  if (totalItems <= 10 && rowsPerPage <= 15) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderTop: '1px solid var(--border-subtle)',
        background: '#FAF8F5',
        borderRadius: '0 0 12px 12px',
        fontSize: '0.78rem',
        color: 'var(--text-muted)'
      }}>
        <span>Total: <strong>{totalItems}</strong> {itemLabel}</span>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px',
      padding: '12px 16px',
      borderTop: '1px solid var(--border-subtle)',
      background: '#FAF8F5',
      borderRadius: '0 0 12px 12px',
      fontSize: '0.80rem',
      color: 'var(--text-muted)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span>
          Mostrando <strong>{startItem} - {endItem}</strong> de <strong>{totalItems}</strong> {itemLabel}
        </span>
        <span style={{ opacity: 0.4 }}>•</span>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <span>Por pág:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              onRowsPerPageChange(Number(e.target.value));
              onPageChange(1);
            }}
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          style={{
            padding: '5px 8px',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            background: currentPage <= 1 ? '#F1F5F9' : '#FFFFFF',
            color: currentPage <= 1 ? '#94A3B8' : '#1E293B',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            fontSize: '0.75rem',
            fontWeight: 700
          }}
          title="Primera página"
        >
          <ChevronsLeft size={14} />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          style={{
            padding: '5px 10px',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            background: currentPage <= 1 ? '#F1F5F9' : '#FFFFFF',
            color: currentPage <= 1 ? '#94A3B8' : '#1E293B',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            fontSize: '0.75rem',
            fontWeight: 700
          }}
          title="Página anterior"
        >
          <ChevronLeft size={14} />
          <span>Ant</span>
        </button>

        <span style={{ padding: '0 8px', fontWeight: 800, color: 'var(--text-main)', fontSize: '0.80rem' }}>
          {currentPage} / {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          style={{
            padding: '5px 10px',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            background: currentPage >= totalPages ? '#F1F5F9' : '#FFFFFF',
            color: currentPage >= totalPages ? '#94A3B8' : '#1E293B',
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            fontSize: '0.75rem',
            fontWeight: 700
          }}
          title="Página siguiente"
        >
          <span>Sig</span>
          <ChevronRight size={14} />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          style={{
            padding: '5px 8px',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            background: currentPage >= totalPages ? '#F1F5F9' : '#FFFFFF',
            color: currentPage >= totalPages ? '#94A3B8' : '#1E293B',
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            fontSize: '0.75rem',
            fontWeight: 700
          }}
          title="Última página"
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
}

export default function AdminPanelView({
  clients,
  setClients,
  purchases,
  setPurchases,
  stores,
  setStores,
  rewards,
  setRewards,
  movements,
  setMovements,
  redemptions,
  setRedemptions,
  config,
  setConfig,
  onNotify,
  onNavigate,
  onSelectStore,
  isFetchingDolarRate = false,
  onRefreshDolarRate,
  dolarRateInfo = null
}) {
  const [activeTab, setActiveTab] = useState('DASHBOARD'); // DASHBOARD, APPROVALS, CLIENTS, TRANSACTIONS, REWARDS, RULES, AUDIT
  const [clientSearch, setClientSearch] = useState('');
  
  // Approvals State (Tiendas y Clientes)
  const [approvalSection, setApprovalSection] = useState('STORES'); // 'STORES' | 'CLIENTS'
  const [approvalFilter, setApprovalFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
  const [approvalSearch, setApprovalSearch] = useState('');

  // Pagination states
  const [approvalClientPage, setApprovalClientPage] = useState(1);
  const [approvalClientRowsPerPage, setApprovalClientRowsPerPage] = useState(15);
  const [approvalStorePage, setApprovalStorePage] = useState(1);
  const [approvalStoreRowsPerPage, setApprovalStoreRowsPerPage] = useState(15);
  // Tarjetas de comercios desplegables (UI/UX interactivo)
  const [expandedStoreIds, setExpandedStoreIds] = useState([]);

  const toggleStoreExpand = (storeId) => {
    setExpandedStoreIds(prev =>
      prev.includes(storeId) ? prev.filter(id => id !== storeId) : [...prev, storeId]
    );
  };
  const [printStandStore, setPrintStandStore] = useState(null);
  const [showStoresMapModal, setShowStoresMapModal] = useState(false);

  const [mgmtClientPage, setMgmtClientPage] = useState(1);
  const [mgmtClientRowsPerPage, setMgmtClientRowsPerPage] = useState(15);

  const [txPage, setTxPage] = useState(1);
  const [txRowsPerPage, setTxRowsPerPage] = useState(15);

  // Payments Tab State (Pagos Móvil de Tiendas)
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsRowsPerPage, setPaymentsRowsPerPage] = useState(15);
  const [paymentsFilter, setPaymentsFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
  const [paymentsSearch, setPaymentsSearch] = useState('');
  const [subscriptionPaymentsList, setSubscriptionPaymentsList] = useState([]);

  useEffect(() => {
    setApprovalClientPage(1);
  }, [approvalSearch, approvalFilter, approvalSection]);

  useEffect(() => {
    setApprovalStorePage(1);
  }, [approvalSearch, approvalFilter, approvalSection]);

  useEffect(() => {
    setMgmtClientPage(1);
  }, [clientSearch]);

  useEffect(() => {
    setPaymentsPage(1);
  }, [paymentsSearch, paymentsFilter]);
  
  // Adjustment modal state (RN-12)
  const [adjustingClient, setAdjustingClient] = useState(null);
  const [adjustmentType, setAdjustmentType] = useState('ADD');
  const [adjustmentPoints, setAdjustmentPoints] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentStoreId, setAdjustmentStoreId] = useState(stores[0]?.id || 'STR-01');

  // Rewards catalog filtering
  const [rewardStoreFilter, setRewardStoreFilter] = useState('ALL');

  // Push Notifications to Stores State
  const [pushTargetScope, setPushTargetScope] = useState('ALL_STORES'); // 'ALL_STORES' | 'SPECIFIC'
  const [pushSelectedStoreId, setPushSelectedStoreId] = useState('');
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [isSendingPushToStores, setIsSendingPushToStores] = useState(false);
  const [pushHistory, setPushHistory] = useState([]);

  // Escuchar historial de push enviados
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'admin_push_history'), (snap) => {
      const list = [];
      snap.forEach(d => list.push({ ...d.data(), id: d.id }));
      list.sort((a, b) => new Date(b.sentAt || 0) - new Date(a.sentAt || 0));
      setPushHistory(list);
    }, (err) => console.warn('Error loading push history:', err));
    return () => unsub();
  }, []);

  const handleSendPushToStores = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!pushTitle.trim()) {
      onNotify('Por favor escribe un título para la notificación.', 'warning');
      return;
    }
    if (!pushBody.trim()) {
      onNotify('Por favor escribe el mensaje de la notificación.', 'warning');
      return;
    }

    let targetStores = [];
    if (pushTargetScope === 'SPECIFIC') {
      const selected = stores.find(s => s.id === pushSelectedStoreId);
      if (!selected) {
        onNotify('Por favor selecciona un comercio destinatario.', 'warning');
        return;
      }
      targetStores = [selected];
    } else {
      targetStores = stores;
      if (targetStores.length === 0) {
        onNotify('No hay comercios registrados actualmente en el sistema.', 'warning');
        return;
      }
    }

    const tokens = [];
    const userIds = [];
    targetStores.forEach(s => {
      if (s.fcmToken && typeof s.fcmToken === 'string' && s.fcmToken.trim().length > 10 && !tokens.includes(s.fcmToken)) {
        tokens.push(s.fcmToken);
      }
      if (Array.isArray(s.fcmTokens)) {
        s.fcmTokens.forEach(t => {
          if (t && typeof t === 'string' && t.trim().length > 10 && !tokens.includes(t)) {
            tokens.push(t);
          }
        });
      }
      const uid = s.id || s.firebaseUid || s.uid;
      if (uid && !userIds.includes(uid)) userIds.push(uid);
    });

    setIsSendingPushToStores(true);
    try {
      const jobId = `JOB-STORE-${Date.now()}`;
      
      const notificationPayload = {
        id: jobId,
        title: pushTitle.trim(),
        body: pushBody.trim(),
        role: 'comercio',
        userIds: userIds,
        tokens: tokens,
        targetStoreNames: targetStores.map(s => s.name),
        data: {
          type: 'fideli_pos_admin_alert',
          source: 'fidelipro_admin',
          timestamp: Date.now().toString(),
          target: 'comercio_home'
        },
        status: 'pending',
        createdAt: Date.now(),
        timestamp: Date.now()
      };

      // 1. Disparar Cloud Function oficial para envío de Notificaciones Push FCM a la App Móvil
      try {
        await fetch('https://us-central1-conecta2-drive.cloudfunctions.net/sendAdminNotification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: pushTitle.trim(),
            body: pushBody.trim(),
            role: 'comercio',
            targetScope: pushTargetScope,
            targetStoreNames: targetStores.map(s => s.name),
            userIds: userIds,
            tokens: tokens
          })
        });
      } catch (fcmErr) {
        console.warn('[Push] Error llamando Cloud Function sendAdminNotification:', fcmErr);
      }

      // 2. Publicar comunicado global en Firestore para todos los terminales Web POS
      if (db) {
        try {
          await setDoc(doc(db, 'admin_store_announcements', jobId), {
            id: jobId,
            title: pushTitle.trim(),
            body: pushBody.trim(),
            scope: pushTargetScope,
            targetStoreId: pushTargetScope === 'SPECIFIC' ? pushSelectedStoreId : null,
            targetStoreName: pushTargetScope === 'SPECIFIC' ? (targetStores[0]?.name || '') : 'Todos los comercios',
            targetStoresCount: targetStores.length,
            sentAt: new Date().toISOString(),
            timestamp: Date.now()
          });
        } catch (announcementErr) {
          console.warn('[Push] Error guardando admin_store_announcements:', announcementErr);
        }
      }

      // 3. Encolar en RTDB y alertar en el perfil directo de cada comercio (App Móvil y Web)
      if (rtdb) {
        try {
          await dbSet(dbRef(rtdb, `notificaciones/${jobId}`), notificationPayload);
        } catch (rtdbErr) {
          console.warn('[Push] Advertencia encolando en RTDB notificaciones:', rtdbErr);
        }

        const updateComercioPromises = targetStores.map(async (st) => {
          const storeUid = st.firebaseUid || st.id;
          if (storeUid) {
            try {
              await dbSet(dbRef(rtdb, `user_comercio/${storeUid}/notificacion_admin`), {
                id: jobId,
                title: pushTitle.trim(),
                body: pushBody.trim(),
                sentAt: new Date().toISOString(),
                timestamp: Date.now(),
                read: false
              });
            } catch (_) {}
          }
          if (db && st.id) {
            try {
              await setDoc(doc(db, 'stores', st.id), {
                lastAdminAlert: {
                  id: jobId,
                  title: pushTitle.trim(),
                  body: pushBody.trim(),
                  sentAt: new Date().toISOString(),
                  timestamp: Date.now(),
                  read: false
                }
              }, { merge: true });
            } catch (_) {}
          }
        });
        await Promise.allSettled(updateComercioPromises);
      }

      // 4. Registrar en Firestore collection 'admin_push_history' para auditoría
      const historyItem = {
        id: jobId,
        title: pushTitle.trim(),
        body: pushBody.trim(),
        scope: pushTargetScope,
        targetStoresCount: targetStores.length,
        targetStoreNames: targetStores.map(s => s.name).slice(0, 5),
        tokensCount: tokens.length,
        sentAt: new Date().toISOString(),
        status: 'ENVIADO'
      };
      if (db) {
        try {
          await setDoc(doc(db, 'admin_push_history', jobId), historyItem);
        } catch (firestoreErr) {
          console.warn('[Push] Advertencia guardando auditoría en Firestore:', firestoreErr);
        }
      }

      setPushHistory(prev => [historyItem, ...prev]);
      setPushTitle('');
      setPushBody('');
      onNotify(`🚀 ¡Notificación enviada con éxito a ${targetStores.length} comercio(s) (Web y App Móvil)!`, 'success');
    } catch (err) {
      console.error('Error enviando push:', err);
      onNotify('Error al enviar notificación push: ' + (err.message || err), 'error');
    } finally {
      setIsSendingPushToStores(false);
    }
  };

  // Auto-sincronización permanente de fondo:
  // Reconcilia en tiempo real cualquier nuevo cliente o tienda registrada en la App Móvil Conecta2 o Google
  // hacia Cloud Firestore sin que el Administrador tenga que intervenir ni ejecutar comandos.
  useEffect(() => {
    let active = true;
    syncRtdbToFirestore().then(res => {
      if (active && (res?.clientsAdded > 0 || res?.storesAdded > 0)) {
        console.log(`✅ [AutoSync] Sincronizados de fondo: +${res.clientsAdded} clientes, +${res.storesAdded} comercios.`);
      }
    }).catch(err => {
      console.warn('[AutoSync] Error silencioso al reconciliar:', err);
    });
    return () => { active = false; };
  }, []);

  // New/Edit reward modal
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [rewardForm, setRewardForm] = useState({
    title: '',
    description: '',
    category: 'Saldo en Compra',
    pointsCost: 100,
    stampsCost: 6, // Cantidad de sellos requeridos para canjear en la cartilla digital
    nominalValueUsd: 5.0,
    validityDays: 30,
    availableStock: 100,
    storeScope: 'ALL' // 'ALL' or storeId
  });

  // Store registration and edit modal
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [designingStore, setDesigningStore] = useState(null); // Tienda seleccionada para personalizar tarjeta y sellos
  const [storeForm, setStoreForm] = useState({
    name: '',
    category: 'Boutique / Ropa & Moda',
    city: '',
    address: '',
    phone: '',
    manager: '',
    email: '',
    cashbackPercent: 5.0,
    canEditPercent: false
  });

  // Client Edit Modal state (Cédula, Teléfono, Nombre, etc.)
  const [editingClient, setEditingClient] = useState(null);
  const [clientForm, setClientForm] = useState({
    name: '',
    docId: '',
    phone: '',
    email: '',
    tier: 'Socia Esencial'
  });

  const handleOpenEditClient = (c) => {
    setEditingClient(c);
    setClientForm({
      name: c.name || '',
      docId: c.docId || '',
      phone: c.phone || '',
      email: c.email || '',
      tier: c.tier || 'Socia Esencial'
    });
  };

  const handleSaveClientEdit = async (e) => {
    if (e) e.preventDefault();
    if (!editingClient) return;

    const cleanDoc = clientForm.docId.trim().toUpperCase();
    const updated = {
      ...editingClient,
      name: clientForm.name.trim(),
      docId: cleanDoc,
      phone: clientForm.phone.trim(),
      email: clientForm.email.trim().toLowerCase(),
      tier: clientForm.tier,
      qrCode: `FIDELY-${cleanDoc}`
    };

    try {
      await saveClient(updated);
      setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
      if (onNotify) onNotify(`Datos del cliente ${updated.name} actualizados exitosamente`, 'success');
      setEditingClient(null);
    } catch (err) {
      if (onNotify) onNotify(`Error al actualizar cliente: ${err.message}`, 'error');
    }
  };

  // Store Subscription Management Modal state ($5 USD a tasa BCV tras 3 meses gratis)
  const [subscriptionStore, setSubscriptionStore] = useState(null);

  const handleExtendStoreSubscription = async (monthsToAdd = 1, storeTarget = null) => {
    const target = storeTarget || subscriptionStore;
    if (!target) return;
    const now = new Date();
    const currentPaid = parseDateSafe(target.subscriptionPaidUntil);
    const baseDate = (currentPaid && currentPaid.getTime() > now.getTime()) ? currentPaid : now;
    const newPaidUntil = new Date(baseDate.getTime() + (monthsToAdd * 30 * 24 * 60 * 60 * 1000));

    const updated = {
      ...target,
      subscriptionPaidUntil: newPaidUntil.toISOString(),
      subscriptionStatus: 'ACTIVE',
      subscriptionExempt: false,
      pendingSubscriptionPayment: null,
      updatedAt: now.toISOString()
    };

    await saveStore(updated);
    if (setStores) {
      setStores(prev => prev.map(s => s.id === updated.id ? updated : s));
    }
    if (subscriptionStore && subscriptionStore.id === updated.id) {
      setSubscriptionStore(updated);
    }

    // Si la tienda tenía un pago pendiente reportado en firestore, marcarlo como APROBADO
    if (target.pendingSubscriptionPayment?.reference && db) {
      const matchP = subscriptionPaymentsList.find(p =>
        p.reference === target.pendingSubscriptionPayment.reference &&
        p.storeId === target.id
      );
      if (matchP?.id) {
        try {
          await updateDoc(doc(db, 'subscription_payments', matchP.id), {
            status: 'APROBADO',
            approvedAt: now.toISOString(),
            approvedPaidUntil: newPaidUntil.toISOString()
          });
        } catch (err) {
          console.warn('Error actualizando pago en firestore:', err);
        }
      }
    }

    onNotify(`¡Suscripción de "${updated.name}" extendida por ${monthsToAdd} mes(es) hasta el ${newPaidUntil.toLocaleDateString('es-VE')}!`, 'success');
  };

  const handleApproveSubscriptionPayment = async (payment, monthsToAdd = 1) => {
    const targetStore = (stores || []).find(s => s.id === payment.storeId);
    if (!targetStore) {
      onNotify('No se encontró el comercio asociado a este pago', 'error');
      return;
    }
    const now = new Date();
    const currentPaid = parseDateSafe(targetStore.subscriptionPaidUntil);
    const baseDate = (currentPaid && currentPaid.getTime() > now.getTime()) ? currentPaid : now;
    const newPaidUntil = new Date(baseDate.getTime() + (monthsToAdd * 30 * 24 * 60 * 60 * 1000));

    const updated = {
      ...targetStore,
      subscriptionPaidUntil: newPaidUntil.toISOString(),
      subscriptionStatus: 'ACTIVE',
      subscriptionExempt: false,
      pendingSubscriptionPayment: null,
      updatedAt: now.toISOString()
    };

    await saveStore(updated);
    if (setStores) {
      setStores(prev => prev.map(s => s.id === updated.id ? updated : s));
    }
    if (subscriptionStore && subscriptionStore.id === updated.id) {
      setSubscriptionStore(updated);
    }

    if (db && payment.id) {
      try {
        await updateDoc(doc(db, 'subscription_payments', payment.id), {
          status: 'APROBADO',
          approvedAt: now.toISOString(),
          approvedPaidUntil: newPaidUntil.toISOString()
        });
      } catch (err) {
        console.warn('Error actualizando pago en firestore:', err);
      }
    }

    onNotify(`¡Pago de ${payment.storeName || targetStore.name} aprobado con éxito! Tienda activada hasta el ${newPaidUntil.toLocaleDateString('es-VE')}.`, 'success');
  };

  const handleRejectSubscriptionPayment = async (payment) => {
    if (!window.confirm(`¿Rechazar el comprobante con referencia "${payment.reference}" de la tienda "${payment.storeName || payment.storeId}"?`)) {
      return;
    }
    const now = new Date();
    const targetStore = (stores || []).find(s => s.id === payment.storeId);
    if (targetStore && targetStore.pendingSubscriptionPayment?.reference === payment.reference) {
      const updated = {
        ...targetStore,
        pendingSubscriptionPayment: null,
        updatedAt: now.toISOString()
      };
      await saveStore(updated);
      if (setStores) {
        setStores(prev => prev.map(s => s.id === updated.id ? updated : s));
      }
      if (subscriptionStore && subscriptionStore.id === updated.id) {
        setSubscriptionStore(updated);
      }
    }

    if (db && payment.id) {
      try {
        await updateDoc(doc(db, 'subscription_payments', payment.id), {
          status: 'RECHAZADO',
          rejectedAt: now.toISOString()
        });
      } catch (err) {
        console.warn('Error actualizando pago rechazado en firestore:', err);
      }
    }

    onNotify(`Comprobante con referencia "${payment.reference}" marcado como RECHAZADO.`, 'info');
  };

  const handleExtendStoreTrial = async (daysToAdd = 30, storeTarget = null) => {
    const target = storeTarget || subscriptionStore;
    if (!target) return;
    const now = new Date();
    const currentTrial = parseDateSafe(target.trialEndsAt);
    const baseDate = (currentTrial && currentTrial.getTime() > now.getTime()) ? currentTrial : now;
    const newTrialEnds = new Date(baseDate.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));

    const updated = {
      ...target,
      trialEndsAt: newTrialEnds.toISOString(),
      subscriptionStatus: 'TRIAL',
      subscriptionExempt: false,
      updatedAt: now.toISOString()
    };

    await saveStore(updated);
    if (setStores) {
      setStores(prev => prev.map(s => s.id === updated.id ? updated : s));
    }
    if (subscriptionStore && subscriptionStore.id === updated.id) {
      setSubscriptionStore(updated);
    }
    onNotify(`¡Prueba gratuita de "${updated.name}" extendida por ${daysToAdd} días hasta el ${newTrialEnds.toLocaleDateString('es-VE')}!`, 'success');
  };

  const handleToggleStoreExemption = async (storeTarget = null) => {
    const target = storeTarget || subscriptionStore;
    if (!target) return;
    const now = new Date();
    const newExempt = !target.subscriptionExempt;

    const updated = {
      ...target,
      subscriptionExempt: newExempt,
      subscriptionStatus: newExempt ? 'EXEMPT' : (target.subscriptionPaidUntil ? 'ACTIVE' : 'TRIAL'),
      updatedAt: now.toISOString()
    };

    await saveStore(updated);
    if (setStores) {
      setStores(prev => prev.map(s => s.id === updated.id ? updated : s));
    }
    if (subscriptionStore && subscriptionStore.id === updated.id) {
      setSubscriptionStore(updated);
    }
    onNotify(`¡Exención de pago para "${updated.name}" ${newExempt ? 'CONCEDIDA (Cortesía permanente)' : 'REVOCADA'}!`, 'info');
  };

  const handleBlockStoreSubscription = async (storeTarget = null) => {
    const target = storeTarget || subscriptionStore;
    if (!target) return;
    const now = new Date();
    const pastDate = new Date(now.getTime() - 86400000).toISOString();

    const updated = {
      ...target,
      trialEndsAt: pastDate,
      subscriptionPaidUntil: pastDate,
      subscriptionStatus: 'BLOCKED',
      subscriptionExempt: false,
      customTrialEndsAt: true,
      updatedAt: now.toISOString()
    };

    await saveStore(updated);
    if (setStores) {
      setStores(prev => prev.map(s => s.id === updated.id ? updated : s));
    }
    if (subscriptionStore && subscriptionStore.id === updated.id) {
      setSubscriptionStore(updated);
    }
    onNotify(`Terminal POS de "${updated.name}" BLOQUEADO por falta de pago ($5 BCV).`, 'warning');
  };

  // -------------------------------------------------------------------------
  // PROMOTIONS & PUSH NOTIFICATIONS MANAGEMENT (Firestore: store_promotions, RTDB: tiendas_promociones)
  // -------------------------------------------------------------------------
  const [promotionsList, setPromotionsList] = useState([]);
  const [promoStoreFilter, setPromoStoreFilter] = useState('ALL');
  const [promoStatusFilter, setPromoStatusFilter] = useState('ALL');
  const [promoSearchQuery, setPromoSearchQuery] = useState('');
  const [promoToPush, setPromoToPush] = useState(null);
  const [isSendingPush, setIsSendingPush] = useState(false);
  const [promoToDeactivate, setPromoToDeactivate] = useState(null);
  const [isDeactivatingPromo, setIsDeactivatingPromo] = useState(false);
  const [creatingPromoModal, setCreatingPromoModal] = useState(false);
  const [newPromoForm, setNewPromoForm] = useState({
    storeId: '',
    title: '',
    message: '',
    imageUrl: '',
    badgeType: 'PROMO',
    isUnlimited: false,
    totalStock: 20,
    validityDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  });
  const [isCreatingPromo, setIsCreatingPromo] = useState(false);

  // Escuchar todas las promociones de comercios en tiempo real
  useEffect(() => {
    if (!db) return;
    try {
      const colRef = collection(db, 'store_promotions');
      const unsubscribe = onSnapshot(colRef, (snapshot) => {
        const list = [];
        snapshot.forEach(docSnap => {
          list.push({ ...docSnap.data(), id: docSnap.id });
        });
        list.sort((a, b) => (b.timestamp || b.lastPushTrigger || 0) - (a.timestamp || a.lastPushTrigger || 0));
        setPromotionsList(list);
      }, (err) => {
        console.warn('Error escuchando store_promotions en AdminPanelView:', err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Excepción al conectar listener de store_promotions:', e);
    }
  }, []);

  // Escuchar todos los pagos de suscripción de tiendas en tiempo real
  useEffect(() => {
    if (!db) return;
    try {
      const colRef = collection(db, 'subscription_payments');
      const unsubscribe = onSnapshot(colRef, (snapshot) => {
        const list = [];
        snapshot.forEach(docSnap => {
          list.push({ ...docSnap.data(), id: docSnap.id });
        });
        list.sort((a, b) => new Date(b.reportedAt || 0) - new Date(a.reportedAt || 0));
        setSubscriptionPaymentsList(list);
      }, (err) => {
        console.warn('Error escuchando subscription_payments en AdminPanelView:', err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Excepción al conectar listener de subscription_payments:', e);
    }
  }, []);

  // Consolidar pagos de la colección subscription_payments + pendientes en objetos tienda
  const consolidatedPayments = useMemo(() => {
    const list = [...subscriptionPaymentsList];
    (stores || []).forEach(st => {
      if (st.pendingSubscriptionPayment && st.pendingSubscriptionPayment.reference) {
        const alreadyExists = list.some(p =>
          p.reference === st.pendingSubscriptionPayment.reference &&
          p.storeId === st.id
        );
        if (!alreadyExists) {
          list.push({
            ...st.pendingSubscriptionPayment,
            storeId: st.id,
            storeName: st.name,
            storeEmail: st.email || '',
            virtualPending: true
          });
        }
      }
    });
    return list.sort((a, b) => new Date(b.reportedAt || 0) - new Date(a.reportedAt || 0));
  }, [subscriptionPaymentsList, stores]);

  const pendingPaymentsCount = useMemo(() => {
    return consolidatedPayments.filter(p => p.status === 'PENDIENTE').length;
  }, [consolidatedPayments]);

  // Helper: Validar si una promoción está activa en vivo
  const isStorePromotionActive = (promo) => {
    if (!promo) return false;
    const statusUpper = String(promo.status || '').toUpperCase().trim();
    if (['FINALIZADO', 'FINALIZADA', 'VENCIDO', 'VENCIDA', 'INACTIVO', 'INACTIVA', 'CANCELADO', 'CANCELADA', 'AGOTADO', 'AGOTADA'].includes(statusUpper)) {
      return false;
    }
    const now = new Date();
    if (promo.expiredAt) {
      const d = new Date(promo.expiredAt);
      if (!isNaN(d.getTime()) && now >= d) return false;
    }
    if (promo.expiresAt) {
      const d = new Date(promo.expiresAt);
      if (!isNaN(d.getTime()) && now > d) return false;
    }
    if (promo.validityDate) {
      const todayStr = now.toISOString().slice(0, 10);
      if (promo.validityDate < todayStr) return false;
    }
    if (!promo.isUnlimited && promo.remainingStock !== undefined && promo.remainingStock <= 0) {
      return false;
    }
    return true;
  };

  const formatPromoDate = (dateVal, fallbackTimestamp) => {
    const val = dateVal || fallbackTimestamp;
    if (!val) return 'Sin fecha';
    let d;
    if (typeof val?.toDate === 'function') {
      d = val.toDate();
    } else if (val?.seconds) {
      d = new Date(val.seconds * 1000);
    } else if (val?._seconds) {
      d = new Date(val._seconds * 1000);
    } else if (typeof val === 'number') {
      d = new Date(val);
    } else {
      d = new Date(val);
    }
    if (isNaN(d.getTime())) return 'Reciente';
    return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getPromoTimeRemainingBadge = (promo) => {
    if (!promo) return null;
    const isActive = isStorePromotionActive(promo);
    if (!isActive) {
      return (
        <span className="badge badge-rose" style={{ fontSize: '0.68rem', padding: '2px 7px' }}>
          🔴 Vencida / Finalizada
        </span>
      );
    }

    const now = new Date();
    let expDate = null;
    if (promo.expiresAt) expDate = new Date(promo.expiresAt);
    else if (promo.validityDate) expDate = new Date(`${promo.validityDate}T23:59:59`);

    if (!expDate || isNaN(expDate.getTime())) {
      return (
        <span className="badge badge-emerald" style={{ fontSize: '0.68rem', padding: '2px 7px' }}>
          🟢 Activa en Vivo
        </span>
      );
    }

    const diffMs = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return (
        <span className="badge" style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D', fontSize: '0.68rem', padding: '2px 7px' }}>
          ⏳ Vence Hoy
        </span>
      );
    } else if (diffDays <= 3) {
      return (
        <span className="badge" style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D', fontSize: '0.68rem', padding: '2px 7px' }}>
          ⏳ Quedan {diffDays} {diffDays === 1 ? 'día' : 'días'}
        </span>
      );
    } else {
      return (
        <span className="badge badge-emerald" style={{ fontSize: '0.68rem', padding: '2px 7px' }}>
          🟢 Activa ({diffDays} días)
        </span>
      );
    }
  };

  // Reenviar o enviar notificación Push desde el Admin
  const handleAdminSendPromotionPush = async (promo) => {
    if (!promo || isSendingPush) return;
    setIsSendingPush(true);
    try {
      const nowIso = new Date().toISOString();
      const nowTimestamp = Date.now();
      const currentHistory = Array.isArray(promo.pushHistory) ? promo.pushHistory : (promo.createdAt ? [promo.createdAt] : []);
      const updatedHistory = [...currentHistory, nowIso];
      const newDispatches = (promo.totalPushDispatches || 1) + 1;

      // 1. Actualizar en Firestore
      if (db) {
        const promoRef = doc(db, 'store_promotions', promo.id);
        await updateDoc(promoRef, {
          lastPushSentAt: nowIso,
          lastPushTrigger: nowTimestamp,
          pushHistory: updatedHistory,
          totalPushDispatches: newDispatches,
          status: 'ACTIVA'
        });
      }

      // 2. Actualizar en RTDB -> dispara Cloud Function onTiendaPromocionPush
      if (rtdb && promo.storeId) {
        const rtdbRef = dbRef(rtdb, `tiendas_promociones/${promo.storeId}/${promo.id}`);
        await dbUpdate(rtdbRef, {
          lastPushSentAt: nowIso,
          lastPushTrigger: nowTimestamp,
          pushHistory: updatedHistory,
          totalPushDispatches: newDispatches,
          status: 'ACTIVA'
        });
      }

      setPromotionsList(prev => prev.map(p => p.id === promo.id ? {
        ...p,
        lastPushSentAt: nowIso,
        lastPushTrigger: nowTimestamp,
        pushHistory: updatedHistory,
        totalPushDispatches: newDispatches,
        status: 'ACTIVA'
      } : p));

      if (onNotify) {
        onNotify(`🚀 ¡Notificación push enviada con éxito a los clientes de ${promo.storeName || promo.storeId}! (Difusión #${newDispatches})`, 'success');
      }
      setPromoToPush(null);
    } catch (err) {
      console.error('Error enviando push desde admin:', err);
      if (onNotify) onNotify('Error al enviar notificación push: ' + err.message, 'error');
    } finally {
      setIsSendingPush(false);
    }
  };

  // Finalizar o pausar una promoción activa
  const handleAdminExpirePromotion = async (promo) => {
    if (!promo || isDeactivatingPromo) return;
    setIsDeactivatingPromo(true);
    try {
      const nowIso = new Date().toISOString();
      if (db) {
        const promoRef = doc(db, 'store_promotions', promo.id);
        await updateDoc(promoRef, {
          status: 'FINALIZADO',
          expiredAt: nowIso,
          expiresAt: nowIso
        });
      }
      if (rtdb && promo.storeId) {
        const rtdbRef = dbRef(rtdb, `tiendas_promociones/${promo.storeId}/${promo.id}`);
        await dbUpdate(rtdbRef, {
          status: 'FINALIZADO',
          expiredAt: nowIso,
          expiresAt: nowIso
        });
      }
      setPromotionsList(prev => prev.map(p => p.id === promo.id ? {
        ...p,
        status: 'FINALIZADO',
        expiredAt: nowIso,
        expiresAt: nowIso
      } : p));

      if (onNotify) onNotify(`Promoción "${promo.title}" finalizada con éxito. Ya no aparecerá activa para los clientes.`, 'info');
      setPromoToDeactivate(null);
    } catch (err) {
      console.error('Error finalizando promoción:', err);
      if (onNotify) onNotify('Error al finalizar promoción: ' + err.message, 'error');
    } finally {
      setIsDeactivatingPromo(false);
    }
  };

  // Eliminar permanentemente una promoción
  const handleAdminDeletePromotion = async (promo) => {
    if (!window.confirm(`¿Confirmas que deseas eliminar permanentemente la promoción "${promo.title}" del comercio ${promo.storeName || promo.storeId}?`)) {
      return;
    }
    try {
      if (db) {
        await deleteDoc(doc(db, 'store_promotions', promo.id));
      }
      if (rtdb && promo.storeId) {
        await dbRemove(dbRef(rtdb, `tiendas_promociones/${promo.storeId}/${promo.id}`));
      }
      setPromotionsList(prev => prev.filter(p => p.id !== promo.id));
      if (onNotify) onNotify(`Promoción eliminada permanentemente.`, 'success');
    } catch (err) {
      console.error('Error eliminando promoción:', err);
      if (onNotify) onNotify('Error al eliminar promoción: ' + err.message, 'error');
    }
  };

  // Crear y publicar una promoción desde el Admin
  const handleAdminCreatePromotion = async (e) => {
    e.preventDefault();
    const targetStoreId = newPromoForm.storeId || stores[0]?.id;
    if (!targetStoreId) {
      if (onNotify) onNotify('Por favor selecciona una tienda para la promoción', 'warning');
      return;
    }
    if (!newPromoForm.title.trim() || !newPromoForm.message.trim()) {
      if (onNotify) onNotify('Por favor ingresa un título y un mensaje', 'warning');
      return;
    }
    const targetStore = stores.find(s => s.id === targetStoreId) || stores[0];
    const stock = newPromoForm.isUnlimited ? 999999 : (parseInt(newPromoForm.totalStock, 10) || 10);
    const promoId = `PROMO-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const expiresAt = new Date(`${newPromoForm.validityDate}T23:59:59`).toISOString();

    const promoData = {
      id: promoId,
      storeId: targetStore.id,
      storeName: targetStore.name,
      storeLogo: targetStore.logo || `${window.location.origin}/fidely_white_bg.png`,
      title: newPromoForm.title.trim(),
      message: newPromoForm.message.trim(),
      imageUrl: (newPromoForm.imageUrl?.trim() && newPromoForm.imageUrl.trim().startsWith('http')) ? newPromoForm.imageUrl.trim() : null,
      badgeType: newPromoForm.badgeType || 'PROMO',
      isUnlimited: !!newPromoForm.isUnlimited,
      totalStock: stock,
      remainingStock: stock,
      claimedUserIds: [],
      claimedCount: 0,
      validityType: 'UNTIL_DATE',
      validityDate: newPromoForm.validityDate,
      expiresAt: expiresAt,
      totalDestinatarios: clients.length,
      targetAllClients: true,
      lastPushTrigger: Date.now(),
      totalPushDispatches: 1,
      status: 'ACTIVA',
      createdAt: new Date().toISOString(),
      timestamp: Date.now()
    };

    setIsCreatingPromo(true);
    try {
      if (db) {
        await setDoc(doc(db, 'store_promotions', promoId), promoData);
      }
      if (rtdb) {
        await dbSet(dbRef(rtdb, `tiendas_promociones/${targetStore.id}/${promoId}`), promoData);
      }
      setPromotionsList(prev => [promoData, ...prev]);
      if (onNotify) {
        onNotify(`🎉 ¡Promoción creada y difundida por push para ${targetStore.name}!`, 'success');
      }
      setCreatingPromoModal(false);
      setNewPromoForm({
        storeId: stores[0]?.id || '',
        title: '',
        message: '',
        imageUrl: '',
        badgeType: 'PROMO',
        isUnlimited: false,
        totalStock: 20,
        validityDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      });
    } catch (err) {
      console.error('Error creando promoción:', err);
      if (onNotify) onNotify('Error al crear promoción: ' + err.message, 'error');
    } finally {
      setIsCreatingPromo(false);
    }
  };

  // Métricas y listas filtradas de promociones
  const activePromotionsCount = useMemo(() => {
    return promotionsList.filter(p => isStorePromotionActive(p)).length;
  }, [promotionsList]);

  const promoMetrics = useMemo(() => {
    const total = promotionsList.length;
    const active = promotionsList.filter(p => isStorePromotionActive(p)).length;
    const expired = total - active;
    const totalPushes = promotionsList.reduce((acc, p) => acc + (parseInt(p.totalPushDispatches, 10) || 1), 0);
    const totalClaimed = promotionsList.reduce((acc, p) => acc + (parseInt(p.claimedCount, 10) || 0), 0);
    return { total, active, expired, totalPushes, totalClaimed };
  }, [promotionsList]);

  const filteredPromotionsList = useMemo(() => {
    return promotionsList.filter(promo => {
      // 1. Filtro por comercio
      if (promoStoreFilter !== 'ALL' && String(promo.storeId || '').trim() !== String(promoStoreFilter).trim()) {
        return false;
      }
      // 2. Filtro por estado
      const isActive = isStorePromotionActive(promo);
      if (promoStatusFilter === 'ACTIVE' && !isActive) return false;
      if (promoStatusFilter === 'EXPIRED' && isActive) return false;

      // 3. Filtro por búsqueda
      if (promoSearchQuery.trim()) {
        const query = promoSearchQuery.toLowerCase().trim();
        const title = (promo.title || '').toLowerCase();
        const message = (promo.message || '').toLowerCase();
        const storeName = (promo.storeName || '').toLowerCase();
        const badgeType = (promo.badgeType || '').toLowerCase();
        if (!title.includes(query) && !message.includes(query) && !storeName.includes(query) && !badgeType.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [promotionsList, promoStoreFilter, promoStatusFilter, promoSearchQuery]);

  // DB cleanup state
  const [isCleaningDb, setIsCleaningDb] = useState(false);

  const handleCleanProductionDb = async () => {
    if (!window.confirm('¿Confirmas que deseas limpiar todas las compras, movimientos y canjes de prueba en Cloud Firestore y dejar el sistema limpio para producción?')) {
      return;
    }
    setIsCleaningDb(true);
    try {
      await cleanDatabaseForProduction({
        clearPurchases: true,
        clearMovements: true,
        clearRedemptions: true
      });
      localStorage.removeItem('fidely_purchases');
      localStorage.removeItem('fidely_movements');
      localStorage.removeItem('fidely_redemptions');
      if (setPurchases) setPurchases([]);
      if (setMovements) setMovements([]);
      if (setRedemptions) setRedemptions([]);
      onNotify('¡Base de datos limpia para producción! Compras y canjes reiniciados a 0.', 'success');
    } catch (e) {
      console.error('Error al limpiar base de datos:', e);
      onNotify('Error al limpiar: ' + e.message, 'error');
    } finally {
      setIsCleaningDb(false);
    }
  };

  const handleOpenNewStore = () => {
    setEditingStore(null);
    setStoreForm({
      name: '',
      category: 'Boutique / Ropa & Moda',
      city: '',
      address: '',
      phone: '',
      manager: '',
      email: '',
      cashbackPercent: config?.defaultCashbackPercent ?? 5.0,
      canEditPercent: false
    });
    setShowStoreModal(true);
  };

  const handleOpenEditStore = (st) => {
    setEditingStore(st);
    setStoreForm({
      name: st.name || '',
      category: st.category || 'Boutique / Ropa & Moda',
      city: st.city || '',
      address: st.address || '',
      phone: st.phone || '',
      manager: st.manager || '',
      email: st.email || '',
      cashbackPercent: st.cashbackPercent ?? config?.defaultCashbackPercent ?? 5.0,
      canEditPercent: Boolean(st.canEditPercent)
    });
    setShowStoreModal(true);
  };

  const handleSaveStoreModal = async (e) => {
    e.preventDefault();
    if (!storeForm.name.trim()) {
      onNotify('El nombre de la tienda es requerido', 'error');
      return;
    }

    if (editingStore) {
      const updated = {
        ...editingStore,
        name: storeForm.name.trim(),
        category: storeForm.category || 'Boutique / Ropa & Moda',
        city: storeForm.city.trim() || '',
        address: storeForm.address.trim() || (storeForm.city.trim() ? `${storeForm.city.trim()}, Venezuela` : 'Venezuela'),
        phone: (storeForm.phone || '').trim(),
        manager: storeForm.manager.trim() || 'Encargado de Tienda',
        email: storeForm.email.trim().toLowerCase() || editingStore.email,
        cashbackPercent: parseFloat(storeForm.cashbackPercent || config?.defaultCashbackPercent || 5.0),
        canEditPercent: Boolean(storeForm.canEditPercent),
        updatedAt: new Date().toISOString()
      };
      await saveStore(updated);
      if (setStores) {
        setStores(prev => prev.map(s => s.id === editingStore.id ? updated : s));
      }
      setShowStoreModal(false);
      setEditingStore(null);
      onNotify(`¡Comercio "${updated.name}" actualizado con éxito! (Permiso: ${updated.canEditPercent ? '🟢 Activado' : '🔒 Desactivado'}, %: ${updated.cashbackPercent}%)`, 'success');
      return;
    }

    const existingNumbers = (stores || []).map(s => {
      const m = String(s.id || '').match(/STR-(\d+)/i);
      return m ? parseInt(m[1], 10) : 0;
    });
    const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers, 0) : 0;
    const newStoreId = `STR-${String(maxNum + 1).padStart(2, '0')}`;
    const now = new Date();
    const trialMonths = config?.storeTrialMonths !== undefined ? Math.max(0, parseInt(config.storeTrialMonths, 10) || 0) : 0;
    const trialEnds = trialMonths > 0 ? new Date(now.getTime() + (trialMonths * 30 * 24 * 60 * 60 * 1000)) : now;
    const newStore = {
      id: newStoreId,
      name: storeForm.name.trim(),
      category: storeForm.category || 'Boutique / Ropa & Moda',
      city: storeForm.city.trim() || '',
      address: storeForm.address.trim() || (storeForm.city.trim() ? `${storeForm.city.trim()}, Venezuela` : 'Venezuela'),
      manager: storeForm.manager.trim() || 'Encargado de Tienda',
      email: storeForm.email.trim().toLowerCase() || `${newStoreId.toLowerCase()}@fidely.com`,
      phone: (storeForm.phone || '').trim(),
      qrCode: `FIDELY-LOCAL-${newStoreId}`,
      cashbackPercent: parseFloat(storeForm.cashbackPercent || config?.defaultCashbackPercent || 5.0),
      canEditPercent: Boolean(storeForm.canEditPercent),
      status: 'APROBADO',
      createdAt: now.toISOString(),
      trialMonths: trialMonths,
      trialEndsAt: trialEnds.toISOString(),
      subscriptionStatus: trialMonths > 0 ? 'TRIAL' : 'UNPAID',
      subscriptionPaidUntil: null,
      subscriptionExempt: false
    };

    await saveStore(newStore);
    if (setStores) {
      setStores(prev => [...prev.filter(s => s.id !== newStore.id), newStore]);
    }
    setShowStoreModal(false);
    setStoreForm({ name: '', category: 'Boutique / Ropa & Moda', city: '', address: '', manager: '', email: '', cashbackPercent: 5.0, canEditPercent: false });
    onNotify(`¡Tienda "${newStore.name}" registrada con éxito! (ID: ${newStore.id})`, 'success');
  };

  // Toggle store permission to edit its own cashback percentage
  const handleToggleStorePermission = async (storeId) => {
    const target = stores.find(s => s.id === storeId);
    if (!target) return;
    const newPermission = !target.canEditPercent;
    const updated = { ...target, canEditPercent: newPermission, updatedAt: new Date().toISOString() };
    await saveStore(updated);
    if (setStores) {
      setStores(prev => prev.map(s => s.id === storeId ? updated : s));
    }
    onNotify(
      newPermission 
        ? `¡Configuración de % ACTIVADA individualmente para "${target.name}"! Este comercio ahora puede ajustar su propio porcentaje en su terminal POS.`
        : `Configuración de % DESACTIVADA para "${target.name}". Porcentaje bloqueado bajo control del Administrador.`,
      newPermission ? 'success' : 'info'
    );
  };

  // Adjust store cashback percentage directly from admin
  const handleEditStorePercent = async (storeId) => {
    const target = stores.find(s => s.id === storeId);
    if (!target) return;
    const current = target.cashbackPercent ?? config?.defaultCashbackPercent ?? 5.0;
    const input = window.prompt(`Ingresa el nuevo % de retorno por compra para "${target.name}" (por defecto 5%):`, current);
    if (input === null) return;
    const val = parseFloat(input);
    if (isNaN(val) || val < 1 || val > 50) {
      onNotify('Por favor ingresa un porcentaje válido entre 1% y 50%', 'error');
      return;
    }
    const updated = { ...target, cashbackPercent: val, updatedAt: new Date().toISOString() };
    await saveStore(updated);
    if (setStores) {
      setStores(prev => prev.map(s => s.id === storeId ? updated : s));
    }
    onNotify(`¡Porcentaje de retorno de "${target.name}" actualizado a ${val}%!`, 'success');
  };

  // Approval handlers for Stores and Clients
  const handleUpdateStoreStatus = (storeId, newStatus) => {
    const updated = stores.map(s => {
      if (s.id === storeId) {
        const up = { ...s, status: newStatus, reviewedAt: new Date().toISOString(), reviewedBy: 'ADMIN' };
        saveStore(up);
        return up;
      }
      return s;
    });
    setStores(updated);
    const targetStore = stores.find(s => s.id === storeId);
    const storeName = targetStore?.name || 'Comercio';
    if (newStatus === 'APROBADO') {
      onNotify(`¡Comercio "${storeName}" APROBADO! Ya puede operar y acceder al terminal POS.`, 'success');
    } else if (newStatus === 'RECHAZADO') {
      onNotify(`Comercio "${storeName}" marcado como RECHAZADO.`, 'warning');
    } else {
      onNotify(`Estado del comercio actualizado a: ${newStatus}`, 'info');
    }
  };

  const handleUpdateClientStatus = (clientId, newStatus) => {
    const updated = clients.map(c => {
      if (c.id === clientId) {
        const up = { ...c, status: newStatus, reviewedAt: new Date().toISOString(), reviewedBy: 'ADMIN' };
        saveClient(up);
        return up;
      }
      return c;
    });
    setClients(updated);
    const targetClient = clients.find(c => c.id === clientId);
    const clientName = targetClient?.name || 'Cliente';
    if (newStatus === 'APROBADO') {
      onNotify(`¡Cliente "${clientName}" APROBADO! Su cuenta está activa en fidely CLUB.`, 'success');
    } else if (newStatus === 'RECHAZADO') {
      onNotify(`Cliente "${clientName}" marcado como RECHAZADO.`, 'warning');
    } else {
      onNotify(`Estado del cliente actualizado a: ${newStatus}`, 'info');
    }
  };

  // Permanently delete a store from Cloud Firestore and Realtime Database
  const handleDeleteStore = async (storeId) => {
    const targetStore = stores.find(s => s.id === storeId);
    const storeName = targetStore?.name || 'este comercio';

    if (!window.confirm(`¿Confirmas que deseas eliminar permanentemente la tienda "${storeName}"?\n\nEsta acción borrará el registro de Cloud Firestore, Realtime Database y revocará su acceso en fidely CLUB.`)) {
      return;
    }

    try {
      await removeStore(storeId, targetStore || {});
      setStores(prev => prev.filter(s => s.id !== storeId));

      try {
        const cached = JSON.parse(localStorage.getItem('fidely_stores') || '[]');
        localStorage.setItem('fidely_stores', JSON.stringify(cached.filter(s => s.id !== storeId)));
      } catch (_) {}

      // Limpiar tarjetas de fidelización y balances de la tienda eliminada en todos los clientes
      const updatedClients = clients.map(c => {
        let changed = false;
        let newCards = c.loyaltyCards;
        if (Array.isArray(c.loyaltyCards)) {
          const filtered = c.loyaltyCards.filter(card => card.storeId !== storeId);
          if (filtered.length !== c.loyaltyCards.length) {
            newCards = filtered;
            changed = true;
          }
        }
        let newBalances = c.storeBalances;
        if (c.storeBalances && c.storeBalances[storeId] !== undefined) {
          newBalances = { ...c.storeBalances };
          delete newBalances[storeId];
          changed = true;
        }
        if (changed) {
          const updated = { ...c, loyaltyCards: newCards, storeBalances: newBalances };
          saveClient(updated);
          return updated;
        }
        return c;
      });
      setClients(updatedClients);

      onNotify(`Comercio "${storeName}" eliminado permanentemente de Cloud Firestore y RTDB.`, 'success');
    } catch (err) {
      console.error('Error al eliminar tienda:', err);
      onNotify('Error al eliminar la tienda: ' + err.message, 'error');
    }
  };

  // Permanently delete a client from Cloud Firestore and Realtime Database
  const handleDeleteClient = async (clientId) => {
    const targetClient = clients.find(c => c.id === clientId);
    const clientName = targetClient?.name || 'este cliente';

    if (!window.confirm(`¿Confirmas que deseas eliminar permanentemente al cliente "${clientName}"?\n\nEsta acción borrará sus datos de Cloud Firestore, Realtime Database y revocará su acceso en fidely CLUB.`)) {
      return;
    }

    try {
      await removeClient(clientId, targetClient || {});
      setClients(prev => prev.filter(c => c.id !== clientId));

      try {
        const cached = JSON.parse(localStorage.getItem('fidely_clients') || '[]');
        localStorage.setItem('fidely_clients', JSON.stringify(cached.filter(c => c.id !== clientId)));
      } catch (_) {}

      onNotify(`Cliente "${clientName}" eliminado permanentemente de todas las bases de datos.`, 'success');
    } catch (err) {
      console.error('Error al eliminar cliente:', err);
      onNotify('Error al eliminar cliente: ' + err.message, 'error');
    }
  };

  // Config form state (RN-10)
  const [configForm, setConfigForm] = useState({ ...config });
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  useEffect(() => {
    setConfigForm(prev => ({ ...prev, ...config }));
  }, [config]);

  // Firebase Cloud State
  const [isFbSyncing, setIsFbSyncing] = useState(false);
  const [isTestingFb, setIsTestingFb] = useState(false);
  const [fbTestResult, setFbTestResult] = useState(null);
  const [copiedFbRules, setCopiedFbRules] = useState(false);

  const firestoreRulesSnippet = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Modo desarrollo / pruebas fidelización
    }
  }
}`;

  const handleCopyFbRules = () => {
    navigator.clipboard.writeText(firestoreRulesSnippet);
    setCopiedFbRules(true);
    setTimeout(() => setCopiedFbRules(false), 3000);
    onNotify('Reglas de Firestore copiadas al portapapeles', 'info');
  };

  const handleTestFbConnection = async () => {
    setIsTestingFb(true);
    const res = await checkFirebaseConnection();
    setFbTestResult(res);
    setIsTestingFb(false);
    if (res.connected) {
      onNotify('¡Conexión verificada con el servidor Cloud Firestore!', 'success');
    } else {
      onNotify(res.message || 'Error al conectar con Firestore', 'warning');
    }
  };

  const handleSyncToFirebase = async () => {
    if (!window.confirm('¿Deseas enviar todos los datos actuales a Cloud Firestore (fidelyclub-a70ea)?')) {
      return;
    }
    setIsFbSyncing(true);
    const res = await seedDatabaseToFirebase({
      config,
      stores,
      clients,
      rewards,
      purchases,
      movements,
      redemptions
    });
    setIsFbSyncing(false);
    if (res.success) {
      onNotify('¡Datos sincronizados exitosamente con Cloud Firestore!', 'success');
      handleTestFbConnection();
    } else {
      const msg = res.error?.code === 'permission-denied'
        ? 'Permiso denegado: Aplica las reglas en la consola Cloud > Firestore > Reglas'
        : (res.error?.message || 'Error en sincronización');
      onNotify(msg, 'error');
    }
  };

  // Computed Metrics (Modelo de Fidelidad: Sellos & Tarjetas Digitales)
  const totalClients = clients.length;
  const totalStoresCount = stores.length;

  // Total sellos acreditados en las tarjetas de los clientes
  const totalStampsInCards = clients.reduce((acc, c) => {
    const cards = c.loyaltyCards || [];
    return acc + cards.reduce((cAcc, card) => cAcc + (Number(card.currentStamps) || 0), 0);
  }, 0);
  const totalApprovedStamps = (redemptions || []).filter(r => 
    r.status === 'APROBADO' && (r.type === 'STAMP_REQUEST' || !r.rewardTitle || r.rewardTitle.includes('+1 Sello'))
  ).length;
  const totalStampsIssued = Math.max(totalStampsInCards, totalApprovedStamps);

  // Total premios y canjes entregados
  const totalRewardsRedeemed = (redemptions || []).filter(r => 
    r.status === 'APROBADO' && (r.type === 'STAMP_REWARD_CLAIM' || (r.rewardTitle && !r.rewardTitle.includes('+1 Sello')))
  ).length;

  const totalRevenueUsd = purchases
    .filter(p => p.status === 'VALIDADA')
    .reduce((acc, p) => acc + (Number(p.amountUsd) || 0), 0);
  const avgTicketUsd = purchases.length > 0 ? (totalRevenueUsd / purchases.length).toFixed(2) : '0.00';

  // Helper confiable para extraer timestamp independientemente del formato (string ISO, Firestore Timestamp o número)
  const getClientTimestamp = (c) => {
    if (!c) return 0;
    const val = c.createdAt || c.created_at || c.joinDate || c.memberSince;
    if (!val) return 0;
    if (typeof val === 'object' && typeof val.seconds === 'number') return val.seconds * 1000;
    const t = new Date(val).getTime();
    return isNaN(t) ? 0 : t;
  };

  // Filter and sort clients: newest first, safe null checks including email
  const filteredClients = [...clients]
    .sort((a, b) => getClientTimestamp(b) - getClientTimestamp(a))
    .filter(c => {
      if (!clientSearch.trim()) return true;
      const q = clientSearch.toLowerCase();
      return (
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q) ||
        (c.docId || c.cedula || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.id || '').toLowerCase().includes(q)
      );
    });

  const mgmtTotalPages = Math.max(1, Math.ceil(filteredClients.length / mgmtClientRowsPerPage));
  const paginatedMgmtClients = filteredClients.slice(
    (mgmtClientPage - 1) * mgmtClientRowsPerPage,
    mgmtClientPage * mgmtClientRowsPerPage
  );

  // Handle Manual Stamps Adjustment on Client Loyalty Card (RN-12 Auditoría)
  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustingClient) return;

    const count = parseInt(adjustmentPoints, 10);
    if (isNaN(count) || count <= 0) {
      onNotify('Ingresa una cantidad válida de sellos mayor a 0', 'error');
      return;
    }
    if (!adjustmentReason.trim()) {
      onNotify('El motivo del ajuste es obligatorio para el registro de auditoría (RN-12)', 'error');
      return;
    }

    const isAdd = adjustmentType === 'ADD';
    const delta = isAdd ? count : -count;
    const storeObj = stores.find(s => s.id === adjustmentStoreId) || stores[0];
    const currentDate = new Date().toISOString().replace('T', ' ').slice(0, 16);

    let updatedCards = [];
    let stampsAfter = 0;
    const updatedClients = clients.map(c => {
      if (c.id === adjustingClient.id) {
        const existingCards = [...(c.loyaltyCards || [])];
        const cardIndex = existingCards.findIndex(card => card.storeId === storeObj.id);
        const stampsTarget = storeObj.stampsTarget || 6;

        if (cardIndex >= 0) {
          const current = Number(existingCards[cardIndex].currentStamps || 0);
          const nextStamps = Math.max(0, current + delta);
          stampsAfter = nextStamps;
          existingCards[cardIndex] = {
            ...existingCards[cardIndex],
            currentStamps: nextStamps,
            stampsTarget: existingCards[cardIndex].stampsTarget || stampsTarget,
            storeName: storeObj.name
          };
        } else {
          stampsAfter = Math.max(0, delta);
          existingCards.push({
            storeId: storeObj.id,
            storeName: storeObj.name,
            currentStamps: stampsAfter,
            stampsTarget: stampsTarget,
            createdAt: currentDate
          });
        }
        updatedCards = existingCards;
        return {
          ...c,
          pointsBalance: 0,
          storeBalances: {},
          loyaltyCards: existingCards
        };
      }
      return c;
    });

    const newMovement = {
      id: `MOV-ADJ-${Date.now().toString().slice(-4)}`,
      clientId: adjustingClient.id,
      type: 'AJUSTE_ADMIN',
      points: 0,
      stamps: delta,
      balanceAfter: stampsAfter,
      reference: `ADJ-${adjustingClient.id}`,
      storeId: storeObj.id,
      storeName: storeObj.name,
      authorizedBy: 'Administrador General',
      date: currentDate,
      notes: `Ajuste manual (${isAdd ? 'Acreditación' : 'Débito'}) de sellos en ${storeObj.name}: ${adjustmentReason.trim()} (Total: ${stampsAfter} sellos)`
    };

    setClients(updatedClients);
    setMovements([newMovement, ...movements]);

    try {
      if (saveClient) {
        const clientToSave = updatedClients.find(c => c.id === adjustingClient.id);
        if (clientToSave) await saveClient(clientToSave);
      }
    } catch (err) {
      console.warn("Error guardando cliente tras ajuste:", err);
    }

    setAdjustingClient(null);
    setAdjustmentPoints('');
    setAdjustmentReason('');

    onNotify(`Ajuste de ${delta > 0 ? `+${delta}` : delta} sellos en ${storeObj.name} aplicado a ${adjustingClient.name}`, 'success');
  };

  // Handle Save Reward
  const handleSaveReward = (e) => {
    e.preventDefault();
    if (!rewardForm.title.trim()) {
      onNotify('Por favor completa el título de la recompensa', 'error');
      return;
    }

    const chosenStore = stores.find(s => s.id === rewardForm.storeScope);
    const isGlobal = rewardForm.storeScope === 'ALL';
    const stampsCostParsed = parseInt(rewardForm.stampsCost, 10) || 6;

    if (editingReward) {
      const updatedReward = {
        ...editingReward,
        ...rewardForm,
        pointsCost: 0,
        stampsCost: stampsCostParsed,
        applicableStores: isGlobal ? ['ALL'] : [rewardForm.storeScope],
        createdStoreId: isGlobal ? null : rewardForm.storeScope,
        createdStoreName: isGlobal ? null : (chosenStore?.name || editingReward.createdStoreName || null),
        status: editingReward.status === 'PENDIENTE' ? 'ACTIVO' : (editingReward.status || 'ACTIVO'),
        approvedAt: editingReward.status === 'PENDIENTE' ? new Date().toISOString() : editingReward.approvedAt,
        approvedBy: editingReward.status === 'PENDIENTE' ? 'ADMIN' : editingReward.approvedBy
      };
      const updated = rewards.map(r => 
        r.id === editingReward.id ? updatedReward : r
      );
      setRewards(updated);
      saveReward(updatedReward).catch(err => console.warn('[Firebase] Error guardando recompensa:', err));
      onNotify(`Recompensa "${rewardForm.title}" actualizada y publicada en el catálogo`, 'success');
    } else {
      const newReward = {
        id: `REW-0${rewards.length + 1}`,
        ...rewardForm,
        pointsCost: 0,
        stampsCost: stampsCostParsed,
        applicableStores: isGlobal ? ['ALL'] : [rewardForm.storeScope],
        createdStoreId: isGlobal ? null : rewardForm.storeScope,
        createdStoreName: isGlobal ? null : (chosenStore?.name || null),
        status: 'ACTIVO',
        approvedAt: new Date().toISOString(),
        approvedBy: 'ADMIN',
        iconName: 'Gift'
      };
      setRewards([...rewards, newReward]);
      saveReward(newReward).catch(err => console.warn('[Firebase] Error creando recompensa:', err));
      onNotify(`Recompensa "${newReward.title}" creada en el catálogo`, 'success');
    }

    setShowRewardModal(false);
    setEditingReward(null);
  };

  // Handle Approve Reward Proposed by a Store
  const handleApproveReward = (reward) => {
    const approvedReward = { 
      ...reward, 
      status: 'ACTIVO', 
      approvedAt: new Date().toISOString(),
      approvedBy: 'ADMIN'
    };
    const updated = rewards.map(r => 
      r.id === reward.id ? approvedReward : r
    );
    setRewards(updated);
    saveReward(approvedReward).catch(err => console.warn('[Firebase] Error aprobando recompensa:', err));
    onNotify(`¡Recompensa "${reward.title}" de ${reward.createdStoreName || 'la tienda'} APROBADA! Ya está visible en el catálogo de clientes.`, 'success');
  };

  // Handle Reject Reward Proposed by a Store
  const handleRejectReward = (reward) => {
    const reason = window.prompt(`Indica el motivo del rechazo para "${reward.title}" (opcional):`, 'No cumple con las especificaciones del programa') || 'No cumple con las especificaciones';
    const updated = rewards.map(r => 
      r.id === reward.id ? { 
        ...r, 
        status: 'RECHAZADO', 
        rejectionReason: reason,
        rejectedAt: new Date().toISOString(),
        rejectedBy: 'ADMIN'
      } : r
    );
    setRewards(updated);
    onNotify(`Recompensa "${reward.title}" rechazada.`, 'info');
  };

  // Handle Toggle Reward Active/Inactive Status
  const handleToggleRewardStatus = (reward) => {
    const nextStatus = reward.status === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const updated = rewards.map(r => 
      r.id === reward.id ? { ...r, status: nextStatus } : r
    );
    setRewards(updated);
    onNotify(`Recompensa "${reward.title}" ahora está ${nextStatus === 'ACTIVO' ? 'ACTIVA' : 'INACTIVA'}`, 'info');
  };

  // Handle Save Commercial Rules (RN-10) y Políticas de Push
  const handleSaveConfig = async (e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    setIsSavingConfig(true);
    try {
      const updatedConfig = {
        ...config,
        ...configForm,
        minPurchaseUsd: parseFloat(configForm.minPurchaseUsd) || 0,
        pointsPerUsd: parseFloat(configForm.pointsPerUsd) || 1,
        pointValueUsd: parseFloat(configForm.pointValueUsd) || 0.01,
        defaultCashbackPercent: parseFloat(configForm.defaultCashbackPercent) || 5.0,
        minRedemptionPoints: parseInt(configForm.minRedemptionPoints, 10) || 10,
        pointsValidityMonths: parseInt(configForm.pointsValidityMonths, 10) || 12,
        vesExchangeRate: parseFloat(configForm.vesExchangeRate) || (config && config.vesExchangeRate) || 0,
        // Políticas de Difusión Push y Promociones
        maxMonthlyPushPerStore: configForm.unlimitedPushPerStore ? 0 : (parseInt(configForm.maxMonthlyPushPerStore, 10) || 4),
        unlimitedPushPerStore: Boolean(configForm.unlimitedPushPerStore),
        maxPushRecipientsPerBroadcast: configForm.unlimitedRecipientsPerPush ? 0 : (parseInt(configForm.maxPushRecipientsPerBroadcast, 10) || 100),
        unlimitedRecipientsPerPush: Boolean(configForm.unlimitedRecipientsPerPush),
        allowPushResend: configForm.allowPushResend !== false,
        pushResendCooldownHours: parseInt(configForm.pushResendCooldownHours, 10) || 24,
        // Membresía POS & Período de Prueba de Tiendas
        storeTrialMonths: configForm.storeTrialMonths !== undefined ? Math.max(0, parseInt(configForm.storeTrialMonths, 10) || 0) : 0,
        subscriptionPriceUsd: parseFloat(configForm.subscriptionPriceUsd) >= 0 ? parseFloat(configForm.subscriptionPriceUsd) : 5.0,
        subscriptionPagoMovilBank: configForm.subscriptionPagoMovilBank || 'Banco de Venezuela (0102)',
        subscriptionPagoMovilPhone: configForm.subscriptionPagoMovilPhone || '04242098250',
        subscriptionPagoMovilId: configForm.subscriptionPagoMovilId || 'J410679891',
        subscriptionPagoMovilHolder: configForm.subscriptionPagoMovilHolder || 'fidely CLUB / Conecta2',
        supportWhatsapp: configForm.supportWhatsapp || '584242098250',
        requireStoreApproval: configForm.requireStoreApproval !== false,
      };

      if (setConfig) setConfig(updatedConfig);
      try {
        if (saveConfig) await saveConfig(updatedConfig);
      } catch (err) {
        console.warn('Error guardando config en firestore:', err);
      }

      if (onNotify) {
        onNotify('🎉 ¡Parámetros comerciales y políticas guardados con éxito!', 'success');
      }
    } catch (err) {
      console.error('Error en handleSaveConfig:', err);
      if (onNotify) {
        onNotify('Error al guardar configuración: ' + (err.message || err), 'error');
      }
    } finally {
      setIsSavingConfig(false);
    }
  };

  return (
    <div className="animate-fade-in admin-layout-container">
      {/* SIDEBAR DE NAVEGACIÓN ADMIN */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-title-badge">
            <ShieldCheck size={18} color="var(--c-primary)" />
            <span>Administración</span>
          </div>
          <p className="admin-sidebar-subtitle">Control & Auditoría</p>
        </div>

        <nav aria-label="Navegación Admin" className="admin-sidebar-nav">
          {/* 1. Métricas */}
          <button
            type="button"
            onClick={() => setActiveTab('DASHBOARD')}
            className={`admin-sidebar-link ${activeTab === 'DASHBOARD' ? 'active' : ''}`}
          >
            <div className="admin-sidebar-link-left">
              <BarChart3 size={16} color={activeTab === 'DASHBOARD' ? 'var(--c-accent)' : '#64748B'} />
              <span>Métricas</span>
            </div>
          </button>

          {/* 2. Tiendas */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('APPROVALS');
              setApprovalSection('STORES');
              setApprovalFilter('ALL');
            }}
            className={`admin-sidebar-link ${(activeTab === 'APPROVALS' && approvalSection === 'STORES' && approvalFilter !== 'PENDING') ? 'active' : ''}`}
          >
            <div className="admin-sidebar-link-left">
              <Store size={16} color={(activeTab === 'APPROVALS' && approvalSection === 'STORES' && approvalFilter !== 'PENDING') ? 'var(--c-accent)' : '#64748B'} />
              <span>Tiendas</span>
            </div>
            <span style={{ fontSize: '0.72rem', opacity: 0.75, fontWeight: 700 }}>({stores.length})</span>
          </button>

          {/* 3. Aprobaciones */}
          {(() => {
            const pStores = stores.filter(s => s.status === 'PENDIENTE');
            const pClients = clients.filter(c => c.status === 'PENDIENTE');
            const totalPending = pStores.length + pClients.length;
            const isApprovalsActive = activeTab === 'APPROVALS' && approvalFilter === 'PENDING';

            return (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('APPROVALS');
                  setApprovalSection(pStores.length > 0 ? 'STORES' : 'CLIENTS');
                  setApprovalFilter('PENDING');
                }}
                className={`admin-sidebar-link ${isApprovalsActive ? 'active' : ''}`}
              >
                <div className="admin-sidebar-link-left">
                  <ShieldCheck size={16} color={isApprovalsActive ? 'var(--c-accent)' : '#64748B'} />
                  <span>Aprobaciones</span>
                </div>
                {totalPending > 0 && (
                  <span className="admin-nav-badge" style={{ background: '#EF4444', color: '#FFFFFF' }}>
                    {totalPending}
                  </span>
                )}
              </button>
            );
          })()}

          {/* 4. Pagos POS (Membresías) */}
          <button
            type="button"
            onClick={() => setActiveTab('PAYMENTS')}
            className={`admin-sidebar-link ${activeTab === 'PAYMENTS' ? 'active' : ''}`}
          >
            <div className="admin-sidebar-link-left">
              <CreditCard size={16} color={activeTab === 'PAYMENTS' ? 'var(--c-accent)' : '#64748B'} />
              <span>Pagos POS</span>
            </div>
            {pendingPaymentsCount > 0 && (
              <span className="admin-nav-badge" style={{ background: '#F59E0B', color: '#FFFFFF', boxShadow: '0 1px 3px rgba(245, 158, 11, 0.4)' }}>
                {pendingPaymentsCount}
              </span>
            )}
          </button>

          {/* 5. Clientes */}
          <button
            type="button"
            onClick={() => setActiveTab('CLIENTS')}
            className={`admin-sidebar-link ${activeTab === 'CLIENTS' ? 'active' : ''}`}
          >
            <div className="admin-sidebar-link-left">
              <Users size={16} color={activeTab === 'CLIENTS' ? 'var(--c-accent)' : '#64748B'} />
              <span>Clientes</span>
            </div>
          </button>

          {/* 6. Compras */}
          <button
            type="button"
            onClick={() => setActiveTab('TRANSACTIONS')}
            className={`admin-sidebar-link ${activeTab === 'TRANSACTIONS' ? 'active' : ''}`}
          >
            <div className="admin-sidebar-link-left">
              <FileText size={16} color={activeTab === 'TRANSACTIONS' ? 'var(--c-accent)' : '#64748B'} />
              <span>Compras</span>
            </div>
          </button>

          {/* 7. Catálogo */}
          <button
            type="button"
            onClick={() => setActiveTab('REWARDS')}
            className={`admin-sidebar-link ${activeTab === 'REWARDS' ? 'active' : ''}`}
          >
            <div className="admin-sidebar-link-left">
              <Gift size={16} color={activeTab === 'REWARDS' ? 'var(--c-accent)' : '#64748B'} />
              <span>Catálogo</span>
            </div>
            {rewards.filter(r => r.status === 'PENDIENTE').length > 0 && (
              <span className="admin-nav-badge" style={{ background: '#DE8B76', color: '#FFFFFF' }}>
                {rewards.filter(r => r.status === 'PENDIENTE').length}
              </span>
            )}
          </button>

          {/* 8. Promociones */}
          <button
            type="button"
            onClick={() => setActiveTab('PROMOTIONS')}
            className={`admin-sidebar-link ${activeTab === 'PROMOTIONS' ? 'active' : ''}`}
          >
            <div className="admin-sidebar-link-left">
              <Megaphone size={16} color={activeTab === 'PROMOTIONS' ? 'var(--c-accent)' : '#64748B'} />
              <span>Promociones</span>
            </div>
            {activePromotionsCount > 0 && (
              <span className="admin-nav-badge" style={{ background: '#16A34A', color: '#FFFFFF' }}>
                {activePromotionsCount}
              </span>
            )}
          </button>

          {/* 9. Reglas */}
          <button
            type="button"
            onClick={() => setActiveTab('RULES')}
            className={`admin-sidebar-link ${activeTab === 'RULES' ? 'active' : ''}`}
          >
            <div className="admin-sidebar-link-left">
              <Settings size={16} color={activeTab === 'RULES' ? 'var(--c-accent)' : '#64748B'} />
              <span>Reglas</span>
            </div>
          </button>

          {/* 10. Push Comercios App POS */}
          <button
            type="button"
            onClick={() => setActiveTab('PUSH_STORES')}
            className={`admin-sidebar-link ${activeTab === 'PUSH_STORES' ? 'active' : ''}`}
            title="Enviar notificaciones push a los comercios con app móvil"
          >
            <div className="admin-sidebar-link-left">
              <Smartphone size={16} color={activeTab === 'PUSH_STORES' ? 'var(--c-accent)' : '#64748B'} />
              <span>Push Comercios</span>
            </div>
            {storesWithAppCount > 0 && (
              <span className="admin-nav-badge" style={{ background: '#059669', color: '#FFFFFF' }}>
                {storesWithAppCount}
              </span>
            )}
          </button>
        </nav>
      </aside>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <main className="admin-main-content">
        {/* Top Header */}
        <div style={{ marginBottom: '8px' }}>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
            Panel Administrativo & Auditoría
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '4px 0 0 0' }}>
            Métricas de fidelización, libro de auditoría de sellos, catálogo y reglas comerciales.
          </p>
        </div>

      {/* TAB 1: EXECUTIVE DASHBOARD */}
      {activeTab === 'DASHBOARD' && (
        <div>
          {/* Top KPI Cards Grid with Yellow Accent presence */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '14px', marginBottom: '20px' }}>
            
            {/* KPI 1 */}
            <div className="glass-panel" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>
                  Clientes Registrados
                </span>
                <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: '#F4FBF7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={15} color="var(--c-primary)" />
                </div>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{totalClients}</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--c-emerald)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <ArrowUpRight size={13} /> 100% activos
              </div>
            </div>

            {/* KPI 2: Sellos Emitidos */}
            <div className="glass-panel" style={{ padding: '18px', border: '1.5px solid var(--c-accent)', background: '#FFFEF5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.74rem', color: '#854D0E', textTransform: 'uppercase', fontWeight: 800 }}>
                  Sellos Digitales Acreditados
                </span>
                <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: 'var(--c-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Award size={15} color="#080018" />
                </div>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#080018' }}>{totalStampsIssued} <span style={{ fontSize: '0.9rem', color: '#854D0E' }}>sellos</span></div>
              <div style={{ fontSize: '0.74rem', color: '#854D0E', marginTop: '2px', fontWeight: 600 }}>
                Acreditados en cartillas activas
              </div>
            </div>

            {/* KPI 3 */}
            <div className="glass-panel" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>
                  Premios Entregados
                </span>
                <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Gift size={15} color="var(--c-emerald)" />
                </div>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--c-emerald)' }}>{totalRewardsRedeemed}</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Canjes en mostrador completados
              </div>
            </div>

            {/* KPI 4: Comercios Aliados */}
            <div
              className="glass-panel"
              onClick={() => {
                setActiveTab('APPROVALS');
                setApprovalSection('STORES');
                setApprovalFilter('ALL');
              }}
              style={{ padding: '18px', cursor: 'pointer', transition: 'all 0.15s ease' }}
              title="Ver todas las tiendas aliadas"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>
                  Comercios Aliados
                </span>
                <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: '#F4FBF7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Store size={15} color="var(--c-primary)" />
                </div>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{totalStoresCount}</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--c-primary)', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                Ver tiendas registradas →
              </div>
            </div>
          </div>

          {/* Secondary Modules */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '20px' }}>
            
            {/* Store Performance */}
            <div className="glass-panel" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Store size={17} color="var(--c-primary)" />
                  Rendimiento por Sucursal
                </h3>
                <button
                  type="button"
                  onClick={handleOpenNewStore}
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={13} />
                  <span>Registrar Tienda</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {stores.map(store => {
                  const storePurchases = purchases.filter(p => p.storeId === store.id && p.status === 'VALIDADA');
                  const storeSales = storePurchases.reduce((acc, p) => acc + p.amountUsd, 0);
                  const storePts = storePurchases.reduce((acc, p) => acc + p.pointsEarned, 0);

                  return (
                    <div key={store.id} style={{ background: '#F4FBF7', padding: '12px 14px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <StoreLogoBadge store={store} size={36} borderRadius="10px" />
                          <div>
                            <strong style={{ fontSize: '0.88rem' }}>{store.name}</strong>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{store.manager} • {store.city}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--c-primary)' }}>
                            US${storeSales.toFixed(2)}
                          </span>
                          <div style={{ fontSize: '0.72rem', color: '#854D0E', fontWeight: 700 }}>{storePurchases.length} compras</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Financial Program Economics */}
            <div className="glass-panel" style={{ padding: '22px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={17} color="var(--c-primary)" />
                Economía del Programa (Cartillas & Sellos)
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Ticket Promedio Fidelizado:</span>
                  <strong>US${avgTicketUsd}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Modelo de Fidelización:</span>
                  <span className="badge badge-accent">Cartillas Digitales de Sellos</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Beneficio Nuevos Clientes:</span>
                  <strong>Cupón 1er Consumo Bonificado</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Tasa Oficial BCV:</span>
                  <strong>1 USD = {config.vesExchangeRate.toFixed(2)} VES</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Tasa Oficial Moneda Nacional:</span>
                  <strong>1 USD = {config.vesExchangeRate.toFixed(2)} VES</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total Ventas Registradas:</span>
                  <strong style={{ color: 'var(--c-primary)', fontSize: '1rem' }}>US${totalRevenueUsd.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLIENTS */}
      {activeTab === 'CLIENTS' && (
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Gestión de Clientes</h2>
            </div>

            <div className="admin-search-wrapper">
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Buscar cliente..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                style={{ paddingLeft: '32px' }}
              />
            </div>
          </div>

          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contacto & Doc</th>
                  <th>Nivel</th>
                  <th>Tarjetas & Sellos Acumulados</th>
                  <th>Miembro Desde</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMgmtClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No se encontraron clientes con los criterios actuales.
                    </td>
                  </tr>
                ) : (
                  paginatedMgmtClients.map(c => {
                  const activeCards = (c.loyaltyCards || []);
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <strong>{c.name}</strong>
                          {(c.registrationSource === 'GOOGLE_AUTH' || c.registrationSource === 'GOOGLE_SIGN_IN' || c.registrationSource === 'QR_FAST_PASS') && (
                            <span style={{ fontSize: '0.66rem', background: '#E0F2FE', color: '#0369A1', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                              🌐 Google
                            </span>
                          )}
                          {c.registrationSource === 'QR_FAST_PASS' && (
                            <span style={{ fontSize: '0.66rem', background: '#DCFCE7', color: '#166534', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                              ⚡ QR Rápido
                            </span>
                          )}
                          {c.registrationSource === 'CONECTA2_RTDB_SYNC' && (
                            <span style={{ fontSize: '0.66rem', background: '#FFF7ED', color: '#C2410C', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                              📱 Conecta2
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>ID: {c.id}</div>
                      </td>
                      <td>
                        {c.email ? (
                          <div style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--c-primary)', wordBreak: 'break-all' }}>
                            {c.email}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>Sin correo</div>
                        )}
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-main)', marginTop: '2px' }}>
                          {c.phone ? `Tlf: ${c.phone}` : <span style={{ color: 'var(--text-dim)' }}>Sin teléfono</span>} • <span style={{ color: 'var(--text-muted)' }}>Doc: {c.docId || c.cedula || 'N/A'}</span>
                        </div>
                        {c.registeredViaStoreId && (
                          <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
                            📍 Tienda: {c.registeredViaStoreId}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-primary">{c.tier || 'Cliente'}</span>
                      </td>
                      <td>
                        {activeCards.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {activeCards.map((card, idx) => (
                              <div key={idx} style={{ fontSize: '0.78rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: 700 }}>{card.storeName || card.storeId}:</span>
                                <span className="badge badge-accent" style={{ fontSize: '0.72rem' }}>
                                  ⭐ {card.currentStamps || 0} / {card.stampsTarget || 6} sellos
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>Sin tarjetas selladas aún</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {c.memberSince || 'Activo'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustingClient(c);
                              setAdjustmentStoreId(stores[0]?.id || 'STR-01');
                              setAdjustmentPoints('1');
                              setAdjustmentType('ADD');
                            }}
                            className="btn btn-secondary"
                            style={{
                              padding: '5px 8px',
                              fontSize: '0.76rem',
                              color: 'var(--c-primary)',
                              borderColor: 'var(--c-primary-soft)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Ajustar sellos en cartilla del cliente"
                          >
                            <Sliders size={12} />
                            <span>Ajustar Sellos</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteClient(c.id)}
                            className="btn btn-secondary"
                            style={{
                              padding: '5px 8px',
                              fontSize: '0.76rem',
                              color: '#DC2626',
                              borderColor: '#FECDD3',
                              background: '#FFF1F2',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Eliminar cliente permanentemente"
                          >
                            <Trash2 size={12} />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={mgmtClientPage}
            totalItems={filteredClients.length}
            rowsPerPage={mgmtClientRowsPerPage}
            onPageChange={setMgmtClientPage}
            onRowsPerPageChange={setMgmtClientRowsPerPage}
            itemLabel="socios/clientes"
          />
        </div>
      )}

      {/* TAB 3: TRANSACTIONS */}
      {activeTab === 'TRANSACTIONS' && (() => {
        const paginatedPurchases = purchases.slice(
          (txPage - 1) * txRowsPerPage,
          txPage * txRowsPerPage
        );

        return (
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ marginBottom: '14px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Libro de Compras & Ventas</h2>
            </div>

            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Factura</th>
                    <th>Cliente</th>
                    <th>Sucursal</th>
                    <th>Fecha</th>
                    <th>Monto USD</th>
                    <th>Monto VES</th>
                    <th>Tasa</th>
                    <th>Beneficio</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        No hay transacciones registradas aún.
                      </td>
                    </tr>
                  ) : (
                    paginatedPurchases.map(p => (
                      <tr key={p.id}>
                        <td><strong>{p.reference}</strong></td>
                        <td>{p.clientName}</td>
                        <td>{p.storeName}</td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{p.date}</td>
                        <td><strong>US${p.amountUsd.toFixed(2)}</strong></td>
                        <td>{p.amountVes ? `${p.amountVes.toFixed(2)} VES` : '-'}</td>
                        <td>{p.exchangeRate ? `${p.exchangeRate.toFixed(2)} Bs/$` : '-'}</td>
                        <td>
                          <span className="badge badge-accent">+1 Sello Digital</span>
                        </td>
                        <td>
                          <span className={`badge ${
                            p.status === 'VALIDADA' ? 'badge-emerald' :
                            p.status === 'DEVUELTA' ? 'badge-rose' : 'badge-accent'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={txPage}
              totalItems={purchases.length}
              rowsPerPage={txRowsPerPage}
              onPageChange={setTxPage}
              onRowsPerPageChange={setTxRowsPerPage}
              itemLabel="transacciones"
            />
          </div>
        );
      })()}

      {/* TAB: PAGOS DE MEMBRESÍAS DE TIENDAS */}
      {activeTab === 'PAYMENTS' && (() => {
        // Filtrado por estado
        const filteredByStatus = consolidatedPayments.filter(p => {
          if (paymentsFilter === 'PENDING') return p.status === 'PENDIENTE';
          if (paymentsFilter === 'APPROVED') return p.status === 'APROBADO';
          if (paymentsFilter === 'REJECTED') return p.status === 'RECHAZADO';
          return true;
        });

        // Filtrado por búsqueda
        const q = paymentsSearch.trim().toLowerCase();
        const filteredPayments = filteredByStatus.filter(p => {
          if (!q) return true;
          return (
            (p.storeName || '').toLowerCase().includes(q) ||
            (p.storeId || '').toLowerCase().includes(q) ||
            (p.reference || '').toLowerCase().includes(q) ||
            (p.bankOrigin || '').toLowerCase().includes(q) ||
            (p.payerPhone || '').toLowerCase().includes(q) ||
            String(p.amountVes || '').includes(q)
          );
        });

        const paginatedPayments = filteredPayments.slice(
          (paymentsPage - 1) * paymentsRowsPerPage,
          paymentsPage * paymentsRowsPerPage
        );

        const totalPending = consolidatedPayments.filter(p => p.status === 'PENDIENTE').length;
        const totalApproved = consolidatedPayments.filter(p => p.status === 'APROBADO').length;
        const totalRejected = consolidatedPayments.filter(p => p.status === 'RECHAZADO').length;
        const totalCollectedVes = consolidatedPayments
          .filter(p => p.status === 'APROBADO')
          .reduce((sum, p) => sum + (parseFloat(p.amountVes) || 0), 0);
        const totalCollectedUsd = consolidatedPayments
          .filter(p => p.status === 'APROBADO')
          .reduce((sum, p) => sum + (parseFloat(p.amountUsd) || 5), 0);

        return (
          <div className="glass-panel" style={{ padding: 'clamp(10px, 3vw, 22px)', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
            <style>{`
              .admin-payments-kpis {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 12px;
                margin-bottom: 20px;
                width: 100%;
                max-width: 100%;
                box-sizing: border-box;
              }
              .admin-payments-kpis > div {
                min-width: 0;
                overflow: hidden;
                box-sizing: border-box;
              }
              .admin-payments-table-view {
                display: block;
                width: 100%;
                max-width: 100%;
                overflow-x: auto;
                box-sizing: border-box;
              }
              .admin-payments-cards-view {
                display: none;
                width: 100%;
                max-width: 100%;
                box-sizing: border-box;
              }
              .admin-payments-filters-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 12px;
                margin-bottom: 16px;
                width: 100%;
                max-width: 100%;
                min-width: 0;
                box-sizing: border-box;
              }
              .admin-payments-filter-pills {
                display: flex;
                gap: 4px;
                background: #FAF8F5;
                padding: 4px;
                border-radius: 10px;
                border: 1px solid var(--border-subtle);
                max-width: 100%;
                min-width: 0;
                box-sizing: border-box;
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
              }
              .admin-payments-filter-pills button {
                flex-shrink: 0;
              }
              .admin-payments-search {
                width: 280px;
                max-width: 100%;
                box-sizing: border-box;
              }

              @media (max-width: 960px) {
                .admin-payments-table-view {
                  display: none !important;
                }
                .admin-payments-cards-view {
                  display: flex !important;
                  flex-direction: column !important;
                  gap: 10px !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  box-sizing: border-box !important;
                  margin-bottom: 16px !important;
                }
                .admin-payments-kpis {
                  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                  gap: 8px !important;
                  margin-bottom: 14px !important;
                }
                .admin-payments-kpis > div {
                  padding: 10px 12px !important;
                  min-width: 0 !important;
                  overflow: hidden !important;
                }
                .admin-payments-kpis > div > div:nth-child(2) {
                  font-size: clamp(1rem, 3.5vw, 1.25rem) !important;
                  word-break: break-all !important;
                }
                .admin-payments-filters-row {
                  flex-direction: column !important;
                  align-items: stretch !important;
                  gap: 10px !important;
                }
                .admin-payments-filter-pills {
                  width: 100% !important;
                  overflow-x: auto !important;
                  white-space: nowrap !important;
                  padding-bottom: 4px !important;
                  -webkit-overflow-scrolling: touch !important;
                }
                .admin-payments-filter-pills button {
                  flex-shrink: 0 !important;
                }
                .admin-payments-search {
                  width: 100% !important;
                }
              }

              @media (max-width: 480px) {
                .admin-payments-kpis {
                  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                  gap: 6px !important;
                }
                .admin-payments-kpis > div {
                  padding: 8px 10px !important;
                }
                .admin-payments-kpis > div > div:nth-child(1) {
                  font-size: 0.62rem !important;
                }
                .admin-payments-kpis > div > div:nth-child(2) {
                  font-size: 0.94rem !important;
                }
                .admin-payments-kpis > div > div:nth-child(3) {
                  font-size: 0.60rem !important;
                }
              }
            `}</style>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '16px', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ minWidth: 0, flex: '1 1 260px' }}>
                <h2 style={{ fontSize: 'clamp(1.05rem, 4vw, 1.25rem)', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', wordBreak: 'break-word' }}>
                  <CreditCard size={20} color="var(--c-primary)" style={{ flexShrink: 0 }} />
                  <span>Control de Pagos Móvil & Membresías POS</span>
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '4px 0 0 0', lineHeight: 1.4, wordBreak: 'break-word' }}>
                  Concilia y valida los pagos de $5 USD (tasa BCV) reportados por los comercios con referencia, teléfono y banco de origen.
                </p>
              </div>

              {totalPending > 0 && (
                <div style={{
                  background: '#FEF3C7',
                  border: '1.5px solid #FCD34D',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#92400E',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  boxSizing: 'border-box',
                  maxWidth: '100%',
                  wordBreak: 'break-word'
                }}>
                  <Clock size={15} style={{ flexShrink: 0 }} />
                  <span>{totalPending} comprobante(s) esperando validación</span>
                </div>
              )}
            </div>

            {/* Tarjetas KPI Resumen */}
            <div className="admin-payments-kpis">
              <div style={{ background: '#FFFFFF', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', borderLeft: '4px solid #F59E0B' }}>
                <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Por Verificar</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#B45309', marginTop: '4px' }}>
                  {totalPending}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Reportes en espera</div>
              </div>

              <div style={{ background: '#FFFFFF', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', borderLeft: '4px solid #16A34A' }}>
                <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Pagos Aprobados</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#16A34A', marginTop: '4px' }}>
                  {totalApproved}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Membresías activadas</div>
              </div>

              <div style={{ background: '#FFFFFF', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', borderLeft: '4px solid #3B82F6' }}>
                <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total USD</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1E40AF', marginTop: '4px' }}>
                  ${totalCollectedUsd.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Equivalente acumulado</div>
              </div>

              <div style={{ background: '#FFFFFF', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', borderLeft: '4px solid #8B5CF6' }}>
                <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Bs. (BCV)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#6D28D9', marginTop: '4px', wordBreak: 'break-all' }}>
                  Bs. {totalCollectedVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>A tasa oficial BCV</div>
              </div>
            </div>

            {/* Barra de Filtros y Búsqueda */}
            <div className="admin-payments-filters-row">
              <div className="admin-payments-filter-pills">
                {[
                  { id: 'ALL', label: `Todos (${consolidatedPayments.length})` },
                  { id: 'PENDING', label: `⏳ Pendientes (${totalPending})` },
                  { id: 'APPROVED', label: `✓ Aprobados (${totalApproved})` },
                  { id: 'REJECTED', label: `✕ Rechazados (${totalRejected})` }
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPaymentsFilter(f.id)}
                    style={{
                      padding: '5px 12px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      border: 'none',
                      borderRadius: '8px',
                      background: paymentsFilter === f.id ? '#FFFFFF' : 'transparent',
                      color: paymentsFilter === f.id ? 'var(--c-primary)' : 'var(--text-muted)',
                      boxShadow: paymentsFilter === f.id ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="admin-search-wrapper admin-payments-search">
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  placeholder="Buscar por tienda, referencia, banco, teléfono..."
                  value={paymentsSearch}
                  onChange={(e) => setPaymentsSearch(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '30px', fontSize: '0.78rem', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* 1. VISTA MÓVIL (TARJETAS RESPONSIVE PARA SMARTPHONES) */}
            <div className="admin-payments-cards-view">
              {paginatedPayments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)', background: '#FFFFFF', borderRadius: '14px', border: '1px solid #EDE2D5' }}>
                  <CreditCard size={32} style={{ opacity: 0.3, margin: '0 auto 8px auto', display: 'block' }} />
                  <div style={{ fontWeight: 700, fontSize: '0.90rem' }}>No se encontraron reportes de pago</div>
                  <div style={{ fontSize: '0.74rem', marginTop: '2px' }}>
                    {paymentsSearch ? 'Intenta con otro término de búsqueda.' : 'Los pagos reportados aparecerán aquí.'}
                  </div>
                </div>
              ) : (
                paginatedPayments.map((p, idx) => {
                  const targetStore = (stores || []).find(s => s.id === p.storeId);
                  const isPending = p.status === 'PENDIENTE';
                  const isApproved = p.status === 'APROBADO';
                  const isRejected = p.status === 'RECHAZADO';
                  const cleanPayerPhone = (p.payerPhone || targetStore?.phone || '').replace(/[^0-9]/g, '');

                  return (
                    <div
                      key={p.id || `${p.storeId}-${p.reference}-${idx}`}
                      style={{
                        background: isPending ? '#FFFBEB' : '#FFFFFF',
                        border: `1.5px solid ${isPending ? '#FCD34D' : '#EDE2D5'}`,
                        borderRadius: '14px',
                        padding: '14px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        boxSizing: 'border-box',
                        width: '100%'
                      }}
                    >
                      {/* Cabecera de la tarjeta: Tienda + Estado */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                          {targetStore && <StoreLogoBadge store={targetStore} size={36} borderRadius="8px" />}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.88rem', wordBreak: 'break-word', lineHeight: 1.2 }}>
                              {p.storeName || targetStore?.name || p.storeId}
                            </div>
                            <div style={{ fontSize: '0.70rem', color: 'var(--text-dim)', fontFamily: 'monospace', marginTop: '1px' }}>
                              {p.storeId} {targetStore?.city ? `• ${targetStore.city}` : ''}
                            </div>
                          </div>
                        </div>

                        <div style={{ flexShrink: 0 }}>
                          {isPending && (
                            <span style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D', padding: '3px 8px', borderRadius: '8px', fontSize: '0.68rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <Clock size={11} />
                              <span>Por Verificar</span>
                            </span>
                          )}
                          {isApproved && (
                            <span style={{ background: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0', padding: '3px 8px', borderRadius: '8px', fontSize: '0.68rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <CheckCircle2 size={11} />
                              <span>Aprobado</span>
                            </span>
                          )}
                          {isRejected && (
                            <span style={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA', padding: '3px 8px', borderRadius: '8px', fontSize: '0.68rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <AlertCircle size={11} />
                              <span>Rechazado</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bloque Informativo del Pago */}
                      <div style={{
                        background: isPending ? 'rgba(254, 243, 199, 0.45)' : '#FAF8F5',
                        border: '1px solid #EDE2D5',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: '8px',
                        fontSize: '0.76rem',
                        marginBottom: '10px',
                        boxSizing: 'border-box'
                      }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.64rem', color: 'var(--text-dim)', fontWeight: 700 }}>REFERENCIA</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px', minWidth: 0 }}>
                            <code style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--text-main)', wordBreak: 'break-all', overflowWrap: 'anywhere' }}>{p.reference}</code>
                            <button
                              type="button"
                              onClick={() => { navigator.clipboard.writeText(p.reference); onNotify('Referencia copiada', 'info'); }}
                              style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}
                              title="Copiar referencia"
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.64rem', color: 'var(--text-dim)', fontWeight: 700 }}>MONTO</div>
                          <div style={{ fontWeight: 900, color: 'var(--c-primary)', fontSize: '0.88rem', wordBreak: 'break-all' }}>
                            Bs. {parseFloat(p.amountVes || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div style={{ fontSize: '0.64rem', color: 'var(--text-dim)' }}>(${p.amountUsd || 5} USD)</div>
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.64rem', color: 'var(--text-dim)', fontWeight: 700 }}>BANCO EMISOR</div>
                          <div style={{ fontWeight: 700, color: '#334155', wordBreak: 'break-word' }}>{p.bankOrigin || 'No especificado'}</div>
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.64rem', color: 'var(--text-dim)', fontWeight: 700 }}>TELÉFONO EMISOR</div>
                          <div style={{ fontWeight: 700, color: '#0F172A', fontFamily: 'monospace', wordBreak: 'break-all' }}>{p.payerPhone || targetStore?.phone || 'No especificado'}</div>
                        </div>

                        <div style={{ gridColumn: '1 / -1', fontSize: '0.68rem', color: 'var(--text-dim)', borderTop: '1px dashed #EDE2D5', paddingTop: '4px' }}>
                          📅 <strong>Reportado:</strong> {p.reportedAt ? new Date(p.reportedAt).toLocaleString('es-VE') : 'N/A'}
                        </div>
                      </div>

                      {/* Botones de Acción Móvil */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {isPending && (
                          <button
                            type="button"
                            onClick={() => handleApproveSubscriptionPayment(p, 1)}
                            className="btn btn-emerald"
                            style={{ flex: '1 1 130px', padding: '8px 12px', fontSize: '0.78rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                          >
                            <Check size={14} />
                            <span>Aprobar Pago ($5)</span>
                          </button>
                        )}

                        {cleanPayerPhone && (
                          <a
                            href={`https://wa.me/${cleanPayerPhone}?text=${encodeURIComponent(`Hola ${p.storeName || targetStore?.name || ''}, te contactamos desde fidely CLUB respecto al reporte de pago móvil por Bs. ${p.amountVes} (Ref: ${p.reference}).`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              background: '#ECFDF5',
                              color: '#059669',
                              border: '1px solid #A7F3D0',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              textDecoration: 'none',
                              flex: '1 1 auto'
                            }}
                          >
                            <MessageCircle size={14} />
                            <span>WhatsApp</span>
                          </a>
                        )}

                        {isPending && (
                          <button
                            type="button"
                            onClick={() => handleRejectSubscriptionPayment(p)}
                            className="btn btn-rose"
                            style={{ padding: '8px 10px', fontSize: '0.76rem', fontWeight: 700 }}
                            title="Rechazar comprobante"
                          >
                            <X size={14} />
                          </button>
                        )}

                        {targetStore && (
                          <button
                            type="button"
                            onClick={() => setSubscriptionStore(targetStore)}
                            className="btn btn-secondary"
                            style={{ padding: '8px 10px', fontSize: '0.76rem', fontWeight: 700 }}
                            title="Gestionar membresía"
                          >
                            <CreditCard size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 2. VISTA ESCRITORIO (TABLA COMPLETA) */}
            <div className="custom-table-container admin-payments-table-view">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Comercio / Tienda</th>
                    <th>Referencia</th>
                    <th>Banco Emisor</th>
                    <th>Teléfono Emisor</th>
                    <th>Monto Bs.</th>
                    <th>Fecha Reporte</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '44px 20px', color: 'var(--text-muted)' }}>
                        <CreditCard size={32} style={{ opacity: 0.3, margin: '0 auto 8px auto', display: 'block' }} />
                        <div style={{ fontWeight: 700, fontSize: '0.90rem' }}>No se encontraron reportes de pago</div>
                        <div style={{ fontSize: '0.74rem' }}>
                          {paymentsSearch ? 'Intenta con otro término de búsqueda.' : 'Los pagos reportados por las tiendas aparecerán aquí en vivo.'}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedPayments.map((p, idx) => {
                      const targetStore = (stores || []).find(s => s.id === p.storeId);
                      const isPending = p.status === 'PENDIENTE';
                      const isApproved = p.status === 'APROBADO';
                      const isRejected = p.status === 'RECHAZADO';
                      const cleanPayerPhone = (p.payerPhone || targetStore?.phone || '').replace(/[^0-9]/g, '');

                      return (
                        <tr key={p.id || `${p.storeId}-${p.reference}-${idx}`} style={{ background: isPending ? '#FFFBEB' : undefined }}>
                          {/* Comercio */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {targetStore && <StoreLogoBadge store={targetStore} size={32} borderRadius="8px" />}
                              <div>
                                <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.84rem' }}>
                                  {p.storeName || targetStore?.name || p.storeId}
                                </div>
                                <div style={{ fontSize: '0.70rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                                  {p.storeId} {targetStore?.city ? `• ${targetStore.city}` : ''}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Referencia */}
                          <td>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <code style={{
                                background: '#FAF8F5',
                                border: '1px solid #EDE2D5',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontWeight: 800,
                                fontSize: '0.84rem',
                                color: 'var(--text-main)'
                              }}>
                                {p.reference}
                              </code>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(p.reference);
                                  onNotify('Referencia copiada', 'info');
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                title="Copiar referencia"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          </td>

                          {/* Banco Emisor */}
                          <td>
                            <div style={{ fontSize: '0.80rem', fontWeight: 700, color: '#334155' }}>
                              {p.bankOrigin || 'No especificado'}
                            </div>
                          </td>

                          {/* Teléfono Emisor */}
                          <td>
                            <div style={{ fontSize: '0.80rem', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>
                              {p.payerPhone || targetStore?.phone || 'No especificado'}
                            </div>
                          </td>

                          {/* Monto */}
                          <td>
                            <div>
                              <strong style={{ fontSize: '0.88rem', color: 'var(--c-primary)' }}>
                                Bs. {parseFloat(p.amountVes || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </strong>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                                (${p.amountUsd || 5} USD)
                              </div>
                            </div>
                          </td>

                          {/* Fecha */}
                          <td style={{ fontSize: '0.74rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                            {p.reportedAt ? new Date(p.reportedAt).toLocaleString('es-VE') : 'N/A'}
                          </td>

                          {/* Estado */}
                          <td>
                            {isPending && (
                              <span style={{
                                background: '#FEF3C7',
                                color: '#B45309',
                                border: '1px solid #FCD34D',
                                padding: '3px 8px',
                                borderRadius: '8px',
                                fontSize: '0.70rem',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <Clock size={11} />
                                <span>Por Verificar</span>
                              </span>
                            )}
                            {isApproved && (
                              <span style={{
                                background: '#DCFCE7',
                                color: '#15803D',
                                border: '1px solid #BBF7D0',
                                padding: '3px 8px',
                                borderRadius: '8px',
                                fontSize: '0.70rem',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <CheckCircle2 size={11} />
                                <span>Aprobado</span>
                              </span>
                            )}
                            {isRejected && (
                              <span style={{
                                background: '#FEE2E2',
                                color: '#991B1B',
                                border: '1px solid #FECACA',
                                padding: '3px 8px',
                                borderRadius: '8px',
                                fontSize: '0.70rem',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <AlertCircle size={11} />
                                <span>Rechazado</span>
                              </span>
                            )}
                          </td>

                          {/* Acciones */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              {cleanPayerPhone && (
                                <a
                                  href={`https://wa.me/${cleanPayerPhone}?text=${encodeURIComponent(`Hola ${p.storeName || targetStore?.name || ''}, te contactamos desde fidely CLUB respecto al reporte de pago móvil por Bs. ${p.amountVes} (Ref: ${p.reference}).`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    padding: '5px 8px',
                                    borderRadius: '6px',
                                    background: '#ECFDF5',
                                    color: '#059669',
                                    border: '1px solid #A7F3D0',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    textDecoration: 'none'
                                  }}
                                  title="Abrir chat en WhatsApp"
                                >
                                  <MessageCircle size={13} />
                                  <span>WhatsApp</span>
                                </a>
                              )}

                              {isPending && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleApproveSubscriptionPayment(p, 1)}
                                    className="btn btn-emerald"
                                    style={{ padding: '5px 10px', fontSize: '0.72rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    title="Aprobar pago y activar terminal por 1 mes"
                                  >
                                    <Check size={12} />
                                    <span>Aprobar</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleRejectSubscriptionPayment(p)}
                                    className="btn btn-rose"
                                    style={{ padding: '5px 8px', fontSize: '0.72rem', fontWeight: 700 }}
                                    title="Rechazar comprobante"
                                  >
                                    <X size={12} />
                                  </button>
                                </>
                              )}

                              {targetStore && (
                                <button
                                  type="button"
                                  onClick={() => setSubscriptionStore(targetStore)}
                                  className="btn btn-secondary"
                                  style={{ padding: '5px 8px', fontSize: '0.72rem', fontWeight: 700 }}
                                  title="Gestionar membresía de la tienda"
                                >
                                  <CreditCard size={12} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={paymentsPage}
              totalItems={filteredPayments.length}
              rowsPerPage={paymentsRowsPerPage}
              onPageChange={setPaymentsPage}
              onRowsPerPageChange={setPaymentsRowsPerPage}
              itemLabel="pagos"
            />
          </div>
        );
      })()}

      {/* TAB: APROBACIONES DE TIENDAS Y CLIENTES */}
      {activeTab === 'APPROVALS' && (() => {
        const pendingStores = stores.filter(s => s.status === 'PENDIENTE');
        const pendingClients = clients.filter(c => c.status === 'PENDIENTE');

        // Estadísticas de Membresía y Acceso al Panel para Tiendas
        let storeTrialCount = 0;
        let storePaidCount = 0;
        let storeBlockedCount = 0;
        let storeExemptCount = 0;
        let storePendingPaymentsCount = 0;

        (stores || []).forEach(st => {
          const sub = getStoreSubscriptionDetails(st, config, dolarRateInfo);
          if (st.pendingSubscriptionPayment) storePendingPaymentsCount++;
          if (sub.isExempt) storeExemptCount++;
          else if (sub.isPaidActive) storePaidCount++;
          else if (sub.isInTrial) storeTrialCount++;
          else if (sub.isBlocked) storeBlockedCount++;
        });

        // Filter stores (más nuevas primero)
        const sortedStores = [...stores].sort((a, b) => {
          const mA = String(a.id || '').match(/STR-(\d+)/i);
          const mB = String(b.id || '').match(/STR-(\d+)/i);
          const numA = mA ? parseInt(mA[1], 10) : 0;
          const numB = mB ? parseInt(mB[1], 10) : 0;
          return numB - numA;
        });
        const filteredStores = sortedStores.filter(s => {
          const sub = getStoreSubscriptionDetails(s, config, dolarRateInfo);
          const matchFilter = 
            approvalFilter === 'ALL' ? true :
            approvalFilter === 'TRIAL' ? sub.isInTrial :
            approvalFilter === 'ACTIVE' ? sub.isPaidActive :
            approvalFilter === 'BLOCKED' ? sub.isBlocked :
            approvalFilter === 'EXEMPT' ? sub.isExempt :
            approvalFilter === 'PENDING' ? (s.status === 'PENDIENTE') :
            approvalFilter === 'APPROVED' ? (s.status === 'APROBADO' || !s.status) :
            approvalFilter === 'REJECTED' ? (s.status === 'RECHAZADO') :
            approvalFilter === 'PAYMENTS' ? Boolean(s.pendingSubscriptionPayment) : true;
          const matchSearch = 
            !approvalSearch.trim() ||
            s.name?.toLowerCase().includes(approvalSearch.toLowerCase()) ||
            s.city?.toLowerCase().includes(approvalSearch.toLowerCase()) ||
            s.category?.toLowerCase().includes(approvalSearch.toLowerCase()) ||
            s.manager?.toLowerCase().includes(approvalSearch.toLowerCase()) ||
            s.email?.toLowerCase().includes(approvalSearch.toLowerCase()) ||
            s.id?.toLowerCase().includes(approvalSearch.toLowerCase());
          return matchFilter && matchSearch;
        });

        // Filter and sort clients: newest first
        const sortedClientsList = [...clients]
          .sort((a, b) => getClientTimestamp(b) - getClientTimestamp(a));

        const filteredClientsList = sortedClientsList.filter(c => {
          const matchFilter = 
            approvalFilter === 'ALL' ? true :
            approvalFilter === 'PENDING' ? (c.status === 'PENDIENTE') :
            approvalFilter === 'APPROVED' ? (c.status === 'APROBADO' || c.status === 'ACTIVO' || !c.status) :
            approvalFilter === 'REJECTED' ? (c.status === 'RECHAZADO') : true;
          const matchSearch = 
            !approvalSearch.trim() ||
            (c.name || '').toLowerCase().includes(approvalSearch.toLowerCase()) ||
            (c.docId || c.cedula || '').toLowerCase().includes(approvalSearch.toLowerCase()) ||
            (c.phone || '').includes(approvalSearch) ||
            (c.email || '').toLowerCase().includes(approvalSearch.toLowerCase()) ||
            (c.id || '').toLowerCase().includes(approvalSearch.toLowerCase());
          return matchFilter && matchSearch;
        });

        const paginatedClientsList = filteredClientsList.slice(
          (approvalClientPage - 1) * approvalClientRowsPerPage,
          approvalClientPage * approvalClientRowsPerPage
        );

        const paginatedStoresList = filteredStores.slice(
          (approvalStorePage - 1) * approvalStoreRowsPerPage,
          approvalStorePage * approvalStoreRowsPerPage
        );

        return (
          <div className="glass-panel" style={{ padding: '24px' }}>
            {/* Top KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '14px', marginBottom: '22px' }}>
              <div className="card-kpi" style={{ borderLeft: '4px solid #F59E0B' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
                  Tiendas por Aprobar
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#B45309', marginTop: '4px' }}>
                  {pendingStores.length}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Esperando validación comercial
                </div>
              </div>

              <div className="card-kpi" style={{ borderLeft: '4px solid #DE8B76' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
                  Clientes por Aprobar
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--c-primary)', marginTop: '4px' }}>
                  {pendingClients.length}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Clientes en lista de espera
                </div>
              </div>

              <div className="card-kpi" style={{ borderLeft: '4px solid #10B981' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
                  Tiendas Aprobadas
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#047857', marginTop: '4px' }}>
                  {stores.filter(s => s.status === 'APROBADO' || !s.status).length}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Operando en terminales POS
                </div>
              </div>

              <div className="card-kpi" style={{ borderLeft: '4px solid #3B82F6' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
                  Clientes Aprobados
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1D4ED8', marginTop: '4px' }}>
                  {clients.filter(c => c.status === 'APROBADO' || c.status === 'ACTIVO' || !c.status).length}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Acumulando y canjeando saldo
                </div>
              </div>
            </div>

            {/* Section Switcher & Controls */}
            <div className="admin-controls-bar" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '18px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setApprovalSection('STORES');
                    setApprovalFilter('ALL');
                  }}
                  className="btn"
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.86rem',
                    fontWeight: 800,
                    borderRadius: '12px',
                    background: approvalSection === 'STORES' ? 'var(--c-primary)' : '#FAF8F5',
                    color: approvalSection === 'STORES' ? '#FFFFFF' : 'var(--text-main)',
                    border: '1.5px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Store size={16} />
                  <span>Tiendas ({stores.length})</span>
                  {pendingStores.length > 0 && (
                    <span style={{
                      background: '#F59E0B',
                      color: '#FFFFFF',
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '8px'
                    }}>
                      {pendingStores.length} por aprobar
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setApprovalSection('CLIENTS')}
                  className="btn"
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.86rem',
                    fontWeight: 800,
                    borderRadius: '12px',
                    background: approvalSection === 'CLIENTS' ? 'var(--c-primary)' : '#FAF8F5',
                    color: approvalSection === 'CLIENTS' ? '#FFFFFF' : 'var(--text-main)',
                    border: '1.5px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Users size={16} />
                  <span>Clientes ({clients.length})</span>
                  {pendingClients.length > 0 && (
                    <span style={{
                      background: '#DE8B76',
                      color: '#FFFFFF',
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '8px'
                    }}>
                      {pendingClients.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Status Filter & Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '4px', background: '#FAF8F5', padding: '3px', borderRadius: '10px', border: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
                  {(approvalSection === 'STORES' ? [
                    { id: 'ALL', label: `Todas (${stores.length})` },
                    { id: 'TRIAL', label: `🎁 En Prueba (${storeTrialCount})` },
                    { id: 'ACTIVE', label: `⭐ Pagadas (${storePaidCount})` },
                    { id: 'BLOCKED', label: `🔴 Sin Acceso (${storeBlockedCount})` },
                    ...(storePendingPaymentsCount > 0 ? [{ id: 'PAYMENTS', label: `💳 Pagos por Validar (${storePendingPaymentsCount})` }] : []),
                    { id: 'EXEMPT', label: `🛡️ Exentas (${storeExemptCount})` },
                    ...(pendingStores.length > 0 ? [{ id: 'PENDING', label: `🟡 Reg. Pendiente (${pendingStores.length})` }] : [])
                  ] : [
                    { id: 'ALL', label: 'Todos' },
                    { id: 'APPROVED', label: 'Aprobados' },
                    { id: 'PENDING', label: 'Pendientes' },
                    { id: 'REJECTED', label: 'Rechazados' }
                  ]).map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setApprovalFilter(f.id)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        border: 'none',
                        borderRadius: '8px',
                        background: approvalFilter === f.id ? '#FFFFFF' : 'transparent',
                        color: approvalFilter === f.id ? 'var(--c-primary)' : 'var(--text-muted)',
                        boxShadow: approvalFilter === f.id ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="admin-search-wrapper" style={{ width: '220px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                  <input
                    type="text"
                    placeholder={`Buscar ${approvalSection === 'STORES' ? 'tienda...' : 'cliente...'}`}
                    value={approvalSearch}
                    onChange={(e) => setApprovalSearch(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '30px', fontSize: '0.78rem' }}
                  />
                </div>


                {approvalSection === 'STORES' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowStoresMapModal(true)}
                      className="btn"
                      style={{
                        padding: '6px 14px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(13, 148, 136, 0.25)'
                      }}
                      title="Abrir mapa interactivo de Google Maps con las ubicaciones de todos los comercios"
                    >
                      <MapPin size={14} />
                      <span>🗺️ Ver Mapa de Tiendas</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenNewStore}
                      className="btn btn-primary"
                      style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      <Plus size={14} />
                      <span>+ Nueva Tienda</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 1: STORES TABLE */}
            {approvalSection === 'STORES' && (
              <div>
                {/* BANNER DE RESUMEN DE ESTADO DE MEMBRESÍAS & ACCESO AL PANEL */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                  gap: '10px',
                  marginBottom: '14px'
                }}>
                  <div
                    onClick={() => setApprovalFilter(approvalFilter === 'TRIAL' ? 'ALL' : 'TRIAL')}
                    style={{
                      background: approvalFilter === 'TRIAL' ? '#FEF3C7' : '#FFFFFF',
                      border: approvalFilter === 'TRIAL' ? '2px solid #F59E0B' : '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'all 0.15s ease'
                    }}
                    title="Haz clic para filtrar solo tiendas en prueba gratuita"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#92400E' }}>🎁 EN PRUEBA GRATIS</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#B45309' }}>{storeTrialCount}</span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#78350F', marginTop: '4px', fontWeight: 600 }}>
                      🟢 Acceso total (días restantes activos)
                    </div>
                  </div>

                  <div
                    onClick={() => setApprovalFilter(approvalFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
                    style={{
                      background: approvalFilter === 'ACTIVE' ? '#DCFCE7' : '#FFFFFF',
                      border: approvalFilter === 'ACTIVE' ? '2px solid #10B981' : '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'all 0.15s ease'
                    }}
                    title="Haz clic para filtrar solo tiendas con membresía activa pagada"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#166534' }}>⭐ MEMBRESÍAS PAGADAS</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#15803D' }}>{storePaidCount}</span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#14532D', marginTop: '4px', fontWeight: 600 }}>
                      🟢 Acceso total ($5 BCV al día)
                    </div>
                  </div>

                  <div
                    onClick={() => setApprovalFilter(approvalFilter === 'BLOCKED' ? 'ALL' : 'BLOCKED')}
                    style={{
                      background: approvalFilter === 'BLOCKED' ? '#FEE2E2' : '#FFFFFF',
                      border: approvalFilter === 'BLOCKED' ? '2px solid #EF4444' : '1px solid #FECACA',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'all 0.15s ease'
                    }}
                    title="Haz clic para filtrar tiendas bloqueadas o que requieren pago para operar"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#991B1B' }}>🔴 SIN ACCESO (PAGO REQ.)</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#DC2626' }}>{storeBlockedCount}</span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#7F1D1D', marginTop: '4px', fontWeight: 600 }}>
                      ⚠️ Terminal POS bloqueado (Sin membresía)
                    </div>
                  </div>

                  <div
                    onClick={() => setApprovalFilter(approvalFilter === 'EXEMPT' ? 'ALL' : 'EXEMPT')}
                    style={{
                      background: approvalFilter === 'EXEMPT' ? '#DBEAFE' : '#FFFFFF',
                      border: approvalFilter === 'EXEMPT' ? '2px solid #3B82F6' : '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'all 0.15s ease'
                    }}
                    title="Haz clic para filtrar tiendas con cortesía o exención"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1E40AF' }}>🛡️ EXENTAS (CORTESÍA)</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#2563EB' }}>{storeExemptCount}</span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#1E3A8A', marginTop: '4px', fontWeight: 600 }}>
                      🟢 Acceso permanente concedido por Admin
                    </div>
                  </div>

                  {storePendingPaymentsCount > 0 && (
                    <div
                      onClick={() => setApprovalFilter(approvalFilter === 'PAYMENTS' ? 'ALL' : 'PAYMENTS')}
                      style={{
                        background: approvalFilter === 'PAYMENTS' ? '#FEF3C7' : '#FFFBEB',
                        border: '2px solid #F59E0B',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        transition: 'all 0.15s ease'
                      }}
                      title="Haz clic para filtrar tiendas con pagos reportados por validar"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#B45309' }}>⏳ PAGOS POR VALIDAR</span>
                        <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#D97706' }}>{storePendingPaymentsCount}</span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#92400E', marginTop: '4px', fontWeight: 600 }}>
                        💳 Comprobantes esperando verificación
                      </div>
                    </div>
                  )}
                </div>

                <div style={{
                  padding: '10px 14px',
                  marginBottom: '14px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(240, 253, 244, 0.9) 0%, rgba(220, 252, 231, 0.6) 100%)',
                  border: '1px solid #BBF7D0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.1rem' }}>⚙️</span>
                    <span style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600 }}>
                      <strong>Control Individual por Tienda:</strong> La configuración de porcentaje NO es global. El Administrador decide tienda por tienda activando el <strong>"Permiso Tienda"</strong> (🟢 Activado) para permitirle modificar su % en su POS, o manteniéndolo bloqueado (🔒 Desactivado).
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', background: '#FFFFFF', padding: '3px 8px', borderRadius: '6px', border: '1px solid #86EFAC', color: '#15803D', fontWeight: 700 }}>
                    Base Oficial: 5.0%
                  </span>
                </div>

                {/* Barra de utilidades: contador y toggle expandir/colapsar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  marginBottom: '10px',
                  background: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.80rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      🏪 Tiendas registradas:
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: 'rgba(112, 9, 43, 0.08)',
                      color: 'var(--c-primary)',
                      padding: '2px 8px',
                      borderRadius: '12px'
                    }}>
                      {filteredStores.length} {filteredStores.length === 1 ? 'comercio' : 'comercios'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      • Haz clic sobre cualquier tarjeta para ver o editar sus detalles completos
                    </span>
                  </div>

                  {paginatedStoresList.length > 0 && (() => {
                    const currentIds = paginatedStoresList.map(s => s.id);
                    const allOpen = currentIds.length > 0 && currentIds.every(id => expandedStoreIds.includes(id));
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          if (allOpen) {
                            setExpandedStoreIds(prev => prev.filter(id => !currentIds.includes(id)));
                          } else {
                            setExpandedStoreIds(prev => Array.from(new Set([...prev, ...currentIds])));
                          }
                        }}
                        className="btn btn-secondary"
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                        title={allOpen ? 'Colapsar todas las tarjetas de esta página' : 'Desplegar todas las tarjetas de esta página'}
                      >
                        {allOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        <span>{allOpen ? 'Colapsar todas' : 'Expandir todas'}</span>
                      </button>
                    );
                  })()}
                </div>

                {/* LISTA DE TARJETAS DESPLEGABLES DE COMERCIOS */}
                <div className="admin-stores-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                  {filteredStores.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '44px 20px',
                      background: '#FFFFFF',
                      borderRadius: '14px',
                      border: '1.5px dashed var(--border-subtle)',
                      color: 'var(--text-muted)'
                    }}>
                      <Store size={38} color="var(--text-dim)" style={{ marginBottom: '8px', opacity: 0.7 }} />
                      <div style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--text-main)' }}>
                        No se encontraron tiendas
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        No hay comercios que coincidan con la búsqueda o el filtro seleccionado.
                      </div>
                    </div>
                  ) : (
                    paginatedStoresList.map(st => {
                      const isExpanded = expandedStoreIds.includes(st.id);
                      const isPending = st.status === 'PENDIENTE';
                      const isApproved = st.status === 'APROBADO' || !st.status;
                      const isRej = st.status === 'RECHAZADO';
                      const sub = getStoreSubscriptionDetails(st, config, dolarRateInfo);

                      return (
                        <div
                          key={st.id}
                          className={`admin-store-card ${isExpanded ? 'is-expanded' : ''}`}
                          style={{
                            borderLeft: isPending ? '4.5px solid #F59E0B' : isRej ? '4.5px solid #EF4444' : '4.5px solid #10B981'
                          }}
                        >
                          {/* CABECERA DE LA TARJETA: INFORMACIÓN BÁSICA Y ESENCIAL */}
                          <div
                            className="admin-store-card-header"
                            onClick={() => toggleStoreExpand(st.id)}
                            role="button"
                            tabIndex={0}
                            title="Haz clic para ver o editar todos los detalles de esta tienda"
                          >
                            {/* Información básica del comercio */}
                            <div className="admin-store-card-main-info">
                              <StoreLogoBadge store={st} size={44} borderRadius="12px" />
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                                    {st.name}
                                  </span>
                                  <span style={{
                                    fontSize: '0.68rem',
                                    color: 'var(--text-dim)',
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    background: '#FAF8F5',
                                    border: '1px solid #EAE3D9',
                                    padding: '1px 6px',
                                    borderRadius: '6px'
                                  }}>
                                    {st.id}
                                  </span>
                                  {st.pendingSubscriptionPayment && (
                                    <span
                                      onClick={(e) => { e.stopPropagation(); setSubscriptionStore(st); }}
                                      style={{
                                        background: '#FEF3C7',
                                        color: '#B45309',
                                        border: '1px solid #FCD34D',
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        fontSize: '0.70rem',
                                        fontWeight: 800,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        cursor: 'pointer',
                                        boxShadow: '0 1px 3px rgba(180, 83, 9, 0.15)'
                                      }}
                                      title="Haz clic para revisar referencia, banco, teléfono y aprobar pago"
                                    >
                                      <Clock size={11} />
                                      <span>💳 Pago Reportado (Ref: {st.pendingSubscriptionPayment.reference})</span>
                                    </span>
                                  )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                                  {/* Categoría */}
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: 'rgba(222, 139, 118, 0.12)',
                                    border: '1px solid rgba(222, 139, 118, 0.25)',
                                    color: 'var(--c-primary)',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.70rem',
                                    fontWeight: 700
                                  }}>
                                    <Tag size={11} color="var(--c-primary)" />
                                    <span>{st.category || 'Comercio Aliado'}</span>
                                  </span>

                                  {/* Ciudad básica */}
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    color: 'var(--text-muted)'
                                  }}>
                                    <MapPin size={12} color="var(--c-primary)" />
                                    <span>{st.city || 'Caracas'}</span>
                                  </span>

                                  {/* Indicador de múltiples sedes si aplica */}
                                  {Array.isArray(st.locations) && st.locations.length > 1 && (
                                    <span style={{
                                      fontSize: '0.66rem',
                                      fontWeight: 800,
                                      background: '#FEF3C7',
                                      color: '#92400E',
                                      border: '1px solid #FDE68A',
                                      padding: '1px 6px',
                                      borderRadius: '6px'
                                    }}>
                                      📍 {st.locations.length} locales
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Badges de estado, plan y % retorno */}
                            <div className="admin-store-card-badges" onClick={(e) => e.stopPropagation()}>
                              {/* % Retorno en cashback */}
                              <span style={{
                                fontSize: '0.78rem',
                                fontWeight: 850,
                                color: 'var(--c-primary)',
                                background: 'rgba(222, 139, 118, 0.14)',
                                padding: '3px 8px',
                                borderRadius: '7px',
                                border: '1px solid rgba(222, 139, 118, 0.3)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }} title="Porcentaje de cashback que este comercio devuelve a los clientes">
                                <Percent size={11} />
                                <span>{st.cashbackPercent ?? config?.defaultCashbackPercent ?? 5.0}% Retorno</span>
                              </span>

                              {/* Estado de Aprobación */}
                              {isPending && (
                                <span className="badge" style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D', fontSize: '0.70rem', padding: '3px 8px' }}>
                                  🟡 Pendiente
                                </span>
                              )}
                              {isApproved && (
                                <span className="badge badge-emerald" style={{ fontSize: '0.70rem', padding: '3px 8px' }}>
                                  ✅ Aprobado
                                </span>
                              )}
                              {isRej && (
                                <span className="badge badge-rose" style={{ fontSize: '0.70rem', padding: '3px 8px' }}>
                                  ❌ Suspendido
                                </span>
                              )}

                              {/* Indicador de Acceso Operativo al Panel POS */}
                              {sub.hasAccess ? (
                                <span style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  color: '#15803D',
                                  background: '#DCFCE7',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #BBF7D0',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }} title="Esta tienda tiene acceso COMPLETO para operar su POS">
                                  🟢 Con Acceso
                                </span>
                              ) : (
                                <span style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  color: '#991B1B',
                                  background: '#FEE2E2',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #FECDD3',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }} title="Terminal POS bloqueado en modo solo lectura por falta de pago de membresía ($5 BCV)">
                                  🔴 Sin Acceso (Bloqueado)
                                </span>
                              )}

                              {/* Estado Detallado de Membresía / Tiempo de Prueba */}
                              {sub.isExempt ? (
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#1E40AF', background: '#DBEAFE', padding: '3px 8px', borderRadius: '6px', border: '1px solid #BFDBFE' }} title="Exenta de pago por cortesía del Administrador">
                                  🛡️ Cortesía Exenta
                                </span>
                              ) : sub.isPaidActive ? (
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#15803D', background: '#DCFCE7', padding: '3px 8px', borderRadius: '6px', border: '1px solid #BBF7D0' }} title={`Membresía pagada hasta el ${sub.paidUntil ? sub.paidUntil.toLocaleDateString('es-VE') : 'activo'}`}>
                                  ⭐ Pagada (hasta {sub.paidUntil ? sub.paidUntil.toLocaleDateString('es-VE') : 'activo'})
                                </span>
                              ) : st.pendingSubscriptionPayment ? (
                                <span 
                                  onClick={(e) => { e.stopPropagation(); setSubscriptionStore(st); }}
                                  style={{ fontSize: '0.68rem', fontWeight: 800, color: '#B45309', background: '#FEF3C7', padding: '3px 8px', borderRadius: '6px', border: '1px solid #FCD34D', cursor: 'pointer' }} 
                                  title="Pago de membresía reportado. Clic para revisar y aprobar"
                                >
                                  ⏳ Pago en Revisión
                                </span>
                              ) : sub.isInTrial ? (
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#92400E', background: '#FEF3C7', padding: '3px 8px', borderRadius: '6px', border: '1px solid #FDE68A' }} title={`Período de prueba activo. Vence el ${sub.trialEndsAt ? sub.trialEndsAt.toLocaleDateString('es-VE') : 'N/A'}`}>
                                  🎁 Prueba ({sub.trialDaysRemaining}d restantes)
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#991B1B', background: '#FEE2E2', padding: '3px 8px', borderRadius: '6px', border: '1px solid #FECDD3' }} title="No tiene prueba válida ni membresía pagada. Debe cancelar $5 BCV para desbloquear su POS">
                                  🔒 Pago Requerido ($5)
                                </span>
                              )}

                              {/* Indicador de App Móvil POS Activa */}
                              {Boolean(st.hasMobileApp || st.fcmToken || (st.fcmTokens && st.fcmTokens.length > 0)) && (
                                <span style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  color: '#065F46',
                                  background: '#D1FAE5',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #6EE7B7',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }} title="Este comercio ya inició sesión en la App Móvil y recibe notificaciones push">
                                  <Smartphone size={11} color="#059669" />
                                  <span>App POS Activa</span>
                                </span>
                              )}

                              {/* Botón rápido Enviar Push */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTab('PUSH_STORES');
                                  setPushTargetScope('SPECIFIC');
                                  setPushSelectedStoreId(st.id);
                                }}
                                className="btn"
                                style={{
                                  padding: '5px 10px',
                                  fontSize: '0.72rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontWeight: 800,
                                  background: (st.hasMobileApp || st.fcmToken) ? '#ECFDF5' : '#FAF8F5',
                                  color: (st.hasMobileApp || st.fcmToken) ? '#065F46' : 'var(--text-main)',
                                  border: (st.hasMobileApp || st.fcmToken) ? '1px solid #A7F3D0' : '1px solid var(--border-subtle)'
                                }}
                                title="Enviar notificación push inmediata a este comercio"
                              >
                                <Send size={11} color="var(--c-primary)" />
                                <span>Push</span>
                              </button>

                              {/* Botón rápido Editar */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditStore(st)}
                                className="btn btn-secondary"
                                style={{ padding: '5px 10px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}
                                title="Editar datos del comercio"
                              >
                                <Edit3 size={12} />
                                <span>Editar</span>
                              </button>

                              {/* Botón Toggle Desplegar */}
                              <button
                                type="button"
                                onClick={() => toggleStoreExpand(st.id)}
                                style={{
                                  background: isExpanded ? 'var(--c-primary)' : '#FAF8F5',
                                  color: isExpanded ? '#FFFFFF' : 'var(--text-main)',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: '8px',
                                  padding: '5px 10px',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.15s ease'
                                }}
                                title={isExpanded ? 'Ocultar detalles' : 'Desplegar todos los detalles de este comercio'}
                              >
                                <span>{isExpanded ? 'Ocultar' : 'Detalles'}</span>
                                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              </button>
                            </div>
                          </div>

                          {/* SECCIÓN DESPLEGABLE: TODOS LOS DETALLES, CONTACTOS, CONFIGURACIÓN Y ACCIONES */}
                          {isExpanded && (
                            <div className="admin-store-card-body">
                              <div className="admin-store-detail-grid">
                                {/* COLUMNA 1: UBICACIÓN Y CONTACTO COMPLETO */}
                                <div className="admin-store-detail-block">
                                  <div className="admin-store-detail-title">
                                    <MapPin size={13} color="var(--c-primary)" />
                                    <span>Ubicación & Contacto</span>
                                  </div>

                                  {/* Dirección completa */}
                                  <div>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>
                                      Dirección Detallada
                                    </div>
                                    <div style={{ fontSize: '0.80rem', color: 'var(--text-main)', marginTop: '2px', fontWeight: 500, lineHeight: '1.4' }}>
                                      {st.address ? (
                                        <span>📍 {st.address}</span>
                                      ) : (
                                        <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Sin dirección registrada</span>
                                      )}
                                    </div>
                                    {st.city && (
                                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                                        Zona / Ciudad: <strong>{st.city}</strong>
                                      </div>
                                    )}
                                  </div>

                                  {/* Encargado */}
                                  <div style={{ borderTop: '1px dashed #E2E8F0', paddingTop: '8px' }}>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>
                                      Persona Encargada
                                    </div>
                                    <div style={{ fontSize: '0.80rem', color: 'var(--text-main)', marginTop: '2px', fontWeight: 600 }}>
                                      👤 {st.manager || 'No registrado'}
                                    </div>
                                  </div>

                                  {/* Teléfono & Acciones Rápidas (WhatsApp / Llamar) */}
                                  <div style={{ borderTop: '1px dashed #E2E8F0', paddingTop: '8px' }}>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>
                                      Teléfono & WhatsApp
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                                      <span style={{
                                        fontSize: '0.78rem',
                                        fontWeight: 800,
                                        color: '#15803D',
                                        background: '#DCFCE7',
                                        border: '1px solid #BBF7D0',
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}>
                                        <Phone size={12} />
                                        <span>{st.phone || 'Sin número registrado'}</span>
                                      </span>

                                      {st.phone && (
                                        <>
                                          {(() => {
                                            const waUrl = getStoreWhatsAppUrl(st.phone);
                                            return waUrl ? (
                                              <a
                                                href={waUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn"
                                                style={{
                                                  padding: '3px 8px',
                                                  fontSize: '0.70rem',
                                                  background: '#25D366',
                                                  color: '#FFFFFF',
                                                  fontWeight: 800,
                                                  borderRadius: '6px',
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: '4px',
                                                  textDecoration: 'none'
                                                }}
                                                title="Iniciar conversación de WhatsApp con el comercio"
                                              >
                                                <MessageCircle size={12} />
                                                <span>WhatsApp</span>
                                              </a>
                                            ) : null;
                                          })()}
                                          <a
                                            href={`tel:${st.phone}`}
                                            className="btn btn-secondary"
                                            style={{ padding: '3px 8px', fontSize: '0.70rem', display: 'inline-flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}
                                            title="Llamar directamente al número"
                                          >
                                            <Phone size={11} />
                                            <span>Llamar</span>
                                          </a>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* Correo Electrónico */}
                                  <div style={{ borderTop: '1px dashed #E2E8F0', paddingTop: '8px' }}>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>
                                      Correo Electrónico
                                    </div>
                                    <div style={{ fontSize: '0.78rem', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <Mail size={12} color="var(--text-dim)" />
                                      <a
                                        href={`mailto:${st.email || `${st.id.toLowerCase()}@fidely.com`}`}
                                        style={{ color: 'var(--c-primary)', fontWeight: 600, textDecoration: 'none' }}
                                      >
                                        {st.email || `${st.id.toLowerCase()}@fidely.com`}
                                      </a>
                                    </div>
                                  </div>
                                </div>

                                {/* COLUMNA 2: CONFIGURACIÓN DE CASHBACK Y PLAN $5 */}
                                <div className="admin-store-detail-block">
                                  <div className="admin-store-detail-title">
                                    <Sliders size={13} color="var(--c-primary)" />
                                    <span>Cashback & Membresía</span>
                                  </div>

                                  {/* Porcentaje de retorno */}
                                  <div>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>
                                      Porcentaje de Retorno al Cliente
                                    </div>
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      marginTop: '4px',
                                      background: '#FAF8F5',
                                      padding: '8px 12px',
                                      borderRadius: '8px',
                                      border: '1px solid #EAE3D9'
                                    }}>
                                      <div>
                                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--c-primary)' }}>
                                          {st.cashbackPercent ?? config?.defaultCashbackPercent ?? 5.0}%
                                        </div>
                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                          Tasa de retorno acreditada a clientes
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleEditStorePercent(st.id)}
                                        className="btn btn-secondary"
                                        style={{ padding: '4px 10px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
                                        title="Ajustar porcentaje de retorno para este comercio"
                                      >
                                        <Edit3 size={12} />
                                        <span>Ajustar %</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Permiso de edición en POS */}
                                  <div style={{ borderTop: '1px dashed #E2E8F0', paddingTop: '8px' }}>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>
                                      Permiso para Modificar % en POS
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '4px' }}>
                                      <div style={{ fontSize: '0.76rem', color: 'var(--text-main)', fontWeight: 600 }}>
                                        {Boolean(st.canEditPercent) ? (
                                          <span style={{ color: '#166534', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            🟢 <strong>Habilitado:</strong> Comercio modifica su % en POS
                                          </span>
                                        ) : (
                                          <span style={{ color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            🔒 <strong>Bloqueado:</strong> Porcentaje fijo por Admin
                                          </span>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleStorePermission(st.id)}
                                        style={{
                                          padding: '4px 10px',
                                          borderRadius: '9999px',
                                          fontSize: '0.68rem',
                                          fontWeight: 800,
                                          cursor: 'pointer',
                                          border: Boolean(st.canEditPercent) ? '1.5px solid #86EFAC' : '1.5px solid #CBD5E1',
                                          background: Boolean(st.canEditPercent) ? '#DCFCE7' : '#F1F5F9',
                                          color: Boolean(st.canEditPercent) ? '#166534' : '#475569',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          whiteSpace: 'nowrap'
                                        }}
                                        title={Boolean(st.canEditPercent) ? 'Haga clic para bloquear la modificación en POS' : 'Haga clic para permitir que el comercio ajuste su % en POS'}
                                      >
                                        {Boolean(st.canEditPercent) ? 'Dejar Fijo' : 'Permitir en POS'}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Membresía fidely CLUB & Acceso al Panel */}
                                  <div style={{ borderTop: '1px dashed #E2E8F0', paddingTop: '10px' }}>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                                      Membresía fidely CLUB & Acceso al Panel
                                    </div>
                                    <div style={{
                                      background: sub.isBlocked ? '#FEF2F2' : '#F0FDF4',
                                      border: `1.5px solid ${sub.isBlocked ? '#FECACA' : '#BBF7D0'}`,
                                      borderRadius: '10px',
                                      padding: '10px 12px',
                                      marginBottom: '8px'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span style={{ fontSize: '1rem' }}>{sub.hasAccess ? '🟢' : '🔴'}</span>
                                          <div>
                                            <div style={{ fontSize: '0.80rem', fontWeight: 900, color: sub.hasAccess ? '#166534' : '#991B1B' }}>
                                              {sub.hasAccess ? 'Acceso Operativo al Panel Habilitado' : 'Acceso Operativo Bloqueado (Falta de Pago)'}
                                            </div>
                                            <div style={{ fontSize: '0.70rem', color: sub.hasAccess ? '#15803D' : '#B91C1C' }}>
                                              {sub.isExempt
                                                ? 'Membresía Exenta de Cortesía Permanente (Acceso Ilimitado)'
                                                : sub.isPaidActive
                                                ? `Membresía Pagada y Activa hasta el ${sub.paidUntil ? sub.paidUntil.toLocaleDateString('es-VE') : 'activo'}`
                                                : sub.isInTrial
                                                ? `Período de Prueba Gratuito: Quedan ${sub.trialDaysRemaining} días (Vence el ${sub.trialEndsAt ? sub.trialEndsAt.toLocaleDateString('es-VE') : 'N/A'})`
                                                : 'El comercio no ha cancelado la membresía mensual de $5 BCV. Puede ver el panel pero no emitir sellos ni cashback.'}
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Fechas detalladas */}
                                      <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                                        gap: '6px',
                                        marginTop: '8px',
                                        paddingTop: '8px',
                                        borderTop: `1px dashed ${sub.isBlocked ? '#FECACA' : '#BBF7D0'}`,
                                        fontSize: '0.72rem',
                                        color: 'var(--text-main)'
                                      }}>
                                        <div>📅 <strong>Registro:</strong> {sub.createdAt ? sub.createdAt.toLocaleDateString('es-VE') : 'N/A'}</div>
                                        <div>
                                          ⏳ <strong>Prueba Asignada:</strong> {sub.trialEndsAt ? sub.trialEndsAt.toLocaleDateString('es-VE') : 'N/A'}
                                          {sub.isInTrial && <span style={{ color: '#B45309', fontWeight: 800 }}> ({sub.trialDaysRemaining}d restantes)</span>}
                                        </div>
                                        {sub.paidUntil && (
                                          <div>⭐ <strong>Pagado hasta:</strong> {sub.paidUntil.toLocaleDateString('es-VE')}</div>
                                        )}
                                      </div>

                                      {/* Comprobante reportado si existe */}
                                      {st.pendingSubscriptionPayment && (
                                        <div style={{
                                          marginTop: '8px',
                                          background: '#FFFBEB',
                                          border: '1px solid #FCD34D',
                                          borderRadius: '8px',
                                          padding: '8px 10px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          flexWrap: 'wrap',
                                          gap: '6px'
                                        }}>
                                          <div style={{ fontSize: '0.74rem', color: '#92400E' }}>
                                            💳 <strong>Pago Reportado:</strong> Ref: <code>{st.pendingSubscriptionPayment.reference}</code> | Bs. {st.pendingSubscriptionPayment.amountVes}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => setSubscriptionStore(st)}
                                            style={{
                                              padding: '3px 8px',
                                              fontSize: '0.70rem',
                                              fontWeight: 800,
                                              background: '#D97706',
                                              color: '#FFFFFF',
                                              border: 'none',
                                              borderRadius: '6px',
                                              cursor: 'pointer'
                                            }}
                                          >
                                            Verificar & Aprobar
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    {/* Botones de acción rápida de membresía */}
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                      <button
                                        type="button"
                                        onClick={() => setSubscriptionStore(st)}
                                        className="btn btn-secondary"
                                        style={{ padding: '4px 8px', fontSize: '0.70rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                        title="Abrir panel completo de membresía para este comercio"
                                      >
                                        <CreditCard size={11} />
                                        <span>Gestionar Plan</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleExtendStoreSubscription(1, st)}
                                        style={{
                                          padding: '4px 8px',
                                          fontSize: '0.70rem',
                                          fontWeight: 800,
                                          background: '#16A34A',
                                          color: '#FFFFFF',
                                          border: 'none',
                                          borderRadius: '6px',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}
                                        title="Activar o extender 1 mes ($5) de membresía pagada"
                                      >
                                        <span>+1 Mes Pagado</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleExtendStoreTrial(30, st)}
                                        style={{
                                          padding: '4px 8px',
                                          fontSize: '0.70rem',
                                          fontWeight: 800,
                                          background: '#F59E0B',
                                          color: '#FFFFFF',
                                          border: 'none',
                                          borderRadius: '6px',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}
                                        title="Extender 30 días adicionales de prueba gratuita"
                                      >
                                        <span>+30 Días Prueba</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleToggleStoreExemption(st)}
                                        style={{
                                          padding: '4px 8px',
                                          fontSize: '0.70rem',
                                          fontWeight: 700,
                                          background: st.subscriptionExempt ? '#EFF6FF' : '#F8FAFC',
                                          color: st.subscriptionExempt ? '#2563EB' : 'var(--text-main)',
                                          border: st.subscriptionExempt ? '1px solid #93C5FD' : '1px solid #CBD5E1',
                                          borderRadius: '6px',
                                          cursor: 'pointer'
                                        }}
                                        title={st.subscriptionExempt ? 'Revocar cortesía gratuita' : 'Conceder exención de pago permanente (Cortesía)'}
                                      >
                                        <span>{st.subscriptionExempt ? 'Revocar Cortesía' : 'Exentar (Cortesía)'}</span>
                                      </button>

                                      {sub.hasAccess && !sub.isExempt && (
                                        <button
                                          type="button"
                                          onClick={() => handleBlockStoreSubscription(st)}
                                          style={{
                                            padding: '4px 8px',
                                            fontSize: '0.70rem',
                                            fontWeight: 700,
                                            background: '#FEF2F2',
                                            color: '#DC2626',
                                            border: '1px solid #FECACA',
                                            borderRadius: '6px',
                                            cursor: 'pointer'
                                          }}
                                          title="Bloquear terminal por falta de pago"
                                        >
                                          <span>Bloquear POS</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* COLUMNA 3: ACCIONES COMPLETAS DE GESTIÓN */}
                                <div className="admin-store-detail-block">
                                  <div className="admin-store-detail-title">
                                    <Store size={13} color="var(--c-primary)" />
                                    <span>Acciones de Gestión</span>
                                  </div>

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '2px' }}>
                                    {/* Botón Aprobar si no está aprobado */}
                                    {!isApproved && (
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateStoreStatus(st.id, 'APROBADO')}
                                        className="btn btn-primary"
                                        style={{ width: '100%', padding: '7px 12px', fontSize: '0.76rem', background: '#16A34A', borderColor: '#15803D', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontWeight: 800 }}
                                        title="Aprobar comercio para emitir sellos en POS"
                                      >
                                        <CheckCircle2 size={13} />
                                        <span>Aprobar Tienda para Operar</span>
                                      </button>
                                    )}

                                    {/* Editar datos del comercio */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditStore(st)}
                                      className="btn btn-secondary"
                                      style={{ width: '100%', padding: '7px 12px', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontWeight: 700 }}
                                      title="Editar datos, porcentaje, teléfono y dirección"
                                    >
                                      <Edit3 size={13} />
                                      <span>Editar Perfil & Datos</span>
                                    </button>

                                    {/* Diseñar Tarjeta de Fidelización */}
                                    <button
                                      type="button"
                                      onClick={() => setDesigningStore(st)}
                                      className="btn btn-secondary"
                                      style={{ width: '100%', padding: '7px 12px', fontSize: '0.76rem', background: '#FEF3C7', borderColor: '#FCD34D', color: '#92400E', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                                      title="Diseñar tarjeta de fidelización, logo, colores y sello"
                                    >
                                      <Sparkles size={13} color="#D97706" />
                                      <span>Diseñar Tarjeta de Fidelización</span>
                                    </button>

                                    {/* Imprimir Cartel QR con Mascota para Mostrador */}
                                    <button
                                      type="button"
                                      onClick={() => setPrintStandStore(st)}
                                      className="btn btn-secondary"
                                      style={{
                                        width: '100%',
                                        padding: '7px 12px',
                                        fontSize: '0.76rem',
                                        background: '#FFFFFF',
                                        borderColor: '#70092B',
                                        color: '#70092B',
                                        fontWeight: 800,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '5px'
                                      }}
                                      title="Ver e imprimir afiche oficial con QR y mascota para mostrador"
                                    >
                                      <Printer size={13} color="#70092B" />
                                      <span>Imprimir Cartel QR de Caja</span>
                                    </button>

                                    {/* Suspender / Reactivar & Eliminar */}
                                    <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                                      {!isRej ? (
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateStoreStatus(st.id, 'RECHAZADO')}
                                          className="btn btn-secondary"
                                          style={{ flex: 1, padding: '6px 8px', fontSize: '0.72rem', color: '#DC2626', borderColor: '#FECDD3', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight: 700 }}
                                          title="Suspender comercio temporalmente"
                                        >
                                          <X size={12} />
                                          <span>Suspender</span>
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateStoreStatus(st.id, 'PENDIENTE')}
                                          className="btn btn-secondary"
                                          style={{ flex: 1, padding: '6px 8px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight: 700 }}
                                          title="Reactivar a estado pendiente"
                                        >
                                          <Clock size={12} />
                                          <span>Pasar a Pendiente</span>
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => handleDeleteStore(st.id)}
                                        className="btn btn-secondary"
                                        style={{ padding: '6px 12px', fontSize: '0.72rem', color: '#DC2626', borderColor: '#FECDD3', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight: 700 }}
                                        title="Eliminar tienda permanentemente del sistema"
                                      >
                                        <Trash2 size={12} />
                                        <span>Eliminar</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

              <TablePagination
                currentPage={approvalStorePage}
                totalItems={filteredStores.length}
                rowsPerPage={approvalStoreRowsPerPage}
                onPageChange={setApprovalStorePage}
                onRowsPerPageChange={setApprovalStoreRowsPerPage}
                itemLabel="tiendas/comercios"
              />
            </div>
            )}

            {/* SECTION 2: CLIENTS TABLE */}
            {approvalSection === 'CLIENTS' && (
              <>
                <div className="custom-table-container">
                  <table className="custom-table admin-clients-table" style={{ width: '100%', minWidth: 'unset', tableLayout: 'auto' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '48%', minWidth: '260px' }}>Cliente & Contacto</th>
                      <th style={{ width: '14%', minWidth: '100px' }}>Tarjetas</th>
                      <th style={{ width: '14%', minWidth: '110px' }}>Estado</th>
                      <th style={{ width: '24%', minWidth: '170px', textAlign: 'right', paddingRight: '16px' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClientsList.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                          No se encontraron clientes con los criterios actuales.
                        </td>
                      </tr>
                    ) : (
                      paginatedClientsList.map(c => {
                        const isPending = c.status === 'PENDIENTE';
                        const isApproved = c.status === 'APROBADO' || c.status === 'ACTIVO' || !c.status;
                        const isRej = c.status === 'RECHAZADO';
                        const activeCards = c.loyaltyCards || [];
                        const initial = (c.name || 'C').charAt(0).toUpperCase();

                        return (
                          <tr key={c.id} style={{ background: isPending ? 'rgba(254, 243, 199, 0.35)' : 'transparent' }}>
                            {/* 1. CLIENTE & CONTACTO AGRUPADO */}
                            <td style={{ verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {/* Avatar con inicial */}
                                <div style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '50%',
                                  background: 'linear-gradient(135deg, #8B1D2C 0%, #B91C1C 100%)',
                                  color: '#FFFFFF',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: '0.92rem',
                                  flexShrink: 0,
                                  boxShadow: '0 2px 4px rgba(139,29,44,0.15)'
                                }}>
                                  {initial}
                                </div>

                                <div style={{ minWidth: 0, flex: 1 }}>
                                  {/* Nombre y Badges */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.88rem' }}>
                                      {c.name}
                                    </span>
                                    {(c.registrationSource === 'GOOGLE_AUTH' || c.registrationSource === 'GOOGLE_SIGN_IN' || c.registrationSource === 'QR_FAST_PASS') && (
                                      <span style={{ fontSize: '0.64rem', background: '#E0F2FE', color: '#0369A1', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                                        🌐 Google
                                      </span>
                                    )}
                                    {c.registrationSource === 'QR_FAST_PASS' && (
                                      <span style={{ fontSize: '0.64rem', background: '#DCFCE7', color: '#166534', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                                        ⚡ QR Rápido
                                      </span>
                                    )}
                                    {c.registrationSource === 'CONECTA2_RTDB_SYNC' && (
                                      <span style={{ fontSize: '0.64rem', background: '#FFF7ED', color: '#C2410C', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                                        📱 Conecta2 App
                                      </span>
                                    )}
                                  </div>

                                  {/* Email */}
                                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--c-primary)', marginTop: '2px', wordBreak: 'break-word' }}>
                                    {c.email || <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>Sin correo</span>}
                                  </div>

                                  {/* Metadatos: Cédula, Teléfono, ID */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    <span><strong>Doc:</strong> {c.docId || 'N/A'}</span>
                                    {c.phone && <span>• 📞 {c.phone}</span>}
                                    <span>• <span style={{ color: 'var(--text-dim)' }}>ID: {c.id?.length > 12 ? `${c.id.substring(0, 8)}...` : c.id}</span></span>
                                    {c.registeredViaStoreId && (
                                      <span style={{ color: '#059669', fontWeight: 700 }}>
                                        • 📍 Tienda: {c.registeredViaStoreId}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* 2. TARJETAS */}
                            <td style={{ verticalAlign: 'middle' }}>
                              {activeCards.length > 0 ? (
                                <span className="badge badge-accent" style={{ fontSize: '0.74rem', padding: '3px 8px', whiteSpace: 'nowrap' }}>
                                  ⭐ {activeCards.length} {activeCards.length === 1 ? 'tarjeta' : 'tarjetas'}
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>Sin tarjetas</span>
                              )}
                            </td>

                            {/* 3. ESTADO */}
                            <td style={{ verticalAlign: 'middle' }}>
                              {isPending && (
                                <span className="badge" style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D', fontSize: '0.72rem', padding: '3px 8px', whiteSpace: 'nowrap' }}>
                                  🟡 Pendiente
                                </span>
                              )}
                              {isApproved && (
                                <span className="badge badge-emerald" style={{ fontSize: '0.72rem', padding: '3px 8px', whiteSpace: 'nowrap' }}>
                                  ✅ Aprobado
                                </span>
                              )}
                              {isRej && (
                                <span className="badge badge-rose" style={{ fontSize: '0.72rem', padding: '3px 8px', whiteSpace: 'nowrap' }}>
                                  ❌ Rechazado
                                </span>
                              )}
                            </td>

                            {/* 4. ACCIONES */}
                            <td style={{ textAlign: 'right', verticalAlign: 'middle', paddingRight: '16px' }}>
                              <div style={{ display: 'inline-flex', gap: '5px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditClient(c)}
                                  className="btn btn-secondary"
                                  style={{
                                    padding: '5px 8px',
                                    fontSize: '0.72rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap'
                                  }}
                                  title="Editar datos del cliente"
                                >
                                  <Edit3 size={12} />
                                  <span>Editar</span>
                                </button>

                                {!isApproved && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateClientStatus(c.id, 'APROBADO')}
                                    className="btn btn-primary"
                                    style={{
                                      padding: '5px 8px',
                                      fontSize: '0.72rem',
                                      background: '#16A34A',
                                      borderColor: '#15803D',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      fontWeight: 700,
                                      whiteSpace: 'nowrap'
                                    }}
                                    title="Aprobar cliente"
                                  >
                                    <CheckCircle2 size={12} />
                                    <span>Aprobar</span>
                                  </button>
                                )}

                                {!isRej ? (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateClientStatus(c.id, 'RECHAZADO')}
                                    className="btn btn-secondary"
                                    style={{
                                      padding: '5px 8px',
                                      fontSize: '0.72rem',
                                      color: '#DC2626',
                                      borderColor: '#FECDD3',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      whiteSpace: 'nowrap'
                                    }}
                                    title="Rechazar cliente"
                                  >
                                    <X size={12} />
                                    <span>Rechazar</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateClientStatus(c.id, 'PENDIENTE')}
                                    className="btn btn-secondary"
                                    style={{
                                      padding: '5px 8px',
                                      fontSize: '0.72rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      whiteSpace: 'nowrap'
                                    }}
                                    title="Reactivar a estado pendiente"
                                  >
                                    <Clock size={12} />
                                    <span>Pendiente</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleDeleteClient(c.id)}
                                  className="btn btn-secondary"
                                  style={{
                                    padding: '5px 7px',
                                    fontSize: '0.72rem',
                                    color: '#DC2626',
                                    borderColor: '#FECDD3',
                                    background: '#FFF1F2',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  title="Eliminar cliente permanentemente"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <TablePagination
                currentPage={approvalClientPage}
                totalItems={filteredClientsList.length}
                rowsPerPage={approvalClientRowsPerPage}
                onPageChange={setApprovalClientPage}
                onRowsPerPageChange={setApprovalClientRowsPerPage}
                itemLabel="clientes"
              />
            </>
          )}
          </div>
        );
      })()}

      {/* TAB 4: REWARDS & APPROVALS */}
      {activeTab === 'REWARDS' && (() => {
        const pendingStoreRewards = rewards.filter(r => r.status === 'PENDIENTE');
        const activeRewards = rewards.filter(r => r.status === 'ACTIVO' || !r.status);
        const filteredActiveRewards = activeRewards.filter(r => {
          if (rewardStoreFilter === 'ALL') return true;
          if (rewardStoreFilter === 'GLOBAL') return !r.createdStoreId || r.applicableStores?.includes('ALL');
          return r.createdStoreId === rewardStoreFilter || r.applicableStores?.includes(rewardStoreFilter);
        });

        return (
          <div className="glass-panel" style={{ padding: '24px' }}>
            {/* 1. SECCIÓN: SOLICITUDES PENDIENTES DE TIENDAS */}
            {pendingStoreRewards.length > 0 && (
              <div style={{ 
                marginBottom: '28px', 
                background: '#FFFDF9', 
                border: '1.5px solid #FDE68A', 
                borderRadius: 'var(--radius-md)', 
                padding: '20px',
                boxShadow: '0 4px 16px rgba(180, 83, 9, 0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '50%', 
                      background: '#FEF3C7', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <Clock size={18} color="#B45309" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#92400E', margin: 0 }}>
                        Solicitudes de Beneficios de Tiendas por Aprobar ({pendingStoreRewards.length})
                      </h3>
                      <div style={{ fontSize: '0.78rem', color: '#B45309', marginTop: '2px' }}>
                        Recompensas personalizadas creadas por comercios asociados en espera de validación administrativa.
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 270px), 1fr))', gap: '14px' }}>
                  {pendingStoreRewards.map(reward => (
                    <div
                      key={reward.id}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #FEF3C7',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 2px 8px rgba(180, 83, 9, 0.04)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <span style={{ 
                            background: '#FEF3C7', 
                            color: '#92400E', 
                            padding: '3px 8px', 
                            borderRadius: '6px', 
                            fontSize: '0.72rem', 
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Store size={12} />
                            {reward.createdStoreName || 'Tienda Asociada'}
                          </span>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span 
                              style={{ 
                                background: '#FEF3C7', 
                                color: '#92400E', 
                                border: '1px solid #FCD34D', 
                                fontWeight: 800, 
                                fontSize: '0.72rem',
                                padding: '2px 7px',
                                borderRadius: '7px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <span>🎯</span>
                              <span>{reward.stampsCost || 6} sellos</span>
                            </span>
                          </div>
                        </div>

                        <strong style={{ fontSize: '0.96rem', display: 'block', marginBottom: '4px' }}>{reward.title}</strong>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.4 }}>
                          {reward.description}
                        </p>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginBottom: '14px' }}>
                          Valor: US${reward.nominalValueUsd?.toFixed(2)} • Categoría: {reward.category} • Stock: {reward.availableStock ?? 50}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #FEF3C7', paddingTop: '12px' }}>
                        <button
                          type="button"
                          onClick={() => handleRejectReward(reward)}
                          className="btn btn-secondary"
                          style={{ flex: 1, padding: '8px', fontSize: '0.78rem', color: '#70092B' }}
                        >
                          <X size={14} />
                          <span>Rechazar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveReward(reward)}
                          className="btn btn-primary"
                          style={{ flex: 1.6, padding: '8px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                        >
                          <Check size={14} />
                          <span>Aprobar y Publicar</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. CABECERA DEL CATÁLOGO ACTIVO */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Gift size={20} color="var(--c-primary)" />
                  Catálogo Oficial de Beneficios ({activeRewards.length})
                </h2>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Recompensas globales y exclusivas por tienda disponibles para los clientes en la app (RN-08)
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* Selector de filtro por tienda */}
                <select
                  className="form-input"
                  style={{ width: 'auto', minWidth: '180px', padding: '7px 12px', fontSize: '0.82rem' }}
                  value={rewardStoreFilter}
                  onChange={(e) => setRewardStoreFilter(e.target.value)}
                >
                  <option value="ALL">Todas las Recompensas ({activeRewards.length})</option>
                  <option value="GLOBAL">Sólo Globales de la Red</option>
                  {stores.map(st => (
                    <option key={st.id} value={st.id}>
                      📍 {st.name} ({activeRewards.filter(r => r.createdStoreId === st.id).length})
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    setEditingReward(null);
                    setRewardForm({
                      title: '',
                      description: '',
                      category: 'Saldo en Compra',
                      pointsCost: 100,
                      stampsCost: 6,
                      nominalValueUsd: 6.0,
                      validityDays: 30,
                      availableStock: 100,
                      storeScope: 'ALL'
                    });
                    setShowRewardModal(true);
                  }}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.84rem' }}
                >
                  <Plus size={16} />
                  <span>+ Nueva Recompensa</span>
                </button>
              </div>
            </div>

            {/* 3. GRILLA DE RECOMPENSAS ACTIVAS */}
            {filteredActiveRewards.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', background: '#FFFFFF', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-subtle)' }}>
                <Gift size={36} color="var(--c-primary)" style={{ opacity: 0.6, margin: '0 auto 10px' }} />
                <div style={{ fontWeight: 700, fontSize: '0.96rem', marginBottom: '4px' }}>
                  No se encontraron recompensas para este filtro
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  Selecciona "Todas las Recompensas" o crea una nueva recompensa para esta tienda.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: '14px' }}>
                {filteredActiveRewards.map(reward => {
                  const isStoreExclusive = !!reward.createdStoreName || (reward.applicableStores && !reward.applicableStores.includes('ALL'));
                  return (
                    <div
                      key={reward.id}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                          <span 
                            className="badge badge-accent" 
                            style={{ 
                              fontSize: '0.7rem',
                              background: isStoreExclusive ? '#FBF5F2' : '#F8F9FA',
                              color: isStoreExclusive ? 'var(--c-primary)' : 'var(--text-muted)',
                              border: isStoreExclusive ? '1px solid #EEDCD5' : '1px solid #E9ECEF'
                            }}
                          >
                            {isStoreExclusive ? `📍 Exclusivo: ${reward.createdStoreName || 'Tienda'}` : '🏢 Red Global fidely'}
                          </span>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span 
                              style={{ 
                                background: '#FEF3C7', 
                                color: '#92400E', 
                                border: '1px solid #FCD34D', 
                                fontWeight: 800, 
                                fontSize: '0.72rem',
                                padding: '2px 7px',
                                borderRadius: '7px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <span>🎯</span>
                              <span>{reward.stampsCost || 6} sellos</span>
                            </span>
                          </div>
                        </div>

                        <strong style={{ fontSize: '0.94rem', display: 'block', marginBottom: '4px' }}>{reward.title}</strong>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.4 }}>
                          {reward.description}
                        </p>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginBottom: '12px' }}>
                          Valor: US${reward.nominalValueUsd?.toFixed(2)} • Stock: {reward.availableStock ?? 50} • Vigencia: {reward.validityDays} días
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                        <button
                          onClick={() => {
                            setEditingReward(reward);
                            setRewardForm({
                              title: reward.title,
                              description: reward.description,
                              category: reward.category,
                              pointsCost: reward.pointsCost,
                              stampsCost: reward.stampsCost || Math.max(1, Math.round((reward.pointsCost || 100) / 20)) || 6,
                              nominalValueUsd: reward.nominalValueUsd,
                              validityDays: reward.validityDays,
                              availableStock: reward.availableStock,
                              storeScope: reward.createdStoreId || (reward.applicableStores && reward.applicableStores[0] !== 'ALL' ? reward.applicableStores[0] : 'ALL')
                            });
                            setShowRewardModal(true);
                          }}
                          className="btn btn-outline"
                          style={{ flex: 1, padding: '7px', fontSize: '0.78rem' }}
                        >
                          <Edit3 size={13} />
                          <span>Editar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* TAB: STORE PROMOTIONS & BROADCAST PUSH */}
      {activeTab === 'PROMOTIONS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 1. Header con Título, Botón + Crear y Métricas */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Megaphone size={22} color="var(--c-primary)" />
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                    Promociones Activas & Difusión Push de Comercios
                  </h2>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Monitorea las promociones y cupones flash de cada tienda aliada y envía notificaciones push a los clientes
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setNewPromoForm({
                    storeId: stores[0]?.id || '',
                    title: '',
                    message: '',
                    imageUrl: '',
                    badgeType: 'PROMO',
                    isUnlimited: false,
                    totalStock: 20,
                    validityDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
                  });
                  setCreatingPromoModal(true);
                }}
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(139,29,44,0.2)'
                }}
              >
                <Plus size={16} />
                <span>+ Nueva Promoción para Comercio</span>
              </button>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
              <div style={{ background: '#FAF8F5', border: '1px solid #EBE4DC', borderRadius: '14px', padding: '14px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
                  Total Promociones
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '4px' }}>
                  {promoMetrics.total}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Registradas en plataforma
                </div>
              </div>

              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '14px', padding: '14px' }}>
                <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 800, textTransform: 'uppercase' }}>
                  🟢 Activas en Vivo
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#15803D', marginTop: '4px' }}>
                  {promoMetrics.active}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#166534', marginTop: '2px' }}>
                  Visibles para clientes hoy
                </div>
              </div>

              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '14px', padding: '14px' }}>
                <div style={{ fontSize: '0.72rem', color: '#1E40AF', fontWeight: 800, textTransform: 'uppercase' }}>
                  🚀 Difusiones Push
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1D4ED8', marginTop: '4px' }}>
                  {promoMetrics.totalPushes}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#1E40AF', marginTop: '2px' }}>
                  Alertas enviadas a móviles
                </div>
              </div>

              <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '14px', padding: '14px' }}>
                <div style={{ fontSize: '0.72rem', color: '#9A3412', fontWeight: 800, textTransform: 'uppercase' }}>
                  🎟️ Cupones Reclamados
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#C2410C', marginTop: '4px' }}>
                  {promoMetrics.totalClaimed}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#9A3412', marginTop: '2px' }}>
                  Canjeados por clientes
                </div>
              </div>
            </div>
          </div>

          {/* 2. Barra de Filtros (Por Comercio, Estado, Buscador) */}
          <div className="glass-panel" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1, minWidth: '280px' }}>
                {/* Selector de Comercio */}
                <div style={{ minWidth: '210px' }}>
                  <select
                    className="form-input"
                    value={promoStoreFilter}
                    onChange={(e) => setPromoStoreFilter(e.target.value)}
                    style={{ fontSize: '0.82rem', padding: '7px 12px', fontWeight: 700 }}
                  >
                    <option value="ALL">🏪 Todos los Comercios ({promotionsList.length})</option>
                    {stores.map(st => {
                      const count = promotionsList.filter(p => String(p.storeId) === String(st.id)).length;
                      const active = promotionsList.filter(p => String(p.storeId) === String(st.id) && isStorePromotionActive(p)).length;
                      return (
                        <option key={st.id} value={st.id}>
                          {st.name} ({active} activas / {count} total)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Filtro de Estado tipo pills */}
                <div style={{ display: 'flex', gap: '6px', background: '#F1ECE4', padding: '3px', borderRadius: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setPromoStatusFilter('ALL')}
                    style={{
                      padding: '5px 10px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      background: promoStatusFilter === 'ALL' ? '#FFFFFF' : 'transparent',
                      color: promoStatusFilter === 'ALL' ? 'var(--c-primary)' : 'var(--text-muted)',
                      boxShadow: promoStatusFilter === 'ALL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    Todas ({promoMetrics.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPromoStatusFilter('ACTIVE')}
                    style={{
                      padding: '5px 10px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      background: promoStatusFilter === 'ACTIVE' ? '#16A34A' : 'transparent',
                      color: promoStatusFilter === 'ACTIVE' ? '#FFFFFF' : 'var(--text-muted)',
                      boxShadow: promoStatusFilter === 'ACTIVE' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    Activas ({promoMetrics.active})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPromoStatusFilter('EXPIRED')}
                    style={{
                      padding: '5px 10px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      background: promoStatusFilter === 'EXPIRED' ? '#FFFFFF' : 'transparent',
                      color: promoStatusFilter === 'EXPIRED' ? '#DC2626' : 'var(--text-muted)',
                      boxShadow: promoStatusFilter === 'EXPIRED' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    Finalizadas ({promoMetrics.expired})
                  </button>
                </div>
              </div>

              {/* Buscador */}
              <div style={{ position: 'relative', width: '240px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Buscar promoción..."
                  value={promoSearchQuery}
                  onChange={(e) => setPromoSearchQuery(e.target.value)}
                  style={{ paddingLeft: '32px', fontSize: '0.80rem' }}
                />
                {promoSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setPromoSearchQuery('')}
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 3. Grid de Tarjetas de Promoción */}
          {filteredPromotionsList.length === 0 ? (
            <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <Megaphone size={40} color="var(--text-dim)" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 6px', color: 'var(--text-main)' }}>
                No se encontraron promociones
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '0 0 16px' }}>
                {promoStoreFilter !== 'ALL' || promoStatusFilter !== 'ALL' || promoSearchQuery
                  ? 'Prueba cambiando los filtros de comercio o término de búsqueda.'
                  : 'Aún no hay promociones creadas por los comercios. Puedes crear una ahora como Administrador.'}
              </p>
              <button
                type="button"
                onClick={() => setCreatingPromoModal(true)}
                className="btn btn-secondary"
                style={{ fontSize: '0.80rem', fontWeight: 700 }}
              >
                + Crear Primera Promoción
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
              {filteredPromotionsList.map(promo => {
                const isActive = isStorePromotionActive(promo);
                const targetStore = stores.find(s => s.id === promo.storeId);
                const storeName = promo.storeName || targetStore?.name || promo.storeId || 'Comercio';
                const totalStock = promo.isUnlimited ? 'Ilimitado' : (promo.totalStock || 0);
                const claimedCount = promo.claimedCount || (Array.isArray(promo.claimedUserIds) ? promo.claimedUserIds.length : 0);
                const remainingStock = promo.isUnlimited ? '∞' : Math.max(0, (promo.totalStock || 0) - claimedCount);
                const pushDispatches = promo.totalPushDispatches || 1;

                return (
                  <div
                    key={promo.id}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '16px',
                      border: isActive ? '1.5px solid #BBF7D0' : '1px solid var(--border-subtle)',
                      boxShadow: isActive ? '0 4px 14px rgba(22, 163, 74, 0.08)' : '0 2px 8px rgba(0,0,0,0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* Header de la Tarjeta con Comercio y Estado */}
                    <div style={{
                      padding: '14px 16px',
                      background: isActive ? 'linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%)' : '#FAF8F5',
                      borderBottom: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <StoreLogoBadge store={targetStore || { name: storeName, id: promo.storeId }} size={34} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {storeName}
                          </div>
                          <div style={{ fontSize: '0.70rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>ID: {promo.storeId}</span>
                            {targetStore?.category && <span>• {targetStore.category}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Badge de tiempo / estado */}
                      <div>
                        {getPromoTimeRemainingBadge(promo)}
                      </div>
                    </div>

                    {/* Cuerpo de la Tarjeta */}
                    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Badge de tipo de promoción */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          background: promo.badgeType === '2X1' ? '#FEF3C7' : promo.badgeType === 'FLASH' ? '#FEE2E2' : 'var(--c-primary-soft)',
                          color: promo.badgeType === '2X1' ? '#92400E' : promo.badgeType === 'FLASH' ? '#991B1B' : 'var(--c-primary)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}>
                          {promo.badgeType === '2X1' ? '🎁 2x1' : promo.badgeType === 'FLASH' ? '⚡ Venta Flash' : promo.badgeType === 'DESCUENTO' ? '🏷️ Descuento' : '🔥 Promoción'}
                        </span>

                        <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                          #{promo.id?.slice(-8)}
                        </span>
                      </div>

                      {/* Título y Mensaje */}
                      <div>
                        <h4 style={{ margin: '0 0 6px', fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.3 }}>
                          {promo.title}
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.80rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                          {promo.message}
                        </p>
                      </div>

                      {/* Imagen si existe */}
                      {promo.imageUrl && (
                        <div style={{ width: '100%', height: '110px', borderRadius: '10px', overflow: 'hidden', background: '#F1ECE4' }}>
                          <img
                            src={promo.imageUrl}
                            alt={promo.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        </div>
                      )}

                      {/* Progreso de Cupones / Stock */}
                      <div style={{ background: '#FAF8F5', borderRadius: '10px', padding: '10px 12px', border: '1px solid #EDE6DD' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                            🎟️ Cupones Reclamados:
                          </span>
                          <span style={{ fontWeight: 800, color: 'var(--c-primary)' }}>
                            {claimedCount} / {promo.isUnlimited ? '∞ Ilimitado' : totalStock}
                          </span>
                        </div>
                        {!promo.isUnlimited && (
                          <div style={{ width: '100%', height: '6px', background: '#E2DCD4', borderRadius: '3px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${Math.min(100, (claimedCount / (promo.totalStock || 1)) * 100)}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #16A34A 0%, #15803D 100%)',
                                borderRadius: '3px'
                              }}
                            />
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                          <span>Restantes: <strong>{remainingStock}</strong></span>
                          <span>Vence: <strong>{formatPromoDate(promo.validityDate || promo.expiresAt)}</strong></span>
                        </div>
                      </div>

                      {/* Estado de Notificación Push */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-subtle)', paddingTop: '8px' }}>
                        <span>
                          🔔 <strong>{pushDispatches}</strong> {pushDispatches === 1 ? 'difusión push' : 'difusiones push'}
                        </span>
                        <span>
                          {promo.lastPushSentAt ? `Último: ${formatPromoDate(promo.lastPushSentAt)}` : 'Sin envíos recientes'}
                        </span>
                      </div>
                    </div>

                    {/* Barra de Acciones de la Tarjeta */}
                    <div style={{
                      padding: '10px 16px',
                      background: '#FAF8F5',
                      borderTop: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {isActive ? (
                          <button
                            type="button"
                            onClick={() => setPromoToDeactivate(promo)}
                            className="btn btn-secondary"
                            style={{
                              padding: '5px 8px',
                              fontSize: '0.72rem',
                              color: '#DC2626',
                              borderColor: '#FECDD3',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Finalizar o pausar promoción"
                          >
                            <X size={12} />
                            <span>Finalizar</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAdminSendPromotionPush(promo)}
                            className="btn btn-secondary"
                            style={{
                              padding: '5px 8px',
                              fontSize: '0.72rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Reactivar y reenviar promoción"
                          >
                            <CheckCircle2 size={12} color="#16A34A" />
                            <span>Reactivar</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleAdminDeletePromotion(promo)}
                          className="btn btn-secondary"
                          style={{
                            padding: '5px 7px',
                            fontSize: '0.72rem',
                            color: '#DC2626',
                            borderColor: '#FECDD3',
                            background: '#FFF1F2'
                          }}
                          title="Eliminar permanentemente"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {/* Botón Principal: Enviar / Reenviar Push */}
                      <button
                        type="button"
                        onClick={() => setPromoToPush(promo)}
                        className="btn btn-primary"
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)',
                          borderColor: '#1D4ED8',
                          boxShadow: '0 2px 6px rgba(37,99,235,0.25)'
                        }}
                        title="Enviar notificación push a todos los clientes de este comercio"
                      >
                        <Megaphone size={13} />
                        <span>{pushDispatches > 0 ? '🚀 Reenviar Push' : '🚀 Enviar Push'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: RULES CONFIGURATION (RN-10) */}
      {activeTab === 'RULES' && (
        <div className="glass-panel" style={{ padding: '24px', maxWidth: '780px', margin: '0 auto' }}>
          <div style={{ marginBottom: '18px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Settings size={20} color="var(--c-primary)" />
              Parámetros Comerciales del Programa (RN-10)
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>
              Ajusta las reglas de acumulación, canjes y tasas de cambio.
            </p>
          </div>

          <form onSubmit={handleSaveConfig} noValidate>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '14px', marginBottom: '16px' }}>
              
              <div className="form-group">
                <label className="form-label">Compra Mínima para Sello (US$) (RN-02)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  className="form-input"
                  value={configForm.minPurchaseUsd ?? 5}
                  onChange={(e) => setConfigForm({ ...configForm, minPurchaseUsd: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Meta de Sellos por Defecto (RN-03)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  className="form-input"
                  value={configForm.defaultStampsTarget ?? 6}
                  onChange={(e) => setConfigForm({ ...configForm, defaultStampsTarget: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Radio de Proximidad GPS (Metros)</label>
                <input
                  type="number"
                  step="50"
                  min="100"
                  className="form-input"
                  value={configForm.proximityRadiusMeters ?? 500}
                  onChange={(e) => setConfigForm({ ...configForm, proximityRadiusMeters: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Vigencia de Tarjeta (Meses)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  className="form-input"
                  value={configForm.pointsValidityMonths ?? 12}
                  onChange={(e) => setConfigForm({ ...configForm, pointsValidityMonths: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Tasa Oficial USD/VES (RN-04)</label>
                  {onRefreshDolarRate && (
                    <button
                      type="button"
                      onClick={onRefreshDolarRate}
                      disabled={isFetchingDolarRate}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--c-primary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.74rem',
                        fontWeight: 700
                      }}
                      title="Sincronizar cotización oficial BCV desde DolarApi Venezuela"
                    >
                      <RefreshCw size={11} style={{ animation: isFetchingDolarRate ? 'spin 1s linear infinite' : 'none' }} />
                      <span>{isFetchingDolarRate ? 'Consultando...' : 'Sincronizar DolarApi'}</span>
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  className="form-input"
                  value={configForm.vesExchangeRate ?? 1}
                  onChange={(e) => setConfigForm({ ...configForm, vesExchangeRate: e.target.value })}
                  required
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Consumido en vivo desde <strong>DolarApi.com</strong> (BCV Oficial).
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">% Retorno por Defecto en Compras (%)</label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  max="100"
                  className="form-input"
                  value={configForm.defaultCashbackPercent ?? 5.0}
                  onChange={(e) => setConfigForm({ ...configForm, defaultCashbackPercent: e.target.value })}
                  required
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Porcentaje base para tiendas (por defecto <strong>5.0%</strong> de cada compra).
                </span>
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label className="form-label" style={{ marginBottom: '8px' }}>
                  Activación Individual por Comercio (No Global)
                </label>
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: '#F0FDF4',
                  border: '1.5px solid #BBF7D0',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}>
                  <div style={{ fontSize: '1.2rem', lineHeight: 1 }}>🏪</div>
                  <div style={{ fontSize: '0.78rem', color: '#166534', lineHeight: 1.45 }}>
                    <strong>Control Individual por Tienda:</strong> La activación de la configuración de % no es global. El Administrador decide tienda por tienda activándolo o bloqueándolo individualmente desde la pestaña <strong>Comercios</strong> con el interruptor <strong>"Permiso Tienda"</strong>.
                  </div>
                </div>
              </div>
            </div>

            
            {/* SECCIÓN: POLÍTICAS DE DIFUSIÓN PUSH & NOTIFICACIONES DE TIENDAS */}
            <div style={{
              marginTop: '22px',
              marginBottom: '20px',
              padding: '20px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.03) 0%, rgba(15, 23, 42, 0.05) 100%)',
              border: '1.5px solid rgba(156, 56, 42, 0.25)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #70092B 0%, #B85D43 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF'
                }}>
                  <Megaphone size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                    Políticas de Difusión Push y Promociones para Comercios
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                    Controla la frecuencia de envíos mensuales y el límite de destinatarios para prevenir saturación a los clientes.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '16px' }}>
                {/* 1. Límite Mensual de Envíos Push */}
                <div className="form-group" style={{ background: '#FFFFFF', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <label className="form-label" style={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Límite Push al Mes por Tienda</span>
                    <span style={{ color: configForm.unlimitedPushPerStore ? '#16A34A' : 'var(--c-primary)', fontSize: '0.72rem' }}>
                      {configForm.unlimitedPushPerStore ? '✨ Ilimitado' : `${configForm.maxMonthlyPushPerStore ?? 4} al mes`}
                    </span>
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setConfigForm(prev => ({ ...prev, unlimitedPushPerStore: false }))}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '8px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        border: !configForm.unlimitedPushPerStore ? '2px solid var(--c-primary)' : '1px solid var(--border-subtle)',
                        background: !configForm.unlimitedPushPerStore ? 'var(--c-secondary-soft)' : '#FAF8F5',
                        color: !configForm.unlimitedPushPerStore ? 'var(--c-primary)' : 'var(--text-muted)'
                      }}
                    >
                      🔒 Con Límite
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfigForm(prev => ({ ...prev, unlimitedPushPerStore: true }))}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '8px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        border: configForm.unlimitedPushPerStore ? '2px solid var(--c-primary)' : '1px solid var(--border-subtle)',
                        background: configForm.unlimitedPushPerStore ? 'var(--c-secondary-soft)' : '#FAF8F5',
                        color: configForm.unlimitedPushPerStore ? 'var(--c-primary)' : 'var(--text-muted)'
                      }}
                    >
                      ✨ Sin Límite
                    </button>
                  </div>

                  {!configForm.unlimitedPushPerStore && (
                    <div>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        className="form-input"
                        value={configForm.maxMonthlyPushPerStore ?? 4}
                        onChange={(e) => setConfigForm({ ...configForm, maxMonthlyPushPerStore: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                        required={!configForm.unlimitedPushPerStore}
                      />
                      <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                        Máximo de difusiones push permitidas por local cada mes calendario.
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Límite de Personas / Destinatarios por Envío */}
                <div className="form-group" style={{ background: '#FFFFFF', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <label className="form-label" style={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Límite de Personas por Envío</span>
                    <span style={{ color: configForm.unlimitedRecipientsPerPush ? '#16A34A' : 'var(--c-primary)', fontSize: '0.72rem' }}>
                      {configForm.unlimitedRecipientsPerPush ? '✨ Todos los fidelizados' : `Máx. ${configForm.maxPushRecipientsPerBroadcast ?? 100} pers.`}
                    </span>
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setConfigForm(prev => ({ ...prev, unlimitedRecipientsPerPush: false }))}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '8px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        border: !configForm.unlimitedRecipientsPerPush ? '2px solid var(--c-primary)' : '1px solid var(--border-subtle)',
                        background: !configForm.unlimitedRecipientsPerPush ? 'var(--c-secondary-soft)' : '#FAF8F5',
                        color: !configForm.unlimitedRecipientsPerPush ? 'var(--c-primary)' : 'var(--text-muted)'
                      }}
                    >
                      👥 Limitar Personas
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfigForm(prev => ({ ...prev, unlimitedRecipientsPerPush: true }))}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '8px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        border: configForm.unlimitedRecipientsPerPush ? '2px solid var(--c-primary)' : '1px solid var(--border-subtle)',
                        background: configForm.unlimitedRecipientsPerPush ? 'var(--c-secondary-soft)' : '#FAF8F5',
                        color: configForm.unlimitedRecipientsPerPush ? 'var(--c-primary)' : 'var(--text-muted)'
                      }}
                    >
                      ✨ Sin Tope (Todos)
                    </button>
                  </div>

                  {!configForm.unlimitedRecipientsPerPush && (
                    <div>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        className="form-input"
                        value={configForm.maxPushRecipientsPerBroadcast ?? 100}
                        onChange={(e) => setConfigForm({ ...configForm, maxPushRecipientsPerBroadcast: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                        required={!configForm.unlimitedRecipientsPerPush}
                      />
                      <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                        Tope de clientes que recibirán la notificación push en cada envío de la tienda.
                      </span>
                    </div>
                  )}
                </div>

                {/* 3. Permitir Reenvío de Notificación Push */}
                <div className="form-group" style={{ background: '#FFFFFF', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <label className="form-label" style={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Reenvío de Promociones Creadas</span>
                    <span style={{ color: configForm.allowPushResend !== false ? '#16A34A' : '#EF4444', fontSize: '0.72rem' }}>
                      {configForm.allowPushResend !== false ? '✓ Habilitado' : '⛔ Deshabilitado'}
                    </span>
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setConfigForm(prev => ({ ...prev, allowPushResend: true }))}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '8px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        border: configForm.allowPushResend !== false ? '2px solid var(--c-primary)' : '1px solid var(--border-subtle)',
                        background: configForm.allowPushResend !== false ? 'var(--c-secondary-soft)' : '#FAF8F5',
                        color: configForm.allowPushResend !== false ? 'var(--c-primary)' : 'var(--text-muted)'
                      }}
                    >
                      🔔 Permitir Reenviar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfigForm(prev => ({ ...prev, allowPushResend: false }))}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '8px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        border: configForm.allowPushResend === false ? '2px solid var(--c-primary)' : '1px solid var(--border-subtle)',
                        background: configForm.allowPushResend === false ? 'var(--c-secondary-soft)' : '#FAF8F5',
                        color: configForm.allowPushResend === false ? 'var(--c-primary)' : 'var(--text-muted)'
                      }}
                    >
                      ⛔ Un Solo Envío
                    </button>
                  </div>

                  <div style={{ marginTop: '8px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                      Tiempo mínimo entre reenvíos (Horas de espera):
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="720"
                      className="form-input"
                      value={configForm.pushResendCooldownHours ?? 24}
                      onChange={(e) => setConfigForm({ ...configForm, pushResendCooldownHours: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                    />
                    <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                      Evita que la tienda reenvíe push repetidamente en lapsos cortos de tiempo.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN: MEMBRESÍA POS & PERÍODO DE PRUEBA DE TIENDAS */}
            <div style={{
              marginTop: '22px',
              marginBottom: '20px',
              padding: '20px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.05) 0%, rgba(217, 119, 6, 0.08) 100%)',
              border: '1.5px solid rgba(217, 119, 6, 0.35)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF'
                }}>
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                    Membresía POS & Período de Prueba de Tiendas
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                    Configura los meses de cortesía al registrarse y el costo mensual de la suscripción para el software POS.
                  </p>
                </div>
              </div>

              {/* 1. Selector de Meses de Prueba */}
              <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span>Período de Prueba Gratis para Nuevas Tiendas</span>
                  <span style={{
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: (configForm.storeTrialMonths ?? 0) === 0 ? '#FEE2E2' : '#FEF3C7',
                    color: (configForm.storeTrialMonths ?? 0) === 0 ? '#DC2626' : '#B45309'
                  }}>
                    {(configForm.storeTrialMonths ?? 0) === 0 
                      ? '🚫 Sin prueba (Pago Inmediato)' 
                      : `🎁 ${configForm.storeTrialMonths ?? 0} mes(es) gratis`}
                  </span>
                </label>

                {/* Botones de Selección Rápida */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                  {[
                    { label: '0 meses (Inmediato)', value: 0, desc: 'Exige pago al crear' },
                    { label: '1 mes (30 días)', value: 1, desc: 'Prueba estándar' },
                    { label: '2 meses (60 días)', value: 2, desc: 'Promoción especial' },
                    { label: '3 meses (90 días)', value: 3, desc: 'Por defecto previo' }
                  ].map(opt => {
                    const isSelected = (parseInt(configForm.storeTrialMonths ?? 0, 10)) === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setConfigForm(prev => ({ ...prev, storeTrialMonths: opt.value }))}
                        style={{
                          padding: '10px 8px',
                          borderRadius: '10px',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px',
                          border: isSelected ? '2px solid #D97706' : '1px solid var(--border-subtle)',
                          background: isSelected ? '#FEF3C7' : '#FAF8F5',
                          color: isSelected ? '#92400E' : 'var(--text-main)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>{opt.label}</span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 600, opacity: 0.8 }}>{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Input manual adicional */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    O introduce el número exacto de meses:
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="36"
                    step="1"
                    style={{ width: '80px', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontWeight: 800, textAlign: 'center' }}
                    value={configForm.storeTrialMonths ?? 0}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, storeTrialMonths: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>meses</span>
                </div>

                <div style={{
                  marginTop: '10px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '0.74rem',
                  lineHeight: 1.4,
                  background: (configForm.storeTrialMonths ?? 0) === 0 ? '#FEF2F2' : '#F0FDF4',
                  color: (configForm.storeTrialMonths ?? 0) === 0 ? '#991B1B' : '#166534',
                  border: `1px solid ${(configForm.storeTrialMonths ?? 0) === 0 ? '#FECACA' : '#BBF7D0'}`
                }}>
                  {(configForm.storeTrialMonths ?? 0) === 0 ? (
                    <>
                      <strong>⚠️ Modo Pago Inmediato Activado:</strong> Las tiendas que se registren a partir de ahora no tendrán período de prueba. Se bloquearán de inmediato en el panel POS solicitando el pago de la membresía básica para poder usar la plataforma.
                    </>
                  ) : (
                    <>
                      <strong>💡 Período de Cortesía Activo:</strong> Toda nueva tienda registrada tendrá <strong>{configForm.storeTrialMonths ?? 0} mes(es)</strong> gratis para familiarizarse con el POS antes de tener que pagar su membresía.
                    </>
                  )}
                </div>
              </div>

              {/* 2. Precio de Membresía USD y Tasa BCV */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '14px', marginBottom: '14px' }}>
                <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <label className="form-label" style={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Precio Mensual de Membresía</span>
                    <span style={{ color: '#16A34A', fontSize: '0.76rem' }}>USD a Tasa BCV</span>
                  </label>
                  <div style={{ position: 'relative', marginTop: '6px' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: 'var(--text-muted)' }}>$</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      className="form-input"
                      style={{ paddingLeft: '28px', fontWeight: 800, fontSize: '1rem' }}
                      value={configForm.subscriptionPriceUsd ?? 5.0}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, subscriptionPriceUsd: e.target.value }))}
                      required
                    />
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Equivalente estimado: <strong style={{ color: 'var(--text-main)' }}>Bs. {((parseFloat(configForm.subscriptionPriceUsd) || 5.0) * (parseFloat(configForm.vesExchangeRate) || (config && config.vesExchangeRate) || 1)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> al cambio oficial.
                  </div>
                </div>

                <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <label className="form-label" style={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between' }}>
                    <span>WhatsApp de Soporte / Reporte de Pago</span>
                    <span style={{ color: '#25D366', fontSize: '0.74rem' }}>WhatsApp</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: 584242098250"
                    value={configForm.supportWhatsapp ?? '584242098250'}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, supportWhatsapp: e.target.value }))}
                  />
                  <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Número con código de país sin '+' al que la tienda envía el comprobante.
                  </span>
                </div>
              </div>

              {/* 3. Datos de Pago Móvil (Sincronizados con Barber App) */}
              <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <label className="form-label" style={{ fontWeight: 800, margin: 0 }}>
                    Datos Bancarios para Pago Móvil (Recepción de Membresías)
                  </label>
                  <span style={{ fontSize: '0.70rem', color: '#16A34A', fontWeight: 700 }}>
                    ✓ Sincronizado con Barber App
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Banco Destino:</label>
                    <input
                      type="text"
                      className="form-input"
                      value={configForm.subscriptionPagoMovilBank ?? 'Banco de Venezuela (0102)'}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, subscriptionPagoMovilBank: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Teléfono Pago Móvil:</label>
                    <input
                      type="text"
                      className="form-input"
                      value={configForm.subscriptionPagoMovilPhone ?? '04242098250'}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, subscriptionPagoMovilPhone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Cédula / RIF:</label>
                    <input
                      type="text"
                      className="form-input"
                      value={configForm.subscriptionPagoMovilId ?? 'J410679891'}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, subscriptionPagoMovilId: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Titular de la Cuenta:</label>
                    <input
                      type="text"
                      className="form-input"
                      value={configForm.subscriptionPagoMovilHolder ?? 'fidely CLUB / Conecta2'}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, subscriptionPagoMovilHolder: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* 4. Política de Aprobación de Nuevas Tiendas */}
              <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', marginTop: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <label className="form-label" style={{ fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>Requerir Aprobación de Nuevos Comercios</span>
                      <span style={{
                        fontSize: '0.70rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: configForm.requireStoreApproval !== false ? '#FEF3C7' : '#DCFCE7',
                        color: configForm.requireStoreApproval !== false ? '#B45309' : '#15803D'
                      }}>
                        {configForm.requireStoreApproval !== false ? '🔒 Aprobación Manual Requerida' : '⚡ Aprobación Automática Instantánea'}
                      </span>
                    </label>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                      {configForm.requireStoreApproval !== false
                        ? 'Las tiendas nuevas quedan en estado "PENDIENTE" y requieren que el Super Administrador las apruebe antes de operar.'
                        : 'Las tiendas nuevas se activan inmediatamente ("APROBADO") al registrarse y pueden ingresar de inmediato a su panel POS.'}
                    </p>
                  </div>

                  <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', cursor: 'pointer', flexShrink: 0 }}>
                    <input
                      type="checkbox"
                      checked={configForm.requireStoreApproval !== false}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, requireStoreApproval: e.target.checked }))}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: configForm.requireStoreApproval !== false ? 'var(--c-primary, #70092B)' : '#CBD5E1',
                      transition: '.3s',
                      borderRadius: '34px'
                    }}>
                      <span style={{
                        position: 'absolute',
                        height: '20px',
                        width: '20px',
                        left: configForm.requireStoreApproval !== false ? '24px' : '4px',
                        bottom: '3px',
                        backgroundColor: 'white',
                        transition: '.3s',
                        borderRadius: '50%'
                      }} />
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={isSavingConfig}
              className="btn btn-accent"
              style={{
                width: '100%',
                padding: '14px',
                marginTop: '12px',
                fontSize: '0.94rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: isSavingConfig ? 0.75 : 1,
                cursor: isSavingConfig ? 'wait' : 'pointer'
              }}
            >
              {isSavingConfig ? <RefreshCw size={16} className="spin-icon" /> : <CheckCircle2 size={18} />}
              <span>{isSavingConfig ? 'Guardando cambios en la nube...' : 'Guardar Reglas Comerciales'}</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 6: AUDIT */}
      {activeTab === 'AUDIT' && (
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ marginBottom: '14px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={18} color="var(--c-primary)" />
              Libro Contable de Auditoría Inmutable (RN-12)
            </h2>
          </div>

          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Sellos / Movimiento</th>
                  <th>Estado</th>
                  <th>Origen</th>
                  <th>Autorizado Por</th>
                  <th>Notas</th>
                </tr>
              </thead>
              <tbody>
                {movements.map(m => {
                  const client = clients.find(c => c.id === m.clientId);
                  return (
                    <tr key={m.id}>
                      <td><code style={{ fontSize: '0.74rem' }}>{m.id}</code></td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{m.date}</td>
                      <td><strong>{client?.name || m.clientId}</strong></td>
                      <td>
                        <span className={`badge ${
                          m.type === 'ACREDITACION' ? 'badge-emerald' :
                          m.type === 'CANJE' ? 'badge-accent' : 'badge-rose'
                        }`}>
                          {m.type}
                        </span>
                      </td>
                      <td>
                        <strong style={{
                          color: m.points > 0 ? 'var(--c-emerald)' : 'var(--c-rose)',
                          fontSize: '0.94rem'
                        }}>
                          {m.points > 0 ? `+${m.points} sellos` : `${m.points} sellos`}
                        </strong>
                      </td>
                      <td><span className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>Registrado</span></td>
                      <td style={{ fontSize: '0.8rem' }}>{m.storeName}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.authorizedBy}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{m.notes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: FIREBASE CLOUD MANAGEMENT */}
      {activeTab === 'FIREBASE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Main Hero Card */}
          <div className="glass-panel" style={{
            padding: '24px',
            background: 'linear-gradient(135deg, #FFFBEB 0%, #FFFFFF 100%)',
            border: '1.5px solid #FDE68A'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #FFA000 0%, #F57C00 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 20px rgba(245, 124, 0, 0.3)'
                }}>
                  <Flame size={32} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      Servidor Cloud & Base de Datos
                    </h2>
                    <span className="badge" style={{
                      background: '#DCFCE7',
                      color: '#166534',
                      fontWeight: 700,
                      fontSize: '0.74rem'
                    }}>
                      Conectado
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
                    Base de datos distribuida <strong>Cloud Firestore</strong> y analítica integrada para la red <strong>fidely CLUB</strong>.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleTestFbConnection}
                  disabled={isTestingFb}
                  className="btn btn-outline"
                  style={{ fontSize: '0.84rem', padding: '8px 14px', gap: '6px' }}
                >
                  <RefreshCw size={15} className={isTestingFb ? 'spin' : ''} />
                  <span>{isTestingFb ? 'Verificando...' : 'Probar Conexión'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncToFirebase}
                  disabled={isFbSyncing}
                  className="btn btn-primary"
                  style={{
                    fontSize: '0.84rem',
                    padding: '8px 18px',
                    gap: '6px',
                    background: '#16A34A',
                    borderColor: '#16A34A'
                  }}
                >
                  <UploadCloud size={16} />
                  <span>{isFbSyncing ? 'Sincronizando...' : 'Subir Todo a Firestore'}</span>
                </button>
              </div>
            </div>

            {fbTestResult && (
              <div style={{
                marginTop: '18px',
                background: fbTestResult.connected ? '#F0FDF4' : '#FEF2F2',
                border: `1px solid ${fbTestResult.connected ? '#BBF7D0' : '#FECACA'}`,
                padding: '12px 16px',
                borderRadius: '10px',
                fontSize: '0.84rem',
                color: fbTestResult.connected ? '#166534' : '#991B1B',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                {fbTestResult.connected ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span>{fbTestResult.message}</span>
              </div>
            )}
          </div>

          {/* Card: Limpieza Integral para Producción */}
          <div className="glass-panel" style={{ padding: '20px', background: '#FFFBEB', border: '1.5px solid #FDE68A' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Trash2 size={20} color="#D97706" />
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#92400E' }}>
                    Limpiar Base de Datos para Producción & Pruebas Reales
                  </h3>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#B45309', maxWidth: '680px', lineHeight: 1.45 }}>
                  Elimina todas las compras de prueba, movimientos y solicitudes de canje de Cloud Firestore y localStorage, dejando el historial en 0 para comenzar a registrar tiendas y usuarios reales.
                </p>
              </div>

              <button
                type="button"
                disabled={isCleaningDb}
                onClick={handleCleanProductionDb}
                className="btn"
                style={{
                  background: '#DC2626',
                  color: '#FFFFFF',
                  padding: '10px 18px',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={16} />
                <span>{isCleaningDb ? 'Limpiando...' : 'Vaciar Compras y Canjes de Prueba'}</span>
              </button>
            </div>
          </div>

          {/* Configuration Parameters Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '14px' }}>
            <div className="glass-panel" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
                Project ID
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                {firebaseConfig.projectId}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--c-emerald)', marginTop: '4px' }}>
                Google Cloud Platform • Activo
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
                Auth Domain
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                {firebaseConfig.authDomain}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Email/Password y Tokens de Sesión
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
                Storage Bucket
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px', wordBreak: 'break-all' }}>
                {firebaseConfig.storageBucket}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Almacenamiento de archivos y assets
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
                Measurement ID (Analytics)
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                {firebaseConfig.measurementId}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--c-emerald)', marginTop: '4px' }}>
                Google Analytics 4 • En ejecución
              </div>
            </div>
          </div>

          {/* Cloud Collections Status */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cloud size={18} color="var(--c-primary)" />
              Colecciones y Sincronización en Tiempo Real
            </h3>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Colección Firestore</th>
                    <th>Documentos Locales</th>
                    <th>Estrategia de Sync</th>
                    <th>Destino Cloud</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>clients</strong></td>
                    <td>{clients.length} clientes</td>
                    <td>Tiempo Real (onSnapshot + setDoc)</td>
                    <td><code>/clients/{'{id}'}</code></td>
                    <td><span className="badge badge-emerald">Activo</span></td>
                  </tr>
                  <tr>
                    <td><strong>stores</strong></td>
                    <td>{stores.length} locales</td>
                    <td>Tiempo Real (onSnapshot)</td>
                    <td><code>/stores/{'{id}'}</code></td>
                    <td><span className="badge badge-emerald">Activo</span></td>
                  </tr>
                  <tr>
                    <td><strong>rewards</strong></td>
                    <td>{rewards.length} ítems catálogo</td>
                    <td>Tiempo Real (onSnapshot + setDoc)</td>
                    <td><code>/rewards/{'{id}'}</code></td>
                    <td><span className="badge badge-emerald">Activo</span></td>
                  </tr>
                  <tr>
                    <td><strong>purchases</strong></td>
                    <td>{purchases.length} compras</td>
                    <td>Tiempo Real (onSnapshot + setDoc)</td>
                    <td><code>/purchases/{'{id}'}</code></td>
                    <td><span className="badge badge-emerald">Activo</span></td>
                  </tr>
                  <tr>
                    <td><strong>movements</strong></td>
                    <td>{movements.length} movimientos de sellos y auditoría</td>
                    <td>Tiempo Real (onSnapshot + setDoc)</td>
                    <td><code>/movements/{'{id}'}</code></td>
                    <td><span className="badge badge-emerald">Activo</span></td>
                  </tr>
                  <tr>
                    <td><strong>redemptions</strong></td>
                    <td>{redemptions.length} canjes</td>
                    <td>Tiempo Real (onSnapshot + setDoc)</td>
                    <td><code>/redemptions/{'{id}'}</code></td>
                    <td><span className="badge badge-emerald">Activo</span></td>
                  </tr>
                  <tr>
                    <td><strong>config</strong></td>
                    <td>1 configuración global</td>
                    <td>Tiempo Real (onSnapshot)</td>
                    <td><code>/config/global</code></td>
                    <td><span className="badge badge-emerald">Activo</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Security Rules Notice */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="var(--c-primary)" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                  Reglas de Seguridad para Cloud Firestore
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCopyFbRules}
                className="btn btn-outline"
                style={{ padding: '5px 12px', fontSize: '0.78rem', gap: '6px' }}
              >
                {copiedFbRules ? <CheckCircle2 size={13} color="#16A34A" /> : <Copy size={13} />}
                <span>{copiedFbRules ? '¡Reglas Copiadas!' : 'Copiar Reglas'}</span>
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 0 }}>
              Si Cloud Firestore te indica un error de permisos o acceso denegado, copia este bloque y pégalo en la pestaña <strong>Reglas</strong> de Firestore en tu consola Cloud:
            </p>

            <pre style={{
              background: '#0F172A',
              color: '#38BDF8',
              padding: '14px',
              borderRadius: '10px',
              fontSize: '0.78rem',
              overflowX: 'auto',
              fontFamily: 'monospace'
            }}>
              {firestoreRulesSnippet}
            </pre>

            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
              <span>Ir directo a la consola del proyecto:</span>
              <a
                href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/rules`}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--c-primary)', fontWeight: 700, textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
              >
                Consola Cloud &gt; Reglas de Seguridad <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TAB: NOTIFICACIONES PUSH A COMERCIOS (APP MÓVIL POS) */}
      {activeTab === 'PUSH_STORES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Panel */}
          <div className="glass-panel" style={{ padding: 'clamp(14px, 3vw, 22px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: 'clamp(1.15rem, 4vw, 1.35rem)', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Smartphone size={22} color="var(--c-primary)" />
                  <span>Notificaciones Push a Comercios (App Móvil POS)</span>
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '4px 0 0', lineHeight: 1.4 }}>
                  Envía notificaciones push y alertas en tiempo real a los teléfonos y tablets de los comercios que ya acceden a su terminal POS por la aplicación móvil.
                </p>
              </div>

              {storesWithAppCount > 0 && (
                <div style={{
                  background: '#ECFDF5',
                  border: '1.5px solid #A7F3D0',
                  padding: '8px 14px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#065F46',
                  fontSize: '0.80rem',
                  fontWeight: 800
                }}>
                  <Smartphone size={16} color="#059669" />
                  <span>{storesWithAppCount} comercio(s) con App Móvil activa</span>
                </div>
              )}
            </div>

            {/* KPIs Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              marginTop: '18px'
            }}>
              <div className="card-kpi" style={{ borderLeft: '4px solid var(--c-primary)' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
                  Total Comercios
                </div>
                <div style={{ fontSize: '1.55rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '4px' }}>
                  {stores.length}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Registrados en Firestore
                </div>
              </div>

              <div className="card-kpi" style={{ borderLeft: '4px solid #10B981' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
                  Con App Móvil Activa
                </div>
                <div style={{ fontSize: '1.55rem', fontWeight: 900, color: '#047857', marginTop: '4px' }}>
                  {storesWithAppCount}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#065F46', marginTop: '2px', fontWeight: 700 }}>
                  🟢 Con terminal POS instalada
                </div>
              </div>

              <div className="card-kpi" style={{ borderLeft: '4px solid #3B82F6' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
                  Destinatarios Listos
                </div>
                <div style={{ fontSize: '1.55rem', fontWeight: 900, color: '#1D4ED8', marginTop: '4px' }}>
                  {pushTargetScope === 'SPECIFIC'
                    ? (pushSelectedStoreId ? 1 : 0)
                    : (pushTargetScope === 'ACTIVE_APP' ? storesWithAppCount : stores.length)}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {pushTargetScope === 'SPECIFIC' ? 'Comercio seleccionado' : 'Comercios alcanzados'}
                </div>
              </div>

              <div className="card-kpi" style={{ borderLeft: '4px solid #F59E0B' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
                  Historial de Envíos
                </div>
                <div style={{ fontSize: '1.55rem', fontWeight: 900, color: '#B45309', marginTop: '4px' }}>
                  {pushHistory.length}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Campañas / avisos enviados
                </div>
              </div>
            </div>
          </div>

          {/* Formulario de Redacción & Previsualización */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '18px'
          }}>
            {/* Columna Izquierda: Redacción */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={18} color="var(--c-primary)" />
                <span>Redactar Notificación Push</span>
              </h3>

              <form onSubmit={handleSendPushToStores} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Selector de Destinatarios */}
                <div>
                  <label className="form-label" style={{ fontSize: '0.80rem', fontWeight: 800, marginBottom: '6px' }}>
                    Destinatarios de la Notificación:
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: pushTargetScope === 'ALL_STORES' ? '2px solid var(--c-primary)' : '1px solid #E2E8F0',
                      background: pushTargetScope === 'ALL_STORES' ? 'rgba(156, 56, 42, 0.05)' : '#FFFFFF',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: 700
                    }}>
                      <input
                        type="radio"
                        name="pushScope"
                        value="ALL_STORES"
                        checked={pushTargetScope === 'ALL_STORES'}
                        onChange={() => setPushTargetScope('ALL_STORES')}
                        style={{ accentColor: 'var(--c-primary)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>🏢 Todos los Comercios Aliados ({stores.length})</span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#DCFCE7', color: '#166534', padding: '1px 6px', borderRadius: '4px' }}>
                            Web & App Móvil
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>
                          Llega a toda la red de comercios (se muestra en sus terminales web POS y en la app Conecta2)
                        </div>
                      </div>
                    </label>

                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: pushTargetScope === 'SPECIFIC' ? '2px solid var(--c-primary)' : '1px solid #E2E8F0',
                      background: pushTargetScope === 'SPECIFIC' ? 'rgba(156, 56, 42, 0.05)' : '#FFFFFF',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: 700
                    }}>
                      <input
                        type="radio"
                        name="pushScope"
                        value="SPECIFIC"
                        checked={pushTargetScope === 'SPECIFIC'}
                        onChange={() => setPushTargetScope('SPECIFIC')}
                        style={{ accentColor: 'var(--c-primary)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div>🎯 Enviar a un comercio específico</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>
                          Selecciona una tienda aliada individual para enviarle un comunicado directo
                        </div>
                      </div>
                    </label>

                    {pushTargetScope === 'SPECIFIC' && (
                      <div style={{ marginLeft: '26px' }}>
                        <select
                          className="form-input"
                          value={pushSelectedStoreId}
                          onChange={(e) => setPushSelectedStoreId(e.target.value)}
                          style={{ fontSize: '0.82rem', fontWeight: 700, padding: '8px 12px' }}
                          required
                        >
                          <option value="">-- Selecciona un comercio --</option>
                          {stores.map(st => (
                            <option key={st.id} value={st.id}>
                              {st.name} ({st.category || 'Comercio'}) • {st.city || 'Venezuela'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Plantillas Rápidas */}
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 800, marginBottom: '6px' }}>
                    Plantillas de Mensaje Rápido (Haz clic para usar):
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setPushTitle('🔔 ¡Revisa tus solicitudes pendientes en el POS!');
                        setPushBody('Tienes clientes esperando la acreditación de sellos o canjes de recompensas en tu terminal.');
                      }}
                      className="btn"
                      style={{ fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', background: '#FEF3C7', border: '1px solid #FCD34D', color: '#92400E', borderRadius: '8px' }}
                    >
                      🔔 Solicitudes Pendientes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPushTitle('⭐ Actualización de Fidely POS disponible');
                        setPushBody('Abre tu app para disfrutar de mayor velocidad al escanear sellos y gestionar canjes en mostrador.');
                      }}
                      className="btn"
                      style={{ fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', background: '#DBEAFE', border: '1px solid #BFDBFE', color: '#1E40AF', borderRadius: '8px' }}
                    >
                      ⭐ Nueva Actualización
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPushTitle('🎉 ¡Gran jornada de clientes fidelizados!');
                        setPushBody('Tus clientes están sumando sellos en tu local. Recuerda mantener visible el cartel QR de tu tienda en caja.');
                      }}
                      className="btn"
                      style={{ fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', background: '#DCFCE7', border: '1px solid #BBF7D0', color: '#166534', borderRadius: '8px' }}
                    >
                      🎉 Recordatorio de Cartel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPushTitle('⚠️ Aviso de soporte y mantenimiento');
                        setPushBody('Estaremos realizando mejoras de plataforma. Tu terminal POS continuará operando normalmente.');
                      }}
                      className="btn"
                      style={{ fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#334155', borderRadius: '8px' }}
                    >
                      ⚠️ Aviso de Soporte
                    </button>
                  </div>
                </div>

                {/* Campos de Título y Cuerpo */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label className="form-label" style={{ fontSize: '0.80rem', fontWeight: 700 }}>
                      Título de la Notificación *
                    </label>
                    <span style={{ fontSize: '0.70rem', color: 'var(--text-dim)' }}>
                      {pushTitle.length}/60 caracteres
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={60}
                    required
                    value={pushTitle}
                    onChange={(e) => setPushTitle(e.target.value)}
                    className="form-input"
                    placeholder="Ej. ¡Tienes nuevas solicitudes de sellos en caja!"
                    style={{ fontSize: '0.84rem', fontWeight: 700 }}
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label className="form-label" style={{ fontSize: '0.80rem', fontWeight: 700 }}>
                      Mensaje / Cuerpo de la Notificación *
                    </label>
                    <span style={{ fontSize: '0.70rem', color: 'var(--text-dim)' }}>
                      {pushBody.length}/200 caracteres
                    </span>
                  </div>
                  <textarea
                    maxLength={200}
                    rows={3}
                    required
                    value={pushBody}
                    onChange={(e) => setPushBody(e.target.value)}
                    className="form-input"
                    placeholder="Ej. Ingresa a la pestaña Solicitudes en tu app para aprobar los sellos de tus clientes..."
                    style={{ fontSize: '0.82rem', resize: 'vertical' }}
                  />
                </div>

                {/* Botón de Envío */}
                <button
                  type="submit"
                  disabled={isSendingPushToStores || !pushTitle.trim() || !pushBody.trim()}
                  className="btn btn-primary"
                  style={{
                    padding: '12px 20px',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'linear-gradient(135deg, var(--c-primary) 0%, #7E2A1F 100%)',
                    boxShadow: '0 4px 14px rgba(156, 56, 42, 0.3)',
                    cursor: (isSendingPushToStores || !pushTitle.trim() || !pushBody.trim()) ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Send size={16} />
                  <span>{isSendingPushToStores ? 'Disparando Push vía FCM...' : '🚀 Enviar Notificación Push Ahora'}</span>
                </button>
              </form>
            </div>

            {/* Columna Derecha: Vista Previa en Móvil */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Smartphone size={18} color="var(--c-primary)" />
                <span>Simulador de Notificación en Teléfono</span>
              </h3>

              <div style={{
                background: '#0F172A',
                borderRadius: '24px',
                padding: '24px 18px',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
                border: '3px solid #334155'
              }}>
                {/* Mockup de Teléfono - Notificación Popup */}
                <div style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  width: '100%',
                  maxWidth: '340px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.4)',
                  border: '1px solid #E2E8F0'
                }}>
                  {/* Notification Top bar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '5px',
                        background: 'var(--c-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        fontSize: '10px',
                        fontWeight: 900
                      }}>
                        F
                      </div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155' }}>
                        FIDELY POS
                      </span>
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                      ahora
                    </span>
                  </div>

                  {/* Notification Title */}
                  <div style={{
                    fontSize: '0.86rem',
                    fontWeight: 800,
                    color: '#0F172A',
                    marginBottom: '4px',
                    wordBreak: 'break-word'
                  }}>
                    {pushTitle.trim() || 'Título de la Notificación'}
                  </div>

                  {/* Notification Body */}
                  <div style={{
                    fontSize: '0.78rem',
                    color: '#475569',
                    lineHeight: '1.35',
                    wordBreak: 'break-word'
                  }}>
                    {pushBody.trim() || 'Aquí se mostrará el mensaje que redactes. Al comercio le llegará con alerta sonora y vibración al teléfono.'}
                  </div>

                  {/* Notification Footer action */}
                  <div style={{
                    marginTop: '10px',
                    paddingTop: '8px',
                    borderTop: '1px solid #F1F5F9',
                    fontSize: '0.70rem',
                    fontWeight: 700,
                    color: 'var(--c-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span>👉 Toca para abrir terminal POS</span>
                  </div>
                </div>

                <div style={{ marginTop: '16px', fontSize: '0.72rem', color: '#94A3B8', textAlign: 'center' }}>
                  El comercio recibe esta alerta nativa en su barra de estado de Android o iOS.
                </div>
              </div>
            </div>
          </div>

          {/* Historial de Envíos */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="var(--c-primary)" />
              <span>Historial de Notificaciones Push a Comercios ({pushHistory.length})</span>
            </h3>

            {pushHistory.length === 0 ? (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                background: '#FAF8F5',
                borderRadius: '12px',
                border: '1px dashed var(--border-subtle)',
                fontSize: '0.84rem'
              }}>
                Aún no se han enviado notificaciones push a comercios desde esta consola.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table" style={{ width: '100%', fontSize: '0.80rem' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '10px 12px' }}>Fecha & Hora</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px' }}>Título</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px' }}>Mensaje</th>
                      <th style={{ textAlign: 'center', padding: '10px 12px' }}>Alcance</th>
                      <th style={{ textAlign: 'center', padding: '10px 12px' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pushHistory.map(item => (
                      <tr key={item.id}>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--text-muted)' }}>
                          {item.sentAt ? new Date(item.sentAt).toLocaleString('es-VE') : 'Reciente'}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--text-main)' }}>
                          {item.title}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)', maxWidth: '280px' }}>
                          {item.body}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{
                            background: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            color: '#1E40AF',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.72rem'
                          }}>
                            {item.targetStoresCount || item.tokensCount || 1} comercio(s)
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{
                            background: '#DCFCE7',
                            color: '#15803D',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <CheckCircle2 size={12} />
                            <span>{item.status || 'ENVIADO'}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: AJUSTE MANUAL DE SELLOS EN TARJETA */}
      {adjustingClient && (
        <div className="modal-overlay" onClick={() => setAdjustingClient(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={18} color="var(--c-primary)" />
                Ajuste Manual de Sellos en Tarjeta (RN-12)
              </h3>
              <button onClick={() => setAdjustingClient(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {(() => {
              const currentCard = (adjustingClient.loyaltyCards || []).find(c => c.storeId === adjustmentStoreId);
              const storeObj = stores.find(s => s.id === adjustmentStoreId) || stores[0];
              const curStamps = currentCard ? Number(currentCard.currentStamps || 0) : 0;
              const targetStamps = currentCard ? Number(currentCard.stampsTarget || 6) : (storeObj?.stampsTarget || 6);

              return (
                <div style={{ background: '#F4FBF7', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '14px' }}>
                  <div style={{ fontWeight: 700, marginBottom: '4px' }}>Cliente: <strong>{adjustingClient.name}</strong></div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Estado actual en <strong>{storeObj?.name}</strong>: <span className="badge badge-accent" style={{ fontWeight: 800, marginLeft: '6px' }}>⭐ {curStamps} / {targetStamps} sellos</span>
                  </div>
                </div>
              );
            })()}

            <form onSubmit={handleSaveAdjustment}>
              <div className="form-group">
                <label className="form-label">Acción</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('ADD')}
                    className="btn"
                    style={{
                      flex: 1,
                      background: adjustmentType === 'ADD' ? '#16A34A' : '#FFFFFF',
                      color: adjustmentType === 'ADD' ? '#fff' : 'var(--text-main)',
                      border: '1px solid var(--border-subtle)',
                      fontWeight: 800
                    }}
                  >
                    + Acreditar Sellos
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('SUBTRACT')}
                    className="btn"
                    style={{
                      flex: 1,
                      background: adjustmentType === 'SUBTRACT' ? 'var(--c-rose)' : '#FFFFFF',
                      color: adjustmentType === 'SUBTRACT' ? '#fff' : 'var(--text-main)',
                      border: '1px solid var(--border-subtle)',
                      fontWeight: 800
                    }}
                  >
                    - Debitar Sellos
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Local Comercial / Tienda *</label>
                <select
                  className="form-input"
                  value={adjustmentStoreId}
                  onChange={(e) => setAdjustmentStoreId(e.target.value)}
                >
                  {stores.map(st => {
                    const card = (adjustingClient?.loyaltyCards || []).find(c => c.storeId === st.id);
                    const stStamps = card ? card.currentStamps : 0;
                    const stTarget = card ? card.stampsTarget : (st.stampsTarget || 6);
                    return (
                      <option key={st.id} value={st.id}>
                        {st.name} ({stStamps}/{stTarget} sellos acumulados)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Cantidad de Sellos (+/-) *</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  placeholder="Ej. 1"
                  value={adjustmentPoints}
                  onChange={(e) => setAdjustmentPoints(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Motivo de Auditoría (RN-12) *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. Compensación autorizada o corrección de sello en caja"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setAdjustingClient(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-accent"
                  style={{ flex: 2, fontWeight: 800 }}
                >
                  Confirmar Ajuste de Sellos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECOMPENSA */}
      {showRewardModal && (
        <div className="modal-overlay" onClick={() => setShowRewardModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                {editingReward ? 'Editar Recompensa' : 'Nueva Recompensa'}
              </h3>
              <button onClick={() => setShowRewardModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveReward}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>Título *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. 1 Café Espresso o Almuerzo Ejecutivo"
                  value={rewardForm.title}
                  onChange={(e) => setRewardForm({ ...rewardForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>Descripción *</label>
                <textarea
                  className="form-textarea"
                  rows="2"
                  value={rewardForm.description}
                  onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
                  required
                />
              </div>

              <div className="grid-form-2col" style={{ marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>Alcance / Tienda *</label>
                  <select
                    className="form-input"
                    value={rewardForm.storeScope || 'ALL'}
                    onChange={(e) => setRewardForm({ ...rewardForm, storeScope: e.target.value })}
                  >
                    <option value="ALL">🏢 Red Global (Todas las Tiendas)</option>
                    {stores.map(st => (
                      <option key={st.id} value={st.id}>
                        📍 Exclusivo: {st.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>Categoría *</label>
                  <select
                    className="form-input"
                    value={rewardForm.category || 'Saldo en Compra'}
                    onChange={(e) => setRewardForm({ ...rewardForm, category: e.target.value })}
                  >
                    <option value="Saldo en Compra">Saldo en Compra</option>
                    <option value="Cortesía">Cortesía de la Casa</option>
                    <option value="Producto Gratis">Producto Gratis</option>
                    <option value="Descuento Especial">Descuento Especial</option>
                    <option value="Gift Card">Gift Card</option>
                  </select>
                </div>
              </div>

              {/* META DE SELLOS (Cartilla Digital de Fidelización) */}
              <div style={{
                background: 'linear-gradient(135deg, #FFFDF8 0%, #FEF3C7 100%)',
                border: '1.5px solid #FCD34D',
                borderRadius: '12px',
                padding: '14px',
                marginBottom: '14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontWeight: 800, fontSize: '0.84rem', color: '#92400E', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '1.05rem' }}>🎯</span>
                    <span>Sellos Necesarios para Canjear este Premio *</span>
                  </label>
                  <span style={{
                    background: '#B45309',
                    color: '#FFFFFF',
                    fontWeight: 900,
                    fontSize: '0.78rem',
                    padding: '2px 9px',
                    borderRadius: '8px'
                  }}>
                    {rewardForm.stampsCost || 6} sellos
                  </span>
                </div>
                
                <p style={{ fontSize: '0.74rem', color: '#78350F', margin: '0 0 10px 0', lineHeight: 1.35 }}>
                  Define cuántos sellos de su cartilla debe acumular el cliente en la app móvil o mostrador para canjear este premio.
                </p>

                {/* Quick chip presets */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {[3, 4, 6, 8, 10, 12].map(stCount => (
                    <button
                      key={stCount}
                      type="button"
                      onClick={() => setRewardForm({ ...rewardForm, stampsCost: stCount })}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '8px',
                        border: ((rewardForm.stampsCost || 6) === stCount) ? '2px solid #B45309' : '1px solid #FDE68A',
                        background: ((rewardForm.stampsCost || 6) === stCount) ? '#92400E' : '#FFFFFF',
                        color: ((rewardForm.stampsCost || 6) === stCount) ? '#FFFFFF' : '#92400E',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {stCount} sellos
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="form-input"
                    value={rewardForm.stampsCost || 6}
                    onChange={(e) => setRewardForm({ ...rewardForm, stampsCost: parseInt(e.target.value, 10) || 1 })}
                    style={{ maxWidth: '140px', fontWeight: 800, fontSize: '0.88rem' }}
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: '#92400E', fontWeight: 600 }}>
                    sellos requeridos en la cartilla
                  </span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>Valor Estimado US$ *</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  className="form-input"
                  value={rewardForm.nominalValueUsd}
                  onChange={(e) => setRewardForm({ ...rewardForm, nominalValueUsd: parseFloat(e.target.value) || 0, pointsCost: 0 })}
                  required
                />
              </div>

              <div className="grid-form-2col" style={{ marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>Stock Disponible</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={rewardForm.availableStock ?? 100}
                    onChange={(e) => setRewardForm({ ...rewardForm, availableStock: parseInt(e.target.value, 10) || 100 })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>Vigencia (Días)</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={rewardForm.validityDays ?? 30}
                    onChange={(e) => setRewardForm({ ...rewardForm, validityDays: parseInt(e.target.value, 10) || 30 })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowRewardModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1.5 }}
                >
                  {editingReward ? (editingReward.status === 'PENDIENTE' ? 'Aprobar y Guardar' : 'Guardar Cambios') : 'Crear y Publicar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR NUEVA TIENDA / SUCURSAL */}
      {showStoreModal && (
        <div className="modal-overlay" onClick={() => setShowStoreModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', borderRadius: '20px', maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Store size={20} color="var(--c-primary)" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                  {editingStore ? `Editar Comercio: ${editingStore.name}` : 'Registrar Nueva Tienda'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowStoreModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveStoreModal}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Nombre Comercial *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Café Gourmet Caracas"
                  value={storeForm.name}
                  onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                  className="form-input"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid var(--border-light)' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Categoría de la Tienda *
                </label>
                <select
                  value={storeForm.category || 'Barbería / Peluquería'}
                  onChange={(e) => setStoreForm({ ...storeForm, category: e.target.value })}
                  className="form-input"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid var(--border-light)' }}
                  required
                >
                  <option value="Barbería / Peluquería">💈 Barbería / Peluquería</option>
                  <option value="Tattoo Estudio">🎨 Tattoo Estudio</option>
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

              <div className="grid-form-2col" style={{ marginBottom: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Ciudad / Estado
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Caracas, Valencia, etc."
                    value={storeForm.city}
                    onChange={(e) => setStoreForm({ ...storeForm, city: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid var(--border-light)' }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Dirección / Local
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. CC Tolón, Nivel 2"
                    value={storeForm.address}
                    onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid var(--border-light)' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Encargado / Cajero Principal
                </label>
                <input
                  type="text"
                  placeholder="Ej. María Rodríguez"
                  value={storeForm.manager}
                  onChange={(e) => setStoreForm({ ...storeForm, manager: e.target.value })}
                  className="form-input"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid var(--border-light)' }}
                />
              </div>

              <div className="grid-form-2col" style={{ marginBottom: '16px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Correo de la Tienda
                  </label>
                  <input
                    type="email"
                    placeholder="contacto@tienda.com"
                    value={storeForm.email}
                    onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid var(--border-light)' }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Teléfono / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    placeholder="+58 412 1234567"
                    value={storeForm.phone}
                    onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid var(--border-light)' }}
                  />
                </div>
              </div>

              <div className="grid-form-2col" style={{ marginBottom: '16px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    % de Retorno en Compras *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="50"
                    required
                    value={storeForm.cashbackPercent ?? 5.0}
                    onChange={(e) => setStoreForm({ ...storeForm, cashbackPercent: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid var(--border-light)' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                    Por defecto 5.0%
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Permiso de la Tienda
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>
                    <input
                      type="checkbox"
                      checked={Boolean(storeForm.canEditPercent)}
                      onChange={(e) => setStoreForm({ ...storeForm, canEditPercent: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--c-primary)' }}
                    />
                    <span>Permitir a tienda cambiar %</span>
                  </label>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                    Habilitar ajuste desde POS
                  </span>
                </div>
              </div>

              {editingStore && (
                <div style={{
                  marginBottom: '16px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #FFFDF0 0%, #FEF3C7 100%)',
                  border: '1.5px solid #FCD34D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#92400E' }}>
                      🎨 Tarjeta de Fidelización, Logo & Sellos
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#78350F' }}>
                      Personaliza los colores de la cartilla, logo, icono de sello y alerta de proximidad.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const st = stores.find(s => s.id === editingStore.id) || editingStore;
                      setShowStoreModal(false);
                      setDesigningStore(st);
                    }}
                    className="btn"
                    style={{
                      padding: '7px 12px',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      background: '#92400E',
                      color: '#FFFFFF',
                      borderRadius: '8px',
                      border: 'none',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer'
                    }}
                  >
                    Personalizar Tarjeta →
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowStoreModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, fontWeight: 800 }}
                >
                  {editingStore ? 'Guardar Cambios' : 'Crear Tienda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DISEÑADOR DE TARJETA, LOGO Y SELLOS PARA CADA TIENDA */}
      {designingStore && (
        <StoreProfileModal
          isOpen={!!designingStore}
          onClose={() => setDesigningStore(null)}
          store={designingStore}
          stores={stores}
          setStores={setStores}
          config={config}
          onNotify={onNotify}
        />
      )}

      {/* MODAL: EDITAR DATOS DEL SOCIO / CLIENTE (CÉDULA, TELÉFONO, NOMBRE) */}
      {editingClient && (
        <div className="modal-overlay" onClick={() => setEditingClient(null)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{
              padding: '24px',
              borderRadius: '20px',
              maxWidth: '480px',
              width: '100%',
              background: '#FFFFFF',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Editar Datos del Cliente
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Actualiza cédula, teléfono o datos de perfil del cliente en Firestore
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveClientEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                  className="form-input"
                  placeholder="Ej. Pedro Pérez"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                  Cédula de Identidad (DNI) *
                </label>
                <input
                  type="text"
                  required
                  value={clientForm.docId}
                  onChange={(e) => setClientForm({ ...clientForm, docId: e.target.value })}
                  className="form-input"
                  placeholder="Ej. V-12345678 o 12345678"
                />
                <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                  Esta cédula es la que indicará el cliente en caja para sumar sellos.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                  Teléfono Celular *
                </label>
                <input
                  type="text"
                  required
                  value={clientForm.phone}
                  onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                  className="form-input"
                  placeholder="Ej. +58 412 1234567"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={clientForm.email}
                  onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                  className="form-input"
                  placeholder="cliente@correo.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                  Nivel / Membresía
                </label>
                <select
                  value={clientForm.tier}
                  onChange={(e) => setClientForm({ ...clientForm, tier: e.target.value })}
                  className="form-input"
                >
                  <option value="Socia Esencial">Socia Esencial</option>
                  <option value="Socio Frecuente">Socio Frecuente</option>
                  <option value="VIP Gold">VIP Gold</option>
                  <option value="Black Diamond">Black Diamond</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, fontWeight: 800 }}
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GESTIÓN DE SUSCRIPCIÓN ($5 USD A TASA BCV / PRUEBA 3 MESES) */}
      {/* MODAL DE GESTIÓN Y REVISIÓN DE SUSCRIPCIÓN / PAGO DE TIENDA */}
      {subscriptionStore && (
        <div className="modal-overlay" onClick={() => setSubscriptionStore(null)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{
              padding: 'clamp(14px, 4vw, 24px)',
              borderRadius: '20px',
              maxWidth: '520px',
              width: '100%',
              background: '#FFFFFF',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxSizing: 'border-box'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'var(--c-secondary-soft, #F7EFE8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <CreditCard size={20} color="var(--c-primary, #70092B)" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E293B', margin: 0, lineHeight: 1.2, wordBreak: 'break-word' }}>
                    Gestión de Suscripción POS
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 600, marginTop: '2px', wordBreak: 'break-word' }}>
                    {subscriptionStore.name} ({subscriptionStore.id})
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubscriptionStore(null)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  color: '#64748B',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Info Resumen de Suscripción */}
            {(() => {
              const sub = getStoreSubscriptionDetails(subscriptionStore, config, dolarRateInfo);
              return (
                <div>
                  <div style={{
                    background: '#FAF8F5',
                    border: '1.5px solid #EDE2D5',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    marginBottom: '14px',
                    boxSizing: 'border-box',
                    width: '100%'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700 }}>Estado Actual:</span>
                      <div>
                        {sub.isExempt ? (
                          <span style={{ background: '#DBEAFE', color: '#1E40AF', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                            🛡️ Cortesía (Exento de Pago)
                          </span>
                        ) : sub.isPaidActive ? (
                          <span style={{ background: '#DCFCE7', color: '#15803D', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                            ⭐ Suscripción Pagada y Activa
                          </span>
                        ) : sub.isInTrial ? (
                          <span style={{ background: '#FEF3C7', color: '#92400E', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                            🎁 Período de Prueba (Quedan {sub.trialDaysRemaining} días)
                          </span>
                        ) : (
                          <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                            🔒 Dashboard Bloqueado (Prueba Vencida)
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ fontSize: '0.76rem', color: '#475569', lineHeight: 1.55 }}>
                      <div>📅 <strong>Registro:</strong> {sub.createdAt ? sub.createdAt.toLocaleDateString('es-VE') : 'N/A'}</div>
                      <div>
                        ⏳ <strong>Fin de Prueba Asignada:</strong> {sub.trialEndsAt ? sub.trialEndsAt.toLocaleDateString('es-VE') : 'N/A'}
                        {sub.isInTrial && <span style={{ color: '#B45309', fontWeight: 800 }}> ({sub.trialDaysRemaining} días restantes)</span>}
                      </div>
                      <div>
                        🔑 <strong>Acceso al Terminal POS:</strong> {sub.hasAccess ? (
                          <span style={{ color: '#166534', fontWeight: 800 }}>🟢 Habilitado (Operativo)</span>
                        ) : (
                          <span style={{ color: '#991B1B', fontWeight: 800 }}>🔴 Bloqueado (Requiere Membresía $5 BCV)</span>
                        )}
                      </div>
                      {sub.paidUntil && (
                        <div>⭐ <strong>Pagado hasta:</strong> {sub.paidUntil.toLocaleDateString('es-VE')}</div>
                      )}
                      <div>💵 <strong>Tarifa fijada:</strong> $5.00 USD / mes (Bs. {sub.formattedVes} a tasa BCV {sub.rate.toFixed(2)})</div>
                    </div>
                  </div>

                  {/* Comprobante de pago pendiente si la tienda lo reportó */}
                  {sub.pendingPayment && (
                    <div style={{
                      background: '#FFFBEB',
                      border: '1.5px solid #FCD34D',
                      borderRadius: '14px',
                      padding: '14px',
                      marginBottom: '14px',
                      boxSizing: 'border-box',
                      width: '100%'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400E', fontWeight: 800, fontSize: '0.84rem' }}>
                          <Clock size={16} />
                          <span>Comprobante de Pago Móvil Reportado</span>
                        </div>
                        <span style={{ background: '#FDE68A', color: '#78350F', fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>
                          Por Verificar
                        </span>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                        gap: '6px',
                        fontSize: '0.76rem',
                        color: '#78350F',
                        background: '#FEF3C7',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        marginBottom: '10px'
                      }}>
                        <div><strong>🔢 Referencia:</strong> <code style={{ fontWeight: 800, background: '#FFFBEB', padding: '1px 5px', borderRadius: '4px' }}>{sub.pendingPayment.reference}</code></div>
                        <div><strong>🏦 Banco emisor:</strong> {sub.pendingPayment.bankOrigin || 'No especificado'}</div>
                        <div><strong>📱 Teléfono:</strong> {sub.pendingPayment.payerPhone || subscriptionStore.phone || 'No especificado'}</div>
                        <div><strong>💵 Monto pagado:</strong> Bs. {sub.pendingPayment.amountVes}</div>
                        <div style={{ gridColumn: '1 / -1', fontSize: '0.70rem', color: '#92400E', borderTop: '1px dashed #FCD34D', paddingTop: '4px' }}>
                          📅 <strong>Reportado el:</strong> {new Date(sub.pendingPayment.reportedAt).toLocaleString('es-VE')}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {(sub.pendingPayment.payerPhone || subscriptionStore.phone) && (
                          <a
                            href={`https://wa.me/${(sub.pendingPayment.payerPhone || subscriptionStore.phone).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola ${subscriptionStore.name}, estamos revisando tu reporte de pago móvil por Bs. ${sub.pendingPayment.amountVes} (Ref: ${sub.pendingPayment.reference}) para la membresía de tu tienda en fidely CLUB.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              flex: '1 1 120px',
                              padding: '8px 12px',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              background: '#ECFDF5',
                              color: '#059669',
                              border: '1px solid #A7F3D0',
                              borderRadius: '8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              textDecoration: 'none'
                            }}
                          >
                            <MessageCircle size={14} />
                            <span>WhatsApp Tienda</span>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleExtendStoreSubscription(1)}
                          className="btn"
                          style={{
                            flex: '1 1 180px',
                            padding: '9px 14px',
                            fontSize: '0.80rem',
                            fontWeight: 800,
                            background: '#16A34A',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <Check size={16} />
                          <span>Aprobar Pago y Activar ($5)</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Acciones de Suscripción */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                      Activar / Extender Suscripción ($5/mes):
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleExtendStoreSubscription(1)}
                        className="btn btn-secondary"
                        style={{ padding: '8px 6px', fontSize: '0.76rem', fontWeight: 800, color: '#15803D', borderColor: '#BBF7D0', background: '#F0FDF4', textAlign: 'center' }}
                      >
                        +1 Mes ($5)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExtendStoreSubscription(3)}
                        className="btn btn-secondary"
                        style={{ padding: '8px 6px', fontSize: '0.76rem', fontWeight: 800, color: '#15803D', borderColor: '#BBF7D0', background: '#F0FDF4', textAlign: 'center' }}
                      >
                        +3 Meses ($15)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExtendStoreSubscription(12)}
                        className="btn btn-secondary"
                        style={{ padding: '8px 6px', fontSize: '0.76rem', fontWeight: 800, color: '#15803D', borderColor: '#BBF7D0', background: '#F0FDF4', textAlign: 'center' }}
                      >
                        +1 Año ($50)
                      </button>
                    </div>
                  </div>

                  {/* Acciones Especiales: Cortesía, Extender Prueba, Bloquear */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleExtendStoreTrial(30)}
                      className="btn btn-secondary"
                      style={{ padding: '8px 12px', fontSize: '0.76rem', fontWeight: 700, width: '100%', justifyContent: 'center' }}
                    >
                      🎁 Extender Prueba Gratuita (+30 días adicionales)
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleStoreExemption}
                      className="btn btn-secondary"
                      style={{
                        padding: '8px 12px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        width: '100%',
                        justifyContent: 'center',
                        color: sub.isExempt ? '#DC2626' : '#1D4ED8',
                        borderColor: sub.isExempt ? '#FECDD3' : '#BFDBFE',
                        background: sub.isExempt ? '#FEF2F2' : '#EFF6FF'
                      }}
                    >
                      {sub.isExempt ? '❌ Revocar Exención (Exigir pago de $5)' : '🛡️ Otorgar Exención de Pago Permanente (Cortesía)'}
                    </button>

                    {!sub.isBlocked && !sub.isExempt && (
                      <button
                        type="button"
                        onClick={handleBlockStoreSubscription}
                        className="btn btn-secondary"
                        style={{ padding: '8px 12px', fontSize: '0.76rem', fontWeight: 700, width: '100%', justifyContent: 'center', color: '#DC2626', borderColor: '#FECDD3' }}
                      >
                        🔒 Bloquear Inmediatamente por Falta de Pago
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setSubscriptionStore(null)}
                className="btn btn-secondary"
                style={{ padding: '8px 18px', fontSize: '0.84rem' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: DIFUNDIR / REENVIAR NOTIFICACIÓN PUSH A CLIENTES */}
      {promoToPush && (
        <div className="modal-overlay" onClick={() => setPromoToPush(null)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{
              padding: '24px',
              borderRadius: '20px',
              maxWidth: '480px',
              width: '100%',
              background: '#FFFFFF',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF'
                }}>
                  <Megaphone size={19} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    Difundir Notificación Push
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Comercio emisor: <strong>{promoToPush.storeName || promoToPush.storeId}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPromoToPush(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Vista Previa de la Notificación tal como le llegará al teléfono */}
            <div style={{
              background: '#F8FAFC',
              border: '1.5px solid #E2E8F0',
              borderRadius: '14px',
              padding: '14px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '0.70rem', color: 'var(--text-dim)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>
                📱 Vista Previa en Móvil (Notificación Push)
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A', marginBottom: '4px' }}>
                {promoToPush.badgeType === '2X1' ? '🎁 2x1: ' : promoToPush.badgeType === 'FLASH' ? '⚡ ' : '🔥 '}{promoToPush.title}
              </div>
              <div style={{ fontSize: '0.80rem', color: '#475569', lineHeight: 1.4 }}>
                {promoToPush.message}
              </div>
              {promoToPush.imageUrl && (
                <div style={{ marginTop: '10px', height: '90px', borderRadius: '8px', overflow: 'hidden' }}>
                  <img src={promoToPush.imageUrl} alt="Promo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
            </div>

            {/* Aviso de Alcance */}
            <div style={{
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '10px',
              padding: '10px 12px',
              fontSize: '0.76rem',
              color: '#1E40AF',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px'
            }}>
              <Sparkles size={16} color="#2563EB" style={{ flexShrink: 0 }} />
              <span>
                Esta alerta se enviará a través de Cloud Messaging a los dispositivos de todos los clientes vinculados a <strong>{promoToPush.storeName || promoToPush.storeId}</strong>.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setPromoToPush(null)}
                className="btn btn-secondary"
                disabled={isSendingPush}
                style={{ padding: '8px 16px', fontSize: '0.80rem', fontWeight: 700 }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleAdminSendPromotionPush(promoToPush)}
                disabled={isSendingPush}
                className="btn btn-primary"
                style={{
                  padding: '8px 18px',
                  fontSize: '0.80rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)',
                  borderColor: '#1D4ED8'
                }}
              >
                <Megaphone size={14} />
                <span>{isSendingPush ? 'Enviando...' : '🚀 Confirmar y Difundir Ahora'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: FINALIZAR / PAUSAR PROMOCIÓN */}
      {promoToDeactivate && (
        <div className="modal-overlay" onClick={() => setPromoToDeactivate(null)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{
              padding: '24px',
              borderRadius: '20px',
              maxWidth: '440px',
              width: '100%',
              background: '#FFFFFF',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: '#FEE2E2',
                color: '#DC2626',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '10px'
              }}>
                <AlertCircle size={24} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                ¿Finalizar esta Promoción?
              </h3>
              <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                La promoción <strong>"{promoToDeactivate.title}"</strong> dejará de mostrarse en la billetera de los clientes de <strong>{promoToDeactivate.storeName || promoToDeactivate.storeId}</strong>.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setPromoToDeactivate(null)}
                className="btn btn-secondary"
                disabled={isDeactivatingPromo}
                style={{ padding: '8px 16px', fontSize: '0.80rem', fontWeight: 700 }}
              >
                Mantener Activa
              </button>
              <button
                type="button"
                onClick={() => handleAdminExpirePromotion(promoToDeactivate)}
                disabled={isDeactivatingPromo}
                className="btn btn-primary"
                style={{
                  padding: '8px 18px',
                  fontSize: '0.80rem',
                  fontWeight: 800,
                  background: '#DC2626',
                  borderColor: '#B91C1C'
                }}
              >
                {isDeactivatingPromo ? 'Finalizando...' : 'Sí, Finalizar Promoción'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CREAR PROMOCIÓN COMO ADMINISTRADOR PARA UN COMERCIO */}
      {creatingPromoModal && (
        <div className="modal-overlay" onClick={() => setCreatingPromoModal(false)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{
              padding: '24px',
              borderRadius: '20px',
              maxWidth: '520px',
              width: '100%',
              background: '#FFFFFF',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  + Crear Promoción para Comercio
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Publica y difunde una promoción instantánea para cualquier tienda aliada
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreatingPromoModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdminCreatePromotion} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.80rem', fontWeight: 700, marginBottom: '4px' }}>
                  Comercio Emisor *
                </label>
                <select
                  required
                  className="form-input"
                  value={newPromoForm.storeId || (stores[0]?.id || '')}
                  onChange={(e) => setNewPromoForm({ ...newPromoForm, storeId: e.target.value })}
                  style={{ fontSize: '0.84rem', fontWeight: 700 }}
                >
                  {stores.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.category || 'Comercio'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.80rem', fontWeight: 700, marginBottom: '4px' }}>
                    Tipo de Beneficio
                  </label>
                  <select
                    className="form-input"
                    value={newPromoForm.badgeType}
                    onChange={(e) => setNewPromoForm({ ...newPromoForm, badgeType: e.target.value })}
                    style={{ fontSize: '0.84rem' }}
                  >
                    <option value="PROMO">🔥 Promoción General</option>
                    <option value="2X1">🎁 2x1 Especial</option>
                    <option value="FLASH">⚡ Venta Flash</option>
                    <option value="DESCUENTO">🏷️ Descuento Directo</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.80rem', fontWeight: 700, marginBottom: '4px' }}>
                    Fecha Límite (Vigencia) *
                  </label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={newPromoForm.validityDate}
                    onChange={(e) => setNewPromoForm({ ...newPromoForm, validityDate: e.target.value })}
                    style={{ fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.80rem', fontWeight: 700, marginBottom: '4px' }}>
                  Título del Beneficio *
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Ej: 2x1 en Cortes de Cabello los Miércoles"
                  value={newPromoForm.title}
                  onChange={(e) => setNewPromoForm({ ...newPromoForm, title: e.target.value })}
                  style={{ fontSize: '0.84rem' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.80rem', fontWeight: 700, marginBottom: '4px' }}>
                  Mensaje Detallado / Condiciones *
                </label>
                <textarea
                  required
                  rows={3}
                  className="form-input"
                  placeholder="Ej: Válido para clientes con tarjeta de fidelización. Menciona este cupón en caja al momento de pagar."
                  value={newPromoForm.message}
                  onChange={(e) => setNewPromoForm({ ...newPromoForm, message: e.target.value })}
                  style={{ fontSize: '0.84rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'center' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.80rem', fontWeight: 700, marginBottom: '4px' }}>
                    Cupones Disponibles (Stock)
                  </label>
                  <input
                    type="number"
                    min="1"
                    disabled={newPromoForm.isUnlimited}
                    className="form-input"
                    value={newPromoForm.totalStock}
                    onChange={(e) => setNewPromoForm({ ...newPromoForm, totalStock: e.target.value })}
                    style={{ fontSize: '0.84rem' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '18px' }}>
                  <input
                    type="checkbox"
                    id="adminPromoUnlimited"
                    checked={newPromoForm.isUnlimited}
                    onChange={(e) => setNewPromoForm({ ...newPromoForm, isUnlimited: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--c-primary)', cursor: 'pointer' }}
                  />
                  <label htmlFor="adminPromoUnlimited" style={{ fontSize: '0.80rem', fontWeight: 700, cursor: 'pointer', margin: 0 }}>
                    ♾️ Sin límite (Ilimitado)
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.80rem', fontWeight: 700, marginBottom: '4px' }}>
                  URL de Imagen (Opcional)
                </label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://ejemplo.com/banner-promocion.jpg"
                  value={newPromoForm.imageUrl}
                  onChange={(e) => setNewPromoForm({ ...newPromoForm, imageUrl: e.target.value })}
                  style={{ fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCreatingPromoModal(false)}
                  className="btn btn-secondary"
                  disabled={isCreatingPromo}
                  style={{ padding: '8px 16px', fontSize: '0.82rem', fontWeight: 700 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingPromo}
                  className="btn btn-primary"
                  style={{
                    padding: '8px 20px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Megaphone size={14} />
                  <span>{isCreatingPromo ? 'Publicando...' : 'Publicar y Difundir Push'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </main>

      {/* MODAL CARTEL / HABLADOR QR PARA MOSTRADOR */}
      {printStandStore && (
        <StoreQrPrintStand
          store={printStandStore}
          config={config}
          isModal={true}
          onClose={() => setPrintStandStore(null)}
        />
      )}

      {/* MODAL GOOGLE MAPS DE TIENDAS */}
      {showStoresMapModal && (
        <AdminStoresMapModal
          stores={stores}
          onClose={() => setShowStoresMapModal(false)}
          onOpenPrintStand={(st) => {
            setShowStoresMapModal(false);
            setPrintStandStore(st);
          }}
        />
      )}
    </div>
  );
}
