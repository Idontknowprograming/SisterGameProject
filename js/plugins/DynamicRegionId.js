//=============================================================================
// DynamicRegionId.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc 动态改变地图 RegionId / 图块（区分临时/永久）。可从别的地图整块复制图块。临时效果切图自动复原，永久效果写入存档。
 * @author wangziyun (assisted by Claude)
 * @url
 *
 * @help
 * ============================================================================
 *  DynamicRegionId.js
 * ============================================================================
 *
 *  RegionId 通常是写死在 MapXXX.json（图层 z=5）里的静态数据。
 *  本插件让你在游戏运行时动态覆盖某个图块的 RegionId，用于地形破坏、
 *  制造地形等效果，并且区分两种生命周期：
 *
 *   ● 临时(temp)   —— 不进存档；切换地图 / 重载地图时自动复原。
 *                     （战斗往返、菜单返回不会清除，只有真正换图才清。）
 *   ● 永久(permanent) —— 写入存档（保存在 $gameSystem，按 mapId 分桶），
 *                     切换地图不会自动复原，读档后依然生效。
 *
 *  实现方式：本插件【不修改 $dataMap.data】，而是覆写 Game_Map.regionId，
 *  在查询时先查覆盖表。因此不会污染地图原始数据，也不影响地图缓存。
 *
 *  查询优先级： 临时 > 永久 > 地图原始 RegionId
 *  ----------------------------------------------------------------------------
 *  例：某块原始 region=2；永久设为 5；再临时设为 0。
 *      此刻 regionId() 返回 0；临时清除后返回 5（永久仍在）；
 *      永久也清除后返回 2（地图原始值）。
 *
 * ============================================================================
 *  脚本调用 (Script)
 * ============================================================================
 *  // 设置（permanent 省略或 false = 临时；true = 永久）
 *  $gameMap.setRegionId(x, y, regionId);            // 临时
 *  $gameMap.setRegionId(x, y, regionId, true);      // 永久
 *
 *  // 矩形区域批量设置
 *  $gameMap.setRegionIdArea(x1, y1, x2, y2, regionId, permanent);
 *
 *  // 清除某块的覆盖（scope: 'temp' | 'permanent' | 'both'，默认 'both'）
 *  $gameMap.clearRegionId(x, y, scope);
 *
 *  // 清空整张图的临时覆盖（一般不用手动调，切图会自动清）
 *  $gameMap.clearTempRegions();
 *
 *  // 清空某张图的永久覆盖（mapId 省略 = 当前地图）
 *  $gameMap.clearPermanentRegions(mapId);
 *
 *  // 读取地图“原始”RegionId（忽略一切覆盖）
 *  $gameMap.originalRegionId(x, y);
 *
 *  // 正常的 $gameMap.regionId(x, y) 会自动带上覆盖结果。
 *
 * ============================================================================
 *  插件指令 (Plugin Command)
 * ============================================================================
 *  · 设置 RegionId        —— 单块设置（临时/永久）
 *  · 设置 RegionId(区域)  —— 矩形区域批量设置
 *  · 清除 RegionId        —— 清除单块覆盖
 *  · 清空临时覆盖         —— 清空当前地图所有临时覆盖
 *  · 清空永久覆盖         —— 清空指定地图所有永久覆盖
 *  · 复制图块(整块)       —— 从别的地图/本图复制一块图块过来
 *  · 修改单个图块         —— 改某坐标某图层的 tileId
 *  · 预加载来源地图       —— 提前异步加载源地图，避免复制时卡顿
 *  · 清空永久图块         —— 清空指定地图所有永久图块改动
 *
 *  指令里坐标支持填公式/变量，例如 $gamePlayer.x。
 *
 * ============================================================================
 *  从别的地图复制图块 (Copy Tiles)
 * ============================================================================
 *  典型用法：做一张“废墟模板地图”，把破坏后的地形画好；游戏里触发时，
 *  从模板地图整块复制到当前地图对应位置，即可瞬间“制造/破坏地形”。
 *
 *  · 来源地图ID 填 0 = 从【当前地图自身】复制（图内搬运地形）。
 *  · 跨 tileset（来源地图与当前地图图块组不同）会【自动处理】：
 *      图形层(z0~4)用「源 tileset 的图片」烘焙成普通精灵叠加显示（绕开引擎
 *      瓦片渲染器——它全局只认一套图集纹理，无法多 tileset 共存）。autotile
 *      拼边正确，下层落在角色脚下、上层(★)盖在角色头顶；底图对应格会被擦除
 *      避免重影。region 层(z=5)与 tileset 无关，照常写入。
 *      ★限制1：烘焙是静态的，源 A1 水面/瀑布不会逐帧动画。
 *      ★限制2：复制区的【通行/地形标志】不会自动取源 tileset（引擎一张图只认
 *        一套标志）。要控制通行请配合 region 逻辑或 setRegionId 另设。
 *      同一 tileset 复制则无以上限制，直接照搬底图数据。
 *  · 复制的图层(z)可选：
 *      0=地面层  1=地面覆盖层  2=上层1  3=上层2  4=阴影层  5=区域(Region)层
 *    留空/填 all = 全部 6 层一起复制。只想搬 Region 就填 5。
 *  · 同样区分【临时/永久】：
 *      临时——只改当前 $dataMap 并刷新画面，切图/读档自动复原，不进存档；
 *      永久——额外记录到存档，切图回来 / 读档后自动重新贴上。
 *  · 源地图未加载时，复制指令会【自动加载并让事件等待】，加载完再执行；
 *    想完全无卡顿可先用“预加载来源地图”。
 *
 *  脚本调用：
 *    // 源已加载或来源为自身(0)时可直接同步调用：
 *    $gameMap.copyTileBlock(srcMapData, {sx1,sy1,sx2,sy2,dx,dy,zList,permanent});
 *    // 单块：
 *    $gameMap.changeTileId(x, y, z, tileId, permanent);
 *    // 清永久图块记录：
 *    $gameMap.clearPermanentTiles(mapId);   // 视觉复原需重新进出该地图
 *
 *  Region 注意：复制 z=5 会写入 $dataMap，被所有读 regionId() 的逻辑看到；
 *  但若同一格用 setRegionId() 设过覆盖，覆盖表优先级更高会盖住复制结果。
 *
 * ============================================================================
 *  注意
 * ============================================================================
 *  · RegionId 在游戏画面中本身不渲染（只在编辑器里可见），所以无需重绘。
 *    本插件影响的是“逻辑层”的 region 查询（事件、其它依赖 region 的插件）。
 *  · 若有第三方插件缓存了 region 数据，改动后可能需要它们自行刷新。
 *  · 与覆写 regionId 的其它插件共存时，请把本插件放在它们【之后】加载，
 *    以保证覆盖表生效。
 *
 *  本插件不提供运行参数。无需配置。
 *
 * @command setRegion
 * @text 设置 RegionId
 * @desc 把单个图块的 RegionId 改成指定值。
 *
 * @arg x
 * @text X 坐标
 * @desc 图块 X 坐标，可填公式（如 $gamePlayer.x）。
 * @default 0
 *
 * @arg y
 * @text Y 坐标
 * @desc 图块 Y 坐标，可填公式（如 $gamePlayer.y）。
 * @default 0
 *
 * @arg regionId
 * @text RegionId
 * @desc 目标 RegionId（0~255）。
 * @type number
 * @min 0
 * @max 255
 * @default 1
 *
 * @arg permanent
 * @text 永久？
 * @desc 开=永久(进存档,切图不复原)；关=临时(切图自动复原)。
 * @type boolean
 * @on 永久
 * @off 临时
 * @default false
 *
 * @command setRegionArea
 * @text 设置 RegionId(区域)
 * @desc 把一个矩形区域内所有图块的 RegionId 改成指定值。
 *
 * @arg x1
 * @text 起点 X
 * @desc 矩形左上角 X，可填公式。
 * @default 0
 *
 * @arg y1
 * @text 起点 Y
 * @desc 矩形左上角 Y，可填公式。
 * @default 0
 *
 * @arg x2
 * @text 终点 X
 * @desc 矩形右下角 X，可填公式。
 * @default 0
 *
 * @arg y2
 * @text 终点 Y
 * @desc 矩形右下角 Y，可填公式。
 * @default 0
 *
 * @arg regionId
 * @text RegionId
 * @desc 目标 RegionId（0~255）。
 * @type number
 * @min 0
 * @max 255
 * @default 1
 *
 * @arg permanent
 * @text 永久？
 * @desc 开=永久(进存档)；关=临时(切图复原)。
 * @type boolean
 * @on 永久
 * @off 临时
 * @default false
 *
 * @command clearRegion
 * @text 清除 RegionId
 * @desc 清除单个图块的覆盖，使其回到上一层级的值。
 *
 * @arg x
 * @text X 坐标
 * @desc 图块 X 坐标，可填公式。
 * @default 0
 *
 * @arg y
 * @text Y 坐标
 * @desc 图块 Y 坐标，可填公式。
 * @default 0
 *
 * @arg scope
 * @text 清除范围
 * @desc 清除哪一层覆盖。
 * @type select
 * @option 临时
 * @value temp
 * @option 永久
 * @value permanent
 * @option 两者
 * @value both
 * @default both
 *
 * @command clearAllTemp
 * @text 清空临时覆盖
 * @desc 清空当前地图所有临时 RegionId 覆盖。
 *
 * @command clearAllPermanent
 * @text 清空永久覆盖
 * @desc 清空指定地图所有永久 RegionId 覆盖。
 *
 * @arg mapId
 * @text 地图ID
 * @desc 要清空的地图ID；填 0 或留空表示当前地图。
 * @type number
 * @min 0
 * @default 0
 *
 * @command copyTiles
 * @text 复制图块(整块)
 * @desc 从来源地图的一个矩形区域，整块复制图块到当前地图。
 *
 * @arg srcMapId
 * @text 来源地图ID
 * @desc 要复制的来源地图ID；填 0 = 从当前地图自身复制。
 * @type number
 * @min 0
 * @default 0
 *
 * @arg sx1
 * @text 源-起点X
 * @desc 来源矩形左上角 X，可填公式。
 * @default 0
 *
 * @arg sy1
 * @text 源-起点Y
 * @desc 来源矩形左上角 Y，可填公式。
 * @default 0
 *
 * @arg sx2
 * @text 源-终点X
 * @desc 来源矩形右下角 X，可填公式。
 * @default 0
 *
 * @arg sy2
 * @text 源-终点Y
 * @desc 来源矩形右下角 Y，可填公式。
 * @default 0
 *
 * @arg dx
 * @text 目标-起点X
 * @desc 粘贴到当前地图的左上角 X，可填公式。
 * @default 0
 *
 * @arg dy
 * @text 目标-起点Y
 * @desc 粘贴到当前地图的左上角 Y，可填公式。
 * @default 0
 *
 * @arg zList
 * @text 复制图层
 * @desc 要复制的图层 z（空格/逗号分隔，如 "2 3"）。留空或 all = 全部 6 层。0~5，5 为 Region 层。
 * @default all
 *
 * @arg permanent
 * @text 永久？
 * @desc 开=永久(进存档,切图重贴)；关=临时(切图复原)。
 * @type boolean
 * @on 永久
 * @off 临时
 * @default false
 *
 * @command changeTile
 * @text 修改单个图块
 * @desc 修改某坐标某图层的 tileId（不做自动拼接）。
 *
 * @arg x
 * @text X 坐标
 * @desc 可填公式。
 * @default 0
 *
 * @arg y
 * @text Y 坐标
 * @desc 可填公式。
 * @default 0
 *
 * @arg z
 * @text 图层 z
 * @desc 0=地面 1=地面覆盖 2=上层1 3=上层2 4=阴影 5=Region。
 * @type number
 * @min 0
 * @max 5
 * @default 0
 *
 * @arg tileId
 * @text tileId
 * @desc 目标 tileId（0=擦除）。可填公式。
 * @default 0
 *
 * @arg permanent
 * @text 永久？
 * @desc 开=永久；关=临时。
 * @type boolean
 * @on 永久
 * @off 临时
 * @default false
 *
 * @command preloadMap
 * @text 预加载来源地图
 * @desc 提前异步加载一张来源地图，复制时不会卡顿。
 *
 * @arg mapId
 * @text 来源地图ID
 * @desc 要预加载的地图ID。
 * @type number
 * @min 1
 * @default 1
 *
 * @command clearAllPermanentTiles
 * @text 清空永久图块
 * @desc 清空指定地图所有永久图块改动记录（视觉复原需重新进出该地图）。
 *
 * @arg mapId
 * @text 地图ID
 * @desc 要清空的地图ID；填 0 或留空表示当前地图。
 * @type number
 * @min 0
 * @default 0
 */

