import React from "react";
import clsx from "clsx";

/**
 * Stat card — flat #141414 surface, 1px border, no radius. Optional trend arrow.
 */
export const StatCard = ({ label, value, unit, trend, severity, testId, subtle }) => {
  return (
    <div
      data-testid={testId}
      className={clsx(
        "relative p-5 bg-[#141414] border border-[#262626] transition-all duration-200",
        "hover:bg-[#1F1F1F] hover:-translate-y-[2px] hover:shadow-[0_18px_45px_rgba(0,0,0,0.28)]",
        "rounded-xl"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#737373]">
          {label}
        </span>
        {trend != null && (
          <span className={clsx(
            "font-mono text-[10px] uppercase tracking-wider",
            trend >= 0 ? "text-[#30D158]" : "text-[#FF3B30]"
          )}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className={clsx(
            "font-mono tabular-nums text-3xl font-medium",
            severity === "critical" && "text-[#FF3B30]",
            severity === "warning" && "text-[#FF9F0A]",
            severity === "success" && "text-[#30D158]",
            !severity && "text-white"
          )}
        >
          {value}
        </span>
        {unit && <span className="font-mono text-xs text-[#737373]">{unit}</span>}
      </div>
      {subtle && <div className="font-mono text-[11px] text-[#737373] mt-2">{subtle}</div>}
    </div>
  );
};
