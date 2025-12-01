
import React, { useState, useEffect, useRef } from 'react';
import { startChat, sendMessageToChat } from '../services/geminiService';
import { Chat as GeminiChat, GenerateContentResponse } from '@google/genai';
import { SendIcon, BotIcon, UserIcon } from './Icons';
import { Language } from '../types';
import { translations } from '../translations';

interface Message {
  sender: 'user' | 'bot';
  text: string;
}

interface ChatBotProps {
    language: Language;
}

const ChatBot: React.FC<ChatBotProps> = ({ language }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<GeminiChat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const t = translations[language];

  useEffect(() => {
    chatRef.current = startChat(language);
    setMessages([{ sender: 'bot', text: t.chatWelcome }]);
  }, [language]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading || !chatRef.current) return;

    const userMessage: Message = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const stream = await sendMessageToChat(chatRef.current, input);
      let botResponse = '';
      setMessages(prev => [...prev, { sender: 'bot', text: '' }]);
      
      for await (const chunk of stream) {
        botResponse += chunk.text;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text = botResponse;
          return newMessages;
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setMessages(prev => [...prev, { sender: 'bot', text: `Sorry, something went wrong. ${errorMessage}` }]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-150px)] max-h-[70vh] bg-gray-800/50 rounded-lg shadow-xl animate-fadeIn">
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'bot' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center"><BotIcon /></div>}
            <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-xl ${msg.sender === 'user' ? 'bg-cyan-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
              <p className="text-sm break-words">{msg.text}</p>
              {loading && msg.sender === 'bot' && index === messages.length - 1 && <div className="typing-indicator"><span>.</span><span>.</span><span>.</span></div>}
            </div>
            {msg.sender === 'user' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center"><UserIcon /></div>}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-gray-700 flex items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={t.chatInput}
          className="flex-grow bg-gray-700 border border-gray-600 rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()} className="ml-3 bg-cyan-600 hover:bg-cyan-700 text-white p-2 rounded-full disabled:opacity-50 transition-colors">
          <SendIcon />
        </button>
      </div>
      <style>{`
        .typing-indicator span {
          display: inline-block;
          animation: bounce 1.2s infinite;
        }
        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }
        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
};

export default ChatBot;
