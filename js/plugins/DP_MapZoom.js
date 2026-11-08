//=============================================================================
// 🏤drowsepost Plugins - Map Camera Controller
// DP_MapZoom.js
// Version: 0.87
// 
// Copyright (c) 2016 - 2019 canotun
// Released under the MIT license.
// http://opensource.org/licenses/mit-license.php
//=============================================================================

var Imported = Imported || {};
Imported.DP_MapZoom = true;

var drowsepost = drowsepost || {};

//=============================================================================
/*:
 * @plugindesc Control the magnification of the map scene.
 * @author drowsepost
 *
 * @param Base Scale
 * @desc Set the basic magnification ratio.(Start up)
 * Default: 1 (0 or more)
 * @default 1
 *
 * @param Encount Effect
 * @desc Corrected code of encounter effect
 * Default: true (ON: true / OFF: false)
 * @default true
 * @type boolean
 *
 * @param Camera Controll
 * @desc camera control during magnification processing
 * Default: true (ON: true / OFF: false / Minimum: minimum)
 * @default true
 * @type select
 * @option ON
 * @value true
 * @option OFF
 * @value false
 * @option Minimum
 * @value minimum
 *
 * @param Weather Patch
 * @desc Change weather sprite generation range
 * Default: true (ON: true / OFF: false)
 * @default true
 * @type boolean
 * 
 * @param Picture Size Fixation
 * @desc Exclude pictures from map zooming process
 * Default: ALL (ALL: true / OFF: false / $ / screen_ / fix_)
 * @default true
 * @type select
 * @option OFF
 * @value false
 * @option ALL
 * @value true
 * @option $
 * @value $
 * @option screen_
 * @value screen_
 * @option fix_
 * @value fix_
 * 
 * @param Old Focus
 * @desc Use trackless focus similar to the old version.
 * Default: false (ON: true / OFF: false)
 * @default false
 * @type boolean
 *
 * @param Easing Function
 * @desc animation Easing function.
 * args: t (0.00～1.00) return: Number (0.00～1.00) Default: t
 * @default t
 * @type string
 *
 * @help
 * ============================================================================
 * About
 * ============================================================================
 * It controls the enlargement ratio of the map scene by
 * reflecting the calculation of the enlargement ratio
 * to various coordinate processing.
 * (sorry... english support is immature. by drowsepost)
 * 
 * ============================================================================
 * Knowing issue
 * ============================================================================
 * If the enlargement ratio is too small in a huge map,
 * processing will be dropped in the canvas mode,
 * and the map missing problem will occur in the webgl mode.
 * This is the limit of the PIXI library and the solution is under investigation
 * 
 * ============================================================================
 * How To Use
 * ============================================================================
 * 
 * ◆ plugin command: 
 * dpZoom {zoom ratio} {animate frames} {event id or "this" or "player"}
 * rename: mapSetZoom
 * 
 * e.g.:
 * dpZoom 0.8 360 this
 * -> zoom out to 0.8x , animate 360 frames, centering to event of called
 * 
 * dpZoom 1
 * -> zoom to 1x(reset), Immediate
 * 
 * dpZoom 3 60 1
 * -> zoom to 3x , animate 60 frames, centering to Event id:001
 * 
 * dpFocus {event id or "this" or "player"} {animate frames}
 * Place the specified event in the center of the screen without changing
 * the enlargement ratio of the screen.
 * The camera follows the movement of the event
 * 
 * ◆ map meta:
 * if you need setting to Default Magnification on the map,
 * fill in the following in the "Note" field
 * 
 * <zoomScale: {zoom ratio}>
 * Specify the enlargement ratio to be the basis for each map
 * 
 * e.g.:
 * <zoomScale:0.5>
 * -> zoom out to 0.5x , Immediate
 * 
 * if you need setting to Default Camera target on the map,
 * fill in the following in the "Note" field
 * 
 * <camTarget: {event id or "player"}>
 * Events can be in the center of the screen.
 * The screen follows the movement of the event.
 * 
 * e.g.:
 * <camTarget: 3>
 * -> set center of the screen Event ID "3"
 * 
 * ============================================================================
 * Technical information
 * ============================================================================
 * If "screenX" or "screenY" used by another plugin is misaligned,
 * multiply "screenX" or "screenY" by "$gameScreen.zoomScale()".
 * 
 * This plugin controls "$gameScreen"
 * 
 * This plugin use savedata
 * "$gameMap._dp_scale", "$gameMap._dp_pan", "$gameMap._dp_target"
 * 
 */
 /*:ja
 * @plugindesc マップの拡大率を制御します。
 * @author drowsepost
 *
 * @param Base Scale
 * @desc 基本の拡大率を設定します。(0以上)
 * Default: 1
 * @default 1
 *
 * @param Encount Effect
 * @desc エンカウントエフェクトに拡大率を反映
 * Default: true (ON: true / OFF: false)
 * @default true
 * @type boolean
 *
 * @param Camera Controll
 * @desc 拡大処理中のセンタリング制御をこのプラグインが行う
 * Default: true (ON: true / OFF: false / 最小: minimum)
 * @default true
 * @type select
 * @option ON
 * @value true
 * @option OFF
 * @value false
 * @option Minimum
 * @value minimum
 *
 * @param Weather Patch
 * @desc 天候スプライトの生成範囲を広げる修正を適用します。
 * Default: true (ON: true / OFF: false)
 * @default true
 * @type boolean
 * 
 * @param Picture Size Fixation
 * @desc ピクチャをマップの拡大処理から除外します
 * Default: ALL (ALL: true / OFF: false / $ / screen_ / fix_)
 * @default true
 * @type select
 * @option OFF
 * @value false
 * @option ALL
 * @value true
 * @option $
 * @value $
 * @option screen_
 * @value screen_
 * @option fix_
 * @value fix_
 * 
 * @param Old Focus
 * @desc 古いバージョンの追跡なしのフォーカスを使用します。
 * Default: false (ON: true / OFF: false)
 * @default false
 * @type boolean
 *
 * @param Easing Function
 * @desc アニメーションのイージング式。
 * 引数 t (0.00～1.00) 戻り値 数値(0.00～1.00) Default: t
 * @default t
 * @type string
 *
 * @help
 * ============================================================================
 * About
 * ============================================================================
 * 各種座標処理に拡大率の計算を反映し
 * マップシーンの拡大率を制御します。
 * また、指定したイベントをカメラが追うように指定します。
 * 標準のフォーカス対象は先頭のプレイヤーとなります。
 * 
 * ============================================================================
 * Knowing issue
 * ============================================================================
 * 巨大なマップにおいて拡大率をあまりに小さくすると
 * canvasモードで処理落ち、webglモードでマップ欠けの問題が発生します。
 * これはPIXIライブラリの限界であり、解決方法は調査中です
 * 
 * ============================================================================
 * How To Use
 * ============================================================================
 * ◆ マップメモ欄
 * 
 * <zoomScale:0.5>
 * などと記述すると、マップごとに基準になる拡大率を指定することが出来ます。
 * 
 * <camTarget: 3>
 * 等と記述すると、イベントID n番のイベントが画面中央になった状態にできます。
 * フォーカスはイベントの移動に画面が追従します。
 * 
 * ◆ プラグインコマンド
 * 
 * (1)ズーム機能
 * dpZoom {倍率} {変更にかけるフレーム数} {対象イベントID / this / player}
 * 指定したイベントにフォーカスを合わせつつ画面の拡大率を変更できます。
 * 第3引数に何も指定しない場合、画面中央に向かって拡大します。
 * 
 * 例:
 * プラグインコマンドにおいて対象イベントの部分に
 * 「this」もしくは「このイベント」と指定すると、
 * イベント実行中のオブジェクトを指定します。
 * dpZoom 2 360 this
 * たとえば上記はそのイベントが中心になるように6秒かけて2倍の拡大率に変化します。
 * <非推奨> mapSetZoom は利用できますが、非推奨とします。
 * 
 * (2)フォーカス機能
 * dpFocus {対象イベントID / this / player} {変更にかけるフレーム数}
 * 画面の拡大率を変更せずに指定したイベントにフォーカスを合わせます。
 * 
 * ============================================================================
 * Settings
 * ============================================================================
 * Base Scale
 * ゲーム開始時の拡大倍率を指定します。
 * 倍率には0以上を指定してください。
 * 
 * Encount Effect
 * エンカウントエフェクトを置き換えるかどうかを指定します。
 * オリジナルのエフェクトで置き換えている場合はこちらをfalseにしてください。
 * しかしその場合、画面の拡大率をそれぞれ反映できるように調整する必要があります。
 * 
 * Camera Controll
 * falseの場合はイベントを指定した拡大を含む拡大中のカメラ制御は動作しません。
 * 別プラグインでカメラ制御を行う場合にご利用ください。
 * 
 * Weather Patch
 * trueの場合、天候スプライトの生成範囲に関する修正を行い、
 * 拡大率変更後も天候スプライトをまんべんなく分布させます
 * 別プラグインで天候演出の制御を行っている場合等はfalseにしてください。
 * 
 * Picture Size Fixation
 * trueの場合、ピクチャを拡大処理から除外します。
 * 
 * Old Focus
 * trueの場合、古いDP_MapZoom.jsと同様のフォーカス処理を行います。
 * このフォーカス処理は対象イベントまでの座標のずれを基準にしているため、
 * イベントの移動を追尾しません。
 *
 * Easing Function
 * ズーム時のイージングを主に0から1の間で戻す式を設定できます。
 * 引数 t にズームの進捗が0から1で入ります。JavaScript。
 * 
 * ============================================================================
 * Technical information
 * ============================================================================
 * 現在の画面の拡大率は$gameScreen.zoomScale()で取得できます。
 * これはプラグインの利用に関わらず元から存在する関数です。
 * 他のプラグインで利用する「screenX」や「screenY」がずれる場合は、
 * 「screenX」や「screenY」にそれぞれ$gameScreen.zoomScale()を掛けて下さい。
 * 
 * このプラグインは$gameScreenを制御します。
 * 
 * 指定された拡大率設定は$gameMap._dp_scaleが保持します。
 * 明示的に指定したカメラのオフセットは$gameMap._dp_panが保持します。
 * マップのフォーカスイベントは$gameMap._dp_targetが保持します。
 * 
 */
