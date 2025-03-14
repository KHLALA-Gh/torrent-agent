import axios from "axios";
import { Scraper, ScraperOpts, Torrent, TorrentLink } from "./scraper";
import { load } from "cheerio";

export class Scraper1337x extends Scraper {
  static firstTouchUrl = "https://1337x.to/search/:query/1/";
  constructor(opts: ScraperOpts = {}) {
    super(opts);
  }
  async firstTouch(): Promise<TorrentLink[]> {
    const { data } = await axios.get(
      Scraper1337x.firstTouchUrl.replace(":query", this.opts.query || "")
    );

    const $ = load(data);

    let results: TorrentLink[] = [];
    $(".table-list tbody tr").each((i, el) => {
      const name = $(el).find("td.name a").eq(1).text().trim();
      const url =
        "https://1337x.to" + $(el).find("td.name a").eq(1).attr("href") + "/";
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
    return results;
  }
  async scrapeTorrent(link: TorrentLink): Promise<Torrent> {
    const { data } = await axios.get(link.url);

    const $ = load(data);

    const magnetURI = $("a[href^='magnet:?']").attr("href");
    const infoHash = $(".infohash-box span").text().trim();
    const torrentDownload = $("a[href$='.torrent']").attr("href");

    return { magnetURI, infoHash, torrentDownload, ...link };
  }
}
