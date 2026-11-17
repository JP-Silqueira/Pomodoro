import type { EstadoTarefa, PrioridadeTarefa, Tarefa } from './types';

const PESO_PRIORIDADE: Record<PrioridadeTarefa, number> = {
  alta: 1,
  media: 2,
  baixa: 3,
};

// Ordem fixa definida na regra de negócio RN-10:
// aFazer -> emExecucao -> concluida -> cancelada -> backlog
const PESO_ESTADO: Record<EstadoTarefa, number> = {
  aFazer: 1,
  emExecucao: 2,
  concluida: 3,
  cancelada: 4,
  backlog: 5,
};

/**
 * Ordena tarefas conforme RN-10: prioridade decrescente (alta, média, baixa),
 * seguida de estado (a fazer, em execução, concluída, cancelada, backlog),
 * com desempate determinístico por data de criação.
 */
export function ordenarTarefas(tarefas: readonly Tarefa[]): Tarefa[] {
  return [...tarefas].sort((a, b) => {
    const diffPrioridade =
      PESO_PRIORIDADE[a.prioridade] - PESO_PRIORIDADE[b.prioridade];
    if (diffPrioridade !== 0) {
      return diffPrioridade;
    }

    const diffEstado = PESO_ESTADO[a.estado] - PESO_ESTADO[b.estado];
    if (diffEstado !== 0) {
      return diffEstado;
    }

    return a.criadaEm - b.criadaEm;
  });
}
