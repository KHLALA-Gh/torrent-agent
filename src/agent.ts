import { EventEmitter } from "events";
import Query from "./query";
import PQueue, { Queue } from "p-queue";
import { Scraper } from "./scrapers/scraper";

interface AgentOpts {
  /**
   * Max queries that runs in the same time.
   */
  maxQueries: number;
}

interface AgentEvents {
  query: [query: Query];
}

export default class TorrentAgent extends EventEmitter<AgentEvents> {
  protected queue: PQueue;
  constructor(opts: Partial<AgentOpts> = {}) {
    super();
    this.queue = new PQueue({ concurrency: opts.maxQueries });
  }
  add(searchQuery: string, scrapers: Scraper[]): Query {
    const query = new Query(searchQuery, scrapers);
    this.queue.add(() => {
      query.run();
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
