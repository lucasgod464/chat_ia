import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Settings, Bot } from "lucide-react";
import logoImage from "@assets/image_1757869818495.png";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ChatMessageComponent } from "@/components/chat-message";
import { VoiceInput } from "@/components/voice-input";
import { ListeningIndicator } from "@/components/listening-indicator";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { AudioVisualizer } from "@/components/audio-visualizer";
import { sendMessageToSlapy, fetchMessages } from "@/lib/webhook-api";
import type { ChatMessage } from "@shared/schema";

export default function SlappyChat() {
  const [messageInput, setMessageInput] = useState("");
  const [isListeningEnabled, setIsListeningEnabled] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(false);
  const [isVoiceOnlyMode, setIsVoiceOnlyMode] = useState(false);
  const [wakeWord, setWakeWord] = useState("Ok, Slapy");
  const [isTyping, setIsTyping] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastTTSEndTimeRef = useRef<number>(0);
  const lastAIResponseRef = useRef<string>('');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { speak, isPlaying: isTTSPlaying } = useTextToSpeech();

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ['/api/messages'],
    refetchInterval: 5000, // Poll for new messages
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: ({ message, inputType, voiceOnlyMode }: { message: string; inputType: 'text' | 'voice'; voiceOnlyMode?: boolean }) =>
      sendMessageToSlapy(message, inputType, voiceOnlyMode || false),
    onMutate: () => {
      setIsTyping(true);
    },
    onSuccess: (data) => {
      setIsTyping(false);
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      
      // Store last AI response for duplicate detection
      if (data.response) {
        lastAIResponseRef.current = data.response;
      }
      
      // Convert Slapy's response to speech if TTS is enabled
      if (isTTSEnabled && data.response) {
        speak(data.response);
      }
      
      toast({
        title: "Mensagem enviada",
        description: "Slapy respondeu sua mensagem!",
      });
    },
    onError: (error) => {
      setIsTyping(false);
      console.error('Error sending message:', error);
      toast({
        title: "Erro",
        description: "Falha ao enviar mensagem. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Normalize text for comparison
  const normalizeText = useCallback((text: string) => {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }, []);

  // Check if voice command is similar to last AI response (prevent echo)
  const isSimilarToLastResponse = useCallback((transcript: string) => {
    if (!lastAIResponseRef.current) return false;
    
    const normalizedTranscript = normalizeText(transcript);
    const normalizedLastResponse = normalizeText(lastAIResponseRef.current);
    
    // Check if transcript starts with or is contained in the last response
    return normalizedLastResponse.includes(normalizedTranscript) || 
           normalizedTranscript.includes(normalizedLastResponse) ||
           (normalizedTranscript.length > 10 && normalizedLastResponse.startsWith(normalizedTranscript.substring(0, 20)));
  }, [normalizeText]);

  // Voice command handler (defined before speech recognition hook)
  const handleVoiceCommand = useCallback((command: string) => {
    console.log('🎤 Voice command received:', command);
    if (command.trim()) {
      // Filter out potential echoes of AI responses
      if (isSimilarToLastResponse(command)) {
        console.log('🚫 Ignoring voice command - too similar to last AI response');
        return;
      }
      
      console.log('📤 Sending voice command to Slapy:', command);
      sendMessageMutation.mutate({ 
        message: command, 
        inputType: 'voice',
        voiceOnlyMode: isVoiceOnlyMode 
      });
    } else {
      console.log('⚠️ Empty command received, ignoring');
    }
  }, [sendMessageMutation, isSimilarToLastResponse]);

  // Track when TTS ends for cooldown
  const [suspended, setSuspended] = useState(false);
  
  useEffect(() => {
    if (isTTSPlaying) {
      setSuspended(true);
      lastTTSEndTimeRef.current = Date.now();
    } else {
      // Add cooldown after TTS ends
      const cooldownTimer = setTimeout(() => {
        setSuspended(false);
      }, 1200);
      return () => clearTimeout(cooldownTimer);
    }
  }, [isTTSPlaying]);

  // Speech recognition without wake word - auto-send when speech ends
  const { isListening, isSupported, lastError, startListening, stopListening, transcript } = useSpeechRecognition({
    continuous: isListeningEnabled,
    language: 'pt-BR',
    onFinalText: handleVoiceCommand,
    debug: false,
    suspended,
    minConfidence: 0.6,
  });

  // Log suspended state for debugging
  useEffect(() => {
    if (suspended) {
      console.log('🔇 Speech recognition suspended to prevent feedback loop');
    } else {
      console.log('🎤 Speech recognition available to resume');
    }
  }, [suspended]);

  // Voice input toggle handler
  const handleToggleListening = useCallback(() => {
    if (isListening) {
      console.log('🛑 Stopping voice recognition');
      stopListening();
    } else {
      console.log('▶️ Starting voice recognition');
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  function handleSendMessage() {
    const message = messageInput.trim();
    if (message) {
      sendMessageMutation.mutate({ 
        message, 
        inputType: 'text',
        voiceOnlyMode: isVoiceOnlyMode 
      });
      setMessageInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  function autoResizeTextarea() {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 128) + 'px';
    }
  }

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Stop listening immediately when continuous listening is disabled
  useEffect(() => {
    if (!isListeningEnabled && isListening) {
      stopListening();
    }
  }, [isListeningEnabled, isListening, stopListening]);

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-background to-secondary/10">
      {/* Sidebar */}
      <div className="hidden">
        <div className="flex-1 overflow-y-auto p-6">
          {/* Logo/Header */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center overflow-hidden border border-primary/20">
              <img src={logoImage} alt="Slapy Logo" className="w-10 h-10 object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">Slapy</h1>
              <p className="text-sm text-muted-foreground">Assistente de IA</p>
            </div>
          </div>


          {/* Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold mb-3">Configurações</h3>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Escuta Contínua</span>
                  <Switch
                    checked={isListeningEnabled}
                    onCheckedChange={setIsListeningEnabled}
                    data-testid="continuous-listening-toggle"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Síntese de Voz</span>
                  <Switch
                    checked={isTTSEnabled}
                    onCheckedChange={setIsTTSEnabled}
                    data-testid="tts-toggle"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Modo Apenas Voz</span>
                  <Switch
                    checked={isVoiceOnlyMode}
                    onCheckedChange={setIsVoiceOnlyMode}
                    data-testid="voice-only-toggle"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Esconde o chat e mostra visualização de áudio
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 715 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm text-center text-muted-foreground">
                    Fale normalmente quando a escuta estiver ativa. O sistema enviará automaticamente sua mensagem quando você parar de falar.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="glass-effect border-b border-border px-4 py-3 lg:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center overflow-hidden border border-primary/20">
                  <img src={logoImage} alt="Slapy Logo" className="w-8 h-8 object-cover" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Slapy</h2>
                  <p className="text-xs text-muted-foreground">Assistente conversacional ativo</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <ListeningIndicator 
                isListening={isListening && isListeningEnabled} 
                data-testid="listening-indicator"
              />
              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid="settings-button">
                    <Settings className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md" aria-describedby="settings-desc">
                  <DialogHeader>
                    <DialogTitle>Configurações</DialogTitle>
                    <DialogDescription id="settings-desc">
                      Ajuste as configurações de reconhecimento de voz, síntese de fala e modo de visualização.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Escuta Contínua</span>
                          <Switch
                            checked={isListeningEnabled}
                            onCheckedChange={setIsListeningEnabled}
                            data-testid="continuous-listening-toggle"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Síntese de Voz</span>
                          <Switch
                            checked={isTTSEnabled}
                            onCheckedChange={setIsTTSEnabled}
                            data-testid="tts-toggle"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Modo Apenas Voz</span>
                          <Switch
                            checked={isVoiceOnlyMode}
                            onCheckedChange={setIsVoiceOnlyMode}
                            data-testid="voice-only-toggle"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Esconde o chat e mostra visualização de áudio
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                            <svg className="w-4 h-4 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M7 4a3 3 0 616 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 715 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <p className="text-sm text-center text-muted-foreground">
                            Fale normalmente quando a escuta estiver ativa. O sistema enviará automaticamente sua mensagem quando você parar de falar.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        {/* Chat Messages or Audio Visualizer */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto chat-container"
          data-testid="chat-container"
        >
          {isVoiceOnlyMode ? (
            /* Audio Visualizer Mode */
            <div className="h-full flex items-center justify-center">
              <AudioVisualizer 
                isPlaying={isTTSPlaying || isTyping} 
                className="w-full"
              />
            </div>
          ) : (
          <div className="max-w-4xl mx-auto px-4 py-6 lg:px-6 space-y-6">
            
            {/* Welcome Message */}
            {messages.length === 0 && !isLoading && (
              <div className="flex justify-center">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-black/20 flex items-center justify-center overflow-hidden border border-primary/30">
                    <img src={logoImage} alt="Slapy Logo" className="w-16 h-16 object-cover" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 gradient-text">Olá! Eu sou o Slapy</h3>
                  <p className="text-muted-foreground text-sm">
                    Seu assistente de IA conversacional. Você pode falar comigo usando a palavra-chave "{wakeWord}" ou digitar sua mensagem abaixo.
                  </p>
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((message) => (
              <ChatMessageComponent 
                key={message.id} 
                message={message} 
              />
            ))}

            {/* Voice Transcription Indicator */}
            {isListening && transcript && (
              <div className="flex items-start space-x-3 message-animation" data-testid="voice-transcription">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center flex-shrink-0 listening-indicator">
                  <svg className="w-4 h-4 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="bg-secondary/50 border border-primary/30 rounded-2xl rounded-tl-md px-4 py-3 max-w-2xl">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                      <span className="text-xs text-primary font-medium">Escutando...</span>
                    </div>
                    <p className="text-sm text-foreground/90" data-testid="live-transcript">
                      {transcript}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-start space-x-3 message-animation" data-testid="typing-indicator">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center flex-shrink-0">
                  <Bot className="text-primary-foreground text-sm" />
                </div>
                <div className="flex-1">
                  <div className="bg-card border border-border rounded-2xl rounded-tl-md px-4 py-3 max-w-xs">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          )}
        </div>

        {/* Input Area */}
        <div className="glass-effect border-t border-border p-4 lg:p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end space-x-3">
              {/* Voice Input Button */}
              <VoiceInput
                isListening={isListening}
                isEnabled={isListeningEnabled}
                isSupported={isSupported}
                hasError={!!lastError}
                errorMessage={lastError}
                onToggleListening={handleToggleListening}
                className="flex-shrink-0"
              />

              {/* Text Input */}
              <div className="flex-1">
                <div className="relative">
                  <Textarea
                    ref={textareaRef}
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      autoResizeTextarea();
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite sua mensagem ou ative o microfone para falar diretamente..."
                    className="w-full bg-input border border-border rounded-xl px-4 py-3 pr-12 text-sm resize-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200 max-h-32 min-h-[48px]"
                    rows={1}
                    data-testid="message-input"
                  />
                  
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || sendMessageMutation.isPending}
                    size="icon"
                    className="absolute right-2 bottom-2 w-8 h-8 rounded-lg"
                    data-testid="send-button"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
              <div className="flex items-center space-x-4">
                <span>🎤 Dica: Ative o microfone e fale normalmente - envio automático</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>Shift + Enter para nova linha</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
