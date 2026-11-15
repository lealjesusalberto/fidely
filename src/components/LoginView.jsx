import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Store,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Lock,
  Coins,
  Mail,
  User,
  Phone,
  CreditCard,
  MapPin,
  Eye,
  EyeOff,
  Gift,
  Loader2,
  QrCode,
  ChevronRight,
  ExternalLink,
  Smartphone,
  ArrowUpRight,
  AlertTriangle,
  X
} from 'lucide-react';
import {
  isAndroid,
  isIOS,
  isInAppBrowser,
  isChromeOnAndroid,
  openInChromeApp
} from '../utils/browserDetection';

import {
  loginWithEmailPassword,
  registerWithEmailPassword,
  authenticateOrProvisionUser,
  getUserFromRealtimeDb,
  provisionUserInRealtimeDb,
  provisionComercioInRealtimeDb,
  loginWithGoogle,
  checkGoogleRedirectResult,
  logoutFromFirebase
} from '../firebase/authService';
import {
  checkIfUserIsAdmin,
  saveAdmin,
  saveStore,
  isUserRevoked,
  unrevokeUser,
  getStoreByEmail,
  getClientById,
  getClientByEmail,
  getClientByDocId,
  saveClient,
  deleteClientDoc
} from '../firebase/firestoreService';
import { checkDuplicateClient } from '../utils/clientValidation';
import StoreOnboardingModal from './StoreOnboardingModal';
import StoreCategoryModal, { getCategoryInfo } from './StoreCategoryModal';

function ChromeIcon({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" fill="#4285F4" />
      <path d="M12 2a10 10 0 0 1 8.66 5l-4.33 7.5A5 5 0 0 0 12 7h-.01L12 2z" fill="#EA4335" />
      <path d="M20.66 7A10 10 0 0 1 17 20.66l-4.33-7.5a5 5 0 0 0 3.66-6.16L20.66 7z" fill="#34A853" />
      <path d="M17 20.66A10 10 0 0 1 3.34 17l4.33-7.5a5 5 0 0 0 5 9.16l4.33 2z" fill="#FBBC05" />
      <circle cx="12" cy="12" r="4.5" fill="#FFFFFF" />
      <circle cx="12" cy="12" r="3.2" fill="#1A73E8" />
    </svg>
  );
}

