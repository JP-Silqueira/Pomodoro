# Aplicação Web de Gestão de Foco (Pomodoro)

Aplicação web *single-user* desenvolvida em **TypeScript** e **React** para gestão de ciclos de estudo (técnica Pomodoro) com persistência local via `localStorage`, retomada automática baseada em *timestamps* absolutos, alertas sonoros ao fim de cada fase e painel lateral de tarefas.

---

## Funcionalidades Implementadas

- **Temporizadores Personalizados (Presets)**:
  - Criação, edição, exclusão e listagem de presets com validação por campo (`nome`, `tempoFocoMin`, `tempoPausaCurtaMin`, `ciclosAntesPausaLonga`, `tempoPausaLongaMin`).
  - Bloqueio automático de edição e exclusão enquanto o preset estiver em uso por uma sessão ativa.
  - Troca de preset com encerramento automático da sessão anterior e início imediato da nova sessão.
- **Execução de Sessão de Foco**:
  - Fases de **Foco**, **Pausa Curta** e **Pausa Longa** com *snapshot* imutável dos parâmetros do preset no momento do início.
  - Controles completos: **Iniciar**, **Pausar**, **Retomar**, **Pular fase** (sem incrementar ciclos), **Reiniciar ciclos** (com confirmação) e **Encerrar sessão** (com confirmação).
  - Alerta sonoro ao fim de cada fase utilizando a Web Audio API.
- **Persistência e Retomada Automática**:
  - Persistência integral em `localStorage` nas chaves `"pomodoro.presets"`, `"pomodoro.tarefas"` e `"pomodoro.sessaoAtiva"`.
  - Recálculo automático de fases vencidas com base em *timestamps* absolutos ao reabrir o navegador ou retornar de abas inativas (mantendo sessões pausadas sem avanço).
  - Opção de descarte da sessão retomada mediante confirmação explícita, além de detecção e descarte seguro de dados corrompidos.
- **Painel Lateral de Tarefas**:
  - Desacoplado do temporizador, exibido à direita do temporizador em *desktop* e abaixo em telas menores.
  - Criação (padrão: estado `Backlog` e prioridade `Média`), edição e exclusão com confirmação obrigatória.
  - Ordenação fixa automática por prioridade decrescente (`Alta > Média > Baixa`) seguida de estado (`A fazer > Em execução > Concluída > Cancelada > Backlog`).

---

## Como Executar o Projeto

### Pré-requisitos
- **Node.js** (v18 ou superior) e **npm** instalados.

### 1. Instalar dependências
```bash
npm install
```

### 2. Executar em modo de desenvolvimento
```bash
npm run dev
```
Acesse a URL exibida no terminal (geralmente `http://localhost:5173`).

### 3. Executar os testes automatizados
```bash
npm test
```

### 4. Gerar build de produção
```bash
npm run build
```

---

## Decisões Técnicas Adotadas

1. **Arquitetura em Três Camadas (`domain`, `services`, `components`)**:
   - **`src/domain/`**: Contém exclusivamente tipos, regras de negócio puras (`sessionEngine.ts`), validações (`validators.ts`) e ordenação (`taskSorter.ts`), sem dependência de React ou APIs do navegador, facilitando testes unitários determinísticos.
   - **`src/services/`**: Isola os efeitos colaterais de persistência em `localStorage` (`storage.ts`) com validação estrutural contra corrupção e síntese de áudio (`audioService.ts`).
   - **`src/components/` e `src/App.tsx`**: Responsáveis pela apresentação responsiva em português, acessibilidade por teclado e gerenciamento de estado da interface.
2. **Precisão Temporal por Timestamps Absolutos**:
   - Em vez de acumular contadores em memória via `setInterval` (sujeitos a suspensão em abas inativas ou fechamento do navegador), cada fase armazena `inicioFaseEm` e `fimFasePrevistoEm`. Ao atualizar o relógio, voltar à aba (`visibilitychange`) ou reabrir o navegador, o motor recalcula as transições matematicamente a partir de `Date.now()`.
3. **Snapshot de Parâmetros na Sessão Ativa**:
   - No instante de criação da sessão, os valores do preset são copiados para `snapshotPreset`, garantindo integridade da sessão em andamento e rastreabilidade mesmo diante de operações futuras.
4. **Áudio sem Dependências Externas e Compatível com Políticas de Autoplay**:
   - O alerta sonoro de fim de fase é gerado dinamicamente via **Web Audio API**, com desbloqueio do `AudioContext` na interação explícita do usuário nos botões de iniciar/retomar.
5. **CSS Próprio Responsivo e Acessível**:
   - Uso de CSS puro com variáveis de tema, `grid` responsivo (painel de tarefas à direita em desktop `>= 1024px` e empilhado abaixo em telas menores), foco visível, `role="dialog"`/`role="alertdialog"` e suporte à tecla `Esc` nos modais.
