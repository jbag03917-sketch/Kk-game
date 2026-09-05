import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Play, Copy, Share2, LogOut, MessageCircle, Send, QrCode, UserPlus, Sparkles, Shield, User } from 'lucide-react';
import { GameRoom, Player, ChatMessage } from '../types';
import { MascotAvatar } from './MascotAvatar';
import { sounds } from '../lib/soundEffects';

interface LobbyViewProps {
  room: GameRoom;
  currentPlayerId: string;
  chatMessages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onToggleReady: () => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onAddTestPlayer: () => void;
  onChangeColor: (color: string) => void;
  onOpenShareModal: () => void;
  onChangeTotalRounds?: (rounds: number) => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  room,
  currentPlayerId,
  chatMessages,
  onSendMessage,
  onToggleReady,
  onStartGame,
  onLeaveRoom,
  onAddTestPlayer,
  onChangeColor,
  onOpenShareModal,
  onChangeTotalRounds,
}) => {
  const [chatInput, setChatInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Ensure current user information is always populated and never empty
  const me: Player = room.currentPlayers.find((p) => p.id === currentPlayerId) || {
    id: currentPlayerId,
    nickname: '나',
    avatarColor: 'white',
    isHost: room.hostId === currentPlayerId,
    isReady: room.hostId === currentPlayerId,
    isAlive: true,
    score: 0,
    wordsUsed: [],
    level: 1,
  };

  const isHost = me.isHost || room.hostId === currentPlayerId;

  // Ensure current player is guaranteed to be in display players
  const displayPlayers: Player[] = room.currentPlayers.some((p) => p.id === currentPlayerId)
    ? room.currentPlayers
    : [...room.currentPlayers, me];

  const canStart = displayPlayers.length >= 2;

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim());
    setChatInput('');
    sounds.playPop();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.id);
    setCopiedCode(true);
    sounds.playPop();
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Color options
  const colorOptions = [
    { id: 'yellow', bg: 'bg-amber-300' },
    { id: 'white', bg: 'bg-slate-100 border border-slate-300' },
    { id: 'mint', bg: 'bg-emerald-300' },
    { id: 'pink', bg: 'bg-pink-300' },
    { id: 'purple', bg: 'bg-purple-300' },
    { id: 'blue', bg: 'bg-blue-300' },
    { id: 'orange', bg: 'bg-orange-300' },
  ];

  // 8 slots array populated from displayPlayers
  const totalSlots = 8;
  const slots: (Player | null)[] = Array(totalSlots).fill(null);
  displayPlayers.forEach((p, idx) => {
    if (idx < totalSlots) {
      slots[idx] = p;
    }
  });

  return (
    <div className="flex flex-col gap-4 sm:gap-6 max-w-6xl mx-auto w-full">
      {/* Top Header Bar (Image 2 style) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-5 flex flex-wrap items-center justify-between gap-2.5">
        {/* Room Info */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-purple-50 px-2 sm:px-3 py-1 rounded-xl border border-purple-200/80">
            <span className="font-mono font-black text-xl sm:text-2xl tracking-wider text-purple-950">
              {room.id}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-1 hover:bg-purple-100 rounded-lg text-purple-700 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
              title="방 코드 복사"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{copiedCode ? '복사됨!' : '복사'}</span>
            </button>
          </div>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <h2 className="font-extrabold text-sm sm:text-base text-slate-800 truncate max-w-[140px] sm:max-w-xs">
            {room.title}
          </h2>
          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold text-[11px] sm:text-xs">
            끝말잇기
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Add Test Player / Bot */}
          {isHost && room.currentPlayers.length < room.maxPlayers && (
            <button
              onClick={onAddTestPlayer}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              title="테스트 플레이어 추가"
            >
              <UserPlus className="w-4 h-4 text-purple-600" />
              <span className="hidden sm:inline">봇 추가</span>
            </button>
          )}

          {/* QR / Invite Share */}
          <button
            onClick={onOpenShareModal}
            className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-slate-600" />
            <span>초대</span>
          </button>

          {/* Leave Room */}
          <button
            onClick={() => {
              sounds.playPop();
              onLeaveRoom();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200/80 text-rose-700 font-bold text-xs transition-colors cursor-pointer"
            title="방 나가기"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            <span>나가기</span>
          </button>
        </div>
      </div>

      {/* Control Banner: Color picker, Round settings & Start Button */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3.5 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
        {/* Left: Color selector & Round config */}
        <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3 sm:gap-5">
          {/* Color selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 mr-0.5">색상:</span>
            <div className="flex items-center gap-1">
              {colorOptions.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onChangeColor(c.id);
                    sounds.playPop();
                  }}
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md ${c.bg} transition-transform cursor-pointer ${
                    me?.avatarColor === c.id ? 'scale-120 ring-2 ring-purple-600' : 'hover:scale-110'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Round Selector (3라운드 / 5라운드) */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">라운드:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 sm:p-1 rounded-xl">
              {[3, 5].map((rounds) => {
                const currentTotal = room.totalRounds || 3;
                const isSelected = currentTotal === rounds;
                return (
                  <button
                    key={rounds}
                    type="button"
                    disabled={!isHost}
                    onClick={() => {
                      if (isHost && onChangeTotalRounds) {
                        sounds.playPop();
                        onChangeTotalRounds(rounds);
                      }
                    }}
                    className={`px-2.5 sm:px-3 py-1 text-xs font-black rounded-lg transition-all ${
                      isSelected
                        ? 'bg-purple-700 text-white shadow-xs'
                        : isHost
                        ? 'text-slate-600 hover:bg-slate-200 cursor-pointer'
                        : 'text-slate-400 cursor-default'
                    }`}
                  >
                    {rounds}R
                  </button>
                );
              })}
            </div>
            {!isHost && (
              <span className="text-[10px] text-slate-400 font-semibold">(방장 설정)</span>
            )}
          </div>
        </div>

        {/* Center/Right: Start / Ready button */}
        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
          <span className="text-xs font-bold text-slate-500">
            인원: <span className="text-purple-700 font-extrabold">{room.currentPlayers.length}</span>/{room.maxPlayers}명
          </span>

          {isHost ? (
            <button
              disabled={!canStart}
              onClick={() => {
                if (canStart) {
                  sounds.playPop();
                  onStartGame();
                }
              }}
              className={`flex-1 sm:flex-initial px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-extrabold text-sm sm:text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                canStart
                  ? 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white active:scale-95 shadow-red-500/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              <span>게임 시작!</span>
            </button>
          ) : (
            <button
              onClick={() => {
                sounds.playPop();
                onToggleReady();
              }}
              className={`flex-1 sm:flex-initial px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-extrabold text-sm sm:text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                me?.isReady
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-[#1e2022] hover:bg-black text-white'
              }`}
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{me?.isReady ? '준비 완료' : '준비하기'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Waiting Room Area: 8 Slots Grid + Chat Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 8 Player Slots (Image 2 style) */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {slots.map((player, idx) => {
            const isEmpty = !player;
            const isMe = player?.id === currentPlayerId;

            return (
              <div
                key={idx}
                className={`relative min-h-[160px] rounded-2xl border transition-all flex flex-col items-center justify-between p-3.5 ${
                  isEmpty
                    ? 'bg-white/60 border-dashed border-slate-300/80 flex items-center justify-center'
                    : isMe
                    ? 'bg-white border-purple-300 shadow-md ring-2 ring-purple-400/30'
                    : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                {isEmpty ? (
                  <div className="flex flex-col items-center justify-center text-slate-300 my-auto">
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center mb-1">
                      <User className="w-5 h-5 text-slate-300" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">빈자리</span>
                  </div>
                ) : (
                  <>
                    {/* Top Badges */}
                    <div className="w-full flex items-center justify-between mb-1">
                      {player.isHost ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-extrabold text-[10px] tracking-tight shadow-xs">
                          방장
                        </span>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            player.isReady
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {player.isReady ? '준비' : '대기'}
                        </span>
                      )}

                      {isMe && (
                        <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-extrabold text-[9px]">
                          나
                        </span>
                      )}
                    </div>

                    {/* Mascot */}
                    <div className="my-auto py-1">
                      <MascotAvatar
                        color={player.avatarColor}
                        size="md"
                        isHost={player.isHost}
                        expression="happy"
                      />
                    </div>

                    {/* Nickname */}
                    <div className="w-full text-center border-t border-slate-100 pt-1.5">
                      <div className="font-extrabold text-xs text-[#1e2022] truncate">
                        {player.nickname}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: In-Room Live Chat */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col h-[340px] sm:h-[400px] max-h-[400px] overflow-hidden">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 shrink-0">
            <MessageCircle className="w-4 h-4 text-purple-600" />
            <h3 className="font-bold text-sm text-[#1e2022]">대기실 채팅</h3>
          </div>

          {/* Messages Scrollable List */}
          <div className="flex-1 overflow-y-auto py-3 space-y-2.5 text-xs pr-1 min-h-0">
            {chatMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium text-center">
                대기실에 입장했습니다.<br />자유롭게 대화를 나눠보세요!
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.senderId === currentPlayerId ? 'items-end' : 'items-start'
                  }`}
                >
                  {msg.isSystem ? (
                    <div className="w-full text-center my-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold">
                        {msg.text}
                      </span>
                    </div>
                  ) : (
                    <>
                      <span className="text-[10px] text-slate-400 mb-0.5 px-1 font-semibold">
                        {msg.senderName}
                      </span>
                      <div
                        className={`px-3 py-1.5 rounded-xl max-w-[85%] break-words font-medium ${
                          msg.senderId === currentPlayerId
                            ? 'bg-[#1e2022] text-white rounded-tr-none'
                            : 'bg-slate-100 text-slate-800 rounded-tl-none'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendChat} className="pt-2 border-t border-slate-100 flex gap-2 shrink-0">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="메시지를 입력하세요..."
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-[#1e2022] hover:bg-black text-white transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
