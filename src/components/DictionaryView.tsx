import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Search, X, BookOpen, Loader2 } from 'lucide-react';
import { DictionaryWord } from '../types';
import { fetchDictionarySearchResults, exploreDictionaryWords } from '../lib/dictionaryData';
import { getValidStartingChars } from '../lib/hangulRules';
import { sounds } from '../lib/soundEffects';

interface DictionaryViewProps {
  initialSearch?: string;
  onClose?: () => void;
}

export const DictionaryView: React.FC<DictionaryViewProps> = ({ 
  initialSearch = '',
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [words, setWords] = useState<DictionaryWord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedWord, setSelectedWord] = useState<DictionaryWord | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const latestRequestIdRef = useRef<number>(0);
  const currentQueryRef = useRef<string>(initialSearch);

  // Execute Search Function
  const executeSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    currentQueryRef.current = trimmed;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const requestId = ++latestRequestIdRef.current;
    setIsSearching(true);

    try {
      if (!trimmed) {
        const res = await exploreDictionaryWords(1, '', controller.signal);
        if (requestId === latestRequestIdRef.current && res.words.length > 0) {
          setWords(res.words);
          setSelectedWord(res.words[0] || null);
        }
        return;
      }

      // Direct STDict search
      const res = await fetchDictionarySearchResults(trimmed, controller.signal);
      if (requestId !== latestRequestIdRef.current) return;

      if (res.found && res.items.length > 0) {
        const sorted = [...res.items].sort((a, b) => {
          if (a.word === trimmed && b.word !== trimmed) return -1;
          if (b.word === trimmed && a.word !== trimmed) return 1;
          return 0;
        });
        setWords(sorted);
        setSelectedWord(sorted[0] || null);
      } else {
        const exploreRes = await exploreDictionaryWords(1, trimmed, controller.signal);
        if (requestId !== latestRequestIdRef.current) return;

        if (exploreRes.words.length > 0) {
          setWords(exploreRes.words);
          setSelectedWord(exploreRes.words[0] || null);
        } else {
          setWords([]);
          setSelectedWord(null);
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError' && requestId === latestRequestIdRef.current) {
        console.error('STDict API search error:', err);
        setWords([]);
      }
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsSearching(false);
      }
    }
  }, []);

  // Initial load
  useEffect(() => {
    executeSearch(initialSearch);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [initialSearch, executeSearch]);

  // Debounced typing search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed === currentQueryRef.current) return;

    const timer = setTimeout(() => {
      executeSearch(trimmed);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, executeSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playPop();
    executeSearch(searchQuery.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-xs select-none">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* 1. TOP HEADER BANNER (모노톤 흰색/검은색 헤더 + 닫기 X 버튼) */}
        <div className="bg-white px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-black tracking-tight">
                낱말 사전
              </h2>
              <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
                국립국어원 표준국어대사전 단어를 검색하고 뜻을 확인해요.
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-semibold sm:hidden block mt-0.5">
              국립국어원 표준국어대사전 실시간 연동
            </span>
          </div>

          {/* Close Button (X) */}
          {onClose && (
            <button
              onClick={() => {
                sounds.playPop();
                onClose();
              }}
              className="p-1.5 rounded-xl text-slate-600 hover:text-black hover:bg-slate-100 transition-colors cursor-pointer"
              title="닫기"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          )}
        </div>

        {/* 2. SEARCH BAR (모노톤 검색창) */}
        <div className="bg-slate-50 px-5 sm:px-6 py-3 border-b border-slate-200 shrink-0">
          <form onSubmit={handleSubmit} className="w-full relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="검색할 단어를 입력하세요 (예: 나비, 하늘, 리튬, 자전거)..."
              className="w-full pl-10 pr-24 py-2.5 text-xs sm:text-sm font-semibold rounded-2xl border border-slate-300 bg-white text-black focus:outline-none focus:ring-2 focus:ring-black shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  executeSearch('');
                }}
                className="absolute right-14 text-slate-400 hover:text-black p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1.5 px-4 py-1.5 bg-black hover:bg-slate-800 text-white font-black text-xs sm:text-sm rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              검색
            </button>
          </form>
        </div>

        {/* 3. WORD LIST (한 줄에 2개씩 모노톤 직사각형 카드 그리드 배치 - 점수 뱃지 제거) */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto bg-slate-50/50">
          {isSearching ? (
            <div className="py-24 text-center flex flex-col items-center justify-center gap-2.5 text-slate-800">
              <Loader2 className="w-8 h-8 animate-spin text-black" />
              <span className="text-xs sm:text-sm font-bold text-slate-700">
                국립국어원 표준국어대사전에서 단어를 검색하고 있습니다...
              </span>
            </div>
          ) : words.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-2.5 text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-slate-400" />
              </div>
              <div className="font-extrabold text-sm text-slate-800">검색된 단어가 없습니다.</div>
              <div className="text-xs text-slate-400">
                다른 단어로 검색해보세요.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {words.map((item, idx) => {
                const lastChar = item.word.slice(-1);
                const nextStarters = getValidStartingChars(lastChar);
                const isSelected = selectedWord?.word === item.word;

                return (
                  <motion.div
                    key={`${item.word}-${idx}`}
                    whileHover={{ scale: 1.01, y: -1 }}
                    onClick={() => {
                      sounds.playPop();
                      setSelectedWord(isSelected ? null : item);
                    }}
                    className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col justify-between gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-100 border-black shadow-sm ring-1 ring-black'
                        : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-400 shadow-2xs'
                    }`}
                  >
                    {/* Top Row: Word + Badges (점수 뱃지 제거) */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-base sm:text-lg text-black tracking-tight">
                          {item.word}
                        </span>

                        {item.pos && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px] border border-slate-300">
                            {item.pos}
                          </span>
                        )}
                      </div>

                      {/* Next Starters */}
                      <div className="flex items-center gap-1 text-[11px] text-slate-600 shrink-0 font-bold">
                        <span>다음:</span>
                        {nextStarters.slice(0, 2).map((char) => (
                          <span key={char} className="px-1.5 py-0.5 rounded-md bg-slate-200 text-black font-black">
                            {char}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Definition Text */}
                    <div className="text-slate-700 text-xs leading-relaxed line-clamp-2 pl-2 border-l-2 border-slate-300">
                      {item.meaning || '국립국어원 표준국어대사전에 등재된 공식 단어입니다.'}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. FOOTER STATUS BAR */}
        <div className="bg-white px-5 sm:px-6 py-2.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-black" />
            <span>국립국어원 표준국어대사전 50만 어휘 연동</span>
          </div>
          <div className="font-bold text-black">
            검색 결과: {words.length}개
          </div>
        </div>
      </motion.div>
    </div>
  );
};
