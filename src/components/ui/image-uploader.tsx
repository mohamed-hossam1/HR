"use client";

import React, { useState } from "react";
import { compressClientImage, formatBytesArabic } from "@/lib/client-compress";
import { UploadCloud, X, CheckCircle, AlertTriangle, Loader2, Image as ImageIcon } from "lucide-react";

export interface UploadedAttachment {
  ticketToken: string;
  fieldId: string;
  storageKey: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  previewUrl: string;
  originalSize: number;
}

interface ImageUploaderProps {
  fieldId: string;
  label: string;
  description?: string;
  required?: boolean;
  maxImages?: number;
  totalCurrentImages: number;
  maxTotalAllowed?: number;
  attachments: UploadedAttachment[];
  onAttachmentsChange: (newAttachments: UploadedAttachment[]) => void;
  error?: string;
}

export function ImageUploader({
  fieldId,
  label,
  description,
  required,
  maxImages = 1,
  totalCurrentImages,
  maxTotalAllowed = 10,
  attachments,
  onAttachmentsChange,
  error,
}: ImageUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const fieldAttachments = attachments.filter((a) => a.fieldId === fieldId);
  const remainingGlobalSlots = Math.max(0, maxTotalAllowed - totalCurrentImages);
  const canUploadMore =
    fieldAttachments.length < maxImages && remainingGlobalSlots > 0 && !isProcessing;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLocalError(null);

    // Limit files by remaining slots
    const availableSlots = Math.min(
      maxImages - fieldAttachments.length,
      remainingGlobalSlots
    );

    if (availableSlots <= 0) {
      setLocalError(`لقد وصلت للحد الأقصى للصور (${maxTotalAllowed} صور).`);
      return;
    }

    const filesToProcess = Array.from(files).slice(0, availableSlots);
    setIsProcessing(true);

    try {
      const newItems: UploadedAttachment[] = [];

      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        setUploadStatus(`جاري تحسين وضغط الصورة (${i + 1} من ${filesToProcess.length})...`);

        // 1. Client-side compression
        const compressed = await compressClientImage(file);

        setUploadStatus(`جاري رفع الصورة إلى التخزين الآمن...`);

        // 2. Request upload ticket
        const ticketRes = await fetch("/api/upload/ticket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: compressed.file.name,
            mimeType: compressed.file.type,
            fileSize: compressed.compressedSize,
            uploaderType: "employee",
          }),
        });

        if (!ticketRes.ok) {
          const errData = await ticketRes.json().catch(() => ({}));
          throw new Error(errData.error || "فشل الحصول على تصريح رفع الملف");
        }

        const ticket = await ticketRes.json();

        // 3. Upload directly via PUT to Backblaze / Storage with proxy fallback
        let isUploaded = false;

        try {
          const uploadRes = await fetch(ticket.uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": compressed.file.type,
            },
            body: compressed.file,
          });
          if (uploadRes.ok) {
            isUploaded = true;
          }
        } catch (s3Err) {
          console.warn("Direct image upload hit browser restriction, using secure fallback:", s3Err);
        }

        if (!isUploaded) {
          const formData = new FormData();
          formData.append("file", compressed.file);
          formData.append("ticketToken", ticket.ticketToken);
          formData.append("storageKey", ticket.storageKey);

          const fallbackRes = await fetch("/api/upload/direct", {
            method: "POST",
            body: formData,
          });

          if (!fallbackRes.ok) {
            const errJson = await fallbackRes.json().catch(() => ({}));
            throw new Error(errJson.error || "فشل إرسال ملف الصورة إلى التخزين السحابي.");
          }
        }

        newItems.push({
          ticketToken: ticket.ticketToken,
          fieldId,
          storageKey: ticket.storageKey,
          filename: compressed.file.name,
          fileSize: compressed.compressedSize,
          mimeType: compressed.file.type,
          previewUrl: compressed.previewUrl,
          originalSize: compressed.originalSize,
        });
      }

      onAttachmentsChange([...attachments, ...newItems]);
      setUploadStatus(null);
    } catch (err: any) {
      console.error("Upload error:", err);
      setLocalError(err.message || "حدث خطأ أثناء معالجة أو رفع الصورة.");
    } finally {
      setIsProcessing(false);
      setUploadStatus(null);
      // Reset input value
      e.target.value = "";
    }
  };

  const handleRemove = (storageKey: string) => {
    const updated = attachments.filter((a) => a.storageKey !== storageKey);
    onAttachmentsChange(updated);
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-slate-800">
          {label} {required && <span className="text-rose-600">*</span>}
        </label>
        <span className="text-xs text-slate-500 font-medium">
          {fieldAttachments.length} من {maxImages}
        </span>
      </div>

      {description && <p className="text-xs text-slate-500">{description}</p>}

      {/* Uploaded Previews */}
      {fieldAttachments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {fieldAttachments.map((item) => (
            <div
              key={item.storageKey}
              className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-slate-50 relative group"
            >
              <img
                src={item.previewUrl}
                alt={item.filename}
                className="w-14 h-14 object-cover rounded-lg border border-slate-200 bg-white"
              />
              <div className="flex-1 min-w-0 text-xs">
                <p className="font-medium text-slate-800 truncate">{item.filename}</p>
                <p className="text-slate-500 mt-0.5">
                  تم الضغط:{" "}
                  <span className="text-emerald-700 font-semibold">
                    {formatBytesArabic(item.fileSize)}
                  </span>
                  {item.originalSize > item.fileSize && (
                    <span className="text-slate-400 line-through mr-1">
                      ({formatBytesArabic(item.originalSize)})
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-1 text-emerald-600 mt-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>تم الرفع بنجاح</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(item.storageKey)}
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                title="حذف الصورة"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button / Dropzone */}
      {canUploadMore && (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-700 hover:bg-blue-50/50 rounded-2xl p-4 cursor-pointer transition-colors text-center group">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple={maxImages > 1}
            onChange={handleFileChange}
            disabled={isProcessing}
            className="hidden"
          />
          {isProcessing ? (
            <div className="flex flex-col items-center py-2">
              <Loader2 className="w-6 h-6 text-blue-900 animate-spin mb-1" />
              <p className="text-xs text-blue-900 font-medium">{uploadStatus}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center py-1">
              <UploadCloud className="w-7 h-7 text-slate-400 group-hover:text-blue-900 transition-colors mb-1" />
              <p className="text-xs font-semibold text-slate-700 group-hover:text-blue-900">
                اضغط لاختيار أو تصوير الصورة
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                (JPG, PNG, WebP — بحد أقصى 5 ميجابايت مع الضغط التلقائي)
              </p>
            </div>
          )}
        </label>
      )}

      {/* Status / Errors */}
      {(error || localError) && (
        <div className="flex items-center gap-1 text-xs text-rose-600 font-medium mt-1">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{error || localError}</span>
        </div>
      )}
    </div>
  );
}
