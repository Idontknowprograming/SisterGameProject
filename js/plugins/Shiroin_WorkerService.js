//=============================================================================
// Shiroin_WorkerService.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v0.1.0] 公共后台任务：单 Worker、优先队列、取消、图片合成与回退
 * @author Shiroin
 * @help
 * 放在 Shiroin_SceneGalleryA 等调用方之前。无任务时不会创建 Worker，也没有逐帧更新。
 * window.ShiroinWorkers.submit(type, data, {owner, priority}) 返回 {promise,cancel,setPriority}。
 * priority 数值越大越优先；仅调整排队任务，不抢占正在运行的同步任务。
 * cancelOwner(owner) 取消调用方任务；结果不再需要时调用 disposeResult(type,result)。
 * 内置 image.compose：{layers:[{image,x:0,y:0,scale:1,blendMode:0}]}，image 为已加载的图片或画布。
 * blendMode：0 正常、1 叠加、2 正片叠底、3 滤色，默认 0。
 * 内置 image.lockedPreview：{image,config:{blurRadius:3,minBrightness:6,maxBrightness:40,gamma:1.4}}。
 * 原图所有权仍属于调用方；返回 {image,width,height,left,top} 的 image 由接收方释放。
 * 扩展任务、回退限制及调试方法：js/plugin-docs/Shiroin_WorkerService.md。
 */
