import { EventEmitter } from "events";
import Query, { QueryOpts } from "./query";
import PQueue from "p-queue";
import { Scraper } from "./scrapers/scraper";

interface AgentOpts {
  /**
   * Max queries that run in the same time.
   */
  maxQueries: number;
}

interface AgentEvents {
  query: [query: Query];
}

interface AddQueryOpts {
  searchQuery: string;
  scrapers: Scraper[];
  options?: QueryOpts;
}

export default class TorrentAgent extends EventEmitter<AgentEvents> {
  protected queue: PQueue;
  constructor(opts: Partial<AgentOpts> = {}) {
    super();
    this.queue = new PQueue({ concurrency: opts.maxQueries || Infinity });
  }
  add(opts: AddQueryOpts): Query {
    const query = new Query(opts.searchQuery, opts.scrapers, opts.options);
    this.queue.add(async () => {
      await query.run();
    });
    this.emit("query", query);
    return query;
  }
  /**
   * Clear the queue.
   */
  clear() {
    this.queue.clear();
  }
}
