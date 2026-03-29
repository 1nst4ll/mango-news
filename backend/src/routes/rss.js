const express = require('express');
const router = express.Router();
const RSS = require('rss');
const { marked } = require('marked');
const { pool } = require('../db');

router.get('/', async (req, res) => {
  const endpoint = '/api/rss';
  try {
    const articlesResult = await pool.query(`
      SELECT
          a.id, a.title, a.source_url, a.publication_date,
          a.summary AS ai_summary, a.ai_image_path AS ai_image_url,
          a.thumbnail_url, s.name AS source_name
      FROM articles a
      JOIN sources s ON a.source_id = s.id
      WHERE a.is_blocked = FALSE
      ORDER BY a.publication_date DESC
      LIMIT 20
    `);

    const siteUrl = process.env.SITE_URL || 'https://mango.tc';
    const feed = new RSS({
      title: 'Mango News Feed',
      description: 'Latest news from Turks and Caicos Islands',
      feed_url: `${siteUrl}/api/rss`,
      site_url: siteUrl,
      language: 'en-us',
      ttl: 60,
    });

    for (const article of articlesResult.rows) {
      let descriptionHtml = article.ai_summary ? marked.parse(article.ai_summary) : '<p>No summary available.</p>';
      const imageUrl = article.ai_image_url || article.thumbnail_url;
      if (imageUrl) {
        descriptionHtml = `<img src="${imageUrl}" alt="${article.title}" style="max-width: 100%; height: auto;"><br/>` + descriptionHtml;
      }
      feed.item({
        title: article.title,
        url: `${siteUrl}/article/${article.id}`,
        date: article.publication_date,
        description: descriptionHtml,
        guid: article.source_url,
        author: article.source_name,
      });
    }

    console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - RSS feed generated with ${articlesResult.rows.length} items.`);
    res.set('Content-Type', 'application/rss+xml');
    res.send(feed.xml());

  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - GET ${endpoint} - Error:`, err);
    if (err.code === '42P01') {
       const siteUrlFallback = process.env.SITE_URL || 'https://mango.tc';
       const emptyFeed = new RSS({
         title: 'Mango News Feed',
         description: 'Latest news from Turks and Caicos Islands',
         feed_url: `${siteUrlFallback}/api/rss`,
         site_url: siteUrlFallback,
         language: 'en-us',
         ttl: 60,
       });
       res.set('Content-Type', 'application/rss+xml');
       res.send(emptyFeed.xml());
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

module.exports = router;
