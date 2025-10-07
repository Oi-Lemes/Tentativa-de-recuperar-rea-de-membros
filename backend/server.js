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

    // --- ROTA DE CADASTRO ---
    app.post('/usuarios', async (req, res) => {
      try {
        // CORREÇÃO AQUI: Recebe 'password' e usa 'password' para criptografar.
        const { email, password } = req.body;
        if (!password) {
            return res.status(400).json({ message: "O campo 'password' é obrigatório." });
        }
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(password, salt); // Usando a variável correta 'password'
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

    // --- ROTA DE LOGIN (COM DIAGNÓSTICO) ---
    app.post('/login', async (req, res) => {
      try {
        // Esta rota já estava correta, esperando 'password'
        const { email, password } = req.body;
        const usuario = await prisma.user.findUnique({ where: { email: email } });
        if (!usuario) {
          return res.status(404).json({ message: "Usuário não encontrado." });
        }

        // VERIFICAÇÃO DE SEGURANÇA
        if (!usuario.senha || !usuario.senha.startsWith('$2b$')) {
            console.error(`--- DIAGNÓSTICO FATAL ---`);
            console.error(`O usuário '${email}' tentou logar, mas sua senha no banco de dados NÃO está criptografada.`);
            console.error(`Valor encontrado: '${usuario.senha}'`);
            console.error(`--------------------------`);
            return res.status(500).json({ message: "Erro crítico de segurança: a senha deste usuário não está criptografada." });
        }

        const senhaCorreta = await bcrypt.compare(password, usuario.senha);
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
        console.error("Erro inesperado no login:", error);
        res.status(500).json({ message: "Ocorreu um erro inesperado no login." });
      }
    });

    // --- ROTA DE LIMPEZA ---
    app.post('/delete-all-users', async (req, res) => {
        try {
            const deleted = await prisma.user.deleteMany({});
            res.status(200).json({ message: `${deleted.count} usuários foram deletados com sucesso.` });
        } catch (error) {
            console.error("Erro ao deletar usuários:", error);
            res.status(500).json({ message: "Não foi possível deletar os usuários." });
        }
    });

    // Inicia o servidor
    app.listen(PORT, () => {
      console.log(`✅ Servidor com diagnóstico rodando na porta ${PORT}`);
    });

  } catch (error) {
    console.error("❌ ERRO FATAL AO INICIAR O SERVIDOR:", error);
    process.exit(1);
  }
}

main();