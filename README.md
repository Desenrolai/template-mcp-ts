# desenrolai-mcp-ts-template

Template for MCP servers (TypeScript, stdio transport).

## Stack

- **Node 24 LTS** + **TypeScript 6** (ESM, `module: Node16`)
- `@modelcontextprotocol/sdk` 1.30 — stdio transport
- `zod` 4 — tool input validation
- `vitest` 4 — tests

## Structure

```
src/
  index.ts        # entrypoint — connects transport
  server.ts       # MCP server + tool registrations
  server.test.ts  # exercita as tools por transporte em memória
scripts/
  cpu-limit.mjs   # limite de CPU do cgroup → maxWorkers do Vitest
  cpu-limit.test.mjs
```

## Getting started

```bash
npm ci
npm run dev          # run via tsx (no build needed)
npm run build        # compile to dist/
npm start            # run compiled output
npm test             # vitest
```

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run build` | `tsc -p tsconfig.build.json` (sem testes em `dist/`) |
| `npm run dev` | tsx |
| `npm start` | roda o build |
| `npm run lint` | ESLint (flat config) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest |
| `npm run test:cov` | Vitest + coverage |

## Transport

This server uses **stdio transport only**. It does not expose HTTP. Configure your MCP client to run:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["dist/index.js"]
    }
  }
}
```

A imagem Docker roda como usuário não-root (`node`) e, deliberadamente, não tem
`EXPOSE` nem `HEALTHCHECK`: não há porta para sondar, e um healthcheck que
escrevesse em stdout corromperia o próprio protocolo.

## Adding tools

Register new tools in `src/server.ts` via `server.tool(name, description, schema, handler)`.

Os testes ligam um `Client` do SDK ao server por `InMemoryTransport` e chamam a
tool de verdade — listagem, execução e rejeição de entrada inválida. Prefira
esse formato ao adicionar tools: um teste que só verifica que o server "existe"
passa mesmo quando a tool está quebrada.

## CI: runner do repo gerado

O workflow roda em runner **hospedado** por padrão. Este template é público — em
repo público o Actions hospedado é gratuito, e apontar self-hosted aqui deixaria
um PR de fork executar código de terceiro dentro do cluster.

⚠️ **O repo gerado é privado, e nele esse default não vale.** Com a cota
hospedada bloqueada por billing, o job **falha em ~2 s sem executar nenhum
step** — e sem mensagem no log que oriente.

Zero steps, sozinho, não identifica nada: um job `skipped` pelo `if:` também
reporta zero. **O separador é a conclusão**: `failure` em ~2 s é billing;
`skipped` é o `if:`. Parece YAML quebrado, não é — a causa costuma vir na
*annotation* do job, não no log. Não perca tempo procurando erro no workflow.

Antes do primeiro push, defina duas **variáveis de repositório** (Settings →
Secrets and variables → Actions → Variables) com **array JSON** de labels:

| Variável           | Valor                              | Usada por                    |
| ------------------ | ---------------------------------- | ---------------------------- |
| `CI_RUNNER`        | `["self-hosted","desenrolai"]`     | job `ci`                     |
| `CI_RUNNER_DOCKER` | `["self-hosted","docker-builder"]` | jobs que constroem a imagem  |

```bash
gh variable set CI_RUNNER --body '["self-hosted","desenrolai"]'
gh variable set CI_RUNNER_DOCKER --body '["self-hosted","docker-builder"]'
```

São dois pools diferentes de propósito: o pool `desenrolai` **não tem Docker**
(`dockerEnabled: false`), só o `docker-builder` tem. Build de imagem no pool
errado falha por falta de daemon.

JSON é obrigatório: `runs-on` com a string `self-hosted,desenrolai` vira **um**
label contendo vírgula — não dois — e o job fica em `queued` para sempre. Sem as
variáveis definidas, o default hospedado continua valendo.

## Pool de teste e cgroup

`scripts/cpu-limit.mjs` lê o limite de CPU do cgroup (v2 `cpu.max`, v1
`cpu.cfs_quota_us`) e alimenta o `maxWorkers` do Vitest em `vitest.config.mjs`.
Dentro de um container, `os.cpus()` reporta as CPUs do **host**: sem esse ajuste
o Vitest sobe workers demais e o job morre com todos os testes passando. Fora de
container (macOS local) o helper cai para `os.cpus().length`.

## Ao gerar um repo a partir deste template (rename obrigatório)

O Forge scaffolda com `octokit.repos.createUsingTemplate` — **cópia literal, sem
substituição de placeholder**. Todo nome deste template chega intacto no repo
gerado, e um deles é **visível no protocolo**: dois servidores gerados daqui se
anunciam com o mesmo `serverInfo.name`, e clientes MCP indexam servidor por nome.

Lista **completa** — trocar um subconjunto deixa o repo inconsistente ou a suíte
vermelha.

| Onde | Valor atual | O que quebra se ficar |
| --- | --- | --- |
| `src/server.ts` → `McpServer({ name })` | `desenrolai-mcp-template` | **funcional**: é o `serverInfo.name` que o cliente MCP vê e usa como chave |
| `src/server.ts` → texto da tool `hello` | `...This is the Desenrolai MCP template.` | **par acoplado** com o teste (linha abaixo) |
| `src/server.test.ts` → asserção do `content` | a mesma string | **a suíte reprova** se você mudar o texto e esquecer aqui |
| `package.json` → `name` | `@desenrolai/mcp-template` | colide com todo outro repo gerado deste template |
| `package-lock.json` → `name` (2 ocorrências) | idem | regenerado sozinho: rode `npm install` **depois** de trocar o `package.json` |
| `package.json` → `description` | `Template: MCP server (...)` | nada — cosmético, e **não casa com o grep abaixo** |
| `src/server.ts` → `McpServer({ version })` | `0.1.0` | nada, mas **duplica** o `version` do `package.json` — mantenha em sincronia |
| `README.md` → título e stack | `desenrolai-mcp-ts-template` | nada — cosmético |
| `.github/workflows/ci.yml` → `IMAGE_NAME` | `desenrolai/${{ ... }}` | **NÃO troque**: `desenrolai` aqui é a org do GHCR, não o nome do template. O repo já entra por `github.event.repository.name` |

Confira, do próprio repo:

```bash
git grep -nI -e 'mcp-template' -e 'mcp-ts-template' -e 'MCP template' -- . ':!README.md'
```

Saída vazia = os pontos que casam o nome foram todos trocados. **Ele não pega a
`description` do `package.json`** (não contém o nome) — confira essa à mão.
Depois rode `npm test`: é ele que fecha o par `server.ts` ⟷ `server.test.ts`.

O teste compara o texto **literal** em vez de importar uma constante, de
propósito: um teste que importasse a constante seguiria o rename e voltaria a ser
tautológico — passaria com a tool quebrada. A suíte reprovar durante o rename é o
sinal de que você achou o ponto, não um defeito.

`private: true` fica. Sem ele, um `npm publish` acidental empurraria um pacote
escopado com o nome do template. Remova só quando o repo gerado for de fato
publicável, e com o nome já trocado.

O `-- . ':!README.md'` exclui esta própria seção, que cita os valores antigos
de propósito. **Apague esta seção** depois de concluir o rename — ela é
instrução de scaffold, não documentação do repo gerado.
