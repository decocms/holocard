import { cardManifestJsonSchema, CardManifestSchema, type CardManifest } from "@/core/types";

const SYSTEM_PROMPT = `Você edita mensagens para cartões pessoais.
Retorne somente o objeto solicitado pelo schema.
Preserve a intenção, os nomes e a voz de quem escreveu.
Não invente fatos, relações, memórias, datas ou assinaturas.
Não troque uma palavra por outra de sentido diferente. "Saudade" e "saúde", por exemplo, não são intercambiáveis.
Escreva no idioma do pedido; use pt-BR quando não estiver claro e aplique a ortografia e os acentos corretos.
Use palavras que a pessoa diria em uma mensagem de WhatsApp. O título deve ser curto.
Evite frases prontas como "novo ciclo", "momentos inesquecíveis", "jornada", "uma lembrança especial", "que seu dia seja repleto" e "celebrar cada momento", a menos que o usuário tenha escrito assim.
Não enfeite o texto com listas de três, abstrações ou frases simétricas.
Escolha aurora para uso geral, confetti para celebrações animadas e keepsake para mensagens íntimas.
Use frame silver por padrão, gold para celebrações formais, prism para mensagens animadas, ink para um visual sóbrio, copper para calor e pearl para delicadeza.
Use pattern sparkles para celebrações, waves para mensagens íntimas, stars para mensagens noturnas, rays para uso geral e none quando o pedido for minimalista.
Use customColor "#e72e83" e não escolha accent custom; essa opção pertence ao editor.
occasion é uma etiqueta curta, como "Feliz aniversário", "Para vocês dois" ou "Obrigado por tudo"; nunca use o nome do template.
photoHeight deve ser 56. photoPositionX e photoPositionY devem ser 50.
Coloque o nome de quem envia apenas em signature e não o repita no fim da mensagem.
Se o pedido não informar quem assina, signature deve ser exatamente uma string vazia.
Nunca inclua HTML, Markdown, URLs, hashtags ou instruções técnicas.`;

export async function createManifest(
  env: Env,
  prompt: string,
  signature = "",
): Promise<CardManifest> {
  const normalizedSignature = signature.trim().slice(0, 60);
  const manifest = await runManifestModel(env, env.CREATE_MODEL, [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Organize este pedido em um cartão.

Assinatura em campo separado: ${normalizedSignature || "não informada"}

Pedido:
${prompt}`,
    },
  ]).catch((error) => {
    console.error(JSON.stringify({ event: "ai_create_fallback", error: String(error) }));
    return fallbackManifest(prompt);
  });
  return { ...manifest, signature: normalizedSignature };
}

export async function reviseManifest(
  env: Env,
  current: CardManifest,
  instruction: string,
): Promise<CardManifest> {
  return runManifestModel(env, env.REVISION_MODEL, [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Revise o cartão sem perder os fatos já presentes.

Cartão atual:
${JSON.stringify(current)}

Pedido de revisão:
${instruction}`,
    },
  ]);
}

async function runManifestModel(
  env: Env,
  model: string,
  messages: Array<{ role: "system" | "user"; content: string }>,
): Promise<CardManifest> {
  const output = await env.AI.run(model, {
    messages,
    max_tokens: 420,
    temperature: 0.45,
    response_format: {
      type: "json_schema",
      json_schema: cardManifestJsonSchema,
    },
  });

  const value = extractModelValue(output);
  return CardManifestSchema.parse(value);
}

function extractModelValue(output: unknown): unknown {
  const direct = CardManifestSchema.safeParse(output);
  if (direct.success) return direct.data;
  const value = output as {
    response?: unknown;
    output_text?: unknown;
    choices?: Array<{ message?: { content?: unknown }; text?: unknown }>;
    output?: Array<{ content?: Array<{ text?: unknown }> }>;
  };
  const response =
    value.response ??
    value.output_text ??
    value.choices?.[0]?.message?.content ??
    value.choices?.[0]?.text ??
    value.output?.flatMap((item) => item.content ?? []).find((item) => typeof item.text === "string")
      ?.text;
  if (typeof response !== "string") {
    const keys = output && typeof output === "object" ? Object.keys(output) : [];
    throw new Error(`Unexpected AI output shape: ${keys.join(",") || typeof output}`);
  }
  const cleaned = response
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

function fallbackManifest(prompt: string): CardManifest {
  const clean = prompt.replace(/\s+/g, " ").trim().slice(0, 320);
  const firstSentence = clean.split(/[.!?]/)[0]?.trim() || "Um recado para você";
  const celebratory = /anivers|parab[eé]ns|formatura|conquista|festa|celebr/i.test(clean);
  const intimate = /casamento|amor|saudade|mem[oó]ria|obrigad|carinho/i.test(clean);

  return CardManifestSchema.parse({
    version: 1,
    locale: "pt-BR",
    template: celebratory ? "confetti" : intimate ? "keepsake" : "aurora",
    accent: celebratory ? "sun" : intimate ? "rose" : "aqua",
    customColor: "#e72e83",
    frame: celebratory ? "prism" : intimate ? "gold" : "silver",
    pattern: celebratory ? "sparkles" : intimate ? "waves" : "rays",
    title: firstSentence.slice(0, 60),
    message: clean,
    signature: "",
    occasion: celebratory ? "Parabéns!" : intimate ? "Com carinho" : "Para você",
    photoHeight: 56,
    photoPositionX: 50,
    photoPositionY: 50,
  });
}
