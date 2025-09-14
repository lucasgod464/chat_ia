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
  onFinalText?: (transcript: string) => void;
  debug?: boolean;
  suspended?: boolean;
  minConfidence?: number;
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
  onFinalText,
  debug = false,
  suspended = false,
  minConfidence = 0.6,
}: UseSpeechRecognitionProps = {}): SpeechRecognitionHook {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const finalTranscriptRef = useRef<string>('');
  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const log = useCallback((message: string, data?: any) => {
    if (debug) {
      console.log(`[Speech Recognition] ${message}`, data || '');
    }
  }, [debug]);

  const clearRestartTimeout = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  }, []);

  const stopRecognition = useCallback(() => {
    log('🛑 Stopping speech recognition');
    clearRestartTimeout();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setTranscript('');
    finalTranscriptRef.current = '';
  }, [clearRestartTimeout, log]);

  const startRecognition = useCallback(() => {
    if (!isSupported || !recognitionRef.current) return;
    
    log('🎤 Starting speech recognition');
    clearRestartTimeout();
    setLastError(null);
    
    try {
      recognitionRef.current.start();
    } catch (error) {
      log('❌ Error starting recognition:', error);
      setLastError('Erro ao iniciar reconhecimento de voz');
    }
  }, [isSupported, clearRestartTimeout, log]);

  // Auto-restart recognition for continuous listening
  const scheduleRestart = useCallback(() => {
    if (continuous && !suspended && !restartTimeoutRef.current) {
      log('🔄 Scheduling restart in 1000ms...');
      restartTimeoutRef.current = setTimeout(() => {
        if (!isListening && !suspended) {
          startRecognition();
        }
      }, 1000);
    }
  }, [continuous, suspended, isListening, startRecognition, log]);

  const setupRecognition = useCallback(() => {
    if (!isSupported) return;

    log('🔧 Setting up speech recognition');
    
    const SpeechRecognition = 
      window.SpeechRecognition || window.webkitSpeechRecognition;
    
    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;

    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    log('⚙️ Recognition settings:', {
      continuous: recognition.continuous,
      interimResults: recognition.interimResults,
      lang: recognition.lang,
      maxAlternatives: recognition.maxAlternatives,
    });

    recognition.onstart = () => {
      log('🎤 Speech recognition started');
      setIsListening(true);
      setLastError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      log('📝 Speech recognition result received');
      
      // Skip processing if suspended to prevent feedback loop
      if (suspended) {
        log('⏸️ Skipping result processing - recognition is suspended');
        return;
      }
      
      let interimTranscript = '';
      let finalTranscript = '';
      let bestConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptPart = result[0].transcript;
        const confidence = result[0].confidence;
        
        if (result.isFinal) {
          finalTranscript += transcriptPart;
          finalTranscriptRef.current += transcriptPart;
          bestConfidence = Math.max(bestConfidence, confidence);
          setConfidence(confidence);
          log('✅ Final transcript part:', { transcriptPart, confidence });
        } else {
          interimTranscript += transcriptPart;
        }
      }

      const fullTranscript = finalTranscriptRef.current + interimTranscript;
      setTranscript(fullTranscript);

      if (onResult) {
        onResult({
          transcript: fullTranscript,
          confidence: event.results[event.results.length - 1]?.[0]?.confidence || 0,
          isFinal: event.results[event.results.length - 1]?.isFinal || false,
        });
      }

      // Send final transcript only if not suspended, has good confidence, and is long enough
      if (finalTranscript.trim() && onFinalText && !suspended) {
        const trimmedText = finalTranscriptRef.current.trim();
        if (trimmedText && trimmedText.length > 3 && bestConfidence >= minConfidence) {
          log('📤 Auto-sending final text:', { trimmedText, confidence: bestConfidence });
          onFinalText(trimmedText);
          finalTranscriptRef.current = '';
          setTranscript('');
        } else {
          log('⚠️ Skipping auto-send - low confidence or too short:', {
            text: trimmedText,
            confidence: bestConfidence,
            minConfidence,
            length: trimmedText.length
          });
        }
      }
    };

    recognition.onerror = (event: any) => {
      const errorMessage = event.error;
      log('❌ Speech recognition error:', errorMessage);
      
      if (errorMessage === 'no-speech') {
        // Ignore no-speech errors as they're common in continuous listening
        log('🔇 No speech detected, continuing...');
      } else {
        setLastError(`Erro: ${errorMessage}`);
      }
      
      setIsListening(false);
    };

    recognition.onend = () => {
      log('🛑 Speech recognition ended');
      setIsListening(false);
      
      // Send any remaining final transcript only if not suspended
      if (finalTranscriptRef.current.trim() && onFinalText && !suspended) {
        const trimmedText = finalTranscriptRef.current.trim();
        if (trimmedText.length > 3) {
          log('📤 Sending remaining text on end:', trimmedText);
          onFinalText(trimmedText);
        }
        finalTranscriptRef.current = '';
      }
      
      setTranscript('');
      
      // Auto-restart for continuous listening only if not suspended
      if (continuous && !suspended) {
        scheduleRestart();
      }
    };

  }, [isSupported, continuous, language, onResult, onFinalText, log, scheduleRestart]);

  // Setup recognition when component mounts or dependencies change
  useEffect(() => {
    setupRecognition();
    
    return () => {
      log('🧹 Cleaning up speech recognition');
      clearRestartTimeout();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [setupRecognition, clearRestartTimeout, log]);

  // Auto-start listening if continuous is enabled and not suspended
  useEffect(() => {
    if (continuous && isSupported && !isListening && !suspended) {
      startRecognition();
    }
  }, [continuous, isSupported, isListening, suspended, startRecognition]);

  // Stop listening when continuous is disabled or suspended
  useEffect(() => {
    if ((!continuous || suspended) && isListening) {
      log('🔇 Continuous listening disabled or suspended - stopping recognition');
      stopRecognition();
    }
  }, [continuous, suspended, isListening, stopRecognition, log]);

  // Clear restart timeout when suspended
  useEffect(() => {
    if (suspended) {
      clearRestartTimeout();
    }
  }, [suspended, clearRestartTimeout]);

  // Manual start/stop functions
  const startListening = useCallback(() => {
    log('▶️ Manually starting speech recognition');
    startRecognition();
  }, [startRecognition, log]);

  const stopListening = useCallback(() => {
    log('⏹️ Manually stopping speech recognition');
    stopRecognition();
  }, [stopRecognition, log]);

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