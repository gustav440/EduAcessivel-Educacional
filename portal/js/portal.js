/**
 * portal.js — estrutura comum do portal: barra superior, menu lateral (gaveta no celular),
 * painel de acessibilidade e identificação do usuário.
 * Depende de: ../js/api.js (window.EduAPI) e portal-tema.js (window.PortalTema).
 * Texto vindo do servidor é inserido com textContent (nunca como HTML).
 */
(function () {
  "use strict";

  var PAGINA_LOGIN = '../cadastro-adaptavel/login.html';
  var PAPEIS = { ALUNO: 'Aluno', PROFESSOR: 'Professor', ADMIN: 'Administrador' };

  var MENU = [
    { grupo: 'Estudante', papeis: ['ALUNO', 'PROFESSOR', 'ADMIN'], itens: [
      { href: 'aluno.html', rotulo: 'Meu painel', icone: '🏠' },
      { href: 'aluno.html#cursos', rotulo: 'Explorar cursos', icone: '🔎' },
      { href: 'aluno.html#acessibilidade', rotulo: 'Minha acessibilidade', icone: '♿' },
    ] },
    { grupo: 'Professor', papeis: ['PROFESSOR', 'ADMIN'], itens: [
      { href: 'professor.html', rotulo: 'Visão geral', icone: '📊' },
      { href: 'gerenciar.html', rotulo: 'Gerenciar conteúdo', icone: '🛠️' },
    ] },
    { grupo: 'Administração', papeis: ['ADMIN'], itens: [
      { href: 'admin.html', rotulo: 'Moderação', icone: '🛡️', id: 'link-admin' },
    ] },
  ];

  var usuario = null;
  var painelA11y = null;
  var botaoQueAbriu = null;
  var temporizadorSync = null;

  function criar(tag, classe, texto) {
    var el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto !== undefined) el.textContent = texto;
    return el;
  }

  function arquivoAtual() {
    return window.location.pathname.split('/').pop() || '';
  }

  /* ---------- Barra superior ---------- */
  function montarTopo() {
    var host = document.getElementById('portal-topo');
    if (!host) return;
    host.className = 'topbar';
    host.setAttribute('role', 'banner');
    host.innerHTML =
      '<button type="button" class="btn-icone" id="btn-menu" aria-label="Abrir menu" aria-expanded="false" aria-controls="menu-lateral">☰</button>' +
      '<a class="marca" href="../index.html" aria-label="EduAcessível, página inicial">' +
      '<span class="selo" aria-hidden="true">🎓</span><span>Edu<span class="realce">Acessível</span></span></a>' +
      '<span class="topbar-espaco"></span>' +
      '<button type="button" class="btn-secundario btn-pequeno" id="btn-a11y" aria-haspopup="dialog" aria-controls="painel-a11y">' +
      '<span aria-hidden="true">♿</span><span class="texto-botao">Acessibilidade</span></button>' +
      '<div class="usuario">' +
      '<span class="avatar" id="avatar" aria-hidden="true">?</span>' +
      '<span class="usuario-nome" id="nome-usuario">Visitante</span>' +
      '<span class="pilula" id="papel-usuario" hidden></span>' +
      '<a href="' + PAGINA_LOGIN + '" id="link-sair">Entrar</a>' +
      '</div>';
  }

  /* ---------- Menu lateral ---------- */
  function montarMenu() {
    var lateral = document.getElementById('menu-lateral');
    if (!lateral) return;
    lateral.className = 'sidebar';
    var nav = criar('nav');
    nav.setAttribute('aria-label', 'Menu do portal');
    var atual = arquivoAtual();

    MENU.forEach(function (g) {
      var bloco = criar('div', 'menu-grupo');
      bloco.dataset.papeis = g.papeis.join(',');
      bloco.hidden = g.papeis.indexOf('ALUNO') === -1; // só "Estudante" aparece antes de saber quem é
      bloco.appendChild(criar('p', 'menu-titulo', g.grupo));
      g.itens.forEach(function (i) {
        var link = criar('a', 'menu-link');
        link.href = i.href;
        if (i.id) link.id = i.id;
        link.appendChild(criar('span', 'menu-icone', i.icone));
        link.appendChild(criar('span', '', i.rotulo));
        if (i.href === atual) link.setAttribute('aria-current', 'page');
        bloco.appendChild(link);
      });
      nav.appendChild(bloco);
    });
    lateral.appendChild(nav);

    montarMenuAtivo();
  }

  /* ---------- Menu no celular ---------- */
  function ligarMenuMovel() {
    var botao = document.getElementById('btn-menu');
    var lateral = document.getElementById('menu-lateral');
    if (!botao || !lateral) return;

    var fundo = criar('div', 'overlay');
    fundo.hidden = true;
    document.body.appendChild(fundo);

    function abrir() {
      lateral.classList.add('aberta');
      fundo.hidden = false;
      botao.setAttribute('aria-expanded', 'true');
      botao.setAttribute('aria-label', 'Fechar menu');
      var primeiro = lateral.querySelector('a');
      if (primeiro) primeiro.focus();
    }
    function fechar(devolverFoco) {
      lateral.classList.remove('aberta');
      fundo.hidden = true;
      botao.setAttribute('aria-expanded', 'false');
      botao.setAttribute('aria-label', 'Abrir menu');
      if (devolverFoco) botao.focus();
    }
    botao.addEventListener('click', function () {
      if (lateral.classList.contains('aberta')) fechar(true); else abrir();
    });
    fundo.addEventListener('click', function () { fechar(true); });
    lateral.addEventListener('click', function (e) {
      if (e.target.closest('a')) fechar(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lateral.classList.contains('aberta')) fechar(true);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) fechar(false);
    });
    window.addEventListener('hashchange', function () { montarMenuAtivo(); });
  }

  function montarMenuAtivo() {
    var lateral = document.getElementById('menu-lateral');
    if (!lateral) return;
    var atual = arquivoAtual();
    var completo = atual + window.location.hash;
    lateral.querySelectorAll('.menu-link').forEach(function (l) {
      var href = l.getAttribute('href');
      var casa = window.location.hash ? href === completo : href === atual;
      if (casa) l.setAttribute('aria-current', 'page'); else l.removeAttribute('aria-current');
    });
  }

  /* ---------- Painel de acessibilidade ---------- */
  function opcaoRadio(nome, valor, texto, marcado) {
    var rotulo = criar('label', 'rotulo-linha');
    var input = document.createElement('input');
    input.type = 'radio';
    input.name = nome;
    input.value = valor;
    input.checked = marcado;
    rotulo.append(input, texto);
    return rotulo;
  }

  function montarPainelA11y() {
    var p = Object.assign({}, window.PortalTema.PADRAO, window.PortalTema.ler() || {});

    painelA11y = criar('aside', 'gaveta');
    painelA11y.id = 'painel-a11y';
    painelA11y.hidden = true;
    painelA11y.setAttribute('role', 'dialog');
    painelA11y.setAttribute('aria-modal', 'true');
    painelA11y.setAttribute('aria-labelledby', 'titulo-a11y');

    var cab = criar('div', 'gaveta-cab');
    var titulo = criar('h2', '', 'Acessibilidade');
    titulo.id = 'titulo-a11y';
    var fechar = criar('button', 'btn-secundario btn-pequeno', 'Fechar');
    fechar.type = 'button';
    fechar.id = 'fechar-a11y';
    cab.append(titulo, fechar);

    var corpo = criar('div', 'gaveta-corpo');

    var temas = criar('fieldset');
    temas.appendChild(criar('legend', '', 'Tema'));
    [['padrao', 'Padrão'], ['noturno', 'Noturno'], ['contraste', 'Alto contraste'], ['cinza', 'Escala de cinza']]
      .forEach(function (t) { temas.appendChild(opcaoRadio('a11y-tema', t[0], t[1], p.tema === t[0])); });

    var fontes = criar('fieldset');
    fontes.appendChild(criar('legend', '', 'Fonte'));
    fontes.appendChild(opcaoRadio('a11y-fonte', 'padrao', 'Padrão (Atkinson Hyperlegible)', p.fonte === 'padrao'));
    fontes.appendChild(opcaoRadio('a11y-fonte', 'lexend', 'Lexend (facilita a leitura na dislexia)', p.fonte === 'lexend'));

    var tamanho = criar('div');
    var rotuloTam = criar('label', '', 'Tamanho do texto: ');
    rotuloTam.setAttribute('for', 'a11y-tamanho');
    rotuloTam.style.fontWeight = '800';
    var saidaTam = criar('output', '', p.tamanhoTexto + 'px');
    saidaTam.id = 'a11y-tamanho-valor';
    rotuloTam.appendChild(saidaTam);
    var rangeTam = document.createElement('input');
    rangeTam.type = 'range'; rangeTam.id = 'a11y-tamanho'; rangeTam.min = '14'; rangeTam.max = '24'; rangeTam.step = '1';
    rangeTam.value = String(p.tamanhoTexto);
    tamanho.append(rotuloTam, rangeTam);

    var espaco = criar('div');
    var rotuloEsp = criar('label', '', 'Espaçamento entre linhas: ');
    rotuloEsp.setAttribute('for', 'a11y-espaco');
    rotuloEsp.style.fontWeight = '800';
    var saidaEsp = criar('output', '', Number(p.espacamento).toFixed(1));
    saidaEsp.id = 'a11y-espaco-valor';
    rotuloEsp.appendChild(saidaEsp);
    var rangeEsp = document.createElement('input');
    rangeEsp.type = 'range'; rangeEsp.id = 'a11y-espaco'; rangeEsp.min = '1.2'; rangeEsp.max = '2.4'; rangeEsp.step = '0.1';
    rangeEsp.value = String(p.espacamento);
    espaco.append(rotuloEsp, rangeEsp);

    corpo.append(temas, fontes, tamanho, espaco);

    var rodape = criar('div', 'gaveta-rodape');
    var estado = criar('p', 'estado-sync');
    estado.id = 'estado-sync';
    estado.setAttribute('role', 'status');
    var restaurar = criar('button', 'btn-secundario', 'Restaurar padrão');
    restaurar.type = 'button';
    rodape.append(estado, restaurar);

    painelA11y.append(cab, corpo, rodape);
    document.body.appendChild(painelA11y);

    function ler() {
      var tema = painelA11y.querySelector('input[name="a11y-tema"]:checked');
      var fonte = painelA11y.querySelector('input[name="a11y-fonte"]:checked');
      return {
        tema: tema ? tema.value : 'padrao',
        fonte: fonte ? fonte.value : 'padrao',
        tamanhoTexto: parseInt(rangeTam.value, 10),
        espacamento: Math.round(parseFloat(rangeEsp.value) * 10) / 10,
      };
    }

    function aoMudar() {
      var novo = ler();
      saidaTam.textContent = novo.tamanhoTexto + 'px';
      saidaEsp.textContent = novo.espacamento.toFixed(1);
      window.PortalTema.aplicar(novo);
      window.PortalTema.salvar(novo);
      sincronizarComConta(novo, estado);
    }

    painelA11y.addEventListener('change', aoMudar);
    rangeTam.addEventListener('input', aoMudar);
    rangeEsp.addEventListener('input', aoMudar);

    restaurar.addEventListener('click', function () {
      var pad = window.PortalTema.PADRAO;
      painelA11y.querySelector('input[name="a11y-tema"][value="' + pad.tema + '"]').checked = true;
      painelA11y.querySelector('input[name="a11y-fonte"][value="' + pad.fonte + '"]').checked = true;
      rangeTam.value = String(pad.tamanhoTexto);
      rangeEsp.value = String(pad.espacamento);
      aoMudar();
    });

    fechar.addEventListener('click', fecharPainel);
    painelA11y.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { fecharPainel(); return; }
      if (e.key !== 'Tab') return;
      var foc = painelA11y.querySelectorAll('button, input, select, textarea, a[href]');
      if (!foc.length) return;
      var primeiro = foc[0];
      var ultimo = foc[foc.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    });

    var botao = document.getElementById('btn-a11y');
    if (botao) botao.addEventListener('click', function () { abrirPainel(botao); });
  }

  function abrirPainel(quem) {
    if (!painelA11y) return;
    botaoQueAbriu = quem || document.activeElement;
    painelA11y.hidden = false;
    document.getElementById('fechar-a11y').focus();
  }

  function fecharPainel() {
    if (!painelA11y) return;
    painelA11y.hidden = true;
    if (botaoQueAbriu && botaoQueAbriu.focus) botaoQueAbriu.focus();
  }

  /** Guarda as preferências também na conta (se a pessoa estiver logada). */
  function sincronizarComConta(prefs, estado) {
    if (!usuario || typeof EduAPI === 'undefined') {
      estado.textContent = 'Salvo neste navegador.';
      return;
    }
    estado.textContent = 'Salvando na sua conta…';
    clearTimeout(temporizadorSync);
    temporizadorSync = setTimeout(function () {
      var formato = (usuario.preferencias && usuario.preferencias.formato) || 'texto';
      EduAPI.atualizarAcessibilidade(Array.from(usuario.necessidades || []), {
        tema: prefs.tema,
        fonte: prefs.fonte,
        tamanhoTexto: prefs.tamanhoTexto,
        espacamento: prefs.espacamento,
        formato: formato,
      }).then(function (u) {
        usuario = u;
        estado.textContent = 'Salvo na sua conta.';
      }).catch(function () {
        estado.textContent = 'Salvo neste navegador (não foi possível salvar na conta agora).';
      });
    }, 700);
  }

  /* ---------- Quem está logado ---------- */
  function mostrarUsuario(u) {
    usuario = u;
    document.getElementById('nome-usuario').textContent = u.nome;
    document.getElementById('avatar').textContent = u.nome.trim().charAt(0).toUpperCase();
    var selo = document.getElementById('papel-usuario');
    selo.textContent = PAPEIS[u.papel] || u.papel;
    selo.hidden = false;
    var sair = document.getElementById('link-sair');
    sair.textContent = 'Sair';

    document.querySelectorAll('#menu-lateral .menu-grupo').forEach(function (g) {
      g.hidden = g.dataset.papeis.split(',').indexOf(u.papel) === -1;
    });

    // primeira visita neste navegador: usa as preferências guardadas na conta
    if (!window.PortalTema.ler() && u.preferencias) {
      var c = u.preferencias;
      var daConta = { tema: c.tema, fonte: c.fonte, tamanhoTexto: c.tamanhoTexto, espacamento: Number(c.espacamento) };
      window.PortalTema.aplicar(daConta);
      window.PortalTema.salvar(daConta);
      var campo = function (nome, valor) {
        var el = painelA11y && painelA11y.querySelector('input[name="' + nome + '"][value="' + valor + '"]');
        if (el) el.checked = true;
      };
      campo('a11y-tema', daConta.tema);
      campo('a11y-fonte', daConta.fonte);
      var rt = document.getElementById('a11y-tamanho');
      var re = document.getElementById('a11y-espaco');
      if (rt) { rt.value = String(daConta.tamanhoTexto); document.getElementById('a11y-tamanho-valor').textContent = daConta.tamanhoTexto + 'px'; }
      if (re) { re.value = String(daConta.espacamento); document.getElementById('a11y-espaco-valor').textContent = daConta.espacamento.toFixed(1); }
    }
  }

  function carregarUsuario() {
    if (typeof EduAPI === 'undefined' || !EduAPI.estaLogado()) return;
    EduAPI.usuarioAtual().then(mostrarUsuario).catch(function () { /* a página mostra o aviso */ });
  }

  /* ---------- Início ---------- */
  montarTopo();
  montarMenu();
  ligarMenuMovel();
  montarPainelA11y();
  var sair = document.getElementById('link-sair');
  if (sair) sair.addEventListener('click', function () { if (typeof EduAPI !== 'undefined') EduAPI.sair(); });
  carregarUsuario();

  window.Portal = {
    abrirPainelA11y: function () { abrirPainel(document.activeElement); },
    usuario: function () { return usuario; },
  };
})();
