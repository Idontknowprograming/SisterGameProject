//=============================================================================
 /*:
 * @plugindesc 动画脚本
 * @author shiroin
 */
//=============================================================================
DrillUp.g_PSh_pics = DrillUp.g_PSh_pics || [];
DrillUp.g_PSh_pics = [
	"mio_tachie_ahoge",
	"mio_tachie_kao_-A-",
	"mio_tachie_kao_okoru",
	"mio_tachie_kao_kimo",
	"mio_tachie_kao_happy",
	"mio_tachie_kao_ida",
	"mio_tachie_kao_duqi",
	"mio_tachie_kao_naku",
	"mio_tachie_kao_smile",
	"mio_tachie_kao_smile2",
	"mio_tachie_kao_=ω=",
	"mio_tachie_kao_OAO",
	"mio_tachie_kao_nununu",
	"mio_tachie_kao_mu",
	"mio_tachie_kao_shy2",
	"mio_tachie_kao_shy1",
	"mio_tachie_kao_mu2",
	"mio_tachie_kao_eee",
	"mio_tachie_kao_ase",
	"mio_tachie_kao_bimyou1",
	"mio_tachie_kao_bimyou2",
	"mio_tachie_kao_nununu2",
	"mio_tachie_kao_nununu3",
	"mio_tachie_kao_hokori",
	"mio_tachie_kao_ehe",
	"mio_tachie_kao_nemui",
	"mio_tachie_kao_koufun1",
	"mio_tachie_kao_koufun2",
	"mio_tachie_kao_koufun3",
	"mio_tachie_happy",
	"mio_tachie_IAI",
	"mio_tachie_smile",
	"mio_tachie_smile2",
	"mio_tachie_@_@",
	"mio_tachie_=ω=",
	"mio_tachie_OAO",
	"mio_tachie_shinnpai",
	"mio_tachie_mu",
	"mio_tachie_naku",
	"mio_tachie_nocoat_smile",
	"sis_chibi_normal_patpat",
	"sis_chibi_normal_sleepy",
	"mio_tachie_ase",
	"mio_tachie_kimo",
	"mio_tachie_ida",
	"mio_tachie_noKao"
];

// 开始料理按钮：厨房专用，不注册到通用按钮模板。
// QJ.MPMZ.tl.startCookingButton();               // 创建/重建，默认屏幕坐标 (893,830)
// QJ.MPMZ.tl.startCookingButton({remove:true});  // 收起
// extra 可覆盖 x/y、readyImage/disabledImage（img/projectiles 下的文件名）。
// 变量75～77任一有食材时显示红色，否则灰色；悬停不换图。松开执行并行公共事件66。
// 语言3、11自动选取对应贴图；图片21（食材槽背景）消失后销毁，不留下独立监听器。
(() => {
const visuals = new WeakMap(); // Bitmap 只放运行时缓存，不能挂在会被存档的 QJ 子弹上。
QJ.MPMZ.tl.startCookingButton = function (extra = {}) {
    const group = "startCookingButton";
    if (extra.remove) {
        QJ.MPMZ.deleteProjectile(group);
        return null;
    }

    if (extra.refresh) {
        const options = this.data.extra.cookingButton;
        if ($gameMap.mapId() !== options.mapId || !$gameScreen.picture(21)) {
            this.setDead();
            return;
        }
        const parent = SceneManager._scene._spriteset;
        const sx = parent.scale.x, sy = parent.scale.y;
        const displayX = $gameMap.displayX() * QJ.tileSize;
        const displayY = $gameMap.displayY() * QJ.tileSize;
        const x = (options.x - parent.x) / sx + displayX;
        const y = (options.y - parent.y) / sy + displayY;
        if (this.scaleX !== 1 / sx || this.scaleY !== 1 / sy) {
            this.changeAttribute("scale", [1 / sx, 1 / sy]);
        }
        this._x = this.x = x;
        this._y = this.y = y;
        this._orginDisplayX = displayX;
        this._orginDisplayY = displayY;

        const language = ConfigManager.language;
        let visual = visuals.get(this);
        if (!visual || visual.language !== language) {
            const suffix = language === 3 || language === 11 ? language : "";
            const images = [
                options.disabledImage || "imoutoUtil/cook_start_unusable" + suffix,
                options.readyImage || "imoutoUtil/cook_start" + suffix
            ];
            visual = { language, images, bitmaps: images.map(name => ImageManager.loadProjectileQJ(name)), loaded: false };
            visuals.set(this, visual);
        }
        const ready = [75, 76, 77].some(id => $gameVariables.value(id) > 0) && !$gameSwitches.value(37);
        // 两张原图差1像素，使用共同矩形，保持状态切换前后的点击范围一致。
        if (!visual.loaded && visual.bitmaps.every(bitmap => bitmap.isReady())) {
            visual.loaded = true;
            visual.width = Math.max(...visual.bitmaps.map(bitmap => bitmap.width));
            visual.height = Math.max(...visual.bitmaps.map(bitmap => bitmap.height));
        }
        const sceneChanging = SceneManager.isSceneChanging();
        const hovered = visual.loaded && !sceneChanging &&
            Math.abs(TouchInput.x - options.x) <= visual.width / 2 &&
            Math.abs(TouchInput.y - options.y) <= visual.height / 2;
        const image = visual.images[ready ? 1 : 0];
        if (image !== this._cookingImage) {
            this._cookingImage = image;
            this.changeAttribute("img", image);
        }
        // 监听隔帧执行，按压状态变化用于补上两次监听之间错过的单帧信号。
        const pressed = TouchInput.drill_isLeftPressed();
        const triggered = TouchInput.drill_isLeftTriggered() ||
            (pressed && !this._cookingWasPressed);
        const released = TouchInput.drill_isLeftReleased() || (!pressed && this._cookingWasPressed);
        this._cookingWasPressed = pressed;
        if (hovered && !this._cookingHovered) SoundManager.playCursor();
        this._cookingHovered = hovered;
        if (sceneChanging) this._cookingCaptured = false;
        if (triggered && hovered && this.time >= (this._cookingCooldownUntil || 0)) {
            this._cookingCaptured = true;
        }
        if (released && this._cookingCaptured) {
            this._cookingCaptured = false;
            this._cookingCooldownUntil = this.time + 12;
            if (!ready) {
                const posX = 900;
                const posY = 800;
                const text = window['mapCommonEventDialogue']?.['cookingSystem']?.['3']?.join('');
                if (text) {
                    $gameTemp.drill_GFTT_createSimple( [posX,posY], `\\c[10]\\dDCOG[11:2:2:2]\\fs[28]${text}`, 2, 9, 90 );
                }
                SoundManager.playBuzzer();
            } else {
                SoundManager.playOk();
                // 保留公共事件自身对消息窗口、食材消耗和制作流程的检查。
                $gameMap.steupCEQJ(66, 0, {});
            }
        }
        return;
    }

    QJ.MPMZ.deleteProjectile(group);
    if (!$gameScreen.picture(21)) return null;
    const options = {
        mapId: $gameMap.mapId(), x: extra.x ?? 893, y: extra.y ?? 830,
        readyImage: extra.readyImage, disabledImage: extra.disabledImage
    };
    const language = ConfigManager.language;
    const suffix = language === 3 || language === 11 ? language : "";
    const ready = [75, 76, 77].some(id => $gameVariables.value(id) > 0) && !$gameSwitches.value(37);
    const parent = SceneManager._scene._spriteset;
    const sx = parent.scale.x, sy = parent.scale.y;
    return QJ.MPMZ.Shoot({
        groupName: ["SceneButton", group],
        img: ready ? options.readyImage || "imoutoUtil/cook_start" + suffix
            : options.disabledImage || "imoutoUtil/cook_start_unusable" + suffix,
        position: [["S", (options.x - parent.x) / sx], ["S", (options.y - parent.y) / sy]],
        initialRotation: ["S", 0], imgRotation: ["S", 0], moveType: ["S", 0],
        anchor: [0.5, 0.5], scale: [1 / sx, 1 / sy], opacity: 1, z: "A", onScreen: true,
        collisionBox: ["C", 1], existData: [], extra: { cookingButton: options },
        moveF: [[0, 1, QJ.MPMZ.tl.startCookingButton, [{ refresh: true }]]]
    });
};
})();

// 检测妹妹吃料理动画类型
QJ.MPMZ.tl.getImoutoEatingAnimationType = function(extra = {}) {	

   if (!$gameSelfSwitches.value([$gameMap.mapId(), 14, 'A'])) {
	 // 不是哥哥做菜的情形，目前不支持触发
       return false;
   }

   const hasTableware = [240,241,242,245,248,251,253,254,255,256,258,262,268,275,276,278,279,285,296,300];
   const noTableware  = [247,252,273,274];
   const dish         = $gameMap.chahuiMapTemp?.cookedDish || $gameVariables.value(78);

   if (dish) {
       if (hasTableware.includes(dish)) {
		   $gameMap.chahuiMapTemp.eatingAnimationType = "hasTableware";
		   return true; 
	   } else if (noTableware.includes(dish)) {
		   $gameMap.chahuiMapTemp.eatingAnimationType = "noTableware";
		   return true;
	   }
   } 
   return false;
};

