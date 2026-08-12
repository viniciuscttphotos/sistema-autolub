# Plano de melhorias — Autolub Livro Caixa

## Regras de execução

- Implementar as sete etapas abaixo em ordem.
- Executar os testes indicados após cada etapa.
- Não modificar o Google Apps Script existente.
- Não criar commit nem fazer push antes da validação local completa pelo proprietário.
- Manter o projeto executável localmente e na Vercel.

## Divisão por agentes

### Agente principal — integração e lógica do front-end

- Coordenar as sete etapas.
- Refatorar a lógica do navegador.
- Integrar os trabalhos dos demais agentes.
- Executar testes incrementais e a validação final.

### Agente Interface — HTML e acessibilidade

- Remover eventos inline do HTML.
- Corrigir semântica, labels, abas, modal, mensagens e metadados.
- Trabalhar principalmente em `index.html`.

### Agente Segurança — autenticação e proxy

- Criar uma camada server-side na Vercel sem alterar o Apps Script.
- Implementar sessão segura em cookie HttpOnly.
- Manter senhas e URL interna fora do JavaScript entregue ao navegador.
- Trabalhar principalmente em `api/` e módulos auxiliares server-side.

### Agente Qualidade — testes e configuração

- Criar testes automatizados para funções puras, endpoints e estrutura do projeto.
- Preparar comandos locais de validação.
- Revisar `vercel.json` e headers de segurança na etapa 7.

## 1. Sanitização e eventos

### Mudanças

- Remover handlers `onclick` e `onchange` do HTML e de strings geradas.
- Registrar eventos com `addEventListener`.
- Substituir HTML dinâmico inseguro por criação explícita de elementos e `textContent`.
- Garantir que mensagens retornadas pela API nunca sejam interpretadas como HTML.

### Testes após a implementação

- Verificação de sintaxe de todos os arquivos JavaScript.
- Busca automatizada por handlers inline.
- Testes com textos contendo tags HTML, aspas, barras e quebras de linha.
- Teste de exclusão de locador com caracteres especiais.

## 2. Fila, datas e validações

### Mudanças

- Remover itens da fila por identificador estável, não por posição.
- Implementar formatação de datas sem deslocamento de fuso horário.
- Validar intervalos de data.
- Validar valores, parcelas, textos obrigatórios e seleção de locador.
- Normalizar valores numéricos recebidos da API.

### Testes após a implementação

- Testes de fila com alterações durante o atraso de remoção.
- Testes de datas no fuso de Brasília e datas no formato `YYYY-MM-DD`.
- Testes de data inicial posterior à final.
- Testes de valor zero, negativo, inválido e válido.
- Testes de parcelas e locador obrigatório.

## 3. Timeout, erros e concorrência

### Mudanças

- Diferenciar timeout de falha confirmada.
- Evitar nova gravação cega após resultado indeterminado.
- Cancelar ou ignorar respostas antigas de histórico, locadores e relatórios.
- Padronizar estados de carregamento, sucesso e erro.
- Desabilitar botões enquanto mutações estiverem em andamento.

### Testes após a implementação

- Simulação de timeout durante gravação.
- Simulação de erro HTTP, JSON inválido e falha de rede.
- Teste de duas filtragens rápidas com respostas fora de ordem.
- Teste de clique duplo em salvar, editar, excluir e adicionar locador.

## 4. Acessibilidade

### Mudanças

- Implementar semântica ARIA nas abas.
- Associar labels e campos.
- Tornar itens do histórico acessíveis por teclado.
- Implementar foco inicial, contenção e restauração de foco no modal.
- Adicionar regiões `aria-live` e estado `aria-busy`.
- Atualizar rótulos de botões de tema e visibilidade da senha.

### Testes após a implementação

- Navegação completa usando apenas teclado.
- Abertura e fechamento do modal por Enter, Espaço e Escape.
- Verificação de foco preso e devolvido ao elemento de origem.
- Inspeção automatizada de IDs, labels e atributos ARIA essenciais.
- Teste com preferência de movimento reduzido.

## 5. Modularização e testes

### Mudanças

- Separar API, autenticação, utilitários, fila, lançamentos, locadores, relatórios e interface.
- Evitar dependências globais desnecessárias.
- Criar suíte de testes executável localmente.
- Documentar comandos de execução neste arquivo.

### Testes após a implementação

- Execução de todos os testes unitários.
- Teste de importação de cada módulo.
- Teste de carregamento do aplicativo em servidor local.
- Smoke test dos principais fluxos com API simulada.

## 6. Autenticação confiável

### Mudanças

- Criar endpoint de login na camada Vercel.
- Usar senha configurada por variável de ambiente.
- Emitir cookie de sessão HttpOnly, Secure e SameSite.
- Proteger o proxy para o Apps Script e retirar segredos do front-end.
- Implementar logout e verificação de sessão.

