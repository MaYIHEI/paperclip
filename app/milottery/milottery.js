/**
 * 小米抽奖 · 自动完成活动任务并抽奖
 *
 * 抓取:打开小米商城 APP → 狂欢礼 → 进入抽奖活动页,抓 Cookie 与活动配置
 * 签到:cron 自动完成分享/浏览任务并用完抽奖次数
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-07-13
 *
 * ===== Loon =====
 * [MITM]
 * hostname = shop-api.retail.mi.com
 *
 * [Script]
 * http-request ^https:\/\/shop-api\.retail\.mi\.com\/mtop\/navi\/venue\/batch tag=小米抽奖 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/milottery/milottery.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mishop.png
 *
 * cron "30 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/milottery/milottery.js, tag=小米抽奖签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mishop.png, timeout=240, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = %APPEND% shop-api.retail.mi.com
 *
 * [Script]
 * 小米抽奖 Cookie = type=http-request,pattern=^https:\/\/shop-api\.retail\.mi\.com\/mtop\/navi\/venue\/batch,requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/milottery/milottery.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mishop.png
 *
 * 小米抽奖签到 = type=cron,cronexp=30 8 * * *,timeout=240,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/milottery/milottery.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mishop.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = shop-api.retail.mi.com
 *
 * [rewrite_local]
 * ^https:\/\/shop-api\.retail\.mi\.com\/mtop\/navi\/venue\/batch url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/milottery/milottery.js
 *
 * [task_local]
 * 30 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/milottery/milottery.js, tag=小米抽奖签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mishop.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: 小米抽奖签到
 *       cron: '30 8 * * *'
 *       timeout: 240
 *
 * http:
 *   mitm:
 *     - "shop-api.retail.mi.com"
 *   script:
 *     - match: ^https:\/\/shop-api\.retail\.mi\.com\/mtop\/navi\/venue\/batch
 *       name: 小米抽奖 Cookie
 *       type: request
 *       require-body: true
 *
 * script-providers:
 *   小米抽奖签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/milottery/milottery.js
 *     interval: 86400
 */

const $ = new Env("小米抽奖");

const SCRIPT_VERSION = "2026-07-13.r1"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

const CK_KEY = "milottery_data";
const API = "https://shop-api.retail.mi.com";
const ACT_API = "https://act-api.retail.mi.com";
const BATCH_PATH = "/mtop/navi/venue/batch";
const SUPPORTED_TASK_TYPES = [101, 200];

if (typeof $request !== "undefined") {
    capture();
} else if (JSON.parse($.getdata("milottery_clear") || "false")) {
    $.setdata("", CK_KEY);
    $.setdata("false", "milottery_clear");
    $.msg($.name, "", "✅ Cookie 已清除，请重新抓取");
    $.done();
} else {
    run().finally(() => $.done());
}

function capture() {
    $.log(`[INFO] 抓取钩子命中 ${$request.url}`);
    const body = $request.body || "";
    const query = mainTaskQuery(body);
    if (!query) {
        $.done();
        return;
    }

    const headers = cleanHeaders($request.headers || {});
    const cookie = normalizeCookie(header(headers, "cookie"));
    if (!cookie) {
        $.msg($.name, "❌ Cookie 获取失败", "活动请求中没有 Cookie，请确认已登录小米商城");
        $.done();
        return;
    }

    setHeader(headers, "cookie", cookie);
    const current = {
        url: ($request.url || API + BATCH_PATH).replace(/\?.*$/, ""),
        headers,
        body,
        actId: query.actId,
        capturedAt: Date.now(),
    };

    let data = current;
    let notify = true;
    try {
        const saved = JSON.parse($.getdata(CK_KEY) || "null");
        const sameActivity = saved && saved.actId === current.actId;
        const currentNative = !!header(current.headers, "mishop-client-id");
        if (sameActivity && !currentNative) {
            data = saved;
            setHeader(data.headers, "cookie", cookie);
            data.capturedAt = current.capturedAt;
            notify = false;
        } else if (sameActivity && currentNative) {
            notify = false;
        }
    } catch (e) {
        debug(`saved data parse error: ${e.message || e}`);
    }

    const ok = $.setdata(JSON.stringify(data), CK_KEY);
    const saved = $.getdata(CK_KEY);
    if (ok && saved && notify) {
        $.msg($.name, "", "✅ 小米抽奖 Cookie 获取成功");
    } else if (!ok || !saved) {
        $.msg($.name, "❌ Cookie 保存失败", "请查看脚本日志后重试");
    }
    $.done();
}

