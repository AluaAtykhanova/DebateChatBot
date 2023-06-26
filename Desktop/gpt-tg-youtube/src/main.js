import config from 'config'
import { initializeAgentExecutorWithOptions } from "langchain/agents"
import { OpenAI } from "langchain/llms/openai"
import { SerpAPI } from "langchain/tools"
import { Calculator } from "langchain/tools/calculator"
import { Telegraf, session } from 'telegraf'
import { message } from 'telegraf/filters'
import { code } from 'telegraf/format'
import { oga } from './oga.js'
import { openai } from './openai.js'


const model = new OpenAI({openAIApiKey:config.get('OPENAI_KEY') , temperature: 0 });
const tools = [
  new SerpAPI(config.get('SERPAPI_API_KEY'), {
    location: "Austin,Texas,United States",
    hl: "en",
    gl: "us",
  }),
  new Calculator(),
];

const executor = await initializeAgentExecutorWithOptions(tools, model, {
  agentType: "zero-shot-react-description",
});
console.log("Loaded agent.");

const input =
  "Who is Olivia Wilde's boyfriend?" +
  " What is his current age raised to the 0.23 power?";
console.log(`Executing with input "${input}"...`);

const result = await executor.call({ input });

console.log(`Got output ${result.output}`);


// import { PromptTemplate } from "langchain/prompts"

// const model = new OpenAI({, temperature: 0.9 });
// const template = "What is a good name for a company that makes {product}?";
// const prompt = new PromptTemplate({
//   template: template,
//   inputVariables: ["product"],
// });

// import { LLMChain } from "langchain/chains";

// const chain = new LLMChain({ llm: model, prompt: prompt });

// const res = await prompt.format({ product: "SALAM BRO" });
// console.log(res);

////////////////////////////////////////////////
console.log(config.get('TEST_ENV'))

const INITIAL_SESSION = {
    messages: [],
}

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'));

bot.use(session())

bot.command('new' , async (ctx) => {
    ctx.session = INITIAL_SESSION
    await ctx.reply('Жду вашего голосового или текстового сообщения')
})

bot.command('start', async (ctx) =>{
    await ctx.reply('Жду вашего голосового или текстового сообщения')
})

bot.on(message('voice'), async (ctx) =>{
    ctx.session ??= INITIAL_SESSION
    try{
        await ctx.reply(code('Сообщение принял. Жду ответ от сервера'))
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

bot.on(message('text'), async (ctx) =>{
    ctx.session ??= INITIAL_SESSION
    try{
        await ctx.reply(code('Сообщение принял. Жду ответ от сервера'))

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
})

bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGNTERM', () => bot.stop('SIGNTRM'))