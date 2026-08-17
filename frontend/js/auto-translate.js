// Traducao automatica de conteudo dinamico/estatico nao coberto por data-i18n.
// Usa a API publica MyMemory (gratuita, sem chave de API) para traduzir qualquer
// texto visivel que o sistema de i18n (frontend/js/i18n.js) nao cobre: paragrafos
// fixos de paginas estaticas (termos, privacidade, etc.) e conteudo vindo do banco
// (artigos do blog, descricoes de comerciantes e anuncios).
//
// IMPORTANTE: o cabecalho (#layout-header) e o rodape (#layout-rodape) sao
// SEMPRE ignorados por este script - a traducao deles e responsabilidade
// exclusiva do i18n.js via atributos data-i18n. Isso evita que o menu/rodape
// seja retraduzido incorretamente quando o header e reconstruido (ex.: ao abrir
// o seletor de idiomas).
//
// Funcionamento:
// 1. Ouve o evento 'i18n:aplicado' (disparado por i18n.js sempre que o idioma muda).
// 2. Se o idioma escolhido nao for 'pt', percorre os nos de texto da pagina (fora
//    do header/rodape e fora de elementos com data-i18n) e traduz cada um.
// 3. Traduz cada trecho via MyMemory, com cache em localStorage pra nao repetir
//    chamadas de rede em visitas futuras.
// 4. Guarda o texto original em cada no, pra poder restaurar quando o idioma volta
//    a ser 'pt'.
// 5. Um MutationObserver cobre conteudo que chega depois (ex.: artigo de blog
//    carregado via fetch), traduzindo automaticamente o que for inserido no DOM.

(function () {
  'use strict';

  var CACHE_PREFIX = 'pg_mt_';
  var trackedNodes = [];
  var EXCLUIR_SELECTOR = 'script, style, noscript, input, textarea, select, option, ' +
    '[data-i18n], [data-no-translate], #layout-header, #layout-rodape';

  function isEligibleParent(el) {
    if (!el) return false;
    if (el.nodeType !== 1) return false;
    if (el.closest && el.closest(EXCLUIR_SELECTOR)) return false;
    return true;
  }

  function looksTranslatable(trimmed) {
    if (trimmed.length < 2) return false;
    if (!/[a-zA-ZÀ-Ÿà-ÿ]/.test(trimmed)) return false;
    if (/^[\d\s()+\-.,\/]+$/.test(trimmed)) return false;
    if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(trimmed)) return false;
    if (/^https?:\/\//i.test(trimmed)) return false;
    return true;
  }

  function collect(root, lang) {
    var out = [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (node.__pgDone === lang) return NodeFilter.FILTER_REJECT;
        var t = node.nodeValue;
        if (!t) return NodeFilter.FILTER_REJECT;
        var trimmed = t.trim();
        if (!looksTranslatable(trimmed)) return NodeFilter.FILTER_REJECT;
        if (!isEligibleParent(node.parentElement)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = walker.nextNode())) out.push(n);
    return out;
  }

  function cacheGet(text, lang) {
    try {
      var raw = localStorage.getItem(CACHE_PREFIX + lang);
      if (!raw) return null;
      var map = JSON.parse(raw);
      return Object.prototype.hasOwnProperty.call(map, text) ? map[text] : null;
    } catch (e) {
      return null;
    }
  }

  function cacheSet(text, lang, translated) {
    try {
      var key = CACHE_PREFIX + lang;
      var raw = localStorage.getItem(key);
      var map = raw ? JSON.parse(raw) : {};
      map[text] = translated;
      localStorage.setItem(key, JSON.stringify(map));
    } catch (e) {
      // localStorage cheio ou indisponivel - segue sem cache
    }
  }

  function translateText(text, lang) {
    var cached = cacheGet(text, lang);
    if (cached !== null) return Promise.resolve(cached);

    var url = 'https://api.mymemory.translated.net/get?q=' +
      encodeURIComponent(text.slice(0, 490)) + '&langpair=pt|' + lang;

    return fetch(url)
      .then(function (resp) { return resp.ok ? resp.json() : null; })
      .then(function (data) {
        var out = data && data.responseData && data.responseData.translatedText;
        if (out && !/MYMEMORY WARNING/i.test(out)) {
          cacheSet(text, lang, out);
          return out;
        }
        return null;
      })
      .catch(function () { return null; });
  }

  var filaAtual = Promise.resolve();

  function translatePage(lang) {
    filaAtual = filaAtual.then(function () { return doTranslatePage(lang); });
    return filaAtual;
  }

  function doTranslatePage(lang) {
    if (lang === 'pt') {
      trackedNodes.forEach(function (node) {
        if (node.__pgOriginal !== undefined && document.contains(node)) {
          node.nodeValue = node.__pgOriginal;
        }
        node.__pgDone = null;
      });
      return Promise.resolve();
    }

    var nodes = collect(document.body, lang);
    var BATCH = 5;
    var i = 0;

    function proximoLote() {
      if (i >= nodes.length) return Promise.resolve();
      var grupo = nodes.slice(i, i + BATCH);
      i += BATCH;
      return Promise.all(grupo.map(function (node) {
        if (!isEligibleParent(node.parentElement)) return Promise.resolve();
        var original = node.__pgOriginal !== undefined ? node.__pgOriginal : node.nodeValue;
        node.__pgOriginal = original;
        if (trackedNodes.indexOf(node) === -1) trackedNodes.push(node);
        var trimmed = original.trim();
        return translateText(trimmed, lang).then(function (translated) {
          node.__pgDone = lang;
          if (translated && document.contains(node) && isEligibleParent(node.parentElement)) {
            node.nodeValue = original.replace(trimmed, translated);
          }
        });
      })).then(proximoLote);
    }

    return proximoLote();
  }

  function idiomaAtual() {
    return document.documentElement.lang || 'pt';
  }

  document.addEventListener('i18n:aplicado', function () {
    translatePage(idiomaAtual());
  });

  var debounceTimer = null;
  var observer = new MutationObserver(function (mutations) {
    var lang = idiomaAtual();
    if (lang === 'pt') return;
    var temNovoConteudo = mutations.some(function (m) {
      return m.addedNodes && m.addedNodes.length > 0;
    });
    if (!temNovoConteudo) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () { translatePage(lang); }, 600);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Cobre o caso de a pagina carregar com um idioma != pt salvo do localStorage
  // (i18n.js ja dispara 'i18n:aplicado' na inicializacao, isso e um reforco caso
  // este script termine de carregar depois desse evento).
  setTimeout(function () {
    var lang = idiomaAtual();
    if (lang !== 'pt') translatePage(lang);
  }, 1200);
})();
