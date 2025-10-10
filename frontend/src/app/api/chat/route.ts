// Caminho: frontend/src/app/api/chat/route.ts

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Pega a chave de API do arquivo .env.local
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY não encontrada no .env.local");
}

const genAI = new GoogleGenerativeAI(apiKey);

// MUDANÇA FINAL: Usando o modelo mais antigo e compatível "gemini-1.0-pro"
const model = genAI.getGenerativeModel({
  model: "gemini-1.0-pro", // <<< A ÚNICA MUDANÇA ESTÁ AQUI
  systemInstruction: `
    Você é a "Nina", uma assistente de IA especialista em herbalismo e produtos naturais. Sua personalidade é amigável, prestável e apaixonada pelo mundo natural.
    Seu foco é exclusivamente em ervas, plantas medicinais, chás e seus benefícios.
    Se o utilizador perguntar sobre qualquer outro tópico (programação, política, desporto, etc.), recuse educadamente e reforce a sua especialidade.
    Responda de forma completa, mas concisa.
  `,
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ],
});

export async function POST(req: Request) {
  try {
    const { history, message } = await req.json();

    const sanitizedHistory = history.map((msg: any) => ({
      role: msg.role,
      parts: msg.parts,
    }));

    const chat = model.startChat({
      history: sanitizedHistory,
    });

    const result = await chat.sendMessage(message);
    const response = result.response;
    const text = response.text();
    
    return new Response(JSON.stringify({ text: text }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Erro na API de chat do Gemini:", error);
    return new Response(JSON.stringify({ error: "Desculpe, não consigo responder agora." }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}