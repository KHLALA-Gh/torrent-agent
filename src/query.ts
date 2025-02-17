import { EventEmitter } from "events";
import { Scraper, Torrent } from "./scrapers/scraper";
import PQueue from "p-queue";

export class QueryError extends Error {
  constructor(msg: string) {
    super();
    this.message = msg;
  }
}

interface QueryEvents {
  error: [error: QueryError];
  torrent: [torrent: Torrent];
  done: [];
}

export interface QueryOpts {
  concurrency: number;
}

export default class Query extends EventEmitter<QueryEvents> {
  protected scrapers: Scraper[];
  protected searchQuery: string;
  protected queue: PQueue;
  constructor(
    searchQuery: string,
    scrapers: Scraper[],
    opts: Partial<QueryOpts> = {}
  ) {
    super();
    this.searchQuery = searchQuery;
    this.scrapers = scrapers;
    this.queue = new PQueue({
      concurrency: opts.concurrency || 5,
    });

    if (!searchQuery) {
      this.emit("error", new QueryError("search query is required"));
      return;
    }
    if (!scrapers.length) {
      this.emit("error", new QueryError("no scrapers are set"));
      return;
    }
  }
  private async getTorrents(scraper: Scraper) {
    let links = await this.queue.add(async () => {
      return await scraper.firstTouch();
    });
    if (!links) return;
    for (let link of links) {
      (async () => {
        let torrent = await this.queue.add(async () => {
          return await scraper.scrapeTorrent(link);
        });
        if (!torrent) return;
        this.emit("torrent", torrent);
      })();
    }
  }
  async run() {
    for (let scraper of this.scrapers) {
      this.getTorrents(scraper);
    }
    await this.queue.onIdle();

    this.emit("done");
  }
}
