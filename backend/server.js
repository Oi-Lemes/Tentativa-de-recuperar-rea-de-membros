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
        console.log('Dados recebidos no body:', req.body);
        const { email, password } = req.body;
        
        if (!password) {
            console.log('ERRO: Senha não foi fornecida.');
            return res.status(400).json({ message: "O campo 'password' é obrigatório." });
        }

        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(password, salt);
        console.log('Senha criptografada (hash):', senhaHash);
        
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
        console.log('Tentativa de login com:', req.body);
        const { email, password } = req.body;
        const usuario = await prisma.user.findUnique({ where: { email: email } });
        
        if (!usuario) {
          console.log(`Usuário '${email}' não encontrado no banco.`);
          return res.status(404).json({ message: "Usuário não encontrado." });
        }
        console.log('Usuário encontrado no banco:', usuario);

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

    // --- LÓGICA DOS WEBHOOKS (PASSO 16) ---

    // Webhook para COMPRA APROVADA
    app.post('/webhooks/compra-aprovada', async (req, res) => {
      console.log('--- WEBHOOK: COMPRA APROVADA RECEBIDO! ---');
      const { email } = req.body; // Supondo que a plataforma envia o email do comprador

      if (!email) {
        console.log('Webhook de compra recebido, mas sem email.');
        return res.status(400).json({ message: 'Email é obrigatório.' });
      }

      try {
        // Gera uma senha aleatória para o novo usuário
        const senhaAleatoria = Math.random().toString(36).slice(-8);
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senhaAleatoria, salt);

        const novoUsuario = await prisma.user.create({
          data: {
            email: email,
            senha: senhaHash,
          },
        });

        console.log(`--- USUÁRIO CRIADO VIA WEBHOOK ---`);
        console.log(`Email: ${novoUsuario.email}`);
        console.log(`Senha Temporária: ${senhaAleatoria}`); // IMPORTANTE: No mundo real, você enviaria esta senha por email.
        
        res.status(201).json({ message: 'Usuário criado com sucesso.' });
      } catch (error) {
        // Verifica se o erro é porque o usuário já existe
        if (error.code === 'P2002') {
          console.log(`Webhook: Tentativa de criar usuário que já existe (${email}). Nenhum ação necessária.`);
          return res.status(200).json({ message: 'Usuário já existia.' });
        }
        console.error("Erro ao processar webhook de compra:", error);
        res.status(500).json({ message: 'Erro interno ao criar usuário.' });
      }
    });

    // Webhook para REEMBOLSO
    app.post('/webhooks/reembolso', async (req, res) => {
      console.log('--- WEBHOOK: REEMBOLSO RECEBIDO! ---');
      const { email } = req.body;

      if (!email) {
        console.log('Webhook de reembolso recebido, mas sem email.');
        return res.status(400).json({ message: 'Email é obrigatório.' });
      }

      try {
        await prisma.user.delete({
          where: { email: email },
        });
        console.log(`--- ACESSO REMOVIDO VIA WEBHOOK ---`);
        console.log(`Usuário com email ${email} foi deletado.`);
        res.status(200).json({ message: 'Acesso do usuário removido com sucesso.' });
      } catch (error) {
        // Se o usuário a ser deletado não for encontrado, não é um erro crítico.
        if (error.code === 'P2025') {
          console.log(`Webhook: Tentativa de remover acesso de um usuário que não existe (${email}).`);
          return res.status(404).json({ message: 'Usuário não encontrado para remoção.' });
        }
        console.error("Erro ao processar webhook de reembolso:", error);
        res.status(500).json({ message: 'Erro interno ao remover usuário.' });
      }
    });

    // --- FIM DOS WEBHOOKS ---

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