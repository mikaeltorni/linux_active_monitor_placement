import { pathToFileURL } from 'node:url';
import process from 'node:process';

const policyPath = process.env.ACTIVE_MONITOR_POLICY_JS;
if (!policyPath) {
  console.error('MISSING_POLICY_PATH');
  process.exit(2);
}
const mod = await import(pathToFileURL(policyPath).href);
const decide = mod.decideActiveMonitorPlacement;
const freeze = mod.freezeTargetMonitor;
const shouldStop = mod.shouldStopPlacementRechecks;
if (typeof decide !== 'function') {
  console.error('MISSING_EXPORT');
  process.exit(2);
}
if (typeof freeze !== 'function') {
  console.error('MISSING_FREEZE_EXPORT');
  process.exit(2);
}
if (typeof shouldStop !== 'function') {
  console.error('MISSING_STOP_EXPORT');
  process.exit(2);
}

const cases = [
  {
    name: 'move-when-wrong-monitor',
    input: { skipTaskbar: false, windowMonitor: 1, activeMonitor: 0, monitorCount: 2 },
    expectMove: true, expectTarget: 0, expectReason: 'wrong-monitor',
  },
  {
    name: 'no-move-when-already-on-active',
    input: { skipTaskbar: false, windowMonitor: 0, activeMonitor: 0, monitorCount: 2 },
    expectMove: false, expectTarget: null, expectReason: 'already-on-active',
  },
  {
    name: 'no-move-skip-taskbar',
    input: { skipTaskbar: true, windowMonitor: 1, activeMonitor: 0, monitorCount: 2 },
    expectMove: false, expectTarget: null, expectReason: 'skip-taskbar',
  },
  {
    // Must NOT move while unassigned: Mutter move_to_monitor can SIGSEGV the Shell.
    name: 'no-move-unassigned-window',
    input: { skipTaskbar: false, windowMonitor: -1, activeMonitor: 1, monitorCount: 2 },
    expectMove: false, expectTarget: null, expectReason: 'unassigned-monitor',
  },
  {
    name: 'no-move-invalid-active',
    input: { skipTaskbar: false, windowMonitor: 0, activeMonitor: -1, monitorCount: 2 },
    expectMove: false, expectTarget: null, expectReason: 'invalid-active-monitor',
  },
  {
    name: 'no-move-active-out-of-range',
    input: { skipTaskbar: false, windowMonitor: 0, activeMonitor: 5, monitorCount: 2 },
    expectMove: false, expectTarget: null, expectReason: 'invalid-active-monitor',
  },
  {
    name: 'no-move-zero-monitors',
    input: { skipTaskbar: false, windowMonitor: 0, activeMonitor: 0, monitorCount: 0 },
    expectMove: false, expectTarget: null, expectReason: 'no-monitors',
  },
  {
    name: 'move-to-second-when-active-is-second',
    input: { skipTaskbar: false, windowMonitor: 0, activeMonitor: 1, monitorCount: 2 },
    expectMove: true, expectTarget: 1, expectReason: 'wrong-monitor',
  },
];

let failed = 0;
for (const c of cases) {
  const got = decide(c.input);
  const ok =
    Boolean(got.shouldMove) === Boolean(c.expectMove) &&
    (got.targetMonitor === c.expectTarget || (got.targetMonitor == null && c.expectTarget == null)) &&
    got.reason === c.expectReason;
  if (ok) {
    console.log(`CASE_PASS ${c.name}`);
  } else {
    failed += 1;
    console.log(
      `CASE_FAIL ${c.name} got=${JSON.stringify(got)} expectMove=${c.expectMove} ` +
      `expectTarget=${c.expectTarget} expectReason=${c.expectReason}`
    );
  }
}

