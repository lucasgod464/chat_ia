import { Mic, MicOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoiceInputProps {
  isListening: boolean;
  isEnabled: boolean;
  isSupported: boolean;
  hasError?: boolean;
  errorMessage?: string | null;
  className?: string;
  onToggleListening?: () => void;
}

export function VoiceInput({ 
  isListening,
  isEnabled, 
  isSupported,
  hasError = false,
  errorMessage,
  className,
  onToggleListening
}: VoiceInputProps) {

  if (!isSupported) {
    return (
      <Button
        disabled
        size="icon"
        className={cn("w-12 h-12 rounded-full", className)}
        data-testid="voice-button-unsupported"
        title="Reconhecimento de voz não suportado"
      >
        <MicOff className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button
        onClick={onToggleListening}
        disabled={!isEnabled}
        size="icon"
        className={cn(
          "w-12 h-12 rounded-full bg-gradient-to-r from-primary to-accent hover:from-primary/80 hover:to-accent/80 text-primary-foreground transition-all duration-300",
          isListening && "listening-indicator animate-pulse",
          hasError && "bg-red-500 hover:bg-red-600",
          className
        )}
        data-testid="voice-button"
        title={
          hasError 
            ? `Erro: ${errorMessage || 'Problema no reconhecimento de voz'}` 
            : isListening 
              ? "Escutando... Clique para parar" 
              : "Clique para ativar reconhecimento de voz"
        }
      >
        {hasError ? (
          <AlertCircle className="h-5 w-5" />
        ) : isListening ? (
          <Mic className="h-5 w-5" />
        ) : (
          <MicOff className="h-5 w-5" />
        )}
      </Button>

      {/* Status indicator */}
      {isListening && (
        <div 
          className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"
          data-testid="listening-status-indicator"
        />
      )}

      {/* Error indicator */}
      {hasError && errorMessage && (
        <div 
          className="absolute bottom-14 left-0 right-0 p-2 bg-red-500/20 border border-red-500/30 rounded-lg text-sm text-red-400 min-w-64 z-10"
          data-testid="error-display"
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>Erro: {errorMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
