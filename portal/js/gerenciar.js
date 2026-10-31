/**
 * professor.js — painel de conteúdo (professores e administradores)
 * Cursos: criar, editar, excluir. Aulas: montar por blocos. Materiais: vídeo, PDF e áudio.
 * Admin: papéis dos usuários.
 * Depende de: ../js/api.js (window.EduAPI)
 */
(function () {
  "use strict";

  const RECURSOS = [
    ['transcricao', 'Transcrição'],
    ['audiodescricao', 'Áudio descritivo'],
    ['libras', 'Libras'],
    ['legenda', 'Legenda'],
    ['leitura-facil', 'Leitura fácil'],
  ];
  const TIPOS = [
    ['SUBTITULO', 'Subtítulo'],
    ['PARAGRAFO', 'Parágrafo'],
    ['DESTAQUE', 'Destaque (caixa)'],
    ['LISTA_ORDENADA', 'Lista numerada'],
    ['LISTA', 'Lista com marcadores'],
    ['CODIGO', 'Código'],
    ['RESUMO', 'Resumo final'],
  ];
  const DICAS = {
    SUBTITULO: 'Título de uma nova seção da aula.',
    PARAGRAFO: 'Texto corrido.',
    DESTAQUE: 'Caixa de destaque: preencha o título e o texto.',
    LISTA_ORDENADA: 'Escreva um item por linha.',
    LISTA: 'Escreva um item por linha.',
    CODIGO: 'Cole o código e informe a linguagem (ex.: JavaScript, Java).',
    RESUMO: 'Preencha o título e escreva um ponto por linha.',
  };
  const ICONES_MATERIAL = { VIDEO: '🎬', PDF: '📄', AUDIO: '🎧' };
  const MB = 1024 * 1024;

  const $ = (id) => document.getElementById(id);
  const aviso = $('aviso');

  let usuario = null;
  let cursoEditando = null;  // slug do curso em edição (null = curso novo)
  let cursoDasAulas = null;  // slug do curso cujas aulas estão abertas
  let aulaEditando = null;   // número da aula em edição (null = aula nova)
  let aulaDosMateriais = null; // { id, numero, titulo } da aula com a lista de materiais aberta
  let slugManual = false;    // true quando a pessoa digitou o slug na mão

  /* ---------- Ajudantes ---------- */
  function criar(tag, classe, texto) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto !== undefined) el.textContent = texto;
    return el;
  }

  function botao(texto, classe, aoClicar, rotuloAcessivel) {
    const b = criar('button', classe, texto);
    b.type = 'button';
    if (rotuloAcessivel) b.setAttribute('aria-label', rotuloAcessivel);
    b.addEventListener('click', aoClicar);
    return b;
  }

  function mostrarAviso(texto, ehErro) {
    aviso.textContent = texto;
    aviso.className = ehErro ? 'login-alerta' : 'aviso-sugestao';
    aviso.hidden = false;
    aviso.scrollIntoView({ block: 'nearest' });
  }

  function limparAviso() {
    aviso.hidden = true;
  }

  function textoDoErro(erro) {
    const detalhes = Object.values(erro.campos || {});
    return erro.message + (detalhes.length ? ' ' + detalhes.join(' ') : '');
  }

  function rotuloDoRecurso(codigo) {
    const achado = RECURSOS.find(r => r[0] === codigo);
    return achado ? achado[1] : codigo;
  }

  function slugify(texto) {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function formatarTamanho(bytes) {
    if (bytes >= MB) return (bytes / MB).toFixed(1) + ' MB';
    return Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }

  /* ---------- Entrada: só professor ou administrador ---------- */
  function bloquear(mensagem) {
    $('bloqueio-msg').textContent = mensagem;
    $('area-bloqueada').hidden = false;
  }

  async function iniciar() {
    if (!EduAPI.estaLogado()) {
      bloquear('Entre na sua conta de professor ou administrador para acessar este painel.');
      return;
    }
    try {
      usuario = await EduAPI.usuarioAtual();
    } catch (erro) {
      bloquear('Sua sessão expirou, sua conta está restrita ou o servidor está desligado. ' + erro.message);
      return;
    }
    if (usuario.papel === 'ALUNO') {
      bloquear('Este painel é só para professores e administradores.');
      return;
    }

    $('saudacao').textContent =
      'Olá, ' + usuario.nome.split(' ')[0] + ' (' + usuario.papel.toLowerCase() + ').';
    $('painel').hidden = false;
    if (usuario.papel === 'ADMIN') {
      $('area-usuarios').hidden = false;
      $('link-admin').hidden = false;
      carregarUsuarios();
    }
    carregarCursos();
  }

  /* ---------- Cursos ---------- */
  async function carregarCursos() {
    const lista = $('lista-cursos');
    try {
      const cursos = await EduAPI.listarCursos();
      lista.replaceChildren(...cursos.map(cartaoDoCurso));
      if (cursos.length === 0) lista.textContent = 'Nenhum curso cadastrado ainda.';
    } catch (erro) {
      mostrarAviso(textoDoErro(erro), true);
    }
  }

  function cartaoDoCurso(c) {
    const card = criar('article', 'card-curso');
    card.setAttribute('aria-label', c.titulo);
    card.appendChild(criar('h3', '', c.titulo));
    card.appendChild(criar('p', 'meta-curso',
      c.categoria + ' • ' + c.nivel + ' • ' + c.duracaoMin + ' min • ' + c.totalAulas + ' aula(s)'
      + (c.publicado ? '' : ' • RASCUNHO')));

    const tags = criar('div', 'tags-acessibilidade');
    c.recursos.forEach(r => tags.appendChild(criar('span', 'tag-acessibilidade', rotuloDoRecurso(r))));
    card.appendChild(tags);

    const acoes = criar('div', 'linha-acoes');
    acoes.style.marginTop = '.8rem';
    acoes.append(
      botao('Editar dados', 'btn-secundario btn-pequeno', () => abrirFormCurso(c)),
      botao('Gerenciar aulas', 'btn-secundario btn-pequeno', () => abrirAulas(c)),
      botao('Excluir', 'btn-secundario btn-pequeno', () => excluirCurso(c))
    );
    card.appendChild(acoes);
    return card;
  }

  RECURSOS.forEach(([codigo, rotulo]) => {
    const label = criar('label', 'opcao');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = 'c-recurso';
    input.value = codigo;
    const corpo = criar('div');
    corpo.appendChild(criar('strong', '', rotulo));
    label.append(input, corpo);
    $('c-recursos').appendChild(label);
  });

  function abrirFormCurso(curso) {
    limparAviso();
    cursoEditando = curso ? curso.slug : null;
    slugManual = !!curso;
    $('titulo-form-curso').textContent = curso ? 'Editar curso' : 'Novo curso';
    $('c-titulo').value = curso ? curso.titulo : '';
    $('c-slug').value = curso ? curso.slug : '';
    $('c-descricao').value = curso ? curso.descricao : '';
    $('c-categoria').value = curso ? curso.categoria : '';
    $('c-nivel').value = curso ? curso.nivel : 'Iniciante';
    $('c-duracao').value = curso ? curso.duracaoMin : 30;
    $('c-publicado').checked = curso ? curso.publicado : true;
    document.querySelectorAll('input[name="c-recurso"]').forEach(i => {
      i.checked = !!curso && curso.recursos.includes(i.value);
    });
    $('editor-curso').hidden = false;
    $('c-titulo').focus();
  }

  $('btn-novo-curso').addEventListener('click', () => abrirFormCurso(null));
  $('btn-cancelar-curso').addEventListener('click', () => { $('editor-curso').hidden = true; });

  /* gera o slug sozinho enquanto a pessoa digita o título (só em curso novo) */
  $('c-slug').addEventListener('input', () => { slugManual = true; });
  $('c-titulo').addEventListener('input', () => {
    if (!slugManual) $('c-slug').value = slugify($('c-titulo').value);
  });

  $('form-curso').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = {
      slug: $('c-slug').value.trim(),
      titulo: $('c-titulo').value.trim(),
      descricao: $('c-descricao').value.trim(),
      categoria: $('c-categoria').value.trim(),
      nivel: $('c-nivel').value,
      duracaoMin: parseInt($('c-duracao').value, 10) || 0,
      recursos: Array.from(document.querySelectorAll('input[name="c-recurso"]:checked')).map(i => i.value),
      publicado: $('c-publicado').checked,
    };
    const btn = $('btn-salvar-curso');
    btn.disabled = true;
    try {
      if (cursoEditando) await EduAPI.atualizarCurso(cursoEditando, dados);
      else await EduAPI.criarCurso(dados);
      $('editor-curso').hidden = true;
      fecharAulas();
      mostrarAviso('Curso salvo com sucesso.', false);
      await carregarCursos();
    } catch (erro) {
      mostrarAviso(textoDoErro(erro), true);
    }
    btn.disabled = false;
  });

  async function excluirCurso(c) {
    if (!confirm('Excluir o curso "' + c.titulo + '" e todas as suas aulas, comentários e materiais? Isso não pode ser desfeito.')) return;
    try {
      await EduAPI.excluirCurso(c.slug);
      if (cursoDasAulas === c.slug) fecharAulas();
      mostrarAviso('Curso excluído.', false);
      await carregarCursos();
    } catch (erro) {
      mostrarAviso(textoDoErro(erro), true);
    }
  }

  /* ---------- Lista de aulas do curso ---------- */
  function fecharAulas() {
    cursoDasAulas = null;
    aulaDosMateriais = null;
    $('editor-aulas').hidden = true;
    $('editor-aula').hidden = true;
    $('editor-materiais').hidden = true;
  }

  async function abrirAulas(curso) {
    limparAviso();
    cursoDasAulas = curso.slug;
    $('titulo-aulas').textContent = 'Aulas de ' + curso.titulo;
    $('editor-aula').hidden = true;
    $('editor-materiais').hidden = true;
    $('editor-aulas').hidden = false;
    await recarregarAulas();
    $('editor-aulas').scrollIntoView({ block: 'start' });
  }

  async function recarregarAulas() {
    const lista = $('lista-aulas');
    try {
      const detalhe = await EduAPI.obterCurso(cursoDasAulas);
      lista.replaceChildren();
      if (detalhe.aulas.length === 0) lista.textContent = 'Este curso ainda não tem aulas.';
      detalhe.aulas.forEach(a => {
        const li = criar('li', 'item-aula');
        li.appendChild(criar('span', '', a.numero + '. ' + a.titulo));
        const acoes = criar('span', 'linha-acoes');
        const ver = criar('a', '', 'Ver aula');
        ver.href = '../tec.html?curso=' + encodeURIComponent(cursoDasAulas) + '&aula=' + a.numero;
        ver.target = '_blank';
        ver.rel = 'noopener';
        ver.style.fontSize = '.82rem';
        acoes.append(
          ver,
          botao('Materiais', 'btn-secundario btn-pequeno', () => abrirMateriais(a),
            'Materiais da aula ' + a.numero),
          botao('Editar', 'btn-secundario btn-pequeno', () => abrirFormAula(a.numero)),
          botao('Excluir', 'btn-secundario btn-pequeno', () => excluirAula(a))
        );
        li.appendChild(acoes);
        lista.appendChild(li);
      });
    } catch (erro) {
      mostrarAviso(textoDoErro(erro), true);
    }
  }

  $('btn-fechar-aulas').addEventListener('click', fecharAulas);
  $('btn-nova-aula').addEventListener('click', () => abrirFormAula(null));

  async function excluirAula(a) {
    if (!confirm('Excluir a aula "' + a.titulo + '" com seus comentários e materiais? As aulas seguintes serão renumeradas.')) return;
    try {
      await EduAPI.excluirAula(cursoDasAulas, a.numero);
      $('editor-aula').hidden = true;
      $('editor-materiais').hidden = true;
      aulaDosMateriais = null;
      mostrarAviso('Aula excluída.', false);
      await recarregarAulas();
      await carregarCursos();
    } catch (erro) {
      mostrarAviso(textoDoErro(erro), true);
    }
  }

  /* ---------- Formulário de aula (blocos) ---------- */
  function renumerarBlocos() {
    Array.from($('blocos').children).forEach((el, i) => {
      el.querySelector('.num-bloco').textContent = 'Bloco ' + (i + 1);
    });
  }

  function moverBloco(item, direcao) {
    const vizinho = direcao < 0 ? item.previousElementSibling : item.nextElementSibling;
    if (!vizinho) return;
    if (direcao < 0) item.parentNode.insertBefore(item, vizinho);
    else item.parentNode.insertBefore(vizinho, item);
    renumerarBlocos();
  }

  function adicionarBloco(b) {
    const item = criar('div', 'bloco-item');

    const topo = criar('div', 'linha-acoes');
    topo.appendChild(criar('strong', 'num-bloco', 'Bloco'));
    const seletor = criar('select', 'cfg-select');
    seletor.setAttribute('aria-label', 'Tipo do bloco');
    seletor.style.width = 'auto';
    TIPOS.forEach(([valor, rotulo]) => {
      const op = criar('option', '', rotulo);
      op.value = valor;
      seletor.appendChild(op);
    });
    seletor.value = b.tipo || 'PARAGRAFO';
    topo.appendChild(seletor);
    topo.append(
      botao('↑', 'btn-secundario btn-pequeno', () => moverBloco(item, -1), 'Mover bloco para cima'),
      botao('↓', 'btn-secundario btn-pequeno', () => moverBloco(item, 1), 'Mover bloco para baixo'),
      botao('Remover', 'btn-secundario btn-pequeno', () => { item.remove(); renumerarBlocos(); })
    );

    const titulo = criar('input', 'f-titulo');
    titulo.type = 'text';
    titulo.maxLength = 160;
    titulo.placeholder = 'Título do bloco';
    titulo.setAttribute('aria-label', 'Título do bloco');
    titulo.value = b.titulo || '';

    const linguagem = criar('input', 'f-linguagem');
    linguagem.type = 'text';
    linguagem.maxLength = 30;
    linguagem.placeholder = 'Linguagem (ex.: JavaScript)';
    linguagem.setAttribute('aria-label', 'Linguagem do código');
    linguagem.value = b.linguagem || '';

    const texto = criar('textarea', 'f-texto');
    texto.rows = 4;
    texto.maxLength = 5000;
    texto.setAttribute('aria-label', 'Texto do bloco');
    texto.value = b.texto || '';

    const dica = criar('p', 'dica-bloco');

    function atualizarCampos() {
      const tipo = seletor.value;
      titulo.hidden = !(tipo === 'DESTAQUE' || tipo === 'RESUMO');
      linguagem.hidden = tipo !== 'CODIGO';
      dica.textContent = DICAS[tipo];
    }
    seletor.addEventListener('change', atualizarCampos);
    atualizarCampos();

    item.append(topo, titulo, linguagem, texto, dica);
    $('blocos').appendChild(item);
    renumerarBlocos();
    return item;
  }

  async function abrirFormAula(numero) {
    limparAviso();
    aulaEditando = numero;
    $('titulo-form-aula').textContent = numero ? 'Editar aula ' + numero : 'Nova aula';
    $('blocos').replaceChildren();
    $('a-titulo').value = '';
    $('a-resumo').value = '';

    if (numero) {
      try {
        const aula = await EduAPI.obterAula(cursoDasAulas, numero);
        $('a-titulo').value = aula.titulo;
        $('a-resumo').value = aula.resumo || '';
        aula.blocos.forEach(adicionarBloco);
      } catch (erro) {
        mostrarAviso(textoDoErro(erro), true);
        return;
      }
    } else {
      adicionarBloco({ tipo: 'PARAGRAFO' });
    }
    $('editor-aula').hidden = false;
    $('a-titulo').focus();
  }

  $('btn-add-bloco').addEventListener('click', () => {
    adicionarBloco({ tipo: 'PARAGRAFO' }).querySelector('textarea').focus();
  });
  $('btn-cancelar-aula').addEventListener('click', () => { $('editor-aula').hidden = true; });

  $('form-aula').addEventListener('submit', async (e) => {
    e.preventDefault();
    const itens = Array.from($('blocos').children);
    if (itens.length === 0) {
      mostrarAviso('Adicione pelo menos um bloco de conteúdo.', true);
      return;
    }

    const blocos = [];
    for (let i = 0; i < itens.length; i++) {
      const item = itens[i];
      const tipo = item.querySelector('select').value;
      const texto = item.querySelector('.f-texto').value.trim();
      if (!texto) {
        mostrarAviso('Preencha o texto do bloco ' + (i + 1) + '.', true);
        item.querySelector('.f-texto').focus();
        return;
      }
      const titulo = item.querySelector('.f-titulo').value.trim();
      const linguagem = item.querySelector('.f-linguagem').value.trim();
      blocos.push({
        tipo,
        titulo: (tipo === 'DESTAQUE' || tipo === 'RESUMO') && titulo ? titulo : null,
        texto,
        linguagem: tipo === 'CODIGO' && linguagem ? linguagem : null,
      });
    }

    const dados = {
      titulo: $('a-titulo').value.trim(),
      resumo: $('a-resumo').value.trim(),
      blocos,
    };
    const btn = $('btn-salvar-aula');
    btn.disabled = true;
    try {
      if (aulaEditando) await EduAPI.atualizarAula(cursoDasAulas, aulaEditando, dados);
      else await EduAPI.criarAula(cursoDasAulas, dados);
      $('editor-aula').hidden = true;
      mostrarAviso('Aula salva com sucesso.', false);
      await recarregarAulas();
      await carregarCursos();
    } catch (erro) {
      mostrarAviso(textoDoErro(erro), true);
    }
    btn.disabled = false;
  });

  /* ---------- Materiais da aula (vídeo, PDF, áudio) ---------- */
  async function abrirMateriais(aula) {
    limparAviso();
    aulaDosMateriais = { id: aula.id, numero: aula.numero, titulo: aula.titulo };
    $('titulo-materiais').textContent = 'Materiais da aula ' + aula.numero + ': ' + aula.titulo;
    $('m-arquivo').value = '';
    $('m-titulo').value = '';
    $('m-descricao').value = '';
    $('editor-materiais').hidden = false;
    await recarregarMateriais();
    $('editor-materiais').scrollIntoView({ block: 'start' });
  }

  async function recarregarMateriais() {
    const lista = $('lista-materiais');
    try {
      const itens = await EduAPI.listarMateriais(aulaDosMateriais.id);
      lista.replaceChildren();
      if (itens.length === 0) lista.textContent = 'Esta aula ainda não tem materiais.';
      itens.forEach(m => {
        const li = criar('li', 'item-aula');
        li.appendChild(criar('span', '',
          ICONES_MATERIAL[m.tipo] + ' ' + m.titulo + ' (' + formatarTamanho(m.tamanhoBytes) + ', por ' + m.autorNome + ')'));
        const acoes = criar('span', 'linha-acoes');
        const abrir = criar('a', '', 'Abrir');
        abrir.href = EduAPI.urlArquivo(m.id);
        abrir.target = '_blank';
        abrir.rel = 'noopener';
        abrir.style.fontSize = '.82rem';
        acoes.append(abrir, botao('Remover', 'btn-secundario btn-pequeno', () => removerMaterial(m),
          'Remover o material ' + m.titulo));
        li.appendChild(acoes);
        lista.appendChild(li);
      });
    } catch (erro) {
      mostrarAviso(textoDoErro(erro), true);
    }
  }

  async function removerMaterial(m) {
    if (!confirm('Remover o material "' + m.titulo + '"?')) return;
    let motivo = null;
    if (usuario.papel === 'ADMIN' && usuario.id !== m.autorId) {
      motivo = prompt('Motivo da remoção (fica no registro):', '');
      if (motivo === null) return;
    }
    try {
      await EduAPI.removerMaterial(m.id, motivo);
      mostrarAviso('Material removido.', false);
      await recarregarMateriais();
    } catch (erro) {
      mostrarAviso(textoDoErro(erro), true);
    }
  }

  $('btn-fechar-materiais').addEventListener('click', () => {
    $('editor-materiais').hidden = true;
    aulaDosMateriais = null;
  });

  /* o título vira o nome do arquivo, se a pessoa ainda não digitou nada */
  $('m-arquivo').addEventListener('change', () => {
    const arquivo = $('m-arquivo').files[0];
    if (arquivo && !$('m-titulo').value.trim()) {
      $('m-titulo').value = arquivo.name.replace(/\.[^.]+$/, '');
    }
  });

  $('form-material').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!aulaDosMateriais) return;
    const arquivo = $('m-arquivo').files[0];
    const titulo = $('m-titulo').value.trim();
    if (!arquivo) { mostrarAviso('Escolha um arquivo para enviar.', true); $('m-arquivo').focus(); return; }
    if (!titulo) { mostrarAviso('Informe um título para o material.', true); $('m-titulo').focus(); return; }

    const ehVideo = /\.(mp4|webm)$/i.test(arquivo.name);
    const limite = ehVideo ? 300 * MB : 60 * MB;
    if (arquivo.size > limite) {
      mostrarAviso('Arquivo grande demais: o limite é ' + (limite / MB) + ' MB para este tipo.', true);
      return;
    }

    const dados = new FormData();
    dados.append('arquivo', arquivo);
    dados.append('titulo', titulo);
    dados.append('descricao', $('m-descricao').value.trim());

    const btn = $('btn-enviar-material');
    btn.disabled = true;
    btn.textContent = 'Enviando… (vídeos grandes podem demorar)';
    try {
      await EduAPI.enviarMaterial(aulaDosMateriais.id, dados);
      $('m-arquivo').value = '';
      $('m-titulo').value = '';
      $('m-descricao').value = '';
      mostrarAviso('Material enviado com sucesso.', false);
      await recarregarMateriais();
    } catch (erro) {
      mostrarAviso(textoDoErro(erro), true);
    }
    btn.disabled = false;
    btn.textContent = 'Enviar material';
  });

  /* ---------- Usuários (só administrador) ---------- */
  async function carregarUsuarios() {
    const lista = $('lista-usuarios');
    try {
      const usuarios = await EduAPI.listarUsuarios();
      lista.replaceChildren(...usuarios.map(u => {
        const li = criar('li', 'item-aula');
        li.appendChild(criar('span', '', u.nome + ' — ' + u.email));

        const acoes = criar('span', 'linha-acoes');
        const seletor = criar('select', 'cfg-select');
        seletor.style.width = 'auto';
        seletor.setAttribute('aria-label', 'Papel de ' + u.nome);
        ['ALUNO', 'PROFESSOR', 'ADMIN'].forEach(p => {
          const op = criar('option', '', p);
          op.value = p;
          seletor.appendChild(op);
        });
        seletor.value = u.papel;

        const salvar = botao('Salvar papel', 'btn-secundario btn-pequeno', async () => {
          try {
            await EduAPI.alterarPapel(u.id, seletor.value);
            mostrarAviso('Papel de ' + u.nome + ' atualizado.', false);
          } catch (erro) {
            mostrarAviso(textoDoErro(erro), true);
          }
        });
        if (u.id === usuario.id) {
          seletor.disabled = true;
          salvar.disabled = true;
        }
        acoes.append(seletor, salvar);
        li.appendChild(acoes);
        return li;
      }));
    } catch (erro) {
      mostrarAviso(textoDoErro(erro), true);
    }
  }

  /* ---------- Sair ---------- */
  $('link-sair').addEventListener('click', () => EduAPI.sair());

  iniciar();
})();
