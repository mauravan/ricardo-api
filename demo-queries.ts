/**
 * Demonstrate the read mobile operations. Loads the stored session
 * (run `npm run demo:session` first; otherwise runs anonymously).
 *   npm run demo:queries
 */
import { loadClient } from "./demo-shared";

async function main(): Promise<void> {
  const client = await loadClient();

  // Category taxonomy (mobile GET /m/home)
  const tree = (await client.categories.tree()) as Array<any>;
  console.log(
    `categories.tree: ${tree.length} root categories — ${tree
      .slice(0, 6)
      .map(
        (c: any) =>
          c.category_id ?? c.categoryID ?? c.id ?? c.category_name ?? c.name,
      )
      .join(", ")}`,
  );
  const featured = (await client.categories.featured()) as unknown[];
  console.log(
    `categories.featured: ${Array.isArray(featured) ? featured.length : "?"} entries`,
  );

  // Autocomplete via POST /m/search
  const sug = (await client.suggestions.search("sof")) as {
    suggestionGroups?: Array<{ suggestions?: unknown[] }>;
  };
  const flat = (sug.suggestionGroups ?? []).flatMap((g) => g.suggestions ?? []);
  console.log(`suggestions.search("sof"): ${flat.length} suggestions`);

  // Filters for a category, no listings page (mobile POST /m/search with use_attribute_facets)
  const uf = (await client.search().category("39091").updateFilters()) as any;
  const rawFilters =
    uf.filters ?? uf.attributes ?? (uf as any).availableFilters;
  const filterNames = Array.isArray(rawFilters)
    ? (rawFilters as any[]).map((f: any) => f.name ?? f.key ?? f)
    : rawFilters
      ? Object.keys(rawFilters as Record<string, unknown>)
      : [];
  const totalCount =
    (uf as any).total_count ??
    (uf as any).totalCount ??
    (uf as any).totalArticlesCount ??
    (uf as any).listings?.totalCount ??
    0;
  console.log(
    `updateFilters(39091): totalCount=${totalCount}, filters=[${filterNames.join(", ")}]`,
  );
  // seller profiles removed — no verified endpoint
}

main().catch((err) => {
  console.error("Queries demo failed:", err);
  process.exit(1);
});
