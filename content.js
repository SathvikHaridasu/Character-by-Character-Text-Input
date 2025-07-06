// Content script for Google Docs typing simulation

// Check if content script is already loaded to prevent duplicate injection
if (window.characterTypingExtensionLoaded) {
  console.log('Content script already loaded, skipping...');
} else {
  window.characterTypingExtensionLoaded = true;
  
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
  
  // Try to find the actual typing area in Google Docs
  const selectors = [
    '.kix-lineview-content',
    '[contenteditable="true"][role="textbox"]',
    '.kix-appview-editor',
    '[data-params*="editor"]',
    '[aria-label*="document"]',
    '[contenteditable="true"]',
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
  console.log('Focusing editor:', editor);
  
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
}

// Type a single character
function typeCharacter(editor, char) {
  console.log('Attempting to type character:', char);
  
  try {
    // Focus the editor first
    editor.focus();
    
    // Method 1: Try to use Google Docs' own input method
    // Look for the actual input area within Google Docs
    const inputArea = document.querySelector('.kix-lineview-content') || 
                     document.querySelector('[contenteditable="true"]') ||
                     editor;
    
    console.log('Using input area:', inputArea);
    
    // Create a more realistic input event
    const inputEvent = new InputEvent('input', {
      inputType: 'insertText',
      data: char,
      bubbles: true,
      cancelable: true,
      composed: true
    });
    
    // Create beforeinput event
    const beforeInputEvent = new InputEvent('beforeinput', {
      inputType: 'insertText',
      data: char,
      bubbles: true,
      cancelable: true,
      composed: true
    });
    
    // Dispatch beforeinput event
    inputArea.dispatchEvent(beforeInputEvent);
    
    // Method 2: Try to insert text using selection API
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
    } else {
      // Fallback: try to append to the editor
      if (inputArea.textContent !== undefined) {
        inputArea.textContent += char;
        console.log('Text appended to editor');
      }
    }
    
    // Dispatch input event
    inputArea.dispatchEvent(inputEvent);
    
    // Method 3: Try keyboard events as fallback
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
    
    inputArea.dispatchEvent(keydownEvent);
    inputArea.dispatchEvent(keypressEvent);
    inputArea.dispatchEvent(keyupEvent);
    
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
} 