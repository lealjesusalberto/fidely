import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import LandingPageView from './components/LandingPageView';
import POSView from './components/POSView';
import ClientPortalView from './components/ClientPortalView';
import AdminPanelView from './components/AdminPanelView';
import LoginView from './components/LoginView';
import PendingVerificationView from './components/PendingVerificationView';
import StoreSubscriptionPaywallView from './components/StoreSubscriptionPaywallView';
import { isStoreSubscriptionBlocked } from './utils/subscriptionUtils';
import ErrorBoundary from './components/ErrorBoundary';
import NotificationToast from './components/NotificationToast';
import FirebaseSyncModal from './components/FirebaseSyncModal';
import AllianceFloatingBanner from './components/AllianceFloatingBanner';
import { 
  DEFAULT_CONFIG, 
  INITIAL_STORES, 
  INITIAL_CLIENTS, 
  INITIAL_REWARDS, 
  INITIAL_PURCHASES, 
  INITIAL_MOVEMENTS, 
  INITIAL_REDEMPTIONS 
} from './data/initialData';
import { 
  COLLECTIONS,
  subscribeCollection,
  subscribeConfig,
  saveClient,
  saveStore,
  saveReward,
  savePurchase,
  saveMovement,
  saveRedemption,
  saveProduct,
  removeProduct,
  saveConfig,
  checkFirebaseConnection,
  getClientById,
  getClientByEmail,
  getStoreByEmail,
  checkIfUserIsAdmin,
  isUserRevoked
} from './firebase/firestoreService';
import { logoutFromFirebase, subscribeAuthState } from './firebase/authService';
import { fetchLiveDolarOficial, getCachedDolarRate } from './services/dolarService';
import { checkDuplicateClient } from './utils/clientValidation';
import { RotateCcw, ShieldCheck, Sparkles, LogIn, Flame, Cloud } from 'lucide-react';

