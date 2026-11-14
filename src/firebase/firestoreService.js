import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  runTransaction
} from "firebase/firestore";
import { ref, get, query, orderByChild, equalTo, remove as dbRemove } from "firebase/database";
import { db, rtdb } from "./config";

// Nombres de colecciones en Firestore
export const COLLECTIONS = {
  CONFIG: "config",
  STORES: "stores",
  CLIENTS: "clients",
  REWARDS: "rewards",
  PURCHASES: "purchases",
  MOVEMENTS: "movements",
  REDEMPTIONS: "redemptions",
  ADMINS: "admins",
  DELETED_USERS: "deletedUsers",
  PRODUCTS: "products"
};

/**
 * Escucha cambios en tiempo real en una colección de Firestore
 */
export function subscribeCollection(collectionName, onData, onError) {
  try {
    const colRef = collection(db, collectionName);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items = [];
        snapshot.forEach((docSnap) => {
          items.push({ ...docSnap.data(), id: docSnap.id });
        });
        onData(items);
      },
      (error) => {
        console.warn(`[Firebase] Error al sincronizar colección ${collectionName}:`, error.message);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.warn(`[Firebase] Excepción al suscribir a ${collectionName}:`, err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Escucha cambios en tiempo real en el documento de configuración global
 */
export function subscribeConfig(onData, onError) {
  try {
    const configDocRef = doc(db, COLLECTIONS.CONFIG, "global");
    return onSnapshot(
      configDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          onData(docSnap.data());
        }
      },
      (error) => {
        console.warn("[Firebase] Error al sincronizar configuración:", error.message);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Guarda o actualiza un documento en Firestore
 */
export async function saveDocument(collectionName, docId, data) {
  try {
    const cleanId = String(docId || data.id || Date.now());
    const docRef = doc(db, collectionName, cleanId);
    await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
    return { success: true, id: cleanId };
  } catch (error) {
    console.error(`[Firebase] Error al guardar documento en ${collectionName}/${docId}:`, error);
    return { success: false, error };
  }
}

/**
 * Helpers específicos para guardar entidades
 */
export const saveClient = (client) => saveDocument(COLLECTIONS.CLIENTS, client.id, client);
export const deleteClientDoc = async (clientId) => {
  try {
    if (!clientId) return false;
    await deleteDoc(doc(db, COLLECTIONS.CLIENTS, String(clientId)));
    return true;
  } catch (e) {
    console.warn('[Firebase] Error al eliminar documento de cliente:', e);
    return false;
  }
};
export const saveStore = (store) => saveDocument(COLLECTIONS.STORES, store.id, store);
export const saveReward = (reward) => saveDocument(COLLECTIONS.REWARDS, reward.id, reward);
export const savePurchase = (purchase) => saveDocument(COLLECTIONS.PURCHASES, purchase.id, purchase);
export const saveMovement = (movement) => saveDocument(COLLECTIONS.MOVEMENTS, movement.id, movement);
export const saveRedemption = (redemption) => saveDocument(COLLECTIONS.REDEMPTIONS, redemption.id, redemption);
export const saveProduct = (product) => saveDocument(COLLECTIONS.PRODUCTS, product.id, product);
export const saveConfig = (configData) => saveDocument(COLLECTIONS.CONFIG, "global", configData);

/**
 * Consulta un cliente directamente por su UID en Firestore
 */
export async function getClientById(clientId) {
  try {
    if (!clientId) return null;
    const docRef = doc(db, COLLECTIONS.CLIENTS, String(clientId));
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...snap.data(), id: snap.id };
    }
  } catch (e) {
    console.warn('[Firebase] Error al consultar cliente por id:', e);
  }
  return null;
}

/**
 * Busca un cliente en Firestore por su número de documento / cédula
 */
export async function getClientByDocId(cedula) {
  try {
    if (!cedula) return null;
    const clean = String(cedula).replace(/[^0-9]/g, '');
    const colRef = collection(db, COLLECTIONS.CLIENTS);
    const snap = await getDocs(colRef);
    let matched = null;
    snap.forEach(d => {
      const data = d.data();
      const docClean = (data.docId || '').replace(/[^0-9]/g, '');
      if (docClean && docClean === clean) {
        matched = { ...data, id: d.id };
      }
    });
    return matched;
  } catch (e) {
    console.warn('[Firebase] Error al buscar cliente por cédula:', e);
  }
  return null;
}

/**
 * Busca un cliente en Firestore por su correo electrónico
 */
export async function getClientByEmail(email) {
  try {
    if (!email) return null;
    const clean = String(email).trim().toLowerCase();
    const colRef = collection(db, COLLECTIONS.CLIENTS);
    const snap = await getDocs(colRef);
    let matched = null;
    snap.forEach(d => {
      const data = d.data();
      if ((data.email || '').trim().toLowerCase() === clean) {
        matched = { ...data, id: d.id };
      }
    });
    return matched;
  } catch (e) {
    console.warn('[Firebase] Error al buscar cliente por email:', e);
    return null;
  }
}

/**
 * Busca una tienda en Firestore por su correo electrónico
 */
export async function getStoreByEmail(email) {
  try {
    if (!email) return null;
    const clean = String(email).trim().toLowerCase();
    const colRef = collection(db, COLLECTIONS.STORES);
    const snap = await getDocs(colRef);
    let matched = null;
    snap.forEach(d => {
      const data = d.data();
      if ((data.email || '').trim().toLowerCase() === clean) {
        matched = { ...data, id: d.id };
      }
    });
    return matched;
  } catch (e) {
    console.warn('[Firebase] Error al buscar tienda por email:', e);
    return null;
  }
}

/**
 * Elimina un documento de Firestore
 */
export async function removeDocument(collectionName, docId) {
  try {
    const docRef = doc(db, collectionName, String(docId));
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error(`[Firebase] Error al eliminar documento ${collectionName}/${docId}:`, error);
    return { success: false, error };
  }
}

/**
 * Helpers específicos para eliminar entidades con purga permanente en Cloud Firestore y RTDB
 */
export async function removeStore(storeId, storeData = {}) {
  try {
    const cleanId = String(storeId);
    const sEmail = (storeData.email || '').trim().toLowerCase();
    const sUid = storeData.firebaseUid || cleanId;

    // 1. Eliminar de Cloud Firestore
    await removeDocument(COLLECTIONS.STORES, cleanId);
    if (sUid && sUid !== cleanId) {
      await removeDocument(COLLECTIONS.STORES, sUid);
    }

    // 2. Eliminar de Realtime Database (RTDB)
    if (rtdb) {
      try {
        await dbRemove(ref(rtdb, `user_comercio/${cleanId}`));
        if (sUid && sUid !== cleanId) {
          await dbRemove(ref(rtdb, `user_comercio/${sUid}`));
        }
        await dbRemove(ref(rtdb, `comercios/${cleanId}`));
        if (sUid && sUid !== cleanId) {
          await dbRemove(ref(rtdb, `comercios/${sUid}`));
        }
        if (sEmail) {
          const comSnap = await get(ref(rtdb, 'user_comercio'));
          if (comSnap.exists()) {
            const allCom = comSnap.val() || {};
            for (const [k, v] of Object.entries(allCom)) {
              if (v && (v.email || '').toLowerCase().trim() === sEmail) {
                await dbRemove(ref(rtdb, `user_comercio/${k}`));
              }
            }
          }
        }
      } catch (rtdbErr) {
        console.warn('[removeStore] Error al limpiar en RTDB:', rtdbErr);
      }
    }

    // 3. Registrar en lista negra permanente (deletedUsers)
    const blacklists = [cleanId];
    if (sUid && sUid !== cleanId) blacklists.push(sUid);
    if (sEmail) blacklists.push(sEmail);

    for (const idf of blacklists) {
      await registerDeletedUser(idf, {
        storeId: cleanId,
        email: sEmail,
        type: 'STORE',
        name: storeData.name || 'Comercio'
      });
    }

    return { success: true };
  } catch (error) {
    console.error(`[Firebase] Error al eliminar tienda ${storeId}:`, error);
    return { success: false, error };
  }
}

export async function removeClient(clientId, clientData = {}) {
  try {
    const cleanId = String(clientId);
    const uEmail = (clientData.email || '').trim().toLowerCase();
    const uUid = clientData.firebaseUid || cleanId;
    const docId = (clientData.docId || '').trim();

    // 1. Eliminar de Cloud Firestore
    await removeDocument(COLLECTIONS.CLIENTS, cleanId);
    if (uUid && uUid !== cleanId) {
      await removeDocument(COLLECTIONS.CLIENTS, uUid);
    }

    // 2. Eliminar de Realtime Database (RTDB)
    if (rtdb) {
      try {
        await dbRemove(ref(rtdb, `users/${cleanId}`));
        if (uUid && uUid !== cleanId) {
          await dbRemove(ref(rtdb, `users/${uUid}`));
        }
        // Buscar por email en RTDB users y eliminar cualquier nodo residual
        if (uEmail) {
          const snap = await get(ref(rtdb, 'users'));
          if (snap.exists()) {
            const allUsers = snap.val() || {};
            for (const [k, v] of Object.entries(allUsers)) {
              if (v && (v.email || '').toLowerCase().trim() === uEmail) {
                await dbRemove(ref(rtdb, `users/${k}`));
              }
            }
          }
        }
      } catch (rtdbErr) {
        console.warn('[removeClient] Error al limpiar en RTDB:', rtdbErr);
      }
    }

    // 3. Registrar en lista negra permanente (deletedUsers)
    const blacklists = [cleanId];
    if (uUid && uUid !== cleanId) blacklists.push(uUid);
    if (uEmail) blacklists.push(uEmail);
    if (docId) blacklists.push(docId);

    for (const idf of blacklists) {
      await registerDeletedUser(idf, {
        clientId: cleanId,
        email: uEmail,
        docId: docId,
        type: 'CLIENT',
        name: clientData.name || 'Cliente'
      });
    }

    return { success: true };
  } catch (error) {
    console.error(`[Firebase] Error al eliminar cliente ${clientId}:`, error);
    return { success: false, error };
  }
}

export const removeProduct = (productId) => removeDocument(COLLECTIONS.PRODUCTS, productId);

/**
 * Registra una cuenta eliminada/revocada en Firestore para bloqueo permanente
 */
export async function registerDeletedUser(identifier, metadata = {}) {
  try {
    if (!identifier) return { success: false };
    const cleanId = String(identifier).trim().toLowerCase();
    const docRef = doc(db, COLLECTIONS.DELETED_USERS, cleanId);
    await setDoc(docRef, {
      identifier: cleanId,
      deletedAt: new Date().toISOString(),
      deletedBy: 'ADMIN',
      ...metadata
    }, { merge: true });
    return { success: true };
  } catch (err) {
    console.warn('[Firebase] Error al registrar usuario eliminado:', err);
    return { success: false, error: err };
  }
}

/**
 * Comprueba si una cuenta/correo ha sido dada de baja por el Administrador
 */
export async function isUserRevoked(identifier) {
  try {
    if (!identifier) return false;
    const cleanId = String(identifier).trim().toLowerCase();
    const docRef = doc(db, COLLECTIONS.DELETED_USERS, cleanId);
    const snap = await getDoc(docRef);
    return snap.exists();
  } catch (err) {
    return false;
  }
}

/**
 * Remueve una cuenta de la lista de revocadas/eliminadas (desbloqueo/reincorporación)
 */
export async function unrevokeUser(identifier) {
  try {
    if (!identifier) return { success: false };
    const cleanId = String(identifier).trim().toLowerCase();
    const docRef = doc(db, COLLECTIONS.DELETED_USERS, cleanId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err) {
    console.warn('[Firebase] Error al des-revocar usuario:', err);
    return { success: false, error: err };
  }
}

/**
 * Sube por lote (batch) los datos iniciales completos a Firebase Firestore
 */
export async function seedDatabaseToFirebase(data) {
  try {
    const batch = writeBatch(db);

    // 1. Configuración
    if (data.config) {
      const configRef = doc(db, COLLECTIONS.CONFIG, "global");
      batch.set(configRef, data.config, { merge: true });
    }

    // 2. Tiendas
    if (Array.isArray(data.stores)) {
      data.stores.forEach((store) => {
        const ref = doc(db, COLLECTIONS.STORES, store.id);
        batch.set(ref, store, { merge: true });
      });
    }

    // 3. Clientes
    if (Array.isArray(data.clients)) {
      data.clients.forEach((client) => {
        const ref = doc(db, COLLECTIONS.CLIENTS, client.id);
        batch.set(ref, client, { merge: true });
      });
    }

    // 4. Recompensas
    if (Array.isArray(data.rewards)) {
      data.rewards.forEach((reward) => {
        const ref = doc(db, COLLECTIONS.REWARDS, reward.id);
        batch.set(ref, reward, { merge: true });
      });
    }

    // 5. Compras
    if (Array.isArray(data.purchases)) {
      data.purchases.forEach((purchase) => {
        const ref = doc(db, COLLECTIONS.PURCHASES, purchase.id);
        batch.set(ref, purchase, { merge: true });
      });
    }

    // 6. Movimientos
    if (Array.isArray(data.movements)) {
      data.movements.forEach((movement) => {
        const ref = doc(db, COLLECTIONS.MOVEMENTS, movement.id);
        batch.set(ref, movement, { merge: true });
      });
    }

    // 7. Canjes
    if (Array.isArray(data.redemptions)) {
      data.redemptions.forEach((redemption) => {
        const ref = doc(db, COLLECTIONS.REDEMPTIONS, redemption.id);
        batch.set(ref, redemption, { merge: true });
      });
    }

    await batch.commit();
    return { success: true, count: (data.clients?.length || 0) + (data.stores?.length || 0) };
  } catch (error) {
    console.error("[Firebase] Error al sincronizar lote inicial:", error);
    return { success: false, error };
  }
}

/**
 * Elimina todos los documentos de una colección en Cloud Firestore
 */
export async function clearCollection(collectionName) {
  try {
    const colRef = collection(db, collectionName);
    const snap = await getDocs(colRef);
    if (snap.size === 0) return { success: true, deleted: 0 };

    const batch = writeBatch(db);
    snap.forEach((docSnap) => {
      batch.delete(doc(db, collectionName, docSnap.id));
    });
    await batch.commit();
    return { success: true, deleted: snap.size };
  } catch (error) {
    console.error(`[Firebase] Error al vaciar colección ${collectionName}:`, error);
    return { success: false, error };
  }
}

/**
 * Limpieza integral de Base de Datos para puesta en producción / pruebas limpias
 * Permite borrar transacciones, canjes, movimientos y opcionalmente reiniciar clientes/tiendas
 */
export async function cleanDatabaseForProduction({
  clearPurchases = true,
  clearMovements = true,
  clearRedemptions = true,
  clearClients = false,
  clearStores = false
} = {}) {
  const results = {};
  if (clearPurchases) results.purchases = await clearCollection(COLLECTIONS.PURCHASES);
  if (clearMovements) results.movements = await clearCollection(COLLECTIONS.MOVEMENTS);
  if (clearRedemptions) results.redemptions = await clearCollection(COLLECTIONS.REDEMPTIONS);
  if (clearClients) results.clients = await clearCollection(COLLECTIONS.CLIENTS);
  if (clearStores) results.stores = await clearCollection(COLLECTIONS.STORES);
  return results;
}

/**
 * Verifica el estado de conexión con Firebase Firestore
 */
export async function checkFirebaseConnection() {
  try {
    const configRef = doc(db, COLLECTIONS.CONFIG, "global");
    await getDoc(configRef);
    return { 
      connected: true, 
      message: "Conectado a Cloud Firestore (Sincronización en la nube activa)"
    };
  } catch (error) {
    const isPermissionError = error?.code === "permission-denied";
    return {
      connected: false,
      code: error?.code,
      message: isPermissionError
        ? "Conectado al proyecto fidelyclub-a70ea. Reglas de seguridad pendientes en la consola de Firebase."
        : error.message
    };
  }
}

/**
 * Verifica si un usuario autenticado tiene rol de Administrador.
 * Consulta tanto Cloud Firestore como Firebase Realtime Database (Conecta 2).
 * El administrador de Conecta 2 registrado en Realtime Database con role === 'admin'
 * es automáticamente el Administrador de fidely.
 */
export async function checkIfUserIsAdmin(uid, email) {
  try {
    if (!uid && !email) return false;

    // 1. Verificar documento en colección 'admins' por UID en Firestore
    if (uid) {
      const adminDoc = await getDoc(doc(db, COLLECTIONS.ADMINS, uid));
      if (adminDoc.exists()) {
        const d = adminDoc.data();
        if (d.role === 'ADMIN' || d.isAdmin === true || !d.role) return true;
      }
    }

    // 2. Verificar documento en colección 'admins' por email en minúsculas en Firestore
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const adminDocEmail = await getDoc(doc(db, COLLECTIONS.ADMINS, cleanEmail));
      if (adminDocEmail.exists()) return true;
    }

    // 3. Verificar en config global si existe campo adminEmails o adminUids
    const configDoc = await getDoc(doc(db, COLLECTIONS.CONFIG, "global"));
    if (configDoc.exists()) {
      const data = configDoc.data();
      if (Array.isArray(data.adminEmails)) {
        if (data.adminEmails.some(e => e.toLowerCase() === email?.toLowerCase())) return true;
      }
      if (Array.isArray(data.adminUids)) {
        if (data.adminUids.includes(uid)) return true;
      }
    }

    // 4. Conecta 2 Realtime Database: Verificar por UID en 'users/{uid}'
    if (uid && rtdb) {
      try {
        const userRef = ref(rtdb, `users/${uid}`);
        const snap = await get(userRef);
        if (snap.exists()) {
          const uData = snap.val();
          const r = String(uData?.role || '').toLowerCase().trim();
          if (r === 'admin' || r === 'superadmin' || uData?.isAdmin === true) {
            console.log('👑 [Admin Conecta2 -> fidely] Admin verificado por UID en Realtime Database:', uid);
            // Sincronizar en Firestore 'admins' para coherencia total
            try {
              await saveAdmin({
                uid: uid,
                email: email || uData?.email || '',
                name: uData?.name || uData?.nombre || 'Administrador Conecta2 & fidely',
                role: 'ADMIN',
                source: 'conecta2_realtime'
              });
            } catch (syncErr) {
              console.warn('[Sync Admin RTDB -> Firestore] Error guardando admin:', syncErr);
            }
            return true;
          }
        }
      } catch (rtdbErr) {
        console.warn("[RTDB Admin Check by UID] Error:", rtdbErr);
      }
    }

    // 5. Conecta 2 Realtime Database: Verificar por Email indexado
    if (email && rtdb) {
      try {
        const cleanEmail = email.trim().toLowerCase();
        const emailQuery = query(ref(rtdb, 'users'), orderByChild('email'), equalTo(cleanEmail));
        const snap = await get(emailQuery);
        if (snap.exists()) {
          const data = snap.val();
          for (const [rtdbUid, uData] of Object.entries(data)) {
            const r = String(uData?.role || '').toLowerCase().trim();
            if (r === 'admin' || r === 'superadmin' || uData?.isAdmin === true) {
              console.log('👑 [Admin Conecta2 -> fidely] Admin verificado por Email en Realtime Database:', cleanEmail);
              try {
                await saveAdmin({
                  uid: rtdbUid,
                  email: cleanEmail,
                  name: uData?.name || uData?.nombre || 'Administrador Conecta2 & fidely',
                  role: 'ADMIN',
                  source: 'conecta2_realtime'
                });
              } catch (e) {}
              return true;
            }
          }
        }
      } catch (rtdbErr) {
        console.warn("[RTDB Admin Check by Email] Error:", rtdbErr);
      }
    }

    return false;
  } catch (err) {
    console.warn("[Firebase] Error al verificar permisos de administrador:", err);
    return false;
  }
}

/**
 * Registra o actualiza un Administrador en Cloud Firestore
 */
export async function saveAdmin(adminData) {
  try {
    const docId = adminData.uid || adminData.email.trim().toLowerCase();
    const adminRef = doc(db, COLLECTIONS.ADMINS, docId);
    await setDoc(adminRef, {
      ...adminData,
      role: 'ADMIN',
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return { success: true };
  } catch (err) {
    console.error("[Firebase] Error al guardar administrador:", err);
    return { success: false, error: err };
  }
}


/**
 * Reclama atómicamente un cupón de promoción flash garantizando no sobreventa (evita concurrencia)
 */
export async function claimStorePromotionCoupon(promoId, client) {
  if (!promoId || !client?.id) {
    throw new Error('Datos incompletos para reclamar el cupón');
  }

  const promoRef = doc(db, 'store_promotions', promoId);

  return await runTransaction(db, async (transaction) => {
    const promoDoc = await transaction.get(promoRef);
    if (!promoDoc.exists()) {
      throw new Error('La promoción ya no está disponible');
    }

    const data = promoDoc.data();

    // 1. Verificar si ya fue finalizada o expiró
    const statusUpper = String(data.status || '').toUpperCase().trim();
    if (['FINALIZADO', 'FINALIZADA', 'VENCIDO', 'VENCIDA', 'INACTIVO', 'INACTIVA', 'CANCELADO', 'CANCELADA', 'AGOTADO', 'AGOTADA'].includes(statusUpper)) {
      throw new Error('Esta promoción ya ha sido finalizada');
    }
    const now = new Date();
    if (data.expiredAt && now >= new Date(data.expiredAt)) {
      throw new Error('Esta promoción ya ha sido finalizada');
    }
    if (data.expiresAt && now > new Date(data.expiresAt)) {
      throw new Error('Esta promoción ya ha expirado');
    }
    if (data.validityDate && now.toISOString().slice(0, 10) > data.validityDate) {
      throw new Error('Esta promoción ya ha expirado');
    }

    // 2. Verificar si el usuario ya la tomó
    const claimedUsers = Array.isArray(data.claimedUserIds) ? [...data.claimedUserIds] : [];
    if (claimedUsers.includes(client.id)) {
      throw new Error('Ya has reclamado este cupón');
    }

    // 3. Concurrencia atómica: verificar cupos si no es ilimitado
    const isUnlimited = !!data.isUnlimited;
    const remainingStock = Number(data.remainingStock ?? data.totalStock ?? 0);
    const totalStock = Number(data.totalStock || 0);

    if (!isUnlimited && remainingStock <= 0) {
      throw new Error('¡Cupos agotados! Ya no quedan cupones disponibles.');
    }

    const newRemaining = isUnlimited ? totalStock : Math.max(0, remainingStock - 1);
    const newClaimedCount = Number(data.claimedCount || 0) + 1;
    claimedUsers.push(client.id);

    // 4. Crear el comprobante de canje en colección 'redemptions'
    const voucherCode = `CUPON-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    const existingVouchers = (data.claimedVouchers && typeof data.claimedVouchers === 'object') ? { ...data.claimedVouchers } : {};
    existingVouchers[client.id] = voucherCode;

    // Actualizar documento de la promoción
    transaction.update(promoRef, {
      remainingStock: newRemaining,
      claimedCount: newClaimedCount,
      claimedUserIds: claimedUsers,
      claimedVouchers: existingVouchers,
      status: (!isUnlimited && newRemaining <= 0) ? 'AGOTADA' : 'ACTIVA'
    });

    const voucherRef = doc(db, 'redemptions', voucherCode);
    const voucherData = {
      id: voucherCode,
      voucherCode: voucherCode,
      promoId: promoId,
      clientId: client.id,
      clientDocId: client.cedula || client.docId || '',
      clientName: client.name || 'Cliente Aliado',
      clientPhone: client.phone || '',
      storeId: data.storeId,
      storeName: data.storeName,
      title: data.title,
      rewardTitle: data.title,
      description: data.message,
      type: 'PROMO_COUPON',
      isPromotionalCoupon: true,
      used: false,
      badgeType: data.badgeType || 'PROMO',
      imageUrl: data.imageUrl || null,
      validityType: data.validityType || 'UNTIL_DATE',
      validityDate: data.validityDate || '',
      expiresAt: data.expiresAt || null,
      status: 'DISPONIBLE',
      createdAt: new Date().toISOString(),
      qrPayload: `FIDELY-COUPON-${voucherCode}-${data.storeId}-${client.id}`
    };

    transaction.set(voucherRef, voucherData);

    return voucherData;
  });
}

/**
 * Sincroniza automáticamente los comercios (user_comercio) y clientes (users)
 * de Firebase Realtime Database (Conecta2) hacia Cloud Firestore (fidely CLUB),
 * garantizando que todo usuario registrado por cualquier vía aparezca en el Panel Admin.
 */
export async function syncRtdbToFirestore() {
  if (!rtdb) return { success: false, message: 'RTDB no inicializada' };
  
  let storesAdded = 0;
  let clientsAdded = 0;

  try {
    // 0. Obtener lista negra permanente de usuarios y tiendas revocados/eliminados
    const deletedSnap = await getDocs(collection(db, COLLECTIONS.DELETED_USERS));
    const deletedSet = new Set();
    deletedSnap.forEach(d => {
      const data = d.data();
      deletedSet.add(d.id.toLowerCase().trim());
      if (data.identifier) deletedSet.add(String(data.identifier).toLowerCase().trim());
      if (data.email) deletedSet.add(String(data.email).toLowerCase().trim());
      if (data.clientId) deletedSet.add(String(data.clientId).toLowerCase().trim());
      if (data.storeId) deletedSet.add(String(data.storeId).toLowerCase().trim());
      if (data.docId) deletedSet.add(String(data.docId).toLowerCase().trim());
    });

    // 1. Obtener tiendas actuales en Firestore
    const storesSnap = await getDocs(collection(db, COLLECTIONS.STORES));
    const firestoreStores = [];
    storesSnap.forEach(d => firestoreStores.push({ ...d.data(), id: d.id }));
    const existingStoreEmails = new Set(firestoreStores.map(s => (s.email || '').toLowerCase().trim()).filter(Boolean));
    const existingStoreUids = new Set(firestoreStores.map(s => s.firebaseUid || s.id).filter(Boolean));
    const existingStoreNames = new Set(firestoreStores.map(s => (s.name || '').toLowerCase().trim()).filter(Boolean));

    // 2. Obtener user_comercio de RTDB
    const comSnap = await get(ref(rtdb, 'user_comercio'));
    if (comSnap.exists()) {
      const comercios = comSnap.val() || {};
      for (const [uid, com] of Object.entries(comercios)) {
        const comEmail = (com.email || '').toLowerCase().trim();
        const comName = (com.organization_name || com.name || '').toLowerCase().trim();
        const uidLower = uid.toLowerCase().trim();

        // Si está en lista de eliminados: purgar de RTDB y jamás resucitar
        if (deletedSet.has(uidLower) || (comEmail && deletedSet.has(comEmail))) {
          await dbRemove(ref(rtdb, `user_comercio/${uid}`));
          continue;
        }

        // Si ya existe por email, por UID o por nombre comercial, NO duplicar
        const existingStore = firestoreStores.find(s =>
          (comEmail && (s.email || '').toLowerCase().trim() === comEmail) ||
          (s.firebaseUid && s.firebaseUid === uid) ||
          (s.id === uid) ||
          (comName && (s.name || '').toLowerCase().trim() === comName)
        );

        if (existingStore) {
          // Si ya existe pero le falta el firebaseUid, vincularlo silenciosamente
          if (!existingStore.firebaseUid && uid) {
            existingStore.firebaseUid = uid;
            try {
              await setDoc(doc(db, COLLECTIONS.STORES, existingStore.id), { firebaseUid: uid }, { merge: true });
              existingStoreUids.add(uid);
            } catch (_) { }
          }
          continue; // Ya existe en Firestore, no duplicar jamás
        }

        // Generar siguiente ID STR-XX
        const existingNumbers = firestoreStores.map(s => {
          const match = s.id && String(s.id).match(/^STR-(\d+)$/i);
          return match ? parseInt(match[1], 10) : 0;
        });
        const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers, 0) : 0;
        const newStoreId = `STR-${String(maxNum + 1).padStart(2, '0')}`;

        const newStoreData = {
          id: newStoreId,
          firebaseUid: uid,
          name: com.organization_name || com.name || 'Comercio',
          category: com.categoria_comercio || 'Otro',
          city: com.estado_venezuela || com.ciudad || 'Caracas',
          address: com.direccion_exacta || com.ubicacion || `${com.estado_venezuela || 'Caracas'}, Venezuela`,
          manager: com.name || 'Comercio',
          email: comEmail || `store_${uid}@fidely.club`,
          phone: com.telefono || '',
          qrCode: `FIDELY-LOCAL-${newStoreId}`,
          status: 'PENDIENTE',
          createdAt: com.created_at || new Date().toISOString(),
          subscriptionStatus: 'TRIAL',
          subscriptionPaidUntil: null,
          subscriptionExempt: false,
          stampsTarget: 6,
          rewardTitle: 'Premio de Fidelidad',
          cardColor: '#18181B',
          cardGradient: '#3F3F46',
          stampIcon: 'scissors',
          minPurchaseUsd: 10,
          registrationSource: 'CONECTA2_RTDB_SYNC'
        };

        await setDoc(doc(db, COLLECTIONS.STORES, newStoreId), newStoreData, { merge: true });
        firestoreStores.push(newStoreData);
        existingStoreEmails.add(comEmail);
        storesAdded++;
      }
    }

    // 3. Obtener users de RTDB (Clientes registrados desde Conecta2 o Google Auth)
    const clientsSnap = await getDocs(collection(db, COLLECTIONS.CLIENTS));
    const firestoreClients = [];
    clientsSnap.forEach(d => firestoreClients.push({ ...d.data(), id: d.id }));
    const existingClientEmails = new Set(firestoreClients.map(c => (c.email || '').toLowerCase().trim()).filter(Boolean));
    const existingClientUids = new Set(firestoreClients.map(c => c.firebaseUid || c.id));

    const usersSnap = await get(ref(rtdb, 'users'));
    if (usersSnap.exists()) {
      const usersData = usersSnap.val() || {};
      for (const [uid, u] of Object.entries(usersData)) {
        if (!u) continue;

        const uidLower = uid.toLowerCase().trim();
        const uEmail = (u.email || '').toLowerCase().trim();
        const uPhone = (u.telefono || u.phone || '').toString().trim();
        const rawName = (u.name || u.nombre || '').trim();
        const rawCedula = (u.numero_cedula || u.docId || '').toString().trim();

        // Si está en la lista de eliminados: purgar de RTDB de raíz y no re-crear jamás
        if (deletedSet.has(uidLower) || (uEmail && deletedSet.has(uEmail)) || (rawCedula && deletedSet.has(rawCedula.toLowerCase()))) {
          await dbRemove(ref(rtdb, `users/${uid}`));
          continue;
        }

        // Descartar registros técnicos de prueba
        if (uid.startsWith('CLI-')) continue;

        // Validar que sea un usuario real: si no tiene correo, ni teléfono con nombre válido, descartar
        if (!uEmail && (!uPhone || !rawName || rawName === 'Socio' || rawName === 'Cliente')) {
          continue;
        }

        // Si ya existe por UID o por Email, saltar
        if (existingClientUids.has(uid) || (uEmail && existingClientEmails.has(uEmail))) {
          continue;
        }

        // Si es puramente conductor sin email cliente
        const roleLower = (u.role || '').toLowerCase().trim();
        if (roleLower === 'conductor' && !uEmail.includes('fidely')) {
          continue;
        }

        const finalCedula = (rawCedula || (uid.length >= 8 ? uid.substring(0, 8).toUpperCase() : uid)).toString().trim();
        const clientName = (rawName || (uEmail ? uEmail.split('@')[0] : 'Socio')).trim();
        const todayDate = (u.created_at || new Date().toISOString()).split('T')[0];

        const newClientData = {
          id: uid,
          firebaseUid: uid,
          docId: finalCedula,
          qrCode: `FIDELY-${finalCedula.replace(/[^A-Za-z0-9]/g, '')}`,
          name: clientName,
          initials: clientName.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'FC',
          email: uEmail || '',
          phone: (u.telefono || u.phone || '').trim(),
          birthDate: (u.birthDate || u.fecha_nacimiento || '').trim(),
          photoURL: u.photoUrl || u.photoURL || '',
          pointsBalance: 0,
          storeBalances: { ALL: 0 },
          tier: 'Cliente',
          favoriteStoreId: 'ALL',
          joinDate: todayDate,
          memberSince: todayDate,
          status: 'APROBADO',
          createdAt: u.created_at || new Date().toISOString(),
          registrationSource: u.registration_source || 'CONECTA2_RTDB_SYNC',
          registeredViaStoreId: 'CONECTA2_APP',
          loyaltyCards: []
        };

        await setDoc(doc(db, COLLECTIONS.CLIENTS, uid), newClientData, { merge: true });
        existingClientUids.add(uid);
        if (uEmail) existingClientEmails.add(uEmail);
        clientsAdded++;
      }
    }

    return { success: true, storesAdded, clientsAdded };
  } catch (err) {
    console.error('[Firebase] Error en syncRtdbToFirestore:', err);
    return { success: false, error: err.message };
  }
}
