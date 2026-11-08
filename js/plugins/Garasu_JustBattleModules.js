/*:
 * No Modificar aqui, por favor.

 * @plugindesc Esto es un plugin que hice como agradecimiento como apoyo motivacional a un servidor de discord
 * @author Garasu Nightmare Fox
 * @help este plugin contiene comandos de script.
 * pero puedes usar los siguientes comandos que son los siguientes:
 * ------------------------------------------------------------------------------
 * ------------------------------------------------------------------------------
 * 
 * 
 * 
 * 
 * 
 * Reproducir la misma musica pero con parametros diferentes:
 *      Garasu_VarModBGM(Tono, Volumen, Panoramización);
 *      Garasu_ModBGM(Tono, Volumen, Panoramización);
 * 
 * 
 * Tono: Permite modificar el tono del BGM reproduciendo la misma música.
 * Volumen: Permite modificar el Volumen del BGM reproduciendo la misma música.
 * Panoramización: Permite modificar el lado donde escuchas
 * 
 * Garasu_VarModBGM(Tono, Volumen, Panoramización);
 * Descripción:
 * lo que te permite hacer esta función es reproducir la misma musica con
 * parametros modificados.
 * 
 * Tienes que colocar la ID de las variables.
 * 
 * ejemplo:
 * Garasu_VarModBGM(1, 2, 3);
 * 
 * la variable #001, permitira modificar el tono dependiendo del valor.
 * la variable #002, permitira modificar el volumen dependiendo del valor.
 * la variable #003, permitira modificar la Panoramización del valor.
 * (y en este)
 * 
 * si quieres hacerlo de forma manual o decimal tendrás que usar
 * el siguiente comando de script:
 * 
 * Garasu_ModBGM(Tono, Volumen, Panoramización);
 * 
 * ejemplo:
 * Garasu_ModBGM(100, 100, 0);
 * 
 * ------------------------------------------------------------------------------
 * ------------------------------------------------------------------------------
 * 
 * Efecto Congelamiento:
 * el siguiente comando de script para poder interpretarlo es el siguiente:
 * 
 * Garasu_EnfriarPantallaTemporal(tiempo de congelamiento, velocidad de fotogramas);
 * Garasu_EnfriarPantalla(velocidad de fotogramas);
 * 
 * tiempo de congelamiento: Es la velocidad en la que tardara
 * hasta volver a la normalidad
 * 
 * velocidad de fotogramas: es a la velocidad de fotogramas maximo
 * que ira el juego (60fps por defecto)
 * 
 * ejemplo de uso:
 * Garasu_EnfriarPantallaTemporal(5, 15);
 * ^ la pantalla del juego ira a 15fps durante 5 segundos ^
 * 
 * ------------------------------------------------------------------------------
 * ------------------------------------------------------------------------------
 * ------------------------------------------------------------------------------
 * ------------------------------------------------------------------------------
 * 
 * bugs que no puedo reparar:
 *  - actualmente si el efecto de congelamiento o lentitud esta activo, el juego
 *    aunque este pausado seguira yendo lento hasta que el tiempo haya pasado.
 * 
 *  - puede que se escuche un lag pequeño dependiendo de la musica.
 * 
 * advertencias:
 *      - si cambias los parametros mientras la musica
 *        tenga un efecto de reversion, el juego se crasheara (no tengo razon)
 * 
 *      - mientras menos fotogramas le pongas a la velocidad
 *        (1 fotograma en 0.02 segundos por ejemplo), el efecto terminaria hasta
 *        que el fotograma justo o despues del tiempo
 * 
 * terminos de uso:
 * - eres libre de usar y modificar este plugin.
 * - puedes usarlo de forma comercial y no comercial.
 *   (si es en comercial, ¿podrias darme creditos c:?, te lo agradeceria bastante)
 * 
 * 
 * 
 *
 * @param Tiempo afectado por el tono
 * @type boolean
 * @desc Si el parametro esta activo, la musica cambia de tono, continuara con su reproducción, y si no, se reiniciara.
 * @default false
 * 
 * 
 * @param ¿Usas Yep Frame Sync?
 * @type boolean
 * @desc Si usas el Yep Frame Sync deberias activarlo, ya que si no lo haces, si el jugador tiene desactivado la opcion de Sync de Yep
 * @default false
 * 
 * 
 */


