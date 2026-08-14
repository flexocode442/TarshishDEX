import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MAX_TOASTS, ToastViewport, toast, useToastStore } from "@/components/ui/toast";

/** Reset the store and the module-level id counter between tests. */
beforeEach(() => {
  vi.useFakeTimers();
  useToastStore.setState({ toasts: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useToastStore.push", () => {
  it("appends toasts with distinct incrementing ids and tones", () => {
    useToastStore.getState().push("hello", "success");
    useToastStore.getState().push("world", "error");

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(2);
    expect(toasts[0]!.message).toBe("hello");
    expect(toasts[0]!.tone).toBe("success");
    expect(toasts[1]!.message).toBe("world");
    expect(toasts[1]!.tone).toBe("error");
    // Ids come from a module-level counter, so they only need to be distinct
    // and ordered — not absolute (earlier suites may have consumed some).
    expect(toasts[1]!.id).toBeGreaterThan(toasts[0]!.id);
  });

  it("defaults the tone to info", () => {
    useToastStore.getState().push("plain");
    expect(useToastStore.getState().toasts[0]!.tone).toBe("info");
  });

  it("auto-dismisses a toast after 5 seconds", () => {
    useToastStore.getState().push("temp");

    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(useToastStore.getState().toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});

describe("useToastStore.push cap", () => {
  it("caps concurrent toasts at MAX_TOASTS, evicting the oldest", () => {
    for (let i = 0; i < MAX_TOASTS + 3; i++) {
      useToastStore.getState().push(`toast-${i}`);
    }

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(MAX_TOASTS);
    // The oldest 3 were evicted; the newest MAX_TOASTS remain.
    expect(toasts.map((t) => t.message)).toEqual(
      Array.from({ length: MAX_TOASTS }, (_, i) => `toast-${i + 3}`)
    );
  });
});

describe("useToastStore.dismiss", () => {
  it("removes only the requested toast", () => {
    useToastStore.getState().push("a", "info");
    useToastStore.getState().push("b", "info");
    useToastStore.getState().push("c", "info");

    // Capture the real ids — the module-level counter is not reset between
    // suites, so hardcoding an id would silently target the wrong toast.
    const toasts = useToastStore.getState().toasts;
    const a = toasts[0]!;
    const b = toasts[1]!;
    const c = toasts[2]!;
    useToastStore.getState().dismiss(b.id);

    const messages = useToastStore.getState().toasts.map((t) => t.message);
    expect(messages).toEqual(["a", "c"]);
    expect(a.id).toBeLessThan(c.id);
  });
});

describe("toast helpers", () => {
  it("expose success/error/info shorthands wired to the store", () => {
    toast.success("ok");
    toast.error("nope");
    toast.info("hmm");

    const toasts = useToastStore.getState().toasts;
    expect(toasts.map((t) => [t.tone, t.message])).toEqual([
      ["success", "ok"],
      ["error", "nope"],
      ["info", "hmm"],
    ]);
  });
});

describe("ToastViewport", () => {
  it("renders active toasts and dismisses on click", () => {
    useToastStore.getState().push("visible toast", "success");
    render(<ToastViewport />);

    expect(screen.getByText("visible toast")).toBeInTheDocument();

    act(() => {
      screen.getByText("visible toast").click();
    });
    expect(screen.queryByText("visible toast")).not.toBeInTheDocument();
  });

  it("dismisses the newest toast on Escape", () => {
    useToastStore.getState().push("first", "info");
    useToastStore.getState().push("second", "info");
    render(<ToastViewport />);

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    const messages = useToastStore.getState().toasts.map((t) => t.message);
    expect(messages).toEqual(["first"]);
  });
});
