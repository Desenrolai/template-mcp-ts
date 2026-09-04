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

## Pool de teste e cgroup

`scripts/cpu-limit.mjs` lê o limite de CPU do cgroup (v2 `cpu.max`, v1
`cpu.cfs_quota_us`) e alimenta o `maxWorkers` do Vitest em `vitest.config.mjs`.
Dentro de um container, `os.cpus()` reporta as CPUs do **host**: sem esse ajuste
o Vitest sobe workers demais e o job morre com todos os testes passando. Fora de
container (macOS local) o helper cai para `os.cpus().length`.
