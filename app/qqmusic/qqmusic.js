/**
 * QQ 音乐 · 绿钻成长值 + 金币中心签到与每日任务
 *
 * 抓取:打开 QQ 音乐 →「我的 / 会员 / 每日签到」或「金币中心 / 每日签到」,抓 Cookie
 * 签到:cron 自动续期后完成两套签到,并领取已完成的每日任务奖励
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-07-12
 *
 * ===== Loon =====
 * [MITM]
 * hostname = u6.y.qq.com, music.y.qq.com
 * [Script]
 * http-request ^https:\/\/u6\.y\.qq\.com\/cgi-bin\/musics\.fcg\?.*(EveryDaySignLvzScore|GetSignInSummary) tag=QQ音乐 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/qqmusic/qqmusic.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png
 * http-request ^https:\/\/music\.y\.qq\.com\/maproxy\/getInfo tag=QQ音乐广告模板, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/qqmusic/qqmusic.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png
 * cron "20 9 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/qqmusic/qqmusic.js, tag=QQ音乐签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = u6.y.qq.com, music.y.qq.com
 * [Script]
 * QQ音乐 Cookie = type=http-request,pattern=^https:\/\/u6\.y\.qq\.com\/cgi-bin\/musics\.fcg\?.*(EveryDaySignLvzScore|GetSignInSummary),requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/qqmusic/qqmusic.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png
 * QQ音乐广告模板 = type=http-request,pattern=^https:\/\/music\.y\.qq\.com\/maproxy\/getInfo,requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/qqmusic/qqmusic.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png
 * QQ音乐签到 = type=cron,cronexp=20 9 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/qqmusic/qqmusic.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = u6.y.qq.com, music.y.qq.com
 * [rewrite_local]
 * ^https:\/\/u6\.y\.qq\.com\/cgi-bin\/musics\.fcg\?.*(EveryDaySignLvzScore|GetSignInSummary) url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/qqmusic/qqmusic.js
 * ^https:\/\/music\.y\.qq\.com\/maproxy\/getInfo url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/qqmusic/qqmusic.js
 * [task_local]
 * 20 9 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/qqmusic/qqmusic.js, tag=QQ音乐签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: QQ音乐签到
 *       cron: '20 9 * * *'
 *       timeout: 60
 * http:
 *   mitm:
 *     - "u6.y.qq.com"
 *     - "music.y.qq.com"
 *   script:
 *     - match: ^https:\/\/u6\.y\.qq\.com\/cgi-bin\/musics\.fcg\?.*(EveryDaySignLvzScore|GetSignInSummary)
 *       name: QQ音乐 Cookie
 *       type: request
 *       require-body: true
 *     - match: ^https:\/\/music\.y\.qq\.com\/maproxy\/getInfo
 *       name: QQ音乐广告模板
 *       type: request
 *       require-body: true
 * script-providers:
 *   QQ音乐签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/qqmusic/qqmusic.js
 *     interval: 86400
 */

const $ = new Env("QQ音乐");

const SCRIPT_VERSION = "2026-07-12.r9"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

const CK_KEY = "qqmusic_data"; // { uin, authst, refresh_key, login_type, coin_act_id, coin_scene_id, ts }
const AD_TEMPLATE_KEY = "qqmusic_ad_request";
// 签到走小程序免签名通道:解包 wxada7aab80ba27074 发现所有 CGI 都用
// musicu.fcg + comm.authst(musickey) 鉴权,无私有 sign / 无 g_tk / 无 cookie。
// 实测 App 抓的 qm_keyst 直接当 authst 即可(跨通道通用)。
const API_URL = "https://u.y.qq.com/cgi-bin/musicu.fcg";
const APP_API_URL = "https://u6.y.qq.com/cgi-bin/musics.fcg";
const MINA_APPID = "wxada7aab80ba27074"; // QQ 音乐微信小程序 appid(comm.appid)
const COIN_SIGN_ACT_ID = "Z25hHGi"; // 金币签到活动,抓到新值时自动覆盖
const COIN_SIGN_SCENE_ID = "2";
const AUDIOBOOK_CANDIDATES = [
    667539578, 667540691, 667541703, 667540570, 667540307,
    667541417, 667541717, 667539836, 667540347, 667539821,
    667539680, 667540587, 667542373, 667540939,
];
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) MicroMessenger/8.0 miniProgram";

$.is_debug = ($.isNode() ? process.env.IS_DEBUG : $.getdata("qqmusic_debug")) || "false";
$.messages = [];

// ============ 抓取 ============

