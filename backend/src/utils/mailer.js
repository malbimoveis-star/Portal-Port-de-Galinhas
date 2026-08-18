'use strict';

const nodemailer = require('nodemailer');

const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_APP_PASSWORD = process.env.EMAIL_APP_PASSWORD || '';

let transporter = null;

function getTransporter() {
    if (!EMAIL_USER || !EMAIL_APP_PASSWORD) return null;
    if (!transporter) {
          transporter = nodemailer.createTransport({
                  service: 'gmail',
                  auth: { user: EMAIL_USER, pass: EMAIL_APP_PASSWORD },
          });
    }
    return transporter;
}

// Envia um e-mail. Se EMAIL_USER/EMAIL_APP_PASSWORD nao estiverem configurados,
// nao lanca erro: apenas loga um aviso (modo simulado), para nao derrubar o
// cadastro/recuperacao de senha em ambientes sem essas variaveis configuradas ainda.
async function enviarEmail({ para, assunto, html }) {
    const t = getTransporter();
    if (!t) {
          console.warn('[mailer] EMAIL_USER/EMAIL_APP_PASSWORD nao configurados - e-mail nao enviado (modo simulado). Destinatario:', para, 'Assunto:', assunto);
          return { simulado: true };
    }
    try {
          await t.sendMail({
                  from: `"Portal Porto de Galinhas" <${EMAIL_USER}>`,
                  to: para,
                  subject: assunto,
                  html,
          });
          return { simulado: false, enviado: true };
    } catch (err) {
          console.error('[mailer] erro ao enviar e-mail:', err.message);
          return { simulado: false, enviado: false, erro: err.message };
    }
}

function templateBoasVindas({ nome, linkConfirmacao }) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color:#0b5a7a;">Bem-vindo(a) ao Portal Porto de Galinhas!</h2>
              <p>Ola, ${nome},</p>
                  <p>Seu cadastro como comerciante foi realizado com sucesso e ja esta na nossa base de dados. Para confirmar seu e-mail e ativar sua conta, clique no botao abaixo:</p>
                      <p style="text-align:center; margin: 24px 0;">
                            <a href="${linkConfirmacao}" style="background:#f5a623; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">Confirmar meu e-mail</a>
                                </p>
                                    <p style="font-size:.85em; color:#666;">Se o botao nao funcionar, copie e cole este link no navegador:<br>${linkConfirmacao}</p>
                                        <p style="font-size:.85em; color:#666;">Este link expira em 24 horas.</p>
                                          </div>`;
}

function templateBoasVindasAfiliado({ nome, linkConfirmacao }) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color:#0b5a7a;">Bem-vindo(a) ao Programa de Afiliados!</h2>
              <p>Ola, ${nome},</p>
                  <p>Recebemos seu cadastro como afiliado do Portal Porto de Galinhas. Para confirmar seu e-mail e continuar (dados pessoais, documento e aceite do Termo de Afiliado), clique no botao abaixo:</p>
                      <p style="text-align:center; margin: 24px 0;">
                            <a href="${linkConfirmacao}" style="background:#f5a623; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">Confirmar meu e-mail</a>
                                </p>
                                    <p style="font-size:.85em; color:#666;">Se o botao nao funcionar, copie e cole este link no navegador:<br>${linkConfirmacao}</p>
                                        <p style="font-size:.85em; color:#666;">Este link expira em 24 horas.</p>
                                          </div>`;
}

function templateRecuperacaoSenha({ nome, linkRedefinir }) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color:#0b5a7a;">Redefinicao de senha</h2>
              <p>Ola, ${nome},</p>
                  <p>Recebemos um pedido para redefinir a senha da sua conta no Portal Porto de Galinhas. Clique no botao abaixo para criar uma nova senha:</p>
                      <p style="text-align:center; margin: 24px 0;">
                            <a href="${linkRedefinir}" style="background:#f5a623; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">Redefinir minha senha</a>
                                </p>
                                    <p style="font-size:.85em; color:#666;">Se o botao nao funcionar, copie e cole este link no navegador:<br>${linkRedefinir}</p>
                                        <p style="font-size:.85em; color:#666;">Este link expira em 1 hora. Se voce nao pediu essa redefinicao, ignore este e-mail.</p>
                                          </div>`;
}

function templateNotificacaoAdmin({ titulo, mensagem, linkPainel }) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color:#0b5a7a;">${titulo}</h2>
              <p>${mensagem}</p>
                  <p style="text-align:center; margin: 24px 0;">
                        <a href="${linkPainel}" style="background:#0f3460; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">Abrir painel administrativo</a>
                            </p>
                                <p style="font-size:.85em; color:#666;">Este e um aviso automatico do Portal Porto de Galinhas. Voce pode desativar esses avisos removendo a variavel ADMIN_EMAIL nas configuracoes do servidor.</p>
                                  </div>`;
}

// Fase 2 do dashboard: notifica o dono do portal por e-mail quando algo
// relevante acontece (novo comerciante cadastrado, anuncio pendente de
// aprovacao, pagamento aprovado). Destinatario: ADMIN_EMAIL, ou EMAIL_USER
// como fallback (a mesma conta que envia os e-mails, caso ADMIN_EMAIL nao
// esteja configurado). Assim como enviarEmail(), nunca lanca erro.
const ADMIN_NOTIFICACAO_EMAIL = process.env.ADMIN_EMAIL || EMAIL_USER;

async function notificarAdmin({ titulo, mensagem, linkPainel }) {
    if (!ADMIN_NOTIFICACAO_EMAIL) {
          console.warn('[mailer] ADMIN_EMAIL/EMAIL_USER nao configurados - notificacao de admin nao enviada:', titulo);
          return { simulado: true };
    }
    const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
    return enviarEmail({
          para: ADMIN_NOTIFICACAO_EMAIL,
          assunto: `[Portal Porto de Galinhas] ${titulo}`,
          html: templateNotificacaoAdmin({ titulo, mensagem, linkPainel: linkPainel || `${BACKEND_URL}/admin/` }),
    });
}

module.exports = { enviarEmail, templateBoasVindas, templateBoasVindasAfiliado, templateRecuperacaoSenha, notificarAdmin };
