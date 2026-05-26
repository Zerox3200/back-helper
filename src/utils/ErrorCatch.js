export const ErrorCatch = (controller) => {
    return (req, res, next) => {
        controller(req, res, next).catch((error) => {

            const statusCode = error.statusCode || error.cause || error.status || 400
            const message = error.message || 'An error occurred'


            const response = {
                success: false,
                message: message
            }


            if (process.env.NODE_ENV === 'development') {
                response.stack = error.stack
            }


            if (!res.headersSent) {
                return res.status(statusCode).json(response)
            }
        })
    }
}

// Helper function for consistent error responses
export const sendError = (res, message, statusCode = 400) => {
    return res.status(statusCode).json({
        success: false,
        message: message
    })
}

// Helper function for consistent success responses
export const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message: message,
        data: data
    })
}