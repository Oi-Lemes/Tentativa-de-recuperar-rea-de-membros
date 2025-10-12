require('dotenv').config();

// 1. Importações
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const cors = require('cors'); // Importação do CORS
const http = require('http');
const { WebSocketServer } = require('ws');
const OpenAI = require('openai');
const { Readable } = require('stream');
const { spawn } = require('child_process');
const crypto = require('crypto');

// --- Configuração do CORS ---
// Esta é a alteração mais importante.
// Adicionamos o URL do seu frontend (da Vercel) à lista de permissões.
const corsOptions = {
  origin: process.env.FRONTEND_URL, // Permite apenas que o seu frontend faça pedidos
  optionsSuccessStatus: 200 // Para browsers mais antigos
};


// --- Middlewares ---
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

const verifyGatewayToken = (req, res, next) => {
  const receivedToken = req.headers['authorization'];
  const expectedToken = `Bearer ${process.env.GATEWAY_WEBHOOK_SECRET}`;

  if (!receivedToken || receivedToken !== expectedToken) {
    console.warn('AVISO: Tentativa de acesso não autorizado ao webhook.');
    return res.status(401).json({ message: 'Acesso não autorizado.' });
  }
  next();
};

async function sendMagicLinkEmail(email, link) {
  console.log("-----------------------------------------");
  console.log(`EMAIL SIMULADO ENVIADO PARA: ${email}`);
  console.log(`Seu link mágico de login é: ${link}`);
  console.log("Em produção, este link seria enviado para o email do utilizador.");
  console.log("-----------------------------------------");
}


