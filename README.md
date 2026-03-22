# Assignment 5: Planning and Reasoning with Language Models

**Project**: WebCanvas 3.0 (Chrome Extension)
**YouTube Video Link**: [INSERT YOUTUBE LINK HERE]
**GitHub Repository Link**: [INSERT GITHUB LINK HERE]

This repository contains the codebase for my WebCanvas extension, which has been updated to satisfy the requirements of Assignment 5.

## Re-doing the Last Assignment with Qualified Prompts

Our previous assignment was an LLM-powered drawing canvas extension for Chrome. For Assignment 5, the prompts sent to the Gemini Vision API have been drastically improved by applying the rules from `prompt_of_prompts.md`.

### The New Qualified Prompt Structure

Here is an example of the new prompt used in our `ai-service.js` for analyzing user drawings:

```javascript
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
```

### Prompt Qualification & Evaluation

The above prompt was carefully crafted to adhere to the 9 criteria given in the assignment:

1. ✅ **Explicit Reasoning Instructions**: Instead of just asking for an analysis, the prompt explicitly requires the model to `observe` and `hypothesize` before delivering the final answer.
2. ✅ **Structured Output Format**: The prompt rigidly enforces a specific JSON structure, making it highly predictable, easy to parse, and robust for our application.
3. ✅ **Separation of Reasoning and Tools**: The schema explicitly separates the `"reasoning"` block from the `"final_result"` block, ensuring the model thinks before it outputs the executable/displayable final content.
4. ✅ **Conversation Loop Support**: The extension works in a continuous drawing loop. The structured JSON allows our backend to extract only the `final_result` to show the user, while cleanly logging the `reasoning` for debugging and context in multi-turn interactions.
5. ✅ **Instructional Framing**: The prompt defines exactly how the JSON should look by providing an example schema where the values act as explicit instructions for what each field should contain.
6. ✅ **Internal Self-Checks**: We force the model to perform a sanity check by including a `"self_check"` key, instructing it to "compare hypotheses against visual evidence to confirm accuracy."
7. ✅ **Reasoning Type Awareness**: We include a `"reasoning_type"` key, forcing the model to explicitly state whether it is using visual inference, symbolic association, or another cognitive approach.
8. ✅ **Error Handling or Fallbacks**: The prompt includes a `"fallback"` key, explicitly instructing the model on what to do if it is uncertain or the drawing is too ambiguous.
9. ✅ **Overall Clarity and Robustness**: By restricting the output to this exact JSON schema and guiding the cognitive steps linearly (observe -> hypothesize -> check -> fallback -> result), we drastically reduce hallucinations.

---

## Extension Installation and Usage

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable "Developer mode" and click "Load unpacked", selecting this directory.
4. Set your Gemini API key in the extension settings.
5. Draw on any webpage and use the AI tools to see the reasoning steps in action!