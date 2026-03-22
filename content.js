// Global variables
let isInitialized = false;
let canvas = null;
let ctx = null;
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let drawingModeActive = false;
let toolbarVisible = false;
let toolbarCollapsed = false; // Track if toolbar is collapsed
let currentColor = '#f44336'; // Default color (red)
let currentTool = 'pen'; // Default tool
let currentSize = 5; // Default size
let drawingHistory = [];

// DOM elements
let toolbar;
let activationIndicator;

// Check if we're on a page where content scripts can run
const isValidPage = (function() {
  const url = window.location.href;
  // Special case for about:blank
  if (url === 'about:blank' || url.startsWith('about:blank?')) {
    console.log('Web Canvas: Running on about:blank page');
    return true;
  }
  
  // Block other special pages
  const isBlocked = 
    url.startsWith('chrome://') || 
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    (url.startsWith('about:') && !url.startsWith('about:blank'));
  
  if (isBlocked) {
    console.log('Web Canvas: Page is blocked for content scripts:', url);
    return false;
  }
  
  console.log('Web Canvas: Running on regular page:', url);
  return true;
})();

// Detect platform (Mac or Windows/Linux)
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

// The activation key (Alt/Option + D by default)
const ACTIVATION_KEY = { key: 'd', altKey: true };
// The hide key (Escape by default)
const HIDE_KEY = { key: 'Escape' };
// The clear key (Alt/Option + C by default)
const CLEAR_KEY = { key: 'c', altKey: true };

// Function to prepare about:blank pages
function prepareAboutBlankPage() {
  try {
    if (window.location.href === 'about:blank' || window.location.href.startsWith('about:blank?')) {
      console.log('Web Canvas: Preparing about:blank page');
      
      try {
        // Create full HTML structure if needed
        if (!document.documentElement) {
          const html = document.createElement('html');
          document.appendChild(html);
          console.log('Web Canvas: Created <html> element');
        }
        
        // Create head if missing
        if (!document.head) {
          const head = document.createElement('head');
          document.documentElement.appendChild(head);
          console.log('Web Canvas: Created <head> element');
        }
        
        // Create body if missing
        if (!document.body) {
          const body = document.createElement('body');
          document.documentElement.appendChild(body);
          console.log('Web Canvas: Created <body> element');
        }
        
        // Ensure we have a style element
        let styleElement = document.getElementById('web-canvas-about-blank-styles');
        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = 'web-canvas-about-blank-styles';
          styleElement.textContent = `
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              height: 100% !important;
              position: relative !important;
              overflow: hidden !important;
              background-color: white !important;
            }
          `;
          if (document.head) {
            document.head.appendChild(styleElement);
            console.log('Web Canvas: Added required styles for about:blank');
          }
        }
        
        // Make sure body has proper dimensions and styles
        if (document.body) {
          document.body.style.cssText = `
            margin: 0 !important;
            padding: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            position: relative !important;
            background-color: #ffffff !important;
            overflow: hidden !important;
          `;
        }
        
        // For debugging: Add visual indicator that we're on about:blank
        const indicatorId = 'about-blank-indicator';
        let indicator = document.getElementById(indicatorId);
        if (!indicator && document.body) {
          indicator = document.createElement('div');
          indicator.id = indicatorId;
          indicator.style.cssText = `
            position: fixed !important;
            bottom: 5px !important;
            left: 5px !important;
            padding: 3px 6px !important;
            font-size: 10px !important;
            background: rgba(0,0,0,0.3) !important;
            color: white !important;
            border-radius: 3px !important;
            z-index: 2147483646 !important;
            font-family: Arial, sans-serif !important;
          `;
          indicator.textContent = 'about:blank';
          document.body.appendChild(indicator);
        }
        
        console.log('Web Canvas: Successfully prepared about:blank page');
        return true;
      } catch (innerError) {
        console.error('Web Canvas: Inner error preparing about:blank page', innerError);
      }
    }
    return false;
  } catch (outerError) {
    console.error('Web Canvas: Outer error preparing about:blank page', outerError);
    return false;
  }
}

