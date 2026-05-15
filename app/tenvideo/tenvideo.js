/**
 * 脚本名称：腾讯视频（精简版,只保留 VIP 签到 by @MaYIHEI）
 * 活动规则：每日签到可获取 V 力值
 * 脚本说明：添加重写后,在腾讯视频 APP 进入"我的 → 视频VIP"会员中心,即可获取 Cookie
 * 环境变量：txspCookie、isSkipTxspCheckIn
 * 更新时间：2026-05-15
 * 脚本作者：@WowYiJiu,精简 + 适配新接口 by @MaYIHEI

【更新说明 2026-05-15 (v3) by @MaYIHEI】
- 修复 ReadTaskList 仍返回空 task_list / CheckIn 返回 {} 的问题:
  补齐 H5 完整请求头 (Origin / Accept / Referer / User-Agent),
  腾讯后端对 VIP 中心 API 做了浏览器白名单校验,只发 Cookie 会被静默拒绝
- UA 同步到当前 9.03.60 版本

【更新说明 2026-05-15 (v1) by @MaYIHEI】
- 修复 cron 跑脚本时报 "未找到签到任务(task_id=101)" + "本月活跃任务已满 nullV力值":
  ReadTaskList 参数 business_id 改成 businessId(驼峰),后端新版只对驼峰返回完整任务列表
- "本月已满"判断收紧: month_limit 必须是有效正整数才进该分支,避免 undefined 时的假阳性

【更新说明 2026-05-13 by @MaYIHEI】
1. 删除腾讯体育所有功能:
   - 原脚本里"体育签到/领每日球票/领每月球票/抽抽乐"四个任务
     依赖的 act_id=118561 已被腾讯下线(抓包验证),且 module_id 全换。
   - 默认大多数用户(包括本人)不是腾讯体育会员,留着只会跑空报错。
2. 删除 vusession 刷新逻辑:
   - 原依赖的 pbaccess.video.qq.com/.../WebLoginTrpc/NewRefresh 接口已下线,
     v.qq.com 改用了新登录流程 (anywhere_door.account.QRCode + WebAccount/Login),
     抓包验证后发现:只要 txspCookie 里的 vusession 未过期(7200s),
     签到接口直接可用,无需主动刷新。
   - 因此环境变量 txspRefreshCookie / txspRefreshBody / dayOfGetMonthTicket /
     isLottery 全部废弃。
3. 简化重写规则: 只保留一条 ReadTaskList 抓 cookie,
   原本的 HotRankHttp 和 NewRefresh 两条重写都已无用。

------------------ Surge 配置 -----------------

[MITM]
hostname = vip.video.qq.com

[Script]
腾讯视频# = type=http-request,pattern=https:\/\/vip\.video\.qq\.com\/rpc\/trpc\.new_task_system\.task_system\.TaskSystem\/ReadTaskList,requires-body=0,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/app/tenvideo/tenvideo.js

腾讯视频 = type=cron,cronexp=5 7 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/app/tenvideo/tenvideo.js,script-update-interval=0

------------------ Loon 配置 ------------------

[MITM]
hostname = vip.video.qq.com

[Script]
http-request https:\/\/vip\.video\.qq\.com\/rpc\/trpc\.new_task_system\.task_system\.TaskSystem\/ReadTaskList tag=腾讯视频#, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/app/tenvideo/tenvideo.js,requires-body=0

cron "5 7 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/app/tenvideo/tenvideo.js,tag=腾讯视频,enable=true

-------------- Quantumult X 配置 --------------

[MITM]
hostname = vip.video.qq.com

[rewrite_local]
https:\/\/vip\.video\.qq\.com\/rpc\/trpc\.new_task_system\.task_system\.TaskSystem\/ReadTaskList url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/main/app/tenvideo/tenvideo.js

[task_local]
5 7 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/main/app/tenvideo/tenvideo.js, tag=腾讯视频, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/main/app/tenvideo.png, enabled=true

------------------ Stash 配置 -----------------

cron:
  script:
    - name: 腾讯视频
      cron: '5 7 * * *'
      timeout: 10

http:
  mitm:
    - "vip.video.qq.com"
  script:
    - match: https:\/\/vip\.video\.qq\.com\/rpc\/trpc\.new_task_system\.task_system\.TaskSystem\/ReadTaskList
      name: 腾讯视频
      type: request
      require-body: false

script-providers:
  腾讯视频:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/main/app/tenvideo/tenvideo.js
    interval: 86400

 */
