// DOM elements
const inputText = document.getElementById('inputText');
const wpm = document.getElementById('wpm');
const wpmValue = document.getElementById('wpmValue');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const stopBtn = document.getElementById('stopBtn');
const errorDiv = document.getElementById('error');

function showError(msg) {
  errorDiv.textContent = msg;
}
function clearError() {
  errorDiv.textContent = '';
}

wpm.addEventListener('input', () => {
  wpmValue.textContent = wpm.value;
});

inputText.addEventListener('input', () => {
  if (inputText.value.length > 1000) {
    showError('Maximum 1000 characters allowed.');
    inputText.value = inputText.value.slice(0, 1000);
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
  } else if (state === 'typing') {
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    resumeBtn.disabled = true;
    stopBtn.disabled = false;
  } else if (state === 'paused') {
    startBtn.disabled = true;
    pauseBtn.disabled = true;
    resumeBtn.disabled = false;
    stopBtn.disabled = false;
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
        showError('Could not communicate with content script. Please refresh the page and try again.');
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
            showError('Typing completed!');
            setTimeout(clearError, 2000);
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