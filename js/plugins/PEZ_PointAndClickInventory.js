//=============================================================================
// Point and Click Inventory (IconID) Ver.2.
// by Pez
// Date: 11/11/2018
// Ver.2. 10/06/2019
//=============================================================================

/*:
 * @plugindesc Makes an inventory for P&C games. 
 * @author Pez
 *
 * ============================================================================
 *
 * @param Inventory Key
 * @type number
 * @min 0
 * @desc Sets the "I" key to Open and Close the Inventory. 
 * Default: 73. [!! Better leave it as default].
 * @default 73
 *
 * @param Category Item
 * @desc Sets the category of the items shown on the Inventory. 
 * Default: keyItem. Could also be 'item', 'weapon' or 'armor'.
 * @default keyItem
 *
 * @param Unblur Background
 * @type boolean
 * @on YES
 * @off NO
 * @desc Unblur the background snap when calling the inventory
 * Default: false (no); true (yes); !It affects the whole game.
 * @default false
 *
 * @param Stop Blinking
 * @type boolean
 * @on YES
 * @off NO
 * @desc Stop the blinking effect when selecting an object
 * Default: false (no); true (yes); !It affects the whole game.
 * @default false
 *
 * @param ---Pictures---
 * @default
 *
 * @param Inventory Background Name
 * @parent ---Pictures---
 * @desc Name of the Inventory Background Picture. 
 * Default: Inventory.
 * @default Inventory
 *
 * @param Inventory Background X
 * @parent ---Pictures---
 * @desc Sets the X of Inventory Background Picture. 
 * Default: ((Graphics.width / 2) - 460).
 * @default ((Graphics.width / 2) - 460)
 *
 * @param Inventory Background Y
 * @parent ---Pictures---
 * @desc Sets the Y of Inventory Background Picture. 
 * Default: ((Graphics.height / 2) - 260).
 * @default ((Graphics.height / 2) - 260)
 *
 * @param Inventory Background Opacity
 * @parent ---Pictures---
 * @type number
 * @min 0
 * @max 255
 * @desc Sets the opacity of the inventory background picture.
 * From 0 (invisible) to 255 (visible). Default 255.
 * @default 255
 *
 * @param Help Background Name
 * @parent ---Pictures---
 * @desc Name of the Inventory Help Picture. 
 * Default: HelpInventory.
 * @default HelpInventory
 *
 * @param Help Background X
 * @parent ---Pictures---
 * @desc Sets the X of Inventory Help Background Picture. 
 * Default: ((Graphics.width / 2) - 440).
 * @default ((Graphics.width / 2) - 440)
 *
 * @param Help Background Y
 * @parent ---Pictures---
 * @desc Sets the Y of Inventory Help Background Picture. 
 * Default: 550.
 * @default 550
 *
 * @param Help Background Opacity
 * @parent ---Pictures---
 * @type number
 * @min 0
 * @max 255
 * @desc Sets the opacity of the inventory help background picture.
 * From 0 (invisible) to 255 (visible). Default 255.
 * @default 255
 *
 * @param IconSet Name
 * @parent ---Pictures---
 * @desc Name of the Item's IconSet.
 * Default: IconSet128.
 * @default IconSet128
 *
 * @param ---Inventory Window---
 * @default
 *
 * @param Inventory Width
 * @parent ---Inventory Window---
 * @desc Sets the width of the inventory window. 
 * Default 870.
 * @default 870
 *
 * @param Inventory Height
 * @parent ---Inventory Window---
 * @desc Sets the height of the inventory window. 
 * Default 450.
 * @default 450
 *
 * @param Inventory X
 * @parent ---Inventory Window---
 * @desc Sets the X of the inventory window. Like this is centered.
 * Default (Graphics.width / 2) - (eval(PEZ.Param.PEZWindowWidth) / 2).
 * @default (Graphics.width / 2) - (eval(PEZ.Param.PEZWindowWidth) / 2)
 *
 * @param Inventory Y
 * @parent ---Inventory Window---
 * @desc Sets the Y of the inventory window. Like this is centered.
 * Default (Graphics.height / 2) - (eval(PEZ.Param.PEZWindowHeight) / 2).
 * @default (Graphics.height / 2) - (eval(PEZ.Param.PEZWindowHeight) / 2)
 *
 * @param Inventory Opacity
 * @parent ---Inventory Window---
 * @type number
 * @min 0
 * @max 255
 * @desc Sets the opacity of the inventory window.
 * From 0 (invisible) to 255 (visible).
 * @default 0
 *
 * @param Inventory Columns
 * @parent ---Inventory Window---
 * @type number
 * @min 1
 * @desc Sets the number of columns of the Inventory.
 * Default 5.
 * @default 5
 *
 * @param Enable Swipe Paging
 * @parent ---Inventory Window---
 * @type boolean
 * @on Enable
 * @off Disable
 * @desc Swipe vertically inside item lists to change pages continuously?
 * @default true
 *
 * @param Swipe Page Threshold
 * @parent ---Inventory Window---
 * @type number
 * @min 20
 * @desc Vertical drag distance in pixels required for each page change.
 * @default 48
 *
 * @param ---Icons---
 * @default
 *
 * @param Icon Width
 * @parent ---Icons---
 * @type number
 * @min 0
 * @desc Sets the width of the icon.
 * Default 128.
 * @default 128
 *
 * @param Icon Height
 * @parent ---Icons---
 * @type number
 * @min 0
 * @desc Sets the height of the icon.
 * Default 128.
 * @default 128
 *
 * @param Icon Box Width
 * @parent ---Icons---
 * @type number
 * @min 0
 * @desc Sets the width of the box in which the icon fits.
 * Default 130.
 * @default 130
 *
 * @param Icon Box Height
 * @parent ---Icons---
 * @type number
 * @min 0
 * @desc Sets the height of the box in which the icon fits.
 * Default 130.
 * @default 130
 *
 * @param Icon Spacing
 * @parent ---Icons---
 * @type number
 * @min 0
 * @desc Sets the spacing between the boxes.
 * Default 24.
 * @default 24
 *
 * @param ---Help Window---
 * @default
 *
 * @param Inventory Help Width
 * @parent ---Help Window---
 * @desc Sets the width of the help window. 
 * Default 820.
 * @default 820
 *
 * @param Inventory Help Height
 * @parent ---Help Window---
 * @desc Sets the height of the help window. 
 * Default numLines
 * @default numLines
 *
 * @param Inventory Help X
 * @parent ---Help Window---
 * @desc Sets the X of the inventory help window. 
 * Default ((Graphics.width / 2) - (eval(PEZ.Param.PEZWindowWidth) / 2)) + 20.
 * @default ((Graphics.width / 2) - (eval(PEZ.Param.PEZWindowWidth) / 2)) + 20
 *
 * @param Inventory Help Y
 * @parent ---Help Window---
 * @desc Sets the Y of the inventory help window. 
 * Default eval(PEZ.Param.PEZWindowY) + eval(PEZ.Param.PEZWindowHeight).
 * @default eval(PEZ.Param.PEZWindowY) + eval(PEZ.Param.PEZWindowHeight)
 *
 * @param Inventory Help Opacity
 * @parent ---Help Window---
 * @type number
 * @min 0
 * @max 255
 * @desc Sets the opacity of the help window.
 * From 0 (invisible) to 255 (visible). Default 0.
 * @default 0
 *
 * @param Help Text Max Height
 * @parent ---Help Window---
 * @type number
 * @min 1
 * @desc Maximum visible description height in pixels. Longer text scrolls.
 * @default 200
 *
 * @param Help Scroll Speed
 * @parent ---Help Window---
 * @type number
 * @decimals 2
 * @min 0.01
 * @desc Automatic description scroll speed in pixels per frame.
 * @default 0.50
 *
 * @param Help Scroll Pause
 * @parent ---Help Window---
 * @type number
 * @min 0
 * @desc Frames to pause at the top and bottom before reversing.
 * @default 90
 *
 *
 * ============================================================================
 *
 * @help
 *
 * ============================================================================
 * 0. DESCRIPTION OF THE PLUGIN
 * ============================================================================
 *
 * !!! Plugin made with 1.5.2. Version of RPG Maker MV.
 *
 * This is a plugin made to emulate an inventory from Point&Click or 
 * Adventure games. 
 *
 * It removes the categories from the Scene Item, and shows only Key Items 
 * (or Regular Items).
 *
 * It removes the background window and loads a picture from your Picture 
 * folder to use as a background picture. 
 *
 * It uses the IconID attached to the items to draw a picture from a new 
 * IconSet on the System folder, so you don't need to load individual pictures 
 * for every item. 
 *
 * It also modifies the Select Item Command and make it look like the Inventory, 
 * so you can use that command instead to interact with NPC and other Events, 
 * and still attach Common Events to the items to use in the normal Inventory.
 *
 * ============================================================================
 * 1. NEW KEY MAPS
 * ============================================================================
 *
 * Open and Close the Inventory with the "I" key.
 *
 *     73: 'inv',   // I
 *
 * ============================================================================
 * 2. PRELOAD PICTURES
 * ============================================================================
 *
 * Change the names of the pictures with your own picture names.
 *
 * ============================================================================
 * 3. INVENTORY (SCENE ITEM)
 * ============================================================================
 *
 * -Deactivate categories selection.
 * -Set "Key Items" or "Regular Items" as the only category.
 * -Creates background picture.
 * -Sets item picture depending on its IconID (size can be modified)
 * -Sets "I" key to open and close it.
 *
 * ============================================================================
 * 4. INVENTORY (SELECT ITEM COMMAND)
 * ============================================================================
 *
 * "Replicates" the Inventory on the Select Item Command to use it to interact with NPC and Events. 
 *
 * ============================================================================
 * 5. HELP WINDOW (SCENE ITEM)
 * ============================================================================
 *
 * Sets the position and dimensions of the Help Window on the Scene Item (Inventory).
 *
 * ============================================================================
 * 6. MISC
 * ============================================================================
 *
 * !!! These affect the whole game, so use them only if you want to.
 * By default they are inactive, if you want to use them just remove the commented section.
 *
 * -Remove the blink effect when selecting an item (or any selection).
 * -Remove the blur effect from the background picture snap when calling the inventory.
 * 
 * ============================================================================
 * 7. ONE-SHOT EVENT ITEM LAYOUT API
 * ============================================================================
 *
 * Set the layout used by the next "Select Item" command:
 *
 *     PEZ.setEventItemLayout("shopHud", 1250, 291);
 *
 * The arguments are:
 *   1) Background image name in img/system/ (without extension)
 *   2) Item window screen X
 *   3) Item window screen Y
 *
 * The old switch-based rules are still evaluated first. Values supplied by
 * this API override those results for the next opening. The pending request is
 * then cleared, while the opened window retains its applied layout until it
 * actually closes. Calling the API again before opening replaces the request.
 *
 * Partial overrides and optional background-sprite coordinates are supported:
 *
 *     PEZ.setEventItemLayout({
 *         backgroundName: "shopHud",
 *         windowX: 1250,
 *         windowY: 291,
 *         backgroundX: -92,
 *         backgroundY: -186
 *     });
 *
 * Use PEZ.clearEventItemLayout() to cancel a pending layout before it is used.
 *
 * When the applied background name is "shopHud", the Select Item window uses
 * a separate text API instead of Window_Help.prototype.setItem:
 *
 *     PEZ.getShopItemHelpText = function(item, itemWindow) {
 *         return item ? item.description : "";
 *     };
 *
 * Replace that function after this plugin is loaded to provide the shop-only
 * description. Returning null or undefined clears the help text. Other layouts
 * continue to use the game's normal Window_Help.prototype.setItem behavior.
 *
 * ============================================================================
 * 8. OPTIONAL KEEP-VISIBLE MODE
 * ============================================================================
 *
 * Keep the next "Select Item" window visible after confirming an item:
 *
 *     PEZ.setEventItemKeepVisible(true);
 *
 * Put the script call immediately before the event's "Select Item" command.
 * The selected item ID is still written to the target variable and the event
 * continues normally, but the item window stays visible and becomes inactive,
 * allowing dialogue and choices to receive input.
 *
 * Close the retained window after the dialogue/choice flow or when leaving
 * the shop:
 *
 *     PEZ.closeEventItemWindow();
 *
 * This option is consumed by one "Select Item" opening. Call it again before
 * each repeated shop selection. Cancelling the item selection still closes
 * the window normally. Calling with false cancels a pending request.
 *
 * ============================================================================
 * 9. CUSTOM SHOP GOODS CODES
 * ============================================================================
 *
 * Values in $gameNumberArray.value(25) may contain mixed database types:
 *
 *       1 -  999: Item ID
 *    1001 - 1999: 1000 + Weapon ID
 *    2001 - 2999: 2000 + Armor ID
 *
 * Example:
 *
 *     $gameNumberArray.setValue(25, [30, 1005, 2012]);
 *
 * The Select Item result variable receives the same encoded value. Use:
 *
 *     var goods = PEZ.decodeShopGoods(encodedValue);
 *
 * The result contains { code, type, id, data }, where type is "item",
 * "weapon", or "armor", and data is the matching database object.
 *
 * ============================================================================
 * LOG
 * ============================================================================
 *
 * Version 2: Added Help Window to the Inventory and all the parameters to the plugin.
 *      *Still missing the Help Window on the Select Item Command.
 *
 * Version 1: Plugin released. 
 */

