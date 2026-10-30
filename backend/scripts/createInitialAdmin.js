import readline from 'node:readline';
import bcrypt from 'bcryptjs';
import pool from '../src/config/db.js';
import { promises, resolve } from 'node:dns';
import { rejects } from 'node:assert';
import { error } from 'node:console';

const ask = (question) =>{
    const rl = readline.createInterface({
        input:process.stdin,
        output:process.stdout
    });

    return new Promise((resolve)=>{
        rl.question(question,(answer)=>{
            rl.close();
            resolve(answer.trim());
        });
    });
};


const askHidden = (question) => {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      return reject(new Error("Run this script in an interactive terminal."));
    }

    let answer = "";

    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const cleanUp = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
      process.stdout.write("\n");
    };

    const onData = (key) => {
      if (key === "\u0003") {
        cleanUp();
        reject(new Error("Setup cancelled."));
        return;
      }

      if (key === "\r" || key === "\n") {
        cleanUp();
        resolve(answer);
        return;
      }

      if (key === "\u007f" || key === "\b") {
        answer = answer.slice(0, -1);
        return;
      }

      if (key >= " ") {
        answer += key;
      }
    };

    process.stdin.on("data", onData);
  });
};


const createInitialAdmin = async () => {
  try {
    const [admins] = await pool.execute(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );

    if (admins.length > 0) {
      console.log("An administrator already exists. Setup stopped.");
      return;
    }

    const firstName = await ask("First name: ");
    const lastName = await ask("Last name: ");
    const email = (await ask("Email: ")).toLowerCase();

    if (!firstName || !lastName || !email.includes("@")) {
      throw new Error("Please provide valid name and email details.");
    }

    const password = await askHidden("Password: ");
    const confirmPassword = await askHidden("Confirm password: ");

    if (password.length < 8) {
      throw new Error("Password must contain at least 8 characters.");
    }

    if (password !== confirmPassword) {
      throw new Error("Passwords do not match.");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await pool.execute(
      `INSERT INTO users
       (first_name, last_name, email, password_hash, role)
       VALUES (?, ?, ?, ?, 'admin')`,
      [firstName, lastName, email, passwordHash]
    );

    console.log("Initial administrator created successfully.");
  } catch (error) {
    console.error("Admin setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

createInitialAdmin();