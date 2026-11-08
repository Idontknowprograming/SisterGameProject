/*:
 * @target MZ
 * @plugindesc [v1.0] 独立玩家 HP / 状态 HUD，支持 Drill 状态说明与文本生命值。
 * @author NEWUSUIMO
 * @help
 * 放在 Drill_MiniPlateForState 后，关闭 MOG_ActorHud 后启用本插件。
 * 回退：关闭本插件，重新启用 MOG_ActorHud。旧插件文件无需修改。
 * 保留 $gameSystem._ahud_visible、旧 MZ / MV 显隐指令及存档显隐数据。
 * 使用 img/actorhud/Layout、HP_Meter 和 img/system/IconSet_large。
 * FontFile 可指定 fonts 内的字体文件；FontFace 为注册的字体名称。
 * 空血区域文字颜色按真实 HP / 最大 HP 判断，有血区域保持 NormalColor，数字独立缓动。
 * 默认位置由 HudX / HudY 控制，保持底部居中与移动端补偿。
 * PlayerHpHud.setPosition(x, y)：设置底图左上角的画面像素坐标，右/下为正。
 * PlayerHpHud.resetPosition()：清除运行时坐标，恢复默认定位。
 * PlayerHpHud.getPosition() / getDefaultPosition()：读取当前/默认坐标 {x, y}。
 * 尚无 HUD 或素材未就绪时读取默认坐标返回 null；预设运行时坐标仍有效。
 * 坐标跨场景沿用，不写入存档；新游戏和读档时恢复默认。
 * 血条、数字、状态图标及悬浮区域随位置立即同步。
 * 护盾仅预留接口：PlayerHpHud.setShieldProvider(actor => 数值)。
 * 固定宽度，分母 max(最大HP, 当前HP + 护盾)，优先占用空血区域。
 * 本插件不负责护盾伤害结算、保存或到期计时。
 * @command SetVisible
 * @text 显示/隐藏 HUD
 * @arg visible
 * @type boolean
 * @default true
 * @param FontFace
 * @text HP字体（空为系统字体）
 * @type string
 * @default Chiron GoRound Numbers
 * @param FontFile
 * @text 字体文件（可选，fonts目录）
 * @type string
 * @default ChironGoRoundTC-NumbersSymbols.ttf
 * @param FontSize
 * @text 字号
 * @type number
 * @default 14
 * @param TextX
 * @text 数字水平偏移（相对生命条中心）
 * @type number
 * @default 0
 * @param TextY
 * @text 数字垂直偏移（相对生命条中心）
 * @type number
 * @default 0
 * @param TextWidth
 * @text 数字区域宽度
 * @type number
 * @default 246
 * @param TextFormat
 * @text 格式：{hp} / {mhp}
 * @type string
 * @default {hp} / {mhp}
 * @param NormalColor
 * @text 有血区域文字颜色
 * @type string
 * @default #303030
 * @param EmptyColor
 * @text 空血区域正常文字颜色
 * @type string
 * @default #dadada
 * @param WarningColor
 * @text 警戒颜色
 * @type string
 * @default #ffd166
 * @param DangerColor
 * @text 危险颜色
 * @type string
 * @default #ff6060
 * @param WarningPercent
 * @text 警戒百分比
 * @type number
 * @default 50
 * @param DangerPercent
 * @text 危险百分比
 * @type number
 * @default 25
 * @param OutlineColor
 * @text 描边颜色（兼容旧参数，HP不使用）
 * @type string
 * @default rgba(0,0,0,0)
 * @param OutlineWidth
 * @text 描边宽度（兼容旧参数，HP不使用）
 * @type number
 * @default 0
 * @param HudX
 * @text HUD 水平偏移（相对画面中心）
 * @type number
 * @default 0
 * @param HudY
 * @text HUD 距离画面底部
 * @type number
 * @default 32
 * @param MeterRightInset
 * @text 生命条距底图右边缘
 * @type number
 * @default 20
 * @param MeterOffsetY
 * @text 生命条垂直居中偏移
 * @type number
 * @min -1000
 * @default 0
 * @param MobileScale
 * @text 移动端倍率
 * @type string
 * @default 1.6
 */
