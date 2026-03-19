"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Phone,
  Video as VideoIcon,
  Info,
  Smile,
  Image as ImageIcon,
  Send,
  MoreVertical,
  Mic,
  X,
  Play,
  Paperclip,
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { VoiceRecorder } from "@/components/VoiceRecorder";

export interface ChatContact {
  id: string | number;
  name: string;
  avatar: string;
  online: boolean;
}

export interface ChatMessage {
  id: string | number;
  senderId: string | number;
  text?: string;
  image?: string;
  video?: string;
  audio?: string;
  timestamp: string;
  isMine: boolean;
}

interface ChatWindowProps {
  contact: ChatContact;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  onUploadMedia?: (file: File) => void;
  onVoiceRecordingComplete?: (audioBlob: Blob) => void;
  isConnected?: boolean;
  isDarkMode?: boolean;
  onRecallMessage?: (messageId: string | number) => void;
  onDeleteMessage?: (messageId: string | number) => void;
  isTyping?: boolean;
}

const ChatWindow = ({
  contact,
  messages,
  onSendMessage,
  onTypingStart,
  onTypingStop,
  onUploadMedia,
  onVoiceRecordingComplete,
  isConnected = true,
  isDarkMode = false,
  onRecallMessage,
  onDeleteMessage,
  isTyping = false,
}: ChatWindowProps) => {
  const [inputMessage, setInputMessage] = useState("");
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [emojiPickerPosition, setEmojiPickerPosition] = useState({ bottom: 0, right: 0 });
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRefs = useRef<Map<string | number, HTMLDivElement>>(new Map());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingSentRef = useRef(false);

  // Extract media from messages
  const mediaGallery = useMemo(() => {
    const mediaItems: Array<{
      id: string | number;
      type: "image" | "video" | "audio";
      url?: string;
      duration?: string;
      date: string;
    }> = [];

    messages.forEach((message) => {
      // Check for image
      if (message.image) {
        mediaItems.push({
          id: `${message.id}-image`,
          type: "image",
          url: message.image,
          date: message.timestamp,
        });
      }
      // Check for video
      if (message.video) {
        mediaItems.push({
          id: `${message.id}-video`,
          type: "video",
          url: message.video,
          date: message.timestamp,
        });
      }
      // Check for audio
      if (message.audio) {
        mediaItems.push({
          id: `${message.id}-audio`,
          type: "audio",
          url: message.audio,
          date: message.timestamp,
        });
      }
    });

    // Sort by date (newest first) and reverse to show newest at the end
    return mediaItems.reverse();
  }, [messages]);

  const handleSend = () => {
    const trimmed = inputMessage.trim();
    if (!trimmed || !isConnected || isRecording) return;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (isTypingSentRef.current) {
      onTypingStop?.();
      isTypingSentRef.current = false;
    }
    onSendMessage(trimmed);
    setInputMessage("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleRecordingToggle = () => {
    if (onVoiceRecordingComplete) {
      setShowVoiceRecorder(true);
    } else {
      setIsRecording(!isRecording);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onUploadMedia) {
      onUploadMedia(file);
      // Reset input
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onUploadMedia) {
      onUploadMedia(file);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const onEmojiClick = (emojiObject: any) => {
    setInputMessage((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".emoji-picker-container") && !target.closest("button[title='Emoji']")) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      // Calculate position based on button position
      if (emojiButtonRef.current) {
        const rect = emojiButtonRef.current.getBoundingClientRect();
        const pickerHeight = 400;
        const pickerWidth = 300;
        // Position above the button, aligned to the right
        setEmojiPickerPosition({
          bottom: window.innerHeight - rect.top + 8, // 8px margin above button
          right: window.innerWidth - rect.right, // Align right edge with button
        });
      }
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      let clickedInside = false;
      menuRefs.current.forEach((menuElement) => {
        if (menuElement && menuElement.contains(event.target as Node)) {
          clickedInside = true;
        }
      });
      if (!clickedInside) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      // Limit max height to ~120px (about 5 lines)
      const maxHeight = 120;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [inputMessage]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingSentRef.current) {
        onTypingStop?.();
      }
    };
  }, [onTypingStop]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (messages.length === 0) return;
    
    // Use setTimeout to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      if (messagesEndRef.current) {
        // Use "auto" for instant scroll on initial load, "smooth" for new messages
        const isInitialLoad = !hasScrolledRef.current;
        messagesEndRef.current.scrollIntoView({ 
          behavior: isInitialLoad ? "auto" : "smooth" 
        });
        hasScrolledRef.current = true;
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [messages]);

  return (
    <div className={`w-full h-full flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* HEADER */}
      <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} shadow-sm`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={contact.avatar}
                alt={contact.name}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-100"
              />
              {contact.online && (
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
              )}
            </div>
            <div>
              <h2 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {contact.name}
              </h2>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {!isConnected
                  ? "Đang kết nối..."
                  : contact.online
                  ? "Đang hoạt động"
                  : "Ngoại tuyến"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className={`p-2.5 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
              <Phone className="w-5 h-5 text-blue-500" />
            </button>
            <button className={`p-2.5 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
              <VideoIcon className="w-5 h-5 text-blue-500" />
            </button>
            <button
              onClick={() => setShowMediaGallery(!showMediaGallery)}
              className={`p-2.5 rounded-full transition-colors relative ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              <Info className="w-5 h-5 text-blue-500" />
            </button>
          </div>
        </div>
      </div>

      {/* MEDIA GALLERY */}
      {showMediaGallery && (
        <div className={`border-b p-4 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Media &amp; Files</h3>
            <button
              onClick={() => setShowMediaGallery(false)}
              className={`p-1.5 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
            >
              <X className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {mediaGallery.length === 0 ? (
              <div className={`col-span-full text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <p className="text-sm">Chưa có media nào được gửi</p>
              </div>
            ) : (
              mediaGallery.map((media) => (
                <div
                  key={media.id}
                  className={`relative group cursor-pointer rounded-lg overflow-hidden border transition-all ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 hover:border-blue-500' 
                      : 'bg-white border-gray-200 hover:border-blue-400'
                  }`}
                >
                  {media.type === "image" && media.url ? (
                    <img
                      src={media.url}
                      alt="Gallery item"
                      className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : media.type === "video" && media.url ? (
                    <div className="w-full h-32 bg-gray-800 flex items-center justify-center relative">
                      <video
                        src={media.url}
                        className="w-full h-full object-cover"
                        muted
                        onMouseEnter={(e) => {
                          const video = e.currentTarget;
                          video.play().catch(() => {});
                        }}
                        onMouseLeave={(e) => {
                          const video = e.currentTarget;
                          video.pause();
                          video.currentTime = 0;
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                        <Play
                          className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          fill="white"
                        />
                      </div>
                    </div>
                  ) : media.type === "audio" && media.url ? (
                    <div className={`w-full h-32 bg-gradient-to-br flex items-center justify-center transition-all ${
                      isDarkMode 
                        ? 'from-blue-900 to-blue-800 group-hover:from-blue-800 group-hover:to-blue-700' 
                        : 'from-blue-50 to-blue-100 group-hover:from-blue-100 group-hover:to-blue-200'
                    }`}>
                      <div className="text-center">
                        <Mic className={`w-8 h-8 mx-auto mb-1 ${isDarkMode ? 'text-blue-300' : 'text-blue-500'}`} />
                        <p className={`text-xs font-medium ${isDarkMode ? 'text-blue-200' : 'text-blue-600'}`}>
                          Audio
                        </p>
                      </div>
                    </div>
                  ) : null}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                    <p className="text-xs text-white">
                      {media.date}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MESSAGE LIST */}
      <div className={`flex-1 overflow-y-auto p-6 ${isDarkMode ? 'bg-gradient-to-b from-gray-900 to-gray-800' : 'bg-gradient-to-b from-gray-50 to-white'}`}>
        <div className="max-w-4xl mx-auto space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>
            </div>
          ) : (
            messages.map((message, index) => {
            const showAvatar =
              !message.isMine &&
              (index === 0 ||
                messages[index - 1].senderId !== message.senderId ||
                messages[index - 1].isMine);

            return (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${
                  message.isMine ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {!message.isMine && (
                  <div className="w-8 h-8 flex-shrink-0">
                    {showAvatar && (
                      <img
                        src={contact.avatar}
                        alt={contact.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    )}
                  </div>
                )}

                <div
                  className={`flex flex-col ${
                    message.isMine ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`group relative max-w-md ${
                      message.isMine
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-3xl rounded-br-md"
                        : isDarkMode 
                        ? "bg-gray-700 text-white rounded-3xl rounded-bl-md"
                        : "bg-gray-200 text-gray-900 rounded-3xl rounded-bl-md"
                    } ${
                      (message.image || message.video) ? "p-1" : "px-5 py-3"
                    } shadow-sm hover:shadow-md transition-all`}
                  >
                    {message.image && (
                      <img
                        src={message.image}
                        alt="Shared"
                        className="rounded-2xl max-w-sm w-full h-auto"
                      />
                    )}
                    {message.video && (
                      <video
                        src={message.video}
                        controls
                        className="rounded-2xl max-w-sm w-full h-auto"
                      >
                        Your browser does not support the video tag.
                      </video>
                    )}
                    {message.audio && (
                      <audio
                        src={message.audio}
                        controls
                        className="w-full"
                      >
                        Your browser does not support the audio element.
                      </audio>
                    )}
                    {message.text && (
                      <p className={`text-[15px] leading-relaxed ${(message.image || message.video || message.audio) ? "mt-2" : ""}`}>
                        {message.text}
                      </p>
                    )}
                    {!message.text && !message.image && !message.video && !message.audio && (
                      <p className="text-[15px] leading-relaxed opacity-70 italic">
                        [Media]
                      </p>
                    )}

                    <div 
                      className="relative"
                      ref={(el) => {
                        if (el) {
                          menuRefs.current.set(message.id, el);
                        } else {
                          menuRefs.current.delete(message.id);
                        }
                      }}
                    >
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === message.id ? null : message.id);
                        }}
                        className={`absolute -right-8 top-1/2 -translate-y-1/2 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                      >
                        <MoreVertical className={`w-4 h-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`} />
                      </button>
                      
                      {openMenuId === message.id && message.isMine && (
                        <div className={`absolute -right-32 top-1/2 -translate-y-1/2 z-50 min-w-[120px] rounded-lg shadow-lg border ${
                          isDarkMode 
                            ? 'bg-gray-800 border-gray-700' 
                            : 'bg-white border-gray-200'
                        }`}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRecallMessage?.(message.id);
                              setOpenMenuId(null);
                            }}
                            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 first:rounded-t-lg transition-colors ${
                              isDarkMode 
                                ? 'hover:bg-gray-700 text-gray-200' 
                                : 'text-gray-700'
                            }`}
                          >
                            Thu hồi
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteMessage?.(message.id);
                              setOpenMenuId(null);
                            }}
                            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 last:rounded-b-lg transition-colors ${
                              isDarkMode 
                                ? 'hover:bg-gray-700 text-gray-200' 
                                : 'text-gray-700'
                            }`}
                          >
                            Xóa
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs mt-1 px-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {message.timestamp}
                  </span>
                </div>

                {message.isMine && (
                  <div className="w-8 h-8 flex-shrink-0" />
                )}
              </div>
            );
          })
          )}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-end gap-2">
              <div className="w-8 h-8 flex-shrink-0">
                <img
                  src={contact.avatar}
                  alt={contact.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              </div>
              <div className="flex flex-col items-start">
                <div className={`group relative max-w-md ${
                  isDarkMode 
                    ? "bg-gray-700 text-white rounded-3xl rounded-bl-md" 
                    : "bg-gray-200 text-gray-900 rounded-3xl rounded-bl-md"
                } px-5 py-3 shadow-sm`}>
                  <div className="flex items-center gap-1.5">
                    <span className="typing-dot inline-block w-2 h-2 rounded-full bg-gray-500"></span>
                    <span className="typing-dot inline-block w-2 h-2 rounded-full bg-gray-500"></span>
                    <span className="typing-dot inline-block w-2 h-2 rounded-full bg-gray-500"></span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Scroll anchor - always at the bottom */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* INPUT AREA */}
      <div className={`p-4 border-t relative z-[100] ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        {showVoiceRecorder && onVoiceRecordingComplete ? (
          <VoiceRecorder
            onRecordingComplete={onVoiceRecordingComplete}
            onCancel={() => setShowVoiceRecorder(false)}
          />
        ) : (
          <div className="max-w-4xl mx-auto flex items-end gap-3">
            <div className="flex gap-2">
              {/* Image/Video Upload Button */}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  ref={imageInputRef}
                  id="image-upload"
                />
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className={`p-2.5 rounded-full transition-colors text-blue-500 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  title="Send Photo/Video"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
              </div>

              {/* File Upload Button */}
              {onUploadMedia && (
                <div className="relative">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    ref={fileInputRef}
                    id="file-upload"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2.5 rounded-full transition-colors text-blue-500 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                    title="Send File"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Voice Recording Button */}
              <button
                onClick={handleRecordingToggle}
                className={`p-2.5 rounded-full transition-all ${
                  isRecording
                    ? "bg-red-100 text-red-500"
                    : isDarkMode
                    ? "hover:bg-gray-700 text-blue-500"
                    : "hover:bg-gray-100 text-blue-500"
                }`}
                title="Voice Message"
              >
                <Mic className="w-5 h-5" />
              </button>

              {/* Emoji Picker Button */}
              <div className="relative">
                <button
                  ref={emojiButtonRef}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`p-2.5 rounded-full transition-colors text-blue-500 relative z-[100] ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  title="Emoji"
                >
                  <Smile className="w-5 h-5" />
                </button>
              </div>
            </div>

          <div className="flex-1 relative">
            {isRecording && (
              <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs text-red-500 font-semibold">
                  Recording...
                </span>
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => {
                const value = e.target.value;
                setInputMessage(value);
                const trimmed = value.trim();

                if (trimmed.length > 0) {
                  if (!isTypingSentRef.current) {
                    onTypingStart?.();
                    isTypingSentRef.current = true;
                  }
                  if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                  }
                  typingTimeoutRef.current = setTimeout(() => {
                    if (isTypingSentRef.current) {
                      onTypingStop?.();
                      isTypingSentRef.current = false;
                    }
                  }, 1500);
                } else if (isTypingSentRef.current) {
                  onTypingStop?.();
                  isTypingSentRef.current = false;
                  if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = null;
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
                // Shift+Enter will naturally create a new line
              }}
              onBlur={() => {
                if (typingTimeoutRef.current) {
                  clearTimeout(typingTimeoutRef.current);
                  typingTimeoutRef.current = null;
                }
                if (isTypingSentRef.current) {
                  onTypingStop?.();
                  isTypingSentRef.current = false;
                }
              }}
              placeholder={
                !isConnected
                  ? "Đang kết nối..."
                  : isRecording
                  ? "Recording audio..."
                  : "Type a message..."
              }
              disabled={isRecording || !isConnected}
              rows={1}
              className={`w-full px-5 py-3 rounded-2xl text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 emoji-support resize-none overflow-y-auto ${
                isDarkMode 
                  ? 'bg-gray-700 text-white placeholder-gray-400 focus:bg-gray-600' 
                  : 'bg-gray-100 text-gray-900 focus:bg-white'
              }`}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>

          <button
            onClick={() =>
              isRecording ? handleRecordingToggle() : handleSend()
            }
            disabled={(!inputMessage.trim() && !isRecording) || !isConnected}
            className={`p-3 text-white rounded-full transition-all shadow-lg hover:shadow-xl ${
              isRecording
                ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            }`}
          >
            {isRecording ? <X className="w-5 h-5" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
        )}
      </div>

      {/* Emoji Picker - Render at top level with fixed positioning */}
      {showEmojiPicker && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setShowEmojiPicker(false)} />
          <div 
            className="fixed z-[9999] emoji-picker-container shadow-2xl"
            style={{
              bottom: `${emojiPickerPosition.bottom}px`,
              right: `${emojiPickerPosition.right}px`,
            }}
          >
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              width={300}
              height={400}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ChatWindow;


