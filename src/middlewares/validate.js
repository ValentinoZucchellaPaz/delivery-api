export function validateParams(schema) {
    return (req, res, next) => {
        try {
            req.params = schema.parse(req.params);
            next();
        } catch (err) {
            return res.status(400).json(JSON.parse(err));
        }
    };
}