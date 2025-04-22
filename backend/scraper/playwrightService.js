/**
 * PlaywrightService
 * Wrapper around PlaywrightManager for easier integration with scraper service
 */

const PlaywrightManager = require('./improvedPlaywright');

class PlaywrightService extends PlaywrightManager {
  constructor() {
    super();
    this.initialized = false;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    if (!this.initialized) {
      await this.initBrowsers(['chromium']);
      this.initialized = true;
    }
  }

  /**
   * Get a browser page for scraping
   * @param {Object} options - Browser options
   * @returns {Promise<Object>} - Browser page and context
   */
  async getPage(options = {}) {
    await this.initialize();
    
    const browserType = options.browserType || 'chromium';
    const context = await this.getBrowserContext(browserType, options);
    const page = await this.newOptimizedPage(context, options);
    
    return { page, context };
  }

  /**
   * Navigate to a URL with retry logic
   * @param {Object} page - Browser page
   * @param {string} url - URL to navigate to
   * @param {Object} options - Navigation options
   * @returns {Promise<Object>} - Navigation response
   */
  async navigateTo(page, url, options = {}) {
    return this.navigateWithRetries(page, url, options);
  }

  /**
   * Handle common popups and consent dialogs
   * @param {Object} page - Browser page
   */
  async handlePopups(page) {
    return this.handlePopupsAndConsent(page);
  }

  /**
   * Close all browser instances
   */
  async close() {
    for (const browserType in this.browsers) {
      if (this.browsers[browserType]) {
        await this.browsers[browserType].close();
        this.browsers[browserType] = null;
      }
    }
    this.initialized = false;
  }
}

module.exports = PlaywrightService;