import React from "react";
import clsx from "clsx";

export const SeverityBadge = ({ severity, size = "sm" }) => {
  const cls = severity ? `sev-${severity}` : "sev-low";
  return (
    <span
      data-testid={`severity-badge-${severity}`}
      className={clsx(
        "inline-flex items-center font-mono uppercase tracking-wider",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
        cls
      )}
      style={{ letterSpacing: "0.08em" }}
    >
      {severity || "—"}
    </span>
  );
};

export const StatusBadge = ({ status }) => {
  const cls = `status-${status}`;
  const label = status === "in_progress" ? "In Progress" : status;
  return (
    <span
      data-testid={`status-badge-${status}`}
      className={clsx("inline-flex items-center font-mono uppercase tracking-wider text-[10px] px-2 py-0.5", cls)}
    >
      {label}
    </span>
  );
};

export const PriorityTag = ({ priority }) => (
  <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 border border-[#404040] text-[#E5E5E5]">
    {priority}
  </span>
);
