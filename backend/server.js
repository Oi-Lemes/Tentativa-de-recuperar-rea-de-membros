require('dotenv').config();

// 1. Importações
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const OpenAI = require('openai');
const { Readable } = require('stream');

// --- Middleware de Autenticação (COLE AQUI A SUA FUNÇÃO ORIGINAL) ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

async function main() {
  try {
    const app = express();
    app.use(cors());
    app.use(express.json());
    const prisma = new PrismaClient();
    const PORT = 3001;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // --- COLE AQUI TODAS AS SUAS ROTAS HTTP ORIGINAIS (login, modulos, etc.) ---
    // ROTA DE CADASTRO
    app.post('/usuarios', async (req, res) => {
      console.log('--- INICIANDO CADASTRO ---');
      try {
        const { email, password } = req.body;
        if (!password) {
            return res.status(400).json({ message: "O campo 'password' é obrigatório." });
        }
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(password, salt);
        const novoUsuario = await prisma.user.create({
          data: { email: email, senha: senhaHash },
        });
        const usuarioSemSenha = { ...novoUsuario };
        delete usuarioSemSenha.senha;
        res.status(201).json(usuarioSemSenha);
      } catch (error) {
        console.error("ERRO GRAVE NO CADASTRO:", error);
        res.status(400).json({ message: "Não foi possível criar o usuário. O e-mail já pode existir." });
      }
    });

    // ROTA DE LOGIN
    app.post('/login', async (req, res) => {
      console.log('--- INICIANDO LOGIN ---');
      try {
        const { email, password } = req.body;
        const usuario = await prisma.user.findUnique({ where: { email: email } });
        if (!usuario) {
          return res.status(404).json({ message: "Usuário não encontrado." });
        }
        if (!usuario.senha || !usuario.senha.startsWith('$2b$')) {
            console.error(`O usuário '${email}' tentou logar, mas sua senha no banco de dados NÃO está criptografada.`);
            return res.status(500).json({ message: "Erro crítico de segurança: a senha deste usuário não está criptografada." });
        }
        const senhaCorreta = await bcrypt.compare(password, usuario.senha);
        if (!senhaCorreta) {
          return res.status(401).json({ message: "Senha incorreta." });
        }
        const token = jwt.sign(
          { id: usuario.id, email: usuario.email },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );
        res.status(200).json({ token: token });
      } catch (error) {
        console.error("ERRO GRAVE NO LOGIN:", error);
        res.status(500).json({ message: "Ocorreu um erro inesperado no login." });
      }
    });

    // ROTAS DE CONTEÚDO (PROTEGIDAS)
    app.get('/modulos', authenticateToken, async (req, res) => {
        const modulos = await prisma.modulo.findMany({
            include: { aulas: { select: { id: true } } },
        });
        res.json(modulos);
    });
    app.get('/modulos/:id', authenticateToken, async (req, res) => {
        const { id } = req.params;
        const modulo = await prisma.modulo.findUnique({
            where: { id: parseInt(id) },
            include: { aulas: true },
        });
        if (!modulo) {
            return res.status(404).json({ message: 'Módulo não encontrado' });
        }
        res.json(modulo);
    });
    
    // ROTAS DE PROGRESSO (PROTEGIDAS)
    app.get('/progresso', authenticateToken, async (req, res) => {
        const progresso = await prisma.progressoAula.findMany({
            where: { userId: req.user.id },
            select: { aulaId: true },
        });
        res.json(progresso.map(p => p.aulaId));
    });
    app.post('/progresso/aula/:aulaId', authenticateToken, async (req, res) => {
        const { aulaId } = req.params;
        const userId = req.user.id;
        try {
            const jaConcluida = await prisma.progressoAula.findUnique({
                where: { userId_aulaId: { userId, aulaId: parseInt(aulaId) } },
            });
            if (jaConcluida) {
                await prisma.progressoAula.delete({
                    where: { userId_aulaId: { userId, aulaId: parseInt(aulaId) } },
                });
                res.json({ message: 'Aula desmarcada como concluída.' });
            } else {
                await prisma.progressoAula.create({
                    data: { userId: userId, aulaId: parseInt(aulaId) },
                });
                res.json({ message: 'Aula marcada como concluída.' });
            }
        } catch (error) {
            console.error("Erro ao atualizar progresso:", error);
            res.status(500).json({ message: 'Erro ao atualizar progresso.' });
        }
    });
    
    // LÓGICA DOS WEBHOOKS
    app.post('/webhooks/compra-aprovada', async (req, res) => {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: 'Email é obrigatório.' });
      }
      try {
        const senhaAleatoria = Math.random().toString(36).slice(-8);
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senhaAleatoria, salt);
        await prisma.user.create({
          data: { email: email, senha: senhaHash },
        });
        console.log(`Usuário criado via webhook: ${email} com senha temporária: ${senhaAleatoria}`);
        res.status(201).json({ message: 'Usuário criado com sucesso.' });
      } catch (error) {
        if (error.code === 'P2002') {
          return res.status(200).json({ message: 'Usuário já existia.' });
        }
        res.status(500).json({ message: 'Erro interno ao criar usuário.' });
      }
    });
    app.post('/webhooks/reembolso', async (req, res) => {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: 'Email é obrigatório.' });
      }
      try {
        await prisma.user.delete({ where: { email: email } });
        console.log(`Usuário com email ${email} foi deletado.`);
        res.status(200).json({ message: 'Acesso do usuário removido com sucesso.' });
      } catch (error) {
        if (error.code === 'P2025') {
          return res.status(404).json({ message: 'Usuário não encontrado para remoção.' });
        }
        res.status(500).json({ message: 'Erro interno ao remover usuário.' });
      }
    });

    // ROTA DE LIMPEZA
    app.post('/delete-all-users', async (req, res) => {
        try {
            const deleted = await prisma.user.deleteMany({});
            res.status(200).json({ message: `${deleted.count} usuários foram deletados com sucesso.` });
        } catch (error) {
            res.status(500).json({ message: "Não foi possível deletar os usuários." });
        }
    });

    // --- LÓGICA WEBSOCKET ATUALIZADA ---
    const server = http.createServer(app);
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws) => {
        console.log('✅ Cliente WebSocket conectado!');
        let audioBuffers = [];
        let conversationHistory = [{
            role: "system",
            content: `Você é a "Nina", uma assistente de IA especialista em herbalismo...` // Seu prompt de sistema
        }];
        
        const processAudio = async () => {
            if (audioBuffers.length === 0) return;
            console.log('🗣️ Processando áudio...');
            const audioBuffer = Buffer.concat(audioBuffers);
            audioBuffers = [];

            try {
                // Etapa 1: Transcrição (Audio-para-Texto)
                console.log('1/4 - Enviando para transcrição (Whisper)...');
                const audioStream = Readable.from(audioBuffer);
                const transcription = await openai.audio.transcriptions.create({
                    file: await OpenAI.toFile(audioStream, 'audio.webm'),
                    model: 'whisper-1', language: 'pt'
                });
                
                const userText = transcription.text;
                console.log(`2/4 - Texto transcrito: "${userText}"`);
                if (!userText.trim()) return;

                if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'user_transcript', text: userText }));
                
                conversationHistory.push({ role: "user", content: userText });

                // Etapa 2: Chat (Obter resposta do GPT)
                console.log('3/4 - Enviando para o GPT-3.5-Turbo...');
                const completion = await openai.chat.completions.create({
                    model: "gpt-3.5-turbo", messages: conversationHistory,
                });
                
                const gptResponseText = completion.choices[0].message.content;
                conversationHistory.push({ role: "assistant", content: gptResponseText });

                if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'assistant_response', text: gptResponseText }));

                // Etapa 3: Síntese de Voz (Texto-para-Áudio)
                console.log('4/4 - Gerando áudio de resposta (TTS)...');
                const mp3 = await openai.audio.speech.create({
                    model: "tts-1", voice: "nova", input: gptResponseText, response_format: "opus",
                });
                
                const audioResponseBuffer = Buffer.from(await mp3.arrayBuffer());
                if (ws.readyState === ws.OPEN) ws.send(audioResponseBuffer);
                console.log('✅ Pipeline concluído com sucesso!');

            } catch (error) {
                // --- ESTA É A PARTE MODIFICADA E MAIS IMPORTANTE ---
                console.error('❌ ERRO DETALHADO NO PIPELINE DE IA DA OPENAI:');
                console.error(error); // Isto vai imprimir o objeto de erro completo!
                // --- FIM DA MODIFICAÇÃO ---
                if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'error', text: 'Desculpe, ocorreu um erro no servidor.' }));
            }
        };

        ws.on('message', (data) => {
            // Se a mensagem for a string "EOM", processa o áudio.
            if (typeof data === 'string' && data === 'EOM') {
                processAudio();
            } 
            // Senão, assume que é um chunk de áudio.
            else if (Buffer.isBuffer(data)) {
                audioBuffers.push(data);
            }
        });

        ws.on('close', () => console.log('❌ Cliente WebSocket desconectado.'));
        ws.on('error', (error) => console.error('WebSocket Error:', error));
    });

    server.listen(PORT, () => {
        console.log(`✅ Servidor 100% OpenAI (HTTP e WebSocket) a rodar na porta ${PORT}`);
    });

  } catch (error) {
    console.error("❌ ERRO FATAL AO INICIAR O SERVIDOR:", error);
    process.exit(1);
  }
}

main();