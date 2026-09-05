import React from 'react';
import { Home, Gamepad2, BookOpen, Clock, Settings } from 'lucide-react';
import { UserStats } from '../types';
import { MascotAvatar } from './MascotAvatar';
import { sounds } from '../lib/soundEffects';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  userStats: UserStats;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  userStats,
}) => {
  const menuItems = [
    { id: 'HOME', label: '홈', icon: Home },
    { id: 'GAME', label: '게임', icon: Gamepad2 },
    { id: 'DICT', label: '단어 사전', icon: BookOpen },
    { id: 'MY', label: '내 기록', icon: Clock },
    { id: 'SETTINGS', label: '설정', icon: Settings },
  ];

  return (
    <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-4">
      {/* Mobile Top Navigation Pills (Visible on mobile/tablet, hidden on desktop) */}
      <div className="lg:hidden bg-white rounded-2xl border border-slate-200/90 shadow-xs p-1.5 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                sounds.playPop();
                onSelectTab(item.id);
              }}
              className={`flex-1 min-w-[62px] py-2 px-2 rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-[#1e2022] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? 'text-amber-300' : 'text-slate-500'}`} />
              <span className="text-[11px] sm:text-xs">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Desktop Profile Card (Hidden on mobile, visible on lg+) */}
      <div className="hidden lg:flex bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex-col items-center">
        {/* Mascot Avatar Preview */}
        <div className="mb-3">
          <MascotAvatar
            color={userStats.avatarColor}
            size="lg"
            expression="happy"
          />
        </div>

        {/* Name */}
        <h3 className="font-extrabold text-lg text-[#1e2022] tracking-tight mb-3">
          {userStats.nickname}
        </h3>

        {/* Game Record Summary */}
        <div className="w-full border-t border-slate-100 pt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold px-1">
            <span className="text-slate-500">승리 횟수</span>
            <span className="text-purple-700 font-extrabold">{userStats.wins}회</span>
          </div>
          <div className="flex items-center justify-between text-xs font-bold px-1">
            <span className="text-slate-500">승률</span>
            <span className="text-indigo-700 font-extrabold">{userStats.winRate}%</span>
          </div>
          <div className="flex items-center justify-between text-xs font-bold px-1">
            <span className="text-slate-500">최고 연승</span>
            <span className="text-emerald-600 font-extrabold">{userStats.maxStreak}연승</span>
          </div>
        </div>
      </div>

      {/* Desktop Menu List (Hidden on mobile, visible on lg+) */}
      <div className="hidden lg:flex bg-white rounded-2xl border border-slate-200/90 shadow-xs p-2 flex-col gap-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                sounds.playPop();
                onSelectTab(item.id);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                active
                  ? 'bg-[#1e2022] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
