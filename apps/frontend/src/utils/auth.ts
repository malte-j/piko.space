import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC3rgUCV5Bj3DYy1WL3e7znLQDDq3V7zx0",
  authDomain: "piko-363817.firebaseapp.com",
  projectId: "piko-363817",
  storageBucket: "piko-363817.appspot.com",
  messagingSenderId: "991530102278",
  appId: "1:991530102278:web:9635993b36fb6005679d87",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const googleAuthProvider = new GoogleAuthProvider();
const analytics = getAnalytics(app);
// auth
getAuth()

