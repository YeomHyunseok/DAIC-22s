# 🚨 Emergency AI Agent 

## 📌 개요
**Emergency AI Agent**는 교통사고, 실신, 중증 외상 등 **응급 상황**에서 구조요원 및 일반 시민이 환자 상태를 음성으로 보고하면,  
의료 문서를 기반으로 **실시간 응급 판단, 질문 생성, 병원 브리핑 생성**까지 도와주는 **RAG 기반 AI 응급 어시스턴트**입니다.  
Upstage의 Document Parse API와 Solar LLM을 활용하여 **신뢰도 높은 근거 기반 대응**을 구현했습니다.

---

## 🎯 문제 정의 및 기대 효과

### ❗ 해결하고자 한 문제
- 응급상황 발생 시 구조요원이 아닌 일반 시민들은 정보 부족과 시간 압박으로 인해 **객관적 근거 없이 추측에 의존하는 경우**가 많음
- 구조요원의 경우 현장에 처음부터 있었던 것이 아니기에 병원에 상황을 **정확한 상황을 전달**하는데 어려움이 있을 수 있음
- 병원에 전달하는 환자 정보가 **불완전하거나 비표준적**인 경우도 많음

### ✅ 기대 효과
- AI가 **의료 문서 기반으로 응급 대응을 가이드**하여 구조요원 및 일반 시민의 부담을 줄임
- **현장 응답 → 병원 브리핑 자동화**로 골든타임 효율 개선
- ATLS, AHA 및 의학관련 책과 논문 등 국제 가이드라인 기반 **신뢰도 있는 의료 의사결정 지원**
- 장기적으로 재난 대응, 군사 응급, 원격 응급 분야로의 확장 가능

---

## ✅ Upstage API 활용

| API | 활용 목적 |
|-----|------------|
| **Document Parse API** | 의료 가이드라인(PDF)을 구조화된 HTML 형태로 변환 |
| **Embedding API** | 환자 상태와 문서 쿼리를 벡터화해 유사 문서 검색 |
| **Solar LLM API** | 질문 자동 생성, 응급조치 응답 생성, 병원 브리핑 문서 생성 |

---

## 🚀 주요 기능

- ✨ **현장 보고 기반 증상 분석**
  - 음성 입력 → 텍스트 변환 → 의료 문서 검색 및 증상 추론
  - 유사 증례 기반 응급 판단 가이드
- ✨ **질문 자동 생성 및 음성 안내**
  - AI가 필요한 질문(GCS, 맥박 등)을 자동 생성하고 사용자에게 안내
- ✨ **병원 전송용 브리핑 자동 생성**
  - 환자 상태, 응답 요약, 의심 질환, 초기 처치 계획을 이전 답변들을 토대로 요약하여 문서화한 후 병원 전달

---

## 🔬 기술 구현 요약

- **Upstage DP**: ATLS, AHA 등 의료 문서 PDF를 HTML로 변환
- **RAG 파이프라인**: 환자 상태 → 유사 문서 검색 → 문맥 기반 응답 생성
- **Solar LLM**: 질문 생성, 응답 요약, 리포트 생성까지 전담

---

## 🧰 기술 스택 및 시스템 아키텍처

| 구성 | 기술 |
|------|------|
| 언어 | Python, TypeScript |
| 백엔드 | FastAPI |
| 프론트엔드 | React (Vite) |
| 음성 인식 | OpenAI Whisper |
| 검색 | Pinecone + Upstage Embedding |
| 생성 모델 | Upstage Solar LLM |
| 문서 파싱 | Upstage Document Parse API |
| 흐름 제어 | LangChain, requests |

---

## 🔧 설치 및 사용 방법

### 기본 요구사항  : node.js(LTS 버전 권장) , phython 3.11 (호환성을 위해 3.11 버전 필수)

### ✅ [프론트엔드]

```bash
- cd frontend            # 프론트엔드 디렉토리로 이동
- npm install            # 처음 한 번만: 의존성 설치 (node.js가 기본설정으로 설치되어 있어야 합니다.)
- npm run dev            # 개발 서버 실행 (기본 포트: 5173)
```
### ✅ [백엔드]
- 새로운 git bash 실행
  ```bash
- cd backend                         # 백엔드 디렉토리로 이동
- rm -rf venv
- py -3.11 -m venv venv              # 기본환경으로 파이썬 3.11 버전이 설치되어 있어야 합니다.
- source venv/Scripts/activate       # 가상환경 활성화 (Windows 기준)
- phython --version                  # Python 3.11.x 확인
- python -m pip install -r requirements.txt    # 필요한 패키지들 설치
- python -m pip install -r requirements.txt    # 처음 한 번만: 의존성 설치
- python -m uvicorn main:app --reload --port 8000  # FastAPI 서버 실행
  ```

### ✅ 백엔드 실행 전에 backend 폴더에 .env 파일을 생성하고 다음 내용을 추가하세요:
UPSTAGE_API_KEY=your_upstage_api_key_here

OPENAI_API_KEY=your_openai_api_key_here

PINECONE_API_KEY=your_pinecone_api_key_here

DEBUG=True


## 📁프로젝트 구조
![image](https://github.com/user-attachments/assets/c78dafc2-ab9e-4b1e-a2fd-64811cf2003f)


## 🧑‍🤝‍🧑팀원 소개 
| 이름  | 역할                | GitHub                                     |
| --- | ----------------- | ------------------------------------------ |
| 염현석 | FastAPI 백엔드, AI 서버 개발, 프로젝트 총괄 | [@YeomHyunseok](https://github.com/YeomHyunseok) |
| 정승한 | 웹 크롤링, Document Parsing , 임베딩 | [@202255605](https://github.com/202255605)   |
| 임영훈 | RAG DB구축,  대화 흐름 제어 | [@yhoon37](https://github.com/yhoon37)   |
| 김진우 | 프론트, prompt엔지니어링, STT 구현 | [@maureen272](https://github.com/maureen272)   |


## 💡 참고 자료 및 아이디어 출처 (Optional)
