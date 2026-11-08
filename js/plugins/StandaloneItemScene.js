/*:
 * @target MZ
 * @plugindesc v1.0.0 独立物品场景：双栏5×5背包、类型筛选、使用结果写入变量90。
 * @author shiroin / Codex
 * @command Open
 * @text 打开独立物品场景
 * @arg category
 * @text 初始分类
 * @type select
 * @option 普通物品
 * @value normal
 * @option 重要物品
 * @value key
 * @option 隐藏物品
 * @value hidden
 * @default normal
 * @help
 * 放在 PEZ、Drill、QJ 和 StandaloneEquipScene 之后。
 * StandaloneItemScene.open(); // 或 open('key') / open('hidden')
 * 插件命令：打开独立物品场景。
 *
 * 复用装备界面的双栏面板、5×5网格、选择光标、Drill返回键/滚动条样式2。
 * 分类与现有 PEZ 筛选器一致：普通1、重要2、隐藏3，不展示隐藏B(4)。
 * 鼠标悬停选中道具；点击已有光标的道具才打开「使用／丢弃」。
 * 触屏首次点击仅选中并显示说明，再点同一件确认；取消先关确认框，再退出场景。
 * 鼠标滚轮、列表滑动、方向键/PageUp/PageDown浏览，Tab切换分类。
 * 右栏描述保留原始控制符和 Info Eval，支持滚轮/触屏滑动与自动滚动。
 *
 * 使用仅将物品ID写入变量90并返回地图，由调用方公共事件处理使用效果。
 * 取消或丢弃写入变量90为0。丢弃在返回地图后调用原地图掉落方法并移除一件。
 * 不解析、不调用、不改写公共事件92；入口与后续事件流程由项目自行接入。
 * 右侧7格可拖入带 <useableItem> 的道具；插槽间拖动换位，拖出菜单松手移除。
 * 尚无配置时预览当前快捷道具；首次有效拖拽编辑才保存新列表并覆盖旧轮盘。
 *
 * 所有新窗口、输入与生命周期均在本插件内，不包装任何共享原型方法。
 * 加载时不读取存档、不安装后台轮询。
 */
