import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Music,
  Bell,
  Sliders,
  User,
  Sparkles,
  Check,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Play,
  Square,
  Flame,
  HelpCircle,
  Smartphone,
  Save,
} from 'lucide-react';
import { UserStats } from '../types';
import { sounds, SoundSettings } from '../lib/soundEffects';
import { MascotAvatar } from './MascotAvatar';

interface SettingsViewProps {
  userStats: UserStats;
  onUpdateUserStats: (updated: Partial<UserStats>) => void;
  onResetStats?: () => void;
  onOpenRules: () => void;
}

const RANDOM_ADJECTIVES = [
  '날쌘', '용감한', '달콤한', '슬기로운', '빛나는', '포근한', '신속한',
  '엉뚱한', '당당한', '즐거운', '따뜻한', '귀여운', '멋진', '신비한',
  '총명한', '친절한', '기운찬', '씩씩한', '행복한', '재빠른',
];

const RANDOM_NOUNS = [
  '토끼', '호랑이', '다람쥐', '여우', '사자', '판다', '수달',
  '부엉이', '표범', '고양이', '강아지', '별빛', '구름', '바람',
  '마법사', '탐험가', '국어왕', '단어장인', '끝말왕', '달인',
];

const AVATAR_COLORS = [
  { id: 'white', label: '순백 화이트', bg: 'bg-slate-100 border-slate-300', dot: 'bg-slate-200' },
  { id: 'yellow', label: '레몬 옐로우', bg: 'bg-amber-300 border-amber-400', dot: 'bg-amber-400' },
  { id: 'mint', label: '애플 민트', bg: 'bg-emerald-300 border-emerald-400', dot: 'bg-emerald-400' },
  { id: 'pink', label: '체리 핑크', bg: 'bg-pink-300 border-pink-400', dot: 'bg-pink-400' },
  { id: 'purple', label: '로열 퍼플', bg: 'bg-purple-300 border-purple-400', dot: 'bg-purple-400' },
  { id: 'orange', label: '선셋 오렌지', bg: 'bg-orange-300 border-orange-400', dot: 'bg-orange-400' },
  { id: 'blue', label: '오션 블루', bg: 'bg-blue-300 border-blue-400', dot: 'bg-blue-400' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  userStats,
  onUpdateUserStats,
  onResetStats,
  onOpenRules,
}) => {
  // Sound Engine Sync State
  const [soundSettings, setSoundSettings] = useState<SoundSettings>(sounds.getSettings());
  const [isBgmPlaying, setIsBgmPlaying] = useState<boolean>(false);

  // Profile Edit State
  const [nicknameInput, setNicknameInput] = useState(userStats.nickname);
  const [selectedColor, setSelectedColor] = useState(userStats.avatarColor);
  const [avatarExpression, setAvatarExpression] = useState<'happy' | 'thinking' | 'surprised' | 'defeated'>('happy');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [nicknameError, setNicknameError] = useState<string | null>(null);

  // Extra Preferences (Stored in localStorage)
  const [showDueumGuide, setShowDueumGuide] = useState<boolean>(() => {
    return localStorage.getItem('kkeutitgi_pref_dueum') !== 'false';
  });
  const [vibrateOnTurn, setVibrateOnTurn] = useState<boolean>(() => {
    return localStorage.getItem('kkeutitgi_pref_vibrate') !== 'false';
  });

  // Subscribe to real-time sound settings changes
  useEffect(() => {
    const unsub = sounds.subscribe((st) => {
      setSoundSettings(st);
    });
    return () => unsub();
  }, []);

  // Update input text when userStats prop updates
  useEffect(() => {
    setNicknameInput(userStats.nickname);
    setSelectedColor(userStats.avatarColor);
  }, [userStats.nickname, userStats.avatarColor]);

  // Handle Nickname Random Generator
  const handleGenerateRandomNickname = () => {
    const adj = RANDOM_ADJECTIVES[Math.floor(Math.random() * RANDOM_ADJECTIVES.length)];
    const noun = RANDOM_NOUNS[Math.floor(Math.random() * RANDOM_NOUNS.length)];
    const num = Math.floor(10 + Math.random() * 90);
    const newName = `${adj}${noun}${num}`;
    setNicknameInput(newName);
    setNicknameError(null);
    sounds.playPop();
    setAvatarExpression('surprised');
    setTimeout(() => setAvatarExpression('happy'), 600);
  };

  // Save Profile Changes
  const handleSaveProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = nicknameInput.trim();
    if (!trimmed) {
      setNicknameError('닉네임을 입력해 주세요.');
      sounds.playWrong();
      return;
    }
    if (trimmed.length < 2 || trimmed.length > 12) {
      setNicknameError('닉네임은 2자 이상 12자 이하로 설정해 주세요.');
      sounds.playWrong();
      return;
    }

    setNicknameError(null);
    onUpdateUserStats({
      nickname: trimmed,
      avatarColor: selectedColor,
    });

    sounds.playCorrect();
    setAvatarExpression('happy');
    setSaveSuccessMsg('프로필 설정이 안전하게 저장되었습니다!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Sound Controls Handlers
  const handleMasterVolumeChange = (val: number) => {
    sounds.setMasterVolume(val);
  };

  const handleBgmVolumeChange = (val: number) => {
    sounds.setBgmVolume(val);
  };

  const handleSfxVolumeChange = (val: number) => {
    sounds.setSfxVolume(val);
  };

  const handleToggleMute = () => {
    const next = !soundSettings.isMuted;
    sounds.setMuted(next);
    if (!next) sounds.playPop();
  };

  const handleToggleBgm = () => {
    const next = !soundSettings.isBgmEnabled;
    sounds.setBgmEnabled(next);
    if (next) sounds.playPop();
  };

  const handleToggleSfx = () => {
    const next = !soundSettings.isSfxEnabled;
    sounds.setSfxEnabled(next);
    if (next) sounds.playPop();
  };

  const handleToggleBgmPlayback = () => {
    if (isBgmPlaying) {
      sounds.stopBGM();
      setIsBgmPlaying(false);
    } else {
      sounds.startBGM('lobby');
      setIsBgmPlaying(true);
    }
  };

  // Extra Preferences
  const handleToggleDueum = () => {
    const next = !showDueumGuide;
    setShowDueumGuide(next);
    localStorage.setItem('kkeutitgi_pref_dueum', String(next));
    sounds.playPop();
  };

  const handleToggleVibrate = () => {
    const next = !vibrateOnTurn;
    setVibrateOnTurn(next);
    localStorage.setItem('kkeutitgi_pref_vibrate', String(next));
    sounds.playPop();
    if (next && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const handleResetData = () => {
    if (window.confirm('정말로 게임 기록 및 전적 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      if (onResetStats) {
        onResetStats();
      } else {
        localStorage.removeItem('kkeutitgi_user_stats');
        window.location.reload();
      }
      sounds.playWrong();
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 max-w-4xl mx-auto w-full pb-16">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sliders className="w-5 h-5 text-purple-600" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1e2022] tracking-tight">
              환경 및 프로필 설정
            </h1>
          </div>
          <p className="text-slate-500 text-sm font-medium">
            음향 볼륨, 배경음악(BGM), 효과음(SFX) 및 플레이어 닉네임과 아바타를 원하는 대로 설정하세요.
          </p>
        </div>

        {saveSuccessMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-bounce">
            <Check className="w-4 h-4 text-emerald-600" />
            {saveSuccessMsg}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ======================================================== */}
        {/* 1. 닉네임 & 캐릭터 프로필 설정 */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-[#1e2022]">
                  플레이어 프로필 설정
                </h2>
                <p className="text-xs text-slate-400">게임 및 대기방에서 표시될 이름과 캐릭터</p>
              </div>
            </div>

            {/* Avatar Mascot Preview */}
            <div className="bg-slate-50/80 rounded-2xl p-4 mb-5 border border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="relative group cursor-pointer" onClick={() => {
                const expressions: ('happy' | 'thinking' | 'surprised')[] = ['happy', 'thinking', 'surprised'];
                const nextExp = expressions[(expressions.indexOf(avatarExpression as any) + 1) % expressions.length];
                setAvatarExpression(nextExp);
                sounds.playPop();
              }}>
                <MascotAvatar
                  color={selectedColor}
                  size="xl"
                  expression={avatarExpression}
                />
                <span className="absolute -bottom-1 -right-1 bg-white text-[10px] font-bold text-slate-500 px-1.5 py-0.5 rounded-full border border-slate-200 shadow-xs">
                  터치해 표정 변경
                </span>
              </div>

              <div className="text-center sm:text-left">
                <div className="text-lg font-black text-[#1e2022]">
                  {userStats.nickname}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  승리 <strong>{userStats.wins}회</strong> • 승률 <strong>{userStats.winRate}%</strong> • 최고 연승 <strong>{userStats.maxStreak}연승</strong>
                </div>
              </div>
            </div>

            {/* Nickname Input Form */}
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>닉네임 (2 ~ 12자)</span>
                  <button
                    type="button"
                    onClick={handleGenerateRandomNickname}
                    className="text-xs text-purple-600 hover:text-purple-800 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    랜덤 생성
                  </button>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={nicknameInput}
                    onChange={(e) => {
                      setNicknameInput(e.target.value);
                      if (nicknameError) setNicknameError(null);
                    }}
                    maxLength={12}
                    placeholder="닉네임을 입력하세요"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 transition-all ${
                      nicknameError
                        ? 'border-red-300 focus:ring-red-400 bg-red-50/30'
                        : 'border-slate-200 focus:ring-purple-500 bg-white'
                    }`}
                  />
                  <span className="absolute right-3 top-3 text-[11px] font-semibold text-slate-400">
                    {nicknameInput.trim().length}/12
                  </span>
                </div>
                {nicknameError && (
                  <p className="text-xs font-bold text-red-500 mt-1 flex items-center gap-1">
                    • {nicknameError}
                  </p>
                )}
              </div>

              {/* Avatar Color Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  캐릭터 테마 색상 선택
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {AVATAR_COLORS.map((c) => {
                    const isSelected = selectedColor === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedColor(c.id);
                          sounds.playPop();
                        }}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-purple-600 bg-purple-50/50 ring-2 ring-purple-400'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border ${c.bg}`} />
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-purple-700' : 'text-slate-500'}`}>
                          {c.label.split(' ')[1] || c.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-[#1e2022] hover:bg-black text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs hover:shadow-md cursor-pointer transition-all active:scale-[0.99]"
                >
                  <Save className="w-4 h-4" />
                  프로필 변경사항 저장
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. 음향 & 오디오 볼륨 설정 (마스터 / BGM / SFX) */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[#1e2022]">
                    음향 및 볼륨 설정
                  </h2>
                  <p className="text-xs text-slate-400">브라우저 Web Audio 실시간 사운드 조절</p>
                </div>
              </div>

              {/* Master Mute Toggle Button */}
              <button
                type="button"
                onClick={handleToggleMute}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  soundSettings.isMuted
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {soundSettings.isMuted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    음소거 해제
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    전체 음소거
                  </>
                )}
              </button>
            </div>

            <div className="space-y-5">
              {/* 1. Master Volume Slider */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Sliders className="w-3.5 h-3.5 text-slate-500" />
                    마스터(전체) 볼륨
                  </div>
                  <span className="text-xs font-black text-slate-700 font-mono">
                    {soundSettings.isMuted ? '0%' : `${Math.round(soundSettings.masterVolume * 100)}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  disabled={soundSettings.isMuted}
                  value={soundSettings.masterVolume}
                  onChange={(e) => handleMasterVolumeChange(parseFloat(e.target.value))}
                  className="w-full accent-[#1e2022] cursor-pointer h-2 bg-slate-200 rounded-lg"
                />
              </div>

              {/* 2. BGM (배경음악) Section */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Music className="w-3.5 h-3.5 text-purple-600" />
                    배경음악 (BGM 노래)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleBgmPlayback}
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
                        isBgmPlaying
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      }`}
                    >
                      {isBgmPlaying ? <Square className="w-2.5 h-2.5 fill-current" /> : <Play className="w-2.5 h-2.5 fill-current" />}
                      {isBgmPlaying ? 'BGM 정지' : 'BGM 미리듣기'}
                    </button>
                    <button
                      type="button"
                      onClick={handleToggleBgm}
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-md transition-colors cursor-pointer ${
                        soundSettings.isBgmEnabled
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {soundSettings.isBgmEnabled ? '켜짐' : '꺼짐'}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1 font-semibold">
                  <span>음악 크기</span>
                  <span className="font-mono">{soundSettings.isBgmEnabled ? `${Math.round(soundSettings.bgmVolume * 100)}%` : '꺼짐'}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  disabled={soundSettings.isMuted || !soundSettings.isBgmEnabled}
                  value={soundSettings.bgmVolume}
                  onChange={(e) => handleBgmVolumeChange(parseFloat(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />
              </div>

              {/* 3. SFX (효과음) Section */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Bell className="w-3.5 h-3.5 text-amber-600" />
                    효과음 (SFX 사운드)
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleSfx}
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-md transition-colors cursor-pointer ${
                      soundSettings.isSfxEnabled
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {soundSettings.isSfxEnabled ? '켜짐' : '꺼짐'}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1 font-semibold">
                  <span>효과음 크기</span>
                  <span className="font-mono">{soundSettings.isSfxEnabled ? `${Math.round(soundSettings.sfxVolume * 100)}%` : '꺼짐'}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  disabled={soundSettings.isMuted || !soundSettings.isSfxEnabled}
                  value={soundSettings.sfxVolume}
                  onChange={(e) => handleSfxVolumeChange(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 rounded-lg mb-3"
                />

                {/* SFX Sample Test Buttons */}
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-[11px] font-bold text-slate-500 mb-1.5 block">
                    효과음 테스트
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => sounds.playCorrect()}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-slate-200 text-emerald-700 rounded-lg text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                    >
                      🔔 정답음
                    </button>
                    <button
                      type="button"
                      onClick={() => sounds.playWrong()}
                      className="px-2.5 py-1 bg-white hover:bg-rose-50 border border-slate-200 text-rose-700 rounded-lg text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                    >
                      ❌ 오답음
                    </button>
                    <button
                      type="button"
                      onClick={() => sounds.playPop()}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 text-indigo-700 rounded-lg text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                    >
                      🎈 팝/클릭
                    </button>
                    <button
                      type="button"
                      onClick={() => sounds.playJoin()}
                      className="px-2.5 py-1 bg-white hover:bg-purple-50 border border-slate-200 text-purple-700 rounded-lg text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                    >
                      👋 입장음
                    </button>
                    <button
                      type="button"
                      onClick={() => sounds.playVictory()}
                      className="px-2.5 py-1 bg-white hover:bg-amber-50 border border-slate-200 text-amber-700 rounded-lg text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                    >
                      🏆 승리음
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. 게임 편의 및 데이터 관리 카드 */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#1e2022]">
              게임 편의 기능 및 데이터 관리
            </h2>
            <p className="text-xs text-slate-400">게임 플레이 시 추가 도움말과 데이터 초기화</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Dueum Guide Switch */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-800 mb-0.5">
                두음법칙 자동 안내 가이드
              </div>
              <div className="text-[11px] text-slate-500">
                두음법칙 변환 가능 글자를 게임 화면에 시각적으로 안내합니다.
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleDueum}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                showDueumGuide ? 'bg-purple-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all shadow-xs ${
                  showDueumGuide ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Vibrate Switch */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-800 mb-0.5">
                내 턴 시작 진동 피드백 (모바일)
              </div>
              <div className="text-[11px] text-slate-500">
                모바일 환경에서 내 턴이 돌아왔을 때 부드러운 진동을 울립니다.
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleVibrate}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                vibrateOnTurn ? 'bg-purple-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all shadow-xs ${
                  vibrateOnTurn ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Bottom Actions: Rules View & Data Reset */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              sounds.playPop();
              onOpenRules();
            }}
            className="text-xs font-bold text-slate-600 hover:text-[#1e2022] flex items-center gap-1.5 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-purple-600" />
            국립국어원 표준 끝말잇기 공식 규칙 다시보기
          </button>

          <button
            type="button"
            onClick={handleResetData}
            className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1.5 cursor-pointer bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-xl transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            내 게임 전적/통계 초기화
          </button>
        </div>
      </div>
    </div>
  );
};
