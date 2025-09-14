import { Bot, User, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import type { ChatMessage } from "@shared/schema";

interface ChatMessageProps {
  message: ChatMessage;
  className?: string;
}

export function ChatMessageComponent({ message, className }: ChatMessageProps) {
  const { speak, isPlaying } = useTextToSpeech();
  const isUser = message.sender === 'user';
  const isVoiceInput = message.inputType === 'voice';

  const formatTime = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handlePlayAudio = () => {
    if (!isPlaying) {
      speak(message.content);
    }
  };

  return (
    <div className={cn("flex items-start space-x-3 message-animation", className)} data-testid={`message-${message.id}`}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        isUser 
          ? "bg-card border border-border" 
          : "bg-gradient-to-r from-primary to-accent"
      )}>
        {isUser ? (
          <User className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-primary-foreground" />
        )}
      </div>
      
      <div className="flex-1">
        <div className={cn(
          "border border-border rounded-2xl rounded-tl-md px-4 py-3",
          isUser 
            ? "bg-secondary max-w-lg" 
            : "bg-card max-w-2xl"
        )}>
          <p className={cn(
            "text-sm",
            isUser ? "text-secondary-foreground" : "text-card-foreground"
          )} data-testid="message-content">
            {message.content}
          </p>
        </div>
        
        <div className="flex items-center space-x-2 mt-2">
          <span className="text-xs text-muted-foreground" data-testid="message-timestamp">
            {formatTime(message.timestamp)}
          </span>
          
          {isVoiceInput && (
            <span className="text-xs text-primary flex items-center" data-testid="voice-indicator">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
              Voz
            </span>
          )}
          
          {!isUser && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary hover:text-accent transition-colors h-auto p-0"
              onClick={handlePlayAudio}
              disabled={isPlaying}
              data-testid="play-audio-button"
            >
              <Volume2 className="w-3 h-3 mr-1" />
              {isPlaying ? 'Reproduzindo...' : 'Reproduzir áudio'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
