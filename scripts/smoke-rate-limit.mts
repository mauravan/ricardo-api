import { TokenBucket } from "../src/core/rate-limit.ts";

const tb = new TokenBucket({ tokensPerSecond: 2, burst: 2 });
const t0 = Date.now();
for (let i = 0; i < 6; i++) await tb.acquire();
const elapsed = Date.now() - t0;
console.log(`6 acquires took ${elapsed}ms`);
// Expect: ~2000ms (2 immediate from burst, then 4 spaced 500ms apart at 2 rps).
const ok = elapsed >= 1500 && elapsed <= 3000;
console.log(ok ? "OK" : "OUT_OF_RANGE");
tb.dispose();
process.exit(ok ? 0 : 1);
