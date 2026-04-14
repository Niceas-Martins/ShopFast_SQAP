#  ShopFast — Mini-SQAP (Software Quality Assurance Plan)

> **Norma de referência:** IEEE 730-2014 · **Owner:** Arquiteto de Qualidade (SQA Lead)
> **Versão:** 1.0.0 · **Status:** 🟢 ATIVO — Enforcement em produção via GitHub Actions

---

##  Contexto do Incidente

Na Black Friday, o sistema exibiu a barra verde do cupom `BLACK50` sem validar o campo `remainingBalance` retornado pela API de pagamento. O serviço logístico interpretou o HTTP 200 do serviço de cupom como autorização de despacho. Resultado: milhares de iPhones despachados sem pagamento confirmado, quebrando o pilar de **Adequação Funcional (ISO 25010)** e elevando o **Change Failure Rate (DORA)** a níveis críticos.

A causa não foi falta de código. Foi **ausência de governança de processo**. Este documento estabelece a política que torna essa falha estruturalmente impossível de se repetir.

---

## PARTE A — POLÍTICA DO QUALITY GATE (Regra de Enforcement)
> *Baseada na IEEE 730-2014 — Norma de Garantia de Processo de Qualidade de Software*
> *"Uma política sem mecanismo de bloqueio é uma sugestão. Sugestão não impede desastre."*

As duas regras abaixo são **imutáveis e automatizadas**. Nenhum artefato avança para `main` ou `release/*` sem aprovação simultânea de ambas. A violação de qualquer uma resulta em **build abortado e Pull Request fisicamente bloqueado** pelo GitHub via Branch Protection Rules.

---

### QG-01 — Threshold de Cobertura Obrigatória em Módulos Financeiros
**Fundamentação:** IEEE 730-2014, Seção 5.3.3 — *"O plano deve definir critérios mensuráveis de completude para cada fase de verificação."*

**O que esta regra impede:** Impede que qualquer lógica financeira — cálculo de cupom, cobrança, frete ou saldo — chegue à branch `main` sem que o caminho crítico `cupom_válido AND saldo_zerado` esteja coberto por testes automatizados. Foi exatamente esse branch não coberto que causou o incidente da Black Friday.

| Atributo | Definição |
|---|---|
| **Escopo** | Todos os arquivos em `src/checkout/`, `src/coupon/`, `src/pricing/` |
| **Critério mínimo** | Branch coverage ≥ **90%** · Line coverage ≥ **85%** |
| **Ferramenta de execução** | `jest --coverage --coverageThreshold` configurado em `package.json` |
| **Mecanismo de bloqueio** | Jest retorna `exit code 1` se threshold não atingido → step CI falha → PR bloqueado |
| **Ativação no GitHub** | Settings → Branches → Add rule → *"Require status checks: `coverage-gate`"* |

**Como o bloqueio funciona na prática:**
```
Desenvolvedor abre PR
       ↓
GitHub Actions executa: npm run test:ci
       ↓
jest verifica coverageThreshold do package.json
       ↓
Branch coverage < 90%?  ──→ exit code 1 ──→ status check FALHA ──→ MERGE BLOQUEADO
Branch coverage ≥ 90%?  ──→ exit code 0 ──→ status check PASSA  ──→ segue para QG-02
```

---

### QG-02 — Verificação de Contrato de API Cruzada (Contract Testing Gate)
**Fundamentação:** IEEE 730-2014, Seção 5.3.5 — *"Atividades de verificação devem incluir revisão das interfaces entre componentes do sistema."*

**O que esta regra impede:** Impede que o serviço logístico receba o gatilho de despacho sem que a interface com o serviço de pagamento tenha sido verificada e homologada. O campo `remainingBalance` deve ser validado no contrato entre os serviços antes de qualquer deploy — exatamente o que não aconteceu na Black Friday.

| Atributo | Definição |
|---|---|
| **Escopo** | Interfaces: `coupon-service ↔ payment-service ↔ logistics-service` |
| **Critério mínimo** | 100% dos contratos Pact/OpenAPI aprovados pelo Pact Broker |
| **Ferramenta de execução** | `pact-broker can-i-deploy` executado como step no pipeline CI |
| **Mecanismo de bloqueio** | `can-i-deploy` retorna `false` → step CI falha → PR bloqueado |
| **Ativação no GitHub** | Settings → Branches → Add rule → *"Require status checks: `contract-gate`"* |

**Como o bloqueio funciona na prática:**
```
QG-01 aprovada
       ↓
GitHub Actions executa: pact-broker can-i-deploy
       ↓
Verifica contrato: coupon-service ↔ payment-service (campo remainingBalance presente?)
                   payment-service ↔ logistics-service (dispatch só após charge_confirmed?)
       ↓
Contrato quebrado? ──→ can-i-deploy: false ──→ status check FALHA ──→ MERGE BLOQUEADO
Contrato válido?   ──→ can-i-deploy: true  ──→ status check PASSA  ──→ deploy autorizado
```

