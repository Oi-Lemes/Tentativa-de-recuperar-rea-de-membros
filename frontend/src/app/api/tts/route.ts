// Caminho do ficheiro: frontend/src/app/api/tts/route.ts

import { TextToSpeechClient } from '@google-cloud/text-to-speech';

const client = new TextToSpeechClient();

export async function POST(req: Request) {
  const { text } = await req.json();

  if (!text) {
    return new Response("O texto é obrigatório.", { status: 400 });
  }

  try {
    const request = {
      input: { text: text },
      voice: {
        languageCode: 'pt-BR',
        name: 'pt-BR-Wavenet-C', 
      },
      audioConfig: {
        audioEncoding: 'MP3' as const,
        speakingRate: 1.15,
        pitch: 1.2,
      },
    };

    const [response] = await client.synthesizeSpeech(request);
    
    return new Response(response.audioContent, {
      headers: { 'Content-Type': 'audio/mpeg' },
    });

  } catch (error) {
    console.error("Erro na API de TTS do Google Cloud:", error);
    return new Response("Erro ao gerar áudio.", { status: 500 });
  }
}