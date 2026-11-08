//=============================================================================
// Community_Lighting_MZ_EffectOnEvent.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v1.0] CL_MZ 临时光效：脚本一行复刻 Terrax 的 effect_on_event（定时光爆）
 * @author patch by Claude
 *
 * @help
 * =============================================================================
 * 作用
 * =============================================================================
 * Community_Lighting_MZ 没有 Terrax 的 effect_on_event（即发即忘的定时光爆）。
 * 本补丁把临时光效直接画进 CL_MZ 自己的光照遮罩里（和 Terrax 当年的做法一致），
 * 看起来就是一束正常的 CL 灯光，并暴露成脚本函数，不用再排一串插件指令。
 *
 * 放在 Community_Lighting_MZ（及其半分辨率补丁）的【下面】。
 *
 * =============================================================================
 * 脚本调用（在事件指令「脚本」里直接写）
 * =============================================================================
 *   effectOnEvent(事件ID, 半径, "颜色", 持续帧数 [, 亮度0~1] [, 闪烁true/false]);
 *   effectOnXY(图块X, 图块Y, 半径, "颜色", 持续帧数 [, 亮度0~1] [, 闪烁]);
 *   this.effectOnThisEvent(半径, "颜色", 持续帧数 [, 亮度0~1] [, 闪烁]); // 当前事件
 *
 *   闪烁=true 时与 CL 的 "Fire" 灯一样火焰抖动（对应 Terrax 的 BIO），
 *   适合篝火/火把；不写或 false 为稳定光。
 *
 *   isCLLightingActive()  // 返回本地图 CL 光照遮罩当前是否激活（true/false）
 *
 * 例：复刻  effect_on_event 014 200 #ff1d1d 360
 *   effectOnEvent(14, 200, "#ff1d1d", 360);
 *
 * 例：在本事件上闪一下红光 1 秒
 *   this.effectOnThisEvent(200, "#ff1d1d", 60);
 *
 * - 持续帧数到点后自动消失，无需手动关闭。
 * - 可重复调用叠加（多束光会更亮）。
 * - 不写入存档（光效是瞬时的；存/读档过程中的残留光效会丢弃）。
 *
 * =============================================================================
 * 注意
 * =============================================================================
 * 1. 光效是“往黑暗里挖出亮处”，所以只在【该地图的 CL 光照处于开启状态】时可见。
 *    你把 "Light event required" 设成了 true：在【没有任何灯光事件】的地图上，
 *    CL 不会铺遮罩，这种地图上光效不显示（和 Terrax 在全亮地图上几乎看不出
 *    是同理）。需要它显示，就保证该图至少有一个灯光事件。
 * 2. 颜色用 "#rrggbb" 字符串。半径单位、坐标系与 CL 事件光一致。
 * 3. 不含 Terrax 的 GROW/SHRINK/FADE/BIO 关键字（恒定亮度 → 到点消失）。
 * =============================================================================
 */

