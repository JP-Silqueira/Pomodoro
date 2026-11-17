import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { PresetInput, TemporizadorPersonalizado } from '../domain/types';
import { validarPresetInput } from '../domain/validators';

interface PresetFormModalProps {
  aberto: boolean;
  presetInicial: TemporizadorPersonalizado | null;
  onSalvar: (dados: PresetInput) => void;
  onCancelar: () => void;
}

interface PresetFormStrings {
  nome: string;
  tempoFocoMin: string;
  tempoPausaCurtaMin: string;
  ciclosAntesPausaLonga: string;
  tempoPausaLongaMin: string;
}

function paraNumeroCampo(valor: string): number {
  const limpo = valor.trim();
  if (limpo === '') return Number.NaN;
  return Number(limpo);
}

export function PresetFormModal({
  aberto,
  presetInicial,
  onSalvar,
  onCancelar,
}: PresetFormModalProps) {
  const [campos, setCampos] = useState<PresetFormStrings>({
    nome: '',
    tempoFocoMin: '25',
    tempoPausaCurtaMin: '5',
    ciclosAntesPausaLonga: '4',
    tempoPausaLongaMin: '15',
  });
  const [erros, setErros] = useState<Partial<Record<keyof PresetInput, string>>>(
    {}
  );

  const inputNomeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!aberto) return;
    if (presetInicial) {
      setCampos({
        nome: presetInicial.nome,
        tempoFocoMin: String(presetInicial.tempoFocoMin),
        tempoPausaCurtaMin: String(presetInicial.tempoPausaCurtaMin),
        ciclosAntesPausaLonga: String(presetInicial.ciclosAntesPausaLonga),
        tempoPausaLongaMin: String(presetInicial.tempoPausaLongaMin),
      });
    } else {
      setCampos({
        nome: '',
        tempoFocoMin: '25',
        tempoPausaCurtaMin: '5',
        ciclosAntesPausaLonga: '4',
        tempoPausaLongaMin: '15',
      });
    }
    setErros({});
    setTimeout(() => inputNomeRef.current?.focus(), 0);
  }, [aberto, presetInicial]);

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

    const dadosConvertidos: PresetInput = {
      nome: campos.nome.trim(),
      tempoFocoMin: paraNumeroCampo(campos.tempoFocoMin),
      tempoPausaCurtaMin: paraNumeroCampo(campos.tempoPausaCurtaMin),
      ciclosAntesPausaLonga: paraNumeroCampo(campos.ciclosAntesPausaLonga),
      tempoPausaLongaMin: paraNumeroCampo(campos.tempoPausaLongaMin),
    };

    const resultado = validarPresetInput(dadosConvertidos);
    if (!resultado.valido) {
      setErros(resultado.erros);
      return;
    }

    onSalvar(dadosConvertidos);
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
        aria-labelledby="preset-form-title"
      >
        <h2 id="preset-form-title" className="modal-title">
          {presetInicial
            ? 'Editar temporizador personalizado'
            : 'Novo temporizador personalizado'}
        </h2>

        <form onSubmit={aoSubmeter} noValidate className="form">
          <div className="form-group">
            <label htmlFor="preset-nome" className="form-label">
              Nome do temporizador <span className="required">*</span>
            </label>
            <input
              ref={inputNomeRef}
              id="preset-nome"
              type="text"
              maxLength={45}
              className={`form-input ${erros.nome ? 'form-input--error' : ''}`}
              placeholder="Ex.: Revisão de Cálculo"
              value={campos.nome}
              onChange={(e) => {
                setCampos((prev) => ({ ...prev, nome: e.target.value }));
                setErros((prev) => ({ ...prev, nome: undefined }));
              }}
              aria-invalid={Boolean(erros.nome)}
              aria-describedby={erros.nome ? 'erro-preset-nome' : undefined}
            />
            {erros.nome && (
              <p id="erro-preset-nome" className="form-error" role="alert">
                {erros.nome}
              </p>
            )}
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="preset-foco" className="form-label">
                Tempo de foco (min) <span className="required">*</span>
              </label>
              <input
                id="preset-foco"
                type="number"
                min={1}
                max={120}
                step={1}
                className={`form-input ${
                  erros.tempoFocoMin ? 'form-input--error' : ''
                }`}
                value={campos.tempoFocoMin}
                onChange={(e) => {
                  setCampos((prev) => ({
                    ...prev,
                    tempoFocoMin: e.target.value,
                  }));
                  setErros((prev) => ({ ...prev, tempoFocoMin: undefined }));
                }}
                aria-invalid={Boolean(erros.tempoFocoMin)}
                aria-describedby={
                  erros.tempoFocoMin ? 'erro-preset-foco' : undefined
                }
              />
              <span className="form-hint">Entre 1 e 120 minutos</span>
              {erros.tempoFocoMin && (
                <p id="erro-preset-foco" className="form-error" role="alert">
                  {erros.tempoFocoMin}
                </p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="preset-pausa-curta" className="form-label">
                Pausa curta (min) <span className="required">*</span>
              </label>
              <input
                id="preset-pausa-curta"
                type="number"
                min={1}
                max={60}
                step={1}
                className={`form-input ${
                  erros.tempoPausaCurtaMin ? 'form-input--error' : ''
                }`}
                value={campos.tempoPausaCurtaMin}
                onChange={(e) => {
                  setCampos((prev) => ({
                    ...prev,
                    tempoPausaCurtaMin: e.target.value,
                  }));
                  setErros((prev) => ({
                    ...prev,
                    tempoPausaCurtaMin: undefined,
                  }));
                }}
                aria-invalid={Boolean(erros.tempoPausaCurtaMin)}
                aria-describedby={
                  erros.tempoPausaCurtaMin ? 'erro-preset-pausa-curta' : undefined
                }
              />
              <span className="form-hint">Entre 1 e 60 minutos</span>
              {erros.tempoPausaCurtaMin && (
                <p
                  id="erro-preset-pausa-curta"
                  className="form-error"
                  role="alert"
                >
                  {erros.tempoPausaCurtaMin}
                </p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="preset-ciclos" className="form-label">
                Ciclos antes da pausa longa <span className="required">*</span>
              </label>
              <input
                id="preset-ciclos"
                type="number"
                min={1}
                max={12}
                step={1}
                className={`form-input ${
                  erros.ciclosAntesPausaLonga ? 'form-input--error' : ''
                }`}
                value={campos.ciclosAntesPausaLonga}
                onChange={(e) => {
                  setCampos((prev) => ({
                    ...prev,
                    ciclosAntesPausaLonga: e.target.value,
                  }));
                  setErros((prev) => ({
                    ...prev,
                    ciclosAntesPausaLonga: undefined,
                  }));
                }}
                aria-invalid={Boolean(erros.ciclosAntesPausaLonga)}
                aria-describedby={
                  erros.ciclosAntesPausaLonga ? 'erro-preset-ciclos' : undefined
                }
              />
              <span className="form-hint">Entre 1 e 12 ciclos</span>
              {erros.ciclosAntesPausaLonga && (
                <p id="erro-preset-ciclos" className="form-error" role="alert">
                  {erros.ciclosAntesPausaLonga}
                </p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="preset-pausa-longa" className="form-label">
                Pausa longa (min) <span className="required">*</span>
              </label>
              <input
                id="preset-pausa-longa"
                type="number"
                min={1}
                max={60}
                step={1}
                className={`form-input ${
                  erros.tempoPausaLongaMin ? 'form-input--error' : ''
                }`}
                value={campos.tempoPausaLongaMin}
                onChange={(e) => {
                  setCampos((prev) => ({
                    ...prev,
                    tempoPausaLongaMin: e.target.value,
                  }));
                  setErros((prev) => ({
                    ...prev,
                    tempoPausaLongaMin: undefined,
                  }));
                }}
                aria-invalid={Boolean(erros.tempoPausaLongaMin)}
                aria-describedby={
                  erros.tempoPausaLongaMin
                    ? 'erro-preset-pausa-longa'
                    : undefined
                }
              />
              <span className="form-hint">Entre 1 e 60 minutos</span>
              {erros.tempoPausaLongaMin && (
                <p
                  id="erro-preset-pausa-longa"
                  className="form-error"
                  role="alert"
                >
                  {erros.tempoPausaLongaMin}
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
              {presetInicial ? 'Salvar alterações' : 'Criar temporizador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
