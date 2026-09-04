// ---- AI CAREER CHAT ----

const API_BASE = 'http://localhost:8000';

// Placeholder — swap this for localStorage.getItem('userEmail') once login is complete
const PLACEHOLDER_EMAIL = 'guest@acadbridge.dev';

let currentThreadTitle = null;
let isWaiting = false;

// ---- JUMP FROM PROFILE POPUP → CHAT TAB ----
// Called by index.js when the user submits from the profile tab chat bubble.
function jumpToChat(question) {
    // Find the "AI Chat" nav button to properly mark it active
    const chatNavBtn = Array.from(document.querySelectorAll("nav button"))
        .find(btn => btn.textContent.trim() === "AI Chat");

    if (typeof changeTab === "function" && chatTab && chatNavBtn) {
        changeTab(chatTab, chatNavBtn);
    }

    // Small delay so the tab renders before we push the message in
    setTimeout(() => {
        if (question && question.trim()) {
            sendMessage(question.trim());
        }
    }, 60);
}


// DOM refs (resolved lazily since this script loads before tab is shown)
function getChatEl(id) { return document.getElementById(id); }

// ---- AUTO-RESIZE TEXTAREA ----
document.addEventListener('DOMContentLoaded', () => {
    const input = getChatEl('chatInput');
    if (!input) return;

    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 160) + 'px';
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
});

// ---- SEND MESSAGE ----
async function sendMessage(prefill) {
    const input = getChatEl('chatInput');
    const text = (prefill || input.value).trim();
    if (!text || isWaiting) return;

    // Hide welcome screen
    const welcome = getChatEl('chatWelcome');
    if (welcome) welcome.style.display = 'none';

    appendBubble('user', text);
    input.value = '';
    input.style.height = 'auto';
    setWaiting(true);

    const typingEl = showTyping();

    try {
        const res = await fetch(`${API_BASE}/career_talk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: PLACEHOLDER_EMAIL,
                message: text,
                thread_title: currentThreadTitle ?? null
            })
        });

        typingEl.remove();

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            appendErrorNotice(`Server error ${res.status}: ${err.detail || res.statusText}`);
        } else {
            const data = await res.json();
            appendBubble('ai', data.reply);

            // First message in this thread — register it in the sidebar
            if (!currentThreadTitle && data.thread_title) {
                currentThreadTitle = data.thread_title;
                addThreadToSidebar(data.thread_title);
            }
        }
    } catch (err) {
        typingEl.remove();
        appendErrorNotice('Could not reach the backend. Make sure the FastAPI server is running on port 8000.');
    }

    setWaiting(false);
    scrollToBottom();
}

// Called by suggestion chip buttons
function sendSuggestion(btn) {
    sendMessage(btn.textContent.trim());
}

// ---- NEW CHAT ----
function newChat() {
    currentThreadTitle = null;

    const messages = getChatEl('chatMessages');
    if (!messages) return;

    messages.innerHTML = buildWelcomeHTML();

    // Deactivate all thread items
    document.querySelectorAll('.thread-item').forEach(t => t.classList.remove('active'));
}

// ---- THREAD SIDEBAR ----
function addThreadToSidebar(title) {
    const list = getChatEl('threadList');
    if (!list) return;

    // Mark all existing as inactive
    list.querySelectorAll('.thread-item').forEach(t => t.classList.remove('active'));

    const btn = document.createElement('button');
    btn.className = 'thread-item active';
    btn.title = title;
    btn.innerHTML = `<i class="fa-regular fa-message"></i> ${escapeHTML(title)}`;
    btn.addEventListener('click', () => selectThread(title, btn));
    list.prepend(btn);
}

function selectThread(title, el) {
    document.querySelectorAll('.thread-item').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    currentThreadTitle = title;
    // Note: without a GET /chat_threads endpoint, we can't reload history yet.
    // A notice is shown so the user knows.
    const messages = getChatEl('chatMessages');
    if (messages) {
        messages.innerHTML = `
            <div class="chat-notice">
                📂 Continuing thread: <strong>${escapeHTML(title)}</strong> — 
                History reload requires a backend endpoint (coming soon).
                Just keep typing to continue the conversation.
            </div>`;
    }
}

// ---- BUBBLE RENDERING ----
function appendBubble(role, text) {
    const messages = getChatEl('chatMessages');
    if (!messages) return;

    const row = document.createElement('div');
    row.className = `message-row ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'ai' ? '🎓' : '👤';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = parseMarkdown(text);

    if (role === 'ai') {
        row.appendChild(avatar);
        row.appendChild(bubble);
    } else {
        row.appendChild(bubble);
        row.appendChild(avatar);
    }

    messages.appendChild(row);
    scrollToBottom();
}

function appendErrorNotice(msg) {
    const messages = getChatEl('chatMessages');
    if (!messages) return;
    const notice = document.createElement('div');
    notice.className = 'chat-notice';
    notice.style.borderColor = 'rgba(239,68,68,0.4)';
    notice.style.color = '#f87171';
    notice.innerHTML = `⚠️ ${escapeHTML(msg)}`;
    messages.appendChild(notice);
    scrollToBottom();
}

// ---- TYPING INDICATOR ----
function showTyping() {
    const messages = getChatEl('chatMessages');
    if (!messages) return document.createElement('div');

    const row = document.createElement('div');
    row.className = 'message-row ai';
    row.innerHTML = `
        <div class="message-avatar">🎓</div>
        <div class="message-bubble typing-indicator">
            <span></span><span></span><span></span>
        </div>`;
    messages.appendChild(row);
    scrollToBottom();
    return row;
}

// ---- UTILITIES ----
function setWaiting(state) {
    isWaiting = state;
    const btn = getChatEl('chatSendBtn');
    if (btn) btn.disabled = state;
}

function scrollToBottom() {
    const el = getChatEl('chatMessages');
    if (el) el.scrollTop = el.scrollHeight;
}

function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---- SIMPLE MARKDOWN PARSER ----
function parseMarkdown(raw) {
    let text = escapeHTML(raw);         // safety-first; then selectively un-escape for markdown

    // Code blocks (must come before inline code)
    text = text.replace(/```([^`]*?)```/gs, (_, code) =>
        `<pre><code>${code.trim()}</code></pre>`
    );
    // Inline code
    text = text.replace(/`([^`]+?)`/g, '<code>$1</code>');
    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // H3
    text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    // H2
    text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    // H1
    text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    // Unordered list items
    text = text.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
    // Wrap consecutive <li> in <ul>
    text = text.replace(/(<li>[\s\S]*?<\/li>)(\s*(?!<li>))/g, '<ul>$1</ul>$2');
    // Newlines to <br> (but not inside block elements)
    text = text.replace(/(?<!>)\n(?!<)/g, '<br>');

    return text;
}

// ---- WELCOME HTML (reused by newChat) ----
function buildWelcomeHTML() {
    return `
        <div class="chat-welcome" id="chatWelcome">
            <div class="welcome-icon">🎓</div>
            <h2>AI Career Counselor</h2>
            <p>Ask me anything about your career path, skill roadmaps, job market trends, or internship opportunities.</p>
            <div class="suggestion-chips">
                <button class="chip" onclick="sendSuggestion(this)">What skills should I learn next?</button>
                <button class="chip" onclick="sendSuggestion(this)">Help me plan my career roadmap</button>
                <button class="chip" onclick="sendSuggestion(this)">What internships suit my profile?</button>
                <button class="chip" onclick="sendSuggestion(this)">Review my current skill set</button>
            </div>
        </div>`;
}
