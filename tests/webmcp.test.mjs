import test from 'node:test';
import assert from 'node:assert/strict';
import { registerGameTools } from '../app/game/webmcp.js';
import { createGame, buyAsset } from '../app/game/model.js';

test('WebMCP uses real organization actions and validates all inputs',()=>{
  const registered=[]; const context={registerTool:(tool,options)=>registered.push({tool,options})};
  const engine={game:createGame({cash:3500}),buy(id){return buyAsset(this.game,id);}};
  const unregister=registerGameTools(context,engine);
  assert.deepEqual(registered.map(t=>t.tool.name),['get_last_city_status','purchase_last_city_asset']);
  const [read,purchase]=registered.map(t=>t.tool);
  assert.equal(read.annotations.readOnlyHint,true);
  assert.equal(purchase.annotations.readOnlyHint,false);
  assert.equal(read.execute({}).cash,3500);
  assert.throws(()=>purchase.execute({asset:'admin'}));
  assert.throws(()=>read.execute({mutate:true}));
  assert.equal(engine.game.profile.cash,3500);
  assert.equal(purchase.execute({asset:'garage'}).purchased,true);
  assert.equal(read.execute({}).cash,0);
  assert.equal(purchase.execute({asset:'garage'}).purchased,false);
  unregister();assert(registered.every(t=>t.options.signal.aborted));
});
test('unsupported WebMCP contexts do not block the game',()=>{assert.doesNotThrow(()=>registerGameTools(undefined,{})());});
