import { useState } from 'react';
import type { SessaoAtiva, TemporizadorPersonalizado } from '../domain/types';

interface PresetManagerProps {
  presets: readonly TemporizadorPersonalizado[];
  presetSelecionadoId: string | null;
  sessaoAtiva: SessaoAtiva | null;
  onSelecionarOuTrocarPreset: (preset: TemporizadorPersonalizado) => void;
  onAbrirCriarPreset: () => void;
  onAbrirEditarPreset: (preset: TemporizadorPersonalizado) => void;
  onSolicitarExcluirPreset: (preset: TemporizadorPersonalizado) => void;
}

export function PresetManager({
  presets,
  presetSelecionadoId,
  sessaoAtiva,
  onSelecionarOuTrocarPreset,
  onAbrirCriarPreset,
  onAbrirEditarPreset,
  onSolicitarExcluirPreset,
}: PresetManagerProps) {
  const [avisoBloqueioId, setAvisoBloqueioId] = useState<string | null>(null);

  const tentarEditar = (
    preset: TemporizadorPersonalizado,
    emUsoNaSessao: boolean
  ) => {
    if (emUsoNaSessao) {
      setAvisoBloqueioId(preset.id);
      return;
    }
    setAvisoBloqueioId(null);
    onAbrirEditarPreset(preset);
  };

  const tentarExcluir = (
    preset: TemporizadorPersonalizado,
    emUsoNaSessao: boolean
  ) => {
    if (emUsoNaSessao) {
      setAvisoBloqueioId(preset.id);
      return;
    }
    setAvisoBloqueioId(null);
    onSolicitarExcluirPreset(preset);
  };

  return (
    <section
      className="card presets-card"
      aria-label="Temporizadores personalizados"
    >
      <div className="section-header">
        <div>
          <h2 className="section-title">Temporizadores personalizados</h2>
          <p className="section-subtitle">
            Crie, edite ou selecione seus ciclos de estudo.
          </p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={onAbrirCriarPreset}
        >
          + Novo temporizador
        </button>
      </div>

      {presets.length === 0 ? (
        <div className="empty-state">
          <p>Nenhum temporizador cadastrado no momento.</p>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={onAbrirCriarPreset}
          >
            Criar primeiro temporizador
          </button>
        </div>
      ) : (
        <ul className="preset-list">
          {presets.map((preset) => {
            const emUsoNaSessao = Boolean(
              sessaoAtiva && sessaoAtiva.presetId === preset.id
            );
            const selecionado = presetSelecionadoId === preset.id;

            return (
              <li
                key={preset.id}
                className={`preset-item ${
                  emUsoNaSessao
                    ? 'preset-item--active-session'
                    : selecionado
                    ? 'preset-item--selected'
                    : ''
                }`}
              >
                <div className="preset-item__info">
                  <div className="preset-item__title-row">
                    <h3 className="preset-item__name">{preset.nome}</h3>
                    {emUsoNaSessao && (
                      <span className="tag tag--running">Em execução</span>
                    )}
                    {!emUsoNaSessao && selecionado && (
                      <span className="tag tag--selected">Selecionado</span>
                    )}
                  </div>
                  <p className="preset-item__params">
                    Foco: <strong>{preset.tempoFocoMin} min</strong> • Pausa
                    curta: <strong>{preset.tempoPausaCurtaMin} min</strong> •
                    Ciclos: <strong>{preset.ciclosAntesPausaLonga}</strong> •
                    Pausa longa: <strong>{preset.tempoPausaLongaMin} min</strong>
                  </p>
                  {emUsoNaSessao && (
                    <p
                      className="preset-item__lock-note"
                      role={avisoBloqueioId === preset.id ? 'alert' : undefined}
                    >
                      Este preset está em uso na sessão ativa e não pode ser
                      editado nem excluído até que a sessão seja encerrada.
                    </p>
                  )}
                </div>

                <div className="preset-item__actions">
                  {!emUsoNaSessao && (
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => onSelecionarOuTrocarPreset(preset)}
                    >
                      {sessaoAtiva
                        ? 'Trocar para este preset'
                        : selecionado
                        ? 'Selecionado'
                        : 'Selecionar'}
                    </button>
                  )}
                  <button
                    type="button"
                    className={`btn btn--ghost btn--sm ${
                      emUsoNaSessao ? 'btn--locked' : ''
                    }`}
                    aria-disabled={emUsoNaSessao}
                    onClick={() => tentarEditar(preset, emUsoNaSessao)}
                    title={
                      emUsoNaSessao
                        ? 'Preset em uso pela sessão ativa não pode ser editado'
                        : `Editar ${preset.nome}`
                    }
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className={`btn btn--danger-ghost btn--sm ${
                      emUsoNaSessao ? 'btn--locked' : ''
                    }`}
                    aria-disabled={emUsoNaSessao}
                    onClick={() => tentarExcluir(preset, emUsoNaSessao)}
                    title={
                      emUsoNaSessao
                        ? 'Preset em uso pela sessão ativa não pode ser excluído'
                        : `Excluir ${preset.nome}`
                    }
                  >
                    Excluir
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
