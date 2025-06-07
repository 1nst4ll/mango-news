require('dotenv').config({ path: __dirname + '/.env' });
const { Pool } = require('pg');

console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASSWORD),
  port: process.env.DB_PORT
});

const sanitizeHtml = (htmlString) => {
  // Remove entire <figure> tags and their content first.
  let sanitizedContent = htmlString.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, '');

  // Remove <br> tags
  sanitizedContent = sanitizedContent.replace(/<br\b[^>]*>/gi, '');

  // Remove any existing <p> tags to prevent double wrapping
  // sanitizedContent = sanitizedContent.replace(/<\/?p[^>]*>/gi, '');

  // Remove all attributes from all tags, except for href and rel in <a> tags, and src in <img> tags.
  sanitizedContent = sanitizedContent.replace(/<(\w+)(?:\s+([^>]*))?>/gi, (match, tagName, attributes) => {
    if (tagName.toLowerCase() === 'a' && attributes) {
      // For <a> tags, keep href and rel attributes
      const hrefMatch = attributes.match(/href="([^"]*)"/i);
      const relMatch = attributes.match(/rel="([^"]*)"/i);
      let cleanedAttributes = '';
      if (hrefMatch) {
        cleanedAttributes += ` href="${hrefMatch[1]}"`;
      }
      if (relMatch) {
        cleanedAttributes += ` rel="${relMatch[1]}"`;
      }
      return `<${tagName}${cleanedAttributes}>`;
    } else if (tagName.toLowerCase() === 'img' && attributes) {
      // For <img> tags, keep src attribute
      const srcMatch = attributes.match(/src="([^"]*)"/i);
      let cleanedAttributes = '';
      if (srcMatch) {
        cleanedAttributes += ` src="${srcMatch[1]}"`;
      }
      return `<${tagName}${cleanedAttributes}>`;
    }
    else {
      // For all other tags, remove all attributes
      return `<${tagName}>`;
    }
  });

  // Remove <span> tags, keeping their inner content
  sanitizedContent = sanitizedContent.replace(/<\/?span[^>]*>/gi, '');

  // Remove <strong> tags, keeping their inner content
  sanitizedContent = sanitizedContent.replace(/<\/?strong[^>]*>/gi, '');

  // Remove all <div> tags, keeping their inner content
  sanitizedContent = sanitizedContent.replace(/<\/?div[^>]*>/gi, '');

  // Remove <tbody> and <table> tags, keeping their inner content
  sanitizedContent = sanitizedContent.replace(/<\/?tbody[^>]*>/gi, '');
  sanitizedContent = sanitizedContent.replace(/<\/?table[^>]*>/gi, '');

  // Replace multiple spaces with a newline, which will then be wrapped in <p> tags
  sanitizedContent = sanitizedContent.replace(/\s{2,}/g, '\n');

  // Remove empty tags (e.g., <p></p>)
  // This loop will run multiple times to catch nested empty tags.
  let oldContent;
  do {
    oldContent = sanitizedContent;
    // Regex to match any empty HTML tag, including those with whitespace/newlines between opening and closing tags
    sanitizedContent = sanitizedContent.replace(/<(\w+)\s*>\s*<\/\1>/gi, '');
  } while (sanitizedContent !== oldContent);

  // Replace &nbsp;</p><p> with a single space
  sanitizedContent = sanitizedContent.replace(/&nbsp;<\/p>\n<p>/g, ' ');

  // Remove multiple consecutive &nbsp;
  sanitizedContent = sanitizedContent.replace(/(?:&nbsp; ){2,}/g, '');

  // Split content by newlines and wrap each non-empty line in <p> tags
  let lines = sanitizedContent.split('\n').filter(line => line.trim() !== '');
  sanitizedContent = lines.map(line => `<p>${line.trim()}</p>`).join('\n');

  // Remove multiple consecutive <p> tags (should be less necessary now but good for robustness)
  //sanitizedContent = sanitizedContent.replace(/<p>\s*<p>/g, '<p>');
  //sanitizedContent = sanitizedContent.replace(/<\/p>\s*<\/p>/g, '</p>');

  return sanitizedContent;
};

const sanitizeContent = async (articleId = null) => {
  try {
    console.log('Connecting to the database...');
    const client = await pool.connect();
    console.log('Connected to the database.');

    const contentFields = [
      'raw_content',
      'raw_content_es',
      'raw_content_ht'
    ];

    let totalArticlesProcessed = 0;
    let totalArticlesUpdated = 0;

    let articlesResult;
    if (articleId) {
      articlesResult = await client.query(
        `SELECT id, raw_content, raw_content_es, raw_content_ht FROM articles WHERE id = $1`,
        [articleId]
      );
      console.log(`Found ${articlesResult.rows.length} article(s) for ID: ${articleId}.`);
    } else {
      articlesResult = await client.query(
        `SELECT id, raw_content, raw_content_es, raw_content_ht FROM articles`
      );
      console.log(`Found ${articlesResult.rows.length} articles in total.`);
    }

    const articles = articlesResult.rows;

    for (const article of articles) {
      let updated = false;
      const updateValues = [];
      const updateFields = [];
      let paramIndex = 1;

      for (const field of contentFields) {
        if (article[field]) {
          const originalContent = article[field];
          const newContent = sanitizeHtml(originalContent);

          if (newContent !== originalContent) { // Only update if content actually changed
            updateFields.push(`${field} = $${paramIndex++}`);
            updateValues.push(newContent);
            updated = true;
          }
        }
      }

      if (updated) {
        updateValues.push(article.id); // Add article ID for WHERE clause
        const updateQuery = `UPDATE articles SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`;
        await client.query(updateQuery, updateValues);
        totalArticlesUpdated++;
        console.log(`  Updated article ID: ${article.id}`);
      }
      totalArticlesProcessed++;
    }

    console.log(`Processed ${totalArticlesProcessed} articles. Updated ${totalArticlesUpdated} articles.`);

    client.release();
    console.log('Database connection closed.');
  } catch (err) {
    console.error('Error during database operation:', err);
  }
};

const arg = process.argv[2];

if (arg === '--all') {
  sanitizeContent(); // Process all articles
} else if (arg) {
  const articleId = parseInt(arg, 10);
  if (!isNaN(articleId)) {
    sanitizeContent(articleId); // Process a specific article ID
  } else {
    console.error('Invalid argument. Please provide an article ID or "--all".');
    process.exit(1);
  }
} else {
  console.error('Please provide an article ID or "--all" to run the script.');
  process.exit(1);
}
