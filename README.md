<img width="621" height="224" alt="image" src="https://github.com/user-attachments/assets/6698ed4b-d866-4f97-ac77-8a8ab6fd8dcd" />

**ZapSheet**는 React + TypeScript로 구현한 **경량 웹 스프레드시트**입니다.  
셀 편집/선택/자동채우기/Undo·Redo/병합/스타일/수식 등 스프레드시트의 핵심 사용 흐름을 웹에서 직접 구현했습니다.

👉 **바로 사용해보기:** https://zapsheet.pages.dev/  
- 접속 후 **`Demo로 로그인하기`** 버튼을 누르면 **Supabase 인증 없이** 바로 체험할 수 있습니다.

---

## ✨ 주요 기능

### 🧩 기본 스프레드시트 기능
- 셀 편집
- 드래그 기반 다중 선택
- 키보드 이동 (방향키, 엔터 등)
- 행 / 열 리사이즈
- 셀 병합 및 해제
- 기본 스타일 적용 (정렬, 폰트 크기 등)

### 🔁 Undo / Redo
- 스냅샷 기반 히스토리 관리
- 상태 복원을 통해 안정적인 실행 취소 / 다시 실행 지원

### 📊 자동 채우기 (Auto Fill)
- 드래그 방향 분석
- 숫자 등차 패턴 추론
- 행/열 단위 패턴 적용

### 🧮 수식 처리
- 기본 수식 입력 및 평가
- 셀 참조 기반 계산
- 자동 재계산 구조

### 📋 복사 / 붙여넣기
- TSV 기반 데이터 변환
- 다중 셀 복사 및 붙여넣기 지원

### 🗂 멀티 시트 지원
- 시트 추가 / 삭제 / 이름 변경
- 시트 순서 변경

---

## 🛠 기술 스택

- **React**
- **TypeScript**
- **Zustand** (전역 상태 관리)
- **Supabase** (데이터 저장 및 동기화)
- **Cloudflare Pages** (배포)

---

## 🚀 실행 방법

```bash
npm install
npm run dev
