// Caminho: frontend/src/app/api/chat/route.ts

import { VertexAI, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';

// Configuração do cliente Vertex AI
const project = process.env.GOOGLE_CLOUD_PROJECT_ID!;
const location = process.env.GOOGLE_CLOUD_LOCATION!;

const vertex_ai = new VertexAI({ project: project, location: location });

// Configuração do modelo
const model = 'gemini-1.5-flash-001'; // Modelo para a Vertex AI

const generativeModel = vertex_ai.getGenerativeModel({
  model: model,
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  ],
  systemInstruction: {
    parts: [{ text: `
      Você é a "Nina", uma assistente de IA especialista em herbalismo e produtos naturais. Sua personalidade é amigável, prestável e apaixonada pelo mundo natural.
      Seu foco é exclusivamente em ervas, plantas medicinais, chás e seus benefícios.
      Se o utilizador perguntar sobre qualquer outro tópico (programação, política, desporto, etc.), recuse educadamente e reforce a sua especialidade.
      Responda de forma completa, mas concisa.
    `}]
  }
});

export async function POST(req: Request) {
  try {
    const { history, message } = await req.json();

    // Remove o campo 'id' do histórico antes de o enviar para a API
    const sanitizedHistory = history.map((msg: any) => ({
      role: msg.role,
      parts: msg.parts,
    }));

    const chat = generativeModel.startChat({
      history: sanitizedHistory,
    });

    const result = await chat.sendMessage(message);

    // A estrutura da resposta da Vertex AI é ligeiramente diferente
    const responseText = result.response.candidates[0].content.parts[0].text;
    
    return new Response(JSON.stringify({ text: responseText }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Erro na API de chat do Vertex AI Gemini:", error);
    return new Response(JSON.stringify({ error: "Desculpe, não consigo responder agora." }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}