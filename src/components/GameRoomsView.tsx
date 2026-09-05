import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Users, Plus, RefreshCw, Lock, ChevronDown
} from 'lucide-react';
import { GameRoom, UserStats } from '../types';
import { sounds } from '../lib/soundEffects';

interface GameRoomsViewProps {
  publicRooms: GameRoom[];
  userStats: UserStats;
  onRefreshRooms: () => void;
  isRefreshing: boolean;
  onCreateRoom: (title: string, maxPlayers: number, isPublic: boolean, totalRounds?: number) => void;
  onJoinRoom: (roomId: string) => void;
  onClose?: () => void;
}

export const GameRoomsView: React.FC<GameRoomsViewProps> = ({
  publicRooms,
  userStats,
  onRefreshRooms,
  isRefreshing,
  onCreateRoom,
  onJoinRoom,
  onClose,
}) => {
  // Filter state
  const [selectedGameType, setSelectedGameType] = useState('ALL');

  // Direct code join
  const [directCode, setDirectCode] = useState('');

  // Create Room Modal state (기본 3라운드)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [roomTitle, setRoomTitle] = useState(`${userStats.nickname} 님의 방`);
  const [roomGameMode, setRoomGameMode] = useState('한국어 끝말잇기');
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [totalRounds, setTotalRounds] = useState(3);
  const [isPublic, setIsPublic] = useState(true);

  // Filtered rooms
  const filteredRooms = publicRooms;

  const handleDirectJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = directCode.trim();
    if (!code) return;
    sounds.playPop();
    onJoinRoom(code);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomTitle.trim()) return;
    sounds.playPop();
    onCreateRoom(roomTitle.trim(), maxPlayers, isPublic, totalRounds);
    setIsCreateModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-xs select-none">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* 1. TOP HEADER BANNER (흑백 모노톤 헤더 + 닫기 X 버튼) */}
        <div className="bg-white px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-black tracking-tight">
                친선전
              </h2>
              <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
                원하는 유형의 게임을 자유롭게 즐겨요.
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-semibold sm:hidden block mt-0.5">
              원하는 유형의 게임을 자유롭게 즐겨요.
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

        {/* 2. ACTION BAR (흑백 모노톤 액션 바: 게임유형 + 방번호 + 입장 + 방만들기) */}
        <div className="bg-slate-50 px-4 sm:px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* Left: 게임 유형 드롭다운 */}
          <div className="flex items-center gap-2">
            <span className="text-slate-700 font-bold text-xs">게임 유형</span>
            <div className="relative">
              <select
                value={selectedGameType}
                onChange={(e) => setSelectedGameType(e.target.value)}
                className="appearance-none bg-white border border-slate-300 rounded-xl pl-3 pr-7 py-1.5 text-xs font-bold text-black focus:outline-none focus:ring-1 focus:ring-black cursor-pointer shadow-2xs"
              >
                <option value="ALL">전체  {filteredRooms.length} / {publicRooms.length}</option>
                <option value="KKEUTITGI">한국어 끝말잇기</option>
                <option value="KUNGKUNGTA">한국어 쿵쿵따</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Right Side: [ 방 번호 입력 ] [ 입장 ] [ 방 만들기 ] */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Direct Code Input Form */}
            <form onSubmit={handleDirectJoinSubmit} className="flex items-center gap-1.5">
              <input
                type="text"
                maxLength={6}
                value={directCode}
                onChange={(e) => setDirectCode(e.target.value.trim().toUpperCase())}
                placeholder="방 번호 입력"
                className="w-28 px-3 py-1.5 text-xs text-center font-mono font-bold uppercase rounded-xl border border-slate-300 bg-white text-black focus:outline-none focus:ring-1 focus:ring-black shadow-2xs"
              />
              <button
                type="submit"
                disabled={directCode.length < 4}
                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-black font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
              >
                입장
              </button>
            </form>

            {/* Black "방 만들기" Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                sounds.playPop();
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-1.5 bg-black hover:bg-slate-800 text-white font-black text-xs sm:text-sm rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-all border border-slate-800"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>방 만들기</span>
            </motion.button>
          </div>
        </div>

        {/* 3. ROOMS TABLE LIST */}
        <div className="p-3 sm:p-5 flex flex-col gap-2 flex-1 overflow-y-auto bg-slate-50/50">
          {filteredRooms.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-2.5 text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-slate-400" />
              </div>
              <div className="font-extrabold text-sm text-black">현재 대기 중인 친선 방이 없습니다.</div>
              <div className="text-xs text-slate-500">
                우측 상단의 <strong className="text-black">[방 만들기]</strong> 버튼을 눌러 첫 번째 방을 개설해보세요!
              </div>
            </div>
          ) : (
            filteredRooms.map((room) => {
              const currentCount = room.currentPlayers?.length || 1;
              const isFull = currentCount >= room.maxPlayers;
              const isPlaying = room.status === 'PLAYING';

              return (
                <motion.div
                  key={room.id}
                  whileHover={{ scale: 1.005, y: -1 }}
                  onClick={() => {
                    if (!isFull && !isPlaying) {
                      sounds.playPop();
                      onJoinRoom(room.id);
                    }
                  }}
                  className={`w-full px-4 py-3 rounded-2xl border flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 text-xs transition-all ${
                    isPlaying
                      ? 'bg-slate-100/70 border-slate-200 opacity-80 cursor-not-allowed'
                      : isFull
                      ? 'bg-slate-100/70 border-slate-200 opacity-70 cursor-not-allowed'
                      : 'bg-white hover:bg-slate-100 border-slate-200 hover:border-black shadow-2xs hover:shadow-xs cursor-pointer'
                  }`}
                >
                  {/* Left: Room Number + Status + Title */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Room ID */}
                    <span className="font-mono font-black text-sm text-black tracking-wider shrink-0 w-16">
                      {room.id}
                    </span>

                    {/* Status Badge */}
                    {isPlaying ? (
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[11px] font-bold shrink-0">
                        진행 중
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-black bg-slate-200 px-2 py-0.5 rounded-full shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                        대기 중
                      </span>
                    )}

                    {/* Room Title */}
                    <span className="font-extrabold text-xs sm:text-sm text-black truncate">
                      {room.title}
                    </span>

                    {/* Mode Badge */}
                    <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300 text-[11px] font-extrabold shrink-0">
                      한국어 끝말잇기
                    </span>
                    
                    {!room.isPublic && (
                      <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                  </div>

                  {/* Right: Rounds/Time + Player Count */}
                  <div className="flex items-center gap-4 text-xs shrink-0 ml-auto text-slate-600 font-semibold">
                    <span className="text-slate-500 hidden sm:inline">
                      {room.totalRounds || 3} 라운드 / 120초
                    </span>

                    {/* Players Count */}
                    <div className="flex items-center gap-1 font-bold text-black">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span className={currentCount >= room.maxPlayers ? 'text-rose-600' : 'text-black font-extrabold'}>
                        {currentCount}
                      </span>
                      <span className="text-slate-400">/ {room.maxPlayers}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* 4. FOOTER STATUS BAR */}
        <div className="bg-white px-5 sm:px-6 py-2.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-black" />
            <span>실시간 동기화 활성화</span>
          </div>
          <button
            onClick={() => {
              sounds.playPop();
              onRefreshRooms();
            }}
            disabled={isRefreshing}
            className="flex items-center gap-1 text-slate-600 hover:text-black font-bold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-black' : ''}`} />
            <span>새로고침</span>
          </button>
        </div>

        {/* 5. CREATE ROOM POPUP MODAL (완전 흑백 디자인 & 기본 3라운드) */}
        <AnimatePresence>
          {isCreateModalOpen && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-300 overflow-hidden"
              >
                {/* Modal Header */}
                <div className="bg-white px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-base font-black text-black">
                    친선전 새 방 만들기
                  </h3>
                  <button
                    onClick={() => setIsCreateModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-black transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Form (모노톤 흑백) */}
                <form onSubmit={handleCreateSubmit} className="p-5 flex flex-col gap-4 text-xs font-semibold">
                  {/* Title */}
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">방 이름</label>
                    <input
                      type="text"
                      required
                      maxLength={30}
                      value={roomTitle}
                      onChange={(e) => setRoomTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 text-black focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>

                  {/* Game Mode */}
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">게임 모드</label>
                    <select
                      value={roomGameMode}
                      onChange={(e) => setRoomGameMode(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-black focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      <option value="한국어 끝말잇기">한국어 끝말잇기 (표준국어대사전)</option>
                      <option value="한국어 쿵쿵따">한국어 쿵쿵따 (3글자 고정)</option>
                    </select>
                  </div>

                  {/* Max Players & Rounds (기본 라운드 3라운드) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-800 font-bold mb-1">최대 인원</label>
                      <select
                        value={maxPlayers}
                        onChange={(e) => setMaxPlayers(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-black focus:ring-2 focus:ring-black"
                      >
                        <option value={2}>2명 (1:1 결투)</option>
                        <option value={4}>4명</option>
                        <option value={6}>6명</option>
                        <option value={8}>8명 (풀방)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-800 font-bold mb-1">라운드 수</label>
                      <select
                        value={totalRounds}
                        onChange={(e) => setTotalRounds(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-black focus:ring-2 focus:ring-black"
                      >
                        <option value={3}>3 라운드 (기본)</option>
                        <option value={4}>4 라운드</option>
                        <option value={5}>5 라운드</option>
                        <option value={10}>10 라운드</option>
                      </select>
                    </div>
                  </div>

                  {/* Public / Private */}
                  <div className="flex items-center gap-3 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={isPublic}
                        onChange={() => setIsPublic(true)}
                        className="text-black focus:ring-black"
                      />
                      <span className="text-black font-bold">공개 방</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!isPublic}
                        onChange={() => setIsPublic(false)}
                        className="text-black focus:ring-black"
                      />
                      <span className="text-black font-bold">비공개 방 (코드 입장)</span>
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 font-bold cursor-pointer"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl text-white bg-black hover:bg-slate-800 font-black shadow-sm cursor-pointer"
                    >
                      방 생성하기
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
