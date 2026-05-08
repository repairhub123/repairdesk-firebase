import React from "react";
import { Crown, User, Wrench } from "lucide-react";

export default function RoleGate({ onPick }) {
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
      <div className="brand" style={{ marginBottom: "3rem" }}>
        <div className="brand-mark">
          <Wrench size={32} />
        </div>
        <div>
          <h1 style={{ fontSize: "2rem" }}>Repair Desk</h1>
          <p style={{ color: "var(--muted)" }}>mobile repair shop</p>
        </div>
      </div>

      <div style={{ maxWidth: "400px", width: "100%" }}>
        <h2 style={{ marginBottom: "1.5rem", fontSize: "1.2rem", fontWeight: "600" }}>Who are you?</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <button 
            className="btn glass full" 
            style={{ 
              height: "auto", 
              padding: "1.5rem", 
              justifyContent: "center", 
              flexDirection: "column", 
              gap: "10px",
              border: "1px solid var(--border)"
            }}
            onClick={() => onPick("Boss")}
          >
            <Crown size={32} style={{ color: "#f59e0b" }} />
            <div style={{ fontWeight: "600", fontSize: "1.1rem" }}>I am the Boss</div>
            <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Full reports & shop overview</div>
          </button>

          <button 
            className="btn glass full" 
            style={{ 
              height: "auto", 
              padding: "1.5rem", 
              justifyContent: "center", 
              flexDirection: "column", 
              gap: "10px",
              border: "1px solid var(--border)"
            }}
            onClick={() => onPick("Technician")}
          >
            <User size={32} style={{ color: "#3b82f6" }} />
            <div style={{ fontWeight: "600", fontSize: "1.1rem" }}>I am a Technician</div>
            <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Add jobs & track my work</div>
          </button>
        </div>
      </div>
    </div>
  );
}
