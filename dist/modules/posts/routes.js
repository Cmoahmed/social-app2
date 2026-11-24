import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { postContentLimit } from '../../models/post.js';
import { send } from '../../utils/response.js';
import { idInput } from '../users/validation.js';
import { postCommentRoutes } from '../comments/routes.js';
import * as posts from './service.js';
const postInput = z.strictObject({ content: z.string().trim().min(1).max(postContentLimit) });
export function postRoutes() {
    const router = Router();
    router.use(authenticate);
    router.use('/:postId/comments', postCommentRoutes());
    router.post('/', async (req, res) => {
        send(res, await posts.createPost(req.auth.userId, postInput.parse(req.body).content), 201);
    });
    router.get('/', async (req, res) => {
        send(res, await posts.listPosts(req.auth.userId));
    });
    router.get('/:postId', async (req, res) => {
        send(res, await posts.getPost(req.auth.userId, idInput.parse(req.params.postId)));
    });
    router.patch('/:postId', async (req, res) => {
        send(res, await posts.updatePost(req.auth.userId, idInput.parse(req.params.postId), postInput.parse(req.body).content));
    });
    router.delete('/:postId', async (req, res) => {
        await posts.deletePost(req.auth.userId, idInput.parse(req.params.postId));
        res.status(204).end();
    });
    return router;
}
//# sourceMappingURL=routes.js.map