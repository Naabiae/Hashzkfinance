export function formatUSDCFrom6(value: bigint): string {
  const s = value.toString().padStart(7, "0");
  const whole = s.slice(0, -6);
  const frac = s.slice(-6).replace(/0+$/, "");
  return frac.length ? `${whole}.${frac}` : whole;
}

export function compactAddress(addr: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

