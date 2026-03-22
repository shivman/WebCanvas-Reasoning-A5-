// Store the drawing state for each tab
let drawingState = {};
let contextMenusInitialized = false;

// Helper function to check if a URL is a special page where content scripts can't run
function isSpecialPage(url) {
  return url && (
    url.startsWith('chrome://') || 
    url.startsWith('chrome-extension://') || 
    url.startsWith('edge://') || 
    // Allow about:blank pages, but block other about: pages
    (url.startsWith('about:') && !url.startsWith('about:blank'))
  );
}

// Context menu setup is handled at the bottom of the file

// Create a custom drawing tab with a data URL instead of trying to inject into about:blank
function openDrawingPage() {
  console.log("Starting openDrawingPage function");
  
  // Create the HTML content for the drawing page
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Web Canvas Drawing</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background-color: white;
      font-family: Arial, sans-serif;
    }
    
    #canvas {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1000;
      cursor: crosshair;
      background-color: white;
    }
    
    /* Custom cursor styles */
    .cursor-pen {
      cursor: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAMgSURBVFiF7ZZNTBNpGMd/M9Oy3dammgImQirEYkjhsIpJo94MW13NJl40cRN1D8aSLOwaL+rVxIPRiyczJt48qQdD4tF4MXHjTRJZkY1rdA1RU0wKKdIOZd7XQ+eyW8tXyc3/adrn4/d/nm+AgICAgICAnwq51Y5zc3MrS0tLvzqOc0BKGYnFYiQSif9qa2tLTdMsjo6O3k4mk1c3yzNM01zQNO2KaZr6nTt3ftVMnGEYB8Ph8JVoNPrtzZs3/1oul/+u7m9padnt9/uPNDQ0/FZVVfXL9eufj0UiEe3KlWsjR44cPe/z+fYrihKqPv76+vrjWCzWvby8/B7g2vDwsDTN9KnOzn23hoa+vujxeNrqNSrSnTv390SjjddCoTs/p1KpM9u2OacoymHTNN+EQqE2oDGRSDwxTTPX2dm53zTN3IkTJ44BeL3e2qmpqfGRkRFnaGjorXR3d8vJycnx9fX119FolFgslnccJwWQzWY/AKRSqTO6ru/s6OjYC1QOHz78V09Pj2swGJQAsjrJmDU5zc3NbQ6HKxP29fXJw8MTm5pVSllcH5VSKs3NzZ5qf2Zm5t319fXX+Xz+TbFY/PP58+erAImE+MjA4uJiI2AAzM7OflpdXX3T1dX1eWtrq3Po0CG7r69vp6Zpjm3bblVt1dvUdQGNSCl9rutWCvGimB0dHaVcLnextbV17+TkJOPj4ysSZGxsbPzJ+Pj4mXK5vA+4n0wmD1ar6wLUVhfmcrleKWWTpmmbCoXCE8dxDo6OjtpTU1OYpqnPz8/PAz8AX6xz29vJA7S1tZXa29svuq77e6lUshYWFtqrVY+MjCiBQDL5s9vdvRvIvnr18jXwMJlMHtyMgWKxmPX5fHR0dJSqtQ8PD0vDMPqllNcMw+jfajz5fN51Xfdhs4HRdX03oAEb7vn3UFS/3/+HrusXgO5cLncplUqdBchmsz8Fg2c9LS0t1wOBD4Oqqm5YCVVVVYQQDwzD6L9169ZAwzTTPZFI8+P+/tR7RVG+HJRS8uzZMzk9PT0+MzP7salpxy+pVOosgHRd915P45bw+/0HgPuGYWwMYUBAQED/fwD8DXKB2kKHbcGSAAAAAElFTkSuQmCC") 1 20, auto;
    }
    
    .cursor-brush {
      cursor: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAQ4SURBVFiF7ZZrTFNnGMd/p5QWaKFcCw6Q4WVu08WbGKML02S6uGXLHJs6v7DEZcs+kH0xy8g+mbCYkJCYJX5wolkWcUSzZcoE3IaBwgRCuY2LXAQKhastbU/P+/jhtCpgQaulH/Z/cs57zvO8z/P7v5fnPcfGf1zss8LDw8N9GhsbvYKDg0sCAwOTFxcXP42JibmVkJDw5P8BUFDQ1+dvaWnZI4SwqqmpSamoqNgTGBiccvbs2ZCenh6nzs7O4s2bNzd+lzIFBeUaVFVBUXBSVdLT0jqysrK+EEKs7gE7hRDDQggmJibq2tvb9+7ateto0bw8wxuKoqjJycljWVlZy32mXF5efiQkJOQioO3YsaM5MzPzVktLy96UlJQLOp3OsD5eUZT/XGWKyWQKUBRFnDt3TgghRFlZWcFZWT779OlTG8CTJ+R7c6uiENDQ0LAzLCwsT6fTGUZHR58UFBT0KYqy9bPT6XQGo9H4PCgoKHnbtm233717l+Li4j43N7d9MzMzT/8RX1dXl6PT6QyzHjx4cMFoNMZbrdZFgPj4+Ofr8wB2tbW1h4UQ7UII0dDQcFij0eQABAQEJB0/fvz8v1HuISEh36SlpfXMzs5OGwyGBwDl5eVvLi4u4uXlxfz8PA6OnpSWll4Ftra2tu5LTEzMnZqaeh4eHl66HufnwPDwsLurq+vhgICAJFVVcXJyorGx0X9sbMyzoaHhbW9v7yMAa2tr/oYh8PLymrJarf5CiCAhBB0dHbvi4+MvfS7fGiAoKOgtb29vM4BGo6GpqSk6KCjonaKiouvi4mJMcXFx6Zs3b+TU1FRnvV5/taysLH91dfWLGdjXAaampu4nJSVdB1AUhbt37249cuTIu5CQkG8AKioq9nt4eBSXlJT409TURHt7+0QkXJKSlvDw8Mj/LAMAIyMj3hqNZlKn0xlWVlaorq6OT09PvxYeHn4VoKysbL9W6/FGp9O9z8/P5+rVqw8/juuDwcTEhNvY2Ni1L2ZgiZmZmbsJCQmXpZRIKbl161ZEbm7unbi4uEsAFy9ePOjt7V2cn5/vp9fr77W1tT1ZiFkEvL29I8PDw3O+NABA7+zsrJOzs3MagBCCq1evRh47duwbIcR2AJ1OZ3B1dSUzM5OJiYmHoaGh0UDGxMTELRQlE/j1qwHMZnONlFJvMpkCgHApZTZAVVVV3OnTp3uTk5Ovzc3NMTo6isaVC+hp4GRICOdsNjdaW1v3AnsB63op+aSR2O12e01Nzbvu7u5KACklJpMpYGRkxLezs/MwgI+Pz+Tu3d/nhIS0vNZq7a02G91AHbAMGBcWXEpKiuvBgwe2nJycvZEZSW0ODvZKgF5X15K+vr4Xnp6e06GhofdPnj2zLzc3L+v19tvA2YSEWGdXV/X35GSd0QanAGlb9CxflpKcnO2YP+/j4/ODn59fsc1mswPMz883379/vyUiImL1xo0bDRsbstkevV5ZGV8Jm3WDvAAAAABJRU5ErkJggg==") 1 20, auto;
    }
    
    .cursor-eraser {
      cursor: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAL1SURBVFiF7ZZNaBNBFMd/M9lmu9m0SbXBolJs1YOGI1ZB8OJJ8eApeBE8iAqCeBEP6smTUDx58SB+gOJJEBEEldJSUayIWq2tja0aDJGmJpv92H0eNtvJxqTdrUb04H8Z5r035//bNzPvLWxoQ+uW8SdJtm/fUffixYvzGzduvD48PNw9Njb2KpfLjfX19T0YGhraV53vFxnR0dFxrLe3d9/g4OClbDb7uVAovAbo6uq6lk6nTwJ4nuflcrnHIyMjd5aVETZQ2traOnfs2OE+efLESiQSO4Du7u7rqVTqBEAmk7k9PDzcPTY29upPASzbt2+/0dTUdDSRSAD4PT09fQBdXV3XHz169HBiYmL0t/JXGy0tLd1DQ0MXcrnc94GBgVspgHQ6nQYOAzuB+OjoaOlPAHp6eq41NDTsDJtVb4ACSOD3HUADDaEPy7LKa9lRK1D1q4CO71A9VAAfXzQDLMSo1hoi8n0+n39WS4Cqqtbk5ORrgIODg5fC9mw2OwpQLBaJRCKWEGJJngSoApqm4bouQogFu8oB0jRNVVXVchzHU1XVKpVKC7lzc3OTwARAJBKxdF0vLQcIcKTjOF7gRJqmqQDBzYZNU1Ur6CuXy7hCOMvJr4kQwvU8b0nJFoSTgSNd1/V0XS/F4/GjpmkCMDc3NwkYpmkapmkakUjEikajRjweTwHE4/GjsVgsVavzmqnwfT9oqqqipmmYpmnMz88bQRvANE0jFotNOY4TW1G+pmmVmhcaDAk3gHg8ngqcBLhCuL7nYdg2hmEYtm0btm0btm0bgBGNRo1IJGIBaJqGaZpTlmWtykHNRyB8sEgkYmmapgZXzfd9wjAMAzDCvRluxWIxA1hOGTCB6WXzfkbBh6ZpGqZpGvikDf+Iqqqq63qpsqr/0QH/RyHBRxWC9nJzwWiapqmGYRiWZRlhf2B7nieBzwC2bT9f7fzNzc3vS6XSFCDHx8evdnZ2no9Go1dUVT1gWdbaAxzHmXFdd2Zubu6Bbdvf4vH4J8/zdmezWS1csQ1taF31A/zdqcH+ifQDAAAAAElFTkSuQmCC") 1 20, auto;
    }
    
    #toolbar {
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 10px;
      background-color: rgba(255, 255, 255, 0.95);
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      z-index: 1001;
    }
    
    .tool-section {
      margin-bottom: 10px;
    }
    
    .tool-title {
      font-weight: bold;
      margin-bottom: 5px;
      color: #333;
    }
    
    .tool-button {
      background-color: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 8px 12px;
      cursor: pointer;
      transition: background-color 0.2s;
      margin-right: 5px;
    }
    
    .tool-button.active {
      background-color: #e0e0e0;
    }
    
    .size-container {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .color-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .color-button {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      cursor: pointer;
      transition: transform 0.2s;
      border: 1px solid rgba(0,0,0,0.1);
    }
    
    .notification {
      display: none; /* Hide notifications completely */
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 2147483647;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      opacity: 0;
      transition: opacity 0.3s ease;
      font-family: Arial, sans-serif;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <canvas id="canvas" class="cursor-pen"></canvas>
  
  <div id="toolbar">
    <div class="tool-section">
      <div class="tool-title">Tools</div>
      <div class="tool-container">
        <button class="tool-button active" id="pen-tool">✏️ Pen</button>
        <button class="tool-button" id="brush-tool">🖌️ Brush</button>
        <button class="tool-button" id="eraser-tool">🧽 Eraser</button>
      </div>
    </div>
    
    <div class="tool-section">
      <div class="tool-title">Size</div>
      <div class="size-container">
        <input type="range" id="size-slider" min="1" max="20" value="5">
        <span id="size-display">5px</span>
      </div>
    </div>
    
    <div class="tool-section">
      <div class="tool-title">Colors</div>
      <div class="color-container" id="color-container"></div>
    </div>
    
    <div class="action-container">
      <button id="clear-button" class="tool-button">🗑️ Clear</button>
      <button id="save-button" class="tool-button">💾 Save</button>
    </div>
  </div>
  
  <div id="notification" class="notification"></div>
  
  <script>
    // Initialize variables
    let canvas = document.getElementById('canvas');
    let ctx = canvas.getContext('2d');
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let currentTool = 'pen';
    let currentColor = '#f44336';
    let currentSize = 5;
    let lastTimestamp = 0;
    let lastSpeed = 0;
    
    // Set up canvas
    function initCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = currentSize;
      ctx.strokeStyle = currentColor;
      ctx.fillStyle = currentColor;
    }
    
    // Set up color palette
    function setupColorPalette() {
      const colors = [
        '#f44336', // Red
        '#2196f3', // Blue
        '#4caf50', // Green
        '#ff9800', // Orange
        '#9c27b0', // Purple
        '#ffeb3b', // Yellow
        '#000000', // Black
        '#ffffff'  // White
      ];
      
      const container = document.getElementById('color-container');
      
      colors.forEach(function(color) {
        const button = document.createElement('button');
        button.className = 'color-button';
        button.style.backgroundColor = color;
        
        if (color === '#ffffff') {
          button.style.border = '1px solid #ddd';
        }
        
        button.onclick = function() {
          currentColor = color;
          document.querySelectorAll('.color-button').forEach(function(btn) {
            btn.style.boxShadow = 'none';
          });
          this.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.2)';
          ctx.strokeStyle = currentColor;
          ctx.fillStyle = currentColor;
        };
        
        container.appendChild(button);
      });
      
      // Default active color
      document.querySelector('.color-button').style.boxShadow = '0 0 0 3px rgba(0,0,0,0.2)';
    }
    
    // Set active tool
    function setActiveTool(tool, button) {
      currentTool = tool;
      
      document.querySelectorAll('.tool-button').forEach(function(btn) {
        btn.classList.remove('active');
      });
      
      button.classList.add('active');
      
      // Update cursor based on tool
      canvas.classList.remove('cursor-pen', 'cursor-brush', 'cursor-eraser');
      canvas.classList.add('cursor-' + tool);
      
      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    
    // Calculate speed of movement
    function calculateSpeed(x, y, timestamp) {
      if (lastTimestamp === 0) {
        lastTimestamp = timestamp;
        return 0;
      }
      
      const dx = x - lastX;
      const dy = y - lastY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const timeElapsed = timestamp - lastTimestamp;
      const speed = distance / (timeElapsed || 1);
      
      // Smoothen speed calculation
      lastSpeed = lastSpeed * 0.5 + speed * 0.5;
      lastTimestamp = timestamp;
      
      return lastSpeed;
    }
    
    // Start drawing
    function startDrawing(e) {
      isDrawing = true;
      lastTimestamp = 0;
      lastSpeed = 0;
      
      const rect = canvas.getBoundingClientRect();
      lastX = e.clientX - rect.left;
      lastY = e.clientY - rect.top;
      
      // Draw initial dot
      ctx.beginPath();
      
      if (currentTool === 'brush') {
        // Larger initial dot for brush
        ctx.arc(lastX, lastY, currentSize * 0.8, 0, Math.PI * 2);
      } else {
        ctx.arc(lastX, lastY, currentSize/2, 0, Math.PI * 2);
      }
      
      ctx.fill();
    }
    
    // Draw
    function draw(e) {
      if (!isDrawing) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Calculate speed for brush dynamics
      const speed = calculateSpeed(x, y, e.timeStamp);
      
      if (currentTool === 'brush') {
        // Brush tool with varying width based on speed
        const maxSpeedFactor = 2.0;
        const minSpeedFactor = 0.5;
        
        // Map speed to width factor
        let speedFactor = 1;
        if (speed > 0.1) {
          // Faster = thinner line
          speedFactor = Math.max(minSpeedFactor, 1 - (speed * 0.4));
        } else {
          // Slower = thicker line
          speedFactor = Math.min(maxSpeedFactor, 1 + (0.5 / (speed + 0.1)));
        }
        
        ctx.lineWidth = currentSize * speedFactor;
        
        // Add slight randomness for brush feel
        const jitter = Math.random() * 0.5;
        ctx.lineWidth *= (1 + jitter * 0.2);
        
        // Draw segments for a more textured look
        const steps = 3;
        const stepX = (x - lastX) / steps;
        const stepY = (y - lastY) / steps;
        
        for (let i = 0; i < steps; i++) {
          const pointX = lastX + stepX * i;
          const pointY = lastY + stepY * i;
          const nextX = lastX + stepX * (i + 1);
          const nextY = lastY + stepY * (i + 1);
          
          ctx.beginPath();
          ctx.moveTo(pointX, pointY);
          ctx.lineTo(nextX, nextY);
          ctx.stroke();
        }
      } else {
        // Standard pen with constant width
        ctx.lineWidth = currentSize;
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      
      lastX = x;
      lastY = y;
    }
    
    // Stop drawing
    function stopDrawing() {
      isDrawing = false;
      lastTimestamp = 0;
    }
    
    // Show notification - modified to do nothing
    function showNotification(message) {
      // Notification functionality disabled as requested
      // Do nothing
    }
    
    // Initialize
    initCanvas();
    setupColorPalette();
    
    // Add event handlers
    window.addEventListener('resize', initCanvas);
    
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    document.getElementById('pen-tool').addEventListener('click', function() {
      setActiveTool('pen', this);
    });
    
    document.getElementById('brush-tool').addEventListener('click', function() {
      setActiveTool('brush', this);
    });
    
    document.getElementById('eraser-tool').addEventListener('click', function() {
      setActiveTool('eraser', this);
    });
    
    const sizeSlider = document.getElementById('size-slider');
    const sizeDisplay = document.getElementById('size-display');
    
    sizeSlider.addEventListener('input', function() {
      currentSize = parseInt(this.value);
      ctx.lineWidth = currentSize;
      sizeDisplay.textContent = currentSize + 'px';
    });
    
    document.getElementById('clear-button').addEventListener('click', function() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Don't show notification
    });
    
    document.getElementById('save-button').addEventListener('click', function() {
      const link = document.createElement('a');
      link.download = 'drawing.png';
      link.href = canvas.toDataURL();
      link.click();
      // Don't show notification
    });
    
    // Don't show initial notification
  </script>
</body>
</html>`;

  // Create a data URL with the HTML content
  const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
  console.log("Created data URL, length:", dataUrl.length);
  
  // Create a new tab with the data URL
  try {
    chrome.tabs.create({ url: dataUrl }, function(newTab) {
      if (chrome.runtime.lastError) {
        console.error("Error creating tab:", chrome.runtime.lastError.message);
        return;
      }
      
      console.log("Created drawing tab:", newTab.id);
      
      // Store state that this is our drawing tab
      drawingState[newTab.id] = {
        isDrawingTab: true,
        drawingActive: true
      };
    });
  } catch (error) {
    console.error("Exception when creating tab:", error);
  }
}

// Helper function to send messages to the active tab
function sendMessageToActiveTab(message, callback) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs && tabs.length > 0) {
      // Check if we can run content scripts on this page
      if (isSpecialPage(tabs[0].url)) {
        console.log("Cannot send message to special page:", tabs[0].url);
        
        // Special handling for about:blank pages
        if (tabs[0].url === 'about:blank') {
          // Open a drawing tab instead
          openDrawingPage();
          if (callback) {
            callback({ success: true, message: "Created drawing tab for about:blank page" });
          }
          return;
        }
        
        if (callback) {
          callback({ success: false, error: "Cannot run on this page type" });
        }
        return;
      }
      
      try {
        chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
          if (chrome.runtime.lastError) {
            console.log("Error sending message to tab:", chrome.runtime.lastError.message);
            if (callback) {
              callback({ success: false, error: chrome.runtime.lastError.message });
            }
          } else if (callback) {
            callback(response);
          }
        });
      } catch (e) {
        console.error("Failed to send message to tab:", e);
        if (callback) {
          callback({ success: false, error: e.message });
        }
      }
    } else if (callback) {
      callback({ success: false, error: "No active tab found" });
    }
  });
}

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("Background script received message:", request);

  // Get the tab ID - either from the sender or the active tab
  let tabId = sender.tab ? sender.tab.id : null;
  
  // Handle different actions
  switch (request.action) {
    case "openDrawingPage":
      // Direct call to open a drawing page (from about:blank pages)
      console.log("Received direct request to open drawing page");
      openDrawingPage();
      sendResponse({ success: true, message: "Opening drawing page" });
      break;
      
    case "activateDrawing":
      // If message is from popup, we need to get the active tab first
      if (!tabId) {
        console.log("Activate drawing request from popup");
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (tabs && tabs.length > 0) {
            console.log("Found active tab:", tabs[0].url);
            // Check if we can run content scripts on this page
            if (isSpecialPage(tabs[0].url)) {
              // Special handling for about:blank
              if (tabs[0].url === 'about:blank') {
                console.log("Detected about:blank, opening drawing page");
                openDrawingPage();
                sendResponse({ success: true, message: "Created drawing tab for about:blank" });
              } else {
                console.log("Cannot activate drawing on special page:", tabs[0].url);
                sendResponse({ success: false, error: "Cannot run on this page type" });
              }
              return;
            }
            
            sendMessageToActiveTab({action: "activateDrawing"}, function(response) {
              console.log("Response from content script:", response);
              if (response && response.success) {
                // Store state for this tab
                drawingState[tabs[0].id] = true;
              }
              sendResponse(response || { success: false, error: "No response from content script" });
            });
          } else {
            console.log("No active tab found");
            sendResponse({ success: false, error: "No active tab found" });
          }
        });
        return true; // Indicate we'll respond asynchronously
      } else {
        // If message is from content script, just update state
        drawingState[tabId] = true;
        sendResponse({ success: true, isActive: true });
      }
      break;
      
    case "deactivateDrawing":
      if (!tabId) {
        sendMessageToActiveTab({action: "deactivateDrawing"}, function() {
          // Store state for this tab
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs && tabs.length > 0) {
              drawingState[tabs[0].id] = false;
            }
            sendResponse({ success: true, isActive: false });
          });
        });
        return true; // Indicate we'll respond asynchronously
      } else {
        // If message is from content script, just update state
        drawingState[tabId] = false;
        sendResponse({ success: true, isActive: false });
      }
      break;
      
    case "toggleDrawing":
      // Get the current state for this tab
      if (!tabId) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (tabs && tabs.length > 0) {
            tabId = tabs[0].id;
            
            // Special handling for about:blank pages
            if (tabs[0].url === 'about:blank') {
              openDrawingPage();
              sendResponse({ success: true, message: "Created drawing tab for about:blank" });
              return;
            }
            
            const currentState = drawingState[tabId] || false;
            const newState = !currentState;
            
            sendMessageToActiveTab({
              action: newState ? "activateDrawing" : "deactivateDrawing"
            }, function() {
              drawingState[tabId] = newState;
              sendResponse({ success: true, isActive: newState });
            });
          } else {
            sendResponse({ success: false, error: "No active tab found" });
          }
        });
        return true; // Indicate we'll respond asynchronously
      } else {
        const currentState = drawingState[tabId] || false;
        const newState = !currentState;
        drawingState[tabId] = newState;
        sendResponse({ success: true, isActive: newState });
      }
      break;
      
    case "getDrawingState":
      // Return the current drawing state for the active tab
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs && tabs.length > 0) {
          tabId = tabs[0].id;
          // Special handling for about:blank pages
          if (tabs[0].url === 'about:blank') {
            sendResponse({ 
              success: true, 
              isActive: false,
              isAboutBlank: true, 
              message: "This is an about:blank page. Click 'Activate Drawing' to open a drawing tab."
            });
            return;
          }
          
          sendResponse({ success: true, isActive: drawingState[tabId] || false });
        } else {
          sendResponse({ success: false, error: "No active tab found" });
        }
      });
      return true; // Indicate we'll respond asynchronously
      
    case "reportState":
      // Content script is reporting its state
      if (tabId) {
        drawingState[tabId] = request.isActive;
        sendResponse({ success: true });
      }
      break;
  }
});

// Listen for tab updates to reactivate drawing if needed
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  // Only care about complete page loads
  if (changeInfo.status === 'complete' && drawingState[tabId]) {
    // Don't try to reactivate on special pages
    if (isSpecialPage(tab.url)) {
      console.log("Skipping drawing reactivation on special page:", tab.url);
      return;
    }
    
    // If this tab had drawing activated, re-activate it
    try {
      chrome.tabs.sendMessage(tabId, { action: "activateDrawing" }, function(response) {
        if (chrome.runtime.lastError) {
          console.log("Error reactivating drawing:", chrome.runtime.lastError.message);
        }
      });
    } catch (e) {
      console.error("Failed to reactivate drawing:", e);
    }
  }
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener(function(tabId) {
  if (drawingState[tabId]) {
    delete drawingState[tabId];
  }
});

// Initialize extension
chrome.runtime.onInstalled.addListener(function() {
  console.log("Web Canvas extension installed");
});

// Create a new drawing tab
function createNewDrawingTab(originalTabId) {
  openDrawingPage();
}

// Create drawing page for about:blank
function createDrawingPage(tabId) {
  console.log("Opening drawing page");
  openDrawingPage();
}

// Initialize context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'drawOnPage',
      title: 'Draw on this page',
      contexts: ['page'],
      documentUrlPatterns: ['http://*/*', 'https://*/*']
    });
    chrome.contextMenus.create({
      id: 'newDrawingCanvas',
      title: 'New drawing canvas',
      contexts: ['page']
    });
    chrome.contextMenus.create({
      id: 'toggleDrawing',
      title: 'Toggle Drawing Mode',
      contexts: ['page']
    });
    chrome.contextMenus.create({
      id: 'clearCanvas',
      title: 'Clear Canvas',
      contexts: ['page']
    });
  });
});

// Handle ALL context menu clicks synchronously at the root level
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab) return;

  if (info.menuItemId === "drawOnPage") {
    if (!isSpecialPage(tab.url)) {
      chrome.scripting.executeScript({
         target: { tabId: tab.id },
         files: ["content.js"]
      }).catch(err => console.error("Failed to inject script:", err));
    }
  } else if (info.menuItemId === "newDrawingCanvas") {
    openDrawingPage();
  } else if (info.menuItemId === 'toggleDrawing') {
    chrome.tabs.sendMessage(tab.id, { action: 'toggleDrawing' }).catch(() => {});
  } else if (info.menuItemId === 'clearCanvas') {
    chrome.tabs.sendMessage(tab.id, { action: 'clearCanvas' }).catch(() => {});
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'apiKeyUpdated') {
    // Broadcast to all tabs that the API key has been updated
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        try {
          chrome.tabs.sendMessage(tab.id, {
            action: 'apiKeyUpdated',
            apiKey: request.apiKey
          });
        } catch (error) {
          console.debug('Could not send apiKeyUpdated to tab:', tab.id);
        }
      });
    });
  }
  return true; // Required for async response
});

// Handle extension installation/update
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details.reason);
});

// Handle commands (keyboard shortcuts)
chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0]) return;
    
    const tab = tabs[0];
    
    switch (command) {
      case 'toggle-drawing':
        try {
          chrome.tabs.sendMessage(tab.id, { action: 'toggleDrawing' });
        } catch (error) {
          console.error('Error toggling drawing:', error);
        }
        break;
      case 'clear-canvas':
        try {
          chrome.tabs.sendMessage(tab.id, { action: 'clearCanvas' });
        } catch (error) {
          console.error('Error clearing canvas:', error);
        }
        break;
    }
  });
}); 