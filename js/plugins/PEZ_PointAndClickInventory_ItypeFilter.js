//=============================================================================
// PEZ_PointAndClickInventory - Event Item Type Filter (Graphic Buttons)
//=============================================================================
/*:
 * @plugindesc v1.00 Add 3 graphic item-type filter buttons to the
 * "Select Item" command window customized by PEZ_PointAndClickInventory.
 * Place BELOW PEZ_PointAndClickInventory.js
 * @author ChatGPT
 *
 * @help
 * This is an add-on patch for your customized PEZ_PointAndClickInventory.js.
 *
 * What it does:
 *  - Disables the old custom "switch" button logic you added previously
 *    (createswitchButton / onswitchButtonPressed), since the new filter buttons
 *    replace that function.
 *  - Adds 3 graphic buttons that map to the Event "Select Item" categories:
 *      1) 普通物品 (Regular)  -> itypeId 1
 *      2) 重要物品 (Key)      -> itypeId 2
 *      3) 隐藏物品 (Hidden)   -> itypeId 3 or 4
 *  - When the window opens, the button matching the event command's
 *    item type will be highlighted automatically.
 *  - Clicking a button switches the list to that category.
 *  - Adds a batch-select button. In batch mode, clicking items toggles their
 *    selection marker instead of closing the choice window; clicking the
 *    batch-select button again commits all selected item IDs.
 *
 * IMPORTANT:
 *  - This window still does NOT support showing all items at once.
 *    The buttons only switch between the three types.
 *
 * Graphic assets:
 *  Put these images (no extension) into img/system/:
 *    IFilter_Normal
 *    IFilter_Key
 *    IFilter_Hidden
 *    IFilter_Multi
 *    IFilter_Multi_Active
 *
 * You can rename them by editing IMAGE_NAMES below.
 *
 * Position tweak:
 *  Adjust BAR_OFFSET_X / BAR_OFFSET_Y / BAR_GAP_X below.
 */
//=============================================================================

var Imported = Imported || {};
Imported.PEZ_PointAndClickInventory_ItypeFilter = true;

