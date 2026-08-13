const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const COOKIE = fs.readFileSync(path.join(ROOT, 'sgcc.cookie.js'), 'utf8');
const MAIN = fs.readFileSync(path.join(ROOT, 'sgcc.js'), 'utf8');

function runCookie(runtime, request, writeFails = false) {
  const store = new Map();
  const notices = [];
  let done = 0;
  const base = {
    console: { log() {} },
    $request: request,
    $done() { done += 1; },
  };
  if (runtime === 'qx') {
    base.$task = {};
    base.$prefs = {
      valueForKey: key => store.get(key) || null,
      setValueForKey: (value, key) => writeFails ? false : (store.set(key, value), true),
    };
    base.$notify = (...args) => notices.push(args);
  } else {
    base.$loon = '3.5.1';
    base.$persistentStore = {
      read: key => store.get(key) || null,
      write: (value, key) => writeFails ? false : (store.set(key, value), true),
    };
    base.$notification = { post: (...args) => notices.push(args) };
  }
  vm.runInNewContext(COOKIE, base, { filename: 'sgcc.cookie.js' });
  return { store, notices, done };
}

function runMain({ runtime = 'loon', responseBody, status = 200, error = null, auth = {}, envelope = {}, argument = [0] }) {
  const store = new Map([
    ['sgcc_data', JSON.stringify({
      authorization: 'Bearer sample', t: 'token-sample', userid: 'user-sample',
      device_token: 'device-sample', ...auth,
    })],
    ['sgcc_signin', JSON.stringify({ data: 'DATA123', skey: 'SKEY456', path: '/osg-omgmt1042/member/m1/0103514', ...envelope })],
    ['sgcc_debug', 'false'], ['sgcc_clear', 'false'],
  ]);
  const notices = [];
  const requests = [];
  let done = 0;
  const base = {
    console: { log() {} },
    $argument: argument,
    setTimeout(fn) { fn(); return 1; },
    clearTimeout() {},
    Math,
    Date,
  };
  if (runtime === 'qx') {
    base.$task = {
      fetch: req => {
        requests.push(req);
        return error ? Promise.reject({ error }) : Promise.resolve({ statusCode: status, headers: {}, body: responseBody });
      },
    };
    base.$prefs = {
      valueForKey: key => store.get(key) || null,
      setValueForKey: (value, key) => (store.set(key, value), true),
    };
    base.$notify = (...args) => notices.push(args);
  } else {
    base.$loon = '3.5.1';
    base.$persistentStore = {
      read: key => store.get(key) || null,
      write: (value, key) => (store.set(key, value), true),
    };
    base.$notification = { post: (...args) => notices.push(args) };
    base.$httpClient = {
      post(req, callback) {
        requests.push(req);
        callback(error, { status }, responseBody);
      },
      get() { throw new Error('unexpected GET'); },
    };
  }
  base.$done = () => { done += 1; };
  vm.runInNewContext(MAIN, base, { filename: 'sgcc.js' });
  return Promise.resolve().then(() => ({ store, notices, requests, get done() { return done; } }));
}

(async () => {
  const signinRequest = {
    url: 'https://csc-service.sgcc.com.cn:28630/osg-omgmt1042/member/m1/0103514',
    headers: { Authorization: 'Bearer sample', T: 'token-sample', UserId: 'user-sample', Device_Token: 'device-sample' },
    body: JSON.stringify({ data: 'DATA123', skey: 'SKEY456', timestamp: 'old', sign: 'old' }),
  };

  for (const runtime of ['qx', 'loon']) {
    const result = runCookie(runtime, signinRequest);
    assert.equal(result.done, 1, `${runtime}: should finish once`);
    assert.ok(result.store.get('sgcc_data'), `${runtime}: auth must persist`);
    assert.ok(result.store.get('sgcc_signin'), `${runtime}: envelope must persist`);
    assert.equal(JSON.parse(result.store.get('sgcc_data')).authorization, 'Bearer sample');
    assert.equal(result.notices.some(n => n[0].includes('鉴权已抓')), true);
    assert.equal(result.notices.some(n => n[0].includes('签到请求已抓')), true);
  }

  const failedWrite = runCookie('qx', signinRequest, true);
  assert.equal(failedWrite.notices.some(n => n.join(' ').includes('写入失败')), true);
  assert.equal(failedWrite.notices.some(n => n[0].startsWith('✅')), false, 'failed writes must not report success');

  const accepted = await runMain({ responseBody: JSON.stringify({ encryptData: 'ciphertext' }) });
  assert.equal(accepted.requests.length, 1);
  const sent = accepted.requests[0];
  assert.equal(sent.headers.authorization, 'Bearer sample', 'authorization header must be replayed');
  const body = JSON.parse(sent.body);
  const expectedSign = crypto.createHash('sm3').update(body.skey + body.data + body.timestamp).digest('hex');
  assert.equal(body.sign, expectedSign, 'SM3 sign must match OpenSSL');
  const acceptedNotice = accepted.notices.find(n => n[0].includes('✅'));
  assert.ok(acceptedNotice);
  assert.equal(acceptedNotice[1], '请求已被服务器受理');
  assert.equal(acceptedNotice.join(' ').includes('今日签到完成'), false, 'encrypted response must not be called confirmed success');

  const rejected = await runMain({ responseBody: JSON.stringify({ code: 'RK1003', message: '系统正忙' }), status: 200 });
  assert.equal(rejected.requests.length, 1, 'business rejection must not be blindly retried');
  assert.equal(rejected.notices.some(n => n[1] && n[1].includes('未受理')), true);

  const serverError = await runMain({ responseBody: 'server error', status: 503 });
  assert.equal(serverError.requests.length, 3, 'HTTP 5xx should retry up to MAX_RETRY');

  const qxAccepted = await runMain({ runtime: 'qx', responseBody: JSON.stringify({ encryptData: 'ciphertext' }), argument: '0' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(qxAccepted.requests.length, 1, 'QX should submit through $task.fetch');

  const plugin = fs.readFileSync(path.join(ROOT, 'sgcc.plugin'), 'utf8');
  assert.match(plugin, /captureEnabled = switch,false/);
  assert.match(plugin, /cron \{cronExp\}/);
  assert.match(plugin, /requires-body=false/);
  assert.match(plugin, /0103514[^\n]+requires-body=true/);
  assert.doesNotMatch(plugin, /^generic /m);

  const patterns = [...plugin.matchAll(/^http-request (\S+)/gm)].map(m => new RegExp(m[1].replaceAll('\\/', '/')));
  assert.equal(patterns.length, 2);
  assert.equal(patterns[1].test(signinRequest.url), true, 'body rule must match explicit port');
  assert.equal(patterns[1].test(signinRequest.url.replace(':28630', '')), true, 'body rule must match default port form');
  assert.equal(patterns[0].test(signinRequest.url), false, 'header rule must exclude sign-in request');
  assert.equal(patterns[0].test('https://csc-service.sgcc.com.cn:28630/osg-omgmt1042/member/m4/profile'), true);

  console.log('sgcc tests: all passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
