import { useEffect, useRef } from 'react';

interface ConfirmModalProps {
  aberto: boolean;
  titulo: string;
  mensagem: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  variante?: 'perigo' | 'aviso';
  onConfirmar: () => void;
  onCancelar: () => void;
}

export function ConfirmModal({
  aberto,
  titulo,
  mensagem,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  variante = 'perigo',
  onConfirmar,
  onCancelar,
}: ConfirmModalProps) {
  const botaoCancelarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    botaoCancelarRef.current?.focus();

    const aoPressionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        onCancelar();
      }
    };

    window.addEventListener('keydown', aoPressionarTecla);
    return () => window.removeEventListener('keydown', aoPressionarTecla);
  }, [aberto, onCancelar]);

  if (!aberto) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancelar();
      }}
    >
      <div
        className="modal-card modal-card--sm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
      >
        <h2 id="confirm-modal-title" className="modal-title">
          {titulo}
        </h2>
        <p id="confirm-modal-desc" className="modal-description">
          {mensagem}
        </p>
        <div className="modal-actions">
          <button
            ref={botaoCancelarRef}
            type="button"
            className="btn btn--secondary"
            onClick={onCancelar}
          >
            {textoCancelar}
          </button>
          <button
            type="button"
            className={
              variante === 'perigo' ? 'btn btn--danger' : 'btn btn--warning'
            }
            onClick={onConfirmar}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
