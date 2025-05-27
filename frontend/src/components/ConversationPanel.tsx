import React, { useState, useEffect, useRef } from 'react';
import Message from './Message'; // Message 컴포넌트 임포트

interface MessageData {
  type: 'paramedic' | 'ai' | 'system';
  content: string;
  sender?: string;
  timestamp: string;
}

// 백엔드로 전송할 메시지 형식 (role과 content만 포함)
interface BackendMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface ConversationPanelProps {
  isInitialized: boolean;
  initializeSystem: () => Promise<void>;
  ragStatus: string;
  aiStatus: string;
  hospitalStatus: string;
  onUpdateStats: (newTurnCount: number, newConfidence: number) => void;
  onShowBriefing: () => void;
}

// Web Speech API 타입 정의
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
  prototype: SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

const ConversationPanel: React.FC<ConversationPanelProps> = ({
  isInitialized,
  initializeSystem,
  ragStatus,
  aiStatus,
  hospitalStatus,
  onUpdateStats,
  onShowBriefing,
}) => {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [userInput, setUserInput] = useState('');
  const [turnCount, setTurnCount] = useState(0);
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [isAILoading, setIsAILoading] = useState(false); // AI 응답 대기 상태
  const [isRecording, setIsRecording] = useState(false); // 음성 녹음 상태 추가
  
  const conversationLogRef = useRef<HTMLDivElement>(null); // 자동 스크롤을 위한 ref
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);

  // 시스템 프롬프트 정의
  const systemPrompt: BackendMessage = {
      role: 'system',
      content: `You are an Emergency AI Agent designed to assist paramedics in managing medical emergencies.
Your goal is to gather critical information about the patient's condition and the emergency situation through a conversation with the paramedic.
Based on the information gathered, you should provide guidance, ask relevant follow-up questions, and eventually help determine if enough information has been collected for a hospital briefing.
Maintain a professional, calm, and informative tone. Focus on medically relevant details.
Avoid making definitive diagnoses or giving medical instructions that are outside the scope of assisting in information gathering.
Keep your responses concise and focused on obtaining necessary information or providing guidance based on gathered facts.
The conversation history will be provided in each turn. Use the previous messages to maintain context and avoid asking repetitive questions if the information has already been provided by the paramedic or yourself.
When you believe sufficient information has been gathered (e.g., after 4-5 turns or when key details like patient status, vital signs, injury type/location are known), indicate that a hospital briefing can be prepared.`,
  };

  // 초기화 완료 시 시스템 메시지 추가
  useEffect(() => {
    if (isInitialized) {
      addMessage("system", "✅ EmergencyAI 시스템이 성공적으로 초기화되었습니다. 응급상황을 입력해주세요.");
    }
  }, [isInitialized]);

  // 메시지 추가 및 자동 스크롤
  useEffect(() => {
    if (conversationLogRef.current) {
      conversationLogRef.current.scrollTop = conversationLogRef.current.scrollHeight;
    }
  }, [messages]);

  // 턴 수 또는 확신도 변경 시 상위 컴포넌트로 전달
  useEffect(() => {
      onUpdateStats(turnCount, currentConfidence); // turnCount 또는 currentConfidence 변경 시 호출
  }, [turnCount, currentConfidence, onUpdateStats]); // onUpdateStats도 의존성 배열에 포함

  // WebSocket 연결 설정
  useEffect(() => {
    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, [wsConnection]);

  const addMessage = (type: MessageData['type'], content: string, sender?: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setMessages((prevMessages) => [...prevMessages, { type, content, sender, timestamp }]);
  };

  // 응답 제출 핸들러
  const handleSubmit = async () => {
    // 전송 버튼을 누를 때 음성 인식도 중지
    stopRecognition();
    if (isRecording) {
      stopRecording();
      // stopRecording은 비동기적으로 녹음을 중지하므로, 약간의 지연 후 전송을 진행합니다.
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    if (!userInput.trim()) {
      alert('응급상황을 입력해주세요.');
      return;
    }

    if (!isInitialized) {
      alert('시스템을 먼저 초기화해주세요.');
      return;
    }
    
    setIsAILoading(true);

    const currentInput = userInput; // 스냅샷 저장
    setUserInput(''); // 전송 버튼을 누를 때만 입력창을 비움

    // 사용자 입력 메시지를 먼저 추가
    addMessage('paramedic', currentInput);

    // 백엔드 API 호출 및 응답 처리 함수 호출
    await processUserInput(currentInput);

    setIsAILoading(false);
  };

  // 사용자 입력을 처리하고 백엔드 API를 호출하는 함수로 역할 변경
  const processUserInput = async (input: string) => {
       // addMessage 호출 후 상태가 바로 업데이트되지 않으므로,
       // 현재 messages 상태와 새로운 입력을 합쳐서 백엔드로 보낼 메시지 리스트를 만듭니다.
       // 시스템 메시지를 가장 앞에 추가합니다.
       const messagesToSend: BackendMessage[] = [
           systemPrompt, // 시스템 프롬프트 추가
           ...messages.map(msg => ({
               role: (msg.type === 'paramedic' ? 'user' : (msg.type === 'ai' ? 'assistant' : 'system')) as 'user' | 'assistant' | 'system', // 명시적으로 타입 단언
               content: msg.content
           })),
           { role: 'user', content: input } // 현재 사용자 입력 추가
       ];


      const nextTurnCount = turnCount + 1;
      setTurnCount(nextTurnCount);

      // 확신도 계산 (프론트에서 임시 계산 유지)
      const nextConfidence = calculateConfidence(nextTurnCount);
      setCurrentConfidence(Math.round(nextConfidence * 100));


      addMessage("system", "🔍 AI 응답 생성 중...");


      // 백엔드 API 호출
      try {
          const response = await fetch('http://localhost:8000/chat', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({ messages: messagesToSend }), // 메시지 리스트를 JSON body로 전송
          });

          if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          const aiResponseContent = data.response; // 백엔드 응답 구조에 맞게 수정

          // AI 응답 추가
          addMessage('ai', aiResponseContent, '🤖 AI Emergency Alert');

          // 대화 종료 여부 확인
          if (data.should_end) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              addMessage("system", "📋 충분한 정보를 수집했습니다. 병원 브리핑을 생성합니다.");
              onShowBriefing();
          }

      } catch (error: unknown) {
          console.error('Error fetching AI response:', error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          addMessage("system", `❌ AI 응답 요청 중 오류 발생: ${errorMessage}`);
      }

      // TODO: updateLastUpdate() 로직 구현 (상위 컴포넌트에서 관리될 수도 있음)
  };

  // --- 시뮬레이션용 기존 JS 함수들 (필요에 따라 React 상태/props 사용하도록 수정) ---
  const checkEmergencyKeywords = (input: string) => {
      const emergencyKeywords = [
          '의식잃음', '의식없음', '심정지', '호흡곤란', '대량출혈', '쇼크',
          '교통사고', '추락', '외상', '골절', '심장통증', '가슴통증', '뇌졸중', '경련'
      ];
      
      return emergencyKeywords.some(keyword => input.includes(keyword));
  };

  const calculateConfidence = (currentTurn: number) => {
      const baseConfidence = 0.3;
      const turnBonus = currentTurn * 0.15; // 턴당 확신도 증가량 조정
      // TODO: 수집된 정보량 반영 로직 추가 필요
      // const infoBonus = Object.keys(conversationState.collectedInfo).length * 0.1;
      
      return Math.min(baseConfidence + turnBonus /* + infoBonus*/, 0.95);
  };

  const getImmediateAction = (input: string) => {
      if (input.includes('의식잃음') || input.includes('의식없음')) {
          return "기도 확보 및 경추 고정, GCS 점수 측정";
      } else if (input.includes('호흡곤란')) {
          return "산소 공급 15L/min, 기도 확인";
      } else if (input.includes('심장') || input.includes('가슴통증')) {
          return "12유도 심전도 측정, 니트로글리세린 투여 고려";
      } else if (input.includes('출혈')) {
          return "직접 압박지혈, 혈압 측정, 수액 공급 준비";
      } else {
          return "기본 생체징후 측정 (혈압, 맥박, 호흡, 체온)";
      }
  };

  const generateQuestions = (input: string, currentTurn: number) => {
      const allQuestions = [
          "환자의 나이와 성별을 정확히 알려주세요",
          "GCS(Glasgow Coma Scale) 점수를 측정해주세요",
          "양쪽 동공의 크기와 빛 반응을 확인해주세요",
          "혈압, 맥박, 호흡수를 측정해주세요",
          "환자가 통증을 호소하는 부위가 있나요?",
          "알려진 알레르기나 복용 중인 약물이 있나요?",
          "사고 당시 상황을 더 자세히 설명해주세요",
          "현재 환자의 의식 상태는 어떤가요?",
          "호흡 패턴이 규칙적인가요?",
          "목이나 척추 부위에 손상 징후가 보이나요?"
      ];

      // 턴에 따라 다른 질문 반환
      const startIndex = (currentTurn - 1) * 3;
      return allQuestions.slice(startIndex, startIndex + 3);
  };

  const shouldEndConversation = (currentTurn: number, confidence: number) => {
      return currentTurn >= 4 || confidence >= 0.9; // 종료 조건 약간 변경
  };
  
  // TODO: showBriefingScreen 함수 (prop으로 전달받거나 이 컴포넌트에서 라우팅 처리)

  // Web Speech API (실시간 텍스트 변환)
  const startRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let fullTranscript = '';
      for (let i = 0; i < event.results.length; ++i) {
        fullTranscript += event.results[i][0].transcript;
      }
      setUserInput(fullTranscript);
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  // 음성 녹음 시작
  const startRecording = async () => {
    try {
      setUserInput(''); // 입력창 초기화
      audioChunksRef.current = []; // 오디오 청크 초기화
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      addMessage("system", "🎤 음성 녹음 중...");
      
      // 실시간 음성 인식 시작
      startRecognition();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      addMessage("system", "❌ 마이크 접근 권한이 필요합니다.");
    }
  };

  // 음성 녹음 중지
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      addMessage("system", "🔍 음성을 텍스트로 변환 중...");
      
      // 실시간 음성 인식 중지
      stopRecognition();
      
      // 녹음된 음성을 Whisper로 처리
      if (audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        convertSpeechToText(audioBlob);
      }
    }
  };

  // 음성을 텍스트로 변환 (Whisper 사용)
  const convertSpeechToText = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('http://localhost:8000/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('음성 변환에 실패했습니다.');
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      
      // 입력창에 변환된 텍스트 표시
      setUserInput(data.text);
    } catch (error) {
      console.error('Error converting speech to text:', error);
      addMessage("system", "❌ 음성 변환 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="conversation-panel">
      {!isInitialized ? (
        // 초기화 화면
        <div className="initialization-screen">
          <h2>EmergencyAI 시스템 초기화</h2>
          <p>의학 데이터베이스와 AI 엔진을 준비합니다.</p>

          {/* 진행 바 (나중에 구현) */}
          {/* <div className="progress-container">...</div> */}

          <button
            className="init-button"
            onClick={initializeSystem}
            disabled={false}
          >
            시스템 초기화 시작
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
        // 초기화 완료 후 대화 인터페이스 표시
        <div className="conversation-interface">
          <h2>💬 응급상황 대화</h2>

          {/* 대화 로그 */}
          <div className="conversation-log" ref={conversationLogRef}>
            {messages.map((msg, index) => (
              <Message
                key={index}
                type={msg.type}
                content={msg.content}
                sender={msg.sender}
                timestamp={msg.timestamp}
              />
            ))}
          </div>

          {/* 입력 섹션 */}
          <div className="input-section">
            <h3>🎤 응급구조사님, 현재 상황을 설명해주세요</h3>
            <div className="input-group">
              <label htmlFor="userInput">상황 설명:</label>
              <textarea
                id="userInput"
                placeholder="예: 교통사고, 20대 남성, 의식 잃음"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                disabled={isAILoading}
              ></textarea>
            </div>
            <div className="button-group">
              <button 
                className={`mic-button ${isRecording ? 'recording' : ''}`} 
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isAILoading}
              >
                {isRecording ? '⏹️ 녹음 중지' : '🎤 음성 입력'}
              </button>
              <button 
                className="submit-button" 
                onClick={handleSubmit} 
                disabled={isAILoading}
              >
                {isAILoading ? <div className="loading-spinner"></div> : '전송'}
              </button>
            </div>
          </div>
        </div>
        // TODO: 브리핑 화면 (briefing-screen) 조건부 렌더링 추가
      )}
    </div>
  );
};

export default ConversationPanel; 