export const sendErrorResponse = (res, statusCode, message) => {
  return res.status(statusCode).json({ message })
}
