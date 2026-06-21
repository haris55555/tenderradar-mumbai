import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

const firebaseConfig = {
apiKey: "AIzaSyAju6GsF8WJau14BcPgnKhpjgZgCn4V8p4",
authDomain: "tenderradar-5c1a8.firebaseapp.com",
projectId: "tenderradar-5c1a8",
storageBucket: "tenderradar-5c1a8.firebasestorage.app",
messagingSenderId: "411037714893",
appId: "1:411037714893:web:a23424e7cb75508ae45c84"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export { RecaptchaVerifier, signInWithPhoneNumber };
