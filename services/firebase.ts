import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// These values are injected by Vite at build time from your .env or Vercel settings
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase
// We wrap this in a try-catch to prevent the app from crashing entirely if keys are missing
let app;
let db: any = null;

try {
    if (process.env.FIREBASE_API_KEY) {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
    } else {
        console.warn("Firebase API keys are missing. Community features will be disabled.");
    }
} catch (e) {
    console.error("Error initializing Firebase:", e);
}

export { db };