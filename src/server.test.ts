import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from './server.js';

/** Liga um Client a um server novo por transporte em memoria. */
async function connectClient(): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test-client', version: '0.0.0' });

  await Promise.all([
    createServer().connect(serverTransport),
    client.connect(clientTransport),
  ]);

  return client;
}

describe('createServer', () => {
  it('returns an MCP server instance', () => {
    expect(createServer()).toBeDefined();
  });

  it('anuncia a tool hello com o schema de entrada', async () => {
    const client = await connectClient();

    const { tools } = await client.listTools();
    const hello = tools.find((t) => t.name === 'hello');

    expect(hello).toBeDefined();
    expect(hello?.description).toBe('Returns a greeting message');
    expect(hello?.inputSchema.properties).toHaveProperty('name');
    expect(hello?.inputSchema.required).toContain('name');

    await client.close();
  });

  it('executa a tool hello e devolve a saudacao', async () => {
    const client = await connectClient();

    const result = await client.callTool({ name: 'hello', arguments: { name: 'Desenrolai' } });

    // A string abaixo repete o texto de `src/server.ts` DE PROPOSITO. Nao troque
    // por um import da constante: a assercao passaria a seguir qualquer rename do
    // texto e voltaria a ser tautologica — verde com a tool quebrada. Esta suite
    // reprovar quando voce renomear a tool e o comportamento desejado, nao um
    // defeito. (O README repete isso na secao de rename, que manda apagar a si
    // mesma; por isso a razao mora aqui tambem.)
    expect(result.content).toEqual([
      { type: 'text', text: 'Hello, Desenrolai! This is the Desenrolai MCP template.' },
    ]);

    await client.close();
  });

  it('rejeita entrada invalida em vez de executar o handler', async () => {
    const client = await connectClient();

    // `name` e obrigatorio e nao pode ser vazio (z.string().min(1)).
    const result = await client.callTool({ name: 'hello', arguments: { name: '' } });

    expect(result.isError).toBe(true);

    await client.close();
  });
});
