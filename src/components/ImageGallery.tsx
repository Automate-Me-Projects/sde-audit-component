import React, { useMemo, useState } from 'react';
import { Image } from '../types';
import { compareImageNames } from '../utils';

interface ImageGalleryProps {
  images: Image[];
  onDelete: (image: Image) => Promise<void>;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images, onDelete }) => {
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);

  const sortedImages = useMemo(() => 
    [...images].sort((a, b) => compareImageNames(a.name || '', b.name || '')),
    [images]
  );

  const handleImageClick = (image: Image) => {
    setSelectedImage(image);
  };

  const handleDelete = async (image: Image) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${image.name || 'cette image'} ?`)) {
      await onDelete(image);
    }
  };

  const handleClose = () => {
    setSelectedImage(null);
  };

  return (
    <div className="w-full">
      <h2 className="text-[rgb(0,106,60)] text-xl font-medium mb-4">ANNEXES</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sortedImages.map((image) => (
          <div key={image.id} className="relative">
            <h3 className="text-sm font-medium mb-2 text-gray-700">
              {image.name || 'Sans nom'}
            </h3>
            <img
              src={image.url}
              alt={image.name || 'Image'}
              className="w-full h-auto rounded-lg shadow-md cursor-pointer"
              loading="lazy"
              onClick={() => handleImageClick(image)}
            />
            <div className="image-info">
              <button 
                className="mt-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                onClick={() => handleDelete(image)}
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

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
