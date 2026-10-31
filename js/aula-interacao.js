/**
 * aula-interacao.js — materiais de apoio, conversa e denúncias na página da aula (tec.html)
 * Depende de: js/api.js (window.EduAPI)
 * Todo texto vindo do servidor é inserido com textContent (nunca como HTML).
 */
(function () {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('curso') || 'introducao-a-programacao';
  const numero = parseInt(params.get('aula') || '1', 10) || 1;
  const PAGINA_LOGIN = 'cadastro-adaptavel/login.html';

  const conteudo = document.querySelector('.lesson-content');
  if (!conteudo) return;

  let usuario = null; // null = visitante
  let aulaId = null;
  let alvoDenuncia = null;

  const MOTIVOS = {
    SPAM: 'Spam ou propaganda',
    ASSEDIO: 'Assédio ou ofensa',
    CONTEUDO_IMPROPRIO: 'Conteúdo impróprio',
    DIREITOS_AUTORAIS: 'Violação de direitos autorais',
    INFORMACAO_FALSA: 'Informação falsa',
    OUTRO: 'Outro motivo',
  };
  const SELOS = { PROFESSOR: 'Professor', ADMIN: 'Administração' };
  const ICONES = { VIDEO: '🎬', PDF: '📄', AUDIO: '🎧' };

  /* ---------- estilos (usam as cores do site, com valores padrão) ---------- */
  const estilo = document.createElement('style');
  estilo.textContent = `
    .int-raiz{margin-top:2rem;display:grid;gap:1.5rem}
    .int-bloco{background:var(--surface,#fff);border:1px solid var(--border,#d9dce5);border-radius:var(--radius,16px);padding:1.25rem}
    .int-bloco h2{margin:0 0 .75rem;font-size:1.25rem}
    .int-bloco h3{margin:0 0 .25rem;font-size:1.05rem}
    .int-material,.int-comentario{border-top:1px solid var(--border,#d9dce5);padding:.9rem 0}
    .int-material video{width:100%;max-width:720px;display:block;margin:.5rem 0;border-radius:8px}
    .int-material audio{width:100%;max-width:720px;display:block;margin:.5rem 0}
    .int-desc,.int-meta{margin:.2rem 0;font-size:.9rem;opacity:.85}
    .int-cab{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}
    .int-selo{font-size:.72rem;font-weight:700;padding:.1rem .55rem;border-radius:999px;background:var(--primary,#5b5ce2);color:#fff}
    .int-data{font-size:.8rem;opacity:.75}
    .int-texto,.int-removido{white-space:pre-wrap;margin:.35rem 0}
    .int-removido{font-style:italic;opacity:.7}
    .int-resposta{margin-left:1.5rem;border-left:3px solid var(--border,#d9dce5);padding-left:.9rem}
    .int-acoes{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.4rem}
    .int-btn{font:inherit;font-size:.85rem;padding:.35rem .85rem;border-radius:999px;border:1px solid var(--primary,#5b5ce2);background:transparent;color:var(--primary,#5b5ce2);cursor:pointer}
    .int-btn.int-primario{background:var(--primary,#5b5ce2);color:#fff}
    .int-btn.int-perigo{border-color:#b42318;color:#b42318}
    .int-btn:disabled{opacity:.5;cursor:not-allowed}
    .int-link{font-size:.9rem;color:var(--primary,#5b5ce2)}
    .int-raiz textarea,.int-dialogo textarea,.int-dialogo select{width:100%;font:inherit;padding:.6rem;border:1px solid var(--border,#d9dce5);border-radius:8px;background:var(--surface,#fff);color:inherit;box-sizing:border-box}
    .int-aviso{padding:.6rem .8rem;border-radius:8px;margin:0}
    .int-aviso[hidden]{display:none}
    .int-ok{background:#e5f0ff;color:#1f2937}
    .int-erro{background:#feecec;color:#b42318}
    .int-vazio{margin:.25rem 0;opacity:.8}
    .int-dialogo{border:1px solid var(--border,#d9dce5);border-radius:12px;padding:1.25rem;max-width:480px;width:90%;background:var(--surface,#fff);color:var(--text,#1f2937)}
    .int-dialogo::backdrop{background:rgba(0,0,0,.5)}
    .int-dialogo label{display:block;font-weight:700;margin:.75rem 0 .25rem}
  `;
  document.head.appendChild(estilo);

  /* ---------- ajudantes ---------- */
  function criar(tag, classe, texto) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto !== undefined) el.textContent = texto;
    return el;
  }

  function botao(texto, classe, aoClicar, rotulo) {
    const b = criar('button', 'int-btn ' + (classe || ''), texto);
    b.type = 'button';
    if (rotulo) b.setAttribute('aria-label', rotulo);
    b.addEventListener('click', aoClicar);
    return b;
  }

  const $ = (id) => document.getElementById(id);

  function mensagem(texto, ehErro) {
    const aviso = $('int-status');
    aviso.textContent = texto;
    aviso.className = 'int-aviso ' + (ehErro ? 'int-erro' : 'int-ok');
    aviso.hidden = false;
  }

  function textoDoErro(erro) {
    const detalhes = Object.values(erro.campos || {});
    return erro.message + (detalhes.length ? ' ' + detalhes.join(' ') : '');
  }

  function formatarTamanho(bytes) {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }

  function formatarData(iso) {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function ehAdmin() { return !!usuario && usuario.papel === 'ADMIN'; }
  function ehDono(autorId) { return !!usuario && usuario.id === autorId; }

  /* ---------- estrutura da seção ---------- */
  function montarEsqueleto() {
    const raiz = criar('section', 'int-raiz');
    raiz.id = 'interacao-aula';

    const status = criar('p', 'int-aviso');
    status.id = 'int-status';
    status.hidden = true;
    status.setAttribute('role', 'status');
    raiz.appendChild(status);

    const materiais = criar('section', 'int-bloco');
    materiais.setAttribute('aria-labelledby', 'int-titulo-materiais');
    const tituloMat = criar('h2', '', 'Materiais de apoio');
    tituloMat.id = 'int-titulo-materiais';
    const listaMat = criar('div');
    listaMat.id = 'int-materiais';
    materiais.append(tituloMat, listaMat);

    const conversa = criar('section', 'int-bloco');
    conversa.setAttribute('aria-labelledby', 'int-titulo-conversa');
    const tituloConv = criar('h2', '', 'Conversa da aula');
    tituloConv.id = 'int-titulo-conversa';
    const formComentar = criar('div');
    formComentar.id = 'int-form-comentar';
    const listaCom = criar('div');
    listaCom.id = 'int-comentarios';
    conversa.append(tituloConv, formComentar, listaCom);

    raiz.append(materiais, conversa);
    conteudo.appendChild(raiz);

    montarFormularioDeComentario();
    montarDialogoDeDenuncia();
  }

  /* ---------- materiais ---------- */
  async function carregarMateriais() {
    const lista = $('int-materiais');
    try {
      const itens = await EduAPI.listarMateriais(aulaId);
      lista.replaceChildren();
      if (itens.length === 0) {
        lista.appendChild(criar('p', 'int-vazio', 'Esta aula ainda não tem materiais de apoio.'));
        return;
      }
      itens.forEach(m => lista.appendChild(cartaoDoMaterial(m)));
    } catch (erro) {
      lista.replaceChildren(criar('p', 'int-aviso int-erro', textoDoErro(erro)));
    }
  }

  function cartaoDoMaterial(m) {
    const card = criar('article', 'int-material');
    card.appendChild(criar('h3', '', ICONES[m.tipo] + ' ' + m.titulo));
    if (m.descricao) card.appendChild(criar('p', 'int-desc', m.descricao));

    const url = EduAPI.urlArquivo(m.id);
    if (m.tipo === 'VIDEO') {
      const video = document.createElement('video');
      video.controls = true;
      video.preload = 'metadata';
      video.src = url;
      video.setAttribute('aria-label', 'Vídeo: ' + m.titulo);
      card.appendChild(video);
    } else if (m.tipo === 'AUDIO') {
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.preload = 'metadata';
      audio.src = url;
      audio.setAttribute('aria-label', 'Áudio: ' + m.titulo);
      card.appendChild(audio);
    }

    const abrir = criar('a', 'int-link', m.tipo === 'PDF' ? 'Abrir PDF em nova aba' : 'Abrir em nova aba');
    abrir.href = url;
    abrir.target = '_blank';
    abrir.rel = 'noopener';
    card.appendChild(abrir);

    card.appendChild(criar('p', 'int-meta',
      'Enviado por ' + m.autorNome + ' em ' + formatarData(m.criadoEm) + ' • ' + formatarTamanho(m.tamanhoBytes)));

    if (usuario) {
      const acoes = criar('div', 'int-acoes');
      if (!ehDono(m.autorId)) {
        acoes.appendChild(botao('Denunciar', '', () => abrirDenuncia('MATERIAL', m.id, m.titulo),
          'Denunciar o material ' + m.titulo));
      }
      if (ehAdmin() || ehDono(m.autorId)) {
        acoes.appendChild(botao('Remover', 'int-perigo', () => removerMaterial(m),
          'Remover o material ' + m.titulo));
      }
      if (acoes.children.length) card.appendChild(acoes);
    }
    return card;
  }

  async function removerMaterial(m) {
    if (!confirm('Remover o material "' + m.titulo + '"?')) return;
    let motivo = null;
    if (ehAdmin() && !ehDono(m.autorId)) {
      motivo = prompt('Motivo da remoção (fica no registro da moderação):', '');
      if (motivo === null) return;
    }
    try {
      await EduAPI.removerMaterial(m.id, motivo);
      mensagem('Material removido.', false);
      await carregarMateriais();
    } catch (erro) {
      mensagem(textoDoErro(erro), true);
    }
  }

  /* ---------- comentários ---------- */
  function montarFormularioDeComentario() {
    const area = $('int-form-comentar');
    if (!usuario) {
      const p = criar('p', 'int-vazio', 'Para comentar, ');
      const link = criar('a', 'int-link', 'entre na sua conta');
      link.href = PAGINA_LOGIN;
      p.append(link, '.');
      area.appendChild(p);
      return;
    }
    const rotulo = criar('label', '', 'Escreva uma pergunta ou comentário para a turma e para o professor');
    rotulo.setAttribute('for', 'int-novo-comentario');
    rotulo.style.fontWeight = '700';
    const campo = criar('textarea');
    campo.id = 'int-novo-comentario';
    campo.rows = 3;
    campo.maxLength = 2000;
    const enviar = botao('Publicar comentário', 'int-primario', async () => {
      if (await enviarComentario(campo.value, null, enviar, campo)) campo.value = '';
    });
    const acoes = criar('div', 'int-acoes');
    acoes.appendChild(enviar);
    area.append(rotulo, campo, acoes);
  }

  async function enviarComentario(texto, paiId, botaoEnviar, campo) {
    if (!texto.trim()) {
      mensagem('Escreva algo antes de enviar.', true);
      campo.focus();
      return false;
    }
    botaoEnviar.disabled = true;
    try {
      await EduAPI.comentar(aulaId, texto.trim(), paiId);
      mensagem('Comentário publicado.', false);
      await carregarComentarios();
      return true;
    } catch (erro) {
      mensagem(textoDoErro(erro), true);
      return false;
    } finally {
      botaoEnviar.disabled = false;
    }
  }

  async function carregarComentarios() {
    const area = $('int-comentarios');
    try {
      const todos = await EduAPI.listarComentarios(aulaId);
      area.replaceChildren();
      if (todos.length === 0) {
        area.appendChild(criar('p', 'int-vazio', 'Ninguém comentou ainda. Seja o primeiro!'));
        return;
      }
      const respostas = new Map();
      todos.filter(c => c.paiId !== null).forEach(c => {
        if (!respostas.has(c.paiId)) respostas.set(c.paiId, []);
        respostas.get(c.paiId).push(c);
      });
      todos.filter(c => c.paiId === null).reverse().forEach(c => {
        const cartao = cartaoDoComentario(c, false);
        (respostas.get(c.id) || []).forEach(r => cartao.appendChild(cartaoDoComentario(r, true)));
        area.appendChild(cartao);
      });
    } catch (erro) {
      area.replaceChildren(criar('p', 'int-aviso int-erro', textoDoErro(erro)));
    }
  }

  function cartaoDoComentario(c, ehResposta) {
    const item = criar('article', 'int-comentario' + (ehResposta ? ' int-resposta' : ''));

    const cab = criar('div', 'int-cab');
    cab.appendChild(criar('strong', '', c.autorNome));
    if (SELOS[c.autorPapel]) cab.appendChild(criar('span', 'int-selo', SELOS[c.autorPapel]));
    cab.appendChild(criar('time', 'int-data', formatarData(c.criadoEm)));
    item.appendChild(cab);

    item.appendChild(criar('p', c.removido ? 'int-removido' : 'int-texto', c.texto));

    if (usuario && !c.removido) {
      const acoes = criar('div', 'int-acoes');
      const areaResposta = criar('div');
      if (!ehResposta) {
        acoes.appendChild(botao('Responder', '', () => mostrarFormularioDeResposta(areaResposta, c),
          'Responder o comentário de ' + c.autorNome));
      }
      if (!ehDono(c.autorId)) {
        acoes.appendChild(botao('Denunciar', '', () => abrirDenuncia('COMENTARIO', c.id, 'Comentário de ' + c.autorNome),
          'Denunciar o comentário de ' + c.autorNome));
      }
      if (ehAdmin() || ehDono(c.autorId)) {
        acoes.appendChild(botao('Remover', 'int-perigo', () => removerComentario(c),
          'Remover o comentário de ' + c.autorNome));
      }
      item.append(acoes, areaResposta);
    }
    return item;
  }

  function mostrarFormularioDeResposta(area, comentario) {
    if (area.firstChild) { area.replaceChildren(); return; } // clicar de novo fecha
    const campo = criar('textarea');
    campo.rows = 2;
    campo.maxLength = 2000;
    campo.setAttribute('aria-label', 'Sua resposta para ' + comentario.autorNome);
    const enviar = botao('Enviar resposta', 'int-primario', () =>
      enviarComentario(campo.value, comentario.id, enviar, campo));
    const cancelar = botao('Cancelar', '', () => area.replaceChildren());
    const acoes = criar('div', 'int-acoes');
    acoes.append(enviar, cancelar);
    area.append(campo, acoes);
    campo.focus();
  }

  async function removerComentario(c) {
    if (!confirm('Remover este comentário?')) return;
    let motivo = null;
    if (ehAdmin() && !ehDono(c.autorId)) {
      motivo = prompt('Motivo da remoção (fica no registro da moderação):', '');
      if (motivo === null) return;
    }
    try {
      await EduAPI.removerComentario(c.id, motivo);
      mensagem('Comentário removido.', false);
      await carregarComentarios();
    } catch (erro) {
      mensagem(textoDoErro(erro), true);
    }
  }

  /* ---------- denúncia ---------- */
  function montarDialogoDeDenuncia() {
    const dialogo = document.createElement('dialog');
    dialogo.className = 'int-dialogo';
    dialogo.id = 'int-dialogo';
    dialogo.setAttribute('aria-labelledby', 'int-dlg-titulo');

    const opcoes = Object.keys(MOTIVOS).map(k => '<option value="' + k + '">' + MOTIVOS[k] + '</option>').join('');
    dialogo.innerHTML =
      '<form id="int-form-denuncia">' +
      '<h2 id="int-dlg-titulo" style="margin-top:0">Denunciar conteúdo</h2>' +
      '<p id="int-dlg-alvo"></p>' +
      '<label for="int-dlg-motivo">Motivo</label>' +
      '<select id="int-dlg-motivo">' + opcoes + '</select>' +
      '<label for="int-dlg-desc">Detalhes (opcional)</label>' +
      '<textarea id="int-dlg-desc" rows="3" maxlength="500"></textarea>' +
      '<div class="int-acoes" style="margin-top:1rem">' +
      '<button type="submit" class="int-btn int-primario" id="int-dlg-enviar">Enviar denúncia</button>' +
      '<button type="button" class="int-btn" id="int-dlg-cancelar">Cancelar</button>' +
      '</div></form>';
    document.body.appendChild(dialogo);

    $('int-dlg-cancelar').addEventListener('click', () => dialogo.close());
    $('int-form-denuncia').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!alvoDenuncia) return;
      const enviar = $('int-dlg-enviar');
      enviar.disabled = true;
      try {
        const r = await EduAPI.denunciar({
          tipoAlvo: alvoDenuncia.tipo,
          alvoId: alvoDenuncia.id,
          motivo: $('int-dlg-motivo').value,
          descricao: $('int-dlg-desc').value.trim() || null,
        });
        dialogo.close();
        mensagem((r && r.mensagem) || 'Denúncia enviada.', false);
      } catch (erro) {
        dialogo.close();
        mensagem(textoDoErro(erro), true);
      }
      enviar.disabled = false;
    });
  }

  function abrirDenuncia(tipo, id, descricaoDoAlvo) {
    alvoDenuncia = { tipo, id };
    $('int-dlg-alvo').textContent = 'Você está denunciando: ' + descricaoDoAlvo;
    $('int-dlg-motivo').value = 'OUTRO';
    $('int-dlg-desc').value = '';
    $('int-dialogo').showModal();
  }

  /* ---------- início ---------- */
  async function iniciar() {
    try {
      if (EduAPI.estaLogado()) {
        try { usuario = await EduAPI.usuarioAtual(); } catch (e) { usuario = null; }
      }
      const aula = await EduAPI.obterAula(slug, numero);
      aulaId = aula.id;
    } catch (erro) {
      return; // a página principal da aula já mostra o aviso
    }
    montarEsqueleto();
    await Promise.all([carregarMateriais(), carregarComentarios()]);
  }

  iniciar();
})();
