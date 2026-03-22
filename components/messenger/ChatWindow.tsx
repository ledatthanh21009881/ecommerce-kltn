"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Phone,
  Video as VideoIcon,
  Info,
  Smile,
  Image as ImageIcon,
  Send,
  MoreHorizontal,
  Mic,
  X,
  Play,
  Paperclip,
  Undo2,
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
  /** Bấm ⋮ → Thu hồi: vào chế độ chọn tin (giống Messenger admin) */
  onEnterRecallSelectionMode?: () => void;
  recallSelectionMode?: boolean;
  selectedRecallMessageIds?: number[];
  onToggleRecallSelect?: (messageId: string | number) => void;
  onRecallSelectAllMine?: () => void;
  onRecallDeselectAll?: () => void;
  onCancelRecallSelection?: () => void;
  onConfirmRecallSelected?: () => void;
  isTyping?: boolean;
}

/** URL tin thoại từ recorder (webm) — backend đôi khi gắn video/webm nên vẫn render như voice compact */
function isVoiceLikeMediaUrl(url?: string) {
  return Boolean(url && /voice-message|voice_message/i.test(url));
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
  onEnterRecallSelectionMode,
  recallSelectionMode = false,
  selectedRecallMessageIds = [],
  onToggleRecallSelect,
  onRecallSelectAllMine,
  onRecallDeselectAll,
  onCancelRecallSelection,
  onConfirmRecallSelected,
  isTyping = false,
}: ChatWindowProps) => {
  const [inputMessage, setInputMessage] = useState("");
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [emojiPickerPosition, setEmojiPickerPosition] = useState({ bottom: 0, right: 0 });
  const [emojiPickerSize, setEmojiPickerSize] = useState({ width: 300, height: 400 });
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);
  /** Hiện nút 3 chấm khi rê chuột vào cả bong bóng / hàng tin (ổn định hơn chỉ dùng CSS :hover) */
  const [hoveredMessageRowId, setHoveredMessageRowId] = useState<string | number | null>(null);
  /** Fixed position for message options menu (portal — avoids overflow:hidden clip) */
  const [messageMenuPlacement, setMessageMenuPlacement] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const messageMenuPortalRef = useRef<HTMLDivElement>(null);
  /** Fullscreen preview (ảnh / video) khi bấm vào trong chat hoặc gallery */
  const [mediaPreview, setMediaPreview] = useState<{
    url: string;
    kind: "image" | "video";
  } | null>(null);
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
      const vw = typeof window !== "undefined" ? window.innerWidth : 360;
      const vh = typeof window !== "undefined" ? window.innerHeight : 640;
      const w = Math.max(260, Math.min(300, vw - 16));
      const h = Math.max(280, Math.min(400, Math.floor(vh * 0.5)));
      setEmojiPickerSize({ width: w, height: h });
      // Calculate position based on button position
      if (emojiButtonRef.current) {
        const rect = emojiButtonRef.current.getBoundingClientRect();
        // Mobile: anchor picker from screen edges so it stays on-screen
        const rightOffset = Math.max(8, vw - rect.right);
        setEmojiPickerPosition({
          bottom: vh - rect.top + 8,
          right: rightOffset,
        });
      }
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Close message options menu when clicking outside or scrolling
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (messageMenuPortalRef.current?.contains(target)) return;
      let clickedInside = false;
      menuRefs.current.forEach((menuElement) => {
        if (menuElement && menuElement.contains(target)) {
          clickedInside = true;
        }
      });
      if (!clickedInside) {
        setOpenMenuId(null);
        setMessageMenuPlacement(null);
      }
    };
    const handleScroll = () => {
      setOpenMenuId(null);
      setMessageMenuPlacement(null);
    };
    if (openMenuId !== null) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleScroll, true);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [openMenuId]);

  useEffect(() => {
    if (!mediaPreview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMediaPreview(null);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mediaPreview]);

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
      <div className={`px-3 sm:px-6 py-3 sm:py-4 border-b shrink-0 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} shadow-sm`}>
        {!recallSelectionMode ? (
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="relative shrink-0">
                <img
                  src={contact.avatar}
                  alt={contact.name}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-blue-100"
                />
                {contact.online && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className={`font-semibold text-base sm:text-lg truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {contact.name}
                </h2>
                <p className={`text-xs sm:text-sm font-medium truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {!isConnected
                    ? "Đang kết nối..."
                    : contact.online
                    ? "Đang hoạt động"
                    : "Ngoại tuyến"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
              <button
                type="button"
                className={`hidden sm:inline-flex p-2 sm:p-2.5 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                aria-label="Phone"
              >
                <Phone className="w-5 h-5 text-blue-500" />
              </button>
              <button
                type="button"
                className={`hidden sm:inline-flex p-2 sm:p-2.5 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                aria-label="Video"
              >
                <VideoIcon className="w-5 h-5 text-blue-500" />
              </button>
              <button
                type="button"
                onClick={() => setShowMediaGallery(!showMediaGallery)}
                className={`p-2 sm:p-2.5 rounded-full transition-colors relative ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                aria-label="Media"
              >
                <Info className="w-5 h-5 text-blue-500" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
            <h2 className={`font-semibold text-base sm:text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Thu hồi tin nhắn
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs sm:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {selectedRecallMessageIds.length} đã chọn
              </span>
              {onRecallSelectAllMine && (
                <button
                  type="button"
                  onClick={onRecallSelectAllMine}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${isDarkMode ? 'border-gray-600 text-gray-200 hover:bg-gray-700' : 'border-gray-300 text-gray-800 hover:bg-gray-100'}`}
                >
                  Chọn tất cả
                </button>
              )}
              {onRecallDeselectAll && (
                <button
                  type="button"
                  onClick={onRecallDeselectAll}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${isDarkMode ? 'border-gray-600 text-gray-200 hover:bg-gray-700' : 'border-gray-300 text-gray-800 hover:bg-gray-100'}`}
                >
                  Bỏ chọn
                </button>
              )}
              {onCancelRecallSelection && (
                <button
                  type="button"
                  onClick={onCancelRecallSelection}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  Hủy
                </button>
              )}
              {onConfirmRecallSelected && (
                <button
                  type="button"
                  onClick={onConfirmRecallSelected}
                  disabled={selectedRecallMessageIds.length === 0}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:pointer-events-none"
                >
                  Thu hồi ({selectedRecallMessageIds.length})
                </button>
              )}
            </div>
          </div>
        )}
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
                  role={media.type === "image" || media.type === "video" ? "button" : undefined}
                  tabIndex={media.type === "image" || media.type === "video" ? 0 : undefined}
                  onClick={() => {
                    if (media.type === "image" && media.url) {
                      setMediaPreview({ url: media.url, kind: "image" });
                    } else if (media.type === "video" && media.url) {
                      setMediaPreview({ url: media.url, kind: "video" });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    if (media.type === "image" && media.url) {
                      setMediaPreview({ url: media.url, kind: "image" });
                    } else if (media.type === "video" && media.url) {
                      setMediaPreview({ url: media.url, kind: "video" });
                    }
                  }}
                  className={`relative group rounded-lg overflow-hidden border transition-all ${
                    media.type === "image" || media.type === "video"
                      ? "cursor-zoom-in"
                      : "cursor-default"
                  } ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 hover:border-blue-500' 
                      : 'bg-white border-gray-200 hover:border-blue-400'
                  }`}
                >
                  {media.type === "image" && media.url ? (
                    <img
                      src={media.url}
                      alt="Gallery item"
                      className="w-full h-32 object-cover pointer-events-none group-hover:scale-105 transition-transform"
                    />
                  ) : media.type === "video" && media.url ? (
                    <div className="w-full h-32 bg-gray-800 flex items-center justify-center relative">
                      <video
                        src={media.url}
                        className="pointer-events-none w-full h-full object-cover"
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
      <div
        className={`flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 min-h-0 ${isDarkMode ? 'bg-gradient-to-b from-gray-900 to-gray-800' : 'bg-gradient-to-b from-gray-50 to-white'} ${recallSelectionMode ? 'pl-9 sm:pl-11' : ''}`}
      >
        <div className="max-w-4xl mx-auto space-y-3 w-full min-w-0">
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

            const bubblePadding =
              message.image ||
              (message.video && !isVoiceLikeMediaUrl(message.video))
                ? "p-1"
                : (message.audio ||
                      (message.video && isVoiceLikeMediaUrl(message.video))) &&
                    !message.image
                  ? "px-3.5 py-1.5 sm:px-4 sm:py-2"
                  : "px-4 py-2.5 sm:px-5 sm:py-3";

            /** Chỉ tin thoại pill: padding ngang tối thiểu để viền xanh ôm sát thanh điều khiển */
            const voiceOnlyBubblePadding = "px-1 py-1 sm:px-1.5 sm:py-1.5";

            const hasVoiceStyleMedia = Boolean(
              message.audio ||
                (message.video && isVoiceLikeMediaUrl(message.video))
            );
            const hasNonVoiceVideo = Boolean(
              message.video && !isVoiceLikeMediaUrl(message.video)
            );
            /** Chỉ ghi âm / voice webm, không ảnh & không chữ → bo viên thuốc + ôm chiều ngang */
            const isVoiceOnlyBubble =
              hasVoiceStyleMedia &&
              !message.image &&
              !hasNonVoiceVideo &&
              !message.text;

            /** Chỉ chữ, không media → bong bóng ôm nội dung (không kéo flex-1 full hàng) */
            const isTextOnlyBubble =
              Boolean(message.text?.trim()) &&
              !message.image &&
              !message.video &&
              !message.audio;

            const mineBubbleWidthClass = isVoiceOnlyBubble
              ? "min-w-[220px] w-[min(100%,18rem)] max-w-[min(100%,20rem)] shrink-0"
              : isTextOnlyBubble
                ? "w-fit max-w-[min(100%,calc(100vw-4.5rem))] sm:max-w-md shrink-0 min-w-0"
                : "min-w-0 max-w-full flex-1";

            const theirsBubbleWidthClass = isVoiceOnlyBubble
              ? "min-w-[220px] w-[min(100%,18rem)] max-w-[min(100%,20rem)] shrink-0"
              : isTextOnlyBubble
                ? "w-fit max-w-[min(100%,calc(100vw-4.5rem))] sm:max-w-md shrink-0 min-w-0"
                : "min-w-0 max-w-[calc(100vw-4.5rem)] sm:max-w-md";

            const recallIdNum =
              typeof message.id === "string"
                ? parseInt(message.id, 10)
                : Number(message.id);
            const isRecallSelected =
              !Number.isNaN(recallIdNum) &&
              selectedRecallMessageIds.includes(recallIdNum);

            return (
              <div
                key={message.id}
                className={`group/row relative flex items-end gap-2 ${
                  message.isMine ? "flex-row-reverse" : "flex-row"
                }`}
                onMouseEnter={() => {
                  if (message.isMine) setHoveredMessageRowId(message.id);
                }}
                onMouseLeave={() => {
                  if (!message.isMine) return;
                  setHoveredMessageRowId((prev) =>
                    prev === message.id ? null : prev
                  );
                }}
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
                  className={`flex flex-col min-w-0 ${
                    message.isMine ? "items-end flex-1" : "items-start"
                  }`}
                  onMouseEnter={
                    message.isMine
                      ? () => setHoveredMessageRowId(message.id)
                      : undefined
                  }
                >
                  {message.isMine ? (
                    <div className="flex max-w-[calc(100vw-3rem)] w-full min-w-0 flex-row items-end justify-end gap-1.5 sm:max-w-md">
                      {recallSelectionMode && onToggleRecallSelect && (
                        <button
                          type="button"
                          onClick={() => onToggleRecallSelect(message.id)}
                          className={`mb-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full border shadow-sm transition-colors sm:h-[1.375rem] sm:w-[1.375rem] ${
                            isRecallSelected
                              ? "border-blue-500 bg-blue-500 text-white"
                              : isDarkMode
                                ? "border-gray-500 bg-gray-800 hover:border-blue-400"
                                : "border-gray-300 bg-white hover:border-blue-400"
                          }`}
                          aria-label={
                            isRecallSelected ? "Bỏ chọn thu hồi" : "Chọn để thu hồi"
                          }
                          aria-pressed={isRecallSelected}
                        >
                          {isRecallSelected && (
                            <svg
                              className="h-2.5 w-2.5"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              aria-hidden
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </button>
                      )}
                      {!recallSelectionMode && (
                      <div
                        className="relative shrink-0 flex flex-col justify-center pb-0.5"
                        ref={(el) => {
                          if (el) menuRefs.current.set(message.id, el);
                          else menuRefs.current.delete(message.id);
                        }}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (openMenuId === message.id) {
                              setOpenMenuId(null);
                              setMessageMenuPlacement(null);
                              return;
                            }
                            const btn = e.currentTarget;
                            const rect = btn.getBoundingClientRect();
                            const MENU_W = 220;
                            const MENU_H = 140;
                            let left = rect.left;
                            left = Math.max(8, Math.min(left, window.innerWidth - MENU_W - 8));
                            let top = rect.bottom + 6;
                            if (top + MENU_H > window.innerHeight - 8) {
                              top = rect.top - MENU_H - 6;
                            }
                            top = Math.max(8, top);
                            setMessageMenuPlacement({ top, left });
                            setOpenMenuId(message.id);
                          }}
                          className={`msg-more-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-opacity duration-150 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                            openMenuId === message.id ||
                            hoveredMessageRowId === message.id
                              ? "opacity-100"
                              : "opacity-0 focus-visible:opacity-100"
                          } ${isDarkMode ? "hover:bg-white/10 text-gray-200" : "hover:bg-black/[0.06] text-gray-500"}`}
                          aria-expanded={openMenuId === message.id}
                          aria-haspopup="menu"
                          aria-label="Tùy chọn tin nhắn"
                        >
                          <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
                        </button>
                      </div>
                      )}
                      <div
                        className={`${mineBubbleWidthClass} overflow-hidden bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm transition-all hover:shadow-md ${
                          isVoiceOnlyBubble
                            ? "rounded-full ring-1 ring-white/20"
                            : "rounded-3xl rounded-br-md"
                        } ${isVoiceOnlyBubble ? voiceOnlyBubblePadding : bubblePadding}`}
                      >
                        {message.image && (
                          <button
                            type="button"
                            className="block w-full p-0 m-0 border-0 bg-transparent rounded-2xl cursor-zoom-in text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                            onClick={() =>
                              setMediaPreview({ url: message.image!, kind: "image" })
                            }
                            aria-label="Xem ảnh phóng to"
                          >
                            <img
                              src={message.image}
                              alt="Shared"
                              className="rounded-2xl w-full h-auto max-w-full sm:max-w-sm pointer-events-none"
                            />
                          </button>
                        )}
                        {message.video &&
                          (isVoiceLikeMediaUrl(message.video) ? (
                            <div
                              className={
                                isVoiceOnlyBubble
                                  ? "chat-voice-wrap chat-voice-wrap--pill"
                                  : "chat-voice-wrap"
                              }
                            >
                              <video
                                src={message.video}
                                controls
                                playsInline
                                preload="metadata"
                                className={
                                  isVoiceOnlyBubble
                                    ? "chat-voice-video-msg rounded-full"
                                    : "chat-voice-video-msg rounded-md"
                                }
                              >
                                Your browser does not support the video tag.
                              </video>
                            </div>
                          ) : (
                            <video
                              src={message.video}
                              controls
                              className="rounded-2xl w-full h-auto max-w-full sm:max-w-sm"
                            >
                              Your browser does not support the video tag.
                            </video>
                          ))}
                        {message.audio && (
                          <div
                            className={
                              isVoiceOnlyBubble
                                ? "chat-voice-wrap chat-voice-wrap--pill"
                                : "chat-voice-wrap"
                            }
                          >
                            <audio
                              src={message.audio}
                              controls
                              preload="metadata"
                              className={
                                isVoiceOnlyBubble
                                  ? "chat-voice-msg chat-voice-msg--pill"
                                  : "chat-voice-msg"
                              }
                            >
                              Your browser does not support the audio element.
                            </audio>
                          </div>
                        )}
                        {message.text && (
                          <p
                            className={`max-w-full text-[15px] leading-relaxed break-words [overflow-wrap:anywhere] [word-break:break-word] ${message.image || message.video || message.audio ? "mt-2" : ""}`}
                          >
                            {message.text}
                          </p>
                        )}
                        {!message.text && !message.image && !message.video && !message.audio && (
                          <p className="text-[15px] leading-relaxed opacity-70 italic">[Media]</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`${theirsBubbleWidthClass} overflow-hidden ${
                        isDarkMode
                          ? "bg-gray-700 text-white"
                          : "bg-gray-200 text-gray-900"
                      } ${
                        isVoiceOnlyBubble
                          ? "rounded-full ring-1 ring-black/5 dark:ring-white/10"
                          : "rounded-3xl rounded-bl-md"
                      } ${isVoiceOnlyBubble ? voiceOnlyBubblePadding : bubblePadding} shadow-sm hover:shadow-md transition-all`}
                    >
                      {message.image && (
                        <button
                          type="button"
                          className="block w-full p-0 m-0 border-0 bg-transparent rounded-2xl cursor-zoom-in text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          onClick={() =>
                            setMediaPreview({ url: message.image!, kind: "image" })
                          }
                          aria-label="Xem ảnh phóng to"
                        >
                          <img
                            src={message.image}
                            alt="Shared"
                            className="rounded-2xl w-full h-auto max-w-full sm:max-w-sm pointer-events-none"
                          />
                        </button>
                      )}
                      {message.video &&
                        (isVoiceLikeMediaUrl(message.video) ? (
                          <div
                            className={
                              isVoiceOnlyBubble
                                ? "chat-voice-wrap chat-voice-wrap--pill"
                                : "chat-voice-wrap"
                            }
                          >
                            <video
                              src={message.video}
                              controls
                              playsInline
                              preload="metadata"
                              className={
                                isVoiceOnlyBubble
                                  ? "chat-voice-video-msg rounded-full"
                                  : "chat-voice-video-msg rounded-md"
                              }
                            >
                              Your browser does not support the video tag.
                            </video>
                          </div>
                        ) : (
                          <video
                            src={message.video}
                            controls
                            className="rounded-2xl w-full h-auto max-w-full sm:max-w-sm"
                          >
                            Your browser does not support the video tag.
                          </video>
                        ))}
                      {message.audio && (
                        <div
                          className={
                            isVoiceOnlyBubble
                              ? "chat-voice-wrap chat-voice-wrap--pill"
                              : "chat-voice-wrap"
                          }
                        >
                          <audio
                            src={message.audio}
                            controls
                            preload="metadata"
                            className={
                              isVoiceOnlyBubble
                                ? "chat-voice-msg chat-voice-msg--pill"
                                : "chat-voice-msg"
                            }
                          >
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      )}
                      {message.text && (
                        <p
                          className={`max-w-full text-[15px] leading-relaxed break-words [overflow-wrap:anywhere] [word-break:break-word] ${message.image || message.video || message.audio ? "mt-2" : ""}`}
                        >
                          {message.text}
                        </p>
                      )}
                      {!message.text && !message.image && !message.video && !message.audio && (
                        <p className="text-[15px] leading-relaxed opacity-70 italic">[Media]</p>
                      )}
                    </div>
                  )}
                  <span
                    className={`text-xs mt-1 px-3 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
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
                <div className={`group relative max-w-[calc(100vw-4.5rem)] sm:max-w-md ${
                  isDarkMode 
                    ? "bg-gray-700 text-white rounded-3xl rounded-bl-md" 
                    : "bg-gray-200 text-gray-900 rounded-3xl rounded-bl-md"
                } px-4 py-2.5 sm:px-5 sm:py-3 shadow-sm`}>
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
      <div
        className={`p-2 sm:p-4 border-t relative z-[100] shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))] ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} ${recallSelectionMode ? 'pointer-events-none opacity-50' : ''}`}
      >
        {showVoiceRecorder && onVoiceRecordingComplete ? (
          <VoiceRecorder
            onRecordingComplete={onVoiceRecordingComplete}
            onCancel={() => setShowVoiceRecorder(false)}
          />
        ) : (
          <div className="max-w-4xl mx-auto flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3 w-full min-w-0">
            <div className="flex gap-1 sm:gap-2 shrink-0 justify-between sm:justify-start w-full sm:w-auto">
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
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className={`p-2 sm:p-2.5 rounded-full transition-colors text-blue-500 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
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
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2 sm:p-2.5 rounded-full transition-colors text-blue-500 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                    title="Send File"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Voice Recording Button */}
              <button
                type="button"
                onClick={handleRecordingToggle}
                className={`p-2 sm:p-2.5 rounded-full transition-all ${
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
                  type="button"
                  ref={emojiButtonRef}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`p-2 sm:p-2.5 rounded-full transition-colors text-blue-500 relative z-[100] ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  title="Emoji"
                >
                  <Smile className="w-5 h-5" />
                </button>
              </div>
            </div>

          <div className="flex w-full min-w-0 items-end gap-2 sm:flex-1 sm:gap-3">
          <div className="flex-1 min-w-0 relative">
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
              className={`w-full min-w-0 px-3 sm:px-5 py-2.5 sm:py-3 rounded-2xl text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 emoji-support resize-none overflow-y-auto ${
                isDarkMode 
                  ? 'bg-gray-700 text-white placeholder-gray-400 focus:bg-gray-600' 
                  : 'bg-gray-100 text-gray-900 focus:bg-white'
              }`}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>

          <button
            type="button"
            onClick={() =>
              isRecording ? handleRecordingToggle() : handleSend()
            }
            disabled={(!inputMessage.trim() && !isRecording) || !isConnected}
            className={`shrink-0 p-2.5 sm:p-3 text-white rounded-full transition-all shadow-lg hover:shadow-xl ${
              isRecording
                ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            }`}
          >
            {isRecording ? <X className="w-5 h-5" /> : <Send className="w-5 h-5" />}
          </button>
          </div>
        </div>
        )}
      </div>

      {/* Message options: portal to body so overflow:hidden on parents does not clip */}
      {typeof document !== "undefined" &&
        openMenuId !== null &&
        messageMenuPlacement &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[9990] bg-transparent"
              aria-hidden
              onClick={() => {
                setOpenMenuId(null);
                setMessageMenuPlacement(null);
              }}
            />
            <div
              ref={messageMenuPortalRef}
              role="menu"
              className={`fixed z-[9991] w-[min(220px,calc(100vw-16px))] overflow-hidden rounded-xl border py-1 shadow-2xl ${
                isDarkMode
                  ? "border-gray-600 bg-gray-800"
                  : "border-gray-200/90 bg-white"
              }`}
              style={{
                top: messageMenuPlacement.top,
                left: messageMenuPlacement.left,
              }}
            >
              {onEnterRecallSelectionMode && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEnterRecallSelectionMode();
                    setOpenMenuId(null);
                    setMessageMenuPlacement(null);
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-[15px] transition-colors ${
                    isDarkMode
                      ? "text-gray-100 hover:bg-gray-700/80"
                      : "text-gray-800 hover:bg-gray-100"
                  }`}
                >
                  <Undo2 className="h-4 w-4 shrink-0 opacity-70" />
                  Thu hồi
                </button>
              )}
            </div>
          </>,
          document.body
        )}

      {/* Ảnh / video xem phóng to */}
      {typeof document !== "undefined" &&
        mediaPreview &&
        createPortal(
          <div className="fixed inset-0 z-[10020]">
            <button
              type="button"
              className="absolute inset-0 h-full w-full cursor-zoom-out bg-black/90 backdrop-blur-[2px]"
              aria-label="Đóng xem ảnh"
              onClick={() => setMediaPreview(null)}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 sm:p-8">
              {mediaPreview.kind === "image" ? (
                <img
                  src={mediaPreview.url}
                  alt="Xem ảnh lớn"
                  className="pointer-events-auto max-h-[min(90dvh,90vh)] max-w-full w-auto object-contain shadow-2xl select-none"
                  draggable={false}
                />
              ) : (
                <video
                  src={mediaPreview.url}
                  controls
                  autoPlay
                  playsInline
                  className="pointer-events-auto max-h-[min(90dvh,90vh)] max-w-full rounded-lg shadow-2xl"
                />
              )}
            </div>
            <button
              type="button"
              className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 sm:right-5 sm:top-5"
              onClick={() => setMediaPreview(null)}
              aria-label="Đóng"
            >
              <X className="h-6 w-6" strokeWidth={2} />
            </button>
          </div>,
          document.body
        )}

      {/* Emoji Picker - Render at top level with fixed positioning */}
      {showEmojiPicker && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setShowEmojiPicker(false)} />
          <div 
            className="fixed z-[9999] emoji-picker-container shadow-2xl max-w-[calc(100vw-0.5rem)]"
            style={{
              bottom: `${emojiPickerPosition.bottom}px`,
              right: `${emojiPickerPosition.right}px`,
            }}
          >
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              width={emojiPickerSize.width}
              height={emojiPickerSize.height}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ChatWindow;


