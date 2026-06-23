INSTRUÇÃO PARA AGENTE LOCAL (ATUALIZADA)

Tarefa: Implementar uma "Fila Digital" na aba de lançamentos do site.

Requisitos Funcionais:

Localização: A fila digital deve ser inserida dentro da aba de lançamentos existente no site.

Tecnologia: Pode ser desenvolvida em JavaScript puro e armazenada localmente (localhost).

Funcionalidades da Fila:

Um campo de entrada de texto para digitar o nome do próximo cliente/item a ser adicionado à fila.

Um botão verde com texto "Confirmar" para adicionar o nome digitado à fila.

Um botão vermelho com texto "Riscar" para marcar o primeiro item da fila como concluído (riscado) e removê-lo visualmente ou movê-lo para uma seção de concluídos.

Um botão "Limpar Fila" para remover todos os itens da fila de uma só vez (com confirmação, se possível).

Persistência de Dados: A fila deve manter seu estado mesmo após recarregar a página. Utilize localStorage para salvar e restaurar a lista de itens.

Atualização em Tempo Real: Todas as ações (adicionar, riscar, limpar) devem ser refletidas imediatamente na interface, sem necessidade de recarregar a página.

Requisitos de Design:

O design da fila digital deve ser compatível e visualmente consistente com o restante do projeto (cores, fontes, espaçamentos, estilo de botões, etc.).

Utilize classes CSS já existentes no projeto para manter a padronização.

Botão "Riscar" deve ser vermelho para indicar ação de remoção/finalização.

Botão "Confirmar" deve ser verde.

Botão "Limpar Fila" pode ser cinza ou vermelho (a critério do design existente).

Orientações de Implementação:

Crie um container HTML específico para a fila dentro da aba de lançamentos.

Escreva o JavaScript em um arquivo separado ou em um bloco <script> no final do body, garantindo que as funções sejam executadas após o carregamento do DOM.

Armazene os dados da fila em localStorage usando uma chave única (ex.: filaDigital).

Ao carregar a página, verifique se há dados salvos em localStorage e recarregue a fila automaticamente.

Ao adicionar, riscar ou limpar, atualize o localStorage imediatamente.