
require("dotenv").config();

const AppError = require("../errors/landing_error");
const LandingModel = require("../models/landing_model");
const Joi = require("joi");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const Jwt = require("jsonwebtoken");

const secretKey = process.env.JWT_SECRET;

const landingSchema = Joi.object({
    name: Joi.string().trim().min(3).required(),

    phone: Joi.string()
        .trim()
        .pattern(/^09\d{9}$/)
        .required(),

    coupon: Joi.string()
        .trim()
        .allow("")
        .optional()
});

const generateAndSaveToken = async (user) => {

    if (!secretKey) {
        throw new Error("JWT_SECRET is not configured");
    }

    const accessToken = Jwt.sign(
        {
            id: user._id.toString(),
            name: user.name,
            phone: user.phone
        },
        secretKey,
        {
            expiresIn: "24h"
        }
    );

    const refreshToken = crypto.randomBytes(32).toString("hex");

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    const updated = await LandingModel.updateRefreshToken(
        user._id.toString(),
        hashedRefreshToken
    );

    if (!updated) {
        throw new Error("Failed to save refresh token");
    }

    return {
        accessToken,
        refreshToken
    };
};

const getAll = async (req, res, next) => {
    try {
        const landing = await LandingModel.getAll();

        console.log("ADMIN FIRST USER:", landing[0]);

        const users = landing.map(user => ({
            id: user._id.toString(),
            name: user.name,
            phone: user.phone,
            registeredAt: user.registeredAt ?? null
        }));

        console.log("ADMIN API RESPONSE:", users[0]);

        return res.json(users);

    } catch (error) {
        return next(error);
    }
};

const addInfo = async (req, res, next) => {

    try {

        const { error, value } = landingSchema.validate(
            req.body || {},
            { abortEarly: true }
        );

        if (error) {
            return next(
                new AppError(
                    error.details[0].message,
                    400,
                    "VALIDATION_ERR"
                )
            );
        }

        const { name, phone, coupon } = value;

        // ذخیره کاربر در MongoDB
        const user = await LandingModel.addInfo(
            name,
            phone,
            coupon || ""
        );

        if (!user || !user._id) {
            throw new AppError(
                "خطا در ثبت اطلاعات",
                500,
                "ERR_IN_SAVE_INFORMATION"
            );
        }

        // ساخت توکن‌ها
        const tokens = await generateAndSaveToken(user);

        return res.status(201).json({
            success: true,
            message: "ثبت‌نام با موفقیت انجام شد",
            user: {
                id: user._id.toString(),
                name: user.name,
                phone: user.phone
            },
            tokens
        });

    } catch (error) {

        console.error("REGISTER ERROR:", error);

        return next(error);
    }
};


const getStats = async (req, res, next) => {
    try {
        const users = await LandingModel.getAll();

        return res.json({
            totalUsers: users.length
        });

    } catch (error) {
        return next(error);
    }
};

module.exports = {
    getAll,
    addInfo,
    getStats
};
