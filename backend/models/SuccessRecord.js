import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const SuccessRecord = sequelize.define('SuccessRecord', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userIp: { type: DataTypes.STRING, allowNull: false },
  userAgent: { type: DataTypes.STRING },

  // Is field me ab hum user ka actual Name store karenge (Form se jo aayega)
  userName: { type: DataTypes.STRING, allowNull: false },

  // Base64 Images - LONGTEXT use karein (upto 4GB data allow karta hai)
  // Ye user ka upload kiya gaya signature image hoga
  originalImage: { type: DataTypes.TEXT('long'), allowNull: false },
  
  // ✅ NAYA FIELD: Ye user (doctor) ka cropped photo store karega
  doctorImage: { type: DataTypes.TEXT('long'), allowNull: false },

  // AI se jo 250 characters ka text analysis aayega wo yaha store hoga
  analysisText: { type: DataTypes.TEXT, allowNull: false }
}, {
  timestamps: true
});

export default SuccessRecord;