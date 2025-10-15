// Caminho: frontend/src/app/api/tts/route.ts
import OpenAI from 'openai';
import { NextRequest } from 'next/server';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(req: NextRequest) {
    try {
        const text = req.nextUrl.searchParams.get('text');

        if (!text) {
            return new Response("O texto é obrigatório.", { status: 400 });
        }

        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            // --- ALTERAÇÃO AQUI ---
            voice: "shimmer", // Voz alterada de "nova" para "shimmer"
            input: text,
            response_format: "mp3",
        });
        
        const buffer = Buffer.from(await mp3.arrayBuffer());

        return new Response(buffer, {
            headers: { 'Content-Type': 'audio/mpeg' },
        });

    } catch (error) {
        console.error("Erro inesperado ao processar a requisição de TTS com OpenAI:", error);
        return new Response("Ocorreu um erro interno no servidor ao tentar gerar o áudio.", { status: 500 });
    }
}