// Initialize the drawing tool on page load
function init() {
  console.log('Web Canvas: Initializing');
  
  // Check if we're on about:blank and needs special preparation
  const isAboutBlank = prepareAboutBlankPage();
  
  // Don't initialize on special pages, but allow about:blank
  if (!isValidPage && !isAboutBlank) {
    console.log('Web Canvas: Not initializing on special page');
    return;
  }
  
  // Make sure tool is properly initialized for about:blank
  if (isAboutBlank) {
    console.log('Web Canvas: Special initialization for about:blank page');
    setTimeout(() => {
      if (!isInitialized) {
        initializeDrawingTool();
      }
    }, 200);
  }
  
  // Check if background state indicates we should activate drawing
  try {
    chrome.runtime.sendMessage({ action: "getState" }, function(response) {
      if (chrome.runtime.lastError) {
        console.log('Error getting state: ', chrome.runtime.lastError.message);
        return;
      }
      
      if (response && response.isActive) {
        console.log('Web Canvas: Restoring active state');
        // Initialize and wait for DOM to be fully loaded
        setTimeout(() => {
          if (!isInitialized) {
            initializeDrawingTool();
          }
          toggleDrawingMode(true);
        }, 300);
      }
    });
  } catch (e) {
    console.error('Error getting state:', e);
  }
}

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Web Canvas content script received message:', request);
  
  try {
    // For about:blank pages, always prepare the page first
    if (request.isAboutBlank || window.location.href === 'about:blank') {
      console.log('Web Canvas: Received message for about:blank page');
      prepareAboutBlankPage();
      
      // For about:blank, always try to initialize
      if (!isInitialized) {
        console.log('Web Canvas: Force initializing for about:blank page');
        try {
          initializeDrawingTool();
          console.log('Web Canvas: Successfully initialized for about:blank');
        } catch (error) {
          console.error('Web Canvas: Error initializing for about:blank', error);
        }
      }
    }
    
    // Force initialization for about:blank pages
    if (request.action === 'forceInitialize') {
      console.log('Web Canvas: Force initializing drawing tool');
      
      // Make absolutely sure we have a proper about:blank setup
      if (window.location.href === 'about:blank') {
        prepareAboutBlankPage();
      }
      
      // Re-initialize if needed
      if (!isInitialized) {
        try {
          initializeDrawingTool();
          console.log('Web Canvas: Successfully initialized from forceInitialize');
        } catch (error) {
          console.error('Web Canvas: Error during forced initialization', error);
          // Last resort - try to initialize with direct element creation
          try {
            if (!document.body) {
              if (!document.documentElement) {
                document.appendChild(document.createElement('html'));
              }
              document.documentElement.appendChild(document.createElement('body'));
            }
            initializeDrawingTool();
            console.log('Web Canvas: Successfully initialized with emergency fallback');
          } catch (e) {
            console.error('Web Canvas: Emergency initialization failed', e);
          }
        }
      } else {
        console.log('Web Canvas: Already initialized, no action needed');
      }
      
      sendResponse({ success: true, initialized: isInitialized });
      return true;
    }
    
    // Initialize if not already done
    if (!isInitialized) {
      console.log('Web Canvas: Not initialized yet, initializing now');
      try {
        initializeDrawingTool();
      } catch (error) {
        console.error('Web Canvas: Error during initialization', error);
      }
    }
    
    switch (request.action) {
      case 'activateDrawing':
        console.log('Web Canvas: Activating drawing mode');
        
        // Force initialization if not done
        if (!isInitialized || !canvas) {
          console.log('Web Canvas: Force initializing before activation');
          try { initializeDrawingTool(); } catch(err) { console.error('Init error:', err); }
        }
        
        if (canvas) {
          toggleDrawingMode(true);
          sendResponse({ success: true, activated: true });
        } else {
          sendResponse({ success: false, error: 'Canvas could not be created' });
        }
        break;
        
      case 'deactivateDrawing':
        console.log('Web Canvas: Deactivating drawing mode');
        if (canvas && canvas.style.display === 'block') {
          toggleDrawingMode(false);
        }
        sendResponse({ success: true, activated: false });
        break;
        
      case 'toggleDrawing':
        console.log('Web Canvas: Toggling drawing mode');
        const newState = toggleDrawingMode();
        sendResponse({ success: true, activated: newState });
        break;
        
      case 'clearCanvas':
        console.log('Web Canvas: Clearing canvas');
        clearCanvas();
        sendResponse({ success: true });
        break;

      case 'analyzeDrawing':
        console.log('Web Canvas: Analyzing drawing');
        (async () => {
          try {
            const apiKeyResult = await chrome.storage.local.get(['geminiApiKey']);
            if (!apiKeyResult || !apiKeyResult.geminiApiKey) {
              sendResponse({ error: 'No Gemini API key set. Please save your key in the extension popup.' });
              return;
            }
            const canvasEl = canvas;
            if (!canvasEl) {
              sendResponse({ error: 'Drawing canvas not found. Please activate drawing first (⌥+D).' });
              return;
            }
            // Create a composited capture: white background + drawing
            const captureCanvas = document.createElement('canvas');
            captureCanvas.width = canvasEl.width;
            captureCanvas.height = canvasEl.height;
            const captureCtx = captureCanvas.getContext('2d');
            // White background so AI can see the drawing
            captureCtx.fillStyle = '#FFFFFF';
            captureCtx.fillRect(0, 0, captureCanvas.width, captureCanvas.height);
            // Draw the actual canvas content on top
            captureCtx.drawImage(canvasEl, 0, 0);
            const imageDataUrl = captureCanvas.toDataURL('image/png');
            
            const base64 = imageDataUrl.split(',')[1];
            const apiKey = apiKeyResult.geminiApiKey;
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [
                  { text: `Analyze this drawing. Respond in this rigid JSON format:
{
  "reasoning": {
    "observe": "Describe the core elements visible.",
    "hypothesize": "List possible interpretations.",
    "self_check": "Compare hypotheses against visual evidence.",
    "reasoning_type": "e.g., visual inference",
    "fallback": "If uncertain, specify ambiguous parts and give best guess."
  },
  "final_result": {
    "content": "What is drawn",
    "style": "Artistic style",
    "meaning": "Possible intent"
  }
}` },
                  { inlineData: { mimeType: 'image/png', data: base64 } }
                ]}]
              })
            });
            const data = await response.json();
            if (!response.ok) {
              sendResponse({ error: data.error?.message || 'API Error' });
              return;
            }
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            try {
              const jsonMatch = text.match(/\{[\s\S]*\}/);
              const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
              const r = parsed.reasoning, f = parsed.final_result;
              sendResponse({ result: `🔍 Analysis (${r.reasoning_type}):\n\n📋 Observation:\n${r.observe}\n\n💭 Hypothesis:\n${r.hypothesize.split('.,').join('.\\n• ').replace(/^([^•])/, '• $1')}\n\n✅ Self-Check:\n${r.self_check}\n\n⚠️ Fallback:\n${r.fallback}\n\n🎨 Result:\n• Content: ${f.content}\n• Style: ${f.style}\n• Meaning: ${f.meaning}` });
            } catch(e) {
              sendResponse({ result: text });
            }
          } catch(err) {
            sendResponse({ error: err.message });
          }
        })();
        return true;

      case 'getSuggestions':
        console.log('Web Canvas: Getting suggestions');
        (async () => {
          try {
            const apiKeyResult = await chrome.storage.local.get(['geminiApiKey']);
            if (!apiKeyResult || !apiKeyResult.geminiApiKey) {
              sendResponse({ error: 'No Gemini API key set.' }); return;
            }
            const canvasEl = canvas;
            if (!canvasEl) {
              sendResponse({ error: 'Please activate drawing first (⌥+D).' }); return;
            }
            // Composite canvas capture
            const captureCanvas = document.createElement('canvas');
            captureCanvas.width = canvasEl.width;
            captureCanvas.height = canvasEl.height;
            const captureCtx = captureCanvas.getContext('2d');
            captureCtx.fillStyle = '#FFFFFF';
            captureCtx.fillRect(0, 0, captureCanvas.width, captureCanvas.height);
            captureCtx.drawImage(canvasEl, 0, 0);
            const base64 = captureCanvas.toDataURL('image/png').split(',')[1];
            const apiKey = apiKeyResult.geminiApiKey;
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [
                  { text: `Suggest artistic improvements for this drawing. Respond in rigid JSON:
{
  "reasoning": {
    "observe": "Describe flaws and current technique.",
    "hypothesize": "List possible improvements.",
    "self_check": "Confirm suggestions match skill level.",
    "reasoning_type": "e.g., artistic critique",
    "fallback": "State assumed intent if unclear."
  },
  "final_result": {
    "improvements": "Specific areas to improve",
    "techniques": "Concrete techniques to try"
  }
}` },
                  { inlineData: { mimeType: 'image/png', data: base64 } }
                ]}]
              })
            });
            const data = await response.json();
            if (!response.ok) { sendResponse({ error: data.error?.message || 'API Error' }); return; }
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            try {
              const jsonMatch = text.match(/\{[\s\S]*\}/);
              const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
              const r = parsed.reasoning || {}, f = parsed.final_result || {};
              const formatList = (val) => Array.isArray(val) ? val.join('\n• ') : String(val || '');
              
              sendResponse({ result: `💡 Suggestions (${r.reasoning_type}):\n\n📋 Observation:\n${r.observe}\n\n✅ Self-Check:\n${r.self_check}\n\n⚠️ Fallback:\n${r.fallback}\n\n🎯 Improvements:\n• ${formatList(f.improvements)}\n\n🛠️ Techniques:\n• ${formatList(f.techniques)}` });
            } catch(e) { sendResponse({ result: text }); }
          } catch(err) { sendResponse({ error: err.message }); }
        })();
        return true;

      case 'generatePrompt':
        console.log('Web Canvas: Generating drawing prompt');
        (async () => {
          try {
            const apiKeyResult = await chrome.storage.local.get(['geminiApiKey']);
            if (!apiKeyResult || !apiKeyResult.geminiApiKey) {
              sendResponse({ error: 'No Gemini API key set.' }); return;
            }
            const apiKey = apiKeyResult.geminiApiKey;
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `Generate a creative drawing prompt. Respond in rigid JSON:
{
  "reasoning": {
    "observe": "Identify a theme or concept.",
    "hypothesize": "Brainstorm 2-3 visual scenarios.",
    "self_check": "Ensure it is not too complex.",
    "reasoning_type": "e.g., generative brainstorming",
    "fallback": "Provide a concrete backup idea."
  },
  "final_result": {
    "prompt": "The actual drawing prompt",
    "tips": "1-2 tips on how to draw it"
  }
}` }]}]
              })
            });
            const data = await response.json();
            if (!response.ok) { sendResponse({ error: data.error?.message || 'API Error' }); return; }
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            try {
              const jsonMatch = text.match(/\{[\s\S]*\}/);
              const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
              const r = parsed.reasoning || {}, f = parsed.final_result || {};
              const formatList = (val) => Array.isArray(val) ? val.join('\n• ') : String(val || '');
              
              sendResponse({ result: `✨ Drawing Prompt (${r.reasoning_type}):\n\n🧠 Brainstorm:\n• ${formatList(r.hypothesize)}\n\n✅ Check:\n${r.self_check}\n\n🎨 Your Prompt:\n"${f.prompt}"\n\n💡 Tips:\n• ${formatList(f.tips)}` });
            } catch(e) { sendResponse({ result: text }); }
          } catch(err) { sendResponse({ error: err.message }); }
        })();
        return true;
    }
  } catch (e) {
    console.error('Web Canvas: Error in message handler', e);
    sendResponse({ success: false, error: e.message });
  }
  
  return true; // Keep the message channel open for async responses
});

