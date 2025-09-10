/**
 * AI Provider Manager
 * 
 * This utility helps switch between different AI providers and manages their configurations.
 * Supports:
 * - DeepSeek
 * - Ollama (local)
 * - Groq (fast inference)
 * - Mistral AI
 * - Anthropic Claude
 * - OpenAI (fallback)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { promisify } = require('util');
const { exec } = require('child_process');
const execAsync = promisify(exec);

// Available AI providers
const PROVIDERS = {
  DEEPSEEK: {
    name: 'DeepSeek',
    envVars: {
      API_KEY: 'DEEPSEEK_API_KEY',
      MODEL: 'DEEPSEEK_MODEL', // Optional model parameter
      BASE_URL: 'DEEPSEEK_API_BASE_URL'
    },
    defaultModel: 'deepseek-chat',
    defaultBaseUrl: 'https://api.deepseek.com',
    testEndpoint: '/v1/chat/completions',
    costPerToken: 0.0000005, // $0.0005 per 1000 tokens
    freeCredits: true, // New accounts get free credits
    setupInstructions: 'Sign up at https://platform.deepseek.com'
  },
  OLLAMA: {
    name: 'Ollama',
    envVars: {
      BASE_URL: 'OLLAMA_API_BASE_URL',
      MODEL: 'OLLAMA_MODEL'
    },
    defaultModel: 'llama2',
    defaultBaseUrl: 'http://localhost:11434',
    testEndpoint: '/api/chat',
    costPerToken: 0, // Free, runs locally
    freeCredits: true,
    local: true,
    setupInstructions: 'Download and install from https://ollama.com'
  },
  GROQ: {
    name: 'Groq',
    envVars: {
      API_KEY: 'GROQ_API_KEY',
      MODEL: 'GROQ_MODEL',
      BASE_URL: 'GROQ_API_BASE_URL'
    },
    defaultModel: 'llama3-8b-8192',
    defaultBaseUrl: 'https://api.groq.com',
    testEndpoint: '/openai/v1/chat/completions',
    costPerToken: 0, // Currently free
    freeCredits: true,
    setupInstructions: 'Sign up at https://console.groq.com/signup'
  },
  MISTRAL: {
    name: 'Mistral AI',
    envVars: {
      API_KEY: 'MISTRAL_API_KEY',
      MODEL: 'MISTRAL_MODEL',
      BASE_URL: 'MISTRAL_API_BASE_URL'
    },
    defaultModel: 'mistral-tiny',
    defaultBaseUrl: 'https://api.mistral.ai',
    testEndpoint: '/v1/chat/completions',
    costPerToken: 0.00000014, // $0.14 per million tokens
    freeCredits: true,
    setupInstructions: 'Sign up at https://console.mistral.ai'
  },
  OPENAI: {
    name: 'OpenAI',
    envVars: {
      API_KEY: 'OPENAI_API_KEY',
      MODEL: 'OPENAI_MODEL',
      BASE_URL: 'OPENAI_API_BASE_URL'
    },
    defaultModel: 'gpt-3.5-turbo',
    defaultBaseUrl: 'https://api.openai.com',
    testEndpoint: '/v1/chat/completions',
    costPerToken: 0.0000005, // $0.5 per million tokens for 3.5
    freeCredits: false,
    setupInstructions: 'Sign up at https://platform.openai.com'
  },
  ANTHROPIC: {
    name: 'Anthropic Claude',
    envVars: {
      API_KEY: 'ANTHROPIC_API_KEY',
      MODEL: 'ANTHROPIC_MODEL',
      BASE_URL: 'ANTHROPIC_API_BASE_URL'
    },
    defaultModel: 'claude-3-haiku-20240307',
    defaultBaseUrl: 'https://api.anthropic.com',
    testEndpoint: '/v1/messages',
    costPerToken: 0.00000025, // $0.25 per million tokens (input)
    freeCredits: false,
    setupInstructions: 'Sign up at https://console.anthropic.com'
  }
};

// Current environment configuration
const ENV_FILE_PATH = path.join(__dirname, '.env');
let envContent = '';

/**
 * Initialize the AI Provider Manager
 */
