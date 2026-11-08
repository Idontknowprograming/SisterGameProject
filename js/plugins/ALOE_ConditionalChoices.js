"use strict";

//=============================================================================
// ALOE_ConditionalChoices.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc v1.3.0-MZ Conditional show/disable choices.
 * @author Aloe Guvner / MZ rewrite by Codex
 *
 * @param patternStart
 * @text Start Pattern
 * @type text
 * @desc Pattern that indicates the start of the conditions.
 * @default <<
 *
 * @param patternEnd
 * @text End Pattern
 * @type text
 * @desc Pattern that indicates the end of the conditions.
 * @default >>
 *
 * @help
 * 在“显示选项”的选项文字中直接写条件：
 *
 *   选项文字 <<隐藏条件,禁用条件>>
 *
 * 示例：
 *   选项A <<s[1]>>
 *   选项B <<,v[2] >= 10>>
 *   选项C <<s[1],v[2] >= 10>>
 *
 * 规则：
 * - 隐藏条件为 true 时，该选项不显示。
 * - 禁用条件为 true 时，该选项显示但不能点击。
 * - 没有逗号时，内容视为隐藏条件。
 * - 有顶层逗号时，逗号前为隐藏条件，逗号后为禁用条件。
 *
 * 条件中可用简写：
 * - s[x]  : 开关 x
 * - v[x]  : 变量 x
 * - a[x]  : 角色数据库 id x
 * - p[x]  : 队伍成员索引 x，从 0 开始
 * - t[x]  : 敌群成员索引 x，从 0 开始
 * - gp    : $gameParty
 * - ss[x] : YEP_SelfSwVar 风格自开关兼容
 * - sv[x] : YEP_SelfSwVar 风格自变量兼容
 *
 * 一次性按编号隐藏下一组选项：
 *   $gameMap.chahuiMapTemp.disabledOptionArray = [1, 3];
 * - 编号从 1 开始；上述示例使三个选项中只显示第二个。
 * - 连续选项由 HIME_LargeChoices 合并时，按合并后的完整选项组编号。
 * - 非空数组优先接管本组过滤，不执行本组的 <<>> 隐藏或禁用条件。
 *   选项文字中的 <<>> 标记仍会去除。
 * - 在准备选项时读取并立即将该字段重置为 []，只影响本次选项组。
 * - 未设置、空数组或非数组值时，仍使用原有 <<>> 条件。
 * - 数组仅匹配有效的数字编号，重复或越界编号不影响其他选项。
 *
 * 注：原工程附加的“连续显示选项合并”功能已移除，改由 HIME_LargeChoices.js 接管。
 */

var Imported = Imported || {};
Imported.ALOE_ConditionalChoices = true;

