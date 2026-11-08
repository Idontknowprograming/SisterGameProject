//=============================================================================
// Shiroin_PixiInteractionGate.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc 默认关闭 PIXI 原生交互(InteractionManager)，省掉每帧指针命中检测开销。
 * @author Shiroin
 *
 * @help
 * 【背景】
 * 本工程里只有 Hendrix_Hotbar_Creator 用到 PIXI 原生交互(.on('click'/'mouseover'))，
 * 而它的实际作用只是「鼠标点/悬停一个快捷栏格子时把选择光标移过去」——纯便利功能：
 *   - 用道具：R 键(useSlotContents) + TouchInput 点击路径，都不经过 PIXI；
 *   - 快捷栏编辑器(Hotbar Creator)的拖拽重排：走 TouchInput；
 *   - 地图点击/菜单/触屏：全部走 RM 自己的 TouchInput。
 * 但 PIXI 的 InteractionManager 只要开着，就会「每次指针移动遍历整棵显示树做命中检测」
 * (profile 里的 Event:pointerover / TreeSearch.recursiveFindHit / 大量 calculateBounds)，
 * 这笔开销一直在跑、却没人真正需要。
 *
 * 【本插件】
 * 启动时 removeEvents() 一次，彻底停掉 PIXI 交互的指针监听 —— 那条命中检测整条不再跑，
 * 零每帧成本。RM 的 TouchInput / 键盘绑定(含热键栏 R 键)完全不受影响。
 *
 * 【需要临时开启时(例如开 Hotbar Creator 编辑器调位置)】
 *   控制台执行： ShiroinPixiGate.set(true)   // 重新启用 PIXI 交互
 *   用完关掉：   ShiroinPixiGate.set(false)
 * 这只是开发期便利；出货版保持默认关闭即可。
 *
 * 【前提】
 * 若以后新增「依赖 PIXI 原生交互、且要在游玩中响应鼠标」的 UI，需要在它生效时
 * ShiroinPixiGate.set(true)，否则它点不动。目前没有这样的需求。
 */
(function(){
	"use strict";

	const API = window.ShiroinPixiGate = {
		enabled: null   // 当前 PIXI 交互是否启用(null=未初始化/未取到管理器)
	};

	function manager(){
		const app = Graphics._app;
		const r = app && app.renderer;
		return (r && r.plugins) ? r.plugins.interaction : null;
	}

	// 手动开/关 PIXI 原生交互；只在状态变化时真正 add/removeEvents
	API.set = function(on){
		const m = manager();
		if (!m) return false;
		on = !!on;
		if (on && API.enabled !== true) {
			if (typeof m.addEvents === "function") m.addEvents();
			API.enabled = true;
		} else if (!on && API.enabled !== false) {
			if (typeof m.removeEvents === "function") m.removeEvents();
			API.enabled = false;
		}
		return true;
	};

	// 启动时关闭一次(此时渲染器/交互管理器已就绪)。PIXI 5 的 addEvents 只在创建时执行一次、
	//   不会自行重加，所以 removeEvents 一次即长期生效，无需每帧检查。
	const _Scene_Boot_start = Scene_Boot.prototype.start;
	Scene_Boot.prototype.start = function(){
		_Scene_Boot_start.call(this);
		API.set(false);
	};

})();
