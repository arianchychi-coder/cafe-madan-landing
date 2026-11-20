
const connectMongo = require("../config/landing_config");

const COLLECTION = "site_visits";

const addVisit = async (visitorId, path) => {
    const db = await connectMongo();

    return db.collection(COLLECTION).insertOne({
        visitorId,
        path,
        createdAt: new Date()
    });
};

const getStats = async (period = "7d", timezone = "Asia/Tehran") => {
    const db = await connectMongo();

    const days = period === "30d" ? 30 : 7;
    const now = new Date();

    const currentStart = new Date(
        now.getTime() - days * 24 * 60 * 60 * 1000
    );

    const previousStart = new Date(
        now.getTime() - days * 2 * 24 * 60 * 60 * 1000
    );

    const result = await db.collection(COLLECTION).aggregate([
        {
            $match: {
                createdAt: { $gte: previousStart }
            }
        },
        {
            $facet: {
                currentDaily: [
                    {
                        $match: {
                            createdAt: { $gte: currentStart }
                        }
                    },
                    {
                        $group: {
                            _id: {
                                $dateToString: {
                                    format: "%Y-%m-%d",
                                    date: "$createdAt",
                                    timezone
                                }
                            },
                            visits: { $sum: 1 },
                            visitors: { $addToSet: "$visitorId" }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            date: "$_id",
                            visits: 1,
                            uniqueVisitors: { $size: "$visitors" }
                        }
                    },
                    { $sort: { date: 1 } }
                ],

                currentTotal: [
                    {
                        $match: {
                            createdAt: { $gte: currentStart }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: 1 },
                            visitors: { $addToSet: "$visitorId" }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            total: 1,
                            uniqueVisitors: { $size: "$visitors" }
                        }
                    }
                ],

                previousTotal: [
                    {
                        $match: {
                            createdAt: {
                                $gte: previousStart,
                                $lt: currentStart
                            }
                        }
                    },
                    { $count: "total" }
                ]
            }
        }
    ]).toArray();

    const stats = result[0] || {
        currentDaily: [],
        currentTotal: [],
        previousTotal: []
    };

    const dailyMap = new Map(
        stats.currentDaily.map(item => [item.date, item])
    );

    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });

    const parts = Object.fromEntries(
        formatter.formatToParts(now).map(p => [p.type, p.value])
    );

    const baseDate = new Date(Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day)
    ));

    const items = Array.from({ length: days }, (_, i) => {
        const date = new Date(
            baseDate.getTime() - (days - 1 - i) * 86400000
        ).toISOString().slice(0, 10);

        const item = dailyMap.get(date);

        return {
            date,
            visits: item?.visits || 0,
            uniqueVisitors: item?.uniqueVisitors || 0
        };
    });

    const current = stats.currentTotal[0] || {
        total: 0,
        uniqueVisitors: 0
    };

    const previous = stats.previousTotal[0]?.total || 0;

    const growth = previous
        ? Number(
            ((current.total - previous) / previous * 100).toFixed(1)
        )
        : current.total > 0 ? 100 : 0;

    // تعداد کل بازدیدها از ابتدای فعالیت سایت
    const allTimeTotal = await db
        .collection(COLLECTION)
        .countDocuments({});

    return {
        items,
        total: current.total,
        allTimeTotal,
        uniqueVisitors: current.uniqueVisitors,
        growth
    };
};

module.exports = {
    addVisit,
    getStats
};
