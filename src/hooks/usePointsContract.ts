// Cheat-proof points hook: contract is the source of truth.
// Polls PointsSystemV2.getPoints every 10s, exposes refresh() for post-tx invalidation.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  readPoints,
  readPendingReferral,
  readReferrals,
  POINTS_SYSTEM_ADDRESS,
} from "@/lib/points";

export const DAILY_POINTS_CAP = 100;
export const POINTS_OWNER_ADDRESS = "0x3BC6348E1E569E97Bd8247b093475A4aC22B9fD4";

export type PointsState = {
  total: bigint;
  daily: bigint;
  pending: bigint;
  referrals: string[];
  loading: boolean;
  capReached: boolean;
  refresh: () => Promise<void>;
};

/** Cache key per wallet (optimistic UI only — never trusted as source of truth). */
function cacheKey(addr: string) {
  return `litdex_points_cache_${addr.toLowerCase()}`;
}

function readCache(addr?: string | null): { total: bigint; daily: bigint } | null {
  if (!addr || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(addr));
    if (!raw) return null;
    const j = JSON.parse(raw) as { total: string; daily: string };
    return { total: BigInt(j.total), daily: BigInt(j.daily) };
  } catch { return null; }
}
function writeCache(addr: string, total: bigint, daily: bigint) {
  try {
    window.localStorage.setItem(
      cacheKey(addr),
      JSON.stringify({ total: total.toString(), daily: daily.toString() }),
    );
  } catch { /* ignore */ }
}

export function usePointsContract(address?: string | null): PointsState {
  const cached = readCache(address);
  const [total, setTotal] = useState<bigint>(cached?.total ?? 0n);
  const [daily, setDaily] = useState<bigint>(cached?.daily ?? 0n);
  const [pending, setPending] = useState<bigint>(0n);
  const [referrals, setReferrals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const inflight = useRef(false);

  const refresh = useCallback(async () => {
    if (!address) {
      setTotal(0n); setDaily(0n); setPending(0n); setReferrals([]);
      return;
    }
    if (inflight.current) return;
    inflight.current = true;
    setLoading(true);
    try {
      const [p, pend, refs] = await Promise.all([
        readPoints(address),
        readPendingReferral(address).catch(() => 0n),
        readReferrals(address).catch(() => [] as string[]),
      ]);
      setTotal(p.total); setDaily(p.daily);
      setPending(pend); setReferrals(refs);
      writeCache(address, p.total, p.daily);
    } catch (e) {
      console.warn("usePointsContract refresh failed", e);
    } finally {
      inflight.current = false;
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (!address) {
      setTotal(0n); setDaily(0n); setPending(0n); setReferrals([]);
      return;
    }
    // hydrate from cache instantly
    const c = readCache(address);
    if (c) { setTotal(c.total); setDaily(c.daily); }
    refresh();
    const t = setInterval(refresh, 10_000);
    return () => clearInterval(t);
  }, [address, refresh]);

  return {
    total,
    daily,
    pending,
    referrals,
    loading,
    capReached: daily >= BigInt(DAILY_POINTS_CAP),
    refresh,
  };
}

export { POINTS_SYSTEM_ADDRESS };

/** Time remaining (ms) until next 00:00 IST (UTC+5:30). */
export function msUntilIstMidnight(now: Date = new Date()): number {
  // Convert "now" wall clock into an IST-shifted Date so we can compute next IST midnight in UTC ms.
  const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const nextIstMidnight = new Date(istNow);
  nextIstMidnight.setUTCHours(24, 0, 0, 0);
  // Convert that IST midnight back to UTC ms by subtracting the 5.5h offset.
  const targetUtcMs = nextIstMidnight.getTime() - 5.5 * 60 * 60 * 1000;
  return Math.max(0, targetUtcMs - now.getTime());
}

export function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