function initializeDrawingTool() {
  if (isInitialized) return;
  console.log('Web Canvas: Initializing drawing tool');
  
  // Ensure we have a body element
  if (!document.body) {
    console.log('Web Canvas: No body element found, creating one');
    const body = document.createElement('body');
    document.documentElement.appendChild(body);
  }
  
  // Create canvas element
  canvas = document.createElement('canvas');
  canvas.id = 'web-canvas';
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.zIndex = '2147483647'; // Maximum z-index
  canvas.style.pointerEvents = 'none'; // Initially do not capture mouse events
  canvas.style.display = 'none'; // Initially hidden
  canvas.style.outline = '2px dashed rgba(66, 133, 244, 0.5)';
  
  // Set canvas dimensions to match window size
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  // Get the drawing context and set initial properties
  ctx = canvas.getContext('2d');
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = currentSize;
  ctx.strokeStyle = currentColor;
  
  // Append canvas to the document
  document.body.appendChild(canvas);
  
  // Initialize drawing variables
  isDrawing = false;
  lastX = 0;
  lastY = 0;
  drawingModeActive = false;
  isInitialized = true;
  
  // Override canvas addEventListener after canvas is created
  addCanvasEventListenerOverride();
  
  // Create the toolbar and tools
  createToolbar();
  
  // Create activation indicator
  createActivationIndicator();
  
  // Add event listeners for window events
  document.addEventListener('keydown', handleKeyDown, true); // Use capture to ensure it gets priority
  
  // Add window resize listener to adjust canvas size
  window.addEventListener('resize', handleResize);
  
  // Add event listener for Alt+Click activation
  document.addEventListener('click', handleAltClick, true);
  
  // Show initial instructions
  showInitialInstructions();
  
  // Log activation key for debugging
  console.log(`Web Canvas: Shortcut keys initialized. Press ${isMac ? '⌥+D' : 'Alt+D'} to activate drawing tools.`);
  
  // Try to capture mouse events even if they happen outside the window
  document.documentElement.addEventListener('mouseleave', function(e) {
    if (isDrawing) {
      stopDrawing();
    }
  });
  
  // Report initialized state
  try {
    chrome.runtime.sendMessage({
      action: "reportState",
      isActive: drawingModeActive
    }, function(response) {
      if (chrome.runtime.lastError) {
        console.log('Error reporting initial state: ', chrome.runtime.lastError.message);
      }
    });
  } catch (e) {
    console.error('Error sending initial state message:', e);
  }
  
  console.log('Web Canvas: Drawing tool initialized successfully');
}

