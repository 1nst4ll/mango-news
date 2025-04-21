const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 8081; // Changed port to 8081

// Database connection pool
const pool = new Pool({
  user: 'hoffma24_mangoadmin',
  host: 'localhost',
  database: 'hoffma24_mangonews',
  password: 'R3d3d0ndr0N',
  port: 5432, // Default PostgreSQL port
});

app.use(express.json()); // Middleware to parse JSON request bodies

// Optional: Log database connection status on startup
pool.on('connect', () => {
  console.log('Database pool connected successfully!');
});

pool.on('error', (err) => {
  console.error('Database pool error:', err);
});


// API Routes

// API Routes
app.get('/api/sources', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sources ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching sources:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/sources', async (req, res) => {
  const { name, url } = req.body;

  if (!name || !url) {
    return res.status(400).json({ error: 'Source name and URL are required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO sources (name, url) VALUES ($1, $2) RETURNING *',
      [name, url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding new source:', err);
    if (err.code === '23505') { // Unique violation error code
      res.status(409).json({ error: 'Source with this URL already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.put('/api/sources/:id', async (req, res) => {
  const { id } = req.params;
  const { name, url, is_active } = req.body;

  if (!name || !url || is_active === undefined) {
    return res.status(400).json({ error: 'Source name, URL, and active status are required' });
  }

  try {
    const result = await pool.query(
      'UPDATE sources SET name = $1, url = $2, is_active = $3 WHERE id = $4 RETURNING *',
      [name, url, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Source not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating source:', err);
    if (err.code === '23505') { // Unique violation error code
      res.status(409).json({ error: 'Source with this URL already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.delete('/api/sources/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM sources WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Source not found' });
    }

    res.json({ message: 'Source deleted successfully', source: result.rows[0] });
  } catch (err) {
    console.error('Error deleting source:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to get all articles with filtering
app.get('/api/articles', async (req, res) => {
  const { topic, startDate, endDate } = req.query;
  let query = 'SELECT DISTINCT a.* FROM articles a';
  const values = [];
  const conditions = [];

  if (topic) {
    query += ' JOIN article_topics at ON a.id = at.article_id JOIN topics t ON at.topic_id = t.id';
    conditions.push('t.name ILIKE $1');
    values.push(`%${topic}%`);
  }

  if (startDate && endDate) {
    // Ensure dates are treated as timestamps for BETWEEN
    conditions.push(`a.publication_date BETWEEN $${values.length + 1} AND $${values.length + 2}`);
    values.push(new Date(startDate).toISOString(), new Date(endDate).toISOString());
  } else if (startDate) {
    conditions.push(`a.publication_date >= $${values.length + 1}`);
    values.push(new Date(startDate).toISOString());
  } else if (endDate) {
    conditions.push(`a.publication_date <= $${values.length + 1}`);
    values.push(new Date(endDate).toISOString());
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY a.publication_date DESC';

  try {
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching articles:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to get a single article by ID
app.get('/api/articles/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('SELECT * FROM articles WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching article by ID:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to get all topics
app.get('/api/topics', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM topics ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching topics:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/', (req, res) => {
  res.send('Turks and Caicos News Aggregator Backend');
});

app.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
});
