import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Copy, Droplets, ExternalLink, Loader2, Rocket, Trophy, Users, Gift, Clock } from "lucide-react";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { TiltCard } from "@/components/TiltCard";
import { EXPLORER_URL, shortAddr, errMsg } from "@/lib/litvm";
import {
  POINTS_SYSTEM_ADDRESS,
  claimReferralPoints,
  recordAction,
  autoRegisterReferralIfNeeded,
} from "@/lib/points";
import { usePointsContract, DAILY_POINTS_CAP, msUntilIstMidnight, fmtCountdown } from "@/hooks/usePointsContract";

const REFERRAL_ORIGIN = "https://litdex.test-hub.xyz";

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-white/30">{label}</div>
      <div className="mt-0.5 font-display text-lg text-white">{value}</div>
    </div>
  );
}

export default function Rewards() {
  const { address, isConnected } = useAccount();
  const { total, daily, pending, referrals, refresh, capReached } = usePointsContract(address);
  const [busy, setBusy] = useState<string | null>(null);

  // Auto-register referral from ?ref= once wallet is connected
  useEffect(() => {
    if (!address) return;
    autoRegisterReferralIfNeeded(address).then(() => refresh());
  }, [address, refresh]);

  const action = async (kind: "swap" | "lp" | "deploy") => {
    setBusy(kind);
    try {
      const hash = await recordAction(kind);
      toast.success(`${kind === "swap" ? "+1" : kind === "lp" ? "+2" : "+3"} pt recorded`, {
        description: shortAddr(hash),
      });
      await refresh();
    } catch (e) {
      toast.error("Record failed", { description: errMsg(e).slice(0, 140) });
    } finally { setBusy(null); }
  };

  const claim = async () => {
    setBusy("claim");
    try {
      const hash = await claimReferralPoints();
      toast.success("Referral points claimed", { description: shortAddr(hash) });
      await refresh();
    } catch (e) {
      toast.error("Claim failed", { description: errMsg(e).slice(0, 140) });
    } finally { setBusy(null); }
  };

  const refLink = address ? `${REFERRAL_ORIGIN}/swap?ref=${address}` : "";
  const dailyNum = Number(daily);
  const pct = Math.min(100, (dailyNum / DAILY_POINTS_CAP) * 100);

  // Live IST countdown — recomputed every second from UTC clock
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const countdown = useMemo(() => fmtCountdown(msUntilIstMidnight(new Date(now))), [now]);

  // When the IST day rolls over (countdown reaches 0), force a contract refresh.
  const prevCountdownRef = useState<string>("")[0];
  useEffect(() => {
    if (countdown === "00:00:00") {
      refresh();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown.startsWith("00:00:0")]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/5 px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-teal-400">
            <Trophy className="h-3 w-3" /> Points & Rewards
          </div>
          <h1 className="mt-3 font-display text-5xl">
            <span className="text-gradient-aurora">Earn LDEX Points</span>
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Swap, add liquidity, deploy and refer friends to climb the LitDeX leaderboard.
          </p>
        </div>
        <a
          href={`${EXPLORER_URL}/address/${POINTS_SYSTEM_ADDRESS}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5 text-xs text-white/60 hover:border-teal-500/40 hover:text-teal-400"
        >
          <ExternalLink className="h-3 w-3" /> {shortAddr(POINTS_SYSTEM_ADDRESS)}
        </a>
      </header>

      {/* Points Card — contract values only */}
      <TiltCard tiltLimit={4} scale={1.01} className="rounded-2xl">
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d1117] p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/40">Total Points</div>
              <div className="mt-1 font-display text-6xl text-teal-400">{total.toString()}</div>
              <div className="mt-1 text-[11px] text-white/30">on-chain · PointsSystemV2</div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <StatPill label="Daily" value={`${dailyNum} / ${DAILY_POINTS_CAP}`} />
              <StatPill label="Lifetime" value={total.toString()} />
              <StatPill label="Pending Referral" value={pending.toString()} />
              <StatPill label="Referrals" value={referrals.length} />
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-1 flex items-center justify-between text-[11px] text-white/40">
              <span>Daily cap progress</span>
              <span className="font-mono">{pct.toFixed(0)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.05]">
              <div className="h-full bg-gradient-to-r from-teal-500 to-teal-300 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {capReached ? (
            <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 p-5 text-center">
              <Clock className="h-6 w-6 text-orange-300" />
              <div className="font-display text-base text-white">
                Daily limit reached ({DAILY_POINTS_CAP}/{DAILY_POINTS_CAP} pts)
              </div>
              <div className="font-mono text-xs text-white/60">Resets in {countdown} (00:00 IST)</div>
            </div>
          ) : (
            <>
              <div className="mt-3 text-[11px] text-white/40">{dailyNum}/{DAILY_POINTS_CAP} points used today · resets in <span className="font-mono text-white/60">{countdown}</span></div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <ActionBtn
                  icon={<ArrowLeftRight className="h-4 w-4" />}
                  label="Record Swap"
                  sub="+1 pt"
                  loading={busy === "swap"}
                  disabled={!isConnected || !!busy}
                  onClick={() => action("swap")}
                />
                <ActionBtn
                  icon={<Droplets className="h-4 w-4" />}
                  label="Record LP"
                  sub="+2 pts"
                  loading={busy === "lp"}
                  disabled={!isConnected || !!busy}
                  onClick={() => action("lp")}
                />
                <ActionBtn
                  icon={<Rocket className="h-4 w-4" />}
                  label="Record Deploy"
                  sub="+3 pts"
                  loading={busy === "deploy"}
                  disabled={!isConnected || !!busy}
                  onClick={() => action("deploy")}
                />
                <ActionBtn
                  icon={<Gift className="h-4 w-4" />}
                  label="Claim Referral"
                  sub={`${pending.toString()} pts pending`}
                  loading={busy === "claim"}
                  disabled={!isConnected || !!busy || pending === 0n}
                  onClick={claim}
                  accent
                />
              </div>
            </>
          )}
        </div>
      </TiltCard>

      {/* Referral */}
      <TiltCard tiltLimit={4} scale={1.01} className="rounded-2xl">
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d1117] p-6 md:p-8">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-teal-400">
            <Users className="h-3 w-3" /> Referrals
          </div>
          <h2 className="mt-2 font-display text-2xl text-white">Invite friends, earn together</h2>
          <p className="mt-1 text-xs text-white/40">
            Points credited when a referred wallet completes 5 transactions.
          </p>

          <div className="mt-5 flex flex-col gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 sm:flex-row sm:items-center">
            <code className="flex-1 break-all font-mono text-xs text-teal-300">
              {refLink || "Connect wallet to get your referral link"}
            </code>
            <button
              disabled={!refLink}
              onClick={() => { navigator.clipboard.writeText(refLink); toast.success("Referral link copied"); }}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-teal-500/40 bg-teal-500/10 px-3 text-xs font-semibold text-teal-300 hover:bg-teal-500/20 disabled:opacity-40"
            >
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatPill label="Total Referrals" value={referrals.length} />
            <StatPill label="Pending Points" value={pending.toString()} />
            <StatPill label="Status" value={referrals.length > 0 ? "Active" : "—"} />
          </div>
        </div>
      </TiltCard>
    </div>
  );
}

function ActionBtn({
  icon, label, sub, onClick, disabled, loading, accent,
}: {
  icon: React.ReactNode; label: string; sub: string;
  onClick: () => void; disabled?: boolean; loading?: boolean; accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex h-auto flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition-all disabled:opacity-50 ${
        accent
          ? "border-orange-500/40 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20"
          : "border-teal-500/30 bg-teal-500/5 text-teal-300 hover:bg-teal-500/10"
      }`}
    >
      <div className="flex items-center gap-2 text-xs font-semibold">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        {label}
      </div>
      <div className="text-[11px] text-white/40">{sub}</div>
    </button>
  );
}
