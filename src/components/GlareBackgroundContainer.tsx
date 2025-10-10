// GlareBackgroundContainer.tsx
import * as React from "react";

type Props = {
  children?: React.ReactNode; // optional; you can leave it empty
  className?: string;         // optional extra classes for your content wrapper
};

export default function GlareBackgroundContainer({ children, className }: Props) {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      <div className="absolute inset-0 bg-slate-950" />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-500/20 via-cyan-400/20 to-blue-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 bg-cyan-500/10 blur-3xl" />
      </div>
      <div className={`relative z-10 flex min-h-screen w-full items-center justify-center px-6 py-12 ${className ?? ""}`}>
        {children}
      </div>
    </div>
  )
}
