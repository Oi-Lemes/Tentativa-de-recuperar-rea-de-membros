// Caminho: frontend/src/app/api/chat/route.ts

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY não encontrada no .env.local");
}

const genAI = new GoogleGenerativeAI(apiKey);

// --- CORREÇÃO DEFINITIVA: Descoberta Dinâmica de Modelo ---
// Esta função irá encontrar o melhor modelo de chat disponível para sua chave de API.
async function getChatModel() {
  // O modelo 'gemini-pro' é o padrão de texto. Se ele não funcionar,
  // o código abaixo tentará encontrar um alternativo.
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    return model;
  } catch (e) {
    console.warn("Modelo 'gemini-pro' não encontrado, procurando por um alternativo...");
    
    // Se 'gemini-pro' falhar, pedimos à API uma lista de todos os modelos disponíveis.
    const { models } = await genAI.listModels();
    
    // Procuramos por um modelo que suporte o método 'generateContent' (chat).
    const chatModel = models.find(m => m.supportedGenerationMethods.includes("generateContent"));

    if (!chatModel) {
      throw new Error("Nenhum modelo de chat compatível foi encontrado para esta chave de API.");
    }
    
    console.log(`Modelo 'gemini-pro' não encontrado. Usando o modelo alternativo: ${chatModel.name}`);
    return genAI.getGenerativeModel({ model: chatModel.name });
  }
}

// Inicializa o modelo de forma assíncrona.
const modelPromise = getChatModel();

export async function POST(req: Request) {
  try {
    const model = await modelPromise; // Garante que o modelo foi carregado
    const { history, message } = await req.json();

    const sanitizedHistory = history.map((msg: any) => ({
      role: msg.role,
      parts: msg.parts,
    }));

    const chat = model.startChat({
      history: sanitizedHistory,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ],
      // Adicionamos a instrução do sistema aqui, dentro do startChat.
      systemInstruction: {
        role: "system",
        parts: [{ text: `
          Você é a "Nina", uma assistente de IA especialista em herbalismo e produtos naturais. Sua personalidade é amigável, prestável e apaixonada pelo mundo natural.
          Seu foco é exclusivamente em ervas, plantas medicinais, chás e seus benefícios.
          Se o utilizador perguntar sobre qualquer outro tópico (programação, política, desporto, etc.), recuse educadamente e reforce a sua especialidade.
          Responda de forma completa, mas concisa.
        `}],
      },
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