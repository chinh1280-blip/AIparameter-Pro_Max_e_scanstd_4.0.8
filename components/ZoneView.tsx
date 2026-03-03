import React, { useState } from 'react';
import { ImageUploader } from './ImageUploader';
import { DataCard } from './DataCard';
import { ProcessingState, StandardDataMap, ProductPreset, ZoneDefinition } from '../types';
import { analyzeImage } from '../services/geminiService';
import { Trash2, Info, CheckCircle2, Eye, EyeOff } from 'lucide-react';

// Helper to convert Google Drive viewer links to direct image links
const getDirectImageUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  try {
    // Handle Google Drive URLs
    if (url.includes('drive.google.com')) {
      let fileId = '';
      // Extract ID from /file/d/ID/view
      const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        fileId = fileIdMatch[1];
      } else {
        // Extract ID from ?id=ID
        const idParamMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (idParamMatch && idParamMatch[1]) {
          fileId = idParamMatch[1];
        }
      }

      if (fileId) {
        // Use thumbnail endpoint which is more reliable for embedding than uc?export=view
        // sz=w1920 requests a large version (width 1920px)
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1920`;
      }
    }
    return url;
  } catch (e) {
    return url;
  }
};

interface ZoneViewProps {
  zone: ZoneDefinition;
  data: any | null;
  standardData: StandardDataMap;
  currentPreset?: ProductPreset | null;
  setData: (data: any | null) => void;
  state: ProcessingState;
  setState: (state: ProcessingState) => void;
  modelName: string;
  fieldLabels: Record<string, string>;
  apiKey?: string; // Add apiKey
}

export const ZoneView: React.FC<ZoneViewProps> = React.memo(({
  zone,
  data,
  standardData,
  currentPreset,
  setData,
  state,
  setState,
  modelName,
  fieldLabels,
  apiKey // Accept apiKey
}) => {
  const imagesConfig = zone.images && zone.images.length > 0 ? zone.images : [{ id: 'default', label: 'Ảnh 1' }];
  const imageUrls = state.imageUrls || {};
  
  const [visibleGuides, setVisibleGuides] = useState<Record<string, boolean>>({});

  const toggleGuide = (id: string) => {
    setVisibleGuides(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleImageSelected = async (imageId: string, base64: string) => {
    const newImageUrls = { ...imageUrls, [imageId]: `data:image/jpeg;base64,${base64}` };
    
    // Check if all images are uploaded
    const allUploaded = imagesConfig.every(img => newImageUrls[img.id]);

    setState({
      ...state,
      isAnalyzing: allUploaded,
      error: null,
      imageUrls: newImageUrls,
    });
    
    if (allUploaded) {
      setData(null);
      try {
        const base64List = imagesConfig.map(img => newImageUrls[img.id].split(',')[1]);
        const result = await analyzeImage(base64List, zone.prompt, zone.schema, modelName, apiKey);
        setData(result);
        setState({ ...state, isAnalyzing: false, imageUrls: newImageUrls });
      } catch (err: any) {
        setState({ 
          ...state, 
          isAnalyzing: false, 
          error: err.message || "Không thể đọc dữ liệu. Vui lòng thử lại với ảnh rõ nét hơn.",
          imageUrls: newImageUrls
        });
      }
    }
  };

  const handleClearImage = (imageId: string) => {
    const newImageUrls = { ...imageUrls };
    delete newImageUrls[imageId];
    setState({ ...state, isAnalyzing: false, error: null, imageUrls: newImageUrls });
    setData(null);
  };

  const handleClearAll = () => {
    setData(null);
    setState({ isAnalyzing: false, error: null, imageUrl: null, imageUrls: {} });
  };

  const handleDataChange = (key: string, value: number) => {
    if (data) {
      setData({ ...data, [key]: value });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-4">
        <div className="mb-4 flex items-center justify-between">
           <div className="flex items-center gap-2 text-blue-400">
             <Info size={16}/>
             <span className="text-xs font-bold uppercase tracking-widest">{zone.name}</span>
           </div>
           {Object.keys(imageUrls).length > 0 && !state.isAnalyzing && (
             <button onClick={handleClearAll} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
               <Trash2 size={14} /> Xóa tất cả ảnh
             </button>
           )}
        </div>

        {state.error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-200 p-3 rounded-lg text-sm flex items-center gap-2">
            <span>⚠️</span> {state.error}
          </div>
        )}

        <div className={`grid grid-cols-1 ${imagesConfig.length > 1 ? 'sm:grid-cols-2' : ''} gap-4`}>
          {imagesConfig.map((img) => {
            const currentImageUrl = imageUrls[img.id];
            const showGuide = visibleGuides[img.id];

            return (
              <div key={img.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{img.label}</span>
                  <div className="flex items-center gap-2">
                      {img.guideImage && (
                          <button 
                            onClick={() => toggleGuide(img.id)}
                            className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border transition-colors flex items-center gap-1 ${showGuide ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'}`}
                          >
                             {showGuide ? <EyeOff size={10}/> : <Eye size={10}/>} {showGuide ? 'Ẩn Mẫu' : 'Xem Mẫu'}
                          </button>
                      )}
                      {currentImageUrl && <CheckCircle2 size={14} className="text-green-500" />}
                  </div>
                </div>

                {showGuide && img.guideImage && (
                    <div className="relative rounded-xl overflow-hidden aspect-video bg-slate-950 border border-blue-500/30 shadow-lg mb-1 animate-slide-down group">
                        <img 
                          src={getDirectImageUrl(img.guideImage)} 
                          alt="Guide" 
                          className="w-full h-full object-contain" 
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            // Fallback if thumbnail fails, try the original URL
                            const target = e.target as HTMLImageElement;
                            if (target.src !== img.guideImage) {
                                target.src = img.guideImage || '';
                            }
                          }}
                        />
                        <div className="absolute top-2 left-2 bg-blue-600/90 text-white text-[8px] font-black uppercase px-2 py-1 rounded shadow-sm backdrop-blur-sm">Ảnh Mẫu</div>
                    </div>
                )}

                {currentImageUrl ? (
                  <div className="relative group">
                    <div className="relative rounded-xl overflow-hidden aspect-video bg-black border border-slate-700 shadow-inner">
                      <img 
                        src={currentImageUrl} 
                        alt={img.label} 
                        className={`w-full h-full object-contain ${state.isAnalyzing ? 'opacity-50 blur-sm' : ''}`} 
                      />
                      {state.isAnalyzing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                        </div>
                      )}
                    </div>
                    {!state.isAnalyzing && (
                        <button 
                            onClick={() => handleClearImage(img.id)}
                            className="absolute top-2 right-2 bg-slate-900/80 hover:bg-red-600/90 text-white p-2 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                            title="Xóa ảnh này"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                  </div>
                ) : (
                   <ImageUploader 
                     onImageSelected={(base64) => handleImageSelected(img.id, base64)} 
                     isProcessing={state.isAnalyzing} 
                   />
                )}
              </div>
            );
          })}
        </div>
        
        {state.isAnalyzing && (
          <div className="mt-4 flex flex-col items-center justify-center py-4">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
            <span className="text-blue-400 font-medium text-sm animate-pulse">Gemini đang phân tích...</span>
          </div>
        )}
      </div>

      {data && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
             <h3 className="text-white font-semibold flex items-center gap-2">
                <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                Kết quả đọc
             </h3>
             <span className="text-xs text-slate-500 uppercase font-mono">Auto-Filled via {modelName}</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(data).map(([key, value]) => (
              <DataCard 
                key={key} 
                dataKey={key} 
                value={value as number} 
                standardValue={standardData[key]}
                tolerance={currentPreset?.tolerances?.[key]}
                onChange={handleDataChange} 
                fieldLabels={fieldLabels}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});