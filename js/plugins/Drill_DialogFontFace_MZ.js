//=============================================================================
// Drill_DialogFontFace_MZ.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v1.1] 窗口字符 - 字体管理器（MV兼容）
 * @author shiroin / Codex
 *
 * @help
 * 兼容 MV 插件 Drill_DialogFontFace 的默认字体切换和 \fn[font] 转义符功能。
 *
 * 使用示例：
 *   \fn[GameFont]默认字体
 *   \fn[MPLUS2ExtraBold]指定字体
 *
 * 说明：
 * - 修改 DrillUp.g_DFF_fontFace 后，后续重置/新建的 MZ 窗口会使用该字体。
 * - MZ 工程原主字体保留在字体链末尾，负责缺字回退。
 * - 不负责加载字体文件；请用 MZ 系统设置或其他字体加载插件管理字体。
 * - 如果安装了 Drill_CoreOfWindowCharacter，会同步支持其字符块绘制流程。
 */

var Imported = Imported || {};
Imported.Drill_DialogFontFace = true;
Imported.Drill_DialogFontFace_MZ = true;

var DrillUp = DrillUp || {};
DrillUp.g_DFF_fontFace = DrillUp.g_DFF_fontFace || "GameFont";

(function() {
    "use strict";

    function obtainEscapeString(textState) {
        const text = textState && textState.text ? textState.text.slice(textState.index) : "";
        const arr = /^\[([^\]]*)\]/.exec(text);
        if (arr) {
            textState.index += arr[0].length;
            return String(arr[1] || "").trim();
        }
        return "";
    }

    function applyFontFace(windowObject, fontFace) {
        if (!fontFace || !windowObject || !windowObject.contents) return;
        windowObject.contents.fontFace = fontFace;
        // 记住当前 \fn 字体，供 resetFontSettings 之后重新应用（否则会被重置冲掉、到不了落墨）。
        windowObject._drill_DFF_activeFont = fontFace;
    }

    // MV→MZ 默认字体兼容：
    // MV 的 Window_Base.standardFontFace() 直接返回 DrillUp.g_DFF_fontFace；
    // MZ 删除了该入口，resetFontSettings() 改为读取 $gameSystem.mainFontFace()。
    // 在新的入口补回同一动态行为，并保留 MZ 原字体链用于缺字回退。
    const _DFF_mainFontFace = Game_System.prototype.mainFontFace;
    Game_System.prototype.mainFontFace = function() {
        const dynamicFontFace = String(DrillUp.g_DFF_fontFace || "").trim();
        const mzFontFace = _DFF_mainFontFace.call(this);
        if (!dynamicFontFace || dynamicFontFace === "GameFont") {
            return mzFontFace;
        }
        return `${dynamicFontFace}, ${mzFontFace}`;
    };

    // MV→MZ：原本用一个"提前 return 的 processEscapeCharacter"单独截走 \fn，使它绕过了 COWC 的
    //   效果字符管线。COWC 在消息逐帧绘制时会"重放"效果字符管线里的码（\fs 即如此，所以有效），
    //   而被截走的 \fn 不在管线里 → 绘制阶段不被重放 → 字体丢失（回退默认字体）。
    //   这里删除该截获，让 \fn 走下方 processNewEffectChar_Combined（与 \fs 同款、会 charSubmit_Effect），
    //   从而被 COWC 一并重放、最终生效。
    if (Window_Base.prototype.drill_COWC_processNewEffectChar_Combined) {
        const _drill_COWC_processNewEffectChar_Combined =
            Window_Base.prototype.drill_COWC_processNewEffectChar_Combined;
        Window_Base.prototype.drill_COWC_processNewEffectChar_Combined = function(
            matchedIndex,
            matchedString,
            command,
            args
        ) {
            _drill_COWC_processNewEffectChar_Combined.call(
                this,
                matchedIndex,
                matchedString,
                command,
                args
            );

            if (String(command).toUpperCase() === "FN" && args.length >= 1) {
                applyFontFace(this, String(args[0]).trim());
                if (this.drill_COWC_charSubmit_Effect) {
                    this.drill_COWC_charSubmit_Effect(0, 0);
                }
            }
        };
    }

    if (Window_Base.prototype.drill_COWC_drawSynchronization) {
        const _drill_COWC_drawSynchronization =
            Window_Base.prototype.drill_COWC_drawSynchronization;
        Window_Base.prototype.drill_COWC_drawSynchronization = function(bitmapFrom, bitmapTo) {
            _drill_COWC_drawSynchronization.call(this, bitmapFrom, bitmapTo);
            if (bitmapFrom && bitmapTo) {
                bitmapTo.fontFace = bitmapFrom.fontFace;
            }
        };
    }

    // MV→MZ 关键修复：COWC 在消息逐帧绘制时会反复调用 resetFontSettings，把 \fn 设的 fontFace
    //   冲回 standardFontFace（日志已证实）。\fs 靠转义码被重放才存活，fontFace 没有这种重放。
    //   这里在每次 resetFontSettings 之后，若本窗口有生效中的 \fn 字体，则重新应用，使其存活到落墨。
    const _DFF_resetFontSettings = Window_Base.prototype.resetFontSettings;
    Window_Base.prototype.resetFontSettings = function() {
        _DFF_resetFontSettings.call(this);
        if (this._drill_DFF_activeFont && this.contents) {
            this.contents.fontFace = this._drill_DFF_activeFont;
        }
    };
    // 每条消息新页开始时清空，避免 \fn 字体泄漏到下一条消息（\fn 仅在本条消息内持续，与 MV 一致）。
    if (typeof Window_Message !== "undefined") {
        const _DFF_newPage = Window_Message.prototype.newPage;
        Window_Message.prototype.newPage = function(textState) {
            this._drill_DFF_activeFont = null;
            _DFF_newPage.call(this, textState);
        };
    }

    // 非消息窗口(悬浮窗/帮助窗/物品描述等)用 drawTextEx 一次性整段绘制，不经 newPage。残留的 \fn 字体
    //   会在下次重绘时被 resetFontSettings 从头套到整段文本上 → 整段被同一字体绘制（用户反馈的现象）。
    //   这里在每次"真实绘制"的整段渲染开始时清空 \fn 状态，使 \fn 只影响其后的片段，与 MV 一致。
    //   仅在非计算(textSizeEx 宽度计算)时清；Window_Message 自有 newPage 清理，排除以免回归对话框。
    const _DFF_drawTextEx = Window_Base.prototype.drawTextEx;
    Window_Base.prototype.drawTextEx = function(text, x, y) {
        const calculating = (typeof this.drill_COWA_isCalculating === "function")
            ? this.drill_COWA_isCalculating() : false;
        const isMessage = (typeof Window_Message !== "undefined") && (this instanceof Window_Message);
        if (!calculating && !isMessage) {
            this._drill_DFF_activeFont = null;
        }
        return _DFF_drawTextEx.call(this, text, x, y);
    };
})();
