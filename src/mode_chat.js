import dotenv from 'dotenv';
import { code } from "telegraf/format";
import { openai } from "./openai.js";
dotenv.config();

export async function ChatCompaion(ctx, messageText) {
    try {
      await ctx.reply(code("Сообщение принято. Жду ответ от сервера"));
  
      ctx.session.messages.push({
        role: openai.roles.USER,
        content:
          "Если я прошу сгенерировать или дать мне резолюцию, ты отправишь мне резолюцию, где ЭП будет означать какого-то человека, который дальше в резолюции совершает какое-либо действие формата 'ЭП ...'" +
          messageText,
      });
  
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
      console.log("Ошибка при обработке текстового сообщения", e.message);
    }
  }
  