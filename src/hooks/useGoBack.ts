"use client";
import { useRouter } from "next/navigation";

// Several "back" controls were hardcoded to a fixed route during the redesign pass
// instead of returning to wherever the user actually came from. This restores real
// history-back while still landing somewhere sane on a cold/direct hit (no history to
// go back to) — same guard NavShell's own back button uses (`window.history.length > 1`).
export function useGoBack(fallbackHref: string) {
  const router = useRouter();
  return () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };
}
