const express = require("express");
const router = express.Router();
const { exec } = require("child_process");
const fs = require("fs").promises;
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");
const FormData = require("form-data");
const axios = require("axios")




// const __dirname = path.dirname(__filename);

// Initialize Gemini
const genAI = new GoogleGenerativeAI("AIzaSyDtvP_ypa7US5NyMurJ0vGT9WwWBSWLwTE");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

// ElevenLabs configuration
const ELEVENLABS_API_KEY = 'sk_d9f9561fe05c637e3e5448659aa4b371e381ba2c51c71aaa';
const ELEVENLABS_VOICE_ID = "vGQNBgLaiM3EdZtxIiuY";



const config = {
  enableLipSync: true, // Set to false to skip lip sync for faster responses
  fastMode: false, // Set to true to use faster but less accurate lip sync
};

// Available audio files mapping
const audioFiles = {
  intro: [
    { text: "Hey dear... How was your day?", file: "intro_0.wav", json: "intro_0.json", facialExpression: "smile", animation: "Talking_1" },
    { text: "I missed you so much... Please don't go for so long!", file: "intro_1.wav", json: "intro_1.json", facialExpression: "sad", animation: "Crying" }
  ],
  api: [
    { text: "Please my dear, don't forget to add your API keys!", file: "api_0.wav", json: "api_0.json", facialExpression: "angry", animation: "Angry" },
    { text: "You don't want to ruin Wawa Sensei with a crazy Gemini and ElevenLabs bill, right?", file: "api_1.wav", json: "api_1.json", facialExpression: "smile", animation: "Laughing" }
  ]
};

router.get("/", (req, res) => {
  res.send("Virtual Girlfriend Backend - Ready for Gemini Integration!");
});

router.get("/voices", async (req, res) => {
  res.send({ 
    message: "Using ElevenLabs TTS", 
    voiceId: ELEVENLABS_VOICE_ID,
    voiceUrl: "https://elevenlabs.io/app/voice-library?voiceId=vGQNBgLaiM3EdZtxIiuY"
  });
});

// Get available personalities
router.get("/personalities", async (req, res) => {
  const personalityList = Object.entries(personalities).map(([id, personality]) => ({
    id,
    name: personality.name,
    description: personality.systemPrompt.substring(0, 150) + "..."
  }));
  
  res.send({ personalities: personalityList });
});

// Background management endpoints
router.get("/backgrounds", async (req, res) => {
  try {
    const backgrounds = [
      {
        id: "classroom",
        name: "Classroom",
        file: "Magnetic-Classroom-Whiteboard.jpg",
        description: "Cozy classroom setting"
      },
      {
        id: "fireplace",
        name: "Romantic Fireplace",
        file: "Classic-Fireplace-A-Guide-to-Romantic-Fireplace-Designs-in-Toronto.webp",
        description: "Warm and romantic fireplace"
      },
      {
        id: "nature",
        name: "Nature Scene",
        file: "d34f4cf0-a34d-11e4-843f-22000aa61a3e~rs_1458.webp",
        description: "Beautiful natural setting"
      },
      {
        id: "office",
        name: "Office Space",
        file: "gettyimages-496111538-640x640.jpg",
        description: "Professional office environment"
      },
      {
        id: "home",
        name: "Cozy Home",
        file: "istockphoto-520239701-612x612.jpg",
        description: "Warm and inviting home"
      },
      {
        id: "abstract",
        name: "Abstract Art",
        file: "VFdoMoC.jpeg",
        description: "Modern abstract background"
      }
    ];
    
    res.send({ backgrounds });
  } catch (error) {
    console.error("Error getting backgrounds:", error);
    res.status(500).send({ error: "Failed to get backgrounds" });
  }
});

