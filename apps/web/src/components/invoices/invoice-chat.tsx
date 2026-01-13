'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
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
      const conversationHistory = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
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
    
    // Agregar mensaje del usuario
    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      },
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
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h3 className="font-semibold">Chat sobre esta factura</h3>
        </div>
        <p className="text-sm text-purple-100 mt-1">
          Pregunta sobre esta factura específica y su gestión de cobranza
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              'flex gap-3',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                IA
              </div>
            )}
            <div
              className={cn(
                'max-w-[80%] rounded-lg px-4 py-2',
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-900 border border-gray-200'
              )}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
              <p className="text-xs mt-1 opacity-70">
                {message.timestamp.toLocaleTimeString('es-AR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                Tú
              </div>
            )}
          </div>
        ))}

        {isThinking && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-semibold">
              IA
            </div>
            <div className="bg-white rounded-lg px-4 py-2 border border-gray-200">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                <span className="text-sm text-gray-500">Pensando...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu pregunta sobre esta factura..."
            rows={2}
            className="resize-none"
            disabled={isThinking || chatMutation.isPending}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isThinking || chatMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            size="icon"
          >
            {isThinking || chatMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Presiona Enter para enviar, Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  );
}
