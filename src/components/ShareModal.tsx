import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Share2, Users, ExternalLink } from 'lucide-react';
import { GameRoom } from '../types';
import { sounds } from '../lib/soundEffects';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: GameRoom;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, room }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${room.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    sounds.playPop();
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.id);
    setCopiedCode(true);
    sounds.playPop();
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 flex flex-col items-center animate-in zoom-in-95 duration-200">
        <div className="w-full flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-purple-600" />
            <h3 className="font-extrabold text-base text-[#1e2022]">친구 초대하기</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-sm flex items-center justify-center mb-4">
          <QRCodeSVG
            value={inviteUrl}
            size={160}
            level="M"
            includeMargin={false}
          />
        </div>

        <p className="text-xs text-slate-500 font-medium text-center mb-4">
          스마트폰 카메라로 QR 코드를 스캔하거나<br />
          아래 방 코드를 친구에게 알려주세요!
        </p>

        {/* Room Code Badge */}
        <div className="w-full bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] text-slate-400 font-bold">방 코드</div>
            <div className="font-mono font-black text-xl text-[#1e2022] tracking-wider">
              {room.id}
            </div>
          </div>
          <button
            onClick={handleCopyCode}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1 transition-colors"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? '복사됨' : '코드 복사'}</span>
          </button>
        </div>

        {/* Invite Link Copy */}
        <button
          onClick={handleCopyLink}
          className="w-full py-3 px-4 rounded-xl bg-[#1e2022] hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <ExternalLink className="w-4 h-4" />}
          <span>{copiedLink ? '초대 링크가 복사되었습니다!' : '초대 링크 복사하기'}</span>
        </button>
      </div>
    </div>
  );
};
