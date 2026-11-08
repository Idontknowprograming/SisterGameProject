//=============================================================================
// Shiroin_UnderwaterBgm.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [v1.2.0] Event-driven underwater BGM/Voice effect with an independent Voice switch.
 * @author Shiroin
 *
 * @param AutoPrepare
 * @text 启动后异步预热
 * @type boolean
 * @on 启用
 * @off 禁用
 * @desc 游戏音频系统就绪后异步生成一次卷积模板。禁用时会在首次开启效果时异步生成。
 * @default true
 *
 * @param CutoffFrequency
 * @text 水下截止频率
 * @type number
 * @min 100
 * @max 20000
 * @decimals 0
 * @desc 水下状态的低通截止频率（Hz）。越低越沉闷。
 * @default 1200
 *
 * @param FilterQ
 * @text 滤波器 Q 值
 * @type number
 * @min 0.0001
 * @max 30
 * @decimals 2
 * @desc 截止频率附近的共振强度。
 * @default 1
 *
 * @param DirectLevel
 * @text 水下直声音量
 * @type number
 * @min 0
 * @max 1
 * @decimals 2
 * @desc 未经过滤波的原始 BGM 音量。0 表示完全进入水下滤镜。
 * @default 0
 *
 * @param FilteredLevel
 * @text 水下滤波干声音量
 * @type number
 * @min 0
 * @max 2
 * @decimals 2
 * @desc 经过低通但未经过卷积的 BGM 音量。
 * @default 0.78
 *
 * @param WetLevel
 * @text 水下混响音量
 * @type number
 * @min 0
 * @max 2
 * @decimals 2
 * @desc 经过低通和卷积后的 BGM 音量。
 * @default 0.28
 *
 * @param VoiceCutoffFrequency
 * @text Voice 水下截止频率
 * @type number
 * @min 100
 * @max 20000
 * @decimals 0
 * @desc Voice 的低通截止频率（Hz）。可高于 BGM 以保留对白清晰度。
 * @default 1400
 *
 * @param VoiceDirectLevel
 * @text Voice 水下直声音量
 * @type number
 * @min 0
 * @max 1
 * @decimals 2
 * @desc Voice 未经过滤波的原声音量。
 * @default 0.08
 *
 * @param VoiceFilteredLevel
 * @text Voice 水下滤波干声音量
 * @type number
 * @min 0
 * @max 2
 * @decimals 2
 * @desc Voice 经过低通但未经过卷积的音量。
 * @default 0.82
 *
 * @param VoiceWetLevel
 * @text Voice 水下混响音量
 * @type number
 * @min 0
 * @max 2
 * @decimals 2
 * @desc Voice 经过低通和卷积后的音量。
 * @default 0.22
 *
 * @param TransitionSeconds
 * @text 切换渐变时间
 * @type number
 * @min 0
 * @max 10
 * @decimals 2
 * @desc 水下效果进入和退出的渐变时间（秒）。
 * @default 0.25
 *
 * @param ImpulseDuration
 * @text 卷积模板长度
 * @type number
 * @min 0.1
 * @max 5
 * @decimals 1
 * @desc 人工脉冲响应的长度（秒）。只在预热时生成一次。
 * @default 2
 *
 * @param ImpulseDecay
 * @text 卷积模板衰减
 * @type number
 * @min 0.01
 * @max 0.999
 * @decimals 3
 * @desc 越接近 1，混响尾音越长。
 * @default 0.8
 *
 * @command Prepare
 * @text 预热水下 BGM 效果
 * @desc 异步生成并缓存唯一的卷积模板。重复调用不会重复生成。
 *
 * @command Enable
 * @text 开启水下 BGM 效果
 * @desc BGM 平滑进入水下效果，正在播放的 Voice 立即应用效果。
 *
 * @command Disable
 * @text 关闭水下 BGM 效果
 * @desc BGM 平滑恢复，Voice 立即恢复。
 *
 * @command Refresh
 * @text 刷新当前音频连接
 * @desc 将当前 BGM 和正在播放的 Voice 接入已缓存的效果。
 *
 * @help
 * ==========================================================================
 * ■ 设计目标
 * ==========================================================================
 * 本插件不覆写 AudioManager、WebAudio 或 SceneManager 的既有函数，也不做
 * 逐帧检测。它只添加显式 API，由调用方在状态变化时按需调用。
 *
 * 卷积模板只生成一次。优先在 Worker 中生成；若运行环境不支持 Worker，
 * 则退回到分片异步生成，避免在触发效果的单帧内执行完整的大循环。
 * 低通与卷积的持续 DSP 由 Web Audio 音频线程负责。
 *
 * ==========================================================================
 * ■ 推荐脚本调用
 * ==========================================================================
 *
 * // 游戏加载完成后预热一次（AutoPrepare=true 时可以省略）
 * AudioManager.prepareUnderwaterBgmEffect?.();
 *
 * // 开启全局时停时
 * AudioManager.setUnderwaterBgmEffect?.(true);
 *
 * // 解除全局时停时
 * AudioManager.setUnderwaterBgmEffect?.(false);
 *
 * // 只开启/关闭 Voice 效果，不改变 BGM 或其他音轨的当前状态
 * AudioManager.setUnderwaterVoiceEffect(true);
 * AudioManager.setUnderwaterVoiceEffect(false);
 * // 查询 Voice 效果开关
 * AudioManager.isUnderwaterVoiceEffectEnabled();
 *
 * 原 setUnderwaterBgmEffect 仍同时设置 BGM 和 Voice，保留已有事件的联动行为。
 * 两个接口混用时，Voice 以最后一次设置为准；独立 Voice 接口不修改 BGM 开关。
 * Voice 开关作用于正在播放及后续新播放的所有 SimpleVoice 音轨。
 * 通过 playVoice({ isSE: true, ... }) 播放的声音也属于 SimpleVoice 音轨。
 *
 * // 如果在水下效果开启期间更换了 BGM，请在新 BGM 开始播放后调用
 * AudioManager.refreshUnderwaterBgmEffect?.();
 *
 * SimpleVoice.js 在创建 Voice 缓冲区后应调用：
 * AudioManager.attachUnderwaterVoiceBuffer?.(buffer);
 * Voice 是一次性音轨，不使用 BGM 的 TransitionSeconds；播放时会立即套用效果。
 *
 * setUnderwaterBgmEffect 和 setUnderwaterVoiceEffect 返回 Promise<boolean>，
 * 但普通脚本调用不需要等待。两者共用卷积缓存，不增加逐帧检测或状态轮询。
 * 如果 BGM 尚未载入完成，插件会使用 WebAudio 的加载回调进行事件驱动连接，
 * 不会通过 update 轮询。
 *
 * 本插件处理当前 BGM 和 SimpleVoice 的 Voice，不影响 BGS、ME 或普通 SE。
 */

