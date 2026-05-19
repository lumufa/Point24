/* eslint-disable */
// B6 回归测试: 对比 H5 script.js 和 Cocos TS solver.ts 在 100 组固定牌面上的 solve24 输出
// 跑法: node tests/solve24-regression.js
// 期望: 100/100 passed, exit 0

// -------- H5 原版实现 (从 script.js 提取, 无 DOM 依赖) --------

function h5_gcd(a, b) {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y !== 0) {
        const t = x % y;
        x = y;
        y = t;
    }
    return x || 1;
}

function h5_normalizeFraction(num, den) {
    if (den === 0) return null;
    let n = num;
    let d = den;
    if (d < 0) { n = -n; d = -d; }
    const g = h5_gcd(n, d);
    return { num: n / g, den: d / g };
}

function h5_operateFractions(left, right, op) {
    if (op === '+') return h5_normalizeFraction(left.num * right.den + right.num * left.den, left.den * right.den);
    if (op === '-') return h5_normalizeFraction(left.num * right.den - right.num * left.den, left.den * right.den);
    if (op === '*') return h5_normalizeFraction(left.num * right.num, left.den * right.den);
    if (op === '/') {
        if (right.num === 0) return null;
        return h5_normalizeFraction(left.num * right.den, left.den * right.num);
    }
    return null;
}

function h5_rankLabel(rank) {
    if (rank === 1) return 'A';
    if (rank === 11) return 'J';
    if (rank === 12) return 'Q';
    if (rank === 13) return 'K';
    return String(rank);
}

function h5_wrapExpression(expression) { return `(${expression})`; }

function h5_trimOuterParentheses(expression) {
    let current = expression.trim();
    while (current.startsWith('(') && current.endsWith(')')) {
        let depth = 0;
        let balanced = true;
        for (let i = 0; i < current.length; i += 1) {
            const c = current[i];
            if (c === '(') depth += 1;
            else if (c === ')') depth -= 1;
            if (depth === 0 && i < current.length - 1) { balanced = false; break; }
        }
        if (!balanced) break;
        current = current.slice(1, -1).trim();
    }
    return current;
}

function h5_sortSolutions(list) {
    return [...list].sort((a, b) => {
        if (a.length === b.length) return a.localeCompare(b, 'zh-CN');
        return a.length - b.length;
    });
}

function h5_solve24(cards) {
    const initial = cards.map(c => ({ num: c.rank, den: 1, expr: h5_rankLabel(c.rank) }));
    const solutions = new Set();

    function dfs(nodes) {
        if (nodes.length === 1) {
            if (nodes[0].num === 24 * nodes[0].den) {
                solutions.add(h5_trimOuterParentheses(nodes[0].expr));
            }
            return;
        }

        for (let first = 0; first < nodes.length; first += 1) {
            for (let second = first + 1; second < nodes.length; second += 1) {
                const L = nodes[first];
                const R = nodes[second];
                const rest = nodes.filter((_, i) => i !== first && i !== second);
                const nextNodes = [];

                nextNodes.push({ ...h5_operateFractions(L, R, '+'), expr: h5_wrapExpression(`${L.expr} + ${R.expr}`) });
                nextNodes.push({ ...h5_operateFractions(L, R, '-'), expr: h5_wrapExpression(`${L.expr} − ${R.expr}`) });
                nextNodes.push({ ...h5_operateFractions(R, L, '-'), expr: h5_wrapExpression(`${R.expr} − ${L.expr}`) });
                nextNodes.push({ ...h5_operateFractions(L, R, '*'), expr: h5_wrapExpression(`${L.expr} × ${R.expr}`) });

                const dl = h5_operateFractions(L, R, '/');
                if (dl) nextNodes.push({ ...dl, expr: h5_wrapExpression(`${L.expr} ÷ ${R.expr}`) });
                const dr = h5_operateFractions(R, L, '/');
                if (dr) nextNodes.push({ ...dr, expr: h5_wrapExpression(`${R.expr} ÷ ${L.expr}`) });

                nextNodes.filter(Boolean).forEach(n => dfs([...rest, n]));
            }
        }
    }

    dfs(initial);
    return h5_sortSolutions([...solutions]);
}

// -------- Cocos TS 实现 (从 assets/scripts/core/*.ts 提取, 类型已剥) --------

function cc_gcd(a, b) {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y !== 0) { const t = x % y; x = y; y = t; }
    return x || 1;
}

function cc_normalizeFraction(num, den) {
    if (den === 0) return null;
    let n = num;
    let d = den;
    if (d < 0) { n = -n; d = -d; }
    const g = cc_gcd(n, d);
    return { num: n / g, den: d / g };
}

