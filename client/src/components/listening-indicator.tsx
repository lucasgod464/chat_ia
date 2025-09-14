import { cn } from "@/lib/utils";

interface ListeningIndicatorProps {
  isListening: boolean;
  className?: string;
}

export function ListeningIndicator({ isListening, className }: ListeningIndicatorProps) {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div 
        className={cn(
          "w-3 h-3 rounded-full bg-primary transition-all duration-300",
          isListening ? "listening-indicator" : "opacity-50"
        )}
      />
      <span className="text-sm text-muted-foreground hidden sm:inline">
        {isListening ? "Escutando..." : "Pausado"}
      </span>
    </div>
  );
}
