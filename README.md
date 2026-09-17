# Edu Acessível

Plataforma de aprendizagem acessível e adaptativa, pensada para diferentes formas de aprender.

## Identificação Acadêmica

| Informação | Valor |
| --- | --- |
| Instituição de Ensino | A ser definido pela equipe |
| Curso | A ser definido pela equipe |
| Disciplina | A ser definido pela equipe |
| Orientador | Profº Hudson Neves |

## Descrição

O Edu Acessível é um projeto acadêmico de front-end para uma plataforma educacional inclusiva. A proposta é facilitar o acesso à educação por meio de diferentes formas de consumo de conteúdo e de recursos que auxiliam a navegação e a aprendizagem.

O projeto atualmente apresenta a estrutura inicial da interface, incluindo a página inicial, a área de conteúdos e uma página de aula de Introdução à Programação.

## Objetivos

### Objetivo geral

Oferecer uma experiência de aprendizagem acessível e adaptativa, respeitando as necessidades e preferências de diferentes pessoas.

### Problema que o sistema resolve

O sistema busca reduzir barreiras de acesso a conteúdos educacionais, disponibilizando uma interface com recursos de acessibilidade e diferentes formatos de aprendizagem, como cursos, atividades, vídeos e áudios.

### Público-alvo

Pessoas que buscam conteúdos educacionais e que podem se beneficiar de uma experiência de aprendizagem acessível e adaptativa.

## Funcionalidades

### Disponíveis no protótipo

- Navegação entre a página inicial, a área de conteúdos e a página de aula.
- Busca visual por cursos, atividades, vídeos e outros conteúdos.
- Organização de conteúdos por categorias: cursos, atividades, vídeos e áudios.
- Painel de acessibilidade.
- Aumento e redução do tamanho da fonte.
- Ativação de alto contraste.
- Ativação de escala de cinza.
- Restauração das configurações de acessibilidade.
- Navegação por teclado com link para pular diretamente ao conteúdo principal.
- Menu responsivo para dispositivos móveis.
- Exibição de progresso na página de aula.

### Em planejamento

- Login e cadastro.
- Dashboard.
- Perfil e acompanhamento de progresso.
- Integração com uma API.

## Tecnologias Utilizadas

- HTML5.
- CSS3.
- JavaScript.

### Frameworks e Bibliotecas

A ser definido pela equipe.

## Arquitetura da Solução

O projeto utiliza uma arquitetura de front-end estático, com separação entre marcação, estilos e comportamentos:

- As páginas HTML definem a estrutura e o conteúdo da interface.
- O arquivo CSS compartilhado concentra os estilos visuais e a responsividade.
- O arquivo JavaScript controla as interações da página inicial e os recursos de acessibilidade.
- As páginas se conectam por links entre arquivos HTML.

Não foi informada uma arquitetura de back-end ou uma API implementada.

## Modelagem do Banco de Dados

A ser definido pela equipe. Não há banco de dados implementado ou modelagem informada neste estágio do projeto.

## Pré-requisitos

- Navegador web atualizado.
- Um editor de código, como o Visual Studio Code, para desenvolvimento.
- Opcionalmente, uma extensão de servidor local, como Live Server.

## Instalação

1. Obtenha os arquivos do projeto.
2. Abra a pasta do projeto no Visual Studio Code ou em outro editor de código.
3. Não há dependências ou pacotes informados que precisem ser instalados.

## Como Executar

1. Abra o arquivo `index.html` diretamente em um navegador; ou
2. Execute o projeto com uma extensão de servidor local, como o Live Server.

Na página inicial, é possível acessar a área de conteúdos pelo menu ou pelo botão de exploração. Os controles disponíveis no painel de acessibilidade permitem alterar a visualização da página.

## Estrutura do Projeto

```text
edu-acessivel/
├── index.html          # Página inicial
├── conteudo.html       # Página de conteúdos
├── tec.html            # Página de aula de Introdução à Programação
├── README.md           # Documentação do projeto
├── css/
│   └── style.css       # Estilos compartilhados e responsividade
└── js/
	└── script.js       # Interações e recursos de acessibilidade
```

## Exemplos de Uso

### Navegar pelos conteúdos

1. Abra `index.html`.
2. Selecione **Conteúdos** no menu ou **Explorar conteúdos**.
3. Consulte os conteúdos disponíveis na página de conteúdos.

### Usar o painel de acessibilidade

1. Abra o painel **Acessibilidade**.
2. Escolha aumentar ou diminuir a fonte, ativar alto contraste ou aplicar escala de cinza.
3. Use **Restaurar padrão** para retornar à configuração inicial.

## API

A ser definido pela equipe. Não há uma API implementada neste estágio; a integração com uma API está prevista como melhoria futura.

## Capturas de Tela

A ser definido pela equipe. Inserir nesta seção imagens das seguintes telas quando disponíveis:

- Página inicial (`index.html`).
- Página de conteúdos (`conteudo.html`).
- Página de aula (`tec.html`).
- Painel de acessibilidade em uso.

Exemplo de inclusão:

```markdown
![Página inicial do Edu Acessível](caminho/para/imagem.png)
```

## Equipe do Projeto

| Integrante | Responsabilidade |
| --- | --- |
| A ser definido pela equipe | A ser definido pela equipe |

## Melhorias Futuras

- Definir a identidade visual definitiva.
- Separar a página inicial em componentes ou páginas específicas.
- Implementar login e cadastro.
- Implementar um dashboard.
- Evoluir a página de conteúdos e a página de conteúdo individual.
- Criar perfil e acompanhamento de progresso.
- Ampliar os recursos de acessibilidade.
- Preparar e realizar a integração com uma API.
- Definir e implementar o banco de dados, caso seja necessário para as próximas etapas.

## Status do Projeto

Em desenvolvimento, na etapa de protótipo inicial do front-end.

## Licença

A ser definido pela equipe.
