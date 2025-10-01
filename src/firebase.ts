import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC4I2i_q0XfRKvou6Bn7Q_69_BHypgYusE",
  authDomain: "sep490-fa25se182.firebaseapp.com",
  projectId: "sep490-fa25se182",
  storageBucket: "sep490-fa25se182.firebasestorage.app",
  messagingSenderId: "424779749983",
  appId: "1:424779749983:web:851a80653c7f896fd399ea",
  measurementId: "G-0L409NQC9R"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
