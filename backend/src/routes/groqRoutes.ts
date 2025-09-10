import { Router, Request, Response } from 'express';
import { generateEmailReply, isGroqAvailable } from '../services/groqService';

const router = Router();

// Generate email reply using Groq API
router.post('/generate-reply', async (req: Request, res: Response) => {
  try {
    const { emailContent } = req.body;
    
    if (!emailContent) {
      return res.status(400).json({ 
        error: 'Email content is required' 
      });
    }
    
    if (!isGroqAvailable()) {
      return res.status(503).json({ 
        error: 'Groq API service not available - check configuration' 
      });
    }
    
    console.log('Generating Groq reply for email content length:', emailContent.length);
    
    const result = await generateEmailReply(emailContent);
    
    res.json({
      success: true,
      result
    });
    
  } catch (error: any) {
    console.error('Groq API route error:', error);
    
    res.status(500).json({
      error: error.message || 'Failed to generate reply with Groq API',
      success: false
    });
  }
});

// Check Groq service status
router.get('/status', (req: Request, res: Response) => {
  res.json({
    available: isGroqAvailable(),
    configured: !!process.env.GROQ_API_KEY
  });
});

export default router;
