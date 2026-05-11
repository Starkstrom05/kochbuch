import type { ReactNode } from "react";

export function Ribbon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`relative inline-block bg-ribbon px-3 py-1 font-hand text-xl text-paper-50 shadow-card ${
        className ?? ""
      }`}
      style={{
        clipPath: "polygon(0 0, 100% 0, 95% 50%, 100% 100%, 0 100%, 5% 50%)",
      }}
    >
      {children}
    </span>
  );
}
