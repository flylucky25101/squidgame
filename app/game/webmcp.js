export function registerGameTools(context, engine) {
  const lifecycle = new AbortController();
  if (!context?.registerTool) return () => lifecycle.abort();
  const tools = [
    {
      name: 'get_last_city_status', title: '게임 상태 읽기',
      description: 'Read the current phase, objective, player health and organization funds without changing the game.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        if (!input || typeof input !== 'object' || Object.keys(input).length) throw new Error('Expected an empty object.');
        const g = engine.game;
        return { phase: g.phase, status: g.status, health: Math.ceil(g.player.hp), cash: g.profile.cash, assets: [...g.profile.assets], wins: g.profile.wins };
      },
    },
    {
      name: 'purchase_last_city_asset', title: '조직 시설 구매',
      description: 'Spend in-game organization funds to purchase a garage (3500 C), clinic (5000 C), or intelligence network (7500 C). Only available in the city. Uses the same rules as the organization screen.',
      inputSchema: { type: 'object', properties: { asset: { type: 'string', enum: ['garage', 'clinic', 'network'] } }, required: ['asset'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        if (!input || typeof input !== 'object' || Object.keys(input).some(k => k !== 'asset') || !['garage', 'clinic', 'network'].includes(input.asset)) throw new Error('Expected one supported asset.');
        const purchased = engine.buy(input.asset);
        return { purchased, cash: engine.game.profile.cash, assets: [...engine.game.profile.assets], reason: purchased ? 'purchased' : 'Unavailable in this phase, already owned, or insufficient funds.' };
      },
    },
  ];
  for (const tool of tools) { try { Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch {} }
  return () => lifecycle.abort();
}
