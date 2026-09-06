import { RicardoHttpError } from "../core/errors";
import type { HttpClient } from "../core/http";
import type { Conversation, Message } from "../core/types";

export interface StreamOptions {
  /** Abort the long-lived stream (e.g. `AbortController.abort()`). */
  signal?: AbortSignal;
}

export interface ReplyOptions {
  itemId: string;
  name: string;
  email: string;
  body: string;
  cc?: boolean;
}

/**
 * Messaging / chat. No messaging stream verified on `api/mfa` or `api.ricardo.ch/m` (only `GET /m/notifications` 401 anonymous in HAR, no stream).
 * Stubbed to throw 501 pending capture — separate subsystem.
 */
export class MessagingResource {
  constructor(readonly _http: HttpClient) {}

  // biome-ignore lint/correctness/useYield: stub throws 501, no yield needed
  async *streamConversations(
    _options: StreamOptions = {},
  ): AsyncGenerator<Conversation> {
    throw new RicardoHttpError(
      501,
      "Not Implemented",
      "messaging not verified on ricardo `api/mfa` — capture required",
    );
  }

  // biome-ignore lint/correctness/useYield: stub throws 501, no yield needed
  async *streamMessages(
    _conversationId: string,
    _options: StreamOptions & { offset?: number } = {},
  ): AsyncGenerator<Message> {
    throw new RicardoHttpError(
      501,
      "Not Implemented",
      "messaging not verified on ricardo `api/mfa` — capture required",
    );
  }

  async send(_conversationId: string, _text: string): Promise<Message> {
    throw new RicardoHttpError(
      501,
      "Not Implemented",
      "messaging not verified",
    );
  }

  async markRead(_conversationId: string, _offset: number): Promise<void> {
    throw new RicardoHttpError(
      501,
      "Not Implemented",
      "messaging not verified",
    );
  }

  async reply(
    _options: ReplyOptions,
  ): Promise<{ message: string; publicAccountId: string }> {
    throw new RicardoHttpError(
      501,
      "Not Implemented",
      "messaging not verified",
    );
  }
}
