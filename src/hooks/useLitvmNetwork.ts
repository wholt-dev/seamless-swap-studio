import { useEffect, useState } from "react";
import { JsonRpcProvider } from "ethers";
import { RPC_URL } from "@/lib/litvm";

export type NetworkSnapshot = {
  latestBlock: number | null;
  avgBlockTime: number | null;
  gasPriceGwei: number | null;
  recentTxs: number | null;
  blocks: { number: number; txs: number }[];
};

let sharedProvider: JsonRpcProvider | null = null;
function getProvider() {
  if (!sharedProvider) sharedProvider = new JsonRpcProvider(RPC_URL);
  return sharedProvider;
}

export function useLitvmNetwork(pollMs = 12000): NetworkSnapshot {
  const [snap, setSnap] = useState<NetworkSnapshot>({
    latestBlock: null,
    avgBlockTime: null,
    gasPriceGwei: null,
    recentTxs: null,
    blocks: [],
  });

  useEffect(() => {
    let cancelled = false;
    const provider = getProvider();

    const tick = async () => {
      try {
        const [latest, fee] = await Promise.all([
          provider.getBlockNumber(),
          provider.getFeeData(),
        ]);
        const start = Math.max(latest - 15, 0);
        const blockNums = Array.from({ length: latest - start + 1 }, (_, i) => start + i);
        const blocks = await Promise.all(blockNums.map((n) => provider.getBlock(n).catch(() => null)));

        const valid = blocks.filter(Boolean) as Awaited<ReturnType<typeof provider.getBlock>>[];
        let avg: number | null = null;
        if (valid.length >= 2) {
          const deltas: number[] = [];
          for (let i = 1; i < valid.length; i++) {
            const a = valid[i - 1]?.timestamp ?? 0;
            const b = valid[i]?.timestamp ?? 0;
            if (b > a) deltas.push(b - a);
          }
          if (deltas.length) avg = deltas.reduce((s, n) => s + n, 0) / deltas.length;
        }
        const recentTxs = valid.reduce((s, b) => s + (b?.transactions.length ?? 0), 0);
        const gasGwei = fee.gasPrice ? Number(fee.gasPrice) / 1e9 : null;

        if (cancelled) return;
        setSnap({
          latestBlock: latest,
          avgBlockTime: avg,
          gasPriceGwei: gasGwei,
          recentTxs,
          blocks: valid.map((b) => ({ number: b!.number, txs: b!.transactions.length })),
        });
      } catch (err) {
        console.error("Failed to fetch network snapshot:", err);
      }
    };

    tick();
    const id = setInterval(tick, pollMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pollMs]);

  return snap;
}
