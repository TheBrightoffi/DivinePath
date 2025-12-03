// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCPtZXu78wyhGrme3OYeBGC2JHAKKbFAZA",
    authDomain: "backup-1eb98.firebaseapp.com",
    projectId: "backup-1eb98",
    storageBucket: "backup-1eb98.firebasestorage.app",
    messagingSenderId: "1028054974180",
    appId: "1:1028054974180:web:e576829a54e1787c57f6f1",
    measurementId: "G-GQ6WBTH9FN"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
