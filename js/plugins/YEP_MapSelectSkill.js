//=============================================================================
// Yanfly Engine Plugins - Map Select Skill
// YEP_MapSelectSkill.js
//=============================================================================

var Imported = Imported || {};
Imported.YEP_MapSelectSkill = true;

var Yanfly = Yanfly || {};
Yanfly.MSS = Yanfly.MSS || {};
Yanfly.MSS.version = 1.03;

//=============================================================================
 /*:
 * @plugindesc v1.03 Open up a window similar to the Select Item Window,
 * but instead, returns Skill ID's to a variable.
 * @author Yanfly Engine Plugins
 *
 * @param Default Columns
 * @type number
 * @min 1
 * @desc Default number of columns for the window.
 * @default 2
 *
 * @param Default Rows
 * @type number
 * @min 1
 * @desc Default number of rows for the window.
 * @default 4
 *
 * @param Default X Position
 * @type combo
 * @option left
 * @option center
 * @option right
 * @desc Default X Position of the window.
 * left     center     right
 * @default right
 *
 * @param Default Y Position
 * @type combo
 * @option top
 * @option middle
 * @option bottom
 * @desc Default Y Position of the window.
 * top     middle     bottom
 * @default bottom
 *
 * @param Default Width
 * @type number
 * @min 0
 * @desc Default width of the window.
 * If set to 0, window width will be the screen width.
 * @default 0
 *
 * @param Default Enable
 * @type boolean
 * @on Enable
 * @off Disable
 * @desc Enable all skills by default?
 * NO - false     YES - true
 * @default true
 *
 * @param Default Cost
 * @type boolean
 * @on Show
 * @off Hide
 * @desc Show the costs of the skills by default?
 * NO - false     YES - true
 * @default true
 *
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 *
 * This plugin produces a window similar to that of the Select Item Window, but
 * instead, it displays a list of skills from a designated actor and the skill
 * type selected. When a skill is selected, it set the chosen variable's value
 * to become that of the picked skill's ID.
 *
 * ============================================================================
 * Plugin Commands
 * ============================================================================
 *
 * Use the following plugin commands to utilize the Map Select Skill plugin.
 *
 * --- Plugin Commands ---
 *
 * MapSelectSkill v a s
 * - This will open up the Map Select Skill window. Replace 'v' with the ID of
 * the variable you wish to set to the selected skill. Replace 'a' with the ID
 * of the actor whose skill list you want to see. 's' is optional, but if used,
 * it will display the skills from skill type 's' only. Replace 's' with the
 * skill type's ID number.
 *
 * MapSelectSkillColumns x
 * - Sets the number of columns for the Map Select Skill Window to x.
 *
 * MapSelectSkillRows x
 * - Sets the number of rows for the Map Select Skill Window to x.
 *
 * MapSelectSkillWidth x
 * - Sets the width for the Map Select Skill Window to x. If 0 is used, then
 * the window width will be the screen width.
 *
 * MapSelectSkillX left
 * MapSelectSkillX center
 * MapSelectSkillX right
 * - Sets the Map Select Skill Window to be aligned to the left side of the
 * screen, center of the screen, or right side of the screen.
 *
 * MapSelectSkillY top
 * MapSelectSkillY middle
 * MapSelectSkillY bottom
 * - Sets the Map Select Skill Window to be aligned to the top of the screen,
 * middle of the screen, or bottom of the screen.
 *
 * EnableAllMapSelectSkills
 * - This will cause all of the skills listed to become selectable regardless
 * of whether or not the actor is able to use them at the time.
 *
 * NormalAllMapSelectSkills
 * - This will cause all of the skills listed to be enabled or disabled based
 * on whether or not the actor is able to use the skill at the time.
 *
 * ShowMapSelectSkillCost
 * - Show the cost of the skills in the Map Select Skill Window.
 *
 * HideMapSelectSkillCost
 * - Hide the cost of the skills in the Map Select Skill Window.
 *
 * ============================================================================
 * Changelog
 * ============================================================================
 *
 * Version 1.03:
 * - Updated for RPG Maker MV version 1.5.0.
 *
 * Version 1.02:
 * - Optimization update.
 *
 * Version 1.01:
 * - Compatibility update with Self Switches & Variables v1.01.
 *
 * Version 1.00:
 * - Finished Plugin!
 */
