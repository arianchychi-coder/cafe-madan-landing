
const VisitModel = require("../models/visit_model");

const trackVisit = async (req, res, next) => {
    try {
        const { visitorId, path } = req.body || {};

        if (
            typeof visitorId !== "string" ||
            visitorId.length < 10 ||
            visitorId.length > 100
        ) {
            return res.status(400).json({
                success: false,
                message: "شناسه بازدیدکننده نامعتبر است."
            });
        }

        const safePath =
            typeof path === "string" ? path.slice(0, 300) : "/";

        await VisitModel.addVisit(visitorId, safePath);

        return res.status(201).json({
            success: true
        });

    } catch (error) {
        next(error);
    }
};

const getVisits = async (req, res, next) => {
    try {
        const period = req.query.period === "30d" ? "30d" : "7d";

        const data = await VisitModel.getStats(
            period,
            process.env.APP_TIMEZONE || "Asia/Tehran"
        );

        return res.json(data);

    } catch (error) {
        next(error);
    }
};

module.exports = {
    trackVisit,
    getVisits
};
