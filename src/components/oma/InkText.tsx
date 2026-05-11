import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span";
  className?: string;
};

export function InkText({ children, as = "span", className }: Props) {
  const Tag = as;
  return <Tag className={`ink-text ${className ?? ""}`}>{children}</Tag>;
}
