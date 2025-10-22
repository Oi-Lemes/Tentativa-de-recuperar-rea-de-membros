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

// Chave da API Paradise Pags (pega da variável de ambiente ou usa o valor padrão)
const PARADISE_API_TOKEN = process.env.PARADISE_API_TOKEN || 'sk_5801a6ec5051bf1cf144155ddada51120b2d1dda4d03cb2df454fb4eab9a78a9';

app.use(express.json());

// Configuração do CORS
const productionUrl = 'https://www.saberesdafloresta.site';
const localUrl = 'http://localhost:3000';
const vercelRegex = /https:\/\/tentativa-de-recuperar-rea-de-membros.*\.vercel\.app$/;

app.use(cors({
  origin: [productionUrl, localUrl, vercelRegex],
  optionsSuccessStatus: 200
}));

// Middleware de Autenticação
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401); // Se não há token, não autorizado

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Se o token é inválido/expirado, proibido
        req.user = user; // Adiciona os dados do usuário decodificados à requisição
        next(); // Passa para a próxima rota/middleware
    });
};

// --- ROTAS DE PAGAMENTO (PARADISE PAGS) ---

// ROTA PARA GERAR A COBRANÇA PIX
app.post('/gerar-pix-paradise', authenticateToken, async (req, res) => {
    const { name, email } = req.user; // Obtém nome e email do token JWT
    const { productHash, baseAmount, productTitle, checkoutUrl } = req.body; // Obtém dados do produto do corpo da requisição

    // Validação básica dos dados recebidos
    if (!productHash || !baseAmount || !productTitle || !checkoutUrl) {
        return res.status(400).json({ error: 'Dados insuficientes para gerar a cobrança.' });
    }

    const PARADISE_API_URL = 'https://multi.paradisepags.com/api/v1/transaction.php';
    const reference = 'CKO-' + Date.now(); // Referência única simples

    // Payload para a API Paradise Pags
   // Dentro da rota /gerar-pix-paradise no backend/server.js

    // ... (código anterior da rota: validações, PARADISE_API_URL, reference) ...

    // Payload para a API Paradise Pags (COM AJUSTE)
    const payload = {
        amount: baseAmount,
        description: productTitle,
        reference: reference,
        checkoutUrl: checkoutUrl,
        productHash: productHash,
        customer: {
            name: name || email,
            email: email,
            // ▼▼▼ AJUSTE AQUI ▼▼▼
            // Enviando strings com 11 dígitos, que se assemelham mais a CPF/Telefone
            // (Ainda são dados fictícios, mas podem passar na validação de padrão)
            document: '11111111111', // CPF fictício (11 dígitos)
            phone:    '11911111111'  // Telefone fictício (DDD + 9 + 8 dígitos)
            // ▲▲▲ FIM DO AJUSTE ▲▲▲
        }
    };

    console.log('--- Payload enviado para Paradise Pags ---');
    console.log(JSON.stringify(payload, null, 2));
    console.log('--- Fim do Payload ---');

    try {
      // ... (resto do try...catch para chamar axios.post) ...
        // Faz a chamada POST para a API do Paradise Pags
        const response = await axios.post(PARADISE_API_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-API-Key': PARADISE_API_TOKEN // Chave secreta da API
            }
        });

        const apiResponse = response.data;
        // A resposta pode vir aninhada em 'transaction' ou não
        const transaction_data = apiResponse.transaction || apiResponse;

        // Verifica se a resposta foi bem-sucedida e contém o QR code
        if (response.status >= 200 && response.status < 300 && transaction_data.qr_code) {
             // Formata a resposta para o formato esperado pelo frontend
             const frontend_response = {
                hash: transaction_data.id || reference, // ID da transação ou referência
                pix: {
                    pix_qr_code: transaction_data.qr_code, // Código PIX (Copia e Cola)
                    expiration_date: transaction_data.expires_at // Data de expiração
                },
                amount_paid: baseAmount // Valor pago (para exibição no modal)
            };
            res.json(frontend_response); // Envia os dados do PIX para o frontend
        } else {
            // Se a API retornou um erro
            console.error('Erro da API Paradise Pags ao gerar PIX:', apiResponse);
            res.status(response.status || 500).json({ error: apiResponse.message || 'Resposta inválida da API do Paradise Pags.' });
        }

    } catch (error) {
        // Se ocorreu um erro na comunicação com a API (rede, etc.)
        console.error('Erro interno ao gerar PIX com o Paradise Pags:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Não foi possível gerar a cobrança PIX devido a um erro interno.' });
    }
});


