import { Schema, model } from 'mongoose';

export const commentContentLimit = 1000;

const commentSchema = new Schema({
  post: { type: Schema.Types.ObjectId, ref: 'Post', required: true, immutable: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  content: { type: String, required: true, trim: true, maxlength: commentContentLimit },
}, { timestamps: true, versionKey: false });

commentSchema.index({ post: 1, createdAt: 1, _id: 1 });
export const Comment = model('Comment', commentSchema);
