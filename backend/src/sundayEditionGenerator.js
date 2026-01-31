const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid'); // For unique filenames

// Import shared database pool to prevent connection exhaustion and reduce memory
const { pool } = require('./db');

// Import centralized AI service for optimized AI operations
const aiService = require('./services/aiService');

// Import image service for AI image generation
const imageService = require('./services/imageService');

// Configure AWS S3
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const UNREAL_SPEECH_API_KEY = process.env.UNREAL_SPEECH_API_KEY;
const UNREAL_SPEECH_API_URL = 'https://api.v8.unrealspeech.com/synthesisTasks';

if (!UNREAL_SPEECH_API_KEY) {
    console.error('[ERROR] UNREAL_SPEECH_API_KEY is not set in environment variables.');
}
if (!process.env.GROQ_API_KEY) {
    console.error('[ERROR] GROQ_API_KEY is not set in environment variables.');
}
if (!process.env.FAL_KEY) {
    console.error('[ERROR] FAL_KEY is not set in environment variables.');
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

// OPTIMIZED: Use centralized AI service for weekly summary generation
async function generateSundayEditionSummary(articles) {
    // Sort articles by publication_date in descending order to prioritize recent articles
    // Handle null/undefined publication_date to avoid NaN in sort comparison
    const sortedArticles = [...articles].sort((a, b) => {
        const dateA = a.publication_date ? new Date(a.publication_date).getTime() : 0;
        const dateB = b.publication_date ? new Date(b.publication_date).getTime() : 0;
        return dateB - dateA;
    });

    try {
        console.log('[INFO] Generating Sunday Edition summary using centralized AI service...');
        const summary = await aiService.generateWeeklySummary(sortedArticles);
        return summary;
    } catch (error) {
        console.error(`[ERROR] Error generating Sunday Edition summary: ${error.message}`);
        return "Summary generation failed.";
    }
}

async function uploadToS3(buffer, folder, filename, contentType) {
    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `${folder}/${filename}`,
        Body: buffer,
        ContentType: contentType
    };

    try {
        const command = new PutObjectCommand(params);
        await s3Client.send(command);
        const s3Url = `https://${params.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
        return s3Url;
    } catch (error) {
        console.error(`[ERROR] Error uploading to S3 (${folder}/${filename}): ${error.message}`);
        return null;
    }
}

// Helper function to strip Markdown from text
function stripMarkdown(markdownText) {
    // Remove bold, italics, strikethrough, etc.
    let plainText = markdownText.replace(/(\*\*|__)(.*?)\1/g, '$2'); // Bold
    plainText = plainText.replace(/(\*|_)(.*?)\1/g, '$2');   // Italics
    plainText = plainText.replace(/~~(.*?)~~/g, '$1');       // Strikethrough
    plainText = plainText.replace(/`([^`]+)`/g, '$1');       // Inline code

    // Remove headers
    plainText = plainText.replace(/^#+\s*(.*)$/gm, '$1');

    // Remove blockquotes
    plainText = plainText.replace(/^>\s*(.*)$/gm, '$1');

    // Remove list markers
    plainText = plainText.replace(/^\s*[-*+]\s+/gm, ''); // Unordered lists
    plainText = plainText.replace(/^\s*\d+\.\s+/gm, ''); // Ordered lists

    // Remove links (keep only the text)
    plainText = plainText.replace(/\[(.*?)\]\((.*?)\)/g, '$1');

    // Remove images (keep alt text if present)
    plainText = plainText.replace(/!\[(.*?)\]\((.*?)\)/g, '$1');

    // Replace multiple newlines with single newlines
    plainText = plainText.replace(/\n\s*\n/g, '\n\n');

    // Trim whitespace from each line and overall
    plainText = plainText.split('\n').map(line => line.trim()).join('\n').trim();

    return plainText;
}

async function generateNarration(summary) {
    if (!UNREAL_SPEECH_API_KEY) {
        console.error('[ERROR] Unreal Speech API key is missing. Cannot generate narration.');
        return null;
    }

    // Strip Markdown for narration
    const plainTextSummary = stripMarkdown(summary);

    // Truncate summary to ensure it does not exceed Unreal Speech API's 4250 character limit
    const truncatedSummary = plainTextSummary.length > 4250 ? plainTextSummary.substring(0, 4250) : plainTextSummary;
    if (plainTextSummary.length > 4250) {
        console.warn(`[WARNING] Truncating summary for Unreal Speech API from ${plainTextSummary.length} to ${truncatedSummary.length} characters.`);
    }

    const callbackUrl = `${process.env.PUBLIC_API_URL || 'https://mango-news.onrender.com'}/api/unreal-speech-callback`;

    const requestBody = {
        Text: truncatedSummary, // Use truncated and plain text summary
        VoiceId: "Charlotte", // As requested
        Bitrate: "192k",
        Speed: 0,
        Pitch: 1,
        CallbackUrl: callbackUrl, // Add callback URL
    };
    console.log(`[INFO] Sending to Unreal Speech API: ${JSON.stringify(requestBody)}`);

    try {
        const response = await axios.post(UNREAL_SPEECH_API_URL, requestBody, {
            headers: {
                'Authorization': `Bearer ${UNREAL_SPEECH_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`[INFO] Unreal Speech API response status: ${response.status}`);
        console.log(`[INFO] Unreal Speech API response data: ${JSON.stringify(response.data)}`);
        console.log(`[INFO] Unreal Speech API response headers: ${JSON.stringify(response.headers)}`);

        const synthesisTask = response.data.SynthesisTask;
        if (!synthesisTask || !synthesisTask.TaskId) {
            console.error(`[ERROR] Unreal Speech API response did not contain SynthesisTask or TaskId. Details: ${JSON.stringify(response.data)}`);
            return null;
        }

        // Return the TaskId. The actual audio URL will be handled by the callback.
        return synthesisTask.TaskId;

    } catch (error) {
        const errorMessage = error.response ? (error.response.data ? JSON.stringify(error.response.data.toString('utf8')) : `Status: ${error.response.status}`) : error.message;
        console.error(`[ERROR] Error generating narration or downloading audio from Unreal Speech: ${errorMessage}`);
        return null;
    }
}

// OPTIMIZED: Use centralized AI service for translations with caching and retry
const generateAITranslation = async (text, targetLanguageCode, type = 'general') => {
    try {
        return await aiService.translateText(text, targetLanguageCode, type);
    } catch (error) {
        console.error(`Error generating translation to ${targetLanguageCode}:`, error);
        return null;
    }
};

// Function to generate AI image using fal.ai via centralized image service
const generateAIImage = async (title, summary) => {
    console.log('Attempting to generate AI image using fal.ai...');
    return imageService.generateSundayEditionImage(title, summary);
};

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

        console.log('[INFO] Attempting to generate narration...');
        const unrealSpeechTaskId = await generateNarration(summary);
        if (!unrealSpeechTaskId) {
            console.error('Failed to initiate narration generation with Unreal Speech. Aborting Sunday Edition generation.');
            await client.query('ROLLBACK');
            return { success: false, message: 'Failed to initiate narration generation.' };
        }
        console.log(`[INFO] Narration generation initiated with TaskId: ${unrealSpeechTaskId}`);

        const title = `Mango News Sunday Edition - ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;

        let imageUrl = null;
        try {
            console.log(`[INFO] Generating AI image for Sunday Edition using summary (${summary.length} chars)...`);
            imageUrl = await generateAIImage(title, summary);
            if (!imageUrl) {
                console.warn('Failed to generate AI image for Sunday Edition. Proceeding without image.');
            } else {
                console.log(`[INFO] AI image generated successfully for Sunday Edition: ${imageUrl}`);
            }
        } catch (imageError) {
            console.error('Error generating AI image for Sunday Edition:', imageError.message);
        }

        // Check if a Sunday Edition for today's date already exists (upsert logic)
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of day for comparison

        const existingEditionQuery = `
            SELECT id FROM sunday_editions
            WHERE publication_date::date = $1::date;
        `;
        const existingEditionResult = await client.query(existingEditionQuery, [today]);
        let newEditionId;

        if (existingEditionResult.rows.length > 0) {
            // Edition exists, update it
            const editionId = existingEditionResult.rows[0].id;
            console.log(`Sunday Edition for today already exists (ID: ${editionId}). Updating.`);
            const updateQuery = `
                UPDATE sunday_editions
                SET title = $1, summary = $2, narration_url = NULL, image_url = $3, unreal_speech_task_id = $4, updated_at = CURRENT_TIMESTAMP
                WHERE id = $5
                RETURNING id;
            `;
            const result = await client.query(updateQuery, [title, summary, imageUrl, unrealSpeechTaskId, editionId]);
            newEditionId = result.rows[0].id;
        } else {
            // Edition does not exist, insert new one
            console.log('No Sunday Edition for today found. Inserting new one.');
            const insertQuery = `
                INSERT INTO sunday_editions (title, summary, narration_url, image_url, publication_date, unreal_speech_task_id)
                VALUES ($1, $2, NULL, $3, $4, $5)
                RETURNING id;
            `;
            const result = await client.query(insertQuery, [title, summary, imageUrl, today, unrealSpeechTaskId]);
            newEditionId = result.rows[0].id;
        }

        await client.query('COMMIT');
        console.log(`Sunday Edition processed successfully with ID: ${newEditionId}`);
        return { success: true, id: newEditionId, message: 'Sunday Edition processed successfully.' };

    } catch (error) {
        await client.query('ROLLBACK');
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        console.error(`[ERROR] Error creating Sunday Edition: ${errorMessage}`, error);
        return { success: false, message: `Error creating Sunday Edition: ${errorMessage}`, error: errorMessage };
    } finally {
        client.release();
    }
}

module.exports = {
    createSundayEdition,
    fetchWeeklyArticles,
    generateSundayEditionSummary,
    generateNarration,
    generateAIImage, // Exported for potential external use, though primarily internal
    generateAITranslation, // Exported for potential external use
    uploadToS3 // Exported for potential external use
};
