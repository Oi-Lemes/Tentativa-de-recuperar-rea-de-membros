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

    // --- ROTA DE CADASTRO (COM LOGS) ---
    app.post('/usuarios', async (req, res) => {
      console.log('--- INICIANDO CADASTRO ---');
      try {
        console.log('Dados recebidos no body:', req.body); // LOG 1: O que o servidor recebeu?
        const { email, password } = req.body;
        
        if (!password) {
            console.log('ERRO: Senha não foi fornecida.');
            return res.status(400).json({ message: "O campo 'password' é obrigatório." });
        }

        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(password, salt);
        console.log('Senha criptografada (hash):', senhaHash); // LOG 2: A senha foi criptografada?
        
        const novoUsuario = await prisma.user.create({
          data: { email: email, senha: senhaHash },
        });
        
        console.log('--- CADASTRO BEM-SUCEDIDO ---');
        const usuarioSemSenha = { ...novoUsuario };
        delete usuarioSemSenha.senha;
        res.status(201).json(usuarioSemSenha);
      } catch (error) {
        console.error("ERRO GRAVE NO CADASTRO:", error);
        res.status(400).json({ message: "Não foi possível criar o usuário. O e-mail já pode existir." });
      }
    });

    // --- ROTA DE LOGIN (COM LOGS) ---
    app.post('/login', async (req, res) => {
      console.log('--- INICIANDO LOGIN ---');
      try {
        console.log('Tentativa de login com:', req.body); // LOG 3: Com quais dados o usuário tentou logar?
        const { email, password } = req.body;
        const usuario = await prisma.user.findUnique({ where: { email: email } });
        
        if (!usuario) {
          console.log(`Usuário '${email}' não encontrado no banco.`);
          return res.status(404).json({ message: "Usuário não encontrado." });
        }
        console.log('Usuário encontrado no banco:', usuario); // LOG 4: Como o usuário está salvo no banco?

        if (!usuario.senha || !usuario.senha.startsWith('$2b$')) {
            console.error(`--- DIAGNÓSTICO FATAL ---`);
            console.error(`O usuário '${email}' tentou logar, mas sua senha no banco de dados NÃO está criptografada.`);
            return res.status(500).json({ message: "Erro crítico de segurança: a senha deste usuário não está criptografada." });
        }
        
        console.log('Comparando a senha fornecida com o hash do banco...');
        const senhaCorreta = await bcrypt.compare(password, usuario.senha);
        
        if (!senhaCorreta) {
          console.log('Senha incorreta.');
          return res.status(401).json({ message: "Senha incorreta." });
        }
        
        console.log('--- LOGIN BEM-SUCEDIDO ---');
        const token = jwt.sign(
          { id: usuario.id, email: usuario.email },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );
        res.status(200).json({ token: token });
      } catch (error) {
        console.error("ERRO GRAVE NO LOGIN:", error);
        res.status(500).json({ message: "Ocorreu um erro inesperado no login." });
      }
    });

    // --- ROTA DE LIMPEZA ---
    app.post('/delete-all-users', async (req, res) => {
        try {
            const deleted = await prisma.user.deleteMany({});
            console.log(`--- BANCO DE DADOS LIMPO: ${deleted.count} usuários deletados ---`);
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