var Imported = Imported || {};
Imported.PEZ_PointAndClickInventory = true;

var PEZ = PEZ || {};
PEZ.CGa = PEZ.CGa || {};
PEZ.CGa.Version = 2.00;

//=============================================================================
// 
// 0. PARAMETERS
// 
//=============================================================================    
    
    PEZ.Parameters = PluginManager.parameters('PEZ_PointAndClickInventory');
    PEZ.Param = PEZ.Param || {};

    PEZ.Param.PEZInventoryKey = Number(PEZ.Parameters['Inventory Key'] || 73);
    PEZ.Param.PEZCategoryItem = String(PEZ.Parameters['Category Item']);
    PEZ.Param.PEZUnblurBackground = String(PEZ.Parameters['Unblur Background']);
    PEZ.Param.PEZStopBlinking = String(PEZ.Parameters['Stop Blinking']);

    PEZ.Param.PEZinventoryBackgroundName = String(PEZ.Parameters['Inventory Background Name']);
    PEZ.Param.PEZinventoryBackgroundX = String(PEZ.Parameters['Inventory Background X']);
    PEZ.Param.PEZinventoryBackgroundY = String(PEZ.Parameters['Inventory Background Y']);
    PEZ.Param.PEZinventoryBackgroundOpacity = Number(PEZ.Parameters['Inventory Background Opacity'] || 0);
    PEZ.Param.PEZinventoryHelpBackgroundName = String(PEZ.Parameters['Help Background Name']);
    PEZ.Param.PEZinventoryHelpBackgroundX = String(PEZ.Parameters['Help Background X']);
    PEZ.Param.PEZinventoryHelpBackgroundY = String(PEZ.Parameters['Help Background Y']);
    PEZ.Param.PEZinventoryHelpBackgroundOpacity = Number(PEZ.Parameters['Help Background Opacity'] || 0);
    PEZ.Param.PEZiconSetName = String(PEZ.Parameters['IconSet Name']);

    PEZ.Param.PEZWindowWidth = String(PEZ.Parameters['Inventory Width']);
    PEZ.Param.PEZWindowHeight = String(PEZ.Parameters['Inventory Height']);
    PEZ.Param.PEZWindowX = 685;
    PEZ.Param.PEZWindowY = 268;
    PEZ.Param.PEZWindowOpacity = Number(PEZ.Parameters['Inventory Opacity'] || 0);
    PEZ.Param.PEZWindowColumns = Number(PEZ.Parameters['Inventory Columns'] || 5);
    PEZ.Param.PEZSwipePaging = String(
        PEZ.Parameters['Enable Swipe Paging'] || 'true'
    ) === 'true';
    PEZ.Param.PEZSwipeThreshold = Math.max(20, Number(
        PEZ.Parameters['Swipe Page Threshold'] || 48
    ));

    PEZ.Param.PEZWindowIconWidth = Number(PEZ.Parameters['Icon Width'] || 128);
    PEZ.Param.PEZWindowIconHeight = Number(PEZ.Parameters['Icon Height'] || 128);
    PEZ.Param.PEZWindowIconBoxWidth = Number(PEZ.Parameters['Icon Box Width'] || 130);
    PEZ.Param.PEZWindowIconBoxHeight = Number(PEZ.Parameters['Icon Box Height'] || 130);
    PEZ.Param.PEZWindowIconSpacing = Number(PEZ.Parameters['Icon Spacing'] || 24);

    PEZ.Param.PEZHelpWindowWidth = String(PEZ.Parameters['Inventory Help Width']);
    PEZ.Param.PEZHelpWindowHeight = String(PEZ.Parameters['Inventory Help Height']);
    PEZ.Param.PEZHelpWindowX = String(PEZ.Parameters['Inventory Help X']);
    PEZ.Param.PEZHelpWindowY = String(PEZ.Parameters['Inventory Help Y']);
    PEZ.Param.PEZHelpWindowOpacity = Number(PEZ.Parameters['Inventory Help Opacity'] || 255);
    PEZ.Param.PEZHelpTextMaxHeight = Math.max(1, Number(PEZ.Parameters['Help Text Max Height']) || 200);
    PEZ.Param.PEZHelpScrollSpeed = Math.max(0.01, Number(PEZ.Parameters['Help Scroll Speed']) || 0.5);
    var pezHelpScrollPause = Number(PEZ.Parameters['Help Scroll Pause']);
    PEZ.Param.PEZHelpScrollPause = Number.isFinite(pezHelpScrollPause)
        ? Math.max(0, pezHelpScrollPause)
        : 90;

