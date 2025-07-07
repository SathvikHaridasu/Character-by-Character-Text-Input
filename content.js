// Content script for Google Docs typing simulation

// Initialize the extension
console.log('Character-by-Character Text Input content script loading...');

let typingState = {
  isTyping: false,
  isPaused: false,
  text: '',
  currentIndex: 0,
  wpm: 60,
  timeoutId: null
};

// Find the Google Docs editor - simplified approach
function findGoogleDocsEditor() {
  console.log('Searching for Google Docs editor...');
  
  // Wait for Google Docs to fully load
  if (!document.querySelector('.kix-appview-editor')) {
    console.log('Google Docs editor not yet loaded, waiting...');
    return null;
  }
  
  // Try to find the actual typing area in Google Docs
  // Google Docs uses a complex structure, so we need to be more specific
  const selectors = [
    // Primary selector for the main editor content area
    '.kix-appview-editor',
    // Alternative selectors
    '[contenteditable="true"][role="textbox"]',
    '.kix-lineview-content',
    '.kix-appview-editor-content'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      console.log('Found editor element with selector:', selector, element);
      return element;
    }
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
  console.log('Focusing editor:', editor);
  
  try {
    // Focus the editor
    editor.focus();
    
    // Try to position cursor at the end
    const range = document.createRange();
    const selection = window.getSelection();
    
    // Clear any existing selection
    selection.removeAllRanges();
    
    // Try to find the best position for the cursor
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
    
    // Set the selection
    selection.addRange(range);
    
    // Also try to click in the editor to ensure it's active
    const rect = editor.getBoundingClientRect();
    const clickEvent = new MouseEvent('click', {
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      bubbles: true,
      cancelable: true
    });
    
    editor.dispatchEvent(clickEvent);
    
    console.log('Editor focused and cursor positioned');
  } catch (error) {
    console.error('Error focusing editor:', error);
  }
}

// Type a single character using a simplified approach
function typeCharacter(editor, char) {
  console.log('Attempting to type character:', char);
  
  try {
    // Focus the editor first
    editor.focus();
    
    // Method 1: Try to use execCommand (works in some cases)
    try {
      const success = document.execCommand('insertText', false, char);
      console.log('execCommand result:', success);
      if (success) {
        console.log('Text inserted via execCommand');
        return;
      }
    } catch (e) {
      console.log('execCommand failed:', e);
    }
    
    // Method 2: Use the selection API to insert text at the cursor position
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      // Create a text node with the character
      const textNode = document.createTextNode(char);
      
      // Insert the text
      range.insertNode(textNode);
      
      // Move cursor after the inserted text
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      
      // Update selection
      selection.removeAllRanges();
      selection.addRange(range);
      
      console.log('Text inserted via selection API');
    }
    
    // Method 3: Create comprehensive input events that Google Docs should recognize
    const textArea = document.querySelector('.kix-lineview-content') ||
                    document.querySelector('[contenteditable="true"][role="textbox"]') ||
                    document.querySelector('.kix-appview-editor-content') ||
                    editor;
    
    const inputEvent = new InputEvent('input', {
      inputType: 'insertText',
      data: char,
      bubbles: true,
      cancelable: true,
      composed: true
    });
    
    const beforeInputEvent = new InputEvent('beforeinput', {
      inputType: 'insertText',
      data: char,
      bubbles: true,
      cancelable: true,
      composed: true
    });
    
    // Dispatch events on the text area
    textArea.dispatchEvent(beforeInputEvent);
    textArea.dispatchEvent(inputEvent);
    
    // Method 4: Try keyboard events as a fallback
    const keyCode = char.charCodeAt(0);
    const keydownEvent = new KeyboardEvent('keydown', {
      key: char,
      code: char.length === 1 ? `Key${char.toUpperCase()}` : 'Key' + char,
      keyCode: keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true,
      composed: true
    });
    
    const keypressEvent = new KeyboardEvent('keypress', {
      key: char,
      code: char.length === 1 ? `Key${char.toUpperCase()}` : 'Key' + char,
      keyCode: keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true,
      composed: true
    });
    
    const keyupEvent = new KeyboardEvent('keyup', {
      key: char,
      code: char.length === 1 ? `Key${char.toUpperCase()}` : 'Key' + char,
      keyCode: keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true,
      composed: true
    });
    
    textArea.dispatchEvent(keydownEvent);
    textArea.dispatchEvent(keypressEvent);
    textArea.dispatchEvent(keyupEvent);
    
    console.log('Character typing completed');
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
  
  // Wait a bit for Google Docs to be ready
  setTimeout(() => {
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
  }, 1000); // Wait 1 second for Google Docs to be ready
  
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

// Setup message listener
function setupMessageListener() {
  console.log('Setting up message listener...');
  
  // Check if Chrome APIs are available
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.onMessage) {
    console.error('Chrome APIs not available in content script');
    return;
  }
  
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
  
  console.log('Message listener setup complete');
}

// Initialize the content script
console.log('Character-by-Character Text Input content script loaded');

// Setup message listener immediately
setupMessageListener();

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