const { Pool } = require('pg');
const AWS = require('aws-sdk');
const axios = require('axios');
const scraper = require('./scraper'); // Import the entire scraper module
const { v4 } = require('uuid'); // For unique filenames

// Configure AWS S3
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

// Configure PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: 5432,
});

const UNREAL_SPEECH_API_KEY = process.env.UNREAL_SPEECH_API_KEY;
const UNREAL_SPEECH_API_URL = 'https://api.v8.unrealspeech.com/speech';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function fetchWeeklyArticles() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const query = `
        SELECT title, raw_content, summary
        FROM articles
        WHERE publication_date >= $1
        ORDER BY publication_date DESC;
    `;
    const { rows } = await pool.query(query, [sevenDaysAgo]);
    return rows;
}

async function generateSundayEditionSummary(articles) {
    const articleContents = articles.map(article => {
        return `Title: ${article.title}\nSummary: ${article.summary || 'No summary available.'}\nContent: ${article.raw_content}\n\n`;
    }).join('');

    const prompt = `
        You are a CNN news anchor. Your task is to summarize the following news articles from the past week into a cohesive, engaging, and informative news report.
        The summary should be up to 2900 characters long. Focus on the most important and interesting developments.
        Maintain a professional, objective, and authoritative tone, similar to a CNN news anchor.
        Do not include any introductory phrases like "Here's a summary of the week's news" or conversational filler.
        Just provide the news report.

        Weekly Articles:
        ${articleContents}
    `;

    try {
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama3-8b-8192", // Using a suitable Groq model
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 2900, // Max tokens for 2900 characters
        }, {
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Error generating Sunday Edition summary with Groq:', error.response ? error.response.data : error.message);
        return "Summary generation failed.";
    }
}

async function uploadAudioToS3(audioBuffer, filename) {
    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `sunday-editions/audio/${filename}`,
        Body: audioBuffer,
        ContentType: 'audio/mpeg', // Assuming MP3 format from Unreal Speech
        ACL: 'public-read' // Make the file publicly accessible
    };

    try {
        const data = await s3.upload(params).promise();
        return data.Location; // URL of the uploaded file
    } catch (error) {
        console.error('Error uploading audio to S3:', error);
        return null;
    }
}

async function generateNarration(summary) {
    try {
        const response = await axios.post(UNREAL_SPEECH_API_URL, {
            Text: summary,
            VoiceId: "Daniel", // As requested
            Bitrate: "192k",
            Speed: 0,
            Pitch: 1,
        }, {
            headers: {
                'Authorization': `Bearer ${UNREAL_SPEECH_API_KEY}`,
                'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer' // To handle binary audio data
        });

        const audioBuffer = Buffer.from(response.data);
const filename = `sunday-edition-${v4()}.mp3`;
        const s3Url = await uploadAudioToS3(audioBuffer, filename);
        return s3Url;

    } catch (error) {
        console.error('Error generating narration with Unreal Speech:', error.response ? error.response.data : error.message);
        return null;
    }
}

async function createSundayEdition() {
    console.log('Starting Sunday Edition generation...');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const articles = await fetchWeeklyArticles();
        if (articles.length === 0) {
            console.log('No articles found for the past week. Skipping Sunday Edition generation.');
            await client.query('ROLLBACK');
            return { success: false, message: 'No articles found for the past week.' };
        }

        const summary = await generateSundayEditionSummary(articles);
        if (summary === "Summary generation failed.") {
            console.error('Failed to generate summary. Aborting Sunday Edition generation.');
            await client.query('ROLLBACK');
            return { success: false, message: 'Failed to generate summary.' };
        }

        const narrationUrl = await generateNarration(summary);
        if (!narrationUrl) {
            console.error('Failed to generate narration. Aborting Sunday Edition generation.');
            await client.query('ROLLBACK');
            return { success: false, message: 'Failed to generate narration.' };
        }

        // Generate an image for the Sunday Edition
        const imagePrompt = `A news report summary of the week's events in Turks and Caicos, suitable for a CNN news anchor style. Focus on general news imagery, avoiding specific faces or sensitive topics.`;
const imageUrl = await scraper.generateAIImage(imagePrompt); // Reusing existing function

        const title = `Mango News Sunday Edition - ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;

        const insertQuery = `
            INSERT INTO sunday_editions (title, summary, narration_url, image_url, publication_date)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id;
        `;
        const result = await client.query(insertQuery, [title, summary, narrationUrl, imageUrl, new Date()]);
        const newEditionId = result.rows[0].id;

        await client.query('COMMIT');
        console.log(`Sunday Edition created successfully with ID: ${newEditionId}`);
        return { success: true, id: newEditionId, message: 'Sunday Edition created successfully.' };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating Sunday Edition:', error);
        return { success: false, message: 'Error creating Sunday Edition.', error: error.message };
    } finally {
        client.release();
    }
}

module.exports = {
    createSundayEdition,
    fetchWeeklyArticles,
    generateSundayEditionSummary,
    generateNarration,
    uploadAudioToS3
};
