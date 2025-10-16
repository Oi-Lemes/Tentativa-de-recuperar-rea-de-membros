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
const JWT_SECRET = 'seu-segredo-super-secreto'; // Troque por uma chave segura em produção

app.use(express.json());
app.use(cors());

// Middleware para verificar o token JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401); // Se não há token, não autorizado

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Se o token não for válido, proibido
    req.user = user;
    next();
  });
};


// Rota para obter todos os módulos e suas aulas
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


// Rota para obter uma aula específica
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


// Rota para marcar aula como concluída
app.post('/aulas/concluir', authenticateToken, async (req, res) => {
  const { aulaId } = req.body;
  const userId = req.user.id; // O ID do usuário vem do token JWT verificado

  try {
    // Usando upsert para criar ou atualizar o progresso
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

// Rota para buscar o progresso do usuário
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


// Rota para solicitar o link mágico
app.post('/auth/magic-link', async (req, res) => {
  const { email, name } = req.body;
  try {
    // Encontra ou cria um usuário com o e-mail fornecido
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name }, // 'name' é necessário para a criação
    });

    // Cria um token de link mágico para o usuário
    const magicLink = await prisma.magicLink.create({
      data: {
        userId: user.id,
        token: `${Math.random()}`, // Em um app real, use um token mais seguro
        email: email, // <-- CORREÇÃO 1: Adicionada esta linha
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // <-- CORREÇÃO 2: Adicionada esta linha (expira em 15 minutos)
      },
    });

    // Adicionado para depuração no terminal
    console.log('TOKEN GERADO:', magicLink.token);

    // Em um app real, você enviaria este link por e-mail
    // Aqui, apenas logamos no console para fins de desenvolvimento
    console.log(`Link mágico para ${email}: http://localhost:3000/auth/callback?token=${magicLink.token}`);

    res.status(200).json({ message: 'Link mágico enviado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao processar solicitação de link mágico' });
  }
});

// Rota para verificar o token do link mágico e fazer login
app.post('/auth/verify', async (req, res) => {
  const { token } = req.body;
  try {
    // Busca o link mágico pelo token
    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
      include: { user: true }, // Inclui os dados do usuário relacionado
    });

    // Se o link não existir, retorna erro
    if (!magicLink) {
      return res.status(404).json({ error: 'Link mágico não encontrado ou inválido' });
    }
    
    // Agora verificamos usando o campo expiresAt do banco de dados
    if (new Date() > new Date(magicLink.expiresAt)) {
        await prisma.magicLink.delete({ where: { token } }); // Apaga o token expirado
        return res.status(400).json({ error: 'Link mágico expirado' });
    }

    // Se o link for válido, gera um token JWT para a sessão do usuário
    const userToken = jwt.sign(
      { id: magicLink.userId, email: magicLink.user.email },
      JWT_SECRET,
      { expiresIn: '7d' } // Token expira em 7 dias
    );

    // Por segurança, deleta o link mágico após o uso
    await prisma.magicLink.delete({
      where: { token },
    });

    // Retorna o token JWT e o nome do usuário para o cliente
    res.json({ token: userToken, userName: magicLink.user.name, userId: magicLink.user.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao verificar o link mágico' });
  }
});


// Rota para gerar certificado
app.post('/gerar-certificado', authenticateToken, async (req, res) => {
    const userId = req.user.id;
  
    try {
      // Busca o usuário no banco de dados
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }
  
      // Caminho para o script Python
      const scriptPath = path.join(__dirname, 'gerador_certificado', 'script.py');
      // Comando para executar o script com o nome do usuário como argumento
      const command = `python ${scriptPath} "${user.name}"`;
  
      // Executa o script
      await execAsync(command);
  
      // Caminho para o certificado gerado
      const certificadoPath = path.join(__dirname, 'gerador_certificado', 'certificados', `${user.name}.pdf`);
      // Envia o arquivo PDF como resposta
      res.sendFile(certificadoPath);
  
    } catch (error) {
      console.error('Erro ao gerar certificado:', error);
      res.status(500).send('Erro ao gerar o certificado.');
    }
});


app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});