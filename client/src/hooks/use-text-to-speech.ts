import { useState, useCallback } from 'react';
import { generateSpeech } from '@/lib/webhook-api';

interface UseTextToSpeechHook {
  speak: (text: string) => Promise<void>;
  isPlaying: boolean;
  stop: () => void;
}

export function useTextToSpeech(): UseTextToSpeechHook {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  const speak = useCallback(async (text: string) => {
    try {
      setIsPlaying(true);
      
      // Stop any currently playing audio
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }

      // Generate speech using ElevenLabs API
      const audioData = await generateSpeech(text);
      
      // Create and play audio
      const audio = new Audio(audioData);
      setCurrentAudio(audio);
      
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentAudio(null);
      };
      
      audio.onerror = () => {
        setIsPlaying(false);
        setCurrentAudio(null);
        console.error('Error playing audio');
      };

      await audio.play();
    } catch (error) {
      console.error('Error generating or playing speech:', error);
      setIsPlaying(false);
      setCurrentAudio(null);
    }
  }, [currentAudio]);

  const stop = useCallback(() => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
    setIsPlaying(false);
  }, [currentAudio]);

  return {
    speak,
    isPlaying,
    stop,
  };
}
