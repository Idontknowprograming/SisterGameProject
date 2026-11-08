
/*=============================================================================
 * CTB TouchInput
 * By CT_Bolt
 * CTB_TouchInput.js
 * Version: 0.97
 * Terms of Use:
 *   Free for commercial and non commercial use in projects.
 *
 *
/*=============================================================================*/

var CTB = CTB || {}; CTB.TouchInput  = CTB.TouchInput || {};
var Imported = Imported || {}; Imported["CT_Bolt TouchInput"] = 0.97;

//=============================================================================

/*:
 * @plugindesc CT_Bolt's mouse-facing direction helper (click handling removed)
 * @author CT_Bolt
 *
 * @param ---Turn Player---
 * @text Turn Player Settings
 *
 * @param Use TurnPlayer
 * @text Use TurnPlayer
 * @parent ---Turn Player---
 * @type Boolean
 * @desc True = will turn player toward the mouse
 * Default:
 * @default
 *
 * @param TurnPlayer_SwitchID
 * @text Game Switch ID
 * @parent ---Turn Player---
 * @type Number
 * @desc Turn Player To Mouse Game Switch ID (Optional)
 * Default:
 * @default
 *
 * @help
 * CT_Bolt's TouchInput
 * Version 0.97
 * CT_Bolt
 *
 * This project-specific build only keeps mouse-facing direction updates.
 * All left/right click hooks and script callbacks have been removed.
 *
 */

//=============================================================================
// Core Functions
//=============================================================================
function getPluginParameters () {
    var a = document.currentScript || (function() {
        var b = document.getElementsByTagName('script');
        return b[b.length - 1];
    })();
    return PluginManager.parameters(a.src.substring((a.src.lastIndexOf('/') + 1), a.src.indexOf('.js')));
}
//=============================================================================
//=============================================================================

//=============================================================================
// Parameter Variables
//=============================================================================
CTB.Parameters = getPluginParameters();
var ctb = ctb || {};
ctb.useTurnPlayer = CTB.Parameters["Use TurnPlayer"] ? eval(CTB.Parameters["Use TurnPlayer"]) : null;
ctb.turnPlayer_SwitchID = CTB.Parameters["TurnPlayer_SwitchID"] ? eval(CTB.Parameters["TurnPlayer_SwitchID"]) : 0;

if (!Utils.isMobileDevice()) {
  // 安卓环境不需要这个插件的任何功能


// Alias
var _ti_omm_ctb = TouchInput._onMouseMove;
TouchInput._onMouseMove = function(event) {
    _ti_omm_ctb.call(this, event);
    this.updateTurnPlayer();
};

// New
TouchInput.updateTurnPlayer = function() {
    if (ctb.useTurnPlayer) {		
        var goOn = true;
        if (ctb.turnPlayer_SwitchID) {
            goOn = ($gameSwitches) ? $gameSwitches.value(ctb.turnPlayer_SwitchID) : false;
        }
        if (SceneManager._scene && SceneManager._scene instanceof Scene_Map) {
            var messageWindow = SceneManager._scene._messageWindow;
            if (messageWindow && messageWindow._openness > 0) {
                goOn = false;
            } else if (messageWindow && typeof messageWindow.isAnySubWindowActive === 'function' && messageWindow.isAnySubWindowActive()) {
                goOn = false;
            }
        } else {
            goOn = false;
        }
        if (goOn) {
            if ($gamePlayer && $gameMap && $dataMap) {
                var playerX = $gamePlayer.screenX();
                var playerY = $gamePlayer.screenY();
                var mouseX = _drill_mouse_x / $gameScreen.zoomScale();
                var mouseY = _drill_mouse_y / $gameScreen.zoomScale();

                var dx = mouseX - playerX;
                var dy = mouseY - playerY;

						if ( navigator.getGamepads() && navigator.getGamepads()[0] !== null ) {
							const _gp = navigator.getGamepads()[0];
							const _gpActive = _gp.buttons.some(b => b.pressed || b.value > 0.1) || _gp.axes.some(a => Math.abs(a) > 0.2);
							if (_gpActive) {
								return;
							}
						}

                if (Math.abs(dx) > Math.abs(dy)) {			
						
                    if (dx > 0) {						
                        // 向右
                        if (!$gamePlayer.isMoving()) {
                            $gamePlayer._directionFix = false;
                            $gamePlayer.setDirection(6);
                        }
                    } else {
                        // 向左
                        if (!$gamePlayer.isMoving()) {
                            $gamePlayer._directionFix = false;
                            $gamePlayer.setDirection(4);
                        }
                    }
                } else {
                    if (dy > 0) {
                        // 向下
                        if (!$gamePlayer.isMoving()) {
                            $gamePlayer._directionFix = false;
                            $gamePlayer.setDirection(2);
                        }
                    } else {
                        // 向上
                        if (!$gamePlayer.isMoving()) {
                            $gamePlayer._directionFix = false;
                            $gamePlayer.setDirection(8);
                        }
                    }
                }
            }
        }
    }
};


}
