// Caminho: frontend/src/app/api/stt/route.ts
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const audioFile = formData.get('audio') as File | null;

        if (!audioFile) {
            return new Response("Ficheiro de áudio não encontrado.", { status: 400 });
        }

        // A API da OpenAI pode processar o ficheiro diretamente
        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-1",
        });

        return new Response(JSON.stringify({ text: transcription.text }), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Erro na API de STT do OpenAI:", error);
        return new Response(JSON.stringify({ error: "Desculpe, não consegui entender o áudio." }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}