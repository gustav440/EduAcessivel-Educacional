/**
 * aluno.js — painel do aluno: progresso, cursos e recursos de acessibilidade.
 * Depende de: ../js/api.js (window.EduAPI) e portal.js (window.Portal).
 * Texto vindo do servidor é inserido com textContent (nunca como HTML).
 */
(function () {
  "use strict";

  var RECURSOS = [
    ['transcricao', 'Transcrição'],
    ['audiodescricao', 'Áudio descritivo'],
    ['libras', 'Libras'],
    ['legenda', 'Legenda'],
    ['leitura-facil', 'Leitura fácil'],
  ];
  var NECESSIDADES = RECURSOS.concat([['alto-contraste', 'Alto contraste']]);
  var ICONES = { Tecnologia: '💻', Matemática: '➗', Linguagens: '🗣️', Ciências: '🔬', Humanas: '🏛️', Artes: '🎨', Aprendizagem: '🧠', Conhecimento: '🌍' };

  var $ = function (id) { return document.getElementById(id); };
  var aviso = $('aviso');

  var usuario = null;
  var progressoPorSlug = {};   // slug -> { concluidas, totalAulas, percentual }
  var filtros = new Set();     // códigos de recursos escolhidos
  var termoBusca = '';
  var ultimaBusca = 0;
  var temporizadorBusca = null;

  /* ---------- Ajudantes ---------- */
  function criar(tag, classe, texto) {
    var el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto !== undefined) el.textContent = texto;
    return el;
  }

  function mostrarAviso(texto) {
    aviso.textContent = texto;
    aviso.className = 'login-alerta';
    aviso.hidden = false;
  }

  function rotuloDoRecurso(codigo) {
    var achado = RECURSOS.find(function (r) { return r[0] === codigo; });
    return achado ? achado[1] : codigo;
  }

  function formatarDuracao(min) {
    if (min < 60) return min + ' min';
    var h = Math.floor(min / 60);
    var resto = min % 60;
    return h + 'h' + (resto ? ' ' + resto + ' min' : '');
  }

  function barra(valor, rotulo) {
    var p = document.createElement('progress');
    p.className = 'barra';
    p.max = 100;
    p.value = valor;
    p.setAttribute('aria-label', rotulo);
    return p;
  }

  function linkDaAula(slug, numero) {
    return '../tec.html?curso=' + encodeURIComponent(slug) + '&aula=' + numero;
  }

  function botaoLink(texto, href, classe) {
    var a = criar('a', classe || 'btn-primario', texto);
    a.href = href;
    return a;
  }

  /* ---------- Entrada ---------- */
  function bloquear(mensagem) {
    $('bloqueio-msg').textContent = mensagem;
    $('area-bloqueada').hidden = false;
  }

  async function iniciar() {
    if (!EduAPI.estaLogado()) {
      bloquear('Entre na sua conta para acompanhar seus estudos.');
      return;
    }
    try {
      usuario = await EduAPI.usuarioAtual();
    } catch (erro) {
      bloquear('Sua sessão expirou, sua conta está restrita ou o servidor está desligado. ' + erro.message);
      return;
    }

    $('titulo-boas-vindas').textContent = 'Olá, ' + usuario.nome.split(' ')[0] + '!';
    $('painel').hidden = false;

    montarFiltros();
    montarNecessidades();
    await carregarProgresso();
    carregarCatalogo();
  }

  /* ---------- Progresso ---------- */
  async function carregarProgresso() {
    var area = $('meus-cursos');
    var lista = [];
    try {
      lista = await EduAPI.meuProgresso();
    } catch (erro) {
      mostrarAviso(erro.message);
    }
    progressoPorSlug = {};
    lista.forEach(function (p) { progressoPorSlug[p.cursoSlug] = p; });

    // próxima aula de cada curso em andamento
    var proximas = {};
    await Promise.all(lista.map(async function (p) {
      try {
        var detalhe = await EduAPI.obterCurso(p.cursoSlug);
        var proxima = detalhe.aulas.find(function (a) { return !a.concluida; });
        proximas[p.cursoSlug] = proxima ? proxima.numero : 1;
      } catch (e) {
        proximas[p.cursoSlug] = 1;
      }
    }));

    var andamento = lista.filter(function (p) { return p.percentual < 100; });
    var concluidos = lista.filter(function (p) { return p.percentual >= 100; });
    var feitas = lista.reduce(function (s, p) { return s + p.concluidas; }, 0);
    var total = lista.reduce(function (s, p) { return s + p.totalAulas; }, 0);

    $('e-andamento').textContent = andamento.length;
    $('e-concluidos').textContent = concluidos.length;
    $('e-aulas').textContent = feitas;
    $('e-geral').textContent = (total ? Math.round(feitas * 100 / total) : 0) + '%';

    montarHero(andamento, proximas);

    area.replaceChildren();
    if (lista.length === 0) {
      var vazio = criar('p', 'vazio', 'Você ainda não concluiu nenhuma aula. Escolha um curso abaixo para começar.');
      area.appendChild(vazio);
      return;
    }
    lista.forEach(function (p) {
      var card = criar('article', 'curso-card');
      card.setAttribute('aria-label', p.cursoTitulo);
      card.appendChild(criar('h3', '', p.cursoTitulo));
      card.appendChild(criar('p', 'meta', p.concluidas + ' de ' + p.totalAulas + ' aulas • ' + p.percentual + '%'));
      card.appendChild(barra(p.percentual, 'Seu progresso em ' + p.cursoTitulo + ': ' + p.percentual + '%'));
      var rodape = criar('div', 'rodape-card');
      var concluido = p.percentual >= 100;
      var alvo = concluido ? 1 : proximas[p.cursoSlug];
      rodape.appendChild(botaoLink(concluido ? 'Rever o curso' : 'Continuar', linkDaAula(p.cursoSlug, alvo),
        concluido ? 'btn-secundario btn-pequeno' : 'btn-primario btn-pequeno'));
      card.appendChild(rodape);
      area.appendChild(card);
    });
  }

  function montarHero(andamento, proximas) {
    var acoes = $('acoes-hero');
    acoes.replaceChildren();
    if (andamento.length > 0) {
      var p = andamento.slice().sort(function (a, b) { return b.percentual - a.percentual; })[0];
      $('mensagem-hero').textContent = 'Você está em ' + p.cursoTitulo + ' (' + p.percentual + '% concluído). Continue de onde parou.';
      acoes.appendChild(botaoLink('Continuar o curso', linkDaAula(p.cursoSlug, proximas[p.cursoSlug])));
      acoes.appendChild(botaoLink('Explorar cursos', '#cursos', 'btn-secundario'));
    } else {
      $('mensagem-hero').textContent = 'Escolha um curso, estude no seu ritmo e acompanhe seu progresso por aqui.';
      acoes.appendChild(botaoLink('Explorar cursos', '#cursos'));
    }
  }

  /* ---------- Catálogo ---------- */
  function montarFiltros() {
    var area = $('filtros');
    RECURSOS.forEach(function (r) {
      var chip = criar('button', 'chip', r[1]);
      chip.type = 'button';
      chip.setAttribute('aria-pressed', 'false');
      chip.addEventListener('click', function () {
        var ligado = chip.getAttribute('aria-pressed') === 'true';
        chip.setAttribute('aria-pressed', String(!ligado));
        if (ligado) filtros.delete(r[0]); else filtros.add(r[0]);
        carregarCatalogo();
      });
      area.appendChild(chip);
    });
    $('busca-cursos').addEventListener('input', function (e) {
      clearTimeout(temporizadorBusca);
      termoBusca = e.target.value.trim();
      temporizadorBusca = setTimeout(carregarCatalogo, 250);
    });
  }

  async function carregarCatalogo() {
    var area = $('catalogo');
    var minha = ++ultimaBusca;
    try {
      var cursos = await EduAPI.listarCursos({ busca: termoBusca, recursos: Array.from(filtros) });
      if (minha !== ultimaBusca) return;
      area.replaceChildren();
      if (cursos.length === 0) {
        area.appendChild(criar('p', 'vazio', 'Nenhum curso encontrado com esses filtros.'));
        return;
      }
      cursos.forEach(function (c) { area.appendChild(cartaoDoCurso(c)); });
    } catch (erro) {
      if (minha !== ultimaBusca) return;
      area.replaceChildren(criar('p', 'login-alerta', 'Não foi possível carregar os cursos. ' + erro.message));
    }
  }

  function cartaoDoCurso(c) {
    var card = criar('article', 'curso-card');
    card.setAttribute('aria-label', c.titulo);
    card.appendChild(criar('div', 'curso-icone', ICONES[c.categoria] || '📘')).setAttribute('aria-hidden', 'true');
    card.appendChild(criar('h3', '', c.titulo));
    card.appendChild(criar('p', 'meta', c.categoria + ' • ' + c.nivel + ' • ' + formatarDuracao(c.duracaoMin)
      + (c.totalAulas ? ' • ' + c.totalAulas + ' aulas' : '')));
    card.appendChild(criar('p', 'curso-desc', c.descricao));

    var tags = criar('div', 'tags-acessibilidade');
    var minhas = new Set(usuario ? usuario.necessidades : []);
    c.recursos.forEach(function (r) {
      var tag = criar('span', 'tag-acessibilidade', rotuloDoRecurso(r));
      if (minhas.has(r)) tag.textContent = '★ ' + rotuloDoRecurso(r);
      tags.appendChild(tag);
    });
    if (c.recursos.length) card.appendChild(tags);

    var rodape = criar('div', 'rodape-card');
    var p = progressoPorSlug[c.slug];
    if (c.totalAulas === 0) {
      rodape.appendChild(criar('span', 'pilula', 'Em breve'));
    } else if (p && p.percentual >= 100) {
      rodape.appendChild(botaoLink('Rever o curso', linkDaAula(c.slug, 1), 'btn-secundario btn-pequeno'));
    } else if (p) {
      rodape.appendChild(botaoLink('Continuar (' + p.percentual + '%)', linkDaAula(c.slug, 1), 'btn-primario btn-pequeno'));
    } else {
      rodape.appendChild(botaoLink('Começar curso', linkDaAula(c.slug, 1), 'btn-primario btn-pequeno'));
    }
    card.appendChild(rodape);
    return card;
  }

  /* ---------- Acessibilidade da conta ---------- */
  function montarNecessidades() {
    var area = $('lista-necessidades');
    var marcadas = new Set(usuario.necessidades || []);
    NECESSIDADES.forEach(function (n) {
      var rotulo = criar('label', 'opcao');
      var input = document.createElement('input');
      input.type = 'checkbox';
      input.name = 'necessidade';
      input.value = n[0];
      input.checked = marcadas.has(n[0]);
      var corpo = criar('div');
      corpo.appendChild(criar('strong', '', n[1]));
      rotulo.append(input, corpo);
      area.appendChild(rotulo);
    });

    $('btn-abrir-a11y').addEventListener('click', function () { window.Portal.abrirPainelA11y(); });

    $('form-necessidades').addEventListener('submit', async function (e) {
      e.preventDefault();
      var escolhidas = Array.from(document.querySelectorAll('input[name="necessidade"]:checked')).map(function (i) { return i.value; });
      var estado = $('estado-necessidades');
      var botao = $('btn-salvar-necessidades');
      botao.disabled = true;
      estado.textContent = 'Salvando…';
      try {
        usuario = await EduAPI.atualizarAcessibilidade(escolhidas, usuario.preferencias);
        estado.textContent = 'Salvo na sua conta.';
        carregarCatalogo();
      } catch (erro) {
        estado.textContent = erro.message;
      }
      botao.disabled = false;
    });
  }

  iniciar();
})();
