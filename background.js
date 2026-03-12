let networkRequests = []

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    const headers = details.requestHeaders || []
    const authHeader = headers.find(
      (h) => h.name.toLowerCase() === "authorization" && h.value && (h.value.startsWith("Bearer ") || isJWT(h.value)),
    )

    if (authHeader) {
      const token = authHeader.value.replace("Bearer ", "").trim()

      if (isJWT(token)) {
        const request = {
          id: details.requestId,
          url: details.url,
          method: details.method,
          token: token,
          timestamp: Date.now(),
        }

        // Keep only last 50 requests
        networkRequests.unshift(request)
        if (networkRequests.length > 50) {
          networkRequests.pop()
        }

        chrome.storage.local.set({ jwtNetworkRequests: networkRequests })
      }
    }
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders"],
)

// Internal helpers ...
function isJWT(str) {
  if (!str || typeof str !== "string") return false
  const parts = str.split(".")
  return parts.length === 3 && parts.every((part) => part.length > 0)
}

// Clean up old requests periodically (older than 5 minutes), runing every minute
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
  networkRequests = networkRequests.filter((req) => req.timestamp > fiveMinutesAgo)
  chrome.storage.local.set({ jwtNetworkRequests: networkRequests })
  .catch(err => console.info('Failed to save network requests:', err))
}, 60000)

// background.js (service worker)
chrome.runtime.onInstalled.addListener((details) => {
  chrome.runtime.setUninstallURL(
    "https://docs.google.com/forms/d/e/1FAIpQLSfEzx8aosk6VL3v4wQRQmM4TOOyi6NKlCBob3xN2exlvWoNFQ/viewform"
  );

  if (details.reason === "install") {
    chrome.tabs.create({
      url: "https://jwttokendecode.soft-core.dev/extension"
    });
  }
});
