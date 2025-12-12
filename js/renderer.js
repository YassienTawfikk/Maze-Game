export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false }); // Optimize
        this.width = 0;
        this.height = 0;
        this.cellSize = 0;
        this.mapData = null; // 2D array
        this.colors = {
            wall: '#000000',
            empty: '#111111',
            goal: '#ff0055',
            visited: '#003344', // Dark teal for flood
            path: '#00f0ff',     // Cyan for path
            start: '#ffffff'
        };

        // Animation state
        this.animating = false;
        this.floodQueue = [];
        this.pathQueue = [];
        this.floodedCells = new Set(); // String "r,c"
        this.pathCells = []; // Array of {r,c}
    }

    resize() {
        const parent = this.canvas.parentElement;
        this.canvas.width = parent.clientWidth;
        this.canvas.height = parent.clientHeight;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        if (this.mapData) this.calculateMetrics();
        this.drawFullMap();
    }

    loadMap(mapData) {
        this.mapData = mapData;
        this.floodedCells.clear();
        this.pathCells = [];
        this.calculateMetrics();
        this.drawFullMap();
    }

    calculateMetrics() {
        const rows = this.mapData.length;
        const cols = this.mapData[0].length;

        // Calculate max cell size that fits in the canvas
        const cellW = this.width / cols;
        const cellH = this.height / rows;
        this.cellSize = Math.min(cellW, cellH);

        // Center the map
        this.offsetX = (this.width - (cols * this.cellSize)) / 2;
        this.offsetY = (this.height - (rows * this.cellSize)) / 2;
    }

    drawFullMap() {
        if (!this.mapData) return;

        // Clear background
        this.ctx.fillStyle = '#050505'; // Root bg
        this.ctx.fillRect(0, 0, this.width, this.height);

        const rows = this.mapData.length;
        const cols = this.mapData[0].length;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                this.drawCell(r, c, this.getCellColor(r, c));
            }
        }

        // Redraw overlays (flood/path) if resizing occurred
        this.floodedCells.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            this.drawCell(r, c, this.colors.visited);
        });

        this.pathCells.forEach(p => {
            this.drawCell(p.r, p.c, this.colors.path);
        });
    }

    getCellColor(r, c) {
        const val = this.mapData[r][c];
        if (val === 1) return this.colors.wall;
        if (val === 2) return this.colors.goal;
        return this.colors.empty;
    }

    drawCell(r, c, color) {
        const x = Math.floor(this.offsetX + c * this.cellSize);
        const y = Math.floor(this.offsetY + r * this.cellSize);
        const w = Math.ceil(this.cellSize); // Ceil to avoid subpixel gaps
        const h = Math.ceil(this.cellSize);

        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, w, h);
    }

    /**
     * Start animating the flood fill
     */
    animateFlood(visitedOrder, speed = 10, onComplete) {
        this.floodQueue = [...visitedOrder];
        this.animating = true;

        const step = () => {
            if (!this.animating) return;

            // Process 'speed' items per frame
            for (let i = 0; i < speed; i++) {
                if (this.floodQueue.length === 0) {
                    this.animating = false;
                    if (onComplete) onComplete();
                    return;
                }
                const cell = this.floodQueue.shift();
                if (this.mapData[cell.r][cell.c] === 0) { // Don't color over walls/goals
                    this.drawCell(cell.r, cell.c, this.colors.visited);
                    this.floodedCells.add(`${cell.r},${cell.c}`);
                }
            }
            requestAnimationFrame(step);
        };
        step();
    }

    /**
     * Start animating the path
     */
    animatePath(trajectory, onComplete) {
        this.pathQueue = [...trajectory];
        this.animating = true;

        let idx = 0;
        const step = () => {
            if (!this.animating) return;

            if (idx >= this.pathQueue.length) {
                this.animating = false;
                if (onComplete) onComplete();
                return;
            }

            const cell = this.pathQueue[idx];
            this.drawCell(cell.r, cell.c, this.colors.path);
            this.pathCells.push(cell);
            idx++;

            // Slower animation for path to make it dramatic
            requestAnimationFrame(step);
        };
        step();
    }

    reset() {
        this.animating = false;
        this.floodQueue = [];
        this.pathQueue = [];
        this.floodedCells.clear();
        this.pathCells = [];
        this.drawFullMap();
    }

    getClickPos(evt) {
        const rect = this.canvas.getBoundingClientRect();
        const x = evt.clientX - rect.left - this.offsetX;
        const y = evt.clientY - rect.top - this.offsetY;

        const c = Math.floor(x / this.cellSize);
        const r = Math.floor(y / this.cellSize);

        if (r >= 0 && r < this.mapData.length && c >= 0 && c < this.mapData[0].length) {
            return { r, c };
        }
        return null;
    }

    /**
     * Get pixel coordinates for the center of a cell
     */
    getCellCenter(r, c) {
        const x = this.offsetX + (c * this.cellSize) + (this.cellSize / 2);
        const y = this.offsetY + (r * this.cellSize) + (this.cellSize / 2);
        return { x, y };
    }
}
