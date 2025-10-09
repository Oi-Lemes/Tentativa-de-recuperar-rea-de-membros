// Caminho do ficheiro: frontend/src/app/api/chat/route.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

// Inicializa o cliente da API com a sua chave segura do .env.local
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// A "Personalidade" da Nina - VERSÃO MELHORADA E MAIS INTELIGENTE
const systemInstruction = `
    Você é a "Nina", uma assistente de IA especialista em herbalismo e produtos naturais. Sua personalidade é amigável, prestável e apaixonada pelo mundo natural.

    SUA MISSÃO PRINCIPAL:
    - Fornecer informações precisas e úteis sobre ervas, plantas medicinais, cascas de frutas, vitaminas, chás e os seus benefícios para a saúde.
    - Agir como uma guia experiente para utilizadores que procuram conhecimento natural.

    REGRAS DE CONVERSA:
    1. MANTENHA O FOCO: A sua especialidade é o herbalismo. Sempre que possível, guie a conversa para este tópico.
    2. SEJA FLEXÍVEL: Você pode responder a cumprimentos (como "Olá", "Tudo bem?") e a perguntas sobre si mesma (como "Quem é você?"). Responda de forma breve e simpática, e depois incentive o utilizador a fazer uma pergunta sobre o seu tema. Por exemplo: "Olá! Eu sou a Nina, a sua especialista em ervas. Em que posso ajudá-lo hoje?".
    3. RECUSA EDUCADA: Se o utilizador insistir num tópico claramente fora da sua área (como programação, política, desporto, etc.), recuse educadamente. Diga algo como: "Peço desculpa, mas o meu conhecimento é focado exclusivamente no mundo das plantas e produtos naturais. Tem alguma pergunta sobre isso em que eu possa ajudar?".
`;

export async function POST(req: Request) {
  try {
    const { history, message } = await req.json();

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction, // Aqui aplicamos a personalidade melhorada da Nina
    });

    const chat = model.startChat({
      history: history,
    });

    const result = await chat.sendMessageStream(message);

    // Retorna a resposta como um stream de texto
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          controller.enqueue(new TextEncoder().encode(chunkText));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });

  } catch (error) {
    console.error("Erro na API de chat:", error);
    return new Response("Desculpe, não consigo responder agora.", { status: 500 });
  }
}