function createToolbar() {
  const toolbar = document.createElement('div');
  toolbar.id = 'web-canvas-toolbar';
  toolbar.style.position = 'fixed';
  toolbar.style.top = '10px';
  toolbar.style.right = '10px';
  toolbar.style.padding = '10px';
  toolbar.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
  toolbar.style.borderRadius = '8px';
  toolbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
  toolbar.style.zIndex = '2147483647'; // Maximum z-index
  toolbar.style.display = 'none'; // Initially hidden
  toolbar.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  toolbar.style.opacity = '0';
  
  // Create collapsed toolbar icon (six dots in a 3x2 grid)
  const collapsedToolbar = document.createElement('div');
  collapsedToolbar.id = 'web-canvas-toolbar-collapsed';
  collapsedToolbar.style.position = 'fixed';
  collapsedToolbar.style.top = '10px';
  collapsedToolbar.style.right = '10px';
  collapsedToolbar.style.padding = '8px 10px';
  collapsedToolbar.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
  collapsedToolbar.style.borderRadius = '8px';
  collapsedToolbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
  collapsedToolbar.style.zIndex = '2147483647'; // Maximum z-index
  collapsedToolbar.style.display = 'none'; // Initially hidden
  collapsedToolbar.style.opacity = '0';
  collapsedToolbar.style.transition = 'opacity 0.3s ease';
  collapsedToolbar.style.cursor = 'pointer';
  collapsedToolbar.style.display = 'flex';
  collapsedToolbar.style.flexWrap = 'wrap';
  collapsedToolbar.style.width = '24px';
  collapsedToolbar.style.justifyContent = 'space-between';
  
  // Add the dots
  for (let i = 0; i < 6; i++) {
    const dot = document.createElement('div');
    dot.style.width = '6px';
    dot.style.height = '6px';
    dot.style.borderRadius = '50%';
    dot.style.backgroundColor = '#666';
    dot.style.margin = '2px';
    collapsedToolbar.appendChild(dot);
  }
  
  // Append the collapsed toolbar to the document
  document.body.appendChild(collapsedToolbar);

  // Add click event to expand toolbar
  collapsedToolbar.addEventListener('click', function(e) {
    // Only expand if not dragging
    if (!isDragging) {
      toggleToolbarCollapse(false); // Expand the toolbar
    }
  });

  // Make collapsed toolbar draggable with proper error handling
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialLeft = null;
  let initialTop = null;
  let initialRight = null;
  let initialBottom = null;

  collapsedToolbar.addEventListener('mousedown', function(e) {
    isDragging = true;
    collapsedToolbar.style.cursor = 'grabbing';
    
    // Get initial positions
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    
    try {
      // Get current position in pixels
      const style = window.getComputedStyle(collapsedToolbar);
      initialLeft = style.left !== 'auto' ? parseInt(style.left, 10) : null;
      initialRight = style.right !== 'auto' ? parseInt(style.right, 10) : null;
      initialTop = style.top !== 'auto' ? parseInt(style.top, 10) : null;
      initialBottom = style.bottom !== 'auto' ? parseInt(style.bottom, 10) : null;
    } catch (error) {
      console.error('Error getting computed style:', error);
      initialLeft = null;
      initialRight = 10;
      initialTop = 10;
      initialBottom = null;
    }
    
    // If we don't have positioning info, default to current position
    if (initialLeft === null && initialRight === null) {
      initialRight = 10;
    }
    if (initialTop === null && initialBottom === null) {
      initialTop = 10;
    }
    
    e.preventDefault();
  });

  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    
    try {
      // Calculate new position
      const moveX = e.clientX - dragStartX;
      const moveY = e.clientY - dragStartY;
      
      // Position based on movement
      if (initialRight !== null) {
        // We were using right positioning
        collapsedToolbar.style.right = Math.max(10, initialRight - moveX) + 'px';
        collapsedToolbar.style.left = 'auto';
      } else {
        // We were using left positioning
        collapsedToolbar.style.left = Math.max(10, initialLeft + moveX) + 'px';
        collapsedToolbar.style.right = 'auto';
      }
      
      if (initialBottom !== null) {
        // We were using bottom positioning
        collapsedToolbar.style.bottom = Math.max(10, initialBottom - moveY) + 'px';
        collapsedToolbar.style.top = 'auto';
      } else {
        // We were using top positioning
        collapsedToolbar.style.top = Math.max(10, initialTop + moveY) + 'px';
        collapsedToolbar.style.bottom = 'auto';
      }
      
      // Prevent dragging off-screen
      const rect = collapsedToolbar.getBoundingClientRect();
      if (rect.left < 10) collapsedToolbar.style.left = '10px';
      if (rect.top < 10) collapsedToolbar.style.top = '10px';
      if (rect.right > window.innerWidth - 10) 
        collapsedToolbar.style.right = '10px';
      if (rect.bottom > window.innerHeight - 10) 
        collapsedToolbar.style.bottom = '10px';
    } catch (error) {
      console.error('Error during drag:', error);
      isDragging = false;
    }
    
    e.preventDefault();
  });

  document.addEventListener('mouseup', function() {
    if (isDragging) {
      isDragging = false;
      collapsedToolbar.style.cursor = 'pointer';
      
      // Save position to localStorage for persistence with error handling
      try {
        const rect = collapsedToolbar.getBoundingClientRect();
        const position = {
          left: rect.left < window.innerWidth / 2,
          top: rect.top < window.innerHeight / 2
        };
        localStorage.setItem('webCanvasToolbarPosition', JSON.stringify(position));
      } catch (e) {
        console.error('Failed to save toolbar position', e);
      }
    }
  });

  // Add enhanced touch support for drag with error handling
  collapsedToolbar.addEventListener('touchstart', function(e) {
    isDragging = true;
    
    try {
      // Get initial positions
      const touch = e.touches[0];
      dragStartX = touch.clientX;
      dragStartY = touch.clientY;
      
      // Get current position in pixels
      const style = window.getComputedStyle(collapsedToolbar);
      initialLeft = style.left !== 'auto' ? parseInt(style.left, 10) : null;
      initialRight = style.right !== 'auto' ? parseInt(style.right, 10) : null;
      initialTop = style.top !== 'auto' ? parseInt(style.top, 10) : null;
      initialBottom = style.bottom !== 'auto' ? parseInt(style.bottom, 10) : null;
    } catch (error) {
      console.error('Error getting touch computed style:', error);
      initialLeft = null;
      initialRight = 10;
      initialTop = 10;
      initialBottom = null;
    }
    
    // If we don't have positioning info, default to current position
    if (initialLeft === null && initialRight === null) {
      initialRight = 10;
    }
    if (initialTop === null && initialBottom === null) {
      initialTop = 10;
    }
    
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchmove', function(e) {
    if (!isDragging) return;
    
    try {
      const touch = e.touches[0];
      
      // Calculate new position
      const moveX = touch.clientX - dragStartX;
      const moveY = touch.clientY - dragStartY;
      
      // Position based on movement
      if (initialRight !== null) {
        // We were using right positioning
        collapsedToolbar.style.right = Math.max(10, initialRight - moveX) + 'px';
        collapsedToolbar.style.left = 'auto';
      } else {
        // We were using left positioning
        collapsedToolbar.style.left = Math.max(10, initialLeft + moveX) + 'px';
        collapsedToolbar.style.right = 'auto';
      }
      
      if (initialBottom !== null) {
        // We were using bottom positioning
        collapsedToolbar.style.bottom = Math.max(10, initialBottom - moveY) + 'px';
        collapsedToolbar.style.top = 'auto';
      } else {
        // We were using top positioning
        collapsedToolbar.style.top = Math.max(10, initialTop + moveY) + 'px';
        collapsedToolbar.style.bottom = 'auto';
      }
      
      // Prevent dragging off-screen
      const rect = collapsedToolbar.getBoundingClientRect();
      if (rect.left < 10) collapsedToolbar.style.left = '10px';
      if (rect.top < 10) collapsedToolbar.style.top = '10px';
      if (rect.right > window.innerWidth - 10) 
        collapsedToolbar.style.right = '10px';
      if (rect.bottom > window.innerHeight - 10) 
        collapsedToolbar.style.bottom = '10px';
    } catch (error) {
      console.error('Error during touch drag:', error);
      isDragging = false;
    }
    
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchend', function() {
    if (isDragging) {
      isDragging = false;
      
      // Save position to localStorage for persistence with error handling
      try {
        const rect = collapsedToolbar.getBoundingClientRect();
        const position = {
          left: rect.left < window.innerWidth / 2,
          top: rect.top < window.innerHeight / 2
        };
        localStorage.setItem('webCanvasToolbarPosition', JSON.stringify(position));
      } catch (e) {
        console.error('Failed to save toolbar position on touch end', e);
      }
    }
  });
  
  // Try to restore previous toolbar position
  try {
    const savedPosition = localStorage.getItem('webCanvasToolbarPosition');
    if (savedPosition) {
      try {
        const position = JSON.parse(savedPosition);
        
        // Position in saved corner with error handling
        if (position && typeof position === 'object') {
          if (position.left) {
            collapsedToolbar.style.left = '10px';
            collapsedToolbar.style.right = 'auto';
          } else {
            collapsedToolbar.style.right = '10px';
            collapsedToolbar.style.left = 'auto';
          }
          
          if (position.top) {
            collapsedToolbar.style.top = '10px';
            collapsedToolbar.style.bottom = 'auto';
          } else {
            collapsedToolbar.style.bottom = '10px';
            collapsedToolbar.style.top = 'auto';
          }
        }
      } catch (parseError) {
        console.error('Failed to parse saved toolbar position, using default position', parseError);
        // Use default position if parsing fails
        collapsedToolbar.style.right = '10px';
        collapsedToolbar.style.top = '10px';
      }
    }
  } catch (e) {
    console.error('Failed to restore toolbar position, using default position', e);
    // Use default position if restore fails
    collapsedToolbar.style.right = '10px';
    collapsedToolbar.style.top = '10px';
  }
  
  // Tools section
  const toolsSection = document.createElement('div');
  toolsSection.style.marginBottom = '10px';
  
  const toolsTitle = document.createElement('div');
  toolsTitle.textContent = 'Tools';
  toolsTitle.style.fontWeight = 'bold';
  toolsTitle.style.marginBottom = '5px';
  toolsTitle.style.color = '#333';
  toolsSection.appendChild(toolsTitle);
  
  const toolsContainer = document.createElement('div');
  toolsContainer.style.display = 'flex';
  toolsContainer.style.gap = '5px';
  
  // Pen tool button
  const penButton = document.createElement('button');
  penButton.textContent = '✏️ Pen';
  penButton.style.backgroundColor = '#f5f5f5';
  penButton.style.border = '1px solid #ddd';
  penButton.style.borderRadius = '4px';
  penButton.style.padding = '8px 12px';
  penButton.style.cursor = 'pointer';
  penButton.dataset.tool = 'pen';
  penButton.style.transition = 'background-color 0.2s';
  penButton.classList.add('tool-button', 'active');
  
  // Brush tool button
  const brushButton = document.createElement('button');
  brushButton.textContent = '🖌️ Brush';
  brushButton.style.backgroundColor = '#f5f5f5';
  brushButton.style.border = '1px solid #ddd';
  brushButton.style.borderRadius = '4px';
  brushButton.style.padding = '8px 12px';
  brushButton.style.cursor = 'pointer';
  brushButton.dataset.tool = 'brush';
  brushButton.style.transition = 'background-color 0.2s';
  brushButton.classList.add('tool-button');
  
  toolsContainer.appendChild(penButton);
  toolsContainer.appendChild(brushButton);
  toolsSection.appendChild(toolsContainer);
  toolbar.appendChild(toolsSection);
  
  // Size section
  const sizeSection = document.createElement('div');
  sizeSection.style.marginBottom = '10px';
  
  const sizeTitle = document.createElement('div');
  sizeTitle.textContent = 'Size';
  sizeTitle.style.fontWeight = 'bold';
  sizeTitle.style.marginBottom = '5px';
  sizeTitle.style.color = '#333';
  sizeSection.appendChild(sizeTitle);
  
  const sizeContainer = document.createElement('div');
  sizeContainer.style.display = 'flex';
  sizeContainer.style.alignItems = 'center';
  sizeContainer.style.gap = '10px';
  
  const sizeSlider = document.createElement('input');
  sizeSlider.type = 'range';
  sizeSlider.min = '1';
  sizeSlider.max = '20';
  sizeSlider.value = '5';
  sizeSlider.style.width = '100px';
  
  const sizeDisplay = document.createElement('span');
  sizeDisplay.textContent = '5px';
  sizeDisplay.style.minWidth = '40px';
  sizeDisplay.style.textAlign = 'center';
  
  sizeContainer.appendChild(sizeSlider);
  sizeContainer.appendChild(sizeDisplay);
  sizeSection.appendChild(sizeContainer);
  toolbar.appendChild(sizeSection);
  
  // Color section
  const colorSection = document.createElement('div');
  colorSection.style.marginBottom = '10px';
  
  const colorTitle = document.createElement('div');
  colorTitle.textContent = 'Colors';
  colorTitle.style.fontWeight = 'bold';
  colorTitle.style.marginBottom = '5px';
  colorTitle.style.color = '#333';
  colorSection.appendChild(colorTitle);
  
  const colorContainer = document.createElement('div');
  colorContainer.style.display = 'flex';
  colorContainer.style.flexWrap = 'wrap';
  colorContainer.style.gap = '8px';
  
  const colors = [
    { hex: '#f44336', name: 'Red' },
    { hex: '#2196f3', name: 'Blue' },
    { hex: '#4caf50', name: 'Green' },
    { hex: '#ff9800', name: 'Orange' },
    { hex: '#9c27b0', name: 'Purple' },
    { hex: '#ffeb3b', name: 'Yellow' },
    { hex: '#000000', name: 'Black' },
    { hex: '#ffffff', name: 'White' }
  ];
  
  colors.forEach(color => {
    const colorButton = document.createElement('button');
    colorButton.style.width = '30px';
    colorButton.style.height = '30px';
    colorButton.style.backgroundColor = color.hex;
    colorButton.style.border = color.hex === '#ffffff' ? '1px solid #ddd' : 'none';
    colorButton.style.borderRadius = '50%';
    colorButton.style.cursor = 'pointer';
    colorButton.dataset.color = color.hex;
    colorButton.title = color.name;
    colorButton.style.transition = 'transform 0.2s';
    colorButton.classList.add('color-button');
    if (color.hex === currentColor) {
      colorButton.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.2)';
    }
    colorContainer.appendChild(colorButton);
  });
  
  colorSection.appendChild(colorContainer);
  toolbar.appendChild(colorSection);
  
  // Action buttons
  const actionContainer = document.createElement('div');
  actionContainer.style.display = 'flex';
  actionContainer.style.gap = '5px';
  actionContainer.style.marginTop = '10px';
  
  const clearButton = document.createElement('button');
  clearButton.textContent = '🗑️ Clear';
  clearButton.style.backgroundColor = '#f5f5f5';
  clearButton.style.border = '1px solid #ddd';
  clearButton.style.borderRadius = '4px';
  clearButton.style.padding = '8px 12px';
  clearButton.style.cursor = 'pointer';
  clearButton.style.flexGrow = '1';
  
  const closeButton = document.createElement('button');
  closeButton.textContent = '❌ Close';
  closeButton.style.backgroundColor = '#f5f5f5';
  closeButton.style.border = '1px solid #ddd';
  closeButton.style.borderRadius = '4px';
  closeButton.style.padding = '8px 12px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.flexGrow = '1';
  
  actionContainer.appendChild(clearButton);
  actionContainer.appendChild(closeButton);
  toolbar.appendChild(actionContainer);
  
  // Add event listeners for toolbar functionality
  
  // Tool buttons
  const toolButtons = toolbar.querySelectorAll('.tool-button');
  toolButtons.forEach(button => {
    button.addEventListener('click', function() {
      toolButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.style.backgroundColor = '#f5f5f5';
      });
      this.classList.add('active');
      this.style.backgroundColor = '#e0e0e0';
      currentTool = this.dataset.tool;
    });
  });
  
  // Size slider
  sizeSlider.addEventListener('input', function() {
    currentSize = this.value;
    sizeDisplay.textContent = `${this.value}px`;
  });
  
  // Color buttons
  const colorButtons = toolbar.querySelectorAll('.color-button');
  colorButtons.forEach(button => {
    button.addEventListener('click', function() {
      colorButtons.forEach(btn => {
        btn.style.boxShadow = 'none';
        btn.style.transform = 'scale(1)';
      });
      this.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.2)';
      this.style.transform = 'scale(1.1)';
      currentColor = this.dataset.color;
    });
    
    // Add hover effect
    button.addEventListener('mouseover', function() {
      if (this.dataset.color !== currentColor) {
        this.style.transform = 'scale(1.1)';
      }
    });
    
    button.addEventListener('mouseout', function() {
      if (this.dataset.color !== currentColor) {
        this.style.transform = 'scale(1)';
      }
    });
  });
  
  // Clear button
  clearButton.addEventListener('click', clearCanvas);
  
  // Close button
  closeButton.addEventListener('click', function() {
    toggleDrawingMode(false);
  });
  
  document.body.appendChild(toolbar);
}

