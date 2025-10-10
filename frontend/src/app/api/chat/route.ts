// Caminho: frontend/src/app/api/chat/route.ts

import { VertexAI, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';
import * as fs from 'fs';
import * as path from 'path';

// --- INÍCIO DA ABORDAGEM DE AUTENTICAÇÃO EXPLÍCITA ---

// 1. Monta o caminho absoluto para o ficheiro de credenciais na raiz do projeto frontend.
const credentialsPath = path.join(process.cwd(), 'credentials.json');

// 2. Lê e analisa o ficheiro JSON para obter as credenciais.
const credentialsJson = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

// 3. Configura o cliente Vertex AI passando as credenciais explicitamente.
const project = process.env.GOOGLE_CLOUD_PROJECT_ID!;
const location = process.env.GOOGLE_CLOUD_LOCATION!;

const vertex_ai = new VertexAI({
  project: project,
  location: location,
  googleAuthOptions: {
    credentials: {
      client_email: credentialsJson.client_email,
      private_key: credentialsJson.private_key,
    },
  },
});

// --- FIM DA ABORDAGEM DE AUTENTICAÇÃO ---

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

    const sanitizedHistory = history.map((msg: any) => ({
      role: msg.role,
      parts: msg.parts,
    }));

    const chat = generativeModel.startChat({
      history: sanitizedHistory,
    });

    const result = await chat.sendMessage(message);
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