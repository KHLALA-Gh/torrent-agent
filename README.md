<div align="center">
<img src="./imgs/logo.png" width="128"/>
<h1 align="center">Torrent Agent</h1>
</div>

Torrent Agent is an npm library for searching torrents from torrent sites like 1337x, YTS, etc. It can run multiple queries concurrently and manage multiple scrapers that looks for torrents from differente providers in the same time.

## How to use it

```shell
$ npm i torrent-agent
```

create a js file and import the library.

example :

```js
import TorrentAgent from "torrent-agent";

const agent = new TorrentAgent();

let query = agent.add({
  searchQuery: "Ubuntu",
  options: {
    limit: 20,
    concurrency: 5,
  },
});

// Listen for torrents
query.on("torrent", (torrent) => {
  console.log(torrent);
});
// Listen for errors
query.on("error", (e) => {
  console.log(e);
});
// Listen for query completion
query.on("done", () => {
  console.log("done");
});
```

#### Default scrapers :

- 1337x.to

> More scrapers will be available soon

#### Custom scrapers

You can create your own custom scrapers that scrape from any site.
The custom scraper need to extend from the scraper abstract class.

```js
class CustomScraper extends Scraper {
  constructor(opts: ScraperOpts) {
    super(opts);
  }
  async firstTouch(query: string, limit?: number): Promise<TorrentLink[]> {
    // search page scraping logic
  }
  async scrapeTorrent(link: TorrentLink): Promise<Torrent> {
    // torrent page scraping logic
  }
}

// then create the agent
const agent = new TorrentAgent();
// use your custom scraper in your query
let query = agent.add({
  searchQuery: "Ubuntu",
  options: {
    limit: 20,
    concurrency: 10,
  },
  scrapers: [new CustomScraper()],
});
query.on("torrent", (t) => {
  console.log(t);
});
```
