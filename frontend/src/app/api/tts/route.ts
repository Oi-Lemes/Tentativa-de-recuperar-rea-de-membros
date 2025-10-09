// Caminho do ficheiro: frontend/src/app/api/tts/route.ts

import OpenAI from 'openai';

// Inicializa o cliente da OpenAI com a sua chave de API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const { text } = await req.json();

  if (!text) {
    return new Response("O texto é obrigatório.", { status: 400 });
  }

  try {
    // Solicita a geração de áudio para a OpenAI com as melhores configurações
    const audioResponse = await openai.audio.speech.create({
      // 1. Modelo de Alta Definição: Garante a máxima qualidade e clareza.
      model: "tts-1-hd",
      
      // 2. Voz: A "shimmer" é amplamente considerada a que soa mais natural
      // e com menos sotaque para o português do Brasil.
      voice: "shimmer",
      
      // 3. Velocidade: Um leve aumento para tornar a fala mais fluida e dinâmica.
      speed: 1.1,

      // O texto que a Nina irá falar
      input: text,

      // Formato do áudio
      response_format: "mp3",
    });

    // Envia o áudio diretamente para o navegador
    return new Response(audioResponse.body, {
      headers: { 'Content-Type': 'audio/mpeg' },
    });

  } catch (error) {
    console.error("Erro na API de TTS da OpenAI:", error);
    return new Response("Erro ao gerar áudio.", { status: 500 });
  }
}