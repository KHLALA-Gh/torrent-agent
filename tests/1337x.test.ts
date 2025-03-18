import nock from "nock";

import { Scraper1337x } from "../src/scrapers/1337x";
import { TorrentLink } from "../src/scrapers/scraper";

describe("Test the 1337x scraper", () => {
  beforeEach(() => {
    nock.disableNetConnect();
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
                <a href="/torrent/123456/ubuntu-22-04/">Ubuntu 22.04</a>
              </td>
              <td class="coll-2 seeds">81</td>
              <td class="coll-3 leeches">3</td>
              <td class="coll-4 size mob-user">77.0 MB</td>
              <td class="coll-5 user"><a href="">uploader</a></td>
            </tr>
            <tr>
              <td class="name">
                <a>Icon</a>
                <a href="/torrent/123456/ubuntu-20-04/">Ubuntu 20.04</a>
              </td>
              <td class="coll-2 seeds">70</td>
              <td class="coll-3 leeches">3</td>
              <td class="coll-4 size mob-user">70.0 MB</td>
              <td class="coll-5 user"><a href="">uploader</a></td>
            </tr>
          </tbody>
        </table>
      `
      );
    nock("https://1337x.to")
      .get("/search/ubuntu/2/")
      .reply(
        200,
        `
        <table class="table-list">
          <tbody>
           
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
    nock("https://1337x.to")
      .get("/torrent/123456/ubuntu-20-04/")
      .reply(
        200,
        `
        <a href="magnet:?xt=urn:btih:abcdef1234567891">Magnet Link</a>
        <div class="infohash-box"><span>ABCDEF1234567891</span></div>
        <a href="/download/123456.torrent">Download Torrent</a>
      `
      );
  });
  afterEach(() => {
    nock.cleanAll();
  });
  it("should scrape the search page and return torrent links", async () => {
    const scraper = new Scraper1337x();
    let result = await scraper.firstTouch("ubuntu");
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
      {
        leechers: 3,
        name: "Ubuntu 20.04",
        provider: "1337x",
        seeders: 70,
        size: "70.0 MB",
        uploader: "uploader",
        url: "https://1337x.to/torrent/123456/ubuntu-20-04/",
      },
    ] as TorrentLink[]);
  });
  it("should scrape the torrent page and return the info hash", async () => {
    const scraper = new Scraper1337x();
    let result = await scraper.scrapeTorrent({
      name: "Ubuntu Linux Administration: Essential Commands",
      url: "https://1337x.to/torrent/123456/ubuntu-22-04/",
      seeders: 29,
      leechers: 3,
      provider: "1337x",
      size: "15",
      uploader: "uploader",
    });
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
  it("should throw an error if the search query is not defined or empty", () => {
    let scraper = new Scraper1337x();
    expect(async () => {
      await scraper.firstTouch("");
    }).rejects.toThrow(Error);
  });
  it("scrape torrent page should return an error if the url is empty", async () => {
    const scraper = new Scraper1337x({ query: "Ubuntu" });

    expect(async () => {
      await scraper.scrapeTorrent({
        name: "Ubuntu Linux Administration: Essential Commands",
        url: "",
        seeders: 29,
        leechers: 3,
        provider: "1337x",
        size: "15",
        uploader: "uploader",
      });
    }).rejects.toThrow(Error);
  });
  it("should respect the limit", async () => {
    const scraper = new Scraper1337x();
    let result = await scraper.firstTouch("ubuntu", 1);
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
});
