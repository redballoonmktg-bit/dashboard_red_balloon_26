# Dashboard Comercial · Red Balloon

Dashboard Next.js que lê a planilha "Leads 4 Escolas — Ata Baixa" direto do
Google Sheets (via conta de serviço, somente leitura) e mostra os mesmos
painéis que hoje existem na planilha, com identidade visual Red Balloon.

## Como rodar

```bash
npm install
cp .env.example .env.local   # preencha as variáveis (veja abaixo)
npm run dev
```

Abra http://localhost:3000.

## Configuração necessária

1. **Ative a Google Sheets API** no Google Cloud Console do projeto que vai
   hospedar a conta de serviço.
2. **Crie uma Service Account** e gere uma chave JSON.
3. **Compartilhe a planilha** "Leads 4 Escolas — Ata Baixa" com o e-mail da
   conta de serviço (permissão de **Leitor** já é suficiente).
4. Preencha `.env.local`:
   - `GOOGLE_SHEETS_SPREADSHEET_ID` — o ID da planilha (está na URL, entre
     `/d/` e `/edit`).
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` — o e-mail da service account.
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` — a chave privada do JSON,
     colada como uma única linha com `\n` no lugar das quebras de linha
     (é o formato que o arquivo JSON já usa).

## Estrutura

```
lib/
  sheets.ts            → leitura das abas de leads (uma por unidade/ciclo)
  businessRules.ts      → regras de negócio e classificação de canal
  dates.ts               → parsing de datas em formato brasileiro
  theme.ts                → paleta e tokens da marca Red Balloon
app/
  api/dashboard/route.ts  → agrega leads, funil, temperatura, canais, evolução mensal, ciclos
  page.tsx                → Visão Geral
  funil/                  → Funil por Unidade (com filtro de mês, via API)
  ciclos/                 → Ciclos e Perfil
  canais/                  → Canais de Origem
  evolucao/                → Evolução Mensal
components/
  Nav.tsx, PageShell.tsx, MonthFilter.tsx, useDashboardData.ts
```

## Páginas

Apenas dados da planilha original — sem Marketing Digital, sem Funil de
Marketing, e sem as páginas de Trimestre, Gargalos e Mensal por Unidade
(removidas por decisão de escopo):

1. **Visão Geral** — KPIs do ciclo atual + leads/matrículas por unidade + conversão por unidade.
2. **Ciclos e Perfil** — leads/matrículas por ciclo comercial + distribuição de temperatura.
3. **Funil por Unidade** — funil de cada unidade, com gargalo em destaque e filtro de mês.
4. **Canais de Origem** — leads/matrículas por canal, Online vs. Outras Ações.
5. **Evolução Mensal** — leads, matrículas e conversão mês a mês.

## Conferido contra a planilha real

O arquivo `Leads_4_Escolas___Ata_Baixa.xlsx` foi inspecionado para validar o
código contra a estrutura real (não só o briefing):

- **Nomes de aba batem exatamente**: `AM | Baixa 2026`, `LI | Baixa 2026`,
  `PI | Baixa 2026`, `TA | Baixa 2026`, mais os ciclos `Alta 25-26`,
  `Alta 26-27`, `Baixa 2027` — tudo com o mesmo padrão em todas as 4 unidades.
- **Cabeçalho na linha 2, dados a partir da linha 3** — confirmado.
- **Bug real corrigido**: o índice das colunas L, N, O, P, Q e S em
  `lib/sheets.ts` estava um deslocado (off-by-one) em relação à posição real
  dentro do intervalo lido (`B:S`). Corrigido e validado linha a linha contra
  a planilha enviada (ex.: a coluna "Origem" precisa estar no índice 10
  dentro de `B:S`, não 9).
- **Campo novo incorporado**: a planilha tem uma coluna "Matrícula?"
  (Sim/Não) além da "Data Matrícula" — passei a usá-la como um terceiro sinal
  na regra de matrícula (`isMatricula`), tornando-a mais robusta a
  atualização manual incompleta de qualquer um dos três campos.
- **Classificação de canal validada**: todos os valores reais encontrados na
  coluna "Origem" (`Tráfego Pago`, `Digital-Meta ( FB e IG)`, `Whatsapp direto`,
  `Lead antigo`/`Lead Antigo`, `Ação coml/eventos`/`Ação comercial`, `MGM`,
  `Digital-Google`/`Google`, `Hubspot`/`Hubspot (Matriz)`, `Indicação`,
  `Instagram`, `Visita Espontânea`, `Ligação na unidade`) caem corretamente
  nas regras de `classificarCanal` em `lib/businessRules.ts`.
- **Temperatura e Etapa do Funil** usam exatamente os valores esperados
  (`Quente`/`Morno`/`Frio`/`Fora do Perfil` e `1º Contato`/`Follow-up`/
  `Em Negociação`/`Matrícula`/`Fora do Perfil`). "Visita Agendada" e "Visita
  Realizada" não são valores de etapa — são derivados de `Data Aula/Visita`
  e `Aula Experimental?`, como já previa a especificação.
- **Colunas extras existentes na planilha e não utilizadas de propósito**:
  `Canal` (comunicação usada — WhatsApp/Instagram/etc., diferente da
  classificação de marketing), `Canal Normalizado` e `Tipo Canal` (parecem
  ser uma tentativa anterior de normalização feita na própria planilha). O
  dashboard ignora essas três e recalcula a classificação em código a partir
  da coluna "Origem", como pedido na especificação original.

## O que ainda precisa de atenção antes de ir para produção

1. **Nomes exatos das abas**: o código espera os nomes de aba tal como
   confirmados acima. Se algum nome de aba mudar na planilha, ajuste as
   constantes em `lib/sheets.ts`.
2. **Deploy**: qualquer host que rode Next.js (Vercel é o caminho mais
   direto) funciona; lembre de configurar as mesmas variáveis de ambiente lá.

## Design

Cores, tipografia (Baloo 2 + Nunito Sans) e a logomarca oficial (`public/red-balloon-logo.png`)
seguem o Guia de Marca Red Balloon enviado. Os tokens ficam centralizados em `lib/theme.ts`.
