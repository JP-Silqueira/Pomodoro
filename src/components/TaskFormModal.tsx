import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type {
  EstadoTarefa,
  PrioridadeTarefa,
  Tarefa,
  TarefaInput,
} from '../domain/types';
import { validarTarefaInput } from '../domain/validators';

interface TaskFormModalProps {
  aberto: boolean;
  tarefaInicial: Tarefa | null;
  onSalvar: (dados: TarefaInput) => void;
  onCancelar: () => void;
}

export const ROTULOS_ESTADO_TAREFA: Record<EstadoTarefa, string> = {
  backlog: 'Backlog',
  aFazer: 'A fazer',
  emExecucao: 'Em execução',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export const ROTULOS_PRIORIDADE_TAREFA: Record<PrioridadeTarefa, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

export function TaskFormModal({
  aberto,
  tarefaInicial,
  onSalvar,
  onCancelar,
}: TaskFormModalProps) {
  const [titulo, setTitulo] = useState('');
  const [estado, setEstado] = useState<EstadoTarefa>('backlog');
  const [prioridade, setPrioridade] = useState<PrioridadeTarefa>('media');
  const [erros, setErros] = useState<Partial<Record<keyof TarefaInput, string>>>(
    {}
  );

  const inputTituloRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!aberto) return;

    if (tarefaInicial) {
      setTitulo(tarefaInicial.titulo);
      setEstado(tarefaInicial.estado);
      setPrioridade(tarefaInicial.prioridade);
    } else {
      // RN-12: Toda tarefa criada assume estado backlog e prioridade média por padrão
      setTitulo('');
      setEstado('backlog');
      setPrioridade('media');
    }
    setErros({});
    setTimeout(() => inputTituloRef.current?.focus(), 0);
  }, [aberto, tarefaInicial]);

  useEffect(() => {
    if (!aberto) return;
    const aoPressionarTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancelar();
    };
    window.addEventListener('keydown', aoPressionarTecla);
    return () => window.removeEventListener('keydown', aoPressionarTecla);
  }, [aberto, onCancelar]);

  if (!aberto) return null;

  const aoSubmeter = (evento: FormEvent) => {
    evento.preventDefault();

    const dados: TarefaInput = {
      titulo: titulo.trim(),
      estado,
      prioridade,
    };

    const validacao = validarTarefaInput(dados);
    if (!validacao.valido) {
      setErros(validacao.erros);
      return;
    }

    onSalvar(dados);
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancelar();
      }}
    >
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-form-title"
      >
        <h2 id="task-form-title" className="modal-title">
          {tarefaInicial ? 'Editar tarefa' : 'Nova tarefa'}
        </h2>

        <form onSubmit={aoSubmeter} noValidate className="form">
          <div className="form-group">
            <label htmlFor="tarefa-titulo" className="form-label">
              Título da tarefa <span className="required">*</span>
            </label>
            <input
              ref={inputTituloRef}
              id="tarefa-titulo"
              type="text"
              maxLength={110}
              className={`form-input ${erros.titulo ? 'form-input--error' : ''}`}
              placeholder="Ex.: Resolver lista de exercícios de Redes"
              value={titulo}
              onChange={(e) => {
                setTitulo(e.target.value);
                setErros((prev) => ({ ...prev, titulo: undefined }));
              }}
              aria-invalid={Boolean(erros.titulo)}
              aria-describedby={erros.titulo ? 'erro-tarefa-titulo' : undefined}
            />
            <span className="form-hint">Entre 1 e 100 caracteres</span>
            {erros.titulo && (
              <p id="erro-tarefa-titulo" className="form-error" role="alert">
                {erros.titulo}
              </p>
            )}
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="tarefa-estado" className="form-label">
                Estado
              </label>
              <select
                id="tarefa-estado"
                className={`form-input ${
                  erros.estado ? 'form-input--error' : ''
                }`}
                value={estado}
                onChange={(e) => {
                  setEstado(e.target.value as EstadoTarefa);
                  setErros((prev) => ({ ...prev, estado: undefined }));
                }}
              >
                <option value="backlog">Backlog</option>
                <option value="aFazer">A fazer</option>
                <option value="emExecucao">Em execução</option>
                <option value="concluida">Concluída</option>
                <option value="cancelada">Cancelada</option>
              </select>
              {erros.estado && (
                <p className="form-error" role="alert">
                  {erros.estado}
                </p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="tarefa-prioridade" className="form-label">
                Prioridade
              </label>
              <select
                id="tarefa-prioridade"
                className={`form-input ${
                  erros.prioridade ? 'form-input--error' : ''
                }`}
                value={prioridade}
                onChange={(e) => {
                  setPrioridade(e.target.value as PrioridadeTarefa);
                  setErros((prev) => ({ ...prev, prioridade: undefined }));
                }}
              >
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
              {erros.prioridade && (
                <p className="form-error" role="alert">
                  {erros.prioridade}
                </p>
              )}
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onCancelar}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary">
              {tarefaInicial ? 'Salvar alterações' : 'Criar tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
