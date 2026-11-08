//=============================================================================
// Shiroin_SceneGalleryA.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v0.3.9] 字典画廊：多层分类卡片、CG鉴赏、MoviePicture预览与回想
 * @author Shiroin / Codex（基于 Drill_up 原画廊及本项目扩展重构）
 * @help
 * 独立替代 Drill_SceneGalleryA.js。关闭旧插件，在同一顺序位置启用本插件。
 * 无需插件参数；直接编辑下方 g_SGaA_categories / g_SGaA_entries 字典。
 * 请勿同时启用新旧插件。本插件发现旧插件仍启用时会直接跳过，保护原逻辑。
 *
 * 原调用保持兼容：
 *   SceneManager.push(Scene_Drill_SGaA);
 *   DrillUp.drill_SGaA_openCategory("Polaroid");
 *   $gameSystem._drill_SGaA_enableTank[2] = true;
 *   >画廊A 的旧插件指令、单图模式和全局存储接口继续可用。
 *
 * 新增脚本：
 *   ShiroinGallery.show("430");       // 显示（字符串是词条key）
 *   ShiroinGallery.showFully("summerSet"); // 显示并永久跳过该词条所有静态差分的解锁条件
 *   ShiroinGallery.unlock("430");     // 解锁，保持原显示状态
 *   ShiroinGallery.unlock("430",true);// 同时显示并解锁
 *   ShiroinGallery.isFullyUnlocked("430"); // 是否可见且未锁定；不存在时返回 false，不检查差分
 *   ShiroinGallery.show(2);           // 数字是旧内容编号，2对应key "430"
 *   ShiroinGallery.openCategory("Polaroid");
 *
 * 分类：A:{parent:""}, B:{parent:"A"}, C:{parent:"B"} 可无限下钻。
 * 分类可填 demoHidden:true：Demo 版隐藏该分类及其子分类、词条；打开目标落在其中时不进入画廊。
 * entries 的 category 填最末级key。旧词条保留 index；新词条可省略，以对象 key 保存状态。
 * entries 的 order 仅控制显示顺序，数值越小越靠前；无 order/index 的词条排最后，同值先按旧 index 再按 key。
 * cover为img/Menu__picturegallery/图片名；分类留空时取可见且未锁词条封面。
 * 视频词条在 entries 填 video/cover/recall；视频 cover 留空时用纯色底图。
 * video 可填字符串或路径数组；多段动画在鉴赏页用左右箭头按数组顺序切换，不循环。
 * 父分类最多4列2行，比例为高:宽=2.3:1，少于5项使用单行高卡片。
 * 鼠标悬停放大，方向键选择，PageUp/PageDown或滚轮翻页，Esc逐层返回。
 * 词条卡牌每页最多5列2行，仅总共1页且不超过5张时放大为5列1行；点击进入鉴赏，动画此时才加载并静音循环播放。
 * 静态CG支持滚轮/双指缩放、拖拽、确认键归位；动画无缩放，点击画面确认回想。
 *
 * 词条顶层可填 unlockCondition:()=>条件；进入画廊时结算，true 时显示并永久解锁。
 * 未填写则保留脚本控制；已解锁不因条件变为 false 而撤销，不逐帧检查。
 * 自动解锁及 show/showFully/unlock 用词条 key 向 RecallStage 记录 MOG 时间，无需配置 recall。
 * 已有时间参数时保持原记录；只有其他回想参数时补充时间，不覆盖其他参数。
 * ShiroinGallery.settleUnlockConditions() 可主动结算；图鉴轨迹入场也会调用。
 * 静态差分：pic 内用 [{variant:"标记",unlockCondition:()=>条件}, ...完整图层]。
 * 无标记图层组成主图；鉴赏页保留全部差分，未解锁显示封锁预览，不循环。
 * 条件仅在进入/切换时判断；正常鉴赏直接叠层，Worker 仅用于需要合成的缩略图及封锁预览。
 * 保留 Drill_CoreOfGlobalSave（旧全局档）、项目多语言/窗口字符/菜单外观插件。
 * 动画预览依赖 MoviePicture.js，现有回想依赖 Shiroin_RecallStage.js。
 * 本插件不读旧插件参数；解锁沿用旧存档字段，不占用Game_Picture槽位。
 * 完整配置与替换说明：js/plugin-docs/Shiroin_SceneGalleryA.md
 */
