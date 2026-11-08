/*:
 * @target MZ
 * @plugindesc v1.0.20 独立更新日志：九宫格窗口、多语言、版本目录与 Pages Markdown 公告与内嵌视频。
 * @author shiroin / Codex
 * @help
 * 入口 API：StandaloneUpdateLog.open('changelog');
 * 公告链接统一经 StandaloneUpdateLog.openLink(url) 打开：PC 使用 NW.js，手机使用系统浏览器。
 * 查看后消费提示：实际进入阅读界面后，在退出节点统一清除更新日志和公告红点。
 * StandaloneUpdateLog.consumeUpdateNotices() 为统一清理方法，仅展示红点不会消费。
 * 标题检测：StandaloneUpdateLog.checkAnnouncements()，异步且不阻塞菜单，与阅读入口共用冷却。
 * 公告入口：StandaloneUpdateLog.open('announcement');
 * 公告来源：announcements.nlch.io/usuimo-announcements/index.json。
 * localStorage 使用 announcementsV1 键，仅保存文件名/哈希索引，正文保存为 .md 文件。
 * 检测时间与未读状态分别使用 announcementsCheckV1、announcementsNoticeV1；旧 GitHub 键自动迁移。
 * Pages 清单格式：{ schemaVersion: 1, hashAlgorithm: 'sha256', files: [{ name, sha256, size }] }。
 * 下载校验 SHA-256 与字节数后才覆盖本地文件；旧 GitHub 公告保留，切换来源后立即检查一次。
 * PC：游戏根目录 dataEx/announcements/；Android：cordova.file.dataDirectory 下的同名目录。
 * 只新增和覆盖更新，不因远程文件消失删除本地公告；成功检查后冷却 6 小时，失败后冷却 1 小时；跨重启保留。
 * 遵守 disableNetwork；离线直接读取本地文件。SHA 相同但文件丢失/损坏时仍重新下载。
 * 下载验证后先写临时文件，再替换正文，最后登记 SHA；旧版正文缓存自动迁移。
 * 视频块：单独一段 @[video](img/文件名.webm)，支持 MP4/WebM；保留正文 HTML 禁用。
 * 视频使用白色中央播放/暂停按钮与进度控件，切换公告、关闭界面时卸载，退到后台时暂停。
 * 支持 Decap single_file：YAML 文件头的 zh/ja/en 分别保存 title、body、published_at。
 * 兼容旧格式：YAML 文件头包含非空 title、language（如 zh/ja/en）、带时区的 published_at，
 * 文件头之后须有正文；updated_at 可选。损坏文件跳过，公告按发布时间倒序。
 * StandaloneUpdateLog.hasReadableAnnouncements() 只检查已缓存/本地公告，不联网。
 * 图片支持 HTTP(S) 地址或相对于 Markdown 文件的本地路径。
 * 下载的公告保留远程图片基准地址；图片本身不随 Markdown 下载。
 * 公告阅读数：正式缓存公告前台停留 2 秒后登记，客户端随机 UUID 独立于存档保存。
 * 同一客户端同一篇只计一次；数字缓存 5 分钟，异步更新不重建正文，不轮询。
 * 测试模式与 announcement-local-preview 仅查询；编辑器预览不请求统计接口。
 * 禁用联网时仅显示已有阅读数；身份无法持久保存时只查询，不生成临时身份反复计数。
 * 本机图文公告试阅（先启动公告编辑器）：
 * await StandaloneUpdateLog.previewLocalAnnouncements();
 * 仅显式调用时读取 localhost:8330，成功后启用本次游戏会话的公告栏目。
 * 不写入正式缓存，不自动请求本机服务；重启游戏后恢复正式公告来源。
 * 缓存查询：StandaloneUpdateLog.hasReadableLogs()，只检查是否存在可读日志，不联网。
 * 非官方语言默认显示英语日志，繁体中文（12）默认显示简体中文；右上角机翻按钮优先读缓存，缺失时点击才联网获取，可切回基准文本。
 * 时间 API：StandaloneUpdateLog.formatTime(isoTime, languageId = ConfigManager.language);
 * 输入带 Z 或时区偏移的 ISO 时间，返回 YYYY-MM-DD HH:mm:ss；空值/无效值返回空串。
 * 默认按游戏语言选择代表地区，支持显式传入语言编号供其他界面使用。
 * 时区映射见本文件 TIME_ZONES，使用 Intl 处理对应日期的夏令时；不改写原始时间。
 * 可在标题界面直接调用，或在地图中、消息结束后调用。
 * 关闭后返回进入前的界面；返回 true 表示已打开或正在首次获取公告，无法打开返回 false。
 * 首次获取期间若离开原场景，不会在获取完成后强行打开公告。
 * 不修改公共事件 41，不覆盖其他场景、窗口、输入或更新检查。
 *
 * 更新日志只读取自动更新系统维护的本地缓存，不额外发起日志请求。
 * 没有可读的 MZ 版本日志时，open 返回 false，不进入界面。
 * 正文首行版本标题中的 rev.N 追加到右侧大标题，左侧目录保持主版本号。
 * 主版本相同且客户端 gameRevision 低于正文 rev.N 时，标题分隔线下方显示手动更新按钮。
 * 点击复用补丁更新确认窗口与下载流程，不受静默更新的地图入口限制。
 * 正文隐藏版本标题及紧随的分隔线。无网络时仍可阅读已有缓存。
 * 根据 ConfigManager.language 选择每条日志；缺少译文时标明回退语言。
 * 界面文字读取 window.mapCommonEventDialogue.changelogScene，沿用多语言系统加载；
 * 缺失字段使用当前语言默认值，与 StandaloneCompendium 相同。
 * 目录显示 updated_at，尚未修改时显示 published_at；历史空时间显示未记录。
 * 详情显示发布时间、修改时间、from_list。目录与详情均调用上述时间 API。
 * 版本上方显示更新类型：from_list 中任一来源的 X 或 Y 与目标不同即为主要版本更新，
 * 其余为补丁版本更新；缺少有效来源时也按补丁显示。
 * 目录仅展示 MZ 时期（1.2.0 起）的日志，不删除服务器或本地缓存中的历史记录。
 *
 * 鼠标/单指上下拖动、滚轮滚动；悬停或按住上下箭头连续滚动。
 * 方向键切换版本，PageUp/PageDown 翻动正文，Home/End 到正文首尾。
 * 点击「更新日志」展开/收起目录；Esc/右键/Drill 返回按钮退出。
 *
 * 公告数据位于本文件 CHANNELS.announcement：启用后提供读取缓存的 read
 * 数据入口即可共用目录和阅读器。返回 { entries }，每项包含
 * id、title、logs（语言编号→正文）、published_at、updated_at；
 * from_list 仅用于更新日志。目录中没有有效公告时，公告栏目置灰不可选择。
 * 本机预览使用 format: 'markdown' 和 baseUrl 解析图文；正文链接交给外部浏览器。
 *
 * 需要项目现有 img/system/Saikey_HoverWindow/nine/00..22.png
 * 以及 img/system/changelogScene.png；返回按钮由 Drill_MenuBackButton 提供。
 * 与 StandaloneCompendium 一样按 1920×1080 等比适配。
 * 只绘制可见文字，长日志不会创建超长纹理。退出释放本场景资源与监听器。
 * movies/dancingImouto_8.webm 静音循环贴在画面右下角，退出时释放独占视频资源。
 * 鼠标或手指进入视频范围后本轮播完即隐藏，全部离开后恢复循环；手指松开视为离开。
 */
