import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

interface UseSpeechRecognitionProps {
  continuous?: boolean;
  language?: string;
  onResult?: (result: SpeechRecognitionResult) => void;
  onWakeWord?: (transcript: string) => void;
  wakeWords?: string[];
  debug?: boolean;
}

interface SpeechRecognitionHook {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
  confidence: number;
  lastError: string | null;
}

export function useSpeechRecognition({
  continuous = true,
  language = 'pt-BR',
  onResult,
  onWakeWord,
  wakeWords = ['slapy', 'ok slapy'],
  debug = true, // Enable debug by default for troubleshooting
}: UseSpeechRecognitionProps = {}): SpeechRecognitionHook {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const log = useCallback((message: string, data?: any) => {
    if (debug) {
      console.log(`[Speech Recognition] ${message}`, data || '');
    }
  }, [debug]);

  const checkForWakeWord = useCallback((text: string) => {
    const lowercaseText = text.toLowerCase().trim();
    log('🎤 Checking for wake word in text:', lowercaseText);
    
    // More flexible wake word detection
    let foundWakeWord = false;
    let command = '';
    let matchedWakeWord = '';
    
    for (const wakeWord of wakeWords) {
      const lowerWakeWord = wakeWord.toLowerCase();
      
      // Check if wake word is at the beginning or contains it
      if (lowercaseText.startsWith(lowerWakeWord) || lowercaseText.includes(lowerWakeWord)) {
        foundWakeWord = true;
        matchedWakeWord = wakeWord;
        log('✅ Wake word found:', lowerWakeWord);
        
        // Extract command after wake word with multiple strategies
        let extractedCommand = text;
        
        // Strategy 1: Replace wake word with regex
        const regex = new RegExp(`\\b${lowerWakeWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        extractedCommand = extractedCommand.replace(regex, '').trim();
        
        // Strategy 2: If no command, try splitting and taking everything after
        if (!extractedCommand || extractedCommand.length < 2) {
          const parts = text.toLowerCase().split(lowerWakeWord);
          if (parts.length > 1) {
            extractedCommand = parts[parts.length - 1].trim();
          }
        }
        
        // Strategy 3: If still no command, try removing from the start
        if (!extractedCommand || extractedCommand.length < 2) {
          const startIndex = lowercaseText.indexOf(lowerWakeWord);
          if (startIndex !== -1) {
            extractedCommand = text.substring(startIndex + lowerWakeWord.length).trim();
          }
        }
        
        command = extractedCommand;
        log('📝 Extracted command:', command);
        break;
      }
    }
    
    if (foundWakeWord && onWakeWord) {
      log('🚀 Triggering wake word callback');
      if (command && command.length > 0) {
        log('📤 Sending command:', command);
        onWakeWord(command);
      } else {
        // If no specific command was extracted, send the entire text minus common wake words
        const cleanedText = text.toLowerCase()
          .replace(/\b(ok|hey|oi|olá)\s*/gi, '')
          .replace(/\bslapy\b/gi, '')
          .trim();
        
        if (cleanedText.length > 0) {
          log('📤 Sending cleaned text:', cleanedText);
          onWakeWord(cleanedText);
        } else {
          log('⚠️ No meaningful command found in text:', text);
        }
      }
    } else {
      log('❌ No wake word found in:', lowercaseText);
    }
  }, [wakeWords, onWakeWord, log]);

  useEffect(() => {
    if (!isSupported) {
      log('❌ Speech recognition not supported');
      return;
    }

    log('🔧 Initializing speech recognition');
    const SpeechRecognition = 
      window.SpeechRecognition || window.webkitSpeechRecognition;
    
    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;

    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    log('⚙️ Recognition settings:', {
      continuous,
      interimResults: true,
      lang: language,
      maxAlternatives: 1
    });

    recognition.onstart = () => {
      log('🎤 Speech recognition started');
      setIsListening(true);
      setLastError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';
      let finalConfidence = 0;

      log('📝 Speech recognition result received, processing...');

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptPart = result[0].transcript;
        const confidence = result[0].confidence || 0;
        
        log(`Result ${i}: "${transcriptPart}" (confidence: ${confidence}, final: ${result.isFinal})`);
        
        if (result.isFinal) {
          finalTranscript += transcriptPart;
          finalConfidence = Math.max(finalConfidence, confidence);
          log('✅ Final transcript part:', transcriptPart);
          
          // Check for wake word on each final result
          checkForWakeWord(transcriptPart);
        } else {
          interimTranscript += transcriptPart;
          // Also check interim results for immediate wake word detection
          if (transcriptPart.trim().length > 4) {
            log('🔄 Checking interim result for wake word');
            checkForWakeWord(transcriptPart);
          }
        }
      }

      const fullTranscript = finalTranscript + interimTranscript;
      setTranscript(fullTranscript);
      setConfidence(finalConfidence);

      if (onResult) {
        const lastResult = event.results[event.results.length - 1];
        onResult({
          transcript: fullTranscript,
          confidence: lastResult?.[0]?.confidence || 0,
          isFinal: lastResult?.isFinal || false,
        });
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMessage = `Speech recognition error: ${event.error} - ${event.message || ''}`;
      log('❌ ERROR:', errorMessage);
      console.error(errorMessage);
      setLastError(event.error);
      setIsListening(false);
      
      // Clear any pending restart
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      
      // Try to restart after certain errors
      if (event.error === 'no-speech' || event.error === 'aborted') {
        log('🔄 Recoverable error, will restart automatically');
      }
    };

    recognition.onend = () => {
      log('🛑 Speech recognition ended');
      setIsListening(false);
      setTranscript('');
      
      // Clear any existing restart timeout
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      
      // Restart if continuous listening is enabled and no critical error occurred
      if (continuous && (!lastError || lastError === 'no-speech' || lastError === 'aborted')) {
        log('🔄 Scheduling restart in 500ms...');
        restartTimeoutRef.current = setTimeout(() => {
          if (recognitionRef.current && document.visibilityState === 'visible') {
            try {
              log('🔄 Attempting to restart speech recognition');
              recognitionRef.current.start();
            } catch (error) {
              const err = error as Error;
              log('❌ Error restarting speech recognition:', err.message);
              
              // If we get "already started" error, that's fine
              if (!err.message.includes('already started')) {
                console.error('Error restarting speech recognition:', err);
                setLastError(err.message);
              }
            }
          }
        }, 500);
      }
    };

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && recognition) {
        log('👁️ Page hidden, stopping recognition');
        recognition.stop();
      } else if (document.visibilityState === 'visible' && continuous && !isListening) {
        log('👁️ Page visible, restarting recognition');
        setTimeout(() => {
          if (recognitionRef.current && !isListening) {
            try {
              recognitionRef.current.start();
            } catch (error) {
              log('❌ Error restarting on visibility change:', (error as Error).message);
            }
          }
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      log('🧹 Cleaning up speech recognition');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (recognition) {
        recognition.stop();
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
    };
  }, [isSupported, continuous, language, onResult, checkForWakeWord, lastError]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        log('▶️ Manually starting speech recognition');
        setLastError(null);
        recognitionRef.current.start();
      } catch (error) {
        const err = error as Error;
        log('❌ Error starting speech recognition:', err.message);
        
        // If already started, that's fine
        if (!err.message.includes('already started')) {
          console.error('Error starting speech recognition:', err);
          setLastError(err.message);
        }
      }
    }
  }, [isListening, log]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      log('⏹️ Manually stopping speech recognition');
      recognitionRef.current.stop();
    }
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  }, [log]);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
    confidence,
    lastError,
  };
}