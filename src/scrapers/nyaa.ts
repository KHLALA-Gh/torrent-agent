import axios from "axios";
import { Scraper, ScraperOpts, Torrent, TorrentLink } from "./scraper.js";
import { load } from "cheerio";

function extractInfoHash(magnetUri: string) {
  if (typeof magnetUri !== "string") return null;

  const match = magnetUri.match(/xt=urn:btih:([a-zA-Z0-9]+)/);
  return match ? match[1].toLowerCase() : null;
}

export class Nyaa extends Scraper {
  static homeUrl = "https://nyaa.si";
  static firstTouchUrl = "https://nyaa.si/?q=:query&p=:page";
  constructor(opts: ScraperOpts = { name: "Nyaa Scraper" }) {
    super(opts);
  }
  async firstTouch(query: string, limit?: number): Promise<TorrentLink[]> {
    if (!query) {
      throw new Error("search query is required to scrape");
    }

    let results: TorrentLink[] = [];
    let page = 1;
    while (results.length != (limit || 20)) {
      const { data } = await axios.get(
        Nyaa.firstTouchUrl
          .replace(":query", query || "")
          .replace(":page", page.toString()),
      );

      const $ = load(data);
      let torrentCount = $(
        ".container .table-responsive table tbody tr",
      ).length;
      if (torrentCount === 0) {
        break;
      }
      $(".container .table-responsive table tbody tr").each((i, el) => {
        if (results.length >= (limit || 20)) return;
        const tds = $(el).find("td");
        const name = tds.eq(1).find("a").text().trim();
        const url = new URL(
          tds.eq(1).find("a").attr("href") || "",
          Nyaa.homeUrl,
        );
        const magnetURI = tds.eq(2).find("a").eq(1).attr("href");
        const size = tds.eq(3).text().trim();
        const seeders = tds.eq(5).text().trim();
        const leechers = tds.eq(6).text().trim();
        results.push({
          name,
          url: url.href,
          seeders: +seeders,
          leechers: +leechers,
          provider: "nyaa",
          size,
          magnetURI,
          infoHash: extractInfoHash(magnetURI || "") || "",
        });
      });
      page++;
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
