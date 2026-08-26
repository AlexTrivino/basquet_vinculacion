import React, { useRef, useState } from 'react';
import { Upload, X, File as FileIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface FileUploadButtonProps {
  onFileSelect: (file: File) => Promise<void> | void;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  currentFileUrl?: string | null;
  onRemove?: () => void;
  isLoading?: boolean;
}

export function FileUploadButton({
  onFileSelect,
  accept = '.xlsx,.xls',
  maxSizeMB = 5,
  label = 'Subir Archivo',
  currentFileUrl,
  onRemove,
  isLoading = false
}: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const validateAndProcessFile = async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`El archivo es muy grande. Máximo ${maxSizeMB} MB.`);
      return;
    }
    
    // Aquí se podría añadir lógica de compresión de imágenes si fuera necesario.
    // Como está pensado para documentos/Excel, pasamos el file directo.
    try {
      await onFileSelect(file);
    } catch (error) {
      console.error(error);
    }
    
    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
  };

  if (currentFileUrl) {
    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
            <FileIcon className="h-5 w-5" />
          </div>
          <a
            href={currentFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary-600 hover:underline truncate max-w-[200px]"
          >
            Ver Archivo Actual
          </a>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Eliminar archivo"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        disabled={isLoading}
        className={`w-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg transition-colors
          ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}
          ${isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {isLoading ? (
          <Loader2 className="h-6 w-6 text-primary-600 animate-spin mb-2" />
        ) : (
          <Upload className={`h-6 w-6 mb-2 ${isDragging ? 'text-primary-600' : 'text-gray-400'}`} />
        )}
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-xs text-gray-500 mt-1">
          {accept.split(',').join(', ')} (Max. {maxSizeMB}MB)
        </span>
      </button>
    </div>
  );
}
