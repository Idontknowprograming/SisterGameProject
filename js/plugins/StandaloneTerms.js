/*:
 * @target MZ
 * @plugindesc v1.1.4 独立界面多语言术语：Saikey 名称兼容、闪烁白描边、WAY 动态描述。
 * @author shiroin / Codex
 * @base shiroin_multilingualSupport
 * @base StandaloneEquipScene
 * @base StandaloneCompendium
 * @base WAY_EvalText
 * @orderAfter shiroin_multilingualSupport
 * @orderAfter StandaloneEquipScene
 * @orderAfter StandaloneCompendium
 * @orderAfter WAY_EvalText
 * @orderAfter Saikey_HoverWindow
 * @param FontSize
 * @text 说明字号
 * @type number
 * @min 12
 * @default 22
 * @param MaxWidth
 * @text 说明最大宽度
 * @type number
 * @min 200
 * @default 420
 * @param MaxHeight
 * @text 说明最大高度
 * @type number
 * @min 720
 * @default 720
 * @param TermColor
 * @text 术语颜色
 * @desc 留空继承正文颜色；name 内仍可使用颜色转义符。
 * @default #f3cd8d
 * @param HoverDelay
 * @text 悬停等待帧数
 * @type number
 * @min 0
 * @default 12
 * @param OutlinePulseFrames
 * @text 白描边闪烁周期
 * @type number
 * @min 30
 * @desc 一次从暗到亮再回暗的场景帧数。只作用于有描述的术语字形。
 * @default 90
 * @help
 * 放在多语言、Drill 文本、WAY_EvalText 和两个独立界面插件之后。
 * 在 drawTextEx 文本中写 \dMPFCstart[redHeart]，自动显示 JSON 中的 name，
 * 悬浮显示 description。不再需要手写名称、字符块或结束标记。
 * 数字键也支持；\dMPFCend 仅作为可选兼容标记被忽略。
 * 文件：data/CN/GameTermsTextCN.json，其他语言同目录/后缀规则。
 * 格式：{"redHeart":{"name":"红心","description":"在此填写术语说明。"}}
 * JSON 内转义字符的反斜杠需要双写。description 也可使用字符串数组。
 * 数据由多语言系统 LOCALE_RESOURCES 的 gameTermsText 统一加载、合并。
 * 缺译处理沿用多语言系统；空 description 不弹窗。
 * 默认仅 Scene_StandaloneCompendium / Scene_StandaloneEquip 生效。
 * 地图不挂术语输入监听、不创建术语窗口、不执行术语更新。
 * Saikey_HoverWindow 的普通/强制窗口支持术语名称转换，沿用正文样式；
 * 名称内的颜色等转义符仍然生效，地图悬停窗口不追加二级术语弹窗。
 * 鼠标悬停；触屏按住显示，松开/拖动取消。长说明自动滚动。
 * 说明窗口只显示 description；正文术语附带循环明暗的白色描边。
 * description 支持 WAY_EvalText 的 ${...}，包括函数调用中的对象参数。
 * 每次弹出时求值一次，测量/绘制共用结果；再次悬停重新取值。
 * 使用 img/system/Saikey_HoverWindow/nine/00 ~ 22，不依赖 Saikey 的代码。
 * StandaloneTerms.registerScene(SceneClass) 注册其他 Scene_Base 独立界面。
 * StandaloneTerms.attachWindow(windowInstance) 接入之后动态创建的文字窗口。
 * 修改 JSON 后通过 DataManager.reloadLanguage(false) 统一重载，再进入界面。
 * 详细范围、限制与示例见 StandaloneTerms.README.md。
 */
