import type { SLFResult } from "./types";

/**
 * 멜론 SLF 바이너리 버퍼를 순회하며 가사와 싱크 시간을 리버싱하는 함수
 * @param fileBuffer SLF 파일 원본 데이터 버퍼
 * @returns { success: boolean, data: SLFData[] | null }
 */
export function parseSLF(fileBuffer: Buffer): SLFResult {
  // 가사 데이터의 시작을 알리는 기준점 검색
  const headerMarker = Buffer.from("korplain/text", "utf-8");
  const markerIndex = fileBuffer.indexOf(headerMarker);

  // 기준 마커가 없다면 올바른 파일 포맷이 아님
  if (markerIndex === -1) {
    return { success: false, data: null };
  }

  // "korplain/text" 문자열이 끝난 위치에서 5바이트를 더 전진한 지점이 첫 번째 레코드의 시작점(r11)
  let r11 = markerIndex + headerMarker.length + 5;
  const totalSize = fileBuffer.length;
  const parsedLyrics = [];

  while (totalSize > r11) {
    // 최소한 레코드 헤더(Stide 4바이트 + 타임스탬프 4바이트 = 8바이트)를 읽을 공간이 없으면 정지
    if (r11 + 8 > totalSize) break;

    // r12 (Stride): 현재 위치부터 다음 레코드 시작점까지의 바이트 수
    // 가사 길이가 매번 다르므로 이 Stride 값도 매 레코드마다 동적으로 변화
    const r12 = decodeSynchsafeInt(fileBuffer, r11);

    // r13 (Timestamp): 현재 가사 마디가 시작되어야 하는 실제 재생 시간 (ms 단위)
    const r13 = decodeSynchsafeInt(fileBuffer, r11 + 4);

    const delimiter = Buffer.from([0x33, 0x30, 0x31, 0x31, 0x6d]); // 가사 직전의 마커 "3011m"
    // 현재 헤더(r11+8) 이후부터 3011m 마커가 최초로 나타나는 절대 위치를 검색
    const nextDelimiterPos = fileBuffer.indexOf(delimiter, r11 + 8);
    // 현재 레코드가 완전히 끝나는 바이트 주소 경계면을 계산
    const recordEnd = r11 + r12;

    // 3011m 마커가 존재하고, 그 마커가 현재 레코드 내부에 있을 때만 파싱
    if (nextDelimiterPos !== -1 && nextDelimiterPos < recordEnd) {
      // 3011m 마커 바로 다음 바이트부터 레코드 끝 범위까지가 순수 가사 데이터
      const textBuffer = fileBuffer.subarray(
        nextDelimiterPos + delimiter.length,
        recordEnd,
      );

      // 바이너리를 UTF-8 문자열로 변환
      const rawString = textBuffer.toString("utf-8");

      // 정규식을 사용하여 한글, 영어, 일본어, 중국어, 숫자, 공백, 특수문자 일부만 필터링
      const matches = rawString.match(
        /[a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FBF\s\(\)\!,\.\?\-\'’\/]+/g,
      );

      if (matches) {
        // 분리되어 매칭된 문자열 조각들을 하나로 합치고, 연속된 공백은 한 칸으로 최적화
        let lyricLine = matches.join("").trim().replace(/\s+/g, " ");

        if (
          lyricLine &&
          lyricLine.length > 0 &&
          !lyricLine.startsWith("korplain") && // 헤더 노이즈 차단
          !lyricLine.startsWith("text/plain") && // 메타데이터 노이즈 차단
          !/^[\d\s]+$/.test(lyricLine) // 가사가 아니라 데이터만 있는 줄은 제거
        ) {
          parsedLyrics.push({
            timeMs: r13,
            timestamp: formatTime(r13), // 포맷터 함수를 거쳐 [00:00.00] 형태로 변환
            text: lyricLine,
          });
        }
      }
    }

    // 현재 레코드의 분석이 끝났으므로, 아까 헤더에서 읽었던 Stride(r12) 거리만큼
    // 오프셋 포인터를 통째로 전진시켜 다음 가사 마디 레코드의 시작점으로 이동
    r11 += r12;
  }

  return {
    success: true,
    // 파싱 과정에서 파일 구조상 오프셋이 뒤틀려 시간 순서가 꼬였을 가능성을 대비해,
    // 오직 실제 재생 시간(timeMs) 오름차순 기준으로 정렬하여 최종 반환
    data: parsedLyrics.sort((a, b) => a.timeMs - b.timeMs),
  };
}

/**
 * 멜론 SLF 파일의 Synchsafe Integer(7비트 정수 압축 구조)를 해독하는 함수
 * @param buffer SLF 파일 원본 데이터 버퍼
 * @param offset 정수를 읽기 시작할 버퍼의 바이트 위치 (r11)
 * @returns 7비트 조각들을 합산하여 복원한 실제 밀리초(ms) 시간 값
 */
function decodeSynchsafeInt(buffer: Buffer, offset: number): number {
  // 지정된 오프셋부터 연속된 4바이트를 읽어 배열에 할당
  // '& 255'는 바이트 데이터를 0~255 사이의 Unsigned 8-bit로 변환
  const iArr = [
    buffer[offset] & 255,
    buffer[offset + 1] & 255,
    buffer[offset + 2] & 255,
    buffer[offset + 3] & 255,
  ];

  // 각 바이트의 최상위 비트가 활성화되어 있는지 체크
  for (let i = 0; i < 4; i++) {
    const masked = iArr[i] & 128;
    if (masked > 0) {
      iArr[i] = masked;
    }
  }

  // 쪼개져 있던 7비트짜리 조각 4개를 하나로 합쳐 원래의 32비트 숫자로 복원
  // 일반적인 Big-Endian 정수는 8비트씩 밀어내지만 Synchsafe 정수는 유효 데이터가 7비트씩만 들어있으므로 7의 배수만큼 왼쪽으로 밀어냅니다
  return (
    (iArr[0] << 21) | // 첫 번째 바이트를 왼쪽으로 21비트 이동 (7 * 3)
    (iArr[1] << 14) | // 두 번째 바이트를 왼쪽으로 14비트 이동 (7 * 2)
    (iArr[2] << 7) | // 세 번째 바이트를 왼쪽으로 7비트 이동  (7 * 1)
    iArr[3] // 마지막 바이트는 그대로 둠 (7 * 0)
  );
}

/**
 * SLF 결과를 LRC 형식으로 변환하는 함수
 * @param slfResult SLF 파싱 결과
 * @returns LRC 형식의 가사 문자열 또는 null
 */
export function convertLRC(slfResult: SLFResult): string | null {
  if (!slfResult.success || !slfResult.data) {
    return null;
  }

  const lrcLines = slfResult.data.map((entry) => {
    return `${entry.timestamp} ${entry.text}`;
  });

  return lrcLines.join("\n");
}

function formatTime(ms: number) {
  if (ms < 0 || isNaN(ms)) ms = 0;
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const hundredths = Math.floor((ms % 1000) / 10);

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  const xx = String(hundredths).padStart(2, "0");

  return `[${mm}:${ss}.${xx}]`;
}

export type { SLFResult };
