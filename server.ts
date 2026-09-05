import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// 국립국어원 표준국어대사전 Open API 기본 인증키 (서버 환경변수 우선 적용)
const DEFAULT_STDICT_API_KEY = process.env.STDICT_API_KEY || '4AF7F0CC6C8C1EA6D482DA8D117613F4';

// In-memory active public rooms registry (Authoritative Server State)
interface ServerPlayer {
  id: string;
  nickname: string;
  avatarColor: string;
  isHost: boolean;
  isReady: boolean;
  isAlive: boolean;
  score: number;
  wordsUsed: string[];
  level: number;
  eliminatedReason?: string;
}

interface ServerGameRoom {
  id: string;
  title: string;
  hostId: string;
  hostName: string;
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
  currentPlayers: ServerPlayer[];
  maxPlayers: number;
  isPublic: boolean;
  turnDuration: number;
  round: number;
  totalRounds?: number;
  starterChar?: string;
  roundHistoryWords?: string[];
  currentTurnIndex: number;
  lastWord?: string;
  usedWords: string[];
  wordChain: any[];
  lastUpdated: number;
  createdAt: number;
}

const activeRoomsMap = new Map<string, ServerGameRoom>();

// SSE Connected Clients Map
const roomSseClientsMap = new Map<string, Set<express.Response>>();
const lobbySseClients = new Set<express.Response>();

// Broadcast to room clients
function broadcastToRoom(roomId: string, event: string, data: any) {
  const cleanId = String(roomId).trim().toUpperCase();
  const clients = roomSseClientsMap.get(cleanId);
  if (!clients || clients.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try {
      client.write(payload);
    } catch {
      clients.delete(client);
    }
  }
}

// Broadcast to lobby clients
function broadcastToLobby(event: string, data: any) {
  if (lobbySseClients.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of lobbySseClients) {
    try {
      client.write(payload);
    } catch {
      lobbySseClients.delete(client);
    }
  }
}

// Find room by code helper (trimmed, case-insensitive)
function findRoom(roomId: string): ServerGameRoom | undefined {
  if (!roomId) return undefined;
  const cleaned = String(roomId).trim().toUpperCase();
  const direct = activeRoomsMap.get(cleaned);
  if (direct) return direct;
  for (const [id, room] of activeRoomsMap.entries()) {
    if (String(id).trim().toUpperCase() === cleaned) {
      return room;
    }
  }
  return undefined;
}

// Clean up stale rooms (older than 2 hours without update)
setInterval(() => {
  const now = Date.now();
  for (const [id, room] of activeRoomsMap.entries()) {
    if (now - (room.lastUpdated || room.createdAt) > 2 * 60 * 60 * 1000) {
      activeRoomsMap.delete(id);
      broadcastToLobby('ROOMS_UPDATED', { rooms: getPublicRoomsList() });
    }
  }
}, 60000);

function getPublicRoomsList(): ServerGameRoom[] {
  return Array.from(activeRoomsMap.values()).filter(
    (r) => r.isPublic !== false && r.status !== 'FINISHED'
  );
}

// API: List all active public rooms
app.get('/api/rooms', (req, res) => {
  res.json({ rooms: getPublicRoomsList() });
});

// API: SSE Stream for Lobby Room List
app.get('/api/rooms/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  lobbySseClients.add(res);
  res.write(`event: ROOMS_UPDATED\ndata: ${JSON.stringify({ rooms: getPublicRoomsList() })}\n\n`);

  const keepAlive = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(keepAlive);
      lobbySseClients.delete(res);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
    lobbySseClients.delete(res);
  });
});

// API: Get specific room by ID
app.get('/api/rooms/:id', (req, res) => {
  const room = findRoom(req.params.id);
  if (!room) {
    return res.status(404).json({ error: '방을 찾을 수 없습니다.' });
  }
  res.json({ room });
});