//=============================================================================

Yanfly.Parameters = PluginManager.parameters('YEP_MapSelectSkill');
Yanfly.Param = Yanfly.Param || {};

Yanfly.Param.MSSCol = Number(Yanfly.Parameters['Default Columns']);
Yanfly.Param.MSSRow = Number(Yanfly.Parameters['Default Rows']);
Yanfly.Param.MSSPosX = String(Yanfly.Parameters['Default X Position']);
Yanfly.Param.MSSPosY = String(Yanfly.Parameters['Default Y Position']);
Yanfly.Param.MSSWidth = Number(Yanfly.Parameters['Default Width']);
Yanfly.Param.MSSEnable = eval(String(Yanfly.Parameters['Default Enable']));
Yanfly.Param.MSSCost = eval(String(Yanfly.Parameters['Default Cost']));

//=============================================================================
// Game_System
//=============================================================================

Yanfly.MSS.Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    Yanfly.MSS.Game_System_initialize.call(this);
    this.initMapSelectSkill();
};

Game_System.prototype.initMapSelectSkill = function() {
    this._mapSelectSkillWindowColumns = Yanfly.Param.MSSCol;
    this._mapSelectSkillWindowRows = Yanfly.Param.MSSRow;
    this._mapSelectSkillWindowPosX = Yanfly.Param.MSSPosX;
    this._mapSelectSkillWindowPosY = Yanfly.Param.MSSPosY;
    this._mapSelectSkillWindowWidth = Yanfly.Param.MSSWidth;
    this._mapSelectSkillWindowEnable = Yanfly.Param.MSSEnable;
    this._mapSelectSkillWindowCosts = Yanfly.Param.MSSCost;
};

Game_System.prototype.getMapSelectSkillColumns = function() {
    if (this._mapSelectSkillWindowColumns === undefined) {
      this.initMapSelectSkill();
    }
    return this._mapSelectSkillWindowColumns;
};

Game_System.prototype.setMapSelectSkillColumns = function(value) {
    if (this._mapSelectSkillWindowColumns === undefined) {
      this.initMapSelectSkill();
    }
    this._mapSelectSkillWindowColumns = value;
};

Game_System.prototype.getMapSelectSkillRows = function() {
    if (this._mapSelectSkillWindowRows === undefined) {
      this.initMapSelectSkill();
    }
    return this._mapSelectSkillWindowRows;
};

Game_System.prototype.setMapSelectSkillRows = function(value) {
    if (this._mapSelectSkillWindowRows === undefined) {
      this.initMapSelectSkill();
    }
    this._mapSelectSkillWindowRows = value;
};

Game_System.prototype.getMapSelectSkillPosX = function() {
    if (this._mapSelectSkillWindowPosX === undefined) {
      this.initMapSelectSkill();
    }
    return this._mapSelectSkillWindowPosX;
};

Game_System.prototype.setMapSelectSkillPosX = function(value) {
    if (this._mapSelectSkillWindowPosX === undefined) {
      this.initMapSelectSkill();
    }
    this._mapSelectSkillWindowPosX = value;
};

Game_System.prototype.getMapSelectSkillPosY = function() {
    if (this._mapSelectSkillWindowPosY === undefined) {
      this.initMapSelectSkill();
    }
    return this._mapSelectSkillWindowPosY;
};

Game_System.prototype.setMapSelectSkillPosY = function(value) {
    if (this._mapSelectSkillWindowPosY === undefined) {
      this.initMapSelectSkill();
    }
    this._mapSelectSkillWindowPosY = value;
};

Game_System.prototype.getMapSelectSkillWidth = function() {
    if (this._mapSelectSkillWindowWidth === undefined) {
      this.initMapSelectSkill();
    }
    return this._mapSelectSkillWindowWidth;
};

