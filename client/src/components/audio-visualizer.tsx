import { useEffect, useState } from 'react';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioVisualizerProps {
  isPlaying: boolean;
  className?: string;
}

export function AudioVisualizer({ isPlaying, className }: AudioVisualizerProps) {
  const [waveAmplitudes, setWaveAmplitudes] = useState<number[]>(Array(12).fill(0.2));

  useEffect(() => {
    if (!isPlaying) {
      setWaveAmplitudes(Array(12).fill(0.2));
      return;
    }

    const interval = setInterval(() => {
      setWaveAmplitudes(prev => 
        prev.map(() => Math.random() * 0.8 + 0.2)
      );
    }, 150);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const generateWave = (baseAmplitude: number, index: number) => {
    const time = Date.now() / 1000;
    const frequency = 0.5 + (index * 0.1);
    const amplitude = baseAmplitude * (0.8 + 0.4 * Math.sin(time * frequency));
    return Math.max(0.1, Math.min(1, amplitude));
  };

  return (
    <div className={cn("flex flex-col items-center justify-center min-h-[400px] space-y-8", className)}>
      {/* Avatar central com pulsação */}
      <div className="relative">
        <div 
          className={cn(
            "w-24 h-24 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center transition-all duration-300",
            isPlaying && "animate-pulse scale-110"
          )}
        >
          <Bot className="text-primary-foreground text-3xl" />
        </div>
        
        {/* Anéis de pulsação quando falando */}
        {isPlaying && (
          <>
            <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
            <div className="absolute inset-0 rounded-full border-2 border-accent/20 animate-pulse" style={{ animationDelay: '0.5s' }} />
          </>
        )}
      </div>

      {/* Visualizador de ondas */}
      <div className="flex items-end space-x-2 h-32">
        {waveAmplitudes.map((amplitude, index) => {
          const height = isPlaying ? generateWave(amplitude, index) * 100 : 20;
          return (
            <div
              key={index}
              className={cn(
                "bg-gradient-to-t from-primary to-accent rounded-full transition-all duration-150 ease-out",
                isPlaying ? "opacity-100" : "opacity-30"
              )}
              style={{
                width: '8px',
                height: `${height}px`,
                animationDelay: `${index * 0.1}s`
              }}
            />
          );
        })}
      </div>

      {/* Texto de status */}
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold gradient-text">
          {isPlaying ? "Slapy está falando..." : "Slapy está escutando"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isPlaying 
            ? "Aguarde a resposta terminar"
            : "Fale normalmente para interagir"
          }
        </p>
      </div>

      {/* Indicadores de ritmo */}
      {isPlaying && (
        <div className="flex space-x-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 bg-primary rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}