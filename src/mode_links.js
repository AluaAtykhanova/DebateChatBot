import dotenv from "dotenv";
import { code } from "telegraf/format";
import { openai } from "./openai.js";
dotenv.config();

export async function SearchAndGiveLinks(ctx, messageText) {
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