//=============================================================================
//
// 0.1. ONE-SHOT EVENT ITEM LAYOUT API
//
//=============================================================================

    // 供事件脚本在执行“选择物品”前调用。配置只影响下一次打开：
    //   PEZ.setEventItemLayout("shopHud", 1250, 291);
    // 旧的开关判断仍会先执行，API 中实际提供的字段最后覆盖旧结果。
    PEZ._nextEventItemLayout = null;

    PEZ.eventItemLayoutNumber = function(value) {
        if (value === undefined || value === null || value === "") return undefined;
        var number = Number(value);
        return Number.isFinite(number) ? number : undefined;
    };

    PEZ.setEventItemLayout = function(backgroundName, x, y) {
        var source = null;
        if (backgroundName && typeof backgroundName === "object") {
            source = backgroundName;
        } else {
            source = {
                backgroundName: backgroundName,
                windowX: x,
                windowY: y
            };
        }

        var layout = {};
        var name = source.backgroundName !== undefined
            ? source.backgroundName
            : source.background;
        if (name !== undefined && name !== null && String(name).length > 0) {
            layout.backgroundName = String(name);
        }

        var windowX = source.windowX !== undefined ? source.windowX : source.x;
        var windowY = source.windowY !== undefined ? source.windowY : source.y;
        var normalizedWindowX = PEZ.eventItemLayoutNumber(windowX);
        var normalizedWindowY = PEZ.eventItemLayoutNumber(windowY);
        var normalizedBackgroundX = PEZ.eventItemLayoutNumber(source.backgroundX);
        var normalizedBackgroundY = PEZ.eventItemLayoutNumber(source.backgroundY);

        if (normalizedWindowX !== undefined) layout.windowX = normalizedWindowX;
        if (normalizedWindowY !== undefined) layout.windowY = normalizedWindowY;
        if (normalizedBackgroundX !== undefined) layout.backgroundX = normalizedBackgroundX;
        if (normalizedBackgroundY !== undefined) layout.backgroundY = normalizedBackgroundY;

        if (Object.keys(layout).length === 0) {
            console.warn("PEZ.setEventItemLayout: No valid layout values were supplied.");
            return false;
        }

        PEZ._nextEventItemLayout = layout;
        if (layout.backgroundName && typeof ImageManager !== "undefined") {
            ImageManager.loadSystem(layout.backgroundName);
        }
        return true;
    };

    PEZ.clearEventItemLayout = function() {
        PEZ._nextEventItemLayout = null;
    };

    PEZ.consumeEventItemLayout = function(layout) {
        // 若打开过程中又设置了下一份配置，不误清掉后来写入的对象。
        if (PEZ._nextEventItemLayout === layout) {
            PEZ.clearEventItemLayout();
        }
    };

    // 商店帮助文本 API。仅当本次已应用的布局背景为 shopHud 时调用，
    // 从而不依赖已被其他插件改写的 Window_Help.prototype.setItem。
    PEZ.isEventItemShopMode = function(window) {
        var layout = window && window._pezEventItemLayout;
        return !!layout && layout.backgroundName === "shopHud";
    };

    PEZ.getShopItemHelpText = function(item, itemWindow) {
        const text = (DataManager.isWeapon(item) || DataManager.isArmor(item))
            ? QJ.MPMZ.tl.ex_playerSetEquipmentDescription(item, {asProduct:true})
            : QJ.MPMZ.tl.ex_playerSetItemDescription(item, {asProduct:true});
        return text;
    };

    // YEP_ItemCore 的 <Info Eval> 原本由 Window_ItemInfo 在刷新时执行。
    // Window_EventItem 拥有独立的 updateHelp 流程，不会经过该窗口，因此在
    // 生成帮助文本前补跑一次，并令 this 与 item 都指向实际物品实例。
    PEZ.runYanflyItemInfoEval = function(item) {
        if (!item || typeof DataManager === "undefined") return false;

        let code = item.infoEval;
        if (code === undefined && typeof DataManager.getBaseItem === "function") {
            const baseItem = DataManager.getBaseItem(item);
            code = baseItem ? baseItem.infoEval : "";
        }
        if (!code) return false;

        const weapon = item;
        const armor = item;
        const s = $gameSwitches._data;
        const v = $gameVariables._data;

        try {
            const fn = new Function("item", "weapon", "armor", "s", "v", code);
            fn.call(item, item, weapon, armor, s, v);
            return true;
        } catch (error) {
            if (
                typeof Yanfly !== "undefined" &&
                Yanfly.Util &&
                typeof Yanfly.Util.displayError === "function"
            ) {
                Yanfly.Util.displayError(
                    error,
                    code,
                    "PEZ EVENT ITEM INFO EVAL ERROR"
                );
            } else {
                console.error("PEZ EVENT ITEM INFO EVAL ERROR", error, code);
            }
            return false;
        }
    };

    // 自定义商品编码：
    //   1-999 = 物品，1000+ID = 武器，2000+ID = 护甲。
    PEZ.ShopGoodsCode = {
        weaponOffset: 1000,
        armorOffset: 2000,
        databaseLimit: 1000
    };

    PEZ.decodeShopGoods = function(value) {
        var code = Number(value);
        if (!Number.isFinite(code) || Math.floor(code) !== code) return null;

        var type = "";
        var id = 0;
        var data = null;
        if (code > 0 && code < PEZ.ShopGoodsCode.databaseLimit) {
            type = "item";
            id = code;
            data = typeof $dataItems !== "undefined" ? $dataItems[id] : null;
        } else if (code > PEZ.ShopGoodsCode.weaponOffset &&
                   code < PEZ.ShopGoodsCode.armorOffset) {
            type = "weapon";
            id = code - PEZ.ShopGoodsCode.weaponOffset;
            data = typeof $dataWeapons !== "undefined" ? $dataWeapons[id] : null;
        } else if (code > PEZ.ShopGoodsCode.armorOffset &&
                   code < PEZ.ShopGoodsCode.armorOffset + PEZ.ShopGoodsCode.databaseLimit) {
            type = "armor";
            id = code - PEZ.ShopGoodsCode.armorOffset;
            data = typeof $dataArmors !== "undefined" ? $dataArmors[id] : null;
        }

        if (!type || id <= 0 || !data) return null;
        return {
            code: code,
            type: type,
            id: id,
            data: data
        };
    };

    PEZ.encodeShopGoods = function(data) {
        if (!data || !data.id) return 0;
        var id = Number(data.id);
        if (!Number.isFinite(id) || Math.floor(id) !== id ||
            id <= 0 || id >= PEZ.ShopGoodsCode.databaseLimit) {
            return 0;
        }
        if (typeof DataManager !== "undefined") {
            if (DataManager.isWeapon && DataManager.isWeapon(data)) {
                return PEZ.ShopGoodsCode.weaponOffset + id;
            }
            if (DataManager.isArmor && DataManager.isArmor(data)) {
                return PEZ.ShopGoodsCode.armorOffset + id;
            }
            if (DataManager.isItem && DataManager.isItem(data)) {
                return id;
            }
        }
        return 0;
    };

    PEZ.isCustomShopGoodsMode = function() {
        if (typeof $gameNumberArray === "undefined" || !$gameNumberArray ||
            typeof $gameNumberArray.value !== "function") {
            return false;
        }
        var goods = $gameNumberArray.value(25);
        return Array.isArray(goods) && goods.length > 0;
    };

    PEZ.savedEventItemCode = function(saved) {
        if (!saved) return 0;
        var savedCode = Number(saved.code);
        if (Number.isFinite(savedCode) && savedCode > 0) return savedCode;
        var id = Number(saved.id);
        if (!Number.isFinite(id) || id <= 0) return 0;
        if (saved.type === "weapon") return PEZ.ShopGoodsCode.weaponOffset + id;
        if (saved.type === "armor") return PEZ.ShopGoodsCode.armorOffset + id;
        return id;
    };

    // 可选扩展：只让下一次“选择物品”在确认后保持可见。
    // 窗口会被停用，后续对话和选项仍可正常接收输入。
    PEZ._nextEventItemKeepVisible = false;

    PEZ.setEventItemKeepVisible = function(enabled) {
        PEZ._nextEventItemKeepVisible = enabled !== false;
        return PEZ._nextEventItemKeepVisible;
    };

    PEZ.currentEventItemWindow = function() {
        var scene = typeof SceneManager !== "undefined" ? SceneManager._scene : null;
        if (!scene) return null;
        if (scene._eventItemWindow) return scene._eventItemWindow;
        if (scene._messageWindow && scene._messageWindow._eventItemWindow) {
            return scene._messageWindow._eventItemWindow;
        }
        return null;
    };

    PEZ.lowerEventItemWindowForMessages = function(window) {
        if (!window || !window.parent || !window._messageWindow) return;
        var parent = window.parent;
        if (window._messageWindow.parent !== parent) return;
        if (!parent.getChildIndex || !parent.setChildIndex) return;
        var windowIndex = parent.getChildIndex(window);
        var messageIndex = parent.getChildIndex(window._messageWindow);
        if (windowIndex < 0 || messageIndex < 0) return;
        if (window._pezOriginalLayerIndex === undefined) {
            window._pezOriginalLayerIndex = windowIndex;
        }
        // Window_EventItem 默认最后创建，会压在对话和选项上方；保持显示时
        // 将它放到消息窗口后面，仍高于地图图片，但不会遮住购买询问。
        if (windowIndex > messageIndex) {
            parent.setChildIndex(window, messageIndex);
        }
    };

    PEZ.restoreEventItemWindowLayer = function(window) {
        if (!window || window._pezOriginalLayerIndex === undefined || !window.parent) return;
        var parent = window.parent;
        if (!parent.setChildIndex || !parent.children || parent.children.length === 0) return;
        var targetIndex = Math.min(
            window._pezOriginalLayerIndex,
            parent.children.length - 1
        );
        parent.setChildIndex(window, targetIndex);
    };

    PEZ.finalizeClosedEventItemLayout = function(window) {
        if (!window || !window._pezClearLayoutWhenClosed) return false;
        if (!window.isClosed || !window.isClosed()) return false;
        window._pezEventItemLayout = null;
        window._pezClearLayoutWhenClosed = false;
        return true;
    };

    PEZ.closeEventItemWindow = function() {
        PEZ._nextEventItemKeepVisible = false;
        var window = PEZ.currentEventItemWindow();
        if (!window) return false;
        window._pezKeepVisibleOnOk = false;
        window._pezKeepVisibleLocked = false;
        window.deactivate();
        window.close();
        return true;
    };

