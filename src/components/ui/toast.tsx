"use client";

import { create } from "zustand";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastStore {
  toasts: Toast[];
  push: (message: string, tone?: ToastTone) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

/** Maximum number of toasts rendered at once; older toasts are evicted. */
export const MAX_TOASTS = 5;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (message, tone = "info") => {
    const id = nextId++;
    set((state) => {
      const toasts = [...state.toasts, { id, message, tone }];
      // Cap concurrent toasts: evict the oldest once we exceed the limit.
      return {
        toasts: toasts.length > MAX_TOASTS ? toasts.slice(toasts.length - MAX_TOASTS) : toasts,
      };
    });
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 5000);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/** Programmatic toast helpers for any client component. */
export const toast = {
  success: (message: string) => useToastStore.getState().push(message, "success"),
  error: (message: string) => useToastStore.getState().push(message, "error"),
  info: (message: string) => useToastStore.getState().push(message, "info"),
};

const TONE_STYLES: Record<ToastTone, string> = {
  success: "border-success/40 bg-success-soft text-success",
  error: "border-danger/40 bg-danger-soft text-danger",
  info: "border-primary/40 bg-primary-soft text-primary",
};

/** Fixed viewport that renders active toasts. Mount once in the root layout. */
export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && toasts.length > 0) {
        const last = toasts[toasts.length - 1];
        if (last) dismiss(last.id);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [toasts, dismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 sm:right-4 sm:left-auto sm:translate-x-0 sm:px-0"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={cn(
            "animate-fade-in-up pointer-events-auto rounded-xl border px-4 py-3 text-left text-sm font-medium shadow-xl backdrop-blur",
            TONE_STYLES[t.tone]
          )}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
