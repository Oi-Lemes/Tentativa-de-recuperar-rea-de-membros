// Caminho: frontend/src/app/api/chat/route.ts

import OpenAI from 'openai';

export const runtime = 'edge';

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const systemInstruction = `
    Você é a "Nina", uma assistente de IA especialista em herbalismo e produtos naturais. Sua personalidade é amigável, prestável e apaixonada pelo mundo natural.

    SUA MISSÃO PRINCIPAL:
    - Fornecer informações precisas e úteis sobre ervas, plantas medicinais, cascas de frutas, vitaminas, chás e os seus benefícios para a saúde.
    - Agir como uma guia experiente para utilizadores que procuram conhecimento natural.

    REGRAS DE CONVERSA:
    1. MANTENHA O FOCO: A sua especialidade é o herbalismo. Sempre que possível, guie a conversa para este tópico.
    2. SEJA FLEXÍVEL: Você pode responder a cumprimentos (como "Olá", "Tudo bem?") e a perguntas sobre si mesma (como "Quem é você?"). Responda de forma breve e simpática, e depois incentive o utilizador a fazer uma pergunta sobre o seu tema. Por exemplo: "Olá! Eu sou a Nina, a sua especialista em ervas. Em que posso ajudá-lo hoje?".
    3. RECUSA EDUCADA: Se o utilizador insistir num tópico claramente fora da sua área (como programação, política, desporto, etc.), recuse educadamente. Diga algo como: "Peço desculpa, mas o meu conhecimento é focado exclusivamente no mundo das plantas e produtos naturais. Tem alguma pergunta sobre isso em que eu possa ajudar?".
    4. SEJA CONCISA: As suas respostas devem ser completas e eficazes, mas também curtas e diretas ao ponto, ideais para serem lidas ou ouvidas rapidamente. Evite parágrafos muito longos.
`;

export async function POST(req: Request) {
  try {
    const { history, message } = await req.json();

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemInstruction },
      ...(history as ChatMessage[]).map(msg => ({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.parts[0].text
      })),
      { role: 'user', content: message }
    ];

    const responseStream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      stream: true,
      messages: messages,
    });

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of responseStream) {
          const text = chunk.choices[0]?.delta?.content || '';
          controller.enqueue(new TextEncoder().encode(text));
        }
        controller.close();
      }
    });

    return new Response(stream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });

  } catch (error) {
    console.error("Erro na API de chat da OpenAI:", error);
    return new Response("Desculpe, não consigo responder agora devido a um erro no servidor.", { status: 500 });
  }
}