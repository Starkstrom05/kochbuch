import type { ReactNode } from "react";
import { hashSeed } from "@/lib/visual/hash";
import { InkBlots } from "./InkBlot";

type Variant = "light" | "aged" | "lined";

const VARIANT_BG: Record<Variant, string> = {
  light: "bg-paper-texture",
  aged: "bg-paper-aged",
  lined: "bg-paper-lined",
};

type Props = {
  children: ReactNode;
  variant?: Variant;
  seed?: string;
  className?: string;
  withInkblots?: boolean;
  blotCount?: number;
};

export function PaperSheet({
  children,
  variant = "light",
  seed,
  className,
  withInkblots = true,
  blotCount = 3,
}: Props) {
  const h = seed ? hashSeed(seed) : 0;
  const rotation = ((h % 7) - 3) * 0.18;

  return (
    <div
      className={`relative ${VARIANT_BG[variant]} bg-repeat shadow-page ring-1 ring-paper-300/50 ${
        className ?? ""
      }`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      {withInkblots && seed ? <InkBlots seed={seed} count={blotCount} /> : null}
      <div className="relative">{children}</div>
    </div>
  );
}
