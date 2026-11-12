/**
 * 다시보기 채점실 — 학습 기록 저장용 Google Apps Script
 *
 * 이 스프레드시트에 시트 3개를 씁니다 (처음 실행할 때 자동으로 만들어져요).
 *   명단 : A열 반, B열 이름 (2행부터). 학생은 여기 있는 이름으로만 들어올 수 있어요.
 *   기록 : 학생 화면이 보낸 기록이 한 줄씩 쌓여요. 직접 고치지 마세요.
 *   설정 : B1 칸에 선생님 페이지 비밀번호를 적어요.
 */

var SHEET_LOG = '기록', SHEET_ROSTER = '명단', SHEET_SET = '설정';
var LOG_HEADER = ['받은 시각', '종류', '반', '이름', '시험 ID', '시험 이름', '회차', '틀린 문항', '틀린 개수', '문항 수',
  '기기 시각', '푼 시간(초)', '세션', '기기', '추가 정보'];

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = ss.getSheetByName(SHEET_LOG) || ss.insertSheet(SHEET_LOG);
  if (log.getLastRow() === 0) { log.appendRow(LOG_HEADER); log.setFrozenRows(1); }
  var ro = ss.getSheetByName(SHEET_ROSTER) || ss.insertSheet(SHEET_ROSTER);
  if (ro.getLastRow() === 0) { ro.appendRow(['반', '이름']); ro.appendRow(['2-1', '홍길동(예시, 지우고 쓰세요)']); ro.setFrozenRows(1); }
  var st = ss.getSheetByName(SHEET_SET) || ss.insertSheet(SHEET_SET);
  if (st.getLastRow() === 0) { st.getRange('A1:B1').setValues([['선생님 페이지 비밀번호', '여기에 비밀번호를 적으세요']]); }
}

function clean_(s) { return String(s == null ? '' : s).replace(/\s+/g, '').normalize('NFKC'); }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

function roster_() {
  var ro = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ROSTER);
  if (!ro || ro.getLastRow() < 2) return [];
  return ro.getRange(2, 1, ro.getLastRow() - 1, 2).getValues()
    .filter(function (r) { return String(r[1]).trim(); })
    .map(function (r) { return { cls: String(r[0]).trim(), name: String(r[1]).trim() }; });
}
function findStudent_(cls, name) {
  var c = clean_(cls), n = clean_(name);
  var list = roster_();
  for (var i = 0; i < list.length; i++) {
    if (clean_(list[i].name) === n && (!c || clean_(list[i].cls) === c)) return list[i];
  }
  return null;
}

function appendLog_(d) {
  var who = findStudent_(d.cls, d.name);
  if (!who) return { ok: false, error: 'not_in_roster' };
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_LOG);
    if (!sh) { setup(); sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_LOG); }
    var cut = function (v, n) { return String(v == null ? '' : v).slice(0, n || 200); };
    sh.appendRow([new Date(), cut(d.ev, 20), who.cls, who.name, cut(d.examId, 40), cut(d.examTitle, 120),
      Number(d.attempt) || '', cut(d.wrong, 200), d.wrongCount === undefined ? '' : Number(d.wrongCount), Number(d.total) || '',
      d.at ? new Date(Number(d.at)) : '', Number(d.activeSec) || 0, cut(d.session, 40), cut(d.device, 40), cut(d.extra, 2000)]);
  } finally { lock.releaseLock(); }
  return { ok: true };
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    var st = studyRoute_(p); if (st) return st;   // 순공 타이머
    if (p.action === 'check') {
      var who = findStudent_(p.cls, p.name);
      return json_(who ? { ok: true, cls: who.cls, name: who.name } : { ok: false, error: roster_().length ? 'not_in_roster' : 'empty_roster' });
    }
    if (p.action === 'mine') {   // 학생 한 명이 통과한 시험 목록 (다른 기기에서도 '통과' 도장이 보이게)
      var me = findStudent_(p.cls, p.name);
      if (!me) return json_({ ok: false, error: 'not_in_roster' });
      var lg = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_LOG);
      var all = lg && lg.getLastRow() > 1 ? lg.getRange(2, 1, lg.getLastRow() - 1, LOG_HEADER.length).getValues() : [];
      var passed = {};
      all.forEach(function (r) {
        if (r[1] === 'done' && String(r[2]) === me.cls && String(r[3]) === me.name)
          passed[r[4]] = { at: r[10] ? +r[10] : +r[0], attempt: r[6], extra: r[14] };
      });
      return json_({ ok: true, passed: passed });
    }
    if (p.action === 'log') {
      var batch = JSON.parse(p.d || '[]');
      if (!Array.isArray(batch)) batch = [batch];
      var res = batch.slice(0, 20).map(appendLog_);
      return json_({ ok: res.every(function (r) { return r.ok; }), results: res });
    }
    if (p.action === 'data') {
      var set = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SET);
      var pw = set ? String(set.getRange('B1').getValue()) : '';
      if (!pw || pw === '여기에 비밀번호를 적으세요' || String(p.key) !== pw) return json_({ ok: false, error: 'bad_key' });
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_LOG);
      var rows = sh && sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, LOG_HEADER.length).getValues() : [];
      rows = rows.map(function (r) {
        return { recv: +r[0], ev: r[1], cls: r[2], name: r[3], examId: r[4], examTitle: r[5], attempt: r[6], wrong: r[7],
          wrongCount: r[8], total: r[9], at: r[10] ? +r[10] : +r[0], activeSec: r[11], session: r[12], device: r[13], extra: r[14] };
      });
      return json_({ ok: true, roster: roster_(), rows: rows });
    }
    return json_({ ok: true, service: 'dabogi' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/* navigator.sendBeacon(학생이 화면을 닫을 때)용 */
function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    var batch = Array.isArray(d) ? d : [d];
    batch.slice(0, 20).forEach(appendLog_);
    return json_({ ok: true });
  } catch (err) { return json_({ ok: false, error: String(err) }); }
}

