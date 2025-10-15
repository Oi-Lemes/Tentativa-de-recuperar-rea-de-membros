// Caminho: frontend/src/app/api/tts/route.ts
import OpenAI from 'openai';
import { NextRequest } from 'next/server';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const text = searchParams.get('text');

        if (!text) {
            return new Response(JSON.stringify({ error: "O texto é obrigatório." }), { status: 400 });
        }

        const mp3 = await openai.audio.speech.create({
            model: "tts-1-hd", // <-- A melhor qualidade de voz para maior fluidez e naturalidade.
            voice: "fable",    // <-- Uma voz com entoação mais natural para narração.
            input: text,
        });
        
        const buffer = Buffer.from(await mp3.arrayBuffer());

        return new Response(buffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
            },
        });

    } catch (error) {
        console.error("Erro na API de TTS do OpenAI:", error);
        return new Response(JSON.stringify({ error: "Desculpe, não consigo falar agora." }), { status: 500 });
    }
}