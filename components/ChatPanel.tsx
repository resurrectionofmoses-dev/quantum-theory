/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Bot, Send, X, Globe } from 'lucide-react';

// Assuming process.env.API_KEY is available
const API_KEY = process.env.API_KEY;

interface Message {
  sender: 'user' | 'ai';
  text: string;
  sources?: { uri: string; title: string }[];
}

const ChatPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
      { sender: 'ai', text: "Hello! I'm your Physics AI Assistant. Ask me anything about the simulations or physics concepts!" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { sender: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      if (!API_KEY) {
        throw new Error("API_KEY is not set. Please configure your environment.");
      }
      const ai = new GoogleGenAI({ apiKey: API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Given the context of a web-based physics simulator with bouncing balls inside geometric shapes, answer the following user query: "${input.trim()}"`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text ?? 'Sorry, I could not process that.';
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources = groundingChunks
        ?.map(chunk => chunk.web)
        .filter(web => web?.uri && web.title) as { uri: string; title: string }[] | undefined;

      const aiMessage: Message = { sender: 'ai', text, sources };
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error("Gemini API call failed", error);
      const errorMessage: Message = { sender: 'ai', text: 'An error occurred. Please check the console for details and ensure your API key is valid.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-cyan-500 text-black rounded-full p-4 shadow-lg hover:bg-cyan-400 transition-colors animate-pulse"
        aria-label="Open chat"
      >
        <Bot size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm h-[500px] bg-gray-900/80 backdrop-blur-md rounded-xl border border-gray-700 shadow-2xl flex flex-col font-sans">
      {/* Header */}
      <div className="flex justify-between items-center p-3 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-2">
            <Bot size={18} className="text-cyan-400" />
            <h3 className="font-bold text-white">Physics AI Assistant</h3>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white" aria-label="Close chat">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="flex flex-col gap-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] p-2 rounded-lg ${msg.sender === 'user' ? 'bg-cyan-500 text-black' : 'bg-gray-800 text-gray-200'}`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 w-full max-w-[85%]">
                    <p className="text-xs text-gray-500 mb-1">Sources:</p>
                    <div className="flex flex-col gap-1.5">
                    {msg.sources.map((source, i) => (
                        <a href={source.uri} target="_blank" rel="noopener noreferrer" key={i} className="text-xs text-cyan-400 bg-gray-800 p-1.5 rounded border border-gray-700 hover:bg-gray-700 truncate block">
                            <Globe size={12} className="inline mr-1.5 align-middle" />
                            <span className="align-middle">{source.title}</span>
                        </a>
                    ))}
                    </div>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start">
              <div className="max-w-[85%] p-2 rounded-lg bg-gray-800 text-gray-200">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></div>
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-700 flex-shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2 bg-gray-800 rounded-lg p-1 border border-gray-600 focus-within:border-cyan-500">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Ask about physics..."
            className="flex-1 bg-transparent text-sm text-gray-200 outline-none px-2 py-1"
            aria-label="Chat input"
          />
          <button type="submit" disabled={isLoading || !input.trim()} className="p-2 rounded-md bg-cyan-500 text-black disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-cyan-400 transition-colors" aria-label="Send message">
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;