//          params

    const Garasu_AffectsYepSync = PluginManager.parameters('Garasu_JustBattleModules')["¿Usas Yep Frame Sync?"].toLowerCase() == 'true';
    const Garasu_BGMAffectsTone = PluginManager.parameters('Garasu_JustBattleModules')["Tiempo afectado por el tono"].toLowerCase() == 'true';

//          end of params


    




//              Start the magic

function Garasu_ModBGM(MPitch, MVol, MPan){
    bgm = AudioManager._currentBgm ?? {
        name: '',
        volume: 100,
        pitch: 100,
        pan: 100
    }
    bgm.volume = MVol;
    bgm.pitch = MPitch;
    bgm.pan = MPan;
    AudioManager.playBgm(bgm);
    };



function Garasu_VarModBGM(MPitch, MVol, MPan){
    bgm = AudioManager._currentBgm ?? {
        name: '',
        volume: 100,
        pitch: 100,
        pan: 100
}
    bgm.volume = $gameVariables.value(MVol);
    bgm.pitch = $gameVariables.value(MPitch);
    bgm.pan = $gameVariables.value(MPan);
    AudioManager.playBgm(bgm);
};

if(Garasu_AffectsYepSync == true){
    if (typeof ConfigManager.synchFps === 'undefined'){
        alert("Garasu:\nDeberias Desactivar la opcion llamada \n- ¿Usas Yep Frame Sync? -");
        alert("Garasu:\nSi no desactivas esa opción,\nes probable que al usar el efecto de tiempo te de un error.");

        throw new Error("\n\nGarasu:\nDeberias Desactivar la opcion llamada \n- ¿Usas Yep Frame Sync? -\nSi no desactivas esa opción,\nes probable que al usar el efecto de tiempo te de un error.");
    }else{
        console.log("Garasu:\nel plugin seguira funcionando con el YEP Frame Sync")
    }
}

// Efecto Congelamiento

function Garasu_Descongelar(){
    SceneManager._deltaTime = 1.0 / 60.0;
    if(Garasu_AffectsYepSync == true){ ConfigManager.synchFps = Gar_IsSkipframeActivated; }

}

var Gar_IsSkipframeActivated = false;

function reactivateScreenEffectFrz(){
    Gar_IsSkipframeActivated = false;
};
function checkFPSMode(){
if(ConfigManager.synchFps){
    Gar_IsSkipframeActivated = true;

}else{
    Gar_IsSkipframeActivated = false;
}
}
function Garasu_EnfriarPantallaTemporal(time, screenspeed){
    GameSpeedEffect(time, screenspeed);

}

function Garasu_EnfriarPantalla(screenspeed){
    if(Garasu_AffectsYepSync == false){
    }else{
    checkFPSMode();
    ConfigManager.synchFps = true;
}
    SceneManager._deltaTime = 1.0 / screenspeed;
}

function GameSpeedEffect(time, screenspeed){
    if(Garasu_AffectsYepSync == true){
        checkFPSMode();
        ConfigManager.synchFps = true;
        SceneManager._deltaTime = 1.0 / screenspeed;
        setTimeout(Garasu_Descongelar, time * 1000);

    }else{
    SceneManager._deltaTime = 1.0 / screenspeed;
    setTimeout(Garasu_Descongelar, time * 1000);
    }
}

//efecto congelamiento termina

// Tono Sincronizado

var Garasu_TimeActually = 0.0;
var Garasu_BGM = 0.0;
var Garasu_BGS = 0.0;

if(Garasu_BGMAffectsTone == true){
/**
 * The pitch of the audio.
 *
 * @property pitch
 * @type Number
 */
Object.defineProperty(WebAudio.prototype, 'pitch', {
    get: function() {
        return this._pitch;
    },
    set: function(value) {
        if (this._pitch !== value) {
            this._pitch = value;
            if (this.isPlaying()) {
                this.play(this._sourceNode.loop, Garasu_TimeActually.pos);
            }
        }
    },
    configurable: true
});
}

