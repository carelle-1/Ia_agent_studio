import React, { useState } from 'react';
import { ThumbsUp, MessageSquare, Share2, Globe, MoreHorizontal, CheckCircle2 } from 'lucide-react';

interface FacebookPreviewProps {
  pageName: string;
  pageAvatar?: string;
  content: string;
  imageUrl?: string;
  dateStr?: string;
}

export const FacebookPreview: React.FC<FacebookPreviewProps> = ({
  pageName,
  pageAvatar = 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=120&auto=format&fit=crop&q=80',
  content,
  imageUrl,
  dateStr = 'À l’instant',
}) => {
  const [liked, setLiked] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Render markdown bold nicely
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, lIdx) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <span key={lIdx} className="block mb-1 leading-relaxed">
          {parts.map((p, pIdx) => {
            if (p.startsWith('**') && p.endsWith('**')) {
              return <strong key={pIdx} className="font-semibold text-gray-900 dark:text-gray-100">{p.slice(2, -2)}</strong>;
            }
            return p;
          })}
        </span>
      );
    });
  };

  const isLong = content.length > 280;
  const displayContent = !expanded && isLong ? content.slice(0, 260) + '...' : content;

  return (
    <div className="w-full max-w-lg mx-auto bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden font-sans text-sm">
      {/* Header */}
      <div className="p-3.5 flex items-center justify-between border-b border-gray-100 dark:border-zinc-800/60">
        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <img
              src={pageAvatar}
              alt={pageName}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/30"
            />
            <div className="absolute -bottom-0.5 -right-0.5 bg-blue-600 rounded-full p-0.5 text-white">
              <CheckCircle2 className="w-2.5 h-2.5" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-1">
              <span className="font-bold text-gray-900 dark:text-white text-sm hover:underline cursor-pointer">
                {pageName}
              </span>
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-gray-500 dark:text-zinc-400">
              <span>{dateStr}</span>
              <span>•</span>
              <Globe className="w-3 h-3" />
            </div>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 p-1 rounded-full">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Caption Content */}
      <div className="px-3.5 pt-2 pb-3 text-gray-800 dark:text-zinc-200 text-[13.5px] whitespace-pre-line">
        {renderFormattedText(displayContent)}
        {isLong && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="text-gray-500 dark:text-zinc-400 font-semibold text-xs hover:underline mt-1"
          >
            Voir plus
          </button>
        )}
      </div>

      {/* Media Image */}
      {imageUrl && (
        <div className="relative w-full aspect-[4/3] bg-zinc-950 overflow-hidden">
          <img
            src={imageUrl}
            alt="Visuel de publication"
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.01]"
          />
        </div>
      )}

      {/* Engagement Counters */}
      <div className="px-3.5 py-2 flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400 border-b border-gray-100 dark:border-zinc-800">
        <div className="flex items-center space-x-1.5">
          <div className="flex -space-x-1">
            <span className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-[9px] text-white">👍</span>
            <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[9px] text-white">❤️</span>
          </div>
          <span>{liked ? 143 : 142}</span>
        </div>
        <div className="flex space-x-3">
          <span>28 commentaires</span>
          <span>14 partages</span>
        </div>
      </div>

      {/* Interaction Buttons */}
      <div className="px-2 py-1 flex items-center justify-between text-gray-600 dark:text-zinc-400">
        <button
          onClick={() => setLiked(!liked)}
          className={`flex-1 py-1.5 flex items-center justify-center space-x-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition font-medium text-xs ${
            liked ? 'text-blue-600 dark:text-blue-400' : ''
          }`}
        >
          <ThumbsUp className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
          <span>J’aime</span>
        </button>
        <button className="flex-1 py-1.5 flex items-center justify-center space-x-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition font-medium text-xs">
          <MessageSquare className="w-4 h-4" />
          <span>Commenter</span>
        </button>
        <button className="flex-1 py-1.5 flex items-center justify-center space-x-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition font-medium text-xs">
          <Share2 className="w-4 h-4" />
          <span>Partager</span>
        </button>
      </div>
    </div>
  );
};
