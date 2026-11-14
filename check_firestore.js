import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { firebaseConfig } from "./src/firebase/config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  console.log("Consultando colecciones...");
  const snap = await getDocs(collection(db, "redemptions"));
  console.log(`Total redemptions en Firestore: ${snap.size}`);
  snap.forEach(doc => {
    console.log(`ID: ${doc.id} =>`, JSON.stringify(doc.data(), null, 2));
  });

  const clientSnap = await getDocs(collection(db, "clients"));
  console.log(`Total clients en Firestore: ${clientSnap.size}`);
  clientSnap.forEach(doc => {
    console.log(`Client ID: ${doc.id} => Name: ${doc.data().name}, Points: ${doc.data().pointsBalance}, StoreBalances:`, doc.data().storeBalances);
  });

  const storeSnap = await getDocs(collection(db, "stores"));
  console.log(`Total stores en Firestore: ${storeSnap.size}`);
  storeSnap.forEach(doc => {
    console.log(`Store ID: ${doc.id} => Name: ${doc.data().name}`);
  });
  process.exit(0);
}

check().catch(console.error);
