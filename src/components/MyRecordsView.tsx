import React from 'react';
import { Clock, Trophy, Flame, Target, Award, BookOpen, RotateCcw } from 'lucide-react';
import { UserStats } from '../types';
import { MascotAvatar } from './MascotAvatar';

interface MyRecordsViewProps {
  userStats: UserStats;
  onSelectTab: (tab: string) => void;
}

export const MyRecordsView: React.FC<MyRecordsViewProps> = ({ userStats, onSelectTab }) => {
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header Profile Summary */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
        <MascotAvatar color={userStats.avatarColor} size="xl" />
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
            <h1 className="font-black text-2xl text-[#1e2022]">
              {userStats.nickname}
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mb-4">
            끝잇기에서 기록한 개인 전적 및 사용한 단어 히스토리입니다.
          </p>

          {/* Quick Stat Badges */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs font-bold">
            <span className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700">
              총 게임: {userStats.totalGames}전 {userStats.wins}승
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700">
              최고 연승: {userStats.maxStreak}연승 🔥
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700">
              최고 순위: {userStats.highestRank}위
            </span>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 text-center">
          <div className="text-xs text-slate-400 font-semibold mb-1">총 게임 수</div>
          <div className="font-mono font-black text-2xl text-[#1e2022]">{userStats.totalGames}</div>
          <div className="text-[10px] text-slate-400">경기</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 text-center">
          <div className="text-xs text-slate-400 font-semibold mb-1">승리 횟수</div>
          <div className="font-mono font-black text-2xl text-purple-700">{userStats.wins}</div>
          <div className="text-[10px] text-slate-400">회 우승</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 text-center">
          <div className="text-xs text-slate-400 font-semibold mb-1">승률</div>
          <div className="font-mono font-black text-2xl text-indigo-700">{userStats.winRate}%</div>
          <div className="text-[10px] text-slate-400">승률</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 text-center">
          <div className="text-xs text-slate-400 font-semibold mb-1">현재 연승</div>
          <div className="font-mono font-black text-2xl text-emerald-600">{userStats.currentStreak}</div>
          <div className="text-[10px] text-slate-400">연승 중</div>
        </div>
      </div>

      {/* Used Words History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-600" />
            <h3 className="font-extrabold text-base text-[#1e2022]">내가 사용한 단어 기록</h3>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            총 {userStats.wordsHistory.length}개 단어
          </span>
        </div>

        {userStats.wordsHistory.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs font-medium">
            아직 게임에서 사용한 단어가 없습니다.<br />
            게임을 플레이하여 단어 기록을 쌓아보세요!
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {userStats.wordsHistory.map((item) => (
              <div
                key={item.word}
                className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between"
              >
                <span className="font-extrabold text-xs text-[#1e2022]">{item.word}</span>
                <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-1.5 py-0.5 rounded">
                  {item.count}회
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