(() => {
    'use strict';
    const params = PluginManager.parameters('StandaloneTerms');
    const settings = {
        fontSize: Number(params.FontSize || 22),
        maxWidth: Math.max(200, Number(params.MaxWidth || 420)),
        maxHeight: Math.max(720, Number(params.MaxHeight || 720)),
        color: params.TermColor === undefined ? '#f3cd8d' : params.TermColor,
        delay: Number(params.HoverDelay === undefined ? 12 : params.HoverDelay),
        pulseFrames: Math.max(30, Number(params.OutlinePulseFrames || 90))
    };
    const PADDING = 45;
    const TEXT_BLEED = 5;
    const OUTLINE_PADDING = 4;
    const registered = new Set();
    const fontProperties = ['fontFace', 'fontSize', 'fontBold', 'fontItalic', '_drill_COWC_fontBold',
        'textColor', 'outlineColor', 'outlineWidth'];
    const marker = /(\\{1,2}|\x1b)dMPFC(?:start\[([^\]\r\n]+)\]|end\b)/gi;
    let active = null;

    const validateTable = (table, url) => {
        if (!table || Array.isArray(table) || typeof table !== 'object') {
            throw new Error(`[StandaloneTerms] ${url}: 顶层必须是术语对象。`);
        }
        for (const [key, entry] of Object.entries(table)) {
            if (!entry || Array.isArray(entry) || typeof entry !== 'object' ||
                    (entry.name !== undefined && typeof entry.name !== 'string') ||
                    (entry.description !== undefined && typeof entry.description !== 'string' &&
                        !(Array.isArray(entry.description) && entry.description.every(line => typeof line === 'string')))) {
                throw new Error(`[StandaloneTerms] ${url}: ${key} 的 name/description 格式错误。`);
            }
            if (/dMPFCstart\[/i.test(entry.name || '')) {
                throw new Error(`[StandaloneTerms] ${url}: ${key}.name 不可嵌套术语。`);
            }
        }
        return table;
    };
    const loadTable = () => validateTable(window.gameTermsText, 'gameTermsText');

    const expandTerms = (text, resolveEntry, entries = null, convertName = name => name, converted = false) => {
        const pattern = converted ? /(\x1b)dMPFC(?:start\[([^\]\r\n]+)\]|end\b)/gi : marker;
        return String(text).replace(pattern, (match, slash, key) => {
            if (slash === '\\\\') return match;
            if (key === undefined) return '';
            const entry = resolveEntry(key.trim());
            const name = convertName(entry.name);
            if (!entries) return name;
            const id = entries.push(entry) - 1;
            return `\x1bTERMOPEN[${id}]${name}\x1bTERMCLOSE[0]`;
        });
    };

    // Preserve an object's own/inherited method distinction when releasing it.
    const replaceMethod = (object, name, replacement, undo) => {
        const descriptor = Object.getOwnPropertyDescriptor(object, name);
        object[name] = replacement;
        undo.push(() => {
            if (descriptor) Object.defineProperty(object, name, descriptor);
            else delete object[name];
        });
    };
    const intersects = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x &&
        a.y < b.y + b.height && a.y + a.height > b.y;

    // WAY's installed matcher excludes braces/backslashes inside ${...}. Keep
    // its evaluator and local a/s/v/p/item/skill bindings; encode only the source
    // of each complete expression into a form that its matcher can accept.
    const prepareWayText = text => {
        let result = '', cursor = 0;
        while (cursor < text.length) {
            const start = text.indexOf('${', cursor);
            if (start < 0) return result + text.slice(cursor);
            let end = start + 2, depth = 1, quote = '';
            for (; end < text.length; end++) {
                const char = text[end], next = text[end + 1];
                if (quote) {
                    if (char === '\\') end++;
                    else if (char === quote) quote = '';
                } else if (char === '"' || char === "'" || char === '`') {
                    quote = char;
                } else if (char === '/' && next === '/') {
                    const newline = text.indexOf('\n', end + 2);
                    end = newline < 0 ? text.length : newline;
                } else if (char === '/' && next === '*') {
                    const close = text.indexOf('*/', end + 2);
                    end = close < 0 ? text.length : close + 1;
                } else if (char === '{') {
                    depth++;
                } else if (char === '}' && --depth === 0) {
                    break;
                }
            }
            if (depth !== 0) return result + text.slice(cursor);
            const code = text.slice(start + 2, end);
            const points = Array.from(code, char => char.codePointAt(0)).join(',');
            result += text.slice(cursor, start) + '${eval(String.fromCodePoint(' + points + '))}';
            cursor = end + 1;
        }
        return result;
    };

    class Window_TermDescription extends Window_Base {
        initialize() {
            this._termDescriptionWindow = true;
            this._textHeight = 0;
            super.initialize(new Rectangle(0, 0, settings.maxWidth, 200));
            this.opacity = 0;
            this.frameVisible = false;
            this._background = new Sprite();
            this.addChildAt(this._background, 0);
            this._parts = [];
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 3; col++) {
                    const bitmap = ImageManager.loadBitmap('img/system/Saikey_HoverWindow/', `nine/${row}${col}`);
                    bitmap.smooth = false;
                    const part = row === 1 || col === 1 ? new TilingSprite(bitmap) : new Sprite(bitmap);
                    this._background.addChild(part);
                    this._parts.push(part);
                }
            }
            this.visible = false;
        }
        updatePadding() { this.padding = PADDING; }
        _refreshBack() {}
        _refreshFrame() {}
        resetFontSettings() { super.resetFontSettings(); this.contents.fontSize = settings.fontSize; }
        resetTextColor() { this.changeTextColor('#ffffff'); }
        lineHeight() { return settings.fontSize + 8; }
        contentsHeight() { return Math.max(this.innerHeight, this._textHeight || 0); }
        descriptionTextWidth() { return this.innerWidth - TEXT_BLEED * 2; }
        convertEscapeCharacters(text) {
            // showEntry prepares one immutable result before measuring. Returning
            // it directly also prevents literal backslashes/results being re-evaluated.
            return text === this._preparedDescription ? text : super.convertEscapeCharacters(text);
        }
        createTextState(text, x, y, width) {
            // Big images extend outside their text slots. Keep five pixels on
            // all sides, including during measurement and at both scroll ends.
            const state = super.createTextState(text, x + TEXT_BLEED, y + TEXT_BLEED,
                width > 0 ? width - TEXT_BLEED * 2 : this.descriptionTextWidth());
            state._termsWordEnd = 0;
            return state;
        }
        wrapBefore(state, width) {
            const used = Math.abs(state.x - state.startX) + this.textWidth(state.buffer);
            if (used > 0 && used + width > this.descriptionTextWidth()) {
                this.flushTextState(state);
                this.processNewLine(state);
                state._termsSoftStart = true;
            }
        }
        processCharacter(state) {
            if (state.index >= state._termsWordEnd) {
                const rest = state.text.slice(state.index);
                const char = String.fromCodePoint(rest.codePointAt(0));
                if (char.charCodeAt(0) >= 32 && !/\s/u.test(char)) {
                    const cjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(char);
                    let token = (!cjk && /^[\p{L}\p{N}\p{M}_]+(?:['’.-][\p{L}\p{N}\p{M}_]+)*/u.exec(rest) || [char])[0];
                    if (this.textWidth(token) > this.descriptionTextWidth()) token = (/^\P{M}\p{M}*/u.exec(rest) || [char])[0];
                    this.wrapBefore(state, this.textWidth(token));
                    state._termsWordEnd = state.index + token.length;
                    state._termsSoftStart = false;
                } else if (state._termsSoftStart && /[^\S\r\n]/u.test(char)) {
                    state.index += char.length;
                    return;
                }
            }
            super.processCharacter(state);
        }
        processDrawIcon(index, state) {
            this.wrapBefore(state, this.contents.fontSize + 4);
            super.processDrawIcon(index, state);
        }
        processDrawBigImage(id, state, x, y) {
            this.wrapBefore(state, id === 10 ? DrillUp.g_DTBI_bitmaps[9].width : 32);
            super.processDrawBigImage(id, state, x, y);
        }
        showEntry(entry, controller) {
            // References inside descriptions render their names without nesting popups.
            const raw = prepareWayText(controller.expand(entry.description));
            this._drill_DFF_activeFont = null;
            this._textHeight = 0;
            this.move(this.x, this.y, Math.min(settings.maxWidth, Graphics.width), 200);
            this.createContents();
            const text = super.convertEscapeCharacters(raw);
            this._preparedDescription = text;
            try {
                this._textHeight = Math.ceil(this.textSizeEx(text).height) + TEXT_BLEED * 2;
                const height = Math.min(Math.max(200, this._textHeight + PADDING * 2), settings.maxHeight, Graphics.height);
                this.move(this.x, this.y, this.width, height);
                this.createContents();
                this.drawTextEx(text, 0, 0, this.innerWidth);
            } finally { this._preparedDescription = null; }
            this._scrollMax = Math.max(0, this._textHeight - this.innerHeight);
            this._scrollOffset = 0;
            this._scrollDirection = 1;
            this._scrollWait = 90;
            this.origin.y = 0;
            const xs = [0, 49, this.width - 50], ys = [0, 48, this.height - 49];
            const widths = [49, this.width - 99, 50], heights = [48, this.height - 97, 49];
            this._parts.forEach((part, index) => {
                const row = Math.floor(index / 3), col = index % 3;
                if (part instanceof TilingSprite) part.move(xs[col], ys[row], widths[col], heights[row]);
                else part.move(xs[col], ys[row]);
            });
            this.visible = true;
        }
        update() {
            super.update();
            if (!this.visible || !this._scrollMax) return;
            if (this._scrollWait > 0) { this._scrollWait--; return; }
            this._scrollOffset = Math.max(0, Math.min(this._scrollMax, this._scrollOffset + this._scrollDirection * 0.5));
            this.origin.y = Math.round(this._scrollOffset);
            if (this._scrollOffset === 0 || this._scrollOffset === this._scrollMax) {
                this._scrollDirection *= -1;
                this._scrollWait = 90;
            }
        }
        place(point) {
            let x = point.x + 18, y = point.y + 18;
            if (x + this.width > Graphics.width) x = point.x - this.width - 18;
            if (y + this.height > Graphics.height) y = point.y - this.height - 18;
            this.x = Math.round(Math.max(0, Math.min(x, Graphics.width - this.width)));
            this.y = Math.round(Math.max(0, Math.min(y, Graphics.height - this.height)));
        }
    }

    class TermController {
        constructor(scene) {
            this.scene = scene;
            this.windows = new Map();
            this.bitmaps = new Map();
            this.missing = new Set();
            this.entries = new Map();
            this.pointer = null;
            this.frame = 0;
            this.disposed = false;
            this.created = false;
        }
        load() {
            this.code = window.LANG_CODE[ConfigManager.language];
            if (!this.code) throw new Error('[StandaloneTerms] 未登记的语言编号。');
            this.table = loadTable();
            this.entries.clear();
            this.missing.clear();
        }
        entry(key) {
            if (!this.entries.has(key)) {
                const value = this.table[key];
                if ((!value || !value.name) && !this.missing.has(key)) {
                    console.warn(`[StandaloneTerms] ${this.code} 及后备语言缺少术语名称: ${key}`);
                    this.missing.add(key);
                }
                this.entries.set(key, {
                    key, name: value && value.name || `[${key}]`,
                    description: !value || value.description === undefined ? '' :
                        Array.isArray(value.description) ? value.description.join('\n') : value.description
                });
            }
            return this.entries.get(key);
        }
        expand(text, entries = null, convertName = name => name, converted = false) {
            return expandTerms(text, key => this.entry(key), entries, convertName, converted);
        }
        captureWindows(callback) {
            const controller = this;
            const initialize = Window_Base.prototype.initialize;
            Window_Base.prototype.initialize = function(...args) {
                initialize.apply(this, args);
                controller.attach(this);
            };
            try { return callback(); }
            finally { Window_Base.prototype.initialize = initialize; }
        }
        attach(win) {
            if (win._termDescriptionWindow || this.windows.has(win)) return;
            const undo = [];
            this.windows.set(win, undo);
            const controller = this;
            const create = win.createTextState;
            replaceMethod(win, 'createTextState', function(text, ...args) {
                const entries = [];
                const previous = this._termBuildingEntries;
                this._termBuildingEntries = entries;
                try {
                    const state = create.call(this, controller.expand(text, entries), ...args);
                    state._termEntries = entries;
                    return state;
                } finally { this._termBuildingEntries = previous; }
            }, undo);
            const convert = win.convertEscapeCharacters;
            replaceMethod(win, 'convertEscapeCharacters', function(text) {
                const converted = convert.call(this, controller.expand(text, this._termBuildingEntries));
                // STR and other resolvers can introduce new ESC-marked terms. Convert
                // only their names, never re-interpret an already converted sentence.
                return controller.expand(converted, this._termBuildingEntries, name => convert.call(this, name), true);
            }, undo);
            const process = win.processEscapeCharacter;
            replaceMethod(win, 'processEscapeCharacter', function(code, state) {
                if (code === 'TERMOPEN') {
                    const id = this.obtainEscapeParam(state);
                    state._termEntry = (state._termEntries || this._termBuildingEntries || [])[id];
                    state._termFont = Object.fromEntries(fontProperties.map(key => [key, this.contents[key]]));
                    state._termActiveFont = this._drill_DFF_activeFont;
                    if (settings.color) this.changeTextColor(settings.color);
                } else if (code === 'TERMCLOSE') {
                    this.obtainEscapeParam(state);
                    Object.assign(this.contents, state._termFont);
                    this._drill_DFF_activeFont = state._termActiveFont;
                    state._termEntry = null;
                } else process.call(this, code, state);
            }, undo);
            const flush = win.flushTextState;
            replaceMethod(win, 'flushTextState', function(state) {
                const x = state.x, y = state.y, text = state.buffer;
                flush.call(this, state);
                controller.record(this, state, Math.min(x, state.x), y, Math.abs(state.x - x), state.height,
                    (bitmap, dx, dy, width, height) => bitmap.drawText(text, dx, dy, width, height));
            }, undo);
            for (const name of ['processDrawIcon', 'processDrawBigImage']) {
                const draw = win[name];
                replaceMethod(win, name, function(id, state, ...args) {
                    if (!state.drawing || !state._termEntry || this.drill_COWA_isCalculating()) {
                        return draw.call(this, id, state, ...args);
                    }
                    // Capture the actual blit, including font-sized icons, large-image
                    // centering/offsets and soft wraps inside the host window's method.
                    const bitmap = this.contents, undoBlit = [], blt = bitmap.blt;
                    replaceMethod(bitmap, 'blt', (source, sx, sy, sw, sh, dx, dy, dw = sw, dh = sh) => {
                        blt.call(bitmap, source, sx, sy, sw, sh, dx, dy, dw, dh);
                        controller.record(this, state, dx, dy, dw, dh,
                            (mask, x, y) => mask.blt(source, sx, sy, sw, sh, x, y, dw, dh));
                    }, undoBlit);
                    try { return draw.call(this, id, state, ...args); }
                    finally { undoBlit[0](); }
                }, undo);
            }
            const destroy = win.destroy;
            replaceMethod(win, 'destroy', function(...args) {
                undo.reverse().forEach(restore => restore());
                controller.windows.delete(this);
                return destroy.apply(this, args);
            }, undo);
        }
        releaseRegion(region) {
            for (const sprite of region.sprites.values()) {
                sprite.filters = null;
                sprite.parent.removeChild(sprite);
                sprite.destroy();
            }
            region.sprites.clear();
            region.mask.destroy();
        }
        record(win, state, x, y, width, height, paint) {
            if (!state.drawing || !state._termEntry || !state._termEntry.description.trim() || width <= 0 ||
                    win.drill_COWA_isCalculating()) return;
            const bitmap = win.contents;
            if (!this.bitmaps.has(bitmap)) {
                const bucket = { win, regions: [], undo: [] };
                this.bitmaps.set(bitmap, bucket);
                const clear = bitmap.clearRect;
                replaceMethod(bitmap, 'clearRect', (cx, cy, cw, ch) => {
                    bucket.regions = bucket.regions.filter(rect => {
                        if (!intersects(rect, { x: cx, y: cy, width: cw, height: ch })) return true;
                        this.releaseRegion(rect);
                        return false;
                    });
                    return clear.call(bitmap, cx, cy, cw, ch);
                }, bucket.undo);
                const resize = bitmap.resize;
                replaceMethod(bitmap, 'resize', (...args) => {
                    bucket.regions.forEach(region => this.releaseRegion(region));
                    bucket.regions.length = 0;
                    return resize.apply(bitmap, args);
                }, bucket.undo);
                const destroy = bitmap.destroy;
                replaceMethod(bitmap, 'destroy', (...args) => {
                    bucket.regions.forEach(region => this.releaseRegion(region));
                    bucket.undo.reverse().forEach(undo => undo());
                    this.bitmaps.delete(bitmap);
                    return destroy.apply(bitmap, args);
                }, bucket.undo);
            }
            const maskX = Math.floor(x) - OUTLINE_PADDING, maskY = Math.floor(y) - OUTLINE_PADDING;
            const mask = new Bitmap(Math.ceil(x + width) - maskX + OUTLINE_PADDING,
                Math.ceil(y + height) - maskY + OUTLINE_PADDING);
            Object.assign(mask, Object.fromEntries(fontProperties.map(key => [key, bitmap[key]])));
            mask.smooth = bitmap.smooth;
            mask.textColor = '#ffffff';
            mask.outlineColor = 'rgba(0,0,0,0)';
            mask.outlineWidth = 0;
            paint(mask, x - maskX, y - maskY, width, height);
            this.bitmaps.get(bitmap).regions.push({ x, y, width, height, entry: state._termEntry,
                mask, maskX, maskY, sprites: new Map() });
            this.outlineDirty = true;
        }
        bindOutlines() {
            if (!this.outlineFilter) {
                this.outlineFilter = new PIXI.filters.GlowFilter({ distance: 2, outerStrength: 0,
                    innerStrength: 0, color: 0xffffff, quality: 0.5, knockout: true });
                this.outlineFilters = [this.outlineFilter];
            }
            const visit = node => {
                if (node._termOutline) return;
                const bucket = this.bitmaps.get(node.bitmap);
                if (bucket) {
                    for (const region of bucket.regions) {
                        if (region.sprites.has(node)) continue;
                        const sprite = new Sprite(region.mask);
                        sprite._termOutline = true;
                        sprite.filters = this.outlineFilters;
                        node.addChild(sprite);
                        region.sprites.set(node, sprite);
                    }
                }
                for (const child of node.children || []) visit(child);
            };
            visit(this.scene);
            this.outlineDirty = false;
        }
        updateOutlines() {
            if (this.outlineDirty) this.bindOutlines();
            if (!this.outlineFilter) return;
            this.outlineFilter.outerStrength = 2 * (0.5 - 0.5 * Math.cos(this.frame * Math.PI * 2 / settings.pulseFrames));
            for (const [bitmap, bucket] of this.bitmaps) {
                const win = bucket.win;
                win._updateClientArea();
                win._updateContents();
                for (const region of bucket.regions) {
                    for (const [source, sprite] of region.sprites) {
                        if (source.bitmap !== bitmap) { sprite.visible = false; continue; }
                        const frame = source._frame;
                        const left = Math.max(0, region.maskX, frame.x), top = Math.max(0, region.maskY, frame.y);
                        const right = Math.min(bitmap.width, region.maskX + region.mask.width, frame.x + frame.width);
                        const bottom = Math.min(bitmap.height, region.maskY + region.mask.height, frame.y + frame.height);
                        if (right <= left || bottom <= top) { sprite.visible = false; continue; }
                        // Source frames only clip the source itself. Crop the outline
                        // explicitly, then inherit the source's scroll, scale and masks.
                        sprite.setFrame(left - region.maskX, top - region.maskY, right - left, bottom - top);
                        sprite.move(left - frame.x - source.anchor.x * frame.width,
                            top - frame.y - source.anchor.y * frame.height);
                        const a = win.toLocal(source.toGlobal({ x: sprite.x, y: sprite.y }));
                        const b = win.toLocal(source.toGlobal({ x: sprite.x + right - left, y: sprite.y + bottom - top }));
                        sprite.visible = win.isOpen() && b.x > win.padding && b.y > win.padding &&
                            a.x < win.width - win.padding && a.y < win.height - win.padding;
                    }
                }
            }
        }
        trackTrajectory() {
            const trajectory = this.scene._trajectory;
            if (!trajectory || trajectory === this.trajectory) return;
            if (this.trajectoryUndo) this.trajectoryUndo.forEach(undo => undo());
            this.trajectory = trajectory;
            this.trajectoryUndo = [];
            const open = trajectory.openDetail;
            replaceMethod(trajectory, 'openDetail', (...args) => this.captureWindows(() => open.apply(trajectory, args)), this.trajectoryUndo);
        }
        createTooltip() {
            this.tooltip = new Window_TermDescription();
            this.scene.addChild(this.tooltip);
        }
        start() {
            active = this;
        }
        bindInput() {
            this.listeners = [];
            const listen = (target, name, fn) => {
                target.addEventListener(name, fn, { capture: true, passive: true });
                this.listeners.push(() => target.removeEventListener(name, fn, true));
            };
            const point = event => ({ x: Graphics.pageToCanvasX(event.pageX), y: Graphics.pageToCanvasY(event.pageY) });
            listen(window, 'mousemove', event => { this.touch = null; this.pointer = point(event); });
            listen(document, 'mouseleave', () => this.clearPointer());
            listen(window, 'blur', () => this.clearPointer());
            listen(window, 'touchstart', event => {
                if (event.touches.length !== 1) { this.clearPointer(); return; }
                this.pointer = point(event.touches[0]);
                this.touch = { ...this.pointer, frame: this.frame };
            });
            listen(window, 'touchmove', event => {
                if (!this.touch || event.touches.length !== 1) { this.clearPointer(); return; }
                const next = point(event.touches[0]);
                if (Math.hypot(next.x - this.touch.x, next.y - this.touch.y) > 10) this.clearPointer();
                else this.pointer = next;
            });
            listen(window, 'touchend', () => this.clearPointer());
            listen(window, 'touchcancel', () => this.clearPointer());
        }
        clearPointer() {
            this.pointer = null;
            this.touch = null;
            this.hover = null;
            if (this.tooltip) this.tooltip.visible = false;
        }
        hitSprite(sprite, bucket) {
            const point = this.pointer;
            for (let node = sprite; node && node !== this.scene; node = node.parent) {
                if (!node.visible || node.alpha === 0) return null;
                if (node.mask) {
                    node.mask.toLocal(point);
                    if (!node.mask.containsPoint(point)) return null;
                }
                if (node instanceof Window_Base) {
                    if (!node.isOpen()) return null;
                    const p = node.toLocal(point);
                    if (p.x < node.padding || p.y < node.padding ||
                            p.x >= node.width - node.padding || p.y >= node.height - node.padding) return null;
                }
            }
            const p = sprite.toLocal(point);
            const frame = sprite._frame;
            const x = p.x + sprite.anchor.x * frame.width, y = p.y + sprite.anchor.y * frame.height;
            if (x < 0 || y < 0 || x >= frame.width || y >= frame.height) return null;
            return bucket.regions.find(rect => x + frame.x >= rect.x && x + frame.x < rect.x + rect.width &&
                y + frame.y >= rect.y && y + frame.y < rect.y + rect.height) || null;
        }
        findHit() {
            // Traverse only the active scene in display order; skip whole hidden subtrees.
            // No database/text parsing is performed here. Regions are produced on redraw.
            const visit = node => {
                if (!node.visible || node.alpha === 0 || node === this.tooltip || node._termOutline) return null;
                const children = node.children || [];
                for (let i = children.length - 1; i >= 0; i--) {
                    const result = visit(children[i]);
                    if (result) return result;
                }
                const bucket = this.bitmaps.get(node.bitmap);
                if (!bucket || bucket.regions.length === 0) return null;
                const rect = this.hitSprite(node, bucket);
                return rect ? { sprite: node, rect, entry: rect.entry } : null;
            };
            // Window scroll translations normally update during rendering. Refresh them
            // before hit testing so the first frame after scrolling uses current positions.
            for (const win of this.windows.keys()) {
                win._updateClientArea();
                win._updateContents();
            }
            return visit(this.scene);
        }
        update() {
            if (this.disposed || !this.tooltip) return;
            this.frame++;
            this.updateOutlines();
            if (this.scene._closing || !this.pointer || this.bitmaps.size === 0) {
                this.tooltip.visible = false;
                return;
            }
            if (this.frame % 2 !== 0) return;
            const hit = this.findHit();
            if (!hit || !this.hover || hit.sprite !== this.hover.sprite || hit.entry !== this.hover.entry) {
                this.hover = hit;
                this.hoverFrame = this.frame;
                this.tooltip.visible = false;
            }
            if (!hit) return;
            const delay = this.touch ? Math.max(24, settings.delay) : settings.delay;
            if (this.frame - this.hoverFrame < delay) return;
            if (!this.tooltip.visible) this.tooltip.showEntry(hit.entry, this);
            this.tooltip.place(this.pointer);
        }
        dispose() {
            if (this.disposed) return;
            this.disposed = true;
            this.clearPointer();
            if (this.listeners) this.listeners.forEach(remove => remove());
            if (this.trajectoryUndo) this.trajectoryUndo.forEach(undo => undo());
            for (const undo of this.windows.values()) undo.reverse().forEach(restore => restore());
            for (const bucket of this.bitmaps.values()) {
                bucket.regions.forEach(region => this.releaseRegion(region));
                bucket.undo.reverse().forEach(undo => undo());
            }
            this.bitmaps.clear();
            this.windows.clear();
            if (this.outlineFilter) {
                const shader = Graphics.app.renderer.shader;
                if (shader.shader === this.outlineFilter) shader.reset();
                this.outlineFilter.destroy();
                this.outlineFilter = null;
            }
            if (active === this) active = null;
        }
    }

    // Saikey also runs on maps/battles. Resolve names without installing a
    // scene controller, input listeners, glyph masks or nested tooltips there.
    if (window.Saikey && Saikey.MPMZ && Saikey.MPMZ.HoverWindow) {
        const proto = Saikey.MPMZ.HoverWindow.prototype;
        const entry = key => ({ name: window.gameTermsText?.[key]?.name || `[${key}]` });
        const textLines = proto.textLines;
        proto.textLines = function() {
            // Expand before wrapping so a long localized name can break across
            // lines, rather than remaining one indivisible escape-code token.
            return textLines.call(this).map(line => expandTerms(line, entry));
        };
        const convert = proto.convertEscapeCharacters;
        proto.convertEscapeCharacters = function(text) {
            const converted = convert.call(this, expandTerms(text, entry));
            // STR/WAY can introduce terms after the initial expansion.
            return expandTerms(converted, entry, null, name => convert.call(this, name), true);
        };
    }

    const registerScene = SceneClass => {
        if (typeof SceneClass !== 'function' || Object.getPrototypeOf(SceneClass.prototype) !== Scene_Base.prototype ||
                SceneClass === Scene_Map || SceneClass === Scene_Battle || SceneClass === Scene_MenuBase) {
            throw new Error('[StandaloneTerms] 仅支持直接基于 Scene_Base 的独立界面。');
        }
        if (registered.has(SceneClass)) return;
        registered.add(SceneClass);
        const proto = SceneClass.prototype;
        const create = proto.create, isReady = proto.isReady, start = proto.start;
        const update = proto.update, stop = proto.stop, terminate = proto.terminate, destroy = proto.destroy;
        proto.create = function() { this._standaloneTerms = new TermController(this); };
        proto.isReady = function() {
            const controller = this._standaloneTerms;
            if (!FontManager.isReady()) return false;
            if (!controller.created) {
                controller.load();
                // Observe touches before Compendium's modal capture handlers consume them.
                controller.bindInput();
                controller.captureWindows(() => create.call(this));
                controller.created = true;
                controller.trackTrajectory();
                controller.createTooltip();
            }
            return isReady.call(this);
        };
        proto.start = function() {
            start.call(this);
            this._standaloneTerms.start();
        };
        proto.update = function() {
            update.call(this);
            this._standaloneTerms.update();
        };
        proto.stop = function() {
            this._standaloneTerms.dispose();
            stop.call(this);
        };
        proto.terminate = function() {
            this._standaloneTerms.dispose();
            terminate.call(this);
        };
        proto.destroy = function(...args) {
            this._standaloneTerms.dispose();
            return destroy.apply(this, args);
        };
    };
    window.StandaloneTerms = {
        registerScene,
        attachWindow: win => {
            if (!active) throw new Error('[StandaloneTerms] 当前不是已启动的独立术语界面。');
            active.attach(win);
        }
    };
    registerScene(Scene_StandaloneEquip);
    registerScene(Scene_StandaloneCompendium);
    const refreshCategory = Scene_StandaloneCompendium.prototype.refreshCategory;
    Scene_StandaloneCompendium.prototype.refreshCategory = function(...args) {
        const result = refreshCategory.apply(this, args);
        this._standaloneTerms.trackTrajectory();
        return result;
    };
})();
