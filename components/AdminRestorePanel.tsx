"use client";

import {
  IconBrandTiktok,
  IconDatabase,
  IconHanger,
  IconHome,
  IconRobot,
  IconShieldCheck,
} from "@tabler/icons-react";

import RestoreConfig from "@/components/admin-bot/RestoreConfig";
import { AdminLogo, Sidebar, SidebarBody, SidebarLink, useSidebar } from "@/components/ui/sidebar";

export function AdminRestorePanel() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(70%_45%_at_50%_0%,rgba(41,52,255,0.34),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(230,236,255,0.024)_1px,transparent_1px),linear-gradient(90deg,rgba(230,236,255,0.024)_1px,transparent_1px)] bg-[size:120px_120px] opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />

      <Sidebar>
        <div className="relative flex min-h-screen w-full flex-col md:flex-row">
          <AdminRestoreSidebar />

          <section className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <RestoreConfig />
          </section>
        </div>
      </Sidebar>
    </main>
  );
}

function AdminRestoreSidebar() {
  const { open, setOpen } = useSidebar();

  return (
    <SidebarBody className="justify-between gap-10">
      <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
        <AdminLogo compact={!open} />
        <div className="mt-8 flex flex-col gap-2">
          <SidebarLink
            link={{
              href: "/admin",
              icon: (
                <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-white/[0.04] text-neutral-400 ring-1 ring-white/10">
                  <IconDatabase className="size-5" />
                </span>
              ),
              label: "Products",
            }}
            onClick={() => setOpen(false)}
          />
          <SidebarLink
            link={{
              href: "/admin/outfits",
              icon: (
                <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-white/[0.04] text-neutral-400 ring-1 ring-white/10">
                  <IconHanger className="size-5" />
                </span>
              ),
              label: "Outfits",
            }}
            onClick={() => setOpen(false)}
          />
          <SidebarLink
            link={{
              href: "/admin/tiktok-items",
              icon: (
                <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-white/[0.04] text-neutral-400 ring-1 ring-white/10">
                  <IconBrandTiktok className="size-5" />
                </span>
              ),
              label: "TikTok Items",
            }}
            onClick={() => setOpen(false)}
          />
          <SidebarLink
            link={{
              href: "/admin/bot",
              icon: (
                <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-white/[0.04] text-neutral-400 ring-1 ring-white/10">
                  <IconRobot className="size-5" />
                </span>
              ),
              label: "Bot",
            }}
            onClick={() => setOpen(false)}
          />
          <SidebarLink
            link={{
              href: "/admin/restore",
              icon: (
                <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-blue-500/20 text-blue-100 ring-1 ring-blue-300/30">
                  <IconShieldCheck className="size-5" />
                </span>
              ),
              label: "Restore",
            }}
            className="bg-blue-500/15"
            onClick={() => setOpen(false)}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <SidebarLink
          link={{
            href: "/",
            icon: (
              <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-white/[0.04] text-neutral-400 ring-1 ring-white/10">
                <IconHome className="size-5" />
              </span>
            ),
            label: "Back to site",
          }}
        />
      </div>
    </SidebarBody>
  );
}
