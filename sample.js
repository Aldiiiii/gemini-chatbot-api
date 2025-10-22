import { GoogleGenAI, createUserContent, createPartFromUri } from "@google/genai";
import * as fs from "node:fs";
import dotenv from 'dotenv'

dotenv.config()

const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

const organ = await ai.files.upload({
  file: "./uploads/file-1760821179266.png",
});

const response = await ai.models.generateContent({
  model: "gemini-2.0-flash",
  contents: [
    createUserContent([
      "Tell me a story based on this image",
      createPartFromUri(organ.uri, organ.mimeType)
    ]),
  ],
});
console.log(response.text);