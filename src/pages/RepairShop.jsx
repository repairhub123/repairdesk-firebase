import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Plus, Search, Wrench, Loader2, Crown, User, LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  markCompleted, 
  formatINR, display
} from "@/lib/api";
import JobDialog from "@/components/JobDialog";
import JobCard from "@/components/JobCard";
import Reports from "@/components/Reports";
import TodayStats from "@/components/TodayStats";
import CustomerHistory from "@/components/CustomerHistory";
import Expenses from "@/components/Expenses";

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
    </div>
  );
}
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Plus, Search, Wrench, Loader2, Crown, User, LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  markCompleted, 
  formatINR, display
} from "@/lib/api";
import JobDialog from "@/components/JobDialog";
import JobCard from "@/components/JobCard";
import Reports from "@/components/Reports";
import TodayStats from "@/components/TodayStats";
import CustomerHistory from "@/components/CustomerHistory";
import Expenses from "@/components/Expenses";

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
    </div>
  );
}
