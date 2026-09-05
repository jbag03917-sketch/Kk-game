import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Award, Clock, Hash, Zap, RotateCcw, Home, Sparkles, Play, Frown } from 'lucide-react';
import confetti from 'canvas-confetti';
import { GameRoom, Player } from '../types';
import { MascotAvatar } from './MascotAvatar';
import { sounds } from '../lib/soundEffects';

interface ResultModalProps {
  room: GameRoom;
  currentPlayerId: string;
  onReturnToLobby: () => void;
  onLeaveToHome: () => void;
  onRestartGame?: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  room,
  currentPlayerId,
  onReturnToLobby,
  onLeaveToHome,
  onRestartGame,
}) => {
  // Sorted players by score / survival
  const sortedPlayers = [...room.currentPlayers].sort((a, b) => {
    if (a.isAlive && !b.isAlive) return -1;
    if (!a.isAlive && b.isAlive) return 1;
    return b.score - a.score;
  });

  const winner = sortedPlayers[0];
  const isWinner = winner?.id === currentPlayerId;
  const myPlayer = room.currentPlayers.find((p) => p.id === currentPlayerId);
  const myRank = sortedPlayers.findIndex((p) => p.id === currentPlayerId) + 1;
  const isHost = room.hostId === currentPlayerId;

  useEffect(() => {
    if (isWinner) {
      sounds.playVictory();
      // Confetti effect on victory
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
      });
    } else {
      sounds.playTimeout();
    }
  }, [isWinner]);

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-5 sm:p-7 flex flex-col items-center animate-in zoom-in-95 duration-200 relative">
        {/* Header Badge */}
        {isWinner ? (
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3 shadow-inner">
            <Trophy className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
        ) : (
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3 shadow-inner relative">
            <span className="text-2xl">💤</span>
          </div>
        )}

        <h2 className="font-black text-2xl sm:text-3xl text-[#1e2022] mb-1 text-center">
          {isWinner ? '🎉 승리 축하합니다!' : '💤 아쉽게 탈락했습니다!'}
        </h2>
        <p className="text-xs text-slate-500 font-semibold mb-4 text-center">
          {winner ? `${winner.nickname}님이 최종 우승하셨습니다!` : '게임이 종료되었습니다.'}
        </p>

        {/* Loser sleeping & score falling motion showcase if lost */}
        {!isWinner && myPlayer && (
          <div className="w-full bg-slate-50 rounded-2xl border border-slate-200 p-3.5 mb-4 flex items-center justify-between relative overflow-hidden">
            {/* Falling penalty score motion */}
            <motion.div
              initial={{ y: -30, opacity: 0, scale: 1.3 }}
              animate={{
                y: [0, 8, 4],
                opacity: [1, 1, 0.95],
                rotate: [0, -6, 6, -3, 0],
              }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className="absolute top-2 right-4 px-2 py-0.5 rounded-full bg-rose-600 text-white font-black text-[10px] shadow-sm flex items-center gap-1"
            >
              <span>-600점 감점</span>
              <span>💥</span>
            </motion.div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <MascotAvatar
                  color={myPlayer.avatarColor}
                  size="md"
                  isHost={myPlayer.isHost}
                  isAlive={false}
                  expression="sleeping"
                />
              </div>
              <div>
                <div className="text-[11px] font-extrabold text-indigo-600">
                  내 캐릭터 (수면 중)
                </div>
                <div className="font-bold text-xs text-slate-500">
                  다음 판에 다시 도전해 보세요!
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Winner Showcase Card */}
        {winner && isWinner && (
          <div className="w-full bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl border border-amber-300/60 p-3.5 flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <MascotAvatar
                color={winner.avatarColor}
                size="md"
                isHost={winner.isHost}
                expression="happy"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-amber-600 text-sm">🥇 1위 우승자</span>
                  <span className="px-1.5 py-0.2 bg-purple-600 text-white rounded text-[9px] font-extrabold">
                    나
                  </span>
                </div>
                <div className="font-extrabold text-sm text-slate-800">
                  {winner.nickname}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-500 font-bold">최종 점수</div>
              <div className="font-mono font-black text-base text-purple-700">
                {winner.score}점
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="w-full bg-slate-50 rounded-2xl border border-slate-200/80 p-2.5 mb-4 max-h-40 overflow-y-auto divide-y divide-slate-100 text-xs">
          {sortedPlayers.map((player, idx) => {
            const rank = idx + 1;
            const isMe = player.id === currentPlayerId;
            const medals = ['🥇', '🥈', '🥉'];

            return (
              <div
                key={player.id}
                className={`py-1.5 px-2 flex items-center justify-between font-bold ${
                  isMe ? 'bg-purple-50 text-purple-900 rounded-lg' : 'text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 text-center font-black text-xs">
                    {medals[idx] || `${rank}위`}
                  </span>
                  <span className="truncate max-w-[110px]">{player.nickname}</span>
                  {isMe && (
                    <span className="text-[9px] bg-purple-200 text-purple-800 px-1 py-0.2 rounded">
                      나
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold text-[10px]">
                    단어 {player.wordsUsed.length}개
                  </span>
                  <span className="font-mono font-black">{player.score}점</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Rewards / Match Summary */}
        <div className="w-full grid grid-cols-3 gap-1.5 mb-4">
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/60 text-center">
            <div className="text-[9px] text-slate-400 font-bold">내 최종 순위</div>
            <div className="font-black text-xs text-[#1e2022]">{myRank}위</div>
          </div>
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/60 text-center">
            <div className="text-[9px] text-slate-400 font-bold">획득 경험치</div>
            <div className="font-black text-xs text-purple-700">+{isWinner ? 50 : 20} EXP</div>
          </div>
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/60 text-center">
            <div className="text-[9px] text-slate-400 font-bold">내 사용 단어</div>
            <div className="font-black text-xs text-indigo-700">{myPlayer?.wordsUsed.length || 0}개</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2">
          {onRestartGame && (
            <button
              onClick={onRestartGame}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 font-black text-sm text-white flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-98"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{isHost ? '⚡ 즉시 다시 시작' : '⚡ 대기실에서 다시 시작'}</span>
            </button>
          )}

          <div className="w-full flex items-center gap-2">
            <button
              onClick={onLeaveToHome}
              className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>홈으로</span>
            </button>
            <button
              onClick={onReturnToLobby}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-black font-bold text-xs text-white flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>대기실로</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
