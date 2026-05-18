"use client";

import { IconChevronDown } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export function AdminSelect({
  className,
  disabled,
  label,
  onChange,
  options,
  placeholder = "No options",
  value,
}: {
  className?: string;
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find((option) => option === value) || value;
  const unavailable = disabled || options.length === 0;

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative grid gap-2 text-sm", className)}>
      <span className="font-medium text-slate-300">{label}</span>
      <button
        type="button"
        disabled={unavailable}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-12 w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 text-left text-white outline-none transition",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-blue-300/30 hover:bg-blue-500/10",
          "focus:border-blue-300/60 focus:bg-blue-500/10 focus:shadow-[0_0_28px_rgba(41,52,255,0.16)]",
          unavailable && "cursor-not-allowed text-slate-600 opacity-70 hover:border-white/10 hover:bg-white/[0.045]",
          open && "border-blue-300/60 bg-blue-500/10",
        )}
      >
        <span className={cn("truncate", !selectedLabel && "text-slate-600")}>
          {selectedLabel || placeholder}
        </span>
        <IconChevronDown
          className={cn("size-4 shrink-0 text-slate-500 transition", open && "rotate-180 text-blue-200")}
        />
      </button>

      {open && !unavailable ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-white/10 bg-[#090a10]/95 p-1.5 shadow-2xl shadow-black/50 backdrop-blur-xl">
          <div className="max-h-64 overflow-y-auto pr-1">
            {options.map((option) => {
              const active = option === value;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex min-h-10 w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition",
                    active
                      ? "bg-blue-500/18 text-white ring-1 ring-blue-300/20"
                      : "text-slate-400 hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  <span className="truncate">{option}</span>
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full transition",
                      active ? "bg-blue-200 shadow-[0_0_16px_rgba(138,165,255,0.9)]" : "bg-transparent",
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
