const { Pool } = require('pg');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid'); // For unique filenames
const Groq = require('groq-sdk'); // Import Groq SDK
const fetch = require('node-fetch'); // Import node-fetch for making HTTP requests
const FormData = require('form-data'); // Import the form-data library

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
const IDEOGRAM_API_KEY = process.env.IDEOGRAM_API_KEY;

// Initialize Groq SDK
const groq = new Groq({
    apiKey: GROQ_API_KEY
});

if (!UNREAL_SPEECH_API_KEY) {
    console.error('[ERROR] UNREAL_SPEECH_API_KEY is not set in environment variables.');
}
if (!GROQ_API_KEY) {
    console.error('[ERROR] GROQ_API_KEY is not set in environment variables.');
}
if (!IDEOGRAM_API_KEY) {
    console.error('[ERROR] IDEOGRAM_API_KEY is not set in environment variables.');
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
    let articleContents = '';
    const maxInputLength = 25000; // Max characters to send to Groq for input (closer to 8192 tokens)
    const maxArticlesToSummarize = 10; // Further limit the number of articles to process

    // Sort articles by publication_date in descending order to prioritize recent articles
    const sortedArticles = [...articles].sort((a, b) => new Date(b.publication_date).getTime() - new Date(a.publication_date).getTime());

    let articlesProcessed = 0;
    for (const article of sortedArticles) {
        if (articlesProcessed >= maxArticlesToSummarize) {
            console.warn(`[WARNING] Exceeded max articles to summarize (${maxArticlesToSummarize}). Skipping remaining articles.`);
            break;
        }

        let contentToAdd = '';
        if (article.summary && article.summary.length > 50) { // Prefer summary if substantial
            contentToAdd = `Title: ${article.title}\nSummary: ${article.summary}\n\n`;
        } else if (article.raw_content) { // Otherwise, use truncated raw content
            // Truncate raw_content more aggressively if needed
            contentToAdd = `Title: ${article.title}\nContent: ${article.raw_content.substring(0, Math.min(article.raw_content.length, 500))}...\n\n`;
        } else {
            continue; // Skip if no useful content
        }

        if ((articleContents + contentToAdd).length > maxInputLength) {
            console.warn(`[WARNING] Exceeded max input length for Groq summary. Truncating article list.`);
            break; // Stop adding articles if max length is reached
        }
        articleContents += contentToAdd;
        articlesProcessed++;
    }

    if (articleContents.length === 0) {
        console.warn('[WARNING] No sufficient article content to generate Sunday Edition summary.');
        return "No sufficient article content.";
    }

    const prompt = `
        You are a CNN news anchor. Your task is to summarize the following news articles from the past week into a cohesive, engaging, and informative news report.
        The summary must be a maximum of 2900 characters long and finish with a complete sentence. Focus on the most important and interesting developments.
        Maintain a professional, objective, and authoritative tone, similar to a CNN news anchor.
        Do not include any introductory phrases like "Here's a summary of the week's news" or conversational filler.
        Just provide the news report. Start with: "This is brought to you by mango.tc - everything TCI."

        Weekly Articles (summaries or truncated content):
        ${articleContents}
    `;

    if (!GROQ_API_KEY) {
        console.error('[ERROR] Groq API key is missing. Cannot generate summary.');
        return "Summary generation failed.";
    }

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            model: "meta-llama/llama-4-scout-17b-16e-instruct", // Using a more capable Groq model for better summary generation
            temperature: 0.7,
            max_tokens: 750, // Adjusted to allow for summaries up to ~2900 characters
        });
        return chatCompletion.choices[0]?.message?.content || "Summary generation failed.";
    } catch (error) {
        console.error(`[ERROR] Error generating Sunday Edition summary with Groq: ${error.message}`);
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

async function generateNarration(summary) {
    if (!UNREAL_SPEECH_API_KEY) {
        console.error('[ERROR] Unreal Speech API key is missing. Cannot generate narration.');
        return null;
    }

    // Truncate summary to ensure it does not exceed Unreal Speech API's 3000 character limit
    const truncatedSummary = summary.length > 2999 ? summary.substring(0, 2999) : summary;
    if (summary.length > 2999) {
        console.warn(`[WARNING] Truncating summary for Unreal Speech API from ${summary.length} to ${truncatedSummary.length} characters.`);
    }

    const requestBody = {
        Text: truncatedSummary, // Use truncated summary
        VoiceId: "Daniel", // As requested
        Bitrate: "192k",
        Speed: 0,
        Pitch: 1,
    };
    console.log(`[INFO] Sending to Unreal Speech API: ${JSON.stringify(requestBody)}`);

    try {
        const response = await axios.post(UNREAL_SPEECH_API_URL, requestBody, {
            headers: {
                'Authorization': `Bearer ${UNREAL_SPEECH_API_KEY}`,
                'Content-Type': 'application/json'
            },
            responseType: 'json' // Expect JSON response from Unreal Speech API
        });

        console.log(`[INFO] Unreal Speech API response status: ${response.status}`);
        console.log(`[INFO] Unreal Speech API response data: ${JSON.stringify(response.data)}`);
        console.log(`[INFO] Unreal Speech API response headers: ${JSON.stringify(response.headers)}`);

        const unrealSpeechOutputUri = response.data.OutputUri;
        if (!unrealSpeechOutputUri) {
            console.error(`[ERROR] Unreal Speech API response did not contain OutputUri. Details: ${JSON.stringify(response.data)}`);
            return null;
        }

        console.log(`[INFO] Downloading audio from Unreal Speech OutputUri: ${unrealSpeechOutputUri}`);
        const audioResponse = await axios.get(unrealSpeechOutputUri, {
            responseType: 'arraybuffer' // Expect binary audio data from this URL
        });

        console.log(`[INFO] Downloaded audio response status: ${audioResponse.status}`);
        console.log(`[INFO] Downloaded audio response data length: ${audioResponse.data ? audioResponse.data.length : 0} bytes`);
        console.log(`[INFO] Downloaded audio response headers: ${JSON.stringify(audioResponse.headers)}`);

        const audioBuffer = Buffer.from(audioResponse.data);
        const filename = `sunday-edition-${uuidv4()}.mp3`;
        const contentType = 'audio/mpeg'; // Explicitly define content type
        const s3Url = await uploadToS3(audioBuffer, 'sunday-editions/audio', filename, contentType);
        console.log(`[INFO] Uploading to S3 with Content-Type: ${contentType}`);
        return s3Url;

    } catch (error) {
        const errorMessage = error.response ? (error.response.data ? JSON.stringify(error.response.data.toString('utf8')) : `Status: ${error.response.status}`) : error.message;
        console.error(`[ERROR] Error generating narration or downloading audio from Unreal Speech: ${errorMessage}`);
        return null;
    }
}

// This function generates AI translations using the Groq API (copied from scraper.js)
const generateAITranslation = async (text, targetLanguageCode, type = 'general') => {
    if (!text) {
        return null;
    }
    console.log(`Generating AI translation for "${text}" to ${targetLanguageCode} (type: ${type}) using Groq...`);

    let systemPrompt = '';
    const languageName = targetLanguageCode === 'es' ? 'Spanish' : 'Haitian Creole';

    if (type === 'title') {
        systemPrompt = `Translate the following news article title into ${languageName}. The translation must be concise, direct, and suitable as a headline. Return only the translated title, without any introductory phrases, conversational filler, or additional explanations.`;
    } else if (type === 'summary') {
        systemPrompt = `Translate the following news article summary into ${languageName}. The translation must be a concise summary, not an expanded list of points or a full article. Make the summary engaging to encourage clicks. Use markdown bold syntax (**text**) for key information. Ensure the summary is a maximum of 80 words and ends on a complete sentence.Return only the translated summary, without any introductory phrases, conversational filler, or additional explanations.`;
    } else if (type === 'raw_content') {
        systemPrompt = `Translate the following news article content into ${languageName}. Maintain the original formatting, including paragraphs and markdown. Ensure the translation is accurate and complete. Return only the translated content, without any introductory phrases, conversational filler, or additional explanations.`;
    } else { // 'general' or other types
        systemPrompt = `Translate the following text into ${languageName}. Return only the translated text, without any introductory phrases or conversational filler.`;
    }

    let currentMaxTokens = 500; // Default max tokens

    if (type === 'title') {
        currentMaxTokens = 100; // Shorter for titles
    } else if (type === 'summary') {
        currentMaxTokens = 200; // Shorter for summaries
    } else if (type === 'raw_content') {
        currentMaxTokens = 8192; // Adjust to Groq's maximum limit
    }

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: text,
                }
            ],
            model: "llama3-8b-8192", // Using a suitable Groq model for text generation
            temperature: 0.3, // Keep temperature low for accurate translation
            max_tokens: currentMaxTokens, // Dynamically set max tokens
        });

        const translation = chatCompletion.choices[0]?.message?.content || null;
        console.log(`Generated translation for "${text}" to ${targetLanguageCode} (type: ${type}): "${translation}"`);
        return translation;

    } catch (llmErr) {
        console.error(`Error generating translation for "${text}" to ${targetLanguageCode} (type: ${type}) with Groq:`, llmErr);
        return null;
    }
};

