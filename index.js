import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from '@google/genai';
import multer from "multer";
import fs from "fs";

dotenv.config();

// limit upload 5mb
const upload = multer({ dest: "uploads/", limits: { fileSize: 5 * 1024 * 1024 } });

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Gemini setup

const groundingTool = {
  googleSearch: {},
};

const generationConfig = {
  stopSequences: ["red"],
  maxOutputTokens: 2000, // Bisa sedikit dinaikkan untuk respons yang lebih panjang jika diperlukan
  temperature: 0.8,   // Sudah cukup tinggi untuk kreativitas
  topP: 0.85,         // Menaikkan topP akan membuat model mempertimbangkan lebih banyak token, meningkatkan variasi
  topK: 40,           // Menaikkan topK juga membantu variasi, tapi topP biasanya lebih berpengaruh untuk kreativitas,
  tools: [groundingTool],
};
const systemInstruction = "Kamu adalah Golden, sebuah AI chatbot yang sangat interaktif, ramah, dan penuh imajinasi. Tujuanmu adalah membuat percakapan menjadi hidup dan menyenangkan. Gunakan bahasa sehari-hari yang santai dan mudah dimengerti. Buat responsmu terasa seperti sedang mengobrol dengan teman yang antusias.";



const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const chat = genAI.chats.create({
  model: "gemini-2.5-flash-lite", // Model diganti sesuai permintaan
  config: { ...generationConfig, systemInstruction }
});

// setting for generated information from multer
const fileToGenerativePart = (filePath, mimeType) => ({
  inlineData: {
    data: fs.readFileSync(filePath).toString("base64"),
    mimeType: mimeType,
  },
});

// Route
app.post("/api/chat", upload.single("file"), async (req, res, next) => {
  let userMessage = req.body?.message;
  const isAnyFile = req.file;

  if (!userMessage && !isAnyFile) {
    throw { status: 400, message: "Message is required" };
    // return res.status(400).json({ error: "Message is required" });
  }

  const parts = [];

  if (isAnyFile) {
    // accept png, jpg or jpeg for image || pdf for document || mp3 for audio
    const mimeType = req.file.mimetype;
    if (!mimeType.startsWith("image/") && !mimeType.startsWith("application/pdf") && !mimeType.startsWith("audio/mpeg")) {
      if (req.file && req.file.path) fs.unlinkSync(req.file.path); // Pastikan file dihapus jika format tidak didukung
      throw { status: 400, message: "Format file not supported" };
      //   return res.status(400).json({ error: "Format file not supported" });
    }

    if (!userMessage && mimeType.startsWith("image/")) {
      userMessage = "Describe the picture";
    } else if (!userMessage && mimeType.startsWith("application/pdf")) {
      userMessage = "Analyze this document";
    } else if (!userMessage && mimeType.startsWith("audio/mpeg")) {
      userMessage = "Transcribe or analyze the following audio";
    }

    try {
      const filePart = fileToGenerativePart(req.file.path, req.file.mimetype);
      parts.push(filePart);
      if (userMessage) parts.push({ text: userMessage });
      const result = await chat.sendMessage({ message: parts });
      res.json({ reply: result.text });
    } catch (err) { // Tangani error dari chat.sendMessage
      console.log(err);
      next(err);
    } finally {
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, (unlinkErr) => {
          if (unlinkErr) console.error("Error deleting uploaded image:", unlinkErr);
        });
      }
    }
  } else {
    // Jika tidak ada file, hanya kirim pesan teks
    try {
      const result = await chat.sendMessage({ message: userMessage });
      const text = result.text;
      res.json({ reply: text });
    } catch (err) {
      console.error(err);
      next(err);
      //   res.status(500).json({ reply: "Something went wrong." });
    }
  }
});

// handle error
app.use((err, req, res, next) => {
  let code = err.status || 500;
  let message = err.message || "Something went wrong.";

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File is too large. Maximum size is 5MB." });
    }
    // Handle other multer errors
    return res.status(400).json({ error: `File upload error: ${err.message}` });
  }
  console.error("Unhandled error in API route:", err); // Log error yang tidak tertangani
  res.status(code).json({ error: message });
});

app.listen(port, () => {
  console.log(`Gemini Chatbot running on http://localhost:${port}`);
});
