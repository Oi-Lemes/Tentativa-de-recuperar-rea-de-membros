// Caminho: frontend/src/app/api/tts/route.ts

// NOTA: Esta rota foi atualizada para usar a API Gemini 2.5 Pro para Text-to-Speech (TTS).

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  // Garante que a chave da API está configurada no ambiente.
  throw new Error("GEMINI_API_KEY não encontrada no .env.local");
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return new Response("O texto é obrigatório.", { status: 400 });
    }
    
    // O usuário especificou o uso do Gemini 2.5 Pro para TTS.
    const modelName = "gemini-2.5-pro-preview-tts";
    const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    
    // Criamos um prompt detalhado para guiar o estilo da voz da IA "Nina",
    // conforme sua personalidade definida no chatbot.
    const prompt = `Fale o seguinte texto com uma voz feminina amigável e expressiva, em português do Brasil. Use um tom calmo e um ritmo natural de conversação: "${text}"`;

    const apiResponse = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }],
        }],
        // Solicitamos a resposta diretamente em formato de áudio MP3.
        generationConfig: {
          responseMimeType: "audio/mp3"
        }
      })
    });

    if (!apiResponse.ok) {
      // Se a API do Gemini retornar um erro, logamos e respondemos com um erro genérico.
      const errorDetails = await apiResponse.json();
      console.error("Erro na API de TTS do Gemini:", JSON.stringify(errorDetails, null, 2));
      return new Response("Erro ao gerar áudio a partir do serviço de IA.", { status: 500 });
    }

    const data = await apiResponse.json();
    
    // O áudio é retornado pela API em formato base64.
    // Precisamos decodificá-lo para um buffer binário antes de enviar ao cliente.
    const audioBase64 = data.candidates[0].content.parts[0].audio.audioData;
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    
    // Retornamos o buffer do áudio com o content-type correto para que o navegador possa reproduzi-lo.
    return new Response(audioBuffer, {
      headers: { 'Content-Type': 'audio/mpeg' },
    });

  } catch (error) {
    console.error("Erro inesperado ao processar a requisição de TTS:", error);
    return new Response("Ocorreu um erro interno no servidor ao tentar gerar o áudio.", { status: 500 });
  }
}