/**  Garasu_BGS = AudioManager.saveBgs();
    Garasu_TimeActually = Garasu_BGS;

    Garasu_BGM = AudioManager.saveBgm();
    Garasu_TimeActually = Garasu_BGM;
*/

// Definicion cuando el BGM Cambia y el BGS
if(Garasu_BGMAffectsTone == true){

    AudioManager.playBgm = function(bgm, pos) {
        Garasu_BGM = AudioManager.saveBgm();
        Garasu_TimeActually = Garasu_BGM;

        if (this.isCurrentBgm(bgm)) {
            this.updateBgmParameters(bgm);
        } else {
            this.stopBgm();
            if (bgm.name) { 
                if(Decrypter.hasEncryptedAudio && this.shouldUseHtml5Audio()){
                    this.playEncryptedBgm(bgm, pos);
                }
                else {
                    this._bgmBuffer = this.createBuffer('bgm', bgm.name);
                    this.updateBgmParameters(bgm);
                    if (!this._meBuffer) {
                        this._bgmBuffer.play(true, pos || 0);
                    }
                }
            }
        }
        this.updateCurrentBgm(bgm, pos);
    };

    AudioManager.playBgs = function(bgs, pos) {
    Garasu_BGS = AudioManager.saveBgs();
    Garasu_TimeActually = Garasu_BGS;
    

        if (this.isCurrentBgs(bgs)) {
            this.updateBgsParameters(bgs);
        } else {
            this.stopBgs();
            if (bgs.name) {
                this._bgsBuffer = this.createBuffer('bgs', bgs.name);
                this.updateBgsParameters(bgs);
                this._bgsBuffer.play(true, pos || 0);
            }
        }
        this.updateCurrentBgs(bgs, pos);
    };
}




(function() {
  if (!window.AudioManager) return;

  // 统一把传入的 bgm/bgs 归一化为安全对象
  function normAudio(a) {
    if (a && typeof a === 'object') {
      return {
        name:  typeof a.name  === 'string' ? a.name  : '',
        volume: Number.isFinite(a.volume) ? a.volume : 90,
        pitch:  Number.isFinite(a.pitch)  ? a.pitch  : 100,
        pan:    Number.isFinite(a.pan)    ? a.pan    : 0
      };
    }
    return { name: '', volume: 90, pitch: 100, pan: 0 };
  }

  // 包一层，保证传给“被重写的”AudioManager.playBgm/Bgs 的参数是安全的
  const _playBgs = AudioManager.playBgs;
  AudioManager.playBgs = function(bgs, pos) {
    return _playBgs.call(this, normAudio(bgs), pos || 0);
  };

  const _playBgm = AudioManager.playBgm;
  AudioManager.playBgm = function(bgm, pos) {
    return _playBgm.call(this, normAudio(bgm), pos || 0);
  };

  // 旧存档：在回放前把 onSave 的对象也补全一下
  const _onAfterLoad = Game_System.prototype.onAfterLoad;
  Game_System.prototype.onAfterLoad = function() {
    this._bgmOnSave = normAudio(this._bgmOnSave);
    this._bgsOnSave = normAudio(this._bgsOnSave);
    _onAfterLoad.call(this);
  };
})();


