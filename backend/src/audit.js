/**
 * Article Scraper Audit Script
 *
 * Phase 1: Audit DB content quality, selector coverage, and field consistency
 *          for the 3 most recent articles per source. Rescrape via the production
 *          Render API (POST /api/articles/:id/rescrape) for comparison.
 * Phase 2: Cross-source consistency analysis and normalization recommendations.
 *
 * Usage: cd backend && node src/audit.js [--rescrape]
 *        --rescrape  Also trigger rescrape via Render API (requires login)
 */
require('dotenv').config({ path: __dirname + '/../.env', quiet: true });

const { Pool } = require('pg');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Production Render DB (external hostname with SSL)
const pool = new Pool({
  user: 'mangoadmin',
  host: 'REDACTED_DB_HOST',
  database: 'mangonews',
  password: 'REDACTED_DB_PASSWORD',
  port: 5432,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

const RENDER_API = 'https://mango-news.onrender.com';

// ============================================================================
// HELPERS
// ============================================================================

function truncate(str, len = 200) {
  if (!str) return '(empty)';
  const s = str.replace(/\s+/g, ' ').trim();
  return s.length > len ? s.slice(0, len) + '...' : s;
}

function fieldStatus(value) {
  if (value === null || value === undefined) return 'MISSING';
  if (typeof value === 'string' && value.trim() === '') return 'EMPTY';
  return 'OK';
}

function wordCount(text) {
  if (!text) return 0;
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
}

function charCount(text) {
  if (!text) return 0;
  return text.replace(/<[^>]+>/g, '').trim().length;
}

function detectDirtyContent(html) {
  if (!html) return [];
  const issues = [];
  if (/<script/i.test(html)) issues.push('contains <script>');
  if (/<style[\s>]/i.test(html)) issues.push('contains <style>');
  if (/<nav[\s>]/i.test(html)) issues.push('navigation leak');
  if (/<footer[\s>]/i.test(html)) issues.push('footer leak');
  if (/<iframe/i.test(html)) issues.push('contains <iframe>');
  if (/share this|share on facebook|share on twitter|facebook\.com\/sharer|twitter\.com\/intent/i.test(html)) issues.push('social sharing artifacts');
  if (/subscribe|newsletter|sign up for our/i.test(html)) issues.push('newsletter/subscribe artifacts');
  if (/cookie|privacy policy|terms of use|terms and conditions/i.test(html)) issues.push('legal/cookie boilerplate');
  if (/<img[^>]+src="data:/i.test(html)) issues.push('base64 data URI images');
  if (/Related Articles|Related Posts|You May Also Like|Read More:/i.test(html)) issues.push('related content not stripped');
  if (/advertisement|sponsored content|promoted/i.test(html)) issues.push('ad/sponsored content');
  const wc = wordCount(html);
  if (wc < 30 && wc > 0) issues.push(`very short (${wc} words)`);
  if (wc > 10000) issues.push(`unusually long (${wc} words)`);
  return issues;
}

function detectAuthorIssues(author) {
  if (!author) return ['missing'];
  const issues = [];
  if (author === 'Unknown Author') issues.push('generic "Unknown Author"');
  if (author.includes('•')) issues.push('contains bullet (•)');
  if (/^by\s/i.test(author)) issues.push('starts with "By "');
  if (author.length > 100) issues.push('unusually long');
  if (/<[^>]+>/.test(author)) issues.push('contains HTML tags');
  return issues;
}

function detectDateIssues(dateStr, createdAt) {
  if (!dateStr) return ['missing'];
  const issues = [];
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return ['unparseable date'];
  const now = new Date();
  if (d > now) issues.push('future date');
  if (d < new Date('2000-01-01')) issues.push('very old date (<2000)');
  // Check if date equals created_at (fallback indicator)
  if (createdAt) {
    const ca = new Date(createdAt);
    const diffMs = Math.abs(d.getTime() - ca.getTime());
    if (diffMs < 60000) issues.push('date = created_at (likely fallback)');
  }
  return issues;
}

// ============================================================================
// PHASE 1: DB-BASED AUDIT
// ============================================================================

async function auditSource(source) {
  const hr = '='.repeat(70);
  console.log(`\n${hr}`);
  console.log(`AUDITING: ${source.name} (ID: ${source.id})`);
  console.log(`URL: ${source.url}`);
  console.log(`Method: ${source.scraping_method} | Active: ${source.is_active}`);
  console.log(hr);

  const report = {
    source_id: source.id,
    source_name: source.name,
    source_url: source.url,
    scraping_method: source.scraping_method || 'firecrawl',
    is_active: source.is_active,
    article_count: 0,
    selectors: {},
    selector_issues: [],
    articles_audited: [],
    source_stats: {},
    issues: [],
    recommendations: [],
  };

  // ---- Article count ----
  const countResult = await pool.query('SELECT COUNT(*) FROM articles WHERE source_id = $1', [source.id]);
  report.article_count = parseInt(countResult.rows[0].count, 10);
  console.log(`  Total articles in DB: ${report.article_count}`);

  // ---- Selector Health Check ----
  const selectorFields = [
    { key: 'os_title_selector', label: 'Title', required: true },
    { key: 'os_content_selector', label: 'Content', required: true },
    { key: 'os_date_selector', label: 'Date', required: false },
    { key: 'os_author_selector', label: 'Author', required: false },
    { key: 'os_thumbnail_selector', label: 'Thumbnail', required: false },
    { key: 'os_topics_selector', label: 'Topics', required: false },
    { key: 'include_selectors', label: 'Include', required: false },
    { key: 'exclude_selectors', label: 'Exclude', required: false },
    { key: 'article_link_template', label: 'Link Template', required: true },
  ];

  console.log('\n  Selectors:');
  for (const field of selectorFields) {
    const value = source[field.key];
    const isEmpty = !value || (typeof value === 'string' && value.trim() === '');
    const status = isEmpty ? (field.required ? 'MISSING (REQUIRED)' : 'NOT SET') : 'SET';
    report.selectors[field.label] = { value: value || null, status };

    if (isEmpty && field.required) {
      report.selector_issues.push(`Required: "${field.label}" is missing`);
      report.issues.push(`Required selector "${field.label}" is missing`);
    }
    console.log(`    ${field.label.padEnd(15)} ${status}${!isEmpty ? ` → ${truncate(value, 60)}` : ''}`);
  }

  // ---- Source-wide stats from DB ----
  const statsResult = await pool.query(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN raw_content IS NOT NULL AND LENGTH(raw_content) > 0 THEN 1 END) as has_content,
      COUNT(CASE WHEN summary IS NOT NULL AND LENGTH(summary) > 0 THEN 1 END) as has_summary,
      COUNT(CASE WHEN author IS NOT NULL AND author != 'Unknown Author' THEN 1 END) as has_real_author,
      COUNT(CASE WHEN author = 'Unknown Author' THEN 1 END) as unknown_author_count,
      COUNT(CASE WHEN thumbnail_url IS NOT NULL THEN 1 END) as has_thumbnail,
      COUNT(CASE WHEN ai_image_path IS NOT NULL THEN 1 END) as has_ai_image,
      COUNT(CASE WHEN publication_date IS NOT NULL THEN 1 END) as has_date,
      COUNT(CASE WHEN is_blocked = TRUE THEN 1 END) as blocked,
      COUNT(CASE WHEN title_es IS NOT NULL THEN 1 END) as has_title_es,
      COUNT(CASE WHEN title_ht IS NOT NULL THEN 1 END) as has_title_ht,
      AVG(LENGTH(raw_content)) as avg_content_len,
      MIN(LENGTH(raw_content)) as min_content_len,
      MAX(LENGTH(raw_content)) as max_content_len,
      MIN(publication_date) as oldest_date,
      MAX(publication_date) as newest_date
    FROM articles WHERE source_id = $1
  `, [source.id]);

  const stats = statsResult.rows[0];
  report.source_stats = {
    total: parseInt(stats.total),
    has_content: parseInt(stats.has_content),
    has_summary: parseInt(stats.has_summary),
    has_real_author: parseInt(stats.has_real_author),
    unknown_author: parseInt(stats.unknown_author_count),
    has_thumbnail: parseInt(stats.has_thumbnail),
    has_ai_image: parseInt(stats.has_ai_image),
    has_date: parseInt(stats.has_date),
    blocked: parseInt(stats.blocked),
    has_translations_es: parseInt(stats.has_title_es),
    has_translations_ht: parseInt(stats.has_title_ht),
    avg_content_chars: Math.round(parseFloat(stats.avg_content_len) || 0),
    min_content_chars: parseInt(stats.min_content_len) || 0,
    max_content_chars: parseInt(stats.max_content_len) || 0,
    date_range: `${stats.oldest_date ? new Date(stats.oldest_date).toISOString().split('T')[0] : '?'} → ${stats.newest_date ? new Date(stats.newest_date).toISOString().split('T')[0] : '?'}`,
  };

  console.log('\n  Source-wide stats:');
  const s = report.source_stats;
  console.log(`    Content:      ${s.has_content}/${s.total} have content (avg ${s.avg_content_chars} chars)`);
  console.log(`    Summary:      ${s.has_summary}/${s.total}`);
  console.log(`    Author:       ${s.has_real_author}/${s.total} real, ${s.unknown_author} "Unknown Author"`);
  console.log(`    Thumbnail:    ${s.has_thumbnail}/${s.total} (AI: ${s.has_ai_image}/${s.total})`);
  console.log(`    Date:         ${s.has_date}/${s.total} | Range: ${s.date_range}`);
  console.log(`    Translations: ES=${s.has_translations_es}/${s.total}, HT=${s.has_translations_ht}/${s.total}`);
  console.log(`    Blocked:      ${s.blocked}`);

  // Flag source-wide issues
  if (s.unknown_author > s.total * 0.5) {
    report.issues.push(`${s.unknown_author}/${s.total} articles have "Unknown Author" — author selector likely broken`);
    report.recommendations.push('Review os_author_selector — majority of articles have no author');
  }
  if (s.has_thumbnail < s.total * 0.3 && !source.os_thumbnail_selector) {
    report.issues.push(`Only ${s.has_thumbnail}/${s.total} have thumbnails and no thumbnail selector is set`);
    report.recommendations.push('Add os_thumbnail_selector to capture article images');
  }
  if (s.has_content < s.total) {
    report.issues.push(`${s.total - s.has_content} articles have empty content`);
  }

  // ---- Audit 3 most recent articles in detail ----
  const articles = await pool.query(`
    SELECT id, title, source_url, author, publication_date, raw_content, summary,
           thumbnail_url, ai_image_path, is_blocked, created_at
    FROM articles WHERE source_id = $1
    ORDER BY publication_date DESC NULLS LAST, created_at DESC
    LIMIT 3
  `, [source.id]);

  console.log(`\n  Detailed audit of ${articles.rows.length} most recent articles:`);

  for (const art of articles.rows) {
    console.log(`\n    --- Article #${art.id} ---`);
    console.log(`    Title: "${truncate(art.title, 60)}"`);
    console.log(`    URL: ${art.source_url}`);

    const audit = {
      db_id: art.id,
      title: art.title,
      source_url: art.source_url,
      fields: {
        title: { status: fieldStatus(art.title), length: (art.title || '').length },
        content: {
          status: fieldStatus(art.raw_content),
          chars: charCount(art.raw_content),
          words: wordCount(art.raw_content),
        },
        author: { status: fieldStatus(art.author), value: art.author },
        date: {
          status: fieldStatus(art.publication_date),
          value: art.publication_date ? new Date(art.publication_date).toISOString().split('T')[0] : null,
        },
        thumbnail: { status: fieldStatus(art.thumbnail_url), url: art.thumbnail_url },
        summary: { status: fieldStatus(art.summary), words: wordCount(art.summary) },
        ai_image: { status: fieldStatus(art.ai_image_path) },
        is_blocked: art.is_blocked,
      },
      content_issues: [],
      author_issues: [],
      date_issues: [],
    };

    // Content quality
    const contentIssues = detectDirtyContent(art.raw_content);
    audit.content_issues = contentIssues;

    // Author quality
    audit.author_issues = detectAuthorIssues(art.author);

    // Date quality
    audit.date_issues = detectDateIssues(art.publication_date, art.created_at);

    // Content snippet for manual review
    if (art.raw_content) {
      const plainText = art.raw_content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      audit.content_preview = truncate(plainText, 150);
    }

    // Log findings
    console.log(`    Content: ${audit.fields.content.words} words (${audit.fields.content.chars} chars) | ${audit.fields.content.status}`);
    console.log(`    Author: "${audit.fields.author.value || '(none)'}" ${audit.author_issues.length > 0 ? '! ' + audit.author_issues.join(', ') : 'OK'}`);
    console.log(`    Date: ${audit.fields.date.value || '(none)'} ${audit.date_issues.length > 0 ? '! ' + audit.date_issues.join(', ') : 'OK'}`);
    console.log(`    Thumbnail: ${audit.fields.thumbnail.status} | AI Image: ${audit.fields.ai_image.status}`);
    console.log(`    Summary: ${audit.fields.summary.status} (${audit.fields.summary.words} words)`);

    if (contentIssues.length > 0) {
      console.log(`    Content Issues: ${contentIssues.join('; ')}`);
    }

    if (audit.content_preview) {
      console.log(`    Preview: "${audit.content_preview}"`);
    }

    report.articles_audited.push(audit);
  }

  // ---- Check for duplicate URLs ----
  const dupes = await pool.query(`
    SELECT source_url, COUNT(*) as cnt
    FROM articles WHERE source_id = $1
    GROUP BY source_url HAVING COUNT(*) > 1
    ORDER BY cnt DESC LIMIT 5
  `, [source.id]);

  if (dupes.rows.length > 0) {
    report.issues.push(`${dupes.rows.length} duplicate URLs found`);
    for (const d of dupes.rows) {
      console.log(`    [!] Duplicate URL (${d.cnt}x): ${truncate(d.source_url, 60)}`);
    }
  }

  // ---- Check for articles with topic associations ----
  const topicStats = await pool.query(`
    SELECT COUNT(DISTINCT a.id) as articles_with_topics
    FROM articles a
    JOIN article_topics at2 ON a.id = at2.article_id
    WHERE a.source_id = $1
  `, [source.id]);
  const articlesWithTopics = parseInt(topicStats.rows[0].articles_with_topics);
  console.log(`\n    Topic coverage: ${articlesWithTopics}/${report.article_count} articles have topics`);
  if (articlesWithTopics < report.article_count * 0.5) {
    report.issues.push(`Only ${articlesWithTopics}/${report.article_count} articles have topic tags`);
  }

  // Summary
  console.log(`\n  SUMMARY: ${report.issues.length} issues, ${report.recommendations.length} recommendations`);
  return report;
}

// ============================================================================
// PHASE 2: CROSS-SOURCE ANALYSIS
// ============================================================================

function analyzeConsistency(reports) {
  const analysis = {
    total_sources: reports.length,
    active_sources: reports.filter(r => r.is_active).length,
    total_articles: reports.reduce((s, r) => s + r.article_count, 0),
    method_breakdown: {},
    field_coverage_pct: {},
    content_quality: {
      sources_by_avg_content: [],
      short_content_sources: [],
      dirty_content_articles: [],
    },
    author_quality: {
      sources_with_unknown_author: [],
    },
    thumbnail_coverage: {
      sources_without_selector: [],
    },
    schema_inconsistencies: [],
    global_recommendations: [],
  };

  for (const r of reports) {
    const method = r.scraping_method;
    analysis.method_breakdown[method] = (analysis.method_breakdown[method] || 0) + 1;

    // Content quality
    analysis.content_quality.sources_by_avg_content.push({
      source: r.source_name,
      avg_chars: r.source_stats.avg_content_chars,
      min_chars: r.source_stats.min_content_chars,
      max_chars: r.source_stats.max_content_chars,
    });

    if (r.source_stats.avg_content_chars < 500) {
      analysis.content_quality.short_content_sources.push(r.source_name);
    }

    // Author quality
    if (r.source_stats.unknown_author > r.source_stats.total * 0.3) {
      analysis.author_quality.sources_with_unknown_author.push({
        source: r.source_name,
        unknown: r.source_stats.unknown_author,
        total: r.source_stats.total,
      });
    }

    // Thumbnail
    if (!r.selectors.Thumbnail?.value) {
      analysis.thumbnail_coverage.sources_without_selector.push(r.source_name);
    }

    // Dirty content from article audits
    for (const a of r.articles_audited) {
      if (a.content_issues.length > 0) {
        analysis.content_quality.dirty_content_articles.push({
          source: r.source_name,
          id: a.db_id,
          title: truncate(a.title, 40),
          issues: a.content_issues,
        });
      }
    }
  }

  // Field coverage percentages across all sources
  const fieldNames = ['has_content', 'has_summary', 'has_real_author', 'has_thumbnail', 'has_date', 'has_translations_es'];
  for (const field of fieldNames) {
    let total = 0, have = 0;
    for (const r of reports) {
      total += r.source_stats.total;
      have += r.source_stats[field] || 0;
    }
    analysis.field_coverage_pct[field] = total > 0 ? Math.round(have / total * 100) : 0;
  }

  // Global recommendations
  if (analysis.content_quality.short_content_sources.length > 0) {
    analysis.global_recommendations.push(`Short content sources: ${analysis.content_quality.short_content_sources.join(', ')} — review content selectors`);
  }
  if (analysis.author_quality.sources_with_unknown_author.length > 0) {
    const names = analysis.author_quality.sources_with_unknown_author.map(s => `${s.source} (${s.unknown}/${s.total})`);
    analysis.global_recommendations.push(`Author extraction failing: ${names.join(', ')}`);
  }
  if (analysis.thumbnail_coverage.sources_without_selector.length > 0) {
    analysis.global_recommendations.push(`No thumbnail selector: ${analysis.thumbnail_coverage.sources_without_selector.join(', ')}`);
  }

  return analysis;
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

function generateReport(reports, analysis) {
  const L = [];
  const hr = '='.repeat(80);

  L.push(hr);
  L.push('MANGO NEWS — ARTICLE SCRAPER AUDIT REPORT');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push(`Database: Production (Render)`);
  L.push(hr);

  L.push('\n## EXECUTIVE SUMMARY\n');
  L.push(`Sources: ${analysis.total_sources} (${analysis.active_sources} active)`);
  L.push(`Total Articles: ${analysis.total_articles}`);
  L.push(`Methods: ${Object.entries(analysis.method_breakdown).map(([k,v])=>`${k}: ${v}`).join(', ')}`);
  L.push(`Total Issues: ${reports.reduce((s,r)=>s+r.issues.length,0)}`);
  L.push(`Total Recommendations: ${reports.reduce((s,r)=>s+r.recommendations.length,0)}`);

  L.push('\n## FIELD COVERAGE (ALL ARTICLES)\n');
  for (const [field, pct] of Object.entries(analysis.field_coverage_pct)) {
    L.push(`  ${field.padEnd(22)} ${pct}%`);
  }

  // Per-source details
  for (const r of reports) {
    L.push(`\n${'─'.repeat(80)}`);
    L.push(`### ${r.source_name} (ID: ${r.source_id}) — ${r.article_count} articles`);
    L.push(`URL: ${r.source_url}`);
    L.push(`Method: ${r.scraping_method} | Active: ${r.is_active}`);

    L.push('\nSelectors:');
    for (const [label, info] of Object.entries(r.selectors)) {
      L.push(`  ${label.padEnd(15)} ${info.status}${info.value ? ` → ${truncate(info.value, 55)}` : ''}`);
    }

    const s = r.source_stats;
    L.push('\nSource Stats:');
    L.push(`  Content:      ${s.has_content}/${s.total} (avg ${s.avg_content_chars} chars, range ${s.min_content_chars}–${s.max_content_chars})`);
    L.push(`  Summary:      ${s.has_summary}/${s.total}`);
    L.push(`  Author:       ${s.has_real_author}/${s.total} real, ${s.unknown_author} unknown`);
    L.push(`  Thumbnail:    ${s.has_thumbnail}/${s.total} | AI Image: ${s.has_ai_image}/${s.total}`);
    L.push(`  Date:         ${s.has_date}/${s.total} | ${s.date_range}`);
    L.push(`  Translations: ES=${s.has_translations_es}, HT=${s.has_translations_ht}`);

    if (r.articles_audited.length > 0) {
      L.push('\nRecent Articles:');
      for (const a of r.articles_audited) {
        L.push(`\n  #${a.db_id}: "${truncate(a.title, 55)}"`);
        L.push(`  URL: ${a.source_url}`);
        L.push(`  Content: ${a.fields.content.words}w (${a.fields.content.chars}c) | Author: "${a.fields.author.value || '(none)'}" | Date: ${a.fields.date.value || '(none)'}`);
        L.push(`  Thumb: ${a.fields.thumbnail.status} | Summary: ${a.fields.summary.status} (${a.fields.summary.words}w) | AI Img: ${a.fields.ai_image.status}`);
        if (a.content_issues.length > 0) L.push(`  Content Issues: ${a.content_issues.join('; ')}`);
        if (a.author_issues.length > 0) L.push(`  Author Issues: ${a.author_issues.join('; ')}`);
        if (a.date_issues.length > 0) L.push(`  Date Issues: ${a.date_issues.join('; ')}`);
        if (a.content_preview) L.push(`  Preview: "${a.content_preview}"`);
      }
    }

    if (r.issues.length > 0) {
      L.push('\nIssues:');
      r.issues.forEach(i => L.push(`  [!] ${i}`));
    }
    if (r.recommendations.length > 0) {
      L.push('\nRecommendations:');
      r.recommendations.forEach(rec => L.push(`  → ${rec}`));
    }
  }

  // Cross-source analysis
  L.push(`\n${hr}\n## CROSS-SOURCE ANALYSIS\n`);

  if (analysis.content_quality.dirty_content_articles.length > 0) {
    L.push('### Dirty Content:');
    for (const d of analysis.content_quality.dirty_content_articles) {
      L.push(`  ${d.source} #${d.id} "${d.title}": ${d.issues.join('; ')}`);
    }
  }

  L.push('\n### Content Size by Source:');
  for (const s of analysis.content_quality.sources_by_avg_content) {
    L.push(`  ${s.source.padEnd(25)} avg=${s.avg_chars}c  range=${s.min_chars}–${s.max_chars}c`);
  }

  if (analysis.global_recommendations.length > 0) {
    L.push('\n### Global Recommendations:');
    for (const rec of analysis.global_recommendations) {
      L.push(`  → ${rec}`);
    }
  }

  return L.join('\n');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('Mango News — Article Scraper Audit');
  console.log('Database: Production (Render)\n');

  // Fetch all sources from production DB
  const sourcesResult = await pool.query('SELECT * FROM sources ORDER BY id');
  const sources = sourcesResult.rows;
  console.log(`Found ${sources.length} sources:\n`);

  for (const s of sources) {
    const cnt = await pool.query('SELECT COUNT(*) FROM articles WHERE source_id = $1', [s.id]);
    console.log(`  [${s.id}] ${s.name} (${s.scraping_method}) — ${cnt.rows[0].count} articles — ${s.is_active ? 'ACTIVE' : 'INACTIVE'}`);
  }

  // Run audit for each source
  const reports = [];
  for (const source of sources) {
    try {
      const report = await auditSource(source);
      reports.push(report);
    } catch (err) {
      console.error(`\n  [FATAL] Error auditing ${source.name}:`, err.message);
      reports.push({
        source_id: source.id, source_name: source.name, source_url: source.url,
        scraping_method: source.scraping_method, is_active: source.is_active,
        article_count: 0, selectors: {}, selector_issues: [], articles_audited: [],
        source_stats: {}, issues: [`Audit failed: ${err.message}`],
        recommendations: ['Investigate — audit could not complete'],
      });
    }
  }

  // Cross-source analysis
  console.log(`\n${'='.repeat(70)}`);
  console.log('CROSS-SOURCE ANALYSIS');
  console.log('='.repeat(70));
  const analysis = analyzeConsistency(reports);

  console.log(`\nField Coverage (all ${analysis.total_articles} articles):`);
  for (const [field, pct] of Object.entries(analysis.field_coverage_pct)) {
    console.log(`  ${field.padEnd(22)} ${pct}%`);
  }

  if (analysis.global_recommendations.length > 0) {
    console.log('\nGlobal Recommendations:');
    for (const rec of analysis.global_recommendations) {
      console.log(`  → ${rec}`);
    }
  }

  // Write reports
  const reportText = generateReport(reports, analysis);
  const reportPath = path.join(__dirname, '..', '..', 'audit-report.txt');
  fs.writeFileSync(reportPath, reportText);
  console.log(`\nReport written to: ${reportPath}`);

  const jsonPath = path.join(__dirname, '..', '..', 'audit-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify({ reports, analysis }, null, 2));
  console.log(`JSON written to: ${jsonPath}`);

  await pool.end();
  console.log('\nAudit complete.');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
