// Background script for debugging and content script injection

console.log('Background script loaded');

// Listen for tab updates to ensure content script is injected
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && 
      tab.url && 
      tab.url.startsWith('https://docs.google.com/document/')) {
    console.log('Google Docs page loaded, checking if content script is needed');
    
    // First check if content script is already injected
    chrome.tabs.sendMessage(tabId, {action: 'ping'}, (response) => {
      if (chrome.runtime.lastError) {
        // Content script not present, inject it
        console.log('Content script not found, injecting...');
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        }).then(() => {
          console.log('Content script injected successfully');
        }).catch((error) => {
          console.error('Failed to inject content script:', error);
        });
      } else {
        console.log('Content script already present, skipping injection');
      }
    });
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background script received message:', request);
  sendResponse({ received: true });
}); 