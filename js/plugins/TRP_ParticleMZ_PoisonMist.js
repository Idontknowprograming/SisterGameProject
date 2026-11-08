//=============================================================================
// TRP_ParticleMZ_PoisonMist.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [TRP粒子预设] poisonMist 毒雾
 * @author Shiroin
 * @requiredAssets img/particles/smog1
 * @requiredAssets img/particles/smog2
 * @requiredAssets img/particles/cloud2s
 * @requiredAssets img/particles/cloud2
 *
 * @help
 * 本插件必须放在 TRP_ParticleMZ_Preset.js 之后。
 *
 * 预设名：poisonMist
 * 使用贴图：smog1.png, smog2.png, cloud2s.png, cloud2.png
 *
 * 以 aura_static_b 为设计基础，但改为覆盖圆心的实心圆出生区域，
 * 并降低向外速度，避免形成中央镂空的圆环。
 */

(() => {
    "use strict";

    if (typeof $dataTrpParticlePreset === "undefined") return;

    $dataTrpParticlePreset.poisonMist = {
        version: 4,
        alpha: {
            list: [
                { time: 0, value: 0 },
                // 高密度粒子叠加时保持半透明，避免雾团变成实体色块。
                // 约2帧内显形，避免高速 QJ 弹已经飞远后雾才慢慢出现。
                { time: 0.04, value: 0.16 },
                { time: 0.68, value: 0.08 },
                { time: 1, value: 0 }
            ]
        },
        scale: {
            list: [
                { time: 0, value: 0.32 },
                { time: 0.45, value: 0.82 },
                { time: 1, value: 1.18 }
            ],
            minimumScaleMultiplier: 0.68
        },
        speed: {
            list: [
                // 喷口阶段高速扩散，随后迅速失速并悬浮成雾。
                { time: 0, value: 180 },
                { time: 0.18, value: 24 },
                { time: 0.45, value: 4 },
                { time: 1, value: 0.5 }
            ],
            minimumSpeedMultiplier: 0.55
        },
        color: {
            list: [
                { time: 0, value: "#efff9a" },
                { time: 0.55, value: "#b7ff4a" },
                { time: 1, value: "#78e82f" }
            ]
        },
        colorMode: 0,
        acceleration: { x: 0, y: -2 },
        maxSpeed: NaN,
        startRotation: { min: 0, max: 360 },
        rotationSpeed: { min: -24, max: 24 },
        angle: -1,
        mirrorType: 2,
        orderedArt: 0,
        lifetime: { min: 0.75, max: 0.95 },
        // 滤色比正片叠底更适合荧光毒雾：提亮重叠区域但比加算柔和。
        blendMode: "screen",
        // 每次同时生成两片雾，单枚 QJ 判定弹约维持 30~36 个可见粒子。
        frequency: 0.05,
        spawnChance: 1,
        particlesPerWave: 2,
        // 约123帧后停止发射，最后一批粒子仍会在180帧前后淡出。
        emitterLifetime: 2.05,
        maxParticles: 40,
        fluctuation: { max: 0, sensitivity: 0 },
        spawnType: "circle",
        pos: { x: 0, y: 0 },
        spawnCircle: { x: 0, y: 0, r: 24, minR: 0 },
        noRotation: false,
        addAtBack: false,
        image: "smog1,smog2,cloud2s,cloud2",
        targetType: 0,
        comment: "QJ弹幕用实心毒雾；无中央镂空"
    };
})();