//=============================================================================
// ** MV → MZ 兼容垫片：游戏加速 / 慢放
//
//   MV 的主循环 SceneManager.updateMain 里有 while(_accumulator >= _deltaTime) 累加器，
//   改小 _deltaTime 就能让逻辑每帧多跑几步 → 加速；本插件就是靠改 _deltaTime 实现的。
//   MZ 把主循环重写成 SceneManager.update → determineRepeatNumber()，根本不再读 _deltaTime，
//   所以本插件在 MZ 完全失效。
//
//   这里做两件事，不改插件原有函数：
//     1) 把 SceneManager._deltaTime 变成带 setter 的属性：插件赋值 _deltaTime=1/screenspeed 时，
//        自动换算成速度倍率 speed = (1/60)/_deltaTime = screenspeed/60（60=正常、120=2倍速、15=0.25倍慢放）。
//     2) 重写 SceneManager.update：在 MZ 原本每 tick 的 updateMain 次数(n，含掉帧补偿)基础上，
//        用累加器乘以 speed，决定本 tick 实际跑多少次 updateMain（渲染仍每 tick 一次 = 快进/慢放）。
//=============================================================================
(function(){
    if( !window.SceneManager || SceneManager._garasuSpeedPatch ){ return; }
    SceneManager._garasuSpeedPatch = true;

    SceneManager._garasuSpeed = 1.0;     // 速度倍率（screenspeed/60）
    SceneManager._garasuAccum = 0.0;     // 步进累加器（支持分数倍率，如慢放）

    // _deltaTime → 速度倍率。MZ 核心不使用 _deltaTime，这里独占。
    Object.defineProperty( SceneManager, '_deltaTime', {
        get: function(){
            return ( this.__garasuDeltaTime != null ) ? this.__garasuDeltaTime : ( 1.0 / 60.0 );
        },
        set: function( v ){
            this.__garasuDeltaTime = v;
            this._garasuSpeed = ( v > 0 ) ? ( ( 1.0 / 60.0 ) / v ) : 1.0;
        },
        configurable: true
    });

    SceneManager.update = function( deltaTime ){
        try {
            var n = this.determineRepeatNumber( deltaTime );   // MZ 原生：通常 1，掉帧时更多、高刷时可能 0
            var speed = this._garasuSpeed || 1.0;
            // 事件指令里创建的 setTimeout 尚未触发时，强制 1.0（实时）禁用加速/慢放，
            // 避免 setTimeout 走墙钟时间、与加速后的逻辑帧错位导致事件软锁；
            // 定时器全部触发/清除后自动恢复加速。
            if( window.Garasu_HasPendingEventTimeout && window.Garasu_HasPendingEventTimeout() ){
                speed = 1.0;
            }
            this._garasuAccum += n * speed;
            var steps = Math.floor( this._garasuAccum );
            this._garasuAccum -= steps;
            if( steps > 60 ){ steps = 60; }                    // 安全上限，避免极端倍率卡死
            for( var i = 0; i < steps; i++ ){
                this.updateMain();
            }
        } catch( e ){
            this.catchException( e );
        }
    };
})();

