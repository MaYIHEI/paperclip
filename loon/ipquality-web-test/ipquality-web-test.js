/**
 * 节点 IP 质量检测 · 本地网页报告测试
 *
 * 使用:在 Loon 节点页运行测试动作，检测完成后点通知在 Safari 查看本地报告
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-08-03
 *
 * ===== Loon =====
 * [Script]
 * generic script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/loon/ipquality-web-test/ipquality-web-test.js?ver=poc1, tag=节点 IP 质量检测 · 网页测试, timeout=65, img-url=safari.system, enable=true
 * http-request ^http:\/\/paperclip\.test\/ipquality(?:[\/?].*)?$ script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/loon/ipquality-web-test/ipquality-web-test.js?ver=poc1, tag=节点 IP 质量检测 · 本地报告, timeout=10, enable=true
 */

const TEST_VERSION = "2026-08-03.poc1";
const SOURCE_URL = "https://raw.githubusercontent.com/MaYIHEI/paperclip/eaa04fe0a9f37ccfafdd11930d28fd5ff3f04718/loon/ipquality/ipquality.js";
const VIEWER_URL = "http://paperclip.test/ipquality";
const REPORT_KEY = "paperclip.ipquality.web-test.report";
const OPTION_PREFIX = "网页测试·";
const MAX_REPORT_AGE_MS = 30 * 60 * 1000;

const nativeDone = $done;
const nativeStore = $persistentStore;

if (typeof $request !== "undefined" && /^http:\/\/paperclip\.test\/ipquality(?:[\/?]|$)/i.test($request.url || "")) {
    serveReport();
} else {
    runDetector();
}

function runDetector() {
    console.log(`[INFO] 本地网页报告测试 ${TEST_VERSION}`);
    $httpClient.get({ url: SOURCE_URL, timeout: 12000 }, (error, response, body) => {
        if (error || !response || response.status < 200 || response.status >= 300 || !body) {
            finishError(`检测脚本载入失败: ${error || `HTTP ${response && response.status || "未知"}`}`);
            return;
        }

        const scopedStore = {
            read(key) {
                return nativeStore.read(`${OPTION_PREFIX}${key}`);
            },
            write(value, key) {
                return nativeStore.write(value, `${OPTION_PREFIX}${key}`);
            },
            remove(key) {
                if (typeof nativeStore.remove !== "function") return false;
                return nativeStore.remove(`${OPTION_PREFIX}${key}`);
            },
        };

        try {
            const execute = new Function(
                "$done",
                "$persistentStore",
                `${body}\n//# sourceURL=paperclip-ipquality-r32.js`
            );
            execute(captureDetectorResult, scopedStore);
        } catch (runtimeError) {
            finishError(`检测脚本启动失败: ${errorText(runtimeError)}`);
        }
    });
}

function captureDetectorResult(result) {
    if (!result || !result.htmlMessage) {
        nativeDone(result || {
            title: "节点 IP 质量检测 · 网页测试",
            content: "检测未生成可展示的报告",
            icon: "network.slash",
        });
        return;
    }

    const record = {
        version: TEST_VERSION,
        createdAt: Date.now(),
        html: String(result.htmlMessage),
        titleColor: String(result["title-color"] || ""),
    };
    const saved = nativeStore.write(JSON.stringify(record), REPORT_KEY);
    if (!saved) {
        finishError("完整报告写入本地缓存失败");
        return;
    }

    const openUrl = `${VIEWER_URL}?t=${record.createdAt}`;
    $notification.post(
        "节点 IP 质量检测完成",
        "本地网页报告已生成",
        "点击在 Safari 查看完整报告",
        { openUrl }
    );
    nativeDone({
        title: "节点 IP 质量检测 · 网页测试",
        content: "完整报告已保存在本机。请点击刚刚发送的通知，在 Safari 中查看。",
        icon: "safari",
        "title-color": record.titleColor || "#0A84FF",
    });
}

function serveReport() {
    let record;
    try {
        record = JSON.parse(nativeStore.read(REPORT_KEY) || "null");
    } catch (_) {
        record = null;
    }

    const age = record && Number(record.createdAt)
        ? Math.max(0, Date.now() - Number(record.createdAt))
        : Number.POSITIVE_INFINITY;
    const body = record && record.html
        ? buildDocument(record, age)
        : buildEmptyDocument();

    nativeDone({
        response: {
            status: 200,
            headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "no-store, no-cache, must-revalidate",
                Pragma: "no-cache",
            },
            body,
        },
    });
}

function buildDocument(record, age) {
    const expired = age > MAX_REPORT_AGE_MS;
    const time = new Date(Number(record.createdAt)).toLocaleString("zh-CN", { hour12: false });
    const banner = expired
        ? '<div class="notice warning">这是一份超过 30 分钟的缓存报告，请返回 Loon 重新检测。</div>'
        : `<div class="notice">本地报告 · ${escapeHtml(time)} · ${escapeHtml(record.version || TEST_VERSION)}</div>`;
    return '<!doctype html><html lang="zh-CN"><head>'
        + '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        + '<meta name="color-scheme" content="light dark"><title>节点 IP 质量报告</title>'
        + viewerStyle()
        + `</head><body>${banner}<main class="viewer">${record.html}</main>`
        + '<footer>报告由 Loon 在本机生成 · 页面未连接外部报告服务器</footer>'
        + '</body></html>';
}

function buildEmptyDocument() {
    return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">'
        + '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        + '<meta name="color-scheme" content="light dark"><title>暂无报告</title>'
        + viewerStyle()
        + '</head><body><main class="empty"><div class="empty-icon">⌁</div>'
        + '<h1>暂无本地报告</h1><p>请返回 Loon，在节点页面运行“节点 IP 质量检测 · 网页测试”。</p>'
        + '</main></body></html>';
}

function viewerStyle() {
    return '<style>'
        + ':root{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;background:#f2f2f7;color:#1c1c1e}'
        + 'body{margin:0;min-height:100vh;background:#f2f2f7;-webkit-font-smoothing:antialiased}'
        + '.viewer{box-sizing:border-box;width:min(100%,720px);min-height:100vh;margin:0 auto;padding:18px 22px 30px;background:#fff;box-shadow:0 0 32px rgba(0,0,0,.06)}'
        + '.notice{box-sizing:border-box;width:min(calc(100% - 28px),692px);margin:14px auto 0;padding:10px 13px;border-radius:12px;background:#e8f3ff;color:#0066cc;font-size:12px;line-height:1.45}'
        + '.notice.warning{background:#fff3db;color:#9a5b00}'
        + 'footer{box-sizing:border-box;width:min(100%,720px);margin:0 auto;padding:22px;color:#8e8e93;text-align:center;font-size:11px;background:#fff}'
        + '.empty{box-sizing:border-box;max-width:520px;margin:18vh auto 0;padding:30px;text-align:center}'
        + '.empty-icon{font-size:52px;color:#8e8e93}.empty h1{font-size:22px}.empty p{color:#8e8e93;line-height:1.6}'
        + '@media(max-width:520px){.viewer{padding:14px 18px 28px;box-shadow:none}.notice{margin-top:10px}}'
        + '@media(prefers-color-scheme:dark){:root,body{background:#000;color:#f2f2f7}.viewer,footer{background:#111113}.notice{background:#102b45;color:#64b5ff}.notice.warning{background:#3a2a0b;color:#ffc766}}'
        + '</style>';
}

function finishError(message) {
    nativeDone({
        title: "节点 IP 质量检测 · 网页测试",
        content: message,
        icon: "network.slash",
    });
}

function errorText(error) {
    return error && (error.message || error.toString()) || "未知错误";
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