(() => {
'use strict';
const Imported = window.Imported = window.Imported || {};
const DrillUp = window.DrillUp = window.DrillUp || {};
if (Imported.Drill_SceneGalleryA || window.$plugins?.some(p => p.name === 'Drill_SceneGalleryA' && p.status)) {
    console.warn('[ShiroinGallery] 旧 Drill_SceneGalleryA 仍启用；新画廊未安装任何钩子。替换时请关闭旧插件。');
    return;
}
if (Imported.Shiroin_SceneGalleryA) return;
Imported.Shiroin_SceneGalleryA = true;
Imported.Drill_SceneGalleryA = true; // 供已有附属插件识别替代后的画廊。

// ============================================================================
// 字典配置：由原 Drill_up 画廊与本项目扩展迁移；原编号及存储字段保持兼容。
// index 仅供旧编号/存档兼容，已有编号不可删除、重排或复用。新词条可省略 index，以稳定对象 key 保存状态。
// 字符串是词条 key，数值是 index："430" 对应 index 2，数字 430 不是它。
// ============================================================================

DrillUp.g_SGaA_categories = {
    "Home": {
        "parent": "",
        "cover": "Home",
        // Demo 版不开放 H 内容；拍立得等深渊分类照常可看。
        "demoHidden": true
    },
    "Abyss": {
        "parent": "",
        "cover": "Abyss"
    },      
    "TheSistersOfTheFallenChurch": {
        "parent": "Abyss",
        "cover": ""
    },
    "placeholder": {
        "parent": "Home",
        "cover": ""
    },
    "Polaroid": {
        "parent": "Abyss",
        "cover": "",
        // 仅直属静态 CG 卡牌：在等比铺满基础上额外放大，靠顶部取景。
        "staticCardCrop": { "zoom": 1.1, "focusY": 0 }
    }
};

// 多层示例：A: {parent:"",cover:"封面A"}, B: {parent:"A",cover:""}, C: {parent:"B",cover:""}。
// 将词条 category 填为 "C" 即归入第三级；cover 位于 img/Menu__picturegallery/。
// 配色字典：0 为全局默认；新增编号时复制一行即可。分类/词条填写 cardStyle: 1 引用。
// sparkleColor 可选：省略时光点自动跟随渐变色，绘制时自动提亮；填写后可独立配色。
// gradientOpacity 可选：渐变底端不透明度（0–1），默认沿用布局配置；白底素材可适当提高。
// 修改字典后重新打开画廊；已显示的卡牌装饰不会逐帧重绘。
DrillUp.g_SGaA_cardStyles = {
    0: { name: "红", gradientColor: "#ff0000", glowColor: "#ff0000" },
    1: { name: "金", gradientColor: "#ecb92f", glowColor: "#f3a64a" },
    2: { name: "粉", gradientColor: "#fe3fe5", glowColor: "#e100c3" },
    3: { name: "紫", gradientColor: "#b766fc", glowColor: "#7002d1" },
    4: { name: "蓝", gradientColor: "#3fcafe", glowColor: "#17a9de" },
    5: { name: "白", gradientColor: "#e2e2e2", glowColor: "#e2e2e2" },
    6: { name: "黑", gradientColor: "#282727", glowColor: "#a0a0a0" }, 
    7: { name: "黄铜金", gradientColor: "#644A24", gradientOpacity: 0.94, sparkleColor: "#BA9041", glowColor: "#CDB875" },
    8: { name: "橙", gradientColor: "#f3a64a", glowColor: "#f3a64a" },    
};

// 星数字典：左边为星数（1～6），数组内为 g_SGaA_cardStyles 的配色编号。
// 例如 5: [1, 7, 8] 表示这三套配色都显示 5 星；未登记的配色不显示星星。
// 同一编号请只放在一个数组中；若重复，以较小星数为准。支持数字及数字字符串。
DrillUp.g_SGaA_cardStars = {
    1: [5, 6],
    2: [4],
    3: [3],
    4: [2],
    5: [1],
    6: [0]
};

// 静态封面边界索引：由 js/plugin-tools/build_gallery_cover_bounds.py 离线生成，游戏中命中后无需读取像素。
// 值为 [原图宽, 原图高, x, y, 裁剪宽, 裁剪高]；更换同名素材后重新生成，未知素材仍自动扫描。
// BEGIN GENERATED GALLERY COVER BOUNDS
DrillUp.g_SGaA_coverBounds = {
    "chahuiChekiPicture200": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture201": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture202": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture203": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture204": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture205": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture206": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture207": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture208": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture209": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture210": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture211": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture212": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture213": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture214": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture215": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture216": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture217": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture218": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture219": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture220": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture221": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture222": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture223": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture224": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture225": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture226": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture227": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture228": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture229": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture230": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture231": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture232": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture233": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture234": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture350": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture351": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture352": [1560, 2391, 80, 121, 1400, 2150],
    "chahuiChekiPicture353": [1560, 2391, 80, 121, 1400, 2150],
    "star": [65, 65, 16, 16, 32, 32]
};
// END GENERATED GALLERY COVER BOUNDS

// 分类/词条均可写 cardStyle: 1；不填时继承父分类，最终默认 0。词条可单独覆盖。
// 兼容 cardStyle: {gradientColor:"#557fc8", sparkleColor:"#b4d7ff", glowColor:"#85bdff"}。
// 所有词条默认用卡牌；分类可写 entryView:"list" 保留旧列表。
// 视频词条扩展：video:"视频名", cover:"卡牌封面名", recall:()=>RecallStage.start("回想key")。
// video 通过 MoviePicture 从 img/movies/ 加载，cover 从 img/Menu__picturegallery/ 加载。
// 视频卡牌只显示 cover（留空则纯色兜底），进入鉴赏才加载视频，点击播放画面确认回想。
// 省略 enabled / locked / context 时，统一默认为隐藏、未锁定、空描述。
// 标题和说明使用多语言 itemsDescription；收集后由事件脚本 show(key) 显示。
DrillUp.g_SGaA_entries = {
    "480": {
        "index": 1,
        "name": "480",
        "category": "TheSistersOfTheFallenChurch",
        "pic": "SisterMio_Polaroid1"
    },
    "432": {
        "index": 4,
        "order": 2.5,
        "name": "432",
        cardStyle: 3,
        video: ["[NSFW]recallCgThumb432","[NSFW]recallCgThumb432B"],
        cover: "[NSFW]recallCgThumb432",
        recall: () => RecallStage.start("432"),
        "category": "placeholder",
        "pic": "placeholder"
    },    
    "440": {
        "index": 15,
        "name": "440",
        cardStyle: 3,
        video: "[NSFW]recallCgThumb440",
        cover: "[NSFW]recallCgThumb440",
        unlockCondition: () => window.$gameSelfSwitches?.value([20, 21, 'C']) === true,
        recall: () => RecallStage.start("440"),
        "category": "placeholder",
        "pic": "placeholder"
    },    
    "451": {
        "order": 1006,
        "name": "451",
        cardStyle: 4,
        video: ["[NSFW]recallCgThumb451A","[NSFW]recallCgThumb451B"],
        cover: "[NSFW]recallCgThumb451",
        //recall: () => RecallStage.start("441"),
        "category": "placeholder",
        "pic": "placeholder"
    },
    "465": {
        "order": 4,
        "name": "465",
        cardStyle: 4,
        unlockCondition: () => window.ShiroinGallery.isFullyUnlocked("433") === true,
        video: ["[NSFW]livingroom_secretOnanii1","[NSFW]livingroom_secretOnanii2"],
        cover: "[NSFW]secretOnanii",
        "category": "placeholder",
        "pic": "placeholder"
    },       
    "467": {
        "order": 8,
        "name": "467",
        cardStyle: 3,
        unlockCondition: () => window.ShiroinGallery.isFullyUnlocked("436") === true,
        video: ["[NSFW]recallCgThumb467A","[NSFW]recallCgThumb467B"],
        cover: "[NSFW]recallCgThumb467",
        "category": "placeholder",
        "pic": "placeholder"
    },         
    "468": {
        "order": 1005,
        "name": "468",
        cardStyle: 4,
        video: ["[NSFW]recallCgThumb468A","[NSFW]recallCgThumb468B"],
        cover: "[NSFW]recallCgThumb468",
        "category": "placeholder",
        "pic": "placeholder"
    },    
    "470": {
        "order": 6.1,
        "name": "470",
        cardStyle: 1,
        video: ["[NSFW]recallCgThumb470A","[NSFW]recallCgThumb470B","[NSFW]recallCgThumb470C","[NSFW]recallCgThumb470D"],
        cover: "[NSFW]recallCgThumb470",
        "category": "placeholder",
        "pic": "placeholder"
    },    
    "471": {
        "order": 6.2,
        "name": "471",
        cardStyle: 1,
        video: ["[NSFW]recallCgThumb471A","[NSFW]recallCgThumb471B"],
        cover: "[NSFW]recallCgThumb471",
        "category": "placeholder",
        "pic": "placeholder"
    }, 
    "summerSet": {
        "order": 1030,
        "name": "22",
        cardStyle: 6,
        traceCategory: "sideEvents",
        unlockCondition: () => window.$gameSelfSwitches?.value([54, 15, 'P']) === true,
        cover: "summerSet",
        "category": "placeholder",
        pic: [
            [
                "img/pictures/[NSFW]hotWeatherEvent/rubberPool_ImoutoInside",
                {
                    path: "img/pictures/[NSFW]hotWeatherEvent/rubberPool_swimsuitImouto",
                    x: 0,
                    y: 0,
                    scale: 1
                },
                {
                    path: "img/pictures/[NSFW]hotWeatherEvent/rubberPool_leftHand_eatingPopsicle",
                    x: 500,
                    y: 0,
                    scale: 1
                }
            ],
            [
                {
                    variant: "variation",
                    unlockCondition: true
                },                
                "img/pictures/[NSFW]hotWeatherEvent/rubberPool_ImoutoInside",
                {
                    path: "img/pictures/[NSFW]hotWeatherEvent/rubberPool_slippedSwimsuit1",
                    x: 680,
                    y: 300,
                    scale: 1
                },
                {
                    path: "img/pictures/[NSFW]hotWeatherEvent/rubberPool_swimsuitImouto",
                    x: 0,
                    y: 0,
                    scale: 1
                },
                {
                    path: "img/pictures/[NSFW]hotWeatherEvent/rubberPool_Imouto_kao1",
                    x: 320,
                    y: 100,
                    scale: 1
                },
                {
                    path: "img/pictures/[NSFW]hotWeatherEvent/rubberPool_leftHand_eatingPopsicle",
                    x: 500,
                    y: 0,
                    scale: 1
                },                
                {
                    path: "img/pictures/[NSFW]hotWeatherEvent/rubberPool_leftHand_eatingPopsicle_alt",
                    x: 500,
                    y: 0,
                    scale: 1
                },
                {
                    path: "img/pictures/[NSFW]hotWeatherEvent/rubberPool_Imouto_naked",
                    x: 400,
                    y: 300,
                    scale: 1
                }
            ],
            [
                {
                    variant: "variation2",
                    unlockCondition: () => window.$gameSelfSwitches?.value([54, 15, 'W']) === true,
                },                
                "img/pictures/[NSFW]hotWeatherEvent/rubberPool_ImoutoWithLegsSpread"
            ]            
        ]
    },
    "ImoutoUpClose": {
        "order": 1001,
        "name": "458",
        cardStyle: 6,
        traceCategory: "mainEvents",
        cover: "ImoutoUpClose",
        "category": "placeholder",
        pic: [
            [
                "img/pictures/sister_room_night_fine",
                {
                    path: "img/pictures/sis_feature_focus0",
                    x: 0,
                    y: 0,
                    scale: 1
                }                
            ],
            [
                {
                    variant: "variation",
                    unlockCondition: true
                },                
                "img/pictures/sister_room_night_fine",
                {
                    path: "img/pictures/sis_feature_focus3",
                    x: 0,
                    y: 0,
                    scale: 1
                }  
            ]   
        ]
    },     
    "ImoutoGobblingUp": {
        "order": 1003,
        "name": "459",
        cardStyle: 6,
        traceCategory: "sideEvents",
        video: "ImoutoGobblingUp",
        cover: "ImoutoGobblingUp",
        "category": "placeholder",
        "pic": "placeholder"
    },     
    "rubCheeks": {
        "order": 1004,
        "name": "448",
        cardStyle: 6,
        traceCategory: "sideEvents",
        video: "rubCheeks",
        cover: "rubCheeks",
        unlockCondition: () => window.$gameSelfVariables?.value([1, 2, 'faceRub']) > 0,
        //recall: () => RecallStage.start("435"),
        "category": "placeholder",
        "pic": "placeholder"
    },    
    "oniiChanNightmare1": {
        "order": 1009,
        "name": "455",
        cardStyle: 6,
        traceCategory: "sideEvents",
        video: "OniiChanNightmare1",
        cover: "oniiChanNightmare1",
        //recall: () => RecallStage.start("435"),
        "category": "placeholder",
        "pic": "placeholder"
    },    
    "oniiChanNightmare2": {
        "order": 1010,
        "name": "456",
        cardStyle: 6,
        traceCategory: "sideEvents",
        cover: "oniiChanNightmare2",
        //recall: () => RecallStage.start("435"),
        "category": "placeholder",
        pic: [
            [
                "img/pictures/toilet_nozoku/toilet_door_peepingViewCloseUp",
                {
                    path: "img/pictures/toilet_nozoku/toilet_door_peepingView_nightmareImouto",
                    x: 720,
                    y: 0,
                    scale: 1
                }                
            ]          
        ]
    },     
    "oniiChanNightmare3": {
        "order": 1011,
        "name": "457",
        cardStyle: 6,
        traceCategory: "sideEvents",
        video: "OniiChansNightmare3",
        cover: "oniiChanNightmare3",
        //recall: () => RecallStage.start("435"),
        "category": "placeholder",
        "pic": "placeholder"
    },      
    "brushingTeeth": {
        "order": 1012,
        "name": "447",
        cardStyle: 6,
        traceCategory: "sideEvents",
        unlockCondition: () => window.$gameSelfVariables?.value([3, 11, 'times']) > 0,
        video: "recall_brushingTeeth",
        cover: "brushingTeeth",
        //recall: () => RecallStage.start("435"),
        "category": "placeholder",
        "pic": "placeholder"
    },
    "brushingTeeth2": {
        "order": 1013,
        "name": "447",
        cardStyle: 6,
        traceCategory: "sideEvents",
        cover: "brushingTeeth2",
        "category": "placeholder",
        pic: [
            [
                "img/pictures/washroom_morning_event/washroom_MirrorCloseUp_background",
                {
                    path: "img/pictures/washroom_morning_event/washroom_MirrorCloseUp_oniichan",
                    x: 820,
                    y: 0,
                    scale: 1
                },
                {
                    path: "img/pictures/washroom_morning_event/washroom_MirrorCloseUp_Imouto_WithoutTwinTails",
                    x: 16,
                    y: 0,
                    scale: 1
                }
            ],
            [
                {
                    variant: "variation",
                    unlockCondition: true
                },                
                "img/pictures/washroom_morning_event/washroom_MirrorCloseUp_background",
                {
                    path: "img/pictures/washroom_morning_event/washroom_MirrorCloseUp_oniichan",
                    x: 820,
                    y: 0,
                    scale: 1
                },
                {
                    path: "img/pictures/washroom_morning_event/washroom_MirrorCloseUp_Imouto_combingHair",
                    x: 16,
                    y: 0,
                    scale: 1
                }
            ],
            [
                {
                    variant: "variation2",
                    unlockCondition: true
                },                
                "img/pictures/washroom_morning_event/washroom_MirrorCloseUp_background",
                {
                    path: "img/pictures/washroom_morning_event/washroom_MirrorCloseUp_oniichan",
                    x: 820,
                    y: 0,
                    scale: 1
                },
                {
                    path: "img/pictures/washroom_morning_event/washroom_MirrorCloseUp_Imouto_setTwinTails",
                    x: 16,
                    y: 0,
                    scale: 1
                }
            ],
            [
                {
                    variant: "variation3",
                    unlockCondition: true
                },                
                "img/pictures/washroom_morning_event/washroom_MirrorCloseUp_background",
                {
                    path: "img/pictures/washroom_morning_event/washroom_MirrorCloseUp_oniichan",
                    x: 820,
                    y: 0,
                    scale: 1
                },
                {
                    path: "img/pictures/washroom_morning_event/washroom_MirrorCloseUp_Imouto_stretch",
                    x: 16,
                    y: 0,
                    scale: 1
                }
            ],
            [
                {
                    variant: "variation4",
                    unlockCondition: () => window.$gameSelfSwitches?.value([3, 11, 'T']) === true
                },                
                "img/pictures/washroom_morning_event/washroom_MirrorCloseUp_background",
                {
                    path: "img/pictures/washroom_morning_event/washroom_MirrorCloseUp_Imouto_touchBreasts",
                    x: 16,
                    y: 0,
                    scale: 1
                }
            ],
            [
                {
                    variant: "variation5",
                    unlockCondition: () => window.$gameSelfSwitches?.value([3, 11, 'J']) === true
                },                
                "img/pictures/washroom_morning_event/washroom_MirrorCloseUp_background",
                {
                    path: "img/pictures/washroom_morning_event/washroom_MirrorCloseUp_oniichan",
                    x: 820,
                    y: 0,
                    scale: 1
                },
                {
                    path: "img/pictures/washroom_morning_event/washroom_MirrorCloseUp_Imouto_jigo",
                    x: 16,
                    y: 0,
                    scale: 1
                }
            ],
        ]
    },        
    "ImoutoDozingOff": {
        "order": 1006,
        "name": "461",
        cardStyle: 6,
        traceCategory: "sideEvents",
        video: "ImoutoDozingOff",
        cover: "ImoutoDozingOff",
        "category": "placeholder",
        "pic": "placeholder"
    },        
    "eatingWatermelon": {
        "order": 1032,
        "name": "462",
        cardStyle: 6,
        traceCategory: "sideEvents",
        video: ["Imouto_eatingWatermelon_swimsuit","Imouto_eatingWatermelon_coat","Imouto_eatingWatermelon_Tshirt"],
        cover: "eatingWatermelon",
        "category": "placeholder",
        "pic": "placeholder"
    },   
    "playGamesWithImouto": {
        "order": 1042,
        "name": "464",
        cardStyle: 6,
        unlockCondition: () => window.$gameSystem.achievement("ErogameWithImouto").isUnlocked() === true,
        cover: "playGamesWithImouto",
        "category": "placeholder",
        pic: [
            [
                "img/pictures/[NSFW]game_itazura_POV/game_itazura_background",
                {
                    path: "img/pictures/[NSFW]game_itazura_POV/game_itazura_oniichan_lowerBody",
                    x: 0,
                    y: 380,
                    scale: 1
                },
                {
                    path: "img/pictures/[NSFW]game_itazura_POV/game_itazura_POV_back",
                    x: 0,
                    y: 0,
                    scale: 1
                }
            ],
            [
                {
                    variant: "variation",
                    unlockCondition: true
                },                
                "img/pictures/[NSFW]game_itazura_POV/game_itazura_background",
                {
                    path: "img/pictures/[NSFW]game_itazura_POV/game_itazura_oniichan_lowerBody",
                    x: 0,
                    y: 380,
                    scale: 1
                },
                {
                    path: "img/pictures/[NSFW]game_itazura_POV/game_itazura_POV_breast_camisole",
                    x: 0,
                    y: 0,
                    scale: 1
                }
            ],
            [
                {
                    variant: "variation1",
                    unlockCondition: true
                },                
                "img/pictures/[NSFW]game_itazura_POV/game_itazura_background",
                {
                    path: "img/pictures/[NSFW]game_itazura_POV/game_itazura_oniichan_lowerBody",
                    x: 0,
                    y: 380,
                    scale: 1
                },
                {
                    path: "img/pictures/[NSFW]game_itazura_POV/game_itazura_POV_breast_camisole",
                    x: 0,
                    y: 0,
                    scale: 1
                },
                {
                    path: "img/pictures/[NSFW]game_itazura_POV/game_itazura_POV_breast_bare2",
                    x: 0,
                    y: 0,
                    scale: 1
                }
            ],
            [
                {
                    variant: "variation2",
                    unlockCondition: true
                },                
                "img/pictures/[NSFW]game_itazura_POV/game_itazura_background",
                {
                    path: "img/pictures/[NSFW]game_itazura_POV/game_itazura_oniichan_lowerBody",
                    x: 0,
                    y: 380,
                    scale: 1
                },
                {
                    path: "img/pictures/[NSFW]game_itazura_POV/game_itazura_POV_thighs",
                    x: 0,
                    y: 0,
                    scale: 1
                },
                {
                    path: "img/pictures/[NSFW]game_itazura_POV/game_itazura_POV_thighs_shortPants",
                    x: 0,
                    y: 0,
                    scale: 1
                }
            ],
            [
                {
                    variant: "variation3",
                    unlockCondition: true
                },                
                "img/pictures/[NSFW]game_itazura_POV/game_itazura_background",
                {
                    path: "img/pictures/[NSFW]game_itazura_POV/game_itazura_oniichan_lowerBody",
                    x: 0,
                    y: 380,
                    scale: 1
                },
                {
                    path: "img/pictures/[NSFW]game_itazura_POV/game_itazura_POV_thighs",
                    x: 0,
                    y: 0,
                    scale: 1
                }
            ]
        ]
    },      
    "drinkElixirRubrum": {
        "order": 1066,
        "name": "463",
        cardStyle: 6,
        traceCategory: "mainEvents",
        unlockCondition: () => window.$gameSelfVariables?.value([1, 2, 'healing']) > 0,
        video: "sis_room_Imouto_drinkElixirRubrum",
        cover: "drinkElixirRubrum",
        "category": "placeholder",
        "pic": "placeholder"
    },     
    "dryImoutoHair": {
        "order": 1015,
        "name": "442",
        cardStyle: 6,
        traceCategory: "sideEvents",
        unlockCondition: () => window.$gameSelfVariables.value([4, 13, 'times']) > 0,
        cover: "dryImoutoHair",
        "category": "placeholder",
        pic: [
            [
                "img/pictures/sis_room/[NSFW]sis_room_CGdryingHair_back",
                {
                    path: "img/pictures/sis_room/sis_room_CGdryingHair_shortpants",
                    x: 0,
                    y: 0,
                    scale: 1
                },
                {
                    path: "img/pictures/sis_room/sis_room_CGdryingHair_camisole",
                    x: 0,
                    y: 0,
                    scale: 1
                },
                {
                    path: "img/pictures/sis_room/sis_room_CGdryingHair_head1",
                    x: 0,
                    y: 0,
                    scale: 1
                },
                {
                    path: "img/pictures/sis_room/sis_room_CGdryingHair_oniichan0",
                    x: 0,
                    y: 0,
                    scale: 1
                },
                {
                    path: "img/pictures/sis_room/sis_room_CGdryingHair_oniichan1",
                    x: 0,
                    y: 0,
                    scale: 1
                },
                {
                    path: "img/pictures/sis_room/sis_room_chibi_dryingHair_bunnyDoll",
                    x: 0,
                    y: 0,
                    scale: 1
                }
            ],
            [
                {
                    variant: "variation",
                    unlockCondition: true
                },                
                "img/pictures/sis_room/[NSFW]sis_room_CGdryingHair_back",
                {
                    path: "img/pictures/sis_room/sis_room_CGdryingHair_shortpants",
                    x: 0,
                    y: 0,
                    scale: 1
                },
                {
                    path: "img/pictures/sis_room/sis_room_CGdryingHair_camisole",
                    x: 0,
                    y: 0,
                    scale: 1
                },
                {
                    path: "img/pictures/sis_room/sis_room_CGdryingHair_head0",
                    x: 0,
                    y: 0,
                    scale: 1
                },
                {
                    path: "img/pictures/sis_room/sis_room_chibi_dryingHair_bunnyDoll",
                    x: 0,
                    y: 0,
                    scale: 1
                }
            ],
            [
                {
                    variant: "variation2",
                    unlockCondition: true
                },                
                "img/pictures/sis_room/[NSFW]sis_room_CGdryingHair_back",
                {
                    path: "img/pictures/sis_room/sis_room_CGdryingHair_shortpants",
                    x: 0,
                    y: 0,
                    scale: 1
                },
                {
                    path: "img/pictures/sis_room/sis_room_CGdryingHair_camisole_slide",
                    x: 0,
                    y: 0,
                    scale: 1
                },
                {
                    path: "img/pictures/sis_room/sis_room_CGdryingHair_head1",
                    x: 0,
                    y: 0,
                    scale: 1
                },
                {
                    path: "img/pictures/sis_room/sis_room_CGdryingHair_oniichan0",
                    x: 0,
                    y: 0,
                    scale: 1
                },
                {
                    path: "img/pictures/sis_room/sis_room_chibi_dryingHair_bunnyDoll",
                    x: 0,
                    y: 0,
                    scale: 1
                }
            ]           
        ]
    },
    "carryImoutoBackToRoom": {
        "order": 1016,
        "name": "443",
        cardStyle: 6,
        traceCategory: "mainEvents",
        unlockCondition: () => window.$gameSelfVariables?.value([1, 2, 'sleepTogether']) > 0,
        cover: "carryImoutoBackToRoom",
        "category": "placeholder",
        pic: "img/pictures/corridor_event/carryImoutoBackToRoom"   
    }, 
    "ImoutoLecture": {
        "order": 1055,
        "name": "460",
        cardStyle: 6,
        video: "ImoutoLecture",
        traceCategory: "sideEvents",
        cover: "ImoutoLecture",
        "category": "placeholder",
        pic: "placeholder"
    },     
    "ImoutoSlips": {
        "order": 1040,
        "name": "453",
        cardStyle: 6,
        cover: "ImoutoSlips",
        "category": "placeholder",
        pic: [
            [
                "img/pictures/washroom_event/washroom_S_N_DO_RL_BL",
                {
                    path: "img/pictures/washroom_event/washroom_sis_korobu_shadow",
                    x: 0,
                    y: 0,
                    scale: 1,
                    blendMode: 2
                },
                {
                    path: "img/pictures/washroom_event/washroom_sis_korobu",
                    x: 0,
                    y: 0,
                    scale: 1
                },
                {
                    path: "img/pictures/washroom_event/washroom_sis_korobu_towel0",
                    x: 0,
                    y: 0,
                    scale: 1
                },
                {
                    path: "img/pictures/washroom_event/washroom_sis_korobu_shampoo",
                    x: 0,
                    y: 0,
                    scale: 1
                },
                {
                    path: "img/pictures/washroom_event/washroom_sis_korobu_surippa",
                    x: 1450,
                    y: 842,
                    scale: 1
                }
            ],
            [
                {
                    variant: "variation",
                    unlockCondition: true
                },                
                "img/pictures/washroom_event/washroom_S_N_DO_RL_BL",
                {
                    path: "img/pictures/washroom_event/washroom_sis_korobu_shadow2",
                    x: 0,
                    y: 0,
                    scale: 1,
                    blendMode: 2
                },
                {
                    path: "img/pictures/washroom_event/washroom_sis_korobu_end",
                    x: 0,
                    y: 0,
                    scale: 1
                },
                {
                    path: "img/pictures/washroom_event/washroom_sis_korobu_end_towel0",
                    x: 0,
                    y: 0,
                    scale: 1
                },
                {
                    path: "img/pictures/washroom_event/washroom_sis_korobu_shampoo",
                    x: 0,
                    y: 0,
                    scale: 1
                }
            ]           
        ]  
    }, 
    "Fantasy": {
        "order": 1041,
        "name": "454",
        cardStyle: 6,
        cover: "Fantasy",
        "category": "placeholder",
        pic: [
            [
                "img/pictures/washroom_event/washroom_S_N_RL_BL",
                {
                    path: "img/pictures/washroom_event/[NSFW]washroom_imaginaryImouto1",
                    x: 2482,
                    y: 350,
                    scale: 1
                }
            ],
            [
                {
                    variant: "variation",
                    unlockCondition: true
                },                
                "img/pictures/washroom_event/washroom_S_N_RL_BL",
                {
                    path: "img/pictures/washroom_event/[NSFW]washroom_imaginaryImouto0",
                    x: 2482,
                    y: 350,
                    scale: 1
                }
            ]           
        ]
    }, 
    "batheWithImouto": {
        "order": 1044,
        "name": "445",
        cardStyle: 6,
        unlockCondition: () => window.$gameSelfVariables?.value([1, 2, 'batheTogether']) > 0,
        cover: "batheWithImouto",
        "category": "placeholder",
        pic: [
            [
                "img/pictures/bathroom_event/bathroom_sitTogetherInBathtub1"
            ],
            [
                {
                    variant: "variation",
                    unlockCondition: true
                },                
                "img/pictures/bathroom_event/bathroom_sitTogetherInBathtub2",
                {
                    path: "img/pictures/bathroom_event/bathroom_sitTogetherInBathtub_kao1",
                    x: 960,
                    y: 0,
                    scale: 1
                }
            ]           
        ]
    },
    "walkInOnImoutoOnToilet": {
        "order": 1048,
        "name": "469",
        cardStyle: 6,
        cover: "walkInOnImoutoOnToilet",
        "category": "placeholder",
        pic: [
            [
                "img/pictures/bathroom_event/bathroom_sitTogetherInBathtub1"
            ],
            [
                {
                    variant: "variation",
                    unlockCondition: true
                },                
                "img/pictures/bathroom_event/bathroom_sitTogetherInBathtub2",
                {
                    path: "img/pictures/bathroom_event/bathroom_sitTogetherInBathtub_kao1",
                    x: 960,
                    y: 0,
                    scale: 1
                }
            ]           
        ]
    },    
    "shakeCola": {
        "order": 1039,
        "name": "449",
        cardStyle: 6,
        traceCategory: "sideEvents",
        unlockCondition: () => window.$gameSelfVariables?.value([1, 2, 'colaSpray']) > 0,
        cover: "shakeCola",
        "category": "placeholder",
        pic: [
            [
                "img/pictures/sis_room/sister_room_day_hot",
                {
                    path: "img/pictures/sis_room_drinkCola/sis_room_hotWeather_cola_suck0",
                    x: 0,
                    y: 0,
                    scale: 2
                }
            ],
            [
                {
                    variant: "variation",
                    unlockCondition: true
                },                
                "img/pictures/sis_room/sister_room_day_hot",
                {
                    path: "img/pictures/sis_room_drinkCola/sis_room_hotWeather_cola_suck1",
                    x: 0,
                    y: 0,
                    scale: 2
                },
                {
                    path: "img/Special__actionSeq/集中線アニメ_ション_激しい黒__1",
                    x: 0,
                    y: 0,
                    scale: 2
                }
            ]           
        ]
    },    
    "competeForToilet": {
        "order": 1033,
        "name": "446",
        cardStyle: 6,
        traceCategory: "sideEvents",
        unlockCondition: () => window.$gameSelfVariables?.value([1, 1, 'foodPoisoning']) > 0,
        cover: "competeForToilet",
        "category": "placeholder",
        pic: [
            [
                "img/pictures/corridor_event/hall_S_N_HL_SL",
                {
                    path: "img/pictures/corridor_event/corridor_sis_desperateForPee_0A",
                    x: 2100,
                    y: 900,
                    scale: 1
                }                
            ],
            [
                {
                    variant: "variation",
                    unlockCondition: true
                },                
                "img/pictures/corridor_event/hall_S_N_HL_SL",
                {
                    path: "img/pictures/corridor_event/corridor_sis_desperateForPee_1A",
                    x: 2100,
                    y: 900,
                    scale: 1
                } 
            ],
            [
                {
                    variant: "variation2",
                    unlockCondition: true
                },                
                "img/pictures/corridor_event/hall_S_N_HL_SL",
                {
                    path: "img/pictures/corridor_event/corridor_sis_desperateForPee_0B",
                    x: 2100,
                    y: 900,
                    scale: 1
                } 
            ],
            [
                {
                    variant: "variation3",
                    unlockCondition: true
                },                
                "img/pictures/corridor_event/hall_S_N_HL_SL",
                {
                    path: "img/pictures/corridor_event/corridor_sis_desperateForPee_1B",
                    x: 2100,
                    y: 900,
                    scale: 1
                } 
            ],
            [
                {
                    variant: "variation4",
                    unlockCondition: true
                },                
                "img/pictures/corridor_event/hall_S_N_HL_SL",
                {
                    path: "img/pictures/corridor_event/corridor_sis_desperateForPee_0C",
                    x: 2100,
                    y: 900,
                    scale: 1
                } 
            ],
            [
                {
                    variant: "variation5",
                    unlockCondition: true
                },                
                "img/pictures/corridor_event/hall_S_N_HL_SL",
                {
                    path: "img/pictures/corridor_event/corridor_sis_desperateForPee_1C",
                    x: 2100,
                    y: 900,
                    scale: 1
                } 
            ]
        ]
    },        
    "wakeUpWithImouto": {
        "order": 1053,
        "name": "444",
        cardStyle: 6,
        unlockCondition: () => window.$gameSelfVariables?.value([1, 2, 'sleepTogether']) > 0,
        cover: "[NSFW]wakeUpWithImouto",
        "category": "placeholder",
        pic: [
            [
                "img/pictures/onichann_room/bedroom_S_M_zoomIn",
                {
                    path: "img/pictures/onichann_room/[NSFW]bedroom_fallAsleepTogether_morning_stillSleeping",
                    x: 527,
                    y: 413,
                    scale: 1
                }
            ],
            [
                {
                    variant: "variation",
                    unlockCondition: true
                },                
                "img/pictures/onichann_room/bedroom_S_M_zoomIn",
                {
                    path: "img/pictures/onichann_room/[NSFW]bedroom_fallAsleepTogether_morning_awake",
                    x: 527,
                    y: 413,
                    scale: 1
                }
            ],
            [
                {
                    variant: "variation2",
                    unlockCondition: true
                    //unlockCondition: () => window.$gameSelfSwitches?.value([54, 15, 'W']) === true
                },                
                "img/pictures/onichann_room/bedroom_S_M_zoomIn",
                {
                    path: "img/pictures/onichann_room/[NSFW]bedroom_fallAsleepTogether_morning_awake_blush2",
                    x: 527,
                    y: 413,
                    scale: 1
                }
            ]            
        ]
    }, 
    "wakeUpOniichan": {
        "order": 1035,
        "name": "450",
        cardStyle: 6,
        traceCategory: "mainEvents",
        cover: "wakeUpOniichan",
        "category": "placeholder",
        pic: [
            [
                "img/pictures/onichann_room/wakeUpOniichan"
            ],
            [
                {
                    variant: "variation",
                    unlockCondition: true
                },                
                "img/pictures/onichann_room/wakeUpOniichan2"
            ]           
        ]
    },          
    "helpWashImouto": {
        "order": 1057,
        "name": "452",
        cardStyle: 6,
        cover: "[NSFW]helpWashImouto",
        "category": "placeholder",
        pic: [
            [
                "img/pictures/bathroom_event/[NSFW]bathroom_helpWashImouto_background",
                {
                    path: "img/pictures/bathroom_event/[NSFW]bathroom_helpWashImouto_backWashHair",
                    x: 500,
                    y: 0,
                    scale: 1
                }
            ],
            [
                {
                    variant: "variation",
                    unlockCondition: true
                },                
                "img/pictures/bathroom_event/[NSFW]bathroom_helpWashImouto_background",
                {
                    path: "img/pictures/bathroom_event/[NSFW]bathroom_helpWashImouto_backWashArms1",
                    x: 500,
                    y: 0,
                    scale: 1
                }
            ],
            [
                {
                    variant: "variation2",
                    unlockCondition: true
                },                
                "img/pictures/bathroom_event/[NSFW]bathroom_helpWashImouto_background",
                {
                    path: "img/pictures/bathroom_event/[NSFW]bathroom_helpWashImouto_backWashArms2",
                    x: 500,
                    y: 0,
                    scale: 1
                }
            ],
            [
                {
                    variant: "variation3",
                    unlockCondition: true
                },                
                "img/pictures/bathroom_event/[NSFW]bathroom_helpWashImouto_background",
                {
                    path: "img/pictures/bathroom_event/[NSFW]bathroom_helpWashImouto_backWashBreasts",
                    x: 500,
                    y: 0,
                    scale: 1
                }
            ],
            [
                {
                    variant: "variation4",
                    unlockCondition: true
                },                
                "img/pictures/bathroom_event/[NSFW]bathroom_helpWashImouto_background",
                {
                    path: "img/pictures/bathroom_event/[NSFW]bathroom_helpWashImouto_frontWashBreasts",
                    x: 500,
                    y: 0,
                    scale: 1
                }
            ],
            [
                {
                    variant: "variation5",
                    unlockCondition: () => ShiroinGallery.isFullyUnlocked("438") === true
                },                
                "img/pictures/bathroom_event/[NSFW]bathroom_helpWashImouto_spreadManko1"
            ]          
        ]
    }, 
};


// 模板词条按 key 加入上面的字典。特殊词条仍可直接写在字典中。
// 回想卡片：[编号, 旧存档 index, 卡片样式, 显示顺序 order]。index 不连续，保留原值。
// 调整排序只改 order，数值越小越靠前；undefined 时回退到 index，两者都未指定则排最后。
for (const [id, index, cardStyle, order] of [
    [430, 2, 1, 2],
    [431, 3, 3, 3],
    [433, 5, 1, 5],
    [434, 6, 1, 6],
    [435, 7, 4, 7],
    [436, 8, 3, 8],
    [437, 9, 3, 9],
    [438, 25, 1, 25],
    [439, 26, 1, 26],
    [441, 16, 3, 16],
    [466, undefined, 3, 10]
]) {
    const key = String(id);
    DrillUp.g_SGaA_entries[key] = {
        index,
        order,
        name: key,
        cardStyle,
        video: `[NSFW]recallCgThumb${id}`,
        cover: `[NSFW]recallCgThumb${id}`,
        recall: () => RecallStage.start(key),
        category: "placeholder",
        pic: "placeholder"
    };
}

// 拍立得：样式数组依次对应 200～234；编号、名称、图片名及 index 自动生成。
const polaroidCardStyles = [
    6, 6, 6, 6, 6, 3, 6, 6, 6, 6, // 200～209
    6, 6, 6, 6, 6, 3, 3, 1, 3, 3, // 210～219
    3, 3, 3, 3, 1, 3, 3, 3, 1, 3, // 220～229
    3, 3, 1, 1, 3                 // 230～234
];
for (let offset = 0; offset < polaroidCardStyles.length; offset++) {
    const id = 200 + offset;
    DrillUp.g_SGaA_entries[String(id)] = {
        index: 40 + offset,
        cardStyle: polaroidCardStyles[offset],
        name: String(id),
        category: "Polaroid",
        pic: `chahuiChekiPicture${id}`
    };
}

// 原有界面配置也直接保留为可编辑常量，不再读取编辑器参数。
DrillUp.g_SGaA_layout = "placeholder";
DrillUp.g_SGaA_add_to_menu = false;
DrillUp.g_SGaA_menu_name = "画廊A";
DrillUp.g_SGaA_add_to_title = false;
DrillUp.g_SGaA_title_name = "画廊A";
DrillUp.g_SGaA_title_data_global = false;
DrillUp.g_SGaA_title_data_fileId = 1;
DrillUp.g_SGaA_imgExpandPic_slideTime = 30;
DrillUp.g_SGaA_singlePicture_hide = true;
DrillUp.g_SGaA_recallBtn_src = "recall";
DrillUp.g_SGaA_recallBtn_x = 1760;
DrillUp.g_SGaA_recallBtn_y = 50;
DrillUp.g_SGaA_recallBtn_normalOpacity = 150;
DrillUp.g_SGaA_command_mode = "窗口模式";
DrillUp.g_SGaA_useCategory = true;
DrillUp.g_SGaA_command_window = {
    "x": 110,
    "y": 150,
    "width": 640,
    "height": 840,
    "col": 1,
    "itemHeight": 70,
    "nameExEnabled": false,
    "align": "左对齐",
    "fontsize": 26,
    "slideMoveType": "弹性移动",
    "slideTime": 30,
    "slideDelay": 0,
    "slidePosType": "相对坐标",
    "slideX": -60,
    "slideY": 0,
    "slideAbsoluteX": 0,
    "slideAbsoluteY": 0,
    "layoutType": "默认皮肤",
    "layoutSrc": "画廊A-选项窗口",
    "layoutSrcFile": "img/Menu__picturegallery/",
    "layoutX": 0,
    "layoutY": 0,
    "cursor": {
        "mog_enabled": true,
        "mog_borderEnabled": true,
        "MCu_enabled": true,
        "MCu_lock": true,
        "MCu_style": 2,
        "MCB_rectEnabled": false,
        "MCB_enabled": true,
        "MCB_lock": false,
        "MCB_style": 1,
        "MSB_enabled": true,
        "MSB_lock": true,
        "MSB_style": 4
    },
    "icon_enabled": false,
    "icon_mode": "等比缩放",
    "icon_black": false
};
DrillUp.g_SGaA_command_button = {
    "x": 70,
    "y": 180,
    "style_id": 12,
    "btn_constructor": "Window_Selectable",
    "btn_src_file": "img/Menu__picturegallery/",
    "btn_src_default": "placeholder",
    "btn_src": [],
    "btn_srcKeyword": [],
    "active_enableMouseOk": true
};
DrillUp.g_SGaA_descWin_x = 860;
DrillUp.g_SGaA_descWin_y = 840;
DrillUp.g_SGaA_descWin_width = 1280;
DrillUp.g_SGaA_descWin_height = 320;
DrillUp.g_SGaA_descWin_fontsize = 28;
DrillUp.g_SGaA_descWin_replay = true;
DrillUp.g_SGaA_descWin_slideAnim = {
    "slideMoveType": "弹性移动",
    "slideTime": 30,
    "slideDelay": 0,
    "slidePosType": "相对坐标",
    "slideX": 0,
    "slideY": 0,
    "slideAbsoluteX": 0,
    "slideAbsoluteY": 0
};
DrillUp.g_SGaA_descWin_layout = {
    "layoutType": "隐藏布局",
    "layoutSrc": "",
    "layoutSrcFile": "img/Menu__picturegallery/",
    "layoutX": 0,
    "layoutY": 0
};
DrillUp.g_SGaA_Thumbnail_x = 855;
DrillUp.g_SGaA_Thumbnail_y = 150;
DrillUp.g_SGaA_Thumbnail_width = 960;
DrillUp.g_SGaA_Thumbnail_height = 720;
DrillUp.g_SGaA_Thumbnail_mode = "等比缩放";
DrillUp.g_SGaA_Thumbnail_replay = true;
DrillUp.g_SGaA_Thumbnail_showInstant = false;
DrillUp.g_SGaA_Thumbnail_slideAnim = {
    "slideMoveType": "弹性移动",
    "slideTime": 30,
    "slideDelay": 0,
    "slidePosType": "相对坐标",
    "slideX": 0,
    "slideY": 0,
    "slideAbsoluteX": 0,
    "slideAbsoluteY": 0
};
DrillUp.g_SGaA_compWin_x = 50;
DrillUp.g_SGaA_compWin_y = 900;
DrillUp.g_SGaA_compWin_width = 210;
DrillUp.g_SGaA_compWin_height = 70;
DrillUp.g_SGaA_compWin_fontsize = 22;
DrillUp.g_SGaA_compWin_word = "完成度：";
DrillUp.g_SGaA_compWin_slideAnim = {
    "slideMoveType": "弹性移动",
    "slideTime": 30,
    "slideDelay": 0,
    "slidePosType": "相对坐标",
    "slideX": 0,
    "slideY": 0,
    "slideAbsoluteX": 0,
    "slideAbsoluteY": 0
};
DrillUp.g_SGaA_compWin_layout = {
    "layoutType": "默认皮肤",
    "layoutSrc": "",
    "layoutSrcFile": "img/Menu__picturegallery/",
    "layoutX": 0,
    "layoutY": 0
};
DrillUp.g_SGaA_locked_name = "\\c[7]--未知图片--";
DrillUp.g_SGaA_locked_context = "该图片的描述已被隐藏。";
DrillUp.g_SGaA_locked_type = "锁定缩略图和描述内容";
DrillUp.g_SGaA_locked_pic = "placeholder";

// ============================================================================
// 多层分类模型。空字符串表示根，分类深度不限，错误配置恢复为可访问的根分类。
// ============================================================================
const GalleryModel = {
    _entries: [],
    _byKey: new Map(),
    _categories: new Map(),

    rebuild() {
        const indexed = Array(81).fill(null);
        const keyed = new Map();
        const unindexed = [];
        const categories = new Map();
        const warnings = [];
        for (const [key, source] of Object.entries(DrillUp.g_SGaA_categories)) {
            if (!key) continue;
            categories.set(key, {...source, key, parent: String(source.parent ?? ''), cover: String(source.cover ?? '')});
        }
        for (const [key, source] of Object.entries(DrillUp.g_SGaA_entries)) {
            const index = source.index === undefined ? undefined : Number(source.index);
            if (index !== undefined && (!Number.isSafeInteger(index) || index <= 0 || indexed[index])) {
                warnings.push(`词条 ${key} 的 index 无效或重复，已忽略：${source.index}`);
                continue;
            }
            const entry = Object.assign(source, {
                key, name: String(source.name ?? key), category: String(source.category ?? ''),
                pic: source.pic ?? '', enabled: source.enabled === true, locked: source.locked === true,
                context: String(source.context ?? '')
            });
            if (index === undefined) unindexed.push(entry);
            else { entry.index = index; indexed[index] = entry; }
            keyed.set(key, entry);
            if (entry.category && !categories.has(entry.category)) {
                categories.set(entry.category, {key: entry.category, parent: '', cover: ''});
                warnings.push(`词条 ${key} 的分类 ${entry.category} 未登记，已作为根分类处理。`);
            }
        }
        for (const category of categories.values()) {
            if (category.parent && !categories.has(category.parent)) {
                warnings.push(`分类 ${category.key} 的父分类 ${category.parent} 不存在，已作为根分类处理。`);
                category.parent = '';
            }
        }
        for (const category of categories.values()) {
            const visited = new Set([category.key]);
            let parent = category.parent;
            while (parent) {
                if (visited.has(parent)) {
                    warnings.push(`分类 ${category.key} 存在循环引用，已断开其父分类。`);
                    category.parent = '';
                    break;
                }
                visited.add(parent);
                parent = categories.get(parent)?.parent ?? '';
            }
        }
        this._categories = categories;
        this._byKey = keyed;
        this._entries = indexed.filter(Boolean).concat(unindexed);
        DrillUp.g_SGaA_context_list = indexed;
        DrillUp.g_SGaA_context_list_length = indexed.length - 1;
        DrillUp.drill_SGaA_gCheckData_enable?.();
        DrillUp.drill_SGaA_gCheckData_lock?.();
        window.$gameSystem?.drill_SGaA_checkSysData?.();
        for (const message of warnings) console.warn(`[Shiroin_SceneGalleryA] ${message}`);
        return this;
    },

    resolve(keyOrId) {
        if (typeof keyOrId === 'number') return DrillUp.g_SGaA_context_list[keyOrId] ?? null;
        if (typeof keyOrId === 'string') {
            return this._byKey.get(keyOrId) ?? null;
        }
        if (keyOrId && typeof keyOrId === 'object') return keyOrId;
        return null;
    },

    visible(entry) {
        const data = this.resolve(entry);
        if (!data) return false;
        return this.flag(data, 'enabled') === true;
    },

    locked(entry) {
        const data = this.resolve(entry);
        if (!data) return true;
        return this.flag(data, 'locked') === true;
    },

    variantsUnlocked(entry) {
        const data = this.resolve(entry);
        return !!data && this.flag(data, 'variantsUnlocked') === true;
    },

    flag(entry, field) {
        const legacy = entry.index !== undefined;
        const name = (field === 'enabled' ? 'enable' : field === 'locked' ? 'lock' : 'variantUnlock') + (legacy ? 'Tank' : 'ByKey');
        const tank = DrillUp.g_SGaA_title_data_global
            ? DrillUp[`global_SGaA_${name}`] : window.$gameSystem?.[`_drill_SGaA_${name}`];
        return tank?.[legacy ? entry.index : `entry:${entry.key}`] ?? entry[field];
    },

    categories(parent = '') {
        const key = String(parent ?? '');
        return [...this._categories.values()].filter(category => category.parent === key &&
            !this.demoHidden(category.key) &&
            this.descendants(category.key).some(entry => this.visible(entry)));
    },

    entries(category = '') {
        const key = String(category ?? '');
        if (this.demoHidden(key)) return [];
        return this.sortEntries(this._entries.filter(entry => entry.category === key && this.visible(entry)));
    },

    // Demo 版下，分类自身或任一祖先标了 demoHidden 即视为不存在。
    demoHidden(category = '') {
        if (!window.$dataSystem?.isDemo) return false;
        const key = String(category ?? '');
        return [key, ...this.ancestors(key)].some(k => this._categories.get(k)?.demoHidden);
    },

    sortEntries(entries) {
        // 排序不参与存档身份；旧词条同值按编号，新词条同值按稳定 key。
        const order = entry => Number.isFinite(entry.order) ? entry.order : (entry.index ?? Infinity);
        return entries.slice().sort((a, b) => order(a) - order(b) ||
            (a.index ?? Infinity) - (b.index ?? Infinity) ||
            (String(a.key) < String(b.key) ? -1 : String(a.key) > String(b.key) ? 1 : 0));
    },

    ancestors(key) {
        const result = [];
        let category = this._categories.get(String(key ?? ''));
        while (category?.parent) {
            result.unshift(category.parent);
            category = this._categories.get(category.parent);
        }
        return result;
    },

    descendants(category = '') {
        const key = String(category ?? '');
        if (!key) return this._entries.slice();
        return this._entries.filter(entry => entry.category === key || this.ancestors(entry.category).includes(key));
    },

    completion(category = '') {
        const entries = this.descendants(category).filter(entry => this.visible(entry));
        const unlocked = entries.filter(entry => !this.locked(entry)).length;
        return {total: entries.length, unlocked, locked: entries.length - unlocked,
            percent: entries.length ? unlocked / entries.length * 100 : 0};
    },

    categoryCover(key) {
        const explicit = this._categories.get(String(key))?.cover;
        if (explicit) return explicit;
        const entry = this.descendants(key).find(entry => this.visible(entry) && !this.locked(entry) && galleryEntryCover(entry));
        return entry ? galleryEntryCover(entry) : '';
    }
};
GalleryModel.rebuild();

// ============================================================================
// 原脚本接口与多语言。调用者可以照旧后置覆盖这些函数与字典。
// ============================================================================
DrillUp.drill_SGaA_localizeOption = (optionKey, picId) => String(optionKey ?? '').trim() || '无名称';
let galleryTextConverter = null;
DrillUp.drill_SGaA_localizeCategory = categoryKey => {
    const key = String(categoryKey ?? '');
    const source = window.mapCommonEventDialogue?.gallerySystem?.[key] ?? DrillUp.g_SGaA_categories[key]?.title;
    const text = String((Array.isArray(source) ? source.join('\n') : source) ?? key);
    // 复用一个离屏转换窗口，保留工程窗口字符插件的转义链。
    if (!galleryTextConverter) galleryTextConverter = new Window_Base(new Rectangle(0, 0, 1920, 100));
    return galleryTextConverter.convertEscapeCharacters(text);
};
DrillUp.drill_SGaA_openCategory = categoryKey => {
    $gameTemp._drill_SGaA_jumpCategory = String(categoryKey ?? '');
    $gameTemp._drill_SGaA_isSinglePictureMode = false;
    SceneManager.push(window.Scene_Drill_SGaA);
};
DrillUp.drill_SGaA_getRecallScript = optionKey => {
    const script = (GalleryModel.resolve(String(optionKey)) || GalleryModel._entries.find(entry => entry.name === String(optionKey)))?.recall;
    return typeof script === 'function' ? script : String(script ?? '');
};
DrillUp.drill_SGaA_getRecallScriptByData = data => typeof data?.recall === 'function' ? data.recall : String(data?.recall ?? '');
DrillUp.drill_SGaA_runRecallScript = script => {
    try {
        if (typeof script === 'function') script();
        else if (script) eval(String(script));
        return true;
    } catch (error) {
        console.error('[Shiroin_SceneGalleryA] 回想脚本执行出错：', error);
        return false;
    }
};
DrillUp.drill_SGaA_makeRecallConfirmText = (optionKey, picId) => {
    const text = window.mapCommonEventDialogue?.gallerySystem?.startRecall;
    return String((Array.isArray(text) ? text.join('\n') : text) ?? '开始回想？');
};
ImageManager.load_MenuGallery = function(filename) {
    return this.loadBitmap('img/Menu__picturegallery/', filename, 0, true);
};

// 路径继续交给 MoviePicture 解析；复制列表，忽略空项，不改写词条配置。
function galleryVideoPaths(video) {
    return (Array.isArray(video) ? video : [video]).filter(path => typeof path === 'string' && path.trim());
}
// 每个带 variant 标记的嵌套数组都是完整差分；其余元素合成为默认主图。
function galleryPictureDefinition(spec) {
    if (!Array.isArray(spec)) return {main: spec, variants: []};
    const main = [], variants = [], ids = new Set();
    const visit = (items, target, insideVariant = false) => {
        for (const item of items) {
            if (Array.isArray(item)) {
                const tag = item[0];
                if (tag && !Array.isArray(tag) && typeof tag === 'object' && Object.prototype.hasOwnProperty.call(tag, 'variant')) {
                    if (insideVariant) throw new Error('[ShiroinGallery] 差分内部不能再声明差分');
                    const id = typeof tag.variant === 'string' ? tag.variant.trim() : '';
                    if (!id || ids.has(id)) throw new Error('[ShiroinGallery] variant 需要唯一的非空字符串标记');
                    if (tag.unlockCondition != null && !['function','boolean'].includes(typeof tag.unlockCondition)) {
                        throw new Error('[ShiroinGallery] unlockCondition 需要函数或布尔值');
                    }
                    ids.add(id);
                    const layers = [];
                    visit(item.slice(1), layers, true);
                    if (!layers.length) throw new Error('[ShiroinGallery] 差分需要完整的图片图层');
                    variants.push({id, spec: layers, unlockCondition: tag.unlockCondition, order: variants.length + 1});
                } else visit(item, target, insideVariant);
            } else if (item != null && item !== '') {
                if (typeof item === 'object' && Object.prototype.hasOwnProperty.call(item, 'variant')) throw new Error('[ShiroinGallery] variant 标记应放在差分数组的第一项');
                target.push(item);
            }
        }
    };
    visit(spec, main);
    if (variants.length && !main.length) throw new Error('[ShiroinGallery] 有差分的 pic 必须配置默认主图');
    return {main, variants};
}
function galleryAvailableVariants(definition, entry) {
    const fullyUnlocked = GalleryModel.variantsUnlocked(entry);
    return [{id: '', spec: definition.main, order: 0, locked: false}, ...definition.variants.map(variant => {
        if (fullyUnlocked) return {...variant, locked: false};
        let unlocked = false;
        try {
            const condition = variant.unlockCondition;
            const result = condition == null ? true : typeof condition === 'function' ? condition(entry, variant.id) : condition;
            if (result && typeof result.then === 'function') {
                result.catch?.(() => {});
                throw new Error('unlockCondition 必须同步返回布尔值');
            }
            unlocked = !!result;
        } catch (error) {
            console.warn('[ShiroinGallery] 差分条件异常，暂不开放', variant.id, error);
        }
        return {...variant, locked: !unlocked};
    })];
}
function gallerySinglePictureHandle(bitmap) {
    let released = false, resolve, reject;
    const promise = new Promise((ok, fail) => {resolve = ok; reject = fail;});
    promise.catch(() => {});
    const listener = () => {if (!released) resolve(bitmap);};
    bitmap.addLoadListener(listener);
    return {bitmap, promise, setPriority() {}, release() {
        if (released) return;
        released = true;
        const index = bitmap._loadListeners?.indexOf(listener) ?? -1;
        if (index >= 0) bitmap._loadListeners.splice(index, 1);
        reject(Object.assign(new Error('Picture released'), {name:'AbortError'}));
    }};
}

// pic 支持旧文件名、游戏根目录相对路径，以及按顺序叠加的图层数组。
function galleryPictureLayers(spec) {
    spec = galleryPictureDefinition(spec).main;
    const layers = Array.isArray(spec) ? spec : [spec];
    return layers.filter(layer => layer != null && layer !== '').map(layer => {
        const data = typeof layer === 'string' ? {path: layer} : layer;
        if (!data || typeof data.path !== 'string' || !data.path.trim()) throw new Error('[ShiroinGallery] pic 图层需要 path');
        let path = data.path.replace(/\\/g, '/').replace(/^\.\//, '');
        if (/^(?:\/|[a-z]+:)/i.test(path) || path.split('/').includes('..')) throw new Error('[ShiroinGallery] pic 必须使用游戏目录内的相对路径');
        if (!path.includes('/')) path = 'img/Menu__picturegallery/' + path;
        path = path.replace(/\.png_$/i, '.png');
        if (!/\.[a-z0-9]+$/i.test(path)) path += '.png';
        const x = data.x ?? 0, y = data.y ?? 0, scale = data.scale ?? 1;
        if (![x, y, scale].every(Number.isFinite) || scale <= 0) throw new Error('[ShiroinGallery] pic 的 x/y 必须为数值，scale 必须大于 0');
        const blendMode = data.blendMode ?? 0;
        if (!Number.isInteger(blendMode) || blendMode < 0 || blendMode > 3) throw new Error('[ShiroinGallery] pic 的 blendMode 必须为 0（正常）、1（叠加）、2（正片叠底）或 3（滤色）');
        return {path, x, y, scale, blendMode};
    });
}
function galleryPictureFrame(layers, sources) {
    const rects = layers.map((layer, i) => ({x: layer.x, y: layer.y,
        width: sources[i].width * layer.scale, height: sources[i].height * layer.scale}));
    // 保留原点；负坐标整体平移进画布，不截断图层。
    const left = Math.floor(Math.min(0, ...rects.map(r => r.x)));
    const top = Math.floor(Math.min(0, ...rects.map(r => r.y)));
    const right = Math.ceil(Math.max(0, ...rects.map(r => r.x + r.width)));
    const bottom = Math.ceil(Math.max(0, ...rects.map(r => r.y + r.height)));
    return {left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top), rects};
}
// 正常鉴赏只加载共享原图和计算画幅，不创建 Canvas / 合成纹理。
function galleryAcquireViewerLayers(spec) {
    const layers = galleryPictureLayers(spec);
    const sources = layers.map(layer => ImageManager.loadBitmapFromUrl(Utils.encodeURI(layer.path)));
    const unique = [...new Set(sources)];
    let released = false, resolve, reject;
    const listeners = [];
    const handle = {
        layers: layers.map((layer, i) => ({...layer, bitmap: sources[i]})),
        sources: unique, frame: null,
        promise: new Promise((ok, fail) => {resolve = ok; reject = fail;}),
        setPriority() {}, // 普通引擎图片加载没有 Worker 排队优先级。
        release() {
            if (released) return;
            released = true;
            for (const {source, listener} of listeners) {
                const index = source._loadListeners?.indexOf(listener) ?? -1;
                if (index >= 0) source._loadListeners.splice(index, 1);
            }
            listeners.length = 0;
            handle.layers.length = 0;
            handle.sources.length = 0;
            sources.length = 0;
            reject(Object.assign(new Error('Viewer layers released'), {name:'AbortError'}));
        }
    };
    handle.promise.catch(() => {});
    const ready = () => {
        if (released || handle.frame || !sources.every(source => source.isReady())) return;
        handle.frame = galleryPictureFrame(layers, sources);
        listeners.length = 0;
        resolve(handle.frame);
    };
    for (const source of unique) {
        const listener = () => ready();
        listeners.push({source, listener});
        source.addLoadListener(listener);
    }
    ready();
    return handle;
}
function galleryShowViewerPicture(sprite, handle) {
    galleryReleasePicture(sprite);
    if (!handle.layers) { sprite.bitmap = handle.bitmap; return; }
    const frame = sprite._galleryFrame = handle.frame;
    sprite._galleryLayerSprites = handle.layers.map(layer => {
        const child = new Sprite(layer.bitmap);
        child.position.set(layer.x - frame.left - frame.width / 2, layer.y - frame.top - frame.height / 2);
        child.scale.set(layer.scale);
        child.blendMode = layer.blendMode;
        sprite.addChild(child); // 数组顺序就是 Z 顺序；不使用地图图片槽。
        return child;
    });
}
function galleryViewerFrame(sprite) {
    return sprite?._galleryFrame || sprite?.bitmap;
}
// 原图纹理按 Bitmap 身份去重，多个差分的共同背景只计一次。
function galleryVariantCacheBytes(records) {
    const resources = new Map();
    for (const record of records) {
        if (record.status !== 'ready') continue;
        if (record.handle.sources) {
            for (const bitmap of record.handle.sources) {
                resources.set(bitmap, Math.max(resources.get(bitmap) || 0, bitmap.width * bitmap.height * 4));
            }
        } else {
            const bitmap = record.handle.bitmap;
            resources.set(bitmap, Math.max(resources.get(bitmap) || 0, record.bytes));
        }
    }
    return [...resources.values()].reduce((sum, bytes) => sum + bytes, 0);
}
function galleryAcquirePicture(owner, spec, priority = 10) {
    const layers = galleryPictureLayers(spec);
    const load = layer => ImageManager.loadBitmapFromUrl(Utils.encodeURI(layer.path));
    if (!layers.length) return gallerySinglePictureHandle(ImageManager.load_MenuGallery(''));
    if (!Array.isArray(spec) && layers.length === 1 && layers[0].x === 0 && layers[0].y === 0 && layers[0].scale === 1 && layers[0].blendMode === 0) {
        return gallerySinglePictureHandle(load(layers[0]));
    }
    const cache = owner._galleryPictureCache ||= new Map();
    const key = JSON.stringify(layers);
    let record = cache.get(key);
    if (!record) {
        const bitmap = new Bitmap(1, 1);
        bitmap._loadingState = 'loading';
        record = {bitmap, refs: 0, disposed: false, ready: false, timer: null, task: null, priority, listeners: [], sources: []};
        record.promise = new Promise((resolve, reject) => {record.resolve = resolve; record.reject = reject;});
        record.promise.catch(() => {});
        cache.set(key, record);
        const markReady = (width, height) => {
            bitmap.baseTexture.update();
            galleryCoverBoundsCache.set(bitmap, {x: 0, y: 0, width, height});
            record.ready = true;
            bitmap._loadingState = 'loaded';
            record.sources = [];
            record.listeners = [];
            bitmap._callLoadListeners();
            record.resolve(bitmap);
        };
        const schedule = () => {
            if (record.disposed || record.ready || record.failed || record.task || record.timer !== null || !record.sources.every(source => source.isReady())) return;
            // 已修改的画布优先；普通图片直接使用 image，避免为原图创建全尺寸 Canvas 副本。
            const images = record.sources.map(source => source._canvas || source.image || source.canvas);
            if (window.ShiroinWorkers) {
                try {
                    record.task = ShiroinWorkers.submit('image.compose', {
                        layers: layers.map((layer, i) => ({image: images[i], x: layer.x, y: layer.y, scale: layer.scale, blendMode: layer.blendMode}))
                    }, {owner, priority: record.priority});
                    record.sources = [];
                    record.listeners = [];
                    record.task.promise.then(result => {
                        try {
                            if (record.disposed) return;
                            bitmap.resize(result.width, result.height);
                            bitmap.smooth = true;
                            bitmap.context.drawImage(result.image, 0, 0);
                            markReady(result.width, result.height);
                        } finally { ShiroinWorkers.disposeResult('image.compose', result); }
                    }).catch(error => {
                        if (record.disposed || error.name === 'AbortError') return;
                        record.failed = true;
                        record.reject(error);
                        bitmap._loadingState = 'error';
                        console.error('[ShiroinGallery] 合成失败', error);
                    }).finally(() => {record.task = null;});
                } catch (error) {
                    record.failed = true;
                    record.reject(error);
                    bitmap._loadingState = 'error';
                    record.sources = []; record.listeners = [];
                    console.error('[ShiroinGallery] 无法提交合成任务', error);
                }
                return;
            }
            // 未启用公共服务的旧部署继续兼容；不会偷偷加载另一份 Worker。
            record.timer = setTimeout(() => {
                record.timer = null;
                if (record.disposed) return;
                const frame = galleryPictureFrame(layers, record.sources);
                bitmap.resize(frame.width, frame.height);
                bitmap.smooth = true;
                const context = bitmap.context;
                context.imageSmoothingEnabled = true;
                context.imageSmoothingQuality = 'high';
                frame.rects.forEach((r, i) => {
                    context.globalCompositeOperation = ['source-over', 'lighter', 'multiply', 'screen'][layers[i].blendMode];
                    context.drawImage(images[i], r.x - frame.left, r.y - frame.top, r.width, r.height);
                });
                context.globalCompositeOperation = 'source-over';
                markReady(frame.width, frame.height);
            }, 0);
        };
        record.sources = layers.map(load);
        record.sources.forEach(source => {
            const listener = () => schedule();
            record.listeners.push({source, listener});
            source.addLoadListener(listener);
        });
    }
    if (priority > record.priority) {record.priority = priority; record.task?.setPriority(priority);}
    record.refs++;
    let released = false;
    return {bitmap: record.bitmap, promise: record.promise, setPriority(value) {
        if (Number.isFinite(value) && value > record.priority) {record.priority = value; record.task?.setPriority(value);}
    }, release() {
        if (released) return;
        released = true;
        if (--record.refs > 0) return;
        record.disposed = true;
        record.reject(Object.assign(new Error('Picture released'), {name:'AbortError'}));
        record.task?.cancel();
        record.task = null;
        if (record.timer !== null) clearTimeout(record.timer);
        for (const {source, listener} of record.listeners) {
            const index = source._loadListeners?.indexOf(listener) ?? -1;
            if (index >= 0) source._loadListeners.splice(index, 1);
        }
        record.listeners = [];
        record.sources = [];
        record.bitmap._loadListeners.length = 0;
        record.bitmap.destroy();
        cache.delete(key);
    }};
}
function galleryAcquireVariant(owner, variant, priority) {
    if (!variant.locked) return galleryAcquireViewerLayers(variant.spec);
    let source = galleryAcquirePicture(owner, variant.spec, priority);
    const bitmap = new Bitmap(1, 1);
    const lockedConfig = {...GALLERY_LAYOUT.cards.locked, blurRadius: GALLERY_LAYOUT.variants.lockedBlurRadius};
    let released = false, task = null, timer = null, finishDelay = null, rejectPending;
    const dropSource = () => {source?.release(); source = null;};
    const handle = {bitmap, promise: null, setPriority(value) {
        priority = Math.max(priority, value);
        source?.setPriority(priority); task?.setPriority(priority);
    }, release() {
        if (released) return;
        released = true;
        rejectPending(Object.assign(new Error('Locked preview released'), {name:'AbortError'}));
        task?.cancel();
        if (timer !== null) {clearTimeout(timer); timer = null; finishDelay?.();}
        dropSource(); bitmap.destroy();
    }};
    handle.promise = new Promise((resolve, reject) => {
        rejectPending = reject;
        source.promise.then(async original => {
            if (released) return;
            try {
                if (window.ShiroinWorkers) {
                    task = ShiroinWorkers.submit('image.lockedPreview', {
                        image: original._canvas || original.image || original.canvas,
                        config: lockedConfig
                    }, {owner, priority});
                    const result = await task.promise;
                    try {
                        if (released) return;
                        bitmap.resize(result.width, result.height);
                        bitmap.context.drawImage(result.image, 0, 0);
                    } finally { ShiroinWorkers.disposeResult('image.lockedPreview', result); }
                } else {
                    // 未安装公共服务的旧部署继续可用，安装后自动使用可取消的分段回退。
                    await new Promise(done => {finishDelay = done; timer = setTimeout(() => {timer = null; done();}, 0);});
                    if (released) return;
                    bitmap.resize(original.width, original.height);
                    bitmap.context.drawImage(original._canvas || original.image || original.canvas, 0, 0);
                    galleryDrawLockedCard(bitmap.context, original, {x:0,y:0,width:original.width,height:original.height}, original.width, original.height, lockedConfig);
                }
                bitmap.baseTexture.update();
                resolve(bitmap);
            } catch (error) {if (!released) reject(error);}
            finally {task = null; dropSource();}
        }, error => {dropSource(); if (!released) reject(error);});
    });
    handle.promise.catch(() => {});
    return handle;
}
function galleryReleasePicture(sprite) {
    if (!sprite) return;
    for (const child of sprite._galleryLayerSprites || []) {
        child.parent?.removeChild(child);
        child.bitmap = null;
        child.destroy(); // 只销毁精灵自己的纹理，不销毁 ImageManager 共享原图。
    }
    sprite._galleryLayerSprites = null;
    sprite._galleryFrame = null;
    sprite.bitmap = null;
    sprite._galleryPictureHandle?.release();
    sprite._galleryPictureHandle = null;
}
function gallerySetPicture(owner, sprite, spec, priority = 10) {
    const handle = galleryAcquirePicture(owner, spec, priority);
    galleryReleasePicture(sprite);
    sprite._galleryPictureHandle = handle;
    sprite.bitmap = handle.bitmap;
    return handle.bitmap;
}

// ============================================================================
// 存档兼容：继续沿用 SGaA 槽与所有旧数组，补默认值时不覆盖 false。
// ============================================================================
const galleryFillTank = (tank, field) => {
    const result = Array.isArray(tank) ? tank : [];
    for (const entry of GalleryModel._entries) {
        if (entry.index !== undefined && result[entry.index] == null) result[entry.index] = entry[field];
    }
    return result;
};
// 使用普通对象以兼容 MZ JsonEx；前缀避免 key 与 constructor / __proto__ 冲突。
const galleryFillKeyTank = (tank, field) => {
    const result = tank && typeof tank === 'object' && !Array.isArray(tank) ? tank : {};
    for (const entry of GalleryModel._entries) {
        if (entry.index !== undefined) continue;
        const key = `entry:${entry.key}`;
        if (result[key] == null) result[key] = entry[field];
    }
    return result;
};
DrillUp.drill_SGaA_gCheckData_enable = () => {
    DrillUp.global_SGaA_enableTank = galleryFillTank(DrillUp.global_SGaA_enableTank, 'enabled');
    DrillUp.global_SGaA_enableByKey = galleryFillKeyTank(DrillUp.global_SGaA_enableByKey, 'enabled');
};
DrillUp.drill_SGaA_gCheckData_lock = () => {
    DrillUp.global_SGaA_lockTank = galleryFillTank(DrillUp.global_SGaA_lockTank, 'locked');
    DrillUp.global_SGaA_lockByKey = galleryFillKeyTank(DrillUp.global_SGaA_lockByKey, 'locked');
    DrillUp.global_SGaA_variantUnlockTank = galleryFillTank(DrillUp.global_SGaA_variantUnlockTank, 'variantsUnlocked');
    DrillUp.global_SGaA_variantUnlockByKey = galleryFillKeyTank(DrillUp.global_SGaA_variantUnlockByKey, 'variantsUnlocked');
};
const galleryGlobalData = StorageManager.drill_COGS_loadData?.(DrillUp.g_SGaA_title_data_fileId, 'SGaA') ?? {};
DrillUp.global_SGaA_enableTank = DrillUp.global_SGaA_enableTank ?? galleryGlobalData.global_enableTank;
DrillUp.global_SGaA_lockTank = DrillUp.global_SGaA_lockTank ?? galleryGlobalData.global_lockTank;
DrillUp.global_SGaA_enableByKey = DrillUp.global_SGaA_enableByKey ?? galleryGlobalData.global_enableByKey;
DrillUp.global_SGaA_lockByKey = DrillUp.global_SGaA_lockByKey ?? galleryGlobalData.global_lockByKey;
DrillUp.global_SGaA_variantUnlockTank = DrillUp.global_SGaA_variantUnlockTank ?? galleryGlobalData.global_variantUnlockTank;
DrillUp.global_SGaA_variantUnlockByKey = DrillUp.global_SGaA_variantUnlockByKey ?? galleryGlobalData.global_variantUnlockByKey;
DrillUp.drill_SGaA_gCheckData_enable();
DrillUp.drill_SGaA_gCheckData_lock();
StorageManager.drill_SGaA_saveData = function() {
    this.drill_COGS_saveData?.(DrillUp.g_SGaA_title_data_fileId, 'SGaA', {
        global_enableTank: DrillUp.global_SGaA_enableTank,
        global_lockTank: DrillUp.global_SGaA_lockTank,
        global_enableByKey: DrillUp.global_SGaA_enableByKey,
        global_lockByKey: DrillUp.global_SGaA_lockByKey,
        global_variantUnlockTank: DrillUp.global_SGaA_variantUnlockTank,
        global_variantUnlockByKey: DrillUp.global_SGaA_variantUnlockByKey
    });
};
DrillUp.g_SGaA_saveEnabled = true;
Game_System.prototype.drill_SGaA_initSysData_Private = function() {
    this._drill_SGaA_enableTank = galleryFillTank([], 'enabled');
    this._drill_SGaA_lockTank = galleryFillTank([], 'locked');
    this._drill_SGaA_enableByKey = galleryFillKeyTank({}, 'enabled');
    this._drill_SGaA_lockByKey = galleryFillKeyTank({}, 'locked');
    this._drill_SGaA_variantUnlockTank = galleryFillTank([], 'variantsUnlocked');
    this._drill_SGaA_variantUnlockByKey = galleryFillKeyTank({}, 'variantsUnlocked');
    this._drill_SGaA_context_index = null;
};
Game_System.prototype.drill_SGaA_checkSysData_Private = function() {
    this._drill_SGaA_enableTank = galleryFillTank(this._drill_SGaA_enableTank, 'enabled');
    this._drill_SGaA_lockTank = galleryFillTank(this._drill_SGaA_lockTank, 'locked');
    this._drill_SGaA_enableByKey = galleryFillKeyTank(this._drill_SGaA_enableByKey, 'enabled');
    this._drill_SGaA_lockByKey = galleryFillKeyTank(this._drill_SGaA_lockByKey, 'locked');
    this._drill_SGaA_variantUnlockTank = galleryFillTank(this._drill_SGaA_variantUnlockTank, 'variantsUnlocked');
    this._drill_SGaA_variantUnlockByKey = galleryFillKeyTank(this._drill_SGaA_variantUnlockByKey, 'variantsUnlocked');
    if (this._drill_SGaA_context_index == null) this._drill_SGaA_context_index = null;
};
Game_System.prototype.drill_SGaA_initSysData = function() { this.drill_SGaA_initSysData_Private(); };
Game_System.prototype.drill_SGaA_checkSysData = function() { this.drill_SGaA_checkSysData_Private(); };
const gallerySystemInitialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    gallerySystemInitialize.apply(this, arguments);
    this.drill_SGaA_initSysData();
};
const galleryExtractSaveContents = DataManager.extractSaveContents;
DataManager.extractSaveContents = function(contents) {
    galleryExtractSaveContents.call(this, contents);
    if (DrillUp.g_SGaA_saveEnabled) $gameSystem.drill_SGaA_checkSysData();
    else $gameSystem.drill_SGaA_initSysData();
};
const galleryTempInitialize = Game_Temp.prototype.initialize;
Game_Temp.prototype.initialize = function() {
    galleryTempInitialize.apply(this, arguments);
    this._drill_SGaA_isSinglePictureMode = false;
    this._drill_SGaA_isSinglePictureIndex = 0;
    this._drill_SGaA_visibleDataList = [];
    this._drill_SGaA_curCategory = null;
    this._drill_SGaA_jumpCategory = null;
};
Game_Temp.prototype.drill_SGaA_isLocked = contextRealIndex => GalleryModel.locked(Number(contextRealIndex));
Game_Temp.prototype.drill_SGaA_isEnabled = contextRealIndex => GalleryModel.visible(Number(contextRealIndex));

const gallerySetFlag = (keyOrId, field, value, save = true) => {
    const entry = GalleryModel.resolve(keyOrId);
    if (!entry || GalleryModel.resolve(entry.key) !== entry) return false;
    const legacy = entry.index !== undefined;
    const tankName = (field === 'enabled' ? 'enable' : field === 'locked' ? 'lock' : 'variantUnlock') + (legacy ? 'Tank' : 'ByKey');
    const id = legacy ? entry.index : `entry:${entry.key}`;
    DrillUp[`global_SGaA_${tankName}`][id] = value;
    if (window.$gameSystem) {
        $gameSystem.drill_SGaA_checkSysData();
        $gameSystem[`_drill_SGaA_${tankName}`][id] = value;
    }
    if (save) StorageManager.drill_SGaA_saveData();
    return true;
};
// 手动接口和条件解锁共用登记流程；数字旧编号先解析成稳定的词条 key。
function galleryRecordUnlockTime(keyOrId) {
    const entry = GalleryModel.resolve(keyOrId);
    const recall = window.RecallStage;
    if (!entry || GalleryModel.resolve(entry.key) !== entry || !window.$gameSystem || !recall) return;
    const record = recall.getRecord(entry.key);
    const gs = $gameSystem;
    const timeIds = [gs._min_variableId, gs._hour_variableId, gs._day_variableId,
        gs._month_variableId, gs._year_variableId, gs._day_week_variableId,
        gs._season_variableId, gs._sec_variableId];
    // 即便预注入的时间只包含部分字段，也不以当前时间混补历史快照。
    if (timeIds.some(id => id > 0 && record?.variables?.[id] != null)) return;
    recall.record(entry.key, {
        ...record,
        variables: { ...record?.variables, ...recall.captureMogTimeVars() }
    }, record != null);
}
DrillUp.drill_SGaA_show = keyOrId => {
    galleryRecordUnlockTime(keyOrId);
    return gallerySetFlag(keyOrId, 'enabled', true);
};
// 沿用 show 的卡牌状态语义；差分条件在读取时跳过，不改动配置函数。
DrillUp.drill_SGaA_showFully = keyOrId => {
    galleryRecordUnlockTime(keyOrId);
    if (!gallerySetFlag(keyOrId, 'enabled', true, false)) return false;
    gallerySetFlag(keyOrId, 'variantsUnlocked', true, false);
    StorageManager.drill_SGaA_saveData();
    return true;
};
DrillUp.drill_SGaA_hide = keyOrId => gallerySetFlag(keyOrId, 'enabled', false);
DrillUp.drill_SGaA_lock = keyOrId => gallerySetFlag(keyOrId, 'locked', true);
// unlock 默认仅改变锁定状态；传入 true 可同时显示：unlock('430', true)。
DrillUp.drill_SGaA_unlock = (keyOrId, show = false) => {
    galleryRecordUnlockTime(keyOrId);
    const result = gallerySetFlag(keyOrId, 'locked', false, false);
    if (result && show) gallerySetFlag(keyOrId, 'enabled', true, false);
    if (result) StorageManager.drill_SGaA_saveData();
    return result;
};
// 场景入场或显式调用时结算，不逐帧检查；时间与现有回想登记共用词条 key。
function gallerySettleUnlockConditions() {
    let changed = false;
    for (const entry of GalleryModel._entries) {
        const condition = entry.unlockCondition;
        if (condition == null || (GalleryModel.visible(entry) && !GalleryModel.locked(entry))) continue;
        try {
            const result = typeof condition === 'function' ? condition(entry) : condition;
            if (result && typeof result.then === 'function') {
                result.catch?.(() => {});
                throw new Error('unlockCondition 必须同步返回布尔值');
            }
            if (typeof result !== 'boolean') throw new Error('unlockCondition 必须返回布尔值');
            if (!result) continue;
        } catch (error) {
            console.warn('[ShiroinGallery] 词条解锁条件异常，暂不解锁', entry.name, entry.key, error);
            continue;
        }
        // 只记录新发生的解锁；旧存档已显示且未锁定的词条不会补写当前时间。
        // 不使用地图事件的临时快照，它可能属于另一个事件。
        galleryRecordUnlockTime(entry);
        gallerySetFlag(entry, 'enabled', true, false);
        gallerySetFlag(entry, 'locked', false, false);
        changed = true;
    }
    if (changed) StorageManager.drill_SGaA_saveData();
}
DrillUp.drill_SGaA_rebuild = () => GalleryModel.rebuild();

// ============================================================================
// 旧 MV 指令仍有效（MZ_CompatPatch 会把原插件指令转发到这里）。
// ============================================================================
const galleryPluginCommand = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args) {
    galleryPluginCommand?.call(this, command, args);
    if (command !== '>画廊A') return;
    const type = String(args[1] ?? '');
    if (args.length === 2) {
        if (type === '打开面板') {
            $gameTemp._drill_SGaA_isSinglePictureMode = false;
            $gameTemp._drill_SGaA_jumpCategory = null;
            SceneManager.push(window.Scene_Drill_SGaA);
            return;
        }
        const operations = {
            '显示全部': ['enableTank', true], '隐藏全部': ['enableTank', false],
            '锁定全部': ['lockTank', true], '解锁全部': ['lockTank', false]
        };
        const operation = operations[type];
        if (operation) {
            $gameSystem.drill_SGaA_checkSysData();
            for (let index = 1; index <= DrillUp.g_SGaA_context_list_length; index++) {
                DrillUp[`global_SGaA_${operation[0]}`][index] = operation[1];
                $gameSystem[`_drill_SGaA_${operation[0]}`][index] = operation[1];
            }
            for (const entry of GalleryModel._entries) {
                if (entry.index === undefined) gallerySetFlag(entry, operation[0] === 'enableTank' ? 'enabled' : 'locked', operation[1], false);
            }
            StorageManager.drill_SGaA_saveData();
        }
    }
    if (args.length === 4) {
        const index = Number(String(args[3]).replace(/^内容\[/, '').replace(/\]$/, ''));
        if (!Number.isSafeInteger(index) || index <= 0) return;
        const operations = {
            '显示选项': ['enableTank', true], '隐藏选项': ['enableTank', false],
            '锁定选项': ['lockTank', true], '解锁选项': ['lockTank', false]
        };
        const operation = operations[type];
        if (operation) {
            $gameSystem.drill_SGaA_checkSysData();
            DrillUp[`global_SGaA_${operation[0]}`][index] = operation[1];
            $gameSystem[`_drill_SGaA_${operation[0]}`][index] = operation[1];
            StorageManager.drill_SGaA_saveData();
        } else if (type === '选中页') {
            $gameSystem._drill_SGaA_context_index = index - 1;
        } else if (type === '打开面板(单图查看模式)' && GalleryModel.resolve(index)) {
            $gameTemp._drill_SGaA_isSinglePictureMode = true;
            $gameTemp._drill_SGaA_isSinglePictureIndex = index;
            $gameTemp._drill_SGaA_jumpCategory = null;
            SceneManager.push(window.Scene_Drill_SGaA);
        }
    }
};