// ROTA PARA O FRONTEND VERIFICAR O STATUS DO PAGAMENTO PERIODICAMENTE
app.get('/verificar-status-paradise/:hash', authenticateToken, async (req, res) => {
    const { hash } = req.params; // Hash da transação vindo da URL
    // URL da API de verificação de status, com timestamp para evitar cache
    const PARADISE_STATUS_URL = `https://multi.paradisepags.com/api/v1/check_status.php?hash=${hash}&_=${Date.now()}`;

    try {
        // Faz a chamada GET para a API de status
        const response = await axios.get(PARADISE_STATUS_URL, {
            headers: { 'X-API-Key': PARADISE_API_TOKEN } // Chave secreta da API
        });

        // Verifica se a resposta contém o status do pagamento
        if (response.data && response.data.payment_status) {
            res.json({ payment_status: response.data.payment_status }); // Retorna 'paid', 'pending', etc.
        } else {
            // Se o hash não foi encontrado ou a resposta é inválida
            res.status(404).json({ error: 'Status do pagamento não encontrado para este hash.' });
        }
    } catch (error) {
        // Se ocorreu um erro na comunicação com a API
        console.error('Erro ao verificar status do pagamento Paradise:', error.response ? error.response.data : error.message);
        res.status(error.response?.status || 500).json({ error: 'Erro ao consultar o status no gateway de pagamento.' });
    }
});


// ROTA DE WEBHOOK (PARA RECEBER CONFIRMAÇÕES DE PAGAMENTO DO GATEWAY)
app.post('/webhook-gateway', async (req, res) => {
    console.log('Webhook recebido:', req.body); // Log para depuração
    // Extrai dados relevantes do corpo do webhook (ajuste os nomes se necessário)
    const { customer_email, product_hash, event_type } = req.body;

    // Processa apenas eventos de compra aprovada
    if (event_type === 'purchase.approved') {
        try {
            // Encontra o usuário no banco de dados pelo email
            const user = await prisma.user.findUnique({ where: { email: customer_email } });
            if (user) {
                console.log(`Atualizando acesso para ${customer_email}, produto ${product_hash}`);

               // Dentro da rota /webhook-gateway no backend/server.js

// ... (código anterior do webhook) ...

                switch (product_hash) {
                    // Planos (Verificar se ainda são válidos)
                    case 'dig1p': // Premium (Antigo)
                        await prisma.user.update({ where: { email: customer_email }, data: { plan: 'premium' } });
                        break;
                    case 'tjxp0': // Ultra (Antigo)
                        await prisma.user.update({ where: { email: customer_email }, data: { plan: 'ultra', hasLiveAccess: true, hasNinaAccess: true, hasWalletAccess: true } });
                        break;
                    // Compras Avulsas
                    case 'prod_0d6f903b6855c714': // Nina (Paradise)
                    case 'wunqzncl9v': // Nina (Antigo)
                        await prisma.user.update({ where: { email: customer_email }, data: { hasNinaAccess: true } });
                        break;
                    case 'prod_cb02db3516be7ede': // Live (Paradise)
                    case 'z1xp3f2ayg': // Live (Antigo)
                        await prisma.user.update({ where: { email: customer_email }, data: { hasLiveAccess: true } });
                        break;
                    // Certificado, Carteira e Fretes
                    case 'prod_0bc162e2175f527f': // Certificado (Paradise)
                    case 'wyghke8sf1': // Certificado (Antigo)
                    case 'prod_375f8ceb7a4cffcc': // Carteira ABRATH (Paradise)
                    case 'ta6jxnhmo2': // Carteira ABRATH (Antigo)
                    // ▼▼▼ ADICIONADO/ATUALIZADO AQUI ▼▼▼
                    case 'prod_3aeba29f077583c1': // Frete Express E PAC (Paradise - CONFIRMAR PAC)
                    case 'ogtsy3fs0o': // Frete PAC (Antigo)
                    case 'hg4kajthaw': // Frete Express (Antigo)
                    // ▲▲▲ FIM DA ATUALIZAÇÃO ▲▲▲
                        // Todos estes dão o mesmo acesso 'hasWalletAccess'
                        await prisma.user.update({ where: { email: customer_email }, data: { hasWalletAccess: true } });
                        break;
                    default:
                        console.warn(`Webhook: Hash de produto não reconhecido: ${product_hash} para ${customer_email}`);
                }

// ... (resto do código do webhook) ...

// ... (resto do código do webhook) ...
            } else {
                 console.warn(`Webhook: Usuário com email ${customer_email} não encontrado no banco de dados.`);
            }
        } catch (error) {
            console.error('Erro ao processar o webhook:', error);
            // Retorna erro 500 para o gateway, indicando falha no processamento
            return res.status(500).send('Erro interno ao processar webhook.');
        }
    } else {
        console.log(`Webhook: Evento ignorado: ${event_type}`);
    }
    // Responde ao gateway que o webhook foi recebido (mesmo que o evento seja ignorado)
    res.status(200).send('Webhook recebido.');
});


