import type { EstadoTarefa, PresetInput, PrioridadeTarefa, TarefaInput } from './types';

export interface ResultadoValidacao<T extends string> {
  valido: boolean;
  erros: Partial<Record<T, string>>;
}

export const ESTADOS_TAREFA_VALIDOS: readonly EstadoTarefa[] = [
  'backlog',
  'aFazer',
  'emExecucao',
  'concluida',
  'cancelada',
];

export const PRIORIDADES_TAREFA_VALIDAS: readonly PrioridadeTarefa[] = [
  'baixa',
  'media',
  'alta',
];

function validarInteiroNoIntervalo(
  valor: number,
  min: number,
  max: number,
  rotulo: string
): string | undefined {
  if (typeof valor !== 'number' || Number.isNaN(valor)) {
    return `${rotulo} é obrigatório.`;
  }
  if (!Number.isInteger(valor)) {
    return `${rotulo} deve ser um número inteiro.`;
  }
  if (valor < min || valor > max) {
    return `${rotulo} deve estar entre ${min} e ${max}.`;
  }
  return undefined;
}

/**
 * Valida os campos de criação/edição de um temporizador personalizado (VR-01 a VR-05).
 */
export function validarPresetInput(
  input: PresetInput
): ResultadoValidacao<keyof PresetInput> {
  const erros: Partial<Record<keyof PresetInput, string>> = {};
  const nomeLimpo = typeof input.nome === 'string' ? input.nome.trim() : '';

  // VR-01: Nome obrigatório entre 1 e 40 caracteres
  if (nomeLimpo.length === 0) {
    erros.nome = 'O nome do temporizador é obrigatório.';
  } else if (nomeLimpo.length > 40) {
    erros.nome = 'O nome do temporizador deve ter no máximo 40 caracteres.';
  }

  // VR-02: Tempo de foco inteiro entre 1 e 120 minutos
  const erroFoco = validarInteiroNoIntervalo(
    input.tempoFocoMin,
    1,
    120,
    'O tempo de foco'
  );
  if (erroFoco) erros.tempoFocoMin = erroFoco;

  // VR-03: Tempo de pausa curta inteiro entre 1 e 60 minutos
  const erroPausaCurta = validarInteiroNoIntervalo(
    input.tempoPausaCurtaMin,
    1,
    60,
    'O tempo de pausa curta'
  );
  if (erroPausaCurta) erros.tempoPausaCurtaMin = erroPausaCurta;

  // VR-04: Quantidade de ciclos antes da pausa longa inteiro entre 1 e 12
  const erroCiclos = validarInteiroNoIntervalo(
    input.ciclosAntesPausaLonga,
    1,
    12,
    'A quantidade de ciclos'
  );
  if (erroCiclos) erros.ciclosAntesPausaLonga = erroCiclos;

  // VR-05: Tempo de pausa longa inteiro entre 1 e 60 minutos
  const erroPausaLonga = validarInteiroNoIntervalo(
    input.tempoPausaLongaMin,
    1,
    60,
    'O tempo de pausa longa'
  );
  if (erroPausaLonga) erros.tempoPausaLongaMin = erroPausaLonga;

  return {
    valido: Object.keys(erros).length === 0,
    erros,
  };
}

/**
 * Valida os campos de criação/edição de uma tarefa (VR-06 a VR-08).
 */
export function validarTarefaInput(
  input: TarefaInput
): ResultadoValidacao<keyof TarefaInput> {
  const erros: Partial<Record<keyof TarefaInput, string>> = {};
  const tituloLimpo = typeof input.titulo === 'string' ? input.titulo.trim() : '';

  // VR-06: Título obrigatório entre 1 e 100 caracteres
  if (tituloLimpo.length === 0) {
    erros.titulo = 'O título da tarefa é obrigatório.';
  } else if (tituloLimpo.length > 100) {
    erros.titulo = 'O título da tarefa deve ter no máximo 100 caracteres.';
  }

  // VR-07: Estado válido
  if (!ESTADOS_TAREFA_VALIDOS.includes(input.estado)) {
    erros.estado = 'Selecione um estado válido para a tarefa.';
  }

  // VR-08: Prioridade válida
  if (!PRIORIDADES_TAREFA_VALIDAS.includes(input.prioridade)) {
    erros.prioridade = 'Selecione uma prioridade válida para a tarefa.';
  }

  return {
    valido: Object.keys(erros).length === 0,
    erros,
  };
}
