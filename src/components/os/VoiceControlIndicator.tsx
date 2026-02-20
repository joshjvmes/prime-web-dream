import { Mic, MicOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface VoiceControlIndicatorProps {
  isListening: boolean;
  lastCommand: string;
  supported: boolean;
  onToggle: () => void;
}

export default function VoiceControlIndicator({ isListening, lastCommand, supported, onToggle }: VoiceControlIndicatorProps) {
  if (!supported) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onToggle}
            className={`relative p-1 rounded transition-colors ${
              isListening
                ? 'text-primary hover:bg-primary/20'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            aria-label={isListening ? 'Voice control active' : 'Voice control off'}
          >
            {isListening ? <Mic size={13} /> : <MicOff size={13} />}
            {isListening && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-destructive animate-pulse" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[10px]">
          {isListening
            ? lastCommand ? `Last: "${lastCommand}"` : 'Listening… say "open terminal"'
            : 'Click to enable voice control'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
