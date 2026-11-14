import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, writeBatch } from "firebase/firestore";
import { 
  DEFAULT_CONFIG, 
  INITIAL_STORES, 
  INITIAL_CLIENTS, 
  INITIAL_REWARDS, 
  INITIAL_PURCHASES, 
  INITIAL_MOVEMENTS, 
  INITIAL_REDEMPTIONS 
} from "../src/data/initialData.js";

const firebaseConfig = {
  apiKey: "AIzaSyAq201SVEzffh3ldD1ioKAyz7z4y_WNloQ",
  authDomain: "conecta2-drive.firebaseapp.com",
  projectId: "conecta2-drive",
  storageBucket: "conecta2-drive.firebasestorage.app",
  messagingSenderId: "967297739363",
  appId: "1:967297739363:web:5818c1d31c8361ecb26656",
  measurementId: "G-FFM036E9ZM"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  console.log("Iniciando carga de datos a Cloud Firestore...");
  const batch = writeBatch(db);

  // 1. Config
  batch.set(doc(db, "config", "global"), DEFAULT_CONFIG);

  // 2. Stores
  INITIAL_STORES.forEach(store => {
    batch.set(doc(db, "stores", store.id), store);
  });

  // 3. Clients
  INITIAL_CLIENTS.forEach(client => {
    batch.set(doc(db, "clients", client.id), client);
  });

  // 4. Rewards
  INITIAL_REWARDS.forEach(reward => {
    batch.set(doc(db, "rewards", reward.id), reward);
  });

  // 5. Purchases
  INITIAL_PURCHASES.forEach(purchase => {
    batch.set(doc(db, "purchases", purchase.id), purchase);
  });

  // 6. Movements
  INITIAL_MOVEMENTS.forEach(movement => {
    batch.set(doc(db, "movements", movement.id), movement);
  });

  // 7. Redemptions
  INITIAL_REDEMPTIONS.forEach(redemption => {
    batch.set(doc(db, "redemptions", redemption.id), redemption);
  });

  await batch.commit();
  console.log("¡Éxito! Colecciones de fidely CLUB cargadas en Cloud Firestore.");
  process.exit(0);
}

seed().catch(err => {
  console.error("Error al cargar datos a Firestore:", err);
  process.exit(1);
});
