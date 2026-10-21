# Búzios Nightmare — Missão IPO

Jogo de plataforma no navegador sobre os desafios cotidianos da IPO/Búzios, ambientado em uma versão cartunesca da P-83. Construído como demonstração de vibe coding a partir de instruções de contexto, conteúdo e regras.

## Jogar

Versão hospedada: https://buzios-nightmare.blushtetra23.chatgpt.site (acesso privado do proprietário).

Sem dependências, cadastro ou servidor de aplicação. Para executar localmente:

```sh
python3 -m http.server 8080 --directory dist
```

Abra `http://localhost:8080`. Sirva os arquivos por HTTP: abrir o HTML diretamente com `file://` pode bloquear os módulos JavaScript.

## Fases

| Gerência | Personagem | Dinâmica |
|---|---|---|
| SMS | Jaqueline | Registrar cinco desvios reais de EPI; trabalhadores corrigem o desvio dois segundos após aparecerem. Acerto +1; falso registro −1; placar negativo encerra a tentativa. |
| IEEI | José Roberto | Recuperar três pontos em menos de 60s: jato d’água, escova, neutralizador, pintura. Cada etapa exige segurar e arrastar o mouse sobre a corrosão. |
| Pré-Op / P-83 | Equipe P-83 | **Proposta de terceira fase**, pois o briefing detalha somente SMS e IEEI. Preparar três sistemas em 75s: prontidão CCM, verificação em campo, documentação e aprovação. Ordem incorreta custa 5s. |
| IED | A definir | Próximo capítulo. |
| PSPO | A definir | Próximo capítulo. |

As sequências são simplificações lúdicas, sem valor de procedimento de engenharia, inspeção ou operação. O marco final da Pré-Op usa a terminologia “TAP aprovada (FIC concluída)”. Os personagens são ilustrações genéricas e não retratos das pessoas citadas.

## Controles e modos

- `←` / `→`: mover; `Espaço`: pular; `↑` / `↓`: subir/descer escadas. WASD também funciona.
- Mouse: registrar trabalhadores, abrir pontos de corrosão/sistemas e aplicar tratamentos.
- `Esc`: pausa; dentro de um tratamento, fecha o painel. Botões de toque disponíveis em telas pequenas.
- **Campanha:** SMS → IEEI → Pré-Op/P-83; conquistas salvas em `localStorage` neste navegador.
- **Livre:** as três fases jogáveis ficam acessíveis em qualquer ordem. Vitórias no Livre não desbloqueiam a campanha.
- A perda de foco pausa a partida; o jogador retoma explicitamente. Durante os painéis de tratamento o tempo continua correndo.
- Falhas abrem uma tela de resultado com **Recomeçar fase**, que reinicia prazo, pontos e estado.
- Cada desvio SMS só pode ser registrado uma vez. Se as oportunidades restantes não permitem cinco acertos, a tentativa termina e oferece reinício.

## Arquitetura

- `dist/index.html`, `dist/style.css`: telas, menus, instruções e interface responsiva.
- `dist/app.js`: campanha, diálogo de tratamento, controles, áudio opcional e progresso local.
- `dist/engine.js`: movimento, câmera, interações, tempo e ciclo do jogo.
- `dist/rules.js`: regras determinísticas isoladas.
- `dist/renderer.js`: toda a arte original em Canvas 2D; sem bibliotecas, fontes ou imagens remotas.
- `tests/game.test.mjs`: testes de integração da engine e renderer com ambiente simulado.

Arte original com cores vivas, contornos e formas cartunescas inspirados na referência visual solicitada; nenhum recurso de Plants vs. Zombies foi copiado.

## Validação

Requer Node.js 20+ para os testes (não é necessário instalar pacotes):

```sh
npm test
npm run check
```

18 testes cobrem os limites de tempo, pontuação, sequência dos tratamentos, progressão, pausa, reinício, escala de cliques, saltos, escadas e limpeza de eventos. A validação usa Canvas/DOM/RAF simulados; não substitui a conferência visual e a experiência com um navegador real.

## Próximos roteiros

Confirmar a proposta da Pré-Op/P-83 e definir as histórias e regras de IED e PSPO. A demonstração é executada localmente no navegador e não chama APIs de IA durante a partida.
