import React, { useMemo, useState, useEffect } from 'react';
import { Image } from '../types';
import { compareImageNames } from '../utils';

interface ImageGalleryProps {
  images: Image[];
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images }) => {
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    console.log('ImageGallery received images:', images);
  }, [images]);

  const sortedImages = useMemo(() => {
    console.log('Sorting images, count:', images.length);
    return [...images].sort((a, b) => compareImageNames(a.name || '', b.name || ''));
  }, [images]);

  const handleImageClick = (image: Image) => {
    console.log('Image clicked:', image);
    setSelectedImage(image);
  };

  const handleClose = () => {
    setSelectedImage(null);
  };

  const handleImageLoad = (imageId: string) => {
    console.log('Image loaded successfully:', imageId);
    setLoadedImages(prev => {
      const newSet = new Set(prev);
      newSet.add(imageId);
      return newSet;
    });
  };

  return (
    <div className="w-full">
      <h2 className="text-[rgb(0,106,60)] text-xl font-medium mb-4">ANNEXES</h2>
      {sortedImages.length === 0 ? (
        <p className="text-gray-500 italic">Aucune image disponible</p>
      ) : (
        <div 
          className="grid gap-4"
          style={{ 
            gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
            gridAutoRows: '1fr'
          }}
        >
          {sortedImages.map((image) => {
            const isLoaded = loadedImages.has(image.id);

            return (
              <div key={image.id} className="relative">
                <div 
                  className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden"
                >
                  <img
                    src={image.url}
                    alt="Chargement..."
                    className={`w-full h-full object-cover transition-all duration-300 ${
                      isLoaded ? 'opacity-100 cursor-pointer scale-100' : 'opacity-0 scale-95'
                    }`}
                    loading="lazy"
                    onLoad={() => handleImageLoad(image.id)}
                    onClick={() => isLoaded && handleImageClick(image)}
                  />
                  {!isLoaded && (
                    <div className="absolute inset-0 animate-pulse" />
                  )}
                  {isLoaded && (
                    <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 p-2">
                      <h3 className="text-sm font-medium text-white truncate">
                        {image.name || 'Sans nom'}
                      </h3>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="relative bg-white p-4 rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
            <button 
              className="absolute top-2 right-2 text-2xl text-gray-600 hover:text-gray-800"
              onClick={handleClose}
            >
              &times;
            </button>
            <img 
              src={selectedImage.url} 
              alt={selectedImage.name || 'Image'} 
              className="max-w-full h-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};

ImageGallery.displayName = 'ImageGallery';

export default ImageGallery;
