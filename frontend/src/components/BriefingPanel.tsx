import React, { useState } from 'react';

interface BriefingPanelProps {
  confidenceScore: number;
  isEmergency: boolean;
  onStartNewCase: () => void;
  // TODO: add props for priority plan data, send to hospital handler
}

const BriefingPanel: React.FC<BriefingPanelProps> = ({
  confidenceScore,
  isEmergency,
  onStartNewCase,
  // TODO: destructure other props
}) => {
  // TODO: implement sendToHospital logic

  // 우선순위 계획 데이터 (나중에 props로 받거나 API 호출로 가져올 수 있음)
  const priorityPlanData = [
    {
      priority: 'Priority 1',
      urgency: '즉시',
      title: '🔴 Priority 1: 생명위험',
      actions: [
        '기도 확보 및 경추 보호',
        '기본 생체징후 모니터링',
        '정맥로 확보 및 수액 공급',
        '산소 공급 15L/min',
      ],
      medicalBasis: 'ATLS 10th Edition, AHA Guidelines 2024',
      levelClass: 'critical',
    },
    {
      priority: 'Priority 2',
      urgency: '30분 내',
      title: '🟡 Priority 2: 영구장애 위험',
      actions: [
        '신경학적 검사 (GCS, 동공 반응)',
        '전신 외상 평가',
        '영상 검사 (CT, X-ray) 계획',
        '전문과 협진 요청',
      ],
      medicalBasis: '대한응급의학회 KTAS, Emergency Medicine Guidelines',
      levelClass: 'standard',
    },
    {
      priority: 'Priority 3',
      urgency: '1시간 내',
      title: '🟢 Priority 3: 2차 평가',
      urgencyText: '1시간 내',
      actions: [
        '상세 병력 청취',
        '가족력 및 알레르기 확인',
        '추가 검사 계획 수립',
        '입원 또는 귀가 결정',
      ],
      medicalBasis: '표준 응급의학 프로토콜',
      levelClass: 'secondary',
    },
  ];

  const emergencyLevelText = isEmergency ? '🔴 Level 1' : '🟡 Level 2';
  const emergencyLevelLabel = isEmergency ? '생명위험' : '응급상황';
  const emergencyLevelClass = isEmergency ? 'emergency' : 'normal';

  // TODO: 전송 완료 상태 및 메시지 상태 관리
  const [isSent, setIsSent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleSendToHospital = async () => {
      setIsSending(true);
      // TODO: 실제 병원 전송 API 호출 로직 구현
      await new Promise(resolve => setTimeout(resolve, 2000)); // 시뮬레이션
      setIsSending(false);
      setIsSent(true);
  };

  return (
    <div className="briefing-screen">
      <div className="briefing-header">
        <h2>🏥 병원 응급실 브리핑</h2>
        <p>자동 생성된 종합 의료 브리핑</p>
      </div>

      <div className="status-info">
        <div className="status-card">
          <div className="status-number">{confidenceScore}%</div>
          <div className="status-label">진단 확신도</div>
        </div>
        <div className={`status-card ${emergencyLevelClass}`} >
          <div className="status-number">{emergencyLevelText}</div>
          <div className="status-label">{emergencyLevelLabel}</div>
        </div>
      </div>

      <div className="priority-plan">
        {priorityPlanData.map((item, index) => (
          <div key={index} className={`priority-item ${item.levelClass}`}>
            <div className="priority-header">
              <div className="priority-title">{item.title}</div>
              <div className="priority-urgency">{item.urgency}</div>
            </div>
            <div className="priority-actions">
              <strong>{item.actions.length > 0 ? '조치/평가:' : ''}</strong>
              <ul>
                {item.actions.map((action, actionIndex) => (
                  <li key={actionIndex}>{action}</li>
                ))}
              </ul>
              {item.medicalBasis && <div style={{fontSize: '0.9em', color: '#7f8c7d', marginTop: '10px'}}><strong>근거:</strong> {item.medicalBasis}</div>}
            </div>
          </div>
        ))}
      </div>

      {!isSent ? (
        <button className="send-to-hospital" onClick={handleSendToHospital} disabled={isSending}>
          {isSending ? <div className="loading-spinner"></div> : '📡 응급실로 브리핑 전송'}
        </button>
      ) : (
        <div id="successMessage" className="success-message">
            ✅ 병원 전송 완료! 응급실에서 환자 접수 준비 중입니다.
            <br/><br/>
            <button className="init-button" onClick={onStartNewCase}>
                🆕 새로운 환자 시작
            </button>
        </div>
      )}
    </div>
  );
};

export default BriefingPanel; 