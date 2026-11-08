//=============================================================================
// ParallelBgs.js
// ----------------------------------------------------------------------------
// (C)2016 Triacontane
// This software is released under the MIT License.
// http://opensource.org/licenses/mit-license.php
// ----------------------------------------------------------------------------
// Version
// 1.1.3 2025/10/19 BGSの演奏が始まっていない状態ではSE演奏時フェードアウトが行われない仕様に変更
// 1.1.2 2025/06/22 SE演奏中のBGSフェードアウト機能で、SEの演奏が終わる前にBGSがフェードインする場合がある問題を修正
// 1.1.1 2021/03/06 BGMのフェードアウトのイベントコマンドでは現在のラインのBGSのみフェードアウトするよう修正
// 1.1.0 2020/12/14 MZ向けに全面的に修正
// 1.0.3 2020/02/02 ヘルプのプラグインコマンド「PB_BGSライン変更」が間違っていたので「PB_BGS_ライン変更」に修正(コード修正なし)
// 1.0.2 2017/01/05 BGSの演奏状態によっては、セーブ＆ロードした際に一部のBGSが演奏されなくなる現象の修正(byくらむぼん氏)
// 1.0.1 2016/11/16 BGSをプレーしていない状態でセーブ＆ロードするとエラーになる現象の修正
// 1.0.0 2016/11/12 初版
// ----------------------------------------------------------------------------
// [Blog]   : http://triacontane.blogspot.jp/
// [Twitter]: https://twitter.com/triacontane/
// [GitHub] : https://github.com/triacontane/
//=============================================================================

/*:
 * @plugindesc BGS並行演奏プラグイン
 * @target MZ
 * @url https://github.com/triacontane/RPGMakerMV/tree/mz_master/ParallelBgs.js
 * @base PluginCommonBase
 * @author トリアコンタン
 * 
 * @param stopAllAutoPlay
 * @text 自動演奏により停止
 * @type boolean
 * @desc BGSの自動演奏が設定されたマップに移動したとき、全ラインのBGSの演奏を停止します。
 * @default false
 * 
 * @command CHANGE_LINE
 * @text ライン変更
 * @desc 現在のBGSの演奏ラインを変更します。演奏ラインの異なるBGSは並行して演奏できます。
 *
 * @arg line
 * @text ライン番号
 * @desc 変更するBGSのライン番号です。
 * @default 1
 * @type number
 * 
 * @command ALL_STOP
 * @text 全停止
 * @desc 全ての演奏中のBGSを停止します。
 * 
 * @command FADEOUT_FOR_SE
 * @text SE演奏時フェードアウト
 * @desc SEが演奏されたタイミングでBGSを自動フェードアウトします。
 * 
 * @arg type
 * @text フェードアウト種別
 * @desc フェードアウトのやり方です。
 * @default 1
 * @type select
 * @option 0:フェードアウトせずに通常通りSEを演奏します。
 * @value 0
 * @option 1:SE演奏と同時にフェードアウトを開始します。
 * @value 1
 * @option 2:フェードアウトが完了してからSE演奏します。
 * @value 2
 * 
 * @arg fadeTime
 * @text フェード時間
 * @desc 自動フェードアウトに掛かる時間(フレーム)です。
 * @default 60
 * @type number
 *
 * @help ParallelBgs.js
 * 
 * 複数のBGSを並行して演奏できます。
 * プラグインコマンドからBGSの演奏ラインを変更すると元のBGSを演奏したまま、
 * 新しく別のBGSを演奏することができます。
 * 並行演奏しているBGSはそれぞれ個別に音量やピッチ、左右バランスを調節できます。
 * 演奏ラインのデフォルトは[1]です。
 *
 * ラインの数に制限はありませんが、あまりに大量のBGSを
 * 同時に演奏しようとすると動作に影響がでる恐れがあります。
 *
 * なお、マップで指定するオート演奏のBGSはラインが[1]で固定になります。
 *
 * BGM 交叉淡化（仅脚本调用，不改变原有播放 BGM 事件）：
 * AudioManager.crossFadeBgm({name: '曲名', volume: 90, pitch: 100, pan: 0}, 2);
 * 第二个参数为过渡秒数，默认 2；第三个参数为新曲起播秒数，默认 0。
 * 文件位于 audio/bgm/，name 不含扩展名。新曲就绪后才开始交叉淡化。
 * 新曲成为主 BGM，水下滤镜仅跟随主轨；旧曲淡出结束后释放。
 * 连续切换会保留尚未淡完的旧曲，各自按原定时间释放；不延长旧曲寿命。
 * 切回尚未释放且音调相同的旧曲，会保留播放进度，从当前音量反向淡入。
 * 若显式传入第三个参数，则切回旧曲时也按指定位置重新创建播放。
 * 重复请求当前曲或正在加载的曲不会重复加载、重启播放或重置当前淡化。
 * 普通 playBgm / stopBgm 会清理过渡；fadeOutBgm 会淡出所有过渡音轨。
 * ME 开始时结束过渡并暂停主轨；ME 期间的新请求等 ME 结束再过渡。
 * 存档和 saveBgm() 只保存主曲，不保存短暂的过渡尾音。
 *
 * 利用規約：
 *  作者に無断で改変、再配布が可能で、利用形態（商用、18禁利用等）
 *  についても制限はありません。
 *  このプラグインはもうあなたのものです。
 */

