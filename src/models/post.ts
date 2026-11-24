import { Schema, model } from 'mongoose';

export const postContentLimit = 2000;

const postSchema = new Schema({
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  content: { type: String, required: true, trim: true, maxlength: postContentLimit },
  deleting: { type: Boolean, select: false },
}, { timestamps: true, versionKey: false });

postSchema.index({ author: 1, createdAt: -1, _id: -1 });
export const Post = model('Post', postSchema);