// 会员签到页或金币签到页触发。Cookie 提取长期登录材料,金币页 body 额外提取动态活动 ID。
function getCookie() {
    try {
        const headers = lowerKeys($request.headers);
        // HTTP/2 下 QQ 音乐发多个独立 cookie: 头,代理合并时常残留 "cookie:" 脏前缀,要拼回标准串
        const cookie = normalizeCookie(headers["cookie"]);

        const authst = (/qm_keyst=([^;]+)/.exec(cookie) || [])[1] || "";
        const uin = (/\buin=o?(\d+)/.exec(cookie) || [])[1] || "";
        // refresh_key 是长期不变的续期凭据,cron 靠它换新 musickey(详见 refreshKey)
        const refresh_key = (/refresh_key=([^;]+)/.exec(cookie) || [])[1] || "";
        // tmeLoginType 区分登录方式(1=QQ / 2=微信等),续期 comm 要带对
        const login_type = (/tmeLoginType=([^;]+)/.exec(cookie) || [])[1] || "1";
        if (!authst || !uin) {
            $.log("[WARN] Cookie 缺 qm_keyst / uin,跳过(可能未登录)");
            return;
        }
        if (!refresh_key) {
            $.log("[WARN] Cookie 缺 refresh_key,将无法自动续期(只能撑 ~3 天)");
        }

        const old = $.getjson(CK_KEY, {}) || {};
        const coin = getCoinSignConfig($request.body);
        const saved = {
            ...old,
            uin,
            authst,
            refresh_key: refresh_key || old.refresh_key || "",
            login_type,
            coin_act_id: coin.actID || old.coin_act_id || "",
            coin_scene_id: coin.sceneID || old.coin_scene_id || "",
            ts: Date.now(),
        };
        $.setjson(saved, CK_KEY);
        $.msg($.name, "✅ QQ音乐 Cookie 获取成功", "可关闭抓包,主脚本会自动续期并签到");
        $.log(`[INFO] 已保存 (loginType=${login_type}, refresh_key=${saved.refresh_key ? "有" : "无"}, 金币活动${saved.coin_act_id ? "已识别" : "用默认值"})`);
    } catch (e) {
        $.log(`[ERROR] 抓取异常: ${e}`);
    }
}

function captureAdTemplate() {
    try {
        const body = JSON.parse($request.body || "{}");
        const reqInfo = body.msg_ad_req_info || {};
        if (Number(reqInfo.ad_channel_id) !== 300507 || !/"source_id"\s*:\s*5001103/.test(reqInfo.custom_param || "")) return;

        const headers = lowerKeys($request.headers);
        $.setjson({
            body,
            cookie: normalizeCookie(headers.cookie),
            userAgent: headers["user-agent"] || UA,
            ts: Date.now(),
        }, AD_TEMPLATE_KEY);
        $.log("[INFO] 定时金币广告请求模板已更新");
    } catch (e) {
        $.log(`[WARN] 广告请求模板解析失败: ${e.message || e}`);
    }
}

// ============ 签到 ============

async function checkin() {
    const snap = $.getjson(CK_KEY, null);
    if (!snap || !snap.authst || !snap.uin) {
        $.messages.push(
            "🚫 未抓到 Cookie\n" +
            "👉 打开 QQ 音乐 →「我的 / 会员 / 每日签到」或「金币中心 / 每日签到」一次"
        );
        return;
    }

    const uin = String(snap.uin).replace(/^0+/, "") || String(snap.uin);

    // 1) 续期:musickey 仅 3 天有效,先用长期不变的 refresh_key 换一把新的(滚动续命)。
    //    续期失败不致命(库存 musickey 可能还没过期),继续尝试签到。
    await refreshKey(snap, uin);

    // 2) 两套签到都走小程序免签名通道,共用刚刷新的 authst。
    await checkLvzScore(snap, uin);
    await checkCoinSignIn(snap, uin);

    // 3) App 每日任务需 zzc 动态签名;领取所有已达到完成条件的金币奖励。
    await claimDailyTaskRewards(snap, uin);
}

async function checkLvzScore(snap, uin) {
    const body = {
        comm: makeComm(snap, uin),
        req_0: {
            module: "music.lvz.MuFest13TaskSvr",
            method: "EveryDaySignLvzScore",
            param: { Uin: uin, Cmd: "get" }, // Cmd:get 即领取(实测会真签)
        },
    };

    const res = await post(API_URL, JSON.stringify(body));
    debug(res, "EveryDaySignLvzScore");

    if (!res) {
        $.messages.push("❌ 绿钻成长值签到无响应(详情见日志)");
        return;
    }
    const r0 = res.req_0 || {};
    const data = r0.data || {};

    // 外层鉴权失败(authst 失效)→ code!=0,需重抓
    if (res.code !== 0 || (r0.code !== 0 && r0.code !== undefined && data.Ret === undefined)) {
        $.messages.push(
            `❌ 绿钻成长值签到失败 (code=${res.code}, req_0.code=${r0.code})\n` +
            "续期可能也失败(refresh_key 失效或离线 >3 天),请重进「每日签到」页重抓"
        );
        $.log(`[DEBUG] 响应前300: ${$.toStr(res).slice(0, 300)}`);
        return;
    }

    if (data.Ret === 0) {
        const score = (data.Info && data.Info.Score) || 0;
        $.messages.push(`✅ 绿钻成长值签到成功${score ? `: 今日 +${score}` : ""}`);
    } else if (data.Ret === 20019 || /已.*领取|已签|重复/.test(data.Msg || "")) {
        $.messages.push(`✨ 绿钻成长值今日已签到${data.Msg ? `(${data.Msg})` : ""}`);
    } else {
        $.messages.push(`⚠️ 绿钻成长值已处理 (Ret=${data.Ret})${data.Msg ? `: ${data.Msg}` : ""}`);
        $.log(`[DEBUG] 响应前300: ${$.toStr(res).slice(0, 300)}`);
    }
}

