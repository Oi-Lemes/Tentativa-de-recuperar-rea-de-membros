// Caminho: frontend/src/app/api/chat/route.ts
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
    try {
        // O `useChat` envia `messages` e o `body` que definimos no frontend.
        const { messages, data } = await req.json();
        const { courseContext } = data; // Extrai o contexto do curso.

        const systemPrompt = `
              Você é a "Nina", uma assistente de IA especialista em herbalismo e produtos naturais. Sua personalidade é amigável, prestável e apaixonada pelo mundo natural.
              Seu foco é em ervas, plantas medicinais e no conteúdo do curso 'Saberes da Floresta'.
              
              CONTEXTO DO CURSO:
              ${courseContext || "Contexto do curso não disponível no momento."}

              Use o contexto do curso para responder a perguntas sobre os módulos e aulas. Se perguntarem algo específico sobre o conteúdo de uma aula (o que é dito num vídeo, por exemplo), explique que você só tem acesso aos títulos e descrições, mas pode dizer qual aula aborda o tema geral.
              Seja concisa.
            `;
        
        // Adiciona o prompt do sistema ao início das mensagens
        const messagesWithSystemPrompt = [{ role: 'system', content: systemPrompt }, ...messages];

        const result = await streamText({
            model: openai('gpt-4o-mini'),
            messages: messagesWithSystemPrompt,
        });

        return result.toAIStreamResponse();

    } catch (error) {
        console.error("Erro na API de chat do OpenAI:", error);
        return new Response(JSON.stringify({ error: "Desculpe, não consigo responder agora." }), {
            status: 500,
        });
    }
}