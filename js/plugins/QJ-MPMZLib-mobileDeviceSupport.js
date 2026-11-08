//=============================================================================
 /*:
 * @plugindesc 移动设备适配用脚本
 * @author shiroin
 */
//=============================================================================
var QJ = QJ || {};
QJ.VB = QJ.VB || {};
var chahuiUtil = chahuiUtil || {};
window.isMobileDevice = Utils.isMobileDevice();
Game_System.prototype.isAnyWindowsOpen = function() {
    return $gameSystem.isMapSelectEquipOpen() || $gameSystem.isMapSelectSkillOpen() || $gameMessage.isItemChoice();
};


// 简易FPS显示器开关
Graphics.toggleFPS = function(extra={}) {
    let c = this._fpsCounter;
    if (!c) return;
    let value = false;
    if (c._boxDiv.style.display === "none" || extra.forceOn) {
        c._boxDiv.style.display = "block";
        c._showFps = true;
        c.pauseDetection = false;
        value = true;
        c._update();
    } else {
        c._boxDiv.style.display = "none";
        c.pauseDetection = true;
    }
    if (Utils.isMobileDevice()) {
        $gameSwitches.setValue(441, value);
    }
};

// 根据用户端跳转Discord
chahuiUtil.jumpToDiscordServer = function () {
	
	  let url = "https://guide.nlch.io/";
		if ( Utils.isMobileDevice() ) {
        cordova.InAppBrowser.open(url, '_system');
    } else {
        require('nw.gui').Shell.openExternal(url);
    }
				
};

// 兼容旧存档的脚本调用残留
Game_System.prototype.drill_GFPT_remove = function( slot_id, style_id ){
	return true;
};

Game_Interpreter.prototype.fadeSpeed = function() {
    return 16;
};

// 根据条件切换虚拟按键
QJ.MPMZ.tl._setDirButtonMode = function() { 
   
   if (QJ && QJ.VB && QJ.VB.readyVirtualButton) {
     const dirBtn = QJ.VB.findDirButton();
     if (dirBtn) {
       const targetMode = $gameMessage.isChoice() ? 0 : 2;
       if (dirBtn._dirMode !== targetMode) {
         ConfigManager.VBData.dirMode = targetMode;
         // 强制自身重建一次
         dirBtn.changeDirMode(targetMode);
       }
     }
   }
};


// 根据条件切换虚拟按键
QJ.VB.showFastForwardButton = function() { 
   const messageWindow = SceneManager._scene?._messageWindow?.isOpen?.() && !$gameMessage.isChoice();
   return messageWindow;
};


/*
 * 为游戏标题增加版本标记
 */
