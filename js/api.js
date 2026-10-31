/* =========================================================
   EDU ACESSÍVEL — CLIENTE DA API
   Salve como js/api.js e inclua ANTES dos outros scripts:
     <script>window.EDU_API_URL = "http://localhost:8080";</script>
     <script src="js/api.js"></script>
   (nas páginas dentro de cadastro-adaptavel/ use ../js/api.js)
   ========================================================= */
(function (global) {
  "use strict";

  const API = (global.EDU_API_URL || "http://localhost:8080") + "/api";
  const TOKEN_KEY = "eduacessivel_token";

  class ErroApi extends Error {
    constructor(mensagem, status, campos) {
      super(mensagem);
      this.status = status;      // 0 = sem conexão
      this.campos = campos || {}; // ex.: { "senha": "A senha deve ter ..." }
    }
  }

  // ---------- token ----------
  function token() {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  }
  function guardarToken(valor, lembrar) {
    limparToken();
    (lembrar ? localStorage : sessionStorage).setItem(TOKEN_KEY, valor);
  }
  function limparToken() {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  }

  // ---------- requisição base (aceita JSON ou FormData para envio de arquivos) ----------
  async function requisicao(metodo, caminho, corpo) {
    const ehFormulario = typeof FormData !== "undefined" && corpo instanceof FormData;
    const cabecalhos = {};
    if (!ehFormulario) cabecalhos["Content-Type"] = "application/json";
    const t = token();
    if (t) cabecalhos.Authorization = "Bearer " + t;

    let resposta;
    try {
      resposta = await fetch(API + caminho, {
        method: metodo,
        headers: cabecalhos,
        body: corpo === undefined ? undefined : (ehFormulario ? corpo : JSON.stringify(corpo)),
      });
    } catch (e) {
      throw new ErroApi("Não foi possível conectar ao servidor.", 0);
    }

    const dados = resposta.status === 204 ? null : await resposta.json().catch(() => null);
    if (!resposta.ok) {
      if (resposta.status === 401 && t) limparToken(); // token expirado
      throw new ErroApi((dados && dados.erro) || "Erro inesperado.", resposta.status, dados && dados.campos);
    }
    return dados;
  }

  const slugUrl = (slug) => encodeURIComponent(slug);
  const comMotivo = (caminho, motivo) =>
    caminho + (motivo ? "?motivo=" + encodeURIComponent(motivo) : "");

  // ---------- conta ----------
  async function registrar(dados) {
    const r = await requisicao("POST", "/auth/registro", dados);
    guardarToken(r.token, true);
    return r.usuario;
  }
  async function login(email, senha, lembrar) {
    const r = await requisicao("POST", "/auth/login", { email, senha, lembrar: !!lembrar });
    guardarToken(r.token, !!lembrar);
    return r.usuario;
  }
  const sair = limparToken;
  const estaLogado = () => !!token();
  const usuarioAtual = () => requisicao("GET", "/usuarios/me");
  const atualizarAcessibilidade = (necessidades, preferencias) =>
    requisicao("PUT", "/usuarios/me/acessibilidade", { necessidades, preferencias });

  // ---------- cursos ----------
  function listarCursos(filtros) {
    const f = filtros || {};
    const p = new URLSearchParams();
    if (f.busca) p.set("busca", f.busca);
    if (f.categoria) p.set("categoria", f.categoria);
    if (f.nivel) p.set("nivel", f.nivel);
    if (f.recursos && f.recursos.length) p.set("recursos", f.recursos.join(","));
    const qs = p.toString();
    return requisicao("GET", "/cursos" + (qs ? "?" + qs : ""));
  }
  const obterCurso = (slug) => requisicao("GET", "/cursos/" + slugUrl(slug));
  const obterAula = (slug, numero) =>
    requisicao("GET", "/cursos/" + slugUrl(slug) + "/aulas/" + numero);

  // ---------- progresso (precisa estar logado) ----------
  const meuProgresso = () => requisicao("GET", "/progresso");
  const concluirAula = (slug, numero) =>
    requisicao("PUT", "/progresso/cursos/" + slugUrl(slug) + "/aulas/" + numero);
  const desmarcarAula = (slug, numero) =>
    requisicao("DELETE", "/progresso/cursos/" + slugUrl(slug) + "/aulas/" + numero);

  // ---------- assistente de IA ----------
  async function perguntarAssistente(mensagem) {
    const r = await requisicao("POST", "/assistente", { mensagem });
    return r.resposta;
  }

  // ---------- professor / administrador: cursos e aulas ----------
  const criarCurso = (dados) => requisicao("POST", "/cursos", dados);
  const atualizarCurso = (slug, dados) => requisicao("PUT", "/cursos/" + slugUrl(slug), dados);
  const excluirCurso = (slug) => requisicao("DELETE", "/cursos/" + slugUrl(slug));
  const criarAula = (slug, dados) => requisicao("POST", "/cursos/" + slugUrl(slug) + "/aulas", dados);
  const atualizarAula = (slug, numero, dados) =>
    requisicao("PUT", "/cursos/" + slugUrl(slug) + "/aulas/" + numero, dados);
  const excluirAula = (slug, numero) =>
    requisicao("DELETE", "/cursos/" + slugUrl(slug) + "/aulas/" + numero);
  const listarUsuarios = () => requisicao("GET", "/admin/usuarios");
  const alterarPapel = (id, papel) => requisicao("PUT", "/admin/usuarios/" + id + "/papel", { papel });

  // ---------- materiais (vídeo, PDF, áudio) ----------
  const listarMateriais = (aulaId) => requisicao("GET", "/aulas/" + aulaId + "/materiais");
  /** formData precisa ter: arquivo, titulo e (opcional) descricao */
  const enviarMaterial = (aulaId, formData) => requisicao("POST", "/aulas/" + aulaId + "/materiais", formData);
  const removerMaterial = (id, motivo) => requisicao("DELETE", comMotivo("/materiais/" + id, motivo));
  const urlArquivo = (id) => API + "/materiais/" + id + "/arquivo";

  // ---------- comentários e denúncias ----------
  const listarComentarios = (aulaId) => requisicao("GET", "/aulas/" + aulaId + "/comentarios");
  const comentar = (aulaId, texto, paiId) =>
    requisicao("POST", "/aulas/" + aulaId + "/comentarios", { texto, paiId: paiId || null });
  const removerComentario = (id, motivo) => requisicao("DELETE", comMotivo("/comentarios/" + id, motivo));
  /** dados: { tipoAlvo: "COMENTARIO" | "MATERIAL", alvoId, motivo, descricao } */
  const denunciar = (dados) => requisicao("POST", "/denuncias", dados);

  // ---------- administração: moderação ----------
  const listarDenuncias = (status) =>
    requisicao("GET", "/admin/denuncias" + (status ? "?status=" + encodeURIComponent(status) : ""));
  const resolverDenuncia = (id, dados) => requisicao("PUT", "/admin/denuncias/" + id + "/resolver", dados);
  const usuariosModeracao = () => requisicao("GET", "/admin/moderacao/usuarios");
  const historicoPunicoes = (usuarioId) => requisicao("GET", "/admin/usuarios/" + usuarioId + "/punicoes");
  const punirUsuario = (usuarioId, dados) => requisicao("POST", "/admin/usuarios/" + usuarioId + "/punicoes", dados);
  const revogarPunicao = (id) => requisicao("PUT", "/admin/punicoes/" + id + "/revogar");
  const comentariosAdmin = () => requisicao("GET", "/admin/comentarios");
  const restaurarComentario = (id) => requisicao("PUT", "/admin/comentarios/" + id + "/restaurar");
  const materiaisAdmin = () => requisicao("GET", "/admin/materiais");
  const restaurarMaterial = (id) => requisicao("PUT", "/admin/materiais/" + id + "/restaurar");

  // ---------- painel de professores e administradores ----------
  const resumoPainel = () => requisicao("GET", "/painel/resumo");
  const alunosDoCurso = (slug) => requisicao("GET", "/painel/cursos/" + slugUrl(slug) + "/alunos");

  // ---------- preferências de acessibilidade guardadas na conta ----------
  /** Aplica no site as preferências salvas na conta (precisa do comum.js carregado na página). */
  async function aplicarPreferenciasDaConta() {
    const site = global.EduAcessivel;
    if (!site || !site.carregarPrefs || !site.salvarPrefs || !site.aplicarModos) return;
    try {
      const u = await usuarioAtual();
      const c = u.preferencias || {};
      const p = site.carregarPrefs();
      p["contraste-alto"] = c.tema === "contraste";
      p["modo-noturno"] = c.tema === "noturno";
      p["escala-cinza"] = c.tema === "cinza";
      p["fonte-dislexia"] = c.fonte === "lexend";
      p.tamanhoFonte = c.tamanhoTexto;
      p.espacamento = String(c.espacamento);
      site.salvarPrefs(p);
      site.aplicarModos(p);
    } catch (e) {
      /* sem conexão: mantém o que já está no navegador */
    }
  }

  global.EduAPI = {
    ErroApi, estaLogado, sair, registrar, login, usuarioAtual, atualizarAcessibilidade,
    listarCursos, obterCurso, obterAula, meuProgresso, concluirAula, desmarcarAula, perguntarAssistente,
    criarCurso, atualizarCurso, excluirCurso, criarAula, atualizarAula, excluirAula,
    listarUsuarios, alterarPapel,
    listarMateriais, enviarMaterial, removerMaterial, urlArquivo,
    listarComentarios, comentar, removerComentario, denunciar,
    listarDenuncias, resolverDenuncia, usuariosModeracao, historicoPunicoes, punirUsuario,
    revogarPunicao, comentariosAdmin, restaurarComentario, materiaisAdmin, restaurarMaterial,
    resumoPainel, alunosDoCurso, aplicarPreferenciasDaConta,
  };
})(window);
