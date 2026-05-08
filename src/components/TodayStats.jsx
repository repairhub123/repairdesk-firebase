import React, { useMemo } from "react";
import { formatINR } from "@/lib/api";
import { isToday } from "date-fns";

export default function TodayStats({ jobs, role }) {
  const stats = useMemo(() => {
    const isJobFromToday = (j, dateField) => {
      const ts = j[dateField];
      if (!ts) return false;
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return isToday(d);
    };

    const todays = jobs.filter((j) => isJobFromToday(j, "createdAt"));
    const completedToday = jobs.filter(
      (j) => j.status === "Completed" && isJobFromToday(j, "completedAt")
    );
    
    const sum = (list, k) => list.reduce((s, j) => s + Number(j[k] || 0), 0);
    const myKey = role === "Boss" ? "boss_share" : "technician_share";
    const otherKey = role === "Boss" ? "technician_share" : "boss_share";
    
    return {
      count: todays.length,
      completed: completedToday.length,
      myShare: sum(completedToday, myKey),
      otherShare: sum(completedToday, otherKey),
    };
  }, [jobs, role]);

  const otherName = role === "Boss" ? "Tech" : "Boss";

  return (
    <div className="today-strip" data-testid="today-strip">
      <div className="today-tile">
        <div className="k">Today</div>
        <div className="v" data-testid="today-count">{stats.count}</div>
        <div className="sub">{stats.completed} done</div>
      </div>
      <div className={`today-tile my ${role === "Boss" ? "boss" : "tech"}`}>
        <div className="k">My share (today)</div>
        <div className="v" data-testid="today-my-share">{formatINR(stats.myShare)}</div>
        <div className="sub">completed only</div>
      </div>
      <div className={`today-tile other ${role === "Boss" ? "tech" : "boss"}`}>
        <div className="k">{otherName}'s share</div>
        <div className="v" data-testid="today-other-share">{formatINR(stats.otherShare)}</div>
        <div className="sub">today's done</div>
      </div>
    </div>
  );
}
