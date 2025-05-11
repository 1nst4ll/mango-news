const fs = require('fs').promises;
const path = require('path');

// Array to store URLs from the blacklist internally
let _urlBlacklist = [];

// Function to load the URL blacklist from a JSON file
async function loadUrlBlacklist() {
  const blacklistPath = path.join(__dirname, '../config/blacklist.json');
  try {
    const data = await fs.readFile(blacklistPath, 'utf8');
    _urlBlacklist = JSON.parse(data);
    console.log(`Loaded ${_urlBlacklist.length} URLs from blacklist.`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn('Blacklist file not found. Starting with an empty blacklist.');
      _urlBlacklist = []; // Start with an empty blacklist if the file doesn't exist
    } else {
      console.error('Error loading URL blacklist:', error);
      _urlBlacklist = []; // Ensure blacklist is empty on other errors
    }
  }
}

// Function to get the current URL blacklist
function getBlacklist() {
  return _urlBlacklist;
}

module.exports = {
  loadUrlBlacklist,
  getBlacklist, // Export the getter function
};
