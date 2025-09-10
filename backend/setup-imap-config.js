#!/usr/bin/env node

/**
 * IMAP Configuration Setup Script
 * 
 * This script helps you set up IMAP configuration for email synchronization.
 * It will add the necessary IMAP environment variables to your .env file.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ENV_FILE_PATH = path.join(__dirname, '.env');

async function setupIMAPConfig() {
  console.log('🔧 IMAP Configuration Setup');
  console.log('============================');
  console.log('');
  console.log('This script will help you configure IMAP settings for email synchronization.');
  console.log('You will need:');
  console.log('1. Gmail App Password (for Gmail accounts)');
  console.log('2. Email credentials for other providers');
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

    // Check if IMAP config already exists
    if (envContent.includes('IMAP1_HOST')) {
      console.log('⚠️  IMAP configuration already exists in .env file.');
      const overwrite = await askQuestion(rl, 'Do you want to update it? (y/n): ');
      if (overwrite.toLowerCase() !== 'y') {
        console.log('Setup cancelled.');
        return;
      }
      
      // Remove existing IMAP config
      envContent = envContent.replace(/# IMAP Account.*?(?=\n# [A-Z]|\n$|$)/gs, '');
    }

    console.log('');
    console.log('📧 IMAP Account 1 Configuration (Primary)');
    console.log('------------------------------------------');
    
    const imap1Host = await askQuestion(rl, 'IMAP Host (default: imap.gmail.com): ') || 'imap.gmail.com';
    const imap1Port = await askQuestion(rl, 'IMAP Port (default: 993): ') || '993';
    const imap1User = await askQuestion(rl, 'Email Address: ');
    const imap1Password = await askQuestion(rl, 'App Password (for Gmail) or Password: ');
    const imap1Tls = await askQuestion(rl, 'Use TLS? (y/n, default: y): ') || 'y';

    console.log('');
    console.log('📧 IMAP Account 2 Configuration (Optional)');
    console.log('------------------------------------------');
    
    const setupAccount2 = await askQuestion(rl, 'Do you want to configure a second email account? (y/n): ');
    
    let imap2Config = '';
    if (setupAccount2.toLowerCase() === 'y') {
      const imap2Host = await askQuestion(rl, 'IMAP Host (default: imap.gmail.com): ') || 'imap.gmail.com';
      const imap2Port = await askQuestion(rl, 'IMAP Port (default: 993): ') || '993';
      const imap2User = await askQuestion(rl, 'Email Address: ');
      const imap2Password = await askQuestion(rl, 'App Password (for Gmail) or Password: ');
      const imap2Tls = await askQuestion(rl, 'Use TLS? (y/n, default: y): ') || 'y';

      imap2Config = `
# IMAP Account 2 Configuration (Optional)
IMAP2_HOST=${imap2Host}
IMAP2_PORT=${imap2Port}
IMAP2_USER=${imap2User}
IMAP2_PASSWORD=${imap2Password}
IMAP2_TLS=${imap2Tls.toLowerCase() === 'y'}`;
    }

    // Add IMAP configuration to .env file
    const imapConfig = `
# IMAP Account 1 Configuration (Primary)
IMAP1_HOST=${imap1Host}
IMAP1_PORT=${imap1Port}
IMAP1_USER=${imap1User}
IMAP1_PASSWORD=${imap1Password}
IMAP1_TLS=${imap1Tls.toLowerCase() === 'y'}${imap2Config}
`;

    // Add to .env file
    envContent += imapConfig;

    // Write back to .env file
    fs.writeFileSync(ENV_FILE_PATH, envContent);

    console.log('');
    console.log('✅ IMAP configuration has been added to your .env file!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Make sure your Gmail accounts have App Passwords enabled');
    console.log('2. For Gmail: Go to Google Account > Security > 2-Step Verification > App passwords');
    console.log('3. Restart your backend server to apply the new configuration');
    console.log('4. Check the logs to see if email synchronization is working');
    console.log('');
    console.log('🔍 To test the configuration:');
    console.log('1. Visit: http://localhost:3000/api/health/detailed');
    console.log('2. Check the email sync status');
    console.log('3. Visit: http://localhost:3000/api/emails to see if emails are being fetched');

  } catch (error) {
    console.error('❌ Error setting up IMAP configuration:', error.message);
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
setupIMAPConfig().catch(console.error);

