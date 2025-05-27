import os
import tempfile
import whisper
import json
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from openai import OpenAI
from langchain_upstage import UpstageEmbeddings, ChatUpstage
from langchain_pinecone import PineconeVectorStore
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain.prompts import ChatPromptTemplate
from fastapi import HTTPException

# ==== 환경 설정 ====
load_dotenv()

UPSTAGE_API_KEY = os.getenv("UPSTAGE_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENV = os.getenv("PINECONE_ENV")

if not UPSTAGE_API_KEY:
    raise ValueError("UPSTAGE_API_KEY 환경 변수가 설정되지 않았습니다.")

# Whisper 모델 로드
whisper_model = whisper.load_model("base")

# Solar LLM 초기화 (ChatUpstage)
solar_model = ChatUpstage(api_key=UPSTAGE_API_KEY, model="solar-pro")

# Pinecone 벡터 DB 초기화
embedding_model = UpstageEmbeddings(api_key=UPSTAGE_API_KEY, model="embedding-query")
index_name = "emergency-medical-kb"
vectorstore = PineconeVectorStore(
    index_name=index_name,
    embedding=embedding_model,
    pinecone_api_key=PINECONE_API_KEY,
)

# FastAPI 앱 초기화
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 요청 바디 정의
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[Message]

class BriefingRequest(BaseModel):
    conversation: list[Message]

@app.get("/")
async def root():
    return {"message": "EmergencyAI Backend is running!"}

@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(await audio.read())
            tmp_path = tmp.name
        result = whisper_model.transcribe(tmp_path, language="ko")
        os.remove(tmp_path)
        return {"text": result["text"]}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

import re

def format_ai_response(text: str) -> str:
    # Add blank lines before numbered items
    return re.sub(r"(?<!\n)([1-4]\.)", r"\n\n\1", text).strip()

@app.post("/chat")
async def chat_with_ai(request: ChatRequest):
    if not request.messages:
        return {"error": "Messages list is empty"}

    try:
        user_turns = sum(1 for msg in request.messages if msg.role == "user")

        # Build message history
        messages = []
        for msg in request.messages:
            if msg.role == "user":
                messages.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                messages.append(AIMessage(content=msg.content))

        # RAG 처리 추가
        patient_state = "\n".join([msg.content for msg in messages if isinstance(msg, HumanMessage)])
        docs_with_scores = vectorstore.similarity_search_with_score(patient_state, k=1)
        docs = [doc for doc, score in docs_with_scores]
        scores = [score for doc, score in docs_with_scores]
        
        rag_response, required_info = llm_infer_treatment_and_missing_info(
            docs, scores, patient_state, threshold=0.2, solar_model=solar_model
        )

        messages.append(AIMessage(content=rag_response))

        # Generate AI response
        response = solar_model.invoke(messages)
        rag_response = format_ai_response(response.content.strip())

        # 4턴이면 종료하고 브리핑 생성
        should_end = user_turns == 4
        medical_brief = None
       
        return {
            "response": rag_response,
            "should_end": should_end,
            "conversation": [m.dict() if hasattr(m, 'dict') else {"role": m.type, "content": m.content} for m in messages],
            "medical_brief": medical_brief
        }

    except Exception as e:
        print(f"Solar LLM error: {e}")
        return {"error": f"An error occurred: {e}", "should_end": False}

# ===================== 확장: RAG 기반 치료 정보 추론 =====================

def generate_search_query(patient_state):
    return patient_state

def llm_infer_treatment_and_missing_info(docs, scores, current_state, threshold, solar_model):
    try:
        filtered_docs = [docs[i] for i in range(len(scores)) if scores[i] >= threshold]
        if not filtered_docs:
            return "관련된 논문이 충분하지 않습니다.", False

        reference_list = []
        for doc in filtered_docs:
            if hasattr(doc, 'metadata') and isinstance(doc.metadata, dict):
                source = doc.metadata.get('source', '')
                if source:
                    reference_list.append(source.split('.')[0])
            else:
                print(f"[경고] 문서 메타데이터 없음: {doc}")

        treatment_by_pdf = {}

        for i, title in enumerate(reference_list):
            print('------------------------------')
            print(title)
            try:
                with open(f'../reference/{title}.json', 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    pdf_content = data.get("full_text", "")
            except FileNotFoundError:
                print(f"[경고] 파일 없음: {title}.json — Solar LLM이 사용자 상태만 기반으로 판단")
                continue  # PDF가 없으면 해당 문서는 건너뜀

            prompt = f"""
            너는 응급의학 논문이나 문서를 분석해서 '치료(처치)' 관련 내용만 요약하는 AI야.
            다음은 '{title}'라는 문서의 전체 내용이야:
            \"\"\"{pdf_content}\"\"\" 
            이 문서에서 '치료 또는 처치에 관련된 핵심 내용'만 뽑아서 요약해줘.
            """
            response = solar_model.invoke([HumanMessage(content=prompt)])
            print(response.content.strip())
            treatment_by_pdf[title] = response.content.strip()

        # PDF 기반 요약이 하나도 없을 경우, 직접 상태 기반 응답
        if not treatment_by_pdf:
            fallback_prompt = f"""
            다음은 현재 응급환자의 상태야:
            \"\"\"{current_state}\"\"\" 

            위 상태를 보고 어떤 처치나 치료를 해야 할지 설명해줘.
            추가로 알아야 할 정보가 있다면 그것도 구체적으로 말해줘.
            """
            fallback_response = solar_model.invoke([HumanMessage(content=fallback_prompt)])
            output = fallback_response.content.strip()
            additional_info_needed = not (
                "추가 정보 필요 없음" in output or "더 필요한 정보는 없습니다" in output
            )
            return output, additional_info_needed

        # 정상적으로 치료 요약된 경우
        all_treatments = "\n\n".join([
            f"[{src}]\n{summary}" for src, summary in treatment_by_pdf.items()
        ])
        reasoning_prompt = f"""
        다음은 여러 응급의학 문서에서 추출한 치료 관련 요약 정보야:
        {all_treatments}

        현재 응급환자의 상태는 다음과 같아:
        \"\"\"{current_state}\"\"\" 

        위 정보를 바탕으로 환자에게 어떤 치료를 해야 하는지 설명하고,
        추가로 알아야 할 정보가 있다면 무엇인지 구체적으로 알려줘.
        추가 정보가 필요 없다면 반드시 "추가 정보 필요 없음"이라고 말해줘.
        """
        final_response = solar_model.invoke([HumanMessage(content=reasoning_prompt)])
        output = final_response.content.strip()

        additional_info_needed = not (
            "추가 정보 필요 없음" in output or "더 필요한 정보는 없습니다" in output
        )
        print(output)
        return output, additional_info_needed

    except Exception as e:
        print(f"[RAG 처리 오류]: {e}")
        return "치료 정보를 분석하는 중 오류가 발생했습니다.", False

def generate_medical_brief(conversation, solar_model):
    dialogue = ""
    for turn in conversation:
        role = "👨‍⚕️응급구조사" if turn["role"] == "user" else "🤖AI"
        dialogue += f"{role}: {turn['content']}\n"

    prompt = f"""
    너는 병원에 환자 상태를 정리해서 전달하는 응급구조사 AI야.

    아래는 현장에서 응급구조사와 AI 간의 실제 대화 로그야:
    -------------------------------
    {dialogue}
    -------------------------------

    위 대화를 기반으로 병원에 전달할 공식 브리핑 문서를 작성해줘.
    포맷은 다음과 같아:

    ---
    🧾 [환자 상태 요약]
    - (처음 보고된 상태 요약)

    💉 [AI가 제안한 치료 및 처치 요약]
    - (치료 요약 요점)

    ❗ [현장에서 수집된 추가 정보]
    - (구조사가 나중에 입력한 보완 정보)

    📌 [최종 판단 또는 이송 지시 요약]
    - (AI가 최종적으로 내린 판단 및 병원 이송 필요 여부)
    ---
    """
    response = solar_model.invoke([HumanMessage(content=prompt)])
    return response.content.strip()

@app.post("/generate_medical_brief")
async def generate_medical_brief(request: Request):
    try:
        data = await request.json()
        conversation = data.get("conversation", [])
        
        if not conversation:
            raise HTTPException(status_code=400, detail="대화 내용이 없습니다.")
        
        # 대화 내용을 하나의 문자열로 결합
        conversation_text = "\n".join([
            f"{'응급구조사' if msg['role'] == 'user' else 'AI'}: {msg['content']}"
            for msg in conversation
        ])
        
        print("대화 내용:", conversation_text)  # 디버깅용 로그
        
        # LLM에 전달할 프롬프트 생성
        prompt = f"""너는 응급상황을 분석하고 의료 브리핑을 작성하는 AI 의료 전문가입니다.
아래 대화 내용을 바탕으로 구조화된 의료 브리핑을 작성해주세요.

대화 내용:
{conversation_text}

다음 형식으로 정확히 응답해주세요:

1. 환자 상태 요약
- 환자의 기본 정보 (나이, 성별)
- 현재 상태와 주요 증상
- 의식 상태
- 생체징후 (알려진 경우)

2. 치료 및 처치 요약
- 현재까지 시행된 처치
- 추가로 필요한 치료
- 약물 투여 내역 (있는 경우)

3. 추가 정보
- 알레르기나 기저질환
- 사고/증상 발생 시점
- 특이사항이나 주의점

4. 최종 판단
- 의심되는 질환/상태
- 응급도 평가
- 권장 조치사항

각 섹션은 반드시 bullet point(-)로 시작하는 항목들로 구성해주세요.
각 항목은 구체적이고 명확하게 작성해주세요.
모든 섹션에 대해 최소한 하나 이상의 항목을 작성해주세요."""

        # Solar LLM 호출
        response = solar_model.invoke([HumanMessage(content=prompt)])
        content = response.content.strip()
        
        print("LLM 응답:", content)  # 디버깅용 로그
        
        return {"content": content}
        
    except Exception as e:
        print(f"브리핑 생성 중 오류: {str(e)}")  # 디버깅용 로그
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/send_to_hospital")
async def send_to_hospital(briefing_data: dict):
    try:
        # TODO: 실제 병원 전송 로직 구현
        # 현재는 성공 응답만 반환
        return {"status": "success", "message": "병원으로 브리핑이 전송되었습니다."}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"병원 전송 중 오류가 발생했습니다: {str(e)}"}
        )