Game_System.prototype.setMapSelectSkillWidth = function(value) {
    if (this._mapSelectSkillWindowWidth === undefined) {
      this.initMapSelectSkill();
    }
    this._mapSelectSkillWindowWidth = value;
};

Game_System.prototype.getMapSelectSkillEnable = function() {
    if (this._mapSelectSkillWindowEnable === undefined) {
      this.initMapSelectSkill();
    }
    return this._mapSelectSkillWindowEnable;
};

Game_System.prototype.setMapSelectSkillEnable = function(value) {
    if (this._mapSelectSkillWindowEnable === undefined) {
      this.initMapSelectSkill();
    }
    this._mapSelectSkillWindowEnable = value;
};

Game_System.prototype.getMapSelectSkillCosts = function() {
    if (this._mapSelectSkillWindowCosts === undefined) {
      this.initMapSelectSkill();
    }
    return this._mapSelectSkillWindowCosts;
};

Game_System.prototype.setMapSelectSkillCosts = function(value) {
    if (this._mapSelectSkillWindowCosts === undefined) {
      this.initMapSelectSkill();
    }
    this._mapSelectSkillWindowCosts = value;
};

// 新增方法，用于检测窗口是否打开
Game_System.prototype.isMapSelectSkillOpen = function() {
    if (SceneManager._scene instanceof Scene_Map) {
        let w = SceneManager._scene._mapSelectSkillWindow;
        return w && w.isOpen();
    }
    return false;
};

//=============================================================================
// Game_Interpreter
//=============================================================================

Yanfly.MSS.Game_Interpreter_pluginCommand =
    Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args) {
  Yanfly.MSS.Game_Interpreter_pluginCommand.call(this, command, args);
  if (command === 'MapSelectSkill') {
    if (SceneManager._scene instanceof Scene_Map) {
      var varId = parseInt(args[0]);
      var actorId = parseInt(args[1]);
      var stypeId = parseInt(args[2] || 0);
      SceneManager._scene.setupMapSelectSkill(varId, actorId, stypeId);
      this.wait(10);
    }
  } else if (command === 'MapSelectSkillColumns') {
    var value = parseInt(args[0]);
    $gameSystem.setMapSelectSkillColumns(value);
  } else if (command === 'MapSelectSkillRows') {
    var value = parseInt(args[0]);
    $gameSystem.setMapSelectSkillRows(value);
  } else if (command === 'MapSelectSkillWidth') {
    var value = parseInt(args[0]);
    $gameSystem.setMapSelectSkillWidth(value);
  } else if (command === 'MapSelectSkillX') {
    var value = String(args[0]).toLowerCase();
    $gameSystem.setMapSelectSkillPosX(value);
  } else if (command === 'MapSelectSkillY') {
    var value = String(args[0]).toLowerCase();
    $gameSystem.setMapSelectSkillPosY(value);
  } else if (command === 'EnableAllMapSelectSkills') {
    $gameSystem.setMapSelectSkillEnable(true);
  } else if (command === 'NormalAllMapSelectSkills') {
    $gameSystem.setMapSelectSkillEnable(false);
  } else if (command === 'ShowMapSelectSkillCost') {
    $gameSystem.setMapSelectSkillCosts(true);
  } else if (command === 'HideMapSelectSkillCost') {
    $gameSystem.setMapSelectSkillCosts(false);
  }
};

//=============================================================================
// Window_MapSelectSkill
//=============================================================================

function Window_MapSelectSkill() {
    this.initialize.apply(this, arguments);
}

Window_MapSelectSkill.prototype = Object.create(Window_SkillList.prototype);
Window_MapSelectSkill.prototype.constructor = Window_MapSelectSkill;

Window_MapSelectSkill.prototype.initialize = function() {
    var width = this.windowWidth();
    var height = this.windowHeight();
    Window_Selectable.prototype.initialize.call(this, 0, 0, width, height);
    this.openness = 0;
};