(() => {

  const FONT_FACE   = "MPLUS2ExtraBold";
  const FONT_SIZE   = 28;
  const PADDING_X   = 20;
  const PADDING_Y   = 20;
  const COLOR       = "#ffffff";
  const OUTLINE_COL = "rgba(0,0,0,0.9)";
  const OUTLINE_W   = 3;
  const CHANGELOG_ICON_HEIGHT = 16;
  const CHANGELOG_HIT_LEFT_PADDING = 8;
  const CHANGELOG_HIT_RIGHT_PADDING = 40;
  const CHANGELOG_HIT_VERTICAL_PADDING = 8;
  const CHANGELOG_ICON_GAP = 15;
  const CHANGELOG_SHOWN_STORAGE_KEY = "Usuimo_TitleChangelogShown";
  let changelogFirstDisplayThisRun;
  const CHANGELOG_PENDING_STORAGE_KEY = "Usuimo_TitleChangelogPending";
  chahuiUtil.markTitleChangelogChanged = function () {
    chahuiUtil._titleChangelogChanged = true;
    try { localStorage.setItem(CHANGELOG_PENDING_STORAGE_KEY, "1"); } catch (_) {}
  };
  chahuiUtil.consumeTitleUpdateNotice = function () {
    changelogFirstDisplayThisRun = false;
    chahuiUtil._titleChangelogChanged = false;
    try {
      localStorage.setItem(CHANGELOG_SHOWN_STORAGE_KEY, "1");
      localStorage.setItem(CHANGELOG_PENDING_STORAGE_KEY, "0");
    } catch (_) {}
  };

  // 版本号批注演出的集中配置。说明文字从当前 systemFeatureText 语言资源读取。
  const NOTE_LINE_COLOR = 0xffffff;
  const NOTE_LINE_WIDTH = 2;
  const NOTE_OUTLINE_COLOR = "rgba(0,0,0,0.96)";
  const NOTE_TITLE_OUTLINE_WIDTH = 5;
  const NOTE_BODY_OUTLINE_WIDTH  = 3;
  const NOTE_TEXT_PADDING = 6;
  const NOTE_TITLE_SIZE = 32;
  const NOTE_BODY_SIZE  = 24;
  const NOTE_CARD_WIDTH = 520;
  const NOTE_TITLE_LINE_HEIGHT = 46;
  const NOTE_BODY_LINE_HEIGHT  = 34;
  const NOTE_CARD_GAP   = 32;
  const NOTE_AREA_RIGHT_RATE = 0.74;
  const NOTE_CARD_TOP_OFFSET = 360;
  const NOTE_RISE_FRAMES = 32;
  const NOTE_FADE_FRAMES = 8;
  const VERSION_OVERLAY_Z = 2147483647;
  const FIRST_INSTALL_STORAGE_KEY = "Usuimo_TitleVersionAnnotationSeen";
  const FIRST_INSTALL_SHOW_TIME = 4000;

  const SHOW_FALLBACK = true;
  const FALLBACK_TEXT = "version Read Failed";

  function getVersionOverlay(scene) {
    if (!scene._versionOverlay) {
      const overlay = new Sprite();
      overlay.z = VERSION_OVERLAY_Z;
      overlay.zIndex = VERSION_OVERLAY_Z;
      scene._versionOverlay = overlay;
      scene.addChild(overlay);
    }
    return scene._versionOverlay;
  }

  function keepVersionOverlayOnTop(scene) {
    const overlay = scene && scene._versionOverlay;
    if (!overlay || overlay.parent !== scene) return;
    overlay.z = VERSION_OVERLAY_Z;
    overlay.zIndex = VERSION_OVERLAY_Z;
    const lastIndex = scene.children.length - 1;
    if (scene.getChildIndex(overlay) !== lastIndex) {
      scene.setChildIndex(overlay, lastIndex);
    }
  }

  function isVersionAnnotationHovered(scene) {
    const rect = scene && scene._versionHitRect;
    return !!rect && !scene._versionPointerOutside &&
      TouchInput.x >= rect.x && TouchInput.x <= rect.x + rect.width &&
      TouchInput.y >= rect.y && TouchInput.y <= rect.y + rect.height;
  }

  function isVersionAnnotationEnabled() {
    return ConfigManager.disableNetwork !== true;
  }

  function startFirstInstallVersionGuide(scene) {
    // 禁用网络即代表自动更新功能关闭，不消耗首次提示资格，也不启动演示。
    if (!isVersionAnnotationEnabled()) return;
    let isFirstInstall = false;
    try {
      isFirstInstall = localStorage.getItem(FIRST_INSTALL_STORAGE_KEY) !== "1";
      if (isFirstInstall) localStorage.setItem(FIRST_INSTALL_STORAGE_KEY, "1");
    } catch (error) {
      // 无法持久化时不反复显示首次引导。
      return;
    }
    if (!isFirstInstall) return;

    scene._versionAnnotationAutoReveal = true;
    scene._versionAnnotationAutoTimer = setTimeout(() => {
      scene._versionAnnotationAutoTimer = null;
      if (SceneManager._scene !== scene) return;
      // 定时器只移交显示控制权：此刻正在悬停则继续显示，移开后由原逻辑淡出。
      const hovering = isVersionAnnotationHovered(scene);
      scene._versionAnnotationAutoReveal = false;
      if (hovering) return;
    }, FIRST_INSTALL_SHOW_TIME);
  }

  function getVersionText() {
    let version = $dataSystem.gameVersion;
    let revision = $dataSystem.gameRevision;

    // 尚未初始化时立即从 gameTitle 同步解析
    if (!version) {
      const result = window.chahuiUtil?.getGameVersion?.();
      version = $dataSystem.gameVersion || result?.version;
      revision = $dataSystem.gameRevision ?? result?.revision;
    }

    if (!version) {
      return SHOW_FALLBACK ? FALLBACK_TEXT : "";
    }

    let text = String(version);

    // revision 可能为 0，不能用普通真值判断
    if (revision !== null && revision !== undefined) {
      text += ` rev.${revision}`;
    }
    // Demo 版显示平台标签，如 "Steam DEMO VERSION"
    if ($dataSystem.demoLabel) {
        text = `${$dataSystem.demoLabel} VERSION`;
    }
    return text;
  }

  function getVersionNotes(versionParts) {
    // 与 Shiroin_CloudSave 的 T() 相同：读取 systemFeatureText 分区，缺项回退英文。
    const section = (window.systemFeatureText && window.systemFeatureText.versionAnnotation) || {};
    const text = (key, fallback, replacement) => {
      const value = section[key];
      const result = value == null
        ? fallback
        : (Array.isArray(value) ? value.join("\n") : String(value));
      return String(result).replace(/\$\{\}/g, replacement || "—");
    };
    return [
      {
        title: text("majorTitle", "Game Version (version ${})", versionParts[0].value),
        body: text("majorBody", "Major additions to game events and gameplay are released under this version.")
      },
      {
        title: text("patchTitle", "Patch (patch ${})", versionParts[1].value),
        body: text("patchBody", "Regular patches provide bug fixes, optimizations, and experimental content.")
      },
      {
        title: text("revisionTitle", "Revision (revision ${})", versionParts[2].value),
        body: text("revisionBody", "Urgent fixes and minor adjustments are applied silently in the sister's room.")
      }
    ];
  }

  function wrapTextLines(bitmap, text, maxWidth) {
    const result = [];
    for (const paragraph of String(text).split("\n")) {
      if (!paragraph) {
        result.push("");
        continue;
      }
      const containsCjk = /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(paragraph);
      const words = containsCjk ? Array.from(paragraph) : paragraph.trim().split(/\s+/);
      const separator = containsCjk ? "" : " ";
      let line = "";
      for (const word of words) {
        const candidate = line ? line + separator + word : word;
        if (line && bitmap.measureTextWidth(candidate) > maxWidth) {
          result.push(line);
          line = word;
        } else {
          line = candidate;
        }

        // 极长的单词或连续字符串也按字符拆分，确保任何语言都不会越过列宽。
        if (bitmap.measureTextWidth(line) > maxWidth) {
          let fragment = "";
          for (const character of Array.from(line)) {
            if (fragment && bitmap.measureTextWidth(fragment + character) > maxWidth) {
              result.push(fragment);
              fragment = character;
            } else {
              fragment += character;
            }
          }
          line = fragment;
        }
      }
      result.push(line);
    }
    return result;
  }

  function createNoteCard(layout, fontFace, width, height, titleAreaHeight) {
    const sprite = new Sprite(new Bitmap(width, height));
    const bitmap = sprite.bitmap;
    bitmap.fontFace = fontFace;
    bitmap.fontBold = true;
    bitmap.textColor = COLOR;
    bitmap.outlineColor = NOTE_OUTLINE_COLOR;
    bitmap.outlineWidth = NOTE_TITLE_OUTLINE_WIDTH;
    bitmap.fontSize = NOTE_TITLE_SIZE;
    const textWidth = width - NOTE_TEXT_PADDING * 2;
    layout.titleLines.forEach((line, index) => {
      bitmap.drawText(line, NOTE_TEXT_PADDING, index * NOTE_TITLE_LINE_HEIGHT,
        textWidth, NOTE_TITLE_LINE_HEIGHT, "left");
    });
    bitmap.fontSize = NOTE_BODY_SIZE;
    bitmap.outlineWidth = NOTE_BODY_OUTLINE_WIDTH;
    const bodyY = titleAreaHeight + 8;
    layout.bodyLines.forEach((line, index) => {
      bitmap.drawText(line, NOTE_TEXT_PADDING, bodyY + index * NOTE_BODY_LINE_HEIGHT,
        textWidth, NOTE_BODY_LINE_HEIGHT, "left");
    });
    sprite.opacity = 0;
    return sprite;
  }

  function pointAtDistance(points, distance) {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      if (distance <= length) {
        const rate = length > 0 ? distance / length : 1;
        return { x: a.x + (b.x - a.x) * rate, y: a.y + (b.y - a.y) * rate, index: i };
      }
      distance -= length;
    }
    const last = points[points.length - 1];
    return { x: last.x, y: last.y, index: points.length };
  }

  function drawPartialPath(graphics, points, rate) {
    if (rate <= 0 || points.length < 2) return;
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    const end = pointAtDistance(points, total * Math.min(rate, 1));
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < end.index; i++) graphics.lineTo(points[i].x, points[i].y);
    graphics.lineTo(end.x, end.y);
  }

  function getVersionParts(text) {
    const revisionMatch = /rev\.\s*(\d+)/i.exec(text);
    const versionEnd = revisionMatch ? revisionMatch.index : text.length;
    const numberRanges = [];
    const numberPattern = /\d+/g;
    const versionPart = text.slice(0, versionEnd);
    let match;
    while ((match = numberPattern.exec(versionPart))) {
      numberRanges.push({ start: match.index, end: match.index + match[0].length });
    }

    let revisionRange = null;
    if (revisionMatch) {
      const numberOffset = revisionMatch[0].lastIndexOf(revisionMatch[1]);
      revisionRange = {
        start: revisionMatch.index + numberOffset,
        end: revisionMatch.index + numberOffset + revisionMatch[1].length
      };
    }

    const majorStart = numberRanges[0];
    const majorEnd = numberRanges[Math.min(1, numberRanges.length - 1)];
    const majorRange = majorStart && majorEnd
      ? { start: majorStart.start, end: majorEnd.end }
      : null;
    const patchRange = numberRanges[numberRanges.length - 1] || null;
    const ranges = [majorRange, patchRange, revisionRange];
    return ranges.map(range => ({
      range,
      value: range ? text.slice(range.start, range.end) : "—"
    }));
  }

  function getVersionAnchorXs(bitmap, text, originX, textWidth, versionParts) {
    const fallbackRates = [0.16, 0.52, 0.88];
    return versionParts.map((part, index) => {
      const range = part.range;
      if (!range) return originX + textWidth * fallbackRates[index];
      // 分别测量字符区间左右两端；即使数字位数变化，起点也始终落在对应数字正中。
      const left = bitmap.measureTextWidth(text.slice(0, range.start));
      const right = bitmap.measureTextWidth(text.slice(0, range.end));
      return originX + (left + right) * 0.5;
    });
  }

  function createVersionAnnotation(scene, hitRect, anchorXs, noteFontFace, versionParts) {
    const layer = new Sprite();
    const lines = new PIXI.Graphics();
    const cards = [];
    const notes = getVersionNotes(versionParts);
    // 右侧保留标题选项区域，三列说明只使用画面左侧约 74%。
    const noteAreaRight = Math.floor(Graphics.width * NOTE_AREA_RIGHT_RATE);
    const availableWidth = Math.max(240, noteAreaRight - PADDING_X);
    const cardWidth = Math.min(NOTE_CARD_WIDTH,
      Math.floor((availableWidth - NOTE_CARD_GAP * 2) / 3));
    const startX = PADDING_X;

    // 先按实际字体宽度换行，再以所有语言列中的最大行数统一三张卡片高度。
    const measureBitmap = new Bitmap(1, 1);
    measureBitmap.fontFace = noteFontFace;
    measureBitmap.fontBold = true;
    const textWidth = cardWidth - NOTE_TEXT_PADDING * 2;
    const layouts = notes.map(note => {
      measureBitmap.fontSize = NOTE_TITLE_SIZE;
      const titleLines = wrapTextLines(measureBitmap, note.title, textWidth);
      const titleWidths = titleLines.map(line => measureBitmap.measureTextWidth(line));
      measureBitmap.fontSize = NOTE_BODY_SIZE;
      const bodyLines = wrapTextLines(measureBitmap, note.body, textWidth);
      const bodyWidths = bodyLines.map(line => measureBitmap.measureTextWidth(line));
      const contentWidth = Math.max(0, ...titleWidths, ...bodyWidths);
      return { titleLines, bodyLines, contentWidth };
    });
    const maxTitleLines = Math.max(...layouts.map(layout => layout.titleLines.length));
    const maxBodyLines = Math.max(...layouts.map(layout => layout.bodyLines.length));
    const titleAreaHeight = maxTitleLines * NOTE_TITLE_LINE_HEIGHT;
    const cardHeight = titleAreaHeight + 8 + maxBodyLines * NOTE_BODY_LINE_HEIGHT + 10;
    const baseY = hitRect.y - 2;
    // 固定文字块顶部：增加的行数向下延伸，不再把标题向上推入 Logo 区域。
    const desiredCardY = Math.max(24, hitRect.y - NOTE_CARD_TOP_OFFSET);
    // 极端长文本至少为连接线保留少量空间，避免文字直接压到版本号。
    const latestCardY = baseY - cardHeight - 28;
    const cardY = Math.max(24, Math.min(desiredCardY, latestCardY));

    layer.addChild(lines);
    for (let i = 0; i < notes.length; i++) {
      const card = createNoteCard(
        layouts[i], noteFontFace, cardWidth, cardHeight, titleAreaHeight
      );
      card.x = startX + i * (cardWidth + NOTE_CARD_GAP);
      card.y = cardY + 10;
      cards.push(card);
      layer.addChild(card);
    }

    const paths = cards.map((card, i) => {
      // 下划线匹配该列排版后最长的一行，并补偿文字两侧的描边宽度。
      const underlineWidth = Math.min(
        cardWidth,
        Math.ceil(layouts[i].contentWidth + NOTE_TITLE_OUTLINE_WIDTH * 2)
      );
      const underlineLeft = card.x + NOTE_TEXT_PADDING - NOTE_TITLE_OUTLINE_WIDTH;
      const underlineRight = underlineLeft + underlineWidth;
      const underlineY = cardY + cardHeight - 4;
      const targetX = (underlineLeft + underlineRight) * 0.5;
      // 三条连接线使用等间距水平轨道：垂直 → 水平 → 垂直，严格只弯折两次。
      // 轨道在剩余高度内按相同比例排列；文本向下增加后仍保持规律且不会交叉。
      const laneSpace = Math.max(12, baseY - underlineY);
      const laneY = underlineY + laneSpace * (0.34 + 0.20 * i);
      return {
        stem: [
          { x: anchorXs[i], y: baseY },
          { x: anchorXs[i], y: laneY },
          { x: targetX, y: laneY },
          { x: targetX, y: underlineY }
        ],
        underline: { left: underlineLeft, right: underlineRight, y: underlineY }
      };
    });

    layer._noteLines = lines;
    layer._noteCards = cards;
    layer._notePaths = paths;
    layer._noteCardY = cardY;
    layer.visible = false;
    scene._versionAnnotation = layer;
    scene._versionAnnotationProgress = 0;
    getVersionOverlay(scene).addChild(layer);
    startFirstInstallVersionGuide(scene);
  }

  function updateVersionAnnotation(scene) {
    const layer = scene._versionAnnotation;
    const rect = scene._versionHitRect;
    if (!layer || !rect) return;

    const enabled = isVersionAnnotationEnabled();
    const hovering = enabled && isVersionAnnotationHovered(scene);
    const shouldShow = enabled &&
      (hovering || scene._versionAnnotationAutoReveal === true);
    const riseStep = 1 / NOTE_RISE_FRAMES;
    const fadeStep = 1 / NOTE_FADE_FRAMES;
    let progress = scene._versionAnnotationProgress || 0;
    progress = shouldShow
      ? Math.min(1, progress + riseStep)
      : Math.max(0, progress - fadeStep);
    scene._versionAnnotationProgress = progress;
    layer.visible = progress > 0;
    if (!layer.visible) return;

    const lines = layer._noteLines;
    lines.clear();
    lines.lineStyle(NOTE_LINE_WIDTH, NOTE_LINE_COLOR, Math.min(1, progress * 2));
    for (let i = 0; i < layer._notePaths.length; i++) {
      const path = layer._notePaths[i];
      const stemRate = Math.max(0, Math.min(1, (progress - i * 0.08) / 0.58));
      drawPartialPath(lines, path.stem, stemRate);

      // 连接线到达说明处后，下划线从中心向两侧自然展开。
      const underlineRate = Math.max(0, Math.min(1, (progress - 0.42 - i * 0.08) / 0.22));
      if (underlineRate > 0) {
        const centerX = (path.underline.left + path.underline.right) * 0.5;
        const halfWidth = (path.underline.right - path.underline.left) * 0.5 * underlineRate;
        lines.moveTo(centerX - halfWidth, path.underline.y);
        lines.lineTo(centerX + halfWidth, path.underline.y);
      }
      const textRate = Math.max(0, Math.min(1, (progress - 0.52 - i * 0.08) / 0.30));
      const eased = 1 - Math.pow(1 - textRate, 3);
      const card = layer._noteCards[i];
      card.opacity = Math.round(255 * eased);
      card.y = layer._noteCardY + (1 - eased) * 10;
    }
  }

  function createVersionSprite(scene, text, fontFace) {
    if (!scene || SceneManager._scene !== scene || scene._versionSprite) return;

    const fallbackFontFace = ($gameSystem && $gameSystem.mainFontFace)
      ? $gameSystem.mainFontFace()
      : ((typeof DrillUp !== "undefined" && DrillUp.g_DFF_fontFace) || "rmmz-mainfont");
    // 批注说明固定走 MZ 的系统主字体，不继承 Drill 动态字体或版本号专用字体。
    const noteFontFace = `rmmz-mainfont, ${$dataSystem.advanced.fallbackFonts || "sans-serif"}`;

    const width = Graphics.width;
    const height = Graphics.height;

    const sprite = new Sprite(new Bitmap(width, height));
    sprite.z = 9999;

    const bmp = sprite.bitmap;

    bmp.fontFace = fontFace ? `${fontFace}, ${fallbackFontFace}` : fallbackFontFace;
    bmp.fontSize = FONT_SIZE;
    bmp.textColor = COLOR;
    bmp.outlineColor = OUTLINE_COL;
    bmp.outlineWidth = OUTLINE_W;

    const lineH = FONT_SIZE + 8;
    const x = PADDING_X;
    const y = height - PADDING_Y - lineH;

    const textWidth = Math.ceil(bmp.measureTextWidth(text));
    const versionParts = getVersionParts(text);
    const anchorXs = getVersionAnchorXs(bmp, text, x, textWidth, versionParts);

    bmp.drawText(text, x, y, width - x * 2, lineH, "left");

    scene._versionSprite = sprite;
    scene._versionHitRect = { x, y, width: textWidth, height: lineH };
    getVersionOverlay(scene).addChild(sprite);
    createVersionAnnotation(
      scene, scene._versionHitRect, anchorXs, noteFontFace, versionParts
    );
  }

  function updateTitleChangelogIcon(scene) {
    const rect = scene._versionHitRect;
    if (!rect) return false;
    // 只在进入标题、缓存写入或语言切换时重新解析日志，避免每帧读取完整缓存。
    const cacheRevision = chahuiUtil._changelogCacheRevision || 0;
    if (scene._changelogCacheRevision !== cacheRevision || scene._changelogLanguage !== ConfigManager.language) {
      scene._changelogReadable = !!window.StandaloneUpdateLog?.hasReadableLogs();
      scene._changelogCacheRevision = cacheRevision;
      scene._changelogLanguage = ConfigManager.language;
    }
    const announcementRevision = window.StandaloneUpdateLog?.announcementRevision || 0;
    if (scene._announcementNoticeRevision !== announcementRevision || scene._announcementNoticeLanguage !== ConfigManager.language) {
      scene._announcementNotice = !!window.StandaloneUpdateLog?.hasAnnouncementNotice();
      scene._announcementNoticeRevision = announcementRevision;
      scene._announcementNoticeLanguage = ConfigManager.language;
    }
    if (changelogFirstDisplayThisRun === undefined) {
      try {
        changelogFirstDisplayThisRun = localStorage.getItem(CHANGELOG_SHOWN_STORAGE_KEY) !== "1";
      } catch (_) {
        changelogFirstDisplayThisRun = true;
      }
    }
    if (chahuiUtil._titleChangelogChanged === undefined) {
      try { chahuiUtil._titleChangelogChanged = localStorage.getItem(CHANGELOG_PENDING_STORAGE_KEY) === "1"; }
      catch (_) { chahuiUtil._titleChangelogChanged = false; }
    }
    const changelogNotice = scene._changelogReadable && (changelogFirstDisplayThisRun || chahuiUtil._titleChangelogChanged);
    const hasNotice = changelogNotice || scene._announcementNotice;
    let icon = scene._changelogIcon;
    if (hasNotice && !icon) {
      icon = chahuiUtil.createNoticeBadge({ size: CHANGELOG_ICON_HEIGHT });
      icon.visible = false;
      icon.opacity = 255;
      scene._changelogIcon = icon;
      getVersionOverlay(scene).addChild(icon);
    }
    if (icon) {
      icon.x = rect.x + rect.width + CHANGELOG_ICON_GAP + CHANGELOG_ICON_HEIGHT / 2;
      icon.y = rect.y + rect.height / 2;
      icon.visible = hasNotice && !scene._updateCheckLoading;
    }
    if (!scene.isActive() || scene.isBusy() || SceneManager.isSceneChanging() ||
        !scene._commandWindow?.isOpenAndActive()) return false;
    if (scene._versionPointerOutside) return false;
    // 版本号始终支持点击；有红点时将点击区延伸至图标，保留手指操作余量。
    const hitRight = icon?.visible ? icon.x + CHANGELOG_ICON_HEIGHT / 2 : rect.x + rect.width;
    const hovered = TouchInput.x >= rect.x - CHANGELOG_HIT_LEFT_PADDING &&
      TouchInput.x < hitRight + CHANGELOG_HIT_RIGHT_PADDING &&
      TouchInput.y >= rect.y - CHANGELOG_HIT_VERTICAL_PADDING &&
      TouchInput.y < rect.y + rect.height + CHANGELOG_HIT_VERTICAL_PADDING;
    if (hovered && TouchInput.isTriggered()) {
      if (scene._changelogReadable && window.StandaloneUpdateLog?.open(scene._announcementNotice ? 'announcement' : 'changelog')) {
        SoundManager.playOk();
      } else {
        SoundManager.playBuzzer();
      }
      // 消费这次点击，避免标题命令窗口同时处理它。
      TouchInput.clear();
      return true;
    }
    return false;
  }

  function drawVersionOnTitle(scene) {
    const text = getVersionText();
    if (!text) return;

    // 到标题创建时再确认字体状态，避免一次性 Bitmap 在字体完成前永久画成回退字体。
    const fontFace = FONT_FACE;
    if (!fontFace ||
        (typeof chahuiUtil.checkFontLoaded === "function" && chahuiUtil.checkFontLoaded(fontFace))) {
      createVersionSprite(scene, text, fontFace);
      return;
    }

    // 版本号 Bitmap 只绘制一次，因此必须等待字体完成，不能接受首次回退。
    const task = (Graphics._createFontLoader && Graphics._createFontLoader(fontFace));
    if (task && typeof task.then === "function") {
      task.then(loaded => createVersionSprite(scene, text, loaded ? fontFace : null))
        .catch(error => {
          console.error("[MobileSupport] 版本号字体加载失败", error);
          createVersionSprite(scene, text, null);
        });
    } else {
      createVersionSprite(scene, text, null);
    }
  }

  const _Scene_Title_createForeground = Scene_Title.prototype.createForeground;
  Scene_Title.prototype.createForeground = function() {
    _Scene_Title_createForeground.call(this);
    this._versionPointerOutside = false;
    this._versionMouseLeaveHandler = () => { this._versionPointerOutside = true; };
    this._versionMouseEnterHandler = () => { this._versionPointerOutside = false; };
    Graphics._canvas?.addEventListener("mouseleave", this._versionMouseLeaveHandler);
    Graphics._canvas?.addEventListener("mouseenter", this._versionMouseEnterHandler);
    drawVersionOnTitle(this);
  };

  const _Scene_Title_updateVersionAnnotation = Scene_Title.prototype.update;
  Scene_Title.prototype.update = function() {
    if (updateTitleChangelogIcon(this)) return;
    _Scene_Title_updateVersionAnnotation.call(this);
    keepVersionOverlayOnTop(this);
    updateVersionAnnotation(this);
  };

  // Drill_TitleVideo 会在 createDisplayObjects 的末尾追加前景视频；场景开始前重新置顶，
  // 避免第一帧出现视频短暂覆盖文字，后续 update 继续防止延迟追加的贴图抢占层级。
  const _Scene_Title_startVersionOverlay = Scene_Title.prototype.start;
  Scene_Title.prototype.start = function() {
    _Scene_Title_startVersionOverlay.call(this);
    keepVersionOverlayOnTop(this);
  };

  const _Scene_Title_terminateVersionAnnotation = Scene_Title.prototype.terminate;
  Scene_Title.prototype.terminate = function() {
    if (this._versionAnnotationAutoTimer) {
      clearTimeout(this._versionAnnotationAutoTimer);
      this._versionAnnotationAutoTimer = null;
    }
    Graphics._canvas?.removeEventListener("mouseleave", this._versionMouseLeaveHandler);
    Graphics._canvas?.removeEventListener("mouseenter", this._versionMouseEnterHandler);
    _Scene_Title_terminateVersionAnnotation.call(this);
  };

})();


