// Configuration file for Puppeteer.
// .puppeteerrc.cjs
const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer to be relative to the project root.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
