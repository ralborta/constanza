'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bot, User, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface InvoiceChatProps {
  invoiceId: string;
}

export function InvoiceChat({ invoiceId }: InvoiceChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hola, soy Constanza. Estoy aquí para ayudarte a analizar y gestionar esta factura específica. Puedo ayudarte a entender el estado de la cobranza, analizar las interacciones, sugerir próximos pasos y responder preguntas sobre esta factura y el cliente. ¿En qué puedo ayudarte?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const response = await api.post(`/v1/invoices/${invoiceId}/chat`, {
        message,
        conversationHistory,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.message,
          timestamp: new Date(data.timestamp),
        },
      ]);
      setIsThinking(false);
    },
    onError: (error: any) => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Lo siento, ocurrió un error al procesar tu mensaje: ${error.response?.data?.message || error.message || 'Error desconocido'}. Por favor, intenta nuevamente.`,
          timestamp: new Date(),
        },
      ]);
      setIsThinking(false);
    },
  });

  const handleSend = () => {
    if (!input.trim() || isThinking || chatMutation.isPending) return;
    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMessage, timestamp: new Date() },
    ]);
    setIsThinking(true);
    chatMutation.mutate(userMessage);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Bot className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground leading-none">Constanza IA</p>
          <p className="text-xs text-muted-foreground mt-0.5">Asistente de cobranza para esta factura</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          <span className="text-xs text-muted-foreground">En línea</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-background">
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              'flex gap-3',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
            <div
              className={cn(
                'max-w-[78%] rounded-xl px-4 py-3',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-tr-sm'
                  : 'bg-muted/60 text-foreground border border-border rounded-tl-sm'
              )}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              <p className={cn(
                'text-[10px] mt-1.5',
                message.role === 'user' ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground'
              )}>
                {message.timestamp.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {isThinking && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="bg-muted/60 rounded-xl rounded-tl-sm px-4 py-3 border border-border">
              <div className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Analizando...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4 bg-card">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu pregunta sobre esta factura..."
            rows={2}
            className="resize-none text-sm"
            disabled={isThinking || chatMutation.isPending}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isThinking || chatMutation.isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-[68px] w-10 flex-shrink-0"
            size="icon"
          >
            {isThinking || chatMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">Enter para enviar · Shift+Enter para nueva línea</p>
      </div>
    </div>
  );
}
