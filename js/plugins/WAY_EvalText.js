/*:
 * @target MZ
 * @plugindesc v2.4.1-standalone Use JavaScript code in textboxes. <WAY_EvalText>
 * @author waynee95 / standalone MZ port by shiroin
 *
 * @help
 * WAY_EvalText.js
 * =============================================================================
 * Standalone MZ port of WAY_EvalText. This version does not require WAY_Core.
 *
 * Usage:
 *   Put JavaScript code between ${...} in messages or descriptions.
 *
 * Local variables available inside ${...}:
 *   a     - current actor, menu actor, battle actor, or party leader
 *   s     - $gameSwitches
 *   v     - $gameVariables
 *   p     - $gameParty
 *   item  - current selected item/equipment/state when detectable
 *   skill - current selected skill when detectable
 *
 * Example:
 *   Actor HP: ${a ? a.hp : 0}
 *
 * This plugin should be placed late in the plugin list, after plugins that
 * modify Window_Base.convertEscapeCharacters.
 */

(function(){
	"use strict";

	var Imported = window.Imported || (window.Imported = {});
	Imported.WAY_EvalText = true;

	window.WAY_EvalText = window.WAY_EvalText || {};
	var $ = window.WAY_EvalText;
	$.alias = $.alias || {};

	function isImported( name ){
		return !!Imported[ name ];
	}

	function sceneIs( scene, className ){
		return window[ className ] && scene instanceof window[ className ];
	}

	function getWindowItem( win ){
		return win && typeof win.item === "function" ? win.item() : null;
	}

	function evalText( text ){
		if( text == null ){ return text; }
		text = String( text );

		var currentScene = SceneManager._scene;
		var item = null;
		var skill = null;
		var a = $gameParty ? $gameParty.menuActor() : null;

		if( currentScene instanceof Scene_Map ){
			a = $gameParty.leader();
		}else if( sceneIs( currentScene, "Scene_ItemBase" ) ){
			item = getWindowItem( currentScene._itemWindow );
			skill = item;
		}else if( currentScene instanceof Scene_Equip ){
			if( currentScene._slotWindow && currentScene._slotWindow.active ){
				item = getWindowItem( currentScene._slotWindow );
			}else if( currentScene._itemWindow && currentScene._itemWindow.active ){
				item = getWindowItem( currentScene._itemWindow );
			}
		}else if( currentScene instanceof Scene_Shop ){
			if( currentScene._sellWindow && currentScene._sellWindow.active ){
				item = getWindowItem( currentScene._sellWindow );
			}else if( currentScene._buyWindow && currentScene._buyWindow.active ){
				item = getWindowItem( currentScene._buyWindow );
			}
		}else if( currentScene instanceof Scene_Battle ){
			a = BattleManager.actor();
			item = getWindowItem( currentScene._itemWindow );
			skill = getWindowItem( currentScene._skillWindow );

			if( isImported( "YEP_X_InBattleStatus" ) &&
				currentScene._inBattleStatusWindow &&
				currentScene._inBattleStateList &&
				currentScene._inBattleStateList.active ){
				a = currentScene._inBattleStatusWindow._battler;
				item = getWindowItem( currentScene._inBattleStateList );
			}else if( isImported( "ADRI_InBattleEnemyStatus" ) &&
				currentScene._inBattleEnemyStatusWindow &&
				currentScene._inBattleEnemyStateList &&
				currentScene._inBattleEnemyStatusWindow.active ){
				a = $gameVariables.value( 40 );
				item = getWindowItem( currentScene._inBattleEnemyStateList );
			}
		}

		if( isImported( "WAY_StorageSystem" ) && sceneIs( currentScene, "Scene_Storage" ) ){
			item = getWindowItem( currentScene._storageWindow );
		}

		if( isImported( "YEP_X_EquipCustomize" ) && sceneIs( currentScene, "Scene_EquipCustomize" ) ){
			if( currentScene._itemActionWindow && typeof currentScene.item === "function" ){
				item = currentScene.item();
			}
		}

		if( isImported( "CGMV_Encyclopedia" ) && sceneIs( currentScene, "CGMV_Scene_Encyclopedia" ) ){
			if( currentScene._listWindow && currentScene._listWindow.item() ){
				var symbol = currentScene._listWindow._symbol;
				var id = currentScene._listWindow.item()._id;
				if( symbol === "bestiary" ){
					item = $dataEnemies[ id ];
				}else if( symbol === "items" ){
					item = $dataItems[ id ];
				}else if( symbol === "armors" ){
					item = $dataArmors[ id ];
				}else if( symbol === "weapons" ){
					item = $dataWeapons[ id ];
				}else if( symbol === "skills" ){
					item = $dataSkills[ id ];
				}else if( symbol === "states" ){
					item = $dataStates[ id ];
				}
			}
		}

		if( isImported( "YEP_EquipBattleSkills" ) && currentScene instanceof Scene_Skill ){
			if( currentScene._skillEquipWindow && currentScene._skillEquipWindow.active ){
				item = getWindowItem( currentScene._skillEquipWindow );
				skill = item;
			}
		}

		if( isImported( "YEP_SkillLearnSystem" ) && sceneIs( currentScene, "Scene_LearnSkill" ) ){
			if( currentScene._skillLearnWindow && currentScene._skillLearnWindow.active ){
				item = getWindowItem( currentScene._skillLearnWindow );
				skill = item;
			}
		}

		return text.replace( /\${[^{}\\]+(?=\})}/g, function( code ){
			try{
				var s = $gameSwitches;
				var v = $gameVariables;
				var p = $gameParty;
				return eval( code.substring( 2, code.length - 1 ) );
			}catch( e ){
				return e;
			}
		});
	}

	$.evalText = evalText;

	if( isImported( "YEP_X_InBattleStatus" ) && window.Window_InBattleStateList ){
		$.alias.Window_InBattleStateList_setBattler = Window_InBattleStateList.prototype.setBattler;
		Window_InBattleStateList.prototype.setBattler = function( battler ){
			$.alias.Window_InBattleStateList_setBattler.call( this, battler );
			if( this._helpWindow ){ this._helpWindow.refresh(); }
		};
	}

	if( isImported( "ADRI_InBattleEnemyStatus" ) && window.Window_InBattleEnemyStateList ){
		$.alias.Window_InBattleEnemyStateList_setBattler = Window_InBattleEnemyStateList.prototype.setBattler;
		Window_InBattleEnemyStateList.prototype.setBattler = function( battler ){
			$.alias.Window_InBattleEnemyStateList_setBattler.call( this, battler );
			if( this._helpWindow ){ this._helpWindow.refresh(); }
		};
	}

	$.alias.WindowBase_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
	Window_Base.prototype.convertEscapeCharacters = function( text ){
		return $.alias.WindowBase_convertEscapeCharacters.call( this, evalText( text ) );
	};

	if( isImported( "YEP_X_MessageMacros1" ) && Window_Base.prototype.convertMacroText ){
		$.alias.Window_Base_convertMacroText = Window_Base.prototype.convertMacroText;
		Window_Base.prototype.convertMacroText = function( text ){
			return evalText( $.alias.Window_Base_convertMacroText.call( this, text ) );
		};
	}
})();