function createActivationIndicator() {
  activationIndicator = document.createElement('div');
  activationIndicator.id = 'web-canvas-indicator';
  activationIndicator.style.position = 'fixed';
  activationIndicator.style.bottom = '10px';
  activationIndicator.style.right = '10px';
  activationIndicator.style.backgroundColor = '#4285f4';
  activationIndicator.style.color = 'white';
  activationIndicator.style.padding = '8px 12px';
  activationIndicator.style.borderRadius = '4px';
  activationIndicator.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  activationIndicator.style.zIndex = '2147483647'; // Maximum z-index to ensure it's on top
  activationIndicator.style.display = 'none';
  activationIndicator.style.fontFamily = 'Arial, sans-serif';
  activationIndicator.style.fontSize = '14px';
  activationIndicator.style.userSelect = 'none';
  activationIndicator.style.opacity = '0.9';
  activationIndicator.innerHTML = isMac ? 
    'Press <b>⌥+D</b> to activate drawing tools' : 
    'Press <b>Alt+D</b> to activate drawing tools';
  
  document.body.appendChild(activationIndicator);
  
  // Show the indicator more prominently when the extension is loaded
  activationIndicator.style.display = 'block';
  setTimeout(() => {
    // Hide after 8 seconds if drawing mode isn't activated
    if (!drawingModeActive) {
      activationIndicator.style.display = 'none';
    }
  }, 8000);
}

