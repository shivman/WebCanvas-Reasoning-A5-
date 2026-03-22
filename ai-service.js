import { GoogleGenerativeAI } from "@google/generative-ai";

class AIService {
  constructor() {
    this.apiKey = null;
    this.genAI = null;
    this.initialized = false;
    this.initializationError = null;
    this.setupMessageListener();
  }

  async initialize() {
    try {
      console.log('Initializing AI Service...');
      const result = await chrome.storage.local.get(['geminiApiKey']);
      
      if (!result || !result.geminiApiKey) {
        this.initializationError = new Error('Please set your Gemini API key in the extension settings.');
        this.initialized = false;
        console.log('No API key found in storage');
        return false;
      }

      this.apiKey = result.geminiApiKey;
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.initialized = true;
      console.log('AI Service initialized successfully');
      return true;
    } catch (error) {
      this.initializationError = error;
      this.initialized = false;
      console.error('AI Service initialization failed:', error);
      return false;
    }
  }

  async ensureInitialized() {
    if (!this.initialized) {
      const success = await this.initialize();
      if (!success) {
        throw new Error('Please set your Gemini API key in the extension settings before using AI features.');
      }
    }
    return true;
  }

  async testApiKey() {
    try {
      const results = {
        success: false,
        steps: [],
        error: null
      };

      // Step 1: Check storage for API key
      const result = await chrome.storage.local.get(['geminiApiKey']);
      if (!result || !result.geminiApiKey) {
        throw new Error('Please enter your Gemini API key to continue.');
      }
      results.steps.push({ step: 'API Key Storage Check', status: 'success' });

      // Step 2: Test API connection using direct fetch
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + result.geminiApiKey, {
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response format from API');
      }

      results.steps.push({ step: 'API Connection Test', status: 'success' });
      results.success = true;
      this.initialized = true;
      this.initializationError = null;
      return results;

    } catch (error) {
      console.error('API key test failed:', error);
      return {
        success: false,
        steps: [],
        error: {
          message: error.message || 'API key verification failed',
          details: error.toString()
        }
      };
    }
  }

