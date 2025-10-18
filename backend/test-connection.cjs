// backend/test-connection.js

require('dotenv').config();
const { Client } = require('pg');

// Esta função vai tentar ligar-se usando a mesma DATABASE_URL do seu .env
async function testConnection() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("ERRO: A variável DATABASE_URL não foi encontrada no ficheiro .env!");
    return;
  }

  console.log("A tentar ligar ao banco de dados...");
  console.log("Host:", connectionString.split('@')[1].split(':')[0]); // Mostra o host que está a ser usado

  const client = new Client({
    connectionString: connectionString,
  });

  try {
    await client.connect();
    console.log("✅ SUCESSO! A ligação ao banco de dados foi estabelecida.");

    // Vamos fazer uma consulta simples para ter a certeza
    const res = await client.query('SELECT NOW()');
    console.log("Resposta do servidor:", res.rows[0]);

  } catch (err) {
    console.error("❌ FALHA! Não foi possível ligar ao banco de dados.");
    console.error("Erro detalhado:", err.message);
  } finally {
    await client.end();
    console.log("Ligação terminada.");
  }
}

testConnection();