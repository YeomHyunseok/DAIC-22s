import os
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel
import tempfile
import whisper
import json
from fastapi.responses import JSONResponse

# 환경 변수 로드
load_dotenv()
UPSTAGE_API_KEY = os.getenv("UPSTAGE_API_KEY")

if not UPSTAGE_API_KEY:
    raise ValueError("UPSTAGE_API_KEY 환경 변수가 설정되지 않았습니다.")

# OpenAI 클라이언트 초기화 (Upstage API 엔드포인트 사용)
client = OpenAI(
    api_key=UPSTAGE_API_KEY,
    base_url="https://api.upstage.ai/v1"
)

# Whisper 모델 로드
whisper_model = whisper.load_model("base")  # 처음 실행 시 자동으로 모델 다운로드

# 요청 바디의 메시지 형식을 정의합니다.
class Message(BaseModel):
    role: str
    content: str

# 요청 바디의 전체 형식을 정의합니다. 메시지 리스트를 받습니다.
class ChatRequest(BaseModel):
    messages: list[Message]

app = FastAPI()

# CORS 설정 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # 프론트엔드 주소
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def read_root():
    return {"message": "EmergencyAI Backend is running!"}

@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    try:
        # 임시 파일로 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(await audio.read())
            tmp_path = tmp.name
        # whisper로 변환
        result = whisper_model.transcribe(tmp_path, language="ko")
        os.remove(tmp_path)
        return {"text": result["text"]}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# 사용자 질문을 포함한 대화 기록을 받아 Solar LLM을 통해 답변을 생성하는 엔드포인트
@app.post("/chat")
async def chat_with_ai(request: ChatRequest): # ChatRequest 모델을 사용하여 messages 리스트를 받습니다.
    # 받은 messages 리스트 유효성 검사
    if not request.messages:
        return {"error": "Messages list is empty"}

    try:
        # Upstage Solar LLM 호출 (messages 리스트 사용)
        response = client.chat.completions.create(
            model="solar-mini", # 사용할 모델을 solar-mini로 변경
            messages=[message.model_dump() for message in request.messages], # Pydantic 모델 객체를 딕셔너리 리스트로 변환
            stream=False, # 스트리밍 사용 여부
        )

        # 응답 내용 추출
        ai_response_content = response.choices[0].message.content

        # 대화 종료 조건 확인 (예: 특정 키워드나 문구가 포함된 경우)
        should_end = any(keyword in ai_response_content.lower() for keyword in [
            "충분한 정보를 수집했습니다",
            "병원 브리핑을 준비하겠습니다",
            "이제 병원으로 전송할 수 있습니다",
            "응급실에 전달할 준비가 되었습니다",
            "충분한",
            "충분히",
            "전송",
            "전달",
            "전송할 준비가 되었습니다",
            "전달할 준비가 되었습니다",
            "전송할 준비가 되었습니다",
            "전달할 준비가 되었습니다",
            "전송할 준비가 되었습니다",
            "전달할 준비가 되었습니다",
        ])

        return {
            "response": ai_response_content,
            "should_end": should_end
        }

    except Exception as e:
        print(f"Error during Solar LLM processing: {e}")
        return {"error": f"An error occurred: {e}", "should_end": False} 