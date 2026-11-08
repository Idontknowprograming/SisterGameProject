//=============================================================================
// rpg_custom_MZ.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v1.2] MV 自定义系统迁移（图标、低开销 FPS 监听器、行为与防御补丁）
 * @author shiroin
 *
 * @help rpg_custom_MZ.js
 * =============================================================================
 * 你的 MV 游戏的图标系统原本写在 rpg_custom.js（MV 引擎级自定义文件）里，
 * MZ 没有这个文件，所以迁移后全游戏图标丢失/错位。
 * 本插件把那套系统复刻到 MZ：
 *   - Window_Base._iconWidth / _iconHeight = 64
 *   - 全局 Window_Base.prototype.drawIcon 改用 img/system/IconSet_large.png，按 64px 切图
 *   - 消息转义符 \I[n] 的图标绘制同步适配（MZ 的 textState.drawing）
 *   - 预载 IconSet_large，减少首次打开窗口时的图标空白闪烁
 *   - 迁移 MV 的低开销 FPS 监听器；F2 隐藏后暂停采样与 DOM 刷新
 *   - 恢复 MV 的冲刺语义、错误时保留音频，以及事件/选项窗口防御补丁
 *
 * 放置位置：插件列表靠前（引擎/核心补丁之后、功能插件之前）。
 *
 * 备注：rpg_custom.js 里还有大量其它自定义（Scene_Options、Window_Message 等），
 *       若后续发现别的功能失效，可继续往这个文件里迁移。
 * =============================================================================
 */

(() => {
    // 僅判斷 cordova.plugin.http.sendRequest 支援的 protocol
    const protocols = ['http:', 'https:'];

    const hasProtocol = (url) => {
        if (url.startsWith("https://localhost")) return false;

        let protocol;
        for (protocol of protocols)
            if (url.startsWith(protocol)) return true;

        return false;
    };

    const bodyProcess = (body) =>
        (typeof body === 'object' && body !== null && !(body instanceof FormData) && !(body instanceof Blob) && !(body instanceof ArrayBuffer))
            ? JSON.stringify(body) : body;

    const createMockXHR = (response, type, status, statusText, responseHeaders, responseURL) => {
        const headerObj = responseHeaders instanceof Headers
            ? Object.fromEntries(responseHeaders)
            : (responseHeaders || {});

        return {
            response,
            status,
            statusText,
            responseURL,
            responseText: (type === 'text' || type === 'json') ? (typeof response === 'string' ? response : JSON.stringify(response)) : null,
            responseType: type,
            readyState: 4,
            headers: headerObj,
            getAllResponseHeaders: () => {
                return Object.entries(headerObj).map(([k, v]) => `${k}: ${v}`).join('\r\n');
            },
            getResponseHeader: (name) => {
                return headerObj[Object.keys(headerObj).find(k => k.toLowerCase() === name.toLowerCase())] || null;
            }
        };
    };

    /**
     * @author Canaan HS
     * @description 發送請求的自適應函數
     * @param {String} url - 請求地址
     * @param {Object} options - 設定選項
     * @returns {Promise} - 返回一個帶有 .abort() 方法的 Promise
     * @example
     * httpRequest('https://api.example.com/data', {
     *   responseType: 'json',
     *   headers: { 'Authorization': 'Bearer token' },
     *   onprogress: (xhr, e) => console.log(`下載進度: ${e.loaded}/${e.total}`),
     * }).then(data => {
     *   console.log('取得的資料:', data);
     * }).catch(err => {
     *   console.error('請求失敗:', err);
     * });
     *
     * const req = httpRequest('https://api.example.com/largefile', { responseType: 'blob' });
     * req.abort(); // 取消請求
     */

    window.httpRequest = function (url, options = {}) {
        if (!url) return Promise.reject('Invalid URL');

        let {
            headers = {},           // 請求標頭
            method = 'GET',         // 請求方法
            body = null,            // 允許發送數據 (如 POST)
            timeout = 0,            // 超時時間 0 為不設定
            reTry = 3,              // 失敗重試次數
            useFetch = true,        // 是否使用 Fetch API (不支援會自動切換成 XHR)
            usePluginHttp = true,   // 是否使用插件 HTTP (僅限移動端)
            responseType = "text",  // 期望的回應類型 json, text, blob, arraybuffer...
            progressThrottle = 100, // 進度回調的間隔
            onload, onloadstart, onreadystatechange,
            onprogress, onupprogress, onerror, ontimeout, onloadend, onabort
        } = options || {};

        let requestPromise, abortController = null;

        // ? 移動端有太多情況, 使用 xhr 比較保險
        if (useFetch && (Utils.isMobileDevice() || !window.fetch || onreadystatechange)) useFetch = false;

        requestPromise = new Promise((resolve, reject) => {

            const task = {
                _sendRequest() {
                    const pluginOptions = { method, headers, timeout, responseType };

                    if (body != null) {
                        if (body instanceof FormData) {
                            const obj = {};
                            for (const pair of body.entries()) obj[pair[0]] = pair[1];
                            pluginOptions.data = obj;
                            pluginOptions.serializer = 'multipart';
                        } else if (typeof body === 'object') {
                            pluginOptions.data = body;
                            pluginOptions.serializer = 'json';
                        } else {
                            pluginOptions.data = body;
                            pluginOptions.serializer = 'utf8';
                        }
                    }

                    if (onloadstart) onloadstart(new Event('loadstart'));

                    cordova.plugin.http.sendRequest(url, pluginOptions,
                        function (response) {
                            let data = response.data;

                            if (responseType === 'json' && typeof data === 'string') {
                                try { data = JSON.parse(data); } catch (e) { }
                            }
                            else if (responseType === 'arraybuffer') {
                                if (typeof data === 'string') {
                                    const base64String = data.replace(/^data:.*?;base64,/, '');
                                    const binaryString = atob(base64String);
                                    const bytes = new Uint8Array(binaryString.length);
                                    for (let i = 0; i < binaryString.length; i++) {
                                        bytes[i] = binaryString.charCodeAt(i);
                                    }
                                    data = bytes.buffer;
                                }
                            }

                            const mockXHR = createMockXHR(
                                data,
                                responseType,
                                response.status,
                                "OK",
                                response.headers,
                                response.url || url
                            );

                            onload?.(mockXHR);
                            onloadend?.(new Event('loadend'), mockXHR);
                            resolve(data);
                        },
                        function (response) {
                            if (method === 'GET' && reTry-- > 0) {
                                setTimeout(task._sendRequest, 2e3 / reTry);
                                return;
                            };

                            const err = new Error(response.error || 'Cordova HTTP Error');
                            const errXHR = createMockXHR(
                                response.error,
                                responseType,
                                response.status || 0,
                                response.error,
                                response.headers || {},
                                url
                            );

                            onerror?.(err, errXHR);
                            onloadend?.(new Event('loadend'), errXHR);
                            reject(err);
                        }
                    )
                },
                async _fetch() {
                    const controller = new AbortController();
                    abortController = controller;
                    const signal = controller.signal;

                    let timeoutId;
                    if (timeout > 0) {
                        timeoutId = setTimeout(() => {
                            controller.abort();
                            ontimeout?.(new Event('timeout'));
                            reject('Timeout');
                        }, timeout);
                    }

                    try {
                        onloadstart?.(new Event('loadstart'));

                        const requestOptions = { method, headers, body: bodyProcess(body), signal };
                        let response;
                        try {
                            response = await fetch(url, requestOptions);
                        } catch (err) {
                            if (timeoutId) clearTimeout(timeoutId);
                            if (err.name !== 'AbortError' && !signal.aborted && method === 'GET' && reTry-- > 0) {
                                setTimeout(task._fetch, 2e3 / Math.max(reTry, 1));
                                return;
                            }
                            throw err;
                        }

                        if (timeoutId) clearTimeout(timeoutId);

                        if (!response.ok) {
                            if (method === 'GET' && reTry-- > 0) {
                                setTimeout(task._fetch, 2e3 / Math.max(reTry, 1));
                                return;
                            };

                            const errObj = {
                                status: response.status,
                                statusText: response.statusText,
                                response
                            };

                            onerror?.(errObj);
                            onloadend?.(new Event('loadend'));
                            return reject(errObj);
                        }

                        let result;
                        if (onprogress && response.body) {
                            const reader = response.body.getReader();
                            const contentLength = +response.headers.get('Content-Length') || 0;
                            const lengthComputable = contentLength > 0;
                            let receivedLength = 0;
                            let chunks = [];
                            let lastProgressTime = 0;

                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;
                                chunks.push(value);
                                receivedLength += value.length;

                                const now = Date.now();
                                if (now - lastProgressTime >= progressThrottle) {
                                    lastProgressTime = now;
                                    onprogress({
                                        loaded: receivedLength,
                                        total: contentLength,
                                        lengthComputable
                                    })
                                }
                            }

                            const chunksAll = new Uint8Array(receivedLength);
                            let position = 0;
                            for (let chunk of chunks) {
                                chunksAll.set(chunk, position);
                                position += chunk.length;
                            }

                            if (responseType === 'json') {
                                result = JSON.parse(new TextDecoder("utf-8").decode(chunksAll));
                            } else if (responseType === 'text') {
                                result = new TextDecoder("utf-8").decode(chunksAll);
                            } else if (responseType === 'blob') {
                                result = new Blob([chunksAll]);
                            } else if (responseType === 'arraybuffer') {
                                result = chunksAll.buffer;
                            } else {
                                result = new TextDecoder("utf-8").decode(chunksAll);
                            }
                        } else {
                            result = await {
                                'json': async () => await response.json(),
                                'text': async () => await response.text(),
                                'blob': async () => await response.blob(),
                                'arraybuffer': async () => await response.arrayBuffer()
                            }[responseType]();
                        }

                        const mockXHR = createMockXHR(
                            result,
                            responseType,
                            response.status,
                            response.statusText,
                            response.headers,
                            response.url
                        );

                        onload?.(mockXHR);
                        onloadend?.(new Event('loadend'), mockXHR);
                        resolve(result);
                    } catch (err) {
                        err.name === 'AbortError'
                            ? onabort?.(new Event('abort'))
                            : onerror?.(err);

                        onloadend?.(new Event('loadend'));
                        reject(err);
                    }
                },
                _xhr() {
                    const xhr = new XMLHttpRequest();
                    abortController = xhr;

                    xhr.open(method, url);
                    xhr.responseType = responseType;
                    if (timeout > 0) xhr.timeout = timeout;

                    for (const [key, value] of Object.entries(headers)) {
                        xhr.setRequestHeader(key, value);
                    }

                    if (onloadstart) xhr.onloadstart = onloadstart;
                    if (onprogress || onupprogress) {
                        const progress = onprogress
                            ? [xhr.onprogress, onprogress]
                            : [xhr.upload.onprogress, onupprogress];

                        let lastTime = 0;
                        progress[0] = e => {
                            const now = Date.now();
                            if (now - lastTime >= progressThrottle) {
                                lastTime = now;
                                progress[1](e, xhr);
                            }
                        }
                    }

                    if (onabort) xhr.onabort = onabort;
                    if (ontimeout) xhr.ontimeout = ontimeout;
                    if (onloadend) xhr.onloadend = onloadend;
                    if (onreadystatechange) xhr.onreadystatechange = onreadystatechange;

                    xhr.onload = () => {
                        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 0) {
                            onload?.(xhr);
                            resolve(xhr.response);
                            return;
                        }

                        if (method === 'GET' && reTry-- > 0) {
                            setTimeout(task._xhr, 2e3 / Math.max(reTry, 1));
                            return;
                        }

                        onerror?.(xhr);
                        reject({ status: xhr.status, statusText: xhr.statusText, xhr });
                    };

                    xhr.onerror = () => {
                        if (method === 'GET' && reTry-- > 0) {
                            setTimeout(task._xhr, 2e3 / Math.max(reTry, 1));
                            return;
                        }

                        onerror?.(xhr);
                        reject({ status: xhr.status, statusText: xhr.statusText, xhr });
                    };

                    try {
                        xhr.send(bodyProcess(body));
                    } catch (err) {
                        reject(err);
                    }
                }
            };

            if (
                Utils.isMobileDevice() && usePluginHttp && hasProtocol(url) && window?.cordova?.plugin?.http
            ) task._sendRequest();
            else if (useFetch) task._fetch();
            else task._xhr();
        });

        requestPromise.abort = () => {
            if (abortController) {
                if (
                    abortController instanceof XMLHttpRequest
                    || abortController instanceof AbortController
                ) {
                    abortController.abort();
                } else {
                    console.warn('Abort not supported');
                }
            }
        };

        return requestPromise;
    };
})();

