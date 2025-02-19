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
    await expect(query.run).rejects.toThrow();
  });
  it("should stop when destroy is called", async () => {
    // This test focuses on the expected behavior of the query when it is
    // destroyed while performing tasks.
    let linksCount1 = 50;
    let scraper1 = new TestScraper({ linksCount: linksCount1, runTime: 50 });
    let concurrency = 10;
    let query = new Query("Test", [scraper1], { concurrency });
    // destroy the query after 100ms.
    setTimeout(async () => {
      await query.destroy();
    }, 100);
    let tCount = 0;
    query.on("torrent", () => tCount++);
    await query.run();
    // Torrents that will be returned should equal to the concurrency size
    // because the query will be destroyed in 100ms after calling query.run()
    // the first touch will take 50ms to complete and scrape torrent will also take 50ms
    // to complete. so only the first batch will be executed that means the torrent count
    // will be the same as concurrency (batch size).
    expect(tCount).toBe(concurrency);

    let scraper2 = new TestScraper({ linksCount: linksCount1, runTime: 25 });
    let query1 = new Query("Test", [scraper2], { concurrency });
    setTimeout(async () => {
      await query1.destroy();
    }, 100);
    let tCount1 = 0;
    query1.on("torrent", () => tCount1++);
    await query1.run();
    // In this second test the scraper will take 25ms in every scrape.
    // the query will be destroyed after 100ms. First the scraper will scrape the search page
    // which will take 25ms so 75ms are left, then it will scrape the returned links
    // the scrape functions will be called concurrently respecting the concurrency size.
    // each batch of scrape torrent functions will take 25ms to be executed. That means three
    // batches will be executed (75ms = 25ms * 3). So the torrent count will be concurrency*3 (batch size * 3)
    expect(tCount1).toBe(concurrency * 3);
  });
  it("throw an error if run() is called after the query is destroyed", async () => {
    let scraper1 = new TestScraper({});
    let query = new Query("Test Query", [scraper1]);
    await query.destroy();
    await expect(query.run()).rejects.toThrow();
  });
  it("should not emit events after destruction", async () => {
    let scraper = new TestScraper({ linksCount: 50, runTime: 10 });
    let query = new Query("Test", [scraper], { concurrency: 5 });

    let eventFired = false;
    query.on("torrent", () => (eventFired = true));

    await query.destroy();

    query.emit("done");
    expect(eventFired).toBe(false);
  });
  it("should throw when scrapers are empty", async () => {
    let fn = () => {
      new Query("Test", [], { concurrency: 5 });
    };
    expect(fn).toThrow(QueryError);
  });
  it("should throw when search query is empty", async () => {
    let fn = () => {
      new Query("", [new TestScraper({})], { concurrency: 5 });
    };
    expect(fn).toThrow(QueryError);
  });
});
