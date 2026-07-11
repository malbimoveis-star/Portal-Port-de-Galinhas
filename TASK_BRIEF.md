Construa o projeto completo "Portal Porto de Galinhas" (site tropical de turismo/comerciantes) neste repositorio, do zero, pronto para deploy (Vercel/Netlify).

IMAGEM DE REFERENCIA (mockup mobile) para estilo visual (cores tropicais azul/laranja, toucan logo, layout): C:\Users\Cliente\.verdent\storage\profiles\prod-s1\workspaces\749801622117154816--proj_b39c0f82995e6123\shared\blobs\sha256\f8\07\f807507ad567e6a9d16d64332a7d3b5d07fd43a6aeea80a26c7f36d467acce8d
Use-a apenas como referencia visual/estrutural, nao precisa copiar pixel a pixel.

ESTRUTURA DE PASTAS OBRIGATORIA:
/frontend  -> HTML, CSS, JS (pode ser vanilla ou framework leve, mas simples de deploy estatico/SSR)
/backend   -> Node.js/Express (API REST)
/assets    -> imagens e icones (pode gerar placeholders/SVGs tropicais se nao houver imagens reais)
/docs      -> README.md com instrucoes de setup, deploy e variaveis de ambiente

REQUISITOS FUNCIONAIS DETALHADOS:

1. MENU SUPERIOR
- Itens: Home, Blog, Como Funciona, Contato, Sou Comerciante, Sou Turista, Idioma.
- Seletor de idioma com bandeiras PT/EN/ES/FR, trocando os textos da pagina via i18n (JSON de traducoes), sem reload.
- Responsivo (desktop, tablet, mobile) com menu hamburguer no mobile.

2. ICONES DE CATEGORIAS
- Corrigir ortografia: "Services & Turimus" -> "Servicos & Turismo".
- Categorias: Comercios Regionais, Mergulho, Jet Ski, Servicos de Praia (alem das ja existentes tipo Hoteis, Resorts, Passeios de Barco, Buggys, Restaurantes).
- Cada categoria: titulo, imagem/icone, link para listagem de comerciantes daquela categoria.
- Backend com CRUD completo de categorias (create, list, update, delete) -- rotas /api/categorias.
- Carrossel horizontal com scroll suave e setas de navegacao (JS puro, sem lib pesada).

3. DESTAQUES DE PORTO DE GALINHAS
- Trocar botoes "WhatsApp" por "Saiba mais" nos cards de destaque.
- Ao clicar "Saiba mais" -> abre pagina do comerciante (fotos, descricao, painel de status).
- Regra de negocio: anuncio so aparece publicamente se comerciante.status == 'ativo' OU dentro dos 5 dias de degustacao (status == 'degustacao'); se 'expirado', o anuncio nao aparece nas listagens publicas.

4. PAGINA DO COMERCIANTE (/comerciante/:id)
- Exibir fotos (galeria), descricao, status do plano, informacoes de contato.
- Botao "Saiba mais" -> expande detalhes do servico/anuncio.
- Botao "WhatsApp" (link wa.me com numero do comerciante) so aparece quando status == 'ativo'. Durante degustacao ou expirado, o botao NAO aparece (mostrar mensagem alternativa opcional).
- URL unica por comerciante via :id (rota Express + roteamento frontend).

5. PAINEL DO COMERCIANTE (/painel ou /dashboard, area autenticada)
- Resumo do plano atual (Gratuito, Basico, Premium).
- Contador regressivo dos 5 dias de degustacao (calculado a partir de data_criacao/data_inicio_degustacao).
- Botao "Renovar plano" -> inicia checkout Mercado Pago (Checkout Pro / preference).
- Gestao de anuncios (CRUD): titulo, descricao, categoria, tags, upload de fotos (multer, salvando em /assets/uploads ou similar).
- Backend controla e atualiza status (ativo, degustacao, expirado) via job/cron simples ou verificacao a cada request comparando datas.

6. FLUXO DE DEGUSTACAO
- Novo comerciante criado -> status inicial 'degustacao', data_inicio_degustacao = now, expira em +5 dias.
- Job/checagem (pode ser middleware ou endpoint cron chamado por scheduler externo) muda status para 'expirado' quando passar de 5 dias sem pagamento confirmado.
- Quando expirado, anuncios somem das listagens publicas; painel mostra alerta + botao "Renovar plano".
- Apos pagamento confirmado via webhook do Mercado Pago -> status muda para 'ativo', anuncios voltam a aparecer.

