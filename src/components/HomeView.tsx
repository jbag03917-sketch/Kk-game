import React from 'react';
import { motion } from 'motion/react';
import { Users, Search, HelpCircle, MessageCircle } from 'lucide-react';
import { UserStats } from '../types';
import { MascotAvatar } from './MascotAvatar';
import { sounds } from '../lib/soundEffects';

interface HomeViewProps {
  userStats: UserStats;
  onCreateRoom: () => void;
  onOpenPublicRooms: () => void;
  onOpenQuickJoin: () => void;
  onSelectTab: (tab: string) => void;
  onViewWordDetail?: (word: string) => void;
  onOpenNotices: () => void;
  onOpenRules: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  userStats,
  onSelectTab,
  onOpenNotices,
  onOpenRules,
}) => {
  return (
    <div className="relative w-full min-h-[640px] bg-white p-2 sm:p-4 flex flex-col justify-between select-none">
      {/* 1. MAIN LAYOUT: LEFT MENUS + ENLARGED CENTER CHARACTER MASCOT */}
      <div className="w-full flex-1 flex flex-col lg:flex-row items-center justify-between gap-8 my-auto relative z-10 py-6">
        {/* LEFT COLUMN: 3 Feature Buttons (순위전 제거됨) */}
        <div className="w-full lg:w-80 flex flex-col gap-4 z-20">
          {/* Menu 1: 친선전 */}
          <motion.button
            whileHover={{ scale: 1.03, x: 5 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              sounds.playPop();
              onSelectTab('GAME');
            }}
            className="w-full py-4.5 px-5 rounded-r-3xl rounded-l-2xl bg-gradient-to-r from-[#fef08a] via-[#fef9c3] to-[#fffbeb] text-[#713f12] font-black text-lg sm:text-xl flex items-center justify-between shadow-sm border border-amber-200 hover:shadow-md transition-all cursor-pointer text-left"
          >
            <div className="flex items-center gap-3.5">
              <Users className="w-6 h-6 text-[#713f12] stroke-[2.5]" />
              <span>친선전</span>
            </div>
            <span className="text-xs bg-amber-200/80 text-amber-900 px-2.5 py-1 rounded-full font-bold">
              자유 대결
            </span>
          </motion.button>

          {/* Menu 2: 낱말 사전 */}
          <motion.button
            whileHover={{ scale: 1.03, x: 5 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              sounds.playPop();
              onSelectTab('DICT');
            }}
            className="w-full py-4.5 px-5 rounded-r-3xl rounded-l-2xl bg-gradient-to-r from-[#f1f5f9] via-[#f8fafc] to-[#ffffff] text-[#1e293b] font-black text-lg sm:text-xl flex items-center justify-between shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer text-left"
          >
            <div className="flex items-center gap-3.5">
              <Search className="w-6 h-6 text-[#1e293b] stroke-[2.5]" />
              <span>낱말 사전</span>
            </div>
            <span className="text-xs bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full font-bold">
              50만 어휘
            </span>
          </motion.button>

          {/* Menu 3: 튜토리얼 */}
          <motion.button
            whileHover={{ scale: 1.03, x: 5 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              sounds.playPop();
              onOpenRules();
            }}
            className="w-full py-4.5 px-5 rounded-r-3xl rounded-l-2xl bg-gradient-to-r from-[#ccfbf1] via-[#e6fffa] to-[#f0fdf4] text-[#115e59] font-black text-lg sm:text-xl flex items-center justify-between shadow-sm border border-teal-100 hover:shadow-md transition-all cursor-pointer text-left"
          >
            <div className="flex items-center gap-3.5">
              <HelpCircle className="w-6 h-6 text-[#115e59] stroke-[2.5]" />
              <span>튜토리얼</span>
            </div>
            <span className="text-xs bg-teal-200/80 text-teal-900 px-2.5 py-1 rounded-full font-bold">
              규칙 안내
            </span>
          </motion.button>
        </div>

        {/* CENTER STAGE: Significantly Enlarged Character Mascot */}
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          {/* Animated Large Mascot in the middle */}
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            className="relative mb-6 flex flex-col items-center scale-125 sm:scale-140 md:scale-150 transform transition-transform"
          >
            <div className="p-2">
              <MascotAvatar
                color={userStats.avatarColor || 'yellow'}
                size="xl"
                expression="happy"
              />
            </div>
            {/* Soft subtle ground shadow */}
            <div className="w-28 h-3.5 bg-slate-200/70 rounded-full blur-[3px] mt-1" />
          </motion.div>

          {/* Nickname display */}
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2 mt-4">
            {userStats.nickname}
          </div>

          <p className="text-xs sm:text-sm text-slate-500 font-bold max-w-xs">
            원하는 게임 모드나 낱말 사전을 선택하여 바로 시작해보세요!
          </p>
        </div>
      </div>

      {/* 3. FOOTER INFO & CHAT ICON */}
      <div className="w-full flex items-center justify-between pt-4 border-t border-slate-100">
        <div className="text-[11px] text-slate-400 font-medium">
          국립국어원 표준국어대사전 연동
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono font-bold text-slate-400">
            v3.12.0
          </span>
          <button
            onClick={() => {
              sounds.playPop();
              onOpenNotices();
            }}
            className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="고객센터 / 피드백"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
