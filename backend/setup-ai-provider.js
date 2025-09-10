#!/usr/bin/env node

/**
 * AI Provider Setup Script
 * 
 * This script helps you set up an AI provider for email categorization.
 * Since DeepSeek has insufficient balance, we'll help you set up an alternative.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ENV_FILE_PATH = path.join(__dirname, '.env');

async function setupAIProvider() {
  console.log('🤖 AI Provider Setup');
  console.log('====================');
  console.log('');
  console.log('Your current DeepSeek API key has insufficient balance.');
  console.log('Let\'s set up an alternative AI provider for email categorization.');
  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    // Read current .env file
    let envContent = '';
    if (fs.existsSync(ENV_FILE_PATH)) {
      envContent = fs.readFileSync(ENV_FILE_PATH, 'utf8');
    }

    console.log('📋 Available AI Providers:');
    console.log('1. Groq (Free, Fast) - Recommended');
    console.log('2. OpenAI (Paid)');
    console.log('3. Anthropic Claude (Paid)');
    console.log('4. Mistral AI (Free credits available)');
    console.log('5. Ollama (Local, Free)');
    console.log('');

    const choice = await askQuestion(rl, 'Choose a provider (1-5): ');

    let providerConfig = '';
    let providerName = '';

    switch (choice) {
      case '1':
        providerName = 'Groq';
        console.log('');
        console.log('🔧 Setting up Groq...');
        console.log('1. Go to: https://console.groq.com/signup');
        console.log('2. Sign up for a free account');
        console.log('3. Get your API key from the dashboard');
        console.log('');
        
        const groqApiKey = await askQuestion(rl, 'Enter your Groq API key: ');
        if (groqApiKey) {
          providerConfig = `
# Groq Configuration (Free, Fast)
GROQ_API_KEY=${groqApiKey}
GROQ_MODEL=llama3-8b-8192
GROQ_API_BASE_URL=https://api.groq.com
`;
        }
        break;

      case '2':
        providerName = 'OpenAI';
        console.log('');
        console.log('🔧 Setting up OpenAI...');
        console.log('1. Go to: https://platform.openai.com');
        console.log('2. Sign up and add payment method');
        console.log('3. Get your API key from the dashboard');
        console.log('');
        
        const openaiApiKey = await askQuestion(rl, 'Enter your OpenAI API key: ');
        if (openaiApiKey) {
          providerConfig = `
# OpenAI Configuration
OPENAI_API_KEY=${openaiApiKey}
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_API_BASE_URL=https://api.openai.com
`;
        }
        break;

      case '3':
        providerName = 'Anthropic Claude';
        console.log('');
        console.log('🔧 Setting up Anthropic Claude...');
        console.log('1. Go to: https://console.anthropic.com');
        console.log('2. Sign up and add payment method');
        console.log('3. Get your API key from the dashboard');
        console.log('');
        
        const anthropicApiKey = await askQuestion(rl, 'Enter your Anthropic API key: ');
        if (anthropicApiKey) {
          providerConfig = `
# Anthropic Claude Configuration
ANTHROPIC_API_KEY=${anthropicApiKey}
ANTHROPIC_MODEL=claude-3-haiku-20240307
ANTHROPIC_API_BASE_URL=https://api.anthropic.com
`;
        }
        break;

      case '4':
        providerName = 'Mistral AI';
        console.log('');
        console.log('🔧 Setting up Mistral AI...');
        console.log('1. Go to: https://console.mistral.ai');
        console.log('2. Sign up for free credits');
        console.log('3. Get your API key from the dashboard');
        console.log('');
        
        const mistralApiKey = await askQuestion(rl, 'Enter your Mistral API key: ');
        if (mistralApiKey) {
          providerConfig = `
# Mistral AI Configuration
MISTRAL_API_KEY=${mistralApiKey}
MISTRAL_MODEL=mistral-tiny
MISTRAL_API_BASE_URL=https://api.mistral.ai
`;
        }
        break;

      case '5':
        providerName = 'Ollama (Local)';
        console.log('');
        console.log('🔧 Setting up Ollama...');
        console.log('1. Install Ollama from: https://ollama.com');
        console.log('2. Run: ollama pull llama2');
        console.log('3. Make sure Ollama is running on localhost:11434');
        console.log('');
        
        const ollamaModel = await askQuestion(rl, 'Enter model name (default: llama2): ') || 'llama2';
        const ollamaUrl = await askQuestion(rl, 'Enter Ollama URL (default: http://localhost:11434): ') || 'http://localhost:11434';
        
        providerConfig = `
# Ollama Configuration (Local)
OLLAMA_API_BASE_URL=${ollamaUrl}
OLLAMA_MODEL=${ollamaModel}
`;
        break;

      default:
        console.log('❌ Invalid choice. Setup cancelled.');
        return;
    }

    if (providerConfig) {
      // Remove existing AI provider configurations
      envContent = envContent.replace(/# (DeepSeek|Groq|OpenAI|Anthropic|Mistral|Ollama).*?(?=\n# [A-Z]|\n$|$)/gs, '');
      envContent = envContent.replace(/DEEPSEEK_API_KEY=.*\n/g, '');
      envContent = envContent.replace(/DEEPSEEK_MODEL=.*\n/g, '');
      envContent = envContent.replace(/DEEPSEEK_API_BASE_URL=.*\n/g, '');
      envContent = envContent.replace(/GROQ_API_KEY=.*\n/g, '');
      envContent = envContent.replace(/GROQ_MODEL=.*\n/g, '');
      envContent = envContent.replace(/GROQ_API_BASE_URL=.*\n/g, '');
      envContent = envContent.replace(/OPENAI_API_KEY=.*\n/g, '');
      envContent = envContent.replace(/OPENAI_MODEL=.*\n/g, '');
      envContent = envContent.replace(/OPENAI_API_BASE_URL=.*\n/g, '');
      envContent = envContent.replace(/ANTHROPIC_API_KEY=.*\n/g, '');
      envContent = envContent.replace(/ANTHROPIC_MODEL=.*\n/g, '');
      envContent = envContent.replace(/ANTHROPIC_API_BASE_URL=.*\n/g, '');
      envContent = envContent.replace(/MISTRAL_API_KEY=.*\n/g, '');
      envContent = envContent.replace(/MISTRAL_MODEL=.*\n/g, '');
      envContent = envContent.replace(/MISTRAL_API_BASE_URL=.*\n/g, '');
      envContent = envContent.replace(/OLLAMA_API_BASE_URL=.*\n/g, '');
      envContent = envContent.replace(/OLLAMA_MODEL=.*\n/g, '');

      // Add new provider configuration
      envContent += providerConfig;

      // Write back to .env file
      fs.writeFileSync(ENV_FILE_PATH, envContent);

      console.log('');
      console.log(`✅ ${providerName} configuration has been added to your .env file!`);
      console.log('');
      console.log('📋 Next Steps:');
      console.log('1. Restart your backend server to apply the new configuration');
      console.log('2. Check the logs to see if AI categorization is working');
      console.log('3. Test email categorization by visiting: http://localhost:3000/api/emails');
      console.log('');
      
      if (choice === '1') {
        console.log('🎉 Groq is free and fast! Your emails should now be categorized automatically.');
      }
    }

  } catch (error) {
    console.error('❌ Error setting up AI provider:', error.message);
  } finally {
    rl.close();
  }
}

function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Run the setup
setupAIProvider().catch(console.error);