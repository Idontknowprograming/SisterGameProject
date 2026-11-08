//=============================================================================
// TRP_ParticleMZ_QJBulletTarget.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [兼容补丁] 允许 TRP 粒子使用 QJBullet:index 绑定地图 QJ 弹幕
 * @author Shiroin
 *
 * @help
 * 本插件必须放在 TRP_ParticleMZ.js 与 QJ-MapProjectileMZ.js 之后。
 *
 * 用法：
 *   const bullet = QJ.MPMZ.Shoot({...});
 *   const id = `fog_${bullet.index}`;
 *   $gameScreen._particle.particleSet(
 *       0, id, `QJBullet:${bullet.index}`,
 *       "aura_static_b", "above", 0, 0, "smog1,smog2"
 *   );
 *
 * QJBullet 不区分大小写。TRP 发射点会逐帧跟随指定 QJ 弹幕；
 * 已发射粒子保留在出生时的地图位置，可形成尾迹。镜头滚动和
 * 循环地图会得到补偿。粒子时间由 QJ 弹幕的 time 推进，因此
 * 打开菜单、装备栏等令地图停止时，粒子寿命也会同步暂停；
 * QJ 弹幕消失后，发射器自动销毁。
 * onScreen 屏幕固定弹幕的粒子不补偿地图滚动，避免 HUD 特效被镜头拖走。
 */

