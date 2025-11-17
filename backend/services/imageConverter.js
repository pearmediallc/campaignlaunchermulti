const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

class ImageConverter {
  /**
   * Convert any image to JPEG format for Facebook compatibility
   * Facebook prefers JPEG/PNG formats
   */
  static async convertToFacebookFormat(inputPath) {
    try {
      const outputDir = path.dirname(inputPath);
      const baseName = path.basename(inputPath, path.extname(inputPath));
      const outputPath = path.join(outputDir, `${baseName}-fb.jpg`);

      // Build sharp pipeline with error handling for each step
      let pipeline = sharp(inputPath, {
        failOnError: false, // Don't fail on minor issues
        limitInputPixels: false // Allow large images
      });

      // Try to auto-rotate based on EXIF
      try {
        pipeline = pipeline.rotate();
      } catch (rotateError) {
        console.log('Could not auto-rotate, continuing without rotation');
      }

      // Resize to Facebook's recommended size
      pipeline = pipeline.resize(1080, 1080, {
        fit: 'cover',
        position: 'center',
        withoutEnlargement: true // Don't upscale small images
      });

      // Convert to JPEG
      pipeline = pipeline.jpeg({
        quality: 90,
        progressive: false,
        mozjpeg: true
      });

      // Save the converted image
      await pipeline.toFile(outputPath);

      console.log(`✅ Image converted successfully: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error('Image conversion error:', error.message);

      // As a last resort, try a simple copy if it's already a JPEG
      const ext = path.extname(inputPath).toLowerCase();
      if (ext === '.jpg' || ext === '.jpeg') {
        console.log('Returning original JPEG without conversion');
        return inputPath;
      }

      return null; // Conversion failed
    }
  }
  
  /**
   * Check if image meets minimum dimension requirements
   * @param {string} imagePath - Path to the image file
   * @param {number} minWidth - Minimum width in pixels (default 600)
   * @param {number} minHeight - Minimum height in pixels (default 600)
   * @returns {Object|null} - Returns {width, height, valid} or null if error
   */
  static async checkImageDimensions(imagePath, minWidth = 600, minHeight = 600) {
    try {
      if (!fs.existsSync(imagePath)) {
        console.error(`Image file not found: ${imagePath}`);
        return null;
      }

      const metadata = await sharp(imagePath).metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      const valid = width >= minWidth && height >= minHeight;

      if (!valid) {
        console.log(`⚠️ Image ${path.basename(imagePath)} dimensions (${width}x${height}) don't meet minimum requirements (${minWidth}x${minHeight})`);
      }

      return { width, height, valid };
    } catch (error) {
      console.error(`Failed to check dimensions for ${imagePath}:`, error.message);
      return null;
    }
  }

  /**
   * Validate and prepare image for Facebook upload
   */
  static async prepareForFacebook(imagePath) {
    try {
      // First check if file exists
      if (!fs.existsSync(imagePath)) {
        console.error(`Image file not found: ${imagePath}`);
        return null;
      }

      const stats = fs.statSync(imagePath);
      const fileSizeInMB = stats.size / (1024 * 1024);

      // Check file size
      if (fileSizeInMB === 0) {
        console.error(`Image file is empty: ${imagePath}`);
        return null;
      }

      console.log(`Processing image: ${path.basename(imagePath)}`);
      console.log(`File size: ${fileSizeInMB.toFixed(2)}MB`);

      // Try to get image metadata with better error handling
      let metadata;
      try {
        metadata = await sharp(imagePath).metadata();
        console.log(`Original format detected: ${metadata.format}`);
      } catch (metadataError) {
        console.error(`Failed to read image metadata: ${metadataError.message}`);

        // Try to identify format from file extension
        const ext = path.extname(imagePath).toLowerCase();
        console.log(`File extension: ${ext}`);

        // If it's a common image format, try to convert it anyway
        if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'].includes(ext)) {
          console.log('Attempting to convert based on file extension...');
          return await this.convertToFacebookFormat(imagePath);
        }

        // If not a recognized format, fail
        console.error(`Unsupported image format: ${ext}`);
        return null;
      }

      // Always convert to ensure compatibility
      console.log(`Converting to JPEG for Facebook compatibility...`);
      return await this.convertToFacebookFormat(imagePath);

    } catch (error) {
      console.error('Image preparation error:', error);
      return null;
    }
  }
}

module.exports = ImageConverter;