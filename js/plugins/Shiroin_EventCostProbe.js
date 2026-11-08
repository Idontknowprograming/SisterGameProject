//=============================================================================
// Shiroin_EventCostProbe.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc 【测量工具/非出货】量化「静止/装饰事件」每帧 update 占多少开销，估算 lite-gate 天花板。
 * @author Shiroin
 *
 * @help
 * 【目的】
 * 在动手做「按事件角色 gate 插件」之前，先用数据回答一个问题：
 *   地牢里那些「全程不动的装饰/触发事件」，每帧的 Game_Event.update 到底占了多少？
 *   —— 这就是给它们做 lite-gate（跳过移动/碰撞/帧动画整组）能省的天花板。
 *
 * 【为什么不逐事件计时】
 * Android WebView 的 performance.now() 分辨率被钳到 0.1~1ms，而单事件单帧 update 只有
 * 几微秒，逐事件计时全是噪声。本探针改用「聚合 A/B」：给整个 updateEvents 循环计时
 * （毫秒级，测得准），对比两种模式的平均值：
 *   - 模式 ALL ：所有事件正常更新（基线）。
 *   - 模式 SKIP：跳过「自探针启动以来从未移动过」的事件的 update（= lite-gate 的上限）。
 * 两者之差，就是静止类事件可回收的真实开销。
 *
 * 【用法】（在 eruda 控制台里）
 *   eventProbe.start()        // 开始：进入 ALL 模式并清零，先正常走动几秒
 *   eventProbe.skip(true)     // 切到 SKIP 模式：跳过全程静止事件的 update
 *   eventProbe.skip(false)    // 切回 ALL 模式
 *   eventProbe.report()       // 打印两种模式的平均 updateEvents 耗时 + 事件普查
 *
 * 建议流程：start() → 在同一片区域正常走动 ~8 秒 → skip(true) → 在同一片区域再走 ~8 秒
 *           → report()。两段路线尽量一致，对比才公平。
 *
 * 【安全性】
 * 只在 skip(true) 期间、且只跳过「从未移动过」的事件——装饰/触发类跳过 update 无任何
 * 可见影响。万一某个静止事件其实是「还没动的敌人」，跳过仅持续你测量的这几秒，且会在
 * report 的静止事件名单里露出来让你识别。测完 skip(false) 即恢复。纯测量工具，出货请关闭。
 */
(function(){
	"use strict";

	if (typeof Game_Event === "undefined" || typeof Game_Map === "undefined") { return; }

	var running   = false;   // 探针是否在累计
	var skipMode  = false;   // 当前是否跳过静止事件
	// 每个事件：是否曾移动过（key = mapId:eventId）
	var moved     = {};
	var lastPos   = {};      // key -> {x,y}
	// 两种模式的累计：时间(ms) 与 帧数
	var acc = { all: { t:0, f:0 }, skip: { t:0, f:0 } };

	function keyOf(ev){ return ev._mapId + ":" + ev._eventId; }

	// ---- 包 Game_Event.update：记录是否移动，并在 SKIP 模式跳过静止事件 ----
	var _Game_Event_update = Game_Event.prototype.update;
	Game_Event.prototype.update = function(){
		if (running) {
			var k = keyOf(this);
			var lp = lastPos[k];
			if (lp) {
				if (this._realX !== lp.x || this._realY !== lp.y) { moved[k] = true; }
			}
			lastPos[k] = { x: this._realX, y: this._realY };

			// SKIP 模式：从未移动过的事件，跳过整条 update 链
			if (skipMode && !moved[k]) { return; }
		}
		_Game_Event_update.call(this);
	};

	// ---- 包 updateEvents：给整个事件更新循环计时（毫秒级，分辨率安全） ----
	var _Game_Map_updateEvents = Game_Map.prototype.updateEvents;
	Game_Map.prototype.updateEvents = function(){
		if (!running) { _Game_Map_updateEvents.call(this); return; }
		var t0 = performance.now();
		_Game_Map_updateEvents.call(this);
		var dt = performance.now() - t0;
		var bucket = skipMode ? acc.skip : acc.all;
		bucket.t += dt; bucket.f++;
	};

	function avg(b){ return b.f > 0 ? b.t / b.f : 0; }

	window.eventProbe = {
		start: function(){
			moved = {}; lastPos = {};
			acc = { all: { t:0, f:0 }, skip: { t:0, f:0 } };
			skipMode = false; running = true;
			console.log("[EventProbe] 已开始（ALL 模式）。正常走动 ~8 秒，再 eventProbe.skip(true) 跑同一片区域，最后 eventProbe.report()。");
		},
		skip: function(on){
			skipMode = !!on;
			console.log("[EventProbe] 模式 → " + (skipMode ? "SKIP（跳过全程静止事件）" : "ALL（全部更新）"));
		},
		report: function(){
			var ev = $gameMap ? $gameMap.events() : [];
			var total = ev.length, movedN = 0, statN = 0, statNames = [];
			for (var i = 0; i < ev.length; i++) {
				var k = keyOf(ev[i]);
				if (moved[k]) { movedN++; }
				else {
					statN++;
					var nm = (ev[i].event() && ev[i].event().name) || "";
					statNames.push("#" + ev[i]._eventId + (nm ? "(" + nm + ")" : ""));
				}
			}
			var aAll = avg(acc.all), aSkip = avg(acc.skip);
			var delta = aAll - aSkip;
			var pct = aAll > 0 ? (100 * delta / aAll) : 0;

			console.log("==================== EventProbe 报告 ====================");
			console.log("当前地图事件: 总 " + total + " | 采样中移动过 " + movedN + " | 全程静止 " + statN);
			console.log("updateEvents 平均耗时 / 帧:");
			console.log("  ALL  模式: " + aAll.toFixed(3) + " ms  (" + acc.all.f + " 帧)");
			console.log("  SKIP 模式: " + aSkip.toFixed(3) + " ms  (" + acc.skip.f + " 帧)");
			console.log("  → 静止类事件 update 占 updateEvents 的约 " + pct.toFixed(1) + "%  (每帧约省 " + delta.toFixed(3) + " ms)");
			console.log("  ※ 折算 60fps：每秒约省 " + (delta * 60).toFixed(1) + " ms —— 这就是 lite-gate 的天花板");
			if (acc.all.f < 120 || acc.skip.f < 120) {
				console.log("  ⚠ 某一模式采样帧数偏少，建议每种模式各走动 8 秒以上再 report。");
			}
			console.log("---- 全程静止事件名单（确认它们确实是装饰/触发，而非没动的敌人）----");
			console.log(statNames.join("  "));
			console.log("========================================================");
			return { all: aAll, skip: aSkip, deltaPerFrame: delta, pct: pct, statN: statN, movedN: movedN };
		}
	};

	console.log("[EventProbe] 已载入。控制台执行 eventProbe.start() 开始测量。");

})();