const $ = new Env("腾讯视频");

let txspCookie = ($.isNode() ? process.env.txspCookie : $.getdata('txspCookie')) || "";
let isSkipTxspCheckIn = $.isNode() ? process.env.isSkipTxspCheckIn : (($.getdata('isSkipTxspCheckIn') !== undefined && $.getdata('isSkipTxspCheckIn') !== '') ? JSON.parse($.getdata('isSkipTxspCheckIn')) : false);

const Notify = 1;
const notify = $.isNode() ? require("./sendNotify") : "";

let isTxspVip = false, isTxspSvip = false;
let endTime = "", svipEndTime = "";
let level = "", score = "";
let month_received_score = "", month_limit = "";
let isTxspCheckIn = "";

let originalInfo = $.info;
let originalWarn = $.warn;
let originalError = $.error;
$.desc = "", $.taskInfo = "";
$.info = function (message) { originalInfo.call($, message); $.desc += message + "\n" };
$.warn = function (message) { originalWarn.call($, message); $.desc += message + "\n" };
$.error = function (message) { originalError.call($, message); $.desc += message + "\n" };

if ((isGetCookie = typeof $request !== `undefined`)) {
	getCookie();
	$.done();
} else if (!$.isNode() && !txspCookie) {
	$.msg($.name, "您未获取腾讯视频Cookie", "点击此条跳转到腾讯视频获取Cookie", { 'open-url': 'tenvideo://', 'media-url': 'https://raw.githubusercontent.com/MaYIHEI/pin/main/app/tenvideo.png' });
	$.done();
} else {
	!(async () => {
		if (!txspCookie) {
			$.warn(`未填写 txspCookie 环境变量`);
			return;
		}
		$.info(`[debug] txspCookie 长度 ${txspCookie.length}, 含 vqq_vusession=${/vqq_vusession=/.test(txspCookie)}, 含 turing_ticket=${/turing_ticket=/.test(txspCookie)}, 含 vqq_access_token=${/vqq_access_token=/.test(txspCookie)}`);
		$.info(`---- 开始 查询会员信息 ----`);
		await getVipInfo();
		$.info(`--------- 结束 ---------\n`);

		if (isTxspVip) {
			$.info(`---- 腾讯视频VIP信息 ----`);
			if (isTxspSvip) {
				$.info(`当前是腾讯视频SVIP`);
			} else {
				$.info(`当前是腾讯视频VIP`);
			}
			$.info(`当前等级：${level}`);
			$.info(`当前成长：${score}`);
			if (isTxspSvip) {
				$.info(`SVIP到期时间：${svipEndTime}`);
			}
			$.info(`VIP到期时间：${endTime}`);
			$.info(`--------- 结束 ---------\n`);

			$.info(`---- 开始 腾讯视频签到 ----`);
			if (isSkipTxspCheckIn) {
				$.info(`当前设置为不进行腾讯视频签到, 跳过`);
				$.taskInfo = `跳过签到\n`;
			} else {
				await readTxspTaskList();
				await waitRandom(1000, 2000);
				if (typeof month_limit === 'number' && month_limit > 0 && month_received_score >= month_limit) {
					$.info(`本月活跃任务已满${month_limit}V力值, 下个月再来哦`);
					$.taskInfo = `本月活跃任务已满${month_limit}V力值, 下个月再来哦\n`;
				} else if (isTxspCheckIn === 1) {
					$.info(`今天已签到, 明日再来吧`);
					$.taskInfo = `今天已签到, 明日再来吧\n`;
				} else {
					await txspCheckIn();
					await waitRandom(1000, 2000);
				}
			}
			$.info(`--------- 结束 ---------`);
		} else {
			$.warn(`当前账号不是腾讯视频 VIP, 无法签到`);
			$.taskInfo = `当前账号不是腾讯视频 VIP, 无法签到\n`;
		}
		await SendMsg();
	})()
		.catch((e) => $.error(e))
		.finally(() => $.done());
}