function showInitialInstructions() {
  // Function intentionally disabled to remove keyboard shortcut notifications
  // Do nothing
  return;
}

function updateActiveButton(selector, activeButton) {
  const buttons = document.querySelectorAll(selector);
  buttons.forEach(button => {
    if (selector === '.color-button') {
      button.style.boxShadow = button === activeButton ? '0 0 0 3px #4285f4' : 'none';
    } else if (selector === '.tool-button') {
      button.style.backgroundColor = button === activeButton ? '#e6f2ff' : '#fff';
      button.style.border = button === activeButton ? '2px solid #4285f4' : '1px solid #ccc';
    }
  });
}

function handleKeyDown(e) {
  console.log(`Web Canvas: Key pressed - key: ${e.key}, altKey: ${e.altKey}, ctrlKey: ${e.ctrlKey}, metaKey: ${e.metaKey}`);
  
  // Toggle canvas visibility with Alt+D
  if (e.key.toLowerCase() === ACTIVATION_KEY.key.toLowerCase() && e.altKey === ACTIVATION_KEY.altKey) {
    console.log('Web Canvas: Activation key combination detected');
    toggleDrawingMode();
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
  
  // Hide canvas with Escape
  if (e.key === HIDE_KEY.key && drawingModeActive) {
    console.log('Web Canvas: Hide key detected');
    toggleDrawingMode(false);
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
  
  // Clear canvas with Alt+C
  if (e.key.toLowerCase() === CLEAR_KEY.key.toLowerCase() && e.altKey === CLEAR_KEY.altKey && drawingModeActive) {
    console.log('Web Canvas: Clear key combination detected');
    clearCanvas();
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
  
  // Add Alt + A for AI analysis
  if (e.key.toLowerCase() === 'a' && e.altKey) {
    e.preventDefault();
    if (drawingModeActive) {
      chrome.runtime.sendMessage({action: "analyzeDrawing", data: collectDrawingData()});
    }
  }
}

function toggleCanvas() {
  toggleDrawingMode();
}

// Alternative activation method - clicks
document.addEventListener('click', function(e) {
  // Check if Alt key is pressed during click
  if (e.altKey && !drawingModeActive) {
    console.log('Web Canvas: Alt+Click detected, activating drawing mode');
    toggleDrawingMode(true);
  }
});

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawingHistory = [];
  showNotification('Canvas cleared!');
}

function startDrawing(e) {
  if (!drawingModeActive) return;
  
  // Collapse toolbar when drawing starts
  if (!toolbarCollapsed) {
    toggleToolbarCollapse(true);
  }
  
  isDrawing = true;
  lastX = e.clientX;
  lastY = e.clientY;
  
  // Start a new path
  ctx.beginPath();
  
  // For dot drawing, draw a circle at click point
  ctx.fillStyle = currentColor;
  
  // Different dot appearance based on tool
  if (currentTool === 'pen') {
    // Square dot for pen
    ctx.fillRect(lastX - currentSize/2, lastY - currentSize/2, currentSize, currentSize);
  } else {
    // Round dot for brush
    ctx.arc(lastX, lastY, currentSize/2, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Begin a new path for subsequent drawing
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  
  console.log('Drawing started at:', lastX, lastY);
}

function draw(e) {
  if (!isDrawing || !drawingModeActive) return;
  
  // Current position
  const currentX = e.clientX;
  const currentY = e.clientY;
  
  // Set drawing properties
  ctx.strokeStyle = currentColor;
  ctx.lineWidth = currentSize;
  
  if (currentTool === 'pen') {
    // Pen tool - crisp lines with square caps
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    
    // Draw straight line with consistent width
    ctx.lineWidth = currentSize;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
  } else if (currentTool === 'brush') {
    // Brush tool - smooth, painterly lines
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Calculate movement speed for variable brush width
    const dx = currentX - lastX;
    const dy = currentY - lastY;
    const speed = Math.sqrt(dx * dx + dy * dy);
    
    // Adjust line width slightly based on speed (thinner when moving fast)
    const speedFactor = Math.max(0.7, Math.min(1.3, 1 - speed / 100));
    ctx.lineWidth = currentSize * speedFactor;
    
    // Draw curved line for brush
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.quadraticCurveTo(
      (lastX + currentX) / 2, 
      (lastY + currentY) / 2, 
      currentX, 
      currentY
    );
    ctx.stroke();
  }
  
  // Update position for next draw call
  lastX = currentX;
  lastY = currentY;
}

function stopDrawing() {
  if (isDrawing) {
    console.log('Drawing stopped');
    
    isDrawing = false;
    ctx.beginPath(); // End the current path
    
    // Save drawing to history
    saveDrawingToHistory();
  }
}

function saveDrawingToHistory() {
  // Add current drawing to history
  try {
    const imageData = canvas.toDataURL('image/png');
    drawingHistory.push(imageData);
    
    // Limit history size to prevent memory issues
    if (drawingHistory.length > 20) {
      drawingHistory.shift();
    }
  } catch (e) {
    console.error('Error saving drawing to history:', e);
  }
}

// Touch support for mobile devices
function handleTouchStart(e) {
  if (!drawingModeActive) return;
  
  // Collapse toolbar when drawing starts on touch
  if (!toolbarCollapsed) {
    toggleToolbarCollapse(true);
  }
  
  e.preventDefault(); // Prevent scrolling while drawing
  
  const touch = e.touches[0];
  lastX = touch.clientX;
  lastY = touch.clientY;
  isDrawing = true;
  
  // Draw a dot at the touch point based on tool
  ctx.beginPath();
  ctx.fillStyle = currentColor;
  
  if (currentTool === 'pen') {
    // Square dot for pen
    ctx.fillRect(lastX - currentSize/2, lastY - currentSize/2, currentSize, currentSize);
  } else {
    // Round dot for brush
    ctx.arc(lastX, lastY, currentSize/2, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Begin a new path for subsequent drawing
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  
  console.log('Touch drawing started at:', lastX, lastY);
}

function handleTouchMove(e) {
  if (!isDrawing || !drawingModeActive) return;
  
  e.preventDefault(); // Prevent scrolling while drawing
  
  const touch = e.touches[0];
  const currentX = touch.clientX;
  const currentY = touch.clientY;
  
  // Set drawing properties
  ctx.strokeStyle = currentColor;
  
  if (currentTool === 'pen') {
    // Pen tool - crisp lines with square caps
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    ctx.lineWidth = currentSize;
    
    // Draw straight line with consistent width
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
  } else if (currentTool === 'brush') {
    // Brush tool - smooth, painterly lines
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Calculate movement speed for variable brush width
    const dx = currentX - lastX;
    const dy = currentY - lastY;
    const speed = Math.sqrt(dx * dx + dy * dy);
    
    // Adjust line width slightly based on speed (thinner when moving fast)
    const speedFactor = Math.max(0.7, Math.min(1.3, 1 - speed / 100));
    ctx.lineWidth = currentSize * speedFactor;
    
    // Draw curved line for brush
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.quadraticCurveTo(
      (lastX + currentX) / 2, 
      (lastY + currentY) / 2, 
      currentX, 
      currentY
    );
    ctx.stroke();
  }
  
  // Update position for next draw call
  lastX = currentX;
  lastY = currentY;
}

function handleTouchEnd(e) {
  if (isDrawing) {
    isDrawing = false;
    ctx.beginPath(); // End the current path
    
    // Save drawing to history
    saveDrawingToHistory();
    
    console.log('Touch drawing stopped');
  }
}

function handleResize() {
  if (canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    redrawCanvas();
  }
}

function toggleDrawingMode(forceState = null) {
  // Initialize if not already done
  if (!isInitialized) {
    initializeDrawingTool();
  }
  
  // If forceState is provided, use that instead of toggling
  if (forceState !== null) {
    drawingModeActive = forceState;
  } else {
    drawingModeActive = !drawingModeActive;
  }
  
  console.log(`Web Canvas: Drawing mode ${drawingModeActive ? 'activated' : 'deactivated'}`);
  
  // Update canvas and toolbar visibility
  canvas.style.display = drawingModeActive ? 'block' : 'none';
  const toolbar = document.getElementById('web-canvas-toolbar');
  const collapsedToolbar = document.getElementById('web-canvas-toolbar-collapsed');
  
  if (drawingModeActive) {
    // Reset toolbar collapsed state when activating
    toolbarCollapsed = false;
    
    // Show the toolbar with animation
    toolbar.style.display = 'block';
    collapsedToolbar.style.display = 'none';
    
    // Use setTimeout to ensure display:block takes effect before changing opacity
    setTimeout(() => {
      toolbar.style.opacity = '1';
      toolbar.style.transform = 'scale(1)';
    }, 10);
    
    // Enable drawing on canvas
    canvas.style.pointerEvents = 'auto';
    
    // Add drawing event listeners when canvas is visible
    canvas.addEventListener('mousedown', startDrawing);
    document.addEventListener('mousemove', draw);
    document.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Add touch event listeners
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    
    // Show activation notification
    showNotification('Drawing mode activated! Use the toolbar to draw on the page.');
    
    toolbarVisible = true;
    
    // If this is the first activation, add a delayed notification with more instructions
    if (localStorage.getItem('webCanvasFirstActivation') !== 'true') {
      setTimeout(() => {
        showNotification('Click and drag to draw. Use toolbar to change colors and tools.');
        localStorage.setItem('webCanvasFirstActivation', 'true');
      }, 3000);
    }
  } else {
    // Hide both toolbars with animation
    toolbar.style.opacity = '0';
    collapsedToolbar.style.opacity = '0';
    
    setTimeout(() => {
      toolbar.style.display = 'none';
      collapsedToolbar.style.display = 'none';
    }, 300); // Wait for opacity transition to complete
    
    // Disable drawing on canvas (but keep drawings visible if any)
    canvas.style.pointerEvents = 'none';
    
    // Remove drawing event listeners when canvas is hidden
    canvas.removeEventListener('mousedown', startDrawing);
    document.removeEventListener('mousemove', draw);
    document.removeEventListener('mouseup', stopDrawing);
    canvas.removeEventListener('mouseout', stopDrawing);
    
    // Remove touch event listeners
    canvas.removeEventListener('touchstart', handleTouchStart);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
    
    toolbarVisible = false;
  }
  
  // Report state change to background script
  try {
    chrome.runtime.sendMessage({
      action: "reportState",
      isActive: drawingModeActive
    }, function(response) {
      // Handle errors gracefully
      if (chrome.runtime.lastError) {
        console.log('Error reporting state to background: ', chrome.runtime.lastError.message);
        // Continue execution even if the message fails
      }
    });
  } catch (e) {
    console.error('Error sending state message:', e);
  }
  
  return drawingModeActive;
}

function showNotification(message) {
  // Function intentionally disabled
  // Do nothing
  return;
}

function redrawCanvas() {
  if (drawingHistory.length === 0) return;
  
  const img = new Image();
  img.onload = function() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
  img.src = drawingHistory[drawingHistory.length - 1];
}

function handleKeyPress(e) {
  console.log('Key pressed:', e.key, e.altKey, e.code);
  
  // Alt+D to toggle drawing mode
  if (e.altKey && (e.key.toLowerCase() === 'd' || e.code === 'KeyD')) {
    console.log('Web Canvas: Alt+D detected, toggling drawing mode');
    e.preventDefault();
    toggleDrawingMode();
  }
  
  // Alt+C to clear canvas
  if (e.altKey && (e.key.toLowerCase() === 'c' || e.code === 'KeyC')) {
    e.preventDefault();
    if (drawingModeActive) {
      clearCanvas();
    }
  }
  
  // Escape to close drawing mode
  if (e.key === 'Escape') {
    if (drawingModeActive) {
      toggleDrawingMode(false);
    }
  }
}

function handleAltClick(e) {
  if (e.altKey) {
    console.log('Web Canvas: Alt+Click detected, toggling drawing mode');
    e.preventDefault();
    toggleDrawingMode();
  }
}

// Separate function to add canvas event listener override - only call after canvas exists
function addCanvasEventListenerOverride() {
  if (canvas) {
    // Make sure mouse events work properly on canvas by extending the drawing functions
    canvas.addEventListener = function(event, handler, options) {
      console.log(`Web Canvas: Adding ${event} event listener to canvas`);
      HTMLCanvasElement.prototype.addEventListener.call(this, event, handler, options);
    };
  }
}

// Initialize on page load to ensure everything is ready
window.addEventListener('load', function() {
  try {
    // Special handling for about:blank pages
    if (window.location.href === 'about:blank' || window.location.href.startsWith('about:blank?')) {
      console.log('Web Canvas: Special load handling for about:blank page');
      
      // First attempt
      prepareAboutBlankPage();
      init();
      
      // Second attempt with delay
      setTimeout(() => {
        if (!isInitialized) {
          console.log('Web Canvas: Extra initialization for about:blank');
          prepareAboutBlankPage();
          initializeDrawingTool();
          
          // Final check - force drawing tool to be ready
          setTimeout(() => {
            if (!isInitialized) {
              console.error('Web Canvas: Still not initialized, final attempt');
              try {
                initializeDrawingTool();
              } catch (e) {
                console.error('Web Canvas: Final initialization error', e);
              }
            }
          }, 500);
        }
      }, 300);
      
      // Add special notification for about:blank pages
      setTimeout(() => {
        if (document.body) {
          const notification = document.createElement('div');
          notification.style.cssText = `
            position: fixed !important;
            top: 20px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            background-color: rgba(0, 0, 0, 0.8) !important;
            color: white !important;
            padding: 10px 15px !important;
            border-radius: 4px !important;
            font-size: 14px !important;
            z-index: 2147483647 !important;
            font-family: Arial, sans-serif !important;
          `;
          notification.textContent = `Press ${isMac ? '⌥+D (Option+D)' : 'Alt+D'} to start drawing`;
          document.body.appendChild(notification);
          
          setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s';
            setTimeout(() => {
              if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
              }
            }, 500);
          }, 5000);
        }
      }, 1000);
    } else {
      init();
    }
    console.log('Web Canvas: Initialized on page load');
  } catch (error) {
    console.error('Web Canvas: Error during initialization', error);
    // Attempt recovery
    try {
      init();
    } catch (e) {
      console.error('Web Canvas: Recovery failed', e);
    }
  }
});

// Direct initialization if the page is already loaded
if (document.readyState === 'complete') {
  try {
    init();
    
    // Special handling for about:blank
    if ((window.location.href === 'about:blank' || window.location.href.startsWith('about:blank?')) 
        && !isInitialized) {
      console.log('Web Canvas: Immediate initialization for about:blank');
      prepareAboutBlankPage();
      initializeDrawingTool();
      
      // Notification has been removed to comply with user's request
    }
    
    console.log('Web Canvas: Initialized immediately');
  } catch (error) {
    console.error('Web Canvas: Error during immediate initialization', error);
  }
}

// Export a global function for testing
window.webCanvasInit = init;

// Function to toggle toolbar collapse state
function toggleToolbarCollapse(collapsed = null) {
  // If collapsed is null, toggle the current state
  if (collapsed === null) {
    toolbarCollapsed = !toolbarCollapsed;
  } else {
    toolbarCollapsed = collapsed;
  }
  
  const toolbar = document.getElementById('web-canvas-toolbar');
  const collapsedToolbar = document.getElementById('web-canvas-toolbar-collapsed');
  
  if (toolbarCollapsed) {
    // Hide the full toolbar
    toolbar.style.opacity = '0';
    toolbar.style.transform = 'scale(0.5)';
    setTimeout(() => {
      toolbar.style.display = 'none';
      
      // Show the collapsed toolbar
      collapsedToolbar.style.display = 'flex';
      setTimeout(() => {
        collapsedToolbar.style.opacity = '1';
      }, 10);
    }, 300);
  } else {
    // Get current position of collapsed toolbar
    const collapsedRect = collapsedToolbar.getBoundingClientRect();
    
    // Position the full toolbar at the same position as the collapsed toolbar
    toolbar.style.top = 'auto';
    toolbar.style.right = 'auto';
    toolbar.style.bottom = 'auto';
    toolbar.style.left = 'auto';
    
    // Determine which corner to anchor from
    const isLeftHalf = collapsedRect.left < window.innerWidth / 2;
    const isTopHalf = collapsedRect.top < window.innerHeight / 2;
    
    if (isLeftHalf) {
      toolbar.style.left = collapsedRect.left + 'px';
    } else {
      toolbar.style.right = (window.innerWidth - collapsedRect.right) + 'px';
    }
    
    if (isTopHalf) {
      toolbar.style.top = collapsedRect.top + 'px';
    } else {
      toolbar.style.bottom = (window.innerHeight - collapsedRect.bottom) + 'px';
    }
    
    // Hide the collapsed toolbar
    collapsedToolbar.style.opacity = '0';
    setTimeout(() => {
      collapsedToolbar.style.display = 'none';
      
      // Show the full toolbar
      toolbar.style.display = 'block';
      setTimeout(() => {
        toolbar.style.opacity = '1';
        toolbar.style.transform = 'scale(1)';
      }, 10);
    }, 300);
  }
}

// Add drawing data collection
function collectDrawingData() {
  return {
    strokes: drawingHistory,
    currentTool: currentTool,
    currentColor: currentColor,
    currentSize: currentSize,
    timestamp: new Date().toISOString(),
    pageUrl: window.location.href
  };
}

// Add message listener for getting drawing data
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getDrawingData") {
    if (!canvas) {
      sendResponse({ error: "Canvas not initialized" });
      return true;
    }
    
    try {
      // Get the canvas data
      const dataUrl = canvas.toDataURL('image/png');
      sendResponse({ canvas: dataUrl });
    } catch (error) {
      console.error('Error getting canvas data:', error);
      sendResponse({ error: error.message });
    }
    return true;
  }
}); 