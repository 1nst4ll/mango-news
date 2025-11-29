# Troubleshooting

Common issues and solutions for Mango News.

## Backend Issues

### Server Won't Start

**Symptoms:** Server crashes on startup

**Solutions:**
1. Check Node.js version: `node --version` (requires v18+)
2. Install dependencies: `npm install` in backend directory
3. Verify `.env` file exists with all required variables
4. Check database connection settings
5. Review console output for specific error messages

### Database Connection Failed

**Symptoms:** `Error: connect ECONNREFUSED` or similar

**Solutions:**
1. Verify PostgreSQL is running
2. Check `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` in `.env`
3. Ensure database exists and user has permissions
4. Check firewall/network if using remote database

### Scraping Fails

**Symptoms:** No articles scraped, errors in logs

**Solutions:**
1. **Check CSS selectors** - Website may have changed structure
2. **Test selectors** in browser console: `document.querySelector('selector')`
3. **Verify source is active** - Check `is_active` flag
4. **Check article_link_template** - May be too restrictive or too broad
5. **Review blacklist** - URL might be in `backend/config/blacklist.json`
6. **Check network** - Site may be blocking requests

### AI Features Not Working

**Symptoms:** Summaries/tags/images/translations not generated

**Solutions:**
1. Verify API keys in `.env`: `GROQ_API_KEY`, `IDEOGRAM_API_KEY`
2. Check source-level AI toggles are enabled
3. For manual scrapes, check global AI toggles in Settings
4. Review backend logs for API error responses
5. Check API rate limits/quotas

### Groq API Token Error

**Error:** `max_tokens must be less than or equal to 8192`

**Solution:** This is handled automatically. The `generateAITranslation` function caps tokens at 8192 for long content. If still occurring, update your backend code.

### Blacklist Not Working

**Symptoms:** Blacklisted URLs still being scraped

**Solution:** Ensure you're using `getBlacklist()` function from `configLoader.js`. The blacklist uses prefix matching - URLs starting with any blacklisted entry are blocked.

## Frontend Issues

### Page Not Displaying

**Solutions:**
1. Ensure frontend server is running: `npm run dev`
2. Verify backend is running and accessible
3. Check `PUBLIC_API_URL` in frontend `.env`
4. Clear browser cache
5. Check browser console for JavaScript errors

### Theme Toggle Not Working

**Context:** Theme switcher uses a simple toggle button (not dropdown) for iOS Safari compatibility.

**Solutions:**
1. Clear localStorage: `localStorage.removeItem('theme')`
2. Refresh page
3. Check for JavaScript errors in console

### Authentication Errors

**Symptoms:** "No token provided" on protected actions

**Solutions:**
1. Log in again - token may have expired
2. Clear localStorage and cookies, then re-login
3. Verify `jwtToken` exists in localStorage after login
4. Check token is being included in requests (Authorization header)

### Infinite Scroll Not Loading

**Symptoms:** News feed stops loading more articles

**Solutions:**
1. Check browser console for API errors
2. Verify backend is responding to paginated requests
3. Check network tab for failed requests
4. Try refreshing the page

## Database Issues

### Schema Not Applied

**Symptoms:** "relation does not exist" errors

**Solutions:**
1. Apply schema: `psql -U user -d mangonews -f db/schema.sql`
2. Run migrations if upgrading:
   ```bash
   psql -U user -d mangonews -f db/migrations/add_translation_columns.sql
   psql -U user -d mangonews -f db/migrations/add_sunday_editions_table.sql
   ```

### Connection Pool Exhausted

**Symptoms:** "Too many connections" errors, slow responses

**Solutions:**
1. The backend now uses a shared connection pool (`db.js`)
2. Restart backend to release connections
3. Check for connection leaks in custom code
4. Increase `max` pool size if needed (default: 10)

## Memory Issues

### Server Restarts / OOM

**Symptoms:** Backend crashes periodically, especially during scraping

**Solutions:**
1. **Browser pool is shared** - Single Puppeteer instance for all scraping
2. **DB pool is shared** - Single PostgreSQL connection pool
3. **JSDOM cleaned up** - Windows closed after each sanitization
4. **Cron job locking** - Prevents overlapping scheduled tasks
5. Set memory limit: `node --max-old-space-size=512 src/index.js`
6. Monitor memory: Check logs for `[MEMORY]` entries

## Scraping-Specific Issues

### Wrong Articles Discovered

**Problem:** Non-article pages being scraped

**Solutions:**
1. Make `article_link_template` more specific
2. Add unwanted URL patterns to blacklist
3. Use `exclude_patterns` to strip query parameters

### Duplicate Articles

**Problem:** Same article scraped multiple times

**Solutions:**
1. Add query parameters to `exclude_patterns` (e.g., `utm_source,fbclid`)
2. Check for URL variations in database
3. The scraper deduplicates by `source_url`

### Old Articles Being Scraped

**Solution:** Set `scrape_after_date` on the source to ignore historical content.

## Deployment Issues

### Render Restarts

**Symptoms:** Backend service restarts frequently

**Solutions:**
1. Memory optimizations are built-in (see Memory Issues above)
2. Check Render logs for specific errors
3. Ensure all environment variables are set
4. Verify graceful shutdown handlers are working (`SIGTERM` handling)

### Frontend Build Fails

**Solutions:**
1. Check for TypeScript errors
2. Ensure all dependencies installed: `npm install`
3. Clear `.astro` cache directory
4. Check Node.js version compatibility

## Getting Help

If issues persist:

1. Check backend logs for detailed error messages
2. Review relevant documentation linked below
3. Search for error messages in codebase
4. Check GitHub issues if this is a public repo

## Related Documentation

- [Backend Setup](backend-setup.md) - Configuration reference
- [Scraping Methods](scraping-methods.md) - Scraper configuration
- [CSS Selectors](css-selectors.md) - Selector debugging
- [Deployment](deployment.md) - Production setup
