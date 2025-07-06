// Content script for Google Docs typing simulation

let typingState = {
  isTyping: false,
  isPaused: false,
  text: '',
  currentIndex: 0,
  wpm: 60,
  timeoutId: null
};

// Find the Google Docs editor
function findGoogleDocsEditor() {
  // Try multiple selectors for Google Docs editor
  const selectors = [
    '[contenteditable="true"][role="textbox"]',
    '.kix-appview-editor',
    '[data-params*="editor"]',
    '[aria-label*="document"]'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
  }
  
  // Fallback: look for any contenteditable element that might be the editor
  const contentEditables = document.querySelectorAll('[contenteditable="true"]');
  for (const element of contentEditables) {
    if (element.offsetWidth > 100 && element.offsetHeight > 100) {
      return element;
    }
  }
  
  return null;
}

// Calculate delay between characters based on WPM
function calculateDelay(wpm) {
  // Average word length is ~5 characters
  // WPM = words per minute, so we need to convert to characters per second
  const charsPerSecond = (wpm * 5) / 60;
  const delayMs = 1000 / charsPerSecond;
  
  // Add some randomness (±20%) for more realistic typing
  const variation = 0.8 + (Math.random() * 0.4);
  return delayMs * variation;
}

// Focus and position cursor in the editor
function focusEditor(editor) {
  editor.focus();
  
  // Try to position cursor at the end
  const range = document.createRange();
  const selection = window.getSelection();
  
  if (editor.childNodes.length > 0) {
    const lastNode = editor.childNodes[editor.childNodes.length - 1];
    if (lastNode.nodeType === Node.TEXT_NODE) {
      range.setStart(lastNode, lastNode.textContent.length);
      range.setEnd(lastNode, lastNode.textContent.length);
    } else {
      range.setStartAfter(lastNode);
      range.setEndAfter(lastNode);
    }
  } else {
    range.setStart(editor, 0);
    range.setEnd(editor, 0);
  }
  
  selection.removeAllRanges();
  selection.addRange(range);
}

// Type a single character
function typeCharacter(editor, char) {
  // Create a keyboard event to simulate typing
  const keyEvent = new KeyboardEvent('keydown', {
    key: char,
    code: `Key${char.toUpperCase()}`,
    bubbles: true,
    cancelable: true
  });
  
  // Also dispatch a keypress event
  const keyPressEvent = new KeyboardEvent('keypress', {
    key: char,
    code: `Key${char.toUpperCase()}`,
    bubbles: true,
    cancelable: true
  });
  
  editor.dispatchEvent(keyEvent);
  editor.dispatchEvent(keyPressEvent);
  
  // Insert the character
  document.execCommand('insertText', false, char);
}

// Main typing function
function typeNextCharacter() {
  if (!typingState.isTyping || typingState.isPaused) {
    return;
  }
  
  if (typingState.currentIndex >= typingState.text.length) {
    // Finished typing
    typingState.isTyping = false;
    typingState.currentIndex = 0;
    return;
  }
  
  const editor = findGoogleDocsEditor();
  if (!editor) {
    console.error('Could not find Google Docs editor');
    return;
  }
  
  const char = typingState.text[typingState.currentIndex];
  typeCharacter(editor, char);
  typingState.currentIndex++;
  
  // Schedule next character
  const delay = calculateDelay(typingState.wpm);
  typingState.timeoutId = setTimeout(typeNextCharacter, delay);
}

// Start typing
function startTyping(text, wpm) {
  const editor = findGoogleDocsEditor();
  if (!editor) {
    return { error: 'Could not find Google Docs editor. Please make sure you are on a Google Docs page.' };
  }
  
  // Stop any existing typing
  stopTyping();
  
  // Initialize typing state
  typingState = {
    isTyping: true,
    isPaused: false,
    text: text,
    currentIndex: 0,
    wpm: wpm,
    timeoutId: null
  };
  
  // Focus the editor
  focusEditor(editor);
  
  // Start typing
  typeNextCharacter();
  
  return { success: true };
}

// Pause typing
function pauseTyping() {
  if (typingState.isTyping && !typingState.isPaused) {
    typingState.isPaused = true;
    if (typingState.timeoutId) {
      clearTimeout(typingState.timeoutId);
      typingState.timeoutId = null;
    }
  }
}

// Resume typing
function resumeTyping() {
  if (typingState.isTyping && typingState.isPaused) {
    typingState.isPaused = false;
    typeNextCharacter();
  }
}

// Stop typing
function stopTyping() {
  if (typingState.timeoutId) {
    clearTimeout(typingState.timeoutId);
  }
  typingState = {
    isTyping: false,
    isPaused: false,
    text: '',
    currentIndex: 0,
    wpm: 60,
    timeoutId: null
  };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  switch (request.action) {
    case 'start':
      const result = startTyping(request.text, request.wpm);
      sendResponse(result);
      break;
      
    case 'pause':
      pauseTyping();
      sendResponse({ success: true });
      break;
      
    case 'resume':
      resumeTyping();
      sendResponse({ success: true });
      break;
      
    case 'stop':
      stopTyping();
      sendResponse({ success: true });
      break;
      
    case 'status':
      sendResponse({ isTyping: typingState.isTyping });
      break;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
  
  return true; // Keep message channel open for async response
});

console.log('Character-by-Character Text Input content script loaded'); 