Window_MapSelectSkill.prototype.itemRect = function(index) {
    var rect = new Rectangle();
    var maxCols = this.maxCols();
    rect.width = this.itemWidth() - 15;
    rect.height = this.itemHeight();
    // MV→MZ：MZ 的滚动用 scrollBaseY()（整行对齐基准）减位，半行平滑偏移由 origin.y 单独处理。
    //   原来减 this._scrollY（完整平滑值）会和 origin 双重作用 → 平滑滚动时光标/图标错位。
    rect.x = index % maxCols * (rect.width + this.spacing()) - this.scrollBaseX();
    rect.y = Math.floor(index / maxCols) * rect.height - this.scrollBaseY();
    return rect;
};

Window_MapSelectSkill.prototype.itemHeight = function() {
    return 84;
};

// MV→MZ：MZ 的滚轮平滑滚动不动光标 → 光标与视图脱钩。改为滚轮按行移动光标，用 forceSelect
//   （瞬时滚动），光标和视图一起到位，避免 smoothSelect 动画延迟导致光标先出界再弹回。
Window_MapSelectSkill.prototype.processWheelScroll = function() {
    if (!this.isOpenAndActive() || !this.isTouchedInsideFrame()) return;
    var maxItems = this.maxItems();
    if (maxItems <= 0) return;
    var threshold = 20;
    // 仅在真有滚轮输入时才处理：否则 index=-1(滚动条拖拽已取消选中)会被钳成 0、与 index() 不等，
    //   每帧误调 forceSelect(0)→ensureCursorVisible 把视图拽回顶部，使滚动条失效。
    if (Math.abs(TouchInput.wheelY) < threshold) return;
    var maxCols = this.maxCols();
    var idx = this.index();
    if (idx < 0) idx = 0;
    var newIndex = idx;
    if (TouchInput.wheelY >= threshold) { newIndex = Math.min(idx + maxCols, maxItems - 1); }
    else if (TouchInput.wheelY <= -threshold) { newIndex = Math.max(idx - maxCols, 0); }
    if (newIndex !== this.index()) {
        this.forceSelect(newIndex);
        SoundManager.playCursor();
    }
};

// 悬停选择仅在鼠标"屏幕位置实际变化"时生效：滚轮翻页后鼠标静止（物品在脚下滚动），
//   位置没变就不改选中，避免被悬停把光标从滚轮选好的物品拽回鼠标下方的物品。
Window_MapSelectSkill.prototype.onTouchSelect = function(trigger) {
    if (!trigger) {
        if (this._drill_lastHoverX === TouchInput.x && this._drill_lastHoverY === TouchInput.y) return;
        this._drill_lastHoverX = TouchInput.x;
        this._drill_lastHoverY = TouchInput.y;
    }
    Window_Selectable.prototype.onTouchSelect.call(this, trigger);
};

Window_MapSelectSkill.prototype.drawItemName = function(item, x, y, width) {
    width = width || 312;
    if (item) {
		var iconBoxWidth = Window_Base._iconWidth;
        this.resetTextColor();
		this.drawIcon(item.iconIndex, x + 20, y + 10);
        //var x = ($gameSystem.getMapSelectEquipWidth() - textWidth - iconBoxWidth) / 2;
		//this.drawItemNameLow(item.name, 660, 800, width);
        //this.drawText(item.name, x + iconBoxWidth, y + 48, width - iconBoxWidth, 'center');
    }
};

//文本框高度
Window_MapSelectSkill.prototype.fittingHeight = function(col) {
    return col * this.itemHeight() + this.standardPadding() * 2;
};

Window_MapSelectSkill.prototype.windowWidth = function() {
    return this._windowWidth || Graphics.boxWidth;
};

Window_MapSelectSkill.prototype.windowHeight = function() {
    return this._windowHeight || this.fittingHeight(4);
};

Window_MapSelectSkill.prototype.setup = function(varId, actorId, stypeId) {
    if (!varId) return;
    if (!actorId) return;
    this.updateWindowSettings();
    this._varId = varId;
    this.setActor($gameActors.actor(actorId));
    this.setStypeId(stypeId);
    this.refresh();
    this.activate();
    this.open();
	  this.select(-1);
    this.select(0);
};

