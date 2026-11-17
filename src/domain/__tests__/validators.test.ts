import { describe, expect, it } from 'vitest';
import { validarPresetInput, validarTarefaInput } from '../validators';

describe('validarPresetInput (VR-01 a VR-05)', () => {
  const presetValido = {
    nome: 'Pomodoro Clássico',
    tempoFocoMin: 25,
    tempoPausaCurtaMin: 5,
    ciclosAntesPausaLonga: 4,
    tempoPausaLongaMin: 15,
  };

  it('aceita valores nos limites mínimos e máximos válidos', () => {
    expect(validarPresetInput(presetValido).valido).toBe(true);

    expect(
      validarPresetInput({
        nome: 'A',
        tempoFocoMin: 1,
        tempoPausaCurtaMin: 1,
        ciclosAntesPausaLonga: 1,
        tempoPausaLongaMin: 1,
      }).valido
    ).toBe(true);

    expect(
      validarPresetInput({
        nome: '1234567890123456789012345678901234567890', // 40 caracteres
        tempoFocoMin: 120,
        tempoPausaCurtaMin: 60,
        ciclosAntesPausaLonga: 12,
        tempoPausaLongaMin: 60,
      }).valido
    ).toBe(true);
  });

  it('rejeita nome vazio ou maior que 40 caracteres (VR-01)', () => {
    const vazio = validarPresetInput({ ...presetValido, nome: '   ' });
    expect(vazio.valido).toBe(false);
    expect(vazio.erros.nome).toBeDefined();

    const longo = validarPresetInput({
      ...presetValido,
      nome: 'a'.repeat(41),
    });
    expect(longo.valido).toBe(false);
    expect(longo.erros.nome).toBeDefined();
  });

  it('rejeita tempo de foco fora de 1..120 ou não inteiro (VR-02)', () => {
    expect(
      validarPresetInput({ ...presetValido, tempoFocoMin: 0 }).erros
        .tempoFocoMin
    ).toBeDefined();
    expect(
      validarPresetInput({ ...presetValido, tempoFocoMin: 121 }).erros
        .tempoFocoMin
    ).toBeDefined();
    expect(
      validarPresetInput({ ...presetValido, tempoFocoMin: 25.5 }).erros
        .tempoFocoMin
    ).toBeDefined();
    expect(
      validarPresetInput({ ...presetValido, tempoFocoMin: Number.NaN }).erros
        .tempoFocoMin
    ).toBeDefined();
  });

  it('rejeita pausa curta fora de 1..60 ou não inteira (VR-03)', () => {
    expect(
      validarPresetInput({ ...presetValido, tempoPausaCurtaMin: 0 }).erros
        .tempoPausaCurtaMin
    ).toBeDefined();
    expect(
      validarPresetInput({ ...presetValido, tempoPausaCurtaMin: 61 }).erros
        .tempoPausaCurtaMin
    ).toBeDefined();
    expect(
      validarPresetInput({ ...presetValido, tempoPausaCurtaMin: 5.2 }).erros
        .tempoPausaCurtaMin
    ).toBeDefined();
  });

  it('rejeita quantidade de ciclos fora de 1..12 ou não inteira (VR-04)', () => {
    expect(
      validarPresetInput({ ...presetValido, ciclosAntesPausaLonga: 0 }).erros
        .ciclosAntesPausaLonga
    ).toBeDefined();
    expect(
      validarPresetInput({ ...presetValido, ciclosAntesPausaLonga: 13 }).erros
        .ciclosAntesPausaLonga
    ).toBeDefined();
    expect(
      validarPresetInput({ ...presetValido, ciclosAntesPausaLonga: 2.5 }).erros
        .ciclosAntesPausaLonga
    ).toBeDefined();
  });

  it('rejeita pausa longa fora de 1..60 ou não inteira (VR-05)', () => {
    expect(
      validarPresetInput({ ...presetValido, tempoPausaLongaMin: 0 }).erros
        .tempoPausaLongaMin
    ).toBeDefined();
    expect(
      validarPresetInput({ ...presetValido, tempoPausaLongaMin: 61 }).erros
        .tempoPausaLongaMin
    ).toBeDefined();
    expect(
      validarPresetInput({ ...presetValido, tempoPausaLongaMin: 10.1 }).erros
        .tempoPausaLongaMin
    ).toBeDefined();
  });
});

describe('validarTarefaInput (VR-06 a VR-08)', () => {
  const tarefaValida = {
    titulo: 'Estudar arquitetura de software',
    estado: 'backlog' as const,
    prioridade: 'media' as const,
  };

  it('aceita tarefa válida dentro dos limites', () => {
    expect(validarTarefaInput(tarefaValida).valido).toBe(true);
    expect(
      validarTarefaInput({
        ...tarefaValida,
        titulo: 'a'.repeat(100),
      }).valido
    ).toBe(true);
  });

  it('rejeita título vazio ou maior que 100 caracteres (VR-06)', () => {
    const vazio = validarTarefaInput({ ...tarefaValida, titulo: '   ' });
    expect(vazio.valido).toBe(false);
    expect(vazio.erros.titulo).toBeDefined();

    const longo = validarTarefaInput({
      ...tarefaValida,
      titulo: 'a'.repeat(101),
    });
    expect(longo.valido).toBe(false);
    expect(longo.erros.titulo).toBeDefined();
  });

  it('rejeita estado e prioridade inválidos (VR-07, VR-08)', () => {
    const invalida = validarTarefaInput({
      titulo: 'Teste',
      estado: 'invalido' as never,
      prioridade: 'urgente' as never,
    });
    expect(invalida.valido).toBe(false);
    expect(invalida.erros.estado).toBeDefined();
    expect(invalida.erros.prioridade).toBeDefined();
  });
});
