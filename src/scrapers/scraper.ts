export interface ScraperOpts {}

export interface Torrent {
  name: string;
  url: string;
  infoHash: string;
  leechers: number;
  seeders: number;
  provider: string;
  magnetURI?: string;
  torrentDownload?: string;
  size: string;
  uploader: string;
}

export interface TorrentLink {
  name: string;
  leechers: number;
  seeders: number;
  provider: string;
  url: string;
  size: string;
  uploader: string;
}

export abstract class Scraper {
  protected opts: ScraperOpts;
  constructor(opts: ScraperOpts = {}) {
    this.opts = opts;
  }
  abstract firstTouch(query: string, limit?: number): Promise<TorrentLink[]>;
  abstract scrapeTorrent(link: TorrentLink): Promise<Torrent>;
}

interface TestScraperOpts {
  linksCount: number;
  runTime: number;
  ErrorInFirstTouch: Error;
  ErrorInScrapeTorrent: Error;
  name: string;
}

export class TestScraper extends Scraper {
  linkCount: number;
  runTime: number;
  name: string;
  ErrorInFirstTouch?: Error;
  ErrorInScrapeTorrent?: Error;
  constructor(opts: ScraperOpts & Partial<TestScraperOpts>) {
    super({});
    this.linkCount = opts.linksCount || 0;
    this.runTime = opts.runTime || 0;
    this.name = opts.name || "Test Scraper";
    this.ErrorInFirstTouch = opts.ErrorInFirstTouch;
    this.ErrorInScrapeTorrent = opts.ErrorInScrapeTorrent;
  }
  async firstTouch(query: string, limit?: number): Promise<TorrentLink[]> {
    if (this.ErrorInFirstTouch) {
      throw this.ErrorInFirstTouch;
    }
    let links: TorrentLink[] = [];
    let linksNum =
      this.linkCount > (limit || 20) ? limit || 20 : this.linkCount;
    for (let i = 0; i < linksNum; i++) {
      //@ts-ignore
      links.push({ provider: this.name, url: `url_${i}` });
    }
    await new Promise((res) => setTimeout(res, this.runTime));
    return links;
  }
  async scrapeTorrent(link: TorrentLink): Promise<Torrent> {
    if (this.ErrorInScrapeTorrent) {
      throw this.ErrorInScrapeTorrent;
    }
    await new Promise((res) => setTimeout(res, this.runTime));

    return {
      name: "Test torrent",
      url: link.url,
      infoHash: "94d98a8c1s6q4d8zad45sq6dsq58",
      leechers: 50,
      seeders: 60,
      provider: this.name,
      size: "wa",
      uploader: "",
    };
  }
}
