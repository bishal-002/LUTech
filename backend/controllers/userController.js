//model import
const User = require("../models/User");
//for bcrypt (password hassing)
const bcrypt = require("bcryptjs");

//register function
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // Check existing user
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "User registered successfully",
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

//login function
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    res.json({
      message: "Login API working",
      email
    });

  } catch (error) {
    res.status(500).json({
      message: "Server Error"
    });
  }
};

//export function
module.exports = {
  registerUser,
  loginUser
};