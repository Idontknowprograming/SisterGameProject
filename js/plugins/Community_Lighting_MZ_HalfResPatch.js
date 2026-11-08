//=============================================================================
// Community_Lighting_MZ_HalfResPatch.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v1.0] Community_Lighting_MZ 半分辨率遮罩补丁（降低光照 CPU 绘制 / 纹理上传开销）
 * @author patch by Claude
 *
 * @param Mask Resolution Scale
 * @type number
 * @decimals 2
 * @min 0.1
 * @max 1
 * @desc 光照遮罩的渲染分辨率比例。0.5 = 半分辨率（像素填充量降为 1/4）。越低越省、越糊。1 = 不缩分辨率。
 * @default 0.50
 *
 * @param Mask Update Interval
 * @type number
 * @min 1
 * @max 6
 * @desc 每隔几帧重绘一次光罩。1=每帧(原版)。2=每2帧(整块 _updateMask 开销减半,光照变化慢几乎看不出)。越大越省、移动时光晕拖影越明显。
 * @default 2
 *
 * @help
 * =============================================================================
 * 作用
 * =============================================================================
 * Community_Lighting_MZ 的灯光遮罩是用 canvas 2D（CPU）逐像素绘制径向渐变，
 * 再整张上传为纹理。遮罩越大、光源越多，CPU 与上传压力越大。
 *
 * 本补丁把遮罩位图按比例缩小绘制，再用 sprite 放大回原尺寸：
 *   - 黑底填充、逐光渐变、纹理上传 三项的像素量都降为 SCALE^2
 *     （SCALE=0.5 → 1/4）。
 *   - 代价：灯光边缘略微模糊（光本身是软渐变，通常看不太出来）。
 *
 * 这正是从 MV 版 TerraxLighting 沿用过来的优化思路；在 MZ 原生版上实现更干净，
 * 不再需要写死 zoom 倍率或手动像素修正。
 *
 * 【为什么光半分辨率还不够】
 * 半分辨率只把「每次重绘的像素量」降为 SCALE^2，但 CL_MZ 的 _updateMask 每帧还要做一堆
 * 与分辨率无关的「逻辑重活」：把所有光精灵删了再重建、fillRect 整张黑底、遍历所有光源
 * 逐个算坐标 + 画径向渐变、外加每帧 $gameMap.events().length 检查。光照变化很慢，根本不
 * 需要每帧重算——所以本补丁再加一个 Mask Update Interval：每隔 N 帧才真正重绘一次，跳过的
 * 帧沿用上一帧的光罩。N=2 时整块 _updateMask 成本直接减半，视觉几乎无差。
 *   代价：移动很快时，光晕中心会比角色慢 ~ (N-1) 帧；N=2 基本看不出，N≥3 急速移动时可能
 *   见到轻微拖影。另外 tint 渐变 / 颜色循环也按 N 倍速推进（变慢），在意时把 N 调回 1。
 *
 * =============================================================================
 * 安装
 * =============================================================================
 * 放在 Community_Lighting_MZ 的【下面】（后加载）。
 * 不改动 CL_MZ 本体，CL_MZ 升级后本补丁仍然可用（除非它大改光罩类结构）。
 *
 * =============================================================================
 * 原理细节（便于你以后维护）
 * =============================================================================
 * - CL_MZ 的 Lightmask 是其闭包内的私有类，外部按名字取不到。本补丁通过
 *   全局的 Spriteset_Map.prototype.createLightmask 拿到实例后，对其原型
 *   （Object.getPrototypeOf 实例）打补丁，覆盖 _createBitmap / _updateMask /
 *   _addSprite 三个方法。
 * - _createBitmap：把位图建成 (W*SCALE)x(H*SCALE)，并对其 2D context 施加
 *   setTransform(SCALE,...)。CL_MZ 所有绘制坐标仍用原始全尺寸坐标，经 context
 *   变换自动压缩进小位图；黑底 fillRect(0,0,W,H) 在变换下恰好铺满小位图。
 * - _addSprite：仅对带 _clHalfRes 标记的位图，把对应 sprite 放大 1/SCALE。
 *   半尺寸位图 × (1/SCALE) 放大 = 与原全尺寸位图占据完全相同的局部矩形，
 *   因此位置 / 对齐 / 覆盖范围与原版一致（含对地图镜头缩放的继承），只是分辨率减半。
 * - CL_MZ 的绘制方法均为 save()/restore() 包裹，不重置 context 变换，
 *   故 setTransform 在跨调用间保持有效（每帧仍重新断言一次以防万一）。
 * - 战斗用的是另一个类 BattleLightmask（仅一层纯色 tint，开销极小），本补丁不动它。
 * =============================================================================
 */