async function checkCoinSignIn(snap, uin) {
    const actID = snap.coin_act_id || COIN_SIGN_ACT_ID;
    const sceneID = snap.coin_scene_id || COIN_SIGN_SCENE_ID;
    let state = await getCoinSignState(snap, uin, actID, sceneID);
    if (!state) return;

    let signedNow = false;
    if (!state.info.IsSignIn) {
        const signRes = await post(API_URL, JSON.stringify({
            comm: makeComm(snap, uin),
            req_0: {
                module: "music.actCenter.ActCenterSignNewSvr",
                method: "SignIn",
                param: { ActID: actID, ScenesID: sceneID },
            },
        }));
        debug(signRes, "Coin SignIn");
        const signReq = signRes && signRes.req_0;
        const signData = signReq && signReq.data;
        if (!signRes || signRes.code !== 0 || !signReq || signReq.code !== 0 || !signData || signData.retCode !== 0 || !signData.Info || !signData.Info.IsSignIn) {
            const code = signReq ? signReq.code : "?";
            const ret = signData ? signData.retCode : "?";
            $.messages.push(`❌ 金币中心签到失败 (code=${code}, ret=${ret})`);
            $.log(`[DEBUG] 金币签到响应前300: ${$.toStr(signRes).slice(0, 300)}`);
            return;
        }
        signedNow = true;
        state = await getCoinSignState(snap, uin, actID, sceneID);
        if (!state) return;
    }

    const day = Number(state.info.ContinueSignInCount || 0);
    const taskMap = state.taskList || {};
    const task = Object.values(taskMap).find((item) => item && item.State === 2) || taskMap[String(day)];
    const reward = formatCoinReward(task);

    if (task && task.State === 2) {
        const awardRes = await post(API_URL, JSON.stringify({
            comm: makeComm(snap, uin),
            req_0: {
                module: "music.actCenter.ActCenterSignNewSvr",
                method: "AwardPrize",
                param: { ActID: actID, TaskID: task.ID },
            },
        }));
        debug(awardRes, "Coin AwardPrize");
        const awardReq = awardRes && awardRes.req_0;
        const awardData = awardReq && awardReq.data;
        if (awardRes && awardRes.code === 0 && awardReq && awardReq.code === 0 && awardData && (awardData.retCode === 0 || awardData.retCode === 100004)) {
            $.messages.push(`${signedNow ? "✅ 金币中心签到成功" : "✅ 金币中心奖励已领取"}${reward}`);
        } else {
            const code = awardReq ? awardReq.code : "?";
            const ret = awardData ? awardData.retCode : "?";
            $.messages.push(`⚠️ 金币中心已签到,领奖失败 (code=${code}, ret=${ret})`);
            $.log(`[DEBUG] 金币领奖响应前300: ${$.toStr(awardRes).slice(0, 300)}`);
        }
    } else if (state.info.IsSignIn) {
        $.messages.push(`✨ 金币中心今日已签到${reward}`);
    } else {
        $.messages.push("⚠️ 金币中心签到状态未确认(详情见日志)");
    }
}

async function getCoinSignState(snap, uin, actID, sceneID) {
    const res = await post(API_URL, JSON.stringify({
        comm: makeComm(snap, uin),
        req_0: {
            module: "music.actCenter.ActCenterSignNewSvr",
            method: "GetSignInSummary",
            param: { ActID: actID },
        },
        req_1: {
            module: "music.actCenter.ActCenterSignNewSvr",
            method: "GetSignInTaskList",
            param: { ActID: actID, ScenesID: sceneID },
        },
    }));
    debug(res, "Coin Sign State");
    const summary = res && res.req_0;
    const tasks = res && res.req_1;
    const summaryData = summary && summary.data;
    const taskData = tasks && tasks.data;
    if (!res || res.code !== 0 || !summary || summary.code !== 0 || !tasks || tasks.code !== 0 || !summaryData || summaryData.retCode !== 0 || !taskData || taskData.retCode !== 0) {
        $.messages.push(`❌ 金币中心状态查询失败 (summary=${summary ? summary.code : "?"}, tasks=${tasks ? tasks.code : "?"})`);
        $.log(`[DEBUG] 金币状态响应前300: ${$.toStr(res).slice(0, 300)}`);
        return null;
    }
    return {
        info: taskData.Info || summaryData.Info || {},
        taskList: (((taskData.TaskListInfo || {}).TaskList || {}).ContinueTaskList) || {},
    };
}

function makeComm(snap, uin) {
    return {
        uin: Number(uin),
        authst: snap.authst,
        mina: 1,
        appid: MINA_APPID,
        ct: 29,
        cv: 0,
        format: "json",
    };
}

function formatCoinReward(task) {
    const prize = task && Array.isArray(task.PrizeList) ? task.PrizeList[0] : null;
    if (!prize) return "";
    if (prize.Name) return ` (${prize.Name})`;
    if (prize.Value) return ` (+${prize.Value} 金币)`;
    return "";
}

