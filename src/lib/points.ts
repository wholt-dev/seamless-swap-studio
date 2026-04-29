// Points / Rewards / NFT system on LitVM (chain 4441)
import { BrowserProvider, Contract, JsonRpcProvider } from "ethers";
import { LITVM_CHAIN_ID, RPC_URL } from "./litvm";

export const POINTS_SYSTEM_ADDRESS = "0x9E8777D55d906EAF032DEa524Ad26297309B624D";
export const DAILY_CHECKIN_ADDRESS = "0x338178EBf5Bc7ABa0d63a3D6b86c9F2490dE2De0";
export const LITDEX_NFT_ADDRESS    = "0x1c6806d479071d3595ac0ad0f574aBbCa5290da4";
export const LDEX_TOKEN_ADDRESS    = "0xBAaba603e6298fbb76325a6B0d47Cd57154ca641";
export const USDC_TOKEN_ADDRESS    = "0x60DD65bAd8a73Dfd8DF029C4e3b372d575B03BC2";

export const DAILY_POINTS_CAP = 100;

export const POINTS_SYSTEM_ABI = [
  { inputs: [], name: "recordSwap", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "recordLP", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "recordDeploy", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "referrer", type: "address" }], name: "registerReferral", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "claimReferralPoints", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "user", type: "address" }], name: "getPoints", outputs: [{ name: "total", type: "uint256" }, { name: "daily", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "user", type: "address" }], name: "getPendingReferralPoints", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "user", type: "address" }], name: "getReferrals", outputs: [{ name: "", type: "address[]" }], stateMutability: "view", type: "function" },
] as const;

export const DAILY_CHECKIN_ABI = [
  { inputs: [], name: "checkin", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "user", type: "address" }], name: "getCheckinInfo", outputs: [
    { name: "streak", type: "uint256" },
    { name: "lastDay", type: "uint256" },
    { name: "totalCheckins", type: "uint256" },
    { name: "nextLDEX", type: "uint256" },
  ], stateMutability: "view", type: "function" },
  { inputs: [], name: "getCurrentDay", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

export const LITDEX_NFT_ABI = [
  { inputs: [{ name: "nftType", type: "uint8" }], name: "mintNFT", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "claimRewards", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "user", type: "address" }], name: "getPendingRewards", outputs: [
    { name: "zkltc", type: "uint256" },
    { name: "usdc", type: "uint256" },
    { name: "ldex", type: "uint256" },
  ], stateMutability: "view", type: "function" },
  { inputs: [{ name: "user", type: "address" }], name: "getUserNFTs", outputs: [{
    components: [
      { name: "nftType", type: "uint8" },
      { name: "lastClaimDay", type: "uint256" },
    ],
    name: "", type: "tuple[]",
  }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "user", type: "address" }], name: "userPoints", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

export const readProvider = new JsonRpcProvider(RPC_URL);

async function getSignerContract(addr: string, abi: readonly unknown[]) {
  const eth = (window as unknown as { ethereum?: unknown }).ethereum;
  if (!eth) throw new Error("No wallet detected");
  const provider = new BrowserProvider(eth as never);
  // Best-effort chain check
  try {
    const net = await provider.getNetwork();
    if (Number(net.chainId) !== LITVM_CHAIN_ID) {
      // attempt switch
      await (eth as { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> }).request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x" + LITVM_CHAIN_ID.toString(16) }],
      }).catch(() => undefined);
    }
  } catch { /* ignore */ }
  const signer = await provider.getSigner();
  return new Contract(addr, abi as never, signer);
}

/** Fire-and-forget: record an action on PointsSystemV2. Returns hash on success. */
export async function recordAction(kind: "swap" | "lp" | "deploy"): Promise<string> {
  const c = await getSignerContract(POINTS_SYSTEM_ADDRESS, POINTS_SYSTEM_ABI as never);
  const fn = kind === "swap" ? "recordSwap" : kind === "lp" ? "recordLP" : "recordDeploy";
  const tx = await c[fn]();
  await tx.wait();
  return tx.hash as string;
}

export async function claimReferralPoints(): Promise<string> {
  const c = await getSignerContract(POINTS_SYSTEM_ADDRESS, POINTS_SYSTEM_ABI as never);
  const tx = await c.claimReferralPoints();
  await tx.wait();
  return tx.hash as string;
}

export async function registerReferral(referrer: string): Promise<string> {
  const c = await getSignerContract(POINTS_SYSTEM_ADDRESS, POINTS_SYSTEM_ABI as never);
  const tx = await c.registerReferral(referrer);
  await tx.wait();
  return tx.hash as string;
}

