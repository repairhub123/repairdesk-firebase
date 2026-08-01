import React, { useEffect, useState, useMemo } from "react";
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatINR } from "@/lib/api";
import { format } from "date-fns";
import { PlusCircle, Trash2, Loader2, ChevronDown, ChevronUp, Plus, X, Check, IndianRupee } from "lucide-react";
import { toast } from "sonner";

const DUES_COLLECTION = "dues";
const EMPTY_FORM = { name: "", phone: "", total: "", paid: "", note: "" };

function statusInfo(due) {
  const total = Number(due.total || 0);
  const paid = Number(due.paid || 0);
  const remaining = total - paid;
  if (remaining <= 0) return { label: "Cleared ✅", color: "#4ade80", remaining: 0 };
  if (paid === 0) return { label: "Unpaid 🔴", color: "#ef4444", remaining };
  return { label: "Partial 🟡", color: "#f59e0b", remaining };
}

function formatDate(ts) {
  if (!ts) return "";
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return format(d, "dd MMM, HH:mm");
  } catch { return ""; }
}

export default function Dues() {
  const [dues, setDues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState("all"); // all | unpaid | partial | cleared

  useEffect(() => {
    const q = query(collection(db, DUES_COLLECTION), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setDues(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error(err);
      toast.error("Dues load nahi hua");
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const totalDue = useMemo(() =>
    dues.reduce((s, d) => s + Math.max(0, Number(d.total || 0) - Number(d.paid || 0)), 0),
    [dues]
  );

  const filtered = useMemo(() => {
    return dues.filter((d) => {
      const { label } = statusInfo(d);
      if (filter === "all") return true;
      if (filter === "unpaid") return label.includes("Unpaid");
      if (filter === "partial") return label.includes("Partial");
      if (filter === "cleared") return label.includes("Cleared");
      return true;
    });
  }, [dues, filter]);

  const handleAdd = async () => {
    if (!form.name.trim()) return toast.error("Customer naam daalo");
    if (!form.total || Number(form.total) <= 0) return toast.error("Total amount daalo");
    const paid = Number(form.paid || 0);
    const total = Number(form.total);
    if (paid > total) return toast.error("Paid amount total se zyada nahi ho sakta");
    setSaving(true);
    try {
      await addDoc(collection(db, DUES_COLLECTION), {
        name: form.name.trim(),
        phone: form.phone.trim(),
        total,
        paid,
        note: form.note.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setForm(EMPTY_FORM);
      setShowAdd(false);
      toast.success("Due add ho gaya ✅");
    } catch (err) {
      console.error(err);
      toast.error("Add karne mein error");
    } finally {
      setSaving(false);
    }
  };

  const handlePayment = async (due) => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) return toast.error("Valid amount daalo");
    const newPaid = Math.min(Number(due.total || 0), Number(due.paid || 0) + amount);
    try {
      await updateDoc(doc(db, DUES_COLLECTION, due.id), {
        paid: newPaid,
        updatedAt: serverTimestamp(),
      });
      setPayingId(null);
      setPayAmount("");
      const remaining = Number(due.total || 0) - newPaid;
      if (remaining <= 0) toast.success("Payment complete! Due cleared ✅");
      else toast.success(`₹${amount} mila — ₹${remaining} baaki hai`);
    } catch (err) {
      toast.error("Update nahi hua");
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, DUES_COLLECTION, id));
      toast.success("Due delete ho gaya");
    } catch (err) {
      toast.error("Delete nahi hua");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ paddingBottom: 32 }}>

      {/* Total Due Banner */}
      <div style={{
        background: totalDue > 0 ? "#2a1010" : "#0f2a15",
        border: `1px solid ${totalDue > 0 ? "#ef4444" : "#4ade80"}`,
        borderRadius: 12,
        padding: "14px 18px",
        marginBottom: 14,
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}>
        <IndianRupee size={22} color={totalDue > 0 ? "#ef4444" : "#4ade80"} />
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Total Baaki</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: totalDue > 0 ? "#ef4444" : "#4ade80" }}>
            {formatINR(totalDue)}
          </div>
        </div>
        <button
          className="btn primary"
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}
          onClick={() => setShowAdd(!showAdd)}
        >
          <PlusCircle size={15} /> Add Due
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 14,
          marginBottom: 14,
        }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Naya Due Add Karo</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input className="input" placeholder="Customer naam *" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input" placeholder="Phone (optional)" value={form.phone}
              inputMode="tel"
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^0-9+]/g, "") })} />
            <div style={{ display: "flex", gap: 8 }}>
              <input className="input mono" style={{ flex: 1 }} inputMode="numeric"
                placeholder="₹ Total amount *"
                value={form.total}
                onChange={(e) => setForm({ ...form, total: e.target.value.replace(/[^0-9.]/g, "") })} />
              <input className="input mono" style={{ flex: 1 }} inputMode="numeric"
                placeholder="₹ Abhi diya"
                value={form.paid}
                onChange={(e) => setForm({ ...form, paid: e.target.value.replace(/[^0-9.]/g, "") })} />
            </div>
            <input className="input" placeholder="Note (optional, e.g. Screen repair)"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })} />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn full" style={{ background: "var(--surface2, #2a2a2a)" }}
                onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); }}>
                Cancel
              </button>
              <button className="btn primary full" onClick={handleAdd} disabled={saving}>
                {saving ? <Loader2 size={14} className="spin" /> : <Check size={14} />} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {[
          { key: "all", label: "Sab" },
          { key: "unpaid", label: "🔴 Unpaid" },
          { key: "partial", label: "🟡 Partial" },
          { key: "cleared", label: "✅ Cleared" },
        ].map((f) => (
          <button
            key={f.key}
            className={`chip ${filter === f.key ? "active" : ""}`}
            onClick={() => setFilter(f.key)}
            style={{ fontSize: 12 }}
          >{f.label}</button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="empty"><Loader2 className="spin" style={{ display: "inline" }} /> Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="empty">Koi due nahi. ✅</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((due) => {
            const { label, color, remaining } = statusInfo(due);
            const isExpanded = expanded === due.id;
            const isPaying = payingId === due.id;

            return (
              <div key={due.id} style={{
                background: "var(--surface)",
                border: `1px solid ${remaining > 0 ? color + "55" : "var(--border)"}`,
                borderRadius: 12,
                padding: 14,
              }}>
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{due.name}</span>
                      <span style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</span>
                    </div>
                    {due.phone && (
                      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>📞 {due.phone}</div>
                    )}
                    {due.note && (
                      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>📝 {due.note}</div>
                    )}
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                      <div>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>Total: </span>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{formatINR(due.total)}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>Mila: </span>
                        <span style={{ fontWeight: 600, fontSize: 13, color: "#4ade80" }}>{formatINR(due.paid)}</span>
                      </div>
                      {remaining > 0 && (
                        <div>
                          <span style={{ fontSize: 11, color: "var(--muted)" }}>Baaki: </span>
                          <span style={{ fontWeight: 700, fontSize: 14, color: "#ef4444" }}>{formatINR(remaining)}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                      {formatDate(due.createdAt)}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                    <button className="icon-btn" onClick={() => setExpanded(isExpanded ? null : due.id)}>
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                    <button className="icon-btn" style={{ color: "#ef4444" }}
                      onClick={() => handleDelete(due.id)} disabled={deletingId === due.id}>
                      {deletingId === due.id ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>

                {/* Expanded — payment input */}
                {isExpanded && remaining > 0 && (
                  <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                    {isPaying ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          className="input mono"
                          style={{ flex: 1 }}
                          inputMode="numeric"
                          placeholder={`₹ kitna mila? (max ${formatINR(remaining)})`}
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                          autoFocus
                        />
                        <button className="btn primary" onClick={() => handlePayment(due)} style={{ padding: "0 14px" }}>
                          <Check size={14} />
                        </button>
                        <button className="btn" onClick={() => { setPayingId(null); setPayAmount(""); }} style={{ padding: "0 10px" }}>
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn primary full"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                        onClick={() => { setPayingId(due.id); setPayAmount(""); }}
                      >
                        <Plus size={14} /> Payment Received
                      </button>
                    )}
                  </div>
                )}

                {isExpanded && remaining <= 0 && (
                  <div style={{ marginTop: 10, textAlign: "center", fontSize: 13, color: "#4ade80" }}>
                    ✅ Pura payment aa gaya!
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
