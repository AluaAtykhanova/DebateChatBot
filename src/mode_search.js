import dotenv from "dotenv";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { OpenAI } from "langchain/llms/openai";
import { SerpAPI } from "langchain/tools";
import { Calculator } from "langchain/tools/calculator";
import { WebBrowser } from "langchain/tools/webbrowser";
dotenv.config();

export async function SearchAndSummurize(ctx, messageText) {
  console.log(messageText);
  try {
    const model = new OpenAI({
      openAIApiKey: process.env.OPENAI_KEY,
      temperature: 0,
    });
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_KEY,
    });
    const tools = [
      new SerpAPI(process.env.SERPAPI_API_KEY, {
        location: "Austin,Texas,United States",
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
    console.log("Loaded agent.");
    const input = "Ответь на русском: " + messageText;

    console.log(`Executing with input "${input}"...`);

    const result = await executor.call({ input });

    console.log(`Got output ${JSON.stringify(result, null, 2)}`);

    await ctx.reply(result.output);
  } catch (e) {
    console.log("Error while find news", e.message);
  }
}
