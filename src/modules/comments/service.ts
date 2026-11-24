import { AppError } from '../../errors/app-error.js';
import { Comment } from '../../models/comment.js';
import { getPost, requirePost } from '../posts/service.js';

async function requireComment(commentId: string) {
  const comment = await Comment.findById(commentId);
  if (!comment) throw new AppError(404, 'Comment not found');
  return comment;
}

// Assignment 2 - Question 6: Create Comment
export async function createComment(author: string, postId: string, content: string) {
  await getPost(author, postId);
  const comment = await Comment.create({ author, post: postId, content });
  // If post cleanup raced with the insert, remove the late comment.
  try {
    await requirePost(postId);
  } catch (error) {
    await Comment.deleteOne({ _id: comment._id });
    throw error;
  }
  return comment;
}

// Assignment 2 - Question 7: Get Post Comments
export async function listComments(viewer: string, postId: string) {
  await getPost(viewer, postId);
  return Comment.find({ post: postId }).sort({ createdAt: 1, _id: 1 });
}

// Assignment 2 - Question 8: Get Single Comment
export async function getComment(viewer: string, commentId: string) {
  const comment = await requireComment(commentId);
  await getPost(viewer, comment.post.toString());
  return comment;
}

// Assignment 2 - Question 9: Update Comment
export async function updateComment(author: string, commentId: string, content: string) {
  const comment = await requireComment(commentId);
  if (comment.author.toString() !== author) throw new AppError(403, 'Only the comment author can update this comment');
  await requirePost(comment.post.toString());
  const updated = await Comment.findOneAndUpdate(
    { _id: commentId, author }, { $set: { content } }, { returnDocument: 'after', runValidators: true },
  );
  if (!updated) throw new AppError(404, 'Comment not found');
  return updated;
}

// Assignment 2 - Question 10: Delete Comment
export async function deleteComment(viewer: string, commentId: string) {
  const comment = await requireComment(commentId);
  const post = await requirePost(comment.post.toString());
  if (comment.author.toString() !== viewer && post.author.toString() !== viewer) {
    throw new AppError(403, 'Only the comment author or post owner can delete this comment');
  }
  const result = await Comment.deleteOne({ _id: commentId });
  if (!result.deletedCount) throw new AppError(404, 'Comment not found');
}