async function claimDailyTaskRewards(snap, uin) {
    let tasks = await getDailyTasks(snap, uin, true);
    if (!tasks) return;

    let temporarySong = null;
    let temporaryAudiobook = null;
    try {
        const favoriteSongTask = tasks.find((task) => task.ID === "Z1mKlEI" || task.TaskActTypID === "2tuNRp" || task.Type === 8);
        if (favoriteSongTask && favoriteSongTask.State === 1 && !taskOff("qqmusic_task_favorite")) {
            temporarySong = await addTemporarySongFavorite(snap, uin);
            if (temporarySong) {
                tasks = await refreshTasksAfterAction(tasks, favoriteSongTask, snap, uin);
            }
        }

        const favoriteAudiobookTask = tasks.find((task) => task.ID === "Z5bnvq" || task.TaskActTypID === "CeYSX" || task.Type === 36);
        if (favoriteAudiobookTask && favoriteAudiobookTask.State === 1 && !taskOff("qqmusic_task_favorite")) {
            temporaryAudiobook = await addTemporaryAudiobookFavorite(snap, uin);
            if (temporaryAudiobook) {
                tasks = await refreshTasksAfterAction(tasks, favoriteAudiobookTask, snap, uin);
            }
        }

        const ready = tasks.filter((task) =>
            task &&
            task.State === 2 &&
            Array.isArray(task.PrizeList) &&
            task.PrizeList.some((prize) => prize && prize.Type === 12 && Number(prize.Value || 0) > 0)
        );
        const claimed = [];
        const doubleCandidates = [];
        for (const task of ready) {
            const awardBody = {
                comm: makeAppComm(snap, uin, 23, 0, "DevopsBase"),
                req_0: {
                    module: "music.activeCenter.ActTaskNewSvr",
                    method: "AwardTaskPrize",
                    param: { actID: task._actID, TaskID: task.ID },
                },
            };
            const awardRes = await appPost(snap, uin, "AwardTaskPrize", awardBody);
            debug(awardRes, `Award ${task.ID}`);
            const awardReq = awardRes && awardRes.req_0;
            const awardData = awardReq && awardReq.data;
            if (awardRes && awardRes.code === 0 && awardReq && awardReq.code === 0 && awardData && awardData.retCode === 0) {
                const value = Number(awardData.awardValue || 0);
                claimed.push(`${task.Name || task.ID}${value ? ` +${value}` : ""}`);
                if (/定时.*(?:金币|积分)/.test(task.Name || "")) doubleCandidates.push(task);
            } else {
                $.log(`[WARN] 每日任务领奖失败 (${task.Name || task.ID}, code=${awardReq ? awardReq.code : "?"}, ret=${awardData ? awardData.retCode : "?"})`);
            }
        }
        if (claimed.length) $.messages.push(`✅ 每日任务领奖: ${claimed.join("、")}`);
        if (taskOn("qqmusic_task_ad")) {
            for (const task of doubleCandidates) await tryDoubleTimedReward(snap, uin, task);
        }
    } finally {
        if (temporarySong) {
            const removed = await updateFavoriteSong(snap, uin, "DelSonglist", temporarySong);
            if (!removed) $.messages.push("⚠️ 临时收藏歌曲清理失败,请到“我喜欢”检查最新一首");
        }
        if (temporaryAudiobook) {
            const removed = await updateFavoriteAudiobook(snap, uin, 2, temporaryAudiobook);
            if (!removed) $.messages.push("⚠️ 临时收藏有声书清理失败,请到收藏的播客中检查");
        }
    }
}

async function tryDoubleTimedReward(snap, uin, sourceTask) {
    const template = $.getjson(AD_TEMPLATE_KEY, null);
    if (!template || !template.body) {
        $.messages.push("⚠️ 广告翻倍未运行: 请开启广告抓取后进一次金币中心");
        return;
    }

    const doubleBody = {
        comm: makeAppComm(snap, uin, 23, 0, "DevopsBase"),
        req_0: {
            module: "music.activeCenter.ActTaskNewSvr",
            method: "GetTaskDoubleTasks",
            param: { actID: sourceTask._actID, taskIDs: [sourceTask.ID] },
        },
    };
    const doubleRes = await appPost(snap, uin, "GetTaskDoubleTasks", doubleBody);
    debug(doubleRes, `Double Tasks ${sourceTask.ID}`);
    const taskInfos = doubleRes && doubleRes.req_0 && doubleRes.req_0.data && doubleRes.req_0.data.taskInfos;
    const candidates = taskInfos && taskInfos[sourceTask.ID];
    const doubleTask = Array.isArray(candidates) && candidates.find((task) => task && task.Ext && String(task.Ext.Ecpm) === "1");
    if (!doubleTask) {
        $.log(`[INFO] ${sourceTask.Name || sourceTask.ID} 当前无 ECPM 翻倍任务`);
        return;
    }

    const adRequest = JSON.parse(JSON.stringify(template.body));
    const now = Date.now();
    adRequest.time = now;
    adRequest.last_pull_time = now - 5000;
    adRequest.cid = randomHex32();
    adRequest.seq = randomHex32();
    if (adRequest.user_info) adRequest.user_info.id = String(uin);
    if (adRequest.msg_ad_req_info) adRequest.msg_ad_req_info.ad_channel_id = 300507;

    const adRes = await post("https://music.y.qq.com/maproxy/getInfo", JSON.stringify(adRequest), {
        "content-type": "application/json;charset=UTF-8",
        Cookie: template.cookie || "",
        "User-Agent": template.userAgent || UA,
    }, false);
    debug({
        ret: adRes && adRes.ret,
        positions: ((adRes && adRes.rpt_msg_pos_ad_info) || []).map((pos) => ({
            posID: pos.pos_id,
            adCount: (pos.rpt_msg_ad_info || []).length,
        })),
    }, "Reward Ad getInfo");
    if (adRes && adRes.cookie) {
        template.body.cookie = adRes.cookie;
        template.ts = Date.now();
        $.setjson(template, AD_TEMPLATE_KEY);
    }

    const positions = (adRes && adRes.rpt_msg_pos_ad_info) || [];
    const ad = positions
        .filter((pos) => Number(pos.pos_id) === 30050701)
        .flatMap((pos) => pos.rpt_msg_ad_info || [])
        .find((item) => item && item.base && item.base.verify_str && item.ui && Number(item.ui.reward_gold) > 0);
    if (!ad) {
        $.messages.push("⚠️ 定时金币翻倍: 当前未下发广告(可能已达频控)");
        return;
    }

    // 留足活动要求的停留时间再提交奖励。
    await $.wait(18000);
    const reportBody = {
        comm: makeAppComm(snap, uin, 23, 0, "DevopsBase"),
        req_0: {
            module: "music.activeCenter.ActTaskNewSvr",
            method: "TaskActDataReport",
            param: {
                actID: sourceTask._actID,
                taskID: doubleTask.ID,
                actData: 1,
                actDataExt: {
                    EcpmToken: ad.base.verify_str,
                    RewardGold: String(ad.ui.reward_gold),
                },
            },
        },
    };
    const reportRes = await appPost(snap, uin, "TaskActDataReport", reportBody);
    debug(reportRes, `Ad Reward ${doubleTask.ID}`);
    const data = reportRes && reportRes.req_0 && reportRes.req_0.data;
    if (reportRes && reportRes.code === 0 && reportRes.req_0 && reportRes.req_0.code === 0 && data && data.retCode === 0) {
        $.messages.push(`✅ 定时金币广告翻倍 +${Number(data.awardValue || ad.ui.reward_gold)}`);
    } else {
        $.messages.push(`⚠️ 定时金币广告翻倍未通过 (ret=${data ? data.retCode : "?"})`);
    }
}

