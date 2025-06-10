require('dotenv').config({ path: __dirname + '/.env' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASSWORD),
  port: process.env.DB_PORT || 5432
});

const runSqlFile = async (filePath) => {
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    const client = await pool.connect();
    
    console.log(`Executing SQL from: ${filePath}`);
    await client.query(sql);
    console.log('SQL executed successfully.');
    
    client.release();
  } catch (err) {
    console.error(`Error executing SQL file ${filePath}:`, err);
  } finally {
    await pool.end();
  }
};

const filePath = process.argv[2];
if (!filePath) {
  console.error('Please provide the path to the SQL file.');
  process.exit(1);
}

runSqlFile(path.resolve(filePath));
