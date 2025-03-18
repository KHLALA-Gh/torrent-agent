<div align="center">
<img src="./imgs/logo.png" width="128"/>
<h1 align="center">Torrent Agent</h1>
</div>

Torrent Agent is an npm library for searching torrents from torrent sites like 1337x, YTS, etc. It can run multiple queries concurrently and manage multiple scrapers that looks for torrents from differente providers in the same time.

## How to use it

Torrent agent is still in development and it's not actually available in npm, but you can clone it
manually.

```shell
$ npm i
$ tsc
```

create a js file and import the library.

example :

```js
import TorrentAgent from "./dist/index.js";

const agent = new TorrentAgent();

let q = agent.add({
  searchQuery: "Ubuntu",
  options: {
    limit: 20,
    concurrency: 10,
  },
});

// Listen for torrents
q.on("torrent", (t) => {
  console.log(t);
});
// Listen for errors
q.on("error", (e) => {
  console.log(e);
});
// Listen for query completion
q.on("done", () => {
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
