// =========================================================
// EDU ACESSÍVEL — JAVASCRIPT BASE
// =========================================================

// ---------- Menu mobile ----------

const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");

menuToggle?.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";

    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    navLinks.classList.toggle("mobile-open");
});


// ---------- Painel de acessibilidade ----------

const accessibilityToggle = document.querySelector("#accessibility-toggle");
const accessibilityOptions = document.querySelector("#accessibility-options");

accessibilityToggle?.addEventListener("click", () => {
    const isOpen =
        accessibilityToggle.getAttribute("aria-expanded") === "true";

    accessibilityToggle.setAttribute("aria-expanded", String(!isOpen));
    accessibilityOptions.hidden = isOpen;
});


// ---------- Tamanho da fonte ----------

const increaseFont = document.querySelector("#increase-font");
const decreaseFont = document.querySelector("#decrease-font");

let fontSize = 16;

function updateFontSize() {
    document.documentElement.style.setProperty(
        "--font-size-base",
        `${fontSize}px`
    );
}

increaseFont?.addEventListener("click", () => {
    if (fontSize < 24) {
        fontSize += 2;
        updateFontSize();
    }
});

decreaseFont?.addEventListener("click", () => {
    if (fontSize > 12) {
        fontSize -= 2;
        updateFontSize();
    }
});


// ---------- Alto contraste ----------

const highContrast = document.querySelector("#high-contrast");

highContrast?.addEventListener("click", () => {
    document.body.classList.toggle("high-contrast");
});


// ---------- Escala de cinza ----------

const grayscale = document.querySelector("#grayscale");

grayscale?.addEventListener("click", () => {
    document.body.classList.toggle("grayscale");
});


// ---------- Restaurar acessibilidade ----------

const resetAccessibility = document.querySelector("#reset-accessibility");

resetAccessibility?.addEventListener("click", () => {
    fontSize = 16;
    updateFontSize();

    document.body.classList.remove("high-contrast");
    document.body.classList.remove("grayscale");
});


// ---------- Busca ----------

const searchInput = document.querySelector("#search");
const searchButton = document.querySelector("#search-button");
function buscarCursos() {

    const searchTerm = searchInput.value.trim();

    if (!searchTerm) {
        searchInput.focus();
        return;
    }

    // Abre o hub de cursos já filtrado pelo texto buscado
    window.location.href =
        "cadastro-adaptavel/conteudo.html?busca=" + encodeURIComponent(searchTerm);
}

searchButton?.addEventListener("click", buscarCursos);
searchInput?.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") buscarCursos();
});


// ---------- Fechar menu mobile ao clicar em um link ----------

document.querySelectorAll(".nav-links a").forEach((link) => {
    link.addEventListener("click", () => {
        navLinks?.classList.remove("mobile-open");
        menuToggle?.setAttribute("aria-expanded", "false");
    });
});
// =========================================================
// ASSISTENTE DE IA — EDU ACESSÍVEL
// =========================================================

async function enviarMensagemParaIA(mensagem) {
    try {
        return await EduAPI.perguntarAssistente(mensagem);
    } catch (erro) {
        console.error("Erro na IA:", erro);

        // Avisos claros para limite de uso ou IA ainda não configurada
        if (erro.status === 429 || erro.status === 503) {
            return erro.message;
        }
        return "Desculpe, não consegui responder agora. Tente novamente.";
    }
}
// =========================================================
// CONTROLE DO CHAT DA IA
// =========================================================

const aiButton = document.querySelector("#ai-button");
const aiChat = document.querySelector("#ai-chat");
const aiClose = document.querySelector("#ai-close");
const aiInput = document.querySelector("#ai-input");
const aiSend = document.querySelector("#ai-send");
const aiMessages = document.querySelector("#ai-messages");

const aiMascotImage = document.querySelector("#ai-mascot-image");

let mascoteInterval = null;

function iniciarMascoteFalando() {
    console.log("MASCOTE COMEÇOU A FALAR");
    if (!aiMascotImage) return;

    let aberto = false;

    mascoteInterval = setInterval(() => {
        aberto = !aberto;

        aiMascotImage.src = aberto
            ? "imagens/mascote-aberto.jpeg"
            : "imagens/mascote-fechado.jpeg";
    }, 350);
}

function pararMascoteFalando() {
    clearInterval(mascoteInterval);
    mascoteInterval = null;

    if (aiMascotImage) {
        aiMascotImage.src = "imagens/mascote-fechado.jpeg";
    }
}
// Abrir o chat
aiButton?.addEventListener("click", () => {
    aiChat.hidden = false;
    aiInput.focus();
});

// Fechar o chat
aiClose?.addEventListener("click", () => {
    aiChat.hidden = true;
});

// Enviar mensagem
aiSend?.addEventListener("click", async () => {
    const mensagem = aiInput.value.trim();

    if (!mensagem) {
        aiInput.focus();
        return;
    }

    // Mostra a mensagem do usuário
    const mensagemUsuario = document.createElement("div");
    mensagemUsuario.className = "user-message";
    mensagemUsuario.textContent = mensagem;

    aiMessages.appendChild(mensagemUsuario);

    // Limpa o campo
    aiInput.value = "";

    // Mostra mensagem temporária
    const mensagemCarregando = document.createElement("div");
    mensagemCarregando.className = "ai-message";
    mensagemCarregando.textContent = "Digitando...";

    aiMessages.appendChild(mensagemCarregando);

    // Envia para a IA
iniciarMascoteFalando();

try {
    const resposta = await enviarMensagemParaIA(mensagem);
    mensagemCarregando.textContent = resposta;
} finally {
    pararMascoteFalando();
}

aiInput.focus();
});

// =========================================================
// CABEÇALHO — MOSTRA O USUÁRIO LOGADO
// =========================================================

async function mostrarUsuarioLogado() {
    if (!EduAPI.estaLogado()) return;

    const entrar = document.querySelector('.nav-actions a[href="cadastro-adaptavel/login.html"]');
    const cadastrar = document.querySelector(".nav-actions .btn-primary");
    if (!entrar || !cadastrar) return;

    try {
        const usuario = await EduAPI.usuarioAtual();
        const primeiroNome = usuario.nome.split(" ")[0];

        // "Entrar" vira a saudação
        const saudacao = document.createElement("span");
        saudacao.textContent = "Olá, " + primeiroNome;
        saudacao.style.cssText = "align-self:center;font-weight:700;";
        entrar.replaceWith(saudacao);

            const painel = document.createElement("a");
           painel.textContent = usuario.papel === "ALUNO" ? "Meu painel" : "Painel";
           painel.href = usuario.papel === "ALUNO" ? "portal/aluno.html" : "portal/professor.html";
           painel.style.cssText = "align-self:center;font-weight:700;";
           saudacao.after(painel);

        // "Cadastrar" vira "Sair"
        cadastrar.textContent = "Sair";
        cadastrar.onclick = () => {
            EduAPI.sair();
            window.location.reload();
        };
    } catch (erro) {
        // Token expirado ou API desligada: mantém Entrar/Cadastrar
        console.warn("Não foi possível carregar o usuário:", erro.message);
    }
}

mostrarUsuarioLogado();