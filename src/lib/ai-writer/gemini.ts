import type { GeneratedAiArticle } from './content';
import { buildWriterPrompt, parseAndValidateArticle } from './content';

const MAX_ATTEMPTS = 3;

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message?: string };
}

export async function generateArticle(input: {
  topic: string;
  category: string;
  existingTitles: string[];
}): Promise<GeneratedAiArticle> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const prompt = buildWriterPrompt(
    input.topic,
    input.category,
    input.existingTitles,
  );
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: prompt }],
          },
          contents: [{ role: 'user', parts: [{ text: 'Write the requested post now.' }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.5,
          },
        }),
        signal: AbortSignal.timeout(60_000),
      });

      const payload = (await response.json()) as GeminiResponse;
      if (!response.ok) {
        throw new Error(
          `Gemini API returned ${response.status}: ${payload.error?.message ?? 'unknown error'}`,
        );
      }

      const text = payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? '')
        .join('')
        .trim();
      if (!text) {
        throw new Error('Gemini returned no article content');
      }

      return await parseAndValidateArticle(text);
    } catch (error) {
      lastError = error;
      console.error(`AI Writer generation attempt ${attempt}/${MAX_ATTEMPTS} failed`, error);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  throw new Error(
    `AI Writer could not generate a valid article after ${MAX_ATTEMPTS} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}
