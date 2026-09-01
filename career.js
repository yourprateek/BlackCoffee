console.log("JS Linked");
console.log("Career Graph JS Linked");

/* ---------------------------------------------------------
   1. DATA — the entire tree lives here.
   Every node just needs: id, parentId (null = root), category,
   title, desc, hours. Add as many nodes/branches as you want —
   the layout below figures out where to draw them.
--------------------------------------------------------- */
const careerTreeData = [
    { id: "start", parentId: null, category: "START", title: "Post 12th PCM",
      desc: "Completion of 12th grade with Physics, Chemistry and Mathematics.", hours: null, type: "start" },

    // --- Web Development branch ---
    { id: "html", parentId: "start", category: "Core Web", title: "HTML5 Semantic Web",
      desc: "Learn semantic markup, document structure, accessibility (ARIA), SEO.", hours: 15 },
    { id: "css", parentId: "html", category: "Styling & UI", title: "CSS3 & Modern Layouts",
      desc: "Master Flexbox, CSS Grid, custom properties, animations.", hours: 25 },
    { id: "js", parentId: "css", category: "Core Logic", title: "JavaScript ES6+ & DOM",
      desc: "Core JS programming: closures, prototypes, async, Promises.", hours: 40 },
    { id: "react", parentId: "js", category: "Frontend Framework", title: "React 18 & State",
      desc: "Component lifecycle, JSX, hooks: useState, useEffect, useMemo.", hours: 45 },
    { id: "m-frontend", parentId: "react", category: "MILESTONE", title: "Milestone: Frontend Newbie",
      desc: "Qualified to build production-grade single page applications.", hours: null, type: "milestone" },
    { id: "next", parentId: "m-frontend", category: "Fullstack Framework", title: "Next.js 15 App Router",
      desc: "Server-side rendering, static site generation, React server components.", hours: 35 },

    // --- AI / ML branch ---
    { id: "python", parentId: "start", category: "Programming", title: "Python 3 & Data Structures",
      desc: "Python syntax, object-oriented design, list comprehensions.", hours: 30 },
    { id: "stats", parentId: "python", category: "Statistical Analysis", title: "Inferential Statistics & Probability",
      desc: "Bayesian probability, hypothesis testing, standard deviation.", hours: 25 },
    { id: "mathai", parentId: "stats", category: "Mathematical Foundation", title: "Math for AI & Linear Algebra",
      desc: "Matrix multiplications, eigenvalues, eigenvectors, gradient descent.", hours: 35 },
    { id: "nn", parentId: "mathai", category: "Neural Networks", title: "PyTorch & Deep Learning",
      desc: "Neural network backpropagation, PyTorch autograd, CNNs.", hours: 50 },
    { id: "nlp", parentId: "nn", category: "NLP & Transformers", title: "NLP & Transformer Models",
      desc: "Tokenization, Word2Vec, BERT, self-attention mechanisms.", hours: 45 },
    { id: "genai", parentId: "nlp", category: "GenAI Specialist", title: "Generative AI, RAG & LLMs",
      desc: "Parameter-efficient fine-tuning (LoRA/QLoRA), retrieval-augmented generation.", hours: 45 },
    { id: "m-ai", parentId: "genai", category: "MILESTONE", title: "Milestone: Agentic AI Engineer",
      desc: "Build autonomous multi-agent systems, tool-calling.", hours: null, type: "milestone" },
];

/* ---------------------------------------------------------
   2. BUILD TREE — turn the flat array into a nested structure
   (each node gets a `children` array), because recursion in
   step 3 needs to walk parent -> children.
--------------------------------------------------------- */
function buildTree(flat) {
    const map = {};
    flat.forEach(n => (map[n.id] = { ...n, children: [] }));

    const roots = [];
    flat.forEach(n => {
        if (n.parentId) map[n.parentId].children.push(map[n.id]);
        else roots.push(map[n.id]);
    });
    return roots;
}

/* ---------------------------------------------------------
   3. LAYOUT — assign x/y to every node.

   The trick: walk the tree depth-first. Leaf nodes (no children)
   just get placed next to each other left-to-right using a shared
   "cursor" that keeps incrementing. A parent with children doesn't
   pick its own x — it waits for its children to be placed, then
   centers itself above the midpoint of its first and last child.
   That's the whole algorithm — it's what keeps branches from
   overlapping no matter how deep or wide the tree gets.
--------------------------------------------------------- */
const NODE_WIDTH = 260;
const NODE_HEIGHT = 120;
const SIBLING_GAP = 50;
const LEVEL_HEIGHT = 170;

