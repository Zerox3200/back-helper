export const ErrorCatch = (controller) => {
    return (req, res, next) => {
        controller(req, res, next).catch((error) => {
            return res.json({ success: false, Message: error.message, Stack: error.stack })
        })
    }
}