/**
 * 查询会员信息
 * 抓包验证: 接口路径未变, 响应里 vip/level/score/endTime/svip_info 字段全部保留
 */
async function getVipInfo() {
	return new Promise((resolve, reject) => {
		let opt = {
			url: `https://vip.video.qq.com/rpc/trpc.query_vipinfo.vipinfo.QueryVipInfo/GetVipUserInfoH5`,
			headers: {
				Cookie: txspCookie,
				'Content-Type': 'application/json',
				'Accept': 'application/json, text/plain, */*',
				'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
				'Origin': 'https://film.video.qq.com',
				'Referer': 'https://film.video.qq.com/x/grade/?ptag=usercenter.card&ovscroll=0&hidetitlebar=1&aid=V0$$1:0$2:7$3:9.03.60.25491$4:0$8:999&isDarkMode=0&uiType=REGULAR',
				'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/537.51.1 (KHTML, like Gecko) Mobile/11A465 QQLiveBrowser/9.03.60 AppType/UN WebKitCore/WKWebView iOS cellPhone/iPhone 14 Pro Max AppBuild/25491 ua_vversion_name/9.03.60.25491',
				'sec-fetch-dest': 'empty',
				'sec-fetch-mode': 'cors',
				'sec-fetch-site': 'same-site',
				'priority': 'u=3, i'
			},
			body: JSON.stringify({ "geticon": 1, "viptype": "svip", "platform": 5 })
		};
		$.post(opt, async (error, resp, data) => {
			try {
				if (typeof data === 'string') {
					$.info(`[getVipInfo] HTTP ${resp && resp.statusCode}, body 前 300 字符: ${data.substring(0, 300)}`);
				}
				if (safeGet(data)) {
					var obj = JSON.parse(data);
					if (!obj.servicetype) {
						throw new Error(`Cookie 已失效, 请重新进入腾讯视频"我的→视频VIP"页面刷新 cookie`);
					} else {
						if (obj.vip === 1) {
							isTxspVip = true;
							endTime = obj.endTime;
							level = obj.level;
							score = obj.score;
						}
						if (obj.svip_info && obj.svip_info.vip === 1) {
							isTxspSvip = true;
							svipEndTime = obj.svip_info.endTime;
						}
					}
					resolve();
				}
			} catch (e) {
				$.error(e.message || e);
				// 失败时打印响应前 200 字符方便排查
				if (typeof data === 'string' && data.length > 0) {
					$.warn(`响应预览: ${data.substring(0, 200)}`);
				}
				reject(`该账号本次跳过执行\n`);
			}
		});
	});
}

/**
 * 获取腾讯视频任务列表
 * 抓包验证: 路径未变, business_id 和 businessId 两种写法后端都收
 */
