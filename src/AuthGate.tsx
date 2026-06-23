import { useState, useEffect } from "react";
import { auth, signInWithGoogle, logOut, onAuthStateChanged, getUploadCount, markUserSubscribed } from "./firebase";
import type { User } from "firebase/auth";

interface AuthGateProps {
children: (user: User, phoneNumber: string, triggerPaywall: () => void) => React.ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
const [user, setUser] = useState<User | null>(null);
const [loading, setLoading] = useState(true);
const [phoneNumber, setPhoneNumber] = useState<string>("");
const [needsPhone, setNeedsPhone] = useState(false);
const [phoneInput, setPhoneInput] = useState("");
const [error, setError] = useState("");
const [uploadCount, setUploadCount] = useState(0);
const [showPaywall, setShowPaywall] = useState(false);
const [showWelcome , setShowWelcome] = useState(false);

const ALLOWLIST_EMAILS = ["hai.advisoryservices@gmail.com", "mubarisinamdar@gmail.com"]; 
const FREE_LIMIT = 3;


useEffect(() => {
const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
setUser(firebaseUser);
setLoading(false);
if (firebaseUser) {
const savedPhone = localStorage.getItem(`phone_${firebaseUser.uid}`);
if (savedPhone) {
setPhoneNumber(savedPhone);
setNeedsPhone(false);
} else {
setNeedsPhone(true);
}
const count = await getUploadCount(firebaseUser.uid);
setUploadCount(count);
const isAllowlisted = ALLOWLIST_EMAILS.includes(firebaseUser.email || "");
if (count >= FREE_LIMIT && !isAllowlisted) {
setShowPaywall(true);
}
}
});
return () => unsubscribe();
}, []);



const handleGoogleSignIn = async () => {
setError("");
try {
await signInWithGoogle();
} catch (err) {
setError("Sign in failed. Please try again.");
console.error(err);
}
};

const handlePhoneSubmit = () => {
const cleaned = phoneInput.replace(/\D/g, "");
if (cleaned.length !== 10) {
setError("Please enter a valid 10-digit mobile number");
return;
}
if (user) {
localStorage.setItem(`phone_${user.uid}`, cleaned);
setPhoneNumber(cleaned);
setNeedsPhone(false);
// Show welcome screen for first time users
const seenWelcome = localStorage.getItem(`welcome_${user.uid}`);
if (!seenWelcome) setShowWelcome(true);
}
};

const handleLogout = async () => {
await logOut();
setUser(null);
setPhoneNumber("");
};

const handlePayment = () => {
if (!user) return;
const options = {
key: "rzp_live_T4Tl2WyVuV7Szs",
amount: 300000,
currency: "INR",
name: "TenderRadar",
description: "Monthly Subscription",
handler: async function (response: any) {
await markUserSubscribed(user.uid, response.razorpay_payment_id);
setShowPaywall(false);
window.location.reload();
},
prefill: {
email: user.email || "",
contact: phoneNumber,
},
theme: {
color: "#F5A623",
},
};
const rzp = new (window as any).Razorpay(options);
rzp.open();
};



if (loading) {
return (
<div style={{ minHeight: "100vh", backgroundColor: "#0F1923", display: "flex", alignItems: "center", justifyContent: "center" }}>
<div style={{ color: "#F5A623", fontSize: "16px" }}>Loading...</div>
</div>
);
}

