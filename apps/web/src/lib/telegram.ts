import "server-only";
import { env, primeSecrets } from "@/lib/env";

/**
 * sendTelegram — founder digest / alert channel (Task 5.5). HTML parse mode.
 * No-op (console.warn) when TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is empty so jobs never fail on a missing key.
 */
export async function sendTelegram(text: string): Promise<{ sent: boolean; reason?: string }> {
  await primeSecrets();
  if (!env.telegramBotToken || !env.telegramChatId) {
    console.warn("[telegram] not configured — message dropped:\n" + text.slice(0, 500));
    return { sent: false, reason: "not configured" };
  }
  // Telegram caps messages at 4096 chars.
  const body = text.length > 4000 ? text.slice(0, 3990) + "\n…" : text;
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: env.telegramChatId, text: body, parse_mode: "HTML", disable_web_page_preview: true }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const msg = (await res.text()).slice(0, 300);
      console.warn(`[telegram] sendMessage ${res.status}: ${msg}`);
      return { sent: false, reason: `${res.status} ${msg}` };
    }
    return { sent: true };
  } catch (err) {
    console.warn("[telegram] send failed", err);
    return { sent: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
