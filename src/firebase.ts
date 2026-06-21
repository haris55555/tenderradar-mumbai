import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
apiKey: "AIzaSyAju6GsF8WJau14BcPgnKhpjgZgCn4V8p4",
authDomain: "tenderradar-5c1a8.firebaseapp.com",
projectId: "tenderradar-5c1a8",
storageBucket: "tenderradar-5c1a8.firebasestorage.app",
messagingSenderId: "411037714893",
appId: "1:411037714893:web:a23424e7cb75508ae45c84"
};

import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export function signInWithGoogle() {
return signInWithPopup(auth, googleProvider);
}

export function logOut() {
return signOut(auth);
}

export { onAuthStateChanged };


