import { RicardoClient } from "../src/client.ts";

const client = new RicardoClient();

async function smoke() {
  const baseQuery = "sofa";

  const cases = [
    {
      label: "baseline",
      builder: () => client.search(baseQuery),
    },
    {
      label: "zipcode",
      builder: () => client.search(baseQuery).zipcode("5617"),
    },
    {
      label: "zipcode+range",
      builder: () => client.search(baseQuery).zipcode("5617").range(20),
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
  const zipcodeRow = results.find((r) => r.label === "zipcode");
  const rangeRow = results.find((r) => r.label === "zipcode+range");

  if (!baselineRow || !zipcodeRow || !rangeRow) {
    console.error("FAIL: missing result row");
    process.exit(1);
  }

  const sameAsBaselineZipcode =
    zipcodeRow.totalCount === baselineRow.totalCount &&
    zipcodeRow.firstId === baselineRow.firstId;
  const sameAsBaselineRange =
    rangeRow.totalCount === baselineRow.totalCount &&
    rangeRow.firstId === baselineRow.firstId;

  if (sameAsBaselineZipcode && sameAsBaselineRange) {
    console.error(
      "FAIL: zipcode and range produce identical results to baseline; fields may be ignored",
    );
    process.exit(1);
  }

  console.log("OK: zipcode/range filtering produces observable differences");
  process.exit(0);
}

smoke();
