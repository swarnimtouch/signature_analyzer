import jwt from 'jsonwebtoken';
import SuccessRecord from '../models/SuccessRecord.js';
import FailureRecord from '../models/FailureRecord.js';

// --- 1. Admin Login (Static Credentials) ---
export const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASS) {
    const token = jwt.sign(
      { role: 'admin', email: email },
      process.env.JWT_SECRET || 'signature_ai_secret_key_2026',
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      message: 'Login Successful',
      token: token
    });
  } else {
    return res.status(401).json({
      success: false,
      message: 'Invalid Email or Password'
    });
  }
};

// --- 2. Dashboard Stats (Counts) ---
export const getDashboardStats = async (req, res) => {
  try {
    const successCount = await SuccessRecord.count();
    const failureCount = await FailureRecord.count();
    const totalRequests = successCount + failureCount;

    res.json({
      success: true,
      stats: {
        total: totalRequests,
        success: successCount,
        failure: failureCount
      }
    });
  } catch (error) {
    console.error("Stats Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// --- 3. Get Success Records (Without Images for faster loading) ---
export const getSuccessUsers = async (req, res) => {
  try {
    // ✅ Dono images exclude kar di taaki table fast load ho
    const records = await SuccessRecord.findAll({
      attributes: { exclude: ['originalImage', 'doctorImage'] },
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching success records" });
  }
};

// --- 4. Get Failure Records (Without Images) ---
export const getFailureUsers = async (req, res) => {
  try {
    const records = await FailureRecord.findAll({
      attributes: { exclude: ['originalImage', 'doctorImage'] },
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching failure records" });
  }
};

// --- 5. Get Single Image (Updated to fetch either Doctor or Signature) ---
export const getSingleImage = async (req, res) => {
    // ✅ imageType param extract kiya, ye frontend batayega ki konsi image chahiye ('doctor' ya 'signature')
    const { type, id, imageType } = req.params; 

    try {
        let record;
        if (type === 'success') {
            record = await SuccessRecord.findByPk(id);
        } else {
            record = await FailureRecord.findByPk(id);
        }

        if (!record) {
            return res.status(404).json({ success: false, message: "Record not found" });
        }

        // Logic based on requested imageType
        let imageToReturn = "";
        if (imageType === 'doctor') {
            imageToReturn = record.doctorImage;
        } else {
            // Defaulting to signature (originalImage)
            imageToReturn = record.originalImage;
        }

        if (!imageToReturn) {
             return res.status(404).json({ success: false, message: "Image not available" });
        }

        return res.json({ success: true, imageData: imageToReturn });

    } catch (error) {
        console.error("Image Fetch Error", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// --- 6. Delete Record ---
export const deleteUserRecord = async (req, res) => {
  const { type, id } = req.params;
  
  try {
      let deletedCount = 0;

      if (type === 'success') {
          deletedCount = await SuccessRecord.destroy({ where: { id: id } });
      } else if (type === 'failure') {
          deletedCount = await FailureRecord.destroy({ where: { id: id } });
      } else {
          return res.status(400).json({ success: false, message: "Invalid type" });
      }

      if (deletedCount > 0) {
          res.json({ success: true, message: "Record deleted successfully" });
      } else {
          res.status(404).json({ success: false, message: "Record not found" });
      }

  } catch (error) {
      console.error("Delete Error:", error);
      res.status(500).json({ success: false, message: "Error deleting record" });
  }
};