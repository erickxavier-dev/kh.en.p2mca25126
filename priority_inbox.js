require('./notification_app_be/node_modules/dotenv').config({ path: './notification_app_be/.env' });

const TOKEN = process.env.EVALUATION_AUTH_TOKEN;
const API_URL = 'http://20.207.122.201/evaluation-service/notifications';

// Placement is highest priority, then Result, then Event
const TYPE_WEIGHT = { Placement: 300, Result: 200, Event: 100 };

// Combined score: type dominates, recency breaks ties within same type
function calcScore(n) {
    const w = (TYPE_WEIGHT[n.Type] || 0) * 1e12;
    const t = new Date(n.Timestamp).getTime();
    return w + t;
}

// ------- Min-Heap (used to keep top-N without sorting everything) -------
class MinHeap {
    constructor() {
        this.heap = [];
    }

    size() { return this.heap.length; }
    peek() { return this.heap[0]; }

    push(item) {
        this.heap.push(item);
        this._up(this.heap.length - 1);
    }

    pop() {
        const top = this.heap[0];
        const tail = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = tail;
            this._down(0);
        }
        return top;
    }

    _up(i) {
        while (i > 0) {
            const p = Math.floor((i - 1) / 2);
            if (this.heap[p].score <= this.heap[i].score) break;
            [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
            i = p;
        }
    }

    _down(i) {
        const n = this.heap.length;
        while (true) {
            let min = i;
            const l = 2 * i + 1, r = 2 * i + 2;
            if (l < n && this.heap[l].score < this.heap[min].score) min = l;
            if (r < n && this.heap[r].score < this.heap[min].score) min = r;
            if (min === i) break;
            [this.heap[min], this.heap[i]] = [this.heap[i], this.heap[min]];
            i = min;
        }
    }
}

// Keep the top-N using a min-heap of size N.
// New items only enter if they beat the current weakest item.
// This runs in O(M log N) where M = total notifications.
function getTopN(notifications, n) {
    const heap = new MinHeap();

    for (const notif of notifications) {
        const s = calcScore(notif);
        const entry = { ...notif, score: s };

        if (heap.size() < n) {
            heap.push(entry);
        } else if (s > heap.peek().score) {
            heap.pop();       // remove the weakest in current top-N
            heap.push(entry); // slot in the stronger one
        }
    }

    // Extract from heap — comes out in ascending score, so reverse it
    const result = [];
    while (heap.size() > 0) result.unshift(heap.pop());
    return result;
}

async function main() {
    const topN = parseInt(process.argv[2]) || 10;

    if (!TOKEN) {
        console.error('ERROR: EVALUATION_AUTH_TOKEN not found in notification_app_be/.env');
        process.exit(1);
    }

    console.log(`Fetching notifications from evaluation API...`);

    let resp;
    try {
        resp = await fetch(API_URL, {
            headers: { 'Authorization': 'Bearer ' + TOKEN }
        });
    } catch (err) {
        console.error('Network error:', err.message);
        process.exit(1);
    }

    if (!resp.ok) {
        const body = await resp.text();
        console.error(`API returned ${resp.status}: ${body}`);
        process.exit(1);
    }

    const json = await resp.json();
    const all = json.notifications || [];
    console.log(`Total notifications received: ${all.length}\n`);

    const top = getTopN(all, topN);

    console.log(`Priority Inbox — Top ${topN} Notifications`);
    console.log('='.repeat(58));

    top.forEach((item, idx) => {
        const rank = String(idx + 1).padStart(2, ' ');
        const type = item.Type.padEnd(10);
        console.log(`${rank}. [${type}] ${item.Message}`);
        console.log(`    Timestamp : ${item.Timestamp}`);
        console.log(`    Score     : ${item.score}`);
        console.log('');
    });
}

main().catch(err => {
    console.error('Unexpected error:', err.message);
    process.exit(1);
});
