import { useCallback, useEffect, useState } from "react";
import { Gem, Loader2, Sparkles, Trophy } from "lucide-react";
import { formatUnits } from "ethers";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { TiltCard } from "@/components/TiltCard";
import { errMsg, shortAddr } from "@/lib/litvm";
import {
  NFT_TIERS,
  claimNFTRewards,
  mintRewardNFT,
  readNFTPending,
  readNFTUserPoints,
  readUserNFTs,
  type NFTInfo,
} from "@/lib/points";

function fmt(v: bigint, decimals = 18, max = 6) {
  try { return (+formatUnits(v, decimals)).toLocaleString(undefined, { maximumFractionDigits: max }); }
  catch { return "0"; }
}

export default function RewardsNFTs() {
  const { address, isConnected } = useAccount();
  const [nfts, setNfts] = useState<NFTInfo[]>([]);
  const [pending, setPending] = useState<{ zkltc: bigint; usdc: bigint; ldex: bigint }>({ zkltc: 0n, usdc: 0n, ldex: 0n });
  const [points, setPoints] = useState<bigint>(0n);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!address) { setNfts([]); setPending({ zkltc: 0n, usdc: 0n, ldex: 0n }); setPoints(0n); return; }
    try {
      const [list, pend, pts] = await Promise.all([
        readUserNFTs(address).catch(() => [] as NFTInfo[]),
        readNFTPending(address).catch(() => ({ zkltc: 0n, usdc: 0n, ldex: 0n })),
        readNFTUserPoints(address).catch(() => 0n),
      ]);
      setNfts(list); setPending(pend); setPoints(pts);
    } catch (e) { console.warn(e); }
  }, [address]);

  useEffect(() => { refresh(); }, [refresh]);

  const onMint = async (id: 1 | 2 | 3) => {
    setBusy(`mint-${id}`);
    try {
      const hash = await mintRewardNFT(id);
      toast.success(`${NFT_TIERS[id - 1].name} NFT minted`, { description: shortAddr(hash) });
      refresh();
    } catch (e) {
      toast.error("Mint failed", { description: errMsg(e).slice(0, 140) });
    } finally { setBusy(null); }
  };

  const onClaim = async () => {
    setBusy("claim");
    try {
      const hash = await claimNFTRewards();
      toast.success("Rewards claimed", { description: shortAddr(hash) });
      refresh();
    } catch (e) {
      toast.error("Claim failed", { description: errMsg(e).slice(0, 140) });
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/5 px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-purple-300">
            <Sparkles className="h-3 w-3" /> Reward NFTs
          </div>
          <h1 className="mt-3 font-display text-5xl">
            <span className="text-gradient-aurora">Mint. Hold. Earn Daily.</span>
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Burn points to mint a reward NFT. Each NFT drips zkLTC + USDC + LDEX every day.
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5 text-xs">
          <div className="text-[10px] uppercase tracking-wider text-white/30">Your Points (NFT)</div>
          <div className="mt-0.5 font-display text-2xl text-teal-400">{points.toString()}</div>
        </div>
      </header>

      {/* Tier cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {NFT_TIERS.map((t) => {
          const canMint = isConnected && points >= BigInt(t.cost);
          return (
            <TiltCard key={t.id} tiltLimit={5} scale={1.02} className="rounded-2xl">
              <div className={`rounded-2xl border ${t.border} ${t.glow} bg-[#0d1117] p-6`}>
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/40">
                    <Gem className="h-3 w-3" /> {t.name}
                  </div>
                  <div className="text-[10px] text-white/30">Tier {t.id}</div>
                </div>
                <h3 className="mt-3 font-display text-3xl text-white">{t.name} NFT</h3>
                <div className="mt-1 text-xs text-white/40">Mint cost: <span className="font-mono text-teal-300">{t.cost.toLocaleString()} pts</span></div>

                <div className="mt-5 space-y-1.5 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 text-xs">
                  <div className="flex items-center justify-between"><span className="text-white/40">Daily zkLTC</span><span className="font-mono text-white">{t.rewards.zkltc}</span></div>
                  <div className="flex items-center justify-between"><span className="text-white/40">Daily USDC</span><span className="font-mono text-white">{t.rewards.usdc}</span></div>
                  <div className="flex items-center justify-between"><span className="text-white/40">Daily LDEX</span><span className="font-mono text-white">{t.rewards.ldex}</span></div>
                </div>

                <button
                  onClick={() => onMint(t.id)}
                  disabled={!canMint || busy === `mint-${t.id}`}
                  className={`mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold tracking-wide transition-colors disabled:opacity-50 ${
                    t.id === 3
                      ? "border-purple-400/60 bg-purple-500/15 text-purple-200 hover:bg-purple-500/25"
                      : t.id === 2
                      ? "border-blue-400/60 bg-blue-500/15 text-blue-200 hover:bg-blue-500/25"
                      : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
                  }`}
                >
                  {busy === `mint-${t.id}` ? <><Loader2 className="h-4 w-4 animate-spin" /> Minting…</> : `Mint ${t.name}`}
                </button>
                {!canMint && isConnected && (
                  <div className="mt-2 text-center text-[11px] text-white/30">
                    Need {(BigInt(t.cost) - points).toString()} more points
                  </div>
                )}
              </div>
            </TiltCard>
          );
        })}
      </div>

      {/* Your NFTs */}
      <TiltCard tiltLimit={4} scale={1.01} className="rounded-2xl">
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d1117] p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-teal-400">
                <Trophy className="h-3 w-3" /> Your NFTs
              </div>
              <h2 className="mt-2 font-display text-2xl text-white">{nfts.length} owned</h2>
            </div>
            <button
              onClick={onClaim}
              disabled={!isConnected || busy === "claim" || (pending.zkltc === 0n && pending.usdc === 0n && pending.ldex === 0n)}
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-orange-500/60 bg-orange-500/15 px-5 text-sm font-bold uppercase tracking-[0.2em] text-orange-300 hover:bg-orange-500/25 disabled:opacity-50"
            >
              {busy === "claim" ? <><Loader2 className="h-4 w-4 animate-spin" /> Claiming…</> : "Claim All Rewards"}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
              <div className="text-[10px] uppercase tracking-wider text-white/30">Pending zkLTC</div>
              <div className="font-mono text-lg text-white">{fmt(pending.zkltc)}</div>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
              <div className="text-[10px] uppercase tracking-wider text-white/30">Pending USDC</div>
              <div className="font-mono text-lg text-white">{fmt(pending.usdc, 18)}</div>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
              <div className="text-[10px] uppercase tracking-wider text-white/30">Pending LDEX</div>
              <div className="font-mono text-lg text-white">{fmt(pending.ldex)}</div>
            </div>
          </div>

          <div className="mt-5">
            {nfts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-10 text-center text-sm text-white/40">
                No NFTs yet. Mint one above to start earning daily.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {nfts.map((n, idx) => {
                  const tier = NFT_TIERS[Math.max(0, Math.min(2, n.nftType - 1))];
                  return (
                    <div key={idx} className={`rounded-xl border ${tier.border} ${tier.glow} bg-white/[0.02] p-4`}>
                      <div className="text-[10px] uppercase tracking-wider text-white/40">{tier.name}</div>
                      <div className="mt-1 font-display text-lg text-white">#{idx + 1}</div>
                      <div className="mt-1 text-[10px] text-white/30">last claim day: {n.lastClaimDay.toString()}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="mt-5 text-[11px] text-white/30">
            Rewards accumulate daily. Claim anytime — multiple days stack up.
          </p>
        </div>
      </TiltCard>
    </div>
  );
}
