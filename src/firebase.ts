import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDNuwcLUnou4HhyQzGCYuWcXTxSwJxag_I",
  authDomain: "gen-lang-client-0020267451.firebaseapp.com",
  projectId: "gen-lang-client-0020267451",
  storageBucket: "gen-lang-client-0020267451.firebasestorage.app",
  messagingSenderId: "343325480795",
  appId: "1:343325480795:web:91a019c98bab3a957f2c7e",
  firestoreDatabaseId: "ai-studio-58339ef4-aeee-45c4-9695-bee75ab77d58"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId as string
);

export const auth = getAuth(app);

export default app;