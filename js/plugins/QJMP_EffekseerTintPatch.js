//=============================================================================
// QJMP_EffekseerTintPatch.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc 让 QJ-MapProjectileMZ 弹幕的 hue/tone/opacity 作用到 img:['A',...] 的 Effekseer 动画上。
 * @author Shiroin
 * @base QJ-MapProjectileMZ
 * @orderAfter QJ-MapProjectileMZ
 * @orderAfter EffekseerAnimationColorChange
 *
 * @help
 * ============================================================================
 *  QJMP_EffekseerTintPatch.js
 * ============================================================================
 *  问题：
 *    QJ-MapProjectileMZ 用 img:['A', 动画ID, ...] 把弹幕显示为 Effekseer 动画时，
 *    弹幕的 hue / tone 设置对该动画【没有效果】。原因：
 *      1) QJ 把 hue/tone 用 setHue()/setColorTone() 设在【弹幕 sprite 本体】
 *         (Sprite_QJBulletMZ) 上，只影响弹幕自身位图；
 *      2) 而 Effekseer 动画 selfAnimationSprite 是用 this.parent.addChild() 挂到
 *         弹幕的【父容器】下，是弹幕的【兄弟节点】，不在弹幕滤镜范围内。
 *      => hue/tone 罩不到动画。
 *
 *  同理 opacity 也无效：QJ 把 data.opacity 设到弹幕本体 this.alpha，而 Effekseer
 *  直接走 gl 渲染，PIXI 的 alpha 不作用于它。
 *
 *  本补丁：
 *    1) hue/tone —— 同步到 selfAnimationSprite 上。Sprite_Animation_MPMZ 继承自
 *       Sprite_Animation→Sprite，自带 setHue/setColorTone，给它挂普通 ColorFilter 即可
 *       染色（EffekseerAnimationColorChange 也是靠在动画 sprite 上挂滤镜，证明可行）。
 *    2) opacity —— 用 PIXI 的 AlphaFilter 把 Effekseer 渲染进滤镜纹理再按 alpha 合成。
 *       （不用 Effekseer setAllColor：它改内部颜色状态，某些特效绘制时会触发 WASM
 *        整数转换崩溃 "float unrepresentable in integer range"。AlphaFilter 与 hue/tone
 *        的滤镜是同一条已验证不崩的渲染路径，更稳。）
 *
 *  特点：
 *    · 复用 QJ 现成的 hue / tone 属性驱动，动态可改。
 *    · 比 EffekseerAnimationColorChange 轻：没有它那套“每帧把整张 tilemap 重渲进
 *      全屏纹理做背景补偿”的开销；用 filterArea 也不用每弹建一张全屏 dummy 位图。
 *
 *  实现要点（避坑）：
 *    · 动画 sprite 没有 bitmap → bounds 为 0×0，直接挂滤镜会让 Effekseer 渲染被吞进
 *      零尺寸缓冲、动画消失。本补丁给它设 filterArea=全屏来撑出滤镜区域，规避此坑。
 *    · 无 hue/无 tone 的弹幕不会被挂滤镜（setHue(0)/setColorTone([0,0,0,0]) 是空操作），
 *      零额外开销；只有真正着色的弹幕才付出滤镜成本。
 *
 *  限制：
 *    · 用引擎内置 ColorFilter，没有 EffekseerAnimationColorChange 的“加色背景补偿”。
 *      很亮背景上、强加色混合的特效，染色结果可能与该插件略有差别；一般弹幕无感。
 *    · 每颗【着色】的动画弹幕每帧走一次全屏滤镜，会吃 fill-rate。少量特效(陷阱/技能)
 *      无感；若打算同屏上百颗都着色，注意性能。未着色的动画弹幕不受影响。
 *
 *  加载顺序：放在 QJ-MapProjectileMZ 之后即可（本插件不依赖其它顺序）。
 *
 *  本插件无参数。
 * ============================================================================
 */