async function refreshTasksAfterAction(tasks, target, snap, uin) {
    await $.wait(800);
    let refreshed = await getDailyTasks(snap, uin, false) || tasks;
    const current = refreshed.find((task) => task.ID === target.ID);
    if (current && current.State === 1) {
        await $.wait(1200);
        refreshed = await getDailyTasks(snap, uin, false) || refreshed;
    }
    return refreshed;
}

async function getDailyTasks(snap, uin, notifyError) {
    const queryBody = {
        comm: makeAppComm(snap, uin, 1, 200600, "DevopsCoinCenter3"),
        req_0: {
            module: "music.activeCenter.FloorManagerSvr",
            method: "GetFloors",
            param: { Release: 1, PageID: "songpopup", PersonalityMode: 1, FloorIDs: [85] },
        },
    };
    const res = await appPost(snap, uin, "GetFloors", queryBody);
    debug(res, "Daily Tasks");
    const req = res && res.req_0;
    const data = req && req.data;
    if (!res || res.code !== 0 || !req || req.code !== 0 || !data || data.RetCode !== 0) {
        if (notifyError) $.messages.push(`❌ 每日任务查询失败 (code=${req ? req.code : "?"})`);
        $.log(`[DEBUG] 每日任务响应前300: ${$.toStr(res).slice(0, 300)}`);
        return null;
    }

    const tasks = [];
    for (const floor of data.Floors || []) {
        for (const item of floor.ItemList || []) {
            try {
                const conf = typeof item.ResourceConf === "string" ? JSON.parse(item.ResourceConf) : item.ResourceConf;
                for (const task of ((((conf || {}).ActTaskModule || {}).TaskList) || [])) {
                    tasks.push({ ...task, _actID: (conf || {}).ActID || "Z1NRf2o" });
                }
            } catch (e) {
                $.log(`[WARN] 每日任务配置解析失败: ${e.message || e}`);
            }
        }
    }

    return tasks;
}

async function addTemporarySongFavorite(snap, uin) {
    const topRes = await post(API_URL, JSON.stringify({
        comm: makeComm(snap, uin),
        req_0: {
            module: "music.musicToplist.Toplist",
            method: "GetDetail",
            param: { topId: 26, offset: 0, num: 10, withTags: true },
        },
    }));
    debug(topRes, "Favorite Candidates");
    const songs = topRes && topRes.req_0 && topRes.req_0.data && topRes.req_0.data.data
        ? topRes.req_0.data.data.song || []
        : [];
    for (const song of songs) {
        const candidate = { songId: Number(song.songId), songType: Number(song.songType || 0) };
        if (!candidate.songId) continue;
        if (await updateFavoriteSong(snap, uin, "AddSonglist", candidate)) return candidate;
    }
    $.log("[WARN] 未找到可临时收藏的榜单歌曲,跳过收藏任务");
    return null;
}

async function addTemporaryAudiobookFavorite(snap, uin) {
    const queryBody = {
        comm: makeAppComm(snap, uin, 23, 0, "DevopsBase"),
        req_0: {
            module: "music.favorSystemRead.FavorSystem",
            method: "get_long_audio_songinfo",
            param: { userid: String(uin), page_num: 0, page_size: 100, fav_type: 1 },
        },
    };
    const queryRes = await appPost(snap, uin, "get_long_audio_songinfo", queryBody);
    debug(queryRes, "Favorite Audiobooks");
    const queryReq = queryRes && queryRes.req_0;
    const queryData = queryReq && queryReq.data;
    if (!queryRes || queryRes.code !== 0 || !queryReq || queryReq.code !== 0 || !queryData || queryData.ret !== 0) {
        $.log("[WARN] 收藏的有声书查询失败,为避免误删用户收藏,跳过任务");
        return null;
    }

    const favoriteIDs = new Set((queryData.songlist || []).map((item) => Number(item.id || item.songid || 0)));
    for (const songID of AUDIOBOOK_CANDIDATES) {
        if (favoriteIDs.has(songID)) continue;
        const candidate = { songID, version: 7, favType: 1 };
        if (await updateFavoriteAudiobook(snap, uin, 1, candidate)) return candidate;
    }

    $.log("[WARN] 未找到可临时收藏的有声书,跳过任务");
    return null;
}

async function updateFavoriteAudiobook(snap, uin, requestType, audiobook) {
    const body = {
        comm: makeAppComm(snap, uin, 23, 0, "DevopsBase"),
        req_0: {
            module: "music.favorSystemWrite.FavorSystem",
            method: "fav_long_audio_songid",
            param: {
                vec_songid: [audiobook.songID],
                reqtype: requestType,
                vec_version: [audiobook.version],
                fav_type: audiobook.favType,
            },
        },
    };
    const res = await appPost(snap, uin, "fav_long_audio_songid", body);
    debug(res, requestType === 1 ? "Add Audiobook Favorite" : "Remove Audiobook Favorite");
    const req = res && res.req_0;
    const data = req && req.data;
    return Boolean(res && res.code === 0 && req && req.code === 0 && data && data.ret === 0);
}

