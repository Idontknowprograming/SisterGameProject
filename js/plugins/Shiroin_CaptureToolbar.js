//=============================================================================
// Shiroin_CaptureToolbar.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [v1.6.2] 跨场景顶部截图与MP4录制工具栏
 * @author Shiroin
 * @base Drill_PictureSnapShot
 * @orderAfter Drill_PictureSnapShot
 *
 * @help
 * =============================================================================
 * 这是 Drill_PictureSnapShot 的玩家操作界面。
 *
 * 顶部中央有一个常驻的透明触发热区，只使用pointerenter/pointerleave和
 * pointerdown边界事件，不监听pointermove，也没有逐帧更新或轮询。
 * 工具栏只在调用时创建DOM，收起动画结束后会移除DOM和临时监听器。
 * 截图捕获PIXI场景，视频捕获游戏Canvas，
 * 因此本工具栏不会出现在截图或录像中。
 * 工具栏显示期间会跟随游戏Canvas的实际显示比例缩放和重新定位。
 * 右上角X会关闭本局工具栏及触发热区，读档时沿用下方启用脚本恢复。
 * 拍照、录制及保存期间X暂不可用，操作结束后可关闭。
 *
 * NW.js桌面版支持截图保存和MP4录像。Android截图保存到
 * Documents/sister_save/snapshot，并禁用录像。普通Web环境只创建内存快照；
 * 所有平台的快照都仍可设为$gameScreen.picture使用。
 *
 * 脚本API：
 *   $gameTemp.drill_PSS_setCaptureToolbarEnabled(true/false);
 *   $gameTemp.drill_PSS_isCaptureToolbarEnabled();
 *   $gameTemp.drill_PSS_showCaptureToolbar();
 *   $gameTemp.drill_PSS_hideCaptureToolbar();
 *   $gameTemp.drill_PSS_isCaptureToolbarVisible();
 *   $gameTemp.drill_PSS_getCaptureToolbarStatus();
 *   $gameTemp.drill_PSS_getCaptureToolbarText(key);
 *   $gameTemp.drill_PSS_finishCaptureToolbarScreenshot();
 *
 * 工具栏默认关闭。读档或获得道具后可执行：
 *   $gameTemp.drill_PSS_setCaptureToolbarEnabled(
 *       $gameParty.hasItem($dataItems[14])
 *   );
 *
 * 状态API返回：
 *   {
 *     visible: true/false,
 *     state: "hidden" | "idle" | "screenshotting" | "starting" |
 *            "recording" | "saving" | "screenshot-saved" | "snapshot-ready" |
 *            "video-saved" | "error",
 *     mode: "none" | "screenshot" | "video"
 *   }
 *
 * 示例：
 *   const status = $gameTemp.drill_PSS_getCaptureToolbarStatus();
 *   if (status.visible) { console.log("工具栏已经显示"); }
 *   if (status.state === "recording") { console.log("正在录制"); }
 *   if (status.state === "screenshotting") { console.log("正在截图"); }
 *
 * 多语言文本API：
 *   工具栏每次绘制文字时都会调用：
 *   $gameTemp.drill_PSS_getCaptureToolbarText(key)
 *
 *   可用键值：
 *   record、screenshot、stop、view、starting、saving、
 *   screenshotting、captured、failed、duration。
 *
 *   duration默认文本为"已录制 {time}"，其中{time}会被实际时长替换。
 *
 *   默认已接入：
 *   window.mapCommonEventDialogue.magicCamera[String(key)]
 *   数组文本会使用换行符拼接；键不存在时回退到插件默认文本。
 *
 * 相机动作公共事件：
 *   成功启动录像时调用：
 *   $gameMap.steupCEQJ(11, 1, { cameraType: "video" });
 *
 *   开始拍照时调用：
 *   $gameMap.steupCEQJ(11, 1, { cameraType: "screenshot" });
 *
 *   在公共事件11的脚本中可通过 this.cameraType 读取上述值。
 *   screenshot分支需要在希望拍照的位置依次调用：
 *     $gameTemp.drill_PSS_createSnapshot();
 *     $gameTemp.drill_PSS_finishCaptureToolbarScreenshot();
 *
 *   finish API检测到新快照后才会保存文件，并将工具栏切换为“查看文件”。
 *   在公共事件等待多久都没有关系；不要在createSnapshot之前调用finish API。
 *
 * 装饰图片：
 *   默认读取 img/system/CaptureToolbarDecoration.png。
 *   支持MZ加密部署的.png_；参数可省略后缀，或填写.png / .png_。
 *   文件不存在时显示内置CSS占位图，不会影响工具栏使用。
 *
 * @param autoHideSeconds
 * @text 自动收起秒数
 * @type number
 * @decimals 1
 * @min 0.5
 * @default 3
 *
 * @param edgeHideSeconds
 * @text 边界触发收起秒数
 * @desc 鼠标离开热区/工具栏，或触屏下一次点到外部后，延迟多久收起。
 * @type number
 * @decimals 1
 * @min 0.1
 * @default 0.5
 *
 * @param activationWidth
 * @text 顶部触发区宽度
 * @desc 游戏逻辑像素。触发区位于游戏Canvas顶部中央。
 * @type number
 * @min 48
 * @default 320
 *
 * @param activationHeight
 * @text 顶部触发区高度
 * @desc 游戏逻辑像素。该透明区域会拦截对应位置的鼠标/触屏输入。
 * @type number
 * @min 8
 * @default 24
 *
 * @param decorationImage
 * @text 左侧装饰图片文件名
 * @desc 位于img/system；可省略后缀，支持.png / .png_和MZ加密部署。缺失时显示占位图。
 * @default CaptureToolbarDecoration.png
 *
 * @param recordText
 * @text 录制按钮文字
 * @default 录制视频
 *
 * @param screenshotText
 * @text 截图按钮文字
 * @default 全屏截图
 *
 * @param stopText
 * @text 停止按钮文字
 * @default 结束录制
 *
 * @param viewText
 * @text 查看按钮文字
 * @default 查看文件
 *
 * @command show
 * @text 显示截图/录制工具栏
 * @desc 从游戏画布顶部展开工具栏。录制期间显示结束录制按钮。
 *
 * @command hide
 * @text 收起截图/录制工具栏
 * @desc 只收起界面，不会停止正在进行的录制。
 */

