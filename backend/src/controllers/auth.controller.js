import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const login = async(req, res, next)=>{
    try {
        const {email, password} = req.body;

        if(!email || !password){
            return res.status(400).json({
                status:"error",
                message:"Email and Password required!",
            });
        };

            const [users] = await pool.execute(
              `SELECT id, first_name, last_name, email,
                 password_hash, role, is_active
                 FROM users
                 WHERE email = ?
                 LIMIT 1`,
              [email.toLowerCase().trim()],
            );

        if(users.length === 0){
            return res.status(401).json({
                status:"error",
                message:"Invalid email or password",
            });
        };
        const user = users[0];

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