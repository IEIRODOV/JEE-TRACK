import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';

// Firebase configuration using environment variables with fallbacks.
// For GitHub publishing, users should set these in their .env file.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA-PLACEHOLDER",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "jee-tracker-placeholder.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "jee-tracker-placeholder",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "jee-tracker-placeholder.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, import.meta.env.VITE_FIREBASE_DATABASE_ID || "(default)");
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, onAuthStateChanged, doc, setDoc, getDoc, onSnapshot, collection, query, orderBy, limit };
export type { User };
