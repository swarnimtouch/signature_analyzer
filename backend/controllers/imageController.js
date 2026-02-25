import { Op } from 'sequelize';
import OpenAI from "openai";
import SuccessRecord from '../models/SuccessRecord.js';
import FailureRecord from '../models/FailureRecord.js';

// ---------------------------------------------------------
// 1. PROMPT DEFINITION (As provided by you)
// ---------------------------------------------------------
const PROMPT_SIGNATURE = "Analyze the uploaded signature image and write a personality analysis in exactly 250 characters. Start with “This signature reflects…”. Write one short insight-style paragraph with balanced traits and a realistic future tendency. Do not add extra text.";

// --------------------------------------------
// 2. MAIN CONTROLLER
// --------------------------------------------
export const generateDoctorImage = async (req, res) => {
  // ✅ Frontend se ab doctorImage bhi receive hoga
  const { image, doctorImage, userIp, userAgent, userName } = req.body;

  try {
    // Check 1: Image Upload (Signature)
    if (!image) {
      return res.status(400).json({ success: false, message: 'Signature image is required' });
    }
    
    // Check 1.1: Doctor Image Upload
    if (!doctorImage) {
        return res.status(400).json({ success: false, message: 'Doctor photo is required' });
    }

    // Check 2: API Key
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ success: false, message: "Server Error: OPENAI_API_KEY not configured" });
    }

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Call OpenAI API using standard Vision model logic
    const response = await openai.chat.completions.create({
      model: "gpt-5.2", // Aapki requirement ke hisaab se
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: PROMPT_SIGNATURE 
            },
            {
              type: "image_url",
              image_url: {
                url: image, // User Uploaded Signature Base64
              },
            },
          ],
        },
      ],
      max_completion_tokens: 150, 
    });

    // Extract Text Result
    const analysisText = response.choices[0]?.message?.content;

    if (analysisText) {
      // ✅ SAVE TO DB (Success) - Saving doctorImage as well
      const newSuccess = await SuccessRecord.create({
        userIp,
        userAgent,
        userName: userName || "Unknown User",
        originalImage: image,
        doctorImage: doctorImage, // Doctor ka photo save ho raha hai
        analysisText: analysisText 
      });

      return res.json({
        success: true,
        analysisText: analysisText, 
        uploadId: newSuccess.id
      });

    } else {
      // ✅ LOGIC FOR NO TEXT GENERATED (Failure) - Saving doctorImage here too
      await FailureRecord.create({
          userIp,
          userAgent,
          userName: userName || "Unknown User",
          originalImage: image,
          doctorImage: doctorImage,
          errorMessage: "API returned no analysis text"
      });

      return res.json({
        success: false,
        message: "AI could not analyze the signature. Please try again."
      });
    }

  } catch (error) {
    console.error("Processing Error:", error);
    
    // ✅ CRITICAL ERROR HANDLING (Save Failure)
    try {
        await FailureRecord.create({
            userIp,
            userAgent,
            userName: userName || "Unknown User",
            originalImage: image || "Image upload failed",
            doctorImage: doctorImage || "Doctor image upload failed",
            errorMessage: error.message || "Processing Error"
        });
    } catch (dbError) {
         console.error("❌ Critical: Failed to save error record to DB:", dbError);
    }

    const errorMessage = error.response ? error.response.data.error.message : error.message;
    
    return res.status(500).json({
      success: false,
      message: "Processing error: " + errorMessage
    });
  }
};

// --------------------------------------------
// 3. STATS CONTROLLER
// --------------------------------------------
export const getUploadStats = async (req, res) => {
  try {
    const totalUploads = await SuccessRecord.count(); 

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayUploads = await SuccessRecord.count({
      where: {
        createdAt: {
          [Op.gte]: today
        }
      }
    });

    res.json({
      success: true,
      stats: { totalUploads, todayUploads }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: "Error fetching statistics" });
  }
};