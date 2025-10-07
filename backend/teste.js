const express = require('express');
const app = express();
const PORTA = 3001;

app.get('/', (req, res) => {
  res.send('Servidor de teste MÍNIMO no ar!');
});

app.listen(PORTA, () => {
  console.log(`✅ Servidor de TESTE rodando e travado na porta ${PORTA}.`);
});