// Fix: Correctly import initializeApp as a named export from the modular firebase/app sub-module
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  // Use VITE_FIREBASE_API_KEY from environment variables, fallback to process.env.API_KEY
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || process.env.API_KEY,
  authDomain: "farmasi-rsup.firebaseapp.com",
  projectId: "farmasi-rsup",
  storageBucket: "farmasi-rsup.firebasestorage.app",
  messagingSenderId: "175699609835",
  appId: "1:175699609835:web:a3f74f66f94e840c0156ae",
  measurementId: "G-91N8VSV3YP"
};

// Initialize the Firebase app instance using the modern v9 modular SDK syntax
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and export the database reference for use throughout the application
export const db = getFirestore(app);

// Initialize Firebase Auth and export the auth reference for use throughout the application
export const auth = getAuth(app);
