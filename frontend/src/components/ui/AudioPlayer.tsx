import React, { useRef, useState, useEffect } from 'react';

interface AudioPlayerProps {
  src: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const setAudioData = () => {
        setDuration(audio.duration);
        setCurrentTime(audio.currentTime);
      };

      const setAudioTime = () => setCurrentTime(audio.currentTime);

      const togglePlay = () => setIsPlaying(!audio.paused);

      audio.addEventListener('loadeddata', setAudioData);
      audio.addEventListener('timeupdate', setAudioTime);
      audio.addEventListener('play', togglePlay);
      audio.addEventListener('pause', togglePlay);
      audio.addEventListener('ended', () => setIsPlaying(false));

      return () => {
        audio.removeEventListener('loadeddata', setAudioData);
        audio.removeEventListener('timeupdate', setAudioTime);
        audio.removeEventListener('play', togglePlay);
        audio.removeEventListener('pause', togglePlay);
        audio.removeEventListener('ended', () => setIsPlaying(false));
      };
    }
  }, []);

  const playPause = () => {
    const audio = audioRef.current;
    if (audio) {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = parseFloat(e.target.value);
      setCurrentTime(audio.currentTime);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="flex items-center space-x-4 p-4 bg-gray-100 rounded-lg shadow-md dark:bg-gray-800">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={playPause}
        className="p-2 rounded-full bg-accent text-white hover:bg-accent-darker focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-50"
      >
        {isPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197 2.132A1 1 0 0110 13.82V10.18a1 1 0 011.555-.832l3.197 2.132a1 1 0 010 1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </button>
      <div className="flex-1 flex items-center space-x-2">
        <span className="text-sm text-gray-600 dark:text-gray-300">{formatTime(currentTime)}</span>
        <input
          type="range"
          min="0"
          max={duration}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          style={{
            background: `linear-gradient(to right, #FF7F50 0%, #FF7F50 ${(currentTime / duration) * 100}%, #D1D5DB ${(currentTime / duration) * 100}%, #D1D5DB 100%)`
          }}
        />
        <span className="text-sm text-gray-600 dark:text-gray-300">{formatTime(duration)}</span>
      </div>
    </div>
  );
};

export default AudioPlayer;