async function initialize() {
  try {
    console.log('🤖 AI Provider Manager');
    console.log('--------------------');
    
    // Check if .env file exists
    if (!fs.existsSync(ENV_FILE_PATH)) {
      console.error('❌ .env file not found. Creating one...');
      fs.writeFileSync(ENV_FILE_PATH, '# AI Provider Configuration\n\n');
    }
    
    // Read the current .env file
    envContent = fs.readFileSync(ENV_FILE_PATH, 'utf8');
    
    // Display current provider configuration
    const currentProvider = detectCurrentProvider();
    
    console.log(`\n📊 Current Configuration:`);
    if (currentProvider) {
      console.log(`- Provider: ${currentProvider.name}`);
      const apiKey = getEnvVar(currentProvider.envVars.API_KEY);
      console.log(`- API Key: ${apiKey ? `${apiKey.substring(0, 8)}...` : 'Not set'}`);
      const model = getEnvVar(currentProvider.envVars.MODEL) || currentProvider.defaultModel;
      console.log(`- Model: ${model}`);
      const baseUrl = getEnvVar(currentProvider.envVars.BASE_URL) || currentProvider.defaultBaseUrl;
      console.log(`- Base URL: ${baseUrl}`);
    } else {
      console.log('No provider configured yet.');
    }
    
    return showMenu();
  } catch (error) {
    console.error('❌ Error initializing AI Provider Manager:', error.message);
  }
}

/**
 * Show the main menu
 */
async function showMenu() {
  console.log('\n📋 Menu Options:');
  console.log('1. Test current provider configuration');
  console.log('2. Set up a new AI provider');
  console.log('3. Check all available providers');
  console.log('4. Install required dependencies');
  console.log('5. Exit');
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    readline.question('\nEnter option number: ', async (option) => {
      readline.close();
      
      switch (option) {
        case '1':
          await testCurrentProvider();
          break;
        case '2':
          await setupNewProvider();
          break;
        case '3':
          await checkAllProviders();
          break;
        case '4':
          await installDependencies();
          break;
        case '5':
          console.log('\n👋 Exiting AI Provider Manager');
          process.exit(0);
          break;
        default:
          console.log('❌ Invalid option. Please try again.');
      }
      
      // Return to main menu after each operation
      return resolve(showMenu());
    });
  });
}

/**
 * Detect the current AI provider from .env file
 */
function detectCurrentProvider() {
  // Check which provider's API key is set in the .env file
  for (const [key, provider] of Object.entries(PROVIDERS)) {
    const apiKeyVar = provider.envVars.API_KEY;
    if (!apiKeyVar) continue;
    
    const apiKey = getEnvVar(apiKeyVar);
    if (apiKey) {
      return {
        key,
        ...provider
      };
    }
  }
  
  // If no provider is found, check if Ollama is configured (doesn't require API key)
  if (getEnvVar(PROVIDERS.OLLAMA.envVars.BASE_URL)) {
    return {
      key: 'OLLAMA',
      ...PROVIDERS.OLLAMA
    };
  }
  
  return null;
}

/**
 * Get an environment variable from the .env file
 */
