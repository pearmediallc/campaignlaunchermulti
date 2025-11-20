const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * POST /api/ai/generate-variations
 * Generate AI variations for ad copy
 */
router.post('/generate-variations', authenticate, async (req, res) => {
  try {
    const { baseText, tone = 'professional', count = 5, type = 'primary_text', maxLength } = req.body;

    if (!baseText || baseText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Base text is required'
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'OpenAI API key not configured. Please contact administrator.'
      });
    }

    // Determine character limits based on type
    const characterLimits = {
      primary_text: maxLength || 125, // Facebook recommends 125 chars for optimal display
      headline: maxLength || 40, // Facebook headline limit
      description: maxLength || 30 // Facebook description limit
    };

    const charLimit = characterLimits[type] || 125;

    // Create context-specific prompts
    const toneDescriptions = {
      professional: 'professional, business-appropriate, and trustworthy',
      casual: 'casual, friendly, and conversational',
      urgent: 'urgent, action-oriented, and compelling',
      friendly: 'warm, approachable, and personable',
      luxury: 'elegant, sophisticated, and premium',
      playful: 'fun, energetic, and engaging'
    };

    const typeDescriptions = {
      primary_text: 'Facebook ad primary text (the main body copy)',
      headline: 'Facebook ad headline (short, attention-grabbing title)',
      description: 'Facebook ad description (brief supporting text)'
    };

    const systemPrompt = `You are an expert Facebook ad copywriter. Generate ${count} high-converting variations of ${typeDescriptions[type]}.

Requirements:
- Tone: ${toneDescriptions[tone] || tone}
- Keep each variation under ${charLimit} characters
- Maintain the core message and value proposition of the original text
- Make each variation unique with different angles or phrasings
- Focus on benefits and outcomes, not just features
- Use action-oriented language when appropriate
- Avoid repetitive structures

Return ONLY a valid JSON object with this exact structure:
{
  "variations": ["variation 1", "variation 2", "variation 3", ...]
}`;

    const userPrompt = `Original ${type.replace('_', ' ')}: "${baseText}"

Generate ${count} compelling variations that maintain the same message but with different angles, phrasings, or emotional appeals. Each variation should be ${charLimit} characters or less.`;

    console.log('🤖 Calling OpenAI API for variations...');
    console.log('📝 Base text:', baseText);
    console.log('🎭 Tone:', tone);
    console.log('🔢 Count:', count);
    console.log('📏 Max length:', charLimit);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8, // Higher creativity for varied outputs
      max_tokens: 1000
    });

    const responseContent = completion.choices[0].message.content;
    console.log('✅ OpenAI response received:', responseContent);

    const parsed = JSON.parse(responseContent);

    if (!parsed.variations || !Array.isArray(parsed.variations)) {
      throw new Error('Invalid response format from OpenAI');
    }

    // Filter variations to ensure they meet character limit
    const validVariations = parsed.variations
      .map(v => v.trim())
      .filter(v => v.length > 0 && v.length <= charLimit);

    if (validVariations.length === 0) {
      throw new Error('No valid variations generated');
    }

    console.log(`✅ Generated ${validVariations.length} valid variations`);

    res.json({
      success: true,
      variations: validVariations,
      metadata: {
        tone,
        type,
        charLimit,
        tokensUsed: completion.usage.total_tokens,
        model: completion.model
      }
    });

  } catch (error) {
    console.error('❌ Error generating AI variations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate variations',
      message: error.message
    });
  }
});

/**
 * GET /api/ai/tones
 * Get available tone options
 */
router.get('/tones', authenticate, (req, res) => {
  res.json({
    success: true,
    tones: [
      { value: 'professional', label: 'Professional', description: 'Business-appropriate and trustworthy' },
      { value: 'casual', label: 'Casual', description: 'Friendly and conversational' },
      { value: 'urgent', label: 'Urgent', description: 'Action-oriented and compelling' },
      { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
      { value: 'luxury', label: 'Luxury', description: 'Elegant and premium' },
      { value: 'playful', label: 'Playful', description: 'Fun and engaging' }
    ]
  });
});

module.exports = router;
