import config from 'config'
import { initializeAgentExecutorWithOptions } from "langchain/agents"
import { OpenAIEmbeddings } from "langchain/embeddings/openai"
import { OpenAI } from "langchain/llms/openai"
import { SerpAPI } from "langchain/tools"
import { Calculator } from "langchain/tools/calculator"
import { WebBrowser } from "langchain/tools/webbrowser"


export const run = async () => {
  const model = new OpenAI({openAIApiKey:config.get('OPENAI_KEY'), temperature: 0 });
const embeddings = new OpenAIEmbeddings({openAIApiKey:config.get('OPENAI_KEY')});
  const tools = [
    new SerpAPI(config.get('SERPAPI_API_KEY'), {
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

  const input = `Что за второй титаник с утонувшими миллиардерами? ответь на русском`;

  console.log(`Executing with input "${input}"...`);

  const result = await executor.call({ input });

  console.log(`Got output ${JSON.stringify(result, null, 2)}`);
 
};