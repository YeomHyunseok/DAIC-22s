import React, { useState } from 'react';

interface ConversationPanelProps {
  isInitialized: boolean;
  initializeSystem: () => Promise<void>;
  ragStatus: string;
  aiStatus: string;
  hospitalStatus: string;
}

const ConversationPanel: React.FC<ConversationPanelProps> = ({
  isInitialized,
  initializeSystem,
  ragStatus,
  aiStatus,
  hospitalStatus,
}) => {
  // 이 컴포넌트 내에서 관리할 상태들 (예: 대화 메시지, 입력 값 등)
  const [conversationState, setConversationState] = useState({
      turnCount: 0,
      messages: [],
      currentConfidence: 0,
      isEmergency: false,
      collectedInfo: {},
      isInitialized: false // 이 상태는 상위 컴포넌트(App.tsx)에서 받아옵니다.
  });

  // TODO: implement addMessage, submitResponse, showBriefingScreen etc.
  // 현재는 초기화 화면만 렌더링합니다.

  return (
    <div className="conversation-panel">
      {!isInitialized ? (
        // 초기화 화면
        <div className="initialization-screen">
          <h2>🚀 EmergencyAI 시스템 초기화</h2>
          <p>의학 데이터베이스와 AI 엔진을 준비합니다.</p>

          {/* 진행 바 (나중에 구현) */}
          {/* <div className="progress-container">...</div> */}

          <button
            className="init-button"
            onClick={initializeSystem} // App.tsx에서 전달받은 함수 사용
            disabled={!isInitialized && (ragStatus === 'loading' || aiStatus === 'loading' || hospitalStatus === 'loading')}
          >
            {!isInitialized && (ragStatus === 'loading' || aiStatus === 'loading' || hospitalStatus === 'loading') ? '초기화 중...' : '시스템 초기화 시작'}
          </button>

          <div style={{ marginTop: '30px' }}>
            <h3>🎯 시스템 구성</h3>
            <ul style={{ textAlign: 'left', maxWidth: '500px', margin: '15px auto' }}>
              <li>📚 의학 문서 5,000+ 개 (PubMed, AHA, ATLS)</li>
              <li>🧠 Upstage Solar LLM 연동</li>
              <li>🔍 계층적 RAG 검색 엔진</li>
              <li>🏥 병원 연동 시스템</li>
            </ul>
          </div>
        </div>
      ) : (
        // 초기화 완료 후 대화 인터페이스 또는 브리핑 화면 표시 (나중에 구현)
        <div className="conversation-interface">
          <h2>💬 응급상황 대화</h2>
          {/* 대화 로그, 입력 섹션 등이 여기에 들어갑니다. */}
          <p>시스템 초기화 완료! 대화 인터페이스가 여기에 표시될 예정입니다.</p>
        </div>
      )}
    </div>
  );
};

export default ConversationPanel; 