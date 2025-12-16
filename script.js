document.addEventListener('DOMContentLoaded', async () => {
    // chrome
    const chrome = window.chrome

    // theme
    const savedTheme = localStorage.getItem('theme');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

    // input
    const tokenInput = document.getElementById('token');
    const secretInput = document.getElementById('secret');
    // const secretInput = document.querySelector('.secret-input');

    // buttons 
    const autoNetworkBtn = document.getElementById("auto-network-btn");
    const refreshNetworkBtn = document.getElementById("refresh-network");
    const decodeBtn = document.getElementById('decode');
    const decodeCopyBtn = document.getElementById('decode-copy');
    const copyHeaderBtn = document.getElementById('copy-header');
    const copyPayloadBtn = document.getElementById('payload'); 
    const copyAllBtn = document.getElementById('copy-all');
    const clearBtn = document.getElementById('clear');
    const verifyBtn = document.getElementById('verify');

    // other
    const networkSidebar = document.getElementById("network-sidebar");
    const networkList = document.getElementById("network-list");
    const resultSection = document.getElementById('result-section');
    const headerPre = document.getElementById('header');
    const payloadPre = document.getElementById('payload');
    const encodingSelect = document.querySelector('.custom-select');

    // auto-save token and secret input on every change
    [tokenInput, secretInput].forEach(input => {
        if (input) {
            input.addEventListener('input', saveAllData);
        }
    });

    // networks jwt catch
    autoNetworkBtn.addEventListener("click", async () => {
        networkSidebar.classList.toggle("open")
        autoNetworkBtn.classList.toggle("active")

        let isSidebarOpen = networkSidebar.classList.contains("open");
        
        if (isSidebarOpen) {
            fetchNetworkRequests()
        }
            
        await chrome.storage.local.set({
            jwtNetworkSidebar: isSidebarOpen
        });
    })

    refreshNetworkBtn.addEventListener("click", fetchNetworkRequests)

    function fetchNetworkRequests() {
        networkList.innerHTML =
            '<div style="padding: 10px; text-align: center; color: var(--text-secondary); font-size: 12px;">Scanning...</div>'

        if (chrome && chrome.devtools && chrome.devtools.network) {
            chrome.devtools.network.getHAR((harLog) => {
                if (!harLog || !harLog.entries) {
                    console.warn('No HAR log entries found');
                    networkList.innerHTML =
                        '<div style="padding: 10px; text-align: center; color: var(--text-secondary); font-size: 12px;">No network data available</div>'
                    return;
                }

                const entries = harLog.entries.filter((entry) => {
                    if (!entry || !entry.request || !entry.request.headers) {
                        return false;
                    }
                    const authHeader = entry.request.headers.find((h) => 
                        h.name.toLowerCase() === "authorization"
                    )
                    return authHeader && authHeader.value.includes("Bearer")
                })

                renderNetworkListFromHAR(entries)
            })
        } else {
            console.info("DevTools network API not available")
            // Using data from locale storage
            chrome.storage.local.get(['jwtNetworkRequests'], (result) => {
                const requests = result.jwtNetworkRequests || []
                renderNetworkListFromStorage(requests)
            })
        }
    }

    // Checking changes in local storage
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === "local" && changes.jwtNetworkRequests && networkSidebar.classList.contains("open")) {
            const requests = changes.jwtNetworkRequests.newValue || []
            renderNetworkListFromStorage(requests)
        }
    })

    // Rendering data 
    function renderNetworkListFromHAR(entries) {
        networkList.innerHTML = ""

        if (entries.length === 0) {
            networkList.innerHTML =
                '<div style="padding: 10px; text-align: center; color: var(--text-secondary); font-size: 12px;">No requests with JWT found ...</div>'
            return
        }

        entries.forEach((entry) => {
            if (!entry.request || !entry.request.url) {
                console.warn('Invalid HAR entry:', entry);
                return;
            }

            const div = document.createElement("div")
            div.className = "network-item"

            try {
                const url = new URL(entry.request.url);
                const methodClass = `method-${entry.request.method || 'GET'}`;

                div.innerHTML = `
                    <div style="display: flex; align-items: center;">
                        <span class="network-method ${methodClass}">${entry.request.method || 'GET'}</span>
                        <span class="network-url">${url.pathname}</span>
                    </div>
                    <div style="font-size: 10px; color: var(--text-secondary); margin-top: 4px;">${url.hostname}</div>
                `

                div.addEventListener("click", () => {
                    const authHeader = entry.request.headers.find((h) => 
                        h.name.toLowerCase() === "authorization"
                    )
                    if (authHeader) {
                        const token = authHeader.value.replace("Bearer ", "")
                        tokenInput.value = token
                        decodeBtn.click()
                    }
                })

                networkList.appendChild(div)
            } catch (error) {
                console.info('Error parsing URL:', entry.request.url, error);
                const fallbackDiv = document.createElement("div")
                fallbackDiv.className = "network-item"
                fallbackDiv.innerHTML = `
                    <div style="display: flex; align-items: center;">
                        <span class="network-method method-GET">${entry.request.method || 'GET'}</span>
                        <span class="network-url" title="${entry.request.url}">Invalid URL</span>
                    </div>
                    <div style="font-size: 10px; color: var(--text-secondary); margin-top: 4px;">${entry.request.url.substring(0, 50)}...</div>
                `
                networkList.appendChild(fallbackDiv)
            }
        })
    }

    function renderNetworkListFromStorage(requests) {
        networkList.innerHTML = ""

        if (requests.length === 0) {
            networkList.innerHTML =
                '<div style="padding: 10px; text-align: center; color: var(--text-secondary); font-size: 12px;">No requests with JWT found ...</div>'
            return
        }

        requests.forEach((req) => {
            if (!req || !req.url) {
                console.warn('Invalid storage entry:', req);
                return;
            }

            const item = document.createElement("div")
            item.className = "network-item"
            
            try {
                const time = req.timestamp ? new Date(req.timestamp).toLocaleTimeString() : 'Unknown time';
                const url = new URL(req.url);
                
                item.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <span class="method">${req.method || 'GET'}</span>
                        <span style="font-size:10px; color:var(--text-secondary);">${time}</span>
                    </div>
                    <div class="url" title="${req.url}">${url.pathname}</div>
                `

                item.addEventListener("click", () => {
                    tokenInput.value = req.token
                    decodeBtn.click()
                    document.querySelectorAll(".network-item").forEach((i) => 
                        i.style.borderColor = "var(--border)"
                    )
                    item.style.borderColor = "var(--accent)"
                })

                networkList.appendChild(item)
            } catch (error) {
                console.info('Error processing storage request:', req, error);
                const fallbackItem = document.createElement("div")
                fallbackItem.className = "network-item"
                fallbackItem.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <span class="method">${req.method || 'GET'}</span>
                        <span style="font-size:10px; color:var(--text-secondary);">Storage</span>
                    </div>
                    <div class="url" title="${req.url}">${req.url.substring(0, 50)}...</div>
                `
                networkList.appendChild(fallbackItem)
            }
        })
    }

    async function saveAllData() {
        const token = tokenInput.value.trim();
        const secret = secretInput.value.trim();
    
        try {
            const saveData = {};
            
            if (token) {
                const decoded = decodeJWT(token);
                saveData.jwtToken = token;
                
                if (headerPre.textContent.trim() !== '' || payloadPre.textContent.trim() !== '') {
                    saveData.jwtDecodedHeader = decoded.header;
                    saveData.jwtDecodedPayload = decoded.payload;
                }
            }
            
            if (secret) {
                saveData.jwtSecret = secret;
            }
            
            await chrome.storage.local.set(saveData);

        } catch (error) {
            console.info('Error while saving all data to local storage', error);
        }
    }

    async function loadAllData() {
        try {
            const result = await chrome.storage.local.get(
                [
                    'jwtToken', 
                    'jwtSecret', 
                    'jwtDecodedHeader', 
                    'jwtDecodedPayload',
                    'jwtNetworkSidebar',
                    'jwtNetworkRequests',
                ]
            );
            return result;

        } catch (error) {
            console.info('error while loading data from storage:', error);
            return {};
        }
    }
    loadAllData().then(savedData => {            
        if (savedData.jwtToken) {
            tokenInput.value = savedData.jwtToken;
        }
        
        if (savedData.jwtSecret) {
            secretInput.value = savedData.jwtSecret;
        }
        
        if (savedData.jwtDecodedHeader && savedData.jwtDecodedPayload) {
            headerPre.innerHTML = formatJSON(savedData.jwtDecodedHeader);
            payloadPre.innerHTML = formatJSON(savedData.jwtDecodedPayload);
            resultSection.classList.remove('hidden');
        }
        
        if (savedData.jwtNetworkSidebar == true) {
            networkSidebar.classList.add("open")
            autoNetworkBtn.classList.add("active")
            fetchNetworkRequests()
        } else {
            networkSidebar.classList.remove("open")
            autoNetworkBtn.classList.remove("active")
        }

    });
    
    // Set base interface theme
    if (savedTheme === 'light' || (!savedTheme && !prefersDarkScheme.matches)) {
        document.body.classList.add('light-mode');
        updateIcon(false);
    } else {
        document.body.classList.remove('light-mode');
        updateIcon(true);
    }

    themeToggle.addEventListener('click', function() {
        const isLightMode = document.body.classList.toggle('light-mode');
        
        if (isLightMode) {
            localStorage.setItem('theme', 'light');
        } else {
            localStorage.setItem('theme', 'dark');
        }
        
        updateIcon(!isLightMode);
    });

    // Set resultSection hidden
    resultSection.classList.add('hidden');

   
    // Decode and display token
    decodeBtn.addEventListener('click', function() {
        const token = tokenInput.value.trim();
        
        if (!token) {
            showStatus('Please enter a JWT token', false);
            return;
        }

        try {
            const decoded = decodeJWT(token);
            
            headerPre.innerHTML = formatJSON(decoded.header);
            payloadPre.innerHTML = formatJSON(decoded.payload);
            resultSection.classList.remove('hidden');

            saveAllData();
            showStatus('Token decoded successfully');
        } catch (error) {
            showStatus(error.message, false);
        }
    });

    // Decode and copy without displaying
    decodeCopyBtn.addEventListener('click', function() {
        const token = tokenInput.value.trim();
        
        if (!token) {
            showStatus('Please enter a JWT token', false);
            return;
        }

        try {
            const decoded = decodeJWT(token);
            const result = {
                header: decoded.header,
                payload: decoded.payload
            };
            
            copyToClipboard(JSON.stringify(result, null, 2));
            saveAllData();
            showStatus('Decoded and copied to clipboard!');
        } catch (error) {
            showStatus(error.message, false);
        }
    });

    // Copy all decoded data
    copyAllBtn.addEventListener('click', function() {
        const headerText = headerPre.textContent;
        const payloadText = payloadPre.textContent;
        
        if (!headerText || !payloadText) {
            showStatus('No data to copy', false);
            return;
        }

        const result = {
            header: JSON.parse(headerText),
            payload: JSON.parse(payloadText)
        };
        
        copyToClipboard(JSON.stringify(result, null, 2));
    });

    // Copy header only
    copyHeaderBtn.addEventListener('click', function() {
        const headerText = headerPre.textContent;
        
        if (!headerText) {
            showStatus('No header data to copy', false);
            return;
        }

        copyToClipboard(headerText);
    });

    // Copy payload only
    copyPayloadBtn.addEventListener('click', function() {
        const payloadText = payloadPre.textContent;
        
        if (!payloadText) {
            showStatus('No payload data to copy', false);
            return;
        }

        copyToClipboard(payloadText);
    });

    // Clear all inputs and results
    clearBtn.addEventListener('click', function() {
        tokenInput.value = '';
        secretInput.value = '';        
        headerPre.textContent = '';
        payloadPre.textContent = '';
        resultSection.classList.add('hidden');
        statusMessage.className = 'status-message';

        chrome.storage.local.remove(
            [
                'jwtToken', 
                'jwtSecret', 
                'jwtDecodedHeader', 
                'jwtDecodedPayload',
                'jwtNetworkSidebar',
                'jwtNetworkRequests',
            ]
        );
    });

    async function checkJWTSignature(secret) {
        try {
            const token = tokenInput.value.trim();
            
            if (!token) {
                showStatus('Please enter a JWT token first', false);
                return;
            }

            const parts = token.split('.');
            if (parts.length !== 3) {
                showStatus('Invalid JWT format: must have 3 parts', false);
                return;
            }

            const [headerB64, payloadB64, signatureB64] = parts;
            const header = JSON.parse(atob(headerB64));
            const algorithm = header.alg || 'HS256';
            
            const supportedAlgorithms = ['HS256', 'HS384', 'HS512'];
            if (!supportedAlgorithms.includes(algorithm)) {
                showStatus(`Unsupported algorithm: ${algorithm}. Supported: ${supportedAlgorithms.join(', ')}`, false);
                return;
            }

            console.log('Verifying signature with:', {
                algorithm,
                encoding: encodingSelect.value,
                secretType: typeof secret
            });

            showStatus('Verifying signature...', true);
         
            const isValid = await validateSignature(headerB64, payloadB64, signatureB64, secret, algorithm);
            if (isValid) {
                showStatus('✓ Signature is valid!', true);
            } else {
                showStatus('✗ Invalid signature!', false);
            }
            
        } catch (error) {
            console.info('Signature verification error:', error);
            showStatus('Error verifying signature: ' + error.message, false);
        }
    }

    async function validateSignature(headerB64, payloadB64, signatureB64, secret, algorithm) {
        const data = `${headerB64}.${payloadB64}`;
        
        let hashAlgorithm;
        switch (algorithm) {
            case 'HS256':
                hashAlgorithm = 'SHA-256';
                break;
            case 'HS384':
                hashAlgorithm = 'SHA-384';
                break;
            case 'HS512':
                hashAlgorithm = 'SHA-512';
                break;
            default:
                throw new Error(`Unsupported algorithm: ${algorithm}`);
        }
        
        try {
            const generatedSignature = await generateHMACSignature(data, secret, hashAlgorithm);
            const receivedSignature = base64UrlDecode(signatureB64);
            
            return compareSignatures(generatedSignature, receivedSignature);
            
        } catch (error) {
            console.info('HMAC validation error:', error);
            return false;
        }
    }

    async function generateHMACSignature(data, secret, hashAlgorithm) {
        let keyData;

        if (secret instanceof Uint8Array) {
            // Base64 decoded secret
            keyData = secret.buffer;
        } else if (typeof secret === 'string') {
            // UTF-8 secret
            const encoder = new TextEncoder();
            keyData = encoder.encode(secret).buffer;
        } else {
            throw new Error('Unsupported secret format');
        }
        
        const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            {
                name: 'HMAC',
                hash: { name: hashAlgorithm }
            },
            false,
            ['sign']
        );
        
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const signature = await crypto.subtle.sign('HMAC', key, dataBuffer);
        
        return new Uint8Array(signature);
    }

    verifyBtn.addEventListener('click', function() {
        const secret = secretInput.value.trim();
        const encoding = encodingSelect.value;

        if (!secret) {
            showStatus('Please enter a secret key', false);
            return;
        }

        try {
            const processedSecret = processSecret(secret, encoding);
            checkJWTSignature(processedSecret);
        } catch (error) {
            showStatus('Error processing secret: ' + error.message, false);
        }
    });
});
