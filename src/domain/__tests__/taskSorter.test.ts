import { describe, expect, it } from 'vitest';
import { ordenarTarefas } from '../taskSorter';
import type { EstadoTarefa, PrioridadeTarefa, Tarefa } from '../types';

function criarTarefaMock(
  id: string,
  prioridade: PrioridadeTarefa,
  estado: EstadoTarefa,
  criadaEm: number
): Tarefa {
  return {
    id,
    titulo: `Tarefa ${id}`,
    prioridade,
    estado,
    criadaEm,
    atualizadaEm: criadaEm,
  };
}

describe('ordenarTarefas (RN-10)', () => {
  it('ordena por prioridade decrescente (alta, media, baixa) e depois estado (aFazer, emExecucao, concluida, cancelada, backlog)', () => {
    const entrada: Tarefa[] = [
      criarTarefaMock('b-backlog', 'baixa', 'backlog', 1),
      criarTarefaMock('a-backlog', 'alta', 'backlog', 2),
      criarTarefaMock('m-exec', 'media', 'emExecucao', 3),
      criarTarefaMock('a-cancel', 'alta', 'cancelada', 4),
      criarTarefaMock('a-afazer', 'alta', 'aFazer', 5),
      criarTarefaMock('b-afazer', 'baixa', 'aFazer', 6),
      criarTarefaMock('a-conc', 'alta', 'concluida', 7),
      criarTarefaMock('a-exec', 'alta', 'emExecucao', 8),
      criarTarefaMock('m-afazer', 'media', 'aFazer', 9),
    ];

    const ordenada = ordenarTarefas(entrada);

    expect(ordenada.map((t) => t.id)).toEqual([
      'a-afazer',
      'a-exec',
      'a-conc',
      'a-cancel',
      'a-backlog',
      'm-afazer',
      'm-exec',
      'b-afazer',
      'b-backlog',
    ]);
  });

  it('não muta o array original e desempata por criadaEm', () => {
    const t1 = criarTarefaMock('1', 'alta', 'aFazer', 200);
    const t2 = criarTarefaMock('2', 'alta', 'aFazer', 100);
    const original = [t1, t2];

    const ordenada = ordenarTarefas(original);

    expect(ordenada.map((t) => t.id)).toEqual(['2', '1']);
    expect(original.map((t) => t.id)).toEqual(['1', '2']);
  });
});
