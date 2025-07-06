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
  
  // Check if on Google Docs
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const tab = tabs[0];
    console.log('Current tab:', tab);
    
    if (!tab.url || !tab.url.startsWith('https://docs.google.com/document/')) {
      showError('Please use this extension on a Google Docs page.');
      return;
    }
    
    console.log('Sending message to content script...');
    chrome.tabs.sendMessage(tab.id, {
      action: 'start',
      text,
      wpm: parseInt(wpm.value, 10)
    }, (response) => {
      console.log('Response from content script:', response);
      console.log('Chrome runtime error:', chrome.runtime.lastError);
      
      if (chrome.runtime.lastError) {
        console.error('Communication error:', chrome.runtime.lastError);
        const errorMessage = chrome.runtime.lastError.message || 'Unknown error';
        showError(`Could not communicate with content script: ${errorMessage}. Please refresh the page and try again.`);
        return;
      }
      if (response && response.error) {
        showError(response.error);
        return;
      }
      setButtons('typing');
      inputText.value = '';
      
      // Set up a listener to detect when typing completes
      const checkCompletion = setInterval(() => {
        chrome.tabs.sendMessage(tab.id, {action: 'status'}, (response) => {
          if (chrome.runtime.lastError) {
            clearInterval(checkCompletion);
            return;
          }
          if (response && !response.isTyping) {
            clearInterval(checkCompletion);
            setButtons('idle');
            showError('🎉 Typing completed!', true);
            setTimeout(clearError, 3000);
          }
        });
      }, 500);
    });
  });   
});

pauseBtn.addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const tab = tabs[0];
    chrome.tabs.sendMessage(tab.id, {action: 'pause'});
    setButtons('paused');
  });
});

resumeBtn.addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const tab = tabs[0];
    chrome.tabs.sendMessage(tab.id, {action: 'resume'});
    setButtons('typing');
  });
});

stopBtn.addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const tab = tabs[0];
    chrome.tabs.sendMessage(tab.id, {action: 'stop'});
    setButtons('idle');
  });
});

testBtn.addEventListener('click', () => {
  console.log('Test button clicked');
  clearError();
  
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const tab = tabs[0];
    console.log('Testing connection to tab:', tab);
    
    if (!tab.url || !tab.url.startsWith('https://docs.google.com/document/')) {
      showError('Please use this extension on a Google Docs page.');
      return;
    }
    
    console.log('Sending ping to content script...');
    chrome.tabs.sendMessage(tab.id, {action: 'ping'}, (response) => {
      console.log('Ping response:', response);
      console.log('Ping error:', chrome.runtime.lastError);
      
      if (chrome.runtime.lastError) {
        console.error('Ping failed:', chrome.runtime.lastError);
        const errorMessage = chrome.runtime.lastError.message || 'Unknown error';
        showError(`Content script not responding: ${errorMessage}. Please refresh the page and try again.`);
      } else if (response && response.message === 'pong') {
        console.log('✅ Content script is working!');
        showError('✅ Connection successful! Content script is working.', true);
        setTimeout(clearError, 2000);
      } else {
        showError('Unexpected response from content script.');
      }
    });
  });
}); 