# Character-by-Character Text Input Chrome Extension

A Chrome extension that simulates character-by-character typing in Google Docs.

## Features

- **Character-by-character typing simulation** in Google Docs
- **Configurable typing speed** (10-200 WPM)
- **Start/Pause/Resume/Stop controls**
- **Input validation** (max 1000 characters, no line breaks)
- **Realistic typing delays** with slight randomization

## Installation

1. **Download/Clone** this repository to your local machine
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer mode** (toggle in top right)
4. **Click "Load unpacked"** and select the extension folder
5. **Pin the extension** to your toolbar for easy access

## Usage

1. **Open Google Docs** (https://docs.google.com/document/)
2. **Click the extension icon** in your Chrome toolbar
3. **Paste or type text** in the textarea (max 1000 characters, no line breaks)
4. **Adjust typing speed** using the WPM slider (default: 60 WPM)
5. **Click in your Google Doc** to position the cursor where you want typing to start
6. **Click "Start Typing"** to begin the simulation
7. **Use Pause/Resume/Stop** buttons to control the process

## Testing

### Basic Functionality Test
1. Go to a Google Docs page
2. Open the extension popup
3. Enter a short test text (e.g., "Hello world!")
4. Set WPM to 60
5. Click in the Google Doc
6. Click "Start Typing"
7. Verify text appears character by character

### Error Handling Test
1. Try entering text with line breaks (should show error)
2. Try entering more than 1000 characters (should show error)
3. Try using the extension on a non-Google Docs page (should show error)

### Control Test
1. Start typing a longer text
2. Click "Pause" - typing should stop
3. Click "Resume" - typing should continue
4. Click "Stop" - typing should stop completely

## Technical Details

- **Manifest V3** Chrome extension
- **Content script injection** on Google Docs pages
- **Message passing** between popup and content script
- **Realistic timing** with ±20% randomization
- **Multiple editor detection** strategies for Google Docs

## Limitations

- Works only on Google Docs (docs.google.com/document/*)
- Text only (no formatting, images, or special elements)
- Single paragraph input maximum
- Maximum 1000 characters per session
- No persistence (text cleared after each use)

## Troubleshooting

- **Extension not loading**: Make sure all files are present and manifest.json is valid
- **Typing not working**: Ensure you're on a Google Docs page and the page is fully loaded
- **Editor not found**: Try refreshing the Google Docs page
- **Permission errors**: Check that the extension has the required permissions

## Files Structure

```
Character-by-Character-Text-Input/
├── manifest.json      # Extension configuration
├── popup.html         # Popup interface
├── popup.js           # Popup logic and validation
├── popup.css          # Popup styling
├── content.js         # Google Docs typing simulation
└── README.md          # This file
``` 