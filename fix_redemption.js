import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { firebaseConfig } from "./src/firebase/config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fix() {
  console.log("Actualizando redención XJgY9WZZIjthHnqXbBoz a PENDIENTE...");
  await updateDoc(doc(db, "redemptions", "XJgY9WZZIjthHnqXbBoz"), {
    status: "PENDIENTE",
    dateGenerated: new Date().toISOString().replace('T', ' ').slice(0, 16),
    storeQrVerified: true
  });
  console.log("✓ Redención actualizada a PENDIENTE");

  console.log("Actualizando balances de cliente 9ImqXsERDfSFDhiouIPFFfYHN4j2...");
  await updateDoc(doc(db, "clients", "9ImqXsERDfSFDhiouIPFFfYHN4j2"), {
    pointsBalance: 100,
    storeBalances: { ALL: 100, "STR-01": 100 }
  });
  console.log("✓ Cliente actualizado con 100 pts y storeBalances para STR-01 y ALL");
  process.exit(0);
}

fix().catch(console.error);
