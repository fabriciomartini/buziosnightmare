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
| IED | Willian | **Segura essa vibração!** Integrar motor e bomba, compressor e conjunto final em 90s. Três acertos de alinhamento e quatro segundos de rotação estável por máquina; passarelas e portões se estabilizam/liberam conforme o avanço. |
| PSPO | Anderson | Correr da baia até a copa do 12º andar da Torre B do EDISEN, saltar mesas e desviar dos formulários. Percurso ampliado com dois forms especiais — Remarcação de retorno e Urgente — que aparecem uma vez cada por tentativa. Derrota no terceiro impacto; vitória ao pegar café na máquina. |
| Pré-Op / P-83 | Fabrício | **Só falta uma pendência!** Encontrar a placa do óleo, registrar três pontos do gás e conferir a documentação da água. Prancheta com dois espaços; uma revisão extra pelo rádio (+15s). Resolver os três sistemas e retornar ao terminal em 120s; entrega incorreta custa 5s. |

As sequências são simplificações lúdicas, sem valor de procedimento de engenharia, inspeção ou operação. O marco final da Pré-Op usa a terminologia “TAP aprovada (FIC concluída)”. Os personagens são ilustrações genéricas e não retratos das pessoas citadas. Willian, no IED, usa macacão laranja.

## Controles e modos

- `←` / `→`: mover; `Espaço`: pular; `↑` / `↓`: subir/descer escadas. WASD também funciona.
- Mouse: registrar trabalhadores, abrir pontos de corrosão/sistemas e aplicar tratamentos.
- No PSPO, `↓`/`S` abaixa e `E` ou um clique próximo à máquina pega o café. Mesas bloqueiam a passagem lateral e devem ser saltadas. Formulários têm origem IED, IEEI, SMS ou Pré-Op/P-83. Após um impacto há uma breve imunidade para evitar dano duplicado. **Remarcação de retorno** e **Urgente** têm entrada mais próxima, deslocamento mais rápido, aviso curto e sinais de perigo. Cada um aparece exatamente uma vez por tentativa, sem reaparecer ao voltar pelo corredor; reiniciar a fase permite novos encontros.
- No IED, clique em uma máquina próxima. `Espaço`/botão Alinhar registra a coincidência entre marcas; `← →` ajustam a rotação no segundo desafio. O painel também oferece botões de toque e pausa. Cada erro de alinhamento custa 3s; sair da faixa verde zera o período de estabilidade e desvios de rotação podem custar 2s, com intervalo entre penalidades.
- Na Pré-Op, `E` ou clique próximo abre o quadro, os sistemas e os arquivos, ou registra um ponto de campo. A prancheta leva dois itens; **Devolver** os disponibiliza na origem. Arraste uma evidência para a área de entrega ou selecione o cartão e clique em **Entregar**. Três sistemas prontos não encerram a fase: volte ao terminal inicial e feche as TAPs. A revisão surpresa é única e nunca reabre um sistema concluído.
- O som inicia com o gesto de entrar na fase. `♪` liga/desliga música e efeitos; o controle de volume ajusta ambos. Preferências ficam no navegador. Pausa, troca de fase e saída interrompem a reprodução sem sobrepor trilhas.
- `Esc`: pausa; dentro de um tratamento, fecha o painel. Botões de toque disponíveis em telas pequenas.
- **Campanha:** SMS → IEEI → IED → PSPO → Pré-Op/P-83; conquistas salvas em `localStorage` neste navegador.
- **Livre:** as cinco fases jogáveis ficam acessíveis em qualquer ordem. Vitórias no Livre não desbloqueiam a campanha.
- A perda de foco pausa a partida; o jogador retoma explicitamente. Durante os painéis de tratamento o tempo continua correndo.
- Falhas abrem uma tela de resultado com **Recomeçar fase**, que reinicia prazo, pontos e estado.
- Cada desvio SMS só pode ser registrado uma vez. Se as oportunidades restantes não permitem cinco acertos, a tentativa termina e oferece reinício.

## Arquitetura

- `dist/index.html`, `dist/style.css`: telas, menus, instruções e interface responsiva.
- `dist/app.js`: campanha, diálogo de tratamento, controles, áudio opcional e progresso local.
- `dist/engine.js`: movimento, câmera, interações, tempo e ciclo do jogo.
- `dist/rules.js`: regras determinísticas isoladas.
- `dist/renderer.js`, `dist/office-renderer.js`, `dist/ied-renderer.js` e `dist/preop-renderer.js`: toda a arte original em Canvas 2D; sem bibliotecas, fontes ou imagens remotas.
- `dist/preop-model.js`, `dist/preop-ui.js`: pendências, evidências, prancheta e painéis da Pré-Op.
- `dist/audio.js`: cinco composições originais em estilo chiptune, sintetizadas por Web Audio, e efeitos de interação. Não utiliza gravações ou melodias de Super Mario.
- `tests/game.test.mjs`, `tests/audio.test.mjs`: integração da engine e renderer, regras da Pré-Op e ciclo de reprodução com ambiente simulado.

Arte original com cores vivas, contornos e formas cartunescas inspirados na referência visual solicitada; nenhum recurso de Plants vs. Zombies foi copiado.

## Validação

Requer Node.js 20+ para os testes (não é necessário instalar pacotes):

```sh
npm test
npm run check
```

Os testes cobrem os limites de tempo, pontuação, sequência dos tratamentos, progressão, pausa, reinício, escala de cliques, saltos, escadas e limpeza de eventos. A fase PSPO adiciona verificações de impactos, invulnerabilidade, colisão com mesas, percurso até a copa, coleta do café e ocorrência única dos dois forms especiais com aviso e menor tempo de reação. O IED acrescenta testes de alinhamento, sincronização, penalidades, bloqueio de passagens, pausa e percurso completo. A engine é exercitada com Canvas/DOM/RAF simulados. A interface é conferida no navegador de preview antes da publicação.

## Execução

As cinco missões estão implementadas. A demonstração é executada localmente no navegador e não chama APIs de IA durante a partida.

## Referências do EDISEN

O PSPO se passa no **12º andar da Torre B**, conforme o roteiro do usuário. A composição das baias, mesas e copa é fictícia; não foram encontradas imagens públicas verificáveis desse andar. O edifício de referência é o **EDISEN (Centro Empresarial Senado)**, não o EDISE brutalista.

- [Edo Rocha Arquiteturas — Centro Empresarial Senado/Petrobras](https://edorocha.com.br/centro-empresarial-senado-petrobras/): fotografias do conjunto, fachadas de vidro azulado, montantes claros e volumes escalonados.
- [SCENO — portfólio](https://www.sceno.com.br/projeto): fotografia identificada como Petrobras/Senado, com recepção, sinalização e acabamentos claros. Referência de áreas comuns; não de baias do 12º andar.

As imagens serviram de referência visual. O jogo usa desenhos originais em Canvas, sem incorporar fotografias de terceiros. Anderson é uma ilustração genérica vestindo camisa social, calça de sarja e sapatos sociais.

Conquistas já salvas na primeira versão são preservadas. A missão IED entra entre IEEI e PSPO; no modo Livre pode ser acessada imediatamente. Conquistas anteriores continuam acessíveis mesmo com a inclusão da nova fase.
