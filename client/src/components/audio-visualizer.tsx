import { useEffect, useState } from 'react';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioVisualizerProps {
  isPlaying: boolean;
  className?: string;
}

export function AudioVisualizer({ isPlaying, className }: AudioVisualizerProps) {
  const [spikeHeights, setSpikeHeights] = useState<number[]>(Array(24).fill(0.3));
  const [pulseIntensity, setPulseIntensity] = useState(0.5);

  useEffect(() => {
    if (!isPlaying) {
      setSpikeHeights(Array(24).fill(0.3));
      setPulseIntensity(0.5);
      return;
    }

    const interval = setInterval(() => {
      setSpikeHeights(prev => 
        prev.map(() => Math.random() * 0.7 + 0.3)
      );
      setPulseIntensity(Math.random() * 0.5 + 0.5);
    }, 120);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const generateSpikeHeight = (baseHeight: number, index: number) => {
    const time = Date.now() / 1000;
    const frequency = 1 + (index * 0.15);
    const height = baseHeight * (0.8 + 0.6 * Math.sin(time * frequency));
    return Math.max(0.2, Math.min(1, height));
  };

  return (
    <div className={cn("flex flex-col items-center justify-center min-h-[400px] relative", className)}>
      {/* Fundo com gradiente radial */}
      <div className="absolute inset-0 bg-gradient-radial from-blue-900/20 via-purple-900/10 to-transparent" />
      
      {/* Container principal do visualizador */}
      <div className="relative w-80 h-80 flex items-center justify-center">
        
        {/* Spikes/Raios radiantes */}
        <div className="absolute inset-0">
          {spikeHeights.map((height, index) => {
            const angle = (index * 360) / spikeHeights.length;
            const spikeHeight = isPlaying ? generateSpikeHeight(height, index) * 80 : 30;
            const opacity = isPlaying ? 0.8 : 0.3;
            
            return (
              <div
                key={index}
                className="absolute top-1/2 left-1/2 origin-bottom"
                style={{
                  transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                  transformOrigin: 'center bottom'
                }}
              >
                <div
                  className="w-1 bg-gradient-to-t transition-all duration-150"
                  style={{
                    height: `${spikeHeight}px`,
                    background: `linear-gradient(to top, 
                      hsl(${(angle + (isPlaying ? Date.now() / 50 : 0)) % 360}, 70%, 60%), 
                      hsl(${(angle + 120 + (isPlaying ? Date.now() / 50 : 0)) % 360}, 80%, 70%)
                    )`,
                    opacity,
                    boxShadow: `0 0 ${isPlaying ? 10 : 5}px hsl(${(angle + (isPlaying ? Date.now() / 50 : 0)) % 360}, 70%, 60%)`
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Círculos concêntricos */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Círculo externo */}
          <div 
            className={cn(
              "absolute w-72 h-72 rounded-full border-2 transition-all duration-300",
              isPlaying ? "animate-spin-slow" : ""
            )}
            style={{
              borderImage: `conic-gradient(from 0deg, 
                hsl(270, 70%, 60%), 
                hsl(300, 80%, 70%), 
                hsl(210, 90%, 70%), 
                hsl(180, 80%, 60%), 
                hsl(270, 70%, 60%)
              ) 1`,
              opacity: isPlaying ? 0.8 : 0.4,
              filter: `blur(${isPlaying ? 0 : 1}px)`
            }}
          />
          
          {/* Círculo médio */}
          <div 
            className={cn(
              "absolute w-48 h-48 rounded-full border transition-all duration-300",
              isPlaying ? "animate-spin-slow-reverse" : ""
            )}
            style={{
              borderImage: `conic-gradient(from 180deg, 
                hsl(240, 80%, 70%), 
                hsl(300, 90%, 80%), 
                hsl(180, 70%, 60%), 
                hsl(240, 80%, 70%)
              ) 1`,
              opacity: isPlaying ? 0.9 : 0.5,
              animationDirection: 'reverse'
            }}
          />
          
          {/* Círculo interno */}
          <div 
            className={cn(
              "absolute w-32 h-32 rounded-full transition-all duration-300",
              isPlaying && "animate-pulse"
            )}
            style={{
              background: `radial-gradient(circle, 
                hsl(240, 100%, 90%) 0%, 
                hsl(270, 80%, 70%) 30%, 
                hsl(300, 70%, 60%) 60%, 
                transparent 100%
              )`,
              opacity: isPlaying ? 1 : 0.6,
              transform: `scale(${isPlaying ? 1 + pulseIntensity * 0.2 : 1})`,
              boxShadow: `0 0 ${isPlaying ? 40 : 20}px hsl(240, 80%, 70%)`
            }}
          />
        </div>

        {/* Avatar central */}
        <div className="relative z-10">
          <div 
            className={cn(
              "w-16 h-16 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center transition-all duration-300 shadow-lg",
              isPlaying && "scale-110"
            )}
            style={{
              boxShadow: `0 0 ${isPlaying ? 30 : 15}px hsl(240, 80%, 70%)`
            }}
          >
            <Bot className="text-white text-2xl" />
          </div>
        </div>
      </div>

      {/* Texto de status */}
      <div className="text-center space-y-2 mt-8 relative z-10">
        <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          {isPlaying ? "Slapy está falando..." : "Slapy está escutando"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isPlaying 
            ? "Aguarde a resposta terminar"
            : "Fale normalmente para interagir"
          }
        </p>
      </div>
    </div>
  );
}

// Estilos CSS customizados para as animações
const styles = `
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes spin-slow-reverse {
    from { transform: rotate(360deg); }
    to { transform: rotate(0deg); }
  }
  
  .animate-spin-slow {
    animation: spin-slow 8s linear infinite;
  }
  
  .animate-spin-slow-reverse {
    animation: spin-slow-reverse 12s linear infinite;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}