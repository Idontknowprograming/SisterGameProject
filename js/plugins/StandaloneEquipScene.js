/*:
 * @target MZ
 * @plugindesc v0.10.1 独立装备场景：隔离试穿、排序API、拖拽与内嵌描述。
 * @author shiroin / Codex (layout and help adapted from project Yanfly/Aloe UI)
 * @command Open
 * @text 打开独立装备场景
 * @arg slotIndex
 * @text 初始装备槽（0武器，1～5护甲）
 * @type number
 * @min 0
 * @max 5
 * @default 0
 * @help
 * 放在本工程插件列表末尾。脚本调用：StandaloneEquipScene.open(0);
 * 或使用本插件的「打开独立装备场景」命令。
 *
 * 排序API（不新增切换按钮）：
 *   StandaloneEquipScene.setSortMode('default');      // 原版基础装备顺序，默认
 *   StandaloneEquipScene.setSortMode('instanceAsc');  // 独立实例ID升序
 *   StandaloneEquipScene.setSortMode('instanceDesc'); // 独立实例ID降序
 *   StandaloneEquipScene.getSortMode();              // 当前规则
 *   StandaloneEquipScene.sortModes;                  // 支持的规则名称（只读）
 * 规则保存在当前$gameSystem中，随存档保存；旧存档未设置时使用default。
 * 切换立即刷新已打开的界面，保留所选装备及筛选，必要时滚动到该装备。
 * 切换前取消正在进行的拖拽/确认框；关闭过渡中拒绝切换。
 * setSortMode成功返回true；无效名称、尚未建立游戏数据或关闭过渡中返回false。
 * default复用原independentItemSort，同基础装备按实例ID升序排列。
 * 实例ID不是严格获取时间，丢弃后拾取同一实例不会改变ID。
 *
 * 这是独立测试入口；没有改写公共事件100/101/102/107或地图图片绑定。
 * 后续接入旧入口时，请用上述脚本替换101/102整个旧打开流程，
 * 不要在旧 Zzy 暂停/MapSelectEquip 流程中间调用。
 *
 * 点击右侧槽选择目标；点击背包装备保留「装备／丢弃」二次菜单。
 * 移动端首次点背包装备仅选中并查看描述，再点同一件才打开二次菜单。
 * 长按或按住移动开始拖拽，隐藏来源图标，右侧说明继续显示。
 * 选中槽使用equip slot_null图片；拖拽时兼容空槽闪白背景，有装备则闪白图标。
 * 背包装备拖到兼容槽松手换装；拖到整个双栏面板及槽位以外松手丢弃。
 * 拖出丢弃成功后，图标在松手处播放45帧放大淡出动画。
 * 已装备图标拖出全部槽位区域松手卸下，武器恢复基础武器4（拳头）。
 * 基础武器4仅作空手占位：可查看，不可拖拽、卸下或丢弃，不列入背包。
 * 拖回面板内、无效槽或屏幕外会取消；Esc/右键也可取消拖拽。
 * 丢弃沿用原地图掉落方法，保留初号机禁丢与仓库容量规则，返回地图后可拾取。
 * 返回键使用 Drill_MenuBackButton 当前配置；滚动条使用 Drill_MenuScrollBar 样式2。
 * 列表空白处滑动、滚轮、PageUp/PageDown可翻页，不额外绘制翻页/Back按钮。
 * 槽位悬停完整继承原Saikey装备绑定参数并实时跟随鼠标，触屏点槽显示描述。
 * 取消优先处理当前拖拽／二次菜单，随后才返回地图。
 * 方向键浏览、确定键打开二次菜单、Tab切换槽位。
 * 底部操作提示和拖拽两侧提示读取 window.mapCommonEventDialogue.EquipScene。
 * 提示使用25号字、描述正文的语言字体和黑色Glow，从透明开始闪烁。
 * 背包拖拽仅显示左侧丢弃提示；装备槽拖拽仅显示右侧卸下提示。
 * 提示闪烁周期72帧；底部操作提示满5秒后完成当前一轮淡出再隐藏。
 * 拖拽或刷新不会重新显示底部提示。
 *
 * 场景使用标准 SceneManager.push/pop；地图停止更新，不操作Zzy暂停或子弹paused。
 * 启用Shiroin_UnderwaterBgm时，进入装备场景开启水下音效，退出恢复进入前的状态。
 * 仅新增 Scene_StandaloneEquip、StandaloneEquipScene 和本插件命令，
 * 不覆盖任何已有场景/窗口/输入/装备方法。UI资源复用本工程图片与描述函数；
 * 不依赖 YEP_MapSelectEquip 或 Saikey 的窗口类；返回/滚动条复用已安装Drill插件。
 * 场景内仅修改预览角色和库存账本，不执行换装Eval、不生成/删除地图事件。
 * 返回原生Scene_Map、地图精灵就绪后，按入场与最终装备实例的净差结算。
 * 调用原WAY公开Eval执行器及QJ卸下处理；不替换任何外部函数或全局对象。
 * 不解析或改写装备Eval，不按装备ID预测效果；容量等Eval数值在结算后更新。
 * 原Eval主动引发的连带换装由原换装链处理。
 * 丢弃也在返回地图后执行，保留原独立装备实例与掉落规则。
 * 返回地图时仅为最终发生变化的槽排队公共事件100，以同步战斗/HUD。
 */
