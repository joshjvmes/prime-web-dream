import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface VoiceCommand {
  action: string;
  argument?: string;
}

interface UseVoiceControlOptions {
  enabled?: boolean;
  onCommand?: (cmd: VoiceCommand) => void;
}

export function useVoiceControl({ enabled = false, onCommand }: UseVoiceControlOptions) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState('');
  const recognitionRef = useRef<any>(null);
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;

  const supported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const parseCommand = useCallback((text: string): VoiceCommand | null => {
    const lower = text.toLowerCase().trim();
    
    // Remove wake words
    const cleaned = lower.replace(/^(prime|computer)\s+/i, '');
    
    if (/^open\s+(.+)/.test(cleaned)) return { action: 'open', argument: cleaned.replace(/^open\s+/, '') };
    if (/^close\s+(.+)/.test(cleaned)) return { action: 'close', argument: cleaned.replace(/^close\s+/, '') };
    if (/^lock\s*(screen)?$/.test(cleaned)) return { action: 'lock' };
    if (/^search\s+(.+)/.test(cleaned)) return { action: 'search', argument: cleaned.replace(/^search\s+/, '') };
    if (/^switch\s+workspace\s+(\d)/.test(cleaned)) {
      const m = cleaned.match(/(\d)/);
      return { action: 'switchWorkspace', argument: m?.[1] };
    }
    if (/^minimize$/.test(cleaned)) return { action: 'minimize' };
    if (/^maximize$/.test(cleaned)) return { action: 'maximize' };
    
    return null;
  }, []);

  const startListening = useCallback(() => {
    if (!supported || isListening) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.resultIndex];
      if (result.isFinal) {
        const text = result[0].transcript;
        setTranscript(text);
        const cmd = parseCommand(text);
        if (cmd) {
          setLastCommand(`${cmd.action}${cmd.argument ? ': ' + cmd.argument : ''}`);
          onCommandRef.current?.(cmd);
        }
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => {
      // Restart if still supposed to be listening
      if (recognitionRef.current === recognition) {
        try { recognition.start(); } catch {}
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }, [supported, isListening, parseCommand]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      const ref = recognitionRef.current;
      recognitionRef.current = null;
      try { ref.stop(); } catch {}
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    if (enabled && supported && !isListening) {
      startListening();
    } else if (!enabled && isListening) {
      stopListening();
    }
  }, [enabled, supported]);

  useEffect(() => {
    return () => { stopListening(); };
  }, []);

  return { isListening, transcript, lastCommand, startListening, stopListening, supported };
}
