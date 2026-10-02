/**
 * Utilitários para processamento e auditoria veicular da Renacred (E2)
 */

export interface ProprietarioComPosse {
  ordem: number;
  documento: string;
  tipo: string;
  nome: string;
  razao_social?: string;
  nome_fantasia?: string;
  data: string;
  hora: string;
  uf: string;
  municipio: string;
  evento: string | null;
  atual: boolean;
  tempoPosse: string;
  isFirst: boolean;
  isLast: boolean;
  total: number;
}

/**
 * Converte data em formato brasileiro (DD/MM/AAAA) e hora (HH:MM:SS) em Date
 */
export function parseDataHoraBR(dataStr?: string, horaStr?: string): Date | null {
  if (!dataStr || typeof dataStr !== 'string') return null;
  const trimmed = dataStr.trim();

  let dia = 0;
  let mes = 0;
  let ano = 0;

  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      dia = parseInt(parts[0], 10);
      mes = parseInt(parts[1], 10) - 1;
      ano = parseInt(parts[2], 10);
    }
  } else if (trimmed.includes('-')) {
    const parts = trimmed.split('T')[0].split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        ano = parseInt(parts[0], 10);
        mes = parseInt(parts[1], 10) - 1;
        dia = parseInt(parts[2], 10);
      } else {
        dia = parseInt(parts[0], 10);
        mes = parseInt(parts[1], 10) - 1;
        ano = parseInt(parts[2], 10);
      }
    }
  }

  if (isNaN(dia) || isNaN(mes) || isNaN(ano) || ano === 0) return null;

  let horas = 0;
  let minutos = 0;
  let segundos = 0;
  if (horaStr && typeof horaStr === 'string') {
    const timeParts = horaStr.trim().split(':');
    horas = parseInt(timeParts[0], 10) || 0;
    minutos = parseInt(timeParts[1], 10) || 0;
    segundos = parseInt(timeParts[2], 10) || 0;
  } else if (trimmed.includes('T')) {
    const timePart = trimmed.split('T')[1]?.split('.')[0] || '';
    const timeParts = timePart.split(':');
    horas = parseInt(timeParts[0], 10) || 0;
    minutos = parseInt(timeParts[1], 10) || 0;
    segundos = parseInt(timeParts[2], 10) || 0;
  }

  return new Date(ano, mes, dia, horas, minutos, segundos);
}

/**
 * Calcula de forma humanizada o tempo de posse de um proprietário veicular.
 * - Para proprietários anteriores: intervalo entre a data de aquisição e a transferência para o próximo.
 * - Para o proprietário atual vigente: intervalo entre a data de aquisição dele e a data de hoje.
 */
export function calcularTempoPosse(
  dataInicioStr?: string,
  horaInicioStr?: string,
  dataFimStr?: string,
  horaFimStr?: string,
  isAtual?: boolean
): string {
  const inicio = parseDataHoraBR(dataInicioStr, horaInicioStr);
  if (!inicio) return 'Data não informada';

  const fim = isAtual ? new Date() : parseDataHoraBR(dataFimStr, horaFimStr);
  if (!fim) return isAtual ? 'Posse ativa' : 'Período não informado';

  if (fim.getTime() <= inicio.getTime()) {
    return 'Menos de 24h';
  }

  let anos = fim.getFullYear() - inicio.getFullYear();
  let meses = fim.getMonth() - inicio.getMonth();
  let dias = fim.getDate() - inicio.getDate();

  if (dias < 0) {
    meses -= 1;
    const prevMonthLastDay = new Date(fim.getFullYear(), fim.getMonth(), 0).getDate();
    dias += prevMonthLastDay;
  }
  if (meses < 0) {
    anos -= 1;
    meses += 12;
  }

  const diffDiasTotal = Math.floor((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDiasTotal < 30) {
    return `${diffDiasTotal} ${diffDiasTotal === 1 ? 'dia' : 'dias'}`;
  }

  const partes: string[] = [];
  if (anos > 0) {
    partes.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`);
  }
  if (meses > 0) {
    partes.push(`${meses} ${meses === 1 ? 'mês' : 'meses'}`);
  }
  // Se for menos de 1 ano, inclui os dias para maior precisão (ex: "4 meses e 18 dias")
  if (anos === 0 && dias > 0) {
    partes.push(`${dias} ${dias === 1 ? 'dia' : 'dias'}`);
  }

  const texto = partes.length > 0 ? partes.join(' e ') : 'Menos de 24h';
  return isAtual ? `${texto} (Vigente)` : texto;
}

/**
 * Ordena a lista de histórico cronologicamente ascendente (do 1º registro ao vigente)
 * e calcula o tempo de posse de cada proprietário.
 */
export function processarHistoricoProprietarios(rawHistorico: any[]): ProprietarioComPosse[] {
  if (!Array.isArray(rawHistorico) || rawHistorico.length === 0) return [];

  // Ordenação ascendente: da data mais antiga para a mais recente
  const ordenados = [...rawHistorico].sort((a, b) => {
    const timeA = parseDataHoraBR(a.data, a.hora)?.getTime() || 0;
    const timeB = parseDataHoraBR(b.data, b.hora)?.getTime() || 0;
    return timeA - timeB;
  });

  const total = ordenados.length;

  return ordenados.map((item, idx) => {
    const isLast = idx === total - 1;
    const isFirst = idx === 0;
    const isAtual = item.atual || isLast;

    let tempoPosse = '';
    if (isLast) {
      tempoPosse = calcularTempoPosse(item.data, item.hora, undefined, undefined, true);
    } else {
      const proximo = ordenados[idx + 1];
      tempoPosse = calcularTempoPosse(item.data, item.hora, proximo.data, proximo.hora, false);
    }

    return {
      ...item,
      ordem: idx + 1,
      total,
      isFirst,
      isLast,
      atual: isAtual,
      tempoPosse,
    };
  });
}
