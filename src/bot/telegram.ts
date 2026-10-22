/**
 * Minimal Telegram Bot API client (long polling, no dependencies).
 * https://core.telegram.org/bots/api
 */

export type TgUser = { id: number; first_name?: string; username?: string };
export type TgPhotoSize = { file_id: string; width: number; height: number; file_size?: number };
export type TgDocument = { file_id: string; file_name?: string; mime_type?: string; file_size?: number };

export type TgMessage = {
  message_id: number;
  date: number;
  chat: { id: number; type: string };
  from?: TgUser;
  text?: string;
  caption?: string;
  photo?: TgPhotoSize[];
  document?: TgDocument;
  voice?: TgAudio;
  audio?: TgAudio & { file_name?: string };
  video_note?: TgAudio;
  media_group_id?: string;
};

export type TgAudio = { file_id: string; duration: number; mime_type?: string; file_size?: number };

export type TgCallbackQuery = { id: string; from: TgUser; message?: TgMessage; data?: string };

export type TgUpdate = { update_id: number; message?: TgMessage; callback_query?: TgCallbackQuery };

export type InlineButton = { text: string; callback_data: string };

export class Telegram {
  constructor(private readonly token: string) {}

  async call<T>(method: string, params: Record<string, unknown> = {}, timeoutMs = 30_000): Promise<T> {
    const res = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = (await res.json()) as { ok: boolean; result?: T; description?: string };
    if (!body.ok) throw new Error(`Telegram ${method}: ${body.description ?? res.status}`);
    return body.result as T;
  }

  getUpdates(offset: number) {
    return this.call<TgUpdate[]>(
      "getUpdates",
      { offset, timeout: 50, allowed_updates: ["message", "callback_query"] },
      70_000,
    );
  }

  sendMessage(chatId: number, text: string, buttons?: InlineButton[][]) {
    return this.call<TgMessage>("sendMessage", {
      chat_id: chatId,
      text: text.slice(0, 4000),
      disable_web_page_preview: true,
      ...(buttons ? { reply_markup: { inline_keyboard: buttons } } : {}),
    });
  }

  editMessage(chatId: number, messageId: number, text: string, buttons?: InlineButton[][]) {
    return this.call<TgMessage>("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: text.slice(0, 4000),
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard: buttons ?? [] },
    });
  }

  answerCallback(id: string, text?: string) {
    return this.call("answerCallbackQuery", { callback_query_id: id, ...(text ? { text } : {}) });
  }

  typing(chatId: number) {
    return this.call("sendChatAction", { chat_id: chatId, action: "typing" }).catch(() => undefined);
  }

  /** Downloads a file the user sent (bots may download up to 20 MB). */
  async download(fileId: string): Promise<Buffer> {
    const file = await this.call<{ file_path?: string }>("getFile", { file_id: fileId });
    if (!file.file_path) throw new Error("Telegram did not return a file path");
    const res = await fetch(`https://api.telegram.org/file/bot${this.token}/${file.file_path}`, {
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
}