// 哥哥自己做饭动画
QJ.MPMZ.tl.OniiChanCookingHimselfAnim = function(extra = {}) {	

   if (extra.refresh) {
		this._coolDown = this._coolDown || 0;	
		if (this._coolDown > 0) {
		   this._coolDown -= 1;
		   return;
		}

		this._frames = this._frames || 1;
		
		let IMG = "[NSFW]kitchen_Onii-chan_cookingHimself" + this._frames;
		if (ConfigManager.harmonyMode) {
			IMG = "kitchen_Onii-chan_cookingHimself" + this._frames;
		}
		$gameScreen.showPictureFromPath(24, "kitchen_event", IMG, 0, 707, 187, 100, 100, 255, 0);
		if (!ConfigManager.harmonyMode && !$gameScreen.picture(25)) {
			$gameScreen.showPictureFromPath(25, "kitchen_event", "kitchen_Onii-chan_cookingHimself_clothes", 0, 760, 470, 100, 100, 255, 0);
		}
		
		if (this._frames >= 3) {
			this._coolDown = Math.randomInt(3) + 4;
			this._frames -= 1;
			this._upend = true;
			return;
		}

		if (this._upend && this._frames <= 1) {
			this._coolDown = Math.randomInt(3) + 4;
			this._frames += 1;
			this._upend = false;
			return;
		}
		
		if (this._upend) {
			this._frames -= 1;
		} else {
			this._frames += 1;
		}
		this._coolDown = Math.randomInt(3) + 4;	
		return;
   }

   if (extra.rubbingSalt) {
		$gameScreen._particle.particleSet(0, 'salt', 'picture:24', 'monster_c');
		setTimeout(() => {
			$gameScreen._particle.particleUpdate(['salt','alpha','0.35']);
			$gameScreen._particle.particleUpdate(['salt','scale','0.4','0']);
			$gameScreen._particle.particleUpdate(['salt','color','#ffffff']);
			$gameScreen._particle.particleUpdate(['salt','pos','120','170']);
			$gameScreen._particle.particleUpdate(['salt','speed','222','322']);
			$gameScreen._particle.particleUpdate(['salt','acceleration','0','400']);
			$gameScreen._particle.particleUpdate(['salt','startRotation','0','150']);		 
		}, 20);
		return;
   }

   if (extra.isClothesDestroyed) {
	  if (extra.isClothesDestroyed === "successful") return;
	  if (!$gameScreen.picture(25) || ConfigManager.harmonyMode) return;
      let controlled_sprite = $gameTemp.drill_PSE_getPictureSpriteByPictureId( 25 );
      let controller = controlled_sprite.drill_PSE_createController( 21 );
	  setTimeout(() => {
          controller.drill_COSE_runShatter();	
      }, 200);		  
	  let animation = QJ.MPMZ.Shoot({
			img:'MGC_W2_Explosion_V4_Lv1[5,10,2]',
			position:[['S',850],['S',840]],
			scale:8,
			initialRotation:['S',0],
			imgRotation:['F'],
			opacity:1,
			onScreen: true,
			z:"A",
			collisionBox:['C',1],
			moveType:['S',0],
			blendMode:1,
			moveJS:[
			  [16,999,`AudioManager.playSe({ name: 'SummonFX04_11_BlightPollenCritical', volume: 65, pitch: 90, pan: 0 });
			           $gameScreen.startFlash([0, 0, 0, 165], 60);
	  	               $gameScreen.setShakeRandom();
	  	               $gameScreen.startShake(6, 9, 45);`]
			],
			existData:[	
			  {t:['Time',98]},
			]       
      });
      if (extra.interpreter)  extra.interpreter.wait(60);
      return;
   }	   
   // ====== 动画脚本监听器 ======   
   let listener = QJ.MPMZ.Shoot({
	  groupName: ['OniiChanCookingHimself'],
      existData: [ 
	  ],
      moveF: [
        [40,0,QJ.MPMZ.tl.OniiChanCookingHimselfAnim,[{refresh:true}]],
		[42,9999,QJ.MPMZ.tl.OniiChanCookingHimselfAnim,[{rubbingSalt:true}]],
      ]	
   });
   for (let i = 1; i <= 3; i++) {
      if (ConfigManager.harmonyMode) {
		  ImageManager.loadPicture( `kitchen_event/kitchen_Onii-chan_cookingHimself${i}` );
	  } else {
          ImageManager.loadPicture( `kitchen_event/[NSFW]kitchen_Onii-chan_cookingHimself${i}` );   
	  }
   }
   ImageManager.loadPicture( "kitchen_event/kitchen_Onii-chan_cookingHimself_clothes" );
};

// 妹妹对哥哥说教
// QJ.MPMZ.tl.ImoutoLectureAnim({type:1}); // 人物2～9帧、手势1～6帧循环（默认）
// QJ.MPMZ.tl.ImoutoLectureAnim({type:2}); // 人物14～18帧、手势1～10帧循环
// QJ.MPMZ.tl.ImoutoLectureAnim({type:1, bodyWait:6, handWait:6,
//     bodyWaitRules:{2:30, 9:12}, handWaitRules:{1:20, 6:15}});
// 等待值为画面停留的游戏帧数（正整数），Rules 按素材帧号覆盖默认值。
// needToPauseAnim === true 时，人物立即切到9/18帧，手势冻结；恢复时人物从循环起点播放。
// 再次调用从头播放；{remove:true} 停止并清除两层。
QJ.MPMZ.tl.ImoutoLectureAnim = function(extra = {}) {
    // 人物层：在启动时选定的范围内循环。
    if (extra.refresh && extra.layer === "body") {
        const body = this.data.extra.body;
        // 暂停检测不受当前帧等待时间影响，只在进入暂停时换一次图。
        if ($gameMap.chahuiMapTemp.needToPauseAnim === true) {
            if (!this.data.extra.paused) {
                const IMG = "sis_room/Imouto_Lecture" + body.loopEnd;
                QJ.MPMZ.tl.showAnimationFramePicture(this, 10, IMG, 0, 340, 0, 100, 100, 255, 0);
                this.data.extra.paused = true;
            }
            return;
        }
        if (this.data.extra.paused) {
            this.data.extra.paused = false;
            body.frame = body.loopStart;
            body.coolDown = 0;
        }

        if (body.coolDown > 0) {
            body.coolDown -= 1;
            if (body.coolDown > 0) return;
        }

        if (body.frame > body.loopEnd) {
            body.frame = body.loopStart;
        }

        const IMG = "sis_room/Imouto_Lecture" + body.frame;
        QJ.MPMZ.tl.showAnimationFramePicture(this, 10, IMG, 0, 340, 0, 100, 100, 255, 0);
        body.coolDown = body.waitRules[body.frame] ?? body.wait;
        body.frame += 1;
        return;
    }

    // 手势层：按类型选择循环终点，等待时不影响人物层。
    if (extra.refresh && extra.layer === "hand") {
        if (this.data.extra.paused) return;
        const hand = this.data.extra.hand;
        if (hand.coolDown > 0) {
            hand.coolDown -= 1;
            if (hand.coolDown > 0) return;
        }

        if (hand.frame > hand.loopEnd) {
            hand.frame = 1;
        }

        const IMG = "sis_room/Imouto_Lecture_hand" + hand.frame;
        QJ.MPMZ.tl.showAnimationFramePicture(this, 11, IMG, 0, 560, 550, 100, 100, 255, 0);
        hand.coolDown = hand.waitRules[hand.frame] ?? hand.wait;
        hand.frame += 1;
        return;
    }

    QJ.MPMZ.deleteProjectile("ImoutoLectureAnim");
    if (extra.remove) {
        $gameScreen.erasePicture(10);
        $gameScreen.erasePicture(11);
        return null;
    }

    const loopStart = extra.type === 2 ? 14 : 2;
    const loopEnd = extra.type === 2 ? 18 : 9;
    const handLoopEnd = extra.type === 2 ? 10 : 6;

    // 预加载本次循环需要的帧。
    for (let i = loopStart; i <= loopEnd; i++) ImageManager.loadPicture("sis_room/Imouto_Lecture" + i);
    for (let i = 1; i <= handLoopEnd; i++) ImageManager.loadPicture("sis_room/Imouto_Lecture_hand" + i);

    // 两条监听各自更新帧号和等待计数。
    const listener = QJ.MPMZ.Shoot({
        groupName: ['ImoutoLectureAnim'],
        moveType: ['S',0],
        existData: [],
        extra: {
            paused: false,
            body: {frame:loopStart, loopStart, loopEnd, coolDown:0,
                wait:extra.bodyWait ?? 6, waitRules:extra.bodyWaitRules ?? {}},
            hand: {frame:1, loopEnd:handLoopEnd, coolDown:0,
                wait:extra.handWait ?? 6, waitRules:extra.handWaitRules ?? {}}
        },
        // 人物先更新暂停状态，手势随后读取，保证同一帧暂停/恢复；间隔0为每帧调用。
        moveF: [
            [0,0,QJ.MPMZ.tl.ImoutoLectureAnim,[{refresh:true, layer:"body"}]],
            [0,0,QJ.MPMZ.tl.ImoutoLectureAnim,[{refresh:true, layer:"hand"}]]
        ]
    });
    if (listener) {
        // 首次先显示手势，确保带着暂停标记启动时也有可冻结的画面。
        QJ.MPMZ.tl.ImoutoLectureAnim.call(listener, {refresh:true, layer:"hand"});
        QJ.MPMZ.tl.ImoutoLectureAnim.call(listener, {refresh:true, layer:"body"});
    }
    return listener;
};