### Testes após a implementação

- Login válido e inválido.
- Acesso sem sessão, com sessão válida e sessão adulterada.
- Logout e expiração.
- Confirmação de que senha e URL do Apps Script não aparecem nos assets públicos.
- Teste do proxy com servidor Apps Script simulado.

## 7. Vercel e headers de segurança

### Mudanças

- Remover rewrite sem efeito.
- Configurar headers de segurança compatíveis com a aplicação.
- Definir política de cache adequada para HTML e assets.
- Adicionar CSP sem necessidade de scripts inline.
- Completar metadados de navegador e tema.

### Testes após a implementação

- Validação sintática de `vercel.json`.
- Verificação automatizada de todos os headers obrigatórios.
- Teste de compatibilidade da CSP com os scripts, estilos e API.
- Teste local final de login, lançamento, edição, exclusão, relatórios, locadores, fila e temas.

## Comandos locais previstos

```bash
npm test
node tests/local-server.cjs
```

O servidor de smoke test usa apenas dados simulados e a senha `teste-local`. Nenhum desses comandos faz commit ou push.

## Configuração necessária na Vercel

- `AUTOLUB_PASSWORD`: senha escolhida pelo proprietário.
- `AUTOLUB_SESSION_SECRET`: segredo aleatório com pelo menos 32 caracteres.
- `AUTOLUB_GAS_URL`: URL HTTPS do Google Apps Script já existente.

Esses valores não devem ser colocados no HTML ou JavaScript público.

## Pendências externas adiadas pelo proprietário

Em 12/08/2026, o proprietário cancelou qualquer alteração na Vercel e no Google Apps Script. Nenhuma configuração externa foi salva.

Quando a implantação for retomada, executar somente depois de nova autorização explícita:

1. Configurar `AUTOLUB_PASSWORD` na Vercel com o valor escolhido pelo proprietário.
2. Gerar e configurar `AUTOLUB_SESSION_SECRET` com pelo menos 32 caracteres aleatórios.
3. Configurar `AUTOLUB_GAS_URL` com a URL HTTPS da implantação existente do Apps Script.
4. Fazer um deploy de preview, sem publicar primeiro na produção.
5. Testar login, leitura e operações com dados controlados no preview.
6. Validar que o Apps Script existente não foi modificado.
7. Somente após aprovação local e do preview, decidir sobre commit, push e produção.

Até essa etapa ser autorizada, o aplicativo deve ser validado com `node tests/local-server.cjs`, que usa API e dados simulados.

## Resultado da implementação

### Etapa 1 — concluída e testada

- Handlers inline removidos.
- Renderização dinâmica feita com elementos e `textContent`.
- Mensagens e nomes com caracteres especiais testados.

### Etapa 2 — concluída e testada

- Fila usa identificadores estáveis.
- Datas comerciais são interpretadas no horário local.
- Formulários e intervalos possuem validação explícita.

### Etapa 3 — concluída e testada

- Timeout de mutação gera estado indeterminado e atualização dos dados.
- Leituras concorrentes cancelam a requisição anterior.
- Botões de mutação evitam cliques duplicados.
- JSON inválido, erro HTTP e falha de autenticação possuem respostas controladas.

### Etapa 4 — concluída e testada

- Abas, modal, labels e regiões de status possuem semântica acessível.
- Navegação por setas nas abas aprovada.
- Foco inicial e restauração de foco do modal aprovados.

### Etapa 5 — concluída e testada

- API, utilitários e fila foram separados em módulos.
- Suíte local criada com `node:test` e sem dependências externas.

### Etapa 6 — concluída e testada

- Login, logout, sessão e proxy server-side criados em `api/`.
- Cookie de sessão assinado, HttpOnly, SameSite e Secure em produção.
- URL do Apps Script e senha ausentes dos assets públicos.

### Etapa 7 — concluída e testada

- Rewrite sem efeito removido.
- CSP, HSTS, políticas de permissão, referrer e proteção de frame configuradas.
- Cache usa revalidação para evitar assets antigos sem versionamento.
- Metadados essenciais adicionados.

## Validação final local

- Testes automatizados: **34 aprovados, 0 falhas**.
- Smoke test em navegador: login inválido/válido, lançamento, validações, fila, histórico, edição, relatórios, gráfico, tema e locadores aprovados.
- Teste mobile em `390 × 844`: aprovado, sem overflow horizontal.
- Navegação por teclado e foco do modal: aprovados.
- Um defeito assíncrono no reset do formulário foi encontrado pelo smoke test, corrigido e retestado.
- Nenhum commit ou push foi realizado.
