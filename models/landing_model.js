
const AppError = require("../errors/landing_error");
const connectMongo = require("../config/landing_config");
const { ObjectId } = require("mongodb");

class LandingModel {

    getAll = async () => {
        try {
            const db = await connectMongo();
            const collection = db.collection("ding");

            return await collection.find({}).toArray();

        } catch (error) {
            console.error("getAll:", error);
            throw new AppError("Err in model", 500, "ERR_IN_MODEL");
        }
    };

    getById = async (id) => {
        try {
            const db = await connectMongo();
            const collection = db.collection("ding");

            return await collection.findOne({
                _id: new ObjectId(id)
            });

        } catch (error) {
            console.error("getById:", error);
            throw new AppError("Err in model", 500, "ERR_IN_MODEL");
        }
    };

    getByName = async (name) => {
        try {
            const db = await connectMongo();
            const collection = db.collection("ding");

            return await collection.findOne({ name });

        } catch (error) {
            console.error("getByName:", error);
            throw new AppError("Err in model", 500, "ERR_IN_MODEL");
        }
    };

    getByPhone = async (phone) => {
        try {
            const db = await connectMongo();
            const collection = db.collection("ding");

            return await collection.findOne({ phone });

        } catch (error) {
            console.error("getByPhone:", error);
            throw new AppError("Err in model", 500, "ERR_IN_MODEL");
        }
    };

    getByRefreshToken = async (refreshToken) => {
        try {
            const db = await connectMongo();
            const collection = db.collection("ding");

            return await collection.findOne({ refreshToken });

        } catch (error) {
            console.error("getByRefreshToken:", error);
            throw new AppError("Err in model", 500, "ERR_IN_MODEL");
        }
    };

    addInfo = async (name, phone, coupon = "") => {
        try {
            const db = await connectMongo();
            const collection = db.collection("ding");

            const existingUser = await collection.findOne({ phone });

            if (existingUser) {
                throw new AppError(
                    "این شماره موبایل قبلاً ثبت شده است",
                    409,
                    "PHONE_ALREADY_EXISTS"
                );
            }

            const user = {
                name,
                phone,
                coupon,
                refreshToken: null,
                createdAt: new Date()
            };

            const result = await collection.insertOne(user);

            if (!result.acknowledged) {
                throw new Error("Insert failed");
            }

            return {
                ...user,
                _id: result.insertedId
            };

        } catch (error) {
            console.error("addInfo:", error);

            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError(
                "خطا در ذخیره اطلاعات کاربر",
                500,
                "ERR_IN_SAVE_INFORMATION"
            );
        }
    };

    updateRefreshToken = async (userid, refreshToken) => {
        try {
            const db = await connectMongo();
            const collection = db.collection("ding");

            const result = await collection.updateOne(
                {
                    _id: new ObjectId(userid)
                },
                {
                    $set: { refreshToken }
                }
            );

            return result.matchedCount > 0;

        } catch (error) {
            console.error("updateRefreshToken:", error);

            throw new AppError(
                "خطا در بروزرسانی توکن",
                500,
                "ERR_IN_MODEL"
            );
        }
    };
}

module.exports = new LandingModel();
