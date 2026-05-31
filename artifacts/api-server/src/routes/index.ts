import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import dormsRouter from "./dorms";
import appointmentsRouter from "./appointments";
import messagesRouter from "./messages";
import favoritesRouter from "./favorites";
import adminRouter from "./admin";
import reviewsRouter from "./reviews";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(dormsRouter);
router.use(appointmentsRouter);
router.use(messagesRouter);
router.use(favoritesRouter);
router.use(adminRouter);
router.use(reviewsRouter);
router.use(reportsRouter);

export default router;
