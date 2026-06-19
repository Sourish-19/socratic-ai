import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCA9REXfPA17ogiNPtC4EB3gpUk6fDdbfU",
  authDomain: "socratic-ai-1df7e.firebaseapp.com",
  projectId: "socratic-ai-1df7e",
  storageBucket: "socratic-ai-1df7e.firebasestorage.app",
  messagingSenderId: "373069561887",
  appId: "1:373069561887:web:a288949dd28a6363eed52a",
  measurementId: "G-65FJ20W1V3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
