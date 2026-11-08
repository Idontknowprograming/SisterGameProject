/*:
 * @target MZ
 * @plugindesc [v1.0] Hendrix Hotbar v2.0.6 旧版全局API兼容垫片
 * @author compat shim
 *
 * @help
 * ============================================================================
 * Hendrix_Hotbar_Creator v1.5.3a 曾暴露下列全局函数：
 *     setHotbarSlotVisible(slotName, visible)
 *     setHotbarSlotKeyVisible(slotName, visible)
 *     hideHotbarSlot(slotName) / showHotbarSlot(slotName)
 * 官方 MZ 版 v2.0.6 移除了它们，但本工程的 QJ-MPMZLib-Player.js、
 * QJ-MPMZLib-imoutoUtil.js 与公共事件仍在调用 → ReferenceError。
 *
 * 本垫片按旧版语义，在 v2.0.6 完全相同的 SceneManager._scene._skillUI._slots
 * （Map：slotName→slot 精灵；slot 含 _config / _buttonSprite / _buttonIconSprite /
 * visible，均与旧版一致）结构上重新实现这些函数，并把隐藏状态持久化到
 * $gameSystem（替代旧版 saveToSystem），存读档与场景重建后保持。
 *
 * 【加载顺序】必须放在 Hendrix_Hotbar_Creator 之后。
 * ============================================================================
 */

