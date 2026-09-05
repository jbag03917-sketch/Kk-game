import React from 'react';
import { X, Bell, Calendar, Sparkles } from 'lucide-react';

interface NoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NoticeModal: React.FC<NoticeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const notices = [
    {
      id: 1,
      title: '끝잇기(Kkeut-It-Gi) 공식 서비스 오픈 및 규칙 적용 안내',
      date: '2026.08.28',
      category: '공지',
      content:
        '안녕하세요! 실시간 2~8인 멀티플레이 한글 끝말잇기 서비스 [끝잇기]가 정식 오픈했습니다.\n' +
        '한국어 표준 두음법칙 (ㄹ→ㅇ/ㄴ, ㄴ→ㅇ)이 완벽히 적용되며, 5초 시간 제한 턴제 배틀을 지원합니다.',
    },
    {
      id: 2,
      title: '두음법칙 판정 엔진 v1.0.1 고도화 적용',
      date: '2026.08.28',
      category: '업데이트',
      content:
        '‘개나리 → 이발소’(리→이), ‘남녀 → 여우’(녀→여), ‘수락 → 낙원’(락→낙) 등\n' +
        '실제 끝말잇기에서 자주 사용되는 두음법칙 변환이 단어 첫 글자에 정상 반영되도록 판정 로직을 고도화하였습니다.',
    },
    {
      id: 3,
      title: '국립국어원 표준국어대사전 기반 단어 검증 시스템',
      date: '2026.08.27',
      category: '안내',
      content:
        '부적절한 단어, 비속어, 고유명사(인명/지명), 1글자 단어 등은 자동으로 필터링되며,\n' +
        '정식 사전에 등재된 표준어 및 외래어(라디오, 컴퓨터, 버스 등)는 모두 인정됩니다.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-purple-600" />
            <h2 className="font-extrabold text-base text-[#1e2022]">공지사항</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {notices.map((n) => (
            <div
              key={n.id}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-colors"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-extrabold text-[10px]">
                  {n.category}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">{n.date}</span>
              </div>
              <h3 className="font-extrabold text-sm text-[#1e2022] mb-2">{n.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line font-medium">
                {n.content}
              </p>
            </div>
          ))}
        </div>

        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#1e2022] hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