/*:
  绘制物品、技能生效范围提醒
 */
(function(){

  if (!window.QJ) window.QJ = {};
  if (!QJ.MPMZ) QJ.MPMZ = {};
  if (!QJ.MPMZ.tl) QJ.MPMZ.tl = {};

  var _hb = {}; // index -> PIXI.Graphics

  // 独立图层（避免塞进 _pictureContainer 触发 PictureCallCommon）
  function hitboxLayer(){
    var sc = SceneManager._scene, ss = sc && sc._spriteset;
    if (!ss) return null;
    if (!ss._qjSingleHBLayer){
      ss._qjSingleHBLayer = new Sprite(); 
      ss.addChild(ss._qjSingleHBLayer);
    }
    return ss._qjSingleHBLayer;
  }

  // Graphics 封装
  function BulletHitboxGfx(index, opt){
    PIXI.Graphics.call(this);
    this._index = index;
    opt = opt || {};
    this._fill       = (typeof opt.color === 'number') ? opt.color : 0xff6a00;
    this._alpha      = (opt.alpha != null) ? opt.alpha : 0.35;
    this._line       = (typeof opt.lineColor === 'number') ? opt.lineColor : 0xd15700;
    this._stroke     = (opt.stroke === false) ? false : true;  // 是否描边
    this._lineWidth  = (opt.lineWidth != null) ? opt.lineWidth : 1;
    this._lineAlpha  = (opt.lineAlpha != null) ? opt.lineAlpha : 0.5;
  }
  BulletHitboxGfx.prototype = Object.create(PIXI.Graphics.prototype);
  BulletHitboxGfx.prototype.constructor = BulletHitboxGfx;

  BulletHitboxGfx.prototype.update = function(){
    this.clear();
    if (!$gameMap.bulletQJ) return;
    var bullet = $gameMap.bulletQJ(this._index);
    if (!bullet || !bullet.QJBody) return;

    var body = bullet.QJBody;
    var ox = $gameMap.displayX() * $gameMap.tileWidth();
    var oy = $gameMap.displayY() * $gameMap.tileHeight();
    var sx = function(x){ return x - ox; };
    var sy = function(y){ return y - oy; };

    this.beginFill(this._fill, this._alpha);
    if (this._stroke && this._lineWidth > 0 && this._lineAlpha > 0){
      this.lineStyle(this._lineWidth, this._line, this._lineAlpha);
    } else {
      this.lineStyle(0); // 关闭描边
    }

    if (body.calcPoints && body.pos){
      var pts = body.calcPoints;
      if (pts && pts.length){
        this.moveTo(sx(pts[0].x + body.pos.x), sy(pts[0].y + body.pos.y));
        for (var i=1;i<pts.length;i++){
          this.lineTo(sx(pts[i].x + body.pos.x), sy(pts[i].y + body.pos.y));
        }
        this.closePath();
      }
    } else if (body.r != null && body.pos){

      this.drawCircle(sx(body.pos.x), sy(body.pos.y), body.r);
    } else if (body.w != null && body.h != null && body.pos){
      this.drawRect(sx(body.pos.x - body.w/2), sy(body.pos.y - body.h/2), body.w, body.h);
    }

    this.endFill();
  };

  // 对外 API：显示 / 更新参数
  QJ.MPMZ.tl.showBulletHitbox = function(index, opt){
    var layer = hitboxLayer(); if (!layer) return;
    var g = _hb[index];
    if (!g){
      g = new BulletHitboxGfx(index, opt || {});
      _hb[index] = g;
      layer.addChild(g);
    } else if (opt){
      if (opt.color     != null) g._fill      = opt.color;
      if (opt.alpha     != null) g._alpha     = opt.alpha;
      if (opt.lineColor != null) g._line      = opt.lineColor;
      if (opt.stroke    != null) g._stroke    = !!opt.stroke;
      if (opt.lineWidth != null) g._lineWidth = opt.lineWidth;
      if (opt.lineAlpha != null) g._lineAlpha = opt.lineAlpha;
    }
    g.update();
    return g;
  };

  //  主动删除：可在子弹的 deadJS 里调用
  QJ.MPMZ.tl.removeBulletHitbox = function(index){
    var g = _hb[index];                 // ← 修正：使用 _hb
    if (!g) return;
    if (g.parent) g.parent.removeChild(g);
    delete _hb[index];
  };

  // 清理全部（比如换图前手动调用）
  QJ.MPMZ.tl.removeAllBulletHitboxes = function(){
    for (var k in _hb){                 // ← 修正：使用 _hb
      var g = _hb[k];
      if (g && g.parent) g.parent.removeChild(g);
      delete _hb[k];
    }
  };
})();