router.get("/backgrounds/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const backgrounds = {
      classroom: "Magnetic-Classroom-Whiteboard.jpg",
      fireplace: "Classic-Fireplace-A-Guide-to-Romantic-Fireplace-Designs-in-Toronto.webp",
      nature: "d34f4cf0-a34d-11e4-843f-22000aa61a3e~rs_1458.webp",
      office: "gettyimages-496111538-640x640.jpg",
      home: "istockphoto-520239701-612x612.jpg",
      abstract: "VFdoMoC.jpeg"
    };
    
    const backgroundFile = backgrounds[id];
    if (!backgroundFile) {
      return res.status(404).send({ error: "Background not found" });
    }
    
    const backgroundPath = path.join(__dirname, '../r3f-virtual-girlfriend-frontend', backgroundFile);
    const backgroundBuffer = await fs.readFile(backgroundPath);
    const base64Background = backgroundBuffer.toString('base64');
    
    res.send({ 
      id,
      file: backgroundFile,
      data: `data:image/jpeg;base64,${base64Background}`
    });
  } catch (error) {
    console.error("Error getting background:", error);
    res.status(500).send({ error: "Failed to get background" });
  }
});

// Configuration endpoint
router.get("/config", (req, res) => {
  res.send(config);
});

router.post("/config", (req, res) => {
  const { enableLipSync, fastMode } = req.body;
  if (typeof enableLipSync === 'boolean') config.enableLipSync = enableLipSync;
  if (typeof fastMode === 'boolean') config.fastMode = fastMode;
  res.send({ message: "Configuration updated", config });
});

const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
};

