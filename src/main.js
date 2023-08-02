import dotenv from "dotenv";
import { Telegraf, session } from "telegraf";
import { message } from "telegraf/filters";
import { code } from "telegraf/format";
import { ChatCompaion } from "./mode_chat.js";
import { SearchAndGiveLinks } from "./mode_links.js";
import { SearchAndSummurize } from "./mode_search.js";
import { oga } from "./oga.js";
import { openai } from "./openai.js";
import { prompts } from "./prompts.js";

dotenv.config();

//Создаём переменные для ключей
const test_env = process.env.TEST_ENV;
const telegram_token = process.env.TELEGRAM_TOKEN;

//у бота несколько режимов
let Mode = 1; //1 - Бот для болтовни И генерации резолюций  2 - Поиск инфы в гугле 3 - Ссылки на полезные источники (?)4-Вроде планируется как спаринг партнёр

console.log(test_env);

//Создаём историю переписки, в этот массив мы будем добавлять новые сообщения в дальнейшем
const INITIAL_SESSION = {
  messages: [
    {
      role: openai.roles.SYSTEM,
      content:prompts.instruction
    },
    {
      role: openai.roles.SYSTEM,
      content:prompts.niceResolutions
      },
  ],
};
// Запускаем бота
const bot = new Telegraf(telegram_token);

bot.use(session());

bot.command("new", async (ctx) => {
  Mode = 1;
  ctx.session = INITIAL_SESSION;
  ctx.session.messages = ctx.session.messages.slice(0, 2);
  await ctx.reply(
    "Привет! Я - Аяу, твоя менторка в увлекательный мир Дебат! Безумно рада с тобой познакомиться! Жду твой первый запрос",
  );
});

bot.command("start", async (ctx) => {
  Mode = 1;
  ctx.session = INITIAL_SESSION;
  ctx.session.messages = ctx.session.messages.slice(0, 2);
  await ctx.reply("Привет! Я - Аяу, твоя менторка в увлекательный мир Дебат! Безумно рада с тобой познакомиться! Жду твой первый запрос");
});

bot.command("search", async (ctx) => {
  ctx.session = INITIAL_SESSION;
  await ctx.reply(
    code("Режим поиска активирован. Введите запрос для поиска информации."),
  );
  Mode = 2;
});

bot.command("exit", async (ctx) => {
  await ctx.reply(
    code(
      "Режим поиска деактивирован. Введите текстовое или голосовое сообщение.",
    ),
  );
  Mode = 1;
});

bot.command("ref", async (ctx) => {
  ctx.session = INITIAL_SESSION;
  await ctx.reply(
    code(
      "Режим поиска классных ссылок активирован. Введите запрос для поиска информации.",
    ),
  );
  Mode = 3;
});

bot.on(message("voice"), async (ctx) => {
  ctx.session ??= INITIAL_SESSION;
  try {
    await ctx.reply(code("Сообщение приняла. Жду ответ от сервера"));
    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
    const userId = String(ctx.message.from.id);
    const ogaPath = await oga.create(link.href, userId);
    const mp3Path = await oga.toMp3(ogaPath, userId);

    const messageText = await openai.transcription(mp3Path);
    await ctx.reply(code(`Ваш запрос: ${messageText}`));

    // ctx.session.messages.push({
    //   role: openai.roles.USER,
    //   content: messageText,
    // });

    if (Mode == 1) {
      await ctx.reply(code("Режим Общения"));
      await ChatCompaion(ctx, messageText);
      } else if (Mode == 2) {
        await ctx.reply(code("Режим ссылки"))
        await SearchAndSummurize(ctx, messageText);
      } else {
        await SearchAndGiveLinks(ctx, messageText);
      }
  } catch (e) {
    console.log("Error while voice message", e.message);
  }
});

bot.on(message("text"), async (ctx) => {
  ctx.session ??= INITIAL_SESSION;
  const messageText = ctx.message.text;
  if (Mode == 1) {
    await ctx.reply(code("Сообщение приняла. Жду ответ от сервера"));
    await ChatCompaion(ctx, messageText);
  } else if (Mode == 2) {
    await ctx.reply(code("Сообщение приняла. Жду ответ от сервера"));
    await SearchAndSummurize(ctx, messageText);
  } else {
    await ctx.reply(code("Сообщение приняла. Жду ответ от сервера"));
    await SearchAndGiveLinks(ctx, messageText);
  }
});



bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
