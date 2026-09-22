export async function POST(request) {
    try {
        const { mensagem } = await request.json();

        if (!mensagem) {
            return Response.json(
                { erro: "Mensagem não informada." },
                { status: 400 }
            );
        }

        const resposta = await fetch(
           `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    systemInstruction: {
                        parts: [
                            {
                                text: `
Você é a assistente virtual do Edu Acessível,
uma plataforma de educação acessível.

Sua função é ajudar os usuários com dúvidas
relacionadas aos conteúdos educacionais.

Responda sempre em português do Brasil.

Seja clara, amigável e fácil de entender.
Explique os assuntos de maneira simples e organizada.

Quando o usuário não entender um assunto,
explique novamente de uma forma mais simples.

Não invente informações sobre o Edu Acessível.
Não diga que uma função existe no site se você não tiver essa informação.

Você deve se comportar como uma assistente educacional,
ajudando o usuário a compreender melhor os conteúdos.
                                `
                            }
                        ]
                    },

                    contents: [
                        {
                            role: "user",
                            parts: [
                                {
                                    text: mensagem
                                }
                            ]
                        }
                    ]
                })
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            console.error("Erro da Gemini:", dados);

            return Response.json(
                {
                    erro: "Não foi possível obter uma resposta da IA."
                },
                {
                    status: 500
                }
            );
        }

        const texto =
            dados.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!texto) {
            console.error("Resposta inesperada da Gemini:", dados);

            return Response.json(
                {
                    erro: "A IA não retornou uma resposta."
                },
                {
                    status: 500
                }
            );
        }

        return Response.json({
            resposta: texto
        });

    } catch (erro) {
        console.error("Erro no servidor:", erro);

        return Response.json(
            {
                erro: "Não foi possível obter uma resposta da IA."
            },
            {
                status: 500
            }
        );
    }
}