function getEnvVar(name) {
  if (!name) return null;
  
  const regex = new RegExp(`${name}=(.+?)(?:\r?\n|$)`);
  const match = envContent.match(regex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // Try process.env as fallback
  return process.env[name] || null;
}

/**
 * Set an environment variable in the .env file
 */
function setEnvVar(name, value) {
  const regex = new RegExp(`${name}=(.+?)(?:\r?\n|$)`);
  
  if (envContent.match(regex)) {
    // Update existing variable
    envContent = envContent.replace(regex, `${name}=${value}\n`);
  } else {
    // Add new variable
    envContent += `${name}=${value}\n`;
  }
  
  // Write back to .env file
  fs.writeFileSync(ENV_FILE_PATH, envContent);
  
  // Update process.env
  process.env[name] = value;
}

/**
 * Test the current provider configuration
 */
async function testCurrentProvider() {
  const provider = detectCurrentProvider();
  
  if (!provider) {
    console.log('\n❌ No provider configured. Please set up a provider first.');
    return;
  }
  
  console.log(`\n🧪 Testing ${provider.name} API configuration...`);
  
  try {
    const apiKey = getEnvVar(provider.envVars.API_KEY);
    const baseUrl = getEnvVar(provider.envVars.BASE_URL) || provider.defaultBaseUrl;
    const model = getEnvVar(provider.envVars.MODEL) || provider.defaultModel;
    
    // Check if local provider needs to be installed
    if (provider.local) {
      try {
        await testLocalProvider(provider);
      } catch (error) {
        console.error(`❌ ${provider.name} appears to not be running locally.`);
        console.log(`ℹ️ ${provider.setupInstructions}`);
        return;
      }
    } else if (!apiKey) {
      console.error(`❌ API Key for ${provider.name} is not set.`);
      console.log(`ℹ️ ${provider.setupInstructions}`);
      return;
    }
    
    // Prepare the API request based on provider
    let requestData, headers, endpoint;
    
    switch (provider.key) {
      case 'ANTHROPIC':
        requestData = {
          model: model,
          max_tokens: 5,
          messages: [{
            role: 'user',
            content: 'Say hello in one word.'
          }]
        };
        headers = {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        };
        endpoint = provider.testEndpoint;
        break;
      case 'OLLAMA':
        requestData = {
          model: model,
          messages: [{
            role: 'user',
            content: 'Say hello in one word.'
          }]
        };
        headers = {
          'Content-Type': 'application/json'
        };
        endpoint = provider.testEndpoint;
        break;
      default:
        // Default for OpenAI-compatible APIs (DeepSeek, OpenAI, Groq, Mistral)
        requestData = {
          model: model,
          messages: [{
            role: 'user',
            content: 'Say hello in one word.'
          }],
          max_tokens: 5
        };
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        };
        endpoint = provider.testEndpoint;
    }
    
    console.log(`🔄 Sending test request to: ${baseUrl}${endpoint}`);
    
    const response = await axios.post(`${baseUrl}${endpoint}`, requestData, {
      headers: headers,
      validateStatus: null // Accept all status codes
    });
    
    console.log(`📡 Response Status: ${response.status}`);
    
    if (response.status === 200) {
      // Extract response based on provider format
      let content;
      switch (provider.key) {
        case 'ANTHROPIC':
          content = response.data.content?.[0]?.text;
          break;
        case 'OLLAMA':
          content = response.data.message?.content;
          break;
        default:
          // OpenAI-compatible APIs
          content = response.data.choices?.[0]?.message?.content;
      }
      
      console.log('\n✅ API test successful!');
      console.log(`📝 Response: ${content || 'No content returned'}`);
    } else if (response.status === 402) {
      console.error('\n❌ Insufficient Balance: Your API key does not have enough credits.');
      console.log(`ℹ️ ${provider.setupInstructions}`);
    } else if (response.status === 401) {
      console.error('\n❌ API Key Invalid: Your API key is invalid or unauthorized.');
      console.log(`ℹ️ ${provider.setupInstructions}`);
    } else {
      console.error('\n❌ API Error:', response.status);
      console.log('Error details:', response.data);
    }
  } catch (error) {
    console.error(`\n❌ Error testing ${provider.name}:`, error.message);
    if (error.response) {
      console.log('Error details:', error.response.data);
    }
  }
}

/**
 * Test a local provider like Ollama
 */
async function testLocalProvider(provider) {
  const baseUrl = getEnvVar(provider.envVars.BASE_URL) || provider.defaultBaseUrl;
  
  try {
    const response = await axios.get(`${baseUrl}/api/tags`, {
      timeout: 2000 // 2-second timeout
    });
    
    if (response.status === 200) {
      console.log(`✅ ${provider.name} is running locally.`);
      return true;
    }
  } catch (error) {
    throw new Error(`${provider.name} is not available: ${error.message}`);
  }
}

/**
 * Set up a new AI provider
 */
