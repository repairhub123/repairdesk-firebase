import React, { useEffect, useState, useMemo } from "react";
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatINR } from "@/lib/api";
import { PlusCircle, Trash2, Loader2, Package, Plus, Minus, Pencil, X, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const STOCK_COLLECTION = "stock";
const LOW_STOCK_THRESHOLD = 2;

const EMPTY_FORM = { name: "", model: "", qty: "", buyPrice: "" };

export default function Stock() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [search, setSearch] = useState("");
  const [adjustId, setAdjustId] = useState(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustType, setAdjustType] = useState("in"); // "in" | "out"

  useEffect(() => {
    const q = query(collection(db, STOCK_COLLECTION), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error(err);
      toast.error("Stock load nahi hua");
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        (i.name || "").toLowerCase().includes(q) ||
        (i.model || "").toLowerCase().includes(q)
    );
  }, [items, search]);

  const lowStockItems = items.filter((i) => Number(i.qty || 0) <= LOW_STOCK_THRESHOLD);

  const handleAdd = async () => {
    if (!form.name.trim()) return toast.error("Part ka naam daalo");
    if (!form.model.trim()) return toast.error("Model daalo");
    if (!form.qty || Number(form.qty) < 0) return toast.error("Quantity daalo");
    if (!form.buyPrice || Number(form.buyPrice) <= 0) return toast.error("Buying price daalo");
    setSaving(true);
    try {
      await addDoc(collection(db, STOCK_COLLECTION), {
        name: form.name.trim(),
        model: form.model.trim(),
        qty: Number(form.qty),
        buyPrice: Number(form.buyPrice),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setForm(EMPTY_FORM);
      toast.success("Part add ho gaya ✅");
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
      await deleteDoc(doc(db, STOCK_COLLECTION, id));
      toast.success("Part delete ho gaya");
    } catch (err) {
      toast.error("Delete nahi hua");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditSave = async (id) => {
    if (!editForm.name?.trim()) return toast.error("Naam daalo");
    if (!editForm.model?.trim()) return toast.error("Model daalo");
    try {
      await updateDoc(doc(db, STOCK_COLLECTION, id), {
        name: editForm.name.trim(),
        model: editForm.model.trim(),
        buyPrice: Number(editForm.buyPrice || 0),
        updatedAt: serverTimestamp(),
      });
      setEditingId(null);
      toast.success("Updated ✅");
    } catch (err) {
      toast.error("Update nahi hua");
    }
  };

  const handleAdjust = async (id) => {
    const delta = Number(adjustQty);
    if (!delta || delta <= 0) return toast.error("Valid quantity daalo");
    const item = items.find((i) => i.id === id);
    const currentQty = Number(item?.qty || 0);
    const newQty = adjustType === "in" ? currentQty + delta : Math.max(0, currentQty - delta);
    try {
      await updateDoc(doc(db, STOCK_COLLECTION, id), {
        qty: newQty,
        updatedAt: serverTimestamp(),
      });
      setAdjustId(null);
      setAdjustQty("");
      toast.success(adjustType === "in" ? `+${delta} stock add hua` : `-${delta} stock kam hua`);
    } catch (err) {
      toast.error("Update nahi hua");
    }
  };

  return (
    <div style={{ paddingBottom: 32 }}>

      {/* Low stock warning */}
      {lowStockItems.length > 0 && (
        <div style={{
          background: "#2a1a00",
          border: "1px solid #f59e0b",
          borderRadius: 10,
          padding: "10px 14px",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <AlertTriangle size={18} color="#f59e0b" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b" }}>
              Low Stock Alert ⚠️
            </div>
            <div style={{ fontSize: 12, color: "#f59e0b", opacity: 0.8 }}>
              {lowStockItems.map((i) => `${i.name} (${i.model}): ${i.qty} left`).join(" • ")}
            </div>
          </div>
        </div>
      )}

      {/* Add Part Form */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--text)" }}>
          Naya Part Add Karo
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            className="input"
            placeholder="Part naam (e.g. Screen, Battery)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="input"
            placeholder="Model (e.g. iPhone 13, Samsung A52)"
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input mono"
              style={{ flex: 1 }}
              inputMode="numeric"
              placeholder="Qty"
              value={form.qty}
              onChange={(e) => setForm({ ...form, qty: e.target.value.replace(/[^0-9]/g, "") })}
            />
            <input
              className="input mono"
              style={{ flex: 1 }}
              inputMode="numeric"
              placeholder="₹ Buy Price"
              value={form.buyPrice}
              onChange={(e) => setForm({ ...form, buyPrice: e.target.value.replace(/[^0-9.]/g, "") })}
            />
          </div>
          <button
            className="btn primary"
            onClick={handleAdd}
            disabled={saving}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            {saving ? <Loader2 size={14} className="spin" /> : <PlusCircle size={15} />}
            Add Part
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        className="search"
        placeholder="Part ya model search karo..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 12 }}
      />

      {/* List */}
      {loading ? (
        <div className="empty"><Loader2 className="spin" style={{ display: "inline" }} /> Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          {search ? "Koi part nahi mila." : "Koi part nahi abhi tak. Upar se add karo."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((item) => {
            const isLow = Number(item.qty || 0) <= LOW_STOCK_THRESHOLD;
            const isEditing = editingId === item.id;
            const isAdjusting = adjustId === item.id;

            return (
              <div key={item.id} style={{
                background: "var(--surface)",
                border: `1px solid ${isLow ? "#f59e0b" : "var(--border)"}`,
                borderRadius: 12,
                padding: 14,
              }}>
                {isEditing ? (
                  // Edit mode
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input
                      className="input"
                      value={editForm.name || ""}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Part naam"
                    />
                    <input
                      className="input"
                      value={editForm.model || ""}
                      onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                      placeholder="Model"
                    />
                    <input
                      className="input mono"
                      inputMode="numeric"
                      value={editForm.buyPrice || ""}
                      onChange={(e) => setEditForm({ ...editForm, buyPrice: e.target.value.replace(/[^0-9.]/g, "") })}
                      placeholder="₹ Buy Price"
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn full" style={{ background: "var(--surface2, #2a2a2a)" }} onClick={() => setEditingId(null)}>
                        <X size={14} /> Cancel
                      </button>
                      <button className="btn primary full" onClick={() => handleEditSave(item.id)}>
                        <Check size={14} /> Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <Package size={18} style={{ color: isLow ? "#f59e0b" : "var(--muted)", marginTop: 2, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>
                          {item.name}
                          {isLow && <span style={{ color: "#f59e0b", fontSize: 11, marginLeft: 6 }}>⚠️ Low</span>}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{item.model}</div>
                        <div style={{ display: "flex", gap: 16 }}>
                          <div>
                            <span style={{ fontSize: 11, color: "var(--muted)" }}>Stock: </span>
                            <span style={{ fontWeight: 700, fontSize: 15, color: isLow ? "#f59e0b" : "var(--primary, #a3e635)" }}>
                              {item.qty}
                            </span>
                          </div>
                          <div>
                            <span style={{ fontSize: 11, color: "var(--muted)" }}>Buy: </span>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{formatINR(item.buyPrice)}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <button
                          className="icon-btn"
                          onClick={() => { setEditingId(item.id); setEditForm({ name: item.name, model: item.model, buyPrice: item.buyPrice }); }}
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="icon-btn"
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          style={{ color: "#ef4444" }}
                          title="Delete"
                        >
                          {deletingId === item.id ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
                        </button>
                      </div>
                    </div>

                    {/* Stock adjust */}
                    {isAdjusting ? (
                      <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                        <button
                          className={`chip ${adjustType === "in" ? "active" : ""}`}
                          onClick={() => setAdjustType("in")}
                          style={{ fontSize: 12 }}
                        >+ Stock In</button>
                        <button
                          className={`chip ${adjustType === "out" ? "active" : ""}`}
                          onClick={() => setAdjustType("out")}
                          style={{ fontSize: 12 }}
                        >- Stock Out</button>
                        <input
                          className="input mono"
                          style={{ flex: 1, minWidth: 0 }}
                          inputMode="numeric"
                          placeholder="Qty"
                          value={adjustQty}
                          onChange={(e) => setAdjustQty(e.target.value.replace(/[^0-9]/g, ""))}
                        />
                        <button className="btn primary" onClick={() => handleAdjust(item.id)} style={{ padding: "6px 12px" }}>
                          <Check size={14} />
                        </button>
                        <button className="btn" onClick={() => { setAdjustId(null); setAdjustQty(""); }} style={{ padding: "6px 10px" }}>
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                        <button
                          className="btn full"
                          style={{ background: "var(--surface2, #1e2a1e)", color: "#4ade80", fontSize: 12, gap: 4 }}
                          onClick={() => { setAdjustId(item.id); setAdjustType("in"); setAdjustQty(""); }}
                        >
                          <Plus size={13} /> Stock In
                        </button>
                        <button
                          className="btn full"
                          style={{ background: "var(--surface2, #2a1e1e)", color: "#f87171", fontSize: 12, gap: 4 }}
                          onClick={() => { setAdjustId(item.id); setAdjustType("out"); setAdjustQty(""); }}
                        >
                          <Minus size={13} /> Stock Out
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
