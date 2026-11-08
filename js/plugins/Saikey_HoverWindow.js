//=============================================================================
// Saikey_HoverWindow.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc v1.3 Auto-sized tiled hover windows for events and pictures.
 * @author Saikey
 *
 * @param Default Background
 * @type file
 * @dir img/system/
 * @desc 暂时停用。所有悬停窗口统一使用九块平铺背景。
 * @default
 *
 * @param Background Scale
 * @type number
 * @decimals 2
 * @min 0.01
 * @desc 暂时停用。平铺背景始终按原像素显示。
 * @default 1
 *
 * @param Background Offset X
 * @type number
 * @min -9999
 * @desc 暂时停用。正文四周留白30px（不含外发光）。
 * @default 0
 *
 * @param Background Offset Y
 * @type number
 * @min -9999
 * @desc 暂时停用。正文四周留白30px（不含外发光）。
 * @default 0
 *
 * @param Window Skin
 * @type file
 * @dir img/system/
 * @desc 暂时停用。平铺背景不使用原生窗口边框。
 * @default Window
 *
 * @param Padding
 * @desc 暂时停用。正文四周留白30px（不含外发光）。
 * @type number
 * @min 0
 * @default 12
 *
 * @param Font Size
 * @type number
 * @min 1
 * @default 22
 *
 * @param Offset X
 * @type number
 * @min -9999
 * @default 18
 *
 * @param Offset Y
 * @type number
 * @min -9999
 * @default 18
 *
 * @param Max Width
 * @type number
 * @min 159
 * @desc 整窗最大宽度（含外发光），绑定时用maxWidth覆盖。
 * @default 400
 *
 * @param Enable Pixel Occlusion
 * @type boolean
 * @desc Let higher pictures block hover via per-pixel alpha tests. Costly (getAlphaPixel); leave off unless you need it.
 * @default false
 *
 * @param Occlusion Alpha Threshold
 * @type number
 * @min 0
 * @max 255
 * @desc Only used when Enable Pixel Occlusion is on. Higher pictures block hover only above this alpha value.
 * @default 8
 *
 * @param Update Interval PC
 * @type number
 * @min 1
 * @desc Frames between hover hit-tests on desktop. Higher is cheaper but slightly less responsive.
 * @default 2
 *
 * @param Update Interval Mobile
 * @type number
 * @min 1
 * @desc Frames between hover hit-tests on mobile devices. Higher is cheaper but slightly less responsive.
 * @default 4
 *
 * @param Min Width
 * @type number
 * @min 159
 * @default 200
 *
 * @param Min Height
 * @type number
 * @min 97
 * @default 200
 *
 * @param Max Height
 * @type number
 * @min 97
 * @desc 整窗最大高度（含外发光），绑定时用maxHeight覆盖。
 * @default 400
 *
 * @help
 * 装饰图案：options.decoration只需指定文件名，自动补上.png后缀。
 * 例如decoration:"weapon"，加载img/system/Saikey_HoverWindow/weapon.png。
 * 可写子目录"decorations/weapon"；兼容已有的"weapon.png"写法。
 * 未指定时使用decoration.png；decoration:false或空字符串隐藏装饰。
 * 按原尺寸显示，右/下距主体各20px；过大的素材请预先缩小。
 * 共享排版缓存：最多64份、累计262144字符，仅运行时保存，不写入存档。
 * 相同实际文本和排版条件复用换行与宽高，文字颜色/光晕仍按当前设置绘制。
 * 绑定layoutCache:false可跳过缓存；未知动态转义符自动跳过。
 * Saikey.MPMZ.layoutCacheStats() 查看命中/容量；clearLayoutCache() 清空。
 * 自定义字体或文本插件在外部改变排版规则时可手动调用clearLayoutCache。
 * 内容层默认使用GPU黑色GlowFilter（distance:4、outerStrength:1、quality:0.1）。
 * 绑定options传入textGlow:false关闭文字、正文内图标和分割线的统一光晕。
 * 原separatorGlow不再单独控制；拼接背景和右下角图案不进入滤镜。
 * 窗口隐藏时不执行滤镜；显示时每帧由GPU处理可见正文区域。
 * 依赖工程提供PIXI.filters.GlowFilter；不可用时显示普通文字。
 * 分割线：将 \HSEP 单独放一行。JS字符串写成 "\\HSEP"。
 * 绑定样式可选：separatorGap:10（上下间距）、separatorThickness:1、
 * separatorInset:0（相对正文左右缩进）、separatorColor:"rgba(255,255,255,0.4)"。
 * 分割线参与高度测量并随正文滚动，不占fixedLineCount；紧跟固定标题的线也固定。
 * 当前统一使用九块平铺背景，暂时忽略 background、backgroundScale、
 * backgroundOffsetX/Y、padding、windowSkin。正文距主体边缘默认30px。
 * 绑定options.paddingBottom可单独设置正文下边距（不含15px外发光），默认30。
 * 例如 { paddingBottom:100 }；支持0，负数按0处理，无效值回退30。
 * 下边距参与窗口高度和滚动区域计算；minHeight及20px步进可能增加实际留白。
 * 绑定options.paddingRight可单独设置正文右边距（不含15px外发光），默认30。
 * 例如 { paddingRight:100, paddingBottom:100 }；支持0，负数按0处理，无效值回退30。
 * 右边距参与换行、窗口宽度和正文裁切；minWidth及20px步进可能增加实际留白。
 * 整窗宽高默认200～400px（含外发光），绑定options可覆盖：
 * { minWidth:200, maxWidth:400, minHeight:200, maxHeight:400 }
 * 正文超宽换行；全文加留白超过maxHeight（或屏幕可用高度）才滚动。
 * textDisplayWidth仍限制换行宽度；旧textDisplayHeight不再限制高度。
 * 20px步进受尺寸边界约束，末块只裁切、不拉伸。
 * min大于max时以max为准；屏幕可用尺寸优先于设定的最小值。
 * 宽度安全下限159px；高度仅保留九宫结构下限97px，装饰不撑高窗口。
 * 兼容旧tileMinWidth / tileMinHeight；新minWidth / minHeight优先。
 * 素材：img/system/Saikey_HoverWindow/，发布时请包含该目录。
 * 自动按游戏加密设置加载普通.png或加密.png_；装饰文件名写法不变。
 * 背景共10个显示部件，只复用源纹理，不生成整窗Bitmap。
 * This plugin creates one shared hover window for both map events and pictures.
 * It is fully self-contained and has no external plugin dependencies.
 * Binding is done entirely through the script API below.
 *
 * Script API:
 *   Saikey.MPMZ.bindEvent(eventId, textOrFunction, options)
 *   Saikey.MPMZ.bindPicture(pictureId, textOrFunction, options)
 *   Saikey.MPMZ.clearEvent(eventId)
 *   Saikey.MPMZ.clearPicture(pictureId)
 *   Saikey.MPMZ.clearHover() // 清空当前悬停并立即隐藏普通窗口，保留绑定和强制窗口
 *
 * QJ_VirtualButton 放在本插件之前时，自动屏蔽虚拟按钮触摸引起的悬停。
 * 仅在 QJ 实际启用时安装输入兼容；按下、拖动和多指操作均由触摸事件处理。
 *
 * bindPicture / bindEvent 的 options 可设置 forceShow:true。
 * 每个强制目标独立显示一个窗口，普通悬停窗口仍可显示其他目标。
 * 强制窗口定位于目标区域中心（沿用 offsetX/offsetY 和边缘修正）。
 * 返回的 bean.forceShow 可直接设为 true/false；取消、解绑或删除目标后销毁窗口。
 *   Saikey.MPMZ.setPictureForceShow(70, true); // 仅操作已有绑定
 *   Saikey.MPMZ.setPictureForceShow(70, true, 100, 200); // 窗口左上角屏幕坐标
 * 坐标为可选数值（支持 0）；指定的轴不叠加 offset、不做边缘修正。
 * 开启时省略坐标会恢复目标区域定位；只指定一个轴时另一个轴仍自动定位。
 *
 * 逐帧动画可在 bindPicture 的 options 中设置 keepOnShow:true（默认false）。
 * 同一图片编号再次 showPicture / showPictureFromPath 时继承原描述绑定，
 * 保留已打开窗口的文本与滚动状态；只需在动画开始后绑定一次。
 * erasePicture、clearPictures、clearPicture 或直接 picture.erase() 会清除绑定。
 * 重新 bindPicture 时省略 keepOnShow 或设为false，即恢复默认替换行为。
 *   Saikey.MPMZ.bindPicture(5, "描述内容", { keepOnShow: true });
 *
 * textOrFunction can be a string, an array of strings, or a function:
 *   Saikey.MPMZ.bindEvent(1, ctx => [
 *     "Event ID: " + ctx.eventId,
 *     $gameMap.event(ctx.eventId).event().name
 *   ]);
 *
 * Active context values can be passed through options.context:
 *   const weapon = $gameParty.leader().equips()[0];
 *   Saikey.MPMZ.bindPicture(74, ctx => ctx.weapon.name, {
 *     context: { weapon },
 *     background: "Imouto_Hud",
 *     backgroundScale: 1,
 *     backgroundOffsetX: 0,
 *     backgroundOffsetY: 0,
 *     textDisplayWidth: 340,
 *     maxHeight: 400
 *   });
 * textDisplayWidth optionally limits each rendered text line in pixels. It
 * preserves space-delimited words and uses character-level wrapping for CJK.
 * A single word is split only when it is wider than the configured line width.
 * It defaults to 0, which preserves the original wrapping behavior.
 * Legacy textDisplayHeight is ignored. Scrolling starts only when the full
 * text plus padding exceeds maxHeight or the available screen height.
 * fixedLineCount optionally keeps the first N source lines stationary while
 * only the remaining lines scroll. It defaults to 0, so existing bindings keep
 * the original single-layer behavior.
 *
 * Eval-backed text (re-evaluated each time the window opens):
 *   Saikey.MPMZ.bindPicture(74, "Saikey.MPMZ.tl.playerWeaponDurabilityText(1)", {
 *     needEval: true
 *   });
 *   // Register your own helpers under Saikey.MPMZ.tl for use with needEval.
 */

