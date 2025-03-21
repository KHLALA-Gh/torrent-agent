import axios from "axios";
import { Scraper, ScraperOpts, Torrent, TorrentLink } from "./scraper.js";
import { load } from "cheerio";

export class Scraper1337x extends Scraper {
  static firstTouchUrl = "https://1337x.to/search/:query/:page/";
  constructor(opts: ScraperOpts = {}) {
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
        Scraper1337x.firstTouchUrl
          .replace(":query", query || "")
          .replace(":page", page.toString())
      );

      const $ = load(data);
      let torrentCount = $(".table-list tbody tr").length;
      if (torrentCount === 0) {
        break;
      }
      $(".table-list tbody tr").each((i, el) => {
        if (results.length >= (limit || 20)) return;
        const name = $(el).find("td.name a").eq(1).text().trim();
        const url =
          "https://1337x.to" + $(el).find("td.name a").eq(1).attr("href");
        const seeders = $(el).find("td.seeds").text().trim();
        const size = $(el).find("td.size").text().trim();
        const uploader = $(el).find("td.user").text().trim();
        const leechers = $(el).find("td.leeches").text().trim();
        results.push({
          name,
          url,
          seeders: +seeders,
          leechers: +leechers,
          provider: "1337x",
          size,
          uploader,
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
