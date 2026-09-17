/**
 * comum.js — funções compartilhadas em todas as páginas do EduAcessível
 * Expõe: window.EduAcessivel
 */
(function () {
  "use strict";

  /* ================================================================
     1. PERSISTÊNCIA DE PREFERÊNCIAS
     ================================================================ */
  const CHAVE_PREFS = 'eduacessivel_prefs';

  function carregarPrefs() {
    try { return JSON.parse(localStorage.getItem(CHAVE_PREFS)) || {}; }
    catch { return {}; }
  }

  function salvarPrefs(prefs) {
    localStorage.setItem(CHAVE_PREFS, JSON.stringify(prefs));
  }

  /* ================================================================
     2. APLICAÇÃO DOS MODOS DE ACESSIBILIDADE NO <body>
     ================================================================ */
  const MODOS = ['contraste-alto', 'modo-noturno', 'escala-cinza', 'fonte-dislexia', 'modo-foco'];

  function aplicarModos(prefs) {
    MODOS.forEach(m => document.body.classList.toggle(m, !!prefs[m]));

    if (prefs.tamanhoFonte) {
      document.documentElement.style.setProperty('--fs-base', prefs.tamanhoFonte + 'px');
    }
    if (prefs.espacamento) {
      document.documentElement.style.setProperty('--line-height', prefs.espacamento);
    }
  }

  /* ================================================================
     3. BARRA DE CONFIGURAÇÕES — gaveta lateral
     ================================================================ */

  /* Temas disponíveis */
  const TEMAS = [
    { valor: 'padrao',    icone: '☀️',  label: 'Padrão'    },
    { valor: 'noturno',   icone: '🌙',  label: 'Noturno'   },
    { valor: 'contraste', icone: '◑',   label: 'Contraste' },
    { valor: 'cinza',     icone: '◻',   label: 'Cinza'     },
  ];

  /* Fontes disponíveis */
  const FONTES = [
    { valor: 'padrao', icone: 'Aa', label: 'Padrão'  },
    { valor: 'lexend', icone: 'Aa', label: 'Lexend'  },
  ];

  function temaAtual(prefs) {
    if (prefs['contraste-alto']) return 'contraste';
    if (prefs['modo-noturno'])   return 'noturno';
    if (prefs['escala-cinza'])   return 'cinza';
    return 'padrao';
  }

  function aplicarTema(valor) {
    const p = carregarPrefs();
    p['contraste-alto'] = valor === 'contraste';
    p['modo-noturno']   = valor === 'noturno';
    p['escala-cinza']   = valor === 'cinza';
    salvarPrefs(p);
    aplicarModos(p);
    /* Atualiza estado visual dos botões de tema */
    document.querySelectorAll('[data-cfg-tema]').forEach(btn => {
      const ativo = btn.dataset.cfgTema === valor;
      btn.setAttribute('aria-pressed', String(ativo));
      btn.classList.toggle('ativo', ativo);
    });
  }

  function aplicarFonte(valor) {
    const p = carregarPrefs();
    p['fonte-dislexia'] = valor === 'lexend';
    salvarPrefs(p);
    aplicarModos(p);
    document.querySelectorAll('[data-cfg-fonte]').forEach(btn => {
      const ativo = btn.dataset.cfgFonte === valor;
      btn.setAttribute('aria-pressed', String(ativo));
      btn.classList.toggle('ativo', ativo);
    });
  }

  function construirGaveta() {
    /* Evita duplicar se já existir */
    if (document.getElementById('cfg-gaveta')) return;

    const prefs    = carregarPrefs();
    const temaVal  = temaAtual(prefs);
    const fonteVal = prefs['fonte-dislexia'] ? 'lexend' : 'padrao';
    const focoVal  = !!prefs['modo-foco'];

    /* ----- Fundo ---- */
    const fundo = document.createElement('div');
    fundo.id = 'cfg-fundo';
    fundo.className = 'cfg-fundo';
    fundo.setAttribute('aria-hidden', 'true');

    /* ----- Gaveta ----- */
    const gaveta = document.createElement('aside');
    gaveta.id = 'cfg-gaveta';
    gaveta.className = 'cfg-gaveta';
    gaveta.setAttribute('role', 'dialog');
    gaveta.setAttribute('aria-modal', 'true');
    gaveta.setAttribute('aria-label', 'Configurações de acessibilidade');

    /* --- Opções de tema --- */
    const opcoesTema = TEMAS.map(t => `
      <button class="cfg-opcao${t.valor === temaVal ? ' ativo' : ''}"
              data-cfg-tema="${t.valor}"
              aria-pressed="${t.valor === temaVal}"
              title="${t.label}">
        <span class="cfg-icone" aria-hidden="true">${t.icone}</span>
        <span>${t.label}</span>
      </button>`).join('');

    /* --- Opções de fonte --- */
    const opcoesFonte = FONTES.map(f => `
      <button class="cfg-opcao${f.valor === fonteVal ? ' ativo' : ''}"
              data-cfg-fonte="${f.valor}"
              aria-pressed="${f.valor === fonteVal}"
              style="font-family:${f.valor === 'lexend' ? "'Lexend',sans-serif" : 'inherit'};"
              title="${f.label}">
        <span class="cfg-icone" aria-hidden="true" style="font-size:1.15rem;font-weight:700;">${f.icone}</span>
        <span>${f.label}</span>
      </button>`).join('');

    gaveta.innerHTML = `
      <div class="cfg-cabecalho">
        <h2 id="cfg-titulo">⚙ Configurações</h2>
        <button class="cfg-fechar" id="cfg-fechar" aria-label="Fechar configurações">✕</button>
      </div>

      <div class="cfg-corpo">

        <div class="cfg-grupo">
          <p class="cfg-grupo-titulo">Tema</p>
          <div class="cfg-opcoes" role="group" aria-label="Selecionar tema">
            ${opcoesTema}
          </div>
        </div>

        <div class="cfg-grupo">
          <p class="cfg-grupo-titulo">Fonte</p>
          <div class="cfg-opcoes" role="group" aria-label="Selecionar fonte">
            ${opcoesFonte}
          </div>
        </div>

        <div class="cfg-grupo">
          <p class="cfg-grupo-titulo">Foco</p>
          <button class="cfg-toggle-foco" id="cfg-foco"
                  aria-pressed="${focoVal}"
                  aria-describedby="cfg-foco-desc">
            <span>Modo foco</span>
            <span class="cfg-toggle-track" aria-hidden="true">
              <span class="cfg-toggle-thumb"></span>
            </span>
          </button>
          <p id="cfg-foco-desc" style="font-size:.78rem;color:var(--ink-soft);margin:0;">
            Oculta elementos secundários para facilitar a leitura.
          </p>
        </div>

      </div>

      <div class="cfg-rodape">
        <button class="cfg-resetar" id="cfg-resetar">Restaurar padrões</button>
      </div>`;

    document.body.append(fundo, gaveta);

    /* ----- Eventos ----- */

    /* Botão flutuante */
    const btnAbrir = document.getElementById('cfg-btn');
    if (btnAbrir) {
      btnAbrir.addEventListener('click', abrirGaveta);
    }

    /* Fechar */
    document.getElementById('cfg-fechar').addEventListener('click', fecharGaveta);
    fundo.addEventListener('click', fecharGaveta);

    /* Escape */
    gaveta.addEventListener('keydown', e => {
      if (e.key === 'Escape') fecharGaveta();
      /* Trap focus dentro da gaveta */
      if (e.key === 'Tab') trapFocus(e, gaveta);
    });

    /* Temas */
    gaveta.querySelectorAll('[data-cfg-tema]').forEach(btn => {
      btn.addEventListener('click', () => aplicarTema(btn.dataset.cfgTema));
    });

    /* Fontes */
    gaveta.querySelectorAll('[data-cfg-fonte]').forEach(btn => {
      btn.addEventListener('click', () => aplicarFonte(btn.dataset.cfgFonte));
    });

    /* Foco */
    const btnFoco = document.getElementById('cfg-foco');
    btnFoco.addEventListener('click', () => {
      const p = carregarPrefs();
      p['modo-foco'] = !p['modo-foco'];
      salvarPrefs(p);
      aplicarModos(p);
      btnFoco.setAttribute('aria-pressed', String(!!p['modo-foco']));
    });

    /* Resetar */
    document.getElementById('cfg-resetar').addEventListener('click', () => {
      salvarPrefs({});
      aplicarModos({});
      /* Reinicia visual */
      aplicarTema('padrao');
      aplicarFonte('padrao');
      btnFoco.setAttribute('aria-pressed', 'false');
      document.documentElement.style.removeProperty('--fs-base');
      document.documentElement.style.removeProperty('--line-height');
    });
  }

  function abrirGaveta() {
    const gaveta = document.getElementById('cfg-gaveta');
    const fundo  = document.getElementById('cfg-fundo');
    const btn    = document.getElementById('cfg-btn');
    if (!gaveta) return;
    gaveta.classList.add('aberta');
    fundo.classList.add('aberto');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    /* Foco no primeiro elemento interativo */
    setTimeout(() => {
      const primeiro = gaveta.querySelector('button, [href], input, select');
      if (primeiro) primeiro.focus();
    }, 230);
  }

  function fecharGaveta() {
    const gaveta = document.getElementById('cfg-gaveta');
    const fundo  = document.getElementById('cfg-fundo');
    const btn    = document.getElementById('cfg-btn');
    if (!gaveta) return;
    gaveta.classList.remove('aberta');
    fundo.classList.remove('aberto');
    if (btn) { btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
  }

  /* Mantém foco dentro da gaveta quando está aberta */
  function trapFocus(e, container) {
    const focaveis = Array.from(
      container.querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    );
    if (!focaveis.length) return;
    const primeiro = focaveis[0];
    const ultimo   = focaveis[focaveis.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) {
      e.preventDefault(); ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault(); primeiro.focus();
    }
  }

  function iniciarPainel() {
    const prefs = carregarPrefs();
    aplicarModos(prefs);
    construirGaveta();

    /* Compatibilidade retroativa: selects legados ainda em uso */
    const selTema = document.getElementById('sel-tema');
    if (selTema) {
      selTema.value = temaAtual(prefs);
      selTema.addEventListener('change', () => aplicarTema(selTema.value));
    }
    const selFonte = document.getElementById('sel-fonte');
    if (selFonte) {
      selFonte.value = prefs['fonte-dislexia'] ? 'lexend' : 'padrao';
      selFonte.addEventListener('change', () => aplicarFonte(selFonte.value));
    }
  }

  /* ================================================================
     4. TOUR / GUIA INTERATIVO
     ================================================================ */
  const CHAVE_GUIAS = 'eduacessivel_guias_vistos';

  function guiaJaVisto(id) {
    try { return (JSON.parse(localStorage.getItem(CHAVE_GUIAS)) || []).includes(id); }
    catch { return false; }
  }

  function marcarGuiaVisto(id) {
    try {
      const lista = JSON.parse(localStorage.getItem(CHAVE_GUIAS)) || [];
      if (!lista.includes(id)) { lista.push(id); localStorage.setItem(CHAVE_GUIAS, JSON.stringify(lista)); }
    } catch {}
  }

  /* SVG do avatar mascote */
  function svgAvatar(classe) {
    return `<svg class="guia-avatar ${classe}" viewBox="0 0 56 56" aria-hidden="true" focusable="false">
      <circle cx="28" cy="28" r="28" fill="var(--primary)"/>
      <ellipse cx="20" cy="26" rx="5" ry="6" fill="var(--primary-ink)" opacity=".9"/>
      <ellipse cx="36" cy="26" rx="5" ry="6" fill="var(--primary-ink)" opacity=".9"/>
      <ellipse class="guia-olho" cx="20" cy="27" rx="2.5" ry="3" fill="var(--ink)"/>
      <ellipse class="guia-olho atraso" cx="36" cy="27" rx="2.5" ry="3" fill="var(--ink)"/>
      <path d="M21 37 Q28 43 35 37" stroke="var(--primary-ink)" stroke-width="2" fill="none" stroke-linecap="round" opacity=".85"/>
    </svg>`;
  }

  let guiaAtivo = null;

  function iniciarGuia(passos) {
    encerrarGuia();

    const fundo = document.createElement('div');
    fundo.className = 'guia-fundo';
    fundo.setAttribute('aria-hidden', 'true');

    const destaque = document.createElement('div');
    destaque.className = 'guia-destaque';
    destaque.setAttribute('aria-hidden', 'true');

    const cartao = document.createElement('div');
    cartao.className = 'guia-cartao';
    cartao.setAttribute('role', 'dialog');
    cartao.setAttribute('aria-modal', 'true');
    cartao.setAttribute('aria-live', 'polite');

    document.body.append(fundo, destaque, cartao);
    requestAnimationFrame(() => fundo.classList.add('ativo'));

    let passoAtual = 0;

    function renderPasso(idx) {
      const passo = passos[idx];
      const total = passos.length;
      const alvo  = passo.alvo ? document.querySelector(passo.alvo) : null;
      const ehCentral = !alvo;

      cartao.className = 'guia-cartao' + (ehCentral ? ' centralizado' : '');

      cartao.innerHTML = `
        <p class="guia-passo">Passo ${idx + 1} de ${total}</p>
        <div class="guia-cabecalho">
          ${svgAvatar(ehCentral ? 'grande entrando' : 'pequeno entrando')}
          <p class="guia-nome">Ada</p>
        </div>
        <h3>${passo.titulo}</h3>
        <p>${passo.texto}</p>
        <div class="guia-acoes">
          <div class="esquerda">
            ${idx > 0 ? '<button class="guia-botao secundario" id="guia-ant">← Anterior</button>' : ''}
            <button class="guia-link" id="guia-fechar">Fechar</button>
          </div>
          <button class="guia-botao" id="guia-prox">
            ${idx < total - 1 ? 'Próximo →' : 'Concluir ✓'}
          </button>
        </div>`;

      if (alvo) {
        posicionarDestaque(alvo);
        posicionarCartaoProximo(alvo, cartao);
        destaque.style.display = '';
      } else {
        destaque.style.display = 'none';
      }

      cartao.querySelector('#guia-prox').focus();
      cartao.querySelector('#guia-prox').addEventListener('click', () => {
        if (idx < total - 1) { passoAtual++; renderPasso(passoAtual); }
        else encerrarGuia();
      });
      cartao.querySelector('#guia-fechar').addEventListener('click', encerrarGuia);
      const ant = cartao.querySelector('#guia-ant');
      if (ant) ant.addEventListener('click', () => { passoAtual--; renderPasso(passoAtual); });

      /* Fechar com Escape */
      cartao.onkeydown = e => { if (e.key === 'Escape') encerrarGuia(); };
    }

    renderPasso(0);
    guiaAtivo = { fundo, destaque, cartao };

    /* Fechar ao clicar no fundo */
    fundo.addEventListener('click', encerrarGuia);
  }

  function posicionarDestaque(el) {
    const r = el.getBoundingClientRect();
    const pad = 6;
    const d = document.querySelector('.guia-destaque');
    if (!d) return;
    d.style.top    = (r.top  - pad) + 'px';
    d.style.left   = (r.left - pad) + 'px';
    d.style.width  = (r.width  + pad * 2) + 'px';
    d.style.height = (r.height + pad * 2) + 'px';
  }

  function posicionarCartaoProximo(alvo, cartao) {
    const r = alvo.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cw = 340;
    const margem = 14;

    let top  = r.bottom + margem;
    let left = r.left;

    if (top + 200 > vh) top = r.top - 200 - margem;
    if (left + cw  > vw) left = vw - cw - margem;
    if (left < margem) left = margem;

    cartao.style.top  = Math.max(margem, top)  + 'px';
    cartao.style.left = left + 'px';
    cartao.style.transform = '';
  }

  function encerrarGuia() {
    if (!guiaAtivo) return;
    guiaAtivo.fundo.remove();
    guiaAtivo.destaque.remove();
    guiaAtivo.cartao.remove();
    guiaAtivo = null;
  }

  /* ================================================================
     5. EXPOSIÇÃO PÚBLICA
     ================================================================ */
  window.EduAcessivel = {
    carregarPrefs,
    salvarPrefs,
    aplicarModos,
    iniciarPainel,
    iniciarGuia,
    guiaJaVisto,
    marcarGuiaVisto,
  };

  /* Iniciar painel assim que o DOM estiver pronto */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarPainel);
  } else {
    iniciarPainel();
  }
})();
