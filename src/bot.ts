import "dotenv/config";
import { Bot, Context } from "grammy";
import { isAllowedChat } from "./access.js";

const token = process.env.TELEGRAM_TOKEN;
const allowedChatId = process.env.TELEGRAM_CHAT_ID;

if (!token) {
  throw new Error("TELEGRAM_TOKEN não definido. Copie .env.example para .env e preencha o token.");
}

const bot = new Bot(token);

function isAllowed(ctx: Context): boolean {
  return isAllowedChat(ctx.chat?.id, allowedChatId);
}

bot.use(async (ctx, next) => {
  if (!isAllowed(ctx)) {
    await ctx.reply("Acesso não autorizado.");
    return;
  }
  await next();
});

bot.command("start", async (ctx) => {
  await ctx.reply(
    "Olá, Dario. Este é o gateway Telegram do DarioOS conectado ao Hermes.\n\n" +
      "Use /help para ver os comandos disponíveis."
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    "/start — inicializa a conversa\n" +
      "/help — mostra esta ajuda\n\n" +
      "A integração de mensagens com o Hermes será habilitada em uma próxima etapa."
  );
});

bot.on("message:text", async (ctx) => {
  await ctx.reply(
    "Recebi sua mensagem. O encaminhamento para o Hermes ainda está em configuração."
  );
});

bot.catch((error) => {
  console.error("Erro no bot Telegram:", error.error);
});

async function main(): Promise<void> {
  await bot.api.setMyCommands([
    { command: "start", description: "Inicializa a conversa" },
    { command: "help", description: "Mostra a ajuda" },
  ]);

  console.log("agente-dmn iniciado em modo polling.");
  await bot.start({
    onStart: (info) => console.log(`Bot conectado como @${info.username}`),
  });
}

void main().catch((error: unknown) => {
  console.error("Falha ao iniciar o agente-dmn:", error);
  process.exitCode = 1;
});
