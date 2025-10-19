// Caminho: backend/server.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt'; // Importação para o login com senha
import axios from 'axios';  // Importação para a API da Tribopay

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execFileAsync = promisify(execFile);

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'seu-segredo-super-secreto';

app.use(express.json());

// COLE ESTE CÓDIGO NO LUGAR DO ANTIGO
const productionUrl = 'https://www.saberesdafloresta.site';
const localUrl = 'http://localhost:3000';

// Aceita qualquer URL do seu projeto na Vercel
const vercelRegex = /https:\/\/tentativa-de-recuperar-rea-de-membros.*\.vercel\.app$/;

app.use(cors({
  origin: [productionUrl, localUrl, vercelRegex],
  optionsSuccessStatus: 200
}));
// --- FIM DA CONFIGURAÇÃO ---

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- ROTAS ORIGINAIS (Módulos, Aulas, Progresso, etc.) ---

app.get('/modulos', authenticateToken, async (req, res) => {
    try {
        const modulos = await prisma.modulo.findMany({
            include: {
                aulas: {
                    orderBy: {
                        ordem: 'asc',
                    },
                },
            },
            orderBy: {
                ordem: 'asc',
            },
        });
        res.json(modulos);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar módulos' });
    }
});

app.get('/modulos/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const modulo = await prisma.modulo.findUnique({
            where: { id: parseInt(id) },
            include: {
                aulas: {
                    orderBy: {
                        ordem: 'asc',
                    },
                },
            },
        });
        if (modulo) {
            res.json(modulo);
        } else {
            res.status(404).json({ error: 'Módulo não encontrado' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar módulo' });
    }
});

app.get('/aulas/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const aula = await prisma.aula.findUnique({
            where: { id: parseInt(id) },
        });
        if (aula) {
            res.json(aula);
        } else {
            res.status(404).json({ error: 'Aula não encontrada' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar aula' });
    }
});

app.post('/aulas/concluir', authenticateToken, async (req, res) => {
    const { aulaId } = req.body;
    const userId = req.user.id;
    try {
        const progressoExistente = await prisma.progresso.findUnique({
            where: {
                userId_aulaId: {
                    userId: userId,
                    aulaId: aulaId,
                },
            },
        });
        if (progressoExistente) {
            await prisma.progresso.delete({
                where: {
                    userId_aulaId: {
                        userId: userId,
                        aulaId: aulaId,
                    },
                },
            });
            res.json({ status: 'desmarcada' });
        } else {
            const novoProgresso = await prisma.progresso.create({
                data: {
                    userId: userId,
                    aulaId: aulaId,
                    concluida: true,
                },
            });
            res.json({ status: 'marcada', progresso: novoProgresso });
        }
    } catch (error) {
        console.error("Erro ao alternar progresso da aula:", error);
        res.status(500).json({ error: 'Erro ao marcar/desmarcar aula como concluída' });
    }
});

app.get('/progresso', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const progresso = await prisma.progresso.findMany({
            where: { userId: userId, concluida: true },
            select: { aulaId: true },
        });
        res.json(progresso.map((p) => p.aulaId));
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar progresso' });
    }
});

app.get('/progresso-modulos', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const modulos = await prisma.modulo.findMany({
            include: { aulas: { select: { id: true } } },
        });
        const progressoAulas = await prisma.progresso.findMany({
            where: { userId: userId, concluida: true },
            select: { aulaId: true },
        });
        const aulasConcluidasIds = new Set(progressoAulas.map(p => p.aulaId));
        const progressoModulos = {};
        modulos.forEach(modulo => {
            if (modulo.aulas.length === 0) {
                progressoModulos[modulo.id] = 100;
                return;
            }
            const aulasConcluidasNoModulo = modulo.aulas.filter(aula => aulasConcluidasIds.has(aula.id)).length;
            progressoModulos[modulo.id] = Math.round((aulasConcluidasNoModulo / modulo.aulas.length) * 100);
        });
        res.json(progressoModulos);
    } catch (error) {
        console.error('Erro ao buscar progresso dos módulos:', error);
        res.status(500).json({ error: 'Erro ao buscar progresso dos módulos' });
    }
});

// Rota de Login com Senha (essencial para o sistema de planos)
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user && user.password && await bcrypt.compare(password, user.password)) {
            const accessToken = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '1d' });
            res.json({ accessToken, userName: user.name });
        } else {
            res.status(401).send('Email ou senha incorretos');
        }
    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).send('Erro interno no servidor');
    }
});


// Em backend/server.js
app.post('/auth/magic-link', async (req, res) => {
    const { email } = req.body; // Mantém a extração apenas do email
    console.log('Recebido pedido para /auth/magic-link com o email:', email); // Linha adicionada
    try {
        const user = await prisma.user.upsert({
            where: { email },
            update: {},
            // Se o utilizador não existir, cria com email. O nome pode ser adicionado depois.
            create: { email },
        });
        // ... resto do código da função
        const magicLink = await prisma.magicLink.create({
            data: {
                userId: user.id,
                token: `${Date.now()}${Math.random()}`.replace(/\./g, ''),
                email: email,
                expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            },
        });
        // ▼▼▼ INSIRA ESTE NOVO BLOCO NO LUGAR ▼▼▼
// Determina a URL base do frontend dependendo do ambiente
const frontendUrl = process.env.NODE_ENV === 'production'
  ? process.env.FRONTEND_URL
  : 'http://localhost:3000';

// Cria a URL completa do link mágico para ser enviada no e-mail
const url = `${frontendUrl}/auth/callback?token=${magicLink.token}`;

// Nota: A lógica para enviar um e-mail real para o usuário com a variável "url" deve ser inserida aqui.

// Mantém a exibição do link no console para facilitar os testes em ambiente de desenvolvimento
console.log(`\n✨ LINK MÁGICO (PARA TESTES):\n${url}\n`);

res.status(200).json({ message: 'Link mágico gerado e pronto para envio.' });
// ▲▲▲ INSIRA ATÉ AQUI ▲▲▲
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao processar solicitação de link mágico' });
    }
});