// freezeTargetMonitor: keep valid snapshot; adopt candidate only when empty.
const freezeCases = [
  {
    name: 'freeze-keeps-valid-snapshot',
    args: [1, 2, 3],
    expect: 1,
  },
  {
    name: 'freeze-adopts-candidate-when-snapshot-invalid',
    args: [-1, 2, 3],
    expect: 2,
  },
  {
    name: 'freeze-ignores-out-of-range-candidate',
    args: [-1, 5, 3],
    expect: -1,
  },
  {
    name: 'freeze-ignores-changing-candidate-when-frozen',
    args: [0, 2, 3],
    expect: 0,
  },
  {
    name: 'freeze-no-monitors',
    args: [0, 1, 0],
    expect: -1,
  },
];
for (const c of freezeCases) {
  const got = freeze(...c.args);
  if (got === c.expect) {
    console.log(`CASE_PASS ${c.name}`);
  } else {
    failed += 1;
    console.log(`CASE_FAIL ${c.name} got=${got} expect=${c.expect}`);
  }
}

// Multi-recheck stability with a fixed snapshot (the extension contract).
// Window starts on monitor 0; snapshot target is 1; live pointer "moves" to
// 0, then 2, then 1 across phases — freeze must keep target 1, and decide
// must produce at most one corrective move (to 1), never thrash to 0 or 2.
{
  const monitorCount = 3;
  const livePointerSequence = [1, 0, 2, 1]; // schedule + delay phases
  let frozen = -1;
  let windowMonitor = 0;
  const moves = [];
  for (let i = 0; i < livePointerSequence.length; i++) {
    frozen = freeze(frozen, livePointerSequence[i], monitorCount);
    const d = decide({
      skipTaskbar: false,
      windowMonitor,
      activeMonitor: frozen,
      monitorCount,
    });
    if (d.shouldMove) {
      moves.push({ phase: i, from: windowMonitor, to: d.targetMonitor });
      windowMonitor = d.targetMonitor;
    }
  }
  const onlyToSnapshot =
    moves.length <= 1 &&
    moves.every((m) => m.to === 1) &&
    windowMonitor === 1 &&
    frozen === 1;
  if (onlyToSnapshot) {
    console.log(`CASE_PASS multi-recheck-stable-snapshot moves=${JSON.stringify(moves)}`);
  } else {
    failed += 1;
    console.log(
      `CASE_FAIL multi-recheck-stable-snapshot frozen=${frozen} ` +
      `windowMonitor=${windowMonitor} moves=${JSON.stringify(moves)}`
    );
  }
}

// Contrast: without freeze, re-resolving live pointer each phase thrash-moves.
{
  const monitorCount = 3;
  const livePointerSequence = [1, 0, 2, 1];
  let windowMonitor = 0;
  const thrashMoves = [];
  for (let i = 0; i < livePointerSequence.length; i++) {
    const d = decide({
      skipTaskbar: false,
      windowMonitor,
      activeMonitor: livePointerSequence[i],
      monitorCount,
    });
    if (d.shouldMove) {
      thrashMoves.push({ phase: i, from: windowMonitor, to: d.targetMonitor });
      windowMonitor = d.targetMonitor;
    }
  }
  const thrashed =
    thrashMoves.length >= 2 &&
    new Set(thrashMoves.map((m) => m.to)).size >= 2;
  if (thrashed) {
    console.log(
      `CASE_PASS multi-recheck-without-snapshot-thrashes moves=${JSON.stringify(thrashMoves)}`
    );
  } else {
    failed += 1;
    console.log(
      `CASE_FAIL multi-recheck-without-snapshot-thrashes moves=${JSON.stringify(thrashMoves)}`
    );
  }
}