/*
在指定屏幕坐标播放动画（无需事件/玩家）
 */
(() => {
"use strict";

// 用法：$gameTemp.requestAnimationAtPoint(screenX, screenY, animationId, mirror)
Game_Temp.prototype.requestAnimationAtPoint = function(x, y, animationId, mirror = false) {
    const spriteset = SceneManager._scene && SceneManager._scene._spriteset;
    if (!spriteset || !$dataAnimations[animationId]) { return null; }
    const dummy = new Sprite();           // 0 尺寸 → 动画正好落在 (x,y)
    const zoom = $gameScreen.zoomScale?.() || 1;
    dummy.x = Math.floor(x / zoom); dummy.y = Math.floor(y / zoom);
    spriteset.addChild(dummy);            // Spriteset 处于屏幕(0,0)，子节点即屏幕坐标
    const proxy = {
        _dummySprite: dummy,
        startAnimation() {},
        endAnimation() {                  // 动画播完时核心会调用，自动清理
            if (this._dummySprite && this._dummySprite.parent) {
                this._dummySprite.parent.removeChild(this._dummySprite);
            }
            this._dummySprite = null;
        }
    };
    this.requestAnimation([proxy], animationId, mirror);
    return proxy;
};

// 让动画系统把代理目标解析到虚拟精灵（地图 + 战斗都接上）
for (const klass of [Spriteset_Map, Spriteset_Battle]) {
    const _find = klass.prototype.findTargetSprite;
    klass.prototype.findTargetSprite = function(target) {
        if (target && target._dummySprite) { return target._dummySprite; }
        return _find.call(this, target);
    };
}

})();