async function readTxspTaskList() {
	return new Promise((resolve) => {
		let opt = {
			url: `https://vip.video.qq.com/rpc/trpc.new_task_system.task_system.TaskSystem/ReadTaskList?rpc_data={"businessId":"1","platform":5}`,
			headers: {
				Cookie: txspCookie,
				'Accept': 'application/json, text/plain, */*',
				'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
				'Origin': 'https://film.video.qq.com',
				'Referer': 'https://film.video.qq.com/x/grade/?ptag=usercenter.card&ovscroll=0&hidetitlebar=1&aid=V0$$1:0$2:7$3:9.03.60.25491$4:0$8:999&isDarkMode=0&uiType=REGULAR',
				'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/537.51.1 (KHTML, like Gecko) Mobile/11A465 QQLiveBrowser/9.03.60 AppType/UN WebKitCore/WKWebView iOS cellPhone/iPhone 14 Pro Max AppBuild/25491 ua_vversion_name/9.03.60.25491',
				'sec-fetch-dest': 'empty',
				'sec-fetch-mode': 'cors',
				'sec-fetch-site': 'same-site',
				'priority': 'u=3, i'
			},
		};
		$.get(opt, async (error, resp, data) => {
			try {
				if (typeof data === 'string') {
					$.info(`[ReadTaskList] HTTP ${resp && resp.statusCode}, body 长度 ${data.length}, 前 400 字符: ${data.substring(0, 400)}`);
				}
				if (safeGet(data)) {
					var obj = JSON.parse(data);
					var code = obj.ret;
					if (code === 0) {
						month_received_score = obj.limit_info && obj.limit_info.month_received_score;
						month_limit = obj.limit_info && obj.limit_info.month_limit;
						let taskList = obj.task_list;
						let txspCheckInTask = taskList && taskList.find(task => task.task_id === 101);
						if (txspCheckInTask) {
							isTxspCheckIn = txspCheckInTask.task_status;
						} else {
							$.warn(`未找到签到任务(task_id=101), 跳过查询`);
						}
					} else {
						$.warn(`获取腾讯视频任务列表失败, 响应预览: ${(data || '').substring(0, 200)}`);
					}
					resolve();
				}
			} catch (e) {
				$.error(e);
				resolve();
			}
		});
	});
}

/**
 * 腾讯视频签到领取 V 力值
 * 抓包验证: 接口路径未变, GET 请求, 响应 {"ret":0,"err_msg":"success","check_in_score":5}
 */
async function txspCheckIn() {
	return new Promise((resolve, reject) => {
		let opt = {
			url: `https://vip.video.qq.com/rpc/trpc.new_task_system.task_system.TaskSystem/CheckIn?rpc_data={}`,
			headers: {
				Cookie: txspCookie,
				'Accept': 'application/json, text/plain, */*',
				'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
				'Origin': 'https://film.video.qq.com',
				'Referer': 'https://film.video.qq.com/x/grade/?ptag=usercenter.card&ovscroll=0&hidetitlebar=1&aid=V0$$1:0$2:7$3:9.03.60.25491$4:0$8:999&isDarkMode=0&uiType=REGULAR',
				'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/537.51.1 (KHTML, like Gecko) Mobile/11A465 QQLiveBrowser/9.03.60 AppType/UN WebKitCore/WKWebView iOS cellPhone/iPhone 14 Pro Max AppBuild/25491 ua_vversion_name/9.03.60.25491',
				'sec-fetch-dest': 'empty',
				'sec-fetch-mode': 'cors',
				'sec-fetch-site': 'same-site',
				'priority': 'u=3, i'
			},
		};
		$.get(opt, async (error, resp, data) => {
			try {
				if (typeof data === 'string') {
					$.info(`[CheckIn] HTTP ${resp && resp.statusCode}, body 长度 ${data.length}, 前 400 字符: ${data.substring(0, 400)}`);
				}
				var obj = JSON.parse(data);
				var code = obj.ret;
				if (code === 0 && obj.check_in_score != undefined) {
					$.info(`签到成功: 获得 ${obj.check_in_score} V力值`);
					$.taskInfo = `签到成功: 获得 ${obj.check_in_score} V力值\n`;
				} else if (code === -2002) {
					$.info(`今天已签到, 明日再来吧`);
					$.taskInfo = `今天已签到, 明日再来吧\n`;
				} else {
					$.warn(`签到失败, 响应预览: ${(data || '').substring(0, 200)}`);
					$.taskInfo = `签到失败, 详细信息请查看日志\n`;
				}
			} catch (e) {
				$.error(e);
				$.taskInfo = `签到响应解析失败\n`;
			}
			resolve();
		});
	});
}