async function updateFavoriteSong(snap, uin, method, song) {
    const res = await post(API_URL, JSON.stringify({
        comm: makeComm(snap, uin),
        req_0: {
            module: "music.musicasset.PlaylistDetailWrite",
            method,
            param: {
                dirId: 201,
                tid: 0,
                bFmtUtf8: true,
                v_songInfo: [{ songId: song.songId, songType: song.songType }],
            },
        },
    }));
    debug(res, method);
    return Boolean(res && res.code === 0 && res.req_0 && res.req_0.code === 0 && res.req_0.data && res.req_0.data.retCode === 0);
}

function makeAppComm(snap, uin, ct, cv, mesh) {
    return {
        g_tk: hash33(snap.authst),
        uin: Number(uin),
        format: "json",
        inCharset: "utf-8",
        outCharset: "utf-8",
        notice: 0,
        platform: "h5",
        needNewCode: 1,
        ct,
        cv,
        mesh_devops: mesh,
    };
}

function appPost(snap, uin, cgiKey, payload) {
    const body = JSON.stringify(payload);
    const sign = zzcSign(body);
    const url = `${APP_API_URL}?_webcgikey=${encodeURIComponent(cgiKey)}&_=${Date.now()}&sign=${sign}`;
    return post(url, body, {
        "content-type": "application/x-www-form-urlencoded",
        Cookie: `uin=o${uin}; qm_keyst=${snap.authst}`,
    });
}

// 用 refresh_key 换新 musickey。实测(2026-06-15):
//   - musickey(qm_keyst)keyExpiresIn=259200 秒 = 3 天,每次续期换全新值 → 必须滚动存
//   - refresh_key 长期不变(needRefreshKeyIn=0),是续期的根凭据
//   - comm.tmeLoginType 要带对(本号实测为 2);用抓取时存的 login_type
// 只要 cron 每 ≤3 天跑一次,musickey 永远在有效期内,无需再开 App。
async function refreshKey(snap, uin) {
    if (!snap.refresh_key) {
        $.log("[WARN] 无 refresh_key,跳过续期(authst 失效则需重抓)");
        return;
    }
    const body = {
        comm: { ct: 24, cv: 0, format: "json", tmeAppID: "qqmusic", tmeLoginType: snap.login_type || "1", uin: Number(uin), authst: snap.authst },
        req1: {
            module: "music.login.LoginServer",
            method: "Login",
            param: { str_musicid: uin, musicid: Number(uin), musickey: snap.authst, refresh_key: snap.refresh_key, loginMode: 2 },
        },
    };
    const res = await post(API_URL, JSON.stringify(body));
    debug(res, "refreshKey");

    const data = (res && res.req1 && res.req1.data) || {};
    if (res && res.code === 0 && res.req1 && res.req1.code === 0 && data.musickey) {
        snap.authst = data.musickey;
        if (data.refresh_key) snap.refresh_key = data.refresh_key; // 通常不变,变了也跟上
        snap.ts = Date.now();
        $.setjson(snap, CK_KEY);
        $.log(`[INFO] musickey 已续期 (${Math.round((data.keyExpiresIn || 0) / 86400)} 天有效)`);
    } else {
        // 续期失败:refresh_key 可能已失效,或 cron 停了 >3 天 musickey 也过期了
        $.log(`[WARN] 续期失败 (req1.code=${res && res.req1 ? res.req1.code : "?"}),用库存 authst 继续`);
    }
}

// ============ 请求 ============

function post(url, body, extraHeaders = {}, logRequest = true) {
    return new Promise((resolve) => {
        const opts = {
            url,
            headers: {
                "content-type": "application/json",
                accept: "application/json",
                "User-Agent": UA,
                ...extraHeaders,
            },
            body,
        };
        if (logRequest) debug(`${url}\n${body}`, "POST request");
        $.post(opts, (err, resp, data) => {
            if (err) {
                $.log(`[ERROR] POST 失败: ${$.toStr(err)}`);
                resolve(null);
                return;
            }
            try {
                resolve(typeof data === "string" ? JSON.parse(data) : data);
            } catch (e) {
                $.log(`[ERROR] 响应解析失败,前300: ${String(data || "").slice(0, 300)}`);
                resolve(null);
            }
        });
    });
}

// ============ 工具 ============

function lowerKeys(obj) {
    if (!obj) return {};
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]));
}

function taskOff(key) {
    const value = $.getdata(key);
    return value === false || value === 0 || value === "false" || value === "0";
}

function taskOn(key) {
    const value = $.getdata(key);
    return value === true || value === 1 || value === "true" || value === "1";
}

function randomHex32() {
    let value = "";
    while (value.length < 32) value += Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, "0");
    return value.slice(0, 32);
}

function hash33(text) {
    let hash = 5381;
    for (let i = 0; i < text.length; i++) hash += (hash << 5) + text.charCodeAt(i);
    return hash & 0x7fffffff;
}

