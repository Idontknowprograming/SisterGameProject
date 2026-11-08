//=============================================================================
// Shiroin_COAS_DynamicPlayback.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [v1.2.0] Drill动画序列动态变速：支持小数慢放、余数保留与高速抽帧
 * @author Shiroin
 *
 * @help
 * =============================================================================
 * Shiroin_COAS_DynamicPlayback
 * =============================================================================
 * 前置插件：Drill_CoreOfActionSequence
 * 本插件必须放在 Drill_CoreOfActionSequence 之后。
 *
 * 本插件只改变动画序列的图片播放时钟，不参与伤害、碰撞或技能判定。
 * 插件参数中的帧间隔仍作为动画的原始时间轴；运行时倍率只缩放时间轴。
 *
 * -----------------------------------------------------------------------------
 * 兼容原接口（同时影响状态元与动作元）
 * -----------------------------------------------------------------------------
 * controller.drill_COAS_setCurSpeed(1.5);
 *
 * -----------------------------------------------------------------------------
 * 独立接口
 * -----------------------------------------------------------------------------
 * controller.drill_COAS_setStateSpeed(0.5);  // 状态元半速
 * controller.drill_COAS_clearStateSpeed();   // 恢复跟随原接口倍率
 *
 * controller.drill_COAS_setActSpeed(2.0);    // 动作元二倍速
 * controller.drill_COAS_clearActSpeed();     // 恢复跟随原接口倍率
 *
 * 独立倍率会持续保存，直到再次设置、清除或控制器被重建。
 * 倍率可在动画播放途中修改，并从下一次控制器更新起生效。
 *
 * -----------------------------------------------------------------------------
 * 正负攻速百分比接口
 * -----------------------------------------------------------------------------
 * controller.drill_COAS_setActAttackSpeedValue($gameParty.leader().cnt);
 * // cnt = 0.1 表示+10%，cnt = -0.3 表示-30%
 *
 * controller.drill_COAS_setActAttackSpeedPercent(50);    // +50% -> 1.5倍
 * controller.drill_COAS_setActAttackSpeedPercent(-50);   // -50% -> 2/3倍
 * controller.drill_COAS_setActAttackSpeedPercent(-200);  // -200% -> 1/3倍
 *
 * 也可只取得倍率：
 * ShiroinCOASDynamicPlayback.rateFromAttackSpeedPercent(-50);
 *
 * 换算规则：
 *   正攻速：rate = 1 + percent / 100
 *   负攻速：rate = 1 / (1 - percent / 100)
 *
 * 因此原始60帧动画：
 *   +200% -> 20帧，+50% -> 40帧，-50% -> 90帧，-200% -> 180帧。
 *
 * 传入0倍率会停在当前图片；负倍率和非数字会安全修正为0或1，不会倒放。
 * 如需暂停整个动画序列，仍建议使用核心原有的暂停接口。
 * =============================================================================
 */

var Imported = Imported || {};
Imported.Shiroin_COAS_DynamicPlayback = true;