(() => {
    "use strict";

    const currentScript = document.currentScript;
    const PLUGIN_NAME = currentScript
        ? decodeURIComponent(currentScript.src.split("/").pop().replace(/\.js$/, ""))
        : "Saikey_HoverWindow";
    const params = PluginManager.parameters(PLUGIN_NAME);

    const settings = {
        background: String(params["Default Background"] || ""),
        backgroundScale: Number(params["Background Scale"] || 1),
        backgroundOffsetX: Number(params["Background Offset X"] || 0),
        backgroundOffsetY: Number(params["Background Offset Y"] || 0),
        windowSkin: String(params["Window Skin"] || "Window"),
        padding: Number(params["Padding"] || 12),
        fontSize: Number(params["Font Size"] || 16),
        offsetX: Number(params["Offset X"] || 18),
        offsetY: Number(params["Offset Y"] || 18),
        maxWidth: Number(params["Max Width"] || 400),
        minWidth: Number(params["Min Width"] || params["Tile Min Width"] || 200),
        minHeight: Number(params["Min Height"] || params["Tile Min Height"] || 200),
        maxHeight: Number(params["Max Height"] || 400),
        enablePixelOcclusion: parseBoolean(params["Enable Pixel Occlusion"]),
        occlusionAlphaThreshold: Number(params["Occlusion Alpha Threshold"] || 8),
        updateIntervalPC: Math.max(1, Number(params["Update Interval PC"] || 2)),
        updateIntervalMobile: Math.max(1, Number(params["Update Interval Mobile"] || 4))
    };

    window.Saikey = window.Saikey || {};
    const Saikey = window.Saikey;
    Saikey.MPMZ = Saikey.MPMZ || {};
    Saikey.MPMZ.tl = Saikey.MPMZ.tl || {};

    const defaultStyle = {
        background: settings.background,
        backgroundScale: settings.backgroundScale,
        backgroundOffsetX: settings.backgroundOffsetX,
        backgroundOffsetY: settings.backgroundOffsetY,
        windowSkin: settings.windowSkin,
        padding: settings.padding,
        paddingBottom: 30,
        paddingRight: 30,
        fontSize: settings.fontSize,
        offsetX: settings.offsetX,
        offsetY: settings.offsetY,
        maxWidth: settings.maxWidth,
        maxHeight: settings.maxHeight,
        textDisplayWidth: 0,
        textDisplayHeight: 560,
        fixedLineCount: 0,
        opacity: 255
    };

    // Runtime-only shared LRU: no beans, bitmaps, or save-game objects retained.
    const layoutCache = new Map();
    const LAYOUT_CACHE_ENTRIES = 64, LAYOUT_CACHE_CHARS = 262144;
    let layoutCacheChars = 0, layoutCacheProfile = null;
    const layoutCacheCounters = { hits: 0, misses: 0, bypasses: 0, evictions: 0 };
    function clearLayoutCache() {
        layoutCache.clear();
        layoutCacheChars = 0;
        for (const key of Object.keys(layoutCacheCounters)) layoutCacheCounters[key] = 0;
    }
    function rememberLayout(key, layout) {
        const chars = key.length + JSON.stringify(layout).length;
        if (chars > LAYOUT_CACHE_CHARS) return;
        while (layoutCache.size >= LAYOUT_CACHE_ENTRIES || layoutCacheChars + chars > LAYOUT_CACHE_CHARS) {
            const oldest = layoutCache.keys().next().value;
            layoutCacheChars -= layoutCache.get(oldest).chars;
            layoutCache.delete(oldest);
            layoutCacheCounters.evictions++;
        }
        layoutCache.set(key, { layout, chars });
        layoutCacheChars += chars;
    }
    Saikey.MPMZ.clearLayoutCache = clearLayoutCache;
    Saikey.MPMZ.layoutCacheStats = () => ({ ...layoutCacheCounters,
        entries: layoutCache.size, retainedChars: layoutCacheChars,
        maxEntries: LAYOUT_CACHE_ENTRIES, maxChars: LAYOUT_CACHE_CHARS });
    if (document.fonts && document.fonts.addEventListener) {
        document.fonts.addEventListener('loadingdone', clearLayoutCache);
        document.fonts.addEventListener('loadingerror', clearLayoutCache);
    }

    // Text inset is 30px on all sides, excluding the 15px outer glow.
    const TILE_PADDING = 45; // 15px glow + 30px left/top; right/bottom are configurable
    const TILE_DECORATION_PADDING = 35; // ornament keeps its original 20px inset
    function tileBitmap(name) {
        // Use MZ's decrypt/load lifecycle and shared system-image cache. Sprite
        // and TilingSprite update their frames when the source image is ready.
        const bitmap = ImageManager.loadBitmap('img/system/Saikey_HoverWindow/', name);
        bitmap.smooth = false;
        return bitmap;
    }
    function tileSize(requested, base, min, max) {
        if (requested <= min) return min;
        return Math.min(max, Math.max(min, base + Math.ceil((requested - base) / 20) * 20));
    }

    const HOVER_SCROLL_SPEED = 0.5;
    const HOVER_SCROLL_PAUSE = 90;

    const HOVER_BEAN_KEY = "_saikeyHoverBean";
    const AUTO_WRAP_UNIT_REGEX = /\\[A-Za-z]+\[[^\]]*\]|\\[A-Za-z]+|\\[{}]|\\.|[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]|[^\s\\\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]+|\s+/gu;

    //-------------------------------------------------------------------------
    // Helpers
    //-------------------------------------------------------------------------

    function normalizeLines(value, context) {
        let result = value;
        if (typeof result === "function") {
            result = result(context);
        }
        if (result == null) {
            return [];
        }
        if (Array.isArray(result)) {
            return result.map(line => String(line));
        }
        return String(result).replace(/\\n/g, "\n").split(/\r?\n/);
    }

    function evalTextSource(source, context) {
        if (typeof source === "function") {
            // A function source still produces a string/array to eval, so feed
            // its result back through eval instead of returning it verbatim.
            return evalTextSource(source(context), context);
        }
        if (Array.isArray(source)) {
            return source.map(line => evalTextSource(line, context));
        }
        const expression = String(source || "");
        const ctx = context;
        try {
            return eval(expression);
        } catch (error) {
            console.error(`${PLUGIN_NAME}: failed to eval hover text`, expression, error);
            return "";
        }
    }

    function mergeStyle(style) {
        return { ...defaultStyle, ...(style || {}) };
    }

    function makeSerial() {
        return Date.now() + Math.random();
    }

    function parseBoolean(value) {
        return value === true || String(value).toLowerCase() === "true";
    }

    function markNeedRefresh() {
        if ($gameTemp) {
            $gameTemp._saikeyNeedRefresh = true;
        }
    }

    //-------------------------------------------------------------------------
    // Hover pointer tracking
    //
    // MV's TouchInput only updates x/y while the mouse button is held, so plain
    // hovering never moves it (the window would only appear after a click). We
    // track the pointer ourselves from mousemove / touch events in canvas space
    // (the same coordinates TouchInput uses) so hover works on both MV and MZ.
    //-------------------------------------------------------------------------

    const HoverInput = { x: -100000, y: -100000 };

    function setHoverPosition(pageX, pageY) {
        HoverInput.x = Graphics.pageToCanvasX(pageX);
        HoverInput.y = Graphics.pageToCanvasY(pageY);
    }

    function clearHover() {
        HoverInput.x = -100000;
        HoverInput.y = -100000;
        const win = SceneManager._scene?._saikeyHoverWindow;
        if (win) win.setBean(null);
    }

    function trackMouseHover(event) {
        setHoverPosition(event.pageX, event.pageY);
    }

    function trackTouchHover(event) {
        const touch = event.changedTouches[0];
        if (touch) {
            setHoverPosition(touch.pageX, touch.pageY);
        }
    }

    if (typeof Imported !== "undefined" && Imported.QJVirtualButton === true) {
        // Touch.target remains the starting element even when a finger slides
        // outside the control. Inspect only the event's fingers, never buttonList.
        const isVirtualButton = target => target?._qjVirtualButton === true;
        const hasVirtualTouch = touches => {
            for (let i = 0; i < touches.length; i++) {
                if (isVirtualButton(touches[i].target)) return true;
            }
            return false;
        };
        let virtualTouchActive = false;
        function handleTouch(event) {
            virtualTouchActive = hasVirtualTouch(event.touches);
            if (virtualTouchActive || hasVirtualTouch(event.changedTouches)) {
                clearHover();
                return;
            }
            // Releasing a control never restores its old hover position.
            if (event.type === "touchstart" || event.type === "touchmove") {
                trackTouchHover(event);
            }
        }
        const touchOptions = { passive: true, capture: true };
        for (const type of ["touchstart", "touchmove", "touchend", "touchcancel"]) {
            document.addEventListener(type, handleTouch, touchOptions);
        }
        document.addEventListener("mousemove", event => {
            if (virtualTouchActive || isVirtualButton(event.target)) {
                clearHover();
            } else if (!event.sourceCapabilities?.firesTouchEvents) {
                // Ignore compatibility mouse events synthesized after touch.
                trackMouseHover(event);
            }
        }, { passive: true });
        window.addEventListener("blur", () => {
            virtualTouchActive = false;
            clearHover();
        });
    } else {
        // QJ exits early on PC. Keep the original listeners with no QJ checks.
        document.addEventListener("mousemove", trackMouseHover, { passive: true });
        document.addEventListener("touchstart", trackTouchHover, { passive: true });
        document.addEventListener("touchmove", trackTouchHover, { passive: true });
    }

    Saikey.MPMZ.hoverPosition = HoverInput;
    Saikey.MPMZ.clearHover = clearHover;

    //-------------------------------------------------------------------------
    // Saikey_HoverBean - per-target data object
    //-------------------------------------------------------------------------

    class Saikey_HoverBean {
        constructor(targetType) {
            this._targetType = targetType || "";
            this._target = null;
            this._textSource = [];
            this._evaluatedText = [];
            this._needEval = false;
            this._keepOnShow = false;
            this._extraContext = {};
            this._style = mergeStyle();
            this._contextSerial = makeSerial();
            this._visible = true;
            this.forceShow = false;
            this._x = 0;
            this._y = 0;
            this._frameX = 0;
            this._frameY = 0;
            this._frameW = 0;
            this._frameH = 0;
            this._pictureId = 0;
            this._eventId = 0;
        }

        setTarget(targetType, id, target) {
            this._targetType = targetType;
            this._target = target;
            if (targetType === "picture") {
                this._pictureId = id;
            } else if (targetType === "event") {
                this._eventId = id;
            }
        }

        context() {
            const context = { ...this._extraContext };
            context.targetType = this._targetType;
            context.bean = this;
            if (this._targetType === "picture") {
                context.pictureId = this._pictureId;
                context.picture = $gameScreen.picture(this._pictureId);
                context.target = context.picture;
            } else if (this._targetType === "event") {
                context.eventId = this._eventId;
                context.event = $gameMap.event(this._eventId);
                context.target = context.event;
            } else {
                context.target = this._target;
            }
            return context;
        }

        textLines() {
            const source = this._needEval ? this._evaluatedText : this._textSource;
            return normalizeLines(source, this.context());
        }

        evaluateTextNow() {
            if (this._needEval) {
                this._evaluatedText = evalTextSource(this._textSource, this.context());
                this.refresh();
            }
        }

        refresh() {
            this._contextSerial = makeSerial();
        }

        configure(textSource, options) {
            const opts = options || {};
            this._textSource = textSource;
            this._needEval = !!opts.needEval;
            this._keepOnShow = parseBoolean(opts.keepOnShow);
            this.forceShow = opts.forceShow === true;
            this._forceShowPosition = null;
            this._evaluatedText = this._needEval ? [] : textSource;
            this._extraContext = { ...(opts.context || {}) };
            this._style = mergeStyle(opts);
            this.refresh();
        }

        setVisible(visible) {
            this._visible = !!visible;
        }

        setPosition(x, y) {
            this._x = Number(x || 0);
            this._y = Number(y || 0);
        }

        resetFrame(frameX, frameY, frameW, frameH) {
            this._frameX = Number(frameX || 0);
            this._frameY = Number(frameY || 0);
            this._frameW = Number(frameW || 0);
            this._frameH = Number(frameH || 0);
        }

        setText(text) {
            this._textSource = text;
            this._evaluatedText = this._needEval ? [] : text;
            this.refresh();
        }

        setStyle(style) {
            this._style = mergeStyle(style);
            this.refresh();
        }

        // Patch only the given fields onto the current style and bump the serial
        // so the hover window re-renders size-affecting changes (padding, fontSize,
        // background, maxWidth, ...). Use this instead of mutating _style directly.
        updateStyle(patch) {
            this._style = { ...this._style, ...(patch || {}) };
            this.refresh();
        }

        setNeedEval(needEval) {
            this._needEval = parseBoolean(needEval);
            this._evaluatedText = this._needEval ? [] : this._textSource;
            this.refresh();
        }
    }

    Saikey.MPMZ.HoverBean = Saikey_HoverBean;

    //-------------------------------------------------------------------------
    // Bean accessors
    //-------------------------------------------------------------------------

    function reviveHoverBean(bean, targetType) {
        if (bean instanceof Saikey_HoverBean) {
            return bean;
        }
        const revived = new Saikey_HoverBean(targetType);
        if (bean && typeof bean === "object") {
            Object.assign(revived, bean);
        }
        revived._targetType = revived._targetType || targetType;
        revived._target = null;
        revived._extraContext = revived._extraContext || {};
        revived._style = mergeStyle(revived._style || {});
        revived._textSource = normalizeLines(revived._textSource || []);
        revived._evaluatedText = normalizeLines(revived._evaluatedText || []);
        return revived;
    }

    function ensurePictureBean(pictureId) {
        const picture = $gameScreen.picture(Number(pictureId || 0));
        if (!picture) {
            return null;
        }
        if (!picture[HOVER_BEAN_KEY]) {
            picture[HOVER_BEAN_KEY] = new Saikey_HoverBean("picture");
            markNeedRefresh();
        } else if (!(picture[HOVER_BEAN_KEY] instanceof Saikey_HoverBean)) {
            picture[HOVER_BEAN_KEY] = reviveHoverBean(picture[HOVER_BEAN_KEY], "picture");
            markNeedRefresh();
        }
        picture[HOVER_BEAN_KEY].setTarget("picture", Number(pictureId), picture);
        return picture[HOVER_BEAN_KEY];
    }

    function ensureEventBeanForEvent(event) {
        if (!event[HOVER_BEAN_KEY]) {
            event[HOVER_BEAN_KEY] = new Saikey_HoverBean("event");
            markNeedRefresh();
        } else if (!(event[HOVER_BEAN_KEY] instanceof Saikey_HoverBean)) {
            event[HOVER_BEAN_KEY] = reviveHoverBean(event[HOVER_BEAN_KEY], "event");
            markNeedRefresh();
        }
        event[HOVER_BEAN_KEY].setTarget("event", event.eventId(), event);
        return event[HOVER_BEAN_KEY];
    }

    function ensureEventBean(eventId) {
        const event = $gameMap.event(Number(eventId || 0));
        return event ? ensureEventBeanForEvent(event) : null;
    }

    //-------------------------------------------------------------------------
    // Public API
    //-------------------------------------------------------------------------

    Saikey.MPMZ.bindPicture = function(pictureId, textSource, options) {
        const bean = ensurePictureBean(pictureId);
        if (bean) {
            bean.configure(textSource, options);
            bean.setVisible(true);
        }
        return bean;
    };

    Saikey.MPMZ.bindEvent = function(eventId, textSource, options) {
        const bean = ensureEventBean(eventId);
        if (bean) {
            bean.configure(textSource, options);
            bean.setVisible(true);
        }
        return bean;
    };

    Saikey.MPMZ.clearPicture = function(pictureId) {
        const picture = $gameScreen.picture(Number(pictureId || 0));
        if (picture) {
            picture[HOVER_BEAN_KEY] = null;
        }
        markNeedRefresh();
    };

    Saikey.MPMZ.setPictureForceShow = function(pictureId, value, x, y) {
        const bean = $gameScreen.picture(pictureId)?.[HOVER_BEAN_KEY];
        if (!bean) return false;
        bean.forceShow = value === true;
        if (bean.forceShow) {
            bean._forceShowPosition = {
                x: Number.isFinite(x) ? x : null,
                y: Number.isFinite(y) ? y : null
            };
        }
        return true;
    };

    Saikey.MPMZ.clearEvent = function(eventId) {
        const event = $gameMap.event(Number(eventId || 0));
        if (event) {
            event[HOVER_BEAN_KEY] = null;
        }
        markNeedRefresh();
    };

    Saikey.MPMZ.refresh = markNeedRefresh;
    Saikey.MPMZ.pictureBean = ensurePictureBean;
    Saikey.MPMZ.eventBean = ensureEventBean;

    // Patch style fields on an already-bound target without re-running configure
    // (so other params and the bound text are preserved). Returns the bean.
    Saikey.MPMZ.setPictureStyle = function(pictureId, patch) {
        const picture = $gameScreen.picture(Number(pictureId || 0));
        const bean = picture && picture[HOVER_BEAN_KEY]
            ? picture[HOVER_BEAN_KEY] = reviveHoverBean(picture[HOVER_BEAN_KEY], "picture")
            : null;
        if (bean) {
            bean.updateStyle(patch);
        }
        return bean;
    };

    Saikey.MPMZ.setEventStyle = function(eventId, patch) {
        const event = $gameMap.event(Number(eventId || 0));
        const bean = event && event[HOVER_BEAN_KEY]
            ? event[HOVER_BEAN_KEY] = reviveHoverBean(event[HOVER_BEAN_KEY], "event")
            : null;
        if (bean) {
            bean.updateStyle(patch);
        }
        return bean;
    };

    //-------------------------------------------------------------------------
    // Game_Temp - bean registry
    //-------------------------------------------------------------------------

    const _Game_Temp_initialize = Game_Temp.prototype.initialize;
    Game_Temp.prototype.initialize = function() {
        _Game_Temp_initialize.call(this);
        this._saikeyHoverBeans = [];
        this._saikeyNeedRefresh = true;
    };

    function refreshBeanTank() {
        if (!$gameTemp) {
            return;
        }
        const beans = [];
        if ($gameMap && $gameMap.events) {
            for (const event of $gameMap.events()) {
                if (event && event[HOVER_BEAN_KEY]) {
                    event[HOVER_BEAN_KEY] = reviveHoverBean(event[HOVER_BEAN_KEY], "event");
                    event[HOVER_BEAN_KEY].setTarget("event", event.eventId(), event);
                    beans.push(event[HOVER_BEAN_KEY]);
                }
            }
        }
        if ($gameScreen && $gameScreen.maxPictures) {
            for (let i = 1; i <= $gameScreen.maxPictures(); i++) {
                const picture = $gameScreen.picture(i);
                if (picture && picture[HOVER_BEAN_KEY]) {
                    picture[HOVER_BEAN_KEY] = reviveHoverBean(picture[HOVER_BEAN_KEY], "picture");
                    picture[HOVER_BEAN_KEY].setTarget("picture", i, picture);
                    beans.push(picture[HOVER_BEAN_KEY]);
                }
            }
        }
        $gameTemp._saikeyHoverBeans = beans;
        $gameTemp._saikeyNeedRefresh = false;
    }

    function clearBeanRuntimeTarget(bean) {
        if (bean && Object.prototype.hasOwnProperty.call(bean, "_target")) {
            bean._target = null;
        }
    }

    const _DataManager_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function() {
        if ($gameScreen && $gameScreen.maxPictures) {
            for (let i = 1; i <= $gameScreen.maxPictures(); i++) {
                const picture = $gameScreen.picture(i);
                if (picture) {
                    clearBeanRuntimeTarget(picture[HOVER_BEAN_KEY]);
                }
            }
        }
        if ($gameMap && $gameMap.events) {
            for (const event of $gameMap.events()) {
                if (event) {
                    clearBeanRuntimeTarget(event[HOVER_BEAN_KEY]);
                }
            }
        }
        return _DataManager_makeSaveContents.call(this);
    };

    //-------------------------------------------------------------------------
    // Game_Map
    //-------------------------------------------------------------------------

    const _Game_Map_setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function(mapId) {
        _Game_Map_setup.call(this, mapId);
        markNeedRefresh();
    };

    const _Game_Map_update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _Game_Map_update.call(this, sceneActive);
        if ($gameTemp && $gameTemp._saikeyNeedRefresh) {
            refreshBeanTank();
        }
    };

    //-------------------------------------------------------------------------
    // Game_Picture
    //-------------------------------------------------------------------------

    const _Game_Picture_show = Game_Picture.prototype.show;
    Game_Picture.prototype.show = function(name, origin, x, y, scaleX, scaleY, opacity, blendMode) {
        _Game_Picture_show.call(this, name, origin, x, y, scaleX, scaleY, opacity, blendMode);
        markNeedRefresh();
    };

    const _Game_Picture_erase = Game_Picture.prototype.erase;
    Game_Picture.prototype.erase = function() {
        // Guarded: not every core defines Game_Picture.erase.
        if (_Game_Picture_erase) {
            _Game_Picture_erase.call(this);
        }
        this[HOVER_BEAN_KEY] = null;
        markNeedRefresh();
    };

    //-------------------------------------------------------------------------
    // Game_Screen - picture replacement and the actual picture-removal paths
    //
    // The "Erase Picture" command nulls the slot via Game_Screen.erasePicture and
    // never calls Game_Picture.erase, so without these hooks a deleted picture's
    // bean would linger in the tank and could still pop a stale "ghost" hover.
    //-------------------------------------------------------------------------

    function keepPictureHoverOnShow(showPicture) {
        return function(pictureId) {
            const previous = this.picture(pictureId);
            const previousBean = previous && previous[HOVER_BEAN_KEY];
            // Capture before Drill's replacement calls erase() on the old picture.
            const bean = previousBean && previousBean._keepOnShow ? previousBean : null;
            const result = showPicture.apply(this, arguments);
            if (bean) {
                const picture = this.picture(pictureId);
                if (picture && !picture[HOVER_BEAN_KEY]) {
                    const inherited = picture[HOVER_BEAN_KEY] = reviveHoverBean(bean, "picture");
                    inherited.setTarget("picture", Number(pictureId), picture);
                    // Keep identity/serial intact so setBean does not reopen or reset scrolling.
                    markNeedRefresh();
                }
            }
            return result;
        };
    }

    Game_Screen.prototype.showPicture = keepPictureHoverOnShow(Game_Screen.prototype.showPicture);
    // The project's path helper captures an older showPicture, bypassing the wrapper above.
    if (typeof Game_Screen.prototype.showPictureFromPath === "function") {
        Game_Screen.prototype.showPictureFromPath = keepPictureHoverOnShow(Game_Screen.prototype.showPictureFromPath);
    }

    const _Game_Screen_erasePicture = Game_Screen.prototype.erasePicture;
    Game_Screen.prototype.erasePicture = function(pictureId) {
        const picture = this.picture(pictureId);
        if (picture) {
            picture[HOVER_BEAN_KEY] = null;
        }
        _Game_Screen_erasePicture.call(this, pictureId);
        markNeedRefresh();
    };

    const _Game_Screen_clearPictures = Game_Screen.prototype.clearPictures;
    Game_Screen.prototype.clearPictures = function() {
        _Game_Screen_clearPictures.call(this);
        markNeedRefresh();
    };

    //-------------------------------------------------------------------------
    // Game_Event - auto-run a hook from a page comment marker
    //
    // When an event page has a comment line starting with the marker below
    // (e.g. "=>事件说明窗口 : 自动显示多语言文本"), saikeyHoverCommentExec is
    // invoked once per matching line during page setup. Everything here is just
    // the trigger plumbing; the actual window-building logic goes in that method.
    //-------------------------------------------------------------------------

    // Change this string if you want a different comment marker.
    const EVENT_HOVER_COMMENT_HEAD = "=>事件说明窗口";
    // Matches "<head>", "<head> : arg", "<head>：arg" (ASCII or full-width colon),
    // capturing the text after the colon as group 1. Anchored so longer heads
    // like "=>事件说明窗口2" do NOT false-match.
    const EVENT_HOVER_COMMENT_REGEX = new RegExp(
        "^" + EVENT_HOVER_COMMENT_HEAD.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
        "(?:\\s*[:：]\\s*(.*))?$"
    );

    // 注释 "=>scriptCall[ 代码 ]" —— 继承自 MV 版 Drill_MiniPlateForEvent.js 的脚本注释功能。
    // 捕获方括号内的整段 JS 代码（贪婪到最后一个 "]"，以兼容代码里含 ()、[] 的情况），
    // 在事件页 setup 时以「事件本身」为 this 执行，例如:
    //   =>scriptCall[QJ.MPMZ.tl.initializeWeirdKnightState.call(this)]
    const EVENT_SCRIPTCALL_COMMENT_REGEX = /^=>\s*scriptCall\s*\[([\s\S]*)\]\s*$/i;

    // Bind a hover window straight to this event object. Safe to call during
    // setupPageSettings, where $gameMap.event(id) is not populated yet (the event
    // is still being constructed), so Saikey.MPMZ.bindEvent(id, ...) would no-op.
    Game_Event.prototype.saikeyBindHover = function(textSource, options) {
        const bean = ensureEventBeanForEvent(this);
        if (bean) {
            bean.configure(textSource, options);
            bean.setVisible(true);
        }
        return bean;
    };

    const _Game_Event_setupPageSettings = Game_Event.prototype.setupPageSettings;
    Game_Event.prototype.setupPageSettings = function() {
        _Game_Event_setupPageSettings.call(this);
        this.saikeyScanHoverComment();
    };

    Game_Event.prototype.saikeyScanHoverComment = function() {
        // 切页必定先解绑：无论新事件页是否带注释，先隐藏已有的悬停窗口（setVisible(false) 后悬停检测会跳过它）。
        //   若下方扫描到 "=>事件说明窗口" 注释，会再次 setVisible(true) 重新绑定；扫不到则保持解绑状态。
        const existingBean = this[HOVER_BEAN_KEY];
        if (existingBean) {
            if (typeof existingBean.setVisible === "function") {
                existingBean.setVisible(false);
            } else {
                existingBean._visible = false;	//存档读回未复活的纯对象，直接置标志
            }
        }
        if (!this.page()) {
            return;
        }
        for (const command of this.list()) {
            if (command.code !== 108 && command.code !== 408) {
                continue;
            }
            const text = String(command.parameters[0] || "").trim();

            const match = text.match(EVENT_HOVER_COMMENT_REGEX);
            if (match) {
                // Split the tail on further colons so "子命令 : 18" arrives as
                // separate ordered arguments (command, id, ...).
                const args = match[1] ? match[1].split(/[:：]/).map(part => part.trim()) : [];
                this.saikeyHoverCommentExec(...args);
                continue;
            }

            // "=>scriptCall[ 代码 ]"：以事件本身为 this 执行注释里的脚本
            const scriptMatch = text.match(EVENT_SCRIPTCALL_COMMENT_REGEX);
            if (scriptMatch) {
                this.saikeyExecScriptCallComment(scriptMatch[1]);
            }
        }
    };

    // 执行 "=>scriptCall[...]" 注释里的代码，this 绑定为当前 Game_Event。
    // 用 new Function 在全局作用域建函数再 .call(this)，使代码里的 this（如 .call(this)）即为事件对象。
    // 单行注释失败不抛出，只在控制台报错，避免一条坏注释中断整页 setup。
    Game_Event.prototype.saikeyExecScriptCallComment = function(code) {
        const script = String(code || "").trim();
        if (!script) {
            return;
        }
        try {
            const runner = new Function(script);
            runner.call(this);
        } catch (e) {
            console.error("[Saikey_HoverWindow] scriptCall 注释执行失败: " + script, e);
        }
    };

    // ============================ 由你编写 ============================
    // 当事件页存在注释 "=>事件说明窗口 : 子命令 : ID" 时,每匹配一行调用一次。
    // 冒号(半角 : 或全角 :)分隔的各段按顺序作为参数传入:
    //   argument : 第 1 段子命令,例如 "自动显示多语言文本"
    //   id       : 第 2 段,例如 "18"(字符串;需要数字时用 Number(id))
    //              再加冒号段会继续作为第 3、第 4… 个参数传入
    //   this     : 当前 Game_Event,可用 this.eventId()、this.page()、this.list()
    //              以及 this.saikeyBindHover(textSource, options) 直接绑定本事件
    //
    // 示例:
    //   if (argument === "自动显示多语言文本") {
    //       this.saikeyBindHover(
    //           () => Saikey.MPMZ.tl.ex_eventDescription(this.eventId()),
    //           { background: "item_description", backgroundScale: 1 }
    //       );
    //   }
    // eslint-disable-next-line no-unused-vars
    Game_Event.prototype.saikeyHoverCommentExec = function(argument, id) {
       if (argument === "自动显示多语言文本") {
            const eid = this.eventId();
            const text = `QJ.MPMZ.tl.enemyDescriptionTextGeneration(${eid}, ${id})`;
            // 用 saikeyBindHover（直接绑到事件对象本身），而非 Saikey.MPMZ.bindEvent（依赖 $gameMap.event(id)）。
            //   地图加载时，setupPageSettings 在 $gameMap._events[i] 赋值之前执行，此时 $gameMap.event(eid)
            //   还是 undefined → bindEvent 空操作，导致"只在加载时 setup 的单页事件"永远绑不上悬浮窗。
            //   saikeyBindHover 直接在 this 事件对象上建 bean，不受此时机影响，单页/多页事件都能正确绑定。
            this.saikeyBindHover(text, {
                minWidth: 480,
                maxWidth: 480,
                minHeight: 480,
                maxHeight: 640,
                needEval: true,
                backgroundOffsetX: -18,
                backgroundOffsetY: -18,
                textDisplayHeight: 720
            });
       }
    };

    //-------------------------------------------------------------------------
    // Game_Event - clear bean on erase
    //-------------------------------------------------------------------------

    const _Game_Event_erase = Game_Event.prototype.erase;
    Game_Event.prototype.erase = function() {
        _Game_Event_erase.call(this);
        this[HOVER_BEAN_KEY] = null;
        markNeedRefresh();
    };

    //-------------------------------------------------------------------------
    // Sprite geometry / occlusion
    //-------------------------------------------------------------------------

    function globalFrame(sprite) {
        if (!sprite || !sprite.visible) {
            return null;
        }
        const bounds = sprite.getBounds ? sprite.getBounds(false) : null;
        if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
            return null;
        }
        return bounds;
    }

    function pictureSprites() {
        const scene = SceneManager._scene;
        const container = scene && scene._spriteset && scene._spriteset._pictureContainer;
        return container ? container.children.filter(sprite => sprite instanceof Sprite_Picture) : [];
    }

    // Alpha (0-255) of a sprite's bitmap under the screen point.
    //   null -> cannot test (no sprite / bitmap not ready yet)
    //   0    -> point lies outside the image (fully transparent)
    function pictureSpriteAlphaAt(sprite, x, y) {
        if (!sprite || !sprite.visible || sprite.worldAlpha <= 0 || !sprite.bitmap || !sprite.bitmap.isReady()) {
            return null;
        }
        const local = sprite.worldTransform.applyInverse(new Point(x, y));
        const bitmapX = Math.floor(local.x + sprite.anchor.x * sprite.bitmap.width);
        const bitmapY = Math.floor(local.y + sprite.anchor.y * sprite.bitmap.height);
        if (bitmapX < 0 || bitmapY < 0 || bitmapX >= sprite.bitmap.width || bitmapY >= sprite.bitmap.height) {
            return 0;
        }
        // 视频图片(MoviePicture)的 bitmap 是视频纹理，getAlphaPixel 读不到像素(恒 0)，
        //   会被误判为透明而无法遮挡/自判定。非 alpha 视频在包围盒内按完全不透明(255)处理。
        const gamePic = sprite.picture && sprite.picture();
        if (gamePic && gamePic.isVideo && gamePic.isVideo() &&
            !(gamePic.isVideoUseAlpha && gamePic.isVideoUseAlpha())) {
            return 255;
        }
        return sprite.bitmap.getAlphaPixel(bitmapX, bitmapY);
    }

    // Global "Enable Pixel Occlusion": a HIGHER picture opaquely covering the
    // point hides a lower target. Never inspects the target's own pixels.
    function isBeanOccludedByPictures(bean, x, y, sprites) {
        if (!bean) {
            return false;
        }
        const pictureId = Number(bean._pictureId || 0);
        for (const sprite of sprites) {
            if (bean._targetType === "picture" && sprite._pictureId <= pictureId) {
                continue;
            }
            const alpha = pictureSpriteAlphaAt(sprite, x, y);
            if (alpha !== null && alpha > settings.occlusionAlphaThreshold) {
                return true;
            }
        }
        return false;
    }

    // Per-bean "pixelPerfect": the target's OWN transparent pixels must not
    // trigger hover. Picture-only (event sprites use sheet frames). Returns true
    // when the point is transparent enough that the hover should be suppressed.
    function beanFailsSelfAlpha(bean, x, y, sprites) {
        if (bean._targetType !== "picture") {
            return false;
        }
        const sprite = sprites.find(candidate => candidate._pictureId === Number(bean._pictureId)) || null;
        if (!sprite) {
            return false;
        }
        const alpha = pictureSpriteAlphaAt(sprite, x, y);
        if (alpha === null) {
            return false; // bitmap not ready -> fall back to AABB, don't suppress
        }
        const threshold = Number(
            bean._style.pixelAlphaThreshold != null
                ? bean._style.pixelAlphaThreshold
                : settings.occlusionAlphaThreshold
        );
        return alpha <= threshold;
    }

    //-------------------------------------------------------------------------
    // Sprite_Picture / Sprite_Character - keep bean geometry up to date
    //-------------------------------------------------------------------------

    const _Sprite_Picture_update = Sprite_Picture.prototype.update;
    Sprite_Picture.prototype.update = function() {
        _Sprite_Picture_update.call(this);
        const picture = this.picture();
        if (!picture || !picture[HOVER_BEAN_KEY]) {
            return;
        }
        const bean = picture[HOVER_BEAN_KEY] = reviveHoverBean(picture[HOVER_BEAN_KEY], "picture");
        bean.setTarget("picture", this._pictureId, picture);
        const bounds = globalFrame(this);
        if (bounds) {
            bean.setPosition(bounds.x, bounds.y);
            bean.resetFrame(0, 0, bounds.width, bounds.height);
        }
    };

    const _Sprite_Character_update = Sprite_Character.prototype.update;
    Sprite_Character.prototype.update = function() {
        _Sprite_Character_update.call(this);
        const character = this._character;
        if (!(character instanceof Game_Event) || !character[HOVER_BEAN_KEY]) {
            return;
        }
        const bean = character[HOVER_BEAN_KEY] = reviveHoverBean(character[HOVER_BEAN_KEY], "event");
        bean.setTarget("event", character.eventId(), character);
        // Use the sprite's real world bounds (not screenX/patternWidth) so that
        // map-zoom / parallax plugins which scale the character layer — e.g.
        // DP_MapZoom — are accounted for automatically.
        const bounds = globalFrame(this);
        if (bounds) {
            bean.setPosition(bounds.x, bounds.y);
            bean.resetFrame(0, 0, bounds.width, bounds.height);
        }
    };

    //-------------------------------------------------------------------------
    // Saikey_HoverWindow - the shared hover window
    //-------------------------------------------------------------------------

    class Saikey_HoverWindow extends Window_Base {
        initialize() {
            // MZ takes a Rectangle; MV takes (x, y, width, height). Start at a valid
            // non-zero size so the initial createContents never builds a bad bitmap.
            if (Utils.RPGMAKER_NAME === "MZ") {
                Window_Base.prototype.initialize.call(this, new Rectangle(0, 0, 100, 100));
            } else {
                Window_Base.prototype.initialize.call(this, 0, 0, 100, 100);
            }
            this._bean = null;
            this._serial = null;
            this._hoverFrameCount = 0;
            this._saikeyScratch = null;
            this._scrollBitmapHeight = 0;
            this._scrollViewportY = 0;
            this._scrollViewportHeight = 0;
            this._scrollMax = 0;
            this._scrollOffset = 0;
            this._scrollDirection = 1;
            this._scrollWait = 0;
            this._fixedTextSprite = null;
            this.createTileBackground();
            this.createTextScrollMask();
            this.hide();
            this.openness = 255;
        }

        // Keep filtering local to hover-window text. Window_Base recreates the
        // contents bitmap whenever the window is resized, so apply NEAREST after
        // every createContents() instead of changing Bitmap's global default.
        createContents() {
            Window_Base.prototype.createContents.call(this);
            if (this.contents) {
                this.contents.smooth = false;
            }
        }

        contentsHeight() {
            const baseHeight = Window_Base.prototype.contentsHeight.call(this);
            return Math.max(baseHeight, this._scrollBitmapHeight || 0);
        }

        get innerWidth() {
            const style = this._bean ? this._bean._style : defaultStyle;
            return Math.max(0, this.width - TILE_PADDING - 15 - this.textPaddingRight(style));
        }

        get innerHeight() {
            const style = this._bean ? this._bean._style : defaultStyle;
            return Math.max(0, this.height - TILE_PADDING - 15 - this.textPaddingBottom(style));
        }

        createTextScrollMask() {
            this._textScrollMask = new PIXI.Graphics();
            this._clientArea.addChild(this._textScrollMask);
            this._contentsSprite.mask = this._textScrollMask;
            this.refreshTextScrollMask();
        }

        refreshTextScrollMask() {
            if (!this._textScrollMask) {
                return;
            }
            this._textScrollMask.clear();
            this._textScrollMask.beginFill(0xffffff);
            this._textScrollMask.drawRect(
                0,
                this._scrollViewportY || 0,
                this.innerWidth,
                Math.max(0, this._scrollViewportHeight || 0)
            );
            this._textScrollMask.endFill();
        }

        hoverUpdateInterval() {
            return Utils.isMobileDevice() ? settings.updateIntervalMobile : settings.updateIntervalPC;
        }

        // textSizeEx is MZ-only. On MV, measure via drawTextEx on an off-screen
        // scratch bitmap (escape codes included, nothing visibly drawn).
        saikeyTextSize(text) {
            if (typeof this.textSizeEx === "function") {
                return this.textSizeEx(text);
            }
            if (!this._saikeyScratch) {
                this._saikeyScratch = new Bitmap(Math.max(1, Graphics.width), 100);
            }
            const original = this.contents;
            this.contents = this._saikeyScratch;
            const width = this.drawTextEx(text, 0, 0);
            this.contents = original;
            return { width, height: this.lineHeight() };
        }

        standardPadding() { return TILE_PADDING; }

        updatePadding() { this.padding = TILE_PADDING; }

        // Avoid refreshing the hidden native skin on each resize.
        _refreshBack() {}
        _refreshFrame() {}

        createTileBackground() {
            this._bgSprite = new Sprite();
            this.addChildAt(this._bgSprite, 0);
            this._tileParts = [];
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 3; col++) {
                    const bitmap = tileBitmap('nine/' + row + col);
                    const part = row === 1 || col === 1 ? new TilingSprite(bitmap) : new Sprite(bitmap);
                    this._tileParts.push(part);
                    this._bgSprite.addChild(part);
                }
            }
            this._tileDecoration = new Sprite();
            this._tileDecoration.anchor.set(1, 1);
            this._bgSprite.addChild(this._tileDecoration);
            this.opacity = 0;
            this.backOpacity = 0;
            this.frameVisible = false;
        }

        resetFontSettings() {
            Window_Base.prototype.resetFontSettings.call(this);
            const bean = this._bean;
            this.contents.fontSize = bean ? Number(bean._style.fontSize || settings.fontSize) : settings.fontSize;
        }

        updateTextGlow() {
            const style = this._bean ? this._bean._style : {};
            const enabled = style.textGlow == null || parseBoolean(style.textGlow);
            if (!this._plainClientFilters) this._plainClientFilters = this._clientArea.filters;
            if (enabled && !this._textGlowFilter && PIXI.filters && PIXI.filters.GlowFilter) {
                this._textGlowFilter = new PIXI.filters.GlowFilter({
                    distance: 6, outerStrength: 3, innerStrength: 0,
                    color: 0x000000, quality: 0.2
                });
                this._textGlowFilters = [this._textGlowFilter];
            }
            const filters = enabled && this._textGlowFilter
                ? this._textGlowFilters : this._plainClientFilters;
            if (this._clientArea.filters !== filters) this._clientArea.filters = filters;
        }

        destroy(options) {
            // Sprite destruction does not own filter resources. Keep ownership
            // with this window; never destroy the shared nine-slice bitmaps.
            if (this._textGlowFilter) {
                this._clientArea.filters = this._plainClientFilters;
                const renderer = Graphics.app && Graphics.app.renderer;
                if (renderer && renderer.shader && renderer.shader.shader === this._textGlowFilter) {
                    renderer.shader.reset();
                }
                this._textGlowFilter.destroy();
                this._textGlowFilter = null;
            }
            this.hideFixedTextSprite();
            if (this._saikeyScratch) this._saikeyScratch.destroy();
            Window_Base.prototype.destroy.call(this, options);
        }

        // MV→MZ：MZ 默认文字色来自全局 ColorManager.normalColor()（全局 Window.png 的0号像素，
        // 本游戏偏黑）。用背景图时本窗口不设 windowskin，于是文字变黑。这里改成可配置默认色（默认白）。
        // 可在某个 bean 的 _style.textColor，或全局 settings.textColor 里覆盖；\c[n] 彩色转义不受影响。
        resetTextColor() {
            this.changeTextColor(this.saikeyDefaultTextColor());
        }
        saikeyDefaultTextColor() {
            const style = this._bean ? this._bean._style : null;
            return String((style && style.textColor) || settings.textColor || "#ffffff");
        }

        lineHeight() {
            return Math.max(this.contents ? this.contents.fontSize + 8 : settings.fontSize + 8, 28);
        }

        update() {
            Window_Base.prototype.update.call(this);
            this.updateTargetBean();
            this.updatePlacement();
            this.updateTextAutoScroll();
        }

        updateTargetBean() {
            if (!$gameTemp) {
                this.setBean(null);
                return;
            }
            // Rebuilding the bean list stays unthrottled so binds/clears apply at once.
            if ($gameTemp._saikeyNeedRefresh) {
                refreshBeanTank();
            }
            // 刚切为强制显示时立即让出普通窗口，避免检测间隔内短暂重复显示。
            if (this._bean?.forceShow === true) this.setBean(null);
            // Throttle the expensive hit-test; the window keeps following the cursor
            // every frame via updatePlacement, so this stays imperceptible.
            if (this._hoverFrameCount > 0) {
                this._hoverFrameCount--;
                return;
            }
            this._hoverFrameCount = this.hoverUpdateInterval() - 1;
            const mx = HoverInput.x;
            const my = HoverInput.y;
            const beans = $gameTemp._saikeyHoverBeans || [];
            // The picture sprite list is needed by per-bean pixelPerfect and by
            // global occlusion. Build it at most once per scan, and only when a
            // check actually asks for it (default config never pays the cost).
            let pictureSpriteList = null;
            const spritesOnce = () => pictureSpriteList || (pictureSpriteList = pictureSprites());
            let bean = null;
            for (let i = beans.length - 1; i >= 0; i--) {
                const candidate = beans[i];
                if (!candidate || !candidate._visible || candidate.forceShow === true) {
                    continue;
                }
                // 悬停目标本身不透明度归零也不显示窗口
                if (candidate._style?.pixelPerfect && candidate._target && candidate._target._opacity < 5) {
                    continue;
                }
                if (mx < candidate._x || mx > candidate._x + candidate._frameW ||
                    my < candidate._y || my > candidate._y + candidate._frameH) {
                    continue;
                }
                // Per-bean: skip when over the target's own transparent pixels.
                if (candidate._style && candidate._style.pixelPerfect &&
                    beanFailsSelfAlpha(candidate, mx, my, spritesOnce())) {
                    continue;
                }
                // 遮挡检测：全局开关开启，或该 bean 在 bindPicture/bindEvent 时传了
                //   enablePixelOcclusion:true（逐个绑定的可选项，全局默认仍可保持关闭）。
                const occlusionOn = settings.enablePixelOcclusion ||
                    (candidate._style && candidate._style.enablePixelOcclusion);
                if (occlusionOn &&
                    isBeanOccludedByPictures(candidate, mx, my, spritesOnce())) {
                    continue;
                }
                bean = candidate;
                break;
            }
            this.setBean(bean);
        }

        setBean(bean) {
            const targetChanged = this._bean !== bean;
            if (targetChanged && bean) {
                bean.evaluateTextNow();
            }
            if (targetChanged || (bean && this._serial !== bean._contextSerial)) {
                this._bean = bean;
                this._serial = bean ? bean._contextSerial : null;
                this.refreshHoverContents();
            }
            if (bean) {
                this.show();
            } else {
                this.hide();
            }
        }

        textLines() {
            return this._bean ? this._bean.textLines() : [];
        }

        separatorStyle() {
            const style = this._bean ? this._bean._style : {};
            const value = (key, fallback, max) => {
                const n = Number(style[key]);
                return style[key] != null && Number.isFinite(n)
                    ? Math.max(0, Math.min(max, Math.round(n))) : fallback;
            };
            return { gap: value('separatorGap', 10, 100),
                thickness: Math.max(1, value('separatorThickness', 1, 10)),
                inset: value('separatorInset', 0, 1000),
                color: String(style.separatorColor || 'rgba(255,255,255,0.3)') };
        }

        isSeparatorLine(line) { return /^\s*\\HSEP\s*$/i.test(line); }

        calcTextHeight(textState) {
            const line = textState.text.slice(textState.index).split('\n')[0];
            if (/^\s*\x1bHSEP\s*$/i.test(line)) {
                const style = this.separatorStyle();
                return style.gap * 2 + style.thickness;
            }
            // Count only sizes actually used by visible text. In particular a
            // leading FS/FR must not inherit the previous line's larger height.
            const originalSize = this.contents.fontSize;
            const baseSize = this._bean
                ? Number(this._bean._style.fontSize || settings.fontSize) : settings.fontSize;
            const safeSize = value => Number.isFinite(value) && value > 0 ? value : baseSize;
            let maxSize = 0;
            const tokens = /\x1b([A-Za-z]+|[^\r\n])(?:\[([^\]]*)\])?|([^\x1b]+)/g;
            let token;
            try {
                this.contents.fontSize = safeSize(originalSize);
                while ((token = tokens.exec(line))) {
                    if (token[3] !== undefined) {
                        if (/\S/.test(token[3])) maxSize = Math.max(maxSize, safeSize(this.contents.fontSize));
                        continue;
                    }
                    const code = token[1].toUpperCase();
                    if (code === 'FS') this.contents.fontSize = safeSize(Number(token[2]));
                    else if (code === 'FR') this.contents.fontSize = baseSize;
                    else if (code === '{') this.makeFontBigger();
                    else if (code === '}') this.makeFontSmaller();
                    else if (code === 'DIMG') maxSize = Math.max(maxSize, 24);
                    // Icons retain the project's existing rule: enlarging an
                    // icon alone does not inflate the text line's font height.
                }
                return (maxSize || safeSize(this.contents.fontSize)) + 8;
            } finally {
                this.contents.fontSize = originalSize;
            }
        }

        processEscapeCharacter(code, textState) {
            if (code !== 'HSEP') {
                return Window_Base.prototype.processEscapeCharacter.call(this, code, textState);
            }
            const style = this.separatorStyle();
            const height = style.gap * 2 + style.thickness;
            textState.height = height;
            // Measurement follows the same cursor as drawing, without giving the
            // divider a text width (the window width must be determined by text).
            textState.outputHeight = Math.max(textState.outputHeight || 0,
                textState.y - textState.startY + height);
            if (textState.drawing) {
                const x = style.inset;
                const width = Math.max(0, this.contentsWidth() - x * 2);
                if (width > 0) {
                    const ctx = this.contents.context;
                    const y = Math.round(textState.y + style.gap);
                    ctx.save();
                    ctx.fillStyle = style.color;
                    ctx.fillRect(x, y, width, style.thickness);
                    ctx.restore();
                    this.contents.baseTexture.update();
                }
            }
        }

        textDisplayHeight(style) {
            const data = style || defaultStyle;
            const value = Number(data.textDisplayHeight);
            return Number.isFinite(value) && value > 0
                ? value
                : defaultStyle.textDisplayHeight;
        }

        textPaddingBottom(style) {
            const raw = (style || defaultStyle).paddingBottom;
            const value = Number(raw);
            return raw == null || !Number.isFinite(value) ? 30 : Math.max(0, value);
        }

        textPaddingRight(style) {
            const raw = (style || defaultStyle).paddingRight;
            const value = Number(raw);
            return raw == null || !Number.isFinite(value) ? 30 : Math.max(0, value);
        }

        textDisplayWidth(style) {
            const value = Number((style || defaultStyle).textDisplayWidth);
            return Number.isFinite(value) && value > 0 ? value : 0;
        }

        textUnits(text) {
            const units = [];
            const source = String(text);
            const regex = /\\[A-Za-z]+\[\d+\]|\\[A-Za-z]+|\\[{}]|\\.|[^\s\\]+|\s+/g;
            let match = null;
            while ((match = regex.exec(source))) {
                units.push(match[0]);
            }
            return units.length > 0 ? units : [source];
        }

        characterWrapUnits(text) {
            const units = [];
            const source = String(text);
            const regex = /\\[A-Za-z]+\[[^\]]*\]|\\[A-Za-z]+|\\[{}]|\\.|[\s\S]/gu;
            let match = null;
            while ((match = regex.exec(source))) {
                units.push(match[0]);
            }
            return units.length > 0 ? units : [source];
        }

        autoWrapUnits(text) {
            const units = [];
            const source = String(text);
            AUTO_WRAP_UNIT_REGEX.lastIndex = 0;
            let match = null;
            while ((match = AUTO_WRAP_UNIT_REGEX.exec(source))) {
                units.push(match[0]);
            }
            return units.length > 0 ? units : [source];
        }

        wrappedTextLines(lines, maxWidth, characterWrap = false) {
            const wrapped = [];
            for (const sourceLine of lines) {
                const line = String(sourceLine);
                if (this.saikeyTextSize(line).width <= maxWidth) {
                    wrapped.push(line);
                    continue;
                }
                let current = "";
                const tokens = characterWrap
                    ? this.autoWrapUnits(line)
                    : line.split(/(\s+)/).filter(token => token.length > 0);
                for (const token of tokens) {
                    const candidate = current + token;
                    if (!current) {
                        current = token.trimStart();
                    } else if (this.saikeyTextSize(candidate).width <= maxWidth) {
                        current = candidate;
                    } else {
                        wrapped.push(current.trimEnd());
                        current = token.trimStart();
                    }
                    while (this.saikeyTextSize(current).width > maxWidth && current.length > 1) {
                        let chunk = "";
                        for (const unit of this.characterWrapUnits(current)) {
                            if (chunk && this.saikeyTextSize(chunk + unit).width > maxWidth) {
                                break;
                            }
                            chunk += unit;
                        }
                        wrapped.push(chunk);
                        current = current.slice(chunk.length);
                    }
                }
                if (current) {
                    wrapped.push(current.trimEnd());
                }
            }
            return wrapped.length > 0 ? wrapped : [""];
        }

        fixedLineCount(style, lineCount) {
            const value = Math.floor(Number((style || defaultStyle).fixedLineCount) || 0);
            return Math.max(0, Math.min(value, lineCount));
        }

        textBlockHeight(lines) {
            if (!lines || lines.length <= 0) {
                return 0;
            }
            const text = lines.join("\n");
            return typeof this.textSizeEx === "function"
                ? Math.max(1, Math.ceil(this.saikeyTextSize(text).height))
                : lines.length * this.lineHeight();
        }

        ensureFixedTextSprite() {
            if (!this._fixedTextSprite) {
                this._fixedTextSprite = new Sprite();
                // Add lazily above the scrolling contents. Bindings with the
                // default fixedLineCount:0 never create this second text layer.
                this._clientArea.addChild(this._fixedTextSprite);
            }
            this._fixedTextSprite.visible = true;
            return this._fixedTextSprite;
        }

        hideFixedTextSprite() {
            if (this._fixedTextSprite) {
                this._fixedTextSprite.visible = false;
                const bitmap = this._fixedTextSprite.bitmap;
                this._fixedTextSprite.bitmap = null;
                if (bitmap && typeof bitmap.destroy === "function") {
                    bitmap.destroy();
                }
            }
        }

        drawFixedText(text, x, y) {
            const sprite = this.ensureFixedTextSprite();
            const oldBitmap = sprite.bitmap;
            sprite.bitmap = null;
            if (oldBitmap && typeof oldBitmap.destroy === "function") {
                oldBitmap.destroy();
            }
            const fixedBitmap = new Bitmap(
                Math.max(1, this.contentsWidth()),
                Math.max(1, Math.ceil(y + this._fixedTextHeight))
            );
            fixedBitmap.smooth = false;
            const scrollingBitmap = this._contentsSprite.bitmap;
            sprite.bitmap = fixedBitmap;

            // drawTextEx always targets this.contents, so temporarily point the
            // window's contents sprite at the fixed bitmap while drawing it.
            this._contentsSprite.bitmap = fixedBitmap;
            try {
                this.resetFontSettings();
                this.drawTextEx(text, x, y, this.contentsWidth() - x);
            } finally {
                this._contentsSprite.bitmap = scrollingBitmap;
                this.resetFontSettings();
            }
        }

        layoutCacheKey(lines, style) {
            if (style.layoutCache === false || (document.fonts && document.fonts.status !== 'loaded') ||
                (typeof FontManager !== 'undefined' && Object.values(FontManager._states || {}).includes('loading'))) return null;
            const profile = [this.convertEscapeCharacters, this.processEscapeCharacter, this.calcTextHeight,
                this.lineHeight, this.resetFontSettings, this.textSizeEx, this.processDrawIcon,
                this.wrappedTextLines, this.saikeyTextSize];
            if (!layoutCacheProfile || profile.some((fn, i) => fn !== layoutCacheProfile[i])) {
                clearLayoutCache();
                layoutCacheProfile = profile;
            }
            // Resolve variables, actor/item names and translation substitutions on
            // every refresh, even when the source expression itself has not changed.
            const expanded = lines.map(line => this.convertEscapeCharacters(String(line)));
            const known = new Set(['C', 'CC', 'I', 'FS', 'FN', 'FR', 'FI', 'FB', 'PX', 'PY', 'HSEP']);
            for (const text of expanded) {
                const codes = text.matchAll(/\x1b([A-Za-z]+)/g);
                for (const match of codes) if (!known.has(match[1].toUpperCase())) return null;
            }
            const bitmap = this.contents;
            return JSON.stringify([lines, expanded, Graphics.boxWidth, Graphics.boxHeight,
                bitmap.fontFace, bitmap.fontSize, bitmap.fontBold, bitmap.fontItalic,
                this.lineHeight(), $gameSystem.mainFontSize(), Utils.isMobileDevice(),
                ImageManager.iconWidth, ImageManager.iconHeight,
                ImageManager.standardIconWidth, ImageManager.standardIconHeight,
                style.minWidth, style.minHeight, style.tileMinWidth, style.tileMinHeight,
                style.maxWidth, style.maxHeight, style.textDisplayWidth, style.fixedLineCount,
                this.textPaddingBottom(style), this.textPaddingRight(style),
                this.separatorStyle().gap, this.separatorStyle().thickness]);
        }

        hoverLayout(lines, style) {
            const key = this.layoutCacheKey(lines, style);
            if (key !== null && layoutCache.has(key)) {
                const entry = layoutCache.get(key);
                layoutCache.delete(key);
                layoutCache.set(key, entry);
                layoutCacheCounters.hits++;
                return entry.layout;
            }
            if (key === null) layoutCacheCounters.bypasses++;
            else layoutCacheCounters.misses++;
            const layout = this.calculateHoverLayout(lines, style);
            if (key !== null) rememberLayout(key, layout);
            return layout;
        }

        calculateHoverLayout(lines, style) {
            const verticalPadding = TILE_PADDING + 15 + this.textPaddingBottom(style);
            const horizontalPadding = TILE_PADDING + 15 + this.textPaddingRight(style);
            const finitePositive = (value, fallback) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
            const screenWidth = Graphics.boxWidth;
            const screenHeight = Graphics.boxHeight;
            const widthLimit = Math.max(99, Math.floor(Math.min(screenWidth,
                Math.max(159, finitePositive(style.maxWidth, settings.maxWidth)))));
            const heightLimit = Math.max(97, Math.floor(Math.min(screenHeight,
                Math.max(97, finitePositive(style.maxHeight, settings.maxHeight)))));
            const minWidth = Math.min(widthLimit, Math.ceil(Math.max(159,
                finitePositive(style.minWidth, finitePositive(style.tileMinWidth, settings.minWidth)))));
            const minHeight = Math.min(heightLimit, Math.ceil(Math.max(97,
                finitePositive(style.minHeight, finitePositive(style.tileMinHeight, settings.minHeight)))));
            const textWidth = Math.max(1, Math.min(widthLimit - horizontalPadding, this.textDisplayWidth(style) || Infinity));
            // Divider rows do not consume fixedLineCount. A divider immediately
            // following the final fixed source line stays with that fixed block.
            let fixedCount = this.fixedLineCount(style, lines.filter(line => !this.isSeparatorLine(line)).length);
            let splitIndex = 0, counted = 0;
            if (fixedCount) {
                while (splitIndex < lines.length && counted < fixedCount) {
                    if (!this.isSeparatorLine(lines[splitIndex])) counted++;
                    splitIndex++;
                }
                while (splitIndex < lines.length && this.isSeparatorLine(lines[splitIndex])) splitIndex++;
            }
            let fixedLines = fixedCount ? this.wrappedTextLines(lines.slice(0, splitIndex), textWidth, true) : [];
            let scrollingLines = lines.length > splitIndex
                ? this.wrappedTextLines(lines.slice(splitIndex), textWidth, true) : [];
            let fixedHeight = this.textBlockHeight(fixedLines);
            const visibleLimit = Math.max(1, heightLimit - verticalPadding);
            // An oversized fixed header must not leave the body permanently inaccessible.
            if (fixedHeight > visibleLimit || (scrollingLines.length && fixedHeight + this.lineHeight() > visibleLimit)) {
                scrollingLines = fixedLines.concat(scrollingLines);
                fixedLines = [];
                fixedHeight = 0;
                fixedCount = 0;
            }
            const drawLines = fixedLines.concat(scrollingLines);
            const fullText = drawLines.join('\n');
            // Measure the complete block too: font changes can span explicit newlines.
            const measured = this.saikeyTextSize(fullText);
            let textWidthUsed = measured.width;
            for (const line of drawLines) textWidthUsed = Math.max(textWidthUsed, this.saikeyTextSize(line).width);
            const scrollingHeight = fixedCount ? this.textBlockHeight(scrollingLines) : Math.max(1, measured.height);
            const visibleScrollingHeight = Math.min(scrollingHeight, Math.max(0, visibleLimit - fixedHeight));
            const width = tileSize(textWidthUsed + horizontalPadding, 99, minWidth, widthLimit);
            const height = tileSize(fixedHeight + visibleScrollingHeight + verticalPadding, 97, minHeight, heightLimit);
            return { fixedCount, fixedLines, scrollingLines, fullText, fixedHeight,
                scrollingHeight, visibleScrollingHeight, width, height };
        }

        refreshHoverContents() {
            if (!this._bean) return;
            const style = this._bean._style;
            const lines = this.textLines();
            this.resetFontSettings();
            const { fixedCount, fixedLines, scrollingLines, fullText, fixedHeight,
                scrollingHeight, visibleScrollingHeight, width, height } = this.hoverLayout(lines, style);
            this._fixedTextHeight = fixedHeight;
            this._scrollBitmapHeight = Math.ceil(fixedHeight + scrollingHeight);
            this._scrollViewportY = fixedHeight;
            this._scrollViewportHeight = visibleScrollingHeight;
            this.padding = TILE_PADDING;
            this.move(this.x, this.y, width, height);
            this.createContents();
            this.refreshTextScrollMask();
            this.resetFontSettings();
            this.updateBackgroundStyle();
            this.updateTextGlow();
            if (fixedCount) {
                if (scrollingLines.length) this.drawTextEx(scrollingLines.join('\n'), 0, fixedHeight, this.contentsWidth());
                this.drawFixedText(fixedLines.join('\n'), 0, 0);
            } else {
                this.hideFixedTextSprite();
                this.drawTextEx(fullText, 0, 0, this.contentsWidth());
            }
            this._scrollMax = Math.max(0, scrollingHeight - visibleScrollingHeight);
            this.resetTextAutoScroll();
        }

        resetTextAutoScroll() {
            this._scrollOffset = 0;
            this._scrollDirection = 1;
            // Newly displayed hover text moves immediately. Pauses are applied
            // only after the text actually reaches the top or bottom.
            this._scrollWait = 0;
            if (this.origin) {
                this.origin.y = 0;
            }
            if (this._contentsSprite) {
                this._contentsSprite.y = 0;
            }
        }

        updateTextAutoScroll() {
            if (!this._bean || !this.visible || !(this._scrollMax > 0)) {
                return;
            }
            if (this._scrollWait > 0) {
                this._scrollWait--;
                return;
            }

            this._scrollOffset += HOVER_SCROLL_SPEED * this._scrollDirection;
            if (this._scrollOffset >= this._scrollMax) {
                this._scrollOffset = this._scrollMax;
                this._scrollDirection = -1;
                this._scrollWait = HOVER_SCROLL_PAUSE;
            } else if (this._scrollOffset <= 0) {
                this._scrollOffset = 0;
                this._scrollDirection = 1;
                this._scrollWait = HOVER_SCROLL_PAUSE;
            }
            this._contentsSprite.y = -Math.round(this._scrollOffset);
        }

        updateDecoration() {
            const style = this._bean ? this._bean._style : {};
            const value = style.decoration;
            const name = value == null ? 'decoration'
                : value === false ? '' : String(value).trim().replace(/\.png$/i, '');
            if (name !== this._decorationName) {
                this._decorationName = name;
                this._tileDecoration.bitmap = name ? tileBitmap(name) : null;
                this._tileDecoration.visible = !!name;
            }
            // Bottom-right anchoring also handles async loads and different
            // image dimensions without callbacks retaining a window instance.
            this._tileDecoration.move(this.width - TILE_DECORATION_PADDING,
                this.height - TILE_DECORATION_PADDING);
        }

        updateBackgroundStyle() {
            this.updateDecoration();
            const width = this.width, height = this.height;
            if (this._tileWidth === width && this._tileHeight === height) return;
            this._tileWidth = width;
            this._tileHeight = height;
            const xs = [0, 49, width - 50], ys = [0, 48, height - 49];
            const widths = [49, width - 99, 50], heights = [48, height - 97, 49];
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 3; col++) {
                    const part = this._tileParts[row * 3 + col];
                    if (part instanceof TilingSprite) part.move(xs[col], ys[row], widths[col], heights[row]);
                    else part.move(xs[col], ys[row]);
                }
            }
        }

        updatePlacement() {
            if (!this._bean || !this.visible) {
                return;
            }
            const style = this._bean._style;
            const offsetX = Number(style.offsetX || 0);
            const offsetY = Number(style.offsetY || 0);
            const pointer = this.placementPosition();
            let x = pointer.x + offsetX;
            let y = pointer.y + offsetY;
            if (x + this.width > Graphics.boxWidth) {
                x = pointer.x - this.width - Math.abs(offsetX);
            }
            if (y + this.height > Graphics.boxHeight) {
                y = pointer.y - this.height - Math.abs(offsetY);
            }
            x = Math.min(Math.max(0, x), Graphics.boxWidth - this.width);
            y = Math.min(Math.max(0, y), Graphics.boxHeight - this.height);
            this.move(Math.round(x), Math.round(y), this.width, this.height);
        }

        placementPosition() {
            return HoverInput;
        }
    }

    Saikey.MPMZ.HoverWindow = Saikey_HoverWindow;

    // 每个强制目标独占一个窗口，正常悬停窗口仍独立选取其他目标。
    class Saikey_ForcedHoverWindow extends Saikey_HoverWindow {
        updateTargetBean() {
            const bean = this._forcedBean;
            this.setBean(bean && bean.forceShow === true && bean._visible ? bean : null);
        }

        placementPosition() {
            const bean = this._forcedBean;
            return { x: bean._x + bean._frameW / 2, y: bean._y + bean._frameH / 2 };
        }

        updatePlacement() {
            super.updatePlacement();
            const position = this._forcedBean?._forceShowPosition;
            if (!this._bean || !this.visible || !position) return;
            this.move(
                Number.isFinite(position.x) ? Math.round(position.x) : this.x,
                Number.isFinite(position.y) ? Math.round(position.y) : this.y,
                this.width, this.height
            );
        }
    }

    function createForcedWindowLayer(scene) {
        const layer = new Sprite();
        layer._windows = new Map();
        layer.update = function() {
            if ($gameTemp?._saikeyNeedRefresh) refreshBeanTank();
            const beans = $gameTemp?._saikeyHoverBeans || [];
            for (const [bean, win] of this._windows) {
                if (bean.forceShow !== true || !bean._visible || !beans.includes(bean) ||
                    !forcedTargetIsCurrent(bean)) {
                    this.removeChild(win);
                    win.destroy();
                    this._windows.delete(bean);
                }
            }
            for (const bean of beans) {
                if (bean.forceShow !== true || !bean._visible ||
                    this._windows.has(bean) || !forcedTargetIsCurrent(bean)) continue;
                const win = new Saikey_ForcedHoverWindow();
                win._forcedBean = bean;
                this._windows.set(bean, win);
                this.addChild(win);
            }
            Sprite.prototype.update.call(this);
        };
        // 位于普通悬停窗之下，仍由场景销毁其窗口、贴图及滤镜。
        scene._saikeyForcedWindowLayer = layer;
        scene.addChildAt(layer, 1);
    }

    function forcedTargetIsCurrent(bean) {
        const target = bean._targetType === "picture"
            ? $gameScreen.picture(bean._pictureId) : $gameMap.event(bean._eventId);
        return !!(target && !target._erased && target[HOVER_BEAN_KEY] === bean);
    }

    //-------------------------------------------------------------------------
    // Scene hooks
    //-------------------------------------------------------------------------

    // 悬浮窗层级压到"紧贴地图层之上"(场景子级索引 1，spriteset 在索引 0)。
    //   原因：物品/装备/技能栏的背景贴图用 Yanfly 的 addChildToBack 加到 _windowLayer【下方】，
    //   所以只要悬浮窗还在 _windowLayer 里(哪怕最底层)，整层都在这些背景之上、盖不住。
    //   这里把它放到 _windowLayer 之下、仅在地图之上：所有 UI(栏背景、栏、HUD、描述窗)都能盖住它，
    //   而栏背景平时 opacity=0、栏打开时才显形并遮住它——正是所需效果。
    //   强制窗口层占索引 1，普通悬停窗口占索引 2，均在 spriteset 之上、其他 UI 之下。
    const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _Scene_Map_createAllWindows.call(this);
        createForcedWindowLayer(this);
        this._saikeyHoverWindow = new Saikey_HoverWindow();
        this.addChildAt(this._saikeyHoverWindow, 2);
    };

    const _Scene_Battle_createAllWindows = Scene_Battle.prototype.createAllWindows;
    Scene_Battle.prototype.createAllWindows = function() {
        _Scene_Battle_createAllWindows.call(this);
        createForcedWindowLayer(this);
        this._saikeyHoverWindow = new Saikey_HoverWindow();
        this.addChildAt(this._saikeyHoverWindow, 2);
    };
})();