function getCookie() {
	if ($request && $request.method != `OPTIONS` && $request.url.match(/\/rpc\/trpc\.new_task_system\.task_system\.TaskSystem\/ReadTaskList/)) {
		let txsp = $request.headers["Cookie"] || $request.headers["cookie"];
		if (txsp) {
			if (typeof txspCookie === "undefined" || (txspCookie && txspCookie.length === 0)) {
				$.setdata(txsp, "txspCookie");
				$.log(`Cookie: ${txsp}`);
				$.msg($.name, "🎉 Cookie写入成功", "不用请自行关闭重写!");
			} else if (txsp !== txspCookie) {
				$.setdata(txsp, "txspCookie");
				$.log(`Cookie: ${txsp}`);
				$.msg($.name, "🎉 Cookie更新成功", "不用请自行关闭重写!");
			} else {
				$.msg($.name, "⚠️ Cookie未变动 跳过更新", "不用请自行关闭重写!");
			}
		} else {
			$.msg($.name, "⚠️ Cookie未找到", "不用请自行关闭重写!");
		}
	}
}

async function SendMsg() {
	if (Notify > 0) {
		if ($.isNode()) {
			await notify.sendNotify($.name, `${$.desc}`);
		} else {
			$.msg($.name, "", `${$.taskInfo}`);
		}
	} else {
		$.msg($.name, "", `${$.taskInfo}`);
	}
}

async function waitRandom(min, max) {
	var time = getRandomInt(min, max);
	await $.wait(time);
}

function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function safeGet(data) {
	try {
		if (typeof JSON.parse(data) == "object") {
			return true;
		}
	} catch (e) {
		$.error(e);
		$.error(`腾讯视频访问数据为空, 请检查 Cookie 是否有效`);
		return false;
	}
}

// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise(((e,i)=>{s.call(this,t,((t,s,o)=>{t?i(t):e(s)}))}))}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.logLevels={debug:0,info:1,warn:2,error:3},this.logLevelPrefixs={debug:" DEBUG",info:" INFO",warn:" WARN",error:" ERROR"},this.logLevel="info",this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}getEnv(){return"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"!=typeof module&&module.exports?"Node.js":"undefined"!=typeof $task?"Quantumult X":"undefined"!=typeof $loon?"Loon":"undefined"!=typeof $rocket?"Shadowrocket":void 0}isNode(){return"Node.js"===this.getEnv()}isQuanX(){return"Quantumult X"===this.getEnv()}isSurge(){return"Surge"===this.getEnv()}isLoon(){return"Loon"===this.getEnv()}isShadowrocket(){return"Shadowrocket"===this.getEnv()}isStash(){return"Stash"===this.getEnv()}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null,...s){try{return JSON.stringify(t,...s)}catch{return e}}getjson(t,e){let s=e;if(this.getdata(t))try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise((e=>{this.get({url:t},((t,s,i)=>e(i)))}))}runScript(t,e){return new Promise((s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let o=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");o=o?1*o:20,o=e&&e.timeout?e.timeout:o;const[r,a]=i.split("@"),n={url:`http://${a}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:o},headers:{"X-Key":r,Accept:"*/*"},timeout:o};this.post(n,((t,e,i)=>s(i)))})).catch((t=>this.logErr(t)))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),o=JSON.stringify(this.data);s?this.fs.writeFileSync(t,o):i?this.fs.writeFileSync(e,o):this.fs.writeFileSync(t,o)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let o=t;for(const t of i)if(o=Object(o)[t],void 0===o)return s;return o}lodash_set(t,e,s){return Object(t)!==t||(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce(((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{}),t)[e[e.length-1]]=s),t}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),o=s?this.getval(s):"";if(o)try{const t=JSON.parse(o);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,o]=/^@(.*?)\.(.*?)$/.exec(e),r=this.getval(i),a=i?"null"===r?null:r||"{}":"{}";try{const e=JSON.parse(a);this.lodash_set(e,o,t),s=this.setval(JSON.stringify(e),i)}catch(e){const r={};this.lodash_set(r,o,t),s=this.setval(JSON.stringify(r),i)}}else s=this.setval(t,e);return s}getval(t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.read(t);case"Quantumult X":return $prefs.valueForKey(t);case"Node.js":return this.data=this.loaddata(),this.data[t];default:return this.data&&this.data[t]||null}}setval(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.write(t,e);case"Quantumult X":return $prefs.setValueForKey(t,e);case"Node.js":return this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0;default:return this.data&&this.data[e]||null}}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.cookie&&void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar)))}get(t,e=(()=>{})){switch(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"],delete t.headers["content-type"],delete t.headers["content-length"]),t.params&&(t.url+="?"+this.queryStr(t.params)),void 0===t.followRedirect||t.followRedirect||((this.isSurge()||this.isLoon())&&(t["auto-redirect"]=!1),this.isQuanX()&&(t.opts?t.opts.redirection=!1:t.opts={redirection:!1})),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,((t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,i)}));break;case"Quantumult X":this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then((t=>{const{statusCode:s,statusCode:i,headers:o,body:r,bodyBytes:a}=t;e(null,{status:s,statusCode:i,headers:o,body:r,bodyBytes:a},r,a)}),(t=>e(t&&t.error||"UndefinedError")));break;case"Node.js":let s=require("iconv-lite");this.initGotEnv(t),this.got(t).on("redirect",((t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}})).then((t=>{const{statusCode:i,statusCode:o,headers:r,rawBody:a}=t,n=s.decode(a,this.encoding);e(null,{status:i,statusCode:o,headers:r,rawBody:a,body:n},n)}),(t=>{const{message:i,response:o}=t;e(i,o,o&&s.decode(o.rawBody,this.encoding))}));break}}post(t,e=(()=>{})){const s=t.method?t.method.toLocaleLowerCase():"post";switch(t.body&&t.headers&&!t.headers["Content-Type"]&&!t.headers["content-type"]&&(t.headers["content-type"]="application/x-www-form-urlencoded"),t.headers&&(delete t.headers["Content-Length"],delete t.headers["content-length"]),void 0===t.followRedirect||t.followRedirect||((this.isSurge()||this.isLoon())&&(t["auto-redirect"]=!1),this.isQuanX()&&(t.opts?t.opts.redirection=!1:t.opts={redirection:!1})),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](t,((t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,i)}));break;case"Quantumult X":t.method=s,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then((t=>{const{statusCode:s,statusCode:i,headers:o,body:r,bodyBytes:a}=t;e(null,{status:s,statusCode:i,headers:o,body:r,bodyBytes:a},r,a)}),(t=>e(t&&t.error||"UndefinedError")));break;case"Node.js":let i=require("iconv-lite");this.initGotEnv(t);const{url:o,...r}=t;this.got[s](o,r).then((t=>{const{statusCode:s,statusCode:o,headers:r,rawBody:a}=t,n=i.decode(a,this.encoding);e(null,{status:s,statusCode:o,headers:r,rawBody:a,body:n},n)}),(t=>{const{message:s,response:o}=t;e(s,o,o&&i.decode(o.rawBody,this.encoding))}));break}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}queryStr(t){let e="";for(const s in t){let i=t[s];null!=i&&""!==i&&("object"==typeof i&&(i=JSON.stringify(i)),e+=`${s}=${i}&`)}return e=e.substring(0,e.length-1),e}msg(e=t,s="",i="",o={}){const r=t=>{const{$open:e,$copy:s,$media:i,$mediaMime:o}=t;switch(typeof t){case void 0:return t;case"string":switch(this.getEnv()){case"Surge":case"Stash":default:return{url:t};case"Loon":case"Shadowrocket":return t;case"Quantumult X":return{"open-url":t};case"Node.js":return}case"object":switch(this.getEnv()){case"Surge":case"Stash":case"Shadowrocket":default:{const r={};let a=t.openUrl||t.url||t["open-url"]||e;a&&Object.assign(r,{action:"open-url",url:a});let n=t["update-pasteboard"]||t.updatePasteboard||s;if(n&&Object.assign(r,{action:"clipboard",text:n}),i){let t,e,s;if(i.startsWith("http"))t=i;else if(i.startsWith("data:")){const[t]=i.split(";"),[,o]=i.split(",");e=o,s=t.replace("data:","")}else{e=i,s=(t=>{const e={JVBERi0:"application/pdf",R0lGODdh:"image/gif",R0lGODlh:"image/gif",iVBORw0KGgo:"image/png","/9j/":"image/jpg"};for(var s in e)if(0===t.indexOf(s))return e[s];return null})(i)}Object.assign(r,{"media-url":t,"media-base64":e,"media-base64-mime":o??s})}return Object.assign(r,{"auto-dismiss":t["auto-dismiss"],sound:t.sound}),r}case"Loon":{const s={};let o=t.openUrl||t.url||t["open-url"]||e;o&&Object.assign(s,{openUrl:o});let r=t.mediaUrl||t["media-url"];return i?.startsWith("http")&&(r=i),r&&Object.assign(s,{mediaUrl:r}),console.log(JSON.stringify(s)),s}case"Quantumult X":{const o={};let r=t["open-url"]||t.url||t.openUrl||e;r&&Object.assign(o,{"open-url":r});let a=t["media-url"]||t.mediaUrl;i?.startsWith("http")&&(a=i),a&&Object.assign(o,{"media-url":a});let n=t["update-pasteboard"]||t.updatePasteboard||s;return n&&Object.assign(o,{"update-pasteboard":n}),console.log(JSON.stringify(o)),o}case"Node.js":return}default:return}};if(!this.isMute)switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:$notification.post(e,s,i,r(o));break;case"Quantumult X":$notify(e,s,i,r(o));break;case"Node.js":break}if(!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}debug(...t){this.logLevels[this.logLevel]<=this.logLevels.debug&&(t.length>0&&(this.logs=[...this.logs,...t]),console.log(`[${this.time('HH:mm:ss')}${this.logLevelPrefixs.debug}] ${t.map((t=>t??String(t))).join(this.logSeparator)}`))}info(...t){this.logLevels[this.logLevel]<=this.logLevels.info&&(t.length>0&&(this.logs=[...this.logs,...t]),console.log(`[${this.time('HH:mm:ss')}${this.logLevelPrefixs.info}] ${t.map((t=>t??String(t))).join(this.logSeparator)}`))}warn(...t){this.logLevels[this.logLevel]<=this.logLevels.warn&&(t.length>0&&(this.logs=[...this.logs,...t]),console.log(`[${this.time('HH:mm:ss')}${this.logLevelPrefixs.warn}] ${t.map((t=>t??String(t))).join(this.logSeparator)}`))}error(...t){this.logLevels[this.logLevel]<=this.logLevels.error&&(t.length>0&&(this.logs=[...this.logs,...t]),console.log(`[${this.time('HH:mm:ss')}${this.logLevelPrefixs.error}] ${t.map((t=>t??String(t))).join(this.logSeparator)}`))}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.map((t=>t??String(t))).join(this.logSeparator))}logErr(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:this.log("",`❗️${this.name}, 错误!`,e,t);break;case"Node.js":this.log("",`❗️${this.name}, 错误!`,e,void 0!==t.message?t.message:t,t.stack);break}}wait(t){return new Promise((e=>setTimeout(e,t)))}done(t={}){const e=((new Date).getTime()-this.startTime)/1e3;switch(this.log("",`🔔${this.name}, 结束! 🕛 ${e} 秒`),this.log(),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:$done(t);break;case"Node.js":process.exit(1)}}}(t,e)}
