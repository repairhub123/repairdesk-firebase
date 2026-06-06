import React, { useEffect, useState } from "react";
import {
  collection, query, orderBy, onSnapshot,
  addDoc, deleteDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatINR } from "@/lib/api";
import { PlusCircle, Trash2, Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const EXPENSES_COLLECTION = "expenses";

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, EXPENSES_COLLECTION), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error(err);
      toast.error("Failed to load expenses");
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  const handleAdd = async () => {
    if (!desc.trim()) return toast.error("Description likhna zaroori hai");
    if (!amount || Number(amount) <= 0) return toast.error("Valid amount daalo");
    setSaving(true);
    try {
      await addDoc(collection(db, EXPENSES_COLLECTION), {
        desc: desc.trim(),
        amount: Number(amount),
        createdAt: serverTimestamp(),
      });
      setDesc("");
      setAmount("");
      toast.success("Expense add ho gaya");
    } catch (err) {
      console.error(err);
      toast.error("Add karne mein error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, EXPENSES_COLLECTION, id));
      toast.success("Expense delete ho gaya");
    } catch (err) {
      console.error(err);
      toast.error("Delete karne mein error");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return "";
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return format(d, "dd MMM, HH:mm");
    } catch { return ""; }
  };

  return (
    <div data-testid="expenses-screen" style={{ paddingBottom: 32 }}>

      {/* Total banner */}
      <div className="big-kpi" style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 16,
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}>
        <Receipt size={22} style={{ color: "var(--muted)", flexShrink: 0 }} />
        <div>
          <div className="k" style={{ fontSize: 12 }}>Total Expenses</div>
          <div className="v" style={{ fontSize: 22, fontWeight: 700, color: "var(--danger, #ef4444)" }}>
            {formatINR(total)}
          </div>
        </div>
      </div>

      {/* Add form */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--text)" }}>
          Naya Expense Add Karo
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            className="input"
            placeholder="Description (e.g. Screen parts, Bijli bill)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input mono"
              style={{ flex: 1 }}
              inputMode="numeric"
              placeholder="₹ Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <button
              className="btn primary"
              onClick={handleAdd}
              disabled={saving}
              style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
            >
              {saving ? <Loader2 size={14} className="spin" /> : <PlusCircle size={15} />}
              Add
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="empty"><Loader2 className="spin" style={{ display: "inline" }} /> Loading…</div>
      ) : expenses.length === 0 ? (
        <div className="empty">Koi expense nahi abhi tak. Upar se add karo.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {expenses.map((exp) => (
            <div key={exp.id} style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)", marginBottom: 2 }}>
                  {exp.desc}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{formatDate(exp.createdAt)}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--danger, #ef4444)", flexShrink: 0 }}>
                {formatINR(exp.amount)}
              </div>
              <button
                className="icon-btn"
                onClick={() => handleDelete(exp.id)}
                disabled={deletingId === exp.id}
                aria-label="Delete"
                style={{ color: "var(--muted)", flexShrink: 0 }}
              >
                {deletingId === exp.id
                  ? <Loader2 size={14} className="spin" />
                  : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