function cc_operateFractions(left, right, op) {
    if (op === '+') return cc_normalizeFraction(left.num * right.den + right.num * left.den, left.den * right.den);
    if (op === '-') return cc_normalizeFraction(left.num * right.den - right.num * left.den, left.den * right.den);
    if (op === '*') return cc_normalizeFraction(left.num * right.num, left.den * right.den);
    if (op === '/') {
        if (right.num === 0) return null;
        return cc_normalizeFraction(left.num * right.den, left.den * right.num);
    }
    return null;
}

function cc_rankLabel(rank) {
    if (rank === 1) return 'A';
    if (rank === 11) return 'J';
    if (rank === 12) return 'Q';
    if (rank === 13) return 'K';
    return String(rank);
}

function cc_wrapExpression(expr) { return `(${expr})`; }

function cc_trimOuterParentheses(expr) {
    let cur = expr.trim();
    while (cur.startsWith('(') && cur.endsWith(')')) {
        let depth = 0;
        let balanced = true;
        for (let i = 0; i < cur.length; i += 1) {
            const c = cur[i];
            if (c === '(') depth += 1;
            else if (c === ')') depth -= 1;
            if (depth === 0 && i < cur.length - 1) { balanced = false; break; }
        }
        if (!balanced) break;
        cur = cur.slice(1, -1).trim();
    }
    return cur;
}

function cc_sortSolutions(list) {
    return [...list].sort((a, b) => {
        if (a.length === b.length) return a.localeCompare(b, 'zh-CN');
        return a.length - b.length;
    });
}

function cc_solve24(cards) {
    const initial = cards.map(c => ({ num: c.rank, den: 1, expr: cc_rankLabel(c.rank) }));
    const solutions = new Set();

    function dfs(nodes) {
        if (nodes.length === 1) {
            if (nodes[0].num === 24 * nodes[0].den) {
                solutions.add(cc_trimOuterParentheses(nodes[0].expr));
            }
            return;
        }

        for (let first = 0; first < nodes.length; first += 1) {
            for (let second = first + 1; second < nodes.length; second += 1) {
                const L = nodes[first];
                const R = nodes[second];
                const rest = nodes.filter((_, i) => i !== first && i !== second);

                const tryOp = (frac, expr) => {
                    if (frac) dfs([...rest, { num: frac.num, den: frac.den, expr }]);
                };

                tryOp(cc_operateFractions(L, R, '+'), cc_wrapExpression(`${L.expr} + ${R.expr}`));
                tryOp(cc_operateFractions(L, R, '-'), cc_wrapExpression(`${L.expr} − ${R.expr}`));
                tryOp(cc_operateFractions(R, L, '-'), cc_wrapExpression(`${R.expr} − ${L.expr}`));
                tryOp(cc_operateFractions(L, R, '*'), cc_wrapExpression(`${L.expr} × ${R.expr}`));
                tryOp(cc_operateFractions(L, R, '/'), cc_wrapExpression(`${L.expr} ÷ ${R.expr}`));
                tryOp(cc_operateFractions(R, L, '/'), cc_wrapExpression(`${R.expr} ÷ ${L.expr}`));
            }
        }
    }

    dfs(initial);
    return cc_sortSolutions([...solutions]);
}

// -------- 100 组固定牌面 (覆盖: 单解 / 无解 / 高分数 / 重复 / 面牌 / 边界) --------

