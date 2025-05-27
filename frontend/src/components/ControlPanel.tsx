import React from 'react';

interface ControlPanelProps {
  turnCount: number;
  currentConfidence: number;
  onResetSystem: () => void;
  // TODO: add props for demo scenario handlers, debug info
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  turnCount,
  currentConfidence,
  onResetSystem,
  // TODO: destructure demo scenario handlers and debug info
}) => {
  // TODO: implement demo scenario and reset logic

  return (
    <div className="control-panel">
      <h3>🎛️ 시스템 제어</h3>

      <div className="status-card">
        <div className="status-number">{turnCount}</div>
        <div className="status-label">대화 턴</div>
      </div>

      <div className="demo-scenarios">
        <h3>🎬 데모 시나리오</h3>
        {/* TODO: Map demo scenarios to buttons */}
        <button className="demo-button" /* onClick={() => loadDemoScenario(0)} */>
            🚗 교통사고: 20대 남성, 의식 잃음
        </button>
        <button className="demo-button" /* onClick={() => loadDemoScenario(1)} */>
            💓 심장 통증: 50대 여성, 호흡곤란
        </button>
        <button className="demo-button" /* onClick={() => loadDemoScenario(2)} */>
            🏗️ 추락 사고: 30대 남성, 다리 골절 의심
        </button>
        <button className="demo-button" /* onClick={() => loadDemoScenario(3)} */>
            🤧 알레르기: 10대 소아, 전신 두드러기
        </button>
      </div>

      <div style={{ borderTop: '1px solid #ecf0f1', paddingTop: '20px' }}>
        <h3>🔧 디버그 정보</h3>
        <div style={{ fontSize: '0.9em', color: '#7f8c8d' }}>
          {/* TODO: Add actual debug info */}
          <div>웹 주소: <span id="webUrl">로딩 중...</span></div>
          <div>마지막 업데이트: <span id="lastUpdate">-</span></div>
          <div>API 상태: <span id="apiStatus">대기 중</span></div>
        </div>
      </div>

      <button
        className="init-button"
        onClick={onResetSystem}
        style={{ width: '100%', marginTop: '15px' }}
      >
        🔄 시스템 리셋
      </button>
    </div>
  );
};

export default ControlPanel; 