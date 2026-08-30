import React, { useEffect, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import RepairShop from "@/pages/RepairShop";
import RoleGate from "@/components/RoleGate";
import { useRole } from "@/hooks/useRole";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Loader2, Wrench, Eye, EyeOff } from "lucide-react";
import { applyTheme, getStoredTheme } from "@/lib/theme";

// username → email mapping (hidden from UI)
const USERNAME = "dhingramobile";
const EMAIL    = "dhingramobile@repairdesk.com";

function Shell() {
  const { role, setRole, clearRole } = useRole();
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Apply stored theme on load
    applyTheme(getStoredTheme());

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return unsub;
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (username.trim().toLowerCase() !== USERNAME) {
      setError("Galat username hai");
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, EMAIL, password);
    } catch (err) {
      setError("Galat password hai");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    clearRole();
    await signOut(auth);
  };

  // Loading state
  if (!authReady) {
    return (
      <div className="empty" style={{ height: "100vh" }}>
        <Loader2 className="spin" /> Loading...
      </div>
    );
  }

  // Not logged in → show login screen
  if (!user) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background: "var(--bg, #0a0a0a)",
      }}>
        {/* Brand */}
        <div className="brand" style={{ marginBottom: "2.5rem" }}>
          <div className="brand-mark">
            <Wrench size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.8rem" }}>Repair Desk</h1>
            <small style={{ color: "var(--muted)" }}>Dhingra Mobile</small>
          </div>
        </div>

        {/* Login Card */}
        <div style={{
          width: "100%",
          maxWidth: 360,
          background: "var(--card, #111)",
          borderRadius: 16,
          padding: "2rem",
          border: "1px solid var(--border, #222)",
        }}>
          <h2 style={{ marginBottom: "1.5rem", fontSize: "1.1rem", textAlign: "center" }}>
            Login karo
          </h2>

          <form onSubmit={handleLogin}>
            {/* Username */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: "var(--muted)", display: "block", marginBottom: 6 }}>
                Username
              </label>
              <input
                className="search"
                style={{ width: "100%", boxSizing: "border-box" }}
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 20, position: "relative" }}>
              <label style={{ fontSize: 13, color: "var(--muted)", display: "block", marginBottom: 6 }}>
                Password
              </label>
              <input
                className="search"
                style={{ width: "100%", boxSizing: "border-box", paddingRight: 44 }}
                placeholder="Password"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: "absolute", right: 12, bottom: 10,
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--muted)", padding: 0,
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <div style={{
                color: "#ef4444", fontSize: 13,
                marginBottom: 14, textAlign: "center",
              }}>
                ❌ {error}
              </div>
            )}

            <button
              className="btn primary full"
              type="submit"
              disabled={loading}
            >
              {loading ? <><Loader2 size={14} className="spin" /> Login ho raha hai...</> : "Login"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Logged in but role not picked
  if (!role) return <RoleGate onPick={setRole} />;

  // Fully authenticated
  return <RepairShop role={role} onSwitchRole={handleLogout} />;
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
