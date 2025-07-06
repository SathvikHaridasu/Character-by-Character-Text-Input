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
  console.log('Searching for Google Docs editor...');
  
  // Try multiple selectors for Google Docs editor
  const selectors = [
    '[contenteditable="true"][role="textbox"]',
    '.kix-appview-editor',
    '[data-params*="editor"]',
    '[aria-label*="document"]',
    '[contenteditable="true"]',
    '.kix-lineview-content',
    '[role="textbox"]',
    '.kix-page-content-wrapper',
    '.kix-appview-editor-content'
  ];
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    console.log(`Selector "${selector}" found ${elements.length} elements`);
    for (const element of elements) {
      console.log('Found element:', element);
      if (element.offsetWidth > 100 && element.offsetHeight > 100) {
        console.log('Selected editor element:', element);
        return element;
      }
    }
  }
  
  // Fallback: look for any contenteditable element that might be the editor
  const contentEditables = document.querySelectorAll('[contenteditable="true"]');
  console.log(`Found ${contentEditables.length} contenteditable elements`);
  for (const element of contentEditables) {
    console.log('Contenteditable element:', element, 'size:', element.offsetWidth, 'x', element.offsetHeight);
    if (element.offsetWidth > 100 && element.offsetHeight > 100) {
      console.log('Selected fallback editor element:', element);
      return element;
    }
  }
  
  // Last resort: try to find the main document area
  const docArea = document.querySelector('.kix-appview-editor');
  if (docArea) {
    console.log('Found main document area:', docArea);
    return docArea;
  }
  
  console.log('No suitable editor found');
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
  console.log('Attempting to type character:', char);
  
  try {
    // Focus the editor first
    editor.focus();
    
    // Create a more comprehensive keyboard event simulation
    const keyCode = char.charCodeAt(0);
    
    // Keydown event
    const keydownEvent = new KeyboardEvent('keydown', {
      key: char,
      code: char.length === 1 ? `Key${char.toUpperCase()}` : 'Key' + char,
      keyCode: keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true,
      composed: true,
      isTrusted: false
    });
    
    // Keypress event
    const keypressEvent = new KeyboardEvent('keypress', {
      key: char,
      code: char.length === 1 ? `Key${char.toUpperCase()}` : 'Key' + char,
      keyCode: keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true,
      composed: true,
      isTrusted: false
    });
    
    // Keyup event
    const keyupEvent = new KeyboardEvent('keyup', {
      key: char,
      code: char.length === 1 ? `Key${char.toUpperCase()}` : 'Key' + char,
      keyCode: keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true,
      composed: true,
      isTrusted: false
    });
    
    // Dispatch events on the document to ensure they bubble properly
    document.dispatchEvent(keydownEvent);
    document.dispatchEvent(keypressEvent);
    
    // Try to insert the character using multiple methods
    let inserted = false;
    
    // Method 1: execCommand
    try {
      inserted = document.execCommand('insertText', false, char);
      console.log('execCommand result:', inserted);
    } catch (e) {
      console.log('execCommand failed:', e);
    }
    
    // Method 2: If execCommand failed, try direct insertion
    if (!inserted) {
      try {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(char));
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
          inserted = true;
          console.log('Direct insertion successful');
        }
      } catch (e) {
        console.log('Direct insertion failed:', e);
      }
    }
    
    // Method 3: If still not inserted, try clipboard
    if (!inserted) {
      try {
        navigator.clipboard.writeText(char).then(() => {
          document.execCommand('paste');
          console.log('Clipboard insertion successful');
        }).catch((e) => {
          console.log('Clipboard insertion failed:', e);
        });
      } catch (e) {
        console.log('Clipboard method failed:', e);
      }
    }
    
    document.dispatchEvent(keyupEvent);
    
    console.log('Character typing attempt completed');
  } catch (error) {
    console.error('Error typing character:', error);
  }
}

// Main typing function
function typeNextCharacter() {
  console.log('typeNextCharacter called, state:', typingState);
  
  if (!typingState.isTyping || typingState.isPaused) {
    console.log('Typing stopped or paused');
    return;
  }
  
  if (typingState.currentIndex >= typingState.text.length) {
    // Finished typing
    console.log('Finished typing all characters');
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
  console.log('Typing character:', char, 'at index:', typingState.currentIndex);
  typeCharacter(editor, char);
  typingState.currentIndex++;
  
  // Schedule next character
  const delay = calculateDelay(typingState.wpm);
  console.log('Next character in', delay, 'ms');
  typingState.timeoutId = setTimeout(typeNextCharacter, delay);
}

// Start typing
function startTyping(text, wpm) {
  console.log('Starting typing with text:', text, 'WPM:', wpm);
  
  const editor = findGoogleDocsEditor();
  if (!editor) {
    console.error('No editor found');
    return { error: 'Could not find Google Docs editor. Please make sure you are on a Google Docs page.' };
  }
  
  console.log('Found editor:', editor);
  
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
  
  console.log('Typing state initialized:', typingState);
  
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
    case 'ping':
      console.log('Ping received, responding with pong');
      sendResponse({ message: 'pong', timestamp: Date.now() });
      break;
      
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

// Add a simple test to verify the content script is working
window.addEventListener('load', () => {
  console.log('Page fully loaded, content script is active');
  
  // Test if we can find the Google Docs editor
  const editor = findGoogleDocsEditor();
  if (editor) {
    console.log('✅ Google Docs editor found:', editor);
  } else {
    console.log('❌ Google Docs editor not found');
  }
}); 