function zzcSign(payload) {
    const hash = sha1Hex(payload).toUpperCase();
    const part1Indexes = [23, 14, 6, 36, 16, 7, 19];
    const part2Indexes = [16, 1, 32, 12, 19, 27, 8, 5];
    const scramble = [89, 39, 179, 150, 218, 82, 58, 252, 177, 52, 186, 123, 120, 64, 242, 133, 143, 161, 121, 179];
    const part1 = part1Indexes.map((i) => hash[i]).join("");
    const part2 = part2Indexes.map((i) => hash[i]).join("");
    const bytes = scramble.map((value, i) => value ^ parseInt(hash.slice(i * 2, i * 2 + 2), 16));
    const middle = bytesToBase64(bytes).replace(/[\\/+=]/g, "");
    return `zzc${part1}${middle}${part2}`.toLowerCase();
}

function sha1Hex(text) {
    const input = unescape(encodeURIComponent(text));
    const words = [];
    for (let i = 0; i < input.length; i++) {
        words[i >> 2] = (words[i >> 2] || 0) | input.charCodeAt(i) << (24 - (i % 4) * 8);
    }
    words[input.length >> 2] = (words[input.length >> 2] || 0) | 0x80 << (24 - (input.length % 4) * 8);
    words[(((input.length + 8) >> 6) + 1) * 16 - 1] = input.length * 8;

    let h0 = 0x67452301;
    let h1 = 0xefcdab89;
    let h2 = 0x98badcfe;
    let h3 = 0x10325476;
    let h4 = 0xc3d2e1f0;
    const w = new Array(80);
    for (let offset = 0; offset < words.length; offset += 16) {
        for (let i = 0; i < 80; i++) {
            w[i] = i < 16 ? (words[offset + i] || 0) : rotateLeft(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
        }
        let a = h0;
        let b = h1;
        let c = h2;
        let d = h3;
        let e = h4;
        for (let i = 0; i < 80; i++) {
            let f;
            let k;
            if (i < 20) {
                f = b & c | ~b & d;
                k = 0x5a827999;
            } else if (i < 40) {
                f = b ^ c ^ d;
                k = 0x6ed9eba1;
            } else if (i < 60) {
                f = b & c | b & d | c & d;
                k = 0x8f1bbcdc;
            } else {
                f = b ^ c ^ d;
                k = 0xca62c1d6;
            }
            const temp = (rotateLeft(a, 5) + f + e + k + w[i]) | 0;
            e = d;
            d = c;
            c = rotateLeft(b, 30);
            b = a;
            a = temp;
        }
        h0 = h0 + a | 0;
        h1 = h1 + b | 0;
        h2 = h2 + c | 0;
        h3 = h3 + d | 0;
        h4 = h4 + e | 0;
    }
    return [h0, h1, h2, h3, h4]
        .map((value) => (`00000000${(value >>> 0).toString(16)}`).slice(-8))
        .join("");
}

function rotateLeft(value, bits) {
    return value << bits | value >>> (32 - bits);
}

function bytesToBase64(bytes) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let out = "";
    for (let i = 0; i < bytes.length; i += 3) {
        const a = bytes[i];
        const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
        const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
        const value = a << 16 | b << 8 | c;
        out += chars[(value >>> 18) & 63];
        out += chars[(value >>> 12) & 63];
        out += i + 1 < bytes.length ? chars[(value >>> 6) & 63] : "=";
        out += i + 2 < bytes.length ? chars[value & 63] : "=";
    }
    return out;
}

function getCoinSignConfig(rawBody) {
    if (!rawBody) return {};
    try {
        const body = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
        const reqs = body && typeof body === "object" ? Object.values(body) : [];
        const matches = reqs.filter((item) =>
            item &&
            item.module === "music.actCenter.ActCenterSignNewSvr" &&
            item.param &&
            item.param.ActID
        );
        const req = matches[0];
        const sceneReq = matches.find((item) => item.param.ScenesID);
        return req ? {
            actID: String(req.param.ActID),
            sceneID: sceneReq ? String(sceneReq.param.ScenesID) : "",
        } : {};
    } catch (e) {
        $.log(`[WARN] 金币签到配置解析失败,继续使用默认值: ${e.message || e}`);
        return {};
    }
}

// 清理代理合并多 cookie 头时残留的 "cookie:" 脏前缀,拼回标准 "k=v; k=v"
function normalizeCookie(raw) {
    if (!raw) return "";
    const parts = Array.isArray(raw) ? raw : String(raw).split(/\r?\n/);
    return parts
        .map((p) => String(p).replace(/^cookie\s*:\s*/i, "").trim())
        .filter(Boolean)
        .join("; ");
}

function debug(content, title = "debug") {
    if ($.is_debug !== "true") return;
    $.log(`\n----- ${title} -----`);
    const text = typeof content === "string" ? content : $.toStr(content);
    $.log(redactSensitive(text));
    $.log(`----- end -----\n`);
}

function redactSensitive(text) {
    return String(text || "")
        .replace(/("(?:authst|musickey|refresh_key|uin|musicid|str_musicid|cookie|verify_str|EcpmToken|AdToken)"\s*:\s*")[^"]*/gi, "$1<redacted>")
        .replace(/("(?:uin|musicid)"\s*:\s*)\d+/gi, "$1<redacted>")
        .replace(/(qm_keyst=)[^;\s]+/gi, "$1<redacted>")
        .replace(/(refresh_key=)[^;\s]+/gi, "$1<redacted>")
        .replace(/(sign=)[^&\s]+/gi, "$1<redacted>");
}

async function sendMsg(message) {
    if (!message) return;
    if ($.isNode()) {
        try {
            const notify = require("./sendNotify");
            await notify.sendNotify($.name, message);
        } catch (e) {
            $.log(`\n${$.name}\n${message}`);
        }
    } else {
        $.msg($.name, "", message);
    }
}

// ============ 入口 ============

