import { AppError } from '../../errors/app-error.js';
import { Post } from '../../models/post.js';
import { Comment } from '../../models/comment.js';
import { canView, requireUser } from '../users/service.js';
const active = { deleting: { $ne: true } };
export async function requirePost(postId) {
    const post = await Post.findOne({ _id: postId, ...active });
    if (!post)
        throw new AppError(404, 'Post not found');
    return post;
}
// Assignment 2 - Question 1: Create Post
export function createPost(author, content) {
    return Post.create({ author, content });
}
// Assignment 2 - Question 2: Get All Posts
export function listPosts(author) {
    return Post.find({ author, ...active }).sort({ createdAt: -1, _id: -1 });
}
// Assignment 2 - Question 3: Get Single Post
export async function getPost(viewer, postId) {
    const post = await requirePost(postId);
    const author = await requireUser(post.author.toString());
    if (!await canView(viewer, author))
        throw new AppError(403, 'This profile is private');
    return post;
}
// Assignment 2 - Question 4: Update Post
export async function updatePost(author, postId, content) {
    const post = await Post.findOneAndUpdate({ _id: postId, author, ...active }, { $set: { content } }, { returnDocument: 'after', runValidators: true });
    if (post)
        return post;
    await requirePost(postId);
    throw new AppError(403, 'Only the post owner can update this post');
}
// Assignment 2 - Question 5: Delete Post
export async function deletePost(author, postId) {
    const post = await Post.findOneAndUpdate({ _id: postId, author }, { $set: { deleting: true } });
    if (!post) {
        if (!await Post.exists({ _id: postId }))
            throw new AppError(404, 'Post not found');
        throw new AppError(403, 'Only the post owner can delete this post');
    }
    // Keep the post hidden and let the owner retry if either deletion fails.
    try {
        await Comment.deleteMany({ post: postId });
        await Post.deleteOne({ _id: postId, author, deleting: true });
    }
    catch {
        throw new AppError(500, 'Post cleanup failed. Retry deleting this post.');
    }
}
//# sourceMappingURL=service.js.map