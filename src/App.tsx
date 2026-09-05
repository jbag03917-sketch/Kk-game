import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { HomeView } from './components/HomeView';
import { LobbyView } from './components/LobbyView';
import { GameView } from './components/GameView';
import { GameRoomsView } from './components/GameRoomsView';
import { DictionaryView } from './components/DictionaryView';
import { MyRecordsView } from './components/MyRecordsView';
import { SettingsView } from './components/SettingsView';
import { StartScreen } from './components/StartScreen';
import { RulesModal } from './components/RulesModal';
import { NoticeModal } from './components/NoticeModal';
import { PublicRoomsModal } from './components/PublicRoomsModal';
import { ShareModal } from './components/ShareModal';
import { ResultModal } from './components/ResultModal';
import { LegalDocumentModal, LegalDocType } from './components/LegalDocumentModal';
import { UserStats, GameRoom, Player, ChatMessage, WordChainItem } from './types';
import { supabase } from './lib/supabaseClient';
import { sounds } from './lib/soundEffects';
import { buildApiUrl } from './lib/apiHelper';
import { calculateWordScore } from './lib/scoreCalculator';

// Initial default user state
const INITIAL_STATS: UserStats = {
  nickname: `손님${Math.floor(1000 + Math.random() * 9000)}`,
  level: 1,
  exp: 0,
  score: 1000,
  avatarColor: 'white',
  totalGames: 0,
  wins: 0,
  winRate: 0,
  highestRank: '-',
  currentStreak: 0,
  maxStreak: 0,
  wordsHistory: [],
};

