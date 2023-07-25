import dotenv from 'dotenv';
import { openai } from "./openai.js";
dotenv.config();

export async function ChatCompaion(ctx, messageText) {
    try {  
      ctx.session.messages.push({
        role: openai.roles.USER,
        content:
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
  