// Helpers ...

const statusMessage = document.getElementById('status-message');
const themeToggle = document.getElementById('theme-toggle');

function updateIcon(isDarkMode) {
    const icon = themeToggle.querySelector('svg');
    if (isDarkMode) {
        const svgNS = "http://www.w3.org/2000/svg";
        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("d", "M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z");

icon.innerHTML = '';
icon.appendChild(path);
    } else {
        icon.innerHTML = `<path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"/>`;
    }
}

function decodeJWT(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid JWT token format');
        }

        const header = JSON.parse(atob(parts[0]));
        const payload = JSON.parse(atob(parts[1]));

        return { header, payload };
    } catch (error) {
        throw new Error('Failed to decode JWT token: ' + error.message);
    }
}

function formatJSON(obj) {
    const jsonString = JSON.stringify(obj, null, 2);
    return jsonString
        .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)/g, function(match) {
            let cls = 'json-number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'json-key';
                } else {
                    cls = 'json-string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'json-boolean';
            } else if (/null/.test(match)) {
                cls = 'json-null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
}

function showStatus(message, isSuccess = true) {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message ' + (isSuccess ? 'status-success' : 'status-error');
    
    setTimeout(() => {statusMessage.className = 'status-message';}, 3000);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => {
            showStatus('Copied to clipboard!');
        })
        .catch(err => {
            console.info('Failed to copy: ', err);
            showStatus('Failed to copy to clipboard', false);
        });
}

function processSecret(secret, encoding) {
    switch (encoding) {
        case 'utf-8':
            return secret;
        case 'base64':
            return base64ToBytes(secret);
        default:
            return secret;
    }
}

function base64ToBytes(base64) {
    try {
        const cleanBase64 = base64.replace(/\s/g, '');
        const binaryString = atob(cleanBase64);
        const bytes = new Uint8Array(binaryString.length);
        
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;

    } catch (error) {
        throw new Error('Invalid Base64 format');
    }
}

function base64UrlDecode(base64Url) {
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
        base64 += '=';
    }
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function compareSignatures(sig1, sig2) {
    if (sig1.length !== sig2.length) {
        return false;
    }
    
    let result = 0;
    for (let i = 0; i < sig1.length; i++) {
        result |= sig1[i] ^ sig2[i];
    }
    
    return result === 0;
}