---

###  Ativação do bloqueio físico no GitHub (Branch Protection Rules)

Sem esta configuração, os gates existem no código mas não bloqueiam o merge.

```
1. Acesse: github.com/seu-usuario/shopfast-sqa
2. Vá em: Settings → Branches → Add branch protection rule
3. Branch name pattern: main
4. Marque: ✅ Require status checks to pass before merging
5. Adicione os checks:  coverage-gate
                        contract-gate
6. Marque: ✅ Require branches to be up to date before merging
7. Clique em: Save changes
```

A partir desse momento, **nenhum humano consegue fazer merge** sem que os dois gates estejam verdes. O bloqueio é físico — não depende de disciplina ou boa intenção.

---

## PARTE B — SUMÁRIO EXECUTIVO: GESTÃO DE RISCO

### Classificação do Incidente — Matriz de Probabilidade × Impacto

A tabela abaixo classifica **riscos reais da plataforma ShopFast** por nível de probabilidade de ocorrência e severidade de impacto. Cada célula contém um exemplo concreto do sistema.

|  | **Impacto Baixo** | **Impacto Médio** | **Impacto Crítico** |
|---|---|---|---|
| **Probabilidade Alta** | 🟡 **Moderado** — Lentidão no checkout em horário de pico (SLA degradado, sem perda financeira direta) | 🔴 **Alto** — Cupom ativo após expiração no banco de dados (perda de receita por desconto indevido) | 🔴🔴 **CRÍTICO** — ★ **Incidente Black Friday**: despacho logístico sem `remainingBalance` confirmado. Causa: campo ignorado antes do trigger. Prejuízo: estoque despachado sem pagamento |
| **Probabilidade Média** | 🟢 **Baixo** — Falha de formatação no e-mail de confirmação de pagamento (experiência degradada, sem impacto financeiro) | 🟡 **Moderado** — Desconto aplicado em categoria de produto errada por falha na regra de negócio | 🔴 **Alto** — API de pagamento retorna erro 500 sem fallback implementado (transações perdidas em produção) |
| **Probabilidade Baixa** | 🟢 **Baixo** — Typo no label do botão de cupom (impacto visual apenas, sem efeito funcional) | 🟢 **Baixo** — Timeout isolado em gateway externo resolvido por retry automático | 🟡 **Moderado** — Vazamento de dados por falha de configuração em novo ambiente de deploy |

**Legenda de ação por nível:**

| Nível | Classificação P × I | Ação obrigatória |
|---|---|---|
| 🟢 **Baixo** | Baixa × Baixo/Médio | Monitorar — log no pipeline, revisão na próxima sprint |
| 🟡 **Moderado** | Média × Baixo/Médio ou Baixa × Crítico | Ticket obrigatório — teste antes do merge aprovado pelo time |
| 🔴 **Alto** | Média × Crítico ou Alta × Médio | Hotfix prioritário — aprovação do SQA Lead antes do deploy |
| 🔴🔴 **Crítico** | Alta × Crítico | **QG-01 + QG-02 bloqueiam o merge automaticamente** |

---

### Justificativa Executiva — Como o SQA reduz o Change Failure Rate

O incidente da Black Friday revela o custo estrutural de confundir SQC (Software Quality Control) com SQA (Software Quality Assurance). Testar após o defeito existir "SQC reativo" não teria impedido o desastre, pois o teste correto simplesmente não existia: o branch `cupom_válido AND saldo_zerado` nunca foi coberto, e nenhum contrato entre o serviço de cupom e o serviço de pagamento definia que `remainingBalance > 0` era pré-requisito para o despacho logístico. O SQA documentado neste plano age na **origem do processo**: a QG-01 (IEEE 730 §5.3.3) torna obrigatório que esse branch crítico seja coberto antes de qualquer Pull Request atingir `main`, e a QG-02 (IEEE 730 §5.3.5) impede fisicamente que serviços com contratos quebrados sejam promovidos a qualquer ambiente. A falha se torna **estruturalmente impossível de repetir** sem violar o pipeline — independente de pressão de prazo, pressa de entrega ou falta de disciplina individual.

Do ponto de vista do framework DORA, o **Change Failure Rate** mede a proporção de deploys que causam incidentes em produção. Cada defeito interceptado pelo pipeline CI é um incidente subtraído dessa métrica antes de causar dano real. Com as duas regras do Quality Gate ativas, a classe de defeito "integração financeira não validada" é bloqueada no estágio de verificação — não após o prejuízo. A rastreabilidade garantida pelo IEEE 730 (§5.4) transforma cada bloqueio do pipeline em um registro auditável: data, autor, motivo e gate responsável ficam no log do CI, permitindo análise de tendência e melhoria contínua do processo. O SQA deixa de ser custo operacional e passa a ser **ativo estratégico de resiliência**: menos incidentes, menor Change Failure Rate, maior confiança nos ciclos de entrega.

