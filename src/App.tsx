import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConfirmModal } from './components/ConfirmModal';
import { PresetFormModal } from './components/PresetFormModal';
import { PresetManager } from './components/PresetManager';
import { ResumeSessionBanner } from './components/ResumeSessionBanner';
import { TaskFormModal } from './components/TaskFormModal';
import { TaskSidebar } from './components/TaskSidebar';
import { TimerPanel } from './components/TimerPanel';
import {
  criarSessaoAtiva,
  obterTempoRestanteMs,
  pausarSessao,
  pularFase,
  recalcularSessaoPorTimestamp,
  reiniciarCiclos,
  retomarSessao,
} from './domain/sessionEngine';
import { ordenarTarefas } from './domain/taskSorter';
import type {
  FaseSessao,
  PresetInput,
  SessaoAtiva,
  Tarefa,
  TarefaInput,
  TemporizadorPersonalizado,
} from './domain/types';
import { desbloquearAudio, emitirAlertaFimDeFase } from './services/audioService';
import {
  carregarPresets,
  carregarSessaoAtiva,
  carregarTarefas,
  salvarPresets,
  salvarSessaoAtiva,
  salvarTarefas,
} from './services/storage';

type ConfirmacaoPendente =
  | { tipo: 'excluirPreset'; preset: TemporizadorPersonalizado }
  | { tipo: 'excluirTarefa'; tarefa: Tarefa }
  | { tipo: 'reiniciarCiclos' }
  | { tipo: 'encerrarSessao' }
  | { tipo: 'descartarRetomada' }
  | { tipo: 'descartarCorrompida' }
  | null;

interface EstadoInicialApp {
  presets: TemporizadorPersonalizado[];
  tarefas: Tarefa[];
  sessaoAtiva: SessaoAtiva | null;
  presetSelecionadoId: string | null;
  sessaoRetomada: { ativa: boolean; fasesAvancadas: number };
  sessaoCorrompida: boolean;
  erroPersistencia: string | null;
}

const TITULO_FASE_DOCUMENTO: Record<FaseSessao, string> = {
  foco: 'Foco',
  pausaCurta: 'Pausa curta',
  pausaLonga: 'Pausa longa',
};