// shouldStopPlacementRechecks: only already-on-active is terminal via policy.
{
  const stopCases = [
    {
      name: 'stop-on-already-on-active',
      decision: { shouldMove: false, targetMonitor: null, reason: 'already-on-active' },
      expect: true,
    },
    {
      name: 'no-stop-on-unassigned',
      decision: { shouldMove: false, targetMonitor: null, reason: 'unassigned-monitor' },
      expect: false,
    },
    {
      name: 'no-stop-on-wrong-monitor-decision',
      decision: { shouldMove: true, targetMonitor: 1, reason: 'wrong-monitor' },
      expect: false,
    },
    {
      name: 'no-stop-on-null',
      decision: null,
      expect: false,
    },
  ];
  for (const c of stopCases) {
    const got = shouldStop(c.decision);
    if (got === c.expect) {
      console.log(`CASE_PASS ${c.name}`);
    } else {
      failed += 1;
      console.log(`CASE_FAIL ${c.name} got=${got} expect=${c.expect}`);
    }
  }
}

// Programmatic primary survival: freeze pointer≠primary, settle already-on-active,
// external place_on_primary moves to primary, later rechecks must NOT move back.
// Mirrors multi/split kitty: pointer mon 1, primary mon 0.
{
  const monitorCount = 3;
  const pointerMonitor = 1;
  const primaryMonitor = 0;
  let frozen = freeze(-1, pointerMonitor, monitorCount);
  let windowMonitor = pointerMonitor; // lands with pointer first
  let stopped = false;
  const extensionMoves = [];

  // Phase 0 (delay-150): already-on-active → must stop rechecks (settled).
  {
    const d = decide({
      skipTaskbar: false,
      windowMonitor,
      activeMonitor: frozen,
      monitorCount,
    });
    if (d.shouldMove) {
      extensionMoves.push({ phase: 0, from: windowMonitor, to: d.targetMonitor });
      windowMonitor = d.targetMonitor;
      stopped = true;
    } else if (shouldStop(d)) {
      stopped = true;
    }
  }

  // External multi/split place_on_primary (not the extension).
  windowMonitor = primaryMonitor;

  // Phases 1–3 (delay-400/900/1600): if we wrongly continued, frozen pointer
  // would pull the window off primary. With stop, no further moves.
  for (let phase = 1; phase <= 3; phase++) {
    if (stopped) {
      continue;
    }
    frozen = freeze(frozen, pointerMonitor, monitorCount);
    const d = decide({
      skipTaskbar: false,
      windowMonitor,
      activeMonitor: frozen,
      monitorCount,
    });
    if (d.shouldMove) {
      extensionMoves.push({ phase, from: windowMonitor, to: d.targetMonitor });
      windowMonitor = d.targetMonitor;
    }
    if (shouldStop(d)) {
      stopped = true;
    }
  }

  // Contrast: without stop, continuing rechecks after primary would undo it.
  let undoMonitor = primaryMonitor;
  const undoMoves = [];
  for (let phase = 1; phase <= 3; phase++) {
    const d = decide({
      skipTaskbar: false,
      windowMonitor: undoMonitor,
      activeMonitor: pointerMonitor,
      monitorCount,
    });
    if (d.shouldMove) {
      undoMoves.push({ phase, from: undoMonitor, to: d.targetMonitor });
      undoMonitor = d.targetMonitor;
    }
  }

  const primarySurvived =
    stopped === true &&
    extensionMoves.length === 0 &&
    windowMonitor === primaryMonitor &&
    undoMoves.length >= 1 &&
    undoMoves.every((m) => m.to === pointerMonitor);

  if (primarySurvived) {
    console.log(
      `CASE_PASS primary-survives-after-settle-and-stop ` +
      `windowMonitor=${windowMonitor} undoWould=${JSON.stringify(undoMoves)}`
    );
  } else {
    failed += 1;
    console.log(
      `CASE_FAIL primary-survives-after-settle-and-stop stopped=${stopped} ` +
      `windowMonitor=${windowMonitor} extensionMoves=${JSON.stringify(extensionMoves)} ` +
      `undoMoves=${JSON.stringify(undoMoves)}`
    );
  }
}

process.exit(failed === 0 ? 0 : 1);
