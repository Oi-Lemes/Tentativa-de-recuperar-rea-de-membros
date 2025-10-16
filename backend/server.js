const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { exec } = require('child_process');
const crypto = require('crypto');
const path = require('path');
const multer = require('multer'); // Adicionado para upload de arquivos
const OpenAI = require('openai');

const prisma = new PrismaClient();
const app = express();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Adicionado: Linha para servir arquivos estáticos da pasta 'uploads'
// Isso é essencial para que as fotos possam ser vistas no frontend
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465,
  secure: true,
  auth: {
    user: "contato@terapeutacelebrante.com.br",
    pass: "Empreender@2024",
  },
});

// Adicionado: Configuração do Multer para o upload da foto da carteirinha
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Garante que os arquivos sejam salvos na pasta 'uploads'
  },
  filename: function (req, file, cb) {
    // Cria um nome de arquivo único para evitar conflitos
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage: storage });


// SUAS ROTAS EXISTENTES (NÃO FORAM MODIFICADAS)
app.post('/auth/magic-link', async (req, res) => {
  const { email, name } = req.body;
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

  try {
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user && name) {
      user = await prisma.user.create({ data: { email, name } });
    } else if (!user && !name) {
      return res.status(400).send('Usuário não encontrado. Por favor, forneça um nome para se cadastrar.');
    }

    await prisma.magicLink.create({
      data: { email, token, expiresAt },
    });

    const magicLink = `${process.env.NEXT_PUBLIC_URL}/auth/callback?token=${token}`;
    await transporter.sendMail({
      from: '"Terapeuta Celebrante" <contato@terapeutacelebrante.com.br>',
      to: email,
      subject: 'Seu Link de Acesso Mágico',
      html: `<p>Olá ${user.name},</p><p>Clique no link a seguir para fazer login:</p><a href="${magicLink}">Acessar Plataforma</a>`,
    });

    res.status(200).send('Link de acesso enviado para seu e-mail.');
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao processar solicitação.');
  }
});

app.get('/auth/callback', async (req, res) => {
  const { token } = req.query;
  try {
    const link = await prisma.magicLink.findUnique({
      where: { token, expiresAt: { gt: new Date() } },
    });

    if (link) {
      const user = await prisma.user.findUnique({ where: { email: link.email } });
      await prisma.magicLink.delete({ where: { token } });
      res.json({ user });
    } else {
      res.status(400).send('Link inválido ou expirado.');
    }
  } catch (error) {
    res.status(500).send('Erro de servidor.');
  }
});

app.get('/user-progress', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        const progress = await prisma.progress.findMany({
            where: { userId: String(userId) },
            select: { lessonId: true }
        });
        res.json(progress.map(p => p.lessonId));
    } catch (error) {
        console.error('Failed to fetch user progress:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/modules', async (req, res) => {
    try {
        const modules = await prisma.module.findMany({
            include: {
                lessons: true,
            },
        });
        res.json(modules);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch modules' });
    }
});

app.get('/lessons/:lessonId', async (req, res) => {
    const { lessonId } = req.params;
    try {
        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            include: { module: true },
        });
        if (lesson) {
            res.json(lesson);
        } else {
            res.status(404).json({ error: 'Lesson not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch lesson' });
    }
});

app.post('/webhooks/process', async (req, res) => {
    const { event, data } = req.body;

    switch (event) {
        case 'purchase.approved':
            await prisma.user.upsert({
                where: { email: data.customer.email },
                update: { name: data.customer.name },
                create: { email: data.customer.email, name: data.customer.name },
            });
            break;
        case 'purchase.refunded':
            await prisma.user.delete({
                where: { email: data.customer.email },
            });
            break;
    }

    res.status(200).send('Webhook processed');
});

app.post('/generate-certificate', (req, res) => {
    const { name } = req.body;
    const command = `python gerador_certificado/script.py "${name}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).send('Failed to generate certificate');
        }
        res.download('Certificado.pdf');
    });
});

app.post('/api/chat/proxy', async (req, res) => {
  try {
    const { messages } = req.body;
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-2024-04-09",
      messages,
    });
    res.json(response.choices[0].message);
  } catch (error) {
    console.error('Error proxying chat to OpenAI:', error);
    res.status(500).json({ error: 'Failed to get response from AI' });
  }
});


// ---> INÍCIO DA NOVA ROTA PARA CARTEIRINHA <---
app.post('/api/request-abrath-card', upload.single('photo'), async (req, res) => {
  const { userId, address, shippingMethod } = req.body;

  // Verifica se o arquivo foi enviado
  if (!req.file) {
    return res.status(400).json({ error: 'A foto é obrigatória.' });
  }

  // Gera a URL completa para acessar a foto
  const photoUrl = `${process.env.NEXT_PUBLIC_URL_BACKEND}/uploads/${req.file.filename}`;

  if (!userId || !address || !shippingMethod) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  try {
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const newRequest = await prisma.abrathCardRequest.create({
      data: {
        userId,
        address,
        shippingMethod,
        photoUrl,
      },
    });
    console.log('Solicitação de carteirinha recebida:', newRequest);
    res.status(201).json(newRequest);
  } catch (error) {
    console.error('Erro ao processar solicitação de carteirinha:', error);
    res.status(500).json({ error: 'Não foi possível processar a sua solicitação.' });
  }
});
// ---> FIM DA NOVA ROTA PARA CARTEIRINHA <---


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});