export default function App() {
  // Load state from localStorage or initial defaults
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('fidely_config') || localStorage.getItem('cerca_config');
    const parsed = saved ? JSON.parse(saved) : { ...DEFAULT_CONFIG };
    const cachedDolar = getCachedDolarRate();
    if (cachedDolar?.rate) {
      parsed.vesExchangeRate = cachedDolar.rate;
    } else if (!parsed.vesExchangeRate || parsed.vesExchangeRate < 100) {
      parsed.vesExchangeRate = DEFAULT_CONFIG.vesExchangeRate;
    }
    return parsed;
  });

  const [stores, setStores] = useState(() => {
    const saved = localStorage.getItem('fidely_stores') || localStorage.getItem('cerca_stores');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(s => !s.name?.includes('Sambil Chacao') && s.id !== 'STR-00');
        }
      } catch (e) {}
    }
    return [];
  });

  const [clients, setClients] = useState(() => {
    const saved = localStorage.getItem('fidely_clients') || localStorage.getItem('cerca_clients');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(c => !c.name?.includes('Lucía Martínez') && c.id !== 'CLI-00');
        }
      } catch (e) {}
    }
    return [];
  });

  const [rewards, setRewards] = useState(() => {
    const saved = localStorage.getItem('fidely_rewards') || localStorage.getItem('cerca_rewards');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(r => !r.id?.startsWith('REW-0'));
        }
      } catch (e) {}
    }
    return [];
  });

  const [purchases, setPurchases] = useState(() => {
    const saved = localStorage.getItem('fidely_purchases') || localStorage.getItem('cerca_purchases');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter(p => !p.id?.startsWith('PUR-0'));
      } catch (e) {}
    }
    return [];
  });

  const [movements, setMovements] = useState(() => {
    const saved = localStorage.getItem('fidely_movements') || localStorage.getItem('cerca_movements');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter(m => !m.id?.startsWith('MOV-000'));
      } catch (e) {}
    }
    return [];
  });

  const [redemptions, setRedemptions] = useState(() => {
    const saved = localStorage.getItem('fidely_redemptions') || localStorage.getItem('cerca_redemptions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter(r => r.id !== 'RED-501' && r.id !== 'REQ-1108');
      } catch (e) {}
    }
    return [];
  });

  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('fidely_products');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  // Current User Session
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('fidely_user') || localStorage.getItem('cerca_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.client?.name?.includes('Lucía Martínez') || parsed.client?.id === 'CLI-00') {
          return null;
        }
        return parsed;
      } catch (e) {}
    }
    return null;
  });

  // Parametro de registro rapido en mostrador (?join=STORE_ID o ?store=STORE_ID)
  const [joinStoreId, setJoinStoreId] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('join') || params.get('store') || null;
    } catch (e) {
      return null;
    }
  });

  // Role / View: 'CLIENT' | 'POS' | 'ADMIN' | 'LANDING' | 'LOGIN'
  const [currentRole, setCurrentRole] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('join') || params.get('store')) {
        if (currentUser?.role === 'CLIENT') {
          return 'CLIENT';
        }
        return 'LOGIN';
      }
    } catch (e) {}
    return currentUser ? currentUser.role : 'LANDING';
  });

  const [selectedStore, setSelectedStore] = useState(() => {
    if (currentUser?.role === 'POS' && currentUser?.store) {
      return currentUser.store;
    }
    return stores[0] || null;
  });
  const [selectedClient, setSelectedClient] = useState(clients[0]);

  // Toast notification state
  const [toast, setToast] = useState(null);

  // Firebase Status & Modal
  const [firebaseStatus, setFirebaseStatus] = useState('connecting'); // 'connecting' | 'connected' | 'permission_denied' | 'offline'
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);

  // DolarApi (Venezuela) Live Exchange Rate State
  const [isFetchingDolarRate, setIsFetchingDolarRate] = useState(false);
  const [dolarRateInfo, setDolarRateInfo] = useState(null);

  const handleRefreshDolarRate = async (showNotification = false) => {
    setIsFetchingDolarRate(true);
    try {
      const res = await fetchLiveDolarOficial();
      if (res && res.rate) {
        setDolarRateInfo(res);
        setConfig(prev => {
          const updated = { ...prev, vesExchangeRate: res.rate };
          try {
            localStorage.setItem('fidely_config', JSON.stringify(updated));
          } catch (e) {}
          // Sincronizar en Cloud Firestore para mantener la misma tasa en todos los terminales
          saveConfig(updated);
          return updated;
        });
        if (showNotification) {
          handleNotify(`Tasa oficial actualizada: 1 USD = ${res.rate.toFixed(2)} VES (${res.source || 'BCV'})`, 'success');
        }
      } else if (showNotification) {
        handleNotify('No se pudo contactar los servidores de tasa oficial. Se mantiene la tasa actual.', 'warning');
      }
    } catch (e) {
      if (showNotification) {
        handleNotify('Error al consultar la cotización oficial del dólar', 'warning');
      }
    } finally {
      setIsFetchingDolarRate(false);
    }
  };

  // Consultar cotización oficial en vivo automáticamente al arrancar la app y cada 5 minutos
  useEffect(() => {
    handleRefreshDolarRate(false);
    const interval = setInterval(() => {
      handleRefreshDolarRate(false);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem('fidely_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('fidely_stores', JSON.stringify(stores));
    if (selectedStore) {
      const updated = stores.find(s => s.id === selectedStore.id);
      if (updated) setSelectedStore(updated);
    } else if (stores.length > 0) {
      setSelectedStore(stores[0]);
    }
  }, [stores]);

  useEffect(() => {
    localStorage.setItem('fidely_clients', JSON.stringify(clients));
    if (currentUser?.role === 'CLIENT' && currentUser?.client) {
      const cleanDoc = currentUser.client?.docId?.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
      const updated = clients.find(c => 
        (c.id === currentUser.client.id) ||
        (cleanDoc && c.docId?.replace(/[^A-Za-z0-9]/g, '').toLowerCase() === cleanDoc) ||
        (c.email && c.email.toLowerCase() === currentUser.client.email?.toLowerCase())
      );
      if (updated) {
        setSelectedClient(updated);
        setCurrentUser(prev => prev ? { ...prev, client: updated } : prev);
      }
    } else if (selectedClient) {
      const updated = clients.find(c => c.id === selectedClient.id);
      if (updated) setSelectedClient(updated);
    } else if (clients.length > 0) {
      setSelectedClient(clients[0]);
    }
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('fidely_rewards', JSON.stringify(rewards));
  }, [rewards]);

  useEffect(() => {
    localStorage.setItem('fidely_purchases', JSON.stringify(purchases));
  }, [purchases]);

  useEffect(() => {
    localStorage.setItem('fidely_movements', JSON.stringify(movements));
  }, [movements]);

  useEffect(() => {
    localStorage.setItem('fidely_redemptions', JSON.stringify(redemptions));
  }, [redemptions]);

  useEffect(() => {
    localStorage.setItem('fidely_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('fidely_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('fidely_user');
    }
  }, [currentUser]);

  // Sincronizar selectedStore estrictamente con la tienda de la sesión POS
  useEffect(() => {
    if (currentUser?.role === 'POS' && currentUser?.store?.id && stores.length > 0) {
      const match = stores.find(s => s.id === currentUser.store.id);
      if (match) {
        setSelectedStore(match);
      }
    }
  }, [stores, currentUser]);

  // Handle URL parameters for In-Store Counter QR code scanning (e.g. ?store=STR-01 o ?join=STR-01)
  useEffect(() => {
    try {
      if (currentUser?.role === 'POS') return; // Tienda autenticada queda fija en su propio local
      const params = new URLSearchParams(window.location.search);
      const storeParam = params.get('store') || params.get('join');
      if (storeParam && stores.length > 0) {
        const found = stores.find(s => 
          String(s.id || '').toLowerCase() === storeParam.toLowerCase() ||
          String(s.name || '').toLowerCase().includes(storeParam.toLowerCase())
        );
        if (found) {
          setSelectedStore(found);
          // Si el cliente ya tiene sesión activa en el teléfono, auto-vincular la tarjeta si no la tiene
          if (currentUser?.role === 'CLIENT' && currentUser?.client) {
            const currentCards = currentUser.client.loyaltyCards || [];
            const hasCard = currentCards.some(c => c.storeId === found.id);
            if (!hasCard) {
              const newCard = {
                storeId: found.id,
                storeName: found.name,
                logo: found.logo || '',
                cardColor: found.cardColor || '#9C382A',
                cardGradient: found.cardGradient || '',
                currentStamps: 0,
                stampsTarget: Number(found.stampsTarget || 6),
                rewardTitle: found.rewardTitle || 'Premio de Fidelidad',
                stampRewards: found.stampRewards || [],
                stampsHistory: []
              };
              const updatedClient = {
                ...currentUser.client,
                loyaltyCards: [newCard, ...currentCards]
              };
              saveClient(updatedClient);
              setCurrentUser(prev => ({ ...prev, client: updatedClient }));
              handleNotify(`¡Tarjeta de ${found.name} agregada a tu billetera!`, 'success');
            }
          }
        }
      }
    } catch (e) {}
  }, [stores, currentUser]);

  // 1. Sincronización en tiempo real de colecciones públicas (Configuración, Tiendas y Premios)
  useEffect(() => {
    const unsubs = [];
    try {
      // Configuración global (tasa oficial del dólar y reglas)
      const unsubConfig = subscribeConfig((remoteConfig) => {
        if (remoteConfig && Object.keys(remoteConfig).length > 0) {
          setConfig(prev => {
            const remoteRate = remoteConfig.vesExchangeRate;
            const rateToUse = (typeof remoteRate === 'number' && remoteRate >= 100) 
              ? remoteRate 
              : prev.vesExchangeRate;
            return {
              ...remoteConfig,
              vesExchangeRate: rateToUse
            };
          });
          setFirebaseStatus('connected');
        }
      });
      unsubs.push(unsubConfig);

      // Tiendas y sucursales
      const unsubStores = subscribeCollection(COLLECTIONS.STORES, (remoteStores) => {
        if (Array.isArray(remoteStores)) {
          setStores(remoteStores);
          setFirebaseStatus('connected');
        }
      });
      unsubs.push(unsubStores);

      // Catálogo de Recompensas
      const unsubRewards = subscribeCollection(COLLECTIONS.REWARDS, (remoteRewards) => {
        if (Array.isArray(remoteRewards)) {
          setRewards(remoteRewards);
        }
      });
      unsubs.push(unsubRewards);

      // Clientes (sincronización en tiempo real permitida por reglas RLS)
      const unsubClients = subscribeCollection(COLLECTIONS.CLIENTS, (remoteClients) => {
        if (Array.isArray(remoteClients)) {
          setClients(remoteClients);
        }
      });
      unsubs.push(unsubClients);

      // Canjes / Solicitudes en mostrador en tiempo real
      const unsubRedemptions = subscribeCollection(COLLECTIONS.REDEMPTIONS, (remoteRedemptions) => {
        if (Array.isArray(remoteRedemptions)) {
          setRedemptions(remoteRedemptions);
        }
      });
      unsubs.push(unsubRedemptions);

      // Catálogo de Productos y Servicios facturables
      const unsubProducts = subscribeCollection(COLLECTIONS.PRODUCTS, (remoteProducts) => {
        if (Array.isArray(remoteProducts)) {
          setProducts(remoteProducts);
        }
      });
      unsubs.push(unsubProducts);

      // Verificación de conectividad inicial contra documento de config pública
      checkFirebaseConnection().then(res => {
        if (res.connected) {
          setFirebaseStatus('connected');
        } else if (res.code === 'permission-denied') {
          setFirebaseStatus('permission_denied');
        } else {
          setFirebaseStatus('offline');
        }
      });
    } catch (e) {
      console.warn('[Firebase] Inicialización de sincronización pública:', e);
      setFirebaseStatus('offline');
    }

    return () => {
      unsubs.forEach(fn => {
        if (typeof fn === 'function') fn();
      });
    };
  }, []);

  // 2. Sincronización de colecciones protegidas (Clientes, Compras, Movimientos, Canjes)
  // Se activan cuando hay una sesión activa para cumplir las reglas RLS de seguridad
  useEffect(() => {
    const unsubs = [];
    const unsubAuth = subscribeAuthState((firebaseUser) => {
      // Limpiar listeners previos
      unsubs.forEach(fn => { if (typeof fn === 'function') fn(); });
      unsubs.length = 0;

      if (firebaseUser || currentUser) {
        setFirebaseStatus('connected');

        // Auto-reconciliación de seguridad: Si el usuario autenticado en Firebase Auth no tiene perfil en Firestore,
        // aprovisionarlo inmediatamente para garantizar que aparezca en el Panel Admin sin intervención manual
        if (firebaseUser && firebaseUser.email) {
          const uEmail = firebaseUser.email.toLowerCase().trim();
          const uUid = firebaseUser.uid;

          // Si el usuario fue eliminado/revocado por el administrador, JAMÁS re-crearlo
          isUserRevoked(uEmail).then(async (revokedByEmail) => {
            if (revokedByEmail) return;
            const revokedByUid = await isUserRevoked(uUid);
            if (revokedByUid) return;

            getClientById(uUid).then(async (c) => {
              if (!c) {
                const byEmail = await getClientByEmail(uEmail);
                if (!byEmail) {
                  const isAdmin = await checkIfUserIsAdmin(uUid, uEmail);
                  const store = await getStoreByEmail(uEmail);
                  if (!isAdmin && !store) {
                    const rawDocId = uUid.length >= 8 ? uUid.substring(0, 8).toUpperCase() : uUid;
                    const todayDate = new Date().toISOString().split('T')[0];
                    const autoClient = {
                      id: uUid,
                      firebaseUid: uUid,
                      docId: rawDocId,
                      qrCode: `FIDELY-${rawDocId}`,
                      name: firebaseUser.displayName || uEmail.split('@')[0],
                      initials: (firebaseUser.displayName || uEmail.split('@')[0]).split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'FC',
                      email: uEmail,
                      phone: firebaseUser.phoneNumber || '',
                      birthDate: '',
                      pointsBalance: 0,
                      storeBalances: { ALL: 0 },
                      tier: 'Cliente',
                      favoriteStoreId: 'ALL',
                      joinDate: todayDate,
                      memberSince: todayDate,
                      status: 'APROBADO',
                      createdAt: new Date().toISOString(),
                      registrationSource: 'AUTO_AUTH_SYNC',
                      registeredViaStoreId: 'FIREBASE_AUTH',
                      loyaltyCards: []
                    };
                    await saveClient(autoClient);
                    console.log('✅ [AutoAuthSync] Perfil de cliente aprovisionado automáticamente en Firestore para:', uEmail);
                  }
                }
              }
            }).catch(err => {
              console.warn('[AutoAuthSync] Error comprobando perfil:', err);
            });
          }).catch(err => {
            console.warn('[AutoAuthSync] Error comprobando revocación:', err);
          });
        }

        try {
          // Clientes
          unsubs.push(subscribeCollection(COLLECTIONS.CLIENTS, (remoteClients) => {
            if (Array.isArray(remoteClients)) {
              setClients(remoteClients);
            }
          }));

          // Compras
          unsubs.push(subscribeCollection(COLLECTIONS.PURCHASES, (remotePurchases) => {
            if (Array.isArray(remotePurchases)) {
              setPurchases(remotePurchases);
            }
          }));

          // Movimientos de puntos
          unsubs.push(subscribeCollection(COLLECTIONS.MOVEMENTS, (remoteMovements) => {
            if (Array.isArray(remoteMovements)) {
              setMovements(remoteMovements);
            }
          }));

          // Canjes
          unsubs.push(subscribeCollection(COLLECTIONS.REDEMPTIONS, (remoteRedemptions) => {
            if (Array.isArray(remoteRedemptions)) {
              setRedemptions(remoteRedemptions);
            }
          }));
        } catch (err) {
          console.warn('[Firebase RLS] Error al suscribir a datos protegidos:', err);
        }
      }
    });

    return () => {
      unsubAuth();
      unsubs.forEach(fn => {
        if (typeof fn === 'function') fn();
      });
    };
  }, [currentUser]);

  // Wrapped Setters that auto-sync delta updates directly to Cloud Firestore
  const handleSetStores = (newValOrFn) => {
    setStores(prev => {
      const next = typeof newValOrFn === 'function' ? newValOrFn(prev) : newValOrFn;
      if (Array.isArray(next)) {
        next.forEach(s => {
          const old = prev.find(p => p.id === s.id);
          if (!old || JSON.stringify(old) !== JSON.stringify(s)) {
            saveStore(s);
          }
        });
      }
      return next;
    });
  };

  // Wrapped Setters that auto-sync delta updates directly to Cloud Firestore
  const handleSetClients = (newValOrFn) => {
    setClients(prev => {
      const next = typeof newValOrFn === 'function' ? newValOrFn(prev) : newValOrFn;
      if (Array.isArray(next)) {
        next.forEach(c => {
          const old = prev.find(p => p.id === c.id);
          if (!old || JSON.stringify(old) !== JSON.stringify(c)) {
            saveClient(c);
          }
        });
      }
      return next;
    });
  };

  const handleSetPurchases = (newValOrFn) => {
    setPurchases(prev => {
      const next = typeof newValOrFn === 'function' ? newValOrFn(prev) : newValOrFn;
      if (Array.isArray(next)) {
        next.forEach(p => {
          const old = prev.find(item => item.id === p.id);
          if (!old || JSON.stringify(old) !== JSON.stringify(p)) {
            savePurchase(p);
          }
        });
      }
      return next;
    });
  };

  const handleSetMovements = (newValOrFn) => {
    setMovements(prev => {
      const next = typeof newValOrFn === 'function' ? newValOrFn(prev) : newValOrFn;
      if (Array.isArray(next)) {
        next.forEach(m => {
          const old = prev.find(item => item.id === m.id);
          if (!old || JSON.stringify(old) !== JSON.stringify(m)) {
            saveMovement(m);
          }
        });
      }
      return next;
    });
  };

  const handleSetRedemptions = (newValOrFn) => {
    setRedemptions(prev => {
      const next = typeof newValOrFn === 'function' ? newValOrFn(prev) : newValOrFn;
      if (Array.isArray(next)) {
        next.forEach(r => {
          const old = prev.find(item => item.id === r.id);
          if (!old || JSON.stringify(old) !== JSON.stringify(r)) {
            saveRedemption(r);
          }
        });
      }
      return next;
    });
  };

  const handleSetRewards = (newValOrFn) => {
    setRewards(prev => {
      const next = typeof newValOrFn === 'function' ? newValOrFn(prev) : newValOrFn;
      if (Array.isArray(next)) {
        next.forEach(r => {
          const old = prev.find(item => item.id === r.id);
          if (!old || JSON.stringify(old) !== JSON.stringify(r)) {
            saveReward(r);
          }
        });
      }
      return next;
    });
  };

  const handleSetProducts = (newValOrFn) => {
    setProducts(prev => {
      const next = typeof newValOrFn === 'function' ? newValOrFn(prev) : newValOrFn;
      if (Array.isArray(next)) {
        next.forEach(p => {
          const old = prev.find(item => item.id === p.id);
          if (!old || JSON.stringify(old) !== JSON.stringify(p)) {
            saveProduct(p);
          }
        });
      }
      return next;
    });
  };

  const handleSetConfig = (newValOrFn) => {
    setConfig(prev => {
      const next = typeof newValOrFn === 'function' ? newValOrFn(prev) : newValOrFn;
      if (JSON.stringify(prev) !== JSON.stringify(next)) {
        saveConfig(next);
      }
      return next;
    });
  };

  // Notify helper
  const handleNotify = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Handle Login
  const handleLogin = (user) => {
    setCurrentUser(user);
    if (user.role === 'CLIENT' && user.client) {
      setSelectedClient(user.client);
      setCurrentRole('CLIENT');
    } else if (user.role === 'POS' && user.store) {
      setSelectedStore(user.store);
      setCurrentRole('POS');
    } else if (user.role === 'ADMIN') {
      setCurrentRole('ADMIN');
    }
    handleNotify(`¡Bienvenido(a), ${user.name}!`, 'success');
  };

  // Handle Client Self-Registration (Saves locally and to Cloud Firestore)
  const handleRegisterClient = (newClientData) => {
    // Verificación final estricta de duplicados por Cédula, Correo o Teléfono
    const dupCheck = checkDuplicateClient({
      docId: newClientData.docId,
      email: newClientData.email,
      phone: newClientData.phone,
      name: newClientData.name
    }, clients);

    if (dupCheck.isDuplicate) {
      handleNotify(dupCheck.message, 'warning');
      if (dupCheck.existingClient) {
        handleLogin({
          role: 'CLIENT',
          client: dupCheck.existingClient,
          name: dupCheck.existingClient.name,
          initials: dupCheck.existingClient.initials
        });
      }
      return;
    }

    const existingClientNumbers = (clients || []).map(c => {
      const match = c.id && String(c.id).match(/^CLI-(\d+)$/i);
      return match ? parseInt(match[1], 10) : 0;
    });
    const maxClientNum = existingClientNumbers.length > 0 ? Math.max(...existingClientNumbers, 0) : 0;
    const fallbackId = `CLI-${String(maxClientNum + 1).padStart(2, '0')}`;
    const finalClientId = newClientData.firebaseUid || fallbackId;

    const newClient = {
      id: finalClientId,
      firebaseUid: newClientData.firebaseUid || null,
      name: newClientData.name.trim(),
      initials: newClientData.name.trim().split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'FC',
      phone: newClientData.phone.trim(),
      birthDate: (newClientData.birthDate || '').trim(),
      email: newClientData.email.trim(),
      docId: newClientData.docId.trim(),
      tier: 'Socia Esencial',
      pointsBalance: 0, // Cero puntos iniciales (los sellos se obtienen exclusivamente en mostrador)
      favoriteStoreId: null,
      hasSelectedWelcomeStore: true,
      loyaltyCards: [],
      storeBalances: stores.reduce((acc, st) => {
        acc[st.id] = 0;
        return acc;
      }, {}),
      nextGiftTarget: 500,
      nextGiftLabel: "5 US$",
      pointsExpiringSoon: 0,
      expiringDate: null,
      joinDate: new Date().toISOString().split('T')[0],
      qrCode: `FIDELY-${newClientData.docId.replace(/[^A-Za-z0-9]/g, '')}`,
      status: "PENDIENTE",
      totalSpentUsd: 0
    };

    // Save to Firestore
    saveClient(newClient);

    const updatedClients = [newClient, ...clients];
    setClients(updatedClients);
    localStorage.setItem('fidely_clients', JSON.stringify(updatedClients));

    // Auto-login into pending verification
    handleLogin({
      role: 'CLIENT',
      client: newClient,
      name: newClient.name,
      initials: newClient.initials
    });

    handleNotify(`¡Registro recibido, ${newClient.name}! Tu cuenta está en proceso de verificación por la administración.`, 'info');
  };

  // Handle Logout
  const handleLogout = () => {
    logoutFromFirebase().catch(() => {});
    setCurrentUser(null);
    setCurrentRole('LANDING');
    localStorage.removeItem('fidely_user');
    localStorage.removeItem('cerca_user');
    handleNotify('Sesión cerrada correctamente.', 'info');
  };

  // Reset to original demo data
  const handleResetData = () => {
    if (window.confirm('¿Deseas restablecer todos los datos a la configuración inicial de fidely CLUB?')) {
      setConfig(DEFAULT_CONFIG);
      setStores(INITIAL_STORES);
      setClients(INITIAL_CLIENTS);
      setRewards(INITIAL_REWARDS);
      setPurchases(INITIAL_PURCHASES);
      setMovements(INITIAL_MOVEMENTS);
      setRedemptions(INITIAL_REDEMPTIONS);
      setSelectedClient(INITIAL_CLIENTS[0]);
      setCurrentUser(null);
      setCurrentRole('LANDING');
      localStorage.clear();
      handleNotify('Datos del sistema restablecidos con éxito', 'success');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: currentRole === 'LOGIN' ? '#FAF8F5' : 'var(--bg-app)' }}>
      
      {/* Top Application Header */}
      {currentRole !== 'LOGIN' && currentRole !== 'CLIENT' && currentRole !== 'POS' && (
        <Header
          currentRole={currentRole}
          setCurrentRole={setCurrentRole}
          config={config}
          selectedStore={selectedStore}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenLogin={() => setCurrentRole('LOGIN')}
          firebaseStatus={firebaseStatus}
          onOpenFirebaseModal={() => setShowFirebaseModal(true)}
          isFetchingRate={isFetchingDolarRate}
          onRefreshDolarRate={() => handleRefreshDolarRate(true)}
          dolarRateInfo={dolarRateInfo}
        />
      )}

      {/* Main Content Router */}
      <main style={{
        flex: 1,
        display: (currentRole === 'POS' || currentRole === 'CLIENT') ? 'flex' : 'block',
        flexDirection: 'column',
        paddingBottom: (currentRole === 'CLIENT' || currentRole === 'LOGIN' || currentRole === 'POS') ? '0' : '30px',
        minWidth: 0,
        maxWidth: '100%',
        width: '100%',
        overflowX: 'hidden'
      }}>
        <ErrorBoundary onResetRole={() => setCurrentRole('LANDING')}>
        
        {/* 1. LOGIN & REGISTRO VIEW */}
        {currentRole === 'LOGIN' && (
          <LoginView
            clients={clients}
            stores={stores}
            setStores={handleSetStores}
            config={config}
            joinStoreId={joinStoreId}
            onClearJoinStore={() => {
              setJoinStoreId(null);
              try {
                window.history.replaceState({}, document.title, window.location.pathname);
              } catch (e) {}
            }}
            onLogin={handleLogin}
            onRegisterClient={handleRegisterClient}
            onGoToLanding={() => setCurrentRole('LANDING')}
          />
        )}

        {/* 2. PUBLIC LANDING PAGE */}
        {currentRole === 'LANDING' && (
          <LandingPageView
            onNavigate={() => setCurrentRole('LOGIN')}
            config={config}
          />
        )}

        {/* Floating Alliance Box for public visitors (Landing & Login) */}
        {(currentRole === 'LANDING' || currentRole === 'LOGIN') && (
          <AllianceFloatingBanner />
        )}

        {/* 3. CLIENT PORTAL (Guard with Pending Verification) */}
        {currentRole === 'CLIENT' && (
          selectedClient?.status === 'PENDIENTE' || selectedClient?.status === 'RECHAZADO' ? (
            <PendingVerificationView
              type="CLIENT"
              data={selectedClient}
              clients={clients}
              stores={stores}
              config={config}
              onUpdateClient={(up) => {
                setSelectedClient(up);
                handleSetClients(prev => prev.map(c => c.id === up.id ? up : c));
              }}
              onNotify={handleNotify}
              onRefresh={() => {
                const refreshed = clients.find(c => c.id === selectedClient?.id);
                if (refreshed) setSelectedClient(refreshed);
              }}
              onProceed={(approvedClient) => {
                setSelectedClient(approvedClient);
              }}
              onLogout={handleLogout}
            />
          ) : (
            <ClientPortalView
              selectedClient={selectedClient}
              clients={clients}
              setClients={handleSetClients}
              rewards={rewards}
              redemptions={redemptions}
              setRedemptions={handleSetRedemptions}
              movements={movements}
              setMovements={handleSetMovements}
              config={config}
              stores={stores}
              purchases={purchases}
              onNotify={handleNotify}
              onLogout={handleLogout}
              onNavigate={setCurrentRole}
            />
          )
        )}

        {/* 4. POS STORE TERMINAL (Guard with Pending Verification, Subscription Paywall & Store Onboarding) */}
        {currentRole === 'POS' && (
          selectedStore?.status === 'PENDIENTE' || selectedStore?.status === 'RECHAZADO' ? (
            <PendingVerificationView
              type="STORE"
              data={selectedStore}
              stores={stores}
              onRefresh={() => {
                const refreshed = stores.find(s => s.id === selectedStore?.id);
                if (refreshed) setSelectedStore(refreshed);
              }}
              onProceed={(approvedStore) => {
                setSelectedStore(approvedStore);
              }}
              onLogout={handleLogout}
            />
          ) : isStoreSubscriptionBlocked(selectedStore, config) ? (
            <StoreSubscriptionPaywallView
              store={selectedStore}
              stores={stores}
              config={config}
              dolarRateInfo={dolarRateInfo}
              onRefresh={() => {
                const refreshed = stores.find(s => s.id === selectedStore?.id);
                if (refreshed) setSelectedStore(refreshed);
              }}
              onNotify={handleNotify}
              onLogout={handleLogout}
            />
          ) : (
            <POSView
              stores={stores}
              selectedStore={selectedStore}
              onSelectStore={setSelectedStore}
              setStores={handleSetStores}
              clients={clients}
              setClients={handleSetClients}
              purchases={purchases}
              setPurchases={handleSetPurchases}
              movements={movements}
              setMovements={handleSetMovements}
              rewards={rewards}
              setRewards={handleSetRewards}
              products={products}
              setProducts={handleSetProducts}
              redemptions={redemptions}
              setRedemptions={handleSetRedemptions}
              config={config}
              onNotify={handleNotify}
              onLogout={handleLogout}
              onNavigate={setCurrentRole}
              currentUser={currentUser}
              firebaseStatus={firebaseStatus}
              onOpenFirebaseModal={() => setShowFirebaseModal(true)}
              isFetchingRate={isFetchingDolarRate}
              onRefreshDolarRate={() => handleRefreshDolarRate(true)}
              dolarRateInfo={dolarRateInfo}
            />
          )
        )}

        {/* 5. ADMIN CONSOLE & RULES CONFIG */}
        {currentRole === 'ADMIN' && (
          <AdminPanelView
            clients={clients}
            setClients={handleSetClients}
            purchases={purchases}
            setPurchases={handleSetPurchases}
            stores={stores}
            setStores={handleSetStores}
            rewards={rewards}
            setRewards={handleSetRewards}
            movements={movements}
            setMovements={handleSetMovements}
            redemptions={redemptions}
            setRedemptions={handleSetRedemptions}
            config={config}
            setConfig={handleSetConfig}
            onNotify={handleNotify}
            onNavigate={setCurrentRole}
            onSelectStore={setSelectedStore}
            isFetchingDolarRate={isFetchingDolarRate}
            onRefreshDolarRate={() => handleRefreshDolarRate(true)}
          />
        )}
        </ErrorBoundary>
      </main>

      {/* Global Toast Alert */}
      <NotificationToast toast={toast} onClose={() => setToast(null)} />

      {/* Firebase Cloud Sync Modal */}
      <FirebaseSyncModal
        isOpen={showFirebaseModal}
        onClose={() => setShowFirebaseModal(false)}
        localData={{
          config,
          stores,
          clients,
          rewards,
          purchases,
          movements,
          redemptions
        }}
        firebaseStatus={firebaseStatus}
        onNotify={handleNotify}
        onRefreshData={() => {
          checkFirebaseConnection().then(res => {
            if (res.connected) setFirebaseStatus('connected');
          });
        }}
      />
    </div>
  );
}
