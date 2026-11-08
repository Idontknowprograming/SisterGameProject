//=============================================================================
// Shiroin_LCTShim.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc Drill_LayerCommandThread 退役垫片：管道公共事件改由 steupCEQJ 执行（并行=普通CEQJ，串行=lockFlow）。
 * @author shiroin
 *
 * @help
 * ■背景
 * Drill_LayerCommandThread（地图多线程）在本工程只被消费一个能力：
 * "以串行/并行方式执行公共事件"（drill_LCT_addPipeEvent）。这个能力
 * 由 QJ 的 steupCEQJ + Shiroin_CEQJLockFlow 完整覆盖，且 LCT 对
 * isAnyEventStarting 的包装妨碍热路径优化，故将其退役、由本垫片顶替。
 *
 * ■本垫片顶替的三个接口
 * 1. Imported.Drill_LayerCommandThread = true
 *    —— 让 Drill_GaugeButton 正常加载（其整体包裹在此检测里），
 *       让 Drill_SecretCode / Drill_OperateKeyCommonEvent 走管道分支。
 * 2. $gameMap.drill_LCT_addPipeEvent(data)（及 forceInsertPipeEvent）
 *    —— 消费方：上述三插件 + Armors.json(炸薯条#50) / States.json
 *       (性欲显现#56) 的 YEP Lunatic 脚本。并行→steupCEQJ；
 *       串行→steupCEQJ+lockFlow。
 * 3. MV 插件指令 ">地图多线程 : 串行执行/并行执行/强制插入串行执行 : 公共事件[n]"
 *    —— 消费方：Map054 两处事件指令（并行执行 公共事件[16]）。
 *
 * ■语义差异（已评估可接受）
 * LCT 的串行管道是队列制（多个串行依次执行）；lockFlow 是并发锁
 * （同时触发多个则并发运行、共同锁场）。本工程串行用例（I键物品栏/
 * K键技能栏/技能表按钮/图块截图秘籍）均为玩家手动触发的 UI 公共事件，
 * 锁场期间无法二次触发，实际无差异。
 *
 * ■注意
 * 1. 与 Drill_LayerCommandThread 互斥：检测到其启用时本垫片自动退出。
 * 2. 加载顺序：QJ-CoreMZ / Shiroin_CEQJLockFlow 之后，
 *    Drill_OperateKeyCommonEvent / Drill_SecretCode / Drill_GaugeButton 之前。
 * 3. 旧存档里 LCT 残留的管道对象（_drill_LCT_pipeEventTank）会被 MZ 的
 *    JsonEx 宽容解码为惰性普通对象，无副作用，无需处理。
 */

(function() {
'use strict';

if (typeof Imported === 'undefined') { window.Imported = {}; }
if (Imported.Drill_LayerCommandThread) {
    console.error('Shiroin_LCTShim: Drill_LayerCommandThread 仍在启用，垫片退出（二者互斥，请停用其一）。');
    return;
}
Imported.Drill_LayerCommandThread = true;

// 管道公共事件 → CEQJ --------------------------------------------------------

Game_Map.prototype.drill_LCT_addPipeEvent = function(data) {
    if (!data || data['type'] !== '公共事件') return;
    var id = Number(data['commonEventId'] || 0);
    if (!$dataCommonEvents[id]) return;
    if (!this.steupCEQJ) {
        console.error('Shiroin_LCTShim: 未找到 steupCEQJ（需要 QJ-CoreMZ）。');
        return;
    }
    if (data['pipeType'] === '串行') {
        this.steupCEQJ(id, 0, {lockFlow: true});
    } else {
        this.steupCEQJ(id, 0, {});
    }
};

Game_Map.prototype.drill_LCT_forceInsertPipeEvent = function(data) {
    this.drill_LCT_addPipeEvent(data);
};

// MV 插件指令兼容（MZ 原生 command356 → pluginCommand 通道）------------------

var _pluginCommand = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args) {
    _pluginCommand.call(this, command, args);
    if (command === '>地图多线程' || command === '>多线程') {
        if (args.length === 4) {
            var type = String(args[1]);
            var m = /公共事件\[(\d+)\]/.exec(String(args[3]));
            if (m) {
                var pipe = type.indexOf('串行') >= 0 ? '串行' : '并行';
                $gameMap.drill_LCT_addPipeEvent({
                    'type': '公共事件',
                    'pipeType': pipe,
                    'commonEventId': Number(m[1]),
                    'callBack_str': ''
                });
            }
        }
    }
};

})();