(function(){
"use strict";

//=============================================================================
// ** ImageManager - 尽力完成的后台图片预加载（读取、解码、GPU预热）
//
//      用法：ImageManager.preloadPicturesToGpu(["folder/name1", "name2"])
//      返回：Promise<Bitmap[]>，表示本次尝试结束，不保证全部上传成功。
//
//      显示不等待预热。图片与视频共用一条有期限的GPU上传队列，相邻上传
//      至少间隔2个游戏帧。图片读取仍使用ImageManager缓存，并发预热会去重。
//      超时只放弃本次后台尝试，不取消读取、不销毁正常显示需要的Bitmap。
//=============================================================================
// 下划线前缀表示内部API。使用定时任务在渲染回调之外上传，不依赖rAF或
// PIXI Prepare回调。实际WebGL上传仍在主线程执行，分帧只能分担这部分开销。
ImageManager._enqueueGpuWarmup = (() => {
    const TASK_TIMEOUT_MS = 3000; // 包含排队和执行等待；过期任务不会再启动。
    const CHECK_INTERVAL_MS = 16;
    const queue = [];
    let active = null;
    let wakeTimer = null;
    let lastSubmitFrame = null;

    const schedule = () => {
        if (wakeTimer === null && !active && queue.length) {
            wakeTimer = setTimeout(pump, CHECK_INTERVAL_MS);
        }
    };

    const finish = (job, result) => {
        if (job.done) return;
        job.done = true;
        clearTimeout(job.timer);
        job.task = null;
        if (active === job) {
            active = null;
        } else {
            const index = queue.indexOf(job);
            if (index >= 0) queue.splice(index, 1);
        }
        job.resolve(result);
        job.resolve = null;
        if (!queue.length && wakeTimer !== null) {
            clearTimeout(wakeTimer);
            wakeTimer = null;
        }
        schedule();
    };

    const pump = () => {
        wakeTimer = null;
        if (active || !queue.length) return;
        const frame = Number(Graphics.frameCount) || 0;
        // 兼容帧计数重置；帧停止时由每个任务的独立期限结束等待。
        if (lastSubmitFrame !== null && frame < lastSubmitFrame) lastSubmitFrame = null;
        if (lastSubmitFrame !== null && frame - lastSubmitFrame < 2) {
            schedule();
            return;
        }
        const job = queue.shift();
        if (Date.now() >= job.deadline) {
            finish(job, false);
            return;
        }
        active = job;
        lastSubmitFrame = frame;
        // 同步抛错、异步拒绝都在这里降级。永不结束的Promise由期限移出队列，
        // 迟到的完成回调不能影响新的active任务，也不再持有待上传函数。
        Promise.resolve().then(() => {
            if (job.done || Date.now() >= job.deadline) return false;
            const task = job.task;
            job.task = null;
            return task();
        }).then(result => finish(job, result), error => {
            if (job.done) return;
            console.warn("ImageManager: GPU预热失败，跳过本次任务", error);
            finish(job, false);
        });
    };

    return task => {
        let job;
        const promise = new Promise(resolve => {
            job = { task, resolve, done: false, deadline: Date.now() + TASK_TIMEOUT_MS };
            job.timer = setTimeout(() => finish(job, false), TASK_TIMEOUT_MS);
            queue.push(job);
            schedule();
        });
        // 资源被正式显示接管或释放时，立即撤销未完成任务及其计时器。
        // 保持 Promise 返回值兼容；迟到的完成回调仍由 job.done 隔离。
        promise.cancel = () => finish(job, false);
        return promise;
    };
})();

ImageManager.preloadPicturesToGpu = (() => {
    const BITMAP_WAIT_TIMEOUT_MS = 5000;
    const BITMAP_CHECK_INTERVAL_MS = 50;
    const pendingPreloads = new WeakMap();

    // 不注册只在成功时触发的永久load listener；读取失败或一直未就绪都会结束。
    // 迟到的读取仍可正常进入ImageManager缓存，后续显示/预热可以继续使用。
    const waitForBitmap = bitmap => new Promise(resolve => {
        const deadline = Date.now() + BITMAP_WAIT_TIMEOUT_MS;
        const check = () => {
            try {
                if (Date.now() >= deadline || bitmap.isError()) {
                    resolve(false);
                } else if (bitmap.isReady()) {
                    resolve(true);
                } else {
                    setTimeout(check, BITMAP_CHECK_INTERVAL_MS);
                }
            } catch (error) {
                console.warn("ImageManager.preloadPicturesToGpu: 读取检查失败", error);
                resolve(false);
            }
        };
        check();
    });

    const uploadBitmap = bitmap => {
        const renderer = Graphics.app?.renderer;
        const baseTexture = bitmap?.baseTexture;
        // 排队期间可能被销毁、重试加载，或者丢失WebGL上下文；临执行再检查。
        if (!bitmap.isReady() || bitmap.isError() || !baseTexture || baseTexture.destroyed ||
            !renderer?.texture?.bind || renderer.context?.isLost) {
            return false;
        }
        // 与正式渲染使用相同BaseTexture；不创建/销毁包装纹理，也不等待Prepare。
        // 此调用的异常会由共享队列捕获，失败不会挡住后续资源。
        renderer.texture.bind(baseTexture, 0);
        return true;
    };

    const preloadBitmap = bitmap => {
        if (!bitmap) return Promise.resolve(bitmap);
        const pending = pendingPreloads.get(bitmap);
        if (pending) return pending;

        const task = waitForBitmap(bitmap).then(ready => {
            if (ready) return ImageManager._enqueueGpuWarmup(() => uploadBitmap(bitmap));
        }).catch(error => {
            console.warn("ImageManager.preloadPicturesToGpu: 预热失败", bitmap.url, error);
        }).then(() => bitmap);
        pendingPreloads.set(bitmap, task);
        task.then(() => {
            if (pendingPreloads.get(bitmap) === task) {
                pendingPreloads.delete(bitmap);
            }
        });
        return task;
    };

    return function(names) {
        const uniqueNames = [...new Set((names || []).filter(Boolean))];
        const bitmaps = uniqueNames.map(name => this.loadPicture(name));
        return Promise.all(bitmaps.map(preloadBitmap));
    };
})();

//=============================================================================
// ** 图标尺寸（对应 rpg_custom.js: Object.assign(Window_Base,{_iconWidth:64,_iconHeight:64})）
//=============================================================================
Window_Base._iconWidth = 64;
Window_Base._iconHeight = 64;

//=============================================================================
// ** 全局 drawIcon —— 改用 IconSet_large，按 64px 切图
//=============================================================================
Window_Base.prototype.drawIcon = function( iconIndex, x, y ){
	var bitmap = ImageManager.loadSystem('IconSet_large');
	var pw = Window_Base._iconWidth;
	var ph = Window_Base._iconHeight;
	// IconSet_large 体积大（1.8MB），未加载完时挂一次回调重绘，避免画空
	if( !bitmap.isReady() ){
		if( !this._rpgCustom_iconReloadHooked ){
			this._rpgCustom_iconReloadHooked = true;
			bitmap.addLoadListener(function(){
				this._rpgCustom_iconReloadHooked = false;
				if( this.contents && typeof this.refresh === 'function' ){ this.refresh(); }
			}.bind(this));
		}
		return;
	}
	var sx = ( iconIndex % 16 ) * pw;
	var sy = Math.floor( iconIndex / 16 ) * ph;
	this.contents.blt( bitmap, sx, sy, pw, ph, x, y );
};

//=============================================================================
// ** 消息转义符 \I[n] 的图标（对应 rpg_custom.js: processDrawIcon）
//			MZ 的 textState 有 drawing 标记（测量阶段为 false，绘制阶段为 true）。
//=============================================================================
Window_Base.prototype.processDrawIcon = function( iconIndex, textState ){
	if( textState.drawing ){
		this.drawIcon( iconIndex, textState.x + 2, textState.y + 2 );
	}
	textState.x += Window_Base._iconWidth + 4;
};

//=============================================================================
// ** 低开销 FPS 监听器（从 MV rpg_core.js 的自定义 FPSCounter 迁移）
//			MZ 原版在面板隐藏后仍会每帧取 performance.now()，并每 15 帧写一次 DOM。
//			这里保留 F2 的 FPS → ms → 隐藏循环；隐藏时完全暂停采样与 DOM 写入。
//=============================================================================
if( Graphics.FPSCounter && !Graphics.FPSCounter.prototype._rpgCustomPausePatch ){
	const fpsCounterProto = Graphics.FPSCounter.prototype;
	const _rpgCustom_FPSCounter_initialize = fpsCounterProto.initialize;
	const _rpgCustom_FPSCounter_startTick = fpsCounterProto.startTick;
	const _rpgCustom_FPSCounter_endTick = fpsCounterProto.endTick;
	const _rpgCustom_FPSCounter_update = fpsCounterProto._update;

	fpsCounterProto._rpgCustomPausePatch = true;

	fpsCounterProto.initialize = function(){
		// _createElements() 会把面板设为 display:none；从第一帧起就保持休眠。
		this.pauseDetection = true;
		_rpgCustom_FPSCounter_initialize.apply( this, arguments );
	};

	fpsCounterProto.startTick = function(){
		if( this.pauseDetection ){ return; }
		_rpgCustom_FPSCounter_startTick.apply( this, arguments );
	};

	fpsCounterProto.endTick = function(){
		if( this.pauseDetection ){ return; }
		_rpgCustom_FPSCounter_endTick.apply( this, arguments );
	};

	fpsCounterProto.switchMode = function(){
		const wasHidden = this._boxDiv.style.display === "none";
		if( wasHidden ){
			this._boxDiv.style.display = "block";
			this._showFps = true;
			this.pauseDetection = false;

			// 丢弃隐藏期间的时间差，否则重开后第一帧会被误算为超长帧。
			const now = performance.now();
			this._frameStart = now;
			this._lastLoop = now;
			this._tickCount = 0;
			this._update();
		}else if( this._showFps ){
			this._showFps = false;
			this.pauseDetection = false;
			this._update();
		}else{
			this._boxDiv.style.display = "none";
			this.pauseDetection = true;
		}
	};

	fpsCounterProto._update = function(){
		// 双重门控可防止其它插件在隐藏状态下直接调用 _update()。
		if( this.pauseDetection || this._boxDiv.style.display === "none" ){ return; }
		_rpgCustom_FPSCounter_update.apply( this, arguments );
	};
}

//=============================================================================
// ** 修改检测与测试模式切换（从 MV rpg_custom.js 迁移）
//			原版在本插件加载时立即保存 SceneManager.pop；MZ 项目里云存档等正常插件会在
//			后面包装该方法，因此改为 window.load 后锁定最终插件链，避免正常插件被误报。
//=============================================================================
if( typeof window.switchTestMode !== "function" ){
	window.switchTestMode = function(){
		const url = new URL( location.href );
		const options = url.search.slice( 1 ).split( "&" ).filter( Boolean );
		const index = options.indexOf( "test" );
		if( index >= 0 ){
			options.splice( index, 1 );
		}else{
			options.push( "test" );
		}
		url.search = options.join( "&" );
		history.replaceState( null, "", url.href );
		console.log( "TestMode:", Utils.isOptionValid( "test" ) );
	};
}

let rpgCustomSceneManagerPopBaseline = null;
let rpgCustomSceneManagerPopBaselineReady = false;
const lockSceneManagerPopBaseline = function(){
	rpgCustomSceneManagerPopBaseline = SceneManager.pop;
	rpgCustomSceneManagerPopBaselineReady = true;
};
if( document.readyState === "complete" ){
	lockSceneManagerPopBaseline();
}else{
	window.addEventListener( "load", lockSceneManagerPopBaseline, { once: true } );
}

const checkModifyDescriptor = Object.getOwnPropertyDescriptor( window, "checkModify" );
if( !checkModifyDescriptor || checkModifyDescriptor.configurable ){
	Object.defineProperty( window, "checkModify", {
		configurable: false,
		get(){
			return !Utils.isOptionValid( "test" ) &&
				rpgCustomSceneManagerPopBaselineReady &&
				rpgCustomSceneManagerPopBaseline !== SceneManager.pop;
		}
	} );
}

//=============================================================================
// ** 错误打印与上报系统（从 rpg_custom.js 迁移）
//			rpg_custom.js 把原始 Graphics.printError 备份为 backupPrintError，
//			并让引擎报错经由它打印，便于 TS_Command_Error_Backtrace 等增强插件去 wrap。
//			MZ 没有 backupPrintError，故此处：① 备份原始 printError；
//			② 把 printError 路由到 backupPrintError，使增强插件的 wrap 能生效。
//
//			错误页生成与服务器上报分离：_makeErrorHtml 只生成 HTML，
//			printError 统一触发异步上报。上报失败不得影响原始报错流程。
//=============================================================================
const RPG_CUSTOM_ERROR_REPORT_COOLDOWN = 30_000;
let rpgCustomLastErrorReportAt = -Infinity;

function _rpgCustom_errorDetails( name, message, error ){
	const cause = error?.error ?? error?.reason ??
		(typeof message === "object" ? message : error);
	const rawMessage = typeof message === "string"
		? message
		: String(message?.message ?? cause?.message ?? message ?? "");
	const rawStack = cause?.stack ?? error?.stack ??
		(error?.filename ? `${error.filename}:${error.lineno || 0}:${error.colno || 0}` : "");
	const rawName = (!name || name === "Error") && cause?.name
		? cause.name
		: name ?? "UnknownError";

	return {
		name: String(rawName),
		message: rawMessage,
		stack: String(rawStack)
	};
}

function _rpgCustom_reportError( name, message, error ){
	if( Utils.isOptionValid("test") || window.checkModify ||
		ConfigManager.disableNetwork || !navigator.onLine || !appScript ){
		return;
	}

	const details = _rpgCustom_errorDetails( name, message, error );
	if( !details.message && !details.stack ){ return; }

	const now = performance.now();
	if( now - rpgCustomLastErrorReportAt < RPG_CUSTOM_ERROR_REPORT_COOLDOWN ){ return; }
	rpgCustomLastErrorReportAt = now;

	const fullError = [details.message, details.stack].filter(Boolean).join("\n");
	const stack = fullError.length > 2000
		? `${fullError.slice(0, 2000)}\n...[truncated]`
		: fullError;
	const mapId = $gameMap?.mapId() ?? "Unknown";
	const versionId = $dataSystem?.gameRevision ?? $dataSystem?.versionId ?? "Unknown";
	const payload = {
		version: _rpgCustom_getVersion(),
		errorType: [
			details.name,
			`mapId: ${mapId}`,
			`language: ${ConfigManager.language ?? "unknown"}`,
			`isMobile: ${Utils.isMobileDevice()}`,
			`versionId: ${versionId}`
		].join("\n"),
		stack
	};

	httpRequest(appScript, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: payload,
		reTry: 0
	}).catch(uploadError => {
		console.warn("[rpg_custom_MZ] Error report upload failed:", uploadError);
	});
}

if( Graphics.backupPrintError === undefined ){
	Graphics.backupPrintError = Graphics.printError;	// 备份原始打印
	Graphics.printError = function( name, message, error ){
		try {
			_rpgCustom_reportError( name, message, error );
		} catch( reportError ){
			console.warn("[rpg_custom_MZ] Error report preparation failed:", reportError);
		}
		// 引擎报错统一经由 backupPrintError → 被增强插件 wrap 后生效
		return Graphics.backupPrintError.apply( this, arguments );
	};
}

//=============================================================================
// ** 错误页内容 —— _makeErrorHtml（从 rpg_custom.js 迁移）
//			MZ 默认的 _makeErrorHtml 只显示 错误名+消息，不显示版本号和完整堆栈。
//			这里复刻 rpg_custom.js 的渲染：错误名 + 版本号 + 消息 + 完整 JS 堆栈，
//			使 MZ 报错页与 MV 一致。服务器上报由 printError 的统一入口处理。
//=============================================================================
//==============================
// * 版本号解析（对应 rpg_custom.js 的 getVersion，带缓存）
//==============================
let _rpgCustom_versionCache = null;
function _rpgCustom_getVersion(){
	if( _rpgCustom_versionCache !== null ){ return _rpgCustom_versionCache; }
	const title = $dataSystem?.gameTitle || document.title;
	const ver = title.match(/ver\s*([A-Za-z0-9._-]+)/i)?.[1] ?? "";
	const suffix = Utils.isMobileDevice() ? " (Android)" : "";
	_rpgCustom_versionCache = `Current Version: ${ver}${suffix}`;
	return _rpgCustom_versionCache;
}
//==============================
// * 错误页 HTML（错误名 + 版本号 + 消息 + 完整堆栈）
//==============================
Graphics._makeErrorHtml = function( name, message, error ){
	const details = _rpgCustom_errorDetails( name, message, error );
	// _createErrorPrinter 初始化时会无参调用，此时不显示空错误面板。
	if( !name && !details.message && !details.stack ){ return ""; }
	return `
		<h1 style="color: yellow;">${Utils.escapeHtml(details.name)}</h1>
		<h1 style="color: white; margin: 8px 0;">${Utils.escapeHtml(_rpgCustom_getVersion())}</h1>
		<pre style="color: white; white-space: pre-wrap; word-break: break-word;">${Utils.escapeHtml(details.message)}\n\n${Utils.escapeHtml(details.stack)}</pre>
	`;
};

//=============================================================================
// ** 禁用未使用的 Scene_Item（保留地图 Window_EventItem 和 Scene_StandaloneItem）
//=============================================================================
// push 必须在压栈前拦截；只拦 goto 会留下多余返回记录。仅匹配原生类本身。
for( const method of [ "push", "goto" ] ){
	const original = SceneManager[method];
	SceneManager[method] = function( sceneClass ){
		if( sceneClass === Scene_Item ){ return; }
		return original.apply( this, arguments );
	};
}

//=============================================================================
// ** SceneManager 错误入口（MZ 原生分派结构适配）
//			保留 MZ 对普通错误、资源加载错误和未知错误的分类与重试按钮，
//			只恢复 MV 的策略：停止游戏循环并显示错误，但不强制停止当前音频。
//=============================================================================
SceneManager.onError = function( event ){
	const message = event?.message ?? event?.reason?.message ?? String( event?.reason ?? "" );
	console.error( message );
	if( event?.filename ){
		console.error( event.filename, event.lineno );
	}
	try {
		this.stop();
		Graphics.printError( "Error", message, event );
	} catch( error ){
		console.error( error );
	}
};

SceneManager.catchNormalError = function( error ){
	Graphics.printError( error.name, error.message, error );
	console.error( error.stack );
};

SceneManager.catchLoadError = function( error ){
	const url = error[1];
	const retry = error[2];
	Graphics.printError( "Failed to load", url, error );
	if( retry ){
		Graphics.showRetryButton( function(){
			retry();
			SceneManager.resume();
		} );
	}
};

SceneManager.catchUnknownError = function( error ){
	Graphics.printError( "UnknownError", String( error ), error );
};

//=============================================================================
// ** rpg_objects.js 移植 —— 游戏逻辑自定义（从 rpg_custom.js 迁移，ES6）
//=============================================================================

Game_CharacterBase.prototype.realMoveSpeed = function( ){
    return this._moveSpeed + (this.isDashing() ? 12 : 0);
};

Game_CharacterBase.prototype.distancePerFrame = function(){
    return Math.max(0, this.realMoveSpeed()) / 256;
};

Game_CharacterBase.prototype.animationWait = function () {
    // 新的速度范围是1到64，我们要找到一个新的基准值
    const baseSpeed = 64; // 最大速度
    const speed = this.realMoveSpeed();
    const maxWait = 24; // 原来的最慢速度对应的等待时间
    const minWait = 3; // 原来的最快速度对应的等待时间

    // 由于速度范围变化，我们需要重新计算等待时间的范围
    // 我们假设等待时间与速度成反比
    // 当速度最小时，等待时间最大；速度最大时，等待时间最小
    const waitTime = ((baseSpeed - speed) / (baseSpeed - 1)) * (maxWait - minWait) + minWait;

    return waitTime;
};

Game_Player.prototype.realMoveSpeed = function( ){
    const dashingSpeed = Math.max(this._moveSpeed, 16);
    const SpeedRatio = $gameParty.leader().eva;
    let realSpeed = (this._moveSpeed + (this.isDashing() ? dashingSpeed : 0)) * SpeedRatio;
    realSpeed = Math.max(0, Math.round(realSpeed));
    return realSpeed;
};

// 冲刺是本游戏的显式移动状态：不接受 MZ 默认 Shift 反转，推物体时也必须停用。
Game_Player.prototype.updateDashing = function(){
	if( this.isMoving() ){ return; }
	if( !this._isPushing && this.canMove() && !this.isInVehicle() &&
		!$gameMap.isDashDisabled() ){
		this._dashing = ConfigManager.alwaysDash || $gameTemp.isDestinationValid();
	}else{
		this._dashing = false;
	}
};

// 子弹/动作序列插件可能绕过引擎前置检查，在事件没有有效页时直接读取 list。
Object.assign( Game_Event.prototype, {
	page(){
		return this._pageIndex >= 0 ? this.event().pages[this._pageIndex] : null;
	},
	list(){
		return this.page()?.list ?? null;
	}
} );

// 状态附加：移除"当前回合不允许重复附加同一状态"的限制
Game_Battler.prototype.isStateAddable = function( stateId ){
	return ( this.isAlive() && $dataStates[ stateId ] &&
		!this.isStateResist( stateId ) &&
		!this.isStateRestrict( stateId ) );
};

// Game_Actor：自定义携带上限/贯通等属性 + 脱装/步数状态逻辑
const _rpgCustom_Actor_initMembers = Game_Actor.prototype.initMembers;
Object.assign( Game_Actor.prototype, {
	initMembers(){
		_rpgCustom_Actor_initMembers.call( this );
		this.initCustomMembers();
	},
	// 新追加的自定义属性（之前 YEP 装备界面 "3/NaN" 即因 _weaponAmountLimit 未定义）
	initCustomMembers(){
		this._weaponAmountLimit ??= 10;	// 武器携带上限
		this._armorAmountLimit  ??= 20;	// 装备携带上限
		this._weaponAmountBonus ??= 0;	// 额外武器携带上限
		this._armorAmountBonus  ??= 20;	// 额外装备携带上限
		this._defPenetration    ??= 0;	// 物理防御贯通百分比
		this._defPenCount       ??= 0;	// 物理防御贯通次数
		this._defeatRecord      ??= [];	// 死亡报告
	},
	// 脱下装备：武器换成 $dataWeapons[4]，防具置空
	discardEquip( item ){
		const slotId = this.equips().indexOf( item );
		if( slotId >= 0 ){
			if( DataManager.isWeapon( item ) ){
				this.changeEquip( slotId, $dataWeapons[4] );
			}else if( DataManager.isArmor( item ) ){
				this.changeEquip( slotId, null );
			}
		}
	},
	// 步行刷新状态（MV 行为：不调用 MZ 的 turnEndOnMap，改用步数制状态回合）
	onPlayerWalk(){
		this.clearResult();
		this.checkFloorEffect();
		if( $gamePlayer.isNormal() ){
			this.states().forEach( function( state ){
				this.updateStateSteps( state );
			}, this );
			this.showAddedStates();
			this.showRemovedStates();
		}
	},
	stepsForTurn(){
		return 1000;
	}
});

Game_Party.prototype.maxItems = function(/*item*/) {
    return 999;
};

// 自定义 game over 判定：1号角色被1号状态影响时即视为全灭
Game_Unit.prototype.isAllDead = function(){
	return $gameActors.actor(1).isStateAffected(1);
};

// Game_Map.setup：保留 MZ 原逻辑，追加"随地图切换重置"的临时变量
const _rpgCustom_Map_setup = Game_Map.prototype.setup;
Game_Map.prototype.setup = function( mapId ){
	_rpgCustom_Map_setup.call( this, mapId );
	this.chahuiMapTemp = {};	// 随地图切换而重置的临时数据
};

Game_Map.prototype.checkPlayerIsPassable = function( ){
    const x = Math.floor($gamePlayer.centerRealX());
    const y = Math.floor($gamePlayer.centerRealY());

    return this.isPassable(x, y, 2) || // 下
           this.isPassable(x, y, 4) || // 左
           this.isPassable(x, y, 6) || // 右
           this.isPassable(x, y, 8);   // 上
};

Game_Map.prototype.tileId = function(x, y, z) {
    const width = $dataMap.width;
    const height = $dataMap.height;
    const ix = Math.round(x);
    const iy = Math.round(y);    
    return $dataMap.data[(z * height + iy) * width + ix] || 0;
};

Game_Map.prototype.resetMapeventSequence = function( mapId ){
    // 出于防范，重置玩家Z轴高度	
    $gamePlayer.mppHidPasZ = 0;
    // 出于防范，重置玩家举物状态
    $gamePlayer.drill_PT_clearLifting();
    // 出于防范，恢复玩家鼠标操作权限
    $gameSystem._drill_COI_map_mouse = true;
    // 出于防范，重置玩家行走图和移动权限
    $gamePlayer.drill_EASA_setEnabled(true);
    $gameSystem._drill_PAlM_enabled = true;

    // 非特定情况，淡出当前地图bgm
    if (!$gameSwitches.value(40)) {
        AudioManager.fadeOutBgm(2);
    }
    $gameSwitches.setValue(40, false);

    // 淡出可能存在的篝火音效
    if (AudioManager._allBgsBuffer?.[12]) {
        AudioManager._allBgsBuffer[12].fadeOut(1);
    }
    // 清除旋风斩音效
    if (AudioManager._allBgsBuffer?.[9]) {
        AudioManager.stopBgsByLine(9);
    }

    // 重置事件开关
    this._events.forEach(event => {
        const note = event?.event()?.note;
        if (note?.includes('<重置独立开关>') || note?.includes('<resetSelfSwitch>')) {
            const eventId = event.eventId();
            $gameSelfSwitches.setValue([this._mapId, eventId, 'A'], false);
            $gameSelfSwitches.setValue([this._mapId, eventId, 'B'], false);
            $gameSelfSwitches.setValue([this._mapId, eventId, 'C'], false);
            $gameSelfSwitches.setValue([this._mapId, eventId, 'D'], false);
        }
    });

    // 清除图片资源
    const maxPictures = 90;
    for (let pictureId = 3; pictureId <= maxPictures; pictureId++) {
        let picture = $gameScreen.picture(pictureId);
        if (picture) {
            picture.drill_PCE_stopEffect();
            $gameScreen.erasePicture(pictureId);
        }
    }

    // 清除图片点击判定
    $gameScreen._pictureCidArray = [];
    $gameScreen._pictureSidArray = [];
    $gameScreen._picturePidArray = [];
    $gameScreen._pictureTransparentArray = [];
};
//=============================================================================
// ** rpg_scenes.js 移植（从 rpg_custom.js 迁移，ES6）
//			Scene_Map.terminate 保留 MZ 原生清理，再追加 resetMapeventSequence；
//			不照搬 MV 已移除的 ImageManager.clearRequest。
//=============================================================================


// 强制允许游戏处于运行状态，防意外卡死
SceneManager.isGameActive = function() {
    return true;
};

// 标题：开始新游戏时播放音效"風鈴の音"
const _rpgCustom_Scene_Title_commandNewGame = Scene_Title.prototype.commandNewGame;
Scene_Title.prototype.commandNewGame = function(){
	AudioManager.playSe({ name: '風鈴の音', volume: 90, pitch: 100, pan: 0 });
	_rpgCustom_Scene_Title_commandNewGame.call( this );
};

// 标题更新：追加"命令窗口已初始化"标记（防自动更新窗口在开始/读档瞬间弹出）
Scene_Title.prototype.update = function(){
	if( !this.isBusy() ){
		this._commandWindow.open();
	}
	if( this._commandWindow && this._commandWindow.isOpenAndActive() ){
		this._commandWindowInitialized = true;
	}
	Scene_Base.prototype.update.call( this );
};

// 地图：屏蔽长按加速（快进）
Scene_Map.prototype.updateMainMultiply = function(){
	this.updateMain();
};

// 地图：自定义忙碌判定（有道具窗时不计消息关闭动画）
Scene_Map.prototype.isBusy = function(){
	if( this._itemWindow ){
		return this._waitCount > 0 || this._encounterEffectDuration > 0 ||
			Scene_Base.prototype.isBusy.call( this );
	}
	return ( ( this._messageWindow && this._messageWindow.isClosing() ) ||
		this._waitCount > 0 || this._encounterEffectDuration > 0 ||
		Scene_Base.prototype.isBusy.call( this ) );
};

// 地图：取消鼠标右键打开菜单
Scene_Map.prototype.updateCallMenu = function(){
	if( this.isMenuEnabled() ){
		if( this.menuCalling && !$gamePlayer.isMoving() ){
			this.callMenu();
		}
	}else{
		this.menuCalling = false;
	}
};

const _rpgCustom_Scene_Map_terminate = Scene_Map.prototype.terminate;
Scene_Map.prototype.terminate = function(){
   _rpgCustom_Scene_Map_terminate.call(this);
    if (SceneManager.isNextScene(Scene_Map)) {
        // 重置演出事件
        $gameMap.resetMapeventSequence();
    }   
};

// 选项：选项窗口透明度设为0（沿用 MZ 原 rect 创建，仅追加透明）
const _rpgCustom_Scene_Options_createOptionsWindow = Scene_Options.prototype.createOptionsWindow;
Scene_Options.prototype.createOptionsWindow = function(){
	_rpgCustom_Scene_Options_createOptionsWindow.call( this );
	const win = this._optionsWindow;
	win.opacity = 0;
	// MZ 的 Scene_Options.maxCommands() 统计不全(只到 8，实际选项更多)，导致窗口高度按 8 行算、
	//   装不下而出现滚动条。这里按窗口真实选项数(maxItems)重算高度，一次显示完所有选项并重新垂直居中。
	const wh = win.fittingHeight( win.maxItems() );
	if( win.height !== wh ){
		win.height = wh;
		win.y = Math.round( ( Graphics.boxHeight - wh ) / 2 );
		win.createContents();		// innerHeight 变了，需重建 contents 位图，否则下半截被裁
		win.refresh();
	}
};

// MV→MZ：MV 里窗口宽度由 Window_Options.windowWidth() 决定；MZ 改为由场景的
//   optionsWindowRect()（原生写死 ww=400）决定，并通过 initialize(rect) 传入，
//   所以 windowWidth() 在 MZ 是死代码。这里改场景 rect 才能真正加宽（英语等小语种用 640）。
const _rpgCustom_Scene_Options_optionsWindowRect = Scene_Options.prototype.optionsWindowRect;
Scene_Options.prototype.optionsWindowRect = function(){
	const rect = _rpgCustom_Scene_Options_optionsWindowRect.call( this );
	//   标题钉左、数值钉右：窗口越宽，标题与数值之间的空隙越大。加宽以贴近 MV 版的间距。
	const ww = ( ConfigManager.language > 1 ) ? 600 : 520;
	rect.x = Math.round( ( Graphics.boxWidth - ww ) / 2 );
	rect.width = ww;
	return rect;
};

//=============================================================================
// ** rpg_windows.js 移植（从 rpg_custom.js 迁移，ES6）
//			Window_Options.windowWidth 在 MZ 不调用，宽度改由 Scene_Options.optionsWindowRect 控制；
//			Window_Message.updateWait 与 Window_Options.drawItem 已按 MZ API 在本文件实现；
//			大型 DOM 对话框系统已拆分到 rpg_custom_Dialog_MZ.js。
//=============================================================================

// 竖排文字绘制
Window_Base.prototype.drawVerticalText = function( text, x, y ){
	const lineHeight = this.contents.fontSize;
	const characters = text.split('');
	for( let i = 0; i < characters.length; i++ ){
		this.drawText( characters[i], x, y + i * lineHeight );
	}
};

// 技能列表：不因不可用而降低技能名/图标透明度
Window_SkillList.prototype.drawItem = function( index ){
	const skill = this._data[ index ];
	if( skill ){
		const costWidth = this.costWidth();
		const rect = this.itemRect( index );
		rect.width -= this.textPadding();
		this.drawItemName( skill, rect.x, rect.y, rect.width - costWidth );
		this.drawSkillCost( skill, rect.x, rect.y, rect.width );
		this.changePaintOpacity( 1 );
	}
};

// 选项窗口：隐藏"始终冲刺/记住指令"，音量只保留 BGM/BGS/SE
Object.assign( Window_Options.prototype, {
	addGeneralOptions(){ /* 隐藏 alwaysDash / commandRemember */ },
	addVolumeOptions(){
		this.addCommand( TextManager.bgmVolume, 'bgmVolume' );
		this.addCommand( TextManager.bgsVolume, 'bgsVolume' );
		this.addCommand( TextManager.seVolume, 'seVolume' );
	},
    // 注意：windowWidth() 在 MZ 不再被调用，窗口宽度已移到 Scene_Options.optionsWindowRect 处理。
    // 行高：MZ 原生 itemHeight≈lineHeight(36) 太挤，MV 版行距更宽。加大行高以复刻 MV 间距。
    //   (窗口高度用 fittingHeight(maxItems) 算，会自动跟随这里的 itemHeight 变高并重新居中。)
    itemHeight() {
        return 72;
    },
    // 仅用于给标题在右侧让出空间（titleWidth = rect.width - statusWidth[- GAP]）。
    //   数值本身改用整行宽度右对齐渲染、不受此值限制，所以这里回到 MV 的 120：
    //   原先撑到 240 会从长中文标题那边多抢 120px，导致「玩家讯息最大显示数量」等被压缩。
    statusWidth() {
        return 120;
    },
    drawItem(index) {
        const title = this.commandName(index);
        const status = this.statusText(index);
        const rect = this.itemLineRect(index);
        const statusWidth = this.statusWidth();
        const GAP = 100;
        let titleWidth = rect.width - statusWidth - GAP;
        if (ConfigManager.language <= 1) titleWidth += GAP;
        // 行高大于文字行高，把文字在行内垂直居中，避免贴顶
        const ty = rect.y + Math.floor( ( rect.height - this.lineHeight() ) / 2 );
        this.resetTextColor();
        this.changePaintOpacity(this.isCommandEnabled(index));
        this.drawText(title, rect.x, ty, titleWidth, "left");
        // 数值用整行宽度右对齐渲染（复刻 MV）：长数值如「Simplified Chinese」不会被压；
        //   长标题行的数值都很短(OFF/ON/数字)，长数值行的标题又很短，二者不会同时变长、不会重叠。
        this.drawText(status, rect.x, ty, rect.width, "right");
    },
    volumeOffset() {
        return 5;
    }
});

// 选择支：select 时重置 _eventRan 标记
// 初始化早期 _contentsSprite 尚未创建，必须先检查内部精灵，不能读取 contents getter。
const _rpgCustom_Window_ChoiceList_textWidthEx = Window_ChoiceList.prototype.textWidthEx;
Window_ChoiceList.prototype.textWidthEx = function( text ){
	if( !this._contentsSprite || !this._contentsSprite.bitmap ){ return 0; }
	return _rpgCustom_Window_ChoiceList_textWidthEx.call( this, text );
};

Window_ChoiceList.prototype.select = function( index ){
	Window_Command.prototype.select.call( this, index );
	this._eventRan = false;
};

// 帮助窗口：道具/技能描述文本不取原生 description 字段，改用自定义生成方法
//   MV 原版同时重写了 initialize（固定 0,0,width,fittingHeight(4)）——MZ 不照搬：
//   Window_Help 在 MZ 由各场景的 helpWindowRect 传 Rectangle 定尺寸定位，覆写 initialize 会破坏布局。
//   这里只接管 setItem（描述文本来源），尺寸交还 MZ 原生 rect 体系。
Window_Help.prototype.setItem = function( item ){
	if( item ){
		const combinedText = DataManager.isSkill( item )
			? QJ.MPMZ.tl.ex_playerSetSkillDescription( item )
			: (DataManager.isWeapon(item) || DataManager.isArmor(item))
				? QJ.MPMZ.tl.ex_playerSetEquipmentDescription(item)
				: QJ.MPMZ.tl.ex_playerSetItemDescription( item );
		this.setText( combinedText );   // setText 内部已在文本变化时自动 refresh
	}else{
		this.setText( "" );
	}
};

// 标题命令：始终允许"继续游戏"
Window_TitleCommand.prototype.isContinueEnabled = function(){
	return true;
};

// MV→MZ：MZ 新增了"物品背景"——Window_Selectable.drawItemBackground 会给每个格子画一个
//   半透明圆角矩形(itemBackColor)，MV 没有。本游戏各界面都有自己的背景面板，这个框多余且影响观感，
//   全局置空隐藏掉（物品栏/装备栏/技能栏等所有可选择窗口一并生效）。
Window_Selectable.prototype.drawItemBackground = function(){ /* 隐藏半透明矩形框 */ };

//=============================================================================
// ** 预载 IconSet_large（减少首次空白）
//=============================================================================
// MZ 在 onDatabaseLoaded 内设置资源加密信息；必须在原函数完成后再预载，
// 否则加密部署会先请求并缓存不存在的 IconSet_large.png。
var _rpgCustom_Scene_Boot_onDatabaseLoaded = Scene_Boot.prototype.onDatabaseLoaded;
Scene_Boot.prototype.onDatabaseLoaded = function(){
	_rpgCustom_Scene_Boot_onDatabaseLoaded.call( this );
	ImageManager.loadSystem('IconSet_large');
};


//=============================================================================
// ** 自动存档就是1，手动存档位20个
//=============================================================================
DataManager.maxSavefiles = function() {
    return 21;
};

//=============================================================================
// ** 安卓适配补丁
//    存档读写改走 Android 的 JavascriptInterface（AndroidSave）。
//    【守卫】只在安卓 WebView（window.AndroidSave 存在）时覆盖：
//      桌面 NW.js 是本地模式、用 filePath 写文件，若把 filePath 改成无目录会写坏桌面存档
//      和 MV→MZ 转换功能，所以桌面必须保持引擎默认（整段跳过）。
//=============================================================================
if( window.AndroidSave ){
    StorageManager.saveToForage = function( saveName, zip ){
        return new Promise( function( resolve, reject ){
            try {
                AndroidSave.saveGame( String( StorageManager.filePath( saveName ) ), zip );
                resolve();
            } catch( e ){ reject( e ); }
        });
    };
    StorageManager.loadFromForage = function( saveName ){
        return new Promise( function( resolve, reject ){
            try {
                var data = AndroidSave.loadSave( String( StorageManager.filePath( saveName ) ) );
                if( data ){ resolve( data ); }
                else { reject( new Error( "Savefile not found" ) ); }
            } catch( e ){ reject( e ); }
        });
    };
    StorageManager.forageExists = function( saveName ){
        return AndroidSave.SaveExists( String( StorageManager.filePath( saveName ) ) );
    };
    StorageManager.removeForage = function( saveName ){
        AndroidSave.removeSave( String( StorageManager.filePath( saveName ) ) );
    };
    // 安卓侧自管目录，filePath 只给文件名（无目录前缀）
    StorageManager.filePath = function( saveName ){
        return saveName + ".rmmzsave";
    };

    // 画面缩放修正：
    //   MZ 核心的 Graphics._stretchHeight 在「移动端 + 非 file: 协议」时把高度 ×0.9
    //   （为手机浏览器的地址栏/系统手势区留白）。Cordova WebView 协议是 https://localhost
    //   → Utils.isLocal() 为 false → 误触发这个 0.9，凭空缩小画面、四周露出 body 黑底。
    //   原生外壳没有地址栏，这里强制满高（rate=1.0），消除多余黑边。
    if( typeof Graphics !== "undefined" ){
        Graphics._stretchHeight = function(){
            return Utils.isMobileDevice()
                ? document.documentElement.clientHeight
                : window.innerHeight;
        };
    }
}

// 内存监控：Java 每秒回调 window.onMemoryUpdate，把内存信息写进 #memory-usage 元素。
//   设为全局以便 Java 按名调用；没有该 DOM 元素（如桌面）时直接返回，安全无副作用。
window.onMemoryUpdate = function( data ){
    var memoryDisplay = document.getElementById( "memory-usage" );
    if( !memoryDisplay ){ return; }
    var isRu = String( navigator.language || navigator.userLanguage || "" ).startsWith( "ru" );
    var labelImpact = isRu ? "Приложение: " : "App Impact: ";
    var labelFree   = isRu ? " Свободно: "  : " Free: ";
    memoryDisplay.innerHTML = labelImpact + data.appImpact + "MB |" + labelFree + data.avail + "/" + data.total + "MB";
    memoryDisplay.style.color = data.lowMemory ? "red" : "";
};
if( window.AndroidSave && window.AndroidSave.startMemoryMonitor ){
    AndroidSave.startMemoryMonitor( "onMemoryUpdate" );
}

//=============================================================================
// ** Window_Message —— 鼠标长按/单击加速等待帧（迁移自 MV rpg_custom.js）
//			· 长按(TouchInput.isPressed)：等待帧 2×速度倒计时
//			· 单击(TouchInput.isTriggered)：把剩余等待降到 5 帧（近似跳过）
//			本函数替换 vanilla updateWait，成为 COWC/MessageWindowHidden 包裹链的末端。
//			\w 等待帧本身仍被尊重（MZ 的 shouldBreakHere 原生处理；此处只加速、不清零）。
//=============================================================================
if( typeof Window_Message !== "undefined" ){
	Window_Message.prototype.updateWait = function(){
		if( this._waitCount > 0 ){
			if( TouchInput.isTriggered() ){ this._waitCount = 5; }
			this._waitCount -= TouchInput.isPressed() ? 2 : 1;
			return true;
		}
		return false;
	};
}

//=============================================================================
// ** ERUDA 移动端调试控制台（★按需加载：默认完全不注入/不 init → 零后台开销）
//			原版一启动就 init+hide，导致面板关着也常驻跑 console/网络/DOM 监控(profile 里 ~4-7%)。
//			现改为默认不加载；需要时再调出：
//			  ① 控制台/事件脚本调用 window.openEruda()（用完 window.closeEruda()）
//			  ② 移动端：屏幕左上角 60×60 区域内 2 秒连点 5 下（纯被动监听，不影响游戏触摸）
//=============================================================================
(function(){
	var ERUDA_PATH = "js/eruda.js";
	if( window.openEruda ){ return; }             // 防重复定义
	var loading = false;

	// 隔离 eruda 面板输入事件，避免穿透到下方游戏画面
	function setupErudaIsolation(){
		var events = ["touchstart","touchmove","touchend","mousedown","mousemove","mouseup","click"];
		var tries = 0;
		(function waitContainer(){
			var el = document.getElementById("eruda");
			if( !el ){
				if( tries++ > 50 ){ return; }     // 最多等约 5 秒
				return void setTimeout( waitContainer, 100 );
			}
			events.forEach(function( name ){
				el.addEventListener( name, function(e){ e.stopPropagation(); }, false );
			});
		})();
	}

	// 按需加载 + 初始化 eruda（幂等）。不调用就完全不加载，无任何开销。
	window.openEruda = function(){
		if( window.eruda ){ try { window.eruda.show(); } catch(e){} return; }
		if( loading ){ return; }
		loading = true;
		var prefix = window.universalUrl || "";   // MZ 未定义时取空串 → 相对路径
		var script = document.createElement("script");
		script.src = prefix + ERUDA_PATH;
		script.onload = function(){
			try {
				if( window.eruda ){
					window.eruda.init();
					window.eruda.show();
					setupErudaIsolation();
					console.log("[OK] eruda loaded on demand");
				}
			} catch( e ){ console.warn("[WARN] eruda init failed:", e ); }
		};
		script.onerror = function(){ loading = false; console.warn("[WARN] eruda load failed:", script.src ); };
		document.head.appendChild( script );
	};
	window.closeEruda = function(){ if( window.eruda ){ try { window.eruda.hide(); } catch(e){} } };

	// 调出方式：游戏内"秘籍:控制台"公共事件里调用 window.openEruda()。
	//   （默认不加载、不 init，零后台开销；调用后才加载并显示。）
})();

//=============================================================================
// willReadFrequently：已移除补丁，恢复引擎原生 getPixel/getAlphaPixel。
//   教训(2026-06-29)：那条 Chrome "willReadFrequently" 警告是 cosmetic；曾试
//   尺寸门控/惰性换canvas/CPU镜像三方案均不值——镜像方案对大位图每帧整张回拷，
//   安卓 getImageData 反飙到 46.8%。→ 像素读取保持原生，真凶见下方 textColor 缓存。
//=============================================================================

//=============================================================================
// ColorManager.textColor 缓存：消除每帧海量 windowskin getPixel 回读。
//   病灶：Hendrix_Hotbar_Creator 的 Sprite_SkillSlot 每帧 refreshQuantity/
//   refreshManaCost → applyFontSettings → ColorManager.normalColor()/textColor(n)
//   → windowskin.getPixel → getImageData。N 个槽 ×2 ×60fps = 每秒上千次 GPU→CPU
//   回读，安卓实测占 getImageData 的绝大部分(46.8%)。textColor(n) 对固定
//   windowskin 是纯函数 → 缓存成查表；换皮肤或皮肤未就绪时不缓存。
//   载于 Drill_CoreOfColor 之前，故包裹的是原版(n≤100 走 windowskin 的那条贵路径)；
//   Drill 的自定义色(n>100)是 config 取值、不回读，绕过缓存也无妨。
//=============================================================================
(() => {
"use strict";
if (typeof ColorManager === "undefined" || typeof ColorManager.textColor !== "function") { return; }
if (ColorManager._shiroinTextColorCached) { return; }
ColorManager._shiroinTextColorCached = true;

const _textColor = ColorManager.textColor;
let cache = new Map();
let cachedSkin = null;

ColorManager.textColor = function(n) {
    const skin = this._windowskin;
    // 皮肤未加载好时不缓存(避免把错误色固化)，直接走原版
    if (!skin || (skin.isReady && !skin.isReady())) {
        return _textColor.call(this, n);
    }
    if (skin !== cachedSkin) { cache.clear(); cachedSkin = skin; } // 换皮肤 → 清缓存
    let c = cache.get(n);
    if (c === undefined) {
        c = _textColor.call(this, n);
        cache.set(n, c);
    }
    return c;
};

})();

})();
