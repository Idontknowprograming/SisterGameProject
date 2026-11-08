//=============================================================================
// Shiroin_MinimapPerf.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc GBRO 小地图性能补丁：①图标关掉无谓触摸命中检测；②小地图隐藏时跳过图标 update；③超出小地图范围的图标跳过位置/朝向刷新；④构建/最小化期不白建可见瓦片。
 * @author Shiroin
 * @base GBRO_EtrianMinimap
 * @orderAfter GBRO_EtrianMinimap
 *
 * @help
 * 针对 GBRO_EtrianMinimap 的两处每帧浪费，各对应一种使用态：
 *
 * ── ① 显示态：关掉图标的触摸命中检测（本项目最常见，小地图默认显示）──
 * 每个 Sprite_EtrianMinimapIcon 继承 Sprite_Clickable，默认 isClickEnabled()=worldVisible。
 * 小地图显示时，每个图标每帧都会跑 processTouch → isBeingTouched()：
 *   new Point() + worldTransform.applyInverse()（矩阵求逆）+ hitTest()（new Rectangle()+contains）。
 * 但 Sprite_EtrianMinimapIcon 没有覆盖任何 onClick/onPress/onMouseEnter —— 命中了也只调到空函数。
 * （tooltip/悬停在 Sprite_EtrianMinimapSlate 上，是画图标记块，与角色图标无关。）
 * 于是这是「每图标每帧一次带内存分配的命中检测，结果无人消费」的纯浪费 + GC 压力。
 *   → 小地图态令图标 isClickEnabled=false，processTouch 走空分支(不命中检测/不分配)。
 *   ※ 大地图(maximize，已暂停)保留原生可点击，给「点击标记/图标触发公共事件」的预设功能留口子
 *     (标记 Sprite_EtrianMinimapSlate 与本补丁无关、不受影响；图标的口子是为将来扩展留的)。
 *
 * ── ② 隐藏态：小地图隐藏(或非激活缩放层)时，整条跳过图标 update ──
 * hideMinimap() 只把容器 visible=false（只停渲染不停 update），于是隐藏时每个图标仍每帧全跑
 * （processTouch + updateBitmap + updateVisibility 距离计算 + updatePosition + updateRotation）。
 *   → 在图标 update 顶部判断「父链是否可见」：用 this.parent.worldVisible（看祖先链：缩放容器→
 *     _minimap→…，不含图标自身），整体隐藏或非激活缩放层时直接 return。
 *   ※ 必须用「父节点」的 worldVisible 而非图标自身 visible：updateVisibility 会按距离/是否已探索
 *     设【图标自身】visible，若用自身当门，被距离隐藏的图标会再也不 update、永远卡住。
 *
 * ── ④ 切图态：构建期/最小化时不白建可见瓦片 ──
 * createContainer 每建一个缩放层都调一次 updateVisibleTiles，但它操作的是 curContainer()
 * （当前缩放层）而非正在建的层 —— 于是每次切图都给 0.33 倍层白建一整批可见瓦片
 * （60×60 视口范围，大地牢图上是上千个 Sprite + 上千张 canvas 的一帧分配尖峰，
 * 而小地图此时还默认隐藏）。minimize() 也会在 DotMovePatch 合成地板生成之前，经
 * changeZoom→centerOnPlayer 给 min 缩放层白建一批（随后整层被地板遮掉，visible=false）。
 *   → 两处都用同一标志位压掉。瓦片推迟到玩家第一次 maximize 时补建：maximizeMinimap
 *     在 maximize() 后显式调 centerOnPlayer()，不会出现空白大地图；缩放/拖动路径
 *     (changeZoom/updateContentsTouch)也都会正常触发 updateVisibleTiles。
 *   ※ minimize 的压制仅在 DotMovePatch 地板路径(_drillEnsureFloor)存在时生效 ——
 *     没有合成地板时最小化 HUD 靠瓦片显示，不能压。
 *
 * 放在 GBRO_EtrianMinimap 之后加载。本插件取代旧的 Shiroin_MinimapHiddenGate.js（后者只有②）。
 */
