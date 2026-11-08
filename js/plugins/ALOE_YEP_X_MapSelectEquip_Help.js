"use strict";

//=============================================================================
// Aloe Guvner - Map Select Equip Help Window
// ALOE_YEP_X_MapSelectEquip_Help.js
//=============================================================================

//=============================================================================
/*:
* @plugindesc v1.1.2 Extension of YEP_MapSelectEquip with auto-scrolling descriptions.
* Original author: Yanfly Engine Plugins
* @author Aloe Guvner
*
* @param helpWindowX
* @text Help Window X
* @type number
* @desc X coordinate of the help window
* @default 0
* 
* @param helpWindowY
* @text Help Window Y
* @type number
* @desc Y coordinate of the help window
* @default 0
*
* @param textHeight
* @text Text Display Height
* @type number
* @min 1
* @desc Maximum visible height of the description text, in pixels.
* @default 324
*
* @param scrollSpeed
* @text Scroll Speed
* @type number
* @decimals 2
* @min 0.01
* @desc Automatic scroll speed, in pixels per frame.
* @default 0.50
*
* @param scrollPause
* @text Scroll End Pause
* @type number
* @min 0
* @desc Frames to pause at the top and bottom before reversing direction.
* @default 90
* 
* @help
* ============================================================================
* Introduction
* ============================================================================
*
* This plugin is an extension of YEP_MapSelectEquip.js
* The purpose of the extension is to create a help window to show the
* equip description in the Map Select Equip window.
* 
* ============================================================================
* Changelog
* ============================================================================
*
* Version 1.1.2:
* - Long descriptions now start scrolling immediately when first displayed.
*   The configured pause is only applied after reaching either end.
*
* Version 1.1.1:
* - Added an independent text mask for projects where the window client-area
*   filter does not clip oversized contents bitmaps.
*
* Version 1.1.0:
* - Added automatic back-and-forth scrolling for long descriptions.
* - Added text height, scroll speed, and scroll pause parameters.
*
* Version 1.0.0:
* - Initial version
*/
//=============================================================================

var ALOE = ALOE || {};
ALOE.YEP_X_MapSelectEquip_Help = ALOE.YEP_X_MapSelectEquip_Help || {};

var Imported = Imported || {};
Imported["ALOE_YEP_X_MapSelectEquip_Help"] = 1.12;