(() => {
    "use strict";

    // ---- 读取参数 ----
    var _p = PluginManager.parameters("Community_Lighting_MZ_HalfResPatch");
    var SCALE = Number(_p["Mask Resolution Scale"]);
    if (!isFinite(SCALE) || SCALE <= 0) { SCALE = 0.5; }
    if (SCALE > 1) { SCALE = 1; }

    // 每隔几帧重绘一次光罩。半分辨率只缩「每次重绘的像素量」，
    // 而 _updateMask 每帧还要跑：删建精灵 + fillRect 全屏 + 逐光源渐变循环 + events 检查。
    // 这些「每帧逻辑」与分辨率无关，只有降频能成比例砍掉。
    var INTERVAL = Math.floor(Number(_p["Mask Update Interval"]));
    if (!isFinite(INTERVAL) || INTERVAL < 1) { INTERVAL = 2; }
    if (INTERVAL > 6) { INTERVAL = 6; }

    // ---- 依赖检查 ----
    if (typeof Imported === "undefined" || !Imported["Community_Lighting_MZ"]) {
        console.warn("[CL HalfRes] 未检测到 Community_Lighting_MZ，补丁未启用。");
        return;
    }
    if (SCALE === 1 && INTERVAL === 1) {
        // 既不缩分辨率也不降频 = 完全等于原版，省去一切包装
        return;
    }
    if (typeof Spriteset_Map === "undefined" || !Spriteset_Map.prototype.createLightmask) {
        console.warn("[CL HalfRes] 未找到 Spriteset_Map.createLightmask，补丁未启用。");
        return;
    }

    // ---- 从 CL_MZ 的全局参数对象取尺寸（闭包内的同名常量取不到，这里等价重算） ----
    function clParams() {
        return (typeof Community === "object" && Community.Lighting && Community.Lighting.parameters) || {};
    }
    function maskW() {
        var clp = clParams();
        var maxX = Number(clp["Screensize X"]) || 816;
        var pad  = Number(clp["Lightmask Padding"]) || 0;
        return maxX + pad;
    }
    function maskH() {
        var clp = clParams();
        return Number(clp["Screensize Y"]) || 624;
    }

    var protoPatched = false;

    function patchLightmaskProto(proto) {
        if (!proto || proto._clHalfResPatched) { return; }
        proto._clHalfResPatched = true;

        var _createBitmap = proto._createBitmap;
        var _updateMask   = proto._updateMask;
        var _addSprite    = proto._addSprite;

        // 半尺寸位图 + 施加 context 缩放变换
        proto._createBitmap = function () {
            var w = Math.max(1, Math.ceil(maskW() * SCALE));
            var h = Math.max(1, Math.ceil(maskH() * SCALE));
            this._maskBitmap = new Bitmap(w, h);
            this._maskBitmap._clHalfRes = true;
            var ctx = this._maskBitmap._context;
            if (ctx && ctx.setTransform) {
                ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
            }
        };

        // 每帧：先做降频判定，再确保位图是半尺寸的并重新断言变换，最后走原逻辑
        proto._updateMask = function () {
            var ready = this._maskBitmap && this._maskBitmap._clHalfRes;

            // ★降频：非重绘帧直接 return，沿用上一帧已画好的光罩（mask sprite 仍是显示树
            //   子节点，照常渲染）。这样删建精灵 / fillRect / 逐光渐变 / events 检查整套
            //   每帧逻辑都跳过，整块 _updateMask 成本按 1/INTERVAL 下降。
            //   首帧位图尚是全尺寸(ready=false)，必跑一次以重建为半尺寸，不会被跳过。
            this._clFrame = (this._clFrame || 0) + 1;
            if (ready && (this._clFrame % INTERVAL) !== 0) {
                return;
            }

            if (!ready) {
                this._createBitmap();   // 替换掉构造时创建的全尺寸位图
            } else {
                var ctx = this._maskBitmap._context;
                if (ctx && ctx.setTransform) {
                    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
                }
            }
            _updateMask.call(this);
        };

        // 半尺寸位图对应的 sprite 放大回原尺寸（仅处理带标记者，避免误伤其它位图）
        proto._addSprite = function (x1, y1, selectedbitmap) {
            _addSprite.call(this, x1, y1, selectedbitmap);
            if (selectedbitmap && selectedbitmap._clHalfRes && this._sprites && this._sprites.length) {
                var sprite = this._sprites[this._sprites.length - 1];
                if (sprite) {
                    sprite.scale.x = 1 / SCALE;
                    sprite.scale.y = 1 / SCALE;
                }
            }
        };

        console.log("[CL HalfRes] 已对 Lightmask 打补丁，SCALE = " + SCALE + "，重绘间隔 = 每 " + INTERVAL + " 帧");
    }

    // createLightmask 是全局方法：在它创建出 Lightmask 实例后，拿实例原型打补丁
    var _createLightmask = Spriteset_Map.prototype.createLightmask;
    Spriteset_Map.prototype.createLightmask = function () {
        _createLightmask.call(this);
        if (!protoPatched && this._lightmask) {
            patchLightmaskProto(Object.getPrototypeOf(this._lightmask));
            protoPatched = true;
        }
        // 首个实例在构造时已用全尺寸 _createBitmap 建好；这里立即用补丁版重建为半尺寸。
        // （后续地图的新实例会直接走补丁版构造，无需重建。）
        if (this._lightmask && typeof this._lightmask._createBitmap === "function") {
            this._lightmask._createBitmap();
        }
    };

})();
