import React, { memo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';
import { 
  Clock, 
  Check, 
  CheckCheck, 
  MoreHorizontal, 
  Reply, 
  Copy, 
  Pin, 
  Smile, 
  Edit2, 
  Trash2,
  FileText,
  Download,
  X
} from 'lucide-react';
import type { User as AppUser } from './contexts/AppContext';
import { getChatAttachmentUrl, getAvatarUrl } from '../utils/storage-helper';
import { parseDeepLinkFromUrl, isInternalUrl, type DeepLink } from '../utils/deep-link';

interface MessageWithReactions {
  id: string;
  senderId: string;
  senderName?: string;
  content: string;
  type: 'text' | 'image' | 'file';
  createdAt: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  reactions?: Record<string, string[]>;
  isEdited?: boolean;
  isPinned?: boolean;
  replyTo?: {
    id: string;
    content: string;
    senderName: string;
  };
  attachments?: Array<{
    type: string;
    url?: string; // Legado - manter para compatibilidade
    path?: string; // Novo padrão - PATH do storage
    filename?: string; // Novo padrão
    name?: string; // Legado
    size?: number;
  }>;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  showDateSeparator: boolean;
  isLastMessage?: boolean;
}

interface ChatMessageItemProps {
  message: MessageWithReactions;
  user: AppUser;
  selectedChat: any;
  formatMessageTime: (timestamp: string) => string;
  handleReaction: (messageId: string, emoji: string) => void;
  handleCopyMessage: (content: string) => void;
  handlePinMessage: (messageId: string, isPinned: boolean) => void;
  handleDeleteMessage: (messageId: string) => void;
  setReplyingTo: (message: MessageWithReactions) => void;
  setEditingMessage: (message: MessageWithReactions) => void;
  setMessageInput: (content: string) => void;
  setShowReactionPicker: (messageId: string | null) => void;
  showReactionPicker: string | null;
  viewImage: (url: string) => void;
  onRetryMessage?: (message: MessageWithReactions) => void;
  REACTIONS: string[];
}

const ChatMessageItem = memo(({
  message,
  user,
  selectedChat,
  formatMessageTime,
  handleReaction,
  handleCopyMessage,
  handlePinMessage,
  handleDeleteMessage,
  setReplyingTo,
  setEditingMessage,
  setMessageInput,
  setShowReactionPicker,
  showReactionPicker,
  viewImage,
  onRetryMessage,
  REACTIONS,
}: ChatMessageItemProps) => {
  const isOwn = message.senderId === user.id;
  const { isFirstInGroup, isLastInGroup, showDateSeparator } = message;
  const navigate = useNavigate();

  // 🔗 Render text with clickable links (internal deep links + external URLs)
  const renderLinkedText = (text: string) => {
    // Use separate regex instances to avoid lastIndex issues with /g flag
    const splitRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/i;
    const parts = text.split(splitRegex);
    
    if (parts.length === 1) return text; // No URLs found
    
    return parts.map((part, index) => {
      // Check if this part looks like a URL (odd indices from split are captures)
      const isUrl = /^https?:\/\//i.test(part);
      
      if (isUrl) {
        // Check if it's an internal deep link
        const deepLink = parseDeepLinkFromUrl(part);
        
        if (deepLink) {
          // Internal link - handle navigation within app via React Router
          const displayPath = part.replace(/https?:\/\/(www\.)?fretes\.moovefretes\.com\.br/, '');
          return (
            <a
              key={index}
              href={displayPath || '/'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Use global handler from AppLayout (React Router based)
                const handler = (window as any)._handleDeepLinkNavigation;
                if (handler) {
                  handler(deepLink);
                } else {
                  // Fallback: use React Router navigate
                  navigate(displayPath || '/');
                }
              }}
              className="text-blue-500 underline hover:text-blue-700 cursor-pointer break-all"
            >
              {displayPath || '/'}
            </a>
          );
        }
        
        // Check if it's an internal URL but not a recognized deep link pattern
        if (isInternalUrl(part)) {
          const internalPath = part.replace(/https?:\/\/(www\.)?fretes\.moovefretes\.com\.br/, '') || '/';
          return (
            <a
              key={index}
              href={internalPath}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(internalPath);
              }}
              className="text-blue-500 underline hover:text-blue-700 cursor-pointer break-all"
            >
              {internalPath}
            </a>
          );
        }
        
        // External link - open in new tab
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-blue-500 underline hover:text-blue-700 cursor-pointer break-all"
          >
            {part.length > 60 ? part.substring(0, 57) + '...' : part}
          </a>
        );
      }
      return part;
    });
  };

  // ✅ Estado para URLs geradas dinamicamente
  const [attachmentUrls, setAttachmentUrls] = useState<Record<number, string>>({});

  // ✅ Converter avatar PATH → URL dinamicamente
  const senderAvatarUrl = React.useMemo(() => {
    const path = selectedChat?.otherUser?.avatar;
    if (!path) return null;
    if (path.startsWith('http')) return path; // Compatibilidade legado
    return getAvatarUrl(path); // PATH → URL
  }, [selectedChat?.otherUser?.avatar]);

  // ✅ Gerar URLs dinamicamente quando mensagem tem anexos
  useEffect(() => {
    if (message.attachments && message.attachments.length > 0) {
      const generateUrls = async () => {
        const urls: Record<number, string> = {};
        
        for (let i = 0; i < message.attachments!.length; i++) {
          const attachment = message.attachments![i];
          
          // Compatibilidade: se já é URL, usa direto
          if (attachment.url && attachment.url.startsWith('http')) {
            urls[i] = attachment.url;
          }
          // Se tem path, gerar signed URL
          else if (attachment.path) {
            const signedUrl = await getChatAttachmentUrl(attachment.path);
            if (signedUrl) {
              urls[i] = signedUrl;
            }
          }
          // Fallback para url (legado)
          else if (attachment.url) {
            const signedUrl = await getChatAttachmentUrl(attachment.url);
            if (signedUrl) {
              urls[i] = signedUrl;
            }
          }
        }
        
        setAttachmentUrls(urls);
      };
      
      generateUrls();
    }
  }, [message.attachments]);

  // Border radius based on position in group
  let borderRadiusClass = '';
  if (isFirstInGroup && isLastInGroup) {
    borderRadiusClass = 'rounded-2xl';
  } else if (isFirstInGroup) {
    borderRadiusClass = isOwn ? 'rounded-t-2xl rounded-bl-2xl rounded-br-md' : 'rounded-t-2xl rounded-br-2xl rounded-bl-md';
  } else if (isLastInGroup) {
    borderRadiusClass = isOwn ? 'rounded-b-2xl rounded-tl-2xl rounded-tr-md' : 'rounded-b-2xl rounded-tr-2xl rounded-tl-md';
  } else {
    borderRadiusClass = isOwn ? 'rounded-l-2xl rounded-r-md' : 'rounded-r-2xl rounded-l-md';
  }

  return (
    <>
      {/* Date Separator */}
      {showDateSeparator && (
        <div className="flex justify-center my-4">
          <span className="text-xs bg-muted px-3 py-1 rounded-full text-muted-foreground">
            {new Date(message.createdAt).toLocaleDateString('pt-BR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group ${
          isFirstInGroup ? 'mt-2' : 'mt-0.5'
        }`}
      >
        {/* Avatar for received messages - only on first message of group */}
        {!isOwn && isFirstInGroup && (
          <div className="mr-2 mt-auto mb-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary overflow-hidden">
              {senderAvatarUrl ? (
                <img src={senderAvatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                message.senderName?.charAt(0).toUpperCase()
              )}
            </div>
          </div>
        )}
        
        {/* Spacer for middle/last messages without avatar */}
        {!isOwn && !isFirstInGroup && (
          <div className="w-8 mr-2" />
        )}

        <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
          {/* Sender name and pinned indicator - only on first message of group for received messages */}
          {!isOwn && isFirstInGroup && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1 px-2">
              <span>{message.senderName}</span>
              {message.isPinned && (
                <Pin className="w-3 h-3 fill-current" />
              )}
            </div>
          )}
          
          {/* Pinned indicator for own messages */}
          {isOwn && isFirstInGroup && message.isPinned && (
            <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground mb-1 px-2">
              <Pin className="w-3 h-3 fill-current" />
            </div>
          )}

          {/* Reply Reference */}
          {message.replyTo && (
            <div className={`text-xs bg-muted/50 p-2 rounded-t-lg border-l-2 mb-0.5 ${
              isOwn ? 'border-primary' : 'border-muted-foreground'
            }`}>
              <div className="font-medium">{message.replyTo.senderName}</div>
              <div className="text-muted-foreground truncate">{message.replyTo.content}</div>
            </div>
          )}

          <div
            className={`overflow-hidden shadow-sm ${
              message.replyTo ? 'rounded-t-none' : borderRadiusClass
            } ${
              message.type === 'image' || message.type === 'file' 
                ? 'p-0' 
                : 'px-4 py-3'
            } ${
              isOwn
                ? 'bg-primary text-white'
                : 'bg-muted text-foreground'
            }`}
          >
            {/* Images */}
            {message.type === 'image' && message.attachments && message.attachments.length > 0 && (
              <div className="space-y-1">
                {message.attachments.map((attachment, idx) => {
                  const url = attachmentUrls[idx] || attachment.url || '';
                  const name = attachment.filename || attachment.name || 'Imagem';
                  return (
                    <img
                      key={`${message.id}-img-${idx}-${attachment.path || attachment.url || idx}`}
                      src={url}
                      alt={name}
                      className="w-full max-w-xs cursor-pointer rounded-lg hover:opacity-90 transition-opacity"
                      onClick={() => viewImage(url)}
                    />
                  );
                })}
                {message.content && message.attachments[0] && message.content !== (message.attachments[0].filename || message.attachments[0].name) && (
                  <p className="text-base break-words px-3 py-2">{renderLinkedText(message.content)}</p>
                )}
              </div>
            )}

            {/* Documents */}
            {message.type === 'file' && message.attachments && message.attachments.length > 0 && (
              <div className="space-y-2 p-3">
                {message.attachments.map((attachment, idx) => {
                  const url = attachmentUrls[idx] || attachment.url || '';
                  const name = attachment.filename || attachment.name || 'Documento';
                  return (
                    <div
                      key={`${message.id}-file-${idx}-${attachment.path || attachment.url || idx}`}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        isOwn ? 'bg-white/10' : 'bg-background'
                      }`}
                    >
                      <FileText className="w-8 h-8" />
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-medium truncate">{name}</p>
                        <p className="text-sm opacity-70">
                          {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : 'Documento'}
                        </p>
                      </div>
                      <a
                        href={url}
                        download={name}
                        className={`p-2 rounded-lg ${isOwn ? 'hover:bg-white/10' : 'hover:bg-muted'}`}
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Text */}
            {message.type === 'text' && (
              <p className="text-base break-words whitespace-pre-wrap">{renderLinkedText(message.content)}</p>
            )}
          </div>

          {/* Falha no envio — a mensagem não some, dá pra reenviar (mesmo id => idempotente) */}
          {isOwn && (message.status as string) === 'failed' && (
            <button
              onClick={() => onRetryMessage?.(message)}
              className="flex items-center gap-1 mt-1 px-2 text-xs text-red-500 hover:underline ml-auto"
            >
              <X className="w-3 h-3" /> Falha ao enviar — toque para reenviar
            </button>
          )}

          {/* Reactions */}
          {message.reactions && Object.keys(message.reactions).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1 px-2">
              {Object.entries(message.reactions).map(([emoji, userIds]) => (
                userIds.length > 0 && (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(message.id, emoji)}
                    className={`text-xs px-2 py-1 rounded-full ${
                      userIds.includes(user.id)
                        ? 'bg-primary/20 ring-1 ring-primary'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {emoji} {userIds.length}
                  </button>
                )
              ))}
            </div>
          )}

          {/* Timestamp para última mensagem */}
          {message.isLastMessage && (
            <div className={`mt-2 px-2 text-xs text-muted-foreground ${isOwn ? 'text-right' : 'text-left'}`}>
              {formatMessageTime(message.createdAt)}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
});

ChatMessageItem.displayName = 'ChatMessageItem';

export default ChatMessageItem;