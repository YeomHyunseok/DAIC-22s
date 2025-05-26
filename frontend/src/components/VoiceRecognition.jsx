import React, { useState, useRef } from 'react';

function VoiceRecognition() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const recognitionRef = useRef(null);

  // Web Speech API (실시간 텍스트 변환)
  const startRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        interimTranscript += event.results[i][0].transcript;
      }
      setTranscript(interimTranscript);
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

  // MediaRecorder (음성 녹음)
  const startRecording = async () => {
    try {
      setTranscript('');
      setAudioChunks([]);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      recorder.ondataavailable = (e) => {
        setAudioChunks((prev) => [...prev, e.data]);
      };
      recorder.start();
      setIsRecording(true);
      startRecognition();
    } catch (error) {
      console.error('녹음 시작 오류:', error);
      alert('마이크 접근 권한이 필요합니다.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      stopRecognition();
    }
  };

  // 음성 파일 서버로 전송
  const handleSend = async () => {
    if (audioChunks.length === 0) return;
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    const res = await fetch('http://localhost:5000/transcribe', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (data.text) setTranscript(data.text);
    else alert('음성 인식 실패: ' + data.error);
  };

  return (
    <div className="voice-recognition">
      <div className="controls">
        <button 
          onClick={isRecording ? stopRecording : startRecording}
          className={`record-button ${isRecording ? 'recording' : ''}`}
        >
          {isRecording ? '녹음 중지' : '녹음 시작'}
        </button>
        <button 
          onClick={handleSend} 
          disabled={audioChunks.length === 0}
          className="send-button"
        >
          전송
        </button>
      </div>
      
      <div className="transcript-box">
        {transcript || '음성을 입력해주세요...'}
      </div>

      <style jsx>{`
        .voice-recognition {
          max-width: 600px;
          margin: 20px auto;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .controls {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .record-button, .send-button {
          padding: 12px 24px;
          font-size: 16px;
          border: none;
          border-radius: 25px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .record-button {
          background-color: #4CAF50;
          color: white;
        }

        .record-button:hover {
          background-color: #45a049;
        }

        .record-button.recording {
          background-color: #f44336;
          animation: pulse 1.5s infinite;
        }

        .send-button {
          background-color: #2196F3;
          color: white;
        }

        .send-button:hover {
          background-color: #1976D2;
        }

        .send-button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        .transcript-box {
          min-height: 100px;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background-color: #f9f9f9;
          margin-top: 20px;
          white-space: pre-wrap;
          word-break: break-word;
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

export default VoiceRecognition; 