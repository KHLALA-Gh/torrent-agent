import Query, { QueryError, QueueDestroyedErr } from "../src/query";
import { TestScraper } from "../src/scrapers/scraper";

describe("Test Query", () => {
  it("should manage multiple scrapers and torrents events", async () => {
    let linksCount1 = 50;
    let linksCount2 = 15;
    let scraper1 = new TestScraper({ linksCount: linksCount1, runTime: 50 });
    let scraper2 = new TestScraper({ linksCount: linksCount2, runTime: 20 });
    let query = new Query("Test", [scraper1, scraper2], { concurrency: 5 });
    let tCount = 0;
    query.on("torrent", () => tCount++);
    await query.run();
    expect(tCount).toBe(linksCount1 + linksCount2);
  });
  it("should handle errors correctly", async () => {
    let linksCount1 = 50;
    let linksCount2 = 10;
    let scraper1 = new TestScraper({ linksCount: linksCount1, runTime: 5 });
    let scraper2 = new TestScraper({
      ErrorInFirstTouch: new Error("test error"),
      runTime: 10,
    });
    let scraper3 = new TestScraper({
      ErrorInScrapeTorrent: new Error("test error"),
      runTime: 10,
      linksCount: linksCount2,
    });
    let query = new Query("Test", [scraper1, scraper2, scraper3], {
      concurrency: 5,
    });
    let tCount = 0;
    let errorCount = 0;
    query.on("error", () => errorCount++);
    query.on("torrent", () => tCount++);
    await query.run();
    expect(tCount).toBe(linksCount1);
    // Check the number of expected errors
    // Scraper2 will emit one error because the error is thrown from the firstTouch funcion
    // while Scraper3 will emit n = linksCount2 errors because errors are thrown from the scrape
    // functions wich are called from a for loop that loop through all links and call scrapTorrent.
    expect(errorCount).toBe(linksCount2 + 1);
  });
  it("should be able to run() multiple times", async () => {
    let linksCount1 = 50;
    let linksCount2 = 15;
    let scraper1 = new TestScraper({ linksCount: linksCount1 });
    let scraper2 = new TestScraper({ linksCount: linksCount2 });
    let query = new Query("Test", [scraper1, scraper2], { concurrency: 5 });
    let tCount = 0;
    query.on("torrent", () => tCount++);
    let queryRunCount = 10;
    let taskArr: Promise<void>[] = [];
    for (let i = 0; i < queryRunCount; i++) {
      taskArr.push(query.run());
    }
    await Promise.all(taskArr);
    expect(tCount).toBe((linksCount1 + linksCount2) * 10);
  });
  it("should be destroyed correctly", async () => {
    let linksCount1 = 50;
    let linksCount2 = 15;
    let scraper1 = new TestScraper({ linksCount: linksCount1 });
    let scraper2 = new TestScraper({ linksCount: linksCount2 });
    let query = new Query("Test", [scraper1, scraper2], { concurrency: 5 });
    let tCount = 0;
    let destroyed = false;
    query.on("destroyed", () => {
      destroyed = true;
    });
    query.on("torrent", () => tCount++);
    await query.run();
    await query.destroy();
    expect(tCount).toBe(linksCount1 + linksCount2);
    expect(destroyed).toBe(true);
  });
});
