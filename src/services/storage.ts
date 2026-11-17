import type {
  EstadoTarefa,
  FaseSessao,
  PrioridadeTarefa,
  SessaoAtiva,
  SnapshotPreset,
  StatusSessao,
  Tarefa,
  TemporizadorPersonalizado,
} from '../domain/types';
import {
  ESTADOS_TAREFA_VALIDOS,
  PRIORIDADES_TAREFA_VALIDAS,
  validarPresetInput,
  validarTarefaInput,
} from '../domain/validators';

export const STORAGE_KEYS = {
  PRESETS: 'pomodoro.presets',
  TAREFAS: 'pomodoro.tarefas',
  SESSAO_ATIVA: 'pomodoro.sessaoAtiva',
} as const;

export interface ResultadoCarregamentoLista<T> {
  dados: T[];
  erro: string | null;
}

export interface ResultadoCarregamentoSessao {
  sessao: SessaoAtiva | null;
  corrompida: boolean;
  erro: string | null;
}

export interface ResultadoPersistencia {
  sucesso: boolean;
  erro: string | null;
}

const FASES_VALIDAS: readonly FaseSessao[] = [
  'foco',
  'pausaCurta',
  'pausaLonga',
];
const STATUS_VALIDOS: readonly StatusSessao[] = [
  'emAndamento',
  'pausada',
  'concluida',
];

function criarPresetsIniciais(agora: number): TemporizadorPersonalizado[] {
  return [
    {
      id: 'preset-classico',
      nome: 'Pomodoro Clássico',
      tempoFocoMin: 25,
      tempoPausaCurtaMin: 5,
      ciclosAntesPausaLonga: 4,
      tempoPausaLongaMin: 15,
      criadoEm: agora,
      atualizadoEm: agora,
    },
    {
      id: 'preset-estudo-longo',
      nome: 'Estudo Intenso',
      tempoFocoMin: 50,
      tempoPausaCurtaMin: 10,
      ciclosAntesPausaLonga: 2,
      tempoPausaLongaMin: 20,
      criadoEm: agora,
      atualizadoEm: agora,
    },
  ];
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function ehNumeroFinito(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor);
}

function ehSnapshotValido(valor: unknown): valor is SnapshotPreset {
  if (!ehObjeto(valor)) return false;
  const validacao = validarPresetInput({
    nome: valor.nome as string,
    tempoFocoMin: valor.tempoFocoMin as number,
    tempoPausaCurtaMin: valor.tempoPausaCurtaMin as number,
    ciclosAntesPausaLonga: valor.ciclosAntesPausaLonga as number,
    tempoPausaLongaMin: valor.tempoPausaLongaMin as number,
  });
  return validacao.valido;
}

function ehPresetValido(valor: unknown): valor is TemporizadorPersonalizado {
  if (!ehObjeto(valor)) return false;
  if (typeof valor.id !== 'string' || valor.id.trim().length === 0) return false;
  if (!ehNumeroFinito(valor.criadoEm) || !ehNumeroFinito(valor.atualizadoEm)) {
    return false;
  }
  return ehSnapshotValido(valor);
}

function ehTarefaValida(valor: unknown): valor is Tarefa {
  if (!ehObjeto(valor)) return false;
  if (typeof valor.id !== 'string' || valor.id.trim().length === 0) return false;
  if (!ehNumeroFinito(valor.criadaEm) || !ehNumeroFinito(valor.atualizadaEm)) {
    return false;
  }
  const validacao = validarTarefaInput({
    titulo: valor.titulo as string,
    estado: valor.estado as EstadoTarefa,
    prioridade: valor.prioridade as PrioridadeTarefa,
  });
  return (
    validacao.valido &&
    ESTADOS_TAREFA_VALIDOS.includes(valor.estado as EstadoTarefa) &&
    PRIORIDADES_TAREFA_VALIDAS.includes(valor.prioridade as PrioridadeTarefa)
  );
}