Window_MapSelectSkill.prototype.includes = function(item) {
    if (!this._stypeId) return item;
    return item && item.stypeId === this._stypeId;
};

Window_MapSelectSkill.prototype.maxCols = function() {
    return $gameSystem.getMapSelectSkillColumns() || 1;
};

Window_MapSelectSkill.prototype.updateWindowSettings = function() {
    this.width = $gameSystem.getMapSelectSkillWidth() || Graphics.boxWidth;
    var col = $gameSystem.getMapSelectSkillRows() || 4;
    this.height = this.fittingHeight(col);
    /*
    if ($gameSystem.getMapSelectSkillPosX() === 'left') {
      this.x = 0;
    } else if ($gameSystem.getMapSelectSkillPosX() === 'center') {
      this.x = Math.floor((Graphics.boxWidth - this.width) / 2);
    } else {
      this.x = Graphics.boxWidth - this.width;
    }
    if ($gameSystem.getMapSelectSkillPosY() === 'top') {
      this.y = 0;
    } else if ($gameSystem.getMapSelectSkillPosY() === 'middle') {
      this.y = Math.floor((Graphics.boxHeight - this.height) / 2);
    } else {
      this.y = Graphics.boxHeight - this.height;
    }
    */
    this.x = Math.floor((Graphics.boxWidth - this.width) / 2) + 30;
	  this.y = 255;
};

Window_MapSelectSkill.prototype.isEnabled = function(item) {
    if ($gameSystem.getMapSelectSkillEnable()) return true;
    return Window_SkillList.prototype.isEnabled.call(this, item);
};

Window_MapSelectSkill.prototype.drawSkillCost = function(skill, x, y, width) {
    if ($gameSystem.getMapSelectSkillCosts()) {
      var width =
        Window_SkillList.prototype.drawSkillCost.call(this, skill, x, y, width);
    }
};

//适配Drill指针
Window_MapSelectSkill.prototype.drill_MCu_cursorStyleId = function() {
    return 7;
}

//=============================================================================
// Scene_Map
//=============================================================================

Yanfly.MSS.Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    Yanfly.MSS.Scene_Map_createAllWindows.call(this);
    this.createMapSelectSkillWindow();
};

Scene_Map.prototype.createMapSelectSkillWindow = function() {
    this._mapSelectSkillWindow = new Window_MapSelectSkill();
    this._mapSelectSkillWindow.setHandler('ok', 
      this.onMapSelectSkillOk.bind(this));
    this._mapSelectSkillWindow.setHandler('cancel', 
      this.onMapSelectSkillCancel.bind(this));
    this.addChild(this._mapSelectSkillWindow);
	//this._MapSelectSkillWindow.opacity = 0;  //添加透明度为0
};

Scene_Map.prototype.setupMapSelectSkill = function(varId, actorId, stypeId) {
    this._mapSelectSkillWindow.setup(varId, actorId, stypeId);
    this._active = false;
};

Scene_Map.prototype.onMapSelectSkillOk = function() {
    this._mapSelectSkillWindow.close();
    var skill = this._mapSelectSkillWindow.item();
    var varId = this._mapSelectSkillWindow._varId;
    if (Imported.YEP_SelfSwVar) $gameTemp.clearSelfSwVarEvBridge();
    if (!skill) {
      $gameVariables.setValue(varId, 0);
    } else {
      $gameVariables.setValue(varId, skill.id);
    }
    if (Imported.YEP_SelfSwVar) $gameTemp.clearSelfSwVarEvent();
    this._active = true;
};

Scene_Map.prototype.onMapSelectSkillCancel = function() {
    this._mapSelectSkillWindow.close();
    var varId = this._mapSelectSkillWindow._varId;
    $gameVariables.setValue(varId, 0);
    this._active = true;
};

//=============================================================================
// End of File
//=============================================================================
