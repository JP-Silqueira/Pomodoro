/**
 * Serviço de alerta sonoro via Web Audio API (RF-14, RN-13, RNF-10).
 * Mitiga políticas de autoplay dos navegadores (R-01) ativando o AudioContext
 * durante interações explícitas do usuário (ex.: botão Iniciar / Retomar).
 */

let contextoAudio: AudioContext | null = null;

function obterContextoAudio(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioCtx) return null;

  if (!contextoAudio || contextoAudio.state === 'closed') {
    contextoAudio = new AudioCtx();
  }

  return contextoAudio;
}

/**
 * Inicializa ou retoma o contexto de áudio a partir de uma interação do usuário (R-01).
 */
export function desbloquearAudio(): void {
  try {
    const ctx = obterContextoAudio();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume();
    }
  } catch {
    // Silencioso caso o navegador bloqueie antes da interação
  }
}

/**
 * Emite um alerta sonoro audível indicando o término de uma fase (RF-14, RN-13).
 */
export function emitirAlertaFimDeFase(): void {
  try {
    const ctx = obterContextoAudio();
    if (!ctx) return;

    const tocarSequencia = () => {
      const agora = ctx.currentTime;
      const notas = [587.33, 880, 1046.5]; // Ré5, Lá5, Dó6

      notas.forEach((frequencia, indice) => {
        const inicio = agora + indice * 0.16;
        const duracao = indice === notas.length - 1 ? 0.35 : 0.14;

        const oscilador = ctx.createOscillator();
        const ganho = ctx.createGain();

        oscilador.type = 'sine';
        oscilador.frequency.setValueAtTime(frequencia, inicio);

        ganho.gain.setValueAtTime(0.001, inicio);
        ganho.gain.exponentialRampToValueAtTime(0.22, inicio + 0.02);
        ganho.gain.exponentialRampToValueAtTime(0.001, inicio + duracao);

        oscilador.connect(ganho);
        ganho.connect(ctx.destination);

        oscilador.start(inicio);
        oscilador.stop(inicio + duracao + 0.02);
      });
    };

    if (ctx.state === 'suspended') {
      ctx
        .resume()
        .then(tocarSequencia)
        .catch(() => {
          // Política de autoplay impediu som sem gesto prévio
        });
    } else {
      tocarSequencia();
    }
  } catch {
    // Falha de áudio não deve interromper o fluxo do temporizador
  }
}
