import { AstraDB } from "@datastax/astra-db-ts";
import express from 'express';
import bodyParser from 'body-parser';
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import 'dotenv/config'
import sampleData from './sample_data.json';
import autoData from './marcas_modelos_precios.json';
import OpenAI from 'openai';
import { SimilarityMetric } from "../app/hooks/useConfiguration";

const app = express();
const port = 3000;

type Car = {
  marca: string;
  modelo: string;
  precio: string;
  versiones: { version: string; precio: string }[];
};

let carData: Car[] = autoData;


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(bodyParser.json());
const {ASTRA_DB_APPLICATION_TOKEN, ASTRA_DB_API_ENDPOINT, ASTRA_DB_NAMESPACE } = process.env;

const astraDb = new AstraDB(ASTRA_DB_APPLICATION_TOKEN, ASTRA_DB_API_ENDPOINT, ASTRA_DB_NAMESPACE);

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

const similarityMetrics: SimilarityMetric[] = [
  'cosine',
  'euclidean',
  'dot_product',
]

app.post('/consulta', async (req, res) => {
  try {
    const { consulta, similarityMetrics } = req.body;

    const collection = await astraDb.collection(`chat_${similarityMetrics}`);

    const result = await collection.find({ $text: { $search: consulta } });

    res.json({ data: result });
  } catch (error) {
    console.error('Error al procesar la consulta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

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
  for await (const car of carData) {
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

// console.log(carData[0].versiones);

similarityMetrics.forEach(metric => {
  createCollection(metric).then(() => loadSampleData(metric));
});

app.listen(port, () => {
  console.log(`Servidor backend en ejecución en el puerto ${port}`);
});