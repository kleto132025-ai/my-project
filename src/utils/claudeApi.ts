const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

export class ClaudeApiError extends Error {}

// Прямой вызов Anthropic API с устройства — ключ вводится пользователем в Настройках и
// хранится только на телефоне (expo-secure-store), на сервер приложения не попадает, т.к.
// у приложения нет своего сервера. Подходит для личного использования; для публикации в
// сторе ключ пришлось бы прятать за собственным backend-прокси.
export async function askClaude(apiKey: string, prompt: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } catch {
    throw new ClaudeApiError('Нет соединения с сервером ИИ. Проверьте интернет.');
  }

  if (!response.ok) {
    if (response.status === 401) throw new ClaudeApiError('Неверный API-ключ. Проверьте его в Настройках.');
    if (response.status === 429) throw new ClaudeApiError('Слишком много запросов к ИИ. Попробуйте чуть позже.');
    throw new ClaudeApiError(`Ошибка запроса к ИИ (код ${response.status})`);
  }

  const data = await response.json();
  const text = data?.content?.[0]?.text;
  if (typeof text !== 'string' || !text.trim()) {
    throw new ClaudeApiError('Не удалось разобрать ответ ИИ');
  }
  return text.trim();
}
