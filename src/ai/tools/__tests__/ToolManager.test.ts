import Redis from 'ioredis-mock';
import { ToolManager } from '../ToolManager';
import { ToolDefinition, ToolError } from '../types';

function makeTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    name: 'echo',
    description: 'echoes input',
    timeoutMs: 1000,
    rateLimitPerMinute: 2,
    validate: (args: unknown) => {
      if (typeof (args as any)?.value !== 'string') throw new ToolError('value must be a string', 'validation');
      return args as { value: string };
    },
    execute: async (args: any) => ({ echoed: args.value }),
    ...overrides,
  };
}

describe('ToolManager', () => {
  it('executes a valid tool call', async () => {
    const manager = new ToolManager(new Redis() as any);
    manager.register(makeTool());

    const result = await manager.call('echo', { value: 'hi' }, {
      discordUserId: 'user1',
      botInstanceId: {} as any,
    });

    expect(result).toEqual({ echoed: 'hi' });
  });

  it('rejects invalid arguments before execution', async () => {
    const manager = new ToolManager(new Redis() as any);
    const execute = jest.fn();
    manager.register(makeTool({ execute }));

    await expect(
      manager.call('echo', { value: 123 }, { discordUserId: 'user1', botInstanceId: {} as any }),
    ).rejects.toThrow(ToolError);
    expect(execute).not.toHaveBeenCalled();
  });

  it('enforces per-minute rate limits per user per tool', async () => {
    const manager = new ToolManager(new Redis() as any);
    manager.register(makeTool({ rateLimitPerMinute: 1 }));

    await manager.call('echo', { value: 'a' }, { discordUserId: 'user1', botInstanceId: {} as any });
    await expect(
      manager.call('echo', { value: 'b' }, { discordUserId: 'user1', botInstanceId: {} as any }),
    ).rejects.toThrow(/Rate limit/);
  });

  it('times out a tool that never resolves', async () => {
    const manager = new ToolManager(new Redis() as any);
    manager.register(
      makeTool({
        timeoutMs: 20,
        execute: () => new Promise(() => {}), // never resolves
      }),
    );

    await expect(
      manager.call('echo', { value: 'x' }, { discordUserId: 'user1', botInstanceId: {} as any }),
    ).rejects.toThrow(/timed out/);
  });

  it('rejects a call to an unregistered tool', async () => {
    const manager = new ToolManager(new Redis() as any);
    await expect(
      manager.call('does-not-exist', {}, { discordUserId: 'user1', botInstanceId: {} as any }),
    ).rejects.toThrow(/Unknown tool/);
  });

  it('enforces required user permissions', async () => {
    const manager = new ToolManager(new Redis() as any);
    manager.register(makeTool({ requiredUserPermissions: [BigInt(0x8) /* arbitrary bit */] }));

    await expect(
      manager.call('echo', { value: 'x' }, { discordUserId: 'user1', botInstanceId: {} as any, userPermissions: 0n }),
    ).rejects.toThrow(/permission/);
  });
});
