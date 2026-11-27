import { createHmac, timingSafeEqual } from "node:crypto";

export function matchTotp(secret: string, code: string, now = Date.now()) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const value = secret.toUpperCase().replace(/[\s=]/g,"");
  if (!/^[A-Z2-7]{16,128}$/.test(value) || !/^\d{6}$/.test(code)) return -1;
  const bits = [...value].map(char => alphabet.indexOf(char).toString(2).padStart(5,"0")).join("");
  const key = Buffer.from(bits.match(/.{8}/g)!.map(byte => parseInt(byte,2)));
  for (const offset of [0,-1,1]) {
    const step = Math.floor(now/30000) + offset;
    if (step < 0) continue;
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(step));
    const digest = createHmac("sha1",key).update(counter).digest();
    const number = digest.readUInt32BE(digest[digest.length-1] & 15) & 0x7fffffff;
    const expected = String(number % 1000000).padStart(6,"0");
    if (timingSafeEqual(Buffer.from(expected),Buffer.from(code))) return step;
  }
  return -1;
}
