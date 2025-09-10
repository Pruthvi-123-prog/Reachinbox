import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/errorHandler';
import axios from 'axios';
import { logger } from '../utils/logger';

const router = Router();

// Endpoint to proxy Groq API requests
router.post('/chat', asyncHandler(async (req: Request, res: Response) => {
  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    
    if (!groqApiKey) {
      logger.error('GROQ_API_KEY not configured in backend environment');
      return res.status(500).json({
        success: false,
        error: 'GROQ API key is not configured on the server'
      });
    }
    
    // Extract parameters from request
    const { model, messages, temperature = 0.7, max_tokens = 1000 } = req.body;
    
    // Default to mixtral model if the passed model is the problematic classification model
    const safeModel = model === 'meta-llama/llama-prompt-guard-2-22m' ? 'mixtral-8x7b-32768' : model;
    
    logger.info(`Using Groq API with model: ${safeModel} (originally requested: ${model})`);
    
    // Make request to Groq API
    const groqResponse = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: safeModel,
        messages,
        temperature,
        max_tokens
      },
      {
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Return the response data
    res.status(200).json(groqResponse.data);
    
  } catch (error: any) {
    logger.error('Error proxying request to Groq API:', error);
    
    // Return appropriate error response
    if (error.response) {
      // The request was made and the server responded with a status code
      return res.status(error.response.status).json({
        success: false,
        error: `Groq API error: ${error.response.status}`,
        details: error.response.data
      });
    } else if (error.request) {
      // The request was made but no response was received
      return res.status(500).json({
        success: false,
        error: 'No response received from Groq API',
        details: error.message
      });
    } else {
      // Something happened in setting up the request
      return res.status(500).json({
        success: false,
        error: 'Error making request to Groq API',
        details: error.message
      });
    }
  }
}));

// Endpoint to get available models
router.get('/models', asyncHandler(async (req: Request, res: Response) => {
  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    
    if (!groqApiKey) {
      logger.error('GROQ_API_KEY not configured in backend environment');
      return res.status(500).json({
        success: false,
        error: 'GROQ API key is not configured on the server'
      });
    }
    
    // Make request to Groq API to get models
    const groqResponse = await axios.get(
      'https://api.groq.com/openai/v1/models',
      {
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Return just the list of model IDs for simplicity
    const models = groqResponse.data.data.map((model: any) => model.id);
    res.status(200).json({ models });
    
  } catch (error: any) {
    logger.error('Error fetching Groq models:', error);
    
    // Return appropriate error response
    if (error.response) {
      // The request was made and the server responded with a status code
      return res.status(error.response.status).json({
        success: false,
        error: `Groq API error: ${error.response.status}`,
        details: error.response.data
      });
    } else if (error.request) {
      // The request was made but no response was received
      return res.status(500).json({
        success: false,
        error: 'No response received from Groq API',
        details: error.message
      });
    } else {
      // Something happened in setting up the request
      return res.status(500).json({
        success: false,
        error: 'Error making request to Groq API',
        details: error.message
      });
    }
  }
}));

export default router;
