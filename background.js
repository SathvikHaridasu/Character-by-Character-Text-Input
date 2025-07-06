// Background script for debugging and content script injection

console.log('Background script loaded');

// Listen for tab updates to ensure content script is injected
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && 
      tab.url && 
      tab.url.startsWith('https://docs.google.com/document/')) {
    console.log('Google Docs page loaded, injecting content script...');
    
    // Always try to inject the content script
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js'],
      world: 'MAIN'
    }).then(() => {
      console.log('Content script injected successfully');
      
      // Wait a moment then test the connection
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, {action: 'ping'}, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Content script not responding after injection:', chrome.runtime.lastError);
          } else {
            console.log('Content script is responding correctly');
          }
        });
      }, 1000);
    }).catch((error) => {
      console.error('Failed to inject content script:', error);
    });
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background script received message:', request);
  sendResponse({ received: true });
}); 