// --- ROTAS ORIGINAIS (Módulos, Aulas, Progresso, Login, Auth, Certificado) ---

// Busca todos os módulos com suas aulas
app.get('/modulos', authenticateToken, async (req, res) => {
    try {
        const modulos = await prisma.modulo.findMany({
            include: {
                aulas: { orderBy: { ordem: 'asc' } }, // Inclui aulas ordenadas
            },
            orderBy: { ordem: 'asc' }, // Ordena os módulos
        });
        res.json(modulos);
    } catch (error) {
        console.error("Erro ao buscar módulos:", error);
        res.status(500).json({ error: 'Erro ao buscar módulos' });
    }
});

// Busca um módulo específico pelo ID com suas aulas
app.get('/modulos/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const modulo = await prisma.modulo.findUnique({
            where: { id: parseInt(id) },
            include: {
                aulas: { orderBy: { ordem: 'asc' } }, // Inclui aulas ordenadas
            },
        });
        if (modulo) {
            res.json(modulo);
        } else {
            res.status(404).json({ error: 'Módulo não encontrado' });
        }
    } catch (error) {
        console.error("Erro ao buscar módulo:", error);
        res.status(500).json({ error: 'Erro ao buscar módulo' });
    }
});

// Busca uma aula específica pelo ID
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
        console.error("Erro ao buscar aula:", error);
        res.status(500).json({ error: 'Erro ao buscar aula' });
    }
});

// Marca ou desmarca uma aula como concluída
app.post('/aulas/concluir', authenticateToken, async (req, res) => {
    const { aulaId } = req.body;
    const userId = req.user.id;
    try {
        // Verifica se já existe um registro de progresso para esta aula e usuário
        const progressoExistente = await prisma.progresso.findUnique({
            where: { userId_aulaId: { userId, aulaId } },
        });
        if (progressoExistente) {
            // Se existe, remove (desmarca)
            await prisma.progresso.delete({
                where: { userId_aulaId: { userId, aulaId } },
            });
            res.json({ status: 'desmarcada' });
        } else {
            // Se não existe, cria (marca)
            const novoProgresso = await prisma.progresso.create({
                data: { userId, aulaId, concluida: true },
            });
            res.json({ status: 'marcada', progresso: novoProgresso });
        }
    } catch (error) {
        console.error("Erro ao alternar progresso da aula:", error);
        res.status(500).json({ error: 'Erro ao marcar/desmarcar aula' });
    }
});