async function run() {
    const raw = $.getdata(CK_KEY);
    if (!raw) {
        $.msg($.name, "🚫 缺少 Cookie", "请先进入小米商城 APP → 狂欢礼 → 抽奖活动页抓取");
        return;
    }

    let auth;
    try {
        auth = JSON.parse(raw);
    } catch (e) {
        $.msg($.name, "🚫 Cookie 解析失败", "请清除后重新抓取");
        return;
    }
    if (!auth.body || !header(auth.headers || {}, "cookie")) {
        $.msg($.name, "🚫 Cookie 不完整", "请重新进入抽奖活动页抓取");
        return;
    }

    const first = await queryTasks(auth);
    if (!first) return;
    let tasks = extractTasks(first);
    const lottery = tasks.find((task) => Number(task.taskType) === 128);
    if (!lottery) {
        $.msg($.name, "⚠️ 未找到抽奖活动", "活动配置可能已更新，请重进活动页抓取");
        debug(`task query raw: ${JSON.stringify(first).slice(0, 500)}`);
        return;
    }

    const now = Number(lottery.serverTime || Date.now());
    if ((lottery.startTime && now < lottery.startTime) || (lottery.endTime && now > lottery.endTime)) {
        $.msg($.name, "⚠️ 活动不在有效期", "请进入当前抽奖活动页重新抓取配置");
        return;
    }

    const taskResult = { done: 0, skipped: 0, failed: [] };
    let actionCount = 0;
    for (const task of tasks.filter((item) => SUPPORTED_TASK_TYPES.includes(Number(item.taskType)))) {
        const remaining = Math.max(0, Number(task.totalNumber || 0) - Number(task.finishedNumber || 0));
        if (!remaining) {
            taskResult.skipped++;
            continue;
        }
        const count = Math.min(remaining, Number(task.upperLimit || remaining), 10);
        for (let i = 0; i < count; i++) {
            if (actionCount > 0) {
                const gap = randomInt(1200, 3500);
                debug(`task gap ${gap}ms`);
                await sleep(gap);
            }
            const result = await completeTask(auth, task);
            actionCount++;
            if (result.ok) taskResult.done++;
            else {
                taskResult.failed.push(`${task.taskName || task.taskId}: ${result.message}`);
                break;
            }
        }
    }

    const refreshed = await queryTasks(auth);
    if (!refreshed) return;
    tasks = extractTasks(refreshed);
    const drawTask = tasks.find((task) => Number(task.taskType) === 128);
    if (!drawTask) {
        $.msg($.name, "⚠️ 任务已处理", "重新查询后未找到抽奖任务");
        return;
    }

    const singleCost = Math.max(1, Number(drawTask.singleCostScores || 1));
    const available = Math.floor(Number(drawTask.scores || 0) / singleCost);
    const drawLimit = Math.max(0, Number(drawTask.totalNumber || 0) - Number(drawTask.finishedNumber || 0));
    const drawCount = Math.min(available, drawLimit, 30);
    const drawResult = { count: 0, empty: 0, prizes: [], failed: "" };

    for (let i = 0; i < drawCount; i++) {
        const result = await draw(auth, drawTask);
        if (!result.ok) {
            drawResult.failed = result.message;
            break;
        }
        drawResult.count++;
        const awards = result.awards.filter((award) => Number(award.awardType) !== 0);
        if (!awards.length) drawResult.empty++;
        for (const award of awards) {
            const name = award.customAwardName || award.awardName || "奖励";
            const value = award.awardValue && award.awardValue !== "1" ? ` +${award.awardValue}` : "";
            drawResult.prizes.push(`${name}${value}`);
        }
        if (i + 1 < drawCount) await sleep(2800);
    }

    const lines = [
        `任务完成 ${taskResult.done} 次${taskResult.skipped ? ` · 已完成 ${taskResult.skipped} 项` : ""}`,
        `抽奖 ${drawResult.count}/${drawCount} 次${drawResult.empty ? ` · 未中奖 ${drawResult.empty} 次` : ""}`,
    ];
    if (drawResult.prizes.length) lines.push(`🎁 ${drawResult.prizes.join("、")}`);
    if (taskResult.failed.length) lines.push(`⚠️ ${taskResult.failed[0]}`);
    if (drawResult.failed) lines.push(`⚠️ 抽奖中止: ${drawResult.failed}`);

    const ok = !taskResult.failed.length && !drawResult.failed;
    $.msg($.name, ok ? "✅ 执行完成" : "⚠️ 部分完成", lines.join("\n"));
}

