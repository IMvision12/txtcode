'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

export default function Logo({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [processedImage, setProcessedImage] = useState<string>('');

  useEffect(() => {
    const img = document.createElement('img');
    img.src = '/logo.png';
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw image
      ctx.drawImage(img, 0, 0);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Remove white and light backgrounds (make them transparent)
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // If pixel is close to white or very light, make it transparent
        if (r > 200 && g > 200 && b > 200) {
          data[i + 3] = 0; // Set alpha to 0 (transparent)
        }
        // Also remove black backgrounds
        else if (r < 30 && g < 30 && b < 30) {
          data[i + 3] = 0;
        }
      }
      
      // Put modified image data back
      ctx.putImageData(imageData, 0, 0);
      
      // Convert to data URL
      setProcessedImage(canvas.toDataURL('image/png'));
    };
  }, []);

  return (
    <Link href="/" className={`inline-flex items-center ${className}`}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {processedImage ? (
        <img 
          src={processedImage} 
          alt="DeployLLM Logo" 
          className="h-8 w-auto"
        />
      ) : (
        <Image 
          src="/logo.png" 
          alt="DeployLLM Logo" 
          width={200} 
          height={72}
          priority
          className="h-8 w-auto"
          style={{
            mixBlendMode: 'screen',
            filter: 'brightness(1.2) contrast(1.1)'
          }}
        />
      )}
    </Link>
  );
}
