export function anonymizeText(text: string | null | undefined): string {
  if (!text) return "";

  let anonymized = text;

  // Remover e-mails
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  anonymized = anonymized.replace(emailRegex, "[E-MAIL REMOVIDO]");

  // Remover telefones (Brasil e genéricos)
  // +55 84 99999-9999, (84) 99999-9999, 84999999999, 99999-9999
  const phoneRegex = /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\d{4}|\d{4})[-\s]?\d{4}/g;
  anonymized = anonymized.replace(phoneRegex, "[TELEFONE REMOVIDO]");

  return anonymized;
}

export function anonymizeVisitorContext(
  text: string | null | undefined, 
  visitorName?: string
): string {
  let anonymized = anonymizeText(text);

  if (visitorName && anonymized) {
    // 1. Substitui o nome completo (com boundaries unicode)
    const escapedName = visitorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameRegex = new RegExp(`(?<!\\p{L})${escapedName}(?!\\p{L})`, 'giu');
    anonymized = anonymized.replace(nameRegex, "o visitante");

    // 2. Substitui o primeiro nome (se tiver mais de 2 letras para evitar falsos positivos)
    const firstName = visitorName.split(' ')[0];
    if (firstName && firstName.length > 2) {
      const escapedFirstName = firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const firstNameRegex = new RegExp(`(?<!\\p{L})${escapedFirstName}(?!\\p{L})`, 'giu');
      anonymized = anonymized.replace(firstNameRegex, "o visitante");
    }
  }

  return anonymized;
}
