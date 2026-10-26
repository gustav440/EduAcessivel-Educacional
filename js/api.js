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

  // ---------- requisição base ----------
  async function requisicao(metodo, caminho, corpo) {
    const cabecalhos = { "Content-Type": "application/json" };
    const t = token();
    if (t) cabecalhos.Authorization = "Bearer " + t;

    let resposta;
    try {
      resposta = await fetch(API + caminho, {
        method: metodo,
        headers: cabecalhos,
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
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
  const obterCurso = (slug) => requisicao("GET", "/cursos/" + encodeURIComponent(slug));
  const obterAula = (slug, numero) =>
    requisicao("GET", "/cursos/" + encodeURIComponent(slug) + "/aulas/" + numero);

  // ---------- progresso (precisa estar logado) ----------
  const meuProgresso = () => requisicao("GET", "/progresso");
  const concluirAula = (slug, numero) =>
    requisicao("PUT", "/progresso/cursos/" + encodeURIComponent(slug) + "/aulas/" + numero);
  const desmarcarAula = (slug, numero) =>
    requisicao("DELETE", "/progresso/cursos/" + encodeURIComponent(slug) + "/aulas/" + numero);

  // ---------- assistente de IA ----------
  async function perguntarAssistente(mensagem) {
    const r = await requisicao("POST", "/assistente", { mensagem });
    return r.resposta;
  }

  global.EduAPI = {
    ErroApi, estaLogado, sair, registrar, login, usuarioAtual, atualizarAcessibilidade,
    listarCursos, obterCurso, obterAula, meuProgresso, concluirAula, desmarcarAula, perguntarAssistente,
  };
})(window);
