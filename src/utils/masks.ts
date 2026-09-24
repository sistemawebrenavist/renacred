/**
 * Máscaras e Validadores para Veículos e Documentos (Padrão Oficial InfoSinistros)
 */

/**
 * Máscara para Placa (Cinza tradicional e Mercosul)
 * Formato: AAA-0000 ou AAA-0A00
 * Impede estritamente digitação de caracteres inválidos por posição.
 */
export const maskPlaca = (value: string): string => {
  if (!value) return '';

  // Remove tudo que não é letra ou número
  const limpo = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  let resultado = '';

  for (let i = 0; i < limpo.length && i < 7; i++) {
    const char = limpo[i];
    const isLetra = /[A-Z]/.test(char);
    const isNumero = /[0-9]/.test(char);

    if (i < 3) {
      // Posições 1-3: estritamente letras
      if (isLetra) resultado += char;
    } else if (i === 3) {
      // Posição 4: estritamente número
      if (isNumero) resultado += char;
    } else if (i === 4) {
      // Posição 5: letra ou número (Mercosul ou antiga)
      if (isLetra || isNumero) resultado += char;
    } else {
      // Posições 6-7: estritamente números
      if (isNumero) resultado += char;
    }
  }

  // Formato visual: AAA-0000 ou AAA-0A00
  if (resultado.length <= 3) return resultado;
  return `${resultado.slice(0, 3)}-${resultado.slice(3)}`;
};

/**
 * Validação regex estrita de Placa Completa
 */
export const isValidPlaca = (placa: string): boolean => {
  if (!placa) return false;
  const limpo = placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (limpo.length !== 7) return false;

  // Tradicional: AAA9999 | Mercosul: AAA9A99
  const regexTradicional = /^[A-Z]{3}[0-9]{4}$/;
  const regexMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

  return regexTradicional.test(limpo) || regexMercosul.test(limpo);
};

/**
 * Máscara para Chassi (17 caracteres alfanuméricos)
 */
export const maskChassi = (value: string): string => {
  return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 17);
};

/**
 * Máscara para Renavam (11 dígitos numéricos)
 */
export const maskRenavam = (value: string): string => {
  return value.replace(/\D/g, '').slice(0, 11);
};

/**
 * Máscara para CPF: 000.000.000-00
 */
export const maskCPF = (value: string): string => {
  const v = value.replace(/\D/g, '');
  if (v.length <= 3) return v;
  if (v.length <= 6) return `${v.slice(0, 3)}.${v.slice(3)}`;
  if (v.length <= 9) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`;
  return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9, 11)}`;
};

/**
 * Máscara para CNPJ: 00.000.000/0000-00
 */
export const maskCNPJ = (value: string): string => {
  const v = value.replace(/\D/g, '');
  if (v.length <= 2) return v;
  if (v.length <= 5) return `${v.slice(0, 2)}.${v.slice(2)}`;
  if (v.length <= 8) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5)}`;
  if (v.length <= 12) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8)}`;
  return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12, 14)}`;
};

/**
 * Máscara para Documento (CPF ou CNPJ autodetectado)
 */
export const maskDocument = (value: string): string => {
  if (!value) return '';
  const v = value.replace(/\D/g, '');
  if (v.length <= 11) {
    return maskCPF(value);
  }
  return maskCNPJ(value);
};
