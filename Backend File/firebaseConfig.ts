// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyCRPy-X4mfj8gouQEQJT_KDAPE9E6CNSjk",
    authDomain: "flashcards-554fd.firebaseapp.com",
    projectId: "flashcards-554fd",
    storageBucket: "flashcards-554fd.appspot.com",
    messagingSenderId: "837256842277",
    appId: "1:837256842277:web:527cea55b6faf6d61143cc",
    measurementId: "G-Y3DVT2S94D"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };
