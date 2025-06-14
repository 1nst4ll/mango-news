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
const UNREAL_SPEECH_API_URL = 'https://api.v8.unrealspeech.com/synthesisTasks';
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
    const maxInputLength = 80000; // Increased to allow more input for longer summaries
    const maxArticlesToSummarize = 30; // Increased to allow more articles for summary

    // Sort articles by publication_date in descending order to prioritize recent articles
    const sortedArticles = [...articles].sort((a, b) => new Date(b.publication_date).getTime() - new Date(a.publication_date).getTime());

    let articlesProcessed = 0;
    for (const article of sortedArticles) {
        if (articlesProcessed >= maxArticlesToSummarize) {
            console.warn(`[WARNING] Exceeded max articles to summarize (${maxArticlesToSummarize}). Skipping remaining articles.`);
            break;
        }

        let contentToAdd = '';
        if (article.summary && article.summary.length > 50) { // Only use summary if substantial
            contentToAdd = `Title: ${article.title}\nSummary: ${article.summary}\n\n`;
        } else {
            continue; // Skip if no substantial summary
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
        You are a BBC news anchor. Your task is to summarize the following news articles from the past week into a cohesive, engaging, and informative news report.
        The summary must be exactly 4250 characters long, or as close as possible to this maximum, and finish with a complete sentence. It is absolutely critical that the summary is comprehensive, highly detailed, and fully utilizes the entire 4250-character limit to provide an exhaustive report. Elaborate extensively on each important and interesting development, providing as much context and depth as possible, ensuring the output reaches the specified length.
        Maintain a professional, objective, and authoritative tone, similar to a BBC news anchor.
        Format the summary using Markdown for readability. Use paragraphs for distinct ideas, bullet points for lists, and bold text for emphasis on key phrases or names. Ensure clear sentence and paragraph breaks.
        Do not include any introductory phrases like "Here's a summary of the week's news" or conversational filler.
        Just provide the news report. Start with: "Welcome to this week's Sunday Edition. It is brought to you by mango.tc. Your one-stop shop for everything TCI!"

        Weekly Articles (summaries or truncated content):
        ${articleContents}
    `;

    if (!GROQ_API_KEY) {
        console.error('[ERROR] Groq API key is missing. Cannot generate summary.');
        return "Summary generation failed.";
    }

    console.log('[INFO] Full content sent to Groq for Sunday Edition summary generation:\n', prompt);

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            model: "llama-3.3-70b-versatile", // Using a more capable Groq model for better summary generation
            temperature: 0.7,
            max_tokens: 1200, // Increased to allow for longer summaries up to ~4250 characters
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
            model: "llama-3.3-70b-versatile", // Using a suitable Groq model for text generation
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
                    content: `Combine the following image generation instructions with the provided article summary to create a single, optimized prompt for an image generation AI. The optimized prompt should be concise, descriptive, and adhere to the instructions while incorporating key elements from the summary. Extract up to 5 most relevant keywords from the summary to include in the prompt. Return only the optimized prompt string, no other text.`
                },
                {
                    role: "user",
                    content: `Instructions: ${imagePromptInstructions}\nSummary: ${summary}`
                }
            ],
            model: "llama-3.3-70b-versatile", // Using a suitable Groq model for text generation
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
        formData.append('negative_prompt', 'text, words, blurry, distorted, ugly, deformed, disfigured, low quality, bad anatomy, bad hands, missing fingers, extra fingers, fewer fingers, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, artist name, error, out of frame, duplicate, tiling, cartoon, anime, sketch, painting, drawing, illustration, 3D render, digital art, abstract, monochrome, grayscale, oversaturated, underexposed, overexposed, too dark, too bright, too colorful, too dull, too much contrast, too little contrast, too much detail, too little detail, messy, cluttered, noisy, grainy, pixelated, blurry background, distorted background, ugly background, deformed background, disfigured background, low quality background, bad anatomy background, bad hands background, missing fingers background, extra fingers background, fewer fingers background, cropped background, worst quality background, low quality background, normal quality background, jpeg artifacts background, signature background, watermark background, username background, artist name background, error background, out of frame background, duplicate background, tiling background, cartoon background, anime background, sketch background, painting background, drawing background, illustration background, 3D render background, digital art background, abstract background, monochrome background, grayscale background, oversaturated background, underexposed background, overexposed background, too dark background, too bright background, too colorful background, too dull background, too much contrast background, too little contrast background, too much detail background, too little detail background, messy background, cluttered background, noisy background, grainy background, pixelated background'); // Added negative prompts
        console.log('Ideogram API request parameters:', {
            prompt: optimizedPrompt,
            rendering_speed: 'TURBO',
            aspect_ratio: '16x9',
            magic_prompt: 'OFF',
            style_type: 'REALISTIC',
            negative_prompt: 'text, words, blurry, distorted, ugly, deformed, disfigured, low quality, bad anatomy, bad hands, missing fingers, extra fingers, fewer fingers, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, artist name, error, out of frame, duplicate, tiling, cartoon, anime, sketch, painting, drawing, illustration, 3D render, digital art, abstract, monochrome, grayscale, oversaturated, underexposed, overexposed, too dark, too bright, too colorful, too dull, too much contrast, too little contrast, too much detail, too little detail, messy, cluttered, noisy, grainy, pixelated, blurry background, distorted background, ugly background, deformed background, disfigured background, low quality background, bad anatomy background, bad hands background, missing fingers background, extra fingers background, fewer fingers background, cropped background, worst quality background, low quality background, normal quality background, jpeg artifacts background, signature background, watermark background, username background, artist name background, error background, out of frame background, duplicate background, tiling background, cartoon background, anime background, sketch background, painting background, drawing background, illustration background, 3D render background, digital art background, abstract background, monochrome background, grayscale background, oversaturated background, underexposed background, overexposed background, too dark background, too bright background, too colorful background, too dull background, too much contrast background, too little contrast background, too much detail background, too little detail background, messy background, cluttered background, noisy background, grainy background, pixelated background'
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
