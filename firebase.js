// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Replace the below config with your own Firebase project config
const firebaseConfig = {
    apiKey: "AIzaSyB_hM9iRQm3ABZZhbb7oWEWxYAOXiTyxPA",
    authDomain: "g-waste-reactn.firebaseapp.com",
    projectId: "g-waste-reactn",
    storageBucket: "g-waste-reactn.firebasestorage.app",
    messagingSenderId: "9061563077",
    appId: "1:9061563077:web:2f46f9e5d2ced94286ceac"
  };

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
