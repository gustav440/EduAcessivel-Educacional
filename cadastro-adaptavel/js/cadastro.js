/**
 * cadastro.js — lógica do formulário multi-step de cadastro
 * Depende de: comum.js (window.EduAcessivel)
 */
(function () {
  "use strict";

  const { iniciarGuia, guiaJaVisto, marcarGuiaVisto, salvarPrefs, carregarPrefs, aplicarModos } = window.EduAcessivel;

  /* ================================================================
     ESTADO
     ================================================================ */
  const estado = {
    stepAtual: 0,
    totalSteps: 4,
    dados: {
      nome: '', email: '', senha: '', nascimento: '',
      necessidades: [],
      tema: 'padrao', fonte: 'padrao', tamanhoFonte: 16, espacamento: 1.6,
      formato: 'texto',
    },
  };

  /* ================================================================
     ELEMENTOS
     ================================================================ */
  const form        = document.getElementById('form-cadastro');
  const statusMsg   = document.getElementById('status-msg');
  const telaSucesso = document.getElementById('tela-sucesso');
  const progressoItens = Array.from(document.querySelectorAll('.progresso li'));

  /* ================================================================
     NAVEGAÇÃO ENTRE STEPS
     ================================================================ */
  function irParaStep(idx) {
    const stepAtualEl = document.getElementById('step-' + estado.stepAtual);
    const stepProxEl  = document.getElementById('step-' + idx);
    if (!stepProxEl) return;

    stepAtualEl.classList.remove('ativo');
    stepAtualEl.hidden = true;
    stepProxEl.classList.add('ativo');
    stepProxEl.hidden = false;

    /* Atualiza barra de progresso */
    progressoItens.forEach((li, i) => {
      li.dataset.atual     = String(i === idx);
      li.dataset.concluido = String(i < idx);
    });

    estado.stepAtual = idx;

    /* Foco no início da nova seção */
    const titulo = stepProxEl.querySelector('h2');
    if (titulo) { titulo.setAttribute('tabindex', '-1'); titulo.focus(); }

    anunciar('Etapa ' + (idx + 1) + ' de ' + estado.totalSteps + ': ' + (titulo ? titulo.textContent : ''));
  }

  /* ================================================================
     VALIDAÇÃO
     ================================================================ */
  function limparErro(campoId, inputId) {
    const wrapper = document.getElementById(campoId);
    if (wrapper) wrapper.classList.remove('tem-erro');
  }

  function mostrarErro(campoId, inputId) {
    const wrapper = document.getElementById(campoId);
    if (wrapper) wrapper.classList.add('tem-erro');
    const input = document.getElementById(inputId);
    if (input) input.focus();
  }

  function validarStep0() {
    let ok = true;

    ['campo-nome', 'campo-email', 'campo-senha', 'campo-nascimento'].forEach(id => limparErro(id));

    const nome = document.getElementById('nome').value.trim();
    if (!nome) { mostrarErro('campo-nome', 'nome'); ok = false; }

    const email = document.getElementById('email').value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (ok) mostrarErro('campo-email', 'email');
      else    document.getElementById('campo-email').classList.add('tem-erro');
      ok = false;
    }

    const senha = document.getElementById('senha').value;
    if (senha.length < 8) {
      if (ok) mostrarErro('campo-senha', 'senha');
      else    document.getElementById('campo-senha').classList.add('tem-erro');
      ok = false;
    }

    const nasc = document.getElementById('nascimento').value;
    if (!nasc) {
      if (ok) mostrarErro('campo-nascimento', 'nascimento');
      else    document.getElementById('campo-nascimento').classList.add('tem-erro');
      ok = false;
    }

    if (ok) {
      estado.dados.nome       = nome;
      estado.dados.email      = email;
      estado.dados.senha      = senha;
      estado.dados.nascimento = nasc;
    }
    return ok;
  }

  function validarStep3() {
    const aceite = document.getElementById('aceite-termos').checked;
    const erroEl = document.getElementById('erro-termos');
    if (!aceite) {
      erroEl.style.display = 'block';
      document.getElementById('aceite-termos').focus();
      return false;
    }
    erroEl.style.display = 'none';
    return true;
  }

  /* ================================================================
     COLETA DE DADOS POR STEP
     ================================================================ */
  function coletarStep1() {
    const checks = Array.from(document.querySelectorAll('input[name="necessidades"]:checked'));
    estado.dados.necessidades = checks.map(c => c.value);

    const aviso = document.getElementById('aviso-necessidades');
    if (estado.dados.necessidades.length > 0) {
      aviso.hidden = false;
      /* Aplica alto contraste automaticamente se marcado */
      if (estado.dados.necessidades.includes('alto-contraste')) {
        const p = carregarPrefs();
        p['contraste-alto'] = true;
        salvarPrefs(p);
        aplicarModos(p);
        const selTema = document.getElementById('sel-tema');
        if (selTema) selTema.value = 'contraste';
      }
    } else {
      aviso.hidden = true;
    }
  }

  function coletarStep2() {
    const tema        = document.getElementById('pref-tema').value;
    const fonte       = document.getElementById('pref-fonte').value;
    const tamanho     = parseInt(document.getElementById('pref-tamanho').value, 10);
    const espacamento = parseFloat(document.getElementById('pref-espacamento').value);
    const formatoEl   = document.querySelector('input[name="formato"]:checked');

    estado.dados.tema        = tema;
    estado.dados.fonte       = fonte;
    estado.dados.tamanhoFonte = tamanho;
    estado.dados.espacamento  = espacamento;
    estado.dados.formato      = formatoEl ? formatoEl.value : 'texto';

    /* Persiste as preferências visuais escolhidas */
    const p = carregarPrefs();
    p['contraste-alto'] = tema === 'contraste';
    p['modo-noturno']   = tema === 'noturno';
    p['escala-cinza']   = tema === 'cinza';
    p['fonte-dislexia'] = fonte === 'lexend';
    p.tamanhoFonte      = tamanho;
    p.espacamento       = String(espacamento);
    salvarPrefs(p);
    aplicarModos(p);
  }

  /* ================================================================
     PRÉVIA DO STEP 2
     ================================================================ */
  function atualizarPrevia() {
    const tamanho     = document.getElementById('pref-tamanho').value;
    const espacamento = document.getElementById('pref-espacamento').value;
    const fonte       = document.getElementById('pref-fonte').value;

    document.getElementById('val-tamanho').textContent    = tamanho + 'px';
    document.getElementById('val-espacamento').textContent = espacamento;

    const previaTexto = document.getElementById('previa-texto');
    previaTexto.style.fontSize   = tamanho + 'px';
    previaTexto.style.lineHeight = espacamento;
    previaTexto.style.fontFamily = fonte === 'lexend'
      ? "'Lexend', Arial, sans-serif"
      : "'Atkinson Hyperlegible', Arial, sans-serif";
  }

  document.getElementById('pref-tamanho').addEventListener('input', () => {
    document.getElementById('pref-tamanho').setAttribute('aria-valuenow', document.getElementById('pref-tamanho').value);
    atualizarPrevia();
  });
  document.getElementById('pref-espacamento').addEventListener('input', () => {
    document.getElementById('pref-espacamento').setAttribute('aria-valuenow', document.getElementById('pref-espacamento').value);
    atualizarPrevia();
  });
  document.getElementById('pref-fonte').addEventListener('change', atualizarPrevia);
  document.getElementById('pref-tema').addEventListener('change', () => {
    const tema = document.getElementById('pref-tema').value;
    const p = carregarPrefs();
    p['contraste-alto'] = tema === 'contraste';
    p['modo-noturno']   = tema === 'noturno';
    p['escala-cinza']   = tema === 'cinza';
    salvarPrefs(p);
    aplicarModos(p);
  });

  /* ================================================================
     RESUMO DO STEP 3
     ================================================================ */
  function montarResumo() {
    const lista = document.getElementById('resumo-lista');
    const necessidadesLabel = {
      transcricao: 'Transcrição', audiodescricao: 'Audiodescrição',
      libras: 'Libras', legenda: 'Legendas',
      'leitura-facil': 'Leitura fácil', 'alto-contraste': 'Alto contraste',
    };
    const temaLabel = { padrao: 'Padrão', noturno: 'Noturno', contraste: 'Alto contraste', cinza: 'Escala de cinza' };

    const itens = [
      { label: 'Nome',           valor: estado.dados.nome },
      { label: 'E-mail',         valor: estado.dados.email },
      { label: 'Nascimento',     valor: estado.dados.nascimento
          ? new Date(estado.dados.nascimento + 'T12:00:00').toLocaleDateString('pt-BR') : '—' },
      { label: 'Necessidades',   valor: estado.dados.necessidades.length
          ? estado.dados.necessidades.map(n => necessidadesLabel[n] || n).join(', ')
          : 'Nenhuma selecionada' },
      { label: 'Tema',           valor: temaLabel[estado.dados.tema] || estado.dados.tema },
      { label: 'Fonte',          valor: estado.dados.fonte === 'lexend' ? 'Lexend (dislexia)' : 'Atkinson Hyperlegible' },
      { label: 'Tamanho do texto', valor: estado.dados.tamanhoFonte + 'px' },
      { label: 'Espaçamento',    valor: estado.dados.espacamento },
      { label: 'Formato favorito', valor: estado.dados.formato },
    ];

    lista.innerHTML = itens.map(it =>
      `<li><span>${it.label}</span><span><strong>${it.valor}</strong></span></li>`
    ).join('');

    /* JSON preview */
    const semSenha = { ...estado.dados, senha: '••••••••' };
    document.getElementById('json-previa').textContent = JSON.stringify(semSenha, null, 2);
  }

  /* ================================================================
     BOTÕES DE NAVEGAÇÃO
     ================================================================ */
  document.getElementById('btn-prox-0').addEventListener('click', () => {
    if (validarStep0()) irParaStep(1);
  });

  document.getElementById('btn-ant-1').addEventListener('click', () => irParaStep(0));
  document.getElementById('btn-prox-1').addEventListener('click', () => {
    coletarStep1();
    irParaStep(2);
  });

  document.getElementById('btn-ant-2').addEventListener('click', () => irParaStep(1));
  document.getElementById('btn-prox-2').addEventListener('click', () => {
    coletarStep2();
    montarResumo();
    irParaStep(3);
  });

  document.getElementById('btn-ant-3').addEventListener('click', () => irParaStep(2));

  /* ================================================================
     ENVIO DO FORMULÁRIO
     ================================================================ */
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validarStep3()) return;

    coletarStep2(); // garante que os dados do step 2 estão atualizados

    const btnEnviar = document.getElementById('btn-enviar');
    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Criando conta…';
    anunciar('Processando seu cadastro…');

    /* Simula chamada assíncrona */
    setTimeout(() => {
      form.hidden = true;
      telaSucesso.hidden = false;
      document.getElementById('msg-boas-vindas').textContent =
        'Bem-vindo, ' + estado.dados.nome.split(' ')[0] + '! Suas preferências foram salvas.';
      anunciar('Conta criada com sucesso! Redirecionando para o Hub de Cursos.');
      telaSucesso.querySelector('a').focus();
    }, 1200);
  });

  /* ================================================================
     ACESSIBILIDADE — anúncio para leitores de tela
     ================================================================ */
  function anunciar(msg) {
    statusMsg.textContent = '';
    setTimeout(() => { statusMsg.textContent = msg; }, 50);
  }

  /* ================================================================
     TOUR / GUIA
     ================================================================ */
  const passosTour = [
    {
      titulo: 'Bem-vindo ao cadastro!',
      texto: 'Este formulário tem 4 etapas curtas. Vou te guiar por cada uma delas.',
    },
    {
      alvo: '.progresso',
      titulo: 'Acompanhe seu progresso',
      texto: 'Esta barra mostra em qual etapa você está e quantas já concluiu.',
    },
    {
      alvo: '#step-0',
      titulo: 'Etapa 1: Identificação',
      texto: 'Preencha seus dados básicos. Todos os campos são obrigatórios.',
    },
    {
      alvo: '.nav-botoes',
      titulo: 'Avançar entre etapas',
      texto: 'Use os botões "Próximo" e "Anterior" para navegar entre as etapas do formulário.',
    },
  ];

  document.getElementById('btn-ajuda').addEventListener('click', () => iniciarGuia(passosTour));

  if (!guiaJaVisto('cadastro')) {
    marcarGuiaVisto('cadastro');
    setTimeout(() => iniciarGuia(passosTour), 700);
  }

  /* Sincroniza o select de tema do step 2 com o tema já salvo */
  (function sincronizarStep2() {
    const prefs = carregarPrefs();
    const selTema = document.getElementById('pref-tema');
    if (prefs['contraste-alto']) selTema.value = 'contraste';
    else if (prefs['modo-noturno']) selTema.value = 'noturno';
    else if (prefs['escala-cinza']) selTema.value = 'cinza';

    const selFonte = document.getElementById('pref-fonte');
    if (prefs['fonte-dislexia']) selFonte.value = 'lexend';

    if (prefs.tamanhoFonte) {
      const sl = document.getElementById('pref-tamanho');
      sl.value = prefs.tamanhoFonte;
      sl.setAttribute('aria-valuenow', prefs.tamanhoFonte);
    }
    if (prefs.espacamento) {
      const sl = document.getElementById('pref-espacamento');
      sl.value = parseFloat(prefs.espacamento);
      sl.setAttribute('aria-valuenow', prefs.espacamento);
    }
    atualizarPrevia();
  })();

})();