(() => {
    "use strict";

    const pluginName = "Shiroin_CaptureToolbar";
    // ★Shiroin: 拍照演出走 $gameMap.steupCEQJ 排队的公共事件，而该队列只在
    //   Scene_Map.updateMain → $gameMap.update() 里消费。看门狗用来兜住"演出永远跑不起来"
    //   的情况（例如按下后立刻切场景），避免工具栏卡在"正在拍照…"。
    const SCREENSHOT_WATCHDOG_INTERVAL = 250;
    const SCREENSHOT_WATCHDOG_TIMEOUT = 8000;
    const parameters = PluginManager.parameters(pluginName);
    const settings = Object.freeze({
        autoHideMs: Math.max(500, Number(parameters.autoHideSeconds || 3) * 1000),
        edgeHideMs: Math.max(100, Number(parameters.edgeHideSeconds || 0.5) * 1000),
        activationWidth: Math.max(48, Number(parameters.activationWidth || 320)),
        activationHeight: Math.max(8, Number(parameters.activationHeight || 24)),
        decorationImage: String(
            parameters.decorationImage || "CaptureToolbarDecoration.png"
        ).trim(),
        recordText: String(parameters.recordText || "录制视频"),
        screenshotText: String(parameters.screenshotText || "全屏截图"),
        stopText: String(parameters.stopText || "结束录制"),
        viewText: String(parameters.viewText || "查看文件")
    });

    class CaptureToolbarController {
        constructor(config) {
            this.config = config;
            this.root = null;
            this.actions = null;
            this.closeButton = null;
            this.hint = null;
            this.durationElement = null;
            this.state = "hidden";
            this.mode = "none";
            this.displayed = false;
            this.lastOutputPath = "";
            this.hideTimer = 0;
            this.removeTimer = 0;
            this.monitorTimer = 0;
            this.durationTimer = 0;
            this.screenshotBaseline = null;
            this.fallbackRecordingStartedAt = 0;
            this.textProviderErrorWarned = false;
            this.hovered = false;
            this.boundUpdatePosition = null;
            this.canvasResizeObserver = null;
            this.lastCanvasWidth = 0;
            this.lastCanvasHeight = 0;
            this.positionRequestId = 0;
            this.screenshotWatchdog = 0;
            this.screenshotWatchdogStartedAt = 0;
            this.pendingCameraInterpreter = null;
            this.activationZone = null;
            this.activationHovered = false;
            this.touchLatched = false;
            this.revealSource = "manual";
            this.boundActivationPosition = null;
            this.boundOutsidePointerDown = null;
            this.activationResizeObserver = null;
            this.decorationCleanup = null;
        }

        // ★Shiroin: 是否处于"地图公共事件能真正被消费"的场景。
        //   $gameMap.update() 全局只有 Scene_Map.updateMain 调用（rmmz_scenes.js），
        //   所以非 Scene_Map 时 steupCEQJ 排进去的解释器只会一直躺在队列里。
        isMapScene() {
            return typeof Scene_Map !== "undefined" &&
                typeof SceneManager !== "undefined" &&
                SceneManager._scene instanceof Scene_Map;
        }

        isMapSceneActive() {
            return this.isMapScene() && !SceneManager.isSceneChanging();
        }

        isDesktopAvailable() {
            return typeof Utils !== "undefined" && Utils.isNwjs && Utils.isNwjs();
        }

        hasSnapshotBackend() {
            return typeof $gameTemp !== "undefined" && $gameTemp &&
                typeof $gameTemp.drill_PSS_createSnapshot === "function";
        }

        hasVideoBackend() {
            return this.hasSnapshotBackend() &&
                typeof $gameTemp.drill_PSS_startFullScreenVideoRecording === "function" &&
                typeof $gameTemp.drill_PSS_getVideoRecordingState === "function";
        }

        canSaveLocally() {
            return this.isDesktopAvailable();
        }

        canSaveAndroidSnapshot() {
            return this.hasSnapshotBackend() &&
                typeof $gameTemp.drill_PSS_isAndroidSnapshotSaveSupported === "function" &&
                $gameTemp.drill_PSS_isAndroidSnapshotSaveSupported() &&
                typeof $gameTemp.drill_PSS_saveSnapshotAndroid === "function";
        }

        canOpenAndroidSnapshotDirectory() {
            return this.canSaveAndroidSnapshot() &&
                typeof $gameTemp.drill_PSS_openAndroidSnapshotDirectory === "function";
        }

        isFeatureEnabled() {
            return typeof $gameTemp !== "undefined" && $gameTemp &&
                $gameTemp._drill_PSS_captureToolbarEnabled === true;
        }

        refreshFeatureEnabledState() {
            if (!this.isFeatureEnabled()) {
                this.activationHovered = false;
                this.touchLatched = false;
                if (this.displayed) {
                    this.hide(false);
                }
            }
            this.updateActivationPosition();
        }

        isVisible() {
            return this.displayed;
        }

        getActiveVideoState() {
            if (!this.hasVideoBackend() ||
                typeof $gameTemp.drill_PSS_getVideoRecordingState !== "function") {
                return "";
            }
            const state = $gameTemp.drill_PSS_getVideoRecordingState();
            const stateMap = {
                starting: "starting",
                recording: "recording",
                saving: "saving"
            };
            return stateMap[state] || "";
        }

        getStatus() {
            const activeVideoState = this.getActiveVideoState();
            if (activeVideoState) {
                return Object.freeze({
                    visible: this.displayed,
                    state: activeVideoState,
                    mode: "video"
                });
            }
            if (this.state === "screenshotting") {
                return Object.freeze({
                    visible: this.displayed,
                    state: "screenshotting",
                    mode: "screenshot"
                });
            }
            if (!this.displayed) {
                return Object.freeze({
                    visible: false,
                    state: "hidden",
                    mode: "none"
                });
            }
            return Object.freeze({
                visible: true,
                state: this.state,
                mode: this.mode
            });
        }

        getDefaultText(key) {
            const defaultTexts = {
                record: this.config.recordText,
                screenshot: this.config.screenshotText,
                stop: this.config.stopText,
                view: this.config.viewText,
                starting: "正在开始录制…",
                saving: "正在保存…",
                screenshotting: "正在截图…",
                captured: "截图已缓存",
                failed: "操作失败",
                duration: "已录制 {time}"
            };
            return Object.prototype.hasOwnProperty.call(defaultTexts, key)
                ? defaultTexts[key]
                : String(key || "");
        }

        getText(key) {
            const provider = typeof $gameTemp !== "undefined" && $gameTemp
                ? $gameTemp.drill_PSS_getCaptureToolbarText
                : null;
            if (typeof provider === "function") {
                try {
                    const value = provider.call($gameTemp, key);
                    if (value !== undefined && value !== null) {
                        return String(value);
                    }
                } catch (error) {
                    if (!this.textProviderErrorWarned) {
                        this.textProviderErrorWarned = true;
                        console.warn(
                            "[Shiroin_CaptureToolbar] 多语言文本API执行失败，将使用默认文本：",
                            error
                        );
                    }
                }
            }
            return this.getDefaultText(key);
        }

        // ★Shiroin: 只在地图场景排队演出公共事件。非地图场景直接返回 false（不排队），
        //   否则解释器会一直留在 $gameMap._commonEventQJ 里，等玩家回到地图时补放一次
        //   闪光/贴纸/范围仇恨——那个数组只在 Game_Map.initialize 时清空。
        triggerCameraCommonEvent(key) {
            const gameMap = typeof $gameMap !== "undefined" ? $gameMap : null;
            if (!gameMap || typeof gameMap.steupCEQJ !== "function") {
                return false;
            }
            if (!this.isMapSceneActive()) {
                return false;
            }
            try {
                const queue = Array.isArray(gameMap._commonEventQJ)
                    ? gameMap._commonEventQJ
                    : null;
                const before = queue ? queue.length : -1;
                gameMap.steupCEQJ(11, 1, { cameraType: key });
                // 记住刚排进去的解释器，超时/离开地图时好把它撤掉
                if (queue && queue.length > before) {
                    this.pendingCameraInterpreter = queue[before];
                }
                return true;
            } catch (error) {
                console.error(
                    "[Shiroin_CaptureToolbar] 触发相机动作公共事件失败：",
                    error
                );
                return false;
            }
        }

        cancelPendingCameraInterpreter() {
            const interpreter = this.pendingCameraInterpreter;
            this.pendingCameraInterpreter = null;
            if (!interpreter || typeof $gameMap === "undefined" || !$gameMap) {
                return;
            }
            const queue = $gameMap._commonEventQJ;
            if (!Array.isArray(queue)) {
                return;
            }
            const index = queue.indexOf(interpreter);
            if (index >= 0) {
                queue.splice(index, 1);
            }
        }

        startScreenshotWatchdog() {
            this.clearScreenshotWatchdog();
            this.screenshotWatchdogStartedAt = Date.now();
            this.screenshotWatchdog = window.setInterval(() => {
                if (this.state !== "screenshotting") {
                    this.clearScreenshotWatchdog();
                    return;
                }
                const leftMap = !this.isMapScene();
                const timedOut =
                    Date.now() - this.screenshotWatchdogStartedAt >
                    SCREENSHOT_WATCHDOG_TIMEOUT;
                if (!leftMap && !timedOut) {
                    return;
                }
                this.clearScreenshotWatchdog();
                this.cancelPendingCameraInterpreter();
                this.screenshotBaseline = null;
                console.warn(
                    "[Shiroin_CaptureToolbar] 拍照演出未能在地图场景完成，已取消。" +
                    (leftMap ? "（原因：已离开地图场景）" : "（原因：超时）")
                );
                if (this.displayed) {
                    this.renderError("拍照演出未能完成，已取消。", "screenshot");
                } else {
                    this.state = "hidden";
                    this.mode = "none";
                }
            }, SCREENSHOT_WATCHDOG_INTERVAL);
        }

        clearScreenshotWatchdog() {
            if (this.screenshotWatchdog) {
                window.clearInterval(this.screenshotWatchdog);
                this.screenshotWatchdog = 0;
            }
            this.screenshotWatchdogStartedAt = 0;
        }

        ensureStyle() {
            if (document.getElementById("shiroin-capture-toolbar-style")) {
                return;
            }
            const style = document.createElement("style");
            style.id = "shiroin-capture-toolbar-style";
            style.textContent = `
#shiroin-capture-toolbar-activator{position:fixed;z-index:99998;box-sizing:border-box;background:transparent;pointer-events:auto;touch-action:none;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;}
#shiroin-capture-toolbar{--sct-scale:1;position:fixed;z-index:99999;display:flex;align-items:center;gap:12px;box-sizing:border-box;min-height:96px;padding:12px 48px 16px 14px;border:1px solid rgba(50,50,50,.12);border-top:0;border-radius:0 0 24px 24px;background:rgba(255,255,255,.97);box-shadow:0 9px 24px rgba(0,0,0,.24);font-family:GameFont,'Noto Sans SC','Microsoft YaHei',sans-serif;transform:translate(-50%,calc(-100% - 16px)) scale(var(--sct-scale));transform-origin:top center;opacity:.98;pointer-events:none;will-change:transform;transition:transform 260ms cubic-bezier(.2,.8,.2,1),opacity 180ms ease;user-select:none;-webkit-user-select:none;}
#shiroin-capture-toolbar.sct-visible{transform:translate(-50%,0) scale(var(--sct-scale));opacity:1;pointer-events:auto;}
#shiroin-capture-toolbar.sct-resizing{transition:none;}
#shiroin-capture-toolbar .sct-close{position:absolute;top:5px;right:5px;display:flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:0;border-radius:50%;background:transparent;color:#777;font:400 26px/1 Arial,sans-serif;cursor:pointer;touch-action:manipulation;}
#shiroin-capture-toolbar .sct-close:hover:not(:disabled){background:#e8e8e8;color:#333;}
#shiroin-capture-toolbar .sct-close:active:not(:disabled){background:#ddd;}
#shiroin-capture-toolbar .sct-close:disabled{opacity:.3;cursor:default;}
#shiroin-capture-toolbar .sct-decoration{position:relative;flex:0 0 64px;width:64px;height:64px;overflow:hidden;border-radius:50%;background:transparent;}
#shiroin-capture-toolbar .sct-decoration img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none;}
#shiroin-capture-toolbar .sct-decoration.sct-image-loaded img{display:block;}
#shiroin-capture-toolbar .sct-placeholder{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#777;font:bold 31px Georgia,serif;text-shadow:none;}
#shiroin-capture-toolbar .sct-decoration.sct-image-loaded .sct-placeholder{display:none;}
#shiroin-capture-toolbar .sct-content{display:flex;flex-direction:column;gap:7px;min-width:0;}
#shiroin-capture-toolbar .sct-actions{display:flex;align-items:stretch;gap:10px;}
#shiroin-capture-toolbar .sct-button{display:flex;align-items:center;justify-content:center;gap:12px;min-width:210px;min-height:66px;padding:10px 22px;box-sizing:border-box;border:2px solid #dedede;border-radius:15px;background:linear-gradient(#fafafa,#f3f3f3);box-shadow:0 1px 0 rgba(255,255,255,.8) inset;color:#151515;font:500 25px/1.15 GameFont,'Noto Sans SC','Microsoft YaHei',sans-serif;letter-spacing:.04em;white-space:pre;cursor:pointer;outline:none;touch-action:manipulation;transition:background 120ms ease,border-color 120ms ease,transform 80ms ease,box-shadow 120ms ease;}
#shiroin-capture-toolbar .sct-button:hover:not(:disabled){border-color:#c5c5c5;background:#fff;box-shadow:0 3px 9px rgba(0,0,0,.1);}
#shiroin-capture-toolbar .sct-button:active:not(:disabled){transform:translateY(1px) scale(.99);background:#ededed;}
#shiroin-capture-toolbar .sct-button:disabled{color:#7d7d7d;background:#f2f2f2;cursor:default;}
#shiroin-capture-toolbar .sct-icon{display:inline-flex;align-items:center;justify-content:center;flex:0 0 28px;width:28px;height:28px;font:700 25px/1 Arial,sans-serif;}
#shiroin-capture-toolbar .sct-icon-record{width:24px;height:24px;border-radius:50%;background:linear-gradient(#ff4a4a,#cb0000);box-shadow:inset 0 1px 1px rgba(255,255,255,.55),0 0 0 1px rgba(110,0,0,.18);}
#shiroin-capture-toolbar .sct-icon-camera{position:relative;width:28px;height:20px;border-radius:4px;background:#555;}
#shiroin-capture-toolbar .sct-icon-camera:before{content:'';position:absolute;left:5px;top:-5px;width:9px;height:6px;border-radius:2px 2px 0 0;background:#555;}
#shiroin-capture-toolbar .sct-icon-camera:after{content:'';position:absolute;left:9px;top:5px;width:8px;height:8px;border:2px solid #fff;border-radius:50%;box-sizing:border-box;}
#shiroin-capture-toolbar .sct-icon-stop:after{content:'';display:block;width:19px;height:19px;border-radius:3px;background:#d51212;box-shadow:inset 0 1px 1px rgba(255,255,255,.4);}
#shiroin-capture-toolbar .sct-icon-folder{position:relative;width:27px;height:20px;margin-top:4px;border-radius:3px;background:#e2a523;}
#shiroin-capture-toolbar .sct-icon-folder:before{content:'';position:absolute;left:2px;top:-5px;width:11px;height:7px;border-radius:3px 3px 0 0;background:#e2a523;}
#shiroin-capture-toolbar .sct-icon-busy{font-size:23px;color:#777;animation:sct-pulse 900ms ease-in-out infinite alternate;}
#shiroin-capture-toolbar .sct-duration{display:flex;align-items:center;justify-content:center;gap:9px;min-width:180px;min-height:66px;padding:10px 8px;box-sizing:border-box;border:0;border-radius:0;background:transparent;box-shadow:none;color:#333;font:500 19px/1.15 GameFont,'Noto Sans SC','Microsoft YaHei',sans-serif;font-variant-numeric:tabular-nums;white-space:nowrap;cursor:default;}
#shiroin-capture-toolbar .sct-duration:before{content:'';flex:0 0 11px;width:11px;height:11px;border-radius:50%;background:#e11616;box-shadow:0 0 0 3px rgba(225,22,22,.14);}
#shiroin-capture-toolbar .sct-hint{max-width:430px;padding:0 5px;color:#9b2424;font:14px/1.25 GameFont,'Noto Sans SC','Microsoft YaHei',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
@keyframes sct-pulse{from{opacity:.35}to{opacity:1}}
`;
            document.head.appendChild(style);
        }

        installActivationZone() {
            if (this.activationZone || !document.body) {
                return Boolean(this.activationZone);
            }
            this.ensureStyle();
            const zone = document.createElement("div");
            zone.id = "shiroin-capture-toolbar-activator";
            zone.setAttribute("aria-hidden", "true");

            zone.addEventListener("pointerenter", event => {
                if (event.pointerType === "touch") {
                    return;
                }
                this.activationHovered = true;
                this.clearAutoHide();
                this.show("hover");
            });
            zone.addEventListener("pointerleave", event => {
                if (event.pointerType === "touch") {
                    return;
                }
                this.activationHovered = false;
                this.scheduleAutoHide();
            });
            zone.addEventListener("pointerdown", event => {
                event.preventDefault();
                event.stopPropagation();
                if (event.pointerType === "touch") {
                    this.touchLatched = true;
                    this.clearAutoHide();
                    this.show("touch");
                } else {
                    this.show("hover");
                }
            });
            zone.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
            });
            zone.addEventListener("contextmenu", event => {
                event.preventDefault();
                event.stopPropagation();
            });

            document.body.appendChild(zone);
            this.activationZone = zone;
            this.boundActivationPosition = () => this.updateActivationPosition();
            this.boundOutsidePointerDown = event => {
                if (!this.touchLatched || event.pointerType !== "touch") {
                    return;
                }
                const target = event.target;
                const insideZone = this.activationZone &&
                    this.activationZone.contains(target);
                const insideToolbar = this.root && this.root.contains(target);
                if (insideZone || insideToolbar) {
                    this.clearAutoHide();
                    return;
                }
                this.touchLatched = false;
                this.scheduleAutoHide();
            };
            window.addEventListener("pointerdown", this.boundOutsidePointerDown, true);
            window.addEventListener("resize", this.boundActivationPosition);
            window.addEventListener("orientationchange", this.boundActivationPosition);
            document.addEventListener("fullscreenchange", this.boundActivationPosition);
            this.observeActivationCanvas();
            this.updateActivationPosition();
            return true;
        }

        observeActivationCanvas() {
            if (this.activationResizeObserver) {
                this.activationResizeObserver.disconnect();
                this.activationResizeObserver = null;
            }
            const canvas = this.getGameCanvas();
            if (canvas && typeof ResizeObserver === "function") {
                this.activationResizeObserver = new ResizeObserver(() => {
                    this.updateActivationPosition();
                });
                this.activationResizeObserver.observe(canvas);
            }
        }

        updateActivationPosition() {
            if (!this.activationZone) {
                return;
            }
            if (!this.isFeatureEnabled()) {
                this.activationZone.style.display = "none";
                return;
            }
            const canvas = this.getGameCanvas();
            const rect = canvas ? canvas.getBoundingClientRect() : {
                left: 0,
                top: 0,
                width: window.innerWidth,
                height: window.innerHeight
            };
            if (rect.width <= 0 || rect.height <= 0) {
                this.activationZone.style.display = "none";
                return;
            }
            const logicalWidth = canvas && Number(canvas.width) > 0
                ? Number(canvas.width)
                : (typeof Graphics !== "undefined" ? Number(Graphics.width) : 0);
            const scale = logicalWidth > 0
                ? Math.max(0.01, rect.width / logicalWidth)
                : 1;
            const width = Math.min(rect.width, this.config.activationWidth * scale);
            const height = Math.min(rect.height, this.config.activationHeight * scale);
            this.activationZone.style.display = "block";
            this.activationZone.style.left = `${rect.left + (rect.width - width) * 0.5}px`;
            this.activationZone.style.top = `${Math.max(0, rect.top)}px`;
            this.activationZone.style.width = `${width}px`;
            this.activationZone.style.height = `${height}px`;
        }

        createDecoration() {
            const decoration = document.createElement("div");
            decoration.className = "sct-decoration";

            const placeholder = document.createElement("span");
            placeholder.className = "sct-placeholder";
            placeholder.textContent = "✦";
            decoration.appendChild(placeholder);

            if (this.config.decorationImage) {
                const configuredName = this.config.decorationImage;
                const explicitEncrypted = /\.png_$/i.test(configuredName);
                let imageName = explicitEncrypted ? configuredName.slice(0, -1) : configuredName;
                if (!/\.png$/i.test(imageName)) {
                    imageName += ".png";
                }
                const image = document.createElement("img");
                image.alt = "";
                image.draggable = false;
                let xhr = null;
                let objectUrl = "";
                let disposed = false;
                const releaseObjectUrl = () => {
                    if (objectUrl) {
                        URL.revokeObjectURL(objectUrl);
                        objectUrl = "";
                    }
                };
                image.onload = () => {
                    if (!disposed) decoration.classList.add("sct-image-loaded");
                    releaseObjectUrl();
                };
                image.onerror = () => {
                    decoration.classList.remove("sct-image-loaded");
                    releaseObjectUrl();
                };
                this.decorationCleanup = () => {
                    disposed = true;
                    image.onload = null;
                    image.onerror = null;
                    if (xhr) {
                        xhr.onload = null;
                        xhr.onerror = null;
                        xhr.abort();
                        xhr = null;
                    }
                    image.removeAttribute("src");
                    releaseObjectUrl();
                };
                const url = `img/system/${Utils.encodeURI(imageName)}`;
                if (explicitEncrypted || Utils.hasEncryptedImages()) {
                    // DOM图片不会经过Bitmap；沿用MZ的XHR和解密流程，失败时保留占位图。
                    const request = new XMLHttpRequest();
                    xhr = request;
                    request.onload = () => {
                        xhr = null;
                        if (disposed || request.status >= 400) return;
                        try {
                            const data = Utils.decryptArrayBuffer(request.response);
                            objectUrl = URL.createObjectURL(new Blob([data], { type: "image/png" }));
                            image.src = objectUrl;
                        } catch (error) {
                            releaseObjectUrl();
                        }
                    };
                    request.onerror = () => { xhr = null; };
                    try {
                        request.open("GET", url + "_");
                        request.responseType = "arraybuffer";
                        request.send();
                    } catch (error) {
                        request.onload = null;
                        request.onerror = null;
                        request.abort();
                        xhr = null;
                    }
                } else {
                    image.src = url;
                }
                decoration.appendChild(image);
            }
            return decoration;
        }

        stopGamePointerPropagation(root) {
            const eventNames = [
                "mousedown", "mouseup", "wheel", "contextmenu",
                "touchstart", "touchend", "touchcancel",
                "pointerdown", "pointerup", "click"
            ];
            for (const eventName of eventNames) {
                const isPassive = eventName !== "wheel" && eventName.indexOf("touch") !== 0;
                root.addEventListener(eventName, event => {
                    event.stopPropagation();
                }, { passive: isPassive });
            }
        }

        createRoot() {
            this.ensureStyle();

            const root = document.createElement("div");
            root.id = "shiroin-capture-toolbar";
            root.setAttribute("role", "toolbar");
            root.setAttribute("aria-label", "截图与录制工具栏");
            root.appendChild(this.createDecoration());

            const content = document.createElement("div");
            content.className = "sct-content";
            const actions = document.createElement("div");
            actions.className = "sct-actions";
            const hint = document.createElement("div");
            hint.className = "sct-hint";
            hint.hidden = true;
            content.appendChild(actions);
            content.appendChild(hint);
            root.appendChild(content);

            const closeButton = document.createElement("button");
            closeButton.type = "button";
            closeButton.className = "sct-close";
            closeButton.tabIndex = -1;
            closeButton.textContent = "×";
            closeButton.setAttribute("aria-label", "关闭本局相机工具栏");
            closeButton.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                closeButton.blur();
                $gameTemp.drill_PSS_setCaptureToolbarEnabled(false);
            });
            root.appendChild(closeButton);

            this.stopGamePointerPropagation(root);
            root.addEventListener("pointerenter", event => {
                if (event.pointerType === "touch") {
                    return;
                }
                this.hovered = true;
                this.clearAutoHide();
            });
            root.addEventListener("pointerleave", event => {
                if (event.pointerType === "touch") {
                    return;
                }
                this.hovered = false;
                this.scheduleAutoHide();
            });

            document.body.appendChild(root);
            this.root = root;
            this.actions = actions;
            this.closeButton = closeButton;
            this.hint = hint;
            this.boundUpdatePosition = () => this.updatePosition(true);
            window.addEventListener("resize", this.boundUpdatePosition);
            document.addEventListener("fullscreenchange", this.boundUpdatePosition);
            this.updatePosition();
            const canvas = this.getGameCanvas();
            if (canvas && typeof ResizeObserver === "function") {
                this.canvasResizeObserver = new ResizeObserver(entries => {
                    const entry = entries[0];
                    const width = entry ? entry.contentRect.width : 0;
                    const height = entry ? entry.contentRect.height : 0;
                    const sizeChanged =
                        Math.abs(width - this.lastCanvasWidth) > 0.5 ||
                        Math.abs(height - this.lastCanvasHeight) > 0.5;
                    if (sizeChanged) {
                        this.updatePosition(true);
                    }
                });
                this.canvasResizeObserver.observe(canvas);
            }
        }

        getGameCanvas() {
            const graphicsCanvas = typeof Graphics !== "undefined"
                ? Graphics._canvas
                : null;
            return graphicsCanvas || document.querySelector("canvas");
        }

        updatePosition(instantScale = false) {
            if (!this.root) {
                return;
            }
            if (instantScale) {
                this.root.classList.add("sct-resizing");
            }
            const canvas = this.getGameCanvas();
            const rect = canvas ? canvas.getBoundingClientRect() : {
                left: 0,
                top: 0,
                width: window.innerWidth,
                height: window.innerHeight
            };
            const graphicsWidth = typeof Graphics !== "undefined"
                ? Number(Graphics.width)
                : 0;
            const logicalWidth = canvas && Number(canvas.width) > 0
                ? Number(canvas.width)
                : graphicsWidth;
            const measuredScale = logicalWidth > 0 && rect.width > 0
                ? rect.width / logicalWidth
                : 1;
            const scale = Number.isFinite(measuredScale)
                ? Math.max(0.01, measuredScale)
                : 1;
            const displayedMargin = 20;
            const availableLayoutWidth = Math.max(
                300,
                (rect.width - displayedMargin) / scale
            );
            this.root.style.left = `${rect.left + rect.width * 0.5}px`;
            this.root.style.top = `${Math.max(0, rect.top)}px`;
            this.root.style.maxWidth = `${availableLayoutWidth}px`;
            this.root.style.setProperty("--sct-scale", String(scale));
            this.lastCanvasWidth = rect.width;
            this.lastCanvasHeight = rect.height;
            if (instantScale) {
                if (this.positionRequestId) {
                    window.cancelAnimationFrame(this.positionRequestId);
                }
                this.positionRequestId = window.requestAnimationFrame(() => {
                    this.positionRequestId = 0;
                    if (this.root) {
                        this.root.classList.remove("sct-resizing");
                    }
                });
            }
        }

        makeButton(iconName, label, handler = null, disabled = false) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "sct-button";
            button.tabIndex = -1;
            button.disabled = disabled;

            const icon = document.createElement("span");
            icon.className = `sct-icon sct-icon-${iconName}`;
            if (iconName === "busy") {
                icon.textContent = "•••";
            }
            const text = document.createElement("span");
            text.textContent = label;
            button.appendChild(icon);
            button.appendChild(text);

            if (handler) {
                button.addEventListener("click", event => {
                    event.preventDefault();
                    event.stopPropagation();
                    button.blur();
                    handler();
                });
            }
            return button;
        }

        clearActions() {
            this.stopDurationTimer();
            this.durationElement = null;
            if (this.closeButton) {
                this.closeButton.disabled = !this.canAutoHide();
            }
            while (this.actions && this.actions.firstChild) {
                this.actions.removeChild(this.actions.firstChild);
            }
            if (this.hint) {
                this.hint.hidden = true;
                this.hint.textContent = "";
                this.hint.removeAttribute("title");
            }
        }

        setHint(message) {
            if (!this.hint || !message) {
                return;
            }
            this.hint.textContent = message;
            this.hint.title = message;
            this.hint.hidden = false;
        }

        renderIdle() {
            this.stopMonitor();
            this.clearScreenshotWatchdog();
            this.state = "idle";
            this.mode = "none";
            this.lastOutputPath = "";
            this.fallbackRecordingStartedAt = 0;
            this.clearActions();

            const support = this.hasVideoBackend() &&
                typeof $gameTemp.drill_PSS_getVideoRecordingSupport === "function"
                    ? $gameTemp.drill_PSS_getVideoRecordingSupport()
                    : { supported: false, reason: "当前环境不支持游戏内录像。" };
            const recordButton = this.makeButton(
                "record",
                this.getText("record"),
                () => this.startRecording(),
                !support.supported
            );
            if (!support.supported) {
                recordButton.title = support.reason || "当前环境不支持MP4录制。";
            }
            this.actions.appendChild(recordButton);
            this.actions.appendChild(this.makeButton(
                "camera",
                this.getText("screenshot"),
                () => this.takeScreenshot()
            ));
            if (!support.supported) {
                this.setHint(support.reason || "当前环境不支持MP4录制。仍可使用截图功能。");
            }
            this.scheduleAutoHide();
        }

        renderRecording() {
            this.state = "recording";
            this.mode = "video";
            this.clearActions();
            this.actions.appendChild(this.makeButton(
                "stop",
                this.getText("stop"),
                () => this.stopRecording()
            ));
            const duration = document.createElement("div");
            duration.className = "sct-duration";
            duration.setAttribute("aria-label", this.getText("duration"));
            this.actions.appendChild(duration);
            this.durationElement = duration;
            if (!this.fallbackRecordingStartedAt) {
                this.fallbackRecordingStartedAt = Date.now();
            }
            this.updateDurationLabel();
            this.startDurationTimer();
            this.clearAutoHide();
            this.startMonitor();
        }

        renderVideoBusy(textKey, state) {
            this.state = state;
            this.mode = "video";
            this.clearActions();
            this.actions.appendChild(this.makeButton(
                "busy",
                this.getText(textKey),
                null,
                true
            ));
            this.clearAutoHide();
            this.startMonitor();
        }

        renderScreenshotting() {
            this.stopMonitor();
            this.state = "screenshotting";
            this.mode = "screenshot";
            this.clearActions();
            this.actions.appendChild(this.makeButton(
                "busy",
                this.getText("screenshotting"),
                null,
                true
            ));
            this.clearAutoHide();
        }

        renderResult(filePath, mode) {
            this.stopMonitor();
            this.clearScreenshotWatchdog();
            this.fallbackRecordingStartedAt = 0;
            this.mode = mode;
            this.state = mode === "video" ? "video-saved" : "screenshot-saved";
            this.lastOutputPath = filePath || "";
            this.clearActions();
            this.actions.appendChild(this.makeButton(
                "folder",
                this.getText("view"),
                () => this.revealLastOutput(),
                !this.lastOutputPath
            ));
            if (!this.lastOutputPath) {
                this.setHint("文件已保存，但没有取得输出路径。");
            }
            this.scheduleAutoHide();
        }

        renderMemorySnapshotResult(message) {
            this.stopMonitor();
            this.clearScreenshotWatchdog();
            this.mode = "screenshot";
            this.state = "snapshot-ready";
            this.lastOutputPath = "";
            this.clearActions();
            this.actions.appendChild(this.makeButton(
                "camera",
                this.getText("captured"),
                null,
                true
            ));
            this.setHint(message || "快照已保存在游戏内存中；当前平台不执行本地文件保存。");
            this.scheduleAutoHide();
        }

        renderAndroidSnapshotSaving() {
            this.stopMonitor();
            this.state = "screenshotting";
            this.mode = "screenshot";
            this.clearActions();
            this.actions.appendChild(this.makeButton(
                "busy",
                this.getText("saving"),
                null,
                true
            ));
            this.clearAutoHide();
        }

        renderAndroidSnapshotResult(filePath) {
            this.stopMonitor();
            this.mode = "screenshot";
            this.state = "screenshot-saved";
            this.lastOutputPath = filePath || "";
            this.clearActions();
            this.actions.appendChild(this.makeButton(
                "folder",
                this.getText("view"),
                () => this.revealLastOutput(),
                !this.canOpenAndroidSnapshotDirectory()
            ));
            this.setHint(this.lastOutputPath || "Documents/sister_save/snapshot");
            this.scheduleAutoHide();
        }

        renderError(message, mode = this.mode) {
            this.stopMonitor();
            this.clearScreenshotWatchdog();
            this.fallbackRecordingStartedAt = 0;
            this.state = "error";
            this.mode = mode === "video" || mode === "screenshot" ? mode : "none";
            this.clearActions();
            this.actions.appendChild(this.makeButton(
                "busy",
                this.getText("failed"),
                null,
                true
            ));
            this.setHint(message || "截图或录制操作失败。请查看开发者控制台。");
            this.scheduleAutoHide();
        }

        startRecording() {
            this.clearAutoHide();
            this.fallbackRecordingStartedAt = 0;
            this.renderVideoBusy("starting", "starting");
            try {
                const started = $gameTemp.drill_PSS_startFullScreenVideoRecording();
                const state = $gameTemp.drill_PSS_getVideoRecordingState();
                if (started || state === "recording" || state === "starting") {
                    this.triggerCameraCommonEvent("video");
                }
                if (started || state === "recording") {
                    this.renderRecording();
                } else if (state === "starting") {
                    this.renderVideoBusy("starting", "starting");
                } else {
                    this.renderError($gameTemp.drill_PSS_getVideoRecordingError(), "video");
                }
            } catch (error) {
                console.error("[Shiroin_CaptureToolbar] 开始录制失败：", error);
                this.renderError(error && error.message ? error.message : String(error), "video");
            }
        }

        stopRecording() {
            this.clearAutoHide();
            this.renderVideoBusy("saving", "saving");
            try {
                if (!$gameTemp.drill_PSS_stopVideoRecording()) {
                    this.syncActiveVideoState();
                }
            } catch (error) {
                console.error("[Shiroin_CaptureToolbar] 停止录制失败：", error);
                this.renderError(error && error.message ? error.message : String(error), "video");
            }
        }

        // ★Shiroin: 截图本身是跨场景可用的（drill_PSS_createSnapshot 抓的是当前场景画面），
        //   只有拍照演出（公共事件11：闪光/贴纸/范围仇恨）依赖地图场景。
        //   所以地图场景走演出流程，非地图场景直接抓图存盘、不触发任何脚本效果。
        takeScreenshot() {
            this.clearAutoHide();
            this.screenshotBaseline =
                typeof $gameTemp.drill_PSS_getLastSnapshot === "function"
                    ? $gameTemp.drill_PSS_getLastSnapshot()
                    : null;
            this.renderScreenshotting();
            // 平台不影响拍照演出：PC与Android只要位于地图场景，都执行公共事件11。
            // 标题、设置等非地图场景没有地图公共事件消费循环，因此仍直接抓图。
            if (!this.isMapSceneActive()) {
                return this.captureWithoutCommonEvent();
            }
            if (!this.triggerCameraCommonEvent("screenshot")) {
                this.screenshotBaseline = null;
                this.renderError("无法触发截图公共事件。", "screenshot");
                return false;
            }
            this.startScreenshotWatchdog();
            return true;
        }

        // 非地图场景：不排队公共事件，自己完成"抓图 → 存盘 → 出结果"
        captureWithoutCommonEvent() {
            try {
                $gameTemp.drill_PSS_createSnapshot();
            } catch (error) {
                console.error("[Shiroin_CaptureToolbar] 截图失败：", error);
                this.screenshotBaseline = null;
                this.renderError(
                    error && error.message ? error.message : String(error),
                    "screenshot"
                );
                return false;
            }
            return this.finishScreenshot();
        }

        finishScreenshot() {
            if (this.state !== "screenshotting" || this.mode !== "screenshot") {
                return false;
            }
            const snapshot = typeof $gameTemp.drill_PSS_getLastSnapshot === "function"
                ? $gameTemp.drill_PSS_getLastSnapshot()
                : null;
            if (!snapshot || snapshot === this.screenshotBaseline) {
                console.warn(
                    "[Shiroin_CaptureToolbar] finish API调用时尚未检测到新快照，" +
                    "请先调用 drill_PSS_createSnapshot()。"
                );
                return false;
            }
            this.screenshotBaseline = null;
            // 演出已经跑到这一步了，看门狗可以撤了。注意只丢引用、不从队列里删——
            // 此刻公共事件11 正在自己的 update 里执行，删掉会打断它后半段。
            this.clearScreenshotWatchdog();
            this.pendingCameraInterpreter = null;
            if (!this.canSaveLocally()) {
                if (this.canSaveAndroidSnapshot()) {
                    if (this.displayed) {
                        this.renderAndroidSnapshotSaving();
                    }
                    $gameTemp.drill_PSS_saveSnapshotAndroid().then(filePath => {
                        if (this.displayed) {
                            this.renderAndroidSnapshotResult(filePath);
                        } else {
                            this.lastOutputPath = filePath || "";
                            this.state = "hidden";
                            this.mode = "none";
                        }
                    }).catch(error => {
                        console.warn("[Shiroin_CaptureToolbar] Android截图文件保存失败：", error);
                        if (this.displayed) {
                            this.renderMemorySnapshotResult(
                                "本地保存失败，但快照仍保留在游戏内存中。"
                            );
                        } else {
                            this.state = "hidden";
                            this.mode = "none";
                        }
                    });
                    return true;
                }
                if (this.displayed) {
                    this.renderMemorySnapshotResult();
                } else {
                    this.state = "hidden";
                    this.mode = "none";
                }
                return true;
            }
            try {
                let filePath = $gameTemp.drill_PSS_saveSnapshot();
                if (!filePath && $gameTemp.drill_PSS_getLastSnapshotPath) {
                    filePath = $gameTemp.drill_PSS_getLastSnapshotPath();
                }
                if (!this.displayed) {
                    this.lastOutputPath = filePath || "";
                    this.state = "hidden";
                    this.mode = "none";
                } else if (filePath) {
                    this.renderResult(filePath, "screenshot");
                } else {
                    this.renderError(
                        "截图未生成文件，请检查截图保存路径和写入权限。",
                        "screenshot"
                    );
                }
                return Boolean(filePath);
            } catch (error) {
                console.error("[Shiroin_CaptureToolbar] 保存截图失败：", error);
                if (this.displayed) {
                    this.renderError(
                        error && error.message ? error.message : String(error),
                        "screenshot"
                    );
                } else {
                    this.state = "hidden";
                    this.mode = "none";
                }
                return false;
            }
        }

        revealLastOutput() {
            if (!this.lastOutputPath) {
                return;
            }
            if (!this.canSaveLocally()) {
                try {
                    if (this.canOpenAndroidSnapshotDirectory()) {
                        $gameTemp.drill_PSS_openAndroidSnapshotDirectory();
                    }
                } catch (error) {
                    // Android目录Intent受系统文件管理器影响，失败时静默收起。
                }
                this.hide(false);
                return;
            }
            let opened = false;
            try {
                opened = $gameTemp.drill_PSS_revealFile(this.lastOutputPath);
            } catch (error) {
                console.error("[Shiroin_CaptureToolbar] 打开输出文件失败：", error);
            }
            if (opened) {
                this.hide(false);
            } else {
                this.renderError("无法打开系统文件管理器。", this.mode);
            }
        }

        startMonitor() {
            if (this.monitorTimer) {
                return;
            }
            this.monitorTimer = window.setInterval(() => {
                this.syncActiveVideoState();
            }, 200);
        }

        stopMonitor() {
            if (this.monitorTimer) {
                window.clearInterval(this.monitorTimer);
                this.monitorTimer = 0;
            }
        }

        getElapsedRecordingSeconds() {
            const durationApi = typeof $gameTemp !== "undefined" && $gameTemp
                ? $gameTemp.drill_PSS_getVideoRecordingElapsedSeconds
                : null;
            if (typeof durationApi === "function") {
                const seconds = Number(durationApi.call($gameTemp));
                if (Number.isFinite(seconds)) {
                    return Math.max(0, Math.floor(seconds));
                }
            }
            if (!this.fallbackRecordingStartedAt) {
                this.fallbackRecordingStartedAt = Date.now();
            }
            return Math.max(
                0,
                Math.floor((Date.now() - this.fallbackRecordingStartedAt) / 1000)
            );
        }

        formatDuration(totalSeconds) {
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            const twoDigits = value => (`0${value}`).slice(-2);
            return hours > 0
                ? `${twoDigits(hours)}:${twoDigits(minutes)}:${twoDigits(seconds)}`
                : `${twoDigits(minutes)}:${twoDigits(seconds)}`;
        }

        updateDurationLabel() {
            if (!this.durationElement) {
                return;
            }
            const time = this.formatDuration(this.getElapsedRecordingSeconds());
            const template = this.getText("duration");
            const text = template.indexOf("{time}") >= 0
                ? template.replace(/\{time\}/g, time)
                : `${template} ${time}`.trim();
            this.durationElement.textContent = text;
            this.durationElement.setAttribute("aria-label", text);
        }

        startDurationTimer() {
            if (this.durationTimer) {
                return;
            }
            this.durationTimer = window.setInterval(() => {
                this.updateDurationLabel();
            }, 1000);
        }

        stopDurationTimer() {
            if (this.durationTimer) {
                window.clearInterval(this.durationTimer);
                this.durationTimer = 0;
            }
        }

        syncActiveVideoState() {
            if (!this.root || !this.hasVideoBackend()) {
                return;
            }
            const state = $gameTemp.drill_PSS_getVideoRecordingState();
            if (state === "recording") {
                if (this.state !== "recording") {
                    this.renderRecording();
                }
                return;
            }
            if (state === "starting") {
                if (this.state !== "starting") {
                    this.renderVideoBusy("starting", "starting");
                }
                return;
            }
            if (state === "saving") {
                if (this.state !== "saving") {
                    this.renderVideoBusy("saving", "saving");
                }
                return;
            }
            if (state === "saved") {
                this.renderResult($gameTemp.drill_PSS_getLastVideoPath(), "video");
                return;
            }
            if (state === "unsupported" || state === "error" || state === "cancelled") {
                this.renderError(
                    $gameTemp.drill_PSS_getVideoRecordingError() || "视频录制没有完成。",
                    "video"
                );
                return;
            }
            if (this.state === "recording" ||
                this.state === "starting" ||
                this.state === "saving") {
                this.renderError("视频录制意外停止。", "video");
            }
        }

        clearAutoHide() {
            if (this.hideTimer) {
                window.clearTimeout(this.hideTimer);
                this.hideTimer = 0;
            }
        }

        canAutoHide() {
            return this.state === "idle" ||
                this.state === "screenshot-saved" ||
                this.state === "snapshot-ready" ||
                this.state === "video-saved" ||
                this.state === "error";
        }

        scheduleAutoHide() {
            this.clearAutoHide();
            if (!this.root || this.hovered || !this.canAutoHide()) {
                return;
            }
            if (this.revealSource === "hover" && this.activationHovered) {
                return;
            }
            if (this.revealSource === "touch" && this.touchLatched) {
                return;
            }
            const delay = this.revealSource === "manual"
                ? this.config.autoHideMs
                : this.config.edgeHideMs;
            this.hideTimer = window.setTimeout(() => {
                this.hide(false);
            }, delay);
        }

        show(source = "manual") {
            if (!this.isFeatureEnabled()) {
                return false;
            }
            if (!this.hasSnapshotBackend()) {
                console.error("[Shiroin_CaptureToolbar] 缺少或未启用 Drill_PictureSnapShot。");
                return false;
            }
            if (!document.body) {
                return false;
            }
            if (this.removeTimer) {
                window.clearTimeout(this.removeTimer);
                this.removeTimer = 0;
            }
            if (!this.root) {
                this.createRoot();
            }

            this.revealSource = source === "hover" || source === "touch"
                ? source
                : "manual";
            this.displayed = true;
            this.root.style.pointerEvents = "";
            this.updatePosition();

            const state = this.hasVideoBackend()
                ? $gameTemp.drill_PSS_getVideoRecordingState()
                : "idle";
            if (state === "recording") {
                this.renderRecording();
            } else if (state === "starting") {
                this.renderVideoBusy("starting", "starting");
            } else if (state === "saving") {
                this.renderVideoBusy("saving", "saving");
            } else if (this.state !== "screenshotting") {
                this.renderIdle();
            }

            window.requestAnimationFrame(() => {
                if (this.root && this.displayed) {
                    this.root.classList.add("sct-visible");
                }
            });
            return true;
        }

        destroyRoot(root) {
            if (root && root.parentNode) {
                root.parentNode.removeChild(root);
            }
            if (this.root !== root) {
                return;
            }
            if (this.decorationCleanup) {
                this.decorationCleanup();
                this.decorationCleanup = null;
            }
            if (this.boundUpdatePosition) {
                window.removeEventListener("resize", this.boundUpdatePosition);
                document.removeEventListener("fullscreenchange", this.boundUpdatePosition);
            }
            if (this.canvasResizeObserver) {
                this.canvasResizeObserver.disconnect();
                this.canvasResizeObserver = null;
            }
            if (this.positionRequestId) {
                window.cancelAnimationFrame(this.positionRequestId);
                this.positionRequestId = 0;
            }
            this.stopMonitor();
            this.stopDurationTimer();
            this.clearAutoHide();
            this.root = null;
            this.actions = null;
            this.closeButton = null;
            this.hint = null;
            this.durationElement = null;
            this.lastOutputPath = "";
            this.hovered = false;
            this.boundUpdatePosition = null;
            this.lastCanvasWidth = 0;
            this.lastCanvasHeight = 0;
            this.removeTimer = 0;
            if (!this.getActiveVideoState() && this.state !== "screenshotting") {
                this.state = "hidden";
                this.mode = "none";
            }
        }

        hide(immediate = false) {
            if (!this.root) {
                this.displayed = false;
                this.touchLatched = false;
                return false;
            }
            this.displayed = false;
            this.touchLatched = false;
            this.clearAutoHide();
            this.stopMonitor();
            this.stopDurationTimer();

            const root = this.root;
            root.classList.remove("sct-visible");
            root.style.pointerEvents = "none";
            if (this.removeTimer) {
                window.clearTimeout(this.removeTimer);
                this.removeTimer = 0;
            }
            if (immediate) {
                this.destroyRoot(root);
            } else {
                this.removeTimer = window.setTimeout(() => {
                    this.destroyRoot(root);
                }, 280);
            }
            return true;
        }
    }

    const captureToolbar = new CaptureToolbarController(settings);

    const _Shiroin_CaptureToolbar_GameTemp_initialize = Game_Temp.prototype.initialize;
    Game_Temp.prototype.initialize = function() {
        _Shiroin_CaptureToolbar_GameTemp_initialize.call(this);
        this._drill_PSS_captureToolbarEnabled = false;
    };
    if (typeof DataManager !== "undefined" && DataManager.createGameObjects) {
        const _Shiroin_CaptureToolbar_DataManager_createGameObjects =
            DataManager.createGameObjects;
        DataManager.createGameObjects = function() {
            _Shiroin_CaptureToolbar_DataManager_createGameObjects.call(this);
            captureToolbar.refreshFeatureEnabledState();
        };
    }

    const installActivationZone = () => {
        captureToolbar.installActivationZone();
    };
    if (document.body) {
        installActivationZone();
    } else {
        document.addEventListener("DOMContentLoaded", installActivationZone, { once: true });
    }
    if (typeof Scene_Boot !== "undefined") {
        const _Shiroin_CaptureToolbar_SceneBoot_start = Scene_Boot.prototype.start;
        Scene_Boot.prototype.start = function() {
            _Shiroin_CaptureToolbar_SceneBoot_start.call(this);
            captureToolbar.installActivationZone();
            captureToolbar.observeActivationCanvas();
            captureToolbar.updateActivationPosition();
        };
    }

    Game_Temp.prototype.drill_PSS_setCaptureToolbarEnabled = function(enabled) {
        this._drill_PSS_captureToolbarEnabled = Boolean(enabled);
        captureToolbar.refreshFeatureEnabledState();
        return this._drill_PSS_captureToolbarEnabled;
    };
    Game_Temp.prototype.drill_PSS_isCaptureToolbarEnabled = function() {
        return this._drill_PSS_captureToolbarEnabled === true;
    };
    Game_Temp.prototype.drill_PSS_showCaptureToolbar = () => captureToolbar.show();
    Game_Temp.prototype.drill_PSS_hideCaptureToolbar = () => captureToolbar.hide(false);
    Game_Temp.prototype.drill_PSS_isCaptureToolbarVisible = () => captureToolbar.isVisible();
    Game_Temp.prototype.drill_PSS_getCaptureToolbarStatus = () => captureToolbar.getStatus();
    Game_Temp.prototype.drill_PSS_finishCaptureToolbarScreenshot = () =>
        captureToolbar.finishScreenshot();
    Game_Temp.prototype.drill_PSS_getCaptureToolbarText = key => {
        const dialogue = window.mapCommonEventDialogue;
        const magicCamera = dialogue && dialogue.magicCamera;
        const textArray = magicCamera ? magicCamera[String(key)] : undefined;
        const text = Array.isArray(textArray) ? textArray.join("\n") : textArray;
        return text !== undefined && text !== null
            ? String(text)
            : captureToolbar.getDefaultText(key);
    };

    if (PluginManager.registerCommand) {
        PluginManager.registerCommand(pluginName, "show", () => captureToolbar.show());
        PluginManager.registerCommand(pluginName, "hide", () => captureToolbar.hide(false));
    }

    window.ShiroinCaptureToolbar = captureToolbar;
})();