  async analyzeDrawing(canvas) {
    try {
      await this.ensureInitialized();
      
      const imageData = await this.getImageFromCanvas(canvas);
      const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const prompt = `Analyze this drawing. You must respond in the following rigid JSON format:
{
  "reasoning": {
    "observe": "Describe the core elements, colors, and strokes visible.",
    "hypothesize": "List possible interpretations or meanings of the drawing.",
    "self_check": "Compare hypotheses against visual evidence to confirm accuracy.",
    "reasoning_type": "State the primary reasoning type used (e.g., visual inference, symbolic association).",
    "fallback": "If uncertain, specify the ambiguous parts and provide the most likely guess."
  },
  "final_result": {
    "content": "What is drawn",
    "style": "The artistic style or execution",
    "meaning": "Possible meaning or intent"
  }
}

Ensure your entire payload is valid JSON.`;
      
      const result = await model.generateContent({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: imageData }
          ]
        }]
      });
      const response = await result.response;
      const text = response.text();
      
      try {
        const parsed = JSON.parse(text);
        return `Reasoning (${parsed.reasoning.reasoning_type}):
- Observation: ${parsed.reasoning.observe}
- Hypothesis: ${parsed.reasoning.hypothesize}
- Self Check: ${parsed.reasoning.self_check}
- Uncertainty/Fallback: ${parsed.reasoning.fallback}

Final Result:
- Content: ${parsed.final_result.content}
- Style: ${parsed.final_result.style}
- Meaning: ${parsed.final_result.meaning}`;
      } catch (parseError) {
        console.error('Failed to parse JSON response:', text);
        return text;
      }
    } catch (error) {
      console.error('Error analyzing drawing:', error);
      throw error;
    }
  }

  async getSuggestions(canvas) {
    try {
      await this.ensureInitialized();
      
      const imageData = await this.getImageFromCanvas(canvas);
      const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const prompt = `Based on this drawing, suggest specific artistic improvements or alternative approaches. You must respond in the following rigid JSON format:
{
  "reasoning": {
    "observe": "Describe the flaws, composition, and current technique.",
    "hypothesize": "List possible improvements or alternative styles.",
    "self_check": "Reflect on whether these suggestions match the user's apparent skill level or intent.",
    "reasoning_type": "State the primary reasoning type used (e.g., artistic critique, technical analysis).",
    "fallback": "If uncertain about the drawing's intent, state what you assume the intent is."
  },
  "final_result": {
    "improvements": "Specific areas to improve (shading, proportions, etc.)",
    "techniques": "Concrete techniques or tools the user could try"
  }
}

Ensure your entire payload is valid JSON.`;
      
      const result = await model.generateContent({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: imageData }
          ]
        }]
      });
      const response = await result.response;
      const text = response.text();
      
      try {
        const parsed = JSON.parse(text);
        return `Reasoning (${parsed.reasoning.reasoning_type}):
- Observation: ${parsed.reasoning.observe}
- Critique/Check: ${parsed.reasoning.self_check}
- Uncertainty/Fallback: ${parsed.reasoning.fallback}

Suggestions:
- Improvements: ${parsed.final_result.improvements}
- Techniques to Try: ${parsed.final_result.techniques}`;
      } catch (parseError) {
        console.error('Failed to parse JSON response:', text);
        return text;
      }
    } catch (error) {
      console.error('Error getting suggestions:', error);
      throw error;
    }
  }

  async generateDrawingPrompt() {
    try {
      await this.ensureInitialized();
      
      const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `Generate an interesting and creative drawing prompt that would be fun to draw. 
You must respond in the following rigid JSON format:
{
  "reasoning": {
    "observe": "Identify a theme or concept (e.g., fantasy, sci-fi, daily life).",
    "hypothesize": "Brainstorm 2-3 specific visual scenarios within that theme.",
    "self_check": "Ensure the selected scenario is not too complex and provides enough creative freedom.",
    "reasoning_type": "State the primary reasoning type used (e.g., generative brainstorming).",
    "fallback": "If the prompt is too vague, provide a more concrete backup idea."
  },
  "final_result": {
    "prompt": "The actual drawing prompt to give the user",
    "tips": "One or two tips on how to approach drawing this"
  }
}

Ensure your entire payload is valid JSON.`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      try {
        const parsed = JSON.parse(text);
        return `Reasoning (${parsed.reasoning.reasoning_type}):
- Brainstorming: ${parsed.reasoning.hypothesize}
- Creativity Check: ${parsed.reasoning.self_check}

Your Drawing Prompt:
"${parsed.final_result.prompt}"

Tips:
${parsed.final_result.tips}`;
      } catch (parseError) {
        console.error('Failed to parse JSON response:', text);
        return text;
      }
    } catch (error) {
      console.error('Error generating prompt:', error);
      throw error;
    }
  }

  async getImageFromCanvas(canvas) {
    try {
      const imageData = canvas.toDataURL('image/png');
      const base64Data = imageData.split(',')[1];
      return {
        inlineData: {
          data: base64Data,
          mimeType: 'image/png'
        }
      };
    } catch (error) {
      console.error('Error converting canvas to image:', error);
      throw error;
    }
  }

  async recognizeHandwriting(canvas) {
    try {
      console.log('Starting handwriting recognition...');
      await this.ensureInitialized();
      
      const imageData = await this.getImageFromCanvas(canvas);
      const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const prompt = `You are a handwriting and drawing interpreter. Analyze this image and provide:
1. What was drawn or written (number, letter, word, shape, or symbol)
2. A clean text version if it's text
3. Your confidence in the interpretation (0.0-1.0)

Please respond in this exact JSON format:
{
  "understood_as": "what was drawn/written",
  "text_version": "clean text version (if applicable)",
  "confidence_score": "0.0-1.0"
}`;
      
      console.log('Sending recognition request to Gemini Vision...');
      const result = await model.generateContent({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: imageData.inlineData }
          ]
        }]
      });
      const response = await result.response;
      console.log('Recognition response received');
      
      try {
        const interpretation = JSON.parse(response.text());
        console.log('Successfully parsed interpretation:', interpretation);
        return interpretation;
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        throw new Error('Failed to parse AI response. Please try again.');
      }
    } catch (error) {
      console.error('Error recognizing handwriting:', error);
      throw error;
    }
  }

  // Listen for API key updates
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'apiKeyUpdated') {
        console.log('Received API key update notification');
        this.apiKey = message.apiKey;
        this.initialized = false;
        this.initializationError = null;
        this.initialize().catch(console.error);
      }
    });
  }
}

// Create and export a singleton instance
const aiService = new AIService();
aiService.setupMessageListener();
export default aiService; 