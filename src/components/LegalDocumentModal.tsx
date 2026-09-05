import React, { useState } from 'react';
import { X } from 'lucide-react';

export type LegalDocType = 'TERMS' | 'COPYRIGHT' | 'API_POLICY' | 'PRIVACY';

interface LegalDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDoc?: LegalDocType;
}

export const LegalDocumentModal: React.FC<LegalDocumentModalProps> = ({
  isOpen,
  onClose,
  initialDoc = 'TERMS',
}) => {
  const [activeDoc, setActiveDoc] = useState<LegalDocType>(initialDoc);

  React.useEffect(() => {
    if (isOpen && initialDoc) {
      setActiveDoc(initialDoc);
    }
  }, [isOpen, initialDoc]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60">
      <div className="bg-white text-neutral-900 w-full max-w-4xl max-h-[90vh] flex flex-col rounded-lg border border-neutral-300 shadow-xl overflow-hidden">
        {/* Modal Top Header - Strictly Monochrome & Minimal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-white">
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveDoc('TERMS')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeDoc === 'TERMS'
                  ? 'border-neutral-900 text-neutral-900 font-bold'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              이용안내 및 약관
            </button>
            <button
              type="button"
              onClick={() => setActiveDoc('COPYRIGHT')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeDoc === 'COPYRIGHT'
                  ? 'border-neutral-900 text-neutral-900 font-bold'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              저작권 및 공공데이터 이용정책
            </button>
            <button
              type="button"
              onClick={() => setActiveDoc('API_POLICY')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeDoc === 'API_POLICY'
                  ? 'border-neutral-900 text-neutral-900 font-bold'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              API 키 사용 안내
            </button>
            <button
              type="button"
              onClick={() => setActiveDoc('PRIVACY')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeDoc === 'PRIVACY'
                  ? 'border-neutral-900 text-neutral-900 font-bold'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              개인정보 처리방침
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Plain White Paper Document Style */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white text-neutral-900 leading-relaxed text-sm">
          {activeDoc === 'TERMS' && <TermsOfServiceDoc />}
          {activeDoc === 'COPYRIGHT' && <CopyrightPolicyDoc />}
          {activeDoc === 'API_POLICY' && <ApiKeyPolicyDoc />}
          {activeDoc === 'PRIVACY' && <PrivacyPolicyDoc />}
        </div>

        {/* Modal Bottom Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-neutral-200 bg-neutral-50 text-xs text-neutral-600">
          <span>끝잇기 서비스 운영정책 문서</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded text-xs transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

/* Document 1: 서비스 이용안내 및 약관 */
const TermsOfServiceDoc: React.FC = () => (
  <div className="space-y-6">
    <div className="border-b border-neutral-300 pb-4">
      <h1 className="text-xl font-bold text-neutral-900">끝잇기(Kkeutitgi) 서비스 이용약관 및 이용안내</h1>
      <p className="text-xs text-neutral-500 mt-1">시행일자: 2026년 1월 1일 | 최종 개정일자: 2026년 8월 28일</p>
    </div>

    <section className="space-y-2">
      <h2 className="font-bold text-neutral-900">제1조 (목적)</h2>
      <p className="text-neutral-700">
        본 약관은 끝잇기(이하 &apos;서비스&apos;라 합니다)가 제공하는 온라인 한글 끝말잇기 대전 및 사전 검색 서비스의 이용조건 및 절차, 이용자와 서비스 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
      </p>
    </section>

    <section className="space-y-2">
      <h2 className="font-bold text-neutral-900">제2조 (용어의 정의)</h2>
      <p className="text-neutral-700">본 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
      <ol className="list-decimal list-inside space-y-1 text-neutral-700 pl-1">
        <li>&apos;서비스&apos;란 이용자가 단말기(PC, 모바일 등)를 통해 접속하여 실시간 끝말잇기 게임을 수행하고 국립국어원 표준국어대사전 표제어를 검색할 수 있는 웹 기반 플랫폼을 의미합니다.</li>
        <li>&apos;이용자&apos;란 서비스에 접속하여 본 약관에 따라 서비스를 이용하는 손님 및 회원을 의미합니다.</li>
        <li>&apos;방장(호스트)&apos;이란 대기실을 개설하고 게임 시작 및 방 설정을 주관하는 이용자를 의미합니다.</li>
        <li>&apos;표준 단어&apos;란 국립국어원 표준국어대사전 Open API를 통해 검증된 한글 표제어를 의미합니다.</li>
      </ol>
    </section>

    <section className="space-y-2">
      <h2 className="font-bold text-neutral-900">제3조 (약관의 효력 및 변경)</h2>
      <ol className="list-decimal list-inside space-y-1 text-neutral-700 pl-1">
        <li>본 약관은 서비스 웹 화면에 게시함으로써 효력이 발생합니다.</li>
        <li>서비스는 관계 법령을 위배하지 않는 범위 내에서 본 약관을 개정할 수 있으며, 개정된 약관은 적용일자 7일 전부터 웹사이트 하단 및 공지사항을 통해 공지합니다.</li>
        <li>이용자가 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단할 수 있으며, 계속 이용하는 경우 변경된 약관에 동의한 것으로 간주합니다.</li>
      </ol>
    </section>

    <section className="space-y-2">
      <h2 className="font-bold text-neutral-900">제4조 (게임 규칙의 준수 및 단어 판정)</h2>
      <ol className="list-decimal list-inside space-y-1 text-neutral-700 pl-1">
        <li>모든 참가자는 1턴당 5.0초의 제한 시간 내에 유효한 표준 단어를 입력하여야 합니다. 제한 시간을 초과할 경우 탈락 처리됩니다.</li>
        <li>단어는 두 글자 이상의 국립국어원 표준국어대사전 등재 표제어(명사, 대명사, 수사, 동사, 형용사 등)에 한하여 인정됩니다. 단, 방 설정에 따라 명사 전용 모드가 적용될 수 있습니다.</li>
        <li>동일 판 내에서 이미 사용된 단어는 재사용할 수 없으며, 중복 입력 시 무효 처리됩니다.</li>
        <li>한글 맞춤법 제10항, 제11항, 제12항에 따른 두음법칙(예: 녀→여, 뇨→요, 뉴→유, 니→이, 랴→야, 려→여, 례→예, 료→요, 류→유, 리→이, 라→나, 래→내, 로→노, 뢰→뇌, 루→누, 르→느 등)이 공식 허용됩니다.</li>
      </ol>
    </section>

    <section className="space-y-2">
      <h2 className="font-bold text-neutral-900">제5조 (이용자의 의무 및 금지행위)</h2>
      <ol className="list-decimal list-inside space-y-1 text-neutral-700 pl-1">
        <li>이용자는 서비스 내 채팅 및 닉네임 설정 시 타인에게 모욕감을 주거나 음란, 폭력적, 비방성 표현을 사용하여서는 아니 됩니다.</li>
        <li>매크로, 자동 입력 프로그램, 부정 스크립트 등 비정상적인 수단을 사용하여 게임에 개입하거나 서버에 과도한 부하를 발생시키는 행위는 엄격히 금지됩니다.</li>
        <li>타인의 권리(지식재산권, 인격권 등)를 침해하거나 공공질서 및 미풍양속에 반하는 행위를 하여서는 아니 됩니다.</li>
      </ol>
    </section>

    <section className="space-y-2">
      <h2 className="font-bold text-neutral-900">제6조 (서비스의 제공, 중단 및 면책조항)</h2>
      <ol className="list-decimal list-inside space-y-1 text-neutral-700 pl-1">
        <li>서비스는 연중무휴, 1일 24시간 제공함을 원칙으로 합니다. 단, 시스템 정기 점검, 서버 교체, 국립국어원 Open API 서버 장애 등의 사유가 발생할 경우 일시적으로 중단될 수 있습니다.</li>
        <li>서비스는 천재지변, 국가 비상사태, 외부 Open API 장애 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</li>
        <li>서비스는 무료로 제공되는 플랫폼으로서, 서비스 이용과 관련하여 이용자에게 발생한 어떠한 손해에 대해서도 책임을 지지 않습니다.</li>
      </ol>
    </section>

    <section className="space-y-2">
      <h2 className="font-bold text-neutral-900">제7조 (분쟁의 해결 및 관할법원)</h2>
      <p className="text-neutral-700">
        서비스 이용과 관련하여 발생한 분쟁에 대해서는 대한민국 법령을 적용하며, 서비스 운영 주체의 소재지를 관할하는 법원을 전속 관할법원으로 합니다.
      </p>
    </section>
  </div>
);

/* Document 2: 저작권 및 공공데이터 이용정책 */
const CopyrightPolicyDoc: React.FC = () => (
  <div className="space-y-6">
    <div className="border-b border-neutral-300 pb-4">
      <h1 className="text-xl font-bold text-neutral-900">저작권 및 공공데이터 이용정책</h1>
      <p className="text-xs text-neutral-500 mt-1">시행일자: 2026년 1월 1일 | 최종 개정일자: 2026년 8월 28일</p>
    </div>

    <section className="space-y-2">
      <h2 className="font-bold text-neutral-900">제1조 (목적)</h2>
      <p className="text-neutral-700">
        본 정책은 끝잇기 서비스에서 활용하는 국립국어원 표준국어대사전 저작물 및 관련 데이터의 권리 관계, 공공데이터 이용 조건, 지식재산권 보호 기준을 명확히 함을 목적으로 합니다.
      </p>
    </section>

    <section className="space-y-2">
      <h2 className="font-bold text-neutral-900">제2조 (국립국어원 표준국어대사전 공공누리 및 CCL 라이선스)</h2>
      <ol className="list-decimal list-inside space-y-1 text-neutral-700 pl-1">
        <li>본 서비스에서 제공하는 단어 정보, 품사, 어원, 뜻풀이 및 발음 데이터의 원저작권은 문화체육관광부 국립국어원에 있습니다.</li>
        <li>국립국어원 표준국어대사전 Open API 저작물은 &apos;공공누리 제2유형(출처표시+상업적 이용금지)&apos; 및 &apos;크리에이티브 커먼즈 저작자표시-동일조건변경허락 2.0 대한민국(CC BY-SA 2.0 KR)&apos; 조건에 따라 제공 및 이용됩니다.</li>
        <li>이용자는 본 서비스를 통해 열람한 사전 데이터를 개인적, 비상업적 학습 및 오락 목적으로만 이용할 수 있습니다.</li>
      </ol>
    </section>

    <section className="space-y-2">
      <h2 className="font-bold text-neutral-900">제3조 (출처 표시의 의무)</h2>
      <p className="text-neutral-700">
        본 서비스는 공공저작물 관리 규정에 따라 국립국어원 표준국어대사전의 데이터를 인용 및 표기할 때 &apos;출처: 국립국어원 표준국어대사전 (stdict.korean.go.kr)&apos;을 명시하고 있으며, 이용자 역시 해당 데이터를 재배포하거나 2차 활용 시 반드시 출처를 표기하여야 합니다.
      </p>
    </section>

    <section className="space-y-2">
      <h2 className="font-bold text-neutral-900">제4조 (서비스 소프트웨어의 지식재산권)</h2>
      <ol className="list-decimal list-inside space-y-1 text-neutral-700 pl-1">
        <li>끝잇기 서비스의 UI/UX 디자인, 웹 애플리케이션 소스코드, 게임 로직, 턴 관리 시스템 및 고유 그래픽 요소에 대한 저작권은 서비스 개발 및 운영 주체에 귀속됩니다.</li>
        <li>서비스의 허가 없이 전체 또는 일부 코드를 무단 복제, 분해, 역공학(Reverse Engineering)하거나 무단 상업 배포하는 행위를 금지합니다.</li>
      </ol>
    </section>

    <section className="space-y-2">
      <h2 className="font-bold text-neutral-900">제5조 (배경음악 및 효과음 음원 라이선스 및 저작권 정책)</h2>
      <ol className="list-decimal list-inside space-y-1 text-neutral-700 pl-1">
        <li>본 서비스에서 재생되는 배경음악(BGM) 및 효과음(SFX)은 Web Audio API 기반 오리지널 실시간 신디사이저 알고리즘 합성음 및 완전 저작권 소멸 퍼블릭 도메인(Public Domain / CC0 1.0 Universal) 라이선스 기준을 준수하는 순수 무료·로열티 프리(Royalty-Free) 음원입니다.</li>
        <li>본 음원은 외부 저작권 침해 우려가 일체 없도록 서비스 자체 사운드 엔진으로 제작되었으며, 이용자는 개인 방송, 실시간 스트리밍(유튜브, 치지직, 트위치, 아프리카TV 등), 영상 녹화 및 게임 플레이 중 자유롭게 배경음악과 효과음을 청취 및 송출할 수 있습니다.</li>
        <li>음원 라이선스 출처: 끝잇기 내장 오리지널 Web Audio Sound Engine (CC0 1.0 Universal / Royalty-Free).</li>
      </ol>
    </section>

    <section className="space-y-2">
      <h2 className="font-bold text-neutral-900">제6조 (권리 침해 신고 및 조치)</h2>
      <p className="text-neutral-700">
        서비스 내 콘텐츠가 타인의 저작권을 침해하는 경우, 권리자는 정당한 권리 증명 서류를 첨부하여 운영자에게 통보할 수 있으며, 서비스는 검토 후 즉시 해당 콘텐츠의 수정 또는 삭제 조치를 취합니다.
      </p>
    </section>
  </div>
);

/* Document 3: API 키 사용 및 연동 규정 */
const ApiKeyPolicyDoc: React.FC = () => (
  <div className="space-y-6">
    <div className="border-b border-neutral-300 pb-4">
      <h1 className="text-xl font-bold text-neutral-900">Open API 키 사용 및 사전 데이터 처리 규정</h1>
      <p className="text-xs text-neutral-500 mt-1">시행일자: 2026년 1월 1일 | 최종 개정일자: 2026년 8월 28일</p>
    </div>

    <section className="space-y-2">
      <h2 className="font-bold text-neutral-900">제1조 (목적)</h2>
      <p className="text-neutral-700">
        본 규정은 국립국어원 표준국어대사전 개발 지원(Open API) 인증키의 발급, 보안 관리, 서버 측 프록시(Proxy) 연동 및 트래픽 제어 원칙을 수립함을 목적으로 합니다.
      </p>
    </section>

    <section className="space-y-2">
      <h2 className="font-bold text-neutral-900">제2조 (API 키의 취득 및 보관)</h2>
      <ol className="list-decimal list-inside space-y-1 text-neutral-700 pl-1">
        <li>본 서비스에서 활용하는 API 키는 국립국어원 표준국어대사전 개발자 포털을 통해 정식으로 승인 및 발급받은 인증키입니다.</li>
        <li>API 인증키는 클라이언트 브라우저 환경에 절대 직접 노출되지 않으며, 백엔드 서버(Node.js/Express) 환경변수(`STDICT_API_KEY`)를 통해서만 안전하게 보관 및 호출됩니다.</li>
      </ol>
    </section>

    <section className="space-y-2">
      <h2 className="font-bold text-neutral-900">제3조 (서버 프록시 연동 및 보안)</h2>
      <ol className="list-decimal list-inside space-y-1 text-neutral-700 pl-1">
        <li>클라이언트의 단어 검증 요청(`/api/dict/search`, `/api/dict/validate`)은 전량 서버 측 프록시 라우트를 경유하여 공공데이터 서버로 암호화(HTTPS) 통신됩니다.</li>
        <li>이용자의 비인가 키 탈취 또는 스크립트를 통한 무단 조회를 방지하기 위하여 입력값 유효성 검사 및 서버 측 요청 정제 작업을 거칩니다.</li>
      </ol>
    </section>

    <section className="space-y-2">
      <h2 className="font-bold text-neutral-900">제4조 (트래픽 관리 및 서버 캐싱 정책)</h2>
      <ol className="list-decimal list-inside space-y-1 text-neutral-700 pl-1">
        <li>국립국어원 공공 서버의 부하를 최소화하고 빠른 응답 속도를 유지하기 위하여, 빈번히 검증되는 표준 표제어는 인메모리 캐시(LRU/TTL) 및 내장 어휘 인덱스를 통해 우선 판정합니다.</li>
        <li>초당 과도한 요청을 발생시키는 비정상 트래픽에 대해서는 레이트 리밋(Rate Limit)을 적용하여 차단할 수 있습니다.</li>
      </ol>
    </section>

    <section className="space-y-2">
      <h2 className="font-bold text-neutral-900">제5조 (API 운영 중단 및 정책 변경 시 대응)</h2>
      <p className="text-neutral-700">
        국립국어원의 사전 개정 작업, 점검 또는 API 운영 정책 변경으로 인해 실시간 조회가 일시 불가할 경우, 서비스에 사전 탑재된 표준 어휘 데이터베이스를 통해 오프라인 판정 모드로 자동 전환하여 서비스 연속성을 보장합니다.
      </p>
    </section>
  </div>
);

/* Document 4: 개인정보 처리방침 */
const PrivacyPolicyDoc: React.FC = () => (
  <div className="space-y-6">
    <div className="border-b border-neutral-300 pb-4">
      <h1 className="text-xl font-bold text-neutral-900">개인정보 처리방침</h1>
      <p className="text-xs text-neutral-500 mt-1">시행일자: 2026년 1월 1일 | 최종 개정일자: 2026년 8월 28일</p>
    </div>

    <section className="space-y-2">
      <h2 className="font-bold text-neutral-900">제1조 (개인정보의 처리 목적)</h2>
      <p className="text-neutral-700">
        끝잇기는 다음의 목적을 위하여 최소한의 정보를 처리합니다. 처리하고 있는 정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보 보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행합니다.
      </p>
      <ol className="list-decimal list-inside space-y-1 text-neutral-700 pl-1">
        <li>실시간 멀티플레이어 끝말잇기 게임 방 생성, 입장 및 참가자 식별</li>
        <li>게임 내 단어 기록, 승률, 레벨, 랭킹 및 통계 산출</li>
        <li>채팅 메시지 전달 및 비정상 이용자 제재</li>
      </ol>
    </section>

    <section className="space-y-2">
      <h2 className="font-bold text-neutral-900">제2조 (처리하는 정보의 항목 및 수집 방법)</h2>
      <ol className="list-decimal list-inside space-y-1 text-neutral-700 pl-1">
        <li><strong>수집 항목:</strong> 임의 생성 닉네임, 아바타 색상 설정, 브라우저 세션 식별자(UUID/랜덤키), 게임 기록(승수, 연승, 사용 단어 내역), 접속 일시.</li>
        <li><strong>비수집 항목:</strong> 본 서비스는 주민등록번호, 실명, 전화번호, 이메일, 금융정보, 위치정보 등 민감한 개인 식별 정보를 일절 수집하거나 요구하지 않습니다.</li>
        <li><strong>수집 방법:</strong> 웹 브라우저 로컬 스토리지(LocalStorage) 및 세션 스토리지(SessionStorage)를 통해 이용자의 단말기에 직접 저장됩니다.</li>
      </ol>
    </section>

    <section className="space-y-2">
      <h2 className="font-bold text-neutral-900">제3조 (개인정보의 보유 및 이용 기간)</h2>
      <ol className="list-decimal list-inside space-y-1 text-neutral-700 pl-1">
        <li>이용자의 전적 및 통계 정보는 이용자가 브라우저의 캐시 또는 로컬 스토리지를 삭제할 때까지 이용자의 단말기 내에 보관됩니다.</li>
        <li>게임 방 대기실 및 실시간 상태 데이터는 게임 종료 또는 방 퇴장 시 서버 메모리에서 즉시 파기되거나 최대 30분 이내에 자동 소멸됩니다.</li>
      </ol>
    </section>

    <section className="space-y-2">
      <h2 className="font-bold text-neutral-900">제4조 (개인정보의 제3자 제공 및 위탁)</h2>
      <p className="text-neutral-700">
        서비스는 이용자의 개인정보를 원칙적으로 외부에 제공하거나 위탁하지 않습니다. 단, 실시간 대전 메시지 브로드캐스팅을 위한 인프라 서비스(Supabase Realtime) 연동 시 암호화된 세션 채널만이 활용됩니다.
      </p>
    </section>

    <section className="space-y-2">
      <h2 className="font-bold text-neutral-900">제5조 (정보주체의 권리·의무 및 행사방법)</h2>
      <p className="text-neutral-700">
        이용자는 언제든지 웹 브라우저의 &apos;인터넷 사용 기록 삭제&apos; 또는 &apos;쿠키 및 사이트 데이터 삭제&apos; 기능을 통하여 단말기에 저장된 모든 전적 및 닉네임 정보를 즉시 삭제할 수 있습니다.
      </p>
    </section>

    <section className="space-y-2">
      <h2 className="font-bold text-neutral-900">제6조 (개인정보의 안전성 확보 조치)</h2>
      <ol className="list-decimal list-inside space-y-1 text-neutral-700 pl-1">
        <li>모든 웹 트래픽 및 API 호출은 SSL/TLS 기반의 HTTPS 보안 프로토콜을 통하여 암호화되어 전송됩니다.</li>
        <li>서버 관리자 접근 통제 및 비인가 접근 차단 정책을 적용하고 있습니다.</li>
      </ol>
    </section>

    <section className="space-y-2">
      <h2 className="font-bold text-neutral-900">제7조 (개인정보 보호책임자 및 문의처)</h2>
      <p className="text-neutral-700">
        서비스의 개인정보 보호 및 운영 관련 문의사항은 웹사이트 안내 창구 또는 공식 지원 이메일을 통해 접수하실 수 있습니다.
      </p>
    </section>
  </div>
);
