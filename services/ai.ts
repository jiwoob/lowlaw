import { GoogleGenAI } from "@google/genai";

export async function summarizeText(
  textToSummarize: string,
  billName: string
): Promise<string> {
  if (!process.env.API_KEY) {
    throw new Error("Google Gemini API 키가 필요합니다. API_KEY 환경 변수를 설정해주세요.");
  }
  
  const prompt = `아래 법안의 "제안이유 및 주요내용"을 3가지 항목으로 간결하게 요약해줘.
각 항목은 글머리 기호(-)로 시작하고, 전문가가 아닌 일반인도 이해하기 쉽게 작성해줘.

- **핵심 목적**: (이 법안이 왜 필요한지, 무엇을 해결하려 하는지)
- **주요 변경사항**: (기존과 비교해서 구체적으로 무엇이 어떻게 바뀌는지)
- **기대 효과 / 영향**: (법안이 통과되면 누구에게 어떤 영향이 있는지)

---
**법안명**: ${billName}

**주요 내용**:
${textToSummarize.substring(0, 100000)}`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error summarizing with Gemini:", error);
    if (error instanceof Error) {
      if (error.message.includes('API key not valid')) {
          return "AI 요약 생성 실패: Gemini API 키가 유효하지 않습니다. API_KEY 환경 변수를 다시 확인해주세요.";
      }
      throw new Error(`AI 요약 생성 중 오류가 발생했습니다: ${error.message}`);
    }
    throw new Error("AI 요약 생성 중 알 수 없는 오류가 발생했습니다.");
  }
}