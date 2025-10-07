require('dotenv').config();

// 1. Importações
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

// Criamos uma função principal 'async' para poder usar try/catch na inicialização
async function main() {
  try {
    // 2. Inicializações
    const app = express();
    app.use(cors());
    app.use(express.json());
    const prisma = new PrismaClient();
    const PORT = 3001;

    // --- ROTAS ---
    app.post('/usuarios', async (req, res) => {
      try {
        const { email, senha } = req.body;
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);
        const novoUsuario = await prisma.user.create({
          data: { email: email, senha: senhaHash },
        });
        const usuarioSemSenha = { ...novoUsuario };
        delete usuarioSemSenha.senha;
        res.status(201).json(usuarioSemSenha);
      } catch (error) {
        console.error("Erro ao criar usuário:", error);
        res.status(400).json({ message: "Não foi possível criar o usuário. O e-mail já pode existir." });
      }
    });

    app.post('/login', async (req, res) => {
      try {
        const { email, senha } = req.body;
        const usuario = await prisma.user.findUnique({ where: { email: email } });
        if (!usuario) {
          return res.status(404).json({ message: "Usuário não encontrado." });
        }
        const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
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
        console.error("Erro no login:", error);
        res.status(500).json({ message: "Ocorreu um erro no login." });
      }
    });

    // Inicia o servidor
    app.listen(PORT, () => {
      console.log(`✅ Servidor 100% funcional rodando na porta ${PORT}`);
    });

  } catch (error) {
    console.error("❌ ERRO FATAL AO INICIAR O SERVIDOR:", error);
    process.exit(1);
  }
}

// Executamos a função principal para iniciar tudo
main();