"use client";

/**
 * @author: @dorianbaffier
 * @description: Smooth Drawer
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { Fingerprint } from "lucide-react";
import { motion } from "motion/react";
import type { Variants } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface PriceTagProps {
  price: number;
  discountedPrice: number;
}

function PriceTag({ price, discountedPrice }: PriceTagProps) {
  return (
    <div className="mx-auto flex max-w-fit items-center justify-around gap-4">
      <div className="flex items-baseline gap-2">
        <span className="bg-gradient-to-br from-zinc-900 to-zinc-700 bg-clip-text font-bold text-4xl text-transparent dark:from-white dark:to-zinc-300">
          ${discountedPrice}
        </span>
        <span className="text-lg text-zinc-400 line-through dark:text-zinc-500">
          ${price}
        </span>
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
          Lifetime access
        </span>
        <span className="text-xs text-zinc-700 dark:text-zinc-300">
          One-time payment
        </span>
      </div>
    </div>
  );
}

interface DrawerDemoProps extends React.HTMLAttributes<HTMLDivElement> {
  trigger?: React.ReactNode;
  title?: string;
  description?: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  showPrimaryAction?: boolean;
  showPrice?: boolean;
  price?: number;
  discountedPrice?: number;
}

const drawerVariants: Variants = {
  hidden: {
    y: "100%",
    opacity: 0,
    rotateX: 5,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
  visible: {
    y: 0,
    opacity: 1,
    rotateX: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      mass: 0.8,
      staggerChildren: 0.07,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: {
    y: 20,
    opacity: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      mass: 0.8,
    },
  },
};

export default function SmoothDrawer({
  children,
  trigger,
  title = "KokonutUI - Pro",
  description = "100+ collection of UI Components and templates built for React, Next.js, and Tailwind CSS. Spend no time on design and focus on shipping.",
  primaryButtonText = "Buy Now",
  secondaryButtonText = "Maybe Later",
  onSecondaryAction,
  showPrimaryAction = true,
  showPrice = true,
  price = 169,
  discountedPrice = 99,
}: DrawerDemoProps) {
  const handleSecondaryClick = () => {
    onSecondaryAction?.();
  };

  return (
    <Drawer>
      <DrawerTrigger asChild>
        {trigger ?? <Button variant="outline">Open Drawer</Button>}
      </DrawerTrigger>
      <DrawerContent className="mx-auto max-w-fit overflow-hidden rounded-[28px] border border-white/10 bg-[#050713] p-0 text-white shadow-[0_28px_90px_rgba(0,0,0,0.65)]">
        <motion.div
          animate="visible"
          className="mx-auto w-full max-w-[390px] space-y-6 p-6"
          initial="hidden"
          variants={drawerVariants}
        >
          <motion.div variants={itemVariants}>
            <DrawerHeader className="space-y-2.5 px-0">
              <DrawerTitle className="flex items-center gap-2.5 font-semibold text-2xl tracking-tighter">
                <motion.div variants={itemVariants}>
                  <div className="rounded-2xl bg-gradient-to-br from-blue-500/30 to-indigo-500/10 p-1.5 shadow-inner ring-1 ring-white/10 rounded-2">
                    <Image alt="Logo" height={32} src="/RepDock-25.png" width={32} />
                  </div>
                </motion.div>
                <motion.span variants={itemVariants}>
                  {title}
                </motion.span>
              </DrawerTitle>
              <motion.div variants={itemVariants}>
                <DrawerDescription className="max-w-[310px] text-sm text-zinc-400 leading-relaxed tracking-tighter">
                  {description}
                </DrawerDescription>
              </motion.div>
            </DrawerHeader>
          </motion.div>

          {children ? (
            <motion.div variants={itemVariants}>{children}</motion.div>
          ) : showPrice ? (
            <motion.div variants={itemVariants}>
              <PriceTag discountedPrice={discountedPrice} price={price} />
            </motion.div>
          ) : null}

          <motion.div variants={itemVariants}>
            <DrawerFooter className="flex flex-col gap-3 px-0">
              {showPrimaryAction ? (
                <div className="w-full">
                  <Link
                    className="group relative inline-flex h-11 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 font-semibold text-sm text-white tracking-wide shadow-lg shadow-rose-500/20 transition-all duration-500 hover:from-rose-600 hover:to-pink-600 hover:shadow-rose-500/30 hover:shadow-xl dark:from-rose-600 dark:to-pink-600 dark:hover:from-rose-500 dark:hover:to-pink-500"
                    href="https://kokonutui.pro/#pricing"
                    target="_blank"
                  >
                    <motion.span
                      className="absolute inset-0 translate-x-[-200%] bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      transition={{
                        duration: 1.5,
                        ease: "easeInOut",
                        repeat: 0,
                      }}
                      whileHover={{
                        x: ["-200%", "200%"],
                      }}
                    />
                    <motion.div
                      animate={{ opacity: 1 }}
                      className="relative flex items-center gap-2 tracking-tighter"
                      initial={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {primaryButtonText}
                      <motion.div
                        animate={{
                          rotate: [0, 15, -15, 0],
                          y: [0, -2, 2, 0],
                        }}
                        transition={{
                          duration: 2,
                          ease: "easeInOut",
                          repeat: Number.POSITIVE_INFINITY,
                          repeatDelay: 1,
                        }}
                      >
                        <Fingerprint className="h-4 w-4" />
                      </motion.div>
                    </motion.div>
                  </Link>
                </div>
              ) : null}
              <DrawerClose asChild>
                <Button
                  className="h-11 w-full rounded-xl border-white/10 bg-white/[0.04] font-semibold text-sm text-white tracking-tighter transition-colors hover:bg-white/[0.08]"
                  onClick={handleSecondaryClick}
                  variant="outline"
                >
                  {secondaryButtonText}
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </motion.div>
        </motion.div>
      </DrawerContent>
    </Drawer>
  );
}
