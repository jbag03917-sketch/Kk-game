import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Search, X, BookOpen, Loader2, RotateCw, Sparkles, ChevronDown } from 'lucide-react';
import { DictionaryWord } from '../types';
import { fetchDictionarySearchResults, exploreDictionaryWords } from '../lib/dictionaryData';
import { getValidStartingChars } from '../lib/hangulRules';
import { sounds } from '../lib/soundEffects';

interface DictionaryViewProps {
  initialSearch?: string;
  onClose?: () => void;
}

const CHOSEONG_LIST = ['전체', 'ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

export const DictionaryView: React.FC<DictionaryViewProps> = ({ 
  initialSearch = '',
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedChoseong, setSelectedChoseong] = useState<string>('전체');
  const [words, setWords] = useState<DictionaryWord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedWord, setSelectedWord] = useState<DictionaryWord | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const latestRequestIdRef = useRef<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomObserverRef = useRef<HTMLDivElement>(null);

  // 1. Initial / Fresh Search or Choseong Filter Load
  const loadWords = useCallback(
    async (
      query: string,
      choseong: string,
      targetPage: number = 1,
      isRefresh: boolean = false
    ) => {
      const trimmed = query.trim();

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const requestId = ++latestRequestIdRef.current;
      setIsSearching(true);
      if (targetPage === 1) {
        setPage(1);
        setHasMore(true);
      }

      try {
        if (!trimmed) {
          // Explore by Choseong / Seed with pagination
          const res = await exploreDictionaryWords(targetPage, '', choseong, controller.signal);
          if (requestId === latestRequestIdRef.current) {
            setWords(res.words);
            setHasMore(res.hasMore);
            setSelectedWord(res.words[0] || null);
          }
          return;
        }

        // Direct STDict query search
        const res = await fetchDictionarySearchResults(trimmed, controller.signal);
        if (requestId !== latestRequestIdRef.current) return;

        if (res.found && res.items.length > 0) {
          const sorted = [...res.items].sort((a, b) => {
            if (a.word === trimmed && b.word !== trimmed) return -1;
            if (b.word === trimmed && a.word !== trimmed) return 1;
            return 0;
          });
          setWords(sorted);
          setHasMore(false); // Direct search results are complete
          setSelectedWord(sorted[0] || null);
        } else {
          // Fallback explore for query prefix
          const exploreRes = await exploreDictionaryWords(targetPage, trimmed, choseong, controller.signal);
          if (requestId !== latestRequestIdRef.current) return;

          setWords(exploreRes.words);
          setHasMore(exploreRes.hasMore);
          setSelectedWord(exploreRes.words[0] || null);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError' && requestId === latestRequestIdRef.current) {
          console.error('Dictionary load error:', err);
          setWords([]);
        }
      } finally {
        if (requestId === latestRequestIdRef.current) {
          setIsSearching(false);
        }
      }
    },
    []
  );

  // 2. Load More (Infinite Scroll Handler)
  const loadMoreWords = useCallback(async () => {
    if (isSearching || isLoadingMore || !hasMore) return;

    const nextPage = page + 1;
    setIsLoadingMore(true);

    try {
      const res = await exploreDictionaryWords(nextPage, searchQuery.trim(), selectedChoseong);
      if (res.words && res.words.length > 0) {
        setWords((prev) => {
          const seen = new Set(prev.map((w) => w.word));
          const newItems = res.words.filter((w) => !seen.has(w.word));
          return [...prev, ...newItems];
        });
        setPage(nextPage);
        setHasMore(res.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error loading more dictionary words:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isSearching, isLoadingMore, hasMore, page, searchQuery, selectedChoseong]);

  // Initial load
  useEffect(() => {
    loadWords(initialSearch, '전체', 1);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [initialSearch, loadWords]);

  // Search input typing handler
  useEffect(() => {
    const trimmed = searchQuery.trim();
    const timer = setTimeout(() => {
      loadWords(trimmed, selectedChoseong, 1);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedChoseong, loadWords]);

  // Infinite Scroll IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isSearching && !isLoadingMore) {
          loadMoreWords();
        }
      },
      { threshold: 0.2 }
    );

    const target = bottomObserverRef.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [loadMoreWords, hasMore, isSearching, isLoadingMore]);

  // Handle Manual Scroll Event (Fallback for Infinite Scroll)
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (
      target.scrollTop + target.clientHeight >= target.scrollHeight - 100 &&
      hasMore &&
      !isSearching &&
      !isLoadingMore
    ) {
      loadMoreWords();
    }
  };

  // Handle Refresh Button (새로고침 - 새 단어 무작위 탐색)
  const handleRefresh = () => {
    sounds.playPop();
    // Randomize initial seed page to bring completely new words
    const randomSeedPage = Math.floor(Math.random() * 8) + 1;
    setSearchQuery('');
    loadWords('', selectedChoseong, randomSeedPage, true);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle Choseong Tab Click
  const handleChoseongClick = (ch: string) => {
    sounds.playPop();
    setSelectedChoseong(ch);
    setSearchQuery('');
    loadWords('', ch, 1);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playPop();
    loadWords(searchQuery.trim(), selectedChoseong, 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs select-none">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[92vh] h-[850px]"
      >
        {/* 1. TOP HEADER BANNER (헤더 + 새로고침 버튼 + 닫기 X 버튼) */}
        <div className="bg-white px-4 sm:px-6 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center text-white shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-black tracking-tight">
                  낱말 사전
                </h2>
                <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
                  국립국어원 표준국어대사전 실시간 단어 탐색
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-semibold sm:hidden block">
                스크롤하면 단어가 계속 이어져요
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh Button (새로고침) */}
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer active:scale-95"
              title="새로운 단어로 새로고침"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isSearching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">새로고침</span>
            </button>

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
        </div>

        {/* 2. SEARCH BAR & CHOSEONG TABS */}
        <div className="bg-slate-50 px-4 sm:px-6 py-3 border-b border-slate-200 shrink-0 space-y-2.5">
          {/* Search Bar */}
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
                  loadWords('', selectedChoseong, 1);
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

          {/* Korean Choseong Alphabet Tabs (ㄱ ㄴ ㄷ ㄹ ㅁ ㅂ ㅅ ㅇ ㅈ ㅊ ㅋ ㅌ ㅍ ㅎ) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] font-black text-slate-400 shrink-0 mr-1 flex items-center gap-0.5">
              <Sparkles className="w-3 h-3 text-slate-500" />
              초성:
            </span>
            {CHOSEONG_LIST.map((ch) => {
              const isActive = selectedChoseong === ch;
              return (
                <button
                  key={ch}
                  type="button"
                  onClick={() => handleChoseongClick(ch)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-black text-white shadow-xs scale-105'
                      : 'bg-white text-slate-600 hover:text-black hover:bg-slate-200/80 border border-slate-200'
                  }`}
                >
                  {ch}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. WORD LIST (스크롤 시 단어가 계속 이어지는 무한 스크롤 컨테이너) */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="p-4 sm:p-5 flex-1 overflow-y-auto bg-slate-50/50"
        >
          {isSearching && words.length === 0 ? (
            <div className="py-28 text-center flex flex-col items-center justify-center gap-2.5 text-slate-800">
              <Loader2 className="w-8 h-8 animate-spin text-black" />
              <span className="text-xs sm:text-sm font-bold text-slate-700">
                국립국어원 표준국어대사전에서 단어를 불러오는 중입니다...
              </span>
            </div>
          ) : words.length === 0 ? (
            <div className="py-24 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-slate-400" />
              </div>
              <div className="font-extrabold text-sm text-slate-800">검색된 단어가 없습니다.</div>
              <div className="text-xs text-slate-400">
                다른 초성이나 검색어로 탐색해보세요.
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                className="mt-2 px-4 py-2 bg-black text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors"
              >
                전체 단어 새로고침
              </button>
            </div>
          ) : (
            <div className="space-y-4">
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
                      {/* Top Row: Word + Badges */}
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

                          {item.origin && item.origin !== '표준어' && (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-500 font-semibold text-[9px] border border-slate-200">
                              {item.origin}
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

              {/* Bottom Infinite Scroll Observer & Load More Indicator */}
              <div ref={bottomObserverRef} className="py-4 flex flex-col items-center justify-center gap-2">
                {isLoadingMore && (
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>단어를 계속 불러오는 중입니다...</span>
                  </div>
                )}

                {hasMore && !isLoadingMore && (
                  <button
                    type="button"
                    onClick={loadMoreWords}
                    className="px-5 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-black font-bold text-xs rounded-2xl transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 active:scale-95"
                  >
                    <span>단어 더 불러오기 (+20)</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                )}

                {!hasMore && words.length > 0 && (
                  <div className="text-[11px] font-semibold text-slate-400 py-2">
                    해당 조건의 모든 단어를 확인했습니다.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 4. FOOTER STATUS BAR */}
        <div className="bg-white px-4 sm:px-6 py-2.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>국립국어원 표준국어대사전 실시간 무한 탐색 연동</span>
          </div>
          <div className="font-bold text-black flex items-center gap-2">
            <span>초성: {selectedChoseong}</span>
            <span>·</span>
            <span>표시된 단어: {words.length}개</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
