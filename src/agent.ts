import { EventEmitter } from "events";
import Query, { QueryOpts } from "./query.js";
import PQueue from "p-queue";
import { Scraper } from "./scrapers/scraper.js";
import { chromium } from "playwright-extra";
import { Browser } from "playwright";
import stealth from "puppeteer-extra-plugin-stealth";
chromium.use(stealth());
interface AgentOpts {
  /**
   * Max queries that run at the same time.
   */
  QueriesConcurrency: number;
  allowChromiumScrapers: boolean;
  /**
   * Request timeout for fetching web page (ms).
   */
  fetchTimeOut: number;
}

interface AgentEvents {
  query: [query: Query];
  query_done: [];
  destroyed: [];
  browser: [browser: Browser];
  browser_error: [err: any];
}

interface AddQueryOpts {
  searchQuery: string;
  scrapers?: Scraper[];
  options?: QueryOpts;
  useChromium?: boolean;
}

export class AgentError extends Error {
  constructor(msg: string) {
    super(msg);
  }
}

export const defaultQueryConfigs: QueryOpts = {
  limit: 10,
  concurrency: 5,
  fetchTimeOut: 30 * 1000,
};

export default class TorrentAgent extends EventEmitter<AgentEvents> {
  protected queue: PQueue | null;
  protected isDestroyed: boolean;
  browser?: Browser;
  opts: Partial<AgentOpts>;
  constructor(opts: Partial<AgentOpts> = {}) {
    super();
    this.queue = new PQueue({
      concurrency: opts.QueriesConcurrency || 5,
    });
    this.isDestroyed = false;
    this.opts = opts;
    if (opts.allowChromiumScrapers) {
      (async () => {
        try {
          this.browser = await chromium.launch();
          this.emit("browser", this.browser);
        } catch (err) {
          this.emit("browser_error", err);
        }
      })();
    }
  }
  async add(opts: AddQueryOpts): Promise<Query> {
    if (this.isDestroyed) {
      throw new AgentError("agent is destroyed cannot add new query");
    }
    if (!this.queue) {
      throw new AgentError("queue is destroyed cannot add a new query");
    }

    let options: QueryOpts = {
      ...defaultQueryConfigs,
      ...opts.options,
      useChromiumScrapers:
        opts.options?.useChromiumScrapers === false
          ? false
          : this.opts.allowChromiumScrapers,
    };

    if (this.opts.allowChromiumScrapers) {
      if (!this.browser) {
        await new Promise((res, rej) => {
          this.once("browser", (browser) => {
            //@ts-ignore
            options.browser = browser;
            res(0);
          });
          this.once("browser_error", rej);
        });
      } else {
        options.browser = this.browser;
      }
    }

    const query = new Query(opts.searchQuery, opts.scrapers, options);
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
