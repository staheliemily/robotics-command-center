import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration
// Replace these values with your own Firebase project config
const firebaseConfig = {
  apiKey:
    process.env.REACT_APP_FIREBASE_API_KEY ||
    "AIzaSyBmZv5zd3laflDgvcP4vN4ZHZepZl1D-Og",
  authDomain:
    process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "maupcoop.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "maupcoop",
  storageBucket:
    process.env.REACT_APP_FIREBASE_STORAGE_BUCKET ||
    "maupcoop.firebasestorage.app",
  messagingSenderId:
    process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "550103748998",
  appId:
    process.env.REACT_APP_FIREBASE_APP_ID ||
    "1:550103748998:web:e261a26e7038dbddaa9c07",
};

// Check if Firebase is configured
export const isFirebaseConfigured = () => {
  return (
    firebaseConfig.apiKey !== "YOUR_API_KEY" &&
    firebaseConfig.apiKey !== undefined
  );
};

// Initialize Firebase
let app;
let auth;
let db;
let googleProvider;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
} catch (error) {
  console.warn("Firebase initialization failed. Running in demo mode.", error);
}

export { app, auth, db, googleProvider };
export default app;
