(function () {
  "use strict";
  const { iniciarGuia, guiaJaVisto, marcarGuiaVisto } = window.EduAcessivel;

  /* ---------- Filtro dos cards por tag de acessibilidade ---------- */
  const chips = Array.from(document.querySelectorAll('.filtro-chip'));
  const cards = Array.from(document.querySelectorAll('.card-curso'));
  const filtrosAtivos = new Set();

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const ligado = chip.getAttribute('aria-pressed') === 'true';
      chip.setAttribute('aria-pressed', String(!ligado));
      const tag = chip.textContent.trim();
      ligado ? filtrosAtivos.delete(tag) : filtrosAtivos.add(tag);
      aplicarFiltro();
    });
  });

  function aplicarFiltro() {
    cards.forEach(card => {
      const tagsDoCard = Array.from(card.querySelectorAll('.tag-acessibilidade')).map(t => t.textContent.trim());
      const mostrar = filtrosAtivos.size === 0 || tagsDoCard.some(t => filtrosAtivos.has(t));
      card.hidden = !mostrar;
    });
  }

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
})();