//=============================================================================
// 
// 1. NEW KEYS
// 
//=============================================================================

    // 本工程只使用 PEZ 的地图物品选择功能，不绑定打开 Scene_Item 的快捷键。

//=============================================================================
// 
// 2. PRELOAD PICTURES
// 
//=============================================================================

    function preload() {
        ImageManager.loadSystem(PEZ.Param.PEZinventoryBackgroundName);
        ImageManager.loadSystem(PEZ.Param.PEZinventoryHelpBackgroundName);
        ImageManager.loadSystem(PEZ.Param.PEZiconSetName);
    };

    // MZ 在数据库加载完成后才从 System.json 设置资源加密信息。
    // 插件载入时立即 preload 会把 .png 的失败请求缓存下来，导致之后无法改读 .png_。
    // 因此先完成原 onDatabaseLoaded（其中会 setEncryptionInfo），再安全地预载资源。
    var _PEZ_Scene_Boot_onDatabaseLoaded = Scene_Boot.prototype.onDatabaseLoaded;
    Scene_Boot.prototype.onDatabaseLoaded = function() {
        _PEZ_Scene_Boot_onDatabaseLoaded.call(this);
        preload();
    };
    
//=============================================================================
// 
// 3. INVENTORY (SCENE ITEM)
// 
//=============================================================================    

    //=========================================================================
    // 3.1. CREATE WINDOW
    //========================================================================= 

    Scene_Item.prototype.create = function() {
        Scene_ItemBase.prototype.create.call(this);
        this.createHelpWindow();
        this.createItemWindow();
        this._itemWindow.opacity = PEZ.Param.PEZWindowOpacity;
        this.createActorWindow();
      };


    Scene_Item.prototype.createItemWindow = function() {
        var width = eval(PEZ.Param.PEZWindowWidth);
        var height = eval(PEZ.Param.PEZWindowHeight);
        var x = PEZ.Param.PEZWindowX; 
        var y = PEZ.Param.PEZWindowY;
        this._itemWindow = new Window_ItemList(x, y, width, height);
        this._itemWindow.setHelpWindow(this._helpWindow);
        this._itemWindow._helpWindow.opacity = 255;//PEZ.Param.PEZHelpWindowOpacity;
        this._itemWindow.setHandler('ok',     this.onItemOk.bind(this));
        this._itemWindow.setHandler('cancel', this.popScene.bind(this));
        this.addWindow(this._itemWindow);
        this._itemWindow.setCategory(PEZ.Param.PEZCategoryItem); 
        this.onCategoryOk();
    };

    //=========================================================================
    // 3.2. CREATE BACKGROUND
    //========================================================================= 
    
    Scene_Item.prototype.createBackground = function() {
        this._backgroundItem1 = new Sprite();
        this._backgroundItem2 = new Sprite();
        this._backgroundItem3 = new Sprite();
        this._backgroundItem1.bitmap = SceneManager.backgroundBitmap();
        this._backgroundItem2.bitmap = ImageManager.loadSystem(PEZ.Param.PEZinventoryBackgroundName);
        this._backgroundItem3.bitmap = ImageManager.loadSystem(PEZ.Param.PEZinventoryHelpBackgroundName);
        this._backgroundItem2.x = eval(PEZ.Param.PEZinventoryBackgroundX);
        this._backgroundItem2.y = eval(PEZ.Param.PEZinventoryBackgroundY);
        this._backgroundItem2.opacity = PEZ.Param.PEZinventoryBackgroundOpacity;
        this._backgroundItem3.x = eval(PEZ.Param.PEZinventoryHelpBackgroundX);
        this._backgroundItem3.y = eval(PEZ.Param.PEZinventoryHelpBackgroundY);
        this._backgroundItem3.opacity = PEZ.Param.PEZinventoryHelpBackgroundOpacity;
        this.addChild(this._backgroundItem1);
        this.addChild(this._backgroundItem2);
        this.addChild(this._backgroundItem3);
    };

    //=========================================================================
    // 3.3. CREATE SIZES AND DRAW ICONS
    //========================================================================= 
    
    Window_ItemList.prototype.maxCols = function() {
        return PEZ.Param.PEZWindowColumns;
    };

    Window_ItemList.prototype.spacing = function() {
        return PEZ.Param.PEZWindowIconSpacing;
    };

    Window_ItemList.prototype.itemWidth = function() {
        return PEZ.Param.PEZWindowIconBoxWidth; 
    };

    Window_ItemList.prototype.itemHeight = function() {
        return PEZ.Param.PEZWindowIconBoxHeight;
    };

    Window_ItemList.prototype.drawItem = function(index) {
        var item = this._data[index];
        if (item) {
            var rect = this.itemRect(index);
            rect.width -= this.textPadding();
            this.changePaintOpacity(this.isEnabled(item));
            this.drawItemName(item, rect.x, rect.y, rect.width);
            this.changePaintOpacity(1);        
        }
    };

    Window_ItemList.prototype.drawItemName = function(item, x, y, width) {
        width = width || 312;
        if (item) {
            var iconBoxWidth = Window_Base._iconWidth + 4;
            this.resetTextColor();
            this.drawIcon(item.iconIndex, x + 2, y + 2);
        }
    };

    Window_ItemList.prototype.drawIcon = function(iconIndex, x, y) {
        var bitmap = ImageManager.loadSystem(PEZ.Param.PEZiconSetName);
        var pw = PEZ.Param.PEZWindowIconWidth;
        var ph = PEZ.Param.PEZWindowIconHeight;
        var sx = iconIndex % (16) * pw;
        var sy = Math.floor(iconIndex / 16) * ph;
        this.contents.blt(bitmap, sx, sy, pw, ph, x, y);
    };

    //=========================================================================
    // 3.4. DISABLED SCENE_ITEM ENTRY (MAP ITEM SELECTION REMAINS AVAILABLE)
    //========================================================================= 
    
    // 不再逐帧监听旧背包入口；保留方法供旧调用方使用，但不切场景、不隐藏地图 UI。
    Scene_Map.prototype.isInventoryCalled = function() {
        return false;
    };

    Scene_Map.prototype.updateCallInventory = function() {
        this.inventoryCalling = false;
    };

    Scene_Map.prototype.callInventory = function() {
        this.inventoryCalling = false;
    };
    
    //=========================================================================
    // 3.5. USE "I" KEY TO CLOSE INVENTORY
    //========================================================================= 
    
    Scene_Item.prototype.update = function() {
        Scene_MenuBase.prototype.update.call(this);
        this.updateCloseInventory();
        if (this._itemWindow && PEZ.updateInventorySwipePaging) {
            PEZ.updateInventorySwipePaging(this._itemWindow);
        }
    };

    Scene_Item.prototype.isInventoryClosed = function() {
        return Input.isTriggered('inv');
    };

    Scene_Item.prototype.updateCloseInventory = function() {
        if (this.isInventoryClosed()) {
                this.closeInventory();
            }
    };

    Scene_Item.prototype.closeInventory = function() {
        SceneManager.goto(Scene_Map);
    };

