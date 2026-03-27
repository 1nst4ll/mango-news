require('dotenv').config({ path: './.env' });
const { getPage, closePage } = require('./src/browserPool');

(async () => {
  const page = await getPage();
  try {
    await page.goto('https://www.newslinetci.com/post/saphora-grace-bay-launched', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    // Simulate the new scroll+wait
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 1500));

    const imgData = await page.evaluate(() => {
      return [...document.querySelectorAll('img[data-hook="gallery-item-image-img"]')].slice(0, 5).map(img => ({
        src: img.getAttribute('src') || '',
        srcset: img.getAttribute('srcset') || '',
      }));
    });

    console.log('Gallery images after scroll+wait:');
    imgData.forEach((img, i) => {
      console.log(`img[${i}] src: ${img.src.substring(0, 100)}`);
      if (img.srcset) console.log(`       srcset: ${img.srcset.substring(0, 100)}`);
    });
  } finally {
    await closePage(page);
    process.exit(0);
  }
})().catch(e => { console.error(e.message); process.exit(1); });
