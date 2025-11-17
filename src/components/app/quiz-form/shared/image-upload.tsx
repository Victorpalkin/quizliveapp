import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { FormControl, FormItem, FormLabel } from '@/components/ui/form';
import { ImagePlus, ImageOff } from 'lucide-react';

interface ImageUploadProps {
  imageUrl?: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
  questionNumber: number;
}

export function ImageUpload({ imageUrl, onUpload, onRemove, questionNumber }: ImageUploadProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <FormItem>
      <FormLabel>Image (Optional)</FormLabel>
      <FormControl>
        <div className="flex items-center gap-4">
          {imageUrl ? (
            <div className="relative w-32 h-20 rounded-md overflow-hidden">
              <Image
                src={imageUrl}
                alt={`Preview for question ${questionNumber}`}
                fill
                style={{ objectFit: 'cover' }}
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 z-10"
                onClick={onRemove}
                type="button"
              >
                <ImageOff className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <label className="cursor-pointer flex flex-col items-center justify-center w-32 h-20 border-2 border-dashed rounded-md hover:bg-muted">
              <ImagePlus className="h-8 w-8 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Upload</span>
              <input
                type="file"
                className="hidden"
                accept="image/png, image/jpeg, image/gif"
                onChange={handleFileChange}
              />
            </label>
          )}
        </div>
      </FormControl>
    </FormItem>
  );
}
