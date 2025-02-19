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

    await agent.onIdle();

    expect(torrentsCount).toBe(
      loopCount * linksCount + loopCount * linksCount1
    );
    expect(queryCount).toBe(loopCount);
  });
  it("should get destroyed correctly", async () => {
    const agent = new TorrentAgent();
    let isDestroyed = false;
    agent.on("destroyed", () => (isDestroyed = true));
    await agent.destroy();
    expect(isDestroyed).toBe(true);
    expect(() => {
      agent.add({ searchQuery: "test", scrapers: [new TestScraper({})] });
    }).toThrow();
  });
  it("should stop all queries when it gets destroyed", async () => {
    let QueriesConcurrency = 5;
    const agent = new TorrentAgent({ QueriesConcurrency });

    let queryCount = 0;
    let durationToDestroy = 100;
    let runTime = 10;
    agent.on("query_done", () => queryCount++);

    setTimeout(async () => {
      await agent.destroy();
    }, durationToDestroy);
    for (let i = 0; i < 50; i++) {
      agent.add({
        searchQuery: "Test",
        scrapers: [new TestScraper({ runTime })],
      });
    }
    await agent.onIdle();
    // Assuming that the agent will not complete all his queries.
    // The agent will start queries at t = 0s. After Δt = durationToDestroy it will be destroyed.
    // every query take Δtr = runTime to finish and the agent can run n = QueriesConcurrency
    // concurrently. so the queries that are executed should respect this equation
    // queryCount = n * (Δt / Δtr)
    expect(queryCount).toBe(
      Math.floor(QueriesConcurrency * (durationToDestroy / runTime))
    );
  });
});
