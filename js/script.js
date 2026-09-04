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

searchButton?.addEventListener("click", () => {
    const searchTerm = searchInput.value.trim();

    if (!searchTerm) {
        searchInput.focus();
        return;
    }

    // Futuramente:
    // 1. Enviar a busca para a API.
    // 2. Receber os conteúdos.
    // 3. Renderizar os resultados.

    console.log("Buscando por:", searchTerm);
});


// ---------- Fechar menu mobile ao clicar em um link ----------

document.querySelectorAll(".nav-links a").forEach((link) => {
    link.addEventListener("click", () => {
        navLinks?.classList.remove("mobile-open");
        menuToggle?.setAttribute("aria-expanded", "false");
    });
});
