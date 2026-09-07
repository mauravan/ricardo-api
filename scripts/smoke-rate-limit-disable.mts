import { RicardoClient } from "../src/client.ts";
import { TokenBucket } from "../src/core/rate-limit.ts";


// Test #5: rateLimit: false => no limiter instantiated
const t0 = Date.now();
const disabled = new RicardoClient({ rateLimit: false });
const elapsed = Date.now() - t0;
console.log(`disabled client constructed in ${elapsed}ms; limiter=${disabled.limiter}`);
if (disabled.limiter !== undefined) {
  console.error("FAIL: limiter should be undefined");
  process.exit(1);
}
if (elapsed > 200) {
  console.error(`FAIL: construction took ${elapsed}ms (expected <200ms without limiter)`);
  process.exit(1);
}

// Test #6: end-to-end through HttpClient (real network call)
console.log("e2e: calling categories.tree()…");
const enabled = new RicardoClient();
console.log(`enabled client has limiter: ${enabled.limiter !== undefined}`);
const tree = await enabled.categories.tree();
console.log(
  `categories.tree returned ${Array.isArray(tree) ? tree.length : "?"} entries`,
);
if (enabled.limiter === undefined) {
  console.error("FAIL: enabled client missing limiter");
  process.exit(1);
}

const tb = new TokenBucket({ tokensPerSecond: 1, burst: 1 });
await tb.acquire(); // drain burst so next acquire queues
const ctrl = new AbortController();
ctrl.abort();
try {
  await tb.acquire(ctrl.signal);
  console.error("FAIL: aborted acquire should reject");
  process.exit(1);
} catch (err) {
  console.log(`aborted acquire rejected as expected: ${(err as Error).name}`);
}
tb.dispose();

// Validation test
console.log("validation test…");
try {
  new RicardoClient({ rateLimit: { tokensPerSecond: 0 } });
  console.error("FAIL: tokensPerSecond=0 should throw");
  process.exit(1);
} catch (err) {
  console.log(`zero rps rejected: ${(err as Error).name}: ${(err as Error).message}`);
}
try {
  new RicardoClient({ rateLimit: { burst: 0 } });
  console.error("FAIL: burst=0 should throw");
  process.exit(1);
} catch (err) {
  console.log(`zero burst rejected: ${(err as Error).name}: ${(err as Error).message}`);
}

console.log("ALL OK");
process.exit(0);
