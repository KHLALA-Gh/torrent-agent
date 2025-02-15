export interface ScraperOpts {}

export interface Torrent {
  name: string;
  link: string;
  infoHash: string;
  peers: string;
  seeds: string;
}

export interface TorrentLink {
  provider: string;
  url: string;
}

export abstract class Scraper {
  constructor(opts: ScraperOpts) {}
  abstract firstTouch(): Promise<TorrentLink[]>;
  abstract scrapeTorrent(link: TorrentLink): Promise<Torrent>;
}
