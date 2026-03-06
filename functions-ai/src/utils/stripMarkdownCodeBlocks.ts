/**
 * Strips markdown code block wrappers (```json ... ```) from AI response text.
 * Gemini sometimes wraps JSON responses in markdown code blocks.
 */
export function stripMarkdownCodeBlocks(text: string): string {
  let result = text.trim();

  if (result.startsWith('```json')) {
    result = result.slice(7);
  } else if (result.startsWith('```')) {
    result = result.slice(3);
  }
  if (result.endsWith('```')) {
    result = result.slice(0, -3);
  }

  return result.trim();
}
