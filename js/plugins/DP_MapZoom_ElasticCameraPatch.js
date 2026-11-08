//=============================================================================
// DP_MapZoom_ElasticCameraPatch.js
//=============================================================================
/*:
 * @plugindesc [v1.2] DP_MapZoom 补丁 - 弹性镜头移动 + 镜头墙（参考 Drill_LayerCamera 实现）
 * @author patch by Claude, 算法参考 Drill_up / drowsepost
 *
 * @param 默认开启弹性镜头
 * @type boolean
 * @on 开启
 * @off 关闭
 * @desc 进入地图时是否默认启用弹性镜头跟随。
 * @default true
 *
 * @param 控制开关
 * @type switch
 * @desc 大于0时，由该开关控制弹性镜头开关（覆盖"默认开启"）。0表示不使用开关。
 * @default 0
 *
 * @param 弹性模式移动速度
 * @type number
 * @min 1
 * @desc 比例除数，值越小镜头追得越快。Drill默认14。
 * @default 14
 *
 * @param 弹性模式镜头速度上限
 * @type number
 * @min 1
 * @desc 镜头每帧最大移动像素（屏幕像素，已考虑缩放）。防止瞬移时镜头甩太快。
 * @default 24
 *
 * @help
 * =============================================================================
 * 这是什么
 * =============================================================================
 * 这是一个【挂在 DP_MapZoom 之上】的补丁，给 DP_MapZoom 补充两个 Drill_LayerCamera
 * 才有的功能：
 *   1. 弹性镜头移动（镜头平滑/弹性地追向玩家，而不是默认的硬跟随）
 *   2. 镜头墙（用事件挡住镜头单向移动，做隐藏房间）
 *
 * 它【不替换】DP_MapZoom。缩放仍然完全由 DP_MapZoom 负责，
 * 所以你现有的 dpZoom / <zoomScale> / 弹幕系统对 $gameScreen.zoomScale() 的依赖
 * 全部保持不变，不会被破坏。本补丁只接管"镜头平移"这一件事。
 *
 * =============================================================================
 * 安装
 * =============================================================================
 * 1. 必须放在 DP_MapZoom 的【下面】（后面加载）。
 * 2. 因为它依赖 DP_MapZoom 暴露的 drowsepost.camera 与 zoom-aware 的坐标方法。
 * 3. 不需要存档数据，对旧存档安全（无新增存储变量）。
 *
 * =============================================================================
 * 弹性镜头
 * =============================================================================
 * - 启用后，镜头会用"距离/速度比"的方式平滑追向当前镜头目标
 *   （DP 的 camera.target：默认是玩家，dpFocus / <camTarget> 指定的事件也支持）。
 * - 速度公式与 Drill 一致：每帧位移 = min( 剩余距离 / 移动速度, 速度上限 )。
 * - 镜头墙只在弹性镜头启用时生效（和 Drill 一样）。
 *
 * 开关方式（优先级从高到低）：
 *   (1) 地图备注 <弹性镜头:关> 或 <弹性镜头:开>  —— 单地图强制。
 *   (2) 插件参数"控制开关"（>0 时由该开关决定）。
 *   (3) 插件参数"默认开启弹性镜头"。
 *
 * 注意：和 Drill 一样，启用弹性镜头时，事件指令"移动>滚动地图(卷动地图)"
 * 执行期间镜头交还给该指令，指令结束后镜头会平滑弹回玩家中心。
 *
 * 兼容 LiuYue_TheWorld：调用 Zzy.TWF.ToTheWorld(true) 后，弹性逼近会暂停，
 * 镜头平移交还给 DP_MapZoom 原本的硬跟随。地图完全暂停时镜头不动；
 * 若玩家被设置为可在时停中行动，镜头仍会以原本方式跟随玩家。
 *
 * =============================================================================
 * 镜头墙
 * =============================================================================
 * 在事件里写注释（注释指令，code 108/408），两种写法都支持：
 *
 *   写法A（推荐，简洁）：
 *     <镜头墙:上>
 *     <镜头墙:下>
 *     <镜头墙:左>
 *     <镜头墙:右>
 *     <镜头墙:左右>      (一个事件可同时含多面墙)
 *
 *   写法B（兼容 Drill 注释格式）：
 *     =>地图镜头 : 设置镜头墙 : 上
 *     =>地图镜头 : 设置镜头墙 : 下
 *     =>地图镜头 : 设置镜头墙 : 左
 *     =>地图镜头 : 设置镜头墙 : 右
 *
 * 规则（与 Drill 相同）：
 *   - 镜头墙是"单向"阻挡：玩家越过墙线后，镜头不再受该墙阻挡。
 *   - 注释绑定在事件页上，切换到没有该注释的事件页 = 关闭这面墙。
 *   - 一个房间四面围起来需要四个事件；隐藏房间通常一面墙即可。
 *   - "左"墙会把镜头钉在"墙位于屏幕右缘"的位置（即只让你看到墙左侧的区域），
 *     其余方向同理。摆放位置不对会失效，原理同 Drill。
 *
 * =============================================================================
 */