async function queryTasks(auth) {
    const result = await request(auth.url || API + BATCH_PATH, auth.headers, auth.body);
    if (!result) {
        $.msg($.name, "❌ 查询任务失败", "网络无响应，请稍后重试");
        return null;
    }
    if (Number(result.code) !== 0) {
        const message = result.message || result.msg || "未知错误";
        $.msg($.name, "❌ 查询任务失败", `${message}；若提示未登录，请重进活动页抓取`);
        debug(`query raw: ${JSON.stringify(result).slice(0, 500)}`);
        return null;
    }
    return result;
}

async function completeTask(auth, task) {
    const start = await post(auth, "/mtop/mf/act/infinite/do", [
        {},
        { actId: task.actId, taskId: task.taskId },
    ]);
    if (!start || Number(start.code) !== 0 || !start.data || !start.data.taskToken) {
        return { ok: false, message: messageOf(start) };
    }

    if (Number(task.taskType) === 200) {
        const minSeconds = Math.max(5, Math.ceil(Number(task.duration || 5)));
        const wait = randomInt(minSeconds * 1000, (minSeconds + 3) * 1000);
        debug(`browse wait ${wait}ms: ${task.taskName || task.taskId}`);
        await sleep(wait);
        const taskApi = Number(task.subType) === 2 ? ACT_API : API;
        const extraHeaders = taskApi === ACT_API ? { needlogin: "true" } : {};
        const done = await post(auth, "/mtop/act/lego/task/done/v2", [
            {},
            { taskToken: start.data.taskToken, taskType: String(task.taskType) },
        ], taskApi, extraHeaders);
        return { ok: !!done && Number(done.code) === 0, message: messageOf(done) };
    }

    await sleep(1200);
    const done = await post(auth, "/mtop/mf/act/infinite/done", [
        {},
        { taskToken: start.data.taskToken, actId: task.actId, taskType: task.taskType },
    ]);
    return { ok: !!done && Number(done.code) === 0, message: messageOf(done) };
}

async function draw(auth, task) {
    const start = await post(auth, "/mtop/mf/act/infinite/do", [
        {},
        { actId: task.actId, taskId: task.taskId },
    ]);
    if (!start || Number(start.code) !== 0 || !start.data || !start.data.taskToken) {
        return { ok: false, message: messageOf(start), awards: [] };
    }
    const done = await post(auth, "/mtop/mf/act/infinite/done", [
        {},
        {
            actId: task.actId,
            taskToken: start.data.taskToken,
            taskType: task.taskType,
            extra: { privacyAuth: true },
        },
    ]);
    return {
        ok: !!done && Number(done.code) === 0,
        message: messageOf(done),
        awards: (done && done.data && done.data.awardList) || [],
    };
}

function post(auth, path, body, baseUrl = API, extraHeaders = {}) {
    return request(baseUrl + path, auth.headers, JSON.stringify(body), extraHeaders);
}

function request(url, sourceHeaders, body, extraHeaders = {}) {
    return new Promise((resolve) => {
        const headers = cleanHeaders(sourceHeaders || {});
        setHeader(headers, "content-type", "application/json");
        Object.keys(extraHeaders).forEach((key) => setHeader(headers, key, extraHeaders[key]));
        const opts = { url, headers, body };
        $.post(opts, (err, resp, data) => {
            if (err) {
                debug(`[${url}] request error: ${JSON.stringify(err)}`);
                resolve(null);
                return;
            }
            try {
                resolve(JSON.parse(data));
            } catch (e) {
                debug(`[${url}] parse error status=${resp && resp.statusCode}: ${(data || "").slice(0, 300)}`);
                resolve(null);
            }
        });
    });
}

