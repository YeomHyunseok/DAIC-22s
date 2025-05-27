import React, { useState, useEffect } from 'react';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface BriefingPanelProps {
  confidenceScore: number;
  isEmergency: boolean;
  onStartNewCase: () => void;
  conversation: Message[];
}

interface BriefingData {
  content: string;
}

const BriefingPanel: React.FC<BriefingPanelProps> = ({
  confidenceScore,
  isEmergency,
  onStartNewCase,
  conversation,
}) => {
  const [isSent, setIsSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [briefingData, setBriefingData] = useState<BriefingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBriefingData = async () => {
      try {
        console.log('전송할 대화 내용:', conversation);
        
        if (!conversation || conversation.length === 0) {
          throw new Error('대화 내용이 없습니다.');
        }

        const response = await fetch('http://localhost:8000/generate_medical_brief', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ conversation }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || '브리핑 데이터를 가져오는데 실패했습니다.');
        }

        const data = await response.json();
        console.log('받은 브리핑 데이터:', data);
        
        if (!data || !data.content) {
          throw new Error('브리핑 데이터가 비어있습니다.');
        }

        setBriefingData(data);
      } catch (error) {
        console.error('브리핑 데이터 로딩 중 오류:', error);
        setBriefingData({
          content: '대화 내용을 분석하는 중 오류가 발생했습니다.\n브리핑을 생성할 수 없습니다.\n대화 내용을 다시 확인해주세요.'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchBriefingData();
  }, [conversation]);

  const handleSendToHospital = async () => {
    setIsSending(true);
    try {
      const response = await fetch('http://localhost:8000/send_to_hospital', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ briefingData }),
      });

      if (!response.ok) {
        throw new Error('병원 전송에 실패했습니다.');
      }

      setIsSent(true);
    } catch (error) {
      console.error('병원 전송 중 오류:', error);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="briefing-screen">
        <div className="loading-spinner"></div>
        <p>브리핑 데이터를 생성하는 중입니다...</p>
      </div>
    );
  }

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
        <div className={`status-card ${isEmergency ? 'emergency' : 'normal'}`}>
          <div className="status-number">{isEmergency ? '🔴 Level 1' : '🟡 Level 2'}</div>
          <div className="status-label">{isEmergency ? '생명위험' : '응급상황'}</div>
        </div>
      </div>

      {briefingData && (
        <div className="briefing-content">
          <div className="briefing-text">
            {briefingData.content.split('\n').map((line, index) => {
              if (line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.') || line.startsWith('4.')) {
                return (
                  <div key={index} className="briefing-section">
                    <h3 className="section-title">
                      {line.startsWith('1.') && '🧾 '}
                      {line.startsWith('2.') && '💉 '}
                      {line.startsWith('3.') && '❗ '}
                      {line.startsWith('4.') && '📌 '}
                      {line.replace(/^\d\.\s*/, '')}
                    </h3>
                  </div>
                );
              } else if (line.startsWith('-')) {
                return (
                  <div key={index} className="bullet-point-container">
                    <span className="bullet-point">•</span>
                    <p className="bullet-text">{line.replace(/^-\s*/, '')}</p>
                  </div>
                );
              } else if (line.trim()) {
                return <p key={index} className="regular-text">{line}</p>;
              }
              return null;
            })}
          </div>
        </div>
      )}

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

// 스타일 추가
const styles = `
  .briefing-content {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    margin: 1rem 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .briefing-text {
    font-family: 'Noto Sans KR', sans-serif;
  }

  .section-title {
    color: #2c3e50;
    font-size: 1.3rem;
    font-weight: 600;
    margin: 1.5rem 0 1rem 0;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #eee;
  }

  .bullet-point-container {
    display: flex;
    align-items: flex-start;
    margin: 0.5rem 0;
    padding: 0.5rem 1rem;
    background: #f8f9fa;
    border-radius: 6px;
  }

  .bullet-point {
    color: #3498db;
    margin-right: 0.8rem;
  }

  .bullet-text {
    margin: 0;
    color: #34495e;
  }

  .regular-text {
    color: #7f8c8d;
    margin: 0.5rem 0;
  }
`;

// 스타일 태그 추가
const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

export default BriefingPanel; 