import axios from "axios";
import { Scraper, ScraperOpts, Torrent, TorrentLink } from "./scraper.js";
import { load } from "cheerio";
import { Browser, chromium } from "playwright";
function extractInfoHash(magnetUri: string) {
  if (typeof magnetUri !== "string") return null;

  const match = magnetUri.match(/xt=urn:btih:([a-zA-Z0-9]+)/);
  return match ? match[1].toLowerCase() : null;
}

export class ThePirateBay extends Scraper {
  static homeUrl = "https://thepiratebay.org";
  static firstTouchUrl = "https://thepiratebay.org/search.php?q=:query";
  browser?: Browser;
  constructor(opts: ScraperOpts = {}) {
    super(opts);
    if (opts.browser) {
      this.browser = this.browser;
    }
  }
  async firstTouch(query: string, limit?: number): Promise<TorrentLink[]> {
    if (!query) {
      throw new Error("search query is required to scrape");
    }
    if (!this.browser) throw new Error("browser is not created");
    let results: TorrentLink[] = [];
    let p = 1;
    while (results.length != (limit || 20)) {
      const page = await this.browser.newPage();

      await page.goto(
        ThePirateBay.firstTouchUrl
          .replace(":query", query || "")
          .replace(":page", page.toString()),
        {
          waitUntil: "networkidle",
        }
      );

      const data = await page.content();
      const $ = load(data);
      let torrents = $("li.list-entry");

      if (torrents.length - 1 <= 0) {
        break;
      }
      torrents.each((i, el) => {
        if (i == 0) return;
        if (results.length >= (limit || 20)) return;
        const span = $(el).find("span");
        const name = span.eq(1).find("a").text().trim();
        const url = new URL(
          span.eq(1).find("a").attr("href") || "",
          ThePirateBay.homeUrl
        );
        const magnetURI = span.eq(3).find("a").eq(0).attr("href");
        const size = span.eq(4).text().trim();
        const seeders = span.eq(5).text().trim();
        const leechers = span.eq(6).text().trim();
        results.push({
          name,
          url: url.href,
          seeders: +seeders,
          leechers: +leechers,
          provider: "thepiratebay",
          size,
          magnetURI,
          infoHash: extractInfoHash(magnetURI || "") || "",
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
    if (!link.infoHash)
      throw new Error("not valid link (info hash doesn't exist)");
    if (!link.magnetURI)
      throw new Error("not valid link (info hash doesn't exist)");
    return { infoHash: link.infoHash, magnetURI: link.magnetURI, ...link };
  }
}
