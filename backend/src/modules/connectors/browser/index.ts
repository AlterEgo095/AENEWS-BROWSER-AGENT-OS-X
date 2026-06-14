/**
 * AENEWS Agent OS X — Browser Connector Module Public API
 */

export { BrowserPoolService } from './browser-pool.service';
export { RealBrowserConnectorService } from './real-browser-connector.service';
export { BrowserConnectorModule } from './browser-connector.module';
export type { BrowserPoolConfig } from './browser-pool.service';
export type {
  BrowserResult,
  NavigationResult,
  ScreenshotResult,
  TextResult,
  LinksResult,
  ImagesResult,
  MetadataResult,
  TableResult,
  ScrapeResult,
  CookieResult,
  EvaluateResult,
} from './real-browser-connector.service';
