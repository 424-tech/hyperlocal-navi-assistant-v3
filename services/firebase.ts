import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD3hqT8usseOu1Jol2xMmjNUjbKTXOa4tY",
    authDomain: "scb-indoor-navigation.firebaseapp.com",
    projectId: "scb-indoor-navigation",
    storageBucket: "scb-indoor-navigation.firebasestorage.app",
    messagingSenderId: "590547766764",
    appId: "1:590547766764:web:2755b35fe5c7ecb44f04c9",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
