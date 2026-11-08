//=============================================================================
// Shiroin_IdleWindowGate.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc 关闭(openness=0)且未在开启动画的窗口，跳过每帧 update 空转。一处统一 gate 全部窗口。
 * @author Shiroin
 *
 * @help
 * 【问题】
 * RPG Maker 里 visible / openness 只控制「渲不渲染」，不控制「更不更新」。
 * 一个窗口只要作为场景子节点存在，哪怕 openness=0（彻底关闭、完全看不见），
 * 它的 update() 仍每帧被调，跑 updateTone / updateOpen / updateArrows /
 * processCursorMove / processTouch 等空转。
 *
 * Scene_Map 上常驻一大批这种关闭窗口（Window_EventItem / ChoiceList / NumberInput /
 * 各种 MapSelect* / Message / Gold / NameBox …），其中不少是 Window_Selectable 子类，
 * 待机时它们的 update 合起来能吃掉百分之十几的脚本时间——全花在没人看的窗口上。
 *
 * 【修法】
 * 所有窗口的 update() 都由 WindowLayer.prototype.update 统一遍历发起。本插件只在这一处
 * 加一道门：窗口「彻底关闭(openness<=0) 且 不在开启动画中(!_opening)」时跳过它的 update。
 *
 * 【为什么安全】
 *  - 开合动画靠 Window_Base.updateOpen/updateClose 推进，而它们由 _opening/_closing 驱动：
 *      · 要打开时 open() 会置 _opening=true → 本门放行 → 动画正常播放、openness 升上去；
 *      · 关闭过程中 openness>0 → 本门放行 → 关闭动画正常播放到底；
 *      · 只有「停在全关、且没人正叫它开」这一态才跳过，此时 update 本来也无事可做。
 *  - openness>0 的窗口（含隐藏但 openness=255 的 HUD：小地图 / 悬停窗 / 潜行槽等）一律不碰，
 *    它们可能在后台维护状态，保持原样最稳。
 *  - 非窗口子节点没有 openness（undefined<=0 为 false），不受影响。
 *
 * 【个别窗口需要关着也更新时】
 *   给该窗口实例设 window._noIdleGate = true; 即可豁免本 gate（按需，一般用不到）。
 */
(function(){
	"use strict";

	if (typeof WindowLayer === "undefined" || !WindowLayer.prototype.update) { return; }

	// 是否「彻底关闭且非开启动画中」——满足则本帧跳过其 update
	function isIdleClosed(w){
		if (!(w.openness <= 0)) { return false; }   // openness>0，或非窗口(undefined<=0 为 false)→ 不 gate
		if (w._opening || w._noIdleGate) { return false; }
		// ★Window_Message 例外：它是 消息/选择支/数值输入/物品选择 的调度器，会在自己的 update 里
		//   检测 $gameMessage 状态并调用子窗口的 start()。即使它自身 openness=0（如「选择物品」前
		//   无文字消息），也必须每帧 update，否则该输入永远触发不了 → 事件解释器死等 → 软锁。
		//   （PEZ 物品栏经公共事件「选择物品」打开，正是走这条链，曾被误 gate 导致软锁。）
		if (typeof Window_Message !== "undefined" && w instanceof Window_Message) { return false; }
		return true;
	}

	const _WindowLayer_update = WindowLayer.prototype.update;
	WindowLayer.prototype.update = function(){
		const children = this.children;
		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			if (!child.update) { continue; }
			// openness 为 undefined 的非窗口子节点：undefined<=0 为 false，自然走正常 update
			if (isIdleClosed(child)) { continue; }
			child.update();
		}
	};

})();
