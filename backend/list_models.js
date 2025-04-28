require('dotenv').config({ path: './backend/.env' });

async function listGeminiModels(apiKey) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    if (data.models && Array.isArray(data.models)) {
      return data.models;
    } else {
      throw new Error("Invalid API response: 'models' not found or not an array.");
    }

  } catch (error) {
    console.error("Error listing Gemini models:", error);
    return null; // Or handle the error as appropriate for your application.
  }
}


// Example usage:
const apiKey = process.env.GEMINI_API_KEY; // Use environment variable

if (!apiKey) {
  console.error("GEMINI_API_KEY is not set in the environment variables.");
} else {
  listGeminiModels(apiKey)
    .then(models => {
      if (models) {
        console.log("Available Gemini Models:");
        models.forEach(model => {
          console.log(`- ${model.name} (Supported Methods: ${model.supportedGenerationMethods.join(', ')})`);
        });
      } else {
        console.log("Failed to retrieve Gemini model list.");
      }
    });
}
