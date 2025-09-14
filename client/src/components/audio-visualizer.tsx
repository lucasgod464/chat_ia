import { Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioVisualizerProps {
  isPlaying: boolean;
  className?: string;
}

export function AudioVisualizer({ isPlaying, className }: AudioVisualizerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center min-h-[400px] relative", className)}>
      {/* Container principal em perspectiva 3D */}
      <div 
        className="relative flex items-center justify-center"
        style={{
          perspective: '1000px',
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Quadrado externo */}
        <div 
          className={cn(
            "absolute w-80 h-80 border-2 transition-all duration-500 ease-in-out",
            isPlaying ? "border-cyan-400 shadow-lg" : "border-cyan-400/60"
          )}
          style={{
            transform: `rotateX(25deg) rotateZ(15deg) ${isPlaying ? 'scale(1.05)' : 'scale(1)'}`,
            boxShadow: isPlaying 
              ? '0 0 40px rgba(34, 211, 238, 0.6), inset 0 0 20px rgba(34, 211, 238, 0.2)' 
              : '0 0 20px rgba(34, 211, 238, 0.3), inset 0 0 10px rgba(34, 211, 238, 0.1)',
            background: 'linear-gradient(45deg, rgba(34, 211, 238, 0.05), rgba(147, 51, 234, 0.05))',
            transformOrigin: 'center center'
          }}
        />

        {/* Quadrado médio */}
        <div 
          className={cn(
            "absolute w-64 h-64 border-2 transition-all duration-500 ease-in-out",
            isPlaying ? "border-purple-400 shadow-lg" : "border-purple-400/60"
          )}
          style={{
            transform: `rotateX(35deg) rotateZ(-10deg) ${isPlaying ? 'scale(1.08)' : 'scale(1)'}`,
            boxShadow: isPlaying 
              ? '0 0 35px rgba(192, 132, 252, 0.6), inset 0 0 15px rgba(192, 132, 252, 0.2)' 
              : '0 0 15px rgba(192, 132, 252, 0.3), inset 0 0 8px rgba(192, 132, 252, 0.1)',
            background: 'linear-gradient(-45deg, rgba(192, 132, 252, 0.05), rgba(236, 72, 153, 0.05))',
            transformOrigin: 'center center'
          }}
        />

        {/* Quadrado interno */}
        <div 
          className={cn(
            "absolute w-48 h-48 border transition-all duration-500 ease-in-out",
            isPlaying ? "border-blue-400 shadow-lg" : "border-blue-400/60"
          )}
          style={{
            transform: `rotateX(45deg) rotateZ(8deg) ${isPlaying ? 'scale(1.1)' : 'scale(1)'}`,
            boxShadow: isPlaying 
              ? '0 0 30px rgba(59, 130, 246, 0.6), inset 0 0 12px rgba(59, 130, 246, 0.2)' 
              : '0 0 12px rgba(59, 130, 246, 0.3), inset 0 0 6px rgba(59, 130, 246, 0.1)',
            background: 'linear-gradient(225deg, rgba(59, 130, 246, 0.05), rgba(34, 211, 238, 0.05))',
            transformOrigin: 'center center'
          }}
        />

        {/* Centro circular com gradiente */}
        <div className="relative z-10 flex items-center justify-center">
          <div 
            className={cn(
              "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300",
              isPlaying && "animate-pulse"
            )}
            style={{
              background: `radial-gradient(circle, 
                rgba(236, 72, 153, 0.9) 0%, 
                rgba(244, 114, 182, 0.8) 30%, 
                rgba(34, 211, 238, 0.7) 70%, 
                rgba(34, 211, 238, 0.9) 100%
              )`,
              boxShadow: isPlaying 
                ? '0 0 40px rgba(236, 72, 153, 0.8), 0 0 80px rgba(34, 211, 238, 0.4)' 
                : '0 0 20px rgba(236, 72, 153, 0.6), 0 0 40px rgba(34, 211, 238, 0.3)',
              transform: `scale(${isPlaying ? 1.1 : 1})`,
              filter: `brightness(${isPlaying ? 1.2 : 1})`
            }}
          >
            <Mic 
              className={cn(
                "text-white transition-all duration-300",
                isPlaying ? "text-3xl" : "text-2xl"
              )} 
              size={isPlaying ? 32 : 24}
            />
          </div>
        </div>
      </div>

      {/* Texto de status */}
      <div className="text-center space-y-2 mt-12 relative z-10">
        <h3 className="text-xl font-semibold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
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