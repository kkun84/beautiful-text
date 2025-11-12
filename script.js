// Editor element
const editor = document.getElementById('editor');

// Load text from URL hash on page load
function loadFromURL() {
    const hash = window.location.hash.substring(1);
    if (hash) {
        try {
            const text = decodeURIComponent(hash);
            editor.innerText = text;
            processText();
        } catch (e) {
            console.error('Failed to decode URL:', e);
        }
    }
}

// Save text to URL hash
function saveToURL() {
    const text = editor.innerText;
    const encoded = encodeURIComponent(text);
    window.location.hash = encoded;
}

// Check if text matches markdown criteria
function isMarkdown(text) {
    const lines = text.split('\n');
    
    // Need at least 3 lines
    if (lines.length < 3) {
        return false;
    }
    
    // Line 1 must start with "# "
    if (!lines[0].startsWith('# ')) {
        return false;
    }
    
    // Line 2 must be empty
    if (lines[1].trim() !== '') {
        return false;
    }
    
    // Line 3 must not be empty
    if (lines[2].trim() === '') {
        return false;
    }
    
    return true;
}

// Render text with markdown styling while preserving symbols
function renderMarkdown(text) {
    const lines = text.split('\n');
    let html = '';
    let inCodeBlock = false;
    let codeBlockContent = '';
    let codeBlockLang = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Code block handling
        if (line.startsWith('```')) {
            if (!inCodeBlock) {
                // Start code block
                inCodeBlock = true;
                codeBlockLang = line.substring(3).trim();
                codeBlockContent = line + '\n';
            } else {
                // End code block
                codeBlockContent += line;
                html += `<div class="code-block">${escapeHtml(codeBlockContent)}</div>`;
                inCodeBlock = false;
                codeBlockContent = '';
                codeBlockLang = '';
            }
            continue;
        }
        
        if (inCodeBlock) {
            codeBlockContent += line + '\n';
            continue;
        }
        
        // Empty line
        if (line.trim() === '') {
            html += '<br>';
            continue;
        }
        
        // Headings
        if (line.startsWith('# ')) {
            html += `<div class="h1">${processInline(line)}</div>`;
        } else if (line.startsWith('## ')) {
            html += `<div class="h2">${processInline(line)}</div>`;
        } else if (line.startsWith('### ')) {
            html += `<div class="h3">${processInline(line)}</div>`;
        } else if (line.startsWith('#### ')) {
            html += `<div class="h4">${processInline(line)}</div>`;
        } else if (line.startsWith('##### ')) {
            html += `<div class="h5">${processInline(line)}</div>`;
        } else if (line.startsWith('###### ')) {
            html += `<div class="h6">${processInline(line)}</div>`;
        }
        // Blockquote
        else if (line.startsWith('> ')) {
            html += `<div class="blockquote">${processInline(line)}</div>`;
        }
        // Unordered list
        else if (line.match(/^[\*\-\+] /)) {
            html += `<div class="list-item">${processInline(line)}</div>`;
        }
        // Ordered list
        else if (line.match(/^\d+\. /)) {
            html += `<div class="ordered-list-item">${processInline(line)}</div>`;
        }
        // Horizontal rule
        else if (line.match(/^(\*\*\*|---|___)$/)) {
            html += `<div class="hr"></div>`;
        }
        // Regular paragraph
        else {
            html += `<div class="paragraph">${processInline(line)}</div>`;
        }
    }
    
    // Handle unclosed code block
    if (inCodeBlock) {
        html += `<div class="code-block">${escapeHtml(codeBlockContent)}</div>`;
    }
    
    return html;
}

// Process inline markdown (links, bold, italic, code) while preserving symbols
function processInline(text) {
    let result = escapeHtml(text);
    
    // Links: [text](url) -> render as actual clickable link (this is the exception where we hide the syntax)
    result = result.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, (match, linkText, url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${escapeHtml(linkText)}</a>`;
    });
    
    return result;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Process text and render appropriately
function processText() {
    const text = editor.innerText;
    
    if (isMarkdown(text)) {
        // Enable markdown styling
        editor.classList.add('markdown');
        
        // Save cursor position
        const selection = window.getSelection();
        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        let cursorOffset = 0;
        
        if (range) {
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(editor);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            cursorOffset = preCaretRange.toString().length;
        }
        
        // Render markdown
        const rendered = renderMarkdown(text);
        editor.innerHTML = rendered;
        
        // Restore cursor position
        restoreCursor(cursorOffset);
    } else {
        // Plain text mode
        editor.classList.remove('markdown');
        // Keep as plain text (already in textContent)
    }
    
    // Update URL
    saveToURL();
}

// Restore cursor position after rendering
function restoreCursor(offset) {
    const selection = window.getSelection();
    const range = document.createRange();
    
    try {
        let charCount = 0;
        let found = false;
        
        function searchNode(node) {
            if (found) return;
            
            if (node.nodeType === Node.TEXT_NODE) {
                const textLength = node.textContent.length;
                if (charCount + textLength >= offset) {
                    range.setStart(node, offset - charCount);
                    range.collapse(true);
                    found = true;
                    return;
                }
                charCount += textLength;
            } else {
                for (let i = 0; i < node.childNodes.length; i++) {
                    searchNode(node.childNodes[i]);
                    if (found) return;
                }
            }
        }
        
        searchNode(editor);
        
        if (found) {
            selection.removeAllRanges();
            selection.addRange(range);
        }
    } catch (e) {
        // If cursor restoration fails, just place it at the end
        console.error('Failed to restore cursor:', e);
    }
}

// Debounce function to avoid too frequent updates
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Handle input with debouncing
const debouncedProcess = debounce(processText, 300);

editor.addEventListener('input', () => {
    debouncedProcess();
});

// Handle paste - keep as plain text
editor.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
});

// Initialize
loadFromURL();

// Handle hash changes (back/forward navigation)
window.addEventListener('hashchange', () => {
    loadFromURL();
});
