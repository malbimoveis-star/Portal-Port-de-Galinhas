'use strict';

const express = require('express');
const { enviarEmail } = require('../utils/mailer');

const router = express.Router();

const EMAIL_DESTINO = process.env.EMAIL_CONTATO || 'portalportodegalinhaspe@gmail.com';

// POST /api/contato - recebe mensagens do formulario de contato do site e
// envia por e-mail para o Portal (turistas e comerciantes usam para se comunicar).
router.post('/', async (req, res) => {
  const { nome, email, mensagem } = req.body;

  if (!nome || !email || !mensagem) {
    return res.status(400).json({ erro: 'Campos "nome", "email" e "mensagem" sao obrigatorios.' });
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#0b5a7a;">Nova mensagem pelo site</h2>
      <p><strong>Nome:</strong> ${nome}</p>
      <p><strong>E-mail para resposta:</strong> ${email}</p>
      <p><strong>Mensagem:</strong></p>
      <p>${String(mensagem).replace(/\n/g, '<br>')}</p>
    </div>`;

  const resultado = await enviarEmail({
    para: EMAIL_DESTINO,
    assunto: `Contato pelo site - ${nome}`,
    html,
  });

  res.json({ sucesso: true, simulado: resultado.simulado || false });
});

module.exports = router;
