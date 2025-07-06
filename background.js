// Background script for debugging and content script injection

console.log('Background script loaded');

// Listen for tab updates to ensure content script is injected
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && 
      tab.url && 
      tab.url.startsWith('https://docs.google.com/document/')) {
    console.log('Google Docs page loaded, ensuring content script is injected');
    
    // Inject content script if not already present
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }).then(() => {
      console.log('Content script injected successfully');
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