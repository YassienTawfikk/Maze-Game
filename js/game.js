import { BFSPlanner } from './bfs.js';
import { Renderer } from './renderer.js';

// DOM Elements
const canvas = document.getElementById('game-canvas');
const statusText = document.getElementById('status-text');
const btnRun = document.getElementById('btn-run');
const btnReset = document.getElementById('btn-reset');
const consoleLog = document.getElementById('console-log');
const levelBtns = document.querySelectorAll('.level-selector button');
const loader = document.getElementById('loader');
const goalMarker = document.getElementById('goal-marker');
const hudPhases = document.querySelectorAll('.hud-phase');

// Stats
const statDims = document.getElementById('stat-dims');
const statTime = document.getElementById('stat-time');
const statLen = document.getElementById('stat-len');

// State
let currentMapData = null;
let currentStartPos = null;
let currentGoalPos = null;
let currentPhase = 1; // 1: Start, 2: Goal, 3: Run
let renderer = null;
let planner = new BFSPlanner();
let isRunning = false;

// Audio (Optional simple synth if requested, but skipping for now)

/**
 * Initialization
 */
async function init() {
    renderer = new Renderer(canvas);

    // Handle Window Resize
    window.addEventListener('resize', () => {
        renderer.resize();
        updateMarkerPosition();
    });

    // Initial Resize
    renderer.resize();

    // Load Default Level (Mini)
    await loadLevel('mini');

    // Event Listeners
    setupEvents();

    log("SYSTEM READY. WAITING FOR INPUT.");
}

function setupEvents() {
    // Level Selection
    levelBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            if (isRunning) return;

            // UI Update
            levelBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const levelType = btn.dataset.level;
            await loadLevel(levelType);
            log(`CHANGED SECTOR TO: ${levelType.toUpperCase()}`);
        });
    });

    // Canvas Click
    canvas.addEventListener('click', (e) => {
        if (isRunning || !currentMapData) return;

        const pos = renderer.getClickPos(e);
        if (!pos) return;

        // Validate Walkable (Goal can be moved, Start can be moved)
        if (currentMapData[pos.r][pos.c] === 1) { // Wall
            log("ERROR: CANNOT DEPLOY TO WALL SECTOR", "error");
            return;
        }

        if (currentPhase === 1) {
            setStartPosition(pos);
            setPhase(2);
        } else if (currentPhase === 2 || currentPhase === 3) {
            setGoalPosition(pos);
            setPhase(3);
        }
    });

    // HUD Interactivity (Cascading Rollback)
    hudPhases.forEach((phaseEl, idx) => {
        phaseEl.style.cursor = 'pointer';
        phaseEl.addEventListener('click', () => {
            if (isRunning) return;
            const targetPhase = idx + 1;

            // Logic: Cascading Reset
            if (targetPhase === 1) {
                // Scenario B: Click "Select Start" -> Wipe Everything
                if (currentPhase > 1) {
                    resetGame(true); // Treat as hard reset
                    log("ROLLBACK: SYSTEM RESET TO INITIAL STATE");
                }
            } else if (targetPhase === 2) {
                // Scenario A: Click "Select Destination" -> Wipe Goal, Keep Start
                if (currentPhase > 2) {
                    // Clear Goal from Data
                    if (currentGoalPos && currentMapData) {
                        currentMapData[currentGoalPos.r][currentGoalPos.c] = 0;
                    }
                    currentGoalPos = null;

                    // Update Visuals
                    goalMarker.classList.add('hidden');
                    renderer.drawFullMap(); // Clears map colors
                    if (currentStartPos) renderer.drawCell(currentStartPos.r, currentStartPos.c, '#ffffff'); // Redraw Start

                    setPhase(2);
                    log("ROLLBACK: DESTINATION CLEARED. WAITING FOR INPUT.");
                }
            }
            // Phase 3 click does nothing (checking status)
        });
    });

    // Run Button
    btnRun.addEventListener('click', () => {
        if (isRunning) return;
        // Safety Lock: Check strict requirements
        if (!currentStartPos || !currentGoalPos) {
            log("ERROR: INCOMPLETE DATA SET. CANNOT INITIATE.", "error");
            return;
        }
        runSimulation();
    });

    // Reset Button
    btnReset.addEventListener('click', () => {
        resetGame(true); // Hard Reset
    });
}

function setPhase(phase) {
    currentPhase = phase;
    hudPhases.forEach((el, idx) => {
        if (idx + 1 === phase) el.classList.add('active');
        else el.classList.remove('active');
    });

    if (phase === 3) {
        // Requirement 3: Safety Lock Check
        if (currentStartPos && currentGoalPos) {
            btnRun.classList.remove('disabled');
            statusText.textContent = "READY TO INITIATE";
        } else {
            // Should not happen if logic is correct, but safe fallback
            btnRun.classList.add('disabled');
        }
    } else {
        // Requirement 3: Safety Lock - Disabled by default
        btnRun.classList.add('disabled');
        if (phase === 1) statusText.textContent = "SELECT START";
        if (phase === 2) statusText.textContent = "SELECT DESTINATION";
    }
}

function setStartPosition(pos) {
    if (currentStartPos) {
        // Redraw to clear old start pixel
        renderer.drawFullMap();
    }

    currentStartPos = pos;
    renderer.drawCell(pos.r, pos.c, '#ffffff'); // White for start
    log(`INSERTION POINT SET: [${pos.c}, ${pos.r}]`);
}

