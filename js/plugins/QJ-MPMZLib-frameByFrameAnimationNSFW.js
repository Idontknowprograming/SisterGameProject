//=============================================================================
 /*:
 * @plugindesc 动画脚本（NSFW）
 * @author shiroin
 */
//=============================================================================
/*
 * 逐帧动画专用图片槽。
 *
 * 第一次使用、图片被清除，或同一 pictureId 被另一个动画接管时，仍然走
 * $gameScreen.showPicture，保留当前项目中所有图片插件的首次显示流程。
 * 同一 owner 的后续换帧则复用已有 Game_Picture，只更新帧资源与显示参数。
 *
 * owner 通常直接传动画 listener 的 this。WeakMap 不会进入存档；读档后的
 * 第一次调用会自然回到完整的 showPicture 流程。
 *
 * 返回值：0 = 无变化，1 = 复用图片并更新，2 = 完整 showPicture。
 */
QJ.MPMZ.tl.showAnimationFramePicture = (() => {
    const owners = new WeakMap();

    return function(
        owner, pictureId, name, origin, x, y,
        scaleX, scaleY, opacity, blendMode
    ) {
        let picture = $gameScreen.picture(pictureId);
        const canReuse = picture && owners.has(picture) && owners.get(picture) === owner;

        if (!canReuse) {
            // 不缓存函数引用：运行时调用插件链最终版本的 showPicture。
            $gameScreen.showPicture(
                pictureId, name, origin, x, y,
                scaleX, scaleY, opacity, blendMode
            );
            picture = $gameScreen.picture(pictureId);
            if (picture) owners.set(picture, owner);
            return 2;
        }

        const changed =
            picture._name !== name ||
            picture._origin !== origin ||
            picture._x !== x ||
            picture._y !== y ||
            picture._scaleX !== scaleX ||
            picture._scaleY !== scaleY ||
            picture._opacity !== opacity ||
            picture._blendMode !== blendMode;

        if (!changed) return 0;

        picture._name = name;
        picture._origin = origin;
        picture._x = x;
        picture._y = y;
        picture._scaleX = scaleX;
        picture._scaleY = scaleY;
        picture._opacity = opacity;
        picture._blendMode = blendMode;

        // 与逐帧 showPicture 的静态定位语义保持一致，避免之前的 movePicture
        // 在 Game_Picture.update 中把刚写入的位置、缩放或透明度拉回旧目标。
        picture._targetX = x;
        picture._targetY = y;
        picture._targetScaleX = scaleX;
        picture._targetScaleY = scaleY;
        picture._targetOpacity = opacity;
        picture._duration = 0;
        picture._wholeDuration = 0;
        picture._easingType = 0;
        picture._easingExponent = 0;

        return 1;
    };
})();

DrillUp.g_PSh_pics_extra = DrillUp.g_PSh_pics_extra || [];
DrillUp.g_PSh_pics_extra = [
	"mio_tachie_kao_shy3",	
	"mio_tachie_kao_gaman1",
	"mio_tachie_kao_gaman2",	
	"mio_tachie_towel",
	"mio_tachie_T-shirt_back",
	"mio_tachie_shy2",
	"mio_tachie_shy1",
	"mio_tachie_coat0",
	"mio_tachie_hair",
	"mio_tachie_handpose1",
	"mio_tachie_handpose2",
	"mio_tachie_pajamas1",
	"mio_tachie_handpose4",
	"mio_tachie_handpose3",
	"mio_tachie_pajamas2",
	"mio_tachie_bluepanties",
	"mio_tachie_pinkpanties",
	"mio_tachie_whitepanties",
	"mio_tachie_ofuro_nude",
	"mio_tachie_pajamas2",
	"mio_tachie_bluepanties",
	"mio_tachie_pinkpanties",
	"mio_tachie_whitepanties",
	"mio_tachie_ofuro_nude",	
	"mio_tachie_nudepose0",
	"mio_tachie_nudepose1",
	"mio_tachie_nudepose2"	
];

