/**
 * painel.js — visão geral de professores e administradores:
 * conteúdos e progresso dos alunos. Abre logo depois do login.
 * Depende de: ../js/api.js (window.EduAPI)
 * Todo texto vindo do servidor é inserido com textContent (nunca como HTML).
 */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const aviso = $('aviso');
  let usuario = null;
  let cursoAberto = null; // slug do curso com a tabela de alunos aberta

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

  function mostrarAviso(texto) {
    aviso.textContent = texto;
    aviso.className = 'login-alerta';
    aviso.hidden = false;
  }

  function textoDoErro(erro) {
    return erro.message;
  }

  function data(iso) {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function barra(valor, rotulo) {
    const p = document.createElement('progress');
    p.className = 'barra';
    p.max = 100;
    p.value = valor;
    p.setAttribute('aria-label', rotulo);
    return p;
  }

  /* ---------- Entrada: só professor ou administrador ---------- */
  function bloquear(mensagem) {
    $('bloqueio-msg').textContent = mensagem;
    $('area-bloqueada').hidden = false;
  }

  async function iniciar() {
    if (!EduAPI.estaLogado()) {
      bloquear('Entre com uma conta de professor ou administrador para ver esta página.');
      return;
    }
    try {
      usuario = await EduAPI.usuarioAtual();
    } catch (erro) {
      bloquear('Sua sessão expirou, sua conta está restrita ou o servidor está desligado. ' + erro.message);
      return;
    }
    if (usuario.papel === 'ALUNO') {
      bloquear('Esta página é só para professores e administradores.');
      return;
    }
    $('saudacao').textContent = 'Olá, ' + usuario.nome.split(' ')[0] + ' (' + usuario.papel.toLowerCase() + ').';
    if (usuario.papel === 'ADMIN') $('link-admin').hidden = false;
    $('painel').hidden = false;
    carregar();
  }

  /* ---------- Resumo e cursos ---------- */
  async function carregar() {
    const lista = $('lista-cursos');
    try {
      const resumo = await EduAPI.resumoPainel();
      $('n-alunos').textContent = resumo.totalAlunos;
      $('n-cursos').textContent = resumo.totalCursos;
      $('n-aulas').textContent = resumo.totalAulas;
      $('n-materiais').textContent = resumo.totalMateriais;
      $('n-comentarios').textContent = resumo.totalComentarios;

      lista.replaceChildren(...resumo.cursos.map(cartaoDoCurso));
      if (resumo.cursos.length === 0) lista.textContent = 'Nenhum curso cadastrado ainda.';
    } catch (erro) {
      mostrarAviso(textoDoErro(erro));
    }
  }

  function cartaoDoCurso(c) {
    const card = criar('article', 'card-curso');
    card.setAttribute('aria-label', c.titulo);
    card.appendChild(criar('h3', '', c.titulo));
    card.appendChild(criar('p', 'meta',
      c.categoria + ' • ' + c.totalAulas + ' aula(s)' + (c.publicado ? '' : ' • RASCUNHO')));

    if (c.totalAulas === 0) {
      card.appendChild(criar('p', 'meta', 'Este curso ainda não tem aulas.'));
    } else {
      card.appendChild(criar('p', 'meta',
        c.alunosIniciaram + ' aluno(s) começaram • ' + c.alunosConcluiram + ' terminaram'));
      card.appendChild(barra(c.mediaConclusao, 'Conclusão média dos alunos que começaram: ' + c.mediaConclusao + '%'));
      card.appendChild(criar('p', 'meta', 'Conclusão média: ' + c.mediaConclusao + '%'));
    }

    const acoes = criar('div', 'linha-acoes');
    acoes.style.marginTop = '.6rem';
    if (c.alunosIniciaram > 0) {
      acoes.appendChild(botao('Ver alunos', 'btn-secundario btn-pequeno', () => verAlunos(c),
        'Ver os alunos do curso ' + c.titulo));
    }
    if (c.totalAulas > 0) {
      const abrir = criar('a', '', 'Abrir curso');
      abrir.href = '../tec.html?curso=' + encodeURIComponent(c.slug) + '&aula=1';
      abrir.style.fontSize = '.85rem';
      acoes.appendChild(abrir);
    }
    const gerenciar = criar('a', '', 'Gerenciar');
    gerenciar.href = 'gerenciar.html';
    gerenciar.style.fontSize = '.85rem';
    acoes.appendChild(gerenciar);
    card.appendChild(acoes);
    return card;
  }

  /* ---------- Alunos de um curso ---------- */
  async function verAlunos(curso) {
    cursoAberto = curso.slug;
    $('titulo-detalhe').textContent = 'Alunos de ' + curso.titulo;
    const area = $('tabela-alunos');
    area.replaceChildren(criar('p', 'meta', 'Carregando…'));
    $('detalhe-curso').hidden = false;
    $('detalhe-curso').scrollIntoView({ block: 'start' });
    try {
      const alunos = await EduAPI.alunosDoCurso(curso.slug);
      if (cursoAberto !== curso.slug) return;
      if (alunos.length === 0) {
        area.replaceChildren(criar('p', 'meta', 'Nenhum aluno começou este curso ainda.'));
        return;
      }
      area.replaceChildren(tabelaDeAlunos(curso, alunos));
    } catch (erro) {
      area.replaceChildren();
      mostrarAviso(textoDoErro(erro));
    }
  }

  function tabelaDeAlunos(curso, alunos) {
    const tabela = criar('table', 'alunos');
    tabela.appendChild(criar('caption', '', alunos.length + ' aluno(s) em ' + curso.titulo));

    const cabecalho = criar('tr');
    ['Aluno', 'Aulas concluídas', 'Progresso', 'Última atividade'].forEach(t => {
      const th = criar('th', '', t);
      th.scope = 'col';
      cabecalho.appendChild(th);
    });
    const thead = criar('thead');
    thead.appendChild(cabecalho);
    tabela.appendChild(thead);

    const corpo = criar('tbody');
    alunos.forEach(a => {
      const linha = criar('tr');

      const celulaNome = criar('td');
      celulaNome.appendChild(criar('strong', '', a.nome));
      celulaNome.appendChild(criar('div', 'meta', a.email));
      linha.appendChild(celulaNome);

      linha.appendChild(criar('td', '', a.concluidas + ' de ' + a.totalAulas));

      const celulaBarra = criar('td');
      celulaBarra.appendChild(barra(a.percentual, 'Progresso de ' + a.nome + ': ' + a.percentual + '%'));
      celulaBarra.appendChild(criar('span', 'meta', a.percentual + '%'
        + (a.percentual >= 100 ? ' — concluiu o curso' : '')));
      linha.appendChild(celulaBarra);

      linha.appendChild(criar('td', '', a.ultimaAtividade ? data(a.ultimaAtividade) : '—'));
      corpo.appendChild(linha);
    });
    tabela.appendChild(corpo);
    return tabela;
  }

  $('btn-fechar-detalhe').addEventListener('click', () => {
    cursoAberto = null;
    $('detalhe-curso').hidden = true;
  });
  $('btn-atualizar').addEventListener('click', () => { aviso.hidden = true; carregar(); });
  $('link-sair').addEventListener('click', () => EduAPI.sair());

  iniciar();
})();