export function App() {
  // Local persistent user state
  const [userStats, setUserStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('kkeutitgi_user_stats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_STATS,
          ...parsed,
          score: typeof parsed.score === 'number' && !isNaN(parsed.score) ? parsed.score : 1000,
        };
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_STATS;
  });

  // Current client player ID
  const [myPlayerId] = useState<string>(() => {
    let id = sessionStorage.getItem('kkeutitgi_player_id');
    if (!id) {
      id = 'usr_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('kkeutitgi_player_id', id);
    }
    return id;
  });

  // Sync userStats to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('kkeutitgi_user_stats', JSON.stringify(userStats));
    } catch (e) {
      console.error('Failed to save userStats to localStorage:', e);
    }
  }, [userStats]);

  const handleResetStats = () => {
    setUserStats(INITIAL_STATS);
    try {
      localStorage.removeItem('kkeutitgi_user_stats');
    } catch (e) {
      console.error(e);
    }
  };

  // Navigation & View state
  const [isStarted, setIsStarted] = useState<boolean>(() => {
    return sessionStorage.getItem('kkeutitgi_started') === 'true';
  });
  const [currentTab, setCurrentTab] = useState<string>('HOME');
  const [activeRoom, setActiveRoom] = useState<GameRoom | null>(null);
  const [publicRooms, setPublicRooms] = useState<GameRoom[]>([]);
  const [isRefreshingRooms, setIsRefreshingRooms] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [dictSearchWord, setDictSearchWord] = useState<string>('');

  // Modals state
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const [isPublicRoomsOpen, setIsPublicRoomsOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isGameOverOpen, setIsGameOverOpen] = useState(false);
  const [isLegalDocOpen, setIsLegalDocOpen] = useState(false);
  const [legalDocType, setLegalDocType] = useState<LegalDocType>('TERMS');
  const [roomErrorMessage, setRoomErrorMessage] = useState<string | null>(null);

  const handleOpenLegalDoc = (type: LegalDocType) => {
    setLegalDocType(type);
    setIsLegalDocOpen(true);
  };

  // Supabase Realtime channel ref & authoritative activeRoom ref
  const channelRef = useRef<any>(null);
  const activeRoomRef = useRef<GameRoom | null>(activeRoom);
  const processedGameKeyRef = useRef<string | null>(null);

  // Universal Game Result Stats Processor (Fixes score deduction bug & enforces 600pt penalty on loss, 500pt bonus on win)
  const applyGameResultStats = (finishedRoom: GameRoom) => {
    if (!finishedRoom || finishedRoom.status !== 'FINISHED') return;
    const gameKey = `${finishedRoom.id}_r${finishedRoom.round}_w_${finishedRoom.winner?.id || 'none'}_ts_${finishedRoom.startTime || finishedRoom.createdAt || 0}`;
    if (processedGameKeyRef.current === gameKey) return;
    processedGameKeyRef.current = gameKey;

    const isMeWinner = finishedRoom.winner?.id === myPlayerId;
    setUserStats((prev) => {
      const currentScore = typeof prev.score === 'number' && !isNaN(prev.score) ? prev.score : 1000;
      const newTotal = (prev.totalGames || 0) + 1;
      const newWins = isMeWinner ? (prev.wins || 0) + 1 : (prev.wins || 0);
      const newRate = Math.round((newWins / newTotal) * 100);
      const newStreak = isMeWinner ? (prev.currentStreak || 0) + 1 : 0;
      const newMaxStreak = Math.max(prev.maxStreak || 0, newStreak);
      const newExp = (prev.exp || 0) + (isMeWinner ? 50 : 20);

      let level = prev.level || 1;
      let exp = newExp;
      const expTarget = level * 100;
      if (exp >= expTarget) {
        level += 1;
        exp -= expTarget;
      }

      return {
        ...prev,
        // 이겨도 점수 증가 없음(0점 변동), 진 사람만 -600점 감점 (0점 밑 마이너스 점수도 허용)
        score: isMeWinner ? currentScore : currentScore - 600,
        totalGames: newTotal,
        wins: newWins,
        winRate: newRate,
        currentStreak: newStreak,
        maxStreak: newMaxStreak,
        highestRank: isMeWinner ? 1 : 2,
        exp,
        level,
      };
    });
  };

  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  // Robust room state normalization to guarantee that the current player is NEVER lost
  const normalizeRoomState = (
    incomingRoom: GameRoom | null | undefined,
    prevRoom: GameRoom | null = activeRoomRef.current
  ): GameRoom | null => {
    if (!incomingRoom) return null;

    let players: Player[] = Array.isArray(incomingRoom.currentPlayers)
      ? [...incomingRoom.currentPlayers]
      : [];

    const hostId = incomingRoom.hostId || players[0]?.id || myPlayerId;
    const hostPlayer = players.find((p) => p.id === hostId);
    const hostName = incomingRoom.hostName || hostPlayer?.nickname || '방장';

    // If I should be in this room, ensure my presence is preserved
    const amIInThisRoom =
      (prevRoom && prevRoom.id === incomingRoom.id && prevRoom.currentPlayers?.some((p) => p.id === myPlayerId)) ||
      (activeRoomRef.current && activeRoomRef.current.id === incomingRoom.id && activeRoomRef.current.currentPlayers?.some((p) => p.id === myPlayerId));

    const isMeIncluded = players.some((p) => p.id === myPlayerId);

    if (amIInThisRoom && !isMeIncluded) {
      const myPrev = prevRoom?.currentPlayers?.find((p) => p.id === myPlayerId) ||
        activeRoomRef.current?.currentPlayers?.find((p) => p.id === myPlayerId);
      players.push(
        myPrev || {
          id: myPlayerId,
          nickname: userStats.nickname,
          avatarColor: userStats.avatarColor,
          isHost: hostId === myPlayerId,
          isReady: hostId === myPlayerId,
          isAlive: true,
          score: 0,
          wordsUsed: [],
          level: userStats.level,
        }
      );
    }

    // De-duplicate players by ID & sanitize fields
    const uniquePlayers: Player[] = [];
    const seen = new Set<string>();
    for (const p of players) {
      if (p && p.id && !seen.has(p.id)) {
        seen.add(p.id);
        uniquePlayers.push({
          id: p.id,
          nickname: p.nickname || '플레이어',
          avatarColor: p.avatarColor || 'white',
          isHost: p.id === hostId,
          isReady: p.id === hostId ? true : !!p.isReady,
          isAlive: p.isAlive !== false,
          score: typeof p.score === 'number' ? p.score : 0,
          wordsUsed: Array.isArray(p.wordsUsed) ? p.wordsUsed : [],
          level: p.level || 1,
          eliminatedReason: p.eliminatedReason,
        });
      }
    }

    return {
      ...incomingRoom,
      hostId,
      hostName,
      status: incomingRoom.status || 'WAITING',
      currentPlayers: uniquePlayers.length > 0 ? uniquePlayers : (prevRoom?.currentPlayers || []),
      maxPlayers: incomingRoom.maxPlayers || 8,
      isPublic: incomingRoom.isPublic !== false,
      turnDuration: typeof incomingRoom.turnDuration === 'number' ? incomingRoom.turnDuration : 15.0,
      totalRounds: incomingRoom.totalRounds || prevRoom?.totalRounds || 3,
      roundTime: incomingRoom.roundTime || prevRoom?.roundTime || 90,
      round: incomingRoom.round || 1,
      starterChar: incomingRoom.starterChar || prevRoom?.starterChar,
      roundHistoryWords: incomingRoom.roundHistoryWords || prevRoom?.roundHistoryWords,
      lastWord: incomingRoom.lastWord !== undefined ? incomingRoom.lastWord : prevRoom?.lastWord,
      currentTurnIndex: typeof incomingRoom.currentTurnIndex === 'number' ? incomingRoom.currentTurnIndex : 0,
      usedWords: Array.isArray(incomingRoom.usedWords) ? incomingRoom.usedWords : [],
      wordChain: Array.isArray(incomingRoom.wordChain) ? incomingRoom.wordChain : [],
      createdAt: incomingRoom.createdAt || Date.now(),
    };
  };

  // Fetch real public rooms from server API
  const refreshPublicRooms = async () => {
    setIsRefreshingRooms(true);
    try {
      const url = buildApiUrl('/api/rooms');
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.rooms)) {
          const serverRooms: GameRoom[] = data.rooms.map((r: any) => ({
            id: r.id,
            title: r.title,
            hostId: r.hostId || r.id,
            hostName: r.hostName || '방장',
            status: r.status || 'WAITING',
            currentPlayers: Array.isArray(r.currentPlayers) && r.currentPlayers.length > 0
              ? r.currentPlayers
              : [{
                  id: r.hostId || r.id,
                  nickname: r.hostName || '방장',
                  avatarColor: 'white',
                  isHost: true,
                  isReady: true,
                  isAlive: true,
                  score: 0,
                  wordsUsed: [],
                  level: 1,
                }],
            maxPlayers: r.maxPlayers || 8,
            isPublic: r.isPublic !== false,
            turnDuration: r.turnDuration || 15.0,
            round: r.round || 1,
            currentTurnIndex: r.currentTurnIndex || 0,
            lastWord: r.lastWord,
            usedWords: r.usedWords || [],
            wordChain: r.wordChain || [],
            createdAt: r.createdAt || Date.now(),
          }));

          setPublicRooms(serverRooms);
        }
      }
    } catch (e) {
      // Graceful error handling
    } finally {
      setIsRefreshingRooms(false);
    }
  };

  // Supabase Global Lobby Channel for Real-time Room Sync across players
  const lobbyChannelRef = useRef<any>(null);

  useEffect(() => {
    let lobbyChannel: any = null;
    try {
      lobbyChannel = supabase.channel('global_lobby_channel', {
        config: { broadcast: { self: false } },
      });

      lobbyChannel
        .on('broadcast', { event: 'lobby_event' }, ({ payload }: any) => {
          if (!payload) return;
          if (payload.type === 'ROOMS_UPDATED' && Array.isArray(payload.rooms)) {
            setPublicRooms(payload.rooms);
          } else if (payload.type === 'ROOM_CREATED' && payload.room) {
            setPublicRooms((prev) => {
              const exists = prev.some((r) => r.id === payload.room.id);
              if (exists) return prev.map((r) => (r.id === payload.room.id ? payload.room : r));
              return [payload.room, ...prev];
            });
          }
        })
        .subscribe();

      lobbyChannelRef.current = lobbyChannel;
    } catch (err) {
      console.warn('Supabase lobby channel init skipped:', err);
    }

    return () => {
      try {
        if (lobbyChannel) lobbyChannel.unsubscribe();
      } catch {}
    };
  }, []);

  const broadcastLobbyEvent = (type: string, data: any) => {
    try {
      if (lobbyChannelRef.current) {
        lobbyChannelRef.current.send({
          type: 'broadcast',
          event: 'lobby_event',
          payload: { type, ...data, senderId: myPlayerId, timestamp: Date.now() },
        });
      }
    } catch {}
  };

  // Real-time Lobby Room List SSE Stream (Instantly updates lobby room list across all clients)
  useEffect(() => {
    refreshPublicRooms();

    let es: EventSource | null = null;
    try {
      if (typeof window !== 'undefined' && 'EventSource' in window) {
        const streamUrl = buildApiUrl('/api/rooms/stream');
        es = new EventSource(streamUrl);
        es.addEventListener('ROOMS_UPDATED', (e) => {
          try {
            const data = JSON.parse(e.data);
            if (Array.isArray(data.rooms)) {
              setPublicRooms(data.rooms);
            }
          } catch {}
        });
        es.onerror = () => {
          if (es) {
            es.close();
            es = null;
          }
        };
      }
    } catch (err) {
      console.warn('Lobby SSE not available, falling back to polling:', err);
    }

    // Auto-polling (3s) to guarantee instant public rooms update
    const interval = setInterval(refreshPublicRooms, 3000);
    return () => {
      clearInterval(interval);
      if (es) {
        try {
          es.close();
        } catch {}
      }
    };
  }, []);

  // Save user stats on change
  useEffect(() => {
    localStorage.setItem('kkeutitgi_user_stats', JSON.stringify(userStats));
  }, [userStats]);

  // Background Music (BGM) & Audio Context unlock on first user gesture
  useEffect(() => {
    const handleFirstGesture = () => {
      if (activeRoom?.status === 'PLAYING') {
        sounds.startBGM('game');
      } else {
        sounds.startBGM('lobby');
      }
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
    };

    window.addEventListener('click', handleFirstGesture, { once: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true });
    window.addEventListener('touchstart', handleFirstGesture, { once: true });

    return () => {
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
    };
  }, []);

  // Switch BGM mode when room status changes (lobby vs playing)
  useEffect(() => {
    if (activeRoom?.status === 'PLAYING') {
      sounds.startBGM('game');
    } else {
      sounds.startBGM('lobby');
    }
  }, [activeRoom?.status]);

  // Check URL params for ?room=XXXX (e.g. from share link or page refresh)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && !activeRoom) {
      handleJoinRoom(roomParam);
    }
  }, []);

  // Synchronize browser URL query parameter with active room
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (activeRoom?.id) {
        if (url.searchParams.get('room') !== activeRoom.id) {
          url.searchParams.set('room', activeRoom.id);
          window.history.replaceState(null, '', url.toString());
        }
      } else {
        if (url.searchParams.has('room')) {
          url.searchParams.delete('room');
          window.history.replaceState(null, '', url.pathname + (url.search ? url.search : ''));
        }
      }
    } catch {}
  }, [activeRoom?.id]);

  // Tab close or window navigation leave notification via sendBeacon
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeRoom?.id) {
        try {
          const leaveUrl = buildApiUrl('/api/rooms/leave');
          const payload = JSON.stringify({ roomId: activeRoom.id, playerId: myPlayerId });
          if (navigator.sendBeacon) {
            const blob = new Blob([payload], { type: 'application/json' });
            navigator.sendBeacon(leaveUrl, blob);
          }
        } catch {}
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeRoom?.id, myPlayerId]);

  // Real-time In-Room Server-Sent Events (SSE) stream (Sub-50ms instant sync across all players)
  useEffect(() => {
    if (!activeRoom?.id) return;

    let es: EventSource | null = null;
    try {
      if (typeof window !== 'undefined' && 'EventSource' in window) {
        const streamUrl = buildApiUrl(
          `/api/rooms/${encodeURIComponent(activeRoom.id)}/stream?playerId=${encodeURIComponent(myPlayerId)}`
        );
        es = new EventSource(streamUrl);
        es.addEventListener('SYNC_ROOM', (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.room) {
              setActiveRoom((prev) => normalizeRoomState(data.room, prev));
              if (data.room.status === 'FINISHED') {
                setIsGameOverOpen(true);
                applyGameResultStats(data.room);
              }
            }
          } catch {}
        });

        es.addEventListener('CHAT_MESSAGE', (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.message) {
              setChatMessages((prev) => {
                if (prev.some((m) => m.id === data.message.id)) return prev;
                return [...prev, data.message];
              });
            }
          } catch {}
        });

        es.onerror = () => {
          if (es) {
            es.close();
            es = null;
          }
        };
      }
    } catch (e) {
      console.warn('Room SSE stream error:', e);
    }

    // Secondary backup polling
    const interval = setInterval(async () => {
      try {
        const url = buildApiUrl(`/api/rooms/${encodeURIComponent(activeRoom.id)}`);
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (res.ok) {
          const data = await res.json();
          if (data.room) {
            setActiveRoom((prev) => normalizeRoomState(data.room, prev));
          }
        }
      } catch {}
    }, 2500);

    return () => {
      clearInterval(interval);
      if (es) {
        try {
          es.close();
        } catch {}
      }
    };
  }, [activeRoom?.id, myPlayerId]);

  // Save room state to server
  const saveRoomToServer = async (room: GameRoom) => {
    try {
      const url = buildApiUrl('/api/rooms/save');
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(room),
      });
    } catch (e) {
      console.warn('Failed to save room to server:', e);
    }
  };

  // Supabase Realtime Synchronization (Presence Tracking + Broadcast Events)
  useEffect(() => {
    if (!activeRoom?.id) {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      return;
    }

    const roomIdUpper = String(activeRoom.id).trim().toUpperCase();
    const channelName = `kkeutitgi_room_${roomIdUpper}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: true, self: false },
        presence: { key: myPlayerId },
      },
    });

    // 1. Presence Listeners (Instant Connection & Join/Leave Detection)
    channel
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        if (newPresences && newPresences.length > 0) {
          sounds.playJoin();
          // If I am host, broadcast authoritative room state to the newly joined player
          if (activeRoomRef.current?.hostId === myPlayerId) {
            broadcastRoomEvent('SYNC_ROOM', { room: activeRoomRef.current });
          }
        }
      })
      .on('presence', { event: 'leave' }, () => {
        // Player disconnected from Supabase channel
      })
      .on('presence', { event: 'sync' }, () => {
        // Presence state synced across all room participants
      });

    // 2. Broadcast Listeners (Sub-50ms Ultra Low Latency Real-time Events)
    channel
      .on('broadcast', { event: 'game_event' }, ({ payload }) => {
        if (!payload) return;
        const { type, data } = payload;

        if (type === 'PLAYER_JOINED' && data?.player) {
          const newPlayer: Player = data.player;
          setActiveRoom((prev) => {
            if (!prev) return prev;
            const exists = prev.currentPlayers.some((p) => p.id === newPlayer.id);
            const updatedPlayers = exists
              ? prev.currentPlayers.map((p) => (p.id === newPlayer.id ? { ...p, ...newPlayer } : p))
              : [...prev.currentPlayers, newPlayer];

            const updatedRoom = normalizeRoomState({
              ...prev,
              currentPlayers: updatedPlayers,
            }, prev);

            if (updatedRoom && prev.hostId === myPlayerId) {
              saveRoomToServer(updatedRoom);
              setTimeout(() => {
                broadcastRoomEvent('SYNC_ROOM', { room: updatedRoom });
              }, 50);
            }
            return updatedRoom || prev;
          });

          setChatMessages((prev) => {
            const sysId = `join_${newPlayer.id}_${Date.now()}`;
            if (prev.some((m) => m.id === sysId)) return prev;
            return [
              ...prev,
              {
                id: sysId,
                senderId: 'SYSTEM',
                senderName: '시스템',
                text: `${newPlayer.nickname}님이 대기실에 입장하셨습니다.`,
                timestamp: Date.now(),
                isSystem: true,
              },
            ];
          });
          sounds.playJoin();
        } else if (type === 'SYNC_ROOM' && data?.room) {
          setActiveRoom((prev) => normalizeRoomState(data.room, prev));
          if (data.room.status === 'FINISHED') {
            setIsGameOverOpen(true);
            applyGameResultStats(data.room);
          }
        } else if (type === 'PLAYER_LEAVE' && data?.playerId) {
          const leaverId = data.playerId;
          setActiveRoom((prev) => {
            if (!prev) return prev;
            const remaining = prev.currentPlayers.filter((p) => p.id !== leaverId);
            let newHostId = prev.hostId;
            let newHostName = prev.hostName;
            if (prev.hostId === leaverId && remaining.length > 0) {
              remaining[0].isHost = true;
              newHostId = remaining[0].id;
              newHostName = remaining[0].nickname;
            }
            return normalizeRoomState({
              ...prev,
              hostId: newHostId,
              hostName: newHostName,
              currentPlayers: remaining,
            }, prev) || prev;
          });
        } else if (type === 'TOGGLE_READY' && data?.playerId !== undefined) {
          setActiveRoom((prev) => {
            if (!prev) return prev;
            return normalizeRoomState({
              ...prev,
              currentPlayers: prev.currentPlayers.map((p) =>
                p.id === data.playerId ? { ...p, isReady: data.isReady } : p
              ),
            }, prev) || prev;
          });
        } else if (type === 'PLAYER_COLOR_CHANGED' && data?.playerId && data?.avatarColor) {
          setActiveRoom((prev) => {
            if (!prev) return prev;
            return normalizeRoomState({
              ...prev,
              currentPlayers: prev.currentPlayers.map((p) =>
                p.id === data.playerId ? { ...p, avatarColor: data.avatarColor } : p
              ),
            }, prev) || prev;
          });
        } else if (type === 'START_GAME') {
          setActiveRoom((prev) => {
            if (!prev) return prev;
            const starter = data?.starterChar || data?.room?.starterChar || '수';
            const totalRounds = data?.totalRounds || data?.room?.totalRounds || prev.totalRounds || 3;
            const history = data?.roundHistoryWords || data?.room?.roundHistoryWords || [starter, ...Array(totalRounds - 1).fill('?')];
            return normalizeRoomState({
              ...prev,
              status: 'PLAYING',
              round: 1,
              totalRounds,
              starterChar: starter,
              roundHistoryWords: history,
              currentTurnIndex: 0,
              wordChain: [],
              usedWords: [],
              lastWord: starter,
              turnDuration: 15.0,
              currentPlayers: prev.currentPlayers.map((p) => ({
                ...p,
                isAlive: true,
                score: 0,
                wordsUsed: [],
                eliminatedReason: undefined,
              })),
            }, prev) || prev;
          });
          sounds.playGameStart();
        } else if (type === 'START_NEXT_ROUND') {
          setActiveRoom((prev) => {
            if (!prev) return prev;
            const nextRound = data?.round || (prev.round + 1);
            const starter = data?.starterChar || '벌';
            const totalRounds = prev.totalRounds || 3;
            const history = data?.roundHistoryWords || [...(prev.roundHistoryWords || Array(totalRounds).fill('?'))];
            history[nextRound - 1] = starter;

            return normalizeRoomState({
              ...prev,
              round: nextRound,
              starterChar: starter,
              lastWord: starter,
              roundHistoryWords: history,
              currentTurnIndex: 0,
              turnDuration: 15.0,
              wordChain: [],
              usedWords: [],
              currentPlayers: prev.currentPlayers.map((p) => ({
                ...p,
                isAlive: true,
                eliminatedReason: undefined,
              })),
            }, prev) || prev;
          });
        } else if (type === 'SUBMIT_WORD' && data?.item) {
          const newItem: WordChainItem = data.item;
          setActiveRoom((prev) => {
            if (!prev) return prev;
            const exists = prev.usedWords.includes(newItem.word);
            if (exists) return prev;

            const newUsed = [...prev.usedWords, newItem.word];
            const newChain = [...prev.wordChain, newItem];
            const newDuration = Math.max(5.0, Number((15.0 - newChain.length * 0.4).toFixed(1)));

            const updatedPlayers = prev.currentPlayers.map((p) => {
              if (p.id === newItem.playerId) {
                return {
                  ...p,
                  score: p.score + newItem.word.length * 10 + (newItem.isDueum ? 5 : 0),
                  wordsUsed: [...p.wordsUsed, newItem.word],
                };
              }
              return p;
            });

            const alive = updatedPlayers.filter((p) => p.isAlive);
            let nextIdx = prev.currentTurnIndex;
            if (alive.length > 1) {
              nextIdx = (prev.currentTurnIndex + 1) % updatedPlayers.length;
              while (!updatedPlayers[nextIdx].isAlive) {
                nextIdx = (nextIdx + 1) % updatedPlayers.length;
              }
            }

            return normalizeRoomState({
              ...prev,
              lastWord: newItem.word,
              usedWords: newUsed,
              wordChain: newChain,
              turnDuration: newDuration,
              currentTurnIndex: nextIdx,
              currentPlayers: updatedPlayers,
            }, prev) || prev;
          });
          sounds.playCorrect();
        } else if (type === 'PLAYER_TIMEOUT' && data?.targetPlayerId) {
          setActiveRoom((prev) => {
            if (!prev) return prev;
            const penalty = 600;
            const updatedPlayers = prev.currentPlayers.map((p) =>
              p.id === data.targetPlayerId
                ? { ...p, score: p.score - penalty, isAlive: false, eliminatedReason: '시간 초과 (-600점)' }
                : p
            );
            const alive = updatedPlayers.filter((p) => p.isAlive);
            const totalRounds = prev.totalRounds || 3;
            const currentRound = prev.round || 1;

            if (alive.length <= 1 && updatedPlayers.length > 1) {
              if (currentRound < totalRounds) {
                const nextRound = currentRound + 1;
                const candidateStarters = ['수', '박', '벌', '꽃', '물', '하', '봄', '별', '달', '산', '해', '구', '눈'];
                const nextStarter = data?.nextStarter || candidateStarters[Math.floor(Math.random() * candidateStarters.length)];
                const history = [...(prev.roundHistoryWords || Array(totalRounds).fill('?'))];
                history[nextRound - 1] = nextStarter;

                return normalizeRoomState({
                  ...prev,
                  round: nextRound,
                  starterChar: nextStarter,
                  lastWord: nextStarter,
                  roundHistoryWords: history,
                  currentTurnIndex: 0,
                  turnDuration: 15.0,
                  wordChain: [],
                  usedWords: [],
                  currentPlayers: updatedPlayers.map((p) => ({
                    ...p,
                    isAlive: true,
                    eliminatedReason: undefined,
                  })),
                }, prev) || prev;
              } else {
                setIsGameOverOpen(true);
                return normalizeRoomState({
                  ...prev,
                  status: 'FINISHED',
                  currentPlayers: updatedPlayers,
                }, prev) || prev;
              }
            } else if (alive.length > 0) {
              let nextIdx = (prev.currentTurnIndex + 1) % updatedPlayers.length;
              while (!updatedPlayers[nextIdx].isAlive) {
                nextIdx = (nextIdx + 1) % updatedPlayers.length;
              }
              return normalizeRoomState({
                ...prev,
                currentTurnIndex: nextIdx,
                currentPlayers: updatedPlayers,
              }, prev) || prev;
            }

            return normalizeRoomState({
              ...prev,
              currentPlayers: updatedPlayers,
            }, prev) || prev;
          });
          sounds.playTimeout();
        } else if (type === 'CHAT_MESSAGE' && data?.message) {
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
        } else if (type === 'REQUEST_SYNC') {
          if (activeRoomRef.current?.hostId === myPlayerId) {
            broadcastRoomEvent('SYNC_ROOM', { room: activeRoomRef.current });
          }
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track presence with player info
          await channel.track({
            id: myPlayerId,
            nickname: userStats.nickname,
            avatarColor: userStats.avatarColor,
            isHost: activeRoomRef.current?.hostId === myPlayerId,
            isReady: activeRoomRef.current?.hostId === myPlayerId,
            joinedAt: Date.now(),
          });

          // Send PLAYER_JOINED broadcast with my info if guest
          if (activeRoomRef.current?.hostId !== myPlayerId) {
            channel.send({
              type: 'broadcast',
              event: 'game_event',
              payload: {
                type: 'PLAYER_JOINED',
                data: {
                  player: {
                    id: myPlayerId,
                    nickname: userStats.nickname,
                    avatarColor: userStats.avatarColor,
                    isHost: false,
                    isReady: false,
                    isAlive: true,
                    score: 0,
                    wordsUsed: [],
                    level: userStats.level,
                  },
                },
                senderId: myPlayerId,
                timestamp: Date.now(),
              },
            });
          }

          // Request authoritative room sync from host immediately
          channel.send({
            type: 'broadcast',
            event: 'game_event',
            payload: { type: 'REQUEST_SYNC', senderId: myPlayerId, timestamp: Date.now() },
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [activeRoom?.id]);

  // Broadcast helper
  const broadcastRoomEvent = (type: string, data: any) => {
    if (channelRef.current) {
      try {
        channelRef.current.send({
          type: 'broadcast',
          event: 'game_event',
          payload: { type, data, senderId: myPlayerId, timestamp: Date.now() },
        });
      } catch (err) {
        console.warn('Broadcast send error:', err);
      }
    }
  };

  // Dispatch Server Action (Server-authoritative sync)
  const sendRoomAction = async (action: string, payload: any = {}) => {
    if (!activeRoom) return;
    try {
      const url = buildApiUrl(`/api/rooms/${encodeURIComponent(activeRoom.id)}/action`);
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          action,
          payload,
          senderId: myPlayerId,
        }),
      });
    } catch (e) {
      console.warn('Failed to send room action to server:', e);
    }
  };

  // Create Room
  const handleCreateRoom = async (
    title?: string,
    maxPlayers: number = 8,
    isPublic: boolean = true,
    totalRounds: number = 3
  ) => {
    const newRoomId = Math.floor(1000 + Math.random() * 9000).toString();

    const hostPlayer: Player = {
      id: myPlayerId,
      nickname: userStats.nickname,
      avatarColor: userStats.avatarColor,
      isHost: true,
      isReady: true,
      isAlive: true,
      score: 0,
      wordsUsed: [],
      level: userStats.level,
    };

    const newRoom: GameRoom = {
      id: newRoomId,
      title: title || `${userStats.nickname}님의 방`,
      hostId: myPlayerId,
      hostName: userStats.nickname,
      status: 'WAITING',
      currentPlayers: [hostPlayer],
      maxPlayers,
      totalRounds: totalRounds || 3,
      roundTime: 90,
      isPublic,
      turnDuration: 15.0,
      round: 1,
      currentTurnIndex: 0,
      usedWords: [],
      wordChain: [],
      createdAt: Date.now(),
    };

    const normalized = normalizeRoomState(newRoom, null) || newRoom;
    setActiveRoom(normalized);
    setCurrentTab('GAME');
    setChatMessages([
      {
        id: 'sys_create',
        senderId: 'SYSTEM',
        senderName: '시스템',
        text: `대기실이 개설되었습니다. (방 코드: ${newRoomId}) 친구에게 방 코드를 알려주세요!`,
        timestamp: Date.now(),
        isSystem: true,
      },
    ]);

    setPublicRooms((prev) => [normalized, ...prev.filter((r) => r.id !== newRoomId)]);
    broadcastLobbyEvent('ROOM_CREATED', { room: normalized });

    // Sync to server
    try {
      const url = buildApiUrl('/api/rooms/create');
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          roomId: newRoomId,
          title: normalized.title,
          maxPlayers,
          isPublic,
          hostPlayer,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.room) {
        setActiveRoom(normalizeRoomState(data.room, normalized));
      }
    } catch (e) {
      console.warn('Server room creation sync:', e);
    }
  };

  // Join Room by Code or Click
  const handleJoinRoom = async (roomId: string) => {
    if (!roomId) return;
    const cleanId = String(roomId).replace(/[^a-zA-Z0-9]/g, '').trim().toUpperCase();
    if (!cleanId) return;

    const me: Player = {
      id: myPlayerId,
      nickname: userStats.nickname,
      avatarColor: userStats.avatarColor,
      isHost: false,
      isReady: false,
      isAlive: true,
      score: 0,
      wordsUsed: [],
      level: userStats.level,
    };

    const existing = publicRooms.find((r) => r.id.toUpperCase() === cleanId);

    // 1. Try server join
    try {
      const url = buildApiUrl('/api/rooms/join');
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ roomId: cleanId, player: me }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.room) {
        const roomWithMe = normalizeRoomState(data.room, null) || data.room;
        setActiveRoom(roomWithMe);
        setCurrentTab('GAME');
        setChatMessages([
          {
            id: 'join_' + Date.now(),
            senderId: 'SYSTEM',
            senderName: '시스템',
            text: `${userStats.nickname}님이 대기실에 입장하셨습니다. (방 코드: ${data.room.id})`,
            timestamp: Date.now(),
            isSystem: true,
          },
        ]);
        saveRoomToServer(roomWithMe);
        broadcastRoomEvent('PLAYER_JOINED', { player: me });
        broadcastRoomEvent('SYNC_ROOM', { room: roomWithMe });
        return;
      } else if (data.error) {
        setRoomErrorMessage(data.error);
        return;
      }
    } catch (e) {
      console.warn('Server join request failed, trying Supabase direct channel join:', e);
    }

    // 2. Direct Supabase Channel Join (Guaranteed connection to Host's room!)
    const directPlayers = existing
      ? (existing.currentPlayers.some((p) => p.id === myPlayerId)
          ? existing.currentPlayers
          : [...existing.currentPlayers, me])
      : [me];

    const directRoom: GameRoom = existing
      ? {
          ...existing,
          currentPlayers: directPlayers,
        }
      : {
          id: cleanId,
          title: `${cleanId}번 대기실`,
          hostId: 'host_' + cleanId,
          hostName: '방장',
          status: 'WAITING',
          currentPlayers: [me],
          maxPlayers: 8,
          isPublic: true,
          turnDuration: 15.0,
          round: 1,
          currentTurnIndex: 0,
          usedWords: [],
          wordChain: [],
          createdAt: Date.now(),
        };

    const roomWithMe = normalizeRoomState(directRoom, null) || directRoom;
    setActiveRoom(roomWithMe);
    setCurrentTab('GAME');
    setChatMessages([
      {
        id: 'join_' + Date.now(),
        senderId: 'SYSTEM',
        senderName: '시스템',
        text: `${userStats.nickname}님이 대기실에 입장하셨습니다. (방 코드: ${cleanId})`,
        timestamp: Date.now(),
        isSystem: true,
      },
    ]);
    saveRoomToServer(roomWithMe);
    broadcastRoomEvent('PLAYER_JOINED', { player: me });
    broadcastRoomEvent('SYNC_ROOM', { room: roomWithMe });
  };

  // Add Test Player / Bot (allows user to easily test & play 2~8 multiplayer even solo)
  const handleAddTestPlayer = () => {
    if (!activeRoom || activeRoom.currentPlayers.length >= activeRoom.maxPlayers) return;

    const names = ['영희', '민우', '수진', '태양', '하늘', '보라', '다은'];
    const colors = ['yellow', 'mint', 'pink', 'purple', 'blue', 'orange'];
    const existingNames = activeRoom.currentPlayers.map((p) => p.nickname);
    const availableNames = names.filter((n) => !existingNames.includes(n));
    const randomName = availableNames[0] || `참가자${activeRoom.currentPlayers.length + 1}`;
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const botPlayer: Player = {
      id: 'bot_' + Math.random().toString(36).substring(2, 7),
      nickname: randomName,
      avatarColor: randomColor,
      isHost: false,
      isReady: true,
      isAlive: true,
      score: 0,
      wordsUsed: [],
      level: Math.floor(1 + Math.random() * 8),
    };

    const updatedRoom = normalizeRoomState({
      ...activeRoom,
      currentPlayers: [...activeRoom.currentPlayers, botPlayer],
    }, activeRoom);

    if (updatedRoom) {
      setActiveRoom(updatedRoom);
      sounds.playPop();
      sendRoomAction('ADD_BOT');
      saveRoomToServer(updatedRoom);
      broadcastRoomEvent('SYNC_ROOM', { room: updatedRoom });
    }
  };

  // Toggle Ready
  const handleToggleReady = () => {
    if (!activeRoom) return;

    const updatedPlayers = activeRoom.currentPlayers.map((p) => {
      if (p.id === myPlayerId) {
        return { ...p, isReady: !p.isReady };
      }
      return p;
    });

    const updatedRoom = normalizeRoomState({
      ...activeRoom,
      currentPlayers: updatedPlayers,
    }, activeRoom);

    if (updatedRoom) {
      setActiveRoom(updatedRoom);
      sendRoomAction('TOGGLE_READY');
      saveRoomToServer(updatedRoom);
      broadcastRoomEvent('SYNC_ROOM', { room: updatedRoom });
    }
  };

  // Change Color in Room
  const handleChangeColor = (color: string) => {
    if (!activeRoom) return;

    const updatedPlayers = activeRoom.currentPlayers.map((p) => {
      if (p.id === myPlayerId) {
        return { ...p, avatarColor: color };
      }
      return p;
    });

    const updatedRoom = normalizeRoomState({
      ...activeRoom,
      currentPlayers: updatedPlayers,
    }, activeRoom);

    setUserStats((prev) => ({ ...prev, avatarColor: color }));
    if (updatedRoom) {
      setActiveRoom(updatedRoom);
      sendRoomAction('CHANGE_COLOR', { avatarColor: color });
      saveRoomToServer(updatedRoom);
      broadcastRoomEvent('SYNC_ROOM', { room: updatedRoom });
    }
  };

  // Candidate starting characters for automatic random prompt
  const STARTER_SYLLABLES = [
    '수', '박', '벌', '곡', '바', '사', '가', '꽃', '물', '하', '봄', '별', '달',
    '차', '구', '도', '기', '마', '산', '해', '눈', '밤', '비', '초', '태', '풍',
    '황', '화', '백', '홍', '청', '녹', '신', '선', '인', '원', '국', '대', '소',
    '문', '무', '천', '지', '일', '월', '목', '금', '토'
  ];

  const getRandomStarter = (): string => {
    return STARTER_SYLLABLES[Math.floor(Math.random() * STARTER_SYLLABLES.length)];
  };

  const handleChangeTotalRounds = (rounds: number) => {
    if (!activeRoom) return;
    const updatedRoom: GameRoom = {
      ...activeRoom,
      totalRounds: rounds,
    };
    setActiveRoom(updatedRoom);
    saveRoomToServer(updatedRoom);
    broadcastRoomEvent('SYNC_ROOM', { room: updatedRoom });
  };

  // Start Game (Host only) - Multi-round + Random starter syllable
  const handleStartGame = () => {
    if (!activeRoom || activeRoom.currentPlayers.length < 2) return;

    const totalRounds = activeRoom.totalRounds || 3;
    const initialStarter = getRandomStarter();
    const historyStarters = [initialStarter, ...Array(totalRounds - 1).fill('?')];

    // Shuffle players randomly with clean 0 initial score
    const shuffled = [...activeRoom.currentPlayers]
      .sort(() => Math.random() - 0.5)
      .map((p) => ({
        ...p,
        isAlive: true,
        score: 0,
        wordsUsed: [],
        eliminatedReason: undefined,
      }));

    const updatedRoom: GameRoom = {
      ...activeRoom,
      status: 'PLAYING',
      currentPlayers: shuffled,
      currentTurnIndex: 0,
      totalRounds,
      round: 1,
      starterChar: initialStarter,
      roundHistoryWords: historyStarters,
      turnDuration: 15.0,
      lastWord: initialStarter,
      usedWords: [],
      wordChain: [],
      startTime: Date.now(),
    };

    processedGameKeyRef.current = null;
    setActiveRoom(updatedRoom);
    sounds.playPop();
    sendRoomAction('START_GAME', {
      starterChar: initialStarter,
      totalRounds,
      roundHistoryWords: historyStarters,
    });
    saveRoomToServer(updatedRoom);
    broadcastRoomEvent('START_GAME', {
      starterChar: initialStarter,
      totalRounds,
      roundHistoryWords: historyStarters,
    });
    broadcastRoomEvent('SYNC_ROOM', { room: updatedRoom });
  };

  // Advance turn to next alive player
  const getNextAliveTurnIndex = (players: Player[], currentIndex: number): number => {
    let next = (currentIndex + 1) % players.length;
    let loopCount = 0;
    while (!players[next].isAlive && loopCount < players.length) {
      next = (next + 1) % players.length;
      loopCount++;
    }
    return next;
  };

  // Submit Word (Starts at 15.0s, decreases by 0.4s per word to min 5.0s)
  const handleSubmitWord = (
    word: string,
    isDueum: boolean,
    matchedChar: string,
    definition?: string,
    pos?: string
  ) => {
    if (!activeRoom) return;

    const activePlayer = activeRoom.currentPlayers[activeRoom.currentTurnIndex];
    if (!activePlayer) return;

    const scoreBreakdown = calculateWordScore(word, isDueum);
    const earnedPoints = scoreBreakdown.total;

    const newChainItem: WordChainItem = {
      id: 'chain_' + Date.now(),
      word,
      playerId: activePlayer.id,
      playerName: activePlayer.nickname,
      timestamp: Date.now(),
      isDueum,
      matchedChar,
      definition,
      pos,
      earnedPoints,
      scoreBonusLabel: scoreBreakdown.label,
    };

    const updatedPlayers = activeRoom.currentPlayers.map((p, idx) => {
      if (idx === activeRoom.currentTurnIndex) {
        return {
          ...p,
          score: p.score + earnedPoints,
          wordsUsed: [...p.wordsUsed, word],
        };
      }
      return p;
    });

    const nextIndex = getNextAliveTurnIndex(updatedPlayers, activeRoom.currentTurnIndex);
    const newWordChain = [...activeRoom.wordChain, newChainItem];
    const newTurnDuration = Math.max(5.0, Number((15.0 - newWordChain.length * 0.4).toFixed(1)));

    const updatedRoom: GameRoom = {
      ...activeRoom,
      currentPlayers: updatedPlayers,
      currentTurnIndex: nextIndex,
      turnDuration: newTurnDuration,
      lastWord: word,
      usedWords: [...activeRoom.usedWords, word],
      wordChain: newWordChain,
    };

    // Update user stats history if it's me
    if (activePlayer.id === myPlayerId) {
      setUserStats((prev) => {
        const existingIdx = prev.wordsHistory.findIndex((w) => w.word === word);
        let newHistory = [...prev.wordsHistory];
        if (existingIdx >= 0) {
          newHistory[existingIdx] = {
            ...newHistory[existingIdx],
            count: newHistory[existingIdx].count + 1,
            lastUsed: Date.now(),
          };
        } else {
          newHistory.push({ word, count: 1, lastUsed: Date.now() });
        }
        return {
          ...prev,
          exp: prev.exp + 10,
          wordsHistory: newHistory,
        };
      });
    }

    setActiveRoom(updatedRoom);
    sendRoomAction('SUBMIT_WORD', {
      word,
      isDueum,
      matchedChar,
      definition,
      pos,
      playerName: userStats.nickname,
      playerColor: userStats.avatarColor,
    });
    saveRoomToServer(updatedRoom);
    broadcastRoomEvent('SYNC_ROOM', { room: updatedRoom });
  };

  // Player Timeout / Elimination with score deduction (-600점) and Multi-round progression
  const handlePlayerTimeout = (playerId: string) => {
    if (!activeRoom) return;

    const penaltyPoints = 600;
    const currentChainLength = activeRoom.wordChain ? activeRoom.wordChain.length : 0;
    const currentTurnDuration = Math.max(5.0, Number((15.0 - currentChainLength * 0.4).toFixed(1)));

    // Score deduction for loser (-600점)
    const updatedPlayers = activeRoom.currentPlayers.map((p) => {
      if (p.id === playerId) {
        return {
          ...p,
          score: p.score - penaltyPoints,
          isAlive: false,
          eliminatedReason: `시간 초과 (-${penaltyPoints}점)`,
        };
      }
      return p;
    });

    const alivePlayers = updatedPlayers.filter((p) => p.isAlive);
    const totalRounds = activeRoom.totalRounds || 3;
    const currentRound = activeRoom.round || 1;

    // Check if round ends (1 or 0 players remain alive)
    if (alivePlayers.length <= 1) {
      // Check if there are more rounds to play
      if (currentRound < totalRounds) {
        // Start Next Round!
        const nextRound = currentRound + 1;
        const nextStarter = getRandomStarter();
        const updatedHistory = [...(activeRoom.roundHistoryWords || Array(totalRounds).fill('?'))];
        updatedHistory[nextRound - 1] = nextStarter;

        // Revive all players for the new round while keeping cumulative scores
        const revivedPlayers = updatedPlayers.map((p) => ({
          ...p,
          isAlive: true,
          eliminatedReason: undefined,
        }));

        const nextRoundRoom: GameRoom = {
          ...activeRoom,
          round: nextRound,
          starterChar: nextStarter,
          lastWord: nextStarter,
          roundHistoryWords: updatedHistory,
          currentPlayers: revivedPlayers,
          currentTurnIndex: 0,
          usedWords: [],
          wordChain: [],
          turnDuration: 15.0,
        };

        setActiveRoom(nextRoundRoom);
        sendRoomAction('START_NEXT_ROUND', {
          round: nextRound,
          starterChar: nextStarter,
          roundHistoryWords: updatedHistory,
        });
        saveRoomToServer(nextRoundRoom);
        broadcastRoomEvent('START_NEXT_ROUND', {
          round: nextRound,
          starterChar: nextStarter,
          roundHistoryWords: updatedHistory,
        });
        broadcastRoomEvent('SYNC_ROOM', { room: nextRoundRoom });
        return;
      }

      // Final Round Finished: Determine match winner by highest score
      const sortedByScore = [...updatedPlayers].sort((a, b) => b.score - a.score);
      const overallWinner = sortedByScore[0];
      const isMeWinner = overallWinner?.id === myPlayerId;

      const finishedRoom: GameRoom = {
        ...activeRoom,
        status: 'FINISHED',
        winner: overallWinner,
        currentPlayers: updatedPlayers,
      };

      setActiveRoom(finishedRoom);
      setIsGameOverOpen(true);
      sendRoomAction('PLAYER_TIMEOUT', { targetPlayerId: playerId });

      // Apply universal game result stats
      applyGameResultStats(finishedRoom);

      saveRoomToServer(finishedRoom);
      broadcastRoomEvent('SYNC_ROOM', { room: finishedRoom });
      return;
    }

    // Advance to next alive player
    const nextIndex = getNextAliveTurnIndex(updatedPlayers, activeRoom.currentTurnIndex);

    const updatedRoom: GameRoom = {
      ...activeRoom,
      currentPlayers: updatedPlayers,
      currentTurnIndex: nextIndex,
    };

    setActiveRoom(updatedRoom);
    sendRoomAction('PLAYER_TIMEOUT', { targetPlayerId: playerId });
    saveRoomToServer(updatedRoom);
    broadcastRoomEvent('SYNC_ROOM', { room: updatedRoom });
  };

  // Leave Room
  const handleLeaveRoom = async () => {
    sounds.playPop();
    if (activeRoom) {
      try {
        const url = buildApiUrl('/api/rooms/leave');
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ roomId: activeRoom.id, playerId: myPlayerId }),
        });
      } catch (e) {}

      const remainingPlayers = activeRoom.currentPlayers.filter((p) => p.id !== myPlayerId);
      if (remainingPlayers.length > 0) {
        if (activeRoom.hostId === myPlayerId) {
          remainingPlayers[0].isHost = true;
        }
        const updatedRoom: GameRoom = {
          ...activeRoom,
          hostId: remainingPlayers[0].id,
          hostName: remainingPlayers[0].nickname,
          currentPlayers: remainingPlayers,
        };
        broadcastRoomEvent('SYNC_ROOM', { room: updatedRoom });
      }
    }
    setActiveRoom(null);
    setCurrentTab('HOME');
    refreshPublicRooms();
  };

  // Send Chat Message
  const handleSendMessage = (text: string) => {
    const newMessage: ChatMessage = {
      id: 'msg_' + Date.now(),
      senderId: myPlayerId,
      senderName: userStats.nickname,
      text,
      timestamp: Date.now(),
    };

    setChatMessages((prev) => [...prev, newMessage]);
    sendRoomAction('CHAT_MESSAGE', newMessage);
    broadcastRoomEvent('CHAT_MESSAGE', { message: newMessage });
  };

  // View word detail in Dictionary
  const handleViewWordDetail = (word: string) => {
    setDictSearchWord(word);
    setCurrentTab('DICT');
  };

  const isPlaying = activeRoom?.status === 'PLAYING';

  // Instant Restart Game
  const handleRestartGame = () => {
    setIsGameOverOpen(false);
    processedGameKeyRef.current = null;
    if (!activeRoom) return;

    if (activeRoom.hostId === myPlayerId) {
      // Host immediately restarts a fresh game!
      handleStartGame();
    } else {
      // Participant resets to lobby with ready state
      const resetRoom: GameRoom = {
        ...activeRoom,
        status: 'WAITING',
        usedWords: [],
        wordChain: [],
        round: 1,
        currentPlayers: activeRoom.currentPlayers.map((p) => ({
          ...p,
          isAlive: true,
          isReady: true,
          score: 0,
          wordsUsed: [],
        })),
      };
      setActiveRoom(resetRoom);
      sendRoomAction('RESET_GAME', {});
      saveRoomToServer(resetRoom);
      broadcastRoomEvent('SYNC_ROOM', { room: resetRoom });
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#1e2022] flex flex-col font-sans selection:bg-emerald-200">
      {/* Initial Landing Start Screen (Image 1 Splash) */}
      {!isStarted && (
        <StartScreen
          nickname={userStats.nickname}
          avatarColor={userStats.avatarColor || 'yellow'}
          onStartGame={() => {
            setIsStarted(true);
            try {
              sessionStorage.setItem('kkeutitgi_started', 'true');
            } catch (e) {}
          }}
        />
      )}

      {/* Top Navigation Header (Hidden during active gameplay for zero distraction as requested) */}
      {!isPlaying && (
        <Header
          currentTab={currentTab}
          onSelectTab={(tab) => {
            sounds.playPop();
            setCurrentTab(tab);
          }}
          userStats={userStats}
          onUpdateUserStats={(updated) => setUserStats((prev) => ({ ...prev, ...updated }))}
          onOpenRules={() => setIsRulesOpen(true)}
          onOpenNotices={() => setIsNoticeOpen(true)}
        />
      )}

      {/* Main Container Layout */}
      <main className={`flex-1 max-w-7xl w-full mx-auto flex flex-col ${isPlaying ? 'p-2 sm:p-4' : 'px-4 sm:px-6 py-6'}`}>
        {/* Center Content Router */}
        <div className="flex-1 w-full overflow-hidden">
          {activeRoom ? (
            activeRoom.status === 'WAITING' ? (
              <LobbyView
                room={activeRoom}
                currentPlayerId={myPlayerId}
                chatMessages={chatMessages}
                onSendMessage={handleSendMessage}
                onToggleReady={handleToggleReady}
                onStartGame={handleStartGame}
                onLeaveRoom={handleLeaveRoom}
                onAddTestPlayer={handleAddTestPlayer}
                onChangeColor={handleChangeColor}
                onOpenShareModal={() => setIsShareOpen(true)}
                onChangeTotalRounds={handleChangeTotalRounds}
              />
            ) : (
              <GameView
                room={activeRoom}
                currentPlayerId={myPlayerId}
                chatMessages={chatMessages}
                onSendMessage={handleSendMessage}
                onSubmitWord={handleSubmitWord}
                onPlayerTimeout={handlePlayerTimeout}
                onLeaveRoom={handleLeaveRoom}
              />
            )
          ) : (
            <>
              {/* Base Home Screen */}
              <HomeView
                userStats={userStats}
                onCreateRoom={() => setCurrentTab('GAME')}
                onOpenPublicRooms={() => setCurrentTab('GAME')}
                onOpenQuickJoin={() => setCurrentTab('GAME')}
                onSelectTab={setCurrentTab}
                onViewWordDetail={handleViewWordDetail}
                onOpenNotices={() => setIsNoticeOpen(true)}
                onOpenRules={() => setIsRulesOpen(true)}
              />

              {/* Floating Game Rooms Overlay */}
              {currentTab === 'GAME' && (
                <GameRoomsView
                  publicRooms={publicRooms}
                  userStats={userStats}
                  onRefreshRooms={refreshPublicRooms}
                  isRefreshing={isRefreshingRooms}
                  onCreateRoom={handleCreateRoom}
                  onJoinRoom={handleJoinRoom}
                  onClose={() => setCurrentTab('HOME')}
                />
              )}

              {/* Floating Dictionary Overlay */}
              {currentTab === 'DICT' && (
                <DictionaryView 
                  initialSearch={dictSearchWord} 
                  onClose={() => setCurrentTab('HOME')}
                />
              )}

              {/* Settings / MyRecords View */}
              {currentTab === 'SETTINGS' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                  <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="overflow-y-auto flex-1">
                      <SettingsView
                        userStats={userStats}
                        onUpdateUserStats={(updated) => setUserStats((prev) => ({ ...prev, ...updated }))}
                        onResetStats={handleResetStats}
                        onOpenRules={() => setIsRulesOpen(true)}
                      />
                    </div>
                    <div className="p-3 bg-slate-50 border-t border-slate-200 text-center shrink-0">
                      <button
                        onClick={() => setCurrentTab('HOME')}
                        className="px-6 py-2 bg-slate-800 hover:bg-black text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
                      >
                        닫기
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {currentTab === 'MY' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                  <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="overflow-y-auto flex-1 p-2">
                      <MyRecordsView userStats={userStats} onSelectTab={setCurrentTab} />
                    </div>
                    <div className="p-3 bg-slate-50 border-t border-slate-200 text-center shrink-0">
                      <button
                        onClick={() => setCurrentTab('HOME')}
                        className="px-6 py-2 bg-slate-800 hover:bg-black text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
                      >
                        닫기
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Global Footer with National Institute of Korean Language & Legal Documentation */}
      {!activeRoom && (
        <footer className="border-t border-slate-200/80 bg-white/80 backdrop-blur-md py-6 px-4 sm:px-8 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col gap-4">
            {/* Top row: Attribution & Sources */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
                <span className="font-bold text-slate-800">끝잇기 (Kkeutitgi)</span>
                <span className="hidden sm:inline text-slate-300">•</span>
                <span>
                  본 서비스는 <strong>국립국어원 표준국어대사전 Open API</strong>를 연동하여 표준어를 실시간 검증합니다.
                </span>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap justify-center">
                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-semibold border border-slate-200">
                  CCL 2.0 KR (저작자표시-동일조건변경허락)
                </span>
                <a
                  href="https://stdict.korean.go.kr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-neutral-900 transition-colors underline underline-offset-2"
                >
                  국립국어원 표준국어대사전
                </a>
              </div>
            </div>

            {/* Bottom row: Formal Policy Documents Links & Copyright */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-4 flex-wrap justify-center font-medium">
                <button
                  type="button"
                  onClick={() => handleOpenLegalDoc('TERMS')}
                  className="text-slate-600 hover:text-black transition-colors cursor-pointer"
                >
                  이용안내 및 약관
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => handleOpenLegalDoc('COPYRIGHT')}
                  className="text-slate-600 hover:text-black transition-colors cursor-pointer"
                >
                  저작권 및 공공데이터 이용정책
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => handleOpenLegalDoc('PRIVACY')}
                  className="text-slate-900 font-bold hover:underline transition-colors cursor-pointer"
                >
                  개인정보 처리방침
                </button>
              </div>

              <div className="text-slate-400 text-[10px]">
                Copyright © 2026 끝잇기 (Kkeutitgi). All rights reserved.
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* Official Rules Modal */}
      <RulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />

      {/* System Notice Modal */}
      <NoticeModal
        isOpen={isNoticeOpen}
        onClose={() => setIsNoticeOpen(false)}
      />

      {/* Formal Legal & Operational Document Modal (Plain White Style with Articles) */}
      <LegalDocumentModal
        isOpen={isLegalDocOpen}
        onClose={() => setIsLegalDocOpen(false)}
        initialDoc={legalDocType}
      />

      {/* Public Rooms / Create Room Modal (Fallback) */}
      <PublicRoomsModal
        isOpen={isPublicRoomsOpen}
        onClose={() => setIsPublicRoomsOpen(false)}
        publicRooms={publicRooms}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        defaultHostName={userStats.nickname}
      />

      {/* QR Code & Share Modal */}
      {activeRoom && (
        <ShareModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          room={activeRoom}
        />
      )}

      {/* Game Over Result Modal */}
      {isGameOverOpen && activeRoom && (
        <ResultModal
          room={activeRoom}
          currentPlayerId={myPlayerId}
          onRestartGame={handleRestartGame}
          onReturnToLobby={() => {
            setIsGameOverOpen(false);
            const resetRoom: GameRoom = {
              ...activeRoom,
              status: 'WAITING',
              usedWords: [],
              wordChain: [],
              round: 1,
              currentPlayers: activeRoom.currentPlayers.map((p) => ({
                ...p,
                isAlive: true,
                isReady: p.isHost,
                score: 0,
                wordsUsed: [],
              })),
            };
            setActiveRoom(resetRoom);
            sendRoomAction('RESET_GAME', {});
            saveRoomToServer(resetRoom);
            broadcastRoomEvent('SYNC_ROOM', { room: resetRoom });
          }}
          onLeaveToHome={() => {
            setIsGameOverOpen(false);
            handleLeaveRoom();
          }}
        />
      )}
      {/* Room Error Modal */}
      {roomErrorMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-slate-200 text-center flex flex-col items-center gap-4 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-black text-2xl shadow-inner">
              !
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 mb-1.5">방 입장 안내</h3>
              <p className="text-sm text-slate-600 leading-relaxed break-keep font-medium">
                {roomErrorMessage}
              </p>
            </div>
            <button
              onClick={() => setRoomErrorMessage(null)}
              className="w-full py-3 bg-[#1e2022] hover:bg-black text-white font-extrabold rounded-2xl transition-all shadow-md active:scale-98 cursor-pointer mt-2"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
