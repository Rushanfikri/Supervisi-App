// Fix: Correctly import initializeApp as a named export from the modular firebase/app sub-module
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  // The API key must be obtained exclusively from the environment variable process.env.API_KEY per guidelines
  apiKey: process.env.API_KEY,
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