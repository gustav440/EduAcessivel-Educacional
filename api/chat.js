import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request) {
    try {
        const { mensagem } = await request.json();

        if (!mensagem) {
            return Response.json(
                { erro: "Mensagem não informada." },
                { status: 400 }
            );
        }

        const resposta = await openai.responses.create({
            model: "gpt-5.6-luna",
            instructions: `
                Você é a assistente virtual do Edu Acessível,
                uma plataforma de educação acessível.

                Seu objetivo é ajudar os usuários com dúvidas
                relacionadas aos conteúdos educacionais do site.

                Responda em português do Brasil.
                Seja clara, amigável e fácil de entender.
                Não invente informações sobre o site.
            `,
            input: mensagem
        });

        return Response.json({
            resposta: resposta.output_text
        });

    } catch (erro) {
        console.error(erro);

        return Response.json(
            { erro: "Não foi possível obter uma resposta da IA." },
            { status: 500 }
        );
    }
}