/** User-facing catalog of what this agent can do. Keep in sync with the skill. */

export const CAPABILITIES_PT = {
  title: "O que o Flash Punch Agent pode fazer (Flash / Folha Certa)",
  can: [
    {
      name: "Conferir um mês",
      detail:
        "Abrir o espelho até hoje, com horários coloridos (aprovado, em aprovação, a marcar) e o banco de horas na linha Anterior | Atual | Saldo. Diga o mês, por exemplo “agosto” ou “julho de 2026”.",
    },
    {
      name: "Varredura de meses",
      detail:
        "Listar quais meses têm período e registro na Folha Certa, com saldo de cada um.",
    },
    {
      name: "Sugerir horários faltantes",
      detail:
        "Montar a jornada incompleta respeitando carga e intervalo, o mais perto possível da sua rotina. Explico a interpretação no chat; o resumo visual fica só com data e horários.",
    },
    {
      name: "Incluir ponto manual",
      detail:
        "Quando você pedir um ajuste, o resumo visual mostra só os dias que mudam: Agora e Depois, horários coloridos. Sem o mês inteiro. Só lanço depois que você confirmar. Motivo padrão: Esquecimento de marcação (em aprovação). Horários futuros não entram, salvo se você pedir.",
    },
    {
      name: "Ajustar sua configuração",
      detail:
        "Cidade sede, dias e horários da escala, carga horária e tempo de intervalo.",
    },
    {
      name: "Entrar na Flash",
      detail:
        "Se a sessão cair, abro o login para CPF, senha e código do app Flash.",
    },
  ],
  notYet: [
    "Lembretes automáticos de batida",
    "Bater ponto “ao vivo” na tela de marcação (ainda não mapeada)",
    "Aprovar ponto no lugar do gestor",
    "Inventar espelho de mês sem período na Folha Certa",
  ],
  examples: [
    "Mostra o resumo de agosto",
    "Quais meses têm registro?",
    "Sugere os horários que faltam hoje",
    "Inclui 10:00 no dia 14/08",
    "Muda o intervalo para 1 hora",
  ],
};

export function formatCapabilitiesPt(): string {
  const { title, can, notYet, examples } = CAPABILITIES_PT;
  const canLines = can.map((item) => `- ${item.name}: ${item.detail}`).join("\n");
  const notLines = notYet.map((item) => `- ${item}`).join("\n");
  const exLines = examples.map((item) => `- ${item}`).join("\n");
  return [
    title,
    "",
    "Posso:",
    canLines,
    "",
    "Ainda não:",
    notLines,
    "",
    "Exemplos de pedido:",
    exLines,
  ].join("\n");
}
