/*:
 * @target MZ
 * @plugindesc v1.3.0-standalone Equip, unequip and persistent equip effects. <WAY_CustomOnEquipEval>
 * @author waynee95 / standalone MZ port by shiroin
 *
 * @help
 * WAY_CustomOnEquipEval.js
 * =============================================================================
 * Standalone MZ port of WAY_CustomOnEquipEval. This version does not require
 * WAY_Core.
 *
 * Weapon and Armor Notetags:
 *
 * <Custom On Equip Eval>
 * code
 * </Custom On Equip Eval>
 *
 * <Custom On Remove Equip Eval>
 * code
 * </Custom On Remove Equip Eval>
 *
 * <Custom While Equipped Eval>
 * code
 * </Custom While Equipped Eval>
 *
 * While Equipped runs once after On Equip when changeEquip changes an item
 * on a ready map. It does NOT run every frame or during initEquips.
 * QJ.MPMZ.tl.retriggerEquippedEffects() restores only While Equipped effects
 * for the party leader's current equipment. Returns the number executed.
 * Call after map/listener initialization (also for loaded games).
 * Scripts must prevent duplicate listeners and handle map restrictions.
 * Use On Remove Equip to clean up listeners when the item is removed.
 * Independent items use their base item's current While Equipped script
 * when their own note does not contain this tag; item remains the instance.
 *
 * Variables available inside eval:
 *   user, a  - actor who equipped/unequipped the item
 *   item     - equipped/unequipped weapon or armor
 *   s        - $gameSwitches._data
 *   v        - $gameVariables._data
 *   p        - $gameParty
 *
 * This plugin should be below equip-system plugins that replace
 * Game_Actor.changeEquip / initEquips.
 */

