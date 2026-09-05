import React, { useState } from 'react';
import { X, HelpCircle, Check, AlertTriangle, Sparkles, BookOpen, ShieldAlert } from 'lucide-react';
import { getValidStartingChars } from '../lib/hangulRules';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  const [testChar, setTestChar] = useState('리');

  if (!isOpen) return null;

  const dueumCandidates = getValidStartingChars(testChar);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-sm">
              🎮
            </span>
            <h2 className="font-extrabold text-base text-[#1e2022]">
              끝잇기 — 공식 게임 규칙 (14대 원칙)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700 leading-relaxed">
          {/* Summary Table (Section 13) */}
          <div className="bg-purple-50/60 rounded-2xl border border-purple-100 p-4">
            <h3 className="font-extrabold text-sm text-purple-950 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>핵심 규칙 요약</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-white p-2 rounded-xl border border-purple-200/60">
                <div className="text-[10px] text-slate-400 font-semibold">인원</div>
                <div className="font-bold text-slate-800">2~8명 (랜덤 순서)</div>
              </div>
              <div className="bg-white p-2 rounded-xl border border-purple-200/60">
                <div className="text-[10px] text-slate-400 font-semibold">제한 시간</div>
                <div className="font-bold text-rose-600 text-[11px]">15.0s → 5.0s (-0.4s/턴)</div>
              </div>
              <div className="bg-white p-2 rounded-xl border border-purple-200/60">
                <div className="text-[10px] text-slate-400 font-semibold">최소 단어</div>
                <div className="font-bold text-slate-800">2글자 이상</div>
              </div>
              <div className="bg-white p-2 rounded-xl border border-purple-200/60">
                <div className="text-[10px] text-slate-400 font-semibold">두음법칙</div>
                <div className="font-bold text-emerald-600">완벽 적용 ✅</div>
              </div>
            </div>
          </div>

          {/* Word Length Score Bonus Table */}
          <div className="bg-amber-50/70 rounded-2xl border border-amber-200/80 p-4">
            <h3 className="font-extrabold text-sm text-amber-950 mb-2 flex items-center gap-1.5">
              <span className="text-base">✨</span>
              <span>글자 수 비례 보너스 점수 시스템</span>
            </h3>
            <p className="text-slate-600 mb-3 text-xs">
              긴 단어를 구사할수록 폭발적으로 높은 점수와 승급 경험치를 획득합니다!
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                <div className="text-[10px] text-slate-500 font-semibold">2글자</div>
                <div className="font-extrabold text-slate-800 text-sm">30 pt</div>
                <div className="text-[9px] text-slate-400">기본</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                <div className="text-[10px] text-amber-700 font-semibold">3~4글자</div>
                <div className="font-extrabold text-purple-700 text-sm">55 ~ 90 pt</div>
                <div className="text-[9px] text-purple-600 font-bold">+10~30 보너스</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                <div className="text-[10px] text-amber-700 font-semibold">5~6글자</div>
                <div className="font-extrabold text-purple-700 text-sm">140 ~ 200 pt</div>
                <div className="text-[9px] text-purple-600 font-bold">+65~110 콤보</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-amber-200 bg-gradient-to-b from-amber-50 to-amber-100">
                <div className="text-[10px] text-amber-900 font-black">7글자 이상 (초장문)</div>
                <div className="font-extrabold text-amber-900 text-sm">270 ~ 360+ pt</div>
                <div className="text-[9px] text-amber-800 font-black">대폭발 보너스 🎉</div>
              </div>
            </div>
          </div>

          {/* Interactive Dueum Rule Section (Section 3 & 4) */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4">
            <h3 className="font-extrabold text-sm text-[#1e2022] mb-2 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-purple-600" />
              <span>3. 정통 한국어 두음법칙 시스템</span>
            </h3>
            <p className="text-slate-600 mb-3">
              특정 한자가 단어의 첫머리에 올 때 발음이 바뀌는 현상을 인정합니다. (단어 첫 글자에만 적용)
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="font-bold text-purple-700 text-xs mb-1">ㄹ → ㅇ / ㄴ 허용</div>
                <div className="space-y-0.5 text-[11px] text-slate-600">
                  <div>• <b>리 → 이</b> (개나리 → 이발소 ✅)</div>
                  <div>• <b>림 → 임</b>, <b>력 → 역</b>, <b>례 → 예</b></div>
                  <div>• <b>료 → 요</b>, <b>류 → 유</b>, <b>률 → 율</b></div>
                  <div>• <b>락 → 낙</b>, <b>로 → 노</b>, <b>래 → 내</b></div>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="font-bold text-purple-700 text-xs mb-1">ㄴ → ㅇ 허용</div>
                <div className="space-y-0.5 text-[11px] text-slate-600">
                  <div>• <b>녀 → 여</b> (남녀 → 여우 ✅)</div>
                  <div>• <b>뇨 → 요</b>, <b>뉴 → 유</b>, <b>니 → 이</b></div>
                  <div>• <b>냐 → 야</b>, <b>년 → 연</b>, <b>녕 → 영</b></div>
                </div>
              </div>
            </div>

            {/* Live Interactive Dueum Tester */}
            <div className="bg-purple-100/50 p-3 rounded-xl border border-purple-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 text-[11px]">끝 글자 테스트:</span>
                <div className="flex gap-1">
                  {['리', '녀', '락', '사', '림', '로'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setTestChar(c)}
                      className={`w-6 h-6 rounded-md font-extrabold text-xs transition-colors ${
                        testChar === c ? 'bg-purple-700 text-white' : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-purple-900">
                <span>연결 가능:</span>
                {dueumCandidates.map((c) => (
                  <span key={c} className="px-1.5 py-0.5 bg-white rounded border border-purple-300">
                    「{c}」
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Elimination Rules (Section 11) */}
          <div className="space-y-2">
            <h3 className="font-extrabold text-sm text-[#1e2022] flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>탈락 조건 및 허용 불가 단어</span>
            </h3>
            <ul className="space-y-1.5 text-slate-600 bg-rose-50/50 p-3.5 rounded-xl border border-rose-100">
              <li className="flex items-center gap-2">
                <span className="text-rose-500 font-bold">✕</span>
                <span><b>타임어택 제한 시간 초과 (15.0초~최저 5.0초)</b> 시 즉시 탈락</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-rose-500 font-bold">✕</span>
                <span><b>2글자 미만</b> 단어 불가 (예: 집 ❌, 물 ❌)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-rose-500 font-bold">✕</span>
                <span><b>중복 단어</b> 불가 (한 게임 내 이미 사용된 단어 재사용 불가)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-rose-500 font-bold">✕</span>
                <span><b>고유명사</b> 불가 (대한민국 ❌, 서울 ❌, 손흥민 ❌)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-rose-500 font-bold">✕</span>
                <span><b>숫자/특수문자/이모지/영문</b> 불가 (123 ❌, ㅋㅋㅋ ❌, ABC ❌)</span>
              </li>
              <li className="flex items-center gap-2 text-emerald-700 font-semibold">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>사전에 등록된 정식 외래어 및 한방 단어는 정상 단어로 인정</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#1e2022] hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};