//=============================================================================
// 
// 4. INVENTORY (SELECT ITEM COMMAND)
// 
//=============================================================================    

function Sprite_WindowButton() {
    this.initialize.apply(this, arguments);
}

// MZ 适配：MV 的 Sprite_Button 在 MZ 中被重写为"查表式按钮"(buttonType+setupFrames)，
//   直接继承会在 setupFrames 读 undefined.x 崩溃。
//   本按钮只用整图 bitmap + 点击回调，故改继承 Sprite_Clickable，并补回 setClickHandler/onClick。
Sprite_WindowButton.prototype = Object.create(Sprite_Clickable.prototype);
Sprite_WindowButton.prototype.constructor = Sprite_WindowButton;

Sprite_WindowButton.prototype.initialize = function() {
    Sprite_Clickable.prototype.initialize.call(this);
    this._clickHandler = null;
};

Sprite_WindowButton.prototype.setClickHandler = function(method) {
    this._clickHandler = method;
};

Sprite_WindowButton.prototype.onClick = function() {
    if (this._clickHandler) {
        this._clickHandler();
    }
};

Sprite_WindowButton.prototype.update = function() {
    Sprite.prototype.update.call(this);
    // 保持显示模式下，按钮仍显示，但不能抢走后续对话/选项的点击。
    const interactionLocked = this.parent && this.parent._pezKeepVisibleLocked;
    if (this.visible && !interactionLocked) {
        this.processTouch();   // Sprite_Clickable 提供：命中并点击时触发 onClick
    }
};


    //=========================================================================
    // 4.1. CREATE WINDOW
    //========================================================================= 

    Window_EventItem.prototype.initialize = function(messageWindow) {
        this._messageWindow = messageWindow;
        var width = 560;//eval(PEZ.Param.PEZWindowWidth);
        // MV→MZ：MV 的 Window_Selectable.contentsHeight 会向下取整到整行（floor(h/itemHeight)*itemHeight），
        //   MZ 不取整 → 可视区会露出半截的第 5 行。这里把窗口高度向下取整到整行数，复刻 MV 的 5×4 显示。
        var _pezPad = (typeof $gameSystem !== "undefined" && $gameSystem) ? $gameSystem.windowPadding() : 12;
        var height = Math.floor((360 - _pezPad * 2) / 78) * 78 + _pezPad * 2;//eval(PEZ.Param.PEZWindowHeight);
        var x = PEZ.Param.PEZWindowX;
        var y = PEZ.Param.PEZWindowY;		
        Window_ItemList.prototype.initialize.call(this, x, y, width, height);
        this.opacity = PEZ.Param.PEZWindowOpacity;
        this.openness = 0;
		this.deactivate();
        this.setHandler('ok',     this.onOk.bind(this));
        this.setHandler('cancel', this.onCancel.bind(this));
		this.createHelpWindow();
        PEZ.setupHelpWindowGeometry(this._helpWindow, -35, 450, 600, 4, 0);
    };

    //=========================================================================
    // 4.2. CREATE BACKGROUND
    //=========================================================================

    Window_EventItem.prototype.start = function() {
        // 同一份一次性配置要同时供背景和窗口定位使用，因此在整个打开流程
        // 完成后才消费；没有 API 配置时，下面所有行为与旧版一致。
        const pendingApiLayout = PEZ._nextEventItemLayout;
        const wasClosing = this._pezClearLayoutWhenClosed;
        // 全局请求只消费一次，但窗口实例必须在真正 close() 前保留快照。
        // Drill_DialogOperator 会在后续每段对话开始时再次调用 updatePlacement；
        // 若这里提前清空，保持显示的商店窗口就会跳回旧开关坐标。
        if (pendingApiLayout) {
            this._pezEventItemLayout = pendingApiLayout;
        } else if (wasClosing) {
            // 上一次已进入关闭流程但尚未播完动画；此时 start() 表示一次
            // 新的打开，没有新 API 就应回到旧规则，而不是继承上次布局。
            this._pezEventItemLayout = null;
        }
        this._pezClearLayoutWhenClosed = false;
        const apiLayout = this._pezEventItemLayout || null;
        const keepVisible = PEZ._nextEventItemKeepVisible;
        this._pezKeepVisibleOnOk = keepVisible;
        this._pezKeepVisibleLocked = false;
        // Window_EventItem 实例会被反复复用。每次重新打开都允许当前物品的
        // Info Eval 再执行一次，以同步依赖游戏状态的动态说明。
        this._pezLastInfoEvalItem = null;
        PEZ.restoreEventItemWindowLayer(this);
        try {
            this.refresh();
            this.createBackground();
            this.updatePlacement();
            let idx = 0;
            const saved = $gameTemp._lastEventItemIndex;
            const savedCode = PEZ.savedEventItemCode(saved);
            if (savedCode > 0 && this._data && this._data.length) {
                const found = this._data.findIndex(it => {
                    return PEZ.encodeShopGoods(it) === savedCode;
                });
                if (found >= 0) idx = found;
            }
            this.select(idx);
            this.open();
            this.activate();
        } finally {
            if (pendingApiLayout) PEZ.consumeEventItemLayout(pendingApiLayout);
            if (keepVisible && PEZ._nextEventItemKeepVisible === keepVisible) {
                PEZ._nextEventItemKeepVisible = false;
            }
        }
    };

    const _PEZ_Window_EventItem_onOk = Window_EventItem.prototype.onOk;
    Window_EventItem.prototype.onOk = function() {
        const item = this.item();
        const resultValue = PEZ.encodeShopGoods(item);
        const needsEncodedResult = !!item && resultValue !== item.id;
        if (!this._pezKeepVisibleOnOk && !needsEncodedResult) {
            _PEZ_Window_EventItem_onOk.call(this);
            return;
        }

        $gameVariables.setValue($gameMessage.itemChoiceVariableId(), resultValue);

        if (!this._pezKeepVisibleOnOk) {
            // 原版 onOk 会写裸 ID；装备商品必须写回带类型的编码。
            this._messageWindow.terminateMessage();
            this.close();
            return;
        }

        // processOk 已经 deactivate，这里再次明确锁定交互；必须正常结束
        // itemChoice 消息状态，事件解释器才能继续执行后续对话和选项。
        this._pezKeepVisibleOnOk = false;
        this._pezKeepVisibleLocked = true;
        this.deactivate();
        this._messageWindow.terminateMessage();
        PEZ.lowerEventItemWindowForMessages(this);
        // 有意不调用 close()：画面保留，直到 PEZ.closeEventItemWindow()
        // 或下一次“选择物品”命令重新 start()。
    };

    const _PEZ_Window_EventItem_close = Window_EventItem.prototype.close;
    Window_EventItem.prototype.close = function() {
        this._pezKeepVisibleOnOk = false;
        this._pezKeepVisibleLocked = false;
        // close() 只启动约 8 帧的 openness 动画。动画期间保留布局，
        // 避免 Drill_DialogOperator 再定位时闪回旧坐标。
        this._pezClearLayoutWhenClosed = true;
        _PEZ_Window_EventItem_close.call(this);
        PEZ.finalizeClosedEventItemLayout(this);
    };

    Window_EventItem.prototype.update = function() {
        // 运行时从父类取 update，确保后加载的 Drill_MenuScrollBar 对
        // Window_Selectable.prototype.update 的扩展不会被提前缓存并绕过。
        Window_ItemList.prototype.update.call(this);
        // updateClose() 在原 update 链内推进；完全不可见后再清理实例快照。
        PEZ.finalizeClosedEventItemLayout(this);
        if (PEZ.updateInventorySwipePaging) {
            PEZ.updateInventorySwipePaging(this);
        }
    };

    const _processOk = Window_EventItem.prototype.processOk;
    Window_EventItem.prototype.processOk = function() {
        const item = this.item && this.item();
        if (item && this.isCurrentItemEnabled && this.isCurrentItemEnabled()) {
            const code = PEZ.encodeShopGoods(item);
            let type = "item";
            if (DataManager.isWeapon && DataManager.isWeapon(item)) type = "weapon";
            if (DataManager.isArmor && DataManager.isArmor(item)) type = "armor";
            $gameTemp._lastEventItemIndex = {
                type: type,
                id: item.id,
                code: code
            };
        }
        _processOk.call(this);
    };

    Window_EventItem.prototype.createBackground = function() {
		if (!$gameNumberArray || !$gameSwitches) return;
		if (!SceneManager || SceneManager._scene.constructor !== Scene_Map) return;
		if (this._backgroundItem2) {
        this.removeChild(this._backgroundItem2);
       }
        this._backgroundItem2 = new Sprite();
        //this._backgroundItem3 = new Sprite();
        let hudType = 'itemHud';
		if ($gameSwitches.value(30)) hudType = 'drinkHud';  // 喝茶饮料选单
        if ($gameSwitches.value(55)) hudType = 'foodHud';   // 料理食材选单
        if ($gameNumberArray.value(25).length > 0 && $gameSwitches.value(3)) hudType = 'shopHud'; // 商店物品选单
        if ($gameMap.chahuiMapTemp?.isQuestList) hudType = 'quest_hud'; // 任务列表选单
        // 兼容迁移：旧条件先决定默认值，下一次布局 API 最后覆盖。
        const apiLayout = this._pezEventItemLayout;
        if (apiLayout && apiLayout.backgroundName !== undefined) {
            hudType = apiLayout.backgroundName;
        }

        this._backgroundItem2.bitmap = ImageManager.loadSystem(hudType);
        //this._backgroundItem3.bitmap = ImageManager.loadSystem(PEZ.Param.PEZinventoryHelpBackgroundName);
        this._backgroundItem2.x = -92;//eval(PEZ.Param.PEZinventoryBackgroundX);
        this._backgroundItem2.y = -186;//eval(PEZ.Param.PEZinventoryBackgroundY);
        if (apiLayout && apiLayout.backgroundX !== undefined) {
            this._backgroundItem2.x = apiLayout.backgroundX;
        }
        if (apiLayout && apiLayout.backgroundY !== undefined) {
            this._backgroundItem2.y = apiLayout.backgroundY;
        }
        this._backgroundItem2.opacity = 255;//PEZ.Param.PEZinventoryBackgroundOpacity;
        //this._backgroundItem3.x = eval(PEZ.Param.PEZinventoryHelpBackgroundX) - 100;
        //this._backgroundItem3.y = eval(PEZ.Param.PEZinventoryHelpBackgroundY) - 100;
        //this._backgroundItem3.opacity = PEZ.Param.PEZinventoryHelpBackgroundOpacity;
        this.addChildToBack(this._backgroundItem2);
        //this.addChild(this._backgroundItem3);
    };
	
	Window_EventItem.prototype.isEnabled = function(item) {
       if ($gameNumberArray.value(25).length > 0) {
		   return true;
	   }
       return $gameParty.canUse(item);

     };
	 
	Window_EventItem.prototype.select = function(index) {
    Window_Command.prototype.select.call(this, index);
    this._eventRan = false;
    }

    //=========================================================================
    // 4.3. CREATE SIZES AND DRAW ICONS
    //========================================================================= 

    Window_EventItem.prototype.createHelpWindow = function () {		
        this._helpWindow = new Window_Help();
        PEZ.applyHelpWindowRefresh(this._helpWindow);
        this.addChild(this._helpWindow);
    };

    const _PEZ_Window_EventItem_updateHelp = Window_EventItem.prototype.updateHelp;
    Window_EventItem.prototype.updateHelp = function() {
        const item = this.item();
        let infoEvalRan = false;
        if (this._pezLastInfoEvalItem !== item) {
            this._pezLastInfoEvalItem = item;
            infoEvalRan = PEZ.runYanflyItemInfoEval(item);
        }

        if (!PEZ.isEventItemShopMode(this)) {
            const previousText = this._helpWindow ? this._helpWindow._text : null;
            _PEZ_Window_EventItem_updateHelp.call(this);
            // 多个独立实例通常共享同一段原始描述（例如都只含 \str[110]）。
            // setText 会因字符串相同而跳过 refresh，但 Info Eval 已经改写了
            // 转义码所引用的值，因此仍须重新绘制帮助窗口。
            if (
                infoEvalRan &&
                this._helpWindow &&
                this._helpWindow._text === previousText
            ) {
                this._helpWindow.refresh();
            }
            return;
        }
        if (!this._helpWindow) return;

        const previousText = this._helpWindow._text;
        const text = PEZ.getShopItemHelpText(item, this);
        this._helpWindow.setText(text == null ? "" : String(text));
        if (infoEvalRan && this._helpWindow._text === previousText) {
            this._helpWindow.refresh();
        }
    };

    Window_EventItem.prototype.updatePlacement = function() {
        // 标记：由 PEZ 自行定位，Drill_DialogOperator 的 Window_EventItem.updatePlacement 翻转见此标记会跳过，
        //   否则它会把下面设的 y 翻成 0、把库存顶到屏幕外。
        this._drill_DOp_skipItemFlip = true;

        let xx = PEZ.Param.PEZWindowX;
        let yy = PEZ.Param.PEZWindowY;
        if ($gameSwitches.value(30)) {
        this.x = xx - 400;
        this.y = yy;	
        } else if ($gameSwitches.value(55)){
        // 料理界面	
        this.x = xx + 565;
        this.y = yy + 23;
        //this._backgroundItem2.opacity = 165;
        } else {
        this.x = xx;
        this.y = yy; 			
        }
        // API 坐标使用绝对屏幕坐标，并在旧开关定位完成后覆盖。
        const apiLayout = this._pezEventItemLayout;
        if (apiLayout && apiLayout.windowX !== undefined) {
            this.x = apiLayout.windowX;
        }
        if (apiLayout && apiLayout.windowY !== undefined) {
            this.y = apiLayout.windowY;
        }
        PEZ.setupHelpWindowGeometry(this._helpWindow, -65, 445, 960, 5, 0);
    };

    Window_EventItem.prototype.maxCols = function() {
        return PEZ.Param.PEZWindowColumns;
    };

    Window_EventItem.prototype.spacing = function() {
        return PEZ.Param.PEZWindowIconSpacing;
    };

    Window_EventItem.prototype.itemWidth = function() {
        return PEZ.Param.PEZWindowIconBoxWidth;
    };

    Window_EventItem.prototype.itemHeight = function() {
        return 78;
    };

    // MV→MZ：MZ 的 Window_Scrollable 滚轮(processWheelScroll)只滚动内容、不改选中索引，
    //   翻过头后光标会停在被滚走的隐藏物品上。这里改为按行移动光标，用 forceSelect（瞬时滚动），
    //   光标和视图一起到位，避免 smoothSelect 动画延迟导致光标先出界再弹回。
    Window_EventItem.prototype.processWheelScroll = function() {
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
    Window_EventItem.prototype.onTouchSelect = function(trigger) {
        if (!trigger) {
            if (this._drill_lastHoverX === TouchInput.x && this._drill_lastHoverY === TouchInput.y) return;
            this._drill_lastHoverX = TouchInput.x;
            this._drill_lastHoverY = TouchInput.y;
        }
        Window_Selectable.prototype.onTouchSelect.call(this, trigger);
    };

    // MZ 适配：MZ 的 itemRect 列距固定为 itemWidth 且忽略 spacing()，
    //   这里恢复 MV 语义——列距 = itemWidth + spacing()，使图标按设定的 48px 间距排列。
    Window_EventItem.prototype.itemRect = function(index) {
        var maxCols = this.maxCols();
        var w = this.itemWidth();
        var h = this.itemHeight();
        var col = index % maxCols;
        var row = Math.floor(index / maxCols);
        var x = col * (w + this.spacing()) - (this.scrollBaseX ? this.scrollBaseX() : 0);
        var y = row * h - (this.scrollBaseY ? this.scrollBaseY() : 0);
        return new Rectangle(x, y, w, h);
    };

    Window_EventItem.prototype.drawItem = function(index) {
        var item = this._data[index];
        if (item) {
            var rect = this.itemRect(index);
            rect.width -= this.textPadding();
            //this.changePaintOpacity(this.isEnabled(item));
            this.drawItemName(item, rect.x, rect.y, rect.width);
            this.changePaintOpacity(1);        
        }
    };

    Window_EventItem.prototype.drawItemName = function(item, x, y, width) {
        width = width || 312;
        if (item) {
            var iconBoxWidth = Window_Base._iconWidth + 4;
            this.resetTextColor();
            this.drawIcon(item.iconIndex, x + 2, y + 2);
        }
    };

    Window_EventItem.prototype.drawIcon = function(iconIndex, x, y) {
        var bitmap = ImageManager.loadSystem(PEZ.Param.PEZiconSetName);
        // MZ 适配：IconSet_large 体积大、首次打开常未加载完，
        //   原代码直接 blt 会画空。这里若图未就绪，则挂一次加载回调重绘整个窗口。
        if (!bitmap.isReady()) {
            if (!this._pezIconReloadHooked) {
                this._pezIconReloadHooked = true;
                bitmap.addLoadListener(function() {
                    this._pezIconReloadHooked = false;
                    if (this.contents) { this.refresh(); }
                }.bind(this));
            }
            return;
        }
        var pw = PEZ.Param.PEZWindowIconWidth;
        var ph = PEZ.Param.PEZWindowIconHeight;
        var sx = iconIndex % 16 * pw;
        var sy = Math.floor(iconIndex / 16) * ph;
        this.contents.blt(bitmap, sx, sy, pw, ph, x, y);
    };
	

//适配Drill指针
Window_EventItem.prototype.drill_MCu_cursorStyleId = function() {
        return 8;
}


//=============================================================================
// 
// 5. Help Window (Scene Item)
// 
//=============================================================================   

    PEZ.applyHelpWindowRefresh = function(window) {
        if (!window) return;
        window.refresh = PEZ.helpWindowRefresh;
        if (!window._pezHelpAutoScrollApplied) {
            window._pezHelpAutoScrollApplied = true;
            window.contentsHeight = PEZ.helpWindowContentsHeight;
            window.update = PEZ.helpWindowUpdate;
            window.open = PEZ.helpWindowOpen;
            PEZ.createHelpWindowDescriptionMask(window);
            PEZ.resetHelpWindowAutoScroll(window);
        }
    };

    PEZ.createHelpWindowDescriptionMask = function(window) {
        if (!window || window._pezHelpDescriptionMask) return;
        if (typeof PIXI === "undefined" || !PIXI.Graphics ||
            !window._clientArea || !window._contentsSprite) {
            return;
        }
        window._pezHelpDescriptionMask = new PIXI.Graphics();
        window._clientArea.addChild(window._pezHelpDescriptionMask);
        window._contentsSprite.mask = window._pezHelpDescriptionMask;
        PEZ.refreshHelpWindowDescriptionMask(window);
    };

    PEZ.refreshHelpWindowDescriptionMask = function(window) {
        var mask = window && window._pezHelpDescriptionMask;
        if (!mask) return;
        mask.clear();
        mask.beginFill(0xffffff);
        mask.drawRect(0, 0, window.innerWidth, window.innerHeight);
        mask.endFill();
    };

    PEZ.helpWindowContentsHeight = function() {
        return Math.max(this.innerHeight, this._pezHelpScrollBitmapHeight || 0);
    };

    PEZ.helpWindowScreenY = function(window) {
        var screenY = Number(window && window.y) || 0;
        var parent = window && window.parent;
        while (parent) {
            screenY += Number(parent.y) || 0;
            parent = parent.parent;
        }
        return screenY;
    };

    PEZ.helpWindowRefresh = function () {
        var text = this._text || "";
        var sz = this.textSizeEx(text);
        var contentH = Math.ceil((sz && sz.height > 0) ? sz.height : this.lineHeight() * 2);
        var textOffsetY = 6;
        var visibleTextH = Math.min(contentH, PEZ.Param.PEZHelpTextMaxHeight);
        var needH = Math.max(
            this.fittingHeight(2),
            visibleTextH + this.padding * 2 + textOffsetY * 2
        );
        if (typeof Graphics !== "undefined") {
            var availableH = Graphics.boxHeight - PEZ.helpWindowScreenY(this) - 12;
            needH = Math.min(needH, Math.max(this.fittingHeight(2), availableH));
        }

        this._pezHelpScrollBitmapHeight = Math.max(
            needH - this.padding * 2,
            contentH + textOffsetY * 2
        );
        if (this.height !== needH && needH > 0) {
            this.move(this.x, this.y, this.width, needH);
        }
        if (!this.contents ||
            this.contents.width !== this.contentsWidth() ||
            this.contents.height !== this.contentsHeight()) {
            this.createContents();
        }
        PEZ.refreshHelpWindowDescriptionMask(this);
        this.contents.clear();
        this.drawTextEx(text, this.textPadding(), textOffsetY);
        this._pezHelpScrollMax = Math.max(
            0,
            this._pezHelpScrollBitmapHeight - this.innerHeight
        );
        PEZ.resetHelpWindowAutoScroll(this);
    };

    PEZ.resetHelpWindowAutoScroll = function(window) {
        if (!window) return;
        window._pezHelpScrollOffset = 0;
        window._pezHelpScrollDirection = 1;
        // 新描述立即开始移动；停顿只发生在真正到达顶部或底部之后。
        window._pezHelpScrollWait = 0;
        if (window.origin) window.origin.y = 0;
        if (window._contentsSprite) window._contentsSprite.y = 0;
    };

    PEZ.helpWindowOpen = function() {
        if (!this.isOpen()) PEZ.resetHelpWindowAutoScroll(this);
        Window_Help.prototype.open.call(this);
    };

    PEZ.helpWindowUpdate = function() {
        Window_Help.prototype.update.call(this);
        PEZ.updateHelpWindowAutoScroll(this);
    };

    PEZ.updateHelpWindowAutoScroll = function(window) {
        if (!window || !window.isOpen() || !(window._pezHelpScrollMax > 0)) return;
        if (window._pezHelpScrollWait > 0) {
            window._pezHelpScrollWait--;
            return;
        }

        window._pezHelpScrollOffset +=
            PEZ.Param.PEZHelpScrollSpeed * window._pezHelpScrollDirection;
        if (window._pezHelpScrollOffset >= window._pezHelpScrollMax) {
            window._pezHelpScrollOffset = window._pezHelpScrollMax;
            window._pezHelpScrollDirection = -1;
            window._pezHelpScrollWait = PEZ.Param.PEZHelpScrollPause;
        } else if (window._pezHelpScrollOffset <= 0) {
            window._pezHelpScrollOffset = 0;
            window._pezHelpScrollDirection = 1;
            window._pezHelpScrollWait = PEZ.Param.PEZHelpScrollPause;
        }
        // 仅移动文字位图，遮罩固定；取整可避免小数坐标让文字发虚。
        if (window._contentsSprite) {
            window._contentsSprite.y = -Math.round(window._pezHelpScrollOffset);
        }
    };

    PEZ.setupHelpWindowGeometry = function(window, x, y, width, lines, opacity) {
        if (!window) return;
        var height = window.fittingHeight(lines || 2);
        if (typeof Graphics !== "undefined") {
            height = Math.min(height, Math.max(window.fittingHeight(2), Graphics.boxHeight - y - 12));
        }
        window.move(x, y, width, height);
        window.createContents();
        if (opacity != null) window.opacity = opacity;
        PEZ.applyHelpWindowRefresh(window);
        window.refresh();
    };

    PEZ.evalHelpNumber = function(value, fallback) {
        var numLines = fallback;
        try {
            var result = eval(value);
            return Number(result) || fallback;
        } catch (e) {
            return fallback;
        }
    };

    PEZ.setupInventoryHelpWindow = function(window, opacity) {
        var width = PEZ.evalHelpNumber(PEZ.Param.PEZHelpWindowWidth, Graphics.boxWidth);
        var lines = PEZ.evalHelpNumber(PEZ.Param.PEZHelpWindowHeight, 4);
        var x = PEZ.evalHelpNumber(PEZ.Param.PEZHelpWindowX, 0);
        var y = PEZ.evalHelpNumber(PEZ.Param.PEZHelpWindowY, 0);
        PEZ.setupHelpWindowGeometry(window, x, y, width, lines, opacity);
    };

    Scene_Item.prototype.createHelpWindow = function() {
        this._helpWindow = new Window_Help();
        PEZ.setupInventoryHelpWindow(this._helpWindow, PEZ.Param.PEZHelpWindowOpacity);
        this.addWindow(this._helpWindow);
    };    

//=============================================================================
//
// 5.1. CONTINUOUS SWIPE PAGING
//
//=============================================================================

    // 主物品栏和事件“选择物品”窗口共用同一套整页吸附手势。
    // 每继续拖过一个阈值就再翻一页，避免 MZ 像素滚动与 Drill 滚动条产生半行偏移。
    PEZ.updateInventorySwipePaging = function(window) {
        if (!PEZ.Param.PEZSwipePaging || !window.isOpenAndActive()) {
            window._pezSwipeTracking = false;
            return;
        }

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
            const onScrollBar = window.drill_MSB_isOnRange &&
                window.drill_MSB_isOnRange() === true;
            window._pezSwipeTracking =
                window.isTouchedInsideFrame() && !onScrollBar;
            window._pezSwipeStartY = TouchInput.y;
        }

        if (!window._pezSwipeTracking) return;

        if (isReleased || !isPressed) {
            window._pezSwipeTracking = false;
            return;
        }

        const deltaY = TouchInput.y - window._pezSwipeStartY;
        if (Math.abs(deltaY) < PEZ.Param.PEZSwipeThreshold) return;

        const oldTopRow = window.topRow();
        const pageRows = Math.max(1, window.maxPageRows());
        const targetTopRow = deltaY < 0 ?
            Math.min(oldTopRow + pageRows, window.maxTopRow()) :
            Math.max(oldTopRow - pageRows, 0);

        if (targetTopRow === oldTopRow) {
            window._pezSwipeStartY = TouchInput.y;
            return;
        }

        // 取消按下时产生的临时选中，避免翻页后被 ensureCursorVisible 拉回，
        // 同时确保拖动不会误触使用物品或批量选择。
        window.select(-1);
        window.setTopRow(targetTopRow);
        SoundManager.playCursor();

        // 仅消耗一页所需距离，保留多余拖动量以支持持续翻页与中途反向。
        window._pezSwipeStartY += deltaY < 0 ?
            -PEZ.Param.PEZSwipeThreshold : PEZ.Param.PEZSwipeThreshold;
    };

