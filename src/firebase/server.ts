import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

/**
 * 🛰️ LEOPARDFISH SERVER-SIDE BRIDGE
 * Logic: A clean, Auth-free initialization for Server Actions and AI Flows.
 * This prevents the "Cannot read properties of undefined (reading 'call')" error.
 */
const firebaseConfig = {
  apiKey: "AIzaSyCsXjVXsRxZerNaYj7kFWTyxdMlR6kLK9U",
  authDomain: "studio-2840117705-12faa.firebaseapp.com",
  projectId: "studio-2840117705-12faa",
  storageBucket: "studio-2840117705-12faa.firebasestorage.app",
  messagingSenderId: "342003687950",
  appId: "1:342003687950:web:a88b8ff24c82f67c1c125f"
};

// Initialize App (Server-Safe)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Export only the Database
export const db = getFirestore(app);