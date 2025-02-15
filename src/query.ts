import { EventEmitter } from "stream";
import { Scraper, Torrent } from "./scrapers/scraper";

export class QueryError extends Error {
  constructor(msg: string) {
    super();
    this.message = msg;
  }
}

interface QueryEvents {
  error: [error: QueryError];
  torrent: [torrent: Torrent];
}

export default class Query extends EventEmitter<QueryEvents> {
  protected scrapers: Scraper[];
  protected searchQuery: string;
  constructor(searchQuery: string, scrapers: Scraper[]) {
    super();
    this.searchQuery = searchQuery;
    this.scrapers = scrapers;
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
    let links = await scraper.firstTouch();
    for (let link of links) {
      (async () => {
        let torrent = await scraper.scrapeTorrent(link);
        this.emit("torrent", torrent);
      })();
    }
  }
  run() {
    for (let scraper of this.scrapers) {
      this.getTorrents(scraper);
    }
  }
}