// -----------------------------------------------------------------------------
// 布局字典：以 1920×1080 为设计坐标，仅缩放显示，不修改图片原始分辨率。
// -----------------------------------------------------------------------------
const GALLERY_LAYOUT = DrillUp.g_SGaA_layoutConfig = {
    width: 1920, height: 1080,
    cards: { x: 92, y: 136, width: 1736, height: 858, columns: 4, rows: 2,
        aspect: 2.3, gapX: 48, gapY: 34, hoverScale: 1.045, easing: 0.18,
        cornerRadius: 20, referenceWidth: 400,
        // 大小和间距按星星不透明主体计算，外发光留白可相互重叠。
        stars: { image: 'star', maxSize: 32, widthRatio: 0.115, gap: 1, titleGap: 12 },
        // 锁定封面一次性合成：按显示尺寸进行高斯模糊，再映射到黑灰亮度范围。
        locked: { blurRadius: 3, minBrightness: 6, maxBrightness: 40, gamma: 1.4, glowColor: 0x666666 },
        bottomFade: { heightRatio: 0.62, maxHeight: 520, color: [243, 166, 74], opacity: 0.78 },
        sparkles: { heightRatio: 0.48, density: 0.0045, opacity: 0.85, seed: 2718,
            settledShare: 0.85, settledHeightRatio: 0.1, settledMaxHeight: 64, fineDensity: 4 },
        glow: { distance: 48, outerStrength: 1.8, innerStrength: 0, color: 0xf3a64a, quality: 0.33 },
        textGlow: { distance: 6, outerStrength: 2, innerStrength: 0, color: 0x291708, quality: 0.33 } },
    entryCards: { columns: 5, rows: 2, titleFontSize: 36 },
    pagination: { x: 760, y: 1008, width: 400, height: 60, buttonWidth: 64, fontSize: 34,
        hitWidth: 132, hitHeight: 76, hoverScale: 2, hoverEasing: 0.2 },
    list: { x: 110, y: 150, width: 640, height: 840, itemHeight: 70, fontSize: 26 },
    preview: { x: 855, y: 150, width: 960, height: 720, videoOffsetY: -40 },
    // 右侧可用宽度全部用于文字；居中后窗口右缘恰好落在 1920，内容仍保留窗口内边距。
    description: { x: 750, y: 840, width: 1170, height: 228, fontSize: 28 },
    // 完整显示时，图片顶边与 Y=100 的标题分割线至少相隔 30px。
    viewer: { x: 80, y: 130, width: 1760, height: 760, maxZoom: 8, descriptionGap: 30 },
    variants: { leftX: 28, rightX: 1812, y: 453, buttonWidth: 80, buttonHeight: 104,
        hitWidth: 132, hitHeight: 168, hoverScale: 2, hoverEasing: 0.2,
        cacheMiB: Utils.isMobileDevice() ? 500 : 1024, maxPreloaded: 6, lockedBlurRadius: 18, lockedFontSize: 42 },
    // 960×540 动画的固定鉴赏排版：标题/上分割线对齐卡牌页，描述区与视频留出 55px。
    videoViewer: { x: 80, y: 165, width: 1760, height: 710,
        titleY: 10, titleHeight: 64, titleDividerY: 100, descriptionY: 930,
        recallButtonX: 1500, recallButtonY: 10, recallButtonGap: 24 },
    color: { background: '#14171e', panel: '#222731', accent: '#e4c388', text: '#f2eee6', muted: '#a5a8b2' }
};
const galleryLabels = () => {
    const language = window.ConfigManager?.language || 0;
    const fallback = [0, 12].includes(language) ? {
        lockedVariation: '还没有解锁这个差分！',
        title: '画廊', direct: '本分类词条', empty: '暂无已显示的词条', locked: '尚未解锁', videoLoading: '动画加载中…', videoError: '动画暂时无法播放', variantLoading: '图片加载中…', variantError: '图片暂时无法显示'
    } : language === 1 ? {
        lockedVariation: 'この差分はまだ解放されていません！',
        title: 'ギャラリー', direct: 'このカテゴリーの作品', empty: '表示できる作品はありません', locked: '未解放', videoLoading: '動画を読み込み中…', videoError: '動画を再生できません', variantLoading: '画像を読み込み中…', variantError: '画像を表示できません'
    } : {
        lockedVariation: "Haven't unlocked this variation yet!",
        title: 'Gallery', direct: 'Entries in this category', empty: 'No visible entries yet', locked: 'Locked', videoLoading: 'Loading animation…', videoError: 'Animation unavailable', variantLoading: 'Loading image…', variantError: 'Image unavailable'
    };
    const table = window.mapCommonEventDialogue?.gallerySystem || {};
    for (const key of Object.keys(fallback)) {
        if (table[key] != null) fallback[key] = galleryText(table[key]);
    }
    return fallback;
};
const galleryText = value => Array.isArray(value) ? value.join('\n') : String(value ?? '');
const galleryClamp = (value, min, max) => Math.max(min, Math.min(max, value));
const galleryTrigger = () => TouchInput.isTriggered() || !!TouchInput.drill_isLeftTriggerd?.();
const galleryPressed = () => TouchInput.isPressed() || !!TouchInput.drill_isLeftPressed?.();
const galleryCancelled = () => TouchInput.isCancelled() || !!TouchInput.drill_isRightTriggerd?.();
const galleryFit = (sprite, area) => {
    const bitmap = sprite.bitmap;
    if (!bitmap || bitmap.width <= 0 || bitmap.height <= 0) return;
    const scale = Math.min(area.width / bitmap.width, area.height / bitmap.height);
    sprite.anchor.set(0.5);
    sprite.scale.set(scale);
    sprite.position.set(area.x + area.width / 2, area.y + area.height / 2);
};
const galleryBitmap = (width, height) => {
    const bitmap = new Bitmap(Math.max(1, Math.ceil(width)), Math.max(1, Math.ceil(height)));
    // ImageSmoothSetting 的 DynamicImage=false 用于地图，画廊生成的位图须单独开启平滑。
    bitmap.smooth = true;
    bitmap.context.imageSmoothingEnabled = true;
    bitmap.context.imageSmoothingQuality = 'high';
    bitmap.fontFace = window.$gameSystem?.mainFontFace?.() || 'sans-serif';
    bitmap.outlineWidth = 0;
    bitmap.textColor = GALLERY_LAYOUT.color.text;
    return bitmap;
};
// 与原画廊相同：两端透明、中央 alpha 0.55 的淡白细线。
const galleryDrawDivider = (bitmap, x, y, width) => {
    bitmap.gradientFillRect(x, y, width / 2, 2, 'rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', false);
    bitmap.gradientFillRect(x + width / 2, y, width / 2, 2, 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)', false);
};
// 父分类按数量自适应；词条仅在总共1页且不超过5张时放大，多页始终保留5×2槽位。
function galleryCardRects(count, entryCards = false, pageCount = 1) {
    const c = entryCards ? { ...GALLERY_LAYOUT.cards, ...GALLERY_LAYOUT.entryCards } : GALLERY_LAYOUT.cards;
    const columns = entryCards ? c.columns : Math.min(c.columns, count);
    const rows = entryCards ? (pageCount === 1 && count <= c.columns ? 1 : c.rows) : Math.ceil(count / c.columns);
    if (!count) return [];
    const height = Math.min((c.height - (rows - 1) * c.gapY) / rows,
        ((c.width - (columns - 1) * c.gapX) / columns) * c.aspect);
    const width = height / c.aspect;
    const top = c.y + (c.height - (height * rows + c.gapY * (rows - 1))) / 2;
    return Array.from({ length: count }, (_, i) => {
        const row = Math.floor(i / c.columns), col = i % c.columns;
        const rowCount = entryCards ? c.columns : Math.min(c.columns, count - row * c.columns);
        return { x: c.x + (c.width - rowCount * width - (rowCount - 1) * c.gapX) / 2 + col * (width + c.gapX),
            y: top + row * (height + c.gapY), width, height };
    });
}
// 热区固定在设计坐标中，不跟随箭头的悬停缩放。
function galleryArrowRect(kind, direction) {
    const p = GALLERY_LAYOUT[kind];
    const left = kind === 'pagination' ? (direction < 0 ? p.x : p.x + p.width - p.buttonWidth) :
        (direction < 0 ? p.leftX : p.rightX);
    const height = kind === 'pagination' ? p.height : p.buttonHeight;
    return {x: left + p.buttonWidth / 2 - p.hitWidth / 2,
        y: p.y + height / 2 - p.hitHeight / 2, width: p.hitWidth, height: p.hitHeight};
}
function galleryInsideRect(point, rect) {
    return point.x >= rect.x && point.x < rect.x + rect.width &&
        point.y >= rect.y && point.y < rect.y + rect.height;
}
function galleryPageDirection(point) {
    if (galleryInsideRect(point, galleryArrowRect('pagination', -1))) return -1;
    if (galleryInsideRect(point, galleryArrowRect('pagination', 1))) return 1;
    return 0;
}
function galleryVariantDirection(point, buttons) {
    if (buttons?.[0].visible && galleryInsideRect(point, galleryArrowRect('variants', -1))) return -1;
    if (buttons?.[1].visible && galleryInsideRect(point, galleryArrowRect('variants', 1))) return 1;
    return 0;
}
function galleryAnimateArrow(button, active, config) {
    if (!button.visible) { if (button.scale.x !== 1) button.scale.set(1); return; }
    const target = active ? config.hoverScale : 1;
    const current = button.scale.x;
    if (current === target) return;
    const next = current + (target - current) * config.hoverEasing;
    button.scale.set(Math.abs(next - target) < 0.001 ? target : next);
}

