import os
import requests
from dotenv import load_dotenv

# .env 파일 로드 (DAIC-22s 디렉토리에 있어야 합니다)
load_dotenv()

UPSTAGE_API_KEY = os.getenv("UPSTAGE_API_KEY")
UPSTAGE_API_URL = "https://api.upstage.ai"

def test_document_parse():
    """Document Parse API 테스트"""
    if not UPSTAGE_API_KEY:
        print("UPSTAGE_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.")
        return False
        
    headers = {
        "Authorization": f"Bearer {UPSTAGE_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # 테스트용 PDF 파일 경로 (DAIC-22s/test_documents/ 에 실제 PDF 파일이 필요합니다)
    test_pdf_path = "test_documents/emergency_guidelines.pdf"
    
    if not os.path.exists(test_pdf_path):
        print(f"테스트 PDF 파일이 없습니다: {test_pdf_path}")
        print("DAIC-22s/test_documents/ 폴더에 테스트할 PDF 파일을 넣어주세요.")
        return False
        
    try:
        print(f"\n{test_pdf_path} 파일로 Document Parse API 테스트 중...")
        with open(test_pdf_path, "rb") as f:
            files = {"file": f}
            response = requests.post(
                f"{UPSTAGE_API_URL}/v1/document/parse",
                headers=headers,
                files=files
            )
            
        print("Document Parse API 응답 상태 코드:", response.status_code)
        # 응답 본문 전체를 출력하기에는 너무 길 수 있으므로 일부만 출력합니다.
        try:
            response_json = response.json()
            print("응답 내용 미리보기:", str(response_json)[:500] + "...")
        except Exception as e:
             print("응답 본문을 읽는데 실패했습니다.", e)
             print("응답 내용:", response.text[:500] + "...")
             
        return response.status_code == 200
        
    except requests.exceptions.RequestException as e:
        print(f"Document Parse API 요청 실패: {str(e)}")
        print("API 키 또는 네트워크 상태를 확인해주세요.")
        return False
    except Exception as e:
        print(f"예상치 못한 오류 발생: {str(e)}")
        return False

def test_embedding():
    """Embedding API 테스트"""
    if not UPSTAGE_API_KEY:
        print("UPSTAGE_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.")
        return False
        
    headers = {
        "Authorization": f"Bearer {UPSTAGE_API_KEY}",
        "Content-Type": "application/json"
    }
    
    test_text = "환자가 의식을 잃고 호흡이 불규칙합니다."
    
    try:
        print("\nEmbedding API 테스트 중...")
        response = requests.post(
            f"{UPSTAGE_API_URL}/v1/embeddings",
            headers=headers,
            json={"input": test_text}
        )
        
        print("Embedding API 응답 상태 코드:", response.status_code)
        try:
             response_json = response.json()
             print("응답 내용 미리보기:", str(response_json)[:500] + "...")
        except Exception as e:
             print("응답 본문을 읽는데 실패했습니다.", e)
             print("응답 내용:", response.text[:500] + "...")
             
        return response.status_code == 200
        
    except requests.exceptions.RequestException as e:
        print(f"Embedding API 요청 실패: {str(e)}")
        print("API 키 또는 네트워크 상태를 확인해주세요.")
        return False
    except Exception as e:
        print(f"예상치 못한 오류 발생: {str(e)}")
        return False

if __name__ == "__main__":
    print("=== Upstage API 테스트 시작 ===")
    
    print("\n--- Document Parse API 테스트 ---")
    dp_result = test_document_parse()
    print(f"\nDocument Parse API 테스트 최종 결과: {'성공' if dp_result else '실패'}")
    
    print("\n--- Embedding API 테스트 ---")
    emb_result = test_embedding()
    print(f"\nEmbedding API 테스트 최종 결과: {'성공' if emb_result else '실패'}")
    
    print("\n=== Upstage API 테스트 종료 ===") 