/* ===================== 페르마 순공 타이머 ===================== */
var SHEET_STUDY = '순공';
var STUDY_HEADER = ['받은 시각', '반', '이름', '기록 ID', '시작 시각', '공부 시간(초)', '방법', '과목', '이탈 횟수'];
var STUDY_SUBJ = ['수학', '영어', '국어', '과학', '사회', '기타'];

function studySheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_STUDY);
  if (!sh) { sh = ss.insertSheet(SHEET_STUDY); sh.appendRow(STUDY_HEADER); sh.setFrozenRows(1); }
  return sh;
}

function studyRoute_(p) {
  if (p.action === 'study') return json_(studySave_(p));
  if (p.action === 'studyrank') return json_(studyRank_());
  return null;
}

/* d = "id.시작분.초.c|b.과목번호.이탈_id.…" (데이터를 아끼려고 아주 짧게 받아요) */
function studySave_(p) {
  var who = findStudent_(p.cls, p.name);
  if (!who) return { ok: false, error: 'not_in_roster' };
  var items = String(p.d || '').split('_').filter(String).slice(0, 30).map(function (s) {
    var a = s.split('.');
    return { id: String(a[0]).slice(0, 20), start: Number(a[1]) * 60000, sec: Math.min(Number(a[2]) || 0, 12 * 3600),
      mode: a[3] === 'c' ? '카메라' : '버튼', subj: STUDY_SUBJ[Number(a[4])] || '기타', leaves: Number(a[5]) || 0 };
  }).filter(function (x) { return x.id && x.sec > 0 && x.start > 0; });
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var sh = studySheet_();
    var n = sh.getLastRow() - 1;
    var have = {};
    if (n > 0) sh.getRange(2, 4, n, 1).getValues().forEach(function (r) { have[r[0]] = 1; });
    var rows = items.filter(function (x) { return !have[x.id]; }).map(function (x) {
      return [new Date(), who.cls, who.name, x.id, new Date(x.start), x.sec, x.mode, x.subj, x.leaves];
    });
    if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, STUDY_HEADER.length).setValues(rows);
  } finally { lock.releaseLock(); }
  CacheService.getScriptCache().remove('studyrank');
  return { ok: true };
}

/* 이번 달 기록으로 오늘/이번 주/이번 달 순위표를 만들어요. 1분 동안 캐시해서 빠르게 응답해요. */
function studyRank_() {
  var cache = CacheService.getScriptCache(), hit = cache.get('studyrank');
  if (hit) return JSON.parse(hit);
  var tz = Session.getScriptTimeZone();
  var now = new Date();
  var dayKey = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
  var monKey = Utilities.formatDate(now, tz, 'yyyy-MM');
  var wd = (Number(Utilities.formatDate(now, tz, 'u')) + 6) % 7; // 월요일=0
  var weekStart = new Date(Utilities.formatDate(now, tz, 'yyyy/MM/dd') + ' 00:00:00');
  weekStart.setDate(weekStart.getDate() - wd);
  var sh = studySheet_(), n = sh.getLastRow() - 1, by = {};
  roster_().forEach(function (r) { by[r.cls + '|' + r.name] = { c: r.cls, n: r.name, day: [0, 0], week: [0, 0], month: [0, 0] }; });
  if (n > 0) sh.getRange(2, 2, n, 6).getValues().forEach(function (r) {
    var k = r[0] + '|' + r[1], o = by[k]; if (!o) return;
    var t = new Date(r[3]), sec = Number(r[4]) || 0, i = r[5] === '카메라' ? 0 : 1;
    if (Utilities.formatDate(t, tz, 'yyyy-MM') === monKey) o.month[i] += sec;
    if (t >= weekStart) o.week[i] += sec;
    if (Utilities.formatDate(t, tz, 'yyyy-MM-dd') === dayKey) o.day[i] += sec;
  });
  var list = Object.keys(by).map(function (k) { return by[k]; }).filter(function (o) { return o.week[0] + o.week[1] + o.month[0] + o.month[1] > 0; });
  var res = { ok: true, list: list };
  try { cache.put('studyrank', JSON.stringify(res), 60); } catch (e) {}
  return res;
}
