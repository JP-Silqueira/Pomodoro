import type {
  FaseSessao,
  SessaoAtiva,
  SnapshotPreset,
  TemporizadorPersonalizado,
} from './types';

export interface ProximaFaseResultado {
  faseAtual: FaseSessao;
  cicloAtual: number;
  concluida: boolean;
}

export interface PularFaseResultado {
  sessao: SessaoAtiva | null;
  concluida: boolean;
}

export interface RecalculoSessaoResultado {
  sessao: SessaoAtiva;
  fasesAvancadas: number;
  concluiuAgora: boolean;
}

function gerarIdSessao(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sessao-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Retorna a duração em milissegundos de uma fase com base no snapshot do preset.
 */
export function obterDuracaoFaseMs(
  snapshot: SnapshotPreset,
  fase: FaseSessao
): number {
  switch (fase) {
    case 'foco':
      return snapshot.tempoFocoMin * 60_000;
    case 'pausaCurta':
      return snapshot.tempoPausaCurtaMin * 60_000;
    case 'pausaLonga':
      return snapshot.tempoPausaLongaMin * 60_000;
  }
}

/**
 * Cria uma nova sessão ativa a partir de um preset, salvando seu snapshot (UC04, RN-05).
 */
export function criarSessaoAtiva(
  preset: TemporizadorPersonalizado,
  agoraMs: number,
  id: string = gerarIdSessao()
): SessaoAtiva {
  const snapshotPreset: SnapshotPreset = {
    nome: preset.nome,
    tempoFocoMin: preset.tempoFocoMin,
    tempoPausaCurtaMin: preset.tempoPausaCurtaMin,
    ciclosAntesPausaLonga: preset.ciclosAntesPausaLonga,
    tempoPausaLongaMin: preset.tempoPausaLongaMin,
  };

  const duracaoMs = obterDuracaoFaseMs(snapshotPreset, 'foco');

  return {
    id,
    presetId: preset.id,
    snapshotPreset,
    faseAtual: 'foco',
    cicloAtual: 1,
    status: 'emAndamento',
    inicioFaseEm: agoraMs,
    fimFasePrevistoEm: agoraMs + duracaoMs,
    pausadaEm: null,
    tempoRestanteAoPausarMs: null,
    criadaEm: agoraMs,
    atualizadaEm: agoraMs,
  };
}

/**
 * Pausa a sessão em andamento preservando o tempo restante da fase corrente (UC05, RN-06).
 */
export function pausarSessao(sessao: SessaoAtiva, agoraMs: number): SessaoAtiva {
  if (sessao.status !== 'emAndamento') {
    return sessao;
  }

  const tempoRestanteMs = Math.max(0, sessao.fimFasePrevistoEm - agoraMs);

  return {
    ...sessao,
    status: 'pausada',
    pausadaEm: agoraMs,
    tempoRestanteAoPausarMs: tempoRestanteMs,
    atualizadaEm: agoraMs,
  };
}

/**
 * Retoma uma sessão pausada recalculando o fim previsto a partir do instante da retomada (UC05).
 */
export function retomarSessao(sessao: SessaoAtiva, agoraMs: number): SessaoAtiva {
  if (sessao.status !== 'pausada') {
    return sessao;
  }

  const restanteMs =
    sessao.tempoRestanteAoPausarMs ??
    obterDuracaoFaseMs(sessao.snapshotPreset, sessao.faseAtual);

  return {
    ...sessao,
    status: 'emAndamento',
    inicioFaseEm: agoraMs,
    fimFasePrevistoEm: agoraMs + Math.max(0, restanteMs),
    pausadaEm: null,
    tempoRestanteAoPausarMs: null,
    atualizadaEm: agoraMs,
  };
}

/**
 * Calcula a transição normal de fase após conclusão natural do tempo.
 */
export function calcularProximaFaseNormal(
  faseAtual: FaseSessao,
  cicloAtual: number,
  ciclosAntesPausaLonga: number
): ProximaFaseResultado {
  if (faseAtual === 'foco') {
    const proximaFase: FaseSessao =
      cicloAtual < ciclosAntesPausaLonga ? 'pausaCurta' : 'pausaLonga';
    return {
      faseAtual: proximaFase,
      cicloAtual,
      concluida: false,
    };
  }

  if (faseAtual === 'pausaCurta') {
    return {
      faseAtual: 'foco',
      cicloAtual: cicloAtual + 1,
      concluida: false,
    };
  }

  return {
    faseAtual: 'pausaLonga',
    cicloAtual,
    concluida: true,
  };
}

/**
 * Avança manualmente da fase atual para a próxima fase prevista sem incrementar ciclos (UC06, RN-03).
 * Caso esteja na última fase antes da conclusão da sessão (pausaLonga), encerra a sessão (UC06 1a).
 */
export function pularFase(
  sessao: SessaoAtiva,
  agoraMs: number
): PularFaseResultado {
  if (sessao.status === 'concluida') {
    return { sessao: null, concluida: true };
  }

  if (sessao.faseAtual === 'pausaLonga') {
    return { sessao: null, concluida: true };
  }

  let proximaFase: FaseSessao;
  if (sessao.faseAtual === 'foco') {
    proximaFase =
      sessao.cicloAtual < sessao.snapshotPreset.ciclosAntesPausaLonga
        ? 'pausaCurta'
        : 'pausaLonga';
  } else {
    // RN-03: pular fase de pausa não incrementa a contagem de ciclos
    proximaFase = 'foco';
  }

  const duracaoNovaFaseMs = obterDuracaoFaseMs(sessao.snapshotPreset, proximaFase);

  if (sessao.status === 'pausada') {
    return {
      concluida: false,
      sessao: {
        ...sessao,
        faseAtual: proximaFase,
        cicloAtual: sessao.cicloAtual,
        inicioFaseEm: agoraMs,
        fimFasePrevistoEm: agoraMs + duracaoNovaFaseMs,
        pausadaEm: agoraMs,
        tempoRestanteAoPausarMs: duracaoNovaFaseMs,
        atualizadaEm: agoraMs,
      },
    };
  }

  return {
    concluida: false,
    sessao: {
      ...sessao,
      faseAtual: proximaFase,
      cicloAtual: sessao.cicloAtual,
      inicioFaseEm: agoraMs,
      fimFasePrevistoEm: agoraMs + duracaoNovaFaseMs,
      pausadaEm: null,
      tempoRestanteAoPausarMs: null,
      atualizadaEm: agoraMs,
    },
  };
}

/**
 * Zera a contagem de ciclos e retorna ao primeiro ciclo de foco mantendo o preset ativo (UC07, RN-04).
 */
export function reiniciarCiclos(
  sessao: SessaoAtiva,
  agoraMs: number
): SessaoAtiva {
  const duracaoFocoMs = obterDuracaoFaseMs(sessao.snapshotPreset, 'foco');

  return {
    ...sessao,
    faseAtual: 'foco',
    cicloAtual: 1,
    status: 'emAndamento',
    inicioFaseEm: agoraMs,
    fimFasePrevistoEm: agoraMs + duracaoFocoMs,
    pausadaEm: null,
    tempoRestanteAoPausarMs: null,
    atualizadaEm: agoraMs,
  };
}

/**
 * Recalcula o estado da sessão com base em timestamps absolutos (UC10, RN-06, RN-07, RN-08).
 */
export function recalcularSessaoPorTimestamp(
  sessao: SessaoAtiva,
  agoraMs: number
): RecalculoSessaoResultado {
  // RN-06: sessão pausada retorna pausada sem avanço automático
  if (sessao.status === 'pausada' || sessao.status === 'concluida') {
    return {
      sessao,
      fasesAvancadas: 0,
      concluiuAgora: false,
    };
  }

  if (agoraMs < sessao.fimFasePrevistoEm) {
    return {
      sessao,
      fasesAvancadas: 0,
      concluiuAgora: false,
    };
  }

  let faseCorrente = sessao.faseAtual;
  let cicloCorrente = sessao.cicloAtual;
  let cursorInicio = sessao.inicioFaseEm;
  let cursorFim = sessao.fimFasePrevistoEm;
  let fasesAvancadas = 0;

  while (agoraMs >= cursorFim) {
    fasesAvancadas += 1;
    const proxima = calcularProximaFaseNormal(
      faseCorrente,
      cicloCorrente,
      sessao.snapshotPreset.ciclosAntesPausaLonga
    );

    if (proxima.concluida) {
      return {
        sessao: {
          ...sessao,
          faseAtual: faseCorrente,
          cicloAtual: cicloCorrente,
          status: 'concluida',
          inicioFaseEm: cursorInicio,
          fimFasePrevistoEm: cursorFim,
          pausadaEm: null,
          tempoRestanteAoPausarMs: 0,
          atualizadaEm: agoraMs,
        },
        fasesAvancadas,
        concluiuAgora: true,
      };
    }

    faseCorrente = proxima.faseAtual;
    cicloCorrente = proxima.cicloAtual;
    cursorInicio = cursorFim;
    cursorFim =
      cursorInicio + obterDuracaoFaseMs(sessao.snapshotPreset, faseCorrente);
  }

  return {
    sessao: {
      ...sessao,
      faseAtual: faseCorrente,
      cicloAtual: cicloCorrente,
      status: 'emAndamento',
      inicioFaseEm: cursorInicio,
      fimFasePrevistoEm: cursorFim,
      pausadaEm: null,
      tempoRestanteAoPausarMs: null,
      atualizadaEm: agoraMs,
    },
    fasesAvancadas,
    concluiuAgora: false,
  };
}

/**
 * Calcula o tempo restante em milissegundos para exibição na interface.
 */
export function obterTempoRestanteMs(
  sessao: SessaoAtiva,
  agoraMs: number
): number {
  if (sessao.status === 'concluida') {
    return 0;
  }
  if (sessao.status === 'pausada') {
    return Math.max(0, sessao.tempoRestanteAoPausarMs ?? 0);
  }
  return Math.max(0, sessao.fimFasePrevistoEm - agoraMs);
}
