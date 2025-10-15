// Caminho: frontend/src/app/api/chat/route.ts
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

interface Aula { id: number; title: string; }
interface Modulo { id: number; title: string; description: string; aulas: Aula[]; }

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
                    courseContext = "Estrutura do Curso 'Saberes da Floresta':\n" + modules.map(m => `- Módulo "${m.title}": ${m.description}\n` + (m.aulas?.map(a => `  - Aula: "${a.title}"\n`).join('') || '')).join('');
                }
            } catch (e) { console.error("Não foi possível buscar o contexto do curso:", e); }
        }

        const systemPrompt = {
            role: "system",
            content: `
              Você é a "Nina", uma assistente de IA especialista em herbalismo. Sua personalidade é amigável e apaixonada.
              Seu foco é no conteúdo do curso 'Saberes da Floresta' e em ervas medicinais.
              
              **REGRAS DE FORMATAÇÃO:**
              - Use **negrito** para destacar termos importantes.
              - Use listas com marcadores (com '-') para passos, ingredientes ou itens.
              - NUNCA use cabeçalhos (com '#').

              **CONTEXTO DO CURSO:**
              ${courseContext || "Contexto do curso não disponível."}

              **REGRAS DE RESPOSTA:**
              - Ao responder sobre um tópico que é abordado no curso, termine a sua resposta mencionando a aula e o módulo. Exemplo: "Você pode aprender mais sobre isso na aula 'Cultivo de Ervas' do Módulo 1."
              - Seja sempre concisa e amigável.
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