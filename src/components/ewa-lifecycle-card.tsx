"use client";

import { ewaStatusMeta } from "@/lib/employee-services";
import type { EwaApp } from "@/lib/types";
import { fmt } from "@/lib/format";

export function EwaLifecycleCard({
  app,
  refreshing,
  onRefresh,
}: {
  app: NonNullable<EwaApp>;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const lifecycle = ewaStatusMeta(app.status);
  const tone =
    app.status === "REPAID"
      ? "ok"
      : app.status === "REJECTED" || app.status === "CANCELLED"
        ? "warn"
        : "info";

  return (
    <div className="app-card ewa-life-card" aria-live="polite">
      <div className="h">
        <b>{app.ref}</b>
        <span className={"pill " + tone}>{lifecycle.label}</span>
      </div>
      <div className="amt">
        {fmt(app.amount)} <small>fee {fmt(app.fee)}</small>
      </div>
      <div className="ewa-life" aria-label={`Tahap ${lifecycle.step} dari 5: ${lifecycle.label}`}>
        {[1, 2, 3, 4, 5].map((step) => (
          <span key={step} className={step <= lifecycle.step ? "done" : ""} aria-hidden="true" />
        ))}
      </div>
      <div className="ewa-life-note">{lifecycle.note}</div>
      <button
        type="button"
        className="btn ghost"
        style={{ width: "100%", marginTop: 10 }}
        onClick={onRefresh}
        disabled={refreshing}
        aria-busy={refreshing}
      >
        {refreshing ? "Memperbarui…" : "Perbarui status"}
      </button>
    </div>
  );
}
