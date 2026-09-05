import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Share2, Link as LinkIcon } from 'lucide-react';
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
      <div className="bg-white rounded-3xl border border-slate-300 shadow-2xl max-w-sm w-full p-6 flex flex-col items-center animate-in zoom-in-95 duration-200">
        <div className="w-full flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-base text-black">친구 초대하기</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-black hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="p-4 bg-white rounded-2xl border-2 border-slate-300 shadow-sm flex items-center justify-center mb-3">
          <QRCodeSVG
            value={inviteUrl}
            size={160}
            level="M"
            includeMargin={false}
          />
        </div>

        <p className="text-xs text-slate-600 font-bold text-center mb-4 leading-relaxed">
          스마트폰 카메라로 QR 코드를 스캔하거나<br />
          아래 링크를 복사하여 친구에게 공유하세요!
        </p>

        {/* Dedicated Invite Link Copy Input Box (Directly Under QR Code) */}
        <div className="w-full bg-slate-50 p-2.5 rounded-2xl border border-slate-200 mb-3 space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
              <LinkIcon className="w-3.5 h-3.5 text-black" />
              초대 링크
            </span>
            {copiedLink && (
              <span className="text-[10px] text-emerald-600 font-black flex items-center gap-0.5">
                <Check className="w-3 h-3" /> 복사 완료!
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              onClick={handleCopyLink}
              className="flex-1 px-3 py-2 text-xs bg-white text-slate-700 font-medium rounded-xl border border-slate-200 focus:outline-none cursor-pointer select-all truncate"
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-2 rounded-xl bg-black hover:bg-slate-800 text-white text-xs font-black flex items-center gap-1 transition-all cursor-pointer shrink-0 active:scale-95 shadow-2xs"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? '복사됨' : '링크 복사'}</span>
            </button>
          </div>
        </div>

        {/* Room Code Badge */}
        <div className="w-full bg-slate-50 p-2.5 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div className="pl-1">
            <div className="text-[10px] text-slate-400 font-bold">방 코드 (4자리)</div>
            <div className="font-mono font-black text-lg text-black tracking-wider">
              {room.id}
            </div>
          </div>
          <button
            onClick={handleCopyCode}
            className="px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-black flex items-center gap-1 transition-colors cursor-pointer shadow-2xs active:scale-95"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-black" />}
            <span>{copiedCode ? '복사됨' : '코드 복사'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