(() => {
	"use strict";

	// 活动光效列表（运行时，不入存档）
	// { eventId:Number|null, tx, ty, radius, color, brightness, frames }
	const FX = [];

	//--- 脚本 API ---------------------------------------------------------------
	window.effectOnEvent = function (eventId, radius, color, frames, brightness, flicker) {
		FX.push({
			eventId: Number(eventId), tx: 0, ty: 0,
			radius: Number(radius) || 0,
			color: String(color || "#ffffff"),
			brightness: Math.max(0, Math.min(1, Number(brightness) || 0)),
			frames: Math.max(1, Math.floor(Number(frames) || 1)),
			flicker: !!flicker
		});
	};
	window.effectOnXY = function (tileX, tileY, radius, color, frames, brightness, flicker) {
		FX.push({
			eventId: null, tx: Number(tileX) || 0, ty: Number(tileY) || 0,
			radius: Number(radius) || 0,
			color: String(color || "#ffffff"),
			brightness: Math.max(0, Math.min(1, Number(brightness) || 0)),
			frames: Math.max(1, Math.floor(Number(frames) || 1)),
			flicker: !!flicker
		});
	};
	// 便捷：作用于“当前事件”（在事件脚本里 this 为解释器）
	Game_Interpreter.prototype.effectOnThisEvent = function (radius, color, frames, brightness, flicker) {
		window.effectOnEvent(this._eventId, radius, color, frames, brightness, flicker);
	};

	// CL 当前是否在本地图铺了光照遮罩（= 地图灯光激活）。
	// 等价于 CL 自己的最终判定：所有条件通过后才会向 _sprites 添加遮罩。
	window.isCLLightingActive = function () {
		const scn = SceneManager._scene;
		const lm = scn && scn._spriteset && scn._spriteset._lightmask;
		return !!(lm && lm._sprites && lm._sprites.length > 0);
	};

	//--- 切图时清空 -------------------------------------------------------------
	const _Game_Map_setup = Game_Map.prototype.setup;
	Game_Map.prototype.setup = function (mapId) {
		_Game_Map_setup.call(this, mapId);
		FX.length = 0;
	};

	//--- 计算光效屏幕坐标（与 CL 事件光一致） ----------------------------------
	function fxScreenPos(fx) {
		if (fx.eventId != null) {
			const ev = $gameMap.event(fx.eventId);
			if (!ev) return null;
			return {
				x: ev.screenX(),
				y: ev.screenY() - 24 + ev.shiftY()   // shift_lights_with_events 默认 false → 跟随跳跃偏移
			};
		}
		const tw = $gameMap.tileWidth(), th = $gameMap.tileHeight();
		return {
			x: $gameMap.adjustX(fx.tx) * tw + tw / 2,
			y: $gameMap.adjustY(fx.ty) * th + th / 2
		};
	}

	function drawFX(maskBitmap) {
		if (!maskBitmap || typeof maskBitmap.radialgradientFillRect !== "function") return;
		// ★关键：CL 画灯用 'lighter'(叠加)，而它在 _updateMask 末尾把合成模式还原成
		//   'source-over'。我们在那之后绘制，必须自己切回 'lighter'，否则光效会以
		//   'source-over' 覆盖底层光罩 → 把篝火那片的黑幕/其它光源涂掉、边缘黑块盖脏。
		const ctx = maskBitmap._context;
		const prevOp = ctx ? ctx.globalCompositeOperation : null;
		if (ctx) ctx.globalCompositeOperation = "lighter";
		for (const fx of FX) {
			const pos = fxScreenPos(fx);
			if (!pos) continue;
			// 与 CL 事件光相同的调用：r1=0, r2=半径, 内色, 外色#000, flicker, brightness, dir=0
			// flicker=true → 与 CL 的 "Fire" 灯一样火焰闪烁（对应 Terrax 的 BIO）
			maskBitmap.radialgradientFillRect(pos.x, pos.y, 0, fx.radius, fx.color, "#000000", !!fx.flicker, fx.brightness, 0);
		}
		if (ctx && prevOp !== null) ctx.globalCompositeOperation = prevOp;
	}

	function tickFX() {
		for (let i = FX.length - 1; i >= 0; i--) {
			if (--FX[i].frames <= 0) FX.splice(i, 1);
		}
	}

	//--- 挂到 CL 的 Lightmask（闭包私有类，经实例原型注入） --------------------
	if (typeof Spriteset_Map === "undefined" || !Spriteset_Map.prototype.createLightmask) {
		console.warn("[CL EffectOnEvent] 未找到 Community_Lighting_MZ 的 Lightmask，补丁未生效（请放在 CL_MZ 之后）。");
		return;
	}

	let protoPatched = false;
	function patchLightmaskProto(proto) {
		if (!proto || proto._clFxPatched) return;
		proto._clFxPatched = true;

		// 包 _addSprite 作为“本帧底层光罩确实重绘了”的信号。
		// CL 仅在通过全部条件、真正铺遮罩时才调用 _addSprite（见 CL _updateMask 末尾），
		// 半分辨率补丁的隔帧重绘在跳帧时不会走到这里 → 天然区分“重绘帧 / 跳帧”。
		const _addSprite = proto._addSprite;
		proto._addSprite = function () {
			this._clFxRedrew = true;
			return _addSprite.apply(this, arguments);
		};

		const _updateMask = proto._updateMask;
		proto._updateMask = function () {
			this._clFxRedrew = false;
			_updateMask.call(this);   // CL（可能再套半分辨率补丁）重绘底层光罩；重绘时会置 _clFxRedrew
			// 只在“底层这一帧确实重绘并清空过”时叠加一次光效：
			//  · 避免隔帧重绘下 FX 在未清空的底图上反复叠加（过亮/糊/看似没黑幕）
			//  · 与底层共用同一坐标变换（半分辨率 setTransform 已生效）→ 尺寸正确
			//  · _addSprite 被调用即代表本图灯光处于激活状态（等价旧的 _sprites 判定）
			if (this._clFxRedrew && FX.length > 0) {
				drawFX(this._maskBitmap);
				if (this._maskBitmap && this._maskBitmap._baseTexture) {
					this._maskBitmap._baseTexture.update();   // 确保把叠加内容上传
				}
			}
			tickFX();   // 每帧倒计时（即使没画也照常消耗，避免堆积）
		};
	}

	const _createLightmask = Spriteset_Map.prototype.createLightmask;
	Spriteset_Map.prototype.createLightmask = function () {
		_createLightmask.call(this);
		if (!protoPatched && this._lightmask) {
			patchLightmaskProto(Object.getPrototypeOf(this._lightmask));
			protoPatched = true;
		}
	};

})();
