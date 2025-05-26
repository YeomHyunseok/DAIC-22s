import os
import tempfile
import whisper
import json
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from openai import OpenAI
from langchain_upstage import UpstageEmbeddings, ChatUpstage
from langchain_pinecone import PineconeVectorStore
from langchain_core.messages import HumanMessage

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
index_name = "langchain-demo"
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

@app.post("/chat")
async def chat_with_ai(request: ChatRequest):
    if not request.messages:
        return {"error": "Messages list is empty"}

    try:
        # 전체 대화 기록
         conversation = [{"role": msg.role, "content": msg.content} for msg in request.messages]

        # ✅ 가장 최근 user 입력 추출
         patient_state = [msg.content for msg in request.messages if msg.role == "user"][-1]
         query = generate_search_query(patient_state)

        # Step 2: 벡터 검색 + 필터
         docs_with_scores = vectorstore.similarity_search_with_score(query, k=5)
         docs = [doc for doc, score in docs_with_scores]
         scores = [score for doc, score in docs_with_scores]

        # Step 3: 치료 요약 및 추가 정보 유무 판단
         rag_response, required_info = llm_infer_treatment_and_missing_info(
            docs, scores, patient_state, threshold=0.2, solar_model=solar_model
        )

         conversation.append({"role": "assistant", "content": rag_response})

         
        # Step 5: 필요시 최종 브리핑 생성
         should_end = not required_info
         medical_brief = None
         if should_end:
            medical_brief = generate_medical_brief(conversation, solar_model)

         return {
            "response": rag_response,
            "should_end": should_end,
            "conversation": conversation,
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

        reference_list = [doc.metadata["source"] for doc in filtered_docs if "source" in doc.metadata]
        treatment_by_pdf = {}

        for title in reference_list:
            with open(f'./references/{title}.json', 'r', encoding='utf-8') as f:
                data = json.load(f)
                pdf_content = data.get("full_text", "")
                prompt = f"""
                너는 응급의학 논문이나 문서를 분석해서 '치료(처치)' 관련 내용만 요약하는 AI야.
                다음은 '{title}'라는 문서의 전체 내용이야:
                \"\"\"{pdf_content}\"\"\"
                이 문서에서 '치료 또는 처치에 관련된 핵심 내용'만 뽑아서 요약해줘.
                """
                response = solar_model.invoke([HumanMessage(content=prompt)])
                treatment_by_pdf[title] = response.content.strip()

        if not treatment_by_pdf:
            return "관련된 PDF 문서 내용을 찾을 수 없습니다.", False

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
        추가 정보가 필요 없다면 반드시 \"추가 정보 필요 없음\"이라고 말해줘.
        """
        final_response = solar_model.invoke([HumanMessage(content=reasoning_prompt)])
        output = final_response.content.strip()

        additional_info_needed = not (
            "추가 정보 필요 없음" in output or "더 필요한 정보는 없습니다" in output
        )

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
