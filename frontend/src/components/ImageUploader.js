import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Image as ImageIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

export function ImageUploader({ onUpload, maxFiles = 5, existingImages = [] }) {
  const [images, setImages] = useState(existingImages);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = useCallback(async (files) => {
    const fileArray = Array.from(files);
    
    if (images.length + fileArray.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} images allowed`);
      return;
    }

    const validFiles = fileArray.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploading(true);

    try {
      const uploadPromises = validFiles.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post('/uploads/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        return response.data;
      });

      const results = await Promise.all(uploadPromises);
      const newImages = [...images, ...results];
      setImages(newImages);
      onUpload?.(newImages);
      toast.success(`${results.length} image${results.length > 1 ? 's' : ''} uploaded`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
    }
  }, [images, maxFiles, onUpload]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleRemove = async (index) => {
    const imageToRemove = images[index];
    
    try {
      if (imageToRemove.id) {
        await api.delete(`/uploads/image/${imageToRemove.id}`);
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
    }

    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    onUpload?.(newImages);
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <motion.div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        animate={{
          borderColor: dragActive ? '#BCFF00' : 'rgba(255,255,255,0.1)',
          backgroundColor: dragActive ? 'rgba(188,255,0,0.05)' : 'transparent',
        }}
        className="relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        <AnimatePresence mode="wait">
          {uploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center"
            >
              <Loader2 className="w-12 h-12 text-[#BCFF00] animate-spin mb-4" />
              <p className="text-zinc-400">Uploading images...</p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center"
            >
              <motion.div
                animate={{
                  y: dragActive ? -5 : 0,
                  scale: dragActive ? 1.1 : 1,
                }}
                className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4"
              >
                <Upload className={`w-8 h-8 ${dragActive ? 'text-[#BCFF00]' : 'text-zinc-500'}`} />
              </motion.div>
              <p className="text-white font-medium mb-1">
                {dragActive ? 'Drop images here' : 'Drag & drop images'}
              </p>
              <p className="text-sm text-zinc-500">or click to browse</p>
              <p className="text-xs text-zinc-600 mt-2">
                Max {maxFiles} images, 5MB each
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          <AnimatePresence>
            {images.map((image, index) => (
              <motion.div
                key={image.id || index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative aspect-square rounded-xl overflow-hidden group"
              >
                <img
                  src={image.url?.startsWith('data:') ? image.url : `/api/uploads/image/${image.id}`}
                  alt={image.filename || `Image ${index + 1}`}
                  className="w-full h-full object-cover"
                  onLoad={async (e) => {
                    // If URL is an API endpoint, load the actual image
                    if (image.url && !image.url.startsWith('data:') && !image.url.startsWith('http')) {
                      try {
                        const response = await api.get(image.url);
                        e.target.src = response.data.url;
                      } catch (err) {
                        console.error('Failed to load image:', err);
                      }
                    }
                  }}
                />
                
                {/* Primary indicator */}
                {index === 0 && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-[#BCFF00] text-black text-xs font-semibold rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Primary
                  </div>
                )}
                
                {/* Remove button */}
                <motion.button
                  initial={{ opacity: 0 }}
                  whileHover={{ scale: 1.1 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(index);
                  }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                >
                  <X className="w-4 h-4" />
                </motion.button>
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* Add more button */}
          {images.length < maxFiles && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-white/10 hover:border-[#BCFF00]/50 flex flex-col items-center justify-center text-zinc-500 hover:text-[#BCFF00] transition-colors"
            >
              <ImageIcon className="w-6 h-6 mb-1" />
              <span className="text-xs">Add</span>
            </motion.button>
          )}
        </div>
      )}
    </div>
  );
}

export default ImageUploader;
