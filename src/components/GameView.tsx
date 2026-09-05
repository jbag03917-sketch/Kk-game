import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, MessageCircle, AlertCircle, CheckCircle2, XCircle, BookOpen, Volume2, VolumeX, ShieldAlert, Sparkles, LogOut, Music } from 'lucide-react';
import { GameRoom, Player, ChatMessage, WordChainItem } from '../types';
import { MascotAvatar } from './MascotAvatar';
import { validateWordRules, getValidStartingChars } from '../lib/hangulRules';
import { checkWordInDictionary, prefetchWordInDictionary, DICTIONARY_DATABASE } from '../lib/dictionaryData';
import { calculateWordScore } from '../lib/scoreCalculator';
import { sounds } from '../lib/soundEffects';

interface GameViewProps {
  room: GameRoom;
  currentPlayerId: string;
  chatMessages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onSubmitWord: (word: string, isDueum: boolean, matchedChar: string, definition?: string, pos?: string) => void;
  onPlayerTimeout: (playerId: string) => void;
  onLeaveRoom: () => void;
}

export const GameView: React.FC<GameViewProps> = ({
  room,
  currentPlayerId,
  chatMessages,
  onSendMessage,
  onSubmitWord,
  onPlayerTimeout,
  onLeaveRoom,
}) => {
  const [inputText, setInputText] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const [latestChatToast, setLatestChatToast] = useState<{ id: string; sender: string; text: string } | null>(null);
  const lastChatCountRef = useRef<number>(chatMessages.length);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Incoming chat message notification toast (5 seconds auto dismiss, placed under room code)
  useEffect(() => {
    if (chatMessages.length > lastChatCountRef.current) {
      const latest = chatMessages[chatMessages.length - 1];
      if (latest && latest.senderId !== currentPlayerId) {
        setLatestChatToast({
          id: latest.id,
          sender: latest.senderName,
          text: latest.text,
        });

        if (toastTimerRef.current) {
          clearTimeout(toastTimerRef.current);
        }
        toastTimerRef.current = setTimeout(() => {
          setLatestChatToast(null);
        }, 5000);
      }
    }
    lastChatCountRef.current = chatMessages.length;

    // Scroll ONLY the internal chat container without moving the browser viewport/window
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
    }
  }, [chatMessages, currentPlayerId]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Dynamic Turn Duration: Starts at 15.0s, reduces by 0.4s per word in chain, min 5.0s
  const currentChainLength = room.wordChain ? room.wordChain.length : 0;
  const maxTurnDuration = Math.max(5.0, Number((15.0 - currentChainLength * 0.4).toFixed(1)));

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState<number>(maxTurnDuration);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef<boolean>(false);
  const isComposingRef = useRef<boolean>(false);

  // Active player identification
  const activePlayer = room.currentPlayers[room.currentTurnIndex];
  const isMyTurn = activePlayer?.id === currentPlayerId && activePlayer?.isAlive;

  // Start game BGM on mount
  useEffect(() => {
    sounds.startBGM('game');
  }, []);

  // 0.5초(500ms) 주기 실시간 백그라운드 사전 프리패치
  // 타자를 계속 치는 중이라도 0.5초마다 현재 입력값을 실시간으로 조회하여 캐시해두므로
  // 사용자가 전송을 누르는 순간 지연(0ms) 없이 즉시 전송됩니다.
  useEffect(() => {
    const checkAndPrefetch = () => {
      const liveVal = (inputRef.current?.value || inputText).trim();
      if (liveVal.length >= 2) {
        prefetchWordInDictionary(liveVal);
      }
    };

    // 즉시 1회 사전 조회
    checkAndPrefetch();

    // 타자를 치는 동안 0.5초(500ms)마다 주기적으로 실시간 사전 조회
    const intervalId = setInterval(checkAndPrefetch, 500);
    return () => clearInterval(intervalId);
  }, [inputText]);

  // Auto focus input on my turn
  useEffect(() => {
    if (isMyTurn) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isMyTurn, room.currentTurnIndex]);

  // Automated bot turn logic (Host executes for bot players)
  useEffect(() => {
    if (!activePlayer || !activePlayer.id.startsWith('bot_') || !activePlayer.isAlive) {
      return;
    }
    // Only host triggers bot turn to avoid duplicate submissions
    if (room.hostId !== currentPlayerId) {
      return;
    }

    const botDelay = Math.max(1000, Math.min(maxTurnDuration * 0.45 * 1000, 2800));
    const botTimer = setTimeout(() => {
      const lastChar = room.lastWord
        ? room.lastWord[room.lastWord.length - 1]
        : room.starterChar || null;
      const validChars = lastChar ? getValidStartingChars(lastChar) : [];

      let candidate: any = null;
      if (!lastChar) {
        const starters = DICTIONARY_DATABASE.filter((w) => w.word.length >= 2);
        candidate = starters[Math.floor(Math.random() * starters.length)];
      } else {
        const available = DICTIONARY_DATABASE.filter(
          (w) =>
            w.word.length >= 2 &&
            validChars.includes(w.word[0]) &&
            !room.usedWords.includes(w.word)
        );
        if (available.length > 0) {
          candidate = available[Math.floor(Math.random() * available.length)];
        } else {
          // If no dictionary match found in static database, generate a valid Hangul word
          const endings = ['박', '수', '도', '기', '과', '원', '문', '리', '화', '산', '물'];
          const randEnd = endings[Math.floor(Math.random() * endings.length)];
          candidate = {
            word: `${validChars[0]}${randEnd}`,
            meaning: '국립국어원 표준어',
            pos: '명사',
          };
        }
      }

      if (candidate) {
        const ruleRes = validateWordRules(candidate.word, room.lastWord, room.usedWords);
        if (ruleRes.valid) {
          sounds.playCorrect();
          onSubmitWord(
            candidate.word,
            ruleRes.isDueum ?? false,
            ruleRes.matchedChar ?? candidate.word[0],
            candidate.meaning,
            candidate.pos
          );
        }
      }
    }, botDelay);

    return () => clearTimeout(botTimer);
  }, [room.currentTurnIndex, activePlayer?.id, room.hostId, currentPlayerId, maxTurnDuration]);

  // Turn Countdown Timer (Dynamic 15.0s -> 5.0s with 0.4s decrement per turn)
  useEffect(() => {
    setTimeLeft(maxTurnDuration);
    setValidationError(null);

    if (timerRef.current) clearInterval(timerRef.current);

    const startTime = Date.now();
    const durationMs = maxTurnDuration * 1000;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, (durationMs - elapsed) / 1000);
      setTimeLeft(remaining);

      // Play tick sound when urgent (<= 2.5s or <= 30% time)
      if (remaining <= Math.min(2.5, maxTurnDuration * 0.3) && remaining > 0) {
        sounds.playTick(true);
      }

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        if (activePlayer && activePlayer.isAlive && (isMyTurn || room.hostId === currentPlayerId)) {
          sounds.playWrong();
          onPlayerTimeout(activePlayer.id);
        }
      }
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [room.currentTurnIndex, activePlayer?.id, currentChainLength, maxTurnDuration]);

  // Unified immediate word submission logic (Resolves Korean IME Enter & Mobile Double-click issues)
  const processSubmit = async (wordToSubmit?: string) => {
    const rawWord = typeof wordToSubmit === 'string' ? wordToSubmit : (inputRef.current?.value || inputText);
    const trimmed = rawWord.trim();
    if (!isMyTurn || isSubmittingRef.current || !trimmed) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setValidationError(null);

    try {
      // 1. Rule & Hangul & Dueum validation
      const ruleRes = validateWordRules(trimmed, room.lastWord, room.usedWords);
      if (!ruleRes.valid) {
        sounds.playWrong();
        setValidationError(ruleRes.reason || '규칙에 맞지 않는 단어입니다.');
        return;
      }

      // 2. Dictionary existence check
      const dictRes = await checkWordInDictionary(trimmed);
      if (!dictRes.isValid) {
        sounds.playWrong();
        setValidationError('사전에 등재되지 않은 단어입니다.');
        return;
      }

      // Success!
      sounds.playCorrect();
      onSubmitWord(
        trimmed,
        ruleRes.isDueum ?? false,
        ruleRes.matchedChar ?? trimmed[0],
        dictRes.wordInfo?.meaning,
        dictRes.wordInfo?.pos
      );

      setInputText('');
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processSubmit();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const currentVal = (e.currentTarget.value || inputText).trim();
      if (currentVal) {
        processSubmit(currentVal);
      }
    }
  };

  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    onSendMessage(text);
    setChatInput('');
  };

  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  };

  // Calculate valid starting characters for display
  const lastChar = room.lastWord
    ? room.lastWord[room.lastWord.length - 1]
    : room.starterChar || null;
  const validChars = lastChar ? getValidStartingChars(lastChar) : [];
  const hasDueum = validChars.length > 1;

  // Find current alive leader with highest score
  const maxScore = Math.max(...room.currentPlayers.map((p) => p.score));
  const leaderPlayerId =
    maxScore > 0 ? room.currentPlayers.find((p) => p.score === maxScore && p.isAlive)?.id : null;

  // Format 6-digit electronic score display (cyan for positive, red for negative with leading dimmed zeros)
  const renderLcdScore = (score: number) => {
    const isNegative = score < 0;
    const absScore = Math.abs(score);
    const totalDigits = 6;
    const scoreStr = absScore.toString();
    const leadingZerosCount = Math.max(
      0,
      (isNegative ? totalDigits - 1 : totalDigits) - scoreStr.length
    );
    const leadingZeros = '0'.repeat(leadingZerosCount);

    return (
      <div
        className={`inline-flex items-center justify-center font-mono font-black text-xs sm:text-sm px-2 py-0.5 rounded-lg border tracking-widest ${
          isNegative
            ? 'bg-[#150a0a] border-rose-900/60 shadow-inner'
            : 'bg-[#0a1515] border-cyan-900/60 shadow-inner'
        }`}
      >
        {isNegative && <span className="text-rose-500 font-bold mr-0.5">-</span>}
        <span className={isNegative ? 'text-rose-950 font-bold' : 'text-cyan-950 font-bold'}>
          {leadingZeros}
        </span>
        <span className={isNegative ? 'text-rose-400 font-black' : 'text-cyan-300 font-black'}>
          {scoreStr}
        </span>
      </div>
    );
  };

  // Last word item definition for sidebar
  const lastWordItem = room.wordChain[room.wordChain.length - 1];

  // In-game sound & BGM state
  const [isSoundMuted, setIsSoundMuted] = useState(sounds.getIsMuted());
  const [isBgmOn, setIsBgmOn] = useState(sounds.getIsBgmEnabled());

  const toggleSound = () => {
    const next = !isSoundMuted;
    setIsSoundMuted(next);
    sounds.setMuted(next);
  };

  const toggleBgm = () => {
    const next = sounds.toggleBGM();
    setIsBgmOn(next);
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-5 max-w-6xl mx-auto w-full">
      {/* Top In-Game Bar (Replaces global header during active gameplay for full focus) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs px-3 sm:px-5 py-2 sm:py-3 flex items-center justify-between gap-2 relative">
        {/* Left info: Room Code & Round with Floating Message Toast */}
        <div className="relative flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200/80 px-2 sm:px-2.5 py-1 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
            <span className="font-mono font-black text-sm sm:text-base text-purple-950 tracking-wider">
              {room.id}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-[#1e2022] text-white font-black text-[11px] sm:text-xs">
            {room.round}/{room.totalRounds || 3}R
          </span>
          <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              생존 {room.currentPlayers.filter((p) => p.isAlive).length}/{room.currentPlayers.length}
            </span>
          </div>

          {/* Small In-Game Chat Notification Toast (Directly under Room Code, truncated, 5s auto-dismiss) */}
          <AnimatePresence>
            {latestChatToast && (
              <motion.div
                key={latestChatToast.id}
                initial={{ opacity: 0, y: -4, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full left-0 mt-2 z-50 flex items-center gap-1.5 bg-[#1e2022]/95 text-white text-[11px] px-2.5 py-1.5 rounded-xl shadow-lg border border-slate-700/80 backdrop-blur-xs max-w-[210px] sm:max-w-[280px]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-ping" />
                <span className="font-extrabold text-amber-300 shrink-0 max-w-[60px] sm:max-w-[70px] truncate">
                  {latestChatToast.sender}:
                </span>
                <span className="truncate text-slate-100 font-medium flex-1">
                  {latestChatToast.text}
                </span>
                <button
                  type="button"
                  onClick={() => setLatestChatToast(null)}
                  className="text-slate-400 hover:text-white p-0.5 ml-0.5 shrink-0 cursor-pointer text-[10px]"
                >
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Center: Round History Boxes (hidden on very small screens, visible on sm+) */}
        <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 mr-1">제시어:</span>
          {(room.roundHistoryWords || [room.starterChar || '수', '?', '?']).map((char, idx) => (
            <div
              key={idx}
              className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs ${
                idx + 1 === room.round
                  ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-500 shadow-xs scale-105'
                  : char !== '?'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'bg-white text-slate-400 border border-slate-200'
              }`}
            >
              {char}
            </div>
          ))}
        </div>

        {/* Right action controls: Sound, Chat, Leave Room */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title={isSoundMuted ? '효과음 켜기' : '효과음 음소거'}
          >
            {isSoundMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-slate-700" />}
          </button>

          {/* Live Chat & Word Dict Toggle */}
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={`p-2 rounded-xl transition-colors relative cursor-pointer ${
              chatOpen
                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title={chatOpen ? '사전 & 채팅 접기' : '사전 & 채팅 열기'}
          >
            <MessageCircle className="w-4 h-4" />
            {chatMessages.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </button>

          {/* Exit Game / Leave Room */}
          <button
            onClick={() => {
              sounds.playPop();
              onLeaveRoom();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200/80 text-rose-700 font-bold text-xs transition-colors cursor-pointer"
            title="방 나가기"
          >
            <LogOut className="w-4 h-4" />
            <span>나가기</span>
          </button>
        </div>
      </div>

      {/* Main Arena Layout: Center Stage + History Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Left 3 cols: Main Game Stage */}
        <div className="lg:col-span-3 flex flex-col gap-3 sm:gap-4">
          {/* Word Board (Center Box - Bright White & Light Gray Modern Board) */}
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-b from-white via-slate-50 to-slate-100 border-2 sm:border-3 border-slate-300 shadow-md p-4 sm:p-6 flex flex-col items-center justify-center min-h-[160px] sm:min-h-[210px]">
            {/* Corner Decorative Dots */}
            <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-slate-300" />
            <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-slate-300" />
            <div className="absolute bottom-3 left-3 w-2 h-2 rounded-full bg-slate-300" />
            <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-slate-300" />

            {/* Word Chain Trace (Previous Words without score tags) */}
            <div className="flex items-center gap-1.5 mb-2 overflow-x-auto max-w-full pb-1 no-scrollbar px-2">
              {room.wordChain.length === 0 ? (
                <span className="text-[11px] sm:text-xs text-slate-400 font-semibold">
                  첫 단어를 입력하여 끝말잇기를 시작하세요!
                </span>
              ) : (
                room.wordChain.slice(-4).map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-1 shrink-0">
                    <span className="px-2.5 py-1 rounded-xl bg-white text-slate-800 text-xs font-bold border border-slate-200 shadow-2xs whitespace-nowrap">
                      {item.word}
                    </span>
                    {idx < Math.min(room.wordChain.length - 1, 3) && (
                      <span className="text-slate-400 text-xs font-black shrink-0">→</span>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Big Current Required Character Display (e.g. 「래」 or 「회」) in Crisp Black */}
            <div className="my-1 sm:my-2 flex flex-col items-center justify-center text-center">
              {lastChar ? (
                <motion.div
                  key={lastChar}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                  className="text-5xl sm:text-6xl md:text-7xl font-black text-slate-900 tracking-normal leading-none select-none drop-shadow-xs"
                >
                  {lastChar}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight leading-snug select-none text-center"
                >
                  첫 단어 시작
                </motion.div>
              )}

              {/* Dueum Badges */}
              {hasDueum && (
                <motion.div
                  initial={{ y: 5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="mt-2 px-3 py-1 rounded-full bg-slate-800 text-white font-extrabold text-[10px] sm:text-xs shadow-xs flex items-center gap-1 whitespace-nowrap"
                >
                  <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
                  <span>두음법칙: 「{validChars.join(' / ')}」 가능</span>
                </motion.div>
              )}
            </div>

            {/* Dynamic Countdown Progress Bar */}
            <div className="w-full max-w-md mt-2 sm:mt-3">
              <div className="flex justify-between items-center text-[10px] sm:text-xs font-extrabold mb-1">
                <span className={`flex items-center gap-1 transition-colors ${timeLeft <= Math.min(2.5, maxTurnDuration * 0.3) ? 'text-rose-600 animate-pulse' : 'text-slate-600'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${timeLeft <= Math.min(2.5, maxTurnDuration * 0.3) ? 'bg-rose-500 animate-ping' : 'bg-slate-700'}`} />
                  남은 시간 <span className="text-[9px] text-slate-400 font-normal">({maxTurnDuration.toFixed(1)}s)</span>
                </span>
                <span className={`font-mono text-xs sm:text-sm font-black ${timeLeft <= Math.min(2.5, maxTurnDuration * 0.3) ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
                  {timeLeft.toFixed(1)}s
                </span>
              </div>
              <div className="w-full h-2.5 sm:h-3 bg-slate-200 rounded-full overflow-hidden p-0.5 border border-slate-300">
                <div
                  className={`h-full rounded-full transition-all duration-100 ${
                    timeLeft <= Math.min(2.5, maxTurnDuration * 0.3)
                      ? 'bg-rose-500 shadow-sm'
                      : 'bg-slate-800'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, (timeLeft / maxTurnDuration) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Player Pedestals Stage (Balanced Responsive Grid on Mobile & Flex on Desktop) */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-2.5 sm:p-4 w-full">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:flex md:items-end md:justify-center gap-2 sm:gap-3 w-full">
              {room.currentPlayers.map((player) => {
                const isActive = player.id === activePlayer?.id;
                const isMe = player.id === currentPlayerId;

                return (
                  <div
                    key={player.id}
                    className="flex flex-col items-center relative w-full md:w-auto md:flex-1 md:max-w-[130px]"
                  >
                    {/* Floating Dropping Penalty Score Banner on Elimination */}
                    <AnimatePresence>
                      {!player.isAlive && (
                        <motion.div
                          initial={{ y: -20, opacity: 0, scale: 1.3 }}
                          animate={{
                            y: [0, 4, 2],
                            opacity: [1, 1, 0.95],
                            rotate: [0, -6, 6, 0],
                          }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.7, ease: 'easeOut' }}
                          className="absolute -top-6 left-1/2 -translate-x-1/2 z-30 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-rose-600 to-red-600 text-white font-black text-[9px] shadow-lg flex items-center gap-0.5 whitespace-nowrap ring-2 ring-white"
                        >
                          <span>-100pt</span>
                          <span>💤</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Speech Bubble / Latest Word */}
                    {player.wordsUsed.length > 0 && player.isAlive && (
                      <div className="mb-1 px-2 py-0.5 rounded-xl bg-[#1e2022] text-white text-[10px] font-bold shadow-md max-w-full truncate text-center relative animate-in fade-in zoom-in-90 duration-150">
                        {player.wordsUsed[player.wordsUsed.length - 1]}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#1e2022] rotate-45" />
                      </div>
                    )}

                    {/* Pedestal Top Spotlight on Active Player */}
                    {isActive && player.isAlive && (
                      <motion.div
                        layoutId="activePedestal"
                        className="absolute -top-2 w-12 sm:w-16 h-2.5 sm:h-3 bg-gradient-to-r from-amber-300 to-yellow-400 rounded-full blur-xs shadow-lg"
                      />
                    )}

                    {/* Mascot Avatar with Sleeping state */}
                    <div className="relative mb-1 sm:mb-2">
                      <MascotAvatar
                        color={player.avatarColor}
                        size="sm"
                        isHost={player.isHost}
                        isAlive={player.isAlive}
                        isActiveTurn={isActive}
                        expression={player.isAlive ? (isActive ? 'happy' : 'smile') : 'sleeping'}
                      />
                    </div>

                    {/* Pedestal Stand (Podium with LCD score & status) */}
                    <div
                      className={`w-full rounded-xl sm:rounded-2xl p-1.5 sm:p-2 text-center transition-all relative ${
                        isActive && player.isAlive
                          ? 'bg-gradient-to-b from-indigo-50 to-purple-100 border-2 border-purple-400 shadow-md ring-2 ring-purple-300/50'
                          : !player.isAlive
                          ? 'bg-slate-100/90 border border-slate-200 opacity-75'
                          : 'bg-slate-50 border border-slate-200'
                      }`}
                    >
                      {/* Leader Badge */}
                      {player.id === leaderPlayerId && player.isAlive && (
                        <div className="absolute -top-2 right-1 px-1 py-0.2 rounded-full bg-amber-500 text-amber-950 font-black text-[8px] shadow-xs flex items-center gap-0.5 border border-amber-300">
                          <span>👑</span>
                        </div>
                      )}

                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            player.isAlive ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <span className="font-extrabold text-[11px] sm:text-xs text-[#1e2022] truncate max-w-[65px] sm:max-w-[85px]">
                          {player.nickname}
                        </span>
                        {isMe && (
                          <span className="text-[8px] font-black text-purple-700 bg-purple-100 px-0.5 rounded shrink-0">
                            나
                          </span>
                        )}
                      </div>

                      {/* 6-digit LCD Score Badge */}
                      <div className="my-0.5 flex justify-center scale-90 sm:scale-100 origin-center">
                        {renderLcdScore(player.score)}
                      </div>

                      {/* Sleeping / Elimination status */}
                      {!player.isAlive && (
                        <div className="text-[8px] font-bold text-indigo-600 truncate mt-0.5 flex items-center justify-center gap-0.5">
                          <span>Zzz 탈락</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Typing Input Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-2.5 sm:p-4 flex flex-col gap-2">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onInput={(e) => {
                    const val = (e.target as HTMLInputElement).value;
                    if (val && val.trim().length >= 2) {
                      prefetchWordInDictionary(val.trim());
                    }
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    setInputText(val);
                    if (validationError) setValidationError(null);
                    const cleanVal = val.trim();
                    if (cleanVal.length >= 2) {
                      prefetchWordInDictionary(cleanVal);
                    }
                  }}
                  onKeyDown={handleInputKeyDown}
                  onCompositionStart={() => {
                    isComposingRef.current = true;
                  }}
                  onCompositionUpdate={(e) => {
                    const val = (e.target as HTMLInputElement).value;
                    if (val && val.trim().length >= 2) {
                      prefetchWordInDictionary(val.trim());
                    }
                  }}
                  onCompositionEnd={(e) => {
                    isComposingRef.current = false;
                    const val = e.currentTarget.value || inputText;
                    if (val) {
                      setInputText(val);
                      const cleanVal = val.trim();
                      if (cleanVal.length >= 2) {
                        prefetchWordInDictionary(cleanVal);
                      }
                    }
                  }}
                  disabled={!isMyTurn}
                  placeholder={
                    isMyTurn
                      ? lastChar
                        ? `「${validChars.join('/')}」 시작 단어 입력`
                        : '첫 단어를 입력하세요 (2글자 이상)'
                      : `${activePlayer?.nickname || '상대'} 차례 대기 중...`
                  }
                  className={`w-full px-3.5 py-3 sm:px-4 sm:py-3 rounded-xl border text-base font-bold transition-all focus:outline-none ${
                    isMyTurn
                      ? 'bg-white border-purple-400 focus:ring-4 focus:ring-purple-200/60 shadow-inner text-[#1e2022]'
                      : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                />
              </div>

              <button
                type="submit"
                onMouseDown={(e) => {
                  e.preventDefault(); // Keep input focused and avoid mobile virtual keyboard dismiss before click
                }}
                onClick={(e) => {
                  e.preventDefault();
                  const val = (inputRef.current?.value || inputText).trim();
                  if (val) {
                    processSubmit(val);
                  }
                }}
                disabled={!isMyTurn || isSubmitting || !inputText.trim()}
                className={`px-4 sm:px-8 py-3 rounded-xl font-black text-sm sm:text-base transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 min-w-[72px] sm:min-w-[90px] ${
                  isMyTurn && inputText.trim()
                    ? 'bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 text-white shadow-md active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>전송</span>
              </button>
            </form>

            {/* Validation Feedback Banner */}
            {validationError && (
              <motion.div
                initial={{ y: -5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex items-center gap-2 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3.5 py-2 rounded-xl"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{validationError}</span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Right 1 col: Word Definition & Live Chat */}
        <div className={`flex flex-col gap-3 sm:gap-4 ${chatOpen ? 'flex' : 'hidden lg:flex'}`}>
          {/* Latest Word Dictionary Card (Image 3 right widget) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 mb-3">
              <BookOpen className="w-4 h-4 text-purple-600" />
              <h3 className="font-bold text-sm text-[#1e2022]">방금 나온 단어</h3>
            </div>

            {lastWordItem ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xl text-purple-800">
                    {lastWordItem.word}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold text-[10px]">
                    {lastWordItem.pos || '명사'}
                  </span>
                </div>

                <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {lastWordItem.definition || '표준국어대사전 및 우리말샘 등재 어휘.'}
                </p>

                <div className="text-[11px] text-slate-400 font-semibold flex justify-between pt-1">
                  <span>입력: {lastWordItem.playerName}</span>
                  {lastWordItem.isDueum && (
                    <span className="text-purple-600 font-bold">두음법칙 적용</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 text-center py-6">
                첫 번째 단어를 입력하면<br />사전 정보가 표시됩니다.
              </div>
            )}
          </div>

          {/* In-Game Live Chat Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col h-[280px] max-h-[300px] overflow-hidden">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-2 shrink-0">
              <MessageCircle className="w-4 h-4 text-slate-600" />
              <h4 className="font-bold text-xs text-[#1e2022]">실시간 채팅</h4>
            </div>

            <div ref={chatScrollContainerRef} className="flex-1 overflow-y-auto space-y-2 text-xs pr-1 min-h-0">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.senderId === currentPlayerId ? 'items-end' : 'items-start'
                  }`}
                >
                  <span className="text-[9px] text-slate-400 font-semibold">
                    {msg.senderName}
                  </span>
                  <div
                    className={`px-2.5 py-1 rounded-lg max-w-[90%] text-xs break-words ${
                      msg.senderId === currentPlayerId
                        ? 'bg-[#1e2022] text-white'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChat} className="pt-2 border-t border-slate-100 flex gap-1.5 mt-2 shrink-0">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyDown}
                placeholder="채팅..."
                className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <button
                type="submit"
                onMouseDown={(e) => e.preventDefault()}
                className="p-1.5 bg-[#1e2022] text-white rounded-lg hover:bg-black transition-colors"
              >
                <Send className="w-3 h-3" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
