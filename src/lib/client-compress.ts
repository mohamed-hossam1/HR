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
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 0.82,
  maxAllowedSizeBytes: 5 * 1024 * 1024, // 5 MiB
};

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

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

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("تعذر قراءة ملف الصورة. يرجى إعادة المحاولة."));
    };

    reader.onload = (event) => {
      const img = new Image();

      img.onerror = () => {
        reject(new Error("الملف المحدد ليس صورة صالحة أو أنه تالف."));
      };

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate proportional scale down (no upscaling)
        if (width > (opts.maxWidth || 2048) || height > (opts.maxHeight || 2048)) {
          const ratio = Math.min(
            (opts.maxWidth || 2048) / width,
            (opts.maxHeight || 2048) / height
          );
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("تعذر تهيئة معالج الصور في المتصفح."));
          return;
        }

        // Use high quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Prefer WebP or JPEG for optimal compression
        const outputMime = file.type === "image/png" ? "image/png" : "image/jpeg";

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("فشل ضغط الصورة. يرجى تجربة صورة أخرى."));
              return;
            }

            // Check if final size is within the allowed limit (5 MiB)
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
            const ext = outputMime === "image/png" ? "png" : "jpg";
            const compressedFile = new File([blob], `${baseName}.${ext}`, {
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
          opts.quality
        );
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
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
