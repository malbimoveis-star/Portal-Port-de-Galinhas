'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');

const db = require('../db/connection');

const {
  autenticar,
  gerarToken
} = require('../middleware/auth');

const {
  verificarEAtualizarStatus,
  calcularTempoRestanteDegustacao
} = require('../utils/status');

const {
  PLANOS,
  DIAS_DEGUSTACAO
} = require('../utils/planos');

const router = express.Router();


// =========================================================
// AUXILIAR
// =========================================================

function comercianteSemSenha(comerciante) {
  if (!comerciante) {
    return comerciante;
  }

  const {
    senha_hash,
    ...resto
  } = comerciante;

  return resto;
}


// =========================================================
// AUXILIAR
// BUSCAR COMERCIANTE ATUALIZADO
// =========================================================

function buscarComerciante(id) {
  const comerciante = db
    .prepare(`
      SELECT *
      FROM comerciantes
      WHERE id = ?
    `)
    .get(id);

  if (comerciante) {
    verificarEAtualizarStatus(comerciante);
  }

  return comerciante;
}


// =========================================================
// CADASTRO
// POST /api/comerciantes/cadastro
// =========================================================

router.post(
  '/cadastro',
  async (req, res) => {
    try {
      const {
        nome,
        email,
        telefone
      } = req.body;

      const senha =
        req.body.senha;

      if (!nome || !email || !senha) {
        return res.status(400).json({
          erro:
            'Campos "nome", "email" e "senha" sao obrigatorios.'
        });
      }

      const emailNormalizado =
        String(email)
          .trim()
          .toLowerCase();

      const existente =
        db
          .prepare(`
            SELECT id
            FROM comerciantes
            WHERE email = ?
          `)
          .get(emailNormalizado);

      if (existente) {
        return res.status(409).json({
          erro:
            'Ja existe um comerciante cadastrado com este e-mail.'
        });
      }

      const senha_hash =
        await bcrypt.hash(
          senha,
          10
        );

      const agora =
        new Date().toISOString();

      const info =
        db
          .prepare(`
            INSERT INTO comerciantes (
              nome,
              email,
              telefone,
              senha_hash,
              plano,
              status,
              data_criacao,
              data_inicio_degustacao,
              data_expiracao
            )
            VALUES (
              ?,
              ?,
              ?,
              ?,
              'gratuito',
              'degustacao',
              ?,
              ?,
              NULL
            )
          `)
          .run(
            String(nome).trim(),
            emailNormalizado,
            telefone
              ? String(telefone).trim()
              : null,
            senha_hash,
            agora,
            agora
          );

      const comerciante =
        buscarComerciante(
          info.lastInsertRowid
        );

      const token =
        gerarToken(
          comerciante
        );

      return res
        .status(201)
        .json({
          comerciante:
            comercianteSemSenha(
              comerciante
            ),

          token,

          degustacao: {
            dias:
              DIAS_DEGUSTACAO,

            dataInicio:
              comerciante.data_inicio_degustacao
          }
        });

    } catch (err) {
      console.error(
        '[COMERCIANTES] Erro ao cadastrar:',
        err
      );

      return res.status(500).json({
        erro:
          'Erro ao cadastrar comerciante: ' +
          err.message
      });
    }
  }
);


// =========================================================
// LOGIN
// POST /api/comerciantes/login
// =========================================================

router.post(
  '/login',
  async (req, res) => {
    try {
      const {
        email,
        senha
      } = req.body;

      if (!email || !senha) {
        return res.status(400).json({
          erro:
            'Campos "email" e "senha" sao obrigatorios.'
        });
      }

      const emailNormalizado =
        String(email)
          .trim()
          .toLowerCase();

      const comerciante =
        db
          .prepare(`
            SELECT *
            FROM comerciantes
            WHERE email = ?
          `)
          .get(emailNormalizado);

      if (!comerciante) {
        return res.status(401).json({
          erro:
            'Credenciais invalidas.'
        });
      }

      const senhaOk =
        await bcrypt.compare(
          senha,
          comerciante.senha_hash
        );

      if (!senhaOk) {
        return res.status(401).json({
          erro:
            'Credenciais invalidas.'
        });
      }

      verificarEAtualizarStatus(
        comerciante
      );

      const token =
        gerarToken(
          comerciante
        );

      const degustacao =
        calcularTempoRestanteDegustacao(
          comerciante
        );

      return res.json({
        comerciante:
          comercianteSemSenha(
            comerciante
          ),

        token,

        degustacao
      });

    } catch (err) {
      console.error(
        '[COMERCIANTES] Erro no login:',
        err
      );

      return res.status(500).json({
        erro:
          'Erro ao realizar login: ' +
          err.message
      });
    }
  }
);


