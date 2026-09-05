import React from 'react';
import { motion } from 'motion/react';
import { Play, Sparkles, User, ArrowRight } from 'lucide-react';
import { MascotAvatar } from './MascotAvatar';
import { sounds } from '../lib/soundEffects';

interface StartScreenProps {
  onStartGame: () => void;
  nickname: string;
  avatarColor: string;
}

// Background floating vocabulary words in subtle soft gray on white
const BACKGROUND_WORDS = [
  '자전거', '글리세롤', '놀부', '끄나풀', '로도피산맥',
  '투르크메니스탄', '자라투스트라는이렇게말했다', '온도계', '라그랑주',
  '인도말레이시아동물지리아계', '표준국어대사전', '끝잇기', '쿵쿵따',
  '두음법칙', '기러기', '스위스', '별빛', '코스모스', '단어장인'
];

export const StartScreen: React.FC<StartScreenProps> = ({
  onStartGame,
  nickname,
  avatarColor,
}) => {
  const handleStart = () => {
    sounds.playPop();
    onStartGame();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-gradient-to-b from-[#ffffff] via-[#f8fafd] to-[#eef2f8] flex flex-col justify-between select-none">
      {/* Background Floating Word Cloud (Soft light gray watermarks) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        {BACKGROUND_WORDS.map((w, idx) => {
          const topPercent = (idx * 17) % 85 + 5;
          const leftPercent = (idx * 23) % 80 + 5;
          const fontSize = idx % 3 === 0 ? 'text-2xl sm:text-4xl' : idx % 2 === 0 ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl';
          const opacity = idx % 4 === 0 ? 'opacity-80 text-slate-400' : 'opacity-40 text-slate-300';
          return (
            <span
              key={idx}
              style={{
                top: `${topPercent}%`,
                left: `${leftPercent}%`,
              }}
              className={`absolute font-black tracking-tight ${fontSize} ${opacity}`}
            >
              {w}
            </span>
          );
        })}
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-black text-xs sm:text-sm tracking-wider text-slate-700 bg-white shadow-xs px-3.5 py-1.5 rounded-full border border-slate-200">
            글자로 놀자! 끝잇기 온라인
          </span>
        </div>

        {/* Right Top User status pill */}
        <div className="flex items-center gap-2.5 bg-white shadow-xs px-3.5 py-1.5 rounded-full border border-slate-200 text-xs font-bold text-slate-700">
          <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
            <User className="w-3 h-3 text-slate-600" />
          </div>
          <span>{nickname}</span>
        </div>
      </header>

      {/* Center Stage: Title "끝잇기" + White Character Mascot + Start Button */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-xl mx-auto w-full text-center">
        {/* Subtitle */}
        <p className="text-slate-500 text-sm sm:text-base font-extrabold tracking-widest mb-1.5">
          실시간 단어 대결
        </p>

        {/* Korean Title "끝잇기" with modern high-contrast typography */}
        <h1 className="text-5xl sm:text-7xl font-black text-[#1e2022] tracking-tight mb-6 drop-shadow-xs flex items-center justify-center gap-2">
          끝잇기
        </h1>

        {/* White Mascot Character Centerpiece with floating animation */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          className="mb-6 relative flex flex-col items-center"
        >
          <div className="relative p-2">
            <MascotAvatar
              color="white"
              size="xl"
              expression="happy"
            />
          </div>
          {/* Soft Ground Shadow */}
          <div className="w-20 h-3 bg-slate-300/40 rounded-full blur-[2px] mt-1" />
        </motion.div>

        {/* Big Clean Styled "게임 시작!" Button */}
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleStart}
          className="relative group w-full max-w-md py-5 sm:py-6 px-8 rounded-3xl bg-[#1e2022] hover:bg-black text-white font-black text-2xl sm:text-3xl shadow-xl shadow-slate-900/15 cursor-pointer transition-all flex items-center justify-center gap-3 border-2 border-slate-700"
        >
          <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-[#1e2022]">
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </div>
          <span className="tracking-tight text-white drop-shadow-xs">게임 시작!</span>
        </motion.button>

        {/* Version info */}
        <div className="mt-6 text-slate-400 text-[11px] font-mono font-semibold">
          표준국어대사전 연동 • v3.12.0
        </div>
      </main>

      {/* Bottom Mascot Parade Ribbon with our White Character */}
      <footer className="relative z-10 w-full overflow-hidden flex flex-col items-center">
        {/* Bottom Mascot Line (White Mascots with cute expressions) */}
        <div className="w-full flex items-end justify-center gap-3 sm:gap-6 px-4 overflow-hidden pt-4">
          {[
            { color: 'white', exp: 'happy' },
            { color: 'white', exp: 'wink' },
            { color: 'white', exp: 'smile' },
            { color: 'white', exp: 'happy' },
            { color: 'white', exp: 'smile' },
            { color: 'white', exp: 'happy' },
            { color: 'white', exp: 'wink' },
            { color: 'white', exp: 'happy' },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2.2 + (idx % 3) * 0.4, repeat: Infinity, ease: 'easeInOut' }}
              className="relative -mb-3 shrink-0"
            >
              <MascotAvatar
                color="white"
                size="md"
                expression={item.exp as any}
              />
            </motion.div>
          ))}
        </div>

        {/* Bottom Legal / Policy bar */}
        <div className="w-full bg-white/90 backdrop-blur-md border-t border-slate-200/80 py-3 px-4 flex items-center justify-center gap-6 text-[11px] text-slate-500 font-medium z-20">
          <span>이용 약관</span>
          <span>운영 정책</span>
          <span>개인정보 처리방침</span>
          <span>국립국어원 표준국어대사전 Open API</span>
        </div>
      </footer>
    </div>
  );
};
