//=============================================================================
// Shiroin_FilterAreaOpt.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc 给场景/spriteset 自带的色调·淡入淡出滤镜设置 filterArea，消除每帧 getBounds 整棵树的开销。
 * @author Shiroin
 *
 * @help
 * 【问题】
 * MZ 的 Scene_Base 给「整个场景」挂了一个 ColorFilter(淡入淡出/亮度)，
 * Spriteset_Base 给 _baseSprite 挂了一个 ColorFilter(屏幕色调)——两者引擎都没设
 * filterArea。于是 PIXI 的 FilterSystem 每帧都要对这两个大容器 getBounds(递归计算
 * 全部子节点的包围盒)，即使当前没有淡入、色调为 0、滤镜实际不可见时也照跑。
 * 这就是性能 profile 里 Container.calculateBounds / Sprite._calculateBounds 的大头。
 *
 * 【修法】
 * 这两个滤镜都覆盖整屏，所以直接把 filterArea 设成「全屏矩形」即可：PIXI 用这个固定
 * 区域来定位滤镜，彻底跳过 getBounds。视觉效果完全不变(淡入/色调照常覆盖整屏)。
 * 对所有场景(地图/战斗/菜单/标题)都生效。
 *
 * 【范围】
 * 只处理这两个引擎自带的「整屏滤镜」。单个精灵的色调滤镜(getBounds 很廉价)不在此列。
 * 放在插件列表较靠后即可(只在场景/spriteset 创建时各设一次 filterArea，零每帧开销)。
 */
(function(){
	"use strict";

	function screenFilterRect(){
		const m = 20;   // 余量，兼顾滤镜可能的 padding；与本工程其它 filterArea 习惯一致
		return new Rectangle(-m, -m, Graphics.width + m * 2, Graphics.height + m * 2);
	}

	// 场景级 ColorFilter(淡入淡出/亮度)
	const _Scene_Base_createColorFilter = Scene_Base.prototype.createColorFilter;
	Scene_Base.prototype.createColorFilter = function(){
		_Scene_Base_createColorFilter.call(this);
		this.filterArea = screenFilterRect();
	};

	// spriteset 的 _baseSprite ColorFilter(屏幕色调)
	const _Spriteset_Base_createBaseFilters = Spriteset_Base.prototype.createBaseFilters;
	Spriteset_Base.prototype.createBaseFilters = function(){
		_Spriteset_Base_createBaseFilters.call(this);
		if (this._baseSprite) {
			this._baseSprite.filterArea = screenFilterRect();
		}
	};

})();
