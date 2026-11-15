import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Award,
  Search, 
  UserPlus, 
  CreditCard, 
  Receipt, 
  Gift, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Printer, 
  DollarSign, 
  QrCode, 
  User, 
  ShieldCheck, 
  X,
  Clock,
  History,
  Check,
  Eye,
  AlertCircle,
  FileText,
  ChevronRight,
  Store,
  TicketPercent,
  Copy,
  ExternalLink,
  Bell,
  Volume2,
  Camera,
  BarChart3,
  LogOut,
  RefreshCw,
  Menu,
  Plus,
  Send,
  Tag,
  TrendingUp,
  Percent,
  Package,
  ShoppingCart,
  Trash2,
  Edit3,
  Sliders,
  Wallet,
  Calculator,
  Palette,
  Megaphone,
  Users,
  Calendar,
  BellRing,
  Loader2,
  Star,
  Scissors,
  Coffee,
  Utensils,
  ShoppingBag,
  Gem,
  Heart,
  Crown,
  PawPrint,
  Flower2,
  Flame,
  Wrench,
  Smartphone,
  Maximize2,
  Minimize2,
  ArrowRight
} from 'lucide-react';
import QRCodeDisplay from './QRCodeDisplay';
import StoreQrPrintStand from './StoreQrPrintStand';
import QRCameraScanner from './QRCameraScanner';
import StoreOnboardingModal from './StoreOnboardingModal';
import StoreProfileModal from './StoreProfileModal';
import StoreLogoBadge from './StoreLogoBadge';
import StoreSubscriptionPaywallView from './StoreSubscriptionPaywallView';
import { getStoreSubscriptionDetails, isStoreSubscriptionBlocked } from '../utils/subscriptionUtils';
import { checkDuplicateClient } from '../utils/clientValidation';
import { removeProduct, saveReward, saveClient, saveRedemption, saveMovement } from '../firebase/firestoreService';
import { db, rtdb } from '../firebase/config';
import { doc, setDoc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { ref as dbRef, set as dbSet, update as dbUpdate, onValue as dbOnValue } from 'firebase/database';

export default function POSView({
  stores = [],
  selectedStore: propSelectedStore,
  onSelectStore,
  setStores,
  clients,
  setClients,
  purchases,
  setPurchases,
  products = [],
  setProducts,
  movements,
  setMovements,
  rewards = [],
  setRewards,
  redemptions,
  setRedemptions,
  config,
  onNotify,
  onLogout,
  onNavigate,
  currentUser,
  firebaseStatus,
  onOpenFirebaseModal,
  isFetchingRate,
  onRefreshDolarRate,
  dolarRateInfo
}) {
  // Bloqueo estricto: la tienda autenticada solo puede operar su propio local
  const selectedStore = (currentUser?.role === 'POS' && currentUser?.store)
    ? (stores.find(s => s.id === currentUser.store.id) || currentUser.store)
    : (propSelectedStore || stores[0] || { 
        id: 'STR-01', 
        name: 'Tienda Principal', 
        city: 'Caracas', 
        manager: 'Cajero en Turno' 
      });
  // Si la tienda entra por primera vez o no ha configurado su tarjeta, la vista principal es 'CARD_SETUP'
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const storeObj = propSelectedStore || stores[0];
      const isCardSet = Boolean(
        (storeObj?.hasConfiguredCard || storeObj?.cardConfiguredAt || (storeObj?.id && localStorage.getItem(`fidely_card_configured_${storeObj.id}`))) &&
        Array.isArray(storeObj?.stampRewards) &&
        storeObj.stampRewards.length > 0
      );
      return isCardSet ? 'REGISTER_SALE' : 'CARD_SETUP';
    } catch (e) {
      return 'CARD_SETUP';
    }
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showStoreOnboarding, setShowStoreOnboarding] = useState(false);
  const [showStoreProfileModal, setShowStoreProfileModal] = useState(() => {
    try {
      const storeObj = propSelectedStore || stores[0];
      const isCardSet = Boolean(
        (storeObj?.hasConfiguredCard || storeObj?.cardConfiguredAt || (storeObj?.id && localStorage.getItem(`fidely_card_configured_${storeObj.id}`))) &&
        Array.isArray(storeObj?.stampRewards) &&
        storeObj.stampRewards.length > 0
      );
      return !isCardSet; // Abre automáticamente si es primera vez o no ha configurado su tarjeta
    } catch (e) {
      return false;
    }
  });
  const [shiftSearchQuery, setShiftSearchQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [identifiedClient, setIdentifiedClient] = useState(null);

  // Modo POS Móvil (Área intuitiva y simple para teléfonos y mostrador)
  const [isMobilePosMode, setIsMobilePosMode] = useState(() => {
    try {
      const saved = localStorage.getItem('fidely_pos_mobile_mode');
      if (saved !== null) return saved === 'true';
      // Por defecto en pantallas móviles o táctiles (<= 768px), entra directo al Modo POS Móvil
      if (typeof window !== 'undefined' && window.innerWidth <= 768) return true;
      return false;
    } catch (e) {
      return false;
    }
  });
  const [mobilePosTab, setMobilePosTab] = useState('QR'); // 'QR' | 'REQUESTS'
  const [isQrFullScreen, setIsQrFullScreen] = useState(false);
  const [showPrintStandModal, setShowPrintStandModal] = useState(false);

  // New sale state
  const [currency, setCurrency] = useState('USD');
  const [amountInput, setAmountInput] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [completedTicket, setCompletedTicket] = useState(null);

  // Accounting Invoicing & Cart State (Bimoneda)
  const [billingMode, setBillingMode] = useState('ITEMS'); // 'ITEMS' | 'QUICK'
  const [cartItems, setCartItems] = useState([]); // [{ id, name, code, category, quantity, priceUsd, taxType }]
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('ALL');

  // Modal Ítem Libre / Concepto Manual
  const [showQuickItemModal, setShowQuickItemModal] = useState(false);
  const [quickItemForm, setQuickItemForm] = useState({
    name: '',
    priceUsd: '',
    quantity: 1,
    taxType: 'GRAVABLE_16'
  });

  // Modal Pagos Mixtos (Split Payments en $ y Bs.)
  const [showSplitPaymentModal, setShowSplitPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cashVes'); // 'cashUsd' | 'cashVes' | 'posDebitVes' | 'pagoMovilVes' | 'zelleUsd' | 'transferVes' | 'MIXED'
  const [mixedActiveMethods, setMixedActiveMethods] = useState(['cashVes']);
  const [paymentBreakdown, setPaymentBreakdown] = useState({
    cashUsd: '',
    cashVes: '',
    posDebitVes: '',
    pagoMovilVes: '',
    pagoMovilRef: '',
    zelleUsd: '',
    zelleRef: '',
    transferVes: '',
    transferRef: ''
  });

  // Modal Catálogo de Productos y Servicios
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    code: '',
    name: '',
    category: 'Servicio',
    priceUsd: 10,
    taxType: 'GRAVABLE_16',
    isService: true,
    stock: 100
  });

  // Quick client modal
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientForm, setNewClientForm] = useState({ name: '', phone: '', docId: '', email: '' });

  // Direct discount application in POS
  const [applyLocalDiscountUsd, setApplyLocalDiscountUsd] = useState(0);
  const [wantsApplyCoupon, setWantsApplyCoupon] = useState(false);
  const [showStoreClientsList, setShowStoreClientsList] = useState(false);

  // Pre-approved QR credit applied to current sale in POS
  const [approvedQrCredit, setApprovedQrCredit] = useState(null);
  // Promotional or discount coupon chosen by cashier to apply to sale
  const [selectedSaleCoupon, setSelectedSaleCoupon] = useState(null);

  // Store Internal ROI Simulator State
  const [roiSalesVolume, setRoiSalesVolume] = useState(15000);
  const [roiAvgTicket, setRoiAvgTicket] = useState(50);

  // Return modal state
  const [returnModalPurchase, setReturnModalPurchase] = useState(null);
  const [returnType, setReturnType] = useState('TOTAL');
  const [returnAmount, setReturnAmount] = useState('');
  const [returnReason, setReturnReason] = useState('Devolución de producto');

  // In-Store QR Redemption States
  const [selectedPendingRedemption, setSelectedPendingRedemption] = useState(null);
  const [showStoreQrModal, setShowStoreQrModal] = useState(false);
  const [showPosCameraScanner, setShowPosCameraScanner] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [showClientStampsHistoryModal, setShowClientStampsHistoryModal] = useState(false);

  // Store custom reward proposal state
  const [showProposeRewardModal, setShowProposeRewardModal] = useState(false);
  const [rewardSubTab, setRewardSubTab] = useState('REDEEM'); // 'REDEEM' | 'STORE_CATALOG'
  const [rewardProposalForm, setRewardProposalForm] = useState({
    title: '',
    description: '',
    category: 'Cortesía',
    pointsCost: 100,
    stampsCost: 6, // Cantidad de sellos requeridos para canjear en la cartilla
    nominalValueUsd: 6.00,
    validityDays: 30,
    availableStock: 50
  });

  // Store Broadcast Promotions State
  const [promoForm, setPromoForm] = useState({
    title: '',
    message: '',
    imageUrl: '',
    badgeType: 'PROMO',
    isUnlimited: false, // true: sin límite de personas, false: cupo limitado
    totalStock: 20,
    validityType: 'UNTIL_DATE', // 'SINGLE_DAY' | 'UNTIL_DATE'
    validityDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10), // por defecto 3 días
  });
  const [isSendingPromo, setIsSendingPromo] = useState(false);
  const [storePromotionsList, setStorePromotionsList] = useState([]);
  const [promoSubTab, setPromoSubTab] = useState('ACTIVES'); // 'ACTIVES' | 'HISTORY'
  const [promoToEnd, setPromoToEnd] = useState(null);
  const [isEndingPromo, setIsEndingPromo] = useState(false);
  const [promoToResend, setPromoToResend] = useState(null);

  // Fallback safe selected store & live current store object
  const safeStore = selectedStore || stores[0] || { id: 'STR-01', name: 'Tienda Principal', city: 'Caracas' };
  const currentStoreObj = stores.find(s => s.id === safeStore.id) || safeStore;

  // Estado de si la membresía de la tienda requiere pago (período de prueba vencido o sin prueba gratuita)
  const isSubscriptionBlocked = isStoreSubscriptionBlocked(currentStoreObj, config);

  // Estado de si la tienda ya configuró su tarjeta
  const isCardConfigured = Boolean(
    (currentStoreObj?.hasConfiguredCard || currentStoreObj?.cardConfiguredAt || localStorage.getItem(`fidely_card_configured_${currentStoreObj?.id}`)) &&
    Array.isArray(currentStoreObj?.stampRewards) &&
    currentStoreObj.stampRewards.length > 0
  );

  // Monto mínimo de compra para generar sello definido por la tienda (o fallback config)
  const storeMinPurchase = parseFloat(
    currentStoreObj?.minPurchaseForStamp ?? 
    currentStoreObj?.minPurchaseUsd ?? 
    safeStore?.minPurchaseForStamp ?? 
    safeStore?.minPurchaseUsd ?? 
    config?.minPurchaseUsd ?? 
    5.0
  );

  // Helper para renderizar iconos de sellos con calidad vectorial profesional
  const renderStampIconHelper = (iconKey, size = 18, color = '#FFFFFF') => {
    if (!iconKey) return <Star size={size} color={color} fill={color} strokeWidth={1.5} />;
    const key = String(iconKey).trim().toLowerCase();
    switch (key) {
      case 'scissors':
      case 'barberia':
      case 'tijera':
        return <Scissors size={size} color={color} strokeWidth={2.4} />;
      case 'tattoo':
      case 'tatto':
      case 'arte':
        return <Palette size={size} color={color} strokeWidth={2.4} />;
      case 'coffee':
      case 'cafe':
        return <Coffee size={size} color={color} strokeWidth={2.4} />;
      case 'utensils':
      case 'restaurant':
      case 'restaurante':
        return <Utensils size={size} color={color} strokeWidth={2.4} />;
      case 'shopping-bag':
      case 'boutique':
      case 'bag':
        return <ShoppingBag size={size} color={color} strokeWidth={2.4} />;
      case 'gem':
      case 'joyeria':
        return <Gem size={size} color={color} strokeWidth={2.4} />;
      case 'heart':
      case 'belleza':
        return <Heart size={size} color={color} fill={color} strokeWidth={1.5} />;
      case 'crown':
      case 'vip':
        return <Crown size={size} color={color} strokeWidth={2.4} />;
      case 'paw':
      case 'mascotas':
        return <PawPrint size={size} color={color} strokeWidth={2.4} />;
      case 'flower':
      case 'flor':
        return <Flower2 size={size} color={color} strokeWidth={2.4} />;
      case 'flame':
      case 'fuego':
      case 'grill':
        return <Flame size={size} color={color} strokeWidth={2.4} />;
      case 'wrench':
      case 'taller':
        return <Wrench size={size} color={color} strokeWidth={2.4} />;
      case 'sparkle':
      case 'sparkles':
        return <Sparkles size={size} color={color} strokeWidth={2.4} />;
      case 'star':
      case 'estrella':
        return <Star size={size} color={color} fill={color} strokeWidth={1.5} />;
      default:
        if (key.length <= 4) {
          return <span style={{ fontSize: `${Math.round(size * 1.1)}px`, lineHeight: 1 }}>{iconKey}</span>;
        }
        return <Star size={size} color={color} fill={color} strokeWidth={1.5} />;
    }
  };

  const getStampIconLabel = (iconKey) => {
    if (!iconKey) return '⭐ Estrella';
    const key = String(iconKey).trim().toLowerCase();
    switch (key) {
      case 'scissors': return '✂️ Barbería (Tijera)';
      case 'tattoo':
      case 'tatto': return '🎨 Tattoo Estudio';
      case 'coffee': return '☕ Café & Bakery';
      case 'utensils': return '🍽️ Gastronomía';
      case 'shopping-bag': return '🛍️ Moda & Boutique';
      case 'gem': return '💎 Joyería & Accesorios';
      case 'heart': return '❤️ Belleza & Cuidado';
      case 'crown': return '👑 VIP / Corona';
      case 'paw': return '🐾 Mascotas & Pet';
      case 'flower': return '🌸 Orgánico / Estética';
      case 'flame': return '🔥 Parrilla / Comida';
      case 'wrench': return '🔧 Taller & Mecánica';
      case 'sparkle':
      case 'sparkles': return '✨ Destello';
      case 'star': return '⭐ Estrella Oficial';
      default: return iconKey.length <= 4 ? iconKey : '⭐ Sello Oficial';
    }
  };

  // Audience: Clientes que tienen la tarjeta de fidelización de ESTA tienda
  const clientsWithStoreCard = useMemo(() => {
    if (!clients || !currentStoreObj) return [];
    return clients.filter(c => {
      const cards = c.loyaltyCards || [];
      return Array.isArray(cards) && cards.some(card => {
        const cId = (card.storeId || card.id || '').toString().trim();
        return cId === String(currentStoreObj.id).trim();
      });
    });
  }, [clients, currentStoreObj]);
    // Políticas y Límites configurados por el Administrador (Global o Tienda)
    const monthlyLimit = currentStoreObj.maxMonthlyPush ?? (config?.unlimitedPushPerStore ? 0 : (config?.maxMonthlyPushPerStore ?? 4));
    const maxRecipientsCap = currentStoreObj.maxPushRecipients ?? (config?.unlimitedRecipientsPerPush ? 0 : (config?.maxPushRecipientsPerBroadcast ?? 0));
    const allowResend = config?.allowPushResend !== false;
    const resendCooldownHours = config?.pushResendCooldownHours || 24;

    // Calcular cuántos envíos push ha realizado este local en el mes calendario actual
    const currentMonthPushesCount = useMemo(() => {
      const now = new Date();
      const cYear = now.getFullYear();
      const cMonth = now.getMonth();
      let count = 0;
      (storePromotionsList || []).forEach(p => {
        if (Array.isArray(p.pushHistory) && p.pushHistory.length > 0) {
          p.pushHistory.forEach(ts => {
            const d = new Date(ts);
            if (d.getFullYear() === cYear && d.getMonth() === cMonth) count++;
          });
        } else if (p.createdAt) {
          const d = new Date(p.createdAt);
          if (d.getFullYear() === cYear && d.getMonth() === cMonth) count++;
        }
      });
      return count;
    }, [storePromotionsList]);

    const isMonthlyLimitReached = monthlyLimit > 0 && currentMonthPushesCount >= monthlyLimit;
    const remainingPushesThisMonth = monthlyLimit > 0 ? Math.max(0, monthlyLimit - currentMonthPushesCount) : Infinity;

    // Reenviar notificación push de una promoción existente
    const handleResendPush = (promo) => {
      if (isSendingPromo) return;
      if (isMonthlyLimitReached) {
        onNotify(`Has alcanzado el límite de ${monthlyLimit} difusiones push este mes. Podrás volver a enviar a partir del 1° del próximo mes.`, 'warning');
        return;
      }

      // Validación de cooldown entre reenvíos
      if (promo.lastPushSentAt) {
        const hoursSinceLast = (Date.now() - new Date(promo.lastPushSentAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLast < resendCooldownHours) {
          const remainingWait = Math.ceil(resendCooldownHours - hoursSinceLast);
          onNotify(`Para evitar saturar a tus clientes, debes esperar ${remainingWait} hora(s) antes de volver a enviar push de esta misma promoción.`, 'warning');
          return;
        }
      }

      setPromoToResend(promo);
    };

    const handleConfirmResendPush = async () => {
      if (!promoToResend || isSendingPromo) return;
      setIsSendingPromo(true);
      try {
        const promo = promoToResend;
        const nowIso = new Date().toISOString();
        const nowTimestamp = Date.now();
        const currentHistory = Array.isArray(promo.pushHistory) ? promo.pushHistory : (promo.createdAt ? [promo.createdAt] : []);
        const updatedHistory = [...currentHistory, nowIso];
        const newDispatches = (promo.totalPushDispatches || 1) + 1;

        // 1. Actualizar en Firestore
        const promoRef = doc(db, 'store_promotions', promo.id);
        await updateDoc(promoRef, {
          lastPushSentAt: nowIso,
          lastPushTrigger: nowTimestamp,
          pushHistory: updatedHistory,
          totalPushDispatches: newDispatches,
          status: 'ACTIVA'
        });

        // 2. Actualizar en RTDB -> dispara Cloud Function onTiendaPromocionPush
        if (rtdb) {
          const rtdbRef = dbRef(rtdb, `tiendas_promociones/${currentStoreObj.id}/${promo.id}`);
          await dbUpdate(rtdbRef, {
            lastPushSentAt: nowIso,
            lastPushTrigger: nowTimestamp,
            pushHistory: updatedHistory,
            totalPushDispatches: newDispatches,
            status: 'ACTIVA'
          });
        }

        onNotify(`🔔 ¡Notificación push reenviada con éxito a tus clientes fidelizados! (Envío ${newDispatches})`, 'success');
        setPromoToResend(null);
      } catch (err) {
        console.error('Error reenviando push:', err);
        onNotify('Error al reenviar la notificación push: ' + err.message, 'error');
      } finally {
        setIsSendingPromo(false);
      }
    };

    // Helper: Determina si una promoción está vencida o finalizada
    const isPromotionExpired = (promo) => {
      if (!promo) return false;
      const statusUpper = String(promo.status || '').toUpperCase().trim();
      if (['FINALIZADO', 'FINALIZADA', 'VENCIDO', 'VENCIDA', 'INACTIVO', 'INACTIVA', 'CANCELADO', 'CANCELADA', 'AGOTADO', 'AGOTADA'].includes(statusUpper)) {
        return true;
      }
      const now = new Date();
      if (promo.expiredAt) {
        const d = new Date(promo.expiredAt);
        if (!isNaN(d.getTime()) && now >= d) return true;
      }
      if (promo.expiresAt) {
        const d = new Date(promo.expiresAt);
        if (!isNaN(d.getTime()) && now > d) return true;
      }
      if (promo.validityDate) {
        const todayStr = now.toISOString().slice(0, 10);
        if (promo.validityDate < todayStr) return true;
      }
      if (!promo.isUnlimited && promo.remainingStock !== undefined && promo.remainingStock <= 0) {
        return true;
      }
      return false;
    };

    const activePromotionsList = useMemo(() => {
      return (storePromotionsList || []).filter(p => !isPromotionExpired(p));
    }, [storePromotionsList]);

    const expiredPromotionsList = useMemo(() => {
      return (storePromotionsList || []).filter(p => isPromotionExpired(p));
    }, [storePromotionsList]);

    // Helper: Formateo seguro de fechas para evitar "Invalid Date"
    const formatPromoDate = (dateVal, fallbackTimestamp) => {
      const val = dateVal || fallbackTimestamp;
      if (!val) return 'Reciente';
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
      return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' });
    };

    // Finalizar manualmente una promoción activa (abre modal de confirmación elegante)
    const handleExpirePromotion = (promo) => {
      setPromoToEnd(promo);
    };

    const handleConfirmExpirePromotion = async () => {
      if (!promoToEnd || isEndingPromo) return;
      setIsEndingPromo(true);
      try {
        const promo = promoToEnd;
        const nowIso = new Date().toISOString();
        const promoRef = doc(db, 'store_promotions', promo.id);
        await updateDoc(promoRef, {
          status: 'FINALIZADO',
          expiredAt: nowIso,
          expiresAt: nowIso
        });
        if (rtdb) {
          const rtdbRef = dbRef(rtdb, `tiendas_promociones/${currentStoreObj.id}/${promo.id}`);
          await dbUpdate(rtdbRef, {
            status: 'FINALIZADO',
            expiredAt: nowIso,
            expiresAt: nowIso
          });
        }
        onNotify(`Promoción "${promo.title}" finalizada y guardada en el historial.`, 'info');
        setPromoToEnd(null);
      } catch (err) {
        console.error('Error finalizando promoción:', err);
        onNotify('Error al finalizar promoción: ' + err.message, 'error');
      } finally {
        setIsEndingPromo(false);
      }
    };

    // Reutilizar datos de una promoción vencida para redactar una nueva
    const handleReusePromotion = (promo) => {
      setPromoForm(prev => ({
        ...prev,
        title: promo.title || '',
        message: promo.message || '',
        badgeType: promo.badgeType || 'PROMO',
        imageUrl: promo.imageUrl || '',
        validityType: promo.validityType || 'UNTIL_DATE',
        validityDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
        isUnlimited: promo.isUnlimited !== false,
        totalStock: promo.totalStock || 20
      }));
      setPromoSubTab('ACTIVES');
      window.scrollTo({ top: 400, behavior: 'smooth' });
      onNotify(`Datos de "${promo.title}" cargados en el formulario. Modifica lo que desees y publica.`, 'info');
    };


  // Escuchar historial de promociones y estado en vivo de cupones desde Firestore (y fallback RTDB)
  useEffect(() => {
    if (!currentStoreObj?.id || !db) return;
    try {
      const q = query(
        collection(db, 'store_promotions'),
        where('storeId', '==', String(currentStoreObj.id))
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = [];
        snapshot.forEach(docSnap => {
          list.push({ ...docSnap.data(), id: docSnap.id });
        });
        list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setStorePromotionsList(list);
      }, (err) => {
        console.warn('Error escuchando store_promotions en Firestore, intentando RTDB:', err);
        if (rtdb) {
          const storePromosRef = dbRef(rtdb, `tiendas_promociones/${currentStoreObj.id}`);
          dbOnValue(storePromosRef, (snap) => {
            if (snap.exists()) {
              const val = snap.val();
              const rtdbList = Object.keys(val).map(k => ({ id: k, ...val[k] }));
              rtdbList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
              setStorePromotionsList(rtdbList);
            }
          });
        }
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Error configurando listener de promociones:', e);
    }
  }, [currentStoreObj?.id]);

  const handlePublishPromotion = async (e) => {
    e.preventDefault();
    if (isSubscriptionBlocked) {
      if (onNotify) onNotify('⚠️ Para enviar y publicar promociones push debes adquirir una membresía de fidely PRO.', 'warning');
      setActiveTab('MEMBERSHIP');
      return;
    }
    if (!promoForm.title.trim() || !promoForm.message.trim()) {
      onNotify('Por favor ingresa un título y un mensaje para la promoción', 'warning');
      return;
    }

    const stock = promoForm.isUnlimited ? 999999 : (parseInt(promoForm.totalStock, 10) || 10);
    if (!promoForm.isUnlimited && stock <= 0) {
      onNotify('El límite de personas debe ser al menos 1', 'warning');
      return;
    }

    if (!promoForm.validityDate) {
      onNotify('Selecciona la fecha de vigencia del cupón', 'warning');
      return;
    }

    setIsSendingPromo(true);
    try {
      const promoId = `PROMO-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      // Fecha exacta de expiración (23:59:59 del día de vigencia)
      const expiresAt = new Date(`${promoForm.validityDate}T23:59:59`).toISOString();

      const promoData = {
        id: promoId,
        storeId: currentStoreObj.id,
        storeName: currentStoreObj.name,
        storeLogo: (currentStoreObj.logo && currentStoreObj.logo.startsWith('http')) 
          ? currentStoreObj.logo 
          : (typeof window !== 'undefined' ? `${window.location.origin}/fidely_white_bg.png` : 'https://fidelyclub.net/fidely_white_bg.png'),
        title: promoForm.title.trim(),
        message: promoForm.message.trim(),
        imageUrl: (promoForm.imageUrl?.trim() && promoForm.imageUrl.trim().startsWith('http')) ? promoForm.imageUrl.trim() : null,
        badgeType: promoForm.badgeType || 'PROMO',
        isUnlimited: !!promoForm.isUnlimited,
        totalStock: stock,
        remainingStock: stock,
        claimedUserIds: [],
        claimedCount: 0,
        validityType: promoForm.validityType || 'UNTIL_DATE',
        validityDate: promoForm.validityDate,
        expiresAt: expiresAt,
        totalDestinatarios: Math.max(clientsWithStoreCard.length, clients.length),
        targetAllClients: true,
        targetAudience: 'ALL',
        lastPushTrigger: Date.now(),
        status: 'ACTIVA',
        createdAt: new Date().toISOString(),
        timestamp: Date.now()
      };

      // 1. Guardar en Firestore `store_promotions` para consulta y transacciones atómicas de los clientes
      if (db) {
        await setDoc(doc(db, 'store_promotions', promoId), promoData);
      }

      // 2. Guardar en RTDB -> dispara automáticamente la Cloud Function onTiendaPromocionPush
      const rtdbRef = dbRef(rtdb, `tiendas_promociones/${currentStoreObj.id}/${promoId}`);
      await dbSet(rtdbRef, promoData);

      onNotify(`🎉 ¡Cupón de Promoción publicado! Notificación push enviada a todos los clientes registrados.`, 'success');
      setPromoForm({
        title: '',
        message: '',
        imageUrl: '',
        badgeType: 'PROMO',
        isUnlimited: false,
        totalStock: 20,
        validityType: 'UNTIL_DATE',
        validityDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
      });
    } catch (err) {
      console.error('Error publicando promoción:', err);
      onNotify('Error al publicar la promoción: ' + (err?.code || err?.message || 'Revisa tu conexión.'), 'error');
    } finally {
      setIsSendingPromo(false);
    }
  };

  // Helper strictly scoped to match store
  const isMatchStore = (rStoreId, currentStoreId, rStoreName, currentStoreName) => {
    if (!currentStoreId) return false;
    const curId = String(currentStoreId).trim().toLowerCase();
    const curName = currentStoreName ? String(currentStoreName).trim().toLowerCase() : '';

    const sId = rStoreId ? String(rStoreId).trim().toLowerCase() : '';
    const sName = rStoreName ? String(rStoreName).trim().toLowerCase() : '';

    // No permitir comodines ni compras de otras tiendas
    if (sId === 'all' || sName === 'all' || sName === 'todas las tiendas') {
      return false;
    }

    // Regla de aislamiento estricto: Si ambos tienen nombre de tienda y NO coinciden, NO es la misma tienda.
    if (sName && curName) {
      const matchName = sName === curName || sName.includes(curName) || curName.includes(sName);
      if (!matchName) {
        return false;
      }
    }

    // Descartar cupones de pruebas antiguas de "SMART" si el comercio actual no se llama así
    if (curName && !curName.includes('smart') && sName.includes('smart')) {
      return false;
    }

    if (sId && curId) {
      if (sId === curId) return true;
      if (sId.includes('-') && sId.split('-')[1] === curId) return true;
      if (curId.includes('-') && curId.split('-')[1] === sId) return true;
    }

    if (sName && curName) {
      if (sName === curName) return true;
    }

    return false;
  };

  // Calculate purchases and previous clients for this store
  const storePurchases = purchases.filter(
    p => isMatchStore(p.storeId, safeStore.id, p.storeName, safeStore.name) && p.status === 'VALIDADA'
  );
  const clientPurchasesCountMap = storePurchases.reduce((acc, p) => {
    acc[p.clientId] = (acc[p.clientId] || 0) + 1;
    return acc;
  }, {});

  const previousStoreClients = clients.filter(c => {
    const hasPurchase = (clientPurchasesCountMap[c.id] || 0) > 0;
    const hasBalance = (c.storeBalances && (c.storeBalances[safeStore.id] || 0) > 0);
    const hasCardWithStamps = (c.loyaltyCards || []).some(
      card => isMatchStore(card.storeId, safeStore.id, card.storeName, safeStore.name) && (Number(card.currentStamps) || 0) > 0
    );
    return hasPurchase || hasBalance || hasCardWithStamps;
  });

  const pendingRedemptionsForStore = redemptions.filter(r => {
    if (!isMatchStore(r.storeId, safeStore.id, r.storeName, safeStore.name)) return false;
    // Excluir cupones promocionales y de bienvenida: el cliente los toma en su app y se aplican en venta rápida sin generar alerta de aprobación de sellos
    if (r.type === 'PROMO_COUPON' || r.type === 'DISCOUNT_COUPON' || r.isWelcomeCoupon === true || r.isPromotionalCoupon === true) {
      return false;
    }
    // Solo solicitudes en mostrador que requieren aprobación activa del cajero (solicitud de sello digital o canje de premio acumulado por sellos)
    return r.status === 'PENDIENTE';
  });

  // Historial auditado de sellos y canjes aprobados del cliente identificado en este comercio aliado
  const clientStoreStampHistory = useMemo(() => {
    if (!identifiedClient) return [];

    const events = [];

    // 1. Redemptions (solicitudes de sello y canjes de premios por mostrador/QR)
    (redemptions || []).forEach(r => {
      if (!isMatchStore(r.storeId, safeStore.id, r.storeName, safeStore.name)) return;
      const isClient = r.clientId === identifiedClient.id || 
        (r.clientDocId && identifiedClient.docId && String(r.clientDocId).trim() === String(identifiedClient.docId).trim()) ||
        (r.clientDocId && identifiedClient.cedula && String(r.clientDocId).trim() === String(identifiedClient.cedula).trim());
      if (!isClient) return;
      if (r.status !== 'APROBADO' && r.status !== 'USADO') return;

      const isReward = r.type === 'STAMP_REWARD_CLAIM' || (r.rewardTitle && !r.rewardTitle.includes('+1 Sello') && r.type !== 'STAMP_REQUEST');
      events.push({
        id: `red-${r.id}`,
        type: isReward ? 'CANJE_PREMIO' : 'SELLO_ACREDITADO',
        title: isReward ? `🎁 Canje de Premio: ${r.rewardTitle}` : '⭐ Sello Digital Aprobado (+1)',
        reference: r.voucherCode || r.reference || `REC-${String(r.id || '').slice(-6)}`,
        date: r.approvedAt || r.date || r.createdAt || 'Registrado',
        authorizedBy: r.authorizedBy || safeStore.manager || 'Cajero en Turno',
        stampsDelta: isReward ? -(r.stampsDeducted || r.stampsCost || 0) : +1,
        stampsAfter: r.currentStampsAfter ?? null,
        notes: isReward ? 'Premio entregado en mostrador' : 'Aprobado por escaneo QR en mostrador'
      });
    });

    // 2. Movements (movimientos auditados de sellos)
    (movements || []).forEach(m => {
      if (!isMatchStore(m.storeId, safeStore.id, m.storeName, safeStore.name)) return;
      const isClient = m.clientId === identifiedClient.id || 
        (m.clientDocId && identifiedClient.docId && String(m.clientDocId).trim() === String(identifiedClient.docId).trim()) ||
        (m.clientDocId && identifiedClient.cedula && String(m.clientDocId).trim() === String(identifiedClient.cedula).trim());
      if (!isClient) return;

      const alreadyAdded = events.some(e => e.reference && m.reference && e.reference === m.reference);
      if (alreadyAdded) return;

      if (m.type === 'SELLO_ACREDITADO') {
        events.push({
          id: `mov-${m.id}`,
          type: 'SELLO_ACREDITADO',
          title: '⭐ Sello Digital Acreditado (+1)',
          reference: m.reference || m.id,
          date: m.date || 'Registrado',
          authorizedBy: m.authorizedBy || safeStore.manager || 'Cajero en Turno',
          stampsDelta: +1,
          stampsAfter: m.balanceAfter ?? null,
          notes: m.notes || 'Sello acreditado en este local'
        });
      } else if (m.type === 'CANJE_SELLO' || m.type === 'CANJE_PREMIO_SELLO') {
        events.push({
          id: `mov-${m.id}`,
          type: 'CANJE_PREMIO',
          title: '🎁 Canje de Premio Entregado',
          reference: m.reference || m.id,
          date: m.date || 'Registrado',
          authorizedBy: m.authorizedBy || safeStore.manager || 'Cajero en Turno',
          stampsDelta: m.stamps || 0,
          stampsAfter: m.balanceAfter ?? null,
          notes: m.notes || 'Premio canjeado en este local'
        });
      }
    });

    // 3. Compras registradas en este local que acreditaron sellos
    (purchases || []).forEach(p => {
      if (!isMatchStore(p.storeId, safeStore.id, p.storeName, safeStore.name)) return;
      const isClient = p.clientId === identifiedClient.id || 
        (p.clientDocId && identifiedClient.docId && String(p.clientDocId).trim() === String(identifiedClient.docId).trim()) ||
        (p.clientDocId && identifiedClient.cedula && String(p.clientDocId).trim() === String(identifiedClient.cedula).trim());
      if (!isClient) return;
      if (p.status === 'ANULADA') return;

      const alreadyAdded = events.some(e => e.reference && p.reference && e.reference === p.reference);
      if (alreadyAdded) return;

      events.push({
        id: `pur-${p.id}`,
        type: 'SELLO_ACREDITADO',
        title: '⭐ Sello Acreditado por Venta',
        reference: p.reference || p.id,
        date: p.date || 'Registrado',
        authorizedBy: p.cashier || safeStore.manager || 'Caja Mostrador',
        stampsDelta: +1,
        stampsAfter: null,
        notes: `Factura ${p.reference} por US$${Number(p.netAmountUsd || p.amountUsd || 0).toFixed(2)}`
      });
    });

    // Ordenar descendente por fecha
    return events.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [identifiedClient, redemptions, movements, purchases, safeStore.id, safeStore.name]);

  // Play gentle audio chime via Web Audio API when a new redemption request arrives
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  };

  // Real-time alert on new incoming counter QR redemptions
  const prevCountRef = useRef(pendingRedemptionsForStore.length);
  useEffect(() => {
    if (pendingRedemptionsForStore.length > prevCountRef.current) {
      playChime();
      const latest = pendingRedemptionsForStore[0];
      const isRewardClaim = latest.type === 'STAMP_REWARD_CLAIM' || 
        latest.isRewardClaim === true || 
        latest.claimType === 'REWARD' ||
        (Boolean(latest.rewardTitle) && !latest.rewardTitle.includes('+1 Sello') && latest.isStampRequest !== true && latest.type !== 'STAMP_REQUEST');
      const isStamp = !isRewardClaim && (latest.type === 'STAMP_REQUEST' || latest.isStampRequest === true || latest.rewardTitle?.includes('+1 Sello'));
      if (isRewardClaim) {
        onNotify(`🎁 ¡Solicitud de CANJE DE PREMIO de "${latest.clientName}" recibida en mostrador! Reclama: ${latest.rewardTitle}`, 'success');
      } else {
        onNotify(`🔔 ¡Nueva solicitud de ${isStamp ? 'Sello Digital (+1)' : 'canje QR'} de "${latest.clientName}" recibida en mostrador!`, 'info');
      }
      if (isMobilePosMode) {
        setMobilePosTab('REQUESTS');
      }
    }
    prevCountRef.current = pendingRedemptionsForStore.length;
  }, [pendingRedemptionsForStore.length, isMobilePosMode]);

  // Approve stamp request (+1 Sello) from customer QR scan
  const handleApproveStampRequest = (req) => {
    if (isSubscriptionBlocked) {
      if (onNotify) onNotify('⚠️ Debes adquirir una membresía de fidely PRO para poder aprobar y otorgar sellos a tus clientes.', 'warning');
      setActiveTab('MEMBERSHIP');
      return;
    }
    const targetClient = clients.find(c => 
      c.id === req.clientId || 
      (c.cedula && req.clientDocId && String(c.cedula).trim() === String(req.clientDocId).trim()) ||
      (c.id && req.clientDocId && String(c.id).trim() === String(req.clientDocId).trim())
    );

    if (!targetClient) {
      onNotify('Cliente no encontrado en el sistema.', 'error');
      return;
    }

    const currentDate = new Date().toISOString();
    const currentDateFormatted = currentDate.replace('T', ' ').slice(0, 16);

    const clientCards = targetClient.loyaltyCards || [];
    const existingCard = clientCards.find(c => isMatchStore(c.storeId, safeStore.id, c.storeName, safeStore.name));
    let updatedLoyaltyCards = [...clientCards];
    let newStampsCount = 1;
    let targetStamps = Number(safeStore.stampsTarget || 6);

    const storeRewards = (safeStore.stampRewards && safeStore.stampRewards.length > 0)
      ? safeStore.stampRewards
      : [{ id: 'def_rew', stamps: targetStamps, title: safeStore.rewardTitle || 'Premio de Fidelidad', icon: '🎁' }];
    const maxStamps = Math.max(...storeRewards.map(r => Number(r.stamps) || 6), targetStamps);

    if (!existingCard) {
      newStampsCount = 1;
      const newCard = {
        id: `CARD-${safeStore.id}-${(targetClient.id || 'CLI').replace(/[^a-zA-Z0-9]/g, '').slice(-4)}`,
        storeId: safeStore.id,
        storeName: safeStore.name,
        storeCategory: safeStore.category || 'Comercio Aliado',
        cardColor: safeStore.cardColor || safeStore.design?.cardColor || '#9C382A',
        cardGradient: safeStore.cardGradient || safeStore.design?.cardGradient || '#DE8B76',
        logo: safeStore.logo || null,
        stampIcon: safeStore.stampIcon || safeStore.design?.stampIcon || 'star',
        stampsTarget: maxStamps,
        currentStamps: 1,
        stampRewards: storeRewards,
        rewardTitle: safeStore.rewardTitle || safeStore.currentReward || 'Premio de Fidelidad en Tienda',
        stampCondition: safeStore.stampCondition || '1 sello por cada compra elegible',
        status: 'ACTIVA',
        createdAt: currentDate,
        lastStampAt: currentDate
      };
      updatedLoyaltyCards.push(newCard);
    } else {
      newStampsCount = (existingCard.currentStamps || 0) + 1;
      targetStamps = existingCard.stampsTarget || maxStamps;
      updatedLoyaltyCards = updatedLoyaltyCards.map(c => 
        (c.storeId === existingCard.storeId || isMatchStore(c.storeId, safeStore.id, c.storeName, safeStore.name))
          ? {
              ...c,
              currentStamps: newStampsCount,
              stampsTarget: maxStamps,
              stampRewards: storeRewards,
              rewardTitle: safeStore.rewardTitle || c.rewardTitle,
              lastStampAt: currentDate
            }
          : c
      );
    }

    const updatedClientDoc = { ...targetClient, loyaltyCards: updatedLoyaltyCards };
    const updatedClients = clients.map(c => 
      c.id === targetClient.id 
        ? updatedClientDoc
        : c
    );
    setClients(updatedClients);

    if (identifiedClient && identifiedClient.id === targetClient.id) {
      setIdentifiedClient({ ...identifiedClient, loyaltyCards: updatedLoyaltyCards });
    }

    const approvedRequest = {
      ...req,
      status: 'APROBADO',
      approvedAt: currentDateFormatted,
      authorizedBy: safeStore.manager || 'Cajero en Turno',
      currentStampsAfter: newStampsCount,
      auditVerified: true
    };

    const updatedRedemptions = redemptions.map(r => 
      r.id === req.id ? approvedRequest : r
    );
    setRedemptions(updatedRedemptions);

    const newMovement = {
      id: `MOV-STAMP-${Date.now().toString().slice(-4)}`,
      clientId: targetClient.id,
      clientName: targetClient.name,
      type: 'SELLO_ACREDITADO',
      points: 0,
      stamps: 1,
      balanceAfter: newStampsCount,
      reference: req.voucherCode || `REQ-${req.id}`,
      storeId: safeStore.id,
      storeName: safeStore.name,
      authorizedBy: safeStore.manager || 'Cajero en Turno',
      date: currentDateFormatted,
      notes: `Sello digital acreditado por escaneo QR en mostrador (+1 Sello. Total acumulado: ${newStampsCount}/${maxStamps})`
    };
    if (setMovements) {
      setMovements(prev => [newMovement, ...prev]);
    }

    // Persistir en Firestore en tiempo real
    try {
      saveClient(updatedClientDoc);
      saveRedemption(approvedRequest);
      saveMovement(newMovement);
    } catch (e) {
      console.warn('[POS] Error guardando aprobación de sello en Firestore:', e);
    }

    setSelectedPendingRedemption(null);
    setShowRejectForm(false);
    playChime();
    onNotify(`¡✓ Sello Digital Aprobado para ${targetClient.name}! Ahora tiene ${newStampsCount} de ${maxStamps} sellos en ${safeStore.name}.`, 'success');
  };

  const handleRejectStampRequest = async (req, reason = 'No se validó la visita en mostrador') => {
    const currentDateFormatted = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const rejectedReq = {
      ...req,
      status: 'RECHAZADO',
      rejectionReason: reason,
      rejectedAt: currentDateFormatted,
      authorizedBy: safeStore.manager || 'Cajero en Turno',
      auditVerified: true
    };
    const updatedRedemptions = redemptions.map(r => 
      r.id === req.id ? rejectedReq : r
    );
    setRedemptions(updatedRedemptions);
    try {
      await saveRedemption(rejectedReq);
    } catch (e) {}
    setSelectedPendingRedemption(null);
    setShowRejectForm(false);
    onNotify(`Solicitud de sello de ${req.clientName || 'cliente'} rechazada.`, 'warning');
  };

  // Approve stamp reward claim (Entrega de Premio en mostrador)
  const handleApproveStampRewardClaim = async (req) => {
    if (isSubscriptionBlocked) {
      if (onNotify) onNotify('⚠️ Debes adquirir una membresía de fidely PRO para poder canjear y entregar premios en mostrador.', 'warning');
      setActiveTab('MEMBERSHIP');
      return;
    }
    const targetClient = clients.find(c => 
      c.id === req.clientId || 
      (c.cedula && req.clientDocId && String(c.cedula).trim() === String(req.clientDocId).trim()) ||
      (c.id && req.clientDocId && String(c.id).trim() === String(req.clientDocId).trim())
    );

    if (!targetClient) {
      onNotify('Cliente no encontrado en el sistema.', 'error');
      return;
    }

    const currentDate = new Date().toISOString();
    const currentDateFormatted = currentDate.replace('T', ' ').slice(0, 16);

    const clientCards = targetClient.loyaltyCards || [];
    const existingCard = clientCards.find(c => isMatchStore(c.storeId, safeStore.id, c.storeName, safeStore.name));
    
    const cost = Number(req.stampsCost || safeStore.stampsTarget || 6);
    const current = existingCard ? Number(existingCard.currentStamps || 0) : Number(req.currentStamps || 0);

    // Validación estricta en mostrador: No se puede aprobar la entrega si no cuenta con los sellos requeridos
    if (current <= 0 || cost <= 0 || current < cost) {
      onNotify(`⚠️ Sellos insuficientes: ${targetClient.name} tiene ${current} de ${cost} sellos requeridos. No se puede validar la entrega del premio.`, 'error');
      return;
    }

    const remainingStamps = Math.max(0, current - cost);
    const targetStamps = existingCard?.stampsTarget || Number(safeStore.stampsTarget || 6);

    const updatedLoyaltyCards = clientCards.map(c => {
      if (existingCard && (c.storeId === existingCard.storeId || isMatchStore(c.storeId, safeStore.id, c.storeName, safeStore.name))) {
        return {
          ...c,
          currentStamps: remainingStamps,
          lastRewardClaimed: req.rewardTitle,
          lastRewardClaimedAt: currentDate,
          completedCycles: (c.completedCycles || 0) + 1
        };
      }
      return c;
    });

    const updatedClient = {
      ...targetClient,
      loyaltyCards: updatedLoyaltyCards
    };

    try {
      await saveClient(updatedClient);
    } catch (e) {
      console.warn('[POS] Error guardando cliente tras canje:', e);
    }

    if (setClients) {
      setClients(prev => prev.map(c => c.id === targetClient.id ? updatedClient : c));
    }

    if (identifiedClient && identifiedClient.id === targetClient.id) {
      setIdentifiedClient(updatedClient);
    }

    const approvedRewardDoc = {
      ...req,
      status: 'APROBADO',
      approvedAt: currentDateFormatted,
      authorizedBy: safeStore.manager || 'Cajero en Turno',
      stampsDeducted: cost,
      currentStampsAfter: remainingStamps,
      auditVerified: true
    };

    const updatedRedemptions = redemptions.map(r => 
      r.id === req.id ? approvedRewardDoc : r
    );
    setRedemptions(updatedRedemptions);

    const newMovement = {
      id: `MOV-PREMIO-${Date.now().toString().slice(-4)}`,
      clientId: targetClient.id,
      clientName: targetClient.name,
      type: 'CANJE_PREMIO_SELLO',
      points: 0,
      stamps: -cost,
      balanceAfter: remainingStamps,
      reference: req.voucherCode || `CANJE-${req.id}`,
      storeId: safeStore.id,
      storeName: safeStore.name,
      authorizedBy: safeStore.manager || 'Cajero en Turno',
      date: currentDateFormatted,
      notes: `🎁 Premio Entregado en Mostrador: "${req.rewardTitle}" (${cost} sellos canjeados. Saldo restante: ${remainingStamps}/${targetStamps})`
    };
    if (setMovements) {
      setMovements(prev => [newMovement, ...prev]);
    }

    try {
      await saveRedemption(approvedRewardDoc);
      await saveMovement(newMovement);
    } catch (e) {
      console.warn('[POS] Error guardando canje en Firestore:', e);
    }

    setSelectedPendingRedemption(null);
    setShowRejectForm(false);
    playChime();
    onNotify(`🎁 ¡Premio Entregado! "${req.rewardTitle}" validado con éxito para ${targetClient.name}. Se descontaron ${cost} sellos. Restan: ${remainingStamps}.`, 'success');
  };

  const handleRejectStampRewardClaim = async (req, reason = 'No se validó la entrega en mostrador') => {
    const currentDateFormatted = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const rejectedDoc = {
      ...req,
      status: 'RECHAZADO',
      rejectionReason: reason,
      rejectedAt: currentDateFormatted,
      authorizedBy: safeStore.manager || 'Cajero en Turno',
      auditVerified: true
    };
    const updatedRedemptions = redemptions.map(r => 
      r.id === req.id ? rejectedDoc : r
    );
    setRedemptions(updatedRedemptions);
    try {
      await saveRedemption(rejectedDoc);
    } catch (e) {}
    setSelectedPendingRedemption(null);
    setShowRejectForm(false);
    onNotify(`Canje de premio de ${req.clientName || 'cliente'} rechazado.`, 'warning');
  };

  // Approve pending redemption after cashier audit
  const handleApprovePendingRedemption = (req) => {
    if (isSubscriptionBlocked) {
      if (onNotify) onNotify('⚠️ Debes adquirir una membresía de fidely PRO para procesar canjes de clientes en mostrador.', 'warning');
      setActiveTab('MEMBERSHIP');
      return;
    }
    const targetClient = clients.find(c => c.id === req.clientId);
    if (!targetClient) {
      onNotify('Cliente no encontrado en el sistema.', 'error');
      return;
    }
    const storePts = Math.max(
      (targetClient.storeBalances && targetClient.storeBalances[selectedStore.id]) || 0,
      (targetClient.storeBalances && targetClient.storeBalances['ALL']) || 0,
      targetClient.pointsBalance || 0,
      req.pointsCost || 0
    );
    if (storePts < req.pointsCost) {
      onNotify(`El cliente tiene ${storePts} pts en ${selectedStore.name}, requiere ${req.pointsCost} pts para este canje.`, 'error');
      return;
    }

    const newStorePts = Math.max(0, storePts - req.pointsCost);
    const newStoreBalances = {
      ...(targetClient.storeBalances || {}),
      [selectedStore.id]: newStorePts
    };
    if (newStoreBalances['ALL']) {
      newStoreBalances['ALL'] = Math.max(0, newStoreBalances['ALL'] - req.pointsCost);
    }
    const newGlobalBalance = Math.max(0, (targetClient.pointsBalance || 0) - req.pointsCost);
    const currentDate = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const updatedClients = clients.map(c => 
      c.id === targetClient.id 
        ? { ...c, pointsBalance: newGlobalBalance, storeBalances: newStoreBalances }
        : c
    );
    setClients(updatedClients);
    const freshClient = updatedClients.find(c => c.id === targetClient.id);
    setIdentifiedClient(freshClient);

    // Save approved credit to be applied directly to current sale
    setApprovedQrCredit({
      reqId: req.id,
      clientId: targetClient.id,
      clientName: targetClient.name,
      pointsCost: req.pointsCost,
      nominalValueUsd: req.nominalValueUsd || (req.pointsCost * config.pointValueUsd)
    });
    setApplyLocalDiscountUsd(0);
    setActiveTab('REGISTER_SALE');

    const newMovement = {
      id: `MOV-${Date.now().toString().slice(-4)}`,
      clientId: targetClient.id,
      type: 'CANJE_SALDO',
      points: -req.pointsCost,
      balanceAfter: newGlobalBalance,
      reference: req.voucherCode || `CANJE-${req.id}`,
      storeId: selectedStore.id,
      storeName: selectedStore.name,
      authorizedBy: selectedStore.manager || 'Cajero en Turno',
      date: currentDate,
      notes: `Canje de saldo en mostrador: ${req.rewardTitle} (-${req.pointsCost} pts = US$${req.nominalValueUsd?.toFixed(2)} de saldo a favor en ${selectedStore.name})`
    };
    setMovements([newMovement, ...movements]);

    const updatedRedemptions = redemptions.map(r => 
      r.id === req.id 
        ? {
            ...r,
            status: 'APROBADO',
            dateUsed: currentDate,
            authorizedBy: selectedStore.manager || 'Cajero en Turno',
            auditVerified: true
          }
        : r
    );
    setRedemptions(updatedRedemptions);

    setSelectedPendingRedemption(null);
    setShowRejectForm(false);
    setRejectionReasonInput('');
    onNotify(`¡Saldo de Puntos aprobado! US$${req.nominalValueUsd?.toFixed(2)} de saldo preparados para la compra de ${targetClient.name}.`, 'success');
  };

  // Cancel approved QR credit and restore points if client changes mind before sale completes
  const handleCancelApprovedQrCredit = () => {
    if (!approvedQrCredit) return;
    const clientToRestore = clients.find(c => c.id === approvedQrCredit.clientId);
    if (clientToRestore) {
      const curPts = (clientToRestore.storeBalances && clientToRestore.storeBalances[selectedStore.id]) || 0;
      const restoredStoreBalances = {
        ...(clientToRestore.storeBalances || {}),
        [selectedStore.id]: curPts + approvedQrCredit.pointsCost
      };
      const restoredGlobalBalance = clientToRestore.pointsBalance + approvedQrCredit.pointsCost;
      const updatedClients = clients.map(c => 
        c.id === clientToRestore.id 
          ? { ...c, pointsBalance: restoredGlobalBalance, storeBalances: restoredStoreBalances }
          : c
      );
      setClients(updatedClients);
      setIdentifiedClient(updatedClients.find(c => c.id === clientToRestore.id));
    }
    const updatedRedemptions = redemptions.map(r => 
      r.id === approvedQrCredit.reqId ? { ...r, status: 'RECHAZADO', rejectionReason: 'Cancelado en caja por el cajero' } : r
    );
    setRedemptions(updatedRedemptions);
    setApprovedQrCredit(null);
    onNotify('Saldo pre-aprobado cancelado y puntos restaurados al cliente.', 'info');
  };

  // Reject pending redemption
  const handleRejectPendingRedemption = (req) => {
    const reason = rejectionReasonInput.trim() || 'Verificación de compras o puntos no conforme en caja';
    const currentDate = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const updatedRedemptions = redemptions.map(r => 
      r.id === req.id 
        ? {
            ...r,
            status: 'RECHAZADO',
            rejectionReason: reason,
            dateUsed: currentDate,
            authorizedBy: selectedStore.manager || 'Cajero en Turno'
          }
        : r
    );
    setRedemptions(updatedRedemptions);
    setSelectedPendingRedemption(null);
    setShowRejectForm(false);
    setRejectionReasonInput('');
    onNotify(`Solicitud de canje rechazada: ${reason}`, 'info');
  };

  // Filter clients with robust query matching (including email, doc, phone, name and qr)
  const cleanSearch = searchQuery.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const filteredClients = searchQuery.trim() === '' ? [] : clients.filter(c => {
    const cleanDoc = (c.docId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanPhone = (c.phone || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanName = (c.name || '').toLowerCase();
    const cleanEmail = (c.email || '').toLowerCase();
    const query = searchQuery.trim().toLowerCase();
    return cleanDoc.includes(cleanSearch) || 
           cleanPhone.includes(cleanSearch) || 
           cleanName.includes(query) ||
           cleanEmail.includes(query) ||
           (c.qrCode && c.qrCode.toLowerCase().includes(query)) ||
           c.id.toLowerCase().includes(cleanSearch);
  });

  // Direct apply previous coupon helper from past accumulated points
  const handleDirectApplyPreviousCoupon = (couponAmountUsd) => {
    if (!identifiedClient) return;
    const maxDiscount = Math.min(amountUsd > 0 ? amountUsd : 9999, storeAvailableDiscountUsd);
    const chosenDiscount = Math.min(couponAmountUsd, maxDiscount);
    if (chosenDiscount <= 0) return;
    const pointsCost = Math.round(chosenDiscount / config.pointValueUsd);

    const currentStorePts = (identifiedClient.storeBalances && identifiedClient.storeBalances[safeStore.id]) || 0;
    if (currentStorePts < pointsCost) {
      onNotify(`El cliente tiene ${currentStorePts} pts acumulados en este local, requiere ${pointsCost} pts para este cupón`, 'error');
      return;
    }

    const newStorePts = currentStorePts - pointsCost;
    const newGlobalBalance = Math.max(0, identifiedClient.pointsBalance - pointsCost);
    const updatedClients = clients.map(c => 
      c.id === identifiedClient.id 
        ? { 
            ...c, 
            pointsBalance: newGlobalBalance, 
            storeBalances: { ...(c.storeBalances || {}), [safeStore.id]: newStorePts } 
          }
        : c
    );
    setClients(updatedClients);
    const freshClient = updatedClients.find(c => c.id === identifiedClient.id);
    setIdentifiedClient(freshClient);

    setApprovedQrCredit({
      reqId: `DIR-${Date.now().toString().slice(-4)}`,
      clientId: identifiedClient.id,
      clientName: identifiedClient.name,
      pointsCost,
      nominalValueUsd: chosenDiscount
    });
    setWantsApplyCoupon(false);
    onNotify(`¡Cupón de US$${chosenDiscount.toFixed(2)} aplicado! (-${pointsCost} pts de su saldo anterior debitados)`, 'success');
  };

  // Scan customer QR card from POS camera
  const handlePosClientQrScan = (decodedText) => {
    if (!decodedText) return;
    const clean = String(decodedText).trim();
    const matched = clients.find(c => 
      c.qrCode?.toLowerCase() === clean.toLowerCase() ||
      c.docId?.toLowerCase().replace(/[^a-z0-9]/g, '') === clean.toLowerCase().replace(/[^a-z0-9]/g, '') ||
      c.id.toLowerCase() === clean.toLowerCase() ||
      (clean.includes('FIDELY-') && c.qrCode?.toLowerCase().includes(clean.toLowerCase()))
    );
    if (matched) {
      setIdentifiedClient(matched);
      setShowPosCameraScanner(false);
      const existingCard = (matched.loyaltyCards || []).find(c => c.storeId === safeStore.id);
      if (existingCard) {
        onNotify(`¡Socio(a) ${matched.name} identificado(a)! Tarjeta de fidelización activa (${existingCard.currentStamps}/${existingCard.stampsTarget} sellos).`, 'success');
      } else {
        onNotify(`¡Socio(a) ${matched.name} identificado(a)! Al procesar su compra se creará su Tarjeta de Fidelización de ${safeStore.name} con su 1er sello.`, 'info');
      }
    } else {
      onNotify(`Código QR no coincide con ningún cliente registrado (${clean})`, 'warning');
    }
  };

  // Canje en Caja de Premios del Catálogo de Sellos
  const handleRedeemStampRewardInPos = async (reward) => {
    if (!identifiedClient || !reward) return;
    const clientCards = identifiedClient.loyaltyCards || [];
    const existingCard = clientCards.find(c => c.storeId === safeStore.id);
    if (!existingCard) {
      onNotify('El socio no tiene tarjeta activa en esta tienda.', 'warning');
      return;
    }
    const currentStamps = Number(existingCard.currentStamps || 0);
    const cost = Number(reward.stamps || 0);
    if (currentStamps < cost) {
      onNotify(`Sellos insuficientes. Se requieren ${cost} sellos y el cliente tiene ${currentStamps}.`, 'warning');
      return;
    }

    const nextStamps = Math.max(0, currentStamps - cost);
    const updatedCards = clientCards.map(c => 
      c.storeId === safeStore.id
        ? {
            ...c,
            currentStamps: nextStamps,
            lastStampAt: new Date().toISOString()
          }
        : c
    );

    const updatedClient = {
      ...identifiedClient,
      loyaltyCards: updatedCards
    };

    // Actualizar en Cloud Firestore
    try {
      await saveClient(updatedClient);
    } catch (e) {
      console.warn('[POS] Error guardando canje de sellos en Firestore:', e);
    }

    // Actualizar en el estado React del POS
    setIdentifiedClient(updatedClient);
    if (setClients) {
      setClients(prev => prev.map(c => c.id === identifiedClient.id ? updatedClient : c));
    }

    // Registrar movimiento de auditoría
    const newMovement = {
      id: `MOV-SELLO-${Date.now().toString().slice(-4)}`,
      clientId: identifiedClient.id,
      clientName: identifiedClient.name,
      type: 'CANJE_SELLO',
      points: 0,
      balanceAfter: identifiedClient.pointsBalance,
      reference: `SELLO-${Date.now().toString().slice(-6)}`,
      storeId: safeStore.id,
      storeName: safeStore.name,
      authorizedBy: safeStore.manager || 'Cajero de Turno',
      date: new Date().toISOString().split('T')[0],
      notes: `Canje de Premio por Sellos: "${reward.title}" (-${cost} sellos). Saldo restante: ${nextStamps} sellos.`
    };

    if (setMovements) {
      setMovements(prev => [newMovement, ...prev]);
    }

    onNotify(`🎉 ¡Premio "${reward.title}" canjeado para ${identifiedClient.name}! Se debitaron ${cost} sellos (${nextStamps} sellos restantes).`, 'success');
  };

  // Filter products for this store
  const storeProducts = (products || []).filter(
    p => p.storeId === safeStore.id || p.storeId === 'ALL' || !p.storeId
  );

  // Cart Totals and Tax Breakdown (Bimoneda)
  const isItemsMode = billingMode === 'ITEMS';
  // El precio de venta (PVP) registrado en cada producto ya incluye el IVA
  const cartGrossTotalUsd = isItemsMode 
    ? cartItems.reduce((acc, it) => acc + ((parseFloat(it.priceUsd) || 0) * (parseInt(it.quantity) || 1)), 0)
    : 0;
  const cartExemptUsd = isItemsMode
    ? cartItems.filter(it => it.taxType === 'EXENTO_0').reduce((acc, it) => acc + ((parseFloat(it.priceUsd) || 0) * (parseInt(it.quantity) || 1)), 0)
    : 0;
  const cartTaxable16GrossUsd = isItemsMode
    ? cartItems.filter(it => it.taxType === 'GRAVABLE_16').reduce((acc, it) => acc + ((parseFloat(it.priceUsd) || 0) * (parseInt(it.quantity) || 1)), 0)
    : 0;
  // Base Imponible Gravada (desglosada dividiendo entre 1.16)
  const cartTaxable16BaseUsd = cartTaxable16GrossUsd > 0 ? (cartTaxable16GrossUsd / 1.16) : 0;
  // IVA determinado (16% reflejado en la compra, no sumado por encima)
  const cartTax16Usd = cartTaxable16GrossUsd - cartTaxable16BaseUsd;
  // Subtotal base neto sin IVA
  const cartSubtotalUsd = cartTaxable16BaseUsd + cartExemptUsd;

  // Compute sale amount and points
  const rawAmount = isItemsMode 
    ? parseFloat(cartGrossTotalUsd.toFixed(2)) 
    : (parseFloat(amountInput) || 0);

  const amountUsd = isItemsMode 
    ? rawAmount 
    : (currency === 'USD' ? rawAmount : rawAmount / config.vesExchangeRate);

  const amountVes = isItemsMode 
    ? parseFloat((amountUsd * config.vesExchangeRate).toFixed(2))
    : (currency === 'VES' ? rawAmount : rawAmount * config.vesExchangeRate);

  // Available points in this local specifically
  const storeAvailablePts = (identifiedClient?.storeBalances && identifiedClient.storeBalances[selectedStore.id]) || 0;
  const storeAvailableDiscountUsd = parseFloat((storeAvailablePts * config.pointValueUsd).toFixed(2));

  // Approved QR credit applied specifically for the currently identified client
  const activeQrCreditUsd = (approvedQrCredit && identifiedClient && approvedQrCredit.clientId === identifiedClient.id) 
    ? approvedQrCredit.nominalValueUsd 
    : 0;
  const activeQrCreditPts = (approvedQrCredit && identifiedClient && approvedQrCredit.clientId === identifiedClient.id) 
    ? approvedQrCredit.pointsCost 
    : 0;

  // Cupones promocionales o de bienvenida disponibles del cliente identificado en este comercio aliado
  const clientAvailableCoupons = useMemo(() => {
    if (!identifiedClient) return [];
    const cId = String(identifiedClient.id || '').trim();
    const cUid = String(identifiedClient.uid || '').trim();
    const rawDoc = String(identifiedClient.cedula || identifiedClient.docId || '').trim();
    const normDoc = rawDoc.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const digitsDoc = rawDoc.replace(/\D/g, '');
    const cPhone = String(identifiedClient.phone || '').replace(/\D/g, '');

    const matchesClient = (r) => {
      const rClientId = String(r.clientId || '').trim();
      if (cId && rClientId === cId) return true;
      if (cUid && rClientId === cUid) return true;
      const rDocRaw = String(r.clientDocId || '').trim();
      if (rDocRaw && rawDoc) {
        if (rDocRaw.toLowerCase() === rawDoc.toLowerCase()) return true;
        const rNorm = rDocRaw.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        if (normDoc && rNorm === normDoc) return true;
        const rDigits = rDocRaw.replace(/\D/g, '');
        if (digitsDoc && digitsDoc.length >= 5 && rDigits === digitsDoc) return true;
      }
      const rPhone = String(r.clientPhone || '').replace(/\D/g, '');
      if (cPhone && cPhone.length >= 7 && rPhone === cPhone) return true;
      return false;
    };

    const currentStoreLower = String(safeStore.name || '').toLowerCase();

    const fromRedemptions = (redemptions || []).filter(r => {
      if (!isMatchStore(r.storeId, safeStore.id, r.storeName, safeStore.name)) return false;
      const titleLower = String(r.rewardTitle || r.title || '').toLowerCase();
      if (!currentStoreLower.includes('smart') && (titleLower.startsWith('smart:') || titleLower.includes('gym promo'))) return false;
      if (!matchesClient(r)) return false;
      const st = String(r.status || 'DISPONIBLE').toUpperCase();
      if (st === 'USADO' || st === 'APROBADO' || st === 'RECHAZADO' || st === 'CANCELADO' || r.used === true) return false;
      return (r.type === 'PROMO_COUPON' || r.type === 'DISCOUNT_COUPON' || r.isWelcomeCoupon === true || r.isPromotionalCoupon === true);
    }).map(r => ({
      ...r,
      status: 'DISPONIBLE'
    }));

    // También incluir cupones reclamados en storePromotionsList que aún no hayan sido marcados como USADO en redemptions
    const usedPromoIds = new Set(
      (redemptions || [])
        .filter(r => matchesClient(r) && (String(r.status || '').toUpperCase() === 'USADO' || r.used === true))
        .map(r => r.promoId)
        .filter(Boolean)
    );
    const activePromoIdsInList = new Set(fromRedemptions.map(r => r.promoId).filter(Boolean));
    const activeVoucherCodesInList = new Set(fromRedemptions.map(r => r.id || r.voucherCode).filter(Boolean));

    const synthesizedFromPromos = [];
    (storePromotionsList || []).forEach(promo => {
      if (!promo || !promo.id) return;
      if (!isMatchStore(promo.storeId, safeStore.id, promo.storeName, safeStore.name)) return;
      const promoTitleLower = String(promo.title || '').toLowerCase();
      if (!currentStoreLower.includes('smart') && (promoTitleLower.startsWith('smart:') || promoTitleLower.includes('gym promo'))) return;
      const claimedIds = Array.isArray(promo.claimedUserIds) ? promo.claimedUserIds.map(x => String(x).trim()) : [];
      const claimedByClient = (cId && claimedIds.includes(cId)) || (cUid && claimedIds.includes(cUid));
      if (!claimedByClient) return;
      if (usedPromoIds.has(promo.id) || activePromoIdsInList.has(promo.id)) return;

      const savedCode = (promo.claimedVouchers && (promo.claimedVouchers[cId] || promo.claimedVouchers[cUid]))
        || `CUPON-${String(promo.id).slice(-6)}-${String(cId || cUid).slice(-4).toUpperCase()}`;
      if (activeVoucherCodesInList.has(savedCode)) return;

      // Verificar si ese código ya fue usado en redemptions
      const alreadyUsedByCode = (redemptions || []).some(
        r => (r.id === savedCode || r.voucherCode === savedCode) && (String(r.status || '').toUpperCase() === 'USADO' || r.used === true)
      );
      if (alreadyUsedByCode) return;

      synthesizedFromPromos.push({
        id: savedCode,
        voucherCode: savedCode,
        promoId: promo.id,
        clientId: cId || cUid,
        clientDocId: rawDoc,
        clientName: identifiedClient.name || 'Cliente',
        clientPhone: identifiedClient.phone || '',
        storeId: safeStore.id,
        storeName: safeStore.name,
        title: promo.title,
        rewardTitle: promo.title,
        description: promo.message || '',
        type: 'PROMO_COUPON',
        isPromotionalCoupon: true,
        badgeType: promo.badgeType || 'PROMO',
        status: 'DISPONIBLE',
        used: false
      });
    });

    return [...fromRedemptions, ...synthesizedFromPromos];
  }, [identifiedClient, redemptions, storePromotionsList, safeStore.id, safeStore.name]);

  // Canjear / usar un cupón directamente SIN necesidad de registrar una venta
  const handleRedeemCouponWithoutSale = async (coupon) => {
    if (isSubscriptionBlocked) {
      if (onNotify) onNotify('⚠️ Para canjear cupones debes adquirir una membresía de fidely PRO.', 'warning');
      setActiveTab('MEMBERSHIP');
      return;
    }
    if (!coupon || !identifiedClient) return;
    const usedCouponId = coupon.id || coupon.voucherCode;
    const nowIso = new Date().toISOString();
    const coupUpdate = {
      ...coupon,
      id: usedCouponId,
      voucherCode: coupon.voucherCode || usedCouponId,
      clientId: coupon.clientId || identifiedClient.id,
      clientDocId: coupon.clientDocId || identifiedClient.cedula || identifiedClient.docId || '',
      clientName: coupon.clientName || identifiedClient.name || 'Cliente',
      storeId: safeStore.id,
      storeName: safeStore.name,
      status: 'USADO',
      used: true,
      usedAt: nowIso,
      saleReference: 'CANJE-DIRECTO-SIN-VENTA',
      usedAtStoreId: safeStore.id,
      usedAtStoreName: safeStore.name
    };

    if (db && usedCouponId) {
      try {
        await setDoc(doc(db, 'redemptions', usedCouponId), coupUpdate, { merge: true });
      } catch (eCoup) {
        console.warn('Error marcando cupón como USADO sin venta en Firestore:', eCoup);
      }
    }

    setRedemptions(prev => {
      const exists = (prev || []).some(r => r.id === usedCouponId || r.voucherCode === usedCouponId);
      if (exists) {
        return prev.map(r => (r.id === usedCouponId || r.voucherCode === usedCouponId) ? { ...r, ...coupUpdate } : r);
      }
      return [coupUpdate, ...(prev || [])];
    });

    if (selectedSaleCoupon && (selectedSaleCoupon.id === usedCouponId || selectedSaleCoupon.voucherCode === usedCouponId)) {
      setSelectedSaleCoupon(null);
    }

    if (coupon.isWelcomeCoupon && identifiedClient?.id && db) {
      try {
        await updateDoc(doc(db, 'clients', identifiedClient.id), {
          hasConsumedWelcome: true,
          hasClaimedWelcomeCoupon: true,
          welcomeConsumedAt: nowIso
        });
      } catch (eWel) {}
    }

    const newMovement = {
      id: `MOV-CUPON-${Date.now()}`,
      date: nowIso.replace('T', ' ').substring(0, 16),
      clientId: identifiedClient.id,
      clientName: identifiedClient.name,
      storeId: safeStore.id,
      storeName: safeStore.name,
      type: 'CANJE_PREMIO',
      description: `Cupón canjeado (Sin registro de venta): ${coupon.rewardTitle || coupon.title} (${coupon.voucherCode || usedCouponId})`,
      points: 0,
      amountUsd: 0
    };
    setMovements(prev => [newMovement, ...(prev || [])]);
    saveMovement(newMovement);

    if (onNotify) {
      onNotify(`✅ Cupón "${coupon.rewardTitle || coupon.title}" validado y marcado como USADO para ${identifiedClient.name} (Sin registro de venta).`, 'success');
    }
  };

  // Cálculo del descuento del cupón promocional seleccionado
  const activeCouponDiscountUsd = useMemo(() => {
    if (!selectedSaleCoupon || !identifiedClient) return 0;
    const type = selectedSaleCoupon.couponType || selectedSaleCoupon.type;
    const val = parseFloat(selectedSaleCoupon.couponValue) || 0;
    const title = (selectedSaleCoupon.rewardTitle || selectedSaleCoupon.title || '').toString();

    // 1. Descuento fijo en USD
    if (type === 'FIXED_USD' && val > 0) {
      return Math.min(amountUsd, val);
    }
    if (selectedSaleCoupon.nominalValueUsd && Number(selectedSaleCoupon.nominalValueUsd) > 0) {
      return Math.min(amountUsd, Number(selectedSaleCoupon.nominalValueUsd));
    }

    // 2. Descuento porcentual
    if (type === 'PERCENT' && val > 0) {
      return parseFloat(((amountUsd * val) / 100).toFixed(2));
    }
    const matchPercent = title.match(/(\d+(\.\d+)?)\s*%/);
    if (matchPercent) {
      const p = parseFloat(matchPercent[1]);
      if (p > 0 && p <= 100) {
        return parseFloat(((amountUsd * p) / 100).toFixed(2));
      }
    }

    // 3. Monto en USD detectado en el título (ej: "US$ 5" o "$5")
    const matchUsd = title.match(/(?:US\$|\$)\s*(\d+(\.\d+)?)/i);
    if (matchUsd) {
      const u = parseFloat(matchUsd[1]);
      if (u > 0) return Math.min(amountUsd, u);
    }

    return 0;
  }, [selectedSaleCoupon, identifiedClient, amountUsd]);

  // Additional manual saldo chosen by cashier if applicable
  const remainingAmountAfterCredits = Math.max(0, amountUsd - activeQrCreditUsd - activeCouponDiscountUsd);
  const effectiveManualDiscountUsd = Math.min(applyLocalDiscountUsd, remainingAmountAfterCredits, storeAvailableDiscountUsd);
  const effectiveManualDiscountPts = Math.round(effectiveManualDiscountUsd / config.pointValueUsd);

  // Total saldo and discounts applied to this purchase
  const totalAppliedSaldoUsd = activeQrCreditUsd + activeCouponDiscountUsd + effectiveManualDiscountUsd;
  const totalAppliedSaldoPts = activeQrCreditPts + effectiveManualDiscountPts;

  // Net amount to pay at register
  const netAmountUsd = Math.max(0, amountUsd - totalAppliedSaldoUsd);
  const netAmountVes = netAmountUsd * config.vesExchangeRate;

  // Split payment calculations
  const paidCashUsd = parseFloat(paymentBreakdown.cashUsd) || 0;
  const paidZelleUsd = parseFloat(paymentBreakdown.zelleUsd) || 0;
  const totalPaidUsdCurrency = paidCashUsd + paidZelleUsd;

  const paidCashVes = parseFloat(paymentBreakdown.cashVes) || 0;
  const paidPosVes = parseFloat(paymentBreakdown.posDebitVes) || 0;
  const paidPagoMovilVes = parseFloat(paymentBreakdown.pagoMovilVes) || 0;
  const paidTransferVes = parseFloat(paymentBreakdown.transferVes) || 0;
  const totalPaidVesCurrency = paidCashVes + paidPosVes + paidPagoMovilVes + paidTransferVes;

  const totalPaidConvertedUsd = totalPaidUsdCurrency + (totalPaidVesCurrency / (config.vesExchangeRate || 1));
  const remainingDueUsd = Math.max(0, netAmountUsd - totalPaidConvertedUsd);
  const remainingDueVes = remainingDueUsd * (config.vesExchangeRate || 1);
  const changeDueUsd = Math.max(0, totalPaidConvertedUsd - netAmountUsd);
  const changeDueVes = changeDueUsd * (config.vesExchangeRate || 1);

  // Business Rules: RN-02 (Monto mínimo definido por la tienda), RN-03 (% de retorno por tienda, por defecto 5%), RN-05 (Floor rounding)
  const isEligible = netAmountUsd >= storeMinPurchase;
  const storePercent = parseFloat(safeStore?.cashbackPercent ?? config?.defaultCashbackPercent ?? 5.0);
  const pointVal = config?.pointValueUsd || 0.05;
  const cashbackAmountUsd = isEligible ? (netAmountUsd * (storePercent / 100)) : 0;
  const pointsToEarn = isEligible ? Math.floor(cashbackAmountUsd / pointVal) : 0;
  const nominalRewardValue = (pointsToEarn * pointVal).toFixed(2);

  // Check duplicate invoice reference (RN-06)
  const isDuplicateRef = invoiceRef.trim() !== '' && purchases.some(p => 
    p.reference.trim().toUpperCase() === invoiceRef.trim().toUpperCase() && p.status !== 'ANULADA'
  );

  // Cart Management Handlers
  const handleAddToCart = (product) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        id: product.id,
        code: product.code || '',
        name: product.name,
        category: product.category || 'Producto',
        priceUsd: parseFloat(product.priceUsd) || 0,
        taxType: product.taxType || 'GRAVABLE_16',
        quantity: 1
      }];
    });
    onNotify(`"${product.name}" agregado a la factura`, 'success');
  };

  const handleUpdateItemQty = (itemId, delta) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const handleRemoveFromCart = (itemId) => {
    setCartItems(prev => prev.filter(i => i.id !== itemId));
  };

  const handleAddQuickItem = (e) => {
    e.preventDefault();
    if (!quickItemForm.name.trim() || !quickItemForm.priceUsd || parseFloat(quickItemForm.priceUsd) <= 0) {
      onNotify('Por favor ingresa una descripción y un precio válido', 'error');
      return;
    }
    const newItem = {
      id: `ITEM-CUSTOM-${Date.now().toString().slice(-5)}`,
      code: 'LIBRE',
      name: quickItemForm.name.trim(),
      category: 'Concepto Manual',
      priceUsd: parseFloat(quickItemForm.priceUsd),
      taxType: quickItemForm.taxType,
      quantity: parseInt(quickItemForm.quantity) || 1
    };
    setCartItems(prev => [...prev, newItem]);
    setShowQuickItemModal(false);
    setQuickItemForm({ name: '', priceUsd: '', quantity: 1, taxType: 'GRAVABLE_16' });
    onNotify('Ítem libre agregado a la factura', 'success');
  };

  // Product Catalog Management Handlers
  const handleSaveProduct = (e) => {
    e.preventDefault();
    if (isSubscriptionBlocked) {
      if (onNotify) onNotify('⚠️ Para guardar productos en el catálogo debes adquirir una membresía de fidely PRO.', 'warning');
      setActiveTab('MEMBERSHIP');
      return;
    }
    if (!productForm.name.trim() || !productForm.priceUsd || parseFloat(productForm.priceUsd) <= 0) {
      onNotify('Ingresa nombre y precio válido en USD', 'error');
      return;
    }
    const cleanId = editingProduct ? editingProduct.id : `PROD-${Date.now().toString().slice(-6)}`;
    const productData = {
      id: cleanId,
      storeId: safeStore.id,
      code: productForm.code.trim().toUpperCase() || `SKU-${Date.now().toString().slice(-4)}`,
      name: productForm.name.trim(),
      category: productForm.category,
      priceUsd: parseFloat(productForm.priceUsd),
      taxType: productForm.taxType,
      isService: Boolean(productForm.isService),
      stock: parseInt(productForm.stock) || 0,
      updatedAt: new Date().toISOString()
    };

    if (editingProduct) {
      setProducts(prev => prev.map(p => p.id === cleanId ? productData : p));
      onNotify('Producto actualizado correctamente en el catálogo', 'success');
    } else {
      setProducts(prev => [productData, ...prev]);
      onNotify('Nuevo producto añadido al catálogo de la tienda', 'success');
    }

    setShowProductModal(false);
    setEditingProduct(null);
    setProductForm({ code: '', name: '', category: 'Servicio', priceUsd: 10, taxType: 'GRAVABLE_16', isService: true, stock: 100 });
  };

  const handleDeleteProduct = (productId) => {
    if (window.confirm('¿Seguro que deseas eliminar este producto del catálogo?')) {
      setProducts(prev => prev.filter(p => p.id !== productId));
      removeProduct(productId).catch(() => {});
      onNotify('Producto eliminado del catálogo', 'info');
    }
  };

  // Handle register purchase
  const handleRegisterPurchase = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSubscriptionBlocked) {
      if (onNotify) onNotify('⚠️ Para registrar ventas y facturar en caja debes adquirir una membresía de fidely PRO.', 'warning');
      setActiveTab('MEMBERSHIP');
      return;
    }
    if (!identifiedClient) {
      onNotify('Por favor busca e identifica a un cliente primero (RN-01)', 'error');
      return;
    }
    if (isItemsMode && cartItems.length === 0) {
      onNotify('Agrega al menos un producto o ítem a la factura', 'error');
      return;
    }
    if (!isItemsMode && rawAmount <= 0) {
      onNotify('Ingresa un monto de compra válido mayor a 0', 'error');
      return;
    }
    const finalRef = invoiceRef.trim() ? invoiceRef.trim().toUpperCase() : `FAC-${Date.now().toString().slice(-5)}`;
    if (isDuplicateRef) {
      onNotify(`La referencia ${invoiceRef} ya fue procesada anteriormente (RN-06 No Duplicidad)`, 'error');
      return;
    }

    const newPurchaseId = `PUR-${Date.now().toString().slice(-4)}`;
    const newMovementId = `MOV-${Date.now().toString().slice(-4)}`;
    const currentDate = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const newPurchase = {
      id: newPurchaseId,
      clientId: identifiedClient.id,
      clientName: identifiedClient.name,
      clientDocId: identifiedClient.docId || '',
      storeId: selectedStore.id,
      storeName: selectedStore.name,
      amountUsd: parseFloat(amountUsd.toFixed(2)),
      amountVes: parseFloat(amountVes.toFixed(2)),
      discountAppliedUsd: parseFloat(totalAppliedSaldoUsd.toFixed(2)),
      discountAppliedPts: totalAppliedSaldoPts,
      qrCreditAppliedUsd: activeQrCreditUsd,
      couponDiscountUsd: activeCouponDiscountUsd,
      couponApplied: selectedSaleCoupon ? {
        id: selectedSaleCoupon.id,
        voucherCode: selectedSaleCoupon.voucherCode,
        title: selectedSaleCoupon.rewardTitle || selectedSaleCoupon.title,
        discountUsd: activeCouponDiscountUsd
      } : null,
      netAmountUsd: parseFloat(netAmountUsd.toFixed(2)),
      currencyApplied: currency,
      exchangeRate: config.vesExchangeRate,
      reference: finalRef,
      controlNumber: `CTRL-${Date.now().toString().slice(-6)}`,
      billingMode: isItemsMode ? 'ITEMS' : 'QUICK',
      items: isItemsMode ? cartItems : [{
        name: 'Venta por Monto Global',
        quantity: 1,
        priceUsd: amountUsd,
        priceVes: amountVes,
        taxType: 'GRAVABLE_16'
      }],
      taxBreakdown: {
        subtotalUsd: isItemsMode ? parseFloat(cartSubtotalUsd.toFixed(2)) : parseFloat((amountUsd / 1.16).toFixed(2)),
        exemptTotalUsd: isItemsMode ? parseFloat(cartExemptUsd.toFixed(2)) : 0,
        taxableBase16Usd: isItemsMode ? parseFloat(cartTaxable16BaseUsd.toFixed(2)) : parseFloat((amountUsd / 1.16).toFixed(2)),
        tax16Usd: isItemsMode ? parseFloat(cartTax16Usd.toFixed(2)) : parseFloat((amountUsd - (amountUsd / 1.16)).toFixed(2)),
        exchangeRate: config.vesExchangeRate
      },
      payments: { ...paymentBreakdown },
      pointsEarned: pointsToEarn,
      status: 'VALIDADA',
      date: currentDate,
      cashier: selectedStore.manager || 'Cajero de Turno'
    };

    // Notice: activeQrCreditPts was already deducted when approved.
    // We only deduct additional manual points (effectiveManualDiscountPts)
    const currentStorePts = (identifiedClient.storeBalances && identifiedClient.storeBalances[selectedStore.id]) || 0;
    const newStorePts = Math.max(0, currentStorePts - effectiveManualDiscountPts) + pointsToEarn;
    const newBalance = Math.max(0, identifiedClient.pointsBalance - effectiveManualDiscountPts) + pointsToEarn;
    const newStoreBalances = {
      ...(identifiedClient.storeBalances || {}),
      [selectedStore.id]: newStorePts
    };

    // Gestión de Tarjeta de Fidelización exclusiva de la tienda (Cada tienda tiene su tarjeta)
    const clientCards = identifiedClient.loyaltyCards || [];
    const existingCard = clientCards.find(c => c.storeId === selectedStore.id);
    let updatedLoyaltyCards = [...clientCards];
    let cardCreatedInPurchase = false;

    if (!existingCard) {
      // Primera compra en esta tienda: Se crea automáticamente la tarjeta de fidelización con su 1er sello
      const storeRewards = (selectedStore.stampRewards && selectedStore.stampRewards.length > 0)
        ? selectedStore.stampRewards
        : [{ id: 'def_rew', stamps: Number(selectedStore.stampsTarget || 6), title: selectedStore.rewardTitle || 'Premio de Fidelidad', icon: '🎁' }];
      const maxStamps = Math.max(...storeRewards.map(r => Number(r.stamps) || 6), Number(selectedStore.stampsTarget || 6));

      const newCard = {
        id: `CARD-${selectedStore.id}-${(identifiedClient.id || 'CLI').replace(/[^a-zA-Z0-9]/g, '').slice(-4)}`,
        storeId: selectedStore.id,
        storeName: selectedStore.name,
        storeCategory: selectedStore.category || 'Comercio Aliado',
        cardColor: selectedStore.cardColor || selectedStore.design?.cardColor || '#9C382A',
        cardGradient: selectedStore.cardGradient || selectedStore.design?.cardGradient || '#DE8B76',
        logo: selectedStore.logo || null,
        stampIcon: selectedStore.stampIcon || selectedStore.design?.stampIcon || 'star',
        stampsTarget: maxStamps,
        currentStamps: 1, // Primer sello acreditado por su primera compra
        stampRewards: storeRewards,
        rewardTitle: selectedStore.rewardTitle || selectedStore.currentReward || 'Premio de Fidelidad en Tienda',
        stampCondition: selectedStore.stampCondition || '1 sello por cada compra elegible',
        status: 'ACTIVA',
        createdAt: new Date().toISOString(),
        lastStampAt: new Date().toISOString()
      };
      updatedLoyaltyCards.push(newCard);
      cardCreatedInPurchase = true;
    } else {
      // Ya tiene tarjeta: se incrementa 1 sello acumulativo
      const nextStamps = (existingCard.currentStamps || 0) + 1;
      const storeRewards = (selectedStore.stampRewards && selectedStore.stampRewards.length > 0)
        ? selectedStore.stampRewards
        : (existingCard.stampRewards || [{ id: 'def_rew', stamps: Number(existingCard.stampsTarget || 6), title: existingCard.rewardTitle || 'Premio de Fidelidad', icon: '🎁' }]);
      const maxStamps = Math.max(...storeRewards.map(r => Number(r.stamps) || 6), Number(selectedStore.stampsTarget || existingCard.stampsTarget || 6));

      updatedLoyaltyCards = updatedLoyaltyCards.map(c => 
        c.storeId === selectedStore.id
          ? {
              ...c,
              cardColor: selectedStore.cardColor || c.cardColor,
              cardGradient: selectedStore.cardGradient || c.cardGradient,
              logo: selectedStore.logo || c.logo,
              stampIcon: selectedStore.stampIcon || c.stampIcon,
              stampsTarget: maxStamps,
              stampRewards: storeRewards,
              rewardTitle: selectedStore.rewardTitle || c.rewardTitle,
              currentStamps: nextStamps, // Acumulación continua para elegir cualquier premio
              lastStampAt: new Date().toISOString()
            }
          : c
      );
    }

    // Update clients
    const updatedClients = clients.map(cl => {
      if (cl.id === identifiedClient.id) {
        return {
          ...cl,
          pointsBalance: newBalance,
          storeBalances: newStoreBalances,
          loyaltyCards: updatedLoyaltyCards,
          totalSpentUsd: parseFloat(((cl.totalSpentUsd || 0) + netAmountUsd).toFixed(2))
        };
      }
      return cl;
    });

    const newMovements = [];
    if (effectiveManualDiscountPts > 0) {
      newMovements.push({
        id: `MOV-SLD-${Date.now().toString().slice(-4)}`,
        clientId: identifiedClient.id,
        type: 'SALDO_LOCAL',
        points: -effectiveManualDiscountPts,
        balanceAfter: identifiedClient.pointsBalance - effectiveManualDiscountPts,
        reference: finalRef,
        storeId: selectedStore.id,
        storeName: selectedStore.name,
        authorizedBy: selectedStore.manager || 'Cajero de Turno',
        date: currentDate,
        notes: `Saldo adicional de puntos en caja: -US$${effectiveManualDiscountUsd.toFixed(2)} (-${effectiveManualDiscountPts} pts)`
      });
    }

    newMovements.push({
      id: newMovementId,
      clientId: identifiedClient.id,
      type: 'ACREDITACION',
      points: pointsToEarn,
      balanceAfter: newBalance,
      reference: finalRef,
      storeId: selectedStore.id,
      storeName: selectedStore.name,
      authorizedBy: selectedStore.manager || 'Cajero de Turno',
      date: currentDate,
      notes: isEligible 
        ? `Compra mayor a US$25 elegible: US$${netAmountUsd.toFixed(2)} (${netAmountVes.toFixed(2)} VES)` 
        : `Compra no elegible (< US$${config.minPurchaseUsd})`
    });

    setPurchases([newPurchase, ...purchases]);
    setMovements([...newMovements, ...movements]);
    setClients(updatedClients);
    setIdentifiedClient(updatedClients.find(c => c.id === identifiedClient.id));

    // Si se aplicó un cupón de promoción o bienvenida en la venta, marcarlo como USADO en Firestore y memoria
    if (selectedSaleCoupon) {
      const usedCouponId = selectedSaleCoupon.id;
      const coupUpdate = {
        status: 'USADO',
        used: true,
        usedAt: new Date().toISOString(),
        saleReference: finalRef,
        usedAtStoreId: selectedStore.id,
        usedAtStoreName: selectedStore.name
      };
      if (db && usedCouponId) {
        try {
          setDoc(doc(db, 'redemptions', usedCouponId), { ...selectedSaleCoupon, ...coupUpdate, id: usedCouponId }, { merge: true });
        } catch (eCoup) {
          console.warn('Error actualizando cupón a USADO en Firestore:', eCoup);
        }
      }
      setRedemptions(prev => {
        const exists = (prev || []).some(r => r.id === usedCouponId);
        if (exists) return prev.map(r => r.id === usedCouponId ? { ...r, ...coupUpdate } : r);
        return [{ ...selectedSaleCoupon, ...coupUpdate, id: usedCouponId }, ...(prev || [])];
      });

      // Si fue cupón de bienvenida, actualizar estado en el cliente
      if (selectedSaleCoupon.isWelcomeCoupon && identifiedClient?.id && db) {
        try {
          updateDoc(doc(db, 'clients', identifiedClient.id), {
            hasConsumedWelcome: true,
            hasClaimedWelcomeCoupon: true,
            welcomeConsumedAt: new Date().toISOString()
          });
        } catch (eWel) {}
      }
    }

    // Show ticket
    setCompletedTicket({
      ...newPurchase,
      newBalance,
      newStoreBalance: newStorePts,
      client: identifiedClient
    });

    onNotify(
      cardCreatedInPurchase
        ? `¡Factura emitida con éxito! Se creó la Tarjeta de Fidelización de "${selectedStore.name}" con su 1er sello.`
        : (pointsToEarn > 0 
          ? `¡Factura emitida con éxito! +${pointsToEarn} pts de saldo acreditados (+1 sello de fidelización).`
          : `¡Factura emitida con éxito! (monto menor a US$${storeMinPurchase.toFixed(2)} no genera sello)`),
      'success'
    );

    // Reset form and approved QR credit
    setSelectedSaleCoupon(null);
    setAmountInput('');
    setInvoiceRef('');
    setCartItems([]);
    setShowSplitPaymentModal(false);
    setPaymentBreakdown({ cashUsd: '', cashVes: '', posDebitVes: '', pagoMovilVes: '', pagoMovilRef: '', zelleUsd: '', zelleRef: '', transferVes: '', transferRef: '' });
    setApplyLocalDiscountUsd(0);
    setApprovedQrCredit(null);
  };

  // Quick create client
  const handleCreateClient = (e) => {
    e.preventDefault();
    if (!newClientForm.name.trim() || !newClientForm.phone.trim() || !newClientForm.docId.trim()) {
      onNotify('Por favor completa nombre, teléfono y documento', 'error');
      return;
    }

    // Validar duplicados de Cédula, Correo Electrónico y Teléfono
    const dupCheck = checkDuplicateClient({
      docId: newClientForm.docId,
      email: newClientForm.email,
      phone: newClientForm.phone,
      name: newClientForm.name
    }, clients);

    if (dupCheck.isDuplicate) {
      const existing = dupCheck.existingClient;
      if (existing) {
        setIdentifiedClient(existing);
        setShowNewClientModal(false);
        setNewClientForm({ name: '', phone: '', docId: '', email: '' });
        onNotify(`${dupCheck.message} Seleccionado automáticamente para el cobro.`, 'info');
      } else {
        onNotify(dupCheck.message, 'error');
      }
      return;
    }

    const newClient = {
      id: `CLI-0${clients.length + 1}`,
      name: newClientForm.name.trim(),
      phone: newClientForm.phone.trim(),
      email: newClientForm.email.trim() || `${newClientForm.name.toLowerCase().replace(/\s+/g, '.')}@email.com`,
      docId: newClientForm.docId.trim().toUpperCase(),
      tier: 'Bronce',
      pointsBalance: 0,
      storeBalances: (stores || []).reduce((acc, st) => ({ ...acc, [st.id]: 0 }), {}),
      pointsExpiringSoon: 0,
      expiringDate: null,
      joinDate: new Date().toISOString().split('T')[0],
      qrCode: `FIDELY-${newClientForm.docId.trim().toUpperCase()}`,
      status: 'ACTIVO',
      totalSpentUsd: 0
    };

    setClients([...clients, newClient]);
    setIdentifiedClient(newClient);
    setShowNewClientModal(false);
    setNewClientForm({ name: '', phone: '', docId: '', email: '' });
    onNotify(`Cliente ${newClient.name} registrado con éxito`, 'success');
  };

  // Direct redemption at POS (RN-08: Acumulación y canje independiente por local)
  const handleRedeemAtPOS = (reward) => {
    if (!identifiedClient) {
      onNotify('Identifica al cliente para procesar el canje', 'error');
      return;
    }
    const storeAvailablePts = (identifiedClient.storeBalances && identifiedClient.storeBalances[selectedStore.id]) || 0;
    if (storeAvailablePts < config.minRedemptionPoints) {
      onNotify(`El cliente debe acumular un mínimo de ${config.minRedemptionPoints} puntos en este local para canjear (RN-08). Saldo en ${selectedStore.name}: ${storeAvailablePts} pts`, 'error');
      return;
    }
    if (storeAvailablePts < reward.pointsCost) {
      onNotify(`Saldo insuficiente en este local (${selectedStore.name}): tiene ${storeAvailablePts} pts acumulados aquí vs ${reward.pointsCost} requeridos`, 'error');
      return;
    }

    const newStorePts = storeAvailablePts - reward.pointsCost;
    const newStoreBalances = {
      ...(identifiedClient.storeBalances || {}),
      [selectedStore.id]: newStorePts
    };
    const newBalance = Math.max(0, identifiedClient.pointsBalance - reward.pointsCost);
    const voucherCode = `CANJE-${Math.floor(10000 + Math.random() * 90000)}`;
    const currentDate = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const newRedemption = {
      id: `RED-${Date.now().toString().slice(-4)}`,
      voucherCode,
      clientId: identifiedClient.id,
      clientName: identifiedClient.name,
      rewardId: reward.id,
      rewardTitle: reward.title,
      pointsCost: reward.pointsCost,
      nominalValueUsd: reward.nominalValueUsd,
      status: 'USADO',
      dateGenerated: currentDate,
      dateUsed: currentDate,
      storeId: selectedStore.id,
      storeName: selectedStore.name,
      authorizedBy: selectedStore.manager || 'Cajero'
    };

    const newMovement = {
      id: `MOV-${Date.now().toString().slice(-4)}`,
      clientId: identifiedClient.id,
      type: 'CANJE',
      points: -reward.pointsCost,
      balanceAfter: newBalance,
      reference: voucherCode,
      storeId: selectedStore.id,
      storeName: selectedStore.name,
      authorizedBy: selectedStore.manager || 'Cajero',
      date: currentDate,
      notes: `Canje en ${selectedStore.name}: ${reward.title} (-${reward.pointsCost} pts en este local)`
    };

    const updatedClients = clients.map(cl => 
      cl.id === identifiedClient.id ? { ...cl, pointsBalance: newBalance, storeBalances: newStoreBalances } : cl
    );

    setClients(updatedClients);
    setIdentifiedClient(updatedClients.find(c => c.id === identifiedClient.id));
    setRedemptions([newRedemption, ...redemptions]);
    setMovements([newMovement, ...movements]);

    onNotify(`¡Canje aprobado! Se descontaron ${reward.pointsCost} puntos en "${selectedStore.name}" por "${reward.title}"`, 'success');
  };

  // Submit custom store reward proposal to Admin for approval
  const handleSubmitRewardProposal = (e) => {
    e.preventDefault();
    if (!rewardProposalForm.title.trim()) {
      onNotify('Por favor indica el nombre del beneficio o recompensa.', 'error');
      return;
    }
    const minPts = config.minRedemptionPoints || 100;
    const pts = parseInt(rewardProposalForm.pointsCost, 10) || 100;
    if (pts < minPts) {
      onNotify(`El costo mínimo según la Regla RN-08 es de ${minPts} puntos (US$${(minPts * (config.pointValueUsd || 0.05)).toFixed(2)}).`, 'error');
      return;
    }

    const calculatedUsd = parseFloat(rewardProposalForm.nominalValueUsd) || (pts * (config.pointValueUsd || 0.05));
    const stampsCostParsed = parseInt(rewardProposalForm.stampsCost, 10) || 6;

    const newReward = {
      id: `REW-${Date.now().toString(36).toUpperCase()}`,
      title: rewardProposalForm.title.trim(),
      description: rewardProposalForm.description.trim() || `Beneficio exclusivo en ${safeStore.name}`,
      category: rewardProposalForm.category || 'Cortesía',
      pointsCost: pts,
      stampsCost: stampsCostParsed,
      nominalValueUsd: parseFloat(calculatedUsd.toFixed(2)),
      validityDays: parseInt(rewardProposalForm.validityDays, 10) || 30,
      availableStock: parseInt(rewardProposalForm.availableStock, 10) || 50,
      applicableStores: [safeStore.id],
      createdStoreId: safeStore.id,
      createdStoreName: safeStore.name,
      status: 'PENDIENTE', // Sent to System Admin for approval
      createdAt: new Date().toISOString(),
      iconName: 'Gift'
    };

    if (typeof setRewards === 'function') {
      setRewards(prev => [...prev, newReward]);
    }
    saveReward(newReward).catch(err => console.warn('[Firebase] Error guardando propuesta de recompensa:', err));
    onNotify(`¡Propuesta enviada con éxito! La recompensa "${newReward.title}" quedó en estado PENDIENTE de aprobación por el Administrador.`, 'success');
    setShowProposeRewardModal(false);
    setRewardProposalForm({
      title: '',
      description: '',
      category: 'Cortesía',
      pointsCost: 100,
      stampsCost: 6,
      nominalValueUsd: 6.00,
      validityDays: 30,
      availableStock: 50
    });
    setRewardSubTab('STORE_CATALOG');
  };

  // Process Return / Refund (RN-07)
  const handleProcessReturn = (e) => {
    e.preventDefault();
    if (!returnModalPurchase) return;

    const purchase = returnModalPurchase;
    const isTotal = returnType === 'TOTAL';
    const retAmountNum = isTotal ? purchase.amountUsd : parseFloat(returnAmount);

    if (isNaN(retAmountNum) || retAmountNum <= 0 || retAmountNum > purchase.amountUsd) {
      onNotify('Monto a devolver inválido o superior al monto de la compra', 'error');
      return;
    }

    const pointsToRevert = isTotal 
      ? purchase.pointsEarned 
      : Math.floor(purchase.pointsEarned * (retAmountNum / purchase.amountUsd));

    const clientToUpdate = clients.find(c => c.id === purchase.clientId);
    const newBalance = Math.max(0, (clientToUpdate?.pointsBalance || 0) - pointsToRevert);
    const currentDate = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const updatedPurchases = purchases.map(p => {
      if (p.id === purchase.id) {
        return {
          ...p,
          status: isTotal ? 'DEVUELTA' : 'DEVUELTA_PARCIAL',
          notes: `${isTotal ? 'Devolución total' : `Devolución parcial de $${retAmountNum}`}: ${returnReason}`
        };
      }
      return p;
    });

    const targetStoreId = purchase.storeId || selectedStore.id;
    const updatedClients = clients.map(c => {
      if (c.id === purchase.clientId) {
        const curStorePts = (c.storeBalances && c.storeBalances[targetStoreId]) || 0;
        const newStoreBalances = {
          ...(c.storeBalances || {}),
          [targetStoreId]: Math.max(0, curStorePts - pointsToRevert)
        };
        return { ...c, pointsBalance: newBalance, storeBalances: newStoreBalances };
      }
      return c;
    });

    const newMovement = {
      id: `MOV-${Date.now().toString().slice(-4)}`,
      clientId: purchase.clientId,
      type: 'REVERSION_DEVOLUCION',
      points: -pointsToRevert,
      balanceAfter: newBalance,
      reference: `DEV-${purchase.reference}`,
      storeId: selectedStore.id,
      storeName: selectedStore.name,
      authorizedBy: selectedStore.manager || 'Encargado de Tienda',
      date: currentDate,
      notes: `Reversión proporcional por ${returnReason} ($${retAmountNum} USD devueltos)`
    };

    setPurchases(updatedPurchases);
    setClients(updatedClients);
    if (identifiedClient && identifiedClient.id === purchase.clientId) {
      setIdentifiedClient(updatedClients.find(c => c.id === purchase.clientId));
    }
    setMovements([newMovement, ...movements]);

    setReturnModalPurchase(null);
    setReturnAmount('');
    onNotify(`Devolución procesada. Se revirtieron ${pointsToRevert} puntos del cliente.`, 'success');
  };

  // Shift & Store Summary Calculations
  const safeStorePurchases = purchases.filter(p => isMatchStore(p.storeId, safeStore.id, p.storeName, safeStore.name));
  const validStorePurchases = safeStorePurchases.filter(p => p.status === 'VALIDADA');
  const shiftTotalUsd = validStorePurchases.reduce((sum, p) => sum + (p.netAmountUsd || p.amountUsd), 0);
  const shiftTotalVes = shiftTotalUsd * config.vesExchangeRate;
  const shiftPointsIssued = validStorePurchases.reduce((sum, p) => sum + (p.pointsEarned || 0), 0);
  const safeStoreRedemptions = redemptions.filter(r => isMatchStore(r.storeId, safeStore.id, r.storeName, safeStore.name));
  const shiftRedemptionsCount = safeStoreRedemptions.length;
  const shiftUniqueClientsCount = new Set(validStorePurchases.map(p => p.clientId)).size;

  const filteredShiftPurchases = safeStorePurchases.filter(p => {
    if (!shiftSearchQuery.trim()) return true;
    const q = shiftSearchQuery.toLowerCase();
    return (
      (p.reference && p.reference.toLowerCase().includes(q)) ||
      (p.clientName && p.clientName.toLowerCase().includes(q)) ||
      (p.clientId && p.clientId.toLowerCase().includes(q))
    );
  });

  const counterQrUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/?store=${safeStore.id}&action=redeem` 
    : `https://fidelyclub.net/?store=${safeStore.id}&action=redeem`;

  const cashierDisplayName = currentUser?.name || safeStore.manager || 'Cajero en Turno';
  const cashierInitials = cashierDisplayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const todayDateStr = new Date().toLocaleDateString('es-VE', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });

  const navModules = [
    { id: 'CARD_SETUP', label: 'Tarjeta de Fidelidad', icon: Palette, desc: 'Diseño, sellos y premios' },
    { id: 'REGISTER_SALE', label: 'Registrar Venta', icon: Receipt, desc: 'Cobro y facturación en caja' },
    { id: 'PENDING_REQUESTS', label: 'Solicitudes QR', icon: Clock, badge: pendingRedemptionsForStore.length, desc: 'Aprobación de sellos en vivo' },
    { id: 'PROMOTIONS', label: 'Promociones Push', icon: Megaphone, badge: clientsWithStoreCard.length > 0 ? `${clientsWithStoreCard.length}` : null, desc: 'Difusión a clientes fidelizados' },
    { id: 'PRODUCTS_CATALOG', label: 'Catálogo & Precios', icon: Package, desc: 'Productos, servicios e IVA', desktopOnly: true },
    { id: 'QR_DISPLAY', label: 'QR de Mostrador', icon: QrCode, desc: 'Display y cartel acrílico' },
    { id: 'SHIFT_SUMMARY', label: 'Cuadre de Turno', icon: BarChart3, desc: 'Facturación e historial', desktopOnly: true },
    {
      id: 'MEMBERSHIP',
      label: 'Membresía fidely PRO',
      icon: CreditCard,
      badge: isSubscriptionBlocked ? 'Requerida' : null,
      desc: 'Pago mensual y plan'
    }
  ];

  return (
    <div className="pos-terminal-container">
      {/* =========================================================================
          ÁREA POS MÓVIL (MODO MOSTRADOR SIMPLIFICADO & ULTRA INTUITIVO)
          Diseñado exclusivamente para teléfonos móviles y atención en mostrador:
          1) Mostrar QR de Mostrador al cliente
          2) Recibir y aprobar solicitudes de sellos y canjes en tiempo real
          ========================================================================= */}
      {isMobilePosMode ? (
        <div className="pos-mobile-workstation" style={{
          width: '100%',
          minHeight: '100vh',
          minHeight: '100dvh',
          background: '#FAF8F5',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          paddingBottom: '30px'
        }}>
          {/* Top Sticky Bar */}
          <header style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            background: '#FFFFFF',
            borderBottom: '1px solid var(--border-subtle, #EDE2D5)',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
              <StoreLogoBadge store={currentStoreObj || safeStore} size={38} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h2 style={{
                    fontSize: '0.98rem',
                    fontWeight: 800,
                    color: 'var(--text-main, #1C1917)',
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {safeStore.name}
                  </h2>
                  <span style={{
                    background: 'linear-gradient(135deg, #70092B 0%, #9C382A 100%)',
                    color: '#FFFFFF',
                    borderRadius: '9999px',
                    padding: '1px 7px',
                    fontSize: '0.62rem',
                    fontWeight: 900,
                    flexShrink: 0
                  }}>
                    POS Móvil
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #78716C)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {safeStore.city || 'Sede'} • {cashierDisplayName}
                </div>
              </div>
            </div>

            {/* Botón Salir a Panel Completo */}
            <button
              type="button"
              onClick={() => {
                setIsMobilePosMode(false);
                try { localStorage.setItem('fidely_pos_mobile_mode', 'false'); } catch (e) {}
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '9999px',
                background: '#FAF8F5',
                color: 'var(--c-primary, #9C382A)',
                border: '1.5px solid rgba(156, 56, 42, 0.25)',
                fontWeight: 800,
                fontSize: '0.74rem',
                cursor: 'pointer',
                flexShrink: 0,
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
              }}
              title="Volver a la vista completa de escritorio con todos los módulos"
            >
              <span>🖥️ Panel Completo</span>
            </button>
          </header>

          {/* Banner de Membresía en Modo Móvil */}
          {isSubscriptionBlocked && (
            <div style={{
              margin: '10px 14px 0',
              padding: '10px 14px',
              borderRadius: '12px',
              background: '#FFFBEB',
              border: '1px solid #FCD34D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px'
            }}>
              <div style={{ fontSize: '0.74rem', color: '#92400E', fontWeight: 700 }}>
                ⚠️ Modo Demostración: Requiere membresía para aprobar sellos.
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMobilePosMode(false);
                  setActiveTab('MEMBERSHIP');
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #70092B 0%, #9C382A 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Activar $5
              </button>
            </div>
          )}

          {/* Selector de Pestañas Móviles (Grandes y Táctiles) */}
          <div style={{ padding: '12px 14px 6px', maxWidth: '560px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
              background: '#FFFFFF',
              padding: '5px',
              borderRadius: '16px',
              border: '1px solid var(--border-subtle, #EDE2D5)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <button
                type="button"
                onClick={() => setMobilePosTab('QR')}
                style={{
                  padding: '11px 8px',
                  borderRadius: '12px',
                  border: 'none',
                  background: mobilePosTab === 'QR' ? 'linear-gradient(135deg, #70092B 0%, #9C382A 100%)' : 'transparent',
                  color: mobilePosTab === 'QR' ? '#FFFFFF' : '#475569',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: mobilePosTab === 'QR' ? '0 3px 10px rgba(112, 9, 43, 0.28)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <QrCode size={18} />
                <span>Mostrar QR</span>
              </button>

              <button
                type="button"
                onClick={() => setMobilePosTab('REQUESTS')}
                style={{
                  padding: '11px 8px',
                  borderRadius: '12px',
                  border: 'none',
                  background: mobilePosTab === 'REQUESTS' ? 'linear-gradient(135deg, #70092B 0%, #9C382A 100%)' : 'transparent',
                  color: mobilePosTab === 'REQUESTS' ? '#FFFFFF' : '#475569',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: mobilePosTab === 'REQUESTS' ? '0 3px 10px rgba(112, 9, 43, 0.28)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <Bell size={18} />
                <span>Solicitudes</span>
                {pendingRedemptionsForStore.length > 0 && (
                  <span style={{
                    background: '#EF4444',
                    color: '#FFFFFF',
                    borderRadius: '9999px',
                    padding: '1px 7px',
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    marginLeft: '2px',
                    boxShadow: '0 0 6px rgba(239, 68, 68, 0.6)'
                  }}>
                    {pendingRedemptionsForStore.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Contenido Principal de POS Móvil */}
          <main style={{ padding: '8px 14px 20px', maxWidth: '560px', width: '100%', margin: '0 auto', boxSizing: 'border-box', flex: 1 }}>

            {/* TAB 1: MOSTRAR QR DE MOSTRADOR */}
            {mobilePosTab === 'QR' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{
                  background: '#FFFFFF',
                  borderRadius: '24px',
                  padding: '24px 18px',
                  textAlign: 'center',
                  border: '1.5px solid var(--border-subtle, #EDE2D5)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                }}>
                  {/* Encabezado con Mascota Fidely Amigable (Alejada del QR para escaneo perfecto) */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    marginBottom: '14px'
                  }}>
                    <img
                      src="/fidely_mascot.png"
                      alt="Mascota Fidely"
                      style={{
                        width: '62px',
                        height: 'auto',
                        filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.14))'
                      }}
                    />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        background: 'var(--c-secondary-soft, #FAF8F5)',
                        color: 'var(--c-primary, #9C382A)',
                        fontWeight: 800,
                        fontSize: '0.72rem'
                      }}>
                        <Store size={13} />
                        <span>Mostrador • {safeStore.name}</span>
                      </div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-main, #1C1917)', margin: '4px 0 0' }}>
                        QR Oficial para Clientes
                      </h3>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted, #78716C)', margin: '0 auto 16px', maxWidth: '340px', lineHeight: 1.45 }}>
                    Muestra este código al cliente para que lo escanee desde su celular. Podrá sumar sellos o solicitar canjes de premios al instante.
                  </p>

                  {/* Visual QR Code Display (100% Despejado, sin elementos superpuestos) */}
                  <div style={{ display: 'inline-block', margin: '0 auto 14px' }}>
                    <div style={{
                      background: '#FFFFFF',
                      padding: '16px',
                      borderRadius: '22px',
                      border: '2.5px solid rgba(112, 9, 43, 0.25)',
                      boxShadow: '0 8px 26px rgba(112, 9, 43, 0.1)'
                    }}>
                      <QRCodeDisplay
                        value={counterQrUrl}
                        size={210}
                        darkColor="#70092B"
                        lightColor="#FFFFFF"
                      />
                      <div style={{ marginTop: '10px', fontSize: '0.75rem', fontWeight: 900, color: '#70092B', letterSpacing: '0.06em' }}>
                        ESCANEAME EN CAJA
                      </div>
                    </div>
                  </div>

                  {/* Botones de Acción Rápida & Impresión */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxWidth: '380px', margin: '0 auto 12px' }}>
                    <button
                      type="button"
                      onClick={() => setShowPrintStandModal(true)}
                      style={{
                        gridColumn: 'span 2',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #70092B 0%, #9C382A 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(112, 9, 43, 0.25)'
                      }}
                      title="Ver e imprimir afiche/hablador para colocar en caja"
                    >
                      <Printer size={16} />
                      <span>🖨️ Imprimir Cartel / Hablador para Caja</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsQrFullScreen(true)}
                      style={{
                        padding: '9px 12px',
                        borderRadius: '12px',
                        background: '#FAF8F5',
                        color: 'var(--text-main, #1C1917)',
                        border: '1px solid var(--border-subtle, #EDE2D5)',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <Maximize2 size={14} />
                      <span>Pantalla Completa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(counterQrUrl);
                        onNotify('¡Enlace de mostrador copiado al portapapeles!', 'success');
                      }}
                      style={{
                        padding: '9px 12px',
                        borderRadius: '12px',
                        background: '#FAF8F5',
                        color: 'var(--text-main, #1C1917)',
                        border: '1px solid var(--border-subtle, #EDE2D5)',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <Copy size={14} />
                      <span>Copiar Link</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => window.open(counterQrUrl, '_blank')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--c-primary, #9C382A)',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      <ExternalLink size={12} />
                      <span>Probar vista del cliente en otra pestaña</span>
                    </button>
                  </div>
                </div>

                {/* Info Card de Funcionamiento */}
                <div style={{
                  background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                  borderRadius: '18px',
                  padding: '14px 16px',
                  border: '1px solid #BFDBFE',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#2563EB',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <BellRing size={16} />
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#1E3A8A', lineHeight: 1.45 }}>
                    <strong>¿Qué sucede al escanear?</strong><br />
                    En cuanto tu cliente apunte su cámara a este código, sonará un timbre y su solicitud de <strong>+1 Sello</strong> o <strong>Canje</strong> aparecerá en la pestaña de <strong>Solicitudes</strong> para que la apruebes con un toque.
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: RECIBIR Y APROBAR SOLICITUDES EN TIEMPO REAL */}
            {mobilePosTab === 'REQUESTS' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {pendingRedemptionsForStore.length === 0 ? (
                  /* Estado Vacío / Esperando Escaneos */
                  <div style={{
                    background: '#FFFFFF',
                    borderRadius: '24px',
                    padding: '36px 20px',
                    textAlign: 'center',
                    border: '1.5px solid var(--border-subtle, #EDE2D5)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
                  }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'rgba(112, 9, 43, 0.08)',
                      color: 'var(--c-primary, #70092B)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px'
                    }}>
                      <Clock size={32} />
                    </div>

                    <h3 style={{ fontSize: '1.18rem', fontWeight: 900, color: 'var(--text-main, #1C1917)', margin: '0 0 6px' }}>
                      Esperando clientes en mostrador...
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted, #78716C)', margin: '0 auto 20px', maxWidth: '340px', lineHeight: 1.45 }}>
                      Muestra tu código QR en caja. En cuanto un cliente lo escanee con su teléfono, escucharás una alerta sonora y aparecerá aquí su solicitud para aprobarla de inmediato.
                    </p>

                    <button
                      type="button"
                      onClick={() => setMobilePosTab('QR')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '7px',
                        padding: '11px 22px',
                        borderRadius: '9999px',
                        background: 'linear-gradient(135deg, #70092B 0%, #9C382A 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        fontWeight: 800,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        boxShadow: '0 3px 12px rgba(112, 9, 43, 0.28)'
                      }}
                    >
                      <QrCode size={16} />
                      <span>Mostrar QR al Cliente →</span>
                    </button>
                  </div>
                ) : (
                  /* Lista de Solicitudes Pendientes */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#FEF3C7',
                      border: '1.5px solid #FCD34D',
                      padding: '10px 14px',
                      borderRadius: '16px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          background: '#D97706',
                          color: '#FFFFFF',
                          borderRadius: '9999px',
                          padding: '2px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 900
                        }}>
                          {pendingRedemptionsForStore.length}
                        </span>
                        <span style={{ fontWeight: 800, fontSize: '0.84rem', color: '#92400E' }}>
                          Esperando tu aprobación en caja:
                        </span>
                      </div>
                      <span style={{ fontSize: '0.70rem', color: '#B45309', fontWeight: 700 }}>
                        En Vivo 🟢
                      </span>
                    </div>

                    {pendingRedemptionsForStore.map(req => {
                      const reqClient = clients.find(c => 
                        c.id === req.clientId || 
                        (c.cedula && req.clientDocId && String(c.cedula).trim() === String(req.clientDocId).trim())
                      );
                      const clientCard = (reqClient?.loyaltyCards || []).find(c => isMatchStore(c.storeId, safeStore.id, c.storeName, safeStore.name));
                      const currentStamps = clientCard ? Number(clientCard.currentStamps || 0) : Number(req.currentStamps || 0);
                      const targetStamps = clientCard ? Number(clientCard.stampsTarget || safeStore.stampsTarget || 6) : Number(req.stampsTarget || safeStore.stampsTarget || 6);
                      const isRewardClaim = req.type === 'STAMP_REWARD_CLAIM' || 
                        req.isRewardClaim === true || 
                        req.claimType === 'REWARD' ||
                        (Boolean(req.rewardTitle) && !req.rewardTitle.includes('+1 Sello') && req.isStampRequest !== true && req.type !== 'STAMP_REQUEST');
                      const isStamp = !isRewardClaim && (req.type === 'STAMP_REQUEST' || req.isStampRequest === true || req.rewardTitle?.includes('+1 Sello'));

                      return (
                        <div
                          key={req.id}
                          style={{
                            background: isRewardClaim ? '#F0FDF4' : '#FFFFFF',
                            borderRadius: '20px',
                            padding: '18px 16px',
                            border: isRewardClaim ? '2px solid #22C55E' : '1.5px solid var(--border-subtle, #EDE2D5)',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                          }}
                        >
                          {/* Client Header Info */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: '50%',
                              background: isRewardClaim 
                                ? 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)' 
                                : 'linear-gradient(135deg, #70092B 0%, #DE8B76 100%)',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 900,
                              fontSize: isRewardClaim ? '1.4rem' : '1.05rem',
                              flexShrink: 0,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}>
                              {isRewardClaim ? '🎁' : (req.clientName?.slice(0, 2).toUpperCase() || 'CL')}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: '0.96rem', color: 'var(--text-main, #1C1917)' }}>
                                  {req.clientName}
                                </strong>
                                {req.clientDocId && (
                                  <span style={{
                                    background: 'var(--c-secondary-soft, #FAF8F5)',
                                    color: 'var(--c-primary, #9C382A)',
                                    fontSize: '0.70rem',
                                    fontWeight: 800,
                                    padding: '1px 6px',
                                    borderRadius: '6px'
                                  }}>
                                    C.I: {req.clientDocId}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.70rem', color: 'var(--text-dim, #A8A29E)', marginTop: '2px' }}>
                                {req.dateGenerated || req.date || 'Hace un momento'}
                              </div>
                            </div>
                          </div>

                          {/* Request Details: Stamp vs Reward */}
                          {isRewardClaim ? (
                            <div style={{
                              background: '#DCFCE7',
                              borderRadius: '12px',
                              padding: '10px 12px',
                              border: '1px solid #86EFAC'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.92rem', fontWeight: 900, color: '#166534' }}>
                                <span>🎁 Premio Solicitado:</span>
                                <span>{req.rewardTitle}</span>
                              </div>
                              <div style={{ fontSize: '0.76rem', color: '#15803D', marginTop: '3px' }}>
                                Costo: <strong>{req.stampsCost || targetStamps} sellos</strong> • Acumulados: <strong>{currentStamps} sellos</strong>
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#166534', fontWeight: 800, marginTop: '4px' }}>
                                👉 Al presionar Aprobar, entrégale el premio físico al cliente.
                              </div>
                            </div>
                          ) : (
                            <div style={{
                              background: '#FAF8F5',
                              borderRadius: '12px',
                              padding: '10px 12px',
                              border: '1px solid var(--border-subtle, #EDE2D5)'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--c-primary, #70092B)' }}>
                                  📍 Solicitud de +1 Sello Digital
                                </div>
                                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#92400E' }}>
                                  {currentStamps} de {targetStamps} sellos
                                </div>
                              </div>

                              {/* Stamp Dots */}
                              <div style={{ display: 'flex', gap: '5px', marginTop: '8px' }}>
                                {Array.from({ length: targetStamps }).map((_, sIdx) => {
                                  const isFilled = sIdx < currentStamps;
                                  const isNext = sIdx === currentStamps;
                                  return (
                                    <div
                                      key={sIdx}
                                      style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        background: isFilled ? 'var(--c-primary, #70092B)' : isNext ? '#FEF3C7' : '#F3F4F6',
                                        border: isNext ? '2px dashed #F59E0B' : '1px solid #E5E7EB',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '11px',
                                        color: isFilled ? '#FFF' : '#92400E',
                                        fontWeight: 800
                                      }}
                                    >
                                      {isFilled ? '✓' : isNext ? '+1' : sIdx + 1}
                                    </div>
                                  );
                                })}
                              </div>

                              {currentStamps + 1 >= targetStamps && (
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#B45309', marginTop: '6px' }}>
                                  🎉 ¡Al aprobar completará su tarjeta y ganará su premio!
                                </div>
                              )}
                            </div>
                          )}

                          {/* Large Touch-friendly Action Buttons */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', marginTop: '4px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (isRewardClaim) {
                                  handleRejectStampRewardClaim(req);
                                } else if (isStamp) {
                                  handleRejectStampRequest(req);
                                } else {
                                  setSelectedPendingRedemption(req);
                                  setShowRejectForm(true);
                                }
                              }}
                              style={{
                                padding: '12px 10px',
                                borderRadius: '12px',
                                background: '#FFF1F2',
                                color: '#E11D48',
                                border: '1.5px solid #FECDD3',
                                fontWeight: 800,
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              ✕ Rechazar
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (isRewardClaim) {
                                  handleApproveStampRewardClaim(req);
                                } else if (isStamp) {
                                  handleApproveStampRequest(req);
                                } else {
                                  handleApprovePendingRedemption(req);
                                }
                              }}
                              style={{
                                padding: '12px 14px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                                color: '#FFFFFF',
                                border: 'none',
                                fontWeight: 900,
                                fontSize: '0.88rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                boxShadow: '0 3px 12px rgba(22, 163, 74, 0.35)'
                              }}
                            >
                              <CheckCircle2 size={18} />
                              <span>{isRewardClaim ? '🎁 Entregar Premio' : '✓ Aprobar +1 Sello'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </main>

          {/* Quick Floating Footer Utilities */}
          <footer style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 30,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            borderTop: '1px solid var(--border-subtle, #EDE2D5)',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            maxWidth: '560px',
            width: '100%',
            margin: '0 auto',
            boxSizing: 'border-box'
          }}>
            <button
              type="button"
              onClick={() => setShowPosCameraScanner(true)}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '12px',
                background: '#FAF8F5',
                color: 'var(--text-main, #1C1917)',
                border: '1px solid var(--border-subtle, #EDE2D5)',
                fontWeight: 800,
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Camera size={15} color="var(--c-primary, #9C382A)" />
              <span>Escanear Tarjeta de Cliente</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsMobilePosMode(false);
                try { localStorage.setItem('fidely_pos_mobile_mode', 'false'); } catch (e) {}
              }}
              style={{
                padding: '9px 14px',
                borderRadius: '12px',
                background: 'transparent',
                color: 'var(--text-muted, #78716C)',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.76rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Salir
            </button>
          </footer>

          {/* MODAL PANTALLA COMPLETA PARA EL CÓDIGO QR */}
          {isQrFullScreen && (
            <div
              onClick={() => setIsQrFullScreen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                background: '#0F172A',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                boxSizing: 'border-box'
              }}
            >
              <button
                type="button"
                onClick={() => setIsQrFullScreen(false)}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={22} />
              </button>

              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ color: '#FCD34D', fontSize: '0.80rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Mostrador Oficial
                </div>
                <h2 style={{ color: '#FFFFFF', fontSize: '1.4rem', fontWeight: 900, margin: '4px 0 0' }}>
                  {safeStore.name}
                </h2>
              </div>

              <div style={{
                background: '#FFFFFF',
                padding: '24px',
                borderRadius: '28px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                <QRCodeDisplay
                  value={counterQrUrl}
                  size={270}
                  darkColor="#080018"
                  lightColor="#FFFFFF"
                />
                <div style={{ marginTop: '12px', fontSize: '0.85rem', fontWeight: 900, color: 'var(--c-primary, #70092B)', letterSpacing: '0.08em' }}>
                  ESCANEAME EN CAJA
                </div>
              </div>

              <div style={{ color: '#94A3B8', fontSize: '0.82rem', marginTop: '22px', textAlign: 'center', maxWidth: '300px' }}>
                Apunta la pantalla hacia el cliente para que escanee con su cámara
              </div>

              <button
                type="button"
                onClick={() => setIsQrFullScreen(false)}
                style={{
                  marginTop: '18px',
                  padding: '8px 18px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ✕ Cerrar Pantalla Completa
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
      {/* Mobile Drawer Backdrop */}
      {isSidebarOpen && (
        <div 
          className="pos-sidebar-backdrop" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 1. DEDICATED POS SIDEBAR */}
      <aside className={`pos-sidebar ${isSidebarOpen ? 'is-open' : ''}`}>
        {/* Brand Header */}
        <div className="pos-sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src="/fidely.png" alt="fidely" style={{ width: '26px', height: '26px', objectFit: 'contain' }} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
                    fidely
                  </span>
                  <span style={{
                    fontSize: '0.58rem',
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #DE8B76 0%, #9C382A 100%)',
                    color: '#FFFFFF',
                    padding: '1px 5px',
                    borderRadius: '5px',
                    letterSpacing: '0.04em'
                  }}>
                    POS
                  </span>
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Terminal de Punto de Venta
                </div>
              </div>
            </div>

            {/* Botón para cerrar sidebar en móvil */}
            <button
              type="button"
              className="pos-sidebar-close-btn"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Cerrar Menú"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Active Store Chip & Branch Selector */}
        <div className="pos-sidebar-store-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 800 }}>
              Comercio Activo
            </span>
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: onOpenFirebaseModal ? 'pointer' : 'default' }}
              onClick={onOpenFirebaseModal}
              title="Estado de sincronización en la nube"
            >
              <span className="pos-pulse-dot" />
              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#15803D' }}>En Línea</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <StoreLogoBadge store={currentStoreObj} size={34} showCategoryBadge={false} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>
                {currentStoreObj.name}
              </div>
              <div style={{ fontSize: '0.64rem', color: 'var(--c-primary)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentStoreObj.category || 'Boutique / Comercio'}
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 7px',
            borderRadius: '7px',
            background: '#FFFFFF',
            border: '1px solid #EEDCD5',
            marginBottom: '6px',
            fontSize: '0.66rem'
          }}>
            <span style={{ fontSize: '0.74rem' }}>📍</span>
            <span style={{ fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentStoreObj.city || 'Caracas'}{currentStoreObj.address ? ` • ${currentStoreObj.address}` : ''}
            </span>
          </div>

          <div 
            onClick={() => {
              setShowStoreProfileModal(true);
              setIsSidebarOpen(false);
            }}
            style={{
              padding: '4px 8px',
              borderRadius: '7px',
              background: isCardConfigured ? '#F0FDF4' : '#FFFBEB',
              border: `1px solid ${isCardConfigured ? '#BBF7D0' : '#FDE68A'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
            title="Configurar diseño de tarjeta de sellos y recompensas"
          >
            <span style={{ fontSize: '0.66rem', fontWeight: 800, color: isCardConfigured ? '#166534' : '#92400E' }}>
              {isCardConfigured ? '🎯 Tarjeta Configurada' : '🎨 Diseñar Tarjeta'}
            </span>
            <span style={{ fontSize: '0.62rem', color: isCardConfigured ? '#166534' : '#92400E', fontWeight: 700, textDecoration: 'underline' }}>
              Editar ➔
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="pos-sidebar-nav">
          <div style={{ fontSize: '0.60rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 6px 2px' }}>
            Módulos del Terminal
          </div>
          {navModules.map(mod => {
            const Icon = mod.icon;
            const isActive = activeTab === mod.id;
            return (
              <button
                key={mod.id}
                type="button"
                className={`pos-nav-btn ${isActive ? 'is-active' : ''} ${mod.desktopOnly ? 'hide-on-mobile' : ''}`}
                style={mod.isMobileCta ? {
                  background: 'linear-gradient(135deg, rgba(112, 9, 43, 0.08) 0%, rgba(156, 56, 42, 0.08) 100%)',
                  border: '1.5px solid rgba(112, 9, 43, 0.25)',
                  marginBottom: '6px'
                } : undefined}
                onClick={() => {
                  if (mod.id === 'MOBILE_POS') {
                    setIsMobilePosMode(true);
                    try { localStorage.setItem('fidely_pos_mobile_mode', 'true'); } catch (e) {}
                    setIsSidebarOpen(false);
                    return;
                  }
                  setActiveTab(mod.id);
                  setIsSidebarOpen(false);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                  <div className={`pos-nav-icon ${isActive ? 'is-active' : ''}`}>
                    <Icon size={15} strokeWidth={isActive ? 2.1 : 1.6} />
                  </div>
                  <div style={{ textAlign: 'left', minWidth: 0, flex: 1 }}>
                    <div className="pos-nav-title">{mod.label}</div>
                    <div className="pos-nav-desc">{mod.desc}</div>
                  </div>
                </div>

                {Boolean(mod.badge) && (
                  <span className="pos-nav-badge" style={typeof mod.badge === 'string' ? { background: '#EF4444', color: '#FFFFFF', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '6px' } : undefined}>
                    {mod.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Botón de Guía y Beneficios para el Comercio */}
          <div style={{ padding: '4px 2px 0', marginTop: 'auto' }}>
            <button
              type="button"
              onClick={() => {
                setShowStoreOnboarding(true);
                setIsSidebarOpen(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '6px 8px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(222, 139, 118, 0.12) 0%, rgba(156, 56, 42, 0.05) 100%)',
                border: '1px solid rgba(222, 139, 118, 0.28)',
                color: 'var(--c-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
              title="Aprende cómo funciona tu tarjeta de sellos digital, aprobación de QR y beneficios"
            >
              <div style={{
                width: '22px',
                height: '22px',
                borderRadius: '6px',
                background: '#FFFFFF',
                border: '1px solid #EEDCD5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Sparkles size={12} color="var(--c-primary)" />
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: '0.70rem', fontWeight: 500, color: 'var(--text-main)', lineHeight: 1.15 }}>
                  Guía del Comercio
                </div>
                <div style={{ fontSize: '0.58rem', color: 'var(--c-primary)', fontWeight: 500 }}>
                  Ver funcionamiento ➔
                </div>
              </div>
            </button>
          </div>
        </nav>

        {/* Sidebar Footer: BCV Rate & Cashier Shift Card */}
        <div className="pos-sidebar-footer">
          {/* Subscription Status Card ($5 BCV tras 3 meses de prueba) */}
          {(() => {
            const sub = getStoreSubscriptionDetails(currentStoreObj, config, dolarRateInfo);
            return (
              <div style={{
                background: sub.isExempt ? '#EFF6FF' : (sub.isPaidActive ? '#F0FDF4' : '#FFFBEB'),
                border: `1px solid ${sub.isExempt ? '#BFDBFE' : (sub.isPaidActive ? '#BBF7D0' : '#FDE68A')}`,
                borderRadius: '8px',
                padding: '5px 8px',
                marginBottom: '4px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: '0.58rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: sub.isExempt ? '#1E40AF' : (sub.isPaidActive ? '#15803D' : '#92400E')
                  }}>
                    {sub.isExempt ? 'Plan Cortesía' : (sub.isPaidActive ? 'Suscripción Activa' : 'Prueba Gratuita')}
                  </span>
                  <span style={{ fontSize: '0.64rem' }}>
                    {sub.isExempt ? '🛡️' : (sub.isPaidActive ? '⭐' : '🎁')}
                  </span>
                </div>
                <div style={{ fontSize: '0.70rem', fontWeight: 800, color: '#1E293B', marginTop: '1px', lineHeight: 1.2 }}>
                  {sub.isExempt
                    ? 'Acceso Exento'
                    : (sub.isPaidActive
                        ? `Al día (${sub.paidUntil?.toLocaleDateString('es-VE') || 'Activo'})`
                        : `Quedan ${sub.trialDaysRemaining} días gratis`)}
                </div>
                {!sub.isExempt && (
                  <div style={{ fontSize: '0.58rem', color: '#64748B', marginTop: '1px' }}>
                    {sub.isPaidActive ? 'Plan: $5 USD / mes' : 'Luego: $5 USD a tasa BCV'}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Exchange Rate Card (Compact single-line) */}
          <div className="pos-rate-box" style={{ padding: '4px 8px', marginBottom: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                Tasa Oficial BCV:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {config.vesExchangeRate ? `${config.vesExchangeRate} VES` : 'Calculando...'}
                </span>
                {onRefreshDolarRate && (
                  <button
                    type="button"
                    onClick={onRefreshDolarRate}
                    disabled={isFetchingRate}
                    className="pos-rate-refresh-btn"
                    style={{ padding: '2px', cursor: 'pointer' }}
                    title="Actualizar tasa BCV"
                  >
                    <RefreshCw size={11} className={isFetchingRate ? 'spin-animation' : ''} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Cashier Info Card & Logout */}
          <div className="pos-cashier-card" style={{ padding: '5px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <div className="pos-cashier-avatar" style={{ width: '28px', height: '28px', fontSize: '0.70rem', flexShrink: 0 }}>
                {cashierInitials}
              </div>
              <div style={{ overflow: 'hidden', minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '0.72rem', color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', lineHeight: 1.2 }}>
                  {cashierDisplayName}
                </div>
                <div style={{ fontSize: '0.60rem', color: 'var(--c-primary)', fontWeight: 700 }}>
                  Cajero en Turno
                </div>
              </div>
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="pos-logout-btn"
                style={{ width: '28px', height: '28px', flexShrink: 0 }}
                title="Cerrar turno / Salir del terminal"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* 2. MAIN TERMINAL WORKSPACE */}
      <div className="pos-main-workspace">
        {/* Workspace Top Header Bar */}
        <header className="pos-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            <button
              type="button"
              className="pos-mobile-menu-trigger"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Abrir Menú de Terminal"
            >
              <Menu size={20} />
            </button>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {safeStore.name} • {safeStore.city || 'Sede'}
              </div>
              <h1 className="pos-topbar-title" style={{ fontSize: '1.20rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {navModules.find(m => m.id === activeTab)?.label || 'Terminal POS'}
              </h1>
            </div>
          </div>

          {/* Right Fast Action Buttons */}
          <div className="pos-topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {/* Botón Ir a POS Móvil (Modo Mostrador) */}
            <button
              type="button"
              onClick={() => {
                setIsMobilePosMode(true);
                try { localStorage.setItem('fidely_pos_mobile_mode', 'true'); } catch (e) {}
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '0.80rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #70092B 0%, #9C382A 100%)',
                color: '#FFFFFF',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(112, 9, 43, 0.3)',
                whiteSpace: 'nowrap'
              }}
              title="Abrir área simplificada para teléfonos y mostrador"
            >
              <Smartphone size={14} />
              <span>POS Móvil</span>
              {pendingRedemptionsForStore.length > 0 && (
                <span style={{
                  background: '#EF4444',
                  color: '#FFFFFF',
                  borderRadius: '9999px',
                  padding: '1px 6px',
                  fontSize: '0.65rem',
                  fontWeight: 900
                }}>
                  {pendingRedemptionsForStore.length}
                </span>
              )}
              <span style={{ opacity: 0.9, fontSize: '0.85rem' }}>→</span>
            </button>
            <button
              type="button"
              onClick={() => setShowStoreOnboarding(true)}
              className="btn btn-secondary pos-action-btn hide-on-mobile"
              style={{
                padding: '7px 11px',
                fontSize: '0.78rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                border: '1.5px solid rgba(222, 139, 118, 0.4)',
                background: '#FAF8F5',
                color: 'var(--c-primary, #9C382A)',
                fontWeight: 800
              }}
              title="Iniciar o repetir el tour guiado del panel"
            >
              <Sparkles size={14} color="var(--c-primary)" />
              <span className="pos-btn-text">🚀 Tour Guiado</span>
            </button>

            <button
              type="button"
              onClick={() => setShowStoreProfileModal(true)}
              className="btn pos-action-btn hide-on-mobile"
              style={{
                padding: '7px 11px',
                fontSize: '0.78rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'var(--c-primary, #9C382A)',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 800,
                boxShadow: '0 2px 6px rgba(156, 56, 42, 0.2)'
              }}
              title="Diseñar tarjeta de fidelidad, sellos y premios"
            >
              <Palette size={14} />
              <span className="pos-btn-text">🎨 Tarjeta & Sellos</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPosCameraScanner(true)}
              className="btn btn-secondary pos-action-btn hide-on-mobile"
              style={{ padding: '7px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              title="Escanear tarjeta QR del cliente con cámara"
            >
              <Camera size={14} color="var(--c-primary)" />
              <span className="pos-btn-text">Escanear</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('QR_DISPLAY')}
              className={`btn pos-action-btn ${activeTab === 'QR_DISPLAY' ? 'btn-accent' : 'btn-outline'}`}
              style={{ padding: '7px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              title="Ver código QR para que los clientes escaneen"
            >
              <QrCode size={14} />
              <span className="pos-btn-text">QR</span>
            </button>
          </div>
        </header>

        {/* Workspace Body Area */}
        <div className="pos-workspace-content">

          {/* Banner Amigable de Membresía Requerida (Modo No Invasivo) */}
          {isSubscriptionBlocked && activeTab !== 'MEMBERSHIP' && (
            <div style={{
              background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
              border: '1.5px solid #FCD34D',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              flexWrap: 'wrap',
              boxShadow: '0 4px 14px rgba(217, 119, 6, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '240px', flex: 1 }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 3px 8px rgba(180, 83, 9, 0.25)'
                }}>
                  <CreditCard size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#92400E' }}>
                      Modo Demostración & Visualización
                    </span>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      background: '#FEE2E2',
                      color: '#991B1B',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      textTransform: 'uppercase'
                    }}>
                      Membresía Requerida
                    </span>
                  </div>
                  <p style={{ fontSize: '0.80rem', color: '#B45309', margin: 0, lineHeight: 1.4 }}>
                    Puedes explorar todas las secciones del panel. Para disfrutar de todas las funciones operativas de <strong>fidely PRO</strong> (emitir sellos, canjear premios de clientes y facturar en caja), adquiere tu membresía de <strong>$5 USD/mes</strong> a tasa oficial BCV.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('MEMBERSHIP')}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #70092B 0%, #9C382A 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(112, 9, 43, 0.28)',
                  whiteSpace: 'nowrap'
                }}
              >
                <CreditCard size={16} />
                <span>Activar Membresía</span>
                <span>➔</span>
              </button>
            </div>
          )}

          {/* Banner de Advertencia Obligatoria: Completar Datos Básicos y Logo del Comercio */}
          {(!currentStoreObj?.phone?.trim() || !currentStoreObj?.logo?.trim()) && (
            <div style={{
              background: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
              border: '2px solid #E11D48',
              borderRadius: 'var(--radius-md)',
              padding: '12px 18px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              boxShadow: '0 4px 14px rgba(225, 29, 72, 0.15)',
              position: 'relative',
              zIndex: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: '#E11D48',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.1rem',
                  flexShrink: 0
                }}>
                  ⚠️
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#9F1239' }}>
                    Datos Obligatorios del Comercio Pendientes
                  </div>
                  <div style={{ fontSize: '0.80rem', color: '#881337', marginTop: '2px' }}>
                    {!currentStoreObj?.phone?.trim() && !currentStoreObj?.logo?.trim()
                      ? 'Es obligatorio registrar el Teléfono de Contacto y subir el Logo Oficial de tu comercio para operar.'
                      : !currentStoreObj?.phone?.trim()
                        ? 'Es obligatorio registrar el Teléfono de Contacto de tu comercio.'
                        : 'Es obligatorio subir el Logo Oficial de tu comercio.'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStoreProfileModal(true)}
                className="btn"
                style={{
                  background: '#E11D48',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '9px 18px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(225, 29, 72, 0.3)'
                }}
              >
                Completar Perfil y Logo Ahora →
              </button>
            </div>
          )}

          {/* Real-time Alert Banner for Pending Counter QR Requests (Siempre arriba en posición prioritaria) */}
          {pendingRedemptionsForStore.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
              border: '2px solid #F59E0B',
              borderRadius: 'var(--radius-md)',
              padding: '14px 18px',
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 6px 20px rgba(245, 158, 11, 0.22)',
              position: 'relative',
              zIndex: 10
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: '#F59E0B',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.35)'
                  }}>
                    <Bell size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#92400E' }}>
                      🔔 ¡{pendingRedemptionsForStore.length} Solicitud(es) de Sello / Canje Recibida(s) en Mostrador!
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#B45309' }}>
                      El cliente escaneó el QR en mostrador de {selectedStore.name}. Puedes aprobar su solicitud al instante:
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('PENDING_REQUESTS')}
                  className="btn btn-outline"
                  style={{ padding: '6px 14px', fontSize: '0.8rem', background: '#FFFFFF', fontWeight: 700 }}
                >
                  Ver todas ({pendingRedemptionsForStore.length})
                </button>
              </div>

              {/* Quick 1-click Approval Box for the first pending request */}
              {(() => {
                const req = pendingRedemptionsForStore[0];
                const reqClient = clients.find(c => 
                  c.id === req.clientId || 
                  (c.cedula && req.clientDocId && String(c.cedula).trim() === String(req.clientDocId).trim())
                );
                const clientCard = (reqClient?.loyaltyCards || []).find(c => isMatchStore(c.storeId, safeStore.id, c.storeName, safeStore.name));
                const currentStamps = clientCard ? Number(clientCard.currentStamps || 0) : Number(req.currentStamps || 0);
                const targetStamps = clientCard ? Number(clientCard.stampsTarget || safeStore.stampsTarget || 6) : Number(req.stampsTarget || safeStore.stampsTarget || 6);
                const isRewardClaim = req.type === 'STAMP_REWARD_CLAIM';
                const isStamp = req.type === 'STAMP_REQUEST' || (!req.pointsCost && !isRewardClaim);

                return (
                  <div style={{
                    background: isRewardClaim ? '#F0FDF4' : '#FFFFFF',
                    borderRadius: '14px',
                    border: isRewardClaim ? '2px solid #22C55E' : '1.5px solid #FCD34D',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: isRewardClaim ? '#16A34A' : 'var(--c-primary)',
                        color: '#FFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '1.15rem'
                      }}>
                        {isRewardClaim ? '🎁' : (req.clientName?.slice(0, 2).toUpperCase() || 'CL')}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{req.clientName}</strong>
                          <span className="badge badge-accent" style={{ fontSize: '0.72rem' }}>Doc: {req.clientDocId}</span>
                          {isRewardClaim && (
                            <span style={{ fontSize: '0.72rem', background: '#DCFCE7', color: '#166534', fontWeight: 800, padding: '2px 8px', borderRadius: '10px' }}>
                              CANJE DE PREMIO
                            </span>
                          )}
                        </div>
                        {isRewardClaim ? (
                          <div style={{ fontSize: '0.88rem', color: '#15803D', fontWeight: 800, marginTop: '2px' }}>
                            🎁 Premio a entregar: <strong>{req.rewardTitle}</strong> • <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Requiere {req.stampsCost || targetStamps} sellos (Tiene {currentStamps})</span>
                          </div>
                        ) : isStamp ? (
                          <div style={{ fontSize: '0.86rem', color: '#15803D', fontWeight: 800, marginTop: '2px' }}>
                            📍 Solicitud: +1 Sello Digital • <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Tiene {currentStamps} de {targetStamps} sellos</span>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.86rem', color: 'var(--c-primary)', fontWeight: 800, marginTop: '2px' }}>
                            🎁 Canje: {req.rewardTitle}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (isRewardClaim) {
                            handleRejectStampRewardClaim(req);
                          } else if (isStamp) {
                            handleRejectStampRequest(req);
                          } else {
                            setSelectedPendingRedemption(req);
                            setShowRejectForm(true);
                          }
                        }}
                        className="btn btn-outline"
                        style={{ padding: '8px 14px', fontSize: '0.78rem', color: 'var(--c-rose)', borderColor: '#FECDD3' }}
                      >
                        Rechazar
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (isRewardClaim) {
                            handleApproveStampRewardClaim(req);
                          } else if (isStamp) {
                            handleApproveStampRequest(req);
                          } else {
                            handleApprovePendingRedemption(req);
                          }
                        }}
                        className="btn btn-accent"
                        style={{
                          padding: '10px 20px',
                          fontSize: '0.9rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: isRewardClaim ? '#16A34A' : undefined,
                          borderColor: isRewardClaim ? '#15803D' : undefined,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                      >
                        <CheckCircle2 size={18} />
                        <span>{isRewardClaim ? '🎁 Entregar Premio' : isStamp ? '✓ Aprobar Sello (+1)' : '✓ Aprobar Canje'}</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* MODULE 0: ESTUDIO EXCLUSIVO DE TARJETA DIGITAL DE FIDELIDAD (Separado de Facturación) */}
          {activeTab === 'CARD_SETUP' && (
            <div className="pos-card-setup-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
              
              {/* 1. Header Hero con Banner de Bienvenida y Acciones */}
              <div className="glass-panel" style={{
                background: 'linear-gradient(135deg, #FFFDF9 0%, #FAF3EB 100%)',
                border: '2px solid #EDE2D5',
                borderRadius: '24px',
                padding: '28px 32px',
                boxShadow: '0 12px 32px -8px rgba(156, 56, 42, 0.09)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '18px', maxWidth: '680px' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, #DE8B76 0%, #9C382A 100%)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 20px rgba(156, 56, 42, 0.28)',
                    flexShrink: 0
                  }}>
                    <Palette size={32} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        background: 'var(--c-primary, #9C382A)',
                        color: '#FFFFFF',
                        padding: '3px 10px',
                        borderRadius: '999px'
                      }}>
                        🎨 Estudio de Fidelización
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 700 }}>
                        {currentStoreObj.name}
                      </span>
                    </div>
                    <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#1E293B', margin: '0 0 6px 0', lineHeight: 1.25 }}>
                      Diseño & Configuración de tu Tarjeta de Fidelidad
                    </h2>
                    <p style={{ fontSize: '0.88rem', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                      Esta es la tarjeta digital que tus clientes guardarán en sus teléfonos para acumular sellos y ganar recompensas. Personaliza los colores de tu marca, el ícono del sello, la meta requerida y el premio a otorgar.
                    </p>
                  </div>
                </div>

                {/* Botones de Acción Primarios */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setShowStoreOnboarding(true)}
                    className="btn btn-secondary"
                    style={{
                      padding: '12px 20px',
                      borderRadius: '14px',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      border: '1.5px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#334155',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      cursor: 'pointer'
                    }}
                    title="Ver o repetir el tour guiado interactivo"
                  >
                    <Sparkles size={18} color="var(--c-primary, #9C382A)" />
                    <span>🚀 Iniciar Tour Guiado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowStoreProfileModal(true)}
                    className="btn"
                    style={{
                      padding: '12px 24px',
                      borderRadius: '14px',
                      fontWeight: 900,
                      fontSize: '0.92rem',
                      background: 'linear-gradient(135deg, #9C382A 0%, #C2410C 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '10px',
                      boxShadow: '0 6px 20px rgba(156, 56, 42, 0.3)',
                      cursor: 'pointer'
                    }}
                    title="Abrir el panel para personalizar colores, sellos y premio"
                  >
                    <Palette size={20} />
                    <span>🎨 Configurar mi Tarjeta</span>
                  </button>
                </div>
              </div>

              {/* 2. Grid Principal: Mockup Realista de la Tarjeta + Métricas y Resumen */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 460px) 1fr', gap: '24px', alignItems: 'start' }}>
                
                {/* Columna Izquierda: Vista Previa Realista de la Tarjeta Digital */}
                <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF', borderRadius: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Eye size={18} color="var(--c-primary)" />
                      <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1E293B' }}>
                        Vista Previa en Vivo (Cliente)
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', background: '#DCFCE7', color: '#15803D', fontWeight: 800, padding: '3px 10px', borderRadius: '999px' }}>
                      ● Formato Móvil
                    </span>
                  </div>

                  {/* Mockup de la Tarjeta */}
                  <div style={{
                    background: (currentStoreObj.cardGradient && isCardConfigured)
                      ? currentStoreObj.cardGradient
                      : (currentStoreObj.cardColor && isCardConfigured
                          ? `linear-gradient(135deg, ${currentStoreObj.cardColor} 0%, #090D16 100%)`
                          : 'linear-gradient(140deg, #18181B 0%, #0B0F19 45%, #171226 100%)'),
                    color: '#FFFFFF',
                    borderRadius: '24px',
                    padding: '26px 22px',
                    boxShadow: '0 20px 48px -12px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(245, 158, 11, 0.22)',
                    position: 'relative',
                    overflow: 'hidden',
                    border: '1.5px solid rgba(245, 158, 11, 0.35)'
                  }}>
                    {/* Brillo decorativo superior derecho con reflejo dorado y halo */}
                    <div style={{
                      position: 'absolute',
                      top: '-60px',
                      right: '-60px',
                      width: '200px',
                      height: '200px',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(245, 158, 11, 0.22) 0%, rgba(255, 255, 255, 0.06) 40%, transparent 70%)',
                      pointerEvents: 'none'
                    }} />

                    {/* Línea reflectiva holográfica diagonal */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '1px',
                      background: 'linear-gradient(90deg, transparent 0%, rgba(254, 240, 138, 0.5) 35%, rgba(255, 255, 255, 0.8) 50%, rgba(254, 240, 138, 0.5) 65%, transparent 100%)',
                      pointerEvents: 'none'
                    }} />

                    {/* Header de la Tarjeta: Logo, Comercio y Chip VIP */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '14px',
                          background: '#FFFFFF',
                          border: '2px solid rgba(245, 158, 11, 0.55)',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          flexShrink: 0
                        }}>
                          {currentStoreObj.logo ? (
                            <img src={currentStoreObj.logo} alt={currentStoreObj.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          ) : (
                            <StoreLogoBadge store={currentStoreObj} size={38} />
                          )}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <h4 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                              {currentStoreObj.name}
                            </h4>
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#FDE68A', fontWeight: 700, letterSpacing: '0.02em' }}>
                            {currentStoreObj.category || 'Comercio Asociado'}
                          </span>
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.12) 100%)',
                        border: '1px solid rgba(245, 158, 11, 0.45)',
                        backdropFilter: 'blur(8px)',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                      }}>
                        <Crown size={11} color="#FDE047" />
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 900,
                          color: '#FDE047',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase'
                        }}>
                          VIP PASS
                        </span>
                      </div>
                    </div>

                    {/* Rejilla de Sellos Digitales en Panel Dark Glass */}
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.48)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255, 255, 255, 0.09)',
                      borderRadius: '18px',
                      padding: '16px 14px',
                      marginBottom: '16px',
                      position: 'relative',
                      zIndex: 1,
                      boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.08)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>
                          Cartilla de Sellos Digitales
                        </span>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: 'rgba(245, 158, 11, 0.15)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}>
                          <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#FCD34D' }}>
                            Meta: {currentStoreObj.stampsTarget || 6} sellos
                          </span>
                        </div>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${Math.min(currentStoreObj.stampsTarget || 6, 5)}, 1fr)`,
                        gap: '12px'
                      }}>
                        {Array.from({ length: currentStoreObj.stampsTarget || 6 }).map((_, idx) => {
                          const isSampleStamped = idx < 2; // Demostración de sellos ya completados
                          const isGoalSlot = idx === (currentStoreObj.stampsTarget || 6) - 1;
                          return (
                            <div
                              key={idx}
                              style={{
                                aspectRatio: '1/1',
                                borderRadius: '50%',
                                background: isSampleStamped
                                  ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #92400E 100%)'
                                  : isGoalSlot
                                    ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.22) 0%, rgba(217, 119, 6, 0.10) 100%)'
                                    : 'rgba(255, 255, 255, 0.04)',
                                border: isSampleStamped
                                  ? '2px solid #FEF08A'
                                  : isGoalSlot
                                    ? '2px dashed #F59E0B'
                                    : '1.5px dashed rgba(255, 255, 255, 0.20)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: isSampleStamped
                                  ? '0 0 16px rgba(245, 158, 11, 0.55), inset 0 1px 2px rgba(255, 255, 255, 0.5)'
                                  : isGoalSlot
                                    ? '0 0 14px rgba(245, 158, 11, 0.25)'
                                    : 'none',
                                color: isSampleStamped ? '#FFFFFF' : 'inherit',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                position: 'relative'
                              }}
                              title={isGoalSlot ? '¡Casilla de Premio Final!' : `Sello #${idx + 1}`}
                            >
                              {isSampleStamped ? (
                                renderStampIconHelper(currentStoreObj.stampIcon || currentStoreObj.category, 20, '#FFFFFF')
                              ) : isGoalSlot ? (
                                <span style={{ fontSize: '1.25rem', filter: 'drop-shadow(0 2px 6px rgba(245, 158, 11, 0.4))' }}>🎁</span>
                              ) : (
                                <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 800 }}>{idx + 1}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Banner de Premio y Regla */}
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.14) 0%, rgba(0, 0, 0, 0.55) 100%)',
                      border: '1px solid rgba(245, 158, 11, 0.32)',
                      borderRadius: '14px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      position: 'relative',
                      zIndex: 1
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '9px',
                          background: 'rgba(245, 158, 11, 0.2)',
                          border: '1px solid rgba(245, 158, 11, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Gift size={17} color="#FDE047" />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#FDE047', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Premio al completar
                          </div>
                          <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.25 }}>
                            {currentStoreObj.rewardTitle || '1 Producto o Servicio de Cortesía'}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.62rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Por cada</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#F8FAFC' }}>
                          ${storeMinPurchase} USD
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowStoreProfileModal(true)}
                    className="btn"
                    style={{
                      marginTop: '16px',
                      width: '100%',
                      padding: '11px',
                      borderRadius: '12px',
                      background: 'var(--c-secondary-soft, #F7EFE8)',
                      color: 'var(--c-primary, #9C382A)',
                      border: '1.5px solid #EDE2D5',
                      fontWeight: 800,
                      fontSize: '0.86rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <Palette size={16} />
                    <span>Personalizar colores, sellos y premio</span>
                  </button>
                </div>

                {/* Columna Derecha: Tarjetas de Configuración y Transición a Facturación */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Grid de 4 Pilares de la Tarjeta */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                    
                    {/* Pilar 1: Identidad Visual */}
                    <div className="glass-panel" style={{ padding: '18px', background: '#FFFFFF', borderRadius: '18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F7EFE8', color: '#9C382A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Palette size={18} />
                        </div>
                        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#1E293B' }}>
                          1. Identidad de Marca
                        </h4>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                        Colores corporativos y logo que verá el cliente al abrir la tarjeta en su smartphone.
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: isCardConfigured ? (currentStoreObj.cardColor || '#18181B') : '#18181B',
                          border: '2px solid rgba(245, 158, 11, 0.45)',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.25)'
                        }} />
                        <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155' }}>
                          {isCardConfigured ? 'Color personalizado' : 'Dark Obsidian VIP (Por defecto)'}
                        </span>
                      </div>
                    </div>

                    {/* Pilar 2: Meta de Sellos */}
                    <div className="glass-panel" style={{ padding: '18px', background: '#FFFFFF', borderRadius: '18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Award size={18} />
                        </div>
                        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#1E293B' }}>
                          2. Meta de Sellos
                        </h4>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                        Cantidad de compras requeridas para que el cliente complete su cartilla de fidelidad.
                      </p>
                      <div style={{ fontSize: '1.02rem', fontWeight: 900, color: '#B45309' }}>
                        {currentStoreObj.stampsTarget || 6} sellos ({getStampIconLabel(currentStoreObj.stampIcon)})
                      </div>
                    </div>

                    {/* Pilar 3: Premio Oficial */}
                    <div className="glass-panel" style={{ padding: '18px', background: '#FFFFFF', borderRadius: '18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#DCFCE7', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Gift size={18} />
                        </div>
                        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#1E293B' }}>
                          3. Premio Oficial
                        </h4>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                        Recompensa real y atractiva que el cliente canjeará sin pagar nada extra en caja.
                      </p>
                      <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#15803D', lineHeight: 1.3 }}>
                        {currentStoreObj.rewardTitle || '1 Producto o Servicio de Cortesía'}
                      </div>
                    </div>

                    {/* Pilar 4: Consumo Mínimo */}
                    <div className="glass-panel" style={{ padding: '18px', background: '#FFFFFF', borderRadius: '18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EFF6FF', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <DollarSign size={18} />
                        </div>
                        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#1E293B' }}>
                          4. Consumo Mínimo
                        </h4>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                        Monto mínimo de compra que debe registrar el cliente para recibir un nuevo sello.
                      </p>
                      <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1D4ED8' }}>
                        ${storeMinPurchase} USD <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>(Tasa BCV)</span>
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta de Transición a Facturación */}
                  <div style={{
                    background: '#FFFFFF',
                    border: '2px solid #E2E8F0',
                    borderRadius: '20px',
                    padding: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <Receipt size={18} color="var(--c-primary)" />
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1E293B' }}>
                          ¿Listo para cobrar a tus clientes?
                        </h4>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0, lineHeight: 1.45 }}>
                        Pasa al módulo de facturación para buscar clientes, sumar productos al carrito, emitir recibos y estampar sellos automáticamente.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('REGISTER_SALE')}
                      className="btn btn-accent"
                      style={{
                        padding: '12px 24px',
                        borderRadius: '12px',
                        fontWeight: 900,
                        fontSize: '0.9rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 14px rgba(156, 56, 42, 0.25)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Receipt size={18} />
                      <span>Ir a Facturación en Caja →</span>
                    </button>
                  </div>

                </div>
              </div>

            </div>
          )}

      {/* MODULE 1: SELLAR CLIENTES / TERMINAL DE FIDELIDAD */}
      {activeTab === 'REGISTER_SALE' && (
        <div className="pos-checkout-grid">
          {/* Left Column: Client Identification & Commercial Rules */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Section: Client Identification & Consultation (RN-01) */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} color="var(--c-primary)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>1. Consultar / Identificar Cliente (RN-01)</h3>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowPosCameraScanner(true)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                  title="Escanear tarjeta o QR del cliente"
                >
                  <Camera size={14} />
                  <span>Escanear QR</span>
                </button>
              </div>
            </div>

            {/* Quick search input */}
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Escribe Cédula (Ej. 12345678), Teléfono o Nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '36px' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Search results */}
            {searchQuery.trim() !== '' && filteredClients.length > 0 && (
              <div style={{
                background: '#FFFFFF',
                border: '1.5px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                maxHeight: '220px',
                overflowY: 'auto',
                marginBottom: '14px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)'
              }}>
                <div style={{ padding: '6px 12px', background: '#F9FAFB', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  CLIENTES REGISTRADOS ENCONTRADOS ({filteredClients.length}):
                </div>
                {filteredClients.map(client => {
                  const pastPurchases = clientPurchasesCountMap[client.id] || 0;
                  const clientCard = (client.loyaltyCards || []).find(c => isMatchStore(c.storeId, safeStore.id, c.storeName, safeStore.name));
                  const cardStamps = clientCard ? Number(clientCard.currentStamps || 0) : 0;
                  const cardTarget = clientCard ? Number(clientCard.stampsTarget || safeStore.stampsTarget || 6) : Number(safeStore.stampsTarget || 6);
                  return (
                    <div
                      key={client.id}
                      onClick={() => {
                        setIdentifiedClient(client);
                        setSearchQuery('');
                      }}
                      style={{
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        gap: '10px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#F6F3FF'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong style={{ fontSize: '0.92rem' }}>{client.name}</strong>
                          {pastPurchases > 0 ? (
                            <span className="badge badge-accent" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                              ⭐ {pastPurchases} {pastPurchases === 1 ? 'compra previa aquí' : 'compras previas aquí'}
                            </span>
                          ) : (
                            <span className="badge badge-secondary" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                              Registrado en fidely
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Cédula: <strong>{client.docId}</strong> • Tlf: {client.phone}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--c-primary)' }}>
                          ⭐ {cardStamps}/{cardTarget} sellos
                        </div>
                        <span className="btn btn-outline" style={{ padding: '3px 8px', fontSize: '0.7rem', marginTop: '2px' }}>
                          Seleccionar
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* When search has no results */}
            {searchQuery.trim() !== '' && filteredClients.length === 0 && (
              <div style={{
                padding: '16px',
                textAlign: 'center',
                background: '#FFFDF5',
                border: '1.5px dashed #FDE68A',
                borderRadius: 'var(--radius-md)',
                marginBottom: '14px'
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#92400E' }}>
                  No encontramos ningún cliente registrado con "{searchQuery}"
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Pídele al cliente que escanee el código QR de tu mostrador con la app FideliClub para afiliarse y recibir su tarjeta al instante.
                </div>
              </div>
            )}

            {/* Quick Toggle: Clientes frecuentes de este local */}
            {!identifiedClient && searchQuery.trim() === '' && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    👥 Clientes con compras anteriores en este local: <strong>{previousStoreClients.length}</strong>
                  </span>
                  {previousStoreClients.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowStoreClientsList(!showStoreClientsList)}
                      className="btn btn-outline"
                      style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                    >
                      {showStoreClientsList ? 'Ocultar Lista' : 'Ver Clientes del Local'}
                    </button>
                  )}
                </div>

                {showStoreClientsList && previousStoreClients.length > 0 && (
                  <div style={{
                    background: '#FFFFFF',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    marginTop: '6px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                  }}>
                    {previousStoreClients.map(client => {
                      const count = clientPurchasesCountMap[client.id] || 0;
                      const clientCard = (client.loyaltyCards || []).find(c => isMatchStore(c.storeId, safeStore.id, c.storeName, safeStore.name));
                      const cardStamps = clientCard ? Number(clientCard.currentStamps || 0) : 0;
                      const cardTarget = clientCard ? Number(clientCard.stampsTarget || safeStore.stampsTarget || 6) : Number(safeStore.stampsTarget || 6);
                      return (
                        <div
                          key={client.id}
                          onClick={() => {
                            setIdentifiedClient(client);
                            setShowStoreClientsList(false);
                          }}
                          style={{
                            padding: '8px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid var(--border-subtle)',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.86rem' }}>{client.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Cédula: {client.docId} • {count} {count === 1 ? 'compra anterior' : 'compras anteriores'}
                            </div>
                          </div>
                          <span className="badge badge-accent" style={{ fontSize: '0.74rem' }}>
                            ⭐ {cardStamps}/{cardTarget} sellos
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Identified Client Card */}
            {identifiedClient ? (
              <div style={{
                background: '#FFFFFF',
                border: '2px solid var(--c-primary)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.12)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'var(--c-primary)',
                    border: '2px solid var(--c-accent)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1rem'
                  }}>
                    {identifiedClient.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ fontSize: '1rem' }}>{identifiedClient.name}</strong>
                      <span className="badge badge-primary">{identifiedClient.tier}</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      Cédula: <strong>{identifiedClient.docId}</strong> • Tlf: {identifiedClient.phone}
                    </div>
                    {clientPurchasesCountMap[identifiedClient.id] > 0 && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--c-primary)', fontWeight: 700, marginTop: '2px' }}>
                        ⭐ {clientPurchasesCountMap[identifiedClient.id]} compras previas registradas en este local
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {/* Cartilla de Sellos del Cliente en este Local */}
                  {(() => {
                    const clientCard = (identifiedClient.loyaltyCards || []).find(c => isMatchStore(c.storeId, safeStore.id, c.storeName, safeStore.name));
                    const currentStamps = clientCard ? Number(clientCard.currentStamps || 0) : 0;
                    const targetStamps = clientCard ? Number(clientCard.stampsTarget || safeStore.stampsTarget || 6) : Number(safeStore.stampsTarget || 6);
                    const rawRewards = (selectedStore.stampRewards && selectedStore.stampRewards.length > 0)
                      ? selectedStore.stampRewards
                      : (clientCard?.stampRewards || [
                          { id: 'def_r', stamps: targetStamps, title: selectedStore.rewardTitle || 'Premio de Fidelidad', icon: '🎁' }
                        ]);
                    const rewards = [...rawRewards].sort((a, b) => Number(a.stamps) - Number(b.stamps));
                    const canClaimAny = rewards.some(r => currentStamps >= Number(r.stamps));
                    const nextReward = rewards.find(r => currentStamps < Number(r.stamps)) || rewards[rewards.length - 1];

                    return (
                      <div style={{
                        background: canClaimAny ? '#F0FDF4' : '#FFFBEB',
                        border: canClaimAny ? '1.5px solid #86EFAC' : '1.5px solid #FDE68A',
                        padding: '8px 14px',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: canClaimAny ? '#DCFCE7' : '#FEF3C7',
                          color: canClaimAny ? '#166534' : '#B45309',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem',
                          flexShrink: 0
                        }}>
                          {canClaimAny ? '🎁' : '⭐'}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.66rem', color: canClaimAny ? '#166534' : '#92400E', textTransform: 'uppercase', fontWeight: 800 }}>
                            Tarjeta de Sellos
                          </div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: canClaimAny ? '#166534' : '#92400E', lineHeight: 1.1 }}>
                            {currentStamps} de {targetStamps} <span style={{ fontSize: '0.78rem' }}>sellos</span>
                          </div>
                          <div style={{ fontSize: '0.70rem', fontWeight: 700, color: canClaimAny ? '#15803D' : '#78350F' }}>
                            {canClaimAny ? '🎉 ¡Premio listo para canjear!' : `Próximo: ${nextReward?.title || 'Premio'}`}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Botón: Ver Historial de Sellos del Cliente */}
                  <button
                    type="button"
                    onClick={() => setShowClientStampsHistoryModal(true)}
                    className="btn btn-secondary"
                    style={{
                      padding: '8px 14px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderRadius: 'var(--radius-sm)',
                      background: '#FFFFFF',
                      border: '1.5px solid var(--border-subtle)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      cursor: 'pointer'
                    }}
                    title="Ver historial de sellos y canjes aprobados en este local"
                  >
                    <History size={15} color="var(--c-primary)" />
                    <span>Historial de Sellos ({clientStoreStampHistory.length})</span>
                  </button>

                  <button
                    onClick={() => {
                      setIdentifiedClient(null);
                      if (activeQrCreditUsd > 0) handleCancelApprovedQrCredit();
                    }}
                    className="btn btn-outline"
                    style={{ padding: '8px 12px', fontSize: '0.76rem', borderRadius: 'var(--radius-sm)' }}
                  >
                    Cambiar
                  </button>
                </div>

                {/* Barra de Canje de Premios por Sellos para el Cajero */}
                {(() => {
                  const clientCard = (identifiedClient.loyaltyCards || []).find(c => c.storeId === safeStore.id);
                  if (!clientCard) return null;
                  const currentStamps = Number(clientCard.currentStamps || 0);
                  const rawRewards = (selectedStore.stampRewards && selectedStore.stampRewards.length > 0)
                    ? selectedStore.stampRewards
                    : (clientCard.stampRewards || [{ id: 'def', stamps: Number(selectedStore.stampsTarget || 6), title: selectedStore.rewardTitle || 'Premio', icon: '🎁' }]);
                  const rewards = [...rawRewards].sort((a, b) => Number(a.stamps) - Number(b.stamps));
                  const claimable = rewards.filter(r => currentStamps >= Number(r.stamps));

                  if (claimable.length === 0) return null;

                  return (
                    <div style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      background: 'linear-gradient(135deg, #DCFCE7 0%, #F0FDF4 100%)',
                      borderRadius: '10px',
                      border: '1.5px solid #86EFAC',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#166534', fontWeight: 800 }}>
                        <Gift size={16} color="#166534" />
                        <span>¡{identifiedClient.name} tiene premios listos para canjear con sus sellos!</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {claimable.map((r, i) => (
                          <button
                            key={r.id || i}
                            type="button"
                            onClick={() => handleRedeemStampRewardInPos(r)}
                            style={{
                              background: '#166534',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '5px 10px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 2px 6px rgba(22, 101, 52, 0.3)'
                            }}
                            title={`Canjear "${r.title}" descontando ${r.stamps} sellos`}
                          >
                            <span>{r.icon || '🎁'}</span>
                            <span>Entregar: {r.title} (-{r.stamps} sellos)</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div style={{
                padding: '14px',
                textAlign: 'center',
                background: '#FAFAFA',
                borderRadius: 'var(--radius-md)',
                border: '1.5px dashed var(--border-subtle)',
                color: 'var(--text-muted)',
                fontSize: '0.82rem'
              }}>
                <QrCode size={22} style={{ opacity: 0.6, marginBottom: '4px', color: 'var(--c-primary)' }} />
                <div>Escribe la cédula o teléfono arriba para consultar si el cliente ya está registrado.</div>
              </div>
            )}
          </div>

          {/* Quick Commercial Rules Card in Left Column */}
          <div className="glass-panel" style={{ padding: '18px' }}>
            <h4 style={{ fontSize: '0.86rem', fontWeight: 800, marginBottom: '10px', color: 'var(--c-primary)' }}>
              Reglas del Programa de Sellos
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>• <strong>RS-01:</strong> Identificar al cliente con su cédula o teléfono antes de cobrar.</li>
              <li>• <strong>RS-02:</strong> Monto mínimo de tu local: <strong>US${storeMinPurchase.toFixed(2)}</strong> por compra para acreditar sello.</li>
              <li>• <strong>RS-03:</strong> <strong>+1 Sello Digital</strong> acreditado automáticamente a su tarjeta de fidelidad.</li>
              <li>• <strong>RS-04:</strong> Tarjeta con premios escalonados configurados en el perfil de la tienda.</li>
              <li>• <strong>RS-05:</strong> El cliente recibe notificación en su app móvil al pasar cerca o sellar.</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Checkout Form & Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="glass-panel" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Receipt size={20} color="var(--c-primary)" />
                  <div>
                    <h3 style={{ fontSize: '1.08rem', fontWeight: 800, margin: 0 }}>
                      2. Facturación Contable Bimoneda
                    </h3>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Tasa oficial BCV: <strong>{config.vesExchangeRate} VES / USD</strong>
                    </span>
                  </div>
                </div>

                {/* Mode Switch: Factura por Ítems vs Venta Rápida */}
                <div style={{
                  display: 'flex',
                  background: '#FAF8F5',
                  padding: '3px',
                  borderRadius: '10px',
                  border: '1px solid #EEDCD5'
                }}>
                  <button
                    type="button"
                    onClick={() => setBillingMode('ITEMS')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: billingMode === 'ITEMS' ? 'var(--c-primary)' : 'transparent',
                      color: billingMode === 'ITEMS' ? '#FFFFFF' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <ShoppingCart size={13} />
                    <span>Factura por Ítems ({cartItems.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingMode('QUICK')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: billingMode === 'QUICK' ? 'var(--c-primary)' : 'transparent',
                      color: billingMode === 'QUICK' ? '#FFFFFF' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Calculator size={13} />
                    <span>Monto Rápido</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleRegisterPurchase}>
                {/* Reference & Tax Control input */}
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" style={{ marginBottom: '2px' }}>
                      N° Factura / Control Fiscal (RN-06)
                    </label>
                    <button
                      type="button"
                      onClick={() => setInvoiceRef(`FAC-${Date.now().toString().slice(-5)}`)}
                      style={{ background: 'none', border: 'none', color: 'var(--c-primary)', fontSize: '0.74rem', cursor: 'pointer', fontWeight: 700 }}
                    >
                      + Generar N° Factura
                    </button>
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. FAC-01048"
                    value={invoiceRef}
                    onChange={(e) => setInvoiceRef(e.target.value)}
                    style={{
                      borderColor: isDuplicateRef ? 'var(--c-rose)' : undefined,
                      textTransform: 'uppercase'
                    }}
                  />
                </div>

                {/* MODE A: FACTURACIÓN POR ÍTEMS & CATÁLOGO */}
                {billingMode === 'ITEMS' && (
                  <div style={{ marginBottom: '16px' }}>
                    {/* Catalog Picker */}
                    <div style={{
                      background: '#FFFFFF',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                      marginBottom: '14px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{ fontSize: '0.80rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Package size={14} color="var(--c-primary)" />
                          Agregar del Catálogo de {safeStore.name}
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setShowQuickItemModal(true)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Plus size={13} />
                            <span>+ Ítem Manual</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab('PRODUCTS_CATALOG')}
                            className="btn btn-outline hide-on-mobile"
                            style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                          >
                            ⚙️ Catálogo
                          </button>
                        </div>
                      </div>

                      {/* Quick Search */}
                      <input
                        type="text"
                        placeholder="Buscar producto o servicio..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="form-input"
                        style={{ fontSize: '0.80rem', padding: '6px 10px', marginBottom: '10px' }}
                      />

                      {/* Product Chips */}
                      {storeProducts.length === 0 ? (
                        <div style={{ padding: '12px', textAlign: 'center', background: '#FAF8F5', borderRadius: '8px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          No tienes productos guardados en esta tienda aún.{' '}
                          <button
                            type="button"
                            onClick={() => {
                              setProductForm({ code: '', name: '', category: 'Servicio', priceUsd: 10, taxType: 'GRAVABLE_16', isService: true, stock: 100 });
                              setShowProductModal(true);
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--c-primary)', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            + Crear primer producto
                          </button>
                          {' '}o añade un <strong>+ Ítem Manual</strong>.
                        </div>
                      ) : (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                          gap: '8px',
                          maxHeight: '160px',
                          overflowY: 'auto',
                          paddingRight: '4px'
                        }}>
                          {storeProducts
                            .filter(p => !productSearch.trim() || p.name.toLowerCase().includes(productSearch.toLowerCase()) || (p.code && p.code.toLowerCase().includes(productSearch.toLowerCase())))
                            .map(p => {
                              const pVes = ((parseFloat(p.priceUsd) || 0) * (config.vesExchangeRate || 1)).toFixed(2);
                              return (
                                <div
                                  key={p.id}
                                  onClick={() => handleAddToCart(p)}
                                  style={{
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid #EEDCD5',
                                    background: '#FAF8F5',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--c-primary)'}
                                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#EEDCD5'}
                                  title="Haz clic para agregar a la factura"
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px', marginBottom: '3px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-main)', lineHeight: 1.2 }}>
                                      {p.name}
                                    </span>
                                    <span style={{
                                      fontSize: '0.60rem',
                                      fontWeight: 800,
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                      background: p.taxType === 'EXENTO_0' ? '#E0F2FE' : '#DCFCE7',
                                      color: p.taxType === 'EXENTO_0' ? '#0369A1' : '#15803D'
                                    }}>
                                      {p.taxType === 'EXENTO_0' ? 'Exento' : '16%'}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <span style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--c-primary)' }}>
                                      ${parseFloat(p.priceUsd).toFixed(2)}
                                    </span>
                                    <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                                      Bs. {pVes}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>

                    {/* Cart / Invoice Items Table */}
                    <div style={{
                      background: '#FFFFFF',
                      border: '1.5px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                      marginBottom: '14px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <strong style={{ fontSize: '0.86rem', color: 'var(--text-main)' }}>
                          Renglones de la Factura ({cartItems.length})
                        </strong>
                        {cartItems.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setCartItems([])}
                            style={{ background: 'none', border: 'none', color: 'var(--c-rose)', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700 }}
                          >
                            Vaciar Carrito
                          </button>
                        )}
                      </div>

                      {cartItems.length === 0 ? (
                        <div style={{
                          padding: '24px 16px',
                          textAlign: 'center',
                          color: 'var(--text-muted)',
                          fontSize: '0.80rem',
                          border: '1px dashed #E5E7EB',
                          borderRadius: '8px',
                          background: '#FAFAFA'
                        }}>
                          🛒 Factura vacía. Selecciona un producto arriba o pulsa <strong>"+ Ítem Manual"</strong> para facturar.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {cartItems.map((item) => {
                            const rowTotalUsd = (parseFloat(item.priceUsd) || 0) * (parseInt(item.quantity) || 1);
                            const rowTotalVes = rowTotalUsd * (config.vesExchangeRate || 1);
                            return (
                              <div
                                key={item.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '8px 10px',
                                  background: '#FAF8F5',
                                  borderRadius: '8px',
                                  border: '1px solid #EEDCD5',
                                  gap: '10px',
                                  flexWrap: 'wrap'
                                }}
                              >
                                <div style={{ minWidth: '130px', flex: 1 }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main)' }}>
                                    {item.name}
                                  </div>
                                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>${parseFloat(item.priceUsd).toFixed(2)} c/u</span>
                                    <span>•</span>
                                    <span style={{ color: item.taxType === 'EXENTO_0' ? '#0369A1' : '#15803D', fontWeight: 700 }}>
                                      {item.taxType === 'EXENTO_0' ? 'Exento (0%)' : 'Gravable (16% IVA)'}
                                    </span>
                                  </div>
                                </div>

                                {/* Stepper */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItemQty(item.id, -1)}
                                    style={{
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: '6px',
                                      border: '1px solid #CBD5E1',
                                      background: '#FFFFFF',
                                      fontSize: '0.85rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    -
                                  </button>
                                  <span style={{ fontWeight: 800, fontSize: '0.86rem', minWidth: '18px', textAlign: 'center' }}>
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItemQty(item.id, 1)}
                                    style={{
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: '6px',
                                      border: '1px solid #CBD5E1',
                                      background: '#FFFFFF',
                                      fontSize: '0.85rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    +
                                  </button>
                                </div>

                                {/* Row Total */}
                                <div style={{ textAlign: 'right', minWidth: '85px' }}>
                                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--c-primary)' }}>
                                    ${rowTotalUsd.toFixed(2)}
                                  </div>
                                  <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                                    Bs. {rowTotalVes.toFixed(2)}
                                  </div>
                                </div>

                                {/* Remove Button */}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFromCart(item.id)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--c-rose)',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                  title="Quitar ítem"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Accounting Breakdown */}
                    {cartItems.length > 0 && (
                      <div style={{
                        background: '#FAF8F5',
                        border: '1.5px solid #EEDCD5',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px',
                        marginBottom: '14px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 800, color: 'var(--c-primary)' }}>
                            Desglose Contable Fiscal (Bimoneda)
                          </span>
                          <span style={{ fontSize: '0.70rem', color: '#15803D', background: '#DCFCE7', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                            ✓ Precios con IVA Incluido
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.80rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Base Imponible Gravable:</span>
                            <strong>${cartTaxable16BaseUsd.toFixed(2)} ({ (cartTaxable16BaseUsd * config.vesExchangeRate).toFixed(2) } VES)</strong>
                          </div>
                          {cartExemptUsd > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0369A1' }}>
                              <span>Ventas Exentas (0% IVA):</span>
                              <strong>${cartExemptUsd.toFixed(2)} ({ (cartExemptUsd * config.vesExchangeRate).toFixed(2) } VES)</strong>
                            </div>
                          )}
                          {cartTax16Usd > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803D' }}>
                              <span>IVA Determinado (16% Incluido en PVP):</span>
                              <strong>${cartTax16Usd.toFixed(2)} ({ (cartTax16Usd * config.vesExchangeRate).toFixed(2) } VES)</strong>
                            </div>
                          )}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderTop: '1.5px solid #EEDCD5',
                            paddingTop: '6px',
                            marginTop: '3px',
                            fontSize: '0.96rem'
                          }}>
                            <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>Total Factura (PVP):</span>
                            <div style={{ textAlign: 'right' }}>
                              <strong style={{ color: 'var(--c-primary)', fontSize: '1.15rem' }}>
                                US${cartGrossTotalUsd.toFixed(2)}
                              </strong>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                                Bs. { (cartGrossTotalUsd * config.vesExchangeRate).toFixed(2) } VES
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* MODE B: VENTA RÁPIDA POR MONTO DIRECTO */}
                {billingMode === 'QUICK' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                    {/* Currency selector */}
                    <div className="form-group">
                      <label className="form-label">Moneda de Pago</label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setCurrency('USD')}
                          className="btn"
                          style={{
                            flex: 1,
                            padding: '9px',
                            background: currency === 'USD' ? 'var(--c-primary)' : '#FFFFFF',
                            color: currency === 'USD' ? '#fff' : 'var(--text-main)',
                            border: currency === 'USD' ? '1.5px solid var(--c-primary)' : '1px solid var(--border-subtle)',
                            borderBottom: currency === 'USD' ? '3px solid var(--c-accent)' : undefined
                          }}
                        >
                          USD ($ Dólar)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrency('VES')}
                          className="btn"
                          style={{
                            flex: 1,
                            padding: '9px',
                            background: currency === 'VES' ? 'var(--c-primary)' : '#FFFFFF',
                            color: currency === 'VES' ? '#fff' : 'var(--text-main)',
                            border: currency === 'VES' ? '1.5px solid var(--c-primary)' : '1px solid var(--border-subtle)',
                            borderBottom: currency === 'VES' ? '3px solid var(--c-accent)' : undefined
                          }}
                        >
                          VES (Bs. Digital)
                        </button>
                      </div>
                    </div>

                    {/* Amount input */}
                    <div className="form-group">
                      <label className="form-label">
                        Monto Total ({currency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input"
                        placeholder={currency === 'USD' ? 'Ej. 35.00' : 'Ej. 1380.00'}
                        value={amountInput}
                        onChange={(e) => setAmountInput(e.target.value)}
                        required={billingMode === 'QUICK'}
                        style={{ fontSize: '1.1rem', fontWeight: 700 }}
                      />
                    </div>
                  </div>
                )}

                {/* 3. SECCIÓN: APLICAR CUPÓN DE SALDO ANTERIOR */}
                <div style={{
                  background: '#FAF4EE',
                  border: '1.5px solid var(--c-primary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Gift size={20} color="var(--c-primary)" />
                      <div>
                        <strong style={{ fontSize: '0.94rem', color: 'var(--c-primary)' }}>
                          ¿El cliente desea canjear un premio de su tarjeta de sellos?
                        </strong>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          {(() => {
                            const clientCard = (identifiedClient?.loyaltyCards || []).find(c => isMatchStore(c.storeId, safeStore.id, c.storeName, safeStore.name));
                            const currentStamps = clientCard ? Number(clientCard.currentStamps || 0) : 0;
                            const targetStamps = clientCard ? Number(clientCard.stampsTarget || safeStore.stampsTarget || 6) : Number(safeStore.stampsTarget || 6);
                            return identifiedClient 
                              ? `Sellos acumulados en este local: ${currentStamps} de ${targetStamps} sellos`
                              : 'Identifica al cliente arriba para verificar beneficios y sellos acumulados';
                          })()}
                        </div>
                      </div>
                    </div>

                    {!activeQrCreditUsd && !wantsApplyCoupon && (
                      <button
                        type="button"
                        disabled={!identifiedClient}
                        onClick={() => setWantsApplyCoupon(true)}
                        className="btn btn-primary"
                        style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <QrCode size={15} />
                        <span>Habilitar Canje / Mostrar QR</span>
                      </button>
                    )}
                  </div>

                  {/* SECCIÓN DE CUPONES PROMOCIONALES / DESCUENTO DEL CLIENTE */}
                  {identifiedClient && clientAvailableCoupons.length > 0 && (
                    <div style={{
                      background: '#F0FDF4',
                      border: '1.5px solid #86EFAC',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      marginTop: '10px',
                      marginBottom: '10px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', fontWeight: 900, color: '#166534' }}>
                          <span>🎟️ Cupones Promocionales de este Cliente ({clientAvailableCoupons.length})</span>
                        </div>
                        <span style={{ fontSize: '0.70rem', color: '#15803D', fontWeight: 700 }}>
                          {selectedSaleCoupon ? '✓ 1 cupón en uso' : 'Selecciona para aplicar'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {clientAvailableCoupons.map(coupon => {
                          const isSelected = selectedSaleCoupon?.id === coupon.id;
                          return (
                            <div
                              key={coupon.id}
                              style={{
                                background: isSelected ? '#DCFCE7' : '#FFFFFF',
                                border: isSelected ? '2px solid #16A34A' : '1px solid #BBF7D0',
                                borderRadius: '10px',
                                padding: '9px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px'
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <strong style={{ fontSize: '0.86rem', color: '#14532D' }}>
                                    {coupon.rewardTitle || coupon.title}
                                  </strong>
                                  <span style={{
                                    fontSize: '0.70rem',
                                    fontFamily: 'monospace',
                                    background: '#F1F5F9',
                                    color: '#475569',
                                    padding: '1px 6px',
                                    borderRadius: '6px',
                                    fontWeight: 700
                                  }}>
                                    {coupon.voucherCode}
                                  </span>
                                  {coupon.isWelcomeCoupon && (
                                    <span style={{ fontSize: '0.66rem', background: '#FFEDD5', color: '#C2410C', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                                      Bienvenida 🎁
                                    </span>
                                  )}
                                </div>
                                {coupon.description && (
                                  <div style={{ fontSize: '0.72rem', color: '#166534', marginTop: '2px' }}>
                                    {coupon.description}
                                  </div>
                                )}
                              </div>
                              <div>
                                {isSelected ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#15803D' }}>
                                      ✓ Aplicado
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedSaleCoupon(null)}
                                      style={{
                                        background: '#FEE2E2',
                                        border: '1px solid #FCA5A5',
                                        color: '#B91C1C',
                                        padding: '4px 8px',
                                        borderRadius: '8px',
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Quitar
                                    </button>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedSaleCoupon(coupon)}
                                      className="btn"
                                      style={{
                                        background: '#16A34A',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        padding: '6px 10px',
                                        borderRadius: '8px',
                                        fontSize: '0.74rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)'
                                      }}
                                    >
                                      🛒 Usar con Venta
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRedeemCouponWithoutSale(coupon)}
                                      className="btn"
                                      style={{
                                        background: '#0F172A',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        padding: '6px 10px',
                                        borderRadius: '8px',
                                        fontSize: '0.74rem',
                                        fontWeight: 800,
                                        cursor: 'pointer'
                                      }}
                                      title="Canjear cupón directamente sin registrar monto de venta"
                                    >
                                      ⚡ Usar sin Venta
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Estado informativo si no tiene solicitudes pendientes */}
                  {identifiedClient && pendingRedemptionsForStore.length === 0 && !activeQrCreditUsd && clientAvailableCoupons.length === 0 && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontStyle: 'italic', marginTop: '8px' }}>
                      ℹ️ El cliente no tiene cupones ni solicitudes pendientes en este local. Acumulará +1 sello al completar su compra.
                    </div>
                  )}

                  {/* Panel activo cuando el cajero presiona "Habilitar Canje / Mostrar QR" */}
                  {wantsApplyCoupon && !activeQrCreditUsd && (
                    <div style={{
                      background: '#FFFFFF',
                      border: '1.5px dashed var(--c-primary)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '16px',
                      marginTop: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--c-primary)' }}>
                          📲 Canje de Premio o Acreditación por Mostrador
                        </div>
                        <button
                          type="button"
                          onClick={() => setWantsApplyCoupon(false)}
                          className="btn btn-outline"
                          style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                        >
                          Cerrar
                        </button>
                      </div>

                      <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', marginBottom: '14px', lineHeight: 1.45 }}>
                        Pide al cliente que muestre su <strong>código QR personal</strong> desde su app <strong>fidely CLUB</strong> o que escanee el código QR de mostrador para acreditar su sello o canjear sus premios acumulados.
                      </p>

                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setShowStoreQrModal(true)}
                          className="btn btn-secondary"
                          style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <QrCode size={16} />
                          <span>Mostrar QR de Mostrador en Grande</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPosCameraScanner(true)}
                          className="btn btn-primary"
                          style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Camera size={16} />
                          <span>Escanear QR de Cliente con Cámara</span>
                        </button>
                      </div>

                      {/* Lista de solicitudes entrantes de este cliente si las hay */}
                      {pendingRedemptionsForStore.length > 0 && (
                        <div style={{ marginTop: '14px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#15803D', marginBottom: '8px' }}>
                            🔔 Solicitudes de Cupón recibidas en mostrador:
                          </div>
                          {pendingRedemptionsForStore.map(req => (
                            <div key={req.id} style={{
                              background: '#F0FDF4',
                              border: '1.5px solid #86EFAC',
                              borderRadius: '8px',
                              padding: '10px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '10px',
                              marginBottom: '6px'
                            }}>
                              <div>
                                <strong style={{ fontSize: '0.9rem' }}>{req.clientName}</strong>
                                <div style={{ fontSize: '0.78rem', color: '#166534' }}>
                                  Cupón: {req.rewardTitle} (-{req.pointsCost} pts = <strong>-US${req.nominalValueUsd?.toFixed(2)}</strong>)
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleApprovePendingRedemption(req)}
                                className="btn btn-primary"
                                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                              >
                                ✓ Aprobar Cupón
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cupón ya aplicado con éxito */}
                  {activeQrCreditUsd > 0 && (
                    <div style={{
                      background: '#F0FDF4',
                      border: '2px solid #22C55E',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 16px',
                      marginTop: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: '#15803D',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          flexShrink: 0
                        }}>
                          <Check size={18} strokeWidth={3} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#14532D' }}>
                            ✓ Cupón de Descuento Aplicado: -US${activeQrCreditUsd.toFixed(2)}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#166534' }}>
                            Descontado del saldo de recompensas del cliente por visitas anteriores.
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleCancelApprovedQrCredit}
                        className="btn btn-outline"
                        style={{
                          padding: '5px 10px',
                          fontSize: '0.72rem',
                          color: '#9F1239',
                          borderColor: '#FECDD3',
                          background: '#FFFFFF'
                        }}
                      >
                        Quitar Cupón
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. RESUMEN DE COBRO Y ACLARACIÓN DE PUNTOS (CERO CONFUSIÓN) */}
                <div style={{
                  background: '#FFFFFF',
                  border: '2px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px',
                  marginBottom: '18px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.04)'
                }}>
                  {/* Bloque 1: TOTAL A COBRAR EN CAJA HOY */}
                  <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px', marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>
                      1. Monto a Cobrar en Caja Hoy
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.92rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Monto de la Compra:</span>
                      <span style={{ fontWeight: 700 }}>US${amountUsd.toFixed(2)} {currency === 'VES' && `(${amountVes.toFixed(2)} VES)`}</span>
                    </div>

                    {activeQrCreditUsd > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '0.92rem', color: '#15803D' }}>
                        <span>Descuento / Premio Aplicado:</span>
                        <span style={{ fontWeight: 800 }}>-US${activeQrCreditUsd.toFixed(2)}</span>
                      </div>
                    )}

                    {activeCouponDiscountUsd > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '0.92rem', color: '#15803D' }}>
                        <span>Cupón Promocional ({selectedSaleCoupon?.voucherCode}):</span>
                        <span style={{ fontWeight: 800 }}>-US${activeCouponDiscountUsd.toFixed(2)}</span>
                      </div>
                    )}

                    {selectedSaleCoupon && activeCouponDiscountUsd === 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '0.86rem', color: '#15803D' }}>
                        <span>Beneficio de Cupón ({selectedSaleCoupon?.voucherCode}):</span>
                        <span style={{ fontWeight: 800 }}>{selectedSaleCoupon.rewardTitle || selectedSaleCoupon.title} (✓ Se marcará USADO)</span>
                      </div>
                    )}

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginTop: '10px',
                      paddingTop: '10px',
                      borderTop: '1.5px dashed var(--border-subtle)'
                    }}>
                      <span style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        TOTAL A COBRAR EN CAJA:
                      </span>
                      <span style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--c-primary)' }}>
                        US${netAmountUsd.toFixed(2)}
                        {currency === 'VES' && (
                          <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-muted)', marginLeft: '6px' }}>
                            ({netAmountVes.toFixed(2)} VES)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Bloque 2: PUNTOS QUE ACUMULARÁ PARA SU PRÓXIMA COMPRA */}
                  <div style={{
                    background: isEligible ? '#FFFDF5' : '#F9FAFB',
                    border: isEligible ? '2px solid #F59E0B' : '1px solid #E5E7EB',
                    borderRadius: 'var(--radius-sm)',
                    padding: '14px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={18} color={isEligible ? '#15803D' : '#9CA3AF'} />
                        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: isEligible ? '#15803D' : 'var(--text-muted)' }}>
                          {isEligible ? '🎯 +1 SELLO DE FIDELIDAD ACREDITADO' : `Compra menor a US$${storeMinPurchase.toFixed(2)} no genera sello`}
                        </span>
                      </div>
                      {isEligible && (
                        <span className="badge badge-accent" style={{ fontSize: '0.78rem', fontWeight: 800 }}>
                          Tarjeta de Recompensas
                        </span>
                      )}
                    </div>

                    {/* Aclaración Anti-Confusión para el Vendedor */}
                    <div style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      background: isEligible ? '#F0FDF4' : '#F3F4F6',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      color: isEligible ? '#166534' : 'var(--text-dim)',
                      lineHeight: 1.45,
                      fontWeight: 600
                    }}>
                      {isEligible ? (
                        <>
                          🎯 <strong>Tarjeta de Sellos:</strong> Se sumará <strong>+1 sello</strong> a la tarjeta digital del cliente para ayudarle a desbloquear sus premios escalonados en este comercio.
                        </>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                          <span>ℹ️ Solo las compras a partir de US${storeMinPurchase.toFixed(2)} (definido por tu tienda) acreditan un sello en la tarjeta del cliente.</span>
                          <button
                            type="button"
                            onClick={() => setShowStoreProfileModal(true)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--c-primary)',
                              fontSize: '0.76rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              padding: '2px 4px'
                            }}
                          >
                            Modificar Mínimo
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Split Payment vs Fast Pay */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    type="button"
                    disabled={!identifiedClient || isDuplicateRef || rawAmount <= 0}
                    onClick={() => {
                      // Moneda por defecto para el primer campo
                      const initialMethod = currency === 'USD' ? 'cashUsd' : 'cashVes';
                      setSelectedPaymentMethod(initialMethod);
                      setMixedActiveMethods([initialMethod]);
                      setPaymentBreakdown({
                        cashUsd: initialMethod === 'cashUsd' ? netAmountUsd.toFixed(2) : '',
                        cashVes: initialMethod === 'cashVes' ? netAmountVes.toFixed(2) : '',
                        posDebitVes: '',
                        pagoMovilVes: '',
                        pagoMovilRef: '',
                        zelleUsd: '',
                        zelleRef: '',
                        transferVes: '',
                        transferRef: ''
                      });
                      setShowSplitPaymentModal(true);
                    }}
                    className="btn btn-accent"
                    style={{
                      width: '100%',
                      padding: '13px 18px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 4px 14px rgba(222, 139, 118, 0.35)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '1.02rem', fontWeight: 900 }}>
                      <Wallet size={19} color="#080018" />
                      <span>
                        💳 Cobro Mixto Multimoneda ($ y Bs.)
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, opacity: 0.9 }}>
                      Liquidar con Efectivo $, Efectivo Bs, Pago Móvil, Punto de Venta o Zelle
                    </div>
                  </button>

                  <button
                    type="submit"
                    disabled={!identifiedClient || isDuplicateRef || rawAmount <= 0}
                    className="btn btn-secondary"
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '0.86rem',
                      fontWeight: 700
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>
                      ⚡ Cobro Rápido Directo: US${netAmountUsd.toFixed(2)} ({netAmountVes.toFixed(2)} VES)
                      {rawAmount >= storeMinPurchase ? ' (+1 Sello)' : ''}
                    </span>
                  </button>
                </div>
              </form>
            </div>

            {/* Quick Shift Recap in Right Column */}
            <div className="glass-panel" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} color="var(--c-primary)" />
                  Actividad de Sucursal Hoy
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('SHIFT_SUMMARY')}
                  className="hide-on-mobile"
                  style={{ background: 'transparent', border: 'none', color: 'var(--c-primary)', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Ver Arqueo Completo →
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 90px), 1fr))', gap: '10px' }}>
                <div style={{ background: '#FAF8F5', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Ventas Hoy</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>{purchases.length}</div>
                </div>
                <div style={{ background: '#FAF8F5', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Total USD</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--c-primary)' }}>${shiftTotalUsd.toFixed(2)}</div>
                </div>
                <div style={{ background: '#FAF8F5', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Sellos Entregados</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#15803D' }}>+{shiftPointsIssued}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

          {/* MODULE 2: SOLICITUDES QR EN TIEMPO REAL */}
      {activeTab === 'PENDING_REQUESTS' && (
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header */}
          <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '20px', background: 'var(--c-secondary-soft)', color: 'var(--c-primary)', fontWeight: 800, fontSize: '0.75rem', marginBottom: '8px' }}>
                <Clock size={13} />
                <span>Cola en Tiempo Real • {safeStore.name}</span>
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 4px' }}>
                Solicitudes QR de Sellos & Recompensas
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                Cada vez que un cliente escanea el código QR de tu mostrador, su solicitud de sello aparece aquí para tu aprobación inmediata.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setActiveTab('QR_DISPLAY')}
                className="btn btn-secondary"
                style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <QrCode size={15} />
                <span>Ver QR de Mostrador</span>
              </button>
            </div>
          </div>

          {/* Pending Requests List */}
          {pendingRedemptionsForStore.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px 24px', textAlign: 'center' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--c-secondary-soft)',
                color: 'var(--c-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 6px' }}>
                ¡Todo al día! No hay solicitudes pendientes
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                Cuando un cliente escanee el QR del mostrador con la app móvil de fidely CLUB, escucharás una alerta sonora y verás aquí su solicitud de sello.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('QR_DISPLAY')}
                className="btn btn-primary"
                style={{ padding: '10px 20px', fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <QrCode size={16} />
                <span>Mostrar Código QR a los Clientes</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  background: 'var(--c-primary)',
                  color: '#FFFFFF',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '0.78rem'
                }}>
                  {pendingRedemptionsForStore.length}
                </span>
                <span>Solicitud(es) esperando tu validación:</span>
              </div>

              {pendingRedemptionsForStore.map(req => {
                const reqClient = clients.find(c => 
                  c.id === req.clientId || 
                  (c.cedula && req.clientDocId && String(c.cedula).trim() === String(req.clientDocId).trim())
                );
                const clientCard = (reqClient?.loyaltyCards || []).find(c => isMatchStore(c.storeId, safeStore.id, c.storeName, safeStore.name));
                const currentStamps = clientCard ? Number(clientCard.currentStamps || 0) : Number(req.currentStamps || 0);
                const targetStamps = clientCard ? Number(clientCard.stampsTarget || safeStore.stampsTarget || 6) : Number(req.stampsTarget || safeStore.stampsTarget || 6);
                const isRewardClaim = req.type === 'STAMP_REWARD_CLAIM' || 
                  req.isRewardClaim === true || 
                  req.claimType === 'REWARD' ||
                  (Boolean(req.rewardTitle) && !req.rewardTitle.includes('+1 Sello') && req.isStampRequest !== true && req.type !== 'STAMP_REQUEST');
                const isStamp = !isRewardClaim && (req.type === 'STAMP_REQUEST' || req.isStampRequest === true || req.rewardTitle?.includes('+1 Sello'));

                return (
                  <div
                    key={req.id}
                    className="glass-panel"
                    style={{
                      padding: '18px 20px',
                      borderLeft: isRewardClaim ? '5px solid #16A34A' : '5px solid var(--c-primary)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '16px',
                      background: isRewardClaim ? '#F0FDF4' : '#FFFFFF',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.04)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '240px', flex: 1 }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: isRewardClaim 
                          ? 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)' 
                          : 'linear-gradient(135deg, var(--c-primary) 0%, #DE8B76 100%)',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: isRewardClaim ? '1.4rem' : '1.05rem',
                        flexShrink: 0
                      }}>
                        {isRewardClaim ? '🎁' : (req.clientName?.slice(0, 2).toUpperCase() || 'CL')}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{req.clientName}</strong>
                          {req.clientDocId && (
                            <span className="badge badge-accent" style={{ fontSize: '0.72rem' }}>
                              Doc: {req.clientDocId}
                            </span>
                          )}
                          {isRewardClaim && (
                            <span style={{ fontSize: '0.7rem', background: '#DCFCE7', color: '#166534', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', border: '1px solid #86EFAC' }}>
                              CANJE DE PREMIO
                            </span>
                          )}
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                            {req.dateGenerated || req.date || 'Hoy'}
                          </span>
                        </div>

                        {isRewardClaim ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.96rem', fontWeight: 900, color: '#15803D' }}>
                              <span>🎁 Premio a entregar:</span>
                              <span style={{ color: 'var(--c-primary)', textDecoration: 'underline' }}>{req.rewardTitle}</span>
                              {req.voucherCode && (
                                <span className="badge" style={{ fontSize: '0.7rem', background: '#FEF3C7', color: '#92400E' }}>
                                  {req.voucherCode}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                              Costo: <strong>{req.stampsCost || targetStamps} sellos</strong> • Estado del socio en tu tienda: <strong>{currentStamps} sellos acumulados</strong>
                              <span style={{ color: '#15803D', fontWeight: 800, marginLeft: '6px' }}>
                                ✓ Al aprobar, entrégale el premio físico y se descontarán sus sellos.
                              </span>
                            </div>
                          </div>
                        ) : isStamp ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.86rem', fontWeight: 800, color: '#15803D' }}>
                              <span>📍 Solicitud de Sello Digital (+1 Sello)</span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Estado actual en tu tienda: <strong>{currentStamps} de {targetStamps} sellos</strong>
                              {currentStamps + 1 >= targetStamps ? (
                                <span style={{ color: '#B45309', fontWeight: 800, marginLeft: '6px' }}>
                                  🎉 ¡Al aprobar completará su tarjeta!
                                </span>
                              ) : null}
                            </div>
                            {/* Stamp visual dots */}
                            <div style={{ display: 'flex', gap: '5px', marginTop: '6px' }}>
                              {Array.from({ length: targetStamps }).map((_, sIdx) => {
                                const isFilled = sIdx < currentStamps;
                                const isNext = sIdx === currentStamps;
                                return (
                                  <div
                                    key={sIdx}
                                    style={{
                                      width: '20px',
                                      height: '20px',
                                      borderRadius: '50%',
                                      background: isFilled ? 'var(--c-primary)' : isNext ? '#FEF3C7' : '#F3F4F6',
                                      border: isNext ? '2px dashed #F59E0B' : '1px solid #E5E7EB',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '10px',
                                      color: isFilled ? '#FFF' : '#92400E',
                                      fontWeight: 800
                                    }}
                                    title={isFilled ? `Sello ${sIdx + 1}` : isNext ? 'Próximo sello a acreditar (+1)' : `Pendiente ${sIdx + 1}`}
                                  >
                                    {isFilled ? '✓' : isNext ? '+1' : sIdx + 1}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--c-primary)' }}>
                              🎁 Recompensa: {req.rewardTitle}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              Costo: {req.stampsCost || req.stampsRequired || 0} sellos
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (isRewardClaim) {
                            handleRejectStampRewardClaim(req);
                          } else if (isStamp) {
                            handleRejectStampRequest(req);
                          } else {
                            setSelectedPendingRedemption(req);
                            setShowRejectForm(true);
                          }
                        }}
                        className="btn btn-outline"
                        style={{
                          padding: '9px 16px',
                          fontSize: '0.82rem',
                          color: 'var(--c-rose)',
                          borderColor: '#FECDD3'
                        }}
                      >
                        ✕ Rechazar
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (isRewardClaim) {
                            handleApproveStampRewardClaim(req);
                          } else if (isStamp) {
                            handleApproveStampRequest(req);
                          } else {
                            handleApprovePendingRedemption(req);
                          }
                        }}
                        className="btn btn-accent"
                        style={{
                          padding: '10px 20px',
                          fontSize: '0.88rem',
                          fontWeight: 900,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: isRewardClaim ? '#16A34A' : undefined,
                          borderColor: isRewardClaim ? '#15803D' : undefined,
                          boxShadow: isRewardClaim 
                            ? '0 4px 12px rgba(22, 163, 74, 0.3)' 
                            : '0 4px 12px rgba(156, 56, 42, 0.2)'
                        }}
                      >
                        <CheckCircle2 size={16} />
                        <span>{isRewardClaim ? '🎁 Aprobar y Entregar Premio' : isStamp ? '✓ Aprobar Sello (+1)' : '✓ Aprobar Canje'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Approved Stamps & Redemptions History for Today */}
          {(() => {
            const approvedToday = redemptions.filter(r => 
              r.status === 'APROBADO' && 
              isMatchStore(r.storeId, safeStore.id, r.storeName, safeStore.name)
            ).slice(0, 10);

            if (approvedToday.length === 0) return null;

            return (
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Award size={16} color="var(--c-primary)" />
                  <span>Sellos & Canjes Aprobados Recientes ({safeStore.name})</span>
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {approvedToday.map(appr => (
                    <div
                      key={appr.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        background: '#F9FAFB',
                        borderRadius: '10px',
                        fontSize: '0.82rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: '#DCFCE7',
                          color: '#15803D',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: '12px'
                        }}>
                          ✓
                        </div>
                        <div>
                          <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{appr.clientName}</span>
                          <span style={{ color: 'var(--text-dim)', marginLeft: '8px' }}>
                            {appr.approvedAt || appr.dateUsed || appr.date}
                          </span>
                        </div>
                      </div>

                      <div style={{ fontWeight: 800, color: '#15803D' }}>
                        {(appr.type === 'STAMP_REWARD_CLAIM' || appr.isRewardClaim || (appr.rewardTitle && !appr.rewardTitle.includes('+1 Sello')))
                          ? `🎁 Premio Canjeado: ${appr.rewardTitle || 'Premio'}`
                          : `+1 Sello Digital Acreditado`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      
          {/* MODULE 3: CATÁLOGO DE PRODUCTOS Y PRECIOS */}
          {activeTab === 'PRODUCTS_CATALOG' && (
            <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Header Panel */}
              <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '20px', background: 'var(--c-secondary-soft)', color: 'var(--c-primary)', fontWeight: 800, fontSize: '0.75rem', marginBottom: '8px' }}>
                    <Package size={13} />
                    <span>Inventario & Lista de Precios • {safeStore.name}</span>
                  </div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 4px' }}>
                    Catálogo de Productos y Servicios
                  </h2>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                    Configura tus ítems, precios en USD/Bs y alícuota de IVA para agilizar las ventas en caja y el cálculo de sellos.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProduct(null);
                      setProductForm({ code: '', name: '', category: 'Servicio', priceUsd: 10, taxType: 'GRAVABLE_16', isService: true, stock: 100 });
                      setShowProductModal(true);
                    }}
                    className="btn btn-accent"
                    style={{ padding: '10px 18px', fontSize: '0.84rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={16} />
                    <span>+ Nuevo Producto / Servicio</span>
                  </button>
                </div>
              </div>

              {/* Stats & Search Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#FFFFFF', padding: '14px 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Total Ítems en Catálogo
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--c-primary)', marginTop: '2px' }}>
                    {storeProducts.length}
                  </div>
                </div>

                <div style={{ background: '#FFFFFF', padding: '14px 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Tasa Oficial del Día (VES)
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#15803D', marginTop: '2px' }}>
                    1 USD = Bs. {config.vesExchangeRate?.toFixed(2)}
                  </div>
                </div>

                <div style={{ background: '#FFFFFF', padding: '14px 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                      Modo de Facturación
                    </div>
                    <div style={{ fontSize: '0.90rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                      {billingMode === 'ITEMS' ? '🛒 Por Ítems del Catálogo' : '💵 Monto Libre Rápido'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setBillingMode('ITEMS');
                      setActiveTab('REGISTER_SALE');
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.74rem' }}
                  >
                    Ir a Cobrar
                  </button>
                </div>
              </div>

              {/* Search & Filter */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 240px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Buscar por nombre, código o categoría..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    style={{ paddingLeft: '36px' }}
                  />
                  {productSearch && (
                    <button
                      onClick={() => setProductSearch('')}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Products List / Table */}
              {storeProducts.length === 0 ? (
                <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center', background: '#FFFFFF' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'var(--c-secondary-soft)',
                    color: 'var(--c-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px'
                  }}>
                    <Package size={32} />
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 6px' }}>
                    Tu catálogo de productos está vacío
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                    Registra tus productos o servicios con su precio en dólares y tipo de IVA (16% o Exento) para facturar rápido en caja.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProduct(null);
                      setProductForm({ code: '', name: '', category: 'Servicio', priceUsd: 10, taxType: 'GRAVABLE_16', isService: true, stock: 100 });
                      setShowProductModal(true);
                    }}
                    className="btn btn-primary"
                    style={{ padding: '10px 20px', fontSize: '0.86rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={16} />
                    <span>+ Crear Primer Producto / Servicio</span>
                  </button>
                </div>
              ) : (
                <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', background: '#FFFFFF' }}>
                  <div className="custom-table-container">
                    <table className="custom-table" style={{ fontSize: '0.82rem' }}>
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Producto / Servicio</th>
                          <th>Categoría</th>
                          <th>Precio USD</th>
                          <th>Ref. Bolívares (VES)</th>
                          <th>IVA Alícuota</th>
                          <th style={{ textAlign: 'right' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {storeProducts
                          .filter(p => !productSearch.trim() || 
                            p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
                            (p.code && p.code.toLowerCase().includes(productSearch.toLowerCase())) ||
                            (p.category && p.category.toLowerCase().includes(productSearch.toLowerCase()))
                          )
                          .map(p => {
                            const pVes = ((parseFloat(p.priceUsd) || 0) * (config.vesExchangeRate || 1)).toFixed(2);
                            return (
                              <tr key={p.id}>
                                <td>
                                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                    {p.code || 'S/C'}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{
                                      width: '30px',
                                      height: '30px',
                                      borderRadius: '8px',
                                      background: p.isService ? '#EEF2FF' : '#FEF3C7',
                                      color: p.isService ? '#4F46E5' : '#D97706',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '13px',
                                      flexShrink: 0
                                    }}>
                                      {p.isService ? '✂️' : '📦'}
                                    </div>
                                    <div>
                                      <strong style={{ color: 'var(--text-main)', fontSize: '0.88rem' }}>{p.name}</strong>
                                      <div style={{ fontSize: '0.70rem', color: 'var(--text-dim)' }}>
                                        {p.isService ? 'Servicio' : `Stock: ${p.stock ?? 'N/A'}`}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span className="badge badge-accent" style={{ fontSize: '0.72rem' }}>
                                    {p.category || 'General'}
                                  </span>
                                </td>
                                <td>
                                  <strong style={{ color: 'var(--c-primary)', fontSize: '0.94rem' }}>
                                    ${parseFloat(p.priceUsd || 0).toFixed(2)}
                                  </strong>
                                </td>
                                <td>
                                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                                    Bs. {pVes}
                                  </span>
                                </td>
                                <td>
                                  <span style={{
                                    fontSize: '0.70rem',
                                    fontWeight: 800,
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    background: p.taxType === 'EXENTO_0' ? '#E0F2FE' : '#DCFCE7',
                                    color: p.taxType === 'EXENTO_0' ? '#0369A1' : '#15803D'
                                  }}>
                                    {p.taxType === 'EXENTO_0' ? 'Exento (0%)' : 'Gravable (16%)'}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleAddToCart(p)}
                                      className="btn btn-secondary"
                                      style={{ padding: '5px 10px', fontSize: '0.74rem' }}
                                      title="Agregar a la factura actual"
                                    >
                                      <ShoppingCart size={13} />
                                      <span style={{ marginLeft: '4px' }}>Cobrar</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingProduct(p);
                                        setProductForm({
                                          code: p.code || '',
                                          name: p.name || '',
                                          category: p.category || 'Servicio',
                                          priceUsd: p.priceUsd || 10,
                                          taxType: p.taxType || 'GRAVABLE_16',
                                          isService: Boolean(p.isService),
                                          stock: p.stock ?? 100
                                        });
                                        setShowProductModal(true);
                                      }}
                                      className="btn btn-outline"
                                      style={{ padding: '5px 8px', fontSize: '0.74rem' }}
                                      title="Editar producto"
                                    >
                                      <Edit3 size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteProduct(p.id)}
                                      className="btn btn-outline"
                                      style={{ padding: '5px 8px', fontSize: '0.74rem', color: 'var(--c-rose)', borderColor: '#FECDD3' }}
                                      title="Eliminar producto"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODULE 5: ARQUEO Y CIERRE DE TURNO */}
          {activeTab === 'SHIFT_SUMMARY' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Turno Header Card */}
              <div className="glass-panel" style={{ padding: '22px 24px', background: 'linear-gradient(135deg, #FAF8F5 0%, #FFFFFF 100%)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span className="badge badge-accent" style={{ fontWeight: 800 }}>TURNO EN CURSO</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Fecha: <strong>{todayDateStr}</strong>
                      </span>
                    </div>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 4px' }}>
                      Cierre y Arqueo de Caja • {safeStore.name}
                    </h2>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0 }}>
                      Cajero responsable: <strong style={{ color: 'var(--text-main)' }}>{cashierDisplayName}</strong> • Sede: {safeStore.city || 'Central'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="btn btn-secondary"
                      style={{ padding: '9px 16px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '7px' }}
                    >
                      <Printer size={15} />
                      <span>Imprimir Arqueo</span>
                    </button>

                    {onLogout && (
                      <button
                        type="button"
                        onClick={onLogout}
                        className="btn btn-outline"
                        style={{ padding: '9px 16px', fontSize: '0.82rem', color: 'var(--c-rose)', borderColor: '#FECDD3', display: 'inline-flex', alignItems: 'center', gap: '7px' }}
                      >
                        <LogOut size={15} />
                        <span>Cerrar Turno</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 4 Key Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
                <div className="glass-panel" style={{ padding: '18px 20px', background: '#FFFFFF' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                      Ventas Procesadas
                    </span>
                    <span style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--c-secondary-soft)', color: 'var(--c-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Receipt size={17} />
                    </span>
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1.1 }}>
                    {validStorePurchases.length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {shiftUniqueClientsCount} clientes únicos fidelizados
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '18px 20px', background: '#FFFFFF' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                      Total Facturado USD
                    </span>
                    <span style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <DollarSign size={17} />
                    </span>
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--c-primary)', lineHeight: 1.1 }}>
                    ${shiftTotalUsd.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    ≈ Bs. {shiftTotalVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '18px 20px', background: '#FFFFFF' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                      Puntos Acreditados
                    </span>
                    <span style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#DCFCE7', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Sparkles size={17} />
                    </span>
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#15803D', lineHeight: 1.1 }}>
                    +{shiftPointsIssued}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    pts emitidos en este local
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '18px 20px', background: '#FFFFFF' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                      Tasa BCV del Turno
                    </span>
                    <span style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FAF8F5', color: 'var(--c-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <RefreshCw size={16} className={isFetchingRate ? 'spin-icon' : ''} />
                    </span>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1.1 }}>
                    {config.vesExchangeRate} <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>VES/USD</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {dolarRateInfo?.isFallback ? 'Tasa referencial' : 'Oficial Banco Central'}
                  </div>
                </div>
              </div>

              {/* Today's Sales Table with Live Search */}
              <div className="glass-panel" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Receipt size={17} color="var(--c-primary)" />
                      Detalle de Facturas & Ventas del Turno
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                      Mostrando {filteredShiftPurchases.length} de {safeStorePurchases.length} operaciones registradas
                    </p>
                  </div>

                  <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
                    <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                    <input
                      type="text"
                      value={shiftSearchQuery}
                      onChange={(e) => setShiftSearchQuery(e.target.value)}
                      placeholder="Buscar por cliente o factura..."
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 34px',
                        fontSize: '0.82rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        outline: 'none',
                        background: '#FAF8F5'
                      }}
                    />
                  </div>
                </div>

                {filteredShiftPurchases.length === 0 ? (
                  <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {shiftSearchQuery ? 'No se encontraron facturas con ese criterio de búsqueda.' : 'Aún no hay compras registradas en este turno.'}
                  </div>
                ) : (
                  <div className="custom-table-container">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Factura / Ref</th>
                          <th>Cliente</th>
                          <th>Fecha / Hora</th>
                          <th>Monto USD</th>
                          <th>Monto VES</th>
                          <th>Puntos</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredShiftPurchases.map(p => {
                          const amt = p.netAmountUsd || p.amountUsd;
                          const vesAmt = amt * config.vesExchangeRate;
                          return (
                            <tr key={p.id}>
                              <td><strong>{p.reference}</strong></td>
                              <td>{p.clientName}</td>
                              <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{p.date}</td>
                              <td><strong style={{ color: 'var(--c-primary)' }}>${amt.toFixed(2)}</strong></td>
                              <td style={{ fontSize: '0.82rem' }}>Bs. {vesAmt.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td>
                                <span className="badge badge-accent">+{p.pointsEarned} pts</span>
                              </td>
                              <td>
                                <span className={`badge ${
                                  p.status === 'VALIDADA' ? 'badge-emerald' : 
                                  p.status === 'DEVUELTA' ? 'badge-rose' : 'badge-primary'
                                }`}>
                                  {p.status}
                                </span>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => setCompletedTicket({
                                    reference: p.reference,
                                    storeName: safeStore.name,
                                    clientName: p.clientName,
                                    amountUsd: p.amountUsd,
                                    discountUsd: p.discountUsd || 0,
                                    netAmountUsd: amt,
                                    pointsEarned: p.pointsEarned,
                                    date: p.date
                                  })}
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  title="Reimprimir o ver ticket"
                                >
                                  <Receipt size={12} />
                                  <span>Ticket</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODULE: DIFUSIÓN Y PROMOCIONES PUSH A CLIENTES FIDELIZADOS */}
          {activeTab === 'PROMOTIONS' && (
            <div style={{ maxWidth: '980px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Audience Banner */}
              <div className="glass-panel" style={{
                background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                color: '#FFFFFF',
                padding: '24px 28px',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #DE8B76 0%, #9C382A 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 14px rgba(156, 56, 42, 0.4)'
                  }}>
                    <Megaphone size={26} color="#FFFFFF" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h2 style={{ fontSize: '1.30rem', fontWeight: 900, margin: 0, color: '#FFFFFF' }}>
                        Promociones Push a tus Clientes
                      </h2>
                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '999px',
                        background: '#22C55E',
                        color: '#FFFFFF'
                      }}>
                        Segmentación Exclusiva
                      </span>
                    </div>
                    <p style={{ fontSize: '0.84rem', color: '#94A3B8', margin: 0 }}>
                      Envía anuncios, ofertas y avisos de sellos dobles. Llegará <strong>exclusivamente</strong> a los clientes que tienen tu tarjeta de sellos.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {/* Clientes Fidelizados */}
                  <div style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    padding: '12px 20px',
                    borderRadius: '16px',
                    textAlign: 'center',
                    minWidth: '120px'
                  }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#F8FAFC', lineHeight: 1 }}>
                      {clientsWithStoreCard.length}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Clientes Fidelizados
                    </div>
                  </div>

                  {/* Cupo Push Mensual */}
                  <div style={{
                    background: isMonthlyLimitReached ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.08)',
                    border: isMonthlyLimitReached ? '1.5px solid #EF4444' : '1px solid rgba(255,255,255,0.15)',
                    padding: '12px 20px',
                    borderRadius: '16px',
                    textAlign: 'center',
                    minWidth: '130px'
                  }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: isMonthlyLimitReached ? '#FCA5A5' : '#F8FAFC', lineHeight: 1 }}>
                      {currentMonthPushesCount} <span style={{ fontSize: '0.9rem', color: '#94A3B8', fontWeight: 700 }}>/ {monthlyLimit > 0 ? monthlyLimit : '∞'}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: isMonthlyLimitReached ? '#FCA5A5' : '#94A3B8', fontWeight: 700, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {isMonthlyLimitReached ? '⛔ Límite Mensual' : 'Envíos este Mes'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Alerta de Límite Mensual Alcanzado si aplica */}
              {isMonthlyLimitReached && (
                <div style={{
                  background: '#FEF2F2',
                  border: '1.5px solid #FCA5A5',
                  padding: '14px 18px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <AlertCircle size={22} color="#DC2626" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: '0.82rem', color: '#991B1B', lineHeight: 1.45 }}>
                    <strong>Límite mensual de difusiones push alcanzado:</strong> Tu local ha utilizado los <strong>{monthlyLimit}</strong> envíos permitidos para este mes calendario según las políticas comerciales configuradas por la administración. Podrás volver a enviar notificaciones push a partir del 1° del próximo mes.
                  </div>
                </div>
              )}

              {/* Grid: Formulario + Vista Previa Móvil */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
                
                {/* Formulario de Creación */}
                <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF', borderRadius: '20px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={18} color="var(--c-primary)" />
                    <span>Redactar Notificación</span>
                  </h3>

                  <form onSubmit={handlePublishPromotion} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    
                    {/* Tipo de Promoción */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>
                        Tipo de Anuncio
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                        {[
                          { id: 'PROMO', label: '📢 Promo General' },
                          { id: 'DOBLE_SELLO', label: '⭐ Doble Sello Hoy' },
                          { id: 'DESCUENTO', label: '🏷️ Descuento Especial' },
                          { id: 'NUEVO_PREMIO', label: '🎁 Nuevo Premio' },
                        ].map((type) => (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => setPromoForm(prev => ({ ...prev, badgeType: type.id }))}
                            style={{
                              padding: '8px 10px',
                              borderRadius: '10px',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              border: promoForm.badgeType === type.id ? '2px solid var(--c-primary)' : '1px solid var(--border-subtle)',
                              background: promoForm.badgeType === type.id ? 'var(--c-secondary-soft)' : '#FAF8F5',
                              color: promoForm.badgeType === type.id ? 'var(--c-primary)' : 'var(--text-muted)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Título */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          Título de la Notificación *
                        </label>
                        <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                          {promoForm.title.length}/60
                        </span>
                      </div>
                      <input
                        type="text"
                        maxLength={60}
                        placeholder="Ej: ¡2x1 en cortes este fin de semana!"
                        value={promoForm.title}
                        onChange={(e) => setPromoForm(prev => ({ ...prev, title: e.target.value }))}
                        className="form-input"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', fontSize: '0.86rem' }}
                        required
                      />
                    </div>

                    {/* Mensaje */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          Mensaje o Descripción *
                        </label>
                        <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                          {promoForm.message.length}/160
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        maxLength={160}
                        placeholder="Ej: Visítanos hoy con tu tarjeta de sellos y duplica tus visitas en cualquier servicio de la casa."
                        value={promoForm.message}
                        onChange={(e) => setPromoForm(prev => ({ ...prev, message: e.target.value }))}
                        className="form-input"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', fontSize: '0.84rem', resize: 'none' }}
                        required
                      />
                    </div>

                    {/* Imagen opcional */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>
                        URL de Imagen / Banner (Opcional)
                      </label>
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/... o enlace de tu foto"
                        value={promoForm.imageUrl}
                        onChange={(e) => setPromoForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                        className="form-input"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', fontSize: '0.84rem' }}
                      />
                    </div>

                    
                    
                    {/* Límite de Personas a quien Enviar el Push */}
                    <div style={{ background: '#FAF8F5', padding: '14px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <BellRing size={15} color="var(--c-primary)" />
                          <span>Destinatarios de la Notificación Push</span>
                        </label>
                        <span style={{ fontSize: '0.70rem', color: promoForm.targetAudienceType === 'LIMITED' ? 'var(--c-primary)' : '#16A34A', fontWeight: 800 }}>
                          {promoForm.targetAudienceType === 'LIMITED' ? `Máx. ${promoForm.maxRecipients} clientes` : `Todos (${clientsWithStoreCard.length})`}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: promoForm.targetAudienceType === 'LIMITED' ? '10px' : '0' }}>
                        <button
                          type="button"
                          onClick={() => setPromoForm(prev => ({ ...prev, targetAudienceType: 'ALL' }))}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '10px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            border: promoForm.targetAudienceType !== 'LIMITED' ? '2px solid var(--c-primary)' : '1px solid var(--border-subtle)',
                            background: promoForm.targetAudienceType !== 'LIMITED' ? 'var(--c-secondary-soft)' : '#FFFFFF',
                            color: promoForm.targetAudienceType !== 'LIMITED' ? 'var(--c-primary)' : 'var(--text-muted)'
                          }}
                        >
                          👥 A todos mis fidelizados
                        </button>
                        <button
                          type="button"
                          onClick={() => setPromoForm(prev => ({ ...prev, targetAudienceType: 'LIMITED' }))}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '10px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            border: promoForm.targetAudienceType === 'LIMITED' ? '2px solid var(--c-primary)' : '1px solid var(--border-subtle)',
                            background: promoForm.targetAudienceType === 'LIMITED' ? 'var(--c-secondary-soft)' : '#FFFFFF',
                            color: promoForm.targetAudienceType === 'LIMITED' ? 'var(--c-primary)' : 'var(--text-muted)'
                          }}
                        >
                          🎯 Limitar personas
                        </button>
                      </div>

                      {promoForm.targetAudienceType === 'LIMITED' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#FFFFFF', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                          <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                            Enviar push a máximo:
                          </label>
                          <input
                            type="number"
                            min="1"
                            max={maxRecipientsCap > 0 ? Math.min(clientsWithStoreCard.length, maxRecipientsCap) : clientsWithStoreCard.length}
                            value={promoForm.maxRecipients}
                            onChange={(e) => setPromoForm(prev => ({ ...prev, maxRecipients: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                            className="form-input"
                            style={{ width: '80px', padding: '6px 10px', borderRadius: '8px', fontSize: '0.86rem', fontWeight: 900, textAlign: 'center' }}
                          />
                          <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                            personas de tu base ({clientsWithStoreCard.length} fidelizados)
                          </span>
                        </div>
                      )}

                      {maxRecipientsCap > 0 && (
                        <div style={{ fontSize: '0.68rem', color: '#B45309', marginTop: '6px', fontWeight: 700 }}>
                          🔒 Límite de la plataforma: máximo {maxRecipientsCap} destinatarios por envío.
                        </div>
                      )}
                    </div>

                    {/* Disponibilidad y Límite de Cupos */}
                    <div style={{ background: '#FAF8F5', padding: '14px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={15} color="var(--c-primary)" />
                          <span>Límite de Personas / Cupos Disponibles</span>
                        </label>
                        <span style={{ fontSize: '0.70rem', color: promoForm.isUnlimited ? '#16A34A' : 'var(--text-muted)', fontWeight: 800 }}>
                          {promoForm.isUnlimited ? '✨ Sin límite' : `${promoForm.totalStock} cupones máx.`}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: promoForm.isUnlimited ? '0' : '10px' }}>
                        <button
                          type="button"
                          onClick={() => setPromoForm(prev => ({ ...prev, isUnlimited: false }))}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '10px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            border: !promoForm.isUnlimited ? '2px solid var(--c-primary)' : '1px solid var(--border-subtle)',
                            background: !promoForm.isUnlimited ? 'var(--c-secondary-soft)' : '#FFFFFF',
                            color: !promoForm.isUnlimited ? 'var(--c-primary)' : 'var(--text-muted)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          👥 Con límite de cupos
                        </button>
                        <button
                          type="button"
                          onClick={() => setPromoForm(prev => ({ ...prev, isUnlimited: true }))}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '10px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            border: promoForm.isUnlimited ? '2px solid var(--c-primary)' : '1px solid var(--border-subtle)',
                            background: promoForm.isUnlimited ? 'var(--c-secondary-soft)' : '#FFFFFF',
                            color: promoForm.isUnlimited ? 'var(--c-primary)' : 'var(--text-muted)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          ✨ Sin límite de personas
                        </button>
                      </div>

                      {!promoForm.isUnlimited && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#FFFFFF', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                          <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                            Cantidad total:
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            value={promoForm.totalStock}
                            onChange={(e) => setPromoForm(prev => ({ ...prev, totalStock: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                            className="form-input"
                            style={{ width: '80px', padding: '6px 10px', borderRadius: '8px', fontSize: '0.86rem', fontWeight: 900, textAlign: 'center' }}
                            required={!promoForm.isUnlimited}
                          />
                          <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                            Se reducirá con cada cliente que lo tome hasta llegar a 0.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Vigencia y Fecha Límite */}
                    <div style={{ background: '#FAF8F5', padding: '14px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={15} color="var(--c-primary)" />
                          <span>Vigencia del Cupón</span>
                        </label>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setPromoForm(prev => ({ ...prev, validityType: 'UNTIL_DATE' }))}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '10px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            border: promoForm.validityType === 'UNTIL_DATE' ? '2px solid var(--c-primary)' : '1px solid var(--border-subtle)',
                            background: promoForm.validityType === 'UNTIL_DATE' ? 'var(--c-secondary-soft)' : '#FFFFFF',
                            color: promoForm.validityType === 'UNTIL_DATE' ? 'var(--c-primary)' : 'var(--text-muted)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          📅 Válido hasta la fecha
                        </button>
                        <button
                          type="button"
                          onClick={() => setPromoForm(prev => ({ ...prev, validityType: 'SINGLE_DAY' }))}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '10px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            border: promoForm.validityType === 'SINGLE_DAY' ? '2px solid var(--c-primary)' : '1px solid var(--border-subtle)',
                            background: promoForm.validityType === 'SINGLE_DAY' ? 'var(--c-secondary-soft)' : '#FFFFFF',
                            color: promoForm.validityType === 'SINGLE_DAY' ? 'var(--c-primary)' : 'var(--text-muted)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          ⚡ Solo por el día
                        </button>
                      </div>

                      <div>
                        <input
                          type="date"
                          min={new Date().toISOString().slice(0, 10)}
                          value={promoForm.validityDate}
                          onChange={(e) => setPromoForm(prev => ({ ...prev, validityDate: e.target.value }))}
                          className="form-input"
                          style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', fontSize: '0.84rem', fontWeight: 800, background: '#FFFFFF' }}
                          required
                        />
                      </div>
                    </div>

                    {/* Botón de Enviar */}
                    <button
                      type="submit"
                      disabled={isSendingPromo || isMonthlyLimitReached || !promoForm.title.trim() || !promoForm.message.trim()}
                      className="btn btn-primary"
                      style={{
                        marginTop: '8px',
                        width: '100%',
                        padding: '13px 18px',
                        fontSize: '0.90rem',
                        fontWeight: 900,
                        borderRadius: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: isMonthlyLimitReached
                          ? '#94A3B8'
                          : 'linear-gradient(135deg, #15803D 0%, #16A34A 100%)',
                        border: 'none',
                        boxShadow: isMonthlyLimitReached ? 'none' : '0 4px 14px rgba(22, 163, 74, 0.3)',
                        opacity: isSendingPromo || isMonthlyLimitReached ? 0.75 : 1,
                        cursor: isMonthlyLimitReached ? 'not-allowed' : (isSendingPromo ? 'wait' : 'pointer')
                      }}
                    >
                      <Send size={16} />
                      <span>
                        {isSendingPromo
                          ? 'Disparando Cloud Function...'
                          : (isMonthlyLimitReached
                              ? '⛔ Límite mensual de envíos push alcanzado'
                              : `Enviar Push a mis ${promoForm.targetAudienceType === 'LIMITED' ? Math.min(promoForm.maxRecipients, clientsWithStoreCard.length) : clientsWithStoreCard.length} Clientes`)}
                      </span>
                    </button>
                  </form>
                </div>

                {/* Vista Previa Móvil (Smartphone Notification Mockup) */}
                <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF', borderRadius: '20px', display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Eye size={18} color="var(--c-primary)" />
                    <span>Vista Previa en el Celular del Cliente</span>
                  </h3>

                  <div style={{
                    flex: 1,
                    background: '#0F172A',
                    borderRadius: '24px',
                    padding: '24px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
                    border: '4px solid #334155'
                  }}>
                    {/* Phone Status Bar */}
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '0.68rem', fontWeight: 700, marginBottom: '20px', padding: '0 8px' }}>
                      <span>9:41</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span>5G</span>
                        <span>100%</span>
                      </div>
                    </div>

                    {/* Push Notification Card */}
                    <div style={{
                      width: '100%',
                      maxWidth: '320px',
                      background: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '16px',
                      padding: '12px 14px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.4)',
                      animation: 'fadeIn 0.2s ease'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '5px',
                            background: 'var(--c-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                            fontSize: '0.62rem',
                            fontWeight: 900
                          }}>
                            FC
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0F172A' }}>
                            {currentStoreObj.name}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.62rem', color: '#64748B' }}>Ahora</span>
                      </div>

                      <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#0F172A', marginBottom: '3px' }}>
                        {promoForm.title.trim() || '📢 ¡Promoción especial en tienda!'}
                      </div>

                      <div style={{ fontSize: '0.76rem', color: '#334155', lineHeight: 1.35, marginBottom: promoForm.imageUrl ? '8px' : '0' }}>
                        {promoForm.message.trim() || 'Presenta tu tarjeta de fidelización en caja para aprovechar esta oferta exclusiva para clientes aliados.'}
                      </div>

                      {promoForm.imageUrl && (
                        <div style={{ width: '100%', height: '110px', borderRadius: '10px', overflow: 'hidden', marginTop: '6px' }}>
                          <img
                            src={promoForm.imageUrl}
                            alt="Banner promo"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </div>
                      )}
                      {/* Badge de Cupo y Vigencia en la Notificación */}
                      <div style={{
                        marginTop: '10px',
                        paddingTop: '8px',
                        borderTop: '1px dashed #CBD5E1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        flexWrap: 'wrap',
                        gap: '6px'
                      }}>
                        <span style={{ color: '#16A34A', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          🎟️ {promoForm.isUnlimited ? 'Cupos ilimitados' : `${promoForm.totalStock} cupos disp.`}
                        </span>
                        <span style={{ color: '#64748B' }}>
                          {promoForm.validityType === 'SINGLE_DAY' ? `Solo el ${promoForm.validityDate}` : `Hasta el ${promoForm.validityDate}`}
                        </span>
                      </div>
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: '20px', color: '#64748B', fontSize: '0.68rem', textAlign: 'center' }}>
                      🔒 Se envía únicamente a los teléfonos con tu tarjeta activa.
                    </div>
                  </div>
                </div>
              </div>

              {/* Historial de Promociones Enviadas y Gestión de Vencidas */}
              <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF', borderRadius: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <History size={20} color="var(--c-primary)" />
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                        Gestión de Promociones de {currentStoreObj.name}
                      </h3>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                        Las promociones vigentes se muestran a tus clientes; al vencer su fecha o agotarse pasan automáticamente al historial.
                      </p>
                    </div>
                  </div>

                  {/* Selector de Pestañas: Activas vs Historial de Vencidas */}
                  <div style={{
                    display: 'flex',
                    background: '#F1F5F9',
                    padding: '4px',
                    borderRadius: '12px',
                    gap: '4px'
                  }}>
                    <button
                      type="button"
                      onClick={() => setPromoSubTab('ACTIVES')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '9px',
                        border: 'none',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: promoSubTab === 'ACTIVES' ? '#FFFFFF' : 'transparent',
                        color: promoSubTab === 'ACTIVES' ? '#15803D' : '#64748B',
                        boxShadow: promoSubTab === 'ACTIVES' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16A34A' }} />
                      <span>Promociones Activas ({activePromotionsList.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPromoSubTab('HISTORY')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '9px',
                        border: 'none',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: promoSubTab === 'HISTORY' ? '#FFFFFF' : 'transparent',
                        color: promoSubTab === 'HISTORY' ? 'var(--c-primary)' : '#64748B',
                        boxShadow: promoSubTab === 'HISTORY' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>📁 Historial Vencidas ({expiredPromotionsList.length})</span>
                    </button>
                  </div>
                </div>

                {/* TAB 1: ACTIVAS */}
                {promoSubTab === 'ACTIVES' && (
                  activePromotionsList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                      <Megaphone size={34} style={{ opacity: 0.35, margin: '0 auto 8px' }} />
                      <p style={{ fontSize: '0.86rem', margin: 0, fontWeight: 700 }}>
                        No tienes promociones activas actualmente.
                      </p>
                      <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Redacta una promoción arriba para difundirla por push a tus clientes o revisa el historial de vencidas para reactivar una anterior.
                      </p>
                    </div>
                  ) : (
                    <div className="promo-table-wrapper">
                      <table className="promo-custom-table">
                        <thead>
                          <tr style={{ background: '#FAF8F5', borderBottom: '1.5px solid #EDE2D5' }}>
                            <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', width: '42%' }}>
                              Promoción
                            </th>
                            <th style={{ padding: '12px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', width: '20%' }}>
                              Cupos & Stock
                            </th>
                            <th style={{ padding: '12px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', width: '20%' }}>
                              Vigencia & Difusión
                            </th>
                            <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: '0.72rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', width: '18%' }}>
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {activePromotionsList.map((p) => {
                            const hoursSinceLast = p.lastPushSentAt ? (Date.now() - new Date(p.lastPushSentAt).getTime()) / (1000 * 60 * 60) : 999;
                            const isCooldownActive = hoursSinceLast < resendCooldownHours;
                            const hoursLeft = Math.ceil(resendCooldownHours - hoursSinceLast);
                            const remaining = p.remainingStock ?? p.totalStock;
                            const stockPercent = p.totalStock > 0 ? Math.min(100, Math.max(0, (remaining / p.totalStock) * 100)) : 100;

                            return (
                              <tr key={p.id} className="promo-table-row" style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}>
                                {/* Columna 1: Promoción */}
                                <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                    <span style={{
                                      padding: '2px 7px',
                                      borderRadius: '6px',
                                      fontSize: '0.66rem',
                                      fontWeight: 800,
                                      background: 'var(--c-secondary-soft, #F7EFE8)',
                                      color: 'var(--c-primary, #9C382A)'
                                    }}>
                                      {p.badgeType || 'PROMO'}
                                    </span>
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      padding: '2px 7px',
                                      borderRadius: '999px',
                                      fontSize: '0.66rem',
                                      fontWeight: 800,
                                      background: '#DCFCE7',
                                      color: '#15803D'
                                    }}>
                                      <Check size={10} />
                                      <span>Vigente</span>
                                    </span>
                                    <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                                      • {formatPromoDate(p.createdAt, p.timestamp)}
                                    </span>
                                  </div>
                                  <div style={{ fontWeight: 800, color: '#1E293B', fontSize: '0.88rem', lineHeight: 1.35 }}>
                                    {p.title}
                                  </div>
                                  {p.description && (
                                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px', lineHeight: 1.3, maxWidth: '420px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {p.description}
                                    </div>
                                  )}
                                </td>

                                {/* Columna 2: Cupos y Reclamos */}
                                <td style={{ padding: '12px 12px', verticalAlign: 'middle' }}>
                                  <div style={{
                                    fontWeight: 800,
                                    color: p.isUnlimited ? '#16A34A' : (remaining > 0 ? '#1E293B' : '#EF4444'),
                                    fontSize: '0.8rem',
                                    lineHeight: 1.3
                                  }}>
                                    {p.isUnlimited ? '✨ Sin límite' : `${remaining} / ${p.totalStock} restantes`}
                                  </div>
                                  {!p.isUnlimited && p.totalStock > 0 && (
                                    <div style={{ width: '100%', maxWidth: '110px', height: '4px', background: '#E2E8F0', borderRadius: '999px', margin: '4px 0', overflow: 'hidden' }}>
                                      <div style={{ 
                                        width: `${stockPercent}%`, 
                                        height: '100%', 
                                        background: remaining <= 2 ? '#EF4444' : '#16A34A',
                                        borderRadius: '999px' 
                                      }} />
                                    </div>
                                  )}
                                  <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                                    {p.claimedCount || (p.claimedUserIds?.length || 0)} reclamados
                                  </div>
                                </td>

                                {/* Columna 3: Vigencia y Push */}
                                <td style={{ padding: '12px 12px', verticalAlign: 'middle' }}>
                                  <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#15803D', lineHeight: 1.3 }}>
                                    {p.validityType === 'SINGLE_DAY' ? `⚡ Solo hoy (${p.validityDate || 'N/A'})` : `📅 Vence: ${p.validityDate || 'N/A'}`}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <BellRing size={12} color="#9C382A" />
                                    <span>
                                      {p.totalEnviados != null ? `${p.totalEnviados} enviados` : `${p.totalDestinatarios || 0} destinatarios`} 
                                      {p.totalPushDispatches ? ` (${p.totalPushDispatches} push)` : ''}
                                    </span>
                                  </div>
                                </td>

                                {/* Columna 4: Acciones */}
                                <td className="promo-actions-cell" style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleResendPush(p)}
                                      disabled={isSendingPromo || isMonthlyLimitReached || isCooldownActive}
                                      className="btn"
                                      style={{
                                        padding: '5px 9px',
                                        borderRadius: '8px',
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                        background: isMonthlyLimitReached || isCooldownActive ? '#F1F5F9' : 'var(--c-secondary-soft, #F7EFE8)',
                                        color: isMonthlyLimitReached || isCooldownActive ? '#94A3B8' : 'var(--c-primary, #9C382A)',
                                        border: isMonthlyLimitReached || isCooldownActive ? '1px solid #E2E8F0' : '1.5px solid var(--c-primary, #9C382A)',
                                        cursor: isMonthlyLimitReached || isCooldownActive ? 'not-allowed' : 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        whiteSpace: 'nowrap'
                                      }}
                                      title={
                                        isMonthlyLimitReached
                                          ? 'Has alcanzado tu límite mensual de envíos push'
                                          : (isCooldownActive ? `Espera ${hoursLeft}h antes de reenviar esta misma promoción` : 'Volver a enviar notificación push a tus clientes')
                                      }
                                    >
                                      <BellRing size={12} />
                                      <span>
                                        {isCooldownActive ? `${hoursLeft}h` : ((p.totalPushDispatches || 1) > 1 ? `Reenviar (${p.totalPushDispatches})` : 'Reenviar')}
                                      </span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleExpirePromotion(p)}
                                      className="btn btn-secondary"
                                      style={{
                                        padding: '5px 9px',
                                        borderRadius: '8px',
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                        color: '#DC2626',
                                        borderColor: '#FECDD3',
                                        background: '#FFFFFF',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        whiteSpace: 'nowrap'
                                      }}
                                      title="Finalizar esta promoción antes de tiempo y moverla al historial"
                                    >
                                      <span>⏹ Finalizar</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                )}

                {/* TAB 2: HISTORIAL DE PROMOCIONES VENCIDAS */}
                {promoSubTab === 'HISTORY' && (
                  expiredPromotionsList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                      <p style={{ fontSize: '0.86rem', margin: 0, fontWeight: 700 }}>
                        No hay promociones en el historial de vencidas todavía.
                      </p>
                      <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Cuando una promoción activa expire por fecha o se agote su cupo, se archivará aquí automáticamente con sus métricas.
                      </p>
                    </div>
                  ) : (
                    <div className="promo-table-wrapper">
                      <table className="promo-custom-table">
                        <thead>
                          <tr style={{ background: '#FAF8F5', borderBottom: '1.5px solid #EDE2D5' }}>
                            <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', width: '42%' }}>
                              Promoción Histórica
                            </th>
                            <th style={{ padding: '12px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', width: '20%' }}>
                              Rendimiento / Cupones
                            </th>
                            <th style={{ padding: '12px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', width: '20%' }}>
                              Finalización & Difusión
                            </th>
                            <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: '0.72rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', width: '18%' }}>
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {expiredPromotionsList.map((p) => {
                            const isAgotada = !p.isUnlimited && p.remainingStock !== undefined && p.remainingStock <= 0;
                            return (
                              <tr key={p.id} className="promo-table-row" style={{ borderBottom: '1px solid #F1F5F9', background: '#F8FAFC', opacity: 0.88, transition: 'background 0.15s' }}>
                                {/* Columna 1: Promoción */}
                                <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                    <span style={{
                                      padding: '2px 7px',
                                      borderRadius: '6px',
                                      fontSize: '0.66rem',
                                      fontWeight: 800,
                                      background: '#E2E8F0',
                                      color: '#475569'
                                    }}>
                                      {p.badgeType || 'PROMO'}
                                    </span>
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      padding: '2px 7px',
                                      borderRadius: '999px',
                                      fontSize: '0.66rem',
                                      fontWeight: 800,
                                      background: '#FEE2E2',
                                      color: '#DC2626'
                                    }}>
                                      {isAgotada ? '⛔ Agotada' : '⌛ Finalizada'}
                                    </span>
                                    <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                                      • {formatPromoDate(p.createdAt, p.timestamp)}
                                    </span>
                                  </div>
                                  <div style={{ fontWeight: 800, color: '#1E293B', fontSize: '0.88rem', lineHeight: 1.35 }}>
                                    {p.title}
                                  </div>
                                  {p.description && (
                                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px', lineHeight: 1.3, maxWidth: '420px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {p.description}
                                    </div>
                                  )}
                                </td>

                                {/* Columna 2: Cupones Tomados */}
                                <td style={{ padding: '12px 12px', verticalAlign: 'middle' }}>
                                  <div style={{ fontWeight: 800, color: '#1E293B', fontSize: '0.8rem', lineHeight: 1.3 }}>
                                    {p.claimedCount || (p.claimedUserIds?.length || 0)} cupones tomados
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>
                                    {p.isUnlimited ? 'Cupos ilimitados' : `${p.totalStock} cupos emitidos`}
                                  </div>
                                </td>

                                {/* Columna 3: Fecha finalización y Push */}
                                <td style={{ padding: '12px 12px', verticalAlign: 'middle' }}>
                                  <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#DC2626', lineHeight: 1.3 }}>
                                    ⌛ Finalizó: {p.validityDate || (p.expiredAt ? formatPromoDate(p.expiredAt) : 'Pasada')}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '3px' }}>
                                    🔔 {p.totalPushDispatches || 1} difusión(es) {p.totalEnviados ? `(${p.totalEnviados} envíos)` : ''}
                                  </div>
                                </td>

                                {/* Columna 4: Acciones */}
                                <td className="promo-actions-cell" style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'right' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleReusePromotion(p)}
                                    className="btn btn-secondary"
                                    style={{
                                      padding: '6px 12px',
                                      borderRadius: '8px',
                                      fontSize: '0.74rem',
                                      fontWeight: 800,
                                      color: 'var(--c-primary, #9C382A)',
                                      borderColor: 'var(--c-primary-soft, #EDE2D5)',
                                      background: '#FFFFFF',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      whiteSpace: 'nowrap'
                                    }}
                                    title="Cargar estos datos en el formulario para volver a publicarla con nueva fecha"
                                  >
                                    <span>🔄 Reutilizar</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </div>

            </div>
          )}

          {/* MODULE 6: AFICHE Y CÓDIGO QR DE MOSTRADOR CON MASCOTA FIDELY */}
          {activeTab === 'QR_DISPLAY' && (
            <div style={{ maxWidth: '640px', margin: '0 auto' }}>
              <StoreQrPrintStand
                store={safeStore}
                config={config}
                isModal={false}
              />
            </div>
          )}

          {/* MODULE 7: MEMBRESÍA & FACTURACIÓN FIDELY PRO */}
          {activeTab === 'MEMBERSHIP' && (
            <StoreSubscriptionPaywallView
              store={currentStoreObj}
              stores={stores}
              config={config}
              dolarRateInfo={dolarRateInfo}
              onRefresh={() => {
                const refreshed = stores.find(s => s.id === currentStoreObj?.id);
                if (refreshed) setCurrentStoreObj(refreshed);
              }}
              onNotify={onNotify}
              onLogout={onLogout}
              isEmbedded={true}
            />
          )}



          </div> {/* End pos-workspace-content */}
      </div> {/* End pos-main-workspace */}
        </>
      )}

      {/* MODAL: TICKET DE COMPRA */}
      {completedTicket && (
        <div className="modal-overlay" onClick={() => setCompletedTicket(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', padding: '22px' }}>
            <div style={{ textAlign: 'center', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '14px', marginBottom: '14px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'var(--c-accent)',
                color: '#080018',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px',
                boxShadow: '0 2px 10px var(--c-accent-glow)'
              }}>
                <CheckCircle2 size={26} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>¡Venta & Puntos Procesados!</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Comprobante fidely CLUB</p>
            </div>

            <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Local Comercial:</span>
                <strong>{completedTicket.storeName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Factura / Ref:</span>
                <strong style={{ fontFamily: 'monospace' }}>{completedTicket.reference}</strong>
              </div>
              {completedTicket.controlNumber && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>N° de Control:</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--c-primary)' }}>{completedTicket.controlNumber}</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Cliente:</span>
                <strong>{completedTicket.clientName} {completedTicket.clientDocId ? `(${completedTicket.clientDocId})` : ''}</strong>
              </div>

              {/* Items Breakdown if available */}
              {completedTicket.items && completedTicket.items.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', padding: '8px 0', margin: '4px 0' }}>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Renglones Facturados ({completedTicket.items.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '110px', overflowY: 'auto' }}>
                    {completedTicket.items.map((it, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                        <span>{it.quantity}x {it.name} <span style={{ fontSize: '0.68rem', color: it.taxType === 'EXENTO_0' ? '#0369A1' : '#15803D' }}>({it.taxType === 'EXENTO_0' ? 'Exento' : '16%'})</span></span>
                        <strong>${((parseFloat(it.priceUsd) || 0) * (parseInt(it.quantity) || 1)).toFixed(2)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fiscal Breakdown */}
              {completedTicket.taxBreakdown && (
                <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '3px', color: 'var(--text-muted)' }}>
                  {completedTicket.taxBreakdown.taxableBase16Usd > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Base Imponible (16% IVA):</span>
                      <span>${completedTicket.taxBreakdown.taxableBase16Usd.toFixed(2)}</span>
                    </div>
                  )}
                  {completedTicket.taxBreakdown.exemptTotalUsd > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0369A1' }}>
                      <span>Ventas Exentas (0% IVA):</span>
                      <span>${completedTicket.taxBreakdown.exemptTotalUsd.toFixed(2)}</span>
                    </div>
                  )}
                  {completedTicket.taxBreakdown.tax16Usd > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803D' }}>
                      <span>IVA Determinado (16% Incluido en Total):</span>
                      <span>${completedTicket.taxBreakdown.tax16Usd.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {completedTicket.discountAppliedUsd > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803D', fontWeight: 700 }}>
                  <span>Saldo / Cupón Aplicado:</span>
                  <span>-US${completedTicket.discountAppliedUsd.toFixed(2)} (-{completedTicket.discountAppliedPts} pts)</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1.5px solid var(--border-subtle)', paddingTop: '8px' }}>
                <span style={{ fontWeight: 800 }}>Total Liquidado:</span>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '1.15rem', color: 'var(--c-primary)' }}>
                    US${(completedTicket.netAmountUsd || completedTicket.amountUsd).toFixed(2)}
                  </strong>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                    Bs. {((completedTicket.netAmountUsd || completedTicket.amountUsd) * config.vesExchangeRate).toFixed(2)} VES
                  </div>
                </div>
              </div>

              {/* Payment Methods Breakdown if recorded */}
              {completedTicket.payments && Object.values(completedTicket.payments).some(v => Boolean(v && v !== '0')) && (
                <div style={{ background: '#FAF8F5', padding: '6px 10px', borderRadius: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <strong>Formas de Cobro: </strong>
                  {[
                    completedTicket.payments.cashUsd > 0 ? `Efectivo $${completedTicket.payments.cashUsd}` : null,
                    completedTicket.payments.cashVes > 0 ? `Efectivo Bs. ${completedTicket.payments.cashVes}` : null,
                    completedTicket.payments.posDebitVes > 0 ? `Punto Débito Bs. ${completedTicket.payments.posDebitVes}` : null,
                    completedTicket.payments.pagoMovilVes > 0 ? `Pago Móvil Bs. ${completedTicket.payments.pagoMovilVes} (Ref: ${completedTicket.payments.pagoMovilRef || 'N/A'})` : null,
                    completedTicket.payments.zelleUsd > 0 ? `Zelle $${completedTicket.payments.zelleUsd} (Ref: ${completedTicket.payments.zelleRef || 'N/A'})` : null,
                    completedTicket.payments.transferVes > 0 ? `Transferencia Bs. ${completedTicket.payments.transferVes}` : null
                  ].filter(Boolean).join(' • ')}
                </div>
              )}

              <div style={{
                background: '#FAF4EE',
                border: '1.5px solid var(--c-primary)',
                color: 'var(--c-primary)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '6px'
              }}>
                <span style={{ fontWeight: 800 }}>Puntos Sumados a este Local:</span>
                <strong style={{ fontSize: '1.15rem' }}>+{completedTicket.pointsEarned} pts</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Nuevo Saldo en {completedTicket.storeName.replace('Sucursal ', '')}:</span>
                <strong style={{ color: 'var(--c-primary)' }}>
                  {completedTicket.newStoreBalance} pts (US${((completedTicket.newStoreBalance || 0) * config.pointValueUsd).toFixed(2)})
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                <span>Saldo Total Global fidely:</span>
                <strong>{completedTicket.newBalance} pts</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-secondary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Printer size={15} />
                <span>Imprimir Ticket</span>
              </button>
              <button
                type="button"
                onClick={() => setCompletedTicket(null)}
                className="btn btn-accent"
                style={{ flex: 1 }}
              >
                <span>Listo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ÍTEM LIBRE / CONCEPTO MANUAL */}
      {showQuickItemModal && (
        <div className="modal-overlay" onClick={() => setShowQuickItemModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} color="var(--c-primary)" />
                Agregar Ítem Libre a la Factura
              </h3>
              <button onClick={() => setShowQuickItemModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddQuickItem}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Descripción o Concepto *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. Servicio Extra, Tratamiento Capilar Especial"
                  value={quickItemForm.name}
                  onChange={(e) => setQuickItemForm({ ...quickItemForm, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Precio Unitario PVP (USD $ - IVA incluido) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    className="form-input"
                    placeholder="Ej. 1.00"
                    value={quickItemForm.priceUsd}
                    onChange={(e) => setQuickItemForm({ ...quickItemForm, priceUsd: e.target.value })}
                    required
                  />
                  {quickItemForm.priceUsd > 0 && (
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      ≈ Bs. {(parseFloat(quickItemForm.priceUsd) * (config.vesExchangeRate || 1)).toFixed(2)} (IVA ya incluido)
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={quickItemForm.quantity}
                    onChange={(e) => setQuickItemForm({ ...quickItemForm, quantity: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Condición Fiscal / IVA *</label>
                <select
                  className="form-input"
                  value={quickItemForm.taxType}
                  onChange={(e) => setQuickItemForm({ ...quickItemForm, taxType: e.target.value })}
                >
                  <option value="GRAVABLE_16">Gravable con IVA General (16%)</option>
                  <option value="EXENTO_0">Exento / Exonerado (0% IVA)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowQuickItemModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-accent"
                  style={{ flex: 1 }}
                >
                  + Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: COBRO MIXTO MULTIMONEDA (SPLIT PAYMENTS EN $ Y BS.) */}
      {/* MODAL: COBRO MULTIMONEDA */}
      {showSplitPaymentModal && (() => {
        const isMethodEnabled = (methodKey) => {
          if (selectedPaymentMethod === 'MIXED') {
            return mixedActiveMethods.includes(methodKey);
          }
          return selectedPaymentMethod === methodKey;
        };

        const handleSelectSingleMethod = (methodKey) => {
          setSelectedPaymentMethod(methodKey);
          setMixedActiveMethods([methodKey]);

          const isUsdMethod = methodKey === 'cashUsd' || methodKey === 'zelleUsd';
          const fullAmount = isUsdMethod ? netAmountUsd.toFixed(2) : netAmountVes.toFixed(2);

          setPaymentBreakdown({
            cashUsd: methodKey === 'cashUsd' ? fullAmount : '',
            cashVes: methodKey === 'cashVes' ? fullAmount : '',
            posDebitVes: methodKey === 'posDebitVes' ? fullAmount : '',
            pagoMovilVes: methodKey === 'pagoMovilVes' ? fullAmount : '',
            pagoMovilRef: '',
            zelleUsd: methodKey === 'zelleUsd' ? fullAmount : '',
            zelleRef: '',
            transferVes: methodKey === 'transferVes' ? fullAmount : '',
            transferRef: ''
          });
        };

        const handleToggleMixedMethod = (methodKey) => {
          let nextList;
          if (mixedActiveMethods.includes(methodKey)) {
            if (mixedActiveMethods.length === 1) return; // Mantener al menos uno activo
            nextList = mixedActiveMethods.filter(k => k !== methodKey);
            setPaymentBreakdown(prev => ({
              ...prev,
              [methodKey]: '',
              ...(methodKey === 'pagoMovilVes' ? { pagoMovilRef: '' } : {}),
              ...(methodKey === 'zelleUsd' ? { zelleRef: '' } : {}),
              ...(methodKey === 'transferVes' ? { transferRef: '' } : {})
            }));
          } else {
            nextList = [...mixedActiveMethods, methodKey];
          }
          setMixedActiveMethods(nextList);
        };

        return (
          <div className="modal-overlay" onClick={() => setShowSplitPaymentModal(false)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '1.18rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Wallet size={20} color="var(--c-primary)" />
                    Cobro y Método de Pago
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Tasa BCV del día: <strong>1 USD = {config.vesExchangeRate} VES</strong>
                  </div>
                </div>
                <button onClick={() => setShowSplitPaymentModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              {/* Total to Pay Banner */}
              <div style={{
                background: 'linear-gradient(135deg, #FAF8F5 0%, #FFFFFF 100%)',
                border: '2px solid var(--c-primary)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 18px',
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)' }}>
                    Total Neto a Cobrar
                  </span>
                  <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--c-primary)' }}>
                    US${netAmountUsd.toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)' }}>
                    Equivalente en Bolívares
                  </span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    Bs. {netAmountVes.toFixed(2)} VES
                  </div>
                </div>
              </div>

              {/* Selector de Método de Pago */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    Selecciona el Método de Pago:
                  </label>
                  <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                    Solo se habilitará el campo que selecciones
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleSelectSingleMethod('cashUsd')}
                    style={{
                      padding: '8px 6px',
                      borderRadius: '8px',
                      border: selectedPaymentMethod === 'cashUsd' ? '2px solid var(--c-primary)' : '1px solid #E5E7EB',
                      background: selectedPaymentMethod === 'cashUsd' ? '#FAF4EE' : '#FFFFFF',
                      color: selectedPaymentMethod === 'cashUsd' ? 'var(--c-primary)' : 'var(--text-main)',
                      fontWeight: selectedPaymentMethod === 'cashUsd' ? 800 : 600,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>💵</span>
                    <span>Efectivo ($)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectSingleMethod('cashVes')}
                    style={{
                      padding: '8px 6px',
                      borderRadius: '8px',
                      border: selectedPaymentMethod === 'cashVes' ? '2px solid var(--c-primary)' : '1px solid #E5E7EB',
                      background: selectedPaymentMethod === 'cashVes' ? '#FAF4EE' : '#FFFFFF',
                      color: selectedPaymentMethod === 'cashVes' ? 'var(--c-primary)' : 'var(--text-main)',
                      fontWeight: selectedPaymentMethod === 'cashVes' ? 800 : 600,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>🇻🇪</span>
                    <span>Efectivo (Bs.)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectSingleMethod('posDebitVes')}
                    style={{
                      padding: '8px 6px',
                      borderRadius: '8px',
                      border: selectedPaymentMethod === 'posDebitVes' ? '2px solid var(--c-primary)' : '1px solid #E5E7EB',
                      background: selectedPaymentMethod === 'posDebitVes' ? '#FAF4EE' : '#FFFFFF',
                      color: selectedPaymentMethod === 'posDebitVes' ? 'var(--c-primary)' : 'var(--text-main)',
                      fontWeight: selectedPaymentMethod === 'posDebitVes' ? 800 : 600,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>💳</span>
                    <span>Punto de Venta</span>
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleSelectSingleMethod('pagoMovilVes')}
                    style={{
                      padding: '8px 6px',
                      borderRadius: '8px',
                      border: selectedPaymentMethod === 'pagoMovilVes' ? '2px solid var(--c-primary)' : '1px solid #E5E7EB',
                      background: selectedPaymentMethod === 'pagoMovilVes' ? '#FAF4EE' : '#FFFFFF',
                      color: selectedPaymentMethod === 'pagoMovilVes' ? 'var(--c-primary)' : 'var(--text-main)',
                      fontWeight: selectedPaymentMethod === 'pagoMovilVes' ? 800 : 600,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>📱</span>
                    <span>Pago Móvil</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectSingleMethod('zelleUsd')}
                    style={{
                      padding: '8px 6px',
                      borderRadius: '8px',
                      border: selectedPaymentMethod === 'zelleUsd' ? '2px solid var(--c-primary)' : '1px solid #E5E7EB',
                      background: selectedPaymentMethod === 'zelleUsd' ? '#FAF4EE' : '#FFFFFF',
                      color: selectedPaymentMethod === 'zelleUsd' ? 'var(--c-primary)' : 'var(--text-main)',
                      fontWeight: selectedPaymentMethod === 'zelleUsd' ? 800 : 600,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>🌐</span>
                    <span>Zelle ($)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPaymentMethod('MIXED');
                      if (mixedActiveMethods.length === 0) {
                        setMixedActiveMethods(['cashUsd', 'pagoMovilVes']);
                      }
                    }}
                    style={{
                      padding: '8px 6px',
                      borderRadius: '8px',
                      border: selectedPaymentMethod === 'MIXED' ? '2px solid var(--c-primary)' : '1px dashed #D1D5DB',
                      background: selectedPaymentMethod === 'MIXED' ? '#FAF4EE' : '#FFFFFF',
                      color: selectedPaymentMethod === 'MIXED' ? 'var(--c-primary)' : 'var(--text-muted)',
                      fontWeight: selectedPaymentMethod === 'MIXED' ? 800 : 600,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>🔀</span>
                    <span>Pago Dividido</span>
                  </button>
                </div>
              </div>

              {selectedPaymentMethod === 'MIXED' && (
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '8px 12px', borderRadius: '6px', fontSize: '0.74rem', color: '#92400E', marginBottom: '12px' }}>
                  💡 <strong>Modo Dividido:</strong> Marca las casillas de los métodos que vas a recibir para habilitar sus campos de monto.
                </div>
              )}

              {/* Form Fields: Only enabled for the selected method */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px', marginBottom: '14px' }}>
                
                {/* 1. Efectivo USD */}
                {(() => {
                  const isEnabled = isMethodEnabled('cashUsd');
                  return (
                    <div style={{
                      background: isEnabled ? '#FFFFFF' : '#F9FAFB',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: isEnabled ? '1.5px solid var(--c-primary)' : '1px solid #E5E7EB',
                      opacity: isEnabled ? 1 : 0.60,
                      transition: 'all 0.15s ease'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label 
                          onClick={() => {
                            if (selectedPaymentMethod === 'MIXED') handleToggleMixedMethod('cashUsd');
                            else handleSelectSingleMethod('cashUsd');
                          }}
                          style={{ fontSize: '0.80rem', fontWeight: 800, color: isEnabled ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          {selectedPaymentMethod === 'MIXED' && (
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => handleToggleMixedMethod('cashUsd')}
                              style={{ cursor: 'pointer' }}
                            />
                          )}
                          <span>💵 Efectivo en Dólares (USD $)</span>
                          {!isEnabled && (
                            <span style={{ fontSize: '0.64rem', color: '#9CA3AF', background: '#E5E7EB', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                              Deshabilitado
                            </span>
                          )}
                        </label>
                        {isEnabled && (
                          <button
                            type="button"
                            onClick={() => setPaymentBreakdown(prev => ({ ...prev, cashUsd: netAmountUsd.toFixed(2) }))}
                            style={{ background: 'none', border: 'none', color: 'var(--c-primary)', fontSize: '0.70rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            100% Cobro Completo
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={!isEnabled}
                        placeholder={isEnabled ? "0.00" : "Selecciona este método para habilitar"}
                        value={paymentBreakdown.cashUsd}
                        onChange={(e) => setPaymentBreakdown({ ...paymentBreakdown, cashUsd: e.target.value })}
                        className="form-input"
                        style={{
                          padding: '6px 10px',
                          fontSize: '0.90rem',
                          fontWeight: 700,
                          background: isEnabled ? '#FFFFFF' : '#F3F4F6',
                          cursor: isEnabled ? 'text' : 'not-allowed'
                        }}
                      />
                    </div>
                  );
                })()}

                {/* 2. Efectivo VES */}
                {(() => {
                  const isEnabled = isMethodEnabled('cashVes');
                  return (
                    <div style={{
                      background: isEnabled ? '#FFFFFF' : '#F9FAFB',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: isEnabled ? '1.5px solid var(--c-primary)' : '1px solid #E5E7EB',
                      opacity: isEnabled ? 1 : 0.60,
                      transition: 'all 0.15s ease'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label 
                          onClick={() => {
                            if (selectedPaymentMethod === 'MIXED') handleToggleMixedMethod('cashVes');
                            else handleSelectSingleMethod('cashVes');
                          }}
                          style={{ fontSize: '0.80rem', fontWeight: 800, color: isEnabled ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          {selectedPaymentMethod === 'MIXED' && (
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => handleToggleMixedMethod('cashVes')}
                              style={{ cursor: 'pointer' }}
                            />
                          )}
                          <span>🇻🇪 Efectivo en Bolívares (VES Bs.)</span>
                          {!isEnabled && (
                            <span style={{ fontSize: '0.64rem', color: '#9CA3AF', background: '#E5E7EB', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                              Deshabilitado
                            </span>
                          )}
                        </label>
                        {isEnabled && (
                          <button
                            type="button"
                            onClick={() => setPaymentBreakdown(prev => ({ ...prev, cashVes: netAmountVes.toFixed(2) }))}
                            style={{ background: 'none', border: 'none', color: 'var(--c-primary)', fontSize: '0.70rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            100% Cobro Completo
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={!isEnabled}
                        placeholder={isEnabled ? "0.00" : "Selecciona este método para habilitar"}
                        value={paymentBreakdown.cashVes}
                        onChange={(e) => setPaymentBreakdown({ ...paymentBreakdown, cashVes: e.target.value })}
                        className="form-input"
                        style={{
                          padding: '6px 10px',
                          fontSize: '0.90rem',
                          fontWeight: 700,
                          background: isEnabled ? '#FFFFFF' : '#F3F4F6',
                          cursor: isEnabled ? 'text' : 'not-allowed'
                        }}
                      />
                    </div>
                  );
                })()}

                {/* 3. Punto de Venta */}
                {(() => {
                  const isEnabled = isMethodEnabled('posDebitVes');
                  return (
                    <div style={{
                      background: isEnabled ? '#FFFFFF' : '#F9FAFB',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: isEnabled ? '1.5px solid var(--c-primary)' : '1px solid #E5E7EB',
                      opacity: isEnabled ? 1 : 0.60,
                      transition: 'all 0.15s ease'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label 
                          onClick={() => {
                            if (selectedPaymentMethod === 'MIXED') handleToggleMixedMethod('posDebitVes');
                            else handleSelectSingleMethod('posDebitVes');
                          }}
                          style={{ fontSize: '0.80rem', fontWeight: 800, color: isEnabled ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          {selectedPaymentMethod === 'MIXED' && (
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => handleToggleMixedMethod('posDebitVes')}
                              style={{ cursor: 'pointer' }}
                            />
                          )}
                          <span>💳 Punto de Venta / Tarjeta Débito (VES Bs.)</span>
                          {!isEnabled && (
                            <span style={{ fontSize: '0.64rem', color: '#9CA3AF', background: '#E5E7EB', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                              Deshabilitado
                            </span>
                          )}
                        </label>
                        {isEnabled && (
                          <button
                            type="button"
                            onClick={() => setPaymentBreakdown(prev => ({ ...prev, posDebitVes: netAmountVes.toFixed(2) }))}
                            style={{ background: 'none', border: 'none', color: 'var(--c-primary)', fontSize: '0.70rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            100% Cobro Completo
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={!isEnabled}
                        placeholder={isEnabled ? "0.00" : "Selecciona este método para habilitar"}
                        value={paymentBreakdown.posDebitVes}
                        onChange={(e) => setPaymentBreakdown({ ...paymentBreakdown, posDebitVes: e.target.value })}
                        className="form-input"
                        style={{
                          padding: '6px 10px',
                          fontSize: '0.90rem',
                          fontWeight: 700,
                          background: isEnabled ? '#FFFFFF' : '#F3F4F6',
                          cursor: isEnabled ? 'text' : 'not-allowed'
                        }}
                      />
                    </div>
                  );
                })()}

                {/* 4. Pago Móvil */}
                {(() => {
                  const isEnabled = isMethodEnabled('pagoMovilVes');
                  return (
                    <div style={{
                      background: isEnabled ? '#FFFFFF' : '#F9FAFB',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: isEnabled ? '1.5px solid var(--c-primary)' : '1px solid #E5E7EB',
                      opacity: isEnabled ? 1 : 0.60,
                      transition: 'all 0.15s ease'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label 
                          onClick={() => {
                            if (selectedPaymentMethod === 'MIXED') handleToggleMixedMethod('pagoMovilVes');
                            else handleSelectSingleMethod('pagoMovilVes');
                          }}
                          style={{ fontSize: '0.80rem', fontWeight: 800, color: isEnabled ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          {selectedPaymentMethod === 'MIXED' && (
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => handleToggleMixedMethod('pagoMovilVes')}
                              style={{ cursor: 'pointer' }}
                            />
                          )}
                          <span>📱 Pago Móvil (VES Bs.)</span>
                          {!isEnabled && (
                            <span style={{ fontSize: '0.64rem', color: '#9CA3AF', background: '#E5E7EB', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                              Deshabilitado
                            </span>
                          )}
                        </label>
                        {isEnabled && (
                          <button
                            type="button"
                            onClick={() => setPaymentBreakdown(prev => ({ ...prev, pagoMovilVes: netAmountVes.toFixed(2) }))}
                            style={{ background: 'none', border: 'none', color: 'var(--c-primary)', fontSize: '0.70rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            100% Cobro Completo
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={!isEnabled}
                          placeholder={isEnabled ? "Monto en Bs." : "Inactivo"}
                          value={paymentBreakdown.pagoMovilVes}
                          onChange={(e) => setPaymentBreakdown({ ...paymentBreakdown, pagoMovilVes: e.target.value })}
                          className="form-input"
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.90rem',
                            fontWeight: 700,
                            background: isEnabled ? '#FFFFFF' : '#F3F4F6',
                            cursor: isEnabled ? 'text' : 'not-allowed'
                          }}
                        />
                        <input
                          type="text"
                          disabled={!isEnabled}
                          placeholder={isEnabled ? "Últimos 4 dígitos ref" : "Inactivo"}
                          value={paymentBreakdown.pagoMovilRef}
                          onChange={(e) => setPaymentBreakdown({ ...paymentBreakdown, pagoMovilRef: e.target.value })}
                          className="form-input"
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.82rem',
                            background: isEnabled ? '#FFFFFF' : '#F3F4F6',
                            cursor: isEnabled ? 'text' : 'not-allowed'
                          }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* 5. Zelle */}
                {(() => {
                  const isEnabled = isMethodEnabled('zelleUsd');
                  return (
                    <div style={{
                      background: isEnabled ? '#FFFFFF' : '#F9FAFB',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: isEnabled ? '1.5px solid var(--c-primary)' : '1px solid #E5E7EB',
                      opacity: isEnabled ? 1 : 0.60,
                      transition: 'all 0.15s ease'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label 
                          onClick={() => {
                            if (selectedPaymentMethod === 'MIXED') handleToggleMixedMethod('zelleUsd');
                            else handleSelectSingleMethod('zelleUsd');
                          }}
                          style={{ fontSize: '0.80rem', fontWeight: 800, color: isEnabled ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          {selectedPaymentMethod === 'MIXED' && (
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => handleToggleMixedMethod('zelleUsd')}
                              style={{ cursor: 'pointer' }}
                            />
                          )}
                          <span>🌐 Zelle / Divisa Digital (USD $)</span>
                          {!isEnabled && (
                            <span style={{ fontSize: '0.64rem', color: '#9CA3AF', background: '#E5E7EB', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                              Deshabilitado
                            </span>
                          )}
                        </label>
                        {isEnabled && (
                          <button
                            type="button"
                            onClick={() => setPaymentBreakdown(prev => ({ ...prev, zelleUsd: netAmountUsd.toFixed(2) }))}
                            style={{ background: 'none', border: 'none', color: 'var(--c-primary)', fontSize: '0.70rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            100% Cobro Completo
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={!isEnabled}
                          placeholder={isEnabled ? "Monto en USD $" : "Inactivo"}
                          value={paymentBreakdown.zelleUsd}
                          onChange={(e) => setPaymentBreakdown({ ...paymentBreakdown, zelleUsd: e.target.value })}
                          className="form-input"
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.90rem',
                            fontWeight: 700,
                            background: isEnabled ? '#FFFFFF' : '#F3F4F6',
                            cursor: isEnabled ? 'text' : 'not-allowed'
                          }}
                        />
                        <input
                          type="text"
                          disabled={!isEnabled}
                          placeholder={isEnabled ? "Ref / Titular Zelle" : "Inactivo"}
                          value={paymentBreakdown.zelleRef}
                          onChange={(e) => setPaymentBreakdown({ ...paymentBreakdown, zelleRef: e.target.value })}
                          className="form-input"
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.82rem',
                            background: isEnabled ? '#FFFFFF' : '#F3F4F6',
                            cursor: isEnabled ? 'text' : 'not-allowed'
                          }}
                        />
                      </div>
                    </div>
                  );
                })()}

              </div>

              {/* Dynamic Status / Change / Remaining Bar */}
              <div style={{
                background: remainingDueUsd > 0.01 ? '#FFFDF5' : '#F0FDF4',
                border: `1.5px solid ${remainingDueUsd > 0.01 ? '#FDE68A' : '#BBF7D0'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.80rem', color: 'var(--text-muted)', fontWeight: 700 }}>Total Abonado:</span>
                  <strong style={{ fontSize: '0.96rem', color: 'var(--text-main)' }}>
                    US${totalPaidConvertedUsd.toFixed(2)} ({ (totalPaidConvertedUsd * config.vesExchangeRate).toFixed(2) } VES)
                  </strong>
                </div>

                {remainingDueUsd > 0.01 ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#B45309', fontWeight: 800, fontSize: '0.88rem' }}>
                    <span>Faltante por Cubrir:</span>
                    <span>US${remainingDueUsd.toFixed(2)} ({remainingDueVes.toFixed(2)} VES)</span>
                  </div>
                ) : changeDueUsd > 0.01 ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#15803D', fontWeight: 800, fontSize: '0.88rem' }}>
                    <span>Vuelto / Cambio a Entregar:</span>
                    <span>US${changeDueUsd.toFixed(2)} ({changeDueVes.toFixed(2)} VES)</span>
                  </div>
                ) : (
                  <div style={{ color: '#15803D', fontWeight: 800, fontSize: '0.84rem', textAlign: 'center' }}>
                    ✓ Monto de la factura cubierto con exactitud
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowSplitPaymentModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Volver
                </button>
                <button
                  type="button"
                  disabled={remainingDueUsd > 0.01}
                  onClick={() => handleRegisterPurchase()}
                  className="btn btn-accent"
                  style={{ flex: 1.5, fontWeight: 800 }}
                >
                  ✓ Confirmar Cobro & Emitir Factura
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: CREAR / EDITAR PRODUCTO EN CATÁLOGO */}
      {showProductModal && (
        <div className="modal-overlay" onClick={() => setShowProductModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.18rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={20} color="var(--c-primary)" />
                {editingProduct ? 'Editar Producto / Servicio' : 'Nuevo Producto o Servicio'}
              </h3>
              <button onClick={() => setShowProductModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Código SKU / Barra</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. SKU-01"
                    value={productForm.code}
                    onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Categoría *</label>
                  <select
                    className="form-input"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  >
                    <option value="Servicio">Servicio</option>
                    <option value="Producto">Producto Físico</option>
                    <option value="Tratamiento">Tratamiento</option>
                    <option value="Alimentos">Alimentos / Bebidas</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Nombre del Producto / Servicio *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. Corte Clásico / Lavado & Peinado"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Precio PVP (USD $ - IVA incluido) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    className="form-input"
                    placeholder="Ej. 1.00"
                    value={productForm.priceUsd}
                    onChange={(e) => setProductForm({ ...productForm, priceUsd: e.target.value })}
                    required
                  />
                  {productForm.priceUsd > 0 && (
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      ≈ Bs. {(parseFloat(productForm.priceUsd) * (config.vesExchangeRate || 1)).toFixed(2)} (IVA ya incluido)
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Tratamiento Fiscal *</label>
                  <select
                    className="form-input"
                    value={productForm.taxType}
                    onChange={(e) => setProductForm({ ...productForm, taxType: e.target.value })}
                  >
                    <option value="GRAVABLE_16">Gravable (16% IVA)</option>
                    <option value="EXENTO_0">Exento (0% IVA)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', background: '#FAF8F5', padding: '10px 12px', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.80rem', fontWeight: 700, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={productForm.isService}
                    onChange={(e) => setProductForm({ ...productForm, isService: e.target.checked })}
                  />
                  <span>Es un Servicio (Sin control estricto de existencias)</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-accent"
                  style={{ flex: 1.2, fontWeight: 800 }}
                >
                  {editingProduct ? 'Actualizar Producto' : 'Guardar en Catálogo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PROPUESTA DE RECOMPENSA DE TIENDA */}
      {showProposeRewardModal && (
        <div className="modal-overlay" onClick={() => setShowProposeRewardModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.18rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Gift size={20} color="var(--c-primary)" />
                  Proponer Beneficio Exclusivo
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                  Para el local: <strong>{safeStore.name}</strong>
                </div>
              </div>
              <button 
                onClick={() => setShowProposeRewardModal(false)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ 
              background: '#FAF8F5', 
              border: '1px solid #EDE2D5', 
              borderRadius: '10px', 
              padding: '10px 14px', 
              marginBottom: '16px', 
              fontSize: '0.78rem', 
              color: 'var(--text-muted)',
              lineHeight: 1.4
            }}>
              <strong style={{ color: 'var(--c-primary)' }}>Flujo de Aprobación:</strong> La recompensa quedará registrada en estado <strong>PENDIENTE</strong> y el Administrador del sistema la aprobará para que aparezca en el catálogo público de tus clientes.
            </div>

            <form onSubmit={handleSubmitRewardProposal}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>Nombre de la Recompensa *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. Café Americano + Croissant de Cortesía"
                  value={rewardProposalForm.title}
                  onChange={(e) => setRewardProposalForm({ ...rewardProposalForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>Descripción y Condiciones *</label>
                <textarea
                  className="form-textarea"
                  rows="2"
                  placeholder="Ej. Válido de Lunes a Viernes en nuestro mostrador para compras superiores a US$5.00."
                  value={rewardProposalForm.description}
                  onChange={(e) => setRewardProposalForm({ ...rewardProposalForm, description: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>Categoría de Beneficio *</label>
                <select
                  className="form-input"
                  value={rewardProposalForm.category}
                  onChange={(e) => setRewardProposalForm({ ...rewardProposalForm, category: e.target.value })}
                >
                  <option value="Cortesía">Cortesía de la Casa</option>
                  <option value="Producto Gratis">Producto Gratis</option>
                  <option value="Descuento Especial">Descuento Especial en Compra</option>
                  <option value="Gift Card">Gift Card del Local</option>
                  <option value="Saldo en Compra">Saldo a Favor en Caja</option>
                </select>
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
                    {rewardProposalForm.stampsCost || 6} sellos
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
                      onClick={() => setRewardProposalForm({ ...rewardProposalForm, stampsCost: stCount })}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '8px',
                        border: ((rewardProposalForm.stampsCost || 6) === stCount) ? '2px solid #B45309' : '1px solid #FDE68A',
                        background: ((rewardProposalForm.stampsCost || 6) === stCount) ? '#92400E' : '#FFFFFF',
                        color: ((rewardProposalForm.stampsCost || 6) === stCount) ? '#FFFFFF' : '#92400E',
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
                    value={rewardProposalForm.stampsCost || 6}
                    onChange={(e) => setRewardProposalForm({ ...rewardProposalForm, stampsCost: parseInt(e.target.value, 10) || 1 })}
                    style={{ maxWidth: '140px', fontWeight: 800, fontSize: '0.88rem' }}
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: '#92400E', fontWeight: 600 }}>
                    sellos requeridos en la cartilla
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                    Costo en Puntos * (Mín. {config.minRedemptionPoints || 100})
                  </label>
                  <input
                    type="number"
                    min={config.minRedemptionPoints || 100}
                    step="5"
                    className="form-input"
                    value={rewardProposalForm.pointsCost}
                    onChange={(e) => {
                      const pts = parseInt(e.target.value, 10) || 0;
                      const calculatedUsd = (pts * (config.pointValueUsd || 0.05)).toFixed(2);
                      setRewardProposalForm({ 
                        ...rewardProposalForm, 
                        pointsCost: e.target.value,
                        nominalValueUsd: calculatedUsd
                      });
                    }}
                    required
                  />
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Regla RN-08: Mín. {config.minRedemptionPoints || 100} pts
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>Valor Equivalente US$ *</label>
                  <input
                    type="number"
                    step="0.10"
                    min="1"
                    className="form-input"
                    value={rewardProposalForm.nominalValueUsd}
                    onChange={(e) => setRewardProposalForm({ ...rewardProposalForm, nominalValueUsd: e.target.value })}
                    required
                  />
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Sugerido: 100 pts = US$5.00
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>Stock Disponible</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={rewardProposalForm.availableStock}
                    onChange={(e) => setRewardProposalForm({ ...rewardProposalForm, availableStock: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>Vigencia (Días)</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={rewardProposalForm.validityDays}
                    onChange={(e) => setRewardProposalForm({ ...rewardProposalForm, validityDays: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowProposeRewardModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '10px' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1.5, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Send size={15} />
                  <span>Enviar Propuesta a Administración</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRO CLIENTE RÁPIDO */}
      {showNewClientModal && (
        <div className="modal-overlay" onClick={() => setShowNewClientModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserPlus size={18} color="var(--c-primary)" />
                Registro Rápido de Cliente
              </h3>
              <button onClick={() => setShowNewClientModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateClient}>
              <div className="form-group">
                <label className="form-label">Nombre Completo *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. Andrés Zambrano"
                  value={newClientForm.name}
                  onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Teléfono *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. +58 414 1112233"
                    value={newClientForm.phone}
                    onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Cédula / ID *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. V-20123456"
                    value={newClientForm.docId}
                    onChange={(e) => setNewClientForm({ ...newClientForm, docId: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Correo (Opcional)</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="cliente@email.com"
                  value={newClientForm.email}
                  onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewClientModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-accent"
                  style={{ flex: 1 }}
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DEVOLUCIÓN */}
      {returnModalPurchase && (
        <div className="modal-overlay" onClick={() => setReturnModalPurchase(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--c-rose)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RotateCcw size={18} />
                Devolución & Reversión (RN-07)
              </h3>
              <button onClick={() => setReturnModalPurchase(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: '#F4FBF7', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', marginBottom: '14px' }}>
              <div>Factura: <strong>{returnModalPurchase.reference}</strong></div>
              <div>Cliente: <strong>{returnModalPurchase.clientName}</strong></div>
              <div>Monto Original: <strong>US${returnModalPurchase.amountUsd.toFixed(2)}</strong></div>
              <div>Puntos Otorgados: <strong>{returnModalPurchase.pointsEarned} pts</strong></div>
            </div>

            <form onSubmit={handleProcessReturn}>
              <div className="form-group">
                <label className="form-label">Tipo de Devolución</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setReturnType('TOTAL');
                      setReturnAmount(returnModalPurchase.amountUsd.toString());
                    }}
                    className="btn"
                    style={{
                      flex: 1,
                      background: returnType === 'TOTAL' ? 'var(--c-primary)' : '#FFFFFF',
                      color: returnType === 'TOTAL' ? '#fff' : 'var(--text-main)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    Total (100%)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReturnType('PARTIAL');
                      setReturnAmount((returnModalPurchase.amountUsd / 2).toFixed(2));
                    }}
                    className="btn"
                    style={{
                      flex: 1,
                      background: returnType === 'PARTIAL' ? 'var(--c-primary)' : '#FFFFFF',
                      color: returnType === 'PARTIAL' ? '#fff' : 'var(--text-main)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    Parcial
                  </button>
                </div>
              </div>

              {returnType === 'PARTIAL' && (
                <div className="form-group">
                  <label className="form-label">Monto Devuelto (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={returnModalPurchase.amountUsd}
                    className="form-input"
                    value={returnAmount}
                    onChange={(e) => setReturnAmount(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Motivo (RN-12 Auditoría) *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. Talla incorrecta o devolución de mercancía"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setReturnModalPurchase(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  style={{ flex: 1 }}
                >
                  Revertir Puntos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: AUDITORÍA DE HISTORIAL Y APROBACIÓN DE CANJE EN CAJA */}
      {selectedPendingRedemption && (() => {
        const req = selectedPendingRedemption;
        const targetClient = clients.find(c => c.id === req.clientId);
        const clientStorePts = Math.max(
          (targetClient?.storeBalances && targetClient.storeBalances[selectedStore.id]) || 0,
          (targetClient?.storeBalances && targetClient.storeBalances['ALL']) || 0,
          targetClient?.pointsBalance || 0,
          req.pointsCost || 0
        );
        const hasSufficientPts = clientStorePts >= req.pointsCost;

        // Filter purchases made by this client in this branch specifically
        const clientPurchasesInStore = purchases.filter(
          p => p.clientId === req.clientId && p.storeId === selectedStore.id && p.status === 'VALIDADA'
        );
        const totalSpentInStore = clientPurchasesInStore.reduce((sum, p) => sum + p.amountUsd, 0);
        const totalEarnedInStore = clientPurchasesInStore.reduce((sum, p) => sum + p.pointsEarned, 0);

        return (
          <div className="modal-overlay" onClick={() => setSelectedPendingRedemption(null)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', width: '100%', padding: 'clamp(16px, 3vw, 24px)', boxSizing: 'border-box', overflowX: 'hidden' }}>
              
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={20} color="var(--c-primary)" />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Validar y Aprobar Saldo de Puntos para Compra</h3>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {selectedStore.name} • Solicitud ID: #{req.id} • Ref: {req.voucherCode}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedPendingRedemption(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Client & Requested Reward Header Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: '#FAF8F5', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Cliente Solicitante
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-main)', marginTop: '2px' }}>
                    {req.clientName}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Cédula: {req.clientDocId} • Tel: {req.clientPhone}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#15803D', fontWeight: 700, marginTop: '3px' }}>
                    ✓ Presencia en mostrador: QR verificado
                  </div>
                </div>

                <div style={{ background: '#FAF8F5', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Saldo a Sumar a la Compra
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#15803D', marginTop: '2px' }}>
                    +US${req.nominalValueUsd?.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--c-primary)', fontWeight: 700 }}>
                    Canje de cupón o recompensa
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '3px' }}>
                    Saldo actual en tienda: <strong>US${(clientStorePts * config.pointValueUsd).toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              {/* Point Legitimacy Verification Banner */}
              {hasSufficientPts ? (
                <div style={{
                  background: '#ECFDF5',
                  border: '1.5px solid #10B981',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <CheckCircle2 size={22} color="#059669" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: '0.82rem', color: '#065F46', lineHeight: 1.4 }}>
                    <strong>✓ Verificación Conforme:</strong> El cliente tiene saldo de recompensas disponible en <strong>{selectedStore.name}</strong> para aplicar a esta compra.
                  </div>
                </div>
              ) : (
                <div style={{
                  background: '#FFF1F2',
                  border: '1.5px solid #F43F5E',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <AlertCircle size={22} color="#E11D48" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: '0.82rem', color: '#9F1239', lineHeight: 1.4 }}>
                    <strong>⚠ Saldo Insuficiente en esta Sucursal:</strong> El cliente tiene {clientStorePts} pts en {selectedStore.name} y el canje requiere {req.pointsCost} pts.
                  </div>
                </div>
              )}

              {/* Client Purchases History in this Branch */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Receipt size={16} color="var(--c-primary)" />
                    <span>Compras mayores a $25 en {selectedStore.name} ({clientPurchasesInStore.length})</span>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Total Facturado: <strong>US${totalSpentInStore.toFixed(2)}</strong> (+{totalEarnedInStore} pts)
                  </span>
                </div>

                {clientPurchasesInStore.length > 0 ? (
                  <div className="custom-table-container" style={{ maxHeight: '170px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                    <table className="custom-table" style={{ fontSize: '0.78rem' }}>
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Factura / Ref</th>
                          <th>Monto USD</th>
                          <th>Puntos Obtenidos</th>
                          <th>Cajero</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientPurchasesInStore.map(p => (
                          <tr key={p.id}>
                            <td>{p.date}</td>
                            <td><strong>{p.reference}</strong></td>
                            <td>US${p.amountUsd.toFixed(2)}</td>
                            <td>
                              <span className="badge badge-accent">+{p.pointsEarned} pts</span>
                            </td>
                            <td>{p.cashier || 'Cajero'}</td>
                            <td>
                              <span className="badge badge-emerald">{p.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: '16px', textAlign: 'center', background: '#F9FAFB', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    No se registran compras previas registradas para este cliente en esta sucursal específica.
                  </div>
                )}
              </div>

              {/* Point Balance Impact */}
              <div style={{
                background: '#FAF4EE',
                border: '1.5px solid var(--c-primary)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                marginBottom: '18px',
                fontSize: '0.84rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Saldo actual en {selectedStore.name.replace('Sucursal ', '')}:</span>
                  <strong>US${(clientStorePts * config.pointValueUsd).toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: 'var(--c-rose)' }}>
                  <span>Descuento a aplicar a la compra:</span>
                  <strong>-US${req.nominalValueUsd?.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                  <span style={{ fontWeight: 800, color: 'var(--c-primary)' }}>Nuevo saldo en este local:</span>
                  <strong style={{fontSize:`0.96rem`,color:`var(--c-primary)`}}>
                    US${(Math.max(0,clientStorePts-req.pointsCost)*config.pointValueUsd).toFixed(2)}
                  </strong>
                </div>
              </div>
              {
                showRejectForm ? (
                  <div
                    style={{background:`#FFF1F2`,border:`1px solid #FECDD3`,padding:`14px`,borderRadius:`var(--radius-md)`,marginBottom:`14px`}}
                  >
                    <label className="form-label" style={{color:`#9F1239`,fontWeight:800}}>Motivo del Rechazo de Canje</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej. Saldo insuficiente o inconsistencia en facturas"
                      value={rejectionReasonInput}
                      onChange={e=>setRejectionReasonInput(e.target.value)}
                      style={{marginBottom:`10px`}}
                    />
                    <div style={{display:`flex`,gap:`8px`}}>
                      <button
                        type="button"
                        onClick={()=>setShowRejectForm(false)}
                        className="btn btn-secondary"
                        style={{flex:1}}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={()=>handleRejectPendingRedemption(req)}
                        className="btn btn-danger"
                        style={{flex:1}}
                      >
                        Confirmar Rechazo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{display:`flex`,gap:`10px`,flexWrap:`wrap`,width:`100%`,boxSizing:`border-box`}}>
                    <button
                      type="button"
                      onClick={()=>setShowRejectForm(true)}
                      className="btn btn-danger"
                      style={{flex:`1 1 140px`,padding:`12px`,boxSizing:`border-box`,whiteSpace:`normal`,textAlign:`center`}}
                    >
                      Rechazar Solicitud
                    </button>
                    <button
                      type="button"
                      disabled={!hasSufficientPts}
                      onClick={()=>handleApprovePendingRedemption(req)}
                      className="btn btn-accent"
                      style={{flex:`2 1 220px`,padding:`12px`,fontSize:`0.94rem`,fontWeight:800,display:`flex`,alignItems:`center`,justifyContent:`center`,gap:`8px`,boxSizing:`border-box`,whiteSpace:`normal`,textAlign:`center`}}
                    >
                      <CheckCircle2 size={18} />
                      <span>✓ Aprobar y Sumar Saldo (+US${req.nominalValueUsd?.toFixed(2)})</span>
                    </button>
                  </div>
                )
              }
            </div>
          </div>
        );
      })()}
      {
        showClientStampsHistoryModal&&identifiedClient && (
          <div className="modal-overlay" onClick={()=>setShowClientStampsHistoryModal(false)}>
          <div
            className="modal-dialog"
            onClick={e=>e.stopPropagation()}
            style={{maxWidth:`640px`,width:`92%`,maxHeight:`88vh`,display:`flex`,flexDirection:`column`,padding:`0`,overflow:`hidden`}}
          >
            <div
              style={{padding:`18px 22px`,borderBottom:`1px solid var(--border-subtle)`,background:`#FFFFFF`,display:`flex`,alignItems:`center`,justifyContent:`space-between`}}
            >
              <div style={{display:`flex`,alignItems:`center`,gap:`10px`}}>
                <div
                  style={{width:`38px`,height:`38px`,borderRadius:`10px`,background:`#F6F3FF`,color:`var(--c-primary)`,display:`flex`,alignItems:`center`,justifyContent:`center`}}
                >
                  <History size={20} />
                </div>
                <div>
                  <h3 style={{margin:0,fontSize:`1.15rem`,fontWeight:800}}>Historial de Sellos del Cliente</h3>
                  <div style={{fontSize:`0.78rem`,color:`var(--text-muted)`}}>
                    Auditoría de sellos y canjes aprobados en 
                    <strong>{safeStore.name}</strong>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={()=>setShowClientStampsHistoryModal(false)}
                style={{background:`none`,border:`none`,color:`var(--text-muted)`,cursor:`pointer`,padding:`4px`}}
              >
                <X size={20} />
              </button>
            </div>
            <div
              style={{padding:`14px 22px`,background:`#FFFDF5`,borderBottom:`1px solid #FDE68A`,display:`flex`,alignItems:`center`,justifyContent:`space-between`,flexWrap:`wrap`,gap:`12px`}}
            >
              <div>
                <div style={{display:`flex`,alignItems:`center`,gap:`8px`}}>
                  <strong style={{fontSize:`1.02rem`,color:`var(--text-main)`}}>{identifiedClient.name}</strong>
                  <span className="badge badge-primary">{identifiedClient.tier||`Cliente`}</span>
                </div>
                <div style={{fontSize:`0.76rem`,color:`var(--text-muted)`,marginTop:`2px`}}>
                  Cédula: 
                  <strong>{identifiedClient.docId||identifiedClient.cedula||`N/A`}</strong>
                   • Tlf: 
                  {identifiedClient.phone||`N/A`}
                </div>
              </div>
              {
                (() => {
                let e=(identifiedClient.loyaltyCards||[]).find(e=>isMatchStore(e.storeId,safeStore.id,e.storeName,safeStore.name)),t=e?Number(e.currentStamps||0):0,n=Number(e?e.stampsTarget||safeStore.stampsTarget||6:safeStore.stampsTarget||6);
                return (
                <div
                style={{background:`#FFFFFF`,border:`1.5px solid #F59E0B`,borderRadius:`8px`,padding:`6px 12px`,textAlign:`right`}}
                >
                <div style={{fontSize:`0.68rem`,color:`#92400E`,fontWeight:700,textTransform:`uppercase`}}>Saldo en Tarjeta Activa</div>
                <div style={{fontSize:`1.1rem`,fontWeight:900,color:`#B45309`}}>{t} de {n} sellos</div>
                </div>
                );
                })()
              }
            </div>
            <div style={{padding:`18px 22px`,overflowY:`auto`,flex:1,maxHeight:`55vh`}}>
              {
                clientStoreStampHistory.length===0 ? (
                <div
                style={{padding:`36px 20px`,textAlign:`center`,background:`#F9FAFB`,borderRadius:`var(--radius-sm)`,border:`1px dashed var(--border-subtle)`}}
                >
                <div
                style={{width:`48px`,height:`48px`,borderRadius:`50%`,background:`#EEF2FF`,color:`#4F46E5`,display:`flex`,alignItems:`center`,justifyContent:`center`,margin:`0 auto 12px`}}
                >
                <ShieldCheck size={24} />
                </div>
                <h4 style={{fontSize:`0.98rem`,fontWeight:700,marginBottom:`6px`,color:`var(--text-main)`}}>
                Sin sellos registrados aún en este local
                </h4>
                <p
                style={{fontSize:`0.82rem`,color:`var(--text-muted)`,maxWidth:`420px`,margin:`0 auto`,lineHeight:1.5}}
                >
                Cada vez que el cliente escanee su código QR en mostrador o registre una compra elegible, los sellos aprobados quedarán auditados aquí con fecha, hora y cajero responsable para seguridad y transparencia mutua.
                </p>
                </div>
                ) : (
                <div style={{display:`flex`,flexDirection:`column`,gap:`10px`}}>
                <div
                style={{fontSize:`0.78rem`,color:`var(--text-muted)`,marginBottom:`4px`,fontWeight:700,textTransform:`uppercase`,letterSpacing:`0.04em`}}
                >
                {clientStoreStampHistory.length}
                
                {clientStoreStampHistory.length===1?`registro de auditoría`:`registros de auditoría`}
                </div>
                {
                clientStoreStampHistory.map(
                (e, t) => {
                let n=e.type===`CANJE_PREMIO`;
                return (
                <div
                key={e.id||t}
                style={{background:n?`#FFFBEB`:`#FFFFFF`,border:n?`1.5px solid #FDE68A`:`1px solid var(--border-subtle)`,borderRadius:`10px`,padding:`12px 16px`,display:`flex`,alignItems:`center`,justifyContent:`space-between`,gap:`12px`,boxShadow:`0 1px 3px rgba(0,0,0,0.02)`}}
                >
                <div style={{display:`flex`,alignItems:`center`,gap:`12px`}}>
                <div
                style={{width:`38px`,height:`38px`,borderRadius:`10px`,background:n?`#FEF3C7`:`#DCFCE7`,color:n?`#B45309`:`#166534`,display:`flex`,alignItems:`center`,justifyContent:`center`,fontSize:`1.15rem`,flexShrink:0}}
                >
                {n?`🎁`:`⭐`}
                </div>
                <div>
                <div style={{display:`flex`,alignItems:`center`,gap:`8px`,flexWrap:`wrap`}}>
                <strong style={{fontSize:`0.9rem`,color:`var(--text-main)`}}>{e.title}</strong>
                <span
                style={{fontSize:`0.68rem`,fontWeight:800,padding:`2px 8px`,borderRadius:`12px`,background:`#DCFCE7`,color:`#166534`}}
                >
                ✓ Aprobado
                </span>
                </div>
                <div
                style={{fontSize:`0.76rem`,color:`var(--text-muted)`,marginTop:`3px`,display:`flex`,gap:`10px`,flexWrap:`wrap`}}
                >
                <span>📅 {e.date}</span>
                <span>
                👤 Por:
                <strong>{e.authorizedBy}</strong>
                </span>
                {
                e.reference && (
                <span>
                Ref:
                <code>{e.reference}</code>
                </span>
                )
                }
                </div>
                {
                e.notes && (
                <div style={{fontSize:`0.72rem`,color:`var(--text-dim)`,fontStyle:`italic`,marginTop:`2px`}}>{e.notes}</div>
                )
                }
                </div>
                </div>
                <div style={{textAlign:`right`,flexShrink:0}}>
                <div style={{fontSize:`1.05rem`,fontWeight:900,color:n?`#D97706`:`#166534`}}>
                {n?`${e.stampsDelta} sellos`:`+1 sello`}
                </div>
                {
                e.stampsAfter!==null&&e.stampsAfter!==undefined && (
                <div style={{fontSize:`0.70rem`,color:`var(--text-muted)`,fontWeight:600}}>Total tras acción: {e.stampsAfter}</div>
                )
                }
                </div>
                </div>
                );
                }
                )
                }
                </div>
                )
              }
            </div>
            <div
              style={{padding:`14px 22px`,borderTop:`1px solid var(--border-subtle)`,background:`#F9FAFB`,display:`flex`,justifyContent:`flex-end`}}
            >
              <button
                type="button"
                onClick={()=>setShowClientStampsHistoryModal(false)}
                className="btn btn-primary"
                style={{padding:`8px 20px`,fontSize:`0.86rem`}}
              >
                Cerrar Historial
              </button>
            </div>
          </div>
        </div>
        )
      }
      {
        showStoreQrModal && (
          <div className="modal-overlay" onClick={()=>setShowStoreQrModal(false)}>
          <div
            className="modal-dialog"
            onClick={e=>e.stopPropagation()}
            style={{maxWidth:`420px`,padding:`24px`,textAlign:`center`}}
          >
            <div style={{display:`flex`,justifyContent:`space-between`,alignItems:`center`,marginBottom:`14px`}}>
              <div style={{display:`flex`,alignItems:`center`,gap:`6px`}}>
                <Store size={18} color="var(--c-primary)" />
                <h3 style={{fontSize:`1.15rem`,fontWeight:800}}>QR de Mostrador para Canje de Saldo</h3>
              </div>
              <button
                onClick={()=>setShowStoreQrModal(false)}
                style={{background:`none`,border:`none`,color:`var(--text-muted)`,cursor:`pointer`}}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{marginBottom:`14px`}}>
              <strong style={{fontSize:`1.05rem`,color:`var(--c-primary)`}}>{safeStore.name}</strong>
              <div style={{fontSize:`0.78rem`,color:`var(--text-muted)`}}>
                {safeStore.address||`Caracas, Venezuela`}
                 • ID: 
                <code>{safeStore.id}</code>
              </div>
            </div>
            {
              (() => {
              let e=`${window.location.origin}/?store=${safeStore.id}&action=redeem`;
              return (
              <div>
              <div
              style={{background:`#FAF8F5`,padding:`20px`,borderRadius:`16px`,border:`2px dashed var(--c-primary)`,display:`inline-block`,marginBottom:`14px`}}
              >
              <QRCodeDisplay value={e} size={190} darkColor="#080018" lightColor="#FAF8F5" />
              <div
              style={{marginTop:`10px`,fontWeight:800,fontSize:`0.84rem`,letterSpacing:`0.05em`,color:`var(--text-main)`}}
              >
              ID: {safeStore.id}
              </div>
              </div>
              <p style={{fontSize:`0.78rem`,color:`var(--text-muted)`,lineHeight:1.45,marginBottom:`14px`}}>
              Exhibe este código QR en el mostrador o caja registradora. El cliente lo escanea desde su teléfono para registrar su visita, sellar su tarjeta y canjear sus recompensas.
              </p>
              <div style={{display:`flex`,gap:`8px`,marginBottom:`14px`}}>
              <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(e);
                onNotify('¡Enlace de canje copiado al portapapeles!', 'success');
              }}
              className="btn btn-secondary"
              style={{flex:1,padding:`8px`,fontSize:`0.78rem`,display:`flex`,alignItems:`center`,justifyContent:`center`,gap:`5px`}}
              >
              <Copy size={13} />
              <span>Copiar Enlace</span>
              </button>
              <button
              type="button"
              onClick={()=>window.open(e,`_blank`)}
              className="btn btn-secondary"
              style={{flex:1,padding:`8px`,fontSize:`0.78rem`,display:`flex`,alignItems:`center`,justifyContent:`center`,gap:`5px`}}
              >
              <ExternalLink size={13} />
              <span>Probar en Otra Pestaña</span>
              </button>
              </div>
              </div>
              );
              })()
            }
            <div style={{display:`flex`,gap:`8px`}}>
              <button type="button" onClick={()=>window.print()} className="btn btn-secondary" style={{flex:1}}>
                <Printer size={15} />
                <span>Imprimir QR</span>
              </button>
              <button
                type="button"
                onClick={()=>setShowStoreQrModal(false)}
                className="btn btn-accent"
                style={{flex:1}}
              >
                <span>Cerrar</span>
              </button>
            </div>
          </div>
        </div>
        )
      }
      {
        showPosCameraScanner && (
          <div className="modal-overlay" onClick={()=>setShowPosCameraScanner(false)}>
          <div
            className="modal-dialog"
            onClick={e=>e.stopPropagation()}
            style={{padding:`24px`,borderRadius:`24px`,maxWidth:`440px`,background:`#FFFFFF`,maxHeight:`90vh`,overflowY:`auto`}}
          >
            <div style={{display:`flex`,justifyContent:`space-between`,alignItems:`center`,marginBottom:`14px`}}>
              <div style={{display:`flex`,alignItems:`center`,gap:`8px`}}>
                <Camera size={18} color="var(--c-primary)" />
                <h3 style={{fontSize:`1.15rem`,fontWeight:800}}>Escanear QR del Cliente</h3>
              </div>
              <button
                type="button"
                onClick={()=>setShowPosCameraScanner(false)}
                style={{background:`none`,border:`none`,color:`var(--text-muted)`,cursor:`pointer`}}
              >
                <X size={18} />
              </button>
            </div>
            <p style={{fontSize:`0.8rem`,color:`var(--text-muted)`,marginBottom:`14px`,lineHeight:1.45}}>
              Apunta la cámara del terminal al código QR en el teléfono del cliente o a su tarjeta física.
            </p>
            <QRCameraScanner
              onScanSuccess={handlePosClientQrScan}
              title="Apunta al QR del Cliente"
              subtitle="Enfoca la tarjeta o pantalla del socio"
              onNotify={onNotify}
            />
            <div style={{marginTop:`16px`,textAlign:`center`}}>
              <button
                type="button"
                onClick={()=>setShowPosCameraScanner(false)}
                className="btn btn-secondary"
                style={{width:`100%`,padding:`10px`}}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
        )
      }
      <StoreOnboardingModal
        isOpen={showStoreOnboarding}
        onClose={()=>setShowStoreOnboarding(false)}
        storeName={safeStore.name}
        onConfigureCard={() => {
          setShowStoreOnboarding(false);
          setShowStoreProfileModal(true);
        }}
      />
      {
        showStoreProfileModal&&currentStoreObj && (
          <StoreProfileModal
          isOpen={showStoreProfileModal}
          onClose={()=>setShowStoreProfileModal(false)}
          store={currentStoreObj}
          stores={stores}
          setStores={setStores}
          config={config}
          onNotify={onNotify}
          initialTab="STAMPS"
          isMandatoryFirstTime={!isCardConfigured}
        />
        )
      }
      {
        promoToEnd && (
          <div
          className="modal-overlay"
          onClick={() => { if (!isEndingPromo) setPromoToEnd(null); }}
          style={{position:`fixed`,inset:0,backgroundColor:`rgba(15, 23, 42, 0.65)`,backdropFilter:`blur(4px)`,display:`flex`,alignItems:`center`,justifyContent:`center`,zIndex:1e4,padding:`16px`}}
        >
          <div
            className="modal-dialog"
            onClick={e=>e.stopPropagation()}
            style={{padding:`24px`,borderRadius:`20px`,maxWidth:`480px`,width:`100%`,background:`#FFFFFF`,boxShadow:`0 25px 50px -12px rgba(0, 0, 0, 0.25)`,position:`relative`,border:`1px solid #F1F5F9`}}
          >
            <div style={{display:`flex`,justifyContent:`space-between`,alignItems:`flex-start`,marginBottom:`14px`}}>
              <div style={{display:`flex`,alignItems:`center`,gap:`10px`}}>
                <div
                  style={{width:`42px`,height:`42px`,borderRadius:`12px`,background:`#FEE2E2`,display:`flex`,alignItems:`center`,justifyContent:`center`,flexShrink:0}}
                >
                  <AlertTriangle size={22} color="#DC2626" />
                </div>
                <div>
                  <h3 style={{fontSize:`1.15rem`,fontWeight:800,color:`#1E293B`,margin:0,lineHeight:1.25}}>Finalizar Promoción</h3>
                  <span style={{fontSize:`0.75rem`,color:`#64748B`,fontWeight:600}}>{currentStoreObj?.name||safeStore.name}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { if (!isEndingPromo) setPromoToEnd(null); }}
                disabled={isEndingPromo}
                style={{background:`#F1F5F9`,border:`none`,color:`#64748B`,cursor:isEndingPromo?`not-allowed`:`pointer`,width:`32px`,height:`32px`,borderRadius:`50%`,display:`flex`,alignItems:`center`,justifyContent:`center`}}
                title="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
            <div
              style={{background:`#FAF8F5`,border:`1.5px solid #EDE2D5`,borderRadius:`14px`,padding:`14px 16px`,marginBottom:`16px`}}
            >
              <div style={{display:`flex`,alignItems:`center`,gap:`6px`,marginBottom:`6px`}}>
                <span
                  style={{fontSize:`0.68rem`,fontWeight:800,textTransform:`uppercase`,letterSpacing:`0.5px`,color:`#9C382A`,background:`#F7EFE8`,padding:`2px 8px`,borderRadius:`6px`}}
                >
                  Promoción a cerrar
                </span>
                {
                  promoToEnd.discountPercent && (
                  <span
                  style={{fontSize:`0.68rem`,fontWeight:800,color:`#B45309`,background:`#FEF3C7`,padding:`2px 8px`,borderRadius:`6px`}}
                  >
                  -{promoToEnd.discountPercent}%
                  </span>
                  )
                }
              </div>
              <div style={{fontSize:`0.98rem`,fontWeight:800,color:`#1E293B`,lineHeight:1.35,marginBottom:`4px`}}>{promoToEnd.title}</div>
              {
                promoToEnd.description && (
                <div style={{fontSize:`0.8rem`,color:`#64748B`,lineHeight:1.4,marginBottom:`6px`}}>{promoToEnd.description}</div>
                )
              }
              <div style={{fontSize:`0.74rem`,color:`#94A3B8`,display:`flex`,alignItems:`center`,gap:`8px`}}>
                <span>
                  🎯 
                  {promoToEnd.isUnlimited?`Cupos ilimitados`:`${promoToEnd.remainingStock??promoToEnd.totalStock} cupos`}
                </span>
                {
                  promoToEnd.validityDate && (
                  <span>📅 Vence: {promoToEnd.validityDate}</span>
                  )
                }
              </div>
            </div>
            <div
              style={{background:`#FEF2F2`,border:`1px solid #FECDD3`,borderRadius:`12px`,padding:`12px 14px`,display:`flex`,alignItems:`flex-start`,gap:`10px`,marginBottom:`20px`}}
            >
              <AlertCircle size={18} color="#DC2626" style={{flexShrink:0,marginTop:`2px`}} />
              <div style={{fontSize:`0.82rem`,color:`#991B1B`,lineHeight:1.45}}>
                <strong>¿Confirmas finalizar esta promoción antes de tiempo?</strong>
                <br />
                Pasará de inmediato al 
                <strong>historial de promociones finalizadas</strong>
                 y 
                <strong>dejará de mostrarse a los clientes</strong>
                 en la web y en la app móvil.
              </div>
            </div>
            <div style={{display:`flex`,alignItems:`center`,justifyContent:`flex-end`,gap:`10px`}}>
              <button
                type="button"
                onClick={()=>setPromoToEnd(null)}
                disabled={isEndingPromo}
                className="btn btn-secondary"
                style={{padding:`10px 18px`,borderRadius:`10px`,fontWeight:700,fontSize:`0.88rem`,border:`1.5px solid #CBD5E1`,color:`#475569`,background:`#FFFFFF`,cursor:isEndingPromo?`not-allowed`:`pointer`}}
              >
                Mantener activa
              </button>
              <button
                type="button"
                onClick={or}
                disabled={isEndingPromo}
                className="btn"
                style={{padding:`10px 20px`,borderRadius:`10px`,fontWeight:800,fontSize:`0.88rem`,background:`#DC2626`,color:`#FFFFFF`,border:`none`,display:`inline-flex`,alignItems:`center`,gap:`8px`,boxShadow:`0 4px 12px rgba(220, 38, 38, 0.3)`,cursor:isEndingPromo?`not-allowed`:`pointer`}}
              >
                {
                  isEndingPromo ? (
                  <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Finalizando...</span>
                  </>
                  ) : (
                  <>
                  <span>⏹ Sí, finalizar</span>
                  </>
                  )
                }
              </button>
            </div>
          </div>
        </div>
        )
      }
      {
        promoToResend && (
          <div
          className="modal-overlay"
          onClick={() => { if (!isSendingPromo) setPromoToResend(null); }}
          style={{position:`fixed`,inset:0,backgroundColor:`rgba(15, 23, 42, 0.65)`,backdropFilter:`blur(4px)`,display:`flex`,alignItems:`center`,justifyContent:`center`,zIndex:1e4,padding:`16px`}}
        >
          <div
            className="modal-dialog"
            onClick={e=>e.stopPropagation()}
            style={{padding:`24px`,borderRadius:`20px`,maxWidth:`480px`,width:`100%`,background:`#FFFFFF`,boxShadow:`0 25px 50px -12px rgba(0, 0, 0, 0.25)`,position:`relative`,border:`1px solid #F1F5F9`}}
          >
            <div style={{display:`flex`,justifyContent:`space-between`,alignItems:`flex-start`,marginBottom:`14px`}}>
              <div style={{display:`flex`,alignItems:`center`,gap:`10px`}}>
                <div
                  style={{width:`42px`,height:`42px`,borderRadius:`12px`,background:`var(--c-secondary-soft, #F7EFE8)`,display:`flex`,alignItems:`center`,justifyContent:`center`,flexShrink:0}}
                >
                  <BellRing size={22} color="var(--c-primary, #9C382A)" />
                </div>
                <div>
                  <h3 style={{fontSize:`1.15rem`,fontWeight:800,color:`#1E293B`,margin:0,lineHeight:1.25}}>Reenviar Notificación Push</h3>
                  <span style={{fontSize:`0.75rem`,color:`#64748B`,fontWeight:600}}>Difusión a clientes fidelizados</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { if (!isSendingPromo) setPromoToResend(null); }}
                disabled={isSendingPromo}
                style={{background:`#F1F5F9`,border:`none`,color:`#64748B`,cursor:isSendingPromo?`not-allowed`:`pointer`,width:`32px`,height:`32px`,borderRadius:`50%`,display:`flex`,alignItems:`center`,justifyContent:`center`}}
                title="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
            <div
              style={{background:`#FAF8F5`,border:`1.5px solid #EDE2D5`,borderRadius:`14px`,padding:`14px 16px`,marginBottom:`16px`}}
            >
              <div style={{fontSize:`0.98rem`,fontWeight:800,color:`#1E293B`,lineHeight:1.35,marginBottom:`4px`}}>{promoToResend.title}</div>
              {
                promoToResend.description && (
                <div style={{fontSize:`0.8rem`,color:`#64748B`,lineHeight:1.4}}>{promoToResend.description}</div>
                )
              }
            </div>
            <div
              style={{background:`#F8FAFC`,border:`1px solid #E2E8F0`,borderRadius:`12px`,padding:`12px 14px`,display:`flex`,alignItems:`flex-start`,gap:`10px`,marginBottom:`20px`}}
            >
              <Megaphone size={18} color="var(--c-primary, #9C382A)" style={{flexShrink:0,marginTop:`2px`}} />
              <div style={{fontSize:`0.82rem`,color:`#334155`,lineHeight:1.45}}>
                Esta acción reenviará la alerta push a los dispositivos móviles y navegadores de tus clientes.
                <div style={{marginTop:`4px`,fontWeight:700,color:`#0F172A`}}>Consumirá 1 envío de tu cupo mensual ({Kn+1}/{Hn>0?Hn:`∞`}).</div>
              </div>
            </div>
            <div style={{display:`flex`,alignItems:`center`,justifyContent:`flex-end`,gap:`10px`}}>
              <button
                type="button"
                onClick={()=>setPromoToResend(null)}
                disabled={isSendingPromo}
                className="btn btn-secondary"
                style={{padding:`10px 18px`,borderRadius:`10px`,fontWeight:700,fontSize:`0.88rem`,border:`1.5px solid #CBD5E1`,color:`#475569`,background:`#FFFFFF`,cursor:isSendingPromo?`not-allowed`:`pointer`}}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={Xn}
                disabled={isSendingPromo}
                className="btn"
                style={{padding:`10px 20px`,borderRadius:`10px`,fontWeight:800,fontSize:`0.88rem`,background:`var(--c-primary, #9C382A)`,color:`#FFFFFF`,border:`none`,display:`inline-flex`,alignItems:`center`,gap:`8px`,boxShadow:`0 4px 12px rgba(156, 56, 42, 0.3)`,cursor:isSendingPromo?`not-allowed`:`pointer`}}
              >
                {
                  isSendingPromo ? (
                  <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Reenviando...</span>
                  </>
                  ) : (
                  <>
                  <BellRing size={16} />
                  <span>Reenviar Push</span>
                  </>
                  )
                }
              </button>
            </div>
          </div>
        </div>
        )
      }
      <style>
        {`
        .pos-terminal-container {
          display: flex;
          min-height: 100vh;
          min-height: 100dvh;
          background: #FAF8F5;
          font-family: var(--font-body);
          position: relative;
          color: var(--text-main);
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
          box-sizing: border-box;
          align-items: stretch;
        }

        .pos-sidebar {
          width: 245px;
          min-width: 245px;
          background: #FFFFFF;
          border-right: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          height: 100vh;
          height: 100dvh;
          min-height: 100vh;
          min-height: 100dvh;
          max-height: 100vh;
          max-height: 100dvh;
          position: sticky;
          top: 0;
          bottom: 0;
          align-self: stretch;
          z-index: 40;
          box-shadow: 2px 0 16px rgba(0, 0, 0, 0.02);
          box-sizing: border-box;
          overflow: hidden;
        }

        .pos-sidebar-close-btn {
          display: none;
          background: #FAF8F5;
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          padding: 5px;
          cursor: pointer;
          color: var(--text-main);
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .pos-sidebar-close-btn:hover {
          background: #F1ECE6;
          color: var(--c-primary);
        }

        .pos-sidebar-header {
          padding: 12px 14px 10px;
          border-bottom: 1px solid var(--border-subtle);
          flex-shrink: 0;
        }

        .pos-sidebar-store-card {
          padding: 8px 10px;
          margin: 8px 10px 4px;
          background: #FAF8F5;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
          flex-shrink: 0;
        }

        .pos-store-select {
          width: 100%;
          padding: 6px 8px;
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--text-main);
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          outline: none;
          cursor: pointer;
        }

        .pos-sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 6px 8px;
          flex: 1 1 auto;
          min-height: 0;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #E2E8F0 transparent;
          -webkit-overflow-scrolling: touch;
        }

        .pos-sidebar-nav::-webkit-scrollbar {
          width: 3px;
        }
        .pos-sidebar-nav::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 4px;
        }

        .pos-nav-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 6px 8px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-size: 0.76rem;
          font-weight: 400;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
        }

        .pos-nav-btn:hover {
          background: #FAF8F5;
          color: var(--text-main);
          transform: translateX(2px);
        }

        .pos-nav-btn.is-active {
          background: var(--c-secondary-soft);
          color: var(--c-primary);
          font-weight: 500;
          box-shadow: 0 1px 6px rgba(156, 56, 42, 0.08);
        }

        .pos-nav-icon {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          background: #F1ECE6;
          color: var(--c-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }

        .pos-nav-icon.is-active {
          background: var(--c-primary);
          color: #FFFFFF;
        }

        .pos-nav-title {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-main);
          line-height: 1.15;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          letter-spacing: -0.01em;
        }

        .pos-nav-btn.is-active .pos-nav-title {
          color: var(--c-primary);
          font-weight: 600;
        }

        .pos-nav-desc {
          font-size: 0.60rem;
          font-weight: 400;
          color: #64748B;
          line-height: 1.15;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .pos-nav-badge {
          font-size: 0.58rem;
          font-weight: 800;
          background: var(--c-primary);
          color: #FFFFFF;
          padding: 1px 5px;
          border-radius: 999px;
          flex-shrink: 0;
        }

        .pos-sidebar-footer {
          padding: 6px 10px 8px;
          border-top: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          gap: 4px;
          background: #FFFFFF;
          flex-shrink: 0;
          margin-top: auto;
        }

        .pos-bcv-card,
        .pos-rate-box {
          background: #FAF8F5;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 5px 8px;
        }

        .pos-rate-refresh-btn {
          background: transparent;
          border: none;
          color: var(--c-primary);
          cursor: pointer;
          padding: 2px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
        }

        .pos-rate-refresh-btn:hover {
          background: #FFFFFF;
          transform: rotate(45deg);
        }

        .pos-cashier-card {
          background: #FAF8F5;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 5px 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .pos-cashier-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--c-primary);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.70rem;
          flex-shrink: 0;
        }
          background: var(--c-primary);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.82rem;
          flex-shrink: 0;
        }

        .spin-animation {
          animation: spinRate 1s linear infinite;
        }

        @keyframes spinRate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .pos-logout-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid #FECDD3;
          background: #FFFFFF;
          color: var(--c-rose);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pos-logout-btn:hover {
          background: #FFF1F2;
          transform: scale(1.04);
        }

        .pos-main-workspace {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          width: 100%;
          max-width: 100%;
          background: #FAF8F5;
          min-height: 100vh;
          overflow-x: hidden;
          box-sizing: border-box;
        }

        .pos-topbar {
          min-height: 64px;
          height: auto;
          background: #FFFFFF;
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 28px;
          position: sticky;
          top: 0;
          z-index: 30;
          box-shadow: 0 1px 6px rgba(0, 0, 0, 0.02);
          width: 100%;
          box-sizing: border-box;
          gap: 12px;
        }

        .pos-workspace-content {
          padding: 24px 28px 48px;
          max-width: 1400px;
          width: 100%;
          margin: 0 auto;
          box-sizing: border-box;
          flex: 1;
          min-width: 0;
          overflow-x: hidden;
        }

        .pos-checkout-grid {
          display: grid;
          grid-template-columns: 430px 1fr;
          gap: 22px;
          align-items: start;
          width: 100%;
          min-width: 0;
        }

        .pos-mobile-menu-trigger {
          display: none;
          background: #FAF8F5;
          border: 1px solid var(--border-subtle);
          border-radius: 9px;
          padding: 7px;
          cursor: pointer;
          color: var(--text-main);
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }

        .pos-mobile-menu-trigger:hover {
          background: #F1ECE6;
          color: var(--c-primary);
        }

        .pos-pulse-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #16A34A;
          display: inline-block;
          animation: posPulse 2s infinite;
        }

        @keyframes posPulse {
          0% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.45); }
          70% { box-shadow: 0 0 0 6px rgba(22, 163, 74, 0); }
          100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
        }

        @keyframes posFadeInBackdrop {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @media (max-width: 1120px) {
          .pos-checkout-grid {
            grid-template-columns: 100%;
            gap: 16px;
          }
        }

        @media (max-width: 920px) {
          .pos-sidebar {
            position: fixed !important;
            left: -320px;
            top: 0 !important;
            bottom: 0 !important;
            width: 285px !important;
            min-width: 0 !important;
            max-width: 86vw !important;
            height: 100% !important;
            height: 100vh !important;
            height: 100dvh !important;
            min-height: 100% !important;
            min-height: 100vh !important;
            min-height: 100dvh !important;
            max-height: 100% !important;
            max-height: 100vh !important;
            max-height: 100dvh !important;
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important;
            background: #FFFFFF !important;
            transition: left 0.28s cubic-bezier(0.16, 1, 0.3, 1);
            z-index: 1000;
            box-shadow: 8px 0 32px rgba(0,0,0,0.20);
            overscroll-behavior: contain;
          }
          .pos-sidebar.is-open {
            left: 0 !important;
          }
          .pos-sidebar-nav {
            flex: 1 1 auto !important;
            min-height: 0 !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .pos-sidebar-footer {
            margin-top: auto !important;
            flex-shrink: 0 !important;
            background: #FFFFFF !important;
          }
          .pos-sidebar-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.52);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            z-index: 999;
            animation: posFadeInBackdrop 0.2s ease-out;
          }
          .pos-sidebar-close-btn {
            display: inline-flex !important;
          }
          .pos-mobile-menu-trigger {
            display: inline-flex;
          }
          .pos-topbar {
            padding: 8px 12px;
            min-height: 54px;
            gap: 6px;
          }
          .pos-workspace-content {
            padding: 12px 10px 80px;
          }
          .pos-btn-text {
            display: none !important;
          }
        }

        @media (max-width: 640px) {
          .pos-workspace-content {
            padding: 10px 8px 90px;
          }
          .glass-panel {
            padding: 14px 12px !important;
            border-radius: 16px !important;
          }
          .pos-topbar-title {
            font-size: 1.05rem !important;
          }
          .pos-action-btn {
            padding: 6px 8px !important;
          }
          .custom-table-container {
            margin: 0 -2px;
            border-radius: 10px;
          }
        }

        /* Promo Tables - Sin scroll horizontal y responsivo */
        .promo-table-wrapper {
          width: 100% !important;
          overflow-x: hidden !important;
          background: #FFFFFF;
          border-radius: 14px;
          border: 1.5px solid #EDE2D5;
          box-shadow: 0 1px 4px rgba(0,0,0,0.03);
          margin-bottom: 16px;
          box-sizing: border-box;
        }
        .promo-custom-table {
          width: 100% !important;
          border-collapse: collapse;
          table-layout: auto;
        }
        .promo-custom-table tr:hover td {
          background: #FAF8F5 !important;
        }
        @media (max-width: 768px) {
          .promo-custom-table thead {
            display: none !important;
          }
          .promo-custom-table,
          .promo-custom-table tbody,
          .promo-custom-table tr,
          .promo-custom-table td {
            display: block !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .promo-custom-table tr {
            padding: 14px 12px !important;
            border-bottom: 2px solid #EDE2D5 !important;
          }
          .promo-custom-table td {
            padding: 4px 0 !important;
            border-bottom: none !important;
          }
          .promo-custom-table td.promo-actions-cell {
            padding-top: 10px !important;
            border-top: 1px dashed #EDE2D5 !important;
            margin-top: 6px !important;
            display: flex !important;
            justify-content: flex-end !important;
          }
        }
      `}
      </style>
      {
        showPrintStandModal && (
          <StoreQrPrintStand store={safeStore} config={config} isModal onClose={()=>setShowPrintStandModal(false)} />
        )
      }
    </div>
  );
}
