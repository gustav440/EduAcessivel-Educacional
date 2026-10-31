/**
 * admin.js — painel da administração: denúncias, punições e remoção de conteúdo.
 * Depende de: ../js/api.js (window.EduAPI). Só contas ADMIN entram.
 * Todo texto vindo do servidor é inserido com textContent (nunca como HTML).
 */
(function () {
  "use strict";

  const MOTIVOS = {
    SPAM: 'Spam ou propaganda',
    ASSEDIO: 'Assédio ou ofensa',
    CONTEUDO_IMPROPRIO: 'Conteúdo impróprio',
    DIREITOS_AUTORAIS: 'Violação de direitos autorais',
    INFORMACAO_FALSA: 'Informação falsa',
    OUTRO: 'Outro motivo',
  };
  const PAPEIS = { ALUNO: 'Aluno', PROFESSOR: 'Professor', ADMIN: 'Administrador' };
  const STATUS = { ABERTA: 'Aberta', PROCEDENTE: 'Procedente', IMPROCEDENTE: 'Improcedente' };
  const PUNICOES = { ADVERTENCIA: 'Advertência', SUSPENSAO: 'Suspensão', BANIMENTO: 'Banimento' };
  const ICONES_MATERIAL = { VIDEO: '🎬', PDF: '📄', AUDIO: '🎧' };

  const $ = (id) => document.getElementById(id);
  const aviso = $('aviso');
  const abas = Array.from(document.querySelectorAll('.aba'));
  let usuario = null;

  /* ---------- Ajudantes ---------- */
  function criar(tag, classe, texto) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto !== undefined) el.textContent = texto;
    return el;
  }

  function botao(texto, classe, aoClicar, rotulo) {
    const b = criar('button', classe, texto);
    b.type = 'button';
    if (rotulo) b.setAttribute('aria-label', rotulo);
    b.addEventListener('click', aoClicar);
    return b;
  }

  function mostrarAviso(texto, ehErro) {
    aviso.textContent = texto;
    aviso.className = ehErro ? 'login-alerta' : 'aviso-sugestao';
    aviso.hidden = false;
    aviso.scrollIntoView({ block: 'nearest' });
  }

  function limparAviso() { aviso.hidden = true; }

  function textoDoErro(erro) {
    const detalhes = Object.values(erro.campos || {});
    return erro.message + (detalhes.length ? ' ' + detalhes.join(' ') : '');
  }

  function data(iso) {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function tamanho(bytes) {
    const mb = 1024 * 1024;
    return bytes >= mb ? (bytes / mb).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }

  /** <label> que envolve o campo, para leitores de tela ligarem o texto ao controle */
  function rotular(texto, controle) {
    const label = criar('label', 'rotulo-campo');
    label.append(criar('span', '', texto), controle);
    return label;
  }

  function opcao(valor, texto) {
    const o = criar('option', '', texto);
    o.value = valor;
    return o;
  }

  function seletorDePunicao(comVazio) {
    const s = criar('select', 'cfg-select');
    if (comVazio) s.appendChild(opcao('', 'Sem punição ao autor'));
    Object.keys(PUNICOES).forEach(k => s.appendChild(opcao(k, PUNICOES[k])));
    return s;
  }

  /* ---------- Entrada: só administrador ---------- */
  function bloquear(mensagem) {
    $('bloqueio-msg').textContent = mensagem;
    $('area-bloqueada').hidden = false;
  }

  async function iniciar() {
    if (!EduAPI.estaLogado()) {
      bloquear('Entre com uma conta de administrador para acessar este painel.');
      return;
    }
    try {
      usuario = await EduAPI.usuarioAtual();
    } catch (erro) {
      bloquear('Sua sessão expirou, sua conta está restrita ou o servidor está desligado. ' + erro.message);
      return;
    }
    if (usuario.papel !== 'ADMIN') {
      bloquear('Este painel é só para administradores.');
      return;
    }
    $('saudacao').textContent = 'Olá, ' + usuario.nome.split(' ')[0] + '.';
    $('painel').hidden = false;
    mostrarAba('denuncias');
  }

  /* ---------- Abas ---------- */
  function mostrarAba(nome) {
    abas.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.aba === nome)));
    ['denuncias', 'usuarios', 'conteudo'].forEach(n => { $('aba-' + n).hidden = n !== nome; });
    if (nome === 'denuncias') carregarDenuncias();
    if (nome === 'usuarios') carregarUsuarios();
    if (nome === 'conteudo') carregarConteudo();
  }
  abas.forEach(b => b.addEventListener('click', () => { limparAviso(); mostrarAba(b.dataset.aba); }));

  /* =====================================================================
     DENÚNCIAS
     ===================================================================== */
  async function atualizarBadge() {
    try {
      const abertas = await EduAPI.listarDenuncias('ABERTA');
      $('badge-denuncias').textContent = abertas.length ? '(' + abertas.length + ')' : '';
    } catch (e) { /* o aviso principal já cobre erros */ }
  }

  async function carregarDenuncias() {
    const lista = $('lista-denuncias');
    try {
      const itens = await EduAPI.listarDenuncias($('filtro-status').value || undefined);
      lista.replaceChildren();
      if (itens.length === 0) lista.appendChild(criar('p', '', 'Nenhuma denúncia nesta lista.'));
      itens.forEach(d => lista.appendChild(cartaoDaDenuncia(d)));
    } catch (erro) {
      mostrarAviso(textoDoErro(erro), true);
    }
    atualizarBadge();
  }
  $('filtro-status').addEventListener('change', carregarDenuncias);

  function cartaoDaDenuncia(d) {
    const card = criar('article', 'denuncia');

    const cab = criar('div', 'linha-acoes');
    cab.style.justifyContent = 'space-between';
    cab.appendChild(criar('h3', '',
      '#' + d.id + ' — ' + (d.tipoAlvo === 'COMENTARIO' ? 'Comentário' : 'Material') + ' • ' + (MOTIVOS[d.motivo] || d.motivo)));
    cab.appendChild(criar('span', 'pilula pilula-' + d.status.toLowerCase(), STATUS[d.status]));
    card.appendChild(cab);

    card.appendChild(criar('p', 'meta', 'Denunciado por ' + d.denuncianteNome + ' em ' + data(d.criadoEm)));
    card.appendChild(criar('p', 'meta',
      'Autor do conteúdo: ' + d.autorAlvoNome + ' (' + (PAPEIS[d.autorAlvoPapel] || d.autorAlvoPapel) + ')'));
    card.appendChild(criar('blockquote', 'trecho', d.resumoAlvo));
    if (d.descricao) card.appendChild(criar('p', '', 'Detalhes de quem denunciou: ' + d.descricao));
    if (d.alvoRemovido) card.appendChild(criar('span', 'pilula pilula-removido', 'O conteúdo já está removido'));

    if (d.cursoSlug) {
      const ver = criar('a', '', 'Ver na aula');
      ver.href = '../tec.html?curso=' + encodeURIComponent(d.cursoSlug) + '&aula=' + d.aulaNumero;
      ver.target = '_blank';
      ver.rel = 'noopener';
      const p = criar('p', 'meta');
      p.appendChild(ver);
      card.appendChild(p);
    }

    if (d.status === 'ABERTA') {
      card.appendChild(formularioDeDecisao(d));
    } else {
      card.appendChild(criar('p', 'meta',
        'Resolvida em ' + (d.resolvidoEm ? data(d.resolvidoEm) : '—')
        + (d.observacaoAdmin ? '. Observação: ' + d.observacaoAdmin : '.')));
    }
    return card;
  }

  function formularioDeDecisao(d) {
    const form = criar('form', 'form-decisao');
    form.noValidate = true;

    const grupo = criar('fieldset');
    grupo.appendChild(criar('legend', '', 'Sua decisão'));
    const nome = 'decisao-' + d.id;

    function radio(valor, texto) {
      const label = criar('label', 'rotulo-linha');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = nome;
      input.value = valor;
      label.append(input, texto);
      return { label, input };
    }
    const procedente = radio('PROCEDENTE', 'Procedente (a denúncia faz sentido)');
    const improcedente = radio('IMPROCEDENTE', 'Improcedente (arquivar, sem punição)');
    grupo.append(procedente.label, improcedente.label);

    const rotuloRemover = criar('label', 'rotulo-linha');
    const remover = document.createElement('input');
    remover.type = 'checkbox';
    remover.checked = !d.alvoRemovido;
    rotuloRemover.append(remover, 'Remover o conteúdo denunciado');

    const punicao = seletorDePunicao(true);
    const dias = document.createElement('input');
    dias.type = 'number';
    dias.min = '1';
    dias.max = '365';
    dias.value = '7';
    const blocoDias = rotular('Dias de suspensão', dias);
    const motivoPunicao = document.createElement('input');
    motivoPunicao.type = 'text';
    motivoPunicao.maxLength = 500;
    const blocoMotivo = rotular('Motivo da punição (se vazio, usa a observação)', motivoPunicao);

    const observacao = criar('textarea');
    observacao.rows = 2;
    observacao.maxLength = 500;

    const enviar = criar('button', 'btn-primario', 'Registrar decisão');
    enviar.type = 'submit';

    function atualizar() {
      const proc = procedente.input.checked;
      remover.disabled = !proc || d.alvoRemovido;
      punicao.disabled = !proc;
      blocoDias.hidden = !(proc && punicao.value === 'SUSPENSAO');
      blocoMotivo.hidden = !(proc && punicao.value);
    }
    procedente.input.addEventListener('change', atualizar);
    improcedente.input.addEventListener('change', atualizar);
    punicao.addEventListener('change', atualizar);
    atualizar();

    form.append(grupo, rotuloRemover, rotular('Punição ao autor do conteúdo', punicao), blocoDias, blocoMotivo,
      rotular('Observação (fica no registro)', observacao), enviar);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const escolhida = form.querySelector('input[type="radio"]:checked');
      if (!escolhida) {
        mostrarAviso('Escolha "procedente" ou "improcedente" na denúncia #' + d.id + '.', true);
        return;
      }
      const proc = escolhida.value === 'PROCEDENTE';
      const obs = observacao.value.trim();

      let pena = null;
      if (proc && punicao.value) {
        const nDias = punicao.value === 'SUSPENSAO' ? parseInt(dias.value, 10) : null;
        if (punicao.value === 'SUSPENSAO' && !(nDias >= 1 && nDias <= 365)) {
          mostrarAviso('Informe de 1 a 365 dias de suspensão.', true);
          return;
        }
        pena = {
          tipo: punicao.value,
          dias: nDias,
          motivo: motivoPunicao.value.trim() || obs || 'Denúncia procedente: ' + (MOTIVOS[d.motivo] || d.motivo),
        };
      }
      const removerAlvo = proc && remover.checked && !d.alvoRemovido;

      const resumo = proc
        ? 'Marcar como PROCEDENTE' + (removerAlvo ? ', remover o conteúdo' : '')
          + (pena ? ' e aplicar ' + PUNICOES[pena.tipo].toLowerCase() + ' a ' + d.autorAlvoNome : '') + '?'
        : 'Arquivar como IMPROCEDENTE?';
      if (!confirm(resumo)) return;

      enviar.disabled = true;
      try {
        await EduAPI.resolverDenuncia(d.id, {
          decisao: escolhida.value,
          observacao: obs || null,
          removerAlvo,
          punicao: pena,
        });
        mostrarAviso('Denúncia #' + d.id + ' resolvida.', false);
        await carregarDenuncias();
      } catch (erro) {
        mostrarAviso(textoDoErro(erro), true);
        enviar.disabled = false;
      }
    });
    return form;
  }

  /* =====================================================================
     USUÁRIOS E PUNIÇÕES
     ===================================================================== */
  async function carregarUsuarios() {
    const lista = $('lista-usuarios-mod');
    try {
      const usuarios = await EduAPI.usuariosModeracao();
      lista.replaceChildren(...usuarios.map(cartaoDoUsuario));
    } catch (erro) {
      mostrarAviso(textoDoErro(erro), true);
    }
  }

  function cartaoDoUsuario(u) {
    const li = criar('li', 'item-usuario');

    const linha = criar('div', 'linha-acoes');
    linha.style.justifyContent = 'space-between';
    const info = criar('div');
    info.appendChild(criar('strong', '', u.nome));
    info.appendChild(criar('span', 'meta', ' — ' + u.email + ' • ' + (PAPEIS[u.papel] || u.papel)));
    if (u.banido) info.appendChild(criar('span', 'pilula pilula-banido', ' Banido'));
    else if (u.suspensoAte) info.appendChild(criar('span', 'pilula pilula-suspenso', ' Suspenso até ' + data(u.suspensoAte)));
    if (u.advertencias > 0) info.appendChild(criar('span', 'pilula', ' ' + u.advertencias + ' advertência(s)'));
    linha.appendChild(info);

    const acoes = criar('div', 'linha-acoes');
    const papel = criar('select', 'cfg-select');
    papel.style.width = 'auto';
    papel.setAttribute('aria-label', 'Papel de ' + u.nome);
    Object.keys(PAPEIS).forEach(k => papel.appendChild(opcao(k, PAPEIS[k])));
    papel.value = u.papel;
    const salvar = botao('Salvar papel', 'btn-secundario btn-pequeno', async () => {
      try {
        await EduAPI.alterarPapel(u.id, papel.value);
        mostrarAviso('Papel de ' + u.nome + ' atualizado.', false);
        await carregarUsuarios();
      } catch (erro) {
        mostrarAviso(textoDoErro(erro), true);
      }
    });
    if (u.id === usuario.id) { papel.disabled = true; salvar.disabled = true; }
    acoes.append(papel, salvar);

    const extra = criar('div', 'painel-extra');
    if (u.papel !== 'ADMIN') {
      acoes.appendChild(botao('Punir', 'btn-secundario btn-pequeno', () => alternar(extra, 'punir', () => formularioDePunicao(u, extra)),
        'Punir ' + u.nome));
    }
    acoes.appendChild(botao('Histórico', 'btn-secundario btn-pequeno', () => alternar(extra, 'historico', () => historico(u, extra)),
      'Histórico de punições de ' + u.nome));

    linha.appendChild(acoes);
    li.append(linha, extra);
    return li;
  }

  /** abre o painel auxiliar do usuário; clicar de novo no mesmo botão fecha */
  function alternar(extra, modo, montar) {
    if (extra.dataset.modo === modo) {
      extra.replaceChildren();
      extra.dataset.modo = '';
      return;
    }
    extra.replaceChildren();
    extra.dataset.modo = modo;
    montar();
  }

  function formularioDePunicao(u, extra) {
    const form = criar('form');
    form.noValidate = true;
    form.className = 'form-decisao';
    const tipo = seletorDePunicao(false);
    const dias = document.createElement('input');
    dias.type = 'number';
    dias.min = '1';
    dias.max = '365';
    dias.value = '7';
    const blocoDias = rotular('Dias de suspensão', dias);
    const motivo = document.createElement('input');
    motivo.type = 'text';
    motivo.maxLength = 500;
    const enviar = criar('button', 'btn-primario', 'Aplicar punição');
    enviar.type = 'submit';

    function atualizar() { blocoDias.hidden = tipo.value !== 'SUSPENSAO'; }
    tipo.addEventListener('change', atualizar);
    atualizar();

    form.append(rotular('Tipo de punição', tipo), blocoDias, rotular('Motivo (obrigatório)', motivo), enviar);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!motivo.value.trim()) { mostrarAviso('Informe o motivo da punição.', true); motivo.focus(); return; }
      const nDias = tipo.value === 'SUSPENSAO' ? parseInt(dias.value, 10) : null;
      if (tipo.value === 'SUSPENSAO' && !(nDias >= 1 && nDias <= 365)) {
        mostrarAviso('Informe de 1 a 365 dias de suspensão.', true);
        return;
      }
      if (!confirm('Aplicar ' + PUNICOES[tipo.value].toLowerCase() + ' a ' + u.nome + '?')) return;
      enviar.disabled = true;
      try {
        await EduAPI.punirUsuario(u.id, { tipo: tipo.value, dias: nDias, motivo: motivo.value.trim() });
        mostrarAviso('Punição aplicada a ' + u.nome + '.', false);
        await carregarUsuarios();
      } catch (erro) {
        mostrarAviso(textoDoErro(erro), true);
        enviar.disabled = false;
      }
    });
    extra.appendChild(form);
    tipo.focus();
  }

  async function historico(u, extra) {
    try {
      const itens = await EduAPI.historicoPunicoes(u.id);
      if (itens.length === 0) {
        extra.appendChild(criar('p', 'meta', 'Nenhuma punição registrada para ' + u.nome + '.'));
        return;
      }
      itens.forEach(p => {
        const linha = criar('div', 'historico-item');
        let texto = data(p.criadaEm) + ' • ' + PUNICOES[p.tipo] + (p.ate ? ' até ' + data(p.ate) : '')
          + ' • por ' + p.aplicadaPorNome + ' • ' + p.motivo;
        if (p.revogadaEm) texto += ' • revogada em ' + data(p.revogadaEm);
        else if (p.ativa) texto += ' • ATIVA';
        linha.appendChild(criar('span', '', texto + ' '));
        if (p.ativa) {
          linha.appendChild(botao('Revogar', 'btn-secundario btn-pequeno', async () => {
            if (!confirm('Revogar esta punição de ' + u.nome + '?')) return;
            try {
              await EduAPI.revogarPunicao(p.id);
              mostrarAviso('Punição revogada.', false);
              await carregarUsuarios();
            } catch (erro) {
              mostrarAviso(textoDoErro(erro), true);
            }
          }, 'Revogar a punição de ' + u.nome));
        }
        extra.appendChild(linha);
      });
    } catch (erro) {
      mostrarAviso(textoDoErro(erro), true);
    }
  }

  /* =====================================================================
     COMENTÁRIOS E MATERIAIS
     ===================================================================== */
  async function carregarConteudo() {
    try {
      const [comentarios, materiais] = await Promise.all([EduAPI.comentariosAdmin(), EduAPI.materiaisAdmin()]);

      const listaCom = $('lista-comentarios');
      listaCom.replaceChildren();
      if (comentarios.length === 0) listaCom.appendChild(criar('li', '', 'Nenhum comentário ainda.'));
      comentarios.forEach(c => listaCom.appendChild(itemDeComentario(c)));

      const listaMat = $('lista-materiais');
      listaMat.replaceChildren();
      if (materiais.length === 0) listaMat.appendChild(criar('li', '', 'Nenhum material ainda.'));
      materiais.forEach(m => listaMat.appendChild(itemDeMaterial(m)));
    } catch (erro) {
      mostrarAviso(textoDoErro(erro), true);
    }
  }

  function motivoDaRemocao() {
    return prompt('Motivo da remoção (fica no registro da moderação):', '');
  }

  function itemDeComentario(c) {
    const li = criar('li', 'item-usuario');
    const cab = criar('div', 'linha-acoes');
    cab.appendChild(criar('strong', '', c.autorNome));
    cab.appendChild(criar('span', 'meta',
      (PAPEIS[c.autorPapel] || c.autorPapel) + ' • ' + data(c.criadoEm) + ' • aula nº ' + c.aulaId
      + (c.paiId ? ' • resposta' : '')));
    if (c.removido) cab.appendChild(criar('span', 'pilula pilula-removido', 'Removido'));
    li.append(cab, criar('blockquote', 'trecho', c.texto));

    li.appendChild(c.removido
      ? botao('Restaurar', 'btn-secundario btn-pequeno', async () => {
          try { await EduAPI.restaurarComentario(c.id); mostrarAviso('Comentário restaurado.', false); await carregarConteudo(); }
          catch (erro) { mostrarAviso(textoDoErro(erro), true); }
        })
      : botao('Remover', 'btn-secundario btn-pequeno', async () => {
          const motivo = motivoDaRemocao();
          if (motivo === null) return;
          try { await EduAPI.removerComentario(c.id, motivo); mostrarAviso('Comentário removido.', false); await carregarConteudo(); }
          catch (erro) { mostrarAviso(textoDoErro(erro), true); }
        }));
    return li;
  }

  function itemDeMaterial(m) {
    const li = criar('li', 'item-usuario');
    const cab = criar('div', 'linha-acoes');
    cab.appendChild(criar('strong', '', (ICONES_MATERIAL[m.tipo] || '') + ' ' + m.titulo));
    cab.appendChild(criar('span', 'meta',
      m.autorNome + ' • ' + data(m.criadoEm) + ' • ' + tamanho(m.tamanhoBytes) + ' • aula nº ' + m.aulaId));
    if (m.removido) cab.appendChild(criar('span', 'pilula pilula-removido', 'Removido'));
    li.appendChild(cab);
    if (m.removido && m.motivoRemocao) li.appendChild(criar('p', 'meta', 'Motivo da remoção: ' + m.motivoRemocao));

    const acoes = criar('div', 'linha-acoes');
    if (!m.removido) {
      const abrir = criar('a', '', 'Abrir arquivo');
      abrir.href = EduAPI.urlArquivo(m.id);
      abrir.target = '_blank';
      abrir.rel = 'noopener';
      acoes.appendChild(abrir);
    }
    acoes.appendChild(m.removido
      ? botao('Restaurar', 'btn-secundario btn-pequeno', async () => {
          try { await EduAPI.restaurarMaterial(m.id); mostrarAviso('Material restaurado.', false); await carregarConteudo(); }
          catch (erro) { mostrarAviso(textoDoErro(erro), true); }
        })
      : botao('Remover', 'btn-secundario btn-pequeno', async () => {
          const motivo = motivoDaRemocao();
          if (motivo === null) return;
          try { await EduAPI.removerMaterial(m.id, motivo); mostrarAviso('Material removido.', false); await carregarConteudo(); }
          catch (erro) { mostrarAviso(textoDoErro(erro), true); }
        }));
    li.appendChild(acoes);
    return li;
  }

  /* ---------- Sair ---------- */
  $('link-sair').addEventListener('click', () => EduAPI.sair());

  iniciar();
})();
