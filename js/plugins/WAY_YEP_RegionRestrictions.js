/* globals Game_SpawnEvent */
// ============================================================================
// WAY_YEP_RegionRestrictions.js
// ----------------------------------------------------------------------------
// v1.2.1-standalone
// Addon to Yanfly's RegionRestrictions Plugin.
// Original by waynee95. Standalone MZ/MV migration by shiroin.
// ============================================================================

/*:
 * @target MZ
 * @plugindesc v1.2.1-standalone Addon to YEP_RegionRestrictions. <WAY_YEP_RegionRestrictions>
 * @author waynee95 / standalone migration
 *
 * @help
 * This standalone version no longer requires WAY_Core.
 *
 * Event notetags:
 *   <Bypass Restriction: x>
 *   <Bypass Restriction: x, x, ...>
 *
 *   <Force Restriction: x>
 *   <Force Restriction: x, x, ...>
 *
 * Bypass Restriction:
 *   The event can pass the specified event-restrict regions.
 *
 * Force Restriction:
 *   Even if the event has Through ON, the specified region restriction is
 *   checked first.
 *
 * Requires:
 *   YEP_RegionRestrictions.js
 */

(function() {
  "use strict";

  var pluginName = "WAY_YEP_RegionRestrictions";
  var alias = {};

  if (typeof Imported === "undefined" || !Imported.YEP_RegionRestrictions) {
    console.warn(pluginName + ": YEP_RegionRestrictions.js is required.");
  }

  var arrayContains = function(array, value) {
    return Array.isArray(array) && array.indexOf(value) >= 0;
  };

  var toArray = function(value) {
    if (Array.isArray(value)) return value.map(Number).filter(function(n) { return !isNaN(n); });
    if (value == null || value === "") return [];
    return String(value)
      .split(/\s*,\s*|\s+/)
      .map(Number)
      .filter(function(n) { return !isNaN(n); });
  };

  var getNotetag = function(note, tagName, defaultValue, converter) {
    note = note || "";
    var escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    var regexp = new RegExp("<" + escaped + "\\s*:\\s*([^>]*)>", "i");
    var match = regexp.exec(note);
    if (!match) return defaultValue;
    return converter ? converter(match[1]) : match[1];
  };

  var readRegionRestrictionNotetags = function(eventData) {
    if (!eventData) return;
    eventData._bypassRestriction = getNotetag(eventData.note, "Bypass Restriction", [], toArray);
    eventData._forceRestriction = getNotetag(eventData.note, "Force Restriction", [], toArray);
  };

  //==========================================================================
  // DataManager
  //==========================================================================

  alias.DataManager_extractMetadata = DataManager.extractMetadata;
  DataManager.extractMetadata = function(object) {
    alias.DataManager_extractMetadata.call(this, object);
    if (object === $dataMap && $dataMap && Array.isArray($dataMap.events)) {
      $dataMap.events.forEach(readRegionRestrictionNotetags);
    }
  };

  alias.DataManager_onLoad = DataManager.onLoad;
  DataManager.onLoad = function(object) {
    alias.DataManager_onLoad.call(this, object);
    if (object === $dataMap && $dataMap && Array.isArray($dataMap.events)) {
      $dataMap.events.forEach(readRegionRestrictionNotetags);
    }
  };

  //==========================================================================
  // Game_Event
  //==========================================================================

  alias.Game_Event_initialize = Game_Event.prototype.initialize;
  Game_Event.prototype.initialize = function(mapId, eventId) {
    alias.Game_Event_initialize.call(this, mapId, eventId);
    readRegionRestrictionNotetags(this.event());
  };

  //==========================================================================
  // Game_CharacterBase
  //==========================================================================

  alias.Game_CharacterBase_isEventRegionForbid = Game_CharacterBase.prototype.isEventRegionForbid;
  alias.Game_CharacterBase_isEventRegionAllow = Game_CharacterBase.prototype.isEventRegionAllow;
  alias.Game_CharacterBase_canPass = Game_CharacterBase.prototype.canPass;

  Game_CharacterBase.prototype.isEventRegionForbid = function(x, y, d) {
    var regionId = this.getRegionId(x, y, d);
    var event = this.isEvent && this.isEvent() ? this.event() : null;

    if (event && arrayContains(event._bypassRestriction, regionId)) {
      return false;
    }

    if (this.isPlayer && this.isPlayer()) return false;

    if (event && arrayContains(event._forceRestriction, regionId)) {
      return true;
    }

    if (regionId === 0) return false;
    return arrayContains($gameMap.restrictEventRegions(), regionId);
  };

  Game_CharacterBase.prototype.isEventRegionAllow = function(x, y, d) {
    var regionId = this.getRegionId(x, y, d);
    var event = this.isEvent && this.isEvent() ? this.event() : null;

    if (event && arrayContains(event._bypassRestriction, regionId)) {
      return true;
    }

    if (this.isPlayer && this.isPlayer()) return false;
    if (regionId === 0) return false;
    return arrayContains($gameMap.allowEventRegions(), regionId);
  };

  Game_CharacterBase.prototype.canPass = function(x, y, d) {
    var x2 = $gameMap.roundXWithDirection(x, d);
    var y2 = $gameMap.roundYWithDirection(y, d);

    if (!$gameMap.isValid(x2, y2)) {
      return false;
    }

    var isThrough = this.isThrough() || this.isDebugThrough();

    if (isThrough && this.getRegionId(x, y, d) === 0) {
      return true;
    }

    if (!this.isMapPassable(x, y, d) || this.isCollidedWithCharacters(x2, y2)) {
      return false;
    }

    return true;
  };

  //==========================================================================
  // Spawn-event compatibility
  //==========================================================================

  if (typeof Imported !== "undefined" && Imported.Galv_EventSpawner && typeof Game_SpawnEvent !== "undefined") {
    alias.Game_SpawnEvent_initialize = Game_SpawnEvent.prototype.initialize;
    Game_SpawnEvent.prototype.initialize = function() {
      alias.Game_SpawnEvent_initialize.apply(this, arguments);
      readRegionRestrictionNotetags(this.event());
    };
  }

  // QJ-SpawnEventMZ / other Game_Event-derived spawners are covered by the
  // Game_Event.initialize hook above, but this helper keeps manual refreshes easy.
  Game_Event.prototype.refreshRegionRestrictionNotetags = function() {
    readRegionRestrictionNotetags(this.event());
  };

  //==========================================================================
  // DotMoveSystem compatibility
  //==========================================================================

  if (window.DotMoveSystem && DotMoveSystem.CharacterCollisionChecker) {
    var _checkCharacter = DotMoveSystem.CharacterCollisionChecker.prototype.checkCharacter;
    DotMoveSystem.CharacterCollisionChecker.prototype.checkCharacter = function(x, y, d, character) {
      try {
        var subj = this._character;
        if (subj && character && subj.drill_ETh_getTagList && character.drill_ETh_getTagList) {
          var a = subj.drill_ETh_getTagList();
          var b = character.drill_ETh_getTagList();
          if (Array.isArray(a) && Array.isArray(b)) {
            var set = new Set(a);
            for (var i = 0; i < b.length; i++) {
              if (set.has(b[i])) {
                return undefined;
              }
            }
          }
        }
      } catch (e) {
        // Keep this compatibility layer silent.
      }
      return _checkCharacter.call(this, x, y, d, character);
    };
  }
})();