// 兜底 CG 常带拍立得透明边距/投影；优先离线索引，未知素材才扫描一次并缓存。
const galleryCoverBoundsCache = new WeakMap();
function galleryCoverBounds(bitmap) {
    if (galleryCoverBoundsCache.has(bitmap)) return galleryCoverBoundsCache.get(bitmap);
    const { width, height } = bitmap;
    let bounds = { x: 0, y: 0, width, height };
    let key = String(bitmap.url || bitmap._url || '').split('Menu__picturegallery/').pop().replace(/\.png_?(?:[?#].*)?$/, '');
    try { key = decodeURIComponent(key); } catch (_) { /* 非标准文件名继续使用原始 key。 */ }
    const stored = DrillUp.g_SGaA_coverBounds?.[key];
    if (Array.isArray(stored) && stored.length === 6 && stored.every(Number.isSafeInteger) &&
        stored[0] === width && stored[1] === height && stored[2] >= 0 && stored[3] >= 0 &&
        stored[4] > 0 && stored[5] > 0 && stored[2] + stored[4] <= width && stored[3] + stored[5] <= height) {
        bounds = { x: stored[2], y: stored[3], width: stored[4], height: stored[5] };
        galleryCoverBoundsCache.set(bitmap, bounds);
        return bounds;
    }
    try {
        const pixels = bitmap.context.getImageData(0, 0, width, height).data;
        let left = width, top = height, right = -1, bottom = -1;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (pixels[(y * width + x) * 4 + 3] < 250) continue;
                left = Math.min(left, x); right = Math.max(right, x);
                top = Math.min(top, y); bottom = Math.max(bottom, y);
            }
        }
        if (right >= left) bounds = { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
    } catch (error) {
        console.warn('[ShiroinGallery] 无法读取兜底封面边界，使用完整图片', error);
    }
    galleryCoverBoundsCache.set(bitmap, bounds);
    return bounds;
}

// 一次性绘制到卡牌标签画布，不增加逐帧粒子更新；同分类重建时保持相同光点分布。
function galleryColor(value, fallback) {
    if (Array.isArray(value) && value.length === 3 && value.every(v => Number.isFinite(v) && v >= 0 && v <= 255)) return value.map(Math.round);
    if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) value = parseInt(value.slice(1), 16);
    if (Number.isInteger(value) && value >= 0 && value <= 0xffffff) return [value >> 16, value >> 8 & 255, value & 255];
    return fallback;
}
function galleryResolveCardStyle(data) {
    const category = data.entry ? data.entry.category : data.key;
    const palettes = DrillUp.g_SGaA_cardStyles;
    const style = { ...palettes[0] };
    let paletteId = 0;
    const apply = value => {
        if (Number.isInteger(value) || (typeof value === 'string' && /^\d+$/.test(value))) {
            const palette = palettes[Number(value)];
            // 未知编号沿用上一级；有效编号切换整套配色，未指定光点色时重新跟随本套渐变。
            if (palette) {
                paletteId = Number(value);
                Object.assign(style, { sparkleColor: undefined, gradientOpacity: undefined }, palette);
            }
        } else if (value && typeof value === 'object' && !Array.isArray(value)) Object.assign(style, value);
    };
    for (const key of [...GalleryModel.ancestors(category), category]) apply(GalleryModel._categories.get(key)?.cardStyle);
    if (data.entry) apply(data.entry.cardStyle);
    const gradient = galleryColor(style.gradientColor, GALLERY_LAYOUT.cards.bottomFade.color);
    const glow = galleryColor(style.glowColor, galleryColor(GALLERY_LAYOUT.cards.glow.color, gradient));
    const sparkle = galleryColor(style.sparkleColor, gradient);
    const gradientOpacity = Number.isFinite(style.gradientOpacity)
        ? galleryClamp(style.gradientOpacity, 0, 1) : GALLERY_LAYOUT.cards.bottomFade.opacity;
    const blend = (white, amount) => sparkle.map(v => Math.round(v * (1 - amount) + white * amount));
    let starCount = 0;
    for (let count = 1; count <= 6; count++) {
        const ids = DrillUp.g_SGaA_cardStars?.[count];
        if (Array.isArray(ids) && ids.some(id =>
            (Number.isInteger(id) || (typeof id === 'string' && /^\d+$/.test(id))) && Number(id) === paletteId)) {
            starCount = count;
            break;
        }
    }
    return { gradient, gradientOpacity, paletteId, starCount,
        glowColor: (glow[0] << 16) | (glow[1] << 8) | glow[2],
        light: blend(255, 0.55), pale: blend(255, 0.8) };
}
function galleryRoundPath(context, width, height, radius) {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
    context.beginPath();
    context.moveTo(r, 0); context.lineTo(width - r, 0);
    context.quadraticCurveTo(width, 0, width, r); context.lineTo(width, height - r);
    context.quadraticCurveTo(width, height, width - r, height); context.lineTo(r, height);
    context.quadraticCurveTo(0, height, 0, height - r); context.lineTo(0, r);
    context.quadraticCurveTo(0, 0, r, 0); context.closePath();
}
function galleryUseEntryCards(category, entries) {
    const view = GalleryModel._categories.get(category)?.entryView;
    return entries.length > 0 && view !== 'list';
}
function galleryEntryCover(entry, revealLockedSource = false) {
    if (!revealLockedSource && GalleryModel.locked(entry)) return DrillUp.g_SGaA_locked_pic;
    return entry.cover || (entry.video ? '' : entry.pic);
}
function galleryCardRaster(rect, bounds, explicitCover, displayScale = 1) {
    // 普通卡牌至少双倍采样；手工封面保留取景区域的原始像素，不预先缩成屏幕小图。
    const visibleScale = Math.max(1, displayScale) * GALLERY_LAYOUT.cards.hoverScale;
    const sourceScale = bounds ? Math.min(bounds.width / rect.width, bounds.height / rect.height) : 0;
    const scale = Math.max(2 * visibleScale, explicitCover ? sourceScale : 0);
    return { width: Math.max(1, Math.ceil(rect.width * scale - 1e-8)),
        height: Math.max(1, Math.ceil(rect.height * scale - 1e-8)) };
}
function galleryCardDisplayScale(uiScale = 1) {
    // CSS 像素转物理像素后再与渲染器倍率取较大值，避免把 DPR 重复乘到游戏画布上。
    // 手机常见 _realScale≈1/DPR，此时物理显示倍率约为 1；PC 放大窗口仍保留采样余量。
    const cssScale = Number.isFinite(Graphics._realScale) && Graphics._realScale > 0 ? Graphics._realScale : 1;
    const dpr = Number.isFinite(window.devicePixelRatio) && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
    const resolution = Graphics._app?.renderer?.resolution || 1;
    return uiScale * Math.max(resolution, cssScale * dpr);
}
function galleryCardCrop(data, bounds, width, height) {
    // 手工封面沿用原取景；仅自动生成的静态 CG 卡牌使用分类裁剪参数，锁定暗影保持相同取景。
    const crop = data.entry && !data.entry.video && !data.entry.cover
        ? GalleryModel._categories.get(data.entry.category)?.staticCardCrop : null;
    const zoom = Number.isFinite(crop?.zoom) ? Math.max(1, crop.zoom) : 1;
    const scale = Math.max(width / bounds.width, height / bounds.height) * zoom;
    const sw = width / scale, sh = height / scale;
    const focus = value => Number.isFinite(value) ? galleryClamp(value, 0, 1) : 0.5;
    const focusX = focus(data.focusX ?? crop?.focusX);
    const focusY = focus(data.focusY ?? crop?.focusY);
    return { x: bounds.x + (bounds.width - sw) * focusX,
        y: bounds.y + (bounds.height - sh) * focusY, width: sw, height: sh };
}
function galleryBlurLockedLuminance(gray, width, height, sigma) {
    if (!(sigma > 0)) return gray;
    const radius = Math.ceil(sigma * 3);
    const kernel = new Float32Array(radius * 2 + 1);
    let total = 0;
    for (let i = -radius; i <= radius; i++) {
        const weight = Math.exp(-(i * i) / (2 * sigma * sigma));
        kernel[i + radius] = weight;
        total += weight;
    }
    for (let i = 0; i < kernel.length; i++) kernel[i] /= total;
    const horizontal = new Float32Array(gray.length), result = new Float32Array(gray.length);
    // 可分离高斯卷积，边缘复制避免四周变黑；浮点中间结果避免暗部反复量化。
    for (let y = 0; y < height; y++) {
        const row = y * width;
        for (let x = 0; x < width; x++) {
            let value = 0;
            for (let k = -radius; k <= radius; k++) {
                value += gray[row + Math.max(0, Math.min(width - 1, x + k))] * kernel[k + radius];
            }
            horizontal[row + x] = value;
        }
    }
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let value = 0;
            for (let k = -radius; k <= radius; k++) {
                value += horizontal[Math.max(0, Math.min(height - 1, y + k)) * width + x] * kernel[k + radius];
            }
            result[y * width + x] = value;
        }
    }
    return result;
}
function galleryDrawLockedCard(context, source, crop, width, height, config = GALLERY_LAYOUT.cards.locked) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(width));
    canvas.height = Math.max(1, Math.ceil(height));
    const shadow = canvas.getContext('2d', { willReadFrequently: true });
    shadow.imageSmoothingEnabled = true;
    shadow.imageSmoothingQuality = 'high';
    // 按卡牌显示尺寸处理，不再把低分辨率色块直接放大，也不修改 ImageManager 原图。
    shadow.drawImage(source.canvas, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
    const pixels = shadow.getImageData(0, 0, canvas.width, canvas.height);
    const data = pixels.data;
    const gray = new Float32Array(canvas.width * canvas.height);
    for (let i = 0; i < data.length; i += 4) {
        gray[i / 4] = (data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) / 255;
    }
    const sigma = Number.isFinite(config.blurRadius) ? galleryClamp(config.blurRadius, 0, 32) : 4;
    const blurred = galleryBlurLockedLuminance(gray, canvas.width, canvas.height, sigma);
    for (let i = 0; i < data.length; i += 4) {
        const luminance = blurred[i / 4];
        const value = Math.round(config.minBrightness + (config.maxBrightness - config.minBrightness) * Math.pow(luminance, config.gamma));
        data[i] = data[i + 1] = data[i + 2] = value;
        data[i + 3] = 255;
    }
    shadow.putImageData(pixels, 0, 0);
    context.save();
    // 精确透明轮廓由此前绘制的原图提供，暗影层不扩大透明区域或圆角。
    context.globalCompositeOperation = 'source-atop';
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(canvas, 0, 0, width, height);
    context.restore();
    canvas.width = canvas.height = 1;
}
function galleryDrawCardFinish(bitmap, width, height, key, style) {
    const { bottomFade: fade, sparkles } = GALLERY_LAYOUT.cards;
    const context = bitmap.context;
    const fadeHeight = Math.min(fade.maxHeight, height * fade.heightRatio);
    const top = height - fadeHeight;
    const gradient = context.createLinearGradient(0, top, 0, height);
    // smoothstep 两端斜率为零，避免线性渐变在上缘突然开始染色。
    for (let i = 0; i <= 24; i++) {
        const t = i / 24, alpha = style.gradientOpacity * t * t * (3 - 2 * t);
        gradient.addColorStop(t, `rgba(${style.gradient.join(',')},${alpha})`);
    }
    context.save();
    context.fillStyle = gradient;
    context.fillRect(0, top, width, fadeHeight);
    let seed = sparkles.seed >>> 0;
    for (const char of String(key)) seed = (Math.imul(seed, 31) + char.codePointAt(0)) >>> 0;
    const random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
    };
    const sparkleHeight = height * sparkles.heightRatio;
    const settledHeight = Math.min(sparkles.settledMaxHeight, height * sparkles.settledHeightRatio);
    // 沉积层底端的柔光托底；亮度集中在最底部，向上融入现有金橙渐变。
    const coreHeight = Math.min(24, settledHeight * 0.45);
    const core = context.createLinearGradient(0, height - coreHeight, 0, height);
    core.addColorStop(0, `rgba(${style.light},0)`);
    core.addColorStop(0.55, `rgba(${style.light},0.12)`);
    core.addColorStop(0.9, `rgba(${style.pale},0.48)`);
    core.addColorStop(1, `rgba(${style.pale},0.2)`);
    context.fillStyle = core;
    context.fillRect(0, height - coreHeight, width, coreHeight);
    const count = Math.round(width * sparkleHeight * sparkles.density);
    for (let i = 0; i < count; i++) {
        const x = 4 + random() * (width - 8);
        // 大部分形成底部沉积带，少量散点向上延伸，避免平均散在整段渐变上。
        const settled = i < Math.round(count * sparkles.settledShare);
        const risePixels = Math.pow(random(), settled ? 1.7 : 1.8) * (settled ? settledHeight : sparkleHeight - 8);
        const rise = risePixels / sparkleHeight;
        const y = height - 4 - risePixels;
        const radius = 0.45 + Math.pow(random(), 3) * 1.5;
        const behindText = y > height - 108 && y < height - 9 && x > 12 && x < width - 12;
        // 沉积颗粒不再被整块文字区域压暗，文字由自身的深色字形光晕保护。
        const alpha = sparkles.opacity * (0.25 + random() * 0.75) * (1 - rise) * (behindText && !settled ? 0.22 : 1);
        // 少量亮点带柔光，其余保持细小清晰，避免整片雾化。
        if (random() < 0.13) {
            const spread = radius * 4;
            const halo = context.createRadialGradient(x, y, 0, x, y, spread);
            halo.addColorStop(0, `rgba(${style.light},${alpha * 0.65})`);
            halo.addColorStop(1, `rgba(${style.light},0)`);
            context.fillStyle = halo;
            context.fillRect(x - spread, y - spread, spread * 2, spread * 2);
        }
        context.fillStyle = `rgba(${style.pale},${alpha})`;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
    }
    // 独立细颗粒底床：数量按卡牌宽度计算，小卡牌也有足够密度；不增加大光斑。
    const fineCount = Math.round(width * sparkles.fineDensity);
    for (let i = 0; i < fineCount; i++) {
        const x = 2 + random() * (width - 4);
        const depth = Math.pow(random(), 2.8);
        const y = height - 1.5 - depth * settledHeight;
        const radius = 0.25 + random() * 0.65;
        const alpha = (0.3 + random() * 0.6) * (1 - depth * 0.75);
        const tint = random();
        const color = style.light.map((v, index) => Math.round(v + (style.pale[index] - v) * tint));
        context.fillStyle = `rgba(${color},${alpha})`;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
    }
    context.restore();
    bitmap.baseTexture.update();
}