// Busca os IDs de todas as aulas concluídas pelo usuário
app.get('/progresso', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const progresso = await prisma.progresso.findMany({
            where: { userId, concluida: true },
            select: { aulaId: true }, // Seleciona apenas o ID da aula
        });
        res.json(progresso.map((p) => p.aulaId)); // Retorna um array de IDs
    } catch (error) {
        console.error("Erro ao buscar progresso:", error);
        res.status(500).json({ error: 'Erro ao buscar progresso' });
    }
});

// Calcula e retorna a porcentagem de progresso para cada módulo
app.get('/progresso-modulos', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        // Busca todos os módulos e os IDs de suas aulas
        const modulos = await prisma.modulo.findMany({
            include: { aulas: { select: { id: true } } },
        });
        // Busca os IDs de todas as aulas concluídas pelo usuário
        const progressoAulas = await prisma.progresso.findMany({
            where: { userId, concluida: true },
            select: { aulaId: true },
        });
        const aulasConcluidasIds = new Set(progressoAulas.map(p => p.aulaId));

        const progressoModulos = {};
        modulos.forEach(modulo => {
            if (modulo.aulas.length === 0) {
                // Módulo sem aulas é considerado 100% concluído
                progressoModulos[modulo.id] = 100;
                return;
            }
            // Conta quantas aulas do módulo estão no conjunto de aulas concluídas
            const aulasConcluidasNoModulo = modulo.aulas.filter(aula => aulasConcluidasIds.has(aula.id)).length;
            // Calcula a porcentagem
            progressoModulos[modulo.id] = Math.round((aulasConcluidasNoModulo / modulo.aulas.length) * 100);
        });
        res.json(progressoModulos);
    } catch (error) {
        console.error('Erro ao buscar progresso dos módulos:', error);
        res.status(500).json({ error: 'Erro ao buscar progresso dos módulos' });
    }
});

// Rota de Login com Email e Senha
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        // Verifica se o usuário existe, tem senha e se a senha está correta
        if (user && user.password && await bcrypt.compare(password, user.password)) {
            // Gera um token JWT com ID, email e nome do usuário
            const accessToken = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '1d' }); // Expira em 1 dia
            res.json({ accessToken, userName: user.name }); // Retorna o token e o nome do usuário
        } else {
            res.status(401).send('Email ou senha incorretos'); // Não autorizado
        }
    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).send('Erro interno no servidor');
    }
});

// Rota para gerar um Link Mágico para login sem senha
app.post('/auth/magic-link', async (req, res) => {
    const { email } = req.body;
    console.log('Recebido pedido para /auth/magic-link com o email:', email);
    try {
        // Cria ou encontra o usuário pelo email
        const user = await prisma.user.upsert({
            where: { email },
            update: {},
            // Se o usuário não existir, cria com email e um nome padrão (parte antes do @)
            create: { email, name: email.split('@')[0] },
        });
        // Gera um token único e com tempo de expiração para o link mágico
        const magicLink = await prisma.magicLink.create({
            data: {
                userId: user.id,
                token: `${Date.now()}${Math.random()}`.replace(/\./g, ''), // Token simples
                email: email,
                expiresAt: new Date(Date.now() + 15 * 60 * 1000), // Expira em 15 minutos
            },
        });

        // Monta a URL do frontend para onde o link mágico deve redirecionar
        const frontendUrl = process.env.NODE_ENV === 'production'
            ? process.env.FRONTEND_URL // Usa a URL de produção definida nas variáveis de ambiente
            : 'http://localhost:3000'; // Ou localhost para desenvolvimento
        const url = `${frontendUrl}/auth/callback?token=${magicLink.token}`;

        // Loga o link no console (para testes) - AQUI DEVE ENTRAR A LÓGICA DE ENVIO DE EMAIL REAL
        console.log(`\n✨ LINK MÁGICO (PARA TESTES):\n${url}\n`);

        // Idealmente, aqui você enviaria um email para o usuário com a 'url'

        res.status(200).json({ message: 'Link mágico gerado. Verifique seu email.' });
    } catch (error) {
        console.error("Erro ao processar magic link:", error);
        res.status(500).json({ error: 'Erro ao processar solicitação de link mágico' });
    }
});

