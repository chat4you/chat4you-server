import { Router, Request, Response, NextFunction } from "express";
import { User, Conversation, Message } from "../models";
import { Op } from "sequelize";
import logger from "../logger";
import sharp from "sharp";
import { Status, Api } from "../types";
import { api as apiValidation } from "../validation";
import fs from "fs";

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
    async (req: Request<{}, {}, Api.httpBody.login>, res: Response<Status>) => {
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

api.get(
    "/users/me",
    async (req: Request, res: Response<Status & { data?: User }>) => {
        res.json({
            status: "succes",
            data: usersBySession[req.session.id],
        });
    }
);

api.post(
    "/users/me/profile-update",
    async (
        req: Request<{}, {}, Api.httpBody.profileUpdate>,
        res: Response<Status>
    ) => {
        const isValid = apiValidation.profileImage(req.body);
        if (isValid.status == "succes") {
            const fileBuffer = fs.readFileSync(req.body.profileImage.path);
            try {
                await sharp(fileBuffer)
                    .resize(300, 300)
                    .toFile(
                        fs.realpathSync(
                            `../data/images/${
                                usersBySession[req.session.id].id
                            }.png`
                        )
                    );
            } catch (err) {
                logger.warn(
                    `Processing image failed ${req.body.profileImage.path}`
                );
            }
            const user = usersBySession[req.session.id];
            user.fullname = req.body.fullname;
            user.email = req.body.email;
            req.session.userData = user;
            await user.save();
            res.json({
                status: "succes",
            });
        } else {
            res.json(isValid as Status);
        }
    }
);

api.get(
    "/users/:user/profile-image",
    async (req: Request<{ user: string }>, res: Response) => {
        let filePath = fs.realpathSync(
            `../data/images/${parseInt(req.params.user)}.png`
        );
        if (!fs.existsSync(filePath)) {
            filePath = fs.realpathSync("../data/images/default.png");
        }
        fs.createReadStream(filePath).pipe(res);
    }
);

api.get(
    "/users/:user/fullname",
    async (
        req: Request<{ user: string | number }>,
        res: Response<Status<"nouser"> & { fullname?: string }>
    ) => {
        req.params.user = parseInt(req.params.user as string);
        const user = await User.findByPk(req.params.user);
        if (user) {
            res.json({
                status: "succes",
                fullname: user.fullname,
            });
        } else {
            res.json({
                status: "error",
                message: "nouser",
            });
        }
    }
);

api.get(
    "/users/me/contacts",
    async (
        req: Request,
        res: Response<Status & { contacts: Conversation[] }>
    ) => {
        const contacts = await Conversation.findAll({
            where: {
                members: { [Op.contains]: [usersBySession[req.session.id].id] },
            },
        });
        res.json({ status: "succes", contacts: contacts });
    }
);

api.use(
    "/admin/*",
    async (
        req: Request,
        res: Response<Status<"notadmin">>,
        next: NextFunction
    ) => {
        if (req.session.admin) {
            next();
        } else {
            logger.info(
                `User ${req.session.userData.id} tried to access admin url ${req.url}`
            );
            res.json({
                status: "error",
                message: "notadmin",
            });
        }
    }
);

api.get(
    "/admin/users",
    async (req: Request, res: Response<Status & { users?: User[] }>) => {
        res.json({
            status: "succes",
            users: await User.findAll(),
        });
    }
);

api.post(
    "/admin/users/:user/update",
    async (
        req: Request<{ user: string | number }, {}, Api.httpBody.adminUpdate>,
        res: Response<Status<"nouser">>
    ) => {
        req.params.user = parseInt(req.params.user as string);
        const user = await User.findByPk(req.params.user);
        if (user) {
            const isValid = apiValidation.adminUpdate(req.body);
            if (isValid.status == "succes") {
                user.update(isValid.newData);
            } else {
                res.json(isValid as Status);
            }
        } else {
            res.json({ status: "error", message: "nouser" });
        }
    }
);

export default api;
