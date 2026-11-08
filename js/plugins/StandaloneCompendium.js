/*:
 * @target MZ
 * @plugindesc v0.13.2 独立图鉴：物品收集与可拖拽缩放的轨迹时间轴。
 * @author shiroin / Codex
 * @command Open
 * @text 打开图鉴
 * @arg category
 * @text 初始分类
 * @type select
 * @option 道具
 * @value item
 * @option 武器
 * @value weapon
 * @option 装备
 * @value armor
 * @option 轨迹
 * @value trajectory
 * @default item
 * @help
 * StandaloneCompendium.open();          // 道具
 * StandaloneCompendium.open('weapon');  // 武器
 * StandaloneCompendium.open('armor');   // 装备
 * StandaloneCompendium.open('trajectory'); // 轨迹（当前存档已解锁成就和画廊事件）
 * 新来源：StandaloneCompendium.registerTraceSource(id, { read({text}), prepare?, watch? });
 * 原地修改来源数据后：StandaloneCompendium.invalidateTraceSource(id)。完整数据格式见 README。
 * 轨迹：单指/鼠标拖动，滚轮/双指捏合缩放；左侧筛选，右侧四类切换。
 * 带详情提示的事件可点击查看详情；悬停外发光，Esc/右键/× 关闭详情。
 * 点击左侧分类展开事件目录，点击条目定位；目录支持滚轮和上下拖动。
 * 成就事件读取已解锁记录的 gameDate 和多语言 Name/Description，不显示 Pop Up Desc。
 * 已缺失游戏时间的历史成就显示于第 1 天，使用现实解锁时刻；时间全失显示 --:--，不改写存档。
 * 也可 SceneManager.push(Scene_StandaloneCompendium)。
 *
 * 只新增本插件命令、StandaloneCompendium、Scene_StandaloneCompendium。
 * 不修改已有场景/窗口/输入原型，不绑定公共事件，不执行装备或道具 Eval。
 * 使用标准 SceneManager.push/pop，地图按原生场景生命周期暂停/恢复。
 * 从已加载的 Items/Weapons/Armors 数据库读取有名称且 iconIndex > 0 的基础对象；
 * 按基础 ID 排列，排除 YEP 运行时独立实例。没有额外的手工物品白名单。
 * 道具、武器、装备备注含 <excludeFromCompendium> 时完全排除，不计入收集进度。
 * 已收集状态只读收集标记、独立装备累计数和当前持有情况（含已穿戴装备）。
 * 不迁移、不写入收集数据，不生成独立物品；普通道具不显示累计获得数。
 * 界面文字读取 window.mapCommonEventDialogue.CollectionScene；缺失字段使用当前语言默认值。
 * 攻略正文暂留空；右侧只读首次获得的游戏时间，设备时间仅存档备案，不显示。
 * 未收集条目隐藏名称与正文。攻略来源文本暂不部署。
 *
 * 白色轮廓：按需缓存 64×64 白色 alpha 遮罩，透明度在缓存内一次性应用，无填充背景。
 * 不创建逐图标滤镜，不逐帧扫描数据库或生成遮罩。退出时释放本场景缓存。
 * 使用装备栏同款 rpgCommonWindowLayout；所有布局和输入逻辑在本文件。
 * 分类贴图：collectionScene_item / equip_weapon / equip_gear（img/system）；按实际按钮数量整体居中、间距 200px。
 * 选中分类切换为对应 _focus 贴图，再与名称共同使用暖色 GlowFilter；未选中恢复原图。
 * 顶部装饰图与装备栏同位置/透明度：道具 collectionScene_item，武器 equip_weapon，装备 equip_gear。
 *
 * 点击/触摸选择；方向键浏览；滚轮逐行移动；PageUp/PageDown 翻页；
 * 列表内每拖动满 64px 滚动一整行；Tab/Shift+Tab 切换分类；Esc/右键/Drill 返回按钮退出。
 * 选择指针使用 Drill_MenuCursor 样式 6（装备栏同款 equip slot cursor），返回使用 Drill_MenuBackButton。
 * 背景使用装备栏同款 BlurFilter(4) 和 40% 遮黑。重新打开时从第一页开始。
 * 支持按 1920×1080 设计尺寸等比适配。资源缓存归 ImageManager 所有，退出不销毁。
 */
