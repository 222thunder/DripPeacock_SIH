import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { User } from "../models/User";

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;
    
    // Check if user already exists to provide a friendly error
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ error: "An account with this email already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, role });
    await user.save();
    res.status(201).json({ message: "User created successfully" });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ error: "An account with this email already exists" });
      return;
    }
    res.status(400).json({ error: error.message || "Registration failed" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.password) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1d" },
    );
    res.json({ token });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