// =========================================================
// ME
// GET /api/comerciantes/me
// =========================================================

router.get(
  '/me',
  autenticar,
  (req, res) => {
    try {
      const comerciante =
        buscarComerciante(
          req.comerciante.id
        );

      if (!comerciante) {
        return res.status(404).json({
          erro:
            'Comerciante nao encontrado.'
        });
      }

      const degustacao =
        calcularTempoRestanteDegustacao(
          comerciante
        );

      return res.json({
        comerciante:
          comercianteSemSenha(
            comerciante
          ),

        degustacao,

        plano_info:
          PLANOS[
            comerciante.plano
          ] || null
      });

    } catch (err) {
      console.error(
        '[COMERCIANTES] Erro ao buscar perfil:',
        err
      );

      return res.status(500).json({
        erro:
          'Erro ao carregar dados do comerciante.'
      });
    }
  }
);


// =========================================================
// EDITAR MEUS DADOS
// PUT /api/comerciantes/me
// =========================================================

router.put(
  '/me',
  autenticar,
  (req, res) => {
    try {

      const {
        nome,
        telefone,
        cidade,
        endereco,
        descricao,
        latitude,
        longitude,
        logo,
        banner,
        site
      } = req.body;


      const comerciante =
        buscarComerciante(
          req.comerciante.id
        );


      if (!comerciante) {
        return res.status(404).json({
          erro:
            'Comerciante nao encontrado.'
        });
      }


      // =====================================================
      // NOME
      // =====================================================

      const novoNome =
        nome !== undefined
          ? String(nome).trim()
          : comerciante.nome;


      // =====================================================
      // TELEFONE
      // =====================================================

      const novoTelefone =
        telefone !== undefined
          ? String(telefone).trim()
          : comerciante.telefone;


      // =====================================================
      // CIDADE
      // =====================================================

      const novaCidade =
        cidade !== undefined
          ? String(cidade).trim()
          : comerciante.cidade;


      // =====================================================
      // ENDEREÇO
      // =====================================================

      const novoEndereco =
        endereco !== undefined
          ? String(endereco).trim()
          : comerciante.endereco;


      // =====================================================
      // DESCRIÇÃO
      // =====================================================

      const novaDescricao =
        descricao !== undefined
          ? String(descricao).trim()
          : comerciante.descricao;


      // =====================================================
      // LATITUDE
      // =====================================================

      let novaLatitude =
        comerciante.latitude;

      if (
        latitude !== undefined &&
        latitude !== null &&
        latitude !== ''
      ) {
        novaLatitude =
          Number(latitude);
      }


      // =====================================================
      // LONGITUDE
      // =====================================================

      let novaLongitude =
        comerciante.longitude;

      if (
        longitude !== undefined &&
        longitude !== null &&
        longitude !== ''
      ) {
        novaLongitude =
          Number(longitude);
      }


      // =====================================================
      // LOGO
      // =====================================================

      const novoLogo =
        logo !== undefined
          ? String(logo).trim()
          : comerciante.logo;


      // =====================================================
      // BANNER
      // =====================================================

      const novoBanner =
        banner !== undefined
          ? String(banner).trim()
          : comerciante.banner;


      // =====================================================
      // SITE
      // =====================================================

      const novoSite =
        site !== undefined
          ? String(site).trim()
          : comerciante.site;


      // =====================================================
      // VALIDAÇÕES
      // =====================================================

      if (!novoNome) {
        return res.status(400).json({
          erro:
            'O nome e obrigatorio.'
        });
      }


      if (
        latitude !== undefined &&
        latitude !== null &&
        latitude !== '' &&
        Number.isNaN(novaLatitude)
      ) {
        return res.status(400).json({
          erro:
            'A latitude informada e invalida.'
        });
      }


      if (
        longitude !== undefined &&
        longitude !== null &&
        longitude !== '' &&
        Number.isNaN(novaLongitude)
      ) {
        return res.status(400).json({
          erro:
            'A longitude informada e invalida.'
        });
      }


      // =====================================================
      // ATUALIZAR COMERCIANTE
      // =====================================================

      db
        .prepare(`
          UPDATE comerciantes
          SET
            nome = ?,
            telefone = ?,
            cidade = ?,
            endereco = ?,
            descricao = ?,
            latitude = ?,
            longitude = ?,
            logo = ?,
            banner = ?,
            site = ?
          WHERE id = ?
        `)
        .run(
          novoNome,
          novoTelefone,
          novaCidade,
          novoEndereco,
          novaDescricao,
          novaLatitude,
          novaLongitude,
          novoLogo,
          novoBanner,
          novoSite,
          comerciante.id
        );


      // =====================================================
      // BUSCAR DADOS ATUALIZADOS
      // =====================================================

      const atualizado =
        buscarComerciante(
          comerciante.id
        );


      return res.json({

        comerciante:
          comercianteSemSenha(
            atualizado
          ),

        degustacao:
          calcularTempoRestanteDegustacao(
            atualizado
          )

      });


    } catch (err) {

      console.error(
        '[COMERCIANTES] Erro ao editar:',
        err
      );

      return res.status(500).json({
        erro:
          'Erro ao atualizar comerciante: ' +
          err.message
      });

    }
  }
);


