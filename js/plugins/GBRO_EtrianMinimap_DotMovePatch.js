//=============================================================================
// GBRO_EtrianMinimap_DotMovePatch.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v2.0] GBRO Etrian Minimap 适配补丁：DotMove逐帧揭示 + 脚本开关API + 按可通行性上色 + 修复图标移动闪烁
 * @author patch by Claude
 *
 * @param colorByPassability
 * @text 按可通行性上色
 * @type boolean
 * @on 开启
 * @off 关闭
 * @desc 已揭示且未被 regionColorMap 指定颜色的图块，按“可走/不可走”自动着不同色。
 * @default true
 *
 * @param fogColor
 * @text 未揭示(雾)颜色
 * @desc 未探索图块的颜色。
 * @default #475c66
 *
 * @param floorColor
 * @text 可通行(地面)颜色
 * @desc 已揭示·可通行图块的颜色。
 * @default #a9bffc
 *
 * @param wallColor
 * @text 不可通行(墙)颜色
 * @desc 已揭示·不可通行图块的颜色。
 * @default #33414a
 *
 * @help
 * =============================================================================
 * 放在 GBRO_EtrianMinimap 的【下面】。对原插件做四类适配/修复：
 *
 * 1) 适配 DotMove 的自动揭示：每帧按玩家当前整数图块揭示（原插件挂在
 *    moveStraight 上，DotMove 走路不走该方法 → 不点亮）。含旧存档状态兜底。
 *
 * 2) 关掉自带 M 键，改用脚本：
 *      GBRO.EtrianMinimap.maximize();  // 打开大地图
 *      GBRO.EtrianMinimap.minimize();  // 收起小图
 *      GBRO.EtrianMinimap.toggle();    // 切换
 *    （原 showMinimap()/hideMinimap() 控制显隐，不变。）
 *
 * 3) 按可通行性/区域上色：原插件只按 regionId 上色、且 region 0 是“雾色”，
 *    整图都是 region 0 时已揭示与未揭示同色 → 看不出变化。本补丁让已揭示图块
 *    按 可走=地面色 / 不可走=墙色 自动上色（regionColorMap 里显式配的非0区域仍优先）。
 *
 * 4) 修复图标移动时闪烁：原插件 bug（纯演示工程也复现）。图标坐标在 MZ 的精灵
 *    更新阶段计算，比 $gamePlayer.update 里 centerOnPlayer 的镜头平移晚一帧，
 *    过格时图标偏一格再弹回 → 闪。本补丁让图标位置与镜头平移同相位刷新。
 *    顺带：查格坐标取整、玩家图标恒显，杜绝过格瞬间的显隐抖动。
 *
 * 还包含一处无副作用的性能优化：最小化(不可点击)时跳过每块图块的鼠标命中测试。
 * =============================================================================
 */