// Rota para verificar o token do Link Mágico
app.post('/auth/verify', async (req, res) => {
    const { token } = req.body;
    try {
        // Busca o link mágico no banco de dados, incluindo os dados do usuário associado
        const magicLink = await prisma.magicLink.findUnique({
            where: { token },
            include: { user: true },
        });
        // Verifica se o link existe e não expirou
        if (!magicLink || new Date() > new Date(magicLink.expiresAt)) {
            // Se expirou ou não existe, apaga do banco (se existir) e retorna erro
            if (magicLink) await prisma.magicLink.delete({ where: { token } });
            return res.status(400).json({ error: 'Link mágico inválido ou expirado' });
        }
        // Gera um token JWT de longa duração para o usuário
        const userToken = jwt.sign({ id: magicLink.userId, email: magicLink.user.email, name: magicLink.user.name }, JWT_SECRET, { expiresIn: '7d' }); // Expira em 7 dias
        // Apaga o link mágico do banco após o uso
        await prisma.magicLink.delete({ where: { token } });
        // Retorna o token JWT, nome e ID do usuário para o frontend
        res.json({ token: userToken, userName: magicLink.user.name, userId: magicLink.user.id });
    } catch (error) {
        console.error("Erro ao verificar magic link:", error);
        res.status(500).json({ error: 'Erro ao verificar o link mágico' });
    }
});

// Rota para gerar o certificado em PDF (usando um script Python)
app.post('/gerar-certificado', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    // O nome seguro (sem caracteres especiais) vem do frontend
    const { safeStudentName } = req.body;
    if (!safeStudentName) {
         return res.status(400).json({ error: 'Nome do aluno é necessário.' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
        // Define os caminhos para o script Python e onde salvar o PDF
        const certificadoDir = path.join(__dirname, 'gerador_certificado', 'certificados');
        const certificadoPath = path.join(certificadoDir, `${safeStudentName}.pdf`);
        const scriptPath = path.join(__dirname, 'gerador_certificado', 'script.py');
        const imgPath = `file:///${path.join(__dirname, 'gerador_certificado', 'img', 'ervas.webp').replace(/\\/g, '/')}`; // Caminho da imagem de fundo

        // Argumentos para passar ao script Python
        const args = [
            scriptPath,
            user.name || 'Nome Indefinido', // Nome do aluno (ou fallback)
            'Formação Herbalista Pro',      // Nome do curso
            new Date().toLocaleDateString('pt-BR'), // Data de emissão
            imgPath,                        // Caminho da imagem de fundo
            certificadoPath                 // Caminho onde salvar o PDF
        ];

        // Executa o script Python
        console.log('Executando script Python:', args);
        await execFileAsync('python', args);
        console.log('Script Python concluído. Enviando arquivo:', certificadoPath);

        // Envia o arquivo PDF gerado como resposta
        res.sendFile(certificadoPath, (err) => {
            if (err) {
                console.error("Erro ao enviar arquivo de certificado:", err);
                // Não envia status 500 aqui se headers já foram enviados
                // Apenas loga o erro.
            } else {
                 console.log("Certificado enviado com sucesso.");
                 // Opcional: remover o arquivo após o envio?
                 // fs.unlink(certificadoPath, (unlinkErr) => { ... });
            }
        });

    } catch (error) {
        console.error('Erro ao gerar certificado:', error);
        // Só envia status 500 se nenhum arquivo começou a ser enviado
        if (!res.headersSent) {
            res.status(500).send('Erro ao gerar o certificado.');
        }
    }
});

// Rota para buscar os dados básicos do usuário logado
app.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            // Seleciona apenas os campos necessários para o frontend
            select: { id: true, email: true, name: true, plan: true, hasLiveAccess: true, hasNinaAccess: true, hasWalletAccess: true }
        });
        if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' });
        res.json(user);
    } catch (error) {
        console.error("Erro ao buscar dados do usuário (/me):", error);
        res.status(500).json({ error: 'Erro ao buscar dados do utilizador.' });
    }
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});