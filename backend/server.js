import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import jwt from 'jsonwebtoken';
// --- MUDANÇA 1: Importamos 'execFile' em vez de 'exec' ---
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// --- MUDANÇA 2: Criamos um execFileAsync ---
const execFileAsync = promisify(execFile);

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

// ... (todas as outras rotas /modulos, /progresso, etc. continuam iguais) ...

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


// --- MUDANÇA 3: Rota /gerar-certificado agora usa execFileAsync ---
app.post('/gerar-certificado', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.name) {
        return res.status(404).json({ error: 'Usuário não encontrado ou sem nome.' });
      }

      const student_name = user.name;
      const course_name = "Formação Herbalista Pro";
      const completion_date = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

      const scriptPath = path.join(__dirname, 'gerador_certificado', 'script.py');
      
      const dados_imagem = { 
        background_image_url: `file:///${path.join(__dirname, 'gerador_certificado', 'img', 'ervas.webp').replace(/\\/g, '/')}` 
      };
      
      // Corrigindo o bug do Windows: removemos o padding que o shell "come"
      const dadosBase64 = Buffer.from(JSON.stringify(dados_imagem))
                                .toString('base64')
                                .replace(/=/g, ''); // <-- O Python (linha 40) vai adicionar de volta

      
      // Criamos o array de argumentos que será passado diretamente ao Python
      // Isso impede que "Aluno Teste" seja quebrado em dois.
      const args = [
        scriptPath,
        student_name,
        course_name,
        completion_date,
        dadosBase64 // O 4º argumento que o script espera em sys.argv[4]
      ];

      // Chamamos o execFileAsync, que não usa o shell para *interpretar* os argumentos
      await execFileAsync('python', args);

      // O resto do código permanece o mesmo
      const safeStudentName = student_name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const certificadoPath = path.join(__dirname, 'gerador_certificado', 'certificados', `${safeStudentName}.pdf`);
      
      res.sendFile(certificadoPath);

    } catch (error) {
      console.error('Erro ao gerar certificado:', error);
      res.status(500).send('Erro ao gerar o certificado.');
    }
});


app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});