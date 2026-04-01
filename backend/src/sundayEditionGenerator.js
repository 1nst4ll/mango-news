const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { fal } = require('@fal-ai/client');

// Import shared database pool to prevent connection exhaustion and reduce memory
const { pool } = require('./db');

// Import centralized AI service for optimized AI operations
const aiService = require('./services/aiService');

// Import image service for AI image generation
const imageService = require('./services/imageService');

// Import shared S3 service
const { uploadToS3 } = require('./services/s3Service');

// Import TTS and podcast settings
const { getTtsSettings, getPodcastSettings } = require('./configLoader');

const UNREAL_SPEECH_API_KEY = process.env.UNREAL_SPEECH_API_KEY;
const UNREAL_SPEECH_API_URL = 'https://api.v8.unrealspeech.com/synthesisTasks';

fal.config({ credentials: process.env.FAL_KEY });

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

// uploadToS3 is now imported from services/s3Service.js

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

/**
 * Generate narration audio for a Sunday Edition summary.
 * Returns { type: 'task', id } for async providers (UnrealSpeech)
 * or { type: 'url', url } for synchronous providers (fal.ai).
 * Returns null on failure.
 */
async function generateNarration(summary) {
    const tts = getTtsSettings();
    const plainText = stripMarkdown(summary);

    if (tts.provider === 'fal-gemini') {
        return _generateNarrationFalGemini(plainText, tts);
    }
    if (tts.provider === 'fal-minimax') {
        return _generateNarrationFalMinimax(plainText, tts);
    }
    // Default: unreal-speech
    return _generateNarrationUnrealSpeech(plainText, tts);
}

async function _generateNarrationUnrealSpeech(plainText, tts) {
    if (!UNREAL_SPEECH_API_KEY) {
        console.error('[ERROR] UNREAL_SPEECH_API_KEY is not set. Cannot generate narration.');
        return null;
    }
    const truncated = plainText.length > 4250 ? plainText.substring(0, 4250) : plainText;
    if (plainText.length > 4250) {
        console.warn(`[WARNING] Truncating summary for Unreal Speech from ${plainText.length} to ${truncated.length} chars.`);
    }
    const callbackUrl = `${process.env.PUBLIC_API_URL || 'https://mango-news.onrender.com'}/api/unreal-speech-callback`;
    const requestBody = {
        Text: truncated,
        VoiceId: tts.us_voice,
        Bitrate: tts.us_bitrate,
        Speed: tts.us_speed,
        Pitch: tts.us_pitch,
        CallbackUrl: callbackUrl,
    };
    console.log(`[TTS] UnrealSpeech request: voice=${tts.us_voice} speed=${tts.us_speed} pitch=${tts.us_pitch}`);
    try {
        const response = await axios.post(UNREAL_SPEECH_API_URL, requestBody, {
            headers: { 'Authorization': `Bearer ${UNREAL_SPEECH_API_KEY}`, 'Content-Type': 'application/json' }
        });
        const synthesisTask = response.data.SynthesisTask;
        if (!synthesisTask || !synthesisTask.TaskId) {
            console.error(`[ERROR] UnrealSpeech did not return TaskId: ${JSON.stringify(response.data)}`);
            return null;
        }
        return { type: 'task', id: synthesisTask.TaskId };
    } catch (error) {
        const msg = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error(`[ERROR] UnrealSpeech narration failed: ${msg}`);
        return null;
    }
}

async function _generateNarrationFalGemini(plainText, tts) {
    if (!process.env.FAL_KEY) {
        console.error('[ERROR] FAL_KEY is not set. Cannot generate narration via fal.ai.');
        return null;
    }
    const truncated = plainText.length > 5000 ? plainText.substring(0, 5000) : plainText;
    console.log(`[TTS] fal Gemini TTS: voice=${tts.fal_gemini_voice}`);
    try {
        const result = await fal.subscribe('fal-ai/gemini-tts', {
            input: { prompt: truncated, voice: tts.fal_gemini_voice, output_format: 'mp3' },
            logs: false,
        });
        const audioUrl = result?.data?.audio?.url;
        if (!audioUrl) { console.error('[ERROR] fal Gemini TTS returned no audio URL'); return null; }
        const audioResponse = await axios.get(audioUrl, { responseType: 'arraybuffer' });
        const s3Url = await uploadToS3(Buffer.from(audioResponse.data), 'sunday-editions/audio', `sunday-edition-${uuidv4()}.mp3`, 'audio/mpeg');
        if (!s3Url) { console.error('[ERROR] Failed to upload fal Gemini audio to S3'); return null; }
        return { type: 'url', url: s3Url };
    } catch (error) {
        console.error(`[ERROR] fal Gemini TTS failed: ${error.message}`);
        return null;
    }
}

