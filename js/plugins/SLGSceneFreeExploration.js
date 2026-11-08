//=============================================================================
// SLGSceneFreeExploration.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc v0.7.0 自由探索场景：基于 QJ-MapProjectileMZ 的动态交互按钮框架
 * @author Shiroin
 * @base QJ-MapProjectileMZ
 * @orderAfter QJ-MapProjectileMZ
 *
 * @param hoverEffect
 * @text 悬停效果
 * @type select
 * @option 背景贴图
 * @value background
 * @option 旧版按钮叠图
 * @value legacy
 * @option 关闭
 * @value none
 * @default background
 *
 * @param hoverBackgroundImage
 * @text 悬停背景贴图
 * @type file
 * @dir img/projectiles/
 * @default imoutoUtil/buttonBackground
 *
 * @param hoverBackgroundOpacity
 * @text 悬停背景透明度
 * @type number
 * @decimals 2
 * @min 0
 * @max 1
 * @default 1
 *
 * @help
 * SLGSceneFreeExploration.js
 *
 * 本插件不会替换或关闭 Drill_GaugeButton。它提供一套独立的、使用
 * QJ-MapProjectileMZ 绘制的地图按钮 API。
 * 监听由一颗隐形 QJ 子弹的 moveF 驱动，每次执行后间隔 1 帧；不存在已注册
 * 按钮时不会创建监听器。命中仅比较贴图矩形，不查询 QJ 碰撞，不检测透明像素。
 * 三类按钮共用“悬停效果”插件参数，默认显示 buttonBackground 背景。
 * background：仅用于 topLeft / bottomLeft，悬停任一按钮时，其所属分类中
 * 显示且可用、开启自动悬停效果的按钮一起显示背景；移出整组后延迟 2 秒隐藏。
 * 使用分类共用的 setTimeout，重新悬停该分类即取消；隐藏、失活、注销或读档时取消。
 * 左下角失活前仍在延时显示的背景也保留，恢复可用后重新判断悬停。
 * $gameSwitches._data[8] 为 false：简洁 UI，使用上述悬停规则。
 * 为 true：完整 UI，仅 bottomLeft 背景随按钮常驻，失活时仍保留；
 * topLeft 始终使用简洁模式的悬停、延迟隐藏及淡化规则；scene 类不显示 buttonBackground。
 * 完整模式跳过左下角背景的悬停计时，切换模式仅取消左下角旧计时。
 * 完整模式下 hoverOverlay 单按钮自动悬停开关不影响常驻背景；全局 legacy / none 模式仍有效。
 * 按钮自身隐藏、对话隐藏标记和点击判定保持原规则。
 * 背景淡入、淡出均为 20 帧；2 秒停留结束后开始淡出，中途重新悬停从当前透明度淡入。
 * 仅在淡化期间挂接渲染变换回调，完成即移除；不新增常驻 update 或计时子弹。
 * 使用原尺寸背景，跟随各按钮锚点、缩放和淡化，以正常混合模式绘制。
 * legacy：沿用各按钮的悬停/按住贴图及透明度、混合模式；省略贴图时复用按钮当前帧。
 * none：关闭全部悬停叠图（包括手动 showHoverOverlay），悬停音效和点击行为不变。
 * 两种贴图均绘制在对应按钮下方（同位置的背后，不是向下偏移），不改变命中范围。
 * 左下角按钮因对话/选项失活但仍显示时，整组保留已出现的背景，恢复可用后重新判断悬停。
 * 隐藏或注销按钮仍清理背景；此保留规则仅用于 background 模式。
 * 左下角按钮因对话隐藏后，设置 $gameTemp._slgSfeBottomLeftMessageHidden = true。
 * 标记存在时整组保持隐藏，包括单独选项期间；重新注册按钮也不会解除。
 * QJ 事件队列、地图主解释器及待启动事件均结束，且 $gameMessage.isBusy() 为 false 时，
 * 自动删除标记，恢复原显示条件。事件先隐藏按钮、随后显示对话的流程同样建立标记。
 * 也可手动赋值 false 或 delete $gameTemp._slgSfeBottomLeftMessageHidden。
 * 使用可复用的普通 Sprite，不创建额外子弹。
 * 鼠标/触屏按下时仅检查一次 SceneButton 区域，命中后整次按压不传给对话框。
 * 拦截不区分按钮显隐、禁用或冷却状态；注销后不再占位。对话框已隐藏时放行恢复点击。
 * 长按只读取缓存标记，不为对话拦截增加逐帧命中检查；按钮自身仍读取原始输入。
 * 长按按钮通过 Input.isPressed 合并输入，不修改键盘或 QJ 虚拟键的按下状态。
 * 请在事件中调用 Buttons.initialize(...) 或
 * Buttons.register(...) 手动初始化，并在不再使用时调用 Buttons.clear()。
 *
 * 最小示例：
 *
 * SLGSceneFreeExploration.Buttons.register("talk", {
 *   image: "ui/talk",
 *   hoverOverlayImage: "ui/talk_hover", // 仅 legacy 模式使用；可省略以复用按钮贴图
 *   x: Graphics.width - 80,
 *   y: Graphics.height / 2,
 *   hitWidth: 72,
 *   hitHeight: 72,
 *   visibleCondition: "$gameSwitches.value(20)",
 *   onClick: "$gameMap.steupCEQJ(81, { lockFlow: true });"
 * });
 *
 * 同一按钮按情景执行不同脚本：
 *
 * SLGSceneFreeExploration.Buttons.addAction(
 *   "talk", "night", "$gameVariables.value(10) >= 18",
 *   "QJ.MPMZ.tl.openNightTalk();", 100
 * );
 * SLGSceneFreeExploration.Buttons.addAction(
 *   "talk", "default", true,
 *   "QJ.MPMZ.tl.openDayTalk();", 0
 * );
 *
 * 常用脚本 API：
 *   Buttons.initialize(configs)             // 清理旧按钮后注册本场景按钮
 *   Buttons.initializeSceneButtons()       // 场景切换：清空场景小按钮、重建左下角，保留左上角
 *   Buttons.initializeExplorationButtons()  // 仅重建 bottomLeft 布局的探索、设置、存档按钮
 *   Buttons.initializeEventFunctionButton() // 追加左上角快进、返回、隐藏 UI 按钮
 *   Buttons.initializeRpgButtons()          // 初始化 RPG 左上角通用按钮组，清理旧场景按钮
 *   Buttons.register(id, config) / registerMany(configs)
 *     scene 分类仅属于注册时的地图；跨地图恢复时自动注销，同地图读档仍可恢复。
 *   Buttons.registerBottomLeft(id, config)  // 按需加入左下角自动布局
 *   Buttons.registerTopLeft(id, config)     // 按需加入左上角功能按钮组，对话和选项期间可用
 *   Buttons.configureLayout("bottomLeft", options)
 *   Buttons.update(id, patch) / unregister(id) / clear()
 *   Buttons.clearCategory("scene")          // 按类别注销：scene / bottomLeft / topLeft
 *   Buttons.clearAll()                       // clear() 的同义方法，一键清理全部场景按钮
 *   Buttons.show(id) / hide(id) / enable(id) / disable(id)
 *   Buttons.resetState(id)
 *   Buttons.setPosition(id, x, y)
 *   Buttons.setImages(id, normal, hover, pressed)
 *   Buttons.showHoverOverlay(id) / hideHoverOverlay(id) // 仅供手动视觉演出
 *   Buttons.startCooldown(frames) / isCoolingDown()      // 全按钮公共冷却
 *   Buttons.saveSession() / savedSession()                // 手动同步/查看自动保存的按钮配置
 *   Buttons.restoreSavedSession()                         // 读档公共事件中显式恢复按钮
 *   Buttons.suspendRuntime()                              // 换世界前停放按钮运行状态，返回内存快照
 *   Buttons.restoreRuntime(snapshot)                      // 清理临时世界并还原原 $gameMap 后恢复快照
 *   Buttons.setAction(id, callbackOrScript)
 *   Buttons.addAction(id, key, condition, callbackOrScript, priority)
 *   Buttons.removeAction(id, key)
 *   Buttons.refresh(id)
 *
 * config 重要字段：
 *   image                           : QJ 弹幕贴图名或贴图参数
 *   hoverOverlayImage / hoverImage  : legacy 模式叠图（img/projectiles 下），hoverImage 为别名
 *   pressedImage                    : legacy 模式可选的按住时叠图文件名
 *   x / y                           : 数值或每帧求值的函数
 *   scale / scaleX / scaleY         : 缩放倍率
 *   screenSpace                     : 默认 false；true 时坐标/尺寸使用屏幕像素，抵消地图缩放
 *   anchor / anchorX / anchorY      : 锚点
 *   hitWidth / hitHeight            : 自定义矩形宽高；省略时使用当前贴图帧尺寸
 *   visible / enabled               : 初始显示、可用状态
 *   visibleCondition/enabledCondition: 布尔值、函数或 JS 表达式字符串
 *   hideDuringMessage               : 对话期间隐藏，默认 true
 *   hideDuringEvent                 : 事件执行期间隐藏，默认 true
 *   hideDuringMapSelect             : 装备栏、技能栏打开时隐藏，默认 false
 *   persist                         : 默认 true；false 时配置和显隐状态均不写入存档
 *   triggerOnRelease                : 默认 false；true 时按下捕获按钮、松开触发
 *   holdKey                         : 按住期间视为按下此键名，替代 onClick；移出按钮后停止
 *   updateDuringCooldown            : 默认 false；true 时冷却期间也更新显隐
 *   autoHide                        : 设为 false 可关闭上述自动隐藏
 *   fadeFrames                      : 显示/隐藏的淡化帧数，默认 20；设为 0 时瞬间切换
 *   hoverTone / disabledTone        : [r,g,b,gray]，默认悬停提亮
 *   hoverOverlayOpacity/blendMode   : legacy 模式透明度、混合模式，默认 0.6 / 1（加法提亮）
 *   hoverOverlay                    : 默认 true；false 关闭自动叠图，仍可用手动 API
 *   hoverOverlayTone                : 叠图色调，默认 [0,0,0,0]
 *   hoverSe / clickSe               : SE 对象、文件名，或 "cursor" / "ok"
 *   showDuringChoice                : 选项框激活时保持显示，默认 true
 *   disableDuringChoice             : 选项框激活时禁止点击，默认 true
 *   cooldownFrames                  : 点击后的公共冷却帧数，默认 30
 *   layout                          : "bottomLeft" / "topLeft" 自动排列；省略则使用 x/y
 *   layoutOrder                     : 自动布局中的排序权重，数字小的在前
 *   onClick                         : 函数或 JS 语句字符串
 *   actions                         : [{key, when, run, priority}, ...]
 *
 * 表达式/脚本中的 $button 是按钮运行实例，$context 是当前场景信息。
 * 按钮按布局自动分类：registerBottomLeft 为 bottomLeft，registerTopLeft 为 topLeft；
 * register 创建的按钮未指定上述布局时归入 scene（场景小按钮），不按坐标或按钮 ID 判断。
 * 场景切换先调用 initializeSceneButtons()，再用 registerBottomLeft/register 登记新场景按钮。
 * 此操作不重建左上角按钮；只清空小按钮可调用 clearCategory("scene")。
 * 按钮的纯配置及插件命令修改的显示/可用状态保存在 $gameSystem 中，
 * 可随存档保存。按钮配置中若仍含函数或循环引用，会报警并放弃该次配置快照。
 * 需要在游戏自己的读档公共事件中显式调用 Buttons.restoreSavedSession()；
 * 本插件不会覆写 DataManager、Scene_Map 等引擎流程来自动触发恢复。
 * 恢复时重新绑定已有按钮实体，仅补建缺失按钮；地图刷新后仍使用配置快照重建。
 *
 * RPG 模式（由玩家绑定器重建流程显式调用，不自动改写旧事件）：
 *   SLGSceneFreeExploration.Buttons.initializeRpgButtons();
 * 按钮 ID：rpgItem / rpgSkill / rpgReturnHome / rpgOptions。
 * 默认复刻 Drill 参数按钮 1～4，使用原贴图、坐标和公共事件执行方式。
 * RPG 按钮默认 screenSpace: true，战斗地图的 2 倍缩放不改变按钮位置和大小。
 * 对话（含选项/物品选择）、装备栏、技能栏打开时隐藏；普通事件执行不隐藏。
 * 四个按钮不保存配置或手动状态，重复初始化会重置。可传入同名 ID 的配置覆盖项。
 * 接入时应移除旧按钮 1～4 的显示指令，避免两套按钮重叠。
 * 换装事件暂停弹幕时须跳过 SceneButton 分组（含监听器），否则无法检测窗口并隐藏。
 *
 * 事件功能按钮（与左下角探索按钮独立，初始化顺序不限）：
 *   SLGSceneFreeExploration.Buttons.initializeEventFunctionButton();
 * ID：eventFastForward / eventReturn / eventHideUi。默认首位 (100,50)，间隔 160，使用屏幕坐标。
 * 可传 {startX, y, spacingX, eventFastForward: {...}, eventReturn: {...}, eventHideUi: {...}} 覆盖配置。
 * 快进按住即生效，使用本项目 Ctrl 对应的 pagedown；返回执行并行公共事件 63。
 * 三个按钮在所有终端可用；选项禁止取消时隐藏返回键，否则检查开关 46、选项、物品选择、装备栏和技能栏。
 * 仅有对话选项、文本框未打开时，PC 不显示选项对应的返回/隐藏按钮，移动端可以显示。
 * 隐藏 UI 按钮在文本或对话选项出现时显示，松开时调用 MessageWindowHidden.hideAllWindow。
 * Drill_DialogChoiceButton 的选项也随隐藏 UI 一起隐藏、暂停，恢复时保留原选项状态。
 * 对话框隐藏时一起隐藏并暂停 SceneButton 分组；恢复时还原，不修改按钮的手动显隐配置。
 * topLeft 按注册顺序排列，只给可见按钮留位。手动加入本组示例：
 *   Buttons.registerTopLeft("Xray", { image: "imoutoUtil/XrayShowSceneButton",
 *     onClick() { $gameMap.steupCEQJ(62, 1); } });
 * registerTopLeft 默认使用屏幕坐标、开启悬停叠图、不自动隐藏、不保存配置。
 * 无需先初始化快进/返回按钮；生成后默认一直显示，用 hide/show/unregister 主动控制。
 * 可传 visibleCondition 等常规配置覆盖默认行为，onClick 支持函数或脚本字符串。
 *
 * @command showButton
 * @text 显示按钮
 * @arg id
 * @text 按钮 ID
 * @type string
 *
 * @command hideButton
 * @text 隐藏按钮
 * @arg id
 * @text 按钮 ID
 * @type string
 *
 * @command enableButton
 * @text 启用按钮
 * @arg id
 * @text 按钮 ID
 * @type string
 *
 * @command disableButton
 * @text 禁用按钮
 * @arg id
 * @text 按钮 ID
 * @type string
 *
 * @command resetButtonState
 * @text 重置按钮显示/可用状态
 * @arg id
 * @text 按钮 ID
 * @type string
 */