const FIXTURES = [
    // 经典难题 (ADVANCED_DEAL_POOL 里的 6 组)
    [3, 3, 7, 7],   // (3 + 3/7) * 7 = 24
    [1, 3, 4, 6],
    [1, 5, 5, 5],
    [1, 6, 6, 8],
    [3, 8, 8, 9],
    [4, 7, 8, 8],

    // 常见简单
    [4, 5, 6, 7],
    [3, 8, 4, 6],
    [1, 2, 3, 4],
    [2, 3, 4, 5],
    [6, 6, 6, 6],
    [8, 8, 3, 3],
    [2, 4, 6, 8],
    [1, 2, 7, 8],
    [3, 3, 8, 8],

    // 无解样本 (根据 24 点理论)
    [1, 1, 1, 1],
    [1, 1, 1, 2],
    [1, 1, 1, 3],
    [1, 1, 2, 2],
    [1, 1, 1, 8],
    [1, 2, 2, 2],
    [5, 5, 5, 9],
    [9, 9, 9, 9],
    [10, 10, 10, 10],
    [11, 12, 13, 13],

    // 面牌 (J=11, Q=12, K=13)
    [11, 12, 13, 1],
    [11, 11, 12, 12],
    [11, 13, 12, 2],
    [12, 12, 3, 3],
    [13, 13, 13, 13],
    [11, 11, 11, 11],
    [12, 12, 12, 12],
    [11, 12, 1, 2],
    [13, 11, 6, 6],
    [12, 3, 8, 2],

    // 含 A (rank=1)
    [1, 1, 8, 8],
    [1, 2, 3, 5],
    [1, 4, 5, 6],
    [1, 8, 12, 12],
    [1, 1, 11, 11],
    [1, 3, 6, 7],
    [1, 5, 11, 11],
    [1, 7, 13, 13],
    [1, 9, 9, 6],
    [1, 6, 11, 11],

    // 完全相同 (对称性验证)
    [2, 2, 2, 2],
    [3, 3, 3, 3],
    [4, 4, 4, 4],
    [5, 5, 5, 5],
    [7, 7, 7, 7],
    [8, 8, 8, 8],

    // 中等多解
    [2, 6, 4, 4],
    [3, 4, 6, 7],
    [2, 2, 8, 8],
    [4, 4, 6, 6],
    [2, 3, 6, 8],
    [3, 3, 6, 6],
    [5, 6, 7, 8],
    [4, 5, 6, 9],
    [2, 2, 4, 6],
    [2, 4, 4, 8],

    // 需要分数中间步 (难题)
    [5, 5, 5, 1],   // (5 - 1/5) * 5 = 24
    [3, 3, 8, 3],
    [7, 3, 3, 7],
    [5, 7, 7, 11],
    [1, 5, 11, 5],
    [2, 5, 5, 10],
    [3, 3, 7, 3],
    [6, 9, 9, 10],
    [3, 5, 7, 13],
    [4, 8, 1, 5],

    // 含 0 (虽然牌面 1-13 不会出现 0, 但代码如果进 rank=0 会炸)
    // 跳过, 题目约束是 1-13

    // 中高难度混合
    [2, 5, 7, 8],
    [3, 6, 7, 8],
    [4, 6, 8, 10],
    [5, 8, 9, 10],
    [2, 3, 4, 12],
    [6, 7, 8, 9],
    [3, 4, 5, 10],
    [4, 5, 8, 11],
    [2, 7, 11, 12],
    [5, 6, 9, 10],

    // 含重复的组合
    [7, 7, 3, 8],
    [4, 4, 2, 12],
    [6, 6, 2, 3],
    [9, 9, 3, 3],
    [5, 5, 2, 10],
    [8, 8, 1, 1],
    [10, 10, 4, 4],
    [6, 6, 11, 11],

    // 边界大数组合
    [10, 11, 12, 13],
    [9, 10, 11, 12],
    [13, 13, 1, 1],
    [13, 12, 11, 10],
    [13, 1, 11, 1],

    // 再补 6 个达到 100
    [1, 3, 7, 13],
    [2, 6, 11, 13],
    [4, 7, 9, 13],
    [3, 5, 10, 11],
    [2, 8, 10, 12],
    [1, 4, 11, 13],
];

if (FIXTURES.length !== 100) {
    console.error(`FIXTURE 数量 ${FIXTURES.length} 不是 100, 请检查`);
    process.exit(2);
}

// -------- 运行对比 --------

let passed = 0;
const failures = [];

for (const ranks of FIXTURES) {
    const cards = ranks.map(r => ({ rank: r }));
    const h5 = h5_solve24(cards);
    const cc = cc_solve24(cards);

    const h5Json = JSON.stringify(h5);
    const ccJson = JSON.stringify(cc);

    if (h5Json === ccJson) {
        passed += 1;
    } else {
        failures.push({
            ranks: ranks.join(','),
            h5Count: h5.length,
            ccCount: cc.length,
            h5Sample: h5.slice(0, 3),
            ccSample: cc.slice(0, 3),
            onlyInH5: h5.filter(s => !cc.includes(s)).slice(0, 3),
            onlyInCC: cc.filter(s => !h5.includes(s)).slice(0, 3),
        });
    }
}

console.log(`${passed}/${FIXTURES.length} passed`);

if (failures.length > 0) {
    console.log(`\n${failures.length} 组牌面不一致:\n`);
    for (const f of failures) {
        console.log(`[${f.ranks}]  H5: ${f.h5Count} 解,  Cocos: ${f.ccCount} 解`);
        if (f.onlyInH5.length > 0) console.log(`  只在 H5: ${JSON.stringify(f.onlyInH5)}`);
        if (f.onlyInCC.length > 0) console.log(`  只在 Cocos: ${JSON.stringify(f.onlyInCC)}`);
    }
    process.exit(1);
}

// -------- 额外: 输出 golden 文件方便未来 CI --------

const fs = require('fs');
const path = require('path');
const goldenPath = path.join(__dirname, 'solve24-golden.json');
const golden = FIXTURES.map(ranks => ({
    ranks,
    solutions: h5_solve24(ranks.map(r => ({ rank: r }))),
}));
fs.writeFileSync(goldenPath, JSON.stringify(golden, null, 2), 'utf8');
console.log(`\ngolden 已写出到 ${goldenPath}`);

process.exit(0);
