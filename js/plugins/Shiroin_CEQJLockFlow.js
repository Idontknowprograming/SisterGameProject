//=============================================================================
// Shiroin_CEQJLockFlow.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc 给 QJ 的 steupCEQJ 增加流程控制参数：lockFlow 锁全图流程；waitCaller 阻塞调用它的事件页直到 CEQJ 结束。
 * @author shiroin
 *
 * @help
 * ■前提
 * 需要 QJ-CoreMZ.js（steupCEQJ 的真正定义所在）。
 * 本插件必须放在 QJ-CoreMZ.js（及 QJ-MapProjectileMZ.js）之后。
 *
 * ■lockFlow —— 锁住全图流程
 * steupCEQJ 走的是独立的 CEQJ 解释器（并行更新），所以默认不会像普通
 * 事件那样锁住玩家。reSetData 里写 lockFlow: true 时，该 CEQJ 运行期间
 * $gameMap.isEventRunning() 返回 true，玩家无法移动、无法呼出菜单、
 * 无法触发新事件——效果等同自动执行事件，直到该 CEQJ 结束自动解锁。
 *
 * ■waitCaller —— 阻塞调用它的那个事件页（v2 新增）
 * reSetData 里写 waitCaller: true 时，调用 steupCEQJ 的那个事件页会
 * 原地暂停（等待模式），直到该 CEQJ 结束才继续执行后面的指令——
 * 效果等同原生"调用公共事件"的子解释器阻塞，但不占公共事件列表，
 * 且保留 CEQJ 的全部优势（reSetData 传参、extraData、多实例并存）。
 * 其他事件与玩家操作不受影响（除非叠加 lockFlow）。
 *
 * 同一段脚本里连发多个 waitCaller 的 CEQJ，会等它们【全部】结束才
 * 继续（并行汇合）。CEQJ 里再 waitCaller 别的 CEQJ 也成立（可嵌套）。
 *
 * ■用法（把开关放进 reSetData 对象里，可与其它字段共存、两开关可叠加）
 * 事件页 CEQJ（Game_Event），reSetData 是第 2 个参数：
 *   $gameMap.event(3).steupCEQJ(2, {waitCaller: true});
 * 公共事件 CEQJ（Game_Map），reSetData 是第 3 个参数：
 *   $gameMap.steupCEQJ(10, 7, {waitCaller: true});
 *   $gameMap.steupCEQJ(10, 7, {waitCaller: true, lockFlow: true, foo: 1});
 *
 * ■等待地图装备窗口关闭
 * 在 MapSelectEquip 指令之后的事件脚本中调用：
 *   this.waitForMapSelectEquip();
 * 当前解释器等待窗口完全关闭后再继续；窗口不存在或已离开地图时放行。
 * 此接口不创建 CEQJ，不锁地图，也不改变 waitCaller / lockFlow 的行为。
 *
 * ■注意
 * 1. waitCaller 只能在事件指令执行期间调用（事件页/公共事件/CEQJ 的
 *    脚本指令里）。在其它上下文（如 update 钩子）调用会找不到调用者，
 *    自动退化为普通并行 CEQJ 并在控制台给出警告。
 * 2. 若 CEQJ 死循环不结束，调用页会一直等（与死循环公共事件同理）。
 *    外部把该 CEQJ terminate 掉（如清场）时，调用页会自动解锁。
 * 3. 调用页恢复比原生公共事件调用晚约 1 帧，演出场景无感。
 * 4. lockFlow 型死循环会永久锁住玩家，请确保事件页能走到末尾。
 */

