import { describe, expect, it } from 'vitest';
import {
  criarSessaoAtiva,
  obterTempoRestanteMs,
  pausarSessao,
  pularFase,
  recalcularSessaoPorTimestamp,
  reiniciarCiclos,
  retomarSessao,
} from '../sessionEngine';
import type { TemporizadorPersonalizado } from '../types';

const MIN = 60_000;

const presetBase: TemporizadorPersonalizado = {
  id: 'preset-1',
  nome: 'Ciclo Padrão',
  tempoFocoMin: 25,
  tempoPausaCurtaMin: 5,
  ciclosAntesPausaLonga: 3,
  tempoPausaLongaMin: 15,
  criadoEm: 1_000_000,
  atualizadoEm: 1_000_000,
};

describe('sessionEngine', () => {
  it('cria sessão com snapshot imutável no ciclo 1 de foco (UC04, RN-05)', () => {
    const inicio = 10_000_000;
    const sessao = criarSessaoAtiva(presetBase, inicio, 'sessao-1');

    expect(sessao.faseAtual).toBe('foco');
    expect(sessao.cicloAtual).toBe(1);
    expect(sessao.status).toBe('emAndamento');
    expect(sessao.inicioFaseEm).toBe(inicio);
    expect(sessao.fimFasePrevistoEm).toBe(inicio + 25 * MIN);
    expect(sessao.snapshotPreset).toEqual({
      nome: 'Ciclo Padrão',
      tempoFocoMin: 25,
      tempoPausaCurtaMin: 5,
      ciclosAntesPausaLonga: 3,
      tempoPausaLongaMin: 15,
    });

    // Mutação posterior no preset original não afeta o snapshot da sessão
    const presetMutavel = { ...presetBase, tempoFocoMin: 99 };
    expect(presetMutavel.tempoFocoMin).toBe(99);
    expect(sessao.snapshotPreset.tempoFocoMin).toBe(25);
  });

  it('pausa preservando tempo restante e retoma recalculando fim da fase (UC05, RN-06)', () => {
    const inicio = 10_000_000;
    const sessao = criarSessaoAtiva(presetBase, inicio, 'sessao-1');

    // Passaram-se 10 minutos -> restam 15 minutos
    const instantePausa = inicio + 10 * MIN;
    const pausada = pausarSessao(sessao, instantePausa);

    expect(pausada.status).toBe('pausada');
    expect(pausada.pausadaEm).toBe(instantePausa);
    expect(pausada.tempoRestanteAoPausarMs).toBe(15 * MIN);
    expect(obterTempoRestanteMs(pausada, instantePausa + 60 * MIN)).toBe(
      15 * MIN
    );

    // RN-06: Sessão pausada não avança ao reabrir depois de muito tempo
    const recalculoPausada = recalcularSessaoPorTimestamp(
      pausada,
      instantePausa + 120 * MIN
    );
    expect(recalculoPausada.sessao.status).toBe('pausada');
    expect(recalculoPausada.fasesAvancadas).toBe(0);

    // Retoma 1 hora depois e deve ter exatamente 15 minutos restantes
    const instanteRetomada = instantePausa + 60 * MIN;
    const retomada = retomarSessao(pausada, instanteRetomada);
    expect(retomada.status).toBe('emAndamento');
    expect(retomada.pausadaEm).toBeNull();
    expect(retomada.tempoRestanteAoPausarMs).toBeNull();
    expect(retomada.fimFasePrevistoEm).toBe(instanteRetomada + 15 * MIN);
  });

  it('pular fase de foco ou de pausa não incrementa a contagem de ciclos (UC06, RN-03)', () => {
    const inicio = 10_000_000;
    const s1 = criarSessaoAtiva(presetBase, inicio, 'sessao-1');

    // Pula foco do ciclo 1 -> vai para pausa curta, ciclo continua 1
    const r1 = pularFase(s1, inicio + 2 * MIN);
    expect(r1.concluida).toBe(false);
    expect(r1.sessao?.faseAtual).toBe('pausaCurta');
    expect(r1.sessao?.cicloAtual).toBe(1);

    // Pula pausa curta -> volta para foco, ciclo continua 1 (RN-03)
    const r2 = pularFase(r1.sessao!, inicio + 3 * MIN);
    expect(r2.concluida).toBe(false);
    expect(r2.sessao?.faseAtual).toBe('foco');
    expect(r2.sessao?.cicloAtual).toBe(1);

    // Pular na última fase (pausaLonga) encerra a sessão (UC06 1a)
    const naPausaLonga = {
      ...s1,
      faseAtual: 'pausaLonga' as const,
      cicloAtual: 3,
    };
    const r3 = pularFase(naPausaLonga, inicio + 5 * MIN);
    expect(r3.concluida).toBe(true);
    expect(r3.sessao).toBeNull();
  });

  it('reiniciar ciclos retorna ao ciclo 1 de foco mantendo o preset ativo (UC07, RN-04)', () => {
    const inicio = 10_000_000;
    const sessao = {
      ...criarSessaoAtiva(presetBase, inicio, 'sessao-1'),
      faseAtual: 'pausaCurta' as const,
      cicloAtual: 2,
      status: 'pausada' as const,
    };

    const momentoReinicio = inicio + 40 * MIN;
    const reiniciada = reiniciarCiclos(sessao, momentoReinicio);

    expect(reiniciada.faseAtual).toBe('foco');
    expect(reiniciada.cicloAtual).toBe(1);
    expect(reiniciada.status).toBe('emAndamento');
    expect(reiniciada.presetId).toBe('preset-1');
    expect(reiniciada.fimFasePrevistoEm).toBe(momentoReinicio + 25 * MIN);
  });

  it('recalcula múltiplas fases vencidas por timestamp durante período fechado (UC10, RN-07)', () => {
    // Ciclo 1: 25 foco + 5 pausaCurta = 30 min
    // Ciclo 2: 25 foco + 5 pausaCurta = 30 min (acumulado 60 min)
    // Ciclo 3: 25 foco (acumulado 85 min) + 15 pausaLonga (acumulado 100 min)
    const inicio = 10_000_000;
    const sessao = criarSessaoAtiva(presetBase, inicio, 'sessao-1');

    // Após 65 minutos (dentro do foco do ciclo 3, faltando 20 min)
    const resultado = recalcularSessaoPorTimestamp(sessao, inicio + 65 * MIN);
    expect(resultado.concluiuAgora).toBe(false);
    expect(resultado.fasesAvancadas).toBe(4); // foco1, pausa1, foco2, pausa2
    expect(resultado.sessao.status).toBe('emAndamento');
    expect(resultado.sessao.faseAtual).toBe('foco');
    expect(resultado.sessao.cicloAtual).toBe(3);
    expect(obterTempoRestanteMs(resultado.sessao, inicio + 65 * MIN)).toBe(
      20 * MIN
    );
  });

  it('marca sessão como concluída se todas as fases vencerem com navegador fechado (UC10 5a, RN-08)', () => {
    const inicio = 10_000_000;
    const sessao = criarSessaoAtiva(presetBase, inicio, 'sessao-1');

    // Duração total dos 3 ciclos = 25+5 + 25+5 + 25+15 = 100 min
    const resultado = recalcularSessaoPorTimestamp(sessao, inicio + 105 * MIN);
    expect(resultado.concluiuAgora).toBe(true);
    expect(resultado.sessao.status).toBe('concluida');
    expect(resultado.sessao.faseAtual).toBe('pausaLonga');
    expect(resultado.sessao.cicloAtual).toBe(3);
    expect(obterTempoRestanteMs(resultado.sessao, inicio + 105 * MIN)).toBe(0);
  });
});