(function () {

    var params = PluginManager.parameters("ALOE_YEP_X_MapSelectEquip_Help");
    var x = 620;
    var y = 710;
    var textHeight = Math.max(1, Number(params.textHeight) || 324);
    var scrollSpeed = Math.max(0.01, Number(params.scrollSpeed) || 0.5);
    var parsedScrollPause = Number(params.scrollPause);
    var scrollPause = isFinite(parsedScrollPause) ? Math.max(0, parsedScrollPause) : 90;
    var textOffsetY = 6;

    //=============================================================================
    // Scene_Map
    //=============================================================================
    // Alias of Scene_Map methods specific to the help window.
    // One new method to create the help window.
    //=============================================================================

    var Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function () {
        this.createMapSelectEquipHelpWindow();
        Scene_Map_createAllWindows.call(this);
    };

    var Scene_Map_createMapSelectEquipWindow = Scene_Map.prototype.createMapSelectEquipWindow;
    Scene_Map.prototype.createMapSelectEquipWindow = function () {
        Scene_Map_createMapSelectEquipWindow.call(this);
        this._MapSelectEquipWindow.setHelpWindow(this._mapSelectEquipHelpWindow);
    };

    var Scene_Map_processMapSelectEquipOk = Scene_Map.prototype.processMapSelectEquipOk;
    Scene_Map.prototype.processMapSelectEquipOk = function () {
        //this._mapSelectEquipHelpWindow.close();
        return Scene_Map_processMapSelectEquipOk.call(this);
    };

    var Scene_Map_onMapSelectEquipCancel = Scene_Map.prototype.onMapSelectEquipCancel;
    Scene_Map.prototype.onMapSelectEquipCancel = function () {
        this._mapSelectEquipHelpWindow.close();
        Scene_Map_onMapSelectEquipCancel.call(this);
    };

    var Scene_Map_setupMapSelectEquip = Scene_Map.prototype.setupMapSelectEquip;
    Scene_Map.prototype.setupMapSelectEquip = function (varId, actorId, stypeId, batchSelect) {
        Scene_Map_setupMapSelectEquip.call(this, varId, actorId, stypeId, batchSelect);
		let ew = this._MapSelectEquipWindow;
        let type = ew && ew._type ? String(ew._type) : '';
        let bgName = (type === 'WEAPONS') ? 'equip_weapon' : 'equip_gear';
		if ($gameSwitches.value(446)) bgName = 'equip_trashCan';
		if (this._mapSelectEquipHelpWindow && this._mapSelectEquipHelpWindow.setLayout) {
            this._mapSelectEquipHelpWindow.setLayout(bgName);
        }
        this._mapSelectEquipHelpWindow.open();		
    };

    Scene_Map.prototype.createMapSelectEquipHelpWindow = function () {
        this._mapSelectEquipHelpWindow = new Window_MapSelectEquipHelp(x, y);
        // 创建 Sprite 对象并加载背景图片
        let layoutSprite = new Sprite(ImageManager.loadSystem('equip_weapon'));
        layoutSprite.x = -20;
        layoutSprite.y = -630;
        layoutSprite.opacity = 255;
        //this._mapSelectEquipHelpWindow.addChild(layoutSprite);
		this._mapSelectEquipHelpWindow._layoutSprite = layoutSprite;
        this._mapSelectEquipHelpWindow.addChildAt(layoutSprite, 0);
        this.addWindow(this._mapSelectEquipHelpWindow);
    };

    //=============================================================================
    // Window_MapSelectEquipHelp
    //=============================================================================
    // New type of window which inherits prototypes from Window_Help
    //=============================================================================

    function Window_MapSelectEquipHelp() {
        this.initialize.apply(this, arguments);
    }

    Window_MapSelectEquipHelp.prototype = Object.create(Window_Help.prototype);
    Window_MapSelectEquipHelp.prototype.constructor = Window_MapSelectEquipHelp;

    Window_MapSelectEquipHelp.prototype.initialize = function (x, y) {
        // 直接传 Rectangle 进去会被它强制成 (0,0,boxWidth,...)（位置/宽度全丢）。
        // 所以这里不跟那串继承较劲：先无参调 super-init（随它兜底），再用原生 move() +
        // createContents() 强制覆盖最终几何。move() 没被任何插件包过，100% 生效。
        // 真实高度在 refresh 里按描述文本行数自适应（等价 MV 的 "numLines" 动态高度）。
        Window_Help.prototype.initialize.call(this);
        this.move(x, y, 960, this.fittingHeight(4));
        this.createContents();
        this.openness = 0;
        this.opacity = 255;
        this.createDescriptionMask();
        this.resetAutoScroll();
    };

    // Use a dedicated PIXI mask instead of relying on Window._clientArea's
    // AlphaFilter. Some compatibility/performance plugins remove that filter,
    // which makes an oversized contents bitmap render outside the help window.
    Window_MapSelectEquipHelp.prototype.createDescriptionMask = function () {
        this._descriptionMask = new PIXI.Graphics();
        this._clientArea.addChild(this._descriptionMask);
        this._contentsSprite.mask = this._descriptionMask;
        this.refreshDescriptionMask();
    };

    Window_MapSelectEquipHelp.prototype.refreshDescriptionMask = function () {
        if (!this._descriptionMask) return;
        this._descriptionMask.clear();
        this._descriptionMask.beginFill(0xffffff);
        this._descriptionMask.drawRect(0, 0, this.innerWidth, this.innerHeight);
        this._descriptionMask.endFill();
    };

    // The contents bitmap must retain the entire description while the window's
    // client area clips it to the configured visible height.
    Window_MapSelectEquipHelp.prototype.contentsHeight = function () {
        return Math.max(this.innerHeight, this._scrollBitmapHeight || 0);
    };

    Window_MapSelectEquipHelp.prototype.refresh = function () {
        var text = this._text || "";
        var contentH = Math.ceil(this.textSizeEx(text).height);
        var visibleTextH = Math.min(contentH, textHeight);
        var newHeight = Math.max(
            this.fittingHeight(2),
            visibleTextH + this.padding * 2 + textOffsetY * 2
        );
        this._scrollBitmapHeight = Math.max(
            newHeight - this.padding * 2,
            contentH + textOffsetY * 2
        );
        if (this.height !== newHeight ||
            !this.contents || this.contents.height !== this.contentsHeight()) {
            this.move(this.x, this.y, this.width, newHeight);
            this.createContents();
        }
        this.refreshDescriptionMask();
        this.contents.clear();
        this.drawTextEx(text, this.textPadding(), textOffsetY);
        this._scrollMax = Math.max(0, this._scrollBitmapHeight - this.innerHeight);
        this.resetAutoScroll();
    };

    Window_MapSelectEquipHelp.prototype.resetAutoScroll = function () {
        this._scrollOffset = 0;
        this._scrollDirection = 1;
        // A newly displayed item starts moving immediately. scrollPause is
        // reserved for actual arrivals at the top or bottom in updateAutoScroll.
        this._scrollWait = 0;
        if (this.origin) this.origin.y = 0;
        if (this._contentsSprite) this._contentsSprite.y = 0;
    };

    Window_MapSelectEquipHelp.prototype.open = function () {
        if (!this.isOpen()) this.resetAutoScroll();
        Window_Help.prototype.open.call(this);
    };

    Window_MapSelectEquipHelp.prototype.update = function () {
        Window_Help.prototype.update.call(this);
        this.updateAutoScroll();
    };

    Window_MapSelectEquipHelp.prototype.updateAutoScroll = function () {
        if (!this.isOpen() || !(this._scrollMax > 0)) return;
        if (this._scrollWait > 0) {
            this._scrollWait--;
            return;
        }

        this._scrollOffset += scrollSpeed * this._scrollDirection;
        if (this._scrollOffset >= this._scrollMax) {
            this._scrollOffset = this._scrollMax;
            this._scrollDirection = -1;
            this._scrollWait = scrollPause;
        } else if (this._scrollOffset <= 0) {
            this._scrollOffset = 0;
            this._scrollDirection = 1;
            this._scrollWait = scrollPause;
        }
        // Integer positioning keeps bitmap text crisp even with fractional speeds.
        // Move only the description sprite. The sibling mask remains fixed in
        // the client area and clips both bitmap text and Drill character sprites.
        this._contentsSprite.y = -Math.round(this._scrollOffset);
    };

	Window_MapSelectEquipHelp.prototype.setLayout = function(name) {
		if (!this._layoutSprite) return;
		this._layoutSprite.bitmap = ImageManager.loadSystem(name);
	};
	
})();