async function setupNewProvider() {
  console.log('\n🔧 Set Up New AI Provider:');
  
  // Display available providers
  console.log('\nAvailable providers:');
  let index = 1;
  const providerOptions = [];
  
  for (const [key, provider] of Object.entries(PROVIDERS)) {
    console.log(`${index}. ${provider.name} ${provider.freeCredits ? '(Free credits available)' : ''}`);
    providerOptions.push({ key, ...provider });
    index++;
  }
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    readline.question('\nSelect provider number: ', async (option) => {
      const selectedIndex = parseInt(option) - 1;
      
      if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= providerOptions.length) {
        console.log('❌ Invalid option. Please try again.');
        readline.close();
        return resolve();
      }
      
      const selectedProvider = providerOptions[selectedIndex];
      console.log(`\nSetting up ${selectedProvider.name}...`);
      
      // Collect required information
      if (selectedProvider.envVars.API_KEY) {
        const apiKeyPromise = new Promise((resolveKey) => {
          readline.question(`Enter ${selectedProvider.name} API key: `, (apiKey) => {
            if (!apiKey) {
              console.log(`❌ API key required for ${selectedProvider.name}.`);
              readline.close();
              return resolve();
            }
            
            setEnvVar(selectedProvider.envVars.API_KEY, apiKey);
            resolveKey();
          });
        });
        
        await apiKeyPromise;
      }
      
      const modelPromise = new Promise((resolveModel) => {
        const defaultModel = selectedProvider.defaultModel;
        readline.question(`Enter model name (default: ${defaultModel}): `, (model) => {
          setEnvVar(selectedProvider.envVars.MODEL, model || defaultModel);
          resolveModel();
        });
      });
      
      await modelPromise;
      
      const baseUrlPromise = new Promise((resolveUrl) => {
        const defaultBaseUrl = selectedProvider.defaultBaseUrl;
        readline.question(`Enter API base URL (default: ${defaultBaseUrl}): `, (baseUrl) => {
          setEnvVar(selectedProvider.envVars.BASE_URL, baseUrl || defaultBaseUrl);
          resolveUrl();
        });
      });
      
      await baseUrlPromise;
      
      console.log(`\n✅ ${selectedProvider.name} has been set up as your AI provider!`);
      
      readline.close();
      return resolve();
    });
  });
}

/**
 * Check all available providers
 */
async function checkAllProviders() {
  console.log('\n📊 Available AI Providers:');
  console.log('------------------------');
  
  for (const [key, provider] of Object.entries(PROVIDERS)) {
    console.log(`\n📌 ${provider.name}`);
    console.log(`- Default Model: ${provider.defaultModel}`);
    console.log(`- Cost: ${provider.costPerToken === 0 ? 'Free' : `$${provider.costPerToken * 1000000}/million tokens`}`);
    console.log(`- Free Credits: ${provider.freeCredits ? 'Yes' : 'No'}`);
    console.log(`- Setup: ${provider.setupInstructions}`);
    
    // Check if this provider is configured
    const apiKeyVar = provider.envVars.API_KEY;
    const apiKey = apiKeyVar ? getEnvVar(apiKeyVar) : null;
    const isConfigured = apiKey || (provider.local && getEnvVar(provider.envVars.BASE_URL));
    
    console.log(`- Status: ${isConfigured ? '✅ Configured' : '❌ Not configured'}`);
  }
  
  console.log('\nPress Enter to return to the main menu...');
  return new Promise((resolve) => {
    require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    }).question('', () => resolve());
  });
}

/**
 * Install required dependencies
 */
async function installDependencies() {
  console.log('\n📦 Installing required dependencies...');
  
  const packages = [
    'axios',
    'dotenv'
  ];
  
  try {
    await execAsync(`npm install ${packages.join(' ')} --save`);
    console.log('\n✅ Dependencies installed successfully!');
  } catch (error) {
    console.error('\n❌ Failed to install dependencies:', error.message);
  }
  
  console.log('\nPress Enter to return to the main menu...');
  return new Promise((resolve) => {
    require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    }).question('', () => resolve());
  });
}

// Start the application
initialize();
