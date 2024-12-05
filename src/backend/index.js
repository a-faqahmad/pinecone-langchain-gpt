import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import cors from "cors";
import { PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { Document } from 'langchain/document'
import { formatDocumentsAsString } from 'langchain/util/document'

dotenv.config();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000",
  })
);

const port = process.env.PORT || 3001;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PINECONE_INDEX = process.env.PINECONE_INDEX;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const DOC_INDEX_ID = process.env.DOC_INDEX_ID;

const openai = new OpenAI();
const pinecone = new Pinecone({
  apiKey: PINECONE_API_KEY,
});
const pineconeIndex = pinecone.Index(PINECONE_INDEX);

app.post("/send-message", async (req, res) => {
  const question = req.body.question;
  res.send({ message: question });
});

app.post("/send-message-gpt", async (req, res) => {
  const question = req.body.question;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      {
        role: "user",
        content: question,
      },
    ],
  });
  res.send({ message: completion.choices[0].message.content });
});

app.post("/send-message-langchain", async (req, res) => {
  const question = req.body.question;

  const embeddings = new OpenAIEmbeddings({ OPENAI_API_KEY });
  const vector = await embeddings.embedQuery(question);

  const docs = await pineconeIndex.query({
    vector,
    topK: 5,
    filter: { id: DOC_INDEX_ID },
    includeMetadata: true,
  });

  let serializedDocs = formatDocumentsAsString(
    docs.matches.map(
      (doc) =>
        new Document({
          metadata: doc.metadata,
          pageContent: doc.metadata?.text?.toString() || "",
        })
    )
  );

  const chatModel = new ChatOpenAI({
    OPENAI_API_KEY,
    model: "gpt-4o-mini",
  });

  const prompt = PromptTemplate.fromTemplate(
    `Use the following pieces of context to answer the question at the end.
      ----------
      INSTRUCTIONS: You are representative of RipeSeed.
      ----------
      CONTEXT: {context}
      ----------
      QUESTION: {question}`
  );

  const chain = await prompt.pipe(chatModel);

  const response = await chain.invoke({
    context: serializedDocs,
    question: question,
  });
  res.send({ message: response.content });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