(() => {
    'use strict';
    const NAME = 'StandaloneCompendium';
    const LOCKED_ICON_OPACITY = 80; // Final silhouette alpha, applied once in the cached bitmap.
    const CATEGORIES = Object.freeze([
        { type: 'item', image: 'collectionScene_item', focusImage: 'collectionScene_item_focus', decoration: 'collectionScene_item' },
        { type: 'weapon', image: 'equip_weapon', focusImage: 'equip_weapon_focus', decoration: 'equip_weapon' },
        { type: 'armor', image: 'equip_gear', focusImage: 'equip_gear_focus', decoration: 'equip_gear' },
        { type: 'trajectory', image: 'collectionScene_trace', focusImage: 'collectionScene_trace_focus' }
    ]);
    const L = Object.freeze({
        width: 1920, height: 1080, panelX: 343, panelY: 90,
        gridX: 386, gridY: 320, gridWidth: 700, cellHeight: 96, gridHeight: 504,
        columns: 5, rows: 5, pageSize: 25,
        detailX: 1140, detailY: 180, detailWidth: 412,
        bodyY: 316, bodyHeight: 540, categoryX: 1824, categoryStep: 200,
        categoryButtonTop: -72, categoryButtonHeight: 180
    });
    function categoryButtonY(index, count) {
        // Center the complete icon + caption slots, not only the icon centers.
        const groupHeight = (count - 1) * L.categoryStep + L.categoryButtonHeight;
        return (L.height - groupHeight) / 2 - L.categoryButtonTop + index * L.categoryStep;
    }
    const TEXT = {
        zh: { item: '道具', weapon: '武器', armor: '装备', trajectory: '轨迹',
            allEvents: '全部事件', mainEvents: '重要事件', sideEvents: '支线事件', eroEvents: '色色事件', achievementEvents: '达成成就', readMore: '查看详情',
            unlockCondition: '达成条件：', unlockTime: '第%1天 · %2', traceControls: '拖拽浏览时间线 · 滚轮 / 双指捏合缩放时间线视图', readMoreControls: '滚轮 / 上下滑动进行阅读',
            progress: '已经完成收集：%1 / %2', unknownName: '？？？？？',
            locked: '数据缺失——\n至少获得一次该对象后即可解锁', count: '获得过的数量', firstTime: '第一次获得的时间:\n%1天 %2时 %3分', timeUnknown: '未记录', empty: '暂无可显示的条目' },
        ja: { item: 'アイテム', weapon: '武器', armor: '装備', trajectory: '軌跡',
            allEvents: '全イベント', mainEvents: '重要イベント', sideEvents: 'サブイベント', eroEvents: 'エッチイベント', achievementEvents: '実績達成', readMore: '詳細を見る',
            unlockCondition: '解放条件：', unlockTime: '%1日目 · %2', traceControls: 'ドラッグでタイムラインを移動 · ホイール / ピンチ操作でタイムラインを拡大・縮小', readMoreControls: 'ホイール / 上下スワイプで閲覧',
            progress: '収集済み：%1 / %2', unknownName: '？？？',
            locked: '入手すると名前と詳細情報が解放されます。', count: '累計入手', firstTime: '初めて入手した時間:\n%1日 %2時 %3分', timeUnknown: '記録なし', empty: '表示できる項目がありません' },
        en: { item: 'Items', weapon: 'Weapons', armor: 'Equipment', trajectory: 'Trajectory',
            allEvents: 'All Events', mainEvents: 'Main Events', sideEvents: 'Side Events', eroEvents: 'Ero Events', achievementEvents: 'Achievements', readMore: 'Read more',
            unlockCondition: 'Unlock conditions:', unlockTime: 'Day %1 · %2', traceControls: 'Drag to browse the timeline · Scroll / Pinch to zoom the timeline', readMoreControls: 'Scroll / Swipe up or down to read',
            progress: 'Collected: %1 / %2', unknownName: '???',
            locked: 'Collect this entry to reveal its name and details.', count: 'Total acquired', firstTime: 'First acquired:\n%1 Day %2 Hour %3 Min', timeUnknown: 'Not recorded', empty: 'No entries to display' }
    };
    function defaultLabels() {
        const language = ConfigManager.language;
        return TEXT[[0, 12].includes(language) ? 'zh' : language === 1 ? 'ja' : 'en'];
    }
    function labels() {
        const fallback = defaultLabels();
        const current = window.mapCommonEventDialogue?.CollectionScene || {};
        const keys = { item: 'itemCollection', weapon: 'weaponCollection', armor: 'gearCollection', trajectory: 'traceCollection',
            allEvents: 'allEvents', mainEvents: 'mainEvents', sideEvents: 'sideEvents', eroEvents: 'eroEvents', achievementEvents: 'achievementEvents', readMore: 'readMore', unlockCondition: 'unlockCondition', unlockTime: 'unlockTime', traceControls: 'traceControls', readMoreControls: 'readMoreControls',
            progress: 'collectionProgress', unknownName: 'lockedObject', locked: 'lockedNotice',
            count: 'acquiredCount', firstTime: 'firstAcquiredTime', timeUnknown: 'firstAcquiredTimeUnknown', empty: 'empty' };
        const result = { ...fallback };
        for (const [label, key] of Object.entries(keys)) {
            const value = current[key] ?? (label === 'trajectory' ? current.trajectoryCollection : undefined);
            if (typeof value === 'string' || Array.isArray(value)) result[label] = textLines(value);
        }
        return result;
    }
    function progressText(known, total) {
        return labels().progress.replace(/%([12])/g, (_, index) => String(index === '1' ? known : total));
    }

    function firstAcquiredText(record) {
        const text = labels();
        let template = text.firstTime;
        // Older translations contain only a caption; retain a localized time line.
        if (!/%[123]/.test(template)) template += '\n' + defaultLabels().firstTime.split('\n').slice(1).join('\n');
        const time = record?.gameTime;
        if (!time || ![time.day, time.hour, time.minute].every(value => Number.isFinite(value) && value >= 0)) {
            const caption = template.split('\n').filter(line => !/%[123]/.test(line)).join('\n');
            return [caption, text.timeUnknown].filter(Boolean).join('\n');
        }
        const values = [String(time.day), String(time.hour).padStart(2, '0'), String(time.minute).padStart(2, '0')];
        return template.replace(/%([123])/g, (_, index) => values[Number(index) - 1]);
    }

    function database(type) {
        return type === 'item' ? $dataItems : type === 'weapon' ? $dataWeapons : $dataArmors;
    }
    function entries(type) {
        const limit = type === 'item' ? DataManager._baseItemsLength :
            type === 'weapon' ? DataManager._baseWeaponsLength : DataManager._baseArmorsLength;
        return database(type).filter((item, index) => item &&
            (!Number.isInteger(limit) || index < limit) && !item.baseItemId &&
            !/<excludeFromCompendium>/i.test(item.note || '') &&
            typeof item.name === 'string' && item.name.trim() &&
            Number.isInteger(item.iconIndex) && item.iconIndex > 0);
    }
    function quantity(type, id) {
        return type === 'item' ? 0 : Number($gameSystem.independentEquipCollectionCount?.(type, id) || 0);
    }
    function acquired(type, id) {
        return !!($gameSystem.hasCollectedItem?.(type, id) ||
            $gameSystem._collectedItems?.[type]?.[id] || quantity(type, id) > 0 ||
            $gameParty.hasItem(database(type)[id], true));
    }
    function textLines(value) {
        return (Array.isArray(value) ? value : [value]).filter(x => typeof x === 'string' && x.trim()).join('\n');
    }
    // Reserved for the eventual ex_playerSetEquipmentDescription(item, { guide: true })
    // integration. Until the guide schema is decided, acquired entries have no body.
    function guideText() { return ''; }
    function trigger() { return TouchInput.isTriggered() || !!TouchInput.drill_isLeftTriggerd?.(); }
    function pressed() { return TouchInput.isPressed() || !!TouchInput.drill_isLeftPressed?.(); }
    function release() { return TouchInput.isReleased() || !!TouchInput.drill_isLeftReleased?.(); }

    // Local text window: preserve the installed escape-code/font renderer,
    // while wrapping only this window and clipping long descriptions to its body.
    class Window_CompendiumBody extends Window_Base {
        initialize(rect) {
            this._textHeight = 0;
            super.initialize(rect);
            this.opacity = 0;
            this._scrollMax = 0;
            this._wait = 120;
            this._direction = 1;
        }
        resetFontSettings() { super.resetFontSettings(); this.contents.fontSize = 22; }
        contentsHeight() { return Math.max(this.innerHeight, this._textHeight || 0); }
        createTextState(text, x, y, width) {
            const state = super.createTextState(text, x, y, width);
            state._galleryWrap = !this.drill_COWA_isCalculating?.();
            state._galleryWordEnd = 0;
            return state;
        }
        wrapBefore(state, width) {
            const used = Math.abs(state.x - state.startX) + this.textWidth(state.buffer);
            if (state._galleryWrap && used > 0 && used + width > this.innerWidth - 12) {
                this.flushTextState(state);
                this.processNewLine(state);
                state._gallerySoftStart = true;
            }
        }
        processCharacter(state) {
            if (state._galleryWrap && state.index >= state._galleryWordEnd) {
                const rest = state.text.slice(state.index);
                const char = String.fromCodePoint(rest.codePointAt(0));
                if (char.charCodeAt(0) >= 32 && !/\s/u.test(char)) {
                    const cjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(char);
                    let token = (!cjk && /^[\p{L}\p{N}_]+(?:['’.-][\p{L}\p{N}_]+)*/u.exec(rest)?.[0]) || char;
                    if (this.textWidth(token) > this.innerWidth - 12) token = char;
                    this.wrapBefore(state, this.textWidth(token));
                    state._galleryWordEnd = state.index + token.length;
                    state._gallerySoftStart = false;
                } else if (state._gallerySoftStart && /[^\S\r\n]/u.test(char)) {
                    state.index += char.length;
                    return;
                }
            }
            super.processCharacter(state);
        }
        processDrawIcon(index, state) {
            this.wrapBefore(state, ImageManager.iconWidth + 4);
            super.processDrawIcon(index, state);
        }
        setText(text) {
            this.origin.y = 0;
            this._wait = 120;
            this._direction = 1;
            this._drill_DFF_activeFont = null;
            this._textHeight = Math.ceil(this.textSizeEx(text).height);
            this.createContents();
            this.drawTextEx(text, 0, 0, this.innerWidth - 12);
            this._scrollMax = Math.max(0, this._textHeight - this.innerHeight);
        }
        scrollBy(amount) {
            this.origin.y = Math.max(0, Math.min(this._scrollMax, this.origin.y + amount));
            this._wait = 180;
        }
        update() {
            super.update();
            if (!(this._scrollMax > 0)) return;
            if (this._wait > 0) { this._wait--; return; }
            this.origin.y = Math.max(0, Math.min(this._scrollMax, this.origin.y + this._direction * 0.5));
            if (this.origin.y === 0 || this.origin.y === this._scrollMax) {
                this._direction *= -1;
                this._wait = 120;
            }
        }
    }

    // Same geometry and scrollbar style as the equipment scene; all overrides
    // are local to this window, including hit testing under the scaled UI root.
    class Window_CompendiumGrid extends Window_Selectable {
        initialize(rect, owner) {
            this._owner = owner;
            this._data = [];
            super.initialize(rect);
            if (this._drill_MSB_sprite) {
                this._drill_MSB_sprite.drill_MSB_changeStyle(this.drill_MSB_scrollBarStyleId());
                this._drill_MSB_needRefresh = true;
            }
            this.opacity = 0;
            this.activate();
        }
        maxCols() { return L.columns; }
        maxItems() { return this._data.length; }
        itemHeight() { return L.cellHeight; }
        itemWidth() { return Math.floor(this.innerWidth / this.maxCols()); }
        itemRect(index) {
            const width = this.itemWidth(), height = this.itemHeight();
            return new Rectangle((this.innerWidth - width * this.maxCols()) / 2 +
                index % this.maxCols() * width - this.scrollBaseX(),
                Math.floor(index / this.maxCols()) * height - this.scrollBaseY(), width, height);
        }
        drawItemBackground() {}
        drawItem(index) {
            const entry = this._data[index];
            if (!entry || !this._owner._iconSheet.isReady()) return;
            const rect = this.itemRect(index), icon = entry.item.iconIndex;
            const source = entry.known ? this._owner._iconSheet : this._owner.whiteIcon(icon);
            // The silhouette already contains its final alpha; never layer the original
            // icon below it or multiply the opacity a second time.
            this.contents.paintOpacity = 255;
            this.contents.blt(source, entry.known ? icon % 16 * 64 : 0,
                entry.known ? Math.floor(icon / 16) * 64 : 0, 64, 64,
                rect.x + (rect.width - 64) / 2, rect.y + 16);
            this.contents.paintOpacity = 255;
        }
        // The scene owns selection and gestures; Drill owns scrollbar dragging.
        processTouch() {}
        processCursorMove() {}
        processHandling() {}
        processWheelScroll() {}
        isTouchScrollEnabled() { return false; }
        drill_MCu_cursorEnabled() { return true; }
        drill_MCu_cursorStyleId() { return 6; }
        updateArrows() {
            super.updateArrows();
            this.syncCursorBean();
        }
        syncCursorBean() {
            const bean = this._drill_MCu_bean;
            if (!bean) return;
            const index = this.index();
            const visible = index >= this.topIndex() && index < this.topIndex() + L.pageSize;
            bean.drill_bean_setEnable(this.drill_MCu_isEnabled() && visible && !this._owner._closing);
            if (!visible) return;
            const rect = this.itemRect(index);
            // The Drill sprite shares our UI root: supply logical coordinates,
            // including the scrolling origin, and let the root scale both together.
            bean.drill_bean_setCenterPosition(this.x + this.padding + rect.x + rect.width / 2,
                this.y + this.padding + rect.y - this.origin.y + rect.height / 2);
            bean.drill_bean_setIndex(index);
            bean.drill_bean_setRect(0, 0, rect.width, rect.height);
        }
        drill_MSB_scrollBarEnabled() { return true; }
        drill_MSB_scrollBarStyleId() { return 2; }
        drill_MCB_borderEnabled() { return false; }
        _updateCursor() { this._cursorSprite.visible = false; }
        drill_MSB_isOnRange() {
            const bar = this._drill_MSB_sprite;
            if (!this.active || !bar?.visible || !bar.drill_MSB_isBarReady()) return false;
            const point = bar.worldTransform.applyInverse(new Point(TouchInput.x, TouchInput.y));
            const rect = bar.drill_MSB_getBarRect();
            return point.x >= rect.x && point.x < rect.x + rect.width &&
                point.y >= rect.y && point.y < rect.y + rect.height;
        }
        drill_MSB_updateScrollPressCheck() {
            if (this._owner._gesture || this._owner.drillBackOwnsPointer()) return;
            super.drill_MSB_updateScrollPressCheck();
        }
        drill_MSB_updateScrolling() {
            if (!this._drill_MSB_isDraging) return;
            const height = this.drill_MSB_barScrollHeight();
            if (height <= 0 || this.maxTopRow() <= 0) return;
            const dy = (TouchInput.y - this._drill_MSB_dragingLastPos) / this._owner._root.scale.y;
            const row = Math.max(0, Math.min(this.maxTopRow(), this._drill_MSB_dragingLastTopRow +
                Math.round(dy / (height / this.maxTopRow()))));
            if (this._drill_MSB_dragingTopRow === row) return;
            this._drill_MSB_dragingTopRow = row;
            this.scrollTo(0, row * this.itemHeight());
            if (this.index() < row * L.columns || this.index() >= (row + L.rows) * L.columns) this.select(-1);
        }
        indexAt(point) {
            const x = point.x - this.x - this.padding;
            const y = point.y - this.y - this.padding;
            if (x < 0 || x >= this.innerWidth || y < 0 || y >= this.innerHeight) return -1;
            const column = Math.floor((x - (this.innerWidth - this.itemWidth() * L.columns) / 2) / this.itemWidth());
            const index = (this.topRow() + Math.floor((y + this.origin.y) / L.cellHeight)) * L.columns + column;
            return column >= 0 && column < L.columns && index < this.maxItems() ? index : -1;
        }
    }

    // Read existing achievement/gallery records without storing duplicate timeline data.
    // Up/down arrow centers at 158/906 leave equal 86px panel insets.
    const TL = Object.freeze({ x: 460, y: 158, width: 1204, height: 720,
        insetX: 80, insetY: 128, dayWidth: 430, cardWidth: 339,
        imageWidth: 249, imageHeight: 140, minZoom: 0.36, maxZoom: 1.5, edgeFade: 48 });
    const DAY_SYMBOL_SIZE = 119;
    const TS = Object.freeze({ x: 98, y: 300, width: 280, height: 532,
        headerHeight: 52, gap: 8, rowHeight: 64, listHeight: 264 });
    const TRAJECTORY_PANEL = Object.freeze({ x: 60, y: 72, width: 1680, height: 920, opacity: 200 });
    // Match StandaloneEquipScene: finish the blink containing the five-second
    // deadline at full transparency, instead of cutting off a visible hint.
    const HINT_BLINK_MS = 72 * 1000 / 60;
    const OPERATION_HINT_END_MS = Math.ceil(5000 / HINT_BLINK_MS) * HINT_BLINK_MS;
    function trajectoryDivider(bitmap, x, y, length, vertical = false) {
        // Same two-half gradient as Shiroin_SceneGalleryA's galleryDrawDivider.
        const clear = 'rgba(255,255,255,0)', white = 'rgba(255,255,255,0.55)';
        const width = vertical ? 2 : length / 2, height = vertical ? length / 2 : 2;
        bitmap.gradientFillRect(x, y, width, height, clear, white, vertical);
        bitmap.gradientFillRect(x + (vertical ? 0 : width), y + (vertical ? height : 0),
            width, height, white, clear, vertical);
    }
    const TRACKS = Object.freeze([
        { id: 'all', label: 'allEvents', color: '#efecec' },
        { id: 'main', label: 'mainEvents', color: '#fed83f' },
        { id: 'side', label: 'sideEvents', color: '#3fcafe' },
        { id: 'achievement', label: 'achievementEvents', color: '#e5c48c' },
        { id: 'intimate', label: 'eroEvents', color: '#fe3fe5' }
    ]);
    function trajectoryClock() {
        const day = Number($gameSystem.day?.()), hour = Number($gameSystem.hour?.());
        const minute = Number($gameSystem.minute?.());
        const fraction = Number.isFinite(minute) ? Math.max(0, Math.min(59, minute)) / 60 : 0;
        return { day: Number.isFinite(day) ? Math.max(1, Math.floor(day)) : 1,
            hour: Number.isFinite(hour) ? Math.max(0, Math.min(24, hour + fraction)) : 0 };
    }
    function trajectoryCanRead(entry) {
        return typeof entry.detail === 'string' ? !!entry.detail.trim()
            : Array.isArray(entry.detail) && entry.detail.some(section => !!section.text.trim());
    }
    function trajectoryTime(entry) {
        if (entry.timeUnknown) return '--:--';
        const minutes = Math.round(entry.hour * 60);
        return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    }
    function trajectoryUnlockTime(entry) {
        return labels().unlockTime.replace(/%([12])/g, (_, index) =>
            index === '1' ? String(entry.day) : trajectoryTime(entry));
    }
    function trajectoryAchievementDate(record) {
        const game = record.gameDate;
        if (game && Number.isInteger(game.day) && game.day >= 1 &&
            Number.isInteger(game.hour) && game.hour >= 0 && game.hour < 24 &&
            Number.isInteger(game.minute) && game.minute >= 0 && game.minute < 60) {
            return { day: game.day, hour: game.hour + game.minute / 60 };
        }
        // SMO stores either its date object (hour/min strings) or date.now in
        // milliseconds. Preserve recorded local time when those fields survive.
        const real = record.date;
        if (real && /^\d{1,2}$/.test(String(real.hour)) && /^\d{1,2}$/.test(String(real.min)) &&
            Number(real.hour) < 24 && Number(real.min) < 60) {
            return { day: 1, hour: Number(real.hour) + Number(real.min) / 60 };
        }
        const timestamp = Number(typeof real === 'object' && real ? real.now : real);
        const date = new Date(timestamp);
        if (timestamp > 0 && Number.isFinite(date.getTime())) {
            return { day: 1, hour: date.getHours() + date.getMinutes() / 60 };
        }
        // Keep even undated unlocks visible; never invent an actual unlock time.
        return { day: 1, hour: 0, timeUnknown: true };
    }
    function trajectoryEventText(value, textWindow) {
        // Use the same engine/Drill conversion as the existing compendium windows
        // (including nested STR/variable references), with the card's own typography.
        return textWindow.convertEscapeCharacters(textLines(value))
            .replace(/\x1b(?:C|CC|OC|OW|FS|FN)\[[^\]]*\]/gi, '').replace(/\x1b[{}]/g, '');
    }
    function trajectoryAchievements(textWindow) {
        const am = window.SMO?.AM;
        if (!am || !Array.isArray(window.$dataAchievements)) return [];
        const records = am.DataDynamic.achievs || [];
        const byKey = new Map(records.filter(r => r?.key).map(r => [r.key, r]));
        const events = [];
        for (const achievement of $dataAchievements) {
            if (!achievement) continue;
            const key = am.getAchievementPersistKey(achievement, achievement.id);
            // Legacy keyless saves use the same positional fallback as SMO.
            const legacy = records[achievement.id - 1];
            const record = byKey.get(key) || (!legacy?.key ? legacy : null);
            if (!(record?.state > 0)) continue;
            const date = trajectoryAchievementDate(record);
            const localized = field => am.localizeAchievementFieldByKey(achievement.uniqueKey, '', field,
                field === 'Name' ? achievement._name : achievement._description);
            events.push({ id: key, ...date,
                category: 'achievement', title: trajectoryEventText(localized('Name'), textWindow),
                text: trajectoryEventText(localized('Description'), textWindow), image: null, detail: null });
        }
        return events.sort((a, b) => a.day - b.day || a.hour - b.hour || a.id.localeCompare(b.id));
    }
    const GALLERY_TRACE_CATEGORIES = new Map([
        ['mainEvents', 'main'], ['sideEvents', 'side'], ['eroEvents', 'intimate']
    ]);
    function trajectoryGalleryEvents(textWindow) {
        const model = window.ShiroinGallery?.model;
        if (!model) return [];
        const events = [];
        for (const entry of model._entries) {
            // 时间轴分类独立于画廊分组；未配置的 placeholder 条目沿用色色事件分类。
            const category = GALLERY_TRACE_CATEGORIES.get(entry.traceCategory ??
                (entry.category === 'placeholder' ? 'eroEvents' : null));
            if (!category) continue;
            // 轨迹属于当前周目，即使画廊启用全局共享，也只读取本存档的显示/锁定状态。
            const legacy = entry.index !== undefined;
            const id = legacy ? entry.index : `entry:${entry.key}`;
            const suffix = legacy ? 'Tank' : 'ByKey';
            const visible = $gameSystem[`_drill_SGaA_enable${suffix}`]?.[id] ?? entry.enabled;
            const locked = $gameSystem[`_drill_SGaA_lock${suffix}`]?.[id] ?? entry.locked;
            if (!visible || locked) continue;
            const variables = window.RecallStage?.getRecord(entry.key)?.variables;
            const day = variables?.[$gameSystem._day_variableId];
            const hour = variables?.[$gameSystem._hour_variableId];
            const minute = variables?.[$gameSystem._min_variableId];
            const dated = Number.isInteger(day) && day >= 1 &&
                Number.isInteger(hour) && hour >= 0 && hour < 24 &&
                Number.isInteger(minute) && minute >= 0 && minute < 60;
            const date = dated ? { day, hour: hour + minute / 60 } : { day: 1, hour: 0, timeUnknown: true };
            const description = window.itemsDescription?.[entry.name];
            const cover = typeof entry.cover === 'string' ? entry.cover.trim() : '';
            const listTitle = trajectoryEventText(description?.name ?? entry.name, textWindow);
            const recallTitle = trajectoryEventText(description?.recallEventName, textWindow);
            const subtitle = trajectoryEventText(description?.subtitle ?? entry.context, textWindow);
            // Details use drawTextEx: keep raw escapes until the window renders them.
            // Card conversion strips item colors and a second pass exposes Drill's csave.
            const detailSubtitle = textLines(description?.subtitle ?? entry.context);
            const condition = textLines(description?.unlockCondition);
            events.push({ id: entry.key, ...date, category,
                listTitle, title: recallTitle.trim() ? recallTitle : listTitle,
                text: subtitle,
                image: cover ? { folder: 'img/Menu__picturegallery/', filename: cover } : null,
                detail: condition.trim() ? [
                    { text: detailSubtitle }, { heading: labels().unlockCondition, text: condition }
                ] : null });
        }
        return events;
    }
    // 来源只生产数据，不操作窗口。注册不执行 prepare/read/watch，也不安装后台任务。
    const TraceSources = {
        sources: new Map(),
        register(id, source) {
            if (typeof id !== 'string' || !/^[a-z][a-z0-9_-]*$/.test(id) || this.sources.has(id)) {
                throw new Error(`[StandaloneCompendium] 无效或重复的轨迹来源：${id}`);
            }
            if (typeof source?.read !== 'function' ||
                (source.prepare != null && typeof source.prepare !== 'function') ||
                (source.watch != null && typeof source.watch !== 'function')) {
                throw new Error(`[StandaloneCompendium] 来源 ${id} 需要同步 read，可选 prepare/watch 必须是函数`);
            }
            this.sources.set(id, { read: source.read, prepare: source.prepare, watch: source.watch, revision: 0 });
        },
        invalidate(id) {
            const source = this.sources.get(id);
            if (!source) throw new Error(`[StandaloneCompendium] 未登记的轨迹来源：${id}`);
            source.revision++;
        },
        prepare() {
            for (const [id, source] of this.sources) {
                const result = source.prepare?.();
                if (result?.then) throw new Error(`[StandaloneCompendium] 来源 ${id} 的 prepare 必须同步完成`);
            }
        },
        signature() {
            const result = [];
            for (const [id, source] of this.sources) {
                const refs = source.watch ? source.watch() : [];
                if (!Array.isArray(refs)) throw new Error(`[StandaloneCompendium] 来源 ${id} 的 watch 必须返回引用/版本数组`);
                result.push(source, source.revision, refs.length, ...refs);
            }
            return result;
        },
        changed(previous) {
            const current = this.signature();
            return !previous || current.length !== previous.length || current.some((value, i) => value !== previous[i]);
        },
        read(textWindow) {
            const events = [];
            for (const [sourceId, source] of this.sources) {
                const records = source.read({ text: value => trajectoryEventText(value, textWindow) });
                if (!Array.isArray(records)) throw new Error(`[StandaloneCompendium] 来源 ${sourceId} 的 read 必须同步返回事件数组`);
                const ids = new Set();
                for (const record of records) {
                    const fail = message => { throw new Error(`[StandaloneCompendium] ${sourceId}:${record?.id ?? '?'} ${message}`); };
                    if (!record || typeof record.id !== 'string' || !record.id.trim() || ids.has(record.id)) fail('事件 id 为空或重复');
                    if (!TRACKS.some(track => track.id !== 'all' && track.id === record.category)) fail('事件分类无效');
                    if (!Number.isInteger(record.day) || record.day < 1 || !Number.isFinite(record.hour) || record.hour < 0 || record.hour >= 24) fail('游戏日期无效');
                    if (typeof record.title !== 'string' || typeof record.text !== 'string' ||
                        (record.listTitle != null && typeof record.listTitle !== 'string')) fail('文本必须为字符串');
                    const detail = record.detail;
                    if (detail != null && typeof detail !== 'string' &&
                        (!Array.isArray(detail) || detail.some(section => !section || typeof section.text !== 'string' ||
                            (section.heading != null && typeof section.heading !== 'string')))) fail('详情必须为字符串或包含 text 和可选 heading 的分段数组');
                    const image = record.image;
                    if (image != null && (typeof image !== 'object' || typeof image.folder !== 'string' ||
                        !image.folder.endsWith('/') || typeof image.filename !== 'string' || !image.filename.trim())) fail('图片需要 folder 和 filename');
                    ids.add(record.id);
                    events.push({ id: `${sourceId}:${record.id}`, day: record.day, hour: record.hour,
                        timeUnknown: record.timeUnknown === true, category: record.category,
                        title: record.title, listTitle: record.listTitle ?? record.title, text: record.text,
                        image: image ? { folder: image.folder, filename: image.filename } : null,
                        detail: Array.isArray(detail) ? detail.map(section => ({
                            text: section.text, heading: section.heading ?? ''
                        })) : detail ?? null });
                }
            }
            return events.sort((a, b) => a.day - b.day || a.hour - b.hour || a.id.localeCompare(b.id));
        }
    };
    TraceSources.register('achievement', {
        read: ({ text }) => trajectoryAchievements({ convertEscapeCharacters: text }),
        watch: () => [window.achievementsLocale, window.SMO?.AM.DataDynamic.achievs]
    });
    TraceSources.register('gallery', {
        prepare: () => window.ShiroinGallery?.settleUnlockConditions(),
        read: ({ text }) => trajectoryGalleryEvents({ convertEscapeCharacters: text }),
        watch: () => [window.itemsDescription, window.mapCommonEventDialogue, ConfigManager.language, window.$gameSystem?._recallStageRecords]
    });
    function trajectoryEvents(textWindow) { return TraceSources.read(textWindow); }
    function trajectoryLoadCover(target, source, onReady) {
        // 通用引擎图片加载；只拥有目标缩略图，不销毁共享原图。
        let released = false;
        const listener = () => {
            if (released) return;
            const height = target.width * source.height / source.width;
            if (target.height !== Math.ceil(height)) target.resize(target.width, Math.ceil(height));
            target.blt(source, 0, 0, source.width, source.height, 0, 0, target.width, height);
            onReady();
        };
        target.smooth = true;
        source.addLoadListener(listener);
        return () => {
            released = true;
            const index = source._loadListeners.indexOf(listener);
            if (index >= 0) source._loadListeners.splice(index, 1);
        };
    }
    function trajectoryCardLayout(entry, titleLines, bodyLines, imageHeight) {
        const titleY = 73 + (entry.image ? imageHeight + 16 : 0);
        const bodyY = titleY + titleLines.length * 32 + 10;
        const readMoreY = bodyY + bodyLines.length * 30 + 12;
        const bottom = trajectoryCanRead(entry) ? readMoreY + 32 : bodyY + bodyLines.length * 30;
        return { titleY, bodyY, readMoreY, height: Math.max(197, 97 + Math.ceil((bottom + 45 - 97) / 20) * 20) };
    }
    function trajectoryRows(cards) {
        const hours = [...new Set([0, 6, 12, 18, 24, ...cards.map(c => c.entry.hour)])].sort((a, b) => a - b);
        const rows = [];
        let y = 28;
        for (let i = 0; i < hours.length; i++) {
            const hour = hours[i], byDay = new Map();
            for (const card of cards.filter(c => c.entry.hour === hour)) {
                const offset = byDay.get(card.entry.day) || 0;
                card.y = y + offset;
                byDay.set(card.entry.day, offset + card.height + 20);
            }
            rows.push({ hour, y });
            const next = hours[i + 1];
            if (next !== undefined) y += Math.max((next - hour) * 36, ...byDay.values(), 60);
        }
        return { rows, height: y + 100 };
    }
    function trajectoryHourY(rows, hour) {
        for (let i = 1; i < rows.length; i++) {
            if (hour <= rows[i].hour) {
                const a = rows[i - 1], b = rows[i];
                return a.y + (b.y - a.y) * (hour - a.hour) / (b.hour - a.hour);
            }
        }
        return rows[rows.length - 1].y;
    }
    function trajectoryWrap(bitmap, text, width) {
        const lines = [];
        // Match the gallery cards: keep Latin words (including combining marks
        // and apostrophe/hyphen connectors) intact whenever the word can fit.
        for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
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

    class Window_CompendiumEventDetail extends Window_CompendiumBody {
        resetFontSettings() { super.resetFontSettings(); this.contents.fontSize = 26; }
        resetTextColor() { this.changeTextColor('#dedbd2'); }
        createContents() { super.createContents(); this.contents.smooth = true; }
        setText(detail, image = null) {
            this._detailText = detail;
            this._detailImage = image;
            const hasImage = image && image.isReady() && image.width > 0 && image.height > 0;
            if (typeof detail === 'string' && !hasImage) { super.setText(detail); return; }
            this.origin.y = 0;
            this._drill_DFF_activeFont = null;
            const sections = typeof detail === 'string' ? [detail]
                : detail.map(section => [section.heading, section.text].filter(Boolean).join('\n'));
            const heights = sections.map(text => Math.ceil(this.textSizeEx(text).height));
            const gap = 48;
            const width = this.innerWidth - 12;
            const imageWidth = hasImage ? Math.min(width, image.width) : 0;
            const imageHeight = hasImage ? Math.round(imageWidth * image.height / image.width) : 0;
            const textTop = hasImage ? imageHeight + 24 : 0;
            this._textHeight = textTop + heights.reduce((sum, height) => sum + height, 0) + Math.max(0, sections.length - 1) * gap;
            this.createContents();
            if (hasImage) this.contents.blt(image, 0, 0, image.width, image.height,
                Math.round((width - imageWidth) / 2), 0, imageWidth, imageHeight);
            const half = width / 2;
            let y = textTop;
            sections.forEach((text, index) => {
                if (index > 0) {
                    // 分割线与正文共用内容位图，随阅读滚动；两端透明，中心为白色。
                    const lineY = y + gap / 2 - 1;
                    this.contents.gradientFillRect(0, lineY, half, 2, 'rgba(255,255,255,0)', '#ffffff');
                    this.contents.gradientFillRect(half, lineY, half, 2, '#ffffff', 'rgba(255,255,255,0)');
                    y += gap;
                }
                this.drawTextEx(text, 0, y, width);
                y += heights[index];
            });
            this._scrollMax = Math.max(0, this._textHeight - this.innerHeight);
        }
        refreshImage() {
            const scrollY = this.origin.y;
            this.setText(this._detailText, this._detailImage);
            this.origin.y = Math.min(scrollY, this._scrollMax);
        }
        // Reading is user-controlled; do not inherit the list detail's auto-scroll.
        update() { Window_Base.prototype.update.call(this); }
    }

    class CompendiumTrajectory {
        constructor(scene) {
            this.scene = scene;
            this.layer = new Sprite();
            scene._root.addChild(this.layer);
            this.layer.visible = false;
            this.filter = 'all';
            this.selectedDay = null;
            this.expandedTrack = null;
            this.sidebarScroll = 0;
            this.focusedEventId = null;
            this.zoom = 1;
            this.panX = 0;
            this.panY = 0;
            this.clock = trajectoryClock();
            this.events = [];
            this.sourceSignature = null;
            this.days = this.clock.day;
            this.bitmaps = [];
            this.cards = [];
            this.hoverGlow = new PIXI.filters.GlowFilter({
                distance: 12, outerStrength: 1.5, innerStrength: 0, color: 0xf3cd4a, quality: 1, knockout: true
            });
            this.dayGlow = new PIXI.filters.GlowFilter({
                distance: 12, outerStrength: 1.5, innerStrength: 0, color: 0xf3cd4a, quality: 1
            });
            this.daySymbolGlow = new PIXI.filters.GlowFilter({
                distance: 4, outerStrength: 0.2, innerStrength: 0, color: 0xf3cd4a, quality: 1
            });
            this.createChrome();
        }
        bitmap(width, height) {
            const b = new Bitmap(width, height);
            b.fontFace = $gameSystem.mainFontFace();
            b.fontSize = 22;
            b.textColor = '#eee5d7';
            b.outlineWidth = 0;
            this.bitmaps.push(b);
            return b;
        }
        add(bitmap, x, y, parent = this.layer) {
            const sprite = new Sprite(bitmap);
            sprite.move(x, y);
            parent.addChild(sprite);
            return sprite;
        }
        createChrome() {
            // One fixed, lighter nine-slice panel beneath the sidebar and timeline.
            const panel = TRAJECTORY_PANEL;
            this.background = this.createFrame(this.layer, panel.width, panel.height);
            this.background.move(panel.x, panel.y);
            this.background.opacity = panel.opacity;
            const b = this.bitmap(1620, 860);
            trajectoryDivider(b, TS.x + TS.width - 80, 32, 780, true);
            b.fontSize = 36;
            this.add(b, 80, 112);
            const titleBitmap = ImageManager.loadSystem('collectionScene_trace_title');
            titleBitmap.smooth = true;
            this.titleImage = this.add(titleBitmap, 100, 108);
            this.sidebar = this.add(this.bitmap(TS.width, TS.height), TS.x, TS.y);
            this.axes = this.add(this.bitmap(TL.width, TL.height), TL.x, TL.y);
            this.axes.bitmap.smooth = true;
            this.createDayLayer();
            this.world = this.add(null, TL.x + TL.insetX, TL.y + TL.insetY);
            // A fixed viewport alpha mask reveals the map beneath the edges;
            // it is not a dark overlay and never moves/scales with the cards.
            this.mask = this.add(this.createFadeBitmap(TL.width, TL.height - TL.insetY),
                TL.x, TL.y + TL.insetY);
            this.world.mask = this.mask;
            this.nodes = this.add(null, 0, 0, this.world);
            this.eventStar = ImageManager.loadSystem('collectionScene_event');
            this.eventStar.smooth = true;
            this.controls = [
                // 暂停提供定位按钮；恢复以下配置即可重新显示并启用点击。
                // { id: 'firstDay', x: 1464, y: 908, width: 88, height: 72, image: 'collectionScene_firstDay' },
                // { id: 'today', x: 1564, y: 908, width: 120, height: 72, image: 'collectionScene_today' }
            ];
            for (const control of this.controls) {
                const bitmap = ImageManager.loadSystem(control.image);
                bitmap.smooth = true;
                control.sprite = this.add(bitmap, control.x + control.width / 2, control.y + control.height / 2);
                control.sprite.anchor.set(0.5);
                control.sprite.roundPixels = false;
            }
            this.createEdgeArrows();
            this.createOperationHint();
        }
        createDayLayer() {
            // Draw one opaque, antialiased circle; selection opacity belongs to
            // the sprite so the glow filter receives an opaque source when selected.
            const resolution = 3, size = 132;
            this.dayCircle = this.bitmap(size * resolution, size * resolution);
            this.dayCircle.smooth = true;
            const c = this.dayCircle.context;
            c.save(); c.scale(resolution, resolution);
            c.beginPath(); c.arc(size / 2, size / 2, 62, 0, Math.PI * 2);
            c.fillStyle = '#242626'; c.fill();
            c.lineWidth = 4; c.strokeStyle = '#a99a7a'; c.stroke();
            c.restore(); this.dayCircle.baseTexture.update();
            this.daySymbol = ImageManager.loadSystem('collectionScene_day');
            this.daySymbol.smooth = true;
            this.dayLine = this.bitmap(2, TL.height - 64);
            this.dayLine.smooth = true;
            // The circle needs a visible connection at the top, not the old
            // star's transparent tip. Fade only the lower half of the stem.
            const half = this.dayLine.height / 2;
            this.dayLine.fillRect(0, 0, 2, half, 'rgba(169,154,122,0.55)');
            this.dayLine.gradientFillRect(0, half, 2, half,
                'rgba(169,154,122,0.55)', 'rgba(169,154,122,0)', true);
            this.dayLayer = this.add(null, TL.x, TL.y);
            // Leave room for the circle and its glow above the horizontal axis.
            this.dayMask = this.add(this.createFadeBitmap(TL.width, TL.height + 96), TL.x, TL.y - 96);
            this.dayLayer.mask = this.dayMask;
            this.dayMarkers = [];
        }
        dayRadius(day) { return (day === this.clock.day ? 104 : 84) * 0.66 * 0.9 * 0.8; }
        dayX(day) { return TL.insetX + this.panX + ((day - 1) * TL.dayWidth + 28) * this.zoom; }
        createDayMarker() {
            const holder = this.add(null, 0, 0, this.dayLayer);
            holder.visible = false;
            const highlight = this.add(null, 0, 0, holder);
            const line = this.add(this.dayLine, -1, 64, highlight);
            line.roundPixels = false;
            const circle = this.add(this.dayCircle, 0, 64, highlight);
            circle.anchor.set(0.5);
            circle.alpha = 0.5;
            circle.roundPixels = false;
            // Keep the supplied day ornament above the ring but below the number.
            // Filter it separately: the filled circle would hide its glow silhouette.
            const symbol = this.add(this.daySymbol, 0, 64, holder);
            symbol.anchor.set(0.5);
            symbol.roundPixels = false;
            const label = this.add(this.bitmap(104, 48), -52, 40, holder);
            label.bitmap.smooth = true;
            label.bitmap.fontSize = 24;
            label.bitmap.textColor = '#dfc849';
            // Canvas 描边居中，填色覆盖内侧一半；2px 对应约 1px 外描边。
            label.bitmap.outlineWidth = 4;
            label.bitmap.outlineColor = '#9f7a6e';
            const marker = { holder, highlight, line, circle, symbol, label, day: null };
            this.dayMarkers.push(marker);
            return marker;
        }
        renderDays(first, last) {
            // This viewport-sized pool shares a generated bitmap, with no image load.
            if (!this.dayMarkers.length) {
                const count = Math.ceil(TL.width / (TL.dayWidth * TL.minZoom)) + 2;
                for (let i = 0; i < count; i++) this.createDayMarker();
            }
            let index = 0;
            for (let day = first; day <= last; day++) {
                const x = this.dayX(day), radius = this.dayRadius(day);
                if (x + radius < 0 || x - radius > TL.width) continue;
                const marker = this.dayMarkers[index++] || this.createDayMarker();
                marker.holder.visible = true;
                marker.holder.move(x, 0);
                // The bitmap's outer circle radius is 64 * 3 raster pixels.
                marker.circle.scale.set(radius / 192);
                // Preserve the ornament size while reducing the surrounding circle.
                marker.symbol.scale.set(radius * 2 / 0.8 / DAY_SYMBOL_SIZE);
                const selected = day === this.selectedDay;
                marker.circle.alpha = selected ? 1 : 0.5;
                marker.symbol.filters = selected ? [this.daySymbolGlow] : null;
                // Overlap just the outer border by one design pixel so the
                // antialiased circle edge cannot leave a subpixel gap.
                marker.line.move(-1, 64 + radius - 1);
                marker.line.setFrame(0, radius, 2, this.dayLine.height - radius);
                marker.highlight.filters = selected ? [this.dayGlow] : null;
                if (marker.day !== day) {
                    marker.label.bitmap.clear();
                    marker.label.bitmap.drawText(String(day), 0, 0, 104, 48, 'center');
                    marker.day = day;
                }
            }
            for (; index < this.dayMarkers.length; index++) {
                this.dayMarkers[index].holder.visible = false;
                this.dayMarkers[index].highlight.filters = null;
                this.dayMarkers[index].symbol.filters = null;
            }
        }
        dayAt(point) {
            if (!new Rectangle(TL.x, TL.y - 96, TL.width, TL.height + 96).contains(point.x, point.y)) return null;
            const worldX = (point.x - TL.x - TL.insetX - this.panX) / this.zoom;
            const day = Math.round((worldX - 28) / TL.dayWidth) + 1;
            if (day < 1 || day > this.days) return null;
            const radius = this.dayRadius(day) / 0.8; // Include the ornament's tips in the hit area.
            return Math.abs(point.x - TL.x - this.dayX(day)) <= radius &&
                Math.abs(point.y - TL.y - 64) <= radius ? day : null;
        }
        dayEvents() { return this.events.filter(entry => this.selectedDay == null || entry.day === this.selectedDay); }
        toggleDay(day) {
            if (!Number.isInteger(day) || day < 1 || day > this.days) return;
            const oldY = trajectoryHourY(this.rows, 8);
            this.selectedDay = this.selectedDay === day ? null : day;
            this.sidebarScroll = 0;
            this.focusedEventId = null;
            this.rebuild();
            this.panY += (oldY - trajectoryHourY(this.rows, 8)) * this.zoom;
        }
        createEdgeArrows() {
            const b = this.bitmap(192, 192), c = b.context;
            b.smooth = true;
            c.save(); c.scale(3, 3);
            c.strokeStyle = '#ffffff'; c.lineWidth = 5;
            c.lineCap = 'round'; c.lineJoin = 'round';
            c.beginPath(); c.moveTo(24, 12); c.lineTo(44, 32); c.lineTo(24, 52); c.stroke();
            c.restore(); b.baseTexture.update();
            const centerX = TL.x + TL.width / 2, centerY = TL.y + TL.height / 2;
            this.edgeArrows = [
                { id: 'left', dx: -1, dy: 0, x: TL.x - 36, y: centerY },
                { id: 'right', dx: 1, dy: 0, x: TL.x + TL.width + 26, y: centerY },
                { id: 'up', dx: 0, dy: -1, x: centerX, y: TL.y },
                { id: 'down', dx: 0, dy: 1, x: centerX, y: TL.y + TL.height + 28 }
            ];
            for (const arrow of this.edgeArrows) {
                arrow.sprite = this.add(b, arrow.x, arrow.y);
                arrow.sprite.alpha = 0.6;
                arrow.sprite.anchor.set(0.5);
                arrow.sprite.scale.set(1 / 3);
                arrow.sprite.rotation = Math.atan2(arrow.dy, arrow.dx);
                arrow.sprite.roundPixels = false;
                arrow.sprite.visible = false;
            }
            this.arrowUpdatedAt = null;
        }
        overflowDirections() {
            // Test content against the opaque interior of the fade mask, not
            // merely the pan limits: empty hours must not advertise more events.
            const z = this.zoom, fade = TL.edgeFade, epsilon = 0.5;
            const firstRadius = this.dayRadius(1);
            const lastRadius = this.dayRadius(this.days);
            const left = TL.insetX + this.panX + 28 * z - firstRadius;
            const right = Math.max(
                TL.insetX + this.panX + ((this.days - 1) * TL.dayWidth + 28) * z + lastRadius,
                ...this.cards.map(card => TL.insetX + this.panX + (card.sprite.x + TL.cardWidth) * z));
            return {
                left: this.panX < -epsilon && left < fade - epsilon,
                right: right > TL.width - fade + epsilon,
                up: this.panY < -epsilon && this.cards.some(card => this.panY + card.y * z < fade - epsilon),
                down: this.cards.some(card => this.panY + (card.y + card.height) * z > TL.height - TL.insetY - fade + epsilon)
            };
        }
        arrowAt(point) {
            // Keep the hit area still while the glyph floats, including its
            // enlarged size, so hovering never oscillates on/off by itself.
            return point && this.edgeArrows.find(arrow => arrow.sprite.visible &&
                Math.abs(point.x - arrow.x) <= 32 && Math.abs(point.y - arrow.y) <= 32);
        }
        updateEdgeArrows() {
            const now = performance.now();
            const elapsed = this.arrowUpdatedAt == null ? 0 : Math.min(50, now - this.arrowUpdatedAt);
            this.arrowUpdatedAt = now;
            let overflow = this.overflowDirections();
            for (const arrow of this.edgeArrows) arrow.sprite.visible = overflow[arrow.id];
            const gesture = this.scene._gesture;
            const enabled = this.acceptsInput() && !this.detail &&
                (!gesture || (!gesture.dragged && gesture.hit.startsWith('arrow:')));
            const point = this.touchOwned ? this.touchArrowPoint : this.mousePoint;
            const hovered = enabled && this.arrowAt(point);
            if (hovered && elapsed > 0) {
                const distance = 420 * elapsed / 1000;
                this.pan(-hovered.dx * distance, -hovered.dy * distance);
                this.render();
                overflow = this.overflowDirections();
            }
            const offset = Math.sin(now * Math.PI * 2 / 1400) * 6;
            for (const arrow of this.edgeArrows) {
                arrow.sprite.visible = overflow[arrow.id];
                arrow.sprite.move(arrow.x + arrow.dx * offset, arrow.y + arrow.dy * offset);
                arrow.sprite.scale.set((arrow === hovered ? 1.22 : 1) / 3);
            }
        }
        createOperationHint() {
            const b = this.bitmap(1200, 50);
            b.fontFace = $gameSystem.mainFontFace();
            b.fontSize = 25; b.fontBold = false; b.fontItalic = false;
            b.textColor = '#ffffff';
            b.outlineColor = this.scene._body.contents.outlineColor;
            b.outlineWidth = this.scene._body.contents.outlineWidth;
            b.drawText(labels().traceControls, 8, 8, b.width - 16, 34, 'center');
            this.hintSprite = this.add(b, (L.width - b.width) / 2, L.height - b.height - 24);
            this.hintSprite.interactive = false;
            this.hintSprite.interactiveChildren = false;
            this.hintGlow = new PIXI.filters.GlowFilter({
                distance: 6, outerStrength: 3, innerStrength: 0, color: 0x000000, quality: 0.2
            });
            this.hintSprite.filters = [this.hintGlow];
            this.hintSprite.visible = false;
            this.hintSprite.alpha = 0;
            this.hintStartedAt = null;
        }
        updateOperationHint() {
            const now = performance.now();
            if (this.hintStartedAt == null) this.hintStartedAt = now;
            const elapsed = Math.max(0, now - this.hintStartedAt);
            this.hintSprite.visible = elapsed < OPERATION_HINT_END_MS;
            this.hintSprite.alpha = this.hintSprite.visible
                ? 0.5 - 0.5 * Math.cos(elapsed * Math.PI * 2 / HINT_BLINK_MS) : 0;
        }
        createFadeBitmap(width, height) {
            const b = this.bitmap(width, height);
            b.smooth = true;
            b.fillAll('#ffffff');
            this.fadeEdges(b);
            return b;
        }
        fadeEdges(b) {
            const c = b.context, width = b.width, height = b.height;
            const gradient = (vertical, size) => {
                const g = c.createLinearGradient(0, 0, vertical ? 0 : size, vertical ? size : 0);
                g.addColorStop(0, 'rgba(255,255,255,0)');
                g.addColorStop(TL.edgeFade / size, '#ffffff');
                g.addColorStop(1 - TL.edgeFade / size, '#ffffff');
                g.addColorStop(1, 'rgba(255,255,255,0)');
                return g;
            };
            c.save();
            c.globalCompositeOperation = 'destination-in';
            c.fillStyle = gradient(false, width); c.fillRect(0, 0, width, height);
            c.fillStyle = gradient(true, height); c.fillRect(0, 0, width, height);
            c.restore(); b.baseTexture.update();
        }
        createFrame(parent, width, height) {
            const frame = this.add(null, 0, 0, parent);
            const xs = [0, 49, width - 50], ys = [0, 48, height - 49];
            const widths = [49, width - 99, 50], heights = [48, height - 97, 49];
            for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
                const source = ImageManager.loadBitmap('img/system/Saikey_HoverWindow/', 'nine/' + row + col);
                // These edges are constant along their extension axis, and the
                // centre is uniform. Stretching preserves the supplied skin
                // while all nine parts use the same Sprite vertex/sampling path.
                // Mixing Sprite corners with TilingSprite edges can open seams
                // at fractional pan/zoom positions even with roundPixels=false.
                const part = new Sprite(source);
                part.roundPixels = false;
                frame.addChild(part);
                part.move(xs[col], ys[row]);
                source.addLoadListener(() => {
                    if (part._destroyed) return;
                    part.scale.set(widths[col] / source.width, heights[row] / source.height);
                });
            }
            return frame;
        }
        createNode(x, y) {
            // Share one antialiased, hollow white ring across all events.
            const resolution = 3, size = 28;
            if (!this.eventRing) {
                const b = this.eventRing = this.bitmap(size * resolution, size * resolution);
                b.smooth = true;
                const c = b.context;
                c.save(); c.scale(resolution, resolution);
                c.beginPath(); c.arc(size / 2, size / 2, 10, 0, Math.PI * 2);
                c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,0.3)'; c.stroke();
                c.restore(); b.baseTexture.update();
            }
            const node = this.add(null, x, y, this.nodes);
            node.roundPixels = false;
            const ring = this.add(this.eventRing, 0, 0, node);
            ring.anchor.set(0.5);
            ring.scale.set(1 / resolution);
            ring.roundPixels = false;
            // Draw the supplied glow above the ring at its original size.
            // The common world container applies timeline zoom to both layers.
            const star = this.add(this.eventStar, 0, 0, node);
            star.anchor.set(0.5);
            star.scale.set(1.0);
            star.roundPixels = false;
            return node;
        }
        createCard(entry) {
            const coverSource = entry.image ? ImageManager.loadBitmap(entry.image.folder, entry.image.filename) : null;
            const imageHeight = coverSource?.isReady()
                ? Math.ceil(TL.imageWidth * coverSource.height / coverSource.width) : TL.imageHeight;
            const measure = this.bitmap(1, 1);
            measure.fontSize = 24;
            const titleLines = trajectoryWrap(measure, entry.title, TL.imageWidth);
            measure.fontSize = 21;
            const bodyLines = trajectoryWrap(measure, entry.text, TL.imageWidth);
            const geometry = trajectoryCardLayout(entry, titleLines, bodyLines, imageHeight);
            const { height } = geometry;
            const sprite = new Sprite();
            this.world.addChild(sprite);
            let glow = null;
            if (trajectoryCanRead(entry)) {
                // The skin is translucent: filtering it directly would tint its
                // interior. An opaque silhouette with knockout emits only the rim.
                glow = new PIXI.Graphics();
                glow.beginFill(0xffffff).drawRoundedRect(15, 15, TL.cardWidth - 30, height - 30, 20).endFill();
                glow.visible = false;
                sprite.addChild(glow);
            }
            const frame = this.createFrame(sprite, TL.cardWidth, height);
            const color = TRACKS.find(t => t.id === entry.category).color;
            let imageBitmap = null;
            let imageSprite = null;
            if (coverSource) {
                imageBitmap = this.bitmap(TL.imageWidth, imageHeight);
                imageSprite = this.add(imageBitmap, 45, 73, sprite);
            }
            const textBitmap = this.bitmap(1, 1);
            // The project's dynamic images default to NEAREST; opt in only this text.
            textBitmap.smooth = true;
            const textSprite = this.add(textBitmap, 0, 0, sprite);
            textSprite.roundPixels = true;
            // Measurement bitmap has no scene lifetime or GPU ownership.
            this.bitmaps.splice(this.bitmaps.indexOf(measure), 1); measure.destroy();
            const card = { entry, sprite, frame, glow, coverSource, imageBitmap, imageSprite, textBitmap, textSprite,
                titleLines, bodyLines, ...geometry, color, y: 0, textScale: 0 };
            if (coverSource) card.releaseImage = trajectoryLoadCover(imageBitmap, coverSource, () => this.resizeCardImage(card));
            return card;
        }
        resizeCardImage(card) {
            if (this.detail?.card === card) this.detail.body.refreshImage();
            card.imageSprite.setFrame(0, 0, card.imageBitmap.width, card.imageBitmap.height);
            const geometry = trajectoryCardLayout(card.entry, card.titleLines, card.bodyLines, card.imageBitmap.height);
            if (geometry.titleY === card.titleY) return;
            const heightChanged = geometry.height !== card.height;
            Object.assign(card, geometry);
            card.textScale = 0;
            if (heightChanged) {
                card.sprite.removeChild(card.frame);
                card.frame.destroy({ children: true });
                card.frame = this.createFrame(card.sprite, TL.cardWidth, card.height);
                card.sprite.addChildAt(card.frame, card.glow ? 1 : 0);
                card.glow?.clear().beginFill(0xffffff).drawRoundedRect(15, 15, TL.cardWidth - 30, card.height - 30, 20).endFill();
            }
            // 缓存命中时卡片尚在构造；异步完成时只调整已有卡片和节点的位置。
            if (this.cards.includes(card)) this.layoutCards();
        }
        textRasterScale() {
            // Include the scene's design-size adaptation and the render target's
            // resolution, so each text texel maps to one renderer pixel.
            return this.zoom * this.scene._root.scale.x * (Graphics.app?.renderer.resolution || 1);
        }
        refreshCardText(card, scale) {
            if (card.textScale === scale) return;
            const b = card.textBitmap;
            const width = Math.ceil(TL.cardWidth * scale), height = Math.ceil(card.height * scale);
            if (b.width !== width || b.height !== height) b.resize(width, height);
            else b.clear();
            const draw = (text, size, color, x, y, lineHeight) => {
                // Change the font itself, not the canvas transform or a finished
                // text bitmap. Preserve logical wrapping and card height while zooming.
                b.fontSize = size * scale;
                b.textColor = color;
                b.drawText(text, Math.round(x * scale), Math.round(y * scale),
                    TL.imageWidth * scale, lineHeight * scale, 'left');
            };
            draw(`${trajectoryTime(card.entry)}  ·  ${labels()[TRACKS.find(t => t.id === card.entry.category).label]}`,
                17, card.color, 45, 39, 28);
            card.titleLines.forEach((line, i) => draw(line, 24, '#f2e8d8', 45, card.titleY + i * 32, 32));
            card.bodyLines.forEach((line, i) => draw(line, 21, '#c4c6c5', 45, card.bodyY + i * 30, 30));
            if (trajectoryCanRead(card.entry)) draw(labels().readMore + ' →', 22, '#e5b67b', 45, card.readMoreY, 32);
            // Cancel the ancestor scaling for the freshly rendered text only.
            // Bitmap.resize does not update Sprite's frame automatically.
            card.textSprite.scale.set(1 / scale);
            card.textSprite.setFrame(0, 0, width, height);
            card.textScale = scale;
        }
        rebuild() {
            this.closeDetail(false);
            this.setHoveredCard(null);
            for (const card of this.cards) {
                card.releaseImage?.();
                card.sprite.destroy({ children: true });
                for (const bitmap of [card.imageBitmap, card.textBitmap].filter(Boolean)) {
                    this.bitmaps.splice(this.bitmaps.indexOf(bitmap), 1);
                    bitmap.destroy();
                }
            }
            this.nodes.removeChildren().forEach(node => node.destroy());
            this.cards = this.dayEvents().filter(e => this.filter === 'all' || e.category === this.filter).map(e => this.createCard(e));
            this.layoutCards();
            this.refreshSidebar();
        }
        layoutCards() {
            const layout = trajectoryRows(this.cards);
            this.rows = layout.rows;
            this.contentHeight = layout.height;
            for (const card of this.cards) {
                const x = (card.entry.day - 1) * TL.dayWidth + 58;
                card.sprite.move(x, card.y);
                if (card.node) card.node.move(x - 30, card.y + 18);
                else card.node = this.createNode(x - 30, card.y + 18);
            }
            this.dirty = true;
        }
        refreshSidebar() {
            const b = this.sidebar.bitmap;
            const text = labels();
            b.clear();
            this.sidebarHeaders = [];
            this.sidebarList = null;
            const events = this.dayEvents();
            let y = 0;
            for (const track of TRACKS) {
                const active = this.filter === track.id, expanded = this.expandedTrack === track.id;
                const entries = events.filter(e => track.id === 'all' || e.category === track.id);
                this.sidebarHeaders.push({ id: track.id, y });
                if (active) b.fillRect(0, y, 3, TS.headerHeight, track.color);
                b.textColor = active ? track.color : '#b8babc'; b.fontSize = 18;
                if (track.id !== 'all') b.drawText(expanded ? '▾' : '▸', 9, y, 20, TS.headerHeight);
                b.fontSize = 24;
                b.drawText(text[track.label], 32, y, TS.width - 80, TS.headerHeight);
                b.fontSize = 18;
                b.drawText(String(entries.length), TS.width - 42, y, 30, TS.headerHeight, 'right');
                y += TS.headerHeight;
                if (expanded) {
                    const height = Math.min(TS.listHeight, TS.height - TRACKS.length * (TS.headerHeight + TS.gap), entries.length * TS.rowHeight);
                    this.sidebarList = { y, height, entries };
                    this.sidebarScroll = Math.max(0, Math.min(this.sidebarScroll, entries.length * TS.rowHeight - height));
                    const c = b.context;
                    c.save(); c.beginPath(); c.rect(0, y, TS.width, height); c.clip();
                    entries.forEach((entry, index) => {
                        const rowY = y + index * TS.rowHeight - this.sidebarScroll;
                        if (rowY + TS.rowHeight <= y || rowY >= y + height) return;
                        const selected = entry.id === this.focusedEventId;
                        if (selected) b.fillRect(13, rowY + 10, 2, 42, track.color);
                        b.fontSize = 20; b.textColor = selected ? track.color : '#dedbd2';
                        const listTitle = entry.listTitle ?? entry.title;
                        let title = listTitle;
                        const textWidth = TS.width - 44;
                        while (title && b.measureTextWidth(title) > textWidth) title = title.slice(0, -1);
                        if (title !== listTitle) {
                            while (title && b.measureTextWidth(title + '…') > textWidth) title = title.slice(0, -1);
                            title += '…';
                        }
                        b.drawText(title, 24, rowY + 5, textWidth, 30);
                        b.fontSize = 16; b.textColor = '#ad9c81';
                        b.drawText(trajectoryUnlockTime(entry), 24, rowY + 34, textWidth, 24);
                    });
                    c.restore();
                    const fullHeight = entries.length * TS.rowHeight;
                    if (fullHeight > height) {
                        const thumb = Math.max(24, height * height / fullHeight);
                        b.fillRect(TS.width - 4, y, 2, height, 'rgba(255,255,255,0.20)');
                        b.fillRect(TS.width - 4, y + (height - thumb) * this.sidebarScroll / (fullHeight - height), 2, thumb, track.color);
                    }
                    y += height;
                }
                y += TS.gap;
            }
        }
        sidebarListAt(point) {
            const list = this.sidebarList;
            return !!list && new Rectangle(TS.x, TS.y + list.y, TS.width, list.height).contains(point.x, point.y);
        }
        scrollSidebar(delta) {
            const list = this.sidebarList;
            if (!list) return;
            const next = Math.max(0, Math.min(this.sidebarScroll + delta, list.entries.length * TS.rowHeight - list.height));
            if (next !== this.sidebarScroll) { this.sidebarScroll = next; this.refreshSidebar(); }
        }
        focusEvent(id) {
            const card = this.cards.find(c => String(c.entry.id) === String(id));
            if (!card) return;
            const width = TL.width - TL.insetX, height = TL.height - TL.insetY;
            this.panX = width / 2 - (card.sprite.x + TL.cardWidth / 2) * this.zoom;
            this.panY = Math.max(TL.edgeFade + 8, (height - card.height * this.zoom) / 2) - card.y * this.zoom;
            this.focusedEventId = card.entry.id;
            this.clampView(); this.refreshSidebar(); this.dirty = true;
        }
        clampView() {
            this.panX = Math.max(Math.min(0, TL.width - TL.insetX - this.days * TL.dayWidth * this.zoom - TL.edgeFade), Math.min(0, this.panX));
            this.panY = Math.max(Math.min(0, TL.height - TL.insetY - this.contentHeight * this.zoom), Math.min(0, this.panY));
        }
        resetView() {
            this.zoom = 1;
            const first = this.dayEvents().find(e => this.filter === 'all' || e.category === this.filter);
            this.panX = first ? -(first.day - 1) * TL.dayWidth : 0;
            this.panY = -Math.max(0, trajectoryHourY(this.rows, first?.hour ?? 8) - TL.edgeFade - 8);
            this.dirty = true;
        }
        focusToday() {
            this.panX = -(this.clock.day - 1) * TL.dayWidth * this.zoom;
            this.panY = -trajectoryHourY(this.rows, this.clock.hour) * this.zoom + 80;
            this.dirty = true;
        }
        focusFirstDay() {
            const first = this.dayEvents().find(e => e.day === 1 && (this.filter === 'all' || e.category === this.filter));
            this.panX = 0;
            this.panY = -trajectoryHourY(this.rows, first?.hour ?? 8) * this.zoom + TL.edgeFade + 8;
            this.dirty = true;
        }
        zoomAt(value, x, y) {
            const next = Math.max(TL.minZoom, Math.min(TL.maxZoom, value));
            this.panX = x - (x - this.panX) * next / this.zoom;
            this.panY = y - (y - this.panY) * next / this.zoom;
            this.zoom = next; this.dirty = true;
        }
        pan(dx, dy) { this.panX += dx; this.panY += dy; this.dirty = true; }
        hit(point) {
            const arrow = this.arrowAt(point);
            if (arrow) return 'arrow:' + arrow.id;
            const day = this.dayAt(point);
            if (day !== null) return 'day:' + day;
            if (new Rectangle(TL.x, TL.y, TL.width, TL.height).contains(point.x, point.y)) return 'track';
            for (const header of this.sidebarHeaders) {
                if (new Rectangle(TS.x, TS.y + header.y, TS.width, TS.headerHeight).contains(point.x, point.y)) return header.id;
            }
            if (this.sidebarListAt(point)) {
                const index = Math.floor((point.y - TS.y - this.sidebarList.y + this.sidebarScroll) / TS.rowHeight);
                const entry = this.sidebarList.entries[index];
                return entry ? 'event:' + entry.id : 'events';
            }
            for (const c of this.controls) if (new Rectangle(c.x, c.y, c.width, c.height).contains(point.x, point.y)) return c.id;
            return '';
        }
        activateControl(id) {
            if (TRACKS.some(t => t.id === id)) {
                this.expandedTrack = id === 'all' || this.expandedTrack === id ? null : id;
                this.sidebarScroll = 0;
                const previousDay = this.selectedDay;
                if (id === 'all') this.selectedDay = null;
                if (this.filter !== id || this.selectedDay !== previousDay) {
                    const oldY = trajectoryHourY(this.rows, 8);
                    this.filter = id; this.focusedEventId = null; this.rebuild();
                    this.panY += (oldY - trajectoryHourY(this.rows, 8)) * this.zoom;
                } else this.refreshSidebar();
            } else if (id.startsWith('day:')) this.toggleDay(Number(id.slice(4)));
            else if (id.startsWith('event:')) this.focusEvent(id.slice(6));
            else if (id === 'firstDay') this.focusFirstDay();
            else if (id === 'today') this.focusToday();
            else return;
            SoundManager.playCursor(); this.dirty = true;
        }
        render() {
            this.clampView();
            this.world.scale.set(this.zoom);
            this.world.move(TL.x + TL.insetX + this.panX, TL.y + TL.insetY + this.panY);
            const b = this.axes.bitmap, z = this.zoom, w = TL.width, h = TL.height;
            b.clear();
            const axisY = 64;
            const first = Math.max(1, Math.floor(-this.panX / (TL.dayWidth * z)));
            const last = Math.min(this.days, Math.ceil((w - TL.insetX - this.panX) / (TL.dayWidth * z)) + 1);
            // Connect circle borders with matching, constant-alpha outline color. Only
            // the viewport mask fades them; there is no fade at each circle.
            for (let day = Math.max(0, first - 1); day <= last; day++) {
                const start = this.dayX(day) + this.dayRadius(day) - 1;
                const end = this.dayX(day + 1) - this.dayRadius(day + 1) + 1;
                b.fillRect(start, axisY - 1, end - start, 2, 'rgba(169,154,122,0.55)');
            }
            this.renderDays(first, last);
            this.fadeEdges(b);
            const textScale = this.textRasterScale();
            for (const card of this.cards) {
                const x = this.panX + card.sprite.x * z, y = this.panY + card.y * z;
                card.sprite.visible = x + TL.cardWidth * z >= 0 && x < w - TL.insetX &&
                    y + card.height * z >= 0 && y < h - TL.insetY;
                if (card.sprite.visible) this.refreshCardText(card, textScale);
            }
            this._renderedTextScale = textScale;
            this.dirty = false;
        }
        refreshEvents() {
            const initial = !this.sourceSignature;
            const events = trajectoryEvents(this.scene._nameWindow);
            this.sourceSignature = TraceSources.signature();
            if (!initial && JSON.stringify(events) === JSON.stringify(this.events)) return;
            this.events = events;
            this.days = Math.max(this.clock.day, ...events.map(e => e.day));
            this.focusedEventId = null;
            this.rebuild();
        }
        update() {
            if (TraceSources.changed(this.sourceSignature)) this.refreshEvents();
            const clock = trajectoryClock();
            if (clock.day !== this.clock.day || clock.hour !== this.clock.hour) {
                this.clock = clock; this.days = Math.max(clock.day, ...this.events.map(e => e.day)); this.dirty = true;
            }
            if (this._renderedTextScale !== this.textRasterScale()) this.dirty = true;
            if (this.dirty) this.render();
            this.updateEdgeArrows();
            this.updateHover();
        }
        cardAt(point) {
            if (!new Rectangle(TL.x + TL.insetX, TL.y + TL.insetY,
                TL.width - TL.insetX, TL.height - TL.insetY).contains(point.x, point.y)) return null;
            const x = (point.x - TL.x - TL.insetX - this.panX) / this.zoom;
            const y = (point.y - TL.y - TL.insetY - this.panY) / this.zoom;
            return this.cards.find(card => trajectoryCanRead(card.entry) && card.sprite.visible &&
                new Rectangle(card.sprite.x + 15, card.y + 15, TL.cardWidth - 30, card.height - 30).contains(x, y)) || null;
        }
        setHoveredCard(card) {
            if (card === this.hoveredCard) return;
            if (this.hoveredCard) {
                this.hoveredCard.glow.visible = false;
                this.hoveredCard.glow.filters = null;
            }
            this.hoveredCard = card;
            if (card) {
                card.glow.filters = [this.hoverGlow];
                card.glow.visible = true;
            }
        }
        updateHover() {
            const enabled = this.acceptsInput() && !this.detail && !this.touchOwned && !this.scene._gesture?.dragged;
            this.setHoveredCard(enabled && this.mousePoint ? this.cardAt(this.mousePoint) : null);
        }
        openDetail(card) {
            if (this.detail || !trajectoryCanRead(card.entry)) return;
            this.setHoveredCard(null);
            this.mousePoint = null;
            this.arrowUpdatedAt = null;
            this.scene._gesture = null;
            this.cancelTouch();
            const layer = new Sprite();
            this.scene._root.addChild(layer);
            const header = this.bitmap(1, 1);
            header.smooth = true;
            header.fontSize = 32;
            // Keep the original minimum and reserve the title margins and close button.
            const width = Math.min(1280, Math.max(880, Math.ceil(header.measureTextWidth(card.entry.title)) + 172));
            const x = (L.width - width) / 2;
            const panel = this.add(null, x, 132, layer);
            this.createFrame(panel, width, 816);
            header.resize(width, 816);
            header.drawText(card.entry.title, 52, 38, width - 172, 50, 'left');
            header.fontSize = 20; header.textColor = card.color;
            header.drawText(`${trajectoryUnlockTime(card.entry)}  ·  ${labels()[TRACKS.find(t => t.id === card.entry.category).label]}`,
                52, 96, width - 140, 32, 'left');
            header.fontSize = 32; header.textColor = '#eee5d7';
            header.drawText('×', width - 94, 34, 48, 48, 'center');
            header.fontSize = 18; header.textColor = '#b9ad98';
            header.drawText(labels().readMoreControls, 52, 744, width - 104, 32, 'center');
            this.add(header, 0, 0, panel);
            const bodyRect = new Rectangle(x + 40, 282, width - 80, 576);
            const body = new Window_CompendiumEventDetail(bodyRect);
            layer.addChild(body);
            body.setText(card.entry.detail, card.coverSource);
            this.detail = { card, layer, body, bodyRect, bitmaps: [header],
                panelRect: new Rectangle(x + 15, 147, width - 30, 786),
                closeRect: new Rectangle(x + width - 94, 166, 48, 48), gesture: null };
            this.layer.visible = false;
            Input.clear(); TouchInput.clear();
            SoundManager.playOk();
        }
        closeDetail(playSound = true) {
            if (!this.detail) return;
            const detail = this.detail;
            this.detail = null;
            this.layer.visible = this.scene._category === 'trajectory';
            detail.layer.destroy({ children: true });
            for (const bitmap of detail.bitmaps) {
                this.bitmaps.splice(this.bitmaps.indexOf(bitmap), 1);
                bitmap.destroy();
            }
            this.scene._gesture = null;
            this.cancelTouch();
            Input.clear();
            if (playSound) SoundManager.playCancel();
        }
        detailHit(point) {
            if (this.detail.closeRect.contains(point.x, point.y)) return 'close';
            if (this.detail.bodyRect.contains(point.x, point.y)) return 'body';
            return this.detail.panelRect.contains(point.x, point.y) ? 'panel' : 'outside';
        }
        moveDetailGesture(gesture, point) {
            if (Math.hypot(point.x - gesture.x, point.y - gesture.y) >= 8) gesture.dragged = true;
            if (gesture.hit === 'body' && gesture.dragged) this.detail.body.scrollBy(gesture.lastY - point.y);
            gesture.lastY = point.y;
        }
        finishDetailGesture(gesture, point) {
            if (!gesture.dragged && gesture.hit === this.detailHit(point) && ['close', 'outside'].includes(gesture.hit)) this.closeDetail();
        }
        updateDetailInput() {
            const d = this.detail;
            if (d.touching) return;
            const point = this.scene._root.worldTransform.applyInverse(new Point(TouchInput.x, TouchInput.y));
            if (trigger()) d.gesture = { x: point.x, y: point.y, lastY: point.y, hit: this.detailHit(point), dragged: false };
            if (d.gesture) {
                this.moveDetailGesture(d.gesture, point);
                if (release() || !pressed()) {
                    const gesture = d.gesture; d.gesture = null;
                    this.finishDetailGesture(gesture, point);
                }
            }
            if (this.detail && Input.isRepeated('down')) d.body.scrollBy(48);
            if (this.detail && Input.isRepeated('up')) d.body.scrollBy(-48);
        }
        detailTouch(event) {
            event.preventDefault(); event.stopImmediatePropagation();
            const d = this.detail;
            const touch = event.touches[0] || event.changedTouches[0];
            if (!touch) return;
            const point = this.localPoint(touch);
            if (event.type === 'touchstart' && !d.touching) {
                d.touching = true;
                d.gesture = { x: point.x, y: point.y, lastY: point.y, hit: this.detailHit(point), dragged: false };
            }
            if (d.gesture) {
                if (event.touches.length > 1) d.gesture.dragged = true;
                if (event.type === 'touchmove') this.moveDetailGesture(d.gesture, point);
                if (event.type === 'touchcancel' || !event.touches.length) {
                    const gesture = d.gesture;
                    d.gesture = null; d.touching = false;
                    if (event.type !== 'touchcancel') this.finishDetailGesture(gesture, point);
                    TouchInput.clear();
                }
            }
        }
        localPoint(event) {
            const root = this.scene._root;
            return new Point((Graphics.pageToCanvasX(event.pageX) - root.x) / root.scale.x,
                (Graphics.pageToCanvasY(event.pageY) - root.y) / root.scale.y);
        }
        acceptsInput() { return (this.layer.visible || !!this.detail) && this.scene.isActive() && !this.scene._closing; }
        bindInput() {
            if (this.listeners) return;
            const initial = !this.sourceSignature;
            TraceSources.prepare();
            this.refreshEvents();
            if (initial) this.resetView();
            this.listeners = [];
            const on = (type, fn) => { window.addEventListener(type, fn, { capture: true, passive: false }); this.listeners.push([type, fn]); };
            on('wheel', event => {
                if (!this.acceptsInput()) return;
                const p = this.localPoint(event);
                if (this.detail) {
                    event.preventDefault(); event.stopImmediatePropagation();
                    this.detail.body.scrollBy(event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.detail.body.innerHeight : 1));
                    return;
                }
                if (this.sidebarListAt(p)) {
                    event.preventDefault(); event.stopImmediatePropagation();
                    this.scrollSidebar(event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.sidebarList.height : 1));
                    return;
                }
                const hit = this.hit(p);
                if (hit !== 'track' && !hit.startsWith('day:')) return;
                event.preventDefault(); event.stopImmediatePropagation();
                const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? TL.height : 1);
                this.zoomAt(this.zoom * Math.exp(-Math.max(-240, Math.min(240, delta)) * 0.0015),
                    p.x - TL.x - TL.insetX, p.y - TL.y - TL.insetY);
            });
            on('mousemove', event => { this.mousePoint = this.localPoint(event); });
            on('mouseout', event => { if (!event.relatedTarget) { this.mousePoint = null; this.setHoveredCard(null); } });
            const touch = event => {
                if (!this.acceptsInput() && !this.touchOwned) return;
                if (this.detail) { this.detailTouch(event); return; }
                const points = Array.from(event.touches, t => this.localPoint(t));
                if (!this.touchOwned) {
                    if (event.type !== 'touchstart' || !points.length) return;
                    const hit = this.hit(points[0]), sidebar = this.sidebarListAt(points[0]);
                    if (hit !== 'track' && !sidebar && !hit.startsWith('arrow:') && !hit.startsWith('day:')) return;
                    this.touchOwned = true;
                    this.mousePoint = null;
                    this.setHoveredCard(null);
                    this.touchTap = { start: points[0], card: this.cardAt(points[0]), hit, sidebar, dragged: false };
                    this.scene._gesture = null;
                    TouchInput.clear();
                }
                event.preventDefault(); event.stopImmediatePropagation();
                if (this.touchTap.hit.startsWith('arrow:')) {
                    this.touchArrowPoint = points.length === 1 && this.hit(points[0]) === this.touchTap.hit ? points[0] : null;
                    if (!points.length || event.type === 'touchcancel') this.cancelTouch();
                    return;
                }
                const previous = this.touchState;
                if (points.length > 1 || (points[0] && Math.hypot(points[0].x - this.touchTap.start.x, points[0].y - this.touchTap.start.y) >= 8)) this.touchTap.dragged = true;
                const center = points.length >= 2 ? new Point((points[0].x + points[1].x) / 2, (points[0].y + points[1].y) / 2) : points[0];
                const distance = points.length >= 2 ? Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y) : 0;
                if (event.type === 'touchmove' && this.touchTap.dragged && previous && previous.count === points.length && center) {
                    if (this.touchTap.sidebar) {
                        if (points.length === 1) this.scrollSidebar(previous.center.y - center.y);
                    } else {
                        this.pan(center.x - previous.center.x, center.y - previous.center.y);
                        if (distance > 0 && previous.distance > 0) this.zoomAt(this.zoom * distance / previous.distance,
                            center.x - TL.x - TL.insetX, center.y - TL.y - TL.insetY);
                    }
                }
                this.touchState = center ? { center, distance, count: points.length } : null;
                if (!points.length || event.type === 'touchcancel') {
                    const tap = this.touchTap;
                    const end = event.changedTouches[0] ? this.localPoint(event.changedTouches[0]) : null;
                    this.cancelTouch();
                    if (event.type === 'touchend' && !tap.dragged && end) {
                        if ((tap.sidebar || tap.hit.startsWith('day:')) && this.hit(end) === tap.hit) this.activateControl(tap.hit);
                        else if (tap.card && this.cardAt(end) === tap.card) this.openDetail(tap.card);
                    }
                }
            };
            for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) on(type, touch);
            on('blur', () => { this.cancelTouch(); this.scene._gesture = null; this.mousePoint = null; this.setHoveredCard(null);
                if (this.detail) { this.detail.gesture = null; this.detail.touching = false; } });
        }
        cancelTouch() { this.touchOwned = false; this.touchState = null; this.touchTap = null; this.touchArrowPoint = null; TouchInput.clear(); }
        unbindInput() {
            this.closeDetail(false);
            this.setHoveredCard(null);
            this.mousePoint = null;
            this.arrowUpdatedAt = null;
            for (const [type, listener] of this.listeners || []) window.removeEventListener(type, listener, true);
            this.listeners = null;
            this.cancelTouch();
        }
        destroy() {
            this.unbindInput();
            for (const card of this.cards) card.releaseImage?.();
            this.world.mask = null;
            this.dayLayer.mask = null;
            const renderer = Graphics.app?.renderer;
            this.hintSprite.filters = null;
            for (const filter of [this.hoverGlow, this.hintGlow, this.dayGlow, this.daySymbolGlow]) {
                if (renderer?.shader?.shader === filter) renderer.shader.reset();
                filter.destroy();
            }
            this.hoverGlow = this.hintGlow = this.dayGlow = this.daySymbolGlow = null;
            this.layer.destroy({ children: true });
            for (const b of this.bitmaps) b.destroy();
            this.bitmaps.length = 0;
        }
    }

    class Scene_StandaloneCompendium extends Scene_Base {
        initialize() {
            super.initialize();
            this._category = 'item';
            this._index = 0;
            this._page = 0;
            this._ownedBitmaps = [];
            this._whiteIcons = new Map();
            this._memory = {};
            this._closing = false;
        }
        prepare(category = 'item') {
            this._category = CATEGORIES.some(x => x.type === category) ? category : 'item';
        }
        useParticleSystem() { return false; }
        makeBitmap(width, height) {
            const bitmap = new Bitmap(width, height);
            bitmap.fontFace = $gameSystem.mainFontFace();
            bitmap.fontSize = 22;
            bitmap.outlineWidth = 2;
            this._ownedBitmaps.push(bitmap);
            return bitmap;
        }
        sprite(bitmap, x, y) {
            const sprite = new Sprite(bitmap);
            sprite.move(x, y);
            this._root.addChild(sprite);
            return sprite;
        }
        create() {
            super.create();
            this._backgroundSprite = new Sprite(SceneManager.backgroundBitmap());
            this._backgroundBlur = new PIXI.filters.BlurFilter(4);
            this._backgroundSprite.filters = [this._backgroundBlur];
            this.addChild(this._backgroundSprite);
            const shade = new Sprite(this.makeBitmap(Graphics.width, Graphics.height));
            shade.bitmap.fillAll('rgba(0,0,0,0.40)');
            this.addChild(shade);
            this._root = new Sprite();
            const scale = Math.min(Graphics.width / L.width, Graphics.height / L.height);
            this._root.scale.set(scale);
            this._root.move((Graphics.width - L.width * scale) / 2, (Graphics.height - L.height * scale) / 2);
            this.addChild(this._root);
            this._collectionPanel = this.sprite(ImageManager.loadSystem('rpgCommonWindowLayout'), L.panelX, L.panelY);
            this._decoration = this.sprite(null, 736, 174);
            this._decoration.anchor.set(0.5);
            this._decoration.opacity = 120;
            this._iconSheet = ImageManager.loadSystem('IconSet_large');
            this._grid = new Window_CompendiumGrid(new Rectangle(L.gridX, L.gridY, L.gridWidth, L.gridHeight), this);
            this._root.addChild(this._grid);
            this._countSprite = this.sprite(this.makeBitmap(320, 44), 576, 860);
            this._detail = this.sprite(this.makeBitmap(L.detailWidth, 125), L.detailX, L.detailY);
            this._nameWindow = new Window_Base(new Rectangle(L.detailX, L.detailY - 12, L.detailWidth, 74));
            this._nameWindow.opacity = 0;
            this._nameWindow.padding = 12;
            this._nameWindow.createContents();
            this._root.addChild(this._nameWindow);
            this._body = new Window_CompendiumBody(new Rectangle(L.detailX, L.bodyY, L.detailWidth, L.bodyHeight));
            this._root.addChild(this._body);
            // Apply one scene-owned filter to the selected icon + caption group.
            this._categoryGlow = new PIXI.filters.GlowFilter({
                distance: 12, outerStrength: 1.5, innerStrength: 0,
                color: 0xf3cd4a, quality: 1
            });
            this._categoryButtons = CATEGORIES.map((category, i) => {
                const y = categoryButtonY(i, CATEGORIES.length);
                const container = this.sprite(null, L.categoryX, y);
                const normalBitmap = category.image ? ImageManager.loadSystem(category.image) : this.trajectoryIcon('#c0b6a2');
                const focusBitmap = category.focusImage ? ImageManager.loadSystem(category.focusImage) : this.trajectoryIcon('#f3cd8d');
                const icon = new Sprite(normalBitmap);
                icon.anchor.set(0.5);
                container.addChild(icon);
                const label = new Sprite(this.makeBitmap(160, 32));
                label.anchor.set(0.5);
                label.y = 88;
                container.addChild(label);
                // The hit area follows the same centered slot as the icon and caption.
                return { container, icon, label, category, normalBitmap, focusBitmap,
                    rect: new Rectangle(L.categoryX - 80, y + L.categoryButtonTop, 160, L.categoryButtonHeight) };
            });
            this._catalog = Object.fromEntries(CATEGORIES.filter(c => c.type !== 'trajectory').map(({ type }) => [type,
                entries(type).map(item => ({ item, known: acquired(type, item.id), count: quantity(type, item.id),
                    firstAcquired: $gameSystem.firstCollectedItemTime?.(type, item.id) || null }))]));
            this.refreshCategory();
        }
        trajectoryIcon(color) {
            const b = this.makeBitmap(120, 120), c = b.context;
            c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 3;
            c.beginPath(); c.moveTo(20, 26); c.lineTo(98, 26); c.moveTo(38, 26); c.lineTo(38, 102); c.stroke();
            for (const y of [26, 62, 96]) { c.beginPath(); c.arc(38, y, 6, 0, Math.PI * 2); c.fill(); }
            c.strokeRect(57, 48, 38, 26); c.strokeRect(57, 87, 38, 19);
            b.baseTexture.update(); return b;
        }
        start() {
            super.start();
            this._grid.refresh();
            this.refreshSelection();
            this.createDrillBackButton();
            this.createDrillCursor();
            Input.clear(); TouchInput.clear();
        }
        isReady() { return super.isReady() && ImageManager.isReady(); }
        data() { return this._catalog[this._category] || []; }
        pages() { return Math.max(1, Math.ceil(this.data().length / L.pageSize)); }
        refreshCategory() {
            const text = labels();
            const trajectory = this._category === 'trajectory';
            if (trajectory && !this._trajectory) this._trajectory = new CompendiumTrajectory(this);
            for (const node of [this._collectionPanel, this._decoration, this._grid, this._countSprite,
                this._detail, this._nameWindow, this._body]) node.visible = !trajectory;
            if (this._menuCursor) this._menuCursor.visible = !trajectory;
            if (this._trajectory) {
                this._trajectory.layer.visible = trajectory && !this._trajectory.detail;
                if (trajectory) this._trajectory.bindInput();
                else this._trajectory.unbindInput();
            }
            if (trajectory) { this._grid.deactivate(); this._grid.select(-1); }
            else {
                this._grid.activate();
                this._index = Math.min(this._memory[this._category] || 0, Math.max(0, this.data().length - 1));
                this._grid._data = this.data();
                this._grid.select(-1);
                this._grid.scrollTo(0, Math.min(this._grid.maxTopRow(), Math.floor(this._index / L.pageSize) * L.rows) * L.cellHeight);
                this._grid.forceSelect(this.data().length ? this._index : -1);
                this._grid.refresh();
                this._decoration.bitmap = ImageManager.loadSystem(
                    CATEGORIES.find(category => category.type === this._category).decoration);
                this.refreshProgress();
            }
            for (const { container, icon, label, category, normalBitmap, focusBitmap } of this._categoryButtons) {
                const selected = category.type === this._category;
                icon.bitmap = selected ? focusBitmap : normalBitmap;
                container.filters = selected ? [this._categoryGlow] : null;
                label.bitmap.clear();
                label.bitmap.fontSize = 24;
                label.bitmap.textColor = '#ffffff';
                label.opacity = selected ? 255 : 153;
                label.bitmap.drawText(text[category.type], 0, 0, 160, 32, 'center');
            }
            if (!trajectory) this.refreshPage();
        }
        whiteIcon(index) {
            if (this._whiteIcons.has(index)) return this._whiteIcons.get(index);
            const bitmap = this.makeBitmap(64, 64);
            bitmap.blt(this._iconSheet, index % 16 * 64, Math.floor(index / 16) * 64, 64, 64, 0, 0);
            const context = bitmap.context;
            context.save();
            context.globalCompositeOperation = 'source-in';
            context.globalAlpha = LOCKED_ICON_OPACITY / 255;
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, 64, 64);
            context.restore();
            bitmap.baseTexture.update();
            this._whiteIcons.set(index, bitmap);
            return bitmap;
        }
        currentPage() {
            const grid = this._grid;
            return grid.topRow() > 0 && grid.topRow() === grid.maxTopRow()
                ? this.pages() - 1 : Math.floor(grid.topRow() / L.rows);
        }
        refreshProgress() {
            const bitmap = this._countSprite.bitmap;
            bitmap.clear();
            bitmap.fontSize = 22;
            bitmap.textColor = '#b7b6b6';
            bitmap.outlineWidth = 0;
            const font = chahuiUtil.getFusionPixelFont(ConfigManager.language) || $gameSystem.mainFontFace();
            const text = progressText(this.data().filter(entry => entry.known).length, this.data().length);
            // Keep localized prose in its language font, and the numeric ratio
            // in the equipment counter font, regardless of placeholder order.
            const runs = text.split(/(\d+(?:\s*\/\s*\d+)?)/).filter(Boolean).map(part => {
                const face = /^\d/.test(part) ? 'Madou Futo Maru Gothic' : font;
                bitmap.fontFace = face;
                return { text: part, face, width: bitmap.measureTextWidth(part) };
            });
            const width = runs.reduce((sum, run) => sum + run.width, 0);
            const scale = width > 0 ? Math.min(1, bitmap.width / width) : 1;
            let x = (bitmap.width / scale - width) / 2;
            const context = bitmap.context;
            context.save();
            context.scale(scale, 1);
            try {
                for (const run of runs) {
                    bitmap.fontFace = run.face;
                    bitmap.drawText(run.text, x, 0, Math.ceil(run.width) + 1, bitmap.height, 'left');
                    x += run.width;
                }
            } finally {
                context.restore();
            }
        }
        refreshPage() {
            this._page = this.currentPage();
            this.refreshSelection();
        }
        cursorBitmapUnderIcon(source) {
            const entry = this._grid._data[this._grid.index()] || this._cursorLastEntry;
            this._cursorLastEntry = entry;
            if (!entry || entry.known || !source?.isReady() || !this._iconSheet.isReady()) return source;
            const icon = entry.item.iconIndex;
            if (this._cursorOcclusionSource === source && this._cursorOcclusionIcon === icon) {
                return this._cursorOcclusionBitmap;
            }
            // The cursor is already below the grid. Remove only its glow behind
            // the locked silhouette so it cannot shine through the icon's alpha.
            let bitmap = this._cursorOcclusionBitmap;
            if (!bitmap) bitmap = this._cursorOcclusionBitmap = this.makeBitmap(source.width, source.height);
            else if (bitmap.width !== source.width || bitmap.height !== source.height) bitmap.resize(source.width, source.height);
            bitmap.clear();
            bitmap.blt(source, 0, 0, source.width, source.height, 0, 0);
            const context = bitmap.context;
            const size = 64 / (96 / 112);
            context.save();
            context.globalAlpha = 1;
            context.globalCompositeOperation = 'destination-out';
            context.drawImage(this._iconSheet.canvas, icon % 16 * 64, Math.floor(icon / 16) * 64, 64, 64,
                (source.width - size) / 2, (source.height - size) / 2, size, size);
            context.restore();
            bitmap.baseTexture.update();
            this._cursorOcclusionSource = source;
            this._cursorOcclusionIcon = icon;
            return bitmap;
        }
        createDrillCursor() {
            if (this._menuCursor || typeof Drill_MCu_Controller !== 'function' ||
                typeof Drill_MCu_Sprite !== 'function') return;
            const styleId = this._grid.drill_MCu_cursorStyleId();
            const style = DrillUp.g_MCu_list[styleId - 1];
            if (!style) return;
            // Use Drill's renderer/controller with a scene-owned controller so
            // menu navigation cannot change the controller stored in the save.
            this._cursorController = new Drill_MCu_Controller(style);
            this._cursorController._drill_opacity = 0;
            const owner = this;
            class Sprite_CompendiumCursor extends Drill_MCu_Sprite {
                update() {
                    // Drill 的帧更新会恢复控制器中的 visible，必须在光标自身拦截。
                    if (owner._category === 'trajectory') { this.visible = false; return; }
                    super.update();
                }
                drill_sprite_initChild() {
                    super.drill_sprite_initChild();
                    // Drill rebuilds these children when its controller applies a style.
                    this._drill_layerSprite.scale.set(96 / 112);
                }
                drill_sprite_updateGIF() {
                    super.drill_sprite_updateGIF();
                    this._drill_childGIFSprite.bitmap = owner.cursorBitmapUnderIcon(this._drill_childGIFSprite.bitmap);
                }
            }
            this._menuCursor = new Sprite_CompendiumCursor();
            this._menuCursor.drill_sprite_setController(this._cursorController);
            this._menuCursor.drill_sprite_initChild();
            this._menuCursor._drill_curSerial = this._cursorController._drill_controllerSerial;
            this._root.addChildAt(this._menuCursor, this._root.getChildIndex(this._grid));
        }
        updateDrillCursor() {
            if (this._menuCursor) this._menuCursor.visible = this._category !== 'trajectory';
            if (!this._cursorController || this._category === 'trajectory') return;
            this._grid.syncCursorBean();
            this._cursorController.drill_controller_update();
        }
        refreshSelection() {
            if (this._category === 'trajectory') return;
            const entry = this.data()[this._index];
            const bitmap = this._detail.bitmap, text = labels();
            bitmap.clear(); bitmap.fontSize = 28; bitmap.textColor = '#f2f2e9';
            this._nameWindow.contents.clear();
            this._nameWindow._drill_DFF_activeFont = null;
            if (!entry) {
                bitmap.drawText(text.empty, 12, 0, L.detailWidth - 24, 50, 'center');
                this._body.setText('');
                return;
            }
            const nameMethod = {
                item: 'drill_COWC_itemName',
                weapon: 'drill_COWC_weaponName',
                armor: 'drill_COWC_armorName'
            }[this._category];
            // Reuse the SI/SW/SA resolvers, including Drill_ItemTextColor's wrappers.
            // Resolve before drawTextEx so escapes inside the name are converted once.
            const name = entry.known
                ? this._nameWindow[nameMethod](entry.item.id)
                : text.unknownName;
            this._nameWindow.drawTextEx(`\\fs[28]\\cc[#f2f2e9]${name}`, 0, 7, this._nameWindow.innerWidth);
            if (entry.known && this._category !== 'item') {
                bitmap.fontSize = 22; bitmap.textColor = '#b7b6b6';
                bitmap.drawText(text.count + '  ' + entry.count, 12, 85, L.detailWidth - 24, 32, 'left');
            }
            this._body.setText(entry.known
                ? [firstAcquiredText(entry.firstAcquired), guideText(entry.item)].filter(Boolean).join('\n')
                : text.locked);
        }
        select(index) {
            const next = Math.max(0, Math.min(this.data().length - 1, index));
            if (!this.data().length) return;
            const changed = next !== this._index || this._grid.index() !== next;
            this._index = next;
            this._memory[this._category] = next;
            this._grid.forceSelect(next);
            if (changed) SoundManager.playCursor();
            this.refreshPage();
        }
        changePage(delta) {
            const page = Math.max(0, Math.min(this.pages() - 1, this.currentPage() + delta));
            const row = Math.min(this._grid.maxTopRow(), page * L.rows);
            if (row === this._grid.topRow()) return;
            this._grid.select(-1);
            this._grid.scrollTo(0, row * L.cellHeight);
            this.select(row * L.columns);
        }
        setCategory(type) {
            if (type === this._category || !CATEGORIES.some(x => x.type === type)) return;
            this._memory[this._category] = this._index;
            this._category = type;
            this._gesture = null;
            this.refreshCategory();
            SoundManager.playCursor();
        }
        hit(point) {
            const { x, y } = point;
            for (const { rect, category } of this._categoryButtons) if (rect.contains(x, y)) return category.type;
            if (this._category === 'trajectory') return this._trajectory.hit(point);
            if (new Rectangle(L.gridX, L.gridY, L.gridWidth, L.gridHeight).contains(x, y)) return 'grid';
            if (new Rectangle(L.detailX, L.bodyY, L.detailWidth, L.bodyHeight).contains(x, y)) return 'body';
            return '';
        }
        scrollDraggedGrid(gesture, y) {
            const steps = Math.trunc((gesture.scrollAnchorY - y) / 64);
            if (!steps) return;
            const grid = this._grid;
            const requestedRow = grid.topRow() + steps;
            const row = Math.max(0, Math.min(grid.maxTopRow(), requestedRow));
            // Consume whole 64px gestures, but always move by the actual 96px
            // row height. A 64px content offset would still cut through icons.
            gesture.scrollAnchorY = row === requestedRow ? gesture.scrollAnchorY - steps * 64 : y;
            if (row === grid.topRow()) return;
            grid.select(-1);
            grid.scrollTo(0, row * grid.itemHeight());
        }
        updateTrajectoryPointer() {
            const track = this._trajectory;
            if (track.touchOwned || this.drillBackOwnsPointer()) return;
            const point = this._root.worldTransform.applyInverse(new Point(TouchInput.x, TouchInput.y));
            const hit = this.hit(point);
            if (trigger()) this._gesture = { x: point.x, y: point.y, lastX: point.x, lastY: point.y, hit, card: track.cardAt(point), dragged: false };
            const g = this._gesture;
            if (!g) return;
            if (Math.hypot(point.x - g.x, point.y - g.y) >= 8) g.dragged = true;
            if ((g.hit === 'track' || g.hit.startsWith('day:')) && g.dragged) track.pan(point.x - g.lastX, point.y - g.lastY);
            if ((g.hit.startsWith('event:') || g.hit === 'events') && g.dragged) track.scrollSidebar(g.lastY - point.y);
            g.lastX = point.x; g.lastY = point.y;
            if (release() || !pressed()) {
                this._gesture = null;
                if (!g.dragged && g.hit === hit) {
                    if (CATEGORIES.some(c => c.type === hit)) this.setCategory(hit);
                    else if (hit === 'track' && g.card && track.cardAt(point) === g.card) track.openDetail(g.card);
                    else track.activateControl(hit);
                }
            }
        }
        updatePointer() {
            if (this.drillBackOwnsPointer()) return;
            if (!this._gesture && (this._grid._drill_MSB_isDraging ||
                this._grid.drill_MSB_isOnRange())) return;
            const point = this._root.worldTransform.applyInverse(new Point(TouchInput.x, TouchInput.y));
            const hit = this.hit(point);
            if (!this._gesture && Math.abs(TouchInput.wheelY) >= 20) {
                if (hit === 'grid') this.select((this._grid.index() >= 0 ? this._grid.index() : this._grid.topIndex()) + Math.sign(TouchInput.wheelY) * L.columns);
                else if (hit === 'body') this._body.scrollBy(TouchInput.wheelY > 0 ? 48 : -48);
            }
            if (trigger()) this._gesture = {
                x: point.x, y: point.y, hit, scrollAnchorY: point.y, dragged: false
            };
            const gesture = this._gesture;
            if (!gesture) return;
            const dx = point.x - gesture.x, dy = point.y - gesture.y;
            if (gesture.hit === 'grid' && (gesture.dragged || Math.abs(dy) >= 12)) {
                gesture.dragged = true;
                this.scrollDraggedGrid(gesture, point.y);
            }
            if (release() || !pressed()) {
                this._gesture = null;
                if (gesture.dragged) return;
                if (gesture.hit === 'body' && Math.abs(dy) > 15) {
                    this._body.scrollBy(-dy);
                } else if (Math.max(Math.abs(dx), Math.abs(dy)) < 12 && gesture.hit === hit) {
                    if (CATEGORIES.some(x => x.type === hit)) this.setCategory(hit);
                    else if (hit === 'grid') {
                        const index = this._grid.indexAt(point);
                        if (index >= 0) this.select(index);
                    }
                }
            }
        }

        update() {
            if (!this.isActive() || this._closing) return;
            if (this._category === 'trajectory') this._trajectory.updateOperationHint();
            if (this._category === 'trajectory' && this._trajectory.detail) {
                super.update();
                if (Input.isTriggered('cancel') || TouchInput.isCancelled()) this._trajectory.closeDetail();
                else this._trajectory.updateDetailInput();
                return;
            }
            this.updateDrillBackButton();
            if (this._closing) return;
            super.update();
            if (this._category !== 'trajectory' && this.currentPage() !== this._page) this.refreshPage();
            if (Input.isTriggered('cancel') || TouchInput.isCancelled()) { this.popScene(); return; }
            if (!this._gesture && Input.isTriggered('tab')) {
                const i = CATEGORIES.findIndex(x => x.type === this._category);
                this.setCategory(CATEGORIES[(i + (Input.isPressed('shift') ? CATEGORIES.length - 1 : 1)) % CATEGORIES.length].type);
            }
            if (this._category === 'trajectory') {
                if (!this._gesture && !this._trajectory.touchOwned) {
                    for (const [key, dx, dy] of [['left', 24, 0], ['right', -24, 0], ['up', 0, 24], ['down', 0, -24]]) {
                        if (Input.isPressed(key)) this._trajectory.pan(dx, dy);
                    }
                }
                this.updateTrajectoryPointer();
                if (this._category === 'trajectory') this._trajectory.update();
                this.updateDrillCursor();
                return;
            }
            for (const [key, delta] of [['left', -1], ['right', 1], ['up', -5], ['down', 5]]) {
                if (!this._gesture && Input.isRepeated(key)) this.select((this._grid.index() >= 0 ? this._grid.index() : this._grid.topIndex()) + delta);
            }
            if (!this._gesture && Input.isTriggered('pageup')) this.changePage(-1);
            if (!this._gesture && Input.isTriggered('pagedown')) this.changePage(1);
            this.updatePointer();
            this.updateDrillCursor();
        }
        // Delegate locally; preserve Drill's global menu creation flag.
        createDrillBackButton() {
            if (this._drillBackButtonReady || typeof Scene_MenuBase === 'undefined' ||
                    typeof Scene_MenuBase.prototype.drill_MBB_create !== 'function' ||
                    typeof Scene_MenuBase.prototype.drill_MBB_update !== 'function') return;
            if (!this._backgroundSprite) {
                this._backgroundSprite = new Sprite();
                this.addChildAt(this._backgroundSprite, 0);
            }
            if (!this._foregroundSprite) this._foregroundSprite = new Sprite();
            this.addChild(this._foregroundSprite);
            this._drillBackPointerCaptured = false;
            this._drillBackOwnedFrame = -1;
            const hadFlag = Object.prototype.hasOwnProperty.call(SceneManager, '_drill_MBB_created');
            const previousFlag = SceneManager._drill_MBB_created;
            try {
                Scene_MenuBase.prototype.drill_MBB_create.call(this);
                this._drillBackButtonReady = true;
            } finally {
                if (hadFlag) SceneManager._drill_MBB_created = previousFlag;
                else delete SceneManager._drill_MBB_created;
            }
        }
        updateDrillBackButton() {
            if (!this._drillBackButtonReady || this._closing || !this.isActive()) return;
            // Capture before Drill tests the button. The owned frame also protects a
            // release when the caller updates Drill before its own pointer dispatcher.
            this.drillBackOwnsPointer();
            const previousUpdating = this._isUpdatingDrillBack;
            this._isUpdatingDrillBack = true;
            try {
                Scene_MenuBase.prototype.drill_MBB_update.call(this);
            } finally {
                this._isUpdatingDrillBack = previousUpdating;
                if (this._drillBackPointerCaptured && (release() || !pressed())) {
                    this._drillBackOwnedFrame = Graphics.frameCount;
                    this._drillBackPointerCaptured = false;
                }
            }
        }
        drillBackOwnsPointer() {
            if (!this._drillBackButtonReady) return false;
            if (this._drillBackOwnedFrame === Graphics.frameCount) return true;
            const pending = this._drill_MBB_sprites_pushdown.some(sprite => sprite._needPopScene);
            if (pending || this._drillBackPointerCaptured) {
                this._drillBackOwnedFrame = Graphics.frameCount;
                return true;
            }
            if (!trigger() || this._gesture || this._grid?._drill_MSB_isDraging) return false;
            const index = this._drill_MBB_sprites.findIndex((sprite, i) =>
                this._drill_MBB_sprites_layer[i].visible &&
                Scene_MenuBase.prototype.drill_MBB_isOnHighlight.call(this, sprite));
            if (index < 0) return false;
            this._drillBackPointerCaptured = true;
            this._drillBackOwnedFrame = Graphics.frameCount;
            return true;
        }
        drill_MBB_layerAddSprite(sprite, layer) {
            Scene_MenuBase.prototype.drill_MBB_layerAddSprite.call(this, sprite, layer);
        }
        drill_MBB_layerAddSprite_Private(sprite, layer) {
            Scene_MenuBase.prototype.drill_MBB_layerAddSprite_Private.call(this, sprite, layer);
        }
        drill_MBB_layerRemoveSprite(sprite) {
            Scene_MenuBase.prototype.drill_MBB_layerRemoveSprite.call(this, sprite);
        }
        drill_MBB_layerRemoveSprite_Private(sprite) {
            Scene_MenuBase.prototype.drill_MBB_layerRemoveSprite_Private.call(this, sprite);
        }
        drill_MBB_sortByZIndex() {
            Scene_MenuBase.prototype.drill_MBB_sortByZIndex.call(this);
        }
        drill_MBB_sortByZIndex_Private() {
            Scene_MenuBase.prototype.drill_MBB_sortByZIndex_Private.call(this);
        }
        drill_MBB_checkKeyword(index) {
            return Scene_MenuBase.prototype.drill_MBB_checkKeyword.call(this, index);
        }
        drill_MBB_isOnHighlight(sprite) {
            return Scene_MenuBase.prototype.drill_MBB_isOnHighlight.call(this, sprite);
        }
        drill_MBB_isOnTouchSprite(sprite) {
            // Drill normally arms whenever a held pointer enters the button. Only the
            // press captured at its origin may arm it; grid swipes cannot activate it.
            if (!this._drillBackPointerCaptured || !trigger() ||
                    this._gesture || this._grid?._drill_MSB_isDraging) return false;
            return Scene_MenuBase.prototype.drill_MBB_isOnTouchSprite.call(this, sprite);
        }

        stop() {
            this._trajectory?.unbindInput();
            super.stop();
        }
        popScene() {
            if (this._closing) return;
            this._closing = true;
            this._trajectory?.unbindInput();
            if (!this._isUpdatingDrillBack) SoundManager.playCancel();
            this._grid.deactivate();
            Input.clear(); TouchInput.clear();
            SceneManager.pop();
        }
        destroy(options) {
            this._trajectory?.destroy();
            this._trajectory = null;
            this._backgroundSprite.filters = null;
            this._backgroundSprite.bitmap = null;
            this._backgroundBlur?.destroy();
            this._backgroundBlur = null;
            this._cursorController = null;
            for (const button of this._categoryButtons || []) button.container.filters = null;
            if (this._categoryGlow) {
                const renderer = Graphics.app?.renderer;
                if (renderer?.shader?.shader === this._categoryGlow) renderer.shader.reset();
                this._categoryGlow.destroy();
                this._categoryGlow = null;
            }
            super.destroy(options);
            this._whiteIcons.clear();
            for (const bitmap of this._ownedBitmaps) bitmap.destroy();
            this._ownedBitmaps.length = 0;
            this._catalog = null;
        }
    }
    function open(category = 'item') {
        if (!CATEGORIES.some(x => x.type === category) || !($gameSystem && $gameParty)) return false;
        const scene = SceneManager._scene;
        if (!(scene instanceof Scene_Map) || SceneManager.isSceneChanging() ||
            $gamePlayer.isTransferring() || $gameMessage.isBusy()) return false;
        if (scene._MapSelectEquipWindow && !scene._MapSelectEquipWindow.isClosed()) return false;
        Input.clear(); TouchInput.clear();
        SceneManager.push(Scene_StandaloneCompendium);
        SceneManager.prepareNextScene(category);
        return true;
    }
    window.Scene_StandaloneCompendium = Scene_StandaloneCompendium;
    window.StandaloneCompendium = Object.freeze({ open, version: '0.13.2',
        registerTraceSource: (id, source) => TraceSources.register(id, source),
        invalidateTraceSource: id => TraceSources.invalidate(id)
    });
    PluginManager.registerCommand(NAME, 'Open', args => open(args.category || 'item'));
})();
