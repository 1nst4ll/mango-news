import React, { useRef, useState, useEffect } from 'react';

interface AudioPlayerProps {
  src: string;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, onClick }) => {
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
    <div className="flex items-center space-x-2 sm:space-x-4 p-2 sm:p-4 bg-muted/50 rounded-lg shadow-inner dark:bg-muted/30" onClick={onClick}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={(e) => { e.stopPropagation(); playPause(); }}
        className="p-2 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-50 transition-colors duration-200"
      >
        {isPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
            <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0a.75.75 0 01.75-.75H16.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
            <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 20.32c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
          </svg>
        )}
      </button>
      <div className="flex-1 flex items-center space-x-1 sm:space-x-2">
        <span className="text-sm text-muted-foreground font-sans">{formatTime(currentTime)}</span>
        <input
          type="range"
          min="0"
          max={duration}
          value={currentTime}
          onChange={(e) => { e.stopPropagation(); handleSeek(e); }}
          className="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${(currentTime / duration) * 100}%, var(--border) ${(currentTime / duration) * 100}%, var(--border) 100%)`
          }}
        />
        <span className="text-sm text-muted-foreground font-sans">{formatTime(duration)}</span>
      </div>
    </div>
  );
};

export default AudioPlayer;
