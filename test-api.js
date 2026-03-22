// Test file for Gemini 2.0 Flash API connection
const API_KEY = 'YOUR_API_KEY'; // Replace with your actual API key

async function testGeminiAPI() {
    try {
        console.log('Testing Gemini 2.0 Flash API connection...');
        
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + API_KEY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: "Hello, this is a test message. Please respond with 'API connection successful' if you can read this."
                    }]
                }]
            })
        });

        const data = await response.json();
        console.log('API Response:', data);

        if (!response.ok) {
            throw new Error(data.error?.message || `API request failed: ${response.status} ${response.statusText}`);
        }

        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            console.log('API Connection Successful!');
            console.log('Response:', data.candidates[0].content.parts[0].text);
        } else {
            throw new Error('Invalid response format from API');
        }
    } catch (error) {
        console.error('API Test Error:', error);
    }
}

// Run the test
testGeminiAPI(); 