(() => {
'use strict';
const PLUGIN_NAME = 'StandaloneEquipScene';
const SORT_MODES = Object.freeze(['default', 'instanceAsc', 'instanceDesc']);

function getSortMode() {
  const mode = $gameSystem?._standaloneEquipSortMode;
  return SORT_MODES.includes(mode) ? mode : 'default';
}

function setSortMode(mode) {
  if (!SORT_MODES.includes(mode) || !$gameSystem) return false;
  const scene = SceneManager._scene;
  if (scene instanceof Scene_StandaloneEquip && scene._closing) return false;
  if (getSortMode() === mode) return true;
  $gameSystem._standaloneEquipSortMode = mode;
  if (scene instanceof Scene_StandaloneEquip && scene._grid) scene.refreshSortOrder();
  return true;
}
const LAYOUT = Object.freeze({
  x: 343, y: 90, width: 1234, height: 885,
  // Background panel bodies exclude shadows: left [15, 771), right [777, 1219).
  // Column pitch = floor((listWidth - 24px window padding) / columns).
  listCenterX: 393, listY: 230, listWidth: 700,
  columns: 5, rows: 5, cellHeight: 96,
  iconY: 16, markerSize: 96,
  helpX: 797, helpY: 92, helpWidth: 412, helpHeight: 690,
  // Body ends at panel y=770, leaving 100px above the opaque bottom edge.
  bodyY: 76, bodyHeight: 590, bodyRightInset: 20, titleHeight: 56,
  decorationY: 84,
  weaponDecoration: 'equip_weapon', armorDecoration: 'equip_gear',
  filterY: 162, filterStep: 60
});
const HINT_BLINK_FRAMES = 72;
const HINT_BLINK_MS = HINT_BLINK_FRAMES * 1000 / 60;
// Finish the cycle containing the five-second deadline at full transparency.
const OPERATION_HINT_END_MS = Math.ceil(5000 / HINT_BLINK_MS) * HINT_BLINK_MS;
const FILTERS = {
  WEAPONS: [
    { symbol: 'sword', image: 'WFilter_Sword', types: [1, 2] },
    { symbol: 'bow', image: 'WFilter_Bow', types: [3] },
    { symbol: 'staff', image: 'WFilter_Staff', types: [4, 5, 6, 7] }
  ],
  ARMORS: [
    { symbol: 'offensive', image: 'AFilter_Offensive', tag: /<\s*Loot\s*Pool\s*:\s*OffensiveGear\s*>/i },
    { symbol: 'support', image: 'AFilter_Support', tag: /<\s*Loot\s*Pool\s*:\s*SupportGear\s*>/i },
    { symbol: 'servant', image: 'AFilter_Servant', tag: /<\s*Loot\s*Pool\s*:\s*ServantGear\s*>/i }
  ]
};

function createEquipTextGlow() {
  return new PIXI.filters.GlowFilter({
    distance: 6, outerStrength: 3, innerStrength: 0,
    color: 0x000000, quality: 0.2
  });
}

function wrapInstructionLines(bitmap, text, width) {
  const lines = [];
  for (const paragraph of String(text).split(/\r?\n/)) {
    let line = '';
    // Wrap space-delimited words as a whole, including accented letters and
    // combining marks. CJK characters still provide individual break points.
    const tokens = paragraph.match(/\s+|[^\s\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+|./gu) || [];
    for (const token of tokens) {
      if (!line && /^\s+$/u.test(token)) continue;
      if (line && bitmap.measureTextWidth(line + token) > width) {
        lines.push(line.trimEnd());
        line = '';
        if (/^\s+$/u.test(token)) continue;
      }
      if (bitmap.measureTextWidth(token) <= width) {
        line += token;
      } else {
        for (const character of token) {
          if (line && bitmap.measureTextWidth(line + character) > width) {
            lines.push(line);
            line = '';
          }
          line += character;
        }
      }
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

function Window_EquipSceneHelp() {
  this.initialize.apply(this, arguments);
}

Window_EquipSceneHelp.prototype = Object.create(Window_Help.prototype);
Window_EquipSceneHelp.prototype.constructor = Window_EquipSceneHelp;

Window_EquipSceneHelp.prototype.initialize = function() {
  const layout = LAYOUT;
  Window_Help.prototype.initialize.call(this,
    new Rectangle(layout.x + layout.helpX, layout.y + layout.helpY, layout.helpWidth, layout.helpHeight));
  this.opacity = 0;
  this.openness = 0;
  this._descriptionY = layout.bodyY;
  this._descriptionHeight = layout.bodyHeight;
  this._descriptionWidth = this.innerWidth - layout.bodyRightInset;
  this._scrollBitmapHeight = 0;
  this._descriptionMask = new PIXI.Graphics();
  this._descriptionMask.beginFill(0xffffff);
  this._descriptionMask.drawRect(0, this._descriptionY,
    this._descriptionWidth, this._descriptionHeight);
  this._descriptionMask.endFill();
  this._clientArea.addChild(this._descriptionMask);
  this._contentsSprite.mask = this._descriptionMask;
  this._fixedTitleSprite = new Sprite();
  this._clientArea.addChild(this._fixedTitleSprite);
  this.resetAutoScroll();
};

Window_EquipSceneHelp.prototype.contentsHeight = function() {
  return Math.max(this.innerHeight, this._scrollBitmapHeight || 0);
};

// Wrap while the installed text engine processes the string. Soft line breaks
// retain its current font, color and emphasis, and use the same path when
// measuring and drawing. Existing source newlines and relative PX/PY survive.
Window_EquipSceneHelp.prototype.createTextState = function(text, x, y, width) {
  const state = Window_Base.prototype.createTextState.call(this, text, x, y, width);
  state._mseWrap = this._mseWrapping && !this.drill_COWA_isCalculating();
  state._mseWordEnd = 0;
  return state;
};

Window_EquipSceneHelp.prototype.wrapBefore = function(state, width) {
  if (!state._mseWrap) return;
  const used = Math.abs(state.x - state.startX) + this.textWidth(state.buffer);
  if (used > 0 && used + width > this._descriptionWidth) {
    this.flushTextState(state);
    this.processNewLine(state);
    state._mseSoftLineStart = true;
  }
};

Window_EquipSceneHelp.prototype.processCharacter = function(state) {
  if (state._mseWrap && state.index >= state._mseWordEnd) {
    const rest = state.text.slice(state.index);
    const character = String.fromCodePoint(rest.codePointAt(0));
    if (character.charCodeAt(0) >= 0x20 && !/\s/u.test(character)) {
      const cjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(character);
      const word = cjk ? null : /^(?:[+-]?\d+(?:[./]\d+)*%?|[\p{L}\p{N}_]+(?:['’.-][\p{L}\p{N}_]+)*)/u.exec(rest);
      let token = word ? word[0] : character;
      let width = this.textWidth(token);
      // A single oversized word can still break by character.
      if (width > this._descriptionWidth) {
        token = character;
        width = this.textWidth(token);
      }
      this.wrapBefore(state, width);
      state._mseWordEnd = state.index + token.length;
      state._mseSoftLineStart = false;
    } else if (state._mseSoftLineStart && /[^\S\r\n]/u.test(character)) {
      state.index += character.length;
      return;
    }
  }
  Window_Base.prototype.processCharacter.call(this, state);
};

Window_EquipSceneHelp.prototype.processDrawIcon = function(iconIndex, state) {
  // Drill_DialogSpecialCharSize is enabled with font-sized inline icons.
  this.wrapBefore(state, this.contents.fontSize + 4);
  state._mseSoftLineStart = false;
  Window_Base.prototype.processDrawIcon.call(this, iconIndex, state);
};

Window_EquipSceneHelp.prototype.processDrawBigImage = function(id, state, offsetX, offsetY) {
  this.wrapBefore(state, id === 10 ? DrillUp.g_DTBI_bitmaps[9].width : 32);
  state._mseSoftLineStart = false;
  Window_Base.prototype.processDrawBigImage.call(this, id, state, offsetX, offsetY);
};

// A leading FR/FS applies before any visible glyph on the line. Counting the
// previous line's larger font creates artificial gaps in the narrow panel.
Window_EquipSceneHelp.prototype.calcTextHeight = function(state) {
  const originalSize = this.contents.fontSize;
  const baseSize = this.standardFontSize();
  const line = state.text.slice(state.index).split('\n')[0];
  const tokens = /\x1b([A-Za-z]+|[^\r\n])(?:\[([^\]]*)\])?|([^\x1b]+)/g;
  let largest = 0;
  let token;
  try {
    while ((token = tokens.exec(line))) {
      if (token[3] !== undefined) {
        if (/\S/.test(token[3])) largest = Math.max(largest, this.contents.fontSize);
      } else {
        const code = token[1].toUpperCase();
        if (code === 'FS') this.contents.fontSize = Number(token[2]) || baseSize;
        else if (code === 'FR') this.contents.fontSize = baseSize;
        else if (code === '{') this.makeFontBigger();
        else if (code === '}') this.makeFontSmaller();
        else if (code === 'DIMG') largest = Math.max(largest, 24);
        else if (code === 'I') largest = Math.max(largest, this.contents.fontSize);
      }
    }
    return (largest || this.contents.fontSize) + 8;
  } finally {
    this.contents.fontSize = originalSize;
  }
};

Window_EquipSceneHelp.prototype.drawFixedTitle = function(text) {
  const previous = this._fixedTitleSprite.bitmap;
  this._fixedTitleSprite.bitmap = null;
  if (previous) previous.destroy();
  this._drill_DFF_activeFont = null;
  const size = text ? this.textSizeEx(text) : { width: 0, height: 0 };
  const bitmap = new Bitmap(Math.max(this.innerWidth, Math.ceil(size.width)), LAYOUT.titleHeight);
  const bodyBitmap = this.contents;
  this._fixedTitleSprite.bitmap = bitmap;
  // Keep long localized equipment names on the fixed title line.
  this._fixedTitleSprite.scale.x = Math.min(1, this.innerWidth / bitmap.width);
  this.contents = bitmap;
  try {
    if (text) this.drawTextEx(text, 0, 0);
  } finally {
    this.contents = bodyBitmap;
    this._drill_DFF_activeFont = null;
    this.resetFontSettings();
  }
};

Window_EquipSceneHelp.prototype.refresh = function() {
  const lines = String(this._text || '').split(/\r?\n/);
  const title = lines.shift() || '';
  const body = lines.join('\n');
  this.resetAutoScroll();
  this._drill_DFF_activeFont = null;
  this._mseWrapping = true;
  try {
    const bodyHeight = body ? Math.ceil(this.textSizeEx(body).height) : 0;
    this._scrollBitmapHeight = this._descriptionY + bodyHeight;
    if (this.contents.height !== this.contentsHeight()) this.createContents();
    this.contents.clear();
    if (body) this.drawTextEx(body, 0, this._descriptionY);
    this._scrollMax = Math.max(0, bodyHeight - this._descriptionHeight);
  } finally {
    this._mseWrapping = false;
  }
  this.drawFixedTitle(title);
};

Window_EquipSceneHelp.prototype.resetAutoScroll = function() {
  this._scrollOffset = 0;
  this._scrollDirection = 1;
  this._scrollWait = 0;
  if (this.origin) this.origin.y = 0;
  if (this._contentsSprite) this._contentsSprite.y = 0;
};

Window_EquipSceneHelp.prototype.open = function() {
  if (!this.isOpen()) this.resetAutoScroll();
  if (!this._textGlowFilter) {
    this._plainClientFilters = this._clientArea.filters;
    this._textGlowFilter = createEquipTextGlow();
    // Title, body and inline icons share the glow; the panel is outside this layer.
    this._clientArea.filters = [this._textGlowFilter];
  }
  Window_Help.prototype.open.call(this);
};
Window_EquipSceneHelp.prototype.releaseTextGlow = function() {
  if (!this._textGlowFilter) return;
  this._clientArea.filters = this._plainClientFilters;
  const renderer = Graphics.app && Graphics.app.renderer;
  if (renderer && renderer.shader && renderer.shader.shader === this._textGlowFilter) {
    renderer.shader.reset();
  }
  this._textGlowFilter.destroy();
  this._textGlowFilter = null;
  this._plainClientFilters = null;
};
Window_EquipSceneHelp.prototype.close = function() {
  this.releaseTextGlow();
  Window_Help.prototype.close.call(this);
};

Window_EquipSceneHelp.prototype.update = function() {
  Window_Help.prototype.update.call(this);
  this.updateAutoScroll();
};

Window_EquipSceneHelp.prototype.updateAutoScroll = function() {
  if (!this.isOpen() || !(this._scrollMax > 0)) return;
  if (this._scrollWait > 0) {
    this._scrollWait--;
    return;
  }
  this._scrollOffset += 0.5 * this._scrollDirection;
  if (this._scrollOffset >= this._scrollMax) {
    this._scrollOffset = this._scrollMax;
    this._scrollDirection = -1;
    this._scrollWait = 90;
  } else if (this._scrollOffset <= 0) {
    this._scrollOffset = 0;
    this._scrollDirection = 1;
    this._scrollWait = 90;
  }
  this._contentsSprite.y = -Math.round(this._scrollOffset);
};

Window_EquipSceneHelp.prototype.destroy = function(options) {
  this.releaseTextGlow();
  if (this._fixedTitleSprite && this._fixedTitleSprite.bitmap) {
    this._fixedTitleSprite.bitmap.destroy();
    this._fixedTitleSprite.bitmap = null;
  }
  Window_Help.prototype.destroy.call(this, options);
};

    // Scene-owned hover renderer adapted from Saikey_HoverWindow's tiled renderer.
    // It creates no picture/event beans, scene hooks, document listeners or save data.
    const HOVER_SETTINGS = (() => {
        // The map bindings inherit these values from Saikey_HoverWindow. Read
        // its configuration only; this scene owns its renderer and input logic.
        const params = PluginManager.parameters('Saikey_HoverWindow');
        return { fontSize: Number(params['Font Size'] || 16),
            offsetX: Number(params['Offset X'] || 18), offsetY: Number(params['Offset Y'] || 18),
            minWidth: 450, maxWidth: 500, minHeight: 450, maxHeight: 850,
            updateIntervalPC: Math.max(1, Number(params['Update Interval PC'] || 2)),
            updateIntervalMobile: Math.max(1, Number(params['Update Interval Mobile'] || 4)) };
    })();
    // Exact visual options shared by ex_playerWeaponImage/ex_playerArmorImage.
    const HOVER_DEFAULT_STYLE = { ...HOVER_SETTINGS, paddingBottom: 100, textDisplayWidth: 0,
        textDisplayHeight: 850, fixedLineCount: 1, decoration: 'Gemini', textColor: '#ffffff' };
    function HOVER_parseBoolean(value) { return value === true || String(value).toLowerCase() === 'true'; }

    const HOVER_layoutCache = new Map();
    const HOVER_LAYOUT_CACHE_ENTRIES = 64, HOVER_LAYOUT_CACHE_CHARS = 262144;
    let HOVER_layoutCacheChars = 0, HOVER_layoutCacheProfile = null;
    const HOVER_layoutCacheCounters = { hits: 0, misses: 0, bypasses: 0, evictions: 0 };
    function HOVER_clearLayoutCache() {
        HOVER_layoutCache.clear();
        HOVER_layoutCacheChars = 0;
        for (const key of Object.keys(HOVER_layoutCacheCounters)) HOVER_layoutCacheCounters[key] = 0;
    }
    function HOVER_rememberLayout(key, layout) {
        const chars = key.length + JSON.stringify(layout).length;
        if (chars > HOVER_LAYOUT_CACHE_CHARS) return;
        while (HOVER_layoutCache.size >= HOVER_LAYOUT_CACHE_ENTRIES || HOVER_layoutCacheChars + chars > HOVER_LAYOUT_CACHE_CHARS) {
            const oldest = HOVER_layoutCache.keys().next().value;
            HOVER_layoutCacheChars -= HOVER_layoutCache.get(oldest).chars;
            HOVER_layoutCache.delete(oldest);
            HOVER_layoutCacheCounters.evictions++;
        }
        HOVER_layoutCache.set(key, { layout, chars });
        HOVER_layoutCacheChars += chars;
    }
    // Text inset is 30px on all sides, excluding the 15px outer glow.
    const HOVER_TILE_PADDING = 45; // 15px glow + 30px left/right/top
    const HOVER_TILE_DECORATION_PADDING = 35; // ornament keeps its original 20px inset
    function HOVER_tileBitmap(name) {
        // Use MZ's decrypt/load lifecycle and shared system-image cache. Sprite
        // and TilingSprite update their frames when the source image is ready.
        const bitmap = ImageManager.loadBitmap('img/system/Saikey_HoverWindow/', name);
        bitmap.smooth = false;
        return bitmap;
    }
    function HOVER_tileSize(requested, base, min, max) {
        if (requested <= min) return min;
        return Math.min(max, Math.max(min, base + Math.ceil((requested - base) / 20) * 20));
    }

    const HOVER_SCROLL_SPEED = 0.5;
    const HOVER_SCROLL_PAUSE = 90;

    const HOVER_AUTO_WRAP_UNIT_REGEX = /\\[A-Za-z]+\[[^\]]*\]|\\[A-Za-z]+|\\[{}]|\\.|[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]|[^\s\\\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]+|\s+/gu;

    class Window_EquipSceneHover extends Window_Base {
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

        get innerHeight() {
            const style = this._bean ? this._bean._style : HOVER_DEFAULT_STYLE;
            return Math.max(0, this.height - HOVER_TILE_PADDING - 15 - this.textPaddingBottom(style));
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
            return Utils.isMobileDevice() ? HOVER_SETTINGS.updateIntervalMobile : HOVER_SETTINGS.updateIntervalPC;
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

        standardPadding() { return HOVER_TILE_PADDING; }

        updatePadding() { this.padding = HOVER_TILE_PADDING; }

        // Avoid refreshing the hidden native skin on each resize.
        _refreshBack() {}
        _refreshFrame() {}

        createTileBackground() {
            this._bgSprite = new Sprite();
            this.addChildAt(this._bgSprite, 0);
            this._tileParts = [];
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 3; col++) {
                    const bitmap = HOVER_tileBitmap('nine/' + row + col);
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
            this.contents.fontSize = bean ? Number(bean._style.fontSize || HOVER_SETTINGS.fontSize) : HOVER_SETTINGS.fontSize;
        }

        updateTextGlow() {
            const style = this._bean ? this._bean._style : {};
            const enabled = style.textGlow == null || HOVER_parseBoolean(style.textGlow);
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
        // 可在某个 bean 的 _style.textColor，或全局 HOVER_SETTINGS.textColor 里覆盖；\c[n] 彩色转义不受影响。
        resetTextColor() {
            this.changeTextColor(this.saikeyDefaultTextColor());
        }
        saikeyDefaultTextColor() {
            const style = this._bean ? this._bean._style : null;
            return String((style && style.textColor) || HOVER_SETTINGS.textColor || "#ffffff");
        }

        lineHeight() {
            return Math.max(this.contents ? this.contents.fontSize + 8 : HOVER_SETTINGS.fontSize + 8, 28);
        }

        update() {
            Window_Base.prototype.update.call(this);
            this.updateTargetBean();
            this.updatePlacement();
            this.updateTextAutoScroll();
        }

        // The owning equipment scene supplies the hovered item. Never read map beans.
        updateTargetBean() {}

        showItem(item, slotRect = {}) {
            if (!item) {
                this.hide();
                this._equipItem = null;
                this._bean = null;
                return;
            }
            this._equipHoverRect = slotRect;
            const key = String(slotRect.refreshKey == null ? '' : slotRect.refreshKey);
            if (item !== this._equipItem || key !== this._equipRefreshKey || !this.visible) {
                this._equipItem = item;
                this._equipRefreshKey = key;
                const tl = typeof QJ !== 'undefined' && QJ.MPMZ && QJ.MPMZ.tl;
                let text = '';
                if (tl && DataManager.isItem(item) && typeof tl.ex_playerSetItemDescription === 'function') {
                    text = tl.ex_playerSetItemDescription(item, { separatorLine: true });
                } else if (tl && typeof tl.ex_playerSetEquipmentDescription === 'function') {
                    text = tl.ex_playerSetEquipmentDescription(item, { separatorLine: true });
                }
                if (!text) text = String(item.name || '') + '\n' + String(item.description || '');
                const lines = Array.isArray(text) ? text.map(String) : String(text).split(/\r?\n/);
                this.setBean({
                    _style: { ...HOVER_DEFAULT_STYLE, ...(slotRect.hoverStyle || {}) },
                    _contextSerial: {},
                    evaluateTextNow() {},
                    textLines() { return lines; }
                });
            } else {
                this.show();
            }
            this.updatePlacement();
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
                ? Number(this._bean._style.fontSize || HOVER_SETTINGS.fontSize) : HOVER_SETTINGS.fontSize;
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
            const data = style || HOVER_DEFAULT_STYLE;
            const value = Number(data.textDisplayHeight);
            return Number.isFinite(value) && value > 0
                ? value
                : HOVER_DEFAULT_STYLE.textDisplayHeight;
        }

        textPaddingBottom(style) {
            const raw = (style || HOVER_DEFAULT_STYLE).paddingBottom;
            const value = Number(raw);
            return raw == null || !Number.isFinite(value) ? 30 : Math.max(0, value);
        }

        textDisplayWidth(style) {
            const value = Number((style || HOVER_DEFAULT_STYLE).textDisplayWidth);
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
            HOVER_AUTO_WRAP_UNIT_REGEX.lastIndex = 0;
            let match = null;
            while ((match = HOVER_AUTO_WRAP_UNIT_REGEX.exec(source))) {
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
            const value = Math.floor(Number((style || HOVER_DEFAULT_STYLE).fixedLineCount) || 0);
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
            if (!HOVER_layoutCacheProfile || profile.some((fn, i) => fn !== HOVER_layoutCacheProfile[i])) {
                HOVER_clearLayoutCache();
                HOVER_layoutCacheProfile = profile;
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
                this.textPaddingBottom(style),
                this.separatorStyle().gap, this.separatorStyle().thickness]);
        }

        hoverLayout(lines, style) {
            const key = this.layoutCacheKey(lines, style);
            if (key !== null && HOVER_layoutCache.has(key)) {
                const entry = HOVER_layoutCache.get(key);
                HOVER_layoutCache.delete(key);
                HOVER_layoutCache.set(key, entry);
                HOVER_layoutCacheCounters.hits++;
                return entry.layout;
            }
            if (key === null) HOVER_layoutCacheCounters.bypasses++;
            else HOVER_layoutCacheCounters.misses++;
            const layout = this.calculateHoverLayout(lines, style);
            if (key !== null) HOVER_rememberLayout(key, layout);
            return layout;
        }

        calculateHoverLayout(lines, style) {
            const verticalPadding = HOVER_TILE_PADDING + 15 + this.textPaddingBottom(style);
            const finitePositive = (value, fallback) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
            const screenWidth = Graphics.boxWidth;
            const screenHeight = Graphics.boxHeight;
            const widthLimit = Math.max(99, Math.floor(Math.min(screenWidth,
                Math.max(159, finitePositive(style.maxWidth, HOVER_SETTINGS.maxWidth)))));
            const heightLimit = Math.max(97, Math.floor(Math.min(screenHeight,
                Math.max(97, finitePositive(style.maxHeight, HOVER_SETTINGS.maxHeight)))));
            const minWidth = Math.min(widthLimit, Math.ceil(Math.max(159,
                finitePositive(style.minWidth, finitePositive(style.tileMinWidth, HOVER_SETTINGS.minWidth)))));
            const minHeight = Math.min(heightLimit, Math.ceil(Math.max(97,
                finitePositive(style.minHeight, finitePositive(style.tileMinHeight, HOVER_SETTINGS.minHeight)))));
            const textWidth = Math.max(1, Math.min(widthLimit - HOVER_TILE_PADDING * 2, this.textDisplayWidth(style) || Infinity));
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
            const width = HOVER_tileSize(textWidthUsed + HOVER_TILE_PADDING * 2, 99, minWidth, widthLimit);
            const height = HOVER_tileSize(fixedHeight + visibleScrollingHeight + verticalPadding, 97, minHeight, heightLimit);
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
            this.padding = HOVER_TILE_PADDING;
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
                this._tileDecoration.bitmap = name ? HOVER_tileBitmap(name) : null;
                this._tileDecoration.visible = !!name;
            }
            // Bottom-right anchoring also handles async loads and different
            // image dimensions without callbacks retaining a window instance.
            this._tileDecoration.move(this.width - HOVER_TILE_DECORATION_PADDING,
                this.height - HOVER_TILE_DECORATION_PADDING);
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
            const rect = this._equipHoverRect || {};
            // Saikey's normal hover follows the live pointer, whereas its forced
            // window is anchored to the target center. These equipment bindings
            // use normal hover. MZ updates TouchInput on every mouse move, even
            // without a button held, so no global mouse listener is necessary.
            const pointer = typeof TouchInput !== 'undefined' ? TouchInput : {};
            return {
                x: Number.isFinite(rect.pointerX) ? rect.pointerX : Number.isFinite(pointer.x) ? pointer.x
                    : Number(rect.x || 0) + Number(rect.width || 0) / 2,
                y: Number.isFinite(rect.pointerY) ? rect.pointerY : Number.isFinite(pointer.y) ? pointer.y
                    : Number(rect.y || 0) + Number(rect.height || 0) / 2
            };
        }
    }

function description(item) {
  if (!item) return '';
  return window.QJ?.MPMZ?.tl?.ex_playerSetEquipmentDescription?.(item, { descriptionWidth: 368 }) || item.description || item.name || '';
}
function baseId(item) { return item ? item.baseItemId || item.id : 0; }
function isPlaceholderWeapon(item) { return !!item && DataManager.isWeapon(item) && baseId(item) === 4; }
function clearSceneInput() {
  Input.clear();
  TouchInput.clear();
  window.SLGSceneFreeExploration?.Buttons?.resetPointerCapture?.();
  // Drill keeps physical buttons separately from native TouchInput.clear().
  for (const button of ['left', 'right', 'middle']) {
    const prefix = '_drill_COI_' + button;
    if (prefix + 'Pressed' in TouchInput) TouchInput[prefix + 'Pressed'] = false;
    for (const tail of ['PressedTime', 'ReleasedTime', 'DoubledTime']) {
      if (prefix + tail in TouchInput) TouchInput[prefix + tail] = undefined;
    }
  }
}
function pointerPressed() { return TouchInput.isPressed() || !!TouchInput.drill_isLeftPressed?.(); }
function pointerTriggered() { return TouchInput.isTriggered() || !!TouchInput.drill_isLeftTriggerd?.(); }
function pointerReleased() { return TouchInput.isReleased() || !!TouchInput.drill_isLeftReleased?.(); }
function drawEquipIcon(bitmap, item, x, y, size) {
  if (!item) return;
  const sheet = ImageManager.loadSystem('IconSet_large');
  const w = 64, h = 64;
  bitmap.blt(sheet, item.iconIndex % 16 * w, Math.floor(item.iconIndex / 16) * h, w, h, x, y, size, size);
}

function Window_EquipSceneAction() { this.initialize(...arguments); }
Window_EquipSceneAction.prototype = Object.create(Window_Command.prototype);
Window_EquipSceneAction.prototype.constructor = Window_EquipSceneAction;
Window_EquipSceneAction.prototype.initialize = function(owner) {
  this._owner = owner;
  Window_Command.prototype.initialize.call(this, new Rectangle(0, 0, 544, 160));
  this.opacity = 0;
  this._labelSprite = new Sprite(new Bitmap(this.innerWidth, this.innerHeight));
  this._clientArea.addChild(this._labelSprite);
  this._actionBitmaps = ['equipItem', 'discardItem'].map(name => ImageManager.loadSystem(name));
  for (const bitmap of this._actionBitmaps) bitmap.addLoadListener(() => { if (this.contents && !this._destroyed) this.refresh(); });
  this.close();
  this.hide();
  this.deactivate();
};
Window_EquipSceneAction.prototype.makeCommandList = function() {
  const labels = {
    0: ['装备', '丢弃'], 1: ['装備', '捨てる'], 3: ['Экипировать', 'Выбросить'],
    4: ['Équiper', 'Jeter'], 5: ['Trang bị', 'Vứt bỏ'], 12: ['裝備', '丟棄']
  }[ConfigManager.language]
    || ['Equip', 'Discard'];
  this.addCommand(labels[0], 'equip', !!this._owner?.canEquip(this._owner._actionItem, this._owner._slotIndex));
  this.addCommand(labels[1], 'discard', !!this._owner?.canDiscard(this._owner._actionItem));
};
Window_EquipSceneAction.prototype.maxCols = function() { return 2; };
Window_EquipSceneAction.prototype.itemHeight = function() { return 136; };
Window_EquipSceneAction.prototype.drawItemBackground = function() {};
Window_EquipSceneAction.prototype.drawItem = function(index) {
  const rect = this.itemRect(index);
  const bitmap = this._actionBitmaps?.[index];
  if (bitmap?.isReady()) {
    const width = bitmap.width;
    const height = bitmap.height;
    this.contents.blt(bitmap, 0, 0, bitmap.width, bitmap.height,
      Math.round(rect.x + (rect.width - width) / 2), Math.round(rect.y + 8 + (81 - height) / 2), width, height);
  }
  if (this._labelSprite) {
    this.resetFontSettings();
    const text = this._labelSprite.bitmap;
    text.fontFace = this.contents.fontFace;
    text.fontSize = 28;
    text.textColor = '#b7b6b6';
    text.drawText(this.commandName(index), rect.x, rect.y + 93, rect.width, this.lineHeight(), 'center');
  }
};
Window_EquipSceneAction.prototype.refresh = function() {
  if (this._labelSprite) this._labelSprite.bitmap.clear();
  Window_Command.prototype.refresh.call(this);
};
Window_EquipSceneAction.prototype.releaseTextGlow = function() {
  if (!this._textGlowFilter) return;
  this._labelSprite.filters = null;
  const renderer = Graphics.app && Graphics.app.renderer;
  if (renderer && renderer.shader && renderer.shader.shader === this._textGlowFilter) renderer.shader.reset();
  this._textGlowFilter.destroy();
  this._textGlowFilter = null;
};
Window_EquipSceneAction.prototype.close = function() {
  this.releaseTextGlow();
  Window_Command.prototype.close.call(this);
};
Window_EquipSceneAction.prototype.destroy = function(options) {
  this._destroyed = true;
  this.releaseTextGlow();
  if (this._labelSprite) {
    this._labelSprite.bitmap.destroy();
    this._labelSprite.bitmap = null;
  }
  Window_Command.prototype.destroy.call(this, options);
};
Window_EquipSceneAction.prototype.drill_MCu_cursorEnabled = function() { return false; };
Window_EquipSceneAction.prototype.setup = function() {
  if (!this._textGlowFilter) {
    this._textGlowFilter = new PIXI.filters.GlowFilter({
      distance: 6, outerStrength: 3, innerStrength: 0, color: 0x000000, quality: 0.2
    });
    this._labelSprite.filters = [this._textGlowFilter];
  }
  this.refresh();
  this.select(0);
  this.show();
  this.open();
  this.activate();
};

class Window_EquipSceneGrid extends Window_Selectable {
  initialize(owner) {
    this._owner = owner;
    this._data = [];
    this._filter = null;
    super.initialize(new Rectangle(LAYOUT.x + LAYOUT.listCenterX - LAYOUT.listWidth / 2,
      LAYOUT.y + LAYOUT.listY, LAYOUT.listWidth, LAYOUT.rows * LAYOUT.cellHeight + 24));
    // Drill normally switches styles after the first child update has consumed
    // its position refresh. Choose our style before readiness and first render.
    if (this._drill_MSB_sprite) {
      this._drill_MSB_sprite.drill_MSB_changeStyle(this.drill_MSB_scrollBarStyleId());
      this._drill_MSB_needRefresh = true;
    }
    this.opacity = 0;
    this.openness = 255;
    this.activate();
  }
  maxCols() { return LAYOUT.columns; }
  maxItems() { return this._data.length; }
  itemHeight() { return LAYOUT.cellHeight; }
  itemWidth() { return Math.floor(this.innerWidth / this.maxCols()); }
  itemRect(index) {
    const width = this.itemWidth();
    return new Rectangle((this.innerWidth - width * this.maxCols()) / 2 + index % this.maxCols() * width - this.scrollBaseX(),
      Math.floor(index / this.maxCols()) * this.itemHeight() - this.scrollBaseY(), width, this.itemHeight());
  }
  itemIconRect(index) {
    const r = this.itemRect(index);
    return new Rectangle(r.x + (r.width - 64) / 2, r.y + LAYOUT.iconY, 64, 64);
  }
  item() { return this._data[this.index()] || null; }
  refresh() {
    const weapon = this._owner._slotIndex === 0;
    const rules = FILTERS[weapon ? 'WEAPONS' : 'ARMORS'];
    const rule = rules.find(r => r.symbol === this._filter);
    this._data = this._owner.inventoryItems().filter(item => {
      if (!(weapon ? DataManager.isWeapon(item) : DataManager.isArmor(item))) return false;
      if (!rule) return true;
      const base = (weapon ? $dataWeapons : $dataArmors)[baseId(item)] || item;
      return weapon ? rule.types.includes(base.wtypeId) : rule.tag.test(base.note || '');
    });
    super.refresh();
  }
  isCurrentItemEnabled() { return this._owner.canEquip(this.item(), this._owner._slotIndex) || this._owner.canDiscard(this.item()); }
  drawItemBackground() {}
  drawItem(index) {
    const item = this._data[index], r = this.itemIconRect(index);
    if (!item || item === this._draggedItem) return;
    this.changePaintOpacity(this._owner.canEquip(item, this._owner._slotIndex));
    drawEquipIcon(this.contents, item, r.x, r.y, 64);
    if ($gameSwitches.value(444) && DataManager.isWeapon(item) && item.durMax > 0) {
      const rate = Math.floor((item.durability || 0) / item.durMax * 100);
      this.contents.fontSize = 14;
      this.contents.textColor = rate > 40 ? '#ffffff' : rate > 20 ? '#ffcfd7' : '#ff738a';
      this.contents.drawText(rate + '%', r.x, r.y + 46, 64, 18, 'right');
      this.resetFontSettings();
    }
    this.changePaintOpacity(true);
  }
  updateHelp() { this._helpWindow?.setText(description(this.item())); }
  // This scene owns pointer gestures. No ItemList/PEZ swipe, map touch or Drill cursor.
  processTouch() {}
  processWheelScroll() {
    if (!this.isOpenAndActive() || !this.isTouchedInsideFrame() || !this.maxItems() || Math.abs(TouchInput.wheelY) < 20) return;
    const next = Math.max(0, Math.min(this.maxItems() - 1,
      Math.max(0, this.index()) + (TouchInput.wheelY > 0 ? this.maxCols() : -this.maxCols())));
    if (next !== this.index()) { this.forceSelect(next); SoundManager.playCursor(); }
  }
  processScroll() { if (!this._owner._gesture) super.processScroll(); }
  isTouchScrollEnabled() { return false; }
  drill_MCu_cursorEnabled() { return false; }
  drill_MSB_scrollBarEnabled() { return true; }
  drill_MSB_scrollBarStyleId() { return 2; }
  drill_MCB_borderEnabled() { return false; }
  _updateCursor() { this._cursorSprite.visible = false; }
  iconIndexAt(x, y) {
    const local = this.worldTransform.applyInverse(new Point(x, y));
    const cx = local.x - this.padding + this.origin.x, cy = local.y - this.padding + this.origin.y;
    if (local.x < this.padding || local.x >= this.width - this.padding || local.y < this.padding || local.y >= this.height - this.padding) return -1;
    const first = this.topIndex(), end = Math.min(this.maxItems(), first + this.maxVisibleItems());
    for (let i = first; i < end; i++) if (this.itemIconRect(i).contains(cx, cy)) return i;
    return -1;
  }
}

class Scene_StandaloneEquip extends Scene_Base {
  beginEquipSession() {
    const actor = this._actor;
    const slots = actor.equipSlots().slice();
    const initial = actor.equips().slice();
    const stock = new Map($gameParty.allItems()
      .filter(item => DataManager.isWeapon(item) || DataManager.isArmor(item))
      .map(item => [item, $gameParty.numItems(item)]));
    const total = new Map(stock);
    for (const item of initial) if (item) {
      if (!stock.has(item)) stock.set(item, $gameParty.numItems(item));
      total.set(item, (total.get(item) || 0) + 1);
    }
    // Copy only the actor once. Game_Item still resolves the original database
    // instances; no map, party, item database, or global reference is replaced.
    const view = JsonEx.makeDeepCopy(actor);
    view._equips = initial.map(item => new Game_Item(item));
    // In this project rebuilding passive states executes custom Apply/Remove
    // scripts, and some passive conditions themselves write global data. Keep
    // the entry cache for permission queries; never refresh this preview actor.
    view._passiveStatesRaw = (actor._passiveStatesRaw || []).slice();
    view._processingPassiveApply = true;
    this._session = { actor, view, initial, slots, stock, total, drops: [],
      map: $gameMap, mapId: $gameMap.mapId(), consumed: false, virtualFists: null };
    this._inventoryRevision = 0;
    this._actor = view;
  }
  equipmentSlots() { return this._session.slots; }
  inventoryCount(item) {
    const session = this._session;
    if (!item || isPlaceholderWeapon(item)) return 0;
    return (session.total.get(item) || 0)
      - this._actor.equips().filter(equip => equip === item).length
      - session.drops.filter(drop => drop === item).length;
  }
  inventoryItems() {
    const mode = getSortMode();
    return Array.from(this._session.total.keys()).filter(item => this.inventoryCount(item) > 0)
      .sort((a, b) => Number(DataManager.isArmor(a)) - Number(DataManager.isArmor(b)) ||
        (mode === 'instanceDesc' ? b.id - a.id : mode === 'instanceAsc' ? a.id - b.id :
          $gameParty.independentItemSort(a, b) || a.id - b.id));
  }
  equipmentDifference(before, after) {
    const remaining = after.map((item, slot) => ({ item, slot })).filter(entry => entry.item);
    const removed = [];
    before.forEach((item, slot) => {
      if (!item) return;
      const match = remaining.findIndex(entry => entry.item === item);
      if (match < 0) removed.push({ item, slot });
      else remaining.splice(match, 1);
    });
    return { removed, added: remaining };
  }
  previewFists() {
    const current = this._actor.equips()[0];
    if (isPlaceholderWeapon(current)) return current;
    const available = Array.from(this._session.total.keys()).find(item =>
      isPlaceholderWeapon(item) && !this._actor.equips().includes(item));
    if (available) return available;
    // Do not run YEP OnCreation/OnGain or allocate an independent item while
    // trying on gear. Resolve this database token only if it survives to exit.
    this._session.virtualFists = $dataWeapons[4];
    return this._session.virtualFists;
  }
  applyEquipPreview(slot, item) {
    const before = this._actor.equips().slice();
    this._actor._equips[slot].setObject(item);
    // The current database has fixed actor-defined slots. Use the entry layout;
    // NRP equipSlots()/refresh() can trade items with the real party and must
    // never run on the preview actor.
    for (let pass = 0; pass < this.equipmentSlots().length; pass++) {
      let changed = false;
      this._actor.equips().forEach((equip, index) => {
        if (equip && (equip.etypeId !== this.equipmentSlots()[index] || !this._actor.canEquip(equip))) {
          this._actor._equips[index].setObject(null);
          changed = true;
        }
      });
      if (!changed) break;
    }
    return this.afterEquipChange(before, slot);
  }
  validateEquipSession() {
    const session = this._session;
    if ($gameMap !== session.map || $gameMap.mapId() !== session.mapId || $gameParty.leader() !== session.actor) {
      throw new Error('Equipment session no longer belongs to the current map/actor.');
    }
    const actual = session.actor.equips();
    if (actual.length !== session.initial.length || actual.some((item, i) => item !== session.initial[i])) {
      throw new Error('Equipment changed outside the equipment preview.');
    }
    for (const [item, count] of session.stock) {
      if ($gameParty.numItems(item) !== count || this.inventoryCount(item) < 0) {
        throw new Error('Equipment inventory changed outside the preview: ' + item.id);
      }
    }
  }
  commitEquipSession() {
    const session = this._session;
    if (!session || session.consumed) return;
    const scene = SceneManager._scene;
    if (!(scene instanceof Scene_Map) || !scene._spriteset || !scene._mapLoaded) {
      throw new Error('Equipment can only be committed after the returning map is ready.');
    }
    this.validateEquipSession();
    session.consumed = true; // Never replay partially executed custom scripts.
    const actor = session.actor;
    const final = this._actor.equips().slice();
    if (session.virtualFists && final.includes(session.virtualFists)) {
      const base = session.virtualFists;
      const existing = new Set($gameParty.allItems());
      $gameParty.gainItem(base, 1);
      // A previously owned fist may be queued for discard and still physically
      // in the party until commit. Resolve only the newly created instance.
      const real = DataManager.isIndependent(base) ? $gameParty.allItems().find(item =>
        !existing.has(item) && DataManager.isWeapon(item) && baseId(item) === 4) : base;
      if (!real || !$gameParty.hasItem(real, false)) throw new Error('Could not create the final unarmed weapon.');
      final[final.indexOf(base)] = real;
    }
    const delta = this.equipmentDifference(session.initial, final);
    const changedSlots = final.map((item, index) => item !== session.initial[index] ? index : -1).filter(index => index >= 0);
    this._committing = true;
    try {
      if (changedSlots.length) {
        // Install the complete confirmed outfit once. Calling changeEquip for
        // each slot would expose intermediate sets and rerun WAY's per-slot Eval.
        actor._equips = final.map(item => new Game_Item(item));
        actor._oldSlots = session.slots.slice();
        const trades = new Map();
        for (const { item } of delta.removed) trades.set(item, (trades.get(item) || 0) + 1);
        for (const { item } of delta.added) trades.set(item, (trades.get(item) || 0) - 1);
        // An unarmed placeholder is replaced, not returned to usable inventory.
        for (const [item, count] of trades) if (count > 0 && !isPlaceholderWeapon(item)) $gameParty.gainItem(item, count, false);
        for (const [item, count] of trades) if (count < 0) $gameParty.loseItem(item, -count, false);
      }
      // Settle discarded inventory before custom scripts can select equipment
      // from the bag. The native handler retains its instance metadata and rules.
      for (const item of session.drops) {
        this.discard(item);
        this.syncMapEquipEvents();
      }
      if (changedSlots.length) {
        const run = (item, type) => {
          try { WAY_CustomOnEquipEval.evalCode(actor, item, type); }
          finally { this.syncMapEquipEvents(); }
        };
        this.syncMapEquipEvents();
        for (const { item, slot } of delta.removed) {
          try { QJ.MPMZ.tl.ex_playerUnequippingSpecialEffects?.(slot, item); }
          finally { this.syncMapEquipEvents(); }
          run(item, 'customOnRemoveEquipEval');
        }
        for (const { item } of delta.added) {
          if (actor.equips().includes(item)) run(item, 'customOnEquipEval');
        }
        actor.refresh();
      }
      // Remove legacy bag placeholders and any returned by native nested Evals.
      // Keep equipped instances intact and use the party's normal inventory API.
      for (const item of $gameParty.weapons()) if (isPlaceholderWeapon(item)) {
        $gameParty.loseItem(item, $gameParty.numItems(item), false);
      }
      this.syncMapEquipEvents();
      const actual = actor.equips();
      actual.forEach((item, index) => {
        if (item !== session.initial[index]) $gameMap.steupCEQJ?.(100, 1, { equipChange: true, equipIndex: index });
      });
    } finally {
      this._committing = false;
    }
  }
  // Drill's rendering/input methods run only on this scene. Its global menu
  // creation flag is preserved because this scene does not use MenuBase.update.
  createDrillBackButton() {
    if (this._drillBackButtonReady || typeof Scene_MenuBase === 'undefined' ||
        typeof Scene_MenuBase.prototype.drill_MBB_create !== 'function' ||
        typeof Scene_MenuBase.prototype.drill_MBB_update !== 'function') return;
    if (!this._backgroundSprite) {
      this._backgroundSprite = new Sprite();
      this.addChildAt(this._backgroundSprite, 0);
    }
    if (!this._foregroundSprite) this._foregroundSprite = new Sprite();
    this.addChild(this._foregroundSprite);
    this._drillBackPointerCaptured = false;
    this._drillBackOwnedFrame = -1;
    const hadFlag = Object.prototype.hasOwnProperty.call(SceneManager, '_drill_MBB_created');
    const previousFlag = SceneManager._drill_MBB_created;
    try {
      Scene_MenuBase.prototype.drill_MBB_create.call(this);
      this._drillBackButtonReady = true;
    } finally {
      if (hadFlag) SceneManager._drill_MBB_created = previousFlag;
      else delete SceneManager._drill_MBB_created;
    }
  }
  updateDrillBackButton() {
    if (!this._drillBackButtonReady || this._closing || !this.isActive()) return;
    // Capture before Drill tests the button. The owned frame also protects a
    // release when the caller updates Drill before its own pointer dispatcher.
    this.drillBackOwnsPointer();
    const previousUpdating = this._isUpdatingDrillBack;
    this._isUpdatingDrillBack = true;
    try {
      Scene_MenuBase.prototype.drill_MBB_update.call(this);
    } finally {
      this._isUpdatingDrillBack = previousUpdating;
      if (this._drillBackPointerCaptured && (pointerReleased() || !pointerPressed())) {
        this._drillBackOwnedFrame = Graphics.frameCount;
        this._drillBackPointerCaptured = false;
      }
    }
  }
  drillBackOwnsPointer() {
    if (!this._drillBackButtonReady) return false;
    if (this._drillBackOwnedFrame === Graphics.frameCount) return true;
    const pending = this._drill_MBB_sprites_pushdown.some(sprite => sprite._needPopScene);
    if (pending || this._drillBackPointerCaptured) {
      this._drillBackOwnedFrame = Graphics.frameCount;
      return true;
    }
    if (!pointerTriggered() || this._gesture || this._grid?._drill_MSB_isDraging) return false;
    const index = this._drill_MBB_sprites.findIndex((sprite, i) =>
      this._drill_MBB_sprites_layer[i].visible &&
      Scene_MenuBase.prototype.drill_MBB_isOnHighlight.call(this, sprite));
    if (index < 0) return false;
    this._drillBackPointerCaptured = true;
    this._drillBackOwnedFrame = Graphics.frameCount;
    return true;
  }
  resetDrillBackButton() {
    if (!this._drillBackButtonReady) return;
    // Cancelling a local action window keeps this scene alive. Clear Drill's
    // one-way pop latch so a later unrelated release cannot close the scene.
    if (this._drillBackPointerCaptured ||
        this._drill_MBB_sprites_pushdown.some(sprite => sprite._needPopScene)) {
      this._drillBackOwnedFrame = Graphics.frameCount;
    }
    this._drillBackPointerCaptured = false;
    this._drill_MBB_sprites.forEach((sprite, i) => {
      const style = this._drill_MBB_sprites_style[i];
      sprite.bitmap = style.src_bitmaps[0] || null;
      sprite.visible = true;
      const highlight = this._drill_MBB_sprites_highlight[i];
      highlight.visible = false;
      highlight._touched = false;
      const pushdown = this._drill_MBB_sprites_pushdown[i];
      pushdown.visible = false;
      pushdown._needPopScene = false;
    });
  }
  drill_MBB_layerAddSprite(sprite, layer) {
    Scene_MenuBase.prototype.drill_MBB_layerAddSprite.call(this, sprite, layer);
  }
  drill_MBB_layerAddSprite_Private(sprite, layer) {
    Scene_MenuBase.prototype.drill_MBB_layerAddSprite_Private.call(this, sprite, layer);
  }
  drill_MBB_layerRemoveSprite(sprite) {
    Scene_MenuBase.prototype.drill_MBB_layerRemoveSprite.call(this, sprite);
  }
  drill_MBB_layerRemoveSprite_Private(sprite) {
    Scene_MenuBase.prototype.drill_MBB_layerRemoveSprite_Private.call(this, sprite);
  }
  drill_MBB_sortByZIndex() {
    Scene_MenuBase.prototype.drill_MBB_sortByZIndex.call(this);
  }
  drill_MBB_sortByZIndex_Private() {
    Scene_MenuBase.prototype.drill_MBB_sortByZIndex_Private.call(this);
  }
  drill_MBB_checkKeyword(index) {
    return Scene_MenuBase.prototype.drill_MBB_checkKeyword.call(this, index);
  }
  drill_MBB_isOnHighlight(sprite) {
    return Scene_MenuBase.prototype.drill_MBB_isOnHighlight.call(this, sprite);
  }
  drill_MBB_isOnTouchSprite(sprite) {
    // Drill normally arms whenever a held pointer enters the button. Only the
    // press captured at its origin may arm it in this scene with equipment drag.
    if (!this._drillBackPointerCaptured || !pointerTriggered() ||
        this._gesture || this._grid?._drill_MSB_isDraging) return false;
    return Scene_MenuBase.prototype.drill_MBB_isOnTouchSprite.call(this, sprite);
  }

  // These methods belong inside Scene_StandaloneEquip; they change no prototypes.
  canDiscard(item) {
    if (!item || !(DataManager.isWeapon(item) || DataManager.isArmor(item)) ||
        isPlaceholderWeapon(item) || this.inventoryCount(item) < 1 || item.baseItemId === 100) return false;
    // This is the original warehouse rule, including newly spawned, frozen events.
    if ($gameMap.mapId() === 51) {
      if (typeof $gameMap.getGroupBulletListQJ !== 'function' ||
          typeof $gameMap.drill_COET_getEventsByTag_direct !== 'function') return false;
      const pending = this._session.drops.length;
      if ($gameMap.getGroupBulletListQJ('itemDrops').length + pending >= 200 ||
          $gameMap.drill_COET_getEventsByTag_direct('掉落物').length + pending >= 200) return false;
    }
    return true;
  }
  discard(item) {
    this._lastDiscardSucceeded = false;
    this._lastDiscardError = null;
    if (isPlaceholderWeapon(item)) { SoundManager.playBuzzer(); return false; }
    if (!this._committing) {
      if (!this.canDiscard(item)) { SoundManager.playBuzzer(); return false; }
      const maps = typeof $dataSpawnMapList === 'undefined' ? null : $dataSpawnMapList;
      if (!maps?.[1]?.events?.[82] || typeof window.dingk?.Loot?.playerdiscardsEquipment !== 'function' ||
          !$gamePlayer.centerRealX?.() || !$gamePlayer.centerRealY?.()) return false;
      this._session.drops.push(item);
      this._inventoryRevision++;
      this._lastDiscardSucceeded = true;
      this.refreshEquipment();
      return true;
    }
    if (!(SceneManager._scene instanceof Scene_Map) || !SceneManager._scene._spriteset) return false;
    const map = $gameMap;
    const party = $gameParty;
    const loot = window.dingk?.Loot;
    const itemType = DataManager.isWeapon(item) ? 1 : DataManager.isArmor(item) ? 2 : -1;
    const beforeCount = item ? party.numItems(item) : 0;
    if (!item || itemType < 0 || beforeCount < 1 || !party.hasItem(item, false) ||
        typeof loot?.playerdiscardsEquipment !== 'function') return false;
    // The original routine loses inventory even if its spawn helper returns early.
    // Validate those early-return prerequisites without advancing the map.
    const spawnMaps = typeof $dataSpawnMapList === 'undefined' ? null : $dataSpawnMapList;
    const x = $gamePlayer?.centerRealX?.();
    const y = $gamePlayer?.centerRealY?.();
    if (!spawnMaps?.[1]?.events?.[82] || typeof map.spawnEventQJ !== 'function' ||
        !Number.isFinite(x) || !Number.isFinite(y) || !x || !y ||
        !Array.isArray(map._events) || this._spriteset) return false;

    const beforeEvents = new Set(map._events);
    const container = party.itemContainer(item);
    if (!container) return false;
    const restoreInventory = count => {
      // This scene is paused, and only this exact inventory entry can be changed
      // by the operation. Restoring the entry also preserves independent identity
      // without running on-gain scripts or generating a replacement instance.
      if (count > 0) container[item.id] = count;
      else delete container[item.id];
      map.requestRefresh();
    };
    const removeNewDrop = event => {
      const id = event._eventId;
      if (beforeEvents.has(event) || map._events[id] !== event) return;
      // Native cleanup now has the returning map's real sprite container.
      map.clearSpawnEventQJ(id);
    };

    try {
      // Intentionally let this function handle protected gear / warehouse refusal,
      // preserving its native feedback and all project-specific discard behavior.
      loot.playerdiscardsEquipment(item);
    } catch (error) {
      this._lastDiscardError = error;
      console.warn('[StandaloneEquipScene] Original discard routine failed.', error);
    }
    const spawned = map._events.filter(event => event && !beforeEvents.has(event) &&
      event._sourceMapId === 1 && event._sourceeventId === 82);
    const drop = spawned.find(event => !event._erased &&
      event._dropItemId === item.id && event._dropItemType === itemType);

    if (!drop) {
      // A refusal or incomplete spawn leaves the original inventory instance intact.
      for (const event of spawned) removeNewDrop(event);
      if (party.numItems(item) !== beforeCount) restoreInventory(beforeCount);
      return false;
    }
    // At most one map drop may represent the one inventory item being discarded.
    for (const event of spawned) if (event !== drop) removeNewDrop(event);
    const expectedCount = beforeCount - 1;
    if (party.numItems(item) === beforeCount) {
      // An exception after assigning drop identity (e.g. a sound failure) leaves a
      // valid recoverable map event. Complete the inventory half exactly once.
      try { party.loseItem(item, 1, false); }
      catch (error) {
        this._lastDiscardError = error;
        console.warn('[StandaloneEquipScene] Discard inventory update failed.', error);
      }
    }
    if (party.numItems(item) !== expectedCount) {
      // If the operation cannot commit, remove only its unstarted drop and restore
      // the exact original entry. This prevents both duplication and disappearing gear.
      removeNewDrop(drop);
      restoreInventory(beforeCount);
      return false;
    }
    this._lastDiscardSucceeded = true;
    return true;
  }

  useParticleSystem() { return false; }
  initialize() {
    super.initialize();
    this._slotIndex = 0;
    this._gesture = null;
    this._touchMode = Utils.isMobileDevice();
    this._touchSelectedItem = null;
    this._discardAnimations = [];
    this._dragHintFrame = 0;
    this._operationHintStartedAt = null;
    this._session = null;
    this._committing = false;
    this._closing = false;
    this._underwaterBgmBeforeScene = null;
    this._hoverRevision = 0;
    this._pointerX = -1;
    this._pointerY = -1;
  }
  prepare(slotIndex = 0) { this._slotIndex = Math.max(0, Math.min(5, Number(slotIndex) || 0)); }
  create() {
    super.create();
    this._actor = $gameParty.leader();
    this.beginEquipSession();
    this._slotIndex = Math.min(this._slotIndex, this.equipmentSlots().length - 1);
    this.createBackground();
    this.createPanel();
    this.createSlots();
    this._hoverWindow = new Window_EquipSceneHover();
    this.addChild(this._hoverWindow);
    this._dragIcon = new Sprite(new Bitmap(64, 64));
    this._dragIcon.anchor.set(0.5);
    this._dragIcon.opacity = 220;
    this._dragIcon.visible = false;
    this.addChild(this._dragIcon);
    this.refreshEquipment(true);
  }
  createBackground() {
    this._backgroundSprite = new Sprite(SceneManager.backgroundBitmap());
    this._backgroundBlur = new PIXI.filters.BlurFilter(4);
    this._backgroundSprite.filters = [this._backgroundBlur];
    this.addChild(this._backgroundSprite);
    const dim = new Sprite(new Bitmap(Graphics.width, Graphics.height));
    dim.bitmap.fillAll('rgba(0,0,0,0.40)');
    this._dimSprite = dim;
    this.addChild(dim);
  }
  createPanel() {
    const background = new Sprite(ImageManager.loadSystem('rpgCommonWindowLayout'));
    background.move(LAYOUT.x, LAYOUT.y);
    this.addChild(background);
    this._decoration = new Sprite();
    this._decoration.anchor.set(0.5);
    this._decoration.move(LAYOUT.x + LAYOUT.listCenterX, LAYOUT.y + LAYOUT.decorationY);
    this._decoration.opacity = 120;
    this.addChild(this._decoration);
    this._helpWindow = new Window_EquipSceneHelp();
    this._helpWindow.setText('');
    this._helpWindow.open();
    this.addChild(this._helpWindow);
    this._grid = new Window_EquipSceneGrid(this);
    this._grid.setHelpWindow(this._helpWindow);
    this._grid.setHandler('ok', this.onGridOk.bind(this));
    this._grid.setHandler('cancel', this.popScene.bind(this));
    this.addChild(this._grid);
    this._selection = new Sprite(ImageManager.loadBitmap('img/Menu__ui/', 'equip slot cursor'));
    this._selection.anchor.set(0.5);
    this._selection.scale.set(96 / 112);
    this._selection.blendMode = PIXI.BLEND_MODES.ADD;
    this.addChildAt(this._selection, this.getChildIndex(this._grid));
    this._filterButtons = [0, 1, 2].map(i => {
      const button = new Sprite();
      button.anchor.set(0.5, 0);
      button.move(LAYOUT.x + LAYOUT.listCenterX + (i - 1) * LAYOUT.filterStep, LAYOUT.y + LAYOUT.filterY);
      this.addChild(button);
      return button;
    });
    this._countSprite = new Sprite(new Bitmap(320, 44));
    this._countSprite.move(LAYOUT.x + LAYOUT.listCenterX - 160, 860);
    this.addChild(this._countSprite);
    this._actionWindow = new Window_EquipSceneAction(this);
    this._actionWindow.x = LAYOUT.x + LAYOUT.listCenterX - this._actionWindow.width / 2;
    this._actionWindow.y = this._countSprite.y + this._countSprite.bitmap.height / 2 - this._actionWindow.height / 2;
    this._actionWindow.setHandler('equip', this.onActionEquip.bind(this));
    this._actionWindow.setHandler('discard', this.onActionDiscard.bind(this));
    this._actionWindow.setHandler('cancel', this.closeAction.bind(this));
    this.addChild(this._actionWindow);
    this.createInstructionHints();
  }
  createInstructionHints() {
    this._instructionGlowFilter = createEquipTextGlow();
    this._instructionSprites = [];
    const create = (x, y, width, centered) => {
      const sprite = new Sprite(new Bitmap(width, 1));
      sprite.move(x, y);
      sprite.anchor.set(0, centered ? 0.5 : 0);
      sprite.interactive = false;
      sprite.interactiveChildren = false;
      sprite.filters = [this._instructionGlowFilter];
      sprite.visible = false;
      this.addChild(sprite);
      this._instructionSprites.push(sprite);
      return sprite;
    };
    this._hintSprite = create(LAYOUT.x, LAYOUT.y + LAYOUT.height + 1, LAYOUT.width, false);
    const rightX = LAYOUT.x + LAYOUT.width + 20;
    this._dragHintSprites = [
      create(20, Graphics.height / 2, LAYOUT.x - 40, true),
      create(rightX, Graphics.height / 2, Math.max(1, this.slotRect(0).x - rightX - 20), true)
    ];
    this.refreshInstructions();
  }
  setInstructionText(sprite, text) {
    text = typeof text === 'string' ? text : '';
    const fontFace = this._helpWindow.standardFontFace();
    if (sprite._instructionText === text && sprite._instructionFontFace === fontFace) return;
    sprite._instructionText = text;
    sprite._instructionFontFace = fontFace;
    const bitmap = sprite.bitmap;
    bitmap.fontFace = fontFace;
    bitmap.fontSize = 25;
    bitmap.fontBold = false;
    bitmap.fontItalic = false;
    bitmap.textColor = '#ffffff';
    bitmap.outlineColor = this._helpWindow.contents.outlineColor;
    bitmap.outlineWidth = this._helpWindow.contents.outlineWidth;
    const padding = 8, lineHeight = 34;
    const lines = text ? wrapInstructionLines(bitmap, text, Math.max(1, bitmap.width - padding * 2)) : [];
    const height = Math.max(1, lines.length * lineHeight + padding * 2);
    if (bitmap.height !== height) bitmap.resize(bitmap.width, height);
    else bitmap.clear();
    // Bitmap.resize does not update an existing Sprite's texture frame.
    sprite.setFrame(0, 0, bitmap.width, height);
    lines.forEach((line, index) => bitmap.drawText(line, padding, padding + index * lineHeight,
      bitmap.width - padding * 2, lineHeight, 'center'));
  }
  refreshInstructions() {
    if (!this._instructionSprites) return;
    const texts = window.mapCommonEventDialogue?.EquipScene || {};
    this.setInstructionText(this._hintSprite, texts.operationInstructions);
    const gesture = this._gesture;
    let key = '';
    if (gesture?.drag && gesture.item) {
      if (gesture.slot < 0 && this.canDiscard(gesture.item)) key = 'discardDescription';
      else if (gesture.slot >= 0 && this.isSlotUnlocked(gesture.slot) &&
          this._actor.equips()[gesture.slot] === gesture.item &&
          !(gesture.slot === 0 && baseId(gesture.item) === 4)) key = 'unequipDescription';
    }
    this._dragInstructionKey = key;
    for (let i = 0; i < this._dragHintSprites.length; i++) {
      const sprite = this._dragHintSprites[i];
      const active = i === 0 ? key === 'discardDescription' : key === 'unequipDescription';
      this.setInstructionText(sprite, active ? texts[key] : '');
      sprite.visible = !!sprite._instructionText;
    }
    this.updateOperationInstructions();
    this.updateDragInstructions();
  }
  updateOperationInstructions() {
    if (!this._hintSprite) return;
    // Keep the final fade intact instead of cutting it off at five seconds.
    const elapsed = this._operationHintStartedAt == null
      ? OPERATION_HINT_END_MS : Math.max(0, performance.now() - this._operationHintStartedAt);
    this._hintSprite.visible = elapsed < OPERATION_HINT_END_MS && !!this._hintSprite._instructionText;
    this._hintSprite.alpha = this._hintSprite.visible
      ? 0.5 - 0.5 * Math.cos(elapsed * Math.PI * 2 / HINT_BLINK_MS) : 0;
  }
  updateDragInstructions() {
    if (!this._dragHintSprites) return;
    const alpha = this._gesture?.drag && this._dragInstructionKey
      ? 0.5 - 0.5 * Math.cos(this._dragHintFrame * Math.PI * 2 / HINT_BLINK_FRAMES) : 0;
    for (const sprite of this._dragHintSprites) sprite.alpha = sprite.visible ? alpha : 0;
  }
  hideDragInstructions() {
    this._dragHintFrame = 0;
    this._dragInstructionKey = '';
    for (const sprite of this._dragHintSprites || []) {
      sprite.visible = false;
      sprite.alpha = 0;
    }
  }
  destroyInstructionHints() {
    for (const sprite of this._instructionSprites || []) {
      sprite.filters = null;
      sprite.bitmap?.destroy();
      sprite.bitmap = null;
    }
    this._instructionSprites = null;
    if (this._instructionGlowFilter) {
      const renderer = Graphics.app?.renderer;
      if (renderer?.shader?.shader === this._instructionGlowFilter) renderer.shader.reset();
      this._instructionGlowFilter.destroy();
      this._instructionGlowFilter = null;
    }
  }
  createSlots() {
    this._slotBitmap = ImageManager.loadPicture('equip slot');
    this._selectedSlotBitmap = ImageManager.loadPicture('equip slot_null');
    this._slotFlashFrame = 0;
    this._slotSprites = this.equipmentSlots().slice(0, 6).map((type, index) => {
      const sprite = new Sprite();
      sprite.move(1872, 228 + index * 80);
      // Keep the backdrop and item separate so only the intended image flashes.
      const background = new Sprite(index === this._slotIndex ? this._selectedSlotBitmap : this._slotBitmap);
      background.anchor.set(0.5);
      sprite.addChild(background);
      sprite._background = background;
      const icon = new Sprite(new Bitmap(64, 64));
      icon.anchor.set(0.5);
      sprite.addChild(icon);
      sprite._icon = icon;
      this.addChild(sprite);
      return sprite;
    });
  }
  slotRect(index) { return new Rectangle(1832, 188 + index * 80, 80, 80); }
  slotAt(x, y) { return this._slotSprites.findIndex((_, i) => this.slotRect(i).contains(x, y)); }
  inGrid(x, y) { return new Rectangle(this._grid.x, this._grid.y, this._grid.width, this._grid.height).contains(x, y); }
  isSlotUnlocked(slot) {
    return Number.isInteger(slot) && slot >= 0 && slot < Math.min(6, this.equipmentSlots().length)
      && !this._actor.isEquipTypeLocked(this.equipmentSlots()[slot])
      && !this._actor.isEquipTypeSealed(this.equipmentSlots()[slot]);
  }
  canEquip(item, slot) {
    if (!item || !this.isSlotUnlocked(slot) || !this._actor.canEquip(item)) return false;
    if (this.equipmentSlots()[slot] !== item.etypeId || this.inventoryCount(item) < 1) return false;
    const old = this._actor.equips()[slot];
    if (old === item) return false;
    return !(DataManager.isArmor(item) && old && baseId(old) === baseId(item));
  }
  setSlot(index, showHover = false) {
    if (index < 0 || index >= this._slotSprites.length) return;
    const typeChanged = (this._slotIndex === 0) !== (index === 0);
    const slotChanged = this._slotIndex !== index;
    this._slotIndex = index;
    if (typeChanged) { this._grid._filter = null; this._grid.scrollTo(0, 0); this._grid.select(-1); }
    if (slotChanged) { this.refreshEquipment(typeChanged); SoundManager.playCursor(); }
    if (showHover) this.showSlotHover(index);
  }
  refreshEquipment(resetSelection = false) {
    this._touchSelectedItem = null;
    const oldIndex = this._grid.index();
    this._grid.refresh();
    this._grid.select(this._grid.maxItems() ? Math.min(Math.max(0, resetSelection ? 0 : oldIndex), this._grid.maxItems() - 1) : -1);
    this._grid.ensureCursorVisible(false);
    const weapon = this._slotIndex === 0;
    this._decoration.bitmap = ImageManager.loadSystem(weapon ? LAYOUT.weaponDecoration : LAYOUT.armorDecoration);
    FILTERS[weapon ? 'WEAPONS' : 'ARMORS'].forEach((rule, i) => {
      const b = this._filterButtons[i];
      b.bitmap = ImageManager.loadSystem(rule.image);
      b._symbol = rule.symbol;
      b.opacity = this._grid._filter === rule.symbol ? 255 : 120;
    });
    const equips = this._actor.equips();
    this._slotSprites.forEach((s, i) => {
      s._icon.bitmap.clear();
      drawEquipIcon(s._icon.bitmap, equips[i], 0, 0, 64);
      s.opacity = this.isSlotUnlocked(i) ? 255 : 120;
    });
    this._hoverRevision++;
    this._hoverWindow?.hide();
    this.refreshCount();
    this.updateCursors();
  }
  refreshSortOrder() {
    const grid = this._grid;
    const selected = grid.item();
    this.cancelGesture();
    if (this.actionActive()) this.closeAction();
    this._touchSelectedItem = null;
    grid.refresh();
    const index = grid._data.indexOf(selected);
    grid.select(index >= 0 ? index : grid.maxItems() ? 0 : -1);
    grid.ensureCursorVisible(false);
    this._hoverWindow.hide();
    this.updateCursors();
  }
  refreshCount() {
    const weapon = this._slotIndex === 0;
    const revision = this._inventoryRevision + ':' + weapon;
    if (revision === this._lastCountRevision) return;
    this._lastCountRevision = revision;
    const count = this.inventoryItems().filter(item => weapon ? DataManager.isWeapon(item) : DataManager.isArmor(item)).length;
    // Eval-derived capacity remains the actual value until the outfit commits.
    // Do not interpret script text or duplicate equipment-specific rules here.
    const actor = this._session.actor;
    const capacity = weapon ? actor._weaponAmountLimit + (actor._weaponAmountBonus || 0)
      : actor._armorAmountLimit + (actor._armorAmountBonus || 0);
    const text = `${count}${Number.isFinite(capacity) ? '/' + capacity : ''}`;
    const bm = this._countSprite.bitmap;
    if (text === this._lastCount) return;
    this._lastCount = text;
    bm.clear(); bm.fontFace = 'Madou Futo Maru Gothic'; bm.fontSize = 22;
    bm.textColor = '#b7b6b6'; bm.outlineWidth = 0;
    bm.drawText(text, 0, 0, bm.width, bm.height, 'center');
  }
  syncMapEquipEvents() {
    const map = $gameMap;
    if (!Array.isArray(map?._events)) return;
    // Keep consecutive final Eval tag queries in sync on the returning map,
    // without advancing movement or combat between individual effects.
    map.restoreSpawnEventRuntimeQJ?.();
    map._groupListQJDirty = true;
    $gameTemp._drill_COET_needRestatistics = true;
  }
  equip(item, slot) {
    if (!this.canEquip(item, slot)) { SoundManager.playBuzzer(); return false; }
    return this.applyEquipPreview(slot, item);
  }
  unequip(slot) {
    const old = this._actor.equips()[slot];
    if (!old || !this.isSlotUnlocked(slot) || (slot === 0 && baseId(old) === 4)) { SoundManager.playBuzzer(); return false; }
    return this.applyEquipPreview(slot, slot === 0 ? this.previewFists() : null);
  }
  afterEquipChange(before, slot) {
    const after = this._actor.equips();
    const changed = after.map((item, i) => item !== before[i] ? i : -1).filter(i => i >= 0);
    if (!changed.length) { SoundManager.playBuzzer(); return false; }
    this._inventoryRevision++;
    AudioManager.playSe({ name: slot === 0 ? 'UI系　かっこいい装備音　' : 'Equip2', volume: 90, pitch: 100, pan: 0 });
    this.refreshEquipment();
    return true;
  }
  actionActive() { return !!this._actionWindow?.active; }
  onGridOk() {
    const item = this._grid.item();
    if (!item || (!this.canEquip(item, this._slotIndex) && !this.canDiscard(item))) {
      SoundManager.playBuzzer(); this._grid.activate(); return;
    }
    this._actionItem = item;
    this._grid.deactivate();
    this._grid._drill_MSB_isDraging = false;
    this._countSprite.visible = false;
    this._hoverWindow.hide();
    this._actionWindow.setup();
    clearSceneInput();
  }
  closeAction() {
    this._actionWindow.deactivate(); this._actionWindow.close(); this._actionWindow.hide();
    this._actionItem = null;
    this._countSprite.visible = true;
    this._grid.activate();
    this.resetDrillBackButton();
    clearSceneInput();
  }
  onActionEquip() { const item = this._actionItem; this.closeAction(); this.equip(item, this._slotIndex); }
  onActionDiscard() { const item = this._actionItem; this.closeAction(); this.discard(item); }
  inEquipmentPanel(x, y) { return new Rectangle(LAYOUT.x, LAYOUT.y, LAYOUT.width, LAYOUT.height).contains(x, y); }
  insideScreen(x, y) { return x >= 0 && y >= 0 && x < Graphics.width && y < Graphics.height; }
  scrollBarOwnsPointer() {
    const grid = this._grid;
    return !!grid._drill_MSB_isDraging || !!(grid._drill_MSB_sprite?.visible && grid.drill_MSB_needScroll?.() && grid.drill_MSB_isOnRange?.());
  }
  beginDrag(gesture) {
    if (isPlaceholderWeapon(gesture.item)) return;
    gesture.drag = true;
    this._dragHintFrame = 0;
    this._dragIcon.bitmap.clear();
    drawEquipIcon(this._dragIcon.bitmap, gesture.item, 0, 0, 64);
    if (gesture.slot < 0) {
      this._grid._draggedItem = gesture.item;
      this._grid.redrawItem(gesture.index);
    } else {
      this._slotSprites[gesture.slot]._icon.visible = false;
    }
    this._hoverWindow.hide();
    this.refreshInstructions();
  }
  releaseDrag(gesture, x, y) {
    if (isPlaceholderWeapon(gesture.item) || !this.insideScreen(x, y)) return;
    const slot = this.slotAt(x, y);
    if (gesture.slot < 0) {
      if (slot >= 0) this.equip(gesture.item, slot);
      else if (!this.inEquipmentPanel(x, y) && this.discard(gesture.item)) this.playDiscardAnimation(gesture.item, x, y);
    } else if (slot < 0 && this._actor.equips()[gesture.slot] === gesture.item) {
      this.unequip(gesture.slot);
    }
  }
  playDiscardAnimation(item, x, y) {
    const sprite = new Sprite(new Bitmap(64, 64));
    drawEquipIcon(sprite.bitmap, item, 0, 0, 64);
    sprite.anchor.set(0.5);
    sprite.move(x, y);
    this.addChild(sprite);
    this._discardAnimations.push({ sprite, frame: 0 });
  }
  updateDiscardAnimations() {
    for (let i = this._discardAnimations.length - 1; i >= 0; i--) {
      const effect = this._discardAnimations[i];
      const progress = ++effect.frame / 45;
      if (progress >= 1) {
        this.destroyDiscardAnimation(effect);
        this._discardAnimations.splice(i, 1);
      } else {
        effect.sprite.scale.set(1 + progress);
        effect.sprite.opacity = 255 * (1 - progress);
      }
    }
  }
  destroyDiscardAnimation(effect) {
    this.removeChild(effect.sprite);
    effect.sprite.bitmap.destroy();
    effect.sprite.bitmap = null;
    effect.sprite.destroy();
  }
  changePage(direction) {
    const grid = this._grid;
    const lastPage = Math.max(0, Math.ceil(grid.maxRows() / LAYOUT.rows) - 1);
    const page = grid.topRow() > 0 && grid.topRow() === grid.maxTopRow()
      ? lastPage : Math.floor(grid.topRow() / LAYOUT.rows);
    const targetPage = Math.max(0, Math.min(lastPage, page + direction));
    const target = Math.min(grid.maxTopRow(), targetPage * LAYOUT.rows);
    if (target === grid.topRow()) return;
    this._touchSelectedItem = null;
    grid.select(-1); grid.scrollTo(0, target * grid.itemHeight());
    grid.select(Math.min(grid.maxItems() - 1, target * grid.maxCols()));
    SoundManager.playCursor(); this.refreshCount();
  }
  start() {
    super.start();
    if (this._operationHintStartedAt == null) this._operationHintStartedAt = performance.now();
    this.refreshEquipment(); this.refreshInstructions(); this.createDrillBackButton(); clearSceneInput();
    // Scene entry owns the effect; rejected opens and local cancel actions do not touch it.
    if (this._underwaterBgmBeforeScene === null &&
        typeof AudioManager.setUnderwaterBgmEffect === 'function' &&
        typeof AudioManager.isUnderwaterBgmEffectEnabled === 'function') {
      this._underwaterBgmBeforeScene = AudioManager.isUnderwaterBgmEffectEnabled();
      AudioManager.setUnderwaterBgmEffect(true);
    }
  }
  update() {
    if (!this.isActive() || this._closing) return;
    this.updateOperationInstructions();
    // Advance existing effects before pointer release can start a new one.
    this.updateDiscardAnimations();
    if (this._gesture?.drag) {
      this._dragHintFrame = (this._dragHintFrame + 1) % HINT_BLINK_FRAMES;
      if (this._gesture.slot < 0) this._slotFlashFrame = (this._slotFlashFrame + 1) % 48;
    }
    this.updateDrillBackButton();
    if (this._closing) return;
    this.updatePointer();
    if (this._closing) return;
    // Cancel while dragging consumes this frame, so it cannot also close the scene.
    if (this._cancelGestureFrame) { this._cancelGestureFrame = false; return; }
    this.updateFade(); this.updateColorFilter(); this.updateChildren();
    AudioManager.checkErrors();
    this.updateCursors(); this.refreshCount(); this.updateDragInstructions();
    if (!this.actionActive() && !this._gesture && Input.isTriggered('tab')) this.setSlot((this._slotIndex + 1) % this._slotSprites.length);
  }
  updatePointer() {
    const x = TouchInput.x, y = TouchInput.y;
    if (TouchInput.isCancelled() || Input.isTriggered('cancel')) { this.popScene(); return; }
    if (this.drillBackOwnsPointer() || this.actionActive()) return;
    if (!this._gesture && this.scrollBarOwnsPointer()) { this._hoverWindow.hide(); return; }
    if (pointerTriggered()) {
      const slot = this.slotAt(x, y), index = this._grid.iconIndexAt(x, y);
      const item = slot >= 0 ? this._actor.equips()[slot] : this._grid._data[index];
      // Capture before select(): the first touch must not confirm its own selection.
      // Automatic list selection does not count as the player's first tap.
      const confirm = !this._touchMode || (index >= 0 && this._touchSelectedItem === item && this._grid.item() === item);
      this._touchSelectedItem = null;
      this._gesture = { x, y, slot, index, item, confirm,
        drag: false, frames: 0, emptyGrid: index < 0 && slot < 0 && this.inGrid(x, y), pageY: y };
      this._grid.deactivate();
      if (index >= 0) { this._grid.select(index); this._hoverWindow.hide(); }
    }
    const gesture = this._gesture;
    if (gesture) {
      gesture.frames++;
      const distance = Math.hypot(x - gesture.x, y - gesture.y);
      if (gesture.item && !isPlaceholderWeapon(gesture.item) && (distance >= 12 || gesture.frames >= 18) && pointerPressed()) {
        if (!gesture.drag) this.beginDrag(gesture);
        this._dragIcon.visible = true;
        this._dragIcon.move(x, y);
      } else if (gesture.emptyGrid && pointerPressed() && Math.abs(y - gesture.pageY) >= 48) {
        this.changePage(y < gesture.pageY ? 1 : -1);
        gesture.pageY = y; gesture.swiped = true;
      }
      if (pointerReleased() || !pointerPressed()) {
        this.cancelGesture();
        if (gesture.drag) this.releaseDrag(gesture, x, y);
        else if (!gesture.swiped && distance < 12) {
          if (gesture.slot >= 0 && this.slotAt(x, y) === gesture.slot) this.setSlot(gesture.slot, true);
          else if (gesture.index >= 0 && this._grid.iconIndexAt(x, y) === gesture.index) {
            if (this._touchMode) this._touchSelectedItem = gesture.item;
            if (gesture.confirm) this.onGridOk();
          }
          else this.clickControl(x, y, gesture);
        }
      }
    } else if (!this._touchMode && (x !== this._pointerX || y !== this._pointerY)) {
      const slot = this.slotAt(x, y);
      if (slot >= 0) this.showSlotHover(slot);
      else {
        this._hoverWindow.hide();
        const index = this._grid.iconIndexAt(x, y);
        if (index >= 0 && this._grid.index() !== index) this._grid.select(index);
      }
    }
    this._pointerX = x; this._pointerY = y;
  }
  clickControl(x, y, gesture) {
    const filter = this._filterButtons.find(b => new Rectangle(b.x - 30, b.y, 60, 70).contains(x, y) && new Rectangle(b.x - 30, b.y, 60, 70).contains(gesture.x, gesture.y));
    if (filter) {
      this._grid._filter = this._grid._filter === filter._symbol ? null : filter._symbol;
      this._grid.scrollTo(0, 0);
      this.refreshEquipment(true);
      SoundManager.playCursor();
    }
  }
  cancelGesture() {
    const gesture = this._gesture;
    this._gesture = null;
    this._dragIcon.visible = false;
    this._grid._draggedItem = null;
    if (gesture?.drag) {
      if (gesture.slot < 0) this._grid.redrawItem(gesture.index);
      else this._slotSprites[gesture.slot]._icon.visible = true;
    }
    this.clearSlotHighlights();
    this.hideDragInstructions();
    this._grid.activate();
  }
  showSlotHover(slot) {
    const rect = this.slotRect(slot);
    rect.refreshKey = this._hoverRevision;
    this._hoverWindow.showItem(this._actor.equips()[slot], rect);
  }
  updateCursors() {
    const grid = this._grid;
    const r = grid.itemIconRect(grid.index());
    this._selection.visible = !this._gesture?.drag && grid.index() >= 0 && r.y - grid.origin.y >= 0 && r.y + r.height - grid.origin.y <= grid.innerHeight;
    this._selection.move(grid.x + grid.padding + r.x + 32 - grid.origin.x, grid.y + grid.padding + r.y + 32 - grid.origin.y);
    this.updateSlotHighlights();
  }
  setSlotFlashTarget(slot, target) {
    if (slot._flashTarget === target) return;
    if (slot._flashTarget?.filters) {
      const remaining = slot._flashTarget.filters.filter(filter => filter !== this._slotFlashFilter);
      slot._flashTarget.filters = remaining.length ? remaining : null;
    }
    slot._flashTarget = target;
    if (target) target.filters = (target.filters || []).concat(this._slotFlashFilter);
  }
  clearSlotHighlights() {
    for (const slot of this._slotSprites) this.setSlotFlashTarget(slot, null);
    this._slotFlashFrame = 0;
    if (this._slotFlashFilter) this._slotFlashFilter.alpha = 0;
  }
  updateSlotHighlights() {
    const item = this._gesture?.drag && this._gesture.slot < 0 ? this._gesture.item : null;
    const equips = item ? this._actor.equips() : null;
    let flashing = false;
    this._slotSprites.forEach((slot, index) => {
      const bitmap = index === this._slotIndex ? this._selectedSlotBitmap : this._slotBitmap;
      if (slot._background.bitmap !== bitmap) slot._background.bitmap = bitmap;
      const target = item && this.canEquip(item, index) ? (equips[index] ? slot._icon : slot._background) : null;
      if (target && !this._slotFlashFilter) {
        this._slotFlashFilter = new PIXI.filters.ColorMatrixFilter();
        this._slotFlashFilter.alpha = 0;
        // Blend towards white while preserving the original transparent silhouette.
        this._slotFlashFilter.matrix = [0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0];
      }
      this.setSlotFlashTarget(slot, target);
      flashing = flashing || !!target;
    });
    if (!flashing) this._slotFlashFrame = 0;
    // Start at the original colors, then ease into white and back each cycle.
    if (this._slotFlashFilter) this._slotFlashFilter.alpha = flashing
      ? 0.5 * (0.5 - 0.5 * Math.cos(this._slotFlashFrame * Math.PI * 2 / 48)) : 0;
  }
  popScene() {
    if (this._closing) return;
    if (this._gesture) {
      this.cancelGesture(); this.resetDrillBackButton(); clearSceneInput(); this._cancelGestureFrame = true; return;
    }
    if (this.actionActive()) { this.closeAction(); this._cancelGestureFrame = true; return; }
    // Refuse a stale draft rather than overwrite changes from an asynchronous
    // third-party script. Leave the scene open and retain the draft for diagnosis.
    try { this.validateEquipSession(); }
    catch (error) { this._lastCommitError = error; console.error('[StandaloneEquipScene]', error); SoundManager.playBuzzer(); return; }
    this._closing = true;
    this.cancelGesture(); this._grid.deactivate(); this._hoverWindow.hide();
    clearSceneInput(); if (!this._isUpdatingDrillBack) SoundManager.playCancel();
    SceneManager.pop();
  }
  terminate() {
    if (this._underwaterBgmBeforeScene !== null) {
      const previous = this._underwaterBgmBeforeScene;
      this._underwaterBgmBeforeScene = null;
      AudioManager.setUnderwaterBgmEffect?.(previous);
    }
    clearSceneInput();
    this.clearSlotHighlights();
    this.hideDragInstructions();
    super.terminate();
  }
  destroy(options) {
    // MZ destroys the previous scene in onBeforeSceneStart, after the next
    // Scene_Map.isReady() has created its spriteset and before its first update.
    // This is our own lifecycle method; no SceneManager/Scene_Map hooks are installed.
    try {
      if (this._closing) this.commitEquipSession();
    } finally {
      // ImageManager and SceneManager own shared resources; only dispose scene-owned bitmaps.
      this.destroyInstructionHints();
      this.clearSlotHighlights();
      if (this._slotFlashFilter) {
        const renderer = Graphics.app?.renderer;
        if (renderer?.shader?.shader === this._slotFlashFilter) renderer.shader.reset();
        this._slotFlashFilter.destroy();
        this._slotFlashFilter = null;
      }
      for (const effect of this._discardAnimations) this.destroyDiscardAnimation(effect);
      this._discardAnimations.length = 0;
      for (const sprite of [this._dimSprite, this._countSprite, this._dragIcon]) {
        sprite.bitmap?.destroy(); sprite.bitmap = null;
      }
      for (const sprite of this._slotSprites) {
        sprite._icon.bitmap.destroy(); sprite._icon.bitmap = null;
      }
      this._backgroundSprite.filters = null;
      this._backgroundSprite.bitmap = null;
      this._backgroundBlur.destroy(); this._backgroundBlur = null;
      super.destroy(options);
      this._session = null;
      this._actor = null;
    }
  }
}

function open(slotIndex = 0) {
  const scene = SceneManager._scene;
  const slot = Number(slotIndex);
  if (!(scene instanceof Scene_Map) || SceneManager.isSceneChanging() || !Number.isInteger(slot) || slot < 0 || slot > 5) return false;
  if (!$gameParty.leader() || $gamePlayer.isTransferring() || $gameMessage.isBusy() || $gameSwitches.value(14) || $gamePlayer._drill_EASA_enabled === false) return false;
  if (scene._MapSelectEquipWindow && !scene._MapSelectEquipWindow.isClosed()) return false;
  clearSceneInput();
  SceneManager.push(Scene_StandaloneEquip);
  SceneManager.prepareNextScene(slot);
  return true;
}
window.Scene_StandaloneEquip = Scene_StandaloneEquip;
window.StandaloneEquipScene = Object.freeze({ open, getSortMode, setSortMode,
  sortModes: SORT_MODES, version: '0.10.1' });
PluginManager.registerCommand(PLUGIN_NAME, 'Open', args => open(Number(args.slotIndex || 0)));
})();
