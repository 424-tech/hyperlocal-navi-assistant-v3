import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// These values are injected by Vite at build time from your .env or Vercel settings
const firebaseConfig = {
    apiKey: "YOUR_API_KEY", // Placeholder as per request
    authDomain: "scb-hospital-navigation-app.firebaseapp.com",
    projectId: "scb-hospital-navigation-app",
    storageBucket: "scb-hospital-navigation-app.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };