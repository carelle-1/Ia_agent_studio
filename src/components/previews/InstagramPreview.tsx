import React, { useState } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from 'lucide-react';

interface InstagramPreviewProps {
  handle: string;
  avatarUrl?: string;
  content: string;
  imageUrl?: string;
  hashtags?: string[];
  location?: string;
}

export const InstagramPreview: React.FC<InstagramPreviewProps> = ({
  handle,
  avatarUrl = 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=120&auto=format&fit=crop&q=80',
  content,
  imageUrl,
  hashtags = [],
  location = 'Paris, France',
}) => {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;
  const isLong = content.length > 120;
  const displayCaption = !expanded && isLong ? content.slice(0, 110) + '...' : content;

  return (
    <div className="w-full max-w-sm mx-auto bg-white dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden font-sans text-xs">
      {/* Top Header */}
      <div className="p-3 flex items-center justify-between border-b border-gray-100 dark:border-zinc-900">
        <div className="flex items-center space-x-2.5">
          <div className="p-[2px] rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600">
            <img
              src={avatarUrl}
              alt={cleanHandle}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-white dark:ring-black"
            />
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white leading-tight cursor-pointer hover:opacity-80">
              {cleanHandle}
            </div>
            {location && <div className="text-[10px] text-gray-500 dark:text-zinc-400">{location}</div>}
          </div>
        </div>
        <button className="text-gray-500 dark:text-zinc-400 p-1">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Main Image */}
      {imageUrl ? (
        <div className="relative w-full aspect-square bg-zinc-950 overflow-hidden">
          <img
            src={imageUrl}
            alt="Instagram visual"
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-full aspect-square bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 text-xs">
          Aucun visuel associé
        </div>
      )}

      {/* Action Bar */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3.5 text-gray-900 dark:text-white">
            <button
              onClick={() => setLiked(!liked)}
              className="hover:scale-110 active:scale-95 transition"
            >
              <Heart
                className={`w-5 h-5 ${liked ? 'fill-red-500 text-red-500' : 'text-gray-900 dark:text-white'}`}
              />
            </button>
            <button className="hover:scale-110 active:scale-95 transition">
              <MessageCircle className="w-5 h-5" />
            </button>
            <button className="hover:scale-110 active:scale-95 transition">
              <Send className="w-5 h-5 -rotate-12" />
            </button>
          </div>
          <button
            onClick={() => setSaved(!saved)}
            className="text-gray-900 dark:text-white hover:scale-110 transition"
          >
            <Bookmark className={`w-5 h-5 ${saved ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Likes Count */}
        <div className="font-semibold text-gray-900 dark:text-white mb-1.5 text-xs">
          {liked ? 483 : 482} mentions J’aime
        </div>

        {/* Caption */}
        <div className="text-gray-900 dark:text-zinc-200 leading-relaxed text-xs">
          <span className="font-bold mr-1.5 text-black dark:text-white cursor-pointer hover:underline">
            {cleanHandle}
          </span>
          <span className="whitespace-pre-line">{displayCaption}</span>
          {isLong && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="text-gray-500 dark:text-zinc-400 font-normal ml-1 hover:underline"
            >
              plus
            </button>
          )}
        </div>

        {/* Hashtags */}
        {hashtags && hashtags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
            {hashtags.slice(0, 6).map((tag, i) => (
              <span key={i} className="cursor-pointer hover:underline">
                {tag.startsWith('#') ? tag : `#${tag}`}
              </span>
            ))}
          </div>
        )}

        {/* Comments count */}
        <div className="mt-2 text-gray-400 dark:text-zinc-500 text-[11px] cursor-pointer hover:underline">
          Afficher les 34 commentaires
        </div>
        <div className="text-[10px] text-gray-400 dark:text-zinc-600 uppercase tracking-wider mt-1">
          Il y a 2 heures
        </div>
      </div>
    </div>
  );
};