function ehSessaoAtivaValida(valor: unknown): valor is SessaoAtiva {
  if (!ehObjeto(valor)) return false;
  if (typeof valor.id !== 'string' || valor.id.trim().length === 0) return false;
  if (typeof valor.presetId !== 'string' || valor.presetId.trim().length === 0) {
    return false;
  }
  if (!ehSnapshotValido(valor.snapshotPreset)) return false;
  if (!FASES_VALIDAS.includes(valor.faseAtual as FaseSessao)) return false;
  if (
    !ehNumeroFinito(valor.cicloAtual) ||
    !Number.isInteger(valor.cicloAtual) ||
    valor.cicloAtual < 1 ||
    valor.cicloAtual > valor.snapshotPreset.ciclosAntesPausaLonga
  ) {
    return false;
  }
  if (!STATUS_VALIDOS.includes(valor.status as StatusSessao)) return false;
  if (
    !ehNumeroFinito(valor.inicioFaseEm) ||
    !ehNumeroFinito(valor.fimFasePrevistoEm) ||
    !ehNumeroFinito(valor.criadaEm) ||
    !ehNumeroFinito(valor.atualizadaEm)
  ) {
    return false;
  }
  if (valor.pausadaEm !== null && !ehNumeroFinito(valor.pausadaEm)) {
    return false;
  }
  if (
    valor.tempoRestanteAoPausarMs !== null &&
    (!ehNumeroFinito(valor.tempoRestanteAoPausarMs) ||
      valor.tempoRestanteAoPausarMs < 0)
  ) {
    return false;
  }
  if (valor.status === 'pausada' && valor.tempoRestanteAoPausarMs === null) {
    return false;
  }
  return true;
}

export function carregarPresets(): ResultadoCarregamentoLista<TemporizadorPersonalizado> {
  try {
    const bruto = window.localStorage.getItem(STORAGE_KEYS.PRESETS);
    if (bruto === null) {
      const iniciais = criarPresetsIniciais(Date.now());
      salvarPresets(iniciais);
      return { dados: iniciais, erro: null };
    }

    const parsed: unknown = JSON.parse(bruto);
    if (!Array.isArray(parsed) || !parsed.every(ehPresetValido)) {
      return {
        dados: [],
        erro: 'Os dados de temporizadores salvos no navegador estão corrompidos.',
      };
    }

    return { dados: parsed, erro: null };
  } catch {
    return {
      dados: [],
      erro: 'Não foi possível ler os temporizadores do armazenamento local.',
    };
  }
}

export function salvarPresets(
  presets: readonly TemporizadorPersonalizado[]
): ResultadoPersistencia {
  try {
    window.localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(presets));
    return { sucesso: true, erro: null };
  } catch {
    return {
      sucesso: false,
      erro: 'Falha ao salvar os temporizadores no armazenamento local.',
    };
  }
}

export function carregarTarefas(): ResultadoCarregamentoLista<Tarefa> {
  try {
    const bruto = window.localStorage.getItem(STORAGE_KEYS.TAREFAS);
    if (bruto === null) {
      return { dados: [], erro: null };
    }

    const parsed: unknown = JSON.parse(bruto);
    if (!Array.isArray(parsed) || !parsed.every(ehTarefaValida)) {
      return {
        dados: [],
        erro: 'Os dados de tarefas salvos no navegador estão corrompidos.',
      };
    }

    return { dados: parsed, erro: null };
  } catch {
    return {
      dados: [],
      erro: 'Não foi possível ler as tarefas do armazenamento local.',
    };
  }
}

export function salvarTarefas(tarefas: readonly Tarefa[]): ResultadoPersistencia {
  try {
    window.localStorage.setItem(STORAGE_KEYS.TAREFAS, JSON.stringify(tarefas));
    return { sucesso: true, erro: null };
  } catch {
    return {
      sucesso: false,
      erro: 'Falha ao salvar as tarefas no armazenamento local.',
    };
  }
}

export function carregarSessaoAtiva(): ResultadoCarregamentoSessao {
  try {
    const bruto = window.localStorage.getItem(STORAGE_KEYS.SESSAO_ATIVA);
    if (bruto === null) {
      return { sessao: null, corrompida: false, erro: null };
    }

    const parsed: unknown = JSON.parse(bruto);
    if (!ehSessaoAtivaValida(parsed)) {
      return {
        sessao: null,
        corrompida: true,
        erro: 'A sessão salva anteriormente está inconsistente ou corrompida. Deseja descartá-la?',
      };
    }

    return { sessao: parsed, corrompida: false, erro: null };
  } catch {
    return {
      sessao: null,
      corrompida: true,
      erro: 'Não foi possível restaurar a sessão salva devido a dados corrompidos. Deseja descartá-la?',
    };
  }
}

export function salvarSessaoAtiva(
  sessao: SessaoAtiva | null
): ResultadoPersistencia {
  try {
    if (sessao === null) {
      window.localStorage.removeItem(STORAGE_KEYS.SESSAO_ATIVA);
    } else {
      window.localStorage.setItem(
        STORAGE_KEYS.SESSAO_ATIVA,
        JSON.stringify(sessao)
      );
    }
    return { sucesso: true, erro: null };
  } catch {
    return {
      sucesso: false,
      erro: 'Falha ao persistir a sessão ativa no armazenamento local.',
    };
  }
}