app.post('/auth/verify', async (req, res) => {
    const { token } = req.body;
    try {
        const magicLink = await prisma.magicLink.findUnique({
            where: { token },
            include: { user: true },
        });
        if (!magicLink || new Date() > new Date(magicLink.expiresAt)) {
            if (magicLink) await prisma.magicLink.delete({ where: { token } });
            return res.status(400).json({ error: 'Link mágico inválido ou expirado' });
        }
        const userToken = jwt.sign({ id: magicLink.userId, email: magicLink.user.email }, JWT_SECRET, { expiresIn: '7d' });
        await prisma.magicLink.delete({ where: { token } });
        res.json({ token: userToken, userName: magicLink.user.name, userId: magicLink.user.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao verificar o link mágico' });
    }
});

// Rota de Gerar Certificado (mantida)
app.post('/gerar-certificado', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { safeStudentName } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
        const certificadoDir = path.join(__dirname, 'gerador_certificado', 'certificados');
        const certificadoPath = path.join(certificadoDir, `${safeStudentName}.pdf`);
        const scriptPath = path.join(__dirname, 'gerador_certificado', 'script.py');
        const args = [
            scriptPath,
            user.name || 'Nome do Aluno',
            'Formação Herbalista Pro',
            new Date().toLocaleDateString('pt-BR'),
            `file:///${path.join(__dirname, 'gerador_certificado', 'img', 'ervas.webp').replace(/\\/g, '/')}`,
            certificadoPath
        ];
        await execFileAsync('python', args);
        res.sendFile(certificadoPath);
    } catch (error) {
        console.error('Erro ao gerar certificado:', error);
        res.status(500).send('Erro ao gerar o certificado.');
    }
});


// --- NOVAS ROTAS PARA O SISTEMA DE PAGAMENTOS E PLANOS ---

// ROTA 1: PARA O FRONTEND BUSCAR OS DADOS DO UTILIZADOR LOGADO
app.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, email: true, name: true, plan: true,
        hasLiveAccess: true, hasNinaAccess: true, hasWalletAccess: true
      }
    });
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar dados do utilizador.' });
  }
});

// ROTA 2: PARA GERAR A COBRANÇA PIX COM A TRIBOPAY
app.post('/gerar-pix-tribopay', authenticateToken, async (req, res) => {
  const { offerHash } = req.body;
  const { name, email } = req.user;
 const TRIBOPAY_API_URL = 'https://api.tribopay.com.br/api/v1/charge/pix/create';
  const payload = {
    token: process.env.TRIBOPAY_API_TOKEN,
    offer_hash: offerHash,
    customer: { name, email }
  };
  try {
    const response = await axios.post(TRIBOPAY_API_URL, payload);
    const pixData = response.data;
    if (pixData && pixData.qr_code && pixData.qr_code_text) {
      res.json({
        qrCodeBase64: pixData.qr_code,
        qrCode: pixData.qr_code_text,
      });
    } else {
      throw new Error('Resposta inválida da API da Tribopay.');
    }
  } catch (error) {
    console.error('Erro ao gerar PIX com a Tribopay:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Não foi possível gerar a cobrança PIX.' });
  }
});

// ROTA 3: WEBHOOK PARA RECEBER CONFIRMAÇÃO DE PAGAMENTOS DA TRIBOPAY
app.post('/webhook-gateway', async (req, res) => {
  console.log('Webhook recebido:', req.body);
  // IMPORTANTE: Verifique na documentação da Tribopay os nomes exatos dos campos
  const { customer_email, product_hash, event_type } = req.body;

  if (event_type === 'purchase.approved') { // Verifique o nome do evento
    try {
      const user = await prisma.user.findUnique({ where: { email: customer_email } });
      if (user) {
        console.log(`Atualizando acesso para ${customer_email}, produto ${product_hash}`);
        
        // --- LÓGICA ATUALIZADA COM OS SEUS HASHES DE PRODUTO REAIS ---
        switch (product_hash) {
          // Planos
          case 'dig1p': // Plano Premium
            await prisma.user.update({ where: { email: customer_email }, data: { plan: 'premium' } });
            break;
          case 'tjxp0': // Plano Ultra
            await prisma.user.update({ where: { email: customer_email }, data: { plan: 'ultra', hasLiveAccess: true, hasNinaAccess: true, hasWalletAccess: true } });
            break;
          // Compras Avulsas
          case 'wunqzncl9v': // Bot Nina
            await prisma.user.update({ where: { email: customer_email }, data: { hasNinaAccess: true } });
            break;
          case 'z1xp3f2ayg': // Live Dr José Nakamura
            await prisma.user.update({ where: { email: customer_email }, data: { hasLiveAccess: true } });
            break;
          // Assumimos que a compra do Certificado ou da Carteira liberta o mesmo acesso `hasWalletAccess`
          case 'wyghke8sf1': // Certificado
          case 'ta6jxnhmo2': // Carteirinha ABRATH
          case 'ogtsy3fs0o': // Frete PAC
          case 'hg4kajthaw': // Frete Express
            await prisma.user.update({ where: { email: customer_email }, data: { hasWalletAccess: true } });
            break;
          default:
            console.warn(`Hash de produto não reconhecido: ${product_hash}`);
        }
      }
    } catch (error) {
      console.error('Erro ao processar o webhook:', error);
      return res.status(500).send('Erro interno.');
    }
  }
  res.status(200).send('Webhook processado.');
});


app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});