let cursorX = 0;

function layout(node, depth) {
    node.y = depth * LEVEL_HEIGHT;

    if (node.children.length === 0) {
        node.x = cursorX;
        cursorX += NODE_WIDTH + SIBLING_GAP;
    } else {
        node.children.forEach(child => layout(child, depth + 1));
        const first = node.children[0];
        const last = node.children[node.children.length - 1];
        node.x = (first.x + last.x) / 2;
    }
}

function flattenTree(roots) {
    const out = [];
    (function walk(n) { out.push(n); n.children.forEach(walk); })(roots[0]);
    // supports multiple roots too:
    for (let i = 1; i < roots.length; i++) {
        (function walk(n) { out.push(n); n.children.forEach(walk); })(roots[i]);
    }
    return out;
}

/* ---------------------------------------------------------
   4. CONNECTORS — draw an "elbow" line (org-chart style) from
   a parent down to each of its children.
--------------------------------------------------------- */
function drawConnectors(svg, node) {
    if (node.children.length === 0) return;

    const parentX = node.x + NODE_WIDTH / 2;
    const parentY = node.y + NODE_HEIGHT;
    const midY = parentY + (LEVEL_HEIGHT - NODE_HEIGHT) / 2;

    node.children.forEach(child => {
        const childX = child.x + NODE_WIDTH / 2;
        const childY = child.y;

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("class", "connector-line");
        path.setAttribute(
            "d",
            `M ${parentX} ${parentY} V ${midY} H ${childX} V ${childY}`
        );
        svg.appendChild(path);

        drawConnectors(svg, child);
    });
}

/* ---------------------------------------------------------
   5. RENDER
--------------------------------------------------------- */
function renderTree() {
    cursorX = 0;
    const roots = buildTree(careerTreeData);
    roots.forEach(r => layout(r, 0));
    const all = flattenTree(roots);

    const nodesContainer = document.getElementById("graph-nodes");
    const svg = document.getElementById("graph-connectors");
    const canvas = document.getElementById("graph-canvas");
    nodesContainer.innerHTML = "";
    svg.innerHTML = "";

    const maxX = Math.max(...all.map(n => n.x)) + NODE_WIDTH + 100;
    const maxY = Math.max(...all.map(n => n.y)) + NODE_HEIGHT + 100;
    canvas.style.width = maxX + "px";
    canvas.style.height = maxY + "px";
    svg.setAttribute("width", maxX);
    svg.setAttribute("height", maxY);

    all.forEach(n => {
        const div = document.createElement("div");
        div.className = "node" + (n.type ? " " + n.type : "");
        div.style.left = n.x + "px";
        div.style.top = n.y + "px";
        div.innerHTML = `
            <span class="node-category">${n.category}</span>
            <div class="node-title">${n.title}</div>
            <div class="node-desc">${n.desc}</div>
            ${n.hours ? `<div class="node-hours">${n.hours} Hours</div>` : ""}
        `;
        nodesContainer.appendChild(div);
    });

    roots.forEach(r => drawConnectors(svg, r));
}

/* ---------------------------------------------------------
   6. PAN & ZOOM — move/scale #graph-canvas with a CSS transform.
--------------------------------------------------------- */
const viewport = document.getElementById("graph-viewport");
const canvas = document.getElementById("graph-canvas");

let scale = 1, panX = 0, panY = 90;
let isPanning = false, startX = 0, startY = 0;

function updateTransform() {
    canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}

viewport.addEventListener("mousedown", e => {
    isPanning = true;
    viewport.classList.add("grabbing");
    startX = e.clientX - panX;
    startY = e.clientY - panY;
});

window.addEventListener("mousemove", e => {
    if (!isPanning) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    updateTransform();
});

window.addEventListener("mouseup", () => {
    isPanning = false;
    viewport.classList.remove("grabbing");
});

viewport.addEventListener("wheel", e => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    scale = Math.min(1.6, Math.max(0.4, scale + delta));
    updateTransform();
}, { passive: false });

function centerOnStart() {
    panX = window.innerWidth / 2 - NODE_WIDTH / 2;
    panY = 90;
    updateTransform();
}

/* ---------------------------------------------------------
   7. INIT
--------------------------------------------------------- */
renderTree();
centerOnStart();