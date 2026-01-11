import { EventEmitter } from "events";
import { Scraper, Torrent, TorrentLink } from "./scrapers/scraper.js";
import PQueue from "p-queue";
import { TorrentGalaxy } from "./scrapers/torrentGalaxy.js";
import { Browser } from "playwright";
import { ThePirateBay } from "./scrapers/thepiratebay.js";
import { Nyaa } from "./scrapers/nyaa.js";

export class QueryError extends Error {
  constructor(msg: string) {
    super();
    this.message = msg;
  }
}

export const DefaultScrapers: Scraper[] = [new TorrentGalaxy(), new Nyaa()];
export const ChromiumScrapers: Scraper[] = [new ThePirateBay()];

interface QueryEvents {
  error: [error: QueryError];
  torrent: [torrent: Torrent];
  done: [];
  destroyed: [];
}

export interface QueryOpts {
  concurrency: number;
  /** Max torrents per scraper. */
  limit: number;
  browser?: Browser;
  useChromiumScrapers?: boolean;
}

export const QueueDestroyedErr = new QueryError(
  "The queue is destroyed cannot run the query.\nThis error may be caused because the query is already destroyed."
);

export const QueryDestroyed = new QueryError(
  "The query is destroyed cannot run the query."
);

export default class Query extends EventEmitter<QueryEvents> {
  protected scrapers: Scraper[];
  protected searchQuery: string;
  protected queue: PQueue | null;
  protected isDestroyed: boolean;
  limit?: number;
  constructor(
    searchQuery: string,
    scrapers?: Scraper[],
    opts: Partial<QueryOpts> = {}
  ) {
    super();
    this.searchQuery = searchQuery;
    if (scrapers) {
      scrapers.forEach((s) => {
        s.browser = opts.browser;
      });
      this.scrapers = scrapers;
    } else {
      this.scrapers = DefaultScrapers;
      if (opts.useChromiumScrapers && opts.browser) {
        ChromiumScrapers.forEach((s) => {
          s.browser = opts.browser;
        });
        this.scrapers = [...this.scrapers, ...ChromiumScrapers];
      }
    }

    this.isDestroyed = false;
    this.limit = opts.limit;
    this.queue = new PQueue({
      concurrency: opts.concurrency || 5,
    });

    if (!searchQuery) {
      throw new QueryError("search query is required");
    }
    if (scrapers && !scrapers.length) {
      throw new QueryError("no scrapers are set");
    }
  }
  protected async getTorrents(scraper: Scraper) {
    if (!this.queue) {
      this.emit("error", QueueDestroyedErr);
      throw QueueDestroyedErr;
    }
    await this.queue.add(async () => {
      let links: TorrentLink[];
      try {
        links = await scraper.firstTouch(this.searchQuery, this.limit);
      } catch (err: any) {
        this.emit(
          "error",
          new QueryError(
            `error while scraping search page${
              err?.message ? ` : ${err.message}` : ""
            }`
          )
        );
        return;
      }
      if (!links) return;
      for (let i = 0; i < links.length; i++) {
        if (!this.queue) {
          this.emit("error", QueueDestroyedErr);
          throw QueueDestroyedErr;
        }
        this.queue.add(async () => {
          try {
            let torrent = await scraper.scrapeTorrent(links[i]);
            this.emit("torrent", torrent);
          } catch (err: any) {
            this.emit(
              "error",
              new QueryError(
                `error while scraping torrent page${
                  err?.message ? ` : ${err.message}` : ""
                }`
              )
            );
            return;
          }
        });
      }
    });
  }
  async run() {
    if (this.isDestroyed) {
      throw QueryDestroyed;
    }
    if (!this.queue) {
      this.emit("error", QueueDestroyedErr);
      throw QueueDestroyedErr;
    }
    for (let scraper of this.scrapers) {
      this.getTorrents(scraper);
    }
    await this.queue.onIdle();
    this.emit("done");
  }

  async destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    if (this.queue) {
      this.queue.pause();
      this.queue.clear();
      await this.queue.onIdle();
      this.queue = null;
    }
    this.emit("destroyed");
    this.removeAllListeners();
  }
}
