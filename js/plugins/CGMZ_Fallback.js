//=============================================================================
// CGMZ_Fallback.js  —— 自包含精简版（已剥离 CGMZ_Core 依赖）
//-----------------------------------------------------------------------------
// 原 [CGMZ] Fallback 依赖 CGMZ_Core（CGMZ_Utils / CGMZ 命名空间 / 插件参数）。
// 本版只保留它的核心思路（失败时换兜底文件 + retry），剥离全部 CGMZ 依赖，
// 改用本工程 MV 版早已硬编码的兜底资源，并搬回"告知玩家缺失文件"的 alert。
//=============================================================================
/*:
 * @target MZ
 * @plugindesc 图像/音频加载失败时弹窗告知玩家缺失的文件，并用兜底资源继续，不崩溃。（自包含，无需 CGMZ_Core）
 * @author CasperGaming（原作） / 本工程精简适配
 * @help
 * 行为：
 *   - 图像加载失败 → 弹窗提示缺失的文件路径 → 改用兜底图 projectiles/null1 继续；
 *   - 音频加载失败 → 弹窗提示缺失的文件路径 → 改用兜底音 se/013myuu_YumeSE_SystemBuzzer02 继续。
 *   弹窗按 ConfigManager.language 中/日/英显示；同一文件只提示一次，避免刷屏。
 *
 * 注意：兜底资源本身必须真实存在，否则它加载失败会再次触发 _onError；
 *       本插件已加防护——当失败的就是兜底文件本身时，不再重试（防死循环）。
 */
(() => {
	"use strict";

	// ---- 兜底资源（沿用 MV 硬编码，路径不含扩展名）----
	const DEFAULT_IMAGE = 'projectiles/null1';                 // → img/projectiles/null1.png
	const DEFAULT_AUDIO = 'se/013myuu_YumeSE_SystemBuzzer02';  // → audio/se/...（扩展名由引擎决定）

	// ---- 已提示过的 url 去重，避免同一缺失文件反复弹窗 ----
	const alertedUrls = new Set();

	// ---- 弹窗：让玩家知道缺了哪个文件 ----
	const showLoadAlert = (url) => {
		let shown;
		try { shown = decodeURIComponent(url); } catch (e) { shown = String(url); }
		if (alertedUrls.has(shown)) { return; }   // 同一文件只提示一次
		alertedUrls.add(shown);
		const isMobile = Utils.isMobileDevice();
		let text;
		switch (ConfigManager.language) {
			case 0: // 中文
			case 12:
				if (isMobile) { // 安卓 APK 版本
					text = [
						`无法读取文件：${shown}。`,
						"该文件可能缺失或损坏，也可能是 APK 安装包不完整或安装异常导致的。",
						"请重新下载完整的游戏 APK 安装包，并重新安装。",
						"（关闭该弹窗后仍可继续游戏）"
					];
				} else { // 桌面压缩包版本
					text = [
						`无法读取文件：${shown}。`,
						"该文件可能缺失、损坏，或因解压异常而无法正常读取。",
						"请重新下载游戏，并使用 7-Zip、Bandizip 等主流解压软件重新解压。",
						"（关闭该弹窗后仍可继续游戏）"
					];
				}
				break;
			case 1: // 日文
				if (isMobile) { // 安卓 APK 版本
					text = [
						`ファイルを読み込めません：${shown}`,
						"ファイルの欠落・破損、APK ファイルのダウンロード未完了、またはインストール時の不具合が原因の可能性があります。",
						"ゲームの APK ファイルを再度ダウンロードし、ダウンロード完了後に再インストールしてください。",
						"（このウィンドウを閉じると、ゲームを続けられます）"
					];
				} else { // 桌面压缩包版本
					text = [
						`ファイルを読み込めません：${shown}`,
						"ファイルが欠落・破損しているか、解凍時の不具合により正常に読み込めない可能性があります。",
						"ゲームを再度ダウンロードし、7-Zip や Bandizip などの解凍ソフトで解凍し直してください。",
						"（このウィンドウを閉じると、ゲームを続けられます）"
					];
				}
				break;
			default: // 英文（其他语言默认使用）
				if (isMobile) { // 安卓 APK 版本
					text = [
						`Failed to load file: ${shown}.`,
						"The file may be missing or corrupted, or the APK may be incomplete or incorrectly installed.",
						"Please download the complete game APK again and reinstall it.",
						"(You can continue the game after closing this window.)"
					];
				} else { // 桌面压缩包版本
					text = [
						`Failed to load file: ${shown}.`,
						"The file may be missing, corrupted, or unreadable due to an extraction error.",
						"Please download the game again and extract it using a widely used archive utility such as 7-Zip or Bandizip.",
						"(You can continue the game after closing this window.)"
					];
				}
				break;
		}
		alert(text.join("\n"), { align: 'left' });
	};

	//=========================================================================
	// Bitmap：图像加载失败 → 提示 + 兜底图 + retry
	//=========================================================================
	// 兜底图的 folder / filename（拆分逻辑同 CGMZ_Utils.getImageData）
	const _imgParts = DEFAULT_IMAGE.split("/");
	const _imgFile = _imgParts.pop();
	const _imgFolder = "img/" + (_imgParts.length ? _imgParts.join("/") + "/" : "");
	const _fallbackImageUrl = _imgFolder + Utils.encodeURI(_imgFile) + ".png";

	const _CGMZF_Bitmap_onError = Bitmap.prototype._onError;
	Bitmap.prototype._onError = function() {
		// 失败的就是兜底图本身 → 不再重试，走原版（防死循环）
		if (this._url === _fallbackImageUrl) {
			_CGMZF_Bitmap_onError.call(this);
			return;
		}
		showLoadAlert(this._url);
		ImageManager.loadBitmap(_imgFolder, _imgFile);   // 预热兜底图进缓存
		this._url = _fallbackImageUrl;
		this.retry();
	};

	//=========================================================================
	// WebAudio：音频加载失败 → 提示 + 兜底音 + retry
	//=========================================================================
	const _CGMZF_WebAudio_onError = WebAudio.prototype._onError;
	WebAudio.prototype._onError = function() {
		// 兜底音 URL 延迟构造，确保 AudioManager 就绪、扩展名正确（.ogg / .m4a）
		const aParts = DEFAULT_AUDIO.split("/");
		const aFile = aParts.pop();
		const aSub = aParts.length ? aParts.join("/") + "/" : "";
		const fallbackAudioUrl = AudioManager._path + aSub + Utils.encodeURI(aFile) + AudioManager.audioFileExt();
		// 失败的就是兜底音本身 → 不再重试（防死循环）
		if (this._url === fallbackAudioUrl) {
			_CGMZF_WebAudio_onError.call(this);
			return;
		}
		showLoadAlert(this._url);
		this._url = fallbackAudioUrl;
		this.retry();
	};

})();
