/**
 * Wavefront (BFS) Planner Logic
 */

export class BFSPlanner {
    constructor() {
        this.directions = [
            [-1, 0], [0, 1], [1, 0], [0, -1], // Cardinals
            [-1, 1], [1, 1], [1, -1], [-1, -1] // Diagonals
        ];
    }

    /**
     * Runs the Wavefront algorithm.
     * @param {number[][]} mapMatrix - 0 for empty, 1 for wall, 2 for goal.
     * @returns {Object} result - Contains valueMap, trajectory, and visitedOrder (for animation).
     */
    run(mapMatrix) {
        const rows = mapMatrix.length;
        const cols = mapMatrix[0].length;

        // Clone map to create value map (using a Float32 or Int32 array would be faster for huge maps, but simple array is fine for now)
        // We use a flat Int32Array for performance if the map is huge, but let's stick to 2D initially for readability unless it lags.
        // Actually, for "Mega Maze", 1000x1000 is 1 million cells. JS Arrays are fine.

        const valueMap = mapMatrix.map(row => [...row]);
        const visitedOrder = []; // To animate the flood fill

        // Find Goal
        let goalPos = null;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (valueMap[r][c] === 2) {
                    goalPos = { r, c };
                    break;
                }
            }
            if (goalPos) break;
        }

        if (!goalPos) throw new Error("Goal not found!");

        // Initialize BFS
        const queue = [];
        queue.push(goalPos);

        const visited = new Set();
        visited.add(`${goalPos.r},${goalPos.c}`);

        // Perform Wavefront
        while (queue.length > 0) {
            const { r, c } = queue.shift();
            const currVal = valueMap[r][c];

            // Record for animation
            visitedOrder.push({ r, c, val: currVal });

            for (const [dr, dc] of this.directions) {
                const nr = r + dr;
                const nc = c + dc;

                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                    // Check if 0 (walkable) and not visited
                    if (valueMap[nr][nc] === 0 && !visited.has(`${nr},${nc}`)) {
                        valueMap[nr][nc] = currVal + 1;
                        visited.add(`${nr},${nc}`);
                        queue.push({ r: nr, c: nc });
                    }
                }
            }
        }

        return { valueMap, goalPos, visitedOrder };
    }

    /**
     * Traces the path from start to goal using the value map.
     * @param {number[][]} valueMap 
     * @param {Object} startPos {r, c}
     * @returns {Object[]} Trajectory points
     */
    tracePath(valueMap, startPos) {
        const rows = valueMap.length;
        const cols = valueMap[0].length;
        const trajectory = [];
        let curr = { ...startPos };

        // Safety break to prevent infinite loops
        let maxSteps = rows * cols;
        let steps = 0;

        // Current start is not the goal (goal is 2)
        while (valueMap[curr.r][curr.c] !== 2 && steps < maxSteps) {
            trajectory.push({ ...curr });

            let minVal = Infinity;
            let nextPos = null;

            for (const [dr, dc] of this.directions) {
                const nr = curr.r + dr;
                const nc = curr.c + dc;

                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                    const val = valueMap[nr][nc];
                    // Skip walls (1)
                    if (val !== 1 && val < minVal) {
                        minVal = val;
                        nextPos = { r: nr, c: nc };
                    }
                }
            }

            if (nextPos) {
                curr = nextPos;
            } else {
                break; // No path
            }
            steps++;
        }

        trajectory.push(curr); // Add final goal position
        return trajectory;
    }
}
