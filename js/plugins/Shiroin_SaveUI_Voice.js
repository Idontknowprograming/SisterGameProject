//=============================================================================
// Shiroin_SaveUI_Voice.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v1.0] Shiroin SaveUI 语音补丁：二次确认框弹出 & 存读档成功时播放自定义妹妹语音（自 TSR_Save 迁移）
 * @author patch by Claude
 *
 * @help
 * =============================================================================
 * 作用
 * =============================================================================
 * 把旧 MV 版 TSR_Save 里的存读档语音逻辑，迁移到 MZ 版 Shiroin_SaveUI_MZ 上：
 *   1. 弹出二次确认框时播放语音；
 *   2. 存档 / 读档成功时播放语音（替代默认存读档 SE，与 TSR 行为一致）。
 *
 * 语音随主角(actor1)是否处于「杂鱼」状态（状态ID 16）切换不同台词，
 * 命名沿用你 TSR_Save 里的文件名：
 *   - 确认框 · 存档：  save_sis_SE   （杂鱼：save_sis_zako0）
 *   - 确认框 · 读档：  load_sis_SE   （杂鱼：load_sis_zako0）
 *   - 存档成功：       save_sis_SE2  （杂鱼：save_sis_zako1）
 *   - 读档成功：       load_sis_SE2  （杂鱼：load_sis_zako1）
 *
 * =============================================================================
 * 安装 / 依赖
 * =============================================================================
 * - 放在 Shiroin_SaveUI_MZ 的【下面】。
 * - 依赖 SimpleVoice.js 提供的 AudioManager.playVoice。
 * - 读档确认框需要知道「该存档里 actor1 是否杂鱼」：本补丁在存档时把该标记写入
 *   savefileInfo（svuiZako），确认框同步读取，无需异步读存档文件。
 *   注意：此前已存在的旧存档没有该字段，读档确认框会按「非杂鱼」处理；
 *   覆盖保存一次后即带上标记。
 *
 * @param Zako State Id
 * @type number
 * @min 1
 * @desc 判定「杂鱼」用的状态ID（TSR 原值为 16）。
 * @default 16
 *
 * @param Replace Default SE
 * @type boolean
 * @on 替代
 * @off 叠加
 * @desc 成功时：语音替代默认存/读档 SE（同 TSR）。关=默认SE与语音都播。
 * @default true
 *
 * @param Voice Volume
 * @type number
 * @min 0
 * @max 100
 * @default 70
 *
 * @param Voice Channel
 * @type number
 * @min 0
 * @default 1
 */

(() => {
	"use strict";

	const PN = "Shiroin_SaveUI_Voice";
	const P = PluginManager.parameters(PN);
	const ZAKO_STATE_ID    = Number(P["Zako State Id"] || 16);
	const REPLACE_DEFAULT  = String(P["Replace Default SE"] || "true") === "true";
	const VOICE_VOLUME     = Number(P["Voice Volume"] != null ? P["Voice Volume"] : 70);
	const VOICE_CHANNEL    = Number(P["Voice Channel"] != null ? P["Voice Channel"] : 1);
	const VOICE_PITCH = 100, VOICE_PAN = 0;

	// 语音名表（沿用 TSR_Save 的文件名）
	const VOICE = {
		confirmSave: { no: "save_sis_SE",  zako: "save_sis_zako0" },
		confirmLoad: { no: "load_sis_SE",  zako: "load_sis_zako0" },
		successSave: { no: "save_sis_SE2", zako: "save_sis_zako1" },
		successLoad: { no: "load_sis_SE2", zako: "load_sis_zako1" },
	};

	function playVoice(name) {
		if (!name) return;
		if (typeof AudioManager === "undefined" || !AudioManager.playVoice) {
			console.warn("[SaveUI Voice] AudioManager.playVoice 不存在（需 SimpleVoice.js）");
			return;
		}
		AudioManager.playVoice(
			{ name: name, volume: VOICE_VOLUME, pitch: VOICE_PITCH, pan: VOICE_PAN },
			false, VOICE_CHANNEL
		);
	}
	function pick(group, zako) { return zako ? group.zako : group.no; }

	// 当前在场 actor1 是否杂鱼（用于：存档确认 / 存档成功 / 读档成功）
	function currentActorZako() {
		try { return $gameActors.actor(1)?.isStateAffected(ZAKO_STATE_ID) || false; }
		catch (e) { return false; }
	}
	// 指定存档槽里的 actor1 是否杂鱼（用于：读档确认框；从 savefileInfo 同步取）
	function slotZako(savefileId) {
		try { const info = DataManager.savefileInfo(savefileId); return !!(info && info.svuiZako); }
		catch (e) { return false; }
	}

	// 成功时临时屏蔽默认 SE，让语音"替代"它（与 TSR 一致），不重写核心流程
	function withSeSuppressed(fnName, body) {
		if (!REPLACE_DEFAULT) { body(); return; }
		const orig = SoundManager[fnName];
		SoundManager[fnName] = function () {};
		try { body(); } finally { SoundManager[fnName] = orig; }
	}

	//=========================================================================
	// 1) 存档时把「actor1 是否杂鱼」写入 savefileInfo（供读档确认框同步读取）
	//=========================================================================
	const _makeSavefileInfo = DataManager.makeSavefileInfo;
	DataManager.makeSavefileInfo = function () {
		const info = _makeSavefileInfo.call(this);
		try { info.svuiZako = $gameActors.actor(1)?.isStateAffected(ZAKO_STATE_ID) || false; }
		catch (e) { info.svuiZako = false; }
		return info;
	};
	const _buildSavefileInfoFromContents = ShiroinSaveUI.buildSavefileInfoFromContents;
	ShiroinSaveUI.buildSavefileInfoFromContents = function(contents) {
		const info = _buildSavefileInfoFromContents.call(this, contents);
		info.svuiZako = !!contents.actors?._data?.[1]?._states?.includes(ZAKO_STATE_ID);
		return info;
	};

	//=========================================================================
	// 2) 弹出二次确认框时
	//=========================================================================
	if (Scene_File.prototype.svuiOpenConfirm) {
		const _svuiOpenConfirm = Scene_File.prototype.svuiOpenConfirm;
		Scene_File.prototype.svuiOpenConfirm = function (type, savefileId) {
			_svuiOpenConfirm.call(this, type, savefileId);
			if (type === "load") {
				playVoice(pick(VOICE.confirmLoad, slotZako(savefileId)));
			} else {
				playVoice(pick(VOICE.confirmSave, currentActorZako()));
			}
		};
	} else {
		console.warn("[SaveUI Voice] 未找到 Scene_File.svuiOpenConfirm，确认框语音未挂载——请确认 Shiroin_SaveUI_MZ 在本插件之前加载。");
	}

	//=========================================================================
	// 3) 存档成功
	//=========================================================================
	const _onSaveSuccess = Scene_Save.prototype.onSaveSuccess;
	Scene_Save.prototype.onSaveSuccess = function () {
		playVoice(pick(VOICE.successSave, currentActorZako()));
		withSeSuppressed("playSave", () => _onSaveSuccess.call(this));
	};

	//=========================================================================
	// 4) 读档成功（onLoadSuccess 在 loadGame 之后，actor1 已是读取到的存档数据）
	//=========================================================================
	const _onLoadSuccess = Scene_Load.prototype.onLoadSuccess;
	Scene_Load.prototype.onLoadSuccess = function () {
		playVoice(pick(VOICE.successLoad, currentActorZako()));
		withSeSuppressed("playLoad", () => _onLoadSuccess.call(this));
	};

})();
