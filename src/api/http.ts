import { Router, Request, Response, NextFunction } from "express";

const api: Router = Router();

api.use((req: Request, res: Response, next: NextFunction) => {
    if (req.session.login || /^login$/.test(req.url)) {
        next();
    } else {
        res.status(403).send({
            status: 'error',
            error: 'unauthorized'
        })
    }
});

api.use('login', async (req: Request, res: Response)=> {
    // Log the user in
})



export default api;
