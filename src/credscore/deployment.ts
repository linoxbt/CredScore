// GenLayer's public entry does not export the address calldata type.
// @ts-expect-error internal constructor used by the calldata encoder
import { CalldataAddress } from "../../node_modules/genlayer-js/dist/chunk-KBLQL6W3.js";

/** Studio Dev deployment of contracts/credscore.py. Public, and required at build time. */
export const STUDIO_DEV_CONTRACT = "0xd5c4D1D3D228001f97273ED2855277cC49eC9940";

const configured = import.meta.env.VITE_CREDSCORE_ADDRESS?.trim();

/** Prefer an explicit build address, otherwise the deployed Studio Dev contract. */
export const credScoreAddress = (configured || STUDIO_DEV_CONTRACT) as `0x${string}`;

/** Contract methods type addresses as Address, not as hex strings. */
export function asContractAddress(value: string) {
  const hex = value.trim().toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{40}$/.test(hex)) throw new Error("Address must be 20 bytes.");
  const bytes = new Uint8Array(20);
  for (let i = 0; i < 20; i += 1) bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return new CalldataAddress(bytes);
}