(() => {
'use strict';
if (window.ShiroinWorkers) return;
(window.Imported ||= {}).Shiroin_WorkerService = true;
const config = {idleMs: 30000, startupTimeoutMs: 5000, taskTimeoutMs: 120000, maxQueued: 64};
const types = new Map(), tasks = new Map();
let sequence = 0, version = 0, queue = [], active = null, worker = null, workerVersion = -1;
let ready = false, unavailable = false, capabilities = {}, pumpTimer = null, idleTimer = null, startupTimer = null;
const counters = {submitted: 0, completed: 0, cancelled: 0, failed: 0, workerFailures: 0};
const abortError = () => Object.assign(new Error('Background task cancelled'), {name: 'AbortError'});
const asError = value => value instanceof Error ? value : new Error(String(value || 'Background task failed'));
function clearIdle() { clearTimeout(idleTimer); idleTimer = null; }
function stopWorker() {
    clearTimeout(startupTimer); startupTimer = null;
    if (worker) { worker.onmessage = null; worker.onerror = null; worker.onmessageerror = null; worker.terminate(); }
    worker = null; ready = false; capabilities = {};
}
function schedulePump() {
    if (pumpTimer !== null) return;
    pumpTimer = setTimeout(() => { pumpTimer = null; pump(); }, 0);
}
function workerMain(handlers) {
    let current = null;
    const errorText = error => ({name: error?.name || 'Error', message: String(error?.message || error)});
    let offscreen2d = false;
    try { const probe = new OffscreenCanvas(1, 1); offscreen2d = !!probe.getContext('2d'); probe.width = 0; } catch (_) {}
    self.onmessage = async event => {
        const message = event.data;
        if (message.kind === 'cancel') { if (current?.id === message.id) current.controller.abort(); return; }
        if (message.kind !== 'run') return;
        const controller = new AbortController();
        current = {id: message.id, controller};
        const ctx = {signal: controller.signal,
            yield: () => new Promise(resolve => setTimeout(resolve, 0)),
            check() { if (controller.signal.aborted) throw Object.assign(new Error('Cancelled'), {name:'AbortError'}); }};
        let output;
        try {
            output = await handlers[message.type](message.payload, ctx);
            // Handler transfers or disposes graphics resources; even cancelled results reach main for disposal.
            self.postMessage({kind:'result', id:message.id, ok:true, result:output.result}, output.transfer || []);
        } catch (error) {
            for (const item of output?.transfer || []) item.close?.();
            self.postMessage({kind:'result', id:message.id, ok:false, error:errorText(error)});
        } finally { current = null; }
    };
    self.postMessage({kind:'ready', capabilities:{offscreen2d, imageBitmap:typeof createImageBitmap === 'function'}});
}
function failWorker(error) {
    counters.workerFailures++;
    unavailable = true;
    stopWorker();
    console.warn('[ShiroinWorkers] Worker unavailable; using registered fallback.', error);
    if (active && ['worker','prepare'].includes(active.phase)) {
        const task = active;
        clearTimeout(task.timer);
        if (task.cancelled) finish(task, null, abortError());
        else runFallback(task);
    } else schedulePump();
}
function startWorker() {
    if (worker) return;
    if (typeof Worker !== 'function' || typeof Blob !== 'function' || typeof URL?.createObjectURL !== 'function') {
        unavailable = true; return;
    }
    let url;
    try {
        const registry = [...types].map(([name, definition]) => `${JSON.stringify(name)}:(${definition.worker.toString()})`).join(',');
        url = URL.createObjectURL(new Blob([`(${workerMain.toString()})({${registry}});`], {type:'text/javascript'}));
        worker = new Worker(url);
        workerVersion = version;
        worker.onmessage = event => {
            const message = event.data;
            if (message.kind === 'ready') {
                clearTimeout(startupTimer); startupTimer = null;
                ready = true; capabilities = message.capabilities || {}; schedulePump();
            } else if (message.kind === 'result' && active?.id === message.id) {
                const task = active;
                const error = message.ok ? null : Object.assign(new Error(message.error?.message || 'Worker task failed'), {name:message.error?.name || 'Error'});
                finish(task, message.result, error);
            }
        };
        worker.onerror = event => { event.preventDefault?.(); failWorker(event.message || 'Worker error'); };
        worker.onmessageerror = () => failWorker('Worker message decoding failed');
        startupTimer = setTimeout(() => failWorker('Worker startup timed out'), config.startupTimeoutMs);
    } catch (error) { failWorker(error); }
    finally { if (url) URL.revokeObjectURL(url); }
}
function dispose(type, result) {
    if (result != null) types.get(type)?.disposeResult?.(result);
}
function finish(task, result, error) {
    if (active !== task) { dispose(task.type, result); return; }
    clearTimeout(task.timer);
    active = null;
    tasks.delete(task.id);
    if (task.cancelled) dispose(task.type, result);
    else if (error) { counters.failed++; task.reject(asError(error)); }
    else { counters.completed++; task.resolve(result); }
    task.data = null;
    // Permit a display update between completed jobs, including fallback/result application work.
    if (typeof requestAnimationFrame === 'function' && !document.hidden) requestAnimationFrame(schedulePump);
    else schedulePump();
}
async function runFallback(task) {
    clearTimeout(task.timer);
    task.phase = 'fallback';
    try {
        if (!task.definition.fallback) throw new Error(`No fallback registered for ${task.type}`);
        const context = {signal:task.controller.signal,
            yield:() => new Promise(resolve => setTimeout(resolve, 0)),
            check() { if (task.cancelled) throw abortError(); }};
        context.check();
        const result = await task.definition.fallback(task.data, context);
        finish(task, result, null);
    } catch (error) { finish(task, null, error); }
}
async function runWorker(task) {
    task.phase = 'prepare';
    task.timer = setTimeout(() => failWorker('Worker task timed out'), config.taskTimeoutMs);
    let prepared;
    try {
        prepared = task.definition.prepare ? await task.definition.prepare(task.data, {signal:task.controller.signal}) : {payload:task.data};
        if (active !== task || task.phase !== 'prepare') { prepared.dispose?.(); return; }
        if (task.cancelled) { prepared.dispose?.(); finish(task, null, abortError()); return; }
        if (!worker || !ready) { prepared.dispose?.(); runFallback(task); return; }
        task.phase = 'worker';
        worker.postMessage({kind:'run', id:task.id, type:task.type, payload:prepared.payload}, prepared.transfer || []);
        // Transfer ownership only after a successful postMessage.
        prepared = null;
    } catch (error) {
        prepared?.dispose?.();
        if (active !== task || !['prepare','worker'].includes(task.phase)) return;
        if (task.cancelled) finish(task, null, abortError());
        else {
            // Preparation/transfer failures may be platform-specific; keep original input for fallback.
            console.warn('[ShiroinWorkers] Falling back for task', task.type, error);
            runFallback(task);
        }
    }
}
function pump() {
    if (active) return;
    queue = queue.filter(task => !task.cancelled);
    if (!queue.length) {
        if (worker && idleTimer === null) idleTimer = setTimeout(() => {idleTimer = null; stopWorker();}, config.idleMs);
        return;
    }
    clearIdle();
    if (worker && workerVersion !== version) stopWorker();
    if (!worker && !unavailable) startWorker();
    if (worker && !ready) return;
    queue.sort((a,b) => b.priority - a.priority || a.id - b.id);
    const task = active = queue.shift();
    const supported = !unavailable && ready && (task.definition.requires || []).every(name => capabilities[name]);
    if (supported) runWorker(task); else runFallback(task);
}
function cancel(task) {
    if (task.cancelled || !tasks.has(task.id)) return false;
    task.cancelled = true;
    counters.cancelled++;
    task.controller.abort();
    task.reject(abortError());
    if (active !== task) { tasks.delete(task.id); queue = queue.filter(item => item !== task); task.data = null; schedulePump(); }
    else if (task.phase === 'worker') worker?.postMessage({kind:'cancel', id:task.id});
    return true;
}
const api = window.ShiroinWorkers = {
    version:'0.1.0', config,
    register(type, definition) {
        if (typeof type !== 'string' || !type || types.has(type) || typeof definition?.worker !== 'function') throw new Error('Invalid or duplicate Worker task type');
        types.set(type, Object.freeze({...definition})); version++;
    },
    submit(type, data, options = {}) {
        const definition = types.get(type);
        if (!definition) throw new Error(`Unknown Worker task: ${type}`);
        if (queue.length >= config.maxQueued) throw new Error('Worker task queue is full');
        const priority = Number.isFinite(options.priority) ? options.priority : 0;
        const task = {id:++sequence, type, definition, data, owner:options.owner, priority, controller:new AbortController(), cancelled:false, phase:'queued'};
        task.promise = new Promise((resolve,reject) => {task.resolve=resolve;task.reject=reject;});
        // Cancellation is routine; allow callers to attach their handler after submitting.
        task.promise.catch(() => {});
        tasks.set(task.id,task); queue.push(task); counters.submitted++;
        clearIdle(); schedulePump();
        return {id:task.id, promise:task.promise, cancel:() => cancel(task),
            setPriority(value) {if(Number.isFinite(value) && task.phase === 'queued') task.priority=value;}};
    },
    cancelOwner(owner) {let count=0; for(const task of tasks.values()) if(task.owner===owner && cancel(task)) count++; return count;},
    disposeResult:dispose,
    stats() {return {...counters, queued:queue.length, active:active ? {id:active.id,type:active.type,phase:active.phase} : null,
        workerAlive:!!worker, backend:unavailable?'fallback':ready?'worker':worker?'starting':'idle', capabilities:{...capabilities}};},
    resetBackend() {if(active || queue.length) return false;stopWorker();unavailable=false;return true;}
};

function compositionFrame(data) {
    if (!Array.isArray(data?.layers) || !data.layers.length) throw new Error('image.compose requires layers');
    const rects = data.layers.map(layer => {
        const x=layer.x??0, y=layer.y??0, scale=layer.scale??1;
        const width=(layer.image?.naturalWidth || layer.image?.width)*scale;
        const height=(layer.image?.naturalHeight || layer.image?.height)*scale;
        if (![x,y,scale,width,height].every(Number.isFinite) || scale<=0 || width<=0 || height<=0) throw new Error('Invalid image.compose layer');
        const blendMode=layer.blendMode??0;
        if (!Number.isInteger(blendMode) || blendMode<0 || blendMode>3) throw new Error('Invalid image.compose blendMode (expected 0-3)');
        return {x,y,width,height,compositeOperation:['source-over','lighter','multiply','screen'][blendMode]};
    });
    const left=Math.floor(Math.min(0,...rects.map(r=>r.x))), top=Math.floor(Math.min(0,...rects.map(r=>r.y)));
    const width=Math.ceil(Math.max(...rects.map(r=>r.x+r.width),0))-left;
    const height=Math.ceil(Math.max(...rects.map(r=>r.y+r.height),0))-top;
    if (!(width>0 && height>0)) throw new Error('Invalid image.compose dimensions');
    return {left,top,width,height,rects};
}
api.register('image.compose', {
    requires:['offscreen2d','imageBitmap'],
    async prepare(data, context) {
        const frame=compositionFrame(data), images=[], indexes=[], unique=new Map();
        try {
            for(const layer of data.layers) {
                if(context.signal.aborted) throw abortError();
                if(!unique.has(layer.image)) {unique.set(layer.image,images.length);images.push(await createImageBitmap(layer.image));}
                indexes.push(unique.get(layer.image));
            }
            if(context.signal.aborted) throw abortError();
            return {payload:{...frame,images,indexes}, transfer:images, dispose:()=>images.forEach(image=>image.close())};
        } catch(error) {images.forEach(image=>image.close());throw error;}
    },
    worker:async function(data, context) {
        let canvas;
        try {
            context.check();
            canvas=new OffscreenCanvas(data.width,data.height);
            const ctx=canvas.getContext('2d');
            ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
            for(let i=0;i<data.rects.length;i++) {
                context.check();
                const r=data.rects[i];
                ctx.globalCompositeOperation=r.compositeOperation;
                ctx.drawImage(data.images[data.indexes[i]],r.x-data.left,r.y-data.top,r.width,r.height);
                await context.yield();
            }
            context.check();
            const image=canvas.transferToImageBitmap();
            return {result:{image,width:data.width,height:data.height,left:data.left,top:data.top},transfer:[image]};
        } finally {for(const image of data.images)image.close();if(canvas){canvas.width=0;canvas.height=0;}}
    },
    async fallback(data, context) {
        const frame=compositionFrame(data), canvas=document.createElement('canvas');
        try {
            canvas.width=frame.width;canvas.height=frame.height;
            const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
            for(let i=0;i<frame.rects.length;i++) {
                context.check();
                const r=frame.rects[i];
                ctx.globalCompositeOperation=r.compositeOperation;
                ctx.drawImage(data.layers[i].image,r.x-frame.left,r.y-frame.top,r.width,r.height);
                await context.yield();
            }
            context.check();
            return {image:canvas,width:frame.width,height:frame.height,left:frame.left,top:frame.top};
        } catch(error) {canvas.width=0;canvas.height=0;throw error;}
    },
    disposeResult(result) {if(result.image?.close)result.image.close();else if(result.image){result.image.width=0;result.image.height=0;}}
});

// 独立函数同时用于 Worker 和主线程回退；不可引用外部闭包。
async function renderLockedPreview(data, context) {
    let canvas, channel;
    try {
        context.check();
        const width=data.image.naturalWidth || data.image.width, height=data.image.naturalHeight || data.image.height;
        if (!(width>0 && height>0)) throw new Error('Invalid locked preview dimensions');
        canvas=data.offscreen ? new OffscreenCanvas(width,height) : document.createElement('canvas');
        canvas.width=width;canvas.height=height;
        const ctx=canvas.getContext('2d',{willReadFrequently:true});
        ctx.drawImage(data.image,0,0);
        const pixels=ctx.getImageData(0,0,width,height), rgba=pixels.data;
        const gray=new Float32Array(width*height), horizontal=new Float32Array(gray.length);
        const config=data.config || {};
        const sigma=Number.isFinite(config.blurRadius)?Math.max(0,Math.min(32,config.blurRadius)):3;
        const low=Number.isFinite(config.minBrightness)?config.minBrightness:6;
        const high=Number.isFinite(config.maxBrightness)?config.maxBrightness:40;
        const gamma=Number.isFinite(config.gamma)?config.gamma:1.4;
        // 按耗时分段；MessageChannel 不累积嵌套 setTimeout 的最低延迟。
        const yieldSlice=()=>{
            if(typeof MessageChannel!=='function')return context.yield();
            channel ||= new MessageChannel();
            return new Promise(resolve=>{channel.port1.onmessage=()=>resolve();channel.port2.postMessage(null);});
        };
        const now=typeof performance!=='undefined'?()=>performance.now():()=>Date.now();
        const sliceMs=data.offscreen?16:6;
        await yieldSlice();context.check();
        let deadline=now()+sliceMs;
        const checkpoint=()=>{
            context.check();
            if(now()<deadline)return null;
            return yieldSlice().then(()=>{context.check();deadline=now()+sliceMs;});
        };
        for(let y=0;y<height;y++){
            if((y&15)===0){const pause=checkpoint();if(pause)await pause;}
            for(let x=0;x<width;x++){const p=y*width+x,i=p*4;gray[p]=(rgba[i]*0.2126+rgba[i+1]*0.7152+rgba[i+2]*0.0722)/255;}
        }
        if(sigma>3){
            // 三次滑动窗口盒式模糊逼近同方差高斯；每像素只加减窗口边界，成本不随半径线性增长。
            const ideal=Math.sqrt(4*sigma*sigma+1);
            let lower=Math.floor(ideal);if(lower%2===0)lower--;
            const smallerCount=Math.round((12*sigma*sigma-3*lower*lower-12*lower-9)/(-4*lower-4));
            const sums=new Float64Array(width);
            for(let pass=0;pass<3;pass++){
                const radius=((pass<smallerCount?lower:lower+2)-1)/2, divisor=radius*2+1;
                for(let y=0;y<height;y++){
                    if((y&15)===0){const pause=checkpoint();if(pause)await pause;}
                    const row=y*width;
                    let sum=gray[row]*(radius+1);
                    for(let k=1;k<=radius;k++)sum+=gray[row+Math.min(width-1,k)];
                    for(let x=0;x<width;x++){
                        horizontal[row+x]=sum/divisor;
                        sum+=gray[row+Math.min(width-1,x+radius+1)]-gray[row+Math.max(0,x-radius)];
                    }
                }
                for(let x=0;x<width;x++){
                    let sum=horizontal[x]*(radius+1);
                    for(let k=1;k<=radius;k++)sum+=horizontal[Math.min(height-1,k)*width+x];
                    sums[x]=sum;
                }
                for(let y=0;y<height;y++){
                    if((y&15)===0){const pause=checkpoint();if(pause)await pause;}
                    const row=y*width, entering=Math.min(height-1,y+radius+1)*width, leaving=Math.max(0,y-radius)*width;
                    for(let x=0;x<width;x++){
                        gray[row+x]=sums[x]/divisor;
                        sums[x]+=horizontal[entering+x]-horizontal[leaving+x];
                    }
                }
            }
        }else if(sigma>0){
            // 小半径保留原卷积，卡牌强度的像素结果保持一致。
            const radius=Math.ceil(sigma*3), kernel=new Float32Array(radius*2+1);
            let total=0;
            for(let k=-radius;k<=radius;k++){const v=Math.exp(-k*k/(2*sigma*sigma));kernel[k+radius]=v;total+=v;}
            for(let k=0;k<kernel.length;k++)kernel[k]/=total;
            for(let y=0;y<height;y++){
                if((y&15)===0){const pause=checkpoint();if(pause)await pause;}
                for(let x=0;x<width;x++){
                    let v=0;for(let k=-radius;k<=radius;k++)v+=gray[y*width+Math.max(0,Math.min(width-1,x+k))]*kernel[k+radius];
                    horizontal[y*width+x]=v;
                }
            }
            for(let y=0;y<height;y++){
                if((y&15)===0){const pause=checkpoint();if(pause)await pause;}
                for(let x=0;x<width;x++){
                    let v=0;for(let k=-radius;k<=radius;k++)v+=horizontal[Math.max(0,Math.min(height-1,y+k))*width+x]*kernel[k+radius];
                    gray[y*width+x]=v;
                }
            }
        }
        for(let y=0;y<height;y++){
            if((y&15)===0){const pause=checkpoint();if(pause)await pause;}
            for(let x=0;x<width;x++){
                const p=y*width+x,i=p*4,v=Math.round(low+(high-low)*Math.pow(gray[p],gamma));
                rgba[i]=rgba[i+1]=rgba[i+2]=v; // 保留原始 alpha 和完整画幅。
            }
        }
        context.check();ctx.putImageData(pixels,0,0);
        if(data.offscreen){const image=canvas.transferToImageBitmap();return {result:{image,width,height},transfer:[image]};}
        const image=canvas;canvas=null;return {result:{image,width,height}};
    } finally {
        if(channel){channel.port1.close();channel.port2.close();}
        if(data.ownsImage)data.image.close();
        if(canvas){canvas.width=0;canvas.height=0;}
    }
}
api.register('image.lockedPreview', {
    requires:['offscreen2d','imageBitmap'],
    async prepare(data, context) {
        const image=await createImageBitmap(data.image);
        if(context.signal.aborted){image.close();throw abortError();}
        return {payload:{image,config:data.config,offscreen:true,ownsImage:true},transfer:[image],dispose:()=>image.close()};
    },
    worker:renderLockedPreview,
    async fallback(data, context) {return (await renderLockedPreview({...data,offscreen:false,ownsImage:false},context)).result;},
    disposeResult(result) {if(result.image?.close)result.image.close();else if(result.image){result.image.width=0;result.image.height=0;}}
});
})();
