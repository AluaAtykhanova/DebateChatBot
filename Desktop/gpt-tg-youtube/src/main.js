import config from 'config'
import { initializeAgentExecutorWithOptions } from "langchain/agents"
import { OpenAIEmbeddings } from "langchain/embeddings/openai"
import { OpenAI } from "langchain/llms/openai"
import { SerpAPI } from "langchain/tools"
import { Calculator } from "langchain/tools/calculator"
import { WebBrowser } from "langchain/tools/webbrowser"
import { Telegraf, session } from 'telegraf'
import { message } from 'telegraf/filters'
import { code } from 'telegraf/format'
import { oga } from './oga.js'
import { openai } from './openai.js'

console.log(config.get('TEST_ENV'))

const INITIAL_SESSION = {
    messages: [],
}

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'));

bot.use(session())

bot.command('new' , async (ctx) => {
    ctx.session = INITIAL_SESSION
    await ctx.reply('Привет! Я - Аяу, твоя менторка в увлекательный мир Дебат! Безумно рада с тобой познакомиться! Жду твой первый запрос')
})

bot.command('start', async (ctx) =>{
    await ctx.reply('Жду вашего голосового или текстового сообщения')
})

bot.on(message('voice'), async (ctx) =>{
    ctx.session ??= INITIAL_SESSION
    try{
        await ctx.reply(code('Сообщение приняла. Жду ответ от сервера'))
       const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
       const userId= String (ctx.message.from.id)
       const ogaPath = await oga.create(link.href, userId)
       const mp3Path = await oga.toMp3(ogaPath, userId)
       
       const text = await openai.transcription(mp3Path)
       await ctx.reply(code(`Ваш запрос: ${text}`))

       ctx.session.messages.push({
        role: openai.roles.USER,
         content: text,
        })

       const response = await openai.chat(ctx.session.messages)

       ctx.session.messages.push({
        role: openai.roles.ASSISTANT, 
        content: response.content,
    })

       await ctx.reply(response.content)
    } catch(e){
    console.log('Error while voice message' , e.message)
}
})

console.log(INITIAL_SESSION)



//у бота два режима: один ищет инфу в инете, второй генерирует идеи/аргументы
let searchMode = false;

bot.hears('/search', async (ctx) => {
  ctx.session = INITIAL_SESSION;
  await ctx.reply('Режим поиска активирован. Введите запрос для поиска информации.');
  searchMode = true;
});

bot.command('/exit', async (ctx) => {
  await ctx.reply('Режим поиска деактивирован. Введите текстовое или голосовое сообщение.');
  searchMode = false;
});

bot.on(message('text'), async (ctx) =>{
    ctx.session ??= INITIAL_SESSION
    if (searchMode){
      try{
      await ctx.reply(code('Сообщение приняла. Жду ответ от сервера'))  
      const model = new OpenAI({ openAIApiKey: config.get('OPENAI_KEY'), temperature: 0 });
      const embeddings = new OpenAIEmbeddings({ openAIApiKey: config.get('OPENAI_KEY') });
      const tools = [
        new SerpAPI(config.get('SERPAPI_API_KEY'), {
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
    }
      catch(e){
        console.log('Error while find news' , e.message)
      }
    } else{
      try{
        await ctx.reply(code('Сообщение приняла. Жду ответ от сервера'))

      ctx.session.messages.push({role: openai.roles.USER,content: ctx.message.text,})

      const response = await openai.chat(ctx.session.messages)

      ctx.session.messages.push({
        role: openai.roles.ASSISTANT, 
        content: response.content,
    })

      await ctx.reply(response.content)
    } catch(e){
    console.log('Error while text message' , e.message)
    }
  }
})


bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGNTERM', () => bot.stop('SIGNTRM'))