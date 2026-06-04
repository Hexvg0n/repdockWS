"use client";

import { IconHeart, IconX } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

export function LoginRequiredDialog({
  actionLabel,
  closeLabel,
  description,
  onClose,
  open,
  title,
}: {
  actionLabel: string;
  closeLabel: string;
  description: string;
  onClose: () => void;
  open: boolean;
  title: string;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[260] grid place-items-center bg-black/75 p-4 text-white backdrop-blur-xl">
      <button type="button" aria-label={closeLabel} className="absolute inset-0" onClick={onClose} />
      <article className="relative w-full max-w-md overflow-hidden rounded-[30px] border border-white/10 bg-[#0b0c12] p-5 shadow-2xl shadow-black">
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="absolute right-4 top-4 grid size-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
        >
          <IconX className="size-5" />
        </button>

        <div className="grid size-14 place-items-center rounded-3xl bg-red-500/15 text-red-200 ring-1 ring-red-300/20">
          <IconHeart className="size-7" />
        </div>
        <h2 className="mt-5 font-poppins text-2xl font-medium text-white">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{description}</p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href="/api/auth/discord/login"
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#5865F2] px-4 text-sm font-bold text-white transition hover:bg-[#4752C4]"
          >
            <DiscordLogo className="size-4" />
            {actionLabel}
          </a>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "inline-flex h-12 flex-1 items-center justify-center rounded-2xl border border-white/10",
              "bg-white/[0.04] px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]",
            )}
          >
            {closeLabel}
          </button>
        </div>
      </article>
    </div>
  );
}

function DiscordLogo(props: Readonly<React.ComponentProps<"svg">>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M20.317 4.369A19.79 19.79 0 0 0 15.466 3c-.21.375-.456.88-.624 1.28a18.27 18.27 0 0 0-5.487 0A12.64 12.64 0 0 0 8.73 3a19.74 19.74 0 0 0-4.853 1.37C.787 8.963-.048 13.442.37 17.858A19.9 19.9 0 0 0 6.314 20.9c.48-.65.908-1.34 1.275-2.061a12.98 12.98 0 0 1-2.008-.963c.168-.122.332-.25.49-.38a14.24 14.24 0 0 0 11.858 0c.16.13.323.258.49.38-.642.38-1.315.704-2.012.965.367.72.794 1.41 1.274 2.059a19.86 19.86 0 0 0 5.948-3.042c.49-5.12-.838-9.558-3.312-13.489ZM8.02 15.162c-1.16 0-2.11-1.064-2.11-2.372 0-1.306.93-2.37 2.11-2.37 1.19 0 2.13 1.074 2.11 2.37 0 1.308-.93 2.372-2.11 2.372Zm7.96 0c-1.16 0-2.11-1.064-2.11-2.372 0-1.306.93-2.37 2.11-2.37 1.19 0 2.13 1.074 2.11 2.37 0 1.308-.92 2.372-2.11 2.372Z" />
    </svg>
  );
}