function setGoalPosition(pos) {
    // 1. Remove old goal from Map Data
    if (currentGoalPos) {
        currentMapData[currentGoalPos.r][currentGoalPos.c] = 0; // Set to empty
    }

    // 2. Set new goal in Map Data (Important for BFS)
    currentMapData[pos.r][pos.c] = 2;
    currentGoalPos = pos;

    // 3. Update Visuals
    renderer.drawFullMap();
    if (currentStartPos) renderer.drawCell(currentStartPos.r, currentStartPos.c, '#ffffff');

    // 4. Move Marker
    updateMarkerPosition();
    goalMarker.classList.remove('hidden');
    log(`DESTINATION COORDINATES UPDATED: [${pos.c}, ${pos.r}]`);
}

async function loadLevel(type) {
    showLoader(true);
    resetGame(true); // Hard reset

    try {
        const url = `assets/level_${type}.json`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error("Network error");

        const data = await resp.json();
        currentMapData = data.map; // 2D array

        renderer.loadMap(currentMapData);
        log(`SECTOR LOADED: ${data.name || type}`);

        statDims.textContent = `${currentMapData[0].length} x ${currentMapData.length}`;

        // Find Goal
        findGoal();

    } catch (e) {
        log(`Load Error: ${e.message}`, "error");
        console.error(e);
    } finally {
        showLoader(false);
        setPhase(1); // Phase 1: Scanning/Select Start
    }
}

function findGoal() {
    currentGoalPos = null;
    goalMarker.classList.add('hidden');

    const rows = currentMapData.length;
    const cols = currentMapData[0].length;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (currentMapData[r][c] === 2) {
                currentGoalPos = { r, c };
                break;
            }
        }
    }

    if (currentGoalPos) {
        updateMarkerPosition();
        goalMarker.classList.remove('hidden');
        log("TARGET DETECTED.");
    }
}

function updateMarkerPosition() {
    if (!currentGoalPos) return;

    const center = renderer.getCellCenter(currentGoalPos.r, currentGoalPos.c);
    goalMarker.style.left = `${center.x}px`;
    goalMarker.style.top = `${center.y}px`; // Marker CSS translates -100% Y to sit on top
}

function runSimulation() {
    isRunning = true;
    setPhase(3);
    btnRun.classList.add('hidden');

    const startTime = performance.now();

    try {
        log("INITIATING WAVEFRONT ALGORITHM...");

        // 1. Run BFS
        const result = planner.run(currentMapData);

        // 2. Trace Path from Start
        const trajectory = planner.tracePath(result.valueMap, currentStartPos);

        const endTime = performance.now();
        const dt = (endTime - startTime).toFixed(2);

        statTime.textContent = `${dt}ms`;
        statLen.textContent = trajectory.length;

        log(`PATH CALCULATED IN ${dt}ms. LENGTH: ${trajectory.length}`);
        log("VISUALIZING DATA STREAM...");

        // 3. Animate Flood (Speed determined by map size)
        const totalCells = currentMapData.length * currentMapData[0].length;
        // Faster speed for larger maps
        const speed = totalCells > 5000 ? 500 : 10;

        renderer.animateFlood(result.visitedOrder, speed, () => {
            log("DATA MAP COMPLETE. TRACING PATH...");

            // 4. Animate Path
            renderer.animatePath(trajectory, () => {
                log("TARGET ACQUIRED. MISSION COMPLETE.");
                updateStatus("COMPLETE");
                isRunning = false;
                btnReset.classList.remove('hidden');
            });
        });

    } catch (e) {
        log(`CRITICAL FAILURE: ${e.message}`, "error");
        updateStatus("ERROR");
        isRunning = false;
        btnReset.classList.remove('hidden');
    }
}

function resetGame(hard = false) {
    isRunning = false;
    renderer.reset();
    btnReset.classList.add('hidden');
    btnRun.classList.remove('hidden');
    updateStatus("ONLINE");

    if (hard) {
        // Requirement 1: Completely wipe previous startNode
        currentStartPos = null;
        currentGoalPos = null;

        // Requirement 1: Force state explicit back to PHASE_SELECT_START (1)
        setPhase(1);

        goalMarker.classList.add('hidden');
        statTime.textContent = "0.00ms";
        statLen.textContent = "0";

        // Clear map data if needed (remove '2' goal, 'start' visual is gone via redrawing null)
        // Note: We don't reload map JSON, just use existing loaded map but clear our markers?
        // Actually renderer.reset() -> drawFullMap() draws map from currentMapData.
        // We need to ensure currentMapData is clean of our '2' (goal). 
        // We can reload the level to be safe, or just manually clear.
        if (currentMapData) {
            // Brute force clear any '2's just in case
            const rows = currentMapData.length;
            const cols = currentMapData[0].length;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (currentMapData[r][c] === 2) currentMapData[r][c] = 0;
                }
            }
        }
        renderer.drawFullMap();

    } else {
        // Soft reset (only used internally if we wanted to retry, but currently not exposed)
        if (currentStartPos) {
            renderer.drawCell(currentStartPos.r, currentStartPos.c, '#ffffff');
            setPhase(2);
        } else {
            setPhase(1);
        }
    }
}

// Helpers
function log(msg, type = "info") {
    const line = document.createElement('div');
    line.className = 'log-line';
    line.textContent = `> ${msg}`;
    if (type === 'error') line.style.color = '#ff0055';
    consoleLog.appendChild(line);
    consoleLog.scrollTop = consoleLog.scrollHeight;
}

function updateStatus(text) {
    statusText.textContent = text;
    if (text === 'ERROR') statusText.style.color = '#ff0055';
    else if (text === 'COMPLETE') statusText.style.color = '#00f0ff';
    else statusText.style.color = '';
}

function showLoader(show) {
    if (show) loader.classList.remove('hidden');
    else loader.classList.add('hidden');
}

// Start
init();
