'use client';
import { useState } from 'react';
import NavigationBar from '../../components/NavigationBar';

// Add interfaces for chat functionality
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function HelpPage() {
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  
  // Add chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{role: string, content: string}>>([]);

  const handleContactSupport = () => {
    setShowChatbot(true);
  };

  const handleUserGuide = () => {
    setShowUserGuide(true);
  };

  // Add function to send message to ChatGPT
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: conversationHistory
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
        setConversationHistory(data.conversationHistory);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again or contact support at support@meridianai.ca',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Add function to handle quick action clicks
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

  return (
    <div className="min-h-screen">
      <NavigationBar activeSection="help" />
      
      <div className="relative min-h-screen bg-white">
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-12">
          {/* Page Header */}
          <div className="mb-12">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Help & Support</h1>
                <p className="text-slate-600 mt-1">Get help with using Meridian AI for your bookkeeping needs</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">User Guide</h3>
              <p className="text-slate-600 text-sm mb-4">Step-by-step instructions for using all features</p>
              <button 
                onClick={handleUserGuide}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                View Guide →
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v18a1 1 0 01-1 1H4a1 1 0 01-1-1V1a1 1 0 011-1h2a1 1 0 011 1v3m0 0h8m-8 0V1" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Contact Support</h3>
              <p className="text-slate-600 text-sm mb-4">Get personalized help from our support team</p>
              <button 
                onClick={handleContactSupport}
                className="text-green-600 hover:text-green-700 font-medium text-sm"
              >
                Contact Us →
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-md transition-shadow opacity-60">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-500 mb-2">Video Tutorials</h3>
              <p className="text-gray-400 text-sm mb-4">Watch detailed video walkthroughs</p>
              <div className="flex items-center space-x-2">
                <span className="text-gray-400 font-medium text-sm">Coming Soon</span>
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* User Guide Modal */}
          {showUserGuide && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-lg flex items-center justify-center z-50 p-4">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-slate-900">Meridian AI User Guide</h2>
                        <p className="text-slate-600">Complete guide to Canadian bookkeeping automation</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowUserGuide(false)}
                      className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-100"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="space-y-12">
                    {/* Table of Contents */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-100">
                      <h3 className="text-xl font-semibold text-slate-900 mb-4">Table of Contents</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <a href="#getting-started" className="block text-purple-600 hover:text-purple-700 font-medium">1. Getting Started</a>
                          <a href="#file-preparation" className="block text-purple-600 hover:text-purple-700 font-medium">2. File Preparation</a>
                          <a href="#ai-categorization" className="block text-purple-600 hover:text-purple-700 font-medium">3. AI Categorization</a>
                          <a href="#chart-of-accounts" className="block text-purple-600 hover:text-purple-700 font-medium">4. Chart of Accounts</a>
                        </div>
                        <div className="space-y-2">
                          <a href="#export-options" className="block text-purple-600 hover:text-purple-700 font-medium">5. Export Options</a>
                          <a href="#troubleshooting" className="block text-purple-600 hover:text-purple-700 font-medium">6. Troubleshooting</a>
                          <a href="#best-practices" className="block text-purple-600 hover:text-purple-700 font-medium">7. Best Practices</a>
                          <a href="#compliance" className="block text-purple-600 hover:text-purple-700 font-medium">8. CRA Compliance</a>
                        </div>
                      </div>
                    </div>

                    {/* Getting Started */}
                    <div id="getting-started">
                      <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
                        <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-purple-600 font-bold">1</span>
                        </span>
                        Getting Started
                      </h3>
                      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                            </div>
                            <h4 className="font-bold text-slate-900 mb-2">Step 1: Upload</h4>
                            <p className="text-slate-600 text-sm">Drag and drop your bank statement CSV file into the upload area</p>
                          </div>
                          <div className="text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                            </div>
                            <h4 className="font-bold text-slate-900 mb-2">Step 2: AI Processing</h4>
                            <p className="text-slate-600 text-sm">Our AI automatically categorizes transactions using Canadian tax codes</p>
                          </div>
                          <div className="text-center">
                            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <h4 className="font-bold text-slate-900 mb-2">Step 3: Export</h4>
                            <p className="text-slate-600 text-sm">Export to Xero, QuickBooks, or download as CRA-compliant CSV</p>
                          </div>
                        </div>
                        
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                              <h5 className="font-semibold text-blue-900 mb-1">System Requirements</h5>
                              <p className="text-blue-800 text-sm">Works on all modern browsers. No software installation required. Files are processed securely and never stored permanently.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* File Preparation */}
                    <div id="file-preparation">
                      <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
                        <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-purple-600 font-bold">2</span>
                        </span>
                        File Preparation
                      </h3>
                      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          <div>
                            <h4 className="text-lg font-semibold text-slate-900 mb-4">Supported File Formats</h4>
                            <div className="space-y-3">
                              <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="font-medium text-green-900">CSV (Comma Separated Values)</span>
                              </div>
                              <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="font-medium text-green-900">OFX/QFX Bank Downloads</span>
                              </div>
                              <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="font-medium text-green-900">Excel (.xlsx) with proper formatting</span>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-lg font-semibold text-slate-900 mb-4">Required Columns</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between p-2 bg-slate-50 rounded">
                                <span className="font-medium">Date</span>
                                <span className="text-slate-600">Transaction date</span>
                              </div>
                              <div className="flex justify-between p-2 bg-slate-50 rounded">
                                <span className="font-medium">Description</span>
                                <span className="text-slate-600">Merchant/payee name</span>
                              </div>
                              <div className="flex justify-between p-2 bg-slate-50 rounded">
                                <span className="font-medium">Amount</span>
                                <span className="text-slate-600">Transaction amount</span>
                              </div>
                              <div className="flex justify-between p-2 bg-slate-50 rounded">
                                <span className="font-medium">Type</span>
                                <span className="text-slate-600">Debit/Credit (optional)</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Supported Banks */}
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
                        <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-purple-600 font-bold">3</span>
                        </span>
                        Supported Canadian Banks
                      </h3>
                      <div className="bg-white border border-slate-200 rounded-xl p-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                          <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4 text-center">
                            <div className="font-bold text-red-900 text-sm">RBC</div>
                            <div className="text-xs text-red-700">Royal Bank</div>
                          </div>
                          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4 text-center">
                            <div className="font-bold text-green-900 text-sm">TD</div>
                            <div className="text-xs text-green-700">Canada Trust</div>
                          </div>
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 text-center">
                            <div className="font-bold text-blue-900 text-sm">BMO</div>
                            <div className="text-xs text-blue-700">Bank of Montreal</div>
                          </div>
                          <div className="bg-gradient-to-br from-red-50 to-orange-100 border border-orange-200 rounded-lg p-4 text-center">
                            <div className="font-bold text-orange-900 text-sm">Scotia</div>
                            <div className="text-xs text-orange-700">Scotiabank</div>
                          </div>
                          <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4 text-center">
                            <div className="font-bold text-red-900 text-sm">CIBC</div>
                            <div className="text-xs text-red-700">Imperial Bank</div>
                          </div>
                          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-lg p-4 text-center">
                            <div className="font-bold text-indigo-900 text-sm">National</div>
                            <div className="text-xs text-indigo-700">Bank</div>
                          </div>
                          <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4 text-center">
                            <div className="font-bold text-orange-900 text-sm">Tangerine</div>
                            <div className="text-xs text-orange-700">Bank</div>
                          </div>
                          <div className="bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 rounded-lg p-4 text-center">
                            <div className="font-bold text-teal-900 text-sm">Simplii</div>
                            <div className="text-xs text-teal-700">Financial</div>
                          </div>
                          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-4 text-center">
                            <div className="font-bold text-yellow-900 text-sm">Desjardins</div>
                            <div className="text-xs text-yellow-700">Group</div>
                          </div>
                          <div className="bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 rounded-lg p-4 text-center">
                            <div className="font-bold text-rose-900 text-sm">HSBC</div>
                            <div className="text-xs text-rose-700">Canada</div>
                          </div>
                          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200 rounded-lg p-4 text-center">
                            <div className="font-bold text-cyan-900 text-sm">Meridian</div>
                            <div className="text-xs text-cyan-700">Credit Union</div>
                          </div>
                          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4 text-center">
                            <div className="font-bold text-purple-900 text-sm">All Credit</div>
                            <div className="text-xs text-purple-700">Unions</div>
                          </div>
                        </div>
                        
                        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <h5 className="font-semibold text-yellow-900 mb-2">Additional Supported Institutions</h5>
                          <p className="text-yellow-800 text-sm">PC Financial, Laurentian Bank, ATB Financial, and hundreds of credit unions across Canada. If your bank isn&apos;t listed, contact support.</p>
                        </div>
                      </div>
                    </div>

                    {/* AI Categorization */}
                    <div id="ai-categorization">
                      <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
                        <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-purple-600 font-bold">4</span>
                        </span>
                        AI Categorization Engine
                      </h3>
                      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="font-semibold text-blue-900 mb-2">Machine Learning</h4>
                            <p className="text-blue-800 text-sm">Trained on 50,000+ Canadian business transactions for 95%+ accuracy</p>
                          </div>
                          <div className="bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
                            <h4 className="font-semibold text-green-900 mb-2">Tax Code Mapping</h4>
                            <p className="text-green-800 text-sm">Automatically maps to CRA-approved chart of accounts for your province</p>
                          </div>
                          <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                            <h4 className="font-semibold text-purple-900 mb-2">Continuous Learning</h4>
                            <p className="text-purple-800 text-sm">Improves accuracy based on your corrections and feedback</p>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-lg font-semibold text-slate-900 mb-4">Common Categories</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <h5 className="font-medium text-slate-900">Revenue</h5>
                              <div className="text-sm text-slate-600 space-y-1">
                                <div>• Sales Revenue</div>
                                <div>• Service Income</div>
                                <div>• Interest Income</div>
                                <div>• Other Revenue</div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h5 className="font-medium text-slate-900">Operating Expenses</h5>
                              <div className="text-sm text-slate-600 space-y-1">
                                <div>• Office Supplies</div>
                                <div>• Advertising</div>
                                <div>• Professional Fees</div>
                                <div>• Travel & Meals</div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h5 className="font-medium text-slate-900">Assets & Liabilities</h5>
                              <div className="text-sm text-slate-600 space-y-1">
                                <div>• Equipment Purchases</div>
                                <div>• Loan Payments</div>
                                <div>• Accounts Payable</div>
                                <div>• Tax Payments</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Export Options */}
                    <div id="export-options">
                      <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
                        <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-purple-600 font-bold">5</span>
                        </span>
                        Export Options
                      </h3>
                      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="border border-slate-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <h4 className="font-semibold text-slate-900 mb-2">Xero Integration</h4>
                            <p className="text-slate-600 text-sm mb-3">Direct upload to your Xero account with proper chart mapping</p>
                            <div className="text-xs text-green-600 font-medium">✓ Real-time sync</div>
                          </div>
                          
                          <div className="border border-slate-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" />
                              </svg>
                            </div>
                            <h4 className="font-semibold text-slate-900 mb-2">QuickBooks</h4>
                            <p className="text-slate-600 text-sm mb-3">IIF and QBO file formats for seamless import</p>
                            <div className="text-xs text-yellow-600 font-medium">⚡ Coming soon</div>
                          </div>
                          
                          <div className="border border-slate-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <h4 className="font-semibold text-slate-900 mb-2">CSV Export</h4>
                            <p className="text-slate-600 text-sm mb-3">CRA-compliant format for any accounting software</p>
                            <div className="text-xs text-green-600 font-medium">✓ Universal format</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Best Practices */}
                    <div id="best-practices">
                      <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
                        <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-purple-600 font-bold">6</span>
                        </span>
                        Best Practices & Tips
                      </h3>
                      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          <div>
                            <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                              <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Do&apos;s
                            </h4>
                            <ul className="space-y-3 text-slate-600">
                              <li className="flex items-start space-x-3">
                                <span className="text-green-600 mt-1">✓</span>
                                <span>Upload statements monthly for best AI accuracy</span>
                              </li>
                              <li className="flex items-start space-x-3">
                                <span className="text-green-600 mt-1">✓</span>
                                <span>Review and correct AI suggestions to improve future categorization</span>
                              </li>
                              <li className="flex items-start space-x-3">
                                <span className="text-green-600 mt-1">✓</span>
                                <span>Use consistent merchant names in your banking</span>
                              </li>
                              <li className="flex items-start space-x-3">
                                <span className="text-green-600 mt-1">✓</span>
                                <span>Keep digital copies of receipts for CRA compliance</span>
                              </li>
                              <li className="flex items-start space-x-3">
                                <span className="text-green-600 mt-1">✓</span>
                                <span>Export data regularly to your accounting software</span>
                              </li>
                            </ul>
                          </div>
                          
                          <div>
                            <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                              <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Don&apos;ts
                            </h4>
                            <ul className="space-y-3 text-slate-600">
                              <li className="flex items-start space-x-3">
                                <span className="text-red-600 mt-1">✗</span>
                                <span>Don&apos;t upload files with missing or corrupted data</span>
                              </li>
                              <li className="flex items-start space-x-3">
                                <span className="text-red-600 mt-1">✗</span>
                                <span>Don&apos;t ignore AI categorization suggestions without review</span>
                              </li>
                              <li className="flex items-start space-x-3">
                                <span className="text-red-600 mt-1">✗</span>
                                <span>Don&apos;t mix personal and business transactions</span>
                              </li>
                              <li className="flex items-start space-x-3">
                                <span className="text-red-600 mt-1">✗</span>
                                <span>Don&apos;t wait until year-end to process statements</span>
                              </li>
                              <li className="flex items-start space-x-3">
                                <span className="text-red-600 mt-1">✗</span>
                                <span>Don&apos;t forget to backup your categorized data</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CRA Compliance */}
                    <div id="compliance">
                      <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
                        <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-purple-600 font-bold">7</span>
                        </span>
                        CRA Compliance & Security
                      </h3>
                      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold text-green-900 mb-2">CRA Approved</h4>
                              <p className="text-green-800 mb-4">All exports meet Canada Revenue Agency requirements for digital bookkeeping and audit trails.</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-green-800">Provincial chart of accounts mapping</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-green-800">HST/GST tax code compliance</span>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-green-800">Audit trail maintenance</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-green-800">Digital receipt management</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="border border-slate-200 rounded-lg p-4">
                            <h5 className="font-semibold text-slate-900 mb-3">Data Security</h5>
                            <ul className="space-y-2 text-sm text-slate-600">
                              <li>• Bank-level 256-bit encryption</li>
                              <li>• SOC 2 Type II compliance</li>
                              <li>• No permanent data storage</li>
                              <li>• Canadian data sovereignty</li>
                            </ul>
                          </div>
                          
                          <div className="border border-slate-200 rounded-lg p-4">
                            <h5 className="font-semibold text-slate-900 mb-3">Privacy Protection</h5>
                            <ul className="space-y-2 text-sm text-slate-600">
                              <li>• PIPEDA compliant</li>
                              <li>• Local data processing</li>
                              <li>• Automatic data deletion</li>
                              <li>• No third-party sharing</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-slate-600">
                        Need more help? Contact our support team for personalized assistance.
                      </div>
                      <button 
                        onClick={() => setShowUserGuide(false)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                      >
                        Close Guide
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chatbot Modal */}
          {showChatbot && (
            <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 animate-slide-up border border-slate-200">
                {/* Chatbot Header */}
                <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-4 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold">Meridian Support</h3>
                        <p className="text-sm text-white/80">Online now</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowChatbot(false)}
                      className="text-white/80 hover:text-white transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Chat Messages Area */}
                <div className="flex-1 p-4 overflow-y-auto bg-gradient-to-b from-slate-50 to-white animate-fade-in">
                  <div className="space-y-4">
                    {/* Welcome Message - only show if no messages */}
                    {messages.length === 0 && (
                      <>
                        <div className="flex items-start space-x-2 animate-fade-in">
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div className="bg-white rounded-2xl rounded-tl-sm p-3 shadow-sm max-w-xs border border-slate-100">
                            <p className="text-sm text-slate-800">
                              Hi! 👋 I&apos;m here to help you with Meridian AI. What can I assist you with today?
                            </p>
                            <p className="text-xs text-slate-500 mt-1">Just now</p>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="space-y-2 animate-fade-in-delay">
                          <p className="text-xs text-slate-500 text-center">Quick actions:</p>
                          <div className="space-y-2">
                            <button 
                              onClick={() => handleQuickAction('getting-started')}
                              className="w-full text-left bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg p-3 transition-all duration-200 hover:shadow-sm hover:scale-[1.02]"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">🚀</span>
                                <span className="text-sm font-medium text-purple-900">Getting Started</span>
                              </div>
                              <p className="text-xs text-purple-700 mt-1 ml-6">Learn how to upload your first statement</p>
                            </button>
                            
                            <button 
                              onClick={() => handleQuickAction('file-upload')}
                              className="w-full text-left bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg p-3 transition-all duration-200 hover:shadow-sm hover:scale-[1.02]"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">💡</span>
                                <span className="text-sm font-medium text-blue-900">File Upload Issues</span>
                              </div>
                              <p className="text-xs text-blue-700 mt-1 ml-6">Troubleshoot common problems</p>
                            </button>
                            
                            <button 
                              onClick={() => handleQuickAction('export-help')}
                              className="w-full text-left bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg p-3 transition-all duration-200 hover:shadow-sm hover:scale-[1.02]"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">📊</span>
                                <span className="text-sm font-medium text-green-900">Export Help</span>
                              </div>
                              <p className="text-xs text-green-700 mt-1 ml-6">Xero, QuickBooks & CSV exports</p>
                            </button>
                            
                            <button 
                              onClick={() => handleQuickAction('bank-compatibility')}
                              className="w-full text-left bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg p-3 transition-all duration-200 hover:shadow-sm hover:scale-[1.02]"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">🏦</span>
                                <span className="text-sm font-medium text-orange-900">Bank Compatibility</span>
                              </div>
                              <p className="text-xs text-orange-700 mt-1 ml-6">Check supported formats</p>
                            </button>
                          </div>
                        </div>

                        {/* Status Indicator */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 animate-fade-in-delay-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <p className="text-xs font-medium text-green-900">ChatGPT AI Assistant</p>
                          </div>
                          <p className="text-xs text-green-800 mt-1">Powered by OpenAI • Real-time responses</p>
                        </div>
                      </>
                    )}

                    {/* Chat Messages */}
                    {messages.map((message, index) => (
                      <div key={index} className={`flex items-start space-x-2 ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          message.role === 'user' ? 'bg-blue-500' : 'bg-green-500'
                        }`}>
                          {message.role === 'user' ? (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          )}
                        </div>
                        <div className={`rounded-2xl p-3 shadow-sm max-w-xs border ${
                          message.role === 'user' 
                            ? 'bg-blue-500 text-white rounded-tr-sm border-blue-600' 
                            : 'bg-white text-slate-800 rounded-tl-sm border-slate-100'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.role === 'user' ? 'text-blue-100' : 'text-slate-500'
                          }`}>
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Loading indicator */}
                    {isLoading && (
                      <div className="flex items-start space-x-2">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <div className="bg-white rounded-2xl rounded-tl-sm p-3 shadow-sm border border-slate-100">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Type your message..."
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      disabled={isLoading}
                      className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400 transition-all duration-200"
                    />
                    <button 
                      onClick={sendMessage}
                      disabled={isLoading || !inputMessage.trim()}
                      className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-full p-2 transition-all duration-200 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    Powered by ChatGPT • Ask me anything about Meridian AI! 🤖
                  </p>
                </div>
            </div>
          )}

          {/* FAQ Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8 mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-8">Frequently Asked Questions</h2>
            
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">How do I upload my bank statements?</h3>
                <p className="text-slate-600">
                  Simply drag and drop your CSV bank statement files into the upload area on the main page. 
                  We support all major Canadian banks including RBC, TD, BMO, Scotia, and CIBC. 
                  The system will automatically detect your bank format and process the transactions.
                </p>
              </div>

              <div className="border-b border-slate-200 pb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">How accurate is the AI categorization?</h3>
                <p className="text-slate-600">
                  Meridian AI uses machine learning to categorize your transactions with 95%+ accuracy. Here&apos;s how it works:
                </p>
                <ul className="list-disc list-inside text-slate-600 mt-2">
                  <li className="text-slate-600 mb-2">🟢 <strong>High (90-100%)</strong> - AI is very confident, likely doesn&apos;t need review</li>
                  <li className="text-slate-600 mb-2">🟡 <strong>Medium (70-89%)</strong> - AI is moderately confident, quick review recommended</li>
                  <li className="text-slate-600 mb-2">🟠 <strong>Low (50-69%)</strong> - AI is uncertain, manual review recommended</li>
                  <li className="text-slate-600 mb-2">🔴 <strong>Very Low (&lt;50%)</strong> - AI couldn&apos;t categorize, manual categorization needed</li>
                </ul>
                <p className="text-slate-600 mt-4">
                  Don&apos;t worry - you can always review and correct any categorizations. The AI learns from your corrections to improve future accuracy.
                </p>
              </div>

              <div className="border-b border-slate-200 pb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Can I export to my accounting software?</h3>
                <p className="text-slate-600">
                  Yes! We support direct export to Xero, QuickBooks, Sage 50, and generic CSV formats. 
                  All exports are CRA-compliant and include proper chart of accounts mapping for your province.
                </p>
              </div>

              <div className="border-b border-slate-200 pb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Is my financial data secure?</h3>
                <p className="text-slate-600">
                  Absolutely. We use bank-level encryption, process data locally when possible, and never store 
                  sensitive financial information permanently. All data transmission is encrypted and we&apos;re 
                  SOC 2 Type II compliant.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">What file formats do you support?</h3>
                <p className="text-slate-600">
                  We support CSV files from all major Canadian banks. Common formats include transaction exports 
                  from online banking, credit card statements, and business account downloads. If you have a 
                  specific format that isn&apos;t working, contact our support team.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 border border-blue-100">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Email Support</h3>
              <p className="text-slate-600 mb-4">Get help via email with detailed responses</p>
              <p className="text-blue-600 font-medium">support@meridianai.ca</p>
              <p className="text-sm text-slate-500 mt-2">Response within 24 hours</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-8 border border-green-100">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Live Chat</h3>
              <p className="text-slate-600 mb-4">Chat with our support team in real-time</p>
              <button 
                onClick={handleContactSupport}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Start Chat
              </button>
              <p className="text-sm text-slate-500 mt-2">Available 9 AM - 5 PM EST</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 