(function() {
    "use strict";
    var user_map_marginright = 0;
    var user_map_marginbottom = 0;
    
    var parameters = PluginManager.parameters('DP_MapZoom');
    var user_scale = Number(parameters['Base Scale'] || 1);
    var user_fix_encount = Boolean(parameters['Encount Effect'] === 'true' || false);
    var user_use_camera = Boolean(parameters['Camera Controll'] === 'true' || false);
    var user_use_camera_transfer = Boolean(parameters['Camera Controll'] === 'minimum' || false);
    var user_fix_weather = Boolean(parameters['Weather Patch'] === 'true' || false);
    var user_fix_picture = parameters['Picture Size Fixation'];
    var user_use_oldfocus = Boolean(parameters['Old Focus'] === 'true' || false);
    var user_easing_function = parameters['Easing Function'];
    
    /*
    Main Functions
    =============================================================================
    実際の拡大処理
    */
    var camera = {};
    
    /*
    dp_renderSize
    タイル拡大率を保持および仮想的なレンダリング範囲を算出します。
    */
    var dp_renderSize = {
        _scale : undefined,
        width: undefined,
        height: undefined,
        
        /**
         * 拡大率からレンダリングするべきオブジェクトのサイズを設定します。
         * @param {number} scale 
         */
        onChange: (function(_scale){
            if(!('_scene' in SceneManager)) return;
            if(!('_spriteset' in SceneManager._scene)) return;
            var scale = _scale || this._scale;
            var spriteset = SceneManager._scene._spriteset;
            
            //マップサイズ変更
            spriteset._tilemap.width = Math.ceil(Graphics.width / scale) + spriteset._tilemap._margin * 2;
            spriteset._tilemap.height = Math.ceil(Graphics.height / scale) + spriteset._tilemap._margin * 2;
            
            //パララックスサイズ変更
            spriteset._parallax.move(0, 0, Math.round(Graphics.width / scale), Math.round(Graphics.height / scale));

            // Foreground.js対応
            if (spriteset._foreground && spriteset._foreground instanceof TilingSprite) {
                spriteset._foreground.move(0, 0, Math.round(Graphics.width / scale), Math.round(Graphics.height / scale));
            }
            
            spriteset._tilemap.refresh();
            spriteset._tilemap._needsRepaint = true;
            spriteset._tilemap.updateTransform();
        }),
        
        /**
         * scaleをリセットします
         */
        reset: (function(){
            this.scale = 1;
        })
    };
    
    Object.defineProperty(dp_renderSize, 'scale', {
        get: function() {
            return this._scale;
        },
        set: function(val) {
            if(val != this._scale) {
                this._scale = Number(val);
                this.width = Math.ceil(Graphics.boxWidth / this._scale);
                this.height = Math.ceil(Graphics.boxHeight / this._scale);
                this.onChange();
            }
        }
    });
    
    /**
     * ズームすべき座標を算出
     * @return {object} Point
     */
    var dp_getZoomPos = function() {
        return new Point(
            camera.target.screenX(),
            camera.target.screenY() - ($gameMap.tileHeight() / 2)
        );
    };
    
    /**
     * マップのレンダリング原点と表示位置のずれを取得します。
     * @return {object} Point
     */
    var dp_getVisiblePos = function () {
        var scale = $gameScreen.zoomScale();
        return new Point(
            Math.round($gameScreen.zoomX() * (scale - dp_renderSize.scale)),
            Math.round($gameScreen.zoomY() * (scale - dp_renderSize.scale))
        );
    };
    
    /**
     * フォーカスされているキャラクターから画面の中心がどれだけずれているか取得します
     * @return {object} Point
     */
    var dp_getpan = function() {
        var centerPosX = (($gameMap.screenTileX() - 1) / 2);
        var centerPosY = (($gameMap.screenTileY() - 1) / 2);
        
        var pan_x = ($gameMap.displayX() + centerPosX) - camera.target._realX;
        var pan_y = ($gameMap.displayY() + centerPosY) - camera.target._realY;
        
        return new Point(
            ($gameMap.screenTileX() >= $dataMap.width )? 0 : pan_x,
            ($gameMap.screenTileY() >= $dataMap.height )? 0 : pan_y
        );
    };
    
    /**
     * 画面の拡大率を設定します。
     * @param {number} scale 
     */
    var dp_setZoom = function(scale) {
        dp_renderSize.scale = scale;
        $gameMap._dp_scale = scale;
        
        $gameScreen.setZoom(0, 0, scale);
        camera.center();
    };
    
    /**
     * 指定されたイベントIDをイベントインスタンスにして返却
     * @param {any} event イベントIDもしくはイベントオブジェクトもしくはプレイヤー
     * @return {object} Game_CharacterBase
     */
    var dp_getEvent = function(event) {
        var _target;
        if(typeof event === 'object') {
            if('_eventId' in event) _target = $gameMap.event(event._eventId);
        }
        
        if(typeof event === 'number') {
            _target = $gameMap.event(event);
        }
        
        if(!(_target instanceof Game_CharacterBase)) {
            _target = $gamePlayer;
        }
        
        return _target;
    };
    
    /**
     * カメラターゲットから目標イベントまでのマップ上のズレ(x,y)を取得
     * @param {any} event イベントIDもしくはイベントオブジェクトもしくはプレイヤー
     * @return {object} Point
     */
    var dp_targetPan = function(event) {
        var _target = dp_getEvent(event);
        
        return new Point(
            _target._realX - camera.target._realX,
            _target._realY - camera.target._realY
        );
    };
    
    /**
     * 文字列をイージング用関数として評価した関数を返します
     * @param {String|Function} txt_func
     * @return {Function} イージング用関数、引数は float t
     */
    var dp_txtToEasing = (function(txt_func){
        var basic_func = (function(t){return t;});
        if(typeof txt_func === 'function') return txt_func;
        if(typeof txt_func !== 'string') return basic_func;
        if(txt_func == '') return basic_func;
        
        try {
            return new Function('t', 'return ' + txt_func + ';');
        } catch(e) {
            console.error('DP_MapZoom: Easing Function', e, txt_func);
        }
        return basic_func;
    });
    
    /**
     * 線形補完
     * @param {Number} p 入力進捗率
     * @param {Number} from 開始数値
     * @param {Number} to 目標数値
     * @return {Number} 結果進捗率
     */
    var dp_lerp = (function(p, from, to){
        return from + (to - from) * p;
    });
    
    /*
    Camera Object
    ===================================================================================
    */
    
    /**
     * カメラのアニメーションを制御するオブジェクト
     */
    camera.animation = (function(){
        //private
        var _active = false;
        var _count, _duration, _easing;
        var _start_pan, _start_scale, _end_pan, _end_scale;
        
        //public
        var r = {
            /**
             * アニメーションのスタート
             * @param {Number} scale 目標とする拡大率
             * @param {Point} pos 目標とする座標のズレ
             * @param {Number} dulation 変化にかけるフレーム
             */
            start : (function(scale, pos, duration) {
                var is_zoomout = ($gameScreen.zoomScale() > scale)? true : false;
                
                _count = 0;
                _duration = duration || 0;
                _end_scale = scale || $gameScreen.zoomScale();
                _end_pan = pos || new Point();
                
                _start_pan = dp_getpan();
                _start_scale = $gameScreen.zoomScale();
                
                if(is_zoomout) {
                    dp_renderSize.scale = scale;
                    camera.center(_start_pan.x, _start_pan.y);
                }
                
                _active = true;
            }),
            /**
             * アニメーションのアップデート
             * camera.animation.update
             */
            update: (function() {
                if(!_active) return;
                
                var p = _count / _duration;
                _count++;
                
                if(p > 1) {
                    r.end();
                    return;
                }
                
                if(_count % 2 === 0) return;
                
                var ease = _easing(p);
                var x = dp_lerp(ease, _start_pan.x, _end_pan.x);
                var y = dp_lerp(ease, _start_pan.y, _end_pan.y);
                var z = dp_lerp(ease, _start_scale, _end_scale);
                
                $gameScreen.setZoom(0, 0, z);
                camera.center(x, y);
            }),
            /**
             * アニメーションの終了
             */
            end : (function() {
                if(!_active) return;
                _active = false;
                
                $gameMap._dp_pan = _end_pan;
                dp_setZoom(_end_scale);
            })
        };
    
        Object.defineProperty(r, 'easing', {
            get: function() {
                return _easing;
            },
            set: function(val) {
                _easing = dp_txtToEasing(val);
            }
        });
        
        r.easing = user_easing_function;
        
        return r;
    }());
    
    /**
     * カメラのズームを開始する関数
     * @param {number} ratio 拡大率
     * @param {number} duration 変化にかけるフレーム
     * @param {any} target フォーカスするイベントIDもしくはゲームイベントオブジェクト
     */
    camera.zoom = function(ratio, duration, target) {
        if((typeof ratio !== 'number') || (ratio < 0)){
            ratio = dp_renderSize.scale;
        }
        
        var target_pan = dp_getpan();
        if(typeof target !== 'undefined') {
            if(user_use_oldfocus) {
                target_pan = dp_targetPan(target);
            } else {
                camera.target = target;
                target_pan = new Point();
            }
        }
        
        if(duration > 0){
            camera.animation.start(ratio, target_pan, duration);
        } else {
            $gameMap._dp_pan = target_pan;
            dp_setZoom(ratio);
        }
    };
    
    /**
     * フォーカスしたターゲットをカメラ中央に配置
     * @param {number} panX 画面をずらすマスの数。横。
     * @param {number} panY 画面をずらすマスの数。縦。
     * @param {boolean} force_center カメラ制御無効でも実行
     */
    camera.center = function(panX, panY, force_center) {
        if((!user_use_camera) && (!force_center)) return;
        var px = Number(panX || $gameMap._dp_pan.x);
        var py = Number(panY || $gameMap._dp_pan.y);
        camera.target.center(camera.target._realX + px, camera.target._realY + py);
    };
    
    /**
     * カメラがフォーカスする対象
     * @param {any} event イベントIDもしくはゲームイベントもしくはプレイヤー
     * @return {object} ゲームイベントもしくはプレイヤー
     */
    Object.defineProperty(camera, 'target', {
        get: function() {
            if($gameMap._dp_target === 0) return $gamePlayer;
            return $gameMap.event($gameMap._dp_target);
        },
        set: function(event) {
            var _target = dp_getEvent(event);
            
            $gameMap._dp_target = 0;
            if(typeof _target === 'object') {
                if('_eventId' in _target) $gameMap._dp_target = _target._eventId;
            }
        }
    });
    
    //公開
    drowsepost.camera = camera;
    drowsepost.rendersize = dp_renderSize;
	// 公开 dp_setZoom 函数
    window.dp_setZoom = dp_setZoom;
    
    /*
    Command Entry
    ===================================================================================
    @param {array} args スペース区切りで指定したプラグインコマンドの引数(array<string>)
    */
    drowsepost.fn = drowsepost.fn || {};
    
    /**
     * 拡大率を変更せずにフォーカス変更
     * {target} {frame}
     */
    var _p_dpfocus = ('dpFocus' in drowsepost.fn)? drowsepost.fn.dpFocus : (function(){});
    drowsepost.fn.dpFocus = (function(_a){
        _p_dpfocus.call(this, _a);
        
        var _s = this;
        var _target;
        
        if(_a.length < 1) _a.push('player');
        
        if((_a[0] === 'this') || (_a[0] === 'このイベント')) _target = _s;
        else if((_a[0] === 'player') || (_a[0] === 'プレイヤー')) _target = $gamePlayer;
        else _target = parseInt(_a[0]);
        
        camera.zoom(dp_renderSize.scale, parseInt(_a[1]), _target);
    });
    
    /**
     * 画面拡大率を変更
     * 第三引数にターゲット指定でフォーカスも変更
     * {zoom} {frame} {target}
     */
    var _p_dpzoom = ('dpZoom' in drowsepost.fn)? drowsepost.fn.dpZoom : (function(){});
    drowsepost.fn.mapSetZoom = drowsepost.fn.dpZoom = (function(_a){
        _p_dpzoom.call(this, _a);
        
        var _s = this;
        var _target;
        
        if(_a.length > 2) {
            if((_a[2] === 'this') || (_a[2] === 'このイベント')) _target = _s;
            else if((_a[2] === 'player') || (_a[2] === 'プレイヤー')) _target = $gamePlayer;
            else _target = parseInt(_a[2]);
        }
        
        camera.zoom(parseFloat(_a[0]), parseInt(_a[1]), _target);
    });
    
    /*
    Game_Interpreter
    ===================================================================================
    コマンドパーサーの追加
    */
    (function(){
        //@override
        var _parent_pluginCommand = Game_Interpreter.prototype.pluginCommand;
        Game_Interpreter.prototype.pluginCommand = function(command, args) {
            _parent_pluginCommand.call(this, command, args);
            
            if('DP_Basics' in Imported) return;
            if(!(command in drowsepost.fn)) return;
            if(typeof drowsepost.fn[command] === 'function') {
                drowsepost.fn[command].call(this, args);
            }
        };
        
    }());
    
    /*
    Game Map
    =============================================================================
    拡大率($gameScreen.zoomScale())の反映
    */
    (function(){
        //@override
        var _parent_initialize = Game_Map.prototype.initialize;
        Game_Map.prototype.initialize = function() {
            _parent_initialize.call(this);
            
            //保存用変数エントリー
            this._dp_scale = user_scale;
            this._dp_pan = new Point();
            this._dp_target = 0;
        };
        
        //@override
        Game_Map.prototype.screenTileX = function() {
            return (Graphics.width - user_map_marginright) / (this.tileWidth() * $gameScreen.zoomScale());
        };
        
        //@override
        Game_Map.prototype.screenTileY = function() {
            return (Graphics.height - user_map_marginbottom) / (this.tileHeight() * $gameScreen.zoomScale());
        };
        
        //@override
        Game_Map.prototype.canvasToMapX = function(x) {
            var tileWidth = this.tileWidth() * $gameScreen.zoomScale();
            var originX = this._displayX * tileWidth;
            var mapX = Math.floor((originX + x) / tileWidth);
            return this.roundX(mapX);
        };

        //@override
        Game_Map.prototype.canvasToMapY = function(y) {
            var tileHeight = this.tileHeight() * $gameScreen.zoomScale();
            var originY = this._displayY * tileHeight;
            var mapY = Math.floor((originY + y) / tileHeight);
            return this.roundY(mapY);
        };
        
    }());
    
    /*
    Game Character
    =============================================================================
    Game Characterに注視する場合の処理を追加
    */
    (function(){
        Game_Character.prototype.centerX = function() {
            return ($gameMap.screenTileX() - 1) / 2.0;
        };
        
        Game_Character.prototype.centerY = function() {
            return ($gameMap.screenTileY() - 1) / 2.0;
        };

        Game_Character.prototype.center = function(x, y) {
            return $gameMap.setDisplayPos(x - this.centerX(), y - this.centerY());
        };
        
        Game_Character.prototype.updateScroll = function(lastScrolledX, lastScrolledY) {
            var x1 = lastScrolledX;
            var y1 = lastScrolledY;
            var x2 = this.scrolledX();
            var y2 = this.scrolledY();
            if (y2 > y1 && y2 > this.centerY()) {
                $gameMap.scrollDown(y2 - y1);
            }
            if (x2 < x1 && x2 < this.centerX()) {
                $gameMap.scrollLeft(x1 - x2);
            }
            if (x2 > x1 && x2 > this.centerX()) {
                $gameMap.scrollRight(x2 - x1);
            }
            if (y2 < y1 && y2 < this.centerY()) {
                $gameMap.scrollUp(y1 - y2);
            }
        };
        
    }());
    
    /*
    Game Player
    =============================================================================
    拡大率の反映
    */
    (function(){
        //@override
        Game_Player.prototype.centerX = function() {
            return ($gameMap.screenTileX() - 1) / 2.0;
        };
        
        //@override
        Game_Player.prototype.centerY = function() {
            return ($gameMap.screenTileY() - 1)  / 2.0;
        };
        
        //@override
        var _parent_updateScroll = Game_Player.prototype.updateScroll;
        Game_Player.prototype.updateScroll = function(lastScrolledX, lastScrolledY) {
            if (typeof $gameMap !== 'object') return;
            if ($gameMap._dp_target !== 0) return;
            _parent_updateScroll.call(this, lastScrolledX, lastScrolledY);
        };
        
    }());
    
    /*
    Game Event
    =============================================================================
    Game Eventに注視する場合の処理を追加
    */
    (function(){
        //@override
        var _parent_update = Game_Event.prototype.update;
        Game_Event.prototype.update = function() {
            // [Shiroin PerfHub B3] 非注视目标时 updateScroll 首行即返回，
            // 但 scrolledX/scrolledY 已经白算了(每事件每帧)。把判断提前。
            // 开关: window.ShiroinPerfHub.dpZoomGate
            if ((!window.ShiroinPerfHub || window.ShiroinPerfHub.dpZoomGate !== false) &&
                $gameMap._dp_target !== this._eventId) {
                _parent_update.call(this);
                return;
            }
            var lastScrolledX = this.scrolledX();
            var lastScrolledY = this.scrolledY();

            _parent_update.call(this);

            this.updateScroll(lastScrolledX, lastScrolledY);
        };
        
        Game_Event.prototype.updateScroll = function(lastScrolledX, lastScrolledY) {
            if (typeof $gameMap !== 'object') return;
            if ($gameMap._dp_target !== this._eventId) return;
            Game_Character.prototype.updateScroll.call(this, lastScrolledX, lastScrolledY);
        };
        
    }());
    
    /*
    Weather
    =============================================================================
    描画反映変更機能の追加
    */
    (function(){
        //天候スプライトの生成範囲をGraphic基準ではなく実際の描画範囲に合わせる
        if(!user_fix_weather) return;
        //@override
        var _parent_rebornSprite = Weather.prototype._rebornSprite;
        Weather.prototype._rebornSprite = function(sprite) {
            _parent_rebornSprite.call(this, sprite);
            sprite.ax = Math.randomInt(dp_renderSize.width + 100) - 50 + this.origin.x;
            sprite.ay = Math.randomInt(dp_renderSize.height + 200) - 100 + this.origin.y;
            sprite.opacity = 160 + Math.randomInt(60);
        };
        
    }());
    
    /*
    Sprite_Picture
    =============================================================================
    ピクチャdot by dot配置機能の追加
    */
    (function(){
        //ピクチャの配置と拡大率を、スクリーンの拡大率で打ち消す
        if(!user_fix_picture) return;
        if(user_fix_picture === 'false') return;
        
        //@override
        var _parent_loadBitmap = Sprite_Picture.prototype.loadBitmap;
        Sprite_Picture.prototype.loadBitmap = function() {
            _parent_loadBitmap.call(this);
            
            if(user_fix_picture === 'true') {
                this._dp_fix = true;
            } else if(!this._pictureName.indexOf(user_fix_picture)) {
                this._dp_fix = true;
            } else {
                this._dp_fix = false;
            }
        };
        
        //@override
        var _parent_updateScale = Sprite_Picture.prototype.updateScale;
        Sprite_Picture.prototype.updateScale = function() {
            _parent_updateScale.call(this);
            if(!this._dp_fix) return;
            
            var picture = this.picture();
			if( picture._Drill_PSh_layer === "图片层" ){
            this.scale.x = (1 / $gameScreen.zoomScale()) * (picture.scaleX() / 100);
            this.scale.y = (1 / $gameScreen.zoomScale()) * (picture.scaleY() / 100);
		   }
        };

        //@override
        var _parent_updatePosition = Sprite_Picture.prototype.updatePosition;
        Sprite_Picture.prototype.updatePosition = function() {
            _parent_updatePosition.call(this);
            if(!this._dp_fix) return;
            
            var picture = this.picture();
            var map_s = dp_getVisiblePos();
            this.x = (picture.x() + map_s.x) * (1 / $gameScreen.zoomScale());
            this.y = (picture.y() + map_s.y) * (1 / $gameScreen.zoomScale());
        };
    }());
    
    /*
    Sprite_Timer
    =============================================================================
    タイマーの配置とサイズを調整
    */
    (function(){
        //@override
        var _parent_updatePosition = Sprite_Timer.prototype.updatePosition;
        Sprite_Timer.prototype.updatePosition = function() {
            _parent_updatePosition.call(this);

            var _zoom = (1 / $gameScreen.zoomScale());

            this.x = this.x * _zoom;
            this.y = this.y * _zoom;
            this.scale.x = _zoom;
            this.scale.y = _zoom;
        };
    }());
    
    /*
    Spriteset_Base
    =============================================================================
    拡大座標の調整
    */
    (function(){
        //@override
        var _parent_updatePosition = Spriteset_Base.prototype.updatePosition;
        Spriteset_Base.prototype.updatePosition = function() {
            _parent_updatePosition.call(this);
            
            var map_s = dp_getVisiblePos();
            this.x = map_s.x * -1;
            this.y = map_s.y * -1;
            
            this.x += Math.round($gameScreen.shake());
        };
    }());
    
    /*
    Scene_Map
    =============================================================================
    拡大率の引継ぎ
    */
    (function(){
        /*
        マップシーンの開始
        */
        //@override
        var _parent_start = Scene_Map.prototype.start;
        Scene_Map.prototype.start = function() {
            _parent_start.call(this);
            
            //移動後処理
            if(this._transfer) {
                //マップ設定情報で拡大率変更
                //イベントエディタからのテスト実行では$gameMap.metaが定義されない。
                $gameMap._dp_scale = ('meta' in $dataMap) ?
                    Number($dataMap.meta.zoomScale || $gameMap._dp_scale)
                    : $gameMap._dp_scale;
                
                //カメラターゲット
                //イベントエディタからのテスト実行では$gameMap.metaが定義されない。
                $gameMap._dp_target = ('meta' in $dataMap) ?
                    Number($dataMap.meta.camTarget || 0)
                    : 0;
                    
                //パン
                $gameMap._dp_pan = new Point();
            }
            
            //標準レンダリングサイズにリセット
            dp_renderSize.reset();
            
            //カメラターゲット設定
            camera.target = $gameMap._dp_target;
            
            //マップシーン開始時に拡大率変更をフック。
            dp_setZoom($gameMap._dp_scale);
            
            //画面中心を強制設定する
            if((!user_use_camera) && user_use_camera_transfer) camera.center(null, null, true);
        };
        
        /*
        マップシーンの終了
        */
        //@override
        var _parent_terminate = Scene_Map.prototype.terminate;
        Scene_Map.prototype.terminate = function() {
            //マップシーン終了時に拡大率情報を保存。
            camera.animation.end();
            
            var zoomPos = dp_getZoomPos();
            $gameScreen.setZoom(zoomPos.x, zoomPos.y, dp_renderSize.scale);
            // 保留主动设置的偏移。当前 display 与目标的距离还包含地图边界、
            // 镜头墙和弹性跟随的暂时落后，不能将这些距离存成持续生效的 pan。
            
            _parent_terminate.call(this);
        };
        
        /*
        エンカウントエフェクト
        */
        if(!user_fix_encount) return;
        //@override
        Scene_Map.prototype.updateEncounterEffect = function() {
            if (this._encounterEffectDuration > 0) {
                this._encounterEffectDuration--;
                var speed = this.encounterEffectSpeed();
                var n = speed - this._encounterEffectDuration;
                var p = n / speed;
                var q = ((p - 1) * 20 * p + 5) * p + 1;
                var zoomPos = dp_getZoomPos();
                
                if (n === 2) {
                    $gameScreen.setZoom(zoomPos.x, zoomPos.y, dp_renderSize.scale);
                    this.snapForBattleBackground();
                    this.startFlashForEncounter(speed / 2);
                }
                
                $gameScreen.setZoom(zoomPos.x, zoomPos.y, (q * dp_renderSize.scale));
                if (n === Math.floor(speed / 6)) {
                    this.startFlashForEncounter(speed / 2);
                }
                if (n === Math.floor(speed / 2)) {
                    BattleManager.playBattleBgm();
                    this.startFadeOut(this.fadeSpeed());
                }
            }
        };
        //エンカウントエフェクトここまで
        
    }());
    
    /*
    Tilemap
    =============================================================================
    Canvasモード時の軽量化、拡大率の反映
    */
    (function(){
        //@override
        var _Tilemap_createLayers = Tilemap.prototype._createLayers;
        Tilemap.prototype._createLayers = function() {
            if(this._lowerLayer instanceof Sprite) {
               this._lowerLayer.destroy();
            }
            if(this._upperLayer instanceof Sprite) {
                this._upperLayer.destroy();
            }
            
            _Tilemap_createLayers.call(this);
        };
    }());
    
    /*
    Game_Screen
    =============================================================================
    アニメーション処理のフック
    */
    (function(){
        //@override
        var _parent_update = Game_Screen.prototype.update;
        Game_Screen.prototype.update = function() {
            _parent_update.call(this);
            camera.animation.update();
        };
        
        //@override
        var _parent_initialize = Game_Screen.prototype.initialize;
        Game_Screen.prototype.initialize = function() {
            _parent_initialize.call(this);
            dp_renderSize.reset();
        };
    }());
    
    
}());

   /* (function(){
		
var _Window_Base_update = Window_Base.prototype.update;
Window_Base.prototype.update = function() {
    _Window_Base_update.call(this);
    if ($gameScreen.zoomScale() !== 1) {
        this.scale.x = 1 / $gameScreen.zoomScale();
        this.scale.y = 1 / $gameScreen.zoomScale();
    }
};
        
var _Bitmap_drawText = Bitmap.prototype.drawText;
Bitmap.prototype.drawText = function(text, x, y, maxWidth, lineHeight, align) {
    // 由于 Bitmap 没有 scale 属性，这里不需要修改 scale
    _Bitmap_drawText.call(this, text, x, y, maxWidth, lineHeight, align);
};
    
var _Window_Base_move = Window_Base.prototype.move;
Window_Base.prototype.move = function(x, y, width, height) {
    if ($gameScreen.zoomScale() !== 1) {
        x /= $gameScreen.zoomScale();
        y /= $gameScreen.zoomScale();
    }
    _Window_Base_move.call(this, x, y, width, height);
};
   
}());*/
