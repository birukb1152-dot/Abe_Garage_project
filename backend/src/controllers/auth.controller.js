import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const login = async(req, res, next)=>{
    try {
        const {email, password} = req.body;

        if(typeof email !== "string" ||
          typeof password !== "string" ||
          !email.trim() || 
          !password){
            return res.status(400).json({
                status:"error",
                message:"Email and Password required!",
            });
        };

        if(!process.env.JWT_SECRET){
            return res.status(500).json({
                status:"error",
                message:"Authentication service is not configured",
            });
        }

            const [users] = await pool.execute(
              `SELECT id, first_name, last_name, email,
                 password_hash, role, is_active
                 FROM users
                 WHERE email = ?
                 LIMIT 1`,
              [email.trim().toLowerCase()],
            );

        if(users.length === 0){
            return res.status(401).json({
                status:"error",
                message:"Invalid email or password",
            });
        };
        const user = users[0];

        let passwordMatches = false;

        try{
          passwordMatches = await bcrypt.compare(password, 
            user.password_hash
          );
        } catch (error) {
          passwordMatches = false;
        }

        if(!passwordMatches){
          return res.status(401).json({
            status:"error",
            message:"Invalid email or password",
          });
        }

        if (!user.is_active) {
          return res.status(403).json({
            status: "error",
            message: "Your account is inactive",
          });
        }
        
        const token = jwt.sign(
          {
            id: user.id,
            role: user.role,
          },
          process.env.JWT_SECRET,
          {
            expiresIn: process.env.JWT_EXPIRES_IN || "1d",
          },
        );

        return res.status(200).json({
          status: "success",
          message: "Login successful",
          token,
          user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            role: user.role,
          },
        });
    } catch (error) {
        next(error);
    }
}