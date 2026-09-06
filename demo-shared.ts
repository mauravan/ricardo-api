/**
 * Shared bits for the demos: one on-disk session store that `demo-session.ts`
 * writes to and every other demo reads from.
 */
import { FileSessionStore, RicardoClient, Session } from "./src/index";

export const SESSION_DIR = "./.ricardo-sessions";
export const SESSION_KEY = process.env.RICARDO_SESSION ?? "default";
export const store = new FileSessionStore(SESSION_DIR);

/**
 * Build a client from the stored session. Falls back to an anonymous client
 * (with a hint) if none is saved — unauthenticated calls still work.
 */
export async function loadClient(): Promise<RicardoClient> {
  const snapshot = await store.load(SESSION_KEY);
  if (!snapshot) {
    console.warn(
      `[demo] no stored session "${SESSION_KEY}". Run \`npm run demo:session\` first. Using an anonymous session.\n`,
    );
    return new RicardoClient();
  }
  const client = new RicardoClient({ session: Session.fromJSON(snapshot) });
  const who = client.session.auth?.accountId;
  console.log(
    `[demo] loaded session "${SESSION_KEY}"${who ? ` (account ${who})` : ""}\n`,
  );
  return client;
}