(() => {
    'use strict';
    const name = 'PlayerHpHud';
    const p = { ...PluginManager.parameters(name) };
    // The editor can write its cached v1 parameter set back to plugins.js.
    // Migrate only the identifiable original preset; retain independently customized values.
    if (p.TextX === '350' && p.TextFormat === '{hp}' && p.FontFace === 'MPLUS2ExtraBold') {
        const legacy = {
            FontFace: ['MPLUS2ExtraBold', 'Chiron GoRound Numbers'],
            FontFile: ['MPLUS2-ExtraBold.ttf', 'ChironGoRoundTC-NumbersSymbols.ttf'],
            FontSize: ['20', '14'], TextX: ['350', '0'], TextY: ['-3', '0'],
            TextWidth: ['110', '246'], TextFormat: ['{hp}', '{hp} / {mhp}'],
            NormalColor: ['#ffffff', '#303030'],
            OutlineColor: ['rgba(0,0,0,0.8)', 'rgba(255,255,255,0.65)'],
            OutlineWidth: ['3', '1'], HudX: ['32', '0'], HudY: ['50', '32']
        };
        for (const [key, [oldValue, newValue]] of Object.entries(legacy)) {
            if (p[key] === oldValue) p[key] = newValue;
        }
    }
    const num = (key, fallback) => p[key] !== undefined && p[key] !== '' && Number.isFinite(Number(p[key])) ? Number(p[key]) : fallback;
    // Inset 8 is the obsolete pre-left-shift preset that the editor may restore.
    const config = {
        meterRightInset: num('MeterRightInset', 20) === 8 ? 20 : num('MeterRightInset', 20), meterOffsetY: num('MeterOffsetY', 0),
        x: num('HudX', 0), y: num('HudY', 32), mobileScale: Math.max(0.1, num('MobileScale', 1.6)),
        font: p.FontFace || '', fontSize: Math.max(1, num('FontSize', 14)),
        textX: num('TextX', 0), textY: num('TextY', 0), textWidth: Math.max(1, num('TextWidth', 246)),
        format: p.TextFormat || '{hp} / {mhp}', normal: p.NormalColor || '#303030',
        empty: p.EmptyColor || '#dadada', warning: p.WarningColor || '#ffd166', danger: p.DangerColor || '#ff6060',
        warningRatio: num('WarningPercent', 50) / 100, dangerRatio: num('DangerPercent', 25) / 100,
        // HP text intentionally has no outline, including with cached editor parameters.
        outline: 'rgba(0,0,0,0)', outlineWidth: 0
    };
    // Scene_Boot waits for FontManager; the HUD needs no runtime font polling.
    if (p.FontFile && config.font) FontManager.load(config.font, p.FontFile);
    // Session-only placement: never attach coordinates or sprites to saved game objects.
    let runtimePosition = null;
    let activeHud = null;
    function syncPosition() {
        if (!activeHud) return;
        activeHud.updatePosition();
        activeHud._states.syncTooltip(activeHud.worldVisible && activeHud.opacity > 0);
    }
    let shieldProvider = () => 0;
    const finite = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
    const approach = (value, target, speed) => {
        if (value === target) return target;
        const step = 1 + Math.abs(target - value) / speed;
        return value < target ? Math.min(target, value + step) : Math.max(target, value - step);
    };
    // Pure layout calculation; shield ownership and combat rules remain outside the HUD.
    const proportions = (hp, maxHp, shield) => {
        hp = Math.min(finite(hp), finite(maxHp));
        shield = finite(shield);
        const denominator = Math.max(1, finite(maxHp), hp + shield);
        return { hp: hp / denominator, shield: shield / denominator, denominator };
    };
    window.PlayerHpHud = {
        setPosition(x, y) {
            if (!Number.isFinite(x) || !Number.isFinite(y)) {
                throw new TypeError('HUD coordinates must be finite numbers');
            }
            runtimePosition = { x, y };
            syncPosition();
        },
        resetPosition() {
            runtimePosition = null;
            syncPosition();
        },
        getPosition() {
            return runtimePosition ? { ...runtimePosition } : this.getDefaultPosition();
        },
        getDefaultPosition() {
            return activeHud ? activeHud.defaultPosition() : null;
        },
        setShieldProvider(provider) {
            if (typeof provider !== 'function') throw new TypeError('Shield provider must be a function');
            shieldProvider = provider;
        },
        proportions
    };
    const createGameObjects = DataManager.createGameObjects;
    DataManager.createGameObjects = function() {
        runtimePosition = null;
        activeHud = null;
        return createGameObjects.apply(this, arguments);
    };
    const initializeSystem = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        initializeSystem.call(this);
        this._actorHudData ||= { visible: true };
        this._ahud_opacity ??= 0;
        this._ahud_smartFade ??= false;
        this._ahud_autoFade ??= true;
    };
    function visibilityData() {
        if (Object.prototype.hasOwnProperty.call($gameSystem, '_ahud_visible')) {
            const visible = !!$gameSystem._ahud_visible;
            delete $gameSystem._ahud_visible;
            ($gameSystem._actorHudData ||= {}).visible = visible;
        }
        if (!$gameSystem._actorHudData) $gameSystem._actorHudData = { visible: true };
        if ($gameSystem._actorHudData.visible === undefined) $gameSystem._actorHudData.visible = true;
        return $gameSystem._actorHudData;
    }
    if (!Object.getOwnPropertyDescriptor(Game_System.prototype, '_ahud_visible')) {
        Object.defineProperty(Game_System.prototype, '_ahud_visible', {
            configurable: true,
            get() { return this._actorHudData ? !!this._actorHudData.visible : true; },
            set(value) { (this._actorHudData ||= {}).visible = !!value; }
        });
    }
    const setVisible = data => { visibilityData().visible = String(data.visible) === 'true'; };
    PluginManager.registerCommand(name, 'SetVisible', setVisible);
    PluginManager.registerCommand('MOG_ActorHud', 'ActorHudVisible', setVisible);
    const oldCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        if (oldCommand) oldCommand.call(this, command, args);
        if (command === 'show_actor_hud') visibilityData().visible = true;
        if (command === 'hide_actor_hud') visibilityData().visible = false;
    };

    class HpText extends Sprite {
        constructor(hudScale) {
            // Rasterize once at the HUD's final scale; cancel parent scaling on this sprite.
            const resolution = hudScale;
            const height = Math.max(32, config.fontSize + config.outlineWidth * 2 + 8);
            super(new Bitmap(Math.ceil(config.textWidth * resolution), Math.ceil(height * resolution)));
            this._resolution = resolution;
            this.scale.set(1 / resolution);
            this.x = config.textX - this.bitmap.width * this.scale.x / 2;
            this.y = config.textY;
            this._key = '';
            this._filledRight = 0;
        }
        refresh(hp, maxHp, displayed) {
            const font = config.font || $gameSystem.mainFontFace();
            const ratio = maxHp > 0 ? hp / maxHp : 0;
            const color = ratio <= config.dangerRatio ? config.danger : ratio <= config.warningRatio ? config.warning : config.empty;
            const b = this.bitmap;
            const split = Math.max(0, Math.min(b.width, (this._filledRight - this.x) * this._resolution));
            const text = config.format.replace(/\{hp\}/g, String(Math.round(displayed))).replace(/\{mhp\}/g, String(maxHp));
            const key = JSON.stringify([text, color, font, split]);
            if (key === this._key) return;
            this._key = key;
            b.clear();
            b.fontFace = font;
            b.fontSize = config.fontSize * this._resolution;
            if (split <= 0) {
                b.textColor = color;
            } else if (split >= b.width) {
                b.textColor = config.normal;
            } else {
                // Coincident stops give an exact spatial color split, even within a glyph.
                // Canvas fills the whole string once; no character measurement or extra sprite.
                const gradient = b.context.createLinearGradient(0, 0, b.width, 0);
                gradient.addColorStop(0, config.normal);
                gradient.addColorStop(split / b.width, config.normal);
                gradient.addColorStop(split / b.width, color);
                gradient.addColorStop(1, color);
                b.textColor = gradient;
            }
            b.outlineColor = config.outline;
            b.outlineWidth = config.outlineWidth;
            b.drawText(text, 0, 0, b.width, b.height, 'center');
        }
        destroy() {
            this.bitmap.destroy();
            super.destroy();
        }
    }

    const stateIconSize = 48;
    const stateRowGap = 8;

    class StateRow extends Sprite {
        constructor() {
            super();
            this.x = 0;
            this.y = -stateIconSize - stateRowGap;
            this._atlas = ImageManager.loadSystem('IconSet_large');
            this._icons = [];
            this._ids = [];
            this._ticks = 0;
            this._buffs = Array(8).fill(0);
        }
        refresh(actor) {
            if (!this._atlas.isReady()) return;
            const states = actor.states().filter(state => state && state.iconIndex > 0);
            this._ids = states.map(state => state.id);
            while (this._icons.length > states.length) {
                const icon = this._icons.pop();
                this.removeChild(icon);
                icon.bitmap.destroy();
                icon.destroy();
            }
            const refreshCounters = this._ticks++ % 60 === 0;
            states.forEach((state, index) => {
                let icon = this._icons[index];
                if (!icon) {
                    icon = new Sprite(new Bitmap(64, 64));
                    icon.scale.set(stateIconSize / 64);
                    icon.x = index * stateIconSize;
                    this._icons.push(icon);
                    this.addChild(icon);
                }
                if (refreshCounters || icon._stateId !== state.id) {
                    const minutes = $gameSystem.getTimeEventRemainingMinutes ? $gameSystem.getTimeEventRemainingMinutes('state' + state.id) : 0;
                    icon._counter = minutes > 0 && minutes < 4 ? minutes : '';
                    icon._stateId = state.id;
                }
                const counter = icon._counter;
                const font = config.font || $gameSystem.mainFontFace();
                const key = JSON.stringify([state.id, state.iconIndex, counter, font]);
                if (icon._key === key) return;
                icon._key = key;
                const b = icon.bitmap;
                b.clear();
                b.blt(this._atlas, state.iconIndex % 16 * 64, Math.floor(state.iconIndex / 16) * 64, 64, 64, 0, 0);
                if (counter !== '') {
                    b.fontFace = font;
                    b.fontSize = 30;
                    b.textColor = '#b7b7b7';
                    b.outlineWidth = 4;
                    b.drawText(String(counter), 16, 16, 32, 32, 'center');
                }
            });
        }
        syncTooltip(shown) {
            const tank = $gameTemp._drill_MPFS_beanTank;
            if (typeof Drill_MPFS_Bean === 'undefined' || !tank) return;
            if (!this._bean) this._bean = new Drill_MPFS_Bean();
            if (!tank.includes(this._bean)) tank.push(this._bean);
            const bean = this._bean;
            bean.drill_bean_setVisible(shown && this._ids.length > 0);
            // Force current transforms: hit areas include mobile scale and parent offsets.
            const origin = this.toGlobal(new PIXI.Point(0, 0));
            const corner = this.toGlobal(new PIXI.Point(stateIconSize, stateIconSize));
            const width = Math.abs(corner.x - origin.x);
            bean.drill_bean_setPosition(origin.x, origin.y);
            bean.drill_bean_resetFrame(0, 0, width * this._ids.length, Math.abs(corner.y - origin.y));
            bean.drill_bean_setIconWidth(width);
            bean.drill_bean_setStateAndBuff(this._ids, this._buffs);
            bean.drill_bean_setLayer('图片层');
        }
        destroy() {
            const tank = $gameTemp._drill_MPFS_beanTank;
            if (this._bean) {
                this._bean.drill_bean_setVisible(false);
                const index = tank ? tank.indexOf(this._bean) : -1;
                if (index >= 0) tank.splice(index, 1);
            }
            this._icons.forEach(icon => icon.bitmap.destroy());
            super.destroy();
        }
    }

    class PlayerHud extends Sprite {
        constructor() {
            super();
            const mobile = Utils.isMobileDevice();
            this.scale.set(mobile ? config.mobileScale : 1);
            this.x = 0;
            this.y = 0;
            this.opacity = finite($gameSystem._ahud_opacity);
            this.z = 101;
            this._hud_size = [-1, -1, -1, -1];
            this._layout = new Sprite(ImageManager.loadBitmap('img/actorhud/', 'Layout'));
            this.addChild(this._layout);
            this._meter = ImageManager.loadBitmap('img/actorhud/', 'HP_Meter');
            this._trail = new Sprite(this._meter);
            this._health = new Sprite(this._meter);
            this._shield = new Sprite(new Bitmap(1, 1));
            this._shield.bitmap.fillAll('#eeeeee');
            for (const sprite of [this._trail, this._health, this._shield]) {
                sprite.x = 0;
                sprite.y = 0;
                sprite.visible = false;
                this.addChild(sprite);
            }
            this._text = new HpText(this.scale.x);
            this._states = new StateRow();
            this.addChild(this._text);
            this.addChild(this._states);
        }
        defaultPosition() {
            if (!this._layout.bitmap.isReady()) return null;
            // Keep the existing responsive default and the user's mobile Y compensation.
            const scaledYOffset = 20 * Math.max(0, this.scale.y - 1);
            return {
                x: (Graphics.width - this._layout.bitmap.width * this.scale.x) / 2 + config.x,
                y: Graphics.height - config.y - this._layout.bitmap.height * this.scale.y + scaledYOffset
            };
        }
        updatePosition() {
            const position = runtimePosition || this.defaultPosition();
            if (!position) return;
            this.x = position.x;
            this.y = position.y;
            if (this._layout.bitmap.isReady()) {
                this._hud_size = [this.x, this.y, this.x + this._layout.bitmap.width * this.scale.x,
                    this.y + this._layout.bitmap.height * this.scale.y];
            }
        }
        update() {
            super.update();
            this.updatePosition();
            visibilityData();
            const actor = $gameParty.members()[0];
            if (!actor) {
                this.visible = false;
                this._actor = null;
                this._battler = null;
                this._states.syncTooltip(false);
                return;
            }
            const hp = finite(actor.hp), maxHp = finite(actor.mhp), shield = finite(shieldProvider(actor));
            if (this._actor !== actor) {
                this._actor = actor;
                this._displayHp = hp;
                this._trailHp = hp;
                this._displayShield = shield;
            }
            this._battler = actor; // Legacy imouto hover helper compatibility.
            this.visible = true;
            this.opacity += visibilityData().visible ? 10 : -15;
            $gameSystem._ahud_opacity = this.opacity;
            this._displayHp = approach(this._displayHp, hp, 30);
            this._trailHp = approach(this._trailHp, hp, 160);
            this._displayShield = approach(this._displayShield, shield, 20);
            this.refreshMeter(hp, maxHp);
            this._text.refresh(hp, maxHp, this._displayHp);
            this._states.refresh(actor);
            this._states.syncTooltip(this.worldVisible && this.opacity > 0);
        }
        refreshMeter(hp, maxHp) {
            if (!this._meter.isReady() || !this._layout.bitmap.isReady()) return;
            const width = this._meter.width, height = this._meter.height / 2;
            const layoutWidth = this._layout.bitmap.width, layoutHeight = this._layout.bitmap.height;
            const meterX = layoutWidth - config.meterRightInset - width;
            const meterY = (layoutHeight - height) / 2 + config.meterOffsetY;
            this._trail.x = this._health.x = meterX;
            this._trail.y = this._health.y = this._shield.y = meterY;
            this._text.x = meterX + width / 2 - this._text.bitmap.width * this._text.scale.x / 2 + config.textX;
            this._text.y = meterY + height / 2 - this._text.bitmap.height * this._text.scale.y / 2 + config.textY;
            this._states.x = meterX;
            this._states.y = -stateIconSize - stateRowGap;
            const parts = proportions(hp, maxHp, this._displayShield);
            this._trail.visible = this._health.visible = true;
            this._trail.setFrame(0, height, width * Math.min(1, this._trailHp / parts.denominator), height);
            this._health.setFrame(0, 0, width * parts.hp, height);
            this._shield.visible = parts.shield > 0;
            this._shield.x = meterX + width * parts.hp;
            this._shield.scale.set(width * parts.shield, height);
            // The reserved shield is also white, so keep its overlaid text dark.
            this._text._filledRight = meterX + width * (parts.hp + parts.shield);
        }
        destroy() {
            if (activeHud === this) activeHud = null;
            this._shield.bitmap.destroy();
            super.destroy();
        }
    }
    const createSpriteset = Scene_Map.prototype.createSpriteset;
    Scene_Map.prototype.createSpriteset = function() {
        createSpriteset.call(this);
        // If both plugins are accidentally enabled, keep the original as the sole HUD.
        if (window.Imported && Imported.MOG_ActorHud) return;
        if (!this._hudField) {
            this._hudField = new Sprite();
            this._hudField.z = 10;
            this.addChild(this._hudField);
        }
        this._playerHpHud = new PlayerHud();
        this._actorHud = this._playerHpHud; // Existing project scripts read this scene property.
        this._hudField.addChild(this._playerHpHud);
        activeHud = this._playerHpHud;
        activeHud.updatePosition();
        this._hudField.children.sort((a, b) => (a.z || 0) - (b.z || 0));
    };
    const snap = Scene_Map.prototype.snapForBattleBackground;
    Scene_Map.prototype.snapForBattleBackground = function() {
        const hud = this._playerHpHud;
        const visible = hud && hud.visible;
        if (hud) hud.visible = false;
        try { return snap.call(this); }
        finally { if (hud) hud.visible = visible; }
    };
})();