export async function checkinToday(): Promise<string> {
  const c = await getSignerContract(DAILY_CHECKIN_ADDRESS, DAILY_CHECKIN_ABI as never);
  const tx = await c.checkin();
  await tx.wait();
  return tx.hash as string;
}

export async function mintRewardNFT(nftType: 1 | 2 | 3): Promise<string> {
  const c = await getSignerContract(LITDEX_NFT_ADDRESS, LITDEX_NFT_ABI as never);
  const tx = await c.mintNFT(nftType);
  await tx.wait();
  return tx.hash as string;
}

export async function claimNFTRewards(): Promise<string> {
  const c = await getSignerContract(LITDEX_NFT_ADDRESS, LITDEX_NFT_ABI as never);
  const tx = await c.claimRewards();
  await tx.wait();
  return tx.hash as string;
}

// ── reads ──
export async function readPoints(user: string): Promise<{ total: bigint; daily: bigint }> {
  const c = new Contract(POINTS_SYSTEM_ADDRESS, POINTS_SYSTEM_ABI as never, readProvider);
  const [total, daily] = await c.getPoints(user);
  return { total: BigInt(total), daily: BigInt(daily) };
}

export async function readPendingReferral(user: string): Promise<bigint> {
  const c = new Contract(POINTS_SYSTEM_ADDRESS, POINTS_SYSTEM_ABI as never, readProvider);
  const v = await c.getPendingReferralPoints(user);
  return BigInt(v);
}

export async function readReferrals(user: string): Promise<string[]> {
  const c = new Contract(POINTS_SYSTEM_ADDRESS, POINTS_SYSTEM_ABI as never, readProvider);
  const v = (await c.getReferrals(user)) as string[];
  return v;
}

export async function readCheckinInfo(user: string): Promise<{ streak: bigint; lastDay: bigint; totalCheckins: bigint; nextLDEX: bigint }> {
  const c = new Contract(DAILY_CHECKIN_ADDRESS, DAILY_CHECKIN_ABI as never, readProvider);
  const [streak, lastDay, totalCheckins, nextLDEX] = await c.getCheckinInfo(user);
  return { streak: BigInt(streak), lastDay: BigInt(lastDay), totalCheckins: BigInt(totalCheckins), nextLDEX: BigInt(nextLDEX) };
}

export async function readCurrentDay(): Promise<bigint> {
  const c = new Contract(DAILY_CHECKIN_ADDRESS, DAILY_CHECKIN_ABI as never, readProvider);
  return BigInt(await c.getCurrentDay());
}

export type NFTInfo = { nftType: number; lastClaimDay: bigint };

export async function readUserNFTs(user: string): Promise<NFTInfo[]> {
  const c = new Contract(LITDEX_NFT_ADDRESS, LITDEX_NFT_ABI as never, readProvider);
  const arr = (await c.getUserNFTs(user)) as Array<{ nftType: number | bigint; lastClaimDay: bigint }>;
  return arr.map((n) => ({ nftType: Number(n.nftType), lastClaimDay: BigInt(n.lastClaimDay) }));
}

export async function readNFTPending(user: string): Promise<{ zkltc: bigint; usdc: bigint; ldex: bigint }> {
  const c = new Contract(LITDEX_NFT_ADDRESS, LITDEX_NFT_ABI as never, readProvider);
  const [zkltc, usdc, ldex] = await c.getPendingRewards(user);
  return { zkltc: BigInt(zkltc), usdc: BigInt(usdc), ldex: BigInt(ldex) };
}

export async function readNFTUserPoints(user: string): Promise<bigint> {
  const c = new Contract(LITDEX_NFT_ADDRESS, LITDEX_NFT_ABI as never, readProvider);
  return BigInt(await c.userPoints(user));
}

/** Auto-record helper: silent best-effort, returns hash or undefined */
export async function autoRecord(kind: "swap" | "lp" | "deploy"): Promise<string | undefined> {
  try { return await recordAction(kind); } catch { return undefined; }
}

/** NFT tier metadata for UI */
export const NFT_TIERS = [
  { id: 1 as const, name: "Common",  cost: 1000,  rewards: { zkltc: "0.0001", usdc: "10",  ldex: "2"  }, border: "border-white/15", glow: "" },
  { id: 2 as const, name: "Rare",    cost: 5000,  rewards: { zkltc: "0.0005", usdc: "50",  ldex: "10" }, border: "border-blue-400/50", glow: "shadow-[0_0_24px_-6px_rgba(96,165,250,0.5)]" },
  { id: 3 as const, name: "Epic",    cost: 10000, rewards: { zkltc: "0.001",  usdc: "100", ldex: "20" }, border: "border-purple-400/60", glow: "shadow-[0_0_28px_-4px_rgba(168,85,247,0.55)]" },
];
