import assert from "node:assert/strict";
import { matchTotp } from "../lib/totp.ts";
import { relativeDate, updatePeriods, recommendations, discoveryPage } from "../lib/catalog.ts";

assert.equal(matchTotp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ","287082",59000),1);
assert.equal(matchTotp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ","xxxxxx",59000),-1);
assert.deepEqual(updatePeriods(new Date("2026-11-01T16:00:00Z")), { today:"2026-11-02",week:"2026-11-02",month:"2026-11-01" });
assert.equal(relativeDate("2026-11-27"),"11月27日");
assert.equal(relativeDate("2026-11-27","2026-11-27T00:00:00Z",Date.parse("2026-11-27T01:30:00Z")),"1小时前");
const game = { slug:"a",platform:"pc",series:"X",category:"RPG",genre:"回合制",views:1,updated:"2026-11-27",downloads:["private"],description:["long"] };
const games = [game,{ ...game,slug:"b",series:"",views:300 },{ ...game,slug:"c",category:"动作",genre:"射击" },{ ...game,slug:"d",category:"动作",genre:"射击",series:"" }];
assert.deepEqual(recommendations(game,games).map(row=>row.slug),["c","b"]);
const page = discoveryPage(games,"pc","hot",99);
assert.equal(page.page,1);
assert.equal(page.items[0].slug,"b");
assert.ok(!("downloads" in page.items[0]));
console.log("PASS catalog, relative dates, Shanghai calendar and TOTP");
