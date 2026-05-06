"use client";

import { ArrowLeft, Ghost, Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

interface NotFound404Props {
  title?: string;
  description?: string;
  className?: string;
}

export default function NotFound404({
  title = "Page Not Found",
  description = "The page you are looking for does not exist. It may have been moved or deleted.",
  className,
}: Readonly<NotFound404Props>) {
  const handleHomeClick = () => {
    globalThis.location.href = "/";
  };

  const handleBackClick = () => {
    globalThis.history.back();
  };

  return (
    <div
      className={cn(
        "relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background px-6",
        className,
      )}
    >
      <Empty className="max-w-xl">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Ghost className="h-16 w-16 text-blue-100" />
          </EmptyMedia>
          <EmptyTitle className="bg-gradient-to-r from-white via-blue-100 to-blue-500 bg-clip-text text-4xl font-bold text-transparent">
            404
          </EmptyTitle>
          <EmptyTitle className="mt-4 text-2xl font-semibold text-white">
            {title}
          </EmptyTitle>
          <EmptyDescription className="mt-3 text-base text-slate-300">
            {description}
          </EmptyDescription>
        </EmptyHeader>

        <EmptyContent>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button onClick={handleHomeClick} className="group">
              <Home className="mr-1 h-4 w-4 transition-transform group-hover:scale-110" />
              Go Home
            </Button>

            <Button onClick={handleBackClick} variant="outline" className="group">
              <ArrowLeft className="mr-1 h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Go Back
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    </div>
  );
}

export const Component = NotFound404;
