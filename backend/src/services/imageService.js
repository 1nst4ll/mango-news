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
const { v4: uuidv4 } = require('uuid');

// Import centralized AI service for prompt optimization and shared utilities
const aiService = require('./aiService');
const { getAiModels, getImageSettingsForModel } = require('../configLoader');

// Import shared S3 service
const { uploadToS3 } = require('./s3Service');

// Configure fal.ai client
fal.config({
  credentials: process.env.FAL_KEY
});

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Model is loaded dynamically from DB via configLoader.getAiModels().IMAGE
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
// MODEL INPUT BUILDER
// ============================================================================

/**
 * Build a model-specific input object from stored settings.
 * Each model has different parameter names — this maps them correctly.
 */
function buildModelInput(modelId, prompt, settings) {
  const base = { prompt };

  // Models using aspect_ratio instead of image_size (Google models)
  const usesAspectRatio = ['fal-ai/imagen4', 'fal-ai/nano-banana-2'].includes(modelId);

  // Models using fixed image_size strings like "1024x1024" (GPT Image)
  const usesGptImageSize = modelId === 'fal-ai/gpt-image-1.5';

  if (usesAspectRatio) {
    if (settings.aspect_ratio)    base.aspect_ratio    = settings.aspect_ratio;
    if (settings.resolution)      base.resolution      = settings.resolution;
    if (settings.safety_tolerance != null) base.safety_tolerance = settings.safety_tolerance;
    if (settings.output_format)   base.output_format   = settings.output_format;
    if (settings.num_images)      base.num_images      = settings.num_images;
    // nano-banana extras
    if (settings.thinking_level)  base.thinking_level  = settings.thinking_level;
    if (settings.enable_web_search != null) base.enable_web_search = settings.enable_web_search;
  } else if (usesGptImageSize) {
    if (settings.image_size)      base.image_size      = settings.image_size;
    if (settings.quality)         base.quality         = settings.quality;
    if (settings.background)      base.background      = settings.background;
    if (settings.output_format)   base.output_format   = settings.output_format;
    if (settings.num_images)      base.num_images      = settings.num_images;
  } else {
    // All other models (FLUX, Ideogram, Recraft)
    if (settings.image_size) {
      base.image_size = settings.image_size === 'custom'
        ? { width: settings.image_width || 1280, height: settings.image_height || 720 }
        : settings.image_size;
    }
    if (settings.guidance_scale != null)       base.guidance_scale       = settings.guidance_scale;
    if (settings.num_inference_steps != null)  base.num_inference_steps  = settings.num_inference_steps;
    if (settings.safety_tolerance != null)     base.safety_tolerance     = settings.safety_tolerance;
    if (settings.enable_safety_checker != null) base.enable_safety_checker = settings.enable_safety_checker;
    if (settings.output_format)                base.output_format        = settings.output_format;
    if (settings.num_images)                   base.num_images           = settings.num_images;
    if (settings.enhance_prompt != null)       base.enhance_prompt       = settings.enhance_prompt;
    // Ideogram-specific
    if (settings.style && modelId.includes('ideogram'))         base.style           = settings.style;
    if (settings.rendering_speed)                               base.rendering_speed = settings.rendering_speed;
    if (settings.expand_prompt != null)                         base.expand_prompt   = settings.expand_prompt;
    if (settings.negative_prompt != null)                       base.negative_prompt = settings.negative_prompt;
    // Recraft-specific
    if (settings.style && modelId.includes('recraft'))         base.style           = settings.style;
  }

  return base;
}

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
      const imageModel = getAiModels().IMAGE;
      const modelSettings = getImageSettingsForModel(imageModel);
      console.log(`[Image Service] Generating image with model: ${imageModel}`, modelSettings);

      const input = buildModelInput(imageModel, optimizedPrompt, modelSettings);

      const result = await fal.subscribe(imageModel, {
        input,
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
      const outputFormat = modelSettings.output_format || 'jpeg';
      const contentType = imageData.content_type || `image/${outputFormat}`;
      const fileExtension = outputFormat;
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
