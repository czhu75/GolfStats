/* Temporary browser harness: exercises app logic, views and actions. */
(function () {
  var out = [];
  function ok(name, cond, extra) {
    out.push(name + '=' + (cond ? 'ok' : 'FAIL' + (extra === undefined ? '' : '(got ' + extra + ')')));
  }
  function run(name, fn) {
    try { fn(); } catch (e) { out.push(name + '=THROW:' + (e && e.message ? e.message : e)); }
  }
  function clean(name, html) {
    var s = typeof html === 'string' ? html : '';
    ok('html-' + name + '-type', s.length > 40);
    ok('html-' + name + '-undef', s.length > 40 && s.indexOf('undefined') < 0);
    ok('html-' + name + '-nan', s.length > 40 && s.indexOf('NaN') < 0);
  }
  function mkBtn(attrs) {
    var b = document.createElement('button');
    Object.keys(attrs).forEach(function (k) { b.setAttribute(k, attrs[k]); });
    document.body.appendChild(b);
    return b;
  }

  window.confirm = function () { return true; };
  window.alert = function () {};
  window.__RESULTS = out;

  /* ---------------------------- pure helpers ---------------------------- */
  run('helpers', function () {
    ok('fmtToPar+3', String(fmtToPar(3)).indexOf('3') >= 0, fmtToPar(3));
    ok('fmtToPar0', fmtToPar(0) === 'E', fmtToPar(0));
    ok('expPutts10', Math.abs(expPutts(10) - 1.61) < 0.02, expPutts(10));
    ok('expPutts150', expPutts(150) > expPutts(10), expPutts(150));
    ok('showPct', String(showPct(3, 4)).indexOf('75') >= 0, showPct(3, 4));
    ok('showPctEmpty', String(showPct(0, 0)).length > 0, showPct(0, 0));
    ok('sgStr', typeof sgStr(1.234) === 'string', sgStr(1.234));
    ok('clamp', clamp(9, 0, 5) === 5 && clamp(-2, 0, 5) === 0);
    ok('isNum', isNum(3) && !isNum('3') && !isNum(NaN));
    ok('pct', pct(1, 2) === 50, pct(1, 2));
    ok('todayISO', /^\d{4}-\d{2}-\d{2}$/.test(todayISO()), todayISO());
    ok('dateLabel', String(dateLabel('2026-10-01')).length > 3, dateLabel('2026-10-01'));
    ok('bandOf', bandOf(APPROACH_BANDS, 130).lo === 125 && bandOf(APPROACH_BANDS, 130).hi === 150,
      bandOf(APPROACH_BANDS, 130).lo);
    ok('bandIndex', bandIndex(PUTT_BANDS, 12) === 3, bandIndex(PUTT_BANDS, 12));
    ok('esc', esc('<b>"x"</b>') === '&lt;b&gt;&quot;x&quot;&lt;/b&gt;', esc('<b>"x"</b>'));
    ok('uid', uid() !== uid());
  });

  /* ------------------------------ fixtures ------------------------------ */
  var holes = [];
  for (var i = 0; i < 18; i++) {
    var par = (i % 3 === 2) ? 3 : ((i % 6 === 4) ? 5 : 4);
    holes.push({
      n: i + 1, par: par, strokes: par + (i % 4 === 0 ? 1 : 0), putts: 2,
      penalties: i === 3 ? 1 : 0,
      teeShot: par === 3 ? null : (i % 5 === 0 ? 'left' : 'fairway'),
      gir: i % 3 !== 0, approach: 100 + (i % 5) * 25, firstPutt: 6 + (i % 4) * 4,
      udAtt: i % 3 === 0, udSucc: i % 6 === 0,
      ssAtt: false, ssSucc: false
    });
  }
  var round = {
    id: 'r1', date: '2026-10-01', courseId: 'c1', courseName: 'Test Links', tee: 'Blue',
    pars: holes.map(function (h) { return h.par; }),
    status: 'done', createdAt: 1, updatedAt: 1, holes: holes
  };
  S.courses = [{ id: 'c1', name: 'Test Links', pars: round.pars, tees: ['Blue', 'White'] }];
  S.rounds = [round];
  S.activeId = 'r1';
  S.activeRound = round;
  S.hole = 0;

  /* --------------------------- stats engine ----------------------------- */
  var parTotal = 0, strokeTotal = 0, fwOpp = 0, fwHit = 0, girHit = 0;
  holes.forEach(function (h) {
    parTotal += h.par; strokeTotal += h.strokes;
    if (h.par >= 4 && h.teeShot) { fwOpp++; if (h.teeShot === 'fairway') fwHit++; }
    if (h.gir === true) girHit++;
  });
  var acc = sumRounds([round]);
  var d = derive(acc);
  run('engine', function () {
    ok('acc.rounds', acc.rounds === 1, acc.rounds);
    ok('acc.holes', acc.holes === 18, acc.holes);
    ok('acc.strokes', acc.strokes === strokeTotal, acc.strokes + '/' + strokeTotal);
    ok('acc.par', acc.par === parTotal, acc.par + '/' + parTotal);
    ok('acc.putts', acc.putts === 36, acc.putts);
    ok('acc.penalties', acc.penalties === 1, acc.penalties);
    ok('acc.fwOpp', acc.fwOpp === fwOpp, acc.fwOpp + '/' + fwOpp);
    ok('acc.fwHit', acc.fwHit === fwHit, acc.fwHit + '/' + fwHit);
    ok('acc.girHit', acc.girHit === girHit, acc.girHit + '/' + girHit);
    ok('acc.girOpp', acc.girOpp === 18, acc.girOpp);
    ok('acc.sgN', acc.sgN === 18, acc.sgN);
    ok('acc.scAtt', acc.scAtt === 18 - girHit, acc.scAtt);
    ok('d.avgRound', Math.abs(d.avgRound - strokeTotal) < 1e-9, d.avgRound);
    ok('d.puttsPerRound', Math.abs(d.puttsPerRound - 36) < 1e-9, d.puttsPerRound);
    ok('d.girPct', Math.abs(d.girPct - 100 * girHit / 18) < 1e-9, d.girPct);
    ok('d.fwPct', Math.abs(d.fwPct - 100 * fwHit / fwOpp) < 1e-9, d.fwPct);
    ok('d.sgPerRound', d.sgPerRound < 0, d.sgPerRound);
    ok('d.avgByPar4', Math.abs(d.avgByPar[4].n) === d.avgByPar[4].n && d.avgByPar[4].n > 0);
    ok('d.empty', derive(sumRounds([])).avgRound === null);
    ok('hasScores', hasScores(round) === true && hasScores({ holes: [{ strokes: null }] }) === false);
    ok('firstIncomplete', firstIncomplete({ holes: [{ strokes: 4 }, { strokes: null }] }) === 1);
  });

  function cleanR(name, html) {
    var s = typeof html === 'string' ? html : '';
    ok('view-' + name + '-len', s.length > 80, s.length);
    ok('view-' + name + '-undef', s.indexOf('undefined') < 0);
    ok('view-' + name + '-nan', s.indexOf('NaN') < 0);
  }

  /* ------------------------------- views -------------------------------- */
  run('views', function () {
    S.view = 'rounds'; cleanR('rounds', viewRounds());
    S.view = 'summary'; cleanR('summary', viewSummary());
    S.view = 'hole'; S.hole = 0; cleanR('hole', viewHole());
    S.range = 20; cleanR('stats20', viewStats());
    S.range = 5; cleanR('stats5', viewStats());
    S.range = 0; cleanR('statsAll', viewStats());
    S.range = 20;
    cleanR('data', viewData());
    S.draft = newDraft();
    cleanR('setup', viewSetup());
    S.draft = null;
  });

  run('viewsEmpty', function () {
    var keep = S.rounds, keepA = S.activeRound, keepId = S.activeId;
    S.rounds = []; S.activeRound = null; S.activeId = null;
    cleanR('empty-rounds', viewRounds());
    cleanR('empty-stats', viewStats());
    S.rounds = keep; S.activeRound = keepA; S.activeId = keepId;
  });

  run('render', function () {
    S.view = 'stats'; S.range = 20; render();
    ok('render-main', !!document.getElementById('main'));
    ok('render-no-boot', !document.querySelector('.boot'));
    ok('render-tabs', !!document.querySelector('.tabs .tab.on'));
    ok('render-svg', document.querySelectorAll('svg.chart').length >= 3,
      document.querySelectorAll('svg.chart').length);
    ok('render-legend', document.querySelectorAll('.legend .lg').length >= 1,
      document.querySelectorAll('.legend .lg').length);
    S.view = 'rounds'; render();
    ok('render-round-cards', document.querySelectorAll('[data-act="open-round"]').length >= 1,
      document.querySelectorAll('[data-act="open-round"]').length);
  });


  /* ------------------------------ actions ------------------------------- */
  var r2 = JSON.parse(JSON.stringify(round));
  r2.id = 'r2'; r2.status = 'active';
  S.rounds = [r2]; S.activeId = 'r2'; S.activeRound = r2; S.hole = 0; S.view = 'hole';
  render();

  run('actScore', function () {
    r2.holes[0].strokes = null;
    handleAct('score-inc', mkBtn({ 'data-act': 'score-inc' }));
    ok('incFromNull', r2.holes[0].strokes === 1, r2.holes[0].strokes);
    handleAct('score-set', mkBtn({ 'data-act': 'score-set', 'data-v': '7' }));
    ok('set7', r2.holes[0].strokes === 7, r2.holes[0].strokes);
    handleAct('score-dec', mkBtn({ 'data-act': 'score-dec' }));
    ok('dec6', r2.holes[0].strokes === 6, r2.holes[0].strokes);
    handleAct('score-clear', mkBtn({ 'data-act': 'score-clear' }));
    ok('cleared', r2.holes[0].strokes === null, r2.holes[0].strokes);
  });
  run('actPutts', function () {
    r2.holes[0].putts = null;
    handleAct('putts-inc', mkBtn({ 'data-act': 'putts-inc' }));
    ok('puttsInc1', r2.holes[0].putts === 1, r2.holes[0].putts);
    handleAct('putts-set', mkBtn({ 'data-act': 'putts-set', 'data-v': '3' }));
    ok('putts3', r2.holes[0].putts === 3, r2.holes[0].putts);
    handleAct('putts-dec', mkBtn({ 'data-act': 'putts-dec' }));
    ok('putts2', r2.holes[0].putts === 2, r2.holes[0].putts);
  });
  run('actPen', function () {
    handleAct('pen-inc', mkBtn({ 'data-act': 'pen-inc' }));
    ok('pen1', r2.holes[0].penalties === 1, r2.holes[0].penalties);
    handleAct('pen-dec', mkBtn({ 'data-act': 'pen-dec' }));
    ok('pen0', r2.holes[0].penalties === 0, r2.holes[0].penalties);
  });
  run('actGir', function () {
    r2.holes[0].udAtt = true; r2.holes[0].udSucc = true;
    handleAct('gir', mkBtn({ 'data-act': 'gir', 'data-v': 'yes' }));
    ok('girTrue', r2.holes[0].gir === true, r2.holes[0].gir);
    ok('girClearsUd', r2.holes[0].udAtt === false && r2.holes[0].udSucc === false);
    handleAct('gir', mkBtn({ 'data-act': 'gir', 'data-v': 'no' }));
    ok('girFalse', r2.holes[0].gir === false, r2.holes[0].gir);
    handleAct('gir', mkBtn({ 'data-act': 'gir', 'data-v': 'no' }));
    ok('girToggleOff', r2.holes[0].gir === null, r2.holes[0].gir);
  });
  run('actTee', function () {
    r2.holes[0].par = 4;
    r2.holes[0].teeShot = null;
    handleAct('tee', mkBtn({ 'data-act': 'tee', 'data-v': 'left' }));
    ok('teeLeft', r2.holes[0].teeShot === 'left', r2.holes[0].teeShot);
    handleAct('tee', mkBtn({ 'data-act': 'tee', 'data-v': 'left' }));
    ok('teeOff', r2.holes[0].teeShot === null, r2.holes[0].teeShot);
  });
  run('actApproach', function () {
    handleAct('appr-set', mkBtn({ 'data-act': 'appr-set', 'data-v': '150' }));
    ok('appr150', r2.holes[0].approach === 150, r2.holes[0].approach);
    handleAct('appr-inc', mkBtn({ 'data-act': 'appr-inc' }));
    ok('appr155', r2.holes[0].approach === 155, r2.holes[0].approach);
    handleAct('appr-dec', mkBtn({ 'data-act': 'appr-dec' }));
    ok('appr150b', r2.holes[0].approach === 150, r2.holes[0].approach);
  });
  run('actFirstPutt', function () {
    handleAct('fp-set', mkBtn({ 'data-act': 'fp-set', 'data-v': '12' }));
    ok('fp12', r2.holes[0].firstPutt === 12, r2.holes[0].firstPutt);
    handleAct('fp-inc', mkBtn({ 'data-act': 'fp-inc' }));
    ok('fp13', r2.holes[0].firstPutt === 13, r2.holes[0].firstPutt);
    handleAct('fp-dec', mkBtn({ 'data-act': 'fp-dec' }));
    ok('fp12b', r2.holes[0].firstPutt === 12, r2.holes[0].firstPutt);
  });
  run('actShortGame', function () {
    handleAct('ud-att', mkBtn({ 'data-act': 'ud-att' }));
    ok('udAtt', r2.holes[0].udAtt === true, r2.holes[0].udAtt);
    handleAct('ud-succ', mkBtn({ 'data-act': 'ud-succ' }));
    ok('udSucc', r2.holes[0].udSucc === true, r2.holes[0].udSucc);
    handleAct('ud-att', mkBtn({ 'data-act': 'ud-att' }));
    ok('udOff', r2.holes[0].udAtt === false && r2.holes[0].udSucc === false);
    handleAct('ss-att', mkBtn({ 'data-act': 'ss-att' }));
    handleAct('ss-succ', mkBtn({ 'data-act': 'ss-succ' }));
    ok('ss', r2.holes[0].ssAtt === true && r2.holes[0].ssSucc === true);
  });

  /* --------------------------- hole navigation --------------------------- */
  run('actNav', function () {
    S.view = 'hole'; S.hole = 0; render();
    handleAct('hole-next', mkBtn({ 'data-act': 'hole-next' }));
    ok('next', S.hole === 1, S.hole);
    handleAct('hole-jump', mkBtn({ 'data-act': 'hole-jump', 'data-i': '4' }));
    ok('jump4', S.hole === 4, S.hole);
    handleAct('hole-prev', mkBtn({ 'data-act': 'hole-prev' }));
    ok('prev3', S.hole === 3, S.hole);
    handleAct('tab-stats', mkBtn({ 'data-act': 'tab-stats' }));
    ok('tabStats', S.view === 'stats', S.view);
    handleAct('tab-data', mkBtn({ 'data-act': 'tab-data' }));
    ok('tabData', S.view === 'data' && !!document.getElementById('filein'), S.view);
    handleAct('tab-rounds', mkBtn({ 'data-act': 'tab-rounds' }));
    ok('tabRounds', S.view === 'rounds', S.view);
    handleAct('range', mkBtn({ 'data-act': 'range', 'data-v': '5' }));
    ok('range5', S.range === 5, S.range);
    S.range = 20;
  });

  /* --------------------------- round lifecycle --------------------------- */
  run('startRound', function () {
    S.rounds = []; S.courses = []; S.activeId = null; S.activeRound = null;
    handleAct('new-round', mkBtn({ 'data-act': 'new-round' }));
    ok('setupView', S.view === 'setup' && !!S.draft, S.view);
    S.draft.courseName = 'Harbor Point';
    S.draft.tee = 'Blue';
    S.draft.pars[0] = 5;
    startRound();
    ok('roundCreated', S.rounds.length === 1, S.rounds.length);
    ok('holes18', !!S.activeRound && S.activeRound.holes.length === 18);
    ok('par0', S.activeRound.holes[0].par === 5, S.activeRound.holes[0].par);
    ok('courseSaved', S.courses.length === 1 && (S.courses[0].tees || []).indexOf('Blue') >= 0);
    ok('viewAfterStart', S.view === 'hole', S.view);
    ok('holeDefaults', S.activeRound.holes[1].strokes === null &&
      S.activeRound.holes[1].gir === null && S.activeRound.holes[1].udAtt === false);
    ok('courseIdLinked', S.activeRound.courseId === S.courses[0].id);
  });
  run('finishRound', function () {
    S.activeRound.holes[0].strokes = 6;
    S.activeRound.holes[0].putts = 2;
    finishRound();
    ok('statusDone', S.activeRound.status === 'done', S.activeRound.status);
    ok('summaryView', S.view === 'summary', S.view);
    ok('summaryMain', !!document.getElementById('main'));
  });
  run('finishNoScores', function () {
    S.activeRound.holes.forEach(function (hole) { hole.strokes = null; });
    S.activeRound.status = 'active';
    finishRound();
    ok('noFinishEmpty', S.activeRound.status === 'active', S.activeRound.status);
  });
  run('holeNextOnLast', function () {
    S.activeRound.holes.forEach(function (hole) { hole.strokes = 4; });
    S.activeRound.status = 'active';
    S.view = 'hole'; S.hole = 17; render();
    handleAct('hole-next', mkBtn({ 'data-act': 'hole-next' }));
    ok('lastFinishes', S.activeRound.status === 'done' && S.view === 'summary', S.view);
  });
  run('deleteRound', function () {
    var n = S.rounds.length;
    S.view = 'summary';
    deleteRound();
    ok('deleted', S.rounds.length === n - 1, S.rounds.length);
    ok('viewRoundsAfterDelete', S.view === 'rounds', S.view);
  });

  /* ------------------------------- backup -------------------------------- */
  run('backup', function () {
    S.rounds = [round];
    S.courses = [{ id: 'c1', name: 'Test Links', pars: round.pars, tees: ['Blue'] }];
    var p = exportPayload();
    ok('payloadMeta', p.app === 'GolfStats' && p.schema === 1 && p.appVersion === APP_VERSION);
    ok('payloadData', p.rounds.length === 1 && p.courses.length === 1);
    ok('exportText', JSON.parse(exportText()).rounds.length === 1);
    ok('importBadSilent', (function () { try { importJSON('{bad json'); } catch (e) { return false; } return true; })());
  });

  /* -------------------------------- pars --------------------------------- */
  run('parStats', function () {
    var a = newAcc();
    accHole(a, { par: 6, strokes: 6 });
    accHole(a, { par: 4, strokes: 5 });
    ok('byPar6', a.byPar[6] && a.byPar[6].n === 1 && a.byPar[6].strokes === 6);
    ok('byPar4', a.byPar[4].n === 1 && a.byPar[4].strokes === 5);
    var d = derive(a);
    ok('avgByPar6', d.avgByPar[6] && d.avgByPar[6].n === 1 && d.avgByPar[6].toPar === 0);
    ok('accTotals', a.strokes === 11 && a.par === 10, a.strokes + '/' + a.par);
    var t = parTable(a);
    ok('parTableHas6', t.indexOf('Par 6') >= 0 && t.indexOf('Par 3') >= 0);
    var b = newAcc();
    accHole(b, { par: 4, strokes: 4 });
    ok('parTableNo6', parTable(b).indexOf('Par 6') < 0);
    ok('parTableHas5', parTable(b).indexOf('Par 5') >= 0);
  });

  run('parNormalise', function () {
    var keepR = S.rounds, keepC = S.courses;
    S.rounds = [{ id: 'n1', date: '2026-01-01', status: 'done', pars: [],
      holes: [{ par: '5', strokes: 5 }, { par: null, strokes: 4 }, { par: 9, strokes: 6 }] }];
    S.courses = [{ id: 'nc', name: 'Odd Course', pars: ['4', 7, null] }];
    normaliseData();
    var hs = S.rounds[0].holes, ps = S.courses[0].pars;
    ok('normParsArray', S.rounds[0].pars.length === 3 && S.rounds[0].pars[0] === 5);
    ok('normStringPar', hs[0].par === 5, hs[0].par);
    ok('normNullPar', hs[1].par === 4, hs[1].par);
    ok('normHighPar', hs[2].par === PAR_MAX, hs[2].par);
    ok('normCoursePars', ps[0] === 4 && ps[1] === PAR_MAX && ps[2] === 4, JSON.stringify(ps));
    ok('parNumFallback', parNum('x', 4) === 4 && parNum(2, 4) === PAR_MIN && parNum(9, 4) === PAR_MAX);
    var ir = normaliseRound({ id: 'i1', holes: [{ par: '4' }, { par: 99 }, null] });
    ok('normRoundFn', ir.pars.length === 3 && ir.holes[0].par === 4 && ir.holes[1].par === PAR_MAX, JSON.stringify(ir.pars));
    var ic = normaliseCourse({ id: 'i2', pars: ['5', '', 2] });
    ok('normCourseFn', ic.pars[0] === 5 && ic.pars[1] === 4 && ic.pars[2] === PAR_MIN, JSON.stringify(ic.pars));
    ok('normIdempotent', normaliseRound(ir) === ir && ir.holes[1].par === PAR_MAX);
    S.rounds = keepR; S.courses = keepC;
  });

  run('parEdit', function () {
    var r = { id: 'pe', date: '2026-02-02', status: 'active', courseName: 'Par Lab', pars: [4, 4, 4],
      holes: [{ n: 1, par: 4, strokes: 4 }, { n: 2, par: 3, strokes: null }, { n: 3, par: 6, strokes: null }] };
    var keepR = S.rounds, keepA = S.activeRound, keepId = S.activeId, keepHole = S.hole, keepView = S.view;
    S.rounds = [r]; S.activeRound = r; S.activeId = 'pe'; S.hole = 0; S.view = 'hole'; render();
    ok('parEditUi', !!document.querySelector('[data-act="par-inc"]') && !!document.querySelector('[data-act="par-dec"]'));
    handleAct('par-inc', mkBtn({ 'data-act': 'par-inc' }));
    ok('parInc', r.holes[0].par === 5 && r.pars[0] === 5, r.holes[0].par);
    ok('parBadge', String(document.querySelector('.parbadge b').textContent).indexOf('5') >= 0,
      document.querySelector('.parbadge b').textContent);
    handleAct('par-dec', mkBtn({ 'data-act': 'par-dec' }));
    handleAct('par-dec', mkBtn({ 'data-act': 'par-dec' }));
    ok('parDec', r.holes[0].par === 3, r.holes[0].par);
    handleAct('par-dec', mkBtn({ 'data-act': 'par-dec' }));
    ok('parFloor', r.holes[0].par === 3, r.holes[0].par);
    S.hole = 2; render();
    handleAct('par-inc', mkBtn({ 'data-act': 'par-inc' }));
    ok('parCeil', r.holes[2].par === 6, r.holes[2].par);
    ok('parChipRel', viewHole().indexOf('PAR 6') >= 0);
    S.rounds = keepR; S.activeRound = keepA; S.activeId = keepId; S.hole = keepHole; S.view = keepView;
  });

  run('parCourseUpdate', function () {
    var keepC = S.courses, keepR = S.rounds, keepA = S.activeRound, keepId = S.activeId, keepView = S.view;
    S.rounds = []; S.activeRound = null; S.activeId = null;
    S.courses = [{ id: 'cc', name: 'Saved Links', tees: ['Blue'],
      pars: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4] }];
    handleAct('new-round', mkBtn({ 'data-act': 'new-round' }));
    pickCourse('cc');
    ok('pickLoaded', S.draft.courseId === 'cc' && S.draft.pars[0] === 4 && S.draft.pars.length === 18);
    ok('toggleShown', viewSetup().indexOf('save-pars-toggle') >= 0);
    S.draft.pars[0] = 5;
    startRound();
    ok('courseParsKept', S.courses[0].pars[0] === 4, S.courses[0].pars[0]);
    ok('roundParsFresh', S.activeRound.holes[0].par === 5, S.activeRound.holes[0].par);
    ok('teeAdded', (S.courses[0].tees || []).indexOf('Blue') >= 0);
    /* same course, this time with the opt-in ticked */
    S.rounds = []; S.activeRound = null; S.activeId = null;
    handleAct('new-round', mkBtn({ 'data-act': 'new-round' }));
    ok('toggleOffByDefault', S.draft.savePars === false);
    pickCourse('cc');
    handleAct('save-pars-toggle', mkBtn({ 'data-act': 'save-pars-toggle' }));
    ok('toggleOn', S.draft.savePars === true && viewSetup().indexOf('chip on') >= 0);
    S.draft.pars[1] = 6;
    startRound();
    ok('courseParsWritten', S.courses[0].pars[1] === 6, S.courses[0].pars[1]);
    ok('courseParsOtherKept', S.courses[0].pars[0] === 4, S.courses[0].pars[0]);
    S.courses = keepC; S.rounds = keepR; S.activeRound = keepA; S.activeId = keepId; S.view = keepView;
  });

  /* -------------------------------- report ------------------------------- */
  var fails = out.filter(function (s) { return s.indexOf('=ok') < 0; });
  document.documentElement.setAttribute('data-test', out.length + ' checks, ' + fails.length + ' fails');
  document.documentElement.setAttribute('data-fails', fails.join(' || ') || 'NONE');
})();