async function main() {
  try {
    const app = express();
    
    // APLICAR A NOVA CONFIGURAÇÃO DO CORS
    app.use(cors(corsOptions)); 
    
    app.use(express.json());
    const prisma = new PrismaClient();
    const PORT = process.env.PORT || 3001;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // --- ROTAS DE AUTENTICAÇÃO COM LINK MÁGICO ---
    app.post('/auth/magic-link', async (req, res) => {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "O email é obrigatório." });
      }

      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return res.status(404).json({ message: "Nenhuma conta encontrada com este email. Verifique o email que usou na compra." });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const tokenExpires = new Date(Date.now() + 15 * 60 * 1000); // Token expira em 15 minutos

      await prisma.user.update({
        where: { email },
        data: {
          magicLinkToken: token,
          magicLinkTokenExpires: tokenExpires,
        },
      });

      const magicLink = `${process.env.FRONTEND_URL}/auth/callback?token=${token}`;
      await sendMagicLinkEmail(email, magicLink);

      res.status(200).json({ message: "Link mágico enviado! Verifique a sua caixa de entrada." });
    });

    app.post('/auth/verify', async (req, res) => {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ message: "Token não fornecido." });
      }

      const user = await prisma.user.findUnique({
        where: { magicLinkToken: token },
      });

      if (!user || !user.magicLinkTokenExpires || user.magicLinkTokenExpires < new Date()) {
        return res.status(400).json({ message: "Link inválido ou expirado. Por favor, peça um novo." });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          magicLinkToken: null,
          magicLinkTokenExpires: null,
        },
      });

      const jwtToken = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.status(200).json({ token: jwtToken, userName: user.nome });
    });

    // --- ROTAS DE CONTEÚDO (Protegidas) ---
    app.get('/modulos', authenticateToken, async (req, res) => {
        const userId = req.user.id;
        const todosModulos = await prisma.modulo.findMany({
            include: { aulas: { select: { id: true } } },
            orderBy: { id: 'asc' },
        });
        const modulosDeConteudo = todosModulos.filter(m => m.title !== 'Emissão de Certificado');
        const moduloCertificado = todosModulos.find(m => m.title === 'Emissão de Certificado');
        const progresso = await prisma.progressoAula.findMany({
            where: { userId: userId },
            select: { aulaId: true },
        });
        const aulasConcluidasIds = progresso.map(p => p.aulaId);
        const totalAulasDeConteudo = modulosDeConteudo.reduce((acc, modulo) => acc + modulo.aulas.length, 0);
        const cursoConcluido = totalAulasDeConteudo > 0 && aulasConcluidasIds.length >= totalAulasDeConteudo;
        let modulosParaEnviar = [...modulosDeConteudo];
        if (cursoConcluido && moduloCertificado) {
            modulosParaEnviar.push(moduloCertificado);
        }
        res.json(modulosParaEnviar);
    });

    app.get('/modulos/:id', authenticateToken, async (req, res) => {
        const { id } = req.params;
        const modulo = await prisma.modulo.findUnique({
            where: { id: parseInt(id) },
            include: { aulas: true },
        });
        if (!modulo) { return res.status(404).json({ message: 'Módulo não encontrado' }); }
        res.json(modulo);
    });
    
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
                await prisma.progressoAula.delete({ where: { userId_aulaId: { userId, aulaId: parseInt(aulaId) } } });
                res.json({ message: 'Aula desmarcada como concluída.' });
            } else {
                await prisma.progressoAula.create({ data: { userId: userId, aulaId: parseInt(aulaId) } });
                res.json({ message: 'Aula marcada como concluída.' });
            }
        } catch (error) {
            console.error("Erro ao atualizar progresso:", error);
            res.status(500).json({ message: 'Erro ao atualizar progresso.' });
        }
    });

    app.post('/generate-certificate', authenticateToken, async (req, res) => {
        try {
            const user = await prisma.user.findUnique({ where: { id: req.user.id } });
            if (!user) { return res.status(404).json({ message: "Utilizador não encontrado." }); }

            const student_name = user.nome || user.email;
            const course_name = "Formação em Herborista";
            const completion_date = new Date().toLocaleDateString('pt-BR');
            const dataParaPython = { student_name, course_name, completion_date };
            const jsonData = JSON.stringify(dataParaPython);
            const base64Data = Buffer.from(jsonData).toString('base64');
            const pythonProcess = spawn('python', ['gerador_certificado/script.py', base64Data]);
            const pdfChunks = [];
            pythonProcess.stdout.on('data', (chunk) => { pdfChunks.push(chunk); });
            pythonProcess.stderr.on('data', (data) => { console.error(`Erro do script Python: ${data.toString()}`); });
            pythonProcess.on('close', (code) => {
                if (code === 0 && pdfChunks.length > 0) {
                    const pdfBuffer = Buffer.concat(pdfChunks);
                    res.setHeader('Content-Type', 'application/pdf');
                    res.setHeader('Content-Disposition', `attachment; filename=certificado_${student_name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
                    res.send(pdfBuffer);
                } else {
                    res.status(500).json({ message: "Ocorreu uma falha ao gerar o certificado." });
                }
            });
        } catch (error) {
            console.error("Erro ao tentar executar o script de certificado:", error);
            res.status(500).json({ message: "Ocorreu um erro interno no servidor." });
        }
    });
    
    app.post('/webhooks/compra-aprovada', verifyGatewayToken, async (req, res) => {
      const { email, full_name } = req.body;
      if (!email) { return res.status(400).json({ message: 'Email é obrigatório.' }); }
      try {
        const nomeDoAluno = full_name || email.split('@')[0];
        await prisma.user.upsert({
            where: { email: email },
            update: { nome: nomeDoAluno },
            create: { email: email, nome: nomeDoAluno },
        });
        console.log(`Usuário criado/atualizado via webhook: ${email}`);
        res.status(201).json({ message: 'Usuário criado/atualizado com sucesso.' });
      } catch (error) {
        console.error("Erro no webhook de compra:", error);
        res.status(500).json({ message: 'Erro interno ao criar/atualizar usuário.' });
      }
    });

    app.post('/webhooks/reembolso', verifyGatewayToken, async (req, res) => {
      const { email } = req.body;
      if (!email) { return res.status(400).json({ message: 'Email é obrigatório.' }); }
      try {
        await prisma.user.delete({ where: { email: email } });
        console.log(`Usuário com email ${email} foi deletado.`);
        res.status(200).json({ message: 'Acesso do usuário removido com sucesso.' });
      } catch (error) {
        if (error.code === 'P2025') { return res.status(404).json({ message: 'Usuário não encontrado para remoção.' }); }
        console.error("Erro no webhook de reembolso:", error);
        res.status(500).json({ message: 'Erro interno ao remover usuário.' });
      }
    });

    const server = http.createServer(app);
    const wss = new WebSocketServer({ server });
    wss.on('connection', (ws) => {
        console.log('✅ Cliente WebSocket conectado!');
        let audioBuffers = [];
        let conversationHistory = [{ role: "system", content: `Você é a "Nina", uma assistente de IA especialista em herbalismo...` }];
        
        const processAudio = async () => {
            if (audioBuffers.length === 0) return;
            const audioBuffer = Buffer.concat(audioBuffers);
            audioBuffers = [];
            try {
                const audioStream = Readable.from(audioBuffer);
                const transcription = await openai.audio.transcriptions.create({ file: await OpenAI.toFile(audioStream, 'audio.webm'), model: 'whisper-1', language: 'pt' });
                const userText = transcription.text;
                if (!userText.trim()) return;
                if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'user_transcript', text: userText }));
                conversationHistory.push({ role: "user", content: userText });
                const completion = await openai.chat.completions.create({ model: "gpt-3.5-turbo", messages: conversationHistory });
                const gptResponseText = completion.choices[0].message.content;
                conversationHistory.push({ role: "assistant", content: gptResponseText });
                if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'assistant_response', text: gptResponseText }));
                const mp3 = await openai.audio.speech.create({ model: "tts-1", voice: "nova", input: gptResponseText, response_format: "mp3" });
                const audioResponseBuffer = Buffer.from(await mp3.arrayBuffer());
                if (ws.readyState === ws.OPEN) ws.send(audioResponseBuffer);
            } catch (error) {
                console.error('❌ ERRO NO PIPELINE DE IA:', error);
                if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'error', text: 'Desculpe, ocorreu um erro no servidor.' }));
            }
        };

        ws.on('message', (data) => {
            if (typeof data === 'string' && data === 'EOM') { processAudio(); } 
            else if (Buffer.isBuffer(data)) { audioBuffers.push(data); }
        });
        ws.on('close', () => console.log('❌ Cliente WebSocket desconectado.'));
        ws.on('error', (error) => console.error('WebSocket Error:', error));
    });

    server.listen(PORT, () => {
        console.log(`✅ Servidor a rodar na porta ${PORT}`);
    });

  } catch (error) {
    console.error("❌ ERRO FATAL AO INICIAR O SERVIDOR:", error);
    process.exit(1);
  }
}

main();