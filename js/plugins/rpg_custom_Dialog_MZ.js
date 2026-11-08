//=============================================================================
// rpg_custom_Dialog_MZ.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc 自定义弹窗系统 (从 MV rpg_custom.js 迁移)
 * @author Canaan HS (MZ迁移)
 * @help 自包含 DOM 弹窗系统，把 window.alert/confirm/prompt 替换为美化的可交互弹窗。
 *       仅用 SceneManager.stop/resume(MV/MZ通用)，无其它引擎/插件依赖。
 *       默认按游戏 canvas 的实际显示范围自适应；传入 adaptive:false 可保留指定尺寸。
 *       已剔除原文件中混入的 Sprite_Animation 补丁(MV引擎内部、移动端专用)。
 */
(() => {
"use strict";

    // MZ 原版會在 document 的 wheel 監聽器中呼叫 preventDefault()，使 DOM
    // 對話框的原生滾動一併失效。保留 TouchInput 的滾輪數值累計，但允許
    // NW.js / Android WebView 對可滾動 DOM 元素執行預設滾動行為。
    TouchInput._onWheel = function(event) {
        this._newState.wheelX += event.deltaX;
        this._newState.wheelY += event.deltaY;
    };

    /**
     * @author Canaan HS
     * @description 自訂提示窗口
     */

    const add = (() => {
        const addRecord = new Map();
        function addHead(type, rule, id = crypto.randomUUID(), repeatAdd = true) {
            let element = addRecord.get(id);

            if (!repeatAdd && element) return;
            if (!element) {
                element = document.createElement(type);
                element.id = id;
                document.head.appendChild(element);
            };

            element.textContent += rule;
            addRecord.set(id, element);
        };

        return {
            style: (rule, id, repeatAdd) => addHead("style", rule, id, repeatAdd),
            script: (rule, id, repeatAdd) => addHead("script", rule, id, repeatAdd),
        }
    })();

    const dialogStyle = `
        .dialog-overlay {
            position: fixed;
            inset: 0;
            background: rgba(20, 15, 20, 0.75);
            display: grid;
            place-items: center;
            z-index: 10000;
            backdrop-filter: blur(3px);
            padding: clamp(12px, 4vw, 60px);
            box-sizing: border-box;
            overflow: hidden;
        }

        /* 動畫效果類 */
        .dialog-overlay.animated-fade { animation: fadeIn 0.4s ease-out; }
        .dialog-overlay.animated-fade.closing { animation: fadeOut 0.35s ease-out forwards; }
        .dialog-overlay.no-animation { opacity: 1; }

        .dialog {
            background: linear-gradient(135deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.28) 22%, rgba(0,0,0,.48) 50%, rgba(0,0,0,.28) 78%);
            border-radius: clamp(12px, 3vw, 18px);
            padding: 3px;
            width: min(
                var(--dialog-width, 420px),
                var(--dialog-max-width, 95vw),
                95vw
            );
            /* 尺寸直接使用 canvas 的實際 CSS 顯示像素，避免 Android WebView 對
               transform 縮放前後的 Grid 對齊結果不一致。 */
            max-width: min(
                var(--dialog-max-width, 95vw),
                95vw
            );
            max-height: min(
                var(--dialog-max-height, 900px),
                90vh
            );
            box-shadow: 
                0 0 25px rgba(50, 50, 50, 0.2), 
                0 0 50px rgba(75, 75, 75, 0.15), 
                0 12px 35px rgba(0, 0, 0, 0.4);
            position: relative;
            overflow: hidden;
            box-sizing: border-box;
            font-family: 
                'Segoe UI Variable', 'Segoe UI', system-ui,
                -apple-system, BlinkMacSystemFont,
                'Roboto', 'Helvetica Neue', 'Arial',
                'Microsoft YaHei', '微软雅黑',
                'Microsoft JhengHei', '微軟正黑體',
                'PingFang SC', 'PingFang TC',
                'Hiragino Sans GB', 'Hiragino Kaku Gothic Pro',
                'Noto Sans CJK SC', 'Noto Sans CJK TC', 
                'Source Han Sans SC', 'Source Han Sans TC',
                'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo',
                sans-serif,
                'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji';
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
            font-feature-settings: 'kern' 1;
            font-kerning: normal;
        }

        /* 定位容器：包住「窗口 + (可選)頭部視頻」。
           1) header 視頻仍用 absolute 疊在窗口上方，但 has-header-video 會用 padding-top
              預留同等高度，因此視頻會參與整組居中，不會被畫布邊界裁掉。
           2) 尺寸已在 JS 中換算成 canvas 的實際 CSS 像素，這一層不再做 transform 縮放；
              否則 Android Grid 會按縮放前的超寬元素做安全對齊，導致彈窗向右偏移。 */
        .dialog-scale {
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
            max-width: 100%;
            max-height: 100%;
        }
        .dialog-scale.has-header-video {
            box-sizing: border-box;
            padding-top: var(--dialog-header-video-space, 0px);
        }
        .dialog-header-video {
            display: block;
            position: absolute;
            left: 0;
            top: 0;
            bottom: auto;
            width: 100%;
            height: var(--dialog-header-video-height, 0px);
            max-height: var(--dialog-header-video-height, 0px);
            object-fit: contain;
            object-position: center bottom;
            transform: none;
            margin: 0;
            z-index: 1;                   /* 壓在窗口陰影之上 */
            pointer-events: none;         /* 視頻不攔截點擊 */
        }

        @media screen and (-webkit-min-device-pixel-ratio: 0) {
            @supports not (-webkit-touch-callout: none) {
                .dialog-title { font-weight: 700; }
                .dialog-message { font-weight: 550; }
                .dialog-button { font-weight: 600; }
            }
        }

        /* 對話框動畫 */
        .dialog.animated-fade { animation: dialogFadeIn 0.4s ease-out; }
        .dialog.animated-fade.closing { animation: dialogFadeOut 0.35s ease-out forwards; }
        .dialog.animated-slide-top { animation: slideFromTop 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
        .dialog.animated-slide-top.closing { animation: slideToTop 0.35s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards; }
        .dialog.animated-slide-bottom { animation: slideFromBottom 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
        .dialog.animated-slide-bottom.closing { animation: slideToBottom 0.35s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards; }
        .dialog.animated-slide-left { animation: slideFromLeft 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
        .dialog.animated-slide-left.closing { animation: slideToLeft 0.35s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards; }
        .dialog.animated-slide-right { animation: slideFromRight 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
        .dialog.animated-slide-right.closing { animation: slideToRight 0.35s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards; }
        .dialog.animated-scale { animation: scaleIn 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .dialog.animated-scale.closing { animation: scaleOut 0.35s cubic-bezier(0.6, -0.28, 0.735, 0.045) forwards; }
        .dialog.no-animation { opacity: 1; transform: none; }

        .dialog-content {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.97) 0%, rgba(250, 250, 250, 0.98) 100%);
            backdrop-filter: blur(10px);
            border-radius: clamp(10px, 2.5vw, 15px);
            padding: clamp(16px, 4vw, 24px);
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            max-height: min(
                calc(var(--dialog-max-height, 900px) - 6px),
                calc(90vh - 6px)
            );
            box-sizing: border-box;
        }

        .dialog-title-spacer { 
            height: clamp(8px, 2vh, 16px); 
            flex-shrink: 0; 
        }

        .dialog-title {
            font-size: var(--dialog-title-font-size, 20px);
            color: rgba(20, 20, 20, 0.95);
            margin-bottom: clamp(12px, 3vw, 16px);
            text-align: center;
            letter-spacing: -0.01em;
            flex-shrink: 0;
        }

        .dialog-message-align[align="center"] { align-items: center; text-align: center; }
        .dialog-message-align[align="left"] { align-items: flex-start; text-align: left; }
        .dialog-message-align[align="right"] { align-items: flex-end; text-align: right; }

        .dialog-message-container {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            margin-bottom: clamp(14px, 3vw, 20px);
            min-height: clamp(40px, 10vh, 60px);
            max-height: min(
                var(--dialog-message-max-height, 400px),
                70vh
            );
            padding: clamp(8px, 2vw, 12px) clamp(6px, 1.5vw, 10px);
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }

        /* 優化滾動條 */
        .dialog-message-container::-webkit-scrollbar { 
            width: clamp(7px, 1.8vw, 9px); 
        }
        .dialog-message-container::-webkit-scrollbar-track { 
            background: rgba(0, 0, 0, 0.06); 
            border-radius: 5px;
            margin: 4px 0;
        }
        .dialog-message-container::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 0.5) 100%);
            border-radius: 5px;
            border: 2px solid rgba(0, 0, 0, 0.06);
            background-clip: padding-box;
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
        }
        .dialog-message-container::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0.7) 100%);
            background-clip: padding-box;
        }

        .dialog-message {
            font-size: var(--message-font-size, 18px);
            color: rgba(30, 30, 30, 0.92);
            line-height: 1.7;
            word-wrap: break-word;
            word-break: break-word;
            overflow-wrap: break-word;
            letter-spacing: 0.01em;
        }

        .dialog-input-container { 
            flex-shrink: 0; 
            margin-bottom: clamp(14px, 3vw, 20px);
        }

        /* 輸入框 */
        .dialog-input {
            width: 100%;
            padding: clamp(11px, 2.5vw, 13px) clamp(14px, 3.5vw, 18px);
            border: 2px solid rgba(40, 40, 40, 0.9);
            border-radius: clamp(8px, 2vw, 10px);
            font-size: clamp(14px, 3vw, 16px);
            font-weight: 450;
            background: linear-gradient(135deg, rgba(25, 25, 25, 0.98) 0%, rgba(15, 15, 15, 0.99) 100%);
            color: rgba(255, 255, 255, 0.95);
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            letter-spacing: 0.02em;
            box-sizing: border-box;
            box-shadow: 
                0 2px 6px rgba(0, 0, 0, 0.15),
                inset 0 1px 3px rgba(0, 0, 0, 0.4),
                inset 0 0 0 1px rgba(255, 255, 255, 0.05);
        }

        .dialog-input::placeholder { 
            color: rgba(180, 180, 180, 0.5);
            font-weight: 400;
            text-align: center; 
        }

        .dialog-input:focus {
            outline: none;
            border-color: rgba(60, 60, 60, 1);
            background: linear-gradient(135deg, rgba(30, 30, 30, 1) 0%, rgba(20, 20, 20, 1) 100%);
            color: rgba(255, 255, 255, 1);
            box-shadow: 
                0 4px 12px rgba(0, 0, 0, 0.25),
                0 0 0 3px rgba(80, 80, 80, 0.2),
                inset 0 1px 3px rgba(0, 0, 0, 0.3),
                inset 0 0 0 1px rgba(255, 255, 255, 0.08);
            transform: translateY(-1px);
        }

        .dialog-input:hover:not(:focus) {
            border-color: rgba(50, 50, 50, 0.95);
            box-shadow: 
                0 3px 8px rgba(0, 0, 0, 0.18),
                inset 0 1px 3px rgba(0, 0, 0, 0.35),
                inset 0 0 0 1px rgba(255, 255, 255, 0.07);
        }

        .dialog-buttons {
            display: flex;
            gap: clamp(8px, 2vw, 12px);
            justify-content: flex-end;
            flex-shrink: 0;
            flex-wrap: wrap;
        }

        .dialog-button {
            padding: clamp(10px, 2.2vw, 12px) clamp(20px, 4.5vw, 28px);
            border: none;
            border-radius: clamp(7px, 1.5vw, 9px);
            font-size: var(--dialog-button-font-size, 15px);
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            min-width: clamp(70px, 16vw, 90px);
            letter-spacing: 0.02em;
            position: relative;
            overflow: hidden;
            outline: none;
            box-sizing: border-box;
        }

        .dialog-button::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            transform: translate(-50%, -50%);
            transition: width 0.5s, height 0.5s;
            pointer-events: none;
        }

        .dialog-button:active::before { 
            width: 320px; 
            height: 320px; 
        }

        /* 主要按鈕 */
        .dialog-button-primary {
            background: linear-gradient(135deg, rgba(30, 30, 30, 0.96) 0%, rgba(10, 10, 10, 0.98) 100%);
            color: rgba(255, 255, 255, 0.98);
            border: 1.5px solid rgba(0, 0, 0, 0.2);
            box-shadow: 
                0 2px 8px rgba(0, 0, 0, 0.2),
                0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .dialog-button-primary:hover {
            background: linear-gradient(135deg, rgba(40, 40, 40, 0.98) 0%, rgba(20, 20, 20, 0.98) 100%);
            transform: translateY(-1px);
            border-color: rgba(0, 0, 0, 0.25);
            box-shadow: 
                0 4px 12px rgba(0, 0, 0, 0.25),
                0 2px 4px rgba(0, 0, 0, 0.15);
        }

        .dialog-button-primary:active {
            transform: translateY(0);
            box-shadow: 
                0 1px 4px rgba(0, 0, 0, 0.2),
                0 1px 2px rgba(0, 0, 0, 0.1);
        }

        /* 次要按鈕 */
        .dialog-button-secondary {
            background: rgba(255, 255, 255, 0.9);
            color: rgba(20, 20, 20, 0.9);
            border: 1.5px solid rgba(0, 0, 0, 0.15);
            box-shadow: 
                0 1px 3px rgba(0, 0, 0, 0.08),
                inset 0 1px 0 rgba(255, 255, 255, 0.5);
        }

        .dialog-button-secondary:hover {
            background: rgba(255, 255, 255, 0.95);
            color: rgba(10, 10, 10, 0.95);
            border-color: rgba(0, 0, 0, 0.25);
            transform: translateY(-1px);
            box-shadow: 
                0 2px 6px rgba(0, 0, 0, 0.12),
                inset 0 1px 0 rgba(255, 255, 255, 0.6);
        }

        .dialog-button-secondary:active {
            transform: translateY(0);
            box-shadow: 
                0 1px 2px rgba(0, 0, 0, 0.08),
                inset 0 1px 2px rgba(0, 0, 0, 0.06);
            background: rgba(245, 245, 245, 0.95);
        }

        /* 位置類 */
        .position-top { place-items: start center; }
        .position-center { place-items: center; }
        .position-bottom { place-items: end center; }
        .position-left { place-items: center start; }
        .position-right { place-items: center end; }

        /* 小屏幕優化 */
        @media (max-width: 640px) {
            .dialog-overlay { padding: 16px; }
            .dialog-buttons { flex-direction: column-reverse; gap: 10px; }
            .dialog-button { width: 100%; min-width: unset; padding: 12px 20px; }
        }

        @media (max-width: 380px) {
            .dialog-overlay { padding: 8px; }
            .dialog { border-radius: 12px; }
            .dialog-content { padding: 14px; }
            .dialog-title { margin-bottom: 12px; }
            .dialog-message { line-height: 1.65; }
            .dialog-input { padding: 10px 12px; }
        }

        /* 動畫定義 */
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes dialogFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dialogFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes slideFromTop { from { transform: translateY(clamp(-40px, -10vw, -60px)); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideToTop { from { transform: translateY(0); opacity: 1; } to { transform: translateY(clamp(-40px, -10vw, -60px)); opacity: 0; } }
        @keyframes slideFromBottom { from { transform: translateY(clamp(40px, 10vw, 60px)); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideToBottom { from { transform: translateY(0); opacity: 1; } to { transform: translateY(clamp(40px, 10vw, 60px)); opacity: 0; } }
        @keyframes slideFromLeft { from { transform: translateX(clamp(-40px, -10vw, -60px)); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .slideToLeft { from { transform: translateX(0); opacity: 1; } to { transform: translateX(clamp(-40px, -10vw, -60px)); opacity: 0; } }
        @keyframes slideFromRight { from { transform: translateX(clamp(40px, 10vw, 60px)); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideToRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(clamp(40px, 10vw, 60px)); opacity: 0; } }
        @keyframes scaleIn { from { transform: scale(0.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes scaleOut { from { transform: scale(1); opacity: 1; } to { transform: scale(0.7); opacity: 0; } }
    `;

    class DialogManager {
        constructor() {
            add.style(dialogStyle, "dialog-style", false);

            // 對話框隊列管理
            this.dialogQueue = [];
            this.currentDialog = null;
            this.isProcessing = false;
            this._keepSceneStopped = false;
            this.transitionDelay = 100; // 多對話框間的過渡延遲

            // 位置映射表
            this.positionMap = {
                top: 'position-top',
                center: 'position-center',
                bottom: 'position-bottom',
                left: 'position-left',
                right: 'position-right'
            };

            // 動畫類型映射表
            this.animationMap = {
                fade: 'animated-fade',
                top: 'animated-slide-top',
                bottom: 'animated-slide-bottom',
                left: 'animated-slide-left',
                right: 'animated-slide-right',
                scale: 'animated-scale'
            };

            // 動畫持續時間映射表（毫秒）
            this.durationMap = {
                fade: 400,
                top: 450,
                bottom: 450,
                left: 450,
                right: 450,
                scale: 450
            };
        };

        stopScene() {
            // MV→MZ：MV 的 SceneManager.stop() 会设 this._stopped=true；MZ 的 stop() 只调
            //   Graphics.stopGameLoop()、不设 _stopped。原来用 SceneManager._stopped 判断会导致
            //   resume 分支永远进不去 → 关闭弹窗后游戏一直冻结。改用插件自己的状态标志。
            if (!this._sceneStopped) {
                SceneManager.stop();
                this._sceneStopped = true;
            }
        };

        resumeScene() {
            if (this._sceneStopped) {
                if (!this._keepSceneStopped) SceneManager.resume();
                this._sceneStopped = false;
                this._keepSceneStopped = false;
            }
        };

        // 獲取位置對應的 CSS 類名
        getPositionClass(position) {
            return this.positionMap[position] || 'position-center';
        };

        // 獲取動畫對應的 CSS 類名
        getAnimationClass(animation) {
            if (!animation || animation === 'none') return 'no-animation';
            if (animation === true) return 'animated-fade';
            return this.animationMap[animation] || 'animated-fade';
        };

        // 獲取動畫持續時間
        getAnimationDuration(animation) {
            if (!animation || animation === 'none') return 0;
            if (animation === true) return 400;
            return this.durationMap[animation] || 400;
        };

        // 取得 canvas 的實際 CSS 顯示範圍。不能只依賴 Graphics._realScale：部分
        // Android WebView / 平板在 DPR、全屏或旋轉後，該值會與 DOM 實際尺寸短暫不同步。
        getGameCanvasMetrics() {
            const graphicsReady = typeof Graphics !== 'undefined';
            const logicalWidth = Number(
                graphicsReady && (Graphics.boxWidth || Graphics.width)
            ) || 1920;
            const logicalHeight = Number(
                graphicsReady && (Graphics.boxHeight || Graphics.height)
            ) || 1080;
            const canvas = graphicsReady && Graphics._canvas
                ? Graphics._canvas
                : document.getElementById('gameCanvas') || document.querySelector('canvas');
            const rect = canvas && typeof canvas.getBoundingClientRect === 'function'
                ? canvas.getBoundingClientRect()
                : null;

            let scale = NaN;
            if (rect && rect.width > 0 && rect.height > 0) {
                scale = Math.min(rect.width / logicalWidth, rect.height / logicalHeight);
            }
            if (!Number.isFinite(scale) || scale <= 0) {
                scale = graphicsReady && Graphics._realScale > 0
                    ? Graphics._realScale
                    : Math.min(window.innerWidth / logicalWidth, window.innerHeight / logicalHeight);
            }
            if (!Number.isFinite(scale) || scale <= 0) scale = 1;

            const fallbackWidth = logicalWidth * scale;
            const fallbackHeight = logicalHeight * scale;
            const displayWidth = rect && rect.width > 0 ? rect.width : fallbackWidth;
            const displayHeight = rect && rect.height > 0 ? rect.height : fallbackHeight;

            return {
                canvas,
                rect,
                scale,
                logicalWidth,
                logicalHeight,
                displayWidth,
                displayHeight
            };
        };

        // 依遊戲畫布而非瀏覽器固定像素生成尺寸。長更新履歷使用更寬、更高的
        // 正文區，普通短提示則保持較緊湊。
        getAdaptiveLayout(message, currentMetrics = null) {
            const metrics = currentMetrics || this.getGameCanvasMetrics();
            const text = String(message ?? '');
            const lineCount = text.split(/\r?\n|<br\s*\/?\s*>/i).length;
            const isLong = text.length >= 220 || lineCount >= 7;
            const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
            const maxWidth = metrics.displayWidth * 0.88;
            const minWidth = Math.min(maxWidth, isLong ? 520 : 320);
            const widthRatio = isLong ? 0.68 : 0.52;
            const width = Math.round(clamp(metrics.displayWidth * widthRatio, minWidth, maxWidth));
            const fontSize = Math.round(clamp(metrics.displayHeight * 0.026, 14, 30));

            return {
                ...metrics,
                width,
                fontSize,
                messageMaxHeight: Math.round(metrics.displayHeight * (isLong ? 0.62 : 0.46)),
                dialogMaxHeight: Math.round(metrics.displayHeight * 0.88)
            };
        };

        // 將隊列中的對話框入隊
        enqueue(options) {
            return new Promise(resolve => {
                // 错误画面上的提醒不能因关闭弹窗而恢复出错的游戏循环。
                if (options.resumeGame === false) this._keepSceneStopped = true;
                this.dialogQueue.push({ options, resolve });
                if (!this.isProcessing) this.processQueue();
            })
        };

        // 處理對話框隊列
        async processQueue() {
            if (this.dialogQueue.length === 0) {
                this.isProcessing = false;
                this.resumeScene();
                return;
            }

            this.isProcessing = true;
            const { options, resolve } = this.dialogQueue.shift();
            if (options.resumeGame === false) this._keepSceneStopped = true;
            const hasNextDialog = this.dialogQueue.length > 0;

            // 首次顯示對話框時暫停場景
            if (!this.currentDialog) this.stopScene();

            // 關閉當前對話框
            if (this.currentDialog) {
                await this.closeCurrentDialog(this.currentDialog.animation, hasNextDialog);
                if (hasNextDialog) {
                    await new Promise(r => setTimeout(r, this.transitionDelay));
                }
            }

            // 創建新對話框
            const result = await this.createDialog(options);
            resolve(result);

            this.processQueue();
        };

        // 關閉當前對話框
        closeCurrentDialog(animation, hasNextDialog = false) {
            return new Promise(resolve => {
                if (!this.currentDialog) return resolve();

                const { overlay, dialog } = this.currentDialog;
                const duration = this.getAnimationDuration(animation);

                const cleanup = () => {
                    overlay._dialogViewportCleanup?.();
                    overlay.remove();
                    this.currentDialog = null;
                    resolve();
                };

                if (duration > 0 && !hasNextDialog) {
                    overlay.style.transition = 'none';
                    void overlay.offsetHeight; // 強制重繪

                    overlay.classList.add('closing');
                    dialog.classList.add('closing');
                    setTimeout(cleanup, duration);
                } else if (hasNextDialog) {
                    overlay.style.transition = 'opacity 0.15s ease-out';
                    overlay.style.opacity = '0';
                    setTimeout(cleanup, 150);
                } else {
                    cleanup();
                }
            })
        };

        // 載入圖片並轉為可用的 dataURL（自動解密 .rpgmvp）。
        // <img> 無法直接讀加密圖，這裡用 MV 的 ImageManager 載入解密後重繪到 canvas 再導出。
        // 用 dataURL 而非 blob URL：自包含、隨對話框 DOM 移除自動回收，無需手動釋放。
        // path 可為 'img/pictures/test' 形式（可含或不含扩展名）。
        loadImageURL(path) {
            return new Promise((resolve, reject) => {
                if (typeof ImageManager === 'undefined') return reject('ImageManager 未就緒');
                const clean = String(path).replace(/\.(png|rpgmvp)$/i, '');
                const slash = clean.lastIndexOf('/');
                const folder = slash >= 0 ? clean.slice(0, slash + 1) : 'img/pictures/';
                const filename = slash >= 0 ? clean.slice(slash + 1) : clean;
                const bmp = ImageManager.loadBitmap(folder, filename, 0, true);
                bmp.addLoadListener(() => {
                    if (bmp.isError && bmp.isError()) return reject('圖片載入失敗: ' + path);
                    try {
                        const imgEl = bmp._image;
                        const hasImg = imgEl && (imgEl.naturalWidth || imgEl.width);
                        const srcEl = hasImg ? imgEl : (bmp._canvas || bmp.canvas);
                        if (!srcEl) return reject('無可用圖像數據: ' + path);
                        const w = (hasImg ? (imgEl.naturalWidth || imgEl.width) : srcEl.width) || bmp.width;
                        const h = (hasImg ? (imgEl.naturalHeight || imgEl.height) : srcEl.height) || bmp.height;
                        const c = document.createElement('canvas');
                        c.width = w; c.height = h;
                        c.getContext('2d').drawImage(srcEl, 0, 0);
                        resolve(c.toDataURL('image/png'));
                    } catch (e) { reject(e); }
                });
            });
        };

        // 解析視頻路徑為 <video> 可用的 src。
        // RPG Maker MZ 只加密 img/ 與 audio/，movies/ 下的視頻是明文，<video> 可直接引用相對路徑。
        // path 可為 'movies/foo'、'movies/foo.webm' 或僅 'foo'（默認 movies/ 目錄、.webm 擴展名）。
        resolveVideoURL(path) {
            let p = String(path).trim();
            if (p.indexOf('/') < 0) p = 'movies/' + p;      // 無目錄 → 默認 movies/
            if (!/\.\w{2,4}$/.test(p)) p += '.webm';         // 無擴展名 → 默認 .webm
            return encodeURI(p);                             // 處理空格等特殊字符
        };

        // 創建對話框
        createDialog(rawOptions) {
            return new Promise(async resolve => {
                const adaptiveLayout = this.getAdaptiveLayout(rawOptions.message);
                const hasExplicitWidth = Number.isFinite(Number(rawOptions.width));
                const hasExplicitFontSize = Number.isFinite(Number(rawOptions.fontSize));
                const {
                    type = 'alert',
                    message = '',
                    title = '',
                    confirmText = 'OK',
                    cancelText = 'Cancel',
                    defaultValue = '',
                    placeholder = 'Enter text...',
                    position = 'center',
                    width = adaptiveLayout.width,
                    fontSize = adaptiveLayout.fontSize,
                    adaptive = true,
                    autoClose = false,
                    duration = 3,
                    animation = 'fade',
                    align = 'center',
                    extraButton = null,
                    img = null,                                                          // 圖片路徑（支持加密 .rpgmvp）
                    imgStyle = 'width:100%;height:auto;border-radius:8px;margin:6px 0;display:block;', // 圖片樣式
                    imgPosition = 'top',                                                 // top（文字上方）/ bottom（下方）
                    video = null,                                                        // 視頻路徑（webm；默認 movies/ 目錄；透明底自動循環）
                    videoStyle = 'width:100%;height:auto;border-radius:8px;margin:6px 0;display:block;', // 視頻樣式
                    videoPosition = 'top',                                               // top（文字上方）/ bottom（下方）/ header（窗口外貼頂邊）
                    videoHeaderOverlap = 0,                                              // 僅 header：視頻往下疊進窗口的像素，用來吃掉 webm 底部透明留白，讓人物貼住窗口頂邊
                    videoHeaderRatio = 1 / 3,                                            // 僅 header：視頻高度占實際遊戲 canvas 高度的比例
                } = rawOptions;

                const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
                const requestedWidth = Number.isFinite(Number(width))
                    ? Number(width)
                    : adaptiveLayout.width;
                const requestedFontSize = Number.isFinite(Number(fontSize))
                    ? Number(fontSize)
                    : adaptiveLayout.fontSize;
                // 舊調用中的 420/500/560px 只作為最低建議值，避免它們繼續把安卓和平板
                // 的彈窗鎖死在小尺寸。特殊用途可傳 adaptive:false，恢復精確指定尺寸。
                const safeWidth = clamp(
                    adaptive !== false
                        ? Math.max(requestedWidth, adaptiveLayout.width)
                        : requestedWidth,
                    160,
                    adaptiveLayout.displayWidth * 0.92
                );
                const safeFontSize = clamp(
                    adaptive !== false
                        ? Math.max(requestedFontSize, adaptiveLayout.fontSize)
                        : requestedFontSize,
                    12,
                    64
                );
                const titleFontSize = Math.round(clamp(safeFontSize * 1.15, 20, 56));
                const buttonFontSize = Math.round(clamp(safeFontSize * 0.90, 16, 36));
                const headerOverlap = Math.max(0, Number(videoHeaderOverlap) || 0);
                const headerRatio = clamp(Number(videoHeaderRatio) || 1 / 3, 0.12, 0.45);

                // 組合訊息主體：先把文字的 \n 轉為 <br>，再按位置拼接圖片 / 視頻
                let bodyHtml = String(message).replace(/\n/g, '<br>');

                // 收集要插入的媒體（圖片、視頻），各自可選位於文字上方(top)或下方(bottom)
                let topMedia = '', bottomMedia = '';

                if (img) {
                    try {
                        const url = await this.loadImageURL(img);
                        const imgTag = `<img src="${url}" style="${imgStyle}">`;
                        if (imgPosition === 'bottom') bottomMedia += imgTag; else topMedia += imgTag;
                    } catch (e) {
                        console.warn('[Dialog] 圖片載入失敗:', e);
                    }
                }

                let headerVideoHtml = '';   // 'header' 模式：浮在窗口外、貼着頂邊上方的視頻（不進正文、不隨文字滾動）

                if (video) {
                    // 透明底 webm：MZ 不加密 movies/，<video> 可直接引用相對路徑。
                    // autoplay 需配合 muted 才不被瀏覽器策略攔截；loop 自動循環；
                    // playsinline 防止移動端 WebView 把視頻接管成全屏播放。
                    const src = this.resolveVideoURL(video);
                    if (videoPosition === 'header') {
                        // 視頻在窗口上方顯示，但由父容器預留高度。固定 360px 僅保留為
                        // 調用方的外觀參數，最終高度統一由 canvas 比例變量覆蓋。
                        const hdrBase = (rawOptions.videoStyle != null)
                            ? videoStyle
                            : 'display:block;';
                        // 最後追加的聲明覆蓋舊調用中的 width:100% / max-height:360px，
                        // 保證 PC、Android、平板都使用同一個相對高度且 object-fit 不裁剪。
                        const hdrStyle = hdrBase +
                            'position:absolute;top:0;left:0;right:auto;bottom:auto;' +
                            'width:100% !important;' +
                            'height:var(--dialog-header-video-height) !important;' +
                            'max-height:var(--dialog-header-video-height) !important;' +
                            'margin:0 !important;transform:none !important;' +
                            'object-fit:contain;object-position:center bottom;';
                        headerVideoHtml = `<video class="dialog-header-video" src="${src}" autoplay loop muted playsinline ` +
                            `webkit-playsinline preload="auto" style="${hdrStyle}"></video>`;
                    } else {
                        const videoTag = `<video src="${src}" autoplay loop muted playsinline ` +
                            `webkit-playsinline preload="auto" style="${videoStyle}"></video>`;
                        if (videoPosition === 'bottom') bottomMedia += videoTag; else topMedia += videoTag;
                    }
                }

                if (topMedia || bottomMedia) {
                    const inner = topMedia + bodyHtml + bottomMedia;
                    // 關鍵：有媒體時用固定寬度容器包住「媒體+文字」。
                    // 否則 .dialog 為 fit-content，長文本會把對話框撐到很寬，而媒體 width:100% 仍只對應這個被撐寬的容器，反而顯得媒體很小。
                    // 給定寬度後：文字在此寬度內換行、對話框 fit-content 收斂到此寬度、媒體 width:100% 正好填滿，三者一致。
                    // 使用中央計算出的畫布自適應寬度，讓媒體與窗口保持一致。
                    const baseW = safeWidth;
                    const contentWidth = Math.max(160, baseW - 48); // 減去內容區左右內邊距
                    bodyHtml = `<div style="width:min(${contentWidth}px, 82vw);max-width:100%;margin:0 auto;">${inner}</div>`;
                }

                const dialogWidth = safeWidth;
                const hasHeaderVideo = Boolean(headerVideoHtml);
                const getHeaderLayout = layout => {
                    if (!hasHeaderVideo) {
                        return {
                            videoHeight: 0,
                            videoSpace: 0,
                            dialogMaxHeight: layout.dialogMaxHeight
                        };
                    }

                    const videoHeight = Math.round(layout.displayHeight * headerRatio);
                    const videoSpace = Math.max(0, videoHeight - headerOverlap);
                    // overlay 每邊最多使用約 2.5% padding，整組控制在 canvas 的 94% 內。
                    // 對話框正文會滾動，優先保證頭部視頻完整可見。
                    const groupMaxHeight = Math.round(layout.displayHeight * 0.94);
                    const dialogMaxHeight = Math.max(96, groupMaxHeight - videoSpace);
                    return { videoHeight, videoSpace, dialogMaxHeight };
                };
                const initialHeaderLayout = getHeaderLayout(adaptiveLayout);

                const overlayAnimationClass = !animation || animation === 'none'
                    ? 'no-animation' : 'animated-fade';
                const dialogAnimationClass = this.getAnimationClass(animation);
                const positionClass = this.getPositionClass(position);
                const hasQueue = this.dialogQueue.length > 0;

                const showCancelBtn = type === 'confirm' || type === 'prompt';
                const showInput = type === 'prompt';

                const html = `
                    <div class="dialog-overlay ${overlayAnimationClass} ${positionClass}"
                         ${hasQueue ? 'style="opacity: 0;"' : ''}>
                        <div class="dialog-scale${hasHeaderVideo ? ' has-header-video' : ''}"
                             style="--dialog-header-video-height: ${initialHeaderLayout.videoHeight}px;
                                    --dialog-header-video-space: ${initialHeaderLayout.videoSpace}px;">
                        ${headerVideoHtml}
                        <div class="dialog ${dialogAnimationClass}"
                             style="--dialog-width: ${dialogWidth}px;
                                    --dialog-max-width: ${adaptiveLayout.displayWidth * 0.92}px;
                                    --dialog-max-height: ${initialHeaderLayout.dialogMaxHeight}px;
                                    --dialog-message-max-height: ${adaptiveLayout.messageMaxHeight}px;
                                    --dialog-title-font-size: ${titleFontSize}px;
                                    --dialog-button-font-size: ${buttonFontSize}px;">
                            <div class="dialog-content">
                                ${title ? `<div class="dialog-title">${title}</div>` : '<div class="dialog-title-spacer"></div>'}
                                <div class="dialog-message-align dialog-message-container" align="${align}">
                                    <div class="dialog-message-align dialog-message"
                                         align="${align}"
                                         style="--message-font-size: ${safeFontSize}px;">
                                        ${bodyHtml}
                                    </div>
                                </div>
                                ${showInput ? `
                                    <div class="dialog-input-container">
                                        <input class="dialog-input" 
                                               type="text" 
                                               value="${defaultValue}" 
                                               placeholder="${placeholder}"
                                               style="text-align: center;">
                                    </div>
                                ` : ''}
                                <div class="dialog-buttons">
                                    ${extraButton ? `
                                        <button class="dialog-button dialog-button-secondary" data-action="extra"
                                                style="margin-right: auto;">
                                            ${extraButton.text || 'Extra'}
                                        </button>
                                    ` : ''}
                                    ${showCancelBtn ? `
                                        <button class="dialog-button dialog-button-secondary" data-action="cancel">
                                            ${cancelText}
                                        </button>
                                    ` : ''}
                                    <button class="dialog-button dialog-button-primary" data-action="confirm">
                                        ${confirmText}
                                    </button>
                                </div>
                            </div>
                        </div>
                        </div>
                    </div>
                `;

                // 解析模板為 DOM 元素
                document.body.appendChild(
                    document.createRange().createContextualFragment(html)
                );

                const overlay = document.querySelector('.dialog-overlay');

                const scaleContainer = overlay.querySelector('.dialog-scale');
                const dialog = overlay.querySelector('.dialog');
                const messageElement = overlay.querySelector('.dialog-message');
                const inputElement = overlay.querySelector('.dialog-input');
                const confirmBtn = overlay.querySelector('[data-action="confirm"]');
                const cancelBtn = overlay.querySelector('[data-action="cancel"]');

                // 讓彈窗與 canvas 的實際 CSS 顯示區域同步，並跟隨信箱黑邊、
                // Android 全屏安全區及平板旋轉後的 canvas 位置/尺寸。
                let viewportListenersAttached = false;
                let canvasResizeObserver = null;
                const detachViewportListeners = () => {
                    if (!viewportListenersAttached) return;
                    viewportListenersAttached = false;
                    window.removeEventListener('resize', applyGameCanvasLayout);
                    window.removeEventListener('orientationchange', applyGameCanvasLayout);
                    window.visualViewport?.removeEventListener('resize', applyGameCanvasLayout);
                    window.visualViewport?.removeEventListener('scroll', applyGameCanvasLayout);
                    canvasResizeObserver?.disconnect();
                    canvasResizeObserver = null;
                };
                const applyGameCanvasLayout = () => {
                    if (!document.body.contains(overlay)) {
                        detachViewportListeners();
                        return;
                    }
                    const metrics = this.getGameCanvasMetrics();
                    const liveLayout = this.getAdaptiveLayout(message, metrics);
                    const liveHeaderLayout = getHeaderLayout(liveLayout);
                    const liveRequestedWidth = hasExplicitWidth
                        ? Number(rawOptions.width)
                        : liveLayout.width;
                    const liveRequestedFontSize = hasExplicitFontSize
                        ? Number(rawOptions.fontSize)
                        : liveLayout.fontSize;
                    const liveWidth = clamp(
                        adaptive !== false
                            ? Math.max(liveRequestedWidth, liveLayout.width)
                            : liveRequestedWidth,
                        160,
                        metrics.displayWidth * 0.92
                    );
                    const liveFontSize = clamp(
                        adaptive !== false
                            ? Math.max(liveRequestedFontSize, liveLayout.fontSize)
                            : liveRequestedFontSize,
                        12,
                        64
                    );

                    dialog.style.setProperty('--dialog-width', `${liveWidth}px`);
                    dialog.style.setProperty('--dialog-max-width', `${metrics.displayWidth * 0.92}px`);
                    dialog.style.setProperty('--dialog-max-height', `${liveHeaderLayout.dialogMaxHeight}px`);
                    dialog.style.setProperty('--dialog-message-max-height', `${liveLayout.messageMaxHeight}px`);
                    scaleContainer?.style.setProperty(
                        '--dialog-header-video-height',
                        `${liveHeaderLayout.videoHeight}px`
                    );
                    scaleContainer?.style.setProperty(
                        '--dialog-header-video-space',
                        `${liveHeaderLayout.videoSpace}px`
                    );
                    dialog.style.setProperty(
                        '--dialog-title-font-size',
                        `${Math.round(clamp(liveFontSize * 1.15, 20, 56))}px`
                    );
                    dialog.style.setProperty(
                        '--dialog-button-font-size',
                        `${Math.round(clamp(liveFontSize * 0.90, 16, 36))}px`
                    );
                    messageElement?.style.setProperty('--message-font-size', `${liveFontSize}px`);

                    const rect = metrics.rect;
                    if (rect && rect.width > 0 && rect.height > 0) {
                        overlay.style.inset = 'auto';
                        overlay.style.left = `${rect.left}px`;
                        overlay.style.top = `${rect.top}px`;
                        overlay.style.width = `${rect.width}px`;
                        overlay.style.height = `${rect.height}px`;
                        const padding = clamp(Math.min(rect.width, rect.height) * 0.025, 8, 48);
                        overlay.style.padding = `${padding}px`;
                    } else {
                        overlay.style.inset = '0';
                        overlay.style.left = '';
                        overlay.style.top = '';
                        overlay.style.width = '';
                        overlay.style.height = '';
                    }
                };
                overlay._dialogViewportCleanup = detachViewportListeners;
                applyGameCanvasLayout();
                if (document.body.contains(overlay)) {
                    window.addEventListener('resize', applyGameCanvasLayout);
                    window.addEventListener('orientationchange', applyGameCanvasLayout);
                    window.visualViewport?.addEventListener('resize', applyGameCanvasLayout);
                    window.visualViewport?.addEventListener('scroll', applyGameCanvasLayout);
                    if (typeof ResizeObserver === 'function' && adaptiveLayout.canvas) {
                        canvasResizeObserver = new ResizeObserver(applyGameCanvasLayout);
                        canvasResizeObserver.observe(adaptiveLayout.canvas);
                    }
                    viewportListenersAttached = true;
                }

                // 兜底：部分打包 WebView 會忽略 autoplay 屬性，這裡主動觸發播放並確保靜音/循環
                overlay.querySelectorAll('video').forEach(v => {
                    v.muted = true;          // 再次確保靜音，避免 autoplay 被策略攔截
                    v.loop = true;
                    const tryPlay = () => { const r = v.play(); if (r && r.catch) r.catch(() => {}); };
                    tryPlay();
                    v.addEventListener('canplay', tryPlay, { once: true });
                });

                // 阻止 TouchInput._onTouchStart 對對話框內的觸控呼叫 preventDefault()，
                // 否則 Android WebView 不會合成 click 事件，按鈕將無法點擊（PC 不受影響）
                ['touchstart', 'touchend', 'touchmove', 'touchcancel',
                 'mousedown', 'mouseup', 'pointerdown'].forEach(evt => {
                    overlay.addEventListener(evt, e => e.stopPropagation(), { passive: false });
                });

                // 防止触发对话框的那次输入（鼠标/键盘）误关闭对话框
                let dialogReady = false;
                setTimeout(() => { dialogReady = true; }, 250);

                // 確認/取消/背景點擊
                const handleClose = (confirmed) => {
                    if (!dialogReady) return;
                    let result;
                    if (type === 'prompt') {
                        result = confirmed ? (inputElement?.value ?? '') : null;
                    } else {
                        result = confirmed;
                    }

                    const hasNextInQueue = this.dialogQueue.length > 0;
                    const duration = this.getAnimationDuration(animation);

                    const cleanup = () => {
                        overlay._dialogViewportCleanup?.();
                        overlay.remove();
                        if (this.currentDialog?.overlay === overlay) {
                            this.currentDialog = null;
                        }
                        if (!hasNextInQueue) this.resumeScene();
                        resolve(result);
                    };

                    if (duration > 0 && !hasNextInQueue) {
                        overlay.style.transition = 'none';
                        void overlay.offsetHeight; // 強制重繪

                        overlay.classList.add('closing');
                        dialog.classList.add('closing');
                        setTimeout(cleanup, duration);
                    } else if (hasNextInQueue) {
                        overlay.style.transition = 'opacity 0.15s ease-out';
                        overlay.style.opacity = '0';
                        setTimeout(cleanup, 150);
                    } else {
                        cleanup();
                    }
                };

                overlay.addEventListener('click', e => {
                    const target = e.target;

                    // 點擊確認按鈕
                    if (target === confirmBtn || target.closest('[data-action="confirm"]')) {
                        handleClose(true);
                    }
                    // 點擊取消按鈕
                    else if (target === cancelBtn || target.closest('[data-action="cancel"]')) {
                        handleClose(false);
                    }
                    // 點擊額外按鈕
                    else if (extraButton && target.closest('[data-action="extra"]')) {
                        if (!dialogReady) return;
                        const ctx = {
                            input: inputElement?.value ?? '',
                            close: (value) => {
                                resolve(value);
                                overlay._dialogViewportCleanup?.();
                                overlay.remove();
                                if (this.currentDialog?.overlay === overlay) {
                                    this.currentDialog = null;
                                }
                                if (this.dialogQueue.length === 0) this.resumeScene();
                            }
                        };
                        try {
                            extraButton.onClick?.(ctx);
                        } catch (err) {
                            console.error('extraButton onClick error:', err);
                        }
                    }
                    // 點擊模態背景（overlay 本身，不是 dialog 內部）
                    // else if (target === overlay) {
                    // handleClose(false);
                    // }
                });

                // 輸入框 Enter 鍵處理
                if (inputElement) {
                    inputElement.addEventListener('keydown', e => {
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleClose(true);
                        }
                    })
                };

                this.currentDialog = { overlay, dialog, animation };

                // 隊列淡入處理
                if (hasQueue) {
                    requestAnimationFrame(() => {
                        overlay.style.transition = 'opacity 0.2s ease-in';
                        overlay.style.opacity = '1';
                    })
                }

                // 延遲聚焦
                setTimeout(() => {
                    if (inputElement) {
                        inputElement.focus();
                    } else {
                        confirmBtn?.focus();
                    }
                }, hasQueue ? 150 : 50);

                // 自動關閉
                if (autoClose && duration > 0) {
                    setTimeout(() => {
                        if (this.currentDialog?.overlay === overlay) {
                            handleClose(true);
                        }
                    }, duration * 1000);
                }
            });
        };
    };

    // [MZ移植] 已移除 Tilemap / ShaderTilemap.updateTransform 的 MV 引擎内部覆写：
    //   MZ 没有 ShaderTilemap，且 MZ 的 Tilemap 内部结构（_margin/_tileWidth/_paintAllTiles）完全不同。

    const dialogManager = new DialogManager();

    // 让 DOM alert / confirm 与普通窗口文本共用 WAY_EvalText 的 ${...} 求值能力。
    // WAY_EvalText 在本插件之后加载，因此调用时动态取入口，避免插件加载顺序耦合。
    const evalDialogText = message => {
        const source = String(message ?? '');
        const evaluator = window.WAY_EvalText?.evalText;
        if (typeof evaluator !== 'function') return source;
        try {
            return String(evaluator(source) ?? '');
        } catch (error) {
            console.warn('[Dialog] WAY_EvalText 求值失败，已保留原文本:', error);
            return source;
        }
    };

    let dialogEscapeWindow = null;
    const dialogLiteralSlashToken = '\uE000DIALOG_LITERAL_SLASH\uE001';

    const getDialogEscapeWindow = () => {
        // MZ 的 Window_Base 只接受 Rectangle，不能使用 MV 的四参数构造方式。
        // 复用一个不加入场景树的小窗口，避免每次弹窗都创建 Bitmap / PIXI 子对象。
        if (!dialogEscapeWindow) {
            dialogEscapeWindow = new Window_Base(new Rectangle(0, 0, 48, 48));
        }
        return dialogEscapeWindow;
    };

    const protectLiteralBackslashes = text => text.replace(
        /\\(?!\\|(?:[A-Z]+)\[|G(?![A-Z])|[$.|^!><{}])/gi,
        dialogLiteralSlashToken
    );

    const restoreDialogPlainText = text => String(text ?? '')
        // DOM 文本没有 Window_Base 的逐字绘制流程；清理颜色、图标、字号等绘制型指令。
        // 指代型转义（\V、\N、\P、\G、\STR 等）在此前已经由插件链转换成了正文。
        .replace(/\x1b[A-Z]+\[[^\[\]]*\]/gi, '')
        .replace(/\x1b[$.|^!><{}]/g, '')
        // 未识别的扩展指令保留为可见的反斜杠文本，不留下不可见 ESC 控制字符。
        .replace(/\x1b/g, '\\')
        .split(dialogLiteralSlashToken).join('\\');

    const convertDialogText = message => {
        const source = String(message ?? '');

        // 启动早期（游戏对象尚未建立）仍可能有插件错误 alert，此时不能创建 Window_Base。
        // 这种情况退回 WAY_EvalText，确保错误提示本身不会再次引发异常。
        if (
            !window.$gameSystem ||
            typeof window.Window_Base !== 'function' ||
            typeof window.Rectangle !== 'function'
        ) {
            return evalDialogText(source);
        }

        try {
            const converter = getDialogEscapeWindow();
            const protectedSource = protectLiteralBackslashes(source);
            // 调用最终的 prototype 链；其中已包含 WAY_EvalText、\STR 和 Drill 窗口字符扩展。
            const converted = converter.convertEscapeCharacters(protectedSource);
            return restoreDialogPlainText(converted);
        } catch (error) {
            console.warn('[Dialog] 转义字符转换失败，已退回 WAY_EvalText:', error);
            return evalDialogText(source);
        }
    };

    const createEvalTextOptions = (type, message, options) => {
        // 保留原有的 options 覆盖规则，然后转换最终实际显示的 message。
        const result = {
            type,
            message: String(message ?? ''),
            ...options
        };
        result.message = convertDialogText(result.message);
        return result;
    };

    Object.assign(window, {
        alert: (message, options = {}) =>
            dialogManager.enqueue(createEvalTextOptions('alert', message, options)),
        confirm: (message, options = {}) =>
            dialogManager.enqueue(createEvalTextOptions('confirm', message, options)),
        prompt: (message, defaultValue = '', options = {}) => dialogManager.enqueue({
            type: 'prompt',
            message: String(message ?? ''),
            defaultValue: String(defaultValue ?? ''),
            ...options
        })
    });
})();
