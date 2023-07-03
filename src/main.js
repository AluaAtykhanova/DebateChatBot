import config from "config";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { OpenAI } from "langchain/llms/openai";
import { SerpAPI } from "langchain/tools";
import { Calculator } from "langchain/tools/calculator";
import { WebBrowser } from "langchain/tools/webbrowser";
import { Telegraf, session } from "telegraf";
import { message } from "telegraf/filters";
import { code } from "telegraf/format";
import { oga } from "./oga.js";
import { openai } from "./openai.js";

console.log(config.get("TEST_ENV"));

const INITIAL_SESSION = {
  messages: [],
};

const bot = new Telegraf(config.get("TELEGRAM_TOKEN"));

bot.use(session());

//у бота два режима: один ищет инфу в инете, второй генерирует идеи/аргументы
let Mode = 1; //1 - Генератор Резолюций 2 - Поиск инфы в гугле 3 - Ссылки на полезные источники

bot.command("new", async (ctx) => {
  Mode = 1;
  ctx.session = INITIAL_SESSION;
  await ctx.reply(
    "Привет! Я - Аяу, твоя менторка в увлекательный мир Дебат! Безумно рада с тобой познакомиться! Жду твой первый запрос"
  );
});

bot.command("start", async (ctx) => {
  Mode = 1;
  await ctx.reply("Жду вашего голосового или текстового сообщения");
});

bot.on(message("voice"), async (ctx) => {
  ctx.session ??= INITIAL_SESSION;
  try {
    await ctx.reply(code("Сообщение приняла. Жду ответ от сервера"));
    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
    const userId = String(ctx.message.from.id);
    const ogaPath = await oga.create(link.href, userId);
    const mp3Path = await oga.toMp3(ogaPath, userId);

    const text = await openai.transcription(mp3Path);
    await ctx.reply(code(`Ваш запрос: ${text}`));

    ctx.session.messages.push({
      role: openai.roles.USER,
      content: text,
    });

    const response = await openai.chat(ctx.session.messages);

    ctx.session.messages.push({
      role: openai.roles.ASSISTANT,
      content: response.content,
    });

    await ctx.reply(response.content);
  } catch (e) {
    console.log("Error while voice message", e.message);
  }
});

bot.command("search", async (ctx) => {
  ctx.session = INITIAL_SESSION;
  await ctx.reply(
    code("Режим поиска активирован. Введите запрос для поиска информации.")
  );
  Mode = 2;
});

bot.command("exit", async (ctx) => {
  await ctx.reply(
    code(
      "Режим поиска деактивирован. Введите текстовое или голосовое сообщение."
    )
  );
  Mode = 1;
});

bot.command("ref", async (ctx) => {
  ctx.session = INITIAL_SESSION;
  await ctx.reply(
    code(
      "Режим поиска классных ссылок активирован. Введите запрос для поиска информации."
    )
  );
  Mode = 3;
});

bot.on(message("text"), async (ctx) => {
  ctx.session ??= INITIAL_SESSION;
  if (Mode == 1) {
    try {
      await ctx.reply(code("Сообщение приняла. Жду ответ от сервера"));

      const MAX_MESSAGES = 3; // Максимальное количество сохраняемых сообщений
      // Находим индексы всех сообщений с ролью SYSTEM
      const systemMessageIndexes = ctx.session.messages.reduce(
        (indexes, message, index) => {
          if (message.role === openai.roles.SYSTEM) {
            indexes.push(index);
          }
          return indexes;
        },
        []
      );

      ctx.session.messages.push(
        {
          role: openai.roles.SYSTEM,
          content:
            "Отвечай как ментор в дебатах." +
            "Ты, как ментор в дебатах, знаешь что, 1.'ЭП'-расшифровывается как: 'Эта Палата', то есть это орган который принимает то или иное решение, 2.'ЭПСЧ' - расшифровывается как: 'Эта Палата, считает что ...' Это сокращение используется, когда мы выражаем какое то мнение или оценочное суждение о какой либо ситуации." +
            "Дальше у резолюций существуют подвиды, например: 'ЭП в лице кого-то примет то или иное решение','ЭП сожалеет о чём-то(уже принятое решение/непоправимая ситуация в обществе и так далее', 'ЭП предпочтёт' это обозначает какую то гипотетиескую ситуацию в которой ЭП будет принимать решение как независимый зритель событий который должен будет сравнить мир в котором оно принимает то или иное решение, или где оно принимает другое предложенное решение." +
            "Если я прошу сгенерировать мне резолюцю ты отправишь мне резолюцию где ЭП будет означать какого то человека, который дальше в резолюции совершает какое либо действие формата 'ЭП ...'. Резолюции должны состоять не больше чем из 10 слов. ",
        },
        {
          role: openai.roles.USER,
          content:
            "Если я прошу сгенерировать или дать мне резолюцю ты отправишь мне резолюцию где ЭП будет означать какого то человека, который дальше в резолюции совершает какое либо действие формата 'ЭП ...'" +
            ctx.message.text,
        }
      );
      console.log(
        "___________________________________________________________________________________________________________________"
      );
      console.log(ctx.session.messages);
      console.log(
        "___________________________________________________________________________________________________________________"
      );
      const response = await openai.chat(ctx.session.messages);
      console.log(response);
      ctx.session.messages.push({
        role: openai.roles.ASSISTANT,
        content: response.content,
      });

      await ctx.reply(response.content);
    } catch (e) {
      console.log("Error while text message", e.message);
    }
  } else if (Mode == 2) {
    try {
      await ctx.reply(code("Сообщение приняла. Жду ответ от сервера"));
      const model = new OpenAI({
        openAIApiKey: config.get("OPENAI_KEY"),
        temperature: 0,
      });
      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: config.get("OPENAI_KEY"),
      });
      const tools = [
        new SerpAPI(config.get("SERPAPI_API_KEY"), {
          location: "Almaty,Almaty,Kazakhstan",
          hl: "en",
          gl: "us",
        }),
        new Calculator(),
        new WebBrowser({ model, embeddings }),
      ];

      const executor = await initializeAgentExecutorWithOptions(tools, model, {
        agentType: "zero-shot-react-description",
        verbose: true,
      });

      const input = ctx.message.text;

      console.log(`Executing with input "${input}"...`);

      const result = await executor.call({ input });

      console.log(`Got output ${JSON.stringify(result, null, 2)}`);

      await ctx.reply(result.output);
    } catch (e) {
      console.log("Error while find news", e.message);
    }
  } else {
    try {
      await ctx.reply(code("Сообщение приняла. Жду ответ от сервера"));

      const prompt_template =
        "Generate useful links related to " + ctx.message.text;

      ctx.session.messages.push({
        role: openai.roles.USER,
        content: prompt_template,
      });

      const response = await openai.chat(ctx.session.messages);
      console.log(response);
      ctx.session.messages.push({
        role: openai.roles.ASSISTANT,
        content: response.content,
      });

      await ctx.reply(response.content);
    } catch (e) {
      console.log("Error while find helpfull links", e.message);
    }
  }
});

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGNTERM", () => bot.stop("SIGNTRM"));
