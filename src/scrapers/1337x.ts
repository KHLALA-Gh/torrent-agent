import axios from "axios";
import { Scraper, ScraperOpts, Torrent, TorrentLink } from "./scraper.js";
import { load } from "cheerio";

export class Scraper1337x extends Scraper {
  static firstTouchUrl = "https://1337x.pro/search";
  constructor(opts: ScraperOpts = { name: "1337x Scraper" }) {
    super(opts);
    this.browser = opts.browser;
  }

  async firstTouch(query: string, limit?: number): Promise<TorrentLink[]> {
    if (!query) {
      throw new Error("search query is required to scrape");
    }

    let results: TorrentLink[] = [];
    let p = 1;

    while (results.length != (limit || 20)) {
      const url = new URL(Scraper1337x.firstTouchUrl);
      url.searchParams.set("q", query);
      url.searchParams.set("page", p.toString());
      const { data } = await axios.get(url.href);

      const $ = load(data);
      let torrentCount = $(".table-list tbody tr").length;
      if (torrentCount === 0) {
        break;
      }
      $(".table-list tbody tr").each((i, el) => {
        if (results.length >= (limit || 20)) return;
        const name = $(el).find("td.name a").eq(1).text().trim();
        const urlPath = $(el).find("td.name a").eq(1).attr("href");
        if (!urlPath) return;
        const url = new URL(urlPath, Scraper1337x.firstTouchUrl);
        const seeders = $(el).find("td.seeds").text().trim();
        const size = $(el).find("td.size").text().trim();
        const uploader = $(el).find("td").eq(5).text().trim();
        const leechers = $(el).find("td.leeches").text().trim();
        results.push({
          name,
          url: url.href,
          seeders: +seeders,
          leechers: +leechers,
          provider: "1337x",
          size,
          uploader,
        });
      });
      p++;
    }
    return results;
  }
  async scrapeTorrent(link: TorrentLink): Promise<Torrent> {
    if (!link.url) {
      throw new Error("url is required in the torrent link");
    }
    const { data } = await axios.get(link.url);

    const $ = load(data);

    const text = $(".box-info").text().trim().replace(/\s+/g, " ");
    const infoHashMatch = text.match(/info\s*hash\s*:\s*([a-fA-F0-9]+)/i);
    if (!infoHashMatch || infoHashMatch?.length == 0)
      throw Error("cant get info hash");

    return { infoHash: infoHashMatch[1], ...link };
  }
}
