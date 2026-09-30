"use client";

import { forwardRef, type ButtonHTMLAttributes, type PointerEvent } from "react";

const SpotlightButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ children, className = "", onPointerMove, ...props }, ref) => {
    function moveSpotlight(event: PointerEvent<HTMLButtonElement>) {
      const rect = event.currentTarget.getBoundingClientRect();
      event.currentTarget.style.setProperty("--spotlight-x", `${event.clientX - rect.left}px`);
      event.currentTarget.style.setProperty("--spotlight-y", `${event.clientY - rect.top}px`);
      onPointerMove?.(event);
    }

    return (
      <button
        ref={ref}
        type="button"
        onPointerMove={moveSpotlight}
        className={`spotlight-button group relative isolate overflow-hidden rounded-full border border-white/10 bg-[#172015] px-7 py-3.5 text-white shadow-[0_12px_35px_-14px_#172015] transition-transform duration-200 active:scale-[.97] ${className}`}
        {...props}
      >
        <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100" style={{background:"radial-gradient(120px circle at var(--spotlight-x,50%) var(--spotlight-y,50%),rgba(255,255,255,.24),transparent 70%)"}}/>
        <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
      </button>
    );
  },
);

SpotlightButton.displayName = "SpotlightButton";

export default SpotlightButton;