(() => {
    "use strict";

    // 旧版以 in-memory Set 跟踪、并镜像到 $gameSystem（存读档持久化）
    const _hiddenSlots = new Set();
    const _hiddenSlotKeys = new Set();

    function persist() {
        if (!window.$gameSystem) return;
        $gameSystem._hiddenSlots = Array.from(_hiddenSlots);
        $gameSystem._hiddenSlotKeys = Array.from(_hiddenSlotKeys);
    }

    function restoreFromSystem() {
        if (!window.$gameSystem) return;
        _hiddenSlots.clear();
        if (Array.isArray($gameSystem._hiddenSlots)) {
            $gameSystem._hiddenSlots.forEach(n => _hiddenSlots.add(n));
        }
        _hiddenSlotKeys.clear();
        if (Array.isArray($gameSystem._hiddenSlotKeys)) {
            $gameSystem._hiddenSlotKeys.forEach(n => _hiddenSlotKeys.add(n));
        }
    }

    function currentSlots() {
        const scene = SceneManager._scene;
        if (!scene || !scene._skillUI || !scene._skillUI._slots) return null;
        return scene._skillUI._slots;
    }

    // 等价旧版 applySlotKeyVisibility：切换槽上按键文字/图标精灵的可见性
    function applySlotKeyVisibility(slot) {
        if (!slot || !slot._config) return;
        const isVisible = !_hiddenSlotKeys.has(slot._config.Name);
        if (slot._buttonSprite) slot._buttonSprite.visible = isVisible;
        if (slot._buttonIconSprite) slot._buttonIconSprite.visible = isVisible;
    }

    // 场景重建后，2.0.6 以全可见重建 _skillUI，这里按持久化状态重新应用
    function reapplyAll() {
        const slots = currentSlots();
        if (!slots) return;
        slots.forEach((slot, name) => {
            if (_hiddenSlots.has(name)) slot.visible = false;
            applySlotKeyVisibility(slot);
        });
    }

    window.setHotbarSlotVisible = function (slotName, visible) {
        const slots = currentSlots();
        if (!slots) return false;
        const slot = slots.get(slotName);
        if (!slot) return false;
        slot.visible = !!visible;
        if (visible) _hiddenSlots.delete(slotName);
        else _hiddenSlots.add(slotName);
        persist();
        return true;
    };

    window.hideHotbarSlot = function (slotName) {
        return window.setHotbarSlotVisible(slotName, false);
    };

    window.showHotbarSlot = function (slotName) {
        return window.setHotbarSlotVisible(slotName, true);
    };

    window.setHotbarSlotKeyVisible = function (slotName, visible) {
        const slots = currentSlots();
        if (!slots) return false;
        const slot = slots.get(slotName);
        if (!slot) return false;
        if (visible) _hiddenSlotKeys.delete(slotName);
        else _hiddenSlotKeys.add(slotName);
        applySlotKeyVisibility(slot);
        persist();
        return true;
    };

    // ============================================================
    // 检测鼠标/触点当前是否落在某个【可见】快捷栏槽(按钮)上。
    //   用途：开放了快捷栏点击后，点按钮会同时触发攻击检测
    //   (QJ.MPMZ.tl.ex_playerMeleeAttackTrigger)。在攻击检测里先调用本函数，
    //   若返回 true 就跳过攻击，避免“点按钮=同时挥砍”的冲突。
    //   坐标系与 Hendrix 自身的点击命中判定一致：slot.x/y 为中心，
    //   对比 TouchInput.x/y（MZ 在悬停时也会实时更新，触屏则为点按位置）。
    // ------------------------------------------------------------
    //   isHoveringHotbar()        -> 是否落在任意可见槽上（布尔）
    //   getHoveredHotbarSlot()    -> 返回命中的槽名(字符串)，没有则 null
    // ============================================================
    function hotbarSlotAtPoint(x, y) {
        const slots = currentSlots();
        if (!slots) return null;
        let hitName = null;
        slots.forEach((slot, name) => {
            if (hitName || !slot || !slot.visible) return;
            const w = slot.width, h = slot.height;
            if (!w || !h) return;
            if (x >= slot.x - w / 2 && x <= slot.x + w / 2 &&
                y >= slot.y - h / 2 && y <= slot.y + h / 2) {
                hitName = name;
            }
        });
        return hitName;
    }

    window.isHoveringHotbar = function () {
        return hotbarSlotAtPoint(TouchInput.x, TouchInput.y) !== null;
    };

    window.getHoveredHotbarSlot = function () {
        return hotbarSlotAtPoint(TouchInput.x, TouchInput.y);
    };

    // ---- 场景重建后恢复隐藏状态 + 消除「切图黑屏期完整布局闪现」----
    // 关键时序：Hendrix v2.0.6 的槽并非在场景创建时就绪——它在【槽底图 bitmap 的异步
    // addLoadListener 回调】里才 this._slots.set + addChild（见 Hendrix createGridSlots，
    // ~2348 行）。底图未命中缓存时回调要晚几帧，这期间整条快捷栏以「所有槽默认可见」的
    // 未过滤布局渲染出来——这正是切图 / 退出设置返回地图时「完整布局闪现」的根源，因为
    // reapplyAll 只能等槽就位后才把平台不需要的槽隐藏掉。
    // 对策：在【本场景的隐藏过滤真正应用之前】，用 _hxReady 门控强制整条快捷栏不可见；
    // 槽就位 + reapplyAll 跑完后才解禁 → 快捷栏一出现即是过滤后的正确布局，无闪现。

    // Spriteset_SkillUI 在 Hendrix 闭包内、外部拿不到类名，按「取实例原型注入」的手法
    // （与 CL 光罩补丁一致）给它的 update 末尾套一层可见性门控。只需对原型打一次。
    let _gateProtoPatched = false;
    function installVisibilityGate(skillUI) {
        if (_gateProtoPatched || !skillUI) return;
        const proto = Object.getPrototypeOf(skillUI);
        if (!proto) return;
        _gateProtoPatched = true;
        if (proto._hxGatePatched) return;
        proto._hxGatePatched = true;
        const _update = proto.update;
        proto.update = function () {
            _update.call(this);                       // 先跑完 Hendrix 原逻辑（含把 this.visible 置为开关值）
            if (!this._hxReady) this.visible = false; // 过滤应用前：整条强制隐藏，盖住异步建槽窗口
        };
    }

    const _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function () {
        _Scene_Map_start.call(this);
        restoreFromSystem();
        this._hxCompatReapplied = false;
        this._hxGateFrames = 0;
        if (this._skillUI) {
            this._skillUI._hxReady = false;           // 新场景：先压住，等过滤
            installVisibilityGate(this._skillUI);     // _skillUI 在 create 阶段已就绪，此处装好门控
        }
    };

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function () {
        _Scene_Map_update.call(this);
        if (this._hxCompatReapplied) return;

        const ui = this._skillUI;
        if (ui) installVisibilityGate(ui);            // 兜底：start 时 _skillUI 若未就绪，这里补装

        if (ui && ui._slots && ui._slots.size > 0) {
            // 槽已异步就位 → 应用持久化的隐藏过滤，再解禁显示
            this._hxCompatReapplied = true;
            reapplyAll();
            ui._hxReady = true;                       // 解禁：下一帧 update 起正常显示，且已过滤
        } else if (++this._hxGateFrames > 180) {
            // 兜底：~3 秒仍未建出槽（异常）也别把快捷栏永久压住
            this._hxCompatReapplied = true;
            if (ui) ui._hxReady = true;
        }
    };
})();
