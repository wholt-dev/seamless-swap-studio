// LitLand contracts on LitVM LiteForge (chainId 4441)
import { Contract, JsonRpcProvider } from "ethers";
import { RPC_URL } from "./litvm";

export const LITL_TOKEN     = "0x85066Aba1C143c9046Ba7ACb9A7EE6FfDfE065EB";
export const LITLAND_PLOT   = "0x7Cb796da5182c0bA666d2b0A8fd5Cab5221F8652";
export const LITLAND_NFT    = "0x7D8932f409bbebfdd8F0F71565cFbbEa6277174A";
export const LITLAND_MARKET = "0xBe3C6E1653FADa7BC75831afFf3487D38a8C4D61";

export const GRID_SIZE = 100;
export const TOTAL_PLOTS = GRID_SIZE * GRID_SIZE;
export const MAX_LEVEL = 10;

export const litlandProvider = new JsonRpcProvider(RPC_URL);

// Best-effort ABIs (multiple possible names used at call sites)
export const LITL_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

export const PLOT_ABI = [
  // claim
  "function claimPlot(uint256 x, uint256 y)",
  "function claim(uint256 x, uint256 y)",
  // owner / level lookups
  "function plotOwner(uint256 x, uint256 y) view returns (address)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function plotLevel(uint256 x, uint256 y) view returns (uint8)",
  "function levelOf(uint256 x, uint256 y) view returns (uint8)",
  // batched / packed reads (if supported)
  "function getPlotsBatch(uint256[] xs, uint256[] ys) view returns (address[] owners, uint8[] levels)",
  "function getRow(uint256 y) view returns (address[] owners, uint8[] levels)",
  // upgrades
  "function startUpgrade(uint256 x, uint256 y)",
  "function instantUpgrade(uint256 x, uint256 y)",
  "function claimUpgrade(uint256 x, uint256 y)",
  "function upgradeFinishAt(uint256 x, uint256 y) view returns (uint256)",
  // alliances
  "function createAlliance(string name)",
  "function joinAlliance(uint256 allianceId)",
  "function leaveAlliance()",
  "function allianceOf(address user) view returns (uint256)",
  "function allianceName(uint256 id) view returns (string)",
];

export const NFT_ABI = [
  "function mint(uint256 kind)",
  "function mintWithLITL(uint256 kind)",
  "function balanceOf(address) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function approve(address to, uint256 tokenId)",
  "function setApprovalForAll(address operator, bool approved)",
];

export const MARKET_ABI = [
  "function listPlot(uint256 x, uint256 y, uint256 price)",
  "function buyPlot(uint256 listingId)",
  "function cancelPlot(uint256 listingId)",
  "function listingsCount() view returns (uint256)",
  "function getListing(uint256 id) view returns (uint256 x, uint256 y, address seller, uint256 price, uint8 level, bool active)",
  // NFT marketplace
  "function listNFT(uint256 tokenId, uint256 price)",
  "function buyNFT(uint256 listingId)",
  "function nftListingsCount() view returns (uint256)",
  "function getNFTListing(uint256 id) view returns (uint256 tokenId, address seller, uint256 price, bool active)",
];

export function levelImage(level: number) {
  const n = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  return `https://raw.githubusercontent.com/wholt-dev/seamless-swap-studio/main/litland/levels/level${n}/images/Level${n}.png`;
}

export function plotKey(x: number, y: number) {
  return `${x},${y}`;
}

export function plotTokenId(x: number, y: number) {
  return BigInt(y) * BigInt(GRID_SIZE) + BigInt(x);
}

// Color scale for level 1 (dim) → 10 (bright). Returns CSS color.
export function levelColor(level: number) {
  if (!level || level <= 0) return "#1f2937"; // unclaimed dark gray
  const t = Math.min(1, Math.max(0, (level - 1) / (MAX_LEVEL - 1)));
  // interpolate from deep orange (dim) to bright orange/yellow
  const r = Math.round(120 + (249 - 120) * t);
  const g = Math.round(60 + (180 - 60) * t);
  const b = Math.round(20 + (40 - 20) * t);
  return `rgb(${r},${g},${b})`;
}

export function plotContract(signerOrProvider: any) {
  return new Contract(LITLAND_PLOT, PLOT_ABI, signerOrProvider);
}
export function litlContract(signerOrProvider: any) {
  return new Contract(LITL_TOKEN, LITL_ABI, signerOrProvider);
}
export function nftContract(signerOrProvider: any) {
  return new Contract(LITLAND_NFT, NFT_ABI, signerOrProvider);
}
export function marketContract(signerOrProvider: any) {
  return new Contract(LITLAND_MARKET, MARKET_ABI, signerOrProvider);
}

// Try multiple read methods, return first that succeeds
export async function tryRead<T>(fns: Array<() => Promise<T>>): Promise<T | null> {
  for (const fn of fns) {
    try { return await fn(); } catch { /* continue */ }
  }
  return null;
}
