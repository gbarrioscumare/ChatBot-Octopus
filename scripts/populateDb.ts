import { AstraDB } from "@datastax/astra-db-ts";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
// import { DataAPIClient } from "@datastax/astra-db-ts";
import OpenAI from 'openai';
import 'dotenv/config';
import sampleData from './sample_data.json';
import autoData from './marcas_modelos_precios.json';
import { SimilarityMetric } from "../app/hooks/useConfiguration";

type Car = {
  marca: string;
  modelo: string;
  precio: string;
  versiones: { version: string; precio: string }[];
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const {
  ASTRA_DB_APPLICATION_TOKEN,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_NAMESPACE,
  OPENAI_API_KEY,
} = process.env;

// const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
// const db = client.db(ASTRA_DB_API_ENDPOINT);

const astraDb = new AstraDB(ASTRA_DB_APPLICATION_TOKEN, ASTRA_DB_API_ENDPOINT, ASTRA_DB_NAMESPACE);

const similarityMetrics: SimilarityMetric[] = [
  'cosine',
  'euclidean',
  'dot_product',
];

const createCollection = async (similarity_metric: SimilarityMetric = 'cosine') => {
  try {
    const res = await astraDb.createCollection(`chat_${similarity_metric}`, {
      vector: {
        dimension: 1536,
        metric: similarity_metric,
      }
    });
    console.log(res);
  } catch (e) {
    console.log(`chat_${similarity_metric} already exists`);
  }
};

const loadSampleData = async (similarity_metric: SimilarityMetric = 'cosine') => {
  const collection = await astraDb.collection(`chat_${similarity_metric}`);
  for await (const car of autoData) {
    const { marca, modelo, precio, versiones } = car;

    const carData = {
      marca,
      modelo,
      precio,
      versiones: versiones.map((v) => ({ version: v.version, precio: v.precio })),
    };

    let i = 0;
    for await (const version of versiones) {
      const { data } = await openai.embeddings.create({
        input: version.version,
        model: 'text-embedding-ada-002',
      });

      const res = await collection.insertOne({
        document_id: `${marca}-${modelo}-${i}`,
        $vector: data[0]?.embedding,
        carData,
      });

      i++;
    }
  }
  console.log('data loaded');
};

// const consultarInformacion = async (consulta: string, similarityMetric: string) => {
//   try {
//     const collection = await db.collection('marca_modelos_precios', {
//       vector: {
//         dimension: 1536,
//         metric: similarityMetric,
//       }
//     });

//     const { data } = await openai.embeddings.create({
//       input: consulta,
//       model: 'text-embedding-ada-002',
//     });

//     const result = await collection.find({
//       $vector: data[0]?.embedding,
//     });

//     return result;
//   } catch (error) {
//     console.error('Error al consultar la información:', error);
//     return null;
//   }
// };



// // consultarInformacion(consulta, similarityMetric).then((result) => {
// //   console.log(result); // Imprime los resultados obtenidos
// // });

similarityMetrics.forEach(metric => {
  createCollection(metric).then(() => loadSampleData(metric));
});