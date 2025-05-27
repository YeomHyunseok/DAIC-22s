import { useState, useEffect } from 'react'
import './App.css'
import ConversationPanel from './components/ConversationPanel'
import ControlPanel from './components/ControlPanel'
import BriefingPanel from './components/BriefingPanel'

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

function App() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [ragStatus, setRagStatus] = useState('loading')
  const [aiStatus, setAiStatus] = useState('loading')
  const [hospitalStatus, setHospitalStatus] = useState('loading')
  const [ragStatusText, setRagStatusText] = useState('대기 중...')
  const [aiStatusText, setAiStatusText] = useState('대기 중...')
  const [hospitalStatusText, setHospitalStatusText] = useState('연결 확인 중...')

  // App 컴포넌트에서 관리하는 상태 (ControlPanel에 전달할 예정)
  const [turnCount, setTurnCount] = useState(0)
  const [currentConfidence, setCurrentConfidence] = useState(0)
  const [showBriefing, setShowBriefing] = useState(false)
  const [conversation, setConversation] = useState<Message[]>([])

  const initializeSystem = async () => {
    // 초기화 시작 시 버튼 비활성화
    const initButton = document.querySelector('.init-button') as HTMLButtonElement;
    if (initButton) {
      initButton.textContent = '초기화 중...';
      initButton.disabled = true;
    }

    setIsInitialized(false);
    setRagStatus('loading');
    setRagStatusText('의학 데이터베이스 구축 중...');
    setAiStatus('loading');
    setAiStatusText('AI 엔진 초기화 중...');
    setHospitalStatus('loading');
    setHospitalStatusText('병원 연동 시스템 준비 중...');

    // 시뮬레이션된 초기화 과정
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRagStatus('ready');
    setRagStatusText('준비 완료');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    setAiStatus('ready');
    setAiStatusText('준비 완료');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    setHospitalStatus('ready');
    setHospitalStatusText('준비 완료');

    // 초기화 완료
    setIsInitialized(true);

    // 초기화 완료 후 버튼 상태 복원
    if (initButton) {
      initButton.textContent = '시스템 초기화 시작';
      initButton.disabled = false;
    }
  };

  // 초기 로딩 시 상태 설정
  useEffect(() => {
    // 초기 상태 설정 (선택적)
    // initializeSystem(); // 페이지 로드 시 자동 초기화 하려면 주석 해제
  }, [])

  // ConversationPanel에서 턴 수와 확신도 업데이트를 처리하도록 함수 전달
  const handleUpdateStats = (newTurnCount: number, newConfidence: number, newConversation: Message[]) => {
    setTurnCount(newTurnCount)
    setCurrentConfidence(newConfidence)
    setConversation(newConversation)
  }

  // ConversationPanel에서 브리핑 화면으로 전환을 요청할 때 호출될 함수
  const handleShowBriefing = () => {
    setShowBriefing(true)
  }

  // 브리핑 화면에서 새로운 케이스 시작 버튼 클릭 시 호출될 함수
  const handleStartNewCase = () => {
    // 상태 초기화
    setTurnCount(0)
    setCurrentConfidence(0)
    setShowBriefing(false) // 대화 화면으로 전환
    setConversation([]) // 대화 내용 초기화
  }
  
  // TODO: 시스템 리셋 핸들러 구현 (ControlPanel에 전달)
  const handleResetSystem = () => {
    if (window.confirm('정말로 시스템을 리셋하시겠습니까?')) {
      window.location.reload() // 페이지 전체 새로고침
    }
  }

  return (
    <div className="container">
      {/* 헤더 */}
      <header className="header">
        <h1>🚑 EmergencyAI Agent</h1>
        <p>응급상황 지원 AI 시스템 - 실시간 의학적 판단 지원</p>
      </header>

      {/* 시스템 상태 */}
      <div className="system-status">
        <div className="status-item">
          <div className={`status-indicator ${ragStatus}`}></div>
          <div><strong>RAG 데이터베이스</strong></div>
          <div>{ragStatusText}</div>
        </div>
        <div className="status-item">
          <div className={`status-indicator ${aiStatus}`}></div>
          <div><strong>AI 엔진</strong></div>
          <div>{aiStatusText}</div>
        </div>
        <div className="status-item">
          <div className={`status-indicator ${hospitalStatus}`}></div>
          <div><strong>병원 연동</strong></div>
          <div>{hospitalStatusText}</div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="main-content">
        {/* 대화 패널 또는 브리핑 패널 조건부 렌더링 */}
        {!showBriefing ? (
          // 대화 패널 컴포넌트
          <ConversationPanel
            isInitialized={isInitialized}
            initializeSystem={initializeSystem}
            ragStatus={ragStatus}
            aiStatus={aiStatus}
            hospitalStatus={hospitalStatus}
            onUpdateStats={handleUpdateStats}
            onShowBriefing={handleShowBriefing} // 브리핑 화면 전환 함수 전달
          />
        ) : (
          // 브리핑 패널 컴포넌트
          <BriefingPanel
            confidenceScore={currentConfidence} // App 상태의 확신도 전달
            isEmergency={currentConfidence >= 80} // 확신도 80% 이상이면 응급으로 가정
            onStartNewCase={handleStartNewCase} // 새로운 케이스 시작 함수 전달
            conversation={conversation} // 대화 내용 전달
          />
        )}

        {/* 제어 패널 컴포넌트 */}
        <ControlPanel
          turnCount={turnCount}
          currentConfidence={currentConfidence}
          // TODO: Pass demo scenario handlers, debug info
          onResetSystem={handleResetSystem} // 시스템 리셋 함수 전달
        />
      </div>
    </div>
  )
}

export default App