function gerarId(prefixo: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function inicializarEstadoApp(): EstadoInicialApp {
  const agora = Date.now();
  const resPresets = carregarPresets();
  const resTarefas = carregarTarefas();
  const resSessao = carregarSessaoAtiva();

  const erros = [resPresets.erro, resTarefas.erro, resSessao.erro].filter(
    (msg): msg is string => Boolean(msg)
  );

  let sessaoInicial: SessaoAtiva | null = null;
  let sessaoRetomada = { ativa: false, fasesAvancadas: 0 };

  if (resSessao.sessao) {
    // UC10, RN-06, RN-07, RN-08: Recalcula sessão ativa ao reabrir com base em timestamps
    const recalculo = recalcularSessaoPorTimestamp(resSessao.sessao, agora);
    sessaoInicial = recalculo.sessao;
    sessaoRetomada = {
      ativa: true,
      fasesAvancadas: recalculo.fasesAvancadas,
    };
    if (recalculo.fasesAvancadas > 0) {
      const resSave = salvarSessaoAtiva(recalculo.sessao);
      if (!resSave.sucesso && resSave.erro) {
        erros.push(resSave.erro);
      }
    }
  }

  const presetSelecionadoId = sessaoInicial
    ? sessaoInicial.presetId
    : resPresets.dados[0]?.id ?? null;

  return {
    presets: resPresets.dados,
    tarefas: resTarefas.dados,
    sessaoAtiva: sessaoInicial,
    presetSelecionadoId,
    sessaoRetomada,
    sessaoCorrompida: resSessao.corrompida,
    erroPersistencia: erros.length > 0 ? erros.join(' ') : null,
  };
}

function formatarRelogioTitulo(ms: number): string {
  const totalSeg = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(totalSeg / 60);
  const seg = totalSeg % 60;
  return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
}

export function App() {
  const [estadoInicial] = useState<EstadoInicialApp>(() =>
    inicializarEstadoApp()
  );

  const [presets, setPresets] = useState<TemporizadorPersonalizado[]>(
    estadoInicial.presets
  );
  const [tarefas, setTarefas] = useState<Tarefa[]>(estadoInicial.tarefas);
  const [sessaoAtiva, setSessaoAtiva] = useState<SessaoAtiva | null>(
    estadoInicial.sessaoAtiva
  );
  const [presetSelecionadoId, setPresetSelecionadoId] = useState<string | null>(
    estadoInicial.presetSelecionadoId
  );
  const [sessaoRetomada, setSessaoRetomada] = useState(
    estadoInicial.sessaoRetomada
  );
  const [sessaoCorrompida, setSessaoCorrompida] = useState(
    estadoInicial.sessaoCorrompida
  );
  const [erroPersistencia, setErroPersistencia] = useState<string | null>(
    estadoInicial.erroPersistencia
  );
  const [agoraMs, setAgoraMs] = useState<number>(() => Date.now());

  // Estados de modais
  const [modalPresetAberto, setModalPresetAberto] = useState(false);
  const [presetEmEdicao, setPresetEmEdicao] =
    useState<TemporizadorPersonalizado | null>(null);

  const [modalTarefaAberto, setModalTarefaAberto] = useState(false);
  const [tarefaEmEdicao, setTarefaEmEdicao] = useState<Tarefa | null>(null);

  const [confirmacao, setConfirmacao] = useState<ConfirmacaoPendente>(null);

  const presetSelecionado = useMemo(
    () => presets.find((p) => p.id === presetSelecionadoId) ?? null,
    [presets, presetSelecionadoId]
  );

  const tarefasOrdenadas = useMemo(() => ordenarTarefas(tarefas), [tarefas]);

  const verificarERecalcularSessao = useCallback(
    (sessaoAtual: SessaoAtiva) => {
      const agora = Date.now();
      setAgoraMs(agora);

      if (sessaoAtual.status !== 'emAndamento') return;

      const recalculo = recalcularSessaoPorTimestamp(sessaoAtual, agora);
      if (recalculo.fasesAvancadas > 0 || recalculo.concluiuAgora) {
        setSessaoAtiva(recalculo.sessao);
        const res = salvarSessaoAtiva(recalculo.sessao);
        if (!res.sucesso && res.erro) {
          setErroPersistencia(res.erro);
        }
        emitirAlertaFimDeFase();
      }
    },
    []
  );

  // Atualiza cronômetro em tempo real com base em timestamps absolutos (R-02, RNF-03)
  useEffect(() => {
    if (!sessaoAtiva || sessaoAtiva.status !== 'emAndamento') {
      return;
    }

    const intervalo = window.setInterval(() => {
      verificarERecalcularSessao(sessaoAtiva);
    }, 250);

    const aoMudarVisibilidade = () => {
      if (document.visibilityState === 'visible') {
        verificarERecalcularSessao(sessaoAtiva);
      }
    };

    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    window.addEventListener('focus', aoMudarVisibilidade);

    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
      window.removeEventListener('focus', aoMudarVisibilidade);
    };
  }, [sessaoAtiva, verificarERecalcularSessao]);

  // Atualiza título da aba com a contagem atual
  useEffect(() => {
    if (!sessaoAtiva) {
      document.title = 'Pomodoro — Gestão de Foco e Estudos';
      return;
    }
    if (sessaoAtiva.status === 'concluida') {
      document.title = 'Sessão concluída | Pomodoro';
      return;
    }
    const restante = obterTempoRestanteMs(sessaoAtiva, agoraMs);
    const prefixoPausa = sessaoAtiva.status === 'pausada' ? '[Pausado] ' : '';
    document.title = `${prefixoPausa}${formatarRelogioTitulo(restante)} — ${
      TITULO_FASE_DOCUMENTO[sessaoAtiva.faseAtual]
    } | Pomodoro`;
  }, [sessaoAtiva, agoraMs]);

  const persistirSessao = (novaSessao: SessaoAtiva | null) => {
    setSessaoAtiva(novaSessao);
    const res = salvarSessaoAtiva(novaSessao);
    if (!res.sucesso && res.erro) {
      setErroPersistencia(res.erro);
    }
  };

  // --- Controles de sessão ---
  const aoIniciarSessao = () => {
    if (!presetSelecionado) return;
    desbloquearAudio();
    const agora = Date.now();
    setAgoraMs(agora);
    const novaSessao = criarSessaoAtiva(
      presetSelecionado,
      agora,
      gerarId('sessao')
    );
    setSessaoRetomada({ ativa: false, fasesAvancadas: 0 });
    setSessaoCorrompida(false);
    persistirSessao(novaSessao);
  };

  const aoPausarSessao = () => {
    if (!sessaoAtiva) return;
    const agora = Date.now();
    setAgoraMs(agora);
    persistirSessao(pausarSessao(sessaoAtiva, agora));
  };

  const aoRetomarSessao = () => {
    if (!sessaoAtiva) return;
    desbloquearAudio();
    const agora = Date.now();
    setAgoraMs(agora);
    persistirSessao(retomarSessao(sessaoAtiva, agora));
  };

  const aoPularFase = () => {
    if (!sessaoAtiva) return;
    desbloquearAudio();
    const agora = Date.now();
    setAgoraMs(agora);
    const resultado = pularFase(sessaoAtiva, agora);
    if (resultado.concluida) {
      setSessaoRetomada({ ativa: false, fasesAvancadas: 0 });
      persistirSessao(null);
    } else {
      persistirSessao(resultado.sessao);
    }
  };

  const aoConfirmarReiniciarCiclos = () => {
    if (!sessaoAtiva) return;
    desbloquearAudio();
    const agora = Date.now();
    setAgoraMs(agora);
    persistirSessao(reiniciarCiclos(sessaoAtiva, agora));
    setConfirmacao(null);
  };

  const aoConfirmarEncerrarSessao = () => {
    setSessaoRetomada({ ativa: false, fasesAvancadas: 0 });
    persistirSessao(null);
    setConfirmacao(null);
  };

  // --- Gestão de Presets ---
  const aoSelecionarOuTrocarPreset = (preset: TemporizadorPersonalizado) => {
    if (!sessaoAtiva) {
      setPresetSelecionadoId(preset.id);
      return;
    }
    // RF-11, UC09, RN-02: Trocar preset encerra automaticamente a sessão ativa sem confirmação adicional
    desbloquearAudio();
    const agora = Date.now();
    setAgoraMs(agora);
    const novaSessao = criarSessaoAtiva(preset, agora, gerarId('sessao'));
    setPresetSelecionadoId(preset.id);
    setSessaoRetomada({ ativa: false, fasesAvancadas: 0 });
    setSessaoCorrompida(false);
    persistirSessao(novaSessao);
  };

  const aoSalvarPreset = (dados: PresetInput) => {
    const agora = Date.now();

    if (presetEmEdicao) {
      // RN-01: Bloqueio defensivo no domínio da UI caso o preset esteja em uso
      if (sessaoAtiva && sessaoAtiva.presetId === presetEmEdicao.id) {
        setModalPresetAberto(false);
        setPresetEmEdicao(null);
        return;
      }

      const atualizados = presets.map((item) =>
        item.id === presetEmEdicao.id
          ? {
              ...item,
              ...dados,
              atualizadoEm: agora,
            }
          : item
      );
      setPresets(atualizados);
      const res = salvarPresets(atualizados);
      if (!res.sucesso && res.erro) setErroPersistencia(res.erro);
    } else {
      const novoPreset: TemporizadorPersonalizado = {
        id: gerarId('preset'),
        ...dados,
        criadoEm: agora,
        atualizadoEm: agora,
      };
      const atualizados = [...presets, novoPreset];
      setPresets(atualizados);
      const res = salvarPresets(atualizados);
      if (!res.sucesso && res.erro) setErroPersistencia(res.erro);
      if (!presetSelecionadoId) {
        setPresetSelecionadoId(novoPreset.id);
      }
    }

    setModalPresetAberto(false);
    setPresetEmEdicao(null);
  };

  const aoConfirmarExcluirPreset = (preset: TemporizadorPersonalizado) => {
    if (sessaoAtiva && sessaoAtiva.presetId === preset.id) {
      setConfirmacao(null);
      return;
    }

    const restantes = presets.filter((p) => p.id !== preset.id);
    setPresets(restantes);
    const res = salvarPresets(restantes);
    if (!res.sucesso && res.erro) setErroPersistencia(res.erro);

    if (presetSelecionadoId === preset.id) {
      setPresetSelecionadoId(restantes[0]?.id ?? null);
    }
    setConfirmacao(null);
  };

  // --- Gestão de Tarefas (desacoplada do temporizador - RN-09) ---
  const aoSalvarTarefa = (dados: TarefaInput) => {
    const agora = Date.now();

    if (tarefaEmEdicao) {
      const atualizadas = tarefas.map((item) =>
        item.id === tarefaEmEdicao.id
          ? {
              ...item,
              ...dados,
              atualizadaEm: agora,
            }
          : item
      );
      setTarefas(atualizadas);
      const res = salvarTarefas(atualizadas);
      if (!res.sucesso && res.erro) setErroPersistencia(res.erro);
    } else {
      const novaTarefa: Tarefa = {
        id: gerarId('tarefa'),
        ...dados,
        criadaEm: agora,
        atualizadaEm: agora,
      };
      const atualizadas = [...tarefas, novaTarefa];
      setTarefas(atualizadas);
      const res = salvarTarefas(atualizadas);
      if (!res.sucesso && res.erro) setErroPersistencia(res.erro);
    }

    setModalTarefaAberto(false);
    setTarefaEmEdicao(null);
  };

  const aoConfirmarExcluirTarefa = (tarefa: Tarefa) => {
    const restantes = tarefas.filter((t) => t.id !== tarefa.id);
    setTarefas(restantes);
    const res = salvarTarefas(restantes);
    if (!res.sucesso && res.erro) setErroPersistencia(res.erro);
    setConfirmacao(null);
  };

  const executarConfirmacaoModal = () => {
    if (!confirmacao) return;
    switch (confirmacao.tipo) {
      case 'excluirPreset':
        aoConfirmarExcluirPreset(confirmacao.preset);
        break;
      case 'excluirTarefa':
        aoConfirmarExcluirTarefa(confirmacao.tarefa);
        break;
      case 'reiniciarCiclos':
        aoConfirmarReiniciarCiclos();
        break;
      case 'encerrarSessao':
        aoConfirmarEncerrarSessao();
        break;
      case 'descartarRetomada':
        aoConfirmarEncerrarSessao();
        break;
      case 'descartarCorrompida':
        persistirSessao(null);
        setSessaoCorrompida(false);
        setErroPersistencia(null);
        setConfirmacao(null);
        break;
    }
  };

  const obterPropsConfirmacao = () => {
    if (!confirmacao) {
      return {
        titulo: '',
        mensagem: '',
        textoConfirmar: 'Confirmar',
        variante: 'perigo' as const,
      };
    }

    switch (confirmacao.tipo) {
      case 'excluirPreset':
        return {
          titulo: 'Excluir temporizador personalizado',
          mensagem: `Tem certeza que deseja excluir o temporizador "${confirmacao.preset.nome}"? Esta ação não pode ser desfeita.`,
          textoConfirmar: 'Excluir temporizador',
          variante: 'perigo' as const,
        };
      case 'excluirTarefa':
        return {
          titulo: 'Excluir tarefa',
          mensagem: `Tem certeza que deseja excluir a tarefa "${confirmacao.tarefa.titulo}"? Esta ação não pode ser desfeita.`,
          textoConfirmar: 'Excluir tarefa',
          variante: 'perigo' as const,
        };
      case 'reiniciarCiclos':
        return {
          titulo: 'Reiniciar ciclos da sessão',
          mensagem:
            'Isso zerará a contagem de ciclos e retornará ao primeiro ciclo de foco usando o temporizador atual. Deseja continuar?',
          textoConfirmar: 'Reiniciar ciclos',
          variante: 'aviso' as const,
        };
      case 'encerrarSessao':
        return {
          titulo: 'Encerrar sessão ativa',
          mensagem:
            'A sessão atual será finalizada e removida da persistência local, liberando o temporizador para edição ou exclusão. Deseja encerrar?',
          textoConfirmar: 'Encerrar sessão',
          variante: 'perigo' as const,
        };
      case 'descartarRetomada':
        return {
          titulo: 'Descartar sessão retomada',
          mensagem:
            'A sessão retomada automaticamente será removida sem contabilizar progresso. Deseja descartar?',
          textoConfirmar: 'Descartar sessão',
          variante: 'perigo' as const,
        };
      case 'descartarCorrompida':
        return {
          titulo: 'Descartar sessão inconsistente',
          mensagem:
            'Os dados salvos da sessão anterior estavam corrompidos. Deseja removê-los do armazenamento local?',
          textoConfirmar: 'Descartar dados',
          variante: 'perigo' as const,
        };
    }
  };

  const propsConfirmacao = obterPropsConfirmacao();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <div>
            <h1 className="app-title">Pomodoro de Estudos</h1>
            <p className="app-subtitle">
              Gestão de ciclos de foco com retomada automática e painel de tarefas
            </p>
          </div>
          <div className="app-header__status" aria-live="polite">
            {sessaoAtiva ? (
              <span className="header-pill header-pill--active">
                Sessão {sessaoAtiva.status === 'pausada' ? 'pausada' : sessaoAtiva.status === 'concluida' ? 'concluída' : 'ativa'}
              </span>
            ) : (
              <span className="header-pill">Sem sessão ativa</span>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        {erroPersistencia && (
          <section className="banner banner--error" role="alert">
            <div className="banner__content">
              <strong className="banner__title">
                Atenção ao armazenamento local
              </strong>
              <p className="banner__text">{erroPersistencia}</p>
            </div>
            <div className="banner__actions">
              {sessaoCorrompida && (
                <button
                  type="button"
                  className="btn btn--danger btn--sm"
                  onClick={() => setConfirmacao({ tipo: 'descartarCorrompida' })}
                >
                  Descartar sessão corrompida
                </button>
              )}
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setErroPersistencia(null)}
              >
                Fechar aviso
              </button>
            </div>
          </section>
        )}

        {sessaoAtiva && sessaoRetomada.ativa && (
          <ResumeSessionBanner
            sessao={sessaoAtiva}
            fasesAvancadasNaRetomada={sessaoRetomada.fasesAvancadas}
            onDescartar={() => setConfirmacao({ tipo: 'descartarRetomada' })}
            onFecharAviso={() =>
              setSessaoRetomada((prev) => ({ ...prev, ativa: false }))
            }
          />
        )}

        <div className="workspace-grid">
          <div className="workspace-grid__primary">
            <TimerPanel
              sessaoAtiva={sessaoAtiva}
              presetSelecionado={presetSelecionado}
              agoraMs={agoraMs}
              onIniciarSessao={aoIniciarSessao}
              onPausarSessao={aoPausarSessao}
              onRetomarSessao={aoRetomarSessao}
              onPularFase={aoPularFase}
              onSolicitarReiniciarCiclos={() =>
                setConfirmacao({ tipo: 'reiniciarCiclos' })
              }
              onSolicitarEncerrarSessao={() =>
                setConfirmacao({ tipo: 'encerrarSessao' })
              }
            />

            <PresetManager
              presets={presets}
              presetSelecionadoId={presetSelecionadoId}
              sessaoAtiva={sessaoAtiva}
              onSelecionarOuTrocarPreset={aoSelecionarOuTrocarPreset}
              onAbrirCriarPreset={() => {
                setPresetEmEdicao(null);
                setModalPresetAberto(true);
              }}
              onAbrirEditarPreset={(preset) => {
                setPresetEmEdicao(preset);
                setModalPresetAberto(true);
              }}
              onSolicitarExcluirPreset={(preset) =>
                setConfirmacao({ tipo: 'excluirPreset', preset })
              }
            />
          </div>

          <div className="workspace-grid__sidebar">
            <TaskSidebar
              tarefasOrdenadas={tarefasOrdenadas}
              onAbrirCriarTarefa={() => {
                setTarefaEmEdicao(null);
                setModalTarefaAberto(true);
              }}
              onAbrirEditarTarefa={(tarefa) => {
                setTarefaEmEdicao(tarefa);
                setModalTarefaAberto(true);
              }}
              onSolicitarExcluirTarefa={(tarefa) =>
                setConfirmacao({ tipo: 'excluirTarefa', tarefa })
              }
            />
          </div>
        </div>
      </main>

      <PresetFormModal
        aberto={modalPresetAberto}
        presetInicial={presetEmEdicao}
        onSalvar={aoSalvarPreset}
        onCancelar={() => {
          setModalPresetAberto(false);
          setPresetEmEdicao(null);
        }}
      />

      <TaskFormModal
        aberto={modalTarefaAberto}
        tarefaInicial={tarefaEmEdicao}
        onSalvar={aoSalvarTarefa}
        onCancelar={() => {
          setModalTarefaAberto(false);
          setTarefaEmEdicao(null);
        }}
      />

      <ConfirmModal
        aberto={confirmacao !== null}
        titulo={propsConfirmacao.titulo}
        mensagem={propsConfirmacao.mensagem}
        textoConfirmar={propsConfirmacao.textoConfirmar}
        variante={propsConfirmacao.variante}
        onConfirmar={executarConfirmacaoModal}
        onCancelar={() => setConfirmacao(null)}
      />
    </div>
  );
}

export default App;
