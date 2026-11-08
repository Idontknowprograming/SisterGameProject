//=============================================================================
// TRP_ParticleMZ_FrostFlame.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [TRP粒子预设] frostFlameMist 蓝色冰焰喷射
 * @author Shiroin
 * @requiredAssets img/particles/smog1
 * @requiredAssets img/particles/smog2
 * @requiredAssets img/particles/cloud2s
 * @requiredAssets img/particles/cloud2
 *
 * @help
 * 本插件必须放在 TRP_ParticleMZ_Preset.js 之后。
 *
 * 预设名：frostFlameMist
 * 使用贴图：smog1.png, smog2.png, cloud2s.png, cloud2.png
 *
 * 供透明 QJ 冰焰判定弹使用。粒子会跟随判定弹喷出，判定弹速度
 * 归零时由技能逻辑停止发射，已经生成的粒子随后自然淡出。
 */

(() => {
    "use strict";

    if (typeof $dataTrpParticlePreset === "undefined") return;

    $dataTrpParticlePreset.frostFlameMist = {
        version: 4,
        alpha: {
            list: [
                { time: 0, value: 0 },
                { time: 0.06, value: 0.34 },
                { time: 0.58, value: 0.2 },
                { time: 1, value: 0 }
            ]
        },
        scale: {
            list: [
                { time: 0, value: 0.22 },
                { time: 0.48, value: 0.58 },
                { time: 1, value: 0.82 }
            ],
            minimumScaleMultiplier: 0.72
        },
        speed: {
            list: [
                { time: 0, value: 72 },
                { time: 0.22, value: 18 },
                { time: 0.62, value: 4 },
                { time: 1, value: 0 }
            ],
            minimumSpeedMultiplier: 0.58
        },
        color: {
            list: [
                { time: 0, value: "#e8fbff" },
                { time: 0.42, value: "#79ddff" },
                { time: 1, value: "#348cff" }
            ]
        },
        colorMode: 0,
        acceleration: { x: 0, y: -1 },
        maxSpeed: NaN,
        startRotation: { min: 0, max: 360 },
        rotationSpeed: { min: -20, max: 20 },
        angle: -1,
        mirrorType: 2,
        orderedArt: 0,
        // 最后一批粒子约在25帧内完全淡出；判定弹会保留到淡出结束。
        lifetime: { min: 0.32, max: 0.42 },
        blendMode: "screen",
        // 提高单个发射器的视觉密度，填满高速移动时相邻采样点之间的空隙。
        // 这里只增加轻量的 PIXI 粒子，不增加负责碰撞的 QJ 子弹数量。
        frequency: 0.02,
        spawnChance: 1,
        particlesPerWave: 3,
        // 持续喷射，速度归零时由 particleClear(false) 精确停止。
        emitterLifetime: -1,
        maxParticles: 64,
        fluctuation: { max: 0, sensitivity: 0 },
        spawnType: "circle",
        pos: { x: 0, y: 0 },
        spawnCircle: { x: 0, y: 0, r: 11, minR: 0 },
        noRotation: false,
        addAtBack: false,
        image: "smog1,smog2,cloud2s,cloud2",
        targetType: 0,
        comment: "QJ冰焰判定弹用蓝色聚焦喷雾；失速后自然淡出"
    };
})();
