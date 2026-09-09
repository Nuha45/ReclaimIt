import { useCallback, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ImageUploadProps {
  images: File[];
  onChange: (files: File[]) => void;
  maxImages?: number;
  error?: string;
}

export default function ImageUpload({ images, onChange, maxImages = 5, error }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const newFiles = Array.from(files).slice(0, maxImages - images.length);
      const updated = [...images, ...newFiles];
      onChange(updated);

      newFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviews((prev) => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    },
    [images, maxImages, onChange]
  );

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {previews.map((preview, i) => (
          <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-border group">
            <img src={preview} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        ))}
        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              'w-24 h-24 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1',
              'text-text-muted hover:border-accent/50 hover:text-accent transition-colors cursor-pointer'
            )}
          >
            <ImagePlus className="w-6 h-6" />
            <span className="text-xs">Add photo</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="text-xs text-text-muted">Up to {maxImages} images, max 5MB each (JPEG, PNG, GIF, WebP)</p>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