(() => {
    "use strict";

    const pluginName = "Shiroin_UnderwaterBgm";
    const rawParams = PluginManager.parameters(pluginName);

    const numberParam = (name, fallback, min, max) => {
        const parsed = Number(rawParams[name]);
        const value = Number.isFinite(parsed) ? parsed : fallback;
        return Math.min(max, Math.max(min, value));
    };

    const params = Object.freeze({
        autoPrepare: rawParams.AutoPrepare !== "false",
        cutoffFrequency: numberParam("CutoffFrequency", 1200, 100, 20000),
        filterQ: numberParam("FilterQ", 1, 0.0001, 30),
        directLevel: numberParam("DirectLevel", 0, 0, 2),
        filteredLevel: numberParam("FilteredLevel", 0.78, 0, 2),
        wetLevel: numberParam("WetLevel", 0.28, 0, 2),
        voiceCutoffFrequency: numberParam("VoiceCutoffFrequency", 1400, 100, 20000),
        voiceDirectLevel: numberParam("VoiceDirectLevel", 0.08, 0, 2),
        voiceFilteredLevel: numberParam("VoiceFilteredLevel", 0.82, 0, 2),
        voiceWetLevel: numberParam("VoiceWetLevel", 0.22, 0, 2),
        transitionSeconds: numberParam("TransitionSeconds", 0.25, 0, 10),
        impulseDuration: numberParam("ImpulseDuration", 2, 0.1, 5),
        impulseDecay: numberParam("ImpulseDecay", 0.8, 0.01, 0.999)
    });

    const state = {
        wanted: false,
        voiceWanted: false,
        ready: false,
        context: null,
        impulse: null,
        preparePromise: null,
        graph: null,
        voiceGraphs: new Map(),
        waitingBuffer: null,
        waitingVoiceBuffers: new WeakSet()
    };

    const bgmProfile = Object.freeze({
        cutoffFrequency: params.cutoffFrequency,
        directLevel: params.directLevel,
        filteredLevel: params.filteredLevel,
        wetLevel: params.wetLevel
    });

    const voiceProfile = Object.freeze({
        cutoffFrequency: params.voiceCutoffFrequency,
        directLevel: params.voiceDirectLevel,
        filteredLevel: params.voiceFilteredLevel,
        wetLevel: params.voiceWetLevel
    });

    const audioContext = () => {
        return typeof WebAudio !== "undefined" ? WebAudio._context : null;
    };

    const randomSampleFunctionText = `
        let seed = 0x6d2b79f5;
        const randomSample = () => {
            seed ^= seed << 13;
            seed ^= seed >>> 17;
            seed ^= seed << 5;
            return ((seed >>> 0) / 4294967296) * 2 - 1;
        };
    `;

    const fillImpulseRange = (left, right, sampleRate, start, end, randomSample) => {
        for (let i = start; i < end; i++) {
            const time = i / sampleRate;
            const envelope = Math.pow(params.impulseDecay, time * 10);
            const modulation = Math.sin(time * Math.PI * 6);
            left[i] = randomSample() * envelope * modulation;
            right[i] = randomSample() * envelope * modulation;
        }
    };

    const generateImpulseInWorker = sampleRate => {
        if (
            typeof Worker === "undefined" ||
            typeof Blob === "undefined" ||
            typeof URL === "undefined" ||
            typeof URL.createObjectURL !== "function"
        ) {
            return Promise.reject(new Error("Worker is unavailable"));
        }

        const workerSource = `
            self.onmessage = event => {
                const sampleRate = event.data.sampleRate;
                const duration = event.data.duration;
                const decay = event.data.decay;
                const length = Math.max(1, Math.floor(sampleRate * duration));
                const left = new Float32Array(length);
                const right = new Float32Array(length);
                ${randomSampleFunctionText}
                for (let i = 0; i < length; i++) {
                    const time = i / sampleRate;
                    const envelope = Math.pow(decay, time * 10);
                    const modulation = Math.sin(time * Math.PI * 6);
                    left[i] = randomSample() * envelope * modulation;
                    right[i] = randomSample() * envelope * modulation;
                }
                self.postMessage(
                    { left: left.buffer, right: right.buffer },
                    [left.buffer, right.buffer]
                );
            };
        `;

        return new Promise((resolve, reject) => {
            const blobUrl = URL.createObjectURL(
                new Blob([workerSource], { type: "text/javascript" })
            );
            let worker;

            const cleanup = () => {
                if (worker) {
                    worker.terminate();
                }
                URL.revokeObjectURL(blobUrl);
            };

            try {
                worker = new Worker(blobUrl);
                worker.onmessage = event => {
                    cleanup();
                    resolve({
                        left: new Float32Array(event.data.left),
                        right: new Float32Array(event.data.right)
                    });
                };
                worker.onerror = event => {
                    cleanup();
                    reject(event.error || new Error(event.message || "Worker failed"));
                };
                worker.postMessage({
                    sampleRate,
                    duration: params.impulseDuration,
                    decay: params.impulseDecay
                });
            } catch (error) {
                cleanup();
                reject(error);
            }
        });
    };

    const generateImpulseInSlices = sampleRate => {
        const length = Math.max(1, Math.floor(sampleRate * params.impulseDuration));
        const left = new Float32Array(length);
        const right = new Float32Array(length);
        let index = 0;
        let seed = 0x6d2b79f5;

        const randomSample = () => {
            seed ^= seed << 13;
            seed ^= seed >>> 17;
            seed ^= seed << 5;
            return ((seed >>> 0) / 4294967296) * 2 - 1;
        };

        return new Promise(resolve => {
            const fillNextSlice = () => {
                const end = Math.min(length, index + 4096);
                fillImpulseRange(left, right, sampleRate, index, end, randomSample);
                index = end;
                if (index < length) {
                    setTimeout(fillNextSlice, 0);
                } else {
                    resolve({ left, right });
                }
            };
            setTimeout(fillNextSlice, 0);
        });
    };

    const createImpulseBuffer = (context, data) => {
        const length = Math.min(data.left.length, data.right.length);
        const impulse = context.createBuffer(2, length, context.sampleRate);
        if (typeof impulse.copyToChannel === "function") {
            impulse.copyToChannel(data.left.subarray(0, length), 0);
            impulse.copyToChannel(data.right.subarray(0, length), 1);
        } else {
            impulse.getChannelData(0).set(data.left.subarray(0, length));
            impulse.getChannelData(1).set(data.right.subarray(0, length));
        }
        return impulse;
    };

    const disconnectNode = (node, destination) => {
        if (!node) return;
        try {
            if (destination) {
                node.disconnect(destination);
            } else {
                node.disconnect();
            }
        } catch (_) {
            // The node may already be disconnected or destroyed.
        }
    };

    const cancelDetachTimer = graph => {
        if (graph?.detachTimer) {
            clearTimeout(graph.detachTimer);
            graph.detachTimer = 0;
        }
    };

    const disconnectEffectGraph = graph => {
        if (!graph) return;
        cancelDetachTimer(graph);

        disconnectNode(graph.panner, graph.directGain);
        disconnectNode(graph.panner, graph.lowPass);
        disconnectNode(graph.directGain);
        disconnectNode(graph.lowPass);
        disconnectNode(graph.filteredGain);
        disconnectNode(graph.convolver);
        disconnectNode(graph.wetGain);

        // Restore this WebAudio buffer's original panner -> master route.
        try {
            graph.panner.connect(graph.masterGain);
        } catch (_) {
            // The old WebAudio buffer may already have been destroyed.
        }
    };

    const detachGraphImmediately = () => {
        const graph = state.graph;
        state.graph = null;
        disconnectEffectGraph(graph);
    };

    const detachVoiceGraph = buffer => {
        const graph = state.voiceGraphs.get(buffer);
        if (!graph) return;
        state.voiceGraphs.delete(buffer);
        disconnectEffectGraph(graph);
    };

    const detachAllVoiceGraphs = () => {
        for (const buffer of Array.from(state.voiceGraphs.keys())) {
            detachVoiceGraph(buffer);
        }
    };

    const holdAndRamp = (audioParam, target, now, duration) => {
        if (duration <= 0) {
            audioParam.cancelScheduledValues(now);
            audioParam.setValueAtTime(target, now);
            return;
        }

        if (typeof audioParam.cancelAndHoldAtTime === "function") {
            audioParam.cancelAndHoldAtTime(now);
        } else {
            const current = audioParam.value;
            audioParam.cancelScheduledValues(now);
            audioParam.setValueAtTime(current, now);
        }
        audioParam.linearRampToValueAtTime(target, now + duration);
    };

    const applyGraphState = (
        graph,
        enabled,
        detach,
        duration = params.transitionSeconds
    ) => {
        if (!graph) return false;

        cancelDetachTimer(graph);
        const now = graph.context.currentTime;
        const profile = graph.profile;

        holdAndRamp(
            graph.directGain.gain,
            enabled ? profile.directLevel : 1,
            now,
            duration
        );
        holdAndRamp(
            graph.filteredGain.gain,
            enabled ? profile.filteredLevel : 0,
            now,
            duration
        );
        holdAndRamp(
            graph.wetGain.gain,
            enabled ? profile.wetLevel : 0,
            now,
            duration
        );
        holdAndRamp(
            graph.lowPass.frequency,
            enabled ? profile.cutoffFrequency : 20000,
            now,
            duration
        );

        if (!enabled) {
            if (duration <= 0) {
                detach();
                return true;
            }
            graph.detachTimer = setTimeout(() => {
                graph.detachTimer = 0;
                if (!state.wanted) {
                    detach();
                }
            }, Math.ceil(duration * 1000) + 30);
        }
        return true;
    };

    const createEffectGraph = (buffer, profile, label) => {
        const context = audioContext();
        const panner = buffer?._pannerNode;
        const masterGain = typeof WebAudio !== "undefined"
            ? WebAudio._masterGainNode
            : null;
        if (
            !context ||
            context !== state.context ||
            !buffer ||
            !panner ||
            !masterGain
        ) {
            return null;
        }

        const directGain = context.createGain();
        const lowPass = context.createBiquadFilter();
        const filteredGain = context.createGain();
        const convolver = context.createConvolver();
        const wetGain = context.createGain();
        const now = context.currentTime;
        let originalRouteDisconnected = false;

        directGain.gain.setValueAtTime(1, now);
        lowPass.type = "lowpass";
        lowPass.frequency.setValueAtTime(20000, now);
        lowPass.Q.setValueAtTime(params.filterQ, now);
        filteredGain.gain.setValueAtTime(0, now);
        convolver.buffer = state.impulse;
        wetGain.gain.setValueAtTime(0, now);

        try {
            // Remove only this buffer's original panner -> master connection.
            panner.disconnect(masterGain);
            originalRouteDisconnected = true;

            panner.connect(directGain);
            directGain.connect(masterGain);

            panner.connect(lowPass);
            lowPass.connect(filteredGain);
            filteredGain.connect(masterGain);
            lowPass.connect(convolver);
            convolver.connect(wetGain);
            wetGain.connect(masterGain);
        } catch (error) {
            disconnectNode(panner, directGain);
            disconnectNode(panner, lowPass);
            disconnectNode(directGain);
            disconnectNode(lowPass);
            disconnectNode(filteredGain);
            disconnectNode(convolver);
            disconnectNode(wetGain);
            if (originalRouteDisconnected) {
                try {
                    panner.connect(masterGain);
                } catch (_) {
                    // Preserve the original error below.
                }
            }
            console.warn(`[${pluginName}] Failed to attach ${label} effect.`, error);
            return null;
        }

        return {
            context,
            buffer,
            profile,
            panner,
            masterGain,
            directGain,
            lowPass,
            filteredGain,
            convolver,
            wetGain,
            detachTimer: 0
        };
    };

    const waitForBufferLoad = buffer => {
        if (
            state.waitingBuffer === buffer ||
            !buffer ||
            typeof buffer.addLoadListener !== "function"
        ) {
            return;
        }
        state.waitingBuffer = buffer;
        buffer.addLoadListener(() => {
            if (state.waitingBuffer === buffer) {
                state.waitingBuffer = null;
            }
            if (state.wanted && AudioManager._bgmBuffer === buffer) {
                attachCurrentBgm();
            }
        });
    };

    const attachCurrentBgm = () => {
        if (!state.ready || !state.impulse || !state.wanted) return false;

        const buffer = AudioManager._bgmBuffer;
        const panner = buffer?._pannerNode;

        if (!buffer) {
            return false;
        }
        if (!panner) {
            waitForBufferLoad(buffer);
            return false;
        }
        if (
            state.graph &&
            state.graph.buffer === buffer &&
            state.graph.panner === panner
        ) {
            cancelDetachTimer(state.graph);
            return true;
        }

        detachGraphImmediately();
        state.graph = createEffectGraph(buffer, bgmProfile, "BGM");
        if (!state.graph) return false;
        applyGraphState(state.graph, true, detachGraphImmediately);
        return true;
    };

    const waitForVoiceBufferLoad = buffer => {
        if (
            !buffer ||
            state.waitingVoiceBuffers.has(buffer) ||
            typeof buffer.addLoadListener !== "function"
        ) {
            return;
        }
        state.waitingVoiceBuffers.add(buffer);
        buffer.addLoadListener(() => {
            state.waitingVoiceBuffers.delete(buffer);
            if (state.voiceWanted && AudioManager._voiceBuffers?.includes(buffer)) {
                attachVoiceBuffer(buffer);
            }
        });
    };

    const attachVoiceBuffer = buffer => {
        if (!state.ready || !state.impulse || !state.voiceWanted || !buffer) {
            return false;
        }

        const panner = buffer._pannerNode;
        if (!panner) {
            waitForVoiceBufferLoad(buffer);
            return false;
        }

        const currentGraph = state.voiceGraphs.get(buffer);
        if (currentGraph?.panner === panner) {
            cancelDetachTimer(currentGraph);
            return true;
        }
        if (currentGraph) {
            detachVoiceGraph(buffer);
        }

        const graph = createEffectGraph(buffer, voiceProfile, "Voice");
        if (!graph) return false;
        state.voiceGraphs.set(buffer, graph);
        if (typeof buffer.addStopListener === "function") {
            buffer.addStopListener(() => detachVoiceGraph(buffer));
        }
        applyGraphState(graph, true, () => detachVoiceGraph(buffer), 0);
        return true;
    };

    const attachPlayingVoices = () => {
        const buffers = Array.isArray(AudioManager._voiceBuffers)
            ? AudioManager._voiceBuffers
            : [];
        let attached = 0;
        for (const buffer of buffers) {
            if (attachVoiceBuffer(buffer)) attached++;
        }
        return attached;
    };

    AudioManager.prepareUnderwaterBgmEffect = function() {
        const context = audioContext();
        if (!context) {
            return Promise.resolve(false);
        }
        if (state.ready && state.context === context && state.impulse) {
            return Promise.resolve(true);
        }
        if (state.preparePromise && state.context === context) {
            return state.preparePromise;
        }

        if (state.context && state.context !== context) {
            detachGraphImmediately();
            detachAllVoiceGraphs();
            state.ready = false;
            state.impulse = null;
        }
        state.context = context;

        state.preparePromise = generateImpulseInWorker(context.sampleRate)
            .catch(() => generateImpulseInSlices(context.sampleRate))
            .then(data => {
                if (state.context !== context) return false;
                state.impulse = createImpulseBuffer(context, data);
                state.ready = true;
                if (state.wanted) {
                    attachCurrentBgm();
                }
                if (state.voiceWanted) {
                    attachPlayingVoices();
                }
                return true;
            })
            .catch(error => {
                if (state.context === context) {
                    state.ready = false;
                    state.impulse = null;
                }
                console.warn(`[${pluginName}] Failed to prepare impulse response.`, error);
                return false;
            })
            .finally(() => {
                if (state.context === context) {
                    state.preparePromise = null;
                }
            });

        return state.preparePromise;
    };

    AudioManager.setUnderwaterBgmEffect = function(enabled) {
        const nextWanted = !!enabled;
        const changed = state.wanted !== nextWanted;
        state.wanted = nextWanted;
        // Legacy calls still set both tracks; the Voice-only API never writes wanted.
        const voiceReady = this.setUnderwaterVoiceEffect(nextWanted);

        if (!nextWanted) {
            state.waitingBuffer = null;
            if (changed && state.graph) {
                applyGraphState(state.graph, false, detachGraphImmediately);
            }
            return voiceReady;
        }

        return Promise.all([this.prepareUnderwaterBgmEffect(), voiceReady]).then(([ready]) => {
            if (!ready || !state.wanted) return false;
            if (
                state.graph &&
                state.graph.buffer === this._bgmBuffer &&
                state.graph.panner === this._bgmBuffer?._pannerNode
            ) {
                if (changed) {
                    applyGraphState(state.graph, true, detachGraphImmediately);
                }
            } else {
                attachCurrentBgm();
            }
            return true;
        });
    };

    AudioManager.setUnderwaterVoiceEffect = function(enabled) {
        state.voiceWanted = !!enabled;
        if (!state.voiceWanted) {
            detachAllVoiceGraphs();
            return Promise.resolve(true);
        }
        return this.prepareUnderwaterBgmEffect().then(ready => {
            if (!ready || !state.voiceWanted) return false;
            attachPlayingVoices();
            return true;
        });
    };

    AudioManager.refreshUnderwaterBgmEffect = function() {
        // Crossfades retain the old buffer: remove its filter even while the
        // effect is fading off, or when the new main BGM has already stopped.
        if (state.graph && (state.graph.buffer !== this._bgmBuffer ||
            state.graph.panner !== this._bgmBuffer?._pannerNode)) {
            detachGraphImmediately();
        }
        if (!state.wanted && !state.voiceWanted) return false;
        if (!state.ready) {
            this.prepareUnderwaterBgmEffect();
            return false;
        }
        const bgmAttached = attachCurrentBgm();
        const voicesAttached = attachPlayingVoices();
        return bgmAttached || voicesAttached > 0;
    };

    AudioManager.attachUnderwaterVoiceBuffer = function(buffer) {
        if (!state.voiceWanted || !buffer) return Promise.resolve(false);
        return this.prepareUnderwaterBgmEffect().then(ready => {
            return ready && state.voiceWanted && this._voiceBuffers.includes(buffer)
                ? attachVoiceBuffer(buffer) : false;
        });
    };

    AudioManager.refreshUnderwaterVoiceEffect = function() {
        if (!state.voiceWanted) return false;
        if (!state.ready) {
            this.prepareUnderwaterBgmEffect();
            return false;
        }
        return attachPlayingVoices() > 0;
    };

    AudioManager.isUnderwaterBgmEffectReady = function() {
        return state.ready && state.context === audioContext();
    };

    AudioManager.isUnderwaterBgmEffectEnabled = function() {
        return state.wanted;
    };

    AudioManager.isUnderwaterVoiceEffectEnabled = function() {
        return state.voiceWanted;
    };

    PluginManager.registerCommand(pluginName, "Prepare", () => {
        AudioManager.prepareUnderwaterBgmEffect();
    });

    PluginManager.registerCommand(pluginName, "Enable", () => {
        AudioManager.setUnderwaterBgmEffect(true);
    });

    PluginManager.registerCommand(pluginName, "Disable", () => {
        AudioManager.setUnderwaterBgmEffect(false);
    });

    PluginManager.registerCommand(pluginName, "Refresh", () => {
        AudioManager.refreshUnderwaterBgmEffect();
    });

    if (params.autoPrepare) {
        let remainingChecks = 200;
        const prepareWhenAudioIsReady = () => {
            if (audioContext()) {
                AudioManager.prepareUnderwaterBgmEffect();
            } else if (remainingChecks-- > 0) {
                // SceneManager creates AudioContext after window.load. This bounded,
                // low-frequency startup check is not an effect-state/update poll.
                setTimeout(prepareWhenAudioIsReady, 100);
            }
        };
        if (document.readyState === "complete") {
            setTimeout(prepareWhenAudioIsReady, 0);
        } else {
            window.addEventListener("load", prepareWhenAudioIsReady, { once: true });
        }
    }
})();