if (typeof $request !== "undefined") {
    if (/\/maproxy\/getInfo(?:\?|$)/.test($request.url || "")) captureAdTemplate();
    else getCookie();
    $.done();
} else if (JSON.parse($.getdata("qqmusic_clear") || "false")) {
    // BoxJS 一键清除 Cookie:清完自动复位开关
    $.setdata("", CK_KEY);
    $.setdata("", AD_TEMPLATE_KEY);
    $.setdata("false", "qqmusic_clear");
    $.msg($.name, "", "✅ Cookie 已清除,请重新抓取");
    $.done();
} else {
    (async () => {
        await checkin();
    })()
        .catch((e) => {
            $.messages.push(e.message || String(e));
            $.logErr(e);
        })
        .finally(async () => {
            await sendMsg($.messages.join("\n"));
            $.done();
        });
}

// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,a)=>{s.call(this,t,(t,s,r)=>{t?a(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}getEnv(){return"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"!=typeof module&&module.exports?"Node.js":"undefined"!=typeof $task?"Quantumult X":"undefined"!=typeof $loon?"Loon":"undefined"!=typeof $rocket?"Shadowrocket":void 0}isNode(){return"Node.js"===this.getEnv()}isQuanX(){return"Quantumult X"===this.getEnv()}isSurge(){return"Surge"===this.getEnv()}isLoon(){return"Loon"===this.getEnv()}isShadowrocket(){return"Shadowrocket"===this.getEnv()}isStash(){return"Stash"===this.getEnv()}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const a=this.getdata(t);if(a)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,a)=>e(a))})}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),a=!s&&this.fs.existsSync(e);if(!s&&!a)return{};{const a=s?t:e;try{return JSON.parse(this.fs.readFileSync(a))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),a=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):a?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}getdata(t){return this.getval(t)}setdata(t,e){return this.setval(t,e)}getval(t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.read(t);case"Quantumult X":return $prefs.valueForKey(t);case"Node.js":return this.data=this.loaddata(),this.data[t];default:return this.data&&this.data[t]||null}}setval(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.write(t,e);case"Quantumult X":return $prefs.setValueForKey(t,e);case"Node.js":return this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0;default:return this.data&&this.data[e]||null}}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){switch(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"],delete t.headers["content-type"],delete t.headers["content-length"]),t.params&&(t.url+="?"+this.queryStr(t.params)),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,a)=>{!t&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,a)});break;case"Quantumult X":this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:a,headers:r,body:i,bodyBytes:o}=t;e(null,{status:s,statusCode:a,headers:r,body:i,bodyBytes:o},i,o)},t=>e(t&&t.error||"UndefinedError"));break;case"Node.js":let s=require("iconv-lite");this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:a,statusCode:r,headers:i,rawBody:o}=t,n=s.decode(o,this.encoding);e(null,{status:a,statusCode:r,headers:i,rawBody:o,body:n},n)},t=>{const{message:a,response:r}=t;e(a,r,r&&s.decode(r.rawBody,this.encoding))})}}post(t,e=(()=>{})){const s=t.method?t.method.toLocaleLowerCase():"post";switch(t.body&&t.headers&&!t.headers["Content-Type"]&&!t.headers["content-type"]&&(t.headers["content-type"]="application/x-www-form-urlencoded"),t.headers&&(delete t.headers["Content-Length"],delete t.headers["content-length"]),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](t,(t,s,a)=>{!t&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,a)});break;case"Quantumult X":t.method=s,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:a,headers:r,body:i,bodyBytes:o}=t;e(null,{status:s,statusCode:a,headers:r,body:i,bodyBytes:o},i,o)},t=>e(t&&t.error||"UndefinedError"));break;case"Node.js":let a=require("iconv-lite");this.initGotEnv(t);const{url:r,...i}=t;this.got[s](r,i).then(t=>{const{statusCode:s,statusCode:r,headers:i,rawBody:o}=t,n=a.decode(o,this.encoding);e(null,{status:s,statusCode:r,headers:i,rawBody:o,body:n},n)},t=>{const{message:s,response:r}=t;e(s,r,r&&a.decode(r.rawBody,this.encoding))})}}time(t,e=null){const s=e?new Date(e):new Date;let a={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in a)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?a[e]:("00"+a[e]).substr((""+a[e]).length)));return t}queryStr(t){let e="";for(const s in t){let a=t[s];null!=a&&""!==a&&("object"==typeof a&&(a=JSON.stringify(a)),e+=`${s}=${a}&`)}return e=e.substring(0,e.length-1),e}msg(e=t,s="",a="",r){const i=t=>{switch(typeof t){case void 0:return t;case"string":switch(this.getEnv()){case"Surge":case"Stash":default:return{url:t};case"Loon":case"Shadowrocket":return t;case"Quantumult X":return{"open-url":t};case"Node.js":return}case"object":switch(this.getEnv()){case"Surge":case"Stash":case"Shadowrocket":default:{let e=t.url||t.openUrl||t["open-url"];return{url:e}}case"Loon":{let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}case"Quantumult X":{let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl,a=t["update-pasteboard"]||t.updatePasteboard;return{"open-url":e,"media-url":s,"update-pasteboard":a}}case"Node.js":return}default:return}};if(!this.isMute)switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:$notification.post(e,s,a,i(r));break;case"Quantumult X":$notify(e,s,a,i(r));break;case"Node.js":}if(!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),a&&t.push(a),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:this.log("",`❗️${this.name}, 错误!`,t);break;case"Node.js":this.log("",`❗️${this.name}, 错误!`,t.stack)}}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;switch(this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:$done(t);break;case"Node.js":process.exit(1)}}}(t,e)}
