import JWT from "jsonwebtoken";
import { User } from "../../DB/User/User.model.js";
import { ErrorCatch } from "../utils/ErrorCatch.js";


export const CheckToken = ErrorCatch(async (req, res, next) => {
    const { token } = req.headers;
    if (!token) return res.json({ Message: "Not Autharized", status: false })

    const { Email, id } = JWT.verify(token, process.env.secretkey);
    const user = await User.findOne({ Email });
    req.user = user
    req.id = id
    next();
});

export const CheckAdmin = ErrorCatch(async (req, res, next) => {
    const { token } = req.headers

    const { Email } = JWT.verify(token, process.env.secretkey);

    const CheckOwner = await User.findOne({ Email, role: "Admin" });

    if (!CheckOwner) return res.json({ Message: "Only Admin allowed", status: false })

    next();
})