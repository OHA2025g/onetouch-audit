import React from "react";
import clsx from "clsx";

export function PageShell({ children, className, maxWidth = "max-w-[1700px]" }) {
  return (
    <div className={clsx("p-6 lg:p-8", maxWidth, className)} data-testid="page-shell">
      {children}
    </div>
  );
}

export function PageHeader({ kicker, title, subtitle, right, icon, className }) {
  return (
    <div className={clsx("mb-6", className)} data-testid="page-header">
      {kicker && (
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#737373]">{kicker}</div>
      )}
      <div className="mt-2 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-3xl lg:text-4xl text-white tracking-tight flex items-center gap-2 min-w-0">
            {icon ? <span className="wow-badge w-10 h-10 inline-flex items-center justify-center">{icon}</span> : null}
            <span className="truncate">{title}</span>
          </h1>
          {subtitle ? <div className="text-sm text-[#A3A3A3] mt-2 max-w-3xl">{subtitle}</div> : null}
        </div>
        {right ? <div className="flex items-center gap-2 flex-wrap">{right}</div> : null}
      </div>
    </div>
  );
}

export function SectionCard({ title, kicker, right, children, className, bodyClassName }) {
  return (
    <section className={clsx("wow-ring wow-card", className)} data-testid="section-card">
      {(title || kicker || right) && (
        <div className="px-5 py-4 border-b border-[#262626]/70 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {kicker ? (
              <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#737373]">{kicker}</div>
            ) : null}
            {title ? <h3 className="font-heading text-base text-white tracking-tight mt-1">{title}</h3> : null}
          </div>
          {right ? <div className="flex items-center gap-2 flex-wrap">{right}</div> : null}
        </div>
      )}
      <div className={clsx("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

