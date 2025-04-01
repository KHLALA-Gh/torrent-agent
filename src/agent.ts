import { EventEmitter } from "events";
import Query, { QueryOpts } from "./query.js";
import PQueue from "p-queue";
import { Scraper } from "./scrapers/scraper.js";

interface AgentOpts {
  /**
   * Max queries that run at the same time.
   */
  QueriesConcurrency: number;
}

interface AgentEvents {
  query: [query: Query];
  query_done: [];
  destroyed: [];
}

interface AddQueryOpts {
  searchQuery: string;
  scrapers?: Scraper[];
  options?: QueryOpts;
}

export class AgentError extends Error {
  constructor(msg: string) {
    super(msg);
  }
}

export default class TorrentAgent extends EventEmitter<AgentEvents> {
  protected queue: PQueue | null;
  protected isDestroyed: boolean;
  constructor(opts: Partial<AgentOpts> = {}) {
    super();
    this.queue = new PQueue({
      concurrency: opts.QueriesConcurrency || 5,
    });
    this.isDestroyed = false;
  }
  add(opts: AddQueryOpts): Query {
    if (this.isDestroyed) {
      throw new AgentError("agent is destroyed cannot add new query");
    }
    if (!this.queue) {
      throw new AgentError("queue is destroyed cannot add a new query");
    }
    const query = new Query(opts.searchQuery, opts.scrapers, opts.options);
    this.queue.add(async () => {
      await query.run();
      await query.destroy();
      this.emit("query_done");
    });
    this.emit("query", query);
    return query;
  }
  /**
   * Clear the queue.
   */
  clear() {
    if (!this.queue) return;
    this.queue.clear();
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
  // Resolve when the agent is idling
  async onIdle() {
    return await this.queue?.onIdle();
  }
}