(() => {
    "use strict";

    const pluginName = "SLGSceneFreeExploration";
    const parameters = PluginManager.parameters(pluginName);
    const HOVER_EFFECT = parameters.hoverEffect || "background";
    const HOVER_BACKGROUND_IMAGE = parameters.hoverBackgroundImage || "imoutoUtil/buttonBackground";
    const HOVER_BACKGROUND_OPACITY = Number(parameters.hoverBackgroundOpacity || "1");
    const root = window.SLGSceneFreeExploration = window.SLGSceneFreeExploration || {};
    const SCENE_BUTTON_GROUP = "SceneButton";
    const GROUP_PREFIX = "SLGSFE_BUTTON_";
    const BUTTON_GROUP = "SLGSFE_BUTTONS";
    const LISTENER_GROUP = "SLGSFE_BUTTON_LISTENER";
    const DEFAULT_COOLDOWN_FRAMES = 12;
    const DEFAULT_FADE_FRAMES = 20;
    const definitions = new Map();
    const DEFAULT_LAYOUTS = {
        bottomLeft: { startX: 100, startY: 1020, spacingX: 160, spacingY: 0 },
        topLeft: { startX: 100, startY: 50, spacingX: 160, spacingY: 0, visibleOnly: true }
    };
    const layouts = new Map();
    const expressionCache = new Map();
    let registrationSerial = 0;
    const backgroundHideTimers = new Map();
    let backgroundHoveredCategory = null;
    let backgroundFullUiMode = false;
    let hoveredId = null;
    let pressedId = null;
    let pressedMapId = 0;
    let listenerBullet = null;
    let currentTick = null;
    let bottomLeftMessageHideActive = false;
    let pointerWasPressed = false;
    let cooldownUntilFrame = 0;
    let restoringSession = false;

    function resetLayoutsToDefaults() {
        layouts.clear();
        for (const name of Object.keys(DEFAULT_LAYOUTS)) {
            layouts.set(name, Object.assign({}, DEFAULT_LAYOUTS[name]));
        }
    }

    resetLayoutsToDefaults();

    function warn(message, error) {
        console.warn(`[${pluginName}] ${message}`, error || "");
    }

    function cloneArray(value, fallback) {
        return Array.isArray(value) ? value.slice() : fallback.slice();
    }

    function copyQjValue(value) {
        if (window.QJ && typeof QJ.makeDeepCopy === "function") return QJ.makeDeepCopy(value);
        if (Array.isArray(value)) return value.map(copyQjValue);
        if (value && typeof value === "object") return Object.assign({}, value);
        return value;
    }

    function normalizeSe(value, defaultVolume) {
        if (!value) return null;
        if (value === "cursor" || value === "ok") return { system: value };
        if (typeof value === "string") {
            return { name: value, volume: defaultVolume, pitch: 100, pan: 0 };
        }
        return {
            name: String(value.name || ""),
            volume: Number(value.volume ?? defaultVolume),
            pitch: Number(value.pitch ?? 100),
            pan: Number(value.pan ?? 0)
        };
    }

    function normalizeLayout(value, order) {
        if (!value) return null;
        const layout = typeof value === "string" ? { name: value } : Object.assign({}, value);
        layout.name = String(layout.name || layout.type || "");
        if (!layout.name) return null;
        const rawOrder = order ?? layout.order;
        if (rawOrder == null || rawOrder === "") {
            layout.order = null;
        } else {
            const normalizedOrder = Number(rawOrder);
            layout.order = Number.isFinite(normalizedOrder) ? normalizedOrder : null;
        }
        return layout;
    }

    function normalizeConfig(id, source) {
        const data = Object.assign({}, source || {});
        const scale = data.scale ?? 1;
        const anchor = Array.isArray(data.anchor) ? data.anchor : [0.5, 0.5];
        data.id = String(id);
        data.layout = normalizeLayout(data.layout, data.layoutOrder);
        const layoutName = data.layout?.name;
        data.category = layoutName === "bottomLeft" || layoutName === "topLeft" ? layoutName : "scene";
        data.image = data.image ?? "null1";
        // 尚未显示的自动排列按钮也从本组起点占位，避免误拦截屏幕原点。
        const layout = layouts.get(data.layout?.name);
        data.x = data.x ?? layout?.startX ?? 0;
        data.y = data.y ?? layout?.startY ?? 0;
        data.scaleX = Number(data.scaleX ?? (Array.isArray(scale) ? scale[0] : scale));
        data.scaleY = Number(data.scaleY ?? (Array.isArray(scale) ? scale[1] : scale));
        data.screenSpace = data.screenSpace === true;
        data.anchorX = Number(data.anchorX ?? anchor[0]);
        data.anchorY = Number(data.anchorY ?? anchor[1]);
        data.opacity = Number(data.opacity ?? 1);
        data.hoverOpacity = Number(data.hoverOpacity ?? data.opacity);
        data.disabledOpacity = Number(data.disabledOpacity ?? Math.min(data.opacity, 0.55));
        data.hoverTone = cloneArray(data.hoverTone, [48, 48, 48, 0]);
        data.normalTone = cloneArray(data.normalTone, [0, 0, 0, 0]);
        data.disabledTone = cloneArray(data.disabledTone, [-64, -64, -64, 96]);
        data.hoverOverlay = data.hoverOverlay !== false;
        data.hoverOverlayOpacity = Number(data.hoverOverlayOpacity ?? 0.6);
        data.hoverOverlayBlendMode = Number(data.hoverOverlayBlendMode ?? 1);
        data.hitWidth = Math.max(0, Number(data.hitWidth ?? 0));
        data.hitHeight = Math.max(0, Number(data.hitHeight ?? 0));
        data.z = data.z ?? "A";
        data.visible = data.visible !== false;
        data.enabled = data.enabled !== false;
        data.autoHide = data.autoHide !== false;
        data.fadeFrames = Math.max(0, Number(data.fadeFrames ?? DEFAULT_FADE_FRAMES));
        data.hideDuringMessage = data.hideDuringMessage !== false;
        data.hideDuringEvent = data.hideDuringEvent !== false;
        data.hideDuringMapSelect = data.hideDuringMapSelect === true;
        data.persist = data.persist !== false;
        data.triggerOnRelease = data.triggerOnRelease === true;
        data.updateDuringCooldown = data.updateDuringCooldown === true;
        data.showDuringChoice = data.showDuringChoice !== false;
        data.disableDuringChoice = data.disableDuringChoice !== false;
        data.cooldownFrames = Math.max(0, Number(data.cooldownFrames ?? DEFAULT_COOLDOWN_FRAMES));
        data.hoverSe = normalizeSe(data.hoverSe, 70);
        data.clickSe = normalizeSe(data.clickSe, 80);
        data.actions = Array.isArray(data.actions) ? data.actions.slice() : [];
        return data;
    }

    function reflowLayout(name) {
        const settings = layouts.get(String(name));
        if (!settings) return;
        const buttons = Array.from(definitions.values())
            .filter(button => button.config.layout && button.config.layout.name === name &&
                (!settings.visibleOnly || button.shown))
            .sort((a, b) => {
                const ao = a.config.layout.order;
                const bo = b.config.layout.order;
                if (ao != null || bo != null) return (ao ?? Infinity) - (bo ?? Infinity) || a.registrationSerial - b.registrationSerial;
                return a.registrationSerial - b.registrationSerial;
            });
        buttons.forEach((button, index) => {
            button.config.x = settings.startX + settings.spacingX * index;
            button.config.y = settings.startY + settings.spacingY * index;
        });
    }

    function reflowAllLayouts() {
        for (const name of layouts.keys()) reflowLayout(name);
    }

    function contextFor(button) {
        const tick = currentTick;
        return {
            id: button.id,
            button,
            scene: SceneManager._scene,
            mapId: tick ? tick.mapId : (window.$gameMap ? $gameMap.mapId() : 0),
            messageBusy: tick ? tick.messageBusy : !!(window.$gameMessage && $gameMessage.isBusy()),
            get choiceActive() { return tick ? tick.choiceActive : choiceWindowIsActive(); },
            eventRunning: tick ? tick.eventRunning : eventIsRunning(),
            pointerX: tick ? tick.pointerX : TouchInput.x,
            pointerY: tick ? tick.pointerY : TouchInput.y
        };
    }

    function compiledExpression(code) {
        const key = `expr:${code}`;
        if (!expressionCache.has(key)) {
            expressionCache.set(key, new Function("$context", "$button", `return !!(${code});`));
        }
        return expressionCache.get(key);
    }

    function compiledScript(code) {
        const key = `script:${code}`;
        if (!expressionCache.has(key)) {
            expressionCache.set(key, new Function("$context", "$button", String(code)));
        }
        return expressionCache.get(key);
    }

    function evaluateCondition(rule, button, defaultValue) {
        if (rule == null) return defaultValue;
        try {
            const context = contextFor(button);
            if (typeof rule === "function") return !!rule.call(button.bullet || button, context, button);
            if (typeof rule === "string") return !!compiledExpression(rule).call(button.bullet || button, context, button);
            return !!rule;
        } catch (error) {
            warn(`按钮“${button.id}”的条件执行失败。`, error);
            return false;
        }
    }

    function evaluateValue(value, button, fallback) {
        try {
            const result = typeof value === "function"
                ? value.call(button.bullet || button, contextFor(button), button)
                : value;
            const number = Number(result);
            return Number.isFinite(number) ? number : fallback;
        } catch (error) {
            warn(`按钮“${button.id}”的动态数值执行失败。`, error);
            return fallback;
        }
    }

    function stateStore() {
        if (!window.$gameSystem) return null;
        $gameSystem._slgSfeButtonStates = $gameSystem._slgSfeButtonStates || {};
        return $gameSystem._slgSfeButtonStates;
    }

    function savedState(id) {
        const button = definitions.get(String(id));
        if (button && !button.config.persist) return button.transientState;
        const store = stateStore();
        return store ? (store[id] = store[id] || {}) : {};
    }

    function copySerializableValue(value, path, stack) {
        if (value == null || typeof value === "string" || typeof value === "boolean") return value;
        if (typeof value === "number") {
            if (!Number.isFinite(value)) throw new TypeError(`${path} 不是有限数字。`);
            return value;
        }
        if (typeof value === "undefined") return undefined;
        if (typeof value === "function") throw new TypeError(`${path} 仍然是函数，无法写入存档。`);
        if (typeof value !== "object") throw new TypeError(`${path} 的类型 ${typeof value} 无法写入存档。`);
        if (stack.has(value)) throw new TypeError(`${path} 含有循环引用，无法写入存档。`);

        stack.add(value);
        let result;
        if (Array.isArray(value)) {
            result = value.map((item, index) => {
                const copied = copySerializableValue(item, `${path}[${index}]`, stack);
                return copied === undefined ? null : copied;
            });
        } else {
            result = {};
            for (const key of Object.keys(value)) {
                const copied = copySerializableValue(value[key], `${path}.${key}`, stack);
                if (copied !== undefined) result[key] = copied;
            }
        }
        stack.delete(value);
        return result;
    }

    function belongsToCurrentMap(button) {
        return button.config.category !== "scene" ||
            button.mapId === (window.$gameMap ? $gameMap.mapId() : 0);
    }

    function discardForeignSceneButtons() {
        if (!window.$gameMap) return;
        for (const button of definitions.values()) {
            if (!belongsToCurrentMap(button)) Buttons.unregister(button.id);
        }
    }

    function saveButtonSession() {
        if (!window.$gameSystem) return false;
        if (restoringSession) return true;
        // 新地图注册其他按钮时，也不能把旧地图的小按钮写入新地图的会话。
        const persistentButtons = Array.from(definitions.values()).filter(button =>
            button.config.persist && belongsToCurrentMap(button));
        if (persistentButtons.length === 0) {
            $gameSystem._slgSfeButtonSession = null;
            return true;
        }
        try {
            const buttons = persistentButtons.map(button => ({
                id: button.id,
                config: copySerializableValue(
                    button.config,
                    `按钮“${button.id}”的配置`,
                    new Set()
                )
            }));
            const savedLayouts = {};
            for (const [name, settings] of layouts.entries()) {
                savedLayouts[name] = copySerializableValue(
                    settings,
                    `布局“${name}”的配置`,
                    new Set()
                );
            }
            $gameSystem._slgSfeButtonSession = {
                version: 1,
                mapId: window.$gameMap ? $gameMap.mapId() : 0,
                layouts: savedLayouts,
                buttons
            };
            return true;
        } catch (error) {
            // 不能保留上一次的旧快照，否则读档后可能恢复成错误的按钮集合。
            $gameSystem._slgSfeButtonSession = null;
            warn("当前按钮配置无法保存，已清除按钮会话快照。", error);
            return false;
        }
    }

    function qjReady() {
        return !!(window.QJ && QJ.MPMZ && typeof QJ.MPMZ.Shoot === "function" && window.$gameMap);
    }

    function bulletIsCurrent(bullet) {
        // 切图/读档会替换子弹容器，但旧对象未必标记 dead；编号也可能已被其他子弹复用。
        return !!(bullet && !bullet.dead && window.$gameMap?._mapBulletsQJ?.[bullet.index] === bullet);
    }

    function sceneIsMap() {
        return window.Scene_Map && SceneManager._scene instanceof Scene_Map;
    }

    function eventIsRunning() {
        if (!window.$gameMap) return false;
        if ($gameMap.isEventRunning()) return true;
        return typeof $gameMap.isAnyEventStartingQJ === "function" && $gameMap.isAnyEventStartingQJ();
    }

    function choiceWindowIsActive() {
        // command102 先写入选项数据，窗口稍后才 activate；纯选项在此间隙也应保持按钮显示。
        if ($gameMessage.isChoice() && !$gameMessage.hasText()) return true;
        const scene = SceneManager._scene;
        if (!scene) return false;
        const messageWindow = scene._messageWindow;
        const windows = [
            scene._choiceListWindow,
            messageWindow && messageWindow._choiceListWindow,
            messageWindow && messageWindow._choiceWindow
        ];
        return windows.some(window => window && window.active);
    }

    function updateBottomLeftMessageLock() {
        // start() 被主解释器接管后 _starting 会清除；不能仅凭 QJ 队列为空判断待机。
        if ($gameTemp._slgSfeBottomLeftMessageHidden &&
            !currentTick.eventRunning && !currentTick.messageBusy) {
            delete $gameTemp._slgSfeBottomLeftMessageHidden;
        }
        let messageHiding = false;
        // isBusy 还包括纯选项、数值输入等，不能单独用它建立“对话隐藏”标记。
        if ($gameMessage.hasText()) {
            for (const button of definitions.values()) {
                const config = button.config;
                if (config.category !== "bottomLeft" || !config.autoHide || !config.hideDuringMessage) continue;
                if (currentTick.choiceActive && config.showDuringChoice) continue;
                const state = savedState(button.id);
                if (!(state.visible == null ? config.visible : state.visible)) continue;
                if (!evaluateCondition(config.visibleCondition ?? config.condition, button, true)) continue;
                // 事件先执行等待/演出时，按钮可能已被 hideDuringEvent 隐藏。
                messageHiding = true;
                break;
            }
        }
        // 只在进入对话隐藏状态时建立标记，手动 false/delete 不会在同段对话中被覆盖。
        if (messageHiding && !bottomLeftMessageHideActive) {
            $gameTemp._slgSfeBottomLeftMessageHidden = true;
        }
        bottomLeftMessageHideActive = messageHiding;
    }

    function shouldShow(button) {
        const config = button.config;
        const state = savedState(button.id);
        const manuallyVisible = state.visible == null ? config.visible : !!state.visible;
        if (!manuallyVisible || !sceneIsMap()) return false;
        if (config.category === "bottomLeft" && $gameTemp._slgSfeBottomLeftMessageHidden) return false;
        if (!evaluateCondition(config.visibleCondition ?? config.condition, button, true)) return false;
        if (!config.autoHide) return true;
        if (config.hideDuringMapSelect &&
            (currentTick ? currentTick.mapSelectOpen : mapSelectWindowIsOpen())) return false;
        const choiceActive = currentTick ? currentTick.choiceActive : choiceWindowIsActive();
        if (choiceActive && config.showDuringChoice) return true;
        if (config.hideDuringMessage && (currentTick ? currentTick.messageBusy : window.$gameMessage && $gameMessage.isBusy())) return false;
        if (config.hideDuringEvent && (currentTick ? currentTick.eventRunning : eventIsRunning())) return false;
        return !SceneManager.isSceneChanging();
    }

    function mapSelectWindowIsOpen() {
        return !!(window.$gameSystem &&
            ($gameSystem.isMapSelectEquipOpen?.() || $gameSystem.isMapSelectSkillOpen?.()));
    }

    function isEnabled(button) {
        const state = savedState(button.id);
        const manuallyEnabled = state.enabled == null ? button.config.enabled : !!state.enabled;
        if (button.config.disableDuringChoice &&
            (currentTick ? currentTick.choiceActive : choiceWindowIsActive())) return false;
        return manuallyEnabled && evaluateCondition(button.config.enabledCondition, button, true);
    }

    function destroyBullet(button) {
        if (pressedId === button.id) pressedId = null;
        destroyDescription(button);
        destroyHoverOverlay(button);
        if (bulletIsCurrent(button.bullet) && typeof button.bullet.setDead === "function") {
            button.bullet.setDead();
        }
        button.bullet = null;
        button.sprite = null;
        button.spriteScene = null;
        button.shown = false;
        button.enabled = false;
        button.visualState = null;
        button.visibilityTarget = null;
    }

    function cancelBackgroundHide(category) {
        const timer = backgroundHideTimers.get(category);
        if (timer !== undefined) {
            clearTimeout(timer);
            backgroundHideTimers.delete(category);
        }
    }

    function clearBackgroundHideTimers() {
        for (const category of backgroundHideTimers.keys()) cancelBackgroundHide(category);
        backgroundHoveredCategory = null;
    }

    function isBackgroundCategory(category) {
        return category === "topLeft" || category === "bottomLeft";
    }

    function usesPermanentBackground(button) {
        return HOVER_EFFECT === "background" &&
            (currentTick ? currentTick.fullUiMode : !!$gameSwitches._data[8]) &&
            button.config.category === "bottomLeft";
    }

    function updateBackgroundUiMode() {
        if (HOVER_EFFECT !== "background") return;
        const full = currentTick.fullUiMode;
        if (full === backgroundFullUiMode) return;
        backgroundFullUiMode = full;
        cancelBackgroundHide("bottomLeft");
        if (backgroundHoveredCategory === "bottomLeft") backgroundHoveredCategory = null;
        for (const button of definitions.values()) {
            if (button.config.category === "bottomLeft") {
                button.hoverBackgroundFrozen = false;
                if (!full && !button.config.hoverOverlay) hideHoverOverlay(button);
            }
        }
    }

    function updateBackgroundHover(hovered) {
        if (HOVER_EFFECT !== "background") return;
        // 场景小按钮不使用背景；完整模式仅左下角背景常驻，不参与悬停计时。
        const next = hovered && isBackgroundCategory(hovered.config.category) &&
            !usesPermanentBackground(hovered) ? hovered.config.category : null;
        if (next === backgroundHoveredCategory) return;
        const previous = backgroundHoveredCategory;
        backgroundHoveredCategory = next;
        if (next !== null) cancelBackgroundHide(next);
        if (previous === null) return;
        const members = Array.from(definitions.values()).filter(button =>
            button.config.category === previous && button.config.hoverOverlay &&
            button.shown && button.enabled && button.hoverSprite?.visible);
        if (members.length === 0) return;
        cancelBackgroundHide(previous);
        const timer = setTimeout(() => {
            if (backgroundHideTimers.get(previous) !== timer) return;
            backgroundHideTimers.delete(previous);
            if ($gameSwitches._data[8] && previous === "bottomLeft") return;
            // 定时回调也核对一次实时输入，覆盖鼠标移回后监听器尚未执行的间隙。
            if (sceneIsMap()) {
                const hit = buttonUnderPointer(TouchInput.x, TouchInput.y);
                if (hit?.config.category === previous) {
                    backgroundHoveredCategory = previous;
                    return;
                }
                // 对话/选项可能先于下一次按钮监听改变状态；留给失活/隐藏流程处理。
                if (members.some(button => !shouldShow(button) || !isEnabled(button))) return;
            }
            for (const button of members) {
                if (definitions.get(button.id) === button && !button.hoverBackgroundFrozen) hideHoverOverlay(button, true);
            }
        }, 2000);
        backgroundHideTimers.set(previous, timer);
    }

    function destroyHoverOverlay(button) {
        cancelBackgroundHide(button.config.category);
        button.hoverBackgroundFrozen = false;
        const sprite = button.hoverSprite;
        if (sprite && !sprite._destroyed) {
            if (sprite.parent) sprite.parent.removeChild(sprite);
            // Sprite.destroy 只销毁自身纹理，ImageManager 共享的 Bitmap 不销毁。
            sprite.destroy();
        }
        button.hoverSprite = null;
    }

    function hideHoverOverlay(button, fade = false) {
        button.hoverBackgroundFrozen = false;
        if (button.hoverSprite) button.hoverSprite.setHoverVisible(false, fade && HOVER_EFFECT === "background");
    }

    function buttonSprite(button) {
        if (!bulletIsCurrent(button.bullet)) return null;
        let sprite = button.sprite;
        const scene = SceneManager._scene;
        if (!sprite || sprite._destroyed || !sprite.parent || button.spriteScene !== scene || sprite.data !== button.bullet) {
            sprite = $gameMap.findBulletSpriteQJ(button.bullet);
            if (sprite !== button.sprite) destroyHoverOverlay(button);
            button.sprite = sprite || null;
            button.spriteScene = scene;
        }
        return sprite;
    }

    // 将黑色外发光烘焙进文字贴图，不使用每帧计算的 PIXI 滤镜。
    class ButtonDescriptionBitmap extends Bitmap {
        _drawTextOutline() {}

        _drawTextBody(text, tx, ty, maxWidth) {
            const context = this.context;
            context.save();
            context.shadowColor = "#000000";
            context.shadowBlur = 4;
            context.shadowOffsetX = 0;
            context.shadowOffsetY = 0;
            super._drawTextBody(text, tx, ty, maxWidth);
            context.restore();
        }
    }

    // 纯视觉子精灵：继承按钮的变换和显隐，不进入 QJ 子弹/碰撞/输入系统。
    class ButtonDescription extends Sprite {
        constructor() {
            super(new ButtonDescriptionBitmap(80, 32));
            this.anchor.x = 0.5;
            this.alpha = 0.8;
            this.interactive = false;
            this.interactiveChildren = false;
        }

        destroy(options) {
            if (this._destroyed) return;
            const bitmap = this.bitmap;
            super.destroy(options);
            bitmap.destroy();
        }
    }

    function destroyDescription(button) {
        const sprite = button.descriptionSprite;
        if (sprite && !sprite._destroyed) {
            if (sprite.parent) sprite.parent.removeChild(sprite);
            sprite.destroy();
        }
        button.descriptionSprite = null;
    }

    function syncDescription(button) {
        if (!button.config.descriptionKey) return;
        const base = buttonSprite(button);
        if (!base) {
            destroyDescription(button);
            return;
        }
        let sprite = button.descriptionSprite;
        if (!sprite || sprite._destroyed || sprite.parent !== base) {
            destroyDescription(button);
            sprite = button.descriptionSprite = new ButtonDescription();
            base.addChild(sprite);
        }
        const text = window.mapCommonEventDialogue?.rpgMapButtonDescription?.[button.config.descriptionKey] || "";
        const font = $gameSystem.mainFontFace();
        if (sprite._descriptionText !== text || sprite.bitmap.fontFace !== font) {
            const bitmap = sprite.bitmap;
            bitmap.clear();
            bitmap.fontFace = font;
            bitmap.fontSize = 20;
            bitmap.textColor = "#ffffff";
            bitmap.drawText(text, 5, 0, 70, 32, "center");
            sprite._descriptionText = text;
        }
        sprite.x = base._frame.width * (0.5 - base.anchor.x);
        // 各图标高度不同，统一相对按钮中心的偏移以保持文字基线一致。
        sprite.y = 33;
        sprite.visible = !!text;
    }

    // 与按钮同父节点、紧挨在按钮之前绘制。渲染变换阶段同步，避免 QJ 更新顺序
    // 和监听器隔帧更新使背景在移动、缩放或淡化时落后一帧。
    class HoverUnderlay extends Sprite {
        constructor(base, opacity) {
            super();
            this._slgSfeBase = base;
            this._slgSfeOpacity = opacity;
            this._slgSfeDisplayOpacity = 0;
            this._slgSfeTargetVisible = false;
            this._slgSfeFade = null;
            this.visible = false;
        }

        setHoverVisible(visible, animate) {
            if (animate && this._slgSfeTargetVisible === visible) return;
            if (this._slgSfeFade) this.advanceHoverFade();
            this._slgSfeTargetVisible = visible;
            const target = visible ? this._slgSfeOpacity : 0;
            if (!animate || this._slgSfeDisplayOpacity === target) {
                this._slgSfeDisplayOpacity = target;
                this._slgSfeFade = null;
                delete this.updateTransform;
                this.visible = visible;
            } else {
                this._slgSfeFade = { from: this._slgSfeDisplayOpacity, to: target, start: Graphics.frameCount };
                this.visible = true;
                // 仅过渡中的实例挂接此方法，完成后恢复原有渲染变换路径。
                this.updateTransform = this.updateFadeTransform;
            }
            this.alpha = this._slgSfeBase.alpha * this._slgSfeDisplayOpacity;
        }

        advanceHoverFade() {
            const fade = this._slgSfeFade;
            const progress = Math.min(1, (Graphics.frameCount - fade.start) / 20);
            this._slgSfeDisplayOpacity = fade.from + (fade.to - fade.from) * progress;
            if (progress === 1) {
                this._slgSfeFade = null;
                delete this.updateTransform;
                this.visible = this._slgSfeTargetVisible;
            }
        }

        updateFadeTransform() {
            this.advanceHoverFade();
            HoverUnderlay.prototype.updateTransform.call(this);
        }

        updateTransform() {
            const base = this._slgSfeBase;
            if (base._destroyed || base.parent !== this.parent) {
                this.renderable = false;
                super.updateTransform();
                return;
            }
            this.x = base.x;
            this.y = base.y;
            this.scale.x = base.scale.x;
            this.scale.y = base.scale.y;
            this.rotation = base.rotation;
            this.skew.x = base.skew.x;
            this.skew.y = base.skew.y;
            this.pivot.x = base.pivot.x;
            this.pivot.y = base.pivot.y;
            this.alpha = base.alpha * this._slgSfeDisplayOpacity;
            this.renderable = base.visible && base.renderable;
            super.updateTransform();
        }
    }

    function syncHoverOverlay(button, visible) {
        if (HOVER_EFFECT === "background" && !isBackgroundCategory(button.config.category)) {
            hideHoverOverlay(button);
            return null;
        }
        // 对话/选项使左下角按钮失活时，仅保留已有背景，不再按鼠标位置切换。
        const permanent = usesPermanentBackground(button);
        if (!permanent && button.hoverBackgroundFrozen && button.shown && !button.enabled) return button.hoverSprite;
        if (HOVER_EFFECT === "none" || !visible || !button.shown || (!button.enabled && !permanent)) {
            hideHoverOverlay(button, !visible && button.shown && button.enabled);
            return button.hoverSprite;
        }
        const base = buttonSprite(button);
        if (!base || !base.bitmap?.isReady() || base.imgUpdate) {
            hideHoverOverlay(button);
            return null;
        }
        let overlay = button.hoverSprite;
        const config = button.config;
        const background = HOVER_EFFECT === "background";
        if (!overlay || overlay._destroyed) {
            overlay = button.hoverSprite = new HoverUnderlay(base,
                background ? HOVER_BACKGROUND_OPACITY : config.hoverOverlayOpacity);
            overlay._slgSfeHoverButtonId = button.id;
            overlay.alpha = overlay._slgSfeOpacity;
            overlay.blendMode = background ? 0 : config.hoverOverlayBlendMode;
            overlay.setColorTone(background ? [0, 0, 0, 0] : cloneArray(config.hoverOverlayTone, [0, 0, 0, 0]));
        }
        const parent = base.parent;
        if (overlay.parent !== parent || parent.getChildIndex(overlay) !== parent.getChildIndex(base) - 1) {
            if (overlay.parent) overlay.parent.removeChild(overlay);
            parent.addChildAt(overlay, parent.getChildIndex(base));
        }
        const image = background ? HOVER_BACKGROUND_IMAGE :
            ((button.id === pressedId ? config.pressedImage : null) ?? config.hoverOverlayImage ?? config.hoverImage);
        const name = typeof image === "string" ? image : Array.isArray(image) && image[0] === "P" ? image[1] : null;
        if (overlay._slgSfeImage !== name) {
            overlay._slgSfeImage = name;
            overlay._slgSfeBitmap = name ? ImageManager.loadProjectileQJ(name) : null;
        }
        const bitmap = name ? overlay._slgSfeBitmap : base.bitmap;
        if (!bitmap?.isReady()) {
            overlay.setHoverVisible(false, false);
            return overlay;
        }
        if (overlay.bitmap !== bitmap) overlay.bitmap = bitmap;
        const frame = name ? null : base._frame;
        const x = frame?.x || 0, y = frame?.y || 0;
        const width = frame ? frame.width : bitmap.width, height = frame ? frame.height : bitmap.height;
        const oldFrame = overlay._frame;
        if (oldFrame.x !== x || oldFrame.y !== y || oldFrame.width !== width || oldFrame.height !== height) {
            overlay.setFrame(x, y, width, height);
        }
        overlay.anchor.x = base.anchor.x;
        overlay.anchor.y = base.anchor.y;
        overlay.setHoverVisible(true, background);
        return overlay;
    }

    function mapScreenTransform() {
        // QJ 的 A 层仍是 spriteset 的子节点；onScreen 只抵消 displayX/Y。
        // 使用实际容器的平移，兼容 DP_MapZoom 对缩放中心及震屏的修正。
        const spriteset = SceneManager._scene?._spriteset;
        const screen = window.$gameScreen;
        const zoom = Number(screen?.zoomScale?.()) || 1;
        return {
            scaleX: Number(spriteset?.scale?.x) || zoom,
            scaleY: Number(spriteset?.scale?.y) || zoom,
            x: spriteset ? spriteset.x : Math.round(-(screen?.zoomX?.() || 0) * (zoom - 1)) + Math.round(screen?.shake?.() || 0),
            y: spriteset ? spriteset.y : Math.round(-(screen?.zoomY?.() || 0) * (zoom - 1))
        };
    }

    function buttonTransform(config, x, y) {
        if (!config.screenSpace) return { x, y, scaleX: config.scaleX, scaleY: config.scaleY };
        const map = currentTick?.mapTransform || mapScreenTransform();
        return {
            x: (x - map.x) / map.scaleX,
            y: (y - map.y) / map.scaleY,
            scaleX: config.scaleX / map.scaleX,
            scaleY: config.scaleY / map.scaleY
        };
    }

    function syncBulletTransform(bullet, transform) {
        if (!bullet || bullet.dead) return;
        const scaleChanged = bullet.scaleX !== transform.scaleX || bullet.scaleY !== transform.scaleY;
        if (scaleChanged) {
            bullet.changeAttribute("scale", [transform.scaleX, transform.scaleY]);
        }
        if (bullet.x !== transform.x + $gameMap.displayX() * QJ.tileSize ||
            bullet.y !== transform.y + $gameMap.displayY() * QJ.tileSize) {
            setBulletScreenPosition(bullet, transform.x, transform.y);
        }
    }

    function setBulletScreenPosition(bullet, x, y) {
        if (!bullet || bullet.dead) return;
        const displayX = $gameMap.displayX() * QJ.tileSize;
        const displayY = $gameMap.displayY() * QJ.tileSize;
        bullet._x = bullet.x = x + displayX;
        bullet._y = bullet.y = y + displayY;
        bullet._orginDisplayX = displayX;
        bullet._orginDisplayY = displayY;
        bullet._needRefreshBox = true;
        if (bullet.QJBody && typeof bullet.updateBodyPosition === "function") bullet.updateBodyPosition();
    }

    function createBullet(button, initialOpacity) {
        if (!qjReady()) return;
        const config = button.config;
        const x = evaluateValue(config.x, button, 0);
        const y = evaluateValue(config.y, button, 0);
        const transform = buttonTransform(config, x, y);
        try {
            button.bullet = QJ.MPMZ.Shoot({
                groupName: [SCENE_BUTTON_GROUP, BUTTON_GROUP, GROUP_PREFIX + button.id],
                img: copyQjValue(config.image),
                position: [["S", transform.x], ["S", transform.y]],
                initialRotation: ["S", 0],
                imgRotation: ["S", 0],
                moveType: ["S", 0],
                scale: [transform.scaleX, transform.scaleY],
                opacity: initialOpacity ?? config.opacity,
                tone: config.normalTone.slice(),
                anchor: [config.anchorX, config.anchorY],
                z: config.z,
                onScreen: true,
                // QJ 实体仍需一个占位框；UI 命中不使用它，也无需等待自动碰撞框加载。
                collisionBox: ["C", 1],
                existData: []
            });
            if (button.bullet) button.bullet._slgSfeButtonId = button.id;
            button.x = x;
            button.y = y;
            button.visualState = null;
        } catch (error) {
            button.bullet = null;
            warn(`按钮“${button.id}”创建失败，请确认 QJ 贴图参数。`, error);
        }
    }

    function changeButtonVisibility(button, visible) {
        if (!button || !button.bullet || button.bullet.dead) return;
        if (button.visibilityTarget === visible) return;
        button.visibilityTarget = visible;
        button.shown = visible;
        if (!visible) {
            cancelBackgroundHide(button.config.category);
            button.enabled = false;
            hideHoverOverlay(button);
        }

        const target = visible ? button.config.opacity : 0;
        const current = Number(button.bullet.opacity);
        const from = Number.isFinite(current) ? current : (visible ? 0 : button.config.opacity);
        const frames = button.config.fadeFrames;
        const opacity = frames > 0 && from !== target
            ? `0|${from}~${frames}/${target}~999999|${target}`
            : target;
        if (typeof button.bullet.changeAttribute === "function") {
            button.bullet.changeAttribute("opacity", opacity);
        } else {
            button.bullet.opacity = target;
        }
    }

    function syncPosition(button) {
        if (!button.bullet || button.bullet.dead) return;
        const x = evaluateValue(button.config.x, button, button.x);
        const y = evaluateValue(button.config.y, button, button.y);
        if (button.config.screenSpace) {
            const transform = buttonTransform(button.config, x, y);
            syncBulletTransform(button.bullet, transform);
        } else {
            if (x === button.x && y === button.y) return;
            setBulletScreenPosition(button.bullet, x, y);
        }
        button.x = x;
        button.y = y;
    }

    function pointerGeometry(pointerX, pointerY) {
        const map = currentTick?.mapTransform || mapScreenTransform();
        return {
            x: (pointerX - map.x) / map.scaleX, y: (pointerY - map.y) / map.scaleY,
            displayX: $gameMap.displayX() * QJ.tileSize, displayY: $gameMap.displayY() * QJ.tileSize,
            zoom: Number(window.$gameScreen?.zoomScale()) || 1
        };
    }

    function bulletContainsPointer(bullet, sprite, pointer, width, height) {
        if (!sprite || !sprite.bitmap?.isReady() || sprite.imgUpdate) return false;
        width = width || sprite._frame.width;
        height = height || sprite._frame.height;
        if (width <= 0 || height <= 0 || !bullet.scaleX || !bullet.scaleY) return false;
        // 与 QJ 的屏幕像素舍入一致；锚点及负缩放在贴图局部坐标中处理。
        const bx = Math.round((bullet.x - pointer.displayX) * pointer.zoom) / pointer.zoom + (bullet.timeLineX || 0);
        const by = Math.round((bullet.y - pointer.displayY) * pointer.zoom) / pointer.zoom + (bullet.timeLineY || 0);
        const localX = (pointer.x - bx) / bullet.scaleX + width * bullet.anchorX;
        const localY = (pointer.y - by) / bullet.scaleY + height * bullet.anchorY;
        return localX >= 0 && localX <= width && localY >= 0 && localY <= height;
    }

    function buttonUnderPointer(pointerX, pointerY) {
        if (!qjReady()) return null;
        const pointer = pointerGeometry(pointerX, pointerY);
        let hit = null;
        for (const button of definitions.values()) {
            if (!button.shown || !button.enabled || !button.bullet || button.bullet.dead || button.bullet.data.paused) continue;
            const sprite = buttonSprite(button);
            if (bulletContainsPointer(button.bullet, sprite, pointer, button.config.hitWidth, button.config.hitHeight) &&
                (!hit || spriteIsAbove(sprite, hit.sprite))) hit = button;
        }
        return hit;
    }

    function captureMessagePointer(pointerX, pointerY) {
        if (!sceneIsMap() || SceneManager._scene._messageWindow?.isHidden()) return false;
        const pointer = pointerGeometry(pointerX, pointerY);
        // 仅由按下事件调用；包括料理/任务等独立按钮，跳过无实体 UI 的共享监听器。
        for (const id of $gameMap.getGroupBulletListQJ(SCENE_BUTTON_GROUP)) {
            const bullet = $gameMap.bulletQJ(id);
            if (!bullet || bullet.dead || bullet.data.groupName.includes(LISTENER_GROUP)) continue;
            const button = definitions.get(bullet._slgSfeButtonId);
            const sprite = button ? buttonSprite(button) : $gameMap.findBulletSpriteQJ(bullet);
            if (bulletContainsPointer(bullet, sprite, pointer, button?.config.hitWidth, button?.config.hitHeight)) return true;
        }
        return false;
    }

    function spriteIsAbove(sprite, other) {
        // 仅重叠命中时比较实际显示顺序，优先点击画在上面的按钮。
        const a = [], b = [];
        for (let node = sprite; node; node = node.parent) a.push(node);
        for (let node = other; node; node = node.parent) b.push(node);
        while (a.length && b.length && a[a.length - 1] === b[b.length - 1]) {
            const parent = a.pop();
            b.pop();
            if (a.length && b.length && a[a.length - 1] !== b[b.length - 1]) {
                return parent.children.indexOf(a[a.length - 1]) > parent.children.indexOf(b[b.length - 1]);
            }
        }
        return false;
    }

    function pointerPressed() {
        if (typeof TouchInput.drill_isLeftPressed === "function") return TouchInput.drill_isLeftPressed();
        return TouchInput.isPressed();
    }

    function makeTickSnapshot() {
        const pressed = pointerPressed();
        const triggered = (typeof TouchInput.drill_isLeftTriggered === "function"
            ? TouchInput.drill_isLeftTriggered()
            : TouchInput.isTriggered()) || (pressed && !pointerWasPressed);
        const released = (typeof TouchInput.isReleased === "function" && TouchInput.isReleased()) ||
            (!pressed && pointerWasPressed);
        pointerWasPressed = pressed;
        // 只在按钮实际需要时检查窗口；同一次监听中复用结果。
        let choiceActive, mapSelectOpen;
        return {
            scene: SceneManager._scene,
            mapId: window.$gameMap ? $gameMap.mapId() : 0,
            messageBusy: !!(window.$gameMessage && $gameMessage.isBusy()),
            fullUiMode: !!$gameSwitches._data[8],
            get choiceActive() { return choiceActive ??= choiceWindowIsActive(); },
            eventRunning: eventIsRunning(),
            get mapSelectOpen() { return mapSelectOpen ??= mapSelectWindowIsOpen(); },
            mapTransform: mapScreenTransform(),
            pointerX: TouchInput.x,
            pointerY: TouchInput.y,
            pressed,
            triggered,
            released
        };
    }

    function playSe(se) {
        if (!se) return;
        if (se.system === "cursor" && window.SoundManager) SoundManager.playCursor();
        else if (se.system === "ok" && window.SoundManager) SoundManager.playOk();
        else if (se.name && window.AudioManager) AudioManager.playSe(se);
    }

    function currentFrameCount() {
        return window.Graphics ? Number(Graphics.frameCount || 0) : 0;
    }

    function cooldownIsActive() {
        return currentFrameCount() < cooldownUntilFrame;
    }

    function startGlobalCooldown(frames) {
        const duration = Math.max(0, Number(frames ?? DEFAULT_COOLDOWN_FRAMES));
        cooldownUntilFrame = Math.max(cooldownUntilFrame, currentFrameCount() + duration);
        return duration;
    }

    function runHandler(handler, button) {
        if (handler == null) return false;
        const context = contextFor(button);
        try {
            if (typeof handler === "function") handler.call(button.bullet || button, context, button);
            else compiledScript(handler).call(button.bullet || button, context, button);
            return true;
        } catch (error) {
            warn(`按钮“${button.id}”的点击脚本执行失败。`, error);
            return false;
        }
    }

    function trigger(button) {
        if (button && !belongsToCurrentMap(button)) return false;
        if (!button || button.config.holdKey || !button.shown || !button.enabled || !bulletIsCurrent(button.bullet) || button.bullet.data.paused || cooldownIsActive()) return false;
        startGlobalCooldown(button.config.cooldownFrames);
        playSe(button.config.clickSe);
        const actions = button.config.actions
            .map((action, index) => ({ action, index }))
            .sort((a, b) => Number(b.action.priority || 0) - Number(a.action.priority || 0) || a.index - b.index);
        for (const entry of actions) {
            const action = entry.action;
            if (evaluateCondition(action.when ?? action.condition, button, true)) {
                return runHandler(action.run ?? action.action ?? action.onClick, button);
            }
        }
        return runHandler(button.config.onClick, button);
    }

    function listenerMoveF() {
        // 读档后的新实体必须先经显式恢复绑定，避免驱动闭包中上次游戏的旧按钮。
        if (listenerBullet !== this || !bulletIsCurrent(this)) return;
        Buttons.updateFrame();
    }

    function ensureListener() {
        // 旧地图实体消失后，先注销 scene 定义，避免新监听器将其补建到当前地图。
        discardForeignSceneButtons();
        if (definitions.size === 0 || !qjReady() || !sceneIsMap()) return null;
        if (bulletIsCurrent(listenerBullet)) return listenerBullet;
        // 失效引用只能丢弃，不能对旧对象 setDead，否则可能误删当前地图的同编号子弹。
        destroyListener();
        QJ.MPMZ.slgSfeListenerMoveF = listenerMoveF;
        listenerBullet = QJ.MPMZ.Shoot({
            groupName: [SCENE_BUTTON_GROUP, LISTENER_GROUP],
            img: "null1",
            position: [["S", 0], ["S", 0]],
            initialRotation: ["S", 0],
            imgRotation: ["S", 0],
            moveType: ["S", 0],
            opacity: 0,
            onScreen: true,
            collisionBox: ["C", 1],
            existData: [],
            // QJ 的间隔值 1：执行一次后跳过 1 帧，再执行下一次。
            moveF: [[0, 1, listenerMoveF]]
        });
        return listenerBullet;
    }

    function destroyListener() {
        clearBackgroundHideTimers();
        if (bulletIsCurrent(listenerBullet) && typeof listenerBullet.setDead === "function") {
            listenerBullet.setDead();
        }
        listenerBullet = null;
        currentTick = null;
        bottomLeftMessageHideActive = false;
        pointerWasPressed = false;
        pressedId = null;
        cooldownUntilFrame = 0;
    }

    function deleteSceneButtonProjectiles() {
        if (!window.$gameMap || !window.QJ || !QJ.MPMZ || typeof QJ.MPMZ.deleteProjectile !== "function") return;
        QJ.MPMZ.deleteProjectile(SCENE_BUTTON_GROUP);
    }

    function resetRuntimeForLoad() {
        clearBackgroundHideTimers();
        // 读档前闭包中可能还留着旧 $gameMap 的 QJ 对象引用，不能逐个调用 setDead。
        // 只丢弃运行引用；当前地图已经还原的实体应保留并重新绑定。
        for (const button of definitions.values()) destroyHoverOverlay(button);
        definitions.clear();
        resetLayoutsToDefaults();
        registrationSerial = 0;
        hoveredId = null;
        pressedId = null;
        listenerBullet = null;
        currentTick = null;
        bottomLeftMessageHideActive = false;
        pointerWasPressed = false;
        cooldownUntilFrame = 0;
    }

    function restoreLayouts(savedLayouts) {
        resetLayoutsToDefaults();
        if (savedLayouts == null) return;
        if (typeof savedLayouts !== "object" || Array.isArray(savedLayouts)) {
            throw new TypeError("按钮会话的 layouts 不是普通对象。");
        }
        for (const name of Object.keys(savedLayouts)) {
            const source = savedLayouts[name];
            if (!source || typeof source !== "object" || Array.isArray(source)) {
                throw new TypeError(`布局“${name}”的配置无效。`);
            }
            const settings = {
                startX: Number(source.startX),
                startY: Number(source.startY),
                spacingX: Number(source.spacingX),
                spacingY: Number(source.spacingY)
            };
            if (!Object.values(settings).every(Number.isFinite)) {
                throw new TypeError(`布局“${name}”包含无效数字。`);
            }
            settings.visibleOnly = source.visibleOnly === true;
            layouts.set(name, settings);
        }
    }

    // 回想使用独立的运行集合；函数配置、临时状态与 QJ 实体都随原世界停放，不序列化。
    function suspendButtonRuntime() {
        const snapshot = {
            definitions: new Map(definitions),
            layouts: new Map(layouts),
            registrationSerial,
            listenerBullet,
            bottomLeftMessageHideActive,
            bottomLeftMessageHidden: $gameTemp._slgSfeBottomLeftMessageHidden,
            backgroundFullUiMode
        };
        // 场景精灵会随旧 Scene_Map 销毁；只释放显示引用，绝不能 setDead 原地图实体。
        for (const button of definitions.values()) {
            destroyDescription(button);
            button.sprite = null;
            button.spriteScene = null;
        }
        resetRuntimeForLoad();
        pressedMapId = 0;
        backgroundFullUiMode = false;
        return snapshot;
    }

    function restoreButtonRuntime(snapshot) {
        // 调用者须先在临时世界 clear()，再还原原世界；此处不能删除当前地图的实体。
        resetRuntimeForLoad();
        for (const [id, button] of snapshot.definitions) definitions.set(id, button);
        layouts.clear();
        for (const [name, settings] of snapshot.layouts) layouts.set(name, settings);
        registrationSerial = snapshot.registrationSerial;
        listenerBullet = snapshot.listenerBullet;
        bottomLeftMessageHideActive = snapshot.bottomLeftMessageHideActive;
        backgroundFullUiMode = snapshot.backgroundFullUiMode;
        if (snapshot.bottomLeftMessageHidden === undefined) {
            delete $gameTemp._slgSfeBottomLeftMessageHidden;
        } else {
            $gameTemp._slgSfeBottomLeftMessageHidden = snapshot.bottomLeftMessageHidden;
        }
        // 不恢复旧手势/冷却；Graphics.frameCount 已随原世界恢复，不能沿用舞台时间。
        pressedMapId = 0;
        pointerWasPressed = pointerPressed();
        TouchInput._slgSfeMessageBlocked = false;
    }

    function restoreSavedButtonSession() {
        if (!window.$gameSystem) return false;
        const session = $gameSystem._slgSfeButtonSession;

        // 无论存档中有没有按钮，都必须先丢弃同一次启动中读档前留下的旧引用。
        resetRuntimeForLoad();
        if (session == null) return 0;
        if (!session || typeof session !== "object") {
            warn("按钮会话快照无效，已跳过恢复。");
            return false;
        }
        if (Number(session.version) !== 1) {
            warn(`不支持按钮会话版本 ${session.version}，已跳过恢复。`);
            return false;
        }
        const currentMapId = window.$gameMap ? $gameMap.mapId() : 0;
        if (Number(session.mapId) !== currentMapId) {
            warn(`按钮会话属于地图 ${session.mapId}，当前地图为 ${currentMapId}，已跳过恢复。`);
            return false;
        }
        if (!Array.isArray(session.buttons)) {
            warn("按钮会话缺少有效的 buttons 数组，已跳过恢复。");
            return false;
        }

        restoringSession = true;
        try {
            restoreLayouts(session.layouts);
            const liveGroup = name => $gameMap.getGroupBulletListQJ(name)
                .map(id => $gameMap.bulletQJ(id)).filter(bullet => bullet && !bullet.dead);
            const existingButtons = new Map();
            for (const bullet of liveGroup(BUTTON_GROUP)) {
                const id = String(bullet._slgSfeButtonId);
                if (!existingButtons.has(id)) existingButtons.set(id, bullet);
            }
            const sceneBullets = liveGroup(SCENE_BUTTON_GROUP);
            listenerBullet = liveGroup(LISTENER_GROUP)[0] || null;
            const retained = new Set();
            const restoredIds = new Set();
            for (let index = 0; index < session.buttons.length; index++) {
                const record = session.buttons[index];
                if (!record || typeof record !== "object") {
                    throw new TypeError(`buttons[${index}] 不是有效对象。`);
                }
                const id = String(record.id || "").trim();
                if (!id) throw new TypeError(`buttons[${index}] 缺少按钮 ID。`);
                if (restoredIds.has(id)) throw new TypeError(`按钮 ID“${id}”重复。`);
                const config = copySerializableValue(
                    record.config,
                    `按钮“${id}”的存档配置`,
                    new Set()
                );
                restoredIds.add(id);
                const button = Buttons.register(id, config);
                button.bullet = existingButtons.get(id) || null;
                if (button.bullet) {
                    button.x = button.bullet.x - $gameMap.displayX() * QJ.tileSize;
                    button.y = button.bullet.y - $gameMap.displayY() * QJ.tileSize;
                    if (config.screenSpace) {
                        const map = mapScreenTransform();
                        button.x = button.x * map.scaleX + map.x;
                        button.y = button.y * map.scaleY + map.y;
                    }
                    retained.add(button.bullet);
                }
            }
            ensureListener();
            if (listenerBullet) retained.add(listenerBullet);
            // 有效快照是本场景按钮清单；清除重复监听器、孤立按钮及旧版无标记叠图。
            for (const bullet of sceneBullets) {
                if (!retained.has(bullet)) bullet.setDead();
            }
            // 缺失实体由下一次监听更新补建，不在恢复中派发鼠标点击。
        } catch (error) {
            restoringSession = false;
            resetRuntimeForLoad();
            $gameSystem._slgSfeButtonSession = null;
            warn("按钮会话恢复失败，已清除损坏的快照。", error);
            return false;
        }

        restoringSession = false;
        if (!saveButtonSession()) return false;
        return definitions.size;
    }

    const Buttons = {
        suspendRuntime() {
            return suspendButtonRuntime();
        },

        restoreRuntime(snapshot) {
            restoreButtonRuntime(snapshot);
            return this;
        },

        initialize(configs) {
            this.clear();
            if (configs) this.registerMany(configs);
            return this;
        },

        initializeExplorationButtons(options) {
            this.clearCategory("bottomLeft");
            const custom = options || {};
            const startX = Number(custom.startX ?? custom.mapX ?? 100);
            const spacingX = Number(custom.spacingX ?? 160);
            this.configureLayout("bottomLeft", {
                startX,
                startY: Number(custom.y ?? 1020),
                spacingX,
                spacingY: 0
            });
            return this.registerMany({
                mapExploration: Object.assign({
                    image: "imoutoUtil/MapExplorationButton",
                    layout: "bottomLeft",
                    layoutOrder: 0,
                    hitWidth: 160,
                    hitHeight: 88,
                    z: "A",
                    hoverOverlay: true,
                    hoverTone: [0, 0, 0, 0],
                    disabledTone: [0, 0, 0, 0],
                    disabledOpacity: 1,
                    hoverSe: "cursor",
                    clickSe: "ok",
                    hideDuringMessage: true,
                    hideDuringEvent: true,
                    showDuringChoice: true,
                    disableDuringChoice: true,
                    onClick: "$gameMap.steupCEQJ(19, 1, {});"
                }, custom.mapExploration || {}),
                optionScene: Object.assign({
                    image: "imoutoUtil/optionSceneButton",
                    layout: "bottomLeft",
                    layoutOrder: 1,
                    hitWidth: 160,
                    hitHeight: 88,
                    z: "A",
                    hoverOverlay: true,
                    hoverTone: [0, 0, 0, 0],
                    disabledTone: [0, 0, 0, 0],
                    disabledOpacity: 1,
                    hoverSe: "cursor",
                    clickSe: "ok",
                    hideDuringMessage: true,
                    hideDuringEvent: true,
                    showDuringChoice: true,
                    disableDuringChoice: true,
                    onClick: "SceneManager.push(Scene_Options);"
                }, custom.optionScene || {}),
                saveScene: Object.assign({
                    image: "imoutoUtil/saveSceneButton",
                    layout: "bottomLeft",
                    layoutOrder: 2,
                    hitWidth: 160,
                    hitHeight: 88,
                    z: "A",
                    hoverOverlay: true,
                    hoverTone: [0, 0, 0, 0],
                    disabledTone: [0, 0, 0, 0],
                    disabledOpacity: 1,
                    hoverSe: "cursor",
                    clickSe: "ok",
                    hideDuringMessage: true,
                    hideDuringEvent: true,
                    showDuringChoice: true,
                    disableDuringChoice: true,
                    onClick: "$gameMap.steupCEQJ(19, 1, { saveLoad: true });"
                }, custom.saveScene || {})
            });
        },

        initializeSceneButtons(options) {
            this.clearCategory("scene");
            return this.initializeExplorationButtons(options);
        },

        initializeEventFunctionButton(options = {}) {
            const choiceCondition = Utils.isMobileDevice()
                ? "$gameMessage.isChoice()"
                : "($gameMessage.isChoice() && SceneManager._scene._messageWindow.isOpen())";
            this.configureLayout("topLeft", {
                startX: options.startX ?? 100,
                startY: options.y ?? 64,
                spacingX: options.spacingX ?? 160,
                spacingY: 0,
                visibleOnly: true
            });
            this.registerTopLeft("eventFastForward", Object.assign({
                image: "imoutoUtil/fastForwardSceneButton",
                visibleCondition: "QJ.VB.showFastForwardButton()",
                holdKey: "pagedown"
            }, options.eventFastForward));
            this.registerTopLeft("eventReturn", Object.assign({
                image: "imoutoUtil/returnSceneButton",
                visibleCondition: "(!$gameMessage.isChoice() || $gameMessage.choiceCancelType() !== -1) && (" +
                    "$gameSwitches._data[46] || " + choiceCondition + " || $gameMessage.isItemChoice() || " +
                    "$gameSystem.isMapSelectEquipOpen() || $gameSystem.isMapSelectSkillOpen())",
                onClick: "$gameMap.steupCEQJ(63, 0, {});"
            }, options.eventReturn));
            this.registerTopLeft("eventHideUi", Object.assign({
                image: "imoutoUtil/XrayHideSceneButton",
                visibleCondition: choiceCondition + " || QJ.VB.showFastForwardButton()",
                enabledCondition: "!SceneManager._scene._messageWindow.disableWindowHidden()",
                triggerOnRelease: true,
                onClick: "SceneManager._scene._messageWindow.hideAllWindow();"
            }, options.eventHideUi));
            return this;
        },

        initializeRpgButtons(options) {
            const custom = options || {};
            // 共用 77×76 的布局矩形，图标居中；相邻框中心间距固定为 77。
            const slot = { left: 16.5, top: 22, width: 77, height: 76 };
            const common = {
                y: slot.top + slot.height / 2,
                screenSpace: true,
                anchor: [0.5, 0.5],
                z: "A",
                opacity: 1,
                fadeFrames: 0,
                hoverOverlay: true,
                hoverOverlayOpacity: 1,
                hoverOverlayBlendMode: 0,
                hoverSe: "cursor",
                clickSe: "ok",
                hideDuringMessage: true,
                hideDuringEvent: false,
                hideDuringMapSelect: true,
                showDuringChoice: false,
                triggerOnRelease: true,
                updateDuringCooldown: true,
                persist: false
            };
            const configs = {};
            for (const [id, image, column, eventId, lockFlow, descriptionKey] of [
                ["rpgItem", "item", 3, 92, false, "inventory"],
                ["rpgSkill", "skill", 2, 93, true, "skill"],
                ["rpgReturnHome", "exit", 0, 91, false, "starDoor"],
                ["rpgOptions", "option", 1, 496, false, "option"],
                ["rpgStatus", "status", 4, null, false, "status"],
                ["rpgCollection", "Collection", 5, 105, false, "collection"]
            ]) {
                configs[id] = Object.assign({}, common, {
                    // 与家中场景按钮共用 img/projectiles/imoutoUtil，以当前贴图帧作为命中矩形。
                    image: "imoutoUtil/" + image,
                    descriptionKey,
                    x: slot.left + slot.width * (column + 0.5),
                    onClick: eventId == null ? null : `$gameMap.steupCEQJ(${eventId}, 0, ${lockFlow ? "{ lockFlow: true }" : "{}"});`
                }, custom[id] || {}, { persist: false });
            }
            // 每次重建 RPG 按钮时检查一次（包含已装备护甲），逐帧只读取布尔结果。
            configs.rpgCollection.visibleCondition = $gameParty.hasItem($dataArmors[100], true);
            if (!Object.prototype.hasOwnProperty.call(custom.rpgStatus || {}, "onClick")) {
                configs.rpgStatus.onClick = (_context, button) => {
                    const bean = $gameScreen.picture(111)?._saikeyHoverBean;
                    if (!bean) return;
                    // 窗口放在按钮布局框右侧，顶部与布局框顶部对齐。
                    Saikey.MPMZ.setPictureForceShow(111, bean.forceShow !== true,
                        button.x + slot.width / 2, button.y - slot.height / 2);
                };
            }
            return this.initialize(configs);
        },

        register(id, config) {
            id = String(id || "").trim();
            if (!id) throw new Error(`${pluginName}: 按钮 ID 不能为空。`);
            if (definitions.has(id)) this.unregister(id);
            const button = {
                id,
                mapId: window.$gameMap ? $gameMap.mapId() : 0,
                config: normalizeConfig(id, config),
                bullet: null,
                sprite: null,
                spriteScene: null,
                hoverSprite: null,
                shown: false,
                enabled: false,
                visibilityTarget: null,
                visualState: null,
                currentImage: null,
                transientState: {},
                pressed: 0,
                x: 0,
                y: 0,
                registrationSerial: ++registrationSerial
            };
            definitions.set(id, button);
            reflowAllLayouts();
            ensureListener();
            saveButtonSession();
            return button;
        },

        registerBottomLeft(id, config) {
            return this.register(id, Object.assign({}, config || {}, { layout: "bottomLeft" }));
        },

        registerTopLeft(id, config) {
            return this.register(id, Object.assign({
                screenSpace: true,
                autoHide: false,
                disableDuringChoice: false,
                updateDuringCooldown: true,
                fadeFrames: 0,
                hoverSe: "cursor",
                hoverTone: [0, 0, 0, 0],
                persist: false
            }, config, { layout: "topLeft" }));
        },

        configureLayout(name, options) {
            name = String(name);
            const current = layouts.get(name) || { startX: 0, startY: 0, spacingX: 0, spacingY: 0 };
            const source = options || {};
            layouts.set(name, {
                startX: Number(source.startX ?? current.startX),
                startY: Number(source.startY ?? current.startY),
                spacingX: Number(source.spacingX ?? current.spacingX),
                spacingY: Number(source.spacingY ?? current.spacingY),
                visibleOnly: source.visibleOnly ?? current.visibleOnly ?? false
            });
            reflowLayout(name);
            saveButtonSession();
            return this;
        },

        registerMany(configs) {
            if (Array.isArray(configs)) {
                configs.forEach(config => this.register(config.id, config));
            } else if (configs && typeof configs === "object") {
                Object.keys(configs).forEach(id => this.register(id, configs[id]));
            }
            return this;
        },

        update(id, patch) {
            const button = definitions.get(String(id));
            if (!button) return null;
            destroyBullet(button);
            button.config = normalizeConfig(button.id, Object.assign({}, button.config, patch || {}));
            button.currentImage = null;
            reflowAllLayouts();
            saveButtonSession();
            return button;
        },

        unregister(id) {
            id = String(id);
            const button = definitions.get(id);
            if (!button) return false;
            destroyBullet(button);
            definitions.delete(id);
            reflowAllLayouts();
            if (hoveredId === id) hoveredId = null;
            if (pressedId === id) pressedId = null;
            if (definitions.size === 0) destroyListener();
            saveButtonSession();
            return true;
        },

        clearCategory(category) {
            for (const button of definitions.values()) {
                if (button.config.category === category) this.unregister(button.id);
            }
            return this;
        },

        clear() {
            for (const button of definitions.values()) destroyBullet(button);
            definitions.clear();
            hoveredId = null;
            destroyListener();
            // 兜底清除可能已脱离 JS 引用、但仍存在于 QJ 容器中的场景按钮子弹。
            deleteSceneButtonProjectiles();
            saveButtonSession();
            return this;
        },

        clearAll() {
            return this.clear();
        },

        get(id) { return definitions.get(String(id)) || null; },
        has(id) { return definitions.has(String(id)); },
        all() { return Array.from(definitions.values()); },

        setVisible(id, visible) {
            const button = this.get(id);
            if (!button) return false;
            savedState(button.id).visible = !!visible;
            ensureListener();
            return true;
        },
        show(id) { return this.setVisible(id, true); },
        hide(id) { return this.setVisible(id, false); },

        setEnabled(id, enabled) {
            const button = this.get(id);
            if (!button) return false;
            savedState(button.id).enabled = !!enabled;
            return true;
        },
        enable(id) { return this.setEnabled(id, true); },
        disable(id) { return this.setEnabled(id, false); },

        resetState(id) {
            const button = this.get(id);
            if (button && !button.config.persist) {
                button.transientState = {};
                return true;
            }
            const store = stateStore();
            if (store) delete store[String(id)];
            return !!this.get(id);
        },

        setPosition(id, x, y) { return this.update(id, { x, y }); },
        setImages(id, image, hoverImage, pressedImage) {
            const button = this.get(id);
            if (!button) return null;
            if (image !== undefined) button.config.image = image;
            if (arguments.length >= 3) button.config.hoverImage = hoverImage;
            if (arguments.length >= 4) button.config.pressedImage = pressedImage;
            hideHoverOverlay(button);
            button.currentImage = null;
            button.visualState = null;

            // 原地更换 QJ 贴图，不销毁按钮，因此点击后的公共冷却不会造成闪烁或消失。
            if (image !== undefined && button.bullet && !button.bullet.dead) {
                if (typeof button.bullet.changeAttribute === "function") {
                    button.bullet.changeAttribute("img", copyQjValue(image));
                } else {
                    const wasShown = button.shown;
                    destroyBullet(button);
                    if (wasShown) createBullet(button);
                }
            }
            saveButtonSession();
            return button;
        },
        setAction(id, action) { return this.update(id, { onClick: action }); },

        showHoverOverlay(id) {
            const button = this.get(id);
            return button ? syncHoverOverlay(button, true) : null;
        },

        hideHoverOverlay(id) {
            const button = this.get(id);
            if (!button) return false;
            hideHoverOverlay(button);
            return true;
        },

        addAction(id, key, condition, action, priority) {
            const button = this.get(id);
            if (!button) return null;
            const actions = button.config.actions;
            const normalizedKey = String(key);
            const oldIndex = actions.findIndex(item => String(item.key) === normalizedKey);
            const entry = { key: normalizedKey, when: condition, run: action, priority: Number(priority || 0) };
            if (oldIndex >= 0) actions.splice(oldIndex, 1, entry);
            else actions.push(entry);
            saveButtonSession();
            return button;
        },

        removeAction(id, key) {
            const button = this.get(id);
            if (!button) return false;
            const index = button.config.actions.findIndex(item => String(item.key) === String(key));
            if (index < 0) return false;
            button.config.actions.splice(index, 1);
            saveButtonSession();
            return true;
        },

        saveSession() {
            return saveButtonSession();
        },

        savedSession() {
            return window.$gameSystem ? ($gameSystem._slgSfeButtonSession || null) : null;
        },

        restoreSavedSession() {
            return restoreSavedButtonSession();
        },

        refresh(id) {
            const button = this.get(id);
            if (!button) return false;
            destroyBullet(button);
            button.currentImage = null;
            return true;
        },

        click(id) { return trigger(this.get(id)); },
        isHovered(id) { return hoveredId === String(id); },

        resetPointerCapture() {
            pressedId = hoveredId = null;
            pointerWasPressed = pointerPressed();
        },

        isKeyHeld(keyName) {
            const button = definitions.get(pressedId);
            return !!(button && button.config.holdKey === keyName &&
                bulletIsCurrent(button.bullet) && !button.bullet.data.paused && bulletIsCurrent(listenerBullet) &&
                sceneIsMap() && !SceneManager.isSceneChanging() && pressedMapId === $gameMap.mapId() &&
                pointerPressed() && shouldShow(button) && isEnabled(button));
        },

        startCooldown(frames) {
            return startGlobalCooldown(frames);
        },

        isCoolingDown() {
            return cooldownIsActive();
        },

        cooldownRemaining() {
            return Math.max(0, cooldownUntilFrame - currentFrameCount());
        },

        isPointerOverButton() {
            if (!sceneIsMap() || cooldownIsActive()) return false;
            const pointerX = TouchInput.x;
            const pointerY = TouchInput.y;
            return !!buttonUnderPointer(pointerX, pointerY);
        },

        updateFrame() {
            discardForeignSceneButtons();
            if (!sceneIsMap() || definitions.size === 0 || listenerBullet?.data.paused) return;
            const coolingDown = cooldownIsActive();
            // 探索按钮保留冻结行为；RPG 按钮在冷却中仍须随窗口及时隐藏。
            if (coolingDown && !this.all().some(button => button.config.updateDuringCooldown)) return;
            currentTick = makeTickSnapshot();
            try {
                updateBackgroundUiMode();
                updateBottomLeftMessageLock();
                for (const button of definitions.values()) {
                    if (coolingDown && !button.config.updateDuringCooldown) continue;
                    const visible = shouldShow(button);
                    if (!bulletIsCurrent(button.bullet)) {
                        destroyBullet(button);
                        // 隐藏状态也保留实体；从 0 开始可避免初始化在演出中时闪现一帧。
                        createBullet(button, 0);
                        button.visibilityTarget = false;
                    }
                    if (!button.bullet || button.bullet.dead) continue;
                    changeButtonVisibility(button, visible);
                    if (!visible) continue;
                    const enabled = isEnabled(button);
                    const permanent = usesPermanentBackground(button);
                    if (enabled || permanent) {
                        button.hoverBackgroundFrozen = false;
                    } else if (button.enabled && currentTick.messageBusy &&
                        button.config.category === "bottomLeft" && HOVER_EFFECT === "background" &&
                        button.config.hoverOverlay && button.hoverSprite?.visible) {
                        button.hoverBackgroundFrozen = true;
                        button.hoverSprite.setHoverVisible(true, true);
                    }
                    button.enabled = enabled;
                    if (!enabled) {
                        cancelBackgroundHide(button.config.category);
                        if (!permanent && !button.hoverBackgroundFrozen) hideHoverOverlay(button);
                    }
                }
                // 可见按钮收拢后再同步坐标，命中范围与本帧布局一致。
                for (const [name, settings] of layouts) {
                    if (settings.visibleOnly) reflowLayout(name);
                }
                for (const button of definitions.values()) {
                    if (!coolingDown || button.config.updateDuringCooldown) {
                        syncPosition(button);
                        syncDescription(button);
                    }
                }
                if (pressedId && (!definitions.get(pressedId)?.shown || !definitions.get(pressedId)?.enabled)) pressedId = null;
                if (coolingDown) return;

                // 仅对显示且可用的按钮比较贴图矩形，不使用 QJ/SAT 碰撞查询。
                const hovered = buttonUnderPointer(currentTick.pointerX, currentTick.pointerY);
                const nextHoveredId = hovered ? hovered.id : null;
                if (nextHoveredId !== hoveredId && hovered && hovered.enabled) playSe(hovered.config.hoverSe);
                hoveredId = nextHoveredId;
                updateBackgroundHover(hovered);

                if (definitions.get(pressedId)?.config.holdKey &&
                    (!currentTick.pressed || hoveredId !== pressedId)) pressedId = null;
                if (hovered && hovered.enabled && currentTick.triggered) {
                    if (hovered.config.holdKey || hovered.config.triggerOnRelease) {
                        pressedId = hovered.id;
                        pressedMapId = currentTick.mapId;
                    }
                    else trigger(hovered);
                }
                const releasedButton = currentTick.released && pressedId ? definitions.get(pressedId) : null;
                if (currentTick.released) pressedId = null;
                for (const button of definitions.values()) {
                    if (usesPermanentBackground(button)) {
                        syncHoverOverlay(button, true);
                        continue;
                    }
                    const showOverlay = button.config.hoverOverlay
                        ? (HOVER_EFFECT === "background"
                            ? button.config.category === hovered?.config.category || backgroundHideTimers.has(button.config.category)
                            : button === hovered || button.id === pressedId)
                        : !!button.hoverSprite?.visible;
                    syncHoverOverlay(button, showOverlay);
                }
                if (releasedButton) trigger(releasedButton);
            } finally {
                currentTick = null;
            }
        },

        ensureListener() {
            return ensureListener();
        }
    };

    root.Buttons = Buttons;
    root.version = "0.6.1";
    // 合并长按状态；松开/隐藏/离开地图即失效，不写 _currentState，避免覆盖实体 Ctrl 或虚拟键。
    const inputIsPressed = Input.isPressed;
    Input.isPressed = function(keyName) {
        return inputIsPressed.call(this, keyName) || Buttons.isKeyHeld(keyName);
    };

    // 在消息窗口处理输入之前捕获手势，不能依赖隔帧更新的 hoveredId。
    const touchOnTrigger = TouchInput._onTrigger;
    TouchInput._onTrigger = function(x, y) {
        touchOnTrigger.call(this, x, y);
        this._slgSfeMessageBlocked = captureMessagePointer(x, y);
    };
    for (const name of ["_onRelease", "_onTouchCancel", "clear"]) {
        const original = TouchInput[name];
        TouchInput[name] = function(...args) {
            original.apply(this, args);
            this._slgSfeMessageBlocked = false;
        };
    }
    // 每次启动均发布同一路径，QJ 读档时不依赖上次进程的函数缓存。
    if (window.QJ && QJ.MPMZ) QJ.MPMZ.slgSfeListenerMoveF = listenerMoveF;

    PluginManager.registerCommand(pluginName, "showButton", args => Buttons.show(args.id));
    PluginManager.registerCommand(pluginName, "hideButton", args => Buttons.hide(args.id));
    PluginManager.registerCommand(pluginName, "enableButton", args => Buttons.enable(args.id));
    PluginManager.registerCommand(pluginName, "disableButton", args => Buttons.disable(args.id));
    PluginManager.registerCommand(pluginName, "resetButtonState", args => Buttons.resetState(args.id));

    if (!(window.QJ && QJ.MPMZ)) {
        warn("未检测到 QJ-MapProjectileMZ；请把本插件放在它的下方。按钮会等待依赖可用后再创建。");
    }
})();