(function() {
    "use strict";

    var PN = "DP_MapZoom_ElasticCameraPatch";
    var params = PluginManager.parameters(PN);
    var P_defaultEnabled = String(params["默认开启弹性镜头"] || "true") === "true";
    var P_switchId       = Number(params["控制开关"] || 0);
    var P_speedRatio     = Number(params["弹性模式移动速度"] || 14);
    var P_speedMax       = Number(params["弹性模式镜头速度上限"] || 24);
    var DPCW_SNAP_PX     = 1.0;   // 吸附死区(屏幕像素)：与目标差距小于此值时直接到位，避免末端亚像素蠕动

    //=========================================================================
    // 开关判定
    //=========================================================================
    Game_Map.prototype.dpcw_isEnabled = function() {
        if (typeof Imported !== "object" || !Imported.DP_MapZoom) { return false; }
        // > 地图备注强制
        if (typeof $dataMap === "object" && $dataMap && $dataMap.meta) {
            var m1 = $dataMap.meta["弹性镜头"];
            if (m1 === "关" || m1 === "off") { return false; }
            if (m1 === "开" || m1 === "on")  { return true; }
        }
        // > 控制开关
        if (P_switchId > 0) { return $gameSwitches.value(P_switchId); }
        // > 默认
        return P_defaultEnabled;
    };

    // * LiuYue_TheWorld 时停判定。
    //   只判断全局时停状态，不判断玩家/事件是否免疫；免疫对象的移动
    //   会由 DP_MapZoom 原本的 updateScroll 继续驱动镜头。
    Game_Map.prototype.dpcw_isTimeStopped = function() {
        if (typeof $gameSystem !== "object" || !$gameSystem) { return false; }
        if (typeof $gameSystem.getZzyTWFIsSetup !== "function" ||
            typeof $gameSystem.getZzyTWFTheWorlding !== "function") {
            return false;
        }
        return $gameSystem.getZzyTWFIsSetup() && $gameSystem.getZzyTWFTheWorlding();
    };

    //=========================================================================
    // 弹性镜头 - 每帧追向目标
    //=========================================================================
    // * 取得当前镜头目标（沿用 DP_MapZoom 的 camera.target）
    Game_Map.prototype.dpcw_cameraTarget = function() {
        var t = null;
        if (typeof drowsepost === "object" && drowsepost.camera) {
            t = drowsepost.camera.target;   // 玩家 或 dp_target 事件
        }
        if (!t) { t = $gamePlayer; }
        return t;
    };

    // * 计算"使目标居中"的理想 display 坐标（含 DP 的 _dp_pan 偏移）
    //   使用 DP 改写过的、含缩放的 screenTileX/Y，保证与 DP 坐标系一致。
    Game_Map.prototype.dpcw_desiredDisplay = function() {
        var target = this.dpcw_cameraTarget();
        var cx = (this.screenTileX() - 1) / 2.0;
        var cy = (this.screenTileY() - 1) / 2.0;
        var pan = this._dp_pan || { x: 0, y: 0 };
        return {
            x: target._realX + (pan.x || 0) - cx,
            y: target._realY + (pan.y || 0) - cy
        };
    };

    // * 弹性逼近：从 cur 平滑移动到 desired（公式同 Drill）
    Game_Map.prototype.dpcw_approach = function(cur, desired, pxPerTile, isLoop, loopTiles) {
        var dist = desired - cur;
        if (isLoop) {
            // > 循环维度取最短路径
            dist = dist % loopTiles;
            if (dist >  loopTiles / 2) { dist -= loopTiles; }
            if (dist < -loopTiles / 2) { dist += loopTiles; }
        }
        if (dist === 0) { return cur; }

        var pxDist  = Math.abs(dist) * pxPerTile;                       // 屏幕像素距离
        if (pxDist <= DPCW_SNAP_PX) { return desired; }                 // 吸附死区：足够近直接到位，免去末端蠕动抖动
        var pxSpeed = Math.min(pxDist / P_speedRatio, P_speedMax);     // 屏幕像素速度（去掉最小速度下限，末端自然减速；收敛由吸附死区保证）
        var tileSpeed = pxSpeed / pxPerTile;                           // 换回图块/帧
        return cur + (dist > 0 ? 1 : -1) * tileSpeed;
    };

    // * 主帧刷新：弹性 + 镜头墙
    Game_Map.prototype.dpcw_updateCamera = function() {
        // > 时停期间禁用弹性逼近；正常入口会改用 DP_MapZoom 原本的硬跟随
        if (this.dpcw_isTimeStopped()) { return; }

        // > 让"卷动地图"事件指令期间镜头交还给指令
        if (this._scrollRest > 0) { return; }

        var des = this.dpcw_desiredDisplay();
        des = this.dpcw_applyWall(des.x, des.y);   // 镜头墙夹取理想位置

        var zoom = (typeof $gameScreen === "object" && $gameScreen.zoomScale()) || 1;
        var pxW = this.tileWidth()  * zoom;
        var pxH = this.tileHeight() * zoom;

        var newX = this.dpcw_approach(this._displayX, des.x, pxW, this.isLoopHorizontal(), this.width());
        var newY = this.dpcw_approach(this._displayY, des.y, pxH, this.isLoopVertical(),  this.height());
        // 像素吸附：把镜头对齐到整数屏幕像素，使瓦片与“被核心圆整过的玩家精灵”同处一个像素网格，消除settle抖动
        newX = Math.round(newX * pxW) / pxW;
        newY = Math.round(newY * pxH) / pxH;
        this.setDisplayPos(newX, newY);
    };

    // * 立刻对齐到目标（切图、传送后用，避免从0慢慢拖过来）
    Game_Map.prototype.dpcw_snap = function() {
        var des = this.dpcw_desiredDisplay();
        des = this.dpcw_applyWall(des.x, des.y);
        var zoom = (typeof $gameScreen === "object" && $gameScreen.zoomScale()) || 1;
        var pxW = this.tileWidth()  * zoom;
        var pxH = this.tileHeight() * zoom;
        this.setDisplayPos(Math.round(des.x * pxW) / pxW, Math.round(des.y * pxH) / pxH);
    };

    //=========================================================================
    // 镜头墙 - 夹取理想镜头位置（移植自 Drill 的 drill_getAutoPosition 墙部分）
    //=========================================================================
    Game_Map.prototype.dpcw_applyWall = function(xx, yy) {
        var walls = $gameTemp._dpcw_wallEvents;
        if (!walls || walls.length === 0) { return { x: xx, y: yy }; }

        var vw = this.screenTileX();
        var vh = this.screenTileY();
        var halfW = vw / 2;     // 左右墙：垂直方向夹取量 / 上下墙：水平半幅
        var halfH = vh / 2;
        var cx = (vw - 1) / 2.0;
        var cy = (vh - 1) / 2.0;

        for (var i = 0; i < walls.length; i++) {
            var e = walls[i];
            if (!e || e._erased) { continue; }
            var dirs = e._dpcw_wall;
            if (!dirs || dirs.length === 0) { continue; }

            // > 事件对齐到"使其居中"的 display 坐标
            var rxx = e._realX - cx;
            var ryy = e._realY - cy;

            // > 左右墙
            for (var j = 0; j < dirs.length; j++) {
                var d = dirs[j];
                if (d === "左") {
                    if (this.dpcw_inX(xx, rxx - halfW, rxx) &&
                        this.dpcw_inY(yy, ryy - halfH, ryy + halfH)) {
                        xx = rxx - halfW; break;
                    }
                } else if (d === "右") {
                    if (this.dpcw_inX(xx, rxx, rxx + halfW) &&
                        this.dpcw_inY(yy, ryy - halfH, ryy + halfH)) {
                        xx = rxx + halfW; break;
                    }
                }
            }
            // > 上下墙
            for (var k = 0; k < dirs.length; k++) {
                var d2 = dirs[k];
                if (d2 === "上") {
                    if (this.dpcw_inX(xx, rxx - halfW, rxx + halfW) &&
                        this.dpcw_inY(yy, ryy - halfH, ryy)) {
                        yy = ryy - halfH; break;
                    }
                } else if (d2 === "下") {
                    if (this.dpcw_inX(xx, rxx - halfW, rxx + halfW) &&
                        this.dpcw_inY(yy, ryy, ryy + halfH)) {
                        yy = ryy + halfH; break;
                    }
                }
            }
        }
        return { x: xx, y: yy };
    };

    Game_Map.prototype.dpcw_inX = function(v, min, max) {
        if (this.isLoopHorizontal()) {
            return $gameTemp.dpcw_inLoopRange(v, min, max, this.width());
        }
        return v >= min && v <= max;
    };
    Game_Map.prototype.dpcw_inY = function(v, min, max) {
        if (this.isLoopVertical()) {
            return $gameTemp.dpcw_inLoopRange(v, min, max, this.height());
        }
        return v >= min && v <= max;
    };

    // * 循环维度的范围判定（移植自 Drill drill_LCa_Math1D_isValueInLoopRange）
    Game_Temp.prototype.dpcw_inLoopRange = function(cur, min, max, loop) {
        if (max - min >= loop) { return true; }
        cur = ((cur % loop) + loop) % loop;
        min = ((min % loop) + loop) % loop;
        max = ((max % loop) + loop) % loop;
        if (min === max) { return cur === min; }
        if (min < max) {
            if (cur < min) { return false; }
            if (cur > max) { return false; }
        }
        if (min > max) {
            if (cur > min && cur < max) { return false; }
        }
        return true;
    };

    //=========================================================================
    // 镜头墙 - 事件容器与注释解析（结构移植自 Drill）
    //=========================================================================
    var _dpcw_temp_init = Game_Temp.prototype.initialize;
    Game_Temp.prototype.initialize = function() {
        _dpcw_temp_init.call(this);
        this._dpcw_wallEvents = [];
        this._dpcw_needRestat = true;
    };

    var _dpcw_map_setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function(mapId) {
        if ($gameTemp) {
            $gameTemp._dpcw_wallEvents = [];
            $gameTemp._dpcw_needRestat = true;
        }
        _dpcw_map_setup.call(this, mapId);
    };

    if (typeof Spriteset_Map !== "undefined") {
        var _dpcw_smap_createCharacters = Spriteset_Map.prototype.createCharacters;
        Spriteset_Map.prototype.createCharacters = function() {
            if ($gameTemp) {
                $gameTemp._dpcw_wallEvents = [];
                $gameTemp._dpcw_needRestat = true;
            }
            _dpcw_smap_createCharacters.call(this);
        };
    }

    // * 解析注释文本，把方向塞进 arr
    var dpcw_pushDirs = function(str, arr) {
        var all = ["上", "下", "左", "右"];
        for (var i = 0; i < all.length; i++) {
            if (str.indexOf(all[i]) >= 0 && arr.indexOf(all[i]) < 0) {
                arr.push(all[i]);
            }
        }
    };
    var dpcw_parseWallComment = function(text, arr) {
        if (typeof text !== "string") { return; }
        // > 写法A： <镜头墙:上下左右>
        var m = /<镜头墙\s*[:：]\s*([上下左右]+)\s*>/.exec(text);
        if (m) { dpcw_pushDirs(m[1], arr); }
        // > 写法B（Drill）： =>地图镜头 : 设置镜头墙 : 上
        if (text.indexOf("设置镜头墙") >= 0) {
            var parts = text.split(/\s+/);
            var idx = parts.indexOf("设置镜头墙");
            for (var k = idx + 1; k < parts.length; k++) {
                if (/[上下左右]/.test(parts[k])) { dpcw_pushDirs(parts[k], arr); break; }
            }
        }
    };

    var _dpcw_setupPage = Game_Event.prototype.setupPageSettings;
    Game_Event.prototype.setupPageSettings = function() {
        _dpcw_setupPage.call(this);
        this._dpcw_wall = [];                       // 不跨事件页
        var page = this.page();
        if (page) {
            var list = this.list() || [];
            for (var i = 0; i < list.length; i++) {
                var cmd = list[i];
                if (cmd && (cmd.code === 108 || cmd.code === 408)) {
                    dpcw_parseWallComment(cmd.parameters[0], this._dpcw_wall);
                }
            }
            if (this._dpcw_wall.length > 0 && $gameTemp) {
                $gameTemp._dpcw_needRestat = true;
            }
        }
    };

    // * 重新统计含墙事件
    Game_Map.prototype.dpcw_updateRestat = function() {
        if (!$gameTemp || !$gameTemp._dpcw_needRestat) { return; }
        $gameTemp._dpcw_needRestat = false;
        var arr = [];
        var evs = this._events || [];
        for (var i = 0; i < evs.length; i++) {
            var e = evs[i];
            if (!e || e._erased) { continue; }
            if (e._dpcw_wall && e._dpcw_wall.length > 0) { arr.push(e); }
        }
        $gameTemp._dpcw_wallEvents = arr;
    };

    var _dpcw_map_update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _dpcw_map_update.call(this, sceneActive);
        this.dpcw_updateRestat();
    };

    //=========================================================================
    // 接管镜头平移：禁用 DP 的硬跟随，改走弹性
    //=========================================================================
    // * 玩家跟随：平时由弹性镜头处理；时停时退回 DP_MapZoom 原本硬跟随
    var _dpcw_player_updateScroll = Game_Player.prototype.updateScroll;
    Game_Player.prototype.updateScroll = function(lastScrolledX, lastScrolledY) {
        if (typeof $gameMap === "object" && $gameMap && $gameMap.dpcw_isEnabled && $gameMap.dpcw_isEnabled()) {
            if ($gameMap.dpcw_isTimeStopped && $gameMap.dpcw_isTimeStopped()) {
                _dpcw_player_updateScroll.call(this, lastScrolledX, lastScrolledY);
            } else {
                $gameMap.dpcw_updateCamera();
            }
            return;
        }
        _dpcw_player_updateScroll.call(this, lastScrolledX, lastScrolledY);
    };

    // * 事件跟随（dpFocus / camTarget 指定事件时）也使用相同退回规则
    var _dpcw_event_updateScroll = Game_Event.prototype.updateScroll;
    Game_Event.prototype.updateScroll = function(lastScrolledX, lastScrolledY) {
        if (typeof $gameMap === "object" && $gameMap && $gameMap.dpcw_isEnabled && $gameMap.dpcw_isEnabled()) {
            if ($gameMap.dpcw_isTimeStopped && $gameMap.dpcw_isTimeStopped() && _dpcw_event_updateScroll) {
                _dpcw_event_updateScroll.call(this, lastScrolledX, lastScrolledY);
            }
            return; // 非时停时，镜头由玩家帧里的 dpcw_updateCamera 统一驱动
        }
        if (_dpcw_event_updateScroll) {
            _dpcw_event_updateScroll.call(this, lastScrolledX, lastScrolledY);
        }
    };

    // * 让 DP 的 camera.center 在启用时不再直接顶动 display（避免与弹性打架）。
    //   force_center=true 的传送强制居中仍放行。
    if (typeof drowsepost === "object" && drowsepost.camera) {
        var _dpcw_center = drowsepost.camera.center;
        drowsepost.camera.center = function(panX, panY, force_center) {
            if (!force_center && typeof $gameMap === "object" && $gameMap &&
                $gameMap.dpcw_isEnabled && $gameMap.dpcw_isEnabled() &&
                (!$gameMap.dpcw_isTimeStopped || !$gameMap.dpcw_isTimeStopped())) {
                return;
            }
            return _dpcw_center.call(this, panX, panY, force_center);
        };
    }

    // * 进入地图：立刻对齐，避免从默认位置慢慢拖过来
    var _dpcw_scene_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _dpcw_scene_start.call(this);
        if (typeof $gameMap === "object" && $gameMap && $gameMap.dpcw_isEnabled && $gameMap.dpcw_isEnabled()) {
            // createCharacters 会清空墙缓存；必须先重建，再计算返回地图的镜头位置。
            $gameMap.dpcw_updateRestat();
            $gameMap.dpcw_snap();
        }
    };

}());
