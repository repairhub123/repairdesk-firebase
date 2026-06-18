import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { addJob, editJob, uploadPhoto, photoUrl, formatINR, decrementStock } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Camera, ImagePlus, X, Package } from "lucide-react";
import { getStoredRole } from "@/hooks/useRole";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

const REPAIR_TYPES = [
  "Screen", "Battery", "Charging", "Software",
  "Water Damage", "Speaker/Mic", "Camera", "Other",
];

const PERCENT_OPTIONS = [30, 40];

const EMPTY = {
  name: "", phone: "", model: "",
  types: [], description: "",
  cost: "", amount: "", percentage: 30,
  photoPath: "", photoPreview: "",
  selectedStockId: "",
};

function parseWork(work) {
  const w = (work || "").trim();
  if (!w) return { types: [], description: "" };
  const splitIdx = w.indexOf(" — ");
  const head = splitIdx >= 0 ? w.slice(0, splitIdx) : w;
  const tail = splitIdx >= 0 ? w.slice(splitIdx + 3).trim() : "";
  const candidates = head.split(",").map((s) => s.trim()).filter(Boolean);
  const matched = candidates.filter((c) => REPAIR_TYPES.includes(c));
  if (matched.length === 0) return { types: [], description: w };
  const extras = candidates.filter((c) => !REPAIR_TYPES.includes(c));
  const description = [extras.join(", "), tail].filter(Boolean).join(" — ");
  return { types: matched, description };
}