QJ.MPMZ.tl.preloadNSFWAnimationFrames =
      {
        Onichann:
          [
            "onichann_back",
            "onichann_back_takeoff",
            "onichann_back_thigh",
            "onichann_hand_breastTouchA0",
            "onichann_hand_breastTouchA1",
            "onichann_hand_breastTouchB0",
            "onichann_hand_breastTouchB1",
            "onichann_hand_breastTouchCD0",
            "onichann_hand_breastTouchCD1",
            "onichann_hand_breastTouchCD2",
            "onichann_hand_breastTouchCD3",
            "onichann_hand_breastTouchCD4",
            "onichann_hand_breastTouchCD5",
            "onichann_hand_breastTouchCD6",
            "onichann_hand_breastTouchCL0",
            "onichann_hand_breastTouchCL1",
            "onichann_hand_breastTouchCL2",
            "onichann_hand_breastTouchCL3",
            "onichann_hand_breastTouchCL4",
            "onichann_hand_breastTouchCL5",
            "onichann_hand_breastTouchCL6",
            "onichann_hand_breastTouchCR0",
            "onichann_hand_breastTouchCR1",
            "onichann_hand_breastTouchCR2",
            "onichann_hand_breastTouchCR3",
            "onichann_hand_breastTouchCR4",
            "onichann_hand_breastTouchCR5",
            "onichann_hand_breastTouchCR6",
            "onichann_hand_breastTouchNL0",
            "onichann_hand_breastTouchNL1",
            "onichann_hand_breastTouchNL2",
            "onichann_hand_breastTouchNL3",
            "onichann_hand_breastTouchNL4",
            "onichann_hand_breastTouchNL5",
            "onichann_hand_breastTouchNL6",
            "onichann_hand_breastTouchNR0",
            "onichann_hand_breastTouchNR02",
            "onichann_hand_breastTouchNR1",
            "onichann_hand_breastTouchNR2",
            "onichann_hand_breastTouchNR3",
            "onichann_hand_breastTouchNR4",
            "onichann_hand_breastTouchNR5",
            "onichann_hand_breastTouchNR6",
            "onichann_hand_hiraku_hugL",
            "onichann_hand_hiraku_hugR",
            "onichann_hand_hug",
            "onichann_hand_hug1",
            "onichann_hand_hug1_A",
            "onichann_hand_hugL",
            "onichann_hand_hugR",
            "onichann_hand_insert0",
            "onichann_hand_insert1",
            "onichann_hand_insert2",
            "onichann_hand_insert3",
            "onichann_hand_insert4",
            "onichann_hand_insert5",
            "onichann_hand_insert6",
            "onichann_hand_insert7",
            "onichann_hand_insert8",
            "onichann_hand_omangoTouch",
            "onichann_hand_onanii0",
            "onichann_hand_onanii1",
            "onichann_hand_onanii2",
            "onichann_hand_onanii3",
            "onichann_hand_onanii4",
            "onichann_hand_onanii5",
            "onichann_hand_onanii6",
            "onichann_hand_shimeru_breastTouchCD0",
            "onichann_hand_shimeru_breastTouchCD1",
            "onichann_hand_shimeru_breastTouchCD2",
            "onichann_hand_shimeru_breastTouchCD3",
            "onichann_hand_shimeru_breastTouchCD4",
            "onichann_hand_shimeru_breastTouchCD5",
            "onichann_hand_shimeru_breastTouchCD6",
            "onichann_hand_shimeru_breastTouchCL0",
            "onichann_hand_shimeru_breastTouchCL1",
            "onichann_hand_shimeru_breastTouchCL2",
            "onichann_hand_shimeru_breastTouchCL3",
            "onichann_hand_shimeru_breastTouchCL4",
            "onichann_hand_shimeru_breastTouchCL5",
            "onichann_hand_shimeru_breastTouchCL6",
            "onichann_hand_shimeru_breastTouchCR0",
            "onichann_hand_shimeru_breastTouchCR1",
            "onichann_hand_shimeru_breastTouchCR2",
            "onichann_hand_shimeru_breastTouchCR3",
            "onichann_hand_shimeru_breastTouchCR4",
            "onichann_hand_shimeru_breastTouchCR5",
            "onichann_hand_shimeru_breastTouchCR6",
            "onichann_hand_shimeru_breastTouchNL0",
            "onichann_hand_shimeru_breastTouchNL1",
            "onichann_hand_shimeru_breastTouchNL2",
            "onichann_hand_shimeru_breastTouchNL3",
            "onichann_hand_shimeru_breastTouchNL4",
            "onichann_hand_shimeru_breastTouchNL5",
            "onichann_hand_shimeru_breastTouchNL6",
            "onichann_hand_shimeru_breastTouchNR0",
            "onichann_hand_shimeru_breastTouchNR1",
            "onichann_hand_shimeru_breastTouchNR2",
            "onichann_hand_shimeru_breastTouchNR3",
            "onichann_hand_shimeru_breastTouchNR4",
            "onichann_hand_shimeru_breastTouchNR5",
            "onichann_hand_shimeru_breastTouchNR6",
            "onichann_hand_thighTouch0",
            "onichann_hand_thighTouch1",
            "onichann_hand_thighTouch2",
            "onichann_hand_thighTouch3",
            "onichann_hand_thighTouch4",
            "onichann_hand_thighTouch5",
            "onichann_hand_thighTouch6",
            "onichann_hand_touch0",
            "onichann_hand_touch1",
            "onichann_hand_touch2",
            "onichann_hand_touch3",
            "onichann_hand_touch4",
            "onichann_hand_touch5",
            "onichann_kijoui_hand_hug",
            "onichann_leg",
            "onichann_shoulder",
          ],
        sisterKijoui:
          [
            "sister_kijoui_back",
            "sister_kijoui_blush",
            "sister_kijoui_camisole",
            "sister_kijoui_camisole_remove",
            "sister_kijoui_coatHem",
            "sister_kijoui_hadakaA0",
            "sister_kijoui_hadakaA1",
            "sister_kijoui_hadakaA2",
            "sister_kijoui_hadakaA3",
            "sister_kijoui_hadakaA4",
            "sister_kijoui_hadakaA5",
            "sister_kijoui_hadakaA6",
            "sister_kijoui_hadakaA_end",
            "sister_kijoui_hadakaA_end_back",
            "sister_kijoui_hadakaB0",
            "sister_kijoui_hadakaB1",
            "sister_kijoui_hadakaB10",
            "sister_kijoui_hadakaB2",
            "sister_kijoui_hadakaB3",
            "sister_kijoui_hadakaB4",
            "sister_kijoui_hadakaB5",
            "sister_kijoui_hadakaB6",
            "sister_kijoui_hadakaB7",
            "sister_kijoui_hadakaB8",
            "sister_kijoui_hadakaB9",
            "sister_kijoui_hand0",
            "sister_kijoui_hand1",
            "sister_kijoui_hand10",
            "sister_kijoui_hand2",
            "sister_kijoui_hand3",
            "sister_kijoui_hand4",
            "sister_kijoui_hand5",
            "sister_kijoui_hand6",
            "sister_kijoui_hand7",
            "sister_kijoui_hand8",
            "sister_kijoui_hand9",
            "sister_kijoui_kao00",
            "sister_kijoui_kao01",
            "sister_kijoui_kao02",
            "sister_kijoui_kao03",
            "sister_kijoui_kao04",
            "sister_kijoui_kao10",
            "sister_kijoui_kao11",
            "sister_kijoui_kao12",
            "sister_kijoui_kao13",
            "sister_kijoui_kao14",
            "sister_kijoui_kao20",
            "sister_kijoui_kao21",
            "sister_kijoui_kao22",
            "sister_kijoui_kao23",
            "sister_kijoui_kao24",
            "sister_kijoui_kao30",
            "sister_kijoui_kao31",
            "sister_kijoui_kao32",
            "sister_kijoui_kao33",
            "sister_kijoui_kao34",
            "sister_kijoui_kao4",
            "sister_kijoui_kao40",
            "sister_kijoui_kao41",
            "sister_kijoui_kao42",
            "sister_kijoui_kao43",
            "sister_kijoui_kao44",
            "sister_kijoui_kao45",
          ],
        washRoom:
          [
            "washroom_CR_D_RL",
            "washroom_door",
            "washroom_door1",
            "washroom_door2",
            "washroom_doorLine",
            "washroom_doorOpen",
            "washroom_exit",
            "washroom_fog",
            "washroom_ofuro_bathtowel",
            "washroom_ofuro_nuked",
            "washroom_ofuro_nuked2",
            "washroom_onichann_bluePanties_onani0",
            "washroom_onichann_bluePanties_onani1",
            "washroom_onichann_bluePanties_onani2",
            "washroom_onichann_bluePanties_onani3",
            "washroom_onichann_bluePanties_onani4",
            "washroom_onichann_bluePanties_onani5",
            "washroom_onichann_hands0",
            "washroom_onichann_hands1",
            "washroom_onichann_hands2",
            "washroom_onichann_hands3",
            "washroom_onichann_hands4",
            "washroom_onichann_hands_shake0",
            "washroom_onichann_hands_shake1",
            "washroom_onichann_hands_shake2",
            "washroom_onichann_hands_shake3",
            "washroom_onichann_hands_shake4",
            "washroom_onichann_onani0",
            "washroom_onichann_onani1",
            "washroom_onichann_onani2",
            "washroom_onichann_onani3",
            "washroom_onichann_onani4",
            "washroom_onichann_onani5",
            "washroom_onichann_onani_seieki0",
            "washroom_onichann_onani_seieki1",
            "washroom_onichann_onani_seieki2",
            "washroom_onichann_onani_seieki3",
            "washroom_onichann_onani_seieki4",
            "washroom_onichann_onani_seieki5",
            "washroom_onichann_pinkPanties_onani0",
            "washroom_onichann_pinkPanties_onani1",
            "washroom_onichann_pinkPanties_onani2",
            "washroom_onichann_pinkPanties_onani3",
            "washroom_onichann_pinkPanties_onani4",
            "washroom_onichann_pinkPanties_onani5",
            "washroom_onichann_whitePanties_onani0",
            "washroom_onichann_whitePanties_onani1",
            "washroom_onichann_whitePanties_onani2",
            "washroom_onichann_whitePanties_onani3",
            "washroom_onichann_whitePanties_onani4",
            "washroom_onichann_whitePanties_onani5",
            "washroom_sis_bluePanties_0",
            "washroom_sis_bluePanties_1",
            "washroom_sis_bluePanties_2U",
            "washroom_sis_bluePanties_3",
            "washroom_sis_bluePanties_4",
            "washroom_sis_brush",
            "washroom_sis_brush_cloudy",
            "washroom_sis_clothes",
            "washroom_sis_clothes_bluePanties",
            "washroom_sis_clothes_nopanties",
            "washroom_sis_clothes_pinkPanties",
            "washroom_sis_clothes_whitePanties",
            "washroom_sis_datsui_bareta0",
            "washroom_sis_datsui_bareta0A",
            "washroom_sis_datsui_bareta0B",
            "washroom_sis_datsui_bareta0C",
            "washroom_sis_datsui_bareta1",
            "washroom_sis_datsui_bareta10",
            "washroom_sis_datsui_bareta11",
            "washroom_sis_datsui_bareta12",
            "washroom_sis_datsui_bareta13",
            "washroom_sis_datsui_bareta14",
            "washroom_sis_datsui_bareta15",
            "washroom_sis_datsui_bareta16",
            "washroom_sis_datsui_bareta17",
            "washroom_sis_datsui_bareta18",
            "washroom_sis_datsui_bareta19",
            "washroom_sis_datsui_bareta2",
            "washroom_sis_datsui_bareta20",
            "washroom_sis_datsui_bareta21",
            "washroom_sis_datsui_bareta3",
            "washroom_sis_datsui_bareta4",
            "washroom_sis_datsui_bareta5",
            "washroom_sis_datsui_bareta6",
            "washroom_sis_datsui_bareta7",
            "washroom_sis_datsui_bareta8",
            "washroom_sis_datsui_bareta9",
            "washroom_sis_datsui_bareta_shortpants_10",
            "washroom_sis_datsui_bareta_shortpants_11",
            "washroom_sis_datsui_bareta_shortpants_12",
            "washroom_sis_datsui_bareta_shortpants_13",
            "washroom_sis_datsui_bareta_shortpants_5",
            "washroom_sis_datsui_bareta_shortpants_6",
            "washroom_sis_datsui_bareta_shortpants_7",
            "washroom_sis_datsui_bareta_shortpants_8",
            "washroom_sis_datsui_bareta_shortpants_9",
            "washroom_sis_datsui_bareta_white_panties_12",
            "washroom_sis_datsui_bareta_white_panties_5",
            "washroom_sis_datsui_bareta_white_panties_6",
            "washroom_sis_datsui_bareta_white_panties_7",
            "washroom_sis_datsui_bareta_white_panties_8",
            "washroom_sis_datsui_common0",
            "washroom_sis_datsui_common1",
            "washroom_sis_datsui_common2",
            "washroom_sis_datsui_common3",
            "washroom_sis_datsui_common4",
            "washroom_sis_datsui_onegai0",
            "washroom_sis_datsui_onegai1",
            "washroom_sis_datsui_onegai10",
            "washroom_sis_datsui_onegai2",
            "washroom_sis_datsui_onegai3",
            "washroom_sis_datsui_onegai4",
            "washroom_sis_datsui_onegai5",
            "washroom_sis_datsui_onegai6",
            "washroom_sis_datsui_onegai7",
            "washroom_sis_datsui_onegai8",
            "washroom_sis_datsui_onegai9",
            "washroom_sis_datsui_onegai_alt10",
            "washroom_sis_datsui_onegai_alt4",
            "washroom_sis_datsui_onegai_alt5",
            "washroom_sis_datsui_onegai_alt6",
            "washroom_sis_datsui_onegai_alt7",
            "washroom_sis_datsui_onegai_alt8",
            "washroom_sis_datsui_onegai_alt9",
            "washroom_sis_datsui_seikou0",
            "washroom_sis_datsui_seikou1",
            "washroom_sis_datsui_seikou10",
            "washroom_sis_datsui_seikou11",
            "washroom_sis_datsui_seikou12",
            "washroom_sis_datsui_seikou13",
            "washroom_sis_datsui_seikou14",
            "washroom_sis_datsui_seikou15",
            "washroom_sis_datsui_seikou16",
            "washroom_sis_datsui_seikou17",
            "washroom_sis_datsui_seikou18",
            "washroom_sis_datsui_seikou2",
            "washroom_sis_datsui_seikou3",
            "washroom_sis_datsui_seikou4",
            "washroom_sis_datsui_seikou5",
            "washroom_sis_datsui_seikou6",
            "washroom_sis_datsui_seikou7",
            "washroom_sis_datsui_seikou8",
            "washroom_sis_datsui_seikou9",
            "washroom_sis_datsui_seikou_shortpants_13",
            "washroom_sis_datsui_seikou_shortpants_14",
            "washroom_sis_datsui_seikou_shortpants_15",
            "washroom_sis_datsui_seikou_shortpants_16",
            "washroom_sis_datsui_seikou_shortpants_17",
            "washroom_sis_datsui_seikou_shortpants_18",
            "washroom_sis_datsui_seikou_white_panties_13",
            "washroom_sis_datsui_seikou_white_panties_14",
            "washroom_sis_datsui_seikou_white_panties_15",
            "washroom_sis_datsui_seikou_white_panties_16",
            "washroom_sis_datsui_seikou_white_panties_17",
            "washroom_sis_datsui_seikou_white_panties_18",
            "washroom_sis_datsui_ura0",
            "washroom_sis_datsui_ura1",
            "washroom_sis_datsui_ura10",
            "washroom_sis_datsui_ura11",
            "washroom_sis_datsui_ura12",
            "washroom_sis_datsui_ura13",
            "washroom_sis_datsui_ura14",
            "washroom_sis_datsui_ura15",
            "washroom_sis_datsui_ura16",
            "washroom_sis_datsui_ura17",
            "washroom_sis_datsui_ura18",
            "washroom_sis_datsui_ura19",
            "washroom_sis_datsui_ura2",
            "washroom_sis_datsui_ura20",
            "washroom_sis_datsui_ura3",
            "washroom_sis_datsui_ura4",
            "washroom_sis_datsui_ura5",
            "washroom_sis_datsui_ura6",
            "washroom_sis_datsui_ura7",
            "washroom_sis_datsui_ura8",
            "washroom_sis_datsui_ura9",
            "washroom_sis_korobu",
            "washroom_sis_korobu_end",
            "washroom_sis_korobu_end_towel0",
            "washroom_sis_korobu_shadow",
            "washroom_sis_korobu_shadow2",
            "washroom_sis_korobu_shampoo",
            "washroom_sis_korobu_towel0",
            "washroom_sis_korobu_towel1",
            "washroom_sis_nozoki_shortpants0",
            "washroom_sis_nozoki_white_panties0",
            "washroom_sis_panties",
            "washroom_sis_pantiesMark_0",
            "washroom_sis_pantiesMark_1",
            "washroom_sis_pantiesMark_2",
            "washroom_sis_pantiesMark_3",
            "washroom_sis_pantiesMark_4",
            "washroom_sis_panties_2D",
            "washroom_sis_pinkPanties_0",
            "washroom_sis_pinkPanties_1",
            "washroom_sis_pinkPanties_2U",
            "washroom_sis_pinkPanties_3",
            "washroom_sis_pinkPanties_4",
            "washroom_sis_shadow0",
            "washroom_sis_shadow1",
            "washroom_sis_shadow2",
            "washroom_sis_shadow3",
            "washroom_sis_shadow4",
            "washroom_sis_whitePanties_0",
            "washroom_sis_whitePanties_1",
            "washroom_sis_whitePanties_2U",
            "washroom_sis_whitePanties_3",
            "washroom_sis_whitePanties_4",
            "washroom_sprinkler",
            "washroom_S_D",
            "washroom_S_N_DO_RL_BL",
            "washroom_S_N_RL",
            "washroom_S_N_RL_BL",
          ],
        gameitazurafera:
          [
            "fera_back0",
            "fera_back0_wink0",
            "fera_back0_wink1",
            "fera_back0_wink2",
            "fera_back0_wink3",
            "fera_back1",
            "fera_back10",
            "fera_back11",
            "fera_back12",
            "fera_back1_wink0",
            "fera_back1_wink1",
            "fera_back1_wink2",
            "fera_back2",
            "fera_back3",
            "fera_back4",
            "fera_back5",
            "fera_back6",
            "fera_back7",
            "fera_back8",
            "fera_back9",
            "fera_background",
            "fera_back_mouth1",
            "fera_back_mouth10",
            "fera_back_mouth11",
            "fera_back_mouth12",
            "fera_back_mouth13",
            "fera_back_mouth14",
            "fera_back_mouth2",
            "fera_back_mouth3",
            "fera_back_mouth4",
            "fera_back_mouth5",
            "fera_back_mouth6",
            "fera_back_mouth7",
            "fera_back_mouth8",
            "fera_back_mouth9",
            "fera_ejaculation_mouth",
            "fera_onichannn_back",
            "fera_onichannn_back0",
            "fera_onichannn_back1",
            "fera_onichannn_back2",
            "fera_onichannn_back3",
            "fera_onichannn_back4",
            "fera_onichannn_back5",
            "fera_onichannn_back6",
            "fera_onichannn_penis",
            "fera_onichannn_penis0",
            "fera_onichannn_penis1",
            "fera_onichannn_penis2",
            "fera_onichann_HandD10",
            "fera_onichann_HandD11",
            "fera_onichann_HandD12",
            "fera_onichann_HandD3",
            "fera_onichann_HandD4",
            "fera_onichann_HandD5",
            "fera_onichann_HandD6",
            "fera_onichann_HandD7",
            "fera_onichann_HandD8",
            "fera_onichann_HandD9",
            "fera_onichann_HandM0",
            "fera_onichann_HandM1",
            "fera_onichann_HandM2",
            "fera_onichann_HandM3",
            "fera_onichann_HandM4",
            "fera_onichann_HandM5",
            "fera_onichann_HandM6",
            "fera_seieki_onChest_few",
            "fera_seieki_onFace_few",
            "fera_seieki_onPenis_few",
            "fera_seieki_onPenis_many",
            "fera_sis_HandA0",
            "fera_sis_HandA1",
            "fera_sis_HandA2",
            "fera_sis_HandA3",
            "fera_sis_HandA4",
            "fera_sis_HandA5",
            "fera_sis_HandA6",
            "fera_sis_HandB",
          ],
        kitchenEvent:
          [
            "kitchen_sis_backA0",
            "kitchen_sis_backA1",
            "kitchen_sis_backA2",
            "kitchen_sis_backA3",
            "kitchen_sis_backA4",
            "kitchen_sis_backA5",
            "kitchen_sis_backA6",
            "kitchen_sis_backB0",
            "kitchen_sis_backB1",
            "kitchen_sis_backB2",
            "kitchen_sis_backB3",
            "kitchen_sis_backB4",
            "kitchen_sis_backB5",
            "kitchen_sis_backB6",
            "kitchen_sis_wakuwaku_back",
            "kitchen_sis_wakuwaku_body",
            "kitchen_sis_wakuwaku_hand0",
            "kitchen_sis_wakuwaku_hand1",
            "kitchen_sis_wakuwaku_hand2",
            "kitchen_sis_wakuwaku_hand3",
            "kitchen_sis_wakuwaku_hand4",
            "kitchen_sis_wakuwaku_hand5",
            "kitchen_sis_wakuwaku_hand6",
            "kitchen_sis_wakuwaku_head",
            "kitchen_sis_wakuwaku_kao0",
            "kitchen_sis_wakuwaku_kao1",
            "kitchen_sis_wakuwaku_kao2",
            "kitchen_sis_wakuwaku_kao3",
            "kitchen_sis_wakuwaku_kao4",
            "kitchen_sis_wakuwaku_kao5",
            "kitchen_sis_wakuwaku_kao6",
            "kitchen_sis_wakuwaku_kao7",
            "kitchen_sis_wakuwaku_kao_0",
            "kitchen_sis_wakuwaku_kao_0A",
            "kitchen_sis_wakuwaku_kao_1",
            "kitchen_sis_wakuwaku_kao_1A",
            "kitchen_sis_wakuwaku_kao_2",
            "kitchen_sis_wakuwaku_kao_3",
            "kitchen_sis_wakuwaku_obieru",
            "kitchen_sis_wakuwaku_shoulder0",
            "kitchen_sis_wakuwaku_shoulder1",
            "kitchen_sis_wakuwaku_shoulder2",
            "kitchen_sis_wakuwaku_shoulder3",
            "kitchen_sis_wakuwaku_shoulder4",
            "kitchen_sis_wakuwaku_shoulder5",
            "kitchen_sis_wakuwaku_shoulder6",
            "kitchen_sis_wakuwaku_star1",
            "kitchen_sis_wakuwaku_star2",
            "nanisoregomi",
            "umasou",
            "knife&fork",
          ],
        toilet:
          [
            "toilet_sister_pose1",
            "toilet_sister_pose1_kao1",
            "toilet_sister_pose1_kao2",
            "toilet_sister_pose1_kao3",
            "toilet_sister_pose1_kao4",
            "toilet_sister_pose1_kao5",
            "toilet_sister_pose1_kao6",
            "toilet_sister_pose1_shadow",
            "toilet_sister_pose2",
            "toilet_sister_pose2_kao1",
            "toilet_sister_pose2_kao2",
            "toilet_sister_pose2_kao3",
            "toilet_sister_pose2_kao4",
            "toilet_sister_pose2_kao5",
            "toilet_sister_pose2_shadow",
            "toilet_sister_pose3",
            "toilet_sister_pose3_emiction",
            "toilet_sister_pose3_kao1",
            "toilet_sister_pose3_kao2",
            "toilet_sister_pose3_kao3",
            "toilet_sister_pose3_shadow",
          ],
        washRoomSister:
          [
            "washroom_sis_brush",
            "washroom_sis_brush_cloudy",
            "washroom_sis_clothes",
            "washroom_sis_clothes_nopanties",
            "washroom_sis_datsui_bareta0",
            "washroom_sis_datsui_bareta0A",
            "washroom_sis_datsui_bareta0B",
            "washroom_sis_datsui_bareta0C",
            "washroom_sis_datsui_bareta1",
            "washroom_sis_datsui_bareta10",
            "washroom_sis_datsui_bareta11",
            "washroom_sis_datsui_bareta12",
            "washroom_sis_datsui_bareta13",
            "washroom_sis_datsui_bareta14",
            "washroom_sis_datsui_bareta15",
            "washroom_sis_datsui_bareta16",
            "washroom_sis_datsui_bareta17",
            "washroom_sis_datsui_bareta18",
            "washroom_sis_datsui_bareta19",
            "washroom_sis_datsui_bareta2",
            "washroom_sis_datsui_bareta20",
            "washroom_sis_datsui_bareta21",
            "washroom_sis_datsui_bareta3",
            "washroom_sis_datsui_bareta4",
            "washroom_sis_datsui_bareta5",
            "washroom_sis_datsui_bareta6",
            "washroom_sis_datsui_bareta7",
            "washroom_sis_datsui_bareta8",
            "washroom_sis_datsui_bareta9",
            "washroom_sis_datsui_bareta_shortpants_10",
            "washroom_sis_datsui_bareta_shortpants_11",
            "washroom_sis_datsui_bareta_shortpants_12",
            "washroom_sis_datsui_bareta_shortpants_13",
            "washroom_sis_datsui_bareta_shortpants_5",
            "washroom_sis_datsui_bareta_shortpants_6",
            "washroom_sis_datsui_bareta_shortpants_7",
            "washroom_sis_datsui_bareta_shortpants_8",
            "washroom_sis_datsui_bareta_shortpants_9",
            "washroom_sis_datsui_bareta_white_panties_12",
            "washroom_sis_datsui_bareta_white_panties_5",
            "washroom_sis_datsui_bareta_white_panties_6",
            "washroom_sis_datsui_bareta_white_panties_7",
            "washroom_sis_datsui_bareta_white_panties_8",
            "washroom_sis_datsui_common0",
            "washroom_sis_datsui_common1",
            "washroom_sis_datsui_common2",
            "washroom_sis_datsui_common3",
            "washroom_sis_datsui_common4",
            "washroom_sis_datsui_onegai0",
            "washroom_sis_datsui_onegai1",
            "washroom_sis_datsui_onegai10",
            "washroom_sis_datsui_onegai2",
            "washroom_sis_datsui_onegai3",
            "washroom_sis_datsui_onegai4",
            "washroom_sis_datsui_onegai5",
            "washroom_sis_datsui_onegai6",
            "washroom_sis_datsui_onegai7",
            "washroom_sis_datsui_onegai8",
            "washroom_sis_datsui_onegai9",
            "washroom_sis_datsui_onegai_alt10",
            "washroom_sis_datsui_onegai_alt4",
            "washroom_sis_datsui_onegai_alt5",
            "washroom_sis_datsui_onegai_alt6",
            "washroom_sis_datsui_onegai_alt7",
            "washroom_sis_datsui_onegai_alt8",
            "washroom_sis_datsui_onegai_alt9",
            "washroom_sis_datsui_seikou0",
            "washroom_sis_datsui_seikou1",
            "washroom_sis_datsui_seikou10",
            "washroom_sis_datsui_seikou11",
            "washroom_sis_datsui_seikou12",
            "washroom_sis_datsui_seikou13",
            "washroom_sis_datsui_seikou14",
            "washroom_sis_datsui_seikou15",
            "washroom_sis_datsui_seikou16",
            "washroom_sis_datsui_seikou17",
            "washroom_sis_datsui_seikou18",
            "washroom_sis_datsui_seikou2",
            "washroom_sis_datsui_seikou3",
            "washroom_sis_datsui_seikou4",
            "washroom_sis_datsui_seikou5",
            "washroom_sis_datsui_seikou6",
            "washroom_sis_datsui_seikou7",
            "washroom_sis_datsui_seikou8",
            "washroom_sis_datsui_seikou9",
            "washroom_sis_datsui_seikou_shortpants_13",
            "washroom_sis_datsui_seikou_shortpants_14",
            "washroom_sis_datsui_seikou_shortpants_15",
            "washroom_sis_datsui_seikou_shortpants_16",
            "washroom_sis_datsui_seikou_shortpants_17",
            "washroom_sis_datsui_seikou_shortpants_18",
            "washroom_sis_datsui_seikou_white_panties_13",
            "washroom_sis_datsui_seikou_white_panties_14",
            "washroom_sis_datsui_seikou_white_panties_15",
            "washroom_sis_datsui_seikou_white_panties_16",
            "washroom_sis_datsui_seikou_white_panties_17",
            "washroom_sis_datsui_seikou_white_panties_18",
            "washroom_sis_datsui_ura0",
            "washroom_sis_datsui_ura1",
            "washroom_sis_datsui_ura10",
            "washroom_sis_datsui_ura11",
            "washroom_sis_datsui_ura12",
            "washroom_sis_datsui_ura13",
            "washroom_sis_datsui_ura14",
            "washroom_sis_datsui_ura15",
            "washroom_sis_datsui_ura16",
            "washroom_sis_datsui_ura17",
            "washroom_sis_datsui_ura18",
            "washroom_sis_datsui_ura19",
            "washroom_sis_datsui_ura2",
            "washroom_sis_datsui_ura20",
            "washroom_sis_datsui_ura3",
            "washroom_sis_datsui_ura4",
            "washroom_sis_datsui_ura5",
            "washroom_sis_datsui_ura6",
            "washroom_sis_datsui_ura7",
            "washroom_sis_datsui_ura8",
            "washroom_sis_datsui_ura9",
            "washroom_sis_korobu",
            "washroom_sis_korobu_end",
            "washroom_sis_korobu_shadow",
            "washroom_sis_korobu_shadow2",
            "washroom_sis_korobu_shampoo",
            "washroom_sis_korobu_towel0",
            "washroom_sis_korobu_towel1",
            "washroom_sis_nozoki_shortpants0",
            "washroom_sis_nozoki_white_panties0",
            "washroom_sis_panties",
            "washroom_sis_shadow0",
            "washroom_sis_shadow1",
            "washroom_sis_shadow2",
            "washroom_sis_shadow3",
            "washroom_sis_shadow4",
          ],
        bathRoom:
          [
            "bathroom_filled",
            "bathroom_normal",
            "bathroom_oniichan_back0",
            "bathroom_oniichan_back0_add",
            "bathroom_oniichan_back1",
            "bathroom_oniichan_hand0",
            "bathroom_oniichan_hand1",
            "bathroom_oniichan_hand_hug",
            "bathroom_oniichan_hand_touch",
            "bathroom_oniichan_kao1",
            "bathroom_oniichan_leg1",
            "bathroom_rubberDuck",
            "bathroom_rubberDuck0",
            "bathroom_rubberDuck1",
            "bathroom_sis_back1",
            "bathroom_sis_back1_bathtowel2",
            "bathroom_sis_back2",
            "bathroom_sis_back2_bathtowel1",
            "bathroom_sis_back2_bathtowel2",
            "bathroom_sis_bathtowel1",
            "bathroom_sis_bathtowel1B",
            "bathroom_sis_bathtowel2B",
            "bathroom_sis_bothbathing_back0",
            "bathroom_sis_bothbathing_kao0",
            "bathroom_sis_bothbathing_kao1",
            "bathroom_sis_bothbathing_kao2",
            "bathroom_sis_bothbathing_kao3",
            "bathroom_sis_bothbathing_kao4",
            "bathroom_sis_bothbathing_kao5",
            "bathroom_sis_bothbathing_kao5_soul",
            "bathroom_sis_bothbathing_kao6",
            "bathroom_sis_bothbathing_towel0",
            "bathroom_sis_bothbathing_towel0_alt",
            "bathroom_sis_bothbathing_towel1",
            "bathroom_sis_bothbathing_waterMask",
            "bathroom_sis_kao0",
            "bathroom_sis_kao1",
            "bathroom_sis_kao2",
          ],
        sisterbrushingTeeth:
          [
            "brushingTeeth0000",
            "brushingTeeth0001",
            "brushingTeeth0002",
            "brushingTeeth0003",
            "brushingTeeth0004",
            "brushingTeeth0005",
            "brushingTeeth0006",
            "brushingTeeth0007",
            "brushingTeeth0008",
            "brushingTeeth0009",
            "brushingTeeth0010",
            "brushingTeeth0011",
            "brushingTeeth0012",
            "brushingTeeth0013",
            "brushingTeeth0014",
            "brushingTeeth0015",
            "brushingTeeth0016",
            "brushingTeeth0017",
            "brushingTeeth0018",
            "brushingTeeth0019",
            "brushingTeeth0020",
            "brushingTeeth0021",
            "brushingTeeth0022",
            "brushingTeeth0023",
            "brushingTeeth0024",
            "brushingTeeth0025",
            "brushingTeeth0026",
            "brushingTeeth0027",
            "brushingTeeth0028",
            "brushingTeeth0029",
            "brushingTeeth0030",
            "brushingTeeth0031",
            "brushingTeeth0032",
            "brushingTeeth0033",
            "brushingTeeth0034",
            "brushingTeeth0035",
            "brushingTeeth0036",
            "brushingTeeth0037",
            "brushingTeeth0038",
            "brushingTeeth0039",
            "brushingTeeth0040",
            "brushingTeeth0041",
            "brushingTeeth0042",
            "brushingTeeth0043",
            "brushingTeeth0044",
            "brushingTeeth0045",
            "brushingTeeth0046",
            "brushingTeeth0047",
            "brushingTeeth0048",
            "brushingTeeth0049",
            "brushingTeeth0050",
            "brushingTeeth0051",
            "brushingTeeth0052",
            "brushingTeeth0053",
            "brushingTeeth0054",
            "brushingTeeth0055",
            "brushingTeeth0056",
            "brushingTeeth0057",
            "brushingTeeth0058",
            "brushingTeeth0059",
            "brushingTeeth0060",
            "brushingTeeth0061",
            "brushingTeeth0062",
            "brushingTeeth0063",
            "brushingTeeth0064",
            "brushingTeeth0065",
            "brushingTeeth0066",
            "brushingTeeth0067",
            "brushingTeeth0068",
            "brushingTeeth0069",
            "brushingTeeth0070",
            "brushingTeeth0071",
            "brushingTeeth0072",
            "brushingTeeth0073",
            "brushingTeeth0074",
            "brushingTeeth0075",
            "brushingTeeth0076",
            "brushingTeeth0077",
            "brushingTeeth0078",
            "brushingTeeth0079",
            "brushingTeeth0080",
            "brushingTeeth0081",
            "brushingTeeth0082",
            "brushingTeeth0083",
            "brushingTeeth0084",
            "brushingTeeth0085",
            "brushingTeeth0086",
            "brushingTeeth0087",
            "brushingTeeth0088",
            "brushingTeeth0089",
            "brushingTeeth0090",
            "brushingTeeth0091",
            "brushingTeeth0092",
            "brushingTeeth0093",
            "brushingTeeth0094",
            "brushingTeeth0095",
            "brushingTeeth0096",
            "brushingTeeth0097",
            "brushingTeeth0098",
            "brushingTeeth0099",
            "brushingTeeth0100",
            "brushingTeeth0101",
            "brushingTeeth0102",
            "brushingTeeth0103",
            "brushingTeeth0104",
            "brushingTeeth0105",
            "brushingTeeth0106",
            "brushingTeeth0107",
            "brushingTeeth0108",
            "brushingTeeth0109",
            "brushingTeeth0110",
            "brushingTeeth0111",
            "brushingTeeth0112",
            "brushingTeeth0113",
            "brushingTeeth0114",
            "brushingTeeth0115",
            "brushingTeeth0116",
            "brushingTeeth0117",
            "brushingTeeth0118",
            "brushingTeeth0119",
            "brushingTeeth0120",
            "brushingTeeth0121",
            "brushingTeeth0122",
            "brushingTeeth0123",
            "brushingTeeth0124",
            "brushingTeeth0125",
            "brushingTeeth0126",
            "brushingTeeth0127",
            "brushingTeeth0128",
            "brushingTeeth0129",
            "brushingTeeth0130",
            "brushingTeeth0131",
            "brushingTeeth0132",
            "brushingTeeth0133",
            "brushingTeeth0134",
            "brushingTeeth0135",
            "brushingTeeth0136",
            "brushingTeeth0137",
            "brushingTeeth0138",
            "brushingTeeth0139",
            "brushingTeeth0140",
            "brushingTeeth0141",
            "brushingTeeth0142",
            "brushingTeeth0143",
            "brushingTeeth0144",
            "brushingTeeth0145",
            "brushingTeeth0146",
            "brushingTeeth0147",
            "brushingTeeth0148",
            "brushingTeeth0149",
            "brushingTeeth0150",
            "brushingTeeth0151",
            "brushingTeeth0152",
            "brushingTeeth0153",
            "brushingTeeth0154",
            "brushingTeeth0155",
            "brushingTeeth0156",
            "brushingTeeth0157",
            "brushingTeeth0158",
            "brushingTeeth0159",
            "brushingTeeth0160",
            "brushingTeeth0161",
            "brushingTeeth0162",
            "brushingTeeth0163",
            "brushingTeeth0164",
            "brushingTeeth0165",
            "brushingTeeth0166",
            "brushingTeeth0167",
            "brushingTeeth0168",
            "brushingTeeth0169",
            "brushingTeeth0170",
            "brushingTeeth0171",
            "brushingTeeth0172",
            "brushingTeeth0173",
            "brushingTeeth0174",
            "brushingTeeth0175",
            "brushingTeeth0176",
            "brushingTeeth0177",
            "brushingTeeth0178",
            "brushingTeeth0179",
            "brushingTeeth0180",
            "brushingTeeth0181",
            "brushingTeeth0182",
            "brushingTeeth0183",
            "brushingTeeth0184",
            "brushingTeeth0185",
            "brushingTeeth0186",
            "brushingTeeth0187",
            "brushingTeeth0188",
            "brushingTeeth0189",
            "brushingTeeth0190",
            "brushingTeeth0191",
            "brushingTeeth0192",
            "brushingTeeth0193",
            "brushingTeeth0194",
            "brushingTeeth0195",
            "brushingTeeth0196",
            "brushingTeeth0197",
            "brushingTeeth0198",
            "brushingTeeth0199",
            "brushingTeeth0200",
            "brushingTeeth0201",
            "brushingTeeth0202",
            "brushingTeeth0203",
            "brushingTeeth0204",
            "brushingTeeth0205",
            "brushingTeeth0206",
            "brushingTeeth0207",
            "brushingTeeth0208",
            "brushingTeeth0209",
            "brushingTeeth0210",
            "brushingTeeth0211",
            "brushingTeeth0212",
            "brushingTeeth0213",
            "brushingTeeth0214",
            "brushingTeeth0215",
            "brushingTeeth0216",
            "brushingTeeth0217",
          ],
        washRoomSisterSolo:
          [
            "bathroom_sis_solo_bubble1",
            "bathroom_sis_solo_bubble2",
            "bathroom_sis_solo_bubble3",
            "bathroom_sis_solo_bubble4",
            "bathroom_sis_solo_bubble5",
            "bathroom_sis_solo_bubble6",
            "bathroom_sis_solo_bubble7",
            "bathroom_sis_solo_NoRubberDuck",
            "bathroom_sis_solo_playWithRubberDuck",
            "bathroom_sis_solo_playWithRubberDuck0",
            "bathroom_sis_solo_playWithRubberDuck1",
            "bathroom_sis_solo_playWithRubberDuck2",
            "bathroom_sis_solo_playWithRubberDuck3",
            "bathroom_sis_solo_playWithRubberDuck4",
            "bathroom_sis_solo_playWithRubberDuck5",
            "bathroom_sis_solo_playWithRubberDuck6",
            "bathroom_sis_solo_shake_eyesClosed1",
            "bathroom_sis_solo_shake_eyesClosed2",
            "bathroom_sis_solo_shake_eyesClosed3",
            "bathroom_sis_solo_shake_eyesClosed4",
            "bathroom_sis_solo_shake_eyesClosed5",
            "bathroom_sis_solo_shake_eyesClosed6",
            "bathroom_sis_solo_shake_eyesClosed7",
            "bathroom_sis_solo_shake_eyesOpened1",
            "bathroom_sis_solo_shake_eyesOpened2",
            "bathroom_sis_solo_shake_eyesOpened3",
            "bathroom_sis_solo_shake_eyesOpened4",
            "bathroom_sis_solo_shake_eyesOpened5",
            "bathroom_sis_solo_shake_eyesOpened6",
            "bathroom_sis_solo_shake_eyesOpened7",
            "bathroom_sis_solo_smile",
            "bathroom_sis_solo_smile1",
            "bathroom_sis_solo_smile2",
            "bathroom_sis_solo_smile3",
            "bathroom_sis_solo_stretching0",
            "bathroom_sis_solo_stretching1",
            "bathroom_sis_solo_stretching10",
            "bathroom_sis_solo_stretching2",
            "bathroom_sis_solo_stretching3",
            "bathroom_sis_solo_stretching4",
            "bathroom_sis_solo_stretching5",
            "bathroom_sis_solo_stretching6",
            "bathroom_sis_solo_stretching7",
            "bathroom_sis_solo_stretching8",
            "bathroom_sis_solo_stretching9",
          ],
        dryingHair:
          [
            "sis_room_CGdryingHair_back",
            "sis_room_CGdryingHair_bathTowel",
            "sis_room_CGdryingHair_bunnyPlush",
            "sis_room_CGdryingHair_camisole",
            "sis_room_CGdryingHair_camisole_slide",
            "sis_room_CGdryingHair_head0",
            "sis_room_CGdryingHair_head1",
            "sis_room_CGdryingHair_oniichan0",
            "sis_room_CGdryingHair_oniichan1",
            "sis_room_CGdryingHair_shortpants",
            "sis_room_chibi_dryingHair_back1",
            "sis_room_chibi_dryingHair_back2",
            "sis_room_chibi_dryingHair_bathTowel1",
            "sis_room_chibi_dryingHair_bathTowel2",
            "sis_room_chibi_dryingHair_camisole1",
            "sis_room_chibi_dryingHair_camisole2",
            "sis_room_chibi_dryingHair_kao0",
            "sis_room_chibi_dryingHair_kao1",
            "sis_room_chibi_dryingHair_kao2",
            "sis_room_chibi_dryingHair_shortpants",
            "sis_room_chibi_dryingHair_vapour",
          ],
        washroomNozoku:
          [
            "ShowerheadA0",
            "ShowerheadA1",
            "ShowerheadA2",
            "ShowerheadA3",
            "ShowerheadA4",
            "ShowerheadA5",
            "ShowerheadA6",
            "ShowerheadA7",
            "ShowerheadB0",
            "ShowerheadB1",
            "ShowerheadB2",
            "ShowerheadB3",
            "ShowerheadB4",
            "ShowerheadB5",
            "ShowerheadB6",
            "ShowerheadB7",
            "imouto_shower_actionA0",
            "imouto_shower_actionA1",
            "imouto_shower_actionA10",
            "imouto_shower_actionA11",
            "imouto_shower_actionA12",
            "imouto_shower_actionA13",
            "imouto_shower_actionA14",
            "imouto_shower_actionA2",
            "imouto_shower_actionA3",
            "imouto_shower_actionA4",
            "imouto_shower_actionA5",
            "imouto_shower_actionA6",
            "imouto_shower_actionA7",
            "imouto_shower_actionA8",
            "imouto_shower_actionA9",
            "imouto_shower_actionB15",
            "imouto_shower_actionB16",
            "imouto_shower_actionB17",
            "imouto_shower_actionB18",
            "imouto_shower_actionB19",
            "imouto_shower_actionB20",
            "imouto_shower_actionB21",
            "imouto_shower_actionB22",
            "imouto_shower_actionB23",
            "imouto_shower_actionB24",
            "imouto_shower_actionB25",
            "imouto_shower_actionB26",
            "imouto_shower_actionB27",
            "imouto_shower_actionB28",
            "imouto_shower_actionB29",
            "imouto_shower_actionB30",
            "imouto_shower_actionB31",
            "imouto_shower_actionC32",
            "imouto_shower_actionC33",
            "imouto_shower_actionC34",
            "imouto_shower_actionC35",
            "imouto_shower_actionC36",
            "imouto_shower_actionC37",
            "imouto_shower_actionC38",
            "imouto_shower_actionC39",
            "imouto_shower_actionC40",
            "imouto_shower_actionC41",
            "imouto_shower_actionC42",
            "imouto_shower_actionC43",
            "imouto_shower_actionC44",
            "imouto_shower_actionC45",
            "imouto_shower_actionC46",
            "imouto_shower_actionC47",
            "imouto_shower_actionD48",
            "imouto_shower_actionD49",
            "imouto_shower_actionD50",
            "imouto_shower_actionD51",
            "imouto_shower_actionD52",
            "imouto_shower_actionD53",
            "imouto_shower_actionD54",
            "imouto_shower_actionD55",
            "imouto_shower_actionD56",
            "imouto_shower_actionD57",
            "imouto_shower_actionD58",
            "imouto_shower_actionD59",
            "imouto_shower_actionD60",
            "imouto_shower_actionD61",
            "imouto_shower_actionD62",
            "imouto_shower_actionE63",
            "imouto_shower_actionE64",
            "imouto_shower_actionE65",
            "imouto_shower_actionE66",
            "imouto_shower_actionE67",
            "imouto_shower_actionE68",
            "imouto_shower_actionE69",
            "imouto_shower_actionE70",
            "imouto_shower_actionE71",
            "imouto_shower_actionE72",
            "imouto_shower_actionE73",
            "imouto_shower_actionE74",
            "imouto_shower_actionE75",
            "imouto_shower_actionE76",
            "imouto_shower_actionE77",
            "imouto_shower_actionE78",
            "imouto_shower_actionE79",
            "imouto_shower_actionE80",
            "imouto_shower_actionE81",
            "imouto_shower_actionE82",
            "imouto_shower_actionE83",
            "imouto_shower_actionE84",
            "imouto_shower_actionE85",
            "imouto_shower_actionE86",
            "imouto_shower_actionE87",
            "imouto_shower_actionE88",
            "imouto_shower_actionE89",
            "imouto_shower_actionE90",
            "imouto_shower_actionE91",
            "imouto_shower_actionE92",
            "imouto_shower_actionE93",
            "imouto_shower_actionE94",
            "imouto_shower_actionE95",
            "imouto_shower_actionF100",
            "imouto_shower_actionF101",
            "imouto_shower_actionF102",
            "imouto_shower_actionF103",
            "imouto_shower_actionF104",
            "imouto_shower_actionF105",
            "imouto_shower_actionF106",
            "imouto_shower_actionF107",
            "imouto_shower_actionF108",
            "imouto_shower_actionF109",
            "imouto_shower_actionF110",
            "imouto_shower_actionF111",
            "imouto_shower_actionF112",
            "imouto_shower_actionF113",
            "imouto_shower_actionF114",
            "imouto_shower_actionF115",
            "imouto_shower_actionF116",
            "imouto_shower_actionF117",
            "imouto_shower_actionF96",
            "imouto_shower_actionF97",
            "imouto_shower_actionF98",
            "imouto_shower_actionF99",
            "imouto_shower_actionG118",
            "imouto_shower_actionG119",
            "imouto_shower_actionG120",
            "imouto_shower_actionG121",
            "imouto_shower_actionG122",
            "imouto_shower_actionG123",
            "imouto_shower_actionG124",
            "imouto_shower_actionG125",
            "imouto_shower_actionH100",
            "imouto_shower_actionH101",
            "imouto_shower_actionH102",
            "imouto_shower_actionH103",
            "imouto_shower_actionH104",
            "imouto_shower_actionH105",
            "imouto_shower_actionH106",
            "imouto_shower_actionH107",
            "imouto_shower_actionH108",
            "imouto_shower_actionH109",
            "imouto_shower_actionH110",
            "imouto_shower_actionH91",
            "imouto_shower_actionH92",
            "imouto_shower_actionH93",
            "imouto_shower_actionH94",
            "imouto_shower_actionH95",
            "imouto_shower_actionH96",
            "imouto_shower_actionH97",
            "imouto_shower_actionH98",
            "imouto_shower_actionH99",
          ],
        washRoomSisterSolo:
          [
            "bathroom_sis_solo_bubble1",
            "bathroom_sis_solo_bubble2",
            "bathroom_sis_solo_bubble3",
            "bathroom_sis_solo_bubble4",
            "bathroom_sis_solo_bubble5",
            "bathroom_sis_solo_bubble6",
            "bathroom_sis_solo_bubble7",
            "bathroom_sis_solo_NoRubberDuck",
            "bathroom_sis_solo_playWithRubberDuck",
            "bathroom_sis_solo_playWithRubberDuck0",
            "bathroom_sis_solo_playWithRubberDuck1",
            "bathroom_sis_solo_playWithRubberDuck2",
            "bathroom_sis_solo_playWithRubberDuck3",
            "bathroom_sis_solo_playWithRubberDuck4",
            "bathroom_sis_solo_playWithRubberDuck5",
            "bathroom_sis_solo_playWithRubberDuck6",
            "bathroom_sis_solo_shake_eyesClosed1",
            "bathroom_sis_solo_shake_eyesClosed2",
            "bathroom_sis_solo_shake_eyesClosed3",
            "bathroom_sis_solo_shake_eyesClosed4",
            "bathroom_sis_solo_shake_eyesClosed5",
            "bathroom_sis_solo_shake_eyesClosed6",
            "bathroom_sis_solo_shake_eyesClosed7",
            "bathroom_sis_solo_shake_eyesOpened1",
            "bathroom_sis_solo_shake_eyesOpened2",
            "bathroom_sis_solo_shake_eyesOpened3",
            "bathroom_sis_solo_shake_eyesOpened4",
            "bathroom_sis_solo_shake_eyesOpened5",
            "bathroom_sis_solo_shake_eyesOpened6",
            "bathroom_sis_solo_shake_eyesOpened7",
            "bathroom_sis_solo_smile",
            "bathroom_sis_solo_smile1",
            "bathroom_sis_solo_smile2",
            "bathroom_sis_solo_smile3",
            "bathroom_sis_solo_stretching0",
            "bathroom_sis_solo_stretching1",
            "bathroom_sis_solo_stretching10",
            "bathroom_sis_solo_stretching2",
            "bathroom_sis_solo_stretching3",
            "bathroom_sis_solo_stretching4",
            "bathroom_sis_solo_stretching5",
            "bathroom_sis_solo_stretching6",
            "bathroom_sis_solo_stretching7",
            "bathroom_sis_solo_stretching8",
            "bathroom_sis_solo_stretching9",
          ],
        washroomTekoki:
          [
            "washroom_tekoki_back",
            "washroom_tekoki_bluePanties0",
            "washroom_tekoki_bluePanties1",
            "washroom_tekoki_bluePanties2",
            "washroom_tekoki_bluePanties3",
            "washroom_tekoki_bluePanties4",
            "washroom_tekoki_bluePanties5",
            "washroom_tekoki_bluePanties6",
            "washroom_tekoki_bluePanties7",
            "washroom_tekoki_bluePanties8",
            "washroom_tekoki_bluePanties9",
            "washroom_tekoki_blush",
            "washroom_tekoki_hand0",
            "washroom_tekoki_hand1",
            "washroom_tekoki_hand2",
            "washroom_tekoki_hand3",
            "washroom_tekoki_hand4",
            "washroom_tekoki_hand5",
            "washroom_tekoki_hand6",
            "washroom_tekoki_hand7",
            "washroom_tekoki_hand8",
            "washroom_tekoki_hand9",
            "washroom_tekoki_kao0",
            "washroom_tekoki_kao1",
            "washroom_tekoki_kao2",
            "washroom_tekoki_penis0",
            "washroom_tekoki_penis1",
            "washroom_tekoki_penis2",
            "washroom_tekoki_penis3",
            "washroom_tekoki_penis4",
            "washroom_tekoki_penis5",
            "washroom_tekoki_penis6",
            "washroom_tekoki_penis7",
            "washroom_tekoki_penis8",
            "washroom_tekoki_penis9",
            "washroom_tekoki_pinkPanties0",
            "washroom_tekoki_pinkPanties1",
            "washroom_tekoki_pinkPanties2",
            "washroom_tekoki_pinkPanties3",
            "washroom_tekoki_pinkPanties4",
            "washroom_tekoki_pinkPanties5",
            "washroom_tekoki_pinkPanties6",
            "washroom_tekoki_pinkPanties7",
            "washroom_tekoki_pinkPanties8",
            "washroom_tekoki_pinkPanties9",
            "washroom_tekoki_visibleBreath0",
            "washroom_tekoki_visibleBreath1",
            "washroom_tekoki_visibleBreath2",
            "washroom_tekoki_visibleBreath3",
            "washroom_tekoki_visibleBreath4",
            "washroom_tekoki_visibleBreath5",
            "washroom_tekoki_visibleBreath6",
            "washroom_tekoki_visibleBreath7",
            "washroom_tekoki_whitePanties0",
            "washroom_tekoki_whitePanties1",
            "washroom_tekoki_whitePanties2",
            "washroom_tekoki_whitePanties3",
            "washroom_tekoki_whitePanties4",
            "washroom_tekoki_whitePanties5",
            "washroom_tekoki_whitePanties6",
            "washroom_tekoki_whitePanties7",
            "washroom_tekoki_whitePanties8",
            "washroom_tekoki_whitePanties9",
          ],
        toiletSister:
          [
            "toilet_sister_fera_action1",
            "toilet_sister_fera_action10",
            "toilet_sister_fera_action2",
            "toilet_sister_fera_action3",
            "toilet_sister_fera_action4",
            "toilet_sister_fera_action5",
            "toilet_sister_fera_action6",
            "toilet_sister_fera_action7",
            "toilet_sister_fera_action8",
            "toilet_sister_fera_action9",
            "toilet_sister_fera_hairBack",
            "toilet_sister_fera_head",
            "toilet_sister_fera_kao1",
            "toilet_sister_fera_kao2",
            "toilet_sister_fera_kao3",
            "toilet_sister_fera_oniichan",
            "toilet_sister_fera_shadow1",
            "toilet_sister_fera_shadow2",
            "toilet_sister_onanii0_back0",
            "toilet_sister_onanii0_back1",
            "toilet_sister_onanii0_back2",
            "toilet_sister_onanii0_back3",
            "toilet_sister_onanii0_back4",
            "toilet_sister_onanii_back1",
            "toilet_sister_onanii_back10",
            "toilet_sister_onanii_back11",
            "toilet_sister_onanii_back12",
            "toilet_sister_onanii_back13",
            "toilet_sister_onanii_back14",
            "toilet_sister_onanii_back15",
            "toilet_sister_onanii_back16",
            "toilet_sister_onanii_back17",
            "toilet_sister_onanii_back2",
            "toilet_sister_onanii_back3",
            "toilet_sister_onanii_back4",
            "toilet_sister_onanii_back5",
            "toilet_sister_onanii_back6",
            "toilet_sister_onanii_back7",
            "toilet_sister_onanii_back8",
            "toilet_sister_onanii_back9",
            "toilet_sister_onanii_hairBack",
            "toilet_sister_onanii_head0",
            "toilet_sister_onanii_head1",
            "toilet_sister_onanii_head2",
            "toilet_sister_onanii_kao0",
            "toilet_sister_onanii_kao1",
            "toilet_sister_pose1",
            "toilet_sister_pose1_kao1",
            "toilet_sister_pose1_kao2",
            "toilet_sister_pose1_kao3",
            "toilet_sister_pose1_kao4",
            "toilet_sister_pose1_kao5",
            "toilet_sister_pose1_kao6",
            "toilet_sister_pose1_shadow",
            "toilet_sister_pose2",
            "toilet_sister_pose2_add0",
            "toilet_sister_pose2_add1",
            "toilet_sister_pose2_add2",
            "toilet_sister_pose2_add3",
            "toilet_sister_pose2_add4",
            "toilet_sister_pose2_add5",
            "toilet_sister_pose2_kao1",
            "toilet_sister_pose2_kao2",
            "toilet_sister_pose2_kao3",
            "toilet_sister_pose2_kao4",
            "toilet_sister_pose2_kao5",
            "toilet_sister_pose2_shadow",
            "toilet_sister_pose3",
            "toilet_sister_pose3_emiction",
            "toilet_sister_pose3_kao1",
            "toilet_sister_pose3_kao2",
            "toilet_sister_pose3_kao3",
            "toilet_sister_pose3_shadow",
          ],
        ImotoTachie:
          [
            "mio_tachie_body",
            "mio_tachie_boobShake1",
            "mio_tachie_boobShake2",
            "mio_tachie_boobShake3",
            "mio_tachie_boobShake4",
            "mio_tachie_boobShake5",
            "mio_tachie_boobShake6",
            "mio_tachie_nudepose0_hand",
            "mio_tachie_nurse_cap",
            "mio_tachie_nurse_uniform0",
            "mio_tachie_nurse_uniform1",
            "mio_tachie_nurse_uniform2",
            "mio_tachie_nurse_uniform3",
            "mio_tachie_nurse_uniform3_extra",
            "mio_tachie_T-shirt_draggingA1",
            "mio_tachie_T-shirt_draggingA2",
            "mio_tachie_T-shirt_draggingA3",
            "mio_tachie_T-shirt_draggingA4",
            "mio_tachie_T-shirt_draggingB1",
            "mio_tachie_T-shirt_draggingB2",
            "mio_tachie_T-shirt_draggingB3",
            "mio_tachie_T-shirt_draggingB4",
            "mio_tachie_T-shirt_draggingB5",
            "mio_tachie_T-shirt_dragging_extra",
          ],
        washroomTekokiShasei:
          [
            "washroom_tekoki_shasei1",
            "washroom_tekoki_shasei10",
            "washroom_tekoki_shasei11",
            "washroom_tekoki_shasei12",
            "washroom_tekoki_shasei13",
            "washroom_tekoki_shasei14",
            "washroom_tekoki_shasei15",
            "washroom_tekoki_shasei16",
            "washroom_tekoki_shasei17",
            "washroom_tekoki_shasei18",
            "washroom_tekoki_shasei19",
            "washroom_tekoki_shasei2",
            "washroom_tekoki_shasei20",
            "washroom_tekoki_shasei21",
            "washroom_tekoki_shasei22",
            "washroom_tekoki_shasei23",
            "washroom_tekoki_shasei24",
            "washroom_tekoki_shasei25",
            "washroom_tekoki_shasei26",
            "washroom_tekoki_shasei27",
            "washroom_tekoki_shasei28",
            "washroom_tekoki_shasei29",
            "washroom_tekoki_shasei3",
            "washroom_tekoki_shasei30",
            "washroom_tekoki_shasei31",
            "washroom_tekoki_shasei32",
            "washroom_tekoki_shasei33",
            "washroom_tekoki_shasei34",
            "washroom_tekoki_shasei35",
            "washroom_tekoki_shasei36",
            "washroom_tekoki_shasei37",
            "washroom_tekoki_shasei38",
            "washroom_tekoki_shasei39",
            "washroom_tekoki_shasei4",
            "washroom_tekoki_shasei40",
            "washroom_tekoki_shasei41",
            "washroom_tekoki_shasei42",
            "washroom_tekoki_shasei43",
            "washroom_tekoki_shasei44",
            "washroom_tekoki_shasei45",
            "washroom_tekoki_shasei46",
            "washroom_tekoki_shasei47",
            "washroom_tekoki_shasei48",
            "washroom_tekoki_shasei49",
            "washroom_tekoki_shasei5",
            "washroom_tekoki_shasei50",
            "washroom_tekoki_shasei51",
            "washroom_tekoki_shasei52",
            "washroom_tekoki_shasei53",
            "washroom_tekoki_shasei54",
            "washroom_tekoki_shasei55",
            "washroom_tekoki_shasei56",
            "washroom_tekoki_shasei57",
            "washroom_tekoki_shasei58",
            "washroom_tekoki_shasei59",
            "washroom_tekoki_shasei6",
            "washroom_tekoki_shasei60",
            "washroom_tekoki_shasei61",
            "washroom_tekoki_shasei62",
            "washroom_tekoki_shasei63",
            "washroom_tekoki_shasei64",
            "washroom_tekoki_shasei65",
            "washroom_tekoki_shasei66",
            "washroom_tekoki_shasei67",
            "washroom_tekoki_shasei7",
            "washroom_tekoki_shasei8",
            "washroom_tekoki_shasei9",
            "washroom_tekoki_shasei_back10",
            "washroom_tekoki_shasei_back11",
            "washroom_tekoki_shasei_back13",
            "washroom_tekoki_shasei_back14",
            "washroom_tekoki_shasei_back6",
            "washroom_tekoki_shasei_back7",
            "washroom_tekoki_shasei_hairSeieki14",
            "washroom_tekoki_shasei_hairSeieki15",
            "washroom_tekoki_shasei_hairSeieki16",
            "washroom_tekoki_shasei_hairSeieki17",
            "washroom_tekoki_shasei_hairSeieki18",
            "washroom_tekoki_shasei_hairSeieki19",
            "washroom_tekoki_shasei_hairSeieki20",
            "washroom_tekoki_shasei_hairSeieki25",
            "washroom_tekoki_shasei_hairSeieki29",
            "washroom_tekoki_shasei_hairSeieki33",
            "washroom_tekoki_shasei_hairSeieki34",
            "washroom_tekoki_shasei_hairSeieki35",
            "washroom_tekoki_shasei_hairSeieki36",
            "washroom_tekoki_shasei_hairSeieki37",
            "washroom_tekoki_shasei_hairSeieki39",
            "washroom_tekoki_shasei_hairSeieki44",
            "washroom_tekoki_shasei_hairSeieki47",
            "washroom_tekoki_shasei_hairSeieki48",
            "washroom_tekoki_shasei_hairSeieki49",
            "washroom_tekoki_shasei_hairSeieki50",
            "washroom_tekoki_shasei_hairSeieki51",
            "washroom_tekoki_shasei_hairSeieki52",
          ],
        washroomTekokiAction:
          [
            "washroom_tekoki_action2_1",
            "washroom_tekoki_action2_10",
            "washroom_tekoki_action2_11",
            "washroom_tekoki_action2_12",
            "washroom_tekoki_action2_13",
            "washroom_tekoki_action2_14",
            "washroom_tekoki_action2_15",
            "washroom_tekoki_action2_16",
            "washroom_tekoki_action2_17",
            "washroom_tekoki_action2_18",
            "washroom_tekoki_action2_19",
            "washroom_tekoki_action2_2",
            "washroom_tekoki_action2_20",
            "washroom_tekoki_action2_21",
            "washroom_tekoki_action2_22",
            "washroom_tekoki_action2_23",
            "washroom_tekoki_action2_24",
            "washroom_tekoki_action2_25",
            "washroom_tekoki_action2_26",
            "washroom_tekoki_action2_3",
            "washroom_tekoki_action2_4",
            "washroom_tekoki_action2_5",
            "washroom_tekoki_action2_6",
            "washroom_tekoki_action2_7",
            "washroom_tekoki_action2_8",
            "washroom_tekoki_action2_9",
            "washroom_tekoki_action3_1",
            "washroom_tekoki_action3_10",
            "washroom_tekoki_action3_11",
            "washroom_tekoki_action3_12",
            "washroom_tekoki_action3_13",
            "washroom_tekoki_action3_14",
            "washroom_tekoki_action3_15",
            "washroom_tekoki_action3_16",
            "washroom_tekoki_action3_17",
            "washroom_tekoki_action3_18",
            "washroom_tekoki_action3_19",
            "washroom_tekoki_action3_2",
            "washroom_tekoki_action3_20",
            "washroom_tekoki_action3_21",
            "washroom_tekoki_action3_22",
            "washroom_tekoki_action3_23",
            "washroom_tekoki_action3_24",
            "washroom_tekoki_action3_25",
            "washroom_tekoki_action3_26",
            "washroom_tekoki_action3_27",
            "washroom_tekoki_action3_3",
            "washroom_tekoki_action3_4",
            "washroom_tekoki_action3_5",
            "washroom_tekoki_action3_6",
            "washroom_tekoki_action3_7",
            "washroom_tekoki_action3_8",
            "washroom_tekoki_action3_9",
            "washroom_tekoki_action4_1",
            "washroom_tekoki_action4_2",
            "washroom_tekoki_action4_3",
            "washroom_tekoki_action4_4",
            "washroom_tekoki_action4_5",
            "washroom_tekoki_action4_6",
            "washroom_tekoki_action4_7",
            "washroom_tekoki_action4_8",
            "washroom_tekoki_action4_9",
            "washroom_tekoki_action4_10",
            "washroom_tekoki_action4_11",
            "washroom_tekoki_action4_12",
            "washroom_tekoki_action4_13",
            "washroom_tekoki_action4_14",
            "washroom_tekoki_action4_15",
            "washroom_tekoki_action4_16",
            "washroom_tekoki_action4_17",
            "washroom_tekoki_action4_18",
            "washroom_tekoki_action4_19",
            "washroom_tekoki_action4_20",
            "washroom_tekoki_action4_21",
            "washroom_tekoki_action4_22",
            "washroom_tekoki_action4_23",
          ],
      };

