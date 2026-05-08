import React, { useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { formatINR } from "@/lib/api";
import { Phone } from "lucide-react";
import { format } from "date-fns";

export default function CustomerHistory({ open, onOpenChange, phone, jobs }) {
  const list = useMemo(() => {
    if (!phone) return [];
    return jobs
      .filter((j) => j.phone === phone)
      .sort((a, b) => {
        const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const db = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return db.getTime() - da.getTime();
      });
  }, [jobs, phone]);

  const totals = useMemo(() => {
    const completed = list.filter((j) => j.status === "Completed");
    return {
      visits: list.length,
      paid: completed.reduce((s, j) => s + Number(j.amount || 0), 0),
    };
  }, [list]);

  const customerName = list[0]?.name || "Customer";

  const formatDate = (ts) => {
    if (!ts) return "N/A";
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return format(d, "dd MMM yyyy HH:mm");
    } catch {
      return "N/A";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="dialog-content max-w-lg max-h-[85vh] overflow-y-auto"
        data-testid="customer-history-dialog"
      >
        <DialogHeader>
          <DialogTitle style={{ color: "var(--text)" }}>
            {customerName}
          </DialogTitle>
          <DialogDescription style={{ color: "var(--muted)" }}>
            <Phone size={11} style={{ display: "inline", marginRight: 4 }} />
            {phone} · {totals.visits} visit{totals.visits === 1 ? "" : "s"} · paid {formatINR(totals.paid)}
          </DialogDescription>
        </DialogHeader>

        {list.length === 0 ? (
          <div className="empty">No previous visits.</div>
        ) : (
          <div className="history-list" data-testid="history-list">
            {list.map((j) => (
              <div className="history-row" key={j.id} data-testid={`history-${j.id}`}>
                <div className="history-top">
                  <div className="history-model">{j.model || "—"}</div>
                  <span
                    className={`badge ${j.status === "Completed" ? "completed" : "pending"}`}
                  >
                    {j.status}
                  </span>
                </div>
                <div className="history-work">{j.work || "—"}</div>
                <div className="history-meta mono">
                  <span>{formatDate(j.createdAt)}</span>
                  <span className="history-amount">{formatINR(j.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
