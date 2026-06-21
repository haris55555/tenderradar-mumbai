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

import { getFirestore, doc, getDoc, setDoc, increment } from "firebase/firestore";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export async function getUploadCount(uid: string): Promise<number> {
const userDoc = await getDoc(doc(db, "users", uid));
if (userDoc.exists()) {
return userDoc.data().uploadCount || 0;
}
return 0;
}

export async function incrementUploadCount(uid: string, phoneNumber: string) {
const userRef = doc(db, "users", uid);
const userDoc = await getDoc(userRef);
if (userDoc.exists()) {
await setDoc(userRef, { uploadCount: increment(1) }, { merge: true });
} else {
await setDoc(userRef, { uploadCount: 1, phoneNumber, createdAt: new Date().toISOString() });
}
}

const ALLOWLIST_EMAILS = ["hai.advisoryservices@gmail.com", "mubarisinamdar@gmail.com"];
const FREE_LIMIT = 2;

export async function canUserUpload(uid: string, email: string): Promise<boolean> {
if (ALLOWLIST_EMAILS.includes(email)) return true;
const userDoc = await getDoc(doc(db, "users", uid));
if (userDoc.exists() && userDoc.data().subscribed) return true;
const count = await getUploadCount(uid);
return count < FREE_LIMIT;
}

export async function markUserSubscribed(uid: string, paymentId: string) {
const userRef = doc(db, "users", uid);
await setDoc(userRef, { subscribed: true, subscribedAt: new Date().toISOString(), lastPaymentId: paymentId }, { merge: true });
}






export function signInWithGoogle() {
return signInWithPopup(auth, googleProvider);
}

export function logOut() {
return signOut(auth);
}

export { onAuthStateChanged };


