import React, { useState, useEffect } from "react";
import {
  CheckCircle2, Loader2, Phone, Smartphone, ImageIcon, Pencil, Crown, User, Trash2, IndianRupee, Check, X,
} from "lucide-react";
import { format } from "date-fns";
import { photoUrl } from "@/lib/api";
import { collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

export default function JobCard({
  job, onComplete, onEdit, onDelete, onOpenCustomer, busy, formatINR, display,
}) {
  const isCompleted = job.status === "Completed";
  const [zoom, setZoom] = useState(false);
  const [due, setDue] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payLoading, setPayLoading] = useState(false);

  const photo = job.photo ? photoUrl(job.photo) : "";
  const addedBy = (job.added_by || "").trim();

  // Listen for linked due in realtime
  useEffect(() => {
    if (!job.phone || !job.name) return;
    const q = query(
      collection(db, "dues"),
      where("phone", "==", job.phone),
      where("name", "==", job.name)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const d = snap.docs[0];
        const data = { id: d.id, ...d.data() };
        const remaining = Number(data.total || 0) - Number(data.paid || 0);
        if (remaining > 0) setDue(data);
        else setDue(null);
      } else {
        setDue(null);
      }
    });
    return () => unsub();
  }, [job.phone, job.name]);

  const handlePayment = async () => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) return toast.error("Valid amount daalo");
    const remaining = Number(due.total || 0) - Number(due.paid || 0);
    const newPaid = Math.min(Number(due.total || 0), Number(due.paid || 0) + amount);
    setPayLoading(true);
    try {
      await updateDoc(doc(db, "dues", due.id), {
        paid: newPaid,
        updatedAt: serverTimestamp(),
      });
      setPaying(false);
      setPayAmount("");
      if (amount >= remaining) toast.success("Due clear ho gaya! ✅");
      else toast.success(`₹${amount} mila — ₹${remaining - amount} baaki`);
    } catch (err) {
      toast.error("Update nahi hua");
    } finally {
      setPayLoading(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return "N/A";
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return format(d, "dd MMM yyyy HH:mm");
    } catch { return "N/A"; }
  };

  const remaining = due ? Number(due.total || 0) - Number(due.paid || 0) : 0;

  return (
    <div className="job" data-testid={`job-card-${job.id}`}
      style={{ borderColor: due ? "#ef444466" : undefined }}>
      <div className="job-top">
        {photo ? (
          <button type="button" className="job-photo" onClick={() => setZoom(true)}
            data-testid={`job-photo-${job.id}`} aria-label="View photo">
            <img src={photo} alt="Phone" loading="lazy" />
          </button>
        ) : (
          <div className="job-photo placeholder"><ImageIcon size={22} /></div>
        )}

        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="job-name-row">
            <div className="job-name" data-testid={`job-name-${job.id}`}>
              {display(job.name)}
            </div>
            {addedBy && (
              <span className={`added-pill ${addedBy === "Boss" ? "boss" : "tech"}`}
                data-testid={`added-by-${job.id}`} title={`Added by ${addedBy}`}>
                {addedBy === "Boss" ? <Crown size={10} /> : <User size={10} />}
                {addedBy}
              </span>
            )}
          </div>
          <button type="button" className="job-phone linkish"
            onClick={() => onOpenCustomer && onOpenCustomer(job.phone)}
            data-testid={`job-phone-${job.id}`}>
            <Phone size={11} style={{ display: "inline", marginRight: 4 }} />
            {display(job.phone)}
          </button>
          <div className="job-model">
            <Smartphone size={12} style={{ display: "inline", marginRight: 6 }} />
            {display(job.model)}
          </div>
          <div className="job-work">{display(job.work)}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          <span className={`badge ${isCompleted ? "completed" : "pending"}`}
            data-testid={`job-status-${job.id}`}>
            {isCompleted ? "Completed" : "Pending"}
          </span>
          <button type="button" className="icon-btn" onClick={() => onEdit(job)}
            data-testid={`btn-edit-${job.id}`} aria-label="Edit job">
            <Pencil size={13} />
          </button>
          <button type="button" className="icon-btn" onClick={() => onDelete(job)}
            data-testid={`btn-delete-${job.id}`} aria-label="Delete job"
            style={{ color: "var(--danger, #ef4444)", marginTop: 2 }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="grid-3 fin-row">
        <div className="cell">
          <div className="k">Amount</div>
          <div className="v" data-testid={`job-amount-${job.id}`}>{formatINR(job.amount)}</div>
        </div>
        <div className="cell">
          <div className="k">Cost</div>
          <div className="v" data-testid={`job-cost-${job.id}`}>{formatINR(job.cost)}</div>
        </div>
        <div className="cell">
          <div className="k">Profit</div>
          <div className="v profit" data-testid={`job-profit-${job.id}`}>{formatINR(job.profit)}</div>
        </div>
      </div>

      <div className="split-row">
        <div className="split-cell tech" data-testid={`job-tech-${job.id}`}>
          <div className="k">Technician ({job.percentage || 30}%)</div>
          <div className="v">{formatINR(job.technician_share)}</div>
        </div>
        <div className="split-cell boss" data-testid={`job-boss-${job.id}`}>
          <div className="k">Boss</div>
          <div className="v">{formatINR(job.boss_share)}</div>
        </div>
      </div>

      {/* Due Banner */}
      {due && (
        <div style={{
          background: "#2a0a0a",
          border: "1px solid #ef4444",
          borderRadius: 10,
          padding: "10px 14px",
          marginTop: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: paying ? 10 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <IndianRupee size={15} color="#ef4444" />
              <span style={{ fontSize: 13, color: "#ef4444", fontWeight: 700 }}>
                Due: {formatINR(remaining)} baaki
              </span>
            </div>
            {!paying && (
              <button
                className="btn primary"
                style={{ fontSize: 12, padding: "4px 12px", background: "#ef4444" }}
                onClick={() => { setPaying(true); setPayAmount(""); }}
              >
                Payment Liya
              </button>
            )}
          </div>

          {paying && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                className="input mono"
                style={{ flex: 1 }}
                inputMode="numeric"
                placeholder={`₹ Kitna mila? (max ${formatINR(remaining)})`}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                autoFocus
              />
              <button className="btn primary" onClick={handlePayment} disabled={payLoading}
                style={{ padding: "0 12px", background: "#ef4444" }}>
                {payLoading ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
              </button>
              <button className="btn" onClick={() => { setPaying(false); setPayAmount(""); }}
                style={{ padding: "0 10px" }}>
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="meta">
        <span className="mono">Recv: {formatDate(job.receivedAt)}</span>
        {isCompleted && <span className="mono">Done: {formatDate(job.completedAt)}</span>}
      </div>

      {!isCompleted && (
        <div className="actions">
          <button className="btn primary full" data-testid={`btn-complete-${job.id}`}
            onClick={() => onComplete(job.id)} disabled={busy}>
            {busy
              ? <><Loader2 size={14} className="spin" /> Updating…</>
              : <><CheckCircle2 size={15} /> Mark as Completed</>}
          </button>
        </div>
      )}

      {zoom && photo && (
        <div className="lightbox" onClick={() => setZoom(false)}
          data-testid={`job-photo-zoom-${job.id}`}>
          <img src={photo} alt="Phone" />
        </div>
      )}
    </div>
  );
}