(() => {
'use strict';
const PLUGIN_NAME = 'StandaloneItemScene';
const ITEM_LAYOUT = Object.freeze({
  x: 343, y: 90, width: 1234, height: 885,
  listCenterX: 393, listY: 230, listWidth: 700,
  columns: 5, rows: 5, cellHeight: 96,
  helpX: 797, helpY: 92, helpWidth: 412, helpHeight: 690,
  bodyY: 76, bodyHeight: 590, bodyRightInset: 20, titleHeight: 56,
  filterY: 158, filterStep: 90
});
const ITEM_FILTERS = Object.freeze([
  { symbol: 'normal', type: 1, image: 'IFilter_Normal' },
  { symbol: 'key', type: 2, image: 'IFilter_Key' },
  { symbol: 'hidden', type: 3, image: 'IFilter_Hidden' }
]);
function itemTextGlow() {
  return new PIXI.filters.GlowFilter({distance: 6, outerStrength: 3, innerStrength: 0, color: 0x000000, quality: 0.2});
}
function clearItemInput() {
  Input.clear(); TouchInput.clear();
  window.SLGSceneFreeExploration?.Buttons?.resetPointerCapture?.();
  for (const button of ['left', 'right', 'middle']) {
    const prefix = '_drill_COI_' + button;
    if (prefix + 'Pressed' in TouchInput) TouchInput[prefix + 'Pressed'] = false;
    for (const tail of ['PressedTime', 'ReleasedTime', 'DoubledTime']) {
      if (prefix + tail in TouchInput) TouchInput[prefix + tail] = undefined;
    }
  }
}
function pointerTriggered() { return TouchInput.isTriggered() || TouchInput.drill_isLeftTriggerd(); }
function pointerPressed() { return TouchInput.isPressed() || TouchInput.drill_isLeftPressed(); }
function pointerReleased() { return TouchInput.isReleased() || TouchInput.drill_isLeftReleased(); }
function itemLabels() {
  const labels = window.mapCommonEventDialogue?.usingItem?.doubleConfirm;
  if (labels) return labels;
  const text = window.mapCommonEventDialogue?.usingItem?.['1'];
  return [text?.[0] || 'Use', text?.[2] || 'Discard'];
}
function itemHintText(key) {
  const value = window.mapCommonEventDialogue?.usingItem?.[key];
  return Array.isArray(value) ? value.join('\n') : value || '';
}
// Match the equipment scene's word-aware wrapping and CJK break points.
function wrapItemHintLines(bitmap, text, width) {
  const lines = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = '';
    const tokens = paragraph.match(/\s+|[^\s\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+|./gu) || [];
    for (const token of tokens) {
      if (!line && /^\s+$/u.test(token)) continue;
      if (line && bitmap.measureTextWidth(line + token) > width) {
        lines.push(line.trimEnd()); line = '';
        if (/^\s+$/u.test(token)) continue;
      }
      if (bitmap.measureTextWidth(token) <= width) line += token;
      else {
        for (const character of token) {
          if (line && bitmap.measureTextWidth(line + character) > width) { lines.push(line); line = ''; }
          line += character;
        }
      }
    }
    lines.push(line.trimEnd());
  }
  return lines;
}
function ownsItem(item) { return !!item && DataManager.isItem(item) && $gameParty.numItems(item) > 0; }
const QUICK_SLOTS = 7;
const QUICK_HOTBAR_NAMES = ['R Key', 'R Key M'];
function quickEligible(item) {
  return !!item && DataManager.isItem(item) && item.note.includes('<useableItem>');
}
function quickSlots() {
  let saved = $gameSystem._standaloneQuickItems;
  if (!Array.isArray(saved)) {
    // Preview a starting item without migrating the legacy wheel on open/refresh.
    const registered = QUICK_HOTBAR_NAMES.map(name => {
      const slot = $gameSystem._uiSlotData?.[name];
      return slot?.type === 'item' ? $dataItems[slot.id] : null;
    }).find(item => quickEligible(item) && ownsItem(item));
    const initial = registered || $gameParty.items().reduce((first, item) =>
      quickEligible(item) && ownsItem(item) && (!first || item.id < first.id) ? item : first, null);
    saved = [initial ? initial.id : 0];
  }
  const seen = new Set();
  return Array.from({length: QUICK_SLOTS}, (_, index) => {
    const id = saved[index];
    if (!quickEligible($dataItems[id]) || seen.has(id)) return 0;
    seen.add(id); return id;
  });
}
function quickItemIds() { return quickSlots().filter(id => id && ownsItem($dataItems[id])); }
function syncQuickItems() {
  if (!Array.isArray($gameSystem._standaloneQuickItems)) return false;
  const ids = quickItemIds();
  // Read the save-owned hotbar selection, never another save's global Ritter ID.
  const previous = $gameSystem._uiSlotData?.['R Key'];
  const current = previous?.type === 'item' && ids.includes(previous.id) ? previous.id : ids[0] || 0;
  const changed = Ritter.Params.activeids.length !== ids.length ||
    ids.some((id, index) => Ritter.Params.activeids[index] !== id);
  Ritter.ActiveItem_System.updateActiveIds(ids);
  Ritter.ActiveItem = current || null;
  Ritter.ActiveQuantity = current ? $gameParty.numItems($dataItems[current]) : 0;
  if (changed) {
    // A wheel that was open before entering the menu must not show old neighbors.
    Ritter.ActiveItem_System.hideActiveItemPopup();
    Ritter.popupActive = false; $gameSystem._activeItem = false;
    Ritter.PrevItem2 = Ritter.PrevItem = Ritter.NextItem = Ritter.NextItem2 = null;
    Ritter.ActiveItem_System._hudCycleSlide = null;
  }
  setHotbarItemSlots(QUICK_HOTBAR_NAMES, current);
  return true;
}
function inventoryItems(category) {
  const type = ITEM_FILTERS.find(filter => filter.symbol === category).type;
  return $gameParty.items().filter(item => item.itypeId === type && ownsItem(item));
}
// Scene-owned help text; preserve engine escape codes until drawTextEx.
const itemDescription = item => {
  if (!item) return '';
  PEZ.runYanflyItemInfoEval(item);
  // Override only this scene's generated body styles (16/18px by language).
  // Preserve the title, inline icon and stat sizes, and the shared formatter.
  return QJ.MPMZ.tl.ex_playerSetItemDescription(item).replace(/\\fr\\fs\[(?:16|18)\]/gi, '\\fr\\fs[22]');
};

class Window_StandaloneItemHelp extends Window_Help {
  initialize(rect) {
    const layout = ITEM_LAYOUT;
    super.initialize(rect);
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
  }

  contentsHeight() {
    return Math.max(this.innerHeight, this._scrollBitmapHeight || 0);
  }

  // Wrap while the installed text engine processes the string. Soft line breaks
  // retain its current font, color and emphasis, and use the same path when
  // measuring and drawing. Existing source newlines and relative PX/PY survive.
  createTextState(text, x, y, width) {
    const state = super.createTextState(text, x, y, width);
    state._itemWrap = this._itemWrapping && !this.drill_COWA_isCalculating();
    state._itemWordEnd = 0;
    return state;
  }

  wrapBefore(state, width) {
    if (!state._itemWrap) return;
    const used = Math.abs(state.x - state.startX) + this.textWidth(state.buffer);
    if (used > 0 && used + width > this._descriptionWidth) {
      this.flushTextState(state);
      this.processNewLine(state);
      state._itemSoftLineStart = true;
    }
  }

  processCharacter(state) {
    if (state._itemWrap && state.index >= state._itemWordEnd) {
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
        state._itemWordEnd = state.index + token.length;
        state._itemSoftLineStart = false;
      } else if (state._itemSoftLineStart && /[^\S\r\n]/u.test(character)) {
        state.index += character.length;
        return;
      }
    }
    super.processCharacter(state);
  }

  processDrawIcon(iconIndex, state) {
    // Drill_DialogSpecialCharSize is enabled with font-sized inline icons.
    this.wrapBefore(state, this.contents.fontSize + 4);
    state._itemSoftLineStart = false;
    super.processDrawIcon(iconIndex, state);
  }

  processDrawBigImage(id, state, offsetX, offsetY) {
    this.wrapBefore(state, id === 10 ? DrillUp.g_DTBI_bitmaps[9].width : 32);
    state._itemSoftLineStart = false;
    super.processDrawBigImage(id, state, offsetX, offsetY);
  }

  // A leading FR/FS applies before any visible glyph on the line. Counting the
  // previous line's larger font creates artificial gaps in the narrow panel.
  calcTextHeight(state) {
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
  }

  drawFixedTitle(text) {
    const previous = this._fixedTitleSprite.bitmap;
    this._fixedTitleSprite.bitmap = null;
    if (previous) previous.destroy();
    this._drill_DFF_activeFont = null;
    const size = text ? this.textSizeEx(text) : { width: 0, height: 0 };
    const bitmap = new Bitmap(Math.max(this.innerWidth, Math.ceil(size.width)), ITEM_LAYOUT.titleHeight);
    const bodyBitmap = this.contents;
    this._fixedTitleSprite.bitmap = bitmap;
    // Keep long localized item names on the fixed title line.
    this._fixedTitleSprite.scale.x = Math.min(1, this.innerWidth / bitmap.width);
    this.contents = bitmap;
    try {
      if (text) this.drawTextEx(text, 0, 0);
    } finally {
      this.contents = bodyBitmap;
      this._drill_DFF_activeFont = null;
      this.resetFontSettings();
    }
  }

  refresh() {
    const lines = String(this._text || '').split(/\r?\n/);
    const title = lines.shift() || '';
    const body = lines.join('\n');
    this.resetAutoScroll();
    this._drill_DFF_activeFont = null;
    this._itemWrapping = true;
    try {
      const bodyHeight = body ? Math.ceil(this.textSizeEx(body).height) : 0;
      this._scrollBitmapHeight = this._descriptionY + bodyHeight;
      if (this.contents.height !== this.contentsHeight()) this.createContents();
      this.contents.clear();
      if (body) this.drawTextEx(body, 0, this._descriptionY);
      this._scrollMax = Math.max(0, bodyHeight - this._descriptionHeight);
    } finally {
      this._itemWrapping = false;
    }
    this.drawFixedTitle(title);
  }

  resetAutoScroll() {
    this._scrollOffset = 0;
    this._scrollDirection = 1;
    this._scrollWait = 0;
    if (this.origin) this.origin.y = 0;
    if (this._contentsSprite) this._contentsSprite.y = 0;
  }

  open() {
    if (!this.isOpen()) this.resetAutoScroll();
    if (!this._textGlowFilter) {
      this._plainClientFilters = this._clientArea.filters;
      this._textGlowFilter = itemTextGlow();
      // Title, body and inline icons share the glow; the panel is outside this layer.
      this._clientArea.filters = [this._textGlowFilter];
    }
    super.open();
  }
  releaseTextGlow() {
    if (!this._textGlowFilter) return;
    this._clientArea.filters = this._plainClientFilters;
    const renderer = Graphics.app && Graphics.app.renderer;
    if (renderer && renderer.shader && renderer.shader.shader === this._textGlowFilter) {
      renderer.shader.reset();
    }
    this._textGlowFilter.destroy();
    this._textGlowFilter = null;
    this._plainClientFilters = null;
  }
  close() {
    this.releaseTextGlow();
    super.close();
  }

  update() {
    super.update();
    this.updateAutoScroll();
  }

  scrollBy(distance) {
    if (!(this._scrollMax > 0)) return;
    this._scrollOffset = Math.max(0, Math.min(this._scrollMax, this._scrollOffset + distance));
    this._scrollDirection = distance >= 0 ? 1 : -1;
    this._scrollWait = 180;
    this._contentsSprite.y = -Math.round(this._scrollOffset);
  }

  updateAutoScroll() {
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
  }

  destroy(options) {
    this.releaseTextGlow();
    if (this._fixedTitleSprite && this._fixedTitleSprite.bitmap) {
      this._fixedTitleSprite.bitmap.destroy();
      this._fixedTitleSprite.bitmap = null;
    }
    super.destroy(options);
  }

}

class Window_StandaloneItemGrid extends Window_Selectable {
  initialize(owner) {
    this._owner = owner;
    this._data = [];
    super.initialize(new Rectangle(ITEM_LAYOUT.x + ITEM_LAYOUT.listCenterX - ITEM_LAYOUT.listWidth / 2,
      ITEM_LAYOUT.y + ITEM_LAYOUT.listY, ITEM_LAYOUT.listWidth, ITEM_LAYOUT.rows * ITEM_LAYOUT.cellHeight + 24));
    this.opacity = 0;
    this.activate();
    this._drill_MSB_sprite.drill_MSB_changeStyle(this.drill_MSB_scrollBarStyleId());
    this._drill_MSB_needRefresh = true;
  }
  maxCols() { return ITEM_LAYOUT.columns; }
  maxItems() { return this._data.length; }
  itemHeight() { return ITEM_LAYOUT.cellHeight; }
  itemWidth() { return Math.floor(this.innerWidth / this.maxCols()); }
  itemRect(index) {
    const width = this.itemWidth();
    return new Rectangle((this.innerWidth - width * this.maxCols()) / 2 + index % this.maxCols() * width - this.scrollBaseX(),
      Math.floor(index / this.maxCols()) * this.itemHeight() - this.scrollBaseY(), width, this.itemHeight());
  }
  item() { return this._data[this.index()] || null; }
  refresh() { this._data = inventoryItems(this._owner._category); super.refresh(); }
  drawItemBackground() {}
  drawItem(index) {
    const item = this._data[index], rect = this.itemRect(index);
    const x = rect.x + (rect.width - 64) / 2, y = rect.y + 16;
    this.contents.blt(this._owner._iconSheet, item.iconIndex % 16 * 64, Math.floor(item.iconIndex / 16) * 64,
      64, 64, x, y);
  }
  updateHelp() {
    const item = this.item();
    if (item === this._describedItem) return;
    this._describedItem = item;
    // Info Eval can change STR/V values while the raw description stays identical.
    this._helpWindow._text = itemDescription(item);
    this._helpWindow.refresh();
  }
  isCurrentItemEnabled() { return this._owner.canUse(this.item()); }
  processTouch() {}
  processCursorMove() {
    if (this.index() < 0 && this.maxItems() && this.isCursorMovable() &&
        ['down', 'up', 'left', 'right'].some(key => Input.isRepeated(key))) {
      this.select(0); SoundManager.playCursor(); return;
    }
    super.processCursorMove();
  }
  processWheelScroll() {
    if (!this.isOpenAndActive() || !this.isTouchedInsideFrame() || Math.abs(TouchInput.wheelY) < 20) return;
    const next = Math.max(0, Math.min(this.maxItems() - 1, this.index() + (TouchInput.wheelY > 0 ? 5 : -5)));
    if (this.maxItems() && next !== this.index()) { this.forceSelect(next); SoundManager.playCursor(); }
  }
  isTouchScrollEnabled() { return false; }
  drill_MCu_cursorEnabled() { return false; }
  drill_MSB_scrollBarEnabled() { return true; }
  drill_MSB_scrollBarStyleId() { return 2; }
  drill_MCB_borderEnabled() { return false; }
  _updateCursor() { this._cursorSprite.visible = false; }
  indexAt(x, y) {
    const local = this.worldTransform.applyInverse(new Point(x, y));
    if (local.x < this.padding || local.x >= this.width - this.padding || local.y < this.padding || local.y >= this.height - this.padding) return -1;
    const cx = local.x - this.padding + this.origin.x, cy = local.y - this.padding + this.origin.y;
    for (let i = this.topIndex(); i < Math.min(this.maxItems(), this.topIndex() + this.maxVisibleItems()); i++) {
      if (this.itemRect(i).contains(cx, cy)) return i;
    }
    return -1;
  }
}
class Window_StandaloneItemAction extends Window_Command {
  initialize(owner) {
    this._owner = owner;
    super.initialize(new Rectangle(ITEM_LAYOUT.x + ITEM_LAYOUT.listCenterX - 272, 802, 544, 160));
    this.opacity = 0;
    this._discardBitmap = ImageManager.loadSystem('discardItem');
    this._labels = new Sprite(new Bitmap(this.innerWidth, this.innerHeight));
    this._clientArea.addChild(this._labels);
    this._labels.filters = [itemTextGlow()];
    this.close(); this.hide(); this.deactivate();
  }
  makeCommandList() {
    const labels = itemLabels();
    this.addCommand(labels[0], 'use', this._owner.canUse(this._owner._actionItem));
    this.addCommand(labels[1], 'discard', ownsItem(this._owner._actionItem));
  }
  maxCols() { return 2; }
  itemHeight() { return 136; }
  drawItemBackground() {}
  drawItem(index) {
    if (!this._labels) return;
    const rect = this.itemRect(index), item = this._owner._actionItem;
    const x = Math.round(rect.x + (rect.width - 81) / 2), y = rect.y + 8;
    const enabled = this.isCommandEnabled(index);
    this.changePaintOpacity(enabled);
    if (index === 0 && item) {
      this.contents.blt(this._owner._iconSheet, item.iconIndex % 16 * 64, Math.floor(item.iconIndex / 16) * 64,
        64, 64, x + 8, y + 8);
    } else if (index === 1) {
      const bitmap = this._discardBitmap;
      this.contents.blt(bitmap, 0, 0, bitmap.width, bitmap.height,
        x + (81 - bitmap.width) / 2, y + (81 - bitmap.height) / 2);
    }
    const label = this._labels.bitmap;
    this.resetFontSettings(); label.fontFace = this.contents.fontFace; label.fontSize = 28;
    label.textColor = '#b7b6b6'; label.paintOpacity = enabled ? 255 : 128;
    label.drawText(this.commandName(index), rect.x, rect.y + 93, rect.width, 36, 'center');
    this.changePaintOpacity(true);
  }
  refresh() { if (this._labels) this._labels.bitmap.clear(); super.refresh(); }
  setup() { this.refresh(); this.select(0); this.show(); this.open(); this.activate(); }
  drill_MCu_cursorEnabled() { return false; }
  destroy(options) {
    this._labels.filters[0].destroy(); this._labels.filters = null;
    this._labels.bitmap.destroy(); this._labels.bitmap = null;
    super.destroy(options);
  }
}
class Scene_StandaloneItem extends Scene_Base {
  useParticleSystem() { return false; }
  initialize() {
    super.initialize();
    this._category = 'normal'; this._closing = false; this._gesture = null;
    this._underwaterBgmBeforeScene = null;
    this._touchMode = Utils.isMobileDevice();
  }
  prepare(category) { this._category = category; }
  create() {
    super.create();
    this._iconSheet = ImageManager.loadSystem('IconSet_large');
    this._backgroundSprite = new Sprite(SceneManager.backgroundBitmap());
    this._backgroundBlur = new PIXI.filters.BlurFilter(4);
    this._backgroundSprite.filters = [this._backgroundBlur]; this.addChild(this._backgroundSprite);
    this._dim = new Sprite(new Bitmap(Graphics.width, Graphics.height));
    this._dim.bitmap.fillAll('rgba(0,0,0,0.40)'); this.addChild(this._dim);
    const panel = new Sprite(ImageManager.loadSystem('rpgCommonWindowLayout'));
    panel.move(ITEM_LAYOUT.x, ITEM_LAYOUT.y); this.addChild(panel);
    const decoration = new Sprite(ImageManager.loadSystem('collectionScene_item'));
    decoration.anchor.set(0.5); decoration.opacity = 120;
    decoration.move(ITEM_LAYOUT.x + ITEM_LAYOUT.listCenterX, ITEM_LAYOUT.y + 84); this.addChild(decoration);
    this._helpWindow = new Window_StandaloneItemHelp(new Rectangle(ITEM_LAYOUT.x + ITEM_LAYOUT.helpX,
      ITEM_LAYOUT.y + ITEM_LAYOUT.helpY, ITEM_LAYOUT.helpWidth, ITEM_LAYOUT.helpHeight));
    this._helpWindow.setText(''); this._helpWindow.open(); this.addChild(this._helpWindow);
    this._selection = new Sprite(ImageManager.loadBitmap('img/Menu__ui/', 'equip slot cursor'));
    this._selection.anchor.set(0.5); this._selection.scale.set(96 / 112);
    this._selection.blendMode = PIXI.BLEND_MODES.ADD; this.addChild(this._selection);
    this._grid = new Window_StandaloneItemGrid(this);
    this._grid.setHelpWindow(this._helpWindow);
    this._grid.setHandler('ok', this.openAction.bind(this));
    this._grid.setHandler('cancel', this.popScene.bind(this)); this.addChild(this._grid);
    this._filterButtons = ITEM_FILTERS.map((filter, i) => {
      const button = new Sprite(ImageManager.loadSystem(filter.image));
      button.anchor.set(0.5, 0);
      button.move(ITEM_LAYOUT.x + ITEM_LAYOUT.listCenterX + (i - 1) * ITEM_LAYOUT.filterStep, ITEM_LAYOUT.y + ITEM_LAYOUT.filterY);
      this.addChild(button); return button;
    });
    this._actionWindow = new Window_StandaloneItemAction(this);
    this._actionWindow.setHandler('use', () => this.confirmAction('use'));
    this._actionWindow.setHandler('discard', () => this.confirmAction('discard'));
    this._actionWindow.setHandler('cancel', this.closeAction.bind(this)); this.addChild(this._actionWindow);
    this.createQuickPanel();
  }
  isReady() { return super.isReady() && ImageManager.isReady(); }
  start() {
    super.start(); this.refreshItems(); this.createDrillBackButton(); clearItemInput();
    syncQuickItems();
    this.refreshQuickPanel();
    this.startQuickInstructions();
    this._underwaterBgmBeforeScene = AudioManager.isUnderwaterBgmEffectEnabled();
    AudioManager.setUnderwaterBgmEffect(true);
  }
  createQuickPanel() {
    // Same fixed PC HUD coordinates as the equipment mirror, one slot below it.
    this._quickPanel = new Rectangle(1708, 172, 124, 620);
    const panel = this._quickPanel;
    const xs = [0, 49, panel.width - 50], ys = [0, 48, panel.height - 49];
    const widths = [49, panel.width - 99, 50], heights = [48, panel.height - 97, 49];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const bitmap = ImageManager.loadBitmap('img/system/Saikey_HoverWindow/', 'nine/' + row + col);
        const tile = row === 1 || col === 1 ? new TilingSprite(bitmap) : new Sprite(bitmap);
        tile.move(panel.x + xs[col], panel.y + ys[row], widths[col], heights[row]);
        this.addChild(tile);
      }
    }
    this._quickTargets = Array.from({length: QUICK_SLOTS}, (_, index) => {
      const sprite = new Sprite(new Bitmap(64, 64));
      sprite.anchor.set(0.5); sprite.move(panel.x + panel.width / 2, 242 + index * 80);
      this.addChild(sprite); return sprite;
    });
    const background = new Sprite(ImageManager.loadSystem('Char_slot'));
    background.anchor.set(0.5); background.move(1872, 732); this.addChild(background);
    this._quickMirror = new Sprite(new Bitmap(64, 64));
    this._quickMirror.anchor.set(0.5, 0); this._quickMirror.move(1872, 700); this.addChild(this._quickMirror);
    this._quickTargetCursor = new Sprite(ImageManager.loadBitmap('img/Menu__ui/', 'equip slot cursor'));
    this._quickTargetCursor.anchor.set(0.5); this._quickTargetCursor.scale.set(80 / 112);
    this._quickTargetCursor.blendMode = PIXI.BLEND_MODES.ADD;
    this._quickTargetCursor.visible = false; this.addChild(this._quickTargetCursor);
    this._quickDrag = new Sprite(this._iconSheet);
    this._quickDrag.anchor.set(0.5); this._quickDrag.opacity = 220;
    this._quickDrag.visible = false; this.addChild(this._quickDrag);
    this._quickInstructionGlow = itemTextGlow();
    const instructionWidth = Graphics.width - this._helpWindow.x - this._helpWindow.width - 16;
    this._quickInstructions = new Sprite(new Bitmap(instructionWidth, 1));
    this._quickInstructions.filters = [this._quickInstructionGlow];
    this._quickInstructions.visible = false; this.addChild(this._quickInstructions);
    this._quickHint = new Sprite(new Bitmap(Math.min(600, Graphics.width - 24), 1));
    this._quickHint.filters = [this._quickInstructionGlow];
    this._quickHint.visible = false; this.addChild(this._quickHint);
  }
  drawQuickIcon(bitmap, item) {
    bitmap.clear();
    if (item) {
      bitmap.paintOpacity = ownsItem(item) ? 255 : 100;
      bitmap.blt(this._iconSheet, item.iconIndex % 16 * 64, Math.floor(item.iconIndex / 16) * 64, 64, 64, 0, 0);
      bitmap.paintOpacity = 255;
    } else {
      bitmap.fontFace = $gameSystem.mainFontFace(); bitmap.fontSize = 36;
      bitmap.textColor = '#b7b6b6'; bitmap.outlineColor = '#000000'; bitmap.outlineWidth = 4;
      bitmap.drawText('?', 0, 0, 64, 64, 'center');
    }
  }
  refreshQuickPanel() {
    const slots = quickSlots();
    this._quickTargets.forEach((sprite, index) => this.drawQuickIcon(sprite.bitmap, $dataItems[slots[index]]));
    const current = $gameSystem._uiSlotData?.['R Key'];
    const item = current?.type === 'item' ? $dataItems[current.id] : null;
    this.drawQuickIcon(this._quickMirror.bitmap, item);
  }
  quickSlotAt(x, y) {
    if (!this._quickPanel) return -1;
    return this._quickTargets.findIndex(sprite => Math.abs(x - sprite.x) < 40 && Math.abs(y - sprite.y) < 40);
  }
  drawQuickHintText(sprite, text, fontSize) {
    const bitmap = sprite.bitmap;
    bitmap.fontFace = this._helpWindow.standardFontFace(); bitmap.fontSize = fontSize;
    bitmap.fontBold = false; bitmap.fontItalic = false; bitmap.textColor = '#ffffff';
    bitmap.outlineColor = this._helpWindow.contents.outlineColor;
    bitmap.outlineWidth = this._helpWindow.contents.outlineWidth;
    const padding = 8, lineHeight = fontSize + 9;
    const lines = text ? wrapItemHintLines(bitmap, text, bitmap.width - padding * 2) : [];
    const height = Math.max(1, lines.length * lineHeight + padding * 2);
    if (bitmap.height !== height) bitmap.resize(bitmap.width, height);
    else bitmap.clear();
    sprite.setFrame(0, 0, bitmap.width, height);
    lines.forEach((line, index) => bitmap.drawText(line, padding, padding + index * lineHeight,
      bitmap.width - padding * 2, lineHeight, 'center'));
    sprite.visible = !!text;
  }
  startQuickInstructions() {
    if (this._quickInstructionsStarted !== undefined) return;
    const text = [itemHintText('operationInstructions'),
      this._touchMode ? '' : itemHintText('operationInstructionsForPC')].filter(Boolean).join('\n');
    const sprite = this._quickInstructions;
    this.drawQuickHintText(sprite, text, 25);
    // Fit long translations in the area below the seven slots.
    const y = this._quickPanel.y + this._quickPanel.height + 8;
    const scale = Math.min(1, (Graphics.height - y - 12) / sprite.bitmap.height);
    sprite.scale.set(scale);
    sprite.move(Graphics.width - 12 - sprite.bitmap.width * scale, y);
    this._quickInstructionsStarted = performance.now();
    this._quickInstructionsText = text;
    this.updateQuickInstructions();
  }
  updateQuickInstructions() {
    if (this._quickInstructionsStarted === undefined) return;
    const elapsed = Math.max(0, performance.now() - this._quickInstructionsStarted);
    // Equipment's 1.2s pulse peaks at 3s, then naturally fades to zero at 3.6s.
    this._quickInstructions.visible = elapsed < 3600 && !!this._quickInstructionsText;
    this._quickInstructions.alpha = this._quickInstructions.visible
      ? 0.5 - 0.5 * Math.cos(elapsed * Math.PI * 2 / 1200) : 0;
  }
  showQuickDragHint() {
    this.drawQuickHintText(this._quickHint, itemHintText('cannotQuickUse'), 22);
    this.updateQuickHint();
  }
  updateQuickHint() {
    if (!this._quickHint?.visible) return;
    const bitmap = this._quickHint.bitmap;
    this._quickHint.move(Math.max(0, Math.min(Graphics.width - bitmap.width, TouchInput.x - bitmap.width / 2)),
      Math.max(0, Math.min(Graphics.height - bitmap.height, TouchInput.y + 42)));
  }
  commitQuickDrop(item, source, target, outsidePanel, x, y) {
    if (target < 0 && !(source >= 0 && outsidePanel)) return;
    if (target >= 0 && (!quickEligible(item) || !ownsItem(item))) { SoundManager.playBuzzer(); return; }
    const slots = quickSlots();
    if (target >= 0) {
      const previous = slots.indexOf(item.id);
      if (previous === target && Array.isArray($gameSystem._standaloneQuickItems)) return;
      if (previous >= 0) slots[previous] = slots[target];
      slots[target] = item.id;
    } else slots[source] = 0;
    $gameSystem._standaloneQuickItems = slots;
    syncQuickItems(); this.refreshQuickPanel(); SoundManager.playEquip();
  }
  beginQuickDrag(gesture) {
    gesture.itemDrag = true; gesture.dragged = true;
    this._grid.deactivate();
    const icon = gesture.item.iconIndex;
    this._quickDrag.setFrame(icon % 16 * 64, Math.floor(icon / 16) * 64, 64, 64);
    this._quickDrag.visible = true;
    if (gesture.slot < 0 && quickEligible(gesture.item) && ownsItem(gesture.item)) {
      this.startQuickSlotFlash();
    }
    if (!quickEligible(gesture.item) || !ownsItem(gesture.item)) this.showQuickDragHint();
  }
  startQuickSlotFlash() {
    if (!this._quickSlotFlashFilter) {
      this._quickSlotFlashFilter = new PIXI.filters.ColorMatrixFilter();
      // Equipment-slot white pulse with a stronger peak; retain the transparent silhouette.
      this._quickSlotFlashFilter.matrix = [0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0];
    }
    this._quickSlotFlashFilter.alpha = 0;
    this._quickSlotFlashFrame = 0;
    this._quickSlotsFlashing = true;
    for (const sprite of this._quickTargets) {
      sprite.filters = (sprite.filters || []).concat(this._quickSlotFlashFilter);
    }
  }
  updateQuickSlotFlash() {
    if (!this._quickSlotsFlashing) return;
    this._quickSlotFlashFrame = (this._quickSlotFlashFrame + 1) % 48;
    this._quickSlotFlashFilter.alpha = 0.5 - 0.5 * Math.cos(this._quickSlotFlashFrame * Math.PI * 2 / 48);
  }
  clearQuickSlotFlash() {
    if (!this._quickSlotsFlashing) return;
    for (const sprite of this._quickTargets) {
      const remaining = sprite.filters.filter(filter => filter !== this._quickSlotFlashFilter);
      sprite.filters = remaining.length ? remaining : null;
    }
    this._quickSlotsFlashing = false;
    this._quickSlotFlashFrame = 0;
    this._quickSlotFlashFilter.alpha = 0;
  }
  clearGesture() {
    this._gesture = null;
    this.clearQuickSlotFlash();
    if (this._quickHint) this._quickHint.visible = false;
    if (this._quickDrag) {
      this._quickDrag.visible = false; this._quickTargetCursor.visible = false;
      if (!this.actionActive() && !this._closing) this._grid.activate();
    }
  }
  canUse(item) { return ownsItem(item) && $gameParty.canUse(item); }
  refreshItems() {
    this._grid._describedItem = undefined;
    this._grid.refresh(); this._grid.scrollTo(0, 0);
    this._grid.select(-1);
    this._grid.updateHelp();
    this._filterButtons.forEach((button, i) => { button.opacity = ITEM_FILTERS[i].symbol === this._category ? 255 : 100; });
    this.updateSelection();
  }
  setCategory(category) {
    if (this.actionActive() || this._closing || this._category === category) return;
    this._category = category; this._gesture = null; this.refreshItems(); SoundManager.playCursor();
  }
  actionActive() { return this._actionWindow.visible; }
  openAction() {
    const item = this._grid.item();
    if (!this.canUse(item)) { SoundManager.playBuzzer(); this._grid.activate(); return; }
    this._actionItem = item; this._grid.deactivate(); this._gesture = null;
    this._actionWindow.setup(); clearItemInput();
  }
  closeAction() {
    this._actionWindow.close(); this._actionWindow.hide(); this._actionWindow.deactivate();
    this._actionItem = null; this._grid.activate();
    this.resetDrillBackButton(); clearItemInput();
  }
  confirmAction(action) {
    if (this._closing) return;
    const item = this._actionItem;
    if (!ownsItem(item) || (action === 'use' && !this.canUse(item))) {
      SoundManager.playBuzzer(); this.closeAction(); this.refreshItems(); return;
    }
    // Only a use selection is returned to the caller's event flow.
    this._discardItem = action === 'discard' ? item : null;
    $gameVariables.setValue(90, action === 'use' ? item.id : 0);
    this.finish();
  }
  finish() {
    this._closing = true; this.clearGesture();
    this._grid.deactivate(); this._actionWindow.deactivate(); clearItemInput(); SceneManager.pop();
  }
  popScene() {
    if (this._closing) return;
    if (this.actionActive()) { this.closeAction(); return; }
    if (this._gesture) { this.clearGesture(); this.resetDrillBackButton(); clearItemInput(); return; }
    $gameVariables.setValue(90, 0);
    if (!this._isUpdatingDrillBack) SoundManager.playCancel(); this.finish();
  }
  filterAt(x, y) {
    return this._filterButtons.findIndex(button => {
      const p = button.worldTransform.applyInverse(new Point(x, y));
      return p.x >= -button.bitmap.width / 2 && p.x < button.bitmap.width / 2 && p.y >= 0 && p.y < button.bitmap.height;
    });
  }
  hit(x, y) {
    if (this._quickPanel?.contains(x, y)) return 'quick';
    const filter = this.filterAt(x, y);
    if (filter >= 0) return 'filter:' + filter;
    if (new Rectangle(this._grid.x, this._grid.y, this._grid.width, this._grid.height).contains(x, y)) return 'grid';
    if (new Rectangle(this._helpWindow.x, this._helpWindow.y, this._helpWindow.width, this._helpWindow.height).contains(x, y)) return 'help';
    return '';
  }
  updatePointer() {
    const grid = this._grid;
    const scrollBarOwnsPointer = grid._drill_MSB_isDraging ||
      (grid._drill_MSB_sprite.visible && grid.drill_MSB_needScroll() && grid.drill_MSB_isOnRange());
    if (this.actionActive() || this.drillBackOwnsPointer() || (!this._gesture && scrollBarOwnsPointer)) { this.clearGesture(); return; }
    const x = TouchInput.x, y = TouchInput.y;
    const hit = this.hit(x, y);
    if (hit === 'help' && Math.abs(TouchInput.wheelY) >= 20) this._helpWindow.scrollBy(TouchInput.wheelY);
    // Only real mouse movement selects on hover. Touch-down must not become
    // hover-selection and confirmation in the same frame.
    if (!this._gesture && !pointerTriggered() && !pointerPressed() && TouchInput.isHovered() && hit === 'grid') {
      const index = grid.indexAt(x, y);
      if (index >= 0 && index !== grid.index()) { grid.select(index); SoundManager.playCursor(); }
    }
    if (pointerTriggered() && hit) {
      const index = this._grid.indexAt(x, y);
      const confirm = index >= 0 && grid.index() === index && this._selection.visible;
      const slot = this.quickSlotAt(x, y);
      const item = this._quickPanel ? (hit === 'grid' ? grid._data[index] : $dataItems[quickSlots()[slot]]) : null;
      this._gesture = {hit, index, confirm, x, y, lastY: y, dragged: false, row: this._grid.topRow(),
        item, slot, started: performance.now()};
      if (hit === 'grid' && index >= 0) this._grid.select(index);
    }
    const gesture = this._gesture;
    if (!gesture) return;
    if (pointerPressed()) {
      const dx = x - gesture.x, dy = y - gesture.y, distance = Math.hypot(dx, dy);
      // Mobile keeps vertical swipes for scrolling; horizontal drag or a still
      // long press picks up an icon. Desktop can drag in any direction.
      if (gesture.item && !gesture.itemDrag && !gesture.scrolling &&
          ((!this._touchMode && distance >= 12) || Math.abs(dx) >= 12 && Math.abs(dx) > Math.abs(dy) ||
           gesture.slot >= 0 && distance >= 12 || distance < 8 && performance.now() - gesture.started >= 300)) {
        this.beginQuickDrag(gesture);
      }
      if (gesture.itemDrag) {
        this._quickDrag.move(x, y);
        const target = this.quickSlotAt(x, y);
        this._quickTargetCursor.visible = target >= 0;
        if (target >= 0) this._quickTargetCursor.move(this._quickTargets[target].x, this._quickTargets[target].y);
      } else if (distance >= 8) { gesture.dragged = true; gesture.scrolling = true; }
      if (gesture.dragged && gesture.hit === 'help') this._helpWindow.scrollBy(gesture.lastY - y);
      if (gesture.dragged && !gesture.itemDrag && gesture.hit === 'grid') {
        const row = Math.max(0, Math.min(this._grid.maxTopRow(), gesture.row + Math.trunc((gesture.y - y) / ITEM_LAYOUT.cellHeight)));
        this._grid.setTopRow(row);
      }
      gesture.lastY = y;
    }
    if (pointerReleased() || !pointerPressed()) {
      this.clearGesture();
      if (gesture.itemDrag) {
        this.commitQuickDrop(gesture.item, gesture.slot, this.quickSlotAt(x, y), hit !== 'quick', x, y);
        return;
      }
      if (gesture.dragged || gesture.hit !== hit) return;
      if (hit.startsWith('filter:')) this.setCategory(ITEM_FILTERS[Number(hit.slice(7))].symbol);
      else if (hit === 'grid' && gesture.confirm && gesture.index === this._grid.indexAt(x, y)) {
        grid.processOk();
      }
    }
  }
  updateSelection() {
    const index = this._grid.index();
    const rect = index >= 0 ? this._grid.itemRect(index) : null;
    this._selection.visible = !!rect && rect.y - this._grid.origin.y >= 0 &&
      rect.y + rect.height - this._grid.origin.y <= this._grid.innerHeight;
    if (rect) this._selection.move(this._grid.x + this._grid.padding + rect.x + rect.width / 2,
      this._grid.y + this._grid.padding + rect.y + 48 - this._grid.origin.y);
  }
  update() {
    if (!this.isActive() || this._closing) return;
    if (TouchInput.isCancelled() || Input.isTriggered('cancel')) { this.popScene(); return; }
    this.updateDrillBackButton();
    if (this._closing) return;
    this.updatePointer();
    this.updateQuickSlotFlash();
    this.updateQuickHint();
    this.updateQuickInstructions();
    if (this._closing) return;
    super.update(); this.updateSelection();
    if (!this.actionActive() && !this._gesture && Input.isTriggered('tab')) {
      const index = ITEM_FILTERS.findIndex(filter => filter.symbol === this._category);
      this.setCategory(ITEM_FILTERS[(index + 1) % ITEM_FILTERS.length].symbol);
    }
  }
  createDrillBackButton() {
    if (this._drillBackButtonReady) return;
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
    // press captured at its origin may arm it in this scene with list gesture.
    if (!this._drillBackPointerCaptured || !pointerTriggered() ||
        this._gesture || this._grid?._drill_MSB_isDraging) return false;
    return Scene_MenuBase.prototype.drill_MBB_isOnTouchSprite.call(this, sprite);
  }


  terminate() {
    if (this._underwaterBgmBeforeScene !== null) AudioManager.setUnderwaterBgmEffect(this._underwaterBgmBeforeScene);
    clearItemInput(); super.terminate();
  }
  destroy(options) {
    // The map spriteset is ready before this scene is destroyed. Item-use
    // effects belong to the caller; only the explicitly requested drop runs here.
    try {
      if (ownsItem(this._discardItem)) {
        dingk.Loot.getMapDrops($gamePlayer, this._discardItem, {playerDiscarded: true});
        $gameParty.gainItem(this._discardItem, -1);
        this._discardItem = null;
      }
      syncQuickItems();
    } finally {
      this.clearQuickSlotFlash();
      if (this._quickSlotFlashFilter) {
        const renderer = Graphics.app?.renderer;
        if (renderer?.shader?.shader === this._quickSlotFlashFilter) renderer.shader.reset();
        this._quickSlotFlashFilter.destroy(); this._quickSlotFlashFilter = null;
      }
      if (this._quickInstructionGlow) {
        this._quickHint.filters = null; this._quickInstructions.filters = null;
        const renderer = Graphics.app?.renderer;
        if (renderer?.shader?.shader === this._quickInstructionGlow) renderer.shader.reset();
        this._quickInstructionGlow.destroy(); this._quickInstructionGlow = null;
      }
      for (const sprite of [...(this._quickTargets || []), this._quickMirror, this._quickHint, this._quickInstructions]) {
        if (sprite) { sprite.bitmap.destroy(); sprite.bitmap = null; }
      }
      this._dim.bitmap.destroy(); this._dim.bitmap = null;
      this._backgroundSprite.filters = null; this._backgroundSprite.bitmap = null;
      this._backgroundBlur.destroy(); super.destroy(options);
    }
  }
}
function openItemScene(category = 'normal') {
  if (!ITEM_FILTERS.some(filter => filter.symbol === category)) return false;
  const scene = SceneManager._scene;
  if (!(scene instanceof Scene_Map) || SceneManager.isSceneChanging() || $gamePlayer.isTransferring() || $gameMessage.isBusy()) return false;
  if (!$gameParty.leader() || $gameSwitches.value(14) || $gamePlayer._drill_EASA_enabled === false) return false;
  clearItemInput(); SceneManager.push(Scene_StandaloneItem); SceneManager.prepareNextScene(category);
  return true;
}
window.Scene_StandaloneItem = Scene_StandaloneItem;
window.StandaloneItemScene = Object.freeze({open: category => openItemScene(category), quickItemIds, syncQuickItems, version: '1.0.0'});
PluginManager.registerCommand(PLUGIN_NAME, 'Open', args => openItemScene(args.category || 'normal'));
})();
