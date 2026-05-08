import React, { useEffect, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import RepairShop from "@/pages/RepairShop";
import RoleGate from "@/components/RoleGate";
import { useRole } from "@/hooks/useRole";
import { onAuthStateChanged, signInAnonymously, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Loader2, LogIn } from "lucide-react";

function Shell() {
  const { role, setRole, clearRole } = useRole();
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch((err) => {
          console.error("Anonymous Auth Failed:", err);
          if (err.code === 'auth/admin-restricted-operation') {
            setAuthError("Anonymous auth is disabled. Please sign in with Google or enable Anonymous Auth in Firebase Console.");
          } else {
            setAuthError(err.message);
          }
          setAuthReady(true);
        });
      } else {
        setAuthReady(true);
        setAuthError(null);
      }
    });
    return unsub;
  }, []);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  if (!authReady) {
    return (
      <div className="empty" style={{ height: "100vh" }}>
        <Loader2 className="spin" /> Initializing...
      </div>
    );
  }

  if (authError && !auth.currentUser) {
    return (
      <div className="empty" style={{ 
        height: "100vh", 
        padding: "2rem", 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "center",
        textAlign: "center" 
      }}>
        <div style={{ maxWidth: "400px", marginBottom: "2rem" }}>
          <h2 style={{ marginBottom: "1rem", fontSize: "1.2rem", fontWeight: "600" }}>Authentication Required</h2>
          <p className="text-muted" style={{ marginBottom: "1.5rem", fontSize: "0.9rem", lineHeight: "1.5" }}>
            {authError}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button className="btn primary full" onClick={handleGoogleLogin} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <LogIn size={18} /> Sign in with Google
            </button>
            <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
              Alternatively, enable "Anonymous" auth in your <a href={`https://console.firebase.google.com/project/${auth.app.options.projectId}/authentication/providers`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>Firebase Console</a>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!role) return <RoleGate onPick={setRole} />;
  return <RepairShop role={role} onSwitchRole={clearRole} />;
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Shell />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-center"
        theme="dark"
        toastOptions={{
          style: {
            background: "#111219",
            border: "1px solid #232634",
            color: "#e7e9f3",
          },
        }}
      />
    </div>
  );
}

export default App;
