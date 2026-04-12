"use client";

import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

type ImageCropperProps = {
  imageSrc: string;
  aspectRatio?: number; // e.g. 1 for 1:1, 16/9 for 16:9. undefined = free
  maxWidth?: number;
  onCropComplete: (blob: Blob) => void;
  onCancel: () => void;
};

function getCroppedBlob(
  image: HTMLImageElement,
  crop: PixelCrop,
  maxWidth: number
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  let outputWidth = crop.width * scaleX;
  let outputHeight = crop.height * scaleY;

  if (outputWidth > maxWidth) {
    const ratio = maxWidth / outputWidth;
    outputWidth = maxWidth;
    outputHeight = outputHeight * ratio;
  }

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2d context");

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    outputWidth,
    outputHeight
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      },
      "image/jpeg",
      0.9
    );
  });
}

export default function ImageCropper({
  imageSrc,
  aspectRatio,
  maxWidth = 800,
  onCropComplete,
  onCancel,
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [processing, setProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = useCallback(() => {
    if (!imgRef.current) return;
    const { width, height } = imgRef.current;

    // Default crop: centered, 80% of image
    const cropSize = Math.min(width, height) * 0.8;
    const newCrop: Crop = {
      unit: "px",
      x: (width - cropSize) / 2,
      y: (height - (aspectRatio ? cropSize / aspectRatio : cropSize)) / 2,
      width: cropSize,
      height: aspectRatio ? cropSize / aspectRatio : cropSize,
    };
    setCrop(newCrop);
  }, [aspectRatio]);

  const handleConfirm = async () => {
    if (!completedCrop || !imgRef.current) return;
    setProcessing(true);
    try {
      const blob = await getCroppedBlob(imgRef.current, completedCrop, maxWidth);
      onCropComplete(blob);
    } catch {
      alert("Nepodařilo se oříznout obrázek.");
    }
    setProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-lg">Oříznout obrázek</h3>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-4 flex items-center justify-center overflow-auto max-h-[60vh] bg-gray-50">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspectRatio}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop"
              onLoad={onImageLoad}
              style={{ maxHeight: "55vh", maxWidth: "100%" }}
            />
          </ReactCrop>
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-6 py-2.5 text-gray-700 font-semibold hover:bg-gray-100 rounded-xl transition-colors"
          >
            Zrušit
          </button>
          <button
            onClick={handleConfirm}
            disabled={!completedCrop || processing}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 transition-all"
          >
            {processing ? "Zpracovávám..." : "Potvrdit"}
          </button>
        </div>
      </div>
    </div>
  );
}
