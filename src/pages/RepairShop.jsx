import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Plus, Search, Wrench, Loader2, Crown, User, LogOut, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  markCompleted, 
  formatINR, display,
  deleteJob,
  resetAllData,
} from "@/lib/api";
import JobDialog from "@/components/JobDialog";
import JobCard from "@/components/JobCard";
import Reports from "@/components/Reports";
import TodayStats from "@/components/TodayStats";
import CustomerHistory from "@/components/CustomerHistory";
import Expenses from "@/components/Expenses";
import Stock from "@/components/Stock";

const TABS = ["All", "Pending", "Completed"];

export default function RepairShop({ role, onSwitchRole }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("jobs");
  const [tab, setTab] = useState("All");
  const [scope, setScope] = useState("all"); // "all" | "mine"
  const [queryText, setQueryText] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [historyPhone, setHistoryPhone] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // job to delete
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Realtime Firestore Listener
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setJobs(data);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Listen Error:", error);
      toast.error("Realtime sync error");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSaved = () => {
    toast.success(editingJob ? "Job updated" : "Job added");
    setEditingJob(null);
  };

  const handleComplete = async (jobId) => {
    setBusyId(jobId);
    try {
      await markCompleted(jobId);
      toast.success("Job completed");
    } catch (err) {
      console.error(err);
      toast.error("Failed to complete job");
    } finally {
      setBusyId(null);
    }
  };

  const openAdd = () => { setEditingJob(null); setDialogOpen(true); };
  const openEdit = (job) => { setEditingJob(job); setDialogOpen(true); };
  const openCustomer = (phone) => phone && setHistoryPhone(phone);

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    try {
      await deleteJob(confirmDelete.id);
      toast.success("Job deleted");
    } catch (err) {
      toast.error("Failed to delete job");
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleResetConfirm = async () => {
    setResetting(true);
    try {
      await resetAllData();
      toast.success("All data reset successfully!");
    } catch (err) {
      toast.error("Failed to reset data");
    } finally {
      setResetting(false);
      setConfirmReset(false);
    }
  };

  const visibleJobs = useMemo(() => {
    if (scope === "mine" && role) {
      return jobs.filter((j) => (j.added_by || "") === role);
    }
    return jobs;
  }, [jobs, scope, role]);

  const filtered = useMemo(() => {
    let list = visibleJobs;
    if (tab === "Pending") list = list.filter((j) => j.status !== "Completed");
    if (tab === "Completed") list = list.filter((j) => j.status === "Completed");
    
    const q = queryText.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (j) =>
          (j.name || "").toLowerCase().includes(q) ||
          (j.phone || "").toLowerCase().includes(q) ||
          (j.model || "").toLowerCase().includes(q)
      );
    }
    return list; // Firestore already sorts by createdAt desc
  }, [visibleJobs, tab, queryText]);

  const totals = useMemo(() => {
    const pending = jobs.filter((j) => j.status !== "Completed").length;
    const completedJobs = jobs.filter((j) => j.status === "Completed");
    const sum = (k) => completedJobs.reduce((s, j) => s + Number(j[k] || 0), 0);
    return {
      pending,
      completed: completedJobs.length,
      profit: sum("profit"),
      boss: sum("boss_share"),
      technician: sum("technician_share"),
    };
  }, [jobs]);

  const isBoss = role === "Boss";
  const primaryShareLabel = isBoss ? "Boss Share" : "Technician Share";
  const primaryShareValue = isBoss ? totals.boss : totals.technician;

  return (
    <div className="shell" data-testid="app-shell">
      <header className="header">
        <div className="brand">
          <div className="brand-mark">
            <Wrench size={18} />
          </div>
          <div>
            <h1>Repair Desk</h1>
            <small>mobile repair shop</small>
          </div>
        </div>
        <div className="header-right">
          <button
            type="button"
            className="role-chip"
            onClick={() => setConfirmReset(true)}
            style={{ background: "var(--danger, #ef4444)", color: "#fff", marginRight: 6 }}
            title="Reset all data"
          >
            Reset Month
          </button>
          <button
            type="button"
            className={`role-chip ${isBoss ? "boss" : "tech"}`}
            onClick={onSwitchRole}
            data-testid="role-chip"
            title="Change role"
          >
            {isBoss ? <Crown size={12} /> : <User size={12} />}
            {role}
            <LogOut size={10} style={{ opacity: 0.6 }} />
          </button>
        </div>
      </header>

      <div className="view-switch" data-testid="view-switch">
        <button
          data-testid="view-jobs"
          className={`vbtn ${view === "jobs" ? "active" : ""}`}
          onClick={() => setView("jobs")}
        >Jobs</button>
        <button
          data-testid="view-expenses"
          className={`vbtn ${view === "expenses" ? "active" : ""}`}
          onClick={() => setView("expenses")}
        >Expenses</button>
        <button
          data-testid="view-stock"
          className={`vbtn ${view === "stock" ? "active" : ""}`}
          onClick={() => setView("stock")}
        >Stock</button>
        <button
          data-testid="view-reports"
          className={`vbtn ${view === "reports" ? "active" : ""}`}
          onClick={() => setView("reports")}
        >Reports</button>
      </div>

      {view === "jobs" ? (
        <>
          <TodayStats jobs={jobs} role={role} />

          <div className="kpis" data-testid="kpis">
            <div className="kpi warn" data-testid="kpi-pending">
              <div className="label">Pending</div>
              <div className="value">{totals.pending}</div>
            </div>
            <div className="kpi" data-testid="kpi-completed">
              <div className="label">Completed</div>
              <div className="value">{totals.completed}</div>
            </div>
            <div
              className={`kpi ${isBoss ? "kpi-boss" : "kpi-tech"}`}
              data-testid="kpi-my-share"
            >
              <div className="label">{primaryShareLabel}</div>
              <div className="value">{formatINR(primaryShareValue)}</div>
            </div>
          </div>

          <div style={{ position: "relative" }}>
            <Search
              size={16}
              style={{
                position: "absolute", left: 14, top: "50%",
                transform: "translateY(-50%)", color: "var(--muted)",
              }}
            />
            <input
              data-testid="search-input"
              className="search"
              style={{ paddingLeft: 40 }}
              placeholder="Search by name, phone or model"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
            />
          </div>

          <div className="scope-row" data-testid="scope-row">
            <button
              data-testid="scope-all"
              className={`chip ${scope === "all" ? "active" : ""}`}
              onClick={() => setScope("all")}
            >All jobs</button>
            <button
              data-testid="scope-mine"
              className={`chip ${scope === "mine" ? "active" : ""}`}
              onClick={() => setScope("mine")}
            >Added by me</button>
          </div>

          <div className="tabs" role="tablist" data-testid="tabs">
            {TABS.map((t) => (
              <button
                key={t}
                data-testid={`tab-${t.toLowerCase()}`}
                className={`tab ${tab === t ? "active" : ""}`}
                onClick={() => setTab(t)}
              >{t}</button>
            ))}
          </div>

          {loading ? (
            <div className="empty" data-testid="loading">
              <Loader2 className="spin" style={{ display: "inline" }} /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty" data-testid="empty-state">
              {scope === "mine"
                ? "No jobs added by you in this filter yet."
                : "No jobs here yet. Tap the + button to add one."}
            </div>
          ) : (
            <div className="list" data-testid="job-list">
              {filtered.map((j) => (
                <JobCard
                  key={j.id}
                  job={j}
                  onComplete={handleComplete}
                  onEdit={openEdit}
                  onDelete={(job) => setConfirmDelete(job)}
                  onOpenCustomer={openCustomer}
                  busy={busyId === j.id}
                  formatINR={formatINR}
                  display={display}
                />
              ))}
            </div>
          )}

          <button
            className="fab"
            data-testid="fab-add-job"
            onClick={openAdd}
            aria-label="Add job"
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
        </>
      ) : view === "expenses" ? (
        <Expenses />
      ) : view === "stock" ? (
        <Stock />
      ) : (
        <Reports jobs={jobs} />
      )}

      <JobDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditingJob(null);
        }}
        onSaved={handleSaved}
        job={editingJob}
      />

      <CustomerHistory
        open={!!historyPhone}
        onOpenChange={(o) => { if (!o) setHistoryPhone(null); }}
        phone={historyPhone}
        jobs={jobs}
      />

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="lightbox" onClick={() => setConfirmDelete(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--card, #1a1a1a)",
              borderRadius: 16,
              padding: 24,
              maxWidth: 320,
              width: "90%",
              textAlign: "center",
            }}
          >
            <Trash2 size={32} color="#ef4444" style={{ marginBottom: 12 }} />
            <h3 style={{ marginBottom: 8 }}>Delete Job?</h3>
            <p style={{ color: "var(--muted)", marginBottom: 20, fontSize: 14 }}>
              <strong>{confirmDelete.name}</strong> — {confirmDelete.model}<br />
              This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn full"
                style={{ background: "var(--surface2, #2a2a2a)" }}
                onClick={() => setConfirmDelete(null)}
              >Cancel</button>
              <button
                className="btn primary full"
                style={{ background: "#ef4444" }}
                onClick={handleDeleteConfirm}
              >Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation */}
      {confirmReset && (
        <div className="lightbox" onClick={() => setConfirmReset(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--card, #1a1a1a)",
              borderRadius: 16,
              padding: 24,
              maxWidth: 320,
              width: "90%",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: 36 }}>⚠️</span>
            <h3 style={{ marginBottom: 8, marginTop: 12 }}>Reset All Data?</h3>
            <p style={{ color: "var(--muted)", marginBottom: 20, fontSize: 14 }}>
              This will permanently delete <strong>ALL jobs and expenses</strong>.<br />
              Use this at month end after taking hisab.<br /><br />
              <strong style={{ color: "#ef4444" }}>This cannot be undone!</strong>
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn full"
                style={{ background: "var(--surface2, #2a2a2a)" }}
                onClick={() => setConfirmReset(false)}
                disabled={resetting}
              >Cancel</button>
              <button
                className="btn primary full"
                style={{ background: "#ef4444" }}
                onClick={handleResetConfirm}
                disabled={resetting}
              >
                {resetting ? "Resetting..." : "Yes, Reset Everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
