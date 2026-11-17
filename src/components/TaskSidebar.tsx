import type { Tarefa } from '../domain/types';
import {
  ROTULOS_ESTADO_TAREFA,
  ROTULOS_PRIORIDADE_TAREFA,
} from './TaskFormModal';

interface TaskSidebarProps {
  tarefasOrdenadas: readonly Tarefa[];
  onAbrirCriarTarefa: () => void;
  onAbrirEditarTarefa: (tarefa: Tarefa) => void;
  onSolicitarExcluirTarefa: (tarefa: Tarefa) => void;
}

export function TaskSidebar({
  tarefasOrdenadas,
  onAbrirCriarTarefa,
  onAbrirEditarTarefa,
  onSolicitarExcluirTarefa,
}: TaskSidebarProps) {
  return (
    <aside className="card tasks-sidebar" aria-label="Painel de tarefas de estudo">
      <div className="section-header">
        <div>
          <h2 className="section-title">Tarefas de estudo</h2>
          <p className="section-subtitle">
            Ordenação automática por prioridade e estado.
          </p>
        </div>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={onAbrirCriarTarefa}
        >
          + Nova tarefa
        </button>
      </div>

      {tarefasOrdenadas.length === 0 ? (
        <div className="empty-state">
          <p>Nenhuma tarefa cadastrada ainda.</p>
          <p className="empty-state__hint">
            Registre o que precisa estudar sem interferir no temporizador.
          </p>
        </div>
      ) : (
        <ul className="task-list">
          {tarefasOrdenadas.map((tarefa) => (
            <li
              key={tarefa.id}
              className={`task-item task-item--estado-${tarefa.estado}`}
            >
              <div className="task-item__header">
                <span
                  className={`priority-badge priority-badge--${tarefa.prioridade}`}
                >
                  Prioridade: {ROTULOS_PRIORIDADE_TAREFA[tarefa.prioridade]}
                </span>
                <span className={`state-badge state-badge--${tarefa.estado}`}>
                  {ROTULOS_ESTADO_TAREFA[tarefa.estado]}
                </span>
              </div>

              <p className="task-item__title">{tarefa.titulo}</p>

              <div className="task-item__actions">
                <button
                  type="button"
                  className="btn btn--ghost btn--xs"
                  onClick={() => onAbrirEditarTarefa(tarefa)}
                  aria-label={`Editar tarefa ${tarefa.titulo}`}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="btn btn--danger-ghost btn--xs"
                  onClick={() => onSolicitarExcluirTarefa(tarefa)}
                  aria-label={`Excluir tarefa ${tarefa.titulo}`}
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