export default function JobDialog({ open, onOpenChange, onSaved, job }) {
  const isEdit = !!job;
  const [f, setF] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stockItems, setStockItems] = useState([]);
  const [stockSearch, setStockSearch] = useState("");
  const [showStockPicker, setShowStockPicker] = useState(false);
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  // Load stock items
  useEffect(() => {
    getDocs(query(collection(db, "stock"), orderBy("createdAt", "desc")))
      .then((snap) => setStockItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      const { types, description } = parseWork(job.work);
      setF({
        name: job.name || "",
        phone: job.phone || "",
        model: job.model || "",
        types,
        description,
        cost: String(job.cost ?? ""),
        amount: String(job.amount ?? ""),
        percentage: Number(job.percentage) || 30,
        photoPath: job.photo || "",
        photoPreview: "",
      });
    } else {
      setF(EMPTY);
    }
  }, [open, isEdit, job]);

  const profitValue = useMemo(() => Number(f.amount || 0) - Number(f.cost || 0), [f.amount, f.cost]);
  const technicianShare = useMemo(
    () => Math.round(profitValue * (Number(f.percentage) / 100) * 100) / 100,
    [profitValue, f.percentage]
  );
  const bossShare = useMemo(() => profitValue - technicianShare, [profitValue, technicianShare]);

  const toggleType = (t) =>
    setF((p) => ({
      ...p,
      types: p.types.includes(t) ? p.types.filter((x) => x !== t) : [...p.types, t],
    }));

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image too large (max 8MB)");
      return;
    }
    
    // Preview
    const reader = new FileReader();
    reader.onload = (e) => setF((p) => ({ ...p, photoPreview: e.target.result }));
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const { path } = await uploadPhoto(file);
      setF((p) => ({ ...p, photoPath: path }));
      toast.success("Photo uploaded");
    } catch (err) {
      console.error(err);
      toast.error("Photo upload failed");
      setF((p) => ({ ...p, photoPreview: "" }));
    } finally {
      setUploading(false);
    }
  };

  const clearPhoto = () => setF((p) => ({ ...p, photoPath: "", photoPreview: "" }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) return toast.error("Name is required");
    if (!f.phone.trim()) return toast.error("Phone is required");
    if (!f.model.trim()) return toast.error("Model is required");
    if (f.types.length === 0) return toast.error("Select at least one repair type");

    const work =
      f.types.join(", ") + (f.description.trim() ? ` — ${f.description.trim()}` : "");

    setSubmitting(true);
    try {
      const payload = {
        name: f.name.trim(),
        phone: f.phone.trim(),
        model: f.model.trim(),
        work,
        cost: Number(f.cost || 0),
        amount: Number(f.amount || 0),
        profit: profitValue,
        percentage: Number(f.percentage),
        technician_share: technicianShare,
        boss_share: bossShare,
        photo: f.photoPath || "",
        added_by: isEdit ? (job.added_by || "") : (getStoredRole() || ""),
      };
      
      if (isEdit) {
        await editJob(job.id, payload);
      } else {
        await addJob(payload);
        // Auto decrement stock if part was selected
        if (f.selectedStockId) {
          await decrementStock(f.selectedStockId);
        }
      }
      onOpenChange(false);
      onSaved && onSaved();
    } catch (err) {
      console.error(err);
      toast.error(isEdit ? "Failed to update job" : "Failed to add job");
    } finally {
      setSubmitting(false);
    }
  };

  const previewSrc = f.photoPreview || (f.photoPath ? photoUrl(f.photoPath) : "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="dialog-content max-w-lg max-h-[92vh] overflow-y-auto"
        data-testid="job-dialog"
      >
        <DialogHeader>
          <DialogTitle style={{ color: "var(--text)" }}>
            {isEdit ? "Edit Job" : "New Repair Job"}
          </DialogTitle>
          <DialogDescription style={{ color: "var(--muted)" }}>
            {isEdit
              ? "Update any field. Profit and share recalculate automatically."
              : "Fill in details. Profit and share are calculated automatically."}
          </DialogDescription>
        </DialogHeader>

        <form className="form" onSubmit={onSubmit}>
          {/* Photo */}
          <div className="field">
            <label>Phone photo</label>
            {previewSrc ? (
              <div className="photo-preview" data-testid="photo-preview">
                <img src={previewSrc} alt="Phone" />
                <button
                  type="button"
                  className="photo-remove"
                  data-testid="btn-remove-photo"
                  onClick={clearPhoto}
                  aria-label="Remove photo"
                >
                  <X size={14} />
                </button>
                {uploading && (
                  <div className="photo-overlay">
                    <Loader2 size={18} className="spin" />
                  </div>
                )}
              </div>
            ) : (
              <div className="photo-picker">
                <button
                  type="button"
                  className="btn photo-btn"
                  data-testid="btn-capture-camera"
                  onClick={() => cameraRef.current?.click()}
                  disabled={uploading}
                >
                  <Camera size={16} /> Camera
                </button>
                <button
                  type="button"
                  className="btn photo-btn"
                  data-testid="btn-pick-gallery"
                  onClick={() => galleryRef.current?.click()}
                  disabled={uploading}
                >
                  <ImagePlus size={16} /> Gallery
                </button>
              </div>
            )}
            <input
              ref={cameraRef} type="file" accept="image/*" capture="environment"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files?.[0])}
              data-testid="input-camera"
            />
            <input
              ref={galleryRef} type="file" accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files?.[0])}
              data-testid="input-gallery"
            />
          </div>

          <div className="field">
            <label>Customer name</label>
            <input
              data-testid="input-name"
              className="input"
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
              placeholder="Ravi Kumar"
            />
          </div>

          <div className="row2">
            <div className="field">
              <label>Phone</label>
              <input
                data-testid="input-phone"
                className="input" inputMode="tel"
                value={f.phone}
                onChange={(e) => setF({ ...f, phone: e.target.value })}
                placeholder="98xxxxxxxx"
              />
            </div>
            <div className="field">
              <label>Model</label>
              <input
                data-testid="input-model"
                className="input"
                value={f.model}
                onChange={(e) => setF({ ...f, model: e.target.value })}
                placeholder="iPhone 12"
              />
            </div>
          </div>

          <div className="field">
            <label>Repair type (multi-select)</label>
            <div className="chips" data-testid="repair-types">
              {REPAIR_TYPES.map((t) => (
                <button
                  type="button"
                  key={t}
                  data-testid={`chip-${t.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`}
                  className={`chip ${f.types.includes(t) ? "active" : ""}`}
                  onClick={() => toggleType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Description (optional)</label>
            <textarea
              data-testid="input-description"
              className="textarea"
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
              placeholder="Cracked display, touch works"
            />
          </div>

          <div className="row2">
            <div className="field">
              <label>Cost (₹)</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  data-testid="input-cost"
                  className="input mono" inputMode="numeric"
                  value={f.cost}
                  onChange={(e) => setF({ ...f, cost: e.target.value.replace(/[^0-9.]/g, "") })}
                  placeholder="0"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn"
                  title="Stock se pick karo"
                  style={{ padding: "0 10px", flexShrink: 0 }}
                  onClick={() => setShowStockPicker(!showStockPicker)}
                >
                  <Package size={15} />
                </button>
              </div>
              {/* Stock Picker Dropdown */}
              {showStockPicker && (
                <div style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  marginTop: 6,
                  padding: 10,
                  maxHeight: 220,
                  overflowY: "auto",
                }}>
                  <input
                    className="input"
                    placeholder="Part ya model search..."
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    style={{ marginBottom: 8, fontSize: 12 }}
                  />
                  {stockItems
                    .filter((s) => {
                      const q = stockSearch.toLowerCase();
                      return (s.name || "").toLowerCase().includes(q) || (s.model || "").toLowerCase().includes(q);
                    })
                    .map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          setF({ ...f, cost: String(s.buyPrice || ""), selectedStockId: s.id });
                          setShowStockPicker(false);
                          setStockSearch("");
                          toast.success(`${s.name} (${s.model}) — ₹${s.buyPrice} fill hua`);
                        }}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 8,
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: "var(--surface2, #1a1a1a)",
                          marginBottom: 6,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.model} • Stock: {s.qty}</div>
                        </div>
                        <div style={{ fontWeight: 700, color: "var(--primary, #a3e635)" }}>
                          ₹{s.buyPrice}
                        </div>
                      </div>
                    ))}
                  {stockItems.length === 0 && (
                    <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", padding: 10 }}>
                      Stock mein koi part nahi. Pehle Stock tab mein add karo.
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="field">
              <label>Amount (₹)</label>
              <input
                data-testid="input-amount"
                className="input mono" inputMode="numeric"
                value={f.amount}
                onChange={(e) => setF({ ...f, amount: e.target.value.replace(/[^0-9.]/g, "") })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="field">
            <label>Share percentage</label>
            <div className="chips">
              {PERCENT_OPTIONS.map((p) => (
                <button
                  type="button"
                  key={p}
                  data-testid={`chip-percent-${p}`}
                  className={`chip ${Number(f.percentage) === p ? "active" : ""}`}
                  onClick={() => setF({ ...f, percentage: p })}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>

          <div className="calc" data-testid="calc-preview">
            <div className="cell">
              <div className="k">Profit</div>
              <div className="v profit">{formatINR(profitValue)}</div>
            </div>
            <div className="cell">
              <div className="k">Technician ({f.percentage}%)</div>
              <div className="v tech">{formatINR(technicianShare)}</div>
            </div>
            <div className="cell">
              <div className="k">Boss</div>
              <div className="v boss">{formatINR(bossShare)}</div>
            </div>
          </div>

          <DialogFooter style={{ marginTop: 6 }}>
            <button
              type="button"
              data-testid="btn-cancel"
              className="btn"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="btn-save-job"
              className="btn primary"
              disabled={submitting || uploading}
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="spin" /> Saving…
                </>
              ) : isEdit ? "Save Changes" : "Save Job"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
