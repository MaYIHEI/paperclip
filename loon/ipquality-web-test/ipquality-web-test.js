/**
 * 节点 IP 质量检测 · Rewrite v2 网页测试
 *
 * 使用:在 Loon 节点页运行测试动作，检测完成后点通知在 Safari 查看本地报告
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-08-03
 *
 * ===== Loon =====
 * [Script]
 * generic script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/loon/ipquality-web-test/ipquality-web-test.js?ver=poc2, tag=节点 IP 质量检测 · 网页测试, timeout=65, img-url=safari.system, argument=[{mask},{media},{map},{fold},{basic},{egress},{bgp},{bgppath},{speed},{inbound},{ping},{mtr},{stability},{types},{scores},{factors},{mediaout},{regions},{status}], enable=true
 */

const TEST_VERSION = "2026-08-03.poc2";
const SOURCE_URL = "https://raw.githubusercontent.com/MaYIHEI/paperclip/eaa04fe0a9f37ccfafdd11930d28fd5ff3f04718/loon/ipquality/ipquality.js";
const VIEWER_URL = "http://paperclip.test/ipquality";
const MAX_VIEWER_URL_LENGTH = 180000;
const nativeDone = $done;
const runtimeArguments = typeof $argument !== "undefined" && $argument ? $argument : {};

const ARGUMENT_BY_LABEL = {
    "隐藏 IP": "mask",
    "执行媒体与 AI 检测": "media",
    "地图通知": "map",
    "低负载报告": "fold",
    "显示基础信息": "basic",
    "显示出口分流": "egress",
    "显示 BGP 信息": "bgp",
    "显示目标前缀 BGP 路径": "bgppath",
    "测试三网真实测速": "speed",
    "测试三网地区测速": "speed",
    "测试运营商官网": "speed",
    "测试外部探针入站路径": "inbound",
    "测试外部探针 Ping": "ping",
    "测试外部探针 MTR": "mtr",
    "测试 HTTPS 稳定性": "stability",
    "显示 IP 类型": "types",
    "显示风险评分": "scores",
    "显示风险因素": "factors",
    "显示媒体与 AI 结果": "mediaout",
    "显示地区一致性": "regions",
    "显示数据状态": "status",
};

runDetector();

function runDetector() {
    console.log(`[INFO] Rewrite v2 网页报告测试 ${TEST_VERSION}`);
    $httpClient.get({ url: SOURCE_URL, timeout: 12000 }, (error, response, body) => {
        if (error || !response || response.status < 200 || response.status >= 300 || !body) {
            finishError(`检测脚本载入失败: ${error || `HTTP ${response && response.status || "未知"}`}`);
            return;
        }

        const argumentStore = {
            read(label) {
                const key = ARGUMENT_BY_LABEL[String(label || "")];
                return key ? readArgument(key) : null;
            },
            write() {
                return false;
            },
            remove() {
                return false;
            },
        };

        try {
            const execute = new Function(
                "$done",
                "$persistentStore",
                `${body}\n//# sourceURL=paperclip-ipquality-r32.js`
            );
            execute(captureDetectorResult, argumentStore);
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

    const record = JSON.stringify({
        version: TEST_VERSION,
        createdAt: Date.now(),
        html: String(result.htmlMessage),
        titleColor: String(result["title-color"] || ""),
    });
    const payload = `v1.${encodeReport(record)}`;
    const openUrl = `${VIEWER_URL}#${payload}`;
    if (openUrl.length > MAX_VIEWER_URL_LENGTH) {
        finishError(`网页报告地址过长（${openUrl.length} 字符），请减少本次显示分区后重试`);
        return;
    }

    $notification.post(
        "节点 IP 质量检测完成",
        "Rewrite v2 本地网页已生成",
        "点击在 Safari 查看完整报告",
        { openUrl }
    );
    nativeDone({
        title: "节点 IP 质量检测 · 网页测试",
        content: `完整报告已生成（地址 ${openUrl.length} 字符）。请点击刚刚发送的通知，在 Safari 中查看。`,
        icon: "safari",
        "title-color": result["title-color"] || "#0A84FF",
    });
}

function readArgument(key) {
    const value = runtimeArguments && runtimeArguments[key];
    if (value === null || typeof value === "undefined" || value === "") return false;
    return !(value === false || value === 0 || value === "false" || value === "0");
}

function encodeReport(text) {
    const binary = utf8Encode(String(text || ""));
    const codes = lzwCompress(binary);
    let packed = "";
    for (let index = 0; index < codes.length; index += 1) {
        packed += String.fromCharCode((codes[index] >>> 8) & 255, codes[index] & 255);
    }
    return base64UrlEncode(packed);
}

function utf8Encode(value) {
    return encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
    });
}

function lzwCompress(binary) {
    if (!binary) return [];
    const dictionary = Object.create(null);
    const output = [];
    let nextCode = 256;
    let phrase = binary.charAt(0);
    for (let index = 1; index < binary.length; index += 1) {
        const current = binary.charAt(index);
        const combined = phrase + current;
        if (Object.prototype.hasOwnProperty.call(dictionary, combined)) {
            phrase = combined;
            continue;
        }
        output.push(phrase.length > 1 ? dictionary[phrase] : phrase.charCodeAt(0));
        if (nextCode <= 65535) dictionary[combined] = nextCode++;
        phrase = current;
    }
    output.push(phrase.length > 1 ? dictionary[phrase] : phrase.charCodeAt(0));
    return output;
}

function base64UrlEncode(binary) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let output = "";
    for (let index = 0; index < binary.length; index += 3) {
        const first = binary.charCodeAt(index) & 255;
        const hasSecond = index + 1 < binary.length;
        const hasThird = index + 2 < binary.length;
        const second = hasSecond ? binary.charCodeAt(index + 1) & 255 : 0;
        const third = hasThird ? binary.charCodeAt(index + 2) & 255 : 0;
        output += alphabet[first >>> 2];
        output += alphabet[((first & 3) << 4) | (second >>> 4)];
        output += hasSecond ? alphabet[((second & 15) << 2) | (third >>> 6)] : "=";
        output += hasThird ? alphabet[third & 63] : "=";
    }
    return output.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
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
