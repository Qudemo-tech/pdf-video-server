import Anthropic from '@anthropic-ai/sdk';
import { Tone } from '../types';

let _anthropic: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return _anthropic;
}

const SYSTEM_PROMPT = `You are a professional video script writer. Your job is to convert written document content into a natural, engaging spoken-word script for a talking-head video.

RULES:
1. Write in first person as if you are directly speaking to the viewer.
2. Use a {tone} tone.
3. Target approximately {maxLengthSeconds} seconds of speaking time. Estimate ~150 words per minute of speech.
4. Start with a brief, engaging hook — do NOT start with "Hello" or "Welcome".
5. Summarize the key points of the document. Do not try to cover every detail.
6. Use transition phrases naturally: "Now, here's the interesting part...", "What this means is...", "Let's look at..."
7. End with a clear conclusion or call to action.
8. Do NOT include any stage directions, speaker labels, timestamps, or formatting.
9. Output ONLY the script text that will be spoken. Nothing else.
10. Do NOT use markdown formatting, headers, bullet points, or any special characters.
11. Keep sentences short and punchy — this will be spoken aloud, not read.`;

export async function generateScript(
  text: string,
  tone: Tone,
  maxLengthSeconds: number
): Promise<{ script: string; wordCount: number; estimatedDurationSeconds: number }> {
  // Truncate text if too long
  const truncatedText = text.length > 50000 ? text.substring(0, 50000) : text;

  const targetWordCount = Math.round((maxLengthSeconds / 60) * 150);

  const systemPrompt = SYSTEM_PROMPT
    .replace('{tone}', tone)
    .replace('{maxLengthSeconds}', String(maxLengthSeconds));

  const userMessage = `Convert the following document content into a video script.

Tone: ${tone}
Target duration: ${maxLengthSeconds} seconds (~${targetWordCount} words)

DOCUMENT CONTENT:
${truncatedText}`;

  const message = await getClient().messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  });

  const script = message.content
    .filter((block) => block.type === 'text')
    .map((block) => {
      if (block.type === 'text') return block.text;
      return '';
    })
    .join('')
    .trim();

  const wordCount = script.split(/\s+/).length;
  const estimatedDurationSeconds = Math.round((wordCount / 150) * 60);

  return {
    script,
    wordCount,
    estimatedDurationSeconds,
  };
}

/**
 * Generate page-by-page scripts: one intro + one per page.
 * Each script is ~25 words (~10 seconds of speech).
 */
export async function generatePageScripts(
  textByPage: string[],
  fullText: string
): Promise<{ pageNumber: number; script: string; wordCount: number }[]> {
  const truncatedFull = fullText.length > 10000 ? fullText.substring(0, 10000) : fullText;

  // Build prompt for all scripts at once
  const pageDescriptions = textByPage
    .map((text, i) => `--- PAGE ${i + 1} ---\n${text.substring(0, 2000)}`)
    .join('\n\n');

  const userMessage = `You are writing scripts for a page-by-page video explainer of a PDF document.

FULL DOCUMENT OVERVIEW (for context):
${truncatedFull.substring(0, 3000)}

PAGE CONTENTS:
${pageDescriptions}

Generate scripts as follows:
1. INTRO script (~25 words): A brief overview of what this document covers. This plays full-screen with just the avatar. Start with something engaging.
2. One script PER PAGE (~25 words each): A short explanation of what that specific page contains. These play with the page image as background.

RULES:
- Each script must be EXACTLY around 20-30 words. Be concise.
- Write in first person, speaking directly to the viewer.
- Do NOT use markdown, bullet points, or any formatting.
- Do NOT include labels like "INTRO:" or "PAGE 1:".
- Output ONLY the spoken text.

Format your response as JSON array:
[
  {"pageNumber": 0, "script": "intro script here..."},
  {"pageNumber": 1, "script": "page 1 script here..."},
  {"pageNumber": 2, "script": "page 2 script here..."}
]

Output ONLY valid JSON, nothing else.`;

  const message = await getClient().messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    system: 'You are a concise video script writer. Output only valid JSON as requested.',
    messages: [{ role: 'user', content: userMessage }],
  });

  const responseText = message.content
    .filter((block) => block.type === 'text')
    .map((block) => {
      if (block.type === 'text') return block.text;
      return '';
    })
    .join('')
    .trim();

  // Parse JSON from response (handle potential markdown code block wrapping)
  let jsonStr = responseText;
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  const parsed: { pageNumber: number; script: string }[] = JSON.parse(jsonStr);

  return parsed.map((item) => ({
    pageNumber: item.pageNumber,
    script: item.script,
    wordCount: item.script.split(/\s+/).length,
  }));
}