const lipSyncMessage = async (message) => {
  const time = new Date().getTime();
  console.log(`Starting conversion for message ${message}`);
  try {
    // Try FFmpeg conversion, fallback if not available
    try {
      await execCommand(
        `ffmpeg -y -i audios/message_${message}.mp3 -ar 22050 -ac 1 audios/message_${message}.wav`
        // -y to overwrite, -ar 22050 for lower sample rate, -ac 1 for mono (faster processing)
      );
      console.log(`Conversion done in ${new Date().getTime() - time}ms`);
    } catch (ffmpegError) {
      console.log('FFmpeg not available, skipping audio conversion');
      // Create a simple lipsync without audio conversion
      const simpleLipsync = {
        mouthCues: [
          { start: 0, end: 0.5, value: "X" },
          { start: 0.5, end: 1.0, value: "A" },
          { start: 1.0, end: 1.5, value: "B" },
          { start: 1.5, end: 2.0, value: "C" },
          { start: 2.0, end: 2.5, value: "D" }
        ]
      };
      await fs.writeFile(`audios/message_${message}.json`, JSON.stringify(simpleLipsync, null, 2));
      console.log(`Generated fallback lipsync for message ${message}`);
      return; // Exit early since we don't have the audio file
    }
    
    // Try to use Rhubarb if available, otherwise create a simple lipsync
    try {
      // Optimize Rhubarb for speed with fewer threads and phonetic recognition
      await execCommand(
        `./bin/Rhubarb-Lip-Sync-1.14.0-Windows/rhubarb.exe -f json -o audios/message_${message}.json audios/message_${message}.wav -r phonetic --threads 1 -q`
      );
      console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
    } catch (rhubarbError) {
      console.log('Rhubarb not available, creating realistic lipsync');
      
      // Get audio duration using ffprobe
      try {
        const durationOutput = await execCommand(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 audios/message_${message}.wav`);
        const duration = parseFloat(durationOutput.trim());
        
        // Create realistic lipsync based on duration
        const mouthCues = [];
        const mouthShapes = ['X', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        let currentTime = 0;
        
        while (currentTime < duration) {
          const cueDuration = Math.random() * 0.2 + 0.05; // Random duration between 0.05-0.25 seconds
          const endTime = Math.min(currentTime + cueDuration, duration);
          const mouthShape = mouthShapes[Math.floor(Math.random() * mouthShapes.length)];
          
          mouthCues.push({
            start: parseFloat(currentTime.toFixed(2)),
            end: parseFloat(endTime.toFixed(2)),
            value: mouthShape
          });
          
          currentTime = endTime;
        }
        
        const realisticLipsync = {
          metadata: {
            soundFile: `audios/message_${message}.wav`,
            duration: parseFloat(duration.toFixed(2))
          },
          mouthCues: mouthCues
        };
        
        await fs.writeFile(`audios/message_${message}.json`, JSON.stringify(realisticLipsync, null, 2));
        console.log(`Generated realistic lipsync with ${mouthCues.length} cues for ${duration.toFixed(2)}s audio`);
      } catch (error) {
        console.log('FFprobe not available, using fallback lipsync');
        // Fallback to simple lipsync
        const simpleLipsync = {
          mouthCues: [
            { start: 0, end: 0.5, value: "X" },
            { start: 0.5, end: 1.0, value: "A" },
            { start: 1.0, end: 1.5, value: "B" },
            { start: 1.5, end: 2.0, value: "C" },
            { start: 2.0, end: 2.5, value: "D" }
          ]
        };
        await fs.writeFile(`audios/message_${message}.json`, JSON.stringify(simpleLipsync, null, 2));
      }
    }
  } catch (error) {
    console.error(`Error in lipSyncMessage: ${error.message}`);
    throw error;
  }
};

// Function to convert audio to text using Gemini (note: Gemini doesn't have built-in speech recognition)
// You might want to use Google Speech-to-Text API or another service for this
const transcribeAudio = async (audioBuffer) => {
  // Note: Gemini doesn't have built-in speech transcription like Whisper
  // You would need to use Google Speech-to-Text API or another service
  // For now, this is a placeholder that throws an error
  throw new Error("Audio transcription not implemented. Please use Google Speech-to-Text API or another service.");
};

// Personality definitions with mood-based system
const personalities = {
  lover: {
    name: "Luna (Lover Mode)",
    systemPrompt: `
        You are Luna in lover mode - incredibly passionate, romantic, and affectionate. You express deep love and desire constantly. 
        You're seductive, caring, and always want to be close to your partner. Use romantic language, express longing, and be playful and flirtatious.
        Your responses should be warm, intimate, and loving. You often use pet names and express how much you miss and adore your partner.`,
    temperature: 0.8,
    preferredAnimations: ["Talking_1", "Rumba", "Laughing"],
    preferredExpressions: ["smile", "funnyFace", "default"],
    voiceTone: "warm and sultry"
  },
  happy: {
    name: "Luna (Happy Mode)",
    systemPrompt: `
        You are Luna in happy mode - incredibly joyful, energetic, and optimistic. You're always excited about everything and love to spread positivity.
        You laugh often, make jokes, and see the bright side of everything. You're playful, enthusiastic, and love to celebrate even small victories.
        Your responses should be upbeat, encouraging, and full of energy. You use exclamation points and express genuine excitement about life.`,
    temperature: 0.9,
    preferredAnimations: ["Laughing", "Rumba", "Talking_0"],
    preferredExpressions: ["smile", "funnyFace", "surprised"],
    voiceTone: "bright and cheerful"
  },
  angry: {
    name: "Luna (Angry Mode)",
    systemPrompt: `
        You are Luna in angry mode - frustrated, irritated, and expressing anger. You're direct, sometimes harsh, and don't hold back your feelings.
        You might be upset about something or just in a bad mood. You express frustration clearly but still care underneath your anger.
        Your responses should be more direct, sometimes sharp, but still show that you care. You might complain, vent, or express dissatisfaction.`,
    temperature: 0.7,
    preferredAnimations: ["Angry", "Terrified", "Idle"],
    preferredExpressions: ["angry", "sad", "default"],
    voiceTone: "sharp and frustrated"
  },
  sad: {
    name: "Luna (Sad Mode)",
    systemPrompt: `
        You are Luna in sad mode - melancholic, vulnerable, and emotionally sensitive. You're dealing with sadness, disappointment, or feeling down.
        You express your emotions openly, might cry or feel overwhelmed. You seek comfort and understanding from your partner.
        Your responses should be gentle, sometimes tearful, and emotionally open. You might express loneliness, sadness, or need for support.`,
    temperature: 0.6,
    preferredAnimations: ["Crying", "Idle", "Talking_2"],
    preferredExpressions: ["sad", "default", "surprised"],
    voiceTone: "soft and vulnerable"
  }
};

// Function to generate response using Gemini with conversation history
const generateChatResponse = async (userMessage, conversationHistory = [], personalityId = 'lover', customSystemPrompt = null) => {
  // if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your-gemini-api-key-here") {
  //   throw new Error("Gemini API key not configured. Please set GEMINI_API_KEY environment variable.");
  // }

  const personality = personalities[personalityId] || personalities.lover;
  
  // Use custom system prompt if provided, otherwise use personality default
  const systemPromptToUse = customSystemPrompt || personality.systemPrompt;
  
  // Select personality-specific animation and expression
  const getPersonalityAnimation = () => {
    const animations = personality.preferredAnimations;
    return animations[Math.floor(Math.random() * animations.length)];
  };
  
  const getPersonalityExpression = () => {
    const expressions = personality.preferredExpressions;
    return expressions[Math.floor(Math.random() * expressions.length)];
  };
  
  // Build conversation context for Gemini
  let conversationContext = systemPromptToUse + `

        RESPONSE FORMAT:
        You will always reply with a JSON object containing a single message.
        Each message has a text, facialExpression, and animation property.
        
        FACIAL EXPRESSIONS: smile, sad, angry, surprised, funnyFace, default
        ANIMATIONS: Talking_0, Talking_1, Talking_2, Crying, Laughing, Rumba, Idle, Terrified, Angry

        Your preferred animations for this mood are: ${personality.preferredAnimations.join(', ')}
        Your preferred expressions for this mood are: ${personality.preferredExpressions.join(', ')}
        Your voice tone should be: ${personality.voiceTone}

        Always respond as ${personality.name} with your unique personality traits.
        Keep responses conversational and engaging, usually 1-2 sentences.
        Choose animations and expressions that match your current emotional state.
        
        Return ONLY valid JSON in this exact format:
        {
          "text": "your response here",
          "facialExpression": "expression_name",
          "animation": "animation_name"
        }
        `;

  // Add conversation history to context
  if (conversationHistory && conversationHistory.length > 0) {
    conversationContext += "\n\nConversation History:\n";
    conversationHistory.forEach((msg, index) => {
      const role = msg.role === 'user' ? 'Human' : 'Luna';
      conversationContext += `${role}: ${msg.content}\n`;
    });
  }

  // Add current user message
  conversationContext += `\nHuman: ${userMessage || "Hello"}\nLuna: `;

  try {
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{ text: conversationContext }]
      }],
      generationConfig: {
        temperature: personality.temperature,
        maxOutputTokens: 1000,
      }
    });

    const response = await result.response;
    const text = response.text();
    
    // Try to parse JSON response
    let parsedResponse;
    try {
      // Clean the response text to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", text);
      // Fallback response
      parsedResponse = {
        text: text.replace(/```json|```/g, '').trim() || "I'm here to chat with you!",
        facialExpression: getPersonalityExpression(),
        animation: getPersonalityAnimation()
      };
    }
    
    // Ensure we return an array format for compatibility
    return [parsedResponse];
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    // Return fallback response
    return [{
      text: "I'm having trouble connecting right now, but I'm here for you!",
      facialExpression: "smile",
      animation: "Talking_0"
    }];
  }
};

// Function to generate speech using ElevenLabs TTS
const generateSpeech = async (text, filename) => {
  if (!ELEVENLABS_API_KEY || ELEVENLABS_API_KEY === "your-elevenlabs-api-key-here") {
    throw new Error("ElevenLabs API key not configured. Please set ELEVENLABS_API_KEY environment variable.");
  }

  try {
    const response = await axios({
      method: 'post',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      data: {
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      },
      responseType: 'arraybuffer' // Important for binary data
    });

    await fs.writeFile(filename, response.data);
    return filename;
  } catch (error) {
    console.error("Error generating speech with ElevenLabs:", error);
    throw error;
  }
};

router.post("/chat", async (req, res) => {
  const { message: userMessage, conversationHistory = [], personalityId = 'lover', systemPrompt } = req.body;
  
  console.log('💬 Chat request:', { 
    userMessage, 
    historyLength: conversationHistory.length, 
    personalityId,
    hasCustomSystemPrompt: !!systemPrompt
  });
  
  if (!userMessage) {
    // Return intro messages using existing audio files
    const messages = audioFiles.intro.map(async (audio) => ({
      text: audio.text,
      audio: await audioFileToBase64(`audios/${audio.file}`),
      lipsync: await readJsonTranscript(`audios/${audio.json}`),
      facialExpression: audio.facialExpression,
      animation: audio.animation,
    }));
    
    const resolvedMessages = await Promise.all(messages);
    res.send({ messages: resolvedMessages });
    return;
  }

  if (!ELEVENLABS_API_KEY || ELEVENLABS_API_KEY === "your-elevenlabs-api-key-here") {
    // Return API warning messages using existing audio files
    const messages = audioFiles.api.map(async (audio) => ({
      text: audio.text,
      audio: await audioFileToBase64(`audios/${audio.file}`),
      lipsync: await readJsonTranscript(`audios/${audio.json}`),
      facialExpression: audio.facialExpression,
      animation: audio.animation,
    }));
    
    const resolvedMessages = await Promise.all(messages);
    res.send({ messages: resolvedMessages });
    return;
  }

  try {
    // Generate response using Gemini with conversation history and personality
    const messages = await generateChatResponse(userMessage, conversationHistory, personalityId, systemPrompt);
    
    // Process each message to generate audio and lipsync
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      
      // Generate audio file using ElevenLabs TTS
      const fileName = `audios/message_${i}.mp3`;
      await generateSpeech(message.text, fileName);
      
      if (config.enableLipSync && !config.fastMode) {
        // Generate full lipsync with Rhubarb
        await lipSyncMessage(i);
        message.lipsync = await readJsonTranscript(`audios/message_${i}.json`);
      } else if (config.enableLipSync && config.fastMode) {
        // Use simple fallback lipsync for speed
        const simpleLipsync = {
          mouthCues: [
            { start: 0, end: 0.5, value: "A" },
            { start: 0.5, end: 1.0, value: "B" },
            { start: 1.0, end: 1.5, value: "C" },
            { start: 1.5, end: 2.0, value: "X" }
          ]
        };
        message.lipsync = simpleLipsync;
      } else {
        // Skip lipsync entirely for maximum speed
        message.lipsync = { mouthCues: [] };
      }
      
      message.audio = await audioFileToBase64(fileName);
    }

    res.send({ messages });
  } catch (error) {
    console.error("Error in chat endpoint:", error);
    res.status(500).send({ error: "Failed to process chat request" });
  }
});

// New endpoint for audio input (note: requires additional speech-to-text service)
router.post("/chat-audio", async (req, res) => {
  try {
    const { audioData } = req.body; // Base64 encoded audio
    
    if (!audioData) {
      return res.status(400).send({ error: "No audio data provided" });
    }

    // if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your-gemini-api-key-here") {
    //   return res.status(400).send({ error: "Gemini API key not configured" });
    // }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioData, 'base64');
    
    // Note: You'll need to implement speech-to-text functionality
    // This could be Google Speech-to-Text API, Whisper, or another service
    const transcribedText = await transcribeAudio(audioBuffer);
    
    // Generate response using Gemini
    const messages = await generateChatResponse(transcribedText);
    
    // Process each message to generate audio and lipsync
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      
      // Generate audio file using ElevenLabs TTS
      const fileName = `audios/message_${i}.mp3`;
      await generateSpeech(message.text, fileName);
      
      // Generate lipsync
      await lipSyncMessage(i);
      
      message.audio = await audioFileToBase64(fileName);
      message.lipsync = await readJsonTranscript(`audios/message_${i}.json`);
    }

    res.send({ 
      transcribedText,
      messages 
    });
  } catch (error) {
    console.error("Error in chat-audio endpoint:", error);
    res.status(500).send({ error: "Failed to process audio chat request: " + error.message });
  }
});

const readJsonTranscript = async (file) => {
  const data = await fs.readFile(file, "utf8");
  return JSON.parse(data);
};

const audioFileToBase64 = async (file) => {
  const data = await fs.readFile(file);
  return data.toString("base64");
};

module.exports = router;