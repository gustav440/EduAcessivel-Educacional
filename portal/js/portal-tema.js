/**
 * portal-tema.js — aplica as preferências de leitura ANTES da página aparecer
 * (carregado no <head>, para não piscar). Guarda tudo em localStorage.
 */
(function () {
  "use strict";

  var CHAVE = 'eduacessivel_portal_prefs';
  var PADRAO = { tema: 'padrao', fonte: 'padrao', tamanhoTexto: 16, espacamento: 1.6 };

  function ler() {
    try {
      var salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null');
      return salvo ? Object.assign({}, PADRAO, salvo) : null;
    } catch (e) {
      return null;
    }
  }

  function aplicar(p) {
    var raiz = document.documentElement;
    raiz.classList.toggle('tema-noturno', p.tema === 'noturno');
    raiz.classList.toggle('tema-contraste', p.tema === 'contraste');
    raiz.classList.toggle('tema-cinza', p.tema === 'cinza');
    raiz.classList.toggle('fonte-dislexia', p.fonte === 'lexend');
    raiz.style.setProperty('--fs-base', p.tamanhoTexto + 'px');
    raiz.style.setProperty('--lh', String(p.espacamento));
  }

  function salvar(p) {
    try { localStorage.setItem(CHAVE, JSON.stringify(p)); } catch (e) { /* armazenamento bloqueado */ }
  }

  var inicial = ler();
  if (inicial) aplicar(inicial);

  window.PortalTema = { PADRAO: PADRAO, ler: ler, aplicar: aplicar, salvar: salvar };
})();
