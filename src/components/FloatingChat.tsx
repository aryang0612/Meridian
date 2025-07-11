'use client';

import React, { useState, useEffect } from 'react';
import { AppIcons } from '../lib/iconSystem';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface ConnectionStatus {
  isConnected: boolean;
  isRetrying: boolean;
  retryCount: number;
}

export default function FloatingChat() {
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{role: string, content: string}>>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: true,
    isRetrying: false,
    retryCount: 0
  });
  const [mounted, setMounted] = useState(false);

  // Client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Test connection on mount (client-side only)
  useEffect(() => {
    if (!mounted) return; // Only run after client-side mount
    testConnection();
  }, [mounted]);

  const testConnection = async () => {
    if (typeof window === 'undefined') return; // Server-side check
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'test',
          conversationHistory: []
        }),
      });
      
      setConnectionStatus(prev => ({
        ...prev,
        isConnected: response.ok,
        isRetrying: false,
        retryCount: 0
      }));
    } catch (error) {
      setConnectionStatus(prev => ({
        ...prev,
        isConnected: false,
        isRetrying: false
      }));
    }
  };

  // Add function to send message to ChatGPT with retry logic
  const sendMessage = async (retryCount = 0) => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(), // Simple unique ID
      text: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Add retry logic with exponential backoff
      const maxRetries = 3;
      let lastError;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            setConnectionStatus(prev => ({
              ...prev,
              isRetrying: true,
              retryCount: attempt
            }));
            // Exponential backoff: 1s, 2s, 4s
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
              message: userMessage.text,
          conversationHistory: conversationHistory
        }),
      });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

      const data = await response.json();

          setConnectionStatus(prev => ({
            ...prev,
            isConnected: true,
            isRetrying: false,
            retryCount: 0
          }));

        const assistantMessage: ChatMessage = {
            id: Date.now().toString(), // Simple unique ID
            text: data.response,
            sender: 'assistant',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
        setConversationHistory(data.conversationHistory);
          return; // Success - exit retry loop
          
        } catch (error) {
          lastError = error;
          console.error(`Chat attempt ${attempt + 1} failed:`, error);
          
          // If it's the last attempt, don't retry
          if (attempt === maxRetries) {
            break;
          }
        }
      }

      // If we get here, all retries failed
      throw lastError;

    } catch (error) {
      console.error('Chat error after retries:', error);
      
      setConnectionStatus(prev => ({
        ...prev,
        isConnected: false,
        isRetrying: false,
        retryCount: 0
      }));
      
      let errorMessage = 'I\'m having trouble connecting right now. ';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage += 'The server might be restarting. Please try again in a moment.';
      } else if (error instanceof Error) {
        errorMessage += `Error: ${error.message}`;
      } else {
        errorMessage += 'Please try again or contact support at support@meridianai.ca';
      }
      
      const errorMsg: ChatMessage = {
        id: Date.now().toString(), // Simple unique ID
        text: errorMessage,
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleQuickAction = (action: string) => {
    let message = '';
    switch (action) {
      case 'getting-started':
        message = 'How do I get started with uploading my first bank statement?';
        break;
      case 'file-upload':
        message = 'I\'m having trouble uploading my bank statement file. Can you help?';
        break;
      case 'export-help':
        message = 'How do I export my transactions to Xero or QuickBooks?';
        break;
      case 'bank-compatibility':
        message = 'Which bank formats does Meridian AI support?';
        break;
      default:
        return;
    }
    
    setInputMessage(message);
    setTimeout(() => sendMessage(), 100);
  };

  const handleRetryConnection = () => {
    testConnection();
  };

  if (!mounted) {
    return null; // Or a loading spinner
  }

  return (
    <>
      {/* Floating Chat Button */}
      {!showChat && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setShowChat(true)}
            className={`w-14 h-14 ${
              connectionStatus.isConnected 
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700' 
                : 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700'
            } text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group ${
              connectionStatus.isConnected ? 'animate-bounce' : ''
            }`}
          >
            <svg className="w-6 h-6 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            
            {/* Connection status indicator */}
            {!connectionStatus.isConnected && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white">
                <div className="w-2 h-2 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
              </div>
            )}
          </button>
          
          {/* Tooltip */}
          <div className="absolute bottom-16 right-0 bg-slate-800 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            {connectionStatus.isConnected ? 'Need help? Chat with AI' : 'Chat offline - click to retry'}
            <div className="absolute top-full right-4 w-2 h-2 bg-slate-800 rotate-45 transform -translate-y-1"></div>
          </div>
        </div>
      )}

      {/* Chat Interface */}
      {showChat && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col animate-slideUp">
          {/* Chat Header */}
          <div className={`${
            connectionStatus.isConnected 
              ? 'bg-gradient-to-r from-purple-600 to-blue-600' 
              : 'bg-gradient-to-r from-gray-500 to-gray-600'
          } text-white p-4 rounded-t-2xl flex items-center justify-between`}>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-sm">Meridian AI Assistant</h3>
                <p className="text-xs text-white/80">
                  {connectionStatus.isConnected 
                    ? 'Here to help with your bookkeeping'
                    : connectionStatus.isRetrying 
                      ? `Reconnecting... (${connectionStatus.retryCount}/3)`
                      : 'Connection lost'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {!connectionStatus.isConnected && (
                <button
                  onClick={handleRetryConnection}
                  className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                  title="Retry connection"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
            <button 
              onClick={() => setShowChat(false)}
              className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          </div>

          {/* Connection Status Banner */}
          {!connectionStatus.isConnected && (
            <div className="bg-red-50 border-b border-red-200 p-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm text-red-700">
                  Offline - some features may not work
                </span>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {messages.length === 0 && (
            <div className="p-4 border-b border-slate-200">
              <p className="text-xs text-slate-600 mb-3">Quick actions:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleQuickAction('getting-started')}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg transition-colors text-left"
                  disabled={!connectionStatus.isConnected}
                >
                  Getting Started
                </button>
                <button
                  onClick={() => handleQuickAction('file-upload')}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg transition-colors text-left"
                  disabled={!connectionStatus.isConnected}
                >
                  File Upload Help
                </button>
                <button
                  onClick={() => handleQuickAction('export-help')}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg transition-colors text-left"
                  disabled={!connectionStatus.isConnected}
                >
                  Export to Xero
                </button>
                <button
                  onClick={() => handleQuickAction('bank-compatibility')}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg transition-colors text-left"
                  disabled={!connectionStatus.isConnected}
                >
                  Bank Formats
                </button>
              </div>
            </div>
          )}

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto bg-gradient-to-b from-slate-50 to-white">
            {messages.length === 0 ? (
              <div className="text-center text-slate-500 mt-8">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-sm">Hi! I'm your AI assistant.</p>
                <p className="text-xs mt-1">Ask me anything about Meridian AI!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                      message.sender === 'user' 
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-br-sm' 
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                    }`}>
                      <p className="whitespace-pre-wrap">{message.text}</p>
                      <p className={`text-xs mt-1 ${message.sender === 'user' ? 'text-white/70' : 'text-slate-500'}`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm p-3 shadow-sm">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-slate-200 bg-white rounded-b-2xl">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={connectionStatus.isConnected ? "Type your message..." : "Chat is offline..."}
                disabled={isLoading || !connectionStatus.isConnected}
                className="flex-1 border border-slate-300 rounded-full px-4 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-400 transition-all duration-200"
              />
              <button 
                onClick={() => sendMessage()}
                disabled={!inputMessage.trim() || isLoading || !connectionStatus.isConnected}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-300 text-white rounded-full p-2 transition-all duration-200 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}