import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const FailureRecord = sequelize.define('FailureRecord', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userIp: { type: DataTypes.STRING, allowNull: false },
  userAgent: { type: DataTypes.STRING },

  // Is field me ab hum user ka actual Name store karenge (Form se jo aayega)
  userName: { type: DataTypes.STRING, allowNull: false },

  // Base64 Image ke liye LONGTEXT jaruri hai
  // Ye user ka upload kiya gaya signature image hoga
  originalImage: { type: DataTypes.TEXT('long'), allowNull: false },
  
  // ✅ NAYA FIELD: Ye user (doctor) ka cropped photo store karega
  doctorImage: { type: DataTypes.TEXT('long'), allowNull: false },
  
  errorMessage: { type: DataTypes.TEXT, defaultValue: "Unknown Error" }
}, {
  timestamps: true
});

export default FailureRecord;