(() => {
    "use strict";

    const PATCH_FLAG = Symbol("TRP_QJBulletTargetPatched");
    const SYSTEM_PATCH_FLAG = Symbol("TRP_QJBulletSystemPatched");
    const SCENE_PATCH_FLAG = Symbol("TRP_QJBulletScenePatched");
    const TARGET_PATTERN = /^qjbullet\s*:\s*(\d+)$/i;
    let cameraCacheFrame = -1;
    let cameraCacheTileWidth = 0;
    let cameraCacheTileHeight = 0;
    let cameraCache = null;

    const parseTarget = target => {
        if (typeof target !== "string") return null;
        const match = target.trim().match(TARGET_PATTERN);
        if (!match) return null;
        const index = Number(match[1]);
        return Number.isSafeInteger(index) && index >= 0 ? index : null;
    };

    const currentMapId = () => {
        return $gameMap && typeof $gameMap.mapId === "function"
            ? $gameMap.mapId()
            : 0;
    };

    const resolveBullet = data => {
        if (!$gameMap || !data) return null;
        if (data.qjBulletMapId !== currentMapId()) return null;
        if (typeof $gameMap.bulletQJ !== "function") return null;
        const bullet = $gameMap.bulletQJ(data.qjBulletIndex);
        return bullet && !bullet.deadOver ? bullet : null;
    };

    const resolveBulletSprite = data => {
        const bullet = resolveBullet(data);
        if (!bullet || typeof $gameMap.findBulletSpriteQJ !== "function") {
            return null;
        }
        const sprite = $gameMap.findBulletSpriteQJ(bullet);
        return sprite && sprite.parent ? sprite : null;
    };

    const loopDelta = (delta, totalSize, isLoop) => {
        if (!isLoop || totalSize <= 0) return delta;
        if (delta > totalSize / 2) return delta - totalSize;
        if (delta < -totalSize / 2) return delta + totalSize;
        return delta;
    };

    const cameraPixelPosition = (tileWidth, tileHeight) => {
        const frame = window.Graphics ? Graphics.frameCount : -1;
        if (
            frame >= 0 &&
            cameraCacheFrame === frame &&
            cameraCacheTileWidth === tileWidth &&
            cameraCacheTileHeight === tileHeight
        ) {
            return cameraCache;
        }

        const zoom = $gameScreen && typeof $gameScreen.zoomScale === "function"
            ? ($gameScreen.zoomScale() || 1)
            : 1;
        cameraCache = {
            x: Math.round($gameMap._displayX * tileWidth * zoom) / zoom,
            y: Math.round($gameMap._displayY * tileHeight * zoom) / zoom
        };
        cameraCacheFrame = frame;
        cameraCacheTileWidth = tileWidth;
        cameraCacheTileHeight = tileHeight;
        return cameraCache;
    };

    // updatePosition 与 updateDeltaTime 会在同一渲染帧查询同一枚子弹。
    // 缓存该结果，避免每个发射器每帧重复访问两次弹幕表。
    const resolveTrackedBullet = wrapper => {
        const frame = window.Graphics ? Graphics.frameCount : -1;
        if (frame >= 0 && wrapper._qjBulletResolveFrame === frame) {
            return wrapper._qjBulletResolvedTarget;
        }

        const bullet = resolveBullet(wrapper._data);
        wrapper._qjBulletResolveFrame = frame;
        wrapper._qjBulletResolvedTarget = bullet;
        return bullet;
    };

    const placeContainerBesideTarget = (wrapper, sprite) => {
        const container = wrapper && wrapper._container;
        const parent = sprite && sprite.parent;
        if (!container || !parent || container.parent === parent) return;

        if (container.parent) container.parent.removeChild(container);
        const relativeZ = Number(wrapper._data && wrapper._data.z) || 0;
        const targetIndex = parent.children.indexOf(sprite);
        const index = Math.max(
            0,
            Math.min(parent.children.length, targetIndex + relativeZ)
        );
        parent.addChildAt(container, index);
        if (window.Tilemap && parent instanceof Tilemap) {
            container.z = (Number(sprite.z) || 0) + relativeZ;
        }
    };

    const installEmitterTracking = wrapper => {
        const data = wrapper && wrapper._data;
        const emitter = wrapper && wrapper._emitter;
        const sprite = resolveBulletSprite(data);
        if (!data || !emitter || !sprite) return false;
        if (wrapper._qjBulletTrackingInstalled) return true;

        placeContainerBesideTarget(wrapper, sprite);

        const camera = cameraPixelPosition(wrapper._tileWidth, wrapper._tileHeight);
        wrapper._qjBulletLastCameraX = camera.x;
        wrapper._qjBulletLastCameraY = camera.y;
        wrapper._followScroll = true;
        wrapper._updatePos = true;
        wrapper._dispX = 0;
        wrapper._dispY = 0;
        wrapper._x = sprite.x + data.qjBulletOffsetX;
        wrapper._y = sprite.y + data.qjBulletOffsetY;
        wrapper._qjBulletSprite = sprite;
        wrapper._qjBulletScene = SceneManager._scene;
        wrapper._qjBulletMapPixelWidth = $gameMap.width() * wrapper._tileWidth;
        wrapper._qjBulletMapPixelHeight = $gameMap.height() * wrapper._tileHeight;
        emitter.updateOwnerPos(wrapper._x, wrapper._y);
        emitter.resetPositionTracking();

        // TRP 默认每个渲染帧固定推进 1/60 秒，即使地图和 QJ 弹幕
        // 因菜单暂停也会继续消耗粒子寿命。改用 QJ 弹幕 time 的变化量
        // 作为时钟；弹幕没有更新时返回 0，现有粒子和发射器一并冻结。
        const bullet = resolveBullet(data);
        const originalUpdateDeltaTime = wrapper.updateDeltaTime;
        wrapper._qjBulletLastTime = bullet ? Number(bullet.time) || 0 : 0;
        wrapper.updateDeltaTime = function () {
            const target = resolveTrackedBullet(this);
            if (!target) return 0;

            const currentTime = Number(target.time) || 0;
            const elapsedFrames = Math.max(0, currentTime - this._qjBulletLastTime);
            this._qjBulletLastTime = currentTime;
            if (elapsedFrames === 0) return 0;

            const baseDelta = originalUpdateDeltaTime.call(this);
            return baseDelta * elapsedFrames;
        };

        // displayObject 默认不补偿地图镜头。移动既有粒子，但不要把
        // 镜头位移再次叠加到已经换算成画面坐标的 QJ Sprite 上。
        wrapper._updateFollowScroll = function () {
            if (this._data.qjBulletMapId !== currentMapId()) {
                this.destroy();
                return false;
            }

            const bullet = resolveTrackedBullet(this);
            if (bullet && bullet.data && bullet.data.onScreen) return false;

            const next = cameraPixelPosition(this._tileWidth, this._tileHeight);
            const dx = loopDelta(
                next.x - this._qjBulletLastCameraX,
                this._qjBulletMapPixelWidth,
                $gameMap.isLoopHorizontal()
            );
            const dy = loopDelta(
                next.y - this._qjBulletLastCameraY,
                this._qjBulletMapPixelHeight,
                $gameMap.isLoopVertical()
            );

            if (dx !== 0) this._emitter.shiftParticlePosX(-dx);
            if (dy !== 0) this._emitter.shiftParticlePosY(-dy);
            if (dx !== 0 || dy !== 0) this._emitter.resetPositionTracking();

            this._qjBulletLastCameraX = next.x;
            this._qjBulletLastCameraY = next.y;
            this._dispX = 0;
            this._dispY = 0;
            return false;
        };

        wrapper._updatePosition = function () {
            const bulletTarget = resolveTrackedBullet(this);
            if (!bulletTarget) {
                this.destroy();
                return;
            }

            // 正常地图更新期间直接复用Sprite。只有场景发生切换、Sprite
            // 被移除或其绑定对象变化时，才重新执行QJ容器的线性搜索。
            let target = this._qjBulletSprite;
            if (
                this._qjBulletScene !== SceneManager._scene ||
                !target ||
                !target.parent ||
                target.data !== bulletTarget
            ) {
                target = typeof $gameMap.findBulletSpriteQJ === "function"
                    ? $gameMap.findBulletSpriteQJ(bulletTarget)
                    : null;
                if (!target || !target.parent) {
                    this.destroy();
                    return;
                }
                this._qjBulletSprite = target;
                this._qjBulletScene = SceneManager._scene;
            }

            placeContainerBesideTarget(this, target);
            const x = target.x + this._data.qjBulletOffsetX;
            const y = target.y + this._data.qjBulletOffsetY;
            if (this._x !== x || this._y !== y) this._applyPosition(x, y);
        };

        wrapper._qjBulletTrackingInstalled = true;
        return true;
    };

    const installGameParticlePatch = particle => {
        if (!particle) return;
        const prototype = Object.getPrototypeOf(particle);
        if (!prototype || prototype[PATCH_FLAG]) return;

        const originalParticleData = prototype.particleData;
        if (typeof originalParticleData !== "function") return;

        prototype.particleData = function (
            eventId, id, target, name, z, x, y, image, ignoreError
        ) {
            const bulletIndex = parseTarget(target);
            if (bulletIndex === null) {
                return originalParticleData.apply(this, arguments);
            }

            const mapId = currentMapId();
            const temporaryData = {
                qjBulletIndex: bulletIndex,
                qjBulletMapId: mapId
            };
            const sprite = resolveBulletSprite(temporaryData);
            if (!sprite) {
                console.warn(
                    `[TRP QJBullet] 找不到当前地图的 QJ 弹幕或 Sprite: ${bulletIndex}`
                );
                return undefined;
            }

            const data = originalParticleData.call(
                this, eventId, id, sprite, name, z, x, y, image, ignoreError
            );
            if (!data) return data;

            data.qjBulletIndex = bulletIndex;
            data.qjBulletMapId = mapId;
            data.qjBulletOffsetX = Number(x) || 0;
            data.qjBulletOffsetY = Number(y) || 0;
            return data;
        };

        Object.defineProperty(prototype, PATCH_FLAG, { value: true });
    };

    const installParticleSystemPatch = system => {
        if (!system) return;
        const prototype = Object.getPrototypeOf(system);
        if (!prototype || prototype[SYSTEM_PATCH_FLAG]) return;

        const originalCreateEmitter = prototype.createParticleEmitter;
        const originalUpdate = prototype.update;
        const originalPrepareCache = prototype.prepareCache;
        if (
            typeof originalCreateEmitter !== "function" ||
            typeof originalUpdate !== "function"
        ) return;

        prototype.createParticleEmitter = function (key, data, scene) {
            if (data && Number.isSafeInteger(data.qjBulletIndex)) {
                const sprite = resolveBulletSprite(data);
                if (!sprite) {
                    data.destroy = true;
                    return { _destroyed: true };
                }
                const particle = $gameScreen && $gameScreen._particle;
                const constructor = particle && particle.constructor;
                if (constructor && constructor.displayObjects) {
                    constructor.displayObjects[data.targetId] = sprite;
                }
            }

            const wrapper = originalCreateEmitter.apply(this, arguments);
            if (data && Number.isSafeInteger(data.qjBulletIndex)) {
                const installed = installEmitterTracking(wrapper);
                if (!installed && wrapper && !wrapper._destroyed) {
                    if (!this._qjBulletPendingTracking) {
                        this._qjBulletPendingTracking = new Set();
                    }
                    this._qjBulletPendingTracking.add(key);
                } else if (this._qjBulletPendingTracking) {
                    this._qjBulletPendingTracking.delete(key);
                }
            }
            return wrapper;
        };

        // 贴图通常异步加载，createParticleEmitter 返回时 PIXI emitter
        // 可能尚未创建。只重试尚未完成绑定的少数发射器，避免每帧
        // Object.keys 并遍历游戏中的全部 TRP 发射器。
        prototype.update = function (scene) {
            const result = originalUpdate.apply(this, arguments);
            const pending = this._qjBulletPendingTracking;
            if (!pending || pending.size === 0) return result;

            const emitters = this._emitters || {};
            for (const key of pending) {
                const wrapper = emitters[key];
                if (!wrapper || wrapper._destroyed || !wrapper._data) {
                    pending.delete(key);
                    continue;
                }
                if (wrapper._qjBulletTrackingInstalled || installEmitterTracking(wrapper)) {
                    pending.delete(key);
                }
            }
            return result;
        };

        // TRP 会在从地图进入菜单时销毁所有 displayObject 发射器。
        // QJBullet 目标仍属于被冻结的地图，缓存时应保留，回到地图后
        // 再重新寻找该子弹的新 Sprite 并继续显示。
        if (typeof originalPrepareCache === "function") {
            prototype.prepareCache = function () {
                const preserved = [];
                const emitters = this._emitters || {};
                for (const key of Object.keys(emitters)) {
                    const wrapper = emitters[key];
                    if (
                        wrapper &&
                        wrapper._data &&
                        Number.isSafeInteger(wrapper._data.qjBulletIndex)
                    ) {
                        preserved.push([wrapper, wrapper._targetType]);
                        wrapper._targetType = Number.MIN_SAFE_INTEGER;
                    }
                }

                try {
                    return originalPrepareCache.apply(this, arguments);
                } finally {
                    for (const [wrapper, targetType] of preserved) {
                        if (!wrapper._destroyed) wrapper._targetType = targetType;
                    }
                }
            };
        }

        Object.defineProperty(prototype, SYSTEM_PATCH_FLAG, { value: true });
    };

    const installScenePatch = () => {
        const prototype = Scene_Base.prototype;
        if (prototype[SCENE_PATCH_FLAG]) return;

        const originalIsTargetValid = prototype.isParticleTargetTypeValid;
        if (typeof originalIsTargetValid !== "function") return;

        prototype.isParticleTargetTypeValid = function (type, targetId) {
            const particle = $gameScreen && $gameScreen._particle;
            const data = particle && particle._data && particle._data[targetId];
            if (
                data &&
                Number.isSafeInteger(data.qjBulletIndex) &&
                !(this instanceof Scene_Map)
            ) {
                return false;
            }
            return originalIsTargetValid.apply(this, arguments);
        };

        Object.defineProperty(prototype, SCENE_PATCH_FLAG, { value: true });
    };

    const originalScreenInitialize = Game_Screen.prototype.initialize;
    Game_Screen.prototype.initialize = function () {
        originalScreenInitialize.apply(this, arguments);
        installGameParticlePatch(this._particle);
    };

    const originalTryCreateParticle = Game_Screen.prototype.tryCreateParticle;
    if (typeof originalTryCreateParticle === "function") {
        Game_Screen.prototype.tryCreateParticle = function () {
            const result = originalTryCreateParticle.apply(this, arguments);
            installGameParticlePatch(this._particle);
            return result;
        };
    }

    const originalCreateParticleSystem = Scene_Base.prototype.createParticleSystem;
    Scene_Base.prototype.createParticleSystem = function () {
        const result = originalCreateParticleSystem.apply(this, arguments);
        installParticleSystemPatch(this._particleSystem);
        return result;
    };

    installScenePatch();
})();