(function() {
  if (!Imported.PEZ_PointAndClickInventory) {
    console.warn('PEZ_PointAndClickInventory_ItypeFilter: Missing base plugin.');
    return;
  }

  // --------------------------------------------------------------------------
  // Config
  // --------------------------------------------------------------------------
  const IMAGE_NAMES = {
    normal: 'IFilter_Normal',
    key:    'IFilter_Key',
    hidden: 'IFilter_Hidden'
  };

  const MULTI_SELECT_IMAGE_NAMES = {
    inactive: 'IFilter_Multi',
    active:   'IFilter_Multi_Active'
  };

  const INACTIVE_OPACITY = 100;
  const ACTIVE_OPACITY   = 255;

  // Position of the button bar relative to the Window_EventItem origin.
  // The bar is laid out horizontally: normal, key, hidden.
  const BAR_OFFSET_X = 185;
  const BAR_OFFSET_Y = -80;
  const BAR_GAP_X    = 50;

  const MULTI_SELECT_OFFSET_X = 238;
  const MULTI_SELECT_OFFSET_Y = 350;

  // If you want to hide these buttons during specific modes,
  // you can add your own condition here.
  function shouldShowItypeButtons() {
    // 自定义物品清单模式下，类型按钮无意义，隐藏
    if ($gameNumberArray && typeof $gameNumberArray.value === 'function') {
      const goods = $gameNumberArray.value(25);
      if (Array.isArray(goods) && goods.length > 0) return false;
    }
    if ($gameMap.chahuiMapTemp?.isQuestList) return false;
    return true;
  }

  function symbolFromItypeId(itypeId) {
	if (itypeId === 1) return 'normal';  
    if (itypeId === 2) return 'key';
    if (itypeId === 3) return 'hidden';
    return '';
  }

  function itypeIdsFromSymbol(symbol) {
	if (symbol === 'normal')   return [1];  
    if (symbol === 'key')      return [2];
    if (symbol === 'hidden')   return [3];
    return [0];
  }

  // --------------------------------------------------------------------------
  // Create new filter buttons
  // --------------------------------------------------------------------------
  const _WEI_initialize = Window_EventItem.prototype.initialize;
  Window_EventItem.prototype.initialize = function(messageWindow) {
    _WEI_initialize.call(this, messageWindow);
    this._pezItypeSymbol = null;
    this._pezMultiSelectMode = false;
    this._pezMultiSelectedIndexes = [];
    this._pezMultiCursorSprites = {};
    this.createItypeFilterButtons();
    this.createMultiSelectButton();
    this.updateItypeFilterButtonVisuals();
    this.updateMultiSelectButtonVisuals();
    this.hideItypeFilterButtons();
    this.hideMultiSelectButton();
  };

  Window_EventItem.prototype.createItypeFilterButtons = function() {
    this._pezItypeButtons = this._pezItypeButtons || {};

    const makeBtn = (symbol, index, handler) => {
      const btn = new Sprite_WindowButton();
      btn.bitmap = ImageManager.loadSystem(IMAGE_NAMES[symbol] || '');
      btn.x = BAR_OFFSET_X + BAR_GAP_X * index;
      btn.y = BAR_OFFSET_Y;
      btn.setClickHandler(handler.bind(this));
      btn.visible = false;
      this.addChild(btn);
      this._pezItypeButtons[symbol] = btn;
    };

    makeBtn('normal', 0, this.onItypeNormalPressed);
    makeBtn('key',    1, this.onItypeKeyPressed);
    makeBtn('hidden', 2, this.onItypeHiddenPressed);
  };

  Window_EventItem.prototype.createMultiSelectButton = function() {
    this._pezMultiSelectButton = new Sprite_WindowButton();
    this._pezMultiSelectButton.x = MULTI_SELECT_OFFSET_X;
    this._pezMultiSelectButton.y = MULTI_SELECT_OFFSET_Y;
    this._pezMultiSelectButton.setClickHandler(this.onMultiSelectButtonPressed.bind(this));
    this._pezMultiSelectButton.visible = false;
    this.addChild(this._pezMultiSelectButton);
  };

  Window_EventItem.prototype.showItypeFilterButtons = function() {
    if (!this._pezItypeButtons) return;
    if (!shouldShowItypeButtons()) return;
    Object.keys(this._pezItypeButtons).forEach(symbol => {
      const btn = this._pezItypeButtons[symbol];
      if (btn) btn.visible = true;
    });
  };

  Window_EventItem.prototype.hideItypeFilterButtons = function() {
    if (!this._pezItypeButtons) return;
    Object.keys(this._pezItypeButtons).forEach(symbol => {
      const btn = this._pezItypeButtons[symbol];
      if (btn) btn.visible = false;
    });
  };

  Window_EventItem.prototype.showMultiSelectButton = function() {
    // 下一次打开物品选择时隐藏多选按钮；先消耗标记，避免延续到下次。
    const mapTemp = $gameMap.chahuiMapTemp;
    if (mapTemp?.hideItemMultiSelectButton === true) {
      mapTemp.hideItemMultiSelectButton = null;
      this.hideMultiSelectButton();
      return;
    }

    // 目前只有自定义列表（商品列表）需要批量选择
    if ($gameMap.chahuiMapTemp?.isQuestList || shouldShowItypeButtons() || !$gameSwitches.value(3)) {
        this._pezMultiSelectButton.visible = false; 
        return;
    }

    // 追加显示教程
    let text = window?.["mapCommonEventDialogue"]?.["bulkSelectButton"];
    if (!text) text = "Click to toggle bulk selection";
    let posX = 960;
    let posY = 600;
    $gameTemp.drill_GFTT_createSimple( [960, 680], text, 5, 8, 180 );    
    if (this._pezMultiSelectButton) this._pezMultiSelectButton.visible = true;
  };

  Window_EventItem.prototype.hideMultiSelectButton = function() {
    if (this._pezMultiSelectButton) this._pezMultiSelectButton.visible = false;
  };

  Window_EventItem.prototype.updateItypeFilterButtonVisuals = function() {
    const symbol = this._pezItypeSymbol;
    if (!this._pezItypeButtons) return;
    Object.keys(this._pezItypeButtons).forEach(s => {
      const btn = this._pezItypeButtons[s];
      if (!btn) return;
      btn.opacity = (symbol === s) ? ACTIVE_OPACITY : INACTIVE_OPACITY;
    });
  };

  Window_EventItem.prototype.updateMultiSelectButtonVisuals = function() {
    if (!this._pezMultiSelectButton) return;
    const key = this._pezMultiSelectMode ? 'active' : 'inactive';
    this._pezMultiSelectButton.bitmap = ImageManager.loadSystem(MULTI_SELECT_IMAGE_NAMES[key]);
    this._pezMultiSelectButton.opacity = ACTIVE_OPACITY;
  };

  Window_EventItem.prototype.applyItypeFilterSymbol = function(symbol) {

	if ( $gameSwitches.value(30) || $gameSwitches.value(55) ) {
        AudioManager.playSe({ name: "013myuu_YumeSE_SystemBuzzer02", volume: 80, pitch: 100, pan: 0 });  
		return;
	}		
	  
	if ($gameNumberArray && $gameNumberArray.value(25).length > 0) {
        AudioManager.playSe({ name: "013myuu_YumeSE_SystemBuzzer02", volume: 80, pitch: 100, pan: 0 });  
		return;
	}		

	if ($gameMessage._itemChoiceCustomType) {
        AudioManager.playSe({ name: "013myuu_YumeSE_SystemBuzzer02", volume: 80, pitch: 100, pan: 0 });  
		return;
	}
	  
	AudioManager.playSe({ name: "Equip2", volume: 80, pitch: 90+Math.randomInt(30), pan: 0 });  
    this._pezItypeSymbol = symbol || 'normal';
    this.updateItypeFilterButtonVisuals();
    // 强制重建 + 刷新
    if (this.makeItemList) this.makeItemList();
    this.refresh();
    this.select(0);
  };

  Window_EventItem.prototype.onMultiSelectButtonPressed = function() {
    if (this._pezMultiSelectMode) {
      const hasSelection = (this._pezMultiSelectedIndexes || []).some(index => {
        const item = this._data && this._data[index];
        return item && item.id > 0;
      });
      if (hasSelection) {
        // 有选中项时，按钮点击等同于按 X 键 / 鼠标右键：
        // 走 processCancel 路径，确保 TouchInput 状态被清理，避免事件流程卡住。
        this.processCancel();
      } else {
        this.finishMultiSelect(false);
      }
    } else {
      this.startMultiSelect();
    }
  };

  Window_EventItem.prototype.startMultiSelect = function() {
    this._pezMultiSelectMode = true;
    this._pezMultiSelectedIndexes = [];
    this.clearPezMultiSelectCursorSprites();
    this.updateMultiSelectButtonVisuals();
    this.refresh();
    this.activate();
    AudioManager.playSe({ name: "Equip2", volume: 80, pitch: 90 + Math.randomInt(30), pan: 0 });
  };

  Window_EventItem.prototype.finishMultiSelect = function(cancelIfEmpty) {
    const codes = (this._pezMultiSelectedIndexes || []).map(index => {
      const item = this._data[index];
      return item && PEZ.encodeShopGoods ? PEZ.encodeShopGoods(item) : 0;
    }).filter(code => code > 0);
    this._pezMultiSelectMode = false;
    this.updateMultiSelectButtonVisuals();
    this.clearPezMultiSelectCursorSprites();
    this.refresh();

    if (codes.length > 0) {
      const value = codes.length === 1 ? codes[0] : codes.slice();
      $gameVariables.setValue($gameMessage.itemChoiceVariableId(), value);
      this._messageWindow.terminateMessage();
      this.close();
    } else if (cancelIfEmpty) {
      $gameVariables.setValue($gameMessage.itemChoiceVariableId(), 0);
      this._messageWindow.terminateMessage();
      this.close();
    } else {
      this.activate();
    }
  };

  Window_EventItem.prototype.toggleMultiSelectedItem = function() {
    const slotIndex = this.index();
    const item = this.item && this.item();
    if (slotIndex < 0 || !item || !this.isCurrentItemEnabled || !this.isCurrentItemEnabled()) {
      SoundManager.playBuzzer();
      this.activate();
      return;
    }

    const indexes = this._pezMultiSelectedIndexes || [];
    const selectedIndex = indexes.indexOf(slotIndex);
    if (selectedIndex >= 0) {
      indexes.splice(selectedIndex, 1);
      SoundManager.playCancel();
      this._pezMultiSelectedIndexes = indexes;
      this.redrawItem(slotIndex);
      this.select(-1);
      this._touching = false;
      this.activate();
      return;
    } else {
      indexes.push(slotIndex);
      SoundManager.playOk();
    }
    this._pezMultiSelectedIndexes = indexes;
    this.redrawItem(slotIndex);
    this.activate();
  };

  Window_EventItem.prototype.isPezMultiSelectedIndex = function(index) {
    return !!this._pezMultiSelectedIndexes && this._pezMultiSelectedIndexes.indexOf(index) >= 0;
  };

  Window_EventItem.prototype.drawPezMultiSelectCursor = function(index) {
    // Selection markers are drawn by Drill_MenuCursor sprites, not on contents.
  };

  Window_EventItem.prototype.isPezDrillCursorAvailable = function() {
    return Imported.Drill_MenuCursor === true &&
      typeof Drill_MCu_Controller !== 'undefined' &&
      typeof Drill_MCu_Sprite !== 'undefined' &&
      typeof DrillUp !== 'undefined' &&
      DrillUp.g_MCu_list;
  };

  Window_EventItem.prototype.pezDrillCursorStyleId = function() {
    if (this.drill_MCu_cursorStyleId) return this.drill_MCu_cursorStyleId();
    return $gameSystem && $gameSystem._drill_MCu_style ? $gameSystem._drill_MCu_style : 1;
  };

  Window_EventItem.prototype.pezDrillCursorData = function(styleId) {
    if (!this.isPezDrillCursorAvailable()) return null;
    const data = DrillUp.g_MCu_list[styleId - 1];
    return data ? JSON.parse(JSON.stringify(data)) : null;
  };

  Window_EventItem.prototype.createPezMultiSelectCursorSprite = function(slotIndex) {
    const styleId = this.pezDrillCursorStyleId();
    const data = this.pezDrillCursorData(styleId);
    if (!data) return null;

    const controller = new Drill_MCu_Controller(data);
    controller._drill_curStyleId = styleId;
    controller._drill_opacity = data.opacity_org || 255;
    controller._drill_lastOpacity = controller._drill_opacity;

    const sprite = new Drill_MCu_Sprite();
    sprite.drill_sprite_setController(controller);
    sprite.drill_sprite_initChild();
    sprite._drill_curSerial = controller._drill_controllerSerial;
    sprite.zIndex = 9999;
    this.addChild(sprite);

    return { sprite: sprite, controller: controller, styleId: styleId };
  };

  Window_EventItem.prototype.removePezMultiSelectCursorSprite = function(slotIndex) {
    if (!this._pezMultiCursorSprites) return;
    const marker = this._pezMultiCursorSprites[slotIndex];
    if (!marker) return;
    if (marker.sprite) {
      if (marker.sprite.drill_sprite_destroy) marker.sprite.drill_sprite_destroy();
      if (marker.sprite.parent) marker.sprite.parent.removeChild(marker.sprite);
    }
    delete this._pezMultiCursorSprites[slotIndex];
  };

  Window_EventItem.prototype.clearPezMultiSelectCursorSprites = function() {
    if (!this._pezMultiCursorSprites) {
      this._pezMultiCursorSprites = {};
      return;
    }
    Object.keys(this._pezMultiCursorSprites).forEach(id => {
      this.removePezMultiSelectCursorSprite(id);
    });
  };

  Window_EventItem.prototype.updatePezMultiSelectCursorSprites = function() {
    if (!this._pezMultiSelectMode || !this.isPezDrillCursorAvailable()) {
      this.clearPezMultiSelectCursorSprites();
      return;
    }

    this._pezMultiCursorSprites = this._pezMultiCursorSprites || {};
    const selectedIndexes = (this._pezMultiSelectedIndexes || []).filter(index => {
      return index >= 0 && this._data[index] && this._data[index].id > 0;
    });
    const selectedIndexMap = {};
    selectedIndexes.forEach(index => selectedIndexMap[index] = true);

    Object.keys(this._pezMultiCursorSprites).forEach(index => {
      if (!selectedIndexMap[index]) this.removePezMultiSelectCursorSprite(index);
    });

    const styleId = this.pezDrillCursorStyleId();
    selectedIndexes.forEach(slotIndex => {
      let marker = this._pezMultiCursorSprites[slotIndex];
      if (!marker || marker.styleId !== styleId) {
        this.removePezMultiSelectCursorSprite(slotIndex);
        marker = this.createPezMultiSelectCursorSprite(slotIndex);
        if (marker) this._pezMultiCursorSprites[slotIndex] = marker;
      }
      if (!marker) return;

      const visible = slotIndex >= 0 &&
        slotIndex !== this.index() &&
        slotIndex >= this.topIndex() &&
        slotIndex < this.topIndex() + this.maxPageItems();
      marker.controller._drill_data.visible = visible;
      if (!visible) {
        marker.sprite.visible = false;
        return;
      }

      const rect = this.itemRect(slotIndex);
      const data = marker.controller._drill_data;
      let x = this.padding + rect.x + rect.width * 0.5;
      let y = this.padding + rect.y + rect.height * 0.5;
      if (data.move_rectPos === "矩形左侧") x -= rect.width * 0.5;
      if (data.move_rectPos === "矩形右侧") x += rect.width * 0.5;
      if (data.move_rectPos === "矩形上侧") y -= rect.height * 0.5;
      if (data.move_rectPos === "矩形下侧") y += rect.height * 0.5;
      marker.controller._drill_x = x + (data.x || 0);
      marker.controller._drill_y = y + (data.y || 0);
      marker.controller._drill_opacity = marker.controller._drill_data.opacity_org || 255;
      marker.controller._drill_scaleX = 1;
      marker.controller._drill_scaleY = 1;
      marker.controller._drill_rotation = data.rotate || 0;
      marker.controller.drill_controller_updateGIF();
      marker.controller.drill_controller_updateEffect();
    });
  };

  Window_EventItem.prototype.onItypeNormalPressed = function() {
    this.applyItypeFilterSymbol('normal');
  };

  Window_EventItem.prototype.onItypeKeyPressed = function() {
    this.applyItypeFilterSymbol('key');
  };

  Window_EventItem.prototype.onItypeHiddenPressed = function() {
    this.applyItypeFilterSymbol('hidden');
  };

  // --------------------------------------------------------------------------
  // Use our symbol to filter includes
  // --------------------------------------------------------------------------
  
	Window_EventItem.prototype.pezItemPassesFilter = function(item) {
		
	  if (!item || !item.id) return false;
	  // 存在自定义物品清单设置时
	  let goods = ($gameNumberArray && typeof $gameNumberArray.value === 'function')
		? $gameNumberArray.value(25) : [];
	  if (Array.isArray(goods) && goods.length > 0) {
		const code = PEZ.encodeShopGoods ? PEZ.encodeShopGoods(item) : 0;
		return code > 0 && goods.some(value => Number(value) === code);
	  }

	  // 非自定义商品列表继续保持原版行为，只允许数据库物品。
	  if (!DataManager.isItem(item)) return false;

	  // 存在自定义条件筛选时
	  const customType = ($gameMessage && $gameMessage.itemChoiceCustomType)
		? $gameMessage.itemChoiceCustomType() : 0;

	  const customOk = !customType || customType == 0
		? true
		: (DataManager.isItemCustomType
			? DataManager.isItemCustomType(item, customType)
			: (item.meta && item.meta.type == customType));

	  if (!customOk) return false;

	  if (this._pezItypeSymbol) {
		const allowed = itypeIdsFromSymbol(this._pezItypeSymbol);
		return allowed.includes(item.itypeId);
	  } else {
		const itypeId = ($gameMessage && $gameMessage.itemChoiceItypeId)
		  ? $gameMessage.itemChoiceItypeId() : 1;
		return item.itypeId === itypeId;
	  }
	};


	const _WEI_makeItemList = Window_EventItem.prototype.makeItemList;
	Window_EventItem.prototype.makeItemList = function() {		
	  let lst = ($gameNumberArray && typeof $gameNumberArray.value === 'function')
		? $gameNumberArray.value(25) : null;

	  if (Array.isArray(lst) && lst.length > 0) {
		const invalidCodes = [];
		this._data = lst.map(function (code) {
		  const goods = PEZ.decodeShopGoods ? PEZ.decodeShopGoods(code) : null;
		  if (!goods) {
			invalidCodes.push(code);
			return null;
		  }
		  return goods.data;
		}).filter(Boolean);

		const invalidSignature = invalidCodes.map(String).join(',');
		if (invalidSignature && invalidSignature !== this._pezInvalidShopGoodsSignature) {
		  console.warn(
			'PEZ_PointAndClickInventory: Ignored invalid shop goods codes:',
			invalidCodes
		  );
		}
		this._pezInvalidShopGoodsSignature = invalidSignature;
		return;
	  }		
		
	  if (this._pezItypeSymbol) {
		const allowed = itypeIdsFromSymbol(this._pezItypeSymbol);
		this._data = $gameParty.allItems().filter(item => {
		  return this.pezItemPassesFilter(item);
		});
		this._data.push(null);
		return;
	  }
	  _WEI_makeItemList.call(this);
	};

  const _WEI_drawItem = Window_EventItem.prototype.drawItem;
  Window_EventItem.prototype.drawItem = function(index) {
    _WEI_drawItem.call(this, index);
    this.drawPezMultiSelectCursor(index);
  };

  const _WEI_update = Window_EventItem.prototype.update;
  Window_EventItem.prototype.update = function() {
    _WEI_update.call(this);
    this.updatePezMultiSelectCursorSprites();
  };

  const _WEI_onOk = Window_EventItem.prototype.onOk;
  Window_EventItem.prototype.onOk = function() {
    if (this._pezMultiSelectMode) {
      this.toggleMultiSelectedItem();
    } else {
      _WEI_onOk.call(this);
    }
  };

  const _WEI_onTouch = Window_EventItem.prototype.onTouch;
  Window_EventItem.prototype.onTouch = function(triggered) {
    if (!this._pezMultiSelectMode || !triggered) {
      _WEI_onTouch.call(this, triggered);
      return;
    }

    const x = this.canvasToLocalX(TouchInput.x);
    const y = this.canvasToLocalY(TouchInput.y);
    const hitIndex = this.hitTest(x, y);
    if (hitIndex >= 0) {
      this.select(hitIndex);
      this.toggleMultiSelectedItem();
    } else {
      _WEI_onTouch.call(this, triggered);
    }
  };

  const _WEI_playOkSound = Window_EventItem.prototype.playOkSound;
  Window_EventItem.prototype.playOkSound = function() {
    if (!this._pezMultiSelectMode) {
      _WEI_playOkSound.call(this);
    }
  };

  const _WEI_onCancel = Window_EventItem.prototype.onCancel;
  Window_EventItem.prototype.onCancel = function() {
    if (this._pezMultiSelectMode) {
      this.finishMultiSelect(true);
    } else {
      _WEI_onCancel.call(this);
    }
  };

  // --------------------------------------------------------------------------
  // Sync default active button from event command on open
  // --------------------------------------------------------------------------
  const _WEI_start = Window_EventItem.prototype.start;
  Window_EventItem.prototype.start = function() {
    const msgItype = ($gameMessage && $gameMessage.itemChoiceItypeId)
      ? $gameMessage.itemChoiceItypeId()
      : 1;

    this._pezItypeSymbol = symbolFromItypeId(msgItype);
    this._pezMultiSelectMode = false;
    this._pezMultiSelectedIndexes = [];
    this.clearPezMultiSelectCursorSprites();

    _WEI_start.call(this);

    this.updateItypeFilterButtonVisuals();
    this.updateMultiSelectButtonVisuals();
    this.showItypeFilterButtons();
    this.showMultiSelectButton();
  };

  const _WEI_close = Window_EventItem.prototype.close;
  Window_EventItem.prototype.close = function() {
    this.hideItypeFilterButtons();
    this.hideMultiSelectButton();
    this._pezMultiSelectMode = false;
    this.clearPezMultiSelectCursorSprites();
    _WEI_close.call(this);
  };

})();
