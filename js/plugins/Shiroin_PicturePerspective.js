/*:
 * @target MZ
 * @plugindesc [测试版 0.3] 地图内按需启用的四角透视，支持中心缩放。
 * @author Shiroin
 * @help
 * 放在 MoviePicture 和图片效果插件之后。
 * 仅提供脚本调用，不提供插件指令。
 * F8 控制台：PicturePerspective.edit(10)
 * 拖动四角，或编辑坐标；点击“导出脚本”，复制到事件脚本。
 * PicturePerspective.set(10, [[0,0],[640,0],[640,360],[0,360]])
 * PicturePerspective.clear(10)  // 恢复普通矩形
 * PicturePerspective.close()    // 关闭定位工具，保留透视
 *
 * 四点顺序：左上、右上、右下、左下，必须组成不交叉的凸四边形。
 * 四角定义固定的目标屏幕。先在原图坐标系中移动/缩放/旋转，再透视。
 * 左上原点+(0,0) 或 中心原点+(原图宽/2,原图高/2)，100%时填满四角。
 * 1920x1080视频可使用中心原点+(960,540)，movePicture缩放会在电视内收拢。
 * 编辑器标记始终表示完整目标屏幕，不跟随开关机缩放。换尺寸时同步中心坐标。
 * 配置绑定当前地图的图片槽位并跟随存档；同地图换图/擦除后重显仍复用。
 * set/edit 首次使用时才临时包装 Sprite_Picture；离开地图场景自动撤销。
 * 菜单返回/读档恢复同地图配置；传送到其他地图自动清空。
 * 槽位改作其他用途时请 clear。关闭编辑器不会自动修改地图事件文件。
 * 未启用时不包装图片的更新/绘制/边界/销毁方法，没有逐帧透视检查。
 * 生命周期检查只在地图设置、场景创建/结束、清屏和读档时执行。
 * 本插件仅复用原纹理，不创建视频、不持有视频资源所有权。
 * 测试版未适配图片点击命中区域或特殊多精灵交叉淡化效果。
 */
