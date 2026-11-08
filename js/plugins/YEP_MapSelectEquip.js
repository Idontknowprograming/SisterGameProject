//=============================================================================
// Yanfly Engine Plugins - Map Select Equip (project MZ layout)
// Help adapted from Aloe Guvner; project weapon/armor filters integrated here.
//=============================================================================
/*:
 * @plugindesc v2.0 固定双栏装备选择：统一背景、右侧说明、武器/护甲分类。
 * @author Yanfly Engine Plugins / Aloe Guvner / project customizations
 *
 * @param Default Enable
 * @type boolean
 * @default true
 * @param Default Quantity
 * @type boolean
 * @default false
 * @param Enable Swipe Paging
 * @type boolean
 * @default true
 * @param Swipe Page Threshold
 * @type number
 * @min 20
 * @default 48
 *
 * @help
 * 固定 1920×1080 游戏坐标、5×5 装备格；布局常量集中在 Yanfly.MSE.Layout。
 * img/system/rpgCommonWindowLayout.png 是武器/护甲/批量选择共用背景。
 * equip_weapon / equip_gear 分别为武器 / 护甲的顶部小装饰。
 * 普通选择光标使用 Drill_MenuCursor 样式6；批量已选标记由本插件绘制。
 * 已整合 ALOE_YEP_X_MapSelectEquip_Help、YEP_MapSelectEquip_WtypeFilter、
 * YEP_MapSelectEquip_ArmorLootPoolFilter，请关闭这三个旧扩展。
 *
 * 保留命令：MapSelectEquip var weapon|armor|both
 *           MapSelectEquipBase var weapon|armor|both
 *           ShowMapSelectEquipQuantity / HideMapSelectEquipQuantity
 * 保留脚本：scene.setupMapSelectEquip(varId, type, base, batchSelect)
 * 结果写入 varId；取消写0；丢弃设置开关113；批量结果写数值数组22。
 * 事件读取结果前继续使用 this.waitForMapSelectEquip()。
 * 已移除旧 Columns/Rows/Width/X/Y 配置及位置命令。
 */
