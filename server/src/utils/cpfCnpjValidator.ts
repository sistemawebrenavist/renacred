export function sanitizeCpfCnpj(value: string): string {
  if (!value) return '';
  return value.replace(/\D/g, '').trim();
}

export function isValidCpf(cpf: string): boolean {
  const clean = sanitizeCpfCnpj(cpf);
  if (clean.length !== 11) return false;
  if (/^(\d)\1+$/.test(clean)) return false;

  let sum = 0;
  let remainder: number;

  for (let i = 1; i <= 9; i++) sum += parseInt(clean.substring(i - 1, i)) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) sum += parseInt(clean.substring(i - 1, i)) * (12 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.substring(10, 11))) return false;

  return true;
}

export function isValidCnpj(cnpj: string): boolean {
  const clean = sanitizeCpfCnpj(cnpj);
  if (clean.length !== 14) return false;
  if (/^(\d)\1+$/.test(clean)) return false;

  let size = clean.length - 2;
  let numbers = clean.substring(0, size);
  const digits = clean.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  size = size + 1;
  numbers = clean.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}

export function validateIdentifier(identifier: string): { valid: boolean; type?: 'CPF' | 'CNPJ'; cleaned: string } {
  const cleaned = sanitizeCpfCnpj(identifier);
  if (cleaned.length === 11) {
    return { valid: isValidCpf(cleaned), type: 'CPF', cleaned };
  } else if (cleaned.length === 14) {
    return { valid: isValidCnpj(cleaned), type: 'CNPJ', cleaned };
  }
  return { valid: false, cleaned };
}
