/**
 * Demo: log in to ricardo.ch, then make authenticated calls.
 * Run:  RICARDO_USER=you@example.com RICARDO_PASS=secret npm run demo:login
 *
 * A captcha image is saved to ./ricardo-captcha.svg — open it, then type the
 * text when prompted. The captcha step is handled by ManualCaptchaProvider
 * (the default); swap in another CaptchaProvider to automate it later.
 */

import { SESSION_KEY, store } from "./demo-shared";
import { RicardoClient } from "./src/index";

async function main(): Promise<void> {
  const username = process.env.RICARDO_USER;
  const password = process.env.RICARDO_PASS;
  if (!username || !password) {
    console.error("Set RICARDO_USER and RICARDO_PASS environment variables.");
    process.exit(1);
  }

  const client = new RicardoClient();

  console.log(
    "Logging in… a captcha image will be saved; enter its text when asked.\n",
  );
  const account = await client.account.login({
    username,
    password,
  });

  console.log(`\nLogged in ✓  account ${account.publicAccountId}`);
  console.log(`Session token (X-Ricardo-Auth): ${account.token.slice(0, 8)}…`);

  await store.save(SESSION_KEY, client.session.toJSON());
  console.log(`Session saved as "${SESSION_KEY}" — other demos will load it.`);

  const profile = await client.account.profile();
  console.log(`\nProfile: ${JSON.stringify(profile).slice(0, 300)}`);

  const res = await client.search("ubiquiti").fetch();
  console.log(`\nAuthenticated search "ubiquiti": ${res.totalCount} matches`);
}

main().catch((err) => {
  console.error("Login demo failed:", err);
  process.exit(1);
});