// Helper function: Process a player leaving a room (manual exit or disconnection)
function handlePlayerLeave(roomId: string, playerId: string, isDisconnect = false): { success: boolean; roomDeleted: boolean; room?: ServerGameRoom } {
  const room = findRoom(roomId);
  if (!room) return { success: false, roomDeleted: true };

  const leavingPlayer = room.currentPlayers.find((p) => p.id === playerId);
  if (!leavingPlayer) return { success: true, roomDeleted: false, room };

  // Remove the player from currentPlayers
  room.currentPlayers = room.currentPlayers.filter((p) => p.id !== playerId);

  // Check if any human players remain in the room
  const remainingHumans = room.currentPlayers.filter((p) => !p.id.startsWith('bot_'));

  // If no players remain or only bots remain without any humans -> delete room immediately!
  if (room.currentPlayers.length === 0 || remainingHumans.length === 0) {
    activeRoomsMap.delete(room.id);
    roomSseClientsMap.delete(room.id);
    broadcastToLobby('ROOMS_UPDATED', { rooms: getPublicRoomsList() });
    return { success: true, roomDeleted: true };
  }

  // If the leaving player was the host, transfer host leadership to the next remaining human (or first player)
  let hostTransferred = false;
  let newHost = remainingHumans[0] || room.currentPlayers[0];
  if (room.hostId === playerId) {
    room.currentPlayers.forEach((p) => {
      p.isHost = p.id === newHost.id;
    });
    room.hostId = newHost.id;
    room.hostName = newHost.nickname;
    hostTransferred = true;
  }

  // If game was playing and a player left:
  if (room.status === 'PLAYING') {
    const alivePlayers = room.currentPlayers.filter((p) => p.isAlive);
    if (alivePlayers.length <= 1) {
      room.status = 'FINISHED';
    } else {
      if (room.currentTurnIndex >= room.currentPlayers.length) {
        room.currentTurnIndex = 0;
      }
      // If the current turn was the leaving player, advance to the next alive player
      const currentTurnPlayer = room.currentPlayers[room.currentTurnIndex];
      if (!currentTurnPlayer || !currentTurnPlayer.isAlive) {
        let nextIdx = room.currentTurnIndex;
        for (let i = 0; i < room.currentPlayers.length; i++) {
          nextIdx = (nextIdx + 1) % room.currentPlayers.length;
          if (room.currentPlayers[nextIdx].isAlive) {
            room.currentTurnIndex = nextIdx;
            break;
          }
        }
      }
    }
  }

  room.lastUpdated = Date.now();
  activeRoomsMap.set(room.id, room);

  broadcastToRoom(room.id, 'SYNC_ROOM', { room });
  broadcastToRoom(room.id, 'CHAT_MESSAGE', {
    message: {
      id: 'sys_' + Date.now(),
      senderId: 'SYSTEM',
      senderName: '시스템',
      text: `${leavingPlayer.nickname}님이 ${isDisconnect ? '연결 종료로 퇴장하셨습니다.' : '퇴장하셨습니다.'}${hostTransferred ? ` (새 방장: ${newHost.nickname}님)` : ''}`,
      timestamp: Date.now(),
      isSystem: true,
    },
  });

  broadcastToLobby('ROOMS_UPDATED', { rooms: getPublicRoomsList() });
  return { success: true, roomDeleted: false, room };
}

// API: SSE Stream for specific room
app.get('/api/rooms/:id/stream', (req, res) => {
  const roomId = String(req.params.id).trim().toUpperCase();
  const playerId = req.query.playerId ? String(req.query.playerId).trim() : undefined;
  const room = findRoom(roomId);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  if (!roomSseClientsMap.has(roomId)) {
    roomSseClientsMap.set(roomId, new Set());
  }
  const clientSet = roomSseClientsMap.get(roomId)!;
  clientSet.add(res);

  if (room) {
    res.write(`event: SYNC_ROOM\ndata: ${JSON.stringify({ room })}\n\n`);
  }

  const keepAlive = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(keepAlive);
      clientSet.delete(res);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
    clientSet.delete(res);
    if (clientSet.size === 0) {
      roomSseClientsMap.delete(roomId);
    }

    // If a specific player disconnected from SSE, check if all connections dropped and clean up if needed
    if (playerId) {
      setTimeout(() => {
        const checkRoom = findRoom(roomId);
        if (checkRoom) {
          const currentClients = roomSseClientsMap.get(roomId)?.size ?? 0;
          if (currentClients === 0) {
            handlePlayerLeave(roomId, playerId, true);
          }
        }
      }, 10000);
    }
  });
});