(function() {
    "use strict";

    if (!Imported.Drill_CoreOfActionSequence) {
        console.warn("Shiroin_COAS_DynamicPlayback: 缺少 Drill_CoreOfActionSequence，补丁未启用。");
        return;
    }

    var EPSILON = 1e-8;

    function normalizeRate(value) {
        var rate = Number(value);
        if (!isFinite(rate)) return 1;
        return Math.max(0, rate);
    }

    function normalizeInterval(value) {
        var interval = Number(value);
        if (!isFinite(interval)) return 1;
        return Math.max(EPSILON, interval);
    }

    function rateFromAttackSpeedValue(value) {
        value = Number(value);
        if (!isFinite(value)) value = 0;
        return value >= 0 ? 1 + value : 1 / (1 - value);
    }

    function rateFromAttackSpeedPercent(percent) {
        var value = Number(percent);
        if (!isFinite(value)) value = 0;
        return rateFromAttackSpeedValue(value / 100);
    }

    function visualIndex(data, frameCount, logicalIndex) {
        if (data["gif_back_run"] === true) {
            return frameCount - 1 - logicalIndex;
        }
        return logicalIndex;
    }

    /**
     * 用一个连续的虚拟时钟推进GIF。
     * _drill_curIndex 是播放顺序索引；倒放只改变它映射到的资源索引。
     */
    function updateGifTimeline(controller, data, getIntervalByIndex) {
        var sources = data["gif_src"];
        if (!Array.isArray(sources) || sources.length === 0) return;

        var frameCount = sources.length;
        var logicalIndex = Number(controller._drill_curIndex);
        if (!isFinite(logicalIndex)) logicalIndex = 0;
        logicalIndex = Math.max(0, Math.floor(logicalIndex));

        // 已结束时保持播放顺序中的最后一张图片。
        if (logicalIndex >= frameCount) {
            controller._drill_curIndex = frameCount;
            controller._drill_curBitmapName = sources[visualIndex(data, frameCount, frameCount - 1)];
            return;
        }

        // 本游戏帧先显示当前图片，再消耗这一帧经过的虚拟时间。
        var currentVisualIndex = visualIndex(data, frameCount, logicalIndex);
        controller._drill_curBitmapName = sources[currentVisualIndex];

        var accumulator = Number(controller._drill_curTickTime);
        if (!isFinite(accumulator) || accumulator < 0) accumulator = 0;

        var rate = normalizeRate(controller._drill_curSpeed);
        if (rate === 0) {
            controller._drill_curTickTime = accumulator;
            return;
        }

        accumulator += rate;

        // 一次更新可以越过多张图片；减去间隔而不是清零，保留小数余量。
        while (logicalIndex < frameCount) {
            currentVisualIndex = visualIndex(data, frameCount, logicalIndex);
            var interval = normalizeInterval(getIntervalByIndex.call(controller, currentVisualIndex));
            if (accumulator + EPSILON < interval) break;

            accumulator -= interval;
            if (accumulator < 0 && accumulator > -EPSILON) accumulator = 0;
            logicalIndex += 1;
        }

        controller._drill_curIndex = logicalIndex;

        if (logicalIndex >= frameCount) {
            // 结束所在的游戏帧强制显示末帧，不额外延长动画。
            controller._drill_curBitmapName = sources[visualIndex(data, frameCount, frameCount - 1)];
            controller._drill_COAS_DP_overflow = Math.max(0, accumulator);
            controller._drill_curTickTime = 0;
        } else {
            controller._drill_COAS_DP_overflow = 0;
            controller._drill_curTickTime = Math.max(0, accumulator);
        }
    }

    var api = window.ShiroinCOASDynamicPlayback || {};
    api.normalizeRate = normalizeRate;
    api.rateFromAttackSpeedValue = rateFromAttackSpeedValue;
    api.rateFromAttackSpeedPercent = rateFromAttackSpeedPercent;
    api.updateGifTimeline = updateGifTimeline;
    window.ShiroinCOASDynamicPlayback = api;

    // -------------------------------------------------------------------------
    // 状态元：连续时间轴
    // -------------------------------------------------------------------------
    Drill_COAS_StateController.prototype.drill_controllerState_updateGIF = function() {
        updateGifTimeline(
            this,
            this.drill_data(),
            this.drill_controllerState_getIntervalByIndex
        );
    };

    // 状态节点循环或切换状态元时，原核心的resetData会把倍率重置为1。
    // 保留当前实例倍率，避免持续动画在每轮开头短暂恢复原速。
    var _drill_COAS_DP_state_resetData =
        Drill_COAS_StateController.prototype.drill_controllerState_resetData;
    Drill_COAS_StateController.prototype.drill_controllerState_resetData = function(sequenceDataId, stateDataId) {
        var previousSpeed = normalizeRate(this._drill_curSpeed);
        _drill_COAS_DP_state_resetData.call(this, sequenceDataId, stateDataId);
        this._drill_curSpeed = previousSpeed;
        this._drill_COAS_DP_overflow = 0;
    };

    // -------------------------------------------------------------------------
    // 状态节点：连续循环不重复消耗同一个游戏帧
    // -------------------------------------------------------------------------
    var _drill_COAS_DP_node_resetData =
        Drill_COAS_StateNodeController.prototype.drill_controllerNode_resetData;
    Drill_COAS_StateNodeController.prototype.drill_controllerNode_resetData = function(sequenceDataId, stateNodeDataId) {
        _drill_COAS_DP_node_resetData.call(this, sequenceDataId, stateNodeDataId);
        this._drill_COAS_DP_carryTime = 0;
        this._drill_COAS_DP_pendingRefresh = false;
    };

    Drill_COAS_StateNodeController.prototype.drill_controllerNode_refreshNextState = function(sequenceDataId, nextStateDataId) {
        this._drill_COAS_DP_pendingRefresh = false;
        if (this._drill_curState === undefined) {
            this._drill_curState = new Drill_COAS_StateController(sequenceDataId, nextStateDataId);
        }

        var carryTime = Number(this._drill_COAS_DP_carryTime);
        if (!isFinite(carryTime) || carryTime < 0) carryTime = 0;
        this._drill_COAS_DP_carryTime = 0;

        this._drill_curState.drill_controllerState_resetData(sequenceDataId, nextStateDataId);
        this._drill_curState._drill_curTickTime = carryTime;

        // 原核心在这里强制update，随后主控制器还会再update一次，导致循环边界加速。
        // 这里只同步第一张图片；真实时间统一由每个游戏帧的一次update消耗。
        var stateData = this._drill_curState.drill_data();
        var sources = stateData["gif_src"];
        if (Array.isArray(sources) && sources.length > 0) {
            var firstVisualIndex = stateData["gif_back_run"] === true ? sources.length - 1 : 0;
            this._drill_curState._drill_curBitmapName = sources[firstVisualIndex];
        }

        this._drill_curNode = null;
    };

    Drill_COAS_StateNodeController.prototype.drill_controllerNode_updateNode = function() {
        // 顺序集合中的下一个状态元延迟到新的游戏帧再创建，
        // 使上一个状态元的末图能在完成所在帧正常输出。
        if (this._drill_COAS_DP_pendingRefresh === true) {
            this._drill_COAS_DP_pendingRefresh = false;
            this.drill_controllerNode_refreshNext();
        }

        if (this.drill_controllerNode_isTypeState()) {
            this._drill_curState.drill_controllerState_update();

            if (this._drill_curState.drill_controllerState_isEnd() === true) {
                this._drill_COAS_DP_carryTime =
                    Math.max(0, Number(this._drill_curState._drill_COAS_DP_overflow) || 0);
                this._drill_curIndex += 1;
                if (this.drill_controllerNode_isEnd() === false) {
                    this._drill_COAS_DP_pendingRefresh = true;
                }
            }
        }

        // 嵌套状态节点维持核心原有行为；普通状态元和简单状态元集合走上面的连续时钟。
        if (this.drill_controllerNode_isTypeNode()) {
            this._drill_curNode.drill_controllerNode_update();
            if (this._drill_curNode.drill_controllerNode_isEnd() === true) {
                this._drill_curIndex += 1;
                if (this.drill_controllerNode_isEnd() === false) {
                    this.drill_controllerNode_refreshNext();
                }
            }
        }
    };

    // -------------------------------------------------------------------------
    // 动作元：连续时间轴
    // -------------------------------------------------------------------------
    Drill_COAS_ActController.prototype.drill_controllerAct_updateGIF = function() {
        updateGifTimeline(
            this,
            this.drill_data(),
            this.drill_controllerAct_getIntervalByIndex
        );
    };

    // -------------------------------------------------------------------------
    // 主控制器：基础倍率、状态元倍率、动作元倍率
    // -------------------------------------------------------------------------
    var _drill_COAS_DP_main_initSpeed =
        Drill_COAS_MainController.prototype.drill_controllerMain_initSpeed;
    Drill_COAS_MainController.prototype.drill_controllerMain_initSpeed = function() {
        _drill_COAS_DP_main_initSpeed.call(this);
        this._drill_COAS_DP_stateSpeed = null;
        this._drill_COAS_DP_actSpeed = null;
    };

    Drill_COAS_MainController.prototype.drill_controllerMain_setCurSpeed = function(speed) {
        this._drill_curSpeed = normalizeRate(speed);

        if (this._drill_COAS_DP_stateSpeed === null ||
            this._drill_COAS_DP_stateSpeed === undefined) {
            this.drill_COAS_DP_applyStateSpeed(this._drill_curSpeed);
        }
        if (this._drill_COAS_DP_actSpeed === null ||
            this._drill_COAS_DP_actSpeed === undefined) {
            this.drill_COAS_DP_applyActSpeed(this._drill_curSpeed);
        }
    };

    Drill_COAS_MainController.prototype.drill_COAS_setStateSpeed = function(speed) {
        this._drill_COAS_DP_stateSpeed = normalizeRate(speed);
        this.drill_COAS_DP_applyStateSpeed(this._drill_COAS_DP_stateSpeed);
    };
    Drill_COAS_MainController.prototype.drill_controllerMain_setStateSpeed = function(speed) {
        this.drill_COAS_setStateSpeed(speed);
    };
    Drill_COAS_MainController.prototype.drill_COAS_clearStateSpeed = function() {
        this._drill_COAS_DP_stateSpeed = null;
        this.drill_COAS_DP_applyStateSpeed(normalizeRate(this._drill_curSpeed));
    };
    Drill_COAS_MainController.prototype.drill_controllerMain_clearStateSpeed = function() {
        this.drill_COAS_clearStateSpeed();
    };

    Drill_COAS_MainController.prototype.drill_COAS_setActSpeed = function(speed) {
        this._drill_COAS_DP_actSpeed = normalizeRate(speed);
        this.drill_COAS_DP_applyActSpeed(this._drill_COAS_DP_actSpeed);
    };
    Drill_COAS_MainController.prototype.drill_controllerMain_setActSpeed = function(speed) {
        this.drill_COAS_setActSpeed(speed);
    };
    Drill_COAS_MainController.prototype.drill_COAS_clearActSpeed = function() {
        this._drill_COAS_DP_actSpeed = null;
        this.drill_COAS_DP_applyActSpeed(normalizeRate(this._drill_curSpeed));
    };
    Drill_COAS_MainController.prototype.drill_controllerMain_clearActSpeed = function() {
        this.drill_COAS_clearActSpeed();
    };

    Drill_COAS_MainController.prototype.drill_COAS_setStateAttackSpeedPercent = function(percent) {
        this.drill_COAS_setStateSpeed(rateFromAttackSpeedPercent(percent));
    };
    Drill_COAS_MainController.prototype.drill_COAS_setActAttackSpeedPercent = function(percent) {
        this.drill_COAS_setActSpeed(rateFromAttackSpeedPercent(percent));
    };
    Drill_COAS_MainController.prototype.drill_COAS_setStateAttackSpeedValue = function(value) {
        this.drill_COAS_setStateSpeed(rateFromAttackSpeedValue(value));
    };
    Drill_COAS_MainController.prototype.drill_COAS_setActAttackSpeedValue = function(value) {
        this.drill_COAS_setActSpeed(rateFromAttackSpeedValue(value));
    };

    Drill_COAS_MainController.prototype.drill_COAS_DP_stateSpeed = function() {
        if (this._drill_COAS_DP_stateSpeed === null ||
            this._drill_COAS_DP_stateSpeed === undefined) {
            return normalizeRate(this._drill_curSpeed);
        }
        return normalizeRate(this._drill_COAS_DP_stateSpeed);
    };

    Drill_COAS_MainController.prototype.drill_COAS_DP_actSpeed = function() {
        if (this._drill_COAS_DP_actSpeed === null ||
            this._drill_COAS_DP_actSpeed === undefined) {
            return normalizeRate(this._drill_curSpeed);
        }
        return normalizeRate(this._drill_COAS_DP_actSpeed);
    };

    Drill_COAS_MainController.prototype.drill_COAS_DP_applyStateSpeed = function(speed) {
        if (!this._drill_node_curController ||
            typeof this.drill_controllerMain_Node_getCurState_Private !== "function") {
            return;
        }
        var state = this.drill_controllerMain_Node_getCurState_Private();
        if (state !== undefined && state !== null) {
            state._drill_curSpeed = normalizeRate(speed);
        }
    };

    Drill_COAS_MainController.prototype.drill_COAS_DP_applyActSpeed = function(speed) {
        var act = this._drill_act_curController;
        if (act !== undefined && act !== null) {
            act._drill_curSpeed = normalizeRate(speed);
        }
    };

    Drill_COAS_MainController.prototype.drill_controllerMain_updateSpeed = function() {
        this.drill_COAS_DP_applyStateSpeed(this.drill_COAS_DP_stateSpeed());
        this.drill_COAS_DP_applyActSpeed(this.drill_COAS_DP_actSpeed());
    };

    // -------------------------------------------------------------------------
    // 动作元生命周期
    // 原核心在更新前判断结束，导致动作末帧额外停留一个游戏帧。
    // 此处改为：更新 -> 输出末帧 -> 当帧结束动作。
    // -------------------------------------------------------------------------
    Drill_COAS_MainController.prototype.drill_controllerMain_updateAct = function() {
        if (this.drill_controllerMain_Act_isPlayingAct() === false) return;

        this._drill_act_interrupt = true;

        if (this._drill_act_curSerial !== this._drill_act_curController._drill_controllerSerial) {
            var dataAct = this.drill_controllerMain_getActData_ByName(this._drill_act_curName);
            if (dataAct !== undefined && dataAct !== null) {
                this._drill_act_curController.drill_controllerAct_resetData(
                    this._drill_sequenceData_id,
                    dataAct["id"]
                );
            }
            this._drill_act_curSerial = this._drill_act_curController._drill_controllerSerial;
        }

        // resetData会把子控制器倍率恢复为1，这里确保动作第一帧就使用目标倍率。
        this._drill_act_curController._drill_curSpeed = this.drill_COAS_DP_actSpeed();
        this._drill_act_curController.drill_controllerAct_update();

        this._drill_curBitmapName = this._drill_act_curController.drill_controllerAct_curBitmapName();
        this._drill_curBitmapPath = this._drill_act_curController.drill_controllerAct_curBitmapPath();
        this._drill_curBitmapTint = this._drill_act_curController.drill_controllerAct_curBitmapTint();
        this._drill_curBitmapSmooth = this._drill_act_curController.drill_controllerAct_curBitmapSmooth();

        if (this._drill_act_curController.drill_controllerAct_isEnd() === true) {
            this._drill_act_curName = "";
            this._drill_act_curSerial = -1;
        }
    };
})();
