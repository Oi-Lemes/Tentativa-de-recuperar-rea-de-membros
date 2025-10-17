import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

const prisma = new PrismaClient();
const app = express();
const PORT = 3001;
const JWT_SECRET = 'seu-segredo-super-secreto';

app.use(express.json());
app.use(cors());

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
    const progresso = await prisma.progresso.upsert({
      where: {
        userId_aulaId: {
          userId: userId,
          aulaId: aulaId,
        },
      },
      update: { concluida: true },
      create: {
        userId: userId,
        aulaId: aulaId,
        concluida: true,
      },
    });
    res.json(progresso);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao marcar aula como concluída' });
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

// --- ROTA ADICIONADA (O "X" DA QUESTÃO) ---
// Esta rota calcula a porcentagem de conclusão de CADA módulo
app.get('/progresso-modulos', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    // 1. Pega todos os módulos e as aulas de cada um
    const modulos = await prisma.modulo.findMany({
      include: { aulas: { select: { id: true } } },
    });
    
    // 2. Pega todas as aulas que o usuário já concluiu
    const progressoAulas = await prisma.progresso.findMany({ // Corrigido de ProgressoAula
      where: { userId: userId, concluida: true },
      select: { aulaId: true },
    });
    
    // 3. Cria um conjunto (Set) para busca rápida
    const aulasConcluidasIds = new Set(progressoAulas.map(p => p.aulaId));
    
    // 4. Calcula a porcentagem para cada módulo
    const progressoModulos = {};
    modulos.forEach(modulo => {
      // Se o módulo não tem aulas (Ex: Certificado), considera 100%
      if (modulo.aulas.length === 0) {
        progressoModulos[modulo.id] = 100;
        return;
      }
      // Conta quantas aulas do módulo estão no conjunto de aulas concluídas
      const aulasConcluidasNoModulo = modulo.aulas.filter(aula => aulasConcluidasIds.has(aula.id)).length;
      // Calcula a porcentagem
      progressoModulos[modulo.id] = (aulasConcluidasNoModulo / modulo.aulas.length) * 100;
    });
    
    // 5. Retorna o objeto (Ex: { "1": 0, "2": 0, "3": 0 })
    res.json(progressoModulos);
  } catch (error) {
    console.error('Erro ao buscar progresso dos módulos:', error);
    res.status(500).json({ error: 'Erro ao buscar progresso dos módulos' });
  }
});
// --- FIM DA ROTA ADICIONADA ---


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
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }
      const scriptPath = path.join(__dirname, 'gerador_certificado', 'script.py');
      const command = `python ${scriptPath} "${user.name}"`;
      await execAsync(command);
      const certificadoPath = path.join(__dirname, 'gerador_certificado', 'certificados', `${user.name}.pdf`);
      res.sendFile(certificadoPath);
    } catch (error) {
      console.error('Erro ao gerar certificado:', error);
      res.status(500).send('Erro ao gerar o certificado.');
    }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});