async function _generateNarrationFalMinimax(plainText, tts) {
    if (!process.env.FAL_KEY) {
        console.error('[ERROR] FAL_KEY is not set. Cannot generate narration via fal.ai.');
        return null;
    }
    const truncated = plainText.length > 5000 ? plainText.substring(0, 5000) : plainText;
    console.log(`[TTS] fal MiniMax TTS: voice=${tts.fal_minimax_voice} speed=${tts.fal_minimax_speed}`);
    try {
        const result = await fal.subscribe('fal-ai/minimax/speech-02-hd', {
            input: {
                text: truncated,
                voice_setting: { voice_id: tts.fal_minimax_voice, speed: tts.fal_minimax_speed },
                output_format: 'url',
            },
            logs: false,
        });
        const audioUrl = result?.data?.audio?.url;
        if (!audioUrl) { console.error('[ERROR] fal MiniMax TTS returned no audio URL'); return null; }
        const audioResponse = await axios.get(audioUrl, { responseType: 'arraybuffer' });
        const s3Url = await uploadToS3(Buffer.from(audioResponse.data), 'sunday-editions/audio', `sunday-edition-${uuidv4()}.mp3`, 'audio/mpeg');
        if (!s3Url) { console.error('[ERROR] Failed to upload fal MiniMax audio to S3'); return null; }
        return { type: 'url', url: s3Url };
    } catch (error) {
        console.error(`[ERROR] fal MiniMax TTS failed: ${error.message}`);
        return null;
    }
}

/**
 * Generate multi-speaker podcast narration via fal.ai Gemini TTS.
 * Uses the speakers array for two-host dialogue.
 * @param {string} podcastScript - Formatted script with "SpeakerId: dialogue" lines
 * @returns {{ type: 'url', url: string } | null}
 */
