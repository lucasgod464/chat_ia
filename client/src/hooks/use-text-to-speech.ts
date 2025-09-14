import { useState, useCallback } from 'react';
import { generateSpeech } from '@/lib/webhook-api';

interface UseTextToSpeechHook {
  speak: (text: string) => Promise<void>;
  isPlaying: boolean;
  stop: () => void;
  lastUsedMethod: 'elevenlabs' | 'browser' | null;
}

export function useTextToSpeech(): UseTextToSpeechHook {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [currentUtterance, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const [lastUsedMethod, setLastUsedMethod] = useState<'elevenlabs' | 'browser' | null>(null);

  const speakWithBrowser = useCallback(async (text: string) => {
    return new Promise<void>((resolve, reject) => {
      try {
        // Stop any current speech
        if (currentUtterance) {
          speechSynthesis.cancel();
        }

        // Create new utterance
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configure for Portuguese Brazilian
        utterance.lang = 'pt-BR';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        // Try to find a Portuguese voice
        const voices = speechSynthesis.getVoices();
        const portugueseVoice = voices.find(voice => 
          voice.lang.includes('pt') || voice.lang.includes('PT')
        );
        if (portugueseVoice) {
          utterance.voice = portugueseVoice;
        }

        setCurrentUtterance(utterance);
        setLastUsedMethod('browser');

        utterance.onend = () => {
          setIsPlaying(false);
          setCurrentUtterance(null);
          resolve();
        };

        utterance.onerror = (error) => {
          setIsPlaying(false);
          setCurrentUtterance(null);
          reject(error);
        };

        speechSynthesis.speak(utterance);
        console.log('🔊 Using browser TTS (fallback)');
      } catch (error) {
        setIsPlaying(false);
        setCurrentUtterance(null);
        reject(error);
      }
    });
  }, [currentUtterance]);

  const speak = useCallback(async (text: string) => {
    try {
      setIsPlaying(true);
      
      // Stop any currently playing audio/speech
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      if (currentUtterance) {
        speechSynthesis.cancel();
      }

      try {
        // Try ElevenLabs first
        console.log('🎵 Attempting ElevenLabs TTS...');
        const audioData = await generateSpeech(text);
        
        // Create and play audio
        const audio = new Audio(audioData);
        setCurrentAudio(audio);
        setLastUsedMethod('elevenlabs');
        
        audio.onended = () => {
          setIsPlaying(false);
          setCurrentAudio(null);
        };
        
        audio.onerror = () => {
          setIsPlaying(false);
          setCurrentAudio(null);
          console.error('Error playing ElevenLabs audio');
        };

        await audio.play();
        console.log('✅ ElevenLabs TTS successful');
      } catch (elevenLabsError) {
        console.warn('⚠️ ElevenLabs TTS failed, falling back to browser TTS:', elevenLabsError);
        
        // Fallback to browser speech synthesis
        await speakWithBrowser(text);
      }
    } catch (error) {
      console.error('❌ All TTS methods failed:', error);
      setIsPlaying(false);
      setCurrentAudio(null);
      setCurrentUtterance(null);
    }
  }, [currentAudio, currentUtterance, speakWithBrowser]);

  const stop = useCallback(() => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
    if (currentUtterance) {
      speechSynthesis.cancel();
      setCurrentUtterance(null);
    }
    setIsPlaying(false);
  }, [currentAudio, currentUtterance]);

  return {
    speak,
    isPlaying,
    stop,
    lastUsedMethod,
  };
}
