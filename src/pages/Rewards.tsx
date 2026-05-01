import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Trophy, Clock, CheckCircle2, Rocket } from "lucide-react";
import { useAccount } from "wagmi";
import { Link } from "react-router-dom";
import { TiltCard } from "@/components/TiltCard";
import { EXPLORER_URL, shortAddr } from "@/lib/litvm";
import { POINTS_SYSTEM_ADDRESS } from "@/lib/points";
import { usePointsContract, DAILY_POINTS_CAP, msUntilIstMidnight, fmtCountdown } from "@/hooks/usePointsContract";

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-white/30">{label}</div>
      <div className="mt-0.5 font-display text-lg text-white">{value}</div>
    </div>
  );
}

export default function Rewards() {
  const { address } = useAccount();
  const { total, daily, capReached } = usePointsContract(address);

  const dailyNum = Number(daily);
  const pct = Math.min(100, (dailyNum / DAILY_POINTS_CAP) * 100);

  // Live IST countdown
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const countdown = useMemo(() => fmtCountdown(msUntilIstMidnight(new Date(now))), [now]);

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
            Check in daily and deploy tokens to climb the LitDeX leaderboard.
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
              <div className="mt-1 text-[11px] text-white/30">on-chain · PointsSystemV4</div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <StatPill label="Deploy daily" value={`${dailyNum} / ${DAILY_POINTS_CAP} pts`} />
              <StatPill label="Check-in bonus" value="+10 / day" />
              <StatPill label="Lifetime" value={total.toString()} />
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-1 flex items-center justify-between text-[11px] text-white/40">
              <span>Deploy daily cap (check-in +10 not counted)</span>
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
                Deploy cap reached ({DAILY_POINTS_CAP}/{DAILY_POINTS_CAP} pts)
              </div>
              <div className="text-xs text-white/60">Daily check-in still earns +10 bonus pts separately.</div>
              <div className="font-mono text-xs text-white/60">Resets in {countdown} (00:00 IST)</div>
            </div>
          ) : (
            <div className="mt-3 text-[11px] text-white/40">
              {dailyNum}/{DAILY_POINTS_CAP} deploy pts used today · check-in +10 is separate · resets in <span className="font-mono text-white/60">{countdown}</span>
            </div>
          )}
        </div>
      </TiltCard>

      {/* How to earn */}
      <TiltCard tiltLimit={4} scale={1.01} className="rounded-2xl">
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d1117] p-6 md:p-8">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-teal-400">
            <Trophy className="h-3 w-3" /> How to earn
          </div>
          <h2 className="mt-2 font-display text-2xl text-white">Two ways to earn points</h2>
          <p className="mt-1 text-xs text-white/40">Points are credited automatically on-chain — no extra signing.</p>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Link
              to="/checkin"
              className="group flex items-start gap-3 rounded-xl border border-teal-500/30 bg-teal-500/5 p-4 transition-colors hover:bg-teal-500/10"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-300" />
              <div>
                <div className="text-sm font-semibold text-white">Daily Check-in</div>
                <div className="mt-0.5 text-xs text-white/40">+10 points per check-in · once every 24h</div>
                <div className="mt-1 text-[11px] text-teal-300 group-hover:underline">Go to Check-in →</div>
              </div>
            </Link>

            <Link
              to="/deploy"
              className="group flex items-start gap-3 rounded-xl border border-teal-500/30 bg-teal-500/5 p-4 transition-colors hover:bg-teal-500/10"
            >
              <Rocket className="mt-0.5 h-5 w-5 shrink-0 text-teal-300" />
              <div>
                <div className="text-sm font-semibold text-white">Deploy Token</div>
                <div className="mt-0.5 text-xs text-white/40">+5 points per deploy · via LitDeXDeployer</div>
                <div className="mt-1 text-[11px] text-teal-300 group-hover:underline">Go to Deploy →</div>
              </div>
            </Link>
          </div>
        </div>
      </TiltCard>
    </div>
  );
}
