(function () {
  "use strict";
  const { iniciarGuia, guiaJaVisto, marcarGuiaVisto } = window.EduAcessivel;

  const grade = document.querySelector('.grade-cursos');
  const chips = Array.from(document.querySelectorAll('.filtro-chip'));

  /* Texto do botão -> código que a API entende */
  const CODIGO_DO_RECURSO = {
    'Transcrição': 'transcricao',
    'Áudio descritivo': 'audiodescricao',
    'Libras': 'libras',
    'Legenda': 'legenda',
    'Leitura fácil': 'leitura-facil',
  };
  /* Código da API -> texto mostrado na tag do card */
  const ROTULO_DO_RECURSO = {};
  Object.keys(CODIGO_DO_RECURSO).forEach(rotulo => {
    ROTULO_DO_RECURSO[CODIGO_DO_RECURSO[rotulo]] = rotulo;
  });

  const filtrosAtivos = new Set(); // guarda os códigos (ex.: 'libras')
  const busca = new URLSearchParams(window.location.search).get('busca') || '';
  let ultimaBusca = 0;

  /* leitores de tela avisam quando a lista muda */
  grade.setAttribute('aria-live', 'polite');

  /* ---------- Filtros ---------- */
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const ligado = chip.getAttribute('aria-pressed') === 'true';
      chip.setAttribute('aria-pressed', String(!ligado));
      const codigo = CODIGO_DO_RECURSO[chip.textContent.trim()];
      if (!codigo) return;
      ligado ? filtrosAtivos.delete(codigo) : filtrosAtivos.add(codigo);
      carregarCursos();
    });
  });

  /* ---------- Cards ---------- */
  function formatarDuracao(min) {
    if (min < 60) return min + ' min';
    const horas = Math.floor(min / 60);
    const resto = min % 60;
    return horas + 'h' + (resto ? ' ' + resto + ' min' : '');
  }

  function criarCard(curso) {
    const card = document.createElement('article');
    card.className = 'card-curso';
    card.setAttribute('aria-label', curso.titulo);

    const titulo = document.createElement('h3');
    if (curso.totalAulas > 0) {
      const link = document.createElement('a');
      link.href = '../tec.html?curso=' + encodeURIComponent(curso.slug) + '&aula=1';
      link.textContent = curso.titulo;
      titulo.appendChild(link);
    } else {
      titulo.textContent = curso.titulo;
    }

    const duracao = document.createElement('p');
    duracao.style.cssText = 'font-size:.85rem;margin:.25rem 0 0;';
    duracao.textContent = '⏱ ' + formatarDuracao(curso.duracaoMin) + ' de leitura';

    const tags = document.createElement('div');
    tags.className = 'tags-acessibilidade';
    tags.setAttribute('aria-label', 'Recursos de acessibilidade disponíveis');
    curso.recursos.forEach(codigo => {
      const tag = document.createElement('span');
      tag.className = 'tag-acessibilidade';
      tag.textContent = ROTULO_DO_RECURSO[codigo] || codigo;
      tags.appendChild(tag);
    });

    card.append(titulo, duracao, tags);
    return card;
  }

  function mostrarMensagem(texto, ehErro) {
    const p = document.createElement('p');
    p.textContent = texto;
    if (ehErro) p.setAttribute('role', 'alert');
    grade.replaceChildren(p);
  }

  async function carregarCursos() {
    const minhaBusca = ++ultimaBusca;
    try {
      const cursos = await EduAPI.listarCursos({ busca, recursos: Array.from(filtrosAtivos) });
      if (minhaBusca !== ultimaBusca) return; // já existe uma busca mais nova
      if (cursos.length === 0) {
        mostrarMensagem(busca
          ? 'Nenhum curso encontrado para "' + busca + '".'
          : 'Nenhum curso encontrado com esses recursos.');
        return;
      }
      grade.replaceChildren(...cursos.map(criarCard));
    } catch (erro) {
      if (minhaBusca !== ultimaBusca) return;
      mostrarMensagem('Não foi possível carregar os cursos. ' + erro.message, true);
    }
  }

  /* ---------- Sair: apaga o login guardado ---------- */
  Array.from(document.querySelectorAll('a')).forEach(link => {
    if (link.textContent.trim() === 'Sair') {
      link.addEventListener('click', () => EduAPI.sair());
    }
  });

  /* ---------- Guia (tour) desta página ---------- */
  const passosTour = [
    { titulo: 'Este é o Hub de Cursos', texto: 'Aqui ficam todas as suas matérias, já organizadas com as tags de acessibilidade de cada material.' },
    { alvo: '[data-tour="hub-filtros"]', titulo: 'Filtrar por recurso', texto: 'Use estes filtros para ver só o conteúdo que tem, por exemplo, transcrição ou áudio explicativo.' },
    { alvo: '[data-tour="hub-cards"]', titulo: 'Cards de curso', texto: 'Cada card mostra o tempo estimado de leitura e quais recursos de acessibilidade aquele material já tem.' },
    { alvo: '[data-tour="painel-acessibilidade"]', titulo: 'Suas preferências continuam ativas', texto: 'O painel de acessibilidade do topo funciona em todo o site — não precisa reconfigurar nada.' }
  ];

  document.getElementById('btn-ajuda').addEventListener('click', () => iniciarGuia(passosTour));

  if (!guiaJaVisto('hub')) {
    marcarGuiaVisto('hub');
    setTimeout(() => iniciarGuia(passosTour), 600);
  }

  carregarCursos();
})();