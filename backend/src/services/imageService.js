/**
 * Image Generation Service
 *
 * Centralized service for AI image generation using fal.ai
 * Model: fal-ai/flux-2/turbo (FLUX.2 Dev Turbo)
 *
 * Features:
 * - Uses fal.ai FLUX.2 Turbo for ultra-fast, high-quality generation (~6s per image)
 * - 6x faster than standard models with 8-step distilled inference
 * - Automatic S3 upload for generated images
 * - Integration with AI service for TCI-specific prompt optimization
 * - Shared retry logic from AI service
 */

const { fal } = require('@fal-ai/client');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

// Import centralized AI service for prompt optimization and shared utilities
const aiService = require('./aiService');

// Configure fal.ai client
fal.config({
  credentials: process.env.FAL_KEY
});

// Configure AWS S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // fal.ai model configuration
  // Using FLUX.2 Turbo for ultra-fast generation (~6s per image, 8-step distilled inference)
  // Alternative models: 'fal-ai/flux-2' (dev), 'fal-ai/flux-2-pro' (highest quality)
  MODEL: process.env.FAL_IMAGE_MODEL || 'fal-ai/flux-2/turbo',
  // Image dimensions - using preset for better compatibility with FLUX.2
  // Options: square_hd, square, portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9
  IMAGE_SIZE: process.env.FAL_IMAGE_SIZE || 'landscape_16_9',
  // Legacy dimension support (used if IMAGE_SIZE is 'custom')
  IMAGE_WIDTH: parseInt(process.env.FAL_IMAGE_WIDTH) || 1280,
  IMAGE_HEIGHT: parseInt(process.env.FAL_IMAGE_HEIGHT) || 720,
  // Retry configuration (uses AI service defaults if not specified)
  MAX_RETRIES: parseInt(process.env.FAL_MAX_RETRIES) || aiService.CONFIG.MAX_RETRIES,
  RETRY_DELAY_MS: parseInt(process.env.FAL_RETRY_DELAY) || aiService.CONFIG.RETRY_DELAY_MS,
  // Guidance scale for classifier-free guidance (default 2.5 for FLUX.2)
  GUIDANCE_SCALE: parseFloat(process.env.FAL_GUIDANCE_SCALE) || 2.5,
  // Output format: jpeg, png, or webp
  OUTPUT_FORMAT: process.env.FAL_OUTPUT_FORMAT || 'jpeg',
};

// ============================================================================
// S3 UPLOAD
// ============================================================================

/**
 * Upload buffer to S3
 * @param {Buffer} buffer - Image buffer
 * @param {string} folder - S3 folder path
 * @param {string} filename - File name
 * @param {string} contentType - MIME type
 * @returns {Promise<string|null>} - S3 URL or null on failure
 */
const uploadToS3 = async (buffer, folder, filename, contentType) => {
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
    console.log(`[Image Service] Uploaded to S3: ${s3Url}`);
    return s3Url;
  } catch (error) {
    console.error(`[Image Service] Error uploading to S3 (${folder}/${filename}): ${error.message}`);
    return null;
  }
};

// ============================================================================
// CORE IMAGE GENERATION
// ============================================================================

/**
 * Generate AI image using fal.ai FLUX.2 Turbo model
 * @param {string} title - Article title (for logging context)
 * @param {string} summary - Article summary or content for prompt generation
 * @param {string} folder - S3 folder for upload (default: 'ai-images')
 * @returns {Promise<string|null>} - S3 URL of generated image or null on failure
 */
const generateAIImage = async (title, summary, folder = 'ai-images') => {
  console.log('[Image Service] Attempting to generate AI image using fal.ai FLUX.2 Turbo...');

  if (!process.env.FAL_KEY) {
    console.warn('[Image Service] FAL_KEY is not set. Skipping AI image generation.');
    return null;
  }

  try {
    // Use centralized AI service for TCI-specific prompt optimization
    console.log('[Image Service] Optimizing image prompt using AI service...');
    const optimizedPrompt = await aiService.optimizeImagePrompt(summary);
    console.log(`[Image Service] Optimized prompt: ${optimizedPrompt.substring(0, 100)}...`);

    // Use shared withRetry from AI service
    return await aiService.withRetry(async () => {
      console.log(`[Image Service] Generating image with fal.ai model: ${CONFIG.MODEL}`);
      console.log(`[Image Service] Settings: ${CONFIG.IMAGE_SIZE}, guidance ${CONFIG.GUIDANCE_SCALE}`);

      // Build image_size parameter - use preset string or custom dimensions
      const imageSize = CONFIG.IMAGE_SIZE === 'custom'
        ? { width: CONFIG.IMAGE_WIDTH, height: CONFIG.IMAGE_HEIGHT }
        : CONFIG.IMAGE_SIZE;

      const result = await fal.subscribe(CONFIG.MODEL, {
        input: {
          prompt: optimizedPrompt,
          image_size: imageSize,
          guidance_scale: CONFIG.GUIDANCE_SCALE,
          num_images: 1,
          enable_safety_checker: true,
          output_format: CONFIG.OUTPUT_FORMAT,
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === 'IN_PROGRESS') {
            update.logs?.map((log) => log.message).forEach((msg) => {
              if (msg) console.log(`[Image Service] ${msg}`);
            });
          }
        },
      });

      console.log('[Image Service] fal.ai response received');

      if (!result.data?.images || result.data.images.length === 0) {
        console.warn('[Image Service] fal.ai response did not contain images');
        return null;
      }

      const imageData = result.data.images[0];
      const imageUrl = imageData.url;
      console.log(`[Image Service] Generated image: ${imageUrl} (${imageData.width}x${imageData.height})`);

      // Download the image
      console.log('[Image Service] Downloading generated image...');
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
      }

      const arrayBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Use content_type from response or determine from output format
      const contentType = imageData.content_type || `image/${CONFIG.OUTPUT_FORMAT}`;
      const fileExtension = CONFIG.OUTPUT_FORMAT;
      const filename = `${uuidv4()}.${fileExtension}`;

      // Upload to S3
      const s3Url = await uploadToS3(buffer, folder, filename, contentType);

      if (s3Url) {
        console.log(`[Image Service] AI image generated and uploaded successfully: ${s3Url}`);
      }

      return s3Url;
    }, CONFIG.MAX_RETRIES, CONFIG.RETRY_DELAY_MS, 'Image Service');

  } catch (error) {
    console.error(`[Image Service] Error generating AI image: ${error.message}`);
    return null;
  }
};

/**
 * Generate AI image for Sunday Edition
 * Uses a specific S3 folder for Sunday Edition images
 * @param {string} title - Edition title
 * @param {string} summary - Edition summary
 * @returns {Promise<string|null>} - S3 URL of generated image or null on failure
 */
const generateSundayEditionImage = async (title, summary) => {
  return generateAIImage(title, summary, 'sunday-editions/images');
};

/**
 * Generate AI image for article
 * Uses a specific S3 folder for article images
 * @param {string} title - Article title
 * @param {string} summary - Article summary or content
 * @returns {Promise<string|null>} - S3 URL of generated image or null on failure
 */
const generateArticleImage = async (title, summary) => {
  return generateAIImage(title, summary, 'articles/ai-images');
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  generateAIImage,
  generateSundayEditionImage,
  generateArticleImage,
  uploadToS3,
  CONFIG,
};