(function(){
	"use strict";

	var Imported = window.Imported || (window.Imported = {});
	Imported.WAY_CustomOnEquipEval = true;

	window.WAY_CustomOnEquipEval = window.WAY_CustomOnEquipEval || {};
	var $ = window.WAY_CustomOnEquipEval;
	$.alias = $.alias || {};

	var CUSTOM_ON_EQUIP_EVAL = "customOnEquipEval";
	var CUSTOM_ON_REMOVE_EQUIP_EVAL = "customOnRemoveEquipEval";
	var CUSTOM_WHILE_EQUIPPED_EVAL = "customWhileEquippedEval";

	function trim( value ){
		return value == null ? value : String( value ).trim();
	}

	function getMultiLineNotetag( note, tagName, defaultValue, filter ){
		if( !note ){ return defaultValue; }
		var escaped = tagName.replace( /[.*+?^${}()|[\]\\]/g, "\\$&" );
		var pattern = new RegExp( "<" + escaped + ">[\\r\\n]*([\\s\\S]*?)[\\r\\n]*<\\/" + escaped + ">", "i" );
		var match = String( note ).match( pattern );
		if( !match ){ return defaultValue; }
		var result = match[1];
		return filter ? filter( result ) : result;
	}

	function parseNotetags( obj ){
		if( !obj || !obj.note ){ return; }
		obj[ CUSTOM_ON_EQUIP_EVAL ] = getMultiLineNotetag( obj.note, "Custom On Equip Eval", null, trim );
		obj[ CUSTOM_ON_REMOVE_EQUIP_EVAL ] = getMultiLineNotetag( obj.note, "Custom On Remove Equip Eval", null, trim );
		obj[ CUSTOM_WHILE_EQUIPPED_EVAL ] = getMultiLineNotetag( obj.note, "Custom While Equipped Eval", null, trim );
	}

	$.parseNotetags = parseNotetags;

	$.alias.DataManager_extractMetadata = DataManager.extractMetadata;
	DataManager.extractMetadata = function( data ){
		$.alias.DataManager_extractMetadata.call( this, data );
		// Do not call DataManager.isWeapon/isArmor here: during database loading
		// $dataWeapons/$dataArmors can still be null in MZ.
		if( data && data.note !== undefined &&
			( data.wtypeId !== undefined || data.atypeId !== undefined ) ){
			parseNotetags( data );
		}
	};

	function whileEquippedCode( item ){
		if( !item ){ return null; }
		// Read at this event-time boundary so old independent save instances
		// also see newly added base notetags, without rewriting the instance.
		var code = getMultiLineNotetag( item.note, "Custom While Equipped Eval", null, trim );
		if( code !== null ){ return code; }
		if( item.baseItemId ){
			var database = item.wtypeId !== undefined ? $dataWeapons : $dataArmors;
			var base = database && database[ item.baseItemId ];
			return base ? getMultiLineNotetag( base.note, "Custom While Equipped Eval", null, trim ) : null;
		}
		return item[ CUSTOM_WHILE_EQUIPPED_EVAL ];
	}

	function evalCode( user, item, type ){
		var code = type === CUSTOM_WHILE_EQUIPPED_EVAL ? whileEquippedCode( item ) : item && item[ type ];
		if( code ){
			var a = user;
			var s = $gameSwitches._data;
			var v = $gameVariables._data;
			var p = $gameParty;

			try{
				return eval( code );
			}catch( e ){
				console.error( "[WAY_CustomOnEquipEval] Eval failed:", item.name, type, e );
				throw e;
			}
		}
		return false;
	}

	$.evalCode = evalCode;

	function isMapReady(){
		return !!( $gameMap && $gameMap.mapId() > 0 );
	}

	var retriggering = false;
	$.retriggerEquippedEffects = function(){
		if( retriggering || !isMapReady() || !$gameParty ){ return 0; }
		var actor = $gameParty.leader();
		if( !actor ){ return 0; }
		var count = 0;
		retriggering = true;
		try{
			actor.equips().forEach(function( item, slotId ){
				// A preceding script may have removed another slot's item.
				if( item && actor.equips()[ slotId ] === item && whileEquippedCode( item ) ){
					evalCode( actor, item, CUSTOM_WHILE_EQUIPPED_EVAL );
					count++;
				}
			});
		}finally{
			retriggering = false;
		}
		return count;
	};

	//==========================================================================
	// Game_Actor
	//==========================================================================

	$.alias.Game_Actor_changeEquip = Game_Actor.prototype.changeEquip;
	Game_Actor.prototype.changeEquip = function(){
		var actor = this;
		var previousEquips = this.equips();
		var effect = arguments[2];	// project-specific extension used by existing scripts

		$.alias.Game_Actor_changeEquip.apply( this, arguments );

		this.equips().forEach(function( newItem, slotId ){
			var oldItem = previousEquips[ slotId ];
			if( newItem !== oldItem ){
				if( window.QJ && QJ.MPMZ && QJ.MPMZ.tl &&
					typeof QJ.MPMZ.tl.ex_playerUnequippingSpecialEffects === "function" ){
					QJ.MPMZ.tl.ex_playerUnequippingSpecialEffects( slotId, oldItem, effect );
				}
				evalCode( actor, oldItem, CUSTOM_ON_REMOVE_EQUIP_EVAL );
				evalCode( actor, newItem, CUSTOM_ON_EQUIP_EVAL );
				if( isMapReady() && actor.equips()[ slotId ] === newItem ){
					evalCode( actor, newItem, CUSTOM_WHILE_EQUIPPED_EVAL );
				}
			}
		});
	};

	if( !Imported.YEP_EquipCore ){
		$.alias.Game_Actor_initEquips = Game_Actor.prototype.initEquips;
		Game_Actor.prototype.initEquips = function(){
			$.alias.Game_Actor_initEquips.apply( this, arguments );
			var actor = this;
			this.equips().forEach(function( item ){
				evalCode( actor, item, CUSTOM_ON_EQUIP_EVAL );
			});
		};
	}else if( Game_Actor.prototype.equipInitEquips ){
		$.alias.Game_Actor_equipInitEquips = Game_Actor.prototype.equipInitEquips;
		Game_Actor.prototype.equipInitEquips = function(){
			$.alias.Game_Actor_equipInitEquips.apply( this, arguments );
			var actor = this;
			this.equips().forEach(function( item ){
				evalCode( actor, item, CUSTOM_ON_EQUIP_EVAL );
			});
		};
	}
})();
