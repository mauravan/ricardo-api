import type { HttpClient } from "../core/http";
import type { Locality } from "../core/types";

/** Locality lookup — stubbed (no ricardo locality autocomplete endpoint verified). */
export class LocalitiesResource {
  constructor(readonly _http: HttpClient) {}

  /** Autocomplete localities by free text (e.g. "zür"). Returns [] pending capture. */
  async search(_text: string, _excludeIds: string[] = []): Promise<Locality[]> {
    // Ricardo location filter is `filters.location {zipCode, range}` not autocomplete.
    // No `/api/mfa/localities` endpoint found; return [] and document.
    return [];
  }
}