7. RODAPE MOBILE (fixed bottom bar, so mobile)
- Botao verde "Cadastre seu negocio" -> inicia checkout do plano Comerciante Basico.
- Botao azul "Assine ja" -> inicia checkout do plano Turista (R$9,90/mes).
- Estilo tropical, cores vivas, icones.

8. PAGAMENTOS (Mercado Pago - SDK Node oficial, sandbox/teste)
- 3 planos:
  - Turista: R$9,90/mes -> acesso a mapa offline, cupons e promocoes.
  - Comerciante Basico: valor definido (ex: R$49,90/mes) para cadastro simples.
  - Comerciante Premium: valor definido (ex: R$99,90/mes) para destaque e beneficios extras.
- Criar preferencias de pagamento via API do Mercado Pago (usar variavel de ambiente MP_ACCESS_TOKEN, nao commitar chave real -- usar .env.example).
- Rotas de retorno: /pagamento/sucesso, /pagamento/pendente, /pagamento/erro (paginas frontend + endpoints backend que atualizam status conforme webhook).
- Webhook endpoint /api/pagamentos/webhook para receber notificacoes do Mercado Pago e atualizar tabela pagamentos + status do comerciante.
- Documentar em /docs como testar em sandbox com cartoes de teste do Mercado Pago.

9. RODAPE GERAL (todas as paginas)
- Links: Termos de Uso, Politica de Privacidade, Suporte 24h (paginas reais, mesmo que conteudo padrao/generico).
- Informacoes de contato (e-mail e telefone, pode ser placeholder).
- Icones de redes sociais (Instagram, Facebook) linkando para paginas (placeholder ok).

10. CONFORMIDADE GOOGLE ADS / META ADS
- Paginas obrigatorias: /privacidade, /termos, /suporte com conteudo real e claro.
- Checkout via HTTPS/SSL (documentar que em producao precisa certificado; localmente pode ser http com aviso).
- Transparencia nos valores e beneficios de cada plano.
- Layout responsivo e otimizado (lazy loading de imagens).
- Sem popups intrusivos ou redirecionamentos enganosos.

11. BANCO DE DADOS
- Usar SQLite (via better-sqlite3 ou sequelize+sqlite) para facilitar rodar localmente, com camada de acesso que permita trocar para Postgres depois.
- Tabelas:
  - comerciantes: id, nome, email, telefone, senha_hash, plano, status, data_criacao, data_inicio_degustacao, data_expiracao.
  - categorias: id, nome, icone_url.
  - anuncios: id, titulo, descricao, categoria_id, fotos (json array de paths), tags, id_comerciante, criado_em.
  - pagamentos: id, id_comerciante, tipo_plano, valor, data_pagamento, status (pendente/aprovado/rejeitado), mp_payment_id.
- Incluir script de seed com dados de exemplo (categorias padrao + 2-3 comerciantes de exemplo com anuncios).

12. DEPLOY
- README em /docs explicando: como rodar localmente, variaveis de ambiente necessarias (.env.example), como fazer deploy do backend e do frontend (Vercel/Netlify).
- Garantir que o projeto builda e roda localmente sem erros antes de finalizar.

IMPORTANTE:
- Priorize ter TUDO funcionando end-to-end localmente (frontend consumindo backend, fluxo de cadastro -> degustacao -> checkout Mercado Pago sandbox -> ativacao via webhook simulado) mesmo que o design nao seja pixel-perfect.
- Use imagens/icones placeholder (SVGs proprios com tema tropical: toucan, praia, coqueiro, etc.) caso nao tenha assets reais.
- Escreva o README cobrindo TODOS os pontos acima.
- Ao final, rode o backend e frontend localmente e valide que as rotas principais respondem (Home, categoria, pagina de comerciante, painel, checkout sandbox, paginas legais) e reporte evidencias (comandos executados e outputs) no resumo final.
- Reporte no final: lista de arquivos criados, como rodar, e quaisquer limitacoes/pendencias (ex: chave real do Mercado Pago).
