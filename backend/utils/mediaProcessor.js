const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const path = require('path');
const fs = require('fs');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/**
 * Aspect ratio configurations
 * Maps ratio string to pixel dimensions
 */
const ASPECT_RATIOS = {
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '2:3': { width: 1080, height: 1620 }
};

/**
 * Process image with aspect ratio
 * @param {string} imagePath - Path to source image
 * @param {string} aspectRatio - Aspect ratio (e.g., '1:1', '16:9')
 * @returns {Promise<string>} - Path to processed image
 */
async function processImageAspectRatio(imagePath, aspectRatio = '1:1') {
  try {
    const dimensions = ASPECT_RATIOS[aspectRatio] || ASPECT_RATIOS['1:1'];

    // Generate output path
    const ext = path.extname(imagePath);
    const outputPath = imagePath.replace(ext, `_${aspectRatio.replace(':', 'x')}${ext}`);

    // Process image with sharp
    await sharp(imagePath)
      .resize(dimensions.width, dimensions.height, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 90 })
      .toFile(outputPath);

    console.log(`✅ Processed image to ${aspectRatio}:`, outputPath);
    return outputPath;
  } catch (error) {
    console.error('❌ Error processing image aspect ratio:', error);
    // Return original path if processing fails
    return imagePath;
  }
}

/**
 * Extract video thumbnail at specific frame
 * @param {string} videoPath - Path to source video
 * @param {number} frameIndex - Frame index to extract (0-11)
 * @returns {Promise<string>} - Path to extracted thumbnail
 */
async function extractVideoThumbnail(videoPath, frameIndex = 0) {
  return new Promise((resolve, reject) => {
    try {
      const outputPath = videoPath.replace(path.extname(videoPath), `_thumb_${frameIndex}.jpg`);

      // Get video duration first
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          console.error('❌ Error getting video metadata:', err);
          return reject(err);
        }

        const duration = metadata.format.duration;
        const frameInterval = Math.max(2, duration / 12); // Same as frontend
        const timestamp = frameIndex * frameInterval;

        // Get original video dimensions to preserve aspect ratio
        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        const originalWidth = videoStream?.width || 1920;
        const originalHeight = videoStream?.height || 1080;

        // Calculate thumbnail size preserving aspect ratio
        // Cap at 1920px max dimension while maintaining ratio
        let thumbWidth, thumbHeight;
        if (originalWidth >= originalHeight) {
          // Landscape or square
          thumbWidth = Math.min(originalWidth, 1920);
          thumbHeight = Math.round(thumbWidth * (originalHeight / originalWidth));
        } else {
          // Portrait (9:16 etc)
          thumbHeight = Math.min(originalHeight, 1920);
          thumbWidth = Math.round(thumbHeight * (originalWidth / originalHeight));
        }

        console.log(`📐 Video dimensions: ${originalWidth}x${originalHeight} -> Thumbnail: ${thumbWidth}x${thumbHeight}`);

        // Extract frame at timestamp, preserving original aspect ratio
        ffmpeg(videoPath)
          .screenshots({
            timestamps: [timestamp],
            filename: path.basename(outputPath),
            folder: path.dirname(outputPath),
            size: `${thumbWidth}x${thumbHeight}` // Preserve original aspect ratio
          })
          .on('end', () => {
            console.log(`✅ Extracted video thumbnail at ${timestamp}s:`, outputPath);
            resolve(outputPath);
          })
          .on('error', (err) => {
            console.error('❌ Error extracting video thumbnail:', err);
            reject(err);
          });
      });
    } catch (error) {
      console.error('❌ Error in extractVideoThumbnail:', error);
      reject(error);
    }
  });
}

/**
 * Process video thumbnail (from custom upload)
 * @param {string} thumbnailPath - Path to custom thumbnail image
 * @param {string} aspectRatio - Aspect ratio to process to
 * @returns {Promise<string>} - Path to processed thumbnail
 */
async function processVideoThumbnail(thumbnailPath, aspectRatio = '16:9') {
  try {
    // Video thumbnails typically use 16:9 or 1:1
    return await processImageAspectRatio(thumbnailPath, aspectRatio);
  } catch (error) {
    console.error('❌ Error processing video thumbnail:', error);
    return thumbnailPath;
  }
}

/**
 * Process video with aspect ratio
 * @param {string} videoPath - Path to source video
 * @param {string} aspectRatio - Aspect ratio (e.g., '1:1', '16:9')
 * @returns {Promise<string>} - Path to processed video
 */
async function processVideoAspectRatio(videoPath, aspectRatio = '16:9') {
  return new Promise((resolve, reject) => {
    try {
      const dimensions = ASPECT_RATIOS[aspectRatio] || ASPECT_RATIOS['16:9'];
      const ext = path.extname(videoPath);
      const outputPath = videoPath.replace(ext, `_${aspectRatio.replace(':', 'x')}${ext}`);

      // Process video with ffmpeg
      ffmpeg(videoPath)
        .size(`${dimensions.width}x${dimensions.height}`)
        .aspect(`${aspectRatio}`)
        .autopad('black')
        .output(outputPath)
        .on('end', () => {
          console.log(`✅ Processed video to ${aspectRatio}:`, outputPath);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('❌ Error processing video aspect ratio:', err);
          // Return original path if processing fails
          resolve(videoPath);
        })
        .run();
    } catch (error) {
      console.error('❌ Error in processVideoAspectRatio:', error);
      resolve(videoPath);
    }
  });
}

/**
 * Clean up temporary processed files
 * @param {string[]} filePaths - Array of file paths to delete
 */
async function cleanupProcessedFiles(filePaths) {
  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        console.log(`🗑️ Cleaned up processed file:`, filePath);
      }
    } catch (error) {
      console.error(`❌ Error cleaning up file ${filePath}:`, error);
    }
  }
}

module.exports = {
  processImageAspectRatio,
  extractVideoThumbnail,
  processVideoThumbnail,
  processVideoAspectRatio,
  cleanupProcessedFiles,
  ASPECT_RATIOS
};
