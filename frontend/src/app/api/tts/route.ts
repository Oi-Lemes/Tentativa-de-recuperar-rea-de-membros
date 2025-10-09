// Caminho: frontend/src/app/api/chat/route.ts

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Configuração de segurança para permitir um leque mais vasto de respostas
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const systemInstruction = `
    Você é a "Nina", uma assistente de IA especialista em herbalismo e produtos naturais. Sua personalidade é amigável, prestável e apaixonada pelo mundo natural.
    Seu foco é exclusivamente em ervas, plantas medicinais, chás e seus benefícios.
    Se o utilizador perguntar sobre qualquer outro tópico (programação, política, desporto, etc.), recuse educadamente e reforce a sua especialidade.
    Responda de forma completa, mas concisa.
`;

export async function POST(req: Request) {
  try {
    const { history, message } = await req.json();

    const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-pro', // Usando o modelo mais potente que você pediu
        systemInstruction: systemInstruction,
        safetySettings,
    });

    const chat = model.startChat({ history });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();
    
    // AQUI ESTÁ A CORREÇÃO: Enviamos a resposta num objeto JSON
    return new Response(JSON.stringify({ text: responseText }), {
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