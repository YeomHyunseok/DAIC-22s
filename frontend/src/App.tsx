import { useState, useEffect } from 'react'
import './App.css'
import ConversationPanel from './components/ConversationPanel'

function App() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [ragStatus, setRagStatus] = useState('loading')
  const [aiStatus, setAiStatus] = useState('loading')
  const [hospitalStatus, setHospitalStatus] = useState('loading')
  const [ragStatusText, setRagStatusText] = useState('대기 중...')
  const [aiStatusText, setAiStatusText] = useState('대기 중...')
  const [hospitalStatusText, setHospitalStatusText] = useState('연결 확인 중...')

  const initializeSystem = async () => {
    setIsInitialized(false) // 초기화 중 상태 표시
    setRagStatus('loading')
    setRagStatusText('의학 데이터베이스 구축 중...')
    setAiStatus('loading')
    setAiStatusText('AI 엔진 초기화 중...')
    setHospitalStatus('loading')
    setHospitalStatusText('병원 연동 시스템 준비 중...')

    // 시뮬레이션된 초기화 과정
    await new Promise(resolve => setTimeout(resolve, 1500))
    setRagStatus('ready')
    setRagStatusText('준비 완료')
    
    await new Promise(resolve => setTimeout(resolve, 1500))
    setAiStatus('ready')
    setAiStatusText('준비 완료')
    
    await new Promise(resolve => setTimeout(resolve, 1500))
    setHospitalStatus('ready')
    setHospitalStatusText('준비 완료')

    // 초기화 완료
    setIsInitialized(true)
    // 초기화 완료 메시지는 대화 로그 컴포넌트에서 처리할 예정
  }

  // 초기 로딩 시 상태 설정
  useEffect(() => {
    // 초기 상태 설정 (선택적)
    // initializeSystem(); // 페이지 로드 시 자동 초기화 하려면 주석 해제
  }, [])

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
        {/* 대화 패널 컴포넌트 사용 */}
        <ConversationPanel
          isInitialized={isInitialized}
          initializeSystem={initializeSystem}
          ragStatus={ragStatus}
          aiStatus={aiStatus}
          hospitalStatus={hospitalStatus}
        />

        {/* 제어 패널 (나중에 컴포넌트로 분리) */}
        <div className="control-panel">
          <h3>🎛️ 시스템 제어</h3>
          {/* 상태 정보, 데모 시나리오, 디버그 정보 등이 여기에 들어갑니다. */}
          {/* 현재는 임시 내용입니다. */}
          <p>제어 패널 내용이 여기에 표시될 예정입니다.</p>
        </div>
      </div>
    </div>
  )
}

export default App
