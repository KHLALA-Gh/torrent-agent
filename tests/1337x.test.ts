import nock from "nock";

import { Scraper1337x } from "../src/scrapers/1337x";
import { TorrentLink } from "../src/scrapers/scraper";

describe("Test the 1337x scraper", () => {
  nock.disableNetConnect(); // Block real requests
  nock("https://1337x.to")
    .get("/search/ubuntu/1/")
    .reply(
      200,
      `
        <table class="table-list">
          <tbody>
            <tr>
              <td class="name">
                <a>Icon</a>
                <a href="/torrent/123456/ubuntu-22-04">Ubuntu 22.04</a>
              </td>
              <td class="coll-2 seeds">81</td>
              <td class="coll-3 leeches">3</td>
              <td class="coll-4 size mob-user">77.0 MB</td>
              <td class="coll-5 user"><a href="/user/bookflare/">uploader</a></td>
            </tr>
          </tbody>
        </table>
      `
    );
  nock("https://1337x.to")
    .get("/torrent/123456/ubuntu-22-04/")
    .reply(
      200,
      `
        <a href="magnet:?xt=urn:btih:abcdef1234567890">Magnet Link</a>
        <div class="infohash-box"><span>ABCDEF1234567890</span></div>
        <a href="/download/123456.torrent">Download Torrent</a>
      `
    );
  it("should scrape the search page and return torrent links", async () => {
    const scraper = new Scraper1337x({ query: "ubuntu" });
    let result = await scraper.firstTouch();
    console.log(result);
    expect(result).toStrictEqual([
      {
        name: "Ubuntu 22.04",
        url: "https://1337x.to/torrent/123456/ubuntu-22-04/",
        seeders: 81,
        leechers: 3,
        provider: "1337x",
        size: "77.0 MB",
        uploader: "uploader",
      },
    ] as TorrentLink[]);
  });
  it("should scrape the torrent page and return the info hash", async () => {
    const scraper = new Scraper1337x({ query: "Ubuntu" });
    let result = await scraper.scrapeTorrent({
      name: "Ubuntu Linux Administration: Essential Commands",
      url: "https://1337x.to/torrent/123456/ubuntu-22-04/",
      seeders: 29,
      leechers: 3,
      provider: "1337x",
      size: "15",
      uploader: "uploader",
    });
    console.log(result);
    expect(result).toStrictEqual({
      magnetURI: "magnet:?xt=urn:btih:abcdef1234567890",
      infoHash: "ABCDEF1234567890",
      torrentDownload: "/download/123456.torrent",
      name: "Ubuntu Linux Administration: Essential Commands",
      url: "https://1337x.to/torrent/123456/ubuntu-22-04/",
      seeders: 29,
      leechers: 3,
      provider: "1337x",
      size: "15",
      uploader: "uploader",
    });
  });
});
