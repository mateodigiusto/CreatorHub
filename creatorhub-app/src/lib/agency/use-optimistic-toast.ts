"use client";

/**
 * Optimistic-mutation toast helpers. Wraps `showToast` from `lib/store.tsx`
 * so the dozen-or-so "PATCH/POST and rollback on failure" call sites in
 * agency pipeline / dialog / metrics share one consistent error UX:
 *
 *   const reportError = useOptimisticErrorReporter();
 *   try {
 *     const res = await fetch(...);
 *     if (!res.ok) {
 *       setItems(prev);
 *       await reportError(res);
 *       return;
 *     }
 *   } catch (e) {
 *     setItems(prev);
 *     await reportError(e);
 *   }
 *
 * Distinguishes:
 *   - PlanLimitError (402) → "Upgrade to keep working" (longer)
 *   - 403 → "Permission denied"
 *   - 404 → "That item is gone — refresh."
 *   - 409 → "Conflict — refresh and retry."
 *   - 5xx / network → "Couldn't save. Try again."
 */

import { useCallback } from "react";
import { useAppState } from "@/lib/store";

export type OptimisticError = Response | Error | unknown;

export function useOptimisticRevertToast() {
  const { showToast } = useAppState();
  return useCallback(
    (message: string) => {
      showToast(message);
    },
    [showToast],
  );
}

export function useOptimisticErrorReporter() {
  const { showToast } = useAppState();

  return useCallback(
    async (err: OptimisticError) => {
      const message = await messageForError(err);
      showToast(message);
    },
    [showToast],
  );
}

async function messageForError(err: OptimisticError): Promise<string> {
  if (err instanceof Response) {
    if (err.status === 402) {
      const body = await safeJson(err);
      if (
        body &&
        typeof body === "object" &&
        "error" in body &&
        (body as { error?: string }).error === "plan_limit"
      ) {
        return "You've hit a plan limit — upgrade to keep going.";
      }
      return "Plan limit reached.";
    }
    if (err.status === 403) return "You don't have permission for that.";
    if (err.status === 404) return "That item is gone — refresh the page.";
    if (err.status === 409) return "Conflict — refresh and try again.";
    if (err.status >= 500) return "Server hiccup. Try again in a moment.";
    return "Couldn't save. Try again.";
  }
  if (err instanceof Error) {
    return err.message.length > 0 && err.message.length < 100
      ? `Couldn't save: ${err.message}`
      : "Couldn't save. Try again.";
  }
  return "Couldn't save. Try again.";
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.clone().json();
  } catch {
    return null;
  }
}
