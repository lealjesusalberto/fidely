import React, { useState, useEffect, useMemo } from 'react';
import QRCodeDisplay from './QRCodeDisplay';
import QRCameraScanner from './QRCameraScanner';
import { fireRedemptionConfetti } from '../utils/confetti';
import { saveRedemption, saveClient, claimStorePromotionCoupon } from '../firebase/firestoreService';
import {
  Coffee,
  ShoppingBag,
  TicketPercent,
  Gift,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  QrCode,
  CheckCircle2,
  Clock,
  History,
  X,
  Copy,
  LogOut,
  Sparkles,
  Award,
  AlertCircle,
  Coins,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Receipt,
  Filter,
  MapPin,
  Store,
  Camera,
  Scan,
  Check,
  Loader2,
  Home,
  User,
  Lock,
  Key,
  Shield,
  Search,
  Phone,
  Tag,
  Scissors,
  Utensils,
  Gem,
  Heart,
  Crown,
  Star,
  Plus,
  PlusCircle,
  Bell,
  BellRing,
  BellOff,
  Smartphone
} from 'lucide-react';
import StoreLogoBadge from './StoreLogoBadge';
import { requestFideliWebPush, getWebPushPermissionState } from '../firebase/messagingService';
import { ref, set } from 'firebase/database';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, rtdb, auth } from '../firebase/config';
import { updatePassword } from 'firebase/auth';

export function isStorePromotionActive(promo) {
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
  return true;
}

export function createStoreLoyaltyCard(store, client, initialStamps = 0) {
  const safeStore = store || { id: 'STR-01', name: 'Tienda Oficial' };
  const target = Number(safeStore.stampsTarget || safeStore.targetStamps || 6);
  const current = initialStamps;
  const stampRewards = Array.isArray(safeStore.stampRewards) && safeStore.stampRewards.length > 0
    ? safeStore.stampRewards
    : [{ id: 'rew_def', stamps: target, title: safeStore.rewardTitle || 'Premio de Fidelidad', icon: '🎁' }];

  return {
    id: `CARD-${safeStore.id}-${(client?.id || client?.docId || 'CLI').replace(/[^a-zA-Z0-9]/g, '').slice(-4)}`,
    storeId: safeStore.id,
    storeName: safeStore.name,
    storeCategory: safeStore.category || 'Comercio Aliado',
    cardColor: safeStore.cardColor || safeStore.design?.cardColor || '#18181B',
    cardGradient: safeStore.cardGradient || safeStore.design?.cardGradient || '#090D16',
    cardBackgroundImage: safeStore.cardBackgroundImage || safeStore.design?.cardBackgroundImage || safeStore.backgroundImage || null,
    cardPattern: safeStore.cardPattern || safeStore.design?.cardPattern || 'radial',
    logo: safeStore.logo || safeStore.photoUrl || null,
    stampIcon: safeStore.stampIcon || safeStore.design?.stampIcon || 'star',
    stampsTarget: target,
    currentStamps: current,
    stampRewards: stampRewards,
    rewardTitle: safeStore.rewardTitle || safeStore.currentReward || 'Premio de Fidelidad en Tienda',
    minPurchaseForStamp: parseFloat(safeStore.minPurchaseForStamp ?? safeStore.minPurchaseUsd ?? 5.0),
    stampCondition: safeStore.stampCondition || `1 sello por cada compra a partir de US${parseFloat(safeStore.minPurchaseForStamp ?? safeStore.minPurchaseUsd ?? 5.0).toFixed(2)}`,
    status: 'ACTIVA',
    createdAt: new Date().toISOString(),
    lastStampAt: new Date().toISOString()
  };
}