//=============================================================================
// 
// 6. MISC 
// 
//=============================================================================   


    // MZ 适配：MV 的 this._windowCursorSprite 在 MZ 中为 this._cursorSprite，
    //   且 MZ 的 _updateCursor 还负责光标定位（位置/大小），不能只设 alpha。
    //   故 alias 原版（保留定位+默认闪烁），仅在"关闭闪烁"选项开启时叠加固定 alpha。
    var _PEZ_Window_updateCursor = Window.prototype._updateCursor;
    Window.prototype._updateCursor = function() {
        _PEZ_Window_updateCursor.call(this);
        // 性能优化：缓存 eval 结果（PEZStopBlinking 是恒定参数），避免每帧每窗口都跑一次 eval()
        if (PEZ._drill_stopBlinkingCached === undefined) {
            PEZ._drill_stopBlinkingCached = !!eval(PEZ.Param.PEZStopBlinking);
        }
        if (PEZ._drill_stopBlinkingCached && this._cursorSprite) {
            this._cursorSprite.alpha = 1;                 // MZ 的 alpha 为 0~1
            this._cursorSprite.visible = this.isOpen();
        }
    };
 
    /*
    SceneManager.snapForBackground = function() {
		
        if (eval(PEZ.Param.PEZUnblurBackground)) {
            this._backgroundBitmap = this.snap();
            //this._backgroundBitmap.blur();
        }
        if (!eval(PEZ.Param.PEZUnblurBackground)) {
            this._backgroundBitmap = this.snap();
            //this._backgroundBitmap.blur();
        }
		
    };
	*/

    /*    
(function() {
  let _dummySnapBmp = null;

  SceneManager.snap = function() {
    if (!_dummySnapBmp) _dummySnapBmp = new Bitmap(1, 1);
    return _dummySnapBmp;
  };

  SceneManager.snapForBackground = function() {
    this._backgroundBitmap = null;
  };
})();	
*/
