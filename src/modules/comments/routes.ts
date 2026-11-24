import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { commentContentLimit } from '../../models/comment.js';
import { send } from '../../utils/response.js';
import { idInput } from '../users/validation.js';
import * as comments from './service.js';

const commentInput = z.strictObject({ content: z.string().trim().min(1).max(commentContentLimit) });

export function postCommentRoutes() {
  const router = Router({ mergeParams: true });
  router.post<{ postId: string }>('/', async (req, res) => {
    send(res, await comments.createComment(req.auth.userId, idInput.parse(req.params.postId), commentInput.parse(req.body).content), 201);
  });
  router.get<{ postId: string }>('/', async (req, res) => {
    send(res, await comments.listComments(req.auth.userId, idInput.parse(req.params.postId)));
  });
  return router;
}

export function commentRoutes() {
  const router = Router();
  router.use(authenticate);
  router.get('/:commentId', async (req, res) => {
    send(res, await comments.getComment(req.auth.userId, idInput.parse(req.params.commentId)));
  });
  router.patch('/:commentId', async (req, res) => {
    send(res, await comments.updateComment(req.auth.userId, idInput.parse(req.params.commentId), commentInput.parse(req.body).content));
  });
  router.delete('/:commentId', async (req, res) => {
    await comments.deleteComment(req.auth.userId, idInput.parse(req.params.commentId));
    res.status(204).end();
  });
  return router;
}
