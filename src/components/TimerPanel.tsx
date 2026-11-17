import { obterDuracaoFaseMs, obterTempoRestanteMs } from '../domain/sessionEngine';
import type {
  FaseSessao,
  SessaoAtiva,
  TemporizadorPersonalizado,
} from '../domain/types';

interface TimerPanelProps {
  sessaoAtiva: SessaoAtiva | null;
  presetSelecionado: TemporizadorPersonalizado | null;
  agoraMs: number;
  onIniciarSessao: () => void;
  onPausarSessao: () => void;
  onRetomarSessao: () => void;
  onPularFase: () => void;
  onSolicitarReiniciarCiclos: () => void;
  onSolicitarEncerrarSessao: () => void;
}

const ROTULO_FASE: Record<FaseSessao, string> = {
  foco: 'Foco',
  pausaCurta: 'Pausa Curta',
  pausaLonga: 'Pausa Longa',
};

const CLASSE_FASE: Record<FaseSessao, string> = {
  foco: 'phase-badge--foco',
  pausaCurta: 'phase-badge--pausa-curta',
  pausaLonga: 'phase-badge--pausa-longa',
};

function formatarTempoMMSS(ms: number): string {
  const totalSegundos = Math.max(0, Math.ceil(ms / 1000));
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
}

export function TimerPanel({
  sessaoAtiva,
  presetSelecionado,
  agoraMs,
  onIniciarSessao,
  onPausarSessao,
  onRetomarSessao,
  onPularFase,
  onSolicitarReiniciarCiclos,
  onSolicitarEncerrarSessao,
}: TimerPanelProps) {
  if (!sessaoAtiva) {
    const tempoInicialMs = presetSelecionado
      ? presetSelecionado.tempoFocoMin * 60_000
      : 0;

    return (
      <section className="card timer-card" aria-label="Temporizador de foco">
        <div className="timer-card__header">
          <span className="phase-badge phase-badge--foco">Foco</span>
          <span className="cycle-indicator">
            {presetSelecionado
              ? `Ciclo 1 de ${presetSelecionado.ciclosAntesPausaLonga}`
              : 'Nenhum temporizador selecionado'}
          </span>
        </div>

        <div className="timer-display" aria-live="polite">
          <time className="timer-display__clock">
            {presetSelecionado ? formatarTempoMMSS(tempoInicialMs) : '00:00'}
          </time>
          <p className="timer-display__status">
            {presetSelecionado
              ? `Pronto para iniciar • ${presetSelecionado.nome}`
              : 'Crie um temporizador personalizado abaixo para começar.'}
          </p>
        </div>

        <div className="progress-track" aria-hidden="true">
          <div className="progress-track__fill" style={{ width: '0%' }} />
        </div>

        {presetSelecionado && (
          <p className="timer-snapshot-info">
            Foco: {presetSelecionado.tempoFocoMin} min • Pausa curta:{' '}
            {presetSelecionado.tempoPausaCurtaMin} min • Pausa longa:{' '}
            {presetSelecionado.tempoPausaLongaMin} min a cada{' '}
            {presetSelecionado.ciclosAntesPausaLonga} ciclo(s)
          </p>
        )}

        <div className="timer-controls">
          <button
            type="button"
            className="btn btn--primary btn--lg"
            onClick={onIniciarSessao}
            disabled={!presetSelecionado}
          >
            Iniciar sessão
          </button>
        </div>
      </section>
    );
  }

  const restanteMs = obterTempoRestanteMs(sessaoAtiva, agoraMs);
  const duracaoTotalFaseMs = obterDuracaoFaseMs(
    sessaoAtiva.snapshotPreset,
    sessaoAtiva.faseAtual
  );
  const progressoPercentual =
    sessaoAtiva.status === 'concluida'
      ? 100
      : duracaoTotalFaseMs > 0
      ? Math.min(
          100,
          Math.max(
            0,
            ((duracaoTotalFaseMs - restanteMs) / duracaoTotalFaseMs) * 100
          )
        )
      : 0;

  const rotuloStatus =
    sessaoAtiva.status === 'emAndamento'
      ? 'Em andamento'
      : sessaoAtiva.status === 'pausada'
      ? 'Pausada'
      : 'Sessão concluída';

  return (
    <section
      className={`card timer-card timer-card--${sessaoAtiva.faseAtual}`}
      aria-label="Temporizador de foco em execução"
    >
      <div className="timer-card__header">
        <span
          className={`phase-badge ${CLASSE_FASE[sessaoAtiva.faseAtual]}`}
        >
          {ROTULO_FASE[sessaoAtiva.faseAtual]}
        </span>
        <span className="cycle-indicator">
          Ciclo {sessaoAtiva.cicloAtual} de{' '}
          {sessaoAtiva.snapshotPreset.ciclosAntesPausaLonga}
        </span>
      </div>

      <div className="timer-display" aria-live="off">
        <time className="timer-display__clock">
          {formatarTempoMMSS(restanteMs)}
        </time>
        <p className="timer-display__status">
          <span
            className={`status-dot status-dot--${sessaoAtiva.status}`}
            aria-hidden="true"
          />
          {rotuloStatus} • {sessaoAtiva.snapshotPreset.nome}
        </p>
      </div>

      <div
        className="progress-track"
        role="progressbar"
        aria-label="Progresso da fase atual"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progressoPercentual)}
      >
        <div
          className="progress-track__fill"
          style={{ width: `${progressoPercentual}%` }}
        />
      </div>

      <p className="timer-snapshot-info" title="Parâmetros fixados no início da sessão">
        Parâmetros da sessão: Foco {sessaoAtiva.snapshotPreset.tempoFocoMin} min •
        Pausa curta {sessaoAtiva.snapshotPreset.tempoPausaCurtaMin} min • Pausa
        longa {sessaoAtiva.snapshotPreset.tempoPausaLongaMin} min
      </p>

      {sessaoAtiva.status === 'concluida' ? (
        <div className="timer-completed-box">
          <p className="timer-completed-box__text">
            Parabéns! Todos os ciclos previstos desta sessão foram concluídos.
          </p>
          <div className="timer-controls">
            <button
              type="button"
              className="btn btn--primary"
              onClick={onSolicitarReiniciarCiclos}
            >
              Reiniciar ciclos
            </button>
            <button
              type="button"
              className="btn btn--danger"
              onClick={onSolicitarEncerrarSessao}
            >
              Encerrar sessão
            </button>
          </div>
        </div>
      ) : (
        <div className="timer-controls">
          {sessaoAtiva.status === 'emAndamento' ? (
            <button
              type="button"
              className="btn btn--primary btn--lg"
              onClick={onPausarSessao}
            >
              Pausar
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primary btn--lg"
              onClick={onRetomarSessao}
            >
              Retomar
            </button>
          )}

          <button
            type="button"
            className="btn btn--secondary"
            onClick={onPularFase}
          >
            Pular fase
          </button>

          <button
            type="button"
            className="btn btn--secondary"
            onClick={onSolicitarReiniciarCiclos}
          >
            Reiniciar ciclos
          </button>

          <button
            type="button"
            className="btn btn--danger-outline"
            onClick={onSolicitarEncerrarSessao}
          >
            Encerrar sessão
          </button>
        </div>
      )}
    </section>
  );
}