(() => {
    'use strict';
    const CACHE_ALL = 'updateChangeLogsAllV2';
    const CACHE_LEGACY = 'updateChangeLogs';
    const L = Object.freeze({
        width: 1920, height: 1080,
        panel: { x: 60, y: 74, width: 1800, height: 940 },
        list: { x: 100, y: 360, width: 356, height: 586 },
        body: { x: 546, y: 278, width: 1220, height: 628 },
        rowHeight: 88,
        announcement: { x: 100, y: 240, width: 356, height: 50 },
        changelog: { x: 100, y: 300, width: 356, height: 50 }
    });
    // Fallbacks only; the shared language table supplies UI text, the Worker supplies logs.
    const TEXT = [
        ['更新记录','更新日志','公告','发布时间','修改时间','可从以下版本升级','未记录','未提供','拖拽 / 滚轮阅读 · 悬停或按住箭头滚动','主要版本更新','补丁版本更新'],
        ['更新情報','更新履歴','お知らせ','公開日時','更新日時','更新元バージョン','記録なし','情報なし','ドラッグ / ホイールで閲覧 · 矢印に重ねる / 長押しでスクロール','メジャーアップデート','パッチアップデート'],
        ['Updates','Changelog','Announcements','Published','Modified','Upgradeable from','Not recorded','Not provided','Drag / scroll to read · Hover or hold an arrow to scroll','Major update','Patch update'],
        ['Обновления','Журнал изменений','Объявления','Опубликовано','Изменено','Обновление с версий','Не записано','Не указано','Перетаскивайте / прокручивайте · Наведите или удерживайте стрелку','Крупное обновление','Обновление-патч'],
        ['Mises à jour','Historique','Annonces','Publié','Modifié','Mise à jour depuis','Non enregistré','Non renseigné','Glisser / défiler pour lire · Survoler ou maintenir une flèche','Mise à jour majeure','Mise à jour corrective'],
        ['Cập nhật','Lịch sử cập nhật','Thông báo','Phát hành','Sửa đổi','Có thể nâng cấp từ','Chưa ghi nhận','Chưa cung cấp','Kéo / cuộn để đọc · Di chuột hoặc giữ mũi tên để cuộn','Bản cập nhật lớn','Bản cập nhật vá lỗi'],
        ['Actualizaciones','Historial','Avisos','Publicado','Modificado','Actualizable desde','Sin registrar','No especificado','Arrastra / desplaza para leer · Señala o mantén pulsada una flecha','Actualización principal','Actualización de parche'],
        ['Atualizações','Histórico','Avisos','Publicado','Modificado','Atualização a partir de','Não registrado','Não informado','Arraste / role para ler · Aponte ou segure uma seta para rolar','Atualização principal','Atualização de correção'],
        ['업데이트','업데이트 기록','공지','게시 시간','수정 시간','업데이트 가능한 이전 버전','기록 없음','정보 없음','드래그 / 휠로 읽기 · 화살표에 올리거나 길게 눌러 스크롤','주요 버전 업데이트','패치 업데이트'],
        ['Pembaruan','Riwayat pembaruan','Pengumuman','Dirilis','Diubah','Dapat diperbarui dari','Belum dicatat','Tidak tersedia','Seret / gulir untuk membaca · Arahkan atau tahan panah untuk menggulir','Pembaruan utama','Pembaruan patch'],
        ['การอัปเดต','บันทึกการอัปเดต','ประกาศ','เผยแพร่','แก้ไข','อัปเดตได้จากเวอร์ชัน','ไม่มีบันทึก','ไม่มีข้อมูล','ลาก / เลื่อนเพื่ออ่าน · ชี้หรือกดลูกศรค้างไว้เพื่อเลื่อน','การอัปเดตหลัก','การอัปเดตแพตช์'],
        ['Оновлення','Журнал змін','Оголошення','Опубліковано','Змінено','Оновлення з версій','Не записано','Не вказано','Перетягуйте / прокручуйте · Наведіть або утримуйте стрілку','Велике оновлення','Оновлення-патч'],
        ['更新記錄','更新日誌','公告','發布時間','修改時間','可從以下版本升級','未記錄','未提供','拖曳 / 滾輪閱讀 · 懸停或按住箭頭捲動','主要版本更新','修補版本更新'],
        ['Aggiornamenti','Cronologia','Annunci','Pubblicato','Modificato','Aggiornabile da','Non registrato','Non specificato','Trascina / scorri per leggere · Passa su una freccia o tienila premuta','Aggiornamento principale','Aggiornamento correttivo']
    ];
    const LABEL_KEYS = ['title','changelog','announcement','published','updated','from','unknown','notProvided','hint','majorUpdate','patchUpdate'];
    const UPDATE_BUTTON_TEXT = ['点击进行更新', 'クリックして更新', 'Click to update', 'Нажмите для обновления',
        'Cliquer pour mettre à jour', 'Nhấn để cập nhật', 'Haz clic para actualizar', 'Clique para atualizar',
        '클릭하여 업데이트', 'Klik untuk memperbarui', 'คลิกเพื่ออัปเดต', 'Натисніть для оновлення', '點擊進行更新', 'Clicca per aggiornare'];
    const LANGUAGE_NAMES = ['Simplified Chinese','Japanese','English','Russian','French','Vietnamese','Spanish','Portuguese','Korean','Indonesian','Thai','Ukrainian','Traditional Chinese','Italian'];
    const COLOR = { text: '#e8e6df', muted: '#afa98f', cyan: '#40d7ff', announcement: '#fed83f' };
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
    const contains = (r, p) => p && p.x >= r.x && p.y >= r.y && p.x < r.x + r.width && p.y < r.y + r.height;
    function clearPointerInput() {
        TouchInput.clear();
        // Drill keeps physical buttons outside MZ's clear(). Reset them when
        // taking over a reader gesture or changing scenes.
        if (typeof TouchInput.drill_isLeftPressed !== 'function') return;
        for (const side of ['left', 'middle', 'right']) {
            TouchInput['_drill_COI_' + side + 'Pressed'] = false;
            for (const state of ['Pressed', 'Released', 'Doubled']) TouchInput['_drill_COI_' + side + state + 'Time'] = undefined;
        }
    }
    function language() { const id = Number(ConfigManager.language); return TEXT[id] ? id : 2; }
    function labels(id) {
        const result = Object.fromEntries(LABEL_KEYS.map((key, i) => [key, TEXT[id][i]]));
        result.clickToUpdate = UPDATE_BUTTON_TEXT[id];
        const current = window.mapCommonEventDialogue?.changelogScene || {};
        const keys = { announcement: 'Announcements', changelog: 'Changelog', published: 'ReleaseDate',
            updated: 'LastModified', from: 'UpgradableFrom', unknown: 'NotRecorded',
            majorUpdate: 'MajorUpdate', patchUpdate: 'PatchUpdate', hint: 'ReadControls',
            notProvided: 'NotProvided', clickToUpdate: 'ClickToUpdate' };
        for (const [label, key] of Object.entries(keys)) {
            const value = current[key];
            if (typeof value === 'string' || Array.isArray(value)) {
                result[label] = (Array.isArray(value) ? value : [value])
                    .filter(line => typeof line === 'string' && line.trim()).join('\n');
            }
        }
        return result;
    }
    // ConfigManager.language: CN, JP, EN, RU, FR, VN, ES, PTBR, KR, ID, TH, UA, TW, IT.
    const TIME_ZONES = [
        'Asia/Shanghai',     // 北京
        'Asia/Tokyo',        // 东京
        'America/New_York',  // 纽约
        'Europe/Moscow',     // 莫斯科
        'Europe/Paris',      // 巴黎
        'Asia/Ho_Chi_Minh',   // 胡志明市
        'Europe/Madrid',     // 马德里
        'America/Sao_Paulo', // 圣保罗
        'Asia/Seoul',        // 首尔
        'Asia/Jakarta',      // 雅加达
        'Asia/Bangkok',      // 曼谷
        'Europe/Kiev',       // 基辅；使用旧版 Chromium 也支持的 IANA 别名
        'Asia/Taipei',       // 台北
        'Europe/Rome'        // 罗马
    ];
    const TIME_FORMATTERS = new Map();
    function formatTime(value, languageId = language()) {
        if (typeof value !== 'string') return '';
        value = value.trim();
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return '';
        const date = new Date(value);
        if (!Number.isFinite(date.getTime())) return '';
        const timeZone = TIME_ZONES[Number(languageId)] || TIME_ZONES[2];
        if (!TIME_FORMATTERS.has(timeZone)) {
            TIME_FORMATTERS.set(timeZone, new Intl.DateTimeFormat('en-GB', {
                timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
            }));
        }
        const parts = Object.fromEntries(TIME_FORMATTERS.get(timeZone).formatToParts(date).map(part => [part.type, part.value]));
        return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
    }
    function fromVersions(value) { return String(value ?? '').split(/[|,]/).map(v => v.trim()).filter(Boolean).join(', '); }
    function updateType(entry) {
        // Match the updater's X/Y comparison, without invoking its eligibility
        // checks or callbacks. One cross-series source makes this a major update.
        const parse = value => /^(\d+)\.(\d+)\.(\d+)(?:-[\w.-]+)?(?:\+[\w.-]+)?$/.exec(String(value ?? '').trim());
        const target = parse(entry.version);
        const major = target && String(entry.from_list ?? '').split(/[|,]/).some(value => {
            const source = parse(value);
            return source && (Number(source[1]) !== Number(target[1]) || Number(source[2]) !== Number(target[2]));
        });
        return major ? 'majorUpdate' : 'patchUpdate';
    }
    function localizedLog(entry, id, machineTranslation = false) {
        // Announcements use Simplified Chinese for Traditional Chinese, English for other unofficial languages.
        const order = entry.format === 'markdown' && ![0, 1, 2].includes(id)
            ? (id === 12 ? [0, 2] : [2]) : [...new Set([...(id <= 2 || machineTranslation ? [id] : []), ...(id === 12 ? [0] : []), 2, 0, 1])];
        for (const key of order) {
            const value = entry.logs?.[key];
            if (typeof value === 'string' && value.trim()) return { text: value, language: key };
        }
        return { text: entry.legacyText || '', language: null };
    }
    function parseChangelog(text) {
        // Common event 41 still needs the original heading. Strip it only from
        // this reader's display, including localized headings in historical logs.
        const lines = text.replace(/\r\n?/g, '\n').split('\n');
        let first = 0;
        while (first < lines.length && !lines[first].trim()) first++;
        const heading = /^(?:v|ver\.?|version|versión|versão|versione|versi|phiên\s+bản|версия|версія|เวอร์ชัน|버전|版本|バージョン)\s*\d+(?:\.\d+)+(?:[-+][\w.-]+)?(?:\s+rev\.?\d+)?\s*[:：]?$/i;
        const title = (lines[first] || '').trim();
        if (!heading.test(title)) return { body: text, revision: '' };
        const revision = title.match(/(?:\+|\s)rev\.?(\d+)\b/i);
        first++;
        while (first < lines.length && (!lines[first].trim() || /^[\s—–─━_=\-]{3,}$/.test(lines[first]))) first++;
        return { body: lines.slice(first).join('\n'), revision: revision ? 'rev.' + revision[1] : '' };
    }
    function changelogBody(text) {
        return parseChangelog(text).body;
    }
    function hasNewerRevision(entry, changelog) {
        const current = window.$dataSystem;
        return !!(current && entry.version?.trim() === String(current.gameVersion).trim() &&
            Number.isInteger(current.gameRevision) && current.gameRevision >= 0 &&
            changelog?.revision && Number(changelog.revision.slice(4)) > current.gameRevision);
    }
    function readJSON(key) {
        try { return JSON.parse(localStorage.getItem(key)); } catch (_) { return null; }
    }
    function bundleEntries(bundle, platform) {
        if (bundle?.schemaVersion !== 2 || bundle.platform !== platform || !Array.isArray(bundle.changelogs)) return null;
        return bundle.changelogs.filter(e => e && typeof e.version === 'string' && e.version.trim() && e.logs && typeof e.logs === 'object')
            .map(e => ({ ...e, id: e.version.trim(), title: e.version.trim() })).reverse();
    }
    function readChangelogs(platform) {
        const entries = bundleEntries(readJSON(CACHE_ALL), platform);
        if (entries) return { entries };
        const legacy = readJSON(CACHE_LEGACY);
        return { entries: Array.isArray(legacy) ? legacy.filter(e => e && typeof e.version === 'string' && e.version.trim())
            .map(e => ({ ...e, id: e.version.trim(), title: e.version.trim(), legacyText: typeof e.log === 'string' ? e.log : '' })).reverse() : [] };
    }
    const CHANNELS = {
        changelog: { enabled: true, read: readChangelogs },
        // Future announcements use the same document shape and scene lifecycle.
        announcement: { enabled: false, read: () => ({ entries: [] }) }
    };
    // Keep this directory aligned with the folder inside the uploaded Pages ZIP.
    // BEGIN shared announcement version rules
    // Shared by the editor, exported Pages worker and game reader.
    const AnnouncementVersions = (() => {
      const fallback = '1.3.4';
      function parse(value) {
        const match = /^(\d+(?:\.\d+)*)([a-z]?)$/i.exec(String(value || '').trim());
        if (!match) return null;
        const numbers = match[1].split('.').map(Number);
        return numbers.every(Number.isSafeInteger) ? { numbers, suffix: match[2].toUpperCase() } : null;
      }
      function current(value) { return parse(value) ? String(value).trim() : fallback; }
      function compare(a, b) {
        const left = parse(a), right = parse(b);
        if (!left || !right) throw Error('版本号无效');
        for (let i = 0; i < Math.max(left.numbers.length, right.numbers.length); i++) {
          const delta = (left.numbers[i] || 0) - (right.numbers[i] || 0);
          if (delta) return Math.sign(delta);
        }
        return left.suffix === right.suffix ? 0 : left.suffix > right.suffix ? 1 : -1;
      }
      function normalize(rule) {
        if (rule == null) return { mode: 'none' };
        if (!rule || typeof rule !== 'object' || Array.isArray(rule)) throw Error('公告版本限制格式无效');
        if (rule.mode === 'none') return { mode: 'none' };
        if (!['above', 'below'].includes(rule.mode)) throw Error('请选择有效的公告版本限制模式');
        const version = String(rule.version || '').trim();
        if (!/^\d+\.\d+\.\d+$/.test(version) || !parse(version)) throw Error('限制版本请填写 X.X.X，例如 1.3.4');
        return { mode: rule.mode, version };
      }
      function fromMeta(meta) {
        // Decap single_file duplicates shared fields into each locale; ja is authoritative.
        for (const data of [meta, meta?.ja, meta?.zh, meta?.en]) {
          if (data && Object.prototype.hasOwnProperty.call(data, 'version_rule')) return normalize(data.version_rule);
        }
        return normalize(null);
      }
      function allows(rule, version) {
        try {
          rule = normalize(rule);
          if (rule.mode === 'none') return true;
          const order = compare(current(version), rule.version);
          return rule.mode === 'above' ? order > 0 : order < 0;
        } catch (_) { return false; }
      }
      return { current, compare, normalize, fromMeta, allows };
    })();
    // END shared announcement version rules
    function announcementClientVersion() { return AnnouncementVersions.current(window.$dataSystem?.gameVersion); }
    function versionedAnnouncementUrl(url) { return url + "?curVer=" + encodeURIComponent(announcementClientVersion()); }

    const ANNOUNCEMENT_ROOT = 'https://announcements.nlch.io/usuimo-announcements/';
    const ANNOUNCEMENT_SOURCE = ANNOUNCEMENT_ROOT + 'index.json';
    const LEGACY_ANNOUNCEMENT_SOURCE = 'https://api.github.com/repos/shiroin000/RPGmaker/contents/announcements?ref=main';
    const ANNOUNCEMENT_CACHE_SOURCES = [ANNOUNCEMENT_SOURCE, LEGACY_ANNOUNCEMENT_SOURCE,
        'https://usuimo-announcements.pages.dev/usuimo-announcements/index.json'];
    const ANNOUNCEMENT_CACHE = 'announcementsV1';
    const ANNOUNCEMENT_INTERVAL = 6 * 60 * 60 * 1000;
    const ANNOUNCEMENT_RETRY = 60 * 60 * 1000;
    const ANNOUNCEMENT_CHECK = 'announcementsCheckV1';
    const ANNOUNCEMENT_NOTICE = 'announcementsNoticeV1';
    const ANNOUNCEMENT_VIEWS_API = 'https://usuimo-announcement-views.shiroin.workers.dev/api/announcements/';
    const ANNOUNCEMENT_VIEW_CACHE = 'announcementViewsV1';
    const ANNOUNCEMENT_CLIENT_ID = 'announcementReaderIdV1';
    const ANNOUNCEMENT_VIEW_TTL = 5 * 60 * 1000;
    const READER_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let announcementViewCache = null;
    const announcementViewPending = new Map();
    function cachedAnnouncementViews(id) {
        if (!announcementViewCache) {
            const saved = readJSON(ANNOUNCEMENT_VIEW_CACHE);
            announcementViewCache = new Map(Object.entries(saved || {}).filter(([, value]) =>
                Number.isSafeInteger(value?.views) && value.views >= 0 && Number.isFinite(value.checkedAt)));
        }
        return announcementViewCache.get(id);
    }
    function announcementReaderId() {
        try {
            const saved = localStorage.getItem(ANNOUNCEMENT_CLIENT_ID);
            if (READER_UUID.test(saved || '')) return saved;
            // getRandomValues also works in older Android WebViews without randomUUID.
            const bytes = crypto.getRandomValues(new Uint8Array(16));
            bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
            const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
            const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
            localStorage.setItem(ANNOUNCEMENT_CLIENT_ID, id);
            return id;
        } catch (_) { return null; }
    }
    function fetchAnnouncementViews(id, readOnly) {
        const cached = cachedAnnouncementViews(id);
        if (cached && (readOnly || cached.recorded) && Date.now() - cached.checkedAt < ANNOUNCEMENT_VIEW_TTL) {
            return Promise.resolve(cached.views);
        }
        const key = id + (readOnly ? ':query' : ':read');
        if (announcementViewPending.has(key)) return announcementViewPending.get(key);
        const pending = (async () => {
            const clientId = readOnly ? null : announcementReaderId();
            const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 8000);
            try {
                const response = await fetch(ANNOUNCEMENT_VIEWS_API + (clientId ? 'read' : 'views?id=' + encodeURIComponent(id)), {
                    method: clientId ? 'POST' : 'GET', signal: controller.signal, cache: 'no-store', credentials: 'omit',
                    ...(clientId ? { headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ announcementId: id, clientId }) } : {})
                });
                if (!response.ok) throw Error('HTTP ' + response.status);
                const result = await response.json();
                if (!result.ok || result.announcementId !== id || !Number.isSafeInteger(result.views) || result.views < 0) {
                    throw Error('Invalid announcement views.');
                }
                announcementViewCache.set(id, { views: result.views, checkedAt: Date.now(), recorded: !!clientId });
                try { localStorage.setItem(ANNOUNCEMENT_VIEW_CACHE, JSON.stringify(Object.fromEntries(announcementViewCache))); }
                catch (_) { /* In-memory counts remain usable if storage is full. */ }
                return result.views;
            } finally { clearTimeout(timer); }
        })().finally(() => announcementViewPending.delete(key));
        announcementViewPending.set(key, pending);
        return pending;
    }
    const LEGACY_ANNOUNCEMENT_KEYS = {
        [ANNOUNCEMENT_CACHE]: 'githubAnnouncementsV1',
        [ANNOUNCEMENT_CHECK]: 'githubAnnouncementsCheckV1',
        [ANNOUNCEMENT_NOTICE]: 'githubAnnouncementsNoticeV1'
    };
    let announcementStorageMigrated = false;
    function readAnnouncementState(key) {
        if (!announcementStorageMigrated) {
            announcementStorageMigrated = true;
            for (const [current, legacy] of Object.entries(LEGACY_ANNOUNCEMENT_KEYS)) {
                try {
                    const value = localStorage.getItem(legacy);
                    if (value === null) continue;
                    // Existing new state wins, especially an already consumed notice.
                    if (localStorage.getItem(current) === null) localStorage.setItem(current, value);
                    if (localStorage.getItem(current) !== null) localStorage.removeItem(legacy);
                } catch (_) {} // A failed write must retain the legacy value for this session and the next.
            }
        }
        return readJSON(key) ?? readJSON(LEGACY_ANNOUNCEMENT_KEYS[key]);
    }
    let remotePending = null, announcementNextCheck = null, announcementCheckVersion = null;
    let announcementChanged = null, announcementNoticePending = false;
    function nextAnnouncementCheck() {
        const version = announcementClientVersion();
        if (announcementNextCheck === null || announcementCheckVersion !== version) {
            announcementCheckVersion = version;
            const saved = readAnnouncementState(ANNOUNCEMENT_CHECK);
            announcementNextCheck = saved?.source === ANNOUNCEMENT_SOURCE && (saved.clientVersion || '1.3.4') === version && Number.isFinite(saved.nextCheckAt)
                ? saved.nextCheckAt : 0;
        }
        return announcementNextCheck;
    }
    function deferAnnouncementCheck(duration) {
        announcementCheckVersion = announcementClientVersion();
        announcementNextCheck = Date.now() + duration;
        try { localStorage.setItem(ANNOUNCEMENT_CHECK, JSON.stringify({ source: ANNOUNCEMENT_SOURCE, clientVersion: announcementCheckVersion, nextCheckAt: announcementNextCheck })); }
        catch (_) {} // Keep the in-memory cooldown if storage is full.
    }
    function loadAnnouncementNotice() {
        if (announcementChanged !== null) return;
        const saved = readAnnouncementState(ANNOUNCEMENT_NOTICE);
        announcementChanged = announcementNoticePending =
            ANNOUNCEMENT_CACHE_SOURCES.includes(saved?.source) && saved.pending === true;
    }
    function flagAnnouncementChange() {
        announcementChanged = announcementNoticePending = true;
        try { localStorage.setItem(ANNOUNCEMENT_NOTICE, JSON.stringify({ source: ANNOUNCEMENT_SOURCE, pending: true })); }
        catch (_) {}
    }
    function hasAnnouncementNotice() {
        loadAnnouncementNotice();
        return announcementChanged && readableEntries(CHANNELS.announcement.read().entries, 'announcement').length > 0;
    }
    function consumeUpdateNotices() {
        loadAnnouncementNotice();
        if (announcementChanged || announcementNoticePending) {
            announcementChanged = announcementNoticePending = false;
            announcementRevision++;
            try { localStorage.setItem(ANNOUNCEMENT_NOTICE, JSON.stringify({ source: ANNOUNCEMENT_SOURCE, pending: false })); }
            catch (_) {}
        }
        window.chahuiUtil?.consumeTitleUpdateNotice?.();
    }
    let announcementRevision = 0, pendingAnnouncementOpen = null;
    const announcementName = name => typeof name === 'string' && /^[^/\\\x00-\x1f]+\.md$/i.test(name);
    const announcementBase = name => ANNOUNCEMENT_ROOT + encodeURIComponent(name);
    const cachedAnnouncementBase = file => file.sha.length === 40
        ? 'https://raw.githubusercontent.com/shiroin000/RPGmaker/main/announcements/' + encodeURIComponent(file.name)
        : announcementBase(file.name);
    let remoteAnnouncementRules = null;
    function announcementRules() {
        if (remoteAnnouncementRules === null) {
            const saved = readAnnouncementState(ANNOUNCEMENT_CACHE);
            remoteAnnouncementRules = ANNOUNCEMENT_CACHE_SOURCES.includes(saved?.source) ? saved.versionRules || {} : {};
        }
        return remoteAnnouncementRules;
    }
    function announcementAllowed(entry) {
        return AnnouncementVersions.allows(entry.version_rule, announcementClientVersion()) &&
            AnnouncementVersions.allows(announcementRules()[entry.id], announcementClientVersion());
    }
    function savedAnnouncements() {
        const saved = readAnnouncementState(ANNOUNCEMENT_CACHE);
        return ANNOUNCEMENT_CACHE_SOURCES.includes(saved?.source) && Array.isArray(saved.files)
            ? saved.files.filter(file => file && announcementName(file.name) && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(file.sha)) : [];
    }
    function saveAnnouncementIndex(index) {
        try {
            localStorage.setItem(ANNOUNCEMENT_CACHE, JSON.stringify({ source: ANNOUNCEMENT_SOURCE,
                versionRules: announcementRules(), files: [...index.values()].map(({ name, sha }) => ({ name, sha })) }));
        } catch (error) { console.warn('[Announcements] Index could not be saved:', error.message); }
    }
    function pcAnnouncementFolder() {
        const path = require('path');
        return path.join(path.dirname(process.mainModule.filename), 'dataEx', 'announcements');
    }
    function readPcAnnouncementFiles() {
        const fs = require('fs'), path = require('path'), { pathToFileURL } = require('url');
        const folder = pcAnnouncementFolder(), index = new Map(savedAnnouncements().map(file => [file.name, file]));
        let names;
        try { names = fs.readdirSync(folder, { withFileTypes: true }); }
        catch (error) { if (error.code === 'ENOENT') return []; throw error; }
        const files = [];
        for (const item of names.filter(item => item.isFile() && announcementName(item.name))) {
            try {
                const filename = path.join(folder, item.name);
                files.push({ name: item.name, text: fs.readFileSync(filename, 'utf8'),
                    baseUrl: index.has(item.name) ? cachedAnnouncementBase(index.get(item.name)) : pathToFileURL(filename).href });
            } catch (error) { console.warn('[Announcements] Could not read ' + item.name + ':', error.message); }
        }
        return files;
    }
    // Resolve the app's writable Cordova directory, never the read-only APK assets.
    async function androidAnnouncementFolder(create) {
        let dir = await new Promise((resolve, reject) =>
            window.resolveLocalFileSystemURL(cordova.file.dataDirectory, resolve, reject));
        for (const name of ['dataEx', 'announcements']) dir = await new Promise((resolve, reject) =>
            dir.getDirectory(name, { create }, resolve, reject));
        return dir;
    }
    async function readAndroidAnnouncementFile(entry) {
        const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file, 'UTF-8');
        });
    }
    async function readAnnouncementFiles() {
        if (Utils.isNwjs?.()) return readPcAnnouncementFiles();
        let dir;
        try { dir = await androidAnnouncementFolder(false); }
        catch (error) { if (error.code === 1) return []; throw error; }
        const reader = dir.createReader(), files = [];
        const index = new Map(savedAnnouncements().map(file => [file.name, file]));
        while (true) {
            const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
            if (!batch.length) break;
            for (const entry of batch.filter(entry => entry.isFile && announcementName(entry.name))) {
                try { files.push({ name: entry.name, text: await readAndroidAnnouncementFile(entry),
                    baseUrl: index.has(entry.name) ? cachedAnnouncementBase(index.get(entry.name)) : entry.toURL() }); }
                catch (error) { console.warn('[Announcements] Could not read ' + entry.name + ':', error.message); }
            }
        }
        return files;
    }
    async function writeAnnouncementFile(name, text) {
        if (!announcementName(name)) throw Error('Invalid announcement filename.');
        const temporary = '.' + name + '.' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.tmp';
        if (Utils.isNwjs?.()) {
            const fs = require('fs').promises, path = require('path'), folder = pcAnnouncementFolder();
            await fs.mkdir(folder, { recursive: true });
            const tempPath = path.join(folder, temporary);
            try {
                await fs.writeFile(tempPath, text, { encoding: 'utf8', flag: 'wx' });
                await fs.rename(tempPath, path.join(folder, name));
            } finally { await fs.unlink(tempPath).catch(() => {}); }
        } else {
            const dir = await androidAnnouncementFolder(true);
            const temp = await new Promise((resolve, reject) =>
                dir.getFile(temporary, { create: true, exclusive: true }, resolve, reject));
            try {
                const writer = await new Promise((resolve, reject) => temp.createWriter(resolve, reject));
                await new Promise((resolve, reject) => {
                    writer.onwriteend = resolve;
                    writer.onerror = () => reject(writer.error || Error('Announcement write failed.'));
                    writer.write(new Blob([text], { type: 'text/plain;charset=utf-8' }));
                });
                await new Promise((resolve, reject) => temp.moveTo(dir, name, resolve, reject));
            } catch (error) {
                await new Promise(resolve => temp.remove(resolve, resolve));
                throw error;
            }
        }
    }
    function installRemoteAnnouncements(files, yaml) {
        const entries = [];
        for (const file of files) {
            try {
                const entry = parseAnnouncement(file.text, file.name, file.baseUrl, yaml);
                if (entry) entries.push(entry);
            } catch (error) { console.warn('[Announcements] Skipped ' + file.name + ':', error.message); }
        }
        entries.sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
        CHANNELS.announcement = { enabled: entries.length > 0, read: () => ({ entries }) };
        announcementRevision++;
    }
    async function announcementRequest(url, json = false, binary = false) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            const response = await fetch(url, { signal: controller.signal, cache: 'no-cache', credentials: 'omit' });
            if (!response.ok) throw Error('HTTP ' + response.status);
            return await (json ? response.json() : binary ? response.arrayBuffer() : response.text());
        } finally { clearTimeout(timeout); }
    }
    async function announcementHash(bytes) {
        if (Utils.isNwjs?.()) return require('crypto').createHash('sha256').update(bytes).digest('hex');
        const digest = await window.crypto.subtle.digest('SHA-256', bytes);
        return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
    }
    function announcementListing(listing) {
        if (listing?.schemaVersion !== 1 || listing.hashAlgorithm !== 'sha256' || !Array.isArray(listing.files)) {
            throw Error('Invalid Pages announcement manifest.');
        }
        const names = new Set();
        for (const item of listing.files) {
            if (!item || !announcementName(item.name) || names.has(item.name) ||
                !/^[a-f0-9]{64}$/.test(item.sha256) || !Number.isSafeInteger(item.size) || item.size <= 0 || item.size > 25 * 1024 * 1024) {
                throw Error('Invalid Pages announcement file.');
            }
            names.add(item.name);
        }
        if (listing.versionRules != null) {
            if (typeof listing.versionRules !== 'object' || Array.isArray(listing.versionRules)) throw Error('Invalid announcement version rules.');
            for (const [name, rule] of Object.entries(listing.versionRules)) {
                if (!announcementName(name)) throw Error('Invalid announcement version rule filename.');
                AnnouncementVersions.normalize(rule);
            }
        }
        return listing.files;
    }
    function refreshRemoteAnnouncements() {
        if (previewAnnouncements || (!Utils.isNwjs?.() && !window.cordova?.file?.dataDirectory)) return Promise.resolve();
        if (remotePending) return remotePending;
        remotePending = (async () => {
            const [reader, yaml] = await Promise.all([loadMarkdown(), loadYaml()]);
            const saved = savedAnnouncements(), index = new Map(saved.map(file => [file.name, { name: file.name, sha: file.sha }]));
            const files = new Map((await readAnnouncementFiles()).map(file => [file.name, file]));
            markdown = reader;
            const valid = file => {
                try { return !!parseAnnouncement(file.text, file.name, file.baseUrl, yaml); }
                catch (_) { return false; }
            };
            // Migrate the old localStorage bodies once, without overwriting manually edited disk files.
            for (const old of saved.filter(file => typeof file.text === 'string')) {
                const disk = files.get(old.name);
                if (disk && valid(disk)) {
                    if (disk.text !== old.text) index.delete(old.name);
                    continue;
                }
                const file = { name: old.name, text: old.text, baseUrl: cachedAnnouncementBase(old) };
                if (!valid(file)) { index.delete(old.name); continue; }
                await writeAnnouncementFile(file.name, file.text);
                files.set(file.name, file);
            }
            if (saved.some(file => typeof file.text === 'string')) saveAnnouncementIndex(index);
            if (previewAnnouncements) return;
            installRemoteAnnouncements([...files.values()], yaml);
            if (ConfigManager.disableNetwork || Date.now() < nextAnnouncementCheck()) return;
            deferAnnouncementCheck(ANNOUNCEMENT_RETRY);
            const manifest = await announcementRequest(versionedAnnouncementUrl(ANNOUNCEMENT_SOURCE), true);
            const listing = announcementListing(manifest);
            remoteAnnouncementRules = manifest.versionRules || {};
            saveAnnouncementIndex(index);
            installRemoteAnnouncements([...files.values()], yaml);
            let failed = false;
            for (const item of listing) {
                if (!AnnouncementVersions.allows(item.version_rule, announcementClientVersion()) ||
                    !AnnouncementVersions.allows(remoteAnnouncementRules[item.name], announcementClientVersion())) continue;
                if (previewAnnouncements || ConfigManager.disableNetwork) { failed = true; break; }
                const disk = files.get(item.name);
                if (index.get(item.name)?.sha === item.sha256 && disk && valid(disk)) continue;
                try {
                    // A deployment may change between requests. Verify bytes before replacing the cached article.
                    const bytes = new Uint8Array(await announcementRequest(versionedAnnouncementUrl(announcementBase(item.name)), false, true));
                    if (bytes.byteLength !== item.size || await announcementHash(bytes) !== item.sha256) {
                        throw Error('Announcement checksum mismatch.');
                    }
                    const file = { name: item.name, text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), baseUrl: announcementBase(item.name) };
                    if (!valid(file)) throw Error('Invalid announcement Markdown.');
                    if (previewAnnouncements || ConfigManager.disableNetwork) { failed = true; break; }
                    const changed = index.get(item.name)?.sha !== item.sha256;
                    await writeAnnouncementFile(file.name, file.text);
                    files.set(file.name, file);
                    index.set(file.name, { name: file.name, sha: item.sha256 });
                    saveAnnouncementIndex(index);
                    if (changed && announcementAllowed(parseAnnouncement(file.text, file.name, file.baseUrl, yaml))) flagAnnouncementChange();
                    installRemoteAnnouncements([...files.values()], yaml);
                } catch (error) { failed = true; console.warn('[Announcements] Kept local ' + item.name + ':', error.message); }
            }
            if (!failed) deferAnnouncementCheck(ANNOUNCEMENT_INTERVAL);
            // Local announcements accumulate. Remote omissions never delete files or index entries.
        })().catch(error => console.warn('[Announcements] Using local announcements:', error.message))
            .finally(() => { remotePending = null; });
        return remotePending;
    }
    let previewAnnouncements = false;
    function parseAnnouncement(text, name, baseUrl, yaml) {
        const match = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/.exec(text);
        if (!match) return null;
        // single_file keeps each locale's title/body inside the YAML frontmatter.
        const meta = yaml.load(match[1], { schema: yaml.CORE_SCHEMA });
        if (!meta || typeof meta !== 'object') return null;
        const languages = ['zh', 'ja', 'en', 'ru', 'fr', 'vi', 'es', 'pt', 'ko', 'id', 'th', 'uk', 'zh-TW', 'it'];
        const logs = {}, titles = {};
        // Decap may store shared fields only in the default locale (ja).
        const dates = [meta, meta.ja, meta.zh, meta.en].find(data =>
            typeof data?.published_at === 'string' && formatTime(data.published_at, 2));
        if (!dates || (dates.updated_at != null &&
            (typeof dates.updated_at !== 'string' || !formatTime(dates.updated_at, 2)))) return null;
        for (const [id, locale] of languages.entries()) {
            const data = meta.language === locale ? { ...meta, body: match[2] } : meta[locale];
            if (!data || typeof data.title !== 'string' || !data.title.trim() ||
                typeof data.body !== 'string' || !data.body.trim()) continue;
            logs[id] = data.body; titles[id] = data.title.trim();
        }
        if (!Object.keys(logs).length) return null;
        return { id: name, title: Object.values(titles)[0], titles, published_at: dates.published_at,
            updated_at: dates.updated_at || null, version_rule: AnnouncementVersions.fromMeta(meta), format: 'markdown', baseUrl, logs };
    }
    function entryTitle(entry, id = language()) {
        return entry.titles?.[localizedLog(entry, id).language] || entry.title;
    }

    function refreshLocalAnnouncements() {
        if (previewAnnouncements || !Utils.isNwjs?.()) return;
        try {
            const path = require('path'), root = path.dirname(process.mainModule.filename);
            markdown = require(path.join(root, 'js/libs/markdown-it.min.js'));
            installRemoteAnnouncements(readPcAnnouncementFiles(), require(path.join(root, 'js/libs/js-yaml.min.js')));
        } catch (error) { console.warn('[Announcements] Could not read directory:', error.message); }
    }
    const readerLibraries = new Map();
    function loadReaderLibrary(filename, globalName) {
        if (!readerLibraries.has(filename)) readerLibraries.set(filename, new Promise((resolve, reject) => {
            if (window[globalName]) return resolve(window[globalName]);
            if (Utils.isNwjs?.()) {
                try {
                    const path = require('path');
                    resolve(require(path.join(path.dirname(process.mainModule.filename), 'js/libs', filename)));
                } catch (error) { reject(error); }
            } else {
                const script = document.createElement('script');
                script.src = 'js/libs/' + filename;
                script.onload = () => { script.remove(); resolve(window[globalName]); };
                script.onerror = () => { script.remove(); reject(Error('Announcement reader could not load.')); };
                document.head.appendChild(script);
            }
        }).catch(error => { readerLibraries.delete(filename); throw error; }));
        return readerLibraries.get(filename);
    }
    function loadMarkdown() { return loadReaderLibrary('markdown-it.min.js', 'markdownit'); }
    function loadYaml() { return loadReaderLibrary('js-yaml.min.js', 'jsyaml'); }
    let markdown;
    function externalUrl(value, baseUrl) {
        try {
            const url = new URL(value, baseUrl);
            return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
        } catch (_) { return ''; }
    }
    function openLink(value) {
        const url = externalUrl(value);
        if (!url) return false;
        if (Utils.isMobileDevice()) cordova.InAppBrowser.open(url, '_system');
        else require('nw.gui').Shell.openExternal(url);
        return true;
    }
    function renderAnnouncement(text, baseUrl) {
        const parser = markdown({ html: false, breaks: true, linkify: false });
        // No native navigation: pointer/keyboard activation goes through openLink.
        parser.renderer.rules.link_open = (tokens, index) => {
            const url = externalUrl(tokens[index].attrGet('href'), baseUrl);
            return url ? '<span class="link" role="link" tabindex="0" data-url="' + parser.utils.escapeHtml(url) + '">' : '<span>';
        };
        parser.renderer.rules.link_close = () => '</span>';
        parser.block.ruler.before('paragraph', 'announcement_video', (state, start, end, silent) => {
            if (state.sCount[start] - state.blkIndent >= 4) return false;
            const line = state.src.slice(state.bMarks[start] + state.tShift[start], state.eMarks[start]);
            const match = /^@\[video\]\(([^)\r\n]*)\)\s*$/.exec(line);
            if (!match) return false;
            if (!silent) state.push('announcement_video', '', 0).content = match[1];
            state.line = start + 1;
            return true;
        });
        parser.renderer.rules.announcement_video = (tokens, index) => {
            let relative, url;
            try {
                relative = decodeURIComponent(tokens[index].content);
                if (!/^img\/.+\.(mp4|webm)$/i.test(relative) || /[\\?#\x00-\x1f]/.test(relative) ||
                    relative.split('/').some(part => !part || part === '.' || part === '..')) return '';
                url = new URL(tokens[index].content, baseUrl);
            } catch (_) { return ''; }
            const local = url.protocol === 'file:' && baseUrl.startsWith('file:') &&
                url.href.startsWith(new URL('.', baseUrl).href);
            if (!['http:', 'https:'].includes(url.protocol) && !local) return '';
            return '<div class="announcement-video"><div class="video-stage"><video playsinline webkit-playsinline preload="metadata" ' +
                'controlslist="nodownload nofullscreen noremoteplayback" disablepictureinpicture disableremoteplayback src="' +
                parser.utils.escapeHtml(url.href) + '"></video></div><span class="video-error" role="status" hidden></span></div>\n';
        };
        const image = parser.renderer.rules.image;
        parser.renderer.rules.image = (tokens, index, options, env, self) => {
            const token = tokens[index];
            let url;
            try { url = new URL(token.attrGet('src'), baseUrl); } catch (_) { return ''; }
            const localImage = url.protocol === 'file:' && baseUrl.startsWith('file:') &&
                url.href.startsWith(new URL('.', baseUrl).href);
            if (!['http:', 'https:'].includes(url.protocol) && !localImage) return '';
            token.attrSet('src', url.href);
            token.attrSet('draggable', 'false');
            // Cordova's localhost Referer is rejected by the image host's hotlink protection.
            token.attrSet('referrerpolicy', 'no-referrer');
            return image(tokens, index, options, env, self);
        };
        return parser.render(text);
    }
    async function previewLocalAnnouncements() {
        const url = 'http://localhost:8330/api/announcements';
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw Error('Local announcement preview: HTTP ' + response.status);
        const feed = await response.json();
        if (feed.schemaVersion !== 1 || !Array.isArray(feed.entries)) throw Error('Invalid announcement feed.');
        const entries = readableEntries(feed.entries.filter(e => e && typeof e.id === 'string' &&
            typeof e.title === 'string' && e.logs && e.format === 'markdown'), 'announcement')
            .map(e => ({ ...e, baseUrl: 'http://localhost:8330/' }));
        if (!entries.length) return false;
        markdown = await loadMarkdown();
        previewAnnouncements = true;
        CHANNELS.announcement = { enabled: true, read: () => ({ entries }) };
        const scene = SceneManager._scene;
        if (scene instanceof Scene_UpdateLog && scene.acceptsInput()) {
            scene._channel = 'announcement'; scene._expanded = true; scene._listScroll = 0;
            scene.setEntries(entries); return true;
        }
        return open('announcement');
    }

    function readableEntries(entries, channel) {
        const id = language();
        return entries.filter(entry => {
            const text = localizedLog(entry, id).text;
            if (channel !== 'changelog') return announcementAllowed(entry) && !!text.trim();
            const version = /^(\d+)\.(\d+)(?:\.\d+)?(?:[-+].*)?$/.exec(entry.version?.trim() || '');
            const supported = !version || Number(version[1]) > 1 || (Number(version[1]) === 1 && Number(version[2]) >= 2);
            return supported && !!changelogBody(text).trim();
        });
    }

    function wrapText(bitmap, text, width, id) {
        const locale = ['zh-CN','ja','en','ru','fr','vi','es','pt','ko','id','th','uk','zh-TW','it'][id];
        const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(locale, { granularity: 'word' }) : null;
        const lines = [];
        for (const paragraph of String(text).replace(/\r\n?/g, '\n').split('\n')) {
            // Segmenter also handles Thai words. The fallback keeps Latin/Cyrillic words intact.
            const tokens = segmenter ? Array.from(segmenter.segment(paragraph), part => part.segment)
                : paragraph.match(/\s+|[\p{Script=Latin}\p{Script=Cyrillic}\p{N}\p{M}]+(?:['’\-][\p{L}\p{M}\p{N}]+)*|[^\s]\p{M}*/gu) || [];
            let line = '', space = '';
            for (const token of tokens) {
                if (/^\s+$/.test(token)) { space = line ? ' ' : ''; continue; }
                if (line && bitmap.measureTextWidth(line + space + token) > width) { lines.push(line); line = ''; space = ''; }
                if (bitmap.measureTextWidth(token) > width) {
                    for (const char of token.match(/\P{M}\p{M}*|\p{M}+/gu) || []) {
                        if (line && bitmap.measureTextWidth(line + char) > width) { lines.push(line); line = ''; }
                        line += char;
                    }
                } else line += space + token;
                space = '';
            }
            lines.push(line);
        }
        return lines;
    }

    function drawDivider(bitmap, x, y, length, vertical = false) {
        // Match StandaloneCompendium's trajectoryDivider: transparent ends, white center.
        const clear = 'rgba(255,255,255,0)', white = 'rgba(255,255,255,0.55)';
        const width = vertical ? 2 : length / 2, height = vertical ? length / 2 : 2;
        bitmap.gradientFillRect(x, y, width, height, clear, white, vertical);
        bitmap.gradientFillRect(x + (vertical ? 0 : width), y + (vertical ? height : 0),
            width, height, white, clear, vertical);
    }

    class ReaderBitmap extends Bitmap {
        _createCanvas(width, height) {
            this._canvas = document.createElement('canvas');
            this._canvas.width = width; this._canvas.height = height;
            // Keep this reader's small text surfaces CPU-backed. Chromium's
            // accelerated canvas -> WebGL copies can lose glyph tiles on redraw;
            // a CPU surface uploads the complete text without per-frame readback.
            // ImageManager resources and every other scene keep their usual path.
            this._context = this._canvas.getContext('2d', { willReadFrequently: true });
            this._createBaseTexture(this._canvas);
        }
    }

    class Scene_UpdateLog extends Scene_Base {
        initialize() {
            super.initialize();
            this._channel = 'changelog';
            this._ownedBitmaps = [];
            this._entries = [];
            this._lines = [];
            this._selected = -1;
            this._expanded = true;
            this._listScroll = 0;
            this._bodyScroll = 0;
            this._bodyMax = 0;
            this._closing = false;
            this._listeners = [];
            this._videoPointers = new Map();
        }
        prepare(channel, entries) { this._channel = channel; this._entries = entries; }
        useParticleSystem() { return false; }
        bitmap(width, height) {
            const b = new ReaderBitmap(width, height);
            b.fontFace = $gameSystem.mainFontFace(); b.fontSize = 24; b.outlineWidth = 0; b.smooth = true;
            this._ownedBitmaps.push(b);
            return b;
        }
        add(bitmap, x, y, parent = this._root) {
            const s = new Sprite(bitmap); s.move(x, y); parent.addChild(s); return s;
        }
        create() {
            super.create();
            this._announcementRevision = announcementRevision;
            this._language = language(); this._text = labels(this._language);
            this._languageTable = window.mapCommonEventDialogue;
            this._platform = Utils.isMobileDevice() ? 'android' : 'pc';
            this._background = this.add(SceneManager.backgroundBitmap(), 0, 0, this);
            this._blur = new PIXI.filters.BlurFilter(4); this._background.filters = [this._blur];
            const shade = this.bitmap(Graphics.width, Graphics.height); shade.fillAll('rgba(0,0,0,0.4)'); this.add(shade, 0, 0, this);
            this._root = new Sprite();
            const scale = Math.min(Graphics.width / L.width, Graphics.height / L.height);
            this._root.scale.set(scale);
            this._root.move((Graphics.width - L.width * scale) / 2, (Graphics.height - L.height * scale) / 2);
            this.addChild(this._root);
            this.createFrame();
            this._decoration = this.add(ImageManager.loadBitmap('img/system/', 'changelogScene'), L.panel.x + 40, L.panel.y + 40);
            this._decoration.opacity = 255;
            this._chrome = this.add(this.bitmap(L.width, L.height), 0, 0);
            this._list = this.add(this.bitmap(L.list.width, L.list.height), L.list.x, L.list.y);
            this._body = this.add(this.bitmap(L.body.width, L.body.height), L.body.x, L.body.y);
            this._header = this.add(this.bitmap(1280, 168), 538, 110);
            this._footer = this.add(this.bitmap(1680, 38), 120, 964);
            this.createArrows();
            this.setEntries(this._entries);
        }
        createFrame() {
            const p = L.panel, frame = this.add(null, p.x, p.y); frame.opacity = 200;
            const xs = [0, 49, p.width - 50], ys = [0, 48, p.height - 49];
            const widths = [49, p.width - 99, 50], heights = [48, p.height - 97, 49];
            for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
                const source = ImageManager.loadBitmap('img/system/Saikey_HoverWindow/', 'nine/' + row + col);
                const part = this.add(source, xs[col], ys[row], frame); part.roundPixels = false;
                source.addLoadListener(() => {
                    if (!part._destroyed) part.scale.set(widths[col] / source.width, heights[row] / source.height);
                });
            }
        }
        createArrows() {
            const b = this.bitmap(192, 192), c = b.context;
            c.save(); c.scale(3, 3); c.strokeStyle = '#ffffff'; c.lineWidth = 5;
            c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
            c.moveTo(24, 12); c.lineTo(44, 32); c.lineTo(24, 52); c.stroke(); c.restore(); b.baseTexture.update();
            this._arrows = [-1, 1].map(direction => {
                const arrow = { direction, x: L.body.x + L.body.width / 2, y: direction < 0 ? 242 : 942 };
                arrow.sprite = this.add(b, arrow.x, arrow.y); arrow.sprite.anchor.set(0.5);
                arrow.sprite.scale.set(1 / 3); arrow.sprite.rotation = direction * Math.PI / 2;
                arrow.sprite.alpha = 0.6; arrow.sprite.visible = false;
                return arrow;
            });
        }
        start() {
            super.start(); Input.clear(); clearPointerInput(); this.bindInput();
            this.createEasterEgg();
            // Use Drill's actual API on this private Scene_Base, as the compendium
            // does. Do not run Scene_MenuBase's unrelated menu hooks.
            if (!this._drill_MBB_sprites && typeof Scene_MenuBase !== 'undefined' &&
                    typeof Scene_MenuBase.prototype.drill_MBB_create === 'function') {
                for (const name of ['create', 'update', 'checkKeyword', 'isOnHighlight', 'isOnTouchSprite',
                    'layerAddSprite', 'layerAddSprite_Private', 'layerRemoveSprite', 'layerRemoveSprite_Private',
                    'sortByZIndex', 'sortByZIndex_Private']) {
                    this['drill_MBB_' + name] = Scene_MenuBase.prototype['drill_MBB_' + name];
                }
                this._backgroundSprite = this._background;
                this._foregroundSprite = new Sprite(); this.addChild(this._foregroundSprite);
                const hadFlag = Object.prototype.hasOwnProperty.call(SceneManager, '_drill_MBB_created');
                const previousFlag = SceneManager._drill_MBB_created;
                try { this.drill_MBB_create(); }
                finally {
                    if (hadFlag) SceneManager._drill_MBB_created = previousFlag;
                    else delete SceneManager._drill_MBB_created;
                }
            }
            // Fonts are ready now, including language fonts loaded by the host game.
            this.rebuildBody(); this.drawChrome(); this.drawList();
            this._noticeReadStarted = true;
        }
        createEasterEgg() {
            if (this._easterEgg) return;
            const video = document.createElement('video');
            video.muted = true; video.volume = 0; video.loop = true;
            video.playsInline = true; video.setAttribute('webkit-playsinline', '');
            video.preload = 'auto'; video.src = 'movies/dancingImouto_8.webm';
            // Like the gallery, play through a PIXI video texture. This plain
            // WebM needs no MoviePicture path rewriting or video Bitmap adapter.
            const resource = new PIXI.VideoResource(video, { autoLoad: false, autoPlay: false });
            const texture = new PIXI.Texture(new PIXI.BaseTexture(resource));
            const sprite = new PIXI.Sprite(texture);
            sprite.anchor.set(1); 
            sprite.visible = false;
            sprite.x = Graphics.width * 0.2; 
            sprite.y = Graphics.height;
            this.addChild(sprite);
            const egg = { video, resource, sprite, ready: false,
                onError: () => this.destroyEasterEgg(),
                onEnded: () => { if (this._easterEgg === egg && !video.loop) sprite.visible = false; },
                onPlaying: () => {
                    if (this._easterEgg !== egg || this._closing || !egg.ready) return;
                    // Upload the resumed frame before revealing, not the old final frame.
                    resource.update(); sprite.visible = true;
                }
            };
            this._easterEgg = egg;
            video.addEventListener('error', egg.onError);
            video.addEventListener('ended', egg.onEnded);
            video.addEventListener('playing', egg.onPlaying);
            resource.load().then(() => {
                if (this._closing || this._easterEgg !== egg) return;
                // Visible bounds across all frames of this fixed 864×864 asset.
                // Trim only transparent padding; never track each dancing pose.
                texture.frame = new PIXI.Rectangle(82, 174, 703, 690);
                sprite.scale.set(this._root.scale.x * 0.5);
                egg.ready = true;
                sprite.visible = true;
                this.updateEasterEggHover();
                video.play().catch(() => {
                    if (this._easterEgg === egg) this.destroyEasterEgg();
                });
            });
        }
        trackVideoPointer(event, released = false) {
            if (released && event.pointerType === 'touch') this._videoPointers.delete(event.pointerId);
            else this._videoPointers.set(event.pointerId, {
                x: Graphics.pageToCanvasX(event.pageX), y: Graphics.pageToCanvasY(event.pageY)
            });
            this.updateEasterEggHover();
        }
        updateEasterEggHover() {
            const egg = this._easterEgg;
            if (!egg?.ready || this._closing) return;
            const bounds = egg.sprite.getBounds();
            const inside = [...this._videoPointers.values()].some(point => contains(bounds, point));
            const video = egg.video;
            if (video.loop === !inside) return;
            const stopped = video.paused || video.ended;
            const ended = video.ended;
            video.loop = !inside;
            // Entering only disables looping: let the current pass finish.
            // Leaving resumes an ended pass, or lets a running pass keep going.
            if (!inside && stopped) {
                if (ended) video.currentTime = 0;
                video.play().catch(() => {
                    if (this._easterEgg === egg) this.destroyEasterEgg();
                });
            }
        }
        destroyEasterEgg() {
            const egg = this._easterEgg;
            if (!egg) return;
            this._easterEgg = null;
            const { video, resource, sprite, onError, onEnded, onPlaying } = egg;
            video.removeEventListener('error', onError);
            video.removeEventListener('ended', onEnded);
            video.removeEventListener('playing', onPlaying);
            // PIXI 5 does not remove pending readiness callbacks in dispose().
            video.removeEventListener('canplay', resource._onCanPlay);
            video.removeEventListener('canplaythrough', resource._onCanPlay);
            video.pause();
            this.removeChild(sprite);
            sprite.destroy({ texture: true, baseTexture: true });
            if (!resource.destroyed) resource.destroy();
            resource._resolve = null;
            video.removeAttribute('src'); video.load();
        }
        setEntries(entries) {
            const selectedId = this._entries[this._selected]?.id;
            entries = readableEntries(entries, this._channel);
            this._entries = entries;
            const retained = entries.findIndex(e => e.id === selectedId);
            this._selected = retained >= 0 ? retained : entries.length ? 0 : -1;
            this._listScroll = clamp(this._listScroll, 0, this.listMax());
            this.rebuildBody(); this.drawChrome(); this.drawList();
        }
        text(b, text, x, y, width, size, color = COLOR.text, align = 'left') {
            b.fontSize = size; b.textColor = color;
            b.drawText(text, x, y, width, size + 12, align);
        }
        accentColor(channel = this._channel) {
            return channel === 'announcement' ? COLOR.announcement : COLOR.cyan;
        }
        listRect() {
            if (this._channel !== 'announcement') return L.list;
            return { ...L.list, y: L.announcement.y + 60,
                height: Math.min(L.list.height, this._entries.length * L.rowHeight) };
        }
        channelRect(channel) {
            if (channel === 'changelog' && this._channel === 'announcement' && this._expanded) {
                const list = this.listRect();
                return { ...L.changelog, y: list.y + list.height + 20 };
            }
            return L[channel];
        }
        drawChrome() {
            const b = this._chrome.bitmap, t = this._text; b.clear();
            drawDivider(b, 486, 142, 790, true);
            drawDivider(b, 546, 211, 1220);
            for (const channel of ['announcement', 'changelog']) {
                const r = this.channelRect(channel), enabled = CHANNELS[channel].enabled;
                const active = channel === this._channel, expanded = active && this._expanded;
                const color = !enabled ? '#888b84' : active ? this.accentColor(channel) : COLOR.text;
                this.text(b, expanded ? '▾' : '▸', r.x, r.y + 4, 22, 22, color);
                this.text(b, t[channel], r.x + 30, r.y, r.width - 54, 26, color);
                if (active) b.fillRect(r.x - 12, r.y + 3, 3, 40, this.accentColor(channel));
            }
            this.drawFooter();
        }
        drawFooter() {
            const b = this._footer.bitmap; b.clear();
            this.text(b, this._text.hint, 0, 0, b.width, 18, '#aaa99f', 'center');
        }
        listMax() { return Math.max(0, this._entries.length * L.rowHeight - this.listRect().height); }
        drawList() {
            const b = this._list.bitmap, rect = this.listRect(), accent = this.accentColor(); b.clear();
            this._list.move(rect.x, rect.y);
            this._list.setFrame(0, 0, rect.width, rect.height);
            this._listScroll = clamp(this._listScroll, 0, this.listMax());
            if (!this._expanded) return;
            this._entries.forEach((entry, index) => {
                const y = index * L.rowHeight - this._listScroll;
                if (y + L.rowHeight <= 0 || y >= rect.height) return;
                const selected = index === this._selected;
                if (selected) {
                    b.fillRect(0, y, b.width - 12, L.rowHeight - 4, this._channel === 'announcement' ? 'rgba(254,216,63,0.09)' : 'rgba(64,215,255,0.09)');
                    b.fillRect(0, y + 8, 3, L.rowHeight - 20, accent);
                }
                this.text(b, entryTitle(entry, this._language), 18, y + 6, b.width - 42, 28, selected ? accent : COLOR.text);
                this.text(b, formatTime(entry.updated_at) || formatTime(entry.published_at) || this._text.unknown,
                    18, y + 45, b.width - 42, 18, COLOR.muted);
            });
            const max = this.listMax();
            if (max) {
                const h = rect.height * rect.height / (max + rect.height);
                b.fillRect(b.width - 3, 0, 2, rect.height, 'rgba(255,255,255,0.15)');
                b.fillRect(b.width - 3, (rect.height - h) * this._listScroll / max, 2, h, accent);
            }
        }
        rebuildBody() {
            this.destroyAnnouncementReader();
            const b = this._body.bitmap, header = this._header.bitmap, t = this._text;
            header.clear(); this._lines = []; this._bodyScroll = 0; this._translationButton = null; this._updateButton = null;
            const entry = this._entries[this._selected];
            if (!entry) {
                this._bodyMax = 0; b.clear();
                return;
            }
            const heading = this._channel === 'changelog' ? t[updateType(entry)] : t[this._channel];
            this.text(header, heading, 8, 0, 1000, 20, COLOR.muted);
            const translated = this._translationSelection?.entry === entry && this._translationSelection.language === this._language;
            const localized = localizedLog(entry, this._language, translated);
            const changelog = this._channel === 'changelog' ? parseChangelog(localized.text) : null;
            const title = entryTitle(entry, this._language) + (changelog?.revision ? ' ' + changelog.revision : '');
            this.text(header, title, 8, 32, 880, 44);
            if (hasNewerRevision(entry, changelog)) {
                const x = 8, width = 540;
                this.text(header, t.clickToUpdate, x, 120, width, 24, COLOR.cyan);
                const textWidth = Math.min(width, header.measureTextWidth(t.clickToUpdate));
                header.fillRect(x, 154, textWidth, 1, COLOR.cyan);
                this._updateButton = { x: this._header.x + x - 8, y: this._header.y + 114,
                    width: textWidth + 16, height: 46 };
            }
            if (this._channel === 'changelog' && this._language > 2) {
                // Reuse the old reader's language-specific label and the announcement notice's layout.
                const label = translated ? (this._language === 12 && localizedLog(entry, 12).language === 0 ? '簡體中文' : 'English') :
                    (typeof CHANGELOG_MACHINE_TRANSLATION_BUTTON_TEXT !== 'undefined' &&
                        CHANGELOG_MACHINE_TRANSLATION_BUTTON_TEXT[this._language]) || 'Machine Translation';
                this.text(header, label, 880, 68, 360, 17, COLOR.muted, 'right');
                const width = Math.min(360, header.measureTextWidth(label));
                this._translationButton = { x: this._header.x + 1240 - width - 8,
                    y: this._header.y + 64, width: width + 16, height: 37 };
            } else if (localized.language !== this._language) {
                const notice = localized.language === null ? 'Older cache (language unknown)' : 'Showing: ' + LANGUAGE_NAMES[localized.language];
                this.text(header, notice, 880, 68, 360, 17, COLOR.muted, 'right');
            }
            if (this._channel === 'announcement' && entry.format === 'markdown') {
                b.clear(); this._bodyMax = 0;
                this.createAnnouncementReader(entry, localized.text); return;
            }
            let y = 0;
            const append = (text, size, color, lineHeight) => {
                b.fontSize = size;
                for (const line of wrapText(b, text, b.width - 24, this._language)) {
                    this._lines.push({ text: line, y, size, color, height: lineHeight }); y += lineHeight;
                }
            };
            append(t.published + ': ' + (formatTime(entry.published_at) || t.unknown), 20, COLOR.muted, 32);
            append(t.updated + ': ' + (formatTime(entry.updated_at) || t.unknown), 20, COLOR.muted, 32);
            if (this._channel === 'changelog') append(t.from + ': ' + (fromVersions(entry.from_list) || t.notProvided), 20, COLOR.muted, 32);
            y += 22; this._lines.push({ rule: true, y, height: 1 }); y += 28;
            const body = changelog ? changelog.body : localized.text;
            append(body, 26, COLOR.text, 42);
            this._bodyMax = Math.max(0, y + 8 - b.height);
            this.drawBody();
        }
        async showRevisionUpdate() {
            const entry = this._entries[this._selected];
            if (!this.acceptsInput() || !this._updateButton || this._channel !== 'changelog' ||
                ConfigManager.disableNetwork || !window.chahuiUtil?.showUpdateNotification) return;
            this._updatePending = true;
            this.cancelPointer(); Input.clear(); this._mouse = null;
            SoundManager.playCursor();
            try {
                // Pass this entry's source log without replacing the updater's latest-version log.
                await chahuiUtil.showUpdateNotification(entry.version, { log: localizedLog(entry, this._language).text });
            } catch (error) {
                console.warn('[StandaloneUpdateLog] Revision update unavailable.', error);
            } finally {
                this._updatePending = false;
                Input.clear(); clearPointerInput();
            }
        }
        async toggleMachineTranslation() {
            const entry = this._entries[this._selected], id = this._language;
            if (!this.acceptsInput() || this._channel !== 'changelog' || id <= 2 || !entry || this._translationPending) return;
            if (this._translationSelection?.entry === entry && this._translationSelection.language === id) {
                this._translationSelection = null; SoundManager.playCursor(); this.rebuildBody(); return;
            }
            const hasTranslation = value => typeof value?.logs?.[id] === 'string' && value.logs[id].trim();
            let updated = entry;
            // Like arrangeDisplayChangelog, fetch only on explicit request when the translation is missing.
            if (!hasTranslation(updated) && !ConfigManager.disableNetwork && window.chahuiUtil?.fetchAndCacheChangelogs) {
                this._translationPending = true;
                try {
                    await window.chahuiUtil.fetchAndCacheChangelogs();
                    updated = readChangelogs(this._platform).entries.find(value => value.id === entry.id);
                } catch (error) { console.warn('[StandaloneUpdateLog] Machine translation unavailable.', error); }
                finally { this._translationPending = false; }
            }
            // A response for a previous version/language must not replace the current reading page.
            if (!this.acceptsInput()) return;
            if (this._channel !== 'changelog' || this._entries[this._selected] !== entry || this._language !== id || language() !== id) {
                return;
            }
            if (hasTranslation(updated)) {
                this._entries[this._selected] = updated;
                this._translationSelection = { entry: updated, language: id };
                SoundManager.playCursor();
            } else SoundManager.playBuzzer?.();
            this.rebuildBody();
        }
        drawBody() {
            const b = this._body.bitmap; b.clear();
            if (this._announcementReader) {
                this._announcementContent.style.transform = `translateY(${-this._bodyScroll}px)`;
            } else for (const line of this._lines) {
                const y = line.y - this._bodyScroll;
                if (y + line.height <= 0 || y >= b.height) continue;
                if (line.rule) drawDivider(b, 0, y, b.width - 24);
                else this.text(b, line.text, 0, y, b.width - 24, line.size, line.color);
            }
            if (this._bodyMax) {
                const h = Math.max(24, b.height * b.height / (this._bodyMax + b.height));
                b.fillRect(b.width - 3, 0, 2, b.height, 'rgba(255,255,255,0.1)');
                b.fillRect(b.width - 3, (b.height - h) * this._bodyScroll / this._bodyMax, 2, h, 'rgba(255,255,255,0.45)');
            }
        }
        createAnnouncementReader(entry, text) {
            const host = document.createElement('div');
            host.id = 'standalone-announcement-reader';
            Object.assign(host.style, { position: 'fixed', zIndex: '100', overflow: 'hidden',
                width: L.body.width + 'px', height: L.body.height + 'px', transformOrigin: '0 0', touchAction: 'none',
                fontFamily: $gameSystem.mainFontFace() });
            // Shadow styles cannot change other game UI. Markdown raw HTML is disabled.
            const shadow = host.attachShadow({ mode: 'open' });
            const style = document.createElement('style');
            style.textContent = `:host{color:#e8e6df;font:26px/1.65 sans-serif;user-select:none}
                article{padding:0 24px 12px 0;overflow-wrap:anywhere} p{margin:0 0 20px}
                h1,h2,h3,h4,h5,h6{line-height:1.4;margin:24px 0 16px} h1{font-size:36px} h2{font-size:32px}
                img{display:block;max-width:100%;height:auto;margin:20px auto;pointer-events:none}
                .announcement-video{margin:20px 0;touch-action:manipulation}
                video{display:block;width:100%;max-height:480px;background:#000;touch-action:manipulation}
                .video-stage{position:relative;background:#000}
                .announcement-video button{appearance:none;display:grid;place-items:center;color:#fff;border:0;cursor:pointer;touch-action:manipulation}
                .announcement-video button:focus-visible,.announcement-video input:focus-visible{outline:3px solid #fff;outline-offset:3px}
                .video-toggle{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:max(120px,calc(64px * var(--video-ui-scale,1)));height:max(120px,calc(64px * var(--video-ui-scale,1)));border-radius:50%;background:#0009;box-shadow:0 0 0 2px #ffffff80;transition:opacity .15s}
                .video-toggle svg{width:52%;height:52%;fill:#fff}
                .video-stage.is-playing .video-toggle{opacity:0}
                .video-stage.is-playing .video-toggle:focus-visible{opacity:1}
                @media(hover:hover){.video-stage.is-playing:hover .video-toggle{opacity:1}}
                .video-toolbar{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:center;gap:16px;background:#111d;color:#fff;padding:8px 16px}
                .video-time{font: max(22px,calc(14px * var(--video-ui-scale,1))) sans-serif;white-space:nowrap;font-variant-numeric:tabular-nums}
                .video-mute{flex-shrink:0;width:max(64px,calc(44px * var(--video-ui-scale,1)));height:max(64px,calc(44px * var(--video-ui-scale,1)));background:transparent}
                .video-mute svg{width:60%;height:60%;fill:#fff;stroke:#fff}
                .video-seek{appearance:none;-webkit-appearance:none;min-width:0;flex:1;margin:0;height:max(56px,calc(44px * var(--video-ui-scale,1)));background:transparent;cursor:pointer;touch-action:none;accent-color:#fff}
                .video-seek::-webkit-slider-runnable-track{height:6px;background:#777;border-radius:3px}
                .video-seek::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:max(24px,calc(18px * var(--video-ui-scale,1)));height:max(24px,calc(18px * var(--video-ui-scale,1)));border-radius:50%;background:#fff;margin-top:calc((6px - max(24px,calc(18px * var(--video-ui-scale,1)))) / 2)}
                .video-volume{flex:0 1 120px;max-width:18%}
                .video-seek:disabled{opacity:.4}
                .video-error{font-size:20px;color:#ffd0c8}.video-error[hidden]{display:none}
                ul,ol{padding-left:36px} blockquote{margin:20px 0;padding-left:20px;border-left:3px solid #40d7ff}
                pre{white-space:pre-wrap;background:#ffffff12;padding:16px} code{font-size:.9em}
                table{border-collapse:collapse;max-width:100%} td,th{padding:8px;border:1px solid #ffffff40}
                .link{color:#40d7ff;text-decoration:underline;cursor:pointer} .link:focus-visible{outline:1px solid currentColor}
                .dates{font-size:20px;color:#afa98f;white-space:pre-line}
                .announcement-meta{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}
                .views{display:inline-flex;align-items:center;gap:8px;flex-shrink:0;font-size:20px;color:#afa98f;white-space:nowrap}
                .views[hidden]{display:none}.views svg{width:22px;height:22px}
                hr{height:1px;border:0;margin:24px 0;background:linear-gradient(90deg,transparent,#ffffff45,transparent)}`;
            const content = document.createElement('article');
            content.setAttribute('aria-label', entryTitle(entry, this._language));
            const dates = document.createElement('div'); dates.className = 'dates';
            dates.textContent = this._text.published + ': ' + (formatTime(entry.published_at) || this._text.unknown);
            if (entry.updated_at) dates.textContent += '\n' + this._text.updated + ': ' + (formatTime(entry.updated_at) || this._text.unknown);
            const body = document.createElement('div'); body.innerHTML = renderAnnouncement(text, entry.baseUrl);
            this._announcementVideos = Array.from(body.querySelectorAll('video'));
            for (const video of this._announcementVideos) this.setupAnnouncementVideo(video);
            // Player controls receive input; game document listeners must not receive those gestures.
            for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'touchstart',
                'touchmove', 'touchend', 'touchcancel', 'mousedown', 'mousemove', 'mouseup', 'click',
                'dblclick', 'keydown', 'keyup', 'contextmenu']) {
                shadow.addEventListener(type, event => {
                    if (this.announcementVideo(event)) event.stopPropagation();
                });
            }
            const meta = document.createElement('div'); meta.className = 'announcement-meta';
            const views = document.createElement('span'); views.className = 'views'; views.hidden = true;
            views.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
            const count = document.createElement('span'); views.append(count);
            meta.append(dates, views);
            content.append(meta, document.createElement('hr'), body); shadow.append(style, content);
            this._announcementReader = host; this._announcementContent = content;
            document.body.appendChild(host);
            this.beginAnnouncementViews(entry, host, views, count);
            this._readerResize = new ResizeObserver(() => {
                if (this._announcementReader !== host) return;
                this.layoutAnnouncementReader();
                this._bodyMax = Math.max(0, content.offsetHeight - L.body.height);
                this._bodyScroll = clamp(this._bodyScroll, 0, this._bodyMax); this.drawBody();
            });
            this._readerResize.observe(content);
            this._readerResize.observe(Graphics._canvas);
            this.layoutAnnouncementReader();
        }
        setupAnnouncementVideo(video) {
            const stage = video.parentElement, player = stage.parentElement;
            const zh = this._language === 0, ja = this._language === 1;
            const labels = zh ? ['播放', '暂停', '静音', '取消静音', '播放进度'] :
                ja ? ['再生', '一時停止', 'ミュート', 'ミュート解除', '再生位置'] :
                ['Play', 'Pause', 'Mute', 'Unmute', 'Playback position'];
            const button = document.createElement('button'); button.type = 'button'; button.className = 'video-toggle';
            const toolbar = document.createElement('div'); toolbar.className = 'video-toolbar';
            const time = document.createElement('span'); time.className = 'video-time';
            const seek = document.createElement('input'); seek.type = 'range'; seek.className = 'video-seek';
            seek.min = '0'; seek.max = '100'; seek.step = '0.1'; seek.value = '0'; seek.disabled = true;
            seek.setAttribute('aria-label', labels[4]);
            const mute = document.createElement('button'); mute.type = 'button'; mute.className = 'video-mute';
            const volume = document.createElement('input'); volume.type = 'range'; volume.className = 'video-seek video-volume';
            volume.min = '0'; volume.max = '1'; volume.step = '0.05';
            volume.setAttribute('aria-label', zh ? '音量' : ja ? '音量' : 'Volume');
            const svg = path => '<svg viewBox="0 0 24 24" aria-hidden="true">' + path + '</svg>';
            const stamp = seconds => {
                const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
                return Math.floor(value / 60) + ':' + String(value % 60).padStart(2, '0');
            };
            const showError = () => {
                const message = player.querySelector('.video-error');
                message.textContent = zh ? '视频无法播放，请检查网络或视频格式。' :
                    ja ? '動画を再生できません。通信状況または動画形式をご確認ください。' : 'Cannot play video. Check the connection or video format.';
                message.hidden = false;
            };
            const toggle = () => {
                if (video.paused || video.ended) {
                    if (video.ended) video.currentTime = 0;
                    video.play().catch(error => { if (error.name !== 'AbortError' && video.isConnected) showError(); });
                } else video.pause();
            };
            const update = () => {
                const playing = !video.paused && !video.ended;
                stage.classList.toggle('is-playing', playing);
                if (button.getAttribute('aria-label') !== labels[playing ? 1 : 0]) {
                    button.setAttribute('aria-label', labels[playing ? 1 : 0]);
                    button.innerHTML = svg(playing ? '<path d="M6 4h4v16H6zm8 0h4v16h-4z"/>' : '<path d="M8 4v16l13-8z"/>');
                }
                const duration = video.duration;
                seek.disabled = !Number.isFinite(duration) || duration <= 0;
                if (!scrubbing) seek.value = seek.disabled ? '0' : String(video.currentTime / duration * 100);
                time.textContent = stamp(video.currentTime) + ' / ' + stamp(duration);
                seek.setAttribute('aria-valuetext', time.textContent);
                volume.value = String(video.muted ? 0 : video.volume);
                if (mute.getAttribute('aria-label') === labels[video.muted ? 3 : 2]) return;
                mute.setAttribute('aria-label', labels[video.muted ? 3 : 2]);
                mute.setAttribute('aria-pressed', String(video.muted));
                mute.innerHTML = svg('<path d="M3 9h4l5-4v14l-5-4H3z"/>' + (video.muted ?
                    '<path d="m16 9 6 6m0-6-6 6" fill="none" stroke-width="2"/>' :
                    '<path d="M16 8q5 4 0 8m3-11q8 7 0 14" fill="none" stroke-width="2"/>'));
            };
            let scrubbing = false;
            seek.addEventListener('pointerdown', event => { scrubbing = true; seek.setPointerCapture(event.pointerId); });
            const endSeek = () => { scrubbing = false; update(); };
            seek.addEventListener('pointerup', endSeek); seek.addEventListener('pointercancel', endSeek);
            seek.addEventListener('lostpointercapture', endSeek);
            seek.addEventListener('input', () => {
                if (Number.isFinite(video.duration) && video.duration > 0) video.currentTime = Number(seek.value) / 100 * video.duration;
                update();
            });
            button.addEventListener('click', toggle); video.addEventListener('click', toggle);
            mute.addEventListener('click', () => { video.muted = !video.muted; });
            volume.addEventListener('input', () => { video.volume = Number(volume.value); video.muted = video.volume === 0; });
            for (const event of ['play','pause','ended','loadedmetadata','durationchange','timeupdate','volumechange','emptied']) video.addEventListener(event, update);
            for (const event of ['play', 'pause', 'ended', 'error', 'emptied']) video.addEventListener(event, () => this.syncAnnouncementBgm());
            video.addEventListener('error', showError);
            toolbar.append(time, seek, mute, volume); stage.append(button, toolbar);
            this.bindAnnouncementVideoDrag(video, button, toolbar);
            update();
            const localLoad = this.prepareLocalAnnouncementVideo(video);
            if (localLoad) {
                button.disabled = true;
                localLoad.catch(error => {
                    if (error.name !== 'AbortError' && video.isConnected) showError();
                }).finally(() => { button.disabled = false; });
            }
        }
        bindAnnouncementVideoDrag(video, button, toolbar) {
            const stage = video.parentElement;
            stage.style.touchAction = 'none';
            let gesture = null, suppressClick = false;
            stage.addEventListener('pointerdown', event => {
                if (event.button !== 0 || gesture || event.composedPath().includes(toolbar)) return;
                suppressClick = false;
                gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, lastY: event.clientY, dragged: false };
                // Capture on the original control so a tap still clicks the play button/video.
                const target = event.composedPath().includes(button) ? button : video;
                target.setPointerCapture(event.pointerId);
            });
            stage.addEventListener('pointermove', event => {
                if (!gesture || gesture.id !== event.pointerId) return;
                if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) >= 8) gesture.dragged = true;
                if (!gesture.dragged) return;
                event.preventDefault(); suppressClick = true;
                const scale = this._announcementReader.getBoundingClientRect().height / L.body.height;
                this.scroll('body', (gesture.lastY - event.clientY) / scale);
                gesture.lastY = event.clientY;
            });
            const end = event => {
                if (gesture?.id !== event.pointerId) return;
                suppressClick = gesture.dragged || event.type === 'pointercancel';
                gesture = null;
            };
            stage.addEventListener('pointerup', end);
            stage.addEventListener('pointercancel', end);
            stage.addEventListener('lostpointercapture', end);
            stage.addEventListener('click', event => {
                if (suppressClick && event.detail !== 0) {
                    event.preventDefault(); event.stopImmediatePropagation(); suppressClick = false;
                }
            }, true);
        }
        syncAnnouncementBgm() {
            const playing = (this._announcementVideos || []).some(video => !video.paused && !video.ended && !video.error);
            if (playing) {
                if (!this._announcementBgm) {
                    // Own this snapshot instead of overwriting Game_System's event BGM cache.
                    this._announcementBgm = AudioManager.saveBgm();
                    // During async reload, seek() has no valid clock yet. A quick
                    // second play must preserve the requested resume position.
                    if (AudioManager._bgmBuffer && !AudioManager._bgmBuffer.isReady()) {
                        this._announcementBgm.pos = AudioManager._currentBgm.pos || 0;
                    }
                    if (this._announcementBgm.name) AudioManager.stopBgm();
                }
                return;
            }
            if (!this._announcementBgm || this._announcementBackground || document.visibilityState === 'hidden') return;
            const saved = this._announcementBgm; this._announcementBgm = null;
            // A later scene/event may have deliberately selected a different track.
            if (saved.name && !AudioManager._currentBgm?.name) AudioManager.replayBgm(saved);
        }
        prepareLocalAnnouncementVideo(video) {
            // Cordova's private-file server does not support byte ranges. A Blob URL
            // gives Android a seekable local source; published HTTP videos still stream.
            if (!window.cordova?.file) return null;
            const source = new URL(video.src);
            if (source.origin !== window.location.origin || !source.pathname.startsWith('/__cdvfile_files__/')) return null;
            const controller = new AbortController();
            video._announcementLoadAbort = controller;
            video.removeAttribute('src'); video.load();
            return fetch(source.href, { signal: controller.signal }).then(response => {
                if (!response.ok) throw Error('Local video could not be loaded.');
                return response.blob();
            }).then(blob => {
                if (controller.signal.aborted || !video.isConnected) return;
                video._announcementObjectUrl = URL.createObjectURL(blob);
                video.src = video._announcementObjectUrl;
            });
        }
        beginAnnouncementViews(entry, host, badge, count) {
            // Local files and editor previews are not published article reads.
            if (previewAnnouncements || !savedAnnouncements().some(file => file.name === entry.id)) return;
            const state = { id: entry.id, host, badge, count, visibleSince: null, requested: false };
            this._announcementViews = state;
            const cached = cachedAnnouncementViews(entry.id);
            if (cached) this.drawAnnouncementViews(state, cached.views);
        }
        drawAnnouncementViews(state, views) {
            state.count.textContent = views.toLocaleString('en-US');
            state.badge.setAttribute('aria-label', 'Views: ' + state.count.textContent);
            state.badge.hidden = views <= 0;
        }
        updateAnnouncementViews() {
            const state = this._announcementViews;
            if (!state || state.requested || !this._noticeReadStarted) return;
            if (!this.acceptsInput() || ConfigManager.disableNetwork || document.visibilityState === 'hidden' ||
                (document.hasFocus && !document.hasFocus())) { state.visibleSince = null; return; }
            const now = performance.now();
            if (state.visibleSince === null) state.visibleSince = now;
            if (now - state.visibleSince < 2000) return;
            state.requested = true;
            const readOnly = Utils.isOptionValid?.('test') || Utils.isOptionValid?.('announcement-local-preview');
            fetchAnnouncementViews(state.id, !!readOnly).then(views => {
                if (this._announcementViews === state && this._announcementReader === state.host && !this._closing) {
                    this.drawAnnouncementViews(state, views);
                }
            }).catch(() => { /* Keep cached counts; retry only on a later opening. */ });
        }
        layoutAnnouncementReader() {
            const host = this._announcementReader;
            if (!host) return;
            const canvas = Graphics._canvas.getBoundingClientRect(), root = this._root;
            const sx = canvas.width / Graphics.width, sy = canvas.height / Graphics.height;
            const layout = [canvas.left + (root.x + L.body.x * root.scale.x) * sx,
                canvas.top + (root.y + L.body.y * root.scale.y) * sy, root.scale.x * sx, root.scale.y * sy];
            const key = layout.join(',');
            if (key === this._readerLayout) return;
            this._readerLayout = key;
            host.style.left = layout[0] + 'px'; host.style.top = layout[1] + 'px';
            host.style.transform = `scale(${layout[2]},${layout[3]})`;
            host.style.setProperty('--video-ui-scale', String(1 / Math.min(layout[2], layout[3])));
        }
        pauseAnnouncementVideos() {
            for (const video of this._announcementVideos || []) video.pause();
            this.syncAnnouncementBgm();
        }
        destroyAnnouncementReader() {
            for (const video of this._announcementVideos || []) {
                video._announcementLoadAbort?.abort();
                video.pause(); video.removeAttribute('src'); video.load();
                if (video._announcementObjectUrl) URL.revokeObjectURL(video._announcementObjectUrl);
            }
            this._announcementVideos = [];
            this.syncAnnouncementBgm();
            this._announcementViews = null;
            this._readerResize?.disconnect(); this._readerResize = null;
            this._announcementReader?.remove(); this._announcementReader = null;
            this._announcementContent = null; this._readerLayout = null;
        }
        select(index) {
            if (index < 0 || index >= this._entries.length || index === this._selected) return;
            this._selected = index; this._translationSelection = null; SoundManager.playCursor();
            const top = index * L.rowHeight, bottom = top + L.rowHeight;
            this._listScroll = clamp(Math.min(top, Math.max(this._listScroll, bottom - this.listRect().height)), 0, this.listMax());
            this.rebuildBody(); this.drawList();
        }
        scroll(target, delta) {
            const list = target === 'list', key = list ? '_listScroll' : '_bodyScroll';
            const next = clamp(this[key] + delta, 0, list ? this.listMax() : this._bodyMax);
            if (next === this[key]) return;
            this[key] = next;
            if (list) this.drawList(); else this.drawBody();
        }
        arrowAt(point) {
            return point && this._arrows.find(a => (a.direction < 0 ? this._bodyScroll > 0.5 : this._bodyScroll < this._bodyMax - 0.5) &&
                Math.abs(point.x - a.x) <= 32 && Math.abs(point.y - a.y) <= 32);
        }
        hit(point) {
            if (this._updateButton && contains(this._updateButton, point)) return 'update';
            if (this._translationButton && contains(this._translationButton, point)) return 'translation';
            for (const channel of Object.keys(CHANNELS)) if (CHANNELS[channel].enabled && contains(this.channelRect(channel), point)) return channel;
            const arrow = this.arrowAt(point); if (arrow) return arrow.direction < 0 ? 'up' : 'down';
            if (contains(L.body, point)) return 'body';
            if (this._expanded && contains(this.listRect(), point)) {
                const index = Math.floor((point.y - this.listRect().y + this._listScroll) / L.rowHeight);
                return index < this._entries.length ? 'entry:' + index : 'list';
            }
            return '';
        }
        activate(hit) {
            if (hit === 'update') this.showRevisionUpdate();
            else if (hit === 'translation') this.toggleMachineTranslation();
            else if (hit.startsWith('entry:')) this.select(Number(hit.slice(6)));
            else if (CHANNELS[hit]?.enabled) {
                if (this._channel === hit) this._expanded = !this._expanded;
                else {
                    const entries = readableEntries(CHANNELS[hit].read(this._platform).entries, hit);
                    if (!entries.length) return;
                    this._channel = hit; this._expanded = true; this._listScroll = 0;
                    this.setEntries(entries);
                }
                SoundManager.playCursor(); this.drawChrome(); this.drawList();
            }
        }
        localPoint(event) {
            return { x: (Graphics.pageToCanvasX(event.pageX) - this._root.x) / this._root.scale.x,
                y: (Graphics.pageToCanvasY(event.pageY) - this._root.y) / this._root.scale.y };
        }
        acceptsInput() { return this.isActive() && !this._closing && !this._updatePending && !SceneManager.isSceneChanging(); }
        announcementLink(event) {
            if (!this._announcementReader) return null;
            const path = event.composedPath?.() || [];
            if (!path.includes(this._announcementReader)) return null;
            return path.find(node => node?.getAttribute?.('role') === 'link' && node.dataset?.url) || null;
        }
        announcementVideo(event) {
            const path = event.composedPath?.() || [];
            return path.includes(this._announcementReader) &&
                path.some(node => node?.classList?.contains('announcement-video'));
        }
        bindInput() {
            if (this._listeners.length) return;
            const on = (type, listener) => {
                const handler = event => {
                    if (type !== 'wheel' && this.announcementVideo(event)) {
                        if (type === 'pointerdown' || type === 'keydown') {
                            this.cancelPointer(); Input.clear(); this._mouse = null;
                        }
                        return;
                    }
                    listener(event);
                };
                window.addEventListener(type, handler, { capture: true, passive: false }); this._listeners.push([type, handler]);
            };
            const consume = event => { event.preventDefault(); event.stopImmediatePropagation(); };
            on('keydown', event => {
                if (this.acceptsInput() && ['Enter', ' '].includes(event.key)) {
                    const link = this.announcementLink(event);
                    if (link) {
                        consume(event);
                        if (!event.repeat) window.StandaloneUpdateLog.openLink(link.dataset.url);
                        return;
                    }
                }
                if (!this.acceptsInput() || !['Home', 'End'].includes(event.key)) return;
                consume(event);
                this.scroll('body', event.key === 'Home' ? -this._bodyScroll : this._bodyMax - this._bodyScroll);
            });
            on('wheel', event => {
                if (!this.acceptsInput()) return;
                const p = this.localPoint(event), hit = this.hit(p);
                const list = hit === 'list' || hit.startsWith('entry:');
                if (!list && hit !== 'body' && hit !== 'up' && hit !== 'down') return;
                consume(event);
                const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? (list ? this.listRect().height : L.body.height) : 1;
                this.scroll(list ? 'list' : 'body', event.deltaY * unit);
            });
            // Scene-owned pointer capture prevents a drag from also selecting a row or returning.
            on('pointerdown', event => {
                if (!this.acceptsInput()) return;
                this.trackVideoPointer(event);
                if (event.button !== 0) return;
                if (this._gesture) { consume(event); return; }
                const p = this.localPoint(event), hit = this.hit(p);
                if (!hit) return;
                consume(event); clearPointerInput();
                this._gesture = { id: event.pointerId, start: p, last: p, hit, dragged: false,
                    link: hit === 'body' ? this.announcementLink(event) : null };
                this._pointer = p;
                this._mouse = event.pointerType === 'touch' ? null : p;
            });
            on('pointermove', event => {
                if (!this.acceptsInput()) return;
                if (event.pointerType !== 'touch' || this._videoPointers.has(event.pointerId)) this.trackVideoPointer(event);
                const p = this.localPoint(event);
                if (event.pointerType !== 'touch') this._mouse = p;
                const g = this._gesture;
                if (!g || g.id !== event.pointerId) return;
                consume(event); this._pointer = p;
                if (Math.hypot(p.x - g.start.x, p.y - g.start.y) >= 8) g.dragged = true;
                if (g.dragged) {
                    if (g.hit === 'body') this.scroll('body', g.last.y - p.y);
                    else if (g.hit === 'list' || g.hit.startsWith('entry:')) this.scroll('list', g.last.y - p.y);
                }
                g.last = p;
            });
            on('pointerup', event => {
                if (this.acceptsInput()) this.trackVideoPointer(event, true);
                const g = this._gesture; if (!g || g.id !== event.pointerId) return;
                consume(event); this._gesture = null; this._pointer = null; clearPointerInput();
                if (this.acceptsInput() && !g.dragged && this.hit(this.localPoint(event)) === g.hit) {
                    if (g.link && this.announcementLink(event) === g.link) window.StandaloneUpdateLog.openLink(g.link.dataset.url);
                    else this.activate(g.hit);
                }
            });
            on('pointercancel', event => {
                this._videoPointers.delete(event.pointerId); this.updateEasterEggHover(); this.cancelPointer();
            });
            on('pointerout', event => {
                if (!event.relatedTarget) {
                    this._videoPointers.delete(event.pointerId); this.updateEasterEggHover();
                    this._mouse = null; this.cancelPointer();
                }
            });
            on('blur', () => {
                this._announcementBackground = true;
                this.pauseAnnouncementVideos();
                if (this._announcementViews) this._announcementViews.visibleSince = null;
                this._videoPointers.clear(); this.updateEasterEggHover(); this._mouse = null; this.cancelPointer();
            });
            on('focus', () => {
                this._announcementBackground = false; this.syncAnnouncementBgm();
            });
            on('visibilitychange', () => {
                this._announcementBackground = document.visibilityState === 'hidden';
                if (this._announcementBackground) this.pauseAnnouncementVideos();
                else this.syncAnnouncementBgm();
                if (document.visibilityState === 'hidden' && this._announcementViews) this._announcementViews.visibleSince = null;
            });
            on('resize', () => this.layoutAnnouncementReader());
            // Keep reader gestures local; let Drill receive native button input.
            for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'mousedown', 'mouseup']) on(type, event => {
                if (this.acceptsInput() && this._gesture) consume(event);
            });
            on('contextmenu', event => { if (this.acceptsInput()) { consume(event); this.close(); } });
        }
        cancelPointer() { this._gesture = null; this._pointer = null; clearPointerInput(); }
        unbindInput() {
            for (const [type, fn] of this._listeners) window.removeEventListener(type, fn, true);
            this._listeners.length = 0; this._mouse = null; this.cancelPointer(); this._lastArrowTime = null;
            this._videoPointers.clear();
        }
        update() {
            super.update();
            if (!this.acceptsInput()) {
                if (this._announcementViews) this._announcementViews.visibleSince = null;
                return;
            }
            if (this.drill_MBB_update) this.drill_MBB_update();
            if (this._closing) return;
            if (this._announcementRevision !== announcementRevision) {
                this._announcementRevision = announcementRevision;
                if (this._channel === 'announcement') this.setEntries(CHANNELS.announcement.read().entries);
                else this.drawChrome();
            }
            if (language() !== this._language || window.mapCommonEventDialogue !== this._languageTable) {
                if (language() !== this._language) this._translationSelection = null;
                this._language = language(); this._text = labels(this._language);
                this._languageTable = window.mapCommonEventDialogue;
                for (const b of this._ownedBitmaps) b.fontFace = $gameSystem.mainFontFace();
                this.rebuildBody(); this.drawList(); this.drawChrome();
            }
            if (Input.isTriggered('cancel') || TouchInput.isCancelled()) { this.close(); return; }
            if (Input.isRepeated('down')) this.select(this._selected + 1);
            if (Input.isRepeated('up')) this.select(this._selected - 1);
            if (Input.isRepeated('pagedown')) this.scroll('body', L.body.height - 84);
            if (Input.isRepeated('pageup')) this.scroll('body', -L.body.height + 84);
            if (Input.isTriggered('left') && this._expanded) { this._expanded = false; this.drawChrome(); this.drawList(); }
            if (Input.isTriggered('right') && !this._expanded) { this._expanded = true; this.drawChrome(); this.drawList(); }
            this.updateArrows();
            this.updateAnnouncementViews();
        }
        updateArrows() {
            const now = performance.now(), elapsed = this._lastArrowTime == null ? 0 : Math.min(50, now - this._lastArrowTime);
            this._lastArrowTime = now;
            const g = this._gesture;
            const hovered = !g ? this.arrowAt(this._mouse) : !g.dragged && ['up','down'].includes(g.hit) ? this.arrowAt(this._pointer) : null;
            if (hovered) this.scroll('body', hovered.direction * 420 * elapsed / 1000);
            for (const a of this._arrows) {
                a.sprite.visible = a.direction < 0 ? this._bodyScroll > 0.5 : this._bodyScroll < this._bodyMax - 0.5;
                a.sprite.y = a.y + a.direction * Math.sin(now * Math.PI * 2 / 1400) * 6;
                a.sprite.scale.set((a === hovered ? 1.22 : 1) / 3);
            }
        }
        consumeNoticesOnExit() {
            if (!this._noticeReadStarted || this._noticesConsumed) return;
            this._noticesConsumed = true;
            window.StandaloneUpdateLog.consumeUpdateNotices();
        }
        popScene() { this.close(false); } // Drill already plays its configured return sound.
        close(playSound = true) {
            if (this._closing) return;
            this.consumeNoticesOnExit();
            this._closing = true; this.unbindInput();
            this.destroyAnnouncementReader();
            this.destroyEasterEgg();
            if (playSound) SoundManager.playCancel();
            Input.clear(); clearPointerInput(); SceneManager.pop();
        }
        stop() { this.consumeNoticesOnExit(); this._closing = true; this.unbindInput(); this.destroyAnnouncementReader(); this.destroyEasterEgg(); super.stop(); }
        destroy(options) {
            this.consumeNoticesOnExit();
            this._closing = true; this.unbindInput();
            this.destroyAnnouncementReader();
            this.destroyEasterEgg();
            this._background.filters = null; this._background.bitmap = null;
            const renderer = Graphics.app?.renderer;
            if (renderer?.shader?.shader === this._blur) renderer.shader.reset();
            this._blur.destroy(); this._blur = null;
            super.destroy(options);
            for (const bitmap of this._ownedBitmaps) bitmap.destroy();
            this._ownedBitmaps.length = 0; this._lines.length = 0; this._entries = [];
        }
    }
    function hasReadableLogs() {
        const platform = Utils.isMobileDevice() ? 'android' : 'pc';
        return readableEntries(readChangelogs(platform).entries, 'changelog').length > 0;
    }
    function hasReadableAnnouncements() {
        refreshLocalAnnouncements();
        return readableEntries(CHANNELS.announcement.read().entries, 'announcement').length > 0;
    }
    function open(channel = 'changelog') {
        if (!CHANNELS[channel] || !$gameSystem || SceneManager.isSceneChanging()) return false;
        const scene = SceneManager._scene;
        if (scene instanceof Scene_Map) {
            if (!$gameParty || $gamePlayer.isTransferring() || $gameMessage.isBusy()) return false;
            if (scene._MapSelectEquipWindow && !scene._MapSelectEquipWindow.isClosed()) return false;
        } else if (!(scene instanceof Scene_Title)) return false;
        refreshLocalAnnouncements();
        const platform = Utils.isMobileDevice() ? 'android' : 'pc';
        const entries = readableEntries(CHANNELS[channel].read(platform).entries, channel);
        if (!entries.length) {
            if (channel !== 'announcement' || previewAnnouncements ||
                (ConfigManager.disableNetwork && !savedAnnouncements().length && !window.cordova?.file?.dataDirectory)) return false;
            if (!pendingAnnouncementOpen) {
                pendingAnnouncementOpen = refreshRemoteAnnouncements().then(() => {
                    if (SceneManager._scene === scene && !SceneManager.isSceneChanging() &&
                        readableEntries(CHANNELS.announcement.read().entries, 'announcement').length) open('announcement');
                }).finally(() => { pendingAnnouncementOpen = null; });
            }
            return true;
        }
        refreshRemoteAnnouncements();
        // Boot reserves the initial map transfer before showing the title.
        // That pending transfer must not prevent reading logs on the title.
        Input.clear(); clearPointerInput(); SceneManager.push(Scene_UpdateLog); SceneManager.prepareNextScene(channel, entries);
        return true;
    }
    window.StandaloneUpdateLog = Object.freeze({ open, openLink, formatTime, hasReadableLogs, hasReadableAnnouncements, previewLocalAnnouncements,
        checkAnnouncements: refreshRemoteAnnouncements, hasAnnouncementNotice, consumeUpdateNotices,
        get announcementRevision() { return announcementRevision; } });
    // Explicit local preview launcher only; ordinary game launches install no hook.
    if (typeof Utils !== 'undefined' && Utils.isNwjs?.() &&
        (Utils.isOptionValid?.('announcement-preview') || Utils.isOptionValid?.('announcement-local-preview'))) {
        const updateTitle = Scene_Title.prototype.update;
        let pending = true;
        Scene_Title.prototype.update = function() {
            updateTitle.call(this);
            if (!pending || !this.isActive() || SceneManager.isSceneChanging()) return;
            pending = false;
            if (Utils.isOptionValid('announcement-local-preview')) open('announcement');
            else previewLocalAnnouncements().catch(error => console.error('[Announcement preview]', error));
        };
    }
})();
