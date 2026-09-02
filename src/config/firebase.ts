import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, writeBatch, Timestamp } from 'firebase/firestore';

// TODO: Ganti dengan config Firebase project-mu
// Cara: Buka Firebase Console → Project Settings → SDK Setup → Config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "quest-ai-YOUR_PROJECT.firebaseapp.com",
  projectId: "quest-ai-YOUR_PROJECT",
  storageBucket: "quest-ai-YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db_firestore = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signOut, onAuthStateChanged, User };
export { doc, setDoc, getDoc, collection, query, where, getDocs, writeBatch, Timestamp };