const renderStampIcon = (id, size = 16, color = '#FFFFFF') => {
  switch (id) {
    case 'scissors': return <Scissors size={size} color={color} />;
    case 'coffee': return <Coffee size={size} color={color} />;
    case 'utensils': return <Utensils size={size} color={color} />;
    case 'shopping-bag': return <ShoppingBag size={size} color={color} />;
    case 'gem': return <Gem size={size} color={color} />;
    case 'heart': return <Heart size={size} color={color} />;
    case 'crown': return <Crown size={size} color={color} />;
    case 'star':
    default:
      return <Star size={size} color={color} />;
  }
};

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(deltaPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function ClientPortalView({
  selectedClient,
  clients,
  setClients,
  rewards,
  redemptions,
  setRedemptions,
  movements,
  setMovements,
  config,
  stores,
  purchases,
  onNotify,
  onLogout,
  onNavigate
}) {
  const allStores = useMemo(() => (Array.isArray(stores) ? stores : []), [stores]);
  const approvedStores = useMemo(() => (
    allStores.filter(s => s.status === 'APROBADO' || !s.status || s.status === 'ACTIVO')
  ), [allStores]);

  const [activeTab, setActiveTab] = useState('INICIO'); // 'INICIO' | 'TIENDAS' | 'RECOMPENSAS' | 'ACTIVIDAD'
  const [selectedStoreFilter, setSelectedStoreFilter] = useState('ALL'); // 'ALL' or storeId
  const [showCardModal, setShowCardModal] = useState(false);
  const [selectedCardForModal, setSelectedCardForModal] = useState(null);
  const [selectedRewardToRedeem, setSelectedRewardToRedeem] = useState(null);
  const [activeVoucherModal, setActiveVoucherModal] = useState(null);
  // Promociones y Cupones Flash Segmentados por Tienda
  const [activePromotions, setActivePromotions] = useState([]);
  const [isClaimingPromoId, setIsClaimingPromoId] = useState(null);
  const [showConecta2Banner, setShowConecta2Banner] = useState(true);

  // Escuchar promociones activas desde Firestore
  useEffect(() => {
    if (!db) return;
    try {
      const promoCol = collection(db, 'store_promotions');
      const unsubscribe = onSnapshot(promoCol, (snapshot) => {
        const list = [];
        snapshot.forEach(docSnap => {
          list.push({ ...docSnap.data(), id: docSnap.id });
        });
        setActivePromotions(list);
      }, (err) => {
        console.warn('Error escuchando store_promotions en ClientPortalView:', err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Excepción al suscribir a promociones en ClientPortalView:', e);
    }
  }, []);

  // Promociones elegibles para este cliente (solo de tiendas donde tiene tarjeta de fidelización y que estén activas)
  const eligiblePromotions = useMemo(() => {
    const cards = selectedClient?.loyaltyCards || [];
    const clientStoreIds = cards.map(c => String(c.storeId || c.id || '').trim().toLowerCase()).filter(Boolean);
    if (clientStoreIds.length === 0) return [];

    return activePromotions.filter(promo => {
      if (!isStorePromotionActive(promo)) return false;
      const pStoreId = String(promo.storeId || '').trim().toLowerCase();
      if (!clientStoreIds.includes(pStoreId)) return false;
      return true;
    });
  }, [activePromotions, selectedClient?.loyaltyCards]);

  // Reclamo atómico de cupón (evita sobreventa)
  const handleClaimPromo = async (promo) => {
    if (isClaimingPromoId) return;
    setIsClaimingPromoId(promo.id);
    try {
      const voucher = await claimStorePromotionCoupon(promo.id, selectedClient);
      fireRedemptionConfetti();
      if (onNotify) {
        onNotify(`🎉 ¡Cupón reclamado con éxito! Muestra tu código QR en ${promo.storeName || 'tienda'}.`, 'success');
      }
      setActiveVoucherModal(voucher);
    } catch (err) {
      console.error('Error al reclamar cupón:', err);
      if (onNotify) {
        onNotify(err.message || 'No se pudo reclamar el cupón.', 'error');
      }
    } finally {
      setIsClaimingPromoId(null);
    }
  };

  const [rewardsSubTab, setRewardsSubTab] = useState('CATALOGO'); // 'CATALOGO' | 'RECLAMADOS'
  const [rewardCategoryFilter, setRewardCategoryFilter] = useState('ALL');
  const [activityFilter, setActivityFilter] = useState('ALL');
  const [expandedMovementId, setExpandedMovementId] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [storeCategoryFilter, setStoreCategoryFilter] = useState('ALL');
  const [storeSearchQuery, setStoreSearchQuery] = useState('');
  const [showWelcomeStoreModal, setShowWelcomeStoreModal] = useState(() => {
    return !selectedClient?.hasSelectedWelcomeStore;
  });

  const [webPushPermission, setWebPushPermission] = useState(() => getWebPushPermissionState());
  const [pushStatusMessage, setPushStatusMessage] = useState(null);
  const [isActivatingPush, setIsActivatingPush] = useState(false);
  const [activePushAlert, setActivePushAlert] = useState(null);

  // Proximity & Geolocation State (< 500m como en la app móvil)
  const [isProximityAlertsEnabled, setIsProximityAlertsEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('fideli_proximity_enabled');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [userCoords, setUserCoords] = useState(null);
  const [isViewingAllCards, setIsViewingAllCards] = useState(false);

  // Modal para crear o actualizar clave para la App Móvil
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [appPasswordInput, setAppPasswordInput] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState('');
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');

  // Modal para editar perfil (Cédula, Teléfono, Nombre, Cumpleaños)
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: selectedClient?.name || '',
    docId: selectedClient?.docId || '',
    phone: selectedClient?.phone || '',
    birthDate: selectedClient?.birthDate || ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (selectedClient) {
      setProfileForm({
        name: selectedClient.name || '',
        docId: selectedClient.docId || '',
        phone: selectedClient.phone || '',
        birthDate: selectedClient.birthDate || selectedClient.fecha_nacimiento || ''
      });
    }
  }, [selectedClient]);

  const isProfileIncomplete = useMemo(() => {
    const doc = String(selectedClient?.docId || '').trim();
    const phone = String(selectedClient?.phone || '').trim();
    const isDocPlaceholder = !doc || doc === 'N/A' || (doc.length === 8 && !/^\d+$/.test(doc));
    const isPhonePlaceholder = !phone || phone === 'N/A' || phone.includes('0000000');
    return isDocPlaceholder || isPhonePlaceholder;
  }, [selectedClient?.docId, selectedClient?.phone]);

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    if (!selectedClient) return;

    const cleanName = profileForm.name.trim();
    const cleanDoc = profileForm.docId.trim().toUpperCase();
    const cleanPhone = profileForm.phone.trim();
    const cleanBirth = profileForm.birthDate.trim();

    if (!cleanName) {
      if (onNotify) onNotify('Por favor ingresa tu nombre completo.', 'warning');
      return;
    }
    if (!cleanDoc) {
      if (onNotify) onNotify('Por favor ingresa tu número de cédula o documento.', 'warning');
      return;
    }
    if (!cleanPhone) {
      if (onNotify) onNotify('Por favor ingresa tu número de teléfono celular.', 'warning');
      return;
    }

    setIsSavingProfile(true);
    const updatedClient = {
      ...selectedClient,
      name: cleanName,
      docId: cleanDoc,
      phone: cleanPhone,
      birthDate: cleanBirth,
      fecha_nacimiento: cleanBirth,
      qrCode: `FIDELY-${cleanDoc}`,
      initials: cleanName.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'FC'
    };

    try {
      await saveClient(updatedClient);
      if (setClients) {
        setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
      }

      // Sincronizar simultáneamente en Realtime Database
      if (rtdb && (selectedClient.firebaseUid || selectedClient.id)) {
        const uid = selectedClient.firebaseUid || selectedClient.id;
        try {
          await set(ref(rtdb, `users/${uid}/name`), cleanName);
          await set(ref(rtdb, `users/${uid}/numero_cedula`), cleanDoc);
          await set(ref(rtdb, `users/${uid}/telefono`), cleanPhone);
          if (cleanBirth) {
            await set(ref(rtdb, `users/${uid}/fecha_nacimiento`), cleanBirth);
            await set(ref(rtdb, `users/${uid}/birthDate`), cleanBirth);
          }
        } catch (_) {}
      }

      if (onNotify) onNotify('🎉 ¡Perfil y Cédula actualizados con éxito!', 'success');
      setShowEditProfileModal(false);
    } catch (err) {
      console.error('Error al actualizar perfil:', err);
      if (onNotify) onNotify('Error al guardar perfil. Intenta nuevamente.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Modal de Regalo de Cumpleaños (para usuarios que entraron con Google o aún no tienen fecha de cumpleaños)
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [birthdayStep, setBirthdayStep] = useState('FORM'); // 'FORM' | 'SUCCESS_CATALOG'
  const [birthdayInput, setBirthdayInput] = useState('');
  const [isSavingBirthday, setIsSavingBirthday] = useState(false);
  const [birthdayDismissedSession, setBirthdayDismissedSession] = useState(false);

  useEffect(() => {
    if (!selectedClient || birthdayDismissedSession) return;
    const hasBirthday = Boolean(
      (selectedClient.birthDate && String(selectedClient.birthDate).trim()) ||
      (selectedClient.fecha_nacimiento && String(selectedClient.fecha_nacimiento).trim())
    );
    if (!hasBirthday) {
      setShowBirthdayModal(true);
    } else {
      setShowBirthdayModal(false);
    }
  }, [selectedClient?.id, selectedClient?.birthDate, selectedClient?.fecha_nacimiento, birthdayDismissedSession]);

  const handleSaveBirthday = async (e) => {
    if (e) e.preventDefault();
    if (!birthdayInput || !selectedClient) return;
    setIsSavingBirthday(true);
    try {
      const updatedClient = {
        ...selectedClient,
        birthDate: birthdayInput.trim(),
        fecha_nacimiento: birthdayInput.trim()
      };
      await saveClient(updatedClient);
      if (setClients) {
        setClients(prev => prev.map(c => c.id === selectedClient.id ? updatedClient : c));
      }
      const targetUid = auth.currentUser?.uid || selectedClient.firebaseUid || selectedClient.id;
      if (targetUid && rtdb) {
        try {
          await set(ref(rtdb, `users/${targetUid}/fecha_nacimiento`), birthdayInput.trim());
          await set(ref(rtdb, `users/${targetUid}/birthDate`), birthdayInput.trim());
        } catch (_) { }
      }
      // Avanzar al paso para invitar a explorar el catálogo de tiendas
      setBirthdayStep('SUCCESS_CATALOG');
      fireRedemptionConfetti();
      if (onNotify) {
        onNotify('🎂 ¡Fecha de cumpleaños guardada! Ahora puedes explorar las tiendas.', 'success');
      }
    } catch (err) {
      console.error('Error guardando fecha de cumpleaños:', err);
      if (onNotify) {
        onNotify('No se pudo guardar la fecha de cumpleaños. Intenta de nuevo.', 'error');
      }
    } finally {
      setIsSavingBirthday(false);
    }
  };

  const handleSetAppPassword = async (e) => {
    if (e) e.preventDefault();
    if (!appPasswordInput || appPasswordInput.length < 6) {
      setPasswordErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setIsUpdatingPassword(true);
    setPasswordErrorMessage('');
    setPasswordSuccessMessage('');
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, appPasswordInput);
        setPasswordSuccessMessage('¡Contraseña guardada con éxito! Ya puedes iniciar sesión en la App Móvil con tu correo y esta contraseña.');
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordSuccessMessage('');
          setAppPasswordInput('');
        }, 2800);
      } else {
        setPasswordErrorMessage('No se detectó una sesión activa de Firebase Auth.');
      }
    } catch (err) {
      console.error('Error al actualizar contraseña:', err);
      if (err.code === 'auth/requires-recent-login') {
        setPasswordErrorMessage('Por seguridad de Google, cierra sesión e inicia nuevamente antes de cambiar la contraseña.');
      } else {
        setPasswordErrorMessage(err.message || 'No se pudo guardar la contraseña.');
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // GPS Location Watcher para activación de tarjeta por cercanía
  useEffect(() => {
    if (!isProximityAlertsEnabled || typeof navigator === 'undefined' || !navigator.geolocation) {
      setUserCoords(null);
      return;
    }

    let watchId;
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        },
        () => { },
        { enableHighAccuracy: true, timeout: 8000 }
      );

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        },
        () => { },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    } catch (e) {
      console.log('Error proximity geolocation:', e);
    }

    return () => {
      if (watchId && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isProximityAlertsEnabled]);

  // Disparar aviso push y notificación web cuando el usuario entra en el radio de una tienda o sucursal (< 500m)
  useEffect(() => {
    if (!isProximityAlertsEnabled || !userCoords || !allStores || allStores.length === 0) return;

    for (const store of allStores) {
      const storeLocations = (Array.isArray(store.locations) && store.locations.length > 0)
        ? store.locations.filter(l => l.latitude != null && l.longitude != null)
        : (store.latitude != null && store.longitude != null)
          ? [{ name: store.name, latitude: store.latitude, longitude: store.longitude, radiusMeters: store.geofenceRadius || store.radiusMeters || 150 }]
          : [];

      for (const loc of storeLocations) {
        const dist = calculateDistanceMeters(userCoords.latitude, userCoords.longitude, Number(loc.latitude), Number(loc.longitude));
        const storeRadius = Math.min(500, Math.max(50, Number(loc.radiusMeters || store.geofenceRadius || store.radiusMeters || 150)));
        if (dist != null && dist <= storeRadius) {
          const storeId = store.id;
          const lastAlertKey = `fideli_web_notif_${storeId}_${loc.id || 'loc'}`;
          const lastAlertTime = Number(sessionStorage.getItem(lastAlertKey) || 0);
          const now = Date.now();
          // Cooldown de 15 minutos por tienda/sucursal en la sesión web para no saturar
          if (now - lastAlertTime < 15 * 60 * 1000) {
            break;
          }
          sessionStorage.setItem(lastAlertKey, String(now));

          const matchingCard = (selectedClient?.loyaltyCards || []).find(c => c.storeId === store.id);
          const currentStamps = matchingCard ? (matchingCard.currentStamps || 0) : 0;
          const targetStamps = (matchingCard && matchingCard.stampsTarget) ? matchingCard.stampsTarget : (store.stampsTarget || 6);
          const missingStamps = Math.max(0, targetStamps - currentStamps);

          const branchSuffix = loc.name && loc.name !== store.name ? ` (${loc.name})` : '';
          const title = `📍 ¡Estás cerca de ${store.name}${branchSuffix}!`;
          const body = missingStamps > 0
            ? `¡Solo te faltan ${missingStamps} sellos para tu premio! Pasa hoy y sella tu tarjeta.`
            : `¡Tienes premios listos para canjear en ${store.name}!`;

          // 1. Banner visual en primer plano dentro del portal
          setActivePushAlert({
            title,
            body,
            imageUrl: store.logo || store.photoUrl || '/fidely.png',
            storeId: store.id
          });

          // 2. Notificación nativa del navegador si el usuario otorgó permiso
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(reg => {
                  reg.showNotification(title, {
                    body,
                    icon: '/fidely.png',
                    badge: '/favicon.svg',
                    tag: `prox_${storeId}`,
                    renotify: true
                  });
                }).catch(() => {
                  new Notification(title, { body, icon: '/fidely.png' });
                });
              } else {
                new Notification(title, { body, icon: '/fidely.png' });
              }
            } catch (err) {
              console.warn('[Web Notif] Error:', err);
            }
          }

          // 3. Disparo a Cloud Function por Realtime Database (igual que app móvil)
          try {
            const clientId = selectedClient?.id || selectedClient?.docId;
            if (clientId && rtdb) {
              set(ref(rtdb, `notificaciones_proximidad_fideli/${clientId}/${storeId}`), {
                distanceMeters: Math.round(dist),
                timestamp: Date.now(),
                force: false,
                realtimeTrigger: now,
                source: 'web'
              });
            }
          } catch (rtdbErr) {
            console.warn('[RTDB Proximity] Error:', rtdbErr);
          }
          break;
        }
      }
    }
  }, [userCoords, isProximityAlertsEnabled, allStores, selectedClient]);

  // Auto-refrescar token en segundo plano si las notificaciones ya fueron concedidas
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const clientId = selectedClient?.id || selectedClient?.docId;
      if (clientId) {
        requestFideliWebPush(clientId, (payload) => {
          const title = payload.notification?.title || payload.data?.title || 'Fidely Club';
          const body = payload.notification?.body || payload.data?.body || '';
          setActivePushAlert({
            title,
            body,
            imageUrl: payload.notification?.imageUrl || payload.data?.image_url,
            storeId: payload.data?.store_id,
          });
        });
      }
    }
  }, [selectedClient?.id, selectedClient?.docId]);

  const handleEnableNotifications = async () => {
    if (!selectedClient?.id && !selectedClient?.docId) return;
    setIsActivatingPush(true);
    setPushStatusMessage(null);
    const clientId = selectedClient.id || selectedClient.docId;
    const res = await requestFideliWebPush(clientId, (payload) => {
      const title = payload.notification?.title || payload.data?.title || 'Fidely Club';
      const body = payload.notification?.body || payload.data?.body || '';
      setActivePushAlert({
        title,
        body,
        imageUrl: payload.notification?.imageUrl || payload.data?.image_url,
        storeId: payload.data?.store_id,
      });
    });
    setIsActivatingPush(false);
    if (res.success) {
      setWebPushPermission('granted');
      setPushStatusMessage('¡Notificaciones push activadas con éxito!');
      setTimeout(() => setPushStatusMessage(null), 5000);
    } else {
      setPushStatusMessage(res.error || 'No se pudieron activar las notificaciones.');
      setTimeout(() => setPushStatusMessage(null), 6000);
    }
  };

  const handleSelectWelcomeStore = (chosenStore) => {
    if (!chosenStore || !selectedClient) return;
    const clientCards = selectedClient?.loyaltyCards || [];
    let updatedCards = clientCards;
    if (!clientCards.some(c => c.storeId === chosenStore.id)) {
      const newCard = createStoreLoyaltyCard(chosenStore, selectedClient, 0);
      updatedCards = [...clientCards, newCard];
    }
    const updatedClient = {
      ...selectedClient,
      favoriteStoreId: chosenStore.id,
      hasSelectedWelcomeStore: true,
      loyaltyCards: updatedCards
    };
    saveClient(updatedClient);
    if (setClients) {
      setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    }
    setSelectedStoreFilter(chosenStore.id);
    if (onNotify) {
      onNotify(`🎉 ¡Tarjeta de fidelización activada en ${chosenStore.name} con 0 sellos! Preséntala en caja para empezar a sellar.`, 'success');
    }
  };

  // In-Store QR Scanning & Real-time POS Redemption Flow
  const [showStoreScanModal, setShowStoreScanModal] = useState(false);
  const [scanStep, setScanStep] = useState(1); // 1: Scan Store QR, 2: Show available pts & confirm, 3: Order sent to POS
  const [scannedStoreId, setScannedStoreId] = useState('STR-01');
  const [selectedRewardForStore, setSelectedRewardForStore] = useState(null);
  const [redemptionStoreId, setRedemptionStoreId] = useState('STR-01');
  const [redemptionStep, setRedemptionStep] = useState(1);
  const [storeQrScanned, setStoreQrScanned] = useState(false);
  const [pendingRedemptionId, setPendingRedemptionId] = useState(null);
  const [isScanningSimulation, setIsScanningSimulation] = useState(false);

  // Watch for real-time POS cashier approval of redemption requests
  useEffect(() => {
    if (selectedClient && pendingRedemptionId) {
      const found = redemptions.find(r => r.id === pendingRedemptionId);
      if (found && (found.status === 'APROBADO' || found.status === 'USADO')) {
        fireRedemptionConfetti();
        onNotify(`¡Puntos de Saldo aprobados por la tienda! Se han sumado US$${found.nominalValueUsd?.toFixed(2)} como saldo a tu compra en ${found.storeName || 'la tienda'}.`, 'success');
        setActiveVoucherModal(found);
        setSelectedRewardToRedeem(null);
        setShowStoreScanModal(false);
        setPendingRedemptionId(null);
        setRedemptionStep(1);
        setScanStep(1);
        setStoreQrScanned(false);
      } else if (found && found.status === 'RECHAZADO') {
        onNotify(`La tienda no pudo aprobar el canje de saldo: ${found.rejectionReason || 'Verificación no superada'}`, 'error');
        setSelectedRewardToRedeem(null);
        setShowStoreScanModal(false);
        setPendingRedemptionId(null);
        setRedemptionStep(1);
        setScanStep(1);
        setStoreQrScanned(false);
      }
    }
  }, [redemptions, pendingRedemptionId, selectedClient]);

  if (!selectedClient) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <h2>No hay ningún cliente seleccionado</h2>
        <p style={{ color: 'var(--text-muted)' }}>Inicia sesión para explorar tu espacio fidely.</p>
      </div>
    );
  }



  const filteredStoresList = approvedStores.filter(st => {
    if (storeCategoryFilter !== 'ALL') {
      const catA = (st.category || '').toLowerCase();
      const catB = storeCategoryFilter.toLowerCase();
      if (!catA.includes(catB) && !catB.includes(catA)) return false;
    }
    if (storeSearchQuery.trim()) {
      const q = storeSearchQuery.toLowerCase().trim();
      const matchName = (st.name || '').toLowerCase().includes(q);
      const matchCity = (st.city || '').toLowerCase().includes(q);
      const matchAddress = (st.address || '').toLowerCase().includes(q);
      const matchCategory = (st.category || '').toLowerCase().includes(q);
      if (!matchName && !matchCity && !matchAddress && !matchCategory) return false;
    }
    return true;
  });

  // 1. Proximidad de Tiendas (< 500m) en tiempo real (Soporta comercios con hasta 2 locales)
  let nearbyStoreMatch = null;
  if (isProximityAlertsEnabled && userCoords && allStores.length > 0) {
    for (const store of allStores) {
      const storeLocations = (Array.isArray(store.locations) && store.locations.length > 0)
        ? store.locations.filter(l => l.latitude != null && l.longitude != null)
        : (store.latitude != null && store.longitude != null)
          ? [{ name: store.name, latitude: store.latitude, longitude: store.longitude, radiusMeters: store.geofenceRadius || store.radiusMeters || 150 }]
          : [];

      for (const loc of storeLocations) {
        const dist = calculateDistanceMeters(userCoords.latitude, userCoords.longitude, Number(loc.latitude), Number(loc.longitude));
        const storeRadius = Math.min(500, Math.max(50, Number(loc.radiusMeters || store.geofenceRadius || store.radiusMeters || 150)));
        if (dist != null && dist <= storeRadius) {
          const matchingCard = (selectedClient?.loyaltyCards || []).find(c => c.storeId === store.id);
          const currentStamps = matchingCard ? (matchingCard.currentStamps || 0) : 0;
          const targetStamps = (matchingCard && matchingCard.stampsTarget) ? matchingCard.stampsTarget : (store.stampsTarget || 6);
          const missingStamps = Math.max(0, targetStamps - currentStamps);
          const branchTitle = loc.name && loc.name !== store.name ? `${store.name} (${loc.name})` : (store.name || 'Comercio Aliado');

          nearbyStoreMatch = {
            store,
            branchName: loc.name || 'Local Principal',
            distanceMeters: Math.round(dist),
            formattedDistance: dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`,
            missingStamps,
            targetStamps,
            matchingCard: matchingCard ? {
              ...matchingCard,
              storeName: branchTitle,
              storeCategory: store.category || matchingCard.storeCategory || matchingCard.category,
              category: store.category || matchingCard.category,
              logo: store.logo || store.photoUrl || matchingCard.logo,
              cardColor: store.cardColor || store.design?.cardColor || matchingCard.cardColor,
              cardGradient: store.cardGradient || store.design?.cardGradient || matchingCard.cardGradient,
              cardBackgroundImage: store.cardBackgroundImage || store.design?.cardBackgroundImage || store.backgroundImage || matchingCard.cardBackgroundImage || null,
              cardPattern: store.cardPattern || store.design?.cardPattern || matchingCard.cardPattern || 'radial',
              stampsTarget: Number(store.stampsTarget || store.targetStamps || matchingCard.stampsTarget || 6),
              targetStamps: Number(store.stampsTarget || store.targetStamps || matchingCard.stampsTarget || 6),
              rewardTitle: store.rewardTitle || matchingCard.rewardTitle,
              stampRewards: (Array.isArray(store.stampRewards) && store.stampRewards.length > 0)
                ? store.stampRewards
                : matchingCard.stampRewards,
              stampIcon: store.stampIcon || matchingCard.stampIcon || 'scissors',
              minPurchaseUsd: store.minPurchaseUsd || matchingCard.minPurchaseUsd
            } : null
          };
          break;
        }
      }
      if (nearbyStoreMatch) break;
    }
  }

  // 2. Determinación de la Tarjeta Principal a destacar en Inicio (igual que en Flutter):
  // Si está cerca de un comercio aliado (< 500m), se activa automáticamente la tarjeta de ese local.
  // Si no está cerca, se muestra únicamente 1 tarjeta destacada (la de mayor progreso o la seleccionada).
  let featuredCard = null;
  let isNearbyStoreFeatured = false;
  // Solo tarjetas de comercios activos que no hayan sido eliminados en el admin, sincronizadas siempre con los datos vivos de la tienda
  const loyaltyCards = (selectedClient?.loyaltyCards || [])
    .filter(c => approvedStores.some(s => s.id === c.storeId))
    .map(c => {
      const liveStore = approvedStores.find(s => s.id === c.storeId);
      if (!liveStore) return c;
      return {
        ...c,
        storeName: liveStore.name || c.storeName,
        storeCategory: liveStore.category || c.storeCategory || c.category,
        category: liveStore.category || c.category,
        logo: liveStore.logo || liveStore.photoUrl || c.logo,
        cardColor: liveStore.cardColor || liveStore.design?.cardColor || c.cardColor,
        cardGradient: liveStore.cardGradient || liveStore.design?.cardGradient || c.cardGradient,
        cardBackgroundImage: liveStore.cardBackgroundImage || liveStore.design?.cardBackgroundImage || liveStore.backgroundImage || c.cardBackgroundImage || null,
        cardPattern: liveStore.cardPattern || liveStore.design?.cardPattern || c.cardPattern || 'radial',
        stampsTarget: Number(liveStore.stampsTarget || liveStore.targetStamps || c.stampsTarget || 6),
        targetStamps: Number(liveStore.stampsTarget || liveStore.targetStamps || c.stampsTarget || 6),
        rewardTitle: liveStore.rewardTitle || c.rewardTitle,
        stampRewards: (Array.isArray(liveStore.stampRewards) && liveStore.stampRewards.length > 0)
          ? liveStore.stampRewards
          : c.stampRewards,
        stampIcon: liveStore.stampIcon || c.stampIcon || 'scissors',
        minPurchaseUsd: liveStore.minPurchaseUsd || c.minPurchaseUsd
      };
    });

  if (nearbyStoreMatch) {
    featuredCard = nearbyStoreMatch.matchingCard || createStoreLoyaltyCard(nearbyStoreMatch.store, selectedClient, 0);
    isNearbyStoreFeatured = true;
  } else if (selectedStoreFilter && selectedStoreFilter !== 'ALL') {
    const filtered = loyaltyCards.find(c => c.storeId === selectedStoreFilter);
    featuredCard = filtered || createStoreLoyaltyCard(allStores.find(s => s.id === selectedStoreFilter) || { id: selectedStoreFilter }, selectedClient, 0);
    isNearbyStoreFeatured = false;
  } else if (loyaltyCards.length > 0) {
    const sorted = [...loyaltyCards].sort((a, b) => (Number(b.currentStamps) || 0) - (Number(a.currentStamps) || 0));
    featuredCard = sorted[0];
    isNearbyStoreFeatured = false;
  } else if (approvedStores.length > 0) {
    featuredCard = createStoreLoyaltyCard(approvedStores[0], selectedClient, 0);
    isNearbyStoreFeatured = false;
  }

  const STORE_CATEGORIES = [
    { id: 'ALL', label: 'Todas las Tiendas', icon: '🏪' },
    { id: 'Barbería', label: 'Barbería & Peluquería', icon: '💈' },
    { id: 'Tattoo', label: 'Tattoo Estudio', icon: '🎨' },
    { id: 'Panadería', label: 'Panadería & Café', icon: '🥖' },
    { id: 'Gym', label: 'Gym & Fitness', icon: '🏋️' },
    { id: 'Boutique', label: 'Boutique / Moda', icon: '👗' },
    { id: 'Calzado', label: 'Calzado / Zapatos', icon: '👟' },
    { id: 'Electrónica', label: 'Electrónica & Tech', icon: '📱' },
    { id: 'Supermercado', label: 'Supermercados', icon: '🛒' },
    { id: 'Farmacia', label: 'Farmacias & Salud', icon: '💊' },
    { id: 'Restaurante', label: 'Restaurantes & Café', icon: '☕' },
    { id: 'Belleza', label: 'Belleza & Cosmética', icon: '💄' },
    { id: 'Hogar', label: 'Hogar & Decoración', icon: '🛋️' },
    { id: 'Servicios', label: 'Servicios', icon: '✨' }
  ];

  // Discriminador: Distinguir solicitudes de sellos individuales (+1) de premios y cupones reales reclamados
  const isRealRewardClaim = (r) => {
    if (!r) return false;
    if (r.type === 'STAMP_REQUEST' || r.isStampRequest === true) return false;
    if (
      r.currentStamps !== undefined &&
      !r.stampsCost &&
      !r.pointsCost &&
      !r.voucherCode &&
      !r.isWelcomeCoupon &&
      r.type !== 'STAMP_REWARD_CLAIM'
    ) {
      return false;
    }
    const title = (r.rewardTitle || r.title || '').toString();
    if (title.includes('+1 Sello') || title.toLowerCase().includes('solicitud de sello')) {
      return false;
    }
    return true;
  };

  // Tarjetas de fidelidad de sellos del cliente (excluye comercios eliminados)
  const clientLoyaltyCards = loyaltyCards;
  const totalClientStamps = clientLoyaltyCards.reduce((acc, c) => acc + (Number(c.currentStamps) || 0), 0);

  // 1. Extraer exclusivamente los premios listos para canjear de las tarjetas de fidelidad
  const readyStampRewards = [];
  const inProgressCards = [];

  clientLoyaltyCards.forEach((card) => {
    const current = Number(card.currentStamps || 0);
    const target = Number(card.stampsTarget || 6);
    const storeName = card.storeName || 'Comercio Aliado';
    const storeId = card.storeId || card.id;
    const defaultRewardTitle = card.rewardTitle || 'Premio de Fidelidad';
    const cardColor = card.cardColor || '#9C382A';
    const stampIcon = card.stampIcon || 'star';
    const logo = card.logo || null;

    let cardHasReady = false;
    const rawRewards = card.stampRewards || card.design?.stampRewards;

    if (current > 0) {
      if (Array.isArray(rawRewards) && rawRewards.length > 0) {
        rawRewards.forEach((r) => {
          const reqStamps = Number(r.stamps || target);
          if (reqStamps > 0 && current >= reqStamps) {
            readyStampRewards.push({
              id: `ready_${storeId}_${reqStamps}_${r.id || ''}`,
              storeId,
              storeName,
              rewardTitle: r.title || defaultRewardTitle,
              rewardIcon: r.icon || '🎁',
              stampsCost: reqStamps,
              currentStamps: current,
              cardColor,
              stampIcon,
              logo,
              card
            });
            cardHasReady = true;
          }
        });
      } else {
        if (target > 0 && current >= target) {
          readyStampRewards.push({
            id: `ready_${storeId}_${target}`,
            storeId,
            storeName,
            rewardTitle: defaultRewardTitle,
            rewardIcon: '🎁',
            stampsCost: target,
            currentStamps: current,
            cardColor,
            stampIcon,
            logo,
            card
          });
          cardHasReady = true;
        }
      }
    }

    if (!cardHasReady) {
      inProgressCards.push({
        ...card,
        currentStamps: current,
        stampsTarget: target,
        missingStamps: Math.max(0, target - current),
        rewardTitle: defaultRewardTitle
      });
    }
  });

  // Historial completo del cliente: sellos acreditados + premios canjeados
  const clientAllRecords = (redemptions || []).filter((r) =>
    r.clientId === selectedClient?.id ||
    (selectedClient?.cedula && r.clientDocId && String(r.clientDocId) === String(selectedClient.cedula))
  );

  const fullActivityHistory = clientAllRecords.map((r) => {
    const isStamp = r.type === 'STAMP_REQUEST' || r.isStampRequest === true || (r.rewardTitle || '').includes('+1 Sello') || (r.title || '').includes('+1 Sello');
    return {
      ...r,
      isStampRecord: isStamp
    };
  });

  // Ordenar por fecha descendente
  fullActivityHistory.sort((a, b) => {
    const dateA = new Date(a.dateGenerated || a.date || 0).getTime();
    const dateB = new Date(b.dateGenerated || b.date || 0).getTime();
    return dateB - dateA;
  });

  const filteredHistoryRecords = fullActivityHistory.filter((item) => {
    if (activityFilter === 'SELLOS') return item.isStampRecord;
    if (activityFilter === 'CANJES') return !item.isStampRecord;
    if (activityFilter === 'PENDIENTE') return !item.isStampRecord && (item.status === 'PENDIENTE' || !item.status);
    if (activityFilter === 'APROBADO') return !item.isStampRecord && (item.status === 'APROBADO' || item.status === 'USADO');
    return true; // 'ALL'
  });

  // Redemptions & stamp vouchers (Historial de canjes reales de premios, excluyendo sellos individuales)
  const clientVouchers = fullActivityHistory.filter((r) => !r.isStampRecord);

  const filteredVouchers = activityFilter === 'ALL'
    ? clientVouchers
    : clientVouchers.filter((v) => {
      if (activityFilter === 'PENDIENTE') return v.status === 'PENDIENTE' || !v.status;
      if (activityFilter === 'APROBADO') return v.status === 'APROBADO' || v.status === 'USADO';
      return v.status === activityFilter;
    });

  // Store-specific and global points
  const currentStore = allStores.find(s => s.id === selectedStoreFilter);
  const currentPoints = selectedStoreFilter === 'ALL'
    ? selectedClient.pointsBalance
    : ((selectedClient.storeBalances && selectedClient.storeBalances[selectedStoreFilter]) || 0);

  const cashEquivalent = (currentPoints * config.pointValueUsd).toFixed(2);
  const totalGlobalPoints = selectedClient.pointsBalance;
  const totalGlobalCash = (totalGlobalPoints * config.pointValueUsd).toFixed(2);

  // Target reward calculation based strictly on stamps and loyalty cards
  const minRedeemPts = config.minRedemptionPoints || 100;
  let targetGiftPoints = minRedeemPts;
  let nextGiftLabel = `Saldo US$${(minRedeemPts * config.pointValueUsd).toFixed(2)}`;

  if (currentPoints < minRedeemPts) {
    targetGiftPoints = minRedeemPts;
    nextGiftLabel = `Canje Mínimo: Saldo US$${(minRedeemPts * config.pointValueUsd).toFixed(2)} (100 pts)`;
  } else if (currentPoints < 200) {
    targetGiftPoints = 200;
    nextGiftLabel = `Saldo para Compra US$${(200 * config.pointValueUsd).toFixed(2)} (200 pts)`;
  } else if (currentPoints < 350) {
    targetGiftPoints = 350;
    nextGiftLabel = `Gift Card Premium US$${(350 * config.pointValueUsd).toFixed(2)} (350 pts)`;
  } else if (currentPoints < 500) {
    targetGiftPoints = 500;
    nextGiftLabel = `Saldo VIP para Compra US$${(500 * config.pointValueUsd).toFixed(2)} (500 pts)`;
  } else {
    targetGiftPoints = Math.ceil((currentPoints + 100) / 100) * 100;
    nextGiftLabel = `Saldo para Compra US$${(targetGiftPoints * config.pointValueUsd).toFixed(2)}`;
  }

  const pointsRemaining = Math.max(0, targetGiftPoints - currentPoints);
  const giftProgressPercent = Math.min(100, Math.max(0, (currentPoints / targetGiftPoints) * 100));

  // Only APPROVED & Active rewards are visible to clients!
  const activeRewards = (rewards || []).filter(r => r.status === 'ACTIVO' || !r.status);

  // Dynamic Categories from active rewards
  const categories = ['ALL', ...new Set(activeRewards.map(r => r.category).filter(Boolean))];

  // Filter rewards based on active status, category, and selected store
  const filteredRewards = activeRewards.filter(r => {
    // 1. Category filter
    if (rewardCategoryFilter !== 'ALL' && r.category !== rewardCategoryFilter) {
      return false;
    }
    // 2. Store filter
    if (selectedStoreFilter !== 'ALL') {
      const isCustomStore = r.createdStoreId === selectedStoreFilter || (r.applicableStores && r.applicableStores.includes(selectedStoreFilter));
      const isGlobal = !r.applicableStores || r.applicableStores.includes('ALL') || r.applicableStores.length === 0;
      return isCustomStore || isGlobal;
    }
    return true;
  });

  // Initials
  const clientInitials = selectedClient.initials ||
    selectedClient.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  // Open QR Scanner modal from Bottom Navigation Menu or from a Reward Card
  const handleOpenStoreQrScanner = (preselectedReward = null) => {
    let defaultStoreId = selectedStoreFilter !== 'ALL' ? selectedStoreFilter : (allStores[0]?.id || '');
    if (preselectedReward?.createdStoreId) {
      defaultStoreId = preselectedReward.createdStoreId;
    } else if (preselectedReward?.applicableStores && !preselectedReward.applicableStores.includes('ALL') && preselectedReward.applicableStores[0]) {
      defaultStoreId = preselectedReward.applicableStores[0];
    }

    setScannedStoreId(defaultStoreId);
    setRedemptionStoreId(defaultStoreId);
    setScanStep(1);
    setStoreQrScanned(false);
    setIsScanningSimulation(false);

    if (preselectedReward) {
      setSelectedRewardForStore(preselectedReward);
    } else {
      const defaultRew = activeRewards.find(r => r.pointsCost >= 100) || activeRewards[0];
      setSelectedRewardForStore(defaultRew);
    }

    setShowStoreScanModal(true);
  };

  // Handle Real QR Code Scanned from Camera or Photo
  const handleQrCodeScanned = (decodedText) => {
    if (!decodedText) return;
    const raw = String(decodedText).trim();

    // 1. Intentar validar si el QR pertenece legítimamente a una tienda de Fidely
    let matchedStore = null;

    // A. Comprobar si es un URL oficial con parámetro store (ej: fidelyclub.net/?store=STR-01)
    try {
      if (raw.includes('?')) {
        const urlStr = raw.startsWith('http') ? raw : `http://dummy.com/${raw}`;
        const parsedUrl = new URL(urlStr);
        const storeParam = parsedUrl.searchParams.get('store');
        if (storeParam && storeParam.trim()) {
          const paramClean = storeParam.trim().toLowerCase();
          matchedStore = allStores.find(s =>
            (s.id && s.id.toLowerCase() === paramClean) ||
            (s.qrCode && s.qrCode.toLowerCase() === paramClean)
          );
        }
      }
    } catch (e) { }

    // B. Comprobar código con prefijo oficial FIDELY-LOCAL-XXXX o coincidencia exacta de ID / qrCode
    if (!matchedStore) {
      const isFidelyPrefix = raw.toUpperCase().startsWith('FIDELY-LOCAL-');
      const clean = raw.replace(/^FIDELY-LOCAL-/i, '').trim().toLowerCase();
      matchedStore = allStores.find(s => {
        const sId = (s.id || '').trim().toLowerCase();
        const sQr = (s.qrCode || '').trim().toLowerCase();
        if (isFidelyPrefix) {
          return sId === clean || (sQr && sQr === clean);
        }
        return sId === raw.toLowerCase() || (sQr && sQr === raw.toLowerCase());
      });
    }

    // VALIDACIÓN ESTRICTA: Si no coincide con ninguna tienda de fidely CLUB, RECHAZAR
    if (!matchedStore) {
      if (onNotify) {
        onNotify('⚠️ Código QR no reconocido. Por favor escanea el cartel oficial de fidely CLUB en este comercio.', 'error');
      }
      return;
    }

    setScannedStoreId(matchedStore.id);
    setRedemptionStoreId(matchedStore.id);
    setStoreQrScanned(true);
    setScanStep(2);

    // Auto-creación de Tarjeta de Fidelización exclusiva de la tienda si no la posee
    const clientCards = selectedClient?.loyaltyCards || [];
    const hasCard = clientCards.some(c => c.storeId === matchedStore.id);
    let cardJustCreated = false;

    if (!hasCard) {
      const newCard = createStoreLoyaltyCard(matchedStore, selectedClient, 0);
      const updatedCards = [...clientCards, newCard];
      cardJustCreated = true;

      const updatedClient = {
        ...selectedClient,
        loyaltyCards: updatedCards,
        storeBalances: {
          ...(selectedClient?.storeBalances || {}),
          [matchedStore.id]: (selectedClient?.storeBalances && selectedClient.storeBalances[matchedStore.id]) || 0
        }
      };

      if (setClients) {
        setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
      }
      try {
        saveClient(updatedClient);
      } catch (err) {
        console.warn('[Firebase] Error al guardar tarjeta de cliente:', err);
      }
      try {
        fireRedemptionConfetti();
      } catch (e) { }
    }

    const storePts = (selectedClient?.storeBalances && selectedClient.storeBalances[matchedStore.id]) || 0;
    if (!selectedRewardForStore || selectedRewardForStore.pointsCost > storePts) {
      const affordable = activeRewards.find(r => r.pointsCost <= storePts && r.pointsCost >= 100) || activeRewards[0];
      setSelectedRewardForStore(affordable);
    }

    if (cardJustCreated) {
      onNotify(`🎉 ¡Tarjeta de Fidelización de "${matchedStore.name}" activada con 0 sellos! Presenta tu QR en caja para recibir tu sello.`, 'success');
    } else {
      onNotify(`¡Código QR de "${matchedStore.name}" escaneado con éxito! Tarjeta de fidelización activa.`, 'success');
    }
  };

  // Adquirir tarjeta de una tienda sin ningún sello (0 sellos iniciales)
  const handleAcquireStoreCard = (targetStore) => {
    if (!targetStore || !selectedClient) return;

    const clientCards = selectedClient?.loyaltyCards || [];
    const existing = clientCards.find(c => c.storeId === targetStore.id);

    if (existing) {
      onNotify(`Ya posees la tarjeta de fidelización de "${targetStore.name}".`, 'info');
      setSelectedCardForModal(existing);
      setShowCardModal(true);
      return;
    }

    // Se crea la tarjeta oficial con 0 sellos
    const newCard = createStoreLoyaltyCard(targetStore, selectedClient, 0);
    const updatedCards = [...clientCards, newCard];

    const updatedClient = {
      ...selectedClient,
      loyaltyCards: updatedCards,
      storeBalances: {
        ...(selectedClient?.storeBalances || {}),
        [targetStore.id]: (selectedClient?.storeBalances && selectedClient.storeBalances[targetStore.id]) || 0
      }
    };

    if (setClients) {
      setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    }

    try {
      saveClient(updatedClient);
    } catch (err) {
      console.warn('[Firebase] Error al guardar tarjeta de cliente:', err);
    }

    try {
      fireRedemptionConfetti();
    } catch (e) { }

    onNotify(`🎉 ¡Tarjeta de "${targetStore.name}" adquirida con éxito (0 sellos)! Lista para acumular en tu próxima compra.`, 'success');

    setSelectedCardForModal(newCard);
    setShowCardModal(true);
  };

  // Solicitar canje de premio por sellos en mostrador
  const handleRequestStampRewardClaim = (card, reward) => {
    if (!selectedClient || !card || !reward) return;

    const currentStamps = Number(card.currentStamps || 0);
    const store = allStores.find(s => s.id === card.storeId) || card;
    const targetStamps = Number(card.stampsTarget || store.stampsTarget || 6);
    const cost = Number(reward.stamps || reward.stampsCost || targetStamps);

    if (currentStamps <= 0 || cost <= 0 || currentStamps < cost) {
      if (onNotify) {
        onNotify(`No tienes los sellos requeridos para este premio (${currentStamps} de ${cost} sellos).`, 'error');
      }
      return;
    }

    // Verificar si ya tiene una solicitud pendiente para esta tienda
    const existingPending = (redemptions || []).find(r =>
      (r.clientId === selectedClient.id || (selectedClient.cedula && r.clientDocId && String(r.clientDocId) === String(selectedClient.cedula))) &&
      (r.storeId === card.storeId || (card.storeName && r.storeName && r.storeName.toLowerCase() === card.storeName.toLowerCase())) &&
      r.status === 'PENDIENTE' &&
      r.type === 'STAMP_REWARD_CLAIM'
    );

    if (existingPending) {
      onNotify(`Ya tienes una solicitud de canje pendiente para "${existingPending.rewardTitle}" en esta tienda. Muéstrala en caja.`, 'warning');
      return;
    }

    const newClaim = {
      id: `CANJE-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5)}`,
      type: 'STAMP_REWARD_CLAIM',
      status: 'PENDIENTE',
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      clientDocId: selectedClient.cedula || selectedClient.docId || selectedClient.id,
      storeId: store.id || card.storeId,
      storeName: store.name || card.storeName,
      rewardTitle: reward.title || 'Premio de Fidelidad',
      rewardIcon: reward.icon || '🎁',
      stampsCost: cost,
      currentStamps: Number(card.currentStamps || 0),
      stampsTarget: targetStamps,
      voucherCode: `CANJE-${Date.now().toString().slice(-5)}`,
      date: new Date().toISOString().substring(0, 10),
      dateGenerated: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };

    if (setRedemptions) {
      setRedemptions(prev => [newClaim, ...prev]);
    }

    try {
      saveRedemption(newClaim);
    } catch (err) {
      console.warn('[Firebase] Error al enviar canje a Firestore:', err);
    }

    try {
      fireRedemptionConfetti();
    } catch (e) { }

    onNotify(`🎁 ¡Solicitud de canje enviada a ${store.name || card.storeName}! Dile al cajero que vas a retirar tu premio: "${newClaim.rewardTitle}".`, 'success');
  };

  // Simulate scanning counter physical QR in store (fallback shortcut)
  const handleSimulateStoreQrScan = () => {
    const targetStore = allStores.find(s => s.id === scannedStoreId) || allStores[0] || { id: 'ONLINE', name: 'Tienda Oficial' };
    setIsScanningSimulation(true);
    setTimeout(() => {
      setIsScanningSimulation(false);
      setStoreQrScanned(true);
      setScanStep(2);

      // Auto-creación de Tarjeta de Fidelización exclusiva de la tienda
      const clientCards = selectedClient?.loyaltyCards || [];
      const hasCard = clientCards.some(c => c.storeId === targetStore.id);
      let cardJustCreated = false;

      if (!hasCard) {
        const newCard = createStoreLoyaltyCard(targetStore, selectedClient, 0);
        const updatedCards = [...clientCards, newCard];
        cardJustCreated = true;

        const updatedClient = {
          ...selectedClient,
          loyaltyCards: updatedCards,
          storeBalances: {
            ...(selectedClient?.storeBalances || {}),
            [targetStore.id]: (selectedClient?.storeBalances && selectedClient.storeBalances[targetStore.id]) || 0
          }
        };

        if (setClients) {
          setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
        }
        try {
          saveClient(updatedClient);
        } catch (err) {
          console.warn('[Firebase] Error al guardar tarjeta de cliente:', err);
        }
        try {
          fireRedemptionConfetti();
        } catch (e) { }
      }

      const storePts = (selectedClient?.storeBalances && selectedClient.storeBalances[targetStore.id]) || 0;
      // Preselect affordable reward if not set
      if (!selectedRewardForStore || selectedRewardForStore.pointsCost > storePts) {
        const affordable = activeRewards.find(r => r.pointsCost <= storePts && r.pointsCost >= 100) || activeRewards[0];
        setSelectedRewardForStore(affordable);
      }

      if (cardJustCreated) {
        onNotify(`🎉 ¡Tarjeta de Fidelización de "${targetStore.name}" agregada con éxito!`, 'success');
      } else {
        onNotify(`¡Código QR de "${targetStore.name}" escaneado con éxito! Tarjeta de fidelización activa.`, 'success');
      }
    }, 700);
  };

  // Submit in-store redemption request directly to POS & Cloud Firestore
  const handleConfirmAndSendOrderToStore = async () => {
    const targetStore = allStores.find(s => s.id === scannedStoreId) || allStores[0] || { id: 'ONLINE', name: 'Tienda Oficial' };
    const reward = selectedRewardForStore;
    if (!reward) {
      onNotify('Por favor selecciona el beneficio que deseas canjear.', 'error');
      return;
    }

    const storePts = (selectedClient.storeBalances && selectedClient.storeBalances[targetStore.id]) || 0;
    const minPts = config.minRedemptionPoints || 100;

    if (storePts < minPts) {
      onNotify(`El canje mínimo es de ${minPts} puntos en ${targetStore.name} (Regla RN-08). Saldo disponible: ${storePts} pts`, 'error');
      return;
    }
    if (storePts < reward.pointsCost) {
      onNotify(`Te faltan ${reward.pointsCost - storePts} puntos en ${targetStore.name} para este beneficio.`, 'error');
      return;
    }

    const reqId = `REQ-${Date.now().toString().slice(-4)}`;
    const voucherCode = `FIDELY-${Math.floor(10000 + Math.random() * 90000)}`;
    const currentDate = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const newRedemption = {
      id: reqId,
      voucherCode,
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      clientPhone: selectedClient.phone,
      clientDocId: selectedClient.docId,
      rewardId: reward.id,
      rewardTitle: reward.title,
      pointsCost: reward.pointsCost,
      nominalValueUsd: reward.nominalValueUsd,
      status: 'PENDIENTE', // Sent to POS in real-time
      dateGenerated: currentDate,
      dateUsed: null,
      storeId: targetStore.id,
      storeName: targetStore.name,
      storeQrVerified: true
    };

    // 1. Guardar de inmediato en Cloud Firestore en tiempo real
    try {
      await saveRedemption(newRedemption);
    } catch (err) {
      console.warn('[Firebase] Error al despachar canje a Firestore:', err);
    }

    // 2. Actualizar estado local
    setRedemptions(prev => [newRedemption, ...prev.filter(r => r.id !== newRedemption.id)]);
    setPendingRedemptionId(reqId);
    setScanStep(3);
    onNotify(`¡Orden enviada al mostrador de ${targetStore.name}! En revisión por el cajero.`, 'success');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)', paddingBottom: '90px' }}>

      {/* Sub-Header / Navigation Menu matching fidely CLUB */}
      <div style={{
        background: '#FFFFFF',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          maxWidth: '620px',
          margin: '0 auto',
          padding: '12px 16px 0 16px'
        }}>
          {/* Top Row: Brand on left, Avatar LM on right */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src="/fidely.png" alt="fidely" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                fidely
              </span>
              <span style={{ fontSize: '0.64rem', fontWeight: 800, color: 'var(--c-primary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '3px' }}>
                CLUB
              </span>
            </div>

            {/* Avatar LM with Dropdown Menu & Notifications Bell */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
              {/* Push Notifications Bell Toggle */}
              <button
                type="button"
                onClick={handleEnableNotifications}
                disabled={isActivatingPush}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: webPushPermission === 'granted' ? 'rgba(16, 185, 129, 0.08)' : '#FFFFFF',
                  border: `1.5px solid ${webPushPermission === 'granted' ? '#10B981' : 'var(--border-subtle)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  color: webPushPermission === 'granted' ? '#10B981' : 'var(--text-muted)',
                  transition: 'all 0.2s ease',
                  padding: 0
                }}
                title={
                  webPushPermission === 'granted'
                    ? 'Notificaciones push web activadas'
                    : 'Activar notificaciones de proximidad y sellos'
                }
              >
                {webPushPermission === 'granted' ? (
                  <BellRing size={18} />
                ) : (
                  <Bell size={18} />
                )}
                {webPushPermission !== 'granted' && (
                  <span style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'var(--c-primary)',
                    boxShadow: '0 0 0 2px #FFFFFF'
                  }} />
                )}
              </button>

              <div
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  border: '1.5px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                }}
                title="Menú de Socio"
              >
                {clientInitials}
              </div>

              {/* User Dropdown */}
              {showUserMenu && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '46px',
                  background: '#FFFFFF',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
                  padding: '10px',
                  width: '210px',
                  zIndex: 200
                }}>
                  <div style={{ padding: '6px 8px 10px 8px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>{selectedClient.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--c-primary)', fontWeight: 700 }}>
                      {selectedClient.tier} • {selectedClient.docId}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setShowCardModal(true); setShowUserMenu(false); }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <QrCode size={14} color="var(--c-primary)" />
                    <span>Ver Mi Tarjeta QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setShowEditProfileModal(true); setShowUserMenu(false); }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: 'var(--text-main)'
                    }}
                  >
                    <User size={14} color="var(--c-primary)" />
                    <span>Editar Mi Perfil</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setShowPasswordModal(true); setShowUserMenu(false); }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: 'var(--text-main)'
                    }}
                  >
                    <Key size={14} color="var(--c-primary)" />
                    <span>Crear clave para App</span>
                  </button>

                  {/* Role jumping buttons removed: access is strictly via unified login */}

                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => { onLogout(); setShowUserMenu(false); }}
                      style={{
                        width: '100%',
                        padding: '8px',
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: 'var(--c-rose)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        borderTop: '1px solid var(--border-subtle)',
                        marginTop: '4px'
                      }}
                    >
                      <LogOut size={14} />
                      <span>Cerrar Sesión</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Row: Sub-Navigation Tabs matching Figma (Visible on desktop) */}
          <div className="client-desktop-tabs" style={{ display: 'flex', gap: '30px' }}>
            <button
              onClick={() => {
                setActiveTab('INICIO');
                setIsViewingAllCards(false);
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px 0 12px 0',
                cursor: 'pointer',
                fontFamily: 'var(--font-heading)',
                fontSize: '0.94rem',
                fontWeight: activeTab === 'INICIO' ? 750 : 600,
                color: activeTab === 'INICIO' ? 'var(--c-primary)' : 'var(--text-muted)',
                borderBottom: activeTab === 'INICIO' ? '2.5px solid var(--c-primary)' : '2.5px solid transparent',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Inicio
            </button>

            <button
              onClick={() => {
                setActiveTab('PROMOCIONES');
                setIsViewingAllCards(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px 0 12px 0',
                cursor: 'pointer',
                fontFamily: 'var(--font-heading)',
                fontSize: '0.94rem',
                fontWeight: activeTab === 'PROMOCIONES' ? 750 : 600,
                color: activeTab === 'PROMOCIONES' ? 'var(--c-primary)' : 'var(--text-muted)',
                borderBottom: activeTab === 'PROMOCIONES' ? '2.5px solid var(--c-primary)' : '2.5px solid transparent',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <TicketPercent size={16} color={activeTab === 'PROMOCIONES' ? 'var(--c-primary)' : 'currentColor'} />
              <span>Promociones</span>
              {eligiblePromotions.length > 0 && (
                <span style={{
                  background: activeTab === 'PROMOCIONES' ? 'var(--c-primary)' : '#DCFCE7',
                  color: activeTab === 'PROMOCIONES' ? '#FFFFFF' : '#15803D',
                  fontSize: '0.70rem',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '10px',
                  lineHeight: 1
                }}>
                  {eligiblePromotions.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('TIENDAS');
                setIsViewingAllCards(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px 0 12px 0',
                cursor: 'pointer',
                fontFamily: 'var(--font-heading)',
                fontSize: '0.94rem',
                fontWeight: activeTab === 'TIENDAS' ? 750 : 600,
                color: activeTab === 'TIENDAS' ? 'var(--c-primary)' : 'var(--text-muted)',
                borderBottom: activeTab === 'TIENDAS' ? '2.5px solid var(--c-primary)' : '2.5px solid transparent',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Store size={16} color={activeTab === 'TIENDAS' ? 'var(--c-primary)' : 'currentColor'} />
              <span>Tiendas Aliadas</span>
              {approvedStores.length > 0 && (
                <span style={{
                  background: activeTab === 'TIENDAS' ? 'var(--c-primary)' : 'rgba(184, 93, 67, 0.12)',
                  color: activeTab === 'TIENDAS' ? '#FFFFFF' : 'var(--c-primary)',
                  fontSize: '0.70rem',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '10px',
                  lineHeight: 1
                }}>
                  {approvedStores.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('RECOMPENSAS');
                setIsViewingAllCards(false);
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px 0 12px 0',
                cursor: 'pointer',
                fontFamily: 'var(--font-heading)',
                fontSize: '0.94rem',
                fontWeight: activeTab === 'RECOMPENSAS' ? 750 : 600,
                color: activeTab === 'RECOMPENSAS' ? 'var(--c-primary)' : 'var(--text-muted)',
                borderBottom: activeTab === 'RECOMPENSAS' ? '2.5px solid var(--c-primary)' : '2.5px solid transparent',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>Recompensas</span>
              {clientVouchers.length > 0 && (
                <span style={{
                  background: activeTab === 'RECOMPENSAS' ? 'var(--c-primary)' : 'rgba(184, 93, 67, 0.12)',
                  color: activeTab === 'RECOMPENSAS' ? '#FFFFFF' : 'var(--c-primary)',
                  fontSize: '0.70rem',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '10px',
                  lineHeight: 1
                }}>
                  {clientVouchers.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('ACTIVIDAD');
                setIsViewingAllCards(false);
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px 0 12px 0',
                cursor: 'pointer',
                fontFamily: 'var(--font-heading)',
                fontSize: '0.94rem',
                fontWeight: activeTab === 'ACTIVIDAD' ? 750 : 600,
                color: activeTab === 'ACTIVIDAD' ? 'var(--c-primary)' : 'var(--text-muted)',
                borderBottom: activeTab === 'ACTIVIDAD' ? '2.5px solid var(--c-primary)' : '2.5px solid transparent',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Mi actividad
            </button>
          </div>
        </div>
      </div>

      {/* Realtime Push Notification Banner (Foreground Alert) */}
      {activePushAlert && (
        <div style={{
          background: 'linear-gradient(135deg, #9C382A 0%, #B85D43 100%)',
          color: '#FFFFFF',
          padding: '12px 20px',
          boxShadow: '0 8px 24px rgba(156, 56, 42, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          zIndex: 150,
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <img src="/fidely.png" alt="fidely" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.90rem' }}>{activePushAlert.title}</div>
              <div style={{ fontSize: '0.80rem', opacity: 0.95 }}>{activePushAlert.body}</div>
            </div>
          </div>
          <button
            onClick={() => setActivePushAlert(null)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Push Status Toast */}
      {pushStatusMessage && (
        <div style={{
          background: '#1F2937',
          color: '#FFFFFF',
          padding: '10px 18px',
          borderRadius: '12px',
          fontSize: '0.84rem',
          fontWeight: 600,
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <BellRing size={16} color="#10B981" />
          <span>{pushStatusMessage}</span>
        </div>
      )}

      {/* Main Responsive Body Container */}
      <div
        className="client-main-container"
        style={{
          maxWidth: '620px',
          margin: '0 auto',
          padding: '16px 14px',
          paddingBottom: '110px'
        }}
      >

        {/* Banner Recomendación App Móvil Conecta2 para Socios */}
        {showConecta2Banner && (
          <div style={{
            background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
            border: '1px solid #FDBA74',
            borderRadius: '12px',
            padding: '9px 12px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            boxShadow: '0 2px 5px rgba(249, 115, 22, 0.06)',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: '#EA580C',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Smartphone size={15} />
              </div>
              <div style={{ fontSize: '0.74rem', color: '#9A3412', lineHeight: 1.3 }}>
                <span style={{ fontWeight: 800, color: '#C2410C' }}>App Móvil (Solo Clientes):</span> Descarga <strong>Conecta2</strong> para llevar tus sellos. Las tiendas operan vía Web.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <a
                href="https://play.google.com/store/apps/details?id=com.conecta2.services_app"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '5px 10px',
                  background: '#EA580C',
                  color: '#FFFFFF',
                  borderRadius: '7px',
                  fontSize: '0.70rem',
                  fontWeight: 800,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  boxShadow: '0 2px 4px rgba(234, 88, 12, 0.2)'
                }}
              >
                <span>Ver App</span>
                <ArrowUpRight size={11} />
              </a>
              <button
                type="button"
                onClick={() => setShowConecta2Banner(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9A3412',
                  cursor: 'pointer',
                  padding: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.65
                }}
                title="Cerrar aviso"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* EXPIRATION WARNING ALERT (RN-09) if applicable */}
        {selectedClient.pointsExpiringSoon > 0 && (
          <div style={{
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.84rem',
            color: '#92400E'
          }}>
            <AlertCircle size={18} color="#D97706" style={{ flexShrink: 0 }} />
            <div>
              Tienes <strong>{selectedClient.pointsExpiringSoon} puntos</strong> que vencen el {selectedClient.expiringDate} (Vigencia de 12 meses, Regla RN-09). ¡Canjéalos antes de su fecha límite!
            </div>
          </div>
        )}

        {/* ===================== TAB 1: INICIO ===================== */}
        {activeTab === 'INICIO' && (
          <div>
            {isViewingAllCards ? (
              <div className="all-cards-dedicated-view" style={{ animation: 'fadeIn 0.2s ease', marginBottom: '40px' }}>
                {/* Back button + Summary bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsViewingAllCards(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#FFFFFF',
                      border: '1.2px solid var(--border-subtle)',
                      borderRadius: '12px',
                      padding: '8px 14px',
                      fontSize: '0.82rem',
                      fontWeight: 750,
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                    }}
                  >
                    <ArrowLeft size={16} />
                    <span>Volver a Inicio</span>
                  </button>

                  <span style={{
                    background: 'rgba(184, 93, 67, 0.1)',
                    color: 'var(--c-primary)',
                    padding: '6px 14px',
                    borderRadius: '999px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Award size={14} />
                    <span>{clientLoyaltyCards.length} {clientLoyaltyCards.length === 1 ? 'tarjeta activa' : 'tarjetas activas'}</span>
                  </span>
                </div>

                {/* Section Header */}
                <div style={{ marginBottom: '18px' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 850, margin: '0 0 4px', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                    Mis Tarjetas de Fidelización
                  </h2>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0 }}>
                    Revisa tus sellos acumulados por comercio, abre tu cartilla para canjear premios o fija una tarjeta en tu pantalla principal.
                  </p>
                </div>

                {/* Cards List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {clientLoyaltyCards.length === 0 ? (
                    <div style={{
                      background: '#FFFFFF',
                      borderRadius: '20px',
                      border: '1.2px solid var(--border-subtle)',
                      padding: '36px 20px',
                      textAlign: 'center'
                    }}>
                      <Award size={40} style={{ margin: '0 auto 10px', color: 'var(--text-muted)', opacity: 0.5 }} />
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                        Aún no tienes tarjetas de fidelización activas
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        Visita cualquier comercio aliado del Club para acumular tus primeros sellos.
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsViewingAllCards(false);
                          setActiveTab('TIENDAS');
                        }}
                        className="btn btn-primary"
                        style={{ padding: '8px 16px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 800 }}
                      >
                        Explorar Comercios Aliados
                      </button>
                    </div>
                  ) : (
                    clientLoyaltyCards.map((card) => {
                      const isFeatured = (featuredCard?.storeId === card.storeId);
                      const storeRewards = (card.stampRewards && card.stampRewards.length > 0)
                        ? card.stampRewards
                        : [{ id: 'def_rew', stamps: Number(card.stampsTarget || 6), title: card.rewardTitle || 'Premio de Fidelidad', icon: '🎁' }];
                      const sortedRewards = [...storeRewards].sort((a, b) => Number(a.stamps) - Number(b.stamps));
                      const currentStamps = Number(card.currentStamps || 0);
                      const maxStamps = Math.max(...sortedRewards.map(r => Number(r.stamps) || 6), Number(card.stampsTarget || 6));
                      const unlockedRewards = sortedRewards.filter(r => Number(r.stamps) <= currentStamps);
                      const nextReward = sortedRewards.find(r => Number(r.stamps) > currentStamps);
                      const remainingForNext = nextReward ? Math.max(0, Number(nextReward.stamps) - currentStamps) : 0;

                      return (
                        <div
                          key={card.id || card.storeId}
                          style={{
                            position: 'relative',
                            overflow: 'hidden',
                            borderRadius: '20px',
                            background: `linear-gradient(135deg, ${card.cardColor || '#9C382A'} 0%, ${card.cardGradient || '#DE8B76'} 100%)`,
                            padding: '18px 20px',
                            color: '#FFFFFF',
                            boxShadow: isFeatured ? '0 10px 24px rgba(0,0,0,0.18), 0 0 0 2.5px #1A1A1A' : '0 6px 18px rgba(0,0,0,0.10)',
                            transition: 'transform 0.15s ease'
                          }}
                        >
                          {/* Textura o imagen de fondo opcional (ej. Canva / diseño gráfico de marca) */}
                          {card.cardBackgroundImage && (
                            <div style={{
                              position: 'absolute',
                              inset: 0,
                              backgroundImage: `url(${card.cardBackgroundImage})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              opacity: 0.40,
                              pointerEvents: 'none',
                              zIndex: 0
                            }} />
                          )}

                          {/* Shimmer overlay */}
                          <div style={{
                            position: 'absolute',
                            top: '-30px',
                            right: '-30px',
                            width: '100px',
                            height: '100px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.1)',
                            pointerEvents: 'none',
                            zIndex: 0
                          }} />

                          {/* Header row: Logo + Store Name + Category + Featured Chip */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', position: 'relative', zIndex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                              <div style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '12px',
                                background: '#FFFFFF',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 3px 8px rgba(0,0,0,0.2)',
                                flexShrink: 0
                              }}>
                                {card.logo ? (
                                  <img src={card.logo} alt={card.storeName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <span style={{ fontWeight: 900, color: card.cardColor || '#9C382A', fontSize: '1rem' }}>
                                    {(card.storeName || 'TI').slice(0, 2).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div>
                                <div style={{ fontWeight: 900, fontSize: '1.04rem', textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}>
                                  {card.storeName}
                                </div>
                                <div style={{ fontSize: '0.72rem', opacity: 0.9, fontWeight: 600 }}>
                                  {card.storeCategory || 'Comercio Aliado'}
                                </div>
                              </div>
                            </div>

                            {isFeatured && (
                              <span style={{
                                background: '#FFFFFF',
                                color: card.cardColor || '#9C382A',
                                fontSize: '0.68rem',
                                fontWeight: 900,
                                padding: '3px 9px',
                                borderRadius: '999px',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <Check size={11} strokeWidth={3} /> Destacada
                              </span>
                            )}
                          </div>

                          {/* Sellos mini progress preview */}
                          <div style={{
                            background: 'rgba(0, 0, 0, 0.16)',
                            borderRadius: '12px',
                            padding: '10px 14px',
                            marginBottom: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                            position: 'relative',
                            zIndex: 1
                          }}>
                            <div>
                              <div style={{ fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.9, fontWeight: 700 }}>
                                Progreso de Cartilla
                              </div>
                              <div style={{ fontWeight: 900, fontSize: '0.96rem' }}>
                                {currentStamps} de {maxStamps} sellos acumulados
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              {unlockedRewards.length > 0 ? (
                                <span style={{
                                  background: '#22C55E',
                                  color: '#FFFFFF',
                                  padding: '3px 9px',
                                  borderRadius: '999px',
                                  fontSize: '0.68rem',
                                  fontWeight: 900,
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                                }}>
                                  🎉 {unlockedRewards.length} Listo(s)
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.72rem', opacity: 0.9 }}>
                                  Faltan {remainingForNext} para premio
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 1 }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCardForModal(card);
                                setShowCardModal(true);
                              }}
                              style={{
                                flex: 1,
                                padding: '9px 14px',
                                borderRadius: '10px',
                                background: '#FFFFFF',
                                border: 'none',
                                color: card.cardColor || '#9C382A',
                                fontSize: '0.78rem',
                                fontWeight: 850,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                              }}
                            >
                              <Award size={15} />
                              <span>Ver Cartilla</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStoreFilter(card.storeId);
                                setIsViewingAllCards(false);
                                if (onNotify) onNotify(`Tarjeta de ${card.storeName} fijada en tu inicio.`, 'success');
                              }}
                              style={{
                                padding: '9px 14px',
                                borderRadius: '10px',
                                background: isFeatured ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)',
                                border: '1px solid rgba(255,255,255,0.4)',
                                color: '#FFFFFF',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <Star size={14} fill={isFeatured ? '#FFFFFF' : 'none'} />
                              <span>{isFeatured ? 'Destacada' : 'Fijar en Inicio'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <>
            {/* Top Greeting */}
            <div style={{ marginBottom: '18px' }}>
              <h1 style={{
                fontSize: 'clamp(1.75rem, 3.5vw, 2.3rem)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: 'var(--text-main)',
                marginBottom: '4px'
              }}>
                Hola, {selectedClient.name.split(' ')[0]}.
              </h1>
              <p style={{
                fontSize: '0.96rem',
                color: 'var(--text-muted)',
                letterSpacing: '-0.01em'
              }}>
                Acumula sellos en tus comercios favoritos para desbloquear premios y regalos exclusivos.
              </p>
            </div>

            {/* AVISO: COMPLETAR CÉDULA Y TELÉFONO (Para usuarios que entraron por Google o tienen datos provisionales) */}
            {isProfileIncomplete && (
              <div style={{
                background: 'linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%)',
                border: '1.5px solid #FCD34D',
                borderRadius: '16px',
                padding: '14px 18px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                flexWrap: 'wrap',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.12)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '240px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: '#F59E0B',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <User size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#78350F' }}>
                      ¡Completa tu Cédula y Teléfono Celular!
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#92400E', marginTop: '2px' }}>
                      Indica tu cédula real para que los comercios aliados puedan registrar tus compras en caja y sellar tu tarjeta.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(true)}
                  style={{
                    background: '#D97706',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '9px 16px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(217, 119, 6, 0.3)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Completar Perfil ➔
                </button>
              </div>
            )}

            {/* CALLOUT NOTIFICACIONES PUSH PROXIMIDAD */}
            {webPushPermission !== 'granted' && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(156, 56, 42, 0.05) 0%, rgba(245, 158, 11, 0.06) 100%)',
                border: '1.5px solid rgba(156, 56, 42, 0.2)',
                borderRadius: '16px',
                padding: '14px 18px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '240px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'rgba(156, 56, 42, 0.12)',
                    color: 'var(--c-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <BellRing size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      Avisos de comercios y premios por proximidad
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Activa las notificaciones web para recibir alertas cuando estés cerca de un local aliado y cuánto te falta para tu premio.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleEnableNotifications}
                  disabled={isActivatingPush}
                  style={{
                    background: 'var(--c-primary)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '8px 16px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(156, 56, 42, 0.2)'
                  }}
                >
                  {isActivatingPush ? <Loader2 size={14} className="spin" /> : <Bell size={14} />}
                  <span>{isActivatingPush ? 'Activando...' : 'Activar Avisos'}</span>
                </button>
              </div>
            )}


            {/* ===================== CALLOUT BANNER: CUPONES Y PROMOS FLASH ===================== */}
            {eligiblePromotions.length > 0 && (
              <div
                onClick={() => {
                  setActiveTab('PROMOCIONES');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="glass-panel"
                style={{
                  marginBottom: '20px',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%)',
                  border: '1.5px solid #A7F3D0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)',
                  transition: 'transform 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #15803D 0%, #16A34A 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    flexShrink: 0
                  }}>
                    <TicketPercent size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '0.92rem', color: '#065F46', fontWeight: 800 }}>
                        {eligiblePromotions.length} {eligiblePromotions.length === 1 ? 'Promoción disponible' : 'Promociones disponibles'}
                      </strong>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        background: '#DCFCE7',
                        color: '#15803D',
                        padding: '1px 6px',
                        borderRadius: '999px'
                      }}>
                        NUEVO
                      </span>
                    </div>
                    <p style={{ fontSize: '0.74rem', color: '#047857', margin: '2px 0 0 0' }}>
                      Cupones de descuento exclusivos de tus tiendas registradas
                    </p>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.80rem',
                  fontWeight: 800,
                  color: '#15803D',
                  padding: '6px 12px',
                  background: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #A7F3D0',
                  flexShrink: 0
                }}>
                  <span>Ver promociones</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            )}

            {/* STORE / LOCAL SELECTOR FILTER (Acumulación independiente por local) */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                fontSize: '0.74rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                letterSpacing: '0.04em',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <Store size={13} color="var(--c-primary)" />
                <span>Local Comercial Seleccionado:</span>
              </div>

              <div className="nav-scroll-container" style={{ gap: '8px', paddingBottom: '4px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedStoreFilter('ALL')}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '999px',
                    border: selectedStoreFilter === 'ALL' ? '2px solid var(--c-primary)' : '1px solid var(--border-subtle)',
                    background: selectedStoreFilter === 'ALL' ? 'var(--c-secondary-soft)' : '#FFFFFF',
                    color: selectedStoreFilter === 'ALL' ? 'var(--c-primary)' : 'var(--text-main)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>Todos los Locales</span>
                  <span style={{
                    background: selectedStoreFilter === 'ALL' ? 'var(--c-primary)' : '#FAF4EE',
                    color: selectedStoreFilter === 'ALL' ? '#FFFFFF' : 'var(--c-primary)',
                    padding: '2px 7px',
                    borderRadius: '999px',
                    fontSize: '0.72rem'
                  }}>
                    {totalClientStamps} Sellos
                  </span>
                </button>

                {allStores.map(store => {
                  const card = (selectedClient.loyaltyCards || []).find(c => c.storeId === store.id);
                  const storeStamps = card ? (card.currentStamps || 0) : 0;
                  const isSelected = selectedStoreFilter === store.id;

                  return (
                    <button
                      key={store.id}
                      type="button"
                      onClick={() => setSelectedStoreFilter(store.id)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: '999px',
                        border: isSelected ? '2px solid var(--c-primary)' : '1px solid var(--border-subtle)',
                        background: isSelected ? 'var(--c-secondary-soft)' : '#FFFFFF',
                        color: isSelected ? 'var(--c-primary)' : 'var(--text-main)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <MapPin size={12} color={isSelected ? 'var(--c-primary)' : 'var(--text-dim)'} />
                      <span>{store.name.replace('Sucursal ', '')}</span>
                      <span style={{
                        background: isSelected ? 'var(--c-primary)' : '#FAF4EE',
                        color: isSelected ? '#FFFFFF' : 'var(--c-primary)',
                        padding: '2px 7px',
                        borderRadius: '999px',
                        fontSize: '0.72rem'
                      }}>
                        {storeStamps} Sellos
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 1. SECCIÓN ESTRELLA: TARJETA DE FIDELIZACIÓN PRINCIPAL / POR PROXIMIDAD */}
            {(() => {
              const isFeaturedCardAcquired = Boolean(featuredCard && (selectedClient?.loyaltyCards || []).some(c => c.storeId === featuredCard.storeId));
              return (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    marginBottom: '10px',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <div>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        color: isNearbyStoreFeatured ? '#15803D' : (isFeaturedCardAcquired ? 'var(--c-primary)' : '#B45309'),
                        letterSpacing: '0.05em',
                        marginBottom: '2px'
                      }}>
                        <Award size={13} />
                        <span>
                          {isNearbyStoreFeatured
                            ? 'Comercio Cercano Detectado 📍'
                            : isFeaturedCardAcquired
                              ? 'Mi Tarjeta de Fidelización'
                              : 'Tarjeta de Fidelización Disponible 🎁'}
                        </span>
                      </div>
                      <h2 style={{
                        fontSize: '1.25rem',
                        fontWeight: 850,
                        letterSpacing: '-0.02em',
                        color: 'var(--text-main)',
                        margin: 0
                      }}>
                        {isNearbyStoreFeatured ? (featuredCard?.storeName || 'Comercio Aliado') : (featuredCard ? featuredCard.storeName : 'Mis Tarjetas')}
                      </h2>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
                        {isNearbyStoreFeatured
                          ? `¡Estás en este comercio ahora! (${nearbyStoreMatch?.formattedDistance || 'cerca'}). Presenta esta tarjeta en caja para recibir tu sello.`
                          : isFeaturedCardAcquired
                            ? 'Toca "Mostrar en Caja" para presentar tu QR vinculado al comercio y sumar sellos.'
                            : 'Aún no posees esta tarjeta. Toca "Adquirir tarjeta" o explora el catálogo de tiendas para elegir tarjetas.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setScanStep(1);
                        setShowStoreScanModal(true);
                      }}
                      className="btn btn-primary"
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    borderRadius: '11px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Scan size={14} />
                  <span>Escanear QR de Tienda</span>
                </button>
              </div>

              {/* Switch de Proximidad unificado (como en la app móvil) */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1.2px solid var(--border-subtle)',
                padding: '12px 16px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: isProximityAlertsEnabled ? '#E8F8F0' : '#F3F4F6',
                    color: isProximityAlertsEnabled ? '#15803D' : '#9CA3AF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <MapPin size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      Avisos por Proximidad
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {isProximityAlertsEnabled
                        ? (nearbyStoreMatch
                          ? `📍 Detectado: ${nearbyStoreMatch.store.name} a ${nearbyStoreMatch.formattedDistance}`
                          : 'Avisarme al pasar cerca de cualquiera de mis locales aliados (< 500m).')
                        : 'Avisos desactivados. Actívalos para detectar automáticamente el local al visitarlo.'}
                    </div>
                  </div>
                </div>

                {/* Switch Toggle */}
                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer', flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={isProximityAlertsEnabled}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setIsProximityAlertsEnabled(val);
                      try { localStorage.setItem('fideli_proximity_enabled', JSON.stringify(val)); } catch { }
                      if (val && onNotify) onNotify('Avisos por proximidad activados.', 'success');
                    }}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: isProximityAlertsEnabled ? 'var(--c-primary)' : '#CBD5E1',
                    transition: '.2s',
                    borderRadius: '24px'
                  }}>
                    <span style={{
                      position: 'absolute',
                      content: '""',
                      height: '18px',
                      width: '18px',
                      left: isProximityAlertsEnabled ? '22px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      transition: '.2s',
                      borderRadius: '50%',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                  </span>
                </label>
              </div>

              {/* Tarjeta Destacada Única */}
              {!featuredCard ? (
                /* Empty state: Banner motivacional para escanear en su primera compra */
                <div style={{
                  background: 'linear-gradient(135deg, #FAF4EE 0%, #FFFFFF 100%)',
                  border: '1.5px dashed #DE8B76',
                  borderRadius: '20px',
                  padding: '24px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '260px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #DE8B76 0%, #9C382A 100%)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 4px 14px rgba(156, 56, 42, 0.25)'
                    }}>
                      <Award size={26} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.96rem', color: 'var(--text-main)', marginBottom: '3px' }}>
                        ¡Aún no tienes Tarjetas de Fidelización activadas!
                      </div>
                      <div style={{ fontSize: '0.80rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        Cada tienda aliada cuenta con su propia tarjeta con colores, logo y cartilla de sellos. Al visitar cualquier local aliado, se creará tu tarjeta para comenzar a acumular sellos con tus consumos.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setScanStep(1);
                      setShowStoreScanModal(true);
                    }}
                    className="btn btn-primary"
                    style={{
                      padding: '10px 18px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      borderRadius: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Camera size={15} />
                    <span>Escanear QR de Tienda 📸</span>
                  </button>
                </div>
              ) : (
                (() => {
                  const card = featuredCard;
                  const isCardAcquired = (selectedClient?.loyaltyCards || []).some(c => c.storeId === card.storeId);
                  const targetStore = allStores.find(s => s.id === card.storeId);
                  const storeRewards = (card.stampRewards && card.stampRewards.length > 0)
                    ? card.stampRewards
                    : (targetStore?.stampRewards && targetStore.stampRewards.length > 0)
                      ? targetStore.stampRewards
                      : [{ id: 'def_rew', stamps: Number(card.stampsTarget || 6), title: card.rewardTitle || 'Premio de Fidelidad', icon: '🎁' }];

                  const sortedRewards = [...storeRewards].sort((a, b) => Number(a.stamps) - Number(b.stamps));
                  const maxTargetStamps = Math.max(...sortedRewards.map(r => Number(r.stamps) || 6), Number(card.stampsTarget || 6));
                  const targetStamps = maxTargetStamps;
                  const currentStamps = Number(card.currentStamps || 0);

                  const unlockedRewards = sortedRewards.filter(r => Number(r.stamps) <= currentStamps);
                  const nextReward = sortedRewards.find(r => Number(r.stamps) > currentStamps);
                  const remainingForNext = nextReward ? Math.max(0, Number(nextReward.stamps) - currentStamps) : 0;
                  const effectiveLogo = card.logo || targetStore?.logo || targetStore?.logoUrl || card.storeLogo || targetStore?.photoUrl;

                  return (
                    <div>
                      <div
                        style={{
                          background: `linear-gradient(135deg, ${card.cardColor || '#9C382A'} 0%, ${card.cardGradient || '#DE8B76'} 100%)`,
                          borderRadius: '22px',
                          padding: '20px',
                          color: '#FFFFFF',
                          boxShadow: isNearbyStoreFeatured
                            ? '0 12px 30px rgba(22, 101, 52, 0.25), 0 0 0 2.5px #22C55E'
                            : '0 8px 24px rgba(0, 0, 0, 0.12), inset 0 1px 1px rgba(255,255,255,0.3)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: '220px',
                          position: 'relative',
                          overflow: 'hidden',
                          transition: 'all 0.25s ease'
                        }}
                      >
                        {/* Custom background image from store panel (Canva / photo) */}
                        {card.cardBackgroundImage && (
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundImage: `url(${card.cardBackgroundImage})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            opacity: 0.40,
                            pointerEvents: 'none',
                            zIndex: 0
                          }} />
                        )}

                        {/* Shimmer overlay */}
                        <div style={{
                          position: 'absolute',
                          top: '-40px',
                          right: '-40px',
                          width: '120px',
                          height: '120px',
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.1)',
                          pointerEvents: 'none'
                        }} />

                        {/* Banner de Proximidad dentro de la tarjeta */}
                        {isNearbyStoreFeatured && nearbyStoreMatch && (
                          <div style={{
                            background: '#15803D',
                            color: '#FFFFFF',
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '0.68rem',
                            fontWeight: 850,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            marginBottom: '10px',
                            alignSelf: 'flex-start',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                          }}>
                            <span>📍</span>
                            <span>¡Estás en este comercio ahora! ({nearbyStoreMatch.formattedDistance})</span>
                          </div>
                        )}

                        {/* Top row: Logo + Store Name + Category + Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', position: 'relative', zIndex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                            <div style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '12px',
                              background: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                              flexShrink: 0,
                              overflow: 'hidden'
                            }}>
                              {effectiveLogo ? (
                                <img src={effectiveLogo} alt={card.storeName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <span style={{ fontWeight: 900, color: card.cardColor || '#9C382A', fontSize: '1rem' }}>
                                  {(card.storeName || 'TI').slice(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{
                                fontWeight: 900,
                                fontSize: '0.98rem',
                                letterSpacing: '-0.01em',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                textShadow: '0 1px 2px rgba(0,0,0,0.25)'
                              }}>
                                {card.storeName}
                              </div>
                              <div style={{ fontSize: '0.70rem', opacity: 0.88, fontWeight: 600 }}>
                                {card.storeCategory || 'Comercio Aliado'}
                              </div>
                            </div>
                          </div>

                          <span style={{
                            background: isNearbyStoreFeatured
                              ? 'rgba(34, 197, 94, 0.45)'
                              : (unlockedRewards.length > 0 ? 'rgba(34, 197, 94, 0.35)' : 'rgba(255, 255, 255, 0.22)'),
                            backdropFilter: 'blur(6px)',
                            border: '1px solid rgba(255, 255, 255, 0.35)',
                            padding: '3px 9px',
                            borderRadius: '999px',
                            fontSize: '0.64rem',
                            fontWeight: 850,
                            letterSpacing: '0.03em',
                            textTransform: 'uppercase',
                            flexShrink: 0
                          }}>
                            {isNearbyStoreFeatured
                              ? '📍 En Mostrador'
                              : (unlockedRewards.length > 0 ? `¡${unlockedRewards.length} Listo(s)! 🎉` : 'Cartilla Activa')}
                          </span>
                        </div>

                        {/* Catálogo de Premios por Sellos */}
                        <div style={{
                          background: 'rgba(0, 0, 0, 0.22)',
                          backdropFilter: 'blur(4px)',
                          borderRadius: '12px',
                          padding: '10px 12px',
                          marginBottom: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          position: 'relative',
                          zIndex: 1
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 800 }}>
                              <Award size={15} color="#FDE047" />
                              <span>Premios por Sellos:</span>
                            </div>
                            <span style={{ fontSize: '0.62rem', color: '#FDE047', fontWeight: 800 }}>
                              {currentStamps} sellos acumulados
                            </span>
                          </div>

                          {/* Lista de hitos de premios */}
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            {sortedRewards.map((rew, idx) => {
                              const isUnlocked = currentStamps >= Number(rew.stamps);
                              return (
                                <span
                                  key={rew.id || idx}
                                  style={{
                                    background: isUnlocked ? '#DCFCE7' : 'rgba(255, 255, 255, 0.14)',
                                    color: isUnlocked ? '#166534' : '#FFFFFF',
                                    border: isUnlocked ? '1px solid #86EFAC' : '1px solid rgba(255, 255, 255, 0.22)',
                                    borderRadius: '8px',
                                    padding: '3px 8px',
                                    fontSize: '0.66rem',
                                    fontWeight: 800,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <span>{rew.icon || '🎁'}</span>
                                  <span>{rew.stamps} sellos: <strong>{rew.title}</strong></span>
                                  {isUnlocked && <span style={{ marginLeft: '2px' }}>✓</span>}
                                </span>
                              );
                            })}
                          </div>

                          {/* Próximo premio o felicitación */}
                          {nextReward ? (
                            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.92)', marginTop: '2px' }}>
                              🚀 Faltan <strong>{remainingForNext} {remainingForNext === 1 ? 'sello' : 'sellos'}</strong> para tu: <strong style={{ color: '#FDE047' }}>{nextReward.icon} {nextReward.title}</strong>
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.68rem', color: '#86EFAC', fontWeight: 800, marginTop: '2px' }}>
                              👑 ¡Has desbloqueado todos los premios! Muestra tu código al cajero para canjear.
                            </div>
                          )}
                        </div>

                        {/* Hilera de Sellos */}
                        <div style={{ marginBottom: '14px', position: 'relative', zIndex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.68rem', fontWeight: 750, opacity: 0.9 }}>
                            <span>Progreso de Sellos:</span>
                            <span>{currentStamps} de {targetStamps} sellos</span>
                          </div>

                          <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                            {Array.from({ length: targetStamps }).map((_, idx) => {
                              const isStamped = idx < currentStamps;
                              const matchingReward = sortedRewards.find(r => Number(r.stamps) === (idx + 1));
                              return (
                                <div
                                  key={idx}
                                  style={{
                                    width: '34px',
                                    height: '34px',
                                    borderRadius: '50%',
                                    background: isStamped ? '#FFFFFF' : 'rgba(255,255,255,0.16)',
                                    border: matchingReward
                                      ? '2px solid #FDE047'
                                      : `1.5px solid ${isStamped ? '#FFFFFF' : 'rgba(255,255,255,0.4)'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: matchingReward ? '0 0 8px rgba(253, 224, 71, 0.45)' : (isStamped ? '0 3px 8px rgba(0,0,0,0.22)' : 'none'),
                                    transition: 'transform 0.15s ease',
                                    position: 'relative'
                                  }}
                                  title={matchingReward ? `Hito: ${matchingReward.stamps} sellos = ${matchingReward.title}` : `Sello #${idx + 1}`}
                                >
                                  {matchingReward && (
                                    <span style={{
                                      position: 'absolute',
                                      top: '-6px',
                                      right: '-4px',
                                      fontSize: '10px',
                                      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))'
                                    }}>
                                      {matchingReward.icon || '🎁'}
                                    </span>
                                  )}
                                  {isStamped ? (
                                    renderStampIcon(card.stampIcon, 16, card.cardColor || '#9C382A')
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

                        {/* Botones de acción en la tarjeta */}
                        <div style={{
                          display: 'flex',
                          gap: '8px',
                          borderTop: '1px solid rgba(255, 255, 255, 0.22)',
                          paddingTop: '10px',
                          position: 'relative',
                          zIndex: 1
                        }}>
                          {isCardAcquired ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCardForModal(card);
                                  setShowCardModal(true);
                                }}
                                style={{
                                  flex: 1,
                                  padding: '8px 10px',
                                  borderRadius: '10px',
                                  background: '#FFFFFF',
                                  border: 'none',
                                  color: card.cardColor || '#9C382A',
                                  fontSize: '0.76rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '5px',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                                }}
                              >
                                <QrCode size={14} />
                                <span>Mostrar en Caja</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setScannedStoreId(card.storeId);
                                  setScanStep(1);
                                  setShowStoreScanModal(true);
                                }}
                                style={{
                                  flex: 1,
                                  padding: '8px 10px',
                                  borderRadius: '10px',
                                  background: 'rgba(255, 255, 255, 0.22)',
                                  border: '1px solid rgba(255, 255, 255, 0.4)',
                                  color: '#FFFFFF',
                                  fontSize: '0.76rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '5px'
                                }}
                              >
                                <Scan size={14} />
                                <span>Escanear Local</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAcquireStoreCard(targetStore || { id: card.storeId, name: card.storeName })}
                                style={{
                                  flex: 1.2,
                                  padding: '9px 12px',
                                  borderRadius: '10px',
                                  background: '#FFFFFF',
                                  border: 'none',
                                  color: card.cardColor || '#9C382A',
                                  fontSize: '0.80rem',
                                  fontWeight: 850,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  boxShadow: '0 3px 8px rgba(0,0,0,0.2)'
                                }}
                              >
                                <Plus size={15} strokeWidth={3} />
                                <span>Adquirir tarjeta</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setActiveTab('TIENDAS')}
                                style={{
                                  flex: 1,
                                  padding: '9px 12px',
                                  borderRadius: '10px',
                                  background: 'rgba(255, 255, 255, 0.22)',
                                  border: '1px solid rgba(255, 255, 255, 0.45)',
                                  color: '#FFFFFF',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px'
                                }}
                              >
                                <Store size={14} />
                                <span>Ver Catálogo</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Botón elegante para ver todas las tarjetas si tiene más de 1 */}
                      {clientLoyaltyCards.length > 1 && (
                        <div
                          onClick={() => {
                            setIsViewingAllCards(true);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          style={{
                            cursor: 'pointer',
                            background: '#FFFFFF',
                            border: '1.2px solid var(--border-subtle)',
                            borderRadius: '16px',
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: '10px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                            transition: 'all 0.18s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--c-primary)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              background: '#FAF4EE',
                              color: 'var(--c-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <Award size={18} />
                            </div>
                            <div>
                              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                Ver todas mis tarjetas
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                Tienes {clientLoyaltyCards.length} tarjetas de fidelidad acumuladas
                              </div>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--c-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {clientLoyaltyCards.length} tiendas <ChevronRight size={14} />
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
              );
            })()}

            {/* 2. TARJETA DIGITAL QR (FideliDigitalCard) */}
            <div style={{
              background: 'linear-gradient(145deg, #1C1917 0%, #292524 60%, #1C1917 100%)',
              borderRadius: '24px',
              padding: '24px',
              color: '#FFFFFF',
              boxShadow: '0 12px 32px rgba(28,25,23,0.18)',
              border: '1px solid #44403C',
              position: 'relative',
              overflow: 'hidden',
              marginBottom: '24px'
            }}>
              {/* Subtle Background Glow */}
              <div style={{
                position: 'absolute',
                top: '-40px',
                right: '-40px',
                width: '160px',
                height: '160px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(156,56,42,0.3) 0%, transparent 70%)',
                pointerEvents: 'none'
              }} />

              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <img src="/fidely.png" alt="fidely" style={{ width: '22px', height: '22px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800 }}>fidely</span>
                  <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#E5D5C5', letterSpacing: '0.08em' }}>CLUB</span>
                </div>
                <span style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '999px',
                  padding: '3px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}>
                  {selectedClient.tier}
                </span>
              </div>

              {/* QR Code and Member Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
                <div
                  onClick={() => setShowCardModal(true)}
                  style={{
                    background: '#FFFFFF',
                    padding: '10px',
                    borderRadius: '14px',
                    display: 'inline-block',
                    cursor: 'pointer'
                  }}
                  title="Toca para ampliar QR"
                >
                  <QRCodeDisplay
                    value={selectedClient.qrCode}
                    size={110}
                    darkColor="#1C1917"
                    lightColor="#FFFFFF"
                  />
                </div>

                <div style={{ flex: 1, minWidth: '150px' }}>
                  <div style={{ fontSize: '0.74rem', color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Socio Titular
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: '2px' }}>
                    {selectedClient.name}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#D6D3D1', marginTop: '2px', fontFamily: 'monospace' }}>
                    DNI: {selectedClient.docId}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#A8A29E', marginTop: '6px' }}>
                    Miembro desde {selectedClient.joinDate}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div style={{
                marginTop: '20px',
                paddingTop: '14px',
                borderTop: '1px solid rgba(255,255,255,0.12)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.8rem'
              }}>
                <span style={{ color: '#D6D3D1' }}>
                  {totalClientStamps} Sellos Acumulados • {clientLoyaltyCards.length} Comercios
                </span>
                <button
                  onClick={() => setShowCardModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>Ampliar QR</span>
                  <ArrowUpRight size={13} />
                </button>
              </div>
            </div>

            {/* 3. SECCIÓN: COMERCIOS DESTACADOS / POPULAR MERCHANTS (Carrusel de Logos Circulares) */}
            <div style={{
              marginBottom: '24px',
              background: '#FFFFFF',
              border: '1.5px solid var(--border-subtle)',
              borderRadius: '20px',
              padding: '16px 18px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
            }}>
              {/* Header de la sección */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '14px',
                padding: '0 2px'
              }}>
                <h3 style={{
                  fontSize: '1.08rem',
                  fontWeight: 800,
                  color: 'var(--text-main, #1F2937)',
                  margin: 0,
                  letterSpacing: '-0.02em'
                }}>
                  Comercios Destacados
                </h3>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('TIENDAS');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#E11D48',
                    fontSize: '0.84rem',
                    fontWeight: 750,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 6px',
                    borderRadius: '8px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.transform = 'translateX(2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateX(0)'; }}
                  title="Ver todas las tiendas aliadas"
                >
                  <span>Ver todas</span>
                  <ArrowRight size={15} strokeWidth={2.4} />
                </button>
              </div>

              {/* Fila horizontal con scroll de comercios circulares */}
              <div
                className="popular-merchants-scroll"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                  overflowX: 'auto',
                  padding: '4px 2px 6px 2px',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                {approvedStores.length === 0 ? (
                  <div style={{
                    padding: '16px 20px',
                    fontSize: '0.80rem',
                    color: 'var(--text-muted)',
                    width: '100%',
                    textAlign: 'center'
                  }}>
                    Aún no hay comercios disponibles.
                  </div>
                ) : (
                  approvedStores.map((st) => {
                    const cleanName = (st.name || 'Comercio').replace(/^Sucursal\s+/i, '');
                    return (
                      <div
                        key={st.id}
                        onClick={() => {
                          const virtualCard = (selectedClient.loyaltyCards || []).find(c => c.storeId === st.id) ||
                            createStoreLoyaltyCard(st, selectedClient, 0);
                          setSelectedCardForModal(virtualCard);
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          width: '68px',
                          flexShrink: 0,
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'transform 0.18s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                        title={`Ver tarjeta y premios de ${st.name}`}
                      >
                        {/* Contenedor Circular del Logo */}
                        <div style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)',
                          border: '2px solid #FFFFFF',
                          background: '#FFFFFF',
                          marginBottom: '6px',
                          flexShrink: 0
                        }}>
                          <StoreLogoBadge
                            store={st}
                            size={60}
                            borderRadius="50%"
                            showCategoryBadge={false}
                          />
                        </div>

                        {/* Nombre del Comercio (centrado y truncado como en la referencia) */}
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          color: 'var(--text-main, #2D2D2D)',
                          width: '100%',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.2
                        }}>
                          {cleanName}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
              </>
            )}
          </div>
        )}

        {/* ===================== TAB: PROMOCIONES DE LAS TIENDAS ===================== */}
        {activeTab === 'PROMOCIONES' && (
          <div style={{ marginBottom: '40px' }}>
            {/* Header */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #15803D 0%, #16A34A 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 14px rgba(22, 163, 74, 0.25)'
                }}>
                  <TicketPercent size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em', margin: 0, color: 'var(--text-main)' }}>
                    Promociones de las Tiendas
                  </h2>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0 }}>
                    Cupones flash y ofertas exclusivas de tus comercios aliados.
                  </p>
                </div>
              </div>
            </div>

            {/* Info notice */}
            <div style={{
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '14px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Sparkles size={18} color="#15803D" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.80rem', color: '#166534', lineHeight: 1.4 }}>
                <strong>¿Cómo funcionan?</strong> Toma tu cupón de descuento directamente. Al visitar la tienda, preséntalo al cajero para aplicarlo en tu compra sin necesidad de canjear sellos.
              </div>
            </div>

            {/* Promos Grid */}
            {eligiblePromotions.length === 0 ? (
              <div className="glass-panel" style={{
                textAlign: 'center',
                padding: '48px 24px',
                borderRadius: '20px',
                border: '1.5px dashed var(--border-subtle)'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#F1F5F9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  color: '#94A3B8'
                }}>
                  <TicketPercent size={32} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text-main)' }}>
                  No hay promociones activas por ahora
                </h3>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 18px auto' }}>
                  Tus tiendas aliadas publican cupones de descuento y promociones relámpago con frecuencia. ¡Mantén tus notificaciones activas para no perderte ninguna!
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('INICIO')}
                  className="btn btn-secondary"
                  style={{ borderRadius: '12px', padding: '9px 18px', fontSize: '0.84rem' }}
                >
                  Volver al Inicio
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {eligiblePromotions.map((promo) => {
                  const hasClaimed = Array.isArray(promo.claimedUserIds) && promo.claimedUserIds.includes(selectedClient?.id);
                  const isUnlimited = !!promo.isUnlimited;
                  const remaining = Number(promo.remainingStock ?? promo.totalStock ?? 0);
                  const total = Number(promo.totalStock || 1);
                  const isSoldOut = !isUnlimited && remaining <= 0;
                  const isClaimingThis = isClaimingPromoId === promo.id;

                  const clientCard = (selectedClient.loyaltyCards || []).find(c => {
                    const cId = String(c.storeId || c.id || '').trim().toLowerCase();
                    return cId === String(promo.storeId || '').trim().toLowerCase();
                  });

                  return (
                    <div
                      key={promo.id}
                      className="glass-panel"
                      style={{
                        background: hasClaimed
                          ? 'linear-gradient(145deg, #F7EFE8 0%, #FFFFFF 100%)'
                          : isSoldOut
                            ? '#F8FAFC'
                            : '#FFFFFF',
                        borderRadius: '20px',
                        padding: '18px',
                        border: hasClaimed
                          ? '1.5px solid var(--c-primary-light, #DE8B76)'
                          : isSoldOut
                            ? '1px dashed #CBD5E1'
                            : '1.5px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: hasClaimed ? '0 6px 18px rgba(156, 56, 42, 0.10)' : '0 4px 14px rgba(0,0,0,0.04)'
                      }}
                    >
                      {/* Store Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <StoreLogoBadge
                            storeName={promo.storeName || 'Tienda Aliada'}
                            storeCategory="Comercio"
                            cardColor={clientCard?.cardColor || '#9C382A'}
                            size="sm"
                            logoUrl={promo.storeLogo || clientCard?.logo}
                          />
                          <div>
                            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
                              {promo.storeName}
                            </div>
                            <div style={{ fontSize: '0.70rem', color: 'var(--c-primary, #9C382A)', fontWeight: 700 }}>
                              ✓ Cliente Registrado
                            </div>
                          </div>
                        </div>

                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: '999px',
                          background: promo.badgeType === 'DOBLE_SELLO' ? '#FEF3C7' : '#EFF6FF',
                          color: promo.badgeType === 'DOBLE_SELLO' ? '#B45309' : '#1D4ED8'
                        }}>
                          {promo.badgeType === 'DOBLE_SELLO' ? '⭐ Doble Sello' : (promo.badgeType || 'PROMO')}
                        </span>
                      </div>

                      {/* Title & Message */}
                      <h4 style={{ fontSize: '1.02rem', fontWeight: 900, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
                        {promo.title}
                      </h4>
                      <p style={{ fontSize: '0.80rem', color: 'var(--text-muted)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                        {promo.message}
                      </p>

                      {/* Banner Image if any */}
                      {promo.imageUrl && (
                        <div style={{ width: '100%', height: '120px', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
                          <img
                            src={promo.imageUrl}
                            alt={promo.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </div>
                      )}

                      {/* Stock & Expiration Footer */}
                      <div style={{
                        background: '#FAF8F5',
                        borderRadius: '12px',
                        padding: '10px 12px',
                        marginBottom: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', fontWeight: 800 }}>
                          <span style={{ color: isSoldOut ? '#EF4444' : (remaining <= 3 && !isUnlimited ? '#EA580C' : '#15803D') }}>
                            {isUnlimited ? '✨ Cupos ilimitados' : (isSoldOut ? '⛔ Cupos agotados' : `🎟️ Quedan ${remaining} de ${total} cupos`)}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                            {promo.validityType === 'SINGLE_DAY' ? `⚡ Solo el ${promo.validityDate}` : `📅 Hasta el ${promo.validityDate}`}
                          </span>
                        </div>

                        {!isUnlimited && (
                          <div style={{ width: '100%', height: '5px', borderRadius: '999px', background: 'var(--border-subtle, #EDE2D5)', overflow: 'hidden' }}>
                            <div style={{
                              width: `${Math.min(100, Math.max(0, (remaining / total) * 100))}%`,
                              height: '100%',
                              background: isSoldOut ? '#CBD5E1' : (remaining <= 3 ? '#EA580C' : 'var(--c-primary, #9C382A)'),
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div style={{ marginTop: 'auto' }}>
                        {hasClaimed ? (
                          <button
                            type="button"
                            onClick={() => {
                              const existingVoucher = (redemptions || []).find(r => r.promoId === promo.id && (r.clientId === selectedClient?.id || r.clientId === selectedClient?.uid));
                              if (existingVoucher) {
                                setActiveVoucherModal({ ...existingVoucher, status: existingVoucher.status === 'PENDIENTE' ? 'DISPONIBLE' : (existingVoucher.status || 'DISPONIBLE') });
                              } else {
                                const vCode = promo.claimedVouchers?.[selectedClient?.id] || `CUPON-${promo.id.slice(-6)}`;
                                setActiveVoucherModal({
                                  voucherCode: vCode,
                                  rewardTitle: promo.title,
                                  storeName: promo.storeName,
                                  status: 'DISPONIBLE',
                                  description: promo.message
                                });
                              }
                            }}
                            className="btn"
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              fontSize: '0.84rem',
                              fontWeight: 800,
                              borderRadius: '12px',
                              background: '#F7EFE8',
                              color: 'var(--c-primary, #9C382A)',
                              border: '1px solid var(--c-primary-light, #DE8B76)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <CheckCircle2 size={16} />
                            <span>✓ Cupón Reclamado (Ver QR)</span>
                          </button>
                        ) : isSoldOut ? (
                          <button
                            type="button"
                            disabled
                            className="btn"
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              fontSize: '0.84rem',
                              fontWeight: 800,
                              borderRadius: '12px',
                              background: '#F1F5F9',
                              color: '#94A3B8',
                              border: '1px solid #E2E8F0',
                              cursor: 'not-allowed'
                            }}
                          >
                            Cupos Agotados
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleClaimPromo(promo)}
                            disabled={isClaimingThis}
                            className="btn btn-primary"
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              fontSize: '0.84rem',
                              fontWeight: 900,
                              borderRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              background: 'linear-gradient(135deg, #15803D 0%, #16A34A 100%)',
                              border: 'none',
                              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.28)',
                              cursor: isClaimingThis ? 'wait' : 'pointer'
                            }}
                          >
                            {isClaimingThis ? <Loader2 size={16} className="spin" /> : <Gift size={16} />}
                            <span>{isClaimingThis ? 'Tomando cupón...' : 'Tomar Cupón Ahora'}</span>
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 2: RECOMPENSAS & CUPONES ===================== */}
        {activeTab === 'RECOMPENSAS' && (
          <div>
            {/* Header */}
            <div style={{ marginBottom: '18px' }}>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.02em', margin: '0 0 4px 0' }}>
                Recompensas de Fidelidad
              </h2>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                Premios que has ganado acumulando sellos en tus comercios aliados.
              </p>
            </div>

            {/* Segmented Subtabs Switcher matching Screenshots 1 & 2 */}
            <div style={{
              display: 'flex',
              background: '#F5EBE1',
              padding: '4px',
              borderRadius: '16px',
              border: '1px solid #EDE2D5',
              marginBottom: '20px'
            }}>
              <button
                type="button"
                onClick={() => setRewardsSubTab('CATALOGO')}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: rewardsSubTab === 'CATALOGO' ? 800 : 600,
                  cursor: 'pointer',
                  background: rewardsSubTab === 'CATALOGO' ? '#FFFFFF' : 'transparent',
                  color: rewardsSubTab === 'CATALOGO' ? 'var(--text-main)' : 'var(--text-muted)',
                  boxShadow: rewardsSubTab === 'CATALOGO' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>Premios Disponibles</span>
                <span style={{
                  background: rewardsSubTab === 'CATALOGO' ? '#16A34A' : '#10B981',
                  color: '#FFFFFF',
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  padding: '1px 6px',
                  borderRadius: '999px'
                }}>
                  {readyStampRewards.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRewardsSubTab('RECLAMADOS')}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: rewardsSubTab === 'RECLAMADOS' ? 800 : 600,
                  cursor: 'pointer',
                  background: rewardsSubTab === 'RECLAMADOS' ? '#FFFFFF' : 'transparent',
                  color: rewardsSubTab === 'RECLAMADOS' ? 'var(--text-main)' : 'var(--text-muted)',
                  boxShadow: rewardsSubTab === 'RECLAMADOS' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>Mis Reclamados</span>
                <span style={{
                  background: rewardsSubTab === 'RECLAMADOS' ? '#78350F' : '#92400E',
                  color: '#FFFFFF',
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  padding: '1px 6px',
                  borderRadius: '999px'
                }}>
                  {clientVouchers.length}
                </span>
              </button>
            </div>

            {rewardsSubTab === 'RECLAMADOS' ? (
              <div>
                {clientVouchers.length === 0 ? (
                  <div style={{
                    background: '#FFFFFF',
                    borderRadius: '20px',
                    padding: '40px 20px',
                    textAlign: 'center',
                    border: '1px solid var(--border-subtle)',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: '#FAF8F5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 14px'
                    }}>
                      <Gift size={26} color="var(--c-primary)" />
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '6px' }}>
                      Aún no has reclamado ningún premio
                    </h3>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto 16px' }}>
                      Reúne sellos en tus tarjetas de fidelidad o canjea puntos del catálogo para desbloquear beneficios exclusivos.
                    </p>
                    <button
                      type="button"
                      onClick={() => setRewardsSubTab('CATALOGO')}
                      className="btn btn-primary"
                      style={{ padding: '8px 18px', fontSize: '0.82rem' }}
                    >
                      Explorar Premios Disponibles →
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {clientVouchers.map(v => {
                      const isApproved = v.status === 'APROBADO' || v.status === 'USADO';
                      return (
                        <div
                          key={v.id}
                          style={{
                            background: '#FFFFFF',
                            borderRadius: '20px',
                            border: '1.5px solid var(--border-subtle)',
                            padding: '16px 18px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '10px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                              <strong style={{ fontSize: '0.94rem', color: 'var(--text-main)' }}>
                                {v.rewardTitle || 'Premio de Fidelidad'}
                              </strong>
                              <span style={{
                                background: '#DCFCE7',
                                color: '#15803D',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '0.70rem',
                                fontWeight: 800
                              }}>
                                {isApproved ? 'Aprobado ✓' : 'Listo en Caja ⏳'}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                              {v.voucherCode || `CANJE-${String(v.id || '').slice(-6)}`} • {v.storeName || 'Comercio Aliado'}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setActiveVoucherModal(v)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--c-primary)',
                              fontWeight: 800,
                              fontSize: '0.84rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              flexShrink: 0
                            }}
                          >
                            <span>Ver QR</span>
                            <QrCode size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div>
                {/* Premios Disponibles listos exclusivamente con Sellos de Tarjetas de Fidelidad */}
                {readyStampRewards.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{
                      padding: '48px 24px',
                      textAlign: 'center',
                      background: '#FFFFFF',
                      borderRadius: '24px',
                      border: '1px dashed var(--border-subtle)',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: '#FAF4EE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px'
                      }}>
                        <Award size={32} color="var(--c-primary)" />
                      </div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-main)' }}>
                        Aún no tienes premios listos para canjear
                      </h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '460px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                        Reúne los sellos requeridos en tus tarjetas de fidelidad al realizar tus compras en comercios aliados para desbloquear tus recompensas.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('INICIO')}
                        className="btn btn-primary"
                        style={{ padding: '10px 22px', fontSize: '0.85rem' }}
                      >
                        Ver Mis Tarjetas de Sellos →
                      </button>
                    </div>

                    {/* Tarjetas en Progreso */}
                    {inProgressCards.length > 0 && (
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 850, marginBottom: '14px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Store size={18} color="var(--c-primary)" />
                          <span>Tus Tarjetas en Progreso</span>
                        </h3>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                          gap: '14px'
                        }}>
                          {inProgressCards.map((card, idx) => {
                            const percent = Math.min(100, Math.round((card.currentStamps / card.stampsTarget) * 100));
                            return (
                              <div
                                key={card.id || idx}
                                style={{
                                  background: '#FFFFFF',
                                  borderRadius: '18px',
                                  padding: '18px',
                                  border: '1px solid var(--border-subtle)',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  gap: '12px'
                                }}
                              >
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-main)' }}>
                                      {card.storeName}
                                    </span>
                                    <span style={{
                                      background: '#FAF4EE',
                                      color: 'var(--c-primary)',
                                      padding: '2px 8px',
                                      borderRadius: '10px',
                                      fontSize: '0.72rem',
                                      fontWeight: 800
                                    }}>
                                      {card.currentStamps} / {card.stampsTarget} Sellos
                                    </span>
                                  </div>

                                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                                    Premio: <strong style={{ color: 'var(--text-main)' }}>{card.rewardTitle}</strong>
                                  </div>

                                  {/* Progress bar */}
                                  <div style={{
                                    width: '100%',
                                    height: '8px',
                                    background: '#F0ECE8',
                                    borderRadius: '999px',
                                    overflow: 'hidden'
                                  }}>
                                    <div style={{
                                      width: `${percent}%`,
                                      height: '100%',
                                      background: card.cardColor || 'var(--c-primary)',
                                      borderRadius: '999px',
                                      transition: 'width 0.3s ease'
                                    }} />
                                  </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                  <span>Faltan <strong>{card.missingStamps} sellos</strong> para la meta</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedCardForModal(card);
                                      setShowCardModal(true);
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'var(--c-primary)',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      fontSize: '0.76rem'
                                    }}
                                  >
                                    Ver Tarjeta →
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                      gap: '16px'
                    }}>
                      {readyStampRewards.map((premio) => {
                        const existingPending = clientAllRecords.find(r =>
                          (r.storeId === premio.storeId || (premio.storeName && r.storeName && r.storeName.toLowerCase() === premio.storeName.toLowerCase())) &&
                          r.status === 'PENDIENTE' &&
                          r.type === 'STAMP_REWARD_CLAIM'
                        );

                        return (
                          <div
                            key={premio.id}
                            style={{
                              background: '#FFFFFF',
                              borderRadius: '24px',
                              border: '1.5px solid var(--c-primary-light, #DE8B76)',
                              padding: '18px 20px',
                              boxShadow: '0 4px 18px rgba(156, 56, 42, 0.08)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '14px'
                            }}
                          >
                            {/* Header row with badge */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{
                                background: '#F7EFE8',
                                color: 'var(--c-primary, #9C382A)',
                                border: '1px solid rgba(222, 139, 118, 0.4)',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                fontSize: '0.74rem',
                                fontWeight: 800
                              }}>
                                ✓ 🎉 ¡SELLOS COMPLETADOS!
                              </span>
                              <span style={{
                                color: 'var(--c-primary, #9C382A)',
                                fontWeight: 800,
                                fontSize: '0.86rem'
                              }}>
                                {premio.currentStamps || premio.stampsCost} / {premio.stampsCost} Sellos
                              </span>
                            </div>

                            {/* Content row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                              <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '14px',
                                background: '#F7EFE8',
                                border: '1px solid rgba(222, 139, 118, 0.35)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.4rem',
                                flexShrink: 0
                              }}>
                                {premio.rewardIcon || '🎁'}
                              </div>
                              <div>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 3px 0' }}>
                                  {premio.rewardTitle}
                                </h3>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                  {premio.storeName}
                                </div>
                              </div>
                            </div>

                            {/* Action Button 1: Solicitar Canje */}
                            {existingPending ? (
                              <button
                                type="button"
                                onClick={() => setActiveVoucherModal(existingPending)}
                                className="btn btn-primary"
                                style={{
                                  width: '100%',
                                  padding: '12px',
                                  fontSize: '0.88rem',
                                  fontWeight: 800,
                                  borderRadius: '12px',
                                  background: '#F59E0B',
                                  border: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px'
                                }}
                              >
                                <span>En Caja ⏳ - Ver Cupón</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRequestStampRewardClaim(premio.card, {
                                  title: premio.rewardTitle,
                                  stamps: premio.stampsCost,
                                  icon: premio.rewardIcon
                                })}
                                className="btn btn-primary"
                                style={{
                                  width: '100%',
                                  padding: '12px',
                                  fontSize: '0.88rem',
                                  fontWeight: 800,
                                  borderRadius: '12px',
                                  background: '#16A34A',
                                  border: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)'
                                }}
                              >
                                <Gift size={16} />
                                <span>Solicitar Canje de "{premio.rewardTitle}"</span>
                              </button>
                            )}

                            {/* Action Button 2: Presentar Tarjeta Digital con QR */}
                            <button
                              type="button"
                              onClick={() => setShowCardModal(true)}
                              style={{
                                width: '100%',
                                padding: '10px',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                borderRadius: '12px',
                                background: '#FFFFFF',
                                border: '1.5px solid var(--border-subtle)',
                                color: 'var(--text-main)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                cursor: 'pointer'
                              }}
                            >
                              <QrCode size={16} color="var(--c-primary)" />
                              <span>Presentar Tarjeta Digital con QR</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Tarjetas en Progreso secundarias */}
                    {inProgressCards.length > 0 && (
                      <div style={{ marginTop: '16px' }}>
                        <h4 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '10px' }}>
                          Otras Tarjetas en Progreso ({inProgressCards.length})
                        </h4>
                        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
                          {inProgressCards.map((card, idx) => (
                            <div
                              key={card.id || idx}
                              style={{
                                background: '#FFFFFF',
                                borderRadius: '14px',
                                padding: '12px 14px',
                                border: '1px solid var(--border-subtle)',
                                minWidth: '220px',
                                flexShrink: 0
                              }}
                            >
                              <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-main)' }}>{card.storeName}</div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 6px 0' }}>{card.rewardTitle}</div>
                              <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--c-primary)' }}>
                                {card.currentStamps} / {card.stampsTarget} Sellos (Faltan {card.missingStamps})
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 3: MI ACTIVIDAD (Screenshot 4: Canjes) ===================== */}
        {activeTab === 'ACTIVIDAD' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.02em', margin: '0 0 4px 0' }}>
                  Canjes
                </h2>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                  Registro de tus sellos recibidos y premios canjeados en comercios aliados.
                </p>
              </div>
              <span style={{
                background: '#FAF4EE',
                color: 'var(--c-primary)',
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '0.72rem',
                fontWeight: 800,
                flexShrink: 0,
                marginTop: '4px'
              }}>
                {fullActivityHistory.length} movimientos
              </span>
            </div>

            {/* Filter chips matching Screenshot 4 */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '18px', scrollbarWidth: 'none' }}>
              {[
                { id: 'ALL', label: 'Todos', count: fullActivityHistory.length },
                { id: 'SELLOS', label: 'Sellos Acreditados', count: fullActivityHistory.filter(h => h.isStampRecord).length },
                { id: 'CANJES', label: 'Premios Canjeados', count: fullActivityHistory.filter(h => !h.isStampRecord).length }
              ].map(f => {
                const isSelected = activityFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActivityFilter(f.id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '999px',
                      fontSize: '0.80rem',
                      fontWeight: isSelected ? 800 : 600,
                      cursor: 'pointer',
                      background: isSelected ? '#78350F' : '#FFFFFF',
                      color: isSelected ? '#FFFFFF' : 'var(--text-main)',
                      border: isSelected ? '1.5px solid #78350F' : '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{f.label}</span>
                    <span style={{
                      background: isSelected ? 'rgba(255,255,255,0.25)' : '#F3F4F6',
                      color: isSelected ? '#FFFFFF' : 'var(--text-muted)',
                      padding: '1px 6px',
                      borderRadius: '999px',
                      fontSize: '0.68rem',
                      fontWeight: 800
                    }}>
                      {f.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* List of activity items matching Screenshot 4 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredHistoryRecords.length === 0 ? (
                <div style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  padding: '36px 20px',
                  textAlign: 'center',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: 0 }}>
                    No hay movimientos en esta sección.
                  </p>
                </div>
              ) : (
                filteredHistoryRecords.map((item, idx) => {
                  const isStamp = item.isStampRecord;
                  const dateStr = item.dateGenerated || item.date || item.createdAt || '2026-11-04';
                  const dateOnly = String(dateStr).split('T')[0].split(' ')[0];

                  return (
                    <div
                      key={item.id || idx}
                      style={{
                        background: '#FFFFFF',
                        borderRadius: '20px',
                        border: isStamp ? '1px solid var(--border-subtle)' : '1.5px solid #86EFAC',
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '14px',
                        background: isStamp ? '#FEF3C7' : '#DCFCE7',
                        color: isStamp ? '#D97706' : '#16A34A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.3rem',
                        flexShrink: 0
                      }}>
                        {isStamp ? '⭐' : '🎁'}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {isStamp ? '+1 Sello Acreditado' : (item.rewardTitle || 'Premio de Fidelidad')}
                          </strong>
                          {isStamp ? (
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                              {dateOnly}
                            </span>
                          ) : (
                            <span style={{
                              background: '#DCFCE7',
                              color: '#15803D',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.68rem',
                              fontWeight: 800
                            }}>
                              ✓ Canjeado
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.80rem', color: '#92400E', fontWeight: 700, marginBottom: '2px' }}>
                          {item.storeName || 'Comercio Aliado'}
                        </div>

                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {isStamp ? (
                            `Progreso: ${item.currentStampsAfter || item.stamps || 1} sellos`
                          ) : (
                            `${item.stampsCost || item.stampsDeducted || 0} sellos • Código: ${item.voucherCode || item.reference || item.id} • ${dateStr}`
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ===================== TAB 4: DIRECTORIO DE TIENDAS ALIADAS ===================== */}
        {activeTab === 'TIENDAS' && (
          <div>
            {/* Search Input & Category Filters */}
            <div style={{ marginBottom: '18px' }}>
              {/* Search Bar matching Mobile App */}
              <div style={{
                position: 'relative',
                marginBottom: '12px',
                width: '100%'
              }}>
                <Search
                  size={18}
                  color="var(--text-muted)"
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none'
                  }}
                />
                <input
                  type="text"
                  placeholder="Buscar comercio por nombre, centro com..."
                  value={storeSearchQuery}
                  onChange={(e) => setStoreSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 38px 12px 42px',
                    borderRadius: '16px',
                    border: '1.5px solid #EDE2D5',
                    background: '#FFFFFF',
                    fontSize: '0.88rem',
                    color: 'var(--text-main)',
                    outline: 'none',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                    transition: 'border-color 0.2s ease'
                  }}
                />
                {storeSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setStoreSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Category Pills (horizontally scrollable matching Mobile App) */}
              <div style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '4px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}>
                {STORE_CATEGORIES.map(cat => {
                  const isSelected = storeCategoryFilter === cat.id;
                  const count = cat.id === 'ALL'
                    ? approvedStores.length
                    : approvedStores.filter(s => (s.category || '').toLowerCase().includes(cat.id.toLowerCase())).length;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setStoreCategoryFilter(cat.id)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '999px',
                        border: isSelected ? '1.5px solid #78271C' : '1px solid #EDE2D5',
                        background: isSelected ? '#78271C' : '#FFFFFF',
                        color: isSelected ? '#FFFFFF' : 'var(--text-main)',
                        fontSize: '0.80rem',
                        fontWeight: isSelected ? 800 : 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: isSelected ? '0 3px 10px rgba(120, 39, 28, 0.22)' : 'none',
                        transition: 'all 0.18s ease'
                      }}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                      <span style={{
                        background: isSelected ? 'rgba(255, 255, 255, 0.22)' : '#FAF4EE',
                        color: isSelected ? '#FFFFFF' : 'var(--c-primary)',
                        padding: '1px 6px',
                        borderRadius: '999px',
                        fontSize: '0.68rem',
                        fontWeight: 800
                      }}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stores List matching Mobile App */}
            {filteredStoresList.length === 0 ? (
              <div style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                border: '1.5px dashed #EDE2D5',
                padding: '40px 20px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#FAF4EE',
                  color: 'var(--c-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px'
                }}>
                  <Store size={26} />
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                  No se encontraron tiendas
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 auto 14px' }}>
                  No hay comercios que coincidan con "{storeSearchQuery}".
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStoreSearchQuery('');
                    setStoreCategoryFilter('ALL');
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '7px 16px', fontSize: '0.80rem' }}
                >
                  Restablecer filtros
                </button>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {filteredStoresList.map(st => {
                  const storeCard = (selectedClient?.loyaltyCards || []).find(c => c.storeId === st.id);
                  const currentStamps = storeCard ? (storeCard.currentStamps || 0) : 0;
                  const targetStamps = (storeCard && storeCard.stampsTarget) ? storeCard.stampsTarget : (st.stampsTarget || 6);

                  const cardRewards = (st.stampRewards && st.stampRewards.length > 0)
                    ? st.stampRewards
                    : [{ id: 'def', stamps: targetStamps, title: st.rewardTitle || 'Premio de Fidelidad', icon: '🎁' }];

                  const catLower = (st.category || '').toLowerCase();
                  const stampIconChar = catLower.includes('barber')
                    ? '✂'
                    : (catLower.includes('tatt') || catLower.includes('tatuaj'))
                      ? '🎨'
                      : (catLower.includes('cafe') || catLower.includes('restaurante') || catLower.includes('gastronom'))
                        ? '☕'
                        : (catLower.includes('gym') || catLower.includes('fitness'))
                          ? '✦'
                          : '⭐';

                  const hasWelcomeCoupon = Boolean(st.welcomeCoupon?.enabled || st.welcomeCouponEnabled);
                  const wcTitle = st.welcomeCoupon?.title || st.welcomeCouponTitle || '10% de Descuento';
                  const wcMin = st.welcomeCoupon?.minPurchase || st.welcomeCouponMinPurchase;

                  return (
                    <div
                      key={st.id}
                      style={{
                        background: '#FFFFFF',
                        borderRadius: '20px',
                        border: '1.5px solid #EDE2D5',
                        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
                        padding: '16px 18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        transition: 'box-shadow 0.2s ease'
                      }}
                    >
                      {/* Row 1: Logo + Title/Category + Stamps Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                          <StoreLogoBadge
                            store={st}
                            size={52}
                            borderRadius="14px"
                            showCategoryBadge={false}
                          />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <h3 style={{
                              fontSize: '1.05rem',
                              fontWeight: 800,
                              color: 'var(--text-main)',
                              margin: '0 0 2px 0',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              letterSpacing: '-0.015em'
                            }}>
                              {st.name}
                            </h3>
                            <div style={{
                              fontSize: '0.78rem',
                              color: 'var(--text-muted)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {st.category || 'Comercio'} • {st.city || 'Caracas'}
                            </div>
                          </div>
                        </div>

                        {/* Top Right Stamp Badge */}
                        <div style={{
                          background: '#E8F8F0',
                          color: '#15803D',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          flexShrink: 0
                        }}>
                          <span>{stampIconChar}</span>
                          <span>{currentStamps}/{targetStamps} sellos</span>
                        </div>
                      </div>

                      {/* Row 2: Premios en cartilla text (left) & Action buttons (right) */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#78350F',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          <span>{stampIconChar}</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {cardRewards.length > 1
                              ? `${cardRewards.length} premios en cartilla`
                              : `${targetStamps} sellos = ${cardRewards[0]?.title || 'Premio'}`}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          {/* Premios Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const cardToView = storeCard || {
                                ...createStoreLoyaltyCard(st, selectedClient, 0),
                                isAcquired: false
                              };
                              setSelectedCardForModal(cardToView);
                              setShowCardModal(true);
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '10px',
                              background: '#FAF0ED',
                              border: '1px solid #F5DDD6',
                              color: 'var(--c-primary)',
                              fontSize: '0.76rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>🎁</span>
                            <span>Premios</span>
                          </button>

                          {/* Ver Tarjeta Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const cardToView = storeCard || createStoreLoyaltyCard(st, selectedClient, 0);
                              setSelectedCardForModal(cardToView);
                              setShowCardModal(true);
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '10px',
                              background: '#1A1A1A',
                              border: 'none',
                              color: '#FFFFFF',
                              fontSize: '0.76rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <QrCode size={13} />
                            <span>Ver Tarjeta</span>
                          </button>
                        </div>
                      </div>

                      {/* Row 3: Welcome Coupon banner if store offers it */}
                      {hasWelcomeCoupon && (
                        <div style={{
                          background: '#FFF8F3',
                          border: '1px solid #FFE4D6',
                          borderRadius: '12px',
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}>
                          <span style={{ fontSize: '1.1rem' }}>🎁</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              color: '#9A3412',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              Cupón 1ra Visita: {wcTitle}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#B45309' }}>
                              {wcMin ? `En compras desde US$${parseFloat(wcMin).toFixed(2)}` : (st.welcomeCoupon?.description || 'Válido en tu primera compra en este comercio')}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: FULL DIGITAL CARD WITH QR CODE AND LOCAL BREAKDOWN */}
      {showCardModal && (
        <div className="modal-overlay" onClick={() => setShowCardModal(false)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{
              padding: '24px 20px',
              textAlign: 'center',
              borderRadius: '28px',
              maxWidth: '430px',
              width: '100%',
              background: selectedCardForModal
                ? `linear-gradient(135deg, ${(allStores.find(s => s.id === selectedCardForModal.storeId)?.cardColor || selectedCardForModal.cardColor || '#9C382A')} 0%, ${(allStores.find(s => s.id === selectedCardForModal.storeId)?.cardGradient || selectedCardForModal.cardGradient || '#DE8B76')} 100%)`
                : '#FFFFFF',
              color: selectedCardForModal ? '#FFFFFF' : 'var(--text-main)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.25s ease'
            }}
          >
            <button
              onClick={() => setShowCardModal(false)}
              style={{
                position: 'absolute',
                right: '16px',
                top: '16px',
                background: selectedCardForModal ? 'rgba(0,0,0,0.2)' : 'none',
                border: 'none',
                color: selectedCardForModal ? '#FFFFFF' : 'var(--text-muted)',
                borderRadius: '50%',
                padding: '4px',
                cursor: 'pointer',
                zIndex: 2
              }}
            >
              <X size={20} />
            </button>

            {selectedCardForModal ? (() => {
              const liveStore = allStores.find(s => s.id === selectedCardForModal.storeId);
              const card = liveStore ? {
                ...selectedCardForModal,
                storeName: liveStore.name || selectedCardForModal.storeName,
                storeCategory: liveStore.category || selectedCardForModal.storeCategory || selectedCardForModal.category,
                category: liveStore.category || selectedCardForModal.category,
                logo: liveStore.logo || liveStore.photoUrl || selectedCardForModal.logo,
                cardColor: liveStore.cardColor || liveStore.design?.cardColor || selectedCardForModal.cardColor,
                cardGradient: liveStore.cardGradient || liveStore.design?.cardGradient || selectedCardForModal.cardGradient,
                cardBackgroundImage: liveStore.cardBackgroundImage || liveStore.design?.cardBackgroundImage || liveStore.backgroundImage || selectedCardForModal.cardBackgroundImage || null,
                cardPattern: liveStore.cardPattern || liveStore.design?.cardPattern || selectedCardForModal.cardPattern || 'radial',
                stampsTarget: Number(liveStore.stampsTarget || liveStore.targetStamps || selectedCardForModal.stampsTarget || 6),
                rewardTitle: liveStore.rewardTitle || selectedCardForModal.rewardTitle,
                stampRewards: (Array.isArray(liveStore.stampRewards) && liveStore.stampRewards.length > 0)
                  ? liveStore.stampRewards
                  : selectedCardForModal.stampRewards,
                stampIcon: liveStore.stampIcon || selectedCardForModal.stampIcon || 'scissors'
              } : selectedCardForModal;

              const isAcquired = (selectedClient?.loyaltyCards || []).some(c => c.storeId === card.storeId);
              const modalStore = liveStore || card;
              const mRewards = (card.stampRewards && card.stampRewards.length > 0)
                ? card.stampRewards
                : (modalStore?.stampRewards && modalStore.stampRewards.length > 0)
                  ? modalStore.stampRewards
                  : [{ id: 'def_rew', stamps: Number(card.stampsTarget || 6), title: card.rewardTitle || 'Premio de Fidelidad', icon: '🎁' }];
              const sortedMRewards = [...mRewards].sort((a, b) => Number(a.stamps) - Number(b.stamps));
              const mCurrentStamps = Number(card.currentStamps || 0);
              const mTargetStamps = Math.max(...sortedMRewards.map(r => Number(r.stamps) || 6), Number(card.stampsTarget || 6));
              const mUnlocked = mCurrentStamps > 0 ? sortedMRewards.filter(r => Number(r.stamps) > 0 && Number(r.stamps) <= mCurrentStamps) : [];

              return (
                /* Vista de Tarjeta de Fidelización Específica de Tienda */
                <div style={{ position: 'relative', zIndex: 1 }}>
                  {/* Imagen de fondo personalizada configurada por la tienda */}
                  {card.cardBackgroundImage && (
                    <div style={{
                      position: 'absolute',
                      top: '-24px',
                      left: '-20px',
                      right: '-20px',
                      bottom: '-24px',
                      backgroundImage: `url(${card.cardBackgroundImage})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      opacity: 0.38,
                      pointerEvents: 'none',
                      zIndex: -1
                    }} />
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}>
                        {card.logo ? (
                          <img src={card.logo} alt={card.storeName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontWeight: 900, color: card.cardColor || '#9C382A', fontSize: '1rem' }}>
                            {(card.storeName || 'TI').slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: '1.05rem', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                          {card.storeName}
                        </div>
                        <div style={{ fontSize: '0.70rem', opacity: 0.9, fontWeight: 600 }}>
                          {card.storeCategory || 'Comercio Aliado'}
                        </div>
                      </div>
                    </div>

                    <span style={{
                      background: isAcquired ? 'rgba(255,255,255,0.22)' : 'rgba(254, 240, 138, 0.3)',
                      backdropFilter: 'blur(6px)',
                      border: isAcquired ? '1px solid rgba(255,255,255,0.35)' : '1px solid #FDE047',
                      padding: '3px 8px',
                      borderRadius: '999px',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      color: isAcquired ? '#FFFFFF' : '#FEF08A',
                      textTransform: 'uppercase'
                    }}>
                      {isAcquired ? 'Cartilla Oficial' : 'Vista Previa • 0 Sellos'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.90rem', fontWeight: 800, marginBottom: '2px', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                    {selectedClient.name}
                  </div>
                  <div style={{ fontSize: '0.74rem', opacity: 0.9, fontWeight: 600, marginBottom: '14px' }}>
                    DNI: {selectedClient.docId} • Tarjeta: {card.id || `FID-${card.storeId}`}
                  </div>

                  {/* Indicador de Avance de Sellos (Sin QR redundante en la tarjeta) */}
                  <div style={{
                    padding: '12px 16px',
                    background: 'rgba(0, 0, 0, 0.22)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.22)',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.25rem' }}>⭐</span>
                      <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#FFFFFF' }}>
                        {mCurrentStamps} de {mTargetStamps} sellos
                      </span>
                    </div>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: mCurrentStamps >= mTargetStamps ? '#22C55E' : 'rgba(255,255,255,0.22)',
                      color: '#FFFFFF',
                      padding: '3px 9px',
                      borderRadius: '999px'
                    }}>
                      {mCurrentStamps >= mTargetStamps ? '¡Meta Completada! 🎉' : `Faltan ${Math.max(0, mTargetStamps - mCurrentStamps)} sellos`}
                    </span>
                  </div>

                  {/* Sellos y Catálogo de Premios de la Tienda */}
                  <div style={{
                    background: 'rgba(0,0,0,0.22)',
                    borderRadius: '16px',
                    padding: '12px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.72rem', fontWeight: 800 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Award size={14} color="#FDE047" />
                        <span>Premios en Cartilla ({sortedMRewards.length})</span>
                      </span>
                      <span style={{ color: '#FDE047' }}>
                        {mCurrentStamps} sellos acumulados
                      </span>
                    </div>

                    {/* Lista de premios con estado */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px', textAlign: 'left' }}>
                      {sortedMRewards.map((rew, i) => {
                        const canClaim = mCurrentStamps > 0 && Number(rew.stamps) > 0 && mCurrentStamps >= Number(rew.stamps) && isAcquired;
                        return (
                          <div key={rew.id || i} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: canClaim ? 'rgba(34, 197, 94, 0.25)' : 'rgba(255,255,255,0.1)',
                            border: canClaim ? '1px solid #86EFAC' : '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '8px',
                            padding: '5px 8px',
                            fontSize: '0.68rem'
                          }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{rew.icon || '🎁'}</span>
                              <strong style={{ color: canClaim ? '#FFFFFF' : 'rgba(255,255,255,0.85)' }}>
                                {rew.stamps} sellos: {rew.title}
                              </strong>
                            </span>
                            {canClaim ? (
                              <button
                                type="button"
                                onClick={() => handleRequestStampRewardClaim(card, rew)}
                                style={{
                                  background: '#22C55E',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '3px 8px',
                                  fontSize: '0.64rem',
                                  fontWeight: 900,
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <span>🎁 Canjear</span>
                              </button>
                            ) : (
                              <span style={{
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                color: 'rgba(255,255,255,0.6)',
                                textTransform: 'uppercase'
                              }}>
                                Meta: {rew.stamps} sellos
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {Array.from({ length: mTargetStamps }).map((_, idx) => {
                        const isStamped = idx < mCurrentStamps;
                        const isHito = sortedMRewards.find(r => Number(r.stamps) === (idx + 1));
                        return (
                          <div
                            key={idx}
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '50%',
                              background: isStamped ? '#FFFFFF' : 'rgba(255,255,255,0.16)',
                              border: isHito ? '2px solid #FDE047' : `1.5px solid ${isStamped ? '#FFFFFF' : 'rgba(255,255,255,0.4)'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: isStamped ? '0 3px 8px rgba(0,0,0,0.2)' : 'none',
                              position: 'relative'
                            }}
                          >
                            {isHito && (
                              <span style={{
                                position: 'absolute',
                                top: '-5px',
                                right: '-3px',
                                fontSize: '9px'
                              }}>
                                {isHito.icon || '🎁'}
                              </span>
                            )}
                            {isStamped ? (
                              renderStampIcon(card.stampIcon, 14, card.cardColor || '#9C382A')
                            ) : (
                              <span style={{ fontSize: '0.64rem', opacity: 0.8, fontWeight: 800 }}>
                                {idx + 1}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Solicitud de Canje Activa en Mostrador */}
                    {(() => {
                      const activeClaim = (redemptions || []).find(r =>
                        (r.clientId === selectedClient?.id || (selectedClient?.cedula && r.clientDocId && String(r.clientDocId) === String(selectedClient?.cedula))) &&
                        (r.storeId === card.storeId || (card.storeName && r.storeName && r.storeName.toLowerCase() === card.storeName.toLowerCase())) &&
                        r.status === 'PENDIENTE' &&
                        r.type === 'STAMP_REWARD_CLAIM'
                      );

                      if (activeClaim) {
                        return (
                          <div style={{
                            marginTop: '10px',
                            background: '#FEF3C7',
                            border: '1.5px solid #F59E0B',
                            borderRadius: '12px',
                            padding: '10px 12px',
                            color: '#92400E',
                            textAlign: 'center'
                          }}>
                            <div style={{ fontWeight: 900, fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              <Clock size={15} />
                              <span>¡Solicitud enviada al mostrador!</span>
                            </div>
                            <div style={{ fontSize: '0.74rem', marginTop: '3px' }}>
                              Dile al cajero que vas a retirar: <strong>{activeClaim.rewardTitle}</strong>
                            </div>
                            <div style={{ fontSize: '0.70rem', color: '#B45309', marginTop: '2px', fontFamily: 'monospace' }}>
                              Código de canje: <strong>{activeClaim.voucherCode || 'CANJE'}</strong>
                            </div>
                            <div style={{ fontSize: '0.66rem', color: '#92400E', marginTop: '4px', fontStyle: 'italic' }}>
                              Esperando aprobación del cajero en caja...
                            </div>
                          </div>
                        );
                      }

                      if (mUnlocked.length > 0 && isAcquired) {
                        const topReward = mUnlocked[mUnlocked.length - 1];
                        return (
                          <button
                            type="button"
                            onClick={() => handleRequestStampRewardClaim(card, topReward)}
                            style={{
                              marginTop: '10px',
                              width: '100%',
                              padding: '10px 14px',
                              borderRadius: '12px',
                              background: '#22C55E',
                              color: '#FFFFFF',
                              fontWeight: 900,
                              fontSize: '0.84rem',
                              border: 'none',
                              cursor: 'pointer',
                              boxShadow: '0 3px 10px rgba(34, 197, 94, 0.35)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <Gift size={16} />
                            <span>🎁 Solicitar Canje de Premio: {topReward.title}</span>
                          </button>
                        );
                      }

                      return null;
                    })()}
                  </div>

                  {isAcquired ? (
                    <p style={{ fontSize: '0.74rem', opacity: 0.9, lineHeight: 1.35, margin: '8px 0 0 0' }}>
                      Acumula sellos en <strong>{card.storeName}</strong> en cada visita indicando tu número de cédula en caja.
                    </p>
                  ) : (
                    <div style={{ marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => handleAcquireStoreCard(modalStore)}
                        className="btn"
                        style={{
                          width: '100%',
                          padding: '12px 18px',
                          borderRadius: '14px',
                          background: '#FFFFFF',
                          color: card.cardColor || 'var(--c-primary)',
                          fontSize: '0.90rem',
                          fontWeight: 800,
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 14px rgba(0,0,0,0.25)'
                        }}
                      >
                        <Plus size={16} />
                        <span>Adquirir Esta Tarjeta (0 sellos)</span>
                      </button>
                      <p style={{ fontSize: '0.70rem', opacity: 0.85, margin: '8px 0 0', textAlign: 'center' }}>
                        Se añadirá inmediatamente a tu lista de tarjetas sin ningún sello para comenzar a sumar.
                      </p>
                    </div>
                  )}
                </div>
              );
            })() : (
              /* Vista Clásica General Fidely Club */
              <div>
                {/* Modal Brand */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '14px' }}>
                  <img src="/fidely.png" alt="fidely" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800 }}>fidely</span>
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--c-primary)' }}>CLUB</span>
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '2px' }}>
                  {selectedClient.name}
                </h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--c-primary)', fontWeight: 700, marginBottom: '16px' }}>
                  {selectedClient.tier} • DNI: {selectedClient.docId}
                </div>

                {/* QR Code */}
                <div style={{
                  padding: '16px',
                  background: '#FAF8F5',
                  borderRadius: '20px',
                  display: 'inline-block',
                  border: '1.5px solid var(--border-subtle)',
                  marginBottom: '14px'
                }}>
                  <QRCodeDisplay
                    value={selectedClient.qrCode}
                    size={170}
                    darkColor="#9C382A"
                    lightColor="#FAF8F5"
                  />
                </div>

                {/* Points by store in modal */}
                <div style={{
                  background: '#F5EBE1',
                  padding: '14px',
                  borderRadius: '16px',
                  marginBottom: '16px',
                  textAlign: 'left'
                }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--c-primary)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
                    Tus Sellos por Comercio Aliado:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {allStores.map(st => {
                      const card = (selectedClient.loyaltyCards || []).find(c => c.storeId === st.id);
                      const stamps = card ? (card.currentStamps || 0) : 0;
                      const target = card ? (card.targetStamps || 10) : 10;
                      return (
                        <div key={st.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                          <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{st.name.replace('Sucursal ', '')}:</span>
                          <strong style={{ color: 'var(--c-primary)' }}>{stamps} / {target} Sellos</strong>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Presenta este código al cajero para registrar tus visitas, acumular sellos en tu tarjeta de fidelidad y canjear tus premios disponibles.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ESCANEAR QR DEL LOCAL Y CANJEAR (Activado desde el QR de Bottom Nav o Canjear) */}
      {showStoreScanModal && (
        <div className="modal-overlay" onClick={() => setShowStoreScanModal(false)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{
              padding: '20px 16px',
              borderRadius: '24px',
              maxWidth: '460px',
              width: '100%',
              background: '#FFFFFF',
              maxHeight: '92vh',
              overflowY: 'auto',
              overflowX: 'hidden',
              boxSizing: 'border-box'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '14px' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <span className="badge badge-accent" style={{ fontSize: '0.7rem', marginBottom: '4px' }}>
                  {scanStep === 1 && 'PASO 1 • ESCANEAR QR DE LA TIENDA'}
                  {scanStep === 2 && 'PASO 2 • CONFIRMAR SALDO PARA TU COMPRA'}
                  {scanStep === 3 && 'PASO 3 • SOLICITUD ENVIADA A LA TIENDA'}
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, wordBreak: 'break-word' }}>
                  {scanStep === 1 && 'Escanear QR de la Tienda'}
                  {scanStep === 2 && 'Sumar Puntos de Saldo a tu Compra'}
                  {scanStep === 3 && 'Esperando Aprobación de la Tienda'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowStoreScanModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0, padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* PASO 1: ESCANEAR QR DE LA TIENDA */}
            {scanStep === 1 && (() => {
              const currentStoreObj = allStores.find(s => s.id === scannedStoreId) || allStores[0] || { id: 'ONLINE', name: 'Tienda Oficial' };
              return (
                <div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.45 }}>
                    Apunta tu cámara al código QR exhibido en el mostrador o caja de <strong>{currentStoreObj.name}</strong> para validar tu visita, registrar sellos o consultar tus premios disponibles.
                  </p>

                  {/* Selector rápido de local comercial */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Tienda donde te encuentras:
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {allStores.map(st => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setScannedStoreId(st.id)}
                          style={{
                            padding: '6px 11px',
                            borderRadius: '8px',
                            border: scannedStoreId === st.id ? '2px solid var(--c-primary)' : '1px solid var(--border-subtle)',
                            background: scannedStoreId === st.id ? 'var(--c-secondary-soft)' : '#FFFFFF',
                            color: scannedStoreId === st.id ? 'var(--c-primary)' : 'var(--text-main)',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {st.name.replace('Sucursal ', '')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Visor de Cámara Real con QRCameraScanner */}
                  <div style={{ marginBottom: '14px' }}>
                    <QRCameraScanner
                      onScanSuccess={handleQrCodeScanned}
                      title="Escanear QR de Mostrador"
                      subtitle={`Apunta la cámara al código QR de ${currentStoreObj.name}`}
                      onNotify={onNotify}
                    />
                  </div>

                  {/* Acceso directo alternativo (Simulación rápida de prueba) */}
                  <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                    <button
                      type="button"
                      disabled={isScanningSimulation}
                      onClick={handleSimulateStoreQrScan}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      {isScanningSimulation ? 'Conectando con la tienda...' : `¿Sin cámara disponible? Seleccionar ${currentStoreObj.name}`}
                    </button>
                  </div>

                  {/* Acceso a tarjeta QR personal */}
                  <div style={{ textAlign: 'center', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowStoreScanModal(false);
                        setShowCardModal(true);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--c-primary)',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <QrCode size={13} />
                      <span>¿Quieres mostrar tu tarjeta de socio en caja? Ver mi QR</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* PASO 2: QR ESCANEADO -> MOSTRAR TARJETA DE SELLOS EN ESTE LOCAL */}
            {scanStep === 2 && (() => {
              const targetStore = allStores.find(s => s.id === scannedStoreId) || allStores[0] || { id: 'ONLINE', name: 'Tienda Oficial' };
              const storeCard = clientLoyaltyCards.find(c => c.storeId === targetStore.id) || {
                storeName: targetStore.name,
                currentStamps: 0,
                stampsTarget: targetStore.stampsTarget || 6,
                rewardTitle: targetStore.rewardTitle || 'Premio de Fidelidad'
              };
              const cur = Number(storeCard.currentStamps || 0);
              const tgt = Number(storeCard.stampsTarget || 6);
              const isReady = cur > 0 && tgt > 0 && cur >= tgt;

              return (
                <div>
                  {/* Badge de Verificación Exitosa de la Tienda */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    background: '#F0FDF4',
                    border: '1.5px solid #BBF7D0',
                    borderRadius: '14px',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: '#15803D',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      flexShrink: 0
                    }}>
                      <Check size={16} strokeWidth={3} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#14532D' }}>
                        ¡Tienda Verificada por QR!
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#166534' }}>
                        {targetStore.name} • Programa de Sellos
                      </div>
                    </div>
                  </div>

                  {/* TARJETA DESTACADA: SELLOS EN ESTE LOCAL */}
                  <div style={{
                    background: '#F5EBE1',
                    border: '1.5px solid var(--border-subtle)',
                    borderRadius: '20px',
                    padding: '18px 20px',
                    marginBottom: '16px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: 'var(--c-primary)',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      marginBottom: '4px'
                    }}>
                      TUS SELLOS EN {targetStore.name.replace('Sucursal ', '').toUpperCase()}
                    </div>

                    <div style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '2.5rem',
                      fontWeight: 800,
                      color: 'var(--c-primary)',
                      lineHeight: 1.1,
                      marginBottom: '4px'
                    }}>
                      {cur} / {tgt} <span style={{ fontSize: '1.1rem' }}>sellos</span>
                    </div>

                    <div style={{
                      fontSize: '0.94rem',
                      fontWeight: 800,
                      color: isReady ? '#15803D' : 'var(--text-main)',
                      marginTop: '6px'
                    }}>
                      {isReady ? `🎉 ¡Meta cumplida! Premio: ${storeCard.rewardTitle}` : `Meta: ${storeCard.rewardTitle} (Faltan ${tgt - cur} sellos)`}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    width: '100%',
                    boxSizing: 'border-box',
                    marginTop: '12px'
                  }}>
                    {isReady && (
                      <button
                        type="button"
                        onClick={() => {
                          handleRequestStampRewardClaim(storeCard, {
                            title: storeCard.rewardTitle,
                            stamps: tgt,
                            icon: '🎁'
                          });
                          setShowStoreScanModal(false);
                        }}
                        className="btn btn-primary"
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '13px 16px',
                          fontWeight: 800,
                          fontSize: '0.95rem',
                          background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                          border: 'none',
                          boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)'
                        }}
                      >
                        <Gift size={18} />
                        <span>🎁 Solicitar Canje de Premio</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setShowStoreScanModal(false);
                        setSelectedCardForModal(storeCard);
                        setShowCardModal(true);
                      }}
                      className="btn btn-primary"
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px 16px',
                        fontWeight: 800,
                        fontSize: '0.9rem'
                      }}
                    >
                      <QrCode size={18} />
                      <span>Mostrar mi QR al Cajero para recibir Sello</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setScanStep(1)}
                      className="btn btn-outline"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        fontSize: '0.84rem'
                      }}
                    >
                      Escanear Otro Código QR
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* PASO 3: SOLICITUD DE CANJE ENVIADA */}
            {scanStep === 3 && (() => {
              const targetStore = allStores.find(s => s.id === scannedStoreId) || allStores[0] || { id: 'ONLINE', name: 'Tienda Oficial' };
              return (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'var(--c-secondary-soft)',
                    border: '2px solid var(--c-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px',
                    color: 'var(--c-primary)'
                  }}>
                    <Clock size={32} />
                  </div>

                  <span className="badge badge-accent" style={{ marginBottom: '8px' }}>
                    SOLICITUD ENVIADA A LA TIENDA
                  </span>

                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px' }}>
                    Esperando Entrega en Caja
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: '18px' }}>
                    Tu solicitud apareció en la pantalla de la caja de <strong>{targetStore.name}</strong>. El cajero confirmará tus sellos para entregarte tu premio.
                  </p>

                  <button
                    type="button"
                    onClick={() => setShowStoreScanModal(false)}
                    className="btn btn-outline"
                    style={{
                      width: '100%',
                      margin: '0 auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '11px 14px',
                      fontSize: '0.84rem',
                      textAlign: 'center'
                    }}
                  >
                    Seguir navegando
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}


      {/* MODAL 3: ACTIVE VOUCHER QR */}
      {activeVoucherModal && (
        <div className="modal-overlay" onClick={() => setActiveVoucherModal(null)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{
              padding: '24px',
              borderRadius: '24px',
              maxWidth: '380px',
              textAlign: 'center',
              background: '#FFFFFF'
            }}
          >
            <button
              onClick={() => setActiveVoucherModal(null)}
              style={{
                position: 'absolute',
                right: '18px',
                top: '18px',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>

            <span className={`badge ${activeVoucherModal.status === 'APROBADO' || activeVoucherModal.status === 'USADO' ? 'badge-emerald' : 'badge-warning'}`} style={{ marginBottom: '8px' }}>
              {activeVoucherModal.status === 'APROBADO' || activeVoucherModal.status === 'USADO'
                ? '✓ PREMIO ENTREGADO EN CAJA'
                : 'PREMIO LISTO PARA CANJE'}
            </span>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '4px', color: '#15803D' }}>
              {activeVoucherModal.rewardTitle || (activeVoucherModal.nominalValueUsd ? `+US$${activeVoucherModal.nominalValueUsd?.toFixed(2)} de Saldo a Favor` : 'Premio de Fidelidad')}
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.4 }}>
              {activeVoucherModal.status === 'APROBADO' || activeVoucherModal.status === 'USADO'
                ? `El cajero de ${activeVoucherModal.storeName || 'la tienda'} ya aprobó y validó la entrega de este premio.`
                : `Muestra este código o QR en la caja de ${activeVoucherModal.storeName || 'la tienda'} para recibir tu premio.`}
            </p>

            <div style={{
              padding: '14px',
              background: '#FAF8F5',
              borderRadius: '16px',
              display: 'inline-block',
              border: '1px solid var(--border-subtle)',
              marginBottom: '12px'
            }}>
              <QRCodeDisplay
                value={activeVoucherModal.voucherCode}
                size={160}
                darkColor="#15803D"
                lightColor="#FAF8F5"
              />
            </div>

            <div style={{
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              padding: '8px 12px',
              borderRadius: '10px',
              fontFamily: 'monospace',
              fontWeight: 800,
              fontSize: '1.05rem',
              color: '#166534',
              marginBottom: '14px'
            }}>
              Ref: {activeVoucherModal.voucherCode}
            </div>

            <button
              type="button"
              onClick={() => setActiveVoucherModal(null)}
              className="btn btn-primary"
              style={{ width: '100%', fontWeight: 700 }}
            >
              Entendido, ¡Gracias!
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: CREAR CONTRASEÑA PARA LA APP MÓVIL */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'var(--c-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF'
                }}>
                  <Key size={18} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Clave para la App Móvil
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="btn btn-secondary"
                style={{ padding: '6px', borderRadius: '50%' }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.45 }}>
              Si te registraste en mostrador con Google, puedes definir una contraseña para iniciar sesión en la aplicación móvil de Conecta2 con tu correo.
            </p>

            {passwordErrorMessage && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: '#FEE2E2',
                border: '1px solid #FCA5A5',
                color: '#991B1B',
                fontSize: '0.80rem',
                marginBottom: '14px'
              }}>
                {passwordErrorMessage}
              </div>
            )}

            {passwordSuccessMessage && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: '#DCFCE7',
                border: '1px solid #86EFAC',
                color: '#15803D',
                fontSize: '0.82rem',
                fontWeight: 700,
                marginBottom: '14px'
              }}>
                {passwordSuccessMessage}
              </div>
            )}

            <form onSubmit={handleSetAppPassword}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '5px' }}>
                  Tu Correo Electrónico
                </label>
                <input
                  type="text"
                  disabled
                  value={selectedClient.email || ''}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                    background: '#F8FAFC',
                    fontSize: '0.86rem',
                    color: 'var(--text-main)'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '5px' }}>
                  Nueva Contraseña (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={appPasswordInput}
                  onChange={(e) => setAppPasswordInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--c-primary)',
                    fontSize: '0.90rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="btn btn-secondary"
                  style={{ padding: '9px 16px', fontSize: '0.82rem', borderRadius: '10px' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="btn btn-primary"
                  style={{ padding: '9px 18px', fontSize: '0.82rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {isUpdatingPassword ? <Loader2 size={15} className="spin" /> : <Lock size={15} />}
                  <span>{isUpdatingPassword ? 'Guardando...' : 'Guardar Contraseña'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR MI PERFIL (CÉDULA, TELÉFONO, NOMBRE, CUMPLEAÑOS) */}
      {showEditProfileModal && (
        <div className="modal-overlay" onClick={() => setShowEditProfileModal(false)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{
              padding: '24px',
              borderRadius: '20px',
              maxWidth: '460px',
              width: '100%',
              background: '#FFFFFF',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'var(--c-primary-soft)',
                  color: 'var(--c-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <User size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    Mi Perfil de Socio
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Tus datos para acumular sellos y premios en caja
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditProfileModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.80rem', fontWeight: 700, marginBottom: '4px', color: 'var(--text-main)' }}>
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="form-input"
                  placeholder="Ej. Pedro Pérez"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.80rem', fontWeight: 700, marginBottom: '4px', color: 'var(--text-main)' }}>
                  Cédula de Identidad (DNI) *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.docId}
                  onChange={(e) => setProfileForm({ ...profileForm, docId: e.target.value })}
                  className="form-input"
                  placeholder="Ej. V-12345678 o 12345678"
                  style={{
                    borderColor: (!profileForm.docId || profileForm.docId.length === 8 && !/^\d+$/.test(profileForm.docId)) ? '#F59E0B' : undefined
                  }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px', display: 'block' }}>
                  Indica tu número de cédula real. El cajero de la tienda te pedirá este número para sumar sellos a tu cuenta.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.80rem', fontWeight: 700, marginBottom: '4px', color: 'var(--text-main)' }}>
                  Teléfono Celular / WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="form-input"
                  placeholder="Ej. +58 412 1234567"
                  style={{
                    borderColor: (!profileForm.phone || profileForm.phone.includes('0000000')) ? '#F59E0B' : undefined
                  }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.80rem', fontWeight: 700, marginBottom: '4px', color: 'var(--text-main)' }}>
                  Fecha de Cumpleaños (Opcional)
                </label>
                <input
                  type="date"
                  value={profileForm.birthDate}
                  onChange={(e) => setProfileForm({ ...profileForm, birthDate: e.target.value })}
                  className="form-input"
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px', display: 'block' }}>
                  🎂 Recibirás promociones y sellos dobles exclusivos en el mes de tu cumpleaños.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '10px 16px', borderRadius: '12px' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '10px 18px', borderRadius: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  {isSavingProfile ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
                  <span>{isSavingProfile ? 'Guardando...' : 'Guardar Perfil'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION DOCK (Ultra-Premium Floating Glassmorphic Island) */}
      <div className="client-bottom-dock-wrapper">
        <nav
          className="client-bottom-nav"
          role="navigation"
          aria-label="Navegación principal móvil"
        >
          {/* 1. Inicio */}
          <button
            type="button"
            className={`client-nav-item ${activeTab === 'INICIO' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveTab('INICIO');
              setIsViewingAllCards(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            aria-label="Ir a Inicio"
          >
            <div className="client-nav-icon-wrap">
              <Home
                size={22}
                strokeWidth={activeTab === 'INICIO' ? 2.4 : 1.85}
                color={activeTab === 'INICIO' ? 'var(--c-primary)' : '#8C827A'}
              />
            </div>
            <span className="client-nav-label">Inicio</span>
            <span className="client-nav-indicator" />
          </button>

          {/* 2. Promociones */}
          <button
            type="button"
            className={`client-nav-item ${activeTab === 'PROMOCIONES' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveTab('PROMOCIONES');
              setIsViewingAllCards(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            aria-label="Ver Promociones"
          >
            <div className="client-nav-icon-wrap">
              <TicketPercent
                size={22}
                strokeWidth={activeTab === 'PROMOCIONES' ? 2.4 : 1.85}
                color={activeTab === 'PROMOCIONES' ? 'var(--c-primary)' : '#8C827A'}
              />
              {eligiblePromotions.length > 0 && (
                <span className="client-nav-badge" style={{ background: '#16A34A' }}>
                  {eligiblePromotions.length}
                </span>
              )}
            </div>
            <span className="client-nav-label">Promos</span>
            <span className="client-nav-indicator" />
          </button>

          {/* 3. Tiendas */}
          <button
            type="button"
            className={`client-nav-item ${activeTab === 'TIENDAS' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveTab('TIENDAS');
              setIsViewingAllCards(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            aria-label="Ver Tiendas"
          >
            <div className="client-nav-icon-wrap">
              <Store
                size={22}
                strokeWidth={activeTab === 'TIENDAS' ? 2.4 : 1.85}
                color={activeTab === 'TIENDAS' ? 'var(--c-primary)' : '#8C827A'}
              />
              {approvedStores.length > 0 && (
                <span className="client-nav-badge">
                  {approvedStores.length}
                </span>
              )}
            </div>
            <span className="client-nav-label">Tiendas</span>
            <span className="client-nav-indicator" />
          </button>

          {/* 3. Center Elevated Action Button: Escanear QR del Local */}
          <div className="client-nav-center-slot">
            <button
              type="button"
              className="client-nav-qr-trigger"
              onClick={() => handleOpenStoreQrScanner()}
              title="Escanear QR en Tienda para Canjear"
              aria-label="Escanear QR de la Tienda"
            >
              <div className="client-nav-qr-inner">
                <QrCode size={25} color="#FFFFFF" strokeWidth={2.4} />
              </div>
            </button>
          </div>

          {/* 4. Recompensas */}
          <button
            type="button"
            className={`client-nav-item ${activeTab === 'RECOMPENSAS' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveTab('RECOMPENSAS');
              setIsViewingAllCards(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            aria-label="Ver Recompensas"
          >
            <div className="client-nav-icon-wrap">
              <Gift
                size={22}
                strokeWidth={activeTab === 'RECOMPENSAS' ? 2.4 : 1.85}
                color={activeTab === 'RECOMPENSAS' ? 'var(--c-primary)' : '#8C827A'}
              />
              {clientVouchers.length > 0 && (
                <span className="client-nav-badge">
                  {clientVouchers.length}
                </span>
              )}
            </div>
            <span className="client-nav-label">Premios</span>
            <span className="client-nav-indicator" />
          </button>

          {/* 5. Actividad */}
          <button
            type="button"
            className={`client-nav-item ${activeTab === 'ACTIVIDAD' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveTab('ACTIVIDAD');
              setIsViewingAllCards(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            aria-label="Ver Actividad"
          >
            <div className="client-nav-icon-wrap">
              <History
                size={22}
                strokeWidth={activeTab === 'ACTIVIDAD' ? 2.4 : 1.85}
                color={activeTab === 'ACTIVIDAD' ? 'var(--c-primary)' : '#8C827A'}
              />
            </div>
            <span className="client-nav-label">Actividad</span>
            <span className="client-nav-indicator" />
          </button>
        </nav>
      </div>

      {/* Modal de Regalo de Cumpleaños 🎂 */}
      {showBirthdayModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            maxWidth: '400px',
            width: '100%',
            padding: '26px 24px',
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.22)',
            border: '1px solid rgba(222, 139, 118, 0.35)',
            textAlign: 'center',
            position: 'relative'
          }}>
            <button
              type="button"
              onClick={() => {
                setBirthdayDismissedSession(true);
                setShowBirthdayModal(false);
                setBirthdayStep('FORM');
              }}
              aria-label="Cerrar"
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: '#F5F5F4',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#78716C'
              }}
            >
              <X size={16} />
            </button>

            {birthdayStep === 'SUCCESS_CATALOG' ? (
              <div style={{ textAlign: 'center', padding: '6px 0 2px' }}>
                <div style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '22px',
                  background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
                  border: '2px solid #10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '34px',
                  margin: '0 auto 14px auto',
                  boxShadow: '0 8px 22px rgba(16, 185, 129, 0.22)'
                }}>
                  🏪
                </div>

                <span style={{
                  display: 'inline-block',
                  fontSize: '0.70rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  background: '#DCFCE7',
                  color: '#15803D',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  marginBottom: '10px'
                }}>
                  ¡Cumpleaños Guardado! 🎂
                </span>

                <h3 style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.3rem',
                  fontWeight: 900,
                  color: '#1C1917',
                  margin: '0 0 10px 0'
                }}>
                  Explora las Tiendas Aliadas
                </h3>

                <p style={{
                  fontSize: '0.86rem',
                  color: '#57534E',
                  lineHeight: 1.5,
                  margin: '0 0 22px 0'
                }}>
                  ¡Tu fecha especial quedó registrada! Ahora ve al <strong>catálogo de tiendas</strong> para conocer los comercios asociados, <strong>elegir y adquirir tus tarjetas de fidelización</strong> gratis y comenzar a acumular sellos con tus consumos.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setShowBirthdayModal(false);
                    setBirthdayStep('FORM');
                    setActiveTab('TIENDAS');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  style={{
                    width: '100%',
                    padding: '13px 18px',
                    borderRadius: '14px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #70092B 0%, #9C382A 100%)',
                    color: '#FFFFFF',
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 8px 20px rgba(112, 9, 43, 0.28)'
                  }}
                >
                  <Store size={18} />
                  <span>Ir al Catálogo de Tiendas</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>→</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowBirthdayModal(false);
                    setBirthdayStep('FORM');
                  }}
                  style={{
                    width: '100%',
                    marginTop: '10px',
                    background: 'transparent',
                    border: 'none',
                    color: '#78716C',
                    fontSize: '0.80rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '6px'
                  }}
                >
                  Ver mi inicio por ahora
                </button>
              </div>
            ) : (
              <>
                <div style={{
                  width: '62px',
                  height: '62px',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                  border: '2px solid #F59E0B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '30px',
                  margin: '0 auto 14px auto',
                  boxShadow: '0 8px 20px rgba(245, 158, 11, 0.22)'
                }}>
                  🎂
                </div>

                <span style={{
                  display: 'inline-block',
                  fontSize: '0.70rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  background: 'rgba(156, 56, 42, 0.1)',
                  color: 'var(--c-primary, #9C382A)',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  marginBottom: '8px'
                }}>
                  Beneficio Exclusivo de Socio
                </span>

                <h3 style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.3rem',
                  fontWeight: 900,
                  color: '#1C1917',
                  margin: '0 0 8px 0'
                }}>
                  ¿Cuándo es tu cumpleaños?
                </h3>

                <p style={{
                  fontSize: '0.86rem',
                  color: '#57534E',
                  lineHeight: 1.45,
                  margin: '0 0 18px 0'
                }}>
                  Agrega tu fecha de nacimiento para enviarte <strong>regalos, cupones y premios especiales</strong> de tus comercios favoritos en tu día.
                </p>

                <form onSubmit={handleSaveBirthday}>
                  <div style={{ marginBottom: '16px', textAlign: 'left' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      color: '#44403C',
                      marginBottom: '6px'
                    }}>
                      Fecha de Nacimiento 🎁
                    </label>
                    <input
                      type="date"
                      required
                      value={birthdayInput}
                      onChange={(e) => setBirthdayInput(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        border: '1.5px solid #E7E5E4',
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        color: '#1C1917',
                        background: '#FAFAF9',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingBirthday || !birthdayInput}
                    style={{
                      width: '100%',
                      padding: '13px 18px',
                      borderRadius: '14px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #DE8B76 0%, #9C382A 100%)',
                      color: '#FFFFFF',
                      fontSize: '0.92rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 8px 20px rgba(156, 56, 42, 0.28)'
                    }}
                  >
                    {isSavingBirthday ? (
                      <>
                        <Loader2 size={18} className="spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <Gift size={18} />
                        <span>Guardar mi cumpleaños</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Responsive Stylesheet */}
      <style>{`
        .client-portal-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
        }

        .client-desktop-tabs {
          display: none !important;
        }

        .client-main-container {
          padding-bottom: 110px !important;
        }

        .client-bottom-dock-wrapper {
          display: flex !important;
          position: fixed;
          bottom: max(14px, env(safe-area-inset-bottom));
          left: 14px;
          right: 14px;
          justify-content: center;
          z-index: 950;
          pointer-events: none;
        }

        @keyframes qrAuraGlow {
          0%, 100% {
            box-shadow: 0 10px 24px -2px rgba(156, 56, 42, 0.45), 
                        0 0 0 1px rgba(184, 93, 67, 0.15), 
                        0 0 0 4px #FFFFFF,
                        inset 0 1px 2px rgba(255, 255, 255, 0.55);
            transform: translateY(0);
          }
          50% {
            box-shadow: 0 14px 30px 0px rgba(156, 56, 42, 0.62), 
                        0 0 0 4.5px rgba(217, 130, 108, 0.28), 
                        0 0 0 4px #FFFFFF,
                        inset 0 1px 2px rgba(255, 255, 255, 0.7);
            transform: translateY(-2px);
          }
        }

        @keyframes dotPulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.3); opacity: 1; }
        }

        .client-bottom-nav {
            pointer-events: auto;
            width: 100%;
            max-width: 440px;
            height: 64px;
            background: rgba(255, 255, 255, 0.88);
            backdrop-filter: blur(28px) saturate(180%);
            -webkit-backdrop-filter: blur(28px) saturate(180%);
            border-radius: 28px;
            border: 1px solid rgba(255, 255, 255, 0.85);
            box-shadow: 0 16px 36px -6px rgba(44, 24, 16, 0.16),
                        0 4px 12px rgba(0, 0, 0, 0.04),
                        0 0 0 1px rgba(184, 93, 67, 0.08),
                        inset 0 1px 1px rgba(255, 255, 255, 0.95);
            display: flex;
            align-items: center;
            justify-content: space-around;
            padding: 4px 8px;
          }

          .client-nav-item {
            background: none;
            border: none;
            display: flex;
            flex-direction: column;
            align-items: center;
            justifyContent: center;
            flex: 1;
            padding: 4px 2px;
            cursor: pointer;
            outline: none;
            -webkit-tap-highlight-color: transparent;
            user-select: none;
            transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative;
          }

          .client-nav-item:active {
            transform: scale(0.90);
          }

          .client-nav-icon-wrap {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          }

          .client-nav-item.is-active .client-nav-icon-wrap {
            transform: translateY(-1px);
          }

          .client-nav-label {
            font-size: 0.65rem;
            font-weight: 550;
            color: #8C827A;
            margin-top: 2px;
            letter-spacing: -0.01em;
            transition: color 0.2s ease, font-weight 0.2s ease;
          }

          .client-nav-item.is-active .client-nav-label {
            color: var(--c-primary, #9C382A);
            font-weight: 750;
          }

          .client-nav-indicator {
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: transparent;
            margin-top: 2px;
            transition: all 0.22s ease;
          }

          .client-nav-item.is-active .client-nav-indicator {
            background: var(--c-primary, #9C382A);
            box-shadow: 0 1px 4px rgba(156, 56, 42, 0.5);
            animation: dotPulse 2.4s infinite ease-in-out;
          }

          .client-nav-badge {
            position: absolute;
            top: -5px;
            right: -10px;
            min-width: 17px;
            height: 17px;
            padding: 0 4px;
            border-radius: 9px;
            background: linear-gradient(135deg, #C2674F 0%, #9C382A 100%);
            color: #FFFFFF;
            font-size: 0.60rem;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #FFFFFF;
            box-shadow: 0 2px 7px rgba(156, 56, 42, 0.38);
            letter-spacing: -0.02em;
          }

          .client-nav-center-slot {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .client-nav-qr-trigger {
            background: none;
            border: none;
            padding: 0;
            cursor: pointer;
            outline: none;
            -webkit-tap-highlight-color: transparent;
            margin-top: -26px;
            transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          }

          .client-nav-qr-trigger:active {
            transform: scale(0.92) !important;
          }

          .client-nav-qr-inner {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: linear-gradient(135deg, #DE8B76 0%, #B85D43 45%, #9C382A 100%);
            border: 3.5px solid #FFFFFF;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: qrAuraGlow 3.5s infinite ease-in-out;
            transition: filter 0.2s ease;
          }

          .client-nav-qr-inner:hover {
            filter: brightness(1.06);
          }
      `}</style>
    </div>
  );
}