/*
 为了解决0.81开始出现的卡顿问题，原因诊断为平均每2秒都会自动触发一次缓存回收
 */
(function(){
  'use strict';
  function apply(){
    var r = Graphics && Graphics._renderer, gc = r && r.textureGC;
    if (!gc) return false;
    var fps = 60;                   // 目标帧率
    gc.checkCount = fps * 300;      // 5 分钟扫描一次
    gc.maxIdle    = 3600;           
    if (gc.checkCountMax != null) gc.checkCountMax = gc.checkCount;
    return true;
  }
  // 渲染器创建后立刻套用
  var _create = Graphics._createRenderer;
  Graphics._createRenderer = function(){ _create.apply(this, arguments); apply(); };
  // 兜底：若有别的插件重建了 renderer，则轮询直到成功一次
  (function poll(i){ if (!apply() && i<600) setTimeout(poll,16, i+1); })(0);
})();


/* filter 应用失败时直接跳过 */
/* 案例：消息窗口在渲染时应用了模糊滤镜，然后 shader 编译失败/对象无效 */
(function() {
  // 只在移动端有效
  if (!Utils.isMobileDevice()) return;

  if (!window.PIXI || !PIXI.Filter || !PIXI.Filter.prototype) return;
  if (PIXI.Filter.prototype.__mobileSafeApply) return;
  PIXI.Filter.prototype.__mobileSafeApply = true;

  const _apply = PIXI.Filter.prototype.apply;
  PIXI.Filter.prototype.apply = function(filterManager, input, output, clear, currentState) {
    try {
      return _apply.call(this, filterManager, input, output, clear, currentState);
    } catch (e) {
      console.warn("[Mobile] Filter.apply skipped:", e);
      // 跳过滤镜，避免整局崩溃
      return;
    }
  };
})();

