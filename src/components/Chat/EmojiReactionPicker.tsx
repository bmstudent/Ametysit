import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Sparkles, Plus, Smile, Heart, ThumbsUp, Activity, Compass, LucideIcon, Upload, X } from 'lucide-react';

export interface EmojiItem {
  emoji: string;
  name: string;
  category: 'smileys' | 'gestures' | 'hearts' | 'explore' | 'activities';
  keywords: string[];
}

export const EMOJI_LIST: EmojiItem[] = [
  // Smileys
  { emoji: '😀', name: 'Grinning', category: 'smileys', keywords: ['happy', 'joy', 'smile', 'grin'] },
  { emoji: '😃', name: 'Big Eyes', category: 'smileys', keywords: ['happy', 'joy', 'smile', 'haha'] },
  { emoji: '😄', name: 'Smiling Eyes', category: 'smileys', keywords: ['happy', 'joy', 'smile', 'laugh'] },
  { emoji: '😁', name: 'Beaming', category: 'smileys', keywords: ['happy', 'grin', 'smile', 'teeth'] },
  { emoji: '😆', name: 'Squinting Face', category: 'smileys', keywords: ['happy', 'haha', 'laugh', 'lol'] },
  { emoji: '😅', name: 'Sweat Grin', category: 'smileys', keywords: ['nervous', 'sweat', 'laugh', 'whew'] },
  { emoji: '😂', name: 'Tears of Joy', category: 'smileys', keywords: ['laugh', 'lol', 'funny', 'tears', 'crying'] },
  { emoji: '🤣', name: 'Rolling on Floor', category: 'smileys', keywords: ['laugh', 'lol', 'funny', 'rofl'] },
  { emoji: '😊', name: 'Blushing Smile', category: 'smileys', keywords: ['blush', 'happy', 'smile', 'warm'] },
  { emoji: '😇', name: 'Halo Angel', category: 'smileys', keywords: ['angel', 'good', 'innocent'] },
  { emoji: '🙂', name: 'Slightly Smiling', category: 'smileys', keywords: ['smile', 'fine', 'neutral'] },
  { emoji: '🙃', name: 'Upside-Down', category: 'smileys', keywords: ['silly', 'sarcasm', 'flipped'] },
  { emoji: '😉', name: 'Wink', category: 'smileys', keywords: ['wink', 'flirt', 'joke'] },
  { emoji: '😌', name: 'Relieved', category: 'smileys', keywords: ['sigh', 'calm', 'relaxed', 'phew'] },
  { emoji: '😍', name: 'Heart Eyes', category: 'smileys', keywords: ['love', 'like', 'crush', 'eyes'] },
  { emoji: '🥰', name: 'Loved Blushing', category: 'smileys', keywords: ['love', 'affection', 'warm', 'blush'] },
  { emoji: '😘', name: 'Blow a Kiss', category: 'smileys', keywords: ['love', 'kiss', 'affection'] },
  { emoji: '😋', name: 'Yummy Food', category: 'smileys', keywords: ['food', 'hungry', 'delicious', 'tongue'] },
  { emoji: '😛', name: 'Sticking Out Tongue', category: 'smileys', keywords: ['playful', 'silly', 'joke'] },
  { emoji: '😜', name: 'Wink with Tongue', category: 'smileys', keywords: ['playful', 'silly', 'wink'] },
  { emoji: '🤪', name: 'Zany Goofy', category: 'smileys', keywords: ['crazy', 'silly', 'goofy'] },
  { emoji: '😎', name: 'Sunglasses Cool', category: 'smileys', keywords: ['sunglasses', 'chill', 'swag'] },
  { emoji: '🤩', name: 'Star-Struck', category: 'smileys', keywords: ['excited', 'amazing', 'wow'] },
  { emoji: '🥳', name: 'Partying Celebration', category: 'smileys', keywords: ['party', 'celebrate', 'birthday'] },
  { emoji: '😏', name: 'Smirk', category: 'smileys', keywords: ['smirk', 'sly', 'flirt'] },
  { emoji: '😒', name: 'Unamused Bored', category: 'smileys', keywords: ['meh', 'bored', 'unhappy', 'annoyed'] },
  { emoji: '😔', name: 'Pensive Sad', category: 'smileys', keywords: ['sad', 'sorry', 'thoughtful'] },
  { emoji: '🥺', name: 'Pleading Puppy Eyes', category: 'smileys', keywords: ['please', 'puppy', 'eyes', 'beg', 'sad'] },
  { emoji: '😢', name: 'Crying Tear', category: 'smileys', keywords: ['sad', 'cry', 'tear'] },
  { emoji: '😭', name: 'Loud Sobbing', category: 'smileys', keywords: ['sad', 'cry', 'heavy', 'sob'] },
  { emoji: '😤', name: 'Nose Steam Huff', category: 'smileys', keywords: ['angry', 'mad', 'frustrated', 'huff'] },
  { emoji: '😠', name: 'Angry', category: 'smileys', keywords: ['angry', 'mad'] },
  { emoji: '😡', name: 'Raging Pout', category: 'smileys', keywords: ['rage', 'angry', 'mad'] },
  { emoji: '🤬', name: 'Cursing Swear', category: 'smileys', keywords: ['cuss', 'swear', 'angry', 'rage'] },
  { emoji: '🤯', name: 'Exploding Head', category: 'smileys', keywords: ['mind', 'blown', 'shock', 'wow'] },
  { emoji: '😳', name: 'Flushed Blushing', category: 'smileys', keywords: ['blush', 'shock', 'embarrassed', 'shame'] },
  { emoji: '🥵', name: 'Sweating Hot', category: 'smileys', keywords: ['hot', 'heat', 'summer', 'sweat'] },
  { emoji: '🥶', name: 'Freezing Cold', category: 'smileys', keywords: ['cold', 'freeze', 'winter'] },
  { emoji: '😱', name: 'Screaming Scared', category: 'smileys', keywords: ['scream', 'fear', 'shock', 'scared', 'wow'] },
  { emoji: '😴', name: 'Sleeping Slumber', category: 'smileys', keywords: ['sleep', 'zzz', 'tired'] },
  { emoji: '🥴', name: 'Drunk Woozy', category: 'smileys', keywords: ['drunk', 'dizzy', 'tired'] },
  { emoji: '🤔', name: 'Thinking Hmmm', category: 'smileys', keywords: ['think', 'hmmm', 'query', 'idea'] },
  { emoji: '😬', name: 'Grimace Awkward', category: 'smileys', keywords: ['awkward', 'nervous', 'grimace', 'teeth'] },
  { emoji: '🙄', name: 'Rolling Eyes', category: 'smileys', keywords: ['whatever', 'roll', 'annoyed'] },
  { emoji: '😮', name: 'Open Mouth Surprise', category: 'smileys', keywords: ['wow', 'shock', 'surprise'] },
  { emoji: '🥱', name: 'Yawning Tired', category: 'smileys', keywords: ['tired', 'bored', 'yawn'] },
  
  // Gestures
  { emoji: '👍', name: 'Thumbs Up', category: 'gestures', keywords: ['yes', 'agree', 'ok', 'good', 'like'] },
  { emoji: '👎', name: 'Thumbs Down', category: 'gestures', keywords: ['no', 'dislike', 'bad', 'agree'] },
  { emoji: '👌', name: 'Perfect OK', category: 'gestures', keywords: ['ok', 'fine', 'perfect', 'yes'] },
  { emoji: '✌️', name: 'Victory Peace', category: 'gestures', keywords: ['peace', 'victory', 'two'] },
  { emoji: '🤞', name: 'Fingers Crossed', category: 'gestures', keywords: ['luck', 'hope', 'wish'] },
  { emoji: '🤟', name: 'Love You', category: 'gestures', keywords: ['love', 'ily', 'rock'] },
  { emoji: '🤘', name: 'Metal Horns', category: 'gestures', keywords: ['rock', 'horns', 'metal'] },
  { emoji: '🤙', name: 'Call Me Wave', category: 'gestures', keywords: ['phone', 'call', 'surf'] },
  { emoji: '👏', name: 'Clapping Bravo', category: 'gestures', keywords: ['clap', 'bravo', 'congrats', 'applause'] },
  { emoji: '🙌', name: 'Raising Hands hooray', category: 'gestures', keywords: ['hooray', 'halo', 'celebrate'] },
  { emoji: '🙏', name: 'Pray Thank You', category: 'gestures', keywords: ['please', 'thank', 'pray', 'hope', 'bless'] },
  { emoji: '👋', name: 'Waving Greeting', category: 'gestures', keywords: ['hello', 'hi', 'bye', 'wave'] },
  { emoji: '👊', name: 'Punch Brofist', category: 'gestures', keywords: ['fist', 'punch', 'brofist'] },
  { emoji: '🤝', name: 'Handshake Deal', category: 'gestures', keywords: ['agree', 'deal', 'shake', 'friend'] },
  { emoji: '💪', name: 'Strong Biceps', category: 'gestures', keywords: ['strong', 'flex', 'gym', 'power'] },

  // Hearts & Emotions
  { emoji: '❤️', name: 'Red Heart', category: 'hearts', keywords: ['love', 'heart', 'like'] },
  { emoji: '🧡', name: 'Orange Heart', category: 'hearts', keywords: ['love', 'heart'] },
  { emoji: '💛', name: 'Yellow Heart', category: 'hearts', keywords: ['love', 'heart', 'friend'] },
  { emoji: '💚', name: 'Green Heart', category: 'hearts', keywords: ['love', 'heart', 'nature'] },
  { emoji: '💙', name: 'Blue Heart', category: 'hearts', keywords: ['love', 'heart', 'trust'] },
  { emoji: '💜', name: 'Purple Heart', category: 'hearts', keywords: ['love', 'heart', 'amethyst'] },
  { emoji: '🖤', name: 'Black Heart', category: 'hearts', keywords: ['love', 'heart', 'dark'] },
  { emoji: '💔', name: 'Broken Heart', category: 'hearts', keywords: ['love', 'sad', 'heart', 'broken'] },
  { emoji: '❣️', name: 'Exclamation Heart', category: 'hearts', keywords: ['love', 'heart', 'emphasis'] },
  { emoji: '💕', name: 'Two Hearts', category: 'hearts', keywords: ['love', 'hearts', 'affection'] },
  { emoji: '💖', name: 'Sparkling Heart', category: 'hearts', keywords: ['love', 'heart', 'sparkle'] },
  { emoji: '💘', name: 'Cupid Arrow Heart', category: 'hearts', keywords: ['love', 'cupid', 'crush'] },

  // Activities & Fun
  { emoji: '🔥', name: 'Fire Hot', category: 'activities', keywords: ['hot', 'lit', 'fire', 'cool', 'awesome'] },
  { emoji: '🎉', name: 'Celebration Popper', category: 'activities', keywords: ['party', 'celebrate', 'congrats', 'popper'] },
  { emoji: '✨', name: 'Sparkles Magic', category: 'activities', keywords: ['sparkle', 'magic', 'shiny', 'new'] },
  { emoji: '🌟', name: 'Glowing Star', category: 'activities', keywords: ['star', 'glowing', 'magic', 'shine'] },
  { emoji: '🎈', name: 'Balloon Party', category: 'activities', keywords: ['party', 'celebrate', 'balloon'] },
  { emoji: '🎁', name: 'Gift Box Present', category: 'activities', keywords: ['present', 'gift', 'birthday', 'box'] },
  { emoji: '🏆', name: 'Gold Trophy', category: 'activities', keywords: ['win', 'prize', 'trophy', 'first'] },
  { emoji: '🥇', name: 'Gold Medal', category: 'activities', keywords: ['win', 'gold', 'medal', 'first'] },
  { emoji: '🎮', name: 'Game Controller', category: 'activities', keywords: ['play', 'game', 'gaming'] },

  // Objects & Symbols
  { emoji: '💡', name: 'Light Bulb Idea', category: 'explore', keywords: ['idea', 'light', 'think', 'smart'] },
  { emoji: '💻', name: 'Laptop Tech', category: 'explore', keywords: ['computer', 'code', 'work', 'tech'] },
  { emoji: '🔒', name: 'Locked Secure', category: 'explore', keywords: ['secure', 'lock', 'safe'] },
  { emoji: '🔑', name: 'Key Unlock', category: 'explore', keywords: ['key', 'unlock', 'safe'] },
  { emoji: '📝', name: 'Memo Write', category: 'explore', keywords: ['write', 'note', 'memo', 'edit'] },
  { emoji: '📅', name: 'Calendar Date', category: 'explore', keywords: ['date', 'calendar', 'time'] },
  { emoji: '📣', name: 'Megaphone Announcement', category: 'explore', keywords: ['announce', 'shout', 'news'] },
  { emoji: '🚀', name: 'Rocket Launch', category: 'explore', keywords: ['rocket', 'launch', 'fast', 'high'] },
  { emoji: '🎨', name: 'Palette Art', category: 'explore', keywords: ['art', 'paint', 'draw', 'creative'] },
  { emoji: '🎯', name: 'Bullseye Target', category: 'explore', keywords: ['target', 'hit', 'aim', 'focus'] },
  { emoji: '💯', name: 'Hundred Percent', category: 'explore', keywords: ['cool', 'agree', 'perfect', '100'] },
  { emoji: '✅', name: 'Check Done', category: 'explore', keywords: ['yes', 'done', 'correct'] },
  { emoji: '❌', name: 'Cross Delete', category: 'explore', keywords: ['no', 'delete', 'wrong'] }
];

