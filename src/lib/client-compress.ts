export interface CompressedImageResult {
  file: File;
  previewUrl: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  reductionPercentage: number;
}

export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxAllowedSizeBytes?: number;
}

const DEFAULT_OPTIONS: CompressImageOptions = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.78,
  maxAllowedSizeBytes: 5 * 1024 * 1024, // 5 MiB
};

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

/**
 * Loads an image from a File blob using createImageBitmap (fastest, off-thread)
 * or falling back to URL.createObjectURL (fast, no base64 memory overhead).
 */
async function loadImageElement(
  file: File
): Promise<{ source: ImageBitmap | HTMLImageElement; width: number; height: number; cleanup: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close?.(),
      };
    } catch {
      // Fallback to HTMLImageElement if createImageBitmap fails on some formats
    }
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("الملف المحدد ليس صورة صالحة أو أنه تالف."));
    };

    img.onload = () => {
      resolve({
        source: img,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        cleanup: () => URL.revokeObjectURL(objectUrl),
      });
    };

    img.src = objectUrl;
  });
}

/**
 * Validates and compresses an image file in the browser using HTML5 Canvas.
 * Ensures text legibility for documents while significantly reducing file size.
 */
export async function compressClientImage(
  file: File,
  options: CompressImageOptions = {}
): Promise<CompressedImageResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    throw new Error(
      "صيغة الملف غير مدعومة. يسمح فقط برفع الصور من نوع (JPG, PNG, WebP)."
    );
  }

  const { source, width: origWidth, height: origHeight, cleanup } = await loadImageElement(file);

  try {
    let width = origWidth;
    let height = origHeight;

    const maxW = opts.maxWidth || 1600;
    const maxH = opts.maxHeight || 1600;

    // Calculate proportional scale down (no upscaling)
    if (width > maxW || height > maxH) {
      const ratio = Math.min(maxW / width, maxH / height);
      width = Math.max(1, Math.round(width * ratio));
      height = Math.max(1, Math.round(height * ratio));
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("تعذر تهيئة معالج الصور في المتصفح.");
    }

    // Fill white background for transparent PNG/WebP so converting to JPEG looks perfect
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "medium";
    ctx.drawImage(source, 0, 0, width, height);

    // Standardize output to image/jpeg for highest compression and speed
    const outputMime = "image/jpeg";

    return await new Promise<CompressedImageResult>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("فشل ضغط الصورة. يرجى تجربة صورة أخرى."));
            return;
          }

          if (blob.size > (opts.maxAllowedSizeBytes || 5 * 1024 * 1024)) {
            reject(
              new Error(
                `حجم الصورة بعد الضغط (${(blob.size / (1024 * 1024)).toFixed(
                  1
                )} ميجابايت) يتجاوز الحد الأقصى المسموح به (5 ميجابايت).`
              )
            );
            return;
          }

          const fileNameParts = file.name.split(".");
          const baseName = fileNameParts.slice(0, -1).join(".") || "image";
          const compressedFile = new File([blob], `${baseName}.jpg`, {
            type: outputMime,
            lastModified: Date.now(),
          });

          const previewUrl = URL.createObjectURL(blob);
          const reduction = Math.max(
            0,
            Math.round(((file.size - blob.size) / file.size) * 100)
          );

          resolve({
            file: compressedFile,
            previewUrl,
            originalSize: file.size,
            compressedSize: blob.size,
            width,
            height,
            reductionPercentage: reduction,
          });
        },
        outputMime,
        opts.quality || 0.78
      );
    });
  } finally {
    cleanup();
  }
}

/**
 * Format bytes to readable Arabic file size string (e.g. "1.2 ميجابايت" or "450 كيلوبايت").
 */
export function formatBytesArabic(bytes: number): string {
  if (bytes === 0) return "0 بايت";
  const k = 1024;
  const sizes = ["بايت", "كيلوبايت", "ميجابايت", "جيجابايت"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