function generate4DigitNumericRoomId(): string {
  for (let i = 0; i < 100; i++) {
    const id = Math.floor(1000 + Math.random() * 9000).toString();
    if (!activeRoomsMap.has(id)) return id;
  }
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// API: Create new room
app.post('/api/rooms/create', (req, res) => {
  const { roomId: requestedRoomId, title, maxPlayers, isPublic, hostPlayer } = req.body;
  if (!hostPlayer || !hostPlayer.id) {
    return res.status(400).json({ error: '호스트 정보가 누락되었습니다.' });
  }

  const roomId = requestedRoomId
    ? String(requestedRoomId).trim().toUpperCase()
    : generate4DigitNumericRoomId();

  const newRoom: ServerGameRoom = {
    id: roomId,
    title: title || `${hostPlayer.nickname}님의 방`,
    hostId: hostPlayer.id,
    hostName: hostPlayer.nickname,
    status: 'WAITING',
    currentPlayers: [
      {
        ...hostPlayer,
        isHost: true,
        isReady: true,
        isAlive: true,
        score: 0,
        wordsUsed: [],
      },
    ],
    maxPlayers: maxPlayers || 8,
    isPublic: isPublic !== false,
    turnDuration: 15.0, // Starts at 15.0s, decreases by 0.2s down to 5.0s
    round: 1,
    currentTurnIndex: 0,
    usedWords: [],
    wordChain: [],
    lastUpdated: Date.now(),
    createdAt: Date.now(),
  };

  activeRoomsMap.set(roomId, newRoom);
  broadcastToLobby('ROOMS_UPDATED', { rooms: getPublicRoomsList() });

  res.json({ success: true, room: newRoom });
});

// API: Save or Update full room state
app.post('/api/rooms/save', (req, res) => {
  const room = req.body as ServerGameRoom;
  if (!room || !room.id) {
    return res.status(400).json({ error: 'Missing room data' });
  }

  const roomId = String(room.id).trim().toUpperCase();
  const existing = findRoom(roomId);
  const updatedRoom: ServerGameRoom = {
    ...room,
    id: roomId,
    lastUpdated: Date.now(),
    createdAt: existing?.createdAt || room.createdAt || Date.now(),
  };

  activeRoomsMap.set(roomId, updatedRoom);
  broadcastToRoom(roomId, 'SYNC_ROOM', { room: updatedRoom });
  broadcastToLobby('ROOMS_UPDATED', { rooms: getPublicRoomsList() });

  res.json({ success: true, room: updatedRoom });
});

// API: Join room on server (Supports new joins & seamless reconnects)
app.post('/api/rooms/join', (req, res) => {
  const { roomId, player } = req.body;
  if (!roomId || !player || !player.id) {
    return res.status(400).json({ error: '방 코드와 플레이어 정보가 필요합니다.' });
  }

  const cleanId = String(roomId).trim().toUpperCase();
  let room = findRoom(cleanId);
  if (!room) {
    return res.status(404).json({ error: `방 코드 [${cleanId}]에 해당하는 대기실이 존재하지 않거나 종료되었습니다.` });
  }

  const alreadyInRoom = room.currentPlayers.some((p) => p.id === player.id);

  // If game is in progress and player was not already in the room, reject
  if (room.status === 'PLAYING' && !alreadyInRoom) {
    return res.status(400).json({ error: '현재 게임이 진행 중인 방입니다. 다음 판에 참여해주세요.' });
  }

  if (!alreadyInRoom) {
    if (room.currentPlayers.length >= room.maxPlayers) {
      return res.status(400).json({ error: '방 인원이 가득 찼습니다 (만원).' });
    }
    const isFirst = room.currentPlayers.length === 0;
    room.currentPlayers.push({
      id: player.id,
      nickname: player.nickname || '손님',
      avatarColor: player.avatarColor || 'white',
      isHost: isFirst,
      isReady: isFirst,
      isAlive: true,
      score: 0,
      wordsUsed: [],
      level: player.level || 1,
    });
    if (isFirst) {
      room.hostId = player.id;
      room.hostName = player.nickname || '손님';
    }
  } else {
    // Reconnecting player: update information & ensure alive
    room.currentPlayers = room.currentPlayers.map((p) =>
      p.id === player.id
        ? {
            ...p,
            nickname: player.nickname || p.nickname,
            avatarColor: player.avatarColor || p.avatarColor,
            level: player.level || p.level,
          }
        : p
    );
  }

  room.lastUpdated = Date.now();
  activeRoomsMap.set(room.id, room);

  broadcastToRoom(room.id, 'SYNC_ROOM', { room });
  broadcastToRoom(room.id, 'CHAT_MESSAGE', {
    message: {
      id: 'sys_' + Date.now(),
      senderId: 'SYSTEM',
      senderName: '시스템',
      text: `${player.nickname || '손님'}님이 방에 ${alreadyInRoom ? '다시 연결' : '입장'}하셨습니다.`,
      timestamp: Date.now(),
      isSystem: true,
    },
  });
  broadcastToLobby('ROOMS_UPDATED', { rooms: getPublicRoomsList() });

  res.json({ success: true, room });
});

// API: Execute in-room action (Ready, Start, SubmitWord, Timeout, Chat, Leave, ChangeColor, AddBot)
app.post('/api/rooms/:id/action', (req, res) => {
  const roomId = String(req.params.id).trim().toUpperCase();
  const { action, payload, senderId } = req.body;
  const room = findRoom(roomId);

  if (!room) {
    return res.status(404).json({ error: '방을 찾을 수 없습니다.' });
  }

  if (action === 'TOGGLE_READY') {
    room.currentPlayers = room.currentPlayers.map((p) =>
      p.id === senderId ? { ...p, isReady: !p.isReady } : p
    );
  } else if (action === 'CHANGE_COLOR') {
    const { avatarColor } = payload || {};
    if (avatarColor) {
      room.currentPlayers = room.currentPlayers.map((p) =>
        p.id === senderId ? { ...p, avatarColor } : p
      );
    }
  } else if (action === 'ADD_BOT') {
    if (room.currentPlayers.length < room.maxPlayers) {
      const botNames = ['토끼봇', '단어장인', '호랑이', '사전박사', '열공이', '끝말러'];
      const botColors = ['yellow', 'mint', 'pink', 'purple', 'blue', 'orange'];
      const randomName = botNames[Math.floor(Math.random() * botNames.length)];
      const randomColor = botColors[Math.floor(Math.random() * botColors.length)];
      const botId = 'bot_' + Math.random().toString(36).substring(2, 7);

      const botPlayer: ServerPlayer = {
        id: botId,
        nickname: `${randomName}#${Math.floor(10 + Math.random() * 90)}`,
        avatarColor: randomColor,
        isHost: false,
        isReady: true,
        isAlive: true,
        score: 0,
        wordsUsed: [],
        level: Math.floor(1 + Math.random() * 6),
      };
      room.currentPlayers.push(botPlayer);
    }
  } else if (action === 'START_GAME') {
    if (room.hostId === senderId && room.currentPlayers.length >= 2) {
      const { starterChar, totalRounds, roundHistoryWords } = payload || {};
      const actualStarter = starterChar || '수';
      const actualTotalRounds = totalRounds || room.totalRounds || 3;
      const actualHistory = roundHistoryWords || [actualStarter, ...Array(actualTotalRounds - 1).fill('?')];

      room.status = 'PLAYING';
      room.round = 1;
      room.totalRounds = actualTotalRounds;
      room.starterChar = actualStarter;
      room.roundHistoryWords = actualHistory;
      room.currentTurnIndex = 0;
      room.wordChain = [];
      room.usedWords = [];
      room.lastWord = actualStarter;
      room.turnDuration = 15.0;
      room.currentPlayers = room.currentPlayers.map((p) => ({
        ...p,
        isAlive: true,
        score: 0,
        wordsUsed: [],
        eliminatedReason: undefined,
      }));
    }
  } else if (action === 'START_NEXT_ROUND') {
    const { round, starterChar, roundHistoryWords } = payload || {};
    const nextRound = round || (room.round + 1);
    const nextStarter = starterChar || '벌';
    room.round = nextRound;
    room.starterChar = nextStarter;
    room.lastWord = nextStarter;
    if (roundHistoryWords) {
      room.roundHistoryWords = roundHistoryWords;
    } else {
      if (!room.roundHistoryWords) {
        room.roundHistoryWords = Array(room.totalRounds || 3).fill('?');
      }
      room.roundHistoryWords[nextRound - 1] = nextStarter;
    }
    room.currentPlayers = room.currentPlayers.map((p) => ({
      ...p,
      isAlive: true,
      eliminatedReason: undefined,
    }));
    room.currentTurnIndex = 0;
    room.wordChain = [];
    room.usedWords = [];
    room.turnDuration = 15.0;
  } else if (action === 'SUBMIT_WORD') {
    const { word, isDueum, matchedChar, definition, pos, playerName, playerColor } = payload;
    if (word && !room.usedWords.includes(word)) {
      const newItem = {
        id: 'w_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        word,
        playerId: senderId,
        playerName: playerName || '플레이어',
        playerColor: playerColor || 'white',
        isDueum: !!isDueum,
        matchedChar: matchedChar || word[0],
        definition: definition || '',
        pos: pos || '명사',
        timestamp: Date.now(),
      };

      room.wordChain.push(newItem);
      room.usedWords.push(word);
      room.lastWord = word;

      // Calculate dynamic turn duration: 15.0s -> 5.0s (-0.2s each word)
      const newDuration = Math.max(5.0, Number((15.0 - (room.wordChain.length * 0.2)).toFixed(1)));
      room.turnDuration = newDuration;

      // Update player score & wordsUsed (10 points per char + 5 dueum bonus)
      room.currentPlayers = room.currentPlayers.map((p) => {
        if (p.id === senderId) {
          return {
            ...p,
            score: p.score + word.length * 10 + (isDueum ? 5 : 0),
            wordsUsed: [...p.wordsUsed, word],
          };
        }
        return p;
      });

      // Advance turn index to next alive player
      const alivePlayers = room.currentPlayers.filter((p) => p.isAlive);
      if (alivePlayers.length > 1) {
        let nextIdx = (room.currentTurnIndex + 1) % room.currentPlayers.length;
        while (!room.currentPlayers[nextIdx].isAlive) {
          nextIdx = (nextIdx + 1) % room.currentPlayers.length;
        }
        room.currentTurnIndex = nextIdx;
      }
    }
  } else if (action === 'PLAYER_TIMEOUT') {
    const { targetPlayerId } = payload;
    const penaltyPoints = 100;
    room.currentPlayers = room.currentPlayers.map((p) =>
      p.id === targetPlayerId
        ? {
            ...p,
            score: p.score - penaltyPoints,
            isAlive: false,
            eliminatedReason: '시간 초과 (-100점)',
          }
        : p
    );

    const alive = room.currentPlayers.filter((p) => p.isAlive);
    const totalRounds = room.totalRounds || 3;
    const currentRound = room.round || 1;

    if (alive.length <= 1 && room.currentPlayers.length > 1) {
      if (currentRound < totalRounds) {
        // Round Finished -> Next Round with unified starter char
        const nextRound = currentRound + 1;
        const candidateStarters = ['수', '박', '벌', '꽃', '물', '하', '봄', '별', '달', '산', '해', '구', '눈'];
        const nextStarter = candidateStarters[Math.floor(Math.random() * candidateStarters.length)];

        if (!room.roundHistoryWords) {
          room.roundHistoryWords = Array(totalRounds).fill('?');
        }
        room.roundHistoryWords[nextRound - 1] = nextStarter;
        room.round = nextRound;
        room.starterChar = nextStarter;
        room.lastWord = nextStarter;
        room.currentPlayers = room.currentPlayers.map((p) => ({
          ...p,
          isAlive: true,
          eliminatedReason: undefined,
        }));
        room.currentTurnIndex = 0;
        room.usedWords = [];
        room.wordChain = [];
        room.turnDuration = 15.0;
      } else {
        // Game Finished
        room.status = 'FINISHED';
      }
    } else if (alive.length > 0) {
      let nextIdx = (room.currentTurnIndex + 1) % room.currentPlayers.length;
      while (!room.currentPlayers[nextIdx].isAlive) {
        nextIdx = (nextIdx + 1) % room.currentPlayers.length;
      }
      room.currentTurnIndex = nextIdx;
    }
  } else if (action === 'RESET_GAME') {
    room.status = 'WAITING';
    room.round = 1;
    room.currentTurnIndex = 0;
    room.wordChain = [];
    room.usedWords = [];
    room.lastWord = undefined;
    room.starterChar = undefined;
    room.turnDuration = 15.0;
    room.currentPlayers = room.currentPlayers.map((p) => ({
      ...p,
      isAlive: true,
      isReady: p.isHost,
      score: 0,
      wordsUsed: [],
      eliminatedReason: undefined,
    }));
  } else if (action === 'CHAT_MESSAGE') {
    broadcastToRoom(room.id, 'CHAT_MESSAGE', { message: payload });
    return res.json({ success: true });
  }

  room.lastUpdated = Date.now();
  activeRoomsMap.set(room.id, room);

  broadcastToRoom(room.id, 'SYNC_ROOM', { room });
  broadcastToLobby('ROOMS_UPDATED', { rooms: getPublicRoomsList() });

  res.json({ success: true, room });
});

// API: Leave room on server (Transfers host or deletes empty room immediately)
app.post('/api/rooms/leave', (req, res) => {
  const { roomId, playerId } = req.body;
  if (!roomId || !playerId) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const result = handlePlayerLeave(String(roomId).trim().toUpperCase(), String(playerId).trim(), false);
  res.json({ success: true, ...result });
});

// In-memory high-speed cache for dictionary lookups
const serverWordCache = new Map<string, any>();

// Helper to clean Korean dictionary headwords (removes -, --, _, ^, ㆍ, ~, spaces, numbers)
function cleanDictWord(rawWord: string): string {
  if (!rawWord) return '';
  return String(rawWord)
    .replace(/[0-9\-^_ㆍ~^ \t\r\n]/g, '')
    .trim();
}

// Science, Technology, and Common Compound Root terms for server-side fast verification
const SERVER_COMPOUND_ROOTS = new Set([
  '기체', '액체', '고체', '유체', '플라스마', '크로마토그래피', '분석', '분석법', '방정식', '증류', '증류법',
  '반응', '반응기', '합성', '합성물', '스펙트럼', '분광', '분광학', '분광분석', '센서', '시스템', '네트워크',
  '프로그래밍', '소프트웨어', '하드웨어', '알고리즘', '메커니즘', '프로세스', '인공지능', '머신러닝', '딥러닝',
  '블록체인', '데이터베이스', '시뮬레이션', '트랜지스터', '반도체', '초전도체', '전자기파', '양자역학', '핵융합',
  '상대성이론', '유전자', '재조합', '유전자재조합', '중합효소', '광합성', '미토콘드리아', '단백질', '탄수화물',
  '아미노산', '뉴클레오타이드', '인지질', '고분자', '나노기술', '바이오', '바이오테크', '신경망', '가속기',
  '발전기', '변압기', '원자로', '태양전지', '광전효과', '도플러효과', '엔트로피', '열역학', '유체역학', '전자기학',
  '미적분학', '선형대수', '확률통계', '화학반응', '촉매반응', '전기영동', '질량분석', '질량분석법', '원자흡광',
  '핵자기공명', '전자현미경', '초음파', '자기공명', '컴퓨터단층촬영', '인공위성', '우주정거장', '태양계',
  '은하계', '블랙홀', '중력파', '양자컴퓨터', '고속철도', '광통신', '이동통신', '클라우드', '빅데이터',
  '사물인터넷', '메타버스', '가상현실', '증강현실', '자율주행', '스마트폰', '전기자동차', '수소자동차',
  '신재생에너지', '태양광', '풍력발전', '수력발전', '지열발전', '조력발전', '탄소중립', '온실가스',
  '기후변화', '환경보호', '생태계', '생물다양성', '유전자변형', '줄기세포', '면역치료', '항생제', '백신'
]);

const SERVER_SINGLE_SUFFIXES = new Set([
  '법', '학', '론', '술', '가', '류', '화', '성', '력', '율', '적', '기', '관', '원', '실', '소',
  '자', '체', '물', '제', '품', '점', '장', '선', '회', '국', '방', '역', '판', '통', '증', '감',
  '분', '표', '비', '대', '상', '중', '하', '식', '각', '형', '극', '존', '권', '량', '도', '계'
]);

function serverDecomposeCompound(word: string): string[] | null {
  if (!word || word.length < 4) return null;
  const memo = new Map<string, string[] | null>();

  function helper(w: string): string[] | null {
    if (!w) return [];
    if (memo.has(w)) return memo.get(w)!;

    for (let len = Math.min(w.length, 12); len >= 2; len--) {
      const prefix = w.slice(0, len);
      if (SERVER_COMPOUND_ROOTS.has(prefix)) {
        if (len === w.length) {
          memo.set(w, [prefix]);
          return [prefix];
        }
        const rest = w.slice(len);
        if (rest.length === 1 && SERVER_SINGLE_SUFFIXES.has(rest)) {
          const res = [prefix, rest];
          memo.set(w, res);
          return res;
        }
        const sub = helper(rest);
        if (sub && sub.length > 0) {
          const res = [prefix, ...sub];
          memo.set(w, res);
          return res;
        }
      }
    }
    memo.set(w, null);
    return null;
  }

  const parts = helper(word);
  return parts && parts.length >= 2 ? parts : null;
}

// API: 국립국어원 표준국어대사전 Open API 실시간 단어 검색 & 검증 (동음이의어 및 다중 뜻풀이 전체 반환)
app.get('/api/dict/search', async (req, res) => {
  const rawQuery = String(req.query.q || '').trim();
  const word = cleanDictWord(rawQuery);
  const apiKey = DEFAULT_STDICT_API_KEY;

  if (!word) {
    return res.status(400).json({ error: '검색할 단어를 입력해주세요.' });
  }

  // 1. In-Memory Cache Check (0ms response)
  if (serverWordCache.has(word)) {
    const cached = serverWordCache.get(word);
    return res.json(cached);
  }

  // 2. Compound Word Scientific/Academic Tokenizer Check (0ms response)
  const compoundParts = serverDecomposeCompound(word);
  if (compoundParts) {
    const compoundResult = {
      found: true,
      items: [
        {
          id: `${word}-compound`,
          word: word,
          pos: '명사(합성어)',
          meaning: `${compoundParts.join(' + ')}: 결합된 표준 합성 명사 및 학술/전문 용어입니다.`,
          definitions: [`${compoundParts.join(' + ')}: 각 구성 형태소가 표준어에 부합하는 합성어입니다.`],
          senses: [
            {
              senseNo: 1,
              definition: `${compoundParts.join(' + ')}: 표준 합성 명사/전문용어.`,
              pos: '명사(합성어)',
              origin: '합성어',
            },
          ],
          length: word.length,
          firstChar: word[0],
          lastChar: word[word.length - 1],
          origin: '합성어',
          source: 'LEXICON',
        },
      ],
      total: 1,
      source: 'LEXICON',
      attribution: '표준 국어 합성어/전문용어',
    };
    serverWordCache.set(word, compoundResult);
    return res.json(compoundResult);
  }

  try {
    const apiItems: any[] = [];
    const seenIds = new Set<string>();

    // 3. Parallel Fetching with Fast Abort Timeout (Max 1200ms)
    const fetchWithTimeout = async (url: string, headers: Record<string, string> = {}) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1200);
      try {
        const response = await fetch(url, { headers, signal: controller.signal });
        clearTimeout(timeout);
        return response;
      } catch {
        clearTimeout(timeout);
        return null;
      }
    };

    const stdictStandardUrl = `https://stdict.korean.go.kr/api/search.do?key=${encodeURIComponent(
      apiKey
    )}&q=${encodeURIComponent(word)}&req_type=json&num=30`;

    const opendictUrl = `https://opendict.korean.go.kr/api/search?key=${encodeURIComponent(
      apiKey
    )}&q=${encodeURIComponent(word)}&req_type=json&num=20`;

    const wikiUrl = `https://ko.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=true&explaintext=true&titles=${encodeURIComponent(
      word
    )}&redirects=1&format=json`;

    const [stdRes, openRes, wikiRes] = await Promise.allSettled([
      fetchWithTimeout(stdictStandardUrl, { Accept: 'application/json' }),
      fetchWithTimeout(opendictUrl, { Accept: 'application/json' }),
      fetchWithTimeout(wikiUrl, { 'User-Agent': 'KkeutitgiBot/1.0 (Korean Word Chain Game)' }),
    ]);

    // Parse STDict results
    if (stdRes.status === 'fulfilled' && stdRes.value && stdRes.value.ok) {
      try {
        const text = await stdRes.value.text();
        const data = JSON.parse(text);
        if (data?.channel?.item && Array.isArray(data.channel.item)) {
          apiItems.push(...data.channel.item);
        } else if (data?.channel?.item && typeof data.channel.item === 'object') {
          apiItems.push(data.channel.item);
        }
      } catch {
        // ignore
      }
    }

    // Parse OpenDict results
    if (openRes.status === 'fulfilled' && openRes.value && openRes.value.ok) {
      try {
        const text = await openRes.value.text();
        const data = JSON.parse(text);
        if (data?.channel?.item && Array.isArray(data.channel.item)) {
          for (const item of data.channel.item) {
            if (!apiItems.some((ex) => (ex.target_code || ex.word) === (item.target_code || item.word))) {
              apiItems.push(item);
            }
          }
        } else if (data?.channel?.item && typeof data.channel.item === 'object') {
          apiItems.push(data.channel.item);
        }
      } catch {
        // ignore
      }
    }

    // 4. Map and Format Korean Dictionary Results
    if (apiItems.length > 0) {
      const formattedItems = apiItems
        .map((it: any, index: number) => {
          const cleanWord = cleanDictWord(it.word || word);
          if (!cleanWord) return null;

          const supNo = it.sup_no ? String(it.sup_no) : '';
          const itPos = it.pos && it.pos !== '품사 없음' ? it.pos : '명사';
          let itOrigin = it.origin || '';

          const itemSenses: Array<{
            senseNo?: number | string;
            definition: string;
            pos?: string;
            origin?: string;
            type?: string;
            link?: string;
          }> = [];

          if (Array.isArray(it.sense)) {
            it.sense.forEach((s: any, sIdx: number) => {
              const def = String(s.definition || '').trim();
              if (def) {
                if (!itOrigin && s.origin) itOrigin = s.origin;
                itemSenses.push({
                  senseNo: s.sense_no || sIdx + 1,
                  definition: def,
                  pos: itPos,
                  origin: s.origin || itOrigin || '표준어',
                  type: s.type || '일반어',
                  link: s.link || `https://stdict.korean.go.kr`,
                });
              }
            });
          } else if (it.sense && typeof it.sense === 'object') {
            const def = String(it.sense.definition || '').trim();
            if (def) {
              if (!itOrigin && it.sense.origin) itOrigin = it.sense.origin;
              itemSenses.push({
                senseNo: it.sense.sense_no || 1,
                definition: def,
                pos: itPos,
                origin: it.sense.origin || itOrigin || '표준어',
                type: it.sense.type || '일반어',
                link: it.sense.link || `https://stdict.korean.go.kr`,
              });
            }
          }

          const definitions = itemSenses.map((s, sIdx) => `${sIdx + 1}. ${s.definition}`);
          const primaryMeaning = itemSenses[0]?.definition || '국립국어원 표준국어대사전에 등재된 단어입니다.';

          return {
            id: `${cleanWord}-${supNo || index}-${it.target_code || index}`,
            word: cleanWord,
            supNo: supNo,
            pos: itPos,
            meaning: primaryMeaning,
            definitions: definitions.length > 0 ? definitions : [primaryMeaning],
            senses: itemSenses,
            length: cleanWord.length,
            firstChar: cleanWord[0],
            lastChar: cleanWord[cleanWord.length - 1],
            origin: itOrigin || '표준어',
            targetCode: it.target_code,
            source: 'STDICT' as const,
          };
        })
        .filter(Boolean);

      const uniqueItems: any[] = [];
      for (const item of formattedItems) {
        const uniqueKey = item.targetCode ? `tc_${item.targetCode}` : `${item.word}_${item.supNo}_${item.meaning.slice(0, 15)}`;
        if (!seenIds.has(uniqueKey)) {
          seenIds.add(uniqueKey);
          uniqueItems.push(item);
        }
      }

      uniqueItems.sort((a, b) => {
        if (a.word === word && b.word !== word) return -1;
        if (b.word === word && a.word !== word) return 1;
        if (a.word.startsWith(word) && !b.word.startsWith(word)) return -1;
        if (b.word.startsWith(word) && !a.word.startsWith(word)) return 1;
        return a.word.length - b.word.length;
      });

      if (uniqueItems.length > 0) {
        const responseData = {
          found: true,
          items: uniqueItems,
          total: uniqueItems.length,
          source: 'STDICT',
          attribution: '국립국어원 표준국어대사전 (CCL 2.0 KR)',
        };
        serverWordCache.set(word, responseData);
        return res.json(responseData);
      }
    }

    // 5. Parse Wikipedia Results
    if (wikiRes.status === 'fulfilled' && wikiRes.value && wikiRes.value.ok) {
      try {
        const wikiData = (await wikiRes.value.json()) as any;
        const pages = wikiData?.query?.pages || {};
        const pageId = Object.keys(pages)[0];

        if (pageId && pageId !== '-1') {
          const pageTitle = cleanDictWord(pages[pageId]?.title || word);
          const rawExtract = pages[pageId]?.extract || '';
          if (rawExtract.trim().length > 0) {
            let cleanMeaning = rawExtract
              .replace(/==.*?==/g, '')
              .replace(/\[\[.*?\]\]/g, '')
              .replace(/\n+/g, ' ')
              .trim();

            if (cleanMeaning.length > 250) {
              cleanMeaning = cleanMeaning.slice(0, 250) + '...';
            }

            const matchedWord = pageTitle || word;
            const wikiResponse = {
              found: true,
              items: [
                {
                  id: `${matchedWord}-wikipedia`,
                  word: matchedWord,
                  pos: '명사',
                  meaning: cleanMeaning,
                  definitions: [cleanMeaning],
                  senses: [
                    {
                      senseNo: 1,
                      definition: cleanMeaning,
                      pos: '명사',
                      origin: '한국어 표준 백과',
                    },
                  ],
                  length: matchedWord.length,
                  firstChar: matchedWord[0],
                  lastChar: matchedWord[matchedWord.length - 1],
                  origin: '한국어 표제어',
                  source: 'WIKTIONARY',
                },
              ],
              source: 'WIKTIONARY',
              attribution: '한국어 표준 백과사전 (CC-BY-SA 4.0)',
            };
            serverWordCache.set(word, wikiResponse);
            return res.json(wikiResponse);
          }
        }
      } catch {
        // ignore
      }
    }

    // Negative response caching (prevent repeated slow lookups for non-existent words)
    const notFoundResponse = {
      found: false,
      items: [],
      message: '국립국어원 표준국어대사전에 등재되지 않은 단어입니다.',
    };
    serverWordCache.set(word, notFoundResponse);
    return res.json(notFoundResponse);
  } catch (err: any) {
    console.error('Dictionary search exception:', err);
    res.status(500).json({ error: '사전 검색 중 오류가 발생했습니다.', details: err.message });
  }
});