async function _generateNarrationFalGeminiPodcast(podcastScript) {
    if (!process.env.FAL_KEY) {
        console.error('[ERROR] FAL_KEY is not set. Cannot generate podcast narration via fal.ai.');
        return null;
    }
    const podcastConfig = getPodcastSettings();
    const truncated = podcastScript.length > 45000 ? podcastScript.substring(0, 45000) : podcastScript;
    if (podcastScript.length > 45000) {
        console.warn(`[WARNING] Truncating podcast script from ${podcastScript.length} to 45000 chars.`);
    }
    console.log(`[TTS] fal Gemini TTS Podcast: host1=${podcastConfig.host1_voice}(${podcastConfig.host1_id}), host2=${podcastConfig.host2_voice}(${podcastConfig.host2_id}), model=${podcastConfig.gemini_model}, script=${truncated.length} chars`);
    try {
        const result = await fal.subscribe('fal-ai/gemini-tts', {
            input: {
                prompt: truncated,
                speakers: [
                    { voice: podcastConfig.host1_voice, speaker_id: podcastConfig.host1_id },
                    { voice: podcastConfig.host2_voice, speaker_id: podcastConfig.host2_id },
                ],
                model: podcastConfig.gemini_model || 'gemini-2.5-flash-tts',
                style_instructions: podcastConfig.style_instructions || '',
                temperature: podcastConfig.temperature || 1.0,
                output_format: 'mp3',
            },
            logs: false,
        });
        const audioUrl = result?.data?.audio?.url;
        if (!audioUrl) { console.error('[ERROR] fal Gemini TTS Podcast returned no audio URL'); return null; }
        const audioResponse = await axios.get(audioUrl, { responseType: 'arraybuffer' });
        const s3Url = await uploadToS3(Buffer.from(audioResponse.data), 'sunday-editions/audio', `sunday-edition-podcast-${uuidv4()}.mp3`, 'audio/mpeg');
        if (!s3Url) { console.error('[ERROR] Failed to upload podcast audio to S3'); return null; }
        return { type: 'url', url: s3Url };
    } catch (error) {
        console.error(`[ERROR] fal Gemini TTS Podcast failed: ${error.message}`);
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

        const podcastConfig = getPodcastSettings();
        const isPodcast = podcastConfig.format === 'podcast';
        let summary, podcastScript = null, editionFormat = 'monologue';

        if (isPodcast) {
            // PODCAST MODE: Generate two-host script, then derive display summary
            console.log('[INFO] Generating podcast script (two-host format)...');
            podcastScript = await aiService.generatePodcastScript(articles);
            if (!podcastScript || podcastScript === 'Podcast script generation failed.' || podcastScript === 'No sufficient article content.') {
                console.error('Failed to generate podcast script. Aborting Sunday Edition generation.');
                await client.query('ROLLBACK');
                return { success: false, message: 'Failed to generate podcast script.' };
            }
            console.log(`[INFO] Podcast script generated: ${podcastScript.length} chars`);

            console.log('[INFO] Generating display summary from podcast script...');
            summary = await aiService.generatePodcastDisplaySummary(podcastScript);
            if (!summary || summary === 'Summary generation failed.') {
                console.warn('[WARN] Failed to generate display summary, using fallback.');
                summary = 'This week on The Mango Rundown, Kayo and Nala discuss the latest news from the Turks and Caicos Islands. Listen to the full episode above.';
            }
            editionFormat = 'podcast';
        } else {
            // MONOLOGUE MODE: Existing single-narrator pipeline
            summary = await generateSundayEditionSummary(articles);
            if (summary === "Summary generation failed.") {
                console.error('Failed to generate summary. Aborting Sunday Edition generation.');
                await client.query('ROLLBACK');
                return { success: false, message: 'Failed to generate summary.' };
            }
        }

        console.log('[INFO] Attempting to generate narration...');
        let narrationResult;
        if (isPodcast) {
            // Podcast mode always uses Gemini TTS multi-speaker
            narrationResult = await _generateNarrationFalGeminiPodcast(podcastScript);
        } else {
            narrationResult = await generateNarration(summary);
        }
        if (!narrationResult) {
            console.error('Failed to generate narration. Aborting Sunday Edition generation.');
            await client.query('ROLLBACK');
            return { success: false, message: 'Failed to initiate narration generation.' };
        }
        // async provider (UnrealSpeech): stores taskId, URL set later via callback
        // sync provider (fal.ai): stores URL immediately, no taskId
        const unrealSpeechTaskId = narrationResult.type === 'task' ? narrationResult.id : null;
        const narrationUrl      = narrationResult.type === 'url'  ? narrationResult.url : null;
        console.log(`[INFO] Narration result: type=${narrationResult.type} id=${unrealSpeechTaskId || narrationResult.url}`);

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
                SET title = $1, summary = $2, narration_url = $3, image_url = $4,
                    unreal_speech_task_id = $5, podcast_script = $6, edition_format = $7,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $8
                RETURNING id;
            `;
            const result = await client.query(updateQuery, [title, summary, narrationUrl, imageUrl, unrealSpeechTaskId, podcastScript, editionFormat, editionId]);
            newEditionId = result.rows[0].id;
        } else {
            // Edition does not exist, insert new one
            console.log('No Sunday Edition for today found. Inserting new one.');
            const insertQuery = `
                INSERT INTO sunday_editions (title, summary, narration_url, image_url, publication_date, unreal_speech_task_id, podcast_script, edition_format)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id;
            `;
            const result = await client.query(insertQuery, [title, summary, narrationUrl, imageUrl, today, unrealSpeechTaskId, podcastScript, editionFormat]);
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
    _generateNarrationFalGeminiPodcast,
    generateAIImage,
    generateAITranslation,
    uploadToS3
};
