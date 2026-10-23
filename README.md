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
| IED | Gerente do IED | **Segura essa vibração!** Integrar motor e bomba, compressor e conjunto final em 90s. Três acertos de alinhamento e quatro segundos de rotação estável por máquina; passarelas e portões se estabilizam/liberam conforme o avanço. |
| PSPO | Leonardo | Correr da baia até a copa do 12º andar da Torre B do EDISEN, saltar mesas e desviar dos formulários. Derrota no terceiro impacto; vitória ao pegar café na máquina. |
| Pré-Op / P-83 | Equipe P-83 | **Proposta de roteiro.** Preparar três sistemas em 75s: prontidão CCM, verificação em campo, documentação e aprovação. Ordem incorreta custa 5s. |

As sequências são simplificações lúdicas, sem valor de procedimento de engenharia, inspeção ou operação. O marco final da Pré-Op usa a terminologia “TAP aprovada (FIC concluída)”. Os personagens são ilustrações genéricas e não retratos das pessoas citadas.

## Controles e modos

- `←` / `→`: mover; `Espaço`: pular; `↑` / `↓`: subir/descer escadas. WASD também funciona.
- Mouse: registrar trabalhadores, abrir pontos de corrosão/sistemas e aplicar tratamentos.
- No PSPO, `↓`/`S` abaixa e `E` ou um clique próximo à máquina pega o café. Mesas bloqueiam a passagem lateral e devem ser saltadas. Formulários têm origem IED, IEEI, SMS ou Pré-Op/P-83. Após um impacto há uma breve imunidade para evitar dano duplicado.
- No IED, clique em uma máquina próxima. `Espaço`/botão Alinhar registra a coincidência entre marcas; `← →` ajustam a rotação no segundo desafio. O painel também oferece botões de toque e pausa. Cada erro de alinhamento custa 3s; sair da faixa verde zera o período de estabilidade e desvios de rotação podem custar 2s, com intervalo entre penalidades.
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
- `dist/renderer.js`, `dist/office-renderer.js` e `dist/ied-renderer.js`: toda a arte original em Canvas 2D; sem bibliotecas, fontes ou imagens remotas.
- `tests/game.test.mjs`: testes de integração da engine e renderer com ambiente simulado.

Arte original com cores vivas, contornos e formas cartunescas inspirados na referência visual solicitada; nenhum recurso de Plants vs. Zombies foi copiado.

## Validação

Requer Node.js 20+ para os testes (não é necessário instalar pacotes):

```sh
npm test
npm run check
```

Os testes cobrem os limites de tempo, pontuação, sequência dos tratamentos, progressão, pausa, reinício, escala de cliques, saltos, escadas e limpeza de eventos. A fase PSPO adiciona verificações de impactos, invulnerabilidade, colisão com mesas, percurso até a copa e coleta do café. O IED acrescenta testes de alinhamento, sincronização, penalidades, bloqueio de passagens, pausa e percurso completo. A engine é exercitada com Canvas/DOM/RAF simulados. A interface é conferida no navegador de preview antes da publicação.

## Próximos roteiros

Confirmar a proposta da Pré-Op/P-83 e personalizar o personagem do IED quando seu nome for informado. A demonstração é executada localmente no navegador e não chama APIs de IA durante a partida.

## Referências do EDISEN

O PSPO se passa no **12º andar da Torre B**, conforme o roteiro do usuário. A composição das baias, mesas e copa é fictícia; não foram encontradas imagens públicas verificáveis desse andar. O edifício de referência é o **EDISEN (Centro Empresarial Senado)**, não o EDISE brutalista.

- [Edo Rocha Arquiteturas — Centro Empresarial Senado/Petrobras](https://edorocha.com.br/centro-empresarial-senado-petrobras/): fotografias do conjunto, fachadas de vidro azulado, montantes claros e volumes escalonados.
- [SCENO — portfólio](https://www.sceno.com.br/projeto): fotografia identificada como Petrobras/Senado, com recepção, sinalização e acabamentos claros. Referência de áreas comuns; não de baias do 12º andar.

As imagens serviram de referência visual. O jogo usa desenhos originais em Canvas, sem incorporar fotografias de terceiros. Leonardo é uma ilustração genérica vestindo camisa social, calça de sarja e sapatos sociais.

Conquistas já salvas na primeira versão são preservadas. A missão IED entra entre IEEI e PSPO; no modo Livre pode ser acessada imediatamente. Conquistas anteriores continuam acessíveis mesmo com a inclusão da nova fase.