function extractTasks(root) {
    const tasks = new Map();
    const walk = (value) => {
        if (!value || typeof value !== "object") return;
        if (Array.isArray(value)) {
            value.forEach(walk);
            return;
        }
        if (value.taskId && value.actId && value.taskType !== undefined) {
            const previous = tasks.get(value.taskId);
            if (!previous || Number(value.serverTime || 0) >= Number(previous.serverTime || 0)) {
                tasks.set(value.taskId, value);
            }
        }
        Object.keys(value).forEach((key) => walk(value[key]));
    };
    walk(root);
    return Array.from(tasks.values());
}

function mainTaskQuery(body) {
    if (!body || !/infinite-task/.test(body)) return null;
    try {
        const parsed = JSON.parse(body);
        const list = parsed.query_list || (Array.isArray(parsed) && parsed[1] && parsed[1].query_list) || [];
        for (const item of list) {
            if (!item || item.resolver !== "infinite-task") continue;
            const parameter = typeof item.parameter === "string" ? JSON.parse(item.parameter) : item.parameter;
            const types = (parameter && parameter.taskTypeList) || [];
            const taskIds = parameter && parameter.taskIdList;
            const filtered = Array.isArray(taskIds) ? taskIds.length > 0 : !!taskIds;
            if (!parameter || !parameter.actId || filtered) continue;
            if ([101, 128, 200].every((type) => types.map(Number).includes(type))) {
                return { actId: String(parameter.actId) };
            }
        }
        return null;
    } catch (e) {
        return null;
    }
}

function cleanHeaders(source) {
    const result = {};
    Object.keys(source || {}).forEach((key) => {
        if (/^(content-length|host|connection|accept-encoding)$/i.test(key) || key.startsWith(":")) return;
        result[key] = source[key];
    });
    return result;
}

function header(headers, name) {
    const key = Object.keys(headers || {}).find((item) => item.toLowerCase() === name.toLowerCase());
    return key ? headers[key] : "";
}

function setHeader(headers, name, value) {
    const key = Object.keys(headers || {}).find((item) => item.toLowerCase() === name.toLowerCase());
    headers[key || name] = value;
}

function normalizeCookie(raw) {
    const values = Array.isArray(raw) ? raw : [raw || ""];
    return values
        .join("\n")
        .split(/\r?\n/)
        .map((line) => line.replace(/^cookie:\s*/i, "").trim())
        .filter(Boolean)
        .join("; ")
        .replace(/;\s*;/g, ";");
}

function messageOf(result) {
    if (!result) return "网络无响应";
    return result.message || result.msg || `code=${result.code}`;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function debug(content) {
    if (($.getdata("milottery_debug") || "false") !== "true") return;
    $.log(`[DEBUG] ${typeof content === "string" ? content : JSON.stringify(content)}`);
}

function Env(s) {
    this.name = s;
    this.isSurge = () => typeof $httpClient !== "undefined";
    this.isQuanX = () => typeof $task !== "undefined";
    this.isLoon = () => typeof $loon !== "undefined";
    this.log = (...args) => console.log(args.join("\n"));
    this.msg = (title = this.name, subtitle = "", body = "") => {
        if (this.isSurge() || this.isLoon()) $notification.post(title, subtitle, body);
        else if (this.isQuanX()) $notify(title, subtitle, body);
        console.log(["", `====📣${title}====`, subtitle, body].filter(Boolean).join("\n"));
    };
    this.getdata = (key) => {
        if (this.isSurge() || this.isLoon()) return $persistentStore.read(key);
        if (this.isQuanX()) return $prefs.valueForKey(key);
        return null;
    };
    this.setdata = (value, key) => {
        if (this.isSurge() || this.isLoon()) return $persistentStore.write(value, key);
        if (this.isQuanX()) return $prefs.setValueForKey(value, key);
        return false;
    };
    this.post = (request, callback) => this.send(request, "POST", callback);
    this.send = (request, method, callback) => {
        if (this.isSurge() || this.isLoon()) {
            const fn = method === "POST" ? $httpClient.post : $httpClient.get;
            fn(request, (error, response, data) => {
                if (response) {
                    response.body = data;
                    response.statusCode = response.status || response.statusCode;
                }
                callback(error, response, data);
            });
        } else if (this.isQuanX()) {
            request.method = method;
            $task.fetch(request).then(
                (response) => callback(null, response, response.body),
                (error) => callback(error.error || error, null, null)
            );
        }
    };
    this.done = (value = {}) => {
        if (typeof $done !== "undefined") $done(value);
    };
}
