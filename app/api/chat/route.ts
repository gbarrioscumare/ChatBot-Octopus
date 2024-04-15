import OpenAI from 'openai';
import {OpenAIStream, StreamingTextResponse} from 'ai';
import { DataAPIClient } from "@datastax/astra-db-ts";
import { Request } from 'express';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Inicializa el cliente de Astra DB con el token de la aplicación
const astraDb = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN);

export async function POST(req: Request) {
  try {
    const { messages, useRag, llm, similarityMetric } = await req.json();

    const latestMessage = messages[messages?.length - 1]?.content;

    let docContext = '';
    if (useRag) {
      const { data } = await openai.embeddings.create({ input: latestMessage, model: 'text-embedding-ada-002' });

      const collection = await astraDb.collection(`chat_${similarityMetric}`);

      const cursor = collection.find(null, {
        sort: {
          $vector: data[0]?.embedding,
        },
        limit: 5,
      });

      const documents = await cursor.toArray();

      docContext = `
        START CONTEXT
        ${documents?.map(doc => doc.content).join("\n")}
        END CONTEXT
      `;
    }

    const ragPrompt = [
      {
        role: 'system',
        content: `You are an AI assistant responding to queries about the "marcas_modelos_precios" database.
        ${docContext} 
        If the answer is not provided in the context, the AI assistant will say, "I'm sorry, I don't know the answer".
      `,
      },
    ];

    const response = await openai.chat.completions.create({
      model: llm ?? 'gpt-3.5-turbo',
      stream: true,
      messages: [...ragPrompt, ...messages],
    });

    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);
  } catch (e) {
    throw e;
  }
}
