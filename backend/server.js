import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execFileAsync = promisify(execFile);


const prisma = new PrismaClient();
const app = express();
const PORT = 3001;
const JWT_SECRET = 'seu-segredo-super-secreto';

app.use(express.json());
// --- ESTA É A LINHA CORRIGIDA ---
app.use(cors({ origin: 'http://localhost:3000' }));
// --- FIM DA CORREÇÃO ---

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
      // Se já existe, o usuário está desmarcando a aula. Então, deletamos o registro.
      await prisma.progresso.delete({
        where: {
          userId_aulaId: {
            userId: userId,
            aulaId: aulaId,
          },
        },
      });
      // Retornamos uma mensagem para o frontend saber que a operação foi de desmarcar
      res.json({ status: 'desmarcada' });
    } else {
      // Se não existe, o usuário está marcando a aula. Então, criamos o registro.
      const novoProgresso = await prisma.progresso.create({
        data: {
          userId: userId,
          aulaId: aulaId,
          concluida: true,
        },
      });
      // Retornamos o novo progresso para o frontend saber que a operação foi de marcar
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

app.post('/auth/magic-link', async (req, res) => {
  const { email, name } = req.body;
  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name },
    });
    const magicLink = await prisma.magicLink.create({
      data: {
        userId: user.id,
        token: `${Math.random()}`, 
        email: email,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), 
      },
    });

    const frontendUrl = 'http://localhost:3000'; 
    console.log(
      `\n✨ LINK MÁGICO (clique ou copie no navegador):\n${frontendUrl}/auth/callback?token=${magicLink.token}\n`
    );

    res.status(200).json({ message: 'Link mágico enviado' });
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
    if (!magicLink) {
      return res.status(404).json({ error: 'Link mágico não encontrado ou inválido' });
    }
    if (new Date() > new Date(magicLink.expiresAt)) {
      await prisma.magicLink.delete({ where: { token } });
      return res.status(400).json({ error: 'Link mágico expirado' });
    }
    const userToken = jwt.sign(
      { id: magicLink.userId, email: magicLink.user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
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

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// Adicione esta importação no topo do seu server.js
import axios from 'axios';

// ROTA PARA GERAR A COBRANÇA PIX COM A TRIBOPAY
app.post('/gerar-pix-tribopay', authenticateToken, async (req, res) => {
  const { offerHash } = req.body; // Recebe o Hash da Oferta do frontend
  const { name, email } = req.user; // Obtemos os dados do utilizador autenticado

  // A URL da API da Tribopay
  const TRIBOPAY_API_URL = 'https://api.tribopay.com.br/v1/charge/pix/create';

  const payload = {
    token: process.env.TRIBOPAY_API_TOKEN,
    offer_hash: offerHash,
    customer: {
      name: name,
      email: email,
      // Outros dados do cliente podem ser necessários, consulte a documentação da Tribopay
    }
  };

  try {
    console.log('Enviando requisição para a Tribopay com o payload:', payload);
    const response = await axios.post(TRIBOPAY_API_URL, payload);

    // A API da Tribopay deve devolver os dados do PIX
    const pixData = response.data;

    if (pixData && pixData.qr_code && pixData.qr_code_text) {
      res.json({
        qrCodeBase64: pixData.qr_code,      // QR Code em formato de imagem base64
        qrCode: pixData.qr_code_text, // O código "Copia e Cola"
      });
    } else {
      throw new Error('A resposta da API da Tribopay não continha os dados do PIX esperados.');
    }

  } catch (error) {
    console.error('Erro ao gerar PIX com a Tribopay:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Não foi possível gerar a cobrança PIX.' });
  }
});