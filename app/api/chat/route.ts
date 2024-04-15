import OpenAI from 'openai';
import {OpenAIStream, StreamingTextResponse} from 'ai';
import {AstraDB} from "@datastax/astra-db-ts";
import {DataAPIClient} from "@datastax/astra-db-ts";
//import { Request } from 'express';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const astraDb = new AstraDB(process.env.ASTRA_DB_APPLICATION_TOKEN, process.env.ASTRA_DB_API_ENDPOINT, process.env.ASTRA_DB_NAMESPACE);

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

      // Aquí podrías agregar lógica para buscar la marca con el precio más alto
      const highestPriceBrand = findHighestPriceBrand(documents);

      docContext = `
        START CONTEXT
        ${documents?.map(doc => doc.content).join("\n")}
        END CONTEXT
      `

      // Aquí construirías el prompt basado en la marca con el precio más alto
      const ragPrompt = [
        {
          role: 'system',
          content: `La marca con el precio más alto es ${highestPriceBrand}. 
          ${docContext} 
          If the answer is not provided in the context, the AI assistant will say, "I'm sorry, I don't know the answer".
          `,
        },
      ]

      const response = await openai.chat.completions.create(
        {
          model: llm ?? 'gpt-3.5-turbo',
          stream: true,
          messages: [...ragPrompt, ...messages],
        }
      );
      const stream = OpenAIStream(response);
      return new StreamingTextResponse(stream);
    }
  } catch (e) {
    throw e;
  }
}

function findHighestPriceBrand(documents) {
  // Aquí implementarías la lógica para encontrar la marca con el precio más alto
  // Por ejemplo, podrías ordenar los documentos por precio y devolver la marca del primer documento
  const sortedDocuments = documents.sort((a, b) => parseFloat(b.precio) - parseFloat(a.precio));
  return sortedDocuments[0]?.marca;
}