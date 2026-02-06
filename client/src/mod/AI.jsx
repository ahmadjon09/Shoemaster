import { useState, useEffect, useRef, useContext } from 'react';
import { X, Send, Bot, Maximize2, Minimize2, Loader2, Clock, Trash2, BrainCircuit, Image as ImageIcon, Paperclip } from 'lucide-react';
import { ContextData } from '../contextData/Context';

export const FloatingAIBot = () => {
    const { user } = useContext(ContextData);
    const [settings, setSettings] = useState({
        showDollar: false,
        aiAssistant: false,
    });

    useEffect(() => {
        const handleStorage = () => {
            const saved = localStorage.getItem("shoemaster_settings");
            if (saved) setSettings(JSON.parse(saved));
        };

        window.addEventListener("storage", handleStorage);

        handleStorage();

        return () => window.removeEventListener("storage", handleStorage);
    }, []);


    const [isOpen, setIsOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "Салом! Мен AI ёрдамчиман. Сизга қандай ёрдам керак?",
            sender: 'bot',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);
    const [selectedImages, setSelectedImages] = useState([]);

    const messagesEndRef = useRef(null);
    const modalRef = useRef(null);
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);

    const formatMessage = (text) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                const boldText = part.slice(2, -2);
                return <strong key={index} className="font-bold">{boldText}</strong>;
            }
            return <span key={index}>{part}</span>;
        });
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length + selectedImages.length > 5) {
            alert('Максимум 5 та расм юклаш мумкин');
            return;
        }

        imageFiles.forEach(file => {
            if (file.size > 5 * 1024 * 1024) {
                alert(`${file.name} расм хажми 5MB дан ошмаслиги керак`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                setSelectedImages(prev => [...prev, {
                    id: Date.now() + Math.random(),
                    file: file,
                    preview: event.target.result,
                    name: file.name
                }]);
            };
            reader.readAsDataURL(file);
        });

        e.target.value = '';
    };

    const removeImage = (imageId) => {
        setSelectedImages(prev => prev.filter(img => img.id !== imageId));
    };

    const sendMessageToGroq = async (message, images = []) => {
        try {
            setIsTyping(true);

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_AI}`
                },
                body: JSON.stringify({
                    model: 'moonshotai/kimi-k2-instruct',
                    messages: [
                        {
                            role: "system",
                            content: `You are a smart, polite, and friendly AI assistant. Always respond in Uzbek with correct grammar and spelling. Never give stupid, meaningless, or low-quality answers. Write clearly and logically. Adapt fully to the user's writing style: if the user writes in Cyrillic, reply in Cyrillic; if the user writes in Latin, reply in Latin. Match the user's tone and format as much as possible. Occasionally add light humor so the conversation feels natural, but never overdo it. When appropriate, include stickers or emojis (🙂😂🔥👍🤝) to make replies more lively, especially in casual chats. Stay respectful and human-like at all times. Be concise but helpful. Use **bold text** only to emphasize important points. If the user asks who created you or who made you, always answer: vebox.uz. Current time: ${new Date().toLocaleTimeString()}`
                        },
                        ...chatHistory.slice(-10).map(msg => ({
                            role: msg.sender === 'user' ? 'user' : 'assistant',
                            content: msg.text
                        })),
                        {
                            role: 'user',
                            content: images.length > 0
                                ? `${message || 'Расм юбордим'} (Эслатма: ${images.length} та расм юкланди, лекин ҳозирча расмларни таҳлил қилиш имкони йўқ)`
                                : message
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 1000,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('Error calling Groq API:', error);
            return 'Кечирасиз, хатолик юз берди. Илтимос қайта уриниб кўринг.';
        } finally {
            setIsTyping(false);
        }
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim() && selectedImages.length === 0) return;

        const userMessage = {
            id: Date.now(),
            text: inputMessage || (selectedImages.length > 0 ? 'Расм юбордим' : ''),
            sender: 'user',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            images: selectedImages.map(img => ({
                preview: img.preview,
                name: img.name
            }))
        };

        setMessages(prev => [...prev, userMessage]);
        setChatHistory(prev => [...prev, {
            text: inputMessage || (selectedImages.length > 0 ? 'Расм юбордим' : ''),
            sender: 'user'
        }]);

        const currentImages = [...selectedImages];
        const currentMessage = inputMessage;
        setInputMessage('');
        setSelectedImages([]);

        // Auto-resize textarea
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        const botResponse = await sendMessageToGroq(currentMessage, currentImages);

        const botMessage = {
            id: Date.now() + 1,
            text: botResponse,
            sender: 'bot',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, botMessage]);
        setChatHistory(prev => [...prev, { text: botResponse, sender: 'bot' }]);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleTextareaChange = (e) => {
        setInputMessage(e.target.value);

        // Auto-resize textarea
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
        }
    };

    const clearChat = () => {
        if (window.confirm('Ҳақиқатан хам чатни тозалашни истайсизми?')) {
            setMessages([
                {
                    id: 1,
                    text: "Салом! Мен AI ёрдамчиман. Сизга қандай ёрдам керак?",
                    sender: 'bot',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            ]);
            setChatHistory([]);
            setSelectedImages([]);
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const handleEscKey = (e) => {
            if (e.key === 'Escape' && isOpen) {
                if (isFullscreen) {
                    setIsFullscreen(false);
                } else {
                    setIsOpen(false);
                }
            }
        };

        window.addEventListener('keydown', handleEscKey);
        return () => window.removeEventListener('keydown', handleEscKey);
    }, [isOpen, isFullscreen]);

    const getModalStyle = () => {
        if (isFullscreen) {
            return {
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
                margin: 0,
                borderRadius: 0,
                zIndex: 9999
            };
        }

        const isMobile = window.innerWidth < 768;

        if (isMobile) {
            return {
                position: 'fixed',
                bottom: '20px',
                right: '10px',
                left: '10px',
                width: 'calc(100% - 20px)',
                height: 'calc(100vh - 100px)',
                maxHeight: '600px',
                zIndex: 9999,
            };
        }

        return {
            position: 'fixed',
            right: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '400px',
            height: '600px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            zIndex: 9999,
        };
    };

    return (
        <>
            {settings.aiAssistant && !isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-20 right-7 flex items-center justify-center w-10 h-10 rounded-full shadow-2xl hover:shadow-3xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 z-[9999] transition-all duration-300 hover:scale-110 "
                    aria-label="Open AI Assistant"
                >
                    <BrainCircuit className="h-6 w-6 text-white" />
                </button>
            )}

            {isOpen && (
                <div
                    onClick={() => !isFullscreen && setIsOpen(false)}
                    className="fixed inset-0 z-[9998] transition-all duration-300"
                    style={{
                        backgroundColor: isFullscreen ? 'transparent' : 'rgba(0, 0, 0, 0.3)',
                        pointerEvents: isFullscreen ? 'none' : 'auto',
                        backdropFilter: isFullscreen ? 'none' : 'blur(2px)'
                    }}
                >
                    <div
                        ref={modalRef}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            ...getModalStyle(),
                            pointerEvents: 'auto'
                        }}
                        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slideIn"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                    <BrainCircuit className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">AI Assistant</h3>
                                    <p className="text-xs text-white/80 flex items-center gap-1">
                                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                        vebox.uz
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={clearChat}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200 hover:scale-110"
                                    title="Чатни тозалаш"
                                    aria-label="Clear chat"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => setIsFullscreen(!isFullscreen)}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200 hover:scale-110"
                                    aria-label={isFullscreen ? "Minimize" : "Maximize"}
                                >
                                    {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200 hover:scale-110 hover:rotate-90"
                                    aria-label="Close chat"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Messages Container */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
                            {messages.map((message, index) => (
                                <div
                                    key={message.id}
                                    className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : ''} animate-fadeIn`}
                                    style={{ animationDelay: `${index * 0.1}s` }}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.sender === 'bot'
                                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600'
                                        : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                                        }`}>
                                        {message.sender === 'bot' ? (
                                            <BrainCircuit className="h-5 w-5 text-white" />
                                        ) : (
                                            user?.avatar ? (
                                                <img
                                                    src={user.avatar}
                                                    alt="User Avatar"
                                                    className="w-full h-full object-cover rounded-full"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                                                    {user?.name?.charAt(0) || 'U'}
                                                </div>
                                            )
                                        )}
                                    </div>
                                    <div className={`flex flex-col max-w-[75%] ${message.sender === 'user' ? 'items-end' : ''}`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-medium text-gray-600">
                                                {message.sender === 'bot' ? 'AI Assistant' : 'Сиз'}
                                            </span>
                                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {message.time}
                                            </span>
                                        </div>

                                        {message.images && message.images.length > 0 && (
                                            <div className={`flex flex-wrap gap-2 mb-2 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                                                {message.images.map((img, idx) => (
                                                    <div key={idx} className="relative group animate-scaleIn">
                                                        <img
                                                            src={img.preview}
                                                            alt={img.name}
                                                            className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200 cursor-pointer hover:opacity-90 transition-all duration-300 hover:scale-105"
                                                            onClick={() => window.open(img.preview, '_blank')}
                                                        />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                                            <ImageIcon className="h-6 w-6 text-white" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className={`rounded-2xl px-4 py-3 transition-all duration-300 hover:scale-[1.02] ${message.sender === 'bot'
                                            ? 'bg-white shadow-sm border border-gray-100 hover:shadow-md'
                                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700'
                                            }`}>
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                                {formatMessage(message.text)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {isTyping && (
                                <div className="flex gap-3 animate-fadeIn">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
                                        <BrainCircuit className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <div className="flex gap-1">
                                                <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                                                <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                                <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t border-gray-200">
                            {selectedImages.length > 0 && (
                                <div className="mb-3 flex flex-wrap gap-2 animate-fadeIn">
                                    {selectedImages.map((img) => (
                                        <div key={img.id} className="relative group animate-scaleIn">
                                            <img
                                                src={img.preview}
                                                alt={img.name}
                                                className="w-16 h-16 object-cover rounded-lg border-2 border-purple-200"
                                            />
                                            <button
                                                onClick={() => removeImage(img.id)}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 hover:rotate-90"
                                                aria-label="Remove image"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                            <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-0.5 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                {img.name.length > 10 ? img.name.substring(0, 10) + '...' : img.name}
                                            </span>
                                        </div>
                                    ))}
                                    {selectedImages.length > 0 && (
                                        <div className="text-xs text-gray-500 mt-1">
                                            {selectedImages.length} та расм танланган
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-2 items-end">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />

                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200 flex items-center justify-center hover:scale-110"
                                    title="Расм юклаш (Макс: 5 та, Ҳар бири 5MB)"
                                    aria-label="Upload image"
                                >
                                    <Paperclip className="h-5 w-5 text-gray-600" />
                                </button>

                                <textarea
                                    ref={textareaRef}
                                    value={inputMessage}
                                    onChange={handleTextareaChange}
                                    onKeyDown={handleKeyPress}
                                    placeholder="Хабарингизни ёзинг..."
                                    className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all duration-200"
                                    rows={1}
                                    style={{
                                        minHeight: '44px',
                                        maxHeight: '128px'
                                    }}
                                    aria-label="Message input"
                                />

                                <button
                                    onClick={handleSendMessage}
                                    disabled={(!inputMessage.trim() && selectedImages.length === 0) || isTyping}
                                    className={`px-4 py-3 rounded-xl flex items-center justify-center transition-all duration-300 ${(!inputMessage.trim() && selectedImages.length === 0) || isTyping
                                        ? 'bg-gray-200 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl hover:scale-110'
                                        }`}
                                    aria-label="Send message"
                                >
                                    {isTyping ? (
                                        <Loader2 className="h-5 w-5 text-white animate-spin" />
                                    ) : (
                                        <Send className="h-5 w-5 text-white" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};