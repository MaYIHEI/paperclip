/**
 * 节点 IP 质量检测 · 模块化网页接口
 *
 * 由 Safari 本地报告页按需调用；$argument 是固定模块名，不依赖插件参数插值。
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Updated: 2026-08-03
 */

const TEST_VERSION = "2026-08-03.poc4";
const SOURCE_URL = "https://raw.githubusercontent.com/MaYIHEI/paperclip/eaa04fe0a9f37ccfafdd11930d28fd5ff3f04718/loon/ipquality/ipquality.js";
const SESSION_KEY = "paperclip.ipquality.web.session";
const SESSION_TTL_MS = 30 * 60 * 1000;

const MODULES = {
    basic: { title: "基础信息", enabled: ["显示基础信息"] },
    types: { title: "IP 类型属性", enabled: ["显示 IP 类型"] },
    scores: { title: "风险评分", enabled: ["显示风险评分"] },
    factors: { title: "风险因素", enabled: ["显示风险因素"] },
    egress: { title: "出口分流", enabled: ["显示出口分流"] },
    bgp: { title: "BGP 信息", enabled: ["显示 BGP 信息"] },
    bgppath: { title: "BGP 路径", enabled: ["显示目标前缀 BGP 路径"] },
    speed: {
        title: "三网真实测速",
        enabled: ["测试三网真实测速", "测试三网地区测速", "测试运营商官网"],
    },
    inbound: { title: "外部探针入站路径", enabled: ["测试外部探针入站路径"] },
    ping: { title: "外部探针 Ping", enabled: ["测试外部探针 Ping"] },
    mtr: { title: "外部探针 MTR", enabled: ["测试外部探针 MTR"] },
    stability: { title: "HTTPS 稳定性", enabled: ["测试 HTTPS 稳定性"] },
    media: {
        title: "流媒体与 AI",
        enabled: ["执行媒体与 AI 检测", "显示媒体与 AI 结果"],
    },
    regions: {
        title: "地区一致性",
        enabled: ["执行媒体与 AI 检测", "显示地区一致性"],
    },
    status: { title: "数据状态", enabled: ["显示数据状态"] },
};

const moduleName = normalizeModule(typeof $argument !== "undefined" ? $argument : "");
const moduleConfig = MODULES[moduleName];

if (!moduleConfig) {
    respondJson(400, { ok: false, error: "未知检测模块" });
} else {
    const session = readSession();
    const requestRun = queryValue($request && $request.url, "run");
    if (!session || !session.node || !requestRun || requestRun !== session.id) {
        respondJson(409, { ok: false, error: "检测会话无效，请返回 Loon 重新启动" });
    } else if (Date.now() - Number(session.createdAt || 0) > SESSION_TTL_MS) {
        respondJson(410, { ok: false, error: "检测会话已过期，请返回 Loon 重新启动" });
    } else {
        runModule(session);
    }
}

function runModule(session) {
    const startedAt = Date.now();
    $httpClient.get({ url: SOURCE_URL, timeout: 12000 }, (error, response, body) => {
        if (error || !response || Number(response.status) < 200 || Number(response.status) >= 300 || !body) {
            respondJson(502, {
                ok: false,
                module: moduleName,
                title: moduleConfig.title,
                error: `检测脚本载入失败：${error || `HTTP ${response && response.status || "?"}`}`,
            });
            return;
        }

        const optionStore = {
            read(label) {
                return moduleConfig.enabled.indexOf(String(label || "")) >= 0 ? "true" : "false";
            },
            write() {
                return false;
            },
            remove() {
                return false;
            },
        };

        const targetEnvironment = { params: { node: session.node } };
        try {
            const execute = new Function(
                "$done",
                "$persistentStore",
                "$environment",
                `${body}\n//# sourceURL=paperclip-ipquality-r32-${moduleName}.js`
            );
            execute((result) => {
                if (!result || !result.htmlMessage) {
                    respondJson(502, {
                        ok: false,
                        module: moduleName,
                        title: moduleConfig.title,
                        error: result && result.content || "检测未生成报告",
                    });
                    return;
                }
                respondJson(200, {
                    ok: true,
                    module: moduleName,
                    title: moduleConfig.title,
                    node: session.node,
                    elapsedMs: Date.now() - startedAt,
                    html: String(result.htmlMessage),
                    version: TEST_VERSION,
                });
            }, optionStore, targetEnvironment);
        } catch (runtimeError) {
            respondJson(500, {
                ok: false,
                module: moduleName,
                title: moduleConfig.title,
                error: runtimeError && (runtimeError.message || runtimeError.toString()) || "检测启动失败",
            });
        }
    });
}

function readSession() {
    try {
        const raw = $persistentStore.read(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (_) {
        return null;
    }
}

function queryValue(url, key) {
    const match = String(url || "").match(new RegExp(`[?&]${key}=([^&#]*)`));
    if (!match) return "";
    try {
        return decodeURIComponent(match[1].replace(/\+/g, " "));
    } catch (_) {
        return match[1];
    }
}

function normalizeModule(value) {
    return String(value || "").trim().replace(/^['"]|['"]$/g, "").toLowerCase();
}

function respondJson(status, value) {
    const body = JSON.stringify(value);
    $done({
        response: {
            status,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "no-store, no-cache, must-revalidate",
                "Access-Control-Allow-Origin": "*",
                "X-Content-Type-Options": "nosniff",
            },
            body,
        },
    });
}
