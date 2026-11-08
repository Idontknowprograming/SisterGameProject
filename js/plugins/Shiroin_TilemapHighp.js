//=============================================================================
// Shiroin_TilemapHighp.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v1.0] 瓦片地图断层线修复：强制瓦片着色器使用 highp 精度
 * @author patch by Claude（着色器源自 RMMZ core / 参考 AndroidFix by Xu Chen）
 *
 * @help
 * =============================================================================
 * 只做一件事
 * =============================================================================
 * 重写 Tilemap.Renderer._createShader，给【瓦片地图片元着色器】声明
 *   precision highp float;
 * 修复因本工程 PIXI 默认把片元精度设成 mediump（js/libs/pixi.js 中
 *   PRECISION_FRAGMENT: isMobile.apple.device ? 'highp' : 'mediump'）
 * 而在 2048×2048 瓦片图集上产生的“瓦片边缘黑色断层线”。
 *
 * - 全平台生效（PC / 安卓都修）。
 * - 不改音频、不改任何其它着色器、无参数、无存档影响。
 * - 着色器主体与 RMMZ 原版完全一致，仅多了开头那一行精度声明。
 *
 * 放在哪都行（建议靠后），但必须 status=true。
 * =============================================================================
 */

(() => {
	"use strict";

	if (typeof Tilemap === "undefined" || !Tilemap.Renderer || !Tilemap.Renderer.prototype) {
		console.warn("[TilemapHighp] 未找到 Tilemap.Renderer，补丁未生效。");
		return;
	}

	// 1.6.0 及以上：三个 uSampler 都为 0（与原版一致）；更老版本：0/1/2
	const hasV160 = (typeof Utils !== "undefined" && Utils.checkRMVersion)
		? Utils.checkRMVersion("1.6.0") : true;
	const uSampler0 = 0;
	const uSampler1 = hasV160 ? 0 : 1;
	const uSampler2 = hasV160 ? 0 : 2;

	Tilemap.Renderer.prototype._createShader = function () {
		const vertexSrc =
			"attribute float aTextureId;" +
			"attribute vec4 aFrame;" +
			"attribute vec2 aSource;" +
			"attribute vec2 aDest;" +
			"uniform mat3 uProjectionMatrix;" +
			"varying vec4 vFrame;" +
			"varying vec2 vTextureCoord;" +
			"varying float vTextureId;" +
			"void main(void) {" +
			"  vec3 position = uProjectionMatrix * vec3(aDest, 1.0);" +
			"  gl_Position = vec4(position, 1.0);" +
			"  vFrame = aFrame;" +
			"  vTextureCoord = aSource;" +
			"  vTextureId = aTextureId;" +
			"}";
		const fragmentSrc =
			"precision highp float;" +                    // ★唯一关键改动：强制高精度
			"varying vec4 vFrame;" +
			"varying vec2 vTextureCoord;" +
			"varying float vTextureId;" +
			"uniform sampler2D uSampler0;" +
			"uniform sampler2D uSampler1;" +
			"uniform sampler2D uSampler2;" +
			"void main(void) {" +
			"  vec2 textureCoord = clamp(vTextureCoord, vFrame.xy, vFrame.zw);" +
			"  int textureId = int(vTextureId);" +
			"  vec4 color;" +
			"  if (textureId < 0) {" +
			"    color = vec4(0.0, 0.0, 0.0, 0.5);" +
			"  } else if (textureId == 0) {" +
			"    color = texture2D(uSampler0, textureCoord / 2048.0);" +
			"  } else if (textureId == 1) {" +
			"    color = texture2D(uSampler1, textureCoord / 2048.0);" +
			"  } else if (textureId == 2) {" +
			"    color = texture2D(uSampler2, textureCoord / 2048.0);" +
			"  }" +
			"  gl_FragColor = color;" +
			"}";

		return new PIXI.Shader(PIXI.Program.from(vertexSrc, fragmentSrc), {
			uSampler0,
			uSampler1,
			uSampler2,
			uProjectionMatrix: new PIXI.Matrix()
		});
	};
})();
