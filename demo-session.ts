/**
 * Store a session that the other demos load.
 * Two ways:
 *   A) bring a token:   RICARDO_TOKEN=<X-Ricardo-Auth> npm run demo:session
 *   B) full login:      GEMINI_API_KEY=… RICARDO_USER=… RICARDO_PASS=… npm run demo:session
 *
 * Saved via FileSessionStore to ./.ricardo-sessions/<key>.json (key = RICARDO_SESSION or "default").
 */

import { SESSION_KEY, store } from "./demo-shared";
import { LLMCaptchaProvider, RicardoClient } from "./src/index";

async function main(): Promise<void> {
  const client = new RicardoClient();

  if (process.env.RICARDO_TOKEN) {
    client.account.useToken(
      process.env.RICARDO_TOKEN,
      process.env.RICARDO_ACCOUNT_ID as string | undefined,
    );
    console.log("Using provided RICARDO_TOKEN.");
  } else if (process.env.RICARDO_USER && process.env.RICARDO_PASS) {
    console.log("Logging in (captcha solved via Gemini)…");
    const account = await client.account.login({
      username: process.env.RICARDO_USER!,
      password: process.env.RICARDO_PASS!,
      captcha: new LLMCaptchaProvider(),
    });
    console.log(`Logged in ✓ account ${account.publicAccountId}`);
  } else {
    console.error(
      "Provide RICARDO_TOKEN, or RICARDO_USER + RICARDO_PASS (+ GEMINI_API_KEY) to log in.",
    );
    process.exit(1);
  }

  await store.save(SESSION_KEY, client.session.toJSON());
  console.log(
    `\nSaved session "${SESSION_KEY}". Stored keys: ${JSON.stringify(await store.keys())}`,
  );
  console.log(
    "Other demos will now load it (e.g. `npm run demo:queries`, `npm run demo:messages`).",
  );
}

main().catch((err) => {
  console.error("Session demo failed:", err);
  process.exit(1);
});
