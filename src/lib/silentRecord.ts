// Silent points-recording flow used by Swap/Pool/Deploy/Forge after a successful tx.
// Shows toasts but never blocks main success modal; auto-registers ?ref= once.
import { toast } from "sonner";
import { recordAction, autoRegisterReferralIfNeeded, POINTS_PER_ACTION } from "@/lib/points";

export type RecordKind = "swap" | "lp" | "deploy";

/**
 * Fire the on-chain points record (user signs once). Always resolves silently.
 * Returns the awarded points (0 if it failed or user rejected) for UI hints.
 */
export async function silentRecordPoints(
  kind: RecordKind,
  address: string | undefined | null,
  onAfterRecord?: () => void,
): Promise<number> {
  if (!address) return 0;
  // Auto-link referrer (one time, idempotent) before recording.
  void autoRegisterReferralIfNeeded(address);

  const pts = POINTS_PER_ACTION[kind];
  const recId = `record-${kind}-${Date.now()}`;
  toast.message(`Recording +${pts} point${pts === 1 ? "" : "s"}…`, { id: recId });
  try {
    await recordAction(kind);
    toast.success(`⚡ +${pts} point${pts === 1 ? "" : "s"} earned!`, { id: recId });
    onAfterRecord?.();
    return pts;
  } catch {
    // User rejected or contract reverted (e.g. cap reached). Stay silent.
    toast.dismiss(recId);
    return 0;
  }
}
