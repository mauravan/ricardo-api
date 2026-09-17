import { RicardoClient } from "../src/client.ts";

const client = new RicardoClient();

async function smoke() {
  const locality = { localityID: "39091", name: "Zürich" };
  const baseQuery = "sofa";

  const cases = [
    {
      label: "baseline",
      builder: () => client.search(baseQuery),
    },
    {
      label: "locality",
      builder: () => client.search(baseQuery).location(locality),
    },
    {
      label: "locality+radius",
      builder: () => client.search(baseQuery).location(locality).radius(20),
    },
  ];

  interface ResultRow {
    label: string;
    totalCount: number;
    firstZip: string | undefined;
    firstCity: string | undefined;
    firstId: string;
  }

  const results: ResultRow[] = [];

  for (const c of cases) {
    try {
      const res = await c.builder().fetch();
      const rawData = res.raw() as {
        articles?: Array<Record<string, unknown>>;
        total_count?: number;
        totalCount?: number;
      };
      const rawArticles = rawData.articles ?? [];
      const first = rawArticles[0] as Record<string, unknown> | undefined;
      const totalCount =
        (typeof res.totalCount === "number" ? res.totalCount : 0) ||
        (typeof rawData.total_count === "number" ? rawData.total_count : 0) ||
        (typeof rawData.totalCount === "number" ? rawData.totalCount : 0);
      results.push({
        label: c.label,
        totalCount,
        firstZip: first ? (first.zip_code as string | undefined) : undefined,
        firstCity: first ? (first.city as string | undefined) : undefined,
        firstId: first ? String(first.id ?? "N/A") : "N/A",
      });
      const last = results[results.length - 1];
      console.log(
        `CASE ${c.label}: totalCount=${last ? last.totalCount : 0}, firstZip=${last ? last.firstZip : undefined}, firstCity=${last ? last.firstCity : undefined}, firstId=${last ? last.firstId : "N/A"}`,
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`FAIL: ${c.label} threw: ${msg}`);
      process.exit(1);
    }
  }

  const baselineRow = results.find((r) => r.label === "baseline");
  const localityRow = results.find((r) => r.label === "locality");
  const radiusRow = results.find((r) => r.label === "locality+radius");

  if (!baselineRow || !localityRow || !radiusRow) {
    console.error("FAIL: missing result row");
    process.exit(1);
  }

  const sameAsBaselineLocality =
    localityRow.totalCount === baselineRow.totalCount &&
    localityRow.firstId === baselineRow.firstId;
  const sameAsBaselineRadius =
    radiusRow.totalCount === baselineRow.totalCount &&
    radiusRow.firstId === baselineRow.firstId;

  if (sameAsBaselineLocality && sameAsBaselineRadius) {
    console.error(
      "FAIL: locality and radius produce identical results to baseline; fields may be ignored",
    );
    process.exit(1);
  }

  console.log(
    "OK: location/proximity filtering produces observable differences",
  );
  process.exit(0);
}

smoke();