//=============================================================================
//通用的转圈loading动画
//用法：
//   UsuimoLoading.show(x, y, text);
//   UsuimoLoading.move(x, y);
//   UsuimoLoading.setText(text);
//   UsuimoLoading.hide();
//=============================================================================
(() => {
  "use strict";

  const ROOT_ID = "usuimo-loading-root";
  const STYLE_ID = "usuimo-loading-style";

  const CSS_TEXT = `
#${ROOT_ID} {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 999999;
  display: none;
  pointer-events: none;
  user-select: none;
  transform-origin: left top;
}

#${ROOT_ID}.show {
  display: block;
}

#${ROOT_ID} .usuimo-loading-wrap {
  position: absolute;
  left: 0;
  top: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  white-space: nowrap;
}

#${ROOT_ID} .usuimo-spinner {
  position: relative;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
}

#${ROOT_ID} .usuimo-spinner-bar {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 4px;
  height: 16px;
  margin-left: -2px;
  margin-top: -5.5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  opacity: 0.15;
  transform-origin: center 15px;
  animation: usuimo-spinner-fade 1.05s linear infinite;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.22);
}

#${ROOT_ID} .usuimo-spinner-bar:nth-child(1)  { transform: rotate(0deg)   translateY(-15px); animation-delay: -0.9625s; }
#${ROOT_ID} .usuimo-spinner-bar:nth-child(2)  { transform: rotate(30deg)  translateY(-15px); animation-delay: -0.875s; }
#${ROOT_ID} .usuimo-spinner-bar:nth-child(3)  { transform: rotate(60deg)  translateY(-15px); animation-delay: -0.7875s; }
#${ROOT_ID} .usuimo-spinner-bar:nth-child(4)  { transform: rotate(90deg)  translateY(-15px); animation-delay: -0.7s; }
#${ROOT_ID} .usuimo-spinner-bar:nth-child(5)  { transform: rotate(120deg) translateY(-15px); animation-delay: -0.6125s; }
#${ROOT_ID} .usuimo-spinner-bar:nth-child(6)  { transform: rotate(150deg) translateY(-15px); animation-delay: -0.525s; }
#${ROOT_ID} .usuimo-spinner-bar:nth-child(7)  { transform: rotate(180deg) translateY(-15px); animation-delay: -0.4375s; }
#${ROOT_ID} .usuimo-spinner-bar:nth-child(8)  { transform: rotate(210deg) translateY(-15px); animation-delay: -0.35s; }
#${ROOT_ID} .usuimo-spinner-bar:nth-child(9)  { transform: rotate(240deg) translateY(-15px); animation-delay: -0.2625s; }
#${ROOT_ID} .usuimo-spinner-bar:nth-child(10) { transform: rotate(270deg) translateY(-15px); animation-delay: -0.175s; }
#${ROOT_ID} .usuimo-spinner-bar:nth-child(11) { transform: rotate(300deg) translateY(-15px); animation-delay: -0.0875s; }
#${ROOT_ID} .usuimo-spinner-bar:nth-child(12) { transform: rotate(330deg) translateY(-15px); animation-delay: 0s; }

#${ROOT_ID} .usuimo-loading-text {
  transform: translateY(8px);
  margin-left: 22px;
  font-size: 28px;
  line-height: 36px;
  font-family: "MPLUS2ExtraBold", "GameFont", sans-serif;
  height: 50px;
  display: flex;
  align-items: center;
  color: rgba(255, 255, 255, 0.96);
  text-shadow:
    0 1px 4px rgba(0, 0, 0, 0.85),
    0 0 6px rgba(0, 0, 0, 0.65),
    0 0 8px rgba(0, 0, 0, 0.55);
  letter-spacing: 0.1px;
}

@keyframes usuimo-spinner-fade {
  0%   { opacity: 1; }
  100% { opacity: 0.15; }
}
`;

  const toNumber = (value, fallback = 0) =>
    Number.isFinite(value) ? value : fallback;

  const injectStyle = () => {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS_TEXT;
    document.head.appendChild(style);
  };

  const createRoot = () => {
    const existing = document.getElementById(ROOT_ID);
    if (existing) return existing;

    injectStyle();

    const root = document.createElement("div");
    root.id = ROOT_ID;

    const wrap = document.createElement("div");
    wrap.className = "usuimo-loading-wrap";

    const spinner = document.createElement("div");
    spinner.className = "usuimo-spinner";

    Array.from({ length: 12 }, () => {
      const bar = document.createElement("div");
      bar.className = "usuimo-spinner-bar";
      spinner.appendChild(bar);
    });

    const text = document.createElement("div");
    text.className = "usuimo-loading-text";
    text.textContent = "Loading...";

    wrap.appendChild(spinner);
    wrap.appendChild(text);
    root.appendChild(wrap);
    document.body.appendChild(root);

    return root;
  };

  const getRoot = () => document.getElementById(ROOT_ID) || createRoot();

  const getTextNode = () => getRoot().querySelector(".usuimo-loading-text");

  const getRealScale = () => {
    if (typeof Graphics !== "undefined" && Graphics._realScale) {
      return Graphics._realScale;
    }
    return 1;
  };

  const getCanvasOffset = () => {
    if (typeof Graphics === "undefined") {
      return { x: 0, y: 0 };
    }

    const canvas = Graphics._canvas || document.getElementById("GameCanvas");
    if (!canvas || !canvas.getBoundingClientRect) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top
    };
  };

  const applyLayout = () => {
    const loading = window.UsuimoLoading;
    if (!loading) return;

    const root = document.getElementById(ROOT_ID);
    if (!root || !loading._visible) return;

    const scale = getRealScale();
    const offset = getCanvasOffset();

    const px = offset.x + loading._x * scale;
    const py = offset.y + loading._y * scale;

    root.style.left = `${px}px`;
    root.style.top = `${py}px`;
    root.style.transform = `scale(${scale})`;
  };

  window.UsuimoLoading = {
    _visible: false,
    _x: 0,
    _y: 0,

    show(x = 0, y = 0, text) {
      if (ConfigManager.language === 0) return;
      const root = getRoot();

      this._x = toNumber(x, 0);
      this._y = toNumber(y, 0);
      this._visible = true;

      if (typeof text !== "undefined") {
        this.setText(text);
      }

      root.classList.add("show");
      applyLayout();
    },

    hide() {
      const root = document.getElementById(ROOT_ID);
      if (!root) return;

      this._visible = false;
      root.classList.remove("show");
    },

    move(x, y) {
      this._x = toNumber(x, this._x);
      this._y = toNumber(y, this._y);
      applyLayout();
    },

    setText(text) {
      if (ConfigManager.language === 0) return;
      const node = getTextNode();
      node.textContent = text == null ? "" : String(text);
    },

    refresh() {
      applyLayout();
    },

    isVisible() {
      return !!this._visible;
    }
  };

  window.addEventListener("resize", applyLayout);

  const _Graphics_updateAllElements = Graphics._updateAllElements;
  Graphics._updateAllElements = function(...args) {
    _Graphics_updateAllElements.apply(this, args);
    applyLayout();
  };

  const _SceneManager_onResize = SceneManager.onResize;
  SceneManager.onResize = function(...args) {
    if (_SceneManager_onResize) {
      _SceneManager_onResize.apply(this, args);
    }
    applyLayout();
  };

  const _Scene_Title_terminate = Scene_Title.prototype.terminate;
  Scene_Title.prototype.terminate = function(...args) {
    window.UsuimoLoading?.hide();
    _Scene_Title_terminate.apply(this, args);
  };
})();
