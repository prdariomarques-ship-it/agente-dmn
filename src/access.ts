export function isAllowedChat(chatId: number | undefined, allowedChatId: string | undefined): boolean {
  if (!allowedChatId) return true;
  return chatId !== undefined && String(chatId) === allowedChatId;
}
