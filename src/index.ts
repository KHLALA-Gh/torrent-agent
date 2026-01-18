import TorrentAgent from "./agent.js";
import Query from "./query.js";
import { Scraper } from "./scrapers/scraper.js";
import { Scraper1337x } from "./scrapers/1337x.js";
import { Nyaa } from "./scrapers/nyaa.js";
import { TorrentGalaxy } from "./scrapers/torrentGalaxy.js";
import { ThePirateBay } from "./scrapers/thepiratebay.js";

export { Scraper, Query, Scraper1337x, Nyaa, TorrentGalaxy, ThePirateBay };
export default TorrentAgent;