(() => {
    'use strict';
    const vertex = `
        precision highp float;
        attribute vec2 aVertexPosition;
        attribute vec3 aProjectiveUV;
        uniform mat3 translationMatrix;
        uniform mat3 projectionMatrix;
        varying vec3 vProjectiveUV;
        void main() {
            vProjectiveUV = aProjectiveUV;
            gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
        }`;
    const fragment = `
        precision highp float;
        varying vec3 vProjectiveUV;
        uniform sampler2D uSampler;
        uniform vec2 uUvOrigin;
        uniform vec2 uUvX;
        uniform vec2 uUvY;
        uniform float uAlpha;
        void main() {
            vec2 uv = vProjectiveUV.xy / vProjectiveUV.z;
            gl_FragColor = texture2D(uSampler, uUvOrigin + uv.x * uUvX + uv.y * uUvY) * uAlpha;
        }`;

    function validate(points) {
        if (!Array.isArray(points) || points.length !== 4 || points.some(p =>
            !Array.isArray(p) || p.length !== 2 || p.some(v => !Number.isFinite(v)))) {
            throw new Error('需要四组有限数字坐标：[[x,y],[x,y],[x,y],[x,y]]');
        }
        let sign = 0;
        for (let i = 0; i < 4; i++) {
            const a = points[i], b = points[(i + 1) % 4], c = points[(i + 2) % 4];
            const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
            if (Math.abs(cross) < 0.01 || (sign && Math.sign(cross) !== sign)) {
                throw new Error('四角不能交叉、凹陷或重合，请保持凸四边形。');
            }
            sign = Math.sign(cross);
        }
        return points.map(p => p.slice());
    }

    // Unit square -> fixed target screen. Source animation is composed with
    // this homography BEFORE projection, never applied to the finished quad.
    function homography(p) {
        const dx1 = p[1][0] - p[2][0], dx2 = p[3][0] - p[2][0];
        const dy1 = p[1][1] - p[2][1], dy2 = p[3][1] - p[2][1];
        const sx = p[0][0] - p[1][0] + p[2][0] - p[3][0];
        const sy = p[0][1] - p[1][1] + p[2][1] - p[3][1];
        const det = dx1 * dy2 - dx2 * dy1;
        const g = (sx * dy2 - dx2 * sy) / det;
        const h = (dx1 * sy - sx * dy1) / det;
        return [p[1][0] * (1 + g) - p[0][0], p[3][0] * (1 + h) - p[0][0], p[0][0],
            p[1][1] * (1 + g) - p[0][1], p[3][1] * (1 + h) - p[0][1], p[0][1], g, h];
    }
    function projectiveUV(p) {
        const m = homography(p), g = m[6], h = m[7];
        const q = [1, 1 / (1 + g), 1 / (1 + g + h), 1 / (1 + h)];
        if (q.some(v => !Number.isFinite(v) || v <= 0)) throw new Error('透视角度无效。');
        return new Float32Array([0, 0, q[0], q[1], 0, q[1], q[2], q[2], q[2], 0, q[3], q[3]]);
    }

    function sourceTexture(texture) {
        let source = texture;
        while (source?.baseTexture instanceof PIXI.Texture) source = source.baseTexture;
        return source;
    }
    function isDrawable(texture) {
        const base = sourceTexture(texture)?.baseTexture;
        return !!(base?.valid && !base.destroyed && texture.frame?.width > 0 && texture.frame?.height > 0);
    }
    function pictureZoomCompensation() {
        // Installed Drill_CoreOfPicture divides picture position AND scale
        // by screen zoom. Undo that in source space, then reapply it to the
        // projected quad. The picture container's own transform stays intact.
        return window.Imported?.Drill_CoreOfPicture ? $gameScreen.zoomScale() : 1;
    }
    const unitCorners = [[0, 0], [1, 0], [1, 1], [0, 1]];

    class PerspectiveMesh extends PIXI.Mesh {
        constructor(points) {
            const geometry = new PIXI.Geometry()
                .addAttribute('aVertexPosition', new Float32Array(points.flat()), 2)
                .addAttribute('aProjectiveUV', projectiveUV(points), 3)
                .addIndex([0, 1, 2, 0, 2, 3]);
            const shader = PIXI.Shader.from(vertex, fragment, {
                uSampler: PIXI.Texture.EMPTY, uAlpha: 1,
                uUvOrigin: new Float32Array(2),
                uUvX: new Float32Array([1, 0]), uUvY: new Float32Array([0, 1])
            });
            super(geometry, shader);
            this._ppSource = null;
            this._ppTextureVersion = -1;
            this._ppGeometryUpdates = 0;
            this.setPoints(points);
        }
        setPoints(points) {
            this._ppHomography = homography(points);
            this._ppLocalID = -1;
        }
        updateTransform() {
            // Only this mesh bypasses its owner's transform, which is already
            // incorporated into its projected vertices. Do not invert the
            // owner's matrix: powerOff legitimately reaches zero scale.
            const owner = this.parent;
            if (!owner?.parent) return;
            this._boundsID++;
            this.transform.updateTransform(owner.parent.transform);
            this.worldAlpha = this.alpha * owner.worldAlpha;
            this.syncGeometry();
        }
        syncGeometry() {
            const owner = this.parent;
            if (!owner) return;
            const w = owner.texture?.orig?.width, h = owner.texture?.orig?.height;
            if (!(w > 0 && h > 0)) { this.renderable = false; return; }
            owner.transform.updateLocalTransform();
            const transform = owner.transform, ax = owner.anchor.x, ay = owner.anchor.y;
            const zoom = pictureZoomCompensation();
            if (this._ppLocalID === transform._localID && this._ppWidth === w && this._ppHeight === h &&
                this._ppAnchorX === ax && this._ppAnchorY === ay && this._ppZoom === zoom) return;
            this._ppLocalID = transform._localID;
            this._ppWidth = w; this._ppHeight = h;
            this._ppAnchorX = ax; this._ppAnchorY = ay; this._ppZoom = zoom;
            const t = transform.localTransform, m = this._ppHomography;
            const vb = this.geometry.getBuffer('aVertexPosition'), qb = this.geometry.getBuffer('aProjectiveUV');
            const vertices = vb.data, uvq = qb.data;
            let sign = 0, valid = true;
            for (let i = 0; i < 4; i++) {
                const u = unitCorners[i][0], v = unitCorners[i][1];
                const x = (u - ax) * w, y = (v - ay) * h;
                const a = (t.a * x + t.c * y + t.tx) * zoom / w;
                const b = (t.b * x + t.d * y + t.ty) * zoom / h;
                const denominator = m[6] * a + m[7] * b + 1;
                const currentSign = Math.sign(denominator);
                if (!Number.isFinite(denominator) || Math.abs(denominator) < 1e-6 ||
                    (sign && currentSign !== sign)) { valid = false; break; }
                sign = currentSign;
                const q = 1 / denominator;
                vertices[i * 2] = (m[0] * a + m[1] * b + m[2]) * q / zoom;
                vertices[i * 2 + 1] = (m[3] * a + m[4] * b + m[5]) * q / zoom;
                uvq[i * 3] = u * q;
                uvq[i * 3 + 1] = v * q;
                uvq[i * 3 + 2] = q;
            }
            // A source transform crossing the perspective horizon has no
            // finite quad. Zero bounds as well so filters cannot allocate an
            // enormous render target. Collapsing to a line/point IS valid.
            if (!valid) { vertices.fill(0); uvq.fill(0); }
            this.renderable = valid;
            vb.update(); qb.update();
            this._ppGeometryUpdates++;
        }
        syncTexture(texture) {
            // This checkout's Bitmap_Video stores Texture.from(video) in its
            // _baseTexture field. Sprite._refresh therefore nests a Texture
            // inside texture.baseTexture. The shader must bind the innermost
            // Texture, whose baseTexture is a real PIXI.BaseTexture.
            const sampler = sourceTexture(texture);
            this.visible = isDrawable(texture);
            if (!this.visible) return;
            this.shader.uniforms.uSampler = sampler;
            const base = sampler.baseTexture;
            if (texture === this._ppSource && texture._updateID === this._ppTextureVersion &&
                base.width === this._ppBaseWidth && base.height === this._ppBaseHeight) return;
            this._ppSource = texture;
            this._ppTextureVersion = texture._updateID;
            this._ppBaseWidth = base.width;
            this._ppBaseHeight = base.height;
            // MZ swaps baseTexture directly. Its outer Texture.valid/_uvs can
            // still describe the empty placeholder during asynchronous loads.
            // Pictures have unrotated frames, so derive UVs from actual pixels.
            const f = texture.frame, u = this.shader.uniforms;
            u.uUvOrigin.set([f.x / base.width, f.y / base.height]);
            u.uUvX.set([f.width / base.width, 0]);
            u.uUvY.set([0, f.height / base.height]);
        }
        _render(renderer) {
            // MoviePicture commits asynchronously after update(), and may
            // destroy the old video's resource before this draw takes place.
            this.syncTexture(this.parent?.texture);
            if (!this.visible) return;
            this.syncGeometry();
            if (!this.renderable) return;
            this.shader.uniforms.uAlpha = this.worldAlpha;
            super._render(renderer);
        }
        destroy(options) {
            const shader = this.shader;
            // Mesh never owns the Sprite_Picture texture (especially video).
            this._ppSource = null;
            super.destroy(options);
            shader.destroy();
        }
    }

    function key(id) {
        id = Number(id);
        if (!Number.isInteger(id) || id < 1 || !$gameScreen || id > $gameScreen.maxPictures()) {
            throw new Error('图片编号无效，或游戏尚未开始。');
        }
        return $gameScreen.realPictureId(id);
    }
    function config(id) {
        return $gameScreen?._picturePerspective?.[key(id)];
    }
    function findSprite(id) {
        const container = SceneManager._scene?._spriteset?._pictureContainer;
        return container?.children.find(s => s instanceof Sprite_Picture && s._pictureId === Number(id));
    }
    function release(sprite) {
        if (sprite._ppMesh) {
            sprite.removeChild(sprite._ppMesh);
            sprite._ppMesh.destroy();
            sprite._ppMesh = null;
        }
        sprite._ppConfig = null;
        meshOwners.delete(sprite);
    }
    // No Sprite_Picture prototype changes at plugin load. These four hooks
    // exist only while a configured map is active, and capture the latest
    // implementation (including other plugins) each time they are installed.
    let runtime = null;
    const meshOwners = new Set();
    function hasConfiguration() {
        return !!$gameScreen?._picturePerspective && Object.keys($gameScreen._picturePerspective).length > 0;
    }
    function resetConfiguration() {
        if ($gameScreen) {
            $gameScreen._picturePerspective = {};
            $gameScreen._picturePerspectiveMapId = null;
        }
    }
    function reconcileMap(mapId) {
        if (!hasConfiguration()) return false;
        // Version 0.2 had no owner field and could leak settings across maps.
        // Its only intended target was the living-room TV on map 38.
        if ($gameScreen._picturePerspectiveMapId == null) $gameScreen._picturePerspectiveMapId = 38;
        if ($gameScreen._picturePerspectiveMapId !== mapId) {
            deactivate();
            resetConfiguration();
            return false;
        }
        return true;
    }
    function activate() {
        if (runtime) return;
        const scope = {hooks: []};
        runtime = scope;
        const proto = Sprite_Picture.prototype;
        function wrap(name, make) {
            const descriptor = Object.getOwnPropertyDescriptor(proto, name);
            const base = proto[name];
            const wrapper = make(base);
            scope.hooks.push({name, descriptor, wrapper});
            proto[name] = wrapper;
        }
        wrap('update', base => function() {
            base.apply(this, arguments);
            if (runtime !== scope) return;
            const points = config(this._pictureId);
            if (!points || !this.picture()) {
                if (this._ppMesh) release(this);
                return;
            }
            if (!this._ppMesh) {
                this._ppMesh = new PerspectiveMesh(points);
                this.addChildAt(this._ppMesh, 0);
                this._ppConfig = points;
                meshOwners.add(this);
            } else if (this._ppConfig !== points) {
                this._ppMesh.setPoints(points);
                this._ppConfig = points;
            }
            this._ppMesh.syncTexture(this.texture);
            this._ppMesh.blendMode = this.blendMode;
        });
        wrap('_render', base => function(renderer) {
            if (runtime !== scope || !this._ppMesh) base.call(this, renderer);
        });
        wrap('_calculateBounds', base => function() {
            if (runtime !== scope || !this._ppMesh) base.call(this);
        });
        wrap('destroy', base => function() {
            if (runtime === scope) release(this);
            return base.apply(this, arguments);
        });
    }
    function deactivate() {
        if (editor) editor.close();
        const scope = runtime;
        runtime = null;
        for (const sprite of meshOwners) release(sprite);
        if (!scope) return;
        const proto = Sprite_Picture.prototype;
        for (const {name, descriptor, wrapper} of scope.hooks) {
            // Do not overwrite a third-party runtime replacement. If another
            // plugin retained our wrapper, that old closure is now inert.
            if (proto[name] !== wrapper) continue;
            if (descriptor) Object.defineProperty(proto, name, descriptor);
            else delete proto[name];
        }
    }
    function restoreForMap() {
        if (reconcileMap($gameMap?.mapId()) && !$gameParty.inBattle()) activate();
    }

    // Low-frequency lifecycle hooks only; no Scene_Map.update polling.
    const setupMap = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function(mapId) {
        reconcileMap(mapId);
        return setupMap.apply(this, arguments);
    };
    const createSpriteset = Scene_Map.prototype.createSpriteset;
    Scene_Map.prototype.createSpriteset = function() {
        restoreForMap(); // Before Sprite_Picture instances are constructed.
        return createSpriteset.apply(this, arguments);
    };
    const terminateMap = Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate = function() {
        try {
            // Preserve the normal transition snapshot and MoviePicture cleanup.
            return terminateMap.apply(this, arguments);
        } finally {
            deactivate();
        }
    };
    const extractSave = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        deactivate();
        const result = extractSave.apply(this, arguments);
        reconcileMap($gameMap?.mapId());
        // Scene_Map.createSpriteset restores hooks before the first map draw.
        return result;
    };
    const clearScreen = Game_Screen.prototype.clear;
    Game_Screen.prototype.clear = function() {
        deactivate();
        clearScreen.apply(this, arguments);
        this._picturePerspective = {};
        this._picturePerspectiveMapId = null;
    };

    let editor = null;
    const api = window.PicturePerspective = {
        version: '0.3.0',
        set(id, points) {
            const k = key(id), copy = validate(points);
            projectiveUV(copy);
            const mapId = $gameMap?.mapId();
            if (!(mapId > 0) || $gameParty.inBattle() || !(SceneManager._scene instanceof Scene_Map)) {
                throw new Error('请在地图场景中启用四角透视。');
            }
            reconcileMap(mapId);
            $gameScreen._picturePerspectiveMapId = mapId;
            ($gameScreen._picturePerspective ||= {})[k] = copy;
            activate();
            return copy.map(p => p.slice());
        },
        get(id) { return config(id)?.map(p => p.slice()) || null; },
        clear(id) {
            const k = key(id);
            if ($gameScreen._picturePerspective) delete $gameScreen._picturePerspective[k];
            for (const sprite of meshOwners) {
                if (sprite._pictureId === Number(id)) release(sprite);
            }
            if (editor?.id === Number(id)) editor.close();
            if (!hasConfiguration()) {
                deactivate();
                $gameScreen._picturePerspectiveMapId = null;
            }
        },
        code(id) {
            const points = api.get(id);
            return points ? `PicturePerspective.set(${Number(id)}, ${JSON.stringify(points)});`
                : `PicturePerspective.clear(${Number(id)});`;
        },
        close() { if (editor) editor.close(); },
        edit(id = 10) {
            key(id);
            const sprite = findSprite(id);
            if (!sprite?.picture() || !isDrawable(sprite.texture)) {
                throw new Error(`图片 ${id} 尚未显示或加载完成，请先显示图片再打开定位工具。`);
            }
            api.close();
            if (hasConfiguration()) {
                reconcileMap($gameMap.mapId());
                if (hasConfiguration()) activate();
            }
            editor = new CornerEditor(Number(id), sprite);
        }
    };

    class CornerEditor {
        constructor(id, sprite) {
            this.id = id;
            this.sprite = sprite;
            this.scene = SceneManager._scene;
            this.original = api.get(id);
            this.selected = 0;
            this.dragging = false;
            this.listeners = [];
            if (!this.original) {
                const {width: w, height: h} = sprite.texture.orig;
                api.set(id, [[0,0],[w,0],[w,h],[0,h]]);
            }
            const root = this.root = document.createElement('div');
            root.id = 'picture-perspective-editor';
            root.style.cssText = 'position:fixed;inset:0;z-index:100000;touch-action:none;font:14px/1.5 sans-serif;color:white;';
            root.innerHTML = `<style>
                #picture-perspective-editor .pp-corner {
                    position:absolute;transform:translate(-50%,-50%);width:24px;height:24px;
                    padding:0;border:0;outline:none;box-shadow:none;background:transparent!important;
                    color:rgba(84,229,255,.7);cursor:crosshair;touch-action:none;overflow:visible;
                }
                #picture-perspective-editor .pp-corner svg {
                    position:absolute;left:5px;top:5px;width:14px;height:14px;pointer-events:none;
                }
                #picture-perspective-editor .pp-corner span {
                    position:absolute;white-space:nowrap;font:10px/1.2 sans-serif;opacity:.6;
                    pointer-events:none;text-shadow:0 1px 2px #0009;
                }
                #picture-perspective-editor .pp-corner[data-selected="true"],
                #picture-perspective-editor .pp-corner:hover {color:rgba(225,252,255,.95)}
                #picture-perspective-editor .pp-corner[data-selected="true"] span,
                #picture-perspective-editor .pp-corner:hover span {opacity:.9}
            </style><svg style="position:absolute;width:100%;height:100%;overflow:visible;pointer-events:none"><polygon fill="none" stroke="#54e5ff" stroke-opacity=".45" stroke-width=".75"/></svg>
                <section style="position:absolute;right:12px;top:12px;width:300px;padding:14px;background:rgba(15,20,30,.94);border:1px solid #526979;border-radius:10px;box-shadow:0 6px 22px #0008">
                <b>四角透视 · 图片 ${id}</b><div style="color:#bdcedb;margin:6px 0">拖动角点；方向键微调 1 像素<br>Shift＋方向键：10 像素</div>
                <div data-rows></div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
                <button data-action="export">导出脚本</button><button data-action="keep">完成定位</button><button data-action="cancel">取消本次</button></div>
                <textarea readonly style="display:none;width:100%;box-sizing:border-box;height:96px;margin-top:10px;background:#080e16;color:#b6efff" aria-label="透视脚本"></textarea>
                <div data-status style="font-size:12px;color:#a9c4d5;margin-top:8px">四角固定，图片在屏幕内缩放。完成后保留效果；导出脚本用于地图事件。</div></section>`;
            document.body.appendChild(root);
            this.polygon = root.querySelector('polygon');
            this.status = root.querySelector('[data-status]');
            this.fields = [];
            this.handles = [];
            ['左上','右上','右下','左下'].forEach((label, i) => {
                const row = document.createElement('div');
                row.style.cssText = 'display:flex;gap:5px;align-items:center;margin:5px 0';
                row.innerHTML = `<span style="width:42px">${label}</span><input type="number" step="1" aria-label="${label} X" style="width:95px"><input type="number" step="1" aria-label="${label} Y" style="width:95px">`;
                root.querySelector('[data-rows]').appendChild(row);
                const fields = [...row.querySelectorAll('input')];
                this.fields.push(fields);
                fields.forEach((input, axis) => {
                    input.addEventListener('focus', () => { this.selected = i; });
                    input.addEventListener('change', () => {
                        const p = api.get(id);
                        p[i][axis] = input.value === '' ? NaN : Number(input.value);
                        this.apply(p);
                    });
                });
                const handle = document.createElement('button');
                handle.className = 'pp-corner';
                handle.setAttribute('aria-label', `${i + 1} ${label}`);
                handle.title = `${label}：拖动或用方向键微调`;
                // The hit area is larger than the visible mark. Leave the
                // exact corner transparent, and put its label outside it.
                const left = i === 0 || i === 3, top = i < 2;
                handle.innerHTML = `<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width=".85" aria-hidden="true"><circle cx="7" cy="7" r="3.5"/><path d="M7 0V2 M7 12V14 M0 7H2 M12 7H14"/></svg><span style="${left ? 'right' : 'left'}:27px;${top ? 'bottom' : 'top'}:20px">${i + 1} ${label}</span>`;
                handle.addEventListener('pointerdown', e => {
                    if (e.button !== 0) return;
                    this.selected = i;
                    this.dragging = true;
                    const pointer = this.localPointer(e), corner = api.get(id)[i];
                    this.dragOffset = [pointer.x - corner[0], pointer.y - corner[1]];
                    handle.setPointerCapture(e.pointerId);
                    e.preventDefault();
                });
                root.appendChild(handle);
                this.handles.push(handle);
            });
            root.querySelector('[data-action="export"]').onclick = () => {
                const box = root.querySelector('textarea');
                box.style.display = 'block';
                box.value = api.code(id);
                box.focus(); box.select();
                this.status.textContent = '脚本已选中，按 Ctrl/Cmd+C 复制。';
            };
            root.querySelector('[data-action="keep"]').onclick = () => this.close();
            root.querySelector('[data-action="cancel"]').onclick = () => {
                if (this.original) api.set(id, this.original); else api.clear(id);
                this.close();
            };
            this.on(root, 'pointermove', e => {
                if (!this.dragging) return;
                const local = this.localPointer(e);
                const p = api.get(id);
                p[this.selected] = [Math.round(local.x - this.dragOffset[0]), Math.round(local.y - this.dragOffset[1])];
                this.apply(p);
            });
            this.on(root, 'pointerup', () => { this.dragging = false; });
            this.on(root, 'pointercancel', () => { this.dragging = false; });
            // Stop bubbling to RPG Maker/QJ handlers; editor uses native DOM
            // and does not require enabling Pixi's global interaction manager.
            ['pointerdown','pointermove','pointerup','mousedown','mousemove','mouseup','click','dblclick','touchstart','touchmove','touchend','wheel','contextmenu'].forEach(type => {
                this.on(root, type, e => { e.stopPropagation(); if (type === 'contextmenu') e.preventDefault(); });
            });
            this.on(window, 'keydown', e => {
                // Keep DevTools usable; text fields retain native editing/copy.
                if (e.key === 'F8' || e.key === 'F12') return;
                e.stopImmediatePropagation();
                if (e.key === 'Escape') { e.preventDefault(); this.close(); return; }
                if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
                const d = {ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
                if (d) {
                    e.preventDefault();
                    const p = api.get(id), step = e.shiftKey ? 10 : 1;
                    p[this.selected][0] += d[0] * step;
                    p[this.selected][1] += d[1] * step;
                    this.apply(p);
                }
            }, true);
            this.on(window, 'keyup', e => { if (e.key !== 'F8' && e.key !== 'F12') e.stopImmediatePropagation(); }, true);
            Input.clear(); TouchInput.clear();
            this.refreshFields();
            this.tick();
        }
        on(target, type, fn, options) {
            target.addEventListener(type, fn, options);
            this.listeners.push(() => target.removeEventListener(type, fn, options));
        }
        localPointer(e) {
            const r = Graphics._canvas.getBoundingClientRect();
            const global = new PIXI.Point((e.clientX-r.left)*Graphics.width/r.width, (e.clientY-r.top)*Graphics.height/r.height);
            const p = this.sprite.parent.worldTransform.applyInverse(global);
            const zoom = pictureZoomCompensation();
            p.x *= zoom; p.y *= zoom;
            return p;
        }
        apply(points) {
            try {
                api.set(this.id, points);
                this.status.textContent = '四角已更新。点击导出脚本保存这组坐标。';
                const box = this.root.querySelector('textarea');
                if (box.style.display !== 'none') box.value = api.code(this.id);
            } catch (e) { this.status.textContent = e.message; }
            this.refreshFields();
        }
        refreshFields() {
            const p = api.get(this.id);
            this.fields.forEach((row, i) => row.forEach((input, axis) => { input.value = p[i][axis]; }));
        }
        tick() {
            if (SceneManager._scene !== this.scene || !this.sprite.parent || !this.sprite.picture() || !api.get(this.id)) {
                this.close(); return;
            }
            const r = Graphics._canvas.getBoundingClientRect();
            const points = api.get(this.id).map(p => {
                const zoom = pictureZoomCompensation();
                const q = this.sprite.parent.worldTransform.apply(new PIXI.Point(p[0] / zoom, p[1] / zoom));
                return [r.left + q.x*r.width/Graphics.width, r.top + q.y*r.height/Graphics.height];
            });
            this.polygon.setAttribute('points', points.map(p => p.join(',')).join(' '));
            points.forEach((p, i) => {
                this.handles[i].style.left = `${p[0]}px`;
                this.handles[i].style.top = `${p[1]}px`;
                this.handles[i].dataset.selected = String(i === this.selected);
            });
            this.frame = requestAnimationFrame(() => this.tick());
        }
        close() {
            cancelAnimationFrame(this.frame);
            this.listeners.forEach(off => off());
            this.root.remove();
            Input.clear(); TouchInput.clear();
            if (editor === this) editor = null;
        }
    }
})();