(() => {
    const pluginName = "ALOE_ConditionalChoices";
    const params = PluginManager.parameters(pluginName);
    const patternStart = String(params.patternStart || "<<");
    const patternEnd = String(params.patternEnd || ">>");

    function escapeRegExp(text) {
        return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    const conditionRegExp = new RegExp(
        escapeRegExp(patternStart) + "([\\s\\S]*?)" + escapeRegExp(patternEnd)
    );

    function stripConditionText(text) {
        return String(text || "").replace(conditionRegExp, "").trim();
    }

    function extractConditionText(text) {
        const match = conditionRegExp.exec(String(text || ""));
        return match ? String(match[1] || "").trim() : "";
    }

    function splitTopLevelComma(text) {
        let depth = 0;
        let quote = "";
        let escaped = false;
        for (let i = 0; i < text.length; i++) {
            const c = text.charAt(i);
            if (escaped) {
                escaped = false;
                continue;
            }
            if (quote) {
                if (c === "\\") escaped = true;
                else if (c === quote) quote = "";
                continue;
            }
            if (c === "'" || c === '"' || c === "`") {
                quote = c;
            } else if (c === "[" || c === "(" || c === "{") {
                depth++;
            } else if (c === "]" || c === ")" || c === "}") {
                depth = Math.max(0, depth - 1);
            } else if (c === "," && depth === 0) {
                return [text.slice(0, i).trim(), text.slice(i + 1).trim()];
            }
        }
        return [text.trim(), ""];
    }

    function makeValueProxy(getter) {
        return new Proxy([], {
            get(_target, key) {
                if (typeof key === "symbol" || key in Array.prototype) {
                    return Array.prototype[key];
                }
                const id = Number(key);
                return Number.isFinite(id) ? getter(id) : undefined;
            }
        });
    }

    function makeEvalContext() {
        const s = makeValueProxy(id => $gameSwitches.value(id));
        const v = makeValueProxy(id => $gameVariables.value(id));
        const a = makeValueProxy(id => $gameActors.actor(id));
        const p = $gameParty.members();
        const t = $gameTroop.members();
        const gp = $gameParty;
        const ss = makeValueProxy(id => $gameSwitches.value(id));
        const sv = makeValueProxy(id => $gameVariables.value(id));
        return { s, v, a, p, t, gp, ss, sv };
    }

    function evaluateChoiceCondition(formula, choiceText, kind) {
        if (!formula) return false;
        const context = makeEvalContext();
        try {
            return !!Function(
                "s",
                "v",
                "a",
                "p",
                "t",
                "gp",
                "ss",
                "sv",
                `"use strict"; return !!(${formula});`
            )(
                context.s,
                context.v,
                context.a,
                context.p,
                context.t,
                context.gp,
                context.ss,
                context.sv
            );
        } catch (error) {
            console.error(
                `[${pluginName}] ${kind} condition error: ${formula}`,
                choiceText,
                error
            );
            return false;
        }
    }

    function parseChoice(choiceText) {
        const conditionText = extractConditionText(choiceText);
        const parts = conditionText ? splitTopLevelComma(conditionText) : ["", ""];
        return {
            rawName: String(choiceText || ""),
            name: stripConditionText(choiceText),
            hideCondition: parts[0] || "",
            disableCondition: parts[1] || ""
        };
    }

    function consumeDisabledOptionArray() {
        const mapTemp = typeof $gameMap !== "undefined" && $gameMap
            ? $gameMap.chahuiMapTemp
            : null;
        if (!mapTemp) return null;
        const indexes = mapTemp.disabledOptionArray;
        if (indexes !== undefined) mapTemp.disabledOptionArray = [];
        return Array.isArray(indexes) && indexes.length > 0 ? new Set(indexes) : null;
    }

    function filterChoices(rawChoices, disabledOptionIndexes) {
        const visibleChoices = [];
        const visibleIndexes = [];
        const visibleData = [];
        for (let i = 0; i < rawChoices.length; i++) {
            if (disabledOptionIndexes && disabledOptionIndexes.has(i + 1)) continue;
            const data = parseChoice(rawChoices[i]);
            const hidden = !disabledOptionIndexes &&
                evaluateChoiceCondition(data.hideCondition, data.rawName, "hide");
            if (!hidden) {
                data.originalIndex = i;
                data.disabled = !disabledOptionIndexes && evaluateChoiceCondition(
                    data.disableCondition,
                    data.rawName,
                    "disable"
                );
                visibleChoices.push(data.rawName);
                visibleIndexes.push(i);
                visibleData.push(data);
            }
        }
        return { visibleChoices, visibleIndexes, visibleData };
    }

    function convertChoiceIndex(originalIndex, visibleIndexes, fallback) {
        if (originalIndex < 0) return originalIndex;
        const mapped = visibleIndexes.indexOf(originalIndex);
        return mapped >= 0 ? mapped : fallback;
    }

    function prepareSelfSwVarEvent(interpreter) {
        if (Imported.YEP_SelfSwVar && $gameTemp.setSelfSwVarEvent) {
            $gameTemp.setSelfSwVarEvent(interpreter._mapId, interpreter._eventId);
        }
    }

    function clearSelfSwVarEvent() {
        if (Imported.YEP_SelfSwVar && $gameTemp.clearSelfSwVarEvent) {
            $gameTemp.clearSelfSwVarEvent();
        }
    }

    const _Game_Message_clear = Game_Message.prototype.clear;
    Game_Message.prototype.clear = function() {
        _Game_Message_clear.call(this);
        this._aloeChoiceData = [];
        this._aloeVisibleChoiceIndexes = [];
    };

    Game_Message.prototype.aloeChoiceData = function(index) {
        return this._aloeChoiceData ? this._aloeChoiceData[index] : null;
    };

    const _Game_Interpreter_command102 = Game_Interpreter.prototype.command102;
    Game_Interpreter.prototype.command102 = function(params) {
        if ($gameMessage.isBusy()) {
            return false;
        }
        this.setupChoices(params);
        this.setWaitMode("message");
        return true;
    };

    Game_Interpreter.prototype.setupChoices = function(params) {
        const disabledOptionIndexes = consumeDisabledOptionArray();
        prepareSelfSwVarEvent(this);

        const rawChoices = Array.isArray(params[0]) ? params[0].clone() : [];
        const result = filterChoices(rawChoices, disabledOptionIndexes);
        const visibleChoices = result.visibleChoices;
        const visibleIndexes = result.visibleIndexes;
        const visibleData = result.visibleData;

        let cancelType = Number(params[1]);
        if (cancelType >= rawChoices.length) cancelType = -2;
        const defaultType = params.length > 2 ? Number(params[2]) : 0;
        const positionType = params.length > 3 ? Number(params[3]) : 2;
        const background = params.length > 4 ? Number(params[4]) : 0;

        const mzDefaultType = convertChoiceIndex(defaultType, visibleIndexes, 0);
        const mzCancelType = convertChoiceIndex(cancelType, visibleIndexes, -2);

        $gameMessage._aloeChoiceData = visibleData;
        $gameMessage._aloeVisibleChoiceIndexes = visibleIndexes;
        $gameMessage.setChoices(visibleChoices, mzDefaultType, mzCancelType);
        $gameMessage.setChoiceBackground(background);
        $gameMessage.setChoicePositionType(positionType);
        $gameMessage.setChoiceCallback(n => {
            if (n >= 0) {
                this._branch[this._indent] =
                    $gameMessage._aloeVisibleChoiceIndexes[n] ?? n;
            } else {
                this._branch[this._indent] = n;
            }
        });

        clearSelfSwVarEvent();
    };

    // [已移除] "连续显示选项合并" 功能（aloeCombineConsecutiveChoices / aloeOffsetChoiceBranches）。
    //   该功能已改由 HIME_LargeChoices.js 接管，此处删除以避免冲突/冗余。
    //   ALOE 仅保留其本职：按条件 隐藏/禁用 选项（filterChoices / setupChoices / 选项绘制）。

    const _Window_ChoiceList_makeCommandList = Window_ChoiceList.prototype.makeCommandList;
    Window_ChoiceList.prototype.makeCommandList = function() {
        _Window_ChoiceList_makeCommandList.call(this);
        for (let i = 0; i < this._list.length; i++) {
            const data = $gameMessage.aloeChoiceData(i);
            if (data) {
                this._list[i].name = data.name;
                this._list[i].enabled = !data.disabled;
            }
        }
    };

    Window_ChoiceList.prototype.drawItem = function(index) {
        const rect = this.itemLineRect(index);
        this.changePaintOpacity(this.isCommandEnabled(index));
        this.drawTextEx(this.commandName(index), rect.x, rect.y, rect.width);
        this.changePaintOpacity(true);
    };

    Window_ChoiceList.prototype.maxChoiceWidth = function() {
        let maxWidth = 96;
        const choices = $gameMessage.choices();
        for (const choice of choices) {
            const textWidth = this.textSizeEx(stripConditionText(choice)).width;
            const choiceWidth = Math.ceil(textWidth) + this.itemPadding() * 2;
            if (maxWidth < choiceWidth) {
                maxWidth = choiceWidth;
            }
        }
        return maxWidth;
    };
})();