(() => {
    "use strict";

    // QJ-MapProjectileMZ 未加载则静默跳过，避免报错。
    if (typeof Sprite_QJBulletMZ === "undefined") {
        console.warn("QJMP_EffekseerTintPatch: 未检测到 Sprite_QJBulletMZ，需在 QJ-MapProjectileMZ 之后加载。已跳过。");
        return;
    }

    const ZERO_TONE = [0, 0, 0, 0];

    // ★关键：Sprite_Animation_MPMZ 没有 bitmap → bounds 为 0×0。直接挂 ColorFilter
    //   会让滤镜渲染区域为空，把 Effekseer 渲染吞进零尺寸缓冲，动画整个消失。
    //   设 filterArea = 全屏，告诉 PIXI 滤镜区域，避免建全屏 dummy bitmap（更省内存）。
    const ensureFilterArea = anim => {
        if (anim && !anim.filterArea) {
            anim.filterArea = new Rectangle(0, 0, Graphics.width, Graphics.height);
        }
    };

    // 把弹幕当前 hue/tone 应用到其 Effekseer 动画 sprite 上（含重置，处理对象池复用）。
    const applyTintToAnim = bulletSprite => {
        const anim = bulletSprite.selfAnimationSprite;
        if (!anim || typeof anim.setColorTone !== "function") return;
        ensureFilterArea(anim);
        anim.setHue(bulletSprite._hue || 0);
        anim.setColorTone(bulletSprite._colorTone || ZERO_TONE);
    };

    // —— hue：QJ 初始化(this.setHue)与运行时改 hue(sprite.setHue) 都走这里 ——
    const _setHue = Sprite_QJBulletMZ.prototype.setHue;
    Sprite_QJBulletMZ.prototype.setHue = function(hue) {
        _setHue.call(this, hue);
        const anim = this.selfAnimationSprite;
        if (anim) { ensureFilterArea(anim); anim.setHue(hue); }
    };

    // —— tone：QJ 初始化、运行时改 tone、以及动态 tone 每帧的
    //    updateColorToneMPMZ→setColorTone 都走这里 ——
    const _setColorTone = Sprite_QJBulletMZ.prototype.setColorTone;
    Sprite_QJBulletMZ.prototype.setColorTone = function(tone) {
        _setColorTone.call(this, tone);
        const anim = this.selfAnimationSprite;
        if (anim) { ensureFilterArea(anim); anim.setColorTone(tone); }
    };

    // —— 动画刚创建/从对象池取出时，补一次当前 hue/tone（此刻 this._hue/_colorTone 已就绪）——
    const _createEffectData = Sprite_QJBulletMZ.prototype.createEffectData;
    Sprite_QJBulletMZ.prototype.createEffectData = function(img) {
        _createEffectData.call(this, img);
        applyTintToAnim(this);
        installAlphaSync(this);
    };

    // —— opacity：QJ 把 data.opacity 设到弹幕本体 this.alpha（updateBaseData 内，每帧）。
    //   Effekseer 直接走 gl 渲染，PIXI 的 sprite.alpha 不作用于它。
    //   【为何不用 Effekseer setAllColor】：它会改 Effekseer 内部颜色状态，某些特效在
    //   绘制时触发 WASM 整数转换崩溃("float unrepresentable in integer range")。改用
    //   PIXI 的 AlphaFilter：把 Effekseer 渲染进滤镜纹理再按 alpha 合成——这与 hue/tone
    //   的滤镜是同一条已验证不崩的渲染路径，且不碰 Effekseer 内部。
    const AlphaFilterClass = (PIXI.filters && PIXI.filters.AlphaFilter) || PIXI.AlphaFilter;

    const syncAnimAlpha = sprite => {
        const anim = sprite.selfAnimationSprite;
        if (!anim || !AlphaFilterClass) return;
        let alpha = sprite.alpha;
        if (!Number.isFinite(alpha)) alpha = 1;
        alpha = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha;
        if (alpha < 1) {
            ensureFilterArea(anim);
            if (!anim._qjmpAlphaFilter) anim._qjmpAlphaFilter = new AlphaFilterClass();
            if (!anim.filters) anim.filters = [];
            if (anim.filters.indexOf(anim._qjmpAlphaFilter) < 0) anim.filters.push(anim._qjmpAlphaFilter);
            anim._qjmpAlphaFilter.alpha = alpha;
        } else if (anim._qjmpAlphaFilter && anim.filters) {
            // 恢复不透明：移除我们加的 AlphaFilter（保留可能存在的 hue/tone 滤镜）。
            const i = anim.filters.indexOf(anim._qjmpAlphaFilter);
            if (i >= 0) anim.filters.splice(i, 1);
            if (anim.filters.length === 0) anim.filters = null;
        }
    };

    // —— alpha 同步改为实例级安装（性能）：原先包装 prototype.updateBaseData，
    //    让"每颗弹幕每帧"都多走一层调用+判空，而绝大多数弹幕根本没有
    //    Effekseer 动画（安卓实测该包装税 ~7ms/s）。现在只在动画真正创建时
    //    给该 sprite 装实例级 updateBaseData；安装时机在所有插件加载完之后，
    //    读到的 prototype 链是最终链，组合关系不变。动画随对象池回收后，
    //    实例钩子只剩一次判空开销，可接受。
    const installAlphaSync = sprite => {
        if (!sprite.selfAnimationSprite || sprite._qjmpAlphaHooked) return;
        sprite._qjmpAlphaHooked = true;
        const protoUpdate = Sprite_QJBulletMZ.prototype.updateBaseData;
        sprite.updateBaseData = function() {
            protoUpdate.call(this);
            syncAnimAlpha(this);
        };
    };
})();
