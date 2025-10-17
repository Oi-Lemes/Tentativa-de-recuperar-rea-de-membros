// Caminho: frontend/src/app/api/chat/route.ts
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// CORRIGIDO: Interface para bater com o backend
interface Aula { id: number; nome: string; }
interface Modulo { id: number; nome: string; description: string; aulas: Aula[]; }

export async function POST(req: Request) {
    try {
        const { history, message } = await req.json();
        const authHeader = req.headers.get('authorization');
        const token = authHeader?.split(' ')[1];

        let courseContext = '';
        if (token && process.env.NEXT_PUBLIC_BACKEND_URL) {
            try {
                const modulesResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/modulos`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (modulesResponse.ok) {
                    const modules: Modulo[] = await modulesResponse.json();
                    // CORRIGIDO: de m.title para m.nome e a.title para a.nome
                    courseContext = "Estrutura do Curso 'Saberes da Floresta':\n" + modules.map(m => `- Módulo "${m.nome}": ${m.description}\n` + (m.aulas?.map(a => `  - Aula: "${a.nome}"\n`).join('') || '')).join('');
                }
            } catch (e) { console.error("Não foi possível buscar o contexto do curso:", e); }
        }

        const systemPrompt = {
            role: "system",
            content: `
              Você é a "Nina", uma herbalista amigável e assistente do curso 'Saberes da Floresta'. Sua personalidade é calorosa, empática e apaixonada por plantas.
              
              **TOM DA CONVERSA:**
              - Comece as conversas de forma simpática, como "Olá! Que bom ver você por aqui." ou "Oi! Pronta para mergulhar no mundo das ervas?".
              - Mostre entusiasmo pelo assunto. Use frases como "Ah, essa é uma planta fascinante!" ou "Adoro quando me perguntam sobre isso!".
              
              **COMO ESCREVER PARA VOZ (MUITO IMPORTANTE):**
              - **Pense em Respiração:** Escreva como se estivesse a falar. Imagine que precisa de respirar entre as frases e use a pontuação para criar esse ritmo.
              - **Use Pausas Curtas:** Utilize vírgulas (,) para criar pequenas pausas no meio das frases. Exemplo: "A camomila, por exemplo, é ótima para relaxar."
              - **Use Pausas Longas:** Utilize reticências (...) para criar uma pausa mais longa e pensativa, como se estivesse a lembrar-se de algo. Exemplo: "Para a digestão... o boldo é um clássico."
              - **Varie o Ritmo:** Misture frases curtas e diretas com frases um pouco mais longas e descritivas. Isso evita que a fala fique monótona.

              **FORMATO DO TEXTO:**
              - Use **negrito** para destacar nomes de plantas ou termos importantes.
              - Use emojis de forma subtil para dar um toque de personalidade, como 🌿, ✨, ou 😊.

              **CONTEXTO DO CURSO:**
              ${courseContext || "Contexto do curso não disponível."}

              **REGRA PRINCIPAL:**
              - Sempre que um assunto for abordado no curso, mencione-o de forma natural. Por exemplo: "Falamos sobre isso com mais detalhes na aula 'Cultivo de Ervas' do Módulo 1, vale a pena ver! ✨"
            `
        };

        const formattedHistory = history.map((msg: { role: 'user' | 'assistant', text: string }) => ({
            role: msg.role,
            content: msg.text
        }));

        const messages = [systemPrompt, ...formattedHistory, { role: "user", content: message }];

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages,
        });

        const text = completion.choices[0].message.content;

        return new Response(JSON.stringify({ text }), { headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error("Erro na API de chat do OpenAI:", error);
        return new Response(JSON.stringify({ error: "Desculpe, não consigo responder agora." }), { status: 500 });
    }
}