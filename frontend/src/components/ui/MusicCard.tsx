"use client";

import React from "react"; // Removed useRef, useState, useEffect as they are not needed for simple audio
import { cn } from "@/lib/utils"; // cn is still used for CustomSlider

// Removed all lucide-react icons as they are not needed for basic audio controls

// Simplified CustomSlider - no motion.div
const CustomSlider = ({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "relative w-full h-1 bg-gray-200 rounded-full cursor-pointer", // Changed to gray-200 for simpler styling
        className
      )}
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = (x / rect.width) * 100;
        onChange(Math.min(Math.max(percentage, 0), 100));
      }}
    >
      <div
        className="absolute top-0 left-0 h-full bg-blue-500 rounded-full" // Changed to blue-500 for simpler styling
        style={{ width: `${value}%` }}
      />
    </div>
  );
};

interface MusicCardProps {
  src: string;
  poster?: string; // Made optional as it might not always be available for simple audio
  title?: string;
  artist?: string;
}

export function MusicCard ({ src, poster, title, artist }: MusicCardProps){ // Removed autoPlay and mainColor as they are not used by basic audio

  return (
    <section
      className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden" // Simplified styling
    >
      {poster && ( // Only render poster if available
        <div className="relative w-full h-48 overflow-hidden">
          <img
            src={poster}
            alt={title || "Audio cover"}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-4">
        {title && (
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 truncate">
            {title}
          </h3>
        )}
        {artist && (
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {artist}
          </p>
        )}

        <div className="mt-4">
          <audio controls src={src} className="w-full">
            Your browser does not support the audio element.
          </audio>
        </div>
      </div>
    </section>
  )
}
