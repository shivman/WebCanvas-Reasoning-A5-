document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('apiKey');
  const saveButton = document.getElementById('saveApiKey');
  const statusDiv = document.getElementById('status');

  // Load saved API key
  try {
    const result = await chrome.storage.sync.get(['geminiApiKey']);
    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
      showStatus('API key is already set. You can update it if needed.', 'info');
    }
  } catch (error) {
    console.error('Error loading API key:', error);
    showStatus('Error loading API key', 'error');
  }

  // Save API key
  if (saveButton) {
    saveButton.addEventListener('click', async () => {
      const apiKey = apiKeyInput.value.trim();
      
      if (!apiKey) {
        showStatus('Please enter an API key', 'error');
        return;
      }

      try {
        // Save the API key
        await chrome.storage.sync.set({ geminiApiKey: apiKey });
        
        // Verify the key was saved
        const verification = await chrome.storage.sync.get(['geminiApiKey']);
        if (verification.geminiApiKey === apiKey) {
          showStatus('✅ API key saved successfully! You can now close this tab and start using the extension.', 'success');
          
          // Notify the extension that the API key has been updated
          chrome.runtime.sendMessage({ 
            action: 'apiKeyUpdated',
            apiKey: apiKey 
          });
        } else {
          throw new Error('API key verification failed');
        }
      } catch (error) {
        console.error('Error saving API key:', error);
        showStatus('Error saving API key: ' + error.message, 'error');
      }
    });
  }

  function showStatus(message, type) {
    if (statusDiv) {
      statusDiv.textContent = message;
      statusDiv.className = type;
      statusDiv.style.display = 'block';
      
      // For success message, keep it visible
      if (type === 'success') {
        saveButton.disabled = true;
        saveButton.style.opacity = '0.5';
      }
    }
  }
}); 