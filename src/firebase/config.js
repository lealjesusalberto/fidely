// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyAq201SVEzffh3ldD1ioKAyz7z4y_WNloQ",
  authDomain: "conecta2-drive.firebaseapp.com",
  databaseURL: "https://conecta2-drive-default-rtdb.firebaseio.com",
  projectId: "conecta2-drive",
  storageBucket: "conecta2-drive.firebasestorage.app",
  messagingSenderId: "967297739363",
  appId: "1:967297739363:web:5818c1d31c8361ecb26656",
  measurementId: "G-FFM036E9ZM"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Realtime Database
export const rtdb = getDatabase(app);

// Initialize Analytics safely
export let analytics = null;
if (typeof window !== "undefined") {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {
      // Analytics not supported or blocked in current environment
    });
}

export default app;