// 拉丁字母语言按完整单词换行，包含越南语等扩展字母及分解形式的组合重音。
// 只有单个词超过卡牌宽度时才拆字；组合重音始终与前面的字母一起保留。
function galleryWrapCardTitle(bitmap, title, width) {
    const lines = [];
    for (const paragraph of title.replace(/\r\n?/g, '\n').split('\n')) {
        let line = '', space = '';
        const tokens = paragraph.match(/[ \t]+|(?:[\p{Script=Latin}0-9]\p{M}*)+(?:['’\-](?:[\p{Script=Latin}0-9]\p{M}*)+)*|[^ \t]\p{M}*/gu) || [];
        for (const token of tokens) {
            if (/^[ \t]+$/.test(token)) { space = line ? ' ' : ''; continue; }
            if (line && bitmap.measureTextWidth(line + space + token) > width) {
                lines.push(line);
                line = '';
                space = '';
            }
            if (bitmap.measureTextWidth(token) > width) {
                for (const char of token.match(/\P{M}\p{M}*|\p{M}+/gu) || []) {
                    if (line && bitmap.measureTextWidth(line + char) > width) {
                        lines.push(line);
                        line = '';
                    }
                    line += char;
                }
            } else line += space + token;
            space = '';
        }
        lines.push(line);
    }
    return lines;
}

function galleryCardTitleLayout(bitmap, title, width, height, entry, starSpace = 0) {
    const bottom = (entry ? 14 : 48) + starSpace; // 分类卡牌另给完成数量保留空间。
    const fontSize = bitmap.fontSize;
    let lines, lineHeight, titleHeight;
    do {
        lines = galleryWrapCardTitle(bitmap, title, width - 30);
        lineHeight = 30 * bitmap.fontSize / fontSize;
        titleHeight = (lines.length - 1) * lineHeight + lineHeight + 4;
        if (titleHeight + bottom + 8 <= height || bitmap.fontSize <= 8) break;
        bitmap.fontSize -= 1;
    } while (true);
    const textHeight = Math.max(120, Math.ceil(titleHeight + bottom + 8));
    return { lines, lineHeight, textHeight, titleY: textHeight - bottom - titleHeight };
}

const galleryGlowPrograms = new WeakMap();
function gallerySelectionGlow(options) {
    if (!PIXI.filters.GlowFilter) return null;
    const filter = new PIXI.filters.GlowFilter(options);
    const original = filter.program;
    // 48px 光晕累计权重约 117600，超过部分安卓 GPU 的 mediump 范围。
    // 仅替换画廊选中滤镜的程序，不修改 PIXI 全局精度或共享的原始 Program。
    if (!galleryGlowPrograms.has(original)) {
        const vertex = original.vertexSrc.replace(/^#define SHADER_NAME.*$/gm, '');
        const fragment = original.fragmentSrc.replace(/^#define SHADER_NAME.*$/gm, '')
            .replace(/precision\s+(?:lowp|mediump|highp)\s+float\s*;/, 'precision highp float;');
        galleryGlowPrograms.set(original, PIXI.Program.from(vertex, fragment));
    }
    filter.program = galleryGlowPrograms.get(original);
    return filter;
}

class Sprite_GalleryCategory extends Sprite {
    constructor(rect, data, owner) {
        super();
        this._rect = rect;
        this._data = data;
        this._owner = owner;
        this._style = galleryResolveCardStyle(data);
        this.position.set(rect.x + rect.width / 2, rect.y + rect.height / 2);
        const { width, height } = rect;
        this._radius = GALLERY_LAYOUT.cards.cornerRadius * width / GALLERY_LAYOUT.cards.referenceWidth;
        this._hasExplicitCover = data.entry ? !!data.entry.cover : !data.direct && !!data.cover;
        this._art = new Sprite();
        this._art.anchor.set(0.5);
        this.addChild(this._art);
        this._locked = !!data.entry && GalleryModel.locked(data.entry);
        const cover = data.entry ? galleryEntryCover(data.entry, true) :
            data.direct ? GalleryModel.entries(owner._category).filter(e => !GalleryModel.locked(e)).map(galleryEntryCover).find(Boolean) : GalleryModel.categoryCover(data.key);
        this._trimCover = !this._hasExplicitCover;
        if (cover) {
            this._pictureHandle = galleryAcquirePicture(owner, cover);
            this._sourceBitmap = this._pictureHandle.bitmap;
            this._sourceBitmap.addLoadListener(() => {
                if (!this._disposed) this.fitArt();
            });
        }
        if (!this._art.bitmap) this.refreshFinish();
        // 文字图层按实际行数向上扩展，底部位置固定；暗色光晕仍只作用于字形。
        const bitmap = galleryBitmap(width, 120);
        // 金橙底上用轻微深色文字轮廓，保证浅色封面上的分类名仍清晰。
        bitmap.outlineColor = 'rgba(65,35,15,0.65)';
        bitmap.outlineWidth = 2;
        bitmap.fontSize = Math.min(28, width * 0.115);
        const raw = data.entry ? (this._locked ? '?????' : owner.drill_SGaA_stripQuotes(owner.drill_SGaA_getExpandText_top(data.entry))) :
            data.direct ? galleryLabels().direct : DrillUp.drill_SGaA_localizeCategory(data.key);
        const title = owner.plainText(raw);
        const starConfig = GALLERY_LAYOUT.cards.stars;
        const starCount = this._locked ? 0 : this._style.starCount;
        const starSize = Math.min(starConfig.maxSize, width * starConfig.widthRatio);
        // 封锁只隐藏星星，标题仍保留相同留白，避免问号下沉。
        const starSpace = this._style.starCount ? starSize + starConfig.titleGap : 0;
        const { lines, lineHeight, textHeight, titleY } = galleryCardTitleLayout(bitmap, title, width, height, !!data.entry, starSpace);
        if (bitmap.height !== textHeight) bitmap.resize(Math.ceil(width), textHeight);
        this._label = new Sprite(bitmap);
        this._label.anchor.set(0.5);
        this._label.y = (height - textHeight) / 2;
        this.addChild(this._label);
        lines.forEach((line, i) => bitmap.drawText(line, 12, titleY + i * lineHeight, width - 24, lineHeight + 4, 'center'));
        if (!data.entry) {
            const count = GalleryModel.completion(data.direct ? owner._category : data.key);
            bitmap.fontSize = 19;
            bitmap.textColor = '#fff1d1';
            bitmap.drawText(`${count.unlocked} / ${count.total}`, 12, textHeight - 40, width - 24, 28, 'center');
        }
        this._textGlow = PIXI.filters.GlowFilter ? new PIXI.filters.GlowFilter(GALLERY_LAYOUT.cards.textGlow) : null;
        if (this._textGlow) this._label.filters = [this._textGlow];
        // 与文字同处装饰层上方；共享原始星星位图，仅缩放精灵，不缩小或改写素材。
        this._stars = [];
        if (starCount) {
            const starBitmap = ImageManager.load_MenuGallery(starConfig.image);
            starBitmap.smooth = true;
            starBitmap.addLoadListener(() => {
                if (this._disposed || !starBitmap.width || !starBitmap.height) return;
                const bounds = galleryCoverBounds(starBitmap);
                const scale = starSize / Math.max(bounds.width, bounds.height);
                const step = bounds.width * scale + starConfig.gap;
                const bottom = data.entry ? 14 : 48;
                for (let i = 0; i < starCount; i++) {
                    const star = new Sprite(starBitmap);
                    // 按主体中心定位，完整纹理保持不裁切，保留四周的外发光。
                    star.anchor.set((bounds.x + bounds.width / 2) / starBitmap.width,
                        (bounds.y + bounds.height / 2) / starBitmap.height);
                    star.scale.set(scale);
                    star.position.set((i - (starCount - 1) / 2) * step, height / 2 - bottom - starSize / 2);
                    this.addChild(star);
                    this._stars.push(star);
                }
            });
        }
        // 沿卡牌合成后的透明轮廓发光，专用圆角封面保留其圆角轮廓。
        this._glow = gallerySelectionGlow({ ...GALLERY_LAYOUT.cards.glow,
            color: this._locked ? GALLERY_LAYOUT.cards.locked.glowColor : this._style.glowColor });
    }
    fitArt() {
        this.refreshFinish();
    }
    refreshFinish() {
        if (this._disposed) return;
        const { width, height } = this._rect, source = this._sourceBitmap;
        const ready = source?.isReady() && source.width > 0 && source.height > 0;
        const bounds = ready ? (this._trimCover ? galleryCoverBounds(source) :
            { x: 0, y: 0, width: source.width, height: source.height }) : null;
        const pixels = galleryCardRaster(this._rect, bounds, this._hasExplicitCover,
            galleryCardDisplayScale(this._owner._ui?.scale.x || 1));
        const baked = galleryBitmap(pixels.width, pixels.height);
        const context = baked.context;
        context.save();
        context.scale(baked.width / width, baked.height / height);
        if (!this._hasExplicitCover) {
            if (this._locked) baked.fillRect(0, 0, width, height, '#0b0b0b');
            else if (this._data.entry?.video) baked.fillRect(0, 0, width, height, GALLERY_LAYOUT.color.panel);
            else baked.gradientFillRect(0, 0, width, height, '#414450', '#181b22', true);
        }
        if (ready) {
            const crop = galleryCardCrop(this._data, bounds, width, height);
            context.drawImage(source.canvas, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);
            if (this._locked) galleryDrawLockedCard(context, source, crop, width, height);
        }
        // 在同一画布内合成装饰，保持封面 alpha；不再对渐变边界单独缩放/采样。
        // 专用封面未就绪时保持透明，不能显露矩形占位或装饰。
        if (ready || !this._hasExplicitCover) {
            context.globalCompositeOperation = 'source-atop';
            if (!this._locked) galleryDrawCardFinish(baked, width, height, `${this._data.key}|${!!this._data.direct}`, this._style);
            context.globalCompositeOperation = 'destination-in';
            context.fillStyle = '#ffffff';
            galleryRoundPath(context, width, height, this._radius);
            context.fill();
        }
        context.restore();
        baked.baseTexture.update();
        const previous = this._art.bitmap;
        this._art.bitmap = baked;
        this._art.scale.set(width / baked.width, height / baked.height);
        previous?.destroy();
        this.clearGlowCache();
        if (this._focused) this.setFocused(true);
    }
    clearGlowCache() {
        if (!this._glowSprite) return;
        this.removeChild(this._glowSprite);
        // 贴图可能由当前页其他同色卡牌共享，最后一个引用释放时才销毁。
        this._glowSprite.destroy({ texture: false, baseTexture: false });
        this._glowSprite = null;
        const entry = this._glowCacheEntry;
        this._glowCacheEntry = null;
        if (entry && --entry.references === 0) {
            entry.cache.delete(entry.key);
            entry.texture.destroy(true);
        }
    }
    createGlowCache() {
        if (this._glowSprite || !this._glow || !this._art.texture?.valid) return;
        if (this._sourceBitmap && !this._sourceBitmap.isReady()) return;
        const { width, height } = this._rect, padding = this._glow.padding;
        const cache = this._owner._cardGlowCache ||= new Map();
        // 自动裁剪卡牌先绘制不透明底色，alpha 都是同一种圆角轮廓。
        // 专用封面可能含镂空，须按独立合成纹理区分，不能只凭颜色合并。
        const shape = this._hasExplicitCover ? this._art.texture.baseTexture.uid : 'rounded';
        const key = JSON.stringify([shape, width, height, this._radius, this._art.texture.width, this._art.texture.height,
            this._glow.program.id, padding, this._glow.color, this._glow.outerStrength, this._glow.innerStrength]);
        let entry = cache.get(key);
        if (!entry) {
            const source = new PIXI.Sprite(this._art.texture);
            source.width = width;
            source.height = height;
            const knockout = this._glow.knockout;
            let texture;
            try {
                this._glow.knockout = true;
                source.filters = [this._glow];
                // 当前工程 PIXI 6 的参数为 scaleMode / resolution / region。
                // 仅烘焙柔和光晕，封面、文字和星星仍以原有分辨率单独绘制。
                texture = Graphics._app.renderer.generateTexture(source, PIXI.SCALE_MODES.LINEAR, 1,
                    new PIXI.Rectangle(-padding, -padding, Math.ceil(width + padding * 2), Math.ceil(height + padding * 2)));
            } finally {
                source.filters = null;
                source.destroy({ texture: false, baseTexture: false });
                this._glow.knockout = knockout;
            }
            entry = { key, cache, texture, references: 0 };
            cache.set(key, entry);
        }
        entry.references++;
        this._glowCacheEntry = entry;
        this._glowSprite = new PIXI.Sprite(entry.texture);
        this._glowSprite.position.set(-width / 2 - padding, -height / 2 - padding);
        this.addChildAt(this._glowSprite, 0);
    }
    setFocused(focused) {
        this._focused = focused;
        if (Utils.isMobileDevice()) {
            this.filters = null;
            if (focused) this.createGlowCache();
            if (this._glowSprite) this._glowSprite.visible = focused;
        } else this.filters = focused && this._glow ? [this._glow] : null;
    }
    update() {
        super.update();
        const target = this._focused ? GALLERY_LAYOUT.cards.hoverScale : 1;
        const scale = this.scale.x + (target - this.scale.x) * GALLERY_LAYOUT.cards.easing;
        this.scale.set(scale);
    }
    contains(point) {
        const r = this._rect;
        return point.x >= r.x && point.x < r.x + r.width && point.y >= r.y && point.y < r.y + r.height;
    }
    dispose() {
        this._disposed = true;
        this.clearGlowCache();
        this._label.bitmap.destroy();
        this._art.bitmap?.destroy(); // 只释放卡牌烘焙图；ImageManager 原图不能随卡片销毁。
        this._art.bitmap = null;
        this._sourceBitmap = null;
        this._pictureHandle?.release();
        this._pictureHandle = null;
        this._stars = []; // 子精灵随卡牌销毁，共享的 ImageManager 星星位图继续缓存。
        this.filters = null;
        this._glow?.destroy();
        this._glow = null;
        this._label.filters = null;
        this._textGlow?.destroy();
        this._textGlow = null;
        this.destroy({ children: true, texture: false, baseTexture: false });
    }
}

// MoviePicture 的 bitmap.baseTexture 实际是 PIXI.Texture，MZ Sprite 却要求 BaseTexture。
// 画廊视频独立处理绑定，不修改 MoviePicture 或引擎的全局 Sprite 行为。
class Sprite_GalleryVideo extends Sprite {
    _refresh() {
        const bitmap = this.bitmap;
        if (!bitmap?.isVideo?.()) return super._refresh();
        const source = bitmap.baseTexture;
        const base = source?.castToBaseTexture ? source.castToBaseTexture() : source;
        if (!bitmap.isLoaded?.() || !base?.valid || base.destroyed ||
            base.width < bitmap.width || base.height < bitmap.height) return;
        this._frame.x = this._frame.y = 0;
        this._frame.width = bitmap.width;
        this._frame.height = bitmap.height;
        this.pivot.set(0, 0);
        this.texture.baseTexture = base;
        this.texture.frame = new Rectangle(0, 0, bitmap.width, bitmap.height);
        this.texture._updateID++;
    }
}

class Drill_SGaA_SelectWindow extends Window_Selectable {
    initialize(rect, owner) {
        this._owner = owner;
        this._entries = [];
        super.initialize(rect);
        this.opacity = 0;
        this._canRepeat = false;
    }
    maxItems() { return this._entries.length; }
    maxCols() { return 1; }
    itemHeight() { return GALLERY_LAYOUT.list.itemHeight; }
    resetFontSettings() { super.resetFontSettings(); this.contents.fontSize = GALLERY_LAYOUT.list.fontSize; }
    drawItem(index) {
        const entry = this._entries[index];
        if (!entry) return;
        const r = this.itemLineRect(index);
        this.resetFontSettings();
        this.changePaintOpacity(!GalleryModel.locked(entry));
        const name = GalleryModel.locked(entry) ? DrillUp.g_SGaA_locked_name :
            this._owner.drill_SGaA_stripQuotes(this._owner.drill_SGaA_getExpandText_top(entry));
        this.drawTextEx(name, r.x + 12, r.y, r.width - 28);
        this.changePaintOpacity(true);
    }
    setEntries(entries) { this._entries = entries; this.refresh(); this.scrollTo(0, 0); }
    // 统一由场景处理缩放坐标、单击确认及拖动；键盘仍使用 MZ 原生处理。
    processTouch() {}
    processWheelScroll() {}
    isWheelScrollEnabled() { return false; }
    isTouchScrollEnabled() { return false; }
    drill_MCu_cursorEnabled() { return true; }
    drill_MCu_cursorStyleId() { return 2; }
    drill_MCB_glimmerRectVisible() { return false; }
    drill_MCB_borderEnabled() { return true; }
    drill_MCB_borderStyleId() { return 1; }
    drill_MSB_scrollBarEnabled() { return true; }
    drill_MSB_scrollBarStyleId() { return 4; }
}

// 保留项目窗口字符扩展。仅在本窗口增加自动折行和长文本缓慢滚动。
class Drill_SGaA_DescWindow extends Window_Base {
    initialize(rect) {
        this._textHeight = 0;
        super.initialize(rect);
        this.opacity = 0;
        this._scrollMax = 0;
        this._wait = 150;
        this._direction = 1;
    }
    resetFontSettings() { super.resetFontSettings(); this.contents.fontSize = GALLERY_LAYOUT.description.fontSize; }
    contentsHeight() { return Math.max(this.innerHeight, this._textHeight || 0); }
    createTextState(text, x, y, width) {
        const state = super.createTextState(text, x, y, width);
        state._galleryWrap = !this.drill_COWA_isCalculating?.();
        state._wordEnd = 0;
        // 每个 textState 单独持有行索引，Drill 内部嵌套量宽不会改动本次排版。
        state._galleryTextPass = state._galleryWrap ? this._galleryTextPass : null;
        state._galleryLine = 0;
        if (state._galleryTextPass) state.x = state.startX = this.galleryLineStart(state);
        return state;
    }
    galleryLineStart(state) {
        const pass = state._galleryTextPass;
        if (pass.measuring) return 0;
        const width = pass.widths[state._galleryLine] || 0;
        return (this.innerWidth + (state.rtl ? width : -width)) / 2;
    }
    processNewLine(state) {
        const pass = state._galleryTextPass;
        if (pass) {
            if (pass.measuring) pass.widths.push(Math.abs(state.x - state.startX));
            state._galleryLine++;
            state.startX = this.galleryLineStart(state);
        }
        // 原生换行与自动折行共用此处；只改变光标起点，不推进字符索引。
        super.processNewLine(state);
    }
    processAllText(state) {
        super.processAllText(state);
        if (state._galleryTextPass?.measuring) {
            state._galleryTextPass.widths.push(Math.abs(state.x - state.startX));
        }
    }
    wrapBefore(state, width) {
        const used = Math.abs(state.x - state.startX) + this.textWidth(state.buffer || '');
        if (state._galleryWrap && used > 0 && used + width > this.innerWidth) {
            this.flushTextState(state);
            this.processNewLine(state);
        }
    }
    processCharacter(state) {
        if (state._galleryWrap && state.index >= state._wordEnd) {
            const rest = state.text.slice(state.index);
            const char = String.fromCodePoint(rest.codePointAt(0));
            if (char.charCodeAt(0) >= 32) {
                const word = /^[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/.exec(rest)?.[0] || char;
                const token = this.textWidth(word) <= this.innerWidth ? word : char;
                this.wrapBefore(state, this.textWidth(token));
                state._wordEnd = state.index + token.length;
            }
        }
        super.processCharacter(state);
    }
    processDrawIcon(index, state) { this.wrapBefore(state, ImageManager.standardIconWidth + 4); super.processDrawIcon(index, state); }
    setText(text) {
        this.origin.y = 0;
        this._wait = 150;
        this._direction = 1;
        this._drill_DFF_activeFont = null;
        const widths = [];
        try {
            // 完整走两次相同的转义/折行流程，字号、图标与每一条可视行都参与居中。
            this._galleryTextPass = { widths, measuring: true };
            this._textHeight = Math.ceil(this.textSizeEx(text).height);
            this.createContents();
            this._drill_DFF_activeFont = null;
            this._galleryTextPass = { widths, measuring: false };
            this.drawTextEx(text, 0, 0, this.innerWidth);
        } finally {
            this._galleryTextPass = null;
        }
        this._scrollMax = Math.max(0, this._textHeight - this.innerHeight);
    }
    update() {
        super.update();
        if (!this.visible || !this._scrollMax) return;
        if (this._wait > 0) { this._wait--; return; }
        this.origin.y = galleryClamp(this.origin.y + this._direction * 0.5, 0, this._scrollMax);
        if (this.origin.y === 0 || this.origin.y === this._scrollMax) { this._direction *= -1; this._wait = 150; }
    }
}

// 放大鉴赏说明也走窗口字符绘制链，保留物品图标、颜色和 csave/cload。
class Drill_SGaA_ViewerDescWindow extends Drill_SGaA_DescWindow {
    updatePadding() { this.padding = 0; }
    lineHeight() { return 34; }
    resetFontSettings() {
        super.resetFontSettings();
        this.contents.fontSize = 26;
        this.contents.textColor = GALLERY_LAYOUT.color.text;
    }
    setText(text) {
        super.setText(text);
        this.height = this._textHeight;
        this._scrollMax = 0;
    }
}

class Scene_Drill_SGaA extends Scene_MenuBase {
    create() {
        super.create();
        GalleryModel.rebuild();
        window.$gameSystem?.drill_SGaA_checkSysData?.();
        gallerySettleUnlockConditions();
        window.canvasSmooth?.(true);
        this._disposed = false;
        this._mode = 'cards';
        this._history = [];
        this._memory = new Map();
        this._cards = [];
        this._page = 0;
        this._focus = 0;
        this._pointerLast = { x: TouchInput.x, y: TouchInput.y };
        this._languageTables = [window.itemsDescription, window.mapCommonEventDialogue, window.ConfigManager?.language];
        this._ownedBitmaps = [];
        this._ui = new Sprite();
        const scale = Math.min(Graphics.boxWidth / GALLERY_LAYOUT.width, Graphics.boxHeight / GALLERY_LAYOUT.height);
        this._ui.scale.set(scale);
        this._ui.position.set((Graphics.width - GALLERY_LAYOUT.width * scale) / 2, (Graphics.height - GALLERY_LAYOUT.height * scale) / 2);
        this.addChild(this._ui);
        // super.create 已创建模糊的地图快照；项目 Drill_MenuBackground 已加 0.8 黑遮罩。
        // 独立使用且未启用菜单背景插件时才补同样的遮罩，避免重复压暗。
        if (!Imported.Drill_MenuBackground) {
            this._shade = new PIXI.Graphics();
            this._shade.beginFill(0x000000, 0.8).drawRect(0, 0, 1920, 1080).endFill();
            this._ui.addChild(this._shade);
        }
        this._chrome = this.makeSprite(1920, 1080);
        this._ui.addChild(this._chrome);
        this._cardLayer = new Sprite();
        this._ui.addChild(this._cardLayer);
        this._detail = new Sprite();
        this._ui.addChild(this._detail);
        this._detailDecor = this.makeSprite(1920, 1080);
        this._detail.addChild(this._detailDecor);
        this._sprite_thumbnail = new Sprite();
        this._detail.addChild(this._sprite_thumbnail);
        this._sprite_videoThumb = new Sprite_GalleryVideo();
        this._sprite_videoThumb.visible = false;
        this._detail.addChild(this._sprite_videoThumb);
        const l = GALLERY_LAYOUT.list, d = GALLERY_LAYOUT.description;
        this._window_select = new Drill_SGaA_SelectWindow(new Rectangle(l.x, l.y, l.width, l.height), this);
        this._window_select.setHandler('ok', () => this.activateEntry(this.currentEntry()));
        this._window_select.setHandler('cancel', () => this.popScene());
        this._detail.addChild(this._window_select);
        this._window_desc = new Drill_SGaA_DescWindow(new Rectangle(d.x, d.y, d.width, d.height));
        this._detail.addChild(this._window_desc);
        this._sprite_listRecallButton = new Sprite(ImageManager.load_MenuGallery(DrillUp.g_SGaA_recallBtn_src));
        this._sprite_listRecallButton.anchor.set(0.5);
        this._sprite_listRecallButton.visible = false;
        this._viewer = new Sprite();
        this._viewer.visible = false;
        this._ui.addChild(this._viewer);
        this._viewerText = this.makeSprite(1920, 1080);
        this._viewer.addChild(this._viewerText);
        this._sprite_imgExpand_pic = new Sprite();
        this._sprite_imgExpand_pic.anchor.set(0.5);
        this._viewer.addChild(this._sprite_imgExpand_pic);
        this._viewerDescription = new Drill_SGaA_ViewerDescWindow(new Rectangle(130, 0, 1660, 200));
        this._viewer.addChild(this._viewerDescription);
        this._variantButtons = [-1, 1].map(direction => this.makeNavigationArrow('variants', direction, this._viewer));
        this._paginationButtons = [-1, 1].map(direction => this.makeNavigationArrow('pagination', direction, this._ui));
        this._variantStatus = this.makeSprite(1760, 52);
        this._variantStatus.position.set(80, 805);
        this._variantStatus.visible = false;
        this._viewer.addChild(this._variantStatus);
        // 回想图标由旧列表和动画鉴赏共用，独立于两者的显隐容器。
        this._ui.addChild(this._sprite_listRecallButton);
        // 留给原有外部脚本的状态接口。
        this._window_imgExpand = { active: false, activate() { this.active = true; }, deactivate() { this.active = false; } };
        this.bindTouches();
        const temp = window.$gameTemp;
        const jump = temp?._drill_SGaA_jumpCategory;
        this._jumpRoot = jump != null ? String(jump) : null;
        if (temp) delete temp._drill_SGaA_jumpCategory;
        this._single = !!temp?._drill_SGaA_isSinglePictureMode;
        this.showLevel(this._jumpRoot || '');
        if (this._single) {
            const entry = GalleryModel.resolve(Number(temp._drill_SGaA_isSinglePictureIndex));
            if (entry && !GalleryModel.demoHidden(entry.category)) this.openViewer(entry); // 单图脚本按旧约定可查看隐藏/锁定图片。
            else this._single = false;
        }
    }
    createButtons() {} // 不创建 MZ 原生按钮，由 Drill_MenuBackButton 创建和更新返回贴图。
    drill_MBB_isOnTouchSprite(sprite) {
        if (this._confirmPending || this._leaving || this._handledFrame === Graphics.frameCount || !galleryTrigger()) return false;
        return super.drill_MBB_isOnTouchSprite(sprite);
    }
    makeSprite(width, height) {
        const bitmap = galleryBitmap(width, height);
        this._ownedBitmaps.push(bitmap);
        return new Sprite(bitmap);
    }
    point() {
        return { x: (TouchInput.x - this._ui.x) / this._ui.scale.x, y: (TouchInput.y - this._ui.y) / this._ui.scale.y };
    }
    plainText(text) {
        return this._window_desc.convertEscapeCharacters(String(text)).replace(/\x1b[A-Za-z]+(?:\[[^\]]*\])?/g, '').replace(/\x1b[{}]/g, '');
    }
    currentEntry() { return this._window_select._entries[this._window_select.index()]; }
    remember() {
        if (this._category == null) return;
        this._memory.set(`${this._category}|${this._direct}`, { page: this._page, focus: this._focus,
            index: this._window_select.index(), row: this._window_select.topRow() });
    }
    showLevel(category = '', direct = false) {
        this.clearViewerVariants();
        galleryReleasePicture(this._sprite_thumbnail);
        galleryReleasePicture(this._sprite_imgExpand_pic);
        this.drill_destroyVideoThumb();
        this.clearCards();
        this._category = category;
        this._direct = direct;
        if (window.$gameTemp) $gameTemp._drill_SGaA_curCategory = category || null;
        const categories = DrillUp.g_SGaA_useCategory ? GalleryModel.categories(category) : [];
        const entries = DrillUp.g_SGaA_useCategory ? GalleryModel.entries(category) :
            GalleryModel.sortEntries(GalleryModel.descendants('').filter(e => GalleryModel.visible(e)));
        this._nodes = categories.slice();
        if (!direct && categories.length && entries.length) this._nodes.unshift({ key: category, direct: true });
        this._entryCards = (direct || !categories.length) && galleryUseEntryCards(category, entries);
        if (this._entryCards) this._nodes = entries.map(entry => ({ key: entry.name, entry, focusX: entry.focusX, focusY: entry.focusY }));
        this._mode = ((!direct && categories.length) || this._entryCards) ? 'cards' : 'entries';
        this._detail.visible = this._mode === 'entries';
        this._cardLayer.visible = this._mode === 'cards';
        this._viewer.visible = false;
        this._window_imgExpand.deactivate();
        const memory = this._memory.get(`${category}|${direct}`) || {};
        this._page = galleryClamp(memory.page || 0, 0, Math.max(0, Math.ceil(this._nodes.length / this.pageSize()) - 1));
        this._focus = memory.focus || 0;
        this._window_select.setEntries(entries);
        this._window_select.select(galleryClamp(memory.index ?? window.$gameSystem?._drill_SGaA_context_index ?? 0, 0, Math.max(0, entries.length - 1)));
        this._window_select.setTopRow(memory.row || 0);
        if (this._mode === 'entries') this._window_select.activate();
        else this._window_select.deactivate();
        if (window.$gameTemp) $gameTemp._drill_SGaA_visibleDataList = this._mode === 'entries' || this._entryCards ? entries : this._nodes.map(c => ({ isCategory: true, categoryKey: c.key }));
        this._cur_index = -1;
        if (this._mode === 'cards') this.renderCards();
        else this.refreshEntry();
        this.refreshChrome();
    }
    enterCategory(key, direct = false) {
        this.remember();
        this._history.push({ category: this._category, direct: this._direct });
        this.showLevel(key, direct);
    }
    drill_SGaA_enterCategory(key) { this.enterCategory(key); }
    cardColumns() { return this._entryCards ? GALLERY_LAYOUT.entryCards.columns : GALLERY_LAYOUT.cards.columns; }
    pageSize() { return this.cardColumns() * (this._entryCards ? GALLERY_LAYOUT.entryCards.rows : GALLERY_LAYOUT.cards.rows); }
    clearCards() { this._touchSelectedCard = null; for (const card of this._cards || []) { this._cardLayer.removeChild(card); card.dispose(); } this._cards = []; }
    renderCards() {
        this.clearCards();
        const nodes = this._nodes.slice(this._page * this.pageSize(), (this._page + 1) * this.pageSize());
        const rects = galleryCardRects(nodes.length, this._entryCards, Math.ceil(this._nodes.length / this.pageSize()));
        this._focus = galleryClamp(this._focus, 0, Math.max(0, nodes.length - 1));
        this._cards = nodes.map((data, i) => {
            const card = new Sprite_GalleryCategory(rects[i], data, this);
            this._cardLayer.addChild(card);
            card.setFocused(i === this._focus);
            return card;
        });
    }
    changePage(delta) {
        const page = galleryClamp(this._page + delta, 0, Math.max(0, Math.ceil(this._nodes.length / this.pageSize()) - 1));
        if (page === this._page) return;
        this._page = page;
        this._focus = 0;
        this.renderCards();
        this.refreshChrome();
        SoundManager.playCursor();
    }
    setCardFocus(index) {
        if (index < 0 || index >= this._cards.length || index === this._focus) return;
        this._touchSelectedCard = null;
        this._focus = index;
        this._cards.forEach((card, i) => card.setFocused(i === index));
        SoundManager.playCursor();
    }
    activateCard() {
        this._touchSelectedCard = null;
        const data = this._cards[this._focus]?._data;
        if (!data) return;
        if (data.entry && (!GalleryModel.visible(data.entry) || GalleryModel.locked(data.entry))) {
            SoundManager.playBuzzer();
            return;
        }
        SoundManager.playOk();
        if (data.entry) {
            this._window_select.select(this._page * this.pageSize() + this._focus);
            this.remember();
            this.activateEntry(data.entry);
        } else this.enterCategory(data.key, !!data.direct);
    }
    makeNavigationArrow(kind, direction, parent) {
        const p = GALLERY_LAYOUT[kind];
        const height = kind === 'pagination' ? p.height : p.buttonHeight;
        const button = this.makeSprite(p.buttonWidth, height);
        const rect = galleryArrowRect(kind, direction);
        button.anchor.set(0.5);
        button.position.set(rect.x + rect.width / 2, rect.y + rect.height / 2);
        button.bitmap.fontSize = kind === 'pagination' ? p.fontSize : 64;
        button.bitmap.textColor = '#ffffff';
        if (kind === 'variants') {
            button.bitmap.outlineColor = 'rgba(0,0,0,0.85)';
            button.bitmap.outlineWidth = 6;
        }
        button.bitmap.drawText(direction < 0 ? '‹' : '›', 0, 0, p.buttonWidth, height, 'center');
        button.visible = false;
        parent.addChild(button);
        return button;
    }
    updateNavigationArrows(point) {
        const mobile = Utils.isMobileDevice();
        const pointerActive = !mobile || galleryPressed();
        for (const [kind, buttons] of [['pagination', this._paginationButtons], ['variants', this._variantButtons]]) {
            for (let i = 0; i < (buttons?.length || 0); i++) {
                const button = buttons[i];
                const active = button.visible && pointerActive && galleryInsideRect(point, galleryArrowRect(kind, i === 0 ? -1 : 1));
                // 手机沿用点击音效；鼠标只在进入热区的那一帧播放悬停音效。
                const hovered = !mobile && active;
                if (hovered && !button._galleryArrowHovered) SoundManager.playCursor();
                button._galleryArrowHovered = hovered;
                galleryAnimateArrow(button, active, GALLERY_LAYOUT[kind]);
            }
        }
    }
    refreshChrome() {
        const b = this._chrome.bitmap, labels = galleryLabels();
        b.clear();
        const paginated = this._mode === 'cards' && this._nodes.length > this.pageSize();
        for (const button of this._paginationButtons || []) {
            button.visible = paginated;
            if (!paginated) button.scale.set(1);
        }
        if (this._mode === 'viewer') return;
        const keys = this._category ? [...GalleryModel.ancestors(this._category), this._category] : [];
        const names = keys.map(key => this.plainText(DrillUp.drill_SGaA_localizeCategory(key)));
        const path = this._mode === 'entries' || this._entryCards ? (names[names.length - 1] || labels.title) : [labels.title, ...names].join('   /   ');
        b.fontSize = this._mode === 'cards' && !this._entryCards && keys.length ? 32 : 48;
        b.textColor = '#ffffff';
        if (this._mode === 'cards' && this._entryCards) {
            b.fontSize = GALLERY_LAYOUT.entryCards.titleFontSize;
            b.textColor = '#f2c84b';
            b.drawText(path, 200, 10, 1520, 64, 'center');
            galleryDrawDivider(b, 350, 100, 1220);
        } else b.drawText(path, 124, 8, this._mode === 'entries' ? 660 : 1660, 72, 'left');
        if (this._mode === 'cards' && this._nodes.length > this.pageSize()) {
            const p = GALLERY_LAYOUT.pagination;
            b.fontSize = p.fontSize;
            b.textColor = '#ffffff';
            b.drawText(`${this._page + 1} / ${Math.ceil(this._nodes.length / this.pageSize())}`, p.x + p.buttonWidth, p.y,
                p.width - p.buttonWidth * 2, p.height, 'center');
        }
    }
    previewArea() {
        const p = GALLERY_LAYOUT.preview, entry = this.currentEntry();
        const video = entry && !GalleryModel.locked(entry) && entry.video;
        return { ...p, y: p.y + (video ? p.videoOffsetY : 0) };
    }
    refreshEntry() {
        const entry = this.currentEntry();
        this._cur_index = this._window_select.index();
        if (window.$gameSystem) $gameSystem._drill_SGaA_context_index = Math.max(0, this._cur_index);
        const b = this._detailDecor.bitmap, p = GALLERY_LAYOUT.preview;
        const area = this.previewArea(), d = GALLERY_LAYOUT.description;
        const offsetY = area.y - p.y;
        // 动画上移所腾出的空间全部交给描述窗口，底边位置保持固定；切回 CG 时还原。
        this._window_desc.move(p.x + p.width / 2 - d.width / 2, d.y + offsetY, d.width, d.height - offsetY);
        b.clear();
        this.drill_destroyVideoThumb();
        galleryReleasePicture(this._sprite_thumbnail);
        this._sprite_thumbnail.visible = true;
        if (!entry) {
            this._window_desc.setText('');
            b.fontSize = 30;
            b.drawText(galleryLabels().empty, p.x, 440, p.width, 60, 'center');
            return;
        }
        const locked = GalleryModel.locked(entry);
        b.fontSize = 36;
        b.textColor = '#f2c84b';
        const name = locked ? galleryLabels().locked : this.drill_SGaA_stripQuotes(this.drill_SGaA_getExpandText_top(entry));
        const topLineY = p.y - 24;
        b.drawText(this.plainText(name), p.x, topLineY - 68, p.width, 48, 'center');
        galleryDrawDivider(b, p.x, topLineY, p.width);
        const lockPic = locked && DrillUp.g_SGaA_locked_type !== '只锁定描述内容';
        const pic = lockPic ? DrillUp.g_SGaA_locked_pic : entry.pic;
        if (pic) {
            const bitmap = gallerySetPicture(this, this._sprite_thumbnail, pic);
            bitmap.addLoadListener(() => {
                if (!this._disposed && this._sprite_thumbnail.bitmap === bitmap) galleryFit(this._sprite_thumbnail, area);
            });
        }
        const lockText = locked && DrillUp.g_SGaA_locked_type !== '只锁定缩略图';
        this._window_desc.setText(lockText ? DrillUp.g_SGaA_locked_context : this.drill_SGaA_stripQuotes(this.drill_SGaA_getExpandText_bottom(entry)));
        const desc = this._window_desc;
        galleryDrawDivider(b, p.x, desc.y + desc.padding + Math.min(desc._textHeight, desc.innerHeight) + 8, p.width);
        const video = !locked && entry.video;
        if (video) this.startGalleryVideo(entry, false);
    }
    setVideoStatus(text) {
        if (this._mode !== 'viewer') return;
        const b = this._viewerText.bitmap;
        b.clearRect(80, 470, 1760, 80);
        if (text) { b.fontSize = 26; b.textColor = '#ffffff'; b.drawText(text, 80, 470, 1760, 80, 'center'); }
    }
    startGalleryVideo(entry, viewer, path = galleryVideoPaths(entry.video)[0]) {
        this.drill_destroyVideoThumb();
        if (viewer) this._viewer.addChildAt(this._sprite_videoThumb, 0);
        else this._detail.addChild(this._sprite_videoThumb);
        if (viewer) this.setVideoStatus(galleryLabels().videoLoading);
        try {
            if (!path) throw new Error('video 需要非空字符串或字符串数组');
            if (!ImageManager.loadVideo) throw new Error('MoviePicture.loadVideo unavailable');
            const bitmap = ImageManager.loadVideo(path, true, false);
            // 保存独占资源后再操作视频，失败时也能统一释放。
            this._galleryVideoPending = true;
            this._sprite_videoThumb.bitmap = bitmap;
            if (!bitmap?._video) throw new Error('Invalid video bitmap');
            bitmap._video.muted = true;
            bitmap._video.loop = true;
            bitmap.play?.();
            this._drill_videoThumbKey = entry.name;
        } catch (error) {
            this.drill_destroyVideoThumb();
            if (viewer) this.setVideoStatus(galleryLabels().videoError);
            console.warn('[ShiroinGallery] 动画未载入', path, error);
        }
    }
    updateVideo() {
        const sprite = this._sprite_videoThumb, bitmap = sprite.bitmap;
        const viewer = this._mode === 'viewer' && this._viewerVideo;
        if ((!viewer && this._mode !== 'entries') || !bitmap) return;
        if (bitmap.isError?.()) {
            this.drill_destroyVideoThumb();
            if (viewer) this.setVideoStatus(galleryLabels().videoError);
            return;
        }
        if (bitmap.isVideo?.() && bitmap.isLoaded?.() && bitmap.width > 0 && bitmap.height > 0) {
            if (this._galleryVideoPending) {
                // canplaythrough 的 Bitmap 回调可能早于 PIXI VideoResource 初始化。
                // 只在这次加载期间等底层纹理就绪；成功后不再逐帧刷新纹理。
                const source = bitmap.baseTexture;
                const base = source?.castToBaseTexture ? source.castToBaseTexture() : source;
                if (!base?.valid || base.destroyed || base.width < bitmap.width || base.height < bitmap.height) return;
                sprite._refresh();
                if (!sprite.texture.valid || sprite.texture.frame.width !== bitmap.width ||
                    sprite.texture.frame.height !== bitmap.height) return;
                this._galleryVideoPending = false;
            }
            if (viewer && !sprite.visible) this.setVideoStatus('');
            sprite.visible = true;
            this._sprite_thumbnail.visible = false;
            galleryFit(sprite, viewer ? GALLERY_LAYOUT.videoViewer : this.previewArea());
        }
    }
    drill_updateListRecallButton() {
        const button = this._sprite_listRecallButton;
        if (!button) return;
        this._drill_SGaA_listRecallHover = false;
        const viewer = this._mode === 'viewer' && this._viewerVideo;
        const entry = viewer ? this._viewerEntry : this.currentEntry();
        const thumbnail = this._sprite_thumbnail;
        const previewReady = this._sprite_videoThumb.visible || (!viewer && thumbnail.visible && thumbnail.bitmap?.isReady());
        button.visible = (viewer || (this._mode === 'entries' && !this._single)) && !!entry && !GalleryModel.locked(entry) &&
            !!DrillUp.drill_SGaA_getRecallScriptByData(entry) && !!previewReady && !!button.bitmap?.isReady();
        if (!button.visible) { button.scale.set(1); return; }
        const width = button.bitmap.width, height = button.bitmap.height;
        const x = viewer ? this._viewerRecallButtonX : DrillUp.g_SGaA_recallBtn_x;
        const y = viewer ? GALLERY_LAYOUT.videoViewer.recallButtonY : DrillUp.g_SGaA_recallBtn_y;
        button.position.set(x + width / 2, y + height / 2);
        const point = this.point();
        const hover = point.x >= button.x - width / 2 && point.x <= button.x + width / 2 &&
            point.y >= button.y - height / 2 && point.y <= button.y + height / 2;
        this._drill_SGaA_listRecallHover = hover;
        button.scale.set(button.scale.x + ((hover ? 1.12 : 1) - button.scale.x) * 0.4);
        button.opacity = hover ? 255 : DrillUp.g_SGaA_recallBtn_normalOpacity;
        if (hover && galleryTrigger() && !this._confirmPending && (!viewer || !this._ignoreViewerPress)) {
            SoundManager.playOk();
            if (viewer) {
                this._ignoreViewerPress = true;
                this.drill_SGaA_tryStartRecall(entry);
            } else this.activateEntry(entry);
        }
    }
    drill_destroyVideoThumb() {
        this._galleryVideoPending = false;
        const sprite = this._sprite_videoThumb;
        if (!sprite) return;
        const bitmap = sprite.bitmap;
        if (bitmap) {
            // MoviePicture bitmap.destroy 会销毁视频纹理；先脱离，避免下次赋 bitmap 读取失效纹理。
            sprite.texture = new PIXI.Texture(Sprite._emptyBaseTexture, new Rectangle());
            sprite.bitmap = null;
            if (bitmap.isVideo?.()) {
                // 本项目 Bitmap_Video.destroy 会等待 canplaythrough。快速换项或加载失败
                // 可能永远等不到；此位图已独占，按 MoviePicture 自身缓存释放策略立即清理。
                const video = bitmap._video;
                const texture = bitmap._baseTexture;
                const base = texture?.castToBaseTexture ? texture.castToBaseTexture() : texture;
                if (video) {
                    video.removeEventListener('canplaythrough', bitmap._loadListener);
                    video.removeEventListener('ended', bitmap._endedListener);
                    video.removeEventListener('error', bitmap._errorListener);
                    const resource = base?.resource;
                    if (PIXI.VideoResource && resource instanceof PIXI.VideoResource) {
                        video.removeEventListener('canplay', resource._onCanPlay);
                        video.removeEventListener('canplaythrough', resource._onCanPlay);
                    }
                    video.pause();
                    video.removeAttribute('src');
                    video.load();
                }
                bitmap._video = null;
                if (bitmap._loadListeners) bitmap._loadListeners.length = 0;
                if (texture instanceof PIXI.Texture) { texture.destroy(true); bitmap._baseTexture = null; }
                Bitmap.prototype.destroy.call(bitmap);
            }
        }
        sprite.visible = false;
        this._drill_videoThumbKey = null;
    }
    activateEntry(entry) {
        if (this._confirmPending || !entry || !GalleryModel.visible(entry) || GalleryModel.locked(entry)) {
            if (!this._confirmPending) { SoundManager.playBuzzer(); if (this._mode !== 'cards') this._window_select.activate(); }
            return;
        }
        this._window_select.deactivate();
        if (entry.video) this.openViewer(entry);
        else if (DrillUp.drill_SGaA_getRecallScriptByData(entry)) this.drill_SGaA_tryStartRecall(entry);
        else this.openViewer(entry);
    }
    drill_selectOk() { this.activateEntry(this.currentEntry()); }
    async drill_SGaA_tryStartRecall(entry) {
        if (this._confirmPending || GalleryModel.locked(entry)) return;
        const script = DrillUp.drill_SGaA_getRecallScriptByData(entry);
        if (!script) return;
        this._confirmPending = true;
        this._window_select.deactivate();
        try {
            const ok = await Promise.resolve(window.confirm(DrillUp.drill_SGaA_makeRecallConfirmText(entry.name, entry.index ?? entry.key), { align: 'left' }));
            if (this._disposed || this._leaving || SceneManager._scene !== this || SceneManager.isSceneChanging()) return;
            if (ok) {
                this.drill_destroyVideoThumb();
                // RecallStage.start 会替换 $gameTemp；先清理画廊自己的状态再交接。
                if (window.$gameTemp) $gameTemp._drill_SGaA_isSinglePictureMode = false;
                this.drill_SGaA_realPopScene();
                DrillUp.drill_SGaA_runRecallScript(script);
            } else SoundManager.playCancel();
        } catch (error) { console.error('[ShiroinGallery] 回想确认失败', error); }
        finally {
            this._confirmPending = false;
            if (!this._disposed && this._mode === 'entries' && SceneManager._scene === this && !SceneManager.isSceneChanging()) this._window_select.activate();
        }
    }
    openViewer(entry) {
        this.clearViewerVariants();
        this.drill_destroyVideoThumb();
        if (this._mode !== 'viewer') this._viewerReturnMode = this._mode;
        this._viewerEntry = entry;
        this._viewerVideo = !!entry.video;
        this._mode = 'viewer';
        this._drill_SGaA_curExpandPicId = entry.index ?? entry.key;
        this._window_imgExpand.activate();
        this._window_select.deactivate();
        this._detail.visible = false;
        this._cardLayer.visible = false;
        this._viewer.visible = true;
        this._zoom = 1;
        this._pan = { x: 0, y: 0 };
        this._viewerDrag = null;
        this._ignoreViewerPress = true;
        galleryReleasePicture(this._sprite_imgExpand_pic);
        if (!this._viewerVideo) {
            const definition = galleryPictureDefinition(entry.pic);
            this.startViewerVariants(entry, definition);
        }
        this.refreshViewerText();
        this.refreshChrome();
        if (this._viewerVideo) {
            this._videoVariants = {paths: galleryVideoPaths(entry.video), index: 0};
            this.refreshVariantButtons();
            this.startGalleryVideo(entry, true, this._videoVariants.paths[0]);
        }
    }
    refreshViewerText() {
        const entry = this._viewerEntry;
        const b = this._viewerText.bitmap;
        b.clear();
        b.fontSize = 36;
        b.textColor = '#f2c84b';
        const title = this.plainText(this.drill_SGaA_stripQuotes(this.drill_SGaA_getExpandText_top(entry, true)));
        const v = GALLERY_LAYOUT.videoViewer;
        // 静态 CG 与动画共用卡牌页的顶部标题位置及分割线样式。
        b.drawText(title, 200, v.titleY, 1520, v.titleHeight, 'center');
        // drawText 超宽时会压缩到 1520；按实际绘制右缘避让，只在标题刷新时测量。
        const titleRight = 200 + 1520 / 2 + Math.min(b.measureTextWidth(title), 1520) / 2;
        this._viewerRecallButtonX = Math.max(v.recallButtonX, titleRight + v.recallButtonGap);
        galleryDrawDivider(b, 350, v.titleDividerY, 1220);
        b.fontSize = 26;
        b.textColor = GALLERY_LAYOUT.color.text;
        const description = this._viewerDescription;
        const sprite = this._sprite_imgExpand_pic;
        // 静态图按当前实际显示底边留白；加载完成、切换差分或缩放后重新排版。
        const frame = galleryViewerFrame(sprite);
        const descriptionY = this._viewerVideo ? v.descriptionY :
            (frame?.width && frame?.height ?
                sprite.y + frame.height * sprite.scale.y / 2 + GALLERY_LAYOUT.viewer.descriptionGap : null);
        this._viewerDescriptionY = descriptionY;
        description.visible = descriptionY !== null;
        if (descriptionY === null) return;
        description.y = descriptionY;
        description.setText(this.drill_SGaA_getExpandText_bottom(entry).trimEnd());
        // 静态图与动画均紧随实际显示行数，避免单行说明仍预留三行空间。
        galleryDrawDivider(b, 580, descriptionY + description._textHeight + 10, 760);
    }
    startViewerVariants(entry, definition) {
        const session = this._variantSession = {entry, definition,
            available: galleryAvailableVariants(definition, entry), records: new Map(),
            attempted: new Set(), preparedTextures: new WeakSet(), currentId: null, targetId: '', timer: null};
        this.refreshVariantButtons();
        this.loadViewerVariant(session, session.available[0], true);
    }
    clearViewerVariants() {
        this._videoVariants = null;
        const session = this._variantSession;
        this._variantSession = null;
        if (session) {
            if (session.timer !== null) clearTimeout(session.timer);
            galleryReleasePicture(this._sprite_imgExpand_pic);
            for (const record of session.records.values()) record.handle.release();
            session.records.clear();
        }
        for (const button of this._variantButtons || []) button.visible = false;
        if (this._variantStatus) this._variantStatus.visible = false;
    }
    setVariantStatus(text = '', locked = false) {
        const sprite = this._variantStatus;
        if (!sprite) return;
        sprite.visible = !!text;
        if (!text) return;
        const bitmap = sprite.bitmap;
        const lines = String(text).split('\n'), lineHeight = locked ? 60 : 52;
        const width = 1760, height = lines.length * lineHeight;
        if (bitmap.width !== width || bitmap.height !== height) bitmap.resize(width, height);
        sprite.setFrame(0, 0, width, height);
        sprite.position.set((GALLERY_LAYOUT.width - width) / 2, locked ? (GALLERY_LAYOUT.height - height) / 2 : 805);
        bitmap.clear();
        bitmap.fontSize = locked ? GALLERY_LAYOUT.variants.lockedFontSize : 26;
        bitmap.textColor = '#ffffff';
        bitmap.outlineColor = 'rgba(0,0,0,0.9)';
        bitmap.outlineWidth = 6;
        lines.forEach((line, i) => bitmap.drawText(line, 0, i * lineHeight, width, lineHeight, 'center'));
    }
    refreshVariantButtons() {
        const session = this._variantSession;
        const videos = this._videoVariants;
        const index = videos ? videos.index : session?.available.findIndex(variant => variant.id === session.targetId) ?? -1;
        const count = videos ? videos.paths.length : session?.available.length ?? 0;
        if (this._variantButtons) {
            this._variantButtons[0].visible = index > 0;
            this._variantButtons[1].visible = index >= 0 && index < count - 1;
        }
    }
    switchViewerVideo(direction) {
        const videos = this._videoVariants;
        if (!videos || this._mode !== 'viewer' || this._disposed || this._leaving || this._confirmPending) return;
        const index = videos.index + direction;
        if (!Number.isInteger(index) || index < 0 || index >= videos.paths.length || index === videos.index) return;
        videos.index = index;
        this.refreshVariantButtons();
        SoundManager.playCursor();
        this.startGalleryVideo(this._viewerEntry, true, videos.paths[index]);
    }
    switchViewerVariant(direction) {
        if (this._viewerVideo) { this.switchViewerVideo(direction); return; }
        const session = this._variantSession;
        if (!session) return;
        const previous = session.available.find(variant => variant.id === session.targetId);
        session.available = galleryAvailableVariants(session.definition, session.entry);
        const states = new Map(session.available.map(variant => [variant.id, variant.locked]));
        for (const [id, record] of session.records) {
            if (!states.has(id) || states.get(id) !== record.variant.locked) {
                if (session.currentId === id) {session.currentId = null; galleryReleasePicture(this._sprite_imgExpand_pic);}
                record.handle.release(); session.records.delete(id); session.attempted.delete(id);
            }
        }
        const order = previous?.order ?? 0;
        const candidate = direction > 0 ? session.available.find(variant => variant.order > order) :
            [...session.available].reverse().find(variant => variant.order < order);
        const target = candidate || session.available.find(variant => variant.id === session.targetId) || session.available[0];
        session.targetId = target.id;
        this.refreshVariantButtons();
        if (candidate) SoundManager.playCursor();
        this.loadViewerVariant(session, target, true);
    }
    showViewerVariant(session, record) {
        if (this._variantSession !== session || session.targetId !== record.variant.id || record.status !== 'ready') return;
        galleryShowViewerPicture(this._sprite_imgExpand_pic, record.handle);
        session.currentId = record.variant.id;
        if (record.variant.locked) {
            this._zoom = 1; this._pan = {x:0,y:0};
            this._viewerDrag = null; this._pinchDistance = 0;
        }
        this.setVariantStatus(record.variant.locked ? galleryLabels().lockedVariation : '', record.variant.locked);
        this.applyViewerTransform();
        this.trimViewerVariants(session);
    }
    loadViewerVariant(session, variant, foreground = false) {
        if (this._variantSession !== session) return;
        if (foreground) session.targetLocked = variant.locked;
        let record = session.records.get(variant.id);
        if (record?.status === 'failed' && foreground) {
            record.handle.release(); session.records.delete(variant.id); record = null;
        }
        if (record) {
            if (foreground) {
                record.handle.setPriority(100);
                if (record.status === 'ready') this.showViewerVariant(session, record);
                else this.setVariantStatus(galleryLabels().variantLoading);
            }
            this.queueVariantPreload(session);
            return;
        }
        session.attempted.add(variant.id);
        if (foreground) this.setVariantStatus(galleryLabels().variantLoading);
        try {
            const handle = galleryAcquireVariant(this, variant, foreground ? 100 : -10);
            record = {variant, handle, status: 'loading', bytes: 0};
            session.records.set(variant.id, record);
            handle.promise.then(bitmap => {
                if (this._variantSession !== session || session.records.get(variant.id) !== record) return;
                record.status = 'ready';
                // 叠层资源由缓存统计按原图去重；封锁成品计 Canvas + GPU 两份。
                record.bytes = handle.sources ? 0 : bitmap.width * bitmap.height * 8;
                this.showViewerVariant(session, record);
                this.trimViewerVariants(session);
                this.queueVariantPreload(session);
            }).catch(error => {
                if (this._variantSession !== session || session.records.get(variant.id) !== record) return;
                record.status = 'failed';
                if (session.targetId === variant.id) this.setVariantStatus(galleryLabels().variantError);
                if (error.name !== 'AbortError') console.warn('[ShiroinGallery] 差分加载失败', variant.id, error);
                this.queueVariantPreload(session);
            });
        } catch (error) {
            if (foreground) this.setVariantStatus(galleryLabels().variantError);
            console.warn('[ShiroinGallery] 差分配置错误', variant.id, error);
            this.queueVariantPreload(session);
        }
    }
    trimViewerVariants(session) {
        const config = GALLERY_LAYOUT.variants;
        const bytes = () => galleryVariantCacheBytes(session.records.values());
        for (const [id, record] of session.records) {
            if (bytes() <= config.cacheMiB * 1024 * 1024 && session.records.size <= config.maxPreloaded) break;
            if (id === session.currentId || id === session.targetId) continue;
            record.handle.release(); session.records.delete(id);
        }
    }
    queueVariantPreload(session) {
        if (this._variantSession !== session || session.timer !== null) return;
        // 每次只安排一张，退出立即取消；不在 update 中扫描或重新合成。
        session.timer = setTimeout(() => {
            session.timer = null;
            if (this._variantSession !== session || this._disposed) return;
            const records = [...session.records.values()];
            if (records.some(record => record.status === 'loading')) return;
            const config = GALLERY_LAYOUT.variants;
            // 每次预加载调度最多准备一张纹理，共享原图在会话中只准备一次。
            const renderer = Graphics.app?.renderer;
            const ready = records.find(record => record.status === 'ready' && !record.prepared);
            if (ready) {
                const sources = ready.handle.sources || [ready.handle.bitmap];
                const bitmap = sources.find(source => !session.preparedTextures.has(source));
                if (bitmap) {
                    session.preparedTextures.add(bitmap);
                    if (renderer?.texture && bitmap.baseTexture) renderer.texture.bind(bitmap.baseTexture);
                }
                ready.prepared = sources.every(source => session.preparedTextures.has(source));
                this.queueVariantPreload(session);
                return;
            }
            if (records.length >= config.maxPreloaded || galleryVariantCacheBytes(records) >= config.cacheMiB * 1024 * 1024) return;
            const next = session.available.find(variant => !session.attempted.has(variant.id));
            if (next) this.loadViewerVariant(session, next);
        }, 32);
    }
    applyViewerTransform() {
        if (this._viewerVideo) return;
        const sprite = this._sprite_imgExpand_pic, bitmap = galleryViewerFrame(sprite), r = GALLERY_LAYOUT.viewer;
        if (!bitmap?.width || !bitmap?.height) return;
        const fit = Math.min(r.width / bitmap.width, r.height / bitmap.height);
        const scale = fit * this._zoom;
        const maxX = Math.max(0, (bitmap.width * scale - r.width) / 2);
        const maxY = Math.max(0, (bitmap.height * scale - r.height) / 2);
        this._pan.x = galleryClamp(this._pan.x, -maxX, maxX);
        this._pan.y = galleryClamp(this._pan.y, -maxY, maxY);
        sprite.scale.set(scale);
        sprite.position.set(r.x + r.width / 2 + this._pan.x, r.y + r.height / 2 + this._pan.y);
        const descriptionY = sprite.y + bitmap.height * scale / 2 + r.descriptionGap;
        if (this._viewerDescriptionY !== descriptionY) this.refreshViewerText();
    }
    isViewerVariantLocked() {
        const session = this._variantSession;
        return !!(session && (session.targetLocked || session.records.get(session.currentId)?.variant.locked));
    }
    zoomViewer(factor) {
        if (this._viewerVideo || this.isViewerVariantLocked()) return;
        this._zoom = galleryClamp(this._zoom * factor, 1, GALLERY_LAYOUT.viewer.maxZoom);
        this.applyViewerTransform();
    }
    drill_expandHoming() { this._zoom = 1; this._pan = { x: 0, y: 0 }; this.applyViewerTransform(); }
    closeViewer() {
        this.clearViewerVariants();
        this.drill_destroyVideoThumb();
        this._viewerVideo = false;
        this._drill_SGaA_curExpandPicId = -1;
        this._window_imgExpand.deactivate();
        galleryReleasePicture(this._sprite_imgExpand_pic);
        if (this._single) { this.drill_SGaA_realPopScene(); return; }
        this._mode = this._viewerReturnMode || 'entries';
        this._viewer.visible = false;
        this._detail.visible = this._mode === 'entries';
        this._cardLayer.visible = this._mode === 'cards';
        if (this._mode === 'entries') { this._window_select.activate(); this.refreshEntry(); }
        this.refreshChrome();
    }
    drill_expandCancel() { this.closeViewer(); }
    drill_SGaA_getCurExpandPicId() { return this._mode === 'viewer' ? this._drill_SGaA_curExpandPicId : -1; }
    drill_SGaA_stripQuotes(text) { return galleryText(text).replace(/["“”「」]/g, ''); }
    drill_SGaA_getExpandText_top(id, appreciation = false) {
        const entry = GalleryModel.resolve(id);
        const description = window.itemsDescription?.[entry?.name];
        // 卡牌/列表沿用 name；静态 CG 和动画鉴赏标题优先使用回想事件名称。
        const recallTitle = appreciation ? galleryText(description?.recallEventName) : '';
        if (recallTitle.trim()) return recallTitle;
        return galleryText(description?.name) || (entry ? DrillUp.drill_SGaA_localizeOption(entry.name, id) : '');
    }
    drill_SGaA_getExpandText_bottom(id) {
        const entry = GalleryModel.resolve(id);
        return galleryText(window.itemsDescription?.[entry?.name]?.subtitle ?? entry?.context);
    }
    popScene() {
        this.drill_SGaA_resetBackButtonLatch();
        if (this._confirmPending || this._leaving || this._handledFrame === Graphics.frameCount) return;
        if (this._mode === 'viewer') this.closeViewer();
        else if (this._history.length) {
            this.remember();
            const previous = this._history.pop();
            this.showLevel(previous.category, previous.direct);
        } else this.drill_SGaA_realPopScene();
        this._handledFrame = Graphics.frameCount;
    }
    drill_selectCancel() { this.popScene(); }
    drill_SGaA_leaveCategory() { this.popScene(); }
    drill_SGaA_realPopScene() {
        this._leaving = true;
        this.drill_destroyVideoThumb();
        if (window.$gameTemp) $gameTemp._drill_SGaA_isSinglePictureMode = false;
        super.popScene();
    }
    drill_SGaA_resetBackButtonLatch() {
        for (const [index, sprite] of (this._drill_MBB_sprites_pushdown || []).entries()) {
            if (!sprite) continue;
            const wasPressed = sprite._needPopScene;
            sprite._needPopScene = false;
            sprite.visible = false;
            if (wasPressed) {
                const normal = this._drill_MBB_sprites?.[index], highlight = this._drill_MBB_sprites_highlight?.[index];
                if (normal) normal.visible = true;
                if (highlight) { highlight.visible = false; highlight._touched = false; }
            }
        }
    }
    update() {
        if (this._mode === 'viewer' && this._touches?.length >= 2) {
            TouchInput._cancelled = false;
            if (TouchInput._currentState) TouchInput._currentState.cancelled = false;
        }
        super.update();
        if (!this._ui || this._disposed || this._leaving || this._confirmPending || SceneManager.isSceneChanging() || this._handledFrame === Graphics.frameCount) return;
        const tables = [window.itemsDescription, window.mapCommonEventDialogue, window.ConfigManager?.language];
        if (tables.some((table, index) => table !== this._languageTables[index])) {
            this._languageTables = tables;
            this._window_select.refresh();
            if (this._mode === 'cards') this.renderCards();
            else if (this._mode === 'entries') this.refreshEntry();
            else {
                const zoom = this._zoom, pan = this._pan;
                this.openViewer(this._viewerEntry);
                this._zoom = zoom;
                this._pan = pan;
                this.applyViewerTransform();
            }
            this.refreshChrome();
        }
        if (this._twoFingerTap) {
            this._twoFingerTap = false;
            if (this._mode === 'viewer') { SoundManager.playCancel(); this.popScene(); return; }
        }
        const point = this.point();
        this.updateNavigationArrows(point);
        const moved = TouchInput.x !== this._pointerLast.x || TouchInput.y !== this._pointerLast.y;
        this._pointerLast = { x: TouchInput.x, y: TouchInput.y };
        if (((this._mode !== 'entries' && Input.isTriggered('cancel')) || galleryCancelled()) && !(this._mode === 'viewer' && this._touches?.length >= 2)) {
            SoundManager.playCancel(); this.popScene(); return;
        }
        if (this._mode === 'cards') this.updateCards(point, moved);
        else if (this._mode === 'entries') this.updateEntries(point, moved);
        else this.updateViewer(point);
        this.updateVideo();
        if (!this._confirmPending) this.drill_updateListRecallButton();
    }
    updateCards(point, moved) {
        const triggered = galleryTrigger();
        const touchMode = Utils.isMobileDevice();
        // 放大的卡牌可能伸入底部热区，按钮命中必须先于卡牌确认。
        if (triggered && this._nodes.length > this.pageSize()) {
            const direction = galleryPageDirection(point);
            if (direction) { this.changePage(direction); return; }
        }
        // 手机触点移动不等于鼠标悬停；默认焦点也不算已经点选过。
        if ((!touchMode && moved) || triggered) {
            const hover = this._cards.findIndex(card => card.contains(point));
            if (hover >= 0) {
                const card = this._cards[hover];
                const confirmed = this._touchSelectedCard === card && this._focus === hover;
                this.setCardFocus(hover);
                if (triggered) {
                    // 锁定卡牌仍在点击时立即报错；普通卡牌再次点同一张才进入。
                    if (!touchMode || confirmed || (card._data.entry && GalleryModel.locked(card._data.entry))) this.activateCard();
                    else this._touchSelectedCard = card;
                    return;
                }
            } else if (triggered) this._touchSelectedCard = null;
        }
        const columns = this.cardColumns();
        if (Input.isRepeated('left')) this.setCardFocus(this._focus - 1);
        if (Input.isRepeated('right')) this.setCardFocus(this._focus + 1);
        if (Input.isRepeated('up')) this.setCardFocus(this._focus - columns);
        if (Input.isRepeated('down')) this.setCardFocus(this._focus + columns);
        if (Input.isTriggered('ok')) { this.activateCard(); return; }
        if (Input.isTriggered('pageup') || TouchInput.wheelY < -30) this.changePage(-1);
        if (Input.isTriggered('pagedown') || TouchInput.wheelY > 30) this.changePage(1);
    }
    updateEntries(point, moved) {
        const w = this._window_select, l = GALLERY_LAYOUT.list;
        if (w._drill_MSB_isDraging || w.drill_MSB_isOnRange?.()) { this._listPress = null; return; }
        const inList = point.x >= l.x && point.x < l.x + l.width && point.y >= l.y && point.y < l.y + l.height;
        if (inList && Math.abs(TouchInput.wheelY) >= 20) w.smoothScrollBy(0, Math.sign(TouchInput.wheelY) * w.itemHeight());
        if (inList && galleryTrigger()) this._listPress = { x: point.x, y: point.y, lastY: point.y, moved: false };
        if (this._listPress && galleryPressed()) {
            const press = this._listPress;
            if (Math.abs(point.y - press.y) > 12) press.moved = true;
            if (press.moved) w.scrollBy(0, press.lastY - point.y);
            press.lastY = point.y;
        }
        if (this._listPress && !galleryPressed()) {
            const press = this._listPress;
            this._listPress = null;
            if (!press.moved && inList) {
                const index = w.hitTest(point.x - l.x, point.y - l.y);
                if (index >= 0) { w.select(index); this.refreshEntry(); SoundManager.playOk(); this.activateEntry(this.currentEntry()); return; }
            }
        } else if (moved && inList && !galleryPressed()) {
            const index = w.hitTest(point.x - l.x, point.y - l.y);
            if (index >= 0 && index !== w.index()) { w.select(index); SoundManager.playCursor(); }
        }
        if (this._cur_index !== w.index()) this.refreshEntry();
        const p = this.previewArea();
        if (galleryTrigger() && point.x >= p.x && point.x < p.x + p.width && point.y >= p.y && point.y < p.y + p.height) {
            SoundManager.playOk(); this.activateEntry(this.currentEntry());
        }
    }
    updateViewer(point) {
        if (this._viewerVideo) {
            if (!galleryPressed()) this._ignoreViewerPress = false;
            if (this._ignoreViewerPress || this._touches?.length >= 2) return;
            // 箭头先于就绪检查和画面回想点击，加载中/失败时仍可换片。
            if (galleryTrigger()) {
                const direction = galleryVariantDirection(point, this._variantButtons);
                if (direction) {
                    this._ignoreViewerPress = true;
                    this.switchViewerVariant(direction);
                    return;
                }
            }
            const sprite = this._sprite_videoThumb, bitmap = sprite.bitmap;
            if (!sprite.visible || !bitmap?.width || !bitmap?.height) return;
            const halfWidth = bitmap.width * sprite.scale.x / 2, halfHeight = bitmap.height * sprite.scale.y / 2;
            const onVideo = point.x >= sprite.x - halfWidth && point.x <= sprite.x + halfWidth &&
                point.y >= sprite.y - halfHeight && point.y <= sprite.y + halfHeight;
            if ((onVideo && galleryTrigger()) || Input.isTriggered('ok')) {
                this._ignoreViewerPress = true;
                if (DrillUp.drill_SGaA_getRecallScriptByData(this._viewerEntry)) {
                    SoundManager.playOk(); this.drill_SGaA_tryStartRecall(this._viewerEntry);
                }
            }
            return;
        }
        if (this.isViewerVariantLocked()) {
            this._pinchDistance = 0;
            this._viewerDrag = null;
            if (!galleryPressed()) this._ignoreViewerPress = false;
            if (this._touches?.length >= 2) {this._ignoreViewerPress = true; return;}
            if (!this._ignoreViewerPress && galleryTrigger()) {
                const direction = galleryVariantDirection(point, this._variantButtons);
                if (direction) {this._ignoreViewerPress = true; this.switchViewerVariant(direction);}
            }
            return;
        }
        if (Input.isTriggered('ok')) this.drill_expandHoming();
        if (Math.abs(TouchInput.wheelY) >= 10) this.zoomViewer(TouchInput.wheelY < 0 ? 1.12 : 1 / 1.12);
        if (this._touches?.length >= 2) {
            const [a, b] = this._touches, distance = Math.hypot(a.x - b.x, a.y - b.y);
            if (this._pinchDistance > 0) this.zoomViewer(distance / this._pinchDistance);
            this._pinchDistance = distance;
            this._viewerDrag = null;
            this._ignoreViewerPress = true;
            return;
        }
        this._pinchDistance = 0;
        if (!galleryPressed()) { this._ignoreViewerPress = false; this._viewerDrag = null; }
        if (this._ignoreViewerPress) return;
        if (galleryTrigger()) {
            const direction = galleryVariantDirection(point, this._variantButtons);
            if (direction) {
                this._viewerDrag = null;
                this._ignoreViewerPress = true;
                this.switchViewerVariant(direction);
                return;
            }
            this._viewerDrag = point;
        }
        if (galleryPressed() && this._viewerDrag) {
            this._pan.x += point.x - this._viewerDrag.x;
            this._pan.y += point.y - this._viewerDrag.y;
            this._viewerDrag = point;
            this.applyViewerTransform();
        }
        const speed = 12;
        if (Input.isPressed('left')) this._pan.x += speed;
        if (Input.isPressed('right')) this._pan.x -= speed;
        if (Input.isPressed('up')) this._pan.y += speed;
        if (Input.isPressed('down')) this._pan.y -= speed;
        this.applyViewerTransform();
    }
    bindTouches() {
        this._touches = [];
        this._touchListener = event => {
            const touches = Array.from(event.touches, t => ({ x: t.clientX, y: t.clientY }));
            if (!this._touches.length && touches.length) this._touchSession = { start: performance.now(), max: 0, moved: false, viewer: this._mode === 'viewer' };
            const session = this._touchSession;
            if (session) {
                session.max = Math.max(session.max, touches.length);
                if (touches.length >= 2) {
                    const [a, b] = touches, distance = Math.hypot(a.x - b.x, a.y - b.y);
                    const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
                    if (session.distance == null) { session.distance = distance; session.center = center; }
                    if (Math.abs(session.distance - distance) > 18 || Math.hypot(center.x - session.center.x, center.y - session.center.y) > 18) session.moved = true;
                }
                if (!touches.length) {
                    this._twoFingerTap = session.viewer && session.max >= 2 && !session.moved && performance.now() - session.start < 500;
                    this._touchSession = null;
                }
                if (event.type === 'touchcancel') { this._twoFingerTap = false; this._touchSession = null; }
            }
            this._touches = touches;
        };
        for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) document.addEventListener(type, this._touchListener, { passive: true });
    }
    terminate() {
        this._disposed = true;
        this.clearViewerVariants();
        galleryReleasePicture(this._sprite_thumbnail);
        galleryReleasePicture(this._sprite_imgExpand_pic);
        this.drill_destroyVideoThumb();
        for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) document.removeEventListener(type, this._touchListener);
        this.clearCards();
        // 回想交接后可能已有新的 $gameTemp；退出清理由 realPopScene 在交接前执行。
        window.canvasSmooth?.(!!window.$dataMap && String($dataMap.note || '').includes('<宅>'));
        super.terminate();
    }
    destroy(options) {
        for (const bitmap of this._ownedBitmaps || []) bitmap.destroy();
        this._ownedBitmaps = [];
        super.destroy(options);
    }
}

window.Scene_Drill_SGaA = Scene_Drill_SGaA;
// Demo 版：打开目标（跳转分类 / 单图词条）落在 demoHidden 分类时不进入画廊；根目录、拍立得照常。
// 回想按钮、收藏集、旧插件指令等入口最终都走 push，在此统一拦截。画廊是回想舞台的唯一入口，
// 隐藏分类里的词条即使被秘籍解锁也无法查看或回想。
const galleryScenePush = SceneManager.push;
SceneManager.push = function(sceneClass) {
    const temp = window.$gameTemp;
    if (sceneClass === Scene_Drill_SGaA && window.$dataSystem?.isDemo && temp) {
        const target = temp._drill_SGaA_isSinglePictureMode
            ? GalleryModel.resolve(Number(temp._drill_SGaA_isSinglePictureIndex))?.category
            : temp._drill_SGaA_jumpCategory;
        if (target && GalleryModel.demoHidden(target)) {
            console.warn('[ShiroinGallery] Demo 版不开放该分类：', target);
            delete temp._drill_SGaA_jumpCategory;
            temp._drill_SGaA_isSinglePictureMode = false;
            return;
        }
    }
    galleryScenePush.call(this, sceneClass);
};
window.Drill_SGaA_SelectWindow = Drill_SGaA_SelectWindow;
window.Drill_SGaA_DescWindow = Drill_SGaA_DescWindow;
window.ShiroinGallery = {
    version: '0.3.9', model: GalleryModel, layout: GALLERY_LAYOUT,
    open() { SceneManager.push(Scene_Drill_SGaA); },
    openCategory(key) { DrillUp.drill_SGaA_openCategory(key); },
    show: DrillUp.drill_SGaA_show, showFully: DrillUp.drill_SGaA_showFully, hide: DrillUp.drill_SGaA_hide,
    unlock: DrillUp.drill_SGaA_unlock, lock: DrillUp.drill_SGaA_lock,
    isFullyUnlocked(keyOrId) {
        return GalleryModel.visible(keyOrId) && !GalleryModel.locked(keyOrId);
    },
    settleUnlockConditions: gallerySettleUnlockConditions,
    rebuild() { GalleryModel.rebuild(); }, cardRects: galleryCardRects
};
// 原菜单符号、标题符号保留；默认均关闭，与当前工程配置一致。
for (const [SceneClass, WindowClass, makeMethod, flag, name, handler] of [
    [Scene_Menu, Window_MenuCommand, 'addOriginalCommands', 'g_SGaA_add_to_menu', 'g_SGaA_menu_name', 'drill_SGaA_menuCommand'],
    [Scene_Title, Window_TitleCommand, 'makeCommandList', 'g_SGaA_add_to_title', 'g_SGaA_title_name', 'drill_SGaA_titleCommand']
]) {
    const create = SceneClass.prototype.createCommandWindow;
    SceneClass.prototype.createCommandWindow = function() {
        create.call(this);
        this._commandWindow.setHandler('Drill_SGaA', this[handler].bind(this));
    };
    SceneClass.prototype[handler] = function() { SceneManager.push(Scene_Drill_SGaA); };
    const make = WindowClass.prototype[makeMethod];
    WindowClass.prototype[makeMethod] = function() {
        make.call(this);
        if (DrillUp[flag]) this.addCommand(DrillUp[name], 'Drill_SGaA', true);
    };
}

})();
