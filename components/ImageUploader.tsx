import React, { useRef } from 'react';
import { Camera } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelected: (base64: string) => void;
  isProcessing: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected, isProcessing }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      onImageSelected(base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        disabled={isProcessing}
        onClick={() => fileInputRef.current?.click()}
        className={`
            w-full relative group overflow-hidden
            bg-slate-800 hover:bg-slate-800/80 border-2 border-dashed border-slate-700 hover:border-blue-500/50
            rounded-2xl p-6 transition-all duration-300
            flex flex-col items-center justify-center gap-3
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
           {isProcessing ? (
               <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
           ) : (
               <Camera className="text-blue-500 w-6 h-6" />
           )}
        </div>
        
        <div className="text-center">
             <h3 className="text-white font-semibold text-sm">
                {isProcessing ? 'Đang phân tích...' : 'Chụp hình'}
             </h3>
             <p className="text-slate-400 text-[10px] mt-1">
                Nhấn để mở camera
             </p>
        </div>
      </button>
    </div>
  );
};