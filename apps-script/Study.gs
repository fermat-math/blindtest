/**
 * 페르마 순공 타이머 — 블라인드 테스트와 같은 Apps Script 프로젝트에 "새 파일"로 붙여 넣어요.
 * Code.gs 의 doGet 맨 앞(try { 바로 다음 줄)에 아래 한 줄을 넣어요.
 *     var st = studyRoute_(p); if (st) return st;
 * 시트 '순공'이 자동으로 만들어져요. 직접 고치지 마세요.
 */
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
    SpreadsheetApp.flush(); // 다음 요청이 방금 쓴 줄을 보고 중복을 거르도록 바로 저장
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
  var seen = {};
  if (n > 0) sh.getRange(2, 2, n, 6).getValues().forEach(function (r) {
    var k = r[0] + '|' + r[1], o = by[k]; if (!o) return;
    if (seen[r[2]]) return; seen[r[2]] = 1; // 같은 기록 ID가 두 번 들어간 줄은 한 번만 셈
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
