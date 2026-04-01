import React, { useCallback, useState } from 'react';
import { Button } from './button';
import { Card } from './card';
import { ImageIcon, Upload, X, File, FileText, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';

export interface MediaFile {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'document';
  name: string;
  size: number;
}

interface MediaUploadProps {
  onFilesChange: (files: MediaFile[]) => void;
  maxFiles?: number;
  maxSizePerFile?: number; // in MB
  acceptedTypes?: string[];
  mode?: 'compact' | 'full';
  showPreview?: boolean;
}

export function MediaUpload({
  onFilesChange,
  maxFiles = 5,
  maxSizePerFile = 10,
  acceptedTypes = ['image/*', 'application/pdf', '.doc', '.docx'],
  mode = 'compact',
  showPreview = true,
}: MediaUploadProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;

    const newFiles: MediaFile[] = [];
    const maxSizeBytes = maxSizePerFile * 1024 * 1024;

    Array.from(fileList).forEach((file) => {
      // Check file count
      if (files.length + newFiles.length >= maxFiles) {
        toast.error(`Máximo de ${maxFiles} arquivos permitidos`);
        return;
      }

      // Check file size
      if (file.size > maxSizeBytes) {
        toast.error(`${file.name} excede o tamanho máximo de ${maxSizePerFile}MB`);
        return;
      }

      // Determine file type
      const isImage = file.type.startsWith('image/');
      const type = isImage ? 'image' : 'document';

      // Create preview for images
      const reader = new FileReader();
      reader.onloadend = () => {
        const mediaFile: MediaFile = {
          id: `${Date.now()}-${Math.random()}`,
          file,
          preview: isImage ? (reader.result as string) : '',
          type,
          name: file.name,
          size: file.size,
        };

        setFiles((prev) => {
          const updated = [...prev, mediaFile];
          onFilesChange(updated);
          return updated;
        });
      };

      if (isImage) {
        reader.readAsDataURL(file);
      } else {
        const mediaFile: MediaFile = {
          id: `${Date.now()}-${Math.random()}`,
          file,
          preview: '',
          type: 'document',
          name: file.name,
          size: file.size,
        };
        setFiles((prev) => {
          const updated = [...prev, mediaFile];
          onFilesChange(updated);
          return updated;
        });
      }
    });
  }, [files.length, maxFiles, maxSizePerFile, onFilesChange]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFiles = e.dataTransfer.files;
      processFiles(droppedFiles);
    },
    [processFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      processFiles(e.target.files);
    },
    [processFiles]
  );

  const removeFile = useCallback(
    (id: string) => {
      setFiles((prev) => {
        const updated = prev.filter((f) => f.id !== id);
        onFilesChange(updated);
        return updated;
      });
    },
    [onFilesChange]
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (mode === 'compact') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="file"
            id="file-input-compact"
            className="hidden"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={handleFileInput}
          />
          <label htmlFor="file-input-compact">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => document.getElementById('file-input-compact')?.click()}
            >
              <Paperclip className="h-4 w-4" />
              Anexar
            </Button>
          </label>
          {files.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {files.length} arquivo(s)
            </span>
          )}
        </div>

        {showPreview && files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <AnimatePresence mode="popLayout">
              {files.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative group"
                >
                  {file.type === 'image' ? (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border bg-muted">
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => removeFile(file.id)}
                        className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs truncate max-w-[120px]">
                          {file.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                      <button
                        onClick={() => removeFile(file.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/50'}
        `}
      >
        <input
          type="file"
          id="file-input"
          className="hidden"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
        />
        
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          
          <div className="space-y-1">
            <p className="text-sm">
              Arraste e solte ou{' '}
              <label
                htmlFor="file-input"
                className="text-primary cursor-pointer hover:underline"
              >
                clique para selecionar
              </label>
            </p>
            <p className="text-xs text-muted-foreground">
              Máximo de {maxFiles} arquivos ({maxSizePerFile}MB cada)
            </p>
          </div>
        </div>
      </div>

      {showPreview && files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {files.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Card className="relative group overflow-hidden">
                  {file.type === 'image' ? (
                    <div className="aspect-square relative">
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square flex flex-col items-center justify-center gap-2 bg-muted p-4">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <p className="text-xs text-center truncate w-full">
                        {file.name}
                      </p>
                    </div>
                  )}
                  
                  <button
                    onClick={() => removeFile(file.id)}
                    className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs">
                    {formatFileSize(file.size)}
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
