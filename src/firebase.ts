import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseConfig from "./firebase-applet-config.json";

const app = initializeApp(firebaseConfig);

// 👇 USA O BANCO CERTO (ESSA LINHA RESOLVE TUDO)
export const db = getFirestore(
  app,
  firebaseConfig.firestoreDatabase
);

export const auth = getAuth(app);

export default app;