(function(){
	"use strict";

	if (typeof Sprite_EtrianMinimapIcon === "undefined") { return; }
	const proto = Sprite_EtrianMinimapIcon.prototype;

	// ① 小地图(显示/最小化，游戏进行中)纯展示、图标无点击需求 → 关掉点击，processTouch 走空分支，
	//    省掉每帧命中检测与分配。大地图(maximize，已暂停游戏)保留原生可点击行为，给「点击标记/图标
	//    触发公共事件」这一预设功能留口子(目前图标无 handler 仍是 no-op，但不堵死将来扩展；且大地图
	//    已暂停，那点命中检测开销无所谓)。_maximized 挂在 scene._minimap 上。
	proto.isClickEnabled = function(){
		const mm = SceneManager._scene && SceneManager._scene._minimap;
		if (mm && mm._maximized) {
			return Sprite_Clickable.prototype.isClickEnabled.call(this);   // 大地图：还原原生(worldVisible)
		}
		return false;   // 小地图：关掉命中检测
	};

	// ② 小地图隐藏 / 非激活缩放层时，整条跳过图标 update。
	if (proto.update) {
		const _update = proto.update;
		proto.update = function(){
			const p = this.parent;
			// 父链任一祖先隐藏 → 跳过；用 parent.worldVisible 排除图标自身 visible，
			// 避免按距离隐藏的图标被卡死(它需要继续 update 才能在玩家走近时重新显现)。
			if (p && p.worldVisible === false) { return; }
			_update.call(this);
		};
	}

	// ③ 不显示在小地图上的图标(超 evDistanceReq 距离/未揭示，updateVisibility 已置 visible=false)，
	//    跳过其每帧 updatePosition / updateRotation —— 它们不渲染，算位置/朝向也没用。
	//    这就是 OffscreenSpriteCull「不刷新没显示的东西」的同款思路；对小地图图标而言「没显示」=
	//    不在小地图可视范围内(由 updateVisibility 判定)，而非主画面屏幕——后者会冻结"屏外但在小地图
	//    范围内"的敌人图标，违背小地图本意。
	//    无残帧：update 内顺序是 updateVisibility → updatePosition → updateRotation，进入范围那帧
	//    updateVisibility 先置 visible=true，随后 updatePosition 立即以新位置刷新。
	//    渲染侧(updateTransform/render) PIXI 本就跳过 visible=false 子节点，无需另处理。
	if (proto.updatePosition) {
		const _updatePosition = proto.updatePosition;
		proto.updatePosition = function(){
			if (!this.visible) { return; }
			_updatePosition.call(this);
		};
	}
	if (proto.updateRotation) {
		const _updateRotation = proto.updateRotation;
		proto.updateRotation = function(){
			if (!this.visible) { return; }
			_updateRotation.call(this);
		};
	}

})();

// ④ 构建期/最小化时不白建可见瓦片（详见 @help ④）
(function(){
	"use strict";

	if (typeof Sprite_EtrianMinimapContainer === "undefined") { return; }

	const proto = Sprite_EtrianMinimapContainer.prototype;
	if (!proto.createContainers || !proto.minimize || !proto.updateVisibleTiles) { return; }

	const _createContainers = proto.createContainers;
	const _minimize = proto.minimize;
	const _updateVisibleTiles = proto.updateVisibleTiles;

	// 构建期：createContainer 里的 updateVisibleTiles 操作的是 curContainer 而非在建层，纯白建 → 压掉
	proto.createContainers = function(){
		const prev = this._shiroinSuppressTileBuild;
		this._shiroinSuppressTileBuild = true;
		try {
			return _createContainers.apply(this, arguments);
		} finally {
			this._shiroinSuppressTileBuild = prev;
		}
	};

	// 最小化：合成地板即将遮掉瓦片层，changeZoom→centerOnPlayer 那批瓦片白建 → 压掉。
	// 仅当 DotMovePatch 地板路径存在时才压（没有地板时最小化 HUD 靠瓦片显示）。
	proto.minimize = function(){
		if (typeof this._drillEnsureFloor !== "function") {
			return _minimize.apply(this, arguments);
		}
		const prev = this._shiroinSuppressTileBuild;
		this._shiroinSuppressTileBuild = true;
		try {
			return _minimize.apply(this, arguments);
		} finally {
			this._shiroinSuppressTileBuild = prev;
		}
	};

	proto.updateVisibleTiles = function(){
		if (this._shiroinSuppressTileBuild) { return; }
		return _updateVisibleTiles.apply(this, arguments);
	};
})();
