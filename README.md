# melon-slf

> MelonDCF 자체 규격인 SLF 가사 파일을 간단하게 리버싱하는 비공식 라이브러리입니다.

[![npm version](https://img.shields.io/npm/v/melon-slf-parser.svg?style=flat-rounded)](https://www.npmjs.com/package/melon-slf)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

`melon-slf`는 Melon Player 및 Samsung Music에서 사용하는 자체 싱크가사 데이터 포맷(`.slf`)를 Node.js 환경에서 쉽게 다룰 수 있도록 JSON 형태로 파싱해 주는 비공식 라이브러리 입니다.

---

## 사용하기 전에

**이 라이브러리는 개인의 교육 및 학슴용으로 개발되었습니다.**
이 프로젝트를 사용함으로써 발생하는 모든 피해나 손실은 사용하는 본인에게 책임이 있습니다.

SLF 파일의 리버싱 로직 및 설명은 `src/index.ts` 파일의 주석을 참고해주세요.

---

## 사용법

아래 설치 명령어를 통해 라이브러리를 설치해주세요.

### 빠른 시작

```ts
import { parseSLF } from "melon-slf";
import * as fs from "fs";

// 1. 멜론 SLF 파일 읽기
const slfBuffer = fs.readFileSync("Smile For You.slf");

// 2. 파싱 함수 실행
const result = parseSLF(slfBuffer);

console.log(result);
```

### 출력 구조

```json
{
  "success": true,
  "data": [
    { "timeMs": 11500, "timestamp": "[00:11.50]", "text": "아주 작은 잎 하나가 It's you, yeah" },
    { "timeMs": 17000, "timestamp": "[00:17.00]", "text": "나에게 떨어졌을 때" }
  ]
}
```

### .lrc 형식으로 변환하기
```
convertLRC(slfResult: SLFResult): string | null;
```
### 출력 구조
```
[00:11.50] 아주 작은 잎 하나가 It's you, yeah
[00:17.00] 나에게 떨어졌을 때
```


### 사용예시
[일본어]

https://github.com/user-attachments/assets/9db45c07-98d6-444e-9477-3c7c26d5e100

[한국어]

https://github.com/user-attachments/assets/b3f0734f-d9ab-4649-b88e-a27f8fa5db29

---

## 설치

```bash
npm install melon-slf
# or
yarn add melon-slf
# or
pnpm add melon-slf
```

---

# License
This project is licensed under the **MIT License**.