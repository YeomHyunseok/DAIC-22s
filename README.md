# 🚨 Emergency AI Agent

## 📌 개요
**Emergency AI Agent**는 교통사고, 실신, 중증 외상 등 **응급 상황**에서 구조요원이 환자 상태를 음성으로 보고하면,  
의료 문서를 기반으로 **실시간 응급 판단, 질문 생성, 병원 브리핑 생성**까지 도와주는 **RAG 기반 AI 응급 어시스턴트**입니다.  
Upstage의 Document Parse API와 Solar LLM을 활용하여 **신뢰도 높은 근거 기반 대응**을 구현했습니다.

---

## 🎯 문제 정의 및 기대 효과

### ❗ 해결하고자 한 문제
- 구조요원이 골든타임 내 적절한 응급 조치를 위해 빠르게 판단해야 하나, 정보 부족과 시간 압박으로 인해 **객관적 근거 없이 추측에 의존하는 경우**가 많음
- 병원에 전달하는 환자 정보가 **불완전하거나 비표준적**인 경우도 많음

### ✅ 기대 효과
- AI가 **의료 문서 기반으로 응급 대응을 가이드**하여 구조요원의 부담을 줄임
- **현장 응답 → 병원 브리핑 자동화**로 골든타임 효율 개선
- ATLS, AHA 등 국제 가이드라인 기반 **신뢰도 있는 의료 의사결정 지원**
- 장기적으로 재난 대응, 군사 응급, 원격 응급 분야로의 확장 가능

---

## ✅ Upstage API 활용

| API | 활용 목적 |
|-----|------------|
| **Document Parse API** | 의료 가이드라인(PDF)을 구조화된 Markdown 형태로 변환 |
| **Embedding API** | 환자 상태와 문서 쿼리를 벡터화해 유사 문서 검색 |
| **Solar LLM API** | 질문 자동 생성, 응급조치 응답 생성, 병원 브리핑 문서 생성 |
| **Groundedness Check API** (선택) | 응답이 실제 문서에 기반했는지 검증하여 신뢰도 강화 |

---

## 🚀 주요 기능

- ✨ **현장 보고 기반 증상 분석**
  - 구조요원의 음성 입력 → 텍스트 변환 → 의료 문서 검색 및 증상 추론
  - 유사 증례 기반 응급 판단 가이드
- ✨ **질문 자동 생성 및 음성 안내**
  - AI가 필요한 질문(GCS, 맥박 등)을 자동 생성하고 구조요원에게 안내
- ✨ **병원 전송용 브리핑 자동 생성**
  - 환자 상태, 응답 요약, 의심 질환, 초기 처치 계획을 문서화하여 병원 전달

---


---

## 🔬 기술 구현 요약

- **Upstage DP**: ATLS, AHA 등 의료 문서 PDF를 Markdown으로 변환
- **RAG 파이프라인**: 환자 상태 → 유사 문서 검색 → 문맥 기반 응답 생성
- **Solar LLM**: 질문 생성, 응답 요약, 리포트 생성까지 전담
- **Streamlit UI**: 현장 입력 시나리오 기반 데모 구현

---

## 🧰 기술 스택 및 시스템 아키텍처

| 구성 | 기술 |
|------|------|
| 언어 | Python |
| 인터페이스 | Streamlit |
| 검색 | FAISS + Upstage Embedding |
| 생성 모델 | Upstage Solar LLM |
| 문서 파싱 | Upstage Document Parse API |
| 흐름 제어 | LangChain, PyTorch, requests |

![시스템 아키텍처](./assets/architecture.png)

---

## 🔧 설치 및 사용 방법

### ✅ [프론트엔드]

bash
- cd frontend            # 프론트엔드 디렉토리로 이동
- npm install            # 처음 한 번만: 의존성 설치
- npm run dev            # 개발 서버 실행 (기본 포트: 5173)

### ✅ [백엔드]
- cd backend                         # 백엔드 디렉토리로 이동
- source venv/Scripts/activate       # 가상환경 활성화 (Windows 기준)
- pip install -r requirements.txt    # 처음 한 번만: 의존성 설치
- uvicorn main:app --reload --port 8000  # FastAPI 서버 실행



## 📁프로젝트 구조


## 🧑‍🤝‍🧑팀원 소개 
| 이름  | 역할                | GitHub                                     |
| --- | ----------------- | ------------------------------------------ |
| 염현석 | 역할 | [@YeomHyunseok](https://github.com/YeomHyunseok) |
| 정승한 | 역할 | [@202255605](https://github.com/202255605)   |
| 임영훈 | 역할 | [@yhoon37](https://github.com/yhoon37)   |
| 김진우 | 역할 | [@maureen272](https://github.com/maureen272)   |


## 💡 참고 자료 및 아이디어 출처 (Optional)
