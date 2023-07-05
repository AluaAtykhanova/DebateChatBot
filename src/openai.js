import dotenv from 'dotenv';
import { createReadStream } from 'fs';
import { Configuration, OpenAIApi } from "openai";
dotenv.config();


class OpenAI{
roles ={
    ASSISTANT:'assistant',
    SYSTEM: 'system',
    USER: 'user',
}

    constructor(apiKey){
        const configuration = new Configuration({
            apiKey,
          });
          this.openai = new OpenAIApi(configuration);
    }

    async chat(messages){
        try{
            const response = await this.openai.createChatCompletion({
                model: 'gpt-3.5-turbo',
                messages,
            })
            return response.data.choices[0].message
        }catch(e){
            console.log('Error while GPT chat', e.message)
        }
    }

    async transcription(filepath){
        try{
            const response = await this.openai.createTranscription(
                createReadStream(filepath),
                'whisper-1'
                )
                return response.data.text
        }catch(e){
            console.log('Error while transcription', e.message)
        }
    }
}

export const openai = new OpenAI(process.env.OPENAI_KEY)