import joi from 'joi';
import { ErrorCatch } from "../utils/ErrorCatch.js";

export const LoginValidation = ErrorCatch(async (req, res, next) => {
    const Login = joi.object({
        Email: joi.string()
            .email({ tlds: { allow: ['com', 'net', 'org', 'edu'] } })
            .allow(null), // Allow null
        password: joi.string().required(),
        Phone: joi.string()
            .allow(null), // Allow null
    }).custom((value, helpers) => {
        const { Email, Phone } = value;
        if (!Email && !Phone) {
            return helpers.message('Either email or PhoneNumber is required'); // Custom error message
        }
        return value; // If validation passes, return the value
    }).required();

    const { error } = Login.validate(req.body);

    if (error) {
        const errorArray = error.details.map((ele) => ele.message);
        return res.status(400).json({ errors: errorArray }); // Return a 400 status with error messages
    }
    next();
});


export const SignUpValidation = ErrorCatch(async (req, res, next) => {
    const SignUpSchema = joi.object({
        Name: joi.string().min(2).max(15).required(),
        Email: joi.string().email({ tlds: { allow: ['com', 'net', 'org', 'edu'] } }).required(),
        password: joi.string().min(9).required(),
        confirmpassword: joi.string().valid(joi.ref('password')).required(),
        Phone: joi.string().required(),
        role: joi.string().valid('User', 'Admin').required() // restricts role to 'User' or 'Admin'
    }).required();

    const { error } = SignUpSchema.validate(req.body, { abortEarly: false });

    if (error) {
        const errorArray = error.details.map((ele) => ele.message);
        return res.status(400).json({ errors: errorArray });
    }

    next();
});
