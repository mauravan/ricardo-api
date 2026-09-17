/**
 * Demonstrate the read mobile operations.
 *   npm run demo:queries
 */
import { RicardoClient } from "./src/index";

async function main(): Promise<void> {
  const client = new RicardoClient();

  // Category taxonomy (mobile GET /m/home)
  const treeRaw = await client.categories.tree();
  const tree = Array.isArray(treeRaw)
    ? (treeRaw as Array<Record<string, unknown>>)
    : [];
  console.log(
    `categories.tree: ${tree.length} root categories — ${tree
      .slice(0, 6)
      .map(
        (c) =>
          (c.category_id ??
            c.categoryID ??
            c.id ??
            c.category_name ??
            c.name) as string,
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
  const ufRaw = await client.search().category("39091").updateFilters();
  const uf = ufRaw as Record<string, unknown>;
  const rawFilters =
    (uf.filters as unknown[] | undefined) ??
    (uf.attributes as unknown[] | undefined) ??
    (uf.availableFilters as unknown[] | undefined) ??
    undefined;
  const filterNames = Array.isArray(rawFilters)
    ? (rawFilters as Array<Record<string, unknown>>).map(
        (f) => (f.name ?? f.key ?? f) as string,
      )
    : rawFilters && typeof rawFilters === "object"
      ? Object.keys(rawFilters as Record<string, unknown>)
      : [];
  const totalCount =
    (uf.total_count as number | undefined) ??
    (uf.totalCount as number | undefined) ??
    (uf.totalArticlesCount as number | undefined) ??
    ((uf.listings as Record<string, unknown> | undefined)?.totalCount as
      | number
      | undefined) ??
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