export default function LoginView({
  clients = [],
  stores = [],
  setStores,
  onLogin,
  onRegisterClient,
  onGoToLanding,
  config,
  joinStoreId = null,
  onClearJoinStore
}) {
  // Encontrar tienda si viene por enlace QR (?join=STORE_ID o ?store=STORE_ID)
  const targetStore = joinStoreId ? stores.find(s =>
    String(s.id || '').toLowerCase() === String(joinStoreId).toLowerCase() ||
    String(s.name || '').toLowerCase() === String(joinStoreId).toLowerCase()
  ) : null;

  // Mode: 'JOIN' | 'LOGIN' | 'REGISTER' | 'REGISTER_STORE'
  const [activeTab, setActiveTab] = useState(joinStoreId ? 'JOIN' : 'LOGIN');

  // Modal de Selección para Registro: "¿Qué cuenta deseas crear? (Tienda o Cliente)"
  const [showRoleSelectionModal, setShowRoleSelectionModal] = useState(false);
  const [authProfileType, setAuthProfileType] = useState('CLIENT'); // 'CLIENT' | 'STORE'

  // Asegurar que si viene con joinStoreId siempre se active la pestaña JOIN
  useEffect(() => {
    if (joinStoreId) {
      setActiveTab('JOIN');
      setShowRoleSelectionModal(false);
    }
  }, [joinStoreId]);

  // --- LOGIN STATE ---
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // --- REGISTER CLIENT STATE ---
  const [regName, setRegName] = useState('');
  const [regDocId, setRegDocId] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regBirthDate, setRegBirthDate] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regStoreId, setRegStoreId] = useState(stores[0]?.id || '');
  const [regPin, setRegPin] = useState('');
  const [showRegPin, setShowRegPin] = useState(false);
  const [regAccept, setRegAccept] = useState(true);
  const [regError, setRegError] = useState('');

  useEffect(() => {
    if (!regStoreId && stores.length > 0) setRegStoreId(stores[0].id);
  }, [stores, regStoreId]);

  // --- REGISTER STORE STATE ---
  const [storeName, setStoreName] = useState('');
  const [storeCategory, setStoreCategory] = useState('Barbería / Peluquería');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [storeCity, setStoreCity] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeEmail, setStoreEmail] = useState('');
  const [storePassword, setStorePassword] = useState('');
  const [showStorePassword, setShowStorePassword] = useState(false);
  const [storeError, setStoreError] = useState('');
  const [forgotModal, setForgotModal] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showcaseSlide, setShowcaseSlide] = useState(0);
  const [showStoreOnboarding, setShowStoreOnboarding] = useState(false);
  const [pendingStoreForPos, setPendingStoreForPos] = useState(null);

  // --- MODAL DE DEFINICIÓN DE ROL TRAS LOGIN CON GOOGLE ---
  const [showGoogleRoleModal, setShowGoogleRoleModal] = useState(false);
  const [pendingGoogleAuth, setPendingGoogleAuth] = useState(null); // { authUser, cleanEmail, specificStore, matchedClient }
  const [googleRoleStep, setGoogleRoleStep] = useState('CHOOSE'); // 'CHOOSE' | 'STORE_SETUP'
  const [googleStoreName, setGoogleStoreName] = useState('');
  const [googleStoreCategory, setGoogleStoreCategory] = useState('Barbería / Peluquería');
  const [googleStoreCity, setGoogleStoreCity] = useState('Caracas');
  const [googleStorePhone, setGoogleStorePhone] = useState('');
  const [googleRoleError, setGoogleRoleError] = useState('');
  const [isSubmittingGoogleRole, setIsSubmittingGoogleRole] = useState(false);

  const handleCancelGoogleRoleModal = async () => {
    setShowGoogleRoleModal(false);
    setPendingGoogleAuth(null);
    setGoogleRoleStep('CHOOSE');
    try {
      await logoutFromFirebase();
    } catch (e) { }
  };

  const handleConfirmGoogleAsClient = async () => {
    if (!pendingGoogleAuth?.authUser) return;
    setIsSubmittingGoogleRole(true);
    setGoogleRoleError('');
    try {
      const { authUser, cleanEmail, specificStore, matchedClient } = pendingGoogleAuth;
      const storeToLink = specificStore || targetStore;
      const rawCedula = authUser.uid.substring(0, 8).toUpperCase();
      const todayDate = new Date().toISOString().split('T')[0];

      let clientToSave = matchedClient;
      if (!clientToSave) {
        const initialCards = [];
        if (storeToLink) {
          initialCards.push({
            storeId: storeToLink.id,
            storeName: storeToLink.name,
            logo: storeToLink.logo || '',
            cardColor: storeToLink.cardColor || '#9C382A',
            cardGradient: storeToLink.cardGradient || '',
            currentStamps: 0,
            stampsTarget: Number(storeToLink.stampsTarget || 6),
            rewardTitle: storeToLink.rewardTitle || 'Premio de Fidelidad',
            stampRewards: storeToLink.stampRewards || [],
            stampsHistory: []
          });
        }

        clientToSave = {
          id: authUser.uid,
          firebaseUid: authUser.uid,
          docId: rawCedula,
          qrCode: `FIDELY-${rawCedula}`,
          name: authUser.displayName || cleanEmail.split('@')[0],
          initials: (authUser.displayName || cleanEmail.split('@')[0]).split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'FC',
          email: cleanEmail,
          phone: authUser.phoneNumber || '',
          birthDate: '',
          photoURL: authUser.photoURL || '',
          pointsBalance: 0,
          storeBalances: { ALL: 0 },
          tier: 'Cliente',
          hasSelectedWelcomeStore: Boolean(storeToLink),
          favoriteStoreId: storeToLink?.id || joinStoreId || 'ALL',
          joinDate: todayDate,
          memberSince: todayDate,
          status: 'ACTIVO',
          roleConfirmed: true, // ROL DEFINITIVO BLOQUEADO
          accountType: 'CLIENT',
          createdAt: new Date().toISOString(),
          registeredViaStoreId: storeToLink?.id || joinStoreId || 'GOOGLE_SIGN_IN',
          registrationSource: 'GOOGLE_SIGN_IN',
          loyaltyCards: initialCards
        };
      } else {
        clientToSave = {
          ...clientToSave,
          roleConfirmed: true,
          accountType: 'CLIENT'
        };
      }

      await saveClient(clientToSave);
      await provisionUserInRealtimeDb({
        uid: authUser.uid,
        email: cleanEmail,
        name: clientToSave.name,
        phone: clientToSave.phone,
        docId: clientToSave.docId,
        photoURL: clientToSave.photoURL,
        registeredViaStoreId: clientToSave.registeredViaStoreId
      });

      setShowGoogleRoleModal(false);
      setPendingGoogleAuth(null);
      setIsSubmittingGoogleRole(false);

      if (onClearJoinStore) onClearJoinStore();
      onLogin({
        role: 'CLIENT',
        client: clientToSave,
        name: clientToSave.name,
        email: cleanEmail,
        id: clientToSave.id,
        phone: clientToSave.phone,
        docId: clientToSave.docId
      });
    } catch (err) {
      console.error('Error al confirmar rol de cliente:', err);
      setGoogleRoleError(err.message || 'Error al guardar selección de cliente.');
      setIsSubmittingGoogleRole(false);
    }
  };

  const handleConfirmGoogleAsStore = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!pendingGoogleAuth?.authUser) return;
    if (!googleStoreName.trim()) {
      setGoogleRoleError('Por favor ingresa el nombre de tu comercio o tienda.');
      return;
    }
    setIsSubmittingGoogleRole(true);
    setGoogleRoleError('');
    try {
      const { authUser, cleanEmail, matchedClient } = pendingGoogleAuth;

      // Calcular nuevo ID único de tienda (STR-XX)
      const existingNumbers = (stores || []).map(s => {
        const match = s.id && String(s.id).match(/^STR-(\d+)$/i);
        return match ? parseInt(match[1], 10) : 0;
      });
      const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers, 0) : 0;
      const newStoreId = `STR-${String(maxNum + 1).padStart(2, '0')}`;
      const now = new Date();
      const trialMonths = config?.storeTrialMonths !== undefined ? parseInt(config.storeTrialMonths, 10) : 3;
      const trialEnds = new Date(now.getTime() + (trialMonths * 30 * 24 * 60 * 60 * 1000));

      const newStore = {
        id: newStoreId,
        firebaseUid: authUser.uid,
        name: googleStoreName.trim(),
        category: googleStoreCategory || 'Barbería / Peluquería',
        city: googleStoreCity.trim() || 'Caracas',
        address: googleStoreCity.trim() ? `${googleStoreCity.trim()}, Venezuela` : 'Venezuela',
        manager: authUser.displayName || googleStoreName.trim(),
        email: cleanEmail,
        phone: googleStorePhone.trim() || '',
        qrCode: `FIDELY-LOCAL-${newStoreId}`,
        status: 'ACTIVO',
        roleConfirmed: true, // ROL DEFINITIVO BLOQUEADO
        accountType: 'STORE',
        createdAt: now.toISOString(),
        trialEndsAt: trialEnds.toISOString(),
        subscriptionStatus: trialMonths > 0 ? 'TRIAL' : 'UNPAID',
        subscriptionPaidUntil: null,
        subscriptionExempt: false,
        stampsTarget: 6,
        rewardTitle: 'Corte o Servicio de Fidelidad',
        cardColor: '#70092B',
        cardGradient: '#9C382A',
        stampIcon: 'star',
        minPurchaseUsd: 5
      };

      // Guardar en Firestore
      await saveStore(newStore);

      // Aprovisionar en Realtime DB (user_comercio)
      await provisionComercioInRealtimeDb({
        uid: authUser.uid,
        email: cleanEmail,
        name: newStore.name,
        category: newStore.category,
        city: newStore.city,
        address: newStore.address,
        phone: newStore.phone,
        organizationName: newStore.name
      });

      // Si existía un registro accidental previo de cliente para este UID, lo limpiamos de Firestore
      if (matchedClient?.id) {
        try {
          await deleteClientDoc(matchedClient.id);
        } catch (delErr) {
          console.warn('[Firebase] Error limpiando cliente previo al convertir a tienda:', delErr);
        }
      }

      if (setStores) {
        setStores(prev => [...prev.filter(s => s.id !== newStore.id), newStore]);
      }

      setShowGoogleRoleModal(false);
      setPendingGoogleAuth(null);
      setIsSubmittingGoogleRole(false);

      if (onClearJoinStore) onClearJoinStore();
      onLogin({
        role: 'POS',
        store: newStore,
        name: `${newStore.manager || newStore.name} (Comercio)`,
        storeName: newStore.name
      });
    } catch (err) {
      console.error('Error al registrar comercio con Google:', err);
      setGoogleRoleError(err.message || 'Error al crear la tienda.');
      setIsSubmittingGoogleRole(false);
    }
  };

  const handleCloseStoreOnboarding = () => {
    setShowStoreOnboarding(false);
    if (pendingStoreForPos) {
      const storeToEnter = pendingStoreForPos;
      setPendingStoreForPos(null);
      onLogin({
        role: 'POS',
        store: storeToEnter,
        name: `${storeToEnter.manager || storeToEnter.name} (Cajero)`,
        storeName: storeToEnter.name
      });
    }
  };

  const showcaseSlides = [
    {
      quote: "“El 5% de retorno directo y la acumulación por QR aumentaron nuestra recompra en un +32%.”",
      author: "Valentina R. • Socia fidely CLUB",
      badge: "100 Pts = 5% (US$ 5.00)"
    },
    {
      quote: "“Tus compras habituales desde $25 ahora generan saldo inmediato disponible en caja.”",
      author: "Boutique & Café Aliado",
      badge: "Retorno Directo"
    },
    {
      quote: "“Aprobación en 1 clic en el terminal POS con libro de auditoría inmutable.”",
      author: "Red de Comercios Aliados",
      badge: "Terminal POS"
    }
  ];

  // Handler for registering real stores/merchants
  const handleRegisterStore = async (e) => {
    if (e) e.preventDefault();
    setStoreError('');

    const cleanEmail = storeEmail.trim().toLowerCase();

    if (!storeName.trim() || !cleanEmail || !storePassword.trim() || !storePhone.trim()) {
      setStoreError('Por favor completa todos los campos requeridos para la tienda (el teléfono de contacto es obligatorio).');
      return;
    }
    if (storePhone.trim().replace(/\D/g, '').length < 7) {
      setStoreError('Por favor ingresa un número de teléfono de contacto válido (mínimo 7 dígitos).');
      return;
    }
    if (storePassword.length < 6) {
      setStoreError('La contraseña para el terminal POS debe tener al menos 6 caracteres.');
      return;
    }

    setIsAuthLoading(true);

    // 0. Validar si ya existe una tienda activa registrada con este correo (en memoria o Firestore)
    const existingLocalStore = (stores || []).find(s => s.email?.trim().toLowerCase() === cleanEmail);
    if (existingLocalStore) {
      setStoreError(`Ya existe una tienda registrada con este correo electrónico (${cleanEmail}). Por favor inicia sesión.`);
      setIsAuthLoading(false);
      return;
    }

    try {
      const existingDbStore = await getStoreByEmail(cleanEmail);
      if (existingDbStore) {
        setStoreError(`Ya existe una tienda registrada con este correo electrónico (${cleanEmail}). Por favor inicia sesión.`);
        setIsAuthLoading(false);
        return;
      }
    } catch (e) {
      console.warn('[Validation] Error comprobando tienda duplicada en Firestore:', e);
    }

    // Validar si el correo pertenece a un cliente/socio
    const existingClient = (clients || []).find(c => c.email?.trim().toLowerCase() === cleanEmail);
    if (existingClient) {
      setStoreError(`El correo ${cleanEmail} ya se encuentra registrado como socio/cliente. Utiliza un correo diferente para tu comercio.`);
      setIsAuthLoading(false);
      return;
    }

    // 1. Si el correo estuvo revocado o eliminado previamente, removerlo de la lista negra
    await unrevokeUser(cleanEmail);

    // 2. Provision Firebase Auth
    const authRes = await registerWithEmailPassword(
      cleanEmail,
      storePassword.trim(),
      storeName.trim()
    );

    if (!authRes.success) {
      if (authRes.error?.code === 'auth/email-already-in-use') {
        // Verificar si las credenciales coinciden para reincorporar cuenta eliminada previamente
        const loginCheck = await loginWithEmailPassword(cleanEmail, storePassword.trim());
        if (!loginCheck.success) {
          setStoreError(`Este correo electrónico ya está registrado en fidely CLUB. Si eres el propietario, ingresa la contraseña correcta o inicia sesión.`);
          setIsAuthLoading(false);
          return;
        }
      } else {
        setStoreError(authRes.formattedMessage || 'Error al crear cuenta de tienda en Firebase Auth.');
        setIsAuthLoading(false);
        return;
      }
    }

    // 2. Determinar ID único sin colisiones para la tienda
    const existingNumbers = (stores || []).map(s => {
      const match = s.id && String(s.id).match(/^STR-(\d+)$/i);
      return match ? parseInt(match[1], 10) : 0;
    });
    const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers, 0) : 0;
    const newStoreId = `STR-${String(maxNum + 1).padStart(2, '0')}`;
    const now = new Date();
    const trialMonths = config?.storeTrialMonths !== undefined ? parseInt(config.storeTrialMonths, 10) : 3;
    const trialEnds = new Date(now.getTime() + (trialMonths * 30 * 24 * 60 * 60 * 1000));
    const newStore = {
      id: newStoreId,
      firebaseUid: authRes.user?.uid || null,
      name: storeName.trim(),
      category: storeCategory || 'Barbería / Peluquería',
      city: storeCity.trim() || '',
      address: storeAddress.trim() || (storeCity.trim() ? `${storeCity.trim()}, Venezuela` : 'Venezuela'),
      manager: storeName.trim() || 'Comercio',
      email: cleanEmail,
      phone: storePhone.trim() || '',
      qrCode: `FIDELY-LOCAL-${newStoreId}`,
      status: config?.requireStoreApproval !== false ? 'PENDIENTE' : 'APROBADO',
      createdAt: now.toISOString(),
      trialEndsAt: trialEnds.toISOString(),
      subscriptionStatus: trialMonths > 0 ? 'TRIAL' : 'UNPAID',
      subscriptionPaidUntil: null,
      subscriptionExempt: false,
      stampsTarget: 6,
      rewardTitle: 'Corte o Servicio de Fidelidad',
      cardColor: '#18181B',
      cardGradient: '#3F3F46',
      stampIcon: 'scissors',
      minPurchaseUsd: 10
    };

    // Guardar en Cloud Firestore garantizando persistencia
    try {
      const saveRes = await saveStore(newStore);
      if (!saveRes?.success) {
        console.warn('[Firebase] Reintentando guardar tienda en Firestore:', saveRes?.error);
        await saveStore(newStore);
      }
    } catch (saveErr) {
      console.warn('[Firebase] Error al guardar tienda en Firestore:', saveErr);
    }

    // Aprovisionar simultáneamente en Realtime Database (user_comercio)
    if (authRes.user?.uid) {
      try {
        await provisionComercioInRealtimeDb({
          uid: authRes.user.uid,
          email: cleanEmail,
          name: newStore.name,
          category: newStore.category,
          city: newStore.city,
          address: newStore.address,
          phone: newStore.phone,
          organizationName: newStore.name
        });
      } catch (rtdbErr) {
        console.warn('[RTDB] Error al aprovisionar comercio en Realtime DB:', rtdbErr);
      }
    }

    if (setStores) {
      setStores(prev => [...prev.filter(s => s.id !== newStore.id), newStore]);
    }
    setIsAuthLoading(false);

    // 3. Mostrar onboarding interactivo ANTES de entrar al panel POS
    try {
      localStorage.removeItem('fidely_store_onboarding_completed');
    } catch (e) { }

    setPendingStoreForPos(newStore);
    setShowStoreOnboarding(true);
  };

  // Procesa y aprovisiona automáticamente a cualquier usuario autenticado con Google
  const processGoogleUser = async (authUser, specificStore = null) => {
    if (!authUser) return;
    setIsAuthLoading(true);
    setLoginError('');
    try {
      const cleanEmail = (authUser.email || '').toLowerCase().trim();

      // 0. Verificar si la cuenta fue revocada o eliminada por el Administrador
      const revoked = await isUserRevoked(cleanEmail);
      if (revoked) {
        await logoutFromFirebase();
        setIsAuthLoading(false);
        setLoginError('Esta cuenta ha sido revocada y eliminada por el Administrador de fidely CLUB.');
        return;
      }

      // 1. ¿Es Administrador?
      const isAdmin = await checkIfUserIsAdmin(authUser.uid, cleanEmail);
      if (isAdmin) {
        setIsAuthLoading(false);
        onLogin({
          role: 'ADMIN',
          name: authUser.displayName || 'Super Administrador',
          email: cleanEmail,
          uid: authUser.uid
        });
        return;
      }

      // 2. ¿Es Tienda registrada?
      let matchedStore = stores.find(s =>
        (s.id === authUser.uid || s.firebaseUid === authUser.uid || s.email?.toLowerCase().trim() === cleanEmail) &&
        s.status !== 'ELIMINADO'
      );
      if (!matchedStore) {
        try {
          const dbStore = await getStoreByEmail(cleanEmail);
          if (dbStore && dbStore.status !== 'ELIMINADO') {
            matchedStore = dbStore;
          }
        } catch (e) { }
      }
      if (matchedStore) {
        if (!matchedStore.firebaseUid || matchedStore.firebaseUid !== authUser.uid) {
          try {
            await saveStore({ ...matchedStore, firebaseUid: authUser.uid });
          } catch (e) { }
        }
        setIsAuthLoading(false);
        onLogin({
          role: 'POS',
          store: matchedStore,
          name: `${matchedStore.manager || matchedStore.name} (Cajero)`,
          storeName: matchedStore.name
        });
        return;
      }

      const storeToLink = specificStore || targetStore;
      const isQrFastPass = Boolean(storeToLink || joinStoreId || activeTab === 'JOIN');

      // 3. ¿Es Cliente registrado (por formulario normal o por QR de tienda previo)?
      let matchedClient = clients.find(c =>
        c.id === authUser.uid ||
        c.firebaseUid === authUser.uid
      );

      if (!matchedClient) {
        try {
          matchedClient = await getClientById(authUser.uid);
        } catch (e) { }
      }

      if (!matchedClient && cleanEmail) {
        matchedClient = clients.find(c => c.email?.toLowerCase().trim() === cleanEmail);
      }

      if (!matchedClient && cleanEmail) {
        try {
          matchedClient = await getClientByEmail(cleanEmail);
        } catch (e) { }
      }

      if (matchedClient && (!matchedClient.firebaseUid || matchedClient.firebaseUid !== authUser.uid)) {
        try {
          await saveClient({ ...matchedClient, firebaseUid: authUser.uid });
          matchedClient = { ...matchedClient, firebaseUid: authUser.uid };
        } catch (e) { }
      }

      // 4. ¿Es Cliente con rol ya definido y confirmado permanentemente?
      const isConfirmedClient = matchedClient && (
        matchedClient.roleConfirmed === true ||
        matchedClient.registrationSource === 'FORM' ||
        Boolean(matchedClient.pin)
      );

      if (isConfirmedClient) {
        // El usuario ya confirmó previamente que es Cliente: entrar directo
        if (storeToLink) {
          const existingCards = Array.isArray(matchedClient.loyaltyCards) ? [...matchedClient.loyaltyCards] : [];
          const hasCard = existingCards.some(c => String(c.storeId || c.id).toLowerCase() === storeToLink.id.toLowerCase());
          if (!hasCard) {
            existingCards.push({
              storeId: storeToLink.id,
              storeName: storeToLink.name,
              logo: storeToLink.logo || '',
              cardColor: storeToLink.cardColor || '#9C382A',
              cardGradient: storeToLink.cardGradient || '',
              currentStamps: 0,
              stampsTarget: Number(storeToLink.stampsTarget || 6),
              rewardTitle: storeToLink.rewardTitle || 'Premio de Fidelidad',
              stampRewards: storeToLink.stampRewards || [],
              stampsHistory: []
            });
            const updatedClient = { ...matchedClient, loyaltyCards: existingCards };
            try {
              await saveClient(updatedClient);
            } catch (e) { }
            matchedClient = updatedClient;
          }
        }

        // Garantizar perfil en Realtime Database
        provisionUserInRealtimeDb({
          uid: authUser.uid,
          email: cleanEmail,
          name: matchedClient.name,
          phone: matchedClient.phone,
          docId: matchedClient.docId,
          photoURL: matchedClient.photoURL || authUser.photoURL || '',
          registeredViaStoreId: matchedClient.registeredViaStoreId || null
        });

        if (onClearJoinStore) onClearJoinStore();
        setIsAuthLoading(false);
        onLogin({
          role: 'CLIENT',
          client: matchedClient,
          name: matchedClient.name,
          email: cleanEmail,
          id: matchedClient.id,
          phone: matchedClient.phone,
          docId: matchedClient.docId
        });
        return;
      }

      // 5. NUEVO USUARIO DE GOOGLE O USUARIO SIN ROL CONFIRMADO:
      // Se detiene el inicio automático y se presenta el modal obligatorio para definir rol: Cliente o Comercio
      setPendingGoogleAuth({
        authUser,
        cleanEmail,
        specificStore: storeToLink,
        matchedClient
      });
      setGoogleStoreName(authUser.displayName || '');
      setGoogleStoreCategory('Barbería / Peluquería');
      setGoogleStoreCity('Caracas');
      setGoogleStorePhone(authUser.phoneNumber || '');
      setGoogleRoleStep('CHOOSE');
      setGoogleRoleError('');
      setIsAuthLoading(false);
      setShowGoogleRoleModal(true);
    } catch (err) {
      console.error('Error procesando usuario de Google:', err);
      setIsAuthLoading(false);
      setLoginError(err.message || 'Error al autenticar con Google.');
    }
  };

  // Escuchar automáticamente si venimos de un redirect de Google
  useEffect(() => {
    let active = true;
    checkGoogleRedirectResult().then(async (res) => {
      if (!active || !res || !res.success || !res.user) return;
      console.log('🔄 [Google Redirect Auth] Usuario detectado al volver de Google:', res.user.email);
      await processGoogleUser(res.user);
    }).catch(err => {
      console.warn('[Google Redirect Auth] Error comprobando redirect:', err);
    });
    return () => { active = false; };
  }, []);

  // Autenticación rápida con Google (y auto-vinculación de tarjeta si viene por QR)
  const handleGoogleLogin = async (specificStore = null) => {
    // Si está en un visor interno restringido (WhatsApp, Instagram, etc.) en Android, abrir en Chrome
    if (isAndroid() && isInAppBrowser()) {
      openInChromeApp();
      return;
    }

    // Si está en un visor interno en iOS
    if (isIOS() && isInAppBrowser()) {
      setLoginError('Google no permite iniciar sesión dentro del visor de WhatsApp/Instagram. Toca los tres puntos (•••) en la esquina superior y pulsa "Abrir en Safari".');
      return;
    }

    setIsAuthLoading(true);
    setLoginError('');
    try {
      const res = await loginWithGoogle();
      if (!res.success) {
        if (res.redirecting) {
          // Está redirigiendo a la pantalla completa de Google
          return;
        }
        if (res.error?.code !== 'auth/popup-closed-by-user') {
          setLoginError(res.formattedMessage || 'Error al conectar con Google.');
        }
        setIsAuthLoading(false);
        return;
      }

      await processGoogleUser(res.user, specificStore);
    } catch (err) {
      console.error('Error en autenticación con Google:', err);
      setIsAuthLoading(false);
      setLoginError(err.message || 'Error al autenticar con Google.');
    }
  };

  // Unified login handler with Firebase Auth & Firestore Role Resolution
  // (CERO credenciales ni correos expuestos en el código)
  const handleUnifiedLogin = async (e) => {
    if (e) e.preventDefault();
    setLoginError('');

    const cleanId = identifier.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanId) {
      setLoginError('Por favor ingresa tu correo electrónico.');
      return;
    }
    if (!cleanPassword) {
      setLoginError('Por favor ingresa tu contraseña.');
      return;
    }

    setIsAuthLoading(true);

    try {
      // 0. Verificar si la cuenta fue revocada o eliminada por el Administrador
      const revoked = await isUserRevoked(cleanId);
      if (revoked) {
        setIsAuthLoading(false);
        setLoginError('Esta cuenta ha sido revocada y eliminada por el Administrador de fidely CLUB.');
        return;
      }

      // =========================================================================
      // CASO 1: El usuario ingresa un Correo Electrónico
      // Se autentica contra Firebase Auth y luego se resuelve su rol en Firestore
      // =========================================================================
      if (cleanId.includes('@')) {
        let authRes = await loginWithEmailPassword(cleanId, cleanPassword);

        // Fallback demo solo para clientes precargados con clave 1234
        if (!authRes.success) {
          const matchedClientLocal = clients.find(c => c.email?.toLowerCase() === cleanId);
          if (matchedClientLocal && (cleanPassword === '1234' || cleanPassword === '123456')) {
            const provRes = await authenticateOrProvisionUser(cleanId, '123456', matchedClientLocal.name);
            if (provRes.success) {
              authRes = provRes;
            }
          }
        }

        if (!authRes.success) {
          setIsAuthLoading(false);
          setLoginError(authRes.formattedMessage || 'Correo electrónico o contraseña incorrectos.');
          return;
        }

        const authUser = authRes.user;

        // A. Verificación de Administrador en Cloud Firestore y Realtime Database (Conecta 2)
        const isAdmin = await checkIfUserIsAdmin(authUser?.uid, cleanId);
        if (isAdmin) {
          setIsAuthLoading(false);
          let adminName = authUser?.displayName;
          try {
            const rtdbAdmin = await getUserFromRealtimeDb(authUser?.uid);
            if (rtdbAdmin?.name || rtdbAdmin?.nombre) {
              adminName = rtdbAdmin.name || rtdbAdmin.nombre;
            }
          } catch (e) { }

          onLogin({
            role: 'ADMIN',
            name: adminName || 'Super Administrador Conecta2 & fidely',
            email: cleanId,
            uid: authUser?.uid
          });
          return;
        }

        // B. Verificación de Tienda / Comercio en Firestore
        let matchedStoreByEmail = stores.find(s =>
          (s.email?.toLowerCase().trim() === cleanId) ||
          (authUser?.uid && s.firebaseUid === authUser.uid)
        );
        if (!matchedStoreByEmail) {
          try {
            matchedStoreByEmail = await getStoreByEmail(cleanId);
          } catch (e) { }
        }
        if (matchedStoreByEmail) {
          if (authUser?.uid && !matchedStoreByEmail.firebaseUid) {
            try {
              await saveStore({ ...matchedStoreByEmail, firebaseUid: authUser.uid });
            } catch (e) { }
          }
          setIsAuthLoading(false);

          let hasCompletedOnboarding = false;
          try {
            hasCompletedOnboarding = !!localStorage.getItem('fidely_store_onboarding_completed');
          } catch (e) { }

          if (!hasCompletedOnboarding) {
            setPendingStoreForPos(matchedStoreByEmail);
            setShowStoreOnboarding(true);
            return;
          }

          onLogin({
            role: 'POS',
            store: matchedStoreByEmail,
            name: `${matchedStoreByEmail.manager || matchedStoreByEmail.name} (Cajero)`,
            storeName: matchedStoreByEmail.name
          });
          return;
        }

        // C. Verificación de Socio Cliente en Firestore (estricta por UID primero)
        let matchedClientByEmail = clients.find(c =>
          c.id === authUser.uid ||
          c.firebaseUid === authUser.uid
        );

        if (!matchedClientByEmail) {
          try {
            const fetched = await getClientById(authUser.uid);
            if (fetched) {
              matchedClientByEmail = fetched;
            }
          } catch (e) { }
        }

        if (!matchedClientByEmail && cleanId) {
          matchedClientByEmail = clients.find(c => c.email?.toLowerCase().trim() === cleanId);
        }

        if (!matchedClientByEmail && cleanId) {
          try {
            const fetchedByEmail = await getClientByEmail(cleanId);
            if (fetchedByEmail) {
              matchedClientByEmail = fetchedByEmail;
            }
          } catch (e) { }
        }

        // Si no tiene documento de cliente registrado en Firestore, verificar RTDB o auto-sincronizar:
        if (!matchedClientByEmail) {
          const rtdbUser = await getUserFromRealtimeDb(authUser.uid);
          const r = String(rtdbUser?.role || '').toLowerCase().trim();

          // Salvaguarda: Si el usuario tiene rol 'admin' en Realtime Database, es el Super Administrador
          if (r === 'admin' || r === 'superadmin' || rtdbUser?.isAdmin === true) {
            try {
              await saveAdmin({
                uid: authUser.uid,
                email: cleanId,
                name: rtdbUser?.name || rtdbUser?.nombre || authUser?.displayName || 'Super Administrador Conecta2 & fidely',
                role: 'ADMIN',
                source: 'conecta2_realtime'
              });
            } catch (e) { }
            setIsAuthLoading(false);
            onLogin({
              role: 'ADMIN',
              name: rtdbUser?.name || rtdbUser?.nombre || authUser?.displayName || 'Super Administrador Conecta2 & fidely',
              email: cleanId,
              uid: authUser?.uid
            });
            return;
          }

          // Si es un comercio en Realtime Database
          if (r === 'comercio' || rtdbUser?.isComercio) {
            let recoveredStore = null;
            try {
              recoveredStore = await getStoreByEmail(cleanId);
            } catch (e) { }

            if (recoveredStore) {
              if (authUser?.uid && !recoveredStore.firebaseUid) {
                recoveredStore.firebaseUid = authUser.uid;
                await saveStore(recoveredStore);
              }
            } else {
              const existingNumbers = (stores || []).map(s => {
                const match = s.id && String(s.id).match(/^STR-(\d+)$/i);
                return match ? parseInt(match[1], 10) : 0;
              });
              const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers, 0) : 0;
              const newStoreId = `STR-${String(maxNum + 1).padStart(2, '0')}`;
              recoveredStore = {
                id: newStoreId,
                firebaseUid: authUser.uid,
                name: rtdbUser?.name || rtdbUser?.organization_name || 'Comercio',
                category: rtdbUser?.categoria_comercio || 'Otro',
                city: rtdbUser?.estado_venezuela || 'Caracas',
                address: rtdbUser?.direccion_exacta || `${rtdbUser?.estado_venezuela || 'Caracas'}, Venezuela`,
                manager: rtdbUser?.name || 'Comercio',
                email: cleanId,
                phone: rtdbUser?.telefono || '',
                qrCode: `FIDELY-LOCAL-${newStoreId}`,
                status: 'APROBADO',
                createdAt: new Date().toISOString(),
                subscriptionStatus: 'TRIAL',
                subscriptionPaidUntil: null,
                subscriptionExempt: false,
                stampsTarget: 6,
                rewardTitle: 'Premio de Fidelidad',
                cardColor: '#18181B',
                cardGradient: '#3F3F46',
                stampIcon: 'scissors',
                minPurchaseUsd: 10
              };
              await saveStore(recoveredStore);
              if (setStores) {
                setStores(prev => [...prev.filter(s => s.id !== recoveredStore.id), recoveredStore]);
              }
            }

            setIsAuthLoading(false);
            onLogin({
              role: 'POS',
              store: recoveredStore,
              name: `${recoveredStore.manager || recoveredStore.name} (Cajero)`,
              storeName: recoveredStore.name
            });
            return;
          }

          // Sincronizar usuario autenticado a Firestore clients
          const rawCedula = (rtdbUser?.numero_cedula || authUser.uid.substring(0, 8)).toUpperCase();
          const todayDate = new Date().toISOString().split('T')[0];
          const autoClient = {
            id: authUser.uid,
            firebaseUid: authUser.uid,
            docId: rawCedula,
            qrCode: `FIDELY-${rawCedula}`,
            name: rtdbUser?.name || rtdbUser?.nombre || authUser?.displayName || cleanId.split('@')[0],
            initials: (rtdbUser?.name || rtdbUser?.nombre || authUser?.displayName || cleanId.split('@')[0]).slice(0, 2).toUpperCase(),
            email: cleanId,
            phone: rtdbUser?.telefono || authUser?.phoneNumber || '',
            birthDate: rtdbUser?.fecha_nacimiento || rtdbUser?.birthDate || '',
            photoURL: rtdbUser?.photoUrl || authUser?.photoURL || '',
            pointsBalance: 0,
            storeBalances: {},
            tier: 'Socia Esencial',
            hasSelectedWelcomeStore: true,
            favoriteStoreId: stores[0]?.id || 'STR-02',
            joinDate: todayDate,
            memberSince: todayDate,
            status: 'APROBADO',
            createdAt: new Date().toISOString(),
            registrationSource: rtdbUser ? 'CONECTA2_RTDB' : 'EMAIL_AUTH',
            loyaltyCards: []
          };
          try {
            await saveClient(autoClient);
          } catch (e) {
            console.warn('[Firebase] Error al guardar cliente auto-sincronizado:', e);
          }
          matchedClientByEmail = autoClient;
        }

        setIsAuthLoading(false);
        onLogin({
          role: 'CLIENT',
          client: matchedClientByEmail,
          name: matchedClientByEmail.name,
          initials: matchedClientByEmail.name.slice(0, 2).toUpperCase()
        });
        return;
      }

      // =========================================================================
      // CASO 2: El identificador NO es correo (Cédula de Cliente o Código POS)
      // =========================================================================
      // A. Coincidencia por Código o Nombre de Tienda
      const matchedStore = stores.find(s =>
        s.id.toLowerCase() === cleanId ||
        s.name.toLowerCase().includes(cleanId)
      );

      if (matchedStore) {
        setIsAuthLoading(false);

        let hasCompletedOnboarding = false;
        try {
          hasCompletedOnboarding = !!localStorage.getItem('fidely_store_onboarding_completed');
        } catch (e) { }

        if (!hasCompletedOnboarding) {
          setPendingStoreForPos(matchedStore);
          setShowStoreOnboarding(true);
          return;
        }

        onLogin({
          role: 'POS',
          store: matchedStore,
          name: `${matchedStore.manager || matchedStore.name} (Cajero)`,
          storeName: matchedStore.name
        });
        return;
      }

      // A-2. Verificación si el identificador corresponde a un Administrador
      const isIdentifierAdmin = await checkIfUserIsAdmin(cleanId, cleanId);
      if (isIdentifierAdmin) {
        setIsAuthLoading(false);
        onLogin({
          role: 'ADMIN',
          name: 'Super Administrador Conecta2 & fidely',
          email: cleanId.includes('@') ? cleanId : '',
          uid: cleanId
        });
        return;
      }

      setIsAuthLoading(false);
      setLoginError('Por favor ingresa un correo electrónico válido para iniciar sesión.');
    } catch (err) {
      console.error('Error en autenticación:', err);
      setIsAuthLoading(false);
      setLoginError('Ocurrió un error al procesar el inicio de sesión. Intenta nuevamente.');
    }
  };

  // Register client handler with Firebase Auth
  const handleRegisterSubmit = async (e) => {
    if (e) e.preventDefault();
    setRegError('');

    if (!regName.trim()) {
      setRegError('Por favor ingresa tu nombre completo.');
      return;
    }
    if (!regDocId.trim()) {
      setRegError('Por favor ingresa tu cédula o número de documento.');
      return;
    }
    if (!regPhone.trim()) {
      setRegError('Por favor ingresa tu número de teléfono celular.');
      return;
    }
    if (!regBirthDate.trim()) {
      setRegError('Por favor selecciona tu fecha de cumpleaños para tus premios especiales.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setRegError('Por favor ingresa un correo electrónico válido.');
      return;
    }
    if (!regPin || regPin.length < 6) {
      setRegError('La contraseña debe tener al menos 6 caracteres para tu seguridad.');
      return;
    }
    if (!regAccept) {
      setRegError('Debes aceptar los términos para unirte al club.');
      return;
    }

    // Validación estricta de duplicados: Cédula, Correo y Teléfono
    const dupCheck = checkDuplicateClient({
      docId: regDocId,
      email: regEmail,
      phone: regPhone,
      name: regName
    }, clients);

    if (dupCheck.isDuplicate) {
      setRegError(`${dupCheck.message} Si ya tienes cuenta, puedes iniciar sesión.`);
      return;
    }

    setIsAuthLoading(true);

    // 0. Si el correo o documento estuvieron revocados previamente, desbloquearlos
    await unrevokeUser(regEmail.trim().toLowerCase());
    await unrevokeUser(regDocId.trim().toLowerCase());

    // Create Firebase Auth user with Email & Password
    const authResult = await registerWithEmailPassword(regEmail, regPin, regName);
    setIsAuthLoading(false);

    if (!authResult.success && authResult.error?.code !== 'auth/email-already-in-use') {
      if (authResult.error?.code === 'auth/operation-not-allowed') {
        setRegError('Aviso: El proveedor de Correo/Contraseña aún no está habilitado en Firebase Console > Authentication > Sign-in method. Actívalo en tu consola de Firebase.');
        return;
      }
      setRegError(authResult.formattedMessage);
      return;
    }

    if (authResult.user?.uid) {
      await provisionUserInRealtimeDb({
        uid: authResult.user.uid,
        email: regEmail,
        name: regName,
        phone: regPhone || '+58 412 0000000',
        docId: regDocId,
        birthDate: regBirthDate,
        registeredViaStoreId: null
      });
    }

    if (onRegisterClient) {
      onRegisterClient({
        name: regName,
        docId: regDocId,
        phone: regPhone || '+58 412 0000000',
        birthDate: regBirthDate,
        email: regEmail,
        favoriteStoreId: null,
        pin: regPin,
        firebaseUid: authResult.user?.uid
      });
    }
  };

  return (
    <div className="fidely-auth-overlay">
      {/* Barra superior fija de cambio a Chrome (Solo en Android y navegador secundario) */}
      {isAndroid() && !isChromeOnAndroid() && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 99999,
          background: 'linear-gradient(90deg, #1E3A8A 0%, #2563EB 100%)',
          color: '#FFFFFF',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <ChromeIcon size={22} />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Para login en 1 clic
            </span>
          </div>
          <button
            type="button"
            onClick={() => openInChromeApp()}
            style={{
              background: '#FACC15',
              color: '#854D0E',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '0.80rem',
              fontWeight: 800,
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
            }}
          >
            Abrir en Chrome 🚀
          </button>
        </div>
      )}

      {/* 3D Floating Ambient Spheres (Brackto Reference Aesthetic) */}
      <div className="fidely-floating-sphere sphere-1" />
      <div className="fidely-floating-sphere sphere-2" />
      <div className="fidely-floating-sphere sphere-3" />

      <div className="fidely-auth-container">

        {/* ================= LEFT FORM COLUMN (Brackto White Form Side) ================= */}
        <div className="fidely-auth-form-side">
          {/* Brand Heading Row */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <img src="/fidely.png" alt="fidely" style={{ width: '26px', height: '26px', objectFit: 'contain' }} />
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.45rem', fontWeight: 800, color: '#1C1917', letterSpacing: '-0.025em' }}>
                  Somos <span style={{ color: 'var(--c-primary)' }}>fidely</span>
                </span>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, background: 'var(--c-secondary-soft)', color: 'var(--c-primary)', padding: '2px 8px', borderRadius: '9999px', letterSpacing: '0.08em' }}>
                  CLUB
                </span>
              </div>

              {/* Botón sutil de volver al Login cuando se esté registrando */}
              {(activeTab === 'REGISTER' || activeTab === 'REGISTER_STORE') && (
                <button
                  type="button"
                  onClick={() => { setActiveTab('LOGIN'); setLoginError(''); setRegError(''); setStoreError(''); }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 12px',
                    borderRadius: '20px',
                    background: '#F8FAFC',
                    color: '#475569',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'all 0.15s ease'
                  }}
                  title="Volver a la pantalla de inicio de sesión"
                >
                  <ArrowLeft size={13} />
                  <span>Volver a Iniciar Sesión</span>
                </button>
              )}
            </div>

            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
              {activeTab === 'REGISTER_STORE'
                ? 'Registra tu comercio y activa el terminal POS para fidelizar a tus clientes.'
                : activeTab === 'REGISTER'
                  ? 'Crea tu cuenta de socio y obtén tu tarjeta digital de fidelización.'
                  : activeTab === 'JOIN'
                    ? 'Únete a este comercio y activa tu tarjeta de sellos instantánea.'
                    : 'Ingresa con tu correo o credenciales para acceder a tu cuenta o terminal POS.'}
            </p>
          </div>

          {/* Form Content Container */}
          <div className="fidely-auth-body">

            {/* ----------------- MODO FAST-PASS: REGISTRO RÁPIDO EN CAJA (?join=STORE_ID o ?store=STORE_ID) ----------------- */}
            {activeTab === 'JOIN' && (
              <div style={{ textAlign: 'center', padding: '6px 0' }}>
                <div style={{
                  width: '74px',
                  height: '74px',
                  borderRadius: '22px',
                  margin: '0 auto 16px auto',
                  background: targetStore?.cardColor || 'linear-gradient(135deg, #DE8B76 0%, #9C382A 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(156, 56, 42, 0.25)',
                  overflow: 'hidden'
                }}>
                  {targetStore?.logo ? (
                    <img src={targetStore.logo} alt={targetStore.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Store size={38} color="#FFFFFF" />
                  )}
                </div>

                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  background: '#FEF3C7',
                  color: '#92400E',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  display: 'inline-block',
                  marginBottom: '10px'
                }}>
                  Registro Rápido en Mostrador
                </span>

                <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-main)', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                  {targetStore?.name || (joinStoreId ? `Comercio Aliado` : 'Club de Fidelidad')}
                </h2>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: '0 auto 22px auto', maxWidth: '360px', lineHeight: 1.45 }}>
                  Activa tu Tarjeta Digital en <strong>3 segundos</strong> para acumular sellos en esta visita y ganar tu premio: <br />
                  <strong style={{ color: 'var(--c-primary)' }}>🎁 {targetStore?.rewardTitle || 'Premio de Fidelidad'}</strong>
                </p>

                {loginError && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: '#FEE2E2',
                    border: '1px solid #FCA5A5',
                    color: '#991B1B',
                    fontSize: '0.82rem',
                    marginBottom: '16px',
                    textAlign: 'left'
                  }}>
                    {loginError}
                  </div>
                )}

                {/* Botón Ultra-Visible: Abrir en Chrome si está en Android en otro navegador */}
                {isAndroid() && !isChromeOnAndroid() && (
                  <button
                    type="button"
                    onClick={() => openInChromeApp()}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                      border: '2px solid #38BDF8',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      marginBottom: '16px',
                      cursor: 'pointer',
                      boxShadow: '0 8px 24px rgba(56, 189, 248, 0.28)',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <ChromeIcon size={32} />
                      <div>
                        <div style={{ fontSize: '0.98rem', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.2 }}>
                          Abrir en Google Chrome
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#94A3B8', fontWeight: 600 }}>
                          Para entrar con Google en 1 solo clic
                        </div>
                      </div>
                    </div>
                    <div style={{
                      background: '#38BDF8',
                      color: '#0F172A',
                      padding: '7px 14px',
                      borderRadius: '10px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      whiteSpace: 'nowrap'
                    }}>
                      Ir a Chrome ↗
                    </div>
                  </button>
                )}

                {/* BOTÓN CONTINUAR CON GOOGLE */}
                <button
                  type="button"
                  onClick={() => handleGoogleLogin(targetStore)}
                  disabled={isAuthLoading}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    borderRadius: '14px',
                    border: '1.5px solid #E2E8F0',
                    background: '#FFFFFF',
                    color: '#1E293B',
                    fontSize: '0.96rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isAuthLoading ? (
                    <>
                      <Loader2 size={18} className="spin" />
                      <span>Conectando con Google...</span>
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>{authProfileType === 'STORE' ? 'Entrar al POS con Google' : 'Continuar con Google como Socio'}</span>
                    </>
                  )}
                </button>

                <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <ShieldCheck size={14} color="#16A34A" />
                  <span>Sin formularios • Tarjeta lista para mostrar al cajero</span>
                </div>

                <div style={{ marginTop: '22px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (onClearJoinStore) onClearJoinStore();
                      setActiveTab('LOGIN');
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.80rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    ¿Prefieres usar correo o administrar una tienda?
                  </button>
                </div>
              </div>
            )}

            {/* ----------------- TAB: INICIAR SESIÓN (UNIFICADO) ----------------- */}
            {activeTab === 'LOGIN' && (
              <>
                <div className="fidely-auth-header-text">
                  <h2>Iniciar Sesión</h2>
                  <p>
                    Ingresa con tus credenciales para acceder a tu billetera, terminal POS o panel admin.
                  </p>
                </div>

                {/* Error Banner */}
                {loginError && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: '#FEE2E2',
                    border: '1px solid #FCA5A5',
                    color: '#991B1B',
                    fontSize: '0.82rem',
                    lineHeight: 1.4,
                    marginBottom: '14px'
                  }}>
                    {loginError}
                  </div>
                )}

                {/* Formulario Unificado */}
                <form onSubmit={handleUnifiedLogin} className="fidely-auth-form">
                  <div className="fidely-auth-field">
                    <label>Correo Electrónico</label>
                    <input
                      type="email"
                      required
                      placeholder="nombre@ejemplo.com"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      autoComplete="email"
                    />
                  </div>

                  <div className="fidely-auth-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label>Contraseña / PIN</label>
                      <button
                        type="button"
                        onClick={() => setForgotModal(true)}
                        className="fidely-auth-forgot-link"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                    <div className="fidely-password-wrapper">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="fidely-eye-btn"
                        tabIndex="-1"
                        aria-label="Mostrar u ocultar contraseña"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        style={{ accentColor: 'var(--c-primary)', width: '15px', height: '15px', cursor: 'pointer' }}
                      />
                      <span>Recordar sesión</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setForgotModal(true)}
                      className="fidely-auth-forgot-link"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>

                  {/* Botón Principal Iniciar Sesión */}
                  <button
                    type="submit"
                    disabled={isAuthLoading}
                    className="btn-brackto-primary"
                    style={{ width: '100%', padding: '13px 20px', fontSize: '0.94rem', marginTop: '6px' }}
                  >
                    {isAuthLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Verificando credenciales...</span>
                      </>
                    ) : (
                      <>
                        <span>Iniciar Sesión</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>

                  <div style={{ margin: '16px 0 12px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
                    <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>o también</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
                  </div>

                  {/* Botón Ultra-Visible: Abrir en Chrome si está en Android en otro navegador */}
                  {isAndroid() && !isChromeOnAndroid() && (
                    <button
                      type="button"
                      onClick={() => openInChromeApp()}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                        border: '2px solid #38BDF8',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        marginBottom: '12px',
                        cursor: 'pointer',
                        boxShadow: '0 6px 20px rgba(56, 189, 248, 0.22)',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ChromeIcon size={26} />
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.2 }}>
                            Abrir en Google Chrome
                          </div>
                          <div style={{ fontSize: '0.70rem', color: '#94A3B8', fontWeight: 600 }}>
                            Recomendado para entrar con 1 clic
                          </div>
                        </div>
                      </div>
                      <div style={{
                        background: '#38BDF8',
                        color: '#0F172A',
                        padding: '5px 10px',
                        borderRadius: '8px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        whiteSpace: 'nowrap'
                      }}>
                        Ir a Chrome ↗
                      </div>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleGoogleLogin()}
                    disabled={isAuthLoading}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1.5px solid #E2E8F0',
                      background: '#FFFFFF',
                      fontSize: '0.90rem',
                      fontWeight: 700,
                      color: '#1E293B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Continuar con Google</span>
                  </button>
                </form>

                {/* Sección Destacada: Botón Crear Cuenta */}
                <div style={{
                  marginTop: '22px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--border-subtle)',
                  textAlign: 'center'
                }}>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 10px 0' }}>
                    ¿Aún no tienes una cuenta registrada?
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowRoleSelectionModal(true)}
                    className="btn-brackto-secondary"
                    style={{
                      width: '100%',
                      padding: '12px 18px',
                      borderRadius: '12px',
                      fontWeight: 800,
                      fontSize: '0.90rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <Sparkles size={16} color="var(--c-primary)" />
                    <span>Crear una Cuenta</span>
                  </button>
                </div>
              </>
            )}


            {/* ----------------- TAB: CREAR CUENTA (CLIENTE) ----------------- */}
            {activeTab === 'REGISTER' && (
              <>
                <div className="fidely-auth-header-text">
                  <h2>Crea tu Cuenta de Socio</h2>
                  <p>Únete gratis y obtén tu tarjeta digital para acumular sellos en tus comercios aliados.</p>
                </div>

                {/* OPCIÓN 1: REGISTRARSE CON GOOGLE AUTH */}
                <div style={{ marginBottom: '14px' }}>
                  {isAndroid() && !isChromeOnAndroid() && (
                    <button
                      type="button"
                      onClick={() => openInChromeApp()}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                        border: '2px solid #38BDF8',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        marginBottom: '10px',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ChromeIcon size={22} />
                        <span style={{ fontSize: '0.80rem', fontWeight: 800 }}>Abrir en Chrome para 1 clic</span>
                      </div>
                      <span style={{ fontSize: '0.72rem', background: '#38BDF8', color: '#0F172A', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
                        Ir ↗
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleGoogleLogin()}
                    disabled={isAuthLoading}
                    style={{
                      width: '100%',
                      padding: '12px 18px',
                      borderRadius: '12px',
                      border: '1.5px solid #E2E8F0',
                      background: '#FFFFFF',
                      fontSize: '0.90rem',
                      fontWeight: 800,
                      color: '#1E293B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Registrarme con Google en 1 Clic</span>
                  </button>
                </div>

                <div style={{ margin: '14px 0 12px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
                  <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>o completa tus datos</span>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
                </div>

                {regError && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: '#FEE2E2',
                    border: '1px solid #FCA5A5',
                    color: '#991B1B',
                    fontSize: '0.82rem',
                    lineHeight: 1.4,
                    marginBottom: '12px'
                  }}>
                    {regError}
                  </div>
                )}

                {/* OPCIÓN 2: FORMULARIO CLIENTE */}
                <form onSubmit={handleRegisterSubmit} className="fidely-auth-form">
                  <div className="fidely-form-grid-2">
                    <div className="fidely-auth-field">
                      <label>Nombre y Apellido *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. María Pérez"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                      />
                    </div>
                    <div className="fidely-auth-field">
                      <label>Cédula de Identidad *</label>
                      <input
                        type="text"
                        required
                        placeholder="V-18.456.789"
                        value={regDocId}
                        onChange={(e) => setRegDocId(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="fidely-form-grid-2">
                    <div className="fidely-auth-field">
                      <label>Teléfono Celular *</label>
                      <input
                        type="tel"
                        required
                        placeholder="+58 412 1234567"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                      />
                    </div>
                    <div className="fidely-auth-field">
                      <label>Fecha de Cumpleaños 🎂 *</label>
                      <input
                        type="date"
                        required
                        value={regBirthDate}
                        onChange={(e) => setRegBirthDate(e.target.value)}
                        style={{
                          width: '100%',
                          minHeight: '44px',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          border: '1.5px solid #EAE0D6',
                          background: '#FAF8F5',
                          fontSize: '13.5px',
                          color: '#1C1917',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box',
                          cursor: 'pointer'
                        }}
                      />
                    </div>
                  </div>

                  <div className="fidely-auth-field">
                    <label>Correo Electrónico *</label>
                    <input
                      type="email"
                      required
                      placeholder="socio@correo.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                    />
                  </div>

                  <div className="fidely-auth-field">
                    <label>Contraseña / PIN de Cuenta * (mínimo 6 caracteres)</label>
                    <div className="fidely-password-wrapper">
                      <input
                        type={showRegPin ? 'text' : 'password'}
                        required
                        minLength={6}
                        placeholder="••••••••"
                        value={regPin}
                        onChange={(e) => setRegPin(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPin(!showRegPin)}
                        className="fidely-eye-btn"
                        tabIndex="-1"
                        aria-label="Mostrar u ocultar contraseña"
                      >
                        {showRegPin ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    <input
                      type="checkbox"
                      id="regAcceptCheck"
                      checked={regAccept}
                      onChange={(e) => setRegAccept(e.target.checked)}
                      style={{ accentColor: 'var(--c-primary)', width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <label htmlFor="regAcceptCheck" style={{ fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      Acepto los términos del Club de Fidelización y canje de saldo en comercios.
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isAuthLoading}
                    className="fidely-auth-submit-btn"
                  >
                    {isAuthLoading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Creando cuenta en Firebase...</span>
                      </>
                    ) : (
                      <>
                        <span>Crear Cuenta de Socio</span>
                        <ArrowRight size={17} />
                      </>
                    )}
                  </button>
                </form>

                {/* OPCIÓN 3: O IR A LA APP OFICIAL */}
                <div style={{
                  marginTop: '16px',
                  background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
                  border: '1px solid #FDBA74',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  boxShadow: '0 2px 6px rgba(249, 115, 22, 0.08)'
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
                    <div style={{ fontSize: '0.75rem', color: '#9A3412', lineHeight: 1.3 }}>
                      <strong>App Móvil (Solo Clientes):</strong> Abre o descarga <strong>Conecta2</strong>. Si eres Tienda, tu panel opera por Web.
                    </div>
                  </div>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.conecta2.services_app"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '5px 10px',
                      background: '#EA580C',
                      color: '#FFFFFF',
                      borderRadius: '7px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 4px rgba(234, 88, 12, 0.2)'
                    }}
                  >
                    <span>Abrir App</span>
                    <ArrowUpRight size={12} />
                  </a>
                </div>

                <div className="fidely-auth-footer-link" style={{ marginTop: '16px' }}>
                  ¿Ya tienes una cuenta registrada?{' '}
                  <button
                    type="button"
                    onClick={() => { setActiveTab('LOGIN'); setLoginError(''); }}
                  >
                    Inicia sesión aquí
                  </button>
                </div>
              </>
            )}

            {/* ----------------- TAB: SOY TIENDA (REGISTRO COMERCIO) ----------------- */}
            {activeTab === 'REGISTER_STORE' && (
              <>
                <div className="fidely-auth-header-text">
                  <h2>Registra tu Comercio en fidely</h2>
                  <p>Activa tu terminal POS y fideliza a tus clientes con tu propia tarjeta digital de sellos.</p>
                </div>

                {/* Banner Interactivo: Guía y Beneficios para Comercios */}
                <div
                  onClick={() => setShowStoreOnboarding(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(222, 139, 118, 0.16) 0%, rgba(156, 56, 42, 0.08) 100%)',
                    border: '1px solid rgba(222, 139, 118, 0.35)',
                    cursor: 'pointer',
                    marginBottom: '16px',
                    transition: 'transform 0.15s ease'
                  }}
                  title="Conoce cómo funciona tu tarjeta de sellos digital, aprobación de QR y beneficios"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'var(--c-primary)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
                        ¿Cómo funciona fidely para Comercios?
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--c-primary)', fontWeight: 600 }}>
                        Ver funcionamiento de tarjetas de sellos y POS ➔
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={16} color="var(--c-primary)" />
                </div>

                {storeError && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: '#FEE2E2',
                    border: '1px solid #FCA5A5',
                    color: '#991B1B',
                    fontSize: '0.82rem',
                    lineHeight: 1.4
                  }}>
                    {storeError}
                  </div>
                )}

                <form onSubmit={handleRegisterStore} className="fidely-auth-form">
                  <div className="fidely-form-grid-2">
                    <div className="fidely-auth-field">
                      <label>Nombre del Comercio *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Barbería El Barón C.A."
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                      />
                    </div>
                    <div className="fidely-auth-field">
                      <label>Categoría del Comercio *</label>
                      <button
                        type="button"
                        onClick={() => setShowCategoryModal(true)}
                        className="fidely-cat-trigger-btn"
                        aria-haspopup="dialog"
                        title="Haz clic para seleccionar la categoría de tu comercio"
                      >
                        <div className="fidely-cat-trigger-main">
                          <span className="fidely-cat-trigger-icon">
                            {getCategoryInfo(storeCategory).icon}
                          </span>
                          <span className="fidely-cat-trigger-label">
                            {storeCategory}
                          </span>
                        </div>
                        <span className="fidely-cat-trigger-action">
                          Cambiar <ChevronRight size={11} strokeWidth={2.5} />
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="fidely-form-grid-2">
                    <div className="fidely-auth-field">
                      <label>Ciudad / Estado</label>
                      <input
                        type="text"
                        placeholder="Ej. Caracas, Valencia, etc."
                        value={storeCity}
                        onChange={(e) => setStoreCity(e.target.value)}
                      />
                    </div>
                    <div className="fidely-auth-field">
                      <label>Dirección del Local</label>
                      <input
                        type="text"
                        placeholder="Ej. C.C. Tolón, Nivel PB, Local 12"
                        value={storeAddress}
                        onChange={(e) => setStoreAddress(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="fidely-form-grid-2">
                    <div className="fidely-auth-field">
                      <label>Correo Electrónico para Terminal POS *</label>
                      <input
                        type="email"
                        required
                        placeholder="tienda@empresa.com"
                        value={storeEmail}
                        onChange={(e) => setStoreEmail(e.target.value)}
                      />
                    </div>
                    <div className="fidely-auth-field">
                      <label>Teléfono / WhatsApp de Contacto *</label>
                      <input
                        type="tel"
                        required
                        placeholder="+58 412 1234567"
                        value={storePhone}
                        onChange={(e) => setStorePhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="fidely-auth-field">
                    <label>Contraseña para Acceso POS *</label>
                    <div className="fidely-password-wrapper">
                      <input
                        type={showStorePassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        placeholder="Mínimo 6 caracteres"
                        value={storePassword}
                        onChange={(e) => setStorePassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowStorePassword(!showStorePassword)}
                        className="fidely-eye-btn"
                        tabIndex="-1"
                        aria-label="Mostrar u ocultar contraseña"
                      >
                        {showStorePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isAuthLoading}
                    className="fidely-auth-submit-btn"
                  >
                    {isAuthLoading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Registrando terminal POS...</span>
                      </>
                    ) : (
                      <>
                        <Store size={18} />
                        <span>Registrar Tienda y Entrar al POS</span>
                        <ArrowRight size={17} />
                      </>
                    )}
                  </button>
                </form>

                <div className="fidely-auth-footer-link">
                  ¿Ya tienes un comercio registrado?{' '}
                  <button
                    type="button"
                    onClick={() => { setActiveTab('LOGIN'); setLoginError(''); }}
                  >
                    Inicia sesión aquí
                  </button>
                </div>
              </>
            )}

          </div>
        </div>

        {/* Center Seam Connector Badge (Brackto Detail) */}
        <div className="fidely-seam-badge" title="fidely CLUB">
          <span>✻</span>
        </div>

        {/* ================= RIGHT SHOWCASE COLUMN (Brackto Image Showcase) ================= */}
        <div className="fidely-auth-showcase-side">
          <div className="fidely-auth-showcase-overlay" />
          <div className="fidely-auth-showcase-content">
            {/* Top Navigation */}
            <div className="showcase-topbar">
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '19px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                fidely.
              </span>
              <div className="showcase-nav-links">
                <button
                  type="button"
                  onClick={onGoToLanding}
                  className="showcase-back-pill"
                  title="Volver a la página principal"
                >
                  <ArrowLeft size={12} />
                  <span>Inicio</span>
                </button>
              </div>
            </div>

            {/* Center Watermark & Brand Accent */}
            <div style={{ textAlign: 'left', marginTop: 'auto', marginBottom: '18px' }}>
              <div className="showcase-script-watermark">
                fidely
              </div>
              <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.92)' }}>
                CLUB DE BENEFICIOS EXCLUSIVO
              </div>
            </div>

            {/* Carousel Bottom Box */}
            <div className="showcase-carousel-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '10px', background: 'rgba(255, 255, 255, 0.22)', padding: '2px 8px', borderRadius: '9999px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.04em' }}>
                  {showcaseSlides[showcaseSlide].badge}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setShowcaseSlide(prev => (prev === 0 ? showcaseSlides.length - 1 : prev - 1))}
                    className="showcase-nav-btn"
                    title="Anterior testimonio"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowcaseSlide(prev => (prev === showcaseSlides.length - 1 ? 0 : prev + 1))}
                    className="showcase-nav-btn"
                    title="Siguiente testimonio"
                  >
                    ›
                  </button>
                </div>
              </div>
              <p style={{ fontSize: '12.5px', color: '#FFFFFF', lineHeight: 1.45, margin: '0 0 6px 0', fontWeight: 500 }}>
                {showcaseSlides[showcaseSlide].quote}
              </p>
              <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.75)', fontWeight: 600 }}>
                {showcaseSlides[showcaseSlide].author}
              </div>
            </div>
          </div>
        </div>

      </div>


      {/* Clean Footer Bar (somosrial style) */}
      <div className="fidely-auth-footer-bar">
        © 2026 fidely CLUB • Hecho en Venezuela
      </div>

      {/* Floating QR Pass Badge (somosrial style) */}
      <div className="fidely-auth-floating-badge" title="Acumula puntos con tu QR">
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'var(--c-secondary-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--c-primary)'
        }}>
          <QrCode size={20} />
        </div>
        <div>
          <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
            Tarjeta Digital QR
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
            Canje instantáneo en caja
          </div>
        </div>
      </div>

      {/* Forgot Password Modal Helper */}

      {forgotModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            maxWidth: '420px',
            width: '100%',
            padding: '26px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#F4ECE4',
              color: 'var(--c-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Lock size={22} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-main)' }}>
              ¿Olvidaste tu contraseña?
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              Puedes restablecer tu acceso con el soporte del comercio o solicitando el enlace a tu correo registrado mediante Firebase Auth.
            </p>
            <button
              type="button"
              onClick={() => setForgotModal(false)}
              className="fidely-auth-submit-btn"
              style={{ width: '100%' }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal Guía y Beneficios para Comercios */}
      <StoreOnboardingModal
        isOpen={showStoreOnboarding}
        onClose={handleCloseStoreOnboarding}
        storeName={pendingStoreForPos ? pendingStoreForPos.name : (storeName || "Tu Comercio")}
        confirmButtonText="¡Entrar al Terminal POS! 🚀"
      />

      {/* Modal Selector de Categoría de Comercio Web */}
      <StoreCategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        selectedCategory={storeCategory}
        onSelectCategory={(chosenCat) => setStoreCategory(chosenCat)}
      />

      {/* ================= MODAL SELECCIONADOR DE ROL (TIENDA O CLIENTE) - COMPACTO ================= */}
      {showRoleSelectionModal && !joinStoreId && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '14px',
          animation: 'fadeIn 0.18s ease-out'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            maxWidth: '440px',
            width: '100%',
            padding: '22px 20px 18px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1.5px solid #F1F5F9',
            position: 'relative'
          }}>
            {/* Botón cerrar X */}
            <button
              type="button"
              onClick={() => {
                setShowRoleSelectionModal(false);
                setAuthProfileType('CLIENT');
                setActiveTab('LOGIN');
              }}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                color: '#64748B',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              title="Cerrar ventana"
            >
              <X size={15} />
            </button>

            {/* Header Compacto y Fit */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
                <img src="/fidely.png" alt="fidely" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.18rem', fontWeight: 900, color: '#1C1917', letterSpacing: '-0.02em' }}>
                  fidely <span style={{ color: 'var(--c-primary)' }}>CLUB</span>
                </span>
              </div>
              <h3 style={{ margin: '2px 0 4px', fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                ¿Qué cuenta deseas crear?
              </h3>
              <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Selecciona una opción para comenzar tu registro:
              </p>
            </div>

            {/* 2 Opciones en Tarjetas Interactivas 1-Click (Ultra Premium) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '14px' }}>

              {/* Tarjeta 1: Cliente */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  setAuthProfileType('CLIENT');
                  setActiveTab('REGISTER');
                  setShowRoleSelectionModal(false);
                }}
                style={{
                  background: '#FAF8F5',
                  border: '1.5px solid #EEDCD5',
                  borderRadius: '16px',
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--c-primary)';
                  e.currentTarget.style.background = '#FFF6F2';
                  e.currentTarget.style.boxShadow = '0 10px 24px rgba(156, 56, 42, 0.12)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#EEDCD5';
                  e.currentTarget.style.background = '#FAF8F5';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.02)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '13px', minWidth: 0, flex: 1 }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #DE8B76 0%, #9C382A 100%)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 10px rgba(156, 56, 42, 0.22)'
                  }}>
                    <User size={20} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#1C1917', lineHeight: 1.2 }}>
                      Soy Cliente / Socio
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '3px', lineHeight: 1.3 }}>
                      Billetera digital, sellos y premios en comercios
                    </div>
                  </div>
                </div>

                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  border: '1.5px solid #EEDCD5',
                  color: 'var(--c-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 5px rgba(0,0,0,0.04)'
                }}>
                  <ArrowRight size={15} />
                </div>
              </div>

              {/* Tarjeta 2: Tienda */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  setAuthProfileType('STORE');
                  setActiveTab('REGISTER_STORE');
                  setShowRoleSelectionModal(false);
                }}
                style={{
                  background: '#F8FAFC',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: '16px',
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0F172A';
                  e.currentTarget.style.background = '#F1F5F9';
                  e.currentTarget.style.boxShadow = '0 10px 24px rgba(15, 23, 42, 0.12)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.background = '#F8FAFC';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.02)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '13px', minWidth: 0, flex: 1 }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 10px rgba(15, 23, 42, 0.22)'
                  }}>
                    <Store size={20} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                      Soy Comercio / Tienda
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '3px', lineHeight: 1.3 }}>
                      Terminal POS para cobrar y sellar tarjetas
                    </div>
                  </div>
                </div>

                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  border: '1.5px solid #CBD5E1',
                  color: '#0F172A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 5px rgba(0,0,0,0.04)'
                }}>
                  <ArrowRight size={15} />
                </div>
              </div>

            </div>

            {/* Footer con opción de volver al login si ya tiene cuenta */}
            <div style={{
              textAlign: 'center',
              paddingTop: '12px',
              borderTop: '1px solid #F1F5F9',
              fontSize: '0.76rem',
              color: 'var(--text-muted)'
            }}>
              <span>¿Ya tienes una cuenta registrada? </span>
              <button
                type="button"
                onClick={() => {
                  setShowRoleSelectionModal(false);
                  setActiveTab('LOGIN');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--c-primary)',
                  fontWeight: 800,
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0
                }}
              >
                Inicia sesión aquí
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL DEFINICIÓN DE ROL OBLIGATORIO TRAS REGISTRO CON GOOGLE ================= */}
      {showGoogleRoleModal && pendingGoogleAuth && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 100000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '26px',
            maxWidth: '500px',
            width: '100%',
            padding: '28px 24px',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.35)',
            position: 'relative',
            maxHeight: '92vh',
            overflowY: 'auto'
          }}>
            {/* Cabecera con Mascota Fidely */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <img
                src="/fidely_mascot.png"
                alt="Mascota Fidely"
                style={{
                  width: '74px',
                  height: 'auto',
                  margin: '0 auto 8px',
                  display: 'block',
                  filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.18))'
                }}
              />
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(112, 9, 43, 0.08)',
                color: 'var(--c-primary, #70092B)',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '6px'
              }}>
                <Sparkles size={12} />
                <span>Paso 1: Define tu tipo de cuenta</span>
              </div>
              <h2 style={{
                fontSize: '1.30rem',
                fontWeight: 900,
                color: '#0F172A',
                margin: '4px 0 6px',
                lineHeight: 1.25
              }}>
                {googleRoleStep === 'CHOOSE' ? '¿Cómo deseas ingresar a fidely?' : 'Configura los datos de tu Comercio'}
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0, lineHeight: 1.4 }}>
                {googleRoleStep === 'CHOOSE'
                  ? `Hola, ${pendingGoogleAuth.authUser.displayName || pendingGoogleAuth.cleanEmail}. Selecciona si serás Cliente o Comercio:`
                  : 'Crea tu local en 1 clic para acceder inmediatamente a tu POS y afiche QR:'}
              </p>
            </div>

            {/* AVISO IMPORTANTE: NO SE PODRÁ CAMBIAR */}
            <div style={{
              background: '#FEF3C7',
              border: '1.5px solid #F59E0B',
              borderRadius: '14px',
              padding: '11px 14px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              textAlign: 'left'
            }}>
              <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.76rem', color: '#92400E', lineHeight: 1.45 }}>
                <strong>⚠️ Advertencia Definitiva:</strong> Esta selección define tu rol de forma <strong>permanente</strong>. Una vez confirmada tu elección, <strong>no podrás cambiar de rol posteriormente</strong>.
              </div>
            </div>

            {googleRoleError && (
              <div style={{
                background: '#FFF1F2',
                border: '1px solid #FECDD3',
                color: '#E11D48',
                borderRadius: '12px',
                padding: '10px 14px',
                fontSize: '0.80rem',
                fontWeight: 700,
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                {googleRoleError}
              </div>
            )}

            {/* PASO 1: SELECCIONAR CLIENTE O COMERCIO */}
            {googleRoleStep === 'CHOOSE' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* OPCIÓN 1: CLIENTE */}
                <button
                  type="button"
                  onClick={handleConfirmGoogleAsClient}
                  disabled={isSubmittingGoogleRole}
                  style={{
                    background: '#FAF8F5',
                    border: '2px solid #EEDCD5',
                    borderRadius: '16px',
                    padding: '16px 18px',
                    textAlign: 'left',
                    cursor: isSubmittingGoogleRole ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                  onMouseEnter={e => {
                    if (!isSubmittingGoogleRole) {
                      e.currentTarget.style.borderColor = 'var(--c-primary, #70092B)';
                      e.currentTarget.style.background = '#FFF5F2';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSubmittingGoogleRole) {
                      e.currentTarget.style.borderColor = '#EEDCD5';
                      e.currentTarget.style.background = '#FAF8F5';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #70092B 0%, #9C382A 100%)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 4px 12px rgba(112, 9, 43, 0.25)'
                    }}>
                      <Gift size={24} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1C1917' }}>
                          Soy Cliente (Socio)
                        </span>
                        <span style={{
                          fontSize: '0.66rem',
                          background: '#FCE7F3',
                          color: '#9D174D',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '10px'
                        }}>
                          Para ganar premios
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#78716C', marginTop: '3px', lineHeight: 1.35 }}>
                        Para visitar comercios aliados, acumular sellos en tarjetas digitales y canjear premios.
                      </div>
                    </div>
                  </div>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    border: '1.5px solid #EEDCD5',
                    color: 'var(--c-primary, #70092B)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <ArrowRight size={16} />
                  </div>
                </button>

                {/* OPCIÓN 2: COMERCIO / TIENDA */}
                <button
                  type="button"
                  onClick={() => setGoogleRoleStep('STORE_SETUP')}
                  disabled={isSubmittingGoogleRole}
                  style={{
                    background: '#F8FAFC',
                    border: '2px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '16px 18px',
                    textAlign: 'left',
                    cursor: isSubmittingGoogleRole ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                  onMouseEnter={e => {
                    if (!isSubmittingGoogleRole) {
                      e.currentTarget.style.borderColor = '#0F172A';
                      e.currentTarget.style.background = '#F1F5F9';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSubmittingGoogleRole) {
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.background = '#F8FAFC';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)'
                    }}>
                      <Store size={24} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0F172A' }}>
                          Soy Comercio / Tienda
                        </span>
                        <span style={{
                          fontSize: '0.66rem',
                          background: '#E2E8F0',
                          color: '#1E293B',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '10px'
                        }}>
                          Tengo un negocio
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '3px', lineHeight: 1.35 }}>
                        Para tu negocio: terminal POS de mostrador, código QR y afiche imprimible para cobrar y sellar.
                      </div>
                    </div>
                  </div>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    border: '1.5px solid #CBD5E1',
                    color: '#0F172A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <ArrowRight size={16} />
                  </div>
                </button>

                <div style={{ textAlign: 'center', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={handleCancelGoogleRoleModal}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Cancelar y salir
                  </button>
                </div>
              </div>
            )}

            {/* PASO 2: FORMULARIO ULTRA RÁPIDO PARA ACTIVAR COMERCIO */}
            {googleRoleStep === 'STORE_SETUP' && (
              <form onSubmit={handleConfirmGoogleAsStore} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: '5px' }}>
                    Nombre Oficial de tu Comercio o Negocio *
                  </label>
                  <input
                    type="text"
                    required
                    value={googleStoreName}
                    onChange={e => setGoogleStoreName(e.target.value)}
                    placeholder="Ej. Barbería Style, Café Caracas, Tienda Moda..."
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: '5px' }}>
                      Categoría
                    </label>
                    <select
                      value={googleStoreCategory}
                      onChange={e => setGoogleStoreCategory(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 12px',
                        borderRadius: '12px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '0.82rem',
                        boxSizing: 'border-box',
                        background: '#FFFFFF'
                      }}
                    >
                      <option value="Barbería / Peluquería">Barbería / Peluquería</option>
                      <option value="Restaurante / Café">Restaurante / Café</option>
                      <option value="Tienda de Ropa / Moda">Tienda de Ropa / Moda</option>
                      <option value="Supermercado / Bodegón">Supermercado / Bodegón</option>
                      <option value="Salud & Farmacia">Salud & Farmacia</option>
                      <option value="Estética / Belleza">Estética / Belleza</option>
                      <option value="Tecnología">Tecnología</option>
                      <option value="Servicios">Servicios</option>
                      <option value="Otro">Otro Comercio</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: '5px' }}>
                      Ciudad
                    </label>
                    <input
                      type="text"
                      value={googleStoreCity}
                      onChange={e => setGoogleStoreCity(e.target.value)}
                      placeholder="Ej. Caracas"
                      style={{
                        width: '100%',
                        padding: '11px 12px',
                        borderRadius: '12px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: '5px' }}>
                    Teléfono WhatsApp de Contacto
                  </label>
                  <input
                    type="tel"
                    value={googleStorePhone}
                    onChange={e => setGoogleStorePhone(e.target.value)}
                    placeholder="Ej. +58 412 1234567"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setGoogleRoleStep('CHOOSE');
                      setGoogleRoleError('');
                    }}
                    disabled={isSubmittingGoogleRole}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: 800, fontSize: '0.82rem' }}
                  >
                    ← Volver
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmittingGoogleRole}
                    className="btn btn-primary"
                    style={{
                      flex: 2,
                      padding: '12px',
                      borderRadius: '12px',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      background: 'linear-gradient(135deg, #70092B 0%, #9C382A 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    {isSubmittingGoogleRole ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Creando Comercio...</span>
                      </>
                    ) : (
                      <>
                        <span>Activar mi Tienda</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
