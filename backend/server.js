// Caminho: backend/server.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execFileAsync = promisify(execFile);

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'seu-segredo-super-secreto';

// Chaves de API - Adicione as suas chaves no arquivo .env na raiz do backend
const TRIBOPAY_API_TOKEN = process.env.TRIBOPAY_API_TOKEN;
const PARADISE_API_TOKEN = process.env.PARADISE_API_TOKEN || 'sk_5801a6ec5051bf1cf144155ddada51120b2d1dda4d03cb2df454fb4eab9a78a9';

app.use(express.json());

const productionUrl = 'https://www.saberesdafloresta.site';
const localUrl = 'http://localhost:3000';
const vercelRegex = /https:\/\/tentativa-de-recuperar-rea-de-membros.*\.vercel\.app$/;

app.use(cors({
  origin: [productionUrl, localUrl, vercelRegex],
  optionsSuccessStatus: 200
}));

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

// --- ROTAS DE PAGAMENTO ATUALIZADAS (PARADISE PAGS) ---

// ROTA PARA GERAR A COBRANÇA PIX COM O PARADISE PAGS
app.post('/gerar-pix-paradise', authenticateToken, async (req, res) => {
    const { name, email } = req.user;
    const { productHash, baseAmount, productTitle, checkoutUrl } = req.body;

    // Validação básica dos dados recebidos
    if (!productHash || !baseAmount || !productTitle || !checkoutUrl) {
        return res.status(400).json({ error: 'Dados insuficientes para gerar a cobrança.' });
    }

    const PARADISE_API_URL = 'https://multi.paradisepags.com/api/v1/transaction.php';
    const reference = 'CKO-' + new Date().getTime();

    const payload = {
        amount: baseAmount, // O valor deve ser em centavos
        description: productTitle,
        reference: reference,
        checkoutUrl: checkoutUrl,
        productHash: productHash,
        customer: {
            // ▼▼▼ AQUI ESTÁ A CORREÇÃO ESSENCIAL ▼▼▼
            name: name || email, // Se 'name' for nulo ou vazio, usa o 'email'.
            // ▲▲▲ FIM DA CORREÇÃO ▲▲▲
            email: email,
            // O código PHP gera dados falsos para documento e telefone, vamos replicar um comportamento simples
            document: '00000000000',
            phone: '00000000000'
        }
    };

    try {
        const response = await axios.post(PARADISE_API_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-API-Key': PARADISE_API_TOKEN
            }
        });

        const apiResponse = response.data;
        const transaction_data = apiResponse.transaction || apiResponse;

        if (response.status >= 200 && response.status < 300 && transaction_data.qr_code) {
             // A resposta da API já está no formato que o frontend espera
             const frontend_response = {
                hash: transaction_data.id || reference,
                pix: {
                    pix_qr_code: transaction_data.qr_code,
                    expiration_date: transaction_data.expires_at
                },
                amount_paid: baseAmount
            };
            res.json(frontend_response);
        } else {
            throw new Error(apiResponse.message || 'Resposta inválida da API do Paradise Pags.');
        }

    } catch (error) {
        console.error('Erro ao gerar PIX com o Paradise Pags:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Não foi possível gerar a cobrança PIX.' });
    }
});


// ROTA PARA O FRONTEND VERIFICAR O STATUS DO PAGAMENTO
app.get('/verificar-status-paradise/:hash', authenticateToken, async (req, res) => {
    const { hash } = req.params;
    const PARADISE_STATUS_URL = `https://multi.paradisepags.com/api/v1/check_status.php?hash=${hash}&_=${new Date().getTime()}`;

    try {
        const response = await axios.get(PARADISE_STATUS_URL, {
            headers: { 'X-API-Key': PARADISE_API_TOKEN }
        });

        if (response.data && response.data.payment_status) {
            res.json({ payment_status: response.data.payment_status });
        } else {
            res.status(404).json({ error: 'Status não encontrado.' });
        }
    } catch (error) {
        console.error('Erro ao verificar status do pagamento:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Erro ao consultar o gateway de pagamento.' });
    }
});


// --- ROTAS ANTIGAS (TRIBOPAY) - MANTIDAS PARA REFERÊNCIA ---

/*
app.post('/gerar-pix-tribopay', authenticateToken, async (req, res) => {
    // ... código antigo ...
});
*/

// ROTA DE WEBHOOK (ESSENCIAL)
app.post('/webhook-gateway', async (req, res) => {
    console.log('Webhook recebido:', req.body);
    const { customer_email, product_hash, event_type, source } = req.body; // 'source' pode ajudar a diferenciar

    if (event_type === 'purchase.approved') {
        try {
            const user = await prisma.user.findUnique({ where: { email: customer_email } });
            if (user) {
                console.log(`Atualizando acesso para ${customer_email}, produto ${product_hash}`);

                // Lógica de atualização de acesso baseada no product_hash
                switch (product_hash) {
                    // Planos
                    case 'dig1p': // Plano Premium
                        await prisma.user.update({ where: { email: customer_email }, data: { plan: 'premium' } });
                        break;
                    case 'tjxp0': // Plano Ultra
                        await prisma.user.update({ where: { email: customer_email }, data: { plan: 'ultra', hasLiveAccess: true, hasNinaAccess: true, hasWalletAccess: true } });
                        break;
                    // Compras Avulsas
                    // O HASH DO PRODUTO 'Chatbot Nina' do código PHP é 'prod_0d6f903b6855c714'
                    case 'prod_0d6f903b6855c714': // Bot Nina (Paradise Pags)
                    case 'wunqzncl9v': // Bot Nina (Tribopay)
                        await prisma.user.update({ where: { email: customer_email }, data: { hasNinaAccess: true } });
                        break;
                    case 'z1xp3f2ayg': // Live Dr José Nakamura
                        await prisma.user.update({ where: { email: customer_email }, data: { hasLiveAccess: true } });
                        break;
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


// --- ROTAS ORIGINAIS (Módulos, Aulas, Progresso, Login, etc.) ---
// O restante do seu código permanece aqui...

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


app.post('/auth/magic-link', async (req, res) => {
    const { email } = req.body;
    console.log('Recebido pedido para /auth/magic-link com o email:', email);
    try {
        const user = await prisma.user.upsert({
            where: { email },
            update: {},
            create: { email },
        });
        const magicLink = await prisma.magicLink.create({
            data: {
                userId: user.id,
                token: `${Date.now()}${Math.random()}`.replace(/\./g, ''),
                email: email,
                expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            },
        });

        const frontendUrl = process.env.NODE_ENV === 'production'
            ? process.env.FRONTEND_URL
            : 'http://localhost:3000';
        const url = `${frontendUrl}/auth/callback?token=${magicLink.token}`;

        console.log(`\n✨ LINK MÁGICO (PARA TESTES):\n${url}\n`);
        res.status(200).json({ message: 'Link mágico gerado e pronto para envio.' });
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


app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});