// Caminho: frontend/src/app/api/tts/route.ts
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const { text } = await req.json();

        if (!text) {
            return new Response("O texto é obrigatório.", { status: 400 });
        }

        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: "nova", // 'nova' é uma das vozes da OpenAI
            input: text,
            response_format: "mp3",
        });
        
        // Converte o stream de resposta para um buffer
        const buffer = Buffer.from(await mp3.arrayBuffer());

        return new Response(buffer, {
            headers: { 'Content-Type': 'audio/mpeg' },
        });

    } catch (error) {
        console.error("Erro inesperado ao processar a requisição de TTS com OpenAI:", error);
        return new Response("Ocorreu um erro interno no servidor ao tentar gerar o áudio.", { status: 500 });
    }
}