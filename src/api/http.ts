import { Router, Request, Response, NextFunction } from "express";
import { User, Conversation, Message } from "../models";
import { httpBody } from "../types/api";
import logger from "../logger";
import { Status } from "../types";

const api: Router = Router();

const usersBySession: Record<string, User> = {};

api.use(
    (
        req: Request,
        res: Response<Status<"unauthorized">>,
        next: NextFunction
    ) => {
        if (req.session.login || /^login$/.test(req.url)) {
            next();
        } else {
            res.status(403).json({
                status: "error",
                message: "unauthorized",
            });
        }
    }
);

api.post(
    "/login",
    async (req: Request<{}, {}, httpBody.login>, res: Response<Status>) => {
        const result = await User.login(req.body.username, req.body.password);
        if (result.status == "succes") {
            req.session.login = true;
            req.session.admin = result.userData.type == "admin";
            req.session.userData = result.userData;
            req.session.sessionString = result.sessionString;
            usersBySession[req.session.id] = result.userData;
            res.cookie("chat.auth", result.sessionString);
            logger.info(`User ${req.body.username} logged in`);
            res.json({ status: "succes" });
        } else {
            res.json({ status: "error" });
        }
    }
);

api.get("/logout", (req: Request, res: Response<Status<"nosession">>): void => {
    try {
        delete usersBySession[req.session.id];
        res.json(
            usersBySession[req.session.id].logout(req.session.sessionString)
        );
    } catch {
        res.json({ status: "error", message: "nosession" });
    }
});

api.get("/chek-login", (req: Request, res: Response<Status<boolean>>) => {
    res.json({
        status: "succes",
        message: req.session.login,
    });
});

export default api;
