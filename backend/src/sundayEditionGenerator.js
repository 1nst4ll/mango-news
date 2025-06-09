const { Pool } = require('pg');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const axios = require('axios');
const scraper = require('./scraper'); // Import the entire scraper module
const { v4 } = require('uuid'); // For unique filenames

// Configure AWS S3
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
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

if (!UNREAL_SPEECH_API_KEY) {
    console.error('[ERROR] UNREAL_SPEECH_API_KEY is not set in environment variables.');
}
if (!GROQ_API_KEY) {
    console.error('[ERROR] GROQ_API_KEY is not set in environment variables.');
}
if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.S3_BUCKET_NAME) {
    console.error('[ERROR] AWS S3 environment variables (AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME) are not fully set.');
}

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

    if (!GROQ_API_KEY) {
        console.error('[ERROR] Groq API key is missing. Cannot generate summary.');
        return "Summary generation failed.";
    }

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
        const errorMessage = error.response ? (error.response.data ? JSON.stringify(error.response.data) : `Status: ${error.response.status}`) : error.message;
        console.error(`[ERROR] Error generating Sunday Edition summary with Groq: ${errorMessage}`);
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
        const command = new PutObjectCommand(params);
        const data = await s3Client.send(command);
        // Construct the public URL manually as Location is not always returned in v3
        const s3Url = `https://${params.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
        return s3Url;
    } catch (error) {
        console.error(`[ERROR] Error uploading audio to S3: ${error.message}`);
        return null;
    }
}

async function generateNarration(summary) {
    if (!UNREAL_SPEECH_API_KEY) {
        console.error('[ERROR] Unreal Speech API key is missing. Cannot generate narration.');
        return null;
    }

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
        const errorMessage = error.response ? (error.response.data ? JSON.stringify(error.response.data) : `Status: ${error.response.status}`) : error.message;
        console.error(`[ERROR] Error generating narration with Unreal Speech: ${errorMessage}`);
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
        let imageUrl = null;
        try {
            imageUrl = await scraper.generateAIImage(imagePrompt); // Reusing existing function
            if (!imageUrl) {
                console.warn('Failed to generate AI image for Sunday Edition. Proceeding without image.');
            }
        } catch (imageError) {
            console.error('Error generating AI image for Sunday Edition:', imageError.message);
            // Continue without image if generation fails
        }

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
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        console.error(`[ERROR] Error creating Sunday Edition: ${errorMessage}`, error);
        return { success: false, message: `Error creating Sunday Edition: ${errorMessage}`, error: errorMessage };
    } finally {
        client.release();
    }
}

try {
    module.exports = {
        createSundayEdition,
        fetchWeeklyArticles,
        generateSundayEditionSummary,
        generateNarration,
        uploadAudioToS3
    };
} catch (error) {
    console.error(`[CRITICAL ERROR] Synchronous error during sundayEditionGenerator module export: ${error.message}`, error);
    // Depending on the severity, you might want to re-throw or handle differently
    // For now, just logging to ensure it's caught.
}
