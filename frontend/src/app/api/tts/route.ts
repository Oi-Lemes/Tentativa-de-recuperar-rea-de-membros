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
      // --- CONFIGURAÇÃO DA VOZ PERFEITA ---
      voice: {
        // 1. Voz Brasileira:
        languageCode: 'pt-BR',
        // 2. Voz Feminina e Natural: 'Wavenet-C' é uma voz feminina
        // com ótima entonação para o português do Brasil.
        name: 'pt-BR-Wavenet-C', 
      },
      // --- AJUSTES FINOS DE ÁUDIO ---
      audioConfig: {
        audioEncoding: 'MP3' as const,
        // 3. Falar mais rápido: Aumenta a velocidade em 15%. (O padrão é 1.0)
        speakingRate: 1.15,
        // 4. Entonação de voz: Um leve ajuste no tom (pitch) para
        // deixar a fala menos monótona e mais expressiva.
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