// =========================================================
// ALTERAR SENHA
// PUT /api/comerciantes/me/senha
// =========================================================

router.put(
  '/me/senha',
  autenticar,
  async (req, res) => {
    try {

      const {
        senhaAtual,
        novaSenha
      } = req.body;


      if (!senhaAtual || !novaSenha) {
        return res.status(400).json({
          erro:
            'Informe a senha atual e a nova senha.'
        });
      }


      if (
        String(novaSenha).length < 6
      ) {
        return res.status(400).json({
          erro:
            'A nova senha deve ter pelo menos 6 caracteres.'
        });
      }


      const comerciante =
        db
          .prepare(`
            SELECT *
            FROM comerciantes
            WHERE id = ?
          `)
          .get(
            req.comerciante.id
          );


      if (!comerciante) {
        return res.status(404).json({
          erro:
            'Comerciante nao encontrado.'
        });
      }


      const senhaOk =
        await bcrypt.compare(
          senhaAtual,
          comerciante.senha_hash
        );


      if (!senhaOk) {
        return res.status(401).json({
          erro:
            'A senha atual esta incorreta.'
        });
      }


      const novaSenhaHash =
        await bcrypt.hash(
          novaSenha,
          10
        );


      db
        .prepare(`
          UPDATE comerciantes
          SET senha_hash = ?
          WHERE id = ?
        `)
        .run(
          novaSenhaHash,
          comerciante.id
        );


      return res.json({

        sucesso: true,

        mensagem:
          'Senha alterada com sucesso.'

      });


    } catch (err) {

      console.error(
        '[COMERCIANTES] Erro ao alterar senha:',
        err
      );

      return res.status(500).json({
        erro:
          'Erro ao alterar senha: ' +
          err.message
      });

    }
  }
);


// =========================================================
// DADOS PUBLICOS DO COMERCIANTE
// GET /api/comerciantes/:id
// =========================================================

router.get(
  '/:id',
  (req, res) => {
    try {

      const comerciante =
        buscarComerciante(
          req.params.id
        );


      if (!comerciante) {
        return res.status(404).json({
          erro:
            'Comerciante nao encontrado.'
        });
      }


      return res.json({

        comerciante:
          comercianteSemSenha(
            comerciante
          )

      });


    } catch (err) {

      console.error(
        '[COMERCIANTES] Erro ao buscar comerciante:',
        err
      );

      return res.status(500).json({
        erro:
          'Erro ao carregar comerciante.'
      });

    }
  }
);


module.exports = router;