(function() {
    'use strict';
    const script = document.currentScript;
    const metaTagPrefix = 'PB_';
    const legacyParam = PluginManager.parameters('ParallelBgs') || {};
    const param = {
        stopAllAutoPlay: String(legacyParam.stopAllAutoPlay || legacyParam['自動演奏により停止']).toLowerCase() === 'true'
    };
    const toNumber = (value, defaultValue) => {
        const result = Number(PluginManagerEx.convertEscapeCharacters(String(value ?? '')));
        return Number.isFinite(result) ? result : defaultValue;
    };

    PluginManagerEx.registerCommand(script, 'CHANGE_LINE', args => {
        $gameSystem.setBgsLine(args.line);
    });

    PluginManagerEx.registerCommand(script, 'ALL_STOP', args => {
        AudioManager.stopAllBgs();
    });

    PluginManagerEx.registerCommand(script, 'FADEOUT_FOR_SE', args => {
        $gameSystem.setBgsFadeForSe(args.type, args.fadeTime);
    });

    const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        if (_Game_Interpreter_pluginCommand) {
            _Game_Interpreter_pluginCommand.apply(this, arguments);
        }
        if (!String(command || '').match(new RegExp('^' + metaTagPrefix))) {
            return;
        }
        this.pluginCommandParallelBgs(command.replace(metaTagPrefix, ''), args || []);
    };

    Game_Interpreter.prototype.pluginCommandParallelBgs = function(command, args) {
        switch (String(command || '').toUpperCase()) {
            case 'BGS_CHANGE_LINE':
            case 'BGS_ライン変更':
                $gameSystem.setBgsLine(toNumber(args[0], 1));
                break;
            case 'BGS_ALL_STOP':
            case 'BGS_全停止':
                AudioManager.stopAllBgs();
                break;
            case 'BGS_FADEOUT_FOR_SE':
            case 'BGS_SE演奏時フェードアウト':
                $gameSystem.setBgsFadeForSe(toNumber(args[0], 0), $gameSystem.getBgsFadeTime());
                break;
            case 'BGS_FADEOUT_TIME':
            case 'BGS_フェードアウト時間':
                $gameSystem.setBgsFadeTime(toNumber(args[0], 1));
                break;
        }
    };

    const _Game_Interpreter_command246 = Game_Interpreter.prototype.command246;
    Game_Interpreter.prototype.command246 = function(params) {
        AudioManager._bgsFadeOutByLine = true;
        const result = _Game_Interpreter_command246.apply(this, arguments);
        AudioManager._bgsFadeOutByLine = false;
        return result;
    };

    //=============================================================================
    // Game_System
    //  BGS演奏ラインを変更します。
    //=============================================================================
    const _Game_System_initialize      = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        _Game_System_initialize.apply(this, arguments);
        this.initBgsMember();
    };

    Game_System.prototype.initBgsMember = function() {
        this.setBgsLine(this.getBgsLine());
        this.setBgsFadeForSe(this.getBgsFadeForSe(), this.getBgsFadeTime());
    };

    Game_System.prototype.getBgsLine = function() {
        return this._bgsLine || 1;
    };

    Game_System.prototype.setBgsLine = function(value) {
        this._bgsLine = value;
        AudioManager.setBgsLineIndex(value);
    };

    Game_System.prototype.getBgsFadeForSe = function() {
        return this._bgsFadeForPlayingSe || 0;
    };

    Game_System.prototype.setBgsFadeForSe = function(se, time) {
        this._bgsFadeForPlayingSe = se;
        this._bgsFadeTime = time;
        AudioManager.setBgsFadeForSe(se);
        AudioManager.setBgsFadeTime(this.getBgsFadeTime());
    };

    Game_System.prototype.getBgsFadeTime = function() {
        return this._bgsFadeTime || 1;
    };

    Game_System.prototype.setBgsFadeTime = function(value) {
        this._bgsFadeTime = value;
        AudioManager.setBgsFadeTime(value);
    };

    const _Game_System_onAfterLoad      = Game_System.prototype.onAfterLoad;
    Game_System.prototype.onAfterLoad = function() {
        _Game_System_onAfterLoad.apply(this, arguments);
        this.initBgsMember();
    };

    const _Game_Map_autoplay      = Game_Map.prototype.autoplay;
    Game_Map.prototype.autoplay = function() {
        if ($dataMap.autoplayBgs && param.stopAllAutoPlay) {
            AudioManager.stopAllBgs();
        }
        AudioManager.multiLineDisable = true;
        _Game_Map_autoplay.apply(this, arguments);
        AudioManager.multiLineDisable = false;
    };

    //=============================================================================
    // AudioManager
    //  複数のBGS演奏ラインを管理します。
    //=============================================================================
    AudioManager.multiLineDisable = false;
    AudioManager._bgsLineIndex    = 1;
    AudioManager._bgsFadeForSe    = 0;
    AudioManager._bgsFadeTime     = 1;
    AudioManager._allBgsBuffer    = [];
    AudioManager._currentAllBgs   = [];
    AudioManager._delaySeStack    = [];
    AudioManager._allStop         = false;
    AudioManager._stopAllBgs      = true;
    AudioManager._bgsFading       = false;
    AudioManager._bgsFadeCounter  = 0;

    const _AudioManager_bgsVolume = Object.getOwnPropertyDescriptor(AudioManager, 'bgsVolume');
    Object.defineProperty(AudioManager, 'bgsVolume', {
        get: function() {
            return _AudioManager_bgsVolume.get.call(this);
        },
        set: function(value) {
            _AudioManager_bgsVolume.set.call(this, value);
            const nowBgs = this._currentBgs;
            this.iterateAllBgs(function() {
                if (nowBgs !== this._currentBgs) this.updateBgsParameters(this._currentBgs);
            }.bind(this));
        },
        configurable: true
    });

    Object.defineProperty(AudioManager, '_bgsBuffer', {
        get: function() {
            return this._allBgsBuffer[this.getBgsLineIndex()];
        },
        set: function(value) {
            this._allBgsBuffer[this.getBgsLineIndex()] = value;
        }
    });

    Object.defineProperty(AudioManager, '_currentBgs', {
        get: function() {
            return this._currentAllBgs[this.getBgsLineIndex()];
        },
        set: function(value) {
            this._currentAllBgs[this.getBgsLineIndex()] = value;
        }
    });

    AudioManager.getBgsLineIndex = function() {
        return this.multiLineDisable ? 1 : this._bgsLineIndex;
    };

    AudioManager.setBgsLineIndex = function(index) {
        this._bgsLineIndex = index;
    };

    AudioManager.setBgsFadeForSe = function(value) {
        this._bgsFadeForSe = value;
    };

    AudioManager.setBgsFadeTime = function(value) {
        this._bgsFadeTime = value;
    };

    const _AudioManager_playBgs = AudioManager.playBgs;
    AudioManager.playBgs      = function(bgs, pos) {
        if (!bgs) return;
        this._stopAllBgs = false;
        if (Array.isArray(bgs)) {
            this.playAllBgs(bgs);
        } else {
            _AudioManager_playBgs.apply(this, arguments);
        }
        this._stopAllBgs = true;
    };

    AudioManager.playAllBgs = function(bgsArray) {
        this.stopAllBgs();
        const prevIndex      = this._bgsLineIndex;
        this._bgsLineIndex = 1;
        bgsArray.forEach(function(bgs, index) {
            this._bgsLineIndex = index;
            this.playBgs(bgs, null);
        }, this);
        this._bgsLineIndex = prevIndex;
    };

    const _AudioManager_replayBgs = AudioManager.replayBgs;
    AudioManager.replayBgs      = function(bgs) {
        if (!bgs) return;
        if (Array.isArray(bgs)) {
            this.replayAllBgs(bgs);
        } else {
            _AudioManager_replayBgs.apply(this, arguments);
        }
    };

    AudioManager.replayAllBgs = function(bgsArray) {
        this.stopAllBgs();
        const prevIndex      = this._bgsLineIndex;
        this._bgsLineIndex = 1;
        bgsArray.forEach(function(bgs, index) {
            this._bgsLineIndex = index;
            this.replayBgs(bgs);
        }, this);
        this._bgsLineIndex = prevIndex;
    };

    const _AudioManager_saveBgs = AudioManager.saveBgs;
    AudioManager.saveBgs      = function() {
        const bgsArray = [];
        this.iterateAllBgs(function() {
            bgsArray[this._bgsLineIndex] = _AudioManager_saveBgs.apply(this, arguments);
        }.bind(this));
        return bgsArray.length > 1 ? bgsArray : bgsArray[0];
    };

    const _AudioManager_stopBgs = AudioManager.stopBgs;
    AudioManager.stopBgs      = function() {
        if (!this._stopAllBgs) {
            _AudioManager_stopBgs.apply(this, arguments);
        } else {
            this.stopAllBgs();
        }
    };

    AudioManager.stopAllBgs = function() {
        this.iterateAllBgs(function() {
            _AudioManager_stopBgs.apply(this, arguments);
        }.bind(this));
    };

    const _AudioManager_fadeOutBgs = AudioManager.fadeOutBgs;
    AudioManager.fadeOutBgs      = function(time) {
        if (this._bgsFadeOutByLine) {
            _AudioManager_fadeOutBgs.call(this, time);
        } else {
            this.iterateAllBgs(function() {
                _AudioManager_fadeOutBgs.call(this, time);
            }.bind(this));
        }
    };

    const _AudioManager_fadeInBgs = AudioManager.fadeInBgs;
    AudioManager.fadeInBgs      = function(time) {
        this.iterateAllBgs(function() {
            _AudioManager_fadeInBgs.call(this, time);
        }.bind(this));
    };

    AudioManager.iterateAllBgs = function(callBack) {
        const prevIndex = this._bgsLineIndex;
        Object.keys(this._allBgsBuffer).forEach(function(index) {
            this._bgsLineIndex = index;
            callBack(this._bgsBuffer);
        }, this);
        this._bgsLineIndex = prevIndex;
    };

    const _AudioManager_playSe = AudioManager.playSe;
    AudioManager.playSe      = function(se) {
        if (this.isNeedFadeOut()) {
            this.fadeOutBgsForSe();
        }
        if (this._bgsFadeForSe === 2 && this._currentBgs && this._bgsFadeCounter > 0) {
            this._delaySeStack.push(se);
        } else {
            _AudioManager_playSe.apply(this, arguments);
        }
    };

    AudioManager.updateBgsFade = function() {
        if (this.isNeedFadeIn()) {
            this.fadeInBgsForSe();
        }
        if (this._bgsFadeCounter > 0) {
            this._bgsFadeCounter--;
            if (this._bgsFadeCounter === 0) {
                this.playDelayedSe();
            }
        }
    };

    AudioManager.fadeOutBgsForSe = function() {
        const currentAllBgs = this._currentAllBgs.clone();
        this.fadeOutBgs(this._bgsFadeTime);
        this._currentAllBgs =  currentAllBgs;
        this._bgsFading      = true;
        this._bgsFadeCounter = this._bgsFadeTime * 60;
    };

    AudioManager.isNeedFadeOut = function() {
        return !this._bgsFading && this._bgsFadeForSe !== 0 && this._bgsBuffer?._gainNode;
    };

    AudioManager.fadeInBgsForSe = function() {
        this.fadeInBgs(this._bgsFadeTime);
        this._bgsFading      = false;
        this._bgsFadeCounter = 0;
    };

    AudioManager.isNeedFadeIn = function() {
        return this._bgsFading && !this.isPlayingAnySe() && this._bgsFadeCounter === 0 && this._bgsBuffer?._gainNode;
    };

    AudioManager.playDelayedSe = function() {
        while (this._delaySeStack.length > 0) {
            _AudioManager_playSe.call(this, this._delaySeStack.pop());
        }
    };

    AudioManager.isPlayingAnySe = function() {
        return this._seBuffers.some(function(audio) {
            return audio.isPlaying();
        });
    };

    AudioManager.fadeOutBgsByLine = function(time, lineIndex) {
        const prevIndex = this._bgsLineIndex;
        this._bgsLineIndex = lineIndex;
        if (this._allBgsBuffer[lineIndex]) {
            this._allBgsBuffer[lineIndex].fadeOut(time);
        }
        this._bgsLineIndex = prevIndex;
    };

    AudioManager.fadeInBgsByLine = function(time, lineIndex) {
        const prevIndex = this._bgsLineIndex;
        this._bgsLineIndex = lineIndex;
        if (this._allBgsBuffer[lineIndex]) {
            this._allBgsBuffer[lineIndex].fadeIn(time);
        }
        this._bgsLineIndex = prevIndex;
    };

    AudioManager.stopBgsByLine = function(lineIndex) {
        const prevIndex = this._bgsLineIndex;
        this._bgsLineIndex = lineIndex;
        if (this._allBgsBuffer[lineIndex]) {
            this._allBgsBuffer[lineIndex].stop();
            this._currentAllBgs[lineIndex] = null;
            this._allBgsBuffer[lineIndex] = null;
        }
        this._bgsLineIndex = prevIndex;
    };

    AudioManager.fadeOutAllBgs = function(time) {
        this.iterateAllBgs(function(bgs) {
            if (bgs && typeof bgs.fadeOut === 'function') {
                bgs.fadeOut(time);
            }
        });
    };

    AudioManager.switchBgsInstrument = function(fadeOutIndex, fadeInIndex) {
        const prevIndex = this._bgsLineIndex;
        const outData = this._currentAllBgs[fadeOutIndex];
        const inData = this._currentAllBgs[fadeInIndex];
        if (!outData || !outData.name || !inData || !inData.name) {
            return;
        }
        let volume = outData.volume;
        if (outData.name === 'それはそれとして（へたっぴリコーダー）') {
            volume = 90;
        }
        this.fadeOutBgsByLine(1, fadeOutIndex);
        $gameSystem.setBgsLine(fadeInIndex);
        if (inData.name === 'それはそれとして（へたっぴリコーダー）') {
            volume = Math.max(0, volume - 30);
        }
        this.playBgs({
            name: inData.name,
            volume: volume,
            pitch: inData.pitch || 100,
            pan: inData.pan || 0
        });
        this.fadeInBgsByLine(1, fadeInIndex);
        this._bgsLineIndex = prevIndex;
    };

    //=============================================================================
    // BGM crossfade: keep the engine's main BGM identity and retire old buffers.
    // A separate gain before the panner keeps fades independent of BGM volume
    // and of the underwater effect's panner -> master routing.
    //=============================================================================
    const retiringBgm = new Map();
    let pendingBgm = null;
    let changingMe = false;

    const refreshMainBgmEffect = () => AudioManager.refreshUnderwaterBgmEffect?.();
    const fadeLevel = (fade, now) => {
        const progress = fade.end > fade.start
            ? Math.max(0, Math.min(1, (now - fade.start) / (fade.end - fade.start))) : 1;
        return fade.from + (fade.to - fade.from) * progress;
    };

    const removeBgmFade = buffer => {
        const fade = buffer?._parallelBgmFade;
        if (!fade) return;
        clearTimeout(fade.timer);
        if (fade.node) {
            buffer._gainNode.disconnect(fade.node);
            buffer._gainNode.connect(buffer._pannerNode);
            fade.node.disconnect();
        }
        delete buffer._parallelBgmFade;
    };

    const scheduleBgmGain = buffer => {
        const fade = buffer._parallelBgmFade;
        if (!buffer._gainNode) return;
        if (!fade.node) {
            fade.node = WebAudio._context.createGain();
            buffer._gainNode.disconnect(buffer._pannerNode);
            buffer._gainNode.connect(fade.node);
            fade.node.connect(buffer._pannerNode);
        }
        const now = WebAudio._currentTime();
        fade.node.gain.cancelScheduledValues(now);
        fade.node.gain.setValueAtTime(fadeLevel(fade, now), now);
        if (fade.end > now) fade.node.gain.linearRampToValueAtTime(fade.to, fade.end);
    };

    const fadeBgmBuffer = (buffer, target, seconds, initialLevel) => {
        const now = WebAudio._currentTime();
        const previous = buffer._parallelBgmFade;
        const from = initialLevel ?? (previous ? fadeLevel(previous, now) : 1);
        if (previous) clearTimeout(previous.timer);
        const fade = buffer._parallelBgmFade = {
            from, to: target, start: now, end: now + seconds,
            node: previous?.node || null, timer: 0
        };
        scheduleBgmGain(buffer);
        const finish = () => {
            if (buffer._parallelBgmFade !== fade) return;
            // AudioContext can be suspended while wall-clock timers keep running.
            const remaining = fade.end - WebAudio._currentTime();
            if (remaining > 0) {
                fade.timer = setTimeout(finish, Math.ceil(remaining * 1000) + 20);
            } else if (target === 0) {
                buffer.destroy();
            } else {
                removeBgmFade(buffer);
            }
        };
        if (seconds === 0) finish();
        else fade.timer = setTimeout(finish, Math.ceil(seconds * 1000) + 20);
    };

    const _WebAudio_createGainNode = WebAudio.prototype._createGainNode;
    WebAudio.prototype._createGainNode = function() {
        _WebAudio_createGainNode.apply(this, arguments);
        if (this._parallelBgmFade) scheduleBgmGain(this);
    };

    const _WebAudio_removeNodes = WebAudio.prototype._removeNodes;
    WebAudio.prototype._removeNodes = function() {
        if (this._parallelBgmFade?.node) {
            this._parallelBgmFade.node.disconnect();
            this._parallelBgmFade.node = null;
        }
        _WebAudio_removeNodes.apply(this, arguments);
    };

    const _WebAudio_destroy = WebAudio.prototype.destroy;
    WebAudio.prototype.destroy = function() {
        removeBgmFade(this);
        retiringBgm.delete(this);
        _WebAudio_destroy.apply(this, arguments);
    };

    const _WebAudio_play = WebAudio.prototype.play;
    WebAudio.prototype.play = function() {
        _WebAudio_play.apply(this, arguments);
        if (this === AudioManager._bgmBuffer) refreshMainBgmEffect();
    };

    const cancelPendingBgm = () => {
        const request = pendingBgm;
        pendingBgm = null;
        if (request) request.buffer.destroy();
    };

    const resetBgmTransition = () => {
        cancelPendingBgm();
        for (const buffer of retiringBgm.keys()) buffer.destroy();
        removeBgmFade(AudioManager._bgmBuffer);
    };

    const switchBgmBuffer = (buffer, bgm, seconds, pos, reuse = false) => {
        const manager = AudioManager;
        const oldBuffer = manager._bgmBuffer;
        if (oldBuffer) {
            if (manager._currentBgm && oldBuffer.isPlaying()) {
                retiringBgm.set(oldBuffer, { ...manager._currentBgm });
                fadeBgmBuffer(oldBuffer, 0, seconds);
            } else {
                oldBuffer.destroy();
            }
        }
        manager._bgmBuffer = buffer;
        manager.updateCurrentBgm(bgm, pos);
        manager.updateBgmParameters(bgm);
        fadeBgmBuffer(buffer, 1, seconds, reuse ? undefined : 0);
        // A returning track is still playing: keep its source nodes and seek
        // position, replacing only the outgoing gain ramp and cleanup timer.
        if (!reuse) buffer.play(true, pos);
        refreshMainBgmEffect();
    };

    const startPendingBgm = () => {
        const request = pendingBgm;
        if (!request || changingMe || AudioManager._meBuffer || !request.buffer.isReady()) return;
        pendingBgm = null;
        switchBgmBuffer(request.buffer, request.bgm, request.seconds, request.pos);
    };

    AudioManager.crossFadeBgm = function(bgm, seconds = 2, pos = 0) {
        seconds = Number(seconds);
        pos = Number(pos);
        if (!Number.isFinite(seconds) || seconds < 0 || !Number.isFinite(pos) || pos < 0) {
            throw new RangeError('crossFadeBgm: duration and position must be non-negative seconds.');
        }
        if (!bgm || typeof bgm.name !== 'string' || !bgm.name) {
            throw new TypeError('crossFadeBgm: provide a BGM object with a non-empty name.');
        }
        bgm = { name: bgm.name, volume: bgm.volume ?? 90, pitch: bgm.pitch ?? 100, pan: bgm.pan ?? 0 };
        if (this.isCurrentBgm(bgm)) {
            cancelPendingBgm();
            this.updateBgmParameters(bgm);
            this.updateCurrentBgm(bgm, this._currentBgm.pos);
            return;
        }
        if (pendingBgm?.bgm.name === bgm.name) {
            Object.assign(pendingBgm, { bgm, seconds, pos });
            return;
        }
        cancelPendingBgm();
        // An explicit position requests a fresh start; otherwise reuse a
        // compatible outgoing track without reloading or restarting playback.
        if (arguments.length < 3 && !changingMe && !this._meBuffer) {
            for (const [buffer, outgoing] of retiringBgm) {
                if (outgoing.name === bgm.name && outgoing.pitch === bgm.pitch &&
                    buffer.isReady() && buffer.isPlaying()) {
                    retiringBgm.delete(buffer);
                    switchBgmBuffer(buffer, bgm, seconds, buffer.seek(), true);
                    return;
                }
            }
        }
        const buffer = this.createBuffer('bgm/', bgm.name);
        const request = pendingBgm = { buffer, bgm, seconds, pos };
        if (buffer.isReady()) startPendingBgm();
        else buffer.addLoadListener(() => {
            if (pendingBgm === request) startPendingBgm();
        });
    };

    const _AudioManager_playBgm = AudioManager.playBgm;
    AudioManager.playBgm = function() {
        resetBgmTransition();
        _AudioManager_playBgm.apply(this, arguments);
        refreshMainBgmEffect();
    };

    const _AudioManager_stopBgm = AudioManager.stopBgm;
    AudioManager.stopBgm = function() {
        resetBgmTransition();
        _AudioManager_stopBgm.apply(this, arguments);
        refreshMainBgmEffect();
    };

    const _AudioManager_fadeOutBgm = AudioManager.fadeOutBgm;
    AudioManager.fadeOutBgm = function(seconds) {
        cancelPendingBgm();
        if (!retiringBgm.size && !this._bgmBuffer?._parallelBgmFade) {
            return _AudioManager_fadeOutBgm.apply(this, arguments);
        }
        if (this._bgmBuffer) {
            retiringBgm.set(this._bgmBuffer, { ...this._currentBgm });
            this._bgmBuffer = null;
            this._currentBgm = null;
        }
        refreshMainBgmEffect();
        for (const buffer of retiringBgm.keys()) fadeBgmBuffer(buffer, 0, Math.max(0, seconds));
    };

    const _AudioManager_bgmVolume = Object.getOwnPropertyDescriptor(AudioManager, 'bgmVolume');
    Object.defineProperty(AudioManager, 'bgmVolume', {
        get: _AudioManager_bgmVolume.get,
        set: function(value) {
            _AudioManager_bgmVolume.set.call(this, value);
            for (const [buffer, bgm] of retiringBgm) this.updateBufferParameters(buffer, value, bgm);
        },
        configurable: true
    });

    const _AudioManager_playMe = AudioManager.playMe;
    AudioManager.playMe = function(me) {
        if (me.name) resetBgmTransition();
        changingMe = true;
        try {
            _AudioManager_playMe.apply(this, arguments);
        } finally {
            changingMe = false;
        }
        startPendingBgm();
    };

    const _AudioManager_stopMe = AudioManager.stopMe;
    AudioManager.stopMe = function() {
        _AudioManager_stopMe.apply(this, arguments);
        startPendingBgm();
    };

    const _AudioManager_checkErrors = AudioManager.checkErrors;
    AudioManager.checkErrors = function() {
        _AudioManager_checkErrors.apply(this, arguments);
        if (pendingBgm?.buffer.isError()) this.throwLoadError(pendingBgm.buffer);
        for (const buffer of retiringBgm.keys()) {
            if (buffer.isError()) this.throwLoadError(buffer);
        }
    };

    //=============================================================================
    // SceneManager
    //  AudioManagerの更新処理を呼び出します。
    //=============================================================================
    const _SceneManager_updateScene = SceneManager.updateScene;
    SceneManager.updateScene      = function() {
        _SceneManager_updateScene.apply(this, arguments);
        if (this._scene) {
            AudioManager.updateBgsFade();
        }
    };
})();
