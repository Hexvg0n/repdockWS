"use client";

import SmartImage from "@/components/SmartImage";
import { cn } from "@/lib/utils";
import { IconMenu2, IconX } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import React, { createContext, useContext, useState } from "react";

interface LinkItem {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  animate: boolean;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }

  return context;
};

export const SidebarProvider = ({
  animate = true,
  children,
  open: openProp,
  setOpen: setOpenProp,
}: {
  animate?: boolean;
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp ?? openState;
  const setOpen = setOpenProp ?? setOpenState;

  return (
    <SidebarContext.Provider value={{ animate, open, setOpen }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  animate,
  children,
  open,
  setOpen,
}: {
  animate?: boolean;
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  return (
    <SidebarProvider animate={animate} open={open} setOpen={setOpen}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({
  children,
  className,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { animate, open, setOpen } = useSidebar();
  const sidebarWidth = animate ? (open ? 280 : 76) : 280;

  return (
    <motion.div
      animate={{
        width: sidebarWidth,
      }}
      className="hidden shrink-0 md:block"
    >
      <motion.div
        animate={{
          width: sidebarWidth,
        }}
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden h-screen shrink-0 flex-col border-r border-white/10 bg-[#090a10]/95 px-3 py-4 md:flex",
          className,
        )}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        {...props}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

export const MobileSidebar = ({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();

  return (
    <div
      className="flex h-14 w-full flex-row items-center justify-between border-b border-white/10 bg-[#090a10]/95 px-4 py-4 md:hidden"
      {...props}
    >
      <AdminLogo compact={false} />
      <button
        type="button"
        className="grid size-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-neutral-200"
        onClick={() => setOpen(!open)}
        aria-label="Open admin navigation"
      >
        <IconMenu2 className="size-5" />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            animate={{ x: 0, opacity: 1 }}
            className={cn(
              "fixed inset-0 z-[100] flex h-full w-full flex-col justify-between bg-neutral-950 p-8",
              className,
            )}
            exit={{ x: "-100%", opacity: 0 }}
            initial={{ x: "-100%", opacity: 0 }}
            transition={{
              duration: 0.3,
              ease: "easeInOut",
            }}
          >
            <button
              type="button"
              className="absolute right-8 top-8 z-50 grid size-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-neutral-200"
              onClick={() => setOpen(!open)}
              aria-label="Close admin navigation"
            >
              <IconX className="size-5" />
            </button>
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export const SidebarLink = ({
  className,
  link,
  ...props
}: React.ComponentProps<"a"> & {
  className?: string;
  link: LinkItem;
}) => {
  const { animate, open } = useSidebar();
  const collapsed = animate && !open;

  return (
    <a
      href={link.href}
      className={cn(
        "group/sidebar flex items-center overflow-hidden rounded-2xl py-2.5 transition hover:bg-white/[0.06]",
        collapsed ? "translate-x-1 justify-center gap-0 px-2" : "justify-start gap-3 px-3",
        className,
      )}
      {...props}
    >
      {link.icon}

      <motion.span
        animate={{
          maxWidth: animate ? (open ? 180 : 0) : 180,
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        initial={false}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className="!m-0 inline-block overflow-hidden whitespace-pre !p-0 text-sm font-medium text-neutral-300 transition-colors duration-150 group-hover/sidebar:text-white"
      >
        {link.label}
      </motion.span>
    </a>
  );
};

export const AdminLogo = ({ compact }: { compact: boolean }) => {
  return (
    <a
      href="/"
      className={cn(
        "relative z-20 flex h-10 min-w-0 items-center overflow-hidden rounded-2xl text-sm font-normal text-white",
        compact ? "ml-1 size-10 flex-none justify-center p-0" : "w-full justify-start gap-3 px-1",
      )}
    >
      {/* <div className="h-6 w-7 shrink-0 rounded-tl-xl rounded-tr-sm rounded-br-xl rounded-bl-sm bg-white shadow-[0_0_24px_rgba(41,52,255,0.32)]" /> */}
      <span className="grid size-8 flex-none place-items-center">
        <SmartImage
          src="/RepDock-25.png"
          alt="logo"
          width={28}
          height={28}
          sizes="28px"
          className="size-7 object-contain"
          style={{ height: 28, width: 28 }}
        />
      </span>
      <motion.span
        animate={{ maxWidth: compact ? 0 : 180, opacity: compact ? 0 : 1 }}
        initial={false}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className="min-w-0 flex-none overflow-hidden whitespace-nowrap font-semibold text-white"
      >
        RepDock Admin
      </motion.span>
    </a>
  );
};
