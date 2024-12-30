import React from 'react';
import { Image } from '../types';
import { compareImageNames, getFileNameWithoutExtension } from '../utils';

interface ImageGalleryProps {
  images: Image[];
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ images }) => {
  const sortedImages = [...images].sort((a, b) => compareImageNames(a.name, b.name));

  return (
    <div className="w-full">
      <h2 className="text-[rgb(0,106,60)] text-xl font-medium mb-4">ANNEXES</h2>
      <div className="flex flex-wrap">
        {sortedImages.map((image) => (
          <div key={image.id} className="w-1/6 flex flex-col items-center p-2">
            <h3 className="text-sm font-medium mb-2 text-center truncate w-full">
              {getFileNameWithoutExtension(image.name)}
            </h3>
            <img
              src={image.url}
              alt={image.name}
              className="w-full h-auto rounded-lg shadow-md"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
