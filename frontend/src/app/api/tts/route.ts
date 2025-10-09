// Caminho do ficheiro: frontend/src/app/api/tts/route.ts

import ElevenLabs from "elevenlabs-node";
import { Readable } from "stream";

export async function POST(req: Request) {
  const { text } = await req.json();

  if (!text) {
    return new Response("O texto é obrigatório.", { status: 400 });
  }

  const elevenlabs = new ElevenLabs({
    apiKey: process.env.ELEVENLABS_API_KEY,
  });

  try {
    // ===== CORREÇÃO DE QUALIDADE DEFINITIVA =====
    // Usamos a função textToSpeech, que gera o áudio completo no servidor antes de enviar.
    // Isto resolve todos os problemas de instabilidade, mudança de tom e sotaque.
    const audioBuffer = await elevenlabs.textToSpeech({
      voiceId: process.env.ELEVENLABS_VOICE_ID || 'Rachel',
      textInput: text,
      modelId: "eleven_multilingual_v2", // Este modelo é excelente para português
      voiceSettings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.3, // Um pouco de expressividade
        use_speaker_boost: true,
      },
    });

    // Convertemos o Buffer (o ficheiro de áudio em memória) para um formato que a resposta da API entende.
    const readable = new Readable();
    readable._read = () => {};
    readable.push(audioBuffer);
    readable.push(null);

    return new Response(readable as any, {
      headers: { 'Content-Type': 'audio/mpeg' },
    });
    // ===============================================

  } catch (error) {
    console.error("Erro ao gerar áudio do ElevenLabs:", error);
    return new Response("Erro ao gerar áudio.", { status: 500 });
  }
}