// 早晨妹妹刷牙动画
QJ.MPMZ.tl.ImoutoBrushTeethAnimation = function(extra = {}) {	
	
   if (extra.refresh) {
	   this._coolDown = this._coolDown || 0;
	   if (this._coolDown > 0) {
		 this._coolDown -= 1;
		 return;
	   }
	   // ====== 动画阶段配置 ======
	   const PHASES = {
		 1: { entry: 5,   loopStart: 5,   loopEnd: 28,  type: "loop" },
		 2: { entry: 30,  loopStart: 48,  loopEnd: 78,  type: "loop" },
		 3: { entry: 80,  loopStart: 96,  loopEnd: 120, type: "loop" },
		 4: { entry: 122, loopStart: 171, loopEnd: 184, type: "loop" },
		 5: { entry: 185, loopStart: 185, loopEnd: 211, type: "once" }
	   };	   
	   
	   this._phase      = this._phase     || 1;
	   this._loopTimes  = this._loopTimes || 0;
       const cfg = PHASES[this._phase] || PHASES[1];
	   // 帧初始化
	   this._frames = this._frames || cfg.entry;	   
	   let IMG = "washroom_morning_event/brushingTeeth" + this._frames.padZero(4);
       $gameScreen.showPicture(8, IMG, 0, 200, 100, 100, 100, 255, 0);
	   
	   // 过渡帧
	   if (this._frames < cfg.loopStart) {
		   this._frames += 1;
		   this._coolDown = 3;
		   if (this._frames === 47) {
			   AudioManager.playBgs({ name: "歯磨き", volume: 95, pitch: 80, pan: 0 });
		   }		   
		   if (this._frames === 96) {
			   AudioManager.playBgs({ name: "歯磨き", volume: 95, pitch: 100, pan: 0 });
		   }		   
		   if (this._frames === 133) {
			   AudioManager.stopVoice(null, 3);
			   AudioManager.playVoice({ name: "washroom_event_sis_morning3", volume: 90, pitch: 100, pan: 0 }, false, 1);
		   }
		   if (this._frames === 161) {
			   setTimeout(() => AudioManager.playVoice({ name: "washroom_event_sis_morning4", volume: 90, pitch: 100, pan: 0 }, false, 1), 300);
			   this._coolDown += 35;
		   }		   
		   return;
	   }
	   
		// 循环动画判断
	   if (cfg.type === "loop") {
		  if (this._frames >= cfg.loopEnd) {
			  this._frames = cfg.loopStart; // 回到循环起点
			  this._loopTimes += 1;
		  } else {
			  this._frames += 1;
		  }
		  this._coolDown = 3;		  
		   // 特殊帧效果
		   if (this._phase === 1 && this._frames === 5 && this._loopTimes >= 1 && this._eventPhaseComplete && !$gameMessage.isBusy()) {
			   $gameMap.event(11).steupCEQJ(2, {phaseSwitch:2});
			   QJ.MPMZ.tl.ImoutoBrushTeethAnimation({phaseSwitch:2});
			   return;
		   }		  
		   if (this._phase === 2 && this._frames === 48 && this._loopTimes >= 1 && this._eventPhaseComplete && !$gameMessage.isBusy()) {
			   $gameMap.event(11).steupCEQJ(2, {phaseSwitch:3});
			   QJ.MPMZ.tl.ImoutoBrushTeethAnimation({phaseSwitch:3});
			   return;
		   }		   
		   if (this._frames === 184 && this._loopTimes > 1 && !$gameMessage.isBusy()) {
			   AudioManager.playVoice({ name: "washroom_event_sis_morning5", volume: 90, pitch: 100, pan: 0 });
			   for (let i = 186; i <= 212; i++) {
    			   let pid = String(i).padZero(4);
    			   ImageManager.loadPicture( `washroom_morning_event/brushingTeeth${pid}` );
 			   }
			   QJ.MPMZ.tl.ImoutoBrushTeethAnimation({phaseSwitch:5});
			   return;
		   }			      
		   if (this._frames === 203) {
			   this._coolDown += 40;
		   }  
		  return;
	   }
	   // 最后阶段的动画
	   if (cfg.type === "once") {
		  if (this._frames >= cfg.loopEnd) {
			  $gameMap.event(11).steupCEQJ(2, {phaseSwitch:5});
			  this.setDead({t:['Time',0]});
		  } else {
			this._frames += 1;
		  }
		  this._coolDown = 3;
		  if (this._frames === 194) {
			  setTimeout(() => AudioManager.playVoice({ name: "washroom_event_sis_morning6", volume: 90, pitch: 100, pan: 0 }, false, 1), 500);
			  this._coolDown += 35;
		  }			  
		  if (this._frames === 209) {
			  AudioManager.playVoice({ name: "washroom_event_sis_morning7", volume: 90, pitch: 100, pan: 0 }, false, 1);
		  } 		  
		  return;
		}	   
	   return;
   }
   // ====== 事件分支完成通知 / 切换动画阶段 ======
   if (extra.phaseComplete || extra.phaseSwitch) {
      let list = $gameMap.getGroupBulletListQJ('ImoutoBrushTeeth');
	  if (list.length <= 0) return;
	  let bullet = $gameMap._mapBulletsQJ[list[0]];
	  if (extra.phaseComplete) {
		  // 由该分支最后一条独立脚本通知；消息空闲本身不能代表分支结束。
		  if (bullet._phase === extra.phaseComplete) bullet._eventPhaseComplete = true;
		  return;
	  }
	  bullet._phase     = extra.phaseSwitch;
	  bullet._loopTimes = 0;
	  bullet._eventPhaseComplete = false;
	  if (extra.phaseSwitch == 4) {
		  AudioManager.fadeOutBgs(1);
	  }
	  return;
   }	   
   // ====== 动画脚本监听器 ======   
   let listener = QJ.MPMZ.Shoot({
	  groupName: ['ImoutoBrushTeeth'],
      existData: [ 
	  ],
      moveF: [
        [15,0,QJ.MPMZ.tl.ImoutoBrushTeethAnimation,[{refresh:true}]]
      ]
   });  
   listener._phase = 1;
   listener._eventPhaseComplete = false;
   AudioManager.playBgs({ name: "歯磨き", volume: 95, pitch: 100, pan: 0 });
};



// 天气预报节目
QJ.MPMZ.tl.showWeatherForecastDisplay = function() {
    
	Graphics._createFontLoader( "Maple Mono NF CN ExtraBold" );
	//

    $gameMap.createFilter("tvFX", "crt", 0);
    $gameMap.setFilter( "tvFX" ,[1,3,0.05,0.1,0.5]);
    const vName = "weatherForecast_back";
    $gameScreen.setVideoPictureName(vName, false, false);	 // 没有透明通道
    // 绑定视频
    let pid = 60;
    $gameScreen.showPicture(pid, '', 0, 0, 0, 100, 100, 255, 0);
    let pic = $gameScreen.picture(pid);
    if (pic) {
        pic.setVideoLoop(true);
        pic.setVideoSpeed(120);
        pic.setVideoPause(false);
    }
	
	let weatherList = {
		400: 'weatherForecast_day',
		401: 'weatherForecast_cloudy',
		402: 'weatherForecast_rainy',
		403: 'weatherForecast_hotday'		 
	};
    // 初始化天气预报数组
    if ($gameNumberArray.value(30).length !== 7) {
		$gameNumberArray.setValue(30,[]);
        for (let i = 0; i < 7; i++) {
			let type = dingk.Loot.calculateRandomItemIndex(2);
			if (type == 400) {
             // 可能转化为炎热天气
             if ($gameParty.hasItem($dataItems[198]) || $gameSelfSwitches.value([24, 14, 'A'])) {
                 if (Math.random() > 0.75)  type = 403;
              } else {
                 if (Math.random() > 0.9)   type = 403;
              }			 
			}				
            $gameNumberArray.value(30).push(type);
        }
    }
    // 生成天气信息
	for (let index = 0; index < 5; index++) {
		let xx    = 16; 
		xx       += index * 224;
		let yy    = 390;
		pid       = 70 + index;
		let weatherIndex = $gameNumberArray.value(30)[index]
		let weatherName = weatherList[weatherIndex];
		let weather = 'living_room/' + weatherName;
		$gameScreen.showPicture(pid, weather, 0, xx, yy, 100, 100, 255, 0);
		if ($gameScreen.picture(pid)) {
			$gameScreen.picture(pid).drill_PCE_playSustainingBreathing( 36000,60,5 );
		}
        // 指定天数
        let dayArgs = { 
	        text: "Day" + ($gameSystem.day() + index + 1), 
		    x: xx + 90, 
		    y: yy - 55, 
		    width: 120, 
		    textAlign: 5, 
		    fontSize: 42, 
		    fontFace: "Maple Mono NF CN ExtraBold", 
		    groupName: ['WeatherForecast'],
		    opacity: 1,
		    scale: 1,
		    z: "A"
	    };
		// 最高气温
		let max = 25;
		let min = 15;
		switch (weatherIndex) {
              case 400: // 晴天
                 max = 30 + Math.randomInt(8);
				 min = 22 + Math.randomInt(5);
                 break;	
              case 401: // 阴天
                 max = 26 + Math.randomInt(6);
				 min = 16 + Math.randomInt(5);
                 break;	
              case 402: // 雨天
                 max = 22 + Math.randomInt(5);
				 min = 12 + Math.randomInt(5);
                 break;
              case 403: // 炎天
                 max = 40 + Math.randomInt(10);
				 min = 25 + Math.randomInt(5);
                 break;				 
		}
		min = Math.min(max-2, min);
        let maxArgs = { 
	        text: String(max), 
		    x: xx + 93, 
		    y: yy + 220, 
		    width: 120, 
		    textAlign: 5, 
		    fontSize: 45, 
		    fontFace: "Maple Mono NF CN ExtraBold", 
		    groupName: ['WeatherForecast'],
		    opacity: 1,
		    scale: 1,
		    z: "A"
	    };
        let minArgs = { 
	        text: String(min), 
		    x: xx + 93, 
		    y: yy + 471, 
		    width: 120, 
		    textAlign: 5, 
		    fontSize: 45, 
		    fontFace: "Maple Mono NF CN ExtraBold", 
		    groupName: ['WeatherForecast'],
		    opacity: 1,
		    scale: 1,
		    z: "A"
	    };		
		QJ.MPMZ.tl.customShootText(dayArgs);
        QJ.MPMZ.tl.customShootText(maxArgs);
		QJ.MPMZ.tl.customShootText(minArgs);
		// 绑定温度计演出
		pid     = 80 + index;
		let thermometer = 'living_room/thermometer2';
		if (max > 40)   thermometer = 'living_room/thermometer1';
		if (min < 15)   thermometer = 'living_room/thermometer3';
		let xxx = xx + 75;
		let yyy = yy + 257;
		let extraY = ((50 - max)/60) * 174;
		yyy    += extraY;
		if (index == 0) xxx += 1;
		let scaleY = Math.round(100*((max-min)/40));
		$gameScreen.showPicture(pid, thermometer, 0, xxx, yyy, 100, scaleY, 255, 0);
	}
	// 兔言兔语
	for (let i = 0; i < 10; i++) {
	    let seName = "USAUSA" + i;
	    $gameTemp.drill_VI_pushAudio( "voice", seName );
	}
	QJ.MPMZ.Shoot({
   	    existData: [ ],
   	    groupName:['usausa'],
   	    moveF:[
     	    [60,0,QJ.MPMZ.tl._USAUSAUSAUSA]
   	    ]
	});	
};

// 检测正在播放的 BGM 处于 [fromSec, toSec] 区间（含端点）
// 可选 epsilon（误差容忍，默认 0.05s）；自动兼容 Html5Audio 回退与循环点
QJ.MPMZ.tl.isBgmInWindow = function(fromSec, toSec, epsilon) {
  var a = Math.min(fromSec, toSec), b = Math.max(fromSec, toSec);
  var eps = (epsilon == null) ? 0.05 : Math.max(0, epsilon);

  var buf = AudioManager._bgmBuffer;
  var cur = AudioManager._currentBgm;

  if (!buf || !cur || !cur.name) return false;

  // 取当前播放时间（秒）
  var t = 0;
  if (typeof buf.seek === 'function' && (!buf.isReady || buf.isReady())) {
    t = buf.seek();                            // WebAudio
  } else if (window.Html5Audio && buf === Html5Audio && Html5Audio._audio) {
    t = Html5Audio._audio.currentTime || 0;    // Html5Audio 回退
  } else {
    return false;
  }

  // 处理循环：把时间折回到当前循环周内（有 loop 点才需要）
  var loopStart  = buf._loopStart  || 0;
  var loopLength = buf._loopLength || 0;
  if (loopLength > 0 && t >= loopStart) {
    t = loopStart + ((t - loopStart) % loopLength);
  }

  // 区间判定（带轻微误差容忍）
  return t >= (a - eps) && t <= (b + eps);
};


QJ.MPMZ.tl._shuffledZeroToNine = function() {
  var a = [];
  for (var i = 0; i < 10; i++) a.push(i);     // [0..9]

  for (var j = a.length - 1; j > 0; j--) {    // 洗牌
    var k = (Math.randomInt ? Math.randomInt(j + 1)
                            : Math.floor(Math.random() * (j + 1)));
    var t = a[j]; a[j] = a[k]; a[k] = t;
  }
  return a;	
};

QJ.MPMZ.tl._USAUSAUSAUSA = function() {
	
	this._coolDown = this._coolDown || 0;	
	if (this._coolDown > 0) {
	   this._coolDown -= 1;
	   return;
	}
    if (!this._USAUSAIndex || this._USAUSAIndex.length <= 0) {
		this._USAUSAIndex = QJ.MPMZ.tl._shuffledZeroToNine();
	}
	
	if (AudioManager.isExistVoiceChannel(2)) {
	   	this._coolDown = 2;
		return;
	}
	let index = this._USAUSAIndex.pop();
	let seName = "USAUSA" + index;
    AudioManager.playVoice({ name: seName, volume: 90, pitch: 100, pan: 0 }, false, 2);
	this._coolDown = 10;
	
};

// 妹妹挑选食材（规划 or 动画取样）
// 规划时先从库存里寻找可成立的 1~3 食材配方；动画只重复展示最终材料，
// 不再把十次动画投料当成十个候选并于结算时重新随机。
QJ.MPMZ.tl._imoutoUtilImoutoCookingPickIngredients = function(preference) {
  const poolSlot = 15;
  const ingredientSlot = 16;
  const pickMode = (preference && preference === "picking") ||
    (preference && typeof preference === "object" && preference.pick);

  // -------- A) 动画取样模式 --------
  if (pickMode) {
    const plan = $gameTemp._imoutoCookingPlan;
    const visualItemIds = plan && Array.isArray(plan.selectedItemIds)
      ? plan.selectedItemIds
      : [];
    if (visualItemIds.length > 0) {
      return visualItemIds[Math.floor(Math.random() * visualItemIds.length)];
    }

    // 兼容没有成功建立计划的旧调用。
    const list = $gameNumberArray.value(poolSlot);
    if (!Array.isArray(list) || list.length === 0) return null;
    const available = list.filter(entry => entry && entry.hold > 0);
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)].id;
  }

  // -------- B) 配方规划模式 --------
  const pref = typeof preference === "string"
    ? preference.trim().toLowerCase()
    : "";
  const getPreferenceTags = QJ.MPMZ.tl.getImoutoCookingPreferenceTags;
  const preferenceTags = typeof getPreferenceTags === "function"
    ? getPreferenceTags(pref)
    : (pref ? [pref] : []);
  const favoriteTags = ["meat", "chicken", "fish", "egg"];
  const inventory = [];

  for (const item of $gameParty.items()) {
    if (!item || typeof item.note !== "string") continue;
    const match = item.note.match(/<Ingredients:\s*([^>]+)>/i);
    if (!match) continue;

    const tags = match[1]
      .split(/[,，]/)
      .map(value => value.trim().toLowerCase())
      .filter(Boolean);
    // 妹妹自己的明确禁忌：不主动使用辣椒。
    if (tags.includes("chilli")) continue;

    const hold = Math.max(0, Math.min($gameParty.numItems(item) | 0, 9999));
    if (hold > 0) inventory.push({ id: item.id, hold, tags });
  }
  const inventoryById = new Map(inventory.map(entry => [entry.id, entry]));

  // 每次重新规划都清空上一次（包括哥哥做饭）留下的实际食材。
  $gameNumberArray.setValue(ingredientSlot, []);
  $gameNumberArray.setValue(poolSlot, inventory.map(entry => ({
    id: entry.id,
    hold: entry.hold,
    mul: 1
  })));

  const rawProficiency = Number(
    $gameSelfVariables.value([1, 2, "homeMadeCooking"])
  );
  const proficiency = Number.isFinite(rawProficiency)
    ? Math.max(0, rawProficiency)
    : 0;
  const normalizedProficiency = proficiency / (proficiency + 20);
  // 妹妹无法自由选材本身已是代价，因此熟练度只保留很小的选材失误率。
  // 初学者也有 80% 概率执行有效配方，熟练后平滑接近 99.9%；
  // 配方成立后的临场失手仍由幸运值单独负责。
  const basePlanFollowChance = 0.75;
  const planFollowChance = basePlanFollowChance +
    0.3 * normalizedProficiency;
  // 玩家明确提出的料理类型在库存允许时视为硬约束，而不是第二次概率判定。
  const preferenceFollowChance = 1;

  const validPlans = [];
  const planKeys = new Set();
  const inspect = $gameMap.inspectCraftingFormula;

  const addPlansFor = itemIds => {
    if (typeof inspect !== "function") return;
    const result = inspect.call($gameMap, itemIds);
    if (!result || !result.valid || !Array.isArray(result.candidates)) return;

    for (const candidate of result.candidates) {
      const key = candidate.recipeId + ":" + itemIds.join(",");
      if (planKeys.has(key)) continue;
      planKeys.add(key);
      validPlans.push({
        recipeId: candidate.recipeId,
        recipeName: candidate.recipeName,
        recipeTags: candidate.recipeTags.map(tag => String(tag).toLowerCase()),
        recipeRules: (candidate.recipeRules || []).map(rule => ({
          tag: String(rule.tag).toLowerCase(),
          min: rule.min
        })),
        ingredientTags: itemIds.flatMap(itemId => {
          const entry = inventoryById.get(itemId);
          return entry ? entry.tags : [];
        }),
        recipeMatch: candidate.recipeMatch,
        matchQuality: candidate.matchQuality,
        itemIds: itemIds.slice()
      });
    }
  };

  // 枚举顺序无关的 1~3 件组合，并按实际持有数量允许重复食材。
  for (let i = 0; i < inventory.length; i++) {
    addPlansFor([inventory[i].id]);
    for (let j = i; j < inventory.length; j++) {
      if (i === j && inventory[i].hold < 2) continue;
      addPlansFor([inventory[i].id, inventory[j].id]);
      for (let k = j; k < inventory.length; k++) {
        if (i === j && j === k && inventory[i].hold < 3) continue;
        if (i === j && j !== k && inventory[i].hold < 2) continue;
        if (i !== j && j === k && inventory[j].hold < 2) continue;
        addPlansFor([inventory[i].id, inventory[j].id, inventory[k].id]);
      }
    }
  }

  const plansByRecipe = new Map();
  for (const candidate of validPlans) {
    if (!plansByRecipe.has(candidate.recipeId)) {
      plansByRecipe.set(candidate.recipeId, []);
    }
    plansByRecipe.get(candidate.recipeId).push(candidate);
  }
  const recipeGroups = Array.from(plansByRecipe.values());
  const planMatchesPreference = plan => preferenceTags.length > 0 &&
    plan.recipeRules.some(rule =>
      rule.min > 0 && preferenceTags.includes(rule.tag)
    ) &&
    plan.ingredientTags.some(tag => preferenceTags.includes(tag));
  const filterRecipeGroups = predicate => recipeGroups
    .map(group => group.filter(predicate))
    .filter(group => group.length > 0);
  const matchingGroups = filterRecipeGroups(planMatchesPreference);
  const preferenceAvailable = matchingGroups.length > 0;
  const preferenceRoll = null;
  const preferenceHonored = pref
    ? preferenceAvailable
    : null;

  let selectableGroups = recipeGroups;
  if (preferenceHonored) {
    // 指定类型是硬约束，但不再要求该类型占比必须最高。
    // 肉+米饭等合理组合因此可以和纯肉料理一起参与随机。
    selectableGroups = matchingGroups;
  }

  const planPreferenceDensity = plan => {
    if (!pref || plan.itemIds.length === 0) return 0;
    const preferredAmount = plan.itemIds.reduce((amount, itemId) => {
      const entry = inventoryById.get(itemId);
      const matches = entry && entry.tags.some(tag =>
        preferenceTags.includes(tag)
      );
      return amount + (matches ? 1 : 0);
    }, 0);
    return preferredAmount / plan.itemIds.length;
  };

  const planQualityWeight = plan => {
    const qualityWeight = 0.75 + 0.25 * plan.matchQuality;
    const perfectWeight = plan.recipeMatch === "perfect" ? 1.15 : 1;
    const preferenceWeight = pref
      ? 1 + 0.5 * planPreferenceDensity(plan)
      : 1;
    return qualityWeight * perfectWeight * preferenceWeight;
  };

  const weightedChoice = (values, getWeight) => {
    if (!values.length) return null;
    const weighted = values.map(value => ({
      value,
      weight: Math.max(0, Number(getWeight(value)) || 0)
    }));
    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    if (total <= 0) return values[Math.floor(Math.random() * values.length)];
    let roll = Math.random() * total;
    for (const entry of weighted) {
      if (roll < entry.weight) return entry.value;
      roll -= entry.weight;
    }
    return weighted[weighted.length - 1].value;
  };

  const chooseWeightedGroup = groups => {
    if (groups.length === 0) return null;
    return weightedChoice(groups, group => {
      const likesRecipe = group[0].recipeRules.some(rule =>
        rule.min > 0 && favoriteTags.includes(rule.tag)
      );
      const availableCounts = new Set(group.map(plan => plan.itemIds.length));
      const availableDistinctCounts = new Set(group.map(plan =>
        new Set(plan.itemIds).size
      ));
      const varietyBreadth = 1 + 0.15 * (availableCounts.size - 1) +
        0.10 * (availableDistinctCounts.size - 1);
      return varietyBreadth * (likesRecipe ? 3 : 1);
    });
  };

  // 先在所有可行配方间决定投入数量，避免“只支持三件”的配方组数量较多时
  // 间接把三件方案推成绝对主流。
  const availableItemCounts = Array.from(new Set(
    selectableGroups.flatMap(group => group.map(plan => plan.itemIds.length))
  ));
  const itemCountWeights = { 1: 2.5, 2: 4, 3: 3.5 };
  const selectedItemCount = weightedChoice(
    availableItemCounts,
    count => itemCountWeights[count] || 1
  );
  const groupsForSelectedCount = selectableGroups
    .map(group => group.filter(plan =>
      plan.itemIds.length === selectedItemCount
    ))
    .filter(group => group.length > 0);
  const selectedGroup = chooseWeightedGroup(groupsForSelectedCount);
  let plannedRecipe = null;
  if (selectedGroup) {
    const plansByDistinctCount = new Map();
    for (const plan of selectedGroup) {
      const distinctCount = new Set(plan.itemIds).size;
      if (!plansByDistinctCount.has(distinctCount)) {
        plansByDistinctCount.set(distinctCount, []);
      }
      plansByDistinctCount.get(distinctCount).push(plan);
    }
    const distinctWeights = { 1: 1, 2: 2, 3: 2.4 };
    const selectedDistinctCount = weightedChoice(
      Array.from(plansByDistinctCount.keys()),
      count => distinctWeights[count] || 1
    );
    const finalPlans = plansByDistinctCount.get(selectedDistinctCount) ||
      selectedGroup;
    plannedRecipe = weightedChoice(finalPlans, planQualityWeight);
  }

  const planFollowRoll = Math.random();
  const followedPlan = !!plannedRecipe && planFollowRoll < planFollowChance;

  const randomFallbackIngredients = () => {
    const remaining = inventory.map(entry => ({
      id: entry.id,
      hold: entry.hold,
      tags: entry.tags
    }));
    const totalHeld = remaining.reduce((sum, entry) => sum + entry.hold, 0);
    const count = totalHeld > 0
      ? 1 + Math.floor(Math.random() * Math.min(3, totalHeld))
      : 0;
    const picked = [];

    for (let amount = 0; amount < count; amount++) {
      let totalWeight = 0;
      const forceRequestedIngredient = amount === 0 &&
        !!pref && preferenceAvailable;
      for (const entry of remaining) {
        const requested = entry.tags.some(tag => preferenceTags.includes(tag));
        const favorite = entry.tags.some(tag => favoriteTags.includes(tag));
        entry.weight = forceRequestedIngredient && !requested
          ? 0
          : entry.hold * (requested ? 12 : (favorite ? 2 : 1));
        totalWeight += entry.weight;
      }
      if (totalWeight <= 0) break;

      let roll = Math.random() * totalWeight;
      for (const entry of remaining) {
        if (roll < entry.weight) {
          picked.push(entry.id);
          entry.hold--;
          break;
        }
        roll -= entry.weight;
      }
    }
    return picked;
  };

  const selectedItemIds = followedPlan
    ? plannedRecipe.itemIds.slice()
    : randomFallbackIngredients();
  const selectionReason = followedPlan
    ? "plannedRecipe"
    : (plannedRecipe ? "proficiencyMistake" : "noAvailableRecipe");
  const plan = {
    requestedPreference: pref || null,
    preferenceTags,
    preferenceAvailable,
    preferenceHonored,
    preferenceFollowChance,
    preferenceRoll,
    cookingProficiency: proficiency,
    normalizedProficiency,
    planFollowChance,
    planFollowRoll,
    followedPlan,
    proficiencyEffective: followedPlan &&
      planFollowRoll >= basePlanFollowChance,
    selectionReason,
    plannedRecipeId: plannedRecipe ? plannedRecipe.recipeId : 0,
    plannedRecipeName: plannedRecipe ? plannedRecipe.recipeName : null,
    selectedItemIds
  };

  $gameTemp._imoutoCookingPlan = plan;
  $gameNumberArray.setValue(ingredientSlot, selectedItemIds.slice());
  return plan;
};



// 妹妹自己做饭动画
QJ.MPMZ.tl._imoutoUtilImoutoCookingHerselfPhaseOne = function () {
	
	this._coolDown = this._coolDown || 0;
    this._times    = this._times || 0;	
	if (this._coolDown > 0) {
	   this._coolDown -= 1;
	   return;
	}

	this._frames = this._frames || 1;
	
	let IMG = "kitchen_sis_cookingHerself" + this._frames;
	$gameScreen.showPictureFromPath(8, "kitchen_event", IMG, 0, 360, 180, 100, 100, 255, 0);	
	
	if (this._frames >= 3) {
		this._upend = true; 
		if (this._nextPhase) {
			AudioManager.playVoice({ name: "kitchen_ImoutoCooking_start", volume: 90, pitch: 100, pan: 0 }, false, 2);
			$gameScreen.picture(11)?.drill_PLAZ_setLayer( "最顶层" );
		    QJ.MPMZ.Shoot({
		       existData: [ ],
		       moveF:[
		         [8,0,QJ.MPMZ.tl._imoutoUtilImoutoCookingHerselfPhaseTwo]
		       ]
		    });
            this.setDead();			
		}			
	}

	if (this._upend && this._frames <= 1) {
		this._upend = false;
	}
	
	if (this._upend) {
		this._frames -= 1;
	} else {
		this._frames += 1;
	}
    this._coolDown = 8;	
};

// 开始投放食材
QJ.MPMZ.tl._imoutoUtilImoutoCookingHerselfPhaseTwo = function () {
	
	this._coolDown = this._coolDown || 0;
    this._times    = this._times || 0;	
	if (this._coolDown > 0) {
	   this._coolDown -= 1;
	   return;
	}

	this._frames = this._frames || 3;
	
	let IMG = "kitchen_sis_cookingHerself" + this._frames;
	if (this._smile && this._times === 0) {
		let seName = "kitchen_ImoutoCooking_goodStuff" + (1 + Math.randomInt(2));
		AudioManager.playVoice({ name: seName, volume: 90, pitch: 100, pan: 0 }, false, 2);
		IMG = "kitchen_sis_cookingHerself_alt" + this._frames;
		this._times += 1;
	}
	if (this._times > 0 ) {
		if (this._times < (6 + Math.randomInt(12))) {
		   IMG = "kitchen_sis_cookingHerself_alt" + this._frames;
		   this._times += 1;
		} else {
		   this._times = 0;
		   this._smile = false;
		}
	}	
	
	$gameScreen.showPictureFromPath(8, "kitchen_event", IMG, 0, 360, 180, 100, 100, 255, 0);	
	
	if (this._frames >= 5) {		
		// 食材放够了就进入下阶段
		if ($gameMap.getGroupBulletListQJ('ingredient').length > 8) {			
			IMG = "kitchen_sis_cookingHerself6";
			$gameScreen.showPictureFromPath(8, "kitchen_event", IMG, 0, 360, 180, 100, 100, 255, 0);
		    QJ.MPMZ.Shoot({
		       img:"null1",
			   groupName:['ImoutoCookingHerself'],
		       existData: [ ],
		       moveF:[
		         [16,0,QJ.MPMZ.tl._imoutoUtilImoutoCookingHerselfPhaseThree]
		       ]
		    });
		    for (let i = 7; i <= 27; i++) {
    		    let fileName = "kitchen_sis_cookingHerself" + i;
    		    fileName = "kitchen_event/" + fileName;
    		    ImageManager.loadPicture(fileName);
		    }
		    for (let i = 16; i <= 21; i++) {
    		    let fileName = "kitchen_sis_cookingHerself_alt" + i;
    		    fileName = "kitchen_event/" + fileName;
    		    ImageManager.loadPicture(fileName);
		    }			
            this.setDead();				
		}
		this._frames -= 1;
		this._upend = true;	
        // 投放食材
		let isMobile = false;
		if (Utils.isMobileDevice()) isMobile = true;
        QJ.MPMZ.tl._imoutoUtilImoutoAddIngredient.call(this,850,750,isMobile);
        QJ.MPMZ.tl._imoutoUtilImoutoAddIngredient.call(this,1100,750,isMobile);
        let randomSe = "ニュッ" + (Math.randomInt(2) + 1); 
		let randomPitch = 85 + Math.randomInt(40);
        AudioManager.playSe({ name: randomSe, volume: 85, pitch: randomPitch, pan: 0 });		
	}

	if (this._upend && this._frames <= 3) {
		this._frames = 1;
		this._coolDown = 8;
		this._upend = false;
		return false;
	}
	
	if (this._upend) {
		this._frames -= 1;
	} else {
		this._frames += 1;
	}
    this._coolDown = 8;	
};

// 妹妹投放食材
QJ.MPMZ.tl._imoutoUtilImoutoAddIngredient = function(tarX, tarY, isMobile) {

  let itemId = QJ.MPMZ.tl._imoutoUtilImoutoCookingPickIngredients({ pick: true });
  let item = $dataItems[itemId];
  if (!item) item = $dataItems[3];
  // 遇到喜欢的食材
        if (item.note && item.note.includes("<Ingredients:")) {
            let ingMatch = item.note.match(/<Ingredients:\s*(.+?)>/i);
            if (ingMatch) {
                let ingText = ingMatch[1];  
                let lowerIng = ingText.toLowerCase();
                if (lowerIng.includes("meat") || lowerIng.includes("chicken") || lowerIng.includes("fish") || lowerIng.includes("egg")) {
                      this._smile = true;
                }
			}
		}
  
  let icon = item.iconIndex;
  let posX = 900 + Math.randomInt(180);
  let posY = 850 + Math.randomInt(10);  
  let peakRate = 1 + (1 * Math.random());
  let { time, xExp, yExp } = QJ.MPMZ.tl.BulletTrajectoryFormula(tarX, tarY, posX, posY, peakRate,2);

  let scale = 1.5;
  if (isMobile) scale = 3;

   QJ.MPMZ.Shoot({
        img:['I',icon], 
		position:[['S',tarX],['S',tarY]],
        initialRotation:['S',0],
		opacity:'0|0~8/1~180/1',
		scale:scale,
		z:"A",
        imgRotation:['S',0],
		moveType:["F", xExp, yExp],
        existData:[ 
		    { t: ['Time', time], d:[1,10,1.2], a: ['F',QJ.MPMZ.tl._imoutoUtilIngredientStayInBowl,[icon, isMobile]] }  
		],
		
    });
};

// 食材留在碗里
QJ.MPMZ.tl._imoutoUtilIngredientStayInBowl = function(icon, isMobile) {

  let posX = this.inheritX();
  let posY = this.inheritY();  
  let scale = 1.5;
  if (isMobile) scale = 3;
  
   QJ.MPMZ.Shoot({
        img:['I',icon], 
		groupName:['ingredient'],
		position:[['S',posX],['S',posY]],
        initialRotation:['S',0],
		opacity:1,
		scale:scale,
		z:"A",
        imgRotation:['S',0],
		moveType:["S", 0],
        existData:[ 
		    //{ t: ['Time', time], d:[1,10,1.2], a: ['F',QJ.MPMZ.tl._imoutoUtilIngredientStayInBowl,[icon]] }  
		],		
    });
};

// 妹妹自己做饭-搅拌食材
QJ.MPMZ.tl._imoutoUtilImoutoCookingHerselfPhaseThree = function () {
	this._result    = this._result || "";
	this._coolDown = this._coolDown || 0;
    this._times    = this._times || 0;	
	if (this._coolDown > 0) {
	   this._coolDown -= 1;
	   return;
	}
	this._frames = this._frames || 7;
	
	let IMG = "kitchen_sis_cookingHerself" + this._frames;
	$gameScreen.showPictureFromPath(8, "kitchen_event", IMG, 0, 360, 180, 100, 100, 255, 0);

	if (this._frames === 7)   AudioManager.playVoice({ name: "kitchen_ImoutoCooking_mashIngredient1", volume: 90, pitch: 100, pan: 0 }, false, 2);
	
	if (this._frames >= 16 && this._frames <= 21) {
        IMG = "kitchen_sis_cookingHerself_alt" + this._frames;
	    $gameScreen.showPictureFromPath(11, "kitchen_event", IMG, 0, 760, 700, 100, 100, 255, 0);
		$gameScreen.picture(11).drill_PLAZ_setLayer( "最顶层" );
	}	
    // 让食材消失
    if (this._frames === 16) {	
	      let seName = "kitchen_ImoutoCooking_mashIngredient" + (2 + Math.randomInt(2));
          AudioManager.playVoice({ name: seName, volume: 90, pitch: 100, pan: 0 }, false, 3);	
		  let bulletList = $gameMap.getGroupBulletListQJ('ingredient');
		      bulletList.forEach(bid => {
    		    let bullet = $gameMap._mapBulletsQJ[bid];
        	    if (bullet) {
                    bullet.setDead({ t: ['Time', 0], d: [1, 30, 1.3] });
                 }
              });
			  
	   const arr = $gameNumberArray.value(16);
	   const selectedIngredients = Array.isArray(arr)
	     ? arr.filter(itemId => $dataItems[itemId]).slice(0, 3)
	     : [];
	   const cookingPlan = $gameTemp._imoutoCookingPlan || {};
	   // 结算时直接使用规划出的 1~3 件材料，不再从动画投料中二次随机。
	   this._result = "failed";
	   // 妹妹做飯時使用妹妹（角色 2）的幸運值，而不是隊長的幸運值。
	   let preferredRecipeId = cookingPlan.followedPlan
	     ? cookingPlan.plannedRecipeId
	     : 0;
	   let dish = $gameMap.checkCraftingFormula(
	     selectedIngredients,
	     $gameActors.actor(2),
	     preferredRecipeId
	   );
	   // 测试模式下可通过控制台令妹妹的下一次料理必定失败。
	   // 使用后立即清除，且正式发布环境不会响应这个标记。
	   const forceTestFailure = Utils.isOptionValid("test") &&
	     $gameTemp._forceNextImoutoCookingFailure === true;
	   if (forceTestFailure) {
	     dish.type = "failing";
	     dish.cookingStyle = "forcedTestFailure";
	     dish.cookingFailureChance = 1;
	     $gameTemp._forceNextImoutoCookingFailure = false;
	   }
	   // 保留妹妹选材、熟练度与最终幸运判定的完整原因链，方便事件和控制台检查。
	   const finalInspection = $gameMap.inspectCraftingFormula(selectedIngredients);
	   const finalCandidate = finalInspection.candidates.find(candidate =>
	     candidate.recipeId === dish.result
	   );
	   const requestedTags = cookingPlan.preferenceTags || [];
	   const selectedTags = selectedIngredients.flatMap(itemId => {
	     const match = $dataItems[itemId]?.note?.match(/<Ingredients:\s*([^>]+)>/i);
	     return match
	       ? match[1].split(/[,，]/).map(tag => tag.trim().toLowerCase())
	       : [];
	   });
	   const finalPreferenceHonored = cookingPlan.requestedPreference
	     ? !!finalCandidate && finalInspection.valid &&
	       finalCandidate.recipeRules.some(rule =>
	         rule.min > 0 && requestedTags.includes(rule.tag.toLowerCase())
	       ) &&
	       selectedTags.some(tag => requestedTags.includes(tag))
	     : null;

	   dish.requestedPreference = cookingPlan.requestedPreference || null;
	   dish.preferenceAvailable = !!cookingPlan.preferenceAvailable;
	   dish.preferencePlanHonored = cookingPlan.preferenceHonored ?? null;
	   dish.preferenceHonored = finalPreferenceHonored;
	   dish.cookingProficiency = cookingPlan.cookingProficiency ?? 0;
	   dish.planFollowChance = cookingPlan.planFollowChance ?? 0;
	   dish.planFollowRoll = cookingPlan.planFollowRoll ?? null;
	   dish.proficiencyEffective = !!cookingPlan.proficiencyEffective;
	   dish.followedCookingPlan = !!cookingPlan.followedPlan;
	   dish.ingredientSelectionStyle = cookingPlan.selectionReason || "noPlan";
	   dish.plannedRecipeId = cookingPlan.plannedRecipeId || 0;
	   dish.plannedRecipeName = cookingPlan.plannedRecipeName || null;
	   dish.selectedItemIds = selectedIngredients.slice();
	   dish.selectedIngredientCount = selectedIngredients.length;
	   dish.selectedIngredientTypeCount = new Set(selectedIngredients).size;
	   $gameMap.chahuiMapTemp = $gameMap.chahuiMapTemp || {};
	   $gameMap.chahuiMapTemp.lastCookingResult = dish;
       $gameVariables.setValue(78, dish.result);
	   // 失去食材
	   selectedIngredients.forEach(function(i) {
           $gameParty.loseItem($dataItems[i], 1);
	   });	
	   if (dish.type && dish.type === "successful") {
		  this._result = "successful"; 
	   }
       AudioManager.playSe({ name: "xへのImpactの影響", volume: 65, pitch: 150, pan: 0 });			  
       AudioManager.playBgs({ name: "ご飯を一気にかき込む", volume: 85, pitch: 65, pan: 0 });   
	}
	
	if (this._frames >= 21 && !this._completed) {
		this._coolDown = 8;
		this._frames = 17;
		this._times += 1;
		if (this._times === 1)  AudioManager.playVoice({ name: "kitchen_ImoutoCooking_stirVigorously", volume: 90, pitch: 100, pan: 0 }, true, 2);	
		
		let point = QJ.MPMZ.tl.isBgmInWindow(3, 5) || QJ.MPMZ.tl.isBgmInWindow(10, 17) || QJ.MPMZ.tl.isBgmInWindow(21, 23) || QJ.MPMZ.tl.isBgmInWindow(29, 35);
		// 超过 10 次搅拌循环仍未命中音乐窗口时，继续结算，避免无限等待。
		if ((this._times > 2 && point) || this._times > 10) {
			this._completed = true;
			if (this._result && this._result === "successful") {
			  AudioManager.fadeOutBgm(3);
			}
		}
		return;
	}

	if (this._frames >= 27 && this._completed) {
		
		let dish = QJ.MPMZ.Shoot({
			              groupName:['ImoutoCookingHerself'],
		                  existData: [ ],
		                  moveF:[ ]
		           });	   
		if (this._result === "successful") {
            dish.addMoveData("F",[4,0,QJ.MPMZ.tl._imoutoUtilImoutoCookingHerselfSuccessfulDish]);
		} else {
            dish.addMoveData("F",[4,0,QJ.MPMZ.tl._imoutoUtilImoutoCookingHerselfFailedDish]);
			ImageManager.loadPicture("SepiaFilter");
			ImageManager.loadPicture("TOBECONTINUED");			
		}			
		this.setDead();	
	}

	this._frames += 1;
    this._coolDown = 8;
    if (this._frames === 15 || this._frames === 17) {
		this._coolDown += 16;
	}
	// 预加载
    if (this._frames === 22) {
		AudioManager.fadeOutBgs(1);
		AudioManager.playVoice({ name: "kitchen_ImoutoCooking_beforeResult", volume: 90, pitch: 100, pan: 0 }, false, 2);
        // 成功料理
		if ( this._result === "successful" ) {
		    for (let i = 1; i <= 5; i++) {
    		    let fileName = "kitchen_sis_cookingHerself_successful" + i;
    		    fileName = "kitchen_event/" + fileName;
    		    ImageManager.loadPicture(fileName);
		    }			
		    for (let i = 2; i <= 5; i++) {
    		    let fileName = "kitchen_sis_cookingHerself_glowingDish" + i;
    		    fileName = "kitchen_event/" + fileName;
    		    ImageManager.loadPicture(fileName);
		    }
		}
        // 失败料理
		if ( this._result === "failed" ) {			
		    for (let i = 1; i <= 7; i++) {
    		    let fileName = "kitchen_sis_cookingHerself_failed" + i;
    		    fileName = "kitchen_event/" + fileName;
    		    ImageManager.loadPicture(fileName);
		    }
		    for (let i = 1; i <= 8; i++) {
    		    let fileName = "kitchen_sis_cookingHerself_explode" + i;
    		    fileName = "kitchen_event/" + fileName;
    		    ImageManager.loadPicture(fileName);
		    }
		    for (let i = 1; i <= 8; i++) {
    		    let fileName = "kitchen_droplight" + i;
    		    fileName = "kitchen_event/" + fileName;
    		    ImageManager.loadPicture(fileName);
		    }			
		    for (let i = 1; i <= 15; i++) {
    		    let fileName = "kitchen_sis_cookingHerself_failedDish" + i;
    		    fileName = "kitchen_event/" + fileName;
    		    ImageManager.loadPicture(fileName);
		    }		
	   }
	}
};

// 妹妹自己做饭-成功料理
QJ.MPMZ.tl._imoutoUtilImoutoCookingHerselfSuccessfulDish = function () {

  this._coolDown = this._coolDown || 0;
  this._times    = this._times || 0;

  if (this._coolDown > 0) {
    this._coolDown -= 1;
    return;
  }

  this._frames = this._frames || 1;
  if (this._frames === 1)  {
	  AudioManager.playSe({ name: "キラン☆キラーン 派手なインパクト3", volume: 85, pitch: 100, pan: 0 });
      AudioManager.playVoice({ name: "kitchen_ImoutoCooking_successfulDish", volume: 90, pitch: 100, pan: 0 }, false, 2);
	  AudioManager.playBgm({ name: "Imouto’sCookingGame2", volume: 70, pitch: 100, pan: 0 });
  }
  // 妹妹成功动作帧
  let IMG = "kitchen_sis_cookingHerself_successful" + this._frames;

  $gameScreen.showPictureFromPath(
    8, "kitchen_event", IMG, 0, 0, 0, 100, 100, 255, 0
  );

  // 前景遮挡替换
  if (!this._replace) {
	   this._replace = true;
    IMG = "kitchen_sis_cookingHerself_successful_alt";
    $gameScreen.showPictureFromPath(
      14, "kitchen_event", IMG, 0, 700, 800, 100, 100, 255, 0
    );
	 $gameScreen.erasePicture(11);
  }

    // 料理光效图层
    let index = this._frames;
	if (index === 1) index = 2
    IMG = "kitchen_sis_cookingHerself_glowingDish" + index;
    $gameScreen.showPictureFromPath(
      13, "kitchen_event", IMG, 0, 0, 0, 100, 100, 255, 0
    );
    // 料理发光
    if (this._frames > 1 && !this._epicGlow) {
		this._epicGlow = true;
		$gameMap.createFilter("EpicGlow", "glow", 5013);
		$gameMap.setFilter("EpicGlow" ,[0,0,255,255,255]);
		$gameMap.moveFilter("EpicGlow", [1,1,255,226,90], 8);
	}

  if (this._frames >= 5) {
    this._coolDown = 8;
    this._frames = 2;
    return;
  }
  
  if (this._frames === 1) {
	  $gameMap.steupCEQJ(66, 1, {skipAnim:true, waitTime:60, dishType:"successful"});
  }
  
  this._frames += 1;
  this._coolDown = 8;
};

// 妹妹自己做饭-失败料理
QJ.MPMZ.tl._imoutoUtilImoutoCookingHerselfFailedDish = function () {

  this._coolDown = this._coolDown || 0;
  this._times    = this._times || 0;

  if (this._coolDown > 0) {
    this._coolDown -= 1;
    return;
  }

  this._frames = this._frames || 1;
  
  if (this._frames === 1) {
	  $gameMap.chahuiMapTemp.snapImoutoFallingMoment = true;
	  const snapTime = Utils.isMobileDevice() ? 1500 : 800; 
	  setTimeout(() => $gameMap.chahuiMapTemp.snapImoutoFallingMoment = false, snapTime);
  }

  // 妹妹失败动作帧
  let IMG = "kitchen_sis_cookingHerself_failed" + this._frames;
  if (this._frames > 3 && this._frames < 6) IMG = "kitchen_sis_cookingHerself_failed3";
  if (this._frames > 7)                     IMG = "kitchen_sis_cookingHerself_failed7";

  $gameScreen.showPictureFromPath(
    8, "kitchen_event", IMG, 0, 360, 130, 100, 100, 255, 0
  );

  if (this._frames === 2)  {
	  AudioManager.playSe({ name: "Explosion2", volume: 85, pitch: 100, pan: 0 });
	  AudioManager.playVoice({ name: "kitchen_ImoutoCooking_failedDish", volume: 90, pitch: 100, pan: 0 }, false, 2);
      $gameScreen.showPicture(11, "kitchen_event/kitchen_sis_cookingHerself_alt21", 0, 760, 700, 100, 100, 255, 0);	  
	  // 屏幕摇晃效果
	  $gameScreen.setShakeRandom();
	  $gameScreen.startShake(6, 9, 45);
	  $gameScreen.startFlash([255,255,255,180], 30);
      // BGM降调	  
	  QJ.MPMZ.Shoot({
		count:100,
		existData: [ ],
		moveF:[
			[0,0,QJ.MPMZ.tl._imoutoSceneBgmAutoPitchLowering]
		]
	  });	  
  }

  // 爆炸效果
  if (this._frames <= 9) {
    if (!this._disableEffect) {	
      if (this._frames <= 8) {
        IMG = "kitchen_sis_cookingHerself_explode" + this._frames;
        $gameScreen.showPictureFromPath(
          14, "kitchen_event", IMG, 0, 0, 0, 100, 100, 255, 0
        );
      } else {
        const pic = $gameScreen.picture(14);
        if (pic) {
          $gameScreen.movePicture(
            14, pic.origin(), pic.x(), pic.y(),
            pic.scaleX(), pic.scaleY(), 0, 0, 30
          );
        }
      }
    } else {
      $gameScreen.erasePicture(14);
    }
  }

  // 因爆炸摇晃的吊灯
  if (!this._disableEffect && this._frames >= 2 && this._frames <= 10) {
    let index = this._frames - 1;
    if (index >= 9) index = 1;
    IMG = "kitchen_droplight" + index;
    $gameScreen.showPictureFromPath(
      12, "kitchen_event", IMG, 0, 0, 0, 100, 100, 255, 0
    );
  } else {
    if (this._disableEffect && !$gameScreen.picture(12).name().includes("droplight1")) {
      $gameScreen.showPicture(
        12, "kitchen_event/kitchen_droplight1", 0, 0, 0, 100, 100, 255, 0
      );
    }
  }

  // 烧焦的料理效果
  if (this._frames >= 4) {
    const index = this._frames - 3;
    IMG = "kitchen_sis_cookingHerself_failedDish" + index;
    $gameScreen.showPictureFromPath(
      13, "kitchen_event", IMG, 0, 610, 300, 100, 100, 255, 0
    );
  }

  if (this._frames >= 18) {
    this._disableEffect = true;
    this._coolDown = 8;
    this._frames = 8;
    return;
  }
  
  if (this._frames === 7) $gameMap.steupCEQJ(66,1,{skipAnim:true,dishType:"failed"});
  
  this._frames += 1;
  this._coolDown = 8;
};


// 妹妹眨眼/挂机打瞌睡监听
QJ.MPMZ.tl._imoutoUtilImoutoBlinking = function (initialize) {

	function getDrowsyCount() {
		let Imouto = $gameActors.actor(2);
		let count  = Imouto.isStateAffected(36) ? 18 : 50;	
		if (Imouto.ImoutoAutonomousAI?.isGettingSleepy)  count -= 15;
		if (this._feelingDrowsy === 1) count += 5;
		if (this._feelingDrowsy === 2) count += 10;
		return count;
	}

    if (initialize && initialize == "check") {
		if ( !$gameScreen.picture(5) ) return;
		if ( $gameScreen.picture(5)._opacity < 250 ) return;		
		if ($gameMessage.isBusy()) {
			if ($gameMap.chahuiMapTemp?.ImoutoAsleep) return;
		    // 退出待机状态时需重置变量	
			this._drowsyCount = 0;
            this._feelingDrowsy = 0;
            if (this._frames === 5)	this._frames = 3;				
			return;
		}
		// 让妹妹处于待机状态将累加计数
		this._drowsyCount += 1;
		// 计数累加到一定值后开始有概率犯困
        let count = getDrowsyCount();
		if (this._drowsyCount > count && Math.random() > 0.8) {
			if (!this._feelingDrowsy) {
				if (this._coolDown > 30) this._coolDown = 30;
				this._feelingDrowsy = 1;
			}
		}
		return;
	}

    if (initialize && initialize == "pinchCheek") {
		this._coolDown = this._coolDown || 0;
		if (this._coolDown > 0) {
			this._coolDown -= 1;
			return;
		}		
		const pic = $gameScreen.picture(30);
		const isVideo   = !!(pic && pic.isVideo());        
		const isPaused  = !!(pic && pic.isVideoPause());   
		const isEnded   = !!(pic && pic.isVideoEnd());     
		const isPlaying = isVideo && !isPaused && !isEnded && !$gameMessage.isBusy();
		
        if (!isPlaying && $gameScreen.isPointerInnerPicture(50)) {
			CustomCursor.setImg('img/pictures/pointer_touch.png');
			if ( TouchInput.drill_isLeftTriggerd() || TouchInput.drill_isLeftPressed() ) {	
			    $gameMap.event(15).steupCEQJ(6, {pinchCheek:true});
				CustomCursor.reset();
				this._coolDown = 210;
			}
        } else {
           CustomCursor.reset();
		   this._coolDown = 15;
		}			
		return;
	}
	
	this._coolDown = this._coolDown || 0;	
	if (this._coolDown > 0) {
	   this._coolDown -= 1;
	   return;
	}

    if ($gameVariables._data[20] < 40) {
		// 低心情值变更表情，但需要考虑当前是不是立绘状态
		if (!$gameScreen.picture(16) || $gameScreen.picture(16)._opacity < 20) {
		   $gameScreen.showPicture(5, "sis_room/sis_room_angryImouto", 0, 260, 310, 100, 100, 255, 0);
		   this.setDead({t:['Time',0]});
		}
	}

	this._frames       = this._frames       || 1;
	this._speed        = this._speed        || 2;
	this._drowsyCount  = this._drowsyCount  || 0;
    
	let pic = $gameScreen.picture(5);
	if ( !pic || !pic.name().includes("dozingOff") ) {
		this.setDead({t:['Time',0]});
		return;		
	}

    if ( pic._drill_PSh_commandChangeTank.length > 0 ) {
		this._coolDown += 30;
		return;
	}

	let IMG = "sis_room/sis_room_dozingOff" + this._frames;
	$gameScreen.changePictureName(5, IMG);
	// 犯困第一阶段
	if (!this._upend && this._frames === 3 && this._feelingDrowsy === 1) {
	    this._frames = 5;
		this._coolDown += 120;
		if (this._drowsyCount >= getDrowsyCount()) {
			this._feelingDrowsy = 2;
			// 预加载
			 for (let i = 6; i <= 17; i++) {
				 ImageManager.loadPicture( `sis_room/sis_room_dozingOff${i}` );
			 }	
		}
		return;
	}
	// 犯困第二阶段
	if (this._frames >= 5 && this._feelingDrowsy === 2) {
        this._frames += 1;
		this._frames  = Math.min(9, this._frames);
		this._coolDown += 10;
		if (this._drowsyCount >= getDrowsyCount()) {
			setTimeout(() => $gameSelfSwitches.setValue([$gameMap.mapId(), 15, 'T'], true), 2000);	
			this._feelingDrowsy = 3;
		}
		$gameMap.chahuiMapTemp.ImoutoAsleep = true;
		// 锁住常规互动
		$gameSelfSwitches.setValue([$gameMap.mapId(), 15, 'S'], true);
		return;
	}	
	
	// 常态眨眼/犯困第三阶段	
	let max = this._feelingDrowsy === 3 ? 17 : 4;
	if (this._frames >= max) {
		let waitTime = this._feelingDrowsy === 3 ? 24 : 6;
		this._coolDown += waitTime;
		this._frames -= 1;
		this._upend = true;
		return;
	}

    let min = this._feelingDrowsy === 3 ? 9 : 1;
	if (this._upend && this._frames <= min) {
		let waitTime = this._feelingDrowsy === 3 ? 40 : Math.randomInt(120) + 180;
		this._coolDown += waitTime;
		this._frames += 1;
		this._upend = false;
		return;
	}
	
	if (this._upend) {
		this._frames -= 1;
	} else {
		this._frames += 1;
	}
	
	this._frames = Math.min(this._frames, max);
    this._coolDown += 2;	
	let waitTime = this._feelingDrowsy > 1 ? 24 : 2;
	this._coolDown += waitTime;
	
};

// 妹妹浇花
QJ.MPMZ.tl._imoutoUtilImoutoWateringTheFlowers = function () {
	
	this._coolDown = this._coolDown || 0;	
	if (this._coolDown > 0) {
	   this._coolDown -= 1;
	   return;
	}

	this._frames = this._frames || 1;

	if ( !$gameScreen.picture(5) || !$gameScreen.picture(5).name().includes("wateringTheFlowers") ) {
		this.setDead({t:['Time',0]});
		return;		
	}
	if ( $gameScreen.picture(5)._opacity < 250 ) {
		this._coolDown = 60;	
		return;		
	}
	
	let IMG = "sis_room/sis_room_wateringTheFlowers" + this._frames;
    $gameScreen.changePictureName(5, IMG);
	
	if (this._frames >= 4) {
		this._coolDown = 6;
		this._frames = 1;
		return;
	}
	
	this._frames += 1;
    this._coolDown = 6;	
	
};

// 妹妹一个人玩游戏手柄动画
QJ.MPMZ.tl._imoutoUtilImoutoSoloPlay = function (extra={}) {
	if (extra.refresh) {
		this._coolDown = this._coolDown || 0;	
		if (this._coolDown > 0) {
			this._coolDown -= 1;
			return;
		}

		this._frames = this._frames || 0;
		let IMG = "alt_sister_normal_hand" + this._frames;
		$gameScreen.showPictureFromPath(8, "game_itazura", IMG, 0, 320, 500, 100, 100, 255, 0);	
		if (this._frames >= 6) {
			this._coolDown = Math.randomInt(4) + 2;
			this._frames -= 1;
			this._upend = true;
			return;
		}

		if (this._upend && this._frames <= 0) {
			this._coolDown = Math.randomInt(4) + 2;
			this._frames += 1;
			this._upend = false;
			return;
		}
		
		if (this._upend) {
			this._frames -= 1;
		} else {
			this._frames += 1;
		}
		this._coolDown = Math.randomInt(4) + 2;	
		return;
    }
	// 播放器初始化
	QJ.MPMZ.Shoot({
		groupName: ['ImoutoSoloPlay'],
		existData: [ 
		],
		moveF:[
		   [30,0,QJ.MPMZ.tl._imoutoUtilImoutoSoloPlay, [{refresh:true}]]
		]
	});
	// 预加载
	for (let i = 0; i <= 6; i++) {
		ImageManager.loadPicture("game_itazura/alt_sister_normal_hand" + i);
	}		
};


// 夜袭噩梦-妹妹呆毛怪物
QJ.MPMZ.tl._nightVisitImoutoAhogeMonster = function() {
	
	this._coolDown = this._coolDown || 0;

	if (this._coolDown > 0) {
	   this._coolDown -= 1;
	   return;
	}
	if ($gameMessage.hasText()) {
	   this._coolDown = 15;
	   return;
	}

	this._frames = this._frames || 1;
	this._speed = this._speed || 6;
	
	var IMG1 = "nightVisit_Imouto_AhogeMonster" + this._frames;
	
	if (this._frames > 42 && !this._scaring) {
		IMG1 = "nightVisit_Imouto_AhogeMonster_loop" + this._frames;
	}
	
	$gameScreen.showPictureFromPath(10, "nightmare", IMG1, 0, 0, 0, 100, 100, 255, 0);
    
	if (this._frames === 1) this._coolDown += 60;
	if (this._frames === 12) this._coolDown += 60;

	// 播放站立声
	if (this._frames === 2) {
        let	se = { name: "人がモンスターに変化", volume: 70, pitch: 150, pan: 0 };
    	AudioManager.playSe(se);
	}
	// 停止站立声
	if (this._frames === 15) {
        AudioManager.stopSe();
	}
	// 停止站立声
	if (this._frames === 25) {
        let	se = { name: "血がたれる1", volume: 70, pitch: 80, pan: 0 };
    	AudioManager.playSe(se);
	}
	
	// 开始低声哼唱
	if (this._frames === 29 && !this._startHumming) {
        let	voice = { name: "nightmare_humming", volume: 90, pitch: 100, pan: 0 };
    	AudioManager.playVoice(voice, true, 1);
		this._startHumming = true;
	}
	
	// 播放脚步声
	if (this._frames >= 18 && this._frames <= 58 && this._frames % 4 === 0 && !this._stopFootSteps) {
    	let seName = "nightmare_footsteps" + Math.randomInt(4);
        let	se = { name: seName, volume: 70, pitch: 100, pan: 0 };
    	AudioManager.playSe(se);
	}


   	this._frames += 1;
	this._coolDown += 6;	
	
    // 未被惊扰时循环播放夜游动画
    if (this._frames === 58 && !this._scaring) {
	    this._coolDown += 6;
		this._frames = 30;
		if (this._startled) {
		this._scaring = true;
		} 
		return;
	}

	// 惊扰音效
	if (this._frames === 50 && this._scaring) {
		AudioManager.stopSe();
        let	voice = { name: "nightmare_noticing", volume: 90, pitch: 100, pan: 0 };
    	AudioManager.playVoice(voice, false, 1);
		this._stopFootSteps = true;
	}

	// 播放奔跑声
	if (this._frames === 60) {
        let	se = { name: "プールサイドを走る", volume: 70, pitch: 150, pan: 0 };
    	AudioManager.playSe(se);
	}
	
	// 惊吓
	if (this._frames >= 73) {	  
	    this._coolDown += 999;
		this._frames = 1;
		AudioManager.stopSe();
        $gameMap.event(7).steupCEQJ(4,{followUp:true});		
		this.setDead();
	}	
};


// 实验中的吃饭动画
QJ.MPMZ.tl._imoutoUtilTest = function() {
	
	this._coolDown = this._coolDown || 0;	
	if (this._coolDown > 0) {
	   this._coolDown -= 1;
	   return;
	}
	
	this._frames = this._frames || 1;
	
	var Imouto = "辣晕" + this._frames;
	$gameScreen.showPictureFromPath(11, "diningRoom", Imouto, 0, 0, 0, 100, 100, 255, 0);

    if (this._frames == 1) this._coolDown += 60;
	if ([2,3,4].includes(this._frames)) this._coolDown += 12;

    var index = this._frames;	
	if ([1,2,3,4].includes(this._frames)) index = "1-4";
	if ([9,10].includes(this._frames)) index = "9-10";
	if ([11,12].includes(this._frames)) index = "11-12";
	if ([13,14].includes(this._frames)) index = "13-14";
	if ([15,16].includes(this._frames)) index = "15-16";
	if ([17,18,19,20,21].includes(this._frames)) index = "17";
	
	var Shadow = "影子" + index;
	$gameScreen.showPictureFromPath(10, "diningRoom", Shadow, 0, 0, 0, 100, 100, 255, 2);

	if (this._frames == 21) {
		this._frames = 1;
		this._coolDown += 90;
	}
	
	this._frames += 1;
	this._coolDown += 3;
	
};

// 画面撕裂滤镜效果
QJ.MPMZ.tl.updateHorrorGlitchListener = function() {
    // 使用弹幕索引隔离滤镜，避免多个监听弹幕互相误删。
    const filterId = this._horrorGlitchFilterId ||
        (this._horrorGlitchFilterId = "horrorScreenTear_" + this.index);

    // 首帧创建滤镜，并把清理逻辑绑定到弹幕的消亡回调。
    if (!this._horrorGlitchInitialized) {
        this._horrorGlitchInitialized = true;
        $gameMap.createFilter(filterId, "glitch", "FullScreen");

        if (this.data && Array.isArray(this.data.deadJS)) {
            this.data.deadJS.push(
                "$gameMap.eraseFilter(this._horrorGlitchFilterId);"
            );
        }

        // 让首帧的撕裂更明显，之后转入持续抖动。
        $gameMap.setFilter(filterId, [
            8 + Math.randomInt(8),
            80 + Math.randomInt(100),
            Math.randomInt(360),
            3 + Math.randomInt(6),
            Math.randomInt(360)
        ]);
        return;
    }

    // moveJS 每帧调用本函数；每两帧重新生成一次撕裂形状。
    if (this.time % 2 !== 0) return;

    $gameMap.setFilter(filterId, [
        10 + Math.randomInt(7),   // 10～16片
        10 + Math.randomInt(26),  // 偏移10～35
        Math.randomInt(360),      // 撕裂方向
        Math.randomInt(3),        // RGB分离0～2
        Math.randomInt(360)       // RGB分离方向
    ]);
};
