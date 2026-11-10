/**
 * Client-side bill/receipt image compressor
 * Converts high-res camera photos (3-10MB) into lightweight JPEG data URLs (~60-90KB)
 * for instant, reliable Firestore storage and rendering across mobile & desktop.
 */
export interface CompressBillOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export async function compressBillImage(
  file: File,
  maxWidthOrOptions?: number | CompressBillOptions,
  maxHeightParam?: number,
  qualityParam?: number
): Promise<string> {
  let maxWidth = 1000;
  let maxHeight = 1000;
  let quality = 0.75;

  if (typeof maxWidthOrOptions === 'object' && maxWidthOrOptions !== null) {
    if (maxWidthOrOptions.maxWidth !== undefined) maxWidth = maxWidthOrOptions.maxWidth;
    if (maxWidthOrOptions.maxHeight !== undefined) maxHeight = maxWidthOrOptions.maxHeight;
    if (maxWidthOrOptions.quality !== undefined) quality = maxWidthOrOptions.quality;
  } else if (typeof maxWidthOrOptions === 'number') {
    maxWidth = maxWidthOrOptions;
    if (maxHeightParam !== undefined) maxHeight = maxHeightParam;
    if (qualityParam !== undefined) quality = qualityParam;
  }

  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file must be an image'));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        // Draw image with smooth scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };

      img.onerror = () => {
        reject(new Error('Failed to read image file'));
      };
    };

    reader.onerror = () => {
      reject(new Error('Failed to load image file'));
    };
  });
}
