// DOM elements
const inputText = document.getElementById('inputText');
const wpm = document.getElementById('wpm');
const wpmValue = document.getElementById('wpmValue');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const stopBtn = document.getElementById('stopBtn');
const testBtn = document.getElementById('testBtn');
const errorDiv = document.getElementById('error');
const charCount = document.getElementById('charCount');

function showError(msg, isSuccess = false) {
  errorDiv.textContent = msg;
  errorDiv.className = isSuccess ? 'error success' : 'error';
  errorDiv.style.display = 'block';
}

function clearError() {
  errorDiv.textContent = '';
  errorDiv.style.display = 'none';
}

wpm.addEventListener('input', () => {
  wpmValue.textContent = wpm.value;
});

inputText.addEventListener('input', () => {
  const length = inputText.value.length;
  charCount.textContent = length;
  
  if (length > 1000) {
    showError('Maximum 1000 characters allowed.');
    inputText.value = inputText.value.slice(0, 1000);
    charCount.textContent = '1000';
  } else if (/\n/.test(inputText.value)) {
    showError('No line breaks allowed.');
    inputText.value = inputText.value.replace(/\n/g, ' ');
  } else {
    clearError();
  }
});

function setButtons(state) {
  // state: 'idle', 'typing', 'paused'
  if (state === 'idle') {
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    resumeBtn.disabled = true;
    stopBtn.disabled = true;
    document.body.classList.remove('typing');
  } else if (state === 'typing') {
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    resumeBtn.disabled = true;
    stopBtn.disabled = false;
    document.body.classList.add('typing');
  } else if (state === 'paused') {
    startBtn.disabled = true;
    pauseBtn.disabled = true;
    resumeBtn.disabled = false;
    stopBtn.disabled = false;
    document.body.classList.remove('typing');
  }
}

setButtons('idle');

// Helper function to ensure content script is injected
async function ensureContentScriptInjected(tabId) {
  try {
    // Try to inject the content script
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
    console.log('Content script injected successfully');
    return true;
  } catch (error) {
    console.error('Failed to inject content script:', error);
    return false;
  }
}

// Helper function to send message with retry
async function sendMessageWithRetry(tabId, message, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`Attempt ${i + 1}: Injecting content script...`);
      // First, ensure content script is injected
      const injected = await ensureContentScriptInjected(tabId);
      if (!injected) {
        throw new Error('Failed to inject content script');
      }
      
      // Wait a bit for the content script to initialize
      console.log(`Attempt ${i + 1}: Waiting for content script to initialize...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Send the message
      console.log(`Attempt ${i + 1}: Sending message:`, message);
      const response = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          if (chrome.runtime.lastError) {
            console.error(`Attempt ${i + 1} failed with runtime error:`, chrome.runtime.lastError);
            reject(new Error(`Runtime error: ${chrome.runtime.lastError.message}`));
          } else {
            console.log(`Attempt ${i + 1} succeeded with response:`, response);
            resolve(response);
          }
        });
      });
      
      // If we get here, the message was successful
      return response;
      
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      if (i === maxRetries - 1) {
        // This was the last attempt, throw the error
        throw error;
      }
      // Wait before retry
      console.log(`Waiting 2 seconds before retry...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

startBtn.addEventListener('click', async () => {
  clearError();
  const text = inputText.value;
  if (!text) {
    showError('Please enter some text.');
    return;
  }
  if (text.length > 1000) {
    showError('Maximum 1000 characters allowed.');
    return;
  }
  if (/\n/.test(text)) {
    showError('No line breaks allowed.');
    return;
  }
  
  console.log('Start button clicked, text:', text);
  
  try {
    // Check if on Google Docs
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    const tab = tabs[0];
    console.log('Current tab:', tab);
    
    if (!tab.url || !tab.url.startsWith('https://docs.google.com/document/')) {
      showError('Please use this extension on a Google Docs page.');
      return;
    }
    
    console.log('Sending message to content script...');
    const response = await sendMessageWithRetry(tab.id, {
      action: 'start',
      text,
      wpm: parseInt(wpm.value, 10)
    });
    
    console.log('Response from content script:', response);
    
    if (response && response.error) {
      showError(response.error);
      return;
    }
    
    setButtons('typing');
    inputText.value = '';
    
    // Set up a listener to detect when typing completes
    const checkCompletion = setInterval(async () => {
      try {
        const statusResponse = await sendMessageWithRetry(tab.id, {action: 'status'});
        if (statusResponse && !statusResponse.isTyping) {
          clearInterval(checkCompletion);
          setButtons('idle');
          showError('🎉 Typing completed!', true);
          setTimeout(clearError, 3000);
        }
      } catch (error) {
        clearInterval(checkCompletion);
        console.error('Error checking status:', error);
      }
    }, 500);
    
  } catch (error) {
    console.error('Communication error:', error);
    const errorMessage = error.message || 'Unknown error';
    showError(`Could not communicate with content script: ${errorMessage}. Please refresh the page and try again.`);
  }
});

pauseBtn.addEventListener('click', async () => {
  try {
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    const tab = tabs[0];
    await sendMessageWithRetry(tab.id, {action: 'pause'});
    setButtons('paused');
  } catch (error) {
    console.error('Error pausing:', error);
    showError('Failed to pause typing. Please try again.');
  }
});

resumeBtn.addEventListener('click', async () => {
  try {
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    const tab = tabs[0];
    await sendMessageWithRetry(tab.id, {action: 'resume'});
    setButtons('typing');
  } catch (error) {
    console.error('Error resuming:', error);
    showError('Failed to resume typing. Please try again.');
  }
});

stopBtn.addEventListener('click', async () => {
  try {
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    const tab = tabs[0];
    await sendMessageWithRetry(tab.id, {action: 'stop'});
    setButtons('idle');
  } catch (error) {
    console.error('Error stopping:', error);
    showError('Failed to stop typing. Please try again.');
  }
});

testBtn.addEventListener('click', async () => {
  console.log('Test button clicked');
  clearError();
  
  try {
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    const tab = tabs[0];
    console.log('Testing connection to tab:', tab);
    
    if (!tab.url || !tab.url.startsWith('https://docs.google.com/document/')) {
      showError('Please use this extension on a Google Docs page.');
      return;
    }
    
    console.log('Sending ping to content script...');
    const response = await sendMessageWithRetry(tab.id, {action: 'ping'});
    
    console.log('Ping response:', response);
    
    if (response && response.message === 'pong') {
      console.log('✅ Content script is working!');
      showError('✅ Connection successful! Content script is working.', true);
      setTimeout(clearError, 2000);
    } else {
      showError(`Unexpected response from content script: ${JSON.stringify(response)}`);
    }
    
  } catch (error) {
    console.error('Ping failed:', error);
    const errorMessage = error.message || 'Unknown error';
    showError(`Content script not responding: ${errorMessage}. Please refresh the page and try again.`);
    
    // Additional debugging info
    console.log('Full error object:', error);
    console.log('Error stack:', error.stack);
  }
}); 