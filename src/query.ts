import { EventEmitter } from "events";
import { Scraper, Torrent, TorrentLink } from "./scrapers/scraper";
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
  destroyed: [];
}

export interface QueryOpts {
  concurrency: number;
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
  constructor(
    searchQuery: string,
    scrapers: Scraper[],
    opts: Partial<QueryOpts> = {}
  ) {
    super();
    this.searchQuery = searchQuery;
    this.scrapers = scrapers;
    this.isDestroyed = false;
    this.queue = new PQueue({
      concurrency: opts.concurrency || 5,
    });

    if (!searchQuery) {
      throw new QueryError("search query is required");
    }
    if (!scrapers.length) {
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
        links = await scraper.firstTouch();
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
      for (let link of links) {
        if (!this.queue) {
          this.emit("error", QueueDestroyedErr);
          throw QueueDestroyedErr;
        }
        this.queue.add(async () => {
          try {
            let torrent = await scraper.scrapeTorrent(link);
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