(function() {
'use strict';

if (typeof Game_Map === 'undefined' || !Game_Map.prototype.steupCEQJ) {
    console.error('Shiroin_CEQJLockFlow: 未找到 steupCEQJ，请确认本插件位于 QJ-CoreMZ.js 之后。');
    return;
}

// 给刚创建并入队的 CEQJ 解释器应用流程控制标记 -------------------------------
// steupCEQJ 内部会把新解释器 push 到 _commonEventQJ 末尾，这里取出末元素处理。

function applyFlowFlags(itp, reSetData) {
    if (!itp) return;
    if (reSetData.lockFlow) {
        itp._lockFlowQJ = true;
        // 脏标记：只表示"可能有锁，需要扫描"。isEventRunning 发现锁已全部
        // 结束时会自行清掉，因此换图/清场/读档都不会造成标记漂移。
        if ($gameMap) $gameMap._lockFlowHintQJ = true;
    }
    if (reSetData.waitCaller) attachWaitCaller(itp);
}

// waitCaller：调用者(QJ.Pointer=当前正在执行指令的解释器)进入等待模式，
// 通过序列号句柄认领这个 CEQJ。用序列号而非直接引用，是因为 JsonEx 存档
// 不保共享引用——直接引用在读档后会与 _commonEventQJ 里那份克隆成两个
// 对象导致死等；序列号是纯数字，读档后照常扫描认领。

function attachWaitCaller(itp) {
    if (itp.overLifeQJ) return; // 空指令列表等场合已即刻结束，无需等待
    var caller = QJ.Pointer;
    if (!(caller instanceof Game_Interpreter) || !caller.isRunning() || !$gameSystem) {
        console.warn('Shiroin_CEQJLockFlow: waitCaller 找不到有效的调用者解释器' +
            '（须在事件指令执行期间调用），已按普通并行 CEQJ 处理。');
        return;
    }
    $gameSystem._ceqjWaitSerialQJ = ($gameSystem._ceqjWaitSerialQJ || 0) + 1;
    var serial = $gameSystem._ceqjWaitSerialQJ;
    itp._waitSerialQJ = serial;
    if (!caller._waitCEQJSerialsQJ) caller._waitCEQJSerialsQJ = [];
    caller._waitCEQJSerialsQJ.push(serial);
    caller.setWaitMode('ceqjQJ');
}

var _Game_Event_steupCEQJ = Game_Event.prototype.steupCEQJ;
Game_Event.prototype.steupCEQJ = function(value, reSetData, extraData) {
    var before = this._commonEventQJ.length;
    _Game_Event_steupCEQJ.call(this, value, reSetData, extraData);
    if (reSetData && this._commonEventQJ.length > before) {
        applyFlowFlags(this._commonEventQJ[this._commonEventQJ.length - 1], reSetData);
    }
};

var _Game_Map_steupCEQJ = Game_Map.prototype.steupCEQJ;
Game_Map.prototype.steupCEQJ = function(value, eid, reSetData, extraData) {
    var before = this._commonEventQJ.length;
    _Game_Map_steupCEQJ.call(this, value, eid, reSetData, extraData);
    if (reSetData && this._commonEventQJ.length > before) {
        applyFlowFlags(this._commonEventQJ[this._commonEventQJ.length - 1], reSetData);
    }
};

// waitCaller 的等待判定 ------------------------------------------------------
// 扫描只在等待期间发生（_waitMode 为 'ceqjQJ' 的解释器），常态开销仅为
// updateWaitMode 里的一次字符串比较。"查不到即放行"：CEQJ 被外部清场
// terminate、或读档后找不到活体时，调用页自动解锁而不是死等。

var _Game_Interpreter_updateWaitMode = Game_Interpreter.prototype.updateWaitMode;
Game_Interpreter.prototype.updateWaitMode = function() {
    if (this._waitMode === 'mapSelectEquipQJ') {
        var scene = SceneManager._scene;
        var win = scene instanceof Scene_Map && scene._MapSelectEquipWindow;
        if (win && !win.isClosed()) return true;
        this._waitMode = '';
        return false;
    }
    if (this._waitMode === 'ceqjQJ') {
        if (this.updateWaitCEQJ()) return true;
        this._waitMode = '';
        return false;
    }
    return _Game_Interpreter_updateWaitMode.call(this);
};

// 窗口等待只读取关闭状态，不扫描 CEQJ 队列或执行事件循环。
Game_Interpreter.prototype.waitForMapSelectEquip = function() {
    this.setWaitMode('mapSelectEquipQJ');
};

Game_Interpreter.prototype.updateWaitCEQJ = function() {
    var serials = this._waitCEQJSerialsQJ;
    if (!serials || serials.length === 0 || !$gameMap) {
        this._waitCEQJSerialsQJ = null;
        return false;
    }
    var alive = null;
    var collect = function(list) {
        if (!list) return;
        for (var i = 0; i < list.length; i++) {
            var itp = list[i];
            if (itp && !itp.overLifeQJ && itp._waitSerialQJ) {
                if (!alive) alive = {};
                alive[itp._waitSerialQJ] = true;
            }
        }
    };
    collect($gameMap._commonEventQJ);
    // 直取 _events 避免 events() 的数组分配；跳过 _erased：本工程
    // Drill_CoreOfEventManager 的 updateEvents 不再更新被清除的事件，
    // 其 CEQJ 永久冻结，若算作活体会让调用页死等。
    var events = $gameMap._events;
    if (events) {
        for (var j = 0; j < events.length; j++) {
            var ev = events[j];
            if (ev && !ev._erased) collect(ev._commonEventQJ);
        }
    }
    for (var k = serials.length - 1; k >= 0; k--) {
        if (!alive || !alive[serials[k]]) serials.splice(k, 1);
    }
    if (serials.length === 0) {
        this._waitCEQJSerialsQJ = null;
        return false;
    }
    return true;
};

// 是否存在正在运行的"锁定型"CEQJ ------------------------------------------
// overLifeQJ 在解释器 terminate() 时置真，下一帧被移出数组，锁随之释放。

function hasLockingItp(list) {
    if (!list) return false;
    for (var i = 0; i < list.length; i++) {
        var itp = list[i];
        if (itp && itp._lockFlowQJ && !itp.overLifeQJ) return true;
    }
    return false;
}

Game_Map.prototype.isLockingCEQJ = function() {
    if (hasLockingItp(this._commonEventQJ)) return true;
    // 直取 _events 避免 events() 的数组分配；跳过 _erased（同 updateWaitCEQJ：
    // 被清除的事件不再更新，冻结的 lockFlow CEQJ 若算作活锁会永久锁图）。
    var events = this._events;
    if (events) {
        for (var i = 0; i < events.length; i++) {
            var ev = events[i];
            if (ev && !ev._erased && hasLockingItp(ev._commonEventQJ)) return true;
        }
    }
    return false;
};

// 锁定期间让 isEventRunning 返回 true → 玩家无法移动/呼菜单/触发新事件 --------
// isEventRunning 是每帧多次调用的热函数：无脏标记时一次布尔判断直接返回，
// 有标记才扫描；扫描发现锁已全部结束就清掉标记（自愈），回到快路径。

var _Game_Map_isEventRunning = Game_Map.prototype.isEventRunning;
Game_Map.prototype.isEventRunning = function() {
    if (_Game_Map_isEventRunning.call(this)) return true;
    if (!this._lockFlowHintQJ) return false;
    if (this.isLockingCEQJ()) return true;
    this._lockFlowHintQJ = false;
    return false;
};

})();