---

## PARTE C — Snippet Refatorado (Clean Code)
> *Regra do cálculo de cupom vinculada ao limite de saldo — isolada das integrações nocivas*

### O problema original (código da Black Friday)

```javascript
//  CÓDIGO ORIGINAL — causou o incidente Black Friday
function aplicarCupom(codigoCupom, dadosUsuario) {
  const resposta = apiCupom.verificar(codigoCupom); // retornou HTTP 200
  if (resposta.status === 'ok') {
    barraVerde.exibir();                 // UI verde ativada
    servicoLogistico.despachar(pedido);  // ← DESASTRE: despachou sem checar saldo
  }
}
// Problema: remainingBalance nunca foi lido.
// HTTP 200 não significa "pagamento confirmado".
```

### A correção refatorada (Clean Code)

**Princípios aplicados:**
- **Single Responsibility:** `validarCupom` só valida — não despacha, não chama UI
- **Fail-fast / Guard clauses:** saldo zerado é rejeitado antes de qualquer ação
- **Funções puras:** sem efeitos colaterais, sem chamadas HTTP, sem estado global
- **Nomes que revelam intenção:** `temSaldoPositivo`, `cupomExisteNoCatalogo`

```javascript
//  CÓDIGO REFATORADO — Clean Code + correção da causa-raiz

const SALDO_MINIMO_ACEITO = 0.01;

/**
 * Valida se um cupom pode ser aplicado dado o saldo confirmado pela API de pagamento.
 * DEVE ser chamado ANTES de qualquer trigger logístico.
 */
function validarCupom(codigoCupom, saldoDisponivel, catalogoCupons) {

  if (!codigoEstaPreenchido(codigoCupom)) {
    return resultado(false, 'Cupom ausente ou vazio.', 0);
  }

  if (!cupomExisteNoCatalogo(codigoCupom, catalogoCupons)) {
    return resultado(false, `Cupom "${codigoCupom}" não encontrado no catálogo.`, 0);
  }

  // ← ESTA É A LINHA QUE FALTAVA NO CÓDIGO DA BLACK FRIDAY
  if (!temSaldoPositivo(saldoDisponivel)) {
    return resultado(false,
      `Cupom rejeitado: saldo R$ ${saldoDisponivel} — insuficiente.`, 0);
  }

  return resultado(true, 'Cupom validado.', catalogoCupons[codigoCupom]);
}

// ── Guard clauses ────────────────────────────────────────────────────────────

function codigoEstaPreenchido(codigo) {
  return typeof codigo === 'string' && codigo.trim().length > 0;
}

function cupomExisteNoCatalogo(codigo, catalogo) {
  return Object.prototype.hasOwnProperty.call(catalogo, codigo);
}

function temSaldoPositivo(saldo) {
  return typeof saldo === 'number' && saldo >= SALDO_MINIMO_ACEITO;
}

function resultado(valido, motivo, taxaDesconto) {
  return { valido, motivo, taxaDesconto };
}

// ── Uso correto no fluxo de checkout ─────────────────────────────────────────

const { valido, motivo, taxaDesconto } = validarCupom(
  'BLACK50',
  respostaApiPagamento.remainingBalance, // ← lê o saldo real, não só o HTTP 200
  catalogoCupons
);

if (!valido) {
  ui.exibirErro(motivo);
  return; // para aqui — logística jamais é acionada com saldo zerado
}

// Só chega aqui se cupom válido E saldo > 0
const totalFinal = calcularTotalComDesconto(valorPedido, taxaDesconto);
await servicoPagamento.cobrar(totalFinal);    // cobra primeiro
await servicoLogistico.despachar(pedido);     // despacha depois
```

### Por que isso resolve o incidente

| | Antes — Black Friday | Depois — Clean Code |
|---|---|---|
| **Validação de saldo** | `remainingBalance` ignorado | Guard clause `temSaldoPositivo()` rejeita saldo zerado |
| **Gatilho logístico** | Acionado junto com a UI verde | Só acionado após `cobrar()` confirmar sucesso |
| **Responsabilidade** | Uma função mistura UI + pagamento + logística | Cada função tem uma única responsabilidade |
| **Testabilidade** | Impossível testar o branch `saldo_zerado` | Função pura — testável de forma isolada, sem mocks |

---

*Documento de governança sob IEEE 730-2014. Revisão obrigatória a cada release major.*