// API: 국립국어원 표준국어대사전 실시간 단어 탐색 (무한 스크롤 및 전체 탐색용)
app.get('/api/dict/explore', async (req, res) => {
  const rawQuery = String(req.query.q || '').trim();
  const query = cleanDictWord(rawQuery);
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const num = Math.min(30, Math.max(10, parseInt(String(req.query.num || '20'), 10)));
  const apiKey = DEFAULT_STDICT_API_KEY;

  // Search keyword or cyclical seed prefixes across Korean syllables
  const SEED_PREFIXES = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하', '거', '너', '더', '러', '머', '버', '서', '어', '저', '처', '고', '노', '도', '로', '모', '보', '소', '오', '조', '초'];
  const searchChar = query || SEED_PREFIXES[(page - 1) % SEED_PREFIXES.length];

  try {
    const stdictUrl = `https://stdict.korean.go.kr/api/search.do?key=${encodeURIComponent(
      apiKey
    )}&q=${encodeURIComponent(
      searchChar
    )}&req_type=json&advanced=y&method=start&type1=word&start=${page}&num=${num}`;

    const response = await fetch(stdictUrl, {
      headers: { Accept: 'application/json' },
    });

    if (response.ok) {
      const text = await response.text();
      let apiItems: any[] = [];
      try {
        const data = JSON.parse(text);
        if (data?.channel?.item && Array.isArray(data.channel.item)) {
          apiItems = data.channel.item;
        } else if (data?.channel?.item && typeof data.channel.item === 'object') {
          apiItems = [data.channel.item];
        }
      } catch {
        // fallback
      }

      if (apiItems.length > 0) {
        const formattedWords = apiItems
          .map((it: any, idx: number) => {
            const cleanWord = cleanDictWord(it.word || '');
            if (!cleanWord || /[^가-힣]/.test(cleanWord)) return null;

            const supNo = it.sup_no ? String(it.sup_no) : '';
            const itPos = it.pos || '명사';
            let itOrigin = it.origin || '';

            const itemSenses: Array<{
              senseNo?: number | string;
              definition: string;
              pos?: string;
              origin?: string;
              type?: string;
              link?: string;
            }> = [];

            if (Array.isArray(it.sense)) {
              it.sense.forEach((s: any, sIdx: number) => {
                const def = String(s.definition || '').trim();
                if (def) {
                  if (!itOrigin && s.origin) itOrigin = s.origin;
                  itemSenses.push({
                    senseNo: s.sense_no || sIdx + 1,
                    definition: def,
                    pos: itPos,
                    origin: s.origin || itOrigin || '표준어',
                    type: s.type || '일반어',
                    link: s.link || `https://stdict.korean.go.kr`,
                  });
                }
              });
            } else if (it.sense && typeof it.sense === 'object') {
              const def = String(it.sense.definition || '').trim();
              if (def) {
                if (!itOrigin && it.sense.origin) itOrigin = it.sense.origin;
                itemSenses.push({
                  senseNo: it.sense.sense_no || 1,
                  definition: def,
                  pos: itPos,
                  origin: it.sense.origin || itOrigin || '표준어',
                  type: it.sense.type || '일반어',
                  link: it.sense.link || `https://stdict.korean.go.kr`,
                });
              }
            }

            const definitions = itemSenses.map((s, sIdx) => `${sIdx + 1}. ${s.definition}`);
            const primaryMeaning = itemSenses[0]?.definition || '국립국어원 표준국어대사전에 등재된 단어입니다.';

            return {
              id: `${cleanWord}-${supNo || idx}-${it.target_code || idx}`,
              word: cleanWord,
              supNo,
              pos: itPos,
              meaning: primaryMeaning,
              definitions: definitions.length > 0 ? definitions : [primaryMeaning],
              senses: itemSenses,
              length: cleanWord.length,
              firstChar: cleanWord[0],
              lastChar: cleanWord[cleanWord.length - 1],
              origin: itOrigin || '표준어',
              targetCode: it.target_code,
              source: 'STDICT' as const,
            };
          })
          .filter(Boolean);

        return res.json({
          words: formattedWords,
          hasMore: formattedWords.length >= num,
          page,
        });
      }
    }
  } catch (err: any) {
    console.error('Explore endpoint error:', err);
  }

  return res.json({ words: [], hasMore: false, page });
});

// Start server with Vite middleware (Dev) or Static files (Prod)
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`끝잇기 서버가 포트 ${PORT}에서 정상 실행 중입니다.`);
  });
}

startServer();