// Function to generate AI image using Ideogram API (copied from scraper.js)
const generateAIImage = async (title, summary) => {
    console.log('Attempting to generate AI image using Ideogram API...');

    if (!IDEOGRAM_API_KEY) {
        console.warn('IDEOGRAM_API_KEY is not set. Skipping AI image generation.');
        return null;
    }
    console.log(`IDEOGRAM_API_KEY is set: ${!!IDEOGRAM_API_KEY}`);

    const ideogramApiUrl = 'https://api.ideogram.ai/v1/ideogram-v3/generate';

    const imagePromptInstructions = `Create a compelling news thumbnail image relevant to the Turks and Caicos Islands (TCI). The image should be visually striking and optimized for clicks. Focus on imagery that reflects the article's summary and the TCI context, such as local landmarks, relevant objects, or scenes, but avoid identifiable faces of residents to ensure authenticity and prevent misrepresentation. Use vibrant colors and high contrast. If text is necessary, keep it to a maximum of 2 relevant keywords in a bold, sans-serif font, avoiding the lower-right corner. Do not include any asterisk (*) characters in the text.`;

    try {
        console.log('Optimizing image prompt using Groq...');
        const promptOptimizationCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `Combine the following image generation instructions with the provided article summary to create a single, optimized prompt for an image generation AI. The optimized prompt should be concise, descriptive, and adhere to the instructions while incorporating key elements from the summary. Return only the optimized prompt string, no other text.`
                },
                {
                    role: "user",
                    content: `Instructions: ${imagePromptInstructions}\nSummary: ${summary}`
                }
            ],
            model: "llama3-8b-8192", // Using a suitable Groq model for text generation
            temperature: 0.7,
            max_tokens: 200,
        });

        const optimizedPrompt = promptOptimizationCompletion.choices[0]?.message?.content || `Local TCI news thumbnail based on: ${summary}`;

        console.log('Generated optimized prompt:', optimizedPrompt);

        const formData = new FormData();
        formData.append('prompt', optimizedPrompt);
        formData.append('rendering_speed', 'TURBO');
        formData.append('aspect_ratio', '16x9');
        formData.append('magic_prompt', 'OFF');
        formData.append('style_type', 'REALISTIC');
        console.log('Ideogram API request parameters:', {
            prompt: optimizedPrompt,
            rendering_speed: 'TURBO',
            aspect_ratio: '16x9',
            magic_prompt: 'OFF',
            style_type: 'REALISTIC'
        });

        const headers = formData.getHeaders();
        headers['Api-Key'] = IDEOGRAM_API_KEY;

        const response = await fetch(ideogramApiUrl, {
            method: 'POST',
            headers: headers,
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ideogram API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const responseData = await response.json();
        console.log('Ideogram API raw response data:', JSON.stringify(responseData, null, 2));

        if (responseData && responseData.data && responseData.data.length > 0) {
            const imageUrl = responseData.data[0].url;
            console.log('Generated AI image URL:', imageUrl);

            console.log('Attempting to download image from:', imageUrl);
            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) {
                throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
            }
            console.log('Image downloaded successfully.');

            const arrayBuffer = await imageResponse.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const urlParts = imageUrl.split('.');
            const fileExtension = urlParts.pop()?.split('?')[0] || 'png';

            const imageName = `sunday-editions/images/${uuidv4()}.${fileExtension}`;

            const s3ImageUrl = await uploadToS3(buffer, 'sunday-editions/images', `${uuidv4()}.${fileExtension}`, `image/${fileExtension}`);

            console.log('Uploaded AI image to S3:', s3ImageUrl);
            return s3ImageUrl;

        } else {
            console.warn('Ideogram API response did not contain expected image data.', responseData);
            return null;
        }

    } catch (apiErr) {
        console.error('Error generating or uploading AI image with Ideogram API or S3:', apiErr);
        return null;
    }
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
        const narrationUrl = await generateNarration(summary);
        if (!narrationUrl) {
            console.error('Failed to generate narration (narrationUrl is null). Aborting Sunday Edition generation.');
            await client.query('ROLLBACK');
            return { success: false, message: 'Failed to generate narration.' };
        }
        console.log(`[INFO] Narration generated successfully: ${narrationUrl}`);

        const title = `Mango News Sunday Edition - ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;

        let imageUrl = null;
        try {
            imageUrl = await generateAIImage(title, summary);
            if (!imageUrl) {
                console.warn('Failed to generate AI image for Sunday Edition. Proceeding without image.');
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
                SET title = $1, summary = $2, narration_url = $3, image_url = $4, updated_at = CURRENT_TIMESTAMP
                WHERE id = $5
                RETURNING id;
            `;
            const result = await client.query(updateQuery, [title, summary, narrationUrl, imageUrl, editionId]);
            newEditionId = result.rows[0].id;
        } else {
            // Edition does not exist, insert new one
            console.log('No Sunday Edition for today found. Inserting new one.');
            const insertQuery = `
                INSERT INTO sunday_editions (title, summary, narration_url, image_url, publication_date)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id;
            `;
            const result = await client.query(insertQuery, [title, summary, narrationUrl, imageUrl, today]);
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
