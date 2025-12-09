
import React, { useState, useEffect, useRef } from 'react';
import { startChat, sendMessageToChat } from '../services/geminiService';
import { Chat as GeminiChat } from '@google/genai';
import { SendIcon, BotIcon, UserIcon, UserLocationIcon } from './Icons';
import { Language, GeolocationState } from '../types';
import { translations } from '../translations';

interface Message {
  sender: 'user' | 'bot';
  text: string;
}

interface ChatBotProps {
  language: Language;
  location: GeolocationState;
}

const ChatBot: React.FC<ChatBotProps> = ({ language, location }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<GeminiChat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const t = translations[language];

  useEffect(() => {
    try {
      chatRef.current = startChat(language);
      setMessages([{ sender: 'bot', text: t.chatWelcome }]);
    } catch (e) {
      console.error("Failed to start chat:", e);
      setMessages([{ sender: 'bot', text: "Error: Could not connect to AI service. Please check your API key configuration." }]);
    }
  }, [language]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async (messageText: string = input) => {
    if (!messageText.trim() || loading || !chatRef.current) return;

    const userMessage: Message = { sender: 'user', text: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const stream = await sendMessageToChat(chatRef.current, messageText);
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

  const handleShareLocation = () => {
    console.log("Share Location Clicked. Location:", location);
    if (location.latitude && location.longitude) {
      const locMsg = `My current location is Latitude: ${location.latitude}, Longitude: ${location.longitude}.`;
      handleSend(locMsg);
    } else {
      alert("Location is not available yet. Please Ensure GPS is enabled and wait a moment.");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-150px)] max-h-[70vh] bg-white rounded-2xl shadow-lg border border-slate-200 animate-fadeIn overflow-hidden">
      <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-slate-50">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'bot' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center mb-1 shadow-sm">
                <BotIcon />
              </div>
            )}
            <div className={`max-w-[80%] md:max-w-md px-5 py-3 rounded-2xl shadow-sm text-sm leading-relaxed ${msg.sender === 'user'
              ? 'bg-blue-600 text-white rounded-br-none'
              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
              }`}>
              <p className="break-words">{msg.text}</p>
              {loading && msg.sender === 'bot' && index === messages.length - 1 && (
                <div className="typing-indicator mt-1 opacity-70"><span>.</span><span>.</span><span>.</span></div>
              )}
            </div>
            {msg.sender === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-1 shadow-sm">
                <UserIcon />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {/* Quick Suggestion Chips */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex gap-2 overflow-x-auto">
        <button
          onClick={() => handleSend(t.chatSuggest1)}
          disabled={loading}
          className="flex-shrink-0 px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-full text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          {t.chatSuggest1}
        </button>
        <button
          onClick={() => handleSend(t.chatSuggest2)}
          disabled={loading}
          className="flex-shrink-0 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-xs font-semibold hover:bg-blue-100 transition-colors disabled:opacity-50"
        >
          {t.chatSuggest2}
        </button>
        <button
          onClick={() => handleSend(t.chatSuggest3)}
          disabled={loading}
          className="flex-shrink-0 px-3 py-1.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-xs font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          {t.chatSuggest3}
        </button>
      </div>
      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200 flex items-center gap-3">
        <button
          onClick={handleShareLocation}
          title={location.latitude ? "Share my location" : "Waiting for GPS..."}
          disabled={loading}
          className={`transition-colors p-2 rounded-full ${location.latitude ? 'text-blue-600 hover:bg-blue-50' : 'text-slate-300 hover:text-slate-400'}`}
        >
          <UserLocationIcon />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={t.chatInput}
          className="flex-grow bg-slate-100 border border-slate-200 text-slate-900 rounded-full py-3 px-5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm shadow-inner"
          disabled={loading}
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white p-3 rounded-full shadow-md transition-all transform hover:scale-105"
        >
          <SendIcon />
        </button>
      </div>
      <style>{`
        .typing-indicator span {
          display: inline-block;
          animation: bounce 1.2s infinite;
          margin: 0 1px;
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