(() => {
    "use strict";

    const PLUGIN_NAME = "DynamicRegionId";

    // 坐标键。用整数索引，避免字符串拼接歧义，并节省存档体积。
    const keyOf = (x, y) => y * 65536 + x;

    //-------------------------------------------------------------------------
    // Game_Temp —— 临时覆盖（不进存档，切图清空）
    //-------------------------------------------------------------------------
    Game_Temp.prototype.tempRegions = function() {
        if (!this._tempRegions) this._tempRegions = {};
        return this._tempRegions;
    };

    Game_Temp.prototype.clearTempRegions = function() {
        // 清成 null（非空对象）：让 regionId 快速通道在无覆盖时能命中。
        this._tempRegions = null;
    };

    //-------------------------------------------------------------------------
    // Game_System —— 永久覆盖（进存档，按 mapId 分桶）
    //-------------------------------------------------------------------------
    Game_System.prototype.permanentRegions = function(mapId) {
        if (!this._permanentRegions) this._permanentRegions = {};
        if (!this._permanentRegions[mapId]) this._permanentRegions[mapId] = {};
        return this._permanentRegions[mapId];
    };

    // 只读取（不创建空桶），用于查询，避免给每个查询过的图都留下空对象。
    Game_System.prototype.permanentRegionsRaw = function(mapId) {
        return this._permanentRegions && this._permanentRegions[mapId];
    };

    Game_System.prototype.clearPermanentRegions = function(mapId) {
        if (this._permanentRegions) delete this._permanentRegions[mapId];
    };

    //-------------------------------------------------------------------------
    // Game_Map —— 覆写 regionId + 对外 API
    //-------------------------------------------------------------------------
    const _Game_Map_setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function(mapId) {
        _Game_Map_setup.call(this, mapId);
        // 切换 / 重载地图时清空临时覆盖（永久覆盖保留在 $gameSystem）。
        if ($gameTemp) $gameTemp.clearTempRegions();
    };

    // 地图原始 RegionId（绕过一切覆盖）。
    const _Game_Map_regionId = Game_Map.prototype.regionId;
    Game_Map.prototype.originalRegionId = function(x, y) {
        return _Game_Map_regionId.call(this, x, y);
    };

    Game_Map.prototype.regionId = function(x, y) {
        if (!this.isValid(x, y)) return 0;
        // 快速通道：当前图无任何 region 覆盖 → 直接走原版（DotMoveSystem 等高频调用友好）。
        // 这里直接读字段、不调 tempRegions()，避免懒创建出空对象而使快速通道失效。
        const temp = $gameTemp && $gameTemp._tempRegions;
        const permMap = $gameSystem && $gameSystem._permanentRegions;
        const perm = permMap && permMap[this._mapId];
        if (!temp && !perm) return _Game_Map_regionId.call(this, x, y);
        // 有覆盖：临时优先，永久次之，最后地图原始值。
        const key = keyOf(x, y);
        if (temp && key in temp) return temp[key];
        if (perm && key in perm) return perm[key];
        return _Game_Map_regionId.call(this, x, y);
    };

    Game_Map.prototype.setRegionId = function(x, y, regionId, permanent) {
        if (!this.isValid(x, y)) return;
        const key = keyOf(x, y);
        const value = Math.max(0, Math.min(255, Math.floor(regionId)));
        if (permanent) {
            $gameSystem.permanentRegions(this._mapId)[key] = value;
        } else {
            $gameTemp.tempRegions()[key] = value;
        }
    };

    Game_Map.prototype.setRegionIdArea = function(x1, y1, x2, y2, regionId, permanent) {
        const xMin = Math.min(x1, x2);
        const xMax = Math.max(x1, x2);
        const yMin = Math.min(y1, y2);
        const yMax = Math.max(y1, y2);
        for (let yy = yMin; yy <= yMax; yy++) {
            for (let xx = xMin; xx <= xMax; xx++) {
                this.setRegionId(xx, yy, regionId, permanent);
            }
        }
    };

    Game_Map.prototype.clearRegionId = function(x, y, scope) {
        const key = keyOf(x, y);
        scope = scope || "both";
        if (scope === "temp" || scope === "both") {
            delete $gameTemp.tempRegions()[key];
        }
        if (scope === "permanent" || scope === "both") {
            const perm = $gameSystem.permanentRegionsRaw(this._mapId);
            if (perm) delete perm[key];
        }
    };

    // 与 setRegionIdArea 对应：批量清理矩形区域的覆盖。scope: "temp"/"permanent"/"both"(默认 both)
    Game_Map.prototype.clearRegionIdArea = function(x1, y1, x2, y2, scope) {
        const xMin = Math.min(x1, x2);
        const xMax = Math.max(x1, x2);
        const yMin = Math.min(y1, y2);
        const yMax = Math.max(y1, y2);
        for (let yy = yMin; yy <= yMax; yy++) {
            for (let xx = xMin; xx <= xMax; xx++) {
                this.clearRegionId(xx, yy, scope);
            }
        }
    };

    Game_Map.prototype.clearTempRegions = function() {
        $gameTemp.clearTempRegions();
    };

    Game_Map.prototype.clearPermanentRegions = function(mapId) {
        $gameSystem.clearPermanentRegions(mapId || this._mapId);
    };

    //=========================================================================
    // 图块复制子系统（写真实 $dataMap.data + 刷新画面）
    //=========================================================================

    // 刷新当前可见 tilemap，使 $dataMap.data 的改动立刻显示出来。
    const refreshTilemap = () => {
        const scene = SceneManager._scene;
        const spriteset = scene && scene._spriteset;
        const tilemap = spriteset && spriteset._tilemap;
        if (tilemap) {
            tilemap.setData($gameMap.width(), $gameMap.height(), $gameMap.data());
            tilemap.refresh();
        }
    };

    //-------------------------------------------------------------------------
    // Game_System —— 永久图块改动（进存档，按 mapId 分桶；index -> tileId）
    //-------------------------------------------------------------------------
    Game_System.prototype.dynTiles = function(mapId) {
        if (!this._dynTiles) this._dynTiles = {};
        if (!this._dynTiles[mapId]) this._dynTiles[mapId] = {};
        return this._dynTiles[mapId];
    };

    Game_System.prototype.dynTilesRaw = function(mapId) {
        return this._dynTiles && this._dynTiles[mapId];
    };

    Game_System.prototype.saveDynTile = function(mapId, index, tileId) {
        this.dynTiles(mapId)[index] = tileId;
    };

    Game_System.prototype.clearDynTiles = function(mapId) {
        if (this._dynTiles) delete this._dynTiles[mapId];
    };

    // 把某图的永久图块改动写回刚加载好的 $dataMap.data（在建立显示对象之前调用）。
    Game_System.prototype.applyDynTiles = function(mapId) {
        const tiles = this.dynTilesRaw(mapId);
        if (!tiles || !$dataMap || !$dataMap.data) return;
        for (const index in tiles) {
            $dataMap.data[index] = tiles[index];
        }
    };

    //-------------------------------------------------------------------------
    // DynTile —— 来源地图加载器（本会话内缓存；不进存档）
    //-------------------------------------------------------------------------
    const DynTile = {
        _sources: {}, // mapId -> 地图数据
        _loading: {}, // mapId -> true（加载中）
        _deferred: [], // 等待加载完成后再执行的复制任务

        isLoading() {
            return Object.keys(this._loading).length > 0;
        },

        // srcMapId 为 0 表示当前地图自身。
        sourceData(srcMapId) {
            return srcMapId === 0 ? $dataMap : this._sources[srcMapId] || null;
        },

        loadSource(mapId) {
            if (mapId <= 0 || this._sources[mapId] || this._loading[mapId]) return;
            this._loading[mapId] = true;
            const url = "data/Map%1.json".format(mapId.padZero(3));
            const xhr = new XMLHttpRequest();
            xhr.open("GET", url);
            xhr.overrideMimeType("application/json");
            xhr.onload = () => {
                if (xhr.status < 400) {
                    this._sources[mapId] = JSON.parse(xhr.responseText);
                } else {
                    console.error("DynamicRegionId: 来源地图加载失败 " + url);
                    this._dropJobs(mapId);
                }
                delete this._loading[mapId];
                this._flushReady(); // 加载完成后自动执行已就绪的排队任务
            };
            xhr.onerror = () => {
                console.error("DynamicRegionId: 来源地图加载出错 " + url);
                delete this._loading[mapId];
                this._dropJobs(mapId);
            };
            xhr.send();
        },

        // 返回 true=已就地执行；false=已转入异步队列（加载完会自动执行）。
        request(job) {
            if (job.srcMapId > 0 && !this._sources[job.srcMapId]) {
                this.loadSource(job.srcMapId);
                this._deferred.push(job);
                return false;
            }
            this.execute(job);
            return true;
        },

        // 执行队列中所有“源已就绪”的任务，未就绪的留下继续等。
        _flushReady() {
            const remaining = [];
            for (const job of this._deferred) {
                if (job.srcMapId === 0 || this._sources[job.srcMapId]) {
                    this.execute(job);
                } else {
                    remaining.push(job);
                }
            }
            this._deferred = remaining;
        },

        // 某源地图加载失败时，丢弃依赖它的排队任务，避免永久挂起。
        _dropJobs(mapId) {
            this._deferred = this._deferred.filter(j => j.srcMapId !== mapId);
        },

        flushDeferred() {
            this._flushReady();
        },

        execute(job) {
            const src = this.sourceData(job.srcMapId);
            if (!src || !src.data) {
                console.error("DynamicRegionId: 来源地图数据不可用 mapId=" + job.srcMapId);
                return;
            }
            $gameMap.copyTileBlock(src, job);
        }
    };

    //-------------------------------------------------------------------------
    // Game_Map —— 图块复制 / 单块修改 API
    //-------------------------------------------------------------------------
    // 计算 $dataMap.data 的扁平索引：(z*height + y)*width + x
    const tileIndex = (w, h, x, y, z) => (z * h + y) * w + x;

    // job: { srcMapId, sx1, sy1, sx2, sy2, dx, dy, zList:[...], permanent }
    Game_Map.prototype.copyTileBlock = function(src, job) {
        const dw = $dataMap.width, dh = $dataMap.height;
        const sw = src.width, sh = src.height;
        // 坐标校验：缺参/拼写错（如把 sx1 写成 Sx1）会得到 undefined→NaN，
        // 若不拦截会在 new Array(NaN) 处抛 RangeError 崩游戏。这里安全中止并提示。
        const ix1 = Math.floor(job.sx1), iy1 = Math.floor(job.sy1);
        const ix2 = Math.floor(job.sx2), iy2 = Math.floor(job.sy2);
        const dx = Math.floor(job.dx), dy = Math.floor(job.dy);
        if (![ix1, iy1, ix2, iy2, dx, dy].every(Number.isFinite)) {
            console.error(
                "DynamicRegionId: 复制坐标无效，已跳过。请检查 sx1/sy1/sx2/sy2/dx/dy " +
                "是否拼写正确（区分大小写）且为数字。收到：",
                job
            );
            return;
        }
        const sxMin = Math.min(ix1, ix2);
        const syMin = Math.min(iy1, iy2);
        const bw = Math.abs(ix2 - ix1) + 1;
        const bh = Math.abs(iy2 - iy1) + 1;
        const zList = job.zList && job.zList.length ? job.zList : [0, 1, 2, 3, 4, 5];
        const perm = job.permanent;
        const mapId = this._mapId;

        // 源 tileset 与当前不同 → 图形层(z0~4)烘焙成精灵叠加；region 层(z=5)与
        // tileset 无关，永远直接写 $dataMap。自我复制(0)绝不跨图集。
        const srcTs = src.tilesetId;
        const curTs = $dataMap.tilesetId;
        const cross = job.srcMapId !== 0 && srcTs !== curTs;
        // 跨图集时，把复制区图形层收集成一个“补丁”，区域内本地索引 (z*bh+j)*bw+i。
        const patchData = cross ? new Array(bw * bh * 6).fill(0) : null;
        let patchUsed = false;

        for (const z of zList) {
            for (let j = 0; j < bh; j++) {
                for (let i = 0; i < bw; i++) {
                    const sx = sxMin + i, sy = syMin + j;
                    const tx = dx + i, ty = dy + j;
                    if (sx < 0 || sy < 0 || sx >= sw || sy >= sh) continue;
                    const tileId = src.data[tileIndex(sw, sh, sx, sy, z)] || 0;
                    if (cross && z <= 4) {
                        // 图形/阴影层：收进补丁，并在源有内容处擦掉底图避免重影。
                        patchData[(z * bh + j) * bw + i] = tileId;
                        if (tileId !== 0) {
                            patchUsed = true;
                            if (tx >= 0 && ty >= 0 && tx < dw && ty < dh) {
                                const dIndex = tileIndex(dw, dh, tx, ty, z);
                                $dataMap.data[dIndex] = 0;
                                if (perm) $gameSystem.saveDynTile(mapId, dIndex, 0);
                            }
                        }
                    } else {
                        // 同图集 或 region 层：直接写底图数据。
                        if (tx < 0 || ty < 0 || tx >= dw || ty >= dh) continue;
                        const dIndex = tileIndex(dw, dh, tx, ty, z);
                        $dataMap.data[dIndex] = tileId;
                        if (perm) $gameSystem.saveDynTile(mapId, dIndex, tileId);
                    }
                }
            }
        }
        if (cross && patchUsed) {
            const patch = { ts: srcTs, dx: dx, dy: dy, w: bw, h: bh, data: patchData };
            $gameTemp.addOverlayPatch(patch);
            if (perm) $gameSystem.addOverlayPatch(mapId, patch);
        }
        refreshTilemap();
    };

    Game_Map.prototype.changeTileId = function(x, y, z, tileId, permanent) {
        const w = $dataMap.width, h = $dataMap.height;
        if (x < 0 || y < 0 || x >= w || y >= h || z < 0 || z > 5) return;
        const dIndex = tileIndex(w, h, x, y, z);
        $dataMap.data[dIndex] = tileId;
        if (permanent) $gameSystem.saveDynTile(this._mapId, dIndex, tileId);
        refreshTilemap();
    };

    Game_Map.prototype.clearPermanentTiles = function(mapId) {
        mapId = mapId || this._mapId;
        $gameSystem.clearDynTiles(mapId);
        $gameSystem.clearOverlayPatches(mapId);
    };

    // 纯脚本入口：从别的地图复制图块（自动异步加载，无需插件指令）。
    // 用法：$gameMap.copyTilesFromMap(20, {sx1,sy1,sx2,sy2,dx,dy,zList,permanent})
    // 返回 true=源已就绪并已立即复制；false=源在后台加载，加载完会自动复制。
    Game_Map.prototype.copyTilesFromMap = function(srcMapId, job) {
        return DynTile.request(Object.assign({}, job, { srcMapId: srcMapId }));
    };

    // 预加载一张来源地图（异步）；之后 copyTilesFromMap 即可同步立即生效。
    Game_Map.prototype.loadSourceMap = function(mapId) {
        DynTile.loadSource(mapId);
    };

    // 来源地图是否已加载就绪（0=当前地图自身，恒为 true）。
    Game_Map.prototype.isSourceMapReady = function(mapId) {
        return mapId === 0 || !!DynTile._sources[mapId];
    };

    //=========================================================================
    // 跨 tileset 烘焙叠加子系统
    //   引擎 Tilemap 渲染器全局只持有一套图集纹理，无法多 tileset 共存，
    //   所以这里绕开它：把复制区图块用「源 tileset 图片」blt 烘焙成普通 Bitmap，
    //   再作为普通 Sprite 贴上去（走 PIXI 标准渲染，不污染主地图）。
    //   复用引擎保留的 autotile 形状表/静态工具，故 autotile 拼边正确。
    //   ★限制：烘焙是静态的，源 A1 水面/瀑布不会逐帧动画。
    //=========================================================================

    // 取某 tileset 的图集 bitmaps / flags（与 Spriteset_Map.loadTileset 同法）。
    const overlayBitmaps = tilesetId => {
        const ts = $dataTilesets[tilesetId];
        const bitmaps = [];
        if (ts) for (const name of ts.tilesetNames) bitmaps.push(ImageManager.loadTileset(name));
        return bitmaps;
    };
    const overlayFlags = tilesetId => {
        const ts = $dataTilesets[tilesetId];
        return ts ? ts.flags : [];
    };

    // 把单个普通图块画到目标 Bitmap（几何照搬 Tilemap._addNormalTile）。
    const drawNormalTile = (target, bitmaps, tileId, dx, dy, tw, th) => {
        const setNumber = Tilemap.isTileA5(tileId) ? 4 : 5 + Math.floor(tileId / 256);
        const bmp = bitmaps[setNumber];
        if (!bmp) return;
        const sx = ((Math.floor(tileId / 128) % 2) * 8 + (tileId % 8)) * tw;
        const sy = (Math.floor((tileId % 256) / 8) % 16) * th;
        target.blt(bmp, sx, sy, tw, th, dx, dy);
    };

    // 把单个自动元件画到目标 Bitmap（几何照搬 Tilemap._addAutotile，animationFrame=0）。
    const drawAutotile = (target, bitmaps, flags, tileId, dx, dy, tw, th) => {
        const kind = Tilemap.getAutotileKind(tileId);
        const shape = Tilemap.getAutotileShape(tileId);
        const tx = kind % 8;
        const ty = Math.floor(kind / 8);
        let setNumber = 0, bx = 0, by = 0;
        let autotileTable = Tilemap.FLOOR_AUTOTILE_TABLE;
        let isTable = false;
        if (Tilemap.isTileA1(tileId)) {
            setNumber = 0;
            if (kind === 0) { bx = 0; by = 0; }
            else if (kind === 1) { bx = 0; by = 3; }
            else if (kind === 2) { bx = 6; by = 0; }
            else if (kind === 3) { bx = 6; by = 3; }
            else {
                bx = Math.floor(tx / 4) * 8;
                by = ty * 6 + (Math.floor(tx / 2) % 2) * 3;
                if (kind % 2 !== 0) {
                    bx += 6;
                    autotileTable = Tilemap.WATERFALL_AUTOTILE_TABLE;
                }
            }
        } else if (Tilemap.isTileA2(tileId)) {
            setNumber = 1; bx = tx * 2; by = (ty - 2) * 3;
            isTable = Tilemap.isTileA2(tileId) && (flags[tileId] & 0x80);
        } else if (Tilemap.isTileA3(tileId)) {
            setNumber = 2; bx = tx * 2; by = (ty - 6) * 2;
            autotileTable = Tilemap.WALL_AUTOTILE_TABLE;
        } else if (Tilemap.isTileA4(tileId)) {
            setNumber = 3; bx = tx * 2;
            by = Math.floor((ty - 10) * 2.5 + (ty % 2 === 1 ? 0.5 : 0));
            if (ty % 2 === 1) autotileTable = Tilemap.WALL_AUTOTILE_TABLE;
        }
        const bmp = bitmaps[setNumber];
        if (!bmp) return;
        const table = autotileTable[shape];
        if (!table) return;
        const w1 = tw / 2, h1 = th / 2;
        for (let i = 0; i < 4; i++) {
            const qsx = table[i][0], qsy = table[i][1];
            const sx1 = (bx * 2 + qsx) * w1;
            const sy1 = (by * 2 + qsy) * h1;
            const dx1 = dx + (i % 2) * w1;
            const dy1 = dy + Math.floor(i / 2) * h1;
            if (isTable && (qsy === 1 || qsy === 5)) {
                const qsx2 = qsy === 1 ? (4 - qsx) % 4 : qsx;
                const sx2 = (bx * 2 + qsx2) * w1;
                const sy2 = (by * 2 + 3) * h1;
                target.blt(bmp, sx2, sy2, w1, h1, dx1, dy1, w1, h1);
                target.blt(bmp, sx1, sy1, w1, h1 / 2, dx1, dy1 + h1 / 2, w1, h1 / 2);
            } else {
                target.blt(bmp, sx1, sy1, w1, h1, dx1, dy1, w1, h1);
            }
        }
    };

    const drawShadow = (target, shadowBits, dx, dy, tw, th) => {
        if (shadowBits & 0x0f) {
            const w1 = tw / 2, h1 = th / 2;
            for (let i = 0; i < 4; i++) {
                if (shadowBits & (1 << i)) {
                    const dx1 = dx + (i % 2) * w1;
                    const dy1 = dy + Math.floor(i / 2) * h1;
                    target.fillRect(dx1, dy1, w1, h1, "rgba(0,0,0,0.5)");
                }
            }
        }
    };

    // 把一个补丁烘焙成 { lower, upper } 两张 Bitmap（下层在脚下、上层在头顶）。
    const bakePatch = patch => {
        const tw = $gameMap.tileWidth(), th = $gameMap.tileHeight();
        const bitmaps = overlayBitmaps(patch.ts);
        const flags = overlayFlags(patch.ts);
        const lower = new Bitmap(patch.w * tw, patch.h * th);
        const upper = new Bitmap(patch.w * tw, patch.h * th);
        const read = (z, x, y) => patch.data[(z * patch.h + y) * patch.w + x] || 0;
        for (let y = 0; y < patch.h; y++) {
            for (let x = 0; x < patch.w; x++) {
                const dx = x * tw, dy = y * th;
                const place = tid => {
                    if (!Tilemap.isVisibleTile(tid)) return;
                    const tgt = (flags[tid] & 0x10) ? upper : lower; // ★ → 上层
                    if (Tilemap.isAutotile(tid)) drawAutotile(tgt, bitmaps, flags, tid, dx, dy, tw, th);
                    else drawNormalTile(tgt, bitmaps, tid, dx, dy, tw, th);
                };
                place(read(0, x, y));
                place(read(1, x, y));
                drawShadow(lower, read(4, x, y), dx, dy, tw, th);
                place(read(2, x, y));
                place(read(3, x, y));
            }
        }
        return { lower, upper };
    };

    //-------------------------------------------------------------------------
    // Game_System —— 永久叠加补丁（进存档）：mapId -> [patch...]
    //-------------------------------------------------------------------------
    Game_System.prototype.overlayPatchesFor = function(mapId) {
        return this._overlayPatches && this._overlayPatches[mapId];
    };
    Game_System.prototype.addOverlayPatch = function(mapId, patch) {
        if (!this._overlayPatches) this._overlayPatches = {};
        if (!this._overlayPatches[mapId]) this._overlayPatches[mapId] = [];
        this._overlayPatches[mapId].push(patch);
    };
    Game_System.prototype.clearOverlayPatches = function(mapId) {
        if (this._overlayPatches) delete this._overlayPatches[mapId];
    };

    //-------------------------------------------------------------------------
    // Game_Temp —— 当前地图的实时补丁列表（不进存档）
    //   切图/读档按 mapId 守卫位重建：临时补丁随之消失，永久补丁从存档重建。
    //-------------------------------------------------------------------------
    Game_Temp.prototype.overlayPatches = function() {
        if (!this._overlayPatches) this._overlayPatches = [];
        return this._overlayPatches;
    };
    Game_Temp.prototype.addOverlayPatch = function(patch) {
        this.overlayPatches().push(patch);
        this._overlayDirty = true;
    };
    Game_Temp.prototype.isOverlayBuilt = function(mapId) {
        return this._overlayMapId === mapId;
    };
    Game_Temp.prototype.setOverlayDirty = function(v) { this._overlayDirty = v; };
    Game_Temp.prototype.isOverlayDirty = function() { return !!this._overlayDirty; };
    Game_Temp.prototype.rebuildOverlay = function(mapId) {
        this._overlayMapId = mapId;
        const perm = $gameSystem.overlayPatchesFor(mapId);
        this._overlayPatches = perm ? perm.slice() : []; // 永久补丁的浅拷贝（补丁对象只读）
        this._overlayDirty = true;
    };

    //-------------------------------------------------------------------------
    // Spriteset_Map —— 把补丁烘焙成精灵贴到主 Tilemap（随角色 z 排序穿插）
    //-------------------------------------------------------------------------
    const _Spriteset_Map_createTilemap = Spriteset_Map.prototype.createTilemap;
    Spriteset_Map.prototype.createTilemap = function() {
        _Spriteset_Map_createTilemap.call(this);
        this._overlayPatchSprites = [];
        this._overlayBakedCount = 0;
        const mapId = $gameMap.mapId();
        if (!$gameTemp.isOverlayBuilt(mapId)) {
            $gameTemp.rebuildOverlay(mapId);
        }
        this.buildOverlaySprites();
    };

    // 只烘焙尚未烘焙的新补丁（运行时新增补丁也走这里增量处理）。
    Spriteset_Map.prototype.buildOverlaySprites = function() {
        const patches = $gameTemp.overlayPatches();
        for (let i = this._overlayBakedCount; i < patches.length; i++) {
            this._addOverlayPatchSprite(patches[i]);
        }
        this._overlayBakedCount = patches.length;
        $gameTemp.setOverlayDirty(false);
    };

    Spriteset_Map.prototype._addOverlayPatchSprite = function(patch) {
        const lowerSprite = new Sprite();
        const upperSprite = new Sprite();
        lowerSprite.z = 0.5; // 底图地面之上、角色之下
        upperSprite.z = 4.5; // 底图上层之上、上层角色之下
        this._tilemap.addChild(lowerSprite);
        this._tilemap.addChild(upperSprite);
        const rec = { patch, lowerSprite, upperSprite };
        this._overlayPatchSprites.push(rec);
        this._bakeOverlayRec(rec);
    };

    // 图集可能还在异步加载；未就绪则挂监听，加载完再烘焙，避免画出空白。
    Spriteset_Map.prototype._bakeOverlayRec = function(rec) {
        const bitmaps = overlayBitmaps(rec.patch.ts);
        const notReady = bitmaps.filter(b => b && !b.isReady());
        if (notReady.length > 0) {
            notReady[0].addLoadListener(() => {
                if (this._overlayPatchSprites.includes(rec)) this._bakeOverlayRec(rec);
            });
            return;
        }
        const baked = bakePatch(rec.patch);
        rec.lowerSprite.bitmap = baked.lower;
        rec.upperSprite.bitmap = baked.upper;
    };

    const _Spriteset_Map_update = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function() {
        _Spriteset_Map_update.call(this);
        if ($gameTemp.isOverlayDirty()) this.buildOverlaySprites(); // 运行时新增补丁
        this.updateOverlayPatchPositions();
    };

    // 让补丁精灵随地图滚动（与底图瓦片同一取整方式对齐，避免缝隙）。
    Spriteset_Map.prototype.updateOverlayPatchPositions = function() {
        if (!this._overlayPatchSprites || this._overlayPatchSprites.length === 0) return;
        const tw = $gameMap.tileWidth(), th = $gameMap.tileHeight();
        const ox = Math.ceil($gameMap.displayX() * tw);
        const oy = Math.ceil($gameMap.displayY() * th);
        for (const rec of this._overlayPatchSprites) {
            const x = rec.patch.dx * tw - ox;
            const y = rec.patch.dy * th - oy;
            rec.lowerSprite.x = x; rec.lowerSprite.y = y;
            rec.upperSprite.x = x; rec.upperSprite.y = y;
        }
    };

    //-------------------------------------------------------------------------
    // 地图加载时把永久图块改动重新贴回（切图回来 / 读档后生效）
    //-------------------------------------------------------------------------
    const _Scene_Map_onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        const mapId = this._transfer ? $gamePlayer.newMapId() : $gameMap.mapId();
        if ($gameSystem) $gameSystem.applyDynTiles(mapId);
        _Scene_Map_onMapLoaded.call(this);
    };

    //-------------------------------------------------------------------------
    // 自定义等待模式：复制指令在源地图异步加载期间让事件挂起
    //-------------------------------------------------------------------------
    const _Game_Interpreter_updateWaitMode = Game_Interpreter.prototype.updateWaitMode;
    Game_Interpreter.prototype.updateWaitMode = function() {
        if (this._waitMode === "dynTileLoad") {
            if (DynTile.isLoading()) return true; // 继续等待
            this._waitMode = "";
            DynTile.flushDeferred(); // 加载完成，执行排队的复制任务
            return false;
        }
        return _Game_Interpreter_updateWaitMode.call(this);
    };

    //-------------------------------------------------------------------------
    // 插件指令
    //-------------------------------------------------------------------------
    const num = (s, def) => {
        if (s === undefined || s === null || s === "") return def;
        const v = Number(eval(s)); // 允许填公式/变量，如 $gamePlayer.x
        return Number.isFinite(v) ? Math.floor(v) : def;
    };

    PluginManager.registerCommand(PLUGIN_NAME, "setRegion", args => {
        const x = num(args.x, 0);
        const y = num(args.y, 0);
        const region = num(args.regionId, 0);
        const permanent = args.permanent === "true";
        $gameMap.setRegionId(x, y, region, permanent);
    });

    PluginManager.registerCommand(PLUGIN_NAME, "setRegionArea", args => {
        const x1 = num(args.x1, 0);
        const y1 = num(args.y1, 0);
        const x2 = num(args.x2, 0);
        const y2 = num(args.y2, 0);
        const region = num(args.regionId, 0);
        const permanent = args.permanent === "true";
        $gameMap.setRegionIdArea(x1, y1, x2, y2, region, permanent);
    });

    PluginManager.registerCommand(PLUGIN_NAME, "clearRegion", args => {
        const x = num(args.x, 0);
        const y = num(args.y, 0);
        $gameMap.clearRegionId(x, y, args.scope || "both");
    });

    PluginManager.registerCommand(PLUGIN_NAME, "clearAllTemp", () => {
        $gameMap.clearTempRegions();
    });

    PluginManager.registerCommand(PLUGIN_NAME, "clearAllPermanent", args => {
        const mapId = num(args.mapId, 0);
        $gameMap.clearPermanentRegions(mapId || $gameMap.mapId());
    });

    // "0 1 2 3" / "2,3" / "" / "all" -> 图层数组
    const parseZList = s => {
        if (!s || !String(s).trim() || String(s).trim().toLowerCase() === "all") {
            return [0, 1, 2, 3, 4, 5];
        }
        return String(s)
            .split(/[\s,]+/)
            .map(t => parseInt(t, 10))
            .filter(n => Number.isInteger(n) && n >= 0 && n <= 5);
    };

    PluginManager.registerCommand(PLUGIN_NAME, "copyTiles", function(args) {
        const job = {
            srcMapId: num(args.srcMapId, 0),
            sx1: num(args.sx1, 0),
            sy1: num(args.sy1, 0),
            sx2: num(args.sx2, 0),
            sy2: num(args.sy2, 0),
            dx: num(args.dx, 0),
            dy: num(args.dy, 0),
            zList: parseZList(args.zList),
            permanent: args.permanent === "true"
        };
        // 源未加载时转入异步等待；this 为 Game_Interpreter，可挂起本事件。
        if (!DynTile.request(job)) this.setWaitMode("dynTileLoad");
    });

    PluginManager.registerCommand(PLUGIN_NAME, "changeTile", args => {
        const x = num(args.x, 0);
        const y = num(args.y, 0);
        const z = num(args.z, 0);
        const tileId = num(args.tileId, 0);
        const permanent = args.permanent === "true";
        $gameMap.changeTileId(x, y, z, tileId, permanent);
    });

    PluginManager.registerCommand(PLUGIN_NAME, "preloadMap", function(args) {
        const mapId = num(args.mapId, 0);
        if (mapId > 0 && !DynTile._sources[mapId]) {
            DynTile.loadSource(mapId);
            this.setWaitMode("dynTileLoad");
        }
    });

    PluginManager.registerCommand(PLUGIN_NAME, "clearAllPermanentTiles", args => {
        const mapId = num(args.mapId, 0);
        $gameMap.clearPermanentTiles(mapId || $gameMap.mapId());
    });
})();