(() => {
	"use strict";

	const PARAMS = PluginManager.parameters("GBRO_EtrianMinimap_DotMovePatch");
	const COLOR_BY_PASS = String(PARAMS.colorByPassability || "true") === "true";
	const FOG_COLOR = String(PARAMS.fogColor || "#475c66");
	const FLOOR_COLOR = String(PARAMS.floorColor || "#a9bffc");
	const WALL_COLOR = String(PARAMS.wallColor || "#33414a");

	if (typeof GBRO === "undefined" || !GBRO.EtrianMinimap) {
		console.warn("[EtrianMinimap Patch] 未找到 GBRO.EtrianMinimap，补丁未生效（请放在该插件之后）。");
		return;
	}

	//=========================================================================
	// 1) 逐帧·按当前图块揭示（适配 DotMove）+ 旧存档状态兜底
	//=========================================================================
	function ensureRevealState(player) {
		if (player._isAutoRevealing == null) player._isAutoRevealing = GBRO.EtrianMinimap.autoReveal;
		if (player._isAutoFilling == null) player._isAutoFilling = GBRO.EtrianMinimap.autoReveal;
		if (player._tileRevealMode == null) player._tileRevealMode = GBRO.EtrianMinimap.revealMode;
	}

	const _Game_Player_update = Game_Player.prototype.update;
	Game_Player.prototype.update = function () {
		_Game_Player_update.call(this, ...arguments);

		ensureRevealState(this);
		if (!this._isAutoRevealing) return;
		if (!(SceneManager._scene instanceof Scene_Map)) return;
		if (typeof this.updateTileReveal !== "function") return;

		const d = this.direction();
		if (this._svRevealX !== this.x || this._svRevealY !== this.y || this._svRevealDir !== d) {
			this._svRevealX = this.x;
			this._svRevealY = this.y;
			this._svRevealDir = d;
			this.updateTileReveal();
		}
	};

	//=========================================================================
	// 2) 关掉自带按键 + 脚本开关 API
	//=========================================================================
	if (Scene_Map.prototype.onMinimapKeyPressed) {
		Scene_Map.prototype.onMinimapKeyPressed = function () { /* 自带M键禁用，改用脚本API */ };
	}

	function curScene() { return SceneManager._scene; }
	function mapReady(s) { return s && (s instanceof Scene_Map) && s._minimap && s._mToolWindow; }

	GBRO.EtrianMinimap.maximize = function () {
		const s = curScene();
		if (mapReady(s) && s._minimap.visible && !s._minimap._maximized) { s.maximizeMinimap(); SoundManager.playOk(); }
	};
	GBRO.EtrianMinimap.minimize = function () {
		const s = curScene();
		if (mapReady(s) && s._minimap._maximized) { s.minimizeMinimap(); SoundManager.playOk(); }
	};
	GBRO.EtrianMinimap.toggle = function () {
		const s = curScene();
		if (!mapReady(s) || !s._minimap.visible) return;
		if (s._minimap._maximized) GBRO.EtrianMinimap.minimize();
		else GBRO.EtrianMinimap.maximize();
	};

	//=========================================================================
	// 3) 性能优化：最小化(非交互)时跳过每块图块的点击命中测试（纯浪费，无画面影响）
	//=========================================================================
	if (typeof Sprite_EtrianMinimapTile !== "undefined") {
		const _tile_update = Sprite_EtrianMinimapTile.prototype.update;
		Sprite_EtrianMinimapTile.prototype.update = function () {
			if (this._container && !this._container._maximized) {
				if (typeof this.updateTile === "function") this.updateTile();   // 仅做揭示刷新
			} else {
				_tile_update.call(this);
			}
		};
	}

	//=========================================================================
	// 4) 按可通行性 / 区域上色（让“已揭示”与“雾”可区分）
	//=========================================================================
	if (typeof Sprite_EtrianMinimapTile !== "undefined") {

		function isTilePassable(x, y) {
			return [2, 4, 6, 8].some(d => $gameMap.isPassable(x, y, d));
		}

		Sprite_EtrianMinimapTile.prototype.refreshAsUnrevealedTile = function () {
			this.bitmap.clear();
			this.bitmap.fillAll(FOG_COLOR);
			this.bitmap.strokeRect(1, 1, this._ts - 2, this._ts - 2, "white");
		};

		Sprite_EtrianMinimapTile.prototype.refreshAsRevealedTile = function (tile) {
			this.bitmap.clear();
			const regionId = $gameMap.regionId(tile.x, tile.y);
			let color = (regionId !== 0) ? GBRO.EtrianMinimap.regionColorMap[regionId] : null;
			if (!color) {
				color = COLOR_BY_PASS ? (isTilePassable(tile.x, tile.y) ? FLOOR_COLOR : WALL_COLOR) : FLOOR_COLOR;
			}
			this.bitmap.fillAll(color);
			this.bitmap.strokeRect(1, 1, this._ts - 2, this._ts - 2, "white");
		};
	}

	//=========================================================================
	// 5) 图标显隐稳健化：查格取整(对齐整数揭示数据) + 玩家图标恒显
	//=========================================================================
	if (typeof Sprite_EtrianMinimapIcon !== "undefined") {
		Sprite_EtrianMinimapIcon.prototype.tileData = function () {
			if (!this._character) return null;
			return $gameMap.getTileData(Math.floor(this._character.x), Math.floor(this._character.y));
		};

		const _Icon_updateVisibility = Sprite_EtrianMinimapIcon.prototype.updateVisibility;
		Sprite_EtrianMinimapIcon.prototype.updateVisibility = function () {
			_Icon_updateVisibility.call(this);
			if (this._character === $gamePlayer &&
				this._character.minimapIcon() != null &&
				this._character.isVisibleInMinimap()) {
				this.visible = true;
			}
		};
	}

	//=========================================================================
	// 6) 修复图标移动闪烁（核心修复）
	//    MZ“先精灵后游戏对象”：图标 updatePosition 用上一帧旧坐标，而 centerOnPlayer
	//    （$gamePlayer.update 内、移动后）按新坐标平移镜头 → 过格那帧图标偏一格再弹回。
	//    修法：在 centerOnPlayer(渲染前最后一次、与平移同相位)里一并刷新所有图标位置/朝向。
	//=========================================================================
	if (typeof Sprite_EtrianMinimapContainer !== "undefined") {
		const _centerOnPlayer = Sprite_EtrianMinimapContainer.prototype.centerOnPlayer;
		Sprite_EtrianMinimapContainer.prototype.centerOnPlayer = function () {
			_centerOnPlayer.call(this);
			Object.values(this._containers || {}).forEach(c => {
				if (!c || !c.visible) return;
				if (!c._iconLayer) return;
				c._iconLayer.children.forEach(ic => {
					if (!ic || ic._character === undefined) return;
					if (typeof ic.updatePosition === "function") ic.updatePosition();
					if (typeof ic.updateRotation === "function") ic.updateRotation();
				});
			});
		};
	}

	//=========================================================================
	// 7) 兼容 QJ-SpawnEventMZ：为动态生成的事件补建小地图图标
	//    原插件只在创建小地图时(createIconLayer)按当时的 $gameMap.events() 建一次图标，
	//    之后 QJ 运行时复制/生成的事件不在其中 → 没有图标精灵(即便其注释 Minimap Icon
	//    已被读到、_minimapIcon 已设上)。本节在事件数量变化时对账：给缺图标的事件补建、
	//    给已消失/erased 的事件清掉图标。
	//=========================================================================
	if (typeof Sprite_EtrianMinimapContainer !== "undefined" && typeof Sprite_EtrianMinimapIcon !== "undefined") {

		Sprite_EtrianMinimapContainer.prototype._svReconcileIcons = function () {
			if (typeof $gameMap !== "object" || !$gameMap) return;
			const events = $gameMap.events();
			if (events.length === this._svEventLen) return;   // 仅在事件数变化时处理
			this._svEventLen = events.length;

			const evSet = new Set(events);
			Object.values(this._containers || {}).forEach(c => {
				const layer = c._iconLayer;
				if (!layer) return;

				// 清理：事件已消失/erased 的图标（玩家/同伴图标非 Game_Event，不动）
				for (let i = layer.children.length - 1; i >= 0; i--) {
					const ch = layer.children[i] && layer.children[i]._character;
					if (ch instanceof Game_Event && (!evSet.has(ch) || ch._erased)) {
						layer.removeChild(layer.children[i]);
					}
				}

				// 补建：还没有图标的事件
				const have = new Set(layer.children.map(ic => ic._character));
				events.forEach(ev => {
					if (!ev._erased && !have.has(ev)) {
						layer.addChild(new Sprite_EtrianMinimapIcon(ev, c._ts, this));
					}
				});
			});
		};

		const _Container_update_recon = Sprite_EtrianMinimapContainer.prototype.update;
		Sprite_EtrianMinimapContainer.prototype.update = function () {
			_Container_update_recon.call(this);
			this._svReconcileIcons();
		};
	}

	//=========================================================================
	// 8) 修复“在人物下方”等事件无法触发：恢复 DotMove 的 startMapEvent
	//    小地图插件直接替换了 Game_Player.startMapEvent(网格版)，且加载在 DotMove 之后，
	//    把 DotMove 基于像素碰撞框的触发逻辑整个覆盖掉 → 像素移动下“玩家接触”类事件
	//    (尤其在人物下方)失效。本节(加载最后)用 DotMove 的实现覆盖回去。
	//    注：实现取自 DotMoveSystem v2.2.4；若日后升级 DotMove 且其 startMapEvent 改动，
	//        需同步更新此处。仅在检测到 DotMove 时才接管，否则保留原(网格)版。
	//=========================================================================
	if (typeof Game_Player.prototype.dotMoveTempData === "function") {
		Game_Player.prototype.startMapEvent = function (x, y, triggers, normal) {
			if ($gameMap.isEventRunning()) return;
			const tempData = this.dotMoveTempData();
			const hasDecideTrigger = triggers.includes(0);
			for (const result of this.mover().checkHitCharacters(x, y, this._direction, Game_Event)) {
				const event = result.targetObject;
				const eventId = event.eventId();
				if (!hasDecideTrigger && tempData.collideTriggerEventIds.includes(eventId)) continue;
				if (result.collisionLengthX() >= event.widthArea() && result.collisionLengthY() >= event.heightArea()) {
					if (event.isTriggerIn(triggers) && event.isNormalPriority() === normal) {
						if (!hasDecideTrigger && !tempData.collideTriggerEventIds.includes(eventId)) {
							tempData.collideTriggerEventIds.push(eventId);
						}
						event.start();
					}
				}
			}
		};
	}

	//=========================================================================
	// 9) 允许“小数缩放等级”，让超大地图能整屏放进小地图框
	//    原插件把 zoomLevels 向下取整(Math.floor) → 最小只能 1×(每格=defaultTileSize)，
	//    大地图放不下、只能拖。这里改为不取整：在 GBRO_EtrianMinimap 的 zoomLevels 参数里
	//    可填小数(如 0.4)。缩到足够小那一级时地图比视口小，插件会自动把整张图居中显示。
	//    建议最小级 ≈ (视口可见格数) / (你最大地图的较大边)。
	//    视口可见格数 ≈ 遮罩边长(默认600) / defaultTileSize(默认30) = 20 格。
	//    例：最大地图 60 格 → 最小级 ≈ 20/60 ≈ 0.33 → zoomLevels 填 "0.33,1,2,3"。
	//    注意：新增缩放级会改变下标，记得同步检查 GBRO 的 minZoomIndex(最小化用第几级)。
	//=========================================================================
	(function () {
		try {
			const raw = PluginManager.parameters("GBRO_EtrianMinimap")["zoomLevels"];
			if (typeof raw === "string") {
				const dts = GBRO.EtrianMinimap.defaultTileSize || 30;
				const minZoom = 1 / dts;     // 保证每格 ts ≥ 1px
				const levels = raw.split(",")
					.map(s => Number(s))
					.filter(n => isFinite(n) && n > 0)
					.map(n => Math.max(minZoom, n));
				if (levels.length) GBRO.EtrianMinimap.zoomLevels = levels;
			}
		} catch (e) {
			console.warn("[EtrianMinimap Patch] zoomLevels 小数化失败，维持原值。", e);
		}
	})();

	//=========================================================================
	// 9) 性能(Stage2)：最小化用"单张合成地板图"替代 100~200 个瓦片精灵的渲染。
	//    update() 逻辑已门控，但 PIXI 每帧仍要给上百个瓦片精灵算 transform/批次/draw call
	//    （开关小地图相差 ~400ms 全在渲染管线）。本节：最小化时隐藏瓦片层(PIXI 跳过不可见
	//    子树渲染) + 显示一张整图合成地板(1 精灵/1 纹理/1 draw call)。大地图(已暂停)仍用瓦片
	//    精灵，放标记命中不受影响。合成图按本补丁同款配色(region / 可通行性 / 雾)。
	//=========================================================================
	if (typeof Sprite_EtrianMinimapContainer !== "undefined") {

		const MAX_FLOOR_DIM = 1536;   // 合成图单边像素上限(控显存)
		function isPassable(x, y) { return [2, 4, 6, 8].some(d => $gameMap.isPassable(x, y, d)); }
		function cellColorAt(x, y) {
			const rid = $gameMap.regionId(x, y);
			let color = (rid !== 0) ? GBRO.EtrianMinimap.regionColorMap[rid] : null;
			if (!color) color = COLOR_BY_PASS ? (isPassable(x, y) ? FLOOR_COLOR : WALL_COLOR) : FLOOR_COLOR;
			return color;
		}

		const C = Sprite_EtrianMinimapContainer.prototype;

		// 最小化时显示的那个 zoom 容器
		C._drillMinContainer = function () {
			if (!this._containers || !this._zoomLevels) return null;
			const z = this._zoomLevels[GBRO.EtrianMinimap.minZoomIndex];
			return this._containers[z];
		};

		// 懒构建合成地板(每张地图一次)
		C._drillEnsureFloor = function () {
			const c = this._drillMinContainer();
			if (!c || c._drillFloorSprite) return;
			if (typeof $gameMap !== "object" || !$gameMap) return;
			const mw = $gameMap.width(), mh = $gameMap.height();
			if (!mw || !mh) return;
			const cell = Math.max(4, Math.min(12, Math.floor(MAX_FLOOR_DIM / Math.max(mw, mh))));
			const bmp = new Bitmap(mw * cell, mh * cell);
			bmp.smooth = false;
			const spr = new Sprite(bmp);
			spr.scale.set(c._ts / cell);   // 占据与瓦片相同的容器坐标空间 (x*ts, y*ts)
			c.addChildAt(spr, 0);          // 放最底层(瓦片层/批注层之下)
			c._drillFloorCell = cell;
			c._drillFloorBitmap = bmp;
			c._drillFloorSprite = spr;
			this._drillRebuildFloor();
		};

		C._drillDrawFloorCell = function (c, x, y) {
			const bmp = c._drillFloorBitmap, cell = c._drillFloorCell;
			if (!bmp) return;
			const px = x * cell, py = y * cell;
			bmp.clearRect(px, py, cell, cell);
			bmp.fillRect(px, py, cell, cell, cellColorAt(x, y));
		};

		C._drillRebuildFloor = function () {
			const c = this._drillMinContainer();
			if (!c || !c._drillFloorBitmap) return;
			c._drillFloorBitmap.clear();
			c._drillFloorBitmap.fillAll(FOG_COLOR);
			const data = $gameMap.getMinimapData && $gameMap.getMinimapData();
			if (!data || !data.tiles) return;
			for (const xs in data.tiles) {
				const col = data.tiles[xs];
				for (const ys in col) {
					const t = col[ys];
					if (t && t.revealed && t.filled) this._drillDrawFloorCell(c, t.x, t.y);
				}
			}
		};

		// 最小化→显示合成地板 + 隐藏瓦片层；最大化→反之(恢复瓦片用于放标记命中)
		C._drillApplyFloorVisibility = function () {
			const c = this._drillMinContainer();
			if (!c) return;
			const showFloor = !this._maximized;
			if (c._drillFloorSprite) c._drillFloorSprite.visible = showFloor;
			if (c._tileLayer) c._tileLayer.visible = !showFloor;
		};

		const _minimize = C.minimize;
		C.minimize = function () {
			_minimize.call(this);
			this._drillEnsureFloor();
			this._drillApplyFloorVisibility();
		};
		const _maximize = C.maximize;
		C.maximize = function () {
			_maximize.call(this);
			this._drillApplyFloorVisibility();
		};

		// 揭示时增量补画(玩家周围 3×3 覆盖所有 revealMode)
		const _updateTileReveal = Game_Player.prototype.updateTileReveal;
		Game_Player.prototype.updateTileReveal = function () {
			_updateTileReveal.call(this);
			const mm = SceneManager._scene && SceneManager._scene._minimap;
			if (!mm || typeof mm._drillDrawFloorCell !== "function") return;
			const c = mm._drillMinContainer();
			if (!c || !c._drillFloorBitmap) return;
			const cx = Math.floor(this.x), cy = Math.floor(this.y);
			for (let dy = -1; dy <= 1; dy++) {
				for (let dx = -1; dx <= 1; dx++) {
					const tx = $gameMap.roundX(cx + dx), ty = $gameMap.roundY(cy + dy);
					const t = $gameMap.getTileData(tx, ty);
					if (t && t.revealed && t.filled) mm._drillDrawFloorCell(c, tx, ty);
				}
			}
		};

		// 全图揭示→整图重建
		const _revealAll = Game_Map.prototype.revealAllTiles;
		Game_Map.prototype.revealAllTiles = function () {
			_revealAll.apply(this, arguments);
			const mm = SceneManager._scene && SceneManager._scene._minimap;
			if (mm && typeof mm._drillRebuildFloor === "function") mm._drillRebuildFloor();
		};

		// 最小化(用合成地板)时，跳过可见瓦片重建——那些瓦片不渲染，重建纯属浪费/徒增 GC
		const _updateVisibleTiles = C.updateVisibleTiles;
		C.updateVisibleTiles = function () {
			if (!this._maximized) {
				const cur = this.curContainer && this.curContainer();
				if (cur && cur._drillFloorSprite) return;
			}
			_updateVisibleTiles.call(this);
		};
	}

})();
