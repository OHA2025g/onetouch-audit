import React from "react";
import clsx from "clsx";

/**
 * Premium table shell:
 * - sticky header
 * - consistent borders/hover
 * - optional max height scroll
 */
export function DataTable({
  children,
  className,
  tableClassName,
  maxHeightClassName = "max-h-[70vh]",
  stickyHeader = true,
  testId,
}) {
  return (
    <div
      data-testid={testId}
      className={clsx("overflow-x-auto rounded-xl border border-[#262626]/70 bg-[#0A0A0A]/25", className)}
    >
      <div className={clsx(maxHeightClassName, "overflow-y-auto")}>
        <table className={clsx("w-full text-sm", tableClassName)}>
          {React.Children.map(children, (child) => {
            if (!child) return child;
            if (child.type === DataTableHead) {
              return React.cloneElement(child, {
                sticky: stickyHeader,
              });
            }
            return child;
          })}
        </table>
      </div>
    </div>
  );
}

export function DataTableHead({ children, sticky }) {
  return (
    <thead
      className={clsx(
        "border-b border-[#262626]/70",
        sticky && "sticky top-0 z-10 bg-[#141414]/85 backdrop-blur"
      )}
    >
      {children}
    </thead>
  );
}

export function DataTableBody({ children }) {
  return <tbody>{children}</tbody>;
}

export function DataTableRow({ children, className, onClick, testId }) {
  return (
    <tr
      data-testid={testId}
      onClick={onClick}
      className={clsx(
        "border-b border-[#262626]/50 transition-colors",
        onClick ? "cursor-pointer hover:bg-[#0A0A0A]/40" : "hover:bg-[#0A0A0A]/25",
        className
      )}
    >
      {children}
    </tr>
  );
}

export function DataTableTh({ children, className, align = "left", colSpan, rowSpan }) {
  return (
    <th
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={clsx(
        "p-3 font-mono text-[10px] uppercase tracking-wider text-[#737373]",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      )}
    >
      {children}
    </th>
  );
}

export function DataTableTd({ children, className, align = "left", colSpan, rowSpan }) {
  return (
    <td
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={clsx(
        "p-3",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      )}
    >
      {children}
    </td>
  );
}
