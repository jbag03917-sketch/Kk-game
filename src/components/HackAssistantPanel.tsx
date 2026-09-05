import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Terminal, 
  X, 
  Sparkles, 
  ArrowUpDown, 
  Search, 
  Crosshair, 
  Send, 
  Copy, 
  Check, 
  Flame, 
  Sword,
  RefreshCw,
  Cpu,
  BookOpen,
  Loader2
} from 'lucide-react';
import { DICTIONARY_DATABASE } from '../lib/dictionaryData';
import { COMPREHENSIVE_KOREAN_WORDS } from '../lib/koreanLexiconExpanded';
import { sounds } from '../lib/soundEffects';
import { DictionaryWord } from '../types';

// List of classic Korean word-chain "killer" (한방) ending syllables
const KILLER_ENDINGS = new Set([
  '륨', '늄', '슘', '듐', '븀', '튬', '랸', '녘', '릇', '늣', '릎', '늧', '탉', '녁', 
  '즘', '틱', '쁨', '읖', '늠', '늅', '늬', '늴', '뉘', '릇', '늗', '늚', '륵', '늒'
]);

export type HackSortMode = 'LONGEST' | 'ATTACK' | 'SHORTEST' | 'ALPHABETICAL';

interface HackAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  validChars: string[];
  lastWord: string | null;
  usedWords: string[];
  isMyTurn: boolean;
  onSelectWord: (word: string, autoSubmit?: boolean) => void;
}