const CATEGORIES: { id: 'all' | 'smileys' | 'gestures' | 'hearts' | 'activities' | 'explore' | 'custom'; label: string; icon: LucideIcon }[] = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'smileys', label: 'Smileys', icon: Smile },
  { id: 'gestures', label: 'Hands', icon: ThumbsUp },
  { id: 'hearts', label: 'Hearts', icon: Heart },
  { id: 'activities', label: 'Fun', icon: Activity },
  { id: 'explore', label: 'Symbols', icon: Compass },
  { id: 'custom', label: 'Custom', icon: Plus },
];

interface EmojiReactionPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
  isMe: boolean;
}

interface CustomEmoji {
  url: string;
  name: string;
}

export function EmojiReactionPicker({ onSelectEmoji, onClose, isMe }: EmojiReactionPickerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'smileys' | 'gestures' | 'hearts' | 'activities' | 'explore' | 'custom'>('all');

  const [urlInput, setUrlInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [customEmojis, setCustomEmojis] = useState<CustomEmoji[]>(() => {
    try {
      const saved = localStorage.getItem('chat_custom_emojis');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.error(err);
    }
    return [
      { name: 'Nyan Cat', url: 'https://media.giphy.com/media/sIIhZliB2McAo/giphy.gif' },
      { name: 'Dogecoin', url: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png' },
      { name: 'Party Parrot', url: 'https://cultofthepartyparrot.com/parrots/hd/parrot.gif' },
      { name: 'Among Us Crew', url: 'https://emoji.discourse-cdn.com/twitter/sus.png' },
    ];
  });

  const saveCustomEmojis = (updated: CustomEmoji[]) => {
    setCustomEmojis(updated);
    try {
      localStorage.setItem('chat_custom_emojis', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      showError("Limit: 500KB!");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const newCustom: CustomEmoji = {
          name: file.name.split('.')[0] || 'Uploaded Emoji',
          url: reader.result,
        };
        saveCustomEmojis([...customEmojis, newCustom]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddUrl = () => {
    if (!urlInput.trim()) {
      showError("Please enter a URL");
      return;
    }
    if (!urlInput.startsWith('http://') && !urlInput.startsWith('https://') && !urlInput.startsWith('data:')) {
      showError("URL must start with http/https");
      return;
    }

    const newCustom: CustomEmoji = {
      name: 'Custom Emoji',
      url: urlInput.trim(),
    };

    saveCustomEmojis([...customEmojis, newCustom]);
    setUrlInput('');
  };

  const priorityEmojis = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '💡'];

  const filteredEmojis = EMOJI_LIST.filter(item => {
    if (activeCategory !== 'all' && (activeCategory === 'custom' || item.category !== activeCategory)) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(q) ||
        item.emoji === q ||
        item.keywords.some(kw => kw.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const filteredCustomEmojis = customEmojis.filter(item => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return item.name.toLowerCase().includes(q) || item.url.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <>
      {/* Backdrop guard to close picker easily on outside click */}
      <div 
        className="fixed inset-0 z-40 cursor-default" 
        onClick={(e) => { 
          e.stopPropagation(); 
          onClose(); 
        }} 
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className={`absolute z-50 bg-[#151726]/98 border border-white/10 rounded-[24px] p-2.5 shadow-2xl shadow-black/80 flex flex-col gap-2 select-none duration-200 backdrop-blur-md ${
          isMe ? 'right-0' : 'left-0'
        } bottom-[calc(100%+8px)] ${
          isExpanded ? 'w-[310px]' : 'w-auto'
        }`}
        onClick={(e) => e.stopPropagation()} // Prevent bubble trigger actions
      >
        {/* Row 1: Quick Shortcut Emojis */}
        <div className="flex items-center gap-1.5 justify-start">
          {priorityEmojis.map(emoji => (
            <button
              key={emoji}
              onClick={() => onSelectEmoji(emoji)}
              className="text-[18px] hover:scale-135 active:scale-90 transition-transform p-1.5 duration-150 cursor-pointer outline-none hover:bg-white/5 rounded-xl text-white"
              type="button"
            >
              {emoji}
            </button>
          ))}

          {/* Plus expander button if not expanded */}
          {!isExpanded && (
            <button
              onClick={() => setIsExpanded(true)}
              className="w-8 h-8 rounded-xl border border-white/5 hover:border-purple-500/30 hover:bg-purple-500/10 text-purple-400 hover:text-purple-300 flex items-center justify-center transition-all cursor-pointer active:scale-90 select-none outline-none ml-1 shrink-0"
              title="More Emojis..."
              type="button"
            >
              <Plus size={15} />
            </button>
          )}
        </div>

        {/* Custom Expanded Tab & Search panel */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col gap-2.5 overflow-hidden border-t border-white/5 pt-2.5"
            >
              {/* Search input field */}
              <div className="relative">
                <Search size={13} className="absolute left-3.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={activeCategory === 'custom' ? "Search saved customs..." : "Search custom emoji..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0E101D] text-slate-100 placeholder:text-slate-500 rounded-xl pl-9 pr-4 py-1.5 text-xs outline-none focus:ring-1 focus:ring-purple-500/50 border border-white/5 focus:border-purple-500/50 transition-all font-medium"
                  autoFocus
                />
              </div>

              {/* Category tabs list */}
              <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar shrink-0 select-none -mx-1 px-1">
                {CATEGORIES.map(cat => {
                  const CatIcon = cat.icon;
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold tracking-tight outline-none border transition-all cursor-pointer shrink-0 select-none ${
                        isActive
                          ? 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                          : 'bg-white/5 border-transparent text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                      type="button"
                    >
                      <CatIcon size={11} />
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* If Custom Category is Selected */}
              {activeCategory === 'custom' ? (
                <div className="flex flex-col gap-2">
                  {/* Compact Add Section */}
                  <div className="flex flex-col gap-1 px-1.5 py-1.5 bg-[#0E101D] border border-white/5 rounded-xl">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Paste reaction URL..."
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        className="flex-1 min-w-0 bg-white/5 text-slate-200 placeholder:text-slate-500 rounded-lg px-2.5 py-1 text-[11px] outline-none border border-white/5 focus:border-purple-500/50"
                      />
                      <button
                        onClick={handleAddUrl}
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold shrink-0 transition-colors cursor-pointer"
                        type="button"
                      >
                        Add
                      </button>
                      <label className="flex items-center justify-center p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer shrink-0 border border-white/5" title="Upload Image File">
                        <Upload size={12} />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {errorMsg && (
                      <span className="text-[9px] text-red-400 font-extrabold tracking-wide uppercase px-1">
                        {errorMsg}
                      </span>
                    )}
                  </div>

                  {/* Custom Emojis Grid */}
                  <div className="h-[95px] overflow-y-auto px-1 grid grid-cols-6 gap-1.5 custom-scrollbar bg-[#0E101D]/40 rounded-xl p-1.5 select-none border border-white/5">
                    {filteredCustomEmojis.map((item, index) => (
                      <div key={`${item.url}-${index}`} className="relative group/custom aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/5 hover:border-purple-500/40 flex items-center justify-center">
                        <button
                          onClick={() => onSelectEmoji(item.url)}
                          className="w-full h-full p-1 hover:scale-110 active:scale-95 transition-transform flex items-center justify-center cursor-pointer select-none"
                          title={item.name}
                          type="button"
                        >
                          <img
                            src={item.url}
                            alt={item.name}
                            className="w-full h-full object-contain pointer-events-none rounded"
                            referrerPolicy="no-referrer"
                          />
                        </button>
                        
                        {/* Delete item button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const updated = customEmojis.filter((_, idx) => idx !== index);
                            saveCustomEmojis(updated);
                          }}
                          className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/custom:opacity-100 transition-opacity cursor-pointer shadow-md shadow-black/50 border border-white/20"
                          title="Delete custom emoji"
                          type="button"
                        >
                          <X size={8} />
                        </button>
                      </div>
                    ))}

                    {filteredCustomEmojis.length === 0 && (
                      <div className="col-span-6 py-6 text-center text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">
                        No custom reactions
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Emoji list grid */
                <div className="h-[140px] overflow-y-auto px-1 grid grid-cols-7 gap-1.5 custom-scrollbar bg-[#0E101D]/40 rounded-xl p-2 select-none border border-white/5">
                  {filteredEmojis.map(item => (
                    <button
                      key={item.emoji}
                      onClick={() => onSelectEmoji(item.emoji)}
                      className="text-[17px] hover:scale-130 active:scale-90 transition-transform aspect-square flex items-center justify-center hover:bg-white/5 cursor-pointer rounded-lg outline-none text-white select-none duration-150"
                      title={item.name}
                      type="button"
                    >
                      {item.emoji}
                    </button>
                  ))}

                  {filteredEmojis.length === 0 && (
                    <div className="col-span-7 py-8 text-center text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">
                      No matching emojis
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
