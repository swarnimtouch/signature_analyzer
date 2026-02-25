import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// MySQL Connection Setup
const sequelize = new Sequelize(
    process.env.DB_NAME || 'signature_analysis_db', // ✅ Updated DB Name for Signature Analysis project
    process.env.DB_USER || 'root',                // User (XAMPP default: root)
    process.env.DB_PASS || '',                    // Password (XAMPP default: empty)
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: false, // Console saaf rakhne ke liye SQL logs band kiye
    }
);

export default sequelize;