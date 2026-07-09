"use client";
import { useCallback, useRef } from "react";
import { Upload, X, ImageIcon, Eye, EyeOff, Send } from "lucide-react";
import imageCompression from "browser-image-compression";

interface PhotoUploadProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  hideByDefault?: boolean;
  onRequestMore?: () => void;
}

export function PhotoUpload({ photos, onPhotosChange, maxPhotos = 4, hideByDefault = false, onRequestMore }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const maxReached = photos.length >= maxPhotos;

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || maxReached) return;
    const remaining = maxPhotos - photos.length;
    const toProcess = Array.from(files).slice(0, remaining);

    const compressed = await Promise.all(
      toProcess.map(async (file) => {
        const blob = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      })
    );

    onPhotosChange([...photos, ...compressed]);
  }, [photos, onPhotosChange, maxPhotos, maxReached]);

  const removePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-3">
        {photos.map((photo, i) => (
          <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-[var(--border)] group">
            <img
              src={photo}
              alt={`Photo ${i + 1}`}
              className={`w-full h-full object-cover transition ${hideByDefault ? "blur-md hover:blur-none" : ""}`}
            />
            <button
              type="button"
              onClick={() => removePhoto(i)}
              className="absolute top-1.5 right-1.5 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {!maxReached && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-[var(--border)] hover:border-[var(--primary)] flex flex-col items-center justify-center gap-1 text-[var(--text-secondary)] hover:text-[var(--primary)] transition"
          >
            <Upload size={20} />
            <span className="text-xs">Add</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {maxReached && onRequestMore && (
        <button
          type="button"
          onClick={onRequestMore}
          className="w-full flex items-center justify-center gap-2 text-xs text-[var(--primary)] bg-[var(--primary)]/5 rounded-xl py-2.5 hover:bg-[var(--primary)]/10 transition"
        >
          <Send size={12} /> Request to add more photos
        </button>
      )}
      <p className="text-xs text-[var(--text-secondary)]">
        {photos.length}/{maxPhotos} photos. JPG, PNG, WEBP. Max 1MB each.
      </p>
    </div>
  );
}
