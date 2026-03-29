/**
 * Shared S3 Upload Service
 *
 * Provides a single S3 client and upload function used by
 * imageService.js and sundayEditionGenerator.js.
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload buffer to S3
 * @param {Buffer} buffer - File buffer
 * @param {string} folder - S3 folder path
 * @param {string} filename - File name
 * @param {string} contentType - MIME type
 * @returns {Promise<string|null>} - S3 URL or null on failure
 */
async function uploadToS3(buffer, folder, filename, contentType) {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `${folder}/${filename}`,
    Body: buffer,
    ContentType: contentType,
  };

  try {
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    const s3Url = `https://${params.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
    console.log(`[S3] Uploaded: ${s3Url}`);
    return s3Url;
  } catch (error) {
    console.error(`[S3] Error uploading ${folder}/${filename}: ${error.message}`);
    return null;
  }
}

module.exports = { s3Client, uploadToS3 };
