import pool from "../config/db.js";
import bcrypt from "bcryptjs";

//admin create new user
export const createUser = async (req, res, next) => {
  try {
    const { first_name, last_name, role, email, password } = req.body;

    if (!first_name || !last_name || !role || !email || !password) {
      return res.status(400).json({
        status: "error",
        message: "All fields are required",
      });
    }

    const allowedRoles = ["admin", "mechanic", "receptionist"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid user role",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        status: "error",
        message: "Password must be at least 8 characters long",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [existingUser] = await pool.execute(
      "SELECT id FROM users WHERE email = ?",
      [normalizedEmail],
    );

    if (existingUser.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "Email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await pool.execute(
      "INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES (?, ? ,?, ?,?)",
      [
        first_name.trim(),
        last_name.trim(),
        normalizedEmail,
        passwordHash,
        role,
      ],
    );

    return res.status(201).json({
      status: "success",
      message: "User created successfully",
      user: {
        id: result.insertId,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: normalizedEmail,
        role: role,
        is_active: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

//Admin get all users
export const getUsers = async (req, res, next) => {
  try {
    const [users] = await pool.execute(
      `SELECT
            id,
            first_name,
            last_name,
            email,
            role,
            is_active ,
            created_at,
            updated_at
            FROM users
            ORDER BY id DESC`,
    );

    return res.status(200).json({
      status: "success",
      results: users.length,
      users,
    });
  } catch (error) {
    next(error);
  }
};

//Admin get user by id
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid user ID",
      });
    }

    const [users] = await pool.execute(
      `
            SELECT
            id,
            first_name,
            last_name,
            email,
            role,
            is_active,
            created_at,
            updated_at
            FROM users
            WHERE id = ?
            `,
      [Number(id)],
    );

    if (users.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    return res.status(200).json({
      status: "success",
      user: users[0],
    });
  } catch (error) {
    next(error);
  }
};

//Admin update user details
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, role, email } = req.body;

    const userId = Number(id);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid user ID",
      });
    }

    const [users] = await pool.execute("SELECT id FROM users WHERE id = ?", [
      userId,
    ]);

    if (users.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    if (!first_name || !last_name || !role || !email) {
      return res.status(400).json({
        status: "error",
        message: "All fields are required",
      });
    }

    const allowedRoles = ["admin", "mechanic", "receptionist"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid user role",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Prevent an admin from changing their own role
    if (Number(req.user.id) === userId && role !== "admin") {
      return res.status(403).json({
        status: "error",
        message: "You cannot change your own admin role",
      });
    }

    // Prevent demoting the last active admin
    if (role !== "admin") {
      const [activeAdmins] = await pool.execute(
        `SELECT id FROM users
     WHERE role = 'admin' AND is_active = TRUE`,
      );

      if (activeAdmins.length === 1 && activeAdmins[0].id === userId) {
        return res.status(403).json({
          status: "error",
          message: "Cannot change the role of the last active admin",
        });
      }
    }

    const [existingUser] = await pool.execute(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      [normalizedEmail, userId],
    );

    if (existingUser.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "Email already exists",
      });
    }

    await pool.execute(
      `UPDATE users
       SET first_name = ?, last_name = ?, email = ?, role = ?
       WHERE id = ?`,
      [first_name.trim(), last_name.trim(), normalizedEmail, role, userId],
    );

    const [updatedUser] = await pool.execute(
      `SELECT
        id,
        first_name,
        last_name,
        email,
        role,
        is_active,
        created_at,
        updated_at
        FROM users
        WHERE id = ?`,
      [userId],
    );

    return res.status(200).json({
      status: "success",
      message: "User updated successfully",
      user: updatedUser[0],
    });
  } catch (error) {
    next(error);
  }
};

// Admin activates or deactivates a user
export const updateUserStatus = async (req, res, next) => {
     try{
        const userId = Number(req.params.id);
        const {is_active } = req.body;

        if(!Number.isSafeInteger(userId) || userId <= 0){
            return res.status(400).json({
                status: "error",
                message: "Invalid user ID",
            });
        }

        if(typeof is_active !== "boolean"){
          return res.status(400).json({
            status: "error",
            message: "is_active must be true or false value",
          });
        }

        if(Number(req.user.id) === userId && is_active === false){
          return res.status(403).json({
            status: "error",
            message: "You cannot deactivate your own account",
          });
        }

        const [users] = await pool.execute(
          `SELECT id, role, is_active FROM users WHERE id = ?`,
          [userId]
        );

        if(users.length === 0){
          return res.status(404).json({
            status: "error",
            message: "User not found",
          });
        };

        const user = users[0];

        if(user.role === "admin" &&
          Number(user.is_active) === 1 &&
          is_active === false
        ){
          const [activeAdmins] = await pool.execute(
            "SELECT id FROM users WHERE role = 'admin' AND is_active = TRUE"
          );

          if (activeAdmins.length === 1) {
            return res.status(403).json({
              status: "error",
              message: "Cannot deactivate the last active admin",
            });
          }
        }

        await pool.execute(
          `UPDATE users SET is_active = ? WHERE id = ?`,
          [is_active, userId]
        );

        return res.status(200).json({
          status: "success",
          message: "User status updated successfully",
          user: {
            id: userId,
            is_active,
          },
        });
     }catch(error){
        next(error);
     }
}

// Admin resets a user's password
export const resetUserPassword = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const { password } = req.body;

    // Validate user ID
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid user ID",
      });
    }

    // Validate password
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        status: "error",
        message: "Password must be at least 8 characters long",
      });
    }

    // Check whether the user exists
    const [users] = await pool.execute(
      "SELECT id FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update password
    await pool.execute(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [passwordHash, userId]
    );

    return res.status(200).json({
      status: "success",
      message: "User password reset successfully",
    });
  } catch (error) {
    next(error);
  }
};