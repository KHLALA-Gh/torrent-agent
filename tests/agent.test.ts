import TorrentAgent from "../src/index";
import Query from "../src/query";
import { TestScraper } from "../src/scrapers/scraper";

describe("TorrentAgent", () => {
  const linksCount = 5;
  const linksCount1 = 10;
  let testScraper: TestScraper;
  let testScraper1: TestScraper;
  const loopCount = 100;

  beforeEach(() => {
    testScraper = new TestScraper({
      linksCount,
      name: "Test Scraper",
      runTime: 15,
    });
    testScraper1 = new TestScraper({
      linksCount: linksCount1,
      name: "Test Scraper 1",
    });
  });

  it("should add new queries and emit events correctly", async () => {
    const agent = new TorrentAgent();

    let queryCount = 0;
    agent.on("query", () => {
      queryCount++;
    });

    let torrentsCount = 0;
    const queries: Query[] = [];

    for (let i = 0; i < loopCount; i++) {
      let q = agent.add({
        searchQuery: "Test",
        scrapers: [testScraper, testScraper1],
      });
      q.on("torrent", (t) => {
        torrentsCount++;
      });
      queries.push(q);
    }

    await Promise.all(
      queries.map((q) => new Promise<void>((resolve) => q.on("done", resolve)))
    );

    expect(torrentsCount).toBe(
      loopCount * linksCount + loopCount * linksCount1
    );
    expect(queryCount).toBe(loopCount);
  });
});
