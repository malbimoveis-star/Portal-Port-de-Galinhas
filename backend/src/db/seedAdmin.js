'use strict';

// =========================================================
// ADMINISTRADOR PADRAO (login do painel /admin)
// =========================================================
//
// Ate aqui, o login do painel administrativo comparava usuario/senha
// direto com as variaveis de ambiente ADMIN_USER/ADMIN_PASS - nao dava
// pra ter um fluxo de "esqueci a senha" porque nao existia nada gravado
// no banco nem um e-mail de recuperacao associado.
//
// Esta funcao roda a cada boot do servidor e garante que exista uma linha
// em administradores para ADMIN_USER: se nao existir, cria com a senha e
// o e-mail padrao (para nao quebrar o login que ja estava em uso); se ja
// existir, NAO mexe na senha (para nao reverter uma senha que o admin
// tenha trocado depois, pelo fluxo de redefinicao) - so completa o e-mail
// de recuperacao se por acaso estiver vazio.
//
// =========================================================

const bcrypt = require('bcryptjs');
const db = require('./connection');

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
const ADMIN_RECOVERY_EMAIL = process.env.ADMIN_RECOVERY_EMAIL || 'portalportodegalinhaspe@gmail.com';

async function garantirAdministradorPadrao() {
  const existente = await db.get('SELECT * FROM administradores WHERE usuario = ?', [ADMIN_USER]);

  if (!existente) {
    const senha_hash = await bcrypt.hash(ADMIN_PASS, 10);
    await db.run(
      `INSERT INTO administradores (usuario, email, senha_hash) VALUES (?, ?, ?)`,
      [ADMIN_USER, ADMIN_RECOVERY_EMAIL, senha_hash]
    );
    console.log('[seed] Administrador padrao criado:', ADMIN_USER, '- e-mail de recuperacao:', ADMIN_RECOVERY_EMAIL);
    return;
  }

  if (!existente.email) {
    await db.run('UPDATE administradores SET email = ? WHERE id = ?', [ADMIN_RECOVERY_EMAIL, existente.id]);
    console.log('[seed] E-mail de recuperacao do administrador preenchido:', ADMIN_RECOVERY_EMAIL);
  }
}

module.exports = { garantirAdministradorPadrao };
