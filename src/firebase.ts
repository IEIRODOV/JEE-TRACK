import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';

// Placeholder config - this will be updated once Firebase is fully provisioned
// or you can manually add your own Firebase config here.
const firebaseConfig = {
  apiKey: "AIzaSyA-PLACEHOLDER",
  authDomain: "jee-tracker-placeholder.firebaseapp.com",
  projectId: "jee-tracker-placeholder",
  storageBucket: "jee-tracker-placeholder.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, onAuthStateChanged, doc, setDoc, getDoc, onSnapshot, collection, query, orderBy, limit };
export type { User };