var Imported = Imported || {};
Imported.YEP_MapSelectEquip = true;
var Yanfly = Yanfly || {};
Yanfly.MSE = Yanfly.MSE || {};
Yanfly.MSE.version = 2.0;
Yanfly.MSE.Layout = Object.freeze({
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
Yanfly.Param = Yanfly.Param || {};
(() => {
  const p = PluginManager.parameters('YEP_MapSelectEquip');
  Yanfly.Param.MSEEnable = p['Default Enable'] !== 'false';
  Yanfly.Param.MSEQuantity = p['Default Quantity'] === 'true';
  Yanfly.Param.MSESwipePaging = p['Enable Swipe Paging'] !== 'false';
  Yanfly.Param.MSESwipeThreshold = Math.max(20, Number(p['Swipe Page Threshold']) || 48);
})();
Yanfly.MSE.Filters = {
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
// Only behavior settings are serialized; old saves' geometry fields are unused.
Yanfly.MSE.Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
  Yanfly.MSE.Game_System_initialize.call(this);
  this._MapSelectEquipWindowEnable = Yanfly.Param.MSEEnable;
  this._MapSelectEquipWindowQuantity = Yanfly.Param.MSEQuantity;
};
Game_System.prototype.getMapSelectEquipEnable = function() {
  return this._MapSelectEquipWindowEnable ?? Yanfly.Param.MSEEnable;
};
Game_System.prototype.setMapSelectEquipEnable = function(value) { this._MapSelectEquipWindowEnable = value; };
Game_System.prototype.getMapSelectEquipQuantity = function() {
  return this._MapSelectEquipWindowQuantity ?? Yanfly.Param.MSEQuantity;
};
Game_System.prototype.setMapSelectEquipQuantity = function(value) { this._MapSelectEquipWindowQuantity = value; };
Game_System.prototype.isMapSelectEquipOpen = function() {
  const scene = SceneManager._scene;
  return scene instanceof Scene_Map && !!scene._MapSelectEquipWindow?.isOpen();
};
Yanfly.MSE.Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args) {
  Yanfly.MSE.Game_Interpreter_pluginCommand.call(this, command, args);
  if (command === 'MapSelectEquip' || command === 'MapSelectEquipBase') {
    const scene = SceneManager._scene;
    if (!(scene instanceof Scene_Map)) return;
    const type = { weapon: 'WEAPONS', armor: 'ARMORS', both: 'BOTH' }[String(args[1]).toLowerCase()];
    if (!type) return;
    scene.setupMapSelectEquip(Number(args[0]), type, command === 'MapSelectEquipBase', false);
    this.wait(10);
  } else if (command === 'ShowMapSelectEquipQuantity') {
    $gameSystem.setMapSelectEquipQuantity(true);
  } else if (command === 'HideMapSelectEquipQuantity') {
    $gameSystem.setMapSelectEquipQuantity(false);
  }
};

function Window_MapSelectEquip() { this.initialize(...arguments); }
Window_MapSelectEquip.prototype = Object.create(Window_ItemList.prototype);
Window_MapSelectEquip.prototype.constructor = Window_MapSelectEquip;
Window_MapSelectEquip.prototype.initialize = function() {
  const l = Yanfly.MSE.Layout;
  Window_Selectable.prototype.initialize.call(this,
    new Rectangle(l.x + l.listCenterX - l.listWidth / 2, l.y + l.listY,
      l.listWidth, l.rows * l.cellHeight + 24));
  this.opacity = 0;
  this.openness = 0;
  this._data = [];
  this.arrItem = [];
  this._mseSwipeTracking = false;
};
Window_MapSelectEquip.prototype.createBatchMarkers = function() {
  this._batchCursorBitmap = ImageManager.loadBitmap('img/Menu__ui/', 'equip slot cursor');
  this._batchMarkerSprites = [];
  // Keep ADD outside _clientArea's AlphaFilter so it blends with the screen.
  this._batchMarkerLayer = new Sprite();
  this._batchMarkerLayer.visible = false;
  this.addChild(this._batchMarkerLayer);
  this._batchMarkerMask = new PIXI.Graphics();
  this._batchMarkerMask.beginFill(0xffffff);
  this._batchMarkerMask.drawRect(this.padding, this.padding, this.innerWidth, this.innerHeight);
  this._batchMarkerMask.endFill();
  this.addChild(this._batchMarkerMask);
  this._batchMarkerLayer.mask = this._batchMarkerMask;
};
Window_MapSelectEquip.prototype.destroyBatchMarkers = function() {
  if (!this._batchMarkerLayer) return;
  this._batchMarkerLayer.mask = null;
  this.removeChild(this._batchMarkerLayer);
  this.removeChild(this._batchMarkerMask);
  this._batchMarkerLayer.destroy();
  this._batchMarkerMask.destroy();
  this._batchMarkerLayer = null;
  this._batchMarkerMask = null;
  this._batchMarkerSprites = null;
  // The bitmap belongs to ImageManager and is also used by Drill.
  this._batchCursorBitmap = null;
};
Window_MapSelectEquip.prototype.maxCols = function() { return Yanfly.MSE.Layout.columns; };
// PEZ overrides Window_ItemList.itemWidth with its 64px inventory slot width.
// The equipment grid owns its column pitch and fills this window's inner area.
Window_MapSelectEquip.prototype.itemWidth = function() { return Math.floor(this.innerWidth / this.maxCols()); };
Window_MapSelectEquip.prototype.itemHeight = function() { return Yanfly.MSE.Layout.cellHeight; };
Window_MapSelectEquip.prototype.itemRect = function(index) {
  const width = this.itemWidth();
  const inset = (this.innerWidth - width * this.maxCols()) / 2;
  return new Rectangle(inset + index % this.maxCols() * width - this.scrollBaseX(),
    Math.floor(index / this.maxCols()) * this.itemHeight() - this.scrollBaseY(), width, this.itemHeight());
};
Window_MapSelectEquip.prototype.itemIconRect = function(index) {
  const rect = this.itemRect(index);
  return new Rectangle(rect.x + (rect.width - 64) / 2,
    rect.y + Yanfly.MSE.Layout.iconY, 64, 64);
};
Window_MapSelectEquip.prototype.itemMarkerRect = function(index) {
  const icon = this.itemIconRect(index);
  const size = Yanfly.MSE.Layout.markerSize;
  return new Rectangle(icon.x + (icon.width - size) / 2,
    icon.y + (icon.height - size) / 2, size, size);
};
Window_MapSelectEquip.prototype.setup = function(varId, type, base, batchSelect = false) {
  if (!varId || !type) return;
  this._varId = varId;
  this._type = type.toUpperCase();
  this._base = base;
  this.destroyBatchMarkers();
  this._batchSelect = !!batchSelect;
  if (this._batchSelect) this.createBatchMarkers();
  // Saved Drill controllers can retain the old style's offsets after a reload.
  const cursor = $gameSystem._drill_MCu_controller;
  const styleId = this.drill_MCu_cursorStyleId();
  if (!this._batchSelect && cursor?._drill_curStyleId === styleId) {
    cursor.drill_controller_resetData(DrillUp.g_MCu_list[styleId - 1]);
  }
  this._weaponFilterSymbol = null;
  this._armorFilterSymbol = null;
  this.arrItem = [];
  this._mseSwipeTracking = false;
  this.select(-1);
  this.scrollTo(0, 0);
  this.refresh();
  this.activate();
  this.open();
};
Window_MapSelectEquip.prototype.weaponFilterSymbol = function() { return this._weaponFilterSymbol || null; };
Window_MapSelectEquip.prototype.armorFilterSymbol = function() { return this._armorFilterSymbol || null; };
Window_MapSelectEquip.prototype.toggleWeaponFilter = function(symbol) {
  this._weaponFilterSymbol = this._weaponFilterSymbol === symbol ? null : symbol;
  this.refreshFilter();
};
Window_MapSelectEquip.prototype.toggleArmorFilter = function(symbol) {
  this._armorFilterSymbol = this._armorFilterSymbol === symbol ? null : symbol;
  this.refreshFilter();
};
Window_MapSelectEquip.prototype.refreshFilter = function() {
  this.select(-1);
  this.scrollTo(0, 0);
  this.refresh();
  this.forceSelect(this.maxItems() ? 0 : -1);
};
Window_MapSelectEquip.prototype.includes = function(item) {
  if (DataManager.isWeapon(item)) {
    if (this._type === 'BOTH') return true;
    if (this._type !== 'WEAPONS') return false;
    const rule = Yanfly.MSE.Filters.WEAPONS.find(f => f.symbol === this._weaponFilterSymbol);
    const base = $dataWeapons[item.baseItemId] || item;
    return !rule || rule.types.includes(base.wtypeId);
  }
  if (DataManager.isArmor(item)) {
    if (this._type === 'BOTH') return true;
    if (this._type !== 'ARMORS') return false;
    const rule = Yanfly.MSE.Filters.ARMORS.find(f => f.symbol === this._armorFilterSymbol);
    const base = $dataArmors[item.baseItemId] || item;
    return !rule || rule.tag.test(base.note || '');
  }
  return false;
};
Window_MapSelectEquip.prototype.isEnabled = function(item) {
  if (!item) return false;
  if (!this._batchSelect) {
    if (this._type === 'WEAPONS') return !$gameParty.leader().isEquipTypeLocked(1);
    if (this._type === 'ARMORS') return !$gameParty.leader().isEquipTypeLocked(2);
  }
  return $gameSystem.getMapSelectEquipEnable() || Window_ItemList.prototype.isEnabled.call(this, item);
};
Window_MapSelectEquip.prototype.drawItem = function(index) {
  const item = this._data[index];
  if (!item) return;
  const rect = this.itemRect(index);
  const icon = this.itemIconRect(index);
  this.changePaintOpacity(this.isEnabled(item));
  this.drawIcon(item.iconIndex, icon.x, icon.y);
  if ($gameSwitches.value(444) && DataManager.isWeapon(item) && item.durMax > 0) {
    const rate = Math.floor((item.durability || 0) / item.durMax * 100);
    this.contents.fontFace = 'MPLUS2ExtraBold';
    this.contents.fontSize = 12;
    this.contents.textColor = rate > 40 ? '#ffffff' : rate > 20 ? '#ffcfd7' : rate > 5 ? '#ff738a' : '#ff0000';
    this.contents.drawText(rate + '%', icon.x, icon.y + icon.height - 18, icon.width, 18, 'right');
    this.resetFontSettings();
  }
  if ($gameSystem.getMapSelectEquipQuantity()) this.drawItemNumber(item, rect.x, icon.y + 46, rect.width - 4);
  this.changePaintOpacity(true);
};
Window_MapSelectEquip.prototype.paint = function() {
  Window_Selectable.prototype.paint.call(this);
  if (this._batchMarkerLayer) this.refreshBatchMarkers();
};
Window_MapSelectEquip.prototype.refreshBatchMarkers = function() {
  if (!this._batchMarkerLayer) return;
  for (const sprite of this._batchMarkerSprites) sprite.visible = false;
  this.updateBatchMarkerLayer();
  if (!this._batchSelect || !this.arrItem.length) return;
  const selected = new Set(this.arrItem);
  const first = this.topIndex();
  const end = Math.min(this.maxItems(), first + this.maxVisibleItems());
  let slot = 0;
  for (let index = first; index < end; index++) {
    if (!selected.has(this._data[index].id)) continue;
    let sprite = this._batchMarkerSprites[slot];
    if (!sprite) {
      sprite = new Sprite(this._batchCursorBitmap);
      sprite.blendMode = PIXI.BLEND_MODES.ADD;
      // The shared cursor resource is 112px; Sprite handles its async loading.
      sprite.scale.set(Yanfly.MSE.Layout.markerSize / 112);
      this._batchMarkerLayer.addChild(sprite);
      this._batchMarkerSprites.push(sprite);
    }
    const marker = this.itemMarkerRect(index);
    sprite.move(marker.x, marker.y);
    sprite._mseItemIndex = index;
    sprite.visible = true;
    slot++;
  }
};
Window_MapSelectEquip.prototype.updateBatchMarkerLayer = function() {
  const layer = this._batchMarkerLayer;
  if (!layer) return;
  layer.move(this.padding - this.origin.x, this.padding - this.origin.y);
  layer.alpha = this.contentsOpacity / 255;
  layer.visible = this._batchSelect && this.isOpen();
};
// Drill owns the ordinary cursor; batch membership keeps its persistent markers.
Window_MapSelectEquip.prototype.drill_MCu_cursorStyleId = function() { return 6; };
Window_MapSelectEquip.prototype.drill_MCu_cursorEnabled = function() {
  if (this._batchSelect || this.index() < 0) return false;
  const icon = this.itemIconRect(this.index());
  const y = icon.y - this.origin.y;
  return y >= 0 && y + icon.height <= this.innerHeight;
};
Window_MapSelectEquip.prototype._updateCursor = function() {
  this._cursorSprite.visible = false;
};
Window_MapSelectEquip.prototype.updateDrillCursor = function() {
  const bean = this._drill_MCu_bean;
  if (!bean) return;
  bean.drill_bean_setEnable(this.drill_MCu_isEnabled());
  if (!bean._drill_enabled) return;
  const icon = this.itemIconRect(this.index());
  // The panel origin is (0,0). Use the current MZ contents scroll origin.
  bean.drill_bean_setCenterPosition(
    this.x + this.padding + icon.x + icon.width / 2 - this.origin.x,
    this.y + this.padding + icon.y + icon.height / 2 - this.origin.y);
  bean.drill_bean_setRect(icon.x, icon.y, icon.width, icon.height);
  bean.drill_bean_setIndex(this.index());
};
Window_MapSelectEquip.prototype.drill_MSB_scrollBarStyleId = function() { return 2; };
// Focus changes never alter batch membership.
Window_MapSelectEquip.prototype.toggleBatchSelectedItem = function() {
  const item = this.item();
  if (!item || !this.isCurrentItemEnabled()) {
    SoundManager.playBuzzer();
  } else {
    const index = this.arrItem.indexOf(item.id);
    if (index >= 0) { this.arrItem.splice(index, 1); SoundManager.playCancel(); }
    else { this.arrItem.push(item.id); SoundManager.playOk(); }
    this.refresh();
  }
  this.activate();
};
Window_MapSelectEquip.prototype.playOkSound = function() {
  if (!this._batchSelect) Window_Selectable.prototype.playOkSound.call(this);
};
Window_MapSelectEquip.prototype.onTouchSelect = function(trigger) {
  if (!trigger) {
    if (this._drill_lastHoverX === TouchInput.x && this._drill_lastHoverY === TouchInput.y) return;
    this._drill_lastHoverX = TouchInput.x;
    this._drill_lastHoverY = TouchInput.y;
  }
  Window_Selectable.prototype.onTouchSelect.call(this, trigger);
};
// MZ confirms on release: one batch tap toggles, a swipe never confirms.
Window_MapSelectEquip.prototype.isTouchOkEnabled = function() {
  return !this._mseDidSwipe && (this._batchSelect || Window_Selectable.prototype.isTouchOkEnabled.call(this));
};
Window_MapSelectEquip.prototype.processWheelScroll = function() {
  if (!this.isOpenAndActive() || !this.isTouchedInsideFrame() || !this.maxItems()) return;
  if (Math.abs(TouchInput.wheelY) < 20) return;
  const current = Math.max(0, this.index());
  const next = Math.max(0, Math.min(this.maxItems() - 1,
    current + (TouchInput.wheelY > 0 ? this.maxCols() : -this.maxCols())));
  if (next !== this.index()) { this.forceSelect(next); SoundManager.playCursor(); }
};
Window_MapSelectEquip.prototype.close = function() {
  this.deactivate();
  this._mseSwipeTracking = false;
  this.arrItem = [];
  this.select(-1);
  Window_Base.prototype.close.call(this);
  this._batchSelect = false;
  this.destroyBatchMarkers();
};
Window_MapSelectEquip.prototype.update = function() {
  if (TouchInput.isTriggered()) this._mseDidSwipe = false;
  this.updateSwipePaging();
  Window_ItemList.prototype.update.call(this);
  // MZ updates scrolling and keyboard/touch selection after Drill's updateArrows.
  this.updateDrillCursor();
  if (this._batchMarkerLayer) this.updateBatchMarkerLayer();
};
Window_MapSelectEquip.prototype.updateSwipePaging = function() {
  if (!Yanfly.Param.MSESwipePaging || !this.isOpenAndActive()) {
    this._mseSwipeTracking = false;
    return;
  }

  // 同时兼容 MZ 原生输入和 Drill_CoreOfInput 的物理左键状态。
  // 工程中的多层输入插件会包装 TouchInput，不能只依赖单帧 isMoved()。
  const drillTrigger = TouchInput.drill_isLeftTriggerd &&
    TouchInput.drill_isLeftTriggerd();
  const drillPressed = TouchInput.drill_isLeftPressed &&
    TouchInput.drill_isLeftPressed();
  const drillReleased = TouchInput.drill_isLeftReleased &&
    TouchInput.drill_isLeftReleased();
  const isTriggered = TouchInput.isTriggered() || drillTrigger;
  const isPressed = TouchInput.isPressed() || drillPressed;
  const isReleased = TouchInput.isReleased() || drillReleased;

  if (isTriggered) {
    const onScrollBar = this.drill_MSB_isOnRange &&
      this.drill_MSB_isOnRange() === true;
    this._mseSwipeTracking = this.isTouchedInsideFrame() && !onScrollBar;
    this._mseSwipeStartY = TouchInput.y;
  }

  if (!this._mseSwipeTracking) return;

  if (isReleased || !isPressed) {
    this._mseSwipeTracking = false;
    return;
  }

  // 直接使用坐标差判断拖动；PC 鼠标和安卓触屏走同一套逻辑。
  const deltaY = TouchInput.y - this._mseSwipeStartY;
  if (Math.abs(deltaY) < Yanfly.Param.MSESwipeThreshold) return;

  this._mseDidSwipe = true;
  const oldTopRow = this.topRow();
  const pageRows = Math.max(1, this.maxPageRows());
  const targetTopRow = deltaY < 0 ?
    Math.min(oldTopRow + pageRows, this.maxTopRow()) :
    Math.max(oldTopRow - pageRows, 0);

  if (targetTopRow === oldTopRow) {
    // 已到边界时重新记录起点，反向拖动一个阈值后即可立即往回翻。
    this._mseSwipeStartY = TouchInput.y;
    return;
  }

  // 按下时标准触摸逻辑可能已选中手指下方的装备。翻页前取消选中，
  // 避免 ensureCursorVisible 又把新页面拉回旧位置；滑动也不会触发装备确认。
  this.select(-1);
  this.setTopRow(targetTopRow);
  SoundManager.playCursor();

  // 只消耗本次翻页所需的距离，保留多余拖动量。
  // 因此手指保持按住并继续移动时，会每跨过一个阈值持续翻页；
  // 单帧移动很远时，也会在后续帧逐页追上，而不是丢失距离。
  this._mseSwipeStartY += deltaY < 0 ?
    -Yanfly.Param.MSESwipeThreshold : Yanfly.Param.MSESwipeThreshold;
};



function Window_MapSelectAction() { this.initialize(...arguments); }
Window_MapSelectAction.prototype = Object.create(Window_Command.prototype);
Window_MapSelectAction.prototype.constructor = Window_MapSelectAction;
Window_MapSelectAction.prototype.initialize = function() {
  Window_Command.prototype.initialize.call(this, new Rectangle(0, 0, 544, 160));
  this.opacity = 0;
  this._labelSprite = new Sprite(new Bitmap(this.innerWidth, this.innerHeight));
  this._clientArea.addChild(this._labelSprite);
  this._actionBitmaps = ['equipItem', 'discardItem'].map(name => ImageManager.loadSystem(name));
  for (const bitmap of this._actionBitmaps) bitmap.addLoadListener(() => this.refresh());
  this.close();
  this.hide();
  this.deactivate();
};
Window_MapSelectAction.prototype.makeCommandList = function() {
  const labels = {
    0: ['装备', '丢弃'], 1: ['装備', '捨てる'], 3: ['Экипировать', 'Выбросить'],
    4: ['Équiper', 'Jeter'], 5: ['Trang bị', 'Vứt bỏ'], 12: ['裝備', '丟棄']
  }[ConfigManager.language]
    || ['Equip', 'Discard'];
  this.addCommand(labels[0], 'equip');
  this.addCommand(labels[1], 'discard');
};
Window_MapSelectAction.prototype.maxCols = function() { return 2; };
Window_MapSelectAction.prototype.itemHeight = function() { return 136; };
Window_MapSelectAction.prototype.drawItemBackground = function() {};
Window_MapSelectAction.prototype.drawItem = function(index) {
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
Window_MapSelectAction.prototype.refresh = function() {
  if (this._labelSprite) this._labelSprite.bitmap.clear();
  Window_Command.prototype.refresh.call(this);
};
Window_MapSelectAction.prototype.releaseTextGlow = function() {
  if (!this._textGlowFilter) return;
  this._labelSprite.filters = null;
  const renderer = Graphics.app && Graphics.app.renderer;
  if (renderer && renderer.shader && renderer.shader.shader === this._textGlowFilter) renderer.shader.reset();
  this._textGlowFilter.destroy();
  this._textGlowFilter = null;
};
Window_MapSelectAction.prototype.close = function() {
  this.releaseTextGlow();
  Window_Command.prototype.close.call(this);
};
Window_MapSelectAction.prototype.destroy = function(options) {
  this.releaseTextGlow();
  if (this._labelSprite) {
    this._labelSprite.bitmap.destroy();
    this._labelSprite.bitmap = null;
  }
  Window_Command.prototype.destroy.call(this, options);
};
Window_MapSelectAction.prototype.drill_MCu_cursorEnabled = function() { return false; };
Window_MapSelectAction.prototype.setup = function() {
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
// Fixed right-hand equipment description. Coordinates are relative to the
// shared layout origin; the containing scene/panel itself stays at (0, 0).
function Window_MapSelectEquipHelp() {
  this.initialize.apply(this, arguments);
}

Window_MapSelectEquipHelp.prototype = Object.create(Window_Help.prototype);
Window_MapSelectEquipHelp.prototype.constructor = Window_MapSelectEquipHelp;

Window_MapSelectEquipHelp.prototype.initialize = function() {
  const layout = Yanfly.MSE.Layout;
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

Window_MapSelectEquipHelp.prototype.contentsHeight = function() {
  return Math.max(this.innerHeight, this._scrollBitmapHeight || 0);
};

// Wrap while the installed text engine processes the string. Soft line breaks
// retain its current font, color and emphasis, and use the same path when
// measuring and drawing. Existing source newlines and relative PX/PY survive.
Window_MapSelectEquipHelp.prototype.createTextState = function(text, x, y, width) {
  const state = Window_Base.prototype.createTextState.call(this, text, x, y, width);
  state._mseWrap = this._mseWrapping && !this.drill_COWA_isCalculating();
  state._mseWordEnd = 0;
  return state;
};

Window_MapSelectEquipHelp.prototype.wrapBefore = function(state, width) {
  if (!state._mseWrap) return;
  const used = Math.abs(state.x - state.startX) + this.textWidth(state.buffer);
  if (used > 0 && used + width > this._descriptionWidth) {
    this.flushTextState(state);
    this.processNewLine(state);
    state._mseSoftLineStart = true;
  }
};

Window_MapSelectEquipHelp.prototype.processCharacter = function(state) {
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

Window_MapSelectEquipHelp.prototype.processDrawIcon = function(iconIndex, state) {
  // Drill_DialogSpecialCharSize is enabled with font-sized inline icons.
  this.wrapBefore(state, this.contents.fontSize + 4);
  state._mseSoftLineStart = false;
  Window_Base.prototype.processDrawIcon.call(this, iconIndex, state);
};

Window_MapSelectEquipHelp.prototype.processDrawBigImage = function(id, state, offsetX, offsetY) {
  this.wrapBefore(state, id === 10 ? DrillUp.g_DTBI_bitmaps[9].width : 32);
  state._mseSoftLineStart = false;
  Window_Base.prototype.processDrawBigImage.call(this, id, state, offsetX, offsetY);
};

// A leading FR/FS applies before any visible glyph on the line. Counting the
// previous line's larger font creates artificial gaps in the narrow panel.
Window_MapSelectEquipHelp.prototype.calcTextHeight = function(state) {
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

Window_MapSelectEquipHelp.prototype.drawFixedTitle = function(text) {
  const previous = this._fixedTitleSprite.bitmap;
  this._fixedTitleSprite.bitmap = null;
  if (previous) previous.destroy();
  this._drill_DFF_activeFont = null;
  const size = text ? this.textSizeEx(text) : { width: 0, height: 0 };
  const bitmap = new Bitmap(Math.max(this.innerWidth, Math.ceil(size.width)), Yanfly.MSE.Layout.titleHeight);
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

Window_MapSelectEquipHelp.prototype.refresh = function() {
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

Window_MapSelectEquipHelp.prototype.resetAutoScroll = function() {
  this._scrollOffset = 0;
  this._scrollDirection = 1;
  this._scrollWait = 0;
  if (this.origin) this.origin.y = 0;
  if (this._contentsSprite) this._contentsSprite.y = 0;
};

Window_MapSelectEquipHelp.prototype.open = function() {
  if (!this.isOpen()) this.resetAutoScroll();
  if (!this._textGlowFilter) {
    this._plainClientFilters = this._clientArea.filters;
    this._textGlowFilter = new PIXI.filters.GlowFilter({
      distance: 6, outerStrength: 3, innerStrength: 0,
      color: 0x000000, quality: 0.2
    });
    // Title, body and inline icons share the glow; the panel is outside this layer.
    this._clientArea.filters = [this._textGlowFilter];
  }
  Window_Help.prototype.open.call(this);
};
Window_MapSelectEquipHelp.prototype.releaseTextGlow = function() {
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
Window_MapSelectEquipHelp.prototype.close = function() {
  this.releaseTextGlow();
  Window_Help.prototype.close.call(this);
};

Window_MapSelectEquipHelp.prototype.update = function() {
  Window_Help.prototype.update.call(this);
  this.updateAutoScroll();
};

Window_MapSelectEquipHelp.prototype.updateAutoScroll = function() {
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

Window_MapSelectEquipHelp.prototype.destroy = function(options) {
  this.releaseTextGlow();
  if (this._fixedTitleSprite && this._fixedTitleSprite.bitmap) {
    this._fixedTitleSprite.bitmap.destroy();
    this._fixedTitleSprite.bitmap = null;
  }
  Window_Help.prototype.destroy.call(this, options);
};

// Root stays at (0,0): Drill scrollbar hit testing reads absolute window.x/y.
Yanfly.MSE.Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
  Yanfly.MSE.Scene_Map_createAllWindows.call(this);
  this.createMapSelectEquipWindow();
};
Scene_Map.prototype.createMapSelectEquipWindow = function() {
  const l = Yanfly.MSE.Layout;
  const panel = this._mapSelectEquipPanel = new Sprite();
  panel.visible = false;
  this.addChild(panel);
  const background = new Sprite(ImageManager.loadSystem('rpgCommonWindowLayout'));
  background.move(l.x, l.y);
  panel.addChild(background);
  this._mapSelectEquipDecoration = new Sprite();
  this._mapSelectEquipDecoration.anchor.set(0.5);
  this._mapSelectEquipDecoration.move(l.x + l.listCenterX, l.y + l.decorationY);
  this._mapSelectEquipDecoration.opacity = 120;
  panel.addChild(this._mapSelectEquipDecoration);
  this._mapSelectEquipHelpWindow = new Window_MapSelectEquipHelp();
  panel.addChild(this._mapSelectEquipHelpWindow);
  const ew = this._MapSelectEquipWindow = new Window_MapSelectEquip();
  ew.setHandler('ok', this.onMapSelectEquipOk.bind(this));
  ew.setHandler('cancel', this.onMapSelectEquipCancel.bind(this));
  ew.setHelpWindow(this._mapSelectEquipHelpWindow);
  panel.addChild(ew);
  const count = this._mapSelectEquipCount = new Sprite(new Bitmap(140, 32));
  const lastRowIcon = ew.itemIconRect((l.rows - 1) * l.columns);
  const gridBottom = ew.y + ew.padding + lastRowIcon.y + lastRowIcon.height;
  // Center in the gap below the fifth row; exclude the background's 15px shadow.
  const panelBottom = l.y + l.height - 15;
  count.move(l.x + l.listCenterX - count.bitmap.width / 2,
    (gridBottom + panelBottom - count.bitmap.height) / 2);
  panel.addChild(count);
  this._mapSelectEquipFilters = [0, 1, 2].map(i => {
    const button = new Sprite();
    button.anchor.set(0.5, 0);
    button.move(l.x + l.listCenterX + (i - 1) * l.filterStep, l.y + l.filterY);
    panel.addChild(button);
    return button;
  });
  this.createMapSelectActionWindow();
};
Scene_Map.prototype.createMapSelectActionWindow = function() {
  const aw = this._MapSelectActionWindow = new Window_MapSelectAction();
  // Center the two actions in the footer below the equipment grid.
  const count = this._mapSelectEquipCount;
  aw.x = Yanfly.MSE.Layout.x + Yanfly.MSE.Layout.listCenterX - aw.width / 2;
  aw.y = count.y + count.bitmap.height / 2 - aw.height / 2;
  aw.setHandler('equip', this.onActionEquip.bind(this));
  aw.setHandler('discard', this.onActionDiscard.bind(this));
  aw.setHandler('cancel', this.onActionCancel.bind(this));
  this._mapSelectEquipPanel.addChild(aw);
};
Scene_Map.prototype.setupMapSelectEquip = function(varId, type, base, batchSelect) {
  if (!varId || !type || !this._MapSelectEquipWindow.isClosed()) return;
  this._MapSelectEquipWindow.setup(varId, type, base, batchSelect);
  this._MapSelectEquipWindow.show();
  this._mapSelectEquipCount.visible = true;
  this._mapSelectEquipPanel.visible = true;
  this._mapSelectEquipHelpWindow.setItem(null);
  this._mapSelectEquipHelpWindow.open();
  const l = Yanfly.MSE.Layout;
  this._mapSelectEquipDecoration.bitmap = ImageManager.loadSystem(
    this._MapSelectEquipWindow._type === 'ARMORS' ? l.armorDecoration : l.weaponDecoration);
  const rules = Yanfly.MSE.Filters[this._MapSelectEquipWindow._type] || [];
  this._mapSelectEquipFilters.forEach((button, i) => {
    const rule = rules[i];
    button.visible = !!rule;
    button._symbol = rule?.symbol;
    button.bitmap = rule ? ImageManager.loadSystem(rule.image) : null;
  });
  this.refreshMapSelectEquipFilters();
  this.refreshMapSelectEquipCount();
  this._active = false;
};
Scene_Map.prototype.refreshMapSelectEquipCount = function() {
  const type = this._MapSelectEquipWindow._type;
  const bm = this._mapSelectEquipCount.bitmap;
  bm.clear();
  if (type === 'BOTH') return;
  const actor = $gameParty.leader();
  const weapon = type === 'WEAPONS';
  const count = Object.keys(weapon ? $gameParty._weapons : $gameParty._armors).length;
  const capacity = weapon ? actor._weaponAmountLimit + (actor._weaponAmountBonus || 0) :
    actor._armorAmountLimit + (actor._armorAmountBonus || 0);
  bm.fontFace = 'Madou Futo Maru Gothic';
  bm.fontSize = 22;
  bm.textColor = '#b7b6b6';
  bm.outlineWidth = 0;
  bm.drawText(count + '/' + capacity, 0, 0, bm.width, bm.height, 'center');
};
Scene_Map.prototype.refreshMapSelectEquipFilters = function() {
  const ew = this._MapSelectEquipWindow;
  const weapon = ew._type === 'WEAPONS';
  const selected = weapon ? ew.weaponFilterSymbol() : ew.armorFilterSymbol();
  this._mapSelectEquipFilters.forEach(button => {
    button.opacity = selected === button._symbol ? 255 : weapon ? 120 : 100;
  });
};
Scene_Map.prototype.onMapSelectEquipFilterClick = function(symbol) {
  const ew = this._MapSelectEquipWindow;
  if (!ew.isOpenAndActive() || this._MapSelectActionWindow.active) return;
  if (ew._type === 'WEAPONS') ew.toggleWeaponFilter(symbol);
  else if (ew._type === 'ARMORS') ew.toggleArmorFilter(symbol);
  else return;
  this.refreshMapSelectEquipFilters();
  AudioManager.playSe({ name: 'Equip2', volume: 80, pitch: 90 + Math.randomInt(30), pan: 0 });
};
Yanfly.MSE.Scene_Map_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
  const ew = this._MapSelectEquipWindow;
  if (ew?.isOpenAndActive() && TouchInput.isTriggered()) {
    const button = this._mapSelectEquipFilters.find(b => b.visible &&
      TouchInput.x >= b.x - Yanfly.MSE.Layout.filterStep / 2 &&
      TouchInput.x < b.x + Yanfly.MSE.Layout.filterStep / 2 &&
      TouchInput.y >= b.y && TouchInput.y < b.y + 70);
    if (button) { TouchInput.clear(); this.onMapSelectEquipFilterClick(button._symbol); }
  }
  Yanfly.MSE.Scene_Map_update.call(this);
  // Map events can call setup after the child update, while openness is still 0.
  // Panel visibility is owned by setupMapSelectEquip / closeMapSelectEquip.
};
Scene_Map.prototype.processMapSelectEquipOk = function() {
  const ew = this._MapSelectEquipWindow;
  const item = ew.item();
  const id = item ? ew._base && item.baseItemId ? item.baseItemId : item.id : 0;
  if (Imported.YEP_SelfSwVar) {
    $gameTemp.clearSelfSwVarEvBridge();
    $gameTemp.clearSelfSwVarEvent();
  }
  $gameVariables.setValue(ew._varId, id);
  return id;
};
Scene_Map.prototype.closeMapSelectEquip = function() {
  this._MapSelectActionWindow.deactivate();
  this._MapSelectActionWindow.close();
  this._MapSelectActionWindow.hide();
  this._MapSelectEquipWindow.close();
  this._mapSelectEquipHelpWindow.close();
  this._mapSelectEquipPanel.visible = false;
  this._active = true;
};
Scene_Map.prototype.onMapSelectEquipCancel = function() {
  const ew = this._MapSelectEquipWindow;
  if (ew._batchSelect) $gameNumberArray.setValue(22, ew.arrItem.slice());
  $gameVariables.setValue(ew._varId, 0);
  TouchInput.clear();
  this.closeMapSelectEquip();
};
Scene_Map.prototype.onActionDiscard = function() {
  $gameSwitches.setValue(113, true);
  this.processMapSelectEquipOk();
  this.closeMapSelectEquip();
};
Scene_Map.prototype.onActionEquip = function() {
  this.processMapSelectEquipOk();
  this.closeMapSelectEquip();
};
Scene_Map.prototype.onActionCancel = function() {
  this._MapSelectActionWindow.deactivate();
  this._MapSelectActionWindow.close();
  this._MapSelectActionWindow.hide();
  this._MapSelectEquipWindow.show();
  this._mapSelectEquipCount.visible = true;
  this._MapSelectEquipWindow.activate();
};
Scene_Map.prototype.onMapSelectEquipOk = function() {
  const ew = this._MapSelectEquipWindow;
  if (ew._batchSelect) return ew.toggleBatchSelectedItem();
  if (!ew.item()) { SoundManager.playBuzzer(); ew.activate(); return; }
  ew.deactivate();
  this._mapSelectEquipCount.visible = false;
  this._MapSelectActionWindow.setup();
};