export const HackAssistantPanel: React.FC<HackAssistantPanelProps> = ({
  isOpen,
  onClose,
  validChars,
  lastWord,
  usedWords,
  isMyTurn,
  onSelectWord,
}) => {
  const [sortMode, setSortMode] = useState<HackSortMode>('LONGEST');
  const [lengthFilter, setLengthFilter] = useState<number | 'ALL'>('ALL');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCharFilter, setSelectedCharFilter] = useState<string | null>(null);
  const [autoSubmitEnabled, setAutoSubmitEnabled] = useState(true);
  const [copiedWord, setCopiedWord] = useState<string | null>(null);
  const [liveApiWords, setLiveApiWords] = useState<DictionaryWord[]>([]);
  const [isLoadingLive, setIsLoadingLive] = useState(false);

  // Play sound on open
  useEffect(() => {
    if (isOpen) {
      sounds.playPop();
    }
  }, [isOpen]);

  // Reset selected char filter when validChars change
  useEffect(() => {
    setSelectedCharFilter(null);
  }, [validChars]);

  // Live dictionary suggestions fetch from backend API
  const fetchLiveSuggestions = async () => {
    const targetChar = searchFilter.trim() 
      ? searchFilter.trim()[0] 
      : (selectedCharFilter || validChars[0] || '');
    const dueums = searchFilter.trim() ? '' : validChars.slice(1).join(',');

    if (!targetChar) return;

    setIsLoadingLive(true);
    try {
      const res = await fetch(`/api/dictionary/suggest?char=${encodeURIComponent(targetChar)}&dueum=${encodeURIComponent(dueums)}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.words && Array.isArray(data.words)) {
          setLiveApiWords(data.words);
        }
      }
    } catch {
      // silently fail and rely on local database
    } finally {
      setIsLoadingLive(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;
    const targetChar = searchFilter.trim() 
      ? searchFilter.trim()[0] 
      : (selectedCharFilter || validChars[0] || '');
    const dueums = searchFilter.trim() ? '' : validChars.slice(1).join(',');

    if (!targetChar) return;

    setIsLoadingLive(true);
    fetch(`/api/dictionary/suggest?char=${encodeURIComponent(targetChar)}&dueum=${encodeURIComponent(dueums)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled && data?.words && Array.isArray(data.words)) {
          setLiveApiWords(data.words);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!isCancelled) setIsLoadingLive(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [validChars, selectedCharFilter, searchFilter]);

  // Combined master database
  const masterWordList = useMemo(() => {
    const seen = new Set<string>();
    const combined: DictionaryWord[] = [];

    const addWords = (list: DictionaryWord[]) => {
      for (const item of list) {
        if (item && item.word && item.word.length >= 2 && !seen.has(item.word)) {
          seen.add(item.word);
          combined.push(item);
        }
      }
    };

    addWords(liveApiWords);
    addWords(DICTIONARY_DATABASE);
    addWords(COMPREHENSIVE_KOREAN_WORDS);

    return combined;
  }, [liveApiWords]);

  // Compute recommended candidates
  const candidateWords = useMemo(() => {
    const targetChars = selectedCharFilter 
      ? [selectedCharFilter] 
      : (validChars && validChars.length > 0 ? validChars : []);

    const set = new Set<string>();
    const results: Array<{
      word: string;
      meaning?: string;
      pos?: string;
      length: number;
      isAttack: boolean;
      firstChar: string;
      lastChar: string;
    }> = [];

    const isSearchActive = searchFilter.trim().length > 0;
    const cleanSearch = searchFilter.trim().toLowerCase();

    for (const item of masterWordList) {
      const w = item.word;
      if (!w || w.length < 2 || usedWords.includes(w)) continue;

      if (isSearchActive) {
        // If user actively typed search query, search prefix or contains
        if (w.startsWith(cleanSearch) || w.includes(cleanSearch)) {
          if (!set.has(w)) {
            set.add(w);
            const lastCh = w[w.length - 1];
            results.push({
              word: w,
              meaning: item.meaning,
              pos: item.pos,
              length: w.length,
              isAttack: KILLER_ENDINGS.has(lastCh) || !!item.isAttack,
              firstChar: w[0],
              lastChar: lastCh,
            });
          }
        }
      } else {
        // Normal game turn: must start with target characters (or all if first turn)
        const matchChar = targetChars.length === 0 || targetChars.includes(w[0]);
        if (matchChar) {
          if (!set.has(w)) {
            set.add(w);
            const lastCh = w[w.length - 1];
            results.push({
              word: w,
              meaning: item.meaning,
              pos: item.pos,
              length: w.length,
              isAttack: KILLER_ENDINGS.has(lastCh) || !!item.isAttack,
              firstChar: w[0],
              lastChar: lastCh,
            });
          }
        }
      }
    }

    return results;
  }, [masterWordList, validChars, selectedCharFilter, searchFilter, usedWords]);

  // Filter & Sort candidates
  const processedWords = useMemo(() => {
    let list = candidateWords;

    // Length filter
    if (lengthFilter !== 'ALL') {
      if (lengthFilter >= 5) {
        list = list.filter((item) => item.length >= 5);
      } else {
        list = list.filter((item) => item.length === lengthFilter);
      }
    }

    // Sorting
    const sorted = [...list];
    if (sortMode === 'LONGEST') {
      sorted.sort((a, b) => b.length - a.length || (b.isAttack ? 1 : 0) - (a.isAttack ? 1 : 0) || a.word.localeCompare(b.word));
    } else if (sortMode === 'ATTACK') {
      sorted.sort((a, b) => (b.isAttack ? 1 : 0) - (a.isAttack ? 1 : 0) || b.length - a.length || a.word.localeCompare(b.word));
    } else if (sortMode === 'SHORTEST') {
      sorted.sort((a, b) => a.length - b.length || a.word.localeCompare(b.word));
    } else if (sortMode === 'ALPHABETICAL') {
      sorted.sort((a, b) => a.word.localeCompare(b.word));
    }

    return sorted;
  }, [candidateWords, lengthFilter, sortMode]);

  const handleWordClick = (word: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    sounds.playPop();
    onSelectWord(word, isMyTurn && autoSubmitEnabled);
  };

  const handleCopy = (word: string, e: React.MouseEvent) => {
    e.stopPropagation();
    sounds.playPop();
    navigator.clipboard.writeText(word);
    setCopiedWord(word);
    setTimeout(() => setCopiedWord(null), 1500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full bg-[#0d1117] border-2 border-emerald-500/80 rounded-2xl sm:rounded-3xl shadow-[0_0_25px_rgba(16,185,129,0.25)] p-3 sm:p-4 text-slate-100 flex flex-col gap-3 font-sans relative overflow-hidden"
      >
        {/* Hacker Matrix Ambient Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-emerald-900/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-pulse">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-black text-xs sm:text-sm text-emerald-400 tracking-wider">
                  HACK ENGINE [ㅂㅈㅁ]
                </span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[9px] border border-emerald-500/30">
                  ONLINE
                </span>
                {isLoadingLive && (
                  <Loader2 className="w-3 h-3 text-emerald-400 animate-spin" />
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                실시간 단어 추천 및 원클릭 치트 실행기
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={fetchLiveSuggestions}
              className="p-1 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors cursor-pointer"
              title="사전 단어 새로고침"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLive ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                sounds.playPop();
                onClose();
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Target Syllable & Auto-Submit Status Bar */}
        <div className="bg-[#161b22] border border-emerald-900/50 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <Crosshair className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-300 font-medium">시작 글자:</span>
            <div className="flex items-center gap-1 flex-wrap">
              {validChars && validChars.length > 0 ? (
                validChars.map((ch, idx) => {
                  const isSelected = selectedCharFilter === ch || (!selectedCharFilter && idx === 0);
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => {
                        sounds.playPop();
                        setSelectedCharFilter(ch);
                        setSearchFilter('');
                      }}
                      className={`px-2 py-0.5 rounded-md font-black text-xs font-mono transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.5)] scale-105'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      「{ch}」{idx > 0 && <span className="text-[9px] font-normal ml-0.5">(두음)</span>}
                    </button>
                  );
                })
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-slate-700 text-white font-bold text-xs">
                  자유 시작
                </span>
              )}
            </div>
            {lastWord && (
              <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                (상대 단어: <strong className="text-white">{lastWord}</strong>)
              </span>
            )}
          </div>

          {/* Auto-Submit Toggle Switch */}
          <button
            type="button"
            onClick={() => {
              sounds.playPop();
              setAutoSubmitEnabled((prev) => !prev);
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg font-mono text-[11px] transition-all cursor-pointer border ${
              autoSubmitEnabled
                ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="클릭 시 즉시 제출 여부 토글"
          >
            <Zap className={`w-3 h-3 ${autoSubmitEnabled ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>원클릭 전송: {autoSubmitEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Controls: Sorting Buttons & Length Filters */}
        <div className="flex flex-col gap-2">
          {/* Sorting Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" /> 정렬:
            </span>

            {/* Longest Words First (글자 긴 순) */}
            <button
              type="button"
              onClick={() => {
                sounds.playPop();
                setSortMode('LONGEST');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                sortMode === 'LONGEST'
                  ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>글자 긴 순 (고득점)</span>
            </button>

            {/* Attack Killer Words First (한방 단어) */}
            <button
              type="button"
              onClick={() => {
                sounds.playPop();
                setSortMode('ATTACK');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                sortMode === 'ATTACK'
                  ? 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Sword className="w-3 h-3" />
              <span>한방 킬러순</span>
            </button>

            {/* Shortest (스피드) */}
            <button
              type="button"
              onClick={() => {
                sounds.playPop();
                setSortMode('SHORTEST');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                sortMode === 'SHORTEST'
                  ? 'bg-emerald-500 text-black'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              짧은 순
            </button>

            {/* Alphabetical */}
            <button
              type="button"
              onClick={() => {
                sounds.playPop();
                setSortMode('ALPHABETICAL');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                sortMode === 'ALPHABETICAL'
                  ? 'bg-emerald-500 text-black'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              가나다순
            </button>
          </div>

          {/* Search + Length Filter row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="임의 단어/글자 실시간 검색..."
                className="w-full bg-[#161b22] border border-slate-700 rounded-lg pl-7 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Length pill tabs */}
            <div className="flex items-center gap-1 bg-[#161b22] p-0.5 rounded-lg border border-slate-800">
              {(['ALL', 5, 4, 3, 2] as const).map((len) => (
                <button
                  key={String(len)}
                  type="button"
                  onClick={() => {
                    sounds.playPop();
                    setLengthFilter(len);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                    lengthFilter === len
                      ? 'bg-emerald-500 text-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {len === 'ALL' ? '전체' : len === 5 ? '5자+' : `${len}자`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Word Recommendation Grid List */}
        <div className="flex-1 overflow-y-auto max-h-[300px] sm:max-h-[340px] space-y-1.5 pr-1 font-mono">
          {processedWords.length > 0 ? (
            processedWords.map((item) => (
              <motion.div
                key={item.word}
                whileHover={{ scale: 1.01, x: 2 }}
                onClick={(e) => handleWordClick(item.word, e)}
                className={`p-2 sm:p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer group ${
                  item.isAttack
                    ? 'bg-rose-950/30 border-rose-800/60 hover:border-rose-500 hover:bg-rose-950/60 shadow-[0_0_10px_rgba(244,63,94,0.15)]'
                    : 'bg-[#161b22] border-slate-800 hover:border-emerald-500 hover:bg-[#1f242c]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* Length Badge */}
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 ${
                      item.length >= 4
                        ? 'bg-emerald-500 text-black font-extrabold'
                        : item.length === 3
                        ? 'bg-slate-700 text-emerald-300'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.length}글자
                  </span>

                  {/* Word Text */}
                  <span className="font-black text-sm sm:text-base text-white tracking-wide truncate group-hover:text-emerald-300 transition-colors">
                    {item.word}
                  </span>

                  {/* Attack / Killer Badge */}
                  {item.isAttack && (
                    <span className="px-1.5 py-0.2 rounded bg-rose-500 text-white font-black text-[9px] shrink-0 flex items-center gap-0.5 animate-pulse">
                      <Sword className="w-2.5 h-2.5" />
                      <span>한방({item.lastChar})</span>
                    </span>
                  )}

                  {/* Meaning snippet on wider screens */}
                  {item.meaning && (
                    <span className="text-[10px] text-slate-400 truncate hidden md:inline font-sans">
                      - {item.meaning}
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleCopy(item.word, e)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                    title="단어 복사"
                  >
                    {copiedWord === item.word ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleWordClick(item.word, e)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 transition-all cursor-pointer shadow-xs ${
                      isMyTurn
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_8px_rgba(16,185,129,0.4)] active:scale-95'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {isMyTurn && autoSubmitEnabled ? (
                      <>
                        <Zap className="w-3 h-3" />
                        <span>전송</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3" />
                        <span>입력</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-6 text-slate-500 text-xs font-mono flex flex-col items-center gap-2">
              {isLoadingLive ? (
                <div className="flex items-center gap-2 text-emerald-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>국립국어원 표준국어대사전에서 실시간 검색 중...</span>
                </div>
              ) : (
                <>
                  <span>
                    현재 시작 글자(「{validChars.join('/')}」)에 매칭되는 미사용 추천 단어가 없습니다.
                  </span>
                  <button
                    type="button"
                    onClick={fetchLiveSuggestions}
                    className="px-3 py-1.5 bg-emerald-950 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs hover:bg-emerald-900 transition-colors"
                  >
                    🔄 사전에서 더 찾아보기
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="pt-2 border-t border-emerald-950 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>추천 단어: {processedWords.length}개 / 전체 DB: {candidateWords.length}개</span>
          <span className="text-emerald-400">⚡ 단어를 누르면 즉시 입력/전송됩니다</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