// 夜袭监听器
QJ.MPMZ.tl.nightRaidMonitor = function(extra={}) {

    if (extra.detectClickCollision) {
        this._coolDown = this._coolDown || 0;	
        if (this._coolDown > 0) {
            this._coolDown -= 1;
            return;
        }        
        let triggered = TouchInput.drill_isLeftPressed() || TouchInput.drill_isLeftTriggered();
        if (!triggered) return;
        if ($gameMap.isEventRunningQJ() || $gameMessage.isBusy()) {
            this._coolDown = 30; // 触发后短暂冷却，防止事件/对话中误触
            return;
        }
     
        // 触摸/观察模式
        if ($gameSwitches.value(45) || $gameSwitches.value(46)) {   
           let part = QJ.MPMZ.tl.nightRaidMonitor({bodyPartDetection: true});
           switch (part) {
               case 'face':
                   $gameMap.event(6).steupCEQJ(1);
                   break;
               case 'head':
                   $gameMap.event(6).steupCEQJ(2);
                   break;
               case 'ear':
                   $gameMap.event(6).steupCEQJ(3);
                   break;
               case 'hand':
                   $gameMap.event(7).steupCEQJ(1);
                   break;
               case 'feet':
                   $gameMap.event(7).steupCEQJ(2);
                   break;  
               case 'belly':
                   $gameMap.event(7).steupCEQJ(3);
                   break;                                    
               case 'breasts':
                   $gameMap.event(8).steupCEQJ(1);
                   break;
               case 'thighs':
                   $gameMap.event(8).steupCEQJ(2);
                   break;
               case 'butt':
                   $gameMap.event(8).steupCEQJ(3);
                   break;
               case 'pussy':
                   $gameMap.event(8).steupCEQJ(4);
                   break;
           }    
        }
        // 脱衣模式
        if ($gameSwitches.value(47)) {
            if ($gameScreen.isMouseOnOpaquePixel(5)) {
                $gameMap.event(9).steupCEQJ(1);
                return;
            }
            if ($gameScreen.isMouseOnOpaquePixel(6)) {
                $gameMap.event(9).steupCEQJ(3);
                return;
            }
            if ($gameScreen.isMouseOnOpaquePixel(7)) {
                $gameMap.event(9).steupCEQJ(2);
                return;
            }         
        }          
        return;
    }

    if (extra.bodyPartDetection) {
        function detectBodyPart(x, y) {
            const inRect = (x, y, left, top, right, bottom) =>
                x >= left && x <= right && y >= top && y <= bottom;
            const inCircle = (x, y, cx, cy, r) =>
                (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2;
            // 夜袭靠近 = ON 时使用的判定
            function detectApproachedPart(x, y) {
                // 耳朵判定（独立优先）
                if (inRect(x, y, 698, 239, 752, 316)) return 'ear';
                // 头部 -> 脸部
                if (inCircle(x, y, 663, 358, 126)) {
                    if (inCircle(x, y, 704, 390, 73)) return 'face';
                    return 'head';
                }
                // 手
                if (inRect(x, y, 536, 471, 830, 667)) return 'hand';
                // 胸
                if (inRect(x, y, 833, 361, 970, 547)) return 'breasts';
                // 肚子
                if (inCircle(x, y, 1029, 462, 56)) return 'belly';
                // 大腿
                if (inCircle(x, y, 1107, 612, 113)) return 'thighs';
                // 屁股 -> 小穴
                if (inCircle(x, y, 1205, 469, 111)) {
                    if (inCircle(x, y, 1219, 511, 53)) return 'pussy';
                    return 'butt';
                }
                // 脚
                if (x >= 1257 && y >= 568) return 'feet';
                return null;
            }
            // 夜袭靠近 = OFF 时使用的判定
            function detectNormalPart(x, y) {
                // 头部作为入口
                if (inCircle(x, y, 810, 378, 84)) {
                    // 耳朵优先于脸，再优先于头
                    if (inRect(x, y, 834, 286, 871, 351)) return 'ear';
                    if (inCircle(x, y, 839, 401, 49)) return 'face';
                    return 'head';
                }
                // 手
                if (inRect(x, y, 726, 454, 924, 588)) return 'hand';
                // 胸
                if (inRect(x, y, 924, 381, 1017, 505)) return 'breasts';
                // 肚子
                if (inCircle(x, y, 1054, 448, 37)) return 'belly';
                // 大腿
                if (inCircle(x, y, 1106, 548, 75)) return 'thighs';
                // 屁股 -> 小穴
                if (inCircle(x, y, 1166, 446, 74)) {
                    if (inCircle(x, y, 1181, 480, 35)) return 'pussy';
                    return 'butt';
                }
                // 脚
                if (x >= 1207 && y >= 521) return 'feet';
                return null;
            }

            return $gameMap.chahuiMapTemp?.ApproachedImouto
                ? detectApproachedPart(x, y)
                : detectNormalPart(x, y);
        }

        const detectedPart = detectBodyPart(TouchInput.x, TouchInput.y);
        let touchMode = false;
        let watchMode = false;
        let pointer   = '';
        if (detectedPart) {
            if ($gameMap.chahuiMapTemp?.touchMode) {
                touchMode = true;
                pointer   = 'pointer_touch';
            }
            if ($gameMap.chahuiMapTemp?.watchMode) {
                watchMode = true;
                pointer   = 'pointer_watch';
            }
        }
        $gameSwitches.setValue(45, watchMode);
        $gameSwitches.setValue(46, touchMode);
        $gameStrings.setValue(36, pointer);
        return detectedPart;
    }
    //————————————————    
    // 检查场景退出条件
    //————————————————
    if (extra.isImoutoAwake) {
        if ($gameSystem.hour() >= 2 && $gameSystem.hour() <= 6) {
           // 超时结束
           $gameMap.event(1).steupCEQJ(3, {timeout: true});
        }
        if ($gameVariables.value(19) >= 70) {
           // 妹妹即将苏醒
           $gameMap.event(1).steupCEQJ(3, {aboutToWake: true});
        }        
        return;
    }
    //————————————————    
    // 夜袭监听器初始化
    //————————————————
    let fixedHour   = $gameSystem.hour();  
    let fixedMinute = $gameSystem.minute();    
    $gameMap.chahuiMapTemp = $gameMap.chahuiMapTemp || {};
    let monitor = QJ.MPMZ.Shoot({
        groupName: ['nightRaidMonitor'],
        Hour: fixedHour,
        Minute: fixedMinute,
        existData: [ 
        ],
        moveF: [
            [15, 15, QJ.MPMZ.tl.nightRaidMonitor, [{isImoutoAwake:true}]],                        // 检测妹妹是否苏醒
            [15, 15, QJ.MPMZ.tl.nightRaidMonitor, [{bodyPartDetection:true, touchMode:true}]],    // 检测触摸的身体部位
            [30, 0, QJ.MPMZ.tl.nightRaidMonitor, [{detectClickCollision:true}]]                  // 检测鼠标点击碰撞
        ]
    });     
};

// 一起玩游戏-检查妹妹是否被恶作剧分神
QJ.MPMZ.tl.checkImoutoDistraction = function(extra={}) {

    if (extra.refresh) {

        if ($gameVariables.value(19) <= 1 || $gameMap.chahuiMapTemp?.attractImoutoAttention) {
			// 妹妹集中度耗尽
            chahuiUtil.abortEventById(-1);
            $gameMap.event(47).steupCEQJ(2);
            this.setDead({t:['Time',0]});
            return;
        }

		let ratedValue    = 60;
        let fixedHour     = this.data.Hour; 
        let fixedMinute   = this.data.Minute;
        let currentHour   = $gameSystem.hour();  
        let currentMinute = $gameSystem.minute();
        let currentTimeInMinutes = currentHour * 60 + currentMinute;  
        let fixedTimeInMinutes   = fixedHour * 60 + fixedMinute + ratedValue;
        if (currentTimeInMinutes > fixedTimeInMinutes) {
			// 超时的分歧
            chahuiUtil.abortEventById(-1);
            $gameMap.event(47).steupCEQJ(1);
            this.setDead({t:['Time',0]});
        }        
        return;
    }

    let fixedHour   = $gameSystem.hour();  
    let fixedMinute = $gameSystem.minute();
    let listener = QJ.MPMZ.Shoot({
        groupName: ['checkImoutoDistraction'],
        Hour: fixedHour,
        Minute: fixedMinute,
        existData: [ 
        ],
        moveF: [
            [15,15,QJ.MPMZ.tl.checkImoutoDistraction,[{refresh:true}]]
        ]
    });     
};

// 检查哥哥能否再战
QJ.MPMZ.tl.canOniiChanContinueSegs = function(extra = {}) {
	
	let Oniichan = $gameParty.leader();
	let HP       = Oniichan.hp;
	
	if (extra.shasei) {
	   // 根据射精量扣除体力
       let seieki = extra.seiekiRyo ? extra.seiekiRyo : 4 + Math.randomInt(4);	
       let damage = -seieki * 15;
	   this.changeHp(Oniichan, damage, false);
	   $gameScreen.startFlash([255, 255, 255, 105], 30);
	   // 进入贤者模式
	   $gameVariables.setValue(25, -10);
	   // 记录哥哥总射精量
	   $gameSelfVariables.addValue([1, 1, "shaseiRyo"], seieki);
	   // 提供给后续事件指令的标记
       this.shaseiRyo = this.shaseiRyo || 0;
	   this.shaseiRyo += seieki;	   
	}
	
	let limit    = 100;
    //if (Utils.isOptionValid("test")) limit = 200;	
    if (HP >= limit) {
       return true;	
	}
	// 进入贤者模式
	$gameVariables.setValue(25, -10);
    return false;	
};

// 哥哥幸运值修正工具
QJ.MPMZ.tl.randHighByLuckSmooth = function(luck = 20, strength = 6) {
    luck = Math.max(0, Math.min(999, luck));
    const luck01 = luck / 999;

    const k = 1 + luck01 * strength;   // 1..(1+strength)
    const u = Math.random();
    return Math.pow(u, 1 / k);         // 越接近1越容易
};

// 检查妹妹能否接受Hentai请求
QJ.MPMZ.tl.canImoutoAcceptHentaiRequest = function(extra = {needValue:5, needkeiken:0, begImouto:false, needsMoodCheck:false}) {

	// Demo 版限制内容：带 CheckIfDemo 的请求无条件拒绝
	if (extra.CheckIfDemo && $dataSystem.isDemo) return false;

	// 和谐模式无条件拒绝；分数预览只读取数值，不进行接受判定。
	if (ConfigManager.harmonyMode && !extra.predictedScore) return false;

	const Imouto    = $gameActors.actor(2);
    const heart     = Math.min(7, Math.max(0, Number($gameVariables.value(15)) || 0));
	const isHeat    = Imouto.isStateAffected(35); // 发情状态
	const purple    = Math.min(7, Math.max(0, Number($gameVariables.value(18)) || 0));
	const moodValue = Math.min(100, Math.max(0, Number($gameVariables.value(20)) || 0));
    const bribery   = $gameSelfVariables.value([1, 2, 'briberyLevel']);
    const white     = $gameSelfVariables.value([1, 2, 'whiteHeart']);

    // 显示普通判定的分数区间，不抽取随机数，也不检查请求门槛和熟练度。
    if (extra.predictedScore) {
        const score = heart + purple + bribery + white + (isHeat ? 2 : 0);
        const minScore = score - (moodValue <= 35 ? 2 : 0);
        const maxScore = score + (moodValue >= 75 ? 2 : 0);
        return minScore === maxScore ? String(score) : `${minScore}～${maxScore}`;
    }

	const oniichan  = $gameActors.actor(1);
	const lucky     = oniichan.luk;    
	let needValue   = extra.needValue || 5;
    let Seikeiken   = Imouto.skillMasteryUses?.(190) || 0;

    if (extra.begImouto) {
	// 直接对妹妹死缠烂打地请求	
        const check = (heart + purple) * (1.25 * QJ.MPMZ.tl.randHighByLuckSmooth(lucky));
		return check > needValue;
	}

	if (isHeat) needValue -= 2;
	if (moodValue >= 75) needValue -= Math.randomInt(3);
	if (moodValue <= 35) needValue += Math.randomInt(3);
    if (extra.HScene) Seikeiken = $gameSelfVariables.value([1, 2, String(extra.HScene)]);
    
    if (extra.needsMoodCheck) {
        // 额外判断妹妹的心情值
        let chance = 0.01 * (moodValue - 40);
        if (chance < Math.random()) needValue += 15;
    }

    needValue -= heart + purple + bribery + white;
	const isSkilled = Seikeiken >= (Number(extra.needkeiken) || 0);
	// 需要考虑妹妹既要满足好感要求也要满足熟练度要求
	return needValue <= 0 && isSkilled;
};



// 餐厅-机上位segs
QJ.MPMZ.tl.diningRoomSegsTableTop = function(extra = {}) {
    // 抽插动作帧    
    if (extra.refresh) {
        this._coolDown = this._coolDown || 0;	
        if (this._coolDown > 0) {
            this._coolDown -= 1;
            return;
        }

        this._frames = this._frames || 1;

        const end = 11;
        const background = $gameScreen.picture(1);
        if (!background) return;
        let scale = background._scaleX;
        let posX = scale > 50 ? 380 : 790;
        let posY = scale > 50 ? -40 : 355;
        const IMG = "[NSFW]diningRoom_eatImouto/diningRoom_TableTop_action" + this._frames;
        QJ.MPMZ.tl.showAnimationFramePicture(this, 5, IMG, 0, posX, posY, scale, scale, 255, 0);
        // 角色阴影
        posX = scale > 50 ? 420 : 810;
        posY = scale > 50 ? 750 : 750;  
        const shadowType = this._hasCoat ? "B" : "";  
        const shadow = `[NSFW]diningRoom_eatImouto/diningRoom_TableTop_action_shadow${shadowType}` + this._frames;
        QJ.MPMZ.tl.showAnimationFramePicture(this, 3, shadow, 0, posX, posY, scale, scale, 255, 2);        
        // 表情差分
        posX = scale > 50 ? 480 : 840;
        posY = scale > 50 ? 290 : 520;          
        let kaoType = this._kaoType || "A";
        const kao = `[NSFW]diningRoom_eatImouto/diningRoom_TableTop_action_kao${kaoType}` + this._frames;
        QJ.MPMZ.tl.showAnimationFramePicture(this, 8, kao, 0, posX, posY, scale, scale, 255, 0);

        if (this._hasCamisole) {
            // 睡衣图层
            posX = scale > 50 ? 720 : 960;
            posY = scale > 50 ? 550 : 650;            
            const camisole = "[NSFW]diningRoom_eatImouto/diningRoom_TableTop_action_camisole" + this._frames;
            QJ.MPMZ.tl.showAnimationFramePicture(this, 6, camisole, 0, posX, posY, scale, scale, 255, 0);                
        }
        if (this._hasCoat) {
            // 外套图层
            posX = scale > 50 ? 540 : 870;
            posY = scale > 50 ? 650 : 700;
            const coat = "[NSFW]diningRoom_eatImouto/diningRoom_TableTop_action_coat" + this._frames;
            QJ.MPMZ.tl.showAnimationFramePicture(this, 7, coat, 0, posX, posY, scale, scale, 255, 0);                
        }

        if (this._seiekiNakadashi) {
            // 内射的溅射精液
            posX = scale > 50 ? 1120 : 1160;
            posY = scale > 50 ? 770 : 760;      
            const seieki = "[NSFW]diningRoom_eatImouto/diningRoom_TableTop_action_seiekiNakadashi" + this._frames;
            QJ.MPMZ.tl.showAnimationFramePicture(this, 9, seieki, 0, posX, posY, scale, scale, 255, 0);
        }
        if (this._seiekiSotodashi) {
            // 外射的溅射精液
            posX = scale > 50 ? 720 : 960;
            posY = scale > 50 ? 330 : 540;      
            const seieki = "[NSFW]diningRoom_eatImouto/diningRoom_TableTop_action_seiekiSotodashi" + this._frames;
            QJ.MPMZ.tl.showAnimationFramePicture(this, 10, seieki, 0, posX, posY, scale, scale, 255, 0);            
        }

        this._frames++;
        // 色色音效
        if (this._frames === 9 || this._frames === 3) {
            let seName = "[NSFW]bathroom_UdeTsukamiBakku_action" + Math.randomInt(6);
            if (this._seiekiNakadashi) seName = "[NSFW]livingroom_segsNebakku_nakadashiPisuton" + Math.randomInt(6);
            const volume = this._seiekiNakadashi ? 20 : 50;
            AudioManager.playVoice({ name: seName, volume, pitch: 95 + Math.randomInt(11), pan:0 }, false, 5); 
        }

        if (this._frames === 7 ) {
            if (this._shasei) {
                // 触发射精事件，暂停抽插动画
                this._frames   = 9;
                this._coolDown = 999999;
                const eid      = this.data.eid;
                $gameMap.event(eid).steupCEQJ(3, 
                    { shasei:true, listenerId: this.index, actionType: this._shasei, seiekiNakadashi: this._seiekiNakadashi, seiekiSotodashi: this._seiekiSotodashi });
                this._shasei   = null;
                return;
            }
        }

        if (this._frames === 8 ) {
            if (this._nextKaoType === 'F') {
                this._kaoType = 'F';
            }
        }

        if (this._frames > end) {
            const start = 6;
            this._frames = start;
            this._coolDown += Math.floor(this._speed / 2);  
            if (this._nextKaoType) {
                if (this._kaoType === this._nextKaoType) {
                    this._nextKaoType = null;
                    if (this._kaoType === "B") this._kaoType = "C";
                    if (this._kaoType === "F") this._kaoType = "A";
                } else {
                    this._kaoType = this._nextKaoType;
                } 
            }
        }

        this._coolDown += this._speed;        
        return;
    }
    
    // 精液动作帧
    if (extra.shaseiRefresh) {
        const videoTime = $gameMap.getPictureVideoCurrentTime(5);

        const videoFps    = 12;
        const shaseiType  = this._shaseiType || 'sotodashi';
        const isSotodashi = shaseiType === 'sotodashi';
        const maxFrames   = isSotodashi ? 30 : 27;
        const frame = Math.min(
            maxFrames,
            Math.round(videoTime * videoFps + 0.0001) + 1
        );        
        // 计算出同一帧不刷新画面
        if (frame === this._frames) return;
        this._frames = frame;
        const shaseiTimes = this._shaseiTimes || 0;
        const background = $gameScreen.picture(1);
        if (!background) return;
        let scale = background._scaleX;

        // 角色阴影
        posX = scale > 50 ? 420 : 810;
        posY = scale > 50 ? 750 : 750;  
        const shadowType = this._hasCoat ? "B" : "";  
        let shadowFrames = this._frames;
        let end = isSotodashi ? 25 : 19;
        if (!isSotodashi && [14,15,16,17,18].includes(shadowFrames)) shadowFrames = 13; 
        if (isSotodashi && [14,15,16,17,18,19,20].includes(shadowFrames)) shadowFrames = 13; 
        if (shadowFrames <= end) {
            const shadow = `[NSFW]diningRoom_eatImouto/diningRoom_TableTop_${shaseiType}_shadow${shadowType}` + shadowFrames;
            QJ.MPMZ.tl.showAnimationFramePicture(this, 3, shadow, 0, posX, posY, scale, scale, 255, 2);  
        } 
        // 表情差分
        posX = scale > 50 ? 480 : 840;
        posY = scale > 50 ? 290 : 520;
        let kaoFrames = this._frames;
        end = 27;
        if (!isSotodashi && [14,15,16,17,18].includes(kaoFrames)) kaoFrames = 13; 
        if (kaoFrames <= end) {
            const kao = `[NSFW]diningRoom_eatImouto/diningRoom_TableTop_${shaseiType}_kao` + kaoFrames;
            QJ.MPMZ.tl.showAnimationFramePicture(this, 8, kao, 0, posX, posY, scale, scale, 255, 0);
        }

        // 色色音效
        const shaseFrames = isSotodashi ? 5 : 7;
        if (this._frames === shaseFrames) {
            let shaseSe     = "[NSFW]livingRoom_ImoutoScared_segs_shasei" + (shaseiTimes * 2);
            if (isSotodashi) shaseSe = "[NSFW]shasei_sotodashi" + Math.randomInt(5);
            const volume = 60;
            AudioManager.playVoice({ name: shaseSe, volume, pitch: 95 + Math.randomInt(11), pan:0 }, false, 5); 
        }

        if (this._hasCamisole) {
            // 睡衣图层
            let frames = this._frames;  
            end = isSotodashi ? 27 : 19;
            if (frames <= end) {
                posX = scale > 50 ? 720 : 960;
                posY = scale > 50 ? 550 : 650;   
                if (!isSotodashi && [14,15,16,17,18].includes(frames)) frames = 13;  
                if (isSotodashi && [14,15,16,17,18,19,20].includes(frames)) frames = 13; 
                const camisole = `[NSFW]diningRoom_eatImouto/diningRoom_TableTop_${shaseiType}_camisole` + frames;
                QJ.MPMZ.tl.showAnimationFramePicture(this, 6, camisole, 0, posX, posY, scale, scale, 255, 0);     
            }           
        }
        if (this._hasCoat) {
            // 外套图层
            let frames = this._frames;  
            end = isSotodashi ? 27 : 19;    
            if (frames <= end) {       
                posX = scale > 50 ? 540 : 870;
                posY = scale > 50 ? 650 : 700;
                if (!isSotodashi && [14,15,16,17,18].includes(frames)) frames = 13;  
                if (isSotodashi && [14,15,16,17,18,19,20].includes(frames)) frames = 13;                 
                const coat = `[NSFW]diningRoom_eatImouto/diningRoom_TableTop_${shaseiType}_coat` + frames;
                QJ.MPMZ.tl.showAnimationFramePicture(this, 7, coat, 0, posX, posY, scale, scale, 255, 0);   
            }             
        }   
        if (this._seiekiNakadashi) {
            // 内射的溅射精液
            let frames = this._frames;  
            end = isSotodashi ? 29 : 14;     
            if (frames <= end) {                                
                posX = scale > 50 ? 1120 : 1160; 
                posY = scale > 50 ? 770 : 760; 
                if (isSotodashi)  {
                    posY -= scale > 50 ? 30 : 15; 
                } 
                const seieki = `[NSFW]diningRoom_eatImouto/diningRoom_TableTop_${shaseiType}_seiekiNakadashi` + frames;
                QJ.MPMZ.tl.showAnimationFramePicture(this, 9, seieki, 0, posX, posY, scale, scale, 255, 0);
            } else {
                if (!isSotodashi && $gameScreen.picture(9)?._opacity) {
                    $gameScreen.picture(9)._opacity = 0;
                }
            }
        }             
        if (this._seiekiSotodashi) {
            // 外射的溅射精液
            let frames = this._frames;  
            end = isSotodashi ? 25 : 27; 
            if (frames <= end) {              
                posX = scale > 50 ? 720 : 960;
                posY = scale > 50 ? 330 : 540;      
                if (!isSotodashi && [14,15,16,17,18].includes(frames)) frames = 13;  
                if (isSotodashi && [14,15,16].includes(frames)) frames = 13;   
                const seieki = `[NSFW]diningRoom_eatImouto/diningRoom_TableTop_${shaseiType}_seiekiSotodashi` + frames;
                QJ.MPMZ.tl.showAnimationFramePicture(this, 10, seieki, 0, posX, posY, scale, scale, 255, 0);            
            }
        }

        return;
    }

    // 动画监听器
    let listener = QJ.MPMZ.Shoot({
        groupName: ['TableTop', 'segs'],
        moveType: ['S', 0],
        existData: [],
        eid: this._eventId,
        moveF: [
		    [60, 0, QJ.MPMZ.tl.diningRoomSegsTableTop, [{ refresh: true }]]
		],
        moveJS: [],
    });
    this.listenerId       = listener.index;
    listener._frames      = 1;
    listener._coolDown    = 999999;
    listener._speed       = 5;
    listener._kaoType     = "A";
    listener._hasCamisole = true;
    listener._hasCoat     = true;
    //listener._seiekiNakadashi = true;
    //listener._seiekiSotodashi = true;
    // 完整预加载：读取、PNG解码，并逐张上传到GPU。
    const shadowType = listener._hasCoat ? "B" : "";
    const preloadNames = [];
    for (let i = 1; i <= 11; i++) {
        preloadNames.push(
            "[NSFW]diningRoom_eatImouto/diningRoom_TableTop_action" + i,
            "[NSFW]diningRoom_eatImouto/diningRoom_TableTop_action_kaoA" + i,
            `[NSFW]diningRoom_eatImouto/diningRoom_TableTop_action_shadow${shadowType}` + i
        );
        if (listener._hasCamisole) {
            preloadNames.push("[NSFW]diningRoom_eatImouto/diningRoom_TableTop_action_camisole" + i);
        }
        if (listener._hasCoat) {
            preloadNames.push("[NSFW]diningRoom_eatImouto/diningRoom_TableTop_action_coat" + i);
        }
    }
    listener._picturePreloadPromise = ImageManager.preloadPicturesToGpu(preloadNames);
};

// 客厅-背后位segs
QJ.MPMZ.tl.livingroomSegsNebakku = function(extra = {}) {
    
    if (extra.refresh) {
        this._coolDown = this._coolDown || 0;	
        if (this._coolDown > 0) {
            this._coolDown -= 1;
            return;
        }

        this._frames = this._frames || 1;
        this._speed  = this._speed  || 4;
        const end = 6;
        const background = $gameScreen.picture(1);
        if (!background) return;
        let scale = background._scaleX;
        let posX = scale > 50 ? 720 : 720;
        let posY = scale > 50 ? 80 : 450;
        let IMG = `[NSFW]living_room_ImoutoOnani/segs_nebakku_action` + this._frames;
        QJ.MPMZ.tl.showAnimationFramePicture(this, 5, IMG, 0, posX, posY, scale, scale, 255, 0);
        // 表情差分
        let kaoType = this._kaoType || "A";
        posX += scale > 50 ? 100 : 50;
        posY += scale > 50 ? 300 : 150;
        let kao = `[NSFW]living_room_ImoutoOnani/segs_nebakku_kao${kaoType}` + this._frames;
        QJ.MPMZ.tl.showAnimationFramePicture(this, 8, kao, 0, posX, posY, scale, scale, 255, 0);

        if (this._seiekiNakadashi) {
            // 内射的溅射精液
            let seieki = `[NSFW]living_room_ImoutoOnani/segs_nebakku_seieki_nakadashi` + this._frames;
            QJ.MPMZ.tl.showAnimationFramePicture(this, 6, seieki, 0, posX, posY, scale, scale, 255, 0);
        }
        if (this._seiekiSotodashi) {
            // 外射的溅射精液
            let seieki = `[NSFW]living_room_ImoutoOnani/segs_nebakku_seieki_sotodashi` + this._frames;
            QJ.MPMZ.tl.showAnimationFramePicture(this, 9, seieki, 0, posX, posY, scale, scale, 255, 0);
        }

        this._frames++;
        // 色色音效
        if (this._frames === 3) {
            let seName = "[NSFW]bathroom_UdeTsukamiBakku_action" + Math.randomInt(6);
            if (this._seiekiNakadashi) seName = "[NSFW]livingroom_segsNebakku_nakadashiPisuton" + Math.randomInt(6);
            const volume = this._seiekiNakadashi ? 20 : 50;
            AudioManager.playVoice({ name: seName, volume, pitch: 95 + Math.randomInt(11), pan:0 }, false, 5); 
        }

        if (this._frames > end) {
            let start = 1;
            this._frames = start;
        }
        
        if (this._frames === 2 && this._shasei) {
            this._shaseiTimes  = this._shaseiTimes || 0;
            this._shaseiTimes += 1;
            const eid = this.data.eid;
            const nakadashi = this._shasei === "nakadashi";
            const sotodashi = this._shasei === "sotodashi";
            const seiekiNakadashi  = !!this._seiekiNakadashi;
            const seiekiSotodashi  = !!this._seiekiSotodashi;
            const shaseiTimes      = this._shaseiTimes;
            $gameMap.event(eid).steupCEQJ(3, {listenerId: this.index, nakadashi, sotodashi, seiekiNakadashi, seiekiSotodashi, shaseiTimes});
            //this.setDead();
            this._shasei = null;
            this._coolDown = 99999;
            return;
        }  

        this._coolDown = this._speed;        
        return;
    }

    // 动画监听器
    let listener = QJ.MPMZ.Shoot({
        groupName: ['nebakku', 'segs'],
        moveType: ['S', 0],
        existData: [],
        eid: this._eventId,
        moveF: [
		    [1, 0, QJ.MPMZ.tl.livingroomSegsNebakku, [{ refresh: true }]]
		],
        moveJS: [],
    });
    this.listenerId = listener.index;
    listener._kaoType = "A";

    // 预加载
    const preloadNames = [];
    for (let i = 1; i <= 6; i++) {
        preloadNames.push(
            "[NSFW]living_room_ImoutoOnani/segs_nebakku_action" + i,
            "[NSFW]living_room_ImoutoOnani/segs_nebakku_kaoA" + i,
            "[NSFW]living_room_ImoutoOnani/segs_nebakku_kaoB" + i,
            "[NSFW]living_room_ImoutoOnani/segs_nebakku_kaoC" + i,
            "[NSFW]living_room_ImoutoOnani/segs_nebakku_kaoD" + i
        );
    }
    ImageManager.preloadPicturesToGpu(preloadNames);
};

// 客厅-妹妹偷偷自慰
QJ.MPMZ.tl.livingroomImoutoOnaniSecretly = function(extra = {}) {

    const phaseEndMap = { 
            "actionA": 7, 
            "actionB": 6, 
            "actionSwitch": 19, 
            "zetchou": 9,
            "zetchou_alt": 9,
            "zetchouEnd": 19,
            "bareta": 13,
            "bareta_loop": 12
    };
    
    if (extra.refresh) {
        this._coolDown = this._coolDown || 0;	
        if (this._coolDown > 0) {
            this._coolDown -= 1;
            return;
        }

        this._frames = this._frames || 1;
        this._speed  = this._speed  || 4;	  
        const action = this._action || "actionA";
        const end    = phaseEndMap[action] || 7; 
        const posX   = this._isZoomed ? 580 : 990;
        let posY     = this._isZoomed ? 100 : 400; 
        const scale  = this._isZoomed ? 100 : 50;
        let IMG = `[NSFW]living_room_ImoutoOnani/ImoutoOnaniSecretly_${action}` + this._frames;
        $gameScreen.showPicture(5, IMG, 0, posX, posY, scale, scale, 255, 0);
        
        this._frames++;

        if (this._frames === 7 && ["bareta","bareta_loop"].includes(action)) {
            if (!this._hasNotNoticed) {
                this._hasNotNoticed = true;
                this._action = "bareta_loop";
            } else if (this._hasReacted) {
                this._hasReacted = null;
                this._action = "bareta";
            }
        }

        if (this._frames > end) {
            if (this._action === "zetchouEnd" || this._action === "bareta") {
                //this.setDead();
                this._coolDown = 9999999; 
                return;
            }

            let start = 1;

            if (["zetchou","zetchou_alt"].includes(action)) {
                if (!this._ZetchouEnded) {
                    start = 3;
                    this._speed = 5;
                    this._action = "zetchou_alt";
                    $gameScreen.showPicture(4, "[NSFW]living_room_ImoutoOnani/ImoutoOnaniSecretly_zetchou_alt10", 0, posX, posY, scale, scale, 255, 0);
                    $gameScreen.showPicture(6, "[NSFW]living_room_ImoutoOnani/ImoutoOnaniSecretly_zetchou_alt11", 0, posX, posY, scale, scale, 255, 0);            
                } else {
                    start = 10;
                    this._action = "zetchouEnd";
                    $gameScreen.showPicture(5, "[NSFW]living_room_ImoutoOnani/ImoutoOnaniSecretly_zetchou9", 0, posX, posY, scale, scale, 255, 0);
                    $gameScreen.erasePicture(4);
                    $gameScreen.erasePicture(6);
                    AudioManager.stopVoice(null, 5);
                }
            } 

            if (this._action === "actionB" && this._startZetchou) {
                this._action = "zetchou";
                let seName = "[NSFW]livingroom_ImoutoOnaniSecretly_zetchou";
                AudioManager.playVoice({ name: seName, volume: 50, pitch: 75, pan:0 }, true, 5);
            }

            if (this._action === "actionSwitch") {
                this._action = "actionB";
            }

            if (this._action === "actionA" && this._needSwitch) {
                this._needSwitch = null;
                this._action = "actionSwitch"
            }
            if (this._action === "bareta_loop") {
                start = 6;
            }                        
            this._frames = start;
        }
        // 色色音效
        if (this._action === "actionA" && this._frames === 4) {
            let seName = "[NSFW]livingroom_ImoutoOnaniSecretly" + Math.randomInt(5);
            AudioManager.playVoice({ name: seName, volume: this._isZoomed ? 80 : 20, pitch: 100, pan:0 }, false, 5);
        } else if (this._action === "actionB" && this._frames === 3) {
            let seName = "[NSFW]livingroom_ImoutoOnaniSecretly" + (5 + Math.randomInt(5));
            AudioManager.playVoice({ name: seName, volume: 80, pitch: 100, pan:0 }, false, 5);
        } else if (this._action === "actionSwitch" && [10,16].includes(this._frames)) {
            let seName = "[NSFW]livingroom_ImoutoOnaniSecretly" + Math.randomInt(10);
            AudioManager.playVoice({ name: seName, volume: 80, pitch: 100, pan:0 }, false, 5);            
        } else if (["bareta","bareta_loop"].includes(action) && this._frames === 8) {
            let seName = "[NSFW]livingroom_ImoutoOnaniSecretly" + Math.randomInt(5);
            AudioManager.playVoice({ name: seName, volume: 80, pitch: 100, pan:0 }, false, 5);            
        } 

        if (this._action === "actionSwitch") {
            if (this._frames === 3) {
                // 被妹妹发现在偷窥
                const chance = 0.4;
                const eid = this.data.eid;
                if (chance > Math.random() || $gameMap.chahuiMapTemp?.forceDetected) {
                    this._action = "bareta";
                    this._frames = 1;
                    if (!$gameMap.chahuiMapTemp?.forceDetected) {
                        $gameMap.event(eid).steupCEQJ(2, {listenerId: this.index});
                    }
                } else {
                // 顺利切换动作 
                    $gameMap.event(eid).steupCEQJ(1, {switchAction:true, listenerId: this.index});   
                }
            }
        }       
        
        this._coolDown = this._speed;        
        return;
    }

    // 动画监听器
    let listener = QJ.MPMZ.Shoot({
        groupName: ['onani', 'segs'],
        moveType: ['S', 0],
        eid: this._eventId,
        existData: [],
        moveF: [
		    [1, 0, QJ.MPMZ.tl.livingroomImoutoOnaniSecretly, [{ refresh: true }]]
		],
        moveJS: [],
    });
    this.listenerId = listener.index;
    listener._action = "actionA";

    // 预加载
    const preloadNames = [];
    for (let i = 1; i <= 19; i++) {
        preloadNames.push("[NSFW]living_room_ImoutoOnani/ImoutoOnaniSecretly_actionSwitch" + i);
    }
    for (let i = 1; i <= 6; i++) {
        preloadNames.push("[NSFW]living_room_ImoutoOnani/ImoutoOnaniSecretly_actionB" + i);
    }
    for (let i = 3; i <= 11; i++) {
        preloadNames.push("[NSFW]living_room_ImoutoOnani/ImoutoOnaniSecretly_zetchou_alt" + i);
    }
    for (let i = 10; i <= 19; i++) {
        preloadNames.push("[NSFW]living_room_ImoutoOnani/ImoutoOnaniSecretly_zetchouEnd" + i);
    }
    ImageManager.preloadPicturesToGpu(preloadNames);
};

// 浴室segs-站立式后背位
QJ.MPMZ.tl.bathroomTachiBakku = function(extra = {}) {

   if (extra.refresh) {
      this._coolDown = this._coolDown || 0;	
      if (this._coolDown > 0) {
          this._coolDown -= 1;
          return;
      }
      this._frames  = this._frames || 1;
      
      let posX    = 0;
      let posY    = 0;
      let opacity = 255;
      let scale   = 100;
      
      let IMG = "[NSFW]bathroom_homban/bathroom_TachiBakku_action" + this._frames;
      if (this._alterAction || this._shasei) IMG = "[NSFW]bathroom_homban/bathroom_TachiBakku_shasei" + this._frames;
      $gameScreen.showPicture(6, IMG, 0, posX, posY, scale, scale, opacity, 0);

      if (this._kaoType) {
          let kao = `[NSFW]bathroom_homban/bathroom_TachiBakku_kao${this._kaoType}` + this._frames;
          if (this._alterAction || this._shasei) {
              kao = `[NSFW]bathroom_homban/bathroom_TachiBakku_shasei_kao${this._kaoType}` + this._frames;
          }
          $gameScreen.showPicture(10, kao, 0, posX + 860, posY + 70, scale, scale, opacity, 0);
      }

      // 精液图层
      if (this._shasei) {
          let seieki = "[NSFW]bathroom_homban/bathroom_TachiBakku_seieki" + this._frames;
          // 需要区分首次射精时和重复射精
          if (this._frames <= 9 && this._shaseiTimes === 0) seieki = "";
          if (!!seieki) {
              $gameScreen.showPicture(8, seieki, 0, posX + 200, posY + 700, scale, scale, opacity, 0);
          }
      }

      // 恶魔眼球效果-剖面图
      if ($gameTemp._xrayVisionEffect) {
          let xrayVision = "[NSFW]bathroom_homban/bathroom_TachiBakku_action_cutawayView" + this._frames;
          if (this._alterAction) xrayVision = "[NSFW]bathroom_homban/bathroom_TachiBakku_alterAction_cutawayView" + this._frames;
          if (this._alterAction && this._frames > 9 && this._frames < 22) xrayVision = "";
          if (this._shasei) {
              xrayVision = "[NSFW]bathroom_homban/bathroom_TachiBakku_shasei_cutawayView" + this._frames;
              if (this._shaseiTimes === 0 && this._frames < 12) {
                  // 首次射精时                
                  xrayVision = "[NSFW]bathroom_homban/bathroom_TachiBakku_shasei_cutawayViewA" + this._frames;
                  if (this._frames < 5) {
                      xrayVision = "[NSFW]bathroom_homban/bathroom_TachiBakku_alterAction_cutawayView" + this._frames;
                  }
              }
          }
          let xrayPosX = posX + 450;
          let xrayPosY = posY + 800;
          let Xopacity = Number($gameTemp._xrayVisionEffect) || 0;
          if (!!xrayVision) {
              $gameScreen.showPicture(7, xrayVision, 0, xrayPosX, xrayPosY, scale, scale, Xopacity, 0);
          }
      }

      // segs音效
      if (this._frames === 4) {
          let seName = "[NSFW]bathroom_UdeTsukamiBakku_action" + (1 + Math.randomInt(5));
          if (this._alterAction || this._shasei) seName = "[NSFW]bathroom_UdeTsukamiBakku_action0";
          AudioManager.playVoice({ name: seName, volume: 60, pitch: 100, pan: 0 }, false, 2);
      }

      this._frames += 1;
      let end = (this._alterAction || this._shasei) ? 26 : 11;
      if (this._frames > end) {
          if (this._shasei) {
              this._shaseiTimes += 1;
              this._speed += 1;
              this._speed = Math.min(5, this._speed);
              // 哥哥燃尽，结束动作
              if (this._shaseiTimes > 3 || this._isExhausted) {
                  if (this._shaseiTimes > 3) {
                      const eid = this.data.eid;
                      const listenerId = this.index;
                      $gameMap.event(eid)?.steupCEQJ(3, {listenerId, jigo: true});                    
                  }
                  this.setDead();
                  return;
              }
          }
          this._frames = 1;
          if (this._preparingThrust && this._kaoType !== "A") {
              this._alterAction = true;
              this._coolDown += this._speed;
              this._preparingThrust = null;
              return;
          } else {
            this._alterAction = false;
            if (this._needShasei) {
                this._shasei = true;
                this._needShasei = undefined;
            }
          }
      }
      
      if (this._frames === 12 && this._shasei) {
          // 触发射精动事件结算
          const eid = this.data.eid;
          const listenerId = this.index;
          $gameMap.event(eid)?.steupCEQJ(3, {listenerId});
      }

      if (!this._shasei && this._frames > 11 && this._frames < 22) {
          // 深插动作效果有明显后摇时间，要缩短
          this._coolDown = 2;
          return;
      }

      this._coolDown += this._speed;
      return;
   }

    // 动画播放器/监听器
    const listener = 
    QJ.MPMZ.Shoot({
      groupName: ['TachiBakku'],
      eid: this._eventId,
      existData: [ 
      ],
      moveF: [
          [10, 0, QJ.MPMZ.tl.bathroomTachiBakku, [{refresh:true}]]
      ],
    });
    // 标记监听器ID
    this.listenerId       = listener.index;
    listener._kaoType     = "A";
    listener._speed       = 4;
    listener._shaseiTimes = 0;
    listener._coolDown    = 999999;
    // 预加载
    let need = $gameParty.hasItem($dataArmors[75], true);
    for (let i = 1; i <= 11; i++) {
        ImageManager.loadPicture( `[NSFW]bathroom_homban/bathroom_TachiBakku_action${i}` );
        ImageManager.loadPicture( `[NSFW]bathroom_homban/bathroom_TachiBakku_kaoA${i}` );
        if (need) ImageManager.loadPicture( `[NSFW]bathroom_homban/bathroom_TachiBakku_action_cutawayView${i}` );
    }
};

// 浴室segs-双手固定式后背位
QJ.MPMZ.tl.bathroomUdeTsukamiBakku = function(extra = {}) {
	
   if (extra.refresh) {
      this._coolDown = this._coolDown || 0;	
      if (this._coolDown > 0) {
          this._coolDown -= 1;
          return;
      }
      this._frames = this._frames || 1;
      this._speed  = this._speed  || 4;	  
      this._action = this._action || "";
      
      let posX    = 0;
      let posY    = 0;
      let opacity = 255;
      let scale   = 100;
      if ($gameMap?.chahuiMapTemp?.mirrorView) {
          posX    = 150;
          posY    = -80;
          opacity = 240;   
          scale   = 110;     
      }

      let base = `bathroom_UdeTsukamiBakku_action${this._action}`;
      let IMG = `[NSFW]bathroom_homban/${base}` + this._frames;
      $gameScreen.showPicture(6, IMG, 0, posX, posY, scale, scale, opacity, 0);
      // 恶魔眼球效果-剖面图
      if ($gameTemp._xrayVisionEffect) {
          let xrayVision = `[NSFW]bathroom_homban/${base}_cutawayView` + this._frames;
          let xrayPosX = 200;
          let xrayPosY = 700;
          let Xopacity = Number($gameTemp._xrayVisionEffect) || 0;
          if ($gameMap?.chahuiMapTemp?.mirrorView) {
              xrayPosX = 370;
              xrayPosY = 690;
              Xopacity = Math.round(Xopacity * 0.94) || 0;   
          }         
          $gameScreen.showPicture(7, xrayVision, 0, xrayPosX, xrayPosY, scale, scale, Xopacity, 0);
      }

      // segs音效
      let segsSeFlag = this._action === "B" ? 5 : 9;
      if (this._frames === segsSeFlag) {
          let pan = 0;
          let isLoop = this._needLoopVoice;
          if ($gameMap?.chahuiMapTemp?.mirrorView)  pan = -(35 + Math.randomInt(20));
          let seName = "[NSFW]bathroom_UdeTsukamiBakku_action" + Math.randomInt(6);
          AudioManager.playVoice({ name: seName, volume: 60, pitch: 100, pan }, false, 2);
          let voiceName = "[NSFW]bathroom_UdeTsukamiBakku_actionVoice" + Math.randomInt(11);
          if (isLoop) voiceName = "[NSFW]bathroom_UdeTsukamiBakku_actionVoice";
          if (!this._isLoopVoice && (!AudioManager.isExistVoiceChannel(1) || isLoop)) {
              AudioManager.playVoice({ name: voiceName, volume: 65, pitch: 100, pan }, isLoop, 3);  
              this._isLoopVoice = isLoop;
          }      
      }

      if (this._startSwitch === "A" && this._frames === 9) {
          this._frames = 1;        
          this._action = "";
          this._speed = 4;
          this._startSwitch = null;
      }      
      if (this._startSwitch === "B" && this._frames === 14) {
          this._frames = 1;
          this._action = "B";
          this._speed = 3;
          this._startSwitch = null;
      }
      
      let shaseiFrame = 14;
      if (this._action === "B") shaseiFrame = 9;
      if (this._shasei && this._frames === shaseiFrame) {
          // 触发射精动画
          if (!$gameMap._filterConArr.get('adjustment7') && $gameMap?.chahuiMapTemp?.mirrorView) {   
              let pid = 7;
              let id = `adjustment${pid}`;
              let filterTarget = 5000 + pid;
              $gameMap.createFilter(id, "adjustment", filterTarget);
              $gameMap.setFilter( id ,[1,1,1,0.90,1,1,1,1]);
          }             		  
          $gameScreen.showPicture(7, '', 0, posX, posY, scale, scale, opacity, 0);
          const pic = $gameScreen.picture(7);
          pic.setVideoLoop(false);
          pic.setVideoPause(false);
          pic.setVideoSpeed(66);
          AudioManager.stopVoice(null, 1);
          let se = "[NSFW]bathroom_UdeTsukamiBakku_shasei";
          AudioManager.playVoice({ name: se, volume: 60, pitch: 100, pan: 0 }, false, 2);
          let voice = "[NSFW]bathroom_UdeTsukamiBakku_shaseiVoice" + Math.randomInt(2);
          AudioManager.playVoice({ name: voice, volume: 90, pitch: 100, pan: 0 }, false, 3);              
          const eid = this.data.eid;
          if ($gameMap?.chahuiMapTemp?.bathTogether || $gameMap.chahuiMapTemp?.isTriggeredFromBathtub) {
              $gameMap.event(7)?.steupCEQJ(1, { shasei: true });
              $gameMap.event(3)?.steupCEQJ(5, { jigo: true });
          } else {
              $gameMap.event(eid)?.steupCEQJ(1, { shasei: true });
              $gameMap.event(eid)?.steupCEQJ(2, { jigo: true });
          }
          setTimeout(() => $gameScreen.erasePicture(6), 30);       
          this.setDead();
          return;
      }

      this._frames += 1;
      let end = 14;
      if (this._action === "B") {
          end = 9;
      }
      if (this._frames > end) {
          this._frames = 1;
      }
    
      this._coolDown = this._speed;
      return;
   }

    // 动画播放器/监听器
    let listener = 
    QJ.MPMZ.Shoot({
      groupName: ['udeTsukamiBakku'],
      eid: this._eventId,
      existData: [ 
      ],
      moveF: [
          [60,0,QJ.MPMZ.tl.bathroomUdeTsukamiBakku,[{refresh:true}]]
      ],
    });
    // 标记监听器ID
    this.listenerId    = listener.index;
    // 初始帧标记
    let startFrame = 11;
    listener._frames   = 11;
    let IMG = "[NSFW]bathroom_homban/bathroom_UdeTsukamiBakku_prepPhase";
    if (extra.setAction === "B") {
        listener._action = "B";
        startFrame = 1;
        IMG = "[NSFW]bathroom_homban/bathroom_UdeTsukamiBakku_actionB1";
    }
    listener._frames = startFrame;
    listener._coolDown = 999999;
    $gameScreen.showPicture(6, IMG, 0, 0, 0, 100, 100, 255, 0);    
    $gameScreen.erasePicture(5);
    $gameScreen.erasePicture(8);
    // 预加载
    let need = $gameParty.hasItem($dataArmors[75], true);
    for (let i = 1; i <= 14; i++) {
        ImageManager.loadPicture( `[NSFW]bathroom_homban/bathroom_UdeTsukamiBakku_action${i}` );
        if (need) ImageManager.loadPicture( `[NSFW]bathroom_homban/bathroom_UdeTsukamiBakku_action_cutawayView${i}` );
    } 
    for (let i = 1; i <= 9; i++) {
        ImageManager.loadPicture( `[NSFW]bathroom_homban/bathroom_UdeTsukamiBakku_actionB${i}` );
        if (need) ImageManager.loadPicture( `[NSFW]bathroom_homban/bathroom_UdeTsukamiBakku_actionB_cutawayView${i}` );
    }      
};

// 浴室-帮哥哥洗澡-口交
QJ.MPMZ.tl.bathroomBatheOniiChanBlowjob = function(extraData = {}) {
    const BASE_PATH = "[NSFW]bathroom_blowjob/bathroom_blowjob";

    // 帧刷新逻辑
    if (extraData.refresh) {
        this._coolDown = this._coolDown || 0;
        if (this._coolDown > 0) {
            this._coolDown--;
            return;
        }
		
        this._frames = this._frames || 1;
        this._speed = this._speed || 4;
        // 显示关键帧
        let imgName = BASE_PATH + this._frames;
        if (this._frames >= 90) {
            if (this._cumInMouth) imgName = BASE_PATH + "_cum" + this._frames;
            $gameScreen.showPicture(5, imgName, 0, 180, 380, 100, 100, 255, 0);
        } else {
            $gameScreen.showPicture(5, imgName, 0, 180, 0, 100, 100, 255, 0);
        }

        // --- 剖面图 ---
        if ($gameTemp._xrayVisionEffect && this._frames >= 27 && this._frames <= 81) {
            let cutawayImg = BASE_PATH + "_cutawayView" + this._frames;
			let opacity = Number($gameTemp._xrayVisionEffect) || 0;
            $gameScreen.showPicture(7, cutawayImg, 0, 380, 200, 100, 100, opacity, 0);
        }

        this._frames++;

        // --- 配置不同阶段的结束帧 ---
        const phaseEndMap = { 
		      2: 17, 
			  5: 23, 
			  9: 42, 
			  11: 68, 
			  13: 74, 
			  14: 88, 
			  20: 101 
		};
        this._endFrames = phaseEndMap[this._setPhase] || 12;

        // --- 特殊帧触发逻辑 (动作切换/射精) ---
        const triggers = [
		    { cond: this._frames === 5, voice:2 }, // 舔音效
			{ cond: this._frames === 99, voice:20 }, // 撸肉棒音效
			{ cond: this._frames === 41, voice:10 }, // 口交-浅入音效
			{ cond: this._frames === 48, voice:11 }, // 口交-浅转深音效
			{ cond: this._frames === 65, voice:13 }, // 口交-深入音效
            { cond: this._frames === 36 && this._switchPhase === 11, phase: 11, frame: 43 }, // 浅入 -> 深入
            { cond: this._frames === 64 && this._switchPhase === 13, phase: 13, frame: 69 }, // 深入 -> 浅入
            { cond: this._frames === 63 && this._shasei, phase: 14, frame: 75, ceqj: 15, ceqjType: 4 }, // 深喉射精预备
            { cond: this._frames === 91 && this._cumInMouth && this._shasei, frame: 90, ceqj: 23, ceqjType: 3, pause: true }, // 二次颜射
			{ cond: this._frames === 91 && this._switchPhase === 1, frame: 1, ceqj: 1, ceqjType: 1, pause: true }, // 结束初始爱抚动作
            { cond: this._frames === 95 && !this._cumInMouth && this._shasei, frame: 90, ceqj: 21, ceqjType: 3, pause: true, setCum: true } // 一次颜射
        ];

        for (let t of triggers) {
            if (t.cond) {
                if (t.phase !== undefined) {
					this._setPhase     = t.phase;
					this._disableReset = undefined;
				}
                if (t.frame !== undefined) this._frames = t.frame;
                if (t.ceqj) {
                    const eid = this.data.eid;
                    $gameMap.event(eid)?.steupCEQJ(t.ceqjType, { setPhase: t.ceqj, listenerId: this.index });
                }
                if (t.pause) this._coolDown = 99999;
                else this._coolDown += this._speed;
                /*
                if (this._frames !== 43) {
					// 浅入抽插拥有射精标记时需跳过重置
					this._shasei = undefined;
				}
				*/
                if (!this._disableReset) this._switchPhase = undefined;
                if (t.setCum) this._cumInMouth = true;
				
				if (t.voice !== undefined) {
				 // 口交效果音	
				   let action = t.voice;
				   if (action === 10) action = 11;
				   let voice  = `[NSFW]bathroom_blowjob_action${action}_` + Math.randomInt(4);
				   AudioManager.playVoice({ name: voice, volume: 60, pitch: 100, pan: 0 }, false, 6);
				}
                return;
            }
        }

        // --- 循环与阶段跳转逻辑 ---
        if (this._frames > this._endFrames) {
            const jumpLogic = {
                2:  { nextPhase: 4, ceqj: 1 },
                5:  { nextPhase: 6, ceqj: 1 },
                9:  { resetFrame: 27 },
                11: { resetFrame: 53 },
                13: { resetFrame: 27, nextPhase: 9 },
                14: { nextPhase: 15, ceqj: 2 },
                20: { resetFrame: 90 }
            };

            let logic = jumpLogic[this._setPhase];
            if (logic) {
                if (logic.ceqj) {
                    this._coolDown = 99999;
                    const eid = this.data.eid;
                    $gameMap.event(eid).steupCEQJ(logic.ceqj, { setPhase: logic.nextPhase, listenerId: this.index });
                    return;
                }
                if (logic.resetFrame) this._frames = logic.resetFrame;
                if (logic.nextPhase) this._setPhase = logic.nextPhase;
				if (this._setPhase === 9 && this._shasei) this._switchPhase = 11;
                this._coolDown += this._speed;
                return;
            }
            this._frames = 1;
        }

        this._coolDown += this._speed;
        return;
    }


    if (extraData.videoSe) {
        this._coolDown = this._coolDown || 0;
        if (this._coolDown > 0) {
            this._coolDown--;
            return;
        }
		
		let phase = extraData.phase;
		const timeRange = {
			4:  { min: 0.36,  max: 0.43, coolDown: 70},
			6:  { min: 0.15,  max: 0.66, coolDown: 55},
			8:  { min: 0.15,  max: 0.66, coolDown: 40}
		};		
		let seRange = timeRange[phase];
		if (!seRange) return;
		
		let pid = extraData.videoPid || 6;
		let pic = $gameScreen.picture(pid);
		if (!pic?.isVideo()) {
			this.setDead({ t: ["Time", 0] });
			return;
		}	
		let time  = $gameMap.getPictureVideoCurrentTime(pid);
		//console.log(extraData, time);	
		if (time >= seRange.min && time <= seRange.max) {
			if (phase === 8) phase = 6;
		    let voice  = `[NSFW]bathroom_blowjob_action${phase}_` + Math.randomInt(5);
		    AudioManager.playVoice({ name: voice, volume: 60, pitch: 100, pan: 0 }, false, 6);
			this._coolDown = seRange.coolDown;
		}	        		
		return;
	}

    // 动画帧预加载逻辑
    if (extraData.preloadAnimationFrames) {
        const p = extraData.preloadAnimationFrames;
        const preloadNames = [];
        const load = (f) => preloadNames.push(BASE_PATH + f);
        const loadCut = (f) => preloadNames.push(BASE_PATH + "_cutawayView" + f);
        const loadCum = (f) => preloadNames.push(BASE_PATH + "_cum" + f);

        const preloadConfigs = {
			2:  () => { for (let i = 1;   i <= 12; i++) load(i); },
            3:  () => { for (let i = 13;  i <= 17; i++) load(i); },
            5:  () => { for (let i = 18;  i <= 23; i++) load(i); },
            9:  () => { for (let i = 24;  i <= 42; i++) { load(i); if (i >= 27) loadCut(i); } },
            11: () => { for (let i = 43;  i <= 68; i++) { load(i); loadCut(i); } },
            13: () => { for (let i = 69;  i <= 74; i++) { load(i); loadCut(i); } },
            20: () => { for (let i = 90; i <= 101; i++) { load(i); loadCum(i); } }
        };

        if (preloadConfigs[p]) {
            preloadConfigs[p]();
            ImageManager.preloadPicturesToGpu(preloadNames);
        }
        return;
    }

    // 动画监听器
	QJ.MPMZ.deleteProjectile('blowjob');
    let listener = QJ.MPMZ.Shoot({
        groupName: ['blowjob', 'segs'],
        existData: [],
        eid: this._eventId,
        moveF: [
		    [1, 0, QJ.MPMZ.tl.bathroomBatheOniiChanBlowjob, [{ refresh: true }]]
		],
        moveJS: [],
    });
    this.listenerId = listener.index;
	
	if(extraData.initialAction) {
	   listener._setPhase = 20;
       listener._frames   = 90;
	   listener._disableReset = true;
       //listener._cumInMouth = true;  
	} else {
	  setTimeout(() => $gameScreen.erasePicture(6), 30);
	}

};

// 客厅-一起看电视-肛交
QJ.MPMZ.tl.livingRoomWatchTVTogetherAnalSegs = function(extraData = {}) {
	
   if (extraData.refresh) {
	  // 帧刷新流程   
	  this._coolDown = this._coolDown || 0;	
	  if (this._coolDown > 0) {
	     this._coolDown -= 1;
	     return;
	  }
	  this._frames = this._frames || 1;
      this._speed  = this._speed  || 4;	  
	  let IMG      = "living_room/[NSFW]livingRoom_watchTVTogether_analSegs_action" + this._frames;
	  $gameScreen.showPicture(7, IMG, 0, 520, 60, 100, 100, 255, 0); 

      if (this._aieki) {
        // 爱液图层
          let aieki = "living_room/[NSFW]livingRoom_watchTVTogether_analSegs_aieki" + this._frames;
          $gameScreen.showPicture(8, aieki, 0, 820, 460, 100, 100, 255, 0); 
      }

      if (this._seieki) {
        // 精液图层
          let seieki = "living_room/[NSFW]livingRoom_watchTVTogether_analSegs_seieki" + this._frames;
          $gameScreen.showPicture(10, seieki, 0, 880, 560, 100, 100, 255, 0); 
      }

      // 抽查动作音效
      let seName   = `[NSFW]livingRoom_ImoutoScared_segs_A` + Math.randomInt(5);

      if (this._kao) {
        // 阿嘿颜图层
          let kaoType = this._kao;
          let kao = `living_room/[NSFW]livingRoom_watchTVTogether_analSegs_ahegao${kaoType}` + this._frames;
          $gameScreen.showPicture(11, kao, 0, 920, 200, 100, 100, 255, 0); 
      }
	  // 射精判断
	  if (this._shasei) {
          this._kao = "A";
          this._seieki = true;
          this._shaseiTimes = this._shaseiTimes || 0;
          this._shaseiTimes += 1;
          // 射精音效
          let shaseiTimes = Math.min(2, this._shaseiTimes);			  
          let shaseSe     = `[NSFW]livingRoom_ImoutoScared_segs_shasei` + (shaseiTimes * 2 + Math.randomInt(2));
          AudioManager.playVoice({ name: shaseSe, volume: 60, pitch: 100, pan: 0 }, false, 7);			  
          setTimeout( () => {
                AudioManager.stopVoice();
                let se = "[NSFW]livingRoom_watchTVTogether_analSegs15";
                AudioManager.playVoice({ name: se, volume: 90, pitch: 100, pan: 0 }, false, 4);
          }, 300);	
          $gameMap.event(14).steupCEQJ(3);
          this._coolDown = 99999999;
          return;
      }

	  // 妹妹娇喘
	  this._gaspsCount = this._gaspsCount || 0;
	  this._gaspsCount += 1; 
	  let gaspsCountLimt = 3;
	  if (this._kao === "A" || this._kao === "B") gaspsCountLimt = 0;
	  if (this._gaspsCount > gaspsCountLimt) {
		  if (!AudioManager.isExistVoiceChannel(6) && !AudioManager.isExistVoiceChannel(1)) {
			  let base = 1, span = 5;
			  if (this._kao === "A")      { base = 6;  span = 5; }
			  else if (this._kao === "B") { base = 11; span = 5; }
				let newgasps;
				do {
				  newgasps = base + Math.randomInt(span);
				} while (newgasps === this._oldgasps && span > 1); // span==1 时避免死循环
			  let gasps = "[NSFW]livingRoom_watchAdultMovie_gasps" + newgasps;
			  this._oldgasps = newgasps;
			  AudioManager.playVoice({ name: gasps, volume: 90, pitch: 100, pan: 0 }, false, 6);
			  this._gaspsCount = 0;
		  } else {
			  this._gaspsCount = 0;
		  }
	  }		        

      if (this._frames === 7 && this._needShasei) this._shasei = true;	 
      // 抽插动作音效
      if (this._frames === 6) AudioManager.playVoice({ name: seName, volume: 60, pitch: 100, pan: 0 }, false, 7);		
      if (!this._shasei)  this._frames += 1;   
      if (this._frames > 12)  this._frames = 1;
      if (this._frames === 2) this._frames += 1;
	  this._coolDown += this._speed;	  
	  return; 
   }
   
   // 动画播放器/监听器
   let listener = QJ.MPMZ.Shoot({
	                 groupName: ['AnalSegs','segs'],
                     existData: [ 
	                 ],
                     moveF: [
                        [30,0,QJ.MPMZ.tl.livingRoomWatchTVTogetherAnalSegs,[{refresh:true}]],
                     ]			 
                  });
    this.listenerId = listener.index;
    if (!$gameScreen.picture(1)) {
        $gameScreen.showPicture(1, 'living_room/living_S_N_RL', 0, -1400, -700, 100, 100, 255, 0);
    }
    // 预加载
    const preloadNames = [];
    for (let i = 1; i <= 12; i++) {
        if (i === 2) continue;
        preloadNames.push(
            "living_room/[NSFW]livingRoom_watchTVTogether_analSegs_action" + i,
            "living_room/[NSFW]livingRoom_watchTVTogether_analSegs_aieki" + i,
            "living_room/[NSFW]livingRoom_watchTVTogether_analSegs_seieki" + i,
            "living_room/[NSFW]livingRoom_watchTVTogether_analSegs_ahegaoA" + i,
            "living_room/[NSFW]livingRoom_watchTVTogether_analSegs_ahegaoB" + i
        );
    }
    ImageManager.preloadPicturesToGpu(preloadNames);
};

// 客厅-一起看电视-背面座位(抱)segs
QJ.MPMZ.tl.livingRoomWatchTVTogetherHaimenzaiAlter = function(extraData = {}) {
	
   if (extraData.refresh) {
	// 帧刷新流程   
	  this._coolDown = this._coolDown || 0;	
	  if (this._coolDown > 0) {
	     this._coolDown -= 1;
	     return;
	  }
	  this._frames = this._frames || 1;
      this._speed  = this._speed  || 4;	  
	  let type     = this._kaoType ? this._kaoType : "";
      let target   = $gameScreen.picture(1);
      let scale    = target?._scaleX || 100;
      let posX     = scale > 50 ? 1920 : 960; 
      let posY     = scale > 50 ? 760  : 380;
  	      posX    += target?._x || -1400;
		  posY    += target?._y || -700;
	  let IMG      = `living_room/[NSFW]livingRoom_watchTVTogether_reverseCowgirl_alt_action${type}` + this._frames;
	  
	  if (this._needSwitchKao) {
		  if (this._needSwitchKao === "A") {
			  IMG = `living_room/[NSFW]livingRoom_watchTVTogether_reverseCowgirl_alt_action_ahegao_switchA` + this._frames;
			  if (this._frames === 6) {
			      this._needSwitchKao = undefined;
			      this._kaoType = "_ahegaoA";	
				  AudioManager.stopVoice(null, 6);  
			  }
		  }
		  if (this._needSwitchKao === "B") {
			  IMG = `living_room/[NSFW]livingRoom_watchTVTogether_reverseCowgirl_alt_action_ahegaoB` + this._frames;
			  this._needSwitchKao = undefined;
			  this._kaoType = "_ahegaoB";
			  AudioManager.stopVoice(null, 6);
		  }		  
	  }
	  
	  if (!this._shasei) $gameScreen.showPicture(6, IMG, 0, posX, posY, scale, scale, 255, 0);
	  
	  let seName   = `[NSFW]livingRoom_ImoutoScared_segs_A` + Math.randomInt(5);
	  let volume   =  80;   
		  
	  // 中出判断
	  if (this._shasei) {
		  this._needShasei   = undefined;
		  this._shaseiFrames = this._shaseiFrames || 1;
		  this._shaseiTimes  = this._shaseiTimes  || 0;
		  IMG                = "living_room/[NSFW]livingRoom_watchTVTogether_reverseCowgirl_alt_shasei" + this._shaseiFrames;
		  
		  if (!!type) {
			  IMG            = "living_room/[NSFW]livingRoom_watchTVTogether_reverseCowgirl_alt_ahegao_shasei" + this._shaseiFrames;
		  }		  
	      $gameScreen.showPicture(6, IMG, 0, posX, posY, scale, scale, 255, 0);
		  
		  if (!this._shaseSe) {
			  // 射精音效
			  this._shaseSe   = true;
              let shaseiTimes = Math.min(2, this._shaseiTimes);			  
			  let shaseSe     = `[NSFW]livingRoom_ImoutoScared_segs_shasei` + (shaseiTimes * 2 + Math.randomInt(2));
			  AudioManager.playVoice({ name: shaseSe, volume: 60, pitch: 100, pan: 0 }, false, 7);			  
			  setTimeout( () => {
				   AudioManager.stopVoice();
				   let se = "[NSFW]living_room_watchHorrorMovie_segs" + ( 9 + Math.randomInt(2) );
				   AudioManager.playVoice({ name: se, volume: 90, pitch: 100, pan: 0 }, false, 3);
			  }, 300);		  
		  }
		  this._shaseiFrames  += 1; 
		  let limit = !!type ? 16 : 9;		  
		  if (this._shaseiFrames > limit) {
			  
			  if (!!type && !this._aftertaste) {
				  // 同时高潮后的余韵状态
				  this._aftertaste = true;
				  QJ.MPMZ.Shoot({
					 img: "imoutoUtil/[NSFW]livingRoom_watchTVTogether_reverseCowgirl_alt_aftertaste[4,30]",
	                 groupName: ['aftertaste','segs'],
					 position:[['S', posX + 380],['S', posY + 160]],
                     existData: [ 
	                 ],
                     moveJS: [],		
                     z:"A",		
                     moveType:['S',0],
					 anchor:[0,0],
                     initialRotation:['S',0],
                     onScreen:true					 
                  });
				  QJ.MPMZ.Shoot({
					 img: "imoutoUtil/[NSFW]livingRoom_watchTVTogether_reverseCowgirl_alt_aftertaste[2,6]",
	                 groupName: ['aftertaste','segs'],
					 position:[['S', posX + 380],['S', posY + 160]],
                     existData: [ 
	                 ],
                     moveJS: [
					     [90,  180, "this.changeAttribute('opacity', 1)"],
						 [108, 180, "this.changeAttribute('opacity', 0)"],
					 ],		
					 opacity: 0,
                     z:"A",		
                     moveType:['S',0],
					 anchor:[0,0],
                     initialRotation:['S',0],
                     onScreen:true					 
                  });				  
			  }
			  
			  // 射精结束
			  this._coolDown    += 9999999;
			  this._shasei       = undefined;
			  this._needSeieki   = true;
			  this._shaseiTimes += 1;  // 射精次数+1
			  this._shaseiFrames = undefined;
			  this._shaseSe      = undefined;
			  this._aftertaste   = undefined;
              return;			  
		  }
	  } else {
		$gameScreen.erasePicture(10);
	  }
	  
	  if (this._needSeieki) {
		  // 射精后的精液残留图层
		  IMG      = "living_room/[NSFW]livingRoom_watchTVTogether_reverseCowgirl_alt_seiekiA" + this._frames;
		  seName   = "[NSFW]livingRoom_ImoutoScared_segs_fillUpA" + Math.randomInt(5);
		  volume   = 45;
	      $gameScreen.showPicture(8, IMG, 0, posX, posY, scale, scale, 255, 0);
		  if (this._shaseiTimes > 1 && !this._needSeiekii) {
			  // 多次射精后的精液累加效果
			  IMG = "living_room/[NSFW]livingRoom_watchTVTogether_reverseCowgirl_alt_seiekiB";
			  $gameScreen.showPicture(9, IMG, 0, posX, posY, scale, scale, 255, 0);
			  this._needSeiekii = true;
		  }
	  }
	  
      if (!this._shasei)  this._frames += 1;
	  // 表情切换监听
      if (this._frames === 7 && this._needSwitchKao === "Aready") {
      	  this._needSwitchKao = "A";
	  }
	  // 妹妹娇喘
	  this._gaspsCount = this._gaspsCount || 0;
	  this._gaspsCount += 1; 
	  let gaspsCountLimt = 3;
	  if (this._kaoType === "_ahegaoA" || this._kaoType === "_ahegaoB") gaspsCountLimt = 0;
	  if (this._gaspsCount > gaspsCountLimt) {
		  if (!AudioManager.isExistVoiceChannel(6) && !AudioManager.isExistVoiceChannel(1)) {
			  let base = 1, span = 5;
			  if (this._kaoType === "_ahegaoA")      { base = 6;  span = 5; }
			  else if (this._kaoType === "_ahegaoB") { base = 11; span = 5; }
				let newgasps;
				do {
				  newgasps = base + Math.randomInt(span);
				} while (newgasps === this._oldgasps && span > 1); // span==1 时避免死循环
			  let gasps = "[NSFW]livingRoom_watchAdultMovie_gasps" + newgasps;
			  this._oldgasps = newgasps;
			  AudioManager.playVoice({ name: gasps, volume: 90, pitch: 100, pan: 0 }, false, 6);
			  this._gaspsCount = 0;
		  } else {
			  this._gaspsCount = 0;
		  }
	  }		  
	  // 体外射精判断	  
      if (this._frames === 2 && this._sotodashi) {
		  this.setDead({t:['Time',0]});
		  $gameMap.event(12)?.steupCEQJ(2, {kaoType: this._kaoType});
		  return;
	  }
	  if (this._frames === 9) AudioManager.playVoice({ name: seName, volume: 60, pitch: 100, pan: 0 }, false, 7);
      if (this._frames === 7 && this._needShasei) this._shasei = true;	 		  
	  if (this._frames > 8)  this._frames = 1;

	  
	  this._coolDown += this._speed;	  
	  return; 
   }
   
   // 背面座位（抱）动画播放器/监听器
   let listener = QJ.MPMZ.Shoot({
	                 groupName: ['haimenzaiKai','segs'],
                     existData: [ 
	                 ],
                     moveF: [
                        [30,0,QJ.MPMZ.tl.livingRoomWatchTVTogetherHaimenzaiAlter,[{refresh:true}]],
                     ],
                     moveJS: [
                        //[240,99999,"this._needSwitchKao = 'Aready';"],
						//[520,99999,"this._needSwitchKao = 'B';"],			
                        //[720,600,"this._needShasei = true;"],					
                     ],					 
                  });
    this.listenerId = listener.index;
    if (!$gameScreen.picture(1)) {
        $gameScreen.showPicture(1, 'living_room/living_S_N_RL', 0, -1400, -700, 100, 100, 255, 0);
	}
    if ($gameTemp._semenAppears) {
		listener._needSeieki    = true;
		listener._shaseiTimes   = 1;
		listener._needSwitchKao = 'Aready';
		$gameTemp._semenAppears = undefined;
		if ($gameScreen.picture(8)) {
		    $gameScreen.changePictureName(8, "living_room/[NSFW]livingRoom_watchTVTogether_reverseCowgirl_alt_seiekiA1");
		}		
	}
	
    // 预加载
    for (let i = 1; i <= 8; i++) {
	    ImageManager.loadPicture( "living_room/[NSFW]livingRoom_watchTVTogether_reverseCowgirl_alt_action" + i );
		ImageManager.loadPicture( "living_room/[NSFW]livingRoom_watchTVTogether_reverseCowgirl_alt_action_ahegaoA" + i );
		ImageManager.loadPicture( "living_room/[NSFW]livingRoom_watchTVTogether_reverseCowgirl_alt_action_ahegaoB" + i );
    }    
};

// 客厅-一起看电视-背面座位segs
QJ.MPMZ.tl.livingRoomWatchTVTogetherHaimenzai = function(extraData = {}) {

   if (extraData.refresh) {
	// 帧刷新流程   
	  this._coolDown = this._coolDown || 0;	
	  if (this._coolDown > 0) {
	     this._coolDown -= 1;
	     return;
	  }
	  this._frames = this._frames || 6;
      this._speed  = this._speed  || 4;	  
	  let type     = this._kaoType ? this._kaoType : "";
      let target   = $gameScreen.picture(1);
      let scale    = target?._scaleX || 100;
      let posX     = scale > 50 ? 1920 : 960; 
      let posY     = scale > 50 ? 760  : 380;
  	      posX    += target?._x || -1400;
		  posY    += target?._y || -700;
	  let IMG      = `living_room/[NSFW]livingRoom_watchTVTogether_reverseCowgirl_action${type}` + this._frames;
	  
	  if (this._needSwitchKao) {
		  if (this._needSwitchKao === "A") {
			  IMG = `living_room/[NSFW]livingRoom_watchTVTogether_reverseCowgirl_action_ahegao_switchA` + this._frames;
			  if (this._frames >= 11) {
			      this._needSwitchKao = undefined;
			      this._kaoType = "_ahegaoA";
                  AudioManager.stopVoice(null, 6);				  
			  }
		  }
		  if (this._needSwitchKao === "B" && this._frames >= 11) {
			  IMG = "living_room/[NSFW]livingRoom_watchTVTogether_reverseCowgirl_action_ahegao_switchB";
			  this._needSwitchKao = undefined;
			  this._kaoType = "_ahegaoB";
			  AudioManager.stopVoice(null, 6);
		  }		  
	  }
	  
	  $gameScreen.showPicture(6, IMG, 0, posX, posY, scale, scale, 255, 0);
	  
	  let seName   = `[NSFW]livingRoom_ImoutoScared_segs_A` + Math.randomInt(5);
	  let volume   =  80;   
		  
	  // 中出判断
	  if (this._shasei) {
		  this._needShasei   = undefined;
		  this._shaseiFrames = this._shaseiFrames || 1;
		  this._shaseiTimes  = this._shaseiTimes  || 0;
		  $gameTemp._semenAppears = true;
		  IMG                = "living_room/[NSFW]livingRoom_watchTVTogether_reverseCowgirl_shasei" + this._shaseiFrames;
	      $gameScreen.showPicture(6, IMG, 0, posX, posY, scale, scale, 255, 0);
		  
		  if (!!type) {
			  type           = "_ahegaoB" ? 3 : 2;
			  IMG            = "living_room/[NSFW]livingRoom_watchTVTogether_reverseCowgirl_kao" + type;
			  $gameScreen.showPicture(10, IMG, 0, posX, posY, scale, scale, 255, 0);
		  }
		  if (!this._shaseSe) {
			  // 射精音效
			  this._shaseSe   = true;
              let shaseiTimes = Math.min(2, this._shaseiTimes);			  
			  let shaseSe     = `[NSFW]livingRoom_ImoutoScared_segs_shasei` + (shaseiTimes * 2 + Math.randomInt(2));
			  AudioManager.playVoice({ name: shaseSe, volume: 60, pitch: 100, pan: 0 }, false, 7);			  
			  setTimeout( () => {
				   AudioManager.stopVoice();
				   let se = "[NSFW]living_room_watchHorrorMovie_segs" + ( 9 + Math.randomInt(2) );
				   AudioManager.playVoice({ name: se, volume: 90, pitch: 100, pan: 0 }, false, 3);
			  }, 300);		  
		  }
		  this._shaseiFrames  += 1; 
		  if (this._shaseiFrames > 9) {
			  if (!this._aftertaste) {
				  // 同时高潮后的余韵状态
				  this._aftertaste = true;
				  QJ.MPMZ.Shoot({
					 img: "imoutoUtil/[NSFW]livingRoom_watchTVTogether_reverseCowgirl_aftertaste[2,6]",
	                 groupName: ['aftertaste','segs'],
					 position:[['S', posX + 400],['S', posY + 175]],
                     existData: [ 
	                 ],
                     moveJS: [
					     [0,  180, "this.changeAttribute('opacity', 1)"],
						 [18,  180, "this.changeAttribute('opacity', 0)"],
					 ],		
					 opacity: 0,
                     z:"A",		
                     moveType:['S',0],
					 anchor:[0,0],
                     initialRotation:['S',0],
                     onScreen:true					 
                  });				  
			  }			  
			  // 射精结束
			  this._coolDown    += 9999999;
			  this._shasei       = undefined;
			  this._needSeieki   = true;
			  this._shaseiTimes += 1;  // 射精次数+1
			  this._shaseiFrames = undefined;
			  this._shaseSe      = undefined;
			  this._aftertaste   = undefined;
              return;			  
		  }
	  } else {
		$gameScreen.erasePicture(10);
	  }
	  
	  if (this._needSeieki) {
		  // 射精后的精液残留图层
		  IMG      = "living_room/[NSFW]livingRoom_watchTVTogether_reverseCowgirl_seiekiA" + this._frames;
		  seName   = "[NSFW]livingRoom_ImoutoScared_segs_fillUpA" + Math.randomInt(5);
		  volume   = 45;
	      $gameScreen.showPicture(8, IMG, 0, posX, posY, scale, scale, 255, 0);
		  if (this._shaseiTimes > 1 && !this._needSeiekii) {
			  // 多次射精后的精液累加效果
			  IMG = "living_room/[NSFW]livingRoom_watchTVTogether_reverseCowgirl_seiekiB";
			  $gameScreen.showPicture(9, IMG, 0, posX, posY, scale, scale, 255, 0);
			  this._needSeiekii = true;
		  }
	  }
	  
      if (!this._shasei)  this._frames += 1;
	  // 表情切换监听
      if (this._frames === 9 && this._needSwitchKao === "Aready") {
      	  this._needSwitchKao = "A";
	  }
	  // 体外射精判断	  
      if (this._frames === 2 && this._sotodashi) {
		  this.setDead({t:['Time',0]});
		  $gameMap.event(12)?.steupCEQJ(4, {sotodashiAnim:true, kaoType: this._kaoType});
		  return;
	  }
	  // 妹妹娇喘
	  this._gaspsCount = this._gaspsCount || 0;
	  this._gaspsCount += 1; 
	  let gaspsCountLimt = 3;
	  if (this._kaoType === "_ahegaoA" || this._kaoType === "_ahegaoB") gaspsCountLimt = 0;
	  if (this._gaspsCount > gaspsCountLimt) {
		  if (!AudioManager.isExistVoiceChannel(6) && !AudioManager.isExistVoiceChannel(1)) {
			  let base = 1, span = 5;
			  if (this._kaoType === "_ahegaoA")      { base = 6;  span = 5; }
			  else if (this._kaoType === "_ahegaoB") { base = 11; span = 5; }
				let newgasps;
				do {
				  newgasps = base + Math.randomInt(span);
				} while (newgasps === this._oldgasps && span > 1); // span==1 时避免死循环
			  let gasps = "[NSFW]livingRoom_watchAdultMovie_gasps" + newgasps;
			  this._oldgasps = newgasps;
			  AudioManager.playVoice({ name: gasps, volume: 90, pitch: 100, pan: 0 }, false, 6);
			  this._gaspsCount = 0;
		  } else {
			  this._gaspsCount = 0;
		  }
	  }	
	  
	  if (this._frames === 6) AudioManager.playVoice({ name: seName, volume: 60, pitch: 100, pan: 0 }, false, 7);
      if (this._frames === 8 && this._needShasei) this._shasei = true;	 		  
	  if (this._frames > 11)  {
		  // 切入到背面座位(抱)状态
		  if (this._switchPose) {
			  this.setDead({t:['Time',0]});
			  $gameMap.event(12)?.steupCEQJ(7, {});
			  return;
		  }
		  this._frames = 1;
	  }

	  
	  this._coolDown += this._speed;	  
	  return; 
   }

   if (extraData.bubbleText) {
	    // 妹妹气泡文字  
		if (this._disableBubbleText || this._shasei) return;
		let textArray = window.MapEventDialogue54?.["11"]?.["34"] ?? ['Missing translation'];
		let bubbleText = textArray[Math.floor(Math.random() * textArray.length)];
		$gameTemp.drill_GFTT_setBuffer( 7, 7 );
		$gameTemp.drill_GFTT_setStyle_context(bubbleText); 
		$gameTemp.drill_GFTT_createByBuffer( [1000,75], 180 );	
        return;		
   }

   if (extraData.ejaculationCountdown) {
	  // 射精倒计时和强制射精
	   if (extraData.autoEjaculation) {		   
		   let scene = SceneManager._scene;
		   let win   = scene._messageWindow._choiceWindow;
		   if (win && win.active) {
			   extraData.autoEjaculation.autoEjaculation = true;
			   let index = Math.randomInt(2);
			   win.select(index);
			   win.processOk();
		   }		   
		   return;
	   }	
	    let waitTime = 210;
		if (ConfigManager.language > 1) waitTime = 280;
        QJ.MPMZ.Shoot({
	       groupName: ['haimenzai','segs'],
           existData: [ 
		      {t:['Time',waitTime], a:['F',QJ.MPMZ.tl.livingRoomImoutoScaredKijoui,[{ejaculationCountdown:true, autoEjaculation:this}]]}
	       ],
        });	
        return;		
   }
	
   // 背面座位动画播放器/监听器
   let listener = QJ.MPMZ.Shoot({
	                 groupName: ['haimenzai','segs'],
                     existData: [ 
	                 ],
                     moveF: [
                        [80,0,QJ.MPMZ.tl.livingRoomWatchTVTogetherHaimenzai,[{refresh:true}]],
						[200,180,QJ.MPMZ.tl.livingRoomWatchTVTogetherHaimenzai,[{bubbleText:true}]]
                     ],
                     moveJS: [
						//[240,99999,"this._switchPose = true"],
                        //[240,99999,"this._needSwitchKao = 'Aready';"],
						//[520,99999,"this._needSwitchKao = 'B';"],
						//[800,460,"this._sotodashi = true;"],
                     ],					 
                  });
    this.listenerId = listener.index;
    if ($gameScreen.picture(1)) {
        $gameScreen.movePicture(1, 0, -1400, -700, 100, 100, 255, 0, 1);
    } else {
        $gameScreen.showPicture(1, 'living_room/living_S_N_RL', 0, -1400, -700, 100, 100, 255, 0);
	}		
    // 预加载
    for (let i = 1; i <= 11; i++) {
	    ImageManager.loadPicture( "living_room/[NSFW]livingRoom_watchTVTogether_reverseCowgirl_action" + i );
		ImageManager.loadPicture( "living_room/[NSFW]livingRoom_watchTVTogether_reverseCowgirl_action_ahegaoA" + i );
		ImageManager.loadPicture( "living_room/[NSFW]livingRoom_watchTVTogether_reverseCowgirl_action_ahegaoB" + i );
     } 
};

// 一起玩游戏-妹妹输掉游戏-口交
QJ.MPMZ.tl.gameItazuraBlowJob = function(extraData = {}) {

   if (extraData.massagePenis) {
	   
	  this._MPcoolDown = this._MPcoolDown || 0;	
	  if (this._MPcoolDown > 0) {
	     this._MPcoolDown -= 1;
	     return;
	  }
      this._MPframes = this._MPframes || 1; 
	  let penis = "[NSFW]game_itazura_POV/game_itazura_oniichan_lowerBody_massagePenis" + this._MPframes;
	  let hands = "[NSFW]game_itazura_POV/game_itazura_fera_massagePenis" + this._MPframes;
	  $gameScreen.showPicture(7, penis, 0, 550, 380, 100, 100, 255, 0);
      $gameScreen.showPicture(8, hands, 0, 550, 380, 100, 100, 255, 0);	  

      if (!this._MPplayback) {
   	    this._MPframes += 1;
	  } else {
	    this._MPframes -= 1;
	  }
	  if (this._MPframes <= 0) {
		  this._MPplayback = false;
		  this._MPframes = 1;
	  }
	  if (this._MPframes >= 8) {
		  this._MPplayback = true;
		  this._MPframes = 7;
	  }
	  this._MPcoolDown = 1;
	  return;
   }

   if (extraData.Blinking) {
	   
	  this._BcoolDown = this._BcoolDown || 0;	
	  if (this._BcoolDown > 0) {
	     this._BcoolDown -= 1;
	     return;
	  }
      this._Bframes = this._Bframes || 1; 
	  let eyes = "[NSFW]game_itazura_POV/game_itazura_fera_ImoutoFace_eyes" + this._Bframes;
	  $gameScreen.showPicture(6, eyes, 0, 700, 200, 100, 100, 255, 0);

      if (!this._Bplayback) {
   	    this._Bframes += 1;
	  } else {
	    this._Bframes -= 1;
	  }
	  if (this._Bframes <= 0) {
		  this._Bplayback = false;
		  this._BcoolDown = Math.randomInt(50) + 50;
		  this._Bframes = 1;
		  return;
	  }
	  if (this._Bframes >= 5) {
		  this._Bplayback = true;
		  this._Bframes = 3;
	  }
	  this._BcoolDown = 1;
	  return;
   }
   
	  let back      = "[NSFW]game_itazura_POV/game_itazura_background";
	  $gameScreen.showPicture(1, back, 0, 0, 0, 100, 100, 255, 0);
	  let item      = "[NSFW]game_itazura_POV/game_itazura_gameController";
	  $gameScreen.showPicture(2, item, 0, 0, 0, 100, 100, 255, 0);
	  let face      = "[NSFW]game_itazura_POV/game_itazura_fera_ImoutoFace";
	  $gameScreen.showPicture(3, face, 0, 250, 0, 100, 100, 255, 0);	  
	  let lowerBody = "[NSFW]game_itazura_POV/game_itazura_oniichan_lowerBody_NOpenis";
	  $gameScreen.showPicture(5, lowerBody, 0, 0, 380, 100, 100, 255, 0);		  
	  let eyes      = "[NSFW]game_itazura_POV/game_itazura_fera_ImoutoFace_eyes1";
	  $gameScreen.showPicture(6, eyes, 0, 700, 200, 100, 100, 255, 0);
	  let penis     = "[NSFW]game_itazura_POV/game_itazura_oniichan_lowerBody_massagePenis1";
	  $gameScreen.showPicture(7, penis, 0, 550, 380, 100, 100, 255, 0);	  
	  let hands     = "[NSFW]game_itazura_POV/game_itazura_fera_massagePenis1";
	  $gameScreen.showPicture(8, hands, 0, 550, 380, 100, 100, 255, 0);

	  QJ.MPMZ.Shoot({
		  groupName: ['fera','massagePenis'],
		  existData: [ 
		  ],
		  moveF: [
		    [90,1,QJ.MPMZ.tl.gameItazuraBlowJob,[{Blinking:true}]],
			[15,1,QJ.MPMZ.tl.gameItazuraBlowJob,[{massagePenis:true}]]
		  ]
	  });	  
};

// 哥哥自己洗头发
QJ.MPMZ.tl.oniiChanWashHair = function(extraData = {}) {
   
   if (extraData.refresh) {
	   
	  this._coolDown = this._coolDown || 0;	
	  if (this._coolDown > 0) {
	     this._coolDown -= 1;
	     return;
	  }
      this._frames = this._frames || 0; 
	  let IMG = "bathroom_event/bathroom_oniichan_washHair" + this._frames;
	  $gameScreen.showPicture(9, IMG, 0, 960, 380, 100, 100, 255, 0);

      if (!this._playback) {
   	    this._frames += 1;
	  } else {
	    this._frames -= 1;
	  }
	  if (this._frames <= -1) {
		  this._playback = false;
		  this._coolDown = Math.randomInt(4) + 4;
		  this._frames = 0;
		  return;
	  }
	  if (this._frames >= 4) {
		  this._playback = true;
		  this._coolDown = Math.randomInt(4) + 4;
		  this._frames = 3;
		  return;
	  }
	  this._coolDown = 4;
	  return;
   }

   for (let i = 0; i < 4; i++) {
       ImageManager.loadPicture("bathroom_event/bathroom_oniichan_washHair" + i);
   }
   
   QJ.MPMZ.Shoot({
	  groupName: ['oniiChanWashHair'],
      existData: [ 
	  ],
      moveF: [
        [15,0,QJ.MPMZ.tl.oniiChanWashHair,[{refresh:true}]]
      ]
   });   
   
};


// 客厅-妹妹被惊吓-女上位segs
QJ.MPMZ.tl.livingRoomImoutoScaredKijoui = function(extraData = {}) {

   if (extraData.refresh) {
	// 帧刷新流程   
	  this._coolDown = this._coolDown || 0;	
	  if (this._coolDown > 0) {
	     this._coolDown -= 1;
	     return;
	  }
	  this._frames = this._frames || 1;
      this._speed  = this._speed  || 4;	  
	  let type     = this.data.actionType || "A";	
      let target   = $gameScreen.picture(1);
      let scale    = target?._scaleX || 100;
      let posX     = scale > 50 ? 1920 : 960; 
      let posY     = scale > 50 ? 760  : 380;
  	      posX    += target?._x || -1400;
		  posY    += target?._y || -700;
	  let IMG      = `living_room/[NSFW]livingRoom_ImoutoScared_segs_action${type}` + this._frames;
	  $gameScreen.showPicture(6, IMG, 0, posX, posY, scale, scale, 255, 0);
	  
	  let seName   = `[NSFW]livingRoom_ImoutoScared_segs_${type}` + Math.randomInt(5);
	  let volume   =  80;   
	  
	  // 体外射精判断
	  if (this._sotodashi) {
		  this.setDead({t:['Time',0]});
		  const pic = $gameScreen.picture(7);
		  if (pic) {
			  pic._opacity = 255;
			  pic.setVideoPause(false);
		  }
		  $gameScreen.erasePicture(6);
		  return;	
	  }
		  
	  // 中出判断
	  if (this._shasei) {
		  this._needShasei   = undefined;
		  this._shaseiFrames = this._shaseiFrames || 1;
		  this._shaseiTimes  = this._shaseiTimes  || 0;
		  let sType          = this._shaseiTimes > 0 ? "B" : "A";
		  IMG                = `living_room/[NSFW]livingRoom_ImoutoScared_segs_action${type}_shasei${sType}` + this._shaseiFrames;
	      $gameScreen.showPicture(7, IMG, 0, posX, posY, scale, scale, 255, 0);
		  if (!this._shaseSe) {
			  // 射精音效
			  this._shaseSe   = true;
              let shaseiTimes = Math.min(2, this._shaseiTimes);			  
			  let shaseSe     = `[NSFW]livingRoom_ImoutoScared_segs_shasei` + (shaseiTimes * 2 + Math.randomInt(2));
			  AudioManager.playVoice({ name: shaseSe, volume: 60, pitch: 100, pan: 0 }, false, 7);			  
			  setTimeout( () => {
				   AudioManager.stopVoice();
				   let se = "[NSFW]living_room_watchHorrorMovie_segs" + ( 9 + Math.randomInt(2) );
				   AudioManager.playVoice({ name: se, volume: 90, pitch: 100, pan: 0 }, false, 3);
			  }, 300);		  
		  }
		  this._shaseiFrames  += 1; 
		  if (this._shaseiFrames > 8) {
			  // 射精结束
			  this._coolDown    += 9999999999;
			  this._shasei       = undefined;
			  this._needSeieki   = true;
			  this._shaseiTimes += 1;  // 射精次数+1
			  this._shaseiFrames = undefined;
			  this._shaseSe      = undefined;
              return;			  
		  }
	  }
	  if (this._needSeieki) {
		  // 射精后的精液残留图层
		  let num  = this._frames;
		  if (type == "B") num = Math.min(9, this._frames);
		  IMG      = `living_room/[NSFW]livingRoom_ImoutoScared_segs_action${type}_seieki` + num;
		  seName   = `[NSFW]livingRoom_ImoutoScared_segs_fillUp${type}` + Math.randomInt(5);
		  volume   = 45;
	      $gameScreen.showPicture(8, IMG, 0, posX, posY, scale, scale, 255, 0);
		  if (this._shaseiTimes > 1 && !this._needSeiekii) {
			  // 多次射精后的精液累加效果
			  IMG = `living_room/[NSFW]livingRoom_ImoutoScared_segs_action${type}_seiekii`;
			  $gameScreen.showPicture(9, IMG, 0, posX, posY, scale, scale, 255, 0);
			  this._needSeiekii = true;
		  }
	  }
      this._frames += 1;
      if (!this._shasei && this._frames == 9) {
      	// 播放音效
		AudioManager.playVoice({ name: seName, volume: volume, pitch: 100, pan: 0 }, false, 8);
	  }
	  
	  let limt = 9;
	  if (type == "A") limt = 12;
	  if (this._frames > limt) {		  
		  // 射精判断
		  if (this._needShasei)  this._shasei = true;
	      if (!this._shasei) {
			  this._frames = 1;
			  // 切换动作
			  if (this._needSwitch) {
				  this._needSwitch = undefined;
				  const t = this.data.actionType;
                  this.data.actionType = (t === "A") ? "B" : (t === "B") ? "A" : t;
			  }			  
		  } else {
			// 触发射精时停留在最后一帧  
			  this._frames = limt;
			  if (type == "B" && this._shasei !== undefined)  this._frames += 1; 
		  }
		  this._coolDown += this._speed;
	  }	  
	  this._coolDown += this._speed;	  
	  return; 
   }

   if (extraData.bubbleText) {
	    // 妹妹气泡文字  
		if (this._disableBubbleText || this._shasei) return;
		let textArray = window.MapEventDialogue54?.["11"]?.["34"] ?? ['Missing translation'];
		let bubbleText = textArray[Math.floor(Math.random() * textArray.length)];
		$gameTemp.drill_GFTT_setBuffer( 7, 7 );
		$gameTemp.drill_GFTT_setStyle_context(bubbleText); 
		$gameTemp.drill_GFTT_createByBuffer( [1040,90], 180 );	
        return;		
   }

   if (extraData.ejaculationCountdown) {
	  // 射精倒计时和强制射精
	   if (extraData.autoEjaculation) {		   
		   let scene = SceneManager._scene;
		   let win   = scene._messageWindow._choiceWindow;
		   if (win && win.active) {
			   extraData.autoEjaculation.autoEjaculation = true;
			   let index = Math.randomInt(2);
			   win.select(index);
			   win.processOk();
		   }		   
		   return;
	   }	
	    let waitTime = 210;
		if (ConfigManager.language > 1) waitTime = 280;
        QJ.MPMZ.Shoot({
	       groupName: ['kijoui','segs'],
           existData: [ 
		      {t:['Time',waitTime], a:['F',QJ.MPMZ.tl.livingRoomImoutoScaredKijoui,[{ejaculationCountdown:true, autoEjaculation:this}]]}
	       ],
        });	
        return;		
   }
	
   // 骑乘位动画播放器/监听器
   let listener = QJ.MPMZ.Shoot({
	                 groupName: ['kijoui','segs'],
                     existData: [ 
	                 ],
	                 actionType: "A",
                     moveF: [
                        [30,0,QJ.MPMZ.tl.livingRoomImoutoScaredKijoui,[{refresh:true}]],
						[120,180,QJ.MPMZ.tl.livingRoomImoutoScaredKijoui,[{bubbleText:true}]]
                     ]  
                  });
    this.listenerId = listener.index;
    if ($gameScreen.picture(1)) {
        $gameScreen.movePicture(1, 0, -1400, -700, 100, 100, 255, 0, 30);
    } else {
        $gameScreen.showPicture(1, 'living_room/living_S_N_RL', 0, -1400, -700, 100, 100, 255, 0);
	}		
    // 预加载
    for (let i = 1; i <= 12; i++) {
	    ImageManager.loadPicture( "living_room/[NSFW]livingRoom_ImoutoScared_segs_actionA" + i );
		ImageManager.loadPicture( "living_room/[NSFW]livingRoom_ImoutoScared_segs_actionA_seieki" + i );
     }
    for (let i = 1; i <= 8; i++) {
	    ImageManager.loadPicture( "living_room/[NSFW]livingRoom_ImoutoScared_segs_actionA_shaseiA" + i );
		ImageManager.loadPicture( "living_room/[NSFW]livingRoom_ImoutoScared_segs_actionA_shaseiB" + i );
		ImageManager.loadPicture( "living_room/[NSFW]livingRoom_ImoutoScared_segs_actionB_shaseiA" + i );
		ImageManager.loadPicture( "living_room/[NSFW]livingRoom_ImoutoScared_segs_actionB_shaseiB" + i );
     }	 
    for (let i = 1; i <= 9; i++) {
	    ImageManager.loadPicture( "living_room/[NSFW]livingRoom_ImoutoScared_segs_actionB" + i );
		ImageManager.loadPicture( "living_room/[NSFW]livingRoom_ImoutoScared_segs_actionB_seieki" + i );
     }	 
};

// 浴室素股
QJ.MPMZ.tl.bathroomSumataRiding = function(extraData = {}) {
	
   if (extraData.refresh) {

	  this._coolDown = this._coolDown || 0;	
	  if (this._coolDown > 0) {
	     this._coolDown -= 1;
	     return;
	  }
	  this._frames = this._frames || 1;
      this._speed  = this._speed  || 4;	  
	  let type     = this.data.actionType || "A";
	  let yy       = $gameScreen.picture(2)?._y || 0;
	  
	  let IMG = `bathroom_sumata/bathroom_sumata_riding${type}` + this._frames;
	  $gameScreen.showPicture(12, IMG, 0, 0, yy, 100, 100, 255, 0);
	  
	  // 素股音效
	  if (this._frames === 1) {
		 let seName = "bathroom_sumata_SE" + (1 + Math.randomInt(4));
		 if (type === "B") seName = "bathroom_sumata_SE" + (5 + Math.randomInt(5));
	     AudioManager.playVoice({ name: seName, volume: 60, pitch: 100, pan: 0 }, false, 8);
	  }
	  // 精液图层
	  if (this._seieki) {
		 this._shasei = null;	 
	     let seieki = `bathroom_sumata/bathroom_sumata_riding${type}seieki` + this._frames;
	     $gameScreen.showPicture(13, seieki, 0, 700, yy, 100, 100, 255, 0);		  		  
	  }
	  // 射精图层
	  if (this._shasei) {		  		  
		 let xx     = 700; 
         let stype   = this._shasei;		 
	     let shasei = `bathroom_sumata/bathroom_sumata_riding${type}${stype}` + this._frames;
		 if (stype === "shaseii" && this._frames === 12) {
			this._shasei = null;
			this._seieki = true;
		 }
		 if (stype === "shasei" && this._frames === 12) {
			// 进入第二段射精动画 
			this._shasei = "shaseii"; 
		 }
	     $gameScreen.showPicture(13, shasei, 0, xx, yy, 100, 100, 255, 0);	
	     // 射精音效
	     if (this._frames === 1) {
		     let seName = "bathroom_sumata_shasei1";
			 let index  = 10;
		     if (stype === "shaseii") seName = "bathroom_sumata_shasei2"; index = 11;
	         AudioManager.playVoice({ name: seName, volume: 75, pitch: 100, pan: 0 }, false, index);
	     }		 		 
	  }
	  
      this._frames += 1;
	  if (this._frames > 12) {
		  this._frames = 1;
		if (!this._shasei && this._selected) {
			if (this._selected === "auto") {
			  this.data.actionType = Math.random() > 0.5 ? "A" : "B";	
			} else {
			  this.data.actionType = this._selected; 
			}			  
	    }
	  }
	  
	  this._coolDown = this._speed;
	  if (this._frames == 1 || this._frames == 7)  this._coolDown += 3;
      return;
   }


   // 素股动画播放器/监听器
   let listener = QJ.MPMZ.Shoot({
	  groupName: ['bathroomSumataRiding'],
      existData: [ 
	  ],
	  actionType: "A",
      moveF: [
        [60,0,QJ.MPMZ.tl.bathroomSumataRiding,[{refresh:true}]]
      ],
	  moveJS: [	    
	    [120,4,`if (this._shaseiMark && !this._shasei && !this._seieki && this._frames == 1) {
			             this._shasei = 'shasei';
		            }`]
	  ]
   });
   // 标记监听器ID
   this.listenerId = listener.index;
   // 创建镜头位置标记图层
   $gameScreen.showPicture(2, "", 0, 0, 0, 100, 100, 0, 0);	
   // 预加载   
   for (let i = 1; i <= 12; i++) {
	   ImageManager.loadPicture( `bathroom_sumata/bathroom_sumata_ridingAseieki${i}` );
	   ImageManager.loadPicture( `bathroom_sumata/bathroom_sumata_ridingBseieki${i}` );
	   ImageManager.loadPicture( `bathroom_sumata/bathroom_sumata_ridingAshasei${i}` );
	   ImageManager.loadPicture( `bathroom_sumata/bathroom_sumata_ridingBshasei${i}` );
	   ImageManager.loadPicture( `bathroom_sumata/bathroom_sumata_ridingAshaseii${i}` );
	   ImageManager.loadPicture( `bathroom_sumata/bathroom_sumata_ridingBshaseii${i}` );
    }   
};


// 洗面所偷窥妹妹脱衣服拉门监听
QJ.MPMZ.tl._imoutoUtilDragToOpenWashroomDoorDetection = function (Reverse) {

    const pic = $gameScreen.picture(50);
    if (!pic) return;

    let type  = 0;
    const dx  = pic.drill_PDr_getDraggingXOffset_Private();
	
	// 被妹妹发现关上门的情形
	if (Reverse) {
		if ( (pic.drill_PDr_isDraging() && dx >= 660) ) {
			type  = 1;
		}
	}	
	
    if (pic.drill_PDr_isDraging()) {
        if      (dx < -1000) type = 1;          //  对应开门闯入
        else if (dx < -800) type = 2;          //  对应慢慢拉开门但触发了妹妹警觉
    } else if (dx < -200) {
        type = 3;                //  最低限度触发偷窥的距离
    }
    if (type === 0) return;                         

    // 锁定拖拽 
    pic.drill_PDr_setCanDrag(false);
    pic.drill_PDr_mergeDragPosition();

	// 被妹妹发现关上门的情形
	if (Reverse) {
		pic.drill_PCE_playSustainingShakeLR( 18,6,1 );		
		AudioManager.playSe({ name: "窓を閉める", volume: 70, pitch: 100, pan: 0 });
		$gameSelfSwitches.setValue([$gameMap.mapId(), 23, 'B'], false);
		$gameSelfSwitches.setValue([$gameMap.mapId(), 23, 'D'], true);
		this.setDead({t:['Time',0]});
		return;
	}
	
	let RushIn = false;
	
	if (type == 1 || pic._x < -1800) {
		RushIn = true;
        $gameSelfSwitches.setValue([$gameMap.mapId(), 23, 'B'], true);
        // 门贴图淡出 
        [49, 50].forEach(id => {
          const data = { type: 'opacity', value: -255, time: 60 };
          $gameScreen.picture(id)?._drill_PSh_commandChangeTank.push(data);
      });
        AudioManager.playSe({ name: "ふすまを開ける2", volume: 70, pitch: 100, pan: 0 });	   
    } else if (type == 2) {
        $gameSelfSwitches.setValue([$gameMap.mapId(), 23, 'B'], true);
        AudioManager.playSe({ name: "窓を閉める", volume: 70, pitch: 100, pan: 0 });	 
        pic.drill_PCE_playSustainingShakeLR( 18,6,1 );		
    } 

    // 移除模糊滤镜 
    [1, 10, 12, 13].forEach(id => {
        const p = $gameScreen.picture(id);
        if (p) {
            const filterId = `blur${id}`;
            $gameMap.moveFilter(filterId, [0], 30);
            $gameMap.eraseFilterAfterMove(filterId);
        }
    });
    // 计算偷窥成功的概率
	let result = false;
    let distance = pic._x + 920;
        distance = Math.min(Math.abs(distance), 800); 
    let adjustment = ((distance - 200) / 600) * 900;
    let probability = Math.round(100 + adjustment);
    if ( Math.randomInt(1000) > probability ) {
       result = true;
	   // 未被妹妹发现，成功偷窥
	   let pName = $gameScreen.picture(10).name();
	   if (!pName.includes("ura")) {
	   if ($gameActors.actor(2).equips()[1]) {		   
           pName = pName.replace(/_bareta$/, "_successful");
	   } else {
		   pName = "washroom_Imouto_datsui_nude_successful";
	   }
       $gameScreen.setVideoPictureName(pName, true, false);
	   $gameScreen.showPicture(10, '', 0, 960, 180, 50, 50, 255, 0);
       $gameScreen.picture(10).setVideoPause(true);		
	  }	   
    } else {
		// 背后视角被妹妹察觉时，存在特殊分歧
		let pName = $gameScreen.picture(10).name();
		if (pName.includes("ura") && $gameVariables.value(18) > 3) {
		  pName = pName.replace(/normal$/, "seduction");
		  $gameScreen.setVideoPictureName(pName, true, false);
		  $gameScreen.showPicture(10, '', 0, 1100, 180, 50, 50, 255, 0);
		  $gameScreen.picture(10).setVideoPause(true);
		}
	}
	
	$gameMap.event(23).steupCEQJ(2,{peekResult:result,isRushIn:RushIn});
	this.setDead({t:['Time',0]});
	this._end = true;
};

//妹妹胖次款式检查
QJ.MPMZ.tl._imoutoUtilPantiesTpyeCheck = function(noPrefix) {
	let type    = "whitePanties";
	let Imouto  = $gameActors.actor(2);
	let panties = Imouto.equips()[1];
	let pic     = $gameScreen.picture(5);

	if ($gameMap.chahuiMapTemp?.removedPanties) {
		// 有缓存的情况下以缓存为准
		panties = $gameMap.chahuiMapTemp.removedPanties;
	}

	if (Imouto.equips()[1]) {
		let itemId = Imouto.equips()[1].baseItemId || Imouto.equips()[1].id;
		switch (itemId) {
                case 154: 
				type = "bluePanties";
                break;
                case 155: 
				type = "pinkPanties";			
                break;	         
		}
	}
		
    if (pic) {
	   let picName = $gameScreen.picture(5).name();
	   if (picName.includes("bluePanties")) {
		   type = "bluePanties";
	   }
	   if (picName.includes("pinkPanties")) {
		   type = "pinkPanties";
	   }	   
	   if (picName.includes("whitePanties")) {
		   type = "whitePanties";
	   }	   
	}
	
    if (!noPrefix)	type = "washroom_sis_" + type;
	return type;
};

//胖次点击判定
QJ.MPMZ.tl._imoutoUtilIconClickPanties = function() {
	
	if ($gameMessage.isBusy() || SceneManager._scene._messageWindow._choiceWindow.active) return;
	
     $gameScreen.setPictureRemoveCommon(2);
     $gameScreen.setPictureRemoveCommon(4);
     $gameScreen.setPictureRemoveCommon(5);
     $gameMap.event(6).steupCEQJ(1);	
	 this.setDead({t:['Time',0]});
	
};

//洗面所点击空白处判定
QJ.MPMZ.tl._imoutoUtilWashRoomClickBlankSpace = function() {
	
  if ($gameScreen.isPointerInnerPicture(2)) return;
  if ($gameScreen.isPointerInnerPicture(4)) return;
  if ($gameScreen.isPointerInnerPicture(7)) return;
  if ($gameScreen.isPointerInnerPicture(8)) return;
  
  if (TouchInput.drill_isLeftPressed() || TouchInput.drill_isLeftTriggered()) {

	 QJ.MPMZ.Shoot({
		groupName:['RaidoCheck'],
        img:"null1",
        position:[['M'],['M']],
        initialRotation:['S',0],
        moveType:['S',0],
        imgRotation:['F'],
        existData:[
            {t:['Time',6]},
			{t:['B',['buttonnull']],a:['F',QJ.MPMZ.tl._imoutoUtilWashRoomClickBlankSpaceEffect],p:[-1,false,true],c:['T',0,6,true]},
        ],
		collisionBox:['C',2],
     });	  

	
  }
  
};

//洗面所点击空白处判定
QJ.MPMZ.tl._imoutoUtilWashRoomClickBlankSpaceEffect = function() {
	
	if ($gameMessage.isBusy() || SceneManager._scene._messageWindow._choiceWindow.active) return;
	$gameScreen.setPictureRemoveCommon(2);
    $gameScreen.setPictureRemoveCommon(4);
    $gameScreen.setPictureRemoveCommon(5);
    $gameMap.event(3).steupCEQJ(4);	
};
	
//第一次潜入洗面所的退出判断
QJ.MPMZ.tl._imoutoUtilWashRoomFirstTimePeeking = function() {

    let condition1 = $gameSelfSwitches.value([$gameMap.mapId(), 6, 'F']);
    let condition2 = $gameSelfSwitches.value([$gameMap.mapId(), 17, 'F']);
    let condition3 = $gameSelfSwitches.value([$gameMap.mapId(), 20, 'B']);
	
        if (condition1 && condition2 && !condition3) {
            $gameSelfSwitches.setValue([$gameMap.mapId(), 20, 'B'], true);
            $gameScreen._pictureCidArray = [];
            $gameMap.event(3).steupCEQJ(3, {firstTimeForceExitScene:true});
            this.setDead({t:['Time',0]});
        }

};

// 监听妹妹洗澡时间阶段
QJ.MPMZ.tl._imoutoUtilWashRoomPeekingTimeCalculation = function(extra={}) {
	if (extra.refresh)	{
		// 若尚未设置过基准时间
		if (!this._fixedHour && !this._fixedMinute) {
			const currentHour = $gameSystem.hour();
			const currentMinute = $gameSystem.minute();
			let newMinute = currentMinute + 25;
			let newHour   = currentHour;
			if (newMinute >= 60) {
				newMinute -= 60;
				newHour += 1;
			}
			this._fixedHour = newHour;
			this._fixedMinute = newMinute;
			this._eventLevel = this._eventLevel || 1;
		}
		// 当前时间(总分钟)
		const nowTotal = $gameSystem.hour() * 60 + $gameSystem.minute();
		// 目标时间(总分钟)
		const fixedTotal = this._fixedHour * 60 + this._fixedMinute;
		// 剩余多少分钟
		let remain = fixedTotal - nowTotal;
		// 妹妹出浴
		if (remain <= 0) {
            $gameScreen._pictureCidArray = [];
			chahuiUtil.abortEventById(-1);
			$gameMap.chahuiMapTemp.ImoutoFinishedBath = true;
			$gameMap.event(5).steupCEQJ(1, {settlementTime: 2});	
			this.setDead({t:['Time',0]});
			return;
		}
		// 分阶段划分妹妹的行动
		const passed = 25 - remain;	
		let currentLevel;
		if (passed < 3) {
			currentLevel = 1;
		} else if (passed < 6) {
			currentLevel = 2;
		} else if (passed < 9) {
			currentLevel = 3;
		} else if (passed < 12) {
			currentLevel = 4;
		} else if (passed < 15) {
			currentLevel = 5;
		} else if (passed < 18) {
			currentLevel = 6;
		} else if (passed < 21) {
			// 妹妹开始泡澡
			if (!$gameMap.chahuiMapTemp?.ImoutoInBath) {
				AudioManager.fadeOutBgsByLine(2, 1);
			}
			$gameMap.chahuiMapTemp.ImoutoInBath = true;
			currentLevel = 7;
		} else if (passed < 24) {
			$gameMap.chahuiMapTemp.ImoutoInBath = true;
			currentLevel = 8;
		} else {	
			$gameMap.chahuiMapTemp.ImoutoInBath = true;	
			currentLevel = 9;
		} 
		// 第一次潜入时强制结束流程的检测
		if ($gameMap.chahuiMapTemp.firstTimeSneaking && 
			(currentLevel >= 2 || $gameMap.chahuiMapTemp.touchCount >= 2)) {
            $gameScreen._pictureCidArray = [];
			chahuiUtil.abortEventById(-1);
            $gameMap.event(5).steupCEQJ(1, {firstTimeForceExitScene:true});
            this.setDead({t:['Time',0]});
			return;
		}
		// 妹妹警戒度过高察觉到哥哥
		if ($gameVariables.value(19) >= 9500) {
            $gameScreen._pictureCidArray = [];
			chahuiUtil.abortEventById(-1);
			$gameMap.chahuiMapTemp.caughtByImouto = true;
            $gameMap.event(5).steupCEQJ(1, {settlementTime: remain, caughtByImouto:true});
            this.setDead({t:['Time',0]});
			return;
		}		
		// 阶段检查
		if (this._eventLevel !== currentLevel) {
			$gameMap.event(29)?.steupCEQJ(1);
		}	
		// 适配洗发水事件
		if (currentLevel >= 2 && $gameSelfSwitches.value([4, 14, 'B'])) {
			$gameSelfSwitches.setValue([4, 14, 'B'], false);
			$gameScreen._pictureCidArray = [];
			chahuiUtil.abortEventById(-1);
            $gameMap.event(5).steupCEQJ(4, {settlementTime: remain});
            this.setDead({t:['Time',0]});
			return;

		}			
		// 记录阶段和剩余时间
		this._eventLevel = currentLevel;
		this._remainTime = remain;
		$gameMap.chahuiMapTemp.eventLevel = currentLevel;
		// 忍者门解锁判断
		if ([3,4].includes(currentLevel) && $gameSelfVariables.value([$gameMap.mapId(), 17, 'ninja']) > 2) {
			$gameMap.chahuiMapTemp.canUseNinjaDoor = true;
		} else {
			$gameMap.chahuiMapTemp.canUseNinjaDoor = undefined;
		}
		return;
	}
   // 部署监听器
	QJ.MPMZ.Shoot({
		groupName: ['washRoomListeners'],
		existData: [ ],
		moveF:[
			[20,20,QJ.MPMZ.tl._imoutoUtilWashRoomPeekingTimeCalculation, [{refresh:true}]]
		]
	});		
};

//浴室花洒动画播放器
QJ.MPMZ.tl.bathroomShowerheadAnimation = function() {
   this._frames = this._frames || 0;
   var IMG;
   if ($gameScreen.picture(40) && $gameScreen.picture(40).name().includes("actionH")) {
         IMG = "ShowerheadB" + this._frames;
    } else {
         IMG = "ShowerheadA" + this._frames;
    }
	
   var path = "washroom_nozoku";
   $gameScreen.showPictureFromPath(45, path, IMG, 0, 0, 0, 100, 100, 255, 0);
   
   this._frames += 1;
   if (this._frames >= 8) this._frames = 0;
   
};

//浴室花洒动画
QJ.MPMZ.tl.bathroomShowerheadAnimationPlayer = function() {

    if($gameMap.getGroupBulletListQJ('showerhead').length > 0) return;
	
    QJ.MPMZ.Shoot({
		groupName:['showerhead'],
        position:[['P'],['P']],
        initialRotation:['S',0],
        imgRotation:['F'],
        collisionBox:['C',1],
        moveType:['D',false],
		immuneTimeStop:true,
        existData:[	
        ],
		moveF:[
			[6,6,QJ.MPMZ.tl.bathroomShowerheadAnimation], 
		],
		deadJS:["$gameScreen.erasePicture(45)"]
    });
	
};

// 妹妹一个人泡澡的泡泡动画
QJ.MPMZ.tl._imoutoUtilBathRoomSoloOfuroBubble = function() {
	
	this._coolDown = this._coolDown || 0;	
	if (this._coolDown > 0) {
	   this._coolDown -= 1;
	   return;
	}
	
	this._frames = this._frames || 1;
	
	if (!$gameScreen.picture(10) || !$gameScreen.picture(10).name().includes("solo_bubble")) {
	var IMG = 'bathroom_sis_solo_bubble1';
	$gameScreen.showPictureFromPath(10, "bathroom_event", IMG, 0, 0, 540, 50, 50, 255, 0);
	} else {
    var IMG = "bathroom_event/bathroom_sis_solo_bubble" + this._frames;
    $gameScreen.changePictureName(10, IMG);
    $gameScreen.picture(10)._opacity = 255;	
	}
	
	this._frames += 1;
	this._coolDown = 4;
	
	if (this._frames >= 8) {
	  $gameScreen.picture(10)._opacity = 0;
	  this._frames = 1;	
      this._coolDown = 30 + Math.randomInt(20);
	}	
	
};

// 妹妹一个人泡澡的摇头哼歌动画
QJ.MPMZ.tl._imoutoUtilBathRoomSoloHumming = function() {
	
	this._coolDown = this._coolDown || 0;	
	if (this._coolDown > 0) {
	   this._coolDown -= 1;
	   return;
	}

    if (this._startSmile) {
	 this._startSmile = false;
	 this._eyesOpened = true;
	 var IMG = "bathroom_sis_solo_smile";
	 $gameScreen.showPictureFromPath(8, "bathroom_event", IMG, 0, 0, 540, 50, 50, 255, 0);
	 this._coolDown = 60;
	 return;
	}
	
	this._frames = this._frames || 4;
	
	if (!this._backwards && this._switchSmile && this._frames == 5) {
	  this._switchSmile = false;	
	  this._coolDown = 6;
	  this._frames = 4;
      this._startSmile = true;
	  return;
	}
	
	var action;
	  if (this._eyesOpened) {
          action = 'bathroom_sis_solo_shake_eyesOpened';
	  } else {
          action = 'bathroom_sis_solo_shake_eyesClosed';
	  }		
	if (!$gameScreen.picture(8) || !$gameScreen.picture(8).name().includes("solo_shake")) {	  		
	var IMG = action + this._frames;
	$gameScreen.showPictureFromPath(8, "bathroom_event", IMG, 0, 0, 540, 50, 50, 255, 0);
	} else {
    var IMG = "bathroom_event/" + action + this._frames;
    $gameScreen.changePictureName(8, IMG);
	}
	
	if (this._backwards) {
	this._frames -= 1;
	} else {
	this._frames += 1;	
	}
	this._coolDown = 2;

	if (this._backwards && this._frames <= 0 ) {
	  this._frames += 1;	
	  this._backwards = false;
      this._coolDown = 3 + Math.randomInt(3);	  
	}
	
	if (this._frames >= 8 ) {
	  this._frames -= 1;
	  this._backwards = true;	
      this._coolDown = 3 + Math.randomInt(3);	  
	}	
	
};

// 妹妹一个人泡澡的笑眯眯动画
QJ.MPMZ.tl._imoutoUtilBathRoomSoloSmile = function() {
	
	if (!$gameScreen.picture(8) || !$gameScreen.picture(8).name().includes("solo_smile")) {
	var IMG = 'bathroom_sis_solo_smile' + this._frames;
	$gameScreen.showPictureFromPath(8, "bathroom_event", IMG, 0, 0, 540, 50, 50, 255, 0);
	} else {
    var IMG = "bathroom_event/bathroom_sis_solo_smile" + this._frames;
    $gameScreen.changePictureName(8, IMG);
	}	
	
	
};

// 妹妹一个人泡澡玩小黄鸭动画
QJ.MPMZ.tl._imoutoUtilBathRoomSoloPlayingRubberDuck = function() {
	
	this._coolDown = this._coolDown || 0;	
	if (this._coolDown > 0) {
	   this._coolDown -= 1;
	   return;
	}
	
	this._frames = this._frames || 2;
	
	if (!$gameScreen.picture(5) || !$gameScreen.picture(5).name().includes("playWithRubberDuck")) {
	var IMG = 'bathroom_sis_solo_playWithRubberDuck' + this._frames;
	$gameScreen.showPictureFromPath(5, "bathroom_event", IMG, 0, 0, 540, 50, 50, 255, 0);
	} else {
    var IMG = "bathroom_event/bathroom_sis_solo_playWithRubberDuck" + this._frames;
    $gameScreen.changePictureName(5, IMG);
	}
	
	if (this._backwards) {
	this._frames -= 1;
	} else {
	this._frames += 1;	
	}
	this._coolDown = 2;

	if (this._backwards && this._frames <= 1 ) {
	  this._frames += 1;	
	  this._backwards = false;
      this._coolDown = 2 + Math.randomInt(3);	  
	}
	
	if (this._frames >= 7 ) {
	  this._frames -= 1;
	  this._backwards = true;	
      this._coolDown = 2 + Math.randomInt(3);	  
	}	
	
};


// 妹妹喝可乐
QJ.MPMZ.tl._imoutoUtilImoutoDrinksCola = function() {
	//console.log(this._coolDown);
	this._coolDown = this._coolDown || 0;	
	if (this._coolDown > 0) {
	   this._coolDown -= 1;
	   return;
	}
	
	this._frames = this._frames || 1;
	var lang = ConfigManager.language;
	if (lang > 2) lang = 2;
	var text = "";
	
	if (this._fizzingUp) {
		QJ.MPMZ.tl._imoutoUtilImoutoDrinksColaFizzingUp.call(this);
		return;
	}
	
	var IMG = "sis_room_drinkCola/sis_room_hotWeather_cola" + this._frames;
	$gameScreen.showPicture(6, IMG, 0, 600, 300, 50, 50, 255, 0);
	
    // 拿到可乐停顿
	if ( this._frames == 4 || this._frames == 11 || this._frames == 14 || this._frames == 15 ) {
		this._coolDown += 10;
	}	

	if ( this._frames == 13 ) {
		this._coolDown += 90;
			switch (lang) {
                case 0: 
                text = "我开动了|";
                break;
                case 1: 
                text = "いただきます|";
                break;	
                case 2: 
                text = "Itadakimasu!";
                break;	            
			}
          let posX = 850 + Math.randomInt(180);
		  let posY = 400 + Math.randomInt(80);
          QJ.MPMZ.tl._imoutoUtilCustomMoodText(posX,posY,text);	
		  var voice = { name: "hotWeatherEvent_31", volume: 90, pitch: 100, pan: 0 };
          AudioManager.playVoice(voice, false, 2);  
		
	}

    // 旋瓶盖，循环动作
	if (this._frames == 8) {
		this._loopType1 = this._loopType1 || 3;
		if (this._loopType1 > 1) {
			this._loopType1 -= 1;
			this._frames = 6;
			this._coolDown += 35;
			    // 旋瓶盖音效
			if (!this._loopType1Voice) {
			   var voice = { name: "hotWeatherEvent_32", volume: 90, pitch: 100, pan: 0 };
               AudioManager.playVoice(voice, false, 2);
			   this._loopType1Voice = true;
			}
					
		}
		// 摇可乐导致喷发
		if (this.data.fizzingUp && this._loopType1 && this._loopType1 == 1 ) {
		   this._fizzingUp = true;
	   }
		
	}

    // 喝可乐第一阶段
	if (this._frames == 17) {
		this._loopType2 = this._loopType2 || 4;
		if (this._loopType2 > 1) {
			this._loopType2 -= 1;
			this._frames = 15;
			this._coolDown += 15;
			this._moodText = true;
		}
	}

    // 喝可乐第二阶段
	if (this._frames == 19) {
		this._loopType3 = this._loopType3 || 4;
		if (this._loopType3 > 1) {
			this._loopType3 -= 1;
			this._frames = 17;
			this._coolDown += 15;
			this._moodText = true;
		}
	}

    // 喝可乐第三阶段
	if (this._frames == 21) {
		this._loopType4 = this._loopType4 || 4;
		if (this._loopType4 > 1) {
			this._loopType4 -= 1;
			this._frames = 19;
			this._coolDown += 15;
			this._moodText = true;
		}
	}

    // 喝可乐第四阶段
	if (this._frames == 23) {
		this._loopType5 = this._loopType5 || 4;
		if (this._loopType5 > 1) {
			this._loopType5 -= 1;
			this._frames = 21;
			this._coolDown += 15;
			this._moodText = true;
		}
	}
	
    // 喝可乐第五阶段
	if (this._frames == 25) {
		this._loopType6 = this._loopType6 || 4;
		if (this._loopType6 > 1) {
			this._loopType6 -= 1;
			this._frames = 23;
			this._coolDown += 15;
			this._moodText = true;
		}
	}

		if ( this._moodText && Math.random() > 0.3 )	{
			switch (lang) {
                case 0: 
                text = "咕咚|";
                break;
                case 1: 
                text = "ゴクン|";
                break;	
                case 2: 
                text = "Gulp~";
                break;	            
			}
          let posX = 850 + Math.randomInt(180);
		  let posY = 400 + Math.randomInt(80);
          QJ.MPMZ.tl._imoutoUtilCustomMoodText(posX,posY,text);	
		  var sname = "hotWeatherEvent_33_" + Math.randomInt(5);
		  var voice = { name: sname, volume: 90, pitch: 100, pan: 0 };
          AudioManager.playVoice(voice, false, 2); 		  
          this._moodText = undefined;		  
		}

	if ( this._frames == 27 ) {
		this._coolDown += 60;
			switch (lang) {
                case 0: 
                text = "噗哈|";
                break;
                case 1: 
                text = "ぷはぁ|";
                break;	
                case 2: 
                text = "Puhah—";
                break;	            
			}
          let posX = 850 + Math.randomInt(180);
		  let posY = 400 + Math.randomInt(80);
          QJ.MPMZ.tl._imoutoUtilCustomMoodText(posX,posY,text);	
		  var sname = "hotWeatherEvent_34_" + Math.randomInt(2);
		  var voice = { name: sname, volume: 90, pitch: 100, pan: 0 };
          AudioManager.playVoice(voice, false, 2); 			  
		
	}


   // 喝饱了
	if (this._frames >= 28) {
		if ($gameMap.mapId() === 4) {
			$gameSelfSwitches.setValue([$gameMap.mapId(), 50, 'C'], false);	
		} else {
			$gameSelfSwitches.setValue([$gameMap.mapId(), 9, 'C'], false);
		}	
	    this._coolDown += 120;		
			switch (lang) {
                case 0: 
                text = "嗝|";
                break;
                case 1: 
                text = " ゲップ|";
                break;	
                case 2: 
                text = "Burp~";
                break;	            
			}
          let posX = 850 + Math.randomInt(180);
		  let posY = 400 + Math.randomInt(80);
          QJ.MPMZ.tl._imoutoUtilCustomMoodText(posX,posY,text);	
		  var sname = "hotWeatherEvent_35_" + Math.randomInt(2);
		  var voice = { name: sname, volume: 90, pitch: 100, pan: 0 };		  
		  AudioManager.playVoice(voice, false, 2); 
	      this.setDead({t:['Time',0]});		
	}

    if (this._frames >= 16) {
	this._coolDown += 5;	
	}
	
   	this._frames += 1;
	this._coolDown += 5;	
	
};

// 可乐喷射
QJ.MPMZ.tl._imoutoUtilImoutoDrinksColaFizzingUp = function() {

	var lang = ConfigManager.language;
	if (lang > 2)  lang = 2;
	var text = "";
	
    // 喝可乐
	var IMG = "sis_room_hotWeather_colaFizzingUp" + this._frames;
	$gameScreen.showPictureFromPath(6, "sis_room_drinkCola", IMG, 0, 600, 300, 50, 50, 255, 0);
	
    // 拿到可乐停顿
	if ( this._frames == 7 ) {
		this._coolDown += 30;
    // 可乐冒气
	var IMG1 = "sis_room_hotWeather_colaFizzingUp_bubbles";
	$gameScreen.showPictureFromPath(7, "sis_room_drinkCola", IMG1, 0, 834, 511, 50, 50, 0, 0);
	   var pic = $gameScreen.picture(7);
      if (pic) {
		  $gameScreen.movePicture(7, pic.origin(), pic.x(), pic.y(), pic.scaleX(), pic.scaleY(), 255, 0, 60);
	  }
	  
		  var voice = { name: "hotWeatherEvent_37_0", volume: 90, pitch: 100, pan: 0 };		  
		  AudioManager.playVoice(voice, false, 2); 	  
	  
	}
	if ( this._frames == 8 ) {
		this._coolDown += 40;
		
		if (!this._switchFrames) {
			switch (lang) {
                case 0: 
                text = "...呼诶？";
                break;
                case 1: 
                text = "...ふえっ？";
                break;	
                case 2: 
                text = "...Huh?";
                break;	            
			}
          let posX = 850 + Math.randomInt(180);
		  let posY = 400 + Math.randomInt(80);
          QJ.MPMZ.tl._imoutoUtilCustomMoodText(posX,posY,text);	
		  var voice = { name: "hotWeatherEvent_36", volume: 90, pitch: 100, pan: 0 };		  
		  AudioManager.playVoice(voice, false, 3); 		  


      // 用嘴堵住可乐
	    var condition = $gameSelfVariables.value([1, 2, 'colaSpray']) > 1;
        if ( condition && Math.random() > 0.25 ) {
			$gameMap.event(9).steupCEQJ(5);
			this.setDead({t:['Time',0]});
		}
		  
	}		
		
		
		if (this._switchFrames) {
			this._coolDown += 20;
			this._frames = 14;
	        return;			
		}
	}	

    // 可乐喷射动画
	if (this._frames == 13) {
		this._loopType2 = this._loopType2 || 24;
		if (this._loopType2 > 1) {
			this._loopType2 -= 1;
			this._frames = 10;
			this._coolDown -= 2;
		}

			    // 可乐喷射音效
			if (!this._loopType2Voice) {
			   var voice = { name: "hotWeatherEvent_37_1", volume: 90, pitch: 100, pan: 0 };
               AudioManager.playVoice(voice, false, 2);
			   this._loopType2Voice = true;
			}
		
		if (this._loopType2 == 6) {
       // 弄湿衣服的演出
	   var IMG1 = "sis_room_hotWeather_colaFizzingUp_wet";
	   $gameScreen.showPictureFromPath(8, "sis_room_drinkCola", IMG1, 0, 810, 481, 50, 50, 0, 0);
	      var pic = $gameScreen.picture(8);
         if (pic) {
		  $gameScreen.movePicture(8, pic.origin(), pic.x(), pic.y(), pic.scaleX(), pic.scaleY(), 255, 0, 60);
	      }
		}		
		
		if (this._loopType2 == 1) {
			this._frames = 7;
			this._switchFrames = true;
		}
	}

	if ( this._frames == 14 ) {
		
			switch (lang) {
                case 0: 
                text = "...哥哥";
                break;
                case 1: 
                text = "...お兄ちゃん";
                break;	
                case 2: 
                text = "...Onii-chan";
                break;	            
			}
          let posX = 850 + Math.randomInt(180);
		  let posY = 400 + Math.randomInt(80);
          QJ.MPMZ.tl._imoutoUtilCustomMoodText(posX,posY,text);	
		  var voice = { name: "hotWeatherEvent_38", volume: 90, pitch: 100, pan: 0 };
          AudioManager.playVoice(voice, false, 2);		  
		
		this._coolDown += 120;
	}

	if ( this._frames == 15 ) {
		this._frames = 0;
		this._coolDown += 180;	
		if ($gameMap.mapId() === 4) {
			$gameSelfSwitches.setValue([$gameMap.mapId(), 50, 'C'], false);	
		} else {
			$gameSelfSwitches.setValue([$gameMap.mapId(), 9, 'C'], false);
		}
					
	    this.setDead({t:['Time',0]});	
		
			switch (lang) {
                case 0: 
                text = "是哥哥搞得恶作剧吧！？";
                break;
                case 1: 
                text = "お兄ちゃんのイタズラでしょ！？";
                break;	
                case 2: 
                text = "This was your prank, wasn’t it!?";
                break;	            
			}
          let posX = 850 + Math.randomInt(180);
		  let posY = 400 + Math.randomInt(80);
          QJ.MPMZ.tl._imoutoUtilCustomMoodText(posX,posY,text);	
		  var voice = { name: "hotWeatherEvent_39", volume: 90, pitch: 100, pan: 0 };
          AudioManager.playVoice(voice, false, 2);			  
		  this.setDead({t:['Time',0]});	
	}

   	this._frames += 1;
	this._coolDown += 5;	
};

// 侧视角懵懂妹妹手交
QJ.MPMZ.tl._imoutoUtilWashRoomImoutoTekokiSideviewAction = function() {
	
	this._coolDown = this._coolDown || 0;	
	if (this._coolDown > 0) {
	   this._coolDown -= 1;
	   return;
	}
	
	this._frames = this._frames || 1;
	this._speed = this._speed || 4;

	var IMG = "washroom_tekoki/washroom_tekoki_sideview_action" + this._frames;
	$gameScreen.showPicture(25, IMG, 0, 0, 540, 100, 100, 255, 0);

    if (!$gameScreen.picture(24)) {	
		// 腮红		
        QJ.MPMZ.Shoot({
            groupName: ['blush'],
            img: "imoutoUtil/washroom_tekoki_sideview_blush",
            position: [['S',989], ['S',384]],
            initialRotation: ['S', 0],
            imgRotation: ['F'],
            opacity: 1,
            scale: 1,
			onScreen:true,
            anchor: [0, 0],
            moveType: ['S', 0],
            collisionBox: ['C', 1],
            existData: [
			
			],
			timeline:['S',0,12,[-1,1,6]],
			z:"A",
        }); 		
		$gameScreen.showPicture(24, "washroom_tekoki/washroom_tekoki_sideview_back", 0, 920, 0, 100, 100, 255, 0);
		// 初始需要保持静止帧状态
		this._coolDown = 99999;
		return;
	}

    if (this._frames == 2 && this._shasei) {   
		  // 满足条件切入射精动画
		  $gameSwitches.setValue(125, false);
		  let pid = 23;
		  $gameScreen.setVideoPictureName("washroom_tekoki_shasei_sideview", true, false);
		  $gameScreen.showPicture(pid, '', 0, 0, 0, 100, 100, 255, 0);
		  
          if ($gameScreen.picture(pid)) {
            $gameScreen.picture(pid).setVideoLoop(false);
            $gameScreen.picture(pid).setVideoPause(true);
          }		  
          QJ.MPMZ.Shoot({
             groupName: ['sideview'],
             existData: [ 
			   {t:['SW',125,true],a:['S',`$gameScreen.picture(${pid}).setVideoPause(false);$gameScreen.erasePicture(24);$gameScreen.erasePicture(25);QJ.MPMZ.deleteProjectile('blush')`],c:['T',0,6,true]}
			 ],
          });
          const eid = this.data.eid;
		  $gameMap.event(eid).steupCEQJ(3);
          this.setDead({t:['Time',0]}); 		  	   
	}

	if (this._frames == 2) {
		this._coolDown += 4 + Math.randomInt(4);
	}
	if (this._frames == 6) {
		this._coolDown += Math.randomInt(8);
	}


	if (this._frames >= 8) {
		this._coolDown += this._speed;
		this._frames = 2;
		return;
	}	

   	this._frames += 1;
	this._coolDown += this._speed;	
	
};


// 哥哥胖次自慰动画
QJ.MPMZ.tl._imoutoUtilOniichanPantiesOnanii = function(extra={}) {

    if (extra.refresh) { 
		this._coolDown = this._coolDown || 0;
		this._passedTime = this._passedTime || 0;	
		if (this._coolDown > 0) {
			this._coolDown -= 1;
			this._passedTime += 1;
		return;
		}
		
		this._frames = this._frames || 0;
		this._speed = this._speed || 4;
		let value;
		let bareta = $gameSelfSwitches.value([$gameMap.mapId(), 6, 'D']);
		let type = QJ.MPMZ.tl._imoutoUtilPantiesTpyeCheck(true);
			type = "washroom_onichann_" + type + "_onani";
		let IMG = type + this._frames;
		$gameScreen.showPictureFromPath(22, "washroom_event", IMG, 0, 0, 0, 100, 100, 255, 0);

		// 时间流逝和妹妹警戒度变化
		if (!bareta && !this._zetchou && this._passedTime > 180) {
			this._passedTime = 0;
			chahuiUtil.systemTimeProgression(1);
			$gameMap.steupCEQJ(8,1);
			value = $gameVariables.value(19);
			let skillFix = 100;
            if ($gameSwitches.value(145)) skillFix -= Math.min(90, 15 * $gameParty.leader().skillMasteryLevel(10));
			let boost = (10 + Math.randomInt(10)) * skillFix;
			value += Math.max(1,boost);
			$gameVariables.setValue(19, value);	
			if ($gameSelfSwitches.value([4, 14, 'B']))  value += 7000;
			if (value >= 9500) {
				$gameMap.chahuiMapTemp.caughtByImouto = true;
			}
		}
		// 哥哥快感计量条结算
		if (!bareta && !this._zetchou && this._frames == 0 && Math.random() > 0.5 ) {
			value = $gameVariables.value(25);
			if (!$gameMap.chahuiMapTemp?.caughtByImouto && !$gameMap.chahuiMapTemp?.ImoutoFinishedBath) value += 1;
			$gameVariables.setValue(25, value);	
			if (value > 120 && !$gameMap.chahuiMapTemp?.caughtByImouto) {
				this._speed = 1;
				this._zetchou = true;
				$gameMap.event(6).steupCEQJ(6);
			}		   
		}

		// 切换射精演出
		if ( !bareta && this._shasei && this._frames == 5 ) {
			$gameMap.event(6).steupCEQJ(6, {shaseiAnim: true});
			this.setDead({t:['Time',0]});
			return;
		}
		
		if (this._backwards) {
			this._frames -= 1;
		} else {
			this._frames += 1;	
		}
		this._coolDown = this._speed;

		if ( this._backwards && this._frames <= -1 ) {
			this._frames = 0;	
			this._backwards = false;
			this._coolDown = this._speed + Math.randomInt(2);	  
		}
		// 变速播放分歧
		if (this._backwards && this._frames <= 3 && Math.random() > 0.8 ) {
			this._frames = 0;  
			this._coolDown = this._speed;
			return;	  
		}		
		if ( this._frames >= 6 ) {
			this._frames -= 1;
			this._backwards = true;	
			this._coolDown = this._speed + Math.randomInt(2);	
		}
		return;
    }

	// 播放器初始化
	QJ.MPMZ.Shoot({
		groupName: ['oniichanPantiesOnanii'],
		existData: [ ],
		moveF:[
			[65, 0, QJ.MPMZ.tl._imoutoUtilOniichanPantiesOnanii, [{refresh:true}]]
		],
	});	
};

// 洗面所手交事件-妹妹的红晕
QJ.MPMZ.tl._imoutoUtilWashRoomImoutoTekokiBlush = function() {
	
        QJ.MPMZ.Shoot({
            groupName: ['blush'],
            img: "imoutoUtil/washroom_tekoki_blush",
            position: [['S',0], ['S',0]],
            initialRotation: ['S', 0],
            imgRotation: ['F'],
            opacity: 1,
            scale: 1,
			onScreen:true,
            anchor: [0, 0],
            moveType: ['S', 0],
            collisionBox: ['C', 1],
            existData: [
			
			],
			timeline:['S',0,12,[-1,1,6]],
			z:"A",
        });  
		
};


// 洗面所手交事件-妹妹的呼吸气雾
QJ.MPMZ.tl._imoutoUtilWashRoomImoutoTekokiVisibleBreath = function() {
	
	this._coolDown = this._coolDown || 0;	
	if (this._coolDown > 0) {
	   this._coolDown -= 1;
	   return;
	}
	
	this._frames = this._frames || 0;
	
	var IMG = "washroom_tekoki/washroom_tekoki_visibleBreath" + this._frames;
	var index = 11;	
	$gameScreen.showPicture(index, IMG, 0, 0, 0, 100, 100, 255, 0);
	
	this._frames += 1;
	this._coolDown = 4;
	// 执行不透明度淡出指令
	if (this._frames >= 8) {
		var pic = $gameScreen.picture(index);
		if (pic) $gameScreen.movePicture(index, pic.origin(), pic.x(), pic.y(), pic.scaleX(), pic.scaleY(), 0, 0, 60);
	    this._frames = 0;	
        this._coolDown = 32;
	}	
	
};

// 洗面所手交事件-妹妹的撸撸动作
QJ.MPMZ.tl._imoutoUtilWashRoomImoutoTekokiAction = function(extra={}) {
	
	if (extra.refresh) {		
		let index = 18;		
		let type  = this.data.type;
		let noPanties = this.data.noPanties;
		if (noPanties) {
			index = 15;
			type = "washroom_tekoki_penis";
		} else {
		switch (type) {
			case "bluePanties":  
				type = "washroom_tekoki_bluePanties";
				break;
			case "pinkPanties":  
				type = "washroom_tekoki_pinkPanties";
				break;
			case "whitePanties":  
				type = "washroom_tekoki_whitePanties";
				break;
			default: 
				type = "washroom_tekoki_whitePanties";
				break;
			}
		}
			
		this._coolDown = this._coolDown || 0;	
		if (this._coolDown > 0) {
			this._coolDown -= 1;
			return;
		}
		
		this._frames = this._frames || 0;
		this._speed = this._speed || 5;
		
		if (!noPanties) {
			let panties = type + this._frames;
			$gameScreen.showPictureFromPath(19, "washroom_tekoki", panties, 0, 360, 0, 100, 100, 255, 0);
		}

		let IMG2 = "washroom_tekoki_hand" + this._frames;
		$gameScreen.showPictureFromPath(16, "washroom_tekoki", IMG2, 0, 360, 0, 100, 100, 255, 0);
		//$gameScreen.picture(12).drill_PLAZ_setLayer( "最顶层" );
		
		let IMG1 = type + this._frames;
		$gameScreen.showPictureFromPath(index, "washroom_tekoki", IMG1, 0, 360, 0, 100, 100, 255, 0);
		//$gameScreen.picture(index).drill_PLAZ_setLayer( "最顶层" );

		if (this._frames == 5) {   
		if ( $gameVariables.value(25) > 40 ) {
			// 满足条件后切换到第二个动作
			QJ.MPMZ.Shoot({
				img:"null1",groupName: ['tekokiAction2'],
				existData: [ ],
				moveF:[
				[this._speed,0,QJ.MPMZ.tl._imoutoUtilWashRoomImoutoTekokiAction2,[noPanties,type]]
				],
			});
			this.setDead({t:['Time',0]}); 		  
		}
		}

		if (this._frames >= 9) {
			this._speed = 3 + Math.randomInt(5);
			this._coolDown = this._speed;
			this._frames = 0;
			return;
		}	

		this._frames += 1;
		this._coolDown = this._speed;

		// 后续动作关键帧的预加载
		if (!this._preload && !noPanties) {
			this._preload = true;
			// 动作音效
			let	voice = { name: "washroom_event_sis_tekoki_panties1", volume: 90, pitch: 100, pan: 0 };
			AudioManager.playVoice(voice, true, 3);
			let action = type.replace(/(tekoki_)/, '$1action2_');
			for (let i = 1; i <= 26; i++) {
				ImageManager.loadPicture(`washroom_tekoki/${action}_` + i);
				ImageManager.loadPicture("washroom_tekoki/washroom_tekoki_action2_" + i);
			}
		}
		
		// 和白手套冲突的临时对策
		if (!this._conflict) {	
		this._conflict = true;    
		if ( $gameParty.leader().hasSkill(61) ) {
			if ($gameMap.getGroupBulletListQJ('imoutoUtil').length > 0) { 
				let bullets = $gameMap.getGroupBulletListQJ('imoutoUtil');
					bullets.forEach(bid => {
					let bullet = $gameMap._mapBulletsQJ[bid];
						if (bullet) {
							bullet._skillEffect61 = true;
						}
					}); 
			}
			$gameVariables.setValue(25, 39);
		}             
		}
		return;	
    }
	// 播放器初始化
	let noPanties = ($gameVariables.value(18) >= 4 && this.specifiedAction !== "hasPanties") 
		            || this.specifiedAction === "noPanties";
	let type = QJ.MPMZ.tl._imoutoUtilPantiesTpyeCheck(true);
	$gameMap.chahuiMapTemp.pankoki = !noPanties;
	QJ.MPMZ.Shoot({
		groupName: ['tekokiAction'],
		existData: [ ],
		noPanties: noPanties,
		type: type,
		moveF:[
			[1,0,QJ.MPMZ.tl._imoutoUtilWashRoomImoutoTekokiAction,[{refresh:true}]]
		],
	});	
};

// 洗面所手交事件-妹妹第二动作
QJ.MPMZ.tl._imoutoUtilWashRoomImoutoTekokiAction2 = function(noPanties,type) {
	
	this._coolDown = this._coolDown || 0;	
	if (this._coolDown > 0) {
	   this._coolDown -= 1;
	   return;
	}
	
	$gameScreen.erasePicture(16);
	$gameScreen.erasePicture(18);
	
	this._frames = this._frames || 1;
	this._speed = this._speed || 5;


	if (!noPanties) {
	  let action = type.replace(/(tekoki_)/, '$1action2_');
	  let panties = action + "_" + this._frames; 
	  $gameScreen.showPictureFromPath(19, "washroom_tekoki", panties, 0, 360, 0, 100, 100, 255, 0);
	}
	
    // 手的动作
	var IMG2 = "washroom_tekoki_action2_" + this._frames;
	$gameScreen.showPictureFromPath(15, "washroom_tekoki", IMG2, 0, 360, 0, 100, 100, 255, 0);

    if (this._frames == 23) {   
       if ( $gameVariables.value(25) > 50) {
		  // 满足条件后切换到第三个动作
          QJ.MPMZ.Shoot({
             img:"null1",groupName: ['tekokiAction3'],
             existData: [ ],
             moveF:[
               [this._speed,0,QJ.MPMZ.tl._imoutoUtilWashRoomImoutoTekokiAction3,[noPanties,type]]
             ],
          });
          this.setDead({t:['Time',0]}); 		  
	   }
	}

	if (this._frames >= 26) {
		this._coolDown = 5;
		this._frames = 8;
		return;
	}	

   	this._frames += 1;
	this._coolDown = this._speed;

    // 后续动作关键帧的预加载
	if (!this._preload && !noPanties) {
		this._preload = true;
        AudioManager.stopVoice(null, 3);		
		let action = type.replace(/(tekoki_)/, '$1action3_');
		for (let i = 1; i <= 44; i++) {
           ImageManager.loadPicture(`washroom_tekoki/${action}_` + i);
		   ImageManager.loadPicture("washroom_tekoki/washroom_tekoki_action3_" + i);
        }
	}
	
	if (!this._preVoice && !noPanties && this._frames > 7) {
		// 动作音效
		this._preVoice = true;
		let	voice = { name: "washroom_event_sis_tekoki_panties2", volume: 70, pitch: 100, pan: 0 };
    	AudioManager.playVoice(voice, true, 3);		
	}	
};

// 洗面所手交事件-妹妹第三动作
QJ.MPMZ.tl._imoutoUtilWashRoomImoutoTekokiAction3 = function(noPanties,type) {
	
	this._coolDown = this._coolDown || 0;	
	if (this._coolDown > 0) {
	   this._coolDown -= 1;
	   return;
	}
	
	this._frames = this._frames || 1;
	this._speed = this._speed || 5;

	if (!noPanties) {
	  let action = type.replace(/(tekoki_)/, '$1action3_');
	  let panties = action + "_" + this._frames; 
	  $gameScreen.showPictureFromPath(19, "washroom_tekoki", panties, 0, 360, 0, 100, 100, 255, 0);
	}
	
    // 手的动作
	var IMG2 = "washroom_tekoki_action3_" + this._frames;
	$gameScreen.showPictureFromPath(15, "washroom_tekoki", IMG2, 0, 360, 0, 100, 100, 255, 0);

	if (this._frames >= 44) {
		
       if ( $gameVariables.value(25) > 70) {
		  // 满足条件后切换到第四个动作
          QJ.MPMZ.Shoot({
             img:"null1",groupName: ['tekokiAction4'],
             existData: [ ],
             moveF:[
               [this._speed,0,QJ.MPMZ.tl._imoutoUtilWashRoomImoutoTekokiAction4,[noPanties,type]]
             ],
          });
          this.setDead({t:['Time',0]}); 		  
	   }
	   
		this._coolDown = 5;
		this._frames = 16;
		return;
	}	

   	this._frames += 1;
	this._coolDown = this._speed;

    // 后续动作关键帧的预加载
	if (!this._preload && !noPanties) {
		this._preload = true;
        AudioManager.stopVoice(null, 3);			
		let action = type.replace(/(tekoki_)/, '$1action4_');
		for (let i = 1; i <= 28; i++) {
           ImageManager.loadPicture(`washroom_tekoki/${action}_` + i);
		   ImageManager.loadPicture("washroom_tekoki/washroom_tekoki_action4_" + i);
        }
	}
	
	if (!this._preVoice && !noPanties && this._frames > 15) {
		// 动作音效
		this._preVoice = true;
		let	voice = { name: "washroom_event_sis_tekoki_panties3", volume: 70, pitch: 100, pan: 0 };
    	AudioManager.playVoice(voice, true, 3);		
	}	
};

// 洗面所手交事件-妹妹第四动作
QJ.MPMZ.tl._imoutoUtilWashRoomImoutoTekokiAction4 = function(noPanties,type, extra={}) {
	
	this._coolDown = this._coolDown || 0;	
	if (this._coolDown > 0) {
	   this._coolDown -= 1;
	   return;
	}
	
	this._frames = this._frames || 1;
	this._speed = this._speed || 5;
	this._times = this._frames || 1;
	
	if (!noPanties) {
	  let action = type.replace(/(tekoki_)/, '$1action4_');
	  let panties = action + "_" + this._frames; 
	  $gameScreen.showPictureFromPath(19, "washroom_tekoki", panties, 0, 360, 0, 100, 100, 255, 0);
      console.log(type,panties);
	}
    // 手的动作
	var IMG2 = "washroom_tekoki_action4_" + this._frames;
	$gameScreen.showPictureFromPath(15, "washroom_tekoki", IMG2, 0, 360, 0, 100, 100, 255, 0);

	if (this._frames == 19) {
		
       if ( $gameVariables.value(25) > 80 && noPanties) {
		  // 满足条件后哥哥射爆
          AudioManager.stopVoice(null, 3);			  
          QJ.MPMZ.Shoot({
             img:"null1",groupName: ['tekokiActionShasei'],
             existData: [ ],
             moveF:[
               [this._speed,0,QJ.MPMZ.tl._imoutoUtilWashRoomImoutoTekokiShasei,[noPanties,type]]
             ],
          });
		  if (!$gameScreen.picture(14)) {
             $gameScreen.showPicture(14, "washroom_tekoki/washroom_tekoki_kao2", 0, 0, 0, 100, 100, 255, 0);
             $gameScreen.showPicture(55, "washroom_tekoki/washroom_tekoki_blush", 0, 0, 0, 100, 100, 255, 0);	
             $gameScreen.picture(55).drill_PLAZ_setZIndex( 13 );			 
		  }
		  
          this.setDead({t:['Time',0]}); 		  
	   }
	}

	if (this._frames >= 28) {
        this._times += 1;	
        if (this._times > 4 && !extra.bathroom) this._speed = 3;		
		this._coolDown = 6;
		this._frames = 15;
		return;
	}	

   	this._frames += 1;
	this._coolDown = this._speed;

	if (!this._preload && !noPanties && this._frames > 14) {
		this._preload = true;
		// 动作音效
		let	voice = { name: "washroom_event_sis_tekoki_panties4", volume: 70, pitch: 100, pan: 0 };
    	AudioManager.playVoice(voice, true, 3);		
	}	
	
};

// 洗面所手交事件-哥哥射爆
QJ.MPMZ.tl._imoutoUtilWashRoomImoutoTekokiShasei = function(noPanties,type) {
	
	if (!noPanties) return;		
	this._coolDown = this._coolDown || 0;	
	if (this._coolDown > 0) {
	   this._coolDown -= 1;
	   return;
	}
	
	this._frames = this._frames || 6;
	this._speed = this._speed || 5;
	
    // 射精
	var IMG2 = "washroom_tekoki_shasei" + this._frames;
	$gameScreen.showPictureFromPath(15, "washroom_tekoki", IMG2, 0, 360, 0, 100, 100, 255, 0);
	
    // 射在妹妹头上的精液
	if (this._frames >= 14 && this._frames <= 52) {
	var duplicateArray = [21,22,23,24,26,27,28,30,31,32,38,40,41,42,43,45,46];
	if (!duplicateArray.includes(this._frames)) {
	var IMG1 = "washroom_tekoki_shasei_hairSeieki" + this._frames;
	$gameScreen.showPictureFromPath(12, "washroom_tekoki", IMG1, 0, 360, 0, 100, 100, 255, 0);
	  }
    } else if (this._frames > 51 && !$gameScreen.picture(12)) {
	$gameScreen.showPictureFromPath(12, "washroom_tekoki", "washroom_tekoki_shasei_hairSeieki51", 0, 360, 0, 100, 100, 255, 0);	
	}

    // 妹妹眨眼动作
	if (this._frames >= 6 && this._frames <= 14) {		
	var duplicateArray = [8,9,12];	
	if (!duplicateArray.includes(this._frames)) {
	var IMG0 = "washroom_tekoki_shasei_back" + this._frames;
	$gameScreen.showPictureFromPath(10, "washroom_tekoki", IMG0, 0, 0, 0, 100, 100, 255, 0);
	  }
	}

	if (this._frames >= 67) {
		
		this.setDead({t:['Time',0]}); 
		//this._speed = 3 + Math.randomInt(5);
		//this._coolDown = 150;
		//this._frames = 0;
		//return;
	}	

   	this._frames += 1;
	this._coolDown = this._speed;	
};

// 洗面所妹妹胖次结算
QJ.MPMZ.tl._imoutoUtilWashRoomImoutoPantiesSelect = function(extra = {}) {
	
	const Imouto  = $gameActors.actor(2);
	let panties   = Imouto.equips()[1];
	if ($gameMap.chahuiMapTemp?.removedPanties) {
		// 有缓存的情况下以缓存为准
		panties   = $gameMap.chahuiMapTemp.removedPanties;
	}
	if (!panties || panties.baseItemId >= 157) {
		// 没穿胖次
		$gameScreen.erasePicture(5);
		$gameSelfSwitches.setValue([$gameMap.mapId(), 18, 'D'], true);
		$gameMap.chahuiMapTemp.removedPanties = null;
		if (extra.checkEid) return 159;
		return;
	} 

	if (extra.checkEid) return panties.baseItemId || panties.id;
	if (!$gameMap.chahuiMapTemp)  $gameMap.chahuiMapTemp = {};
    $gameMap.chahuiMapTemp.removedPanties = panties;
	let imageName = "washroom_sis_clothes_whitePanties";
    switch (panties.baseItemId) {
        case 154:  
            imageName = "washroom_sis_clothes_bluePanties";
            break;
        case 155:  
            imageName = "washroom_sis_clothes_pinkPanties";
            break;
    }	
    $gameScreen.showPictureFromPath(5, "washroom_event", imageName, 0, 0, 0, 50, 50, 255, 0);	
		
}; 

// 厕所口交事件-妹妹隔着胖次自慰
QJ.MPMZ.tl._imoutoUtilToiletImoutoFeraPantsuOnanii = function() {
	
	this._coolDown = this._coolDown || 0;	
	if (this._coolDown > 0) {
	   this._coolDown -= 1;
	   return;
	}
	
	this._frames = this._frames || 0;
	this._speed = this._speed || 3;
	
    const pic = $gameScreen.picture(1);	
	if (!pic) return;
	if (pic._drill_PSh_commandChangeTank.length > 0) return;
	
	let xx = pic._x;
	let yy = pic._y;
	let scale = pic._scaleX;
    let xxx =  xx + (1000 * (scale / 100));
	let yyy =  yy + (800 * (scale / 100));	
	
    // 自慰动作
	var IMG1 = "toilet_sister_onanii0_back" + this._frames;
	$gameScreen.showPictureFromPath(6, "toilet_nozoku", IMG1, 0, xxx, yyy, scale, scale, 255, 0);	

    if (!this._playback) {
   	  this._frames += 1;
	} else {
	  this._frames -= 1;
	}
	
	if (!this._playback && this._frames >= 5) {	  
	    this._coolDown += 10 + Math.randomInt(15);
		this._frames -= 1;
		this._playback = true;
		return;
	}

	if (this._playback && this._frames <= -1) {	  
	    this._coolDown += 10 + Math.randomInt(15);
		this._frames = 0;
		this._playback = false;
		return;
	}
    this._coolDown += 7;		
};

// 厕所口交事件-妹妹自慰
QJ.MPMZ.tl._imoutoUtilToiletImoutoFeraNoopanOnanii = function() {
	
	this._coolDown = this._coolDown || 0;	
	if (this._coolDown > 0) {
	   this._coolDown -= 1;
	   return;
	}
	
	this._frames = this._frames || 1;
	this._speed = this._speed || 3;
	
    const pic = $gameScreen.picture(1);	
    if (!pic) return;
	if (pic._drill_PSh_commandChangeTank.length > 0) return;
	
	let xx = pic._x;
	let yy = pic._y;
	let scale = pic._scaleX;
    let xxx =  xx + (1000 * (scale / 100));
	let yyy =  yy + (800 * (scale / 100));
	
    // 绝顶结束
	if (this._zetchou) {
		var IMG1 = "toilet_sister_onanii_back10_aieki";
		$gameScreen.showPictureFromPath(8, "toilet_nozoku", IMG1, 0, xxx, yyy, scale, scale, 255, 0);
		if ($gameScreen.picture(10) && $gameScreen.picture(10).name().includes("onanii")) {
		$gameScreen.showPictureFromPath(10, "toilet_nozoku", "toilet_sister_onanii_head3", 0, xx, yy, scale, scale, 255, 0);
		}
        this.setDead();
        return;		
	}
	
    // 自慰动作
	if (this._aieki && [7,8,9,10].includes(this._frames)) {
		var IMG1 = "toilet_sister_onanii_back" + this._frames + "_aieki";
		$gameScreen.showPictureFromPath(8, "toilet_nozoku", IMG1, 0, xxx, yyy, scale, scale, 255, 0);		
	} else {
		var IMG1 = "toilet_sister_onanii_back" + this._frames;
		$gameScreen.showPictureFromPath(8, "toilet_nozoku", IMG1, 0, xxx, yyy, scale, scale, 255, 0);
	}	

   	this._frames += 1;
	this._coolDown = this._speed;	

	if (this._frames === 11) {	   
		this._coolDown += 2 * this._speed;
	}	
	if (this._frames === 15 && Math.random() > 0.9) {	   
		this._coolDown += this._speed;
		this._frames = 7;
		return;
	}
	if (this._frames === 16 && Math.random() > 0.85) {	   
		this._coolDown += this._speed;
		this._frames = 6;
		return;
	}	
	if (this._frames >= 18) {	  
	    this._coolDown += 2 * this._speed;
		this._frames = 1;
	}	
};


// 妹妹语音自动播放
QJ.MPMZ.tl._imoutoUtilVoiceAutoPlayListener = function() {
	
        QJ.MPMZ.Shoot({
            img:"null1",
			groupName:['voiceAutoPlay'],
            position: [['S',0], ['S',0]],
            initialRotation: ['S', 0],
            imgRotation: ['F'],
			onScreen:true,
            moveType: ['S', 0],
            existData: [
			{t:['S','$gameScreen.picture(30)',true]}
			],
			moveF:[
			  [60,15,QJ.MPMZ.tl._imoutoUtilVoiceAutoPlay1]
			]
        });		
	
};

QJ.MPMZ.tl._imoutoUtilVoiceAutoPlay1 = function() {
	
		this._coolDown = this._coolDown || 0;
        if (this._coolDown > 0) {
	      this._coolDown -= 1;
	      return;
        }
	
	this._count = this._count || 1;
    let random,waitTime;
    do {
        random = 1 + Math.randomInt(5);
    } while (random === this._count);
	this._count = random;
	
    switch (random) {
        case 1:  
            waitTime = 12;
            break;
        case 2:  
            waitTime = 16;
            break;
        case 3:  // 右
            waitTime = 32;
            break;
        case 4:  // 上
            waitTime = 20;
            break;
        case 5: 
            waitTime = 32;
            break;
    }		
        var voice    = {};
        voice.name   = "toilet_event_onani" + random;
        voice.volume = 40;
        voice.pitch  = 100;
        voice.pan    = 0;
        var channel  = 1;
        AudioManager.playVoice(voice, false, channel);	

    this._coolDown = waitTime;
	this._coolDown += Math.randomInt(20);
};

// 厕所口交事件-舔肉棒
QJ.MPMZ.tl._imoutoUtilToiletImoutoFeraAction1 = function() {
	
	this._coolDown = this._coolDown || 0;	
	if (this._coolDown > 0) {
	   this._coolDown -= 1;
	   return;
	}

    const pic = $gameScreen.picture(1);		
	if (!pic) return;
	if (pic._drill_PSh_commandChangeTank.length > 0) return;

	if (this._shasei) {
	   QJ.MPMZ.tl._imoutoUtilToiletImoutoFeraShasei.call(this);
	   return;
	}
	
	this._frames = this._frames || 1;
	this._speed = this._speed || 3;
	let xx = pic._x;
	let yy = pic._y;
	let scale = pic._scaleX;
    let xxx =  xx + (1400 * (scale / 100));
	let yyy =  yy + (1000 * (scale / 100));
	
    // 肉棒动作	
	var IMG1 = "toilet_sister_fera_action" + this._frames;
	$gameScreen.showPictureFromPath(12, "toilet_nozoku", IMG1, 0, xxx, yyy, scale, scale, 255, 0);

   	this._frames += 1;
	this._coolDown = 3;	
    
	if (this._shaseiJumbi ) {
		this._count = this._count || 0;
		this._count++;
		if (this._count > 20) {
		  this._shasei = true;
		  let name = 'NoopanOnanii';
		  if ($gameMap.getGroupBulletListQJ(name).length > 0) {
    		  let id = $gameMap.getGroupBulletListQJ(name)[0];
    		  let bullet = $gameMap.bulletQJ(Number(id)); 
    		  bullet._zetchou = true;
		    }		  
		}
	}

    
	if (this._frames >= 10) {		  
	    this._coolDown += 3;
		this._frames = 1;
	}	
};

// 厕所口交事件-射精
QJ.MPMZ.tl._imoutoUtilToiletImoutoFeraShasei = function() {
	


	this._frames = this._frames || 1;
	//this._speed = this._speed || 4;
	this._speed = 5;

    const pic = $gameScreen.picture(1);
    if (!pic) return;	
	if (pic._drill_PSh_commandChangeTank.length > 0) return;

	let xx = pic._x;
	let yy = pic._y;
	let scale = pic._scaleX;
    let xxx =  xx + (1018 * (scale / 100));
	let yyy =  yy + (580 * (scale / 100));
	
	$gameScreen.erasePicture(10);
	var IMG1 = "toilet_sister_fera_shasei" + this._frames;
	$gameScreen.showPictureFromPath(4, "toilet_nozoku", "toilet_sister_fera_shasei_back", 0, xxx, yyy, scale, scale, 255, 0);
	$gameScreen.showPictureFromPath(12, "toilet_nozoku", IMG1, 0, xxx, yyy, scale, scale, 255, 0);

   	this._frames += 1;
	this._coolDown = this._speed;	

	if (this._frames === 2) {	  
	    AudioManager.playSe({name: "射精音1", volume: 100, pitch: 100, pan: 0});	
	}
    
	if (this._frames === 17) {	  
	    this._coolDown += 9999999;	
	}
	
	if (this._frames >= 25) {	  
	    this.setDead();
	}	
};

// 哥哥自己动手自慰
QJ.MPMZ.tl._OniichanNoopanOnanii = function(extra={}) {

    if (extra.update) {
        this._coolDown = this._coolDown || 0;	
        if (this._coolDown > 0) {
            this._coolDown -= 1;
            return;
        }

        if ( this._shasei && !this._shaseiStart) {
            this._shaseiStart = true;
            this._frames = 1;
            this._speed = 6;
            if (!extra.isBathroom) $gameMap.event(22).steupCEQJ(4,{shasei:true});
        }
        
        this._frames = this._frames || 1;
        this._speed = this._speed || 6;
        let IMG1;
        let scene = "toilet";
        if (extra.isBathroom) scene = "bathroom";
        if (this._shasei) {
            IMG1 = `oniichan_action/${scene}_oniichan_noopan_onanii_shasei` + this._frames;
            $gameScreen.showPicture(16, IMG1, 0, 450, 80, 100, 100, 255, 0);		
        } else {
            IMG1 = `oniichan_action/${scene}_oniichan_noopan_onanii` + this._frames;
            $gameScreen.showPicture(16, IMG1, 0, 450, 620, 100, 100, 255, 0);		
        }

        this._frames += 1;
        this._coolDown = this._speed;	
        
        if (this._shasei) {
            if (this._frames === 2) {
                let seName = "[NSFW]oniichan_noopan_onanii_shasei";
                AudioManager.playVoice({ name: seName, volume: 80, pitch: 100, pan:0 }, false, 2);
            }
            if (extra.isBathroom && this._doOpenly && this._frames === 5) {
                let IMG2 = "bathroom_event/[NSFW]bathroom_helpWashImouto_cumOnHair";
                $gameScreen.showPicture(8, IMG2, 0, 900, 0, 100, 100, 255, 0);	
            }            
            if (extra.isBathroom && this._doSecretly && this._frames === 6) {
                $gameMap.event(5).steupCEQJ(4,{shasei:true});
            }
            if (extra.isBathroom && this._doOpenly && [11,12,13].includes(this._frames-1)) {
                let IMG2 = "bathroom_event/[NSFW]bathroom_helpWashImouto_cumInMouth" + (this._frames - 1);
                $gameScreen.showPicture(9, IMG2, 0, 850, 400, 100, 100, 255, 0);	
            }
            if (this._frames === 16 && extra.isBathroom && this._doOpenly) {
                $gameMap.event(5).steupCEQJ(3,{CumInMouth:true});	 
            }
            
            if (this._frames >= 19) { 
                this.setDead();
            }	
        } else {
            if (this._frames === 4) {
                let seName = "[NSFW]oniichan_noopan_onanii_action" + Math.randomInt(5);
                AudioManager.playVoice({ name: seName, volume: 35, pitch: 100, pan:0 }, false, 2);
            }            
            if (this._frames >= 6) {	  
                this._frames = 1;
            }
        }
        return;
    }
    // 动画播放器初始化
    let listener = QJ.MPMZ.Shoot({
        groupName: ['OniichanOnanii'],
        existData: [ ],
        moveF:[
            [10,0,QJ.MPMZ.tl._OniichanNoopanOnanii, [{update:true, isBathroom:extra.isBathroom}]],
        ]
    });
    this.listenerId = listener.index;
    let scene = "toilet";
    if (extra.isBathroom) scene = "bathroom";
    const preloadNames = [];
    for (let i = 1; i <= 5; i++) {
        preloadNames.push(`oniichan_action/${scene}_oniichan_noopan_onanii` + i);
    }
    for (let i = 1; i <= 18; i++) {
        preloadNames.push(`oniichan_action/${scene}_oniichan_noopan_onanii_shasei` + i);
    }
    if (extra.isBathroom) {
        preloadNames.push("bathroom_event/[NSFW]bathroom_helpWashImouto_cumOnHair");
        for (let i = 11; i <= 13; i++) {
            preloadNames.push("bathroom_event/[NSFW]bathroom_helpWashImouto_cumInMouth" + i);
        }
    }
    ImageManager.preloadPicturesToGpu(preloadNames);
};

// 妹妹立绘脱衣动画
QJ.MPMZ.tl._imoutoUtilTuggingOnTshirt = function(type) {
	
	this._coolDown = this._coolDown || 0;	
	if (this._coolDown > 0) {
	   this._coolDown -= 1;
	   return;
	}
	
	if (this._boobShake) {
		QJ.MPMZ.tl._imoutoUtilTachieBoobShake.call(this);
		return;
	}
	
	
    let max = 4;
	if (this._frames === undefined) this._frames = 1;
	
	var IMG1 = "imoto_tachie/mio_tachie_T-shirt_dragging" + type + this._frames;	
	if (this._frames === 0) IMG1 = "mio_tachie_T-shirt1";
	$gameScreen.showPicture(15, IMG1, 0, 1000, 150, 100, 100, 255, 0);	


	if (this._upend && this._frames == 0) {
		this.setDead({ t: ['Time', 0] });
		this._coolDown += 90;
		this._upend = false;
	}

    if (type === "B") max = 5;
	
	if (!this._upend && this._frames == max) {		
		this._frames -= 1;
		if (type === "A") {
		//掀起T恤停留的时间
		this._coolDown += 10;
		}
		this._upend = true;
		if (type === "B") {
		this._frames = 1;
		this._boobShake = true;
		return;
	  }
	}
	
	if (this._upend) {
		this._frames -= 1;
	} else {
		this._frames += 1;
	}

	this._coolDown += 2;	
		
};

// 妹妹立绘乳摇
QJ.MPMZ.tl._imoutoUtilTachieBoobShake = function() {
	
	if (this._frames === undefined) this._frames = 1;

	if (this._frames >= 7) {
		//$gameScreen.showPicture(11, 'mio_tachie_nudepose1_1', 0, 1000, 150, 100, 100, 255, 0);	
		//$gameScreen.erasePicture(15);
		this.setDead({ t: ['Time', 0] });
		this._frames = 4;
		this._coolDown += 30;
		this._boobShake = false;
		return;
	}
	
	var IMG2 = "imoto_tachie/mio_tachie_boobShake" + this._frames;	

	$gameScreen.showPicture(14, IMG2, 0, 1000, 150, 100, 100, 255, 0);		
	//$gameScreen.showPicture(11, "mio_tachie_handpose1", 0, 1000, 150, 100, 100, 255, 0);
	if (!$gameScreen.picture(21)) {
		$gameScreen.showPicture(21, "imoto_tachie/mio_tachie_T-shirt_dragging_extra", 0, 1000, 150, 100, 100, 255, 0);
	}
	 $gameScreen.picture(21).drill_PLAZ_setZIndex( 13.5 );
	this._frames += 1;
	this._coolDown += 4;
	
};


QJ.MPMZ.tl._batchProcessImageZoomEffects = function (picIds, targetX, targetY, scale) {
	
    const DURATION = 30;               

    // 判断参数是否为有限数字
    const hasX     = Number.isFinite(targetX);
    const hasY     = Number.isFinite(targetY);
    const hasScale = Number.isFinite(scale);

    picIds.forEach(id => {
        const pic = $gameScreen.picture(id);
        if (!pic) return;              // 槽位为空时直接跳过

        const cmdTank = pic._drill_PSh_commandChangeTank;

        if (hasX) {
            cmdTank.push({
                type : 'posX',
                value: targetX - pic._x,
                time : DURATION,
            });
        }
        if (hasY) {
            cmdTank.push({
                type : 'posY',
                value: targetY - pic._y,
                time : DURATION,
            });
        }
        if (hasScale) {
            cmdTank.push({
                type : 'scaleX',
                value: scale - pic._scaleX,
                time : DURATION,
            });
            cmdTank.push({
                type : 'scaleY',
                value: scale - pic._scaleY,
                time : DURATION,
            });
        }
    });
};

// 洗面所偷窥事件ZOOM效果
QJ.MPMZ.tl._washroomNozokuSceneZoomEffects = function () {
	
  const P = id => $gameScreen.picture(id);
  const Z = QJ.MPMZ.tl._batchProcessImageZoomEffects;   
  
  var currentX = 0;
  if (!$gameScreen.picture(50)._currentX) {
        $gameScreen.picture(50)._currentX = $gameScreen.picture(50)._x;
	    currentX = $gameScreen.picture(50)._currentX;
  }	else {
	    currentX = $gameScreen.picture(50)._currentX;
  }
  
  const TABLE = {
    /*=========== 近景：picture(1) < 60% = 镜头推进 ============*/
    IN: {
      common: [
        { pic:[1],             x:-1800, y:-800, s:100 },
		{ pic:[10],             x:400, y:-440, s:100 },
		{ pic:[49,50],             x:null, y:null, s:150 },
		{ pic:[49],             x:-950, y:null, s:null },
		{ pic:[50],             x:-2800, y:-300, s:null }
      ]
    },

    /*=========== 远景：picture(1) ≥ 60% = 镜头拉远 ============*/
    OUT: {
      common: [
        { pic:[1],             x:0, y:0, s:50 },
		{ pic:[10],             x:1100, y:180, s:50 },
		{ pic:[49,50],             x:null, y:null, s:100 },
		{ pic:[49],             x:0, y:null, s:null },
		{ pic:[50],             x:currentX, y:0, s:null }
      ]
    }
  };

  /*—— 主流程 ——*/
  const mode  = P(1)._scaleX < 60 ? 'IN' : 'OUT';
  const block = TABLE[mode];

  /* 1) 公用步骤 */
  block.common.forEach(c => Z(c.pic, c.x, c.y, c.s));

};


// 厕所口交事件ZOOM效果
QJ.MPMZ.tl._toiLetFeraSceneZoomEffects = function () {

  const P = id => $gameScreen.picture(id);
  const Z = QJ.MPMZ.tl._batchProcessImageZoomEffects;   

  const TABLE = {
    /*=========== 近景：picture(1) < 60% = 镜头推进 ============*/
    IN: {
      common: [
        { pic:[1,2,3,4,6,8,10,11,12],             x:null, y:null, s:100 },
        { pic:[1,2,3,6,10,11],                    x:-600, y:-800, s:null }
      ],
      cases: [
        {
          cond : () => P(12)?.name().includes('fera_shasei'),
          steps: [
            { pic:[8],       x: 400, y:   0,  s:null },
            { pic:[4,12],    x: 418, y:-220, s:null }
          ]
        },
        {
          cond : () => P(12)?.name().includes('fera_action'),
          steps: [
            { pic:[4],       x:-600, y:-800, s:null },
            { pic:[8],       x: 400, y:   0, s:null },
            { pic:[12],      x: 800, y: 200, s:null }
          ]
        },
        {
          cond : () => P(12)?.name().includes('toilet_sister_fera1'),
          steps: () => {
            const dx = P(12).name().includes('shasei') ? 500 : 400;
            return [{ pic:[8,12], x:dx, y:-800, s:null }];
          }
        }
      ]
    },

    /*=========== 远景：picture(1) ≥ 60% = 镜头拉远 ============*/
    OUT: {
      common: [
        { pic:[1,2,3,4,6,8,10,11,12],             x:null, y:null, s:50 },
        { pic:[1,2,3,6,10,11],                    x:   0, y:   0, s:null }
      ],
      cases: [
        {
          cond : () => P(12)?.name().includes('fera_shasei'),
          steps: [
            { pic:[8],       x: 500, y: 400, s:null },
            { pic:[4,12],    x: 509, y: 290, s:null }
          ]
        },
        {
          cond : () => P(12)?.name().includes('fera_action'),
          steps: [
            { pic:[4],       x:   0, y:   0, s:null },
            { pic:[8],       x: 500, y: 400, s:null },
            { pic:[12],      x: 700, y: 500, s:null }
          ]
        },
        {
          cond : () => P(12)?.name().includes('toilet_sister_fera1'),
          steps: () => {
            const dx = P(12).name().includes('shasei') ? 550 : 500;
            return [{ pic:[8,12], x:dx, y:0, s:null }];
          }
        }
      ]
    }
  };

  /*—— 主流程 ——*/
  const mode  = P(1)._scaleX < 60 ? 'IN' : 'OUT';
  const block = TABLE[mode];

  /* 1) 公用步骤 */
  block.common.forEach(c => Z(c.pic, c.x, c.y, c.s));

  /* 2) 条件分支（命中一条即退出） */
  for (const branch of block.cases) {
    if (branch.cond()) {
      const steps = (typeof branch.steps === 'function') ? branch.steps() : branch.steps;
      steps.forEach(s => Z(s.pic, s.x, s.y, s.s));
      return;            // 只执行首个匹配分支
    }
  }
};

QJ.MPMZ.tl._sceneZoomInAndZoomOut = function () {
  let picArray;
  let targetX;
  let targetY;
  let scale;

  if ($gameScreen.picture(1)._scaleX < 60) {
    picArray = [1, 2, 3, 4, 6, 8, 10, 11, 12];
    targetX = null;
    targetY = null;
    scale   = 100;
    QJ.MPMZ.tl._batchProcessImageZoomEffects(picArray, targetX, targetY, scale);

    picArray = [1, 2, 3, 6, 10, 11];
    targetX  = -600;
    targetY  = -800;
    scale    = null;
    QJ.MPMZ.tl._batchProcessImageZoomEffects(picArray, targetX, targetY, scale);

    if ($gameScreen.picture(12) && $gameScreen.picture(12).name().includes("fera_shasei")) {
      picArray = [8];
      targetX  = 400;
      targetY  = 0;
      scale    = null;
      QJ.MPMZ.tl._batchProcessImageZoomEffects(picArray, targetX, targetY, scale);

      picArray = [4, 12];
      targetX  = 418;
      targetY  = -220;
      scale    = null;
      QJ.MPMZ.tl._batchProcessImageZoomEffects(picArray, targetX, targetY, scale);
      return;
    }

    picArray = [4];
    targetX  = -600;
    targetY  = -800;
    scale    = null;
    QJ.MPMZ.tl._batchProcessImageZoomEffects(picArray, targetX, targetY, scale);

    if ($gameScreen.picture(12) && $gameScreen.picture(12).name().includes("fera_action")) {
      picArray = [8];
      targetX  = 400;
      targetY  = 0;
      scale    = null;
      QJ.MPMZ.tl._batchProcessImageZoomEffects(picArray, targetX, targetY, scale);

      picArray = [12];
      targetX  = 800;
      targetY  = 200;
      scale    = null;
      QJ.MPMZ.tl._batchProcessImageZoomEffects(picArray, targetX, targetY, scale);
      return;
    }

    if ($gameScreen.picture(12) && $gameScreen.picture(12).name().includes("toilet_sister_fera1")) {
      if ($gameScreen.picture(12).name().includes("shasei")) {
        picArray = [8, 12];
        targetX  = 500;
        targetY  = -800;
        scale    = null;
        QJ.MPMZ.tl._batchProcessImageZoomEffects(picArray, targetX, targetY, scale);
        return;
      }
      picArray = [8, 12];
      targetX  = 400;
      targetY  = -800;
      scale    = null;
      QJ.MPMZ.tl._batchProcessImageZoomEffects(picArray, targetX, targetY, scale);
      return;
    }
  } else {
    picArray = [1, 2, 3, 4, 6, 8, 10, 11, 12];
    targetX  = null;
    targetY  = null;
    scale    = 50;
    QJ.MPMZ.tl._batchProcessImageZoomEffects(picArray, targetX, targetY, scale);

    picArray = [1, 2, 3, 6, 10, 11];
    targetX  = 0;
    targetY  = 0;
    scale    = null;
    QJ.MPMZ.tl._batchProcessImageZoomEffects(picArray, targetX, targetY, scale);

    if ($gameScreen.picture(12) && $gameScreen.picture(12).name().includes("fera_shasei")) {
      picArray = [8];
      targetX  = 500;
      targetY  = 400;
      scale    = null;
      QJ.MPMZ.tl._batchProcessImageZoomEffects(picArray, targetX, targetY, scale);

      picArray = [4, 12];
      targetX  = 509;
      targetY  = 290;
      scale    = null;
      QJ.MPMZ.tl._batchProcessImageZoomEffects(picArray, targetX, targetY, scale);
      return;
    }

    picArray = [4];
    targetX  = 0;
    targetY  = 0;
    scale    = null;
    QJ.MPMZ.tl._batchProcessImageZoomEffects(picArray, targetX, targetY, scale);

    if ($gameScreen.picture(12) && $gameScreen.picture(12).name().includes("fera_action")) {
      picArray = [8];
      targetX  = 500;
      targetY  = 400;
      scale    = null;
      QJ.MPMZ.tl._batchProcessImageZoomEffects(picArray, targetX, targetY, scale);

      picArray = [12];
      targetX  = 700;
      targetY  = 500;
      scale    = null;
      QJ.MPMZ.tl._batchProcessImageZoomEffects(picArray, targetX, targetY, scale);
      return;
    }

    if ($gameScreen.picture(12) && $gameScreen.picture(12).name().includes("toilet_sister_fera1")) {
      if ($gameScreen.picture(12).name().includes("shasei")) {
        picArray = [8, 12];
        targetX  = 550;
        targetY  = 0;
        scale    = null;
        QJ.MPMZ.tl._batchProcessImageZoomEffects(picArray, targetX, targetY, scale);
        return;
      }
      picArray = [8, 12];
      targetX  = 500;
      targetY  = 0;
      scale    = null;
      QJ.MPMZ.tl._batchProcessImageZoomEffects(picArray, targetX, targetY, scale);
      return;
    }
  }
};
