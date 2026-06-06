import React, { useEffect, useMemo, useState } from "react";
import { formatINR } from "@/lib/api";
import {
  TrendingUp, Receipt, Wallet, Briefcase, Coins, User, Crown, CheckCircle2,
} from "lucide-react";
import { startOfToday, startOfWeek, startOfMonth, isAfter } from "date-fns";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
];

const num = (j, k) => Number(j[k] || 0);
const sumBy = (list, k) => list.reduce((s, j) => s + num(j, k), 0);

function totalsOf(list) {
  return {
    count: list.length,
    revenue: sumBy(list, "amount"),
    cost: sumBy(list, "cost"),
    profit: sumBy(list, "profit"),
    technician: sumBy(list, "technician_share"),
    boss: sumBy(list, "boss_share"),
  };
}

export default function Reports({ jobs }) {
  const [period, setPeriod] = useState("today");
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "expenses"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const totalExpenses = useMemo(
    () => expenses.reduce((s, e) => s + Number(e.amount || 0), 0),
    [expenses]
  );

  const fromDate = useMemo(() => {
    if (period === "today") return startOfToday();
    if (period === "week") return startOfWeek(new Date(), { weekStartsOn: 1 });
    if (period === "month") return startOfMonth(new Date());
    return null;
  }, [period]);

  const { all, completed } = useMemo(() => {
    const filterByDate = (jobList, dateField) => {
      if (!fromDate) return jobList;
      return jobList.filter((j) => {
        const ts = j[dateField];
        if (!ts) return false;
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return isAfter(d, fromDate) || d.getTime() === fromDate.getTime();
      });
    };

    const inPeriodByReceived = filterByDate(jobs, "createdAt");
    const completedInPeriod = jobs.filter(
      (j) => j.status === "Completed"
    ).filter(j => {
      if (!fromDate) return true;
      const ts = j.completedAt;
      if (!ts) return false;
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return isAfter(d, fromDate) || d.getTime() === fromDate.getTime();
    });

    return {
      all: totalsOf(inPeriodByReceived),
      completed: totalsOf(completedInPeriod),
    };
  }, [jobs, fromDate]);

  const pending = all.count - jobs
    .filter((j) => j.status === "Completed").filter(j => {
      if (!fromDate) return true;
      const ts = j.createdAt;
      if (!ts) return false;
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return isAfter(d, fromDate) || d.getTime() === fromDate.getTime();
    }).length;

  return (
    <div data-testid="reports-screen">
      <div className="period-chips" data-testid="period-chips">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            data-testid={`period-${p.key}`}
            className={`chip ${period === p.key ? "active" : ""}`}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="report-header mono" data-testid="report-range">
        {fromDate ? `Scope: jobs from ${fromDate.toLocaleDateString()} onwards` : "Scope: all time"}
      </div>

      <Section title="Business Summary" icon={<Briefcase size={14} />} testid="section-business">
        <div className="report-grid">
          <ReportCard
            icon={<TrendingUp size={16} />} label="Revenue"
            value={formatINR(all.revenue)} testid="report-revenue"
          />
          <ReportCard
            icon={<Receipt size={16} />} label="Cost"
            value={formatINR(all.cost)} testid="report-cost"
          />
          <ReportCard
            icon={<Wallet size={16} />} label="Profit" accent="profit"
            value={formatINR(all.profit)} testid="report-profit"
          />
          <div className="report-card status-split" data-testid="report-status">
            <div>
              <div className="k">Jobs</div>
              <div className="v">{all.count}</div>
            </div>
            <div>
              <div className="k">Pending</div>
              <div className="v" style={{ color: "var(--warn)" }}>{pending}</div>
            </div>
          </div>
        </div>
      </Section>

      {totalExpenses > 0 && (
        <Section title="Additional Expenses" icon={<Receipt size={14} />} testid="section-expenses">
          <div className="big-kpi" style={{ background: "var(--surface-2, var(--surface))", borderRadius: 10, padding: "14px 16px" }}>
            <div className="k">Total Expenses (record only)</div>
            <div className="v" style={{ fontSize: 24, fontWeight: 700, color: "var(--muted)" }}>{formatINR(totalExpenses)}</div>
            <div className="sub mono" style={{ marginTop: 4 }}>Expenses tab mein manage karo</div>
          </div>
        </Section>
      )}

      <Section title="Boss Section" icon={<Crown size={14} />} testid="section-boss">
        <BigKPI
          color="boss"
          label="Total Boss Share"
          value={formatINR(all.boss)}
          sub={`from ${all.count} job${all.count === 1 ? "" : "s"} in period`}
          testid="report-boss-share"
        />
      </Section>

      <Section title="Technician Section" icon={<User size={14} />} testid="section-technician">
        <BigKPI
          color="tech"
          label="Total Technician Share"
          value={formatINR(all.technician)}
          sub={`from ${all.count} job${all.count === 1 ? "" : "s"} in period`}
          testid="report-tech-share"
        />
      </Section>

      <Section
        title="Completed Jobs Only"
        icon={<CheckCircle2 size={14} />}
        testid="section-completed"
        subtitle={`${completed.count} completed · based on completion date`}
      >
        <div className="report-grid">
          <ReportCard
            icon={<TrendingUp size={16} />} label="Revenue"
            value={formatINR(completed.revenue)} testid="completed-revenue"
          />
          <ReportCard
            icon={<Wallet size={16} />} label="Profit" accent="profit"
            value={formatINR(completed.profit)} testid="completed-profit"
          />
          <ReportCard
            icon={<Crown size={16} />} label="Boss Share" accent="boss"
            value={formatINR(completed.boss)} testid="completed-boss"
          />
          <ReportCard
            icon={<Coins size={16} />} label="Technician" accent="tech"
            value={formatINR(completed.technician)} testid="completed-tech"
          />
        </div>
      </Section>
    </div>
  );
}

function Section({ title, icon, subtitle, testid, children }) {
  return (
    <div className="report-section" data-testid={testid}>
      <div className="section-head">
        <div className="section-title">
          <span className="section-icon">{icon}</span>
          <h3>{title}</h3>
        </div>
        {subtitle && <span className="section-sub mono">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function ReportCard({ icon, label, value, accent, testid }) {
  return (
    <div className={`report-card ${accent || ""}`} data-testid={testid}>
      <div className="report-top">
        <span className="report-icon">{icon}</span>
        <span className="k">{label}</span>
      </div>
      <div className="v">{value}</div>
    </div>
  );
}

function BigKPI({ color, label, value, sub, testid }) {
  return (
    <div className={`big-kpi ${color}`} data-testid={testid}>
      <div className="k">{label}</div>
      <div className="v">{value}</div>
      <div className="sub mono">{sub}</div>
    </div>
  );
}