//=============================================================================
// ** setTimeout 与加速冲突处理
//
//   加速靠每 tick 多跑 updateMain 实现，但 setTimeout 走真实墙钟时间、不随之加速，
//   导致事件里用 setTimeout 定时时，加速时回调相对"迟到"→ 事件软锁。
//   处理：把"事件指令(executeCommand)执行期间创建的 setTimeout"标记为受守卫定时器，
//   只要这类定时器尚有未触发的，就让 update() 把速度强制回 1.0（见上方门控）。
//   Alt 全局倍速沿用全局统计；Ctrl 文本快进另按“脚本块 + 解释器”精确归属，
//   避免并行事件和插件内部定时器误锁当前消息。
//=============================================================================
(function(){
    if( window._garasuTimeoutGuardInstalled ){ return; }
    window._garasuTimeoutGuardInstalled = true;

    var pending = 0;
    var guardedTimers = new Map();
    var ctrlPendingByInterpreter = new WeakMap();

    // 供上方 SceneManager.update 的门控查询是否存在未触发的事件定时器
    window.Garasu_HasPendingEventTimeout = function(){ return pending > 0; };

    // Ctrl 文本快进不能使用全局 pending。这里只查询同一个解释器中，由事件的
    // “脚本”(355)直接写出的 setTimeout；并行事件和插件内部定时器不会误锁消息。
    window.Garasu_HasPendingEventTimeoutFor = function( interpreter ){
        return !!interpreter && ( ctrlPendingByInterpreter.get( interpreter ) || 0 ) > 0;
    };

    function changeCtrlPending( interpreter, amount ){
        if( !interpreter ){ return; }
        var count = Math.max( 0, ( ctrlPendingByInterpreter.get( interpreter ) || 0 ) + amount );
        if( count > 0 ){
            ctrlPendingByInterpreter.set( interpreter, count );
        }else{
            ctrlPendingByInterpreter.delete( interpreter );
        }
    }

    function scriptCommandContainsSetTimeout( interpreter, command ){
        if( !command || command.code !== 355 ){ return false; }
        var script = String( command.parameters[0] || "" );
        var list = interpreter._list || [];
        for( var i = interpreter._index + 1; i < list.length && list[i].code === 655; i++ ){
            script += "\n" + String( list[i].parameters[0] || "" );
        }
        return /\bsetTimeout\s*\(/.test( script );
    }

    function setMessageTimeoutLock( interpreter ){
        if( window.$gameMessage ){
            $gameMessage._garasuCtrlTimeoutLocked =
                window.Garasu_HasPendingEventTimeoutFor( interpreter );
        }
    }

    function finishGuardedTimer( id ){
        var timer = guardedTimers.get( id );
        if( !timer ){ return; }
        guardedTimers.delete( id );
        pending = Math.max( 0, pending - 1 );
        if( timer.ctrlRelevant ){
            changeCtrlPending( timer.interpreter, -1 );
        }
    }

    // 事件指令执行期间打标记：此窗口内创建的 setTimeout 视为"事件脚本来源"
    if( window.Game_Interpreter ){
        var _executeCommand = Game_Interpreter.prototype.executeCommand;
        Game_Interpreter.prototype.executeCommand = function(){
            var command = this.currentCommand();
            var prev = window._garasuInEventScript;
            var prevContext = window._garasuEventTimeoutContext;
            window._garasuInEventScript = true;
            window._garasuEventTimeoutContext = {
                interpreter: this,
                ctrlRelevant: scriptCommandContainsSetTimeout( this, command )
            };
            try {
                var result = _executeCommand.apply( this, arguments );
                // 兼容“先建立消息等待、后在同一脚本块创建 timeout”的书写顺序。
                if( this._waitMode === "message" ){
                    setMessageTimeoutLock( this );
                }
                return result;
            } finally {
                window._garasuInEventScript = prev;
                window._garasuEventTimeoutContext = prevContext;
            }
        };

        var _setWaitMode = Game_Interpreter.prototype.setWaitMode;
        Game_Interpreter.prototype.setWaitMode = function( waitMode ){
            if( waitMode === "message" ){
                setMessageTimeoutLock( this );
            }
            return _setWaitMode.apply( this, arguments );
        };
    }

    if( window.Game_Message ){
        var _gameMessageClear = Game_Message.prototype.clear;
        Game_Message.prototype.clear = function(){
            _gameMessageClear.apply( this, arguments );
            this._garasuCtrlTimeoutLocked = false;
        };
    }

    var _setTimeout = window.setTimeout;
    var _clearTimeout = window.clearTimeout;

    window.setTimeout = function( fn, delay ){
        // 仅在事件指令执行期间、且回调是函数时纳入守卫统计
        if( window._garasuInEventScript && typeof fn === 'function' ){
            var context = window._garasuEventTimeoutContext || {};
            var holder = {
                interpreter: context.interpreter || null,
                ctrlRelevant: !!context.ctrlRelevant
            };
            var wrapped = function(){
                // 链式传染：受守卫回调执行期间也视为"事件来源"，其中再创建的 setTimeout
                // （如 Map006 用 setTimeout 调用 frameByFrameAnimationNSFW 里又含 setTimeout 的函数）
                // 一并纳入守卫；计数在回调结束后才递减，保证整条链期间 pending 不会瞬时归零。
                var prev = window._garasuInEventScript;
                var prevContext = window._garasuEventTimeoutContext;
                window._garasuInEventScript = true;
                window._garasuEventTimeoutContext = {
                    interpreter: holder.interpreter,
                    ctrlRelevant: holder.ctrlRelevant
                };
                try {
                    return fn.apply( this, arguments );
                } finally {
                    window._garasuInEventScript = prev;
                    window._garasuEventTimeoutContext = prevContext;
                    finishGuardedTimer( holder.id );
                }
            };
            var args = Array.prototype.slice.call( arguments );
            args[0] = wrapped;
            var id = _setTimeout.apply( window, args );
            holder.id = id;
            guardedTimers.set( id, holder );
            pending++;
            if( holder.ctrlRelevant ){
                changeCtrlPending( holder.interpreter, 1 );
            }
            return id;
        }
        return _setTimeout.apply( window, arguments );
    };

    window.clearTimeout = function( id ){
        finishGuardedTimer( id );
        return _clearTimeout.apply( window, arguments );
    };
})();
