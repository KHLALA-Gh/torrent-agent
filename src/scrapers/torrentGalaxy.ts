import axios from "axios";
import { Scraper, ScraperOpts, Torrent, TorrentLink } from "./scraper.js";
import { load } from "cheerio";

export class TorrentGalaxy extends Scraper {
  static firstTouchUrl =
    "https://torrentgalaxy.hair/lmsearch?q=:query&category=lmsearch&page=:page";
  constructor(opts: ScraperOpts = { name: "TorrentGalaxy" }) {
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
        TorrentGalaxy.firstTouchUrl
          .replace(":query", query || "")
          .replace(":page", page.toString()),
      );

      const $ = load(data);
      let torrentCount = $(".table-list-wrap tbody tr").length;
      if (torrentCount === 0) {
        break;
      }
      $(".table-list-wrap tbody tr").each((i, el) => {
        if (results.length >= (limit || 20)) return;
        const name = $(el).find("td .tt-name a").eq(0).text().trim();
        const url =
          "https://torrentgalaxy.hair" +
          $(el).find("td .tt-name a").eq(0).attr("href");
        const tds = $(el).find("td");
        const size = $(tds[2]).text().trim();
        const seeders = $(tds[3]).text().trim();
        const leechers = $(tds[4]).text().trim();
        results.push({
          name,
          url,
          seeders: +seeders,
          leechers: +leechers,
          provider: "TGx",
          size,
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
    const { data } = await axios.get(link.url);

    const $ = load(data);

    const magnetURI = $("a[href^='magnet:?']").attr("href");
    const infoHash = $(".infohash-box span").text().trim();
    const torrentDownload = $("a[href$='.torrent']").attr("href");

    return { magnetURI, infoHash, torrentDownload, ...link };
  }
}
