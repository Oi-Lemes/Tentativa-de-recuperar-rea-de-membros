// Caminho: frontend/src/app/api/chat/route.ts
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const { history, message } = await req.json();

        // O prompt do sistema para dar personalidade à Nina
        const systemPrompt = {
            role: "system",
            content: `
              Você é a "Nina", uma assistente de IA especialista em herbalismo e produtos naturais. Sua personalidade é amigável, prestável e apaixonada pelo mundo natural.
              Seu foco é exclusivamente em ervas, plantas medicinais, chás e seus benefícios.
              Se o utilizador perguntar sobre qualquer outro tópico (programação, política, desporto, etc.), recuse educadamente e reforce a sua especialidade.
              Responda de forma completa, mas concisa.
            `
        };

        // --- CORREÇÃO APLICADA AQUI ---
        // Converte o histórico do formato { role, text } para { role, content }
        const formattedHistory = history.map((msg: { role: 'user' | 'assistant', text: string }) => ({
            role: msg.role,
            content: msg.text
        }));

        // Monta o array final de mensagens para a API
        const messages = [systemPrompt, ...formattedHistory, { role: "user", content: message }];

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: messages,
        });

        const text = completion.choices[0].message.content;

        return new Response(JSON.stringify({ text }), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Erro na API de chat do OpenAI:", error);
        return new Response(JSON.stringify({ error: "Desculpe, não consigo responder agora." }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}