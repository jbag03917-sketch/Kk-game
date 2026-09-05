import React, { useState } from 'react';
import { X, Plus, Search, Users, KeyRound, Sparkles, ArrowRight, Globe } from 'lucide-react';
import { GameRoom } from '../types';
import { MascotAvatar } from './MascotAvatar';
import { sounds } from '../lib/soundEffects';

interface PublicRoomsModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicRooms: GameRoom[];
  onCreateRoom: (title: string, maxPlayers: number, isPublic: boolean, totalRounds?: number) => void;
  onJoinRoom: (roomId: string) => void;
  defaultHostName: string;
}

export const PublicRoomsModal: React.FC<PublicRoomsModalProps> = ({
  isOpen,
  onClose,
  publicRooms,
  onCreateRoom,
  onJoinRoom,
  defaultHostName,
}) => {
  const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE' | 'DIRECT'>('LIST');
  const [directCode, setDirectCode] = useState('');
  const [roomTitle, setRoomTitle] = useState(`${defaultHostName} 님의 방`);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [totalRounds, setTotalRounds] = useState(3);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredRooms = publicRooms.filter((r) =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.id.includes(searchQuery)
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomTitle.trim()) return;
    onCreateRoom(roomTitle.trim(), maxPlayers, true, totalRounds);
    sounds.playPop();
    onClose();
  };

  const handleDirectJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directCode.trim()) return;
    onJoinRoom(directCode.trim());
    sounds.playPop();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header with Tabs */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-purple-600" />
            <h2 className="font-extrabold text-base text-[#1e2022]">
              게임 방 목록 & 참가
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-100">
          <button
            onClick={() => setActiveTab('LIST')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all relative ${
              activeTab === 'LIST' ? 'text-purple-700' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            공개 방 목록
            {activeTab === 'LIST' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-700 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('CREATE')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all relative ${
              activeTab === 'CREATE' ? 'text-purple-700' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            방 만들기
            {activeTab === 'CREATE' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-700 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('DIRECT')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all relative ${
              activeTab === 'DIRECT' ? 'text-purple-700' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            코드로 직접 입장
            {activeTab === 'DIRECT' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-700 rounded-full" />
            )}
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'LIST' && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="방 이름 또는 6자리 코드 검색..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                />
              </div>

              {/* Room Cards List */}
              <div className="space-y-2.5">
                {filteredRooms.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    <p className="font-semibold mb-2">개설된 공개 방이 없습니다.</p>
                    <button
                      onClick={() => setActiveTab('CREATE')}
                      className="px-4 py-2 bg-purple-100 text-purple-700 font-bold rounded-xl hover:bg-purple-200 transition-colors"
                    >
                      내가 먼저 방 만들기
                    </button>
                  </div>
                ) : (
                  filteredRooms.map((r) => {
                    const isFull = r.currentPlayers.length >= r.maxPlayers;
                    const isPlaying = r.status === 'PLAYING';

                    return (
                      <div
                        key={r.id}
                        className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-purple-300 transition-all flex items-center justify-between shadow-2xs"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-extrabold text-sm text-[#1e2022]">
                              {r.title}
                            </span>
                            <span className="px-2 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px] font-mono">
                              #{r.id}
                            </span>
                            {isPlaying ? (
                              <span className="px-2 py-0.2 bg-amber-100 text-amber-700 rounded text-[10px] font-bold">
                                게임 중
                              </span>
                            ) : (
                              <span className="px-2 py-0.2 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold">
                                대기 중
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                            <span>방장: {r.hostName}</span>
                            <span>•</span>
                            <span>
                              인원: {r.currentPlayers.length} / {r.maxPlayers}명
                            </span>
                          </div>
                        </div>

                        <button
                          disabled={isFull || isPlaying}
                          onClick={() => {
                            onJoinRoom(r.id);
                            sounds.playPop();
                            onClose();
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors ${
                            isFull || isPlaying
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-[#1e2022] hover:bg-black text-white cursor-pointer'
                          }`}
                        >
                          <span>{isFull ? '만원' : isPlaying ? '진행 중' : '입장하기'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'CREATE' && (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  방 제목
                </label>
                <input
                  type="text"
                  maxLength={20}
                  value={roomTitle}
                  onChange={(e) => setRoomTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                  placeholder="방 제목을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  최대 인원 설정 (2~8명)
                </label>
                <div className="flex items-center gap-2">
                  {[2, 4, 6, 8].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setMaxPlayers(count)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
                        maxPlayers === count
                          ? 'bg-[#1e2022] text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {count}명
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  총 라운드 수 (3라운드 / 5라운드)
                </label>
                <div className="flex items-center gap-2">
                  {[3, 5].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setTotalRounds(count)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
                        totalRounds === count
                          ? 'bg-purple-700 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {count} 라운드
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>방 생성 및 대기실 입장</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'DIRECT' && (
            <form onSubmit={handleDirectJoin} className="space-y-4 text-center py-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto mb-2">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-sm text-[#1e2022]">
                방 코드 4자리 숫자 입력
              </h3>
              <p className="text-xs text-slate-500">
                친구에게 전달받은 4자리 숫자 방 코드를 입력하면 즉시 참여합니다.
              </p>

              <input
                type="text"
                maxLength={6}
                value={directCode}
                onChange={(e) => setDirectCode(e.target.value.trim())}
                placeholder="예: 7421"
                className="w-48 mx-auto px-4 py-3 text-center text-xl font-mono font-black tracking-widest rounded-xl border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 uppercase block"
              />

              <button
                type="submit"
                disabled={directCode.length < 3}
                className="w-full py-3 bg-[#1e2022] hover:bg-black disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                방 입장하기
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
