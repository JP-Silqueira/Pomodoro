import type { FaseSessao, SessaoAtiva } from '../domain/types';

interface ResumeSessionBannerProps {
  sessao: SessaoAtiva;
  fasesAvancadasNaRetomada: number;
  onDescartar: () => void;
  onFecharAviso: () => void;
}

const ROTULO_FASE: Record<FaseSessao, string> = {
  foco: 'Foco',
  pausaCurta: 'Pausa curta',
  pausaLonga: 'Pausa longa',
};

export function ResumeSessionBanner({
  sessao,
  fasesAvancadasNaRetomada,
  onDescartar,
  onFecharAviso,
}: ResumeSessionBannerProps) {
  let detalheStatus = '';
  if (sessao.status === 'concluida') {
    detalheStatus =
      'Todas as fases previstas venceram enquanto o navegador estava fechado. A sessão foi marcada como concluída.';
  } else if (sessao.status === 'pausada') {
    detalheStatus = `Sessão restaurada no estado pausado (${ROTULO_FASE[sessao.faseAtual]}, ciclo ${sessao.cicloAtual} de ${sessao.snapshotPreset.ciclosAntesPausaLonga}).`;
  } else if (fasesAvancadasNaRetomada > 0) {
    detalheStatus = `O temporizador avançou ${fasesAvancadasNaRetomada} fase(s) durante o período fechado e está em ${ROTULO_FASE[sessao.faseAtual]} (ciclo ${sessao.cicloAtual} de ${sessao.snapshotPreset.ciclosAntesPausaLonga}).`;
  } else {
    detalheStatus = `Sessão restaurada automaticamente (${ROTULO_FASE[sessao.faseAtual]}, ciclo ${sessao.cicloAtual} de ${sessao.snapshotPreset.ciclosAntesPausaLonga}).`;
  }

  return (
    <section
      className="banner banner--info"
      aria-label="Aviso de sessão retomada automaticamente"
    >
      <div className="banner__content">
        <strong className="banner__title">
          Sessão retomada: {sessao.snapshotPreset.nome}
        </strong>
        <p className="banner__text">{detalheStatus}</p>
      </div>
      <div className="banner__actions">
        <button
          type="button"
          className="btn btn--danger btn--sm"
          onClick={onDescartar}
        >
          Descartar sessão retomada
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={onFecharAviso}
          aria-label="Ocultar aviso de sessão retomada"
        >
          Ocultar aviso
        </button>
      </div>
    </section>
  );
}