if (!user) {
return (
<div style={{ minHeight: "100vh", backgroundColor: "#0F1923", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
<div style={{ maxWidth: "400px", width: "100%", textAlign: "center" }}>
<div style={{ fontSize: "28px", fontWeight: "800", color: "#F5A623", marginBottom: "8px" }}>TenderRadar</div>
<div style={{ color: "#6B7F8E", fontSize: "14px", marginBottom: "40px" }}>Your Digital Quantity Surveyor - Pan India</div>
<button
onClick={handleGoogleSignIn}
style={{
width: "100%",
padding: "14px 20px",
backgroundColor: "#FFFFFF",
color: "#1a1a1a",
border: "none",
borderRadius: "10px",
fontSize: "15px",
fontWeight: "600",
cursor: "pointer",
display: "flex",
alignItems: "center",
justifyContent: "center",
gap: "10px"
}}
>
<svg width="20" height="20" viewBox="0 0 48 48">
<path fill="#FFC107" d="M43.6 20.5H42V20.4H24v7.2h11.3c-1.6 4.6-6 7.9-11.3 7.9-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 8 3l5.1-5.1C33.5 6.2 29 4.4 24 4.4 13.2 4.4 4.4 13.2 4.4 24S13.2 43.6 24 43.6 43.6 34.8 43.6 24c0-1.2-.1-2.4-.4-3.5z"/>
<path fill="#FF3D00" d="M6.3 14.7l5.9 4.3C13.9 15.6 18.6 12.4 24 12.4c3 0 5.8 1.1 8 3l5.1-5.1C33.5 6.2 29 4.4 24 4.4c-7.5 0-14 4.2-17.7 10.3z"/>
<path fill="#4CAF50" d="M24 43.6c4.9 0 9.4-1.9 12.8-4.9l-5.9-5c-2 1.5-4.6 2.4-6.9 2.4-5.2 0-9.7-3.3-11.3-7.9l-5.9 4.6C9.9 39.4 16.4 43.6 24 43.6z"/>
<path fill="#1976D2" d="M43.6 20.5H42V20.4H24v7.2h11.3c-.8 2.2-2.2 4.1-4 5.5l5.9 5c-.4.4 6.4-4.7 6.4-14.1 0-1.2-.1-2.4-.4-3.5z"/>
</svg>
Sign in with Google
</button>
{error && <div style={{ color: "#FF6B6B", fontSize: "13px", marginTop: "12px" }}>{error}</div>}
</div>
</div>
);
}

if (needsPhone) {
return (
<div style={{ minHeight: "100vh", backgroundColor: "#0F1923", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
<div style={{ maxWidth: "400px", width: "100%" }}>
<div style={{ fontSize: "22px", fontWeight: "700", color: "#E8EDF2", marginBottom: "8px", textAlign: "center" }}>One last step</div>
<div style={{ color: "#6B7F8E", fontSize: "13px", marginBottom: "24px", textAlign: "center" }}>Enter your mobile number so we can reach you for support and updates</div>
<input
type="tel"
value={phoneInput}
onChange={(e) => setPhoneInput(e.target.value)}
placeholder="10-digit mobile number"
maxLength={10}
style={{
width: "100%",
padding: "14px 16px",
backgroundColor: "#1A2733",
border: "1px solid #2A3F4F",
borderRadius: "10px",
color: "#E8EDF2",
fontSize: "15px",
marginBottom: "16px",
boxSizing: "border-box"
}}
/>
{error && <div style={{ color: "#FF6B6B", fontSize: "13px", marginBottom: "12px" }}>{error}</div>}
<button
onClick={handlePhoneSubmit}
style={{
width: "100%",
padding: "14px 20px",
backgroundColor: "#F5A623",
color: "#0F1923",
border: "none",
borderRadius: "10px",
fontSize: "15px",
fontWeight: "700",
cursor: "pointer"
}}
>
Continue
</button>
</div>
</div>
);
}

if (showPaywall) {
return (
<div style={{ minHeight: "100vh", backgroundColor: "#0F1923", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
<div style={{ maxWidth: "420px", width: "100%", textAlign: "center" }}>
<div style={{ fontSize: "24px", fontWeight: "800", color: "#F5A623", marginBottom: "8px" }}>You've used your free analyses</div>
<div style={{ color: "#6B7F8E", fontSize: "14px", marginBottom: "32px" }}>Upgrade to continue analyzing unlimited BOQs</div>

<div style={{ backgroundColor: "#1A2733", border: "1px solid #2A3F4F", borderRadius: "14px", padding: "24px", marginBottom: "16px", textAlign: "left" }}>
<div style={{ color: "#E8EDF2", fontSize: "16px", fontWeight: "700", marginBottom: "4px" }}>Monthly Plan</div>
<div style={{ color: "#F5A623", fontSize: "28px", fontWeight: "800", marginBottom: "12px" }}>₹3,000<span style={{ fontSize: "14px", color: "#6B7F8E", fontWeight: "400" }}>/month</span></div>
<div style={{ color: "#6B7F8E", fontSize: "13px" }}>Unlimited BOQ uploads and analysis</div>
</div>

<div style={{ backgroundColor: "#1A2733", border: "1px solid #2A3F4F", borderRadius: "14px", padding: "24px", marginBottom: "24px", textAlign: "left" }}>
<div style={{ color: "#E8EDF2", fontSize: "16px", fontWeight: "700", marginBottom: "4px" }}>6 Month Plan</div>
<div style={{ color: "#F5A623", fontSize: "28px", fontWeight: "800", marginBottom: "12px" }}>₹15,000<span style={{ fontSize: "14px", color: "#6B7F8E", fontWeight: "400" }}>/6 months</span></div>
<div style={{ color: "#6B7F8E", fontSize: "13px" }}>Unlimited BOQ uploads and analysis</div>
</div>

<button
onClick={handlePayment}
style={{
width: "100%",
padding: "14px 20px",
backgroundColor: "#F5A623",
color: "#0F1923",
border: "none",
borderRadius: "10px",
fontSize: "15px",
fontWeight: "700",
cursor: "pointer",
marginBottom: "16px"
}}
>
Pay ₹3,000 - Subscribe Now
</button>

<button
onClick={handleLogout}
style={{ background: "none", border: "none", color: "#6B7F8E", fontSize: "13px", cursor: "pointer", textDecoration: "underline" }}
>
Sign out
</button>
</div>
</div>
);
}

if (showWelcome) {
return (
<div style={{ minHeight: "100vh", backgroundColor: "#0F1923", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
<div style={{ maxWidth: "480px", width: "100%" }}>
<div style={{ textAlign: "center", marginBottom: "28px" }}>
<div style={{ fontSize: "28px", fontWeight: "800", color: "#F5A623", marginBottom: "6px" }}>Welcome to TenderRadar 🎯</div>
<div style={{ color: "#6B7F8E", fontSize: "13px" }}>Before you start, here's what to know</div>
</div>

<div style={{ backgroundColor: "#1A2733", borderRadius: "14px", padding: "20px", marginBottom: "16px", border: "1px solid #2A3F4F" }}>
<div style={{ color: "#F5A623", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "12px" }}>WHAT WE DO</div>
{[
"Extract BOQ items directly from government tender PDFs",
"Calculate real profit after facilitation, overhead and wastage",
"AI estimated execution rates — state-wise calibrated across India",
"Edit any rate yourself if you know better from your own experience",
"Rate Analysis (Annexure-D) per item — ready to print",
"Working capital estimate to plan your cash flow before bidding"
].map((item, i) => (
<div key={i} style={{ color: "#E8EDF2", fontSize: "13px", marginBottom: "8px", display: "flex", gap: "8px" }}>
<span style={{ color: "#00C896", flexShrink: 0 }}>✓</span>{item}
</div>
))}
</div>

<div style={{ backgroundColor: "#1A2733", borderRadius: "14px", padding: "20px", marginBottom: "16px", border: "1px solid #2A3F4F" }}>
<div style={{ color: "#F5A623", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "12px" }}>WORKS BEST WITH</div>
{[
"PDFs with Sr.No, Description, Unit, Rate, Qty, Amount columns",
"Government tenders — BMC, PWD, MMRDA, CPWD, municipal corporations",
"Both rate-filled and zero-rate BOQs (we estimate rates using AI)"
].map((item, i) => (
<div key={i} style={{ color: "#E8EDF2", fontSize: "13px", marginBottom: "8px", display: "flex", gap: "8px" }}>
<span style={{ color: "#F5A623", flexShrink: 0 }}>→</span>{item}
</div>
))}
</div>

<div style={{ backgroundColor: "#1A2733", borderRadius: "14px", padding: "20px", marginBottom: "24px", border: "1px solid #2A3F4F" }}>
<div style={{ color: "#FF6B6B", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "12px" }}>PLEASE NOTE</div>
{[
"Text-based PDFs only — scanned or image PDFs won't work",
"AI rates and working capital figures are estimates, not guaranteed values",
"Always verify critical numbers with your own site knowledge before bidding",
"First 2 analyses are free, then a simple monthly subscription applies"
].map((item, i) => (
<div key={i} style={{ color: "#6B7F8E", fontSize: "13px", marginBottom: "8px", display: "flex", gap: "8px" }}>
<span style={{ color: "#FF6B6B", flexShrink: 0 }}>!</span>{item}
</div>
))}
</div>

<button
onClick={() => {
if (user) localStorage.setItem(`welcome_${user.uid}`, "seen");
setShowWelcome(false);
}}
style={{
width: "100%",
padding: "16px 20px",
backgroundColor: "#F5A623",
color: "#0F1923",
border: "none",
borderRadius: "10px",
fontSize: "16px",
fontWeight: "800",
cursor: "pointer"
}}
>
Let's Get Started →
</button>
</div>
</div>
);
}

if (showWelcome) {
return (
<div style={{ minHeight: "100vh", backgroundColor: "#0F1923", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
<div style={{ maxWidth: "480px", width: "100%" }}>
<div style={{ textAlign: "center", marginBottom: "28px" }}>
<div style={{ fontSize: "28px", fontWeight: "800", color: "#F5A623", marginBottom: "6px" }}>Welcome to TenderRadar 🎯</div>
<div style={{ color: "#6B7F8E", fontSize: "13px" }}>Before you start, here's what to know</div>
</div>

<div style={{ backgroundColor: "#1A2733", borderRadius: "14px", padding: "20px", marginBottom: "16px", border: "1px solid #2A3F4F" }}>
<div style={{ color: "#F5A623", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "12px" }}>WHAT WE DO</div>
{[
"Extract BOQ items directly from government tender PDFs",
"Calculate real profit after facilitation, overhead and wastage",
"AI estimated execution rates — state-wise calibrated across India",
"Edit any rate yourself if you know better from your own experience",
"Rate Analysis (Annexure-D) per item — ready to print",
"Working capital estimate to plan your cash flow before bidding"
].map((item, i) => (
<div key={i} style={{ color: "#E8EDF2", fontSize: "13px", marginBottom: "8px", display: "flex", gap: "8px" }}>
<span style={{ color: "#00C896", flexShrink: 0 }}>✓</span>{item}
</div>
))}
</div>

<div style={{ backgroundColor: "#1A2733", borderRadius: "14px", padding: "20px", marginBottom: "16px", border: "1px solid #2A3F4F" }}>
<div style={{ color: "#F5A623", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "12px" }}>WORKS BEST WITH</div>
{[
"PDFs with Sr.No, Description, Unit, Rate, Qty, Amount columns",
"Government tenders — BMC, PWD, MMRDA, CPWD, municipal corporations",
"Both rate-filled and zero-rate BOQs (we estimate rates using AI)"
].map((item, i) => (
<div key={i} style={{ color: "#E8EDF2", fontSize: "13px", marginBottom: "8px", display: "flex", gap: "8px" }}>
<span style={{ color: "#F5A623", flexShrink: 0 }}>→</span>{item}
</div>
))}
</div>

<div style={{ backgroundColor: "#1A2733", borderRadius: "14px", padding: "20px", marginBottom: "24px", border: "1px solid #2A3F4F" }}>
<div style={{ color: "#FF6B6B", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "12px" }}>PLEASE NOTE</div>
{[
"Text-based PDFs only — scanned or image PDFs won't work",
"AI rates and working capital figures are estimates, not guaranteed values",
"Always verify critical numbers with your own site knowledge before bidding",
"First 2 analyses are free, then a simple monthly subscription applies"
].map((item, i) => (
<div key={i} style={{ color: "#6B7F8E", fontSize: "13px", marginBottom: "8px", display: "flex", gap: "8px" }}>
<span style={{ color: "#FF6B6B", flexShrink: 0 }}>!</span>{item}
</div>
))}
</div>

<button
onClick={() => {
if (user) localStorage.setItem(`welcome_${user.uid}`, "seen");
setShowWelcome(false);
}}
style={{
width: "100%",
padding: "16px 20px",
backgroundColor: "#F5A623",
color: "#0F1923",
border: "none",
borderRadius: "10px",
fontSize: "16px",
fontWeight: "800",
cursor: "pointer"
}}
>
Let's Get Started →
</button>
</div>
</div>
);
}

if (showWelcome) {
return (
<div style={{ minHeight: "100vh", backgroundColor: "#0F1923", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
<div style={{ maxWidth: "480px", width: "100%" }}>
<div style={{ textAlign: "center", marginBottom: "28px" }}>
<div style={{ fontSize: "28px", fontWeight: "800", color: "#F5A623", marginBottom: "6px" }}>Welcome to TenderRadar 🎯</div>
<div style={{ color: "#6B7F8E", fontSize: "13px" }}>Before you start, here's what to know</div>
</div>

<div style={{ backgroundColor: "#1A2733", borderRadius: "14px", padding: "20px", marginBottom: "16px", border: "1px solid #2A3F4F" }}>
<div style={{ color: "#F5A623", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "12px" }}>WHAT WE DO</div>
{[
"Extract BOQ items directly from government tender PDFs",
"Calculate real profit after facilitation, overhead and wastage",
"AI estimated execution rates — state-wise calibrated across India",
"Edit any rate yourself if you know better from your own experience",
"Rate Analysis (Annexure-D) per item — ready to print",
"Working capital estimate to plan your cash flow before bidding"
].map((item, i) => (
<div key={i} style={{ color: "#E8EDF2", fontSize: "13px", marginBottom: "8px", display: "flex", gap: "8px" }}>
<span style={{ color: "#00C896", flexShrink: 0 }}>✓</span>{item}
</div>
))}
</div>

<div style={{ backgroundColor: "#1A2733", borderRadius: "14px", padding: "20px", marginBottom: "16px", border: "1px solid #2A3F4F" }}>
<div style={{ color: "#F5A623", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "12px" }}>WORKS BEST WITH</div>
{[
"PDFs with Sr.No, Description, Unit, Rate, Qty, Amount columns",
"Government tenders — BMC, PWD, MMRDA, CPWD, municipal corporations",
"Both rate-filled and zero-rate BOQs (we estimate rates using AI)"
].map((item, i) => (
<div key={i} style={{ color: "#E8EDF2", fontSize: "13px", marginBottom: "8px", display: "flex", gap: "8px" }}>
<span style={{ color: "#F5A623", flexShrink: 0 }}>→</span>{item}
</div>
))}
</div>

<div style={{ backgroundColor: "#1A2733", borderRadius: "14px", padding: "20px", marginBottom: "24px", border: "1px solid #2A3F4F" }}>
<div style={{ color: "#FF6B6B", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "12px" }}>PLEASE NOTE</div>
{[
"Text-based PDFs only — scanned or image PDFs won't work",
"AI rates and working capital figures are estimates, not guaranteed values",
"Always verify critical numbers with your own site knowledge before bidding",
"First 2 analyses are free, then a simple monthly subscription applies"
].map((item, i) => (
<div key={i} style={{ color: "#6B7F8E", fontSize: "13px", marginBottom: "8px", display: "flex", gap: "8px" }}>
<span style={{ color: "#FF6B6B", flexShrink: 0 }}>!</span>{item}
</div>
))}
</div>

<button
onClick={() => {
if (user) localStorage.setItem(`welcome_${user.uid}`, "seen");
setShowWelcome(false);
}}
style={{
width: "100%",
padding: "16px 20px",
backgroundColor: "#F5A623",
color: "#0F1923",
border: "none",
borderRadius: "10px",
fontSize: "16px",
fontWeight: "800",
cursor: "pointer"
}}
>
Let's Get Started →
</button>
</div>
</div>
);
}

return <>{children(user, phoneNumber